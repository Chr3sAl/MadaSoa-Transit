import type { ComponentPropsWithoutRef } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { IntakeManager } from "@/components/admin/intake-manager";
import { getDemoState, resetDemoState } from "@/lib/demo-data";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

vi.mock("next/image", () => ({
  default: (props: ComponentPropsWithoutRef<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt ?? ""} {...props} />
  ),
}));

const scanPreviewPayload = {
  scanType: "barcode" as const,
  rawScanValue: "JT5462439201446",
  scanValue: "JT5462439201446",
  chinaTrackingNumber: "JT5462439201446",
  trackingSource: "barcode" as const,
  trackingConfidence: "strong" as const,
  trackingCandidates: [
    {
      value: "JT5462439201446",
      source: "barcode" as const,
      kind: "tracking" as const,
      confidence: "strong" as const,
    },
  ],
  courierCompany: "J&T Express",
  detectedCustomerCode: null,
  actualWeightKg: null,
  resolvedCustomerId: null,
  resolvedBy: null,
  matches: [],
};

describe("IntakeManager", () => {
  beforeEach(() => {
    resetDemoState();
    refreshMock.mockReset();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => scanPreviewPayload,
    }));

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn(),
      },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
    Object.defineProperty(HTMLMediaElement.prototype, "pause", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLMediaElement.prototype, "readyState", {
      configurable: true,
      get: () => 4,
    });
    Object.defineProperty(HTMLVideoElement.prototype, "srcObject", {
      configurable: true,
      writable: true,
      value: null,
    });
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: vi.fn(() => ({
        drawImage: vi.fn(),
        getImageData: vi.fn(() => ({
          data: new Uint8ClampedArray(4),
        })),
        putImageData: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        imageSmoothingEnabled: true,
        imageSmoothingQuality: "high",
        filter: "none",
      })),
    });
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("scans with the live camera and fills the tracking preview", async () => {
    const stopMock = vi.fn();
    const getUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: stopMock }],
    } as unknown as MediaStream);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia,
      },
    });

    class MockBarcodeDetector {
      async detect() {
        return [{ rawValue: "JT5462439201446", format: "code_128" }];
      }
    }

    (
      window as Window & {
        BarcodeDetector?: unknown;
      }
    ).BarcodeDetector = MockBarcodeDetector;

    const demoState = getDemoState();

    render(
      <IntakeManager
        locale="en"
        customers={demoState.customers}
        incomingParcels={[]}
        canCreateCustomers
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Scan with camera" }));
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/intake/scan-preview",
        expect.objectContaining({
          method: "POST",
        }),
      );
    }, { timeout: 2500 });

    expect(screen.getAllByDisplayValue("JT5462439201446")).toHaveLength(2);
    expect(stopMock).toHaveBeenCalled();
  });

  it("shows a user-facing error when camera permission is denied", async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException("Denied", "NotAllowedError"));
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia,
      },
    });

    const demoState = getDemoState();

    render(
      <IntakeManager
        locale="en"
        customers={demoState.customers}
        incomingParcels={[]}
        canCreateCustomers
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Scan with camera" }));
    });

    await waitFor(() => {
      expect(
        screen.getByText("Camera access was blocked. Allow the camera or use the scan field instead."),
      ).toBeInTheDocument();
    }, { timeout: 2500 });

    expect(screen.getByText("Live camera scanner")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps the scanner open and explains that HTTPS is required when the page is not secure", async () => {
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: false,
    });

    const demoState = getDemoState();

    render(
      <IntakeManager
        locale="en"
        customers={demoState.customers}
        incomingParcels={[]}
        canCreateCustomers
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Scan with camera" }));
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          "Live camera scanning needs a secure HTTPS link or localhost. On iPhone, open the app through the HTTPS ngrok URL.",
        ),
      ).toBeInTheDocument();
    }, { timeout: 2500 });

    expect(screen.getByText("Live camera scanner")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
