import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireApiSession } from "@/lib/auth";
import { formatZodErrorMessage } from "@/lib/format-zod-error";
import { getRolesWithPermission } from "@/lib/permissions";
import { scanPreviewIncomingParcel } from "@/lib/repository";

export async function POST(request: Request) {
  const auth = await requireApiSession(getRolesWithPermission("canManageIntake"));
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const preview = await scanPreviewIncomingParcel(body);
    return NextResponse.json(preview);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof ZodError
            ? formatZodErrorMessage(error, "Unable to scan parcel data.")
            : error instanceof Error
              ? error.message
              : "Unable to scan parcel data.",
      },
      { status: error instanceof SyntaxError ? 400 : 422 },
    );
  }
}
