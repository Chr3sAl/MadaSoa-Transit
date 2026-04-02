import {
  ForbiddenShipmentFieldError,
  canAccessAdminSection,
  getAllowedRolesForAdminSection,
  getRolePermissions,
  sanitizeShipmentCreateForRole,
  sanitizeShipmentPatchForRole,
} from "@/lib/permissions";

describe("role permissions", () => {
  it("exposes the strict navigation split", () => {
    expect(canAccessAdminSection("admin", "users")).toBe(true);
    expect(canAccessAdminSection("operator", "intake")).toBe(true);
    expect(canAccessAdminSection("operator", "users")).toBe(false);
    expect(canAccessAdminSection("finance", "imports")).toBe(false);
    expect(canAccessAdminSection("finance", "intake")).toBe(false);
    expect(canAccessAdminSection("finance", "reports")).toBe(true);
    expect(getAllowedRolesForAdminSection("imports")).toEqual(["admin", "operator"]);
  });

  it("gives each role the expected shipment capabilities", () => {
    expect(getRolePermissions("admin").canCreateShipments).toBe(true);
    expect(getRolePermissions("operator").canCreateShipments).toBe(true);
    expect(getRolePermissions("finance").canCreateShipments).toBe(false);
  });

  it("rejects finance attempts to update operational shipment fields", () => {
    expect(() =>
      sanitizeShipmentPatchForRole("finance", {
        currentStatus: "arrived",
        publicVisible: false,
      }),
    ).toThrow(ForbiddenShipmentFieldError);
  });

  it("rejects operator attempts to update finance-owned shipment fields", () => {
    expect(() =>
      sanitizeShipmentPatchForRole("operator", {
        paymentStatus: "paid",
        freightAmount: 16500,
      }),
    ).toThrow(ForbiddenShipmentFieldError);
  });

  it("accepts finance-owned shipment fields for finance users", () => {
    expect(
      sanitizeShipmentPatchForRole("finance", {
        paymentStatus: "partial",
        freightAmount: 22800,
        currency: "Ar",
      }),
    ).toEqual({
      paymentStatus: "partial",
      freightAmount: 22800,
      currency: "Ar",
    });
  });

  it("accepts operational shipment fields for operator users", () => {
    expect(
      sanitizeShipmentPatchForRole("operator", {
        customerReference: "MST-2026-041",
        transportType: "express",
        currentStatus: "in_transit",
        publicVisible: true,
      }),
    ).toEqual({
      customerReference: "MST-2026-041",
      transportType: "express",
      currentStatus: "in_transit",
      publicVisible: true,
    });
  });

  it("rejects operator attempts to create shipments with finance-owned fields", () => {
    expect(() =>
      sanitizeShipmentCreateForRole("operator", {
        trackingNumber: "MST-2026-050",
        customerId: "customer_1",
        customerReference: "MST-2026-050",
        transportType: "express",
        origin: "Shanghai",
        destination: "Antananarivo",
        currentStatus: "received",
        paymentStatus: "paid",
        freightAmount: 56000,
        currency: "Ar",
      }),
    ).toThrow(ForbiddenShipmentFieldError);
  });

  it("defaults finance-owned create fields for operator-created shipments", () => {
    expect(
      sanitizeShipmentCreateForRole("operator", {
        trackingNumber: "MST-2026-051",
        customerId: "customer_1",
        customerReference: "MST-2026-051",
        transportType: "express",
        origin: "Shanghai",
        destination: "Antananarivo",
        currentStatus: "received",
      }),
    ).toEqual({
      trackingNumber: "MST-2026-051",
      customerId: "customer_1",
      customerReference: "MST-2026-051",
      transportType: "express",
      origin: "Shanghai",
      destination: "Antananarivo",
      currentStatus: "received",
      paymentStatus: "unpaid",
      freightAmount: 0,
      currency: "Ar",
    });
  });
});
