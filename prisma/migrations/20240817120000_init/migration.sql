-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('QUOTED', 'PAID', 'LABEL_CREATED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "MarkupType" AS ENUM ('PERCENT', 'FLAT');

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "quoteGroupId" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "originAddress" JSONB NOT NULL,
    "destAddress" JSONB NOT NULL,
    "parcel" JSONB NOT NULL,
    "selectedCourierId" TEXT NOT NULL,
    "easyshipRateId" TEXT NOT NULL,
    "easyshipCourierName" TEXT NOT NULL,
    "brandedCourierName" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "baseCostCents" INTEGER NOT NULL,
    "markupCents" INTEGER NOT NULL,
    "customerTotalCents" INTEGER NOT NULL,
    "estimatedMinDays" INTEGER,
    "estimatedMaxDays" INTEGER,
    "stripePaymentIntentId" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'QUOTED',
    "easyshipShipmentId" TEXT,
    "labelUrl" TEXT,
    "trackingNumber" TEXT,
    "fulfillmentAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarkupRule" (
    "id" TEXT NOT NULL,
    "type" "MarkupType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "minCents" INTEGER,
    "maxCents" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "appliesToCourierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarkupRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourierBrandMap" (
    "id" TEXT NOT NULL,
    "matchType" TEXT NOT NULL,
    "matchValue" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierBrandMap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Shipment_stripePaymentIntentId_idx" ON "Shipment"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Shipment_easyshipShipmentId_idx" ON "Shipment"("easyshipShipmentId");

-- CreateIndex
CREATE INDEX "Shipment_quoteGroupId_idx" ON "Shipment"("quoteGroupId");

-- CreateIndex
CREATE INDEX "Shipment_status_updatedAt_idx" ON "Shipment"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Shipment_trackingNumber_idx" ON "Shipment"("trackingNumber");

-- CreateIndex
CREATE INDEX "CourierBrandMap_active_matchType_idx" ON "CourierBrandMap"("active", "matchType");
