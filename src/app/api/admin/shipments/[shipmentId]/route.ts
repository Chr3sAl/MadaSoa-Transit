import { NextResponse } from "next/server";

import { requireApiSession } from "@/lib/auth";
import {
  ForbiddenShipmentFieldError,
  getAllowedRolesForAdminSection,
  sanitizeShipmentPatchForRole,
} from "@/lib/permissions";
import { updateShipment } from "@/lib/repository";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  const auth = await requireApiSession(getAllowedRolesForAdminSection("shipments"));
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const patch = sanitizeShipmentPatchForRole(auth.session.user.role, body);
    const { shipmentId } = await params;
    const shipment = await updateShipment(shipmentId, patch, auth.session.user.id);
    return NextResponse.json(shipment);
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to update shipment.",
      },
      { status: error instanceof ForbiddenShipmentFieldError ? 403 : 400 },
    );
  }
}
