// Prisma seed script — populates development users.
//
// ⚠️  DEVELOPMENT ONLY — these credentials are for local development and
//     testing. Never use them in production.
//
// Each operation is an upsert keyed on email, so running the seed
// multiple times is safe and idempotent.
//
// Usage:
//   npx prisma db seed
//   (or: npx ts-node prisma/seed.ts)

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Use 12 rounds in development — high enough to be realistic, not so high
// that seeding becomes slow. Production should use 12–14.
const BCRYPT_ROUNDS = 12;

// ⚠️  Development password — change before any real deployment.
const DEV_PASSWORD = 'Password123!';

interface SeedUser {
  name: string;
  email: string;
  role: Role;
}

const SEED_USERS: SeedUser[] = [
  { name: 'Admin User',      email: 'admin@example.com',     role: 'ADMIN'     },
  { name: 'Sales User',      email: 'sales@example.com',     role: 'SALES'     },
  { name: 'Warehouse User',  email: 'warehouse@example.com', role: 'WAREHOUSE' },
  { name: 'Accounts User',   email: 'accounts@example.com',  role: 'ACCOUNTS'  },
];

async function main(): Promise<void> {
  console.log('🌱  Seeding development users...\n');

  // Hash once and reuse — avoids running bcrypt 4 times with the same input.
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, BCRYPT_ROUNDS);

  for (const seedUser of SEED_USERS) {
    const user = await prisma.user.upsert({
      where: { email: seedUser.email },
      update: {
        // On repeat runs, refresh the name and role but keep the hash unchanged
        name: seedUser.name,
        role: seedUser.role,
      },
      create: {
        name: seedUser.name,
        email: seedUser.email,
        passwordHash,
        role: seedUser.role,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    console.log(`  ✅  ${user.role.padEnd(10)} → ${user.email}  (id: ${user.id})`);
  }

  console.log('\n✅  Seeding complete.');
  console.log('⚠️   These are DEVELOPMENT credentials only. Do not use in production.\n');
}

main()
  .catch((err: unknown) => {
    console.error('❌  Seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
