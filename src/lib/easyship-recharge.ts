import { prisma } from "./db";
import { getConfig, type AppConfig } from "./config";
import type { EasyshipClient } from "./easyship";
import {
  EasyshipRechargeError,
  EASYSHIP_RECHARGE_FAILED,
  EASYSHIP_RECHARGE_UNCERTAIN,
  RECHARGE_BLOCKED_BY_CARD_ISSUER,
} from "./easyship-errors";

export type RechargeSettings = {
  minimumCents: number;
  maximumCents: number;
  bufferCents: number;
  paymentSourceId: string;
};

export function readRechargeSettings(config: AppConfig): RechargeSettings {
  return {
    minimumCents: Math.round(config.EASYSHIP_MIN_RECHARGE * 100),
    maximumCents: Math.round(config.EASYSHIP_MAX_RECHARGE * 100),
    bufferCents: Math.round(config.EASYSHIP_RECHARGE_BUFFER * 100),
    paymentSourceId: config.EASYSHIP_PAYMENT_SOURCE_ID,
  };
}

export function calculateRechargeAmountCents(input: {
  walletBalanceCents: number;
  labelCostCents: number;
  minimumCents: number;
  maximumCents: number;
  bufferCents: number;
}) {
  const shortageCents = Math.max(0, input.labelCostCents - input.walletBalanceCents);
  if (shortageCents === 0) {
    return { recharged: false as const, amountCents: 0, shortageCents: 0 };
  }

  const rechargeAmountCents = Math.max(input.minimumCents, shortageCents + input.bufferCents);
  if (rechargeAmountCents > input.maximumCents) {
    throw new EasyshipRechargeError(
      "Required recharge exceeds the $1,000 automatic-charge limit.",
      EASYSHIP_RECHARGE_FAILED,
    );
  }

  return { recharged: true as const, amountCents: rechargeAmountCents, shortageCents };
}

async function withRechargeLock<T>(fn: () => Promise<T>): Promise<T | "busy"> {
  const lockKey = "easyship-wallet-recharge";
  let locked = false;
  if (typeof prisma.$queryRaw === "function") {
    try {
      const rows = await prisma.$queryRaw<Array<{ locked: boolean | null }>>`
        SELECT pg_try_advisory_lock(hashtext(${lockKey})) AS locked
      `;
      locked = Boolean(rows?.[0]?.locked);
      if (!locked) return "busy";
    } catch {
      locked = false;
    }
  }
  try {
    return await fn();
  } finally {
    if (locked) {
      try {
        await prisma.$queryRaw`
          SELECT pg_advisory_unlock(hashtext(${lockKey}))
        `;
      } catch {
        // ignore unlock failures
      }
    }
  }
}

export async function automaticallyRechargeEasyship(input: {
  walletBalanceCents: number;
  labelCostCents: number;
  settings?: RechargeSettings;
  easyship: Pick<EasyshipClient, "addWalletCredit">;
}) {
  const settings = input.settings ?? readRechargeSettings(getConfig());
  const plan = calculateRechargeAmountCents({
    walletBalanceCents: input.walletBalanceCents,
    labelCostCents: input.labelCostCents,
    minimumCents: settings.minimumCents,
    maximumCents: settings.maximumCents,
    bufferCents: settings.bufferCents,
  });

  if (!plan.recharged) {
    return {
      recharged: false,
      amountCents: 0,
      transactionReference: null as string | null,
    };
  }

  if (!settings.paymentSourceId) {
    throw new EasyshipRechargeError(
      "Automatic Easyship wallet recharge is not configured.",
      EASYSHIP_RECHARGE_FAILED,
    );
  }

  const result = await input.easyship.addWalletCredit({
    amountDollars: plan.amountCents / 100,
    paymentSourceId: settings.paymentSourceId,
  });

  if (result.status === 201) {
    const success = result as { status: 201; transactionReference: string | null };
    return {
      recharged: true,
      amountCents: plan.amountCents,
      transactionReference: success.transactionReference,
    };
  }

  if (result.status === 202) {
    throw new EasyshipRechargeError(
      "Automatic charge blocked by card issuer authorization requirement.",
      RECHARGE_BLOCKED_BY_CARD_ISSUER,
    );
  }

  const failed = result as { status: number; error: string };
  throw new EasyshipRechargeError(
    failed.error || "Automatic Easyship wallet recharge failed.",
    EASYSHIP_RECHARGE_FAILED,
  );
}

