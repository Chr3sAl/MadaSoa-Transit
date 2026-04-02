export const locales = ["fr", "en"] as const;
export const defaultLocale = "fr" as const;

export type Locale = (typeof locales)[number];

export const roles = ["admin", "operator", "finance"] as const;
export type Role = (typeof roles)[number];

export const shipmentStatuses = [
  "draft",
  "received",
  "in_transit",
  "arrived",
  "ready_for_pickup",
  "delivered",
  "on_hold",
] as const;
export type ShipmentStatus = (typeof shipmentStatuses)[number];

export const paymentStatuses = ["unpaid", "partial", "paid"] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export const transportTypes = [
  "air",
  "air_batterie",
  "express",
  "express_batterie",
  "maritime",
] as const;
export type TransportType = (typeof transportTypes)[number];

export const incomingParcelStatuses = ["unassigned", "received"] as const;
export type IncomingParcelStatus = (typeof incomingParcelStatuses)[number];

export const customerAliasKinds = [
  "receiver_name",
  "receiver_phone",
  "marketplace_alias",
] as const;
export type CustomerAliasKind = (typeof customerAliasKinds)[number];

export type StoredUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
};

export type UserRecord = Omit<StoredUser, "passwordHash">;

export type CustomerAliasRecord = {
  id: string;
  customerId: string;
  kind: CustomerAliasKind;
  value: string;
  normalizedValue: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerRecord = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  customerCode: string;
  referencePrefix?: string | null;
  aliases: CustomerAliasRecord[];
  createdAt: string;
  updatedAt: string;
};

export type ShipmentEventRecord = {
  id: string;
  shipmentId: string;
  status: ShipmentStatus;
  label: string;
  details?: string | null;
  location?: string | null;
  occurredAt: string;
  createdAt: string;
};

