import { NextResponse } from "next/server";

import { requireApiSession } from "@/lib/auth";
import { getAllowedRolesForAdminSection, getRolesWithPermission } from "@/lib/permissions";
import { createCustomer, listCustomers } from "@/lib/repository";

export async function GET() {
  const auth = await requireApiSession(getAllowedRolesForAdminSection("customers"));
  if ("error" in auth) return auth.error;

  const customers = await listCustomers();
  return NextResponse.json(customers);
}

export async function POST(request: Request) {
  const auth = await requireApiSession(getRolesWithPermission("canCreateCustomers"));
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const customer = await createCustomer(body, auth.session.user.id);
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to create customer.",
      },
      { status: 400 },
    );
  }
}
