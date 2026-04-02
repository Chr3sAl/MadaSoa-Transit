import { hash } from "bcryptjs";

import { prisma } from "../src/lib/prisma";

async function upsertSeedUser(params: {
  email: string;
  legacyEmail: string;
  name: string;
  role: "admin" | "operator" | "finance";
  passwordHash: string;
}) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: params.email }, { email: params.legacyEmail }],
    },
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        email: params.email,
        name: params.name,
        role: params.role,
        passwordHash: params.passwordHash,
      },
    });
  }

  return prisma.user.create({
    data: {
      email: params.email,
      name: params.name,
      role: params.role,
      passwordHash: params.passwordHash,
    },
  });
}

async function main() {
  const [adminHash, operatorHash, financeHash] = await Promise.all([
    hash("Admin123!", 10),
    hash("Operator123!", 10),
    hash("Finance123!", 10),
  ]);

  const admin = await upsertSeedUser({
    email: "admin@madasoatransit.local",
    legacyEmail: "admin@importation.express",
    name: "Nadia Admin",
    passwordHash: adminHash,
    role: "admin",
  });

  await upsertSeedUser({
    email: "operator@madasoatransit.local",
    legacyEmail: "operator@importation.express",
    name: "Louis Operator",
    passwordHash: operatorHash,
    role: "operator",
  });

  await upsertSeedUser({
    email: "finance@madasoatransit.local",
    legacyEmail: "finance@importation.express",
    name: "Mia Finance",
    passwordHash: financeHash,
    role: "finance",
  });

  const existingCustomer = await prisma.customer.findFirst({
    where: {
      OR: [
        { email: "ops@madasoatrading.local" },
        { email: "ops@mana-importation.com" },
        { customerCode: "C1024" },
        { referencePrefix: "MST-2026" },
        { referencePrefix: "MANA-2026" },
      ],
    },
  });

  const customer = existingCustomer
    ? await prisma.customer.update({
        where: { id: existingCustomer.id },
        data: {
          name: "MadaSoa Trading",
          email: "ops@madasoatrading.local",
          phone: "+689 40 55 10 10",
          customerCode: "C1024",
          referencePrefix: "MST-2026",
        },
      })
    : await prisma.customer.create({
        data: {
          name: "MadaSoa Trading",
          email: "ops@madasoatrading.local",
          phone: "+689 40 55 10 10",
          customerCode: "C1024",
          referencePrefix: "MST-2026",
        },
      });

  await prisma.customerAlias.deleteMany({
    where: { customerId: customer.id },
  });

  await prisma.customerAlias.createMany({
    data: [
      {
        customerId: customer.id,
        kind: "receiver_name",
        value: "EXP C1024",
        normalizedValue: "EXP C1024",
      },
      {
        customerId: customer.id,
        kind: "receiver_phone",
        value: "13812341024",
        normalizedValue: "13812341024",
      },
    ],
  });

  const parcel = await prisma.incomingParcel.upsert({
    where: { chinaTrackingNumber: "JD778899001122" },
    update: {
      scanValue: "JD778899001122",
      courierCompany: "JD Logistics",
      customerId: customer.id,
      status: "received",
      matchedBy: "customer_code",
      receiverNameRaw: "EXP C1024",
      receiverPhoneRaw: "13812341024",
      receiverAddressRaw: "Yiwu warehouse lane 2",
      ocrText: "JD778899001122 EXP C1024 13812341024",
      declaredValue: 320,
      declaredCurrency: "CNY",
      actualWeightKg: 2.8,
      transportType: "express",
      shelfLocation: "A1-03",
      notes: "Seeded intake parcel for MadaSoa Transit.",
    },
    create: {
      chinaTrackingNumber: "JD778899001122",
      scanValue: "JD778899001122",
      courierCompany: "JD Logistics",
      customerId: customer.id,
      status: "received",
      matchedBy: "customer_code",
      receiverNameRaw: "EXP C1024",
      receiverPhoneRaw: "13812341024",
      receiverAddressRaw: "Yiwu warehouse lane 2",
      ocrText: "JD778899001122 EXP C1024 13812341024",
      declaredValue: 320,
      declaredCurrency: "CNY",
      actualWeightKg: 2.8,
      transportType: "express",
      shelfLocation: "A1-03",
      notes: "Seeded intake parcel for MadaSoa Transit.",
      images: {
        create: {
          dataUrl:
            "data:image/gif;base64,R0lGODlhAQABAPAAAMzMzAAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==",
          fileName: "seed-jd-778899001122.jpg",
        },
      },
    },
  });

  const shipment = await prisma.shipment.upsert({
    where: { trackingNumber: "MADA-20260401-0001" },
    update: {
      incomingParcelId: parcel.id,
      customerId: customer.id,
      customerReference: "MST-2026-041",
      origin: "China Warehouse",
      destination: "Destination Hub",
      carrier: "JD Logistics",
      currentStatus: "received",
      paymentStatus: "unpaid",
      publicVisible: true,
      actualWeightKg: 2.8,
      volumetricWeightKg: 2.8,
      notes: "Seeded intake shipment for MadaSoa Transit.",
    },
    create: {
      trackingNumber: "MADA-20260401-0001",
      incomingParcelId: parcel.id,
      customerId: customer.id,
      customerReference: "MST-2026-041",
      origin: "China Warehouse",
      destination: "Destination Hub",
      carrier: "JD Logistics",
      currentStatus: "received",
      paymentStatus: "unpaid",
      publicVisible: true,
      actualWeightKg: 2.8,
      volumetricWeightKg: 2.8,
      notes: "Seeded intake shipment for MadaSoa Transit.",
    },
  });

  await prisma.shipmentEvent.deleteMany({
    where: { shipmentId: shipment.id },
  });

  await prisma.shipmentEvent.createMany({
    data: [
      {
        shipmentId: shipment.id,
        status: "received",
        label: "Parcel received at warehouse",
        details: "Seed intake import.",
        occurredAt: new Date(),
      },
    ],
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      entityType: "seed",
      entityId: "initial-seed",
      action: "seed.completed",
      details: { message: "MadaSoa Transit seed executed." },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
