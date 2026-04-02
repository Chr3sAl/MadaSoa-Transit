import { createTrackingCandidate, pickBestTrackingCandidate } from "@/lib/intake-tracking";
import type {
  IntakeTrackingCandidate,
  IntakeTrackingConfidence,
  IntakeTrackingSource,
} from "@/lib/types";
import { normalizeLookupValue } from "@/lib/utils";

export type IntakeOcrParseResult = {
  normalizedText: string;
  searchableText: string;
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
  declaredValue: number | null;
  actualWeightKg: number | null;
  suggestedNotes: string | null;
};

const fieldLineStopPattern =
  /(寄付款|到付款|代收货款|重量|体积|件数|货物|备注|各注|服务方式|承运网点|到达网点|制作时间|制单时间)/;

const receiverFieldPattern = /(?:收件人|收货人|CONSIGNEE|RECEIVER)/i;
const boundedPhonePattern = /(?<!\d)1\d{10}(?!\d)/;

const courierSignatures = [
  { keywords: ["壹米滴答", "YIMIDIDA"], label: "Yimidida" },
  { keywords: ["极兔", "J&T", "JT"], label: "J&T Express" },
  { keywords: ["顺丰", "SF"], label: "SF Express" },
  { keywords: ["京东", "JD"], label: "JD Logistics" },
  { keywords: ["中通", "ZTO"], label: "ZTO" },
  { keywords: ["圆通", "YTO"], label: "YTO" },
  { keywords: ["申通", "STO"], label: "STO" },
  { keywords: ["韵达", "YUNDA", "YD"], label: "Yunda" },
  { keywords: ["EMS"], label: "EMS" },
  { keywords: ["德邦", "DEPPON"], label: "Deppon" },
] as const;

const courierTrackingPrefixes = ["JT", "SF", "JD", "YT", "YD", "EMS", "ZTO", "YTO", "STO"] as const;

