import { resetPublicLookupRateLimit } from "@/lib/public-lookup-rate-limit";
import { POST } from "@/app/api/public/lookup/route";

describe("public lookup route", () => {
  beforeEach(() => {
    resetPublicLookupRateLimit();
  });

  it("returns a 400 response for malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/public/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ message: "Invalid request body." });
  });

  it("returns 429 after repeated requests from the same client", async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const okResponse = await POST(
        new Request("http://localhost/api/public/lookup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": "203.0.113.10",
          },
          body: JSON.stringify({
            mode: "tracking",
            value: "ABCDEF123456789",
            locale: "fr",
          }),
        }),
      );

      expect(okResponse.status).toBe(200);
    }

    const limitedResponse = await POST(
      new Request("http://localhost/api/public/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "203.0.113.10",
        },
        body: JSON.stringify({
          mode: "tracking",
          value: "ABCDEF123456789",
          locale: "fr",
        }),
      }),
    );

    expect(limitedResponse.status).toBe(429);
    expect(limitedResponse.headers.get("Retry-After")).toBeTruthy();
    await expect(limitedResponse.json()).resolves.toEqual({
      message: "Too many lookup attempts. Please wait a minute and try again.",
    });
  });
});
