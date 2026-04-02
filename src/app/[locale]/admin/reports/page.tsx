import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/auth";
import { getAllowedRolesForAdminSection } from "@/lib/permissions";
import { getReportSummary } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ locale: "fr" | "en" }>;
}) {
  const { locale } = await params;
  const session = await requireSession(locale, getAllowedRolesForAdminSection("reports"));
  const report = await getReportSummary();

  return (
    <AdminShell
      locale={locale}
      session={session}
      active="reports"
      title={locale === "fr" ? "Rapports" : "Reports"}
      description={
        locale === "fr"
          ? "Suivez la charge par statut, les dossiers impayes et la cadence mensuelle."
          : "Track volume by status, outstanding cases, and monthly shipment cadence."
      }
    >
      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="glass-card rounded-[1.5rem] p-6">
          <h2 className="text-xl font-black">
            {locale === "fr" ? "Statuts d'expedition" : "Shipment statuses"}
          </h2>
          <div className="mt-5 space-y-3">
            {report.byStatus.map((item) => (
              <div key={item.status} className="flex items-center justify-between rounded-2xl border border-[var(--line)] px-4 py-3">
                <span className="text-sm text-[var(--foreground)]">{item.status}</span>
                <Badge tone="accent">{item.count}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-[1.5rem] p-6">
          <h2 className="text-xl font-black">
            {locale === "fr" ? "Clients avec encours" : "Outstanding by customer"}
          </h2>
          <div className="mt-5 space-y-3">
            {report.outstandingByCustomer.map((item) => (
              <div key={item.customerId} className="flex items-center justify-between rounded-2xl border border-[var(--line)] px-4 py-3">
                <span className="text-sm text-[var(--foreground)]">{item.customerName}</span>
                <Badge tone="warning">{item.count}</Badge>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="glass-card rounded-[1.5rem] p-6">
          <h2 className="text-xl font-black">
            {locale === "fr" ? "Volume mensuel" : "Monthly volume"}
          </h2>
          <div className="mt-5 space-y-3">
            {report.monthlyVolume.map((item) => (
              <div key={item.month} className="flex items-center justify-between rounded-2xl border border-[var(--line)] px-4 py-3">
                <span className="text-sm text-[var(--foreground)]">{item.month}</span>
                <Badge tone="success">{item.count}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-[1.5rem] p-6">
          <h2 className="text-xl font-black">{locale === "fr" ? "Historique imports" : "Import history"}</h2>
          <div className="mt-5 space-y-3">
            {report.imports.map((item) => (
              <div key={`${item.fileName}-${item.uploadedAt}`} className="rounded-2xl border border-[var(--line)] px-4 py-3">
                <p className="font-semibold text-[var(--foreground)]">{item.fileName}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="success">{item.createdCount} created</Badge>
                  <Badge tone="accent">{item.updatedCount} updated</Badge>
                  <Badge tone={item.errorCount > 0 ? "danger" : "neutral"}>{item.errorCount} errors</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
