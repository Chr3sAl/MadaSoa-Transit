import { ZodError } from "zod";

const defaultFieldMessages: Record<string, string> = {
  scanValue: "Scan value could not be detected. Scan again or type the tracking number.",
  chinaTrackingNumber: "China tracking number is required.",
  actualWeightKg: "Actual weight must be greater than 0.",
  declaredValue: "Declared value is required.",
  images: "Add at least one parcel photo before saving.",
  transportType: "Select a transport type.",
};

export function formatZodErrorMessage(error: ZodError, fallback: string) {
  const messages = error.issues.map((issue) => {
    const field = String(issue.path[issue.path.length - 1] ?? "");
    return defaultFieldMessages[field] ?? issue.message;
  });

  const uniqueMessages = [...new Set(messages.filter(Boolean))];
  return uniqueMessages.length > 0 ? uniqueMessages.join(" ") : fallback;
}
