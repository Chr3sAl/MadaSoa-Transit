import { NextResponse } from "next/server";

import { requireApiSession } from "@/lib/auth";
import { getRolesWithPermission } from "@/lib/permissions";
import { assignIncomingParcel } from "@/lib/repository";

export async function POST(
  request: Request,
  context: { params: Promise<{ parcelId: string }> },
) {
  const auth = await requireApiSession(getRolesWithPermission("canManageIntake"));
  if ("error" in auth) return auth.error;

  try {
    const { parcelId } = await context.params;
    const body = await request.json();
    const parcel = await assignIncomingParcel(parcelId, body, auth.session.user.id);
    return NextResponse.json(parcel);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to assign parcel.";
    const status =
      message.includes("not found")
        ? 404
        : message.includes("already has a shipment")
          ? 409
          : 400;

    return NextResponse.json({ message }, { status });
  }
}
