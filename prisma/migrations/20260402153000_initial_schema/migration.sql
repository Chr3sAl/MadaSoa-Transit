-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'operator', 'finance');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('draft', 'received', 'in_transit', 'arrived', 'ready_for_pickup', 'delivered', 'on_hold');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('unpaid', 'partial', 'paid');

-- CreateEnum
CREATE TYPE "TransportType" AS ENUM ('air', 'air_batterie', 'express', 'express_batterie', 'maritime');

-- CreateEnum
CREATE TYPE "IncomingParcelStatus" AS ENUM ('unassigned', 'received');

-- CreateEnum
CREATE TYPE "CustomerAliasKind" AS ENUM ('receiver_name', 'receiver_phone', 'marketplace_alias');

-- CreateEnum
CREATE TYPE "ImportRowStatus" AS ENUM ('created', 'updated', 'skipped', 'error');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "customerCode" TEXT NOT NULL,
    "referencePrefix" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerAlias" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "kind" "CustomerAliasKind" NOT NULL,
    "value" TEXT NOT NULL,
    "normalizedValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomingParcel" (
    "id" TEXT NOT NULL,
    "chinaTrackingNumber" TEXT NOT NULL,
    "scanValue" TEXT NOT NULL,
    "courierCompany" TEXT,
    "customerId" TEXT,
    "status" "IncomingParcelStatus" NOT NULL,
    "matchedBy" TEXT,
    "receiverNameRaw" TEXT,
    "receiverPhoneRaw" TEXT,
    "receiverAddressRaw" TEXT,
    "ocrText" TEXT,
    "declaredValue" DOUBLE PRECISION NOT NULL,
    "declaredCurrency" TEXT NOT NULL DEFAULT 'CNY',
    "actualWeightKg" DOUBLE PRECISION NOT NULL,
    "transportType" "TransportType" NOT NULL DEFAULT 'express',
    "notes" TEXT,
    "shelfLocation" TEXT,
    "warehouseReceivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomingParcel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomingParcelImage" (
    "id" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncomingParcelImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "customerReference" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "incomingParcelId" TEXT,
    "transportType" "TransportType" NOT NULL DEFAULT 'express',
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "carrier" TEXT,
    "currentStatus" "ShipmentStatus" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL,
    "actualWeightKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "volumetricWeightKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "volumeCbm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freightAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'Ar',
    "eta" TIMESTAMP(3),
    "notes" TEXT,
    "publicVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentEvent" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL,
    "label" TEXT NOT NULL,
    "details" TEXT,
    "location" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRow" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "shipmentId" TEXT,
    "rowNumber" INTEGER NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "status" "ImportRowStatus" NOT NULL,
    "message" TEXT NOT NULL,
    "rawData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shipmentId" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicLookupRateLimitBucket" (
    "key" TEXT NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicLookupRateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_customerCode_key" ON "Customer"("customerCode");

-- CreateIndex
CREATE INDEX "CustomerAlias_normalizedValue_idx" ON "CustomerAlias"("normalizedValue");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerAlias_customerId_kind_normalizedValue_key" ON "CustomerAlias"("customerId", "kind", "normalizedValue");

-- CreateIndex
CREATE UNIQUE INDEX "IncomingParcel_chinaTrackingNumber_key" ON "IncomingParcel"("chinaTrackingNumber");

-- CreateIndex
CREATE INDEX "IncomingParcel_status_updatedAt_idx" ON "IncomingParcel"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "IncomingParcel_customerId_idx" ON "IncomingParcel"("customerId");

-- CreateIndex
CREATE INDEX "IncomingParcelImage_parcelId_idx" ON "IncomingParcelImage"("parcelId");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_trackingNumber_key" ON "Shipment"("trackingNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_incomingParcelId_key" ON "Shipment"("incomingParcelId");

-- CreateIndex
CREATE INDEX "Shipment_customerReference_idx" ON "Shipment"("customerReference");

-- CreateIndex
CREATE INDEX "Shipment_paymentStatus_idx" ON "Shipment"("paymentStatus");

-- CreateIndex
CREATE INDEX "ShipmentEvent_shipmentId_occurredAt_idx" ON "ShipmentEvent"("shipmentId", "occurredAt");

-- CreateIndex
CREATE INDEX "ImportRow_batchId_rowNumber_idx" ON "ImportRow"("batchId", "rowNumber");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "PublicLookupRateLimitBucket_createdAt_idx" ON "PublicLookupRateLimitBucket"("createdAt");

-- AddForeignKey
ALTER TABLE "CustomerAlias" ADD CONSTRAINT "CustomerAlias_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomingParcel" ADD CONSTRAINT "IncomingParcel_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomingParcelImage" ADD CONSTRAINT "IncomingParcelImage_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "IncomingParcel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_incomingParcelId_fkey" FOREIGN KEY ("incomingParcelId") REFERENCES "IncomingParcel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentEvent" ADD CONSTRAINT "ShipmentEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
