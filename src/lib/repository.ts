import type { Prisma } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import * as XLSX from "xlsx";

import { getDemoState } from "@/lib/demo-data";
import { parseIncomingParcelOcr } from "@/lib/intake-ocr";
import { parseIncomingParcelScan } from "@/lib/intake-scan";
import { mergeTrackingCandidates, pickBestTrackingCandidate } from "@/lib/intake-tracking";
import { prisma } from "@/lib/prisma";
import { isDemoModeEnabled, validateImportUpload } from "@/lib/runtime";
import { paymentStatuses, shipmentStatuses, transportTypes } from "@/lib/types";
import type {
  AssignIncomingParcelInput,
  AuditLogRecord,
  CreateCustomerInput,
  CreateIncomingParcelInput,
  CreateShipmentInput,
  CreateUserInput,
  CustomerAliasKind,
  CustomerRecord,
  DashboardMetrics,
  ImportBatchRecord,
  ImportCommitSummary,
  ImportPreview,
  ImportRowDraft,
  ImportRowRecord,
  IncomingParcelRecord,
  IncomingParcelStatus,
  IncomingParcelWithRelations,
  IntakeCustomerMatch,
  IntakePreviewResult,
  LookupResponse,
  PaymentStatus,
  PreviewIncomingParcelInput,
  ReportSummary,
  Role,
  ShipmentEventRecord,
  ShipmentRecord,
  ShipmentStatus,
  ShipmentSummaryRecord,
  ShipmentWithRelations,
  StoredUser,
  TransportType,
  UpdateShipmentInput,
  UserRecord,
} from "@/lib/types";
import {
  assignIncomingParcelSchema,
  createCustomerSchema,
  createIncomingParcelSchema,
  createShipmentSchema,
  createUserSchema,
  importRowSchema,
  scanPreviewIncomingParcelSchema,
  updateShipmentSchema,
} from "@/lib/validators";
import { createId, normalizeLookupValue, toIsoString } from "@/lib/utils";

type DashboardSnapshot = {
  metrics: DashboardMetrics;
  shipments: ShipmentWithRelations[];
  customers: CustomerRecord[];
  imports: ImportBatchRecord[];
};

type PersistedCustomerWithAliases = Prisma.CustomerGetPayload<{
  include: {
    aliases: true;
  };
}>;

type PersistedShipmentWithRelations = Prisma.ShipmentGetPayload<{
  include: {
    customer: {
      include: {
        aliases: true;
      };
    };
    incomingParcel: true;
    events: true;
  };
}>;

type PersistedIncomingParcelWithRelations = Prisma.IncomingParcelGetPayload<{
  include: {
    customer: {
      include: {
        aliases: true;
      };
    };
    shipment: true;
    images: true;
  };
}>;

const shipmentRelationsInclude = {
  customer: {
    include: {
      aliases: true,
    },
  },
  incomingParcel: true,
  events: {
    orderBy: { occurredAt: "asc" },
  },
} as const satisfies Prisma.ShipmentInclude;

const incomingParcelRelationsInclude = {
  customer: {
    include: {
      aliases: true,
    },
  },
  shipment: true,
  images: {
    orderBy: { createdAt: "asc" },
  },
} as const satisfies Prisma.IncomingParcelInclude;

function coerceShipmentStatus(value: unknown): ShipmentStatus {
  return shipmentStatuses.includes(value as ShipmentStatus) ? (value as ShipmentStatus) : "draft";
}

function coerceIncomingParcelStatus(value: unknown): IncomingParcelStatus {
  return value === "received" ? "received" : "unassigned";
}

function coercePaymentStatus(value: unknown): PaymentStatus {
  return paymentStatuses.includes(value as PaymentStatus) ? (value as PaymentStatus) : "unpaid";
}

function coerceTransportType(value: unknown): TransportType {
  return transportTypes.includes(value as TransportType) ? (value as TransportType) : "express";
}

function coerceNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function coerceCurrency(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : "Ar";
}

function normalizeTextMatchValue(value: string) {
  return normalizeLookupValue(value).replace(/\s+/g, " ");
}

function normalizeCompactTextMatchValue(value: string) {
  return normalizeLookupValue(value).replace(/[^A-Z0-9]/g, "");
}

function normalizePhoneMatchValue(value: string) {
  return value.replace(/\D+/g, "");
}

function normalizeAliasValue(kind: CustomerAliasKind, value: string) {
  return kind === "receiver_phone"
    ? normalizePhoneMatchValue(value)
    : normalizeTextMatchValue(value);
}

function stripPassword(user: StoredUser): UserRecord {
  const { passwordHash, ...safeUser } = user;
  void passwordHash;
  return safeUser;
}

function sortByNewest<T extends { updatedAt?: string; createdAt?: string; uploadedAt?: string }>(
  items: T[],
) {
  return [...items].sort((left, right) => {
    const leftValue = left.updatedAt ?? left.createdAt ?? left.uploadedAt ?? "";
    const rightValue = right.updatedAt ?? right.createdAt ?? right.uploadedAt ?? "";
    return rightValue.localeCompare(leftValue);
  });
}

function getShipmentEvents(shipmentId: string) {
  const state = getDemoState();
  return [...state.shipmentEvents]
    .filter((event) => event.shipmentId === shipmentId)
    .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
}

function mapCustomerRecord(customer: PersistedCustomerWithAliases): CustomerRecord {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    customerCode: customer.customerCode,
    referencePrefix: customer.referencePrefix,
    aliases: customer.aliases.map((alias) => ({
      id: alias.id,
      customerId: alias.customerId,
      kind: alias.kind as CustomerAliasKind,
      value: alias.value,
      normalizedValue: alias.normalizedValue,
      createdAt: alias.createdAt.toISOString(),
      updatedAt: alias.updatedAt.toISOString(),
    })),
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}

function buildShipmentSummary(
  shipment: {
    id: string;
    trackingNumber: string;
    incomingParcelId?: string | null;
    customerId: string;
    customerReference: string;
    currentStatus: unknown;
    paymentStatus: unknown;
    createdAt: Date | string;
    updatedAt: Date | string;
  } | null,
  chinaTrackingNumber: string | null,
): ShipmentSummaryRecord | null {
  if (!shipment) {
    return null;
  }

  return {
    id: shipment.id,
    trackingNumber: shipment.trackingNumber,
    chinaTrackingNumber,
    incomingParcelId: shipment.incomingParcelId,
    customerId: shipment.customerId,
    customerReference: shipment.customerReference,
    currentStatus: coerceShipmentStatus(shipment.currentStatus),
    paymentStatus: coercePaymentStatus(shipment.paymentStatus),
    createdAt: toIsoString(shipment.createdAt) ?? new Date().toISOString(),
    updatedAt: toIsoString(shipment.updatedAt) ?? new Date().toISOString(),
  };
}

function attachShipmentRelations(shipment: ShipmentRecord): ShipmentWithRelations {
  const state = getDemoState();
  const customer = state.customers.find((candidate) => candidate.id === shipment.customerId);
  const incomingParcel =
    state.incomingParcels.find((candidate) => candidate.id === shipment.incomingParcelId) ??
    state.incomingParcels.find(
      (candidate) =>
        shipment.chinaTrackingNumber &&
        candidate.chinaTrackingNumber === shipment.chinaTrackingNumber,
    ) ??
    null;

  if (!customer) {
    throw new Error(`Customer ${shipment.customerId} not found for shipment ${shipment.id}`);
  }

  return {
    ...shipment,
    chinaTrackingNumber: shipment.chinaTrackingNumber ?? incomingParcel?.chinaTrackingNumber ?? null,
    incomingParcelId: shipment.incomingParcelId ?? incomingParcel?.id ?? null,
    customer,
    events: getShipmentEvents(shipment.id),
  };
}

function mapPersistedShipment(shipment: PersistedShipmentWithRelations): ShipmentWithRelations {
  return {
    id: shipment.id,
    trackingNumber: shipment.trackingNumber,
    chinaTrackingNumber: shipment.incomingParcel?.chinaTrackingNumber ?? null,
    incomingParcelId: shipment.incomingParcelId,
    customerId: shipment.customerId,
    customerReference: shipment.customerReference,
    transportType: coerceTransportType(shipment.transportType),
    origin: shipment.origin,
    destination: shipment.destination,
    carrier: shipment.carrier,
    currentStatus: coerceShipmentStatus(shipment.currentStatus),
    paymentStatus: coercePaymentStatus(shipment.paymentStatus),
    actualWeightKg: coerceNumber(shipment.actualWeightKg),
    volumetricWeightKg: coerceNumber(shipment.volumetricWeightKg),
    volumeCbm: coerceNumber(shipment.volumeCbm),
    freightAmount: coerceNumber(shipment.freightAmount),
    currency: coerceCurrency(shipment.currency),
    eta: toIsoString(shipment.eta),
    notes: shipment.notes,
    publicVisible: shipment.publicVisible,
    createdAt: shipment.createdAt.toISOString(),
    updatedAt: shipment.updatedAt.toISOString(),
    customer: mapCustomerRecord(shipment.customer),
    events: [...shipment.events]
      .sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime())
      .map((event) => ({
        id: event.id,
        shipmentId: event.shipmentId,
        status: coerceShipmentStatus(event.status),
        label: event.label,
        details: event.details,
        location: event.location,
        occurredAt: event.occurredAt.toISOString(),
        createdAt: event.createdAt.toISOString(),
      })),
  };
}

