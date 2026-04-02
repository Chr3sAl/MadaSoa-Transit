import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireApiSession } from "@/lib/auth";
import { formatZodErrorMessage } from "@/lib/format-zod-error";
import { getAllowedRolesForAdminSection, getRolesWithPermission } from "@/lib/permissions";
import { createIncomingParcel, listIncomingParcels } from "@/lib/repository";

export async function GET() {
  const auth = await requireApiSession(getAllowedRolesForAdminSection("intake"));
  if ("error" in auth) return auth.error;

  const parcels = await listIncomingParcels();
  return NextResponse.json(parcels);
}

export async function POST(request: Request) {
  const auth = await requireApiSession(getRolesWithPermission("canManageIntake"));
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const parcel = await createIncomingParcel(body, auth.session.user.id);
    return NextResponse.json(parcel, { status: 201 });
  } catch (error) {
    const message =
      error instanceof ZodError
        ? formatZodErrorMessage(error, "Unable to save parcel intake.")
        : error instanceof Error
          ? error.message
          : "Unable to save parcel intake.";
    const status = message.includes("already exists") ? 409 : 400;
    return NextResponse.json({ message }, { status });
  }
}
