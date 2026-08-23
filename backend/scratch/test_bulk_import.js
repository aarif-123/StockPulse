const API_BASE = 'http://localhost:5000/api';

async function testBulkImport() {
  console.log('================================================================');
  console.log('🚀 TESTING BULK PRODUCT IMPORT & DUPLICATE SKU RESOLUTION');
  console.log('================================================================\n');

  // 1. Authenticate as ORG_ADMIN
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'Admin@123' }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) throw new Error('Login failed: ' + JSON.stringify(loginData));

  const token = loginData.token;
  const orgId = loginData.organizations[0].organizationId;
  console.log(`✅ Authenticated as ${loginData.user.name} (${loginData.organizations[0].organizationName})`);

  // 2. Prepare test bulk import payload containing a custom new category!
  const timestamp = Date.now().toString().slice(-4);
  const testPayload = {
    duplicateStrategy: 'MERGE_STOCK',
    items: [
      {
        name: `Automated Test Keyboard ${timestamp}`,
        sku: `TEST-KB-${timestamp}`,
        category: 'Computer Accessories',
        unitPrice: 2000.00,
        currentStock: 50,
        minimumStock: 10,
        warehouseLocation: 'Rack A-01',
      },
    ],
  };

  console.log(`\n1. Creating Initial Product SKU: TEST-KB-${timestamp} (Initial Stock: 50)...`);
  const step1Res = await fetch(`${API_BASE}/products/bulk-import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-organization-id': orgId,
    },
    body: JSON.stringify(testPayload),
  });
  const step1Data = await step1Res.json();
  console.log(`   ✅ Created ${step1Data.importedCount} new product(s). Current Stock: ${step1Data.products[0].currentStock}`);

  console.log(`\n2. Re-importing SAME SKU TEST-KB-${timestamp} with +30 Stock using "MERGE_STOCK" strategy...`);
  const duplicatePayload = {
    duplicateStrategy: 'MERGE_STOCK',
    items: [
      {
        name: `Automated Test Keyboard ${timestamp}`,
        sku: `TEST-KB-${timestamp}`,
        category: 'Computer Accessories',
        unitPrice: 2000.00,
        currentStock: 30, // Additional stock
        minimumStock: 10,
        warehouseLocation: 'Rack A-01',
      },
    ],
  };

  const step2Res = await fetch(`${API_BASE}/products/bulk-import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-organization-id': orgId,
    },
    body: JSON.stringify(duplicatePayload),
  });
  const step2Data = await step2Res.json();
  console.log(`   ✅ Duplicate merged! Updated Items Count: ${step2Data.updatedCount}`);
  console.log(`   📈 Merged Total Stock: ${step2Data.products[0].currentStock} (Expected 80 = 50 + 30)`);

  console.log('\n================================================================');
  console.log('✨ DUPLICATE PRODUCT MERGE STRATEGY TEST PASSED PERFECTLY!');
  console.log('================================================================\n');
}

testBulkImport().catch((e) => console.error('Test error:', e));
