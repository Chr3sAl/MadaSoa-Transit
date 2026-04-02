import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiSession } from "@/lib/auth";
import { getRolesWithPermission } from "@/lib/permissions";
import { commitImport } from "@/lib/repository";
import { importRowSchema } from "@/lib/validators";

const commitSchema = z.object({
  fileName: z.string().min(1),
  rows: z.array(importRowSchema.extend({ rowNumber: z.number().int().positive() })).min(1),
});

export async function POST(request: Request) {
  const auth = await requireApiSession(getRolesWithPermission("canImport"));
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const parsed = commitSchema.parse(body);
    const result = await commitImport(parsed.fileName, parsed.rows, auth.session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to commit import.",
      },
      { status: 400 },
    );
  }
}
