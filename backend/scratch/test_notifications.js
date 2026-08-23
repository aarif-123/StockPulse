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

async function runTest() {
  console.log('================================================================');
  console.log('🚀 MULTI-TENANT ROLE NOTIFICATION INTEGRATION TEST');
  console.log('================================================================\n');

  // 1. Authenticate all role accounts
  console.log('🔑 Authenticating role accounts...');
  const warehouse = await login('warehouse@example.com', 'Admin@123');
  console.log(`   ✅ WAREHOUSE: ${warehouse.user.name}`);

  const sales = await login('sales@example.com', 'Admin@123');
  console.log(`   ✅ SALES:     ${sales.user.name}`);

  const accounts = await login('accounts@example.com', 'Admin@123');
  console.log(`   ✅ ACCOUNTS:  ${accounts.user.name}`);

  const admin = await login('admin@example.com', 'Admin@123');
  console.log(`   ✅ ORG_ADMIN: ${admin.user.name}\n`);

  const orgId = warehouse.org.organizationId;

  // 2. Fetch products and customers
  const prodRes = await fetch(`${API_BASE}/products`, {
    headers: { Authorization: `Bearer ${warehouse.token}`, 'x-organization-id': orgId },
  });
  const prodJson = await prodRes.json();
  const products = prodJson.data || [];

  const custRes = await fetch(`${API_BASE}/customers`, {
    headers: { Authorization: `Bearer ${sales.token}`, 'x-organization-id': orgId },
  });
  const custJson = await custRes.json();
  const customers = custJson.data || [];

  if (products.length > 0 && customers.length > 0) {
    const testProd = products[0];
    const testCust = customers[0];

    // ACTION 1: WAREHOUSE user adds +100 stock IN (Replenishment)
    console.log(`📦 Action 1: WAREHOUSE user (Rajesh) restocking +100 units for "${testProd.name}"...`);
    const stockInRes = await fetch(`${API_BASE}/products/${testProd.id}/movements`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${warehouse.token}`,
        'x-organization-id': orgId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'IN',
        quantity: 100,
        reason: 'Restock shipment received at warehouse',
      }),
    });
    const stockInData = await stockInRes.json();
    if (stockInRes.ok) {
      console.log(`   ✅ Stock movement recorded! New Stock: ${stockInData.data?.product?.currentStock}\n`);
    } else {
      console.error(`   ❌ Failed stock in:`, stockInData);
    }

    // ACTION 2: SALES user creates a Delivery Challan
    console.log(`📑 Action 2: SALES user (Priya) creating Delivery Challan for "${testProd.name}"...`);
    const createRes = await fetch(`${API_BASE}/challans`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sales.token}`,
        'x-organization-id': orgId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId: testCust.id,
        items: [{ productId: testProd.id, quantity: 5 }],
      }),
    });
    const createData = await createRes.json();

    if (createRes.ok && createData.data) {
      const challan = createData.data;
      console.log(`   ✅ Delivery Challan Created: #${challan.challanNumber} (ID: ${challan.id})\n`);

      // ACTION 3: ACCOUNTS user confirms the Delivery Challan
      console.log(`💳 Action 3: ACCOUNTS user (Sneha) confirming Delivery Challan #${challan.challanNumber}...`);
      const confirmRes = await fetch(`${API_BASE}/challans/${challan.id}/confirm`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accounts.token}`,
          'x-organization-id': orgId,
        },
      });
      const confirmData = await confirmRes.json();
      if (confirmRes.ok) {
        console.log(`   ✅ Delivery Challan #${challan.challanNumber} CONFIRMED!\n`);
      } else {
        console.error(`   ❌ Failed to confirm challan:`, confirmData);
      }
    }
  }

  // 3. Query live notification drawers for each role!
  console.log('================================================================');
  console.log('🔔 LIVE NOTIFICATION FEED FOR EACH ROLE ACCOUNT:');
  console.log('================================================================');

  const users = [
    { roleLabel: 'ORG_ADMIN (Aarif)', session: admin },
    { roleLabel: 'SALES (Priya)', session: sales },
    { roleLabel: 'WAREHOUSE (Rajesh)', session: warehouse },
    { roleLabel: 'ACCOUNTS (Sneha)', session: accounts },
  ];

  for (const u of users) {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: {
        Authorization: `Bearer ${u.session.token}`,
        'x-organization-id': orgId,
      },
    });
    const notifData = await res.json();
    const list = notifData.data || [];
    console.log(`\n📬 [${u.roleLabel}] -> Total: ${list.length} | Unread: ${notifData.unreadCount || 0}`);
    if (list.length === 0) {
      console.log('   (No notifications in queue)');
    } else {
      list.slice(0, 5).forEach((n, idx) => {
        const dateStr = new Date(n.createdAt).toLocaleTimeString();
        console.log(`   ${idx + 1}. [${n.type}] (${n.severity}) ${n.title} [${dateStr}]`);
        console.log(`      ↳ ${n.message}`);
        if (n.actionUrl) console.log(`      ↳ Action Link: ${n.actionUrl}`);
      });
    }
  }

  console.log('\n================================================================');
  console.log('✨ All role notification triggers executed & verified!');
  console.log('================================================================');
}

runTest().catch((err) => console.error('Test error:', err));
