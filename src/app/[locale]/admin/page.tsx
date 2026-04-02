import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/auth";
import { getAllowedRolesForAdminSection } from "@/lib/permissions";
import { getDashboardSnapshot } from "@/lib/repository";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: "fr" | "en" }>;
}) {
  const { locale } = await params;
  const session = await requireSession(locale, getAllowedRolesForAdminSection("dashboard"));
  const { metrics, shipments, imports } = await getDashboardSnapshot();

  const cards = [
    { label: locale === "fr" ? "Expeditions totales" : "Total shipments", value: metrics.shipmentCount },
    {
      label: locale === "fr" ? "Dossiers ouverts" : "Outstanding cases",
      value: metrics.outstandingShipmentCount,
    },
    { label: locale === "fr" ? "Livrees" : "Delivered", value: metrics.deliveredCount },
    { label: locale === "fr" ? "Imports" : "Imports", value: metrics.importCount },
  ];

  return (
    <AdminShell
      locale={locale}
      session={session}
      active="dashboard"
      title={locale === "fr" ? "Tableau de bord" : "Dashboard"}
      description={
        locale === "fr"
          ? "Vue d'ensemble des expeditions, des dossiers impayes et de l'activite d'import."
          : "Overview of shipments, outstanding balances, and import activity."
      }
    >
      <section className="status-grid">
        {cards.map((card) => (
          <div key={card.label} className="glass-card rounded-[1.5rem] p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">{card.label}</p>
            <p className="mt-3 text-4xl font-black">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card rounded-[1.5rem] p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black">
              {locale === "fr" ? "Expeditions recentes" : "Recent shipments"}
            </h2>
            <Badge tone="accent">{shipments.length}</Badge>
          </div>
          <div className="mt-5 space-y-3">
            {shipments.slice(0, 5).map((shipment) => (
              <div
                key={shipment.id}
                className="rounded-3xl border border-[var(--line)] bg-[var(--surface-secondary)] px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                      {shipment.trackingNumber}
                    </p>
                    <p className="mt-2 font-semibold text-[var(--foreground)]">{shipment.customer.name}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {shipment.origin} {"->"} {shipment.destination}
                    </p>
                  </div>
                  <Badge tone={shipment.paymentStatus === "paid" ? "success" : "warning"}>
                    {shipment.paymentStatus}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-[1.5rem] p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black">
              {locale === "fr" ? "Imports recents" : "Recent imports"}
            </h2>
            <Badge tone="neutral">{imports.length}</Badge>
          </div>
          <div className="mt-5 space-y-3">
            {imports.slice(0, 4).map((batch) => (
              <div
                key={batch.id}
                className="rounded-3xl border border-[var(--line)] bg-[var(--surface-secondary)] px-4 py-4"
              >
                <p className="font-semibold text-[var(--foreground)]">{batch.fileName}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {formatDateTime(batch.uploadedAt, locale === "fr" ? "fr-FR" : "en-US")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  <span>{batch.createdCount} created</span>
                  <span>{batch.updatedCount} updated</span>
                  <span>{batch.errorCount} errors</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
