import { NextResponse } from "next/server";

import { requireApiSession } from "@/lib/auth";
import {
  ForbiddenShipmentFieldError,
  getAllowedRolesForAdminSection,
  getRolesWithPermission,
  sanitizeShipmentCreateForRole,
} from "@/lib/permissions";
import { createShipment, listShipments } from "@/lib/repository";

export async function GET() {
  const auth = await requireApiSession(getAllowedRolesForAdminSection("shipments"));
  if ("error" in auth) return auth.error;

  const shipments = await listShipments();
  return NextResponse.json(shipments);
}

export async function POST(request: Request) {
  const auth = await requireApiSession(getRolesWithPermission("canCreateShipments"));
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const input = sanitizeShipmentCreateForRole(auth.session.user.role, body);
    const shipment = await createShipment(input, auth.session.user.id);
    return NextResponse.json(shipment, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to create shipment.",
      },
      { status: error instanceof ForbiddenShipmentFieldError ? 403 : 400 },
    );
  }
}
