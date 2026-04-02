import type { Metadata } from "next";
import Script from "next/script";

import { NgrokFetchBootstrap } from "@/components/app/ngrok-fetch-bootstrap";
import "./globals.css";

export const metadata: Metadata = {
  title: "MadaSoa Transit",
  description: "Bilingual shipment tracking and logistics suite for MadaSoa Transit.",
};

const themeScript = `
  try {
    const storedTheme = window.localStorage.getItem("madasoa-theme");
    const theme = storedTheme === "light" || storedTheme === "dark" ? storedTheme : "dark";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
  }
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" data-theme="dark" suppressHydrationWarning>
      <body className="page-backdrop min-h-full flex flex-col">
        <Script id="madasoa-theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <NgrokFetchBootstrap />
        {children}
      </body>
    </html>
  );
}
