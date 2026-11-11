-- Label cancellation: void at Easyship, then refund through Stripe.
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "cancelRequestedAt" TIMESTAMP(3);
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "cancelledBy" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "refundStatus" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "refundCents" INTEGER;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "stripeRefundId" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP(3);
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "refundError" TEXT;

CREATE INDEX IF NOT EXISTS "Shipment_refundStatus_idx" ON "Shipment"("refundStatus");