function attachIncomingParcelRelations(parcel: IncomingParcelRecord): IncomingParcelWithRelations {
  const state = getDemoState();
  const customer = parcel.customerId
    ? state.customers.find((candidate) => candidate.id === parcel.customerId) ?? null
    : null;
  const shipment =
    state.shipments.find((candidate) => candidate.incomingParcelId === parcel.id) ??
    state.shipments.find(
      (candidate) =>
        candidate.chinaTrackingNumber === parcel.chinaTrackingNumber ||
        candidate.trackingNumber === parcel.chinaTrackingNumber,
    ) ??
    null;

  return {
    ...parcel,
    customer,
    shipment: buildShipmentSummary(shipment, parcel.chinaTrackingNumber),
  };
}

function mapPersistedIncomingParcel(parcel: PersistedIncomingParcelWithRelations): IncomingParcelWithRelations {
  return {
    id: parcel.id,
    chinaTrackingNumber: parcel.chinaTrackingNumber,
    scanValue: parcel.scanValue,
    courierCompany: parcel.courierCompany,
    customerId: parcel.customerId,
    status: coerceIncomingParcelStatus(parcel.status),
    matchedBy: parcel.matchedBy,
    receiverNameRaw: parcel.receiverNameRaw,
    receiverPhoneRaw: parcel.receiverPhoneRaw,
    receiverAddressRaw: parcel.receiverAddressRaw,
    ocrText: parcel.ocrText,
    declaredValue: coerceNumber(parcel.declaredValue),
    declaredCurrency: coerceCurrency(parcel.declaredCurrency),
    actualWeightKg: coerceNumber(parcel.actualWeightKg),
    transportType: coerceTransportType(parcel.transportType),
    notes: parcel.notes,
    shelfLocation: parcel.shelfLocation,
    warehouseReceivedAt: parcel.warehouseReceivedAt.toISOString(),
    createdAt: parcel.createdAt.toISOString(),
    updatedAt: parcel.updatedAt.toISOString(),
    images: parcel.images
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      .map((image) => ({
        id: image.id,
        parcelId: image.parcelId,
        dataUrl: image.dataUrl,
        fileName: image.fileName,
        createdAt: image.createdAt.toISOString(),
      })),
    customer: parcel.customer ? mapCustomerRecord(parcel.customer) : null,
    shipment: buildShipmentSummary(parcel.shipment, parcel.chinaTrackingNumber),
  };
}

function getStatusEventLabel(status: ShipmentStatus) {
  switch (status) {
    case "draft":
      return "Shipment registered";
    case "received":
      return "Cargo received";
    case "in_transit":
      return "Shipment in transit";
    case "arrived":
      return "Shipment arrived";
    case "ready_for_pickup":
      return "Ready for pickup";
    case "delivered":
      return "Shipment delivered";
    case "on_hold":
      return "Shipment on hold";
  }
}

function buildStatusEvent(
  shipmentId: string,
  status: ShipmentStatus,
  occurredAt: string,
  details?: string,
): ShipmentEventRecord {
  return {
    id: createId("event"),
    shipmentId,
    status,
    label: getStatusEventLabel(status),
    details: details ?? null,
    location: null,
    occurredAt,
    createdAt: occurredAt,
  };
}

function createAuditEntry(params: Omit<AuditLogRecord, "id" | "createdAt">): AuditLogRecord {
  return {
    id: createId("audit"),
    createdAt: new Date().toISOString(),
    ...params,
  };
}

function buildCustomerAliases(input: CreateCustomerInput): Array<{
  kind: CustomerAliasKind;
  value: string;
  normalizedValue: string;
}> {
  const entries = [
    ...(input.receiverAliases ?? []).map((value) => ({
      kind: "receiver_name" as const,
      value,
    })),
    ...(input.receiverPhones ?? []).map((value) => ({
      kind: "receiver_phone" as const,
      value,
    })),
    ...(input.marketplaceAliases ?? []).map((value) => ({
      kind: "marketplace_alias" as const,
      value,
    })),
  ]
    .map((entry) => ({
      ...entry,
      value: entry.value.trim(),
      normalizedValue: normalizeAliasValue(entry.kind, entry.value),
    }))
    .filter((entry) => entry.value.length > 0 && entry.normalizedValue.length > 0);

  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.kind}:${entry.normalizedValue}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeCustomerInput(input: CreateCustomerInput): CreateCustomerInput {
  const parsed = createCustomerSchema.parse(input);
  return {
    name: parsed.name,
    email: parsed.email || undefined,
    phone: parsed.phone || undefined,
    customerCode: parsed.customerCode || undefined,
    referencePrefix: parsed.referencePrefix || undefined,
    receiverAliases: parsed.receiverAliases,
    receiverPhones: parsed.receiverPhones,
    marketplaceAliases: parsed.marketplaceAliases,
  };
}

function normalizeShipmentInput(input: CreateShipmentInput): CreateShipmentInput {
  const parsed = createShipmentSchema.parse(input);
  return {
    ...parsed,
    trackingNumber: normalizeLookupValue(parsed.trackingNumber),
    customerReference: normalizeLookupValue(parsed.customerReference),
    transportType: parsed.transportType ?? "express",
    carrier: parsed.carrier || undefined,
    actualWeightKg: parsed.actualWeightKg ?? 0,
    volumetricWeightKg: parsed.volumetricWeightKg ?? 0,
    volumeCbm: parsed.volumeCbm ?? 0,
    freightAmount: parsed.freightAmount ?? 0,
    currency: parsed.currency || "Ar",
    eta: parsed.eta || undefined,
    notes: parsed.notes || undefined,
    publicVisible: parsed.publicVisible ?? true,
  };
}

function normalizeShipmentPatch(input: UpdateShipmentInput): UpdateShipmentInput {
  const parsed = updateShipmentSchema.parse(input);
  return {
    ...parsed,
    customerReference: parsed.customerReference
      ? normalizeLookupValue(parsed.customerReference)
      : undefined,
    transportType: parsed.transportType ?? undefined,
    carrier: parsed.carrier || undefined,
    currency: parsed.currency || undefined,
    eta: parsed.eta || undefined,
    notes: parsed.notes || undefined,
  };
}

function normalizeScanPreviewIncomingParcelInput(
  input: PreviewIncomingParcelInput,
): PreviewIncomingParcelInput {
  const parsed = scanPreviewIncomingParcelSchema.parse(input);
  return {
    scanValue: parsed.scanValue.trim(),
    scanFormat: parsed.scanFormat || undefined,
  };
}

function normalizeCreateIncomingParcelInput(
  input: CreateIncomingParcelInput,
): CreateIncomingParcelInput {
  const parsed = createIncomingParcelSchema.parse(input);
  return {
    scanValue: normalizeLookupValue(parsed.scanValue),
    chinaTrackingNumber: normalizeLookupValue(parsed.chinaTrackingNumber),
    courierCompany: parsed.courierCompany || undefined,
    customerId: parsed.customerId || undefined,
    matchedBy: parsed.matchedBy || undefined,
    receiverNameRaw: parsed.receiverNameRaw || undefined,
    receiverPhoneRaw: parsed.receiverPhoneRaw || undefined,
    receiverAddressRaw: parsed.receiverAddressRaw || undefined,
    ocrText: parsed.ocrText || undefined,
    declaredValue: parsed.declaredValue,
    declaredCurrency: parsed.declaredCurrency || "CNY",
    actualWeightKg: parsed.actualWeightKg,
    transportType: parsed.transportType,
    notes: parsed.notes || undefined,
    shelfLocation: parsed.shelfLocation || undefined,
    images: parsed.images,
  };
}

function normalizeAssignIncomingParcelInput(
  input: AssignIncomingParcelInput,
): AssignIncomingParcelInput {
  const parsed = assignIncomingParcelSchema.parse(input);
  return {
    customerId: parsed.customerId,
    matchedBy: parsed.matchedBy || undefined,
  };
}

