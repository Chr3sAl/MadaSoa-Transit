import { NextResponse } from "next/server";

import { requireApiSession } from "@/lib/auth";
import { getReportSummary } from "@/lib/repository";

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;

  const summary = await getReportSummary();
  return NextResponse.json(summary);
}
