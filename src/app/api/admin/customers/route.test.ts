import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetDemoState } from "@/lib/demo-data";

const { requireApiSessionMock } = vi.hoisted(() => ({
  requireApiSessionMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireApiSession: requireApiSessionMock,
}));

import { POST } from "@/app/api/admin/customers/route";

describe("admin customer routes", () => {
  beforeEach(() => {
    resetDemoState();
    requireApiSessionMock.mockResolvedValue({
      session: {
        user: {
          id: "user_operator",
          role: "operator",
        },
      },
    });
  });

  it("creates a minimal customer for intake quick-create", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "SEA buyer",
          phone: "18578711713",
          receiverPhones: ["18578711713"],
          marketplaceAliases: ["IE-3421LTOKY"],
        }),
      }),
    );

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.name).toBe("SEA buyer");
    expect(payload.phone).toBe("18578711713");
    expect(payload.customerCode).toMatch(/^C\d{4}$/);
    expect(payload.aliases.some((alias: { value: string }) => alias.value === "IE-3421LTOKY")).toBe(true);
  });
});