function nextSequentialCode(values: string[], prefix: string, start = 1001, width = 4) {
  const maxNumber = values.reduce((highest, value) => {
    const match = value.match(new RegExp(`^${prefix}(\\d+)$`));
    if (!match) {
      return highest;
    }

    return Math.max(highest, Number(match[1]));
  }, start - 1);

  return `${prefix}${String(maxNumber + 1).padStart(width, "0")}`;
}

async function generateCustomerCode() {
  if (isDemoModeEnabled()) {
    return nextSequentialCode(
      getDemoState().customers.map((customer) => customer.customerCode),
      "C",
    );
  }

  const customers = await prisma.customer.findMany({
    select: {
      customerCode: true,
    },
  });

  return nextSequentialCode(
    customers.map((customer) => customer.customerCode),
    "C",
  );
}

function formatDateStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

async function generateInternalTrackingNumber() {
  const dateStamp = formatDateStamp();
  const prefix = `MADA-${dateStamp}-`;

  if (isDemoModeEnabled()) {
    const todaysShipments = getDemoState().shipments.filter((shipment) =>
      shipment.trackingNumber.startsWith(prefix),
    ).length;
    return `${prefix}${String(todaysShipments + 1).padStart(4, "0")}`;
  }

  const todaysShipments = await prisma.shipment.count({
    where: {
      trackingNumber: {
        startsWith: prefix,
      },
    },
  });

  return `${prefix}${String(todaysShipments + 1).padStart(4, "0")}`;
}

async function generateCustomerReference(customer: Pick<CustomerRecord, "id" | "customerCode" | "referencePrefix">) {
  const prefix = customer.referencePrefix || customer.customerCode;

  if (isDemoModeEnabled()) {
    const count = getDemoState().shipments.filter((shipment) => shipment.customerId === customer.id).length;
    return `${prefix}-${String(count + 1).padStart(3, "0")}`;
  }

  const count = await prisma.shipment.count({
    where: {
      customerId: customer.id,
    },
  });

  return `${prefix}-${String(count + 1).padStart(3, "0")}`;
}

function buildShipmentNotesFromIntake(notes?: string, chinaTrackingNumber?: string) {
  const fragments = [
    chinaTrackingNumber ? `Intake linked to China tracking ${chinaTrackingNumber}.` : null,
    notes?.trim() ? notes.trim() : null,
  ].filter(Boolean);

  return fragments.length > 0 ? fragments.join(" ") : "Shipment created from warehouse intake.";
}

function normalizeImportRow(rawRow: Record<string, unknown>, rowNumber: number) {
  const normalizedKeys = Object.fromEntries(
    Object.entries(rawRow).map(([key, value]) => [key.toLowerCase().replace(/\s+/g, ""), value]),
  );
  const transportTypeValue = String(
    normalizedKeys.transporttype ?? normalizedKeys.transport ?? normalizedKeys.typetransport ?? "",
  )
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  const candidate = {
    trackingNumber: String(
      normalizedKeys.trackingnumber ?? normalizedKeys.tracking ?? "",
    ).trim(),
    customerReference: String(
      normalizedKeys.customerreference ?? normalizedKeys.referenceclient ?? normalizedKeys.reference ?? "",
    ).trim(),
    customerName: String(
      normalizedKeys.customername ?? normalizedKeys.client ?? normalizedKeys.customer ?? "",
    ).trim(),
    transportType: transportTypeValue || undefined,
    origin: String(normalizedKeys.origin ?? normalizedKeys.origine ?? "").trim(),
    destination: String(normalizedKeys.destination ?? "").trim(),
    currentStatus: String(
      normalizedKeys.currentstatus ?? normalizedKeys.status ?? normalizedKeys.statut ?? "",
    )
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_"),
    paymentStatus: String(
      normalizedKeys.paymentstatus ?? normalizedKeys.payment ?? normalizedKeys.paiement ?? "",
    )
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_"),
    carrier: String(normalizedKeys.carrier ?? normalizedKeys.transporteur ?? "").trim(),
    eta: String(normalizedKeys.eta ?? normalizedKeys.arrival ?? "").trim(),
    notes: String(normalizedKeys.notes ?? normalizedKeys.note ?? "").trim(),
  };

  const parsed = importRowSchema.safeParse(candidate);

  if (!parsed.success) {
    return {
      success: false as const,
      rowNumber,
      trackingNumber: candidate.trackingNumber || undefined,
      message: parsed.error.issues.map((issue) => issue.message).join(", "),
      rawData: rawRow,
    };
  }

  return {
    success: true as const,
    value: {
      rowNumber,
      trackingNumber: normalizeLookupValue(parsed.data.trackingNumber),
      customerReference: normalizeLookupValue(parsed.data.customerReference),
      customerName: parsed.data.customerName,
      transportType: parsed.data.transportType ?? "express",
      origin: parsed.data.origin,
      destination: parsed.data.destination,
      currentStatus: parsed.data.currentStatus,
      paymentStatus: parsed.data.paymentStatus,
      actualWeightKg: parsed.data.actualWeightKg ?? 0,
      volumetricWeightKg: parsed.data.volumetricWeightKg ?? 0,
      volumeCbm: parsed.data.volumeCbm ?? 0,
      freightAmount: parsed.data.freightAmount ?? 0,
      currency: parsed.data.currency || "Ar",
      carrier: parsed.data.carrier || undefined,
      eta: parsed.data.eta || undefined,
      notes: parsed.data.notes || undefined,
    } satisfies ImportRowDraft,
  };
}

function summarizeMetrics(shipments: ShipmentWithRelations[], imports: ImportBatchRecord[]): DashboardMetrics {
  return {
    shipmentCount: shipments.length,
    outstandingShipmentCount: shipments.filter(
      (shipment) => shipment.paymentStatus !== "paid",
    ).length,
    deliveredCount: shipments.filter((shipment) => shipment.currentStatus === "delivered").length,
    hiddenShipmentCount: shipments.filter((shipment) => !shipment.publicVisible).length,
    importCount: imports.length,
  };
}

function summarizeReports(
  shipments: ShipmentWithRelations[],
  imports: ImportBatchRecord[],
): ReportSummary {
  const byStatusMap = new Map<ShipmentStatus, number>();
  const customerOutstandingMap = new Map<string, { customerName: string; count: number }>();
  const monthlyVolumeMap = new Map<string, number>();

  for (const shipment of shipments) {
    byStatusMap.set(shipment.currentStatus, (byStatusMap.get(shipment.currentStatus) ?? 0) + 1);

    if (shipment.paymentStatus !== "paid") {
      const current = customerOutstandingMap.get(shipment.customerId);
      customerOutstandingMap.set(shipment.customerId, {
        customerName: shipment.customer.name,
        count: (current?.count ?? 0) + 1,
      });
    }

    const month = shipment.createdAt.slice(0, 7);
    monthlyVolumeMap.set(month, (monthlyVolumeMap.get(month) ?? 0) + 1);
  }

  return {
    byStatus: Array.from(byStatusMap.entries()).map(([status, count]) => ({ status, count })),
    outstandingByCustomer: Array.from(customerOutstandingMap.entries())
      .map(([customerId, value]) => ({
        customerId,
        customerName: value.customerName,
        count: value.count,
      }))
      .sort((left, right) => right.count - left.count),
    monthlyVolume: Array.from(monthlyVolumeMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((left, right) => left.month.localeCompare(right.month)),
    imports: sortByNewest(imports).map((batch) => ({
      fileName: batch.fileName,
      uploadedAt: batch.uploadedAt,
      createdCount: batch.createdCount,
      updatedCount: batch.updatedCount,
      errorCount: batch.errorCount,
    })),
  };
}

async function findStoredUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (isDemoModeEnabled()) {
    return (
      getDemoState().users.find((user) => user.email.toLowerCase() === normalizedEmail) ?? null
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  return user
    ? {
        id: user.id,
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        role: user.role as Role,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }
    : null;
}

export async function validateUserCredentials(email: string, password: string) {
  const user = await findStoredUserByEmail(email);

  if (!user) {
    return null;
  }

  const matches = await compare(password, user.passwordHash);

  if (!matches) {
    return null;
  }

  return stripPassword(user);
}

export async function listUsers() {
  if (isDemoModeEnabled()) {
    return sortByNewest(getDemoState().users.map(stripPassword));
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }));
}

