"use client";

import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Copy, House, Plane, Route, Warehouse, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { Locale, ShipmentStatus, ShipmentWithRelations, TransportType } from "@/lib/types";
import { shipmentStatuses, transportTypes } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

type ShipmentDetailDialogProps = {
  locale: Locale;
  shipment: ShipmentWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function getStageIndex(status: ShipmentStatus) {
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

function safeStatus(status: unknown): ShipmentStatus {
  return shipmentStatuses.includes(status as ShipmentStatus) ? (status as ShipmentStatus) : "draft";
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

export function ShipmentDetailDialog({
  locale,
  shipment,
  open,
  onOpenChange,
}: ShipmentDetailDialogProps) {
  const t = useTranslations("public");
  const tStatus = useTranslations("statuses");
  const tTransport = useTranslations("transportTypes");
  const [copied, setCopied] = useState(false);

  const shipmentStatus = shipment ? safeStatus(shipment.currentStatus) : "draft";
  const shipmentTransportType = shipment ? safeTransportType(shipment.transportType) : "express";
  const stageIndex = shipment ? getStageIndex(shipmentStatus) : 0;
  const localeCode = locale === "fr" ? "fr-FR" : "en-US";

  const copy =
    locale === "fr"
      ? {
          routeTitle: "Vue route",
          routeSubtitle: "Une fiche laterale plus proche d'un poste de controle que d'une popup classique.",
          milestonesTitle: "Jalons de route",
          metricsTitle: "Metriques colis",
          historyTitle: "Historique detaille",
        }
      : {
          routeTitle: "Route view",
          routeSubtitle: "A side sheet designed more like an operations board than a standard popup.",
          milestonesTitle: "Route milestones",
          metricsTitle: "Shipment metrics",
          historyTitle: "Detailed timeline",
        };

  const milestoneMeta = useMemo(() => {
    if (!shipment) {
      return [];
    }

    const receivedEvent = shipment.events.find((event) => event.status === "received");
    const transitEvent = shipment.events.find((event) => event.status === "in_transit");
    const arrivalEvent = shipment.events.find((event) =>
      ["arrived", "ready_for_pickup", "delivered"].includes(safeStatus(event.status)),
    );

    return [
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
  }, [shipment, shipmentTransportType, t, tTransport]);

  async function handleCopy() {
    if (!shipment) {
      return;
    }

    try {
      await navigator.clipboard.writeText(`#${shipment.chinaTrackingNumber ?? shipment.trackingNumber}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[var(--overlay)] backdrop-blur-sm" />
        <Dialog.Content className="dialog-surface fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto border-l border-[var(--line)] p-6 text-[var(--foreground)] shadow-[0_30px_90px_var(--shadow)] outline-none sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-md">
              <Dialog.Title className="text-xs uppercase tracking-[0.3em] text-[var(--brand)]">
                {copy.routeTitle}
              </Dialog.Title>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{copy.routeSubtitle}</p>
            </div>
            <Dialog.Close className="icon-shell inline-flex h-11 w-11 items-center justify-center rounded-full">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          {shipment ? (
            <>
              <div className="mt-6 rounded-[1.8rem] border border-[var(--line)] bg-[var(--surface-secondary)] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
                      {shipment.customer.name}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <div>
                        <p className="text-2xl font-black tracking-tight">
                          #{shipment.chinaTrackingNumber ?? shipment.trackingNumber}
                        </p>
                        {shipment.chinaTrackingNumber ? (
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            Internal: #{shipment.trackingNumber}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="icon-shell inline-flex h-10 w-10 items-center justify-center rounded-full"
                        aria-label={t("copyNumber")}
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--brand)]">
                    <Route className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone="accent">{tTransport(shipmentTransportType)}</Badge>
                  <Badge tone="warning">{tStatus(shipmentStatus)}</Badge>
                  {copied ? <span className="text-xs text-[var(--brand)]">{t("copyNumber")}</span> : null}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-semibold">
                  <span>{shipment.origin}</span>
                  <Route className="h-4 w-4 text-[var(--brand)]" />
                  <span>{shipment.destination}</span>
                </div>
              </div>

              <div className="mt-6 rounded-[1.8rem] border border-[var(--line)] bg-[var(--surface-secondary)] p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--brand)]">
                  {copy.metricsTitle}
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-[var(--muted)]">{t("actualWeight")}</p>
                    <p className="mt-2 text-3xl font-black">{safeNumber(shipment.actualWeightKg).toFixed(1)} Kg</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--muted)]">{t("volume")}</p>
                    <p className="mt-2 text-3xl font-black">{safeNumber(shipment.volumeCbm).toFixed(2)} m³</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--muted)]">{t("volumetricWeight")}</p>
                    <p className="mt-2 text-3xl font-black">{safeNumber(shipment.volumetricWeightKg).toFixed(1)} Kg</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--muted)]">{t("freight")}</p>
                    <p className="mt-2 text-3xl font-black">
                      {new Intl.NumberFormat(localeCode).format(safeNumber(shipment.freightAmount))}{" "}
                      {safeCurrency(shipment.currency)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-[1.8rem] border border-[var(--line)] bg-[var(--surface-secondary)] p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--brand)]">
                  {copy.milestonesTitle}
                </p>
                <div className="mt-5 space-y-4">
                  {milestoneMeta.map((step, index) => {
                    const Icon = step.icon;
                    const active = stageIndex >= index;

                    return (
                      <div key={step.label} className="relative flex gap-4">
                        {index < milestoneMeta.length - 1 ? (
                          <div className="absolute left-[1.35rem] top-12 h-[calc(100%+0.9rem)] w-px bg-[var(--line)]" />
                        ) : null}
                        <div
                          className={`relative z-10 mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                            active
                              ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--brand)]"
                              : "border-[var(--line)] bg-[var(--field)] text-[var(--muted)]"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 rounded-[1.4rem] border border-[var(--line)] bg-[var(--field)] px-4 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="font-semibold">{step.label}</p>
                            <Badge tone={active ? "accent" : "neutral"}>{step.caption}</Badge>
                          </div>
                          <p className="mt-3 text-sm text-[var(--muted)]">
                            {step.date ? formatDateTime(step.date, localeCode) : t("soon")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 rounded-[1.8rem] border border-[var(--line)] bg-[var(--surface-secondary)] p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--brand)]">
                  {copy.historyTitle}
                </p>
                <div className="mt-5 space-y-3">
                  {shipment.events.length > 0 ? (
                    shipment.events.map((event) => {
                      const eventStatus = safeStatus(event.status);

                      return (
                        <div
                          key={event.id}
                          className="rounded-[1.3rem] border border-[var(--line)] bg-[var(--field)] px-4 py-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="font-semibold">{event.label}</p>
                            <Badge tone="accent">{tStatus(eventStatus)}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-[var(--muted)]">
                            {event.details ?? tStatus(eventStatus)}
                          </p>
                          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                            {formatDateTime(event.occurredAt, localeCode)}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[1.3rem] border border-[var(--line)] bg-[var(--field)] px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-semibold">{tStatus(shipmentStatus)}</p>
                        <Badge tone="accent">{tStatus(shipmentStatus)}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-[var(--muted)]">{t("currentStatus")}</p>
                      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                        {formatDateTime(shipment.createdAt, localeCode)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
