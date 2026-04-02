import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

function collectAllowedDevOrigins() {
  const values = new Set<string>(["localhost", "127.0.0.1"]);

  for (const candidate of [process.env.NEXTAUTH_URL, process.env.LAN_DEV_ORIGIN]) {
    if (!candidate?.trim()) {
      continue;
    }

    try {
      const url = new URL(candidate);
      values.add(url.hostname);
    } catch {
      values.add(
        candidate
          .trim()
          .replace(/^https?:\/\//i, "")
          .replace(/:\d+$/, ""),
      );
    }
  }

  return [...values];
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: collectAllowedDevOrigins(),
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
