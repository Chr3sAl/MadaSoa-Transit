import { z } from "zod";

import {
  customerAliasKinds,
  incomingParcelStatuses,
  paymentStatuses,
  roles,
  shipmentStatuses,
  transportTypes,
} from "@/lib/types";

const aliasTextArraySchema = z
  .array(z.string().trim().min(1).max(160))
  .optional()
  .default([]);

const intakeImageSchema = z.object({
  dataUrl: z.string().min(32).max(2_000_000),
  fileName: z.string().trim().max(200).optional(),
});

export const publicLookupSchema = z.object({
  mode: z.enum(["tracking", "reference"]),
  value: z.string().trim().min(3).max(60),
  locale: z.enum(["fr", "en"]),
  transportType: z.enum(transportTypes).optional(),
});

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  customerCode: z.string().trim().min(2).max(24).optional().or(z.literal("")),
  referencePrefix: z.string().trim().max(40).optional().or(z.literal("")),
  receiverAliases: aliasTextArraySchema,
  receiverPhones: aliasTextArraySchema,
  marketplaceAliases: aliasTextArraySchema,
});

export const createShipmentSchema = z.object({
  trackingNumber: z.string().trim().min(6).max(60),
  customerId: z.string().trim().min(1),
  customerReference: z.string().trim().min(3).max(80),
  transportType: z.enum(transportTypes).optional(),
  origin: z.string().trim().min(2).max(120),
  destination: z.string().trim().min(2).max(120),
  carrier: z.string().trim().max(120).optional().or(z.literal("")),
  currentStatus: z.enum(shipmentStatuses),
  paymentStatus: z.enum(paymentStatuses),
  actualWeightKg: z.coerce.number().min(0).optional(),
  volumetricWeightKg: z.coerce.number().min(0).optional(),
  volumeCbm: z.coerce.number().min(0).optional(),
  freightAmount: z.coerce.number().min(0).optional(),
  currency: z.string().trim().min(1).max(12).optional().or(z.literal("")),
  eta: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  publicVisible: z.boolean().optional(),
});

export const updateShipmentSchema = createShipmentSchema
  .omit({ trackingNumber: true, customerId: true })
  .partial();

export const scanPreviewIncomingParcelSchema = z.object({
  scanValue: z.string().trim().min(1).max(2_048),
  scanFormat: z.string().trim().max(80).optional().or(z.literal("")),
});

export const createIncomingParcelSchema = z.object({
  scanValue: z.string().trim().min(1).max(120),
  chinaTrackingNumber: z.string().trim().min(6).max(120),
  courierCompany: z.string().trim().max(120).optional().or(z.literal("")),
  customerId: z.string().trim().optional().or(z.literal("")),
  matchedBy: z.string().trim().max(80).optional().or(z.literal("")),
  receiverNameRaw: z.string().trim().max(200).optional().or(z.literal("")),
  receiverPhoneRaw: z.string().trim().max(60).optional().or(z.literal("")),
  receiverAddressRaw: z.string().trim().max(500).optional().or(z.literal("")),
  ocrText: z.string().trim().max(8_000).optional().or(z.literal("")),
  declaredValue: z.coerce.number().min(0),
  declaredCurrency: z.string().trim().min(1).max(12).optional().or(z.literal("")),
  actualWeightKg: z.coerce.number().gt(0),
  transportType: z.enum(transportTypes),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  shelfLocation: z.string().trim().max(120).optional().or(z.literal("")),
  images: z.array(intakeImageSchema).optional().default([]),
});

export const assignIncomingParcelSchema = z.object({
  customerId: z.string().trim().min(1),
  matchedBy: z.string().trim().max(80).optional().or(z.literal("")),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  role: z.enum(roles),
  password: z.string().min(8).max(120),
});

export const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(120),
});

export const importRowSchema = z.object({
  trackingNumber: z.string().trim().min(6).max(60),
  customerReference: z.string().trim().min(3).max(80),
  customerName: z.string().trim().min(2).max(120),
  transportType: z.enum(transportTypes).optional(),
  origin: z.string().trim().min(2).max(120),
  destination: z.string().trim().min(2).max(120),
  currentStatus: z.enum(shipmentStatuses),
  paymentStatus: z.enum(paymentStatuses),
  actualWeightKg: z.coerce.number().min(0).optional(),
  volumetricWeightKg: z.coerce.number().min(0).optional(),
  volumeCbm: z.coerce.number().min(0).optional(),
  freightAmount: z.coerce.number().min(0).optional(),
  currency: z.string().trim().min(1).max(12).optional().or(z.literal("")),
  carrier: z.string().trim().max(120).optional().or(z.literal("")),
  eta: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const incomingParcelStatusSchema = z.enum(incomingParcelStatuses);
export const customerAliasKindSchema = z.enum(customerAliasKinds);
