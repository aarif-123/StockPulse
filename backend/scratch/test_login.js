const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function test() {
  try {
    const user = await prisma.user.findUnique({ where: { email: 'warehouse@example.com' } });
    console.log('User found:', user?.email, user?.id);
    if (user) {
      const match = await bcrypt.compare('Admin@123', user.passwordHash);
      console.log('Password match:', match);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
