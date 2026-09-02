-- Shipping markup default 11% and quote snapshot field
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "markupPercentUsed" DOUBLE PRECISION;

CREATE TABLE IF NOT EXISTS "ShippingMarkupConfig" (
  "id" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "percentage" DOUBLE PRECISION NOT NULL DEFAULT 11,
  "fixedMarkupCents" INTEGER NOT NULL DEFAULT 0,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShippingMarkupConfig_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ShippingMarkupConfig" ("id", "enabled", "percentage", "fixedMarkupCents", "updatedAt")
VALUES ('default', true, 11, 0, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE IF NOT EXISTS "MarkupAuditLog" (
  "id" TEXT NOT NULL,
  "previousEnabled" BOOLEAN,
  "previousPercentage" DOUBLE PRECISION,
  "previousFixedMarkupCents" INTEGER,
  "newEnabled" BOOLEAN NOT NULL,
  "newPercentage" DOUBLE PRECISION NOT NULL,
  "newFixedMarkupCents" INTEGER NOT NULL,
  "changedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarkupAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MarkupAuditLog_createdAt_idx" ON "MarkupAuditLog"("createdAt");

CREATE TABLE IF NOT EXISTS "MarkupPinAttempt" (
  "id" TEXT NOT NULL,
  "ipAddress" TEXT NOT NULL,
  "failedAttempts" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarkupPinAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MarkupPinAttempt_ipAddress_key" ON "MarkupPinAttempt"("ipAddress");
