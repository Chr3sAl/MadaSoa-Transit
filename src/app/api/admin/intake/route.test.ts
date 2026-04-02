import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetDemoState } from "@/lib/demo-data";
import { listShipments } from "@/lib/repository";

const { requireApiSessionMock } = vi.hoisted(() => ({
  requireApiSessionMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireApiSession: requireApiSessionMock,
}));

import { POST as assignPOST } from "@/app/api/admin/intake/[parcelId]/assign/route";
import { POST as scanPreviewPOST } from "@/app/api/admin/intake/scan-preview/route";
import { POST as createPOST } from "@/app/api/admin/intake/route";

const samplePayload = {
  scanValue: "APIINTAKE001",
  chinaTrackingNumber: "APIINTAKE001",
  courierCompany: "JD Logistics",
  declaredValue: 140,
  declaredCurrency: "CNY",
  actualWeightKg: 2.4,
  transportType: "express",
  images: [
    {
      dataUrl: "data:image/gif;base64,R0lGODlhAQABAPAAAMzMzAAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==",
      fileName: "api-label.jpg",
    },
  ],
};

describe("admin intake routes", () => {
  beforeEach(() => {
    resetDemoState();
    requireApiSessionMock.mockResolvedValue({
      session: {
        user: {
          id: "user_admin",
          role: "admin",
        },
      },
    });
  });

  it("creates intake records through the API", async () => {
    const response = await createPOST(
      new Request("http://localhost/api/admin/intake", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...samplePayload,
          customerId: "customer_mana",
          matchedBy: "customer_code",
        }),
      }),
    );

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.status).toBe("received");
    expect(payload.shipment?.trackingNumber).toMatch(/^MADA-\d{8}-\d{4}$/);

    const shipments = await listShipments();
    expect(shipments.some((shipment) => shipment.incomingParcelId === payload.id)).toBe(true);
  });

  it("returns fast scan metadata through the scan-preview API", async () => {
    const response = await scanPreviewPOST(
      new Request("http://localhost/api/admin/intake/scan-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scanValue: "https://mini.yimidida.com/scan?waybillNo=112731802198&customerCode=C1024",
          scanFormat: "qr_code",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.scanType).toBe("qr");
    expect(payload.chinaTrackingNumber).toBe("112731802198");
    expect(payload.detectedCustomerCode).toBe("C1024");
    expect(payload.resolvedCustomerId).toBe("customer_mana");
  });

  it("assigns an unassigned parcel through the API", async () => {
    const createdResponse = await createPOST(
      new Request("http://localhost/api/admin/intake", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(samplePayload),
      }),
    );
    const createdPayload = await createdResponse.json();

    const assignResponse = await assignPOST(
      new Request(`http://localhost/api/admin/intake/${createdPayload.id}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: "customer_blue",
          matchedBy: "manual_assignment",
        }),
      }),
      {
        params: Promise.resolve({
          parcelId: createdPayload.id,
        }),
      },
    );

    expect(assignResponse.status).toBe(200);
    const payload = await assignResponse.json();
    expect(payload.status).toBe("received");
    expect(payload.customer?.id).toBe("customer_blue");
    expect(payload.shipment?.trackingNumber).toMatch(/^MADA-\d{8}-\d{4}$/);
  });
});
