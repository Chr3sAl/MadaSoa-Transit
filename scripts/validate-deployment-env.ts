import {
  getAppBaseUrl,
  getAuthSecret,
  hasDatabaseUrl,
  isDemoModeExplicitlyEnabled,
} from "../src/lib/runtime";

function shouldValidateDeploymentEnvironment() {
  return Boolean(
    process.env.VERCEL ||
      process.env.RAILWAY_PROJECT_ID ||
      process.env.RAILWAY_ENVIRONMENT_ID ||
      process.env.RAILWAY_ENVIRONMENT_NAME,
  );
}

function main() {
  if (!shouldValidateDeploymentEnvironment()) {
    return;
  }

  const errors: string[] = [];

  try {
    getAuthSecret();
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "NEXTAUTH_SECRET is required.");
  }

  try {
    getAppBaseUrl({ allowLocalhostFallback: false });
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "A public application URL is required.");
  }

  if (!hasDatabaseUrl() && !isDemoModeExplicitlyEnabled()) {
    errors.push(
      "Set DATABASE_URL for real deployments, or set DEMO_MODE=true explicitly for a demo-only deployment.",
    );
  }

  if (errors.length > 0) {
    console.error("Deployment environment validation failed:");

    for (const error of errors) {
      console.error(`- ${error}`);
    }

    process.exit(1);
  }
}

main();
