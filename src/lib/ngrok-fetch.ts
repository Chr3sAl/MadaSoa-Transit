export const NGROK_SKIP_WARNING_HEADER = "ngrok-skip-browser-warning";
export const NGROK_SKIP_WARNING_VALUE = "true";

type NgrokFetchContext = {
  hostname: string;
  origin: string;
  nodeEnv?: string;
};

type PatchedWindow = Window & {
  __madasoaOriginalFetch?: typeof window.fetch;
  __madasoaNgrokFetchPatched?: boolean;
};

export function isNgrokFreeHostname(hostname: string) {
  const normalized = hostname.trim().toLowerCase();

  return normalized.endsWith(".ngrok-free.dev") || normalized.endsWith(".ngrok-free.app");
}

export function shouldEnableNgrokFetchBypass(nodeEnv: string | undefined, hostname: string) {
  return nodeEnv !== "production" && isNgrokFreeHostname(hostname);
}

function resolveRequestUrl(input: RequestInfo | URL, origin: string) {
  const rawUrl =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  try {
    return new URL(rawUrl, origin);
  } catch {
    return null;
  }
}

export function shouldAddNgrokBypassHeader(
  input: RequestInfo | URL,
  { hostname, origin, nodeEnv }: NgrokFetchContext,
) {
  if (!shouldEnableNgrokFetchBypass(nodeEnv, hostname)) {
    return false;
  }

  const requestUrl = resolveRequestUrl(input, origin);

  if (!requestUrl) {
    return false;
  }

  return requestUrl.origin === origin;
}

function mergeHeaders(headersInit?: HeadersInit) {
  const headers = new Headers(headersInit);

  if (!headers.has(NGROK_SKIP_WARNING_HEADER)) {
    headers.set(NGROK_SKIP_WARNING_HEADER, NGROK_SKIP_WARNING_VALUE);
  }

  return headers;
}

export function withNgrokBypassHeader(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  context: NgrokFetchContext,
) {
  if (!shouldAddNgrokBypassHeader(input, context)) {
    return { input, init };
  }

  if (typeof Request !== "undefined" && input instanceof Request) {
    const headers = mergeHeaders(input.headers);

    if (init?.headers) {
      const overrideHeaders = new Headers(init.headers);

      overrideHeaders.forEach((value, key) => {
        headers.set(key, value);
      });

      if (!overrideHeaders.has(NGROK_SKIP_WARNING_HEADER)) {
        headers.set(NGROK_SKIP_WARNING_HEADER, NGROK_SKIP_WARNING_VALUE);
      }
    }

    return {
      input: new Request(input, {
        ...init,
        headers,
      }),
      init: undefined,
    };
  }

  return {
    input,
    init: {
      ...init,
      headers: mergeHeaders(init?.headers),
    },
  };
}

export function installNgrokFetchBypass(targetWindow: Window, nodeEnv = process.env.NODE_ENV) {
  const patchedWindow = targetWindow as PatchedWindow;

  if (!shouldEnableNgrokFetchBypass(nodeEnv, targetWindow.location.hostname)) {
    return () => {};
  }

  if (patchedWindow.__madasoaNgrokFetchPatched) {
    return () => {};
  }

  const originalFetch = targetWindow.fetch.bind(targetWindow);

  patchedWindow.__madasoaOriginalFetch = originalFetch;
  patchedWindow.__madasoaNgrokFetchPatched = true;

  patchedWindow.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const patchedRequest = withNgrokBypassHeader(input, init, {
      hostname: targetWindow.location.hostname,
      origin: targetWindow.location.origin,
      nodeEnv,
    });

    return originalFetch(patchedRequest.input, patchedRequest.init);
  }) as typeof window.fetch;

  return () => {
    if (patchedWindow.__madasoaOriginalFetch) {
      patchedWindow.fetch = patchedWindow.__madasoaOriginalFetch;
      delete patchedWindow.__madasoaOriginalFetch;
      delete patchedWindow.__madasoaNgrokFetchPatched;
    }
  };
}
