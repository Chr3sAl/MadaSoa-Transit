"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

type LogoutButtonProps = {
  locale: string;
};

export function LogoutButton({ locale }: LogoutButtonProps) {
  const t = useTranslations("common");

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => signOut({ callbackUrl: `/${locale}/admin/login` })}
      className="gap-2"
    >
      <LogOut className="h-4 w-4" />
      {t("signOut")}
    </Button>
  );
}
