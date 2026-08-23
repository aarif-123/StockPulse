const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTable() {
  console.log('🔨 Creating missing Notification Enums and Table in Supabase PostgreSQL...');

  const enum1 = `
    DO $$ BEGIN
      CREATE TYPE "NotificationType" AS ENUM (
        'STOCK_LOW',
        'CHALLAN_PENDING',
        'PAYMENT_OVERDUE',
        'REORDER_RECOMMENDED',
        'ASSEMBLY_READY',
        'CREDIT_RISK_ALERT',
        'SYSTEM_NOTICE'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `;

  const enum2 = `
    DO $$ BEGIN
      CREATE TYPE "NotificationSeverity" AS ENUM (
        'INFO',
        'SUCCESS',
        'WARNING',
        'CRITICAL'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `;

  const createTableSql = `
    CREATE TABLE IF NOT EXISTS public.notifications (
      id TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "userId" TEXT,
      "targetRole" "OrgRole",
      type "NotificationType" NOT NULL,
      severity "NotificationSeverity" NOT NULL DEFAULT 'INFO',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      "actionUrl" TEXT,
      payload JSONB,
      "isRead" BOOLEAN NOT NULL DEFAULT false,
      "readAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "notifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON DELETE CASCADE,
      CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE
    );
  `;

  const indices = [
    `CREATE INDEX IF NOT EXISTS "notifications_organizationId_targetRole_isRead_idx" ON public.notifications("organizationId", "targetRole", "isRead");`,
    `CREATE INDEX IF NOT EXISTS "notifications_organizationId_userId_isRead_idx" ON public.notifications("organizationId", "userId", "isRead");`,
    `CREATE INDEX IF NOT EXISTS "notifications_organizationId_createdAt_idx" ON public.notifications("organizationId", "createdAt");`
  ];

  await prisma.$executeRawUnsafe(enum1);
  await prisma.$executeRawUnsafe(enum2);
  console.log('✅ Notification Enums created!');

  await prisma.$executeRawUnsafe(createTableSql);
  console.log('✅ Notifications table created successfully!');

  for (const idxSql of indices) {
    await prisma.$executeRawUnsafe(idxSql);
  }
  console.log('✅ Indices created successfully!');

  await prisma.$disconnect();
}

createTable().catch(err => {
  console.error('❌ Failed to create table:', err);
  prisma.$disconnect();
});
