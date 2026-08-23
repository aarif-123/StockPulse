const notifService = require('../dist/modules/notifications/notification.service.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAll() {
  const org = await prisma.organization.findFirst();
  const users = await prisma.user.findMany({
    include: { memberships: { where: { organizationId: org.id } } }
  });

  console.log('================================================================');
  console.log('🔔 NOTIFICATION DRAWER VERIFICATION FOR ALL ROLES');
  console.log('================================================================');

  for (const user of users) {
    const role = user.memberships[0]?.role;
    const res = await notifService.getUserNotifications(org.id, user.id, role, false, 10);
    console.log(`\n👤 User: ${user.name} | Role: ${role || 'N/A'}`);
    console.log(`   🔔 Unread Count: ${res.unreadCount}`);
    console.log(`   📊 Total Notifications in Drawer: ${res.items.length}`);
    res.items.forEach((item, idx) => {
      console.log(`   ${idx + 1}. [${item.severity}] (${item.type}) ${item.title}`);
      console.log(`      ↳ ${item.message}`);
    });
  }
  await prisma.$disconnect();
}

testAll().catch(e => {
  console.error(e);
  prisma.$disconnect();
});
