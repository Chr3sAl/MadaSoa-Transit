"use client";

import { useMemo, useState, useTransition } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import {
  ArrowRight,
  ChevronDown,
  Clock3,
  House,
  LayoutDashboard,
  MapPinned,
  PackageSearch,
  Plane,
  Route,
  Search,
  Warehouse,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { ShipmentDetailDialog } from "@/components/public/shipment-detail-dialog";
import { LanguageSwitch } from "@/components/public/language-switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type {
  Locale,
  LookupResponse,
  PaymentStatus,
  ShipmentStatus,
  ShipmentWithRelations,
  TransportType,
} from "@/lib/types";
import { paymentStatuses, shipmentStatuses, transportTypes } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

type TrackingPortalProps = {
  locale: Locale;
};

function paymentTone(status: PaymentStatus) {
  switch (status) {
    case "paid":
      return "success";
    case "partial":
      return "warning";
    case "unpaid":
      return "danger";
  }
}

function statusTone(status: ShipmentStatus) {
  switch (status) {
    case "delivered":
      return "success";
    case "on_hold":
      return "danger";
    case "arrived":
    case "ready_for_pickup":
      return "accent";
    default:
      return "neutral";
  }
}

function safeStatus(status: unknown): ShipmentStatus {
  return shipmentStatuses.includes(status as ShipmentStatus) ? (status as ShipmentStatus) : "draft";
}

function getRouteStageIndex(status: ShipmentStatus) {
  switch (status) {
    case "draft":
    case "received":
      return 0;
    case "in_transit":
    case "on_hold":
      return 1;
    case "arrived":
    case "ready_for_pickup":
    case "delivered":
      return 2;
  }
}

function safePaymentStatus(status: unknown): PaymentStatus {
  return paymentStatuses.includes(status as PaymentStatus) ? (status as PaymentStatus) : "unpaid";
}

function safeTransportType(transportType: unknown): TransportType {
  return transportTypes.includes(transportType as TransportType)
    ? (transportType as TransportType)
    : "express";
}

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function safeCurrency(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : "Ar";
}

