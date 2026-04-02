import { NextResponse } from "next/server";

import { hasDatabaseUrl, isDemoModeEnabled } from "@/lib/runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    demoMode: isDemoModeEnabled(),
    databaseConfigured: hasDatabaseUrl(),
  });
}
