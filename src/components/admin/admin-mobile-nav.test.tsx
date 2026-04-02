import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => {
    if (namespace === "common" && key === "signOut") {
      return "Sign out";
    }

    return `${namespace}.${key}`;
  },
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

describe("AdminMobileNav", () => {
  it("shows three primary sections and a more menu when there are many admin areas", () => {
    render(
      <AdminMobileNav
        locale="en"
        active="intake"
        currentPath="/admin/intake"
        roleLabel="Admin"
        userName="MadaSoa Admin"
        userEmail="admin@madasoatransit.local"
        demoWarning="Demo mode is active."
        items={[
          { key: "dashboard", href: "/admin", label: "Dashboard", mobileLabel: "Home" },
          { key: "intake", href: "/admin/intake", label: "Intake", mobileLabel: "Intake" },
          { key: "shipments", href: "/admin/shipments", label: "Shipments", mobileLabel: "Shipments" },
          { key: "customers", href: "/admin/customers", label: "Customers", mobileLabel: "Clients" },
          { key: "reports", href: "/admin/reports", label: "Reports", mobileLabel: "Reports" },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: /Home/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Intake/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Shipments/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /More/i })).toBeInTheDocument();
  });

  it("opens the more sheet and exposes the remaining sections and account actions", () => {
    render(
      <AdminMobileNav
        locale="en"
        active="dashboard"
        currentPath="/admin"
        roleLabel="Admin"
        userName="MadaSoa Admin"
        userEmail="admin@madasoatransit.local"
        demoWarning="Demo mode is active."
        items={[
          { key: "dashboard", href: "/admin", label: "Dashboard", mobileLabel: "Home" },
          { key: "intake", href: "/admin/intake", label: "Intake", mobileLabel: "Intake" },
          { key: "shipments", href: "/admin/shipments", label: "Shipments", mobileLabel: "Shipments" },
          { key: "customers", href: "/admin/customers", label: "Customers", mobileLabel: "Clients" },
          { key: "reports", href: "/admin/reports", label: "Reports", mobileLabel: "Reports" },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /More/i }));

    expect(screen.getByText("Mobile navigation")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Customers/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Reports/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign out/i })).toBeInTheDocument();
  });
});
