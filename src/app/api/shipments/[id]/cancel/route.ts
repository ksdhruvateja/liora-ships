import { NextResponse } from "next/server";
import { z } from "zod";
import { CancelError, cancelLabel } from "@/lib/cancellation";
import { toPublicShipment } from "@/lib/public-shipment";
import { getStaffRole } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 26;

const bodySchema = z.object({
  email: z.string().trim().email().optional(),
  reason: z.string().trim().max(500).optional(),
});

/**
 * Cancel (void) a purchased label and refund the customer.
 * - Staff (session cookie or bearer secret): may cancel any eligible label.
 * - Customers: must confirm the email address the shipment was booked with.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const role = getStaffRole(request);
  if (!role && !parsed.data.email) {
    return NextResponse.json(
      { error: "Confirm the email address used for this shipment." },
      { status: 400 },
    );
  }

  try {
    const shipment = await cancelLabel(
      params.id,
      role ? { type: "staff", role } : { type: "customer", email: parsed.data.email! },
      { reason: parsed.data.reason },
    );
    return NextResponse.json({ shipment: toPublicShipment(shipment) });
  } catch (error) {
    if (error instanceof CancelError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("Label cancel failed", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
