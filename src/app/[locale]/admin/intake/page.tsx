import { AdminShell } from "@/components/admin/admin-shell";
import { IntakeManager } from "@/components/admin/intake-manager";
import { requireSession } from "@/lib/auth";
import { getAllowedRolesForAdminSection, getRolePermissions } from "@/lib/permissions";
import { listCustomers, listIncomingParcels } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function IntakePage({
  params,
}: {
  params: Promise<{ locale: "fr" | "en" }>;
}) {
  const { locale } = await params;
  const session = await requireSession(locale, getAllowedRolesForAdminSection("intake"));
  const permissions = getRolePermissions(session.user.role);
  const [customers, incomingParcels] = await Promise.all([listCustomers(), listIncomingParcels()]);

  return (
    <AdminShell
      locale={locale}
      session={session}
      active="intake"
      title={locale === "fr" ? "Reception warehouse" : "Warehouse intake"}
      description={
        locale === "fr"
          ? "Scannez le numero de suivi, choisissez ou creez le client, puis confirmez manuellement le poids, la valeur et le transport avant creation."
          : "Scan the tracking number, pick or create the customer, then confirm weight, value, and transport before creating the shipment."
      }
    >
      <IntakeManager
        locale={locale}
        customers={customers}
        incomingParcels={incomingParcels}
        canCreateCustomers={permissions.canCreateCustomers}
      />
    </AdminShell>
  );
}
