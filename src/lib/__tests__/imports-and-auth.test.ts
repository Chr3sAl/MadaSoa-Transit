import * as XLSX from "xlsx";

import { resetDemoState } from "@/lib/demo-data";
import { isRoleAllowed } from "@/lib/auth";
import { commitImport, listShipments, previewImport, validateUserCredentials } from "@/lib/repository";

describe("imports and auth", () => {
  beforeEach(() => {
    resetDemoState();
  });

  it("previews invalid spreadsheet rows", async () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet([
      {
        trackingNumber: "VALID12345",
        customerReference: "MST-REF-1",
        customerName: "MadaSoa Trading",
        origin: "Shanghai",
        destination: "Papeete",
        currentStatus: "in_transit",
        paymentStatus: "unpaid",
      },
      {
        trackingNumber: "",
        customerReference: "BROKEN-1",
        customerName: "",
        origin: "Shanghai",
        destination: "Papeete",
        currentStatus: "nope",
        paymentStatus: "wrong",
      },
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
    const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    const preview = await previewImport("sample.xlsx", new Uint8Array(bytes));
    expect(preview.validRows).toHaveLength(1);
    expect(preview.invalidRows).toHaveLength(1);
  });

  it("rejects unsupported import files before parsing", async () => {
    await expect(previewImport("sample.txt", new Uint8Array([1, 2, 3]))).rejects.toThrow(
      "Only CSV and XLSX files are supported.",
    );
  });

  it("creates and updates shipments from import rows", async () => {
    const firstCommit = await commitImport(
      "batch-1.xlsx",
      [
        {
          rowNumber: 2,
          trackingNumber: "NEWSHIP123",
          customerReference: "MST-NEW-1",
          customerName: "MadaSoa Trading",
          origin: "Shanghai",
          destination: "Papeete",
          currentStatus: "received",
          paymentStatus: "unpaid",
          carrier: "Oceanic",
          eta: "2026-04-10",
          notes: "Initial row",
        },
      ],
      "user_operator",
    );

    expect(firstCommit.batch.createdCount).toBe(1);

    const secondCommit = await commitImport(
      "batch-2.xlsx",
      [
        {
          rowNumber: 2,
          trackingNumber: "NEWSHIP123",
          customerReference: "MST-NEW-1",
          customerName: "MadaSoa Trading",
          origin: "Shanghai",
          destination: "Papeete",
          currentStatus: "arrived",
          paymentStatus: "partial",
          carrier: "Oceanic",
          eta: "2026-04-12",
          notes: "Updated row",
        },
      ],
      "user_operator",
    );

    expect(secondCommit.batch.updatedCount).toBe(1);
    const shipments = await listShipments();
    const shipment = shipments.find((item) => item.trackingNumber === "NEWSHIP123");
    expect(shipment?.currentStatus).toBe("arrived");
    expect(shipment?.paymentStatus).toBe("partial");
  });

  it("validates demo credentials and role checks", async () => {
    const user = await validateUserCredentials("admin@madasoatransit.local", "Admin123!");

    expect(user?.role).toBe("admin");
    expect(isRoleAllowed("operator", ["admin"])).toBe(false);
    expect(isRoleAllowed("finance", ["admin", "finance"])).toBe(true);
  });
});
