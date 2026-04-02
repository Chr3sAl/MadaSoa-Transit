import { NextResponse } from "next/server";

import { requireApiSession } from "@/lib/auth";
import { getRolesWithPermission } from "@/lib/permissions";
import { createUser, listUsers } from "@/lib/repository";

export async function GET() {
  const auth = await requireApiSession(getRolesWithPermission("canManageUsers"));
  if ("error" in auth) return auth.error;

  const users = await listUsers();
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const auth = await requireApiSession(getRolesWithPermission("canManageUsers"));
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const user = await createUser(body, auth.session.user.id);
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to create user.",
      },
      { status: 400 },
    );
  }
}
