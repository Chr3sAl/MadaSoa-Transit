const DEVELOPMENT_AUTH_SECRET = "development-secret-for-madasoa-transit";
const SUPPORTED_IMPORT_EXTENSIONS = [".csv", ".xlsx"] as const;
const PLACEHOLDER_DATABASE_URL =
  "postgresql://placeholder:placeholder@localhost:5432/madasoa_placeholder?schema=public";

export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

export function isDemoModeExplicitlyEnabled() {
  return process.env.DEMO_MODE === "true";
}

export function isDemoModeEnabled() {
  if (isDemoModeExplicitlyEnabled()) {
    return true;
  }

  if (hasDatabaseUrl()) {
    return false;
  }

  return !isProductionRuntime();
}

export function getAuthSecret() {
  const configuredSecret = process.env.NEXTAUTH_SECRET?.trim();

  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXTAUTH_SECRET must be configured in production.");
  }

  return DEVELOPMENT_AUTH_SECRET;
}

function normalizePublicUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
}

export function getAppBaseUrl(options?: { allowLocalhostFallback?: boolean }) {
  const configuredUrl = process.env.NEXTAUTH_URL?.trim();

  if (configuredUrl) {
    return normalizePublicUrl(configuredUrl);
  }

  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();

  if (vercelUrl) {
    return normalizePublicUrl(vercelUrl);
  }

  const railwayUrl =
    process.env.RAILWAY_PUBLIC_DOMAIN?.trim() || process.env.RAILWAY_STATIC_URL?.trim();

  if (railwayUrl) {
    return normalizePublicUrl(railwayUrl);
  }

  if (options?.allowLocalhostFallback ?? !isProductionRuntime()) {
    return "http://localhost:3000";
  }

  throw new Error(
    "Set NEXTAUTH_URL for production deployments, or rely on VERCEL_URL / RAILWAY_PUBLIC_DOMAIN.",
  );
}

export function getDatabaseUrl(options?: { allowPlaceholder?: boolean }) {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl) {
    return databaseUrl;
  }

  if (options?.allowPlaceholder) {
    return PLACEHOLDER_DATABASE_URL;
  }

  throw new Error("DATABASE_URL must be configured before Prisma can connect.");
}

export function validateImportUpload(fileName: string, byteLength: number) {
  const normalizedFileName = fileName.trim().toLowerCase();
  const isSupportedFile = SUPPORTED_IMPORT_EXTENSIONS.some((extension) =>
    normalizedFileName.endsWith(extension),
  );

  if (!isSupportedFile) {
    throw new Error("Only CSV and XLSX files are supported.");
  }

  if (byteLength <= 0) {
    throw new Error("The uploaded file is empty.");
  }

  if (byteLength > MAX_IMPORT_FILE_BYTES) {
    throw new Error("The uploaded file exceeds the 5 MB limit.");
  }
}
