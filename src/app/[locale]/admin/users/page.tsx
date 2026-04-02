import { AdminShell } from "@/components/admin/admin-shell";
import { UsersManager } from "@/components/admin/users-manager";
import { requireSession } from "@/lib/auth";
import { getAllowedRolesForAdminSection, getRolePermissions } from "@/lib/permissions";
import { listUsers } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function UsersPage({
  params,
}: {
  params: Promise<{ locale: "fr" | "en" }>;
}) {
  const { locale } = await params;
  const session = await requireSession(locale, getAllowedRolesForAdminSection("users"));
  const permissions = getRolePermissions(session.user.role);
  const users = await listUsers();

  return (
    <AdminShell
      locale={locale}
      session={session}
      active="users"
      title={locale === "fr" ? "Equipe" : "Team"}
      description={
        locale === "fr"
          ? "Gerez les acces admin, operations et finance pour votre equipe."
          : "Manage admin, operations, and finance access for your internal team."
      }
    >
      <UsersManager locale={locale} users={users} canCreate={permissions.canManageUsers} />
    </AdminShell>
  );
}
