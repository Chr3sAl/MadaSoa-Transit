import { roles, type CreateShipmentInput, type Role, type UpdateShipmentInput } from "@/lib/types";
import { createShipmentSchema, updateShipmentSchema } from "@/lib/validators";

export const adminSections = [
  "dashboard",
  "intake",
  "shipments",
  "customers",
  "imports",
  "reports",
  "users",
] as const;

export type AdminSection = (typeof adminSections)[number];

export const operationalShipmentFields = [
  "customerReference",
  "transportType",
  "origin",
  "destination",
  "carrier",
  "currentStatus",
  "actualWeightKg",
  "volumetricWeightKg",
  "volumeCbm",
  "eta",
  "notes",
  "publicVisible",
] as const satisfies readonly (keyof UpdateShipmentInput)[];

export const financeShipmentFields = [
  "paymentStatus",
  "freightAmount",
  "currency",
] as const satisfies readonly (keyof UpdateShipmentInput)[];

export const adminShipmentFields = [
  ...operationalShipmentFields,
  ...financeShipmentFields,
] as const satisfies readonly (keyof UpdateShipmentInput)[];

export type ShipmentEditableField = (typeof adminShipmentFields)[number];

export const requiredShipmentCreateFields = [
  "trackingNumber",
  "customerId",
] as const satisfies readonly (keyof CreateShipmentInput)[];

export const operationalShipmentCreateFields = [
  ...requiredShipmentCreateFields,
  ...operationalShipmentFields,
] as const satisfies readonly (keyof CreateShipmentInput)[];

export const adminShipmentCreateFields = [
  ...operationalShipmentCreateFields,
  ...financeShipmentFields,
] as const satisfies readonly (keyof CreateShipmentInput)[];

export type ShipmentCreatableField = (typeof adminShipmentCreateFields)[number];

type BooleanPermissionKey =
  | "canCreateCustomers"
  | "canCreateShipments"
  | "canManageIntake"
  | "canImport"
  | "canManageUsers";

type RolePermissionSet = {
  sections: readonly AdminSection[];
  canCreateCustomers: boolean;
  canCreateShipments: boolean;
  canManageIntake: boolean;
  canImport: boolean;
  canManageUsers: boolean;
  shipmentCreatableFields: readonly ShipmentCreatableField[];
  shipmentEditableFields: readonly ShipmentEditableField[];
};

const rolePermissions = {
  admin: {
    sections: adminSections,
    canCreateCustomers: true,
    canCreateShipments: true,
    canManageIntake: true,
    canImport: true,
    canManageUsers: true,
    shipmentCreatableFields: adminShipmentCreateFields,
    shipmentEditableFields: adminShipmentFields,
  },
  operator: {
    sections: ["dashboard", "intake", "shipments", "customers", "imports", "reports"],
    canCreateCustomers: true,
    canCreateShipments: true,
    canManageIntake: true,
    canImport: true,
    canManageUsers: false,
    shipmentCreatableFields: operationalShipmentCreateFields,
    shipmentEditableFields: operationalShipmentFields,
  },
  finance: {
    sections: ["dashboard", "shipments", "customers", "reports"],
    canCreateCustomers: false,
    canCreateShipments: false,
    canManageIntake: false,
    canImport: false,
    canManageUsers: false,
    shipmentCreatableFields: [],
    shipmentEditableFields: financeShipmentFields,
  },
} satisfies Record<Role, RolePermissionSet>;

export class ForbiddenShipmentFieldError extends Error {
  constructor(
    readonly role: Role,
    readonly fields: string[],
    readonly action: "create" | "update" = "update",
  ) {
    super(`Role ${role} cannot ${action} field(s): ${fields.join(", ")}`);
    this.name = "ForbiddenShipmentFieldError";
  }
}

export function getRolePermissions(role: Role) {
  return rolePermissions[role];
}

export function canAccessAdminSection(role: Role, section: AdminSection) {
  return (getRolePermissions(role).sections as readonly AdminSection[]).includes(section);
}

export function getAllowedRolesForAdminSection(section: AdminSection) {
  return roles.filter((role) => canAccessAdminSection(role, section));
}

export function getRolesWithPermission(permission: BooleanPermissionKey) {
  return roles.filter((role) => getRolePermissions(role)[permission]);
}

export function canCreateShipmentField(role: Role, field: ShipmentCreatableField) {
  return (getRolePermissions(role).shipmentCreatableFields as readonly ShipmentCreatableField[]).includes(
    field,
  );
}

export function canEditShipmentField(role: Role, field: ShipmentEditableField) {
  return (getRolePermissions(role).shipmentEditableFields as readonly ShipmentEditableField[]).includes(
    field,
  );
}

function hasProvidedValue(value: unknown) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

export function sanitizeShipmentCreateForRole(role: Role, input: Record<string, unknown>) {
  const rawInput = input;
  const forbiddenFields = Object.entries(rawInput)
    .filter(([field, value]) => adminShipmentCreateFields.includes(field as ShipmentCreatableField) && hasProvidedValue(value))
    .map(([field]) => field as ShipmentCreatableField)
    .filter((field) => !canCreateShipmentField(role, field));

  if (forbiddenFields.length > 0) {
    throw new ForbiddenShipmentFieldError(role, forbiddenFields, "create");
  }

  return createShipmentSchema.parse({
    ...rawInput,
    paymentStatus: hasProvidedValue(rawInput.paymentStatus) ? rawInput.paymentStatus : "unpaid",
    freightAmount: hasProvidedValue(rawInput.freightAmount) ? rawInput.freightAmount : 0,
    currency: hasProvidedValue(rawInput.currency) ? rawInput.currency : "Ar",
  });
}

export function sanitizeShipmentPatchForRole(role: Role, input: UpdateShipmentInput) {
  const patch = updateShipmentSchema.parse(input);
  const forbiddenFields = Object.entries(patch)
    .filter(([, value]) => value !== undefined)
    .map(([field]) => field as ShipmentEditableField)
    .filter((field) => !canEditShipmentField(role, field));

  if (forbiddenFields.length > 0) {
    throw new ForbiddenShipmentFieldError(role, forbiddenFields);
  }

  return patch;
}
