"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Role, UserRecord } from "@/lib/types";

type UsersManagerProps = {
  locale: "fr" | "en";
  users: UserRecord[];
  canCreate: boolean;
};

const roleOptions: Role[] = ["admin", "operator", "finance"];
const selectClassName =
  "h-12 rounded-2xl border border-[var(--line)] bg-[var(--field)] px-4 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:bg-[var(--field-focus)] focus:ring-4 focus:ring-[var(--accent-soft)]";

export function UsersManager({ locale, users, canCreate }: UsersManagerProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          role: formData.get("role"),
          password: formData.get("password"),
        }),
      });

      const payload = await response.json();
      setMessage(
        response.ok
          ? locale === "fr"
            ? "Utilisateur cree."
            : "User created."
          : payload.message ?? "Unable to create user.",
      );

      if (response.ok) {
        (event.target as HTMLFormElement).reset();
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {canCreate ? (
        <section className="glass-card rounded-[1.5rem] p-6">
          <h2 className="text-xl font-black">{locale === "fr" ? "Ajouter un membre" : "Add team member"}</h2>
          <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Input name="name" required placeholder={locale === "fr" ? "Nom" : "Name"} />
            <Input name="email" required type="email" placeholder="Email" />
            <select
              name="role"
              defaultValue="operator"
              className={selectClassName}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <Input name="password" required placeholder="Password" />
            <div className="md:col-span-2 xl:col-span-4 flex items-center gap-3">
              <Button type="submit" disabled={isPending}>
                {locale === "fr" ? "Creer" : "Create"}
              </Button>
              {message ? <span className="text-sm text-[var(--muted)]">{message}</span> : null}
            </div>
          </form>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {users.map((user) => (
          <div key={user.id} className="glass-card rounded-[1.5rem] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-black">{user.name}</p>
                <p className="text-sm text-[var(--muted)]">{user.email}</p>
              </div>
              <Badge tone={user.role === "admin" ? "accent" : user.role === "finance" ? "warning" : "neutral"}>
                {user.role}
              </Badge>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
