import { spawnSync } from "node:child_process";
import path from "node:path";

import {
  getAppBaseUrl,
  getAuthSecret,
  hasDatabaseUrl,
  isDemoModeExplicitlyEnabled,
} from "../src/lib/runtime";

const PRISMA_BINARY = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "prisma.cmd" : "prisma",
);

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function validateDeploymentEnvironment() {
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

function main() {
  validateDeploymentEnvironment();

  if (!hasDatabaseUrl()) {
    if (isDemoModeExplicitlyEnabled()) {
      console.log("Skipping Prisma migrations because DEMO_MODE=true and DATABASE_URL is not set.");
      return;
    }

    console.error("Skipping deploy preparation because DATABASE_URL is missing.");
    process.exit(1);
  }

  console.log("Applying Prisma migrations with prisma migrate deploy...");
  run(PRISMA_BINARY, ["migrate", "deploy"]);
}

main();
