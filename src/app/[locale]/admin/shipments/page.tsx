import { AdminShell } from "@/components/admin/admin-shell";
import { ShipmentsManager } from "@/components/admin/shipments-manager";
import { requireSession } from "@/lib/auth";
import { getAllowedRolesForAdminSection, getRolePermissions } from "@/lib/permissions";
import { listCustomers, listShipments } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function ShipmentsPage({
  params,
}: {
  params: Promise<{ locale: "fr" | "en" }>;
}) {
  const { locale } = await params;
  const session = await requireSession(locale, getAllowedRolesForAdminSection("shipments"));
  const permissions = getRolePermissions(session.user.role);
  const [shipments, customers] = await Promise.all([listShipments(), listCustomers()]);

  return (
    <AdminShell
      locale={locale}
      session={session}
      active="shipments"
      title={locale === "fr" ? "Expeditions" : "Shipments"}
      description={
        locale === "fr"
          ? "Creez, mettez a jour et publiez les expeditions visibles par vos clients."
          : "Create, update, and publish the shipments visible to your customers."
      }
    >
      <ShipmentsManager
        locale={locale}
        role={session.user.role}
        shipments={shipments}
        customers={customers}
        canCreate={permissions.canCreateShipments}
      />
    </AdminShell>
  );
}
