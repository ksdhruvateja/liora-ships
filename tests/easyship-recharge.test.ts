import { describe, expect, it, vi } from "vitest";
import {
  automaticallyRechargeEasyship,
  calculateRechargeAmountCents,
} from "@/lib/easyship-recharge";
import {
  EasyshipRechargeError,
  EASYSHIP_RECHARGE_FAILED,
  RECHARGE_BLOCKED_BY_CARD_ISSUER,
} from "@/lib/easyship-errors";

describe("easyship wallet recharge", () => {
  it("does not recharge when the wallet already covers the label", () => {
    expect(
      calculateRechargeAmountCents({
        walletBalanceCents: 30_000,
        labelCostCents: 29_000,
        minimumCents: 5_000,
        maximumCents: 100_000,
        bufferCents: 1_000,
      }),
    ).toEqual({ recharged: false, amountCents: 0, shortageCents: 0 });
  });

  it("adds the buffer and enforces the $50 minimum", () => {
    expect(
      calculateRechargeAmountCents({
        walletBalanceCents: 5_000,
        labelCostCents: 29_000,
        minimumCents: 5_000,
        maximumCents: 100_000,
        bufferCents: 1_000,
      }),
    ).toEqual({ recharged: true, amountCents: 25_000, shortageCents: 24_000 });
  });

  it("rejects recharges above the $1,000 maximum", () => {
    expect(() =>
      calculateRechargeAmountCents({
        walletBalanceCents: 0,
        labelCostCents: 995_000,
        minimumCents: 5_000,
        maximumCents: 100_000,
        bufferCents: 1_000,
      }),
    ).toThrow(EasyshipRechargeError);
  });

  it("charges the saved payment source when recharge is required", async () => {
    const addWalletCredit = vi.fn().mockResolvedValue({
      status: 201,
      transactionReference: "txn_123",
    });
    const result = await automaticallyRechargeEasyship({
      walletBalanceCents: 5_000,
      labelCostCents: 29_000,
      settings: {
        minimumCents: 5_000,
        maximumCents: 100_000,
        bufferCents: 1_000,
        paymentSourceId: "ps_test",
      },
      easyship: { addWalletCredit },
    });
    expect(result).toEqual({
      recharged: true,
      amountCents: 25_000,
      transactionReference: "txn_123",
    });
    expect(addWalletCredit).toHaveBeenCalledWith({
      amountDollars: 250,
      paymentSourceId: "ps_test",
    });
  });

  it("maps HTTP 202 to a blocked-by-issuer error without retrying", async () => {
    await expect(
      automaticallyRechargeEasyship({
        walletBalanceCents: 0,
        labelCostCents: 29_000,
        settings: {
          minimumCents: 5_000,
          maximumCents: 100_000,
          bufferCents: 1_000,
          paymentSourceId: "ps_test",
        },
        easyship: {
          addWalletCredit: vi.fn().mockResolvedValue({ status: 202 }),
        },
      }),
    ).rejects.toMatchObject({ code: RECHARGE_BLOCKED_BY_CARD_ISSUER });
  });

  it("maps other failures to EASYSHIP_RECHARGE_FAILED", async () => {
    await expect(
      automaticallyRechargeEasyship({
        walletBalanceCents: 0,
        labelCostCents: 29_000,
        settings: {
          minimumCents: 5_000,
          maximumCents: 100_000,
          bufferCents: 1_000,
          paymentSourceId: "ps_test",
        },
        easyship: {
          addWalletCredit: vi.fn().mockResolvedValue({
            status: 422,
            error: "Card declined",
          }),
        },
      }),
    ).rejects.toMatchObject({ code: EASYSHIP_RECHARGE_FAILED });
  });
});
