import { AdminShell } from "@/components/admin/admin-shell";
import { CustomersManager } from "@/components/admin/customers-manager";
import { requireSession } from "@/lib/auth";
import { getAllowedRolesForAdminSection, getRolePermissions } from "@/lib/permissions";
import { listCustomers } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  params,
}: {
  params: Promise<{ locale: "fr" | "en" }>;
}) {
  const { locale } = await params;
  const session = await requireSession(locale, getAllowedRolesForAdminSection("customers"));
  const permissions = getRolePermissions(session.user.role);
  const customers = await listCustomers();

  return (
    <AdminShell
      locale={locale}
      session={session}
      active="customers"
      title={locale === "fr" ? "Clients" : "Customers"}
      description={
        locale === "fr"
          ? "Centralisez les comptes clients et leurs references d'exploitation."
          : "Keep customer accounts and operational reference prefixes in one place."
      }
    >
      <CustomersManager
        locale={locale}
        customers={customers}
        canCreate={permissions.canCreateCustomers}
      />
    </AdminShell>
  );
}