export type ShipmentRecord = {
  id: string;
  trackingNumber: string;
  chinaTrackingNumber?: string | null;
  incomingParcelId?: string | null;
  customerId: string;
  customerReference: string;
  transportType: TransportType;
  origin: string;
  destination: string;
  carrier?: string | null;
  currentStatus: ShipmentStatus;
  paymentStatus: PaymentStatus;
  actualWeightKg: number;
  volumetricWeightKg: number;
  volumeCbm: number;
  freightAmount: number;
  currency: string;
  eta?: string | null;
  notes?: string | null;
  publicVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ShipmentWithRelations = ShipmentRecord & {
  customer: CustomerRecord;
  events: ShipmentEventRecord[];
};

export type ShipmentSummaryRecord = Pick<
  ShipmentRecord,
  | "id"
  | "trackingNumber"
  | "chinaTrackingNumber"
  | "incomingParcelId"
  | "customerId"
  | "customerReference"
  | "currentStatus"
  | "paymentStatus"
  | "createdAt"
  | "updatedAt"
>;

export type IncomingParcelImageRecord = {
  id: string;
  parcelId: string;
  dataUrl: string;
  fileName?: string | null;
  createdAt: string;
};

export type IncomingParcelRecord = {
  id: string;
  chinaTrackingNumber: string;
  scanValue: string;
  courierCompany?: string | null;
  customerId?: string | null;
  status: IncomingParcelStatus;
  matchedBy?: string | null;
  receiverNameRaw?: string | null;
  receiverPhoneRaw?: string | null;
  receiverAddressRaw?: string | null;
  ocrText?: string | null;
  declaredValue: number;
  declaredCurrency: string;
  actualWeightKg: number;
  transportType: TransportType;
  notes?: string | null;
  shelfLocation?: string | null;
  warehouseReceivedAt: string;
  createdAt: string;
  updatedAt: string;
  images: IncomingParcelImageRecord[];
};

export type IncomingParcelWithRelations = IncomingParcelRecord & {
  customer: CustomerRecord | null;
  shipment: ShipmentSummaryRecord | null;
};

export type ImportBatchRecord = {
  id: string;
  fileName: string;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  uploadedAt: string;
  uploadedById: string;
};

export type ImportRowStatus = "created" | "updated" | "skipped" | "error";

export type ImportRowRecord = {
  id: string;
  batchId: string;
  shipmentId?: string | null;
  rowNumber: number;
  trackingNumber: string;
  status: ImportRowStatus;
  message: string;
  rawData: Record<string, unknown>;
  createdAt: string;
};

export type AuditLogRecord = {
  id: string;
  userId?: string | null;
  shipmentId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  details?: Record<string, unknown> | null;
  createdAt: string;
};

export type DashboardMetrics = {
  shipmentCount: number;
  outstandingShipmentCount: number;
  deliveredCount: number;
  hiddenShipmentCount: number;
  importCount: number;
};

export type ReportSummary = {
  byStatus: Array<{ status: ShipmentStatus; count: number }>;
  outstandingByCustomer: Array<{ customerId: string; customerName: string; count: number }>;
  monthlyVolume: Array<{ month: string; count: number }>;
  imports: Array<{
    fileName: string;
    uploadedAt: string;
    createdCount: number;
    updatedCount: number;
    errorCount: number;
  }>;
};

export type LookupResponse =
  | {
      mode: "tracking";
      shipment: ShipmentWithRelations | null;
      query: string;
    }
  | {
      mode: "reference";
      shipments: ShipmentWithRelations[];
      query: string;
    };

export type CreateCustomerInput = {
  name: string;
  email?: string;
  phone?: string;
  customerCode?: string;
  referencePrefix?: string;
  receiverAliases?: string[];
  receiverPhones?: string[];
  marketplaceAliases?: string[];
};

export type CreateShipmentInput = {
  trackingNumber: string;
  customerId: string;
  customerReference: string;
  transportType?: TransportType;
  origin: string;
  destination: string;
  carrier?: string;
  currentStatus: ShipmentStatus;
  paymentStatus: PaymentStatus;
  actualWeightKg?: number;
  volumetricWeightKg?: number;
  volumeCbm?: number;
  freightAmount?: number;
  currency?: string;
  eta?: string;
  notes?: string;
  publicVisible?: boolean;
};

export type UpdateShipmentInput = Partial<
  Pick<
    CreateShipmentInput,
    | "customerReference"
    | "transportType"
    | "origin"
    | "destination"
    | "carrier"
    | "currentStatus"
    | "paymentStatus"
    | "actualWeightKg"
    | "volumetricWeightKg"
    | "volumeCbm"
    | "freightAmount"
    | "currency"
    | "eta"
    | "notes"
    | "publicVisible"
  >
>;

export type IntakeImageInput = {
  dataUrl: string;
  fileName?: string;
};

export type IntakeScanType = "barcode" | "qr" | "manual";
export type IntakeTrackingSource = "barcode" | "qr" | "ocr" | "manual";
export type IntakeTrackingCandidateKind = "tracking" | "route_code" | "customer_code" | "unknown";
export type IntakeTrackingConfidence = "strong" | "weak";

export type IntakeTrackingCandidateInput = {
  value: string;
  source: IntakeTrackingSource;
};

export type IntakeTrackingCandidate = IntakeTrackingCandidateInput & {
  kind: IntakeTrackingCandidateKind;
  confidence: IntakeTrackingConfidence;
};

export type PreviewIncomingParcelInput = {
  scanValue: string;
  scanFormat?: string;
};

export type IntakeCustomerMatch = {
  customer: CustomerRecord;
  matchedBy: string;
  confidence: "high" | "medium";
};

export type IntakePreviewResult = {
  scanType: IntakeScanType;
  rawScanValue?: string | null;
  decodedPayload?: Record<string, string> | null;
  scanValue: string;
  chinaTrackingNumber: string;
  trackingSource: IntakeTrackingSource | null;
  trackingConfidence: IntakeTrackingConfidence | null;
  trackingCandidates: IntakeTrackingCandidate[];
  courierCompany?: string | null;
  detectedCustomerCode?: string | null;
  actualWeightKg?: number | null;
  resolvedCustomerId?: string | null;
  resolvedBy?: string | null;
  matches: IntakeCustomerMatch[];
};

export type CreateIncomingParcelInput = {
  scanValue: string;
  chinaTrackingNumber: string;
  courierCompany?: string;
  customerId?: string;
  matchedBy?: string;
  receiverNameRaw?: string;
  receiverPhoneRaw?: string;
  receiverAddressRaw?: string;
  ocrText?: string;
  declaredValue: number;
  declaredCurrency?: string;
  actualWeightKg: number;
  transportType: TransportType;
  notes?: string;
  shelfLocation?: string;
  images: IntakeImageInput[];
};

export type AssignIncomingParcelInput = {
  customerId: string;
  matchedBy?: string;
};

export type CreateUserInput = {
  name: string;
  email: string;
  role: Role;
  password: string;
};

export type ImportRowDraft = {
  rowNumber: number;
  trackingNumber: string;
  customerReference: string;
  customerName: string;
  transportType?: TransportType;
  origin: string;
  destination: string;
  currentStatus: ShipmentStatus;
  paymentStatus: PaymentStatus;
  actualWeightKg?: number;
  volumetricWeightKg?: number;
  volumeCbm?: number;
  freightAmount?: number;
  currency?: string;
  carrier?: string;
  eta?: string;
  notes?: string;
};

export type ImportPreview = {
  fileName: string;
  validRows: ImportRowDraft[];
  invalidRows: Array<{
    rowNumber: number;
    trackingNumber?: string;
    message: string;
    rawData: Record<string, unknown>;
  }>;
};

export type ImportCommitSummary = {
  batch: ImportBatchRecord;
  rows: ImportRowRecord[];
};
