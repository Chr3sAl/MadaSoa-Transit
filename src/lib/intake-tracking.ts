import type {
  IntakeTrackingCandidate,
  IntakeTrackingCandidateInput,
  IntakeTrackingCandidateKind,
  IntakeTrackingConfidence,
} from "@/lib/types";
import { normalizeLookupValue } from "@/lib/utils";

const courierTrackingPrefixes = ["JT", "SF", "JD", "YT", "YD", "EMS", "ZTO", "YTO", "STO"] as const;
const customerCodePattern =
  /^(?:C\d{3,6}|(?:EXP|VIP|MADA|MS|BP|BLUE|TIARE|TOKY)[-\s]?\d{3,8})$/i;

export function normalizeTrackingCandidateValue(value: string) {
  const trimmed = value.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  let normalized = normalizeLookupValue(trimmed).replace(/\s+/g, "");
  normalized = normalized.replace(/O(?=\d)/g, "0").replace(/(?<=\d)O/g, "0");

  if (/^[I1L][T7]\d{8,18}$/.test(normalized)) {
    return `JT${normalized.slice(2)}`;
  }

  if (/^J[I1L7]\d{8,18}$/.test(normalized)) {
    return `JT${normalized.slice(2)}`;
  }

  if (/^[I1L][J7]\d{8,18}$/.test(normalized)) {
    return `JT${normalized.slice(2)}`;
  }

  return normalized;
}

function compactOriginalValue(value: string) {
  return normalizeLookupValue(value).replace(/\s+/g, "");
}

function classifyKind(value: string) {
  const normalized = normalizeTrackingCandidateValue(value);
  const originalCompact = compactOriginalValue(value);

  if (!normalized) {
    return {
      kind: "unknown",
      confidence: "weak",
    } satisfies {
      kind: IntakeTrackingCandidateKind;
      confidence: IntakeTrackingConfidence;
    };
  }

  if (customerCodePattern.test(normalized)) {
    return {
      kind: "customer_code",
      confidence: "weak",
    } satisfies {
      kind: IntakeTrackingCandidateKind;
      confidence: IntakeTrackingConfidence;
    };
  }

  if (/^\d{12,20}$/.test(normalized)) {
    return {
      kind: "tracking",
      confidence: "strong",
    } satisfies {
      kind: IntakeTrackingCandidateKind;
      confidence: IntakeTrackingConfidence;
    };
  }

  if (
    courierTrackingPrefixes.some((prefix) => normalized.startsWith(prefix)) &&
    normalized.length >= 10
  ) {
    return {
      kind: "tracking",
      confidence: "strong",
    } satisfies {
      kind: IntakeTrackingCandidateKind;
      confidence: IntakeTrackingConfidence;
    };
  }

  if (
    /^\d{3}[A-Z]\d{3,4}(?:-\d{2,4}){1,2}$/i.test(value) ||
    /^[A-Z]\d{3,4}(?:-\d{2,4}){1,2}$/i.test(value) ||
    /^\d{3}[A-Z]\d{6,10}$/i.test(originalCompact) ||
    /^[A-Z]\d{7,9}$/i.test(originalCompact)
  ) {
    return {
      kind: "route_code",
      confidence: "strong",
    } satisfies {
      kind: IntakeTrackingCandidateKind;
      confidence: IntakeTrackingConfidence;
    };
  }

  if (/^[A-Z0-9]{10,20}$/.test(normalized)) {
    return {
      kind: "tracking",
      confidence: "weak",
    } satisfies {
      kind: IntakeTrackingCandidateKind;
      confidence: IntakeTrackingConfidence;
    };
  }

  if (/[A-Z]/.test(originalCompact) && originalCompact.length >= 6 && originalCompact.length <= 10) {
    return {
      kind: "route_code",
      confidence: "weak",
    } satisfies {
      kind: IntakeTrackingCandidateKind;
      confidence: IntakeTrackingConfidence;
    };
  }

  return {
    kind: "unknown",
    confidence: "weak",
  } satisfies {
    kind: IntakeTrackingCandidateKind;
    confidence: IntakeTrackingConfidence;
  };
}

export function createTrackingCandidate(
  input: IntakeTrackingCandidateInput,
): IntakeTrackingCandidate | null {
  const normalizedValue = normalizeTrackingCandidateValue(input.value);

  if (!normalizedValue) {
    return null;
  }

  const classification = classifyKind(input.value);

  return {
    value: normalizedValue,
    source: input.source,
    kind: classification.kind,
    confidence: classification.confidence,
  };
}

function candidateStrength(candidate: IntakeTrackingCandidate) {
  const kindScore =
    candidate.kind === "tracking"
      ? 40
      : candidate.kind === "route_code"
        ? 20
        : candidate.kind === "customer_code"
          ? 10
          : 0;
  const confidenceScore = candidate.confidence === "strong" ? 6 : 0;
  const sourceScore =
    candidate.source === "qr"
      ? 4
      : candidate.source === "barcode"
        ? 3
        : candidate.source === "ocr"
          ? 2
          : 1;

  return kindScore + confidenceScore + sourceScore + Math.min(candidate.value.length, 20);
}

export function mergeTrackingCandidates(
  inputs: Array<IntakeTrackingCandidate | IntakeTrackingCandidateInput | null | undefined>,
) {
  const byValue = new Map<string, IntakeTrackingCandidate>();

  for (const input of inputs) {
    const candidate = !input
      ? null
      : "kind" in input
        ? input
        : createTrackingCandidate(input);

    if (!candidate) {
      continue;
    }

    const existing = byValue.get(candidate.value);

    if (!existing || candidateStrength(candidate) > candidateStrength(existing)) {
      byValue.set(candidate.value, candidate);
    }
  }

  return [...byValue.values()].sort((left, right) => candidateStrength(right) - candidateStrength(left));
}

export function pickBestTrackingCandidate(candidates: IntakeTrackingCandidate[]) {
  return candidates.find((candidate) => candidate.kind === "tracking") ?? null;
}
