import {
  MAX_IMPORT_FILE_BYTES,
  getAppBaseUrl,
  getAuthSecret,
  getDatabaseUrl,
  isDemoModeEnabled,
  validateImportUpload,
} from "@/lib/runtime";

const ORIGINAL_ENV = {
  DATABASE_URL: process.env.DATABASE_URL,
  DEMO_MODE: process.env.DEMO_MODE,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  VERCEL_URL: process.env.VERCEL_URL,
  RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN,
  RAILWAY_STATIC_URL: process.env.RAILWAY_STATIC_URL,
};

describe("runtime helpers", () => {
  afterEach(() => {
    process.env.DATABASE_URL = ORIGINAL_ENV.DATABASE_URL;
    process.env.DEMO_MODE = ORIGINAL_ENV.DEMO_MODE;
    process.env.NEXTAUTH_SECRET = ORIGINAL_ENV.NEXTAUTH_SECRET;
    process.env.NEXTAUTH_URL = ORIGINAL_ENV.NEXTAUTH_URL;
    process.env.NODE_ENV = ORIGINAL_ENV.NODE_ENV;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = ORIGINAL_ENV.VERCEL_PROJECT_PRODUCTION_URL;
    process.env.VERCEL_URL = ORIGINAL_ENV.VERCEL_URL;
    process.env.RAILWAY_PUBLIC_DOMAIN = ORIGINAL_ENV.RAILWAY_PUBLIC_DOMAIN;
    process.env.RAILWAY_STATIC_URL = ORIGINAL_ENV.RAILWAY_STATIC_URL;
  });

  it("uses the development fallback secret outside production", () => {
    delete process.env.NEXTAUTH_SECRET;
    process.env.NODE_ENV = "development";

    expect(getAuthSecret()).toBe("development-secret-for-madasoa-transit");
  });

  it("requires NEXTAUTH_SECRET in production", () => {
    delete process.env.NEXTAUTH_SECRET;
    process.env.NODE_ENV = "production";

    expect(() => getAuthSecret()).toThrow("NEXTAUTH_SECRET must be configured in production.");
  });

  it("detects when demo mode should be enabled", () => {
    delete process.env.DATABASE_URL;
    process.env.DEMO_MODE = "false";
    process.env.NODE_ENV = "development";
    expect(isDemoModeEnabled()).toBe(true);

    process.env.DATABASE_URL = "postgresql://demo";
    process.env.DEMO_MODE = "false";
    expect(isDemoModeEnabled()).toBe(false);

    delete process.env.DATABASE_URL;
    process.env.NODE_ENV = "production";
    expect(isDemoModeEnabled()).toBe(false);

    process.env.DEMO_MODE = "true";
    expect(isDemoModeEnabled()).toBe(true);
  });

  it("resolves the application base URL from deployment variables", () => {
    delete process.env.NEXTAUTH_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    process.env.VERCEL_URL = "madasoa.vercel.app";
    expect(getAppBaseUrl({ allowLocalhostFallback: false })).toBe("https://madasoa.vercel.app");

    delete process.env.VERCEL_URL;
    process.env.RAILWAY_PUBLIC_DOMAIN = "madasoa.up.railway.app";
    expect(getAppBaseUrl({ allowLocalhostFallback: false })).toBe(
      "https://madasoa.up.railway.app",
    );
  });

  it("returns a placeholder database URL for build tooling when requested", () => {
    delete process.env.DATABASE_URL;
    expect(getDatabaseUrl({ allowPlaceholder: true })).toContain("madasoa_placeholder");
    expect(() => getDatabaseUrl()).toThrow("DATABASE_URL must be configured before Prisma can connect.");
  });

  it("validates import upload names and sizes", () => {
    expect(() => validateImportUpload("sample.csv", 128)).not.toThrow();
    expect(() => validateImportUpload("sample.txt", 128)).toThrow(
      "Only CSV and XLSX files are supported.",
    );
    expect(() => validateImportUpload("sample.csv", 0)).toThrow("The uploaded file is empty.");
    expect(() => validateImportUpload("sample.xlsx", MAX_IMPORT_FILE_BYTES + 1)).toThrow(
      "The uploaded file exceeds the 5 MB limit.",
    );
  });
});
