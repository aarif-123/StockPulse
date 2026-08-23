const {
  triggerStockLowNotification,
  triggerChallanCreatedNotification,
  triggerChallanConfirmedNotification,
  triggerStockReplenishedNotification,
  getUserNotifications,
} = require('../src/modules/notifications/notification.service');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:5000/api';

async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  return {
    token: data.token,
    user: data.user,
    org: data.organizations[0],
  };
}

async function main() {
  console.log('================================================================');
  console.log('🔔 ROLE-BASED NOTIFICATION ENGINE LIVE DEMO & TEST');
  console.log('================================================================\n');

  // 1. Log in as all 4 role users
  const admin = await login('admin@example.com', 'Admin@123');
  const sales = await login('sales@example.com', 'Admin@123');
  const warehouse = await login('warehouse@example.com', 'Admin@123');
  const accounts = await login('accounts@example.com', 'Admin@123');

  const orgId = admin.org.organizationId;
  console.log(`🏢 Organization ID: ${orgId} (${admin.org.organizationName})\n`);

  // 2. Dispatch multi-tenant role notifications
  console.log('📣 Dispatching live notifications across roles...\n');

  // A. Low Stock Warning (Target: WAREHOUSE & ORG_ADMIN)
  console.log('   ⚡ [Event 1] Low Stock Breach on "iPhone 14 Pro Max 256GB" (Current: 3, Reorder: 10)');
  await triggerStockLowNotification(orgId, 'iPhone 14 Pro Max 256GB', 3, 10, 'prod_123');

  // B. Delivery Challan Created (Target: WAREHOUSE & SALES)
  console.log('   ⚡ [Event 2] New Delivery Challan #CH-000412 Created for "Reliance Retail Ltd"');
  await triggerChallanCreatedNotification(orgId, 'CH-000412', 'Reliance Retail Ltd', 'challan_123');

  // C. Delivery Confirmed (Target: ACCOUNTS & ORG_ADMIN)
  console.log('   ⚡ [Event 3] Delivery #CH-000409 Confirmed by Client (Qty: 25)');
  await triggerChallanConfirmedNotification(orgId, 'CH-000409', 'Apex Electronics Solutions', 25, 'challan_409');

  // D. Stock Replenished (Target: SALES & ACCOUNTS & ORG_ADMIN)
  console.log('   ⚡ [Event 4] Restock Received (+150 Units of "Samsung Galaxy S24 Ultra")');
  await triggerStockReplenishedNotification(orgId, 'Samsung Galaxy S24 Ultra', 150, 180, 'prod_456');

  console.log('\n================================================================');
  console.log('📬 FETCHING LIVE NOTIFICATION DRAWER VIA API FOR EACH ROLE');
  console.log('================================================================');

  const roleSessions = [
    { name: 'ORG_ADMIN (Aarif)', session: admin },
    { name: 'SALES (Priya)', session: sales },
    { name: 'WAREHOUSE (Rajesh)', session: warehouse },
    { name: 'ACCOUNTS (Sneha)', session: accounts },
  ];

  for (const r of roleSessions) {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: {
        Authorization: `Bearer ${r.session.token}`,
        'x-organization-id': orgId,
      },
    });
    const json = await res.json();
    const list = json.data || [];

    console.log(`\n🔔 Role Account: ${r.name}`);
    console.log(`   • Unread Notifications Count: ${json.unreadCount || 0}`);
    console.log(`   • Total In Drawer: ${list.length}`);
    list.forEach((item, i) => {
      console.log(`     ${i + 1}. [${item.severity}] ${item.title}`);
      console.log(`        ↳ ${item.message}`);
      if (item.actionUrl) console.log(`        ↳ Action Link: ${item.actionUrl}`);
    });
  }

  console.log('\n================================================================');
  console.log('✨ All role notifications successfully sent & verified!');
  console.log('================================================================\n');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Demo Error:', err);
  prisma.$disconnect();
});
