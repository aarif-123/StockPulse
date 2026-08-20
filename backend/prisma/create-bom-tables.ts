import { Client } from 'pg';
import { env } from '../src/config/env';

async function createBomTables() {
  console.log('🚀 Connecting to database to create BOM tables...');
  const client = new Client({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to PostgreSQL successfully.');

  const sql = `
    CREATE TABLE IF NOT EXISTS "bom_assemblies" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "sku" TEXT NOT NULL,
      "category" TEXT NOT NULL DEFAULT 'Assemblies',
      "description" TEXT,
      "sellingPrice" DECIMAL(12, 2) NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "bom_assemblies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "bom_assemblies_organizationId_sku_key" ON "bom_assemblies"("organizationId", "sku");
    CREATE INDEX IF NOT EXISTS "bom_assemblies_organizationId_isActive_idx" ON "bom_assemblies"("organizationId", "isActive");

    CREATE TABLE IF NOT EXISTS "bom_components" (
      "id" TEXT PRIMARY KEY,
      "assemblyId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "qtyRequired" INTEGER NOT NULL DEFAULT 1,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "bom_components_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "bom_assemblies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "bom_components_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "bom_components_assemblyId_productId_key" ON "bom_components"("assemblyId", "productId");
    CREATE INDEX IF NOT EXISTS "bom_components_assemblyId_idx" ON "bom_components"("assemblyId");
    CREATE INDEX IF NOT EXISTS "bom_components_productId_idx" ON "bom_components"("productId");

    CREATE TABLE IF NOT EXISTS "bom_build_logs" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "assemblyId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 1,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "bom_build_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "bom_build_logs_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "bom_assemblies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "bom_build_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );

    CREATE INDEX IF NOT EXISTS "bom_build_logs_organizationId_createdAt_idx" ON "bom_build_logs"("organizationId", "createdAt");
    CREATE INDEX IF NOT EXISTS "bom_build_logs_assemblyId_idx" ON "bom_build_logs"("assemblyId");
  `;

  await client.query(sql);
  console.log('✅ Successfully created bom_assemblies, bom_components, and bom_build_logs tables in PostgreSQL!');

  await client.end();
}

createBomTables().catch((err) => {
  console.error('❌ Error creating BOM tables:', err);
  process.exit(1);
});
