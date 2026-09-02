-- AlterEnum
ALTER TYPE "ShipmentStatus" ADD VALUE 'RECHARGE_BLOCKED_BY_CARD_ISSUER';

-- CreateTable
CREATE TABLE "EasyshipRecharge" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "transactionReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EasyshipRecharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EasyshipRecharge_shipmentId_key" ON "EasyshipRecharge"("shipmentId");

-- CreateIndex
CREATE INDEX "EasyshipRecharge_status_updatedAt_idx" ON "EasyshipRecharge"("status", "updatedAt");
