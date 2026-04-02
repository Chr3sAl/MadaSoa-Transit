import { afterEach, describe, expect, it, vi } from "vitest";

import {
  NGROK_SKIP_WARNING_HEADER,
  installNgrokFetchBypass,
  shouldAddNgrokBypassHeader,
  shouldEnableNgrokFetchBypass,
  withNgrokBypassHeader,
} from "@/lib/ngrok-fetch";

describe("ngrok fetch bypass", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("enables the bypass only for free ngrok hosts outside production", () => {
    expect(shouldEnableNgrokFetchBypass("development", "demo.ngrok-free.dev")).toBe(true);
    expect(shouldEnableNgrokFetchBypass("test", "demo.ngrok-free.app")).toBe(true);
    expect(shouldEnableNgrokFetchBypass("development", "localhost")).toBe(false);
    expect(shouldEnableNgrokFetchBypass("production", "demo.ngrok-free.dev")).toBe(false);
  });

  it("targets same-origin relative and absolute requests only", () => {
    const context = {
      hostname: "demo.ngrok-free.dev",
      origin: "https://demo.ngrok-free.dev",
      nodeEnv: "development",
    };

    expect(shouldAddNgrokBypassHeader("/api/auth/session", context)).toBe(true);
    expect(shouldAddNgrokBypassHeader("https://demo.ngrok-free.dev/api/auth/session", context)).toBe(
      true,
    );
    expect(shouldAddNgrokBypassHeader("https://example.com/api/auth/session", context)).toBe(false);
  });

  it("merges the ngrok header into same-origin init headers", () => {
    const { init } = withNgrokBypassHeader(
      "/api/admin/intake",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-test": "1",
        },
      },
      {
        hostname: "demo.ngrok-free.dev",
        origin: "https://demo.ngrok-free.dev",
        nodeEnv: "development",
      },
    );

    const headers = new Headers(init?.headers);

    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("x-test")).toBe("1");
    expect(headers.get(NGROK_SKIP_WARNING_HEADER)).toBe("true");
  });

  it("leaves cross-origin requests untouched", () => {
    const originalInit = {
      headers: {
        "x-test": "1",
      },
    };

    const patched = withNgrokBypassHeader(
      "https://example.com/api",
      originalInit,
      {
        hostname: "demo.ngrok-free.dev",
        origin: "https://demo.ngrok-free.dev",
        nodeEnv: "development",
      },
    );

    expect(patched.init).toBe(originalInit);
    expect(patched.input).toBe("https://example.com/api");
  });

  it("patches window.fetch without duplicating existing headers", async () => {
    const originalFetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const mockWindow = {
      location: {
        hostname: "demo.ngrok-free.dev",
        origin: "https://demo.ngrok-free.dev",
      },
      fetch: originalFetch,
    } as unknown as Window;

    const cleanup = installNgrokFetchBypass(mockWindow, "development");

    await mockWindow.fetch("/api/admin/intake", {
      headers: {
        [NGROK_SKIP_WARNING_HEADER]: "already-set",
      },
    });

    const [, init] = originalFetch.mock.calls[0];
    const headers = new Headers(init.headers);

    expect(headers.get(NGROK_SKIP_WARNING_HEADER)).toBe("already-set");

    cleanup();
  });
});
