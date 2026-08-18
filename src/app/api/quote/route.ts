import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getConfig, getEnvMarkupRule } from "@/lib/config";
import { getEasyship } from "@/lib/easyship-client";
import { applyMarkup, selectMarkupRule } from "@/lib/markup";
import { brandCourierName, formatEstimatedDelivery } from "@/lib/courier-names";
import { quoteRequestSchema } from "@/lib/validations";
import { toPublicQuoteRate } from "@/lib/public-shipment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 26;

export async function POST(request: Request) {
  try {
    getConfig();
    const json = await request.json();
    const parsed = quoteRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please check the shipment details and try again." },
        { status: 400 },
      );
    }

    const { customerEmail, origin, destination, parcel } = parsed.data;
    const easyship = getEasyship();
    const rates = await easyship.requestRates({ origin, destination, parcel });
    if (rates.length === 0) {
      return NextResponse.json(
        { error: "No shipping options are available for this route yet." },
        { status: 404 },
      );
    }

    const [rules, maps] = await Promise.all([
      prisma.markupRule.findMany({
        where: { active: true, appliesToCourierId: { not: null } },
      }),
      prisma.courierBrandMap.findMany({ where: { active: true } }),
    ]);

    const fallbackRule = getEnvMarkupRule();

    const quoteGroupId = randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const shipments = await prisma.$transaction(
      rates.map((rate) => {
        const baseCostCents = Math.round(rate.totalCharge * 100);
        const rule =
          selectMarkupRule(rules, rate.courierServiceId) ?? fallbackRule;
        const { markupCents, customerTotalCents } = applyMarkup(baseCostCents, rule);
        const brandedCourierName = brandCourierName(maps, {
          courierServiceId: rate.courierServiceId,
          courierName: rate.courierName,
          umbrellaName: rate.umbrellaName,
          serviceName: rate.serviceName,
        });

        return prisma.shipment.create({
          data: {
            quoteGroupId,
            customerEmail,
            originAddress: origin,
            destAddress: destination,
            parcel,
            selectedCourierId: rate.courierServiceId,
            easyshipRateId: rate.courierServiceId,
            easyshipCourierName: rate.courierName,
            brandedCourierName,
            currency: rate.currency || "USD",
            baseCostCents,
            markupCents,
            customerTotalCents,
            estimatedMinDays: rate.minDeliveryTime,
            estimatedMaxDays: rate.maxDeliveryTime,
            status: "QUOTED",
            expiresAt,
          },
        });
      }),
    );

    const publicRates = shipments
      .sort((a, b) => a.customerTotalCents - b.customerTotalCents)
      .map(toPublicQuoteRate);

    return NextResponse.json({
      quoteGroupId,
      expiresAt: expiresAt.toISOString(),
      estimatedDeliveryNote: publicRates[0]
        ? formatEstimatedDelivery(
            shipments[0].estimatedMinDays,
            shipments[0].estimatedMaxDays,
          )
        : undefined,
      rates: publicRates,
    });
  } catch (error) {
    console.error("Quote failed", error);
    const raw = error instanceof Error ? error.message : "";
    const message = /usage limit/i.test(raw)
      ? "Shipping quotes are temporarily unavailable because the carrier account hit its usage limit. Try again later or upgrade the plan."
      : "We couldn’t retrieve shipping options right now. Please try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
