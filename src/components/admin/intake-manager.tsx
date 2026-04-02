"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Camera, LoaderCircle, PackagePlus, ScanLine, UserRoundCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createTrackingCandidate, mergeTrackingCandidates, pickBestTrackingCandidate } from "@/lib/intake-tracking";
import type {
  CustomerRecord,
  IncomingParcelWithRelations,
  IntakePreviewResult,
  IntakeScanType,
  IntakeTrackingCandidateInput,
  TransportType,
} from "@/lib/types";
import { transportTypes } from "@/lib/types";

type IntakeManagerProps = {
  locale: "fr" | "en";
  customers: CustomerRecord[];
  incomingParcels: IncomingParcelWithRelations[];
  canCreateCustomers: boolean;
};

type IntakeFormState = {
  scanValue: string;
  chinaTrackingNumber: string;
  courierCompany: string;
  customerId: string;
  matchedBy: string;
  declaredValue: string;
  declaredCurrency: string;
  actualWeightKg: string;
  transportType: TransportType;
  notes: string;
  shelfLocation: string;
};

type BarcodeDetectorResult = {
  rawValue?: string;
  format?: string;
};

type BarcodeDetectorCtor = new (options?: {
  formats?: string[];
}) => {
  detect: (source: ImageBitmapSource) => Promise<BarcodeDetectorResult[]>;
};

type ZxingScannerControls = {
  stop: () => void;
};

type DetectedScan = {
  rawValue: string;
  format?: string;
  scanType: IntakeScanType;
};

type ScanCopy = {
  title: string;
  description: string;
  fallbackLink: string;
  intakeCard: string;
  intakeLead: string;
  analyze: string;
  analyzing: string;
  scanCamera: string;
  cameraTitle: string;
  cameraLead: string;
  cameraOpening: string;
  cameraSearching: string;
  cameraClose: string;
  cameraUnsupported: string;
  cameraSecureContext: string;
  cameraPermissionDenied: string;
  cameraCaptureFailed: string;
  scanLabel: string;
  scanPlaceholder: string;
  matchCard: string;
  noSuggestion: string;
  resolved: string;
  candidates: string;
  createShipment: string;
  createAndReset: string;
  saveUnassigned: string;
  intakeForm: string;
  intakeHint: string;
  unassignedTitle: string;
  unassignedEmpty: string;
  assign: string;
  recentTitle: string;
  recentEmpty: string;
  customerOptional: string;
  manualMatch: string;
  barcodeSupport: string;
  previewLabel: string;
  linkedShipment: string;
  labelWeight: string;
  declaredValue: string;
  declaredCurrency: string;
  weight: string;
  shelf: string;
  courier: string;
  notes: string;
  chinaTracking: string;
  customerCode: string;
  manualSuffix: string;
  customerCodeRule: string;
  advancedDetails: string;
  customerSearch: string;
  customerSearchPlaceholder: string;
  selectedCustomer: string;
  quickCreate: string;
  quickCreateTitle: string;
  quickCreateHint: string;
  customerName: string;
  customerPhone: string;
  createCustomer: string;
  creatingCustomer: string;
  quickCreated: string;
  noCustomerResults: string;
  quickCreateRequired: string;
  scanFirstStatus: string;
  trackingRequired: string;
  weightRequired: string;
  valueRequired: string;
  cameraReadyHint: string;
};

const selectClassName =
  "h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--field)] px-4 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:bg-[var(--field-focus)] focus:ring-4 focus:ring-[var(--accent-soft)]";

function filterCustomersByQuery(customers: CustomerRecord[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return customers;
  }

  return customers.filter((customer) =>
    [
      customer.name,
      customer.customerCode,
      customer.email ?? "",
      customer.phone ?? "",
      customer.referencePrefix ?? "",
      ...customer.aliases.map((alias) => alias.value),
    ].some((value) => value.toLowerCase().includes(normalizedQuery)),
  );
}

function dedupeStringValues(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])];
}

function createInitialFormState(): IntakeFormState {
  return {
    scanValue: "",
    chinaTrackingNumber: "",
    courierCompany: "",
    customerId: "",
    matchedBy: "",
    declaredValue: "",
    declaredCurrency: "CNY",
    actualWeightKg: "",
    transportType: "express",
    notes: "",
    shelfLocation: "",
  };
}

function normalizeDetectedScanValue(value: string) {
  const trimmed = value.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return trimmed.replace(/\s+/g, "").toUpperCase();
}

