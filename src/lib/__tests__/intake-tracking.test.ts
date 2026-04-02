import {
  createTrackingCandidate,
  mergeTrackingCandidates,
  pickBestTrackingCandidate,
} from "@/lib/intake-tracking";

describe("intake tracking candidate ranking", () => {
  it("classifies short warehouse sort values as route codes", () => {
    const candidate = createTrackingCandidate({
      value: "U7040099",
      source: "barcode",
    });

    expect(candidate?.value).toBe("U7040099");
    expect(candidate?.kind).toBe("route_code");
    expect(candidate?.confidence).toBe("strong");
  });

  it("prefers a real courier tracking number over a route code", () => {
    const candidates = mergeTrackingCandidates([
      { value: "U7040099", source: "barcode" },
      { value: "JT3155071032658", source: "barcode" },
      { value: "EXP3166", source: "ocr" },
    ]);
    const best = pickBestTrackingCandidate(candidates);

    expect(best?.value).toBe("JT3155071032658");
    expect(best?.kind).toBe("tracking");
    expect(candidates[0]?.value).toBe("JT3155071032658");
  });
});