export async function createUser(input: CreateUserInput, actorId?: string) {
  const parsed = createUserSchema.parse(input);
  const passwordHash = await hash(parsed.password, 10);

  if (isDemoModeEnabled()) {
    const state = getDemoState();
    const existing = state.users.find(
      (user) => user.email.toLowerCase() === parsed.email.toLowerCase(),
    );

    if (existing) {
      throw new Error("A user with that email already exists.");
    }

    const now = new Date().toISOString();
    const user: StoredUser = {
      id: createId("user"),
      name: parsed.name,
      email: parsed.email.toLowerCase(),
      passwordHash,
      role: parsed.role,
      createdAt: now,
      updatedAt: now,
    };

    state.users.push(user);
    state.auditLogs.push(
      createAuditEntry({
        userId: actorId ?? null,
        shipmentId: null,
        entityType: "user",
        entityId: user.id,
        action: "user.created",
        details: { role: user.role, email: user.email },
      }),
    );

    return stripPassword(user);
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.name,
      email: parsed.email.toLowerCase(),
      passwordHash,
      role: parsed.role,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: actorId,
      entityType: "user",
      entityId: user.id,
      action: "user.created",
      details: { role: user.role, email: user.email },
    },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function listCustomers() {
  if (isDemoModeEnabled()) {
    return sortByNewest(getDemoState().customers);
  }

  const customers = await prisma.customer.findMany({
    include: {
      aliases: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return customers.map(mapCustomerRecord);
}

export async function createCustomer(input: CreateCustomerInput, actorId?: string) {
  const parsed = normalizeCustomerInput(input);
  const customerCode = parsed.customerCode
    ? normalizeLookupValue(parsed.customerCode)
    : await generateCustomerCode();
  const aliases = buildCustomerAliases(parsed);

  if (isDemoModeEnabled()) {
    const state = getDemoState();

    if (
      state.customers.some(
        (customer) => customer.customerCode === customerCode,
      )
    ) {
      throw new Error("Customer code already exists.");
    }

    const now = new Date().toISOString();
    const customer: CustomerRecord = {
      id: createId("customer"),
      name: parsed.name,
      email: parsed.email ?? null,
      phone: parsed.phone ?? null,
      customerCode,
      referencePrefix: parsed.referencePrefix ?? null,
      aliases: aliases.map((alias) => ({
        id: createId("alias"),
        customerId: "",
        kind: alias.kind,
        value: alias.value,
        normalizedValue: alias.normalizedValue,
        createdAt: now,
        updatedAt: now,
      })),
      createdAt: now,
      updatedAt: now,
    };
    customer.aliases = customer.aliases.map((alias) => ({
      ...alias,
      customerId: customer.id,
    }));

    state.customers.unshift(customer);
    state.auditLogs.push(
      createAuditEntry({
        userId: actorId ?? null,
        shipmentId: null,
        entityType: "customer",
        entityId: customer.id,
        action: "customer.created",
        details: {
          name: customer.name,
          customerCode: customer.customerCode,
          referencePrefix: customer.referencePrefix,
        },
      }),
    );

    return customer;
  }

  const customer = await prisma.customer.create({
    data: {
      name: parsed.name,
      email: parsed.email,
      phone: parsed.phone,
      customerCode,
      referencePrefix: parsed.referencePrefix,
      aliases: aliases.length > 0 ? { create: aliases } : undefined,
    },
    include: {
      aliases: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: actorId,
      entityType: "customer",
      entityId: customer.id,
      action: "customer.created",
      details: {
        name: customer.name,
        customerCode: customer.customerCode,
        referencePrefix: customer.referencePrefix,
      },
    },
  });

  return mapCustomerRecord(customer);
}

async function ensureCustomerForImport(row: ImportRowDraft) {
  if (isDemoModeEnabled()) {
    const state = getDemoState();
    const existing =
      state.customers.find((customer) => customer.name === row.customerName) ??
      state.customers.find((customer) => customer.referencePrefix === row.customerReference);

    if (existing) {
      return existing;
    }

    const createdAt = new Date().toISOString();
    const customer: CustomerRecord = {
      id: createId("customer"),
      name: row.customerName,
      customerCode: await generateCustomerCode(),
      referencePrefix: row.customerReference,
      aliases: [],
      createdAt,
      updatedAt: createdAt,
      email: null,
      phone: null,
    };

    state.customers.push(customer);
    return customer;
  }

  const existing =
    (await prisma.customer.findFirst({
      where: {
        OR: [{ name: row.customerName }, { referencePrefix: row.customerReference }],
      },
      include: {
        aliases: true,
      },
    })) ?? null;

  if (existing) {
    return mapCustomerRecord(existing);
  }

  const created = await prisma.customer.create({
    data: {
      name: row.customerName,
      customerCode: await generateCustomerCode(),
      referencePrefix: row.customerReference,
    },
    include: {
      aliases: true,
    },
  });

  return mapCustomerRecord(created);
}

export async function listShipments() {
  if (isDemoModeEnabled()) {
    return sortByNewest(getDemoState().shipments).map(attachShipmentRelations);
  }

  const shipments = await prisma.shipment.findMany({
    include: shipmentRelationsInclude,
    orderBy: { updatedAt: "desc" },
  });

  return shipments.map(mapPersistedShipment);
}

export async function createShipment(input: CreateShipmentInput, actorId?: string) {
  const parsed = normalizeShipmentInput(input);

  if (isDemoModeEnabled()) {
    const state = getDemoState();
    const customer = state.customers.find((candidate) => candidate.id === parsed.customerId);

    if (!customer) {
      throw new Error("Customer not found.");
    }

    if (
      state.shipments.some(
        (shipment) => shipment.trackingNumber === parsed.trackingNumber,
      )
    ) {
      throw new Error("Tracking number already exists.");
    }

    const now = new Date().toISOString();
    const shipment: ShipmentRecord = {
      id: createId("shipment"),
      trackingNumber: parsed.trackingNumber,
      chinaTrackingNumber: null,
      incomingParcelId: null,
      customerId: parsed.customerId,
      customerReference: parsed.customerReference,
      transportType: parsed.transportType ?? "express",
      origin: parsed.origin,
      destination: parsed.destination,
      carrier: parsed.carrier ?? null,
      currentStatus: parsed.currentStatus,
      paymentStatus: parsed.paymentStatus,
      actualWeightKg: parsed.actualWeightKg ?? 0,
      volumetricWeightKg: parsed.volumetricWeightKg ?? 0,
      volumeCbm: parsed.volumeCbm ?? 0,
      freightAmount: parsed.freightAmount ?? 0,
      currency: parsed.currency ?? "Ar",
      eta: parsed.eta ?? null,
      notes: parsed.notes ?? null,
      publicVisible: parsed.publicVisible ?? true,
      createdAt: now,
      updatedAt: now,
    };

    state.shipments.unshift(shipment);
    state.shipmentEvents.push(
      buildStatusEvent(
        shipment.id,
        shipment.currentStatus,
        now,
        shipment.notes ?? "Shipment created manually.",
      ),
    );
    state.auditLogs.push(
      createAuditEntry({
        userId: actorId ?? null,
        shipmentId: shipment.id,
        entityType: "shipment",
        entityId: shipment.id,
        action: "shipment.created",
        details: { trackingNumber: shipment.trackingNumber },
      }),
    );

    return attachShipmentRelations(shipment);
  }

  const shipment = await prisma.shipment.create({
    data: {
      trackingNumber: parsed.trackingNumber,
      customerId: parsed.customerId,
      customerReference: parsed.customerReference,
      transportType: parsed.transportType ?? "express",
      origin: parsed.origin,
      destination: parsed.destination,
      carrier: parsed.carrier,
      currentStatus: parsed.currentStatus,
      paymentStatus: parsed.paymentStatus,
      actualWeightKg: parsed.actualWeightKg ?? 0,
      volumetricWeightKg: parsed.volumetricWeightKg ?? 0,
      volumeCbm: parsed.volumeCbm ?? 0,
      freightAmount: parsed.freightAmount ?? 0,
      currency: parsed.currency ?? "Ar",
      eta: parsed.eta ? new Date(parsed.eta) : undefined,
      notes: parsed.notes,
      publicVisible: parsed.publicVisible ?? true,
      events: {
        create: {
          status: parsed.currentStatus,
          label: getStatusEventLabel(parsed.currentStatus),
          details: parsed.notes ?? "Shipment created manually.",
          occurredAt: new Date(),
        },
      },
    },
    include: shipmentRelationsInclude,
  });

  await prisma.auditLog.create({
    data: {
      userId: actorId,
      shipmentId: shipment.id,
      entityType: "shipment",
      entityId: shipment.id,
      action: "shipment.created",
      details: { trackingNumber: shipment.trackingNumber },
    },
  });

  return mapPersistedShipment(shipment);
}

function upsertIntakeCustomerMatch(
  matches: IntakeCustomerMatch[],
  customer: CustomerRecord,
  matchedBy: string,
  confidence: "high" | "medium",
) {
  const existing = matches.find((candidate) => candidate.customer.id === customer.id);

  if (!existing) {
    matches.push({ customer, matchedBy, confidence });
    return;
  }

  if (existing.confidence === "medium" && confidence === "high") {
    existing.matchedBy = matchedBy;
    existing.confidence = confidence;
  }
}

async function resolveIntakePreview(input: PreviewIncomingParcelInput) {
  const parsed = normalizeScanPreviewIncomingParcelInput(input);
  const customers = await listCustomers();
  const scanParse = parsed.scanValue
    ? parseIncomingParcelScan(parsed.scanValue, parsed.scanFormat)
    : null;
  const trackingCandidates = mergeTrackingCandidates(scanParse?.trackingCandidates ?? []);
  const bestTrackingCandidate = pickBestTrackingCandidate(trackingCandidates);
  const searchableText = scanParse?.searchableText || "";
  const compactSearchableText = normalizeCompactTextMatchValue(searchableText);
  const detectedCustomerCode = scanParse?.detectedCustomerCode ?? null;
  const receiverPhoneRaw = scanParse?.receiverPhoneRaw ?? null;
  const receiverNameRaw = scanParse?.receiverNameRaw ?? null;
  const matches: IntakeCustomerMatch[] = [];

  if (detectedCustomerCode) {
    const customer = customers.find(
      (candidate) => candidate.customerCode === detectedCustomerCode,
    );
    if (customer) {
      upsertIntakeCustomerMatch(matches, customer, "customer_code", "high");
    }
  }

  if (receiverPhoneRaw) {
    for (const customer of customers) {
      const customerPhone = customer.phone ? normalizePhoneMatchValue(customer.phone) : "";
      const aliasMatch = customer.aliases.some(
        (alias) =>
          alias.kind === "receiver_phone" &&
          alias.normalizedValue === normalizePhoneMatchValue(receiverPhoneRaw),
      );

      if (
        customerPhone === normalizePhoneMatchValue(receiverPhoneRaw) ||
        aliasMatch
      ) {
        upsertIntakeCustomerMatch(matches, customer, "receiver_phone", "high");
      }
    }
  }

  const normalizedReceiverName = receiverNameRaw
    ? normalizeTextMatchValue(receiverNameRaw)
    : "";
  const compactReceiverName = normalizeCompactTextMatchValue(receiverNameRaw ?? "");

  for (const customer of customers) {
    const codeFoundInText =
      searchableText.includes(customer.customerCode) ||
      compactSearchableText.includes(normalizeCompactTextMatchValue(customer.customerCode));
    const aliasMatch = customer.aliases.find((alias) => {
      if (alias.kind === "receiver_phone") {
        return (
          receiverPhoneRaw &&
          alias.normalizedValue === normalizePhoneMatchValue(receiverPhoneRaw)
        );
      }

      if (!alias.normalizedValue) {
        return false;
      }

      const compactAliasValue = normalizeCompactTextMatchValue(alias.normalizedValue);

      return (
        normalizedReceiverName.includes(alias.normalizedValue) ||
        searchableText.includes(alias.normalizedValue) ||
        (compactAliasValue.length > 0 &&
          (compactReceiverName.includes(compactAliasValue) ||
            compactSearchableText.includes(compactAliasValue)))
      );
    });

    if (codeFoundInText || aliasMatch) {
      upsertIntakeCustomerMatch(
        matches,
        customer,
        codeFoundInText ? "customer_code" : aliasMatch?.kind === "marketplace_alias" ? "marketplace_alias" : "receiver_alias",
        codeFoundInText || aliasMatch?.kind === "receiver_phone" ? "high" : "medium",
      );
    }
  }

  const highConfidenceMatches = matches.filter((match) => match.confidence === "high");
  const resolved = highConfidenceMatches.length === 1
    ? highConfidenceMatches[0]
    : matches.length === 1
      ? matches[0]
      : null;

  return {
    scanType:
      bestTrackingCandidate?.source === "qr"
        ? "qr"
        : bestTrackingCandidate?.source === "barcode"
          ? "barcode"
          : scanParse?.scanType ?? "manual",
    rawScanValue: scanParse?.rawScanValue ?? (parsed.scanValue || null),
    decodedPayload: scanParse?.decodedPayload ?? null,
    scanValue:
      bestTrackingCandidate?.value ||
      scanParse?.scanValue ||
      normalizeLookupValue(parsed.scanValue),
    chinaTrackingNumber: bestTrackingCandidate?.value ?? "",
    trackingSource: bestTrackingCandidate?.source ?? null,
    trackingConfidence: bestTrackingCandidate?.confidence ?? null,
    trackingCandidates,
    courierCompany: scanParse?.courierCompany ?? null,
    detectedCustomerCode,
    actualWeightKg: scanParse?.actualWeightKg ?? null,
    resolvedCustomerId: resolved?.customer.id ?? null,
    resolvedBy: resolved?.matchedBy ?? null,
    matches,
  } satisfies IntakePreviewResult;
}

async function buildShipmentFromIncomingParcel(params: {
  parcelId: string;
  chinaTrackingNumber: string;
  customer: CustomerRecord;
  transportType: TransportType;
  courierCompany?: string;
  actualWeightKg: number;
  notes?: string;
  actorId?: string;
}) {
  const trackingNumber = await generateInternalTrackingNumber();
  const customerReference = await generateCustomerReference(params.customer);
  const now = new Date().toISOString();

  if (isDemoModeEnabled()) {
    const state = getDemoState();
    const shipment: ShipmentRecord = {
      id: createId("shipment"),
      trackingNumber,
      chinaTrackingNumber: params.chinaTrackingNumber,
      incomingParcelId: params.parcelId,
      customerId: params.customer.id,
      customerReference,
      transportType: params.transportType,
      origin: "China Warehouse",
      destination: "Destination Hub",
      carrier: params.courierCompany ?? null,
      currentStatus: "received",
      paymentStatus: "unpaid",
      actualWeightKg: params.actualWeightKg,
      volumetricWeightKg: params.actualWeightKg,
      volumeCbm: 0,
      freightAmount: 0,
      currency: "Ar",
      eta: null,
      notes: buildShipmentNotesFromIntake(params.notes, params.chinaTrackingNumber),
      publicVisible: true,
      createdAt: now,
      updatedAt: now,
    };

    state.shipments.unshift(shipment);
    state.shipmentEvents.push(
      buildStatusEvent(
        shipment.id,
        "received",
        now,
        buildShipmentNotesFromIntake(params.notes, params.chinaTrackingNumber),
      ),
    );
    state.auditLogs.push(
      createAuditEntry({
        userId: params.actorId ?? null,
        shipmentId: shipment.id,
        entityType: "shipment",
        entityId: shipment.id,
        action: "shipment.created_from_intake",
        details: {
          trackingNumber: shipment.trackingNumber,
          chinaTrackingNumber: params.chinaTrackingNumber,
        },
      }),
    );

    return shipment;
  }

  const shipment = await prisma.shipment.create({
    data: {
      trackingNumber,
      customerId: params.customer.id,
      customerReference,
      incomingParcelId: params.parcelId,
      transportType: params.transportType,
      origin: "China Warehouse",
      destination: "Destination Hub",
      carrier: params.courierCompany,
      currentStatus: "received",
      paymentStatus: "unpaid",
      actualWeightKg: params.actualWeightKg,
      volumetricWeightKg: params.actualWeightKg,
      volumeCbm: 0,
      freightAmount: 0,
      currency: "Ar",
      notes: buildShipmentNotesFromIntake(params.notes, params.chinaTrackingNumber),
      publicVisible: true,
      events: {
        create: {
          status: "received",
          label: getStatusEventLabel("received"),
          details: buildShipmentNotesFromIntake(params.notes, params.chinaTrackingNumber),
          occurredAt: new Date(),
        },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: params.actorId,
      shipmentId: shipment.id,
      entityType: "shipment",
      entityId: shipment.id,
      action: "shipment.created_from_intake",
      details: {
        trackingNumber: shipment.trackingNumber,
        chinaTrackingNumber: params.chinaTrackingNumber,
      },
    },
  });

  return {
    id: shipment.id,
    trackingNumber: shipment.trackingNumber,
    chinaTrackingNumber: params.chinaTrackingNumber,
    incomingParcelId: shipment.incomingParcelId,
    customerId: shipment.customerId,
    customerReference: shipment.customerReference,
    transportType: coerceTransportType(shipment.transportType),
    origin: shipment.origin,
    destination: shipment.destination,
    carrier: shipment.carrier,
    currentStatus: coerceShipmentStatus(shipment.currentStatus),
    paymentStatus: coercePaymentStatus(shipment.paymentStatus),
    actualWeightKg: coerceNumber(shipment.actualWeightKg),
    volumetricWeightKg: coerceNumber(shipment.volumetricWeightKg),
    volumeCbm: coerceNumber(shipment.volumeCbm),
    freightAmount: coerceNumber(shipment.freightAmount),
    currency: coerceCurrency(shipment.currency),
    eta: toIsoString(shipment.eta),
    notes: shipment.notes,
    publicVisible: shipment.publicVisible,
    createdAt: shipment.createdAt.toISOString(),
    updatedAt: shipment.updatedAt.toISOString(),
  } satisfies ShipmentRecord;
}

export async function scanPreviewIncomingParcel(
  input: PreviewIncomingParcelInput,
): Promise<IntakePreviewResult> {
  return resolveIntakePreview(input);
}

export async function listIncomingParcels() {
  if (isDemoModeEnabled()) {
    return sortByNewest(getDemoState().incomingParcels).map(attachIncomingParcelRelations);
  }

  const parcels = await prisma.incomingParcel.findMany({
    include: incomingParcelRelationsInclude,
    orderBy: { updatedAt: "desc" },
  });

  return parcels.map(mapPersistedIncomingParcel);
}

export async function createIncomingParcel(
  input: CreateIncomingParcelInput,
  actorId?: string,
): Promise<IncomingParcelWithRelations> {
  const parsed = normalizeCreateIncomingParcelInput(input);
  const ocrParse = parseIncomingParcelOcr(parsed.scanValue, parsed.ocrText);
  const effectiveScanValue = parsed.scanValue || ocrParse.scanValue || parsed.chinaTrackingNumber;
  const effectiveCourierCompany = parsed.courierCompany || ocrParse.courierCompany || undefined;

  if (isDemoModeEnabled()) {
    const state = getDemoState();
    const existingParcel = state.incomingParcels.find(
      (parcel) => parcel.chinaTrackingNumber === parsed.chinaTrackingNumber,
    );

    if (existingParcel) {
      throw new Error("China tracking number already exists.");
    }

    const customer = parsed.customerId
      ? state.customers.find((candidate) => candidate.id === parsed.customerId) ?? null
      : null;
    const now = new Date().toISOString();
    const parcel: IncomingParcelRecord = {
      id: createId("parcel"),
      chinaTrackingNumber: parsed.chinaTrackingNumber,
      scanValue: effectiveScanValue,
      courierCompany: effectiveCourierCompany ?? null,
      customerId: customer?.id ?? null,
      status: customer ? "received" : "unassigned",
      matchedBy: customer ? parsed.matchedBy ?? "manual" : "unassigned",
      receiverNameRaw: parsed.receiverNameRaw ?? null,
      receiverPhoneRaw: parsed.receiverPhoneRaw ?? null,
      receiverAddressRaw: parsed.receiverAddressRaw ?? null,
      ocrText: parsed.ocrText ?? null,
      declaredValue: parsed.declaredValue,
      declaredCurrency: parsed.declaredCurrency ?? "CNY",
      actualWeightKg: parsed.actualWeightKg,
      transportType: parsed.transportType,
      notes: parsed.notes ?? null,
      shelfLocation: parsed.shelfLocation ?? null,
      warehouseReceivedAt: now,
      createdAt: now,
      updatedAt: now,
      images: parsed.images.map((image) => ({
        id: createId("parcel_image"),
        parcelId: "",
        dataUrl: image.dataUrl,
        fileName: image.fileName ?? null,
        createdAt: now,
      })),
    };
    parcel.images = parcel.images.map((image) => ({
      ...image,
      parcelId: parcel.id,
    }));

    state.incomingParcels.unshift(parcel);

    if (customer) {
      await buildShipmentFromIncomingParcel({
        parcelId: parcel.id,
        chinaTrackingNumber: parcel.chinaTrackingNumber,
        customer,
        transportType: parcel.transportType,
        courierCompany: parcel.courierCompany ?? undefined,
        actualWeightKg: parcel.actualWeightKg,
        notes: parcel.notes ?? undefined,
        actorId,
      });
    }

    state.auditLogs.push(
      createAuditEntry({
        userId: actorId ?? null,
        shipmentId: null,
        entityType: "incomingParcel",
        entityId: parcel.id,
        action: customer ? "incoming_parcel.received" : "incoming_parcel.unassigned",
        details: {
          chinaTrackingNumber: parcel.chinaTrackingNumber,
          customerId: parcel.customerId,
        },
      }),
    );

    return attachIncomingParcelRelations(parcel);
  }

  const existingParcel = await prisma.incomingParcel.findUnique({
    where: {
      chinaTrackingNumber: parsed.chinaTrackingNumber,
    },
  });

  if (existingParcel) {
    throw new Error("China tracking number already exists.");
  }

  const customer = parsed.customerId
    ? await prisma.customer.findUnique({
        where: {
          id: parsed.customerId,
        },
        include: {
          aliases: true,
        },
      })
    : null;

  if (parsed.customerId && !customer) {
    throw new Error("Customer not found.");
  }

  const parcel = await prisma.incomingParcel.create({
    data: {
      chinaTrackingNumber: parsed.chinaTrackingNumber,
      scanValue: effectiveScanValue,
      courierCompany: effectiveCourierCompany,
      customerId: customer?.id,
      status: customer ? "received" : "unassigned",
      matchedBy: customer ? parsed.matchedBy ?? "manual" : "unassigned",
      receiverNameRaw: parsed.receiverNameRaw,
      receiverPhoneRaw: parsed.receiverPhoneRaw,
      receiverAddressRaw: parsed.receiverAddressRaw,
      ocrText: parsed.ocrText,
      declaredValue: parsed.declaredValue,
      declaredCurrency: parsed.declaredCurrency ?? "CNY",
      actualWeightKg: parsed.actualWeightKg,
      transportType: parsed.transportType,
      notes: parsed.notes,
      shelfLocation: parsed.shelfLocation,
      images: {
        create: parsed.images,
      },
    },
    include: incomingParcelRelationsInclude,
  });

  if (customer) {
    await buildShipmentFromIncomingParcel({
      parcelId: parcel.id,
      chinaTrackingNumber: parcel.chinaTrackingNumber,
      customer: mapCustomerRecord(customer),
      transportType: coerceTransportType(parcel.transportType),
      courierCompany: parcel.courierCompany ?? undefined,
      actualWeightKg: coerceNumber(parcel.actualWeightKg),
      notes: parcel.notes ?? undefined,
      actorId,
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: actorId,
      entityType: "incomingParcel",
      entityId: parcel.id,
      action: customer ? "incoming_parcel.received" : "incoming_parcel.unassigned",
      details: {
        chinaTrackingNumber: parcel.chinaTrackingNumber,
        customerId: parcel.customerId,
      },
    },
  });

  const refreshed = await prisma.incomingParcel.findUniqueOrThrow({
    where: { id: parcel.id },
    include: incomingParcelRelationsInclude,
  });

  return mapPersistedIncomingParcel(refreshed);
}

export async function assignIncomingParcel(
  parcelId: string,
  input: AssignIncomingParcelInput,
  actorId?: string,
): Promise<IncomingParcelWithRelations> {
  const parsed = normalizeAssignIncomingParcelInput(input);

  if (isDemoModeEnabled()) {
    const state = getDemoState();
    const parcel = state.incomingParcels.find((candidate) => candidate.id === parcelId);
    const customer = state.customers.find((candidate) => candidate.id === parsed.customerId) ?? null;

    if (!parcel) {
      throw new Error("Incoming parcel not found.");
    }

    if (!customer) {
      throw new Error("Customer not found.");
    }

    const alreadyLinked = state.shipments.some((shipment) => shipment.incomingParcelId === parcel.id);
    if (alreadyLinked) {
      throw new Error("Incoming parcel already has a shipment.");
    }

    parcel.customerId = customer.id;
    parcel.status = "received";
    parcel.matchedBy = parsed.matchedBy ?? "manual_assignment";
    parcel.updatedAt = new Date().toISOString();

    await buildShipmentFromIncomingParcel({
      parcelId: parcel.id,
      chinaTrackingNumber: parcel.chinaTrackingNumber,
      customer,
      transportType: parcel.transportType,
      courierCompany: parcel.courierCompany ?? undefined,
      actualWeightKg: parcel.actualWeightKg,
      notes: parcel.notes ?? undefined,
      actorId,
    });

    state.auditLogs.push(
      createAuditEntry({
        userId: actorId ?? null,
        shipmentId: null,
        entityType: "incomingParcel",
        entityId: parcel.id,
        action: "incoming_parcel.assigned",
        details: {
          chinaTrackingNumber: parcel.chinaTrackingNumber,
          customerId: customer.id,
        },
      }),
    );

    return attachIncomingParcelRelations(parcel);
  }

  const parcel = await prisma.incomingParcel.findUnique({
    where: { id: parcelId },
    include: incomingParcelRelationsInclude,
  });

  if (!parcel) {
    throw new Error("Incoming parcel not found.");
  }

  if (parcel.shipment) {
    throw new Error("Incoming parcel already has a shipment.");
  }

  const customer = await prisma.customer.findUnique({
    where: { id: parsed.customerId },
    include: {
      aliases: true,
    },
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  await prisma.incomingParcel.update({
    where: { id: parcelId },
    data: {
      customerId: customer.id,
      status: "received",
      matchedBy: parsed.matchedBy ?? "manual_assignment",
    },
  });

  await buildShipmentFromIncomingParcel({
    parcelId,
    chinaTrackingNumber: parcel.chinaTrackingNumber,
    customer: mapCustomerRecord(customer),
    transportType: coerceTransportType(parcel.transportType),
    courierCompany: parcel.courierCompany ?? undefined,
    actualWeightKg: coerceNumber(parcel.actualWeightKg),
    notes: parcel.notes ?? undefined,
    actorId,
  });

  await prisma.auditLog.create({
    data: {
      userId: actorId,
      entityType: "incomingParcel",
      entityId: parcelId,
      action: "incoming_parcel.assigned",
      details: {
        chinaTrackingNumber: parcel.chinaTrackingNumber,
        customerId: customer.id,
      },
    },
  });

  const refreshed = await prisma.incomingParcel.findUniqueOrThrow({
    where: { id: parcelId },
    include: incomingParcelRelationsInclude,
  });

  return mapPersistedIncomingParcel(refreshed);
}

export async function updateShipment(shipmentId: string, input: UpdateShipmentInput, actorId?: string) {
  const patch = normalizeShipmentPatch(input);

  if (isDemoModeEnabled()) {
    const state = getDemoState();
    const shipment = state.shipments.find((candidate) => candidate.id === shipmentId);

    if (!shipment) {
      throw new Error("Shipment not found.");
    }

    const previousStatus = shipment.currentStatus;
    Object.assign(shipment, {
      ...patch,
      carrier: patch.carrier ?? shipment.carrier,
      eta: patch.eta ?? shipment.eta,
      notes: patch.notes ?? shipment.notes,
      updatedAt: new Date().toISOString(),
    });

    if (patch.currentStatus && patch.currentStatus !== previousStatus) {
      state.shipmentEvents.push(
        buildStatusEvent(
          shipment.id,
          patch.currentStatus,
          shipment.updatedAt,
          patch.notes ?? "Status changed from admin.",
        ),
      );
    }

    state.auditLogs.push(
      createAuditEntry({
        userId: actorId ?? null,
        shipmentId: shipment.id,
        entityType: "shipment",
        entityId: shipment.id,
        action: "shipment.updated",
        details: patch as Record<string, unknown>,
      }),
    );

    return attachShipmentRelations(shipment);
  }

  const existing = await prisma.shipment.findUnique({
    where: { id: shipmentId },
  });

  if (!existing) {
    throw new Error("Shipment not found.");
  }

  const updated = await prisma.shipment.update({
    where: { id: shipmentId },
    data: {
      customerReference: patch.customerReference,
      transportType: patch.transportType,
      origin: patch.origin,
      destination: patch.destination,
      carrier: patch.carrier,
      currentStatus: patch.currentStatus,
      paymentStatus: patch.paymentStatus,
      actualWeightKg: patch.actualWeightKg,
      volumetricWeightKg: patch.volumetricWeightKg,
      volumeCbm: patch.volumeCbm,
      freightAmount: patch.freightAmount,
      currency: patch.currency,
      eta: patch.eta ? new Date(patch.eta) : patch.eta === undefined ? undefined : null,
      notes: patch.notes,
      publicVisible: patch.publicVisible,
      ...(patch.currentStatus && patch.currentStatus !== existing.currentStatus
        ? {
            events: {
              create: {
                status: patch.currentStatus,
                label: getStatusEventLabel(patch.currentStatus),
                details: patch.notes ?? "Status changed from admin.",
                occurredAt: new Date(),
              },
            },
          }
        : {}),
    },
    include: shipmentRelationsInclude,
  });

  await prisma.auditLog.create({
    data: {
      userId: actorId,
      shipmentId,
      entityType: "shipment",
      entityId: shipmentId,
      action: "shipment.updated",
      details: patch as Prisma.InputJsonValue,
    },
  });

  return mapPersistedShipment(updated);
}

export async function lookupPublic(
  mode: "tracking" | "reference",
  value: string,
  transportType?: TransportType,
): Promise<LookupResponse> {
  const normalizedValue = normalizeLookupValue(value);

  if (isDemoModeEnabled()) {
    const shipments = await listShipments();

    if (mode === "tracking") {
      const shipment =
        shipments.find(
          (candidate) =>
            candidate.chinaTrackingNumber === normalizedValue && candidate.publicVisible,
        ) ??
        shipments.find(
          (candidate) =>
            candidate.trackingNumber === normalizedValue && candidate.publicVisible,
        ) ?? null;

      return {
        mode,
        shipment,
        query: normalizedValue,
      };
    }

    const matchingShipments = shipments.filter(
      (shipment) =>
        shipment.customerReference === normalizedValue &&
        shipment.publicVisible &&
        shipment.paymentStatus !== "paid" &&
        (!transportType || shipment.transportType === transportType),
    );

    return {
      mode,
      shipments: matchingShipments,
      query: normalizedValue,
    };
  }

  if (mode === "tracking") {
    const shipments = await prisma.shipment.findMany({
      where: {
        OR: [
          {
            incomingParcel: {
              is: {
                chinaTrackingNumber: normalizedValue,
              },
            },
          },
          {
            trackingNumber: normalizedValue,
          },
        ],
        publicVisible: true,
      },
      include: shipmentRelationsInclude,
    });
    const shipment =
      shipments.find((candidate) => candidate.incomingParcel?.chinaTrackingNumber === normalizedValue) ??
      shipments.find((candidate) => candidate.trackingNumber === normalizedValue) ??
      null;

    return {
      mode,
      shipment: shipment ? mapPersistedShipment(shipment) : null,
      query: normalizedValue,
    };
  }

  const shipments = await prisma.shipment.findMany({
    where: {
      customerReference: normalizedValue,
      publicVisible: true,
      paymentStatus: {
        not: "paid",
      },
      ...(transportType ? { transportType } : {}),
    },
    include: shipmentRelationsInclude,
    orderBy: { updatedAt: "desc" },
  });

  return {
    mode,
    shipments: shipments.map(mapPersistedShipment),
    query: normalizedValue,
  };
}

export async function previewImport(
  fileName: string,
  bytes: Uint8Array<ArrayBuffer>,
): Promise<ImportPreview> {
  validateImportUpload(fileName, bytes.byteLength);

  const workbook = XLSX.read(bytes, {
    type: "array",
    cellDates: false,
  });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("The uploaded workbook does not contain any sheets.");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  const validRows: ImportRowDraft[] = [];
  const invalidRows: ImportPreview["invalidRows"] = [];

  rows.forEach((row, index) => {
    const normalized = normalizeImportRow(row, index + 2);

    if (normalized.success) {
      validRows.push(normalized.value);
    } else {
      invalidRows.push({
        rowNumber: normalized.rowNumber,
        trackingNumber: normalized.trackingNumber,
        message: normalized.message,
        rawData: normalized.rawData,
      });
    }
  });

  return {
    fileName,
    validRows,
    invalidRows,
  };
}

export async function commitImport(
  fileName: string,
  rows: ImportRowDraft[],
  actorId: string,
): Promise<ImportCommitSummary> {
  if (isDemoModeEnabled()) {
    const state = getDemoState();
    const now = new Date().toISOString();
    const batchId = createId("batch");
    const batch: ImportBatchRecord = {
      id: batchId,
      fileName,
      createdCount: 0,
      updatedCount: 0,
      errorCount: 0,
      uploadedAt: now,
      uploadedById: actorId,
    };
    const resultRows: ImportRowRecord[] = [];

    for (const row of rows) {
      const customer = await ensureCustomerForImport(row);
      const existing = state.shipments.find(
        (shipment) => shipment.trackingNumber === row.trackingNumber,
      );

      if (existing) {
        const previousStatus = existing.currentStatus;
        existing.customerId = customer.id;
        existing.customerReference = row.customerReference;
        existing.transportType = row.transportType ?? "express";
        existing.origin = row.origin;
        existing.destination = row.destination;
        existing.carrier = row.carrier ?? null;
        existing.currentStatus = row.currentStatus;
        existing.paymentStatus = row.paymentStatus;
        existing.actualWeightKg = row.actualWeightKg ?? 0;
        existing.volumetricWeightKg = row.volumetricWeightKg ?? 0;
        existing.volumeCbm = row.volumeCbm ?? 0;
        existing.freightAmount = row.freightAmount ?? 0;
        existing.currency = row.currency ?? "Ar";
        existing.eta = row.eta ?? null;
        existing.notes = row.notes ?? null;
        existing.updatedAt = now;

        if (previousStatus !== row.currentStatus) {
          state.shipmentEvents.push(
            buildStatusEvent(
              existing.id,
              row.currentStatus,
              now,
              row.notes ?? "Updated from spreadsheet import.",
            ),
          );
        }

        batch.updatedCount += 1;
        resultRows.push({
          id: createId("row"),
          batchId,
          shipmentId: existing.id,
          rowNumber: row.rowNumber,
          trackingNumber: row.trackingNumber,
          status: "updated",
          message: "Shipment updated from import.",
          rawData: row as unknown as Record<string, unknown>,
          createdAt: now,
        });
      } else {
        const shipment: ShipmentRecord = {
          id: createId("shipment"),
          trackingNumber: row.trackingNumber,
          chinaTrackingNumber: null,
          incomingParcelId: null,
          customerId: customer.id,
          customerReference: row.customerReference,
          transportType: row.transportType ?? "express",
          origin: row.origin,
          destination: row.destination,
          carrier: row.carrier ?? null,
          currentStatus: row.currentStatus,
          paymentStatus: row.paymentStatus,
          actualWeightKg: row.actualWeightKg ?? 0,
          volumetricWeightKg: row.volumetricWeightKg ?? 0,
          volumeCbm: row.volumeCbm ?? 0,
          freightAmount: row.freightAmount ?? 0,
          currency: row.currency ?? "Ar",
          eta: row.eta ?? null,
          notes: row.notes ?? null,
          publicVisible: true,
          createdAt: now,
          updatedAt: now,
        };

        state.shipments.unshift(shipment);
        state.shipmentEvents.push(
          buildStatusEvent(
            shipment.id,
            row.currentStatus,
            now,
            row.notes ?? "Created from spreadsheet import.",
          ),
        );

        batch.createdCount += 1;
        resultRows.push({
          id: createId("row"),
          batchId,
          shipmentId: shipment.id,
          rowNumber: row.rowNumber,
          trackingNumber: row.trackingNumber,
          status: "created",
          message: "Shipment created from import.",
          rawData: row as unknown as Record<string, unknown>,
          createdAt: now,
        });
      }
    }

    state.importBatches.unshift(batch);
    state.importRows.unshift(...resultRows);
    state.auditLogs.push(
      createAuditEntry({
        userId: actorId,
        shipmentId: null,
        entityType: "importBatch",
        entityId: batch.id,
        action: "import.committed",
        details: {
          fileName,
          createdCount: batch.createdCount,
          updatedCount: batch.updatedCount,
          errorCount: batch.errorCount,
        },
      }),
    );

    return {
      batch,
      rows: resultRows,
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const batch = await tx.importBatch.create({
      data: {
        fileName,
        uploadedById: actorId,
      },
    });

    const resultRows: ImportRowRecord[] = [];
    let createdCount = 0;
    let updatedCount = 0;

    for (const row of rows) {
      const existingCustomer =
        (await tx.customer.findFirst({
          where: {
            OR: [{ name: row.customerName }, { referencePrefix: row.customerReference }],
          },
        })) ?? null;

      const customer =
        existingCustomer ??
        (await tx.customer.create({
          data: {
            name: row.customerName,
            customerCode: await generateCustomerCode(),
            referencePrefix: row.customerReference,
          },
        }));

      const existing = await tx.shipment.findUnique({
        where: { trackingNumber: row.trackingNumber },
      });

      if (existing) {
        await tx.shipment.update({
          where: { id: existing.id },
          data: {
            customerId: customer.id,
            customerReference: row.customerReference,
            transportType: row.transportType ?? "express",
            origin: row.origin,
            destination: row.destination,
            carrier: row.carrier,
            currentStatus: row.currentStatus,
            paymentStatus: row.paymentStatus,
            actualWeightKg: row.actualWeightKg ?? 0,
            volumetricWeightKg: row.volumetricWeightKg ?? 0,
            volumeCbm: row.volumeCbm ?? 0,
            freightAmount: row.freightAmount ?? 0,
            currency: row.currency ?? "Ar",
            eta: row.eta ? new Date(row.eta) : null,
            notes: row.notes,
          },
        });

        if (existing.currentStatus !== row.currentStatus) {
          await tx.shipmentEvent.create({
            data: {
              shipmentId: existing.id,
              status: row.currentStatus,
              label: getStatusEventLabel(row.currentStatus),
              details: row.notes ?? "Updated from spreadsheet import.",
              occurredAt: new Date(),
            },
          });
        }

        const importRow = await tx.importRow.create({
          data: {
            batchId: batch.id,
            shipmentId: existing.id,
            rowNumber: row.rowNumber,
            trackingNumber: row.trackingNumber,
            status: "updated",
            message: "Shipment updated from import.",
            rawData: row as unknown as Prisma.InputJsonValue,
          },
        });

        updatedCount += 1;
        resultRows.push({
          id: importRow.id,
          batchId: batch.id,
          shipmentId: existing.id,
          rowNumber: row.rowNumber,
          trackingNumber: row.trackingNumber,
          status: "updated",
          message: importRow.message,
          rawData: importRow.rawData as Record<string, unknown>,
          createdAt: importRow.createdAt.toISOString(),
        });
      } else {
        const created = await tx.shipment.create({
          data: {
            trackingNumber: row.trackingNumber,
            customerId: customer.id,
            customerReference: row.customerReference,
            transportType: row.transportType ?? "express",
            origin: row.origin,
            destination: row.destination,
            carrier: row.carrier,
            currentStatus: row.currentStatus,
            paymentStatus: row.paymentStatus,
            actualWeightKg: row.actualWeightKg ?? 0,
            volumetricWeightKg: row.volumetricWeightKg ?? 0,
            volumeCbm: row.volumeCbm ?? 0,
            freightAmount: row.freightAmount ?? 0,
            currency: row.currency ?? "Ar",
            eta: row.eta ? new Date(row.eta) : undefined,
            notes: row.notes,
            publicVisible: true,
            events: {
              create: {
                status: row.currentStatus,
                label: getStatusEventLabel(row.currentStatus),
                details: row.notes ?? "Created from spreadsheet import.",
                occurredAt: new Date(),
              },
            },
          },
        });

        const importRow = await tx.importRow.create({
          data: {
            batchId: batch.id,
            shipmentId: created.id,
            rowNumber: row.rowNumber,
            trackingNumber: row.trackingNumber,
            status: "created",
            message: "Shipment created from import.",
            rawData: row as unknown as Prisma.InputJsonValue,
          },
        });

        createdCount += 1;
        resultRows.push({
          id: importRow.id,
          batchId: batch.id,
          shipmentId: created.id,
          rowNumber: row.rowNumber,
          trackingNumber: row.trackingNumber,
          status: "created",
          message: importRow.message,
          rawData: importRow.rawData as Record<string, unknown>,
          createdAt: importRow.createdAt.toISOString(),
        });
      }
    }

    const updatedBatch = await tx.importBatch.update({
      where: { id: batch.id },
      data: {
        createdCount,
        updatedCount,
        errorCount: 0,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actorId,
        entityType: "importBatch",
        entityId: batch.id,
        action: "import.committed",
        details: {
          fileName,
          createdCount,
          updatedCount,
          errorCount: 0,
        },
      },
    });

    return {
      batch: {
        id: updatedBatch.id,
        fileName: updatedBatch.fileName,
        createdCount: updatedBatch.createdCount,
        updatedCount: updatedBatch.updatedCount,
        errorCount: updatedBatch.errorCount,
        uploadedAt: updatedBatch.uploadedAt.toISOString(),
        uploadedById: updatedBatch.uploadedById,
      },
      rows: resultRows,
    };
  });

  return result;
}

export async function listImportBatches() {
  if (isDemoModeEnabled()) {
    return sortByNewest(getDemoState().importBatches);
  }

  const batches = await prisma.importBatch.findMany({
    orderBy: { uploadedAt: "desc" },
  });

  return batches.map((batch) => ({
    id: batch.id,
    fileName: batch.fileName,
    createdCount: batch.createdCount,
    updatedCount: batch.updatedCount,
    errorCount: batch.errorCount,
    uploadedAt: batch.uploadedAt.toISOString(),
    uploadedById: batch.uploadedById,
  }));
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [shipments, customers, imports] = await Promise.all([
    listShipments(),
    listCustomers(),
    listImportBatches(),
  ]);

  return {
    metrics: summarizeMetrics(shipments, imports),
    shipments,
    customers,
    imports,
  };
}

export async function getReportSummary() {
  const [shipments, imports] = await Promise.all([listShipments(), listImportBatches()]);
  return summarizeReports(shipments, imports);
}
