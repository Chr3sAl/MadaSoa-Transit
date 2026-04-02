import { resetDemoState } from "@/lib/demo-data";
import {
  assignIncomingParcel,
  createCustomer,
  createIncomingParcel,
  listIncomingParcels,
  listShipments,
  scanPreviewIncomingParcel,
} from "@/lib/repository";

const sampleImage = {
  dataUrl: "data:image/gif;base64,R0lGODlhAQABAPAAAMzMzAAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==",
  fileName: "label.jpg",
};

describe("warehouse intake", () => {
  beforeEach(() => {
    resetDemoState();
  });

  it("prefers customer code matches from scanner-readable payloads", async () => {
    const preview = await scanPreviewIncomingParcel({
      scanValue: "https://mini.yimidida.com/scan?waybillNo=112731802198&customerCode=C1024",
      scanFormat: "qr_code",
    });

    expect(preview.resolvedCustomerId).toBe("customer_mana");
    expect(preview.resolvedBy).toBe("customer_code");
    expect(preview.matches[0]?.customer.customerCode).toBe("C1024");
  });

  it("returns tracking immediately from a barcode-only scan", async () => {
    const preview = await scanPreviewIncomingParcel({
      scanValue: "JD123456789000",
      scanFormat: "code_128",
    });

    expect(preview.scanType).toBe("barcode");
    expect(preview.rawScanValue).toBe("JD123456789000");
    expect(preview.scanValue).toBe("JD123456789000");
    expect(preview.chinaTrackingNumber).toBe("JD123456789000");
    expect(preview.trackingSource).toBe("barcode");
    expect(preview.trackingConfidence).toBe("strong");
  });

  it("does not treat short route codes as China tracking numbers", async () => {
    const preview = await scanPreviewIncomingParcel({
      scanValue: "U7040099",
      scanFormat: "code_128",
    });

    expect(preview.scanType).toBe("barcode");
    expect(preview.scanValue).toBe("U7040099");
    expect(preview.chinaTrackingNumber).toBe("");
    expect(preview.trackingSource).toBeNull();
    expect(preview.trackingCandidates[0]?.value).toBe("U7040099");
    expect(preview.trackingCandidates[0]?.kind).toBe("route_code");
  });

  it("extracts tracking and customer code from a QR payload URL", async () => {
    const preview = await scanPreviewIncomingParcel({
      scanValue: "https://mini.yimidida.com/scan?waybillNo=112731802198&customerCode=C1024",
      scanFormat: "qr_code",
    });

    expect(preview.scanType).toBe("qr");
    expect(preview.chinaTrackingNumber).toBe("112731802198");
    expect(preview.courierCompany).toBe("Yimidida");
    expect(preview.detectedCustomerCode).toBe("C1024");
    expect(preview.resolvedCustomerId).toBe("customer_mana");
    expect(preview.decodedPayload?.waybillNo).toBe("112731802198");
  });

  it("matches by receiver phone when scan payload text includes a phone number", async () => {
    const preview = await scanPreviewIncomingParcel({
      scanValue: "Receiver 13977771058",
    });

    expect(preview.resolvedCustomerId).toBe("customer_tiare");
    expect(preview.resolvedBy).toBe("receiver_phone");
  });

  it("creates an incoming parcel and linked shipment when a customer is selected", async () => {
    const parcel = await createIncomingParcel(
      {
        scanValue: "ZTO445566778800",
        chinaTrackingNumber: "ZTO445566778800",
        courierCompany: "ZTO",
        customerId: "customer_mana",
        matchedBy: "customer_code",
        declaredValue: 240,
        declaredCurrency: "CNY",
        actualWeightKg: 3.2,
        transportType: "express",
        images: [sampleImage],
      },
      "user_admin",
    );

    const shipments = await listShipments();
    const createdShipment = shipments.find((shipment) => shipment.incomingParcelId === parcel.id);

    expect(parcel.status).toBe("received");
    expect(parcel.customer?.id).toBe("customer_mana");
    expect(createdShipment?.chinaTrackingNumber).toBe("ZTO445566778800");
    expect(createdShipment?.trackingNumber).toMatch(/^MADA-\d{8}-\d{4}$/);
  });

  it("saves unmatched parcels to the unassigned queue without creating a customer", async () => {
    const parcel = await createIncomingParcel(
      {
        scanValue: "UNMATCHED000111",
        chinaTrackingNumber: "UNMATCHED000111",
        courierCompany: "SF Express",
        declaredValue: 120,
        declaredCurrency: "CNY",
        actualWeightKg: 1.1,
        transportType: "air",
        receiverNameRaw: "Unknown buyer",
        images: [sampleImage],
      },
      "user_operator",
    );

    const parcels = await listIncomingParcels();
    const shipments = await listShipments();

    expect(parcel.status).toBe("unassigned");
    expect(parcel.customer).toBeNull();
    expect(parcels.find((candidate) => candidate.id === parcel.id)?.status).toBe("unassigned");
    expect(shipments.some((shipment) => shipment.incomingParcelId === parcel.id)).toBe(false);
  });

  it("creates a shipment when an unassigned parcel is assigned later", async () => {
    const parcel = await createIncomingParcel(
      {
        scanValue: "LATERASSIGN001",
        chinaTrackingNumber: "LATERASSIGN001",
        courierCompany: "YTO",
        declaredValue: 80,
        declaredCurrency: "CNY",
        actualWeightKg: 0.9,
        transportType: "air",
        images: [sampleImage],
      },
      "user_operator",
    );

    const assigned = await assignIncomingParcel(
      parcel.id,
      {
        customerId: "customer_blue",
        matchedBy: "manual_assignment",
      },
      "user_admin",
    );

    expect(assigned.status).toBe("received");
    expect(assigned.customer?.id).toBe("customer_blue");
    expect(assigned.shipment?.trackingNumber).toMatch(/^MADA-\d{8}-\d{4}$/);
  });

  it("supports quick customer creation and scanner-first intake without photos", async () => {
    const customer = await createCustomer(
      {
        name: "SEA buyer",
        phone: "18578711713",
      },
      "user_operator",
    );

    expect(customer.customerCode).toMatch(/^C\d{4}$/);
    expect(customer.phone).toBe("18578711713");

    const parcel = await createIncomingParcel(
      {
        scanValue: "YT7575143069923",
        chinaTrackingNumber: "YT7575143069923",
        courierCompany: "YTO",
        customerId: customer.id,
        matchedBy: "quick_create",
        declaredValue: 22,
        declaredCurrency: "CNY",
        actualWeightKg: 0.4,
        transportType: "express",
        images: [],
      },
      "user_operator",
    );

    expect(parcel.customer?.id).toBe(customer.id);
    expect(parcel.status).toBe("received");
    expect(parcel.shipment?.trackingNumber).toMatch(/^MADA-\d{8}-\d{4}$/);
    expect(parcel.images).toHaveLength(0);
  });

  it("rejects duplicate China tracking numbers", async () => {
    await expect(
      createIncomingParcel(
        {
          scanValue: "JD778899001122",
          chinaTrackingNumber: "JD778899001122",
          courierCompany: "JD Logistics",
          customerId: "customer_mana",
          declaredValue: 90,
          declaredCurrency: "CNY",
          actualWeightKg: 1.2,
          transportType: "express",
          images: [sampleImage],
        },
        "user_admin",
      ),
    ).rejects.toThrow("China tracking number already exists.");
  });
});