function uniqueDetectedScans(scans: DetectedScan[]) {
  const seen = new Set<string>();
  const unique: DetectedScan[] = [];

  for (const scan of scans) {
    const key = `${scan.scanType}:${scan.rawValue}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(scan);
  }

  return unique;
}

function toTrackingCandidateInputs(scans: DetectedScan[]): IntakeTrackingCandidateInput[] {
  return scans.map((scan) => ({
    value: scan.rawValue,
    source: scan.scanType === "qr" ? "qr" : scan.scanType === "barcode" ? "barcode" : "manual",
  }));
}

function pickPrimaryTrackingScan(scans: DetectedScan[]) {
  const qrScan = scans.find((scan) => scan.scanType === "qr");

  if (qrScan) {
    return qrScan;
  }

  const rankedCandidates = mergeTrackingCandidates(
    toTrackingCandidateInputs(scans).map((candidate) => createTrackingCandidate(candidate)),
  );
  const bestTracking = pickBestTrackingCandidate(rankedCandidates);

  if (!bestTracking) {
    return null;
  }

  return (
    scans.find((scan) => normalizeDetectedScanValue(scan.rawValue) === bestTracking.value) ?? {
      rawValue: bestTracking.value,
      format: bestTracking.source === "qr" ? "qr_code" : "code_128",
      scanType: bestTracking.source === "qr" ? "qr" : "barcode",
    }
  );
}

async function detectBarcodeFromSource(
  detector: InstanceType<BarcodeDetectorCtor>,
  source: ImageBitmapSource | Blob,
) {
  const bitmap = source instanceof Blob ? await createImageBitmap(source) : null;

  try {
    const results = bitmap ? await detector.detect(bitmap) : await detector.detect(source);
    return uniqueDetectedScans(
      results
        .filter((result) => typeof result.rawValue === "string" && result.rawValue.trim().length > 0)
        .map((result) => ({
          rawValue: normalizeDetectedScanValue(result.rawValue ?? ""),
          format: result.format,
          scanType: result.format === "qr_code" ? "qr" : "barcode",
        })),
    );
  } finally {
    bitmap?.close();
  }
}

async function detectBarcodeWithZxing(source: HTMLCanvasElement) {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import("@zxing/browser"),
    import("@zxing/library"),
  ]);
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.CODE_93,
    BarcodeFormat.CODABAR,
    BarcodeFormat.ITF,
    BarcodeFormat.QR_CODE,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  const reader = new BrowserMultiFormatReader(hints);

  try {
    const result = reader.decodeFromCanvas(source);
    const barcodeFormat = result.getBarcodeFormat();
    const formatName =
      typeof barcodeFormat === "number" ? BarcodeFormat[barcodeFormat] : String(barcodeFormat);
    const normalizedFormat = formatName.toLowerCase();

    return [
      {
        rawValue: normalizeDetectedScanValue(result.getText()),
        format: normalizedFormat,
        scanType: normalizedFormat === "qr_code" ? "qr" : "barcode",
      } satisfies DetectedScan,
    ];
  } catch {
    return [];
  }
}

function captureVideoFrame(video: HTMLVideoElement) {
  const width = video.videoWidth || 1280;
  const height = video.videoHeight || 720;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to read the camera frame.");
  }

  context.drawImage(video, 0, 0, width, height);
  return canvas;
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function createProcessedCanvas(
  source: HTMLCanvasElement,
  options?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotateClockwise?: boolean;
    scale?: number;
    filter?: string;
  },
) {
  const cropX = Math.max(0, Math.round((options?.x ?? 0) * source.width));
  const cropY = Math.max(0, Math.round((options?.y ?? 0) * source.height));
  const cropWidth = Math.max(1, Math.round((options?.width ?? 1) * source.width));
  const cropHeight = Math.max(1, Math.round((options?.height ?? 1) * source.height));
  const scale = options?.scale ?? 1;
  const rotateClockwise = options?.rotateClockwise ?? false;
  const canvas = rotateClockwise
    ? createCanvas(cropHeight * scale, cropWidth * scale)
    : createCanvas(cropWidth * scale, cropHeight * scale);
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to process the camera frame.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.filter = options?.filter ?? "none";

  if (rotateClockwise) {
    context.translate(canvas.width, 0);
    context.rotate(Math.PI / 2);
    context.drawImage(
      source,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth * scale,
      cropHeight * scale,
    );
  } else {
    context.drawImage(
      source,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth * scale,
      cropHeight * scale,
    );
  }

  return canvas;
}

function createBinaryCanvas(source: HTMLCanvasElement) {
  const canvas = createCanvas(source.width, source.height);
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to prepare a high-contrast camera frame.");
  }

  context.drawImage(source, 0, 0);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const threshold = 148;

  for (let index = 0; index < image.data.length; index += 4) {
    const luminance =
      image.data[index] * 0.299 +
      image.data[index + 1] * 0.587 +
      image.data[index + 2] * 0.114;
    const value = luminance >= threshold ? 255 : 0;

    image.data[index] = value;
    image.data[index + 1] = value;
    image.data[index + 2] = value;
  }

  context.putImageData(image, 0, 0);
  return canvas;
}

function buildCameraScanCanvases(frame: HTMLCanvasElement) {
  const filter = "grayscale(1) contrast(1.45) brightness(1.05)";
  const topWide = createProcessedCanvas(frame, {
    x: 0.06,
    y: 0.08,
    width: 0.88,
    height: 0.4,
    scale: 1.9,
    filter,
  });
  const topTight = createProcessedCanvas(frame, {
    x: 0.1,
    y: 0.17,
    width: 0.8,
    height: 0.18,
    scale: 2.25,
    filter,
  });
  const centerWide = createProcessedCanvas(frame, {
    x: 0.06,
    y: 0.18,
    width: 0.88,
    height: 0.54,
    scale: 1.45,
    filter,
  });
  const centerTight = createProcessedCanvas(frame, {
    x: 0.08,
    y: 0.24,
    width: 0.84,
    height: 0.16,
    scale: 2.5,
    filter,
  });
  const upperMiddle = createProcessedCanvas(frame, {
    x: 0.08,
    y: 0.28,
    width: 0.84,
    height: 0.14,
    scale: 2.4,
    filter,
  });
  const rightVertical = createProcessedCanvas(frame, {
    x: 0.72,
    y: 0.1,
    width: 0.22,
    height: 0.68,
    rotateClockwise: true,
    scale: 2.1,
    filter,
  });
  const leftVertical = createProcessedCanvas(frame, {
    x: 0.02,
    y: 0.08,
    width: 0.18,
    height: 0.7,
    rotateClockwise: true,
    scale: 2.1,
    filter,
  });
  const fullEnhanced = createProcessedCanvas(frame, { filter });

  return [
    frame,
    fullEnhanced,
    createBinaryCanvas(fullEnhanced),
    topWide,
    createBinaryCanvas(topWide),
    topTight,
    createBinaryCanvas(topTight),
    centerWide,
    createBinaryCanvas(centerWide),
    centerTight,
    createBinaryCanvas(centerTight),
    upperMiddle,
    createBinaryCanvas(upperMiddle),
    rightVertical,
    createBinaryCanvas(rightVertical),
    leftVertical,
    createBinaryCanvas(leftVertical),
  ];
}

async function detectBarcodeAcrossCanvases(
  canvases: HTMLCanvasElement[],
  detector: InstanceType<BarcodeDetectorCtor> | null,
) {
  const scans: DetectedScan[] = [];
  const hasStrongTracking = () => {
    const candidates = mergeTrackingCandidates(
      toTrackingCandidateInputs(scans).map((candidate) => createTrackingCandidate(candidate)),
    );

    return candidates.some((candidate) => candidate.kind === "tracking" && candidate.confidence === "strong");
  };

  for (const canvas of canvases) {
    if (detector) {
      scans.push(...(await detectBarcodeFromSource(detector, canvas)));

      if (hasStrongTracking()) {
        return uniqueDetectedScans(scans);
      }
    }

    scans.push(...(await detectBarcodeWithZxing(canvas)));

    if (hasStrongTracking()) {
      return uniqueDetectedScans(scans);
    }
  }

  return uniqueDetectedScans(scans);
}

export function IntakeManager({
  locale,
  customers,
  incomingParcels,
  canCreateCustomers,
}: IntakeManagerProps) {
  const router = useRouter();
  const [form, setForm] = useState<IntakeFormState>(() => createInitialFormState());
  const [preview, setPreview] = useState<IntakePreviewResult | null>(null);
  const [customerOptions, setCustomerOptions] = useState(customers);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [quickCreateName, setQuickCreateName] = useState("");
  const [quickCreatePhone, setQuickCreatePhone] = useState("");
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assignmentValues, setAssignmentValues] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [isCreatingCustomer, startCustomerTransition] = useTransition();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraLoopRef = useRef<number | null>(null);
  const cameraBusyRef = useRef(false);
  const barcodeDetectorRef = useRef<InstanceType<BarcodeDetectorCtor> | null | false>(null);
  const zxingControlsRef = useRef<ZxingScannerControls | null>(null);

  const copy = useMemo<ScanCopy>(
    () =>
      locale === "fr"
        ? {
            title: "Reception warehouse",
            description:
              "Scannez le numero de suivi, cherchez le client existant ou creez-le rapidement, puis confirmez le poids, la valeur et le transport.",
            fallbackLink: "Ouvrir la creation manuelle d'expedition",
            intakeCard: "Reception scanner d'abord",
            intakeLead:
              "Un seul flux de reception: scanner materiel ou camera live, puis confirmation manuelle des champs restants.",
            analyze: "Scanner maintenant",
            analyzing: "Scan...",
            scanCamera: "Scanner avec camera",
            cameraTitle: "Scanner camera live",
            cameraLead:
              "Cadrez le code-barres ou le QR du colis. La camera remplira automatiquement le numero de suivi.",
            cameraOpening: "Ouverture de la camera...",
            cameraSearching: "Recherche d'un code de suivi valide...",
            cameraClose: "Fermer",
            cameraUnsupported:
              "Le scan camera live n'est pas disponible sur cet appareil ou navigateur. Utilisez le champ de scan ou un scanner Bluetooth.",
            cameraSecureContext:
              "Le scan camera live a besoin d'un lien HTTPS securise ou de localhost. Sur iPhone, ouvrez l'application via l'URL ngrok en HTTPS.",
            cameraPermissionDenied:
              "L'acces a la camera a ete refuse. Autorisez la camera ou utilisez le champ de scan.",
            cameraCaptureFailed:
              "Impossible de lire la camera pour le moment. Reessayez ou utilisez le champ de scan.",
            scanLabel: "Valeur scannee / QR / code-barres",
            scanPlaceholder: "Exemple : JD778899001122 ou code lu par le scanner",
            matchCard: "Assistant de rapprochement",
            noSuggestion:
              "Aucune suggestion automatique pour le moment. Vous pouvez quand meme enregistrer en file non attribuee.",
            resolved: "Client detecte",
            candidates: "Suggestions",
            createShipment: "Creer l'expedition",
            createAndReset: "Creer et suivant",
            saveUnassigned: "Mettre en file non attribuee",
            intakeForm: "Donnees de reception",
            intakeHint:
              "Le scanner remplit le numero de suivi. Le poids, la valeur et le transport restent confirmes manuellement.",
            unassignedTitle: "Colis non attribues",
            unassignedEmpty: "Aucun colis non attribue.",
            assign: "Attribuer et creer l'expedition",
            recentTitle: "Receptions recentes",
            recentEmpty: "Aucune reception recente.",
            customerOptional: "Client",
            manualMatch: "Affectation manuelle",
            barcodeSupport: "Scan materiel ou camera live",
            previewLabel: "Resultat du scan",
            linkedShipment: "Expedition liee",
            labelWeight: "Poids lu dans le scan",
            declaredValue: "Valeur declaree",
            declaredCurrency: "Devise valeur",
            weight: "Poids reel (kg)",
            shelf: "Emplacement",
            courier: "Transporteur Chine",
            notes: "Notes",
            chinaTracking: "Numero de suivi Chine",
            customerCode: "Code client detecte",
            manualSuffix: "Utilisez le module expeditions en solution de secours.",
            customerCodeRule: "Exigez le code client sur l'etiquette: exemple EXP C1024.",
            advancedDetails: "Details avances",
            customerSearch: "Rechercher un client existant",
            customerSearchPlaceholder: "Nom, code client, telephone ou alias",
            selectedCustomer: "Client selectionne",
            quickCreate: "Creation rapide",
            quickCreateTitle: "Creer un client sans quitter la reception",
            quickCreateHint: "Nom et telephone seulement. Le code client sera genere automatiquement.",
            customerName: "Nom du client",
            customerPhone: "Telephone",
            createCustomer: "Creer et selectionner",
            creatingCustomer: "Creation...",
            quickCreated: "Client cree et selectionne.",
            noCustomerResults:
              "Aucun client ne correspond a cette recherche. Creez-le rapidement ou enregistrez en non attribue.",
            quickCreateRequired: "Saisissez au moins le nom et le telephone pour creer le client.",
            scanFirstStatus: "Scannez d'abord le numero de suivi, puis choisissez ou creez le client.",
            trackingRequired: "Saisissez un numero de suivi Chine avant d'enregistrer.",
            weightRequired: "Saisissez le poids reel avant d'enregistrer.",
            valueRequired: "Saisissez la valeur declaree avant d'enregistrer.",
            cameraReadyHint: "Placez le code au centre. Le scan se lance en continu.",
          }
        : {
            title: "Warehouse intake",
            description:
              "Scan the tracking number, search the existing customer or create one inline, then confirm weight, value, and transport.",
            fallbackLink: "Open manual shipment creation",
            intakeCard: "Scanner-first intake",
            intakeLead:
              "One intake flow only: hardware scanner or live camera scan first, then manual confirmation for the remaining fields.",
            analyze: "Scan now",
            analyzing: "Scanning...",
            scanCamera: "Scan with camera",
            cameraTitle: "Live camera scanner",
            cameraLead:
              "Point the parcel barcode or QR code at the camera. The scanner will fill the tracking number automatically.",
            cameraOpening: "Opening the camera...",
            cameraSearching: "Looking for a valid tracking barcode...",
            cameraClose: "Close",
            cameraUnsupported:
              "Live camera scanning is not available on this device or browser. Use the scan field or a Bluetooth scanner.",
            cameraSecureContext:
              "Live camera scanning needs a secure HTTPS link or localhost. On iPhone, open the app through the HTTPS ngrok URL.",
            cameraPermissionDenied:
              "Camera access was blocked. Allow the camera or use the scan field instead.",
            cameraCaptureFailed:
              "The camera frame could not be read right now. Try again or use the scan field.",
            scanLabel: "Scanned value / QR / barcode",
            scanPlaceholder: "Example: JD778899001122 or any scanner-read parcel code",
            matchCard: "Matching assistant",
            noSuggestion: "No automatic suggestion yet. You can still save it into the unassigned queue.",
            resolved: "Detected customer",
            candidates: "Suggestions",
            createShipment: "Create shipment",
            createAndReset: "Create and next",
            saveUnassigned: "Save to unassigned queue",
            intakeForm: "Intake details",
            intakeHint:
              "The scanner fills the tracking number. Weight, value, and transport stay manual for operator confirmation.",
            unassignedTitle: "Unassigned parcels",
            unassignedEmpty: "No unassigned parcels.",
            assign: "Assign and create shipment",
            recentTitle: "Recent intake",
            recentEmpty: "No recent intake yet.",
            customerOptional: "Customer",
            manualMatch: "Manual assignment",
            barcodeSupport: "Hardware scan or live camera scan",
            previewLabel: "Scan result",
            linkedShipment: "Linked shipment",
            labelWeight: "Scan-detected weight",
            declaredValue: "Declared value",
            declaredCurrency: "Value currency",
            weight: "Actual weight (kg)",
            shelf: "Shelf location",
            courier: "China courier",
            notes: "Notes",
            chinaTracking: "China tracking number",
            customerCode: "Detected customer code",
            manualSuffix: "Use the shipments module as the fallback path.",
            customerCodeRule: "Require the customer code on the label: example EXP C1024.",
            advancedDetails: "Advanced details",
            customerSearch: "Search existing customers",
            customerSearchPlaceholder: "Name, customer code, phone, or alias",
            selectedCustomer: "Selected customer",
            quickCreate: "Quick create",
            quickCreateTitle: "Create a customer without leaving intake",
            quickCreateHint: "Only name and phone are required. The customer code will be generated automatically.",
            customerName: "Customer name",
            customerPhone: "Phone",
            createCustomer: "Create and select",
            creatingCustomer: "Creating...",
            quickCreated: "Customer created and selected.",
            noCustomerResults:
              "No customer matched this search. Quick-create one or save the parcel as unassigned.",
            quickCreateRequired: "Enter at least the customer name and phone to create the customer.",
            scanFirstStatus: "Scan the tracking number first, then pick or create the customer.",
            trackingRequired: "Enter a China tracking number before saving.",
            weightRequired: "Enter the actual weight before saving.",
            valueRequired: "Enter the declared value before saving.",
            cameraReadyHint: "Keep the barcode inside the frame. Scanning runs continuously.",
          },
    [locale],
  );

  useEffect(() => {
    setCustomerOptions(customers);
  }, [customers]);

  const sortedCustomers = useMemo(
    () => [...customerOptions].sort((left, right) => left.name.localeCompare(right.name)),
    [customerOptions],
  );
  const filteredCustomers = useMemo(
    () => filterCustomersByQuery(sortedCustomers, customerSearchQuery),
    [sortedCustomers, customerSearchQuery],
  );
  const selectedCustomer = useMemo(
    () => sortedCustomers.find((customer) => customer.id === form.customerId) ?? null,
    [form.customerId, sortedCustomers],
  );
  const unassignedParcels = incomingParcels.filter((parcel) => parcel.status === "unassigned");
  const recentParcels = incomingParcels.filter((parcel) => parcel.status === "received").slice(0, 6);

  function updateForm<K extends keyof IntakeFormState>(key: K, value: IntakeFormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function applyPreview(payload: IntakePreviewResult) {
    setPreview(payload);
    setCustomerSearchQuery((current) => {
      if (current.trim().length > 0) {
        return current;
      }

      return payload.detectedCustomerCode || "";
    });
    setForm((current) => ({
      ...current,
      scanValue: payload.scanValue || payload.chinaTrackingNumber || current.scanValue,
      chinaTrackingNumber: payload.chinaTrackingNumber || current.chinaTrackingNumber,
      courierCompany: payload.courierCompany || current.courierCompany,
      actualWeightKg:
        current.actualWeightKg || payload.actualWeightKg == null
          ? current.actualWeightKg
          : String(payload.actualWeightKg),
    }));
  }

  function selectCustomer(customerId: string, matchedBy = "manual") {
    updateForm("customerId", customerId);
    updateForm("matchedBy", matchedBy);
  }

  function resetFlow() {
    setForm(createInitialFormState());
    setPreview(null);
    setError(null);
    setFeedback(null);
    setCustomerSearchQuery("");
    setIsQuickCreateOpen(false);
    setQuickCreateName("");
    setQuickCreatePhone("");
  }

  async function runScanPreview(scanValue = form.scanValue, scanFormat?: string) {
    if (!scanValue.trim()) {
      setError(copy.noSuggestion);
      return null;
    }

    const response = await fetch("/api/admin/intake/scan-preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scanValue,
        scanFormat,
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message ?? "Unable to scan the label.");
    }

    applyPreview(payload);
    return payload satisfies IntakePreviewResult;
  }

  function handleAnalyze(scanValue = form.scanValue, scanFormat?: string) {
    setError(null);
    setFeedback(null);
    startTransition(async () => {
      try {
        await runScanPreview(scanValue, scanFormat);
      } catch (analysisError) {
        setError(analysisError instanceof Error ? analysisError.message : "Unable to scan the label.");
      }
    });
  }

  function handleQuickCreateCustomer() {
    if (!quickCreateName.trim() || !quickCreatePhone.trim()) {
      setError(copy.quickCreateRequired);
      return;
    }

    setError(null);
    setFeedback(null);

    startCustomerTransition(async () => {
      try {
        const response = await fetch("/api/admin/customers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: quickCreateName,
            phone: quickCreatePhone,
            marketplaceAliases: dedupeStringValues([preview?.detectedCustomerCode]),
          }),
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message ?? "Unable to create customer.");
        }

        setCustomerOptions((current) => [payload, ...current.filter((customer) => customer.id !== payload.id)]);
        selectCustomer(payload.id, "quick_create");
        setCustomerSearchQuery(`${payload.name} ${payload.customerCode}`);
        setQuickCreateName("");
        setQuickCreatePhone("");
        setIsQuickCreateOpen(false);
        setFeedback(copy.quickCreated);
      } catch (createError) {
        setError(createError instanceof Error ? createError.message : "Unable to create customer.");
      }
    });
  }

  function buildPayload() {
    return {
      scanValue: form.scanValue || form.chinaTrackingNumber,
      chinaTrackingNumber: form.chinaTrackingNumber,
      courierCompany: form.courierCompany,
      customerId: form.customerId || undefined,
      matchedBy: form.customerId ? form.matchedBy || "manual" : undefined,
      declaredValue: form.declaredValue,
      declaredCurrency: form.declaredCurrency,
      actualWeightKg: form.actualWeightKg,
      transportType: form.transportType,
      notes: form.notes,
      shelfLocation: form.shelfLocation,
      images: [],
    };
  }

  function handleSave(mode: "shipment" | "unassigned", resetAfterSave = false) {
    setError(null);
    setFeedback(null);

    if (!form.chinaTrackingNumber.trim()) {
      setError(copy.trackingRequired);
      return;
    }

    if (!form.actualWeightKg.trim()) {
      setError(copy.weightRequired);
      return;
    }

    if (!form.declaredValue.trim()) {
      setError(copy.valueRequired);
      return;
    }

    if (mode === "shipment" && !form.customerId) {
      setError(copy.noSuggestion);
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/intake", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            mode === "shipment"
              ? buildPayload()
              : {
                  ...buildPayload(),
                  customerId: undefined,
                  matchedBy: undefined,
                },
          ),
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message ?? "Unable to save intake.");
        }

        setFeedback(
          locale === "fr"
            ? mode === "shipment"
              ? "Reception enregistree et expedition creee."
              : "Reception enregistree en file non attribuee."
            : mode === "shipment"
              ? "Intake saved and shipment created."
              : "Intake saved to the unassigned queue.",
        );

        if (resetAfterSave) {
          resetFlow();
        } else {
          setPreview(null);
          setForm((current) => ({
            ...current,
            customerId: "",
            matchedBy: "",
            scanValue: "",
            chinaTrackingNumber: "",
          }));
        }

        router.refresh();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Unable to save intake.");
      }
    });
  }

  function handleAssignment(parcelId: string) {
    const customerId = assignmentValues[parcelId] ?? "";

    if (!customerId) {
      setError(copy.noSuggestion);
      return;
    }

    setError(null);
    setFeedback(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/intake/${parcelId}/assign`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerId,
            matchedBy: "manual_assignment",
          }),
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message ?? "Unable to assign parcel.");
        }

        setFeedback(
          locale === "fr"
            ? "Colis attribue et expedition creee."
            : "Parcel assigned and shipment created.",
        );
        router.refresh();
      } catch (assignmentError) {
        setError(assignmentError instanceof Error ? assignmentError.message : "Unable to assign parcel.");
      }
    });
  }

  const stopCameraSession = useEffectEvent(() => {
    if (cameraLoopRef.current != null) {
      window.clearTimeout(cameraLoopRef.current);
      cameraLoopRef.current = null;
    }

    cameraBusyRef.current = false;
    zxingControlsRef.current?.stop();
    zxingControlsRef.current = null;

    if (cameraStreamRef.current) {
      for (const track of cameraStreamRef.current.getTracks()) {
        track.stop();
      }
      cameraStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  });

  const processDetectedCameraScan = useEffectEvent((scan: DetectedScan) => {
    stopCameraSession();
    setIsScannerOpen(false);
    setCameraStatus(null);
    setCameraError(null);
    updateForm("scanValue", scan.rawValue);
    handleAnalyze(scan.rawValue, scan.format);
  });

  const startZxingVideoScan = useEffectEvent(async () => {
    if (!isScannerOpen || !videoRef.current) {
      return;
    }

    try {
      const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
        import("@zxing/browser"),
        import("@zxing/library"),
      ]);

      if (!isScannerOpen || !videoRef.current) {
        return;
      }

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.CODE_93,
        BarcodeFormat.CODABAR,
        BarcodeFormat.ITF,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 90,
        delayBetweenScanSuccess: 650,
        tryPlayVideoTimeout: 1500,
      });

      const controls = await reader.decodeFromVideoElement(videoRef.current, (result) => {
        if (!result) {
          return;
        }

        const barcodeFormat = result.getBarcodeFormat();
        const formatName =
          typeof barcodeFormat === "number" ? BarcodeFormat[barcodeFormat] : String(barcodeFormat);
        const normalizedFormat = formatName.toLowerCase();
        const detectedScan = pickPrimaryTrackingScan([
          {
            rawValue: normalizeDetectedScanValue(result.getText()),
            format: normalizedFormat,
            scanType: normalizedFormat === "qr_code" ? "qr" : "barcode",
          },
        ]);

        if (detectedScan) {
          processDetectedCameraScan(detectedScan);
        }
      });

      if (!isScannerOpen) {
        controls.stop();
        return;
      }

      zxingControlsRef.current = controls;
    } catch {
      // Ignore and fall back to the manual crop sweep.
    }
  });

  const scanCameraFrame = useEffectEvent(async () => {
    if (!isScannerOpen || cameraBusyRef.current || !videoRef.current) {
      return;
    }

    if (videoRef.current.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return;
    }

    cameraBusyRef.current = true;
    let shouldContinue = true;

    try {
      const detectorCtor = (
        window as Window & {
          BarcodeDetector?: BarcodeDetectorCtor;
        }
      ).BarcodeDetector;
      const detector =
        barcodeDetectorRef.current === false
          ? null
          : barcodeDetectorRef.current ||
            (detectorCtor
              ? new detectorCtor({
                  formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e"],
                })
              : null);

      if (detector && barcodeDetectorRef.current !== detector) {
        barcodeDetectorRef.current = detector;
      } else if (!detectorCtor) {
        barcodeDetectorRef.current = false;
      }

      const nativeMatches = detector ? await detectBarcodeFromSource(detector, videoRef.current) : [];
      const scans =
        nativeMatches.length > 0
          ? nativeMatches
          : await detectBarcodeAcrossCanvases(buildCameraScanCanvases(captureVideoFrame(videoRef.current)), detector);
      const detectedScan = pickPrimaryTrackingScan(scans);

      if (detectedScan) {
        shouldContinue = false;
        processDetectedCameraScan(detectedScan);
        return;
      }

      setCameraStatus(copy.cameraSearching);
    } catch {
      setCameraError(copy.cameraCaptureFailed);
    } finally {
      cameraBusyRef.current = false;
      if (shouldContinue && isScannerOpen) {
        cameraLoopRef.current = window.setTimeout(() => {
          void scanCameraFrame();
        }, 950);
      }
    }
  });

  useEffect(() => {
    if (!isScannerOpen) {
      stopCameraSession();
      setIsCameraStarting(false);
      setCameraStatus(null);
      setCameraError(null);
      return;
    }

    let active = true;

    async function startCamera() {
      if (typeof window !== "undefined" && !window.isSecureContext) {
        setIsCameraStarting(false);
        setCameraStatus(null);
        setCameraError(copy.cameraSecureContext);
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setIsCameraStarting(false);
        setCameraStatus(null);
        setCameraError(copy.cameraUnsupported);
        return;
      }

      setIsCameraStarting(true);
      setCameraError(null);
      setCameraStatus(copy.cameraOpening);

      try {
        let stream: MediaStream;

        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
            },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true,
          });
        }

        if (!active) {
          for (const track of stream.getTracks()) {
            track.stop();
          }
          return;
        }

        cameraStreamRef.current = stream;

        if (!videoRef.current) {
          throw new Error("Camera preview unavailable.");
        }

        videoRef.current.srcObject = stream;
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;
        await videoRef.current.play();
        setCameraStatus(copy.cameraReadyHint);
        void startZxingVideoScan();
        cameraLoopRef.current = window.setTimeout(() => {
          void scanCameraFrame();
        }, 1100);
      } catch (cameraStartError) {
        if (!active) {
          return;
        }

        const errorName =
          cameraStartError instanceof DOMException ? cameraStartError.name : "";
        setCameraStatus(null);
        setCameraError(
          errorName === "NotAllowedError" || errorName === "SecurityError"
            ? copy.cameraPermissionDenied
            : copy.cameraUnsupported,
        );
      } finally {
        if (active) {
          setIsCameraStarting(false);
        }
      }
    }

    void startCamera();

    return () => {
      active = false;
      stopCameraSession();
    };
  }, [
    copy.cameraOpening,
    copy.cameraPermissionDenied,
    copy.cameraReadyHint,
    copy.cameraSecureContext,
    copy.cameraUnsupported,
    isScannerOpen,
  ]);

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-[1.8rem] p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--brand)]">{copy.intakeCard}</p>
            <h2 className="mt-3 text-3xl font-black">{copy.title}</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{copy.description}</p>
            <p className="mt-3 text-sm text-[var(--muted)]">{copy.manualSuffix}</p>
          </div>
          <Link
            href={`/${locale}/admin/shipments`}
            className="inline-flex h-11 items-center rounded-full border border-[var(--line)] px-5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]"
          >
            {copy.fallbackLink}
          </Link>
        </div>
      </section>

      {feedback ? <p className="text-sm text-[var(--brand)]">{feedback}</p> : null}
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="glass-card rounded-[1.8rem] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--brand)]">
                {copy.barcodeSupport}
              </p>
              <h3 className="mt-3 text-2xl font-black">{copy.intakeLead}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--brand)]">
              <ScanLine className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm text-[var(--muted)]">{copy.scanLabel}</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  value={form.scanValue}
                  onChange={(event) => updateForm("scanValue", event.target.value)}
                  placeholder={copy.scanPlaceholder}
                  className="h-14 rounded-[1.4rem]"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAnalyze();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setCameraError(null);
                    setCameraStatus(null);
                    setIsScannerOpen(true);
                  }}
                  variant="secondary"
                  className="w-full justify-center touch-manipulation sm:w-auto"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  {copy.scanCamera}
                </Button>
                <Button
                  type="button"
                  onClick={() => handleAnalyze()}
                  disabled={isPending}
                  className="w-full justify-center touch-manipulation sm:w-auto"
                >
                  {isPending ? copy.analyzing : copy.analyze}
                </Button>
              </div>
              <p className="mt-3 text-sm text-[var(--muted)]">{copy.customerCodeRule}</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-[1.8rem] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--brand)]">
                {copy.previewLabel}
              </p>
              <h3 className="mt-3 text-2xl font-black">{copy.matchCard}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--brand)]">
              <UserRoundCheck className="h-5 w-5" />
            </div>
          </div>

          {preview ? (
            <div className="mt-6 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[1.3rem] border border-[var(--line)] bg-[var(--surface-secondary)] px-4 py-4">
                  <p className="text-sm text-[var(--muted)]">{copy.chinaTracking}</p>
                  <p className="mt-2 break-all font-semibold">
                    {preview.chinaTrackingNumber || "—"}
                  </p>
                </div>
                <div className="rounded-[1.3rem] border border-[var(--line)] bg-[var(--surface-secondary)] px-4 py-4">
                  <p className="text-sm text-[var(--muted)]">{copy.customerCode}</p>
                  <p className="mt-2 font-semibold">{preview.detectedCustomerCode ?? "—"}</p>
                </div>
                {preview.courierCompany ? (
                  <div className="rounded-[1.3rem] border border-[var(--line)] bg-[var(--surface-secondary)] px-4 py-4">
                    <p className="text-sm text-[var(--muted)]">{copy.courier}</p>
                    <p className="mt-2 font-semibold">{preview.courierCompany}</p>
                  </div>
                ) : null}
                {preview.actualWeightKg != null ? (
                  <div className="rounded-[1.3rem] border border-[var(--line)] bg-[var(--surface-secondary)] px-4 py-4">
                    <p className="text-sm text-[var(--muted)]">{copy.labelWeight}</p>
                    <p className="mt-2 font-semibold">{preview.actualWeightKg} kg</p>
                  </div>
                ) : null}
              </div>

              {preview.resolvedCustomerId ? (
                <div className="rounded-[1.3rem] border border-[var(--line)] bg-[var(--surface-secondary)] px-4 py-4">
                  <p className="text-sm text-[var(--muted)]">{copy.resolved}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {preview.matches
                      .filter((match) => match.customer.id === preview.resolvedCustomerId)
                      .map((match) => (
                        <Badge key={`${match.customer.id}-${match.matchedBy}`} tone="accent">
                          {match.customer.name} • {match.customer.customerCode} • {match.matchedBy}
                        </Badge>
                      ))}
                  </div>
                </div>
              ) : null}

              {preview.matches.length > 0 ? (
                <div className="rounded-[1.3rem] border border-[var(--line)] bg-[var(--surface-secondary)] px-4 py-4">
                  <p className="text-sm text-[var(--muted)]">{copy.candidates}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {preview.matches.map((match) => (
                      <button
                        key={`${match.customer.id}-${match.matchedBy}`}
                        type="button"
                        onClick={() => {
                          selectCustomer(match.customer.id, match.matchedBy);
                          setCustomerSearchQuery(match.customer.name);
                        }}
                        className="rounded-full border border-[var(--line)] px-3 py-2 text-xs font-semibold transition hover:bg-[var(--surface-hover)]"
                      >
                        {match.customer.name} • {match.customer.customerCode} • {match.matchedBy}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--muted)]">{copy.noSuggestion}</p>
              )}
            </div>
          ) : (
            <p className="mt-6 text-sm text-[var(--muted)]">{copy.scanFirstStatus}</p>
          )}
        </div>
      </section>

      <section className="glass-card rounded-[1.8rem] p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--brand)]">{copy.intakeForm}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">{copy.intakeHint}</p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-[var(--muted)]">{copy.chinaTracking}</label>
            <Input
              value={form.chinaTrackingNumber}
              onChange={(event) => updateForm("chinaTrackingNumber", event.target.value)}
              required
            />
          </div>
          <div className="lg:col-span-2 rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface-secondary)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <label className="mb-2 block text-sm text-[var(--muted)]">{copy.customerSearch}</label>
                <p className="text-sm text-[var(--muted)]">{copy.customerOptional}</p>
              </div>
              {canCreateCustomers ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsQuickCreateOpen((open) => !open)}
                >
                  {copy.quickCreate}
                </Button>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <Input
                value={customerSearchQuery}
                onChange={(event) => setCustomerSearchQuery(event.target.value)}
                placeholder={copy.customerSearchPlaceholder}
              />
              <select
                value={form.customerId}
                onChange={(event) => {
                  selectCustomer(event.target.value, event.target.value ? "manual" : "");
                }}
                className={selectClassName}
              >
                <option value="">{copy.manualMatch}</option>
                {filteredCustomers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} • {customer.customerCode}
                  </option>
                ))}
              </select>
            </div>

            {selectedCustomer ? (
              <div className="mt-4 rounded-[1.2rem] border border-[var(--line)] bg-[var(--field)] px-4 py-3">
                <p className="text-sm text-[var(--muted)]">{copy.selectedCustomer}</p>
                <p className="mt-2 font-semibold">
                  {selectedCustomer.name} • {selectedCustomer.customerCode}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">{selectedCustomer.phone ?? "—"}</p>
              </div>
            ) : null}

            {customerSearchQuery.trim() && filteredCustomers.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--muted)]">{copy.noCustomerResults}</p>
            ) : null}

            {canCreateCustomers && isQuickCreateOpen ? (
              <div className="mt-4 rounded-[1.2rem] border border-[var(--line)] bg-[var(--field)] p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">{copy.quickCreateTitle}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{copy.quickCreateHint}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Input
                    value={quickCreateName}
                    onChange={(event) => setQuickCreateName(event.target.value)}
                    placeholder={copy.customerName}
                  />
                  <Input
                    value={quickCreatePhone}
                    onChange={(event) => setQuickCreatePhone(event.target.value)}
                    placeholder={copy.customerPhone}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button type="button" onClick={handleQuickCreateCustomer} disabled={isCreatingCustomer}>
                    {isCreatingCustomer ? copy.creatingCustomer : copy.createCustomer}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setIsQuickCreateOpen(false)} disabled={isCreatingCustomer}>
                    Reset
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
          <div>
            <label className="mb-2 block text-sm text-[var(--muted)]">{copy.weight}</label>
            <Input
              value={form.actualWeightKg}
              onChange={(event) => updateForm("actualWeightKg", event.target.value)}
              type="number"
              min="0"
              step="0.01"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-[var(--muted)]">{copy.declaredValue}</label>
            <Input
              value={form.declaredValue}
              onChange={(event) => updateForm("declaredValue", event.target.value)}
              type="number"
              min="0"
              step="0.01"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-[var(--muted)]">Transport</label>
            <select
              value={form.transportType}
              onChange={(event) => updateForm("transportType", event.target.value as TransportType)}
              className={selectClassName}
            >
              {transportTypes.map((transportType) => (
                <option key={transportType} value={transportType}>
                  {transportType}
                </option>
              ))}
            </select>
          </div>
        </div>

        <details className="mt-6 rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface-secondary)] px-4 py-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--foreground)]">
            {copy.advancedDetails}
          </summary>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-[var(--muted)]">{copy.courier}</label>
              <Input
                value={form.courierCompany}
                onChange={(event) => updateForm("courierCompany", event.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-[var(--muted)]">{copy.declaredCurrency}</label>
              <Input
                value={form.declaredCurrency}
                onChange={(event) => updateForm("declaredCurrency", event.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-[var(--muted)]">{copy.shelf}</label>
              <Input
                value={form.shelfLocation}
                onChange={(event) => updateForm("shelfLocation", event.target.value)}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm text-[var(--muted)]">{copy.notes}</label>
            <Textarea
              value={form.notes}
              onChange={(event) => updateForm("notes", event.target.value)}
              rows={3}
            />
          </div>
        </details>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={() => handleSave("shipment")} disabled={isPending}>
            <PackagePlus className="mr-2 h-4 w-4" />
            {copy.createShipment}
          </Button>
          <Button type="button" variant="secondary" onClick={() => handleSave("shipment", true)} disabled={isPending}>
            {copy.createAndReset}
          </Button>
          <Button type="button" variant="secondary" onClick={() => handleSave("unassigned")} disabled={isPending}>
            {copy.saveUnassigned}
          </Button>
          <Button type="button" variant="ghost" onClick={resetFlow} disabled={isPending}>
            Reset
          </Button>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="glass-card rounded-[1.8rem] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--brand)]">{copy.unassignedTitle}</p>
              <h3 className="mt-3 text-2xl font-black">{copy.unassignedTitle}</h3>
            </div>
            <Badge tone="warning">{unassignedParcels.length}</Badge>
          </div>

          <div className="mt-6 space-y-4">
            {unassignedParcels.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">{copy.unassignedEmpty}</p>
            ) : (
              unassignedParcels.map((parcel) => (
                <article
                  key={parcel.id}
                  className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface-secondary)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{parcel.chinaTrackingNumber}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">{parcel.receiverNameRaw ?? "—"}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">{parcel.receiverPhoneRaw ?? "—"}</p>
                    </div>
                    <Badge tone="danger">{parcel.status}</Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <select
                      value={assignmentValues[parcel.id] ?? ""}
                      onChange={(event) =>
                        setAssignmentValues((current) => ({
                          ...current,
                          [parcel.id]: event.target.value,
                        }))
                      }
                      className={selectClassName}
                    >
                      <option value="">{copy.manualMatch}</option>
                      {sortedCustomers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} • {customer.customerCode}
                        </option>
                      ))}
                    </select>
                    <Button type="button" onClick={() => handleAssignment(parcel.id)} disabled={isPending}>
                      {copy.assign}
                    </Button>
                  </div>

                  {parcel.images[0] ? (
                    <Image
                      src={parcel.images[0].dataUrl}
                      alt={parcel.images[0].fileName ?? parcel.chinaTrackingNumber}
                      width={480}
                      height={240}
                      unoptimized
                      className="mt-4 h-32 w-full rounded-[1.1rem] object-cover"
                    />
                  ) : null}
                </article>
              ))
            )}
          </div>
        </div>

        <div className="glass-card rounded-[1.8rem] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--brand)]">{copy.recentTitle}</p>
              <h3 className="mt-3 text-2xl font-black">{copy.recentTitle}</h3>
            </div>
            <Badge tone="accent">{recentParcels.length}</Badge>
          </div>

          <div className="mt-6 space-y-4">
            {recentParcels.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">{copy.recentEmpty}</p>
            ) : (
              recentParcels.map((parcel) => (
                <article
                  key={parcel.id}
                  className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface-secondary)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{parcel.chinaTrackingNumber}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {parcel.customer ? `${parcel.customer.name} • ${parcel.customer.customerCode}` : "—"}
                      </p>
                    </div>
                    <Badge tone="accent">{parcel.transportType}</Badge>
                  </div>
                  {parcel.shipment ? (
                    <p className="mt-4 text-sm text-[var(--muted)]">
                      {copy.linkedShipment}: {parcel.shipment.trackingNumber}
                    </p>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      {isScannerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-lg rounded-[1.8rem] border border-white/10 bg-[#072e30] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--brand)]">{copy.scanCamera}</p>
                <h3 className="mt-3 text-2xl font-black text-white">{copy.cameraTitle}</h3>
                <p className="mt-3 text-sm leading-6 text-white/75">{copy.cameraLead}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsScannerOpen(false)}
                className="touch-manipulation"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">{copy.cameraClose}</span>
              </Button>
            </div>

            <div className="mt-5 overflow-hidden rounded-[1.4rem] border border-white/10 bg-black">
              <video ref={videoRef} className="aspect-[3/4] w-full object-cover" autoPlay muted playsInline />
            </div>

            <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
              {isCameraStarting ? (
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {copy.cameraOpening}
                </span>
              ) : cameraError ? (
                cameraError
              ) : (
                cameraStatus || copy.cameraSearching
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsScannerOpen(false)}
                className="touch-manipulation"
              >
                {copy.cameraClose}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
