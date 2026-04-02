"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, PencilLine, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { canCreateShipmentField, canEditShipmentField } from "@/lib/permissions";
import {
  paymentStatuses,
  shipmentStatuses,
  transportTypes,
  type CustomerRecord,
  type PaymentStatus,
  type Role,
  type ShipmentStatus,
  type ShipmentWithRelations,
  type TransportType,
} from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

type ShipmentsManagerProps = {
  locale: "fr" | "en";
  role: Role;
  shipments: ShipmentWithRelations[];
  customers: CustomerRecord[];
  canCreate: boolean;
};

function safeShipmentStatus(status: unknown): ShipmentStatus {
  return shipmentStatuses.includes(status as ShipmentStatus) ? (status as ShipmentStatus) : "draft";
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

const selectClassName =
  "h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--field)] px-4 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:bg-[var(--field-focus)] focus:ring-4 focus:ring-[var(--accent-soft)]";

export function ShipmentsManager({
  locale,
  role,
  shipments,
  customers,
  canCreate,
}: ShipmentsManagerProps) {
  const t = useTranslations("admin");
  const tStatus = useTranslations("statuses");
  const tPayments = useTranslations("payments");
  const tTransport = useTranslations("transportTypes");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingShipmentId, setEditingShipmentId] = useState<string | null>(null);
  const [expandedCustomerIds, setExpandedCustomerIds] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const createFormRef = useRef<HTMLFormElement>(null);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const canSetPaymentStatusOnCreate = canCreateShipmentField(role, "paymentStatus");
  const canSetFreightAmountOnCreate = canCreateShipmentField(role, "freightAmount");
  const canSetCurrencyOnCreate = canCreateShipmentField(role, "currency");
  const filteredShipments = normalizedSearchQuery
    ? shipments.filter((shipment) =>
        [
          shipment.trackingNumber,
          shipment.chinaTrackingNumber ?? "",
          shipment.customer.name,
          shipment.customerReference,
          shipment.origin,
          shipment.destination,
          shipment.carrier ?? "",
          shipment.transportType,
        ].some((value) => value.toLowerCase().includes(normalizedSearchQuery)),
      )
    : shipments;
  const groupedShipments = filteredShipments.reduce<
    Array<{ customer: CustomerRecord; shipments: ShipmentWithRelations[] }>
  >((groups, shipment) => {
    const existingGroup = groups.find((group) => group.customer.id === shipment.customer.id);

    if (existingGroup) {
      existingGroup.shipments.push(shipment);
      return groups;
    }

    groups.push({
      customer: shipment.customer,
      shipments: [shipment],
    });

    return groups;
  }, []);

  const canSaveAnyShipmentField =
    canEditShipmentField(role, "customerReference") ||
    canEditShipmentField(role, "transportType") ||
    canEditShipmentField(role, "origin") ||
    canEditShipmentField(role, "destination") ||
    canEditShipmentField(role, "carrier") ||
    canEditShipmentField(role, "currentStatus") ||
    canEditShipmentField(role, "paymentStatus") ||
    canEditShipmentField(role, "actualWeightKg") ||
    canEditShipmentField(role, "volumetricWeightKg") ||
    canEditShipmentField(role, "volumeCbm") ||
    canEditShipmentField(role, "freightAmount") ||
    canEditShipmentField(role, "currency") ||
    canEditShipmentField(role, "eta") ||
    canEditShipmentField(role, "notes") ||
    canEditShipmentField(role, "publicVisible");
  const copy =
    locale === "fr"
      ? {
          edit: "Modifier",
          close: "Fermer",
          lastUpdate: "Derniere mise a jour",
          eta: "ETA",
          tracking: "Suivi",
          reference: "Reference",
          noShipments: "Aucune expedition ne correspond a votre recherche.",
          customer: "Client",
          route: "Trajet",
          shipmentLabel: "expedition",
          shipmentsLabel: "expeditions",
          openGroup: "Voir les expeditions",
          closeGroup: "Masquer les expeditions",
          fallbackNote: "Saisie manuelle de secours",
          fallbackText:
            "Utilisez la reception warehouse pour les colis scannes. Gardez cet ecran pour les exceptions et les corrections admin.",
        }
      : {
          edit: "Edit",
          close: "Close",
          lastUpdate: "Last update",
          eta: "ETA",
          tracking: "Tracking",
          reference: "Reference",
          noShipments: "No shipments matched your search.",
          customer: "Customer",
          route: "Route",
          shipmentLabel: "shipment",
          shipmentsLabel: "shipments",
          openGroup: "View shipments",
          closeGroup: "Hide shipments",
          fallbackNote: "Manual fallback entry",
          fallbackText:
            "Use warehouse intake for scanned parcels. Keep this screen for exceptions and admin overrides.",
        };

  function toggleCreateOpen() {
    setCreateError(null);
    setCreateSuccess(null);

    if (isCreateOpen) {
      createFormRef.current?.reset();
    }

    setIsCreateOpen((open) => !open);
  }

  function shipmentCountLabel(count: number) {
    if (count === 1) {
      return `1 ${copy.shipmentLabel}`;
    }

    return `${count} ${copy.shipmentsLabel}`;
  }

  function isCustomerGroupOpen(customerId: string, shipmentCount: number) {
    return expandedCustomerIds[customerId] ?? shipmentCount === 1;
  }

  function toggleCustomerGroup(customerId: string, shipmentCount: number) {
    setExpandedCustomerIds((current) => ({
      ...current,
      [customerId]: !(current[customerId] ?? shipmentCount === 1),
    }));
  }

  function toggleEditShipment(shipmentId: string, customerId: string) {
    setUpdateMessage(null);
    setExpandedCustomerIds((current) => ({
      ...current,
      [customerId]: true,
    }));
    setEditingShipmentId((current) => (current === shipmentId ? null : shipmentId));
  }

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const requestPayload: Record<string, FormDataEntryValue | boolean> = {
        trackingNumber: formData.get("trackingNumber") ?? "",
        customerId: formData.get("customerId") ?? "",
        customerReference: formData.get("customerReference") ?? "",
        transportType: formData.get("transportType") ?? "",
        actualWeightKg: formData.get("actualWeightKg") ?? "",
        volumetricWeightKg: formData.get("volumetricWeightKg") ?? "",
        volumeCbm: formData.get("volumeCbm") ?? "",
        origin: formData.get("origin") ?? "",
        destination: formData.get("destination") ?? "",
        carrier: formData.get("carrier") ?? "",
        currentStatus: formData.get("currentStatus") ?? "",
        eta: formData.get("eta") ?? "",
        notes: formData.get("notes") ?? "",
        publicVisible: formData.get("publicVisible") === "on",
      };

      if (canSetFreightAmountOnCreate) {
        requestPayload.freightAmount = formData.get("freightAmount") ?? "";
      }

      if (canSetCurrencyOnCreate) {
        requestPayload.currency = formData.get("currency") ?? "";
      }

      if (canSetPaymentStatusOnCreate) {
        requestPayload.paymentStatus = formData.get("paymentStatus") ?? "";
      }

      const response = await fetch("/api/admin/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      const payload = await response.json();

      if (!response.ok) {
        setCreateError(payload.message ?? "Unable to create shipment.");
        return;
      }

      setCreateSuccess(locale === "fr" ? "Expedition creee." : "Shipment created.");
      form.reset();
      setIsCreateOpen(false);
      router.refresh();
    });
  }

  function handleUpdate(event: React.FormEvent<HTMLFormElement>, shipmentId: string) {
    event.preventDefault();
    setUpdateMessage(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const requestPayload: Record<string, FormDataEntryValue | boolean> = {};

      if (canEditShipmentField(role, "customerReference")) {
        requestPayload.customerReference = formData.get("customerReference") ?? "";
      }
      if (canEditShipmentField(role, "transportType")) {
        requestPayload.transportType = formData.get("transportType") ?? "";
      }
      if (canEditShipmentField(role, "origin")) {
        requestPayload.origin = formData.get("origin") ?? "";
      }
      if (canEditShipmentField(role, "destination")) {
        requestPayload.destination = formData.get("destination") ?? "";
      }
      if (canEditShipmentField(role, "carrier")) {
        requestPayload.carrier = formData.get("carrier") ?? "";
      }
      if (canEditShipmentField(role, "actualWeightKg")) {
        requestPayload.actualWeightKg = formData.get("actualWeightKg") ?? "";
      }
      if (canEditShipmentField(role, "volumetricWeightKg")) {
        requestPayload.volumetricWeightKg = formData.get("volumetricWeightKg") ?? "";
      }
      if (canEditShipmentField(role, "volumeCbm")) {
        requestPayload.volumeCbm = formData.get("volumeCbm") ?? "";
      }
      if (canEditShipmentField(role, "freightAmount")) {
        requestPayload.freightAmount = formData.get("freightAmount") ?? "";
      }
      if (canEditShipmentField(role, "currency")) {
        requestPayload.currency = formData.get("currency") ?? "";
      }
      if (canEditShipmentField(role, "currentStatus")) {
        requestPayload.currentStatus = formData.get("currentStatus") ?? "";
      }
      if (canEditShipmentField(role, "paymentStatus")) {
        requestPayload.paymentStatus = formData.get("paymentStatus") ?? "";
      }
      if (canEditShipmentField(role, "publicVisible")) {
        requestPayload.publicVisible = formData.get("publicVisible") === "on";
      }
      if (canEditShipmentField(role, "notes")) {
        requestPayload.notes = formData.get("notes") ?? "";
      }
      if (canEditShipmentField(role, "eta")) {
        requestPayload.eta = formData.get("eta") ?? "";
      }

      const response = await fetch(`/api/admin/shipments/${shipmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      const payload = await response.json();

      if (!response.ok) {
        setUpdateMessage(payload.message ?? "Unable to update shipment.");
        return;
      }

      setUpdateMessage(locale === "fr" ? "Expedition mise a jour." : "Shipment updated.");
      setEditingShipmentId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className={`grid gap-4 ${canCreate ? "lg:grid-cols-[18rem_minmax(0,1fr)]" : ""}`}>
        {canCreate ? (
          <section className="glass-card rounded-[1.5rem] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">{t("shipments")}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {locale === "fr" ? "Nouvelle expedition" : "New shipment"}
                </p>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[var(--brand)]">
                  {copy.fallbackNote}
                </p>
                <p className="mt-2 max-w-xs text-xs leading-5 text-[var(--muted)]">{copy.fallbackText}</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={toggleCreateOpen}
                aria-label={
                  isCreateOpen
                    ? locale === "fr"
                      ? "Fermer"
                      : "Close"
                    : locale === "fr"
                      ? "Ajouter une expedition"
                      : "Add shipment"
                }
                className="h-10 w-10 rounded-full p-0"
              >
                {isCreateOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </section>
        ) : null}

        <section className="glass-card rounded-[1.5rem] p-6">
          <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">
            {locale === "fr" ? "Recherche expedition" : "Shipment search"}
          </label>
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={
              locale === "fr"
                ? "Rechercher une expedition..."
                : "Search shipments..."
            }
          />
        </section>
      </div>

      {createError ? <p className="text-sm text-[var(--danger)]">{createError}</p> : null}
      {createSuccess ? <p className="text-sm text-[var(--success)]">{createSuccess}</p> : null}

      {canCreate && isCreateOpen ? (
        <section className="glass-card rounded-[1.5rem] p-6">
          <form ref={createFormRef} onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.trackingNumber")}</label>
                <Input name="trackingNumber" required />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.customer")}</label>
                <select
                  name="customerId"
                  required
                  className={selectClassName}
                  defaultValue={customers[0]?.id}
                >
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.customerReference")}</label>
                <Input name="customerReference" required />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.transportType")}</label>
                <select
                  name="transportType"
                  className={selectClassName}
                  defaultValue="express"
                >
                  {transportTypes.map((transportType) => (
                    <option key={transportType} value={transportType}>
                      {tTransport(transportType)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.origin")}</label>
                <Input name="origin" required />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.destination")}</label>
                <Input name="destination" required />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.carrier")}</label>
                <Input name="carrier" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.actualWeight")}</label>
                <Input name="actualWeightKg" type="number" min="0" step="0.01" defaultValue="0" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.volumetricWeight")}</label>
                <Input name="volumetricWeightKg" type="number" min="0" step="0.01" defaultValue="0" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.volume")}</label>
                <Input name="volumeCbm" type="number" min="0" step="0.01" defaultValue="0" />
              </div>
              {canSetFreightAmountOnCreate ? (
                <div>
                  <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.freightAmount")}</label>
                  <Input name="freightAmount" type="number" min="0" step="0.01" defaultValue="0" />
                </div>
              ) : null}
              {canSetCurrencyOnCreate ? (
                <div>
                  <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.currency")}</label>
                  <Input name="currency" defaultValue="Ar" />
                </div>
              ) : null}
              <div>
                <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.status")}</label>
                <select
                  name="currentStatus"
                  className={selectClassName}
                  defaultValue="received"
                >
                  {shipmentStatuses.map((status) => (
                    <option key={status} value={status}>
                      {tStatus(status)}
                    </option>
                  ))}
                </select>
              </div>
              {canSetPaymentStatusOnCreate ? (
                <div>
                  <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.paymentStatus")}</label>
                  <select
                    name="paymentStatus"
                    className={selectClassName}
                    defaultValue="unpaid"
                  >
                    {paymentStatuses.map((status) => (
                      <option key={status} value={status}>
                        {tPayments(status)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div>
                <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.eta")}</label>
                <Input type="date" name="eta" />
              </div>
              <div className="md:col-span-2 xl:col-span-3">
                <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.notes")}</label>
                <Textarea name="notes" />
              </div>
              <label className="flex items-center gap-3 text-sm text-[var(--muted)]">
                <input type="checkbox" name="publicVisible" defaultChecked className="h-4 w-4" />
                {t("forms.publicVisible")}
              </label>
              <div className="md:col-span-2 xl:col-span-3 flex items-center gap-3">
                <Button type="submit" disabled={isPending}>
                  {t("create")}
                </Button>
              </div>
          </form>
        </section>
      ) : null}

      {updateMessage ? (
        <div className="success-panel rounded-2xl px-4 py-3 text-sm text-[var(--foreground)]">
          {updateMessage}
        </div>
      ) : null}

      <section className="space-y-4">
        {groupedShipments.map((group) => {
          const groupOpen = isCustomerGroupOpen(group.customer.id, group.shipments.length);

          return (
            <div key={group.customer.id} className="glass-card rounded-[1.5rem] p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                    {shipmentCountLabel(group.shipments.length)}
                  </p>
                  <h2 className="mt-2 text-xl font-black text-[var(--foreground)]">{group.customer.name}</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {group.customer.referencePrefix ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone="neutral">{shipmentCountLabel(group.shipments.length)}</Badge>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => toggleCustomerGroup(group.customer.id, group.shipments.length)}
                    className="gap-2"
                  >
                    <span>{groupOpen ? copy.closeGroup : copy.openGroup}</span>
                    <ChevronDown className={`h-4 w-4 transition ${groupOpen ? "rotate-180" : ""}`} />
                  </Button>
                </div>
              </div>

              {groupOpen ? (
                <div className="mt-5 space-y-3">
                  {group.shipments.map((shipment) => {
                      const transportType = safeTransportType(shipment.transportType);
                      const paymentStatus = safePaymentStatus(shipment.paymentStatus);
                      const currentStatus = safeShipmentStatus(shipment.currentStatus);
                      const isEditing = editingShipmentId === shipment.id;

                      return (
                        <div key={shipment.id} className="rounded-[1.3rem] border border-[var(--line)] bg-[var(--surface-secondary)] p-4 sm:p-5">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                                {shipment.trackingNumber}
                              </p>
                              {shipment.chinaTrackingNumber ? (
                                <p className="mt-1 text-xs text-[var(--muted)]">
                                  China: {shipment.chinaTrackingNumber}
                                </p>
                              ) : null}
                              <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                                {shipment.origin} {"->"} {shipment.destination}
                              </p>
                              <p className="mt-1 text-sm text-[var(--muted)]">
                                {formatDateTime(shipment.updatedAt, locale === "fr" ? "fr-FR" : "en-US")}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge tone="accent">{tTransport(transportType)}</Badge>
                              <Badge tone={shipment.publicVisible ? "accent" : "danger"}>
                                {shipment.publicVisible ? "Public" : "Hidden"}
                              </Badge>
                              <Badge tone={paymentStatus === "paid" ? "success" : "warning"}>
                                {tPayments(paymentStatus)}
                              </Badge>
                            </div>
                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                            <div className="rounded-[1.1rem] border border-[var(--line)] bg-[var(--field)] px-4 py-3">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{copy.reference}</p>
                              <p className="mt-2 font-semibold">{shipment.customerReference}</p>
                            </div>
                            <div className="rounded-[1.1rem] border border-[var(--line)] bg-[var(--field)] px-4 py-3">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{t("forms.carrier")}</p>
                              <p className="mt-2 font-semibold">{shipment.carrier ?? "—"}</p>
                            </div>
                            <div className="rounded-[1.1rem] border border-[var(--line)] bg-[var(--field)] px-4 py-3">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{copy.eta}</p>
                              <p className="mt-2 font-semibold">{shipment.eta ? shipment.eta.slice(0, 10) : "—"}</p>
                            </div>
                            <div className="rounded-[1.1rem] border border-[var(--line)] bg-[var(--field)] px-4 py-3">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{t("forms.status")}</p>
                              <p className="mt-2 font-semibold">{tStatus(currentStatus)}</p>
                            </div>
                            <div className="rounded-[1.1rem] border border-[var(--line)] bg-[var(--field)] px-4 py-3">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{copy.lastUpdate}</p>
                              <p className="mt-2 font-semibold">{formatDateTime(shipment.updatedAt, locale === "fr" ? "fr-FR" : "en-US")}</p>
                            </div>
                          </div>

                          {canSaveAnyShipmentField ? (
                            <div className="mt-4 flex justify-end">
                              <Button
                                type="button"
                                variant={isEditing ? "ghost" : "secondary"}
                                size="sm"
                                onClick={() => toggleEditShipment(shipment.id, group.customer.id)}
                                className="gap-2"
                              >
                                {isEditing ? <X className="h-4 w-4" /> : <PencilLine className="h-4 w-4" />}
                                {isEditing ? copy.close : copy.edit}
                              </Button>
                            </div>
                          ) : null}

                          {isEditing ? (
                            <form
                              onSubmit={(event) => handleUpdate(event, shipment.id)}
                              className="mt-5 rounded-[1.4rem] border border-[var(--line)] bg-[var(--field)] p-4 sm:p-5"
                            >
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <label className="mb-2 block text-sm text-[var(--muted)]">
                          {t("forms.customerReference")}
                        </label>
                        <Input
                          name="customerReference"
                          defaultValue={shipment.customerReference}
                          disabled={!canEditShipmentField(role, "customerReference")}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.transportType")}</label>
                        <select
                          name="transportType"
                          defaultValue={transportType}
                          disabled={!canEditShipmentField(role, "transportType")}
                          className={selectClassName}
                        >
                          {transportTypes.map((transportTypeOption) => (
                            <option key={transportTypeOption} value={transportTypeOption}>
                              {tTransport(transportTypeOption)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.origin")}</label>
                        <Input
                          name="origin"
                          defaultValue={shipment.origin}
                          disabled={!canEditShipmentField(role, "origin")}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.destination")}</label>
                        <Input
                          name="destination"
                          defaultValue={shipment.destination}
                          disabled={!canEditShipmentField(role, "destination")}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.carrier")}</label>
                        <Input
                          name="carrier"
                          defaultValue={shipment.carrier ?? ""}
                          disabled={!canEditShipmentField(role, "carrier")}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.actualWeight")}</label>
                        <Input
                          name="actualWeightKg"
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={safeNumber(shipment.actualWeightKg)}
                          disabled={!canEditShipmentField(role, "actualWeightKg")}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.volumetricWeight")}</label>
                        <Input
                          name="volumetricWeightKg"
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={safeNumber(shipment.volumetricWeightKg)}
                          disabled={!canEditShipmentField(role, "volumetricWeightKg")}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.volume")}</label>
                        <Input
                          name="volumeCbm"
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={safeNumber(shipment.volumeCbm)}
                          disabled={!canEditShipmentField(role, "volumeCbm")}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.status")}</label>
                        <select
                          name="currentStatus"
                          defaultValue={currentStatus}
                          disabled={!canEditShipmentField(role, "currentStatus")}
                          className={selectClassName}
                        >
                          {shipmentStatuses.map((status) => (
                            <option key={status} value={status}>
                              {tStatus(status)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.paymentStatus")}</label>
                        <select
                          name="paymentStatus"
                          defaultValue={paymentStatus}
                          disabled={!canEditShipmentField(role, "paymentStatus")}
                          className={selectClassName}
                        >
                          {paymentStatuses.map((status) => (
                            <option key={status} value={status}>
                              {tPayments(status)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.freightAmount")}</label>
                        <Input
                          name="freightAmount"
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={safeNumber(shipment.freightAmount)}
                          disabled={!canEditShipmentField(role, "freightAmount")}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.currency")}</label>
                        <Input
                          name="currency"
                          defaultValue={safeCurrency(shipment.currency)}
                          disabled={!canEditShipmentField(role, "currency")}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.eta")}</label>
                        <Input
                          type="date"
                          name="eta"
                          defaultValue={shipment.eta?.slice(0, 10)}
                          disabled={!canEditShipmentField(role, "eta")}
                        />
                      </div>
                      <label className="flex items-center gap-3 text-sm text-[var(--muted)] pt-8">
                        <input
                          type="checkbox"
                          name="publicVisible"
                          defaultChecked={shipment.publicVisible}
                          disabled={!canEditShipmentField(role, "publicVisible")}
                          className="h-4 w-4"
                        />
                        {t("forms.publicVisible")}
                      </label>
                    </div>
                    <div className="mt-4">
                      <label className="mb-2 block text-sm text-[var(--muted)]">{t("forms.notes")}</label>
                      <Textarea
                        name="notes"
                        defaultValue={shipment.notes ?? ""}
                        disabled={!canEditShipmentField(role, "notes")}
                      />
                    </div>
                    {canSaveAnyShipmentField ? (
                      <div className="mt-4">
                        <Button type="submit" disabled={isPending}>
                          {t("save")}
                        </Button>
                      </div>
                    ) : null}
                  </form>
                          ) : null}
                        </div>
                      );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
        {filteredShipments.length === 0 ? (
          <div className="glass-card rounded-[1.5rem] p-5 text-sm text-[var(--muted)]">
            {copy.noShipments}
          </div>
        ) : null}
      </section>
    </div>
  );
}
