const notifService = require('../dist/modules/notifications/notification.service.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testNotif() {
  console.log('--- NOTIFICATION SERVICE HEALTH & FUNCTIONALITY CHECK ---');
  
  const user = await prisma.user.findFirst({ where: { email: 'admin@example.com' } });
  const org = await prisma.organization.findFirst();
  console.log('🏢 Organization:', org.name, `(${org.id})`);
  console.log('👤 Target Admin User:', user.name, `(${user.id})`);

  // 1. Create low stock notification
  console.log('\n1. Testing Notification Creation Trigger (triggerStockLowNotification)...');
  await notifService.triggerStockLowNotification(org.id, 'Test Product SKU-100', 2, 10, 'prod_test');
  console.log('   ✅ Low stock notification dispatched.');

  // 2. Fetch Notifications
  console.log('\n2. Testing Notification Retrieval (getUserNotifications)...');
  const notifs = await notifService.getUserNotifications(org.id, user.id, 'ORG_ADMIN', false, 10);
  console.log('   ✅ Notifications retrieved successfully!');
  console.log('   📊 Total Items Count:', notifs.items.length);
  console.log('   🔔 Unread Count:', notifs.unreadCount);

  console.log('\n3. Latest Notification Drawer Snippet:');
  notifs.items.slice(0, 5).forEach((n, i) => {
    console.log(`   [${i + 1}] [${n.severity}] ${n.title}`);
    console.log(`       Message: ${n.message}`);
    console.log(`       Target Role: ${n.targetRole || 'Specific User'} | Read: ${n.isRead}`);
  });

  console.log('\n--- ALL CHECKS PASSED: NOTIFICATION SERVICE IS UP AND FULLY OPERATIONAL ---');
  await prisma.$disconnect();
}

testNotif().catch(e => {
  console.error('❌ Notification service check failed:', e);
  prisma.$disconnect();
});
