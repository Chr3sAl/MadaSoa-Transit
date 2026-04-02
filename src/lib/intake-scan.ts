import { createTrackingCandidate } from "@/lib/intake-tracking";
import type {
  IntakeScanType,
  IntakeTrackingCandidate,
  IntakeTrackingConfidence,
  IntakeTrackingSource,
} from "@/lib/types";
import { parseIncomingParcelOcr } from "@/lib/intake-ocr";
import { normalizeLookupValue } from "@/lib/utils";

type ScanDecodeResult = {
  scanType: IntakeScanType;
  rawScanValue: string;
  decodedPayload: Record<string, string> | null;
  scanValue: string;
  chinaTrackingNumber: string;
  trackingSource: IntakeTrackingSource | null;
  trackingConfidence: IntakeTrackingConfidence | null;
  trackingCandidates: IntakeTrackingCandidate[];
  courierCompany: string | null;
  detectedCustomerCode: string | null;
  receiverNameRaw: string | null;
  receiverPhoneRaw: string | null;
  receiverAddressRaw: string | null;
  actualWeightKg: number | null;
  searchableText: string;
};

const trackingParamNames = [
  "waybillno",
  "waybill_no",
  "trackingno",
  "tracking_no",
  "trackingnumber",
  "tracking_number",
  "mailno",
  "mail_no",
  "expressno",
  "express_no",
  "billno",
  "bill_no",
  "logisticsno",
  "logistics_no",
  "nu",
  "kdh",
  "barcode",
] as const;

function normalizeScanFormat(scanFormat?: string) {
  return scanFormat?.trim().toLowerCase() ?? "";
}

function detectScanType(rawScanValue: string, scanFormat?: string): IntakeScanType {
  const normalizedFormat = normalizeScanFormat(scanFormat);

  if (normalizedFormat === "qr_code") {
    return "qr";
  }

  if (normalizedFormat.length > 0) {
    return "barcode";
  }

  if (/^https?:\/\//i.test(rawScanValue)) {
    return "qr";
  }

  return "manual";
}

function detectCourierFromText(input: string) {
  const normalized = normalizeLookupValue(input);

  if (normalized.includes("YIMIDIDA") || normalized.includes("壹米滴答")) {
    return "Yimidida";
  }

  if (normalized.includes("J&T") || normalized.includes("极兔") || normalized.includes("JT")) {
    return "J&T Express";
  }

  if (normalized.includes("SF") || normalized.includes("顺丰")) {
    return "SF Express";
  }

  if (normalized.includes("JD") || normalized.includes("京东")) {
    return "JD Logistics";
  }

  if (normalized.includes("ZTO") || normalized.includes("中通")) {
    return "ZTO";
  }

  if (normalized.includes("YTO") || normalized.includes("圆通")) {
    return "YTO";
  }

  if (normalized.includes("STO") || normalized.includes("申通")) {
    return "STO";
  }

  if (normalized.includes("韵达") || normalized.includes("YUNDA") || normalized.includes("YD")) {
    return "Yunda";
  }

  if (normalized.includes("EMS")) {
    return "EMS";
  }

  return null;
}

function decodeUrlPayload(rawScanValue: string) {
  if (!/^https?:\/\//i.test(rawScanValue)) {
    return null;
  }

  try {
    const url = new URL(rawScanValue);
    const decodedPayload: Record<string, string> = {
      url: url.toString(),
      host: url.host,
      pathname: url.pathname,
    };

    for (const [key, value] of url.searchParams.entries()) {
      if (value.trim()) {
        decodedPayload[key] = value.trim();
      }
    }

    const queryTracking = trackingParamNames
      .map((key) => {
        const matchingKey = Object.keys(decodedPayload).find(
          (candidate) => candidate.toLowerCase() === key,
        );
        return matchingKey ? decodedPayload[matchingKey] : undefined;
      })
      .find((value) => typeof value === "string" && value.trim().length > 0);

    const customerCode =
      decodedPayload.customerCode ??
      decodedPayload.customer_code ??
      decodedPayload.custCode ??
      decodedPayload.cust_code ??
      null;

    const courierCompany =
      detectCourierFromText(`${url.host} ${url.pathname}`) ??
      detectCourierFromText(Object.values(decodedPayload).join(" "));

    return {
      decodedPayload,
      queryTracking: queryTracking ?? "",
      customerCode,
      courierCompany,
    };
  } catch {
    return null;
  }
}

export function parseIncomingParcelScan(rawScanValue: string, scanFormat?: string): ScanDecodeResult {
  const trimmedScanValue = rawScanValue.trim();
  const scanType = detectScanType(trimmedScanValue, scanFormat);
  const decodedUrl = decodeUrlPayload(trimmedScanValue);
  const combinedText = decodedUrl
    ? [trimmedScanValue, ...Object.entries(decodedUrl.decodedPayload).map(([key, value]) => `${key}: ${value}`)].join("\n")
    : trimmedScanValue;
  const parsed = parseIncomingParcelOcr("", combinedText);
  const scanSource = scanType === "qr" ? "qr" : scanType === "barcode" ? "barcode" : "manual";
  const trackingCandidates: IntakeTrackingCandidate[] = [];
  const directCandidate = createTrackingCandidate({
    value: decodedUrl?.queryTracking || trimmedScanValue,
    source: scanSource,
  });

  if (directCandidate) {
    trackingCandidates.push(directCandidate);
  }

  return {
    scanType,
    rawScanValue: trimmedScanValue,
    decodedPayload: decodedUrl?.decodedPayload ?? null,
    scanValue: directCandidate?.value || parsed.scanValue,
    chinaTrackingNumber: directCandidate?.kind === "tracking" ? directCandidate.value : "",
    trackingSource: directCandidate?.kind === "tracking" ? directCandidate.source : null,
    trackingConfidence: directCandidate?.kind === "tracking" ? directCandidate.confidence : null,
    trackingCandidates,
    courierCompany: parsed.courierCompany ?? decodedUrl?.courierCompany ?? null,
    detectedCustomerCode: parsed.detectedCustomerCode ?? customerCodeOrNull(decodedUrl?.customerCode),
    receiverNameRaw: parsed.receiverNameRaw ?? null,
    receiverPhoneRaw: parsed.receiverPhoneRaw ?? null,
    receiverAddressRaw: parsed.receiverAddressRaw ?? null,
    actualWeightKg: parsed.actualWeightKg ?? null,
    searchableText: parsed.searchableText,
  };
}

function customerCodeOrNull(value?: string | null) {
  const normalized = value ? normalizeLookupValue(value).trim() : "";
  return normalized.length > 0 ? normalized : null;
}
