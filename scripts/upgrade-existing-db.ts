import "dotenv/config";

import { Client } from "pg";

type CustomerRow = {
  id: string;
  customerCode: string | null;
};

function nextCode(usedCodes: Set<string>, startAt = 1001) {
  let value = startAt;

  while (usedCodes.has(`C${value}`)) {
    value += 1;
  }

  const code = `C${value}`;
  usedCodes.add(code);
  return code;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  const client = new Client({
    connectionString: databaseUrl,
  });

  await client.connect();

  try {
    await client.query("BEGIN");

    const customerTableCheck = await client.query<{
      exists: boolean;
    }>(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'Customer'
      ) AS "exists"
    `);

    if (!customerTableCheck.rows[0]?.exists) {
      await client.query("COMMIT");
      console.log("No Customer table found. Nothing to upgrade.");
      return;
    }

    const customerCodeColumnCheck = await client.query<{
      exists: boolean;
    }>(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Customer'
          AND column_name = 'customerCode'
      ) AS "exists"
    `);

    if (!customerCodeColumnCheck.rows[0]?.exists) {
      await client.query(`ALTER TABLE "Customer" ADD COLUMN "customerCode" TEXT`);
      console.log('Added nullable "customerCode" column to Customer.');
    }

    const customers = await client.query<CustomerRow>(`
      SELECT "id", "customerCode"
      FROM "Customer"
      ORDER BY "createdAt" ASC, "id" ASC
    `);

    const usedCodes = new Set(
      customers.rows
        .map((row) => row.customerCode?.trim() ?? "")
        .filter((value) => value.length > 0),
    );

    let updatedCount = 0;

    for (const customer of customers.rows) {
      if (customer.customerCode?.trim()) {
        continue;
      }

      const generatedCode = nextCode(usedCodes);
      await client.query(
        `UPDATE "Customer" SET "customerCode" = $1 WHERE "id" = $2`,
        [generatedCode, customer.id],
      );
      updatedCount += 1;
    }

    await client.query("COMMIT");
    console.log(`Backfilled customer codes for ${updatedCount} customer(s).`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
