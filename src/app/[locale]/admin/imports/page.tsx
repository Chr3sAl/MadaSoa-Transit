import { AdminShell } from "@/components/admin/admin-shell";
import { ImportCenter } from "@/components/admin/import-center";
import { requireSession } from "@/lib/auth";
import { getAllowedRolesForAdminSection, getRolePermissions } from "@/lib/permissions";
import { listImportBatches } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function ImportsPage({
  params,
}: {
  params: Promise<{ locale: "fr" | "en" }>;
}) {
  const { locale } = await params;
  const session = await requireSession(locale, getAllowedRolesForAdminSection("imports"));
  const permissions = getRolePermissions(session.user.role);
  const imports = await listImportBatches();

  return (
    <AdminShell
      locale={locale}
      session={session}
      active="imports"
      title={locale === "fr" ? "Imports" : "Imports"}
      description={
        locale === "fr"
          ? "Previsualisez les lignes valides, corrigez les erreurs puis validez vos imports."
          : "Preview valid rows, fix errors, and then commit your spreadsheet imports."
      }
    >
      <ImportCenter locale={locale} imports={imports} canImport={permissions.canImport} />
    </AdminShell>
  );
}
