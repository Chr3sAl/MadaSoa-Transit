"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ImportBatchRecord, ImportPreview, ImportRowDraft } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

type ImportCenterProps = {
  locale: "fr" | "en";
  imports: ImportBatchRecord[];
  canImport: boolean;
};

export function ImportCenter({ locale, imports, canImport }: ImportCenterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handlePreview() {
    if (!file) {
      setMessage(locale === "fr" ? "Choisissez un fichier." : "Choose a file first.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/imports/preview", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.message ?? "Unable to preview import.");
        return;
      }

      setMessage(null);
      setPreview(payload);
    });
  }

  function handleCommit() {
    if (!preview) {
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/admin/imports/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: preview.fileName,
          rows: preview.validRows,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.message ?? "Unable to commit import.");
        return;
      }

      const created = payload.batch?.createdCount ?? 0;
      const updated = payload.batch?.updatedCount ?? 0;
      setMessage(
        locale === "fr"
          ? `Import termine : ${created} cree(s), ${updated} mis a jour.`
          : `Import completed: ${created} created, ${updated} updated.`,
      );
      setPreview(null);
      setFile(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {canImport ? (
        <section className="glass-card rounded-[1.5rem] p-6">
          <h2 className="text-xl font-black">{locale === "fr" ? "Import par fichier" : "File import"}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {locale === "fr"
              ? "Colonnes requises : trackingNumber, customerReference, customerName, origin, destination, currentStatus, paymentStatus."
              : "Required columns: trackingNumber, customerReference, customerName, origin, destination, currentStatus, paymentStatus."}
          </p>
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full text-sm text-[var(--muted)]"
            />
            <Button onClick={handlePreview} disabled={isPending || !file}>
              {locale === "fr" ? "Previsualiser" : "Preview"}
            </Button>
            {preview?.validRows.length ? (
              <Button variant="secondary" onClick={handleCommit} disabled={isPending}>
                {locale === "fr" ? "Valider l'import" : "Commit import"}
              </Button>
            ) : null}
          </div>
          {message ? <p className="mt-4 text-sm text-[var(--muted)]">{message}</p> : null}
          {preview ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-secondary)] p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-black text-[var(--foreground)]">
                    {locale === "fr" ? "Lignes valides" : "Valid rows"}
                  </h3>
                  <Badge tone="success">{preview.validRows.length}</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {preview.validRows.map((row: ImportRowDraft) => (
                    <div key={`${row.rowNumber}-${row.trackingNumber}`} className="rounded-2xl border border-[var(--line)] px-4 py-3">
                      <p className="font-semibold text-[var(--foreground)]">{row.trackingNumber}</p>
                      <p className="text-sm text-[var(--muted)]">
                        {row.customerName} • {row.origin} {"->"} {row.destination}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-secondary)] p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-black text-[var(--foreground)]">
                    {locale === "fr" ? "Erreurs" : "Errors"}
                  </h3>
                  <Badge tone="danger">{preview.invalidRows.length}</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {preview.invalidRows.length ? (
                    preview.invalidRows.map((row) => (
                      <div key={`error-${row.rowNumber}`} className="danger-panel rounded-2xl px-4 py-3">
                        <p className="font-semibold text-[var(--foreground)]">
                          Row {row.rowNumber} {row.trackingNumber ? `• ${row.trackingNumber}` : ""}
                        </p>
                        <p className="text-sm text-[var(--danger)]">{row.message}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--muted)]">
                      {locale === "fr" ? "Aucune erreur detectee." : "No validation errors detected."}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {imports.map((batch) => (
          <div key={batch.id} className="glass-card rounded-[1.5rem] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{batch.fileName}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {formatDateTime(batch.uploadedAt, locale === "fr" ? "fr-FR" : "en-US")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="success">{batch.createdCount} created</Badge>
              <Badge tone="accent">{batch.updatedCount} updated</Badge>
              <Badge tone={batch.errorCount > 0 ? "danger" : "neutral"}>{batch.errorCount} errors</Badge>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
