import { PrismaPg } from "@prisma/adapter-pg";
import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

import { getDatabaseUrl } from "@/lib/runtime";

loadEnvConfig(process.cwd());

const PRISMA_CLIENT_SCHEMA_VERSION = "2026-03-31-transport-type-refresh";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaVersion?: string;
};

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg(getDatabaseUrl()),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function getClient() {
  const needsRefresh =
    !globalForPrisma.prisma ||
    globalForPrisma.prismaSchemaVersion !== PRISMA_CLIENT_SCHEMA_VERSION;

  if (needsRefresh) {
    if (globalForPrisma.prisma) {
      void globalForPrisma.prisma.$disconnect().catch(() => undefined);
    }

    globalForPrisma.prisma = createPrismaClient();
    globalForPrisma.prismaSchemaVersion = PRISMA_CLIENT_SCHEMA_VERSION;
  }

  return globalForPrisma.prisma as PrismaClient;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    return Reflect.get(getClient(), property, receiver);
  },
});
