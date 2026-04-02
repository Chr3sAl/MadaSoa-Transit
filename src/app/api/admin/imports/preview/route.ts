import { NextResponse } from "next/server";

import { requireApiSession } from "@/lib/auth";
import { getRolesWithPermission } from "@/lib/permissions";
import { previewImport } from "@/lib/repository";

export async function POST(request: Request) {
  const auth = await requireApiSession(getRolesWithPermission("canImport"));
  if ("error" in auth) return auth.error;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Please upload a CSV or XLSX file." }, { status: 400 });
    }

    const preview = await previewImport(file.name, new Uint8Array(await file.arrayBuffer()));
    return NextResponse.json(preview);
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to preview import.",
      },
      { status: 400 },
    );
  }
}
