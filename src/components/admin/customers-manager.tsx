"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CustomerRecord } from "@/lib/types";

type CustomersManagerProps = {
  locale: "fr" | "en";
  customers: CustomerRecord[];
  canCreate: boolean;
};

export function CustomersManager({ locale, customers, canCreate }: CustomersManagerProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const createFormRef = useRef<HTMLFormElement>(null);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredCustomers = normalizedSearchQuery
    ? customers.filter((customer) =>
        [
          customer.name,
          customer.customerCode,
          customer.email ?? "",
          customer.phone ?? "",
          customer.referencePrefix ?? "",
          ...customer.aliases.map((alias) => alias.value),
        ].some((value) => value.toLowerCase().includes(normalizedSearchQuery)),
      )
    : customers;

  function toggleCreateOpen() {
    setMessage(null);

    if (isCreateOpen) {
      createFormRef.current?.reset();
    }

    setIsCreateOpen((open) => !open);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const response = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          customerCode: formData.get("customerCode"),
          referencePrefix: formData.get("referencePrefix"),
          receiverAliases: String(formData.get("receiverAliases") ?? "")
            .split(/\r?\n|,/)
            .map((value) => value.trim())
            .filter(Boolean),
          receiverPhones: String(formData.get("receiverPhones") ?? "")
            .split(/\r?\n|,/)
            .map((value) => value.trim())
            .filter(Boolean),
          marketplaceAliases: String(formData.get("marketplaceAliases") ?? "")
            .split(/\r?\n|,/)
            .map((value) => value.trim())
            .filter(Boolean),
        }),
      });

      const payload = await response.json();
      setMessage(
        response.ok
          ? locale === "fr"
            ? "Client cree."
            : "Customer created."
          : payload.message ?? "Unable to create customer.",
      );

      if (response.ok) {
        form.reset();
        setIsCreateOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className={`grid gap-4 ${canCreate ? "lg:grid-cols-[18rem_minmax(0,1fr)]" : ""}`}>
        {canCreate ? (
          <section className="glass-card rounded-[1.5rem] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {locale === "fr" ? "Nouveau client" : "New customer"}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {locale === "fr" ? "Ajouter un client" : "Add customer"}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={toggleCreateOpen}
                aria-label={isCreateOpen ? (locale === "fr" ? "Fermer" : "Close") : (locale === "fr" ? "Ajouter un client" : "Add customer")}
                className="h-10 w-10 rounded-full p-0"
              >
                {isCreateOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </section>
        ) : null}

        <section className="glass-card rounded-[1.5rem] p-6">
          <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">
            {locale === "fr" ? "Recherche client" : "Customer search"}
          </label>
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={
              locale === "fr"
                ? "Rechercher un client..."
                : "Search customers..."
            }
          />
        </section>
      </div>

      {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}

      {canCreate && isCreateOpen ? (
        <section className="glass-card rounded-[1.5rem] p-6">
          <form ref={createFormRef} onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Input name="name" required placeholder={locale === "fr" ? "Nom" : "Name"} />
            <Input name="email" type="email" placeholder="Email" />
            <Input name="phone" placeholder={locale === "fr" ? "Telephone" : "Phone"} />
            <Input name="customerCode" placeholder={locale === "fr" ? "Code client (optionnel)" : "Customer code (optional)"} />
            <Input
              name="referencePrefix"
              placeholder={locale === "fr" ? "Prefixe reference" : "Reference prefix"}
            />
            <Textarea
              name="receiverAliases"
              rows={3}
              className="md:col-span-2"
              placeholder={
                locale === "fr"
                  ? "Alias reception, un par ligne"
                  : "Receiver aliases, one per line"
              }
            />
            <Textarea
              name="receiverPhones"
              rows={3}
              className="md:col-span-2"
              placeholder={
                locale === "fr"
                  ? "Telephones Chine, un par ligne"
                  : "China phone numbers, one per line"
              }
            />
            <Textarea
              name="marketplaceAliases"
              rows={3}
              className="md:col-span-2"
              placeholder={
                locale === "fr"
                  ? "Codes etiquette / marketplace, un par ligne (ex: EXP3166)"
                  : "Label or marketplace codes, one per line (e.g. EXP3166)"
              }
            />
            <div className="flex items-center gap-3 md:col-span-2 xl:col-span-4">
              <Button type="submit" disabled={isPending}>
                {locale === "fr" ? "Creer" : "Create"}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredCustomers.map((customer) => (
          <div key={customer.id} className="glass-card rounded-[1.5rem] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
              {customer.customerCode}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
              {customer.referencePrefix ?? "—"}
            </p>
            <h2 className="mt-2 text-xl font-black">{customer.name}</h2>
            <p className="mt-3 text-sm text-[var(--muted)]">{customer.email ?? "—"}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{customer.phone ?? "—"}</p>
            {customer.aliases.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {customer.aliases.map((alias) => (
                  <span
                    key={alias.id}
                    className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)]"
                  >
                    {alias.value}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {filteredCustomers.length === 0 ? (
          <div className="glass-card rounded-[1.5rem] p-5 text-sm text-[var(--muted)]">
            {locale === "fr"
              ? "Aucun client ne correspond a votre recherche."
              : "No customers matched your search."}
          </div>
        ) : null}
      </section>
    </div>
  );
}
