import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { getBusinessDayRange } from "@/lib/business-time";
import { toTodayLabelRow } from "@/lib/labels-today";
import { requireStaff } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = requireStaff(request, "employee");
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("perPage") ?? "25")));
  const search = (url.searchParams.get("q") ?? "").trim();
  const courier = (url.searchParams.get("courier") ?? "").trim();
  const pickupStatus = (url.searchParams.get("pickupStatus") ?? "").trim();
  const labelStatus = (url.searchParams.get("labelStatus") ?? "").trim();
  const createdBy = (url.searchParams.get("createdBy") ?? "").trim();

  const { businessDate, start, end } = getBusinessDayRange();
  const where = {
    labelGeneratedAt: { gte: start, lte: end },
    ...(search
      ? {
          OR: [
            { referenceNumber: { contains: search, mode: "insensitive" as const } },
            { trackingNumber: { contains: search, mode: "insensitive" as const } },
            { customerEmail: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(courier ? { brandedCourierName: { contains: courier, mode: "insensitive" as const } } : {}),
    ...(pickupStatus ? { pickupStatus } : {}),
    ...(labelStatus ? { status: labelStatus as never } : {}),
    ...(createdBy ? { createdBy } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.shipment.count({ where }),
    prisma.shipment.findMany({
      where,
      orderBy: { labelGeneratedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  const config = getConfig();
  return NextResponse.json({
    businessDate,
    timezone: getBusinessDayRange().timezone,
    page,
    perPage,
    total,
    labels: rows.map((row) => toTodayLabelRow(row, config.appUrl, auth.role)),
  });
}