const customerCodePatterns = [
  /\b(C\d{3,6})\b/i,
  /\b((?:EXP|VIP|MADA|MS|BP|BLUE|TIARE|TOKY)[-\s]?\d{3,8})\b/i,
  /(?:客户码|客户编号|客户代号|会员码|客编|编号|CODE|ID)\s*[:#-]?\s*([A-Z0-9-]{4,16})\b/i,
  /\b([A-Z]{2,5}[-\s]?\d{3,8})\b/i,
] as const;

function normalizeOcrText(input: string) {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/[：]/g, ":")
    .replace(/[；]/g, ";")
    .replace(/[，]/g, ",")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/[【】]/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[｜|]/g, "I")
    .replace(/([\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/g, "$1")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toLines(input: string) {
  return normalizeOcrText(input)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeSearchableText(input: string) {
  return normalizeLookupValue(normalizeOcrText(input)).replace(/\s+/g, " ");
}

function parseNumber(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCodeValue(value: string) {
  return normalizeLookupValue(value)
    .replace(/\s*-\s*/g, "-")
    .replace(/([A-Z]{2,6})[\s-]+(?=\d)/, "$1");
}

function compactMatchValue(value: string) {
  return normalizeLookupValue(value).replace(/[^A-Z0-9]/g, "");
}

function sanitizeReceiverName(value: string) {
  const cleaned = value
    .replace(/^(收件人|收货人|consignee)[:\s]*/i, "")
    .replace(/(寄件人|发件人|sender).*$/i, "")
    .replace(/(电话|手机).*$/i, "")
    .replace(/(?<!\d)1\d{10}(?!\d).*/g, "")
    .replace(/[,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return null;
  }

  const firstToken = cleaned.split(" ").find(Boolean) ?? cleaned;

  if (/^[A-Z0-9-]{2,18}$/i.test(firstToken)) {
    return firstToken;
  }

  return cleaned.slice(0, 40);
}

function extractCustomerCode(rawText: string) {
  const normalized = normalizeOcrText(rawText);

  for (const pattern of customerCodePatterns) {
    const match = normalized.match(pattern)?.[1];

    if (!match) {
      continue;
    }

    const candidate = normalizeCodeValue(match);
    const compactCandidate = compactMatchValue(candidate);

    if (
      compactCandidate.length < 4 ||
      courierTrackingPrefixes.some((prefix) => compactCandidate.startsWith(prefix) && compactCandidate.length > prefix.length + 7)
    ) {
      continue;
    }

    return candidate;
  }

  return null;
}

function extractCourierCompany(rawText: string) {
  const normalized = normalizeSearchableText(rawText);
  const match = courierSignatures.find((signature) =>
    signature.keywords.some((keyword) => normalized.includes(normalizeLookupValue(keyword))),
  );

  return match?.label ?? null;
}

function scoreTrackingCandidate(candidate: string, line: string) {
  let score = 0;
  const upperLine = line.toUpperCase();
  const compactCandidate = candidate.replace(/[^A-Z0-9]/g, "");

  if (/^\d{12,20}$/.test(compactCandidate)) {
    score += 8;
  } else if (/^[A-Z0-9]{10,20}$/.test(compactCandidate)) {
    score += 6;
  }

  if (/^1\d{10}$/.test(compactCandidate)) {
    score -= 6;
  }

  if (courierTrackingPrefixes.some((prefix) => compactCandidate.startsWith(prefix))) {
    score += 6;
  }

  if (/^(?:EXP|VIP|MADA|TOKY)[A-Z0-9-]{2,}$/i.test(compactCandidate)) {
    score -= 5;
  }

  if (/(单号|运单|快递|物流|条码|扫码|查询|YIMIDIDA|壹米滴答)/i.test(upperLine)) {
    score += 4;
  }

  const compactLine = upperLine.replace(/\s+/g, "");
  if (compactLine === compactCandidate) {
    score += 3;
  }

  if (compactLine.length <= compactCandidate.length + 4) {
    score += 1;
  }

  if (/(收件人|寄件人|电话|手机)/i.test(upperLine)) {
    score -= 3;
  }

  if ((candidate.match(/-/g) ?? []).length >= 2) {
    score -= 3;
  }

  return score;
}

function extractTrackingCandidates(scanValue: string, ocrText?: string) {
  const lines = toLines(`${scanValue}\n${ocrText ?? ""}`);
  const scoredCandidates = new Map<string, { candidate: IntakeTrackingCandidate; score: number }>();

  for (const line of lines) {
    const normalizedLine = normalizeLookupValue(line);
    const compactLine = normalizedLine.replace(/[^A-Z0-9]/g, "");
    const matches = [
      ...(normalizedLine.match(/[A-Z0-9-]{8,20}/g) ?? []),
      ...(compactLine.match(/(?:[A-Z]{1,4}\d{8,18}|\d{12,20})/g) ?? []),
    ];

    for (const match of matches) {
      const candidate = createTrackingCandidate({
        value: match,
        source: "ocr",
      });

      if (!candidate) {
        continue;
      }

      const score = scoreTrackingCandidate(candidate.value, normalizedLine);
      const existing = scoredCandidates.get(candidate.value);

      if (!existing || score > existing.score) {
        scoredCandidates.set(candidate.value, { candidate, score });
      }
    }
  }

  const ranked = [...scoredCandidates.values()].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return right.candidate.value.length - left.candidate.value.length;
  });

  return ranked.map((entry) => entry.candidate);
}

function looksLikeAddressLine(line: string) {
  const cleaned = normalizeOcrText(line);
  return (
    /[省市区县镇乡街道路号楼室校园栋寓苑]/.test(cleaned) ||
    /\bID\b/i.test(cleaned) ||
    /\b(?:EXP|VIP|MADA|TOKY)[-\s]?\d{3,8}\b/i.test(cleaned) ||
    /\d{2,}/.test(cleaned)
  );
}

function extractReceiverName(rawText: string) {
  const flat = normalizeOcrText(rawText);
  const directMatch =
    flat.match(/(?:收件人|收货人|CONSIGNEE|RECEIVER)\s*:\s*([^\n]+)/i) ??
    flat.match(/(?:收件人|收货人|CONSIGNEE|RECEIVER)\s*([^\n]+)/i);

  if (directMatch?.[1]) {
    return sanitizeReceiverName(directMatch[1]);
  }

  const receiverLine = toLines(rawText).find((line) => receiverFieldPattern.test(line));
  if (receiverLine) {
    return sanitizeReceiverName(receiverLine);
  }

  const lines = toLines(rawText);
  const addressIndex = lines.findIndex((line) => looksLikeAddressLine(line));

  if (addressIndex > 0) {
    return sanitizeReceiverName(lines[addressIndex - 1] ?? "");
  }

  return null;
}

function extractReceiverPhone(rawText: string) {
  const normalized = normalizeOcrText(rawText);
  const receiverBlock =
    normalized.match(
      /(?:收件人|收货人|CONSIGNEE|RECEIVER)\s*:?\s*([\s\S]{0,160}?)(?:寄件人|发件人|寄付款|到付款|代收货款|重量\/体积|重量|服务方式|货物|备注|各注)/i,
    )?.[1] ??
    normalized.match(/(?:收件人|收货人|CONSIGNEE|RECEIVER)\s*:?\s*([\s\S]{0,160})/i)?.[1] ??
    "";

  const phoneMatch = receiverBlock.match(boundedPhonePattern);
  return phoneMatch?.[0] ?? normalized.match(boundedPhonePattern)?.[0] ?? null;
}

function extractReceiverAddress(rawText: string) {
  const lines = toLines(rawText);
  const receiverIndex = lines.findIndex((line) => receiverFieldPattern.test(line));
  const addressStartIndex = receiverIndex >= 0
    ? receiverIndex
    : lines.findIndex((line) => looksLikeAddressLine(line));

  if (addressStartIndex === -1) {
    return null;
  }

  const addressLines: string[] = [];

  for (let index = addressStartIndex; index < lines.length; index += 1) {
    const line = lines[index] ?? "";

    if (index > addressStartIndex && fieldLineStopPattern.test(line)) {
      break;
    }

    const cleaned = line
      .replace(/(?:收件人|收货人)[:：]?\s*/i, "")
      .replace(/(?:寄件人|发件人)[:：]?.*$/i, "")
      .replace(/(?<!\d)1\d{10}(?!\d)/g, "")
      .replace(/^[,.;:]+\s*/g, "")
      .replace(/^\b[Iil]\b\s*/g, "")
      .replace(/\s*\b[Iil]\b$/g, "")
      .replace(/[|]+/g, " ")
      .trim();

    if (!cleaned || cleaned.replace(/[\s,.;:]/g, "").length < 4) {
      continue;
    }

    const looksLikeAddress =
      /[省市区县镇乡街道路号楼室]/.test(cleaned) ||
      /\bID\b/i.test(cleaned) ||
      /\d{2,}/.test(cleaned);

    if ((index === addressStartIndex && looksLikeAddress) || index > addressStartIndex) {
      addressLines.push(cleaned);
    }
  }

  const address = addressLines.join(" ").replace(/\s+/g, " ").trim();
  return address.length >= 6 ? address : null;
}

function extractDeclaredValue(rawText: string) {
  const normalized = normalizeOcrText(rawText);
  const preferredPatterns = [
    /(?:保价|声明价值|货值)\s*:\s*([0-9]+(?:\.[0-9]+)?)/i,
    /(?:代收货款|到付款|COD)\s*:\s*([0-9]+(?:\.[0-9]+)?)/i,
  ];

  for (const pattern of preferredPatterns) {
    const match = normalized.match(pattern);
    const parsed = parseNumber(match?.[1]);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

function extractActualWeightKg(rawText: string) {
  const normalized = normalizeOcrText(rawText);
  const weightedMatch =
    normalized.match(/(?:重量\/体积|重量体积|计件重量|计费重量|重量)\s*:\s*([0-9]+(?:\.[0-9]+)?)\s*(?:KG|千克)/i) ??
    normalized.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:KG|千克)/i);

  return parseNumber(weightedMatch?.[1]);
}

function extractSuggestedNotes(rawText: string) {
  const normalized = normalizeOcrText(rawText);
  const noteParts: string[] = [];

  const goods = normalized.match(/(?:货物|品名)\s*:\s*([^\n]+)/i)?.[1]?.trim();
  const service = normalized.match(/(?:服务方式|运输方式)\s*:\s*([^\n]+)/i)?.[1]?.trim();
  const pieces = normalized.match(/(?:件数)\s*:\s*([0-9]+)/i)?.[1]?.trim();

  if (goods) {
    noteParts.push(`Goods: ${goods}`);
  }

  if (service) {
    noteParts.push(`Service: ${service}`);
  }

  if (pieces) {
    noteParts.push(`Pieces: ${pieces}`);
  }

  return noteParts.length > 0 ? noteParts.join(". ") : null;
}

export function parseIncomingParcelOcr(scanValue: string, ocrText?: string): IntakeOcrParseResult {
  const combinedText = `${scanValue}\n${ocrText ?? ""}`.trim();
  const normalizedText = normalizeOcrText(combinedText);
  const trackingCandidates = extractTrackingCandidates(scanValue, ocrText);
  const bestTrackingCandidate = pickBestTrackingCandidate(trackingCandidates);
  const chinaTrackingNumber = bestTrackingCandidate?.value ?? "";

  return {
    normalizedText,
    searchableText: normalizeSearchableText(combinedText),
    scanValue: chinaTrackingNumber || normalizeLookupValue(scanValue).trim(),
    chinaTrackingNumber,
    trackingSource: bestTrackingCandidate?.source ?? null,
    trackingConfidence: bestTrackingCandidate?.confidence ?? null,
    trackingCandidates,
    courierCompany: extractCourierCompany(combinedText),
    detectedCustomerCode: extractCustomerCode(combinedText),
    receiverNameRaw: extractReceiverName(ocrText ?? ""),
    receiverPhoneRaw: extractReceiverPhone(ocrText ?? ""),
    receiverAddressRaw: extractReceiverAddress(ocrText ?? ""),
    declaredValue: extractDeclaredValue(ocrText ?? ""),
    actualWeightKg: extractActualWeightKg(ocrText ?? ""),
    suggestedNotes: extractSuggestedNotes(ocrText ?? ""),
  };
}
