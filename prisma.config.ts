import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

import { getDatabaseUrl } from "./src/lib/runtime";

loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "npm run db:seed",
  },
  datasource: {
    url: getDatabaseUrl({ allowPlaceholder: true }),
  },
});
