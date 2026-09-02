-- AlterEnum: pickup statuses stored as strings on Shipment

ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "referenceNumber" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "pickupRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "easyshipOriginAddressId" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "pickupSlotId" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "pickupDate" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "pickupFromTime" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "pickupToTime" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "pickupTimezone" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "pickupPriceCents" INTEGER;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "pickupBaseCostCents" INTEGER;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "pickupCustomerCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "pickupCurrency" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "easyshipPickupId" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "pickupStatus" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "pickupErrorCode" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "pickupErrorMessage" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "labelGeneratedAt" TIMESTAMP(3);
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "businessDate" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "finalCustomerTotalCents" INTEGER;

CREATE INDEX IF NOT EXISTS "Shipment_labelGeneratedAt_idx" ON "Shipment"("labelGeneratedAt");
CREATE INDEX IF NOT EXISTS "Shipment_businessDate_idx" ON "Shipment"("businessDate");
CREATE INDEX IF NOT EXISTS "Shipment_referenceNumber_idx" ON "Shipment"("referenceNumber");
CREATE INDEX IF NOT EXISTS "Shipment_easyshipPickupId_idx" ON "Shipment"("easyshipPickupId");
CREATE INDEX IF NOT EXISTS "Shipment_createdBy_idx" ON "Shipment"("createdBy");
CREATE INDEX IF NOT EXISTS "Shipment_pickupStatus_idx" ON "Shipment"("pickupStatus");