export async function ensureEasyshipWalletFunded(input: {
  shipmentId: string;
  labelCostCents: number;
  easyship: EasyshipClient;
  mockMode?: boolean;
}) {
  if (input.mockMode ?? getConfig().mockMode) return;

  const existing = await prisma.easyshipRecharge.findUnique({
    where: { shipmentId: input.shipmentId },
  });
  if (existing?.status === "SUCCEEDED") return;
  if (existing?.status === "BLOCKED_3DS") {
    throw new EasyshipRechargeError(
      "Automatic charge blocked by card issuer authorization requirement.",
      RECHARGE_BLOCKED_BY_CARD_ISSUER,
    );
  }
  if (existing?.status === "PENDING") {
    throw new EasyshipRechargeError(
      "A previous automatic recharge may still be processing.",
      EASYSHIP_RECHARGE_UNCERTAIN,
    );
  }

  const wallet = await input.easyship.getWalletBalance();
  const walletBalanceCents = Math.round(wallet.availableBalanceCents);
  const plan = calculateRechargeAmountCents({
    walletBalanceCents,
    labelCostCents: input.labelCostCents,
    ...readRechargeSettings(getConfig()),
  });
  if (!plan.recharged) return;

  const locked = await withRechargeLock(async () => {
    const latest = await prisma.easyshipRecharge.findUnique({
      where: { shipmentId: input.shipmentId },
    });
    if (latest?.status === "SUCCEEDED") return;
    if (latest?.status === "BLOCKED_3DS" || latest?.status === "PENDING") {
      throw new EasyshipRechargeError(
        "Automatic recharge already attempted for this shipment.",
        latest.status === "BLOCKED_3DS"
          ? RECHARGE_BLOCKED_BY_CARD_ISSUER
          : EASYSHIP_RECHARGE_UNCERTAIN,
      );
    }

    const refreshedWallet = await input.easyship.getWalletBalance();
    const refreshedBalanceCents = Math.round(refreshedWallet.availableBalanceCents);
    const refreshedPlan = calculateRechargeAmountCents({
      walletBalanceCents: refreshedBalanceCents,
      labelCostCents: input.labelCostCents,
      ...readRechargeSettings(getConfig()),
    });
    if (!refreshedPlan.recharged) return;

    await prisma.easyshipRecharge.upsert({
      where: { shipmentId: input.shipmentId },
      create: {
        shipmentId: input.shipmentId,
        amountCents: refreshedPlan.amountCents,
        status: "PENDING",
      },
      update: {
        amountCents: refreshedPlan.amountCents,
        status: "PENDING",
        transactionReference: null,
      },
    });

    try {
      const recharge = await automaticallyRechargeEasyship({
        walletBalanceCents: refreshedBalanceCents,
        labelCostCents: input.labelCostCents,
        easyship: input.easyship,
      });
      await prisma.easyshipRecharge.update({
        where: { shipmentId: input.shipmentId },
        data: {
          status: "SUCCEEDED",
          transactionReference: recharge.transactionReference,
        },
      });
    } catch (error) {
      if (
        error instanceof EasyshipRechargeError &&
        error.code === RECHARGE_BLOCKED_BY_CARD_ISSUER
      ) {
        await prisma.easyshipRecharge.update({
          where: { shipmentId: input.shipmentId },
          data: { status: "BLOCKED_3DS" },
        });
        throw error;
      }
      await prisma.easyshipRecharge.update({
        where: { shipmentId: input.shipmentId },
        data: { status: "FAILED" },
      });
      throw error;
    }
  });

  if (locked === "busy") {
    throw new EasyshipRechargeError(
      "Another automatic wallet recharge is in progress.",
      EASYSHIP_RECHARGE_UNCERTAIN,
    );
  }
}
