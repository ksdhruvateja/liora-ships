-- CreateTable
CREATE TABLE "SavedContact" (
    "id" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "address" JSONB NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Shipment_customerEmail_idx" ON "Shipment"("customerEmail");

-- CreateIndex
CREATE INDEX "SavedContact_customerEmail_role_lastUsedAt_idx" ON "SavedContact"("customerEmail", "role", "lastUsedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedContact_customerEmail_role_fingerprint_key" ON "SavedContact"("customerEmail", "role", "fingerprint");
