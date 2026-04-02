import { resetDemoState } from "@/lib/demo-data";
import { lookupPublic } from "@/lib/repository";

describe("public lookup", () => {
  beforeEach(() => {
    resetDemoState();
  });

  it("returns a shipment for a public tracking number", async () => {
    const result = await lookupPublic("tracking", "jd778899001122");

    expect(result.mode).toBe("tracking");
    expect(result.shipment?.chinaTrackingNumber).toBe("JD778899001122");
    expect(result.shipment?.trackingNumber).toBe("MADA-20260401-0001");
    expect(result.shipment?.events.length).toBeGreaterThan(0);
  });

  it("falls back to the internal tracking number when needed", async () => {
    const result = await lookupPublic("tracking", "mada-20260401-0001");

    expect(result.mode).toBe("tracking");
    expect(result.shipment?.trackingNumber).toBe("MADA-20260401-0001");
    expect(result.shipment?.chinaTrackingNumber).toBe("JD778899001122");
  });

  it("excludes hidden shipments from tracking search", async () => {
    const result = await lookupPublic("tracking", "BLUE4455667788");
    expect(result.shipment).toBeNull();
  });

  it("returns only non-paid shipments for client reference search", async () => {
    const result = await lookupPublic("reference", "MST-2026-041");

    expect(result.mode).toBe("reference");
    expect(result.shipments).toHaveLength(2);
    expect(result.shipments.every((shipment) => shipment.paymentStatus !== "paid")).toBe(true);
  });

  it("filters client reference results by transport type when provided", async () => {
    const result = await lookupPublic("reference", "MST-2026-041", "air");

    expect(result.mode).toBe("reference");
    expect(result.shipments).toHaveLength(1);
    expect(result.shipments[0]?.transportType).toBe("air");
  });
});
