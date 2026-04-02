import { hashSync } from "bcryptjs";

import type {
  AuditLogRecord,
  CustomerRecord,
  ImportBatchRecord,
  ImportRowRecord,
  IncomingParcelRecord,
  ShipmentEventRecord,
  ShipmentRecord,
  StoredUser,
} from "@/lib/types";
import { createId } from "@/lib/utils";

type DemoState = {
  users: StoredUser[];
  customers: CustomerRecord[];
  shipments: ShipmentRecord[];
  incomingParcels: IncomingParcelRecord[];
  shipmentEvents: ShipmentEventRecord[];
  importBatches: ImportBatchRecord[];
  importRows: ImportRowRecord[];
  auditLogs: AuditLogRecord[];
};

const placeholderImageDataUrl =
  "data:image/gif;base64,R0lGODlhAQABAPAAAMzMzAAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";

function nowOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function buildInitialState(): DemoState {
  const createdAt = nowOffset(-45);
  const passwordHashes = {
    admin: hashSync("Admin123!", 10),
    operator: hashSync("Operator123!", 10),
    finance: hashSync("Finance123!", 10),
  };

  const users: StoredUser[] = [
    {
      id: "user_admin",
      name: "Nadia Admin",
      email: "admin@madasoatransit.local",
      passwordHash: passwordHashes.admin,
      role: "admin",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "user_operator",
      name: "Louis Operator",
      email: "operator@madasoatransit.local",
      passwordHash: passwordHashes.operator,
      role: "operator",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "user_finance",
      name: "Mia Finance",
      email: "finance@madasoatransit.local",
      passwordHash: passwordHashes.finance,
      role: "finance",
      createdAt,
      updatedAt: createdAt,
    },
  ];

  const customers: CustomerRecord[] = [
    {
      id: "customer_mana",
      name: "MadaSoa Trading",
      email: "ops@madasoatrading.local",
      phone: "+689 40 55 10 10",
      customerCode: "C1024",
      referencePrefix: "MST-2026",
      aliases: [
        {
          id: "alias_mana_receiver",
          customerId: "customer_mana",
          kind: "receiver_name",
          value: "EXP C1024",
          normalizedValue: "EXP C1024",
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: "alias_mana_phone",
          customerId: "customer_mana",
          kind: "receiver_phone",
          value: "13812341024",
          normalizedValue: "13812341024",
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: "alias_mana_marketplace_exp3166",
          customerId: "customer_mana",
          kind: "marketplace_alias",
          value: "EXP3166",
          normalizedValue: "EXP3166",
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: "alias_mana_marketplace_toky",
          customerId: "customer_mana",
          kind: "marketplace_alias",
          value: "3421LTOKY",
          normalizedValue: "3421LTOKY",
          createdAt,
          updatedAt: createdAt,
        },
      ],
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "customer_tiare",
      name: "Tiare Distribution",
      email: "contact@tiare-distribution.com",
      phone: "+689 40 22 11 33",
      customerCode: "C1058",
      referencePrefix: "TIARE-2026",
      aliases: [
        {
          id: "alias_tiare_receiver",
          customerId: "customer_tiare",
          kind: "receiver_name",
          value: "TIARE C1058",
          normalizedValue: "TIARE C1058",
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: "alias_tiare_phone",
          customerId: "customer_tiare",
          kind: "receiver_phone",
          value: "13977771058",
          normalizedValue: "13977771058",
          createdAt,
          updatedAt: createdAt,
        },
      ],
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "customer_blue",
      name: "Blue Pacific Retail",
      email: "hello@bluepacific.example",
      phone: "+689 40 89 61 40",
      customerCode: "C1107",
      referencePrefix: "BLUE-2026",
      aliases: [
        {
          id: "alias_blue_receiver",
          customerId: "customer_blue",
          kind: "receiver_name",
          value: "BLUE C1107",
          normalizedValue: "BLUE C1107",
          createdAt,
          updatedAt: createdAt,
        },
      ],
      createdAt,
      updatedAt: createdAt,
    },
  ];

  const shipments: ShipmentRecord[] = [
    {
      id: "shipment_1",
      trackingNumber: "ABCDEF123456789",
      chinaTrackingNumber: null,
      incomingParcelId: null,
      customerId: "customer_mana",
      customerReference: "MST-2026-041",
      transportType: "express",
      origin: "Shanghai",
      destination: "Papeete",
      carrier: "Oceanic Freight",
      currentStatus: "in_transit",
      paymentStatus: "unpaid",
      actualWeightKg: 18.4,
      volumetricWeightKg: 21.1,
      volumeCbm: 0.42,
      freightAmount: 16500,
      currency: "Ar",
      eta: nowOffset(6),
      notes: "Container cleared from origin port.",
      publicVisible: true,
      createdAt: nowOffset(-16),
      updatedAt: nowOffset(-2),
    },
    {
      id: "shipment_2",
      trackingNumber: "ZXCVBN987654321",
      chinaTrackingNumber: null,
      incomingParcelId: null,
      customerId: "customer_mana",
      customerReference: "MST-2026-041",
      transportType: "air",
      origin: "Shenzhen",
      destination: "Papeete",
      carrier: "Blue Horizon Cargo",
      currentStatus: "arrived",
      paymentStatus: "partial",
      actualWeightKg: 8.2,
      volumetricWeightKg: 10.5,
      volumeCbm: 0.18,
      freightAmount: 22800,
      currency: "Ar",
      eta: nowOffset(2),
      notes: "Awaiting customs release.",
      publicVisible: true,
      createdAt: nowOffset(-24),
      updatedAt: nowOffset(-1),
    },
    {
      id: "shipment_3",
      trackingNumber: "TIARE556677889",
      chinaTrackingNumber: null,
      incomingParcelId: null,
      customerId: "customer_tiare",
      customerReference: "TIARE-2026-009",
      transportType: "maritime",
      origin: "Guangzhou",
      destination: "Papeete",
      carrier: "Lagoon Air Cargo",
      currentStatus: "delivered",
      paymentStatus: "paid",
      actualWeightKg: 54.2,
      volumetricWeightKg: 54.2,
      volumeCbm: 1.86,
      freightAmount: 32500,
      currency: "Ar",
      eta: nowOffset(-8),
      notes: "Signed by customer.",
      publicVisible: true,
      createdAt: nowOffset(-31),
      updatedAt: nowOffset(-8),
    },
    {
      id: "shipment_4",
      trackingNumber: "BLUE4455667788",
      chinaTrackingNumber: null,
      incomingParcelId: null,
      customerId: "customer_blue",
      customerReference: "BLUE-2026-014",
      transportType: "air_batterie",
      origin: "Ningbo",
      destination: "Moorea",
      carrier: "Pacific Consolidators",
      currentStatus: "on_hold",
      paymentStatus: "unpaid",
      actualWeightKg: 3.4,
      volumetricWeightKg: 4.8,
      volumeCbm: 0.11,
      freightAmount: 19800,
      currency: "Ar",
      eta: nowOffset(11),
      notes: "Documentation mismatch under review.",
      publicVisible: false,
      createdAt: nowOffset(-10),
      updatedAt: nowOffset(-1),
    },
    {
      id: "shipment_5",
      trackingNumber: "MADA-20260401-0001",
      chinaTrackingNumber: "JD778899001122",
      incomingParcelId: "parcel_1",
      customerId: "customer_mana",
      customerReference: "MST-2026-042",
      transportType: "express",
      origin: "China Warehouse",
      destination: "Destination Hub",
      carrier: "JD Logistics",
      currentStatus: "received",
      paymentStatus: "unpaid",
      actualWeightKg: 2.8,
      volumetricWeightKg: 2.8,
      volumeCbm: 0.03,
      freightAmount: 0,
      currency: "Ar",
      eta: null,
      notes: "Parcel received through the intake workflow.",
      publicVisible: true,
      createdAt: nowOffset(-1),
      updatedAt: nowOffset(-1),
    },
  ];

  const incomingParcels: IncomingParcelRecord[] = [
    {
      id: "parcel_1",
      chinaTrackingNumber: "JD778899001122",
      scanValue: "JD778899001122",
      courierCompany: "JD Logistics",
      customerId: "customer_mana",
      status: "received",
      matchedBy: "customer_code",
      receiverNameRaw: "EXP C1024",
      receiverPhoneRaw: "13812341024",
      receiverAddressRaw: "Yiwu warehouse line 2",
      ocrText: "JD778899001122 EXP C1024 13812341024",
      declaredValue: 320,
      declaredCurrency: "CNY",
      actualWeightKg: 2.8,
      transportType: "express",
      notes: "Ready for shelf A1-03.",
      shelfLocation: "A1-03",
      warehouseReceivedAt: nowOffset(-1),
      createdAt: nowOffset(-1),
      updatedAt: nowOffset(-1),
      images: [
        {
          id: "parcel_1_image_1",
          parcelId: "parcel_1",
          dataUrl: placeholderImageDataUrl,
          fileName: "jd-778899001122-label.jpg",
          createdAt: nowOffset(-1),
        },
      ],
    },
    {
      id: "parcel_2",
      chinaTrackingNumber: "SF556677889900",
      scanValue: "SF556677889900",
      courierCompany: "SF Express",
      customerId: null,
      status: "unassigned",
      matchedBy: "unassigned",
      receiverNameRaw: "Chen 13800001111",
      receiverPhoneRaw: "13800001111",
      receiverAddressRaw: "Warehouse lane B",
      ocrText: "SF556677889900 Chen 13800001111",
      declaredValue: 180,
      declaredCurrency: "CNY",
      actualWeightKg: 1.5,
      transportType: "air",
      notes: "Waiting for manual assignment.",
      shelfLocation: "HOLD-02",
      warehouseReceivedAt: nowOffset(-2),
      createdAt: nowOffset(-2),
      updatedAt: nowOffset(-2),
      images: [
        {
          id: "parcel_2_image_1",
          parcelId: "parcel_2",
          dataUrl: placeholderImageDataUrl,
          fileName: "sf-556677889900-label.jpg",
          createdAt: nowOffset(-2),
        },
      ],
    },
  ];

  const shipmentEvents: ShipmentEventRecord[] = [
    {
      id: createId("event"),
      shipmentId: "shipment_1",
      status: "received",
      label: "Cargo received at origin warehouse",
      details: "The supplier handed over the cargo.",
      location: "Shanghai",
      occurredAt: nowOffset(-15),
      createdAt: nowOffset(-15),
    },
    {
      id: createId("event"),
      shipmentId: "shipment_1",
      status: "in_transit",
      label: "Container departed origin port",
      details: "Shipment left the port and is en route.",
      location: "Shanghai",
      occurredAt: nowOffset(-6),
      createdAt: nowOffset(-6),
    },
    {
      id: createId("event"),
      shipmentId: "shipment_2",
      status: "in_transit",
      label: "Air freight departed",
      details: "Cargo boarded the outbound flight.",
      location: "Shenzhen",
      occurredAt: nowOffset(-7),
      createdAt: nowOffset(-7),
    },
    {
      id: createId("event"),
      shipmentId: "shipment_2",
      status: "arrived",
      label: "Shipment arrived at destination hub",
      details: "Pending release and pickup planning.",
      location: "Papeete",
      occurredAt: nowOffset(-1),
      createdAt: nowOffset(-1),
    },
    {
      id: createId("event"),
      shipmentId: "shipment_3",
      status: "delivered",
      label: "Shipment delivered",
      details: "Signed by warehouse receiver.",
      location: "Papeete",
      occurredAt: nowOffset(-8),
      createdAt: nowOffset(-8),
    },
    {
      id: createId("event"),
      shipmentId: "shipment_4",
      status: "on_hold",
      label: "Shipment placed on hold",
      details: "Internal documentation review required.",
      location: "Moorea",
      occurredAt: nowOffset(-1),
      createdAt: nowOffset(-1),
    },
    {
      id: createId("event"),
      shipmentId: "shipment_5",
      status: "received",
      label: "Parcel received at warehouse",
      details: "Label scanned and matched to customer code C1024.",
      location: "China Warehouse",
      occurredAt: nowOffset(-1),
      createdAt: nowOffset(-1),
    },
  ];

  const importBatches: ImportBatchRecord[] = [
    {
      id: "batch_1",
      fileName: "march-outstanding.xlsx",
      createdCount: 1,
      updatedCount: 2,
      errorCount: 0,
      uploadedAt: nowOffset(-4),
      uploadedById: "user_operator",
    },
  ];

  const importRows: ImportRowRecord[] = [
    {
      id: createId("row"),
      batchId: "batch_1",
      shipmentId: "shipment_1",
      rowNumber: 2,
      trackingNumber: "ABCDEF123456789",
      status: "updated",
      message: "Shipment status refreshed.",
      rawData: { trackingNumber: "ABCDEF123456789" },
      createdAt: nowOffset(-4),
    },
    {
      id: createId("row"),
      batchId: "batch_1",
      shipmentId: "shipment_2",
      rowNumber: 3,
      trackingNumber: "ZXCVBN987654321",
      status: "updated",
      message: "ETA and payment status updated.",
      rawData: { trackingNumber: "ZXCVBN987654321" },
      createdAt: nowOffset(-4),
    },
  ];

  return {
    users,
    customers,
    shipments,
    incomingParcels,
    shipmentEvents,
    importBatches,
    importRows,
    auditLogs: [],
  };
}

let demoState = buildInitialState();

export function getDemoState() {
  return demoState;
}

export function resetDemoState() {
  demoState = buildInitialState();
}