export function TrackingPortal({ locale }: TrackingPortalProps) {
  const t = useTranslations("public");
  const tStatus = useTranslations("statuses");
  const tPayment = useTranslations("payments");
  const tTransport = useTranslations("transportTypes");
  const [mode, setMode] = useState<"tracking" | "reference">("tracking");
  const [value, setValue] = useState("");
  const [transportType, setTransportType] = useState<TransportType>("air");
  const [result, setResult] = useState<LookupResponse | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<ShipmentWithRelations | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const copy =
    locale === "fr"
      ? {
          portalLabel: "Portail client MadaSoa",
          adminLink: "Suite operations",
          eyebrow: "Suivi simple et moderne",
          lead:
            "Retrouvez un colis ou une reference client dans une interface plus legere, plus claire, et differente d'un portail classique.",
          routeTitle: "Vue rapide",
          routeSteps: ["Origine", "Transit", "Arrivee"],
          routeNotes: [
            "Consolidation",
            "Acheminement",
            "Disponibilite client",
          ],
          consoleTitle: "Recherche",
          consoleText:
            "Choisissez un mode, lancez la recherche, puis ouvrez la fiche detaillee si besoin.",
          responseHint: "reponse immediate",
          defaultTitle: "Pret pour la recherche",
          defaultText:
            "Entrez un numero de suivi ou une reference client pour afficher les expeditions.",
          trackingResultTitle: "Expedition",
          referenceResultTitle: "Expeditions ouvertes",
          detailAction: "Ouvrir la fiche",
          adminSuffix: "client portal",
          milestonesTitle: "Jalons de route",
          metricsTitle: "Metriques colis",
          activeStepTitle: "Etape active",
          currentStatusTitle: "Statut courant",
          nextStepTitle: "Prochaine etape",
          finalStepLabel: "Derniere etape",
          completedStepLabel: "Termine",
          currentStepLabel: "En cours",
          upcomingStepLabel: "A venir",
        }
      : {
          portalLabel: "MadaSoa client portal",
          adminLink: "Operations suite",
          eyebrow: "Simple, modern tracking",
          lead:
            "Find a shipment or client reference inside a lighter, cleaner interface that feels different from a typical carrier portal.",
          routeTitle: "Quick route",
          routeSteps: ["Origin", "Transit", "Arrival"],
          routeNotes: [
            "Consolidation",
            "Line haul",
            "Client availability",
          ],
          consoleTitle: "Search",
          consoleText:
            "Choose a mode, run the lookup, then open the detailed sheet only when needed.",
          responseHint: "instant response",
          defaultTitle: "Ready to search",
          defaultText:
            "Enter a tracking number or client reference to display shipments.",
          trackingResultTitle: "Shipment",
          referenceResultTitle: "Open shipments",
          detailAction: "Open details",
          adminSuffix: "client portal",
          milestonesTitle: "Route milestones",
          metricsTitle: "Shipment metrics",
          activeStepTitle: "Active step",
          currentStatusTitle: "Current status",
          nextStepTitle: "Next step",
          finalStepLabel: "Final step",
          completedStepLabel: "Completed",
          currentStepLabel: "Current",
          upcomingStepLabel: "Upcoming",
        };

  const placeholder = useMemo(
    () => (mode === "tracking" ? t("inputTracking") : t("inputReference")),
    [mode, t],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/public/lookup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode,
            value,
            locale,
            transportType: mode === "reference" ? transportType : undefined,
          }),
        });

        const payload = await response.json();

        if (!response.ok) {
          setError(payload.message ?? "Lookup failed.");
          return;
        }

        setResult(payload);
        setSelectedShipment(null);
      } catch {
        setError("Unable to reach the lookup service.");
      }
    });
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden px-4 py-5 text-[var(--foreground)] sm:px-8">
      <div className="page-glow pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_var(--accent-soft),_transparent_60%)]" />

      <header className="relative mx-auto flex w-full max-w-[84rem] flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="brand-mark flex h-14 w-14 items-center justify-center rounded-full text-xs font-black uppercase tracking-[0.18em]">
            MS
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--brand)]">
              MadaSoa Transit
            </p>
            <p className="max-w-44 text-sm text-[var(--muted)] sm:max-w-none">{copy.portalLabel}</p>
          </div>
        </div>

        <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:items-center sm:gap-3">
          <ThemeToggle locale={locale} className="w-full justify-center px-3 sm:w-auto sm:px-4" />
          <LanguageSwitch locale={locale} />
          <a
            href={`/${locale}/admin`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[var(--brand)] bg-[var(--surface-secondary)] px-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-hover)] sm:px-5"
          >
            <LayoutDashboard className="h-4 w-4 sm:hidden" />
            <span className="sm:hidden">{locale === "fr" ? "Admin" : "Admin"}</span>
            <span className="hidden sm:inline">{copy.adminLink}</span>
          </a>
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-[84rem] flex-1 flex-col py-10">
        <section className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-secondary)] px-4 py-2 text-xs uppercase tracking-[0.28em] text-[var(--brand)]">
              <PackageSearch className="h-4 w-4" />
              {copy.eyebrow}
            </div>

            <div className="max-w-3xl">
              <h1 className="text-5xl font-black tracking-tight sm:text-6xl xl:text-7xl">
                {t("title")}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">{copy.lead}</p>
            </div>

            <div className="glass-card max-w-3xl rounded-[1.8rem] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-[var(--brand)]">
                    {copy.routeTitle}
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{copy.adminSuffix}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--brand)]">
                  <Route className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {copy.routeSteps.map((step, index) => (
                  <div
                    key={step}
                    className="rounded-[1.3rem] border border-[var(--line)] bg-[var(--surface-secondary)] px-4 py-4"
                  >
                    <p className="text-sm font-semibold">{step}</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">{copy.routeNotes[index]}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-card accent-ring rounded-[2rem] p-6 sm:p-7">
            <div className="max-w-xl">
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--brand)]">
                {copy.consoleTitle}
              </p>
              <h2 className="mt-3 text-2xl font-black">{copy.consoleTitle}</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{copy.consoleText}</p>
            </div>

            <Tabs.Root
              value={mode}
              onValueChange={(nextValue) => setMode(nextValue as "tracking" | "reference")}
              className="mt-6"
            >
              <Tabs.List className="grid gap-3 sm:grid-cols-2">
                <Tabs.Trigger
                  value="tracking"
                  className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--field)] px-4 py-4 text-left text-[var(--muted)] outline-none transition data-[state=active]:border-transparent data-[state=active]:bg-[var(--accent)] data-[state=active]:text-[var(--button-foreground)]"
                >
                  <div className="flex items-start gap-3">
                    <PackageSearch className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <div className="text-sm font-black uppercase">{t("trackingTab")}</div>
                      <div className="mt-1 text-xs text-inherit/80">{t("trackingHint")}</div>
                    </div>
                  </div>
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="reference"
                  className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--field)] px-4 py-4 text-left text-[var(--muted)] outline-none transition data-[state=active]:border-transparent data-[state=active]:bg-[var(--accent)] data-[state=active]:text-[var(--button-foreground)]"
                >
                  <div className="flex items-start gap-3">
                    <MapPinned className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <div className="text-sm font-black uppercase">{t("referenceTab")}</div>
                      <div className="mt-1 text-xs text-inherit/80">{t("referenceHint")}</div>
                    </div>
                  </div>
                </Tabs.Trigger>
              </Tabs.List>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                {mode === "tracking" ? (
                  <div>
                    <label className="mb-2 block text-sm text-[var(--muted)]">{t("inputLabelTracking")}</label>
                    <Input
                      value={value}
                      onChange={(event) => setValue(event.target.value)}
                      placeholder={placeholder}
                      className="h-14 rounded-[1.4rem] border-[var(--accent)] text-base"
                    />
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm text-[var(--muted)]">{t("inputLabelReference")}</label>
                      <Input
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                        placeholder={placeholder}
                        className="h-14 rounded-[1.4rem] text-base"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm text-[var(--muted)]">{t("transportTypeLabel")}</label>
                      <div className="relative">
                        <select
                          value={transportType}
                          onChange={(event) => setTransportType(event.target.value as TransportType)}
                          className="h-14 w-full appearance-none rounded-[1.4rem] border border-[var(--accent)] bg-[var(--field)] px-4 pr-12 text-base font-semibold text-[var(--foreground)] outline-none transition focus:bg-[var(--field-focus)] focus:ring-4 focus:ring-[var(--accent-soft)]"
                        >
                          {transportTypes.map((type) => (
                            <option key={type} value={type}>
                              {tTransport(type)}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="flex w-full items-center justify-between rounded-[1.4rem] px-5"
                  disabled={isPending || value.trim().length < 3}
                >
                  <span className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    {isPending ? t("searching") : t("search")}
                  </span>
                  <span className="hidden text-xs uppercase tracking-[0.22em] text-[var(--button-foreground)]/70 sm:inline">
                    {copy.responseHint}
                  </span>
                </Button>

                <div className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface-secondary)] px-4 py-4">
                  <p className="flex items-start gap-3 text-sm leading-6 text-[var(--muted)]">
                    <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
                    <span>{t("outstandingNote")}</span>
                  </p>
                </div>
              </form>
            </Tabs.Root>
          </div>
        </section>

        <section className="mt-8">
          {error ? (
            <div className="danger-panel rounded-[1.8rem] px-5 py-4 text-sm text-[var(--foreground)]">
              {error}
            </div>
          ) : null}

          {result ? (
            <div className="space-y-5">
              {result.mode === "tracking" ? (
                result.shipment ? (
                  (() => {
                    const shipment = result.shipment;
                    const shipmentStatus = safeStatus(shipment.currentStatus);
                    const paymentStatus = safePaymentStatus(shipment.paymentStatus);
                    const shipmentTransportType = safeTransportType(shipment.transportType);
                    const localeCode = locale === "fr" ? "fr-FR" : "en-US";
                    const currentRouteStageIndex = getRouteStageIndex(shipmentStatus);
                    const receivedEvent = shipment.events.find((event) => event.status === "received");
                    const transitEvent = shipment.events.find((event) => event.status === "in_transit");
                    const arrivalEvent = shipment.events.find((event) =>
                      ["arrived", "ready_for_pickup", "delivered"].includes(safeStatus(event.status)),
                    );
                    const milestones = [
                      {
                        label: t("stageOrigin"),
                        caption: shipment.origin.toUpperCase(),
                        icon: Warehouse,
                        date: receivedEvent?.occurredAt ?? shipment.createdAt,
                      },
                      {
                        label: t("stageTransit"),
                        caption: tTransport(shipmentTransportType),
                        icon: Plane,
                        date: transitEvent?.occurredAt ?? null,
                      },
                      {
                        label: t("stageArrival"),
                        caption: shipment.destination.toUpperCase(),
                        icon: House,
                        date: arrivalEvent?.occurredAt ?? shipment.eta ?? null,
                      },
                    ];
                    const activeMilestone = milestones[currentRouteStageIndex];
                    const nextMilestone = milestones[currentRouteStageIndex + 1] ?? null;

                    return (
                      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                        <div className="glass-card rounded-[1.8rem] p-6">
                          <p className="text-xs uppercase tracking-[0.28em] text-[var(--brand)]">
                            {copy.milestonesTitle}
                          </p>
                          <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-[1.3rem] border border-[var(--line)] bg-[var(--surface-secondary)] p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                                {copy.activeStepTitle}
                              </p>
                              <p className="mt-2 text-lg font-semibold">{activeMilestone.label}</p>
                            </div>
                            <div className="rounded-[1.3rem] border border-[var(--line)] bg-[var(--surface-secondary)] p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                                {copy.currentStatusTitle}
                              </p>
                              <div className="mt-2">
                                <Badge tone={statusTone(shipmentStatus)}>{tStatus(shipmentStatus)}</Badge>
                              </div>
                            </div>
                            <div className="rounded-[1.3rem] border border-[var(--line)] bg-[var(--surface-secondary)] p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                                {copy.nextStepTitle}
                              </p>
                              <p className="mt-2 text-lg font-semibold">
                                {nextMilestone ? nextMilestone.label : copy.finalStepLabel}
                              </p>
                            </div>
                          </div>
                          <div className="mt-5 space-y-4">
                            {milestones.map((step, index) => {
                              const Icon = step.icon;
                              const stepState =
                                index < currentRouteStageIndex
                                  ? "completed"
                                  : index === currentRouteStageIndex
                                    ? "current"
                                    : "upcoming";
                              const stateTone =
                                stepState === "completed"
                                  ? "success"
                                  : stepState === "current"
                                    ? "accent"
                                    : "neutral";
                              const stateLabel =
                                stepState === "completed"
                                  ? copy.completedStepLabel
                                  : stepState === "current"
                                    ? copy.currentStepLabel
                                    : copy.upcomingStepLabel;

                              return (
                                <div key={step.label} className="relative flex gap-4">
                                  {index < milestones.length - 1 ? (
                                    <div className="absolute left-[1.35rem] top-12 h-[calc(100%+0.9rem)] w-px bg-[var(--line)]" />
                                  ) : null}
                                  <div
                                    className={`relative z-10 mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                                      stepState === "completed"
                                        ? "border-transparent bg-[var(--success-soft)] text-[var(--success)]"
                                        : stepState === "current"
                                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--brand)]"
                                          : "border-[var(--line)] bg-[var(--field)] text-[var(--muted)]"
                                    }`}
                                  >
                                    <Icon className="h-5 w-5" />
                                  </div>
                                  <div
                                    className={`flex-1 rounded-[1.4rem] border px-4 py-4 ${
                                      stepState === "current"
                                        ? "border-[var(--accent)] bg-[var(--field-focus)]"
                                        : "border-[var(--line)] bg-[var(--surface-secondary)]"
                                    }`}
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <p className="font-semibold">{step.label}</p>
                                      <div className="flex flex-wrap gap-2">
                                        <Badge tone={stateTone}>{stateLabel}</Badge>
                                        <Badge tone={stepState === "upcoming" ? "neutral" : "accent"}>
                                          {step.caption}
                                        </Badge>
                                      </div>
                                    </div>
                                    <p className="mt-3 text-sm text-[var(--muted)]">
                                      {step.date
                                        ? formatDateTime(step.date, localeCode)
                                        : t("soon")}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="glass-card rounded-[1.8rem] p-6">
                          <p className="text-xs uppercase tracking-[0.28em] text-[var(--brand)]">
                            {copy.metricsTitle}
                          </p>
                          <h2 className="mt-3 text-3xl font-black">{shipment.customer.name}</h2>
                          <p className="mt-3 text-sm text-[var(--muted)]">
                            {shipment.origin} {"->"} {shipment.destination}
                          </p>

                          <div className="mt-5 flex flex-wrap gap-2">
                            <Badge tone={statusTone(shipmentStatus)}>{tStatus(shipmentStatus)}</Badge>
                            <Badge tone={paymentTone(paymentStatus)}>{tPayment(paymentStatus)}</Badge>
                            <Badge tone="accent">{tTransport(shipmentTransportType)}</Badge>
                          </div>

                          <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[1.3rem] border border-[var(--line)] bg-[var(--surface-secondary)] p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                                {t("actualWeight")}
                              </p>
                              <p className="mt-2 text-2xl font-black">{safeNumber(shipment.actualWeightKg).toFixed(1)} Kg</p>
                            </div>
                            <div className="rounded-[1.3rem] border border-[var(--line)] bg-[var(--surface-secondary)] p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                                {t("volumetricWeight")}
                              </p>
                              <p className="mt-2 text-2xl font-black">
                                {safeNumber(shipment.volumetricWeightKg).toFixed(1)} Kg
                              </p>
                            </div>
                            <div className="rounded-[1.3rem] border border-[var(--line)] bg-[var(--surface-secondary)] p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                                {t("volume")}
                              </p>
                              <p className="mt-2 text-2xl font-black">{safeNumber(shipment.volumeCbm).toFixed(2)} m³</p>
                            </div>
                            <div className="rounded-[1.3rem] border border-[var(--line)] bg-[var(--surface-secondary)] p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                                {t("freight")}
                              </p>
                              <p className="mt-2 text-2xl font-black">
                                {new Intl.NumberFormat(localeCode).format(
                                  safeNumber(shipment.freightAmount),
                                )}{" "}
                                {safeCurrency(shipment.currency)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[1.3rem] border border-[var(--line)] bg-[var(--surface-secondary)] p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                                {t("inputLabelTracking")}
                              </p>
                              <p className="mt-2 text-lg font-semibold">
                                {shipment.chinaTrackingNumber ?? shipment.trackingNumber}
                              </p>
                              {shipment.chinaTrackingNumber ? (
                                <p className="mt-2 text-xs text-[var(--muted)]">
                                  Internal: {shipment.trackingNumber}
                                </p>
                              ) : null}
                            </div>
                            <div className="rounded-[1.3rem] border border-[var(--line)] bg-[var(--surface-secondary)] p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">ETA</p>
                              <p className="mt-2 text-lg font-semibold">
                                {formatDateTime(shipment.eta, localeCode)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-6">
                            <Button type="button" onClick={() => setSelectedShipment(shipment)}>
                              {copy.detailAction}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="glass-card rounded-[1.8rem] p-8 text-center">
                    <p className="text-lg font-semibold">{t("emptyTracking")}</p>
                  </div>
                )
              ) : result.shipments.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-[var(--brand)]">
                    {copy.referenceResultTitle}
                  </p>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {result.shipments.map((shipment) => {
                      const shipmentStatus = safeStatus(shipment.currentStatus);
                      const paymentStatus = safePaymentStatus(shipment.paymentStatus);
                      const shipmentTransportType = safeTransportType(shipment.transportType);

                      return (
                        <div key={shipment.id} className="glass-card rounded-[1.6rem] p-5">
                          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                            {shipment.chinaTrackingNumber ?? shipment.trackingNumber}
                          </p>
                          {shipment.chinaTrackingNumber ? (
                            <p className="mt-1 text-xs text-[var(--muted)]">Internal: {shipment.trackingNumber}</p>
                          ) : null}
                          <h2 className="mt-2 text-xl font-black">{shipment.customer.name}</h2>
                          <p className="mt-2 text-sm text-[var(--muted)]">
                            {shipment.origin} {"->"} {shipment.destination}
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Badge tone="accent">{tTransport(shipmentTransportType)}</Badge>
                            <Badge tone={statusTone(shipmentStatus)}>{tStatus(shipmentStatus)}</Badge>
                            <Badge tone={paymentTone(paymentStatus)}>{tPayment(paymentStatus)}</Badge>
                          </div>
                          <div className="mt-5">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => setSelectedShipment(shipment)}
                              className="w-full justify-between"
                            >
                              {copy.detailAction}
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="glass-card rounded-[1.8rem] p-8 text-center">
                  <p className="text-lg font-semibold">{t("emptyReference")}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card rounded-[1.8rem] p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--brand)]">
                {copy.defaultTitle}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{copy.defaultText}</p>
            </div>
          )}
        </section>
      </main>

      <ShipmentDetailDialog
        locale={locale}
        shipment={selectedShipment}
        open={Boolean(selectedShipment)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedShipment(null);
          }
        }}
      />

      <footer className="relative mx-auto flex w-full max-w-[84rem] items-center justify-between border-t border-[var(--divider)] pt-6 pb-3 text-sm text-[var(--muted)]">
        <p>Copyright © 2026, MadaSoa Transit.</p>
        <p className="hidden sm:block">Politique de transport</p>
      </footer>
    </div>
  );
}
