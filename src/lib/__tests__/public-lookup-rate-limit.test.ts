import {
  getPublicLookupClientIdentifier,
  resetPublicLookupRateLimit,
  takePublicLookupRateLimit,
} from "@/lib/public-lookup-rate-limit";

describe("public lookup rate limit", () => {
  beforeEach(() => {
    resetPublicLookupRateLimit();
  });

  it("uses forwarded headers to identify the client", () => {
    const request = new Request("http://localhost/api/public/lookup", {
      headers: {
        "x-forwarded-for": "198.51.100.7, 10.0.0.1",
      },
    });

    expect(getPublicLookupClientIdentifier(request)).toBe("198.51.100.7");
  });

  it("limits repeated requests within the same time window", async () => {
    const identifier = "198.51.100.7";
    const now = 1_000;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      await expect(takePublicLookupRateLimit(identifier, now)).resolves.toMatchObject({
        limited: false,
      });
    }

    await expect(takePublicLookupRateLimit(identifier, now)).resolves.toMatchObject({
      limited: true,
    });
  });
});
