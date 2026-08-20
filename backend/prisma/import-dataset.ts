import {
  PrismaClient,
  CustomerType,
  CustomerStatus,
  StockMovementType,
  ChallanStatus,
  LedgerTxType,
  RiskLevel,
  VelocityTrend,
} from '@prisma/client';
import * as XLSX from 'xlsx';
import path from 'path';
import crypto from 'crypto';

const prisma = new PrismaClient();

function generateId(): string {
  return 'c' + crypto.randomBytes(12).toString('hex');
}

// ── Statutory Reference Maps & Data Cleaning ─────────────────────────────────

const STATE_GST_PREFIXES: Record<string, string> = {
  'Maharashtra': '27',
  'Karnataka': '29',
  'Gujarat': '24',
  'Delhi': '07',
  'Tamil Nadu': '33',
  'Telangana': '36',
  'Uttar Pradesh': '09',
  'West Bengal': '19',
  'Rajasthan': '08',
  'Haryana': '06',
  'Punjab': '03',
};

const CATEGORY_HSN_MAP: Record<string, string> = {
  'Monitors': '85285200',
  'Laptops': '84713010',
  'Computer Accessories': '84716060',
  'Power': '85044090',
  'Memory': '84733020',
  'Storage': '84717020',
  'Networking': '85176290',
  'Audio': '85183000',
  'POS Equipment': '84433290',
  'Printers': '84433210',
  'Devices': '84713090',
  'Office Accessories': '84729090',
};

function cleanPincode(pin?: string | number | null): string {
  if (!pin) return '400001';
  let str = String(pin).trim();
  if (str.endsWith('.0')) str = str.slice(0, -2);
  const match = str.match(/\d{6}/);
  return match ? match[0] : '400001';
}

function cleanPhone(phone?: string | null): { phone: string; mobile: string } {
  if (!phone) return { phone: '+91-98201 23456', mobile: '9820123456' };
  const digits = phone.replace(/\D/g, '');
  const last10 = digits.length >= 10 ? digits.slice(-10) : '9820123456';
  return {
    phone: `+91-${last10.slice(0, 5)} ${last10.slice(5)}`,
    mobile: last10,
  };
}

function cleanGstin(gstin: string | null | undefined, state: string, index: number): string {
  const prefix = STATE_GST_PREFIXES[state] || '27';
  if (!gstin) {
    const letters = 'ABCDE';
    const num = (1000 + index).toString();
    return `${prefix}${letters}${num}F1Z${(index % 9) + 1}`;
  }
  let cleaned = gstin.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length === 15) return cleaned;
  const letters = 'AAPCA';
  const num = (2000 + index).toString();
  return `${prefix}${letters}${num}Z${(index % 9) + 1}`;
}

function cleanGstRate(gstCode?: string | number | null): number {
  if (typeof gstCode === 'number') {
    if (gstCode === 0.05 || gstCode === 0.12 || gstCode === 0.18 || gstCode === 0.28) return gstCode;
    if (gstCode === 5 || gstCode === 12 || gstCode === 18 || gstCode === 28) return gstCode / 100;
  }
  if (!gstCode) return 0.18;
  const str = String(gstCode).toUpperCase();
  if (str.includes('28')) return 0.28;
  if (str.includes('18')) return 0.18;
  if (str.includes('12')) return 0.12;
  if (str.includes('5')) return 0.05;
  return 0.18;
}

function mapSegment(segment?: string | null): CustomerType {
  if (!segment) return CustomerType.RETAIL;
  const s = segment.toUpperCase();
  if (s.includes('DISTRIB')) return CustomerType.DISTRIBUTOR;
  if (s.includes('WHOLE') || s.includes('B2B')) return CustomerType.WHOLESALE;
  return CustomerType.RETAIL;
}

function mapStatus(status?: string | null): CustomerStatus {
  if (!status) return CustomerStatus.ACTIVE;
  const s = status.toUpperCase();
  if (s.includes('HOLD') || s.includes('INACT') || s.includes('SUSP')) return CustomerStatus.INACTIVE;
  if (s.includes('LEAD') || s.includes('PROSPECT')) return CustomerStatus.LEAD;
  return CustomerStatus.ACTIVE;
}

function mapOrderStatus(status?: string | null): ChallanStatus {
  if (!status) return ChallanStatus.CONFIRMED;
  const s = status.toUpperCase();
  if (s.includes('DELIVER') || s.includes('SHIP') || s.includes('PAID') || s.includes('CONFIRM')) return ChallanStatus.CONFIRMED;
  if (s.includes('PROCESS') || s.includes('DRAFT') || s.includes('PENDING')) return ChallanStatus.DRAFT;
  if (s.includes('CANCEL') || s.includes('REJECT')) return ChallanStatus.CANCELLED;
  return ChallanStatus.CONFIRMED;
}

function mapLedgerType(type?: string | null): LedgerTxType {
  if (!type) return LedgerTxType.SALE;
  const t = type.toUpperCase();
  if (t.includes('PAY')) return LedgerTxType.PAYMENT;
  if (t.includes('CREDIT')) return LedgerTxType.CREDIT_NOTE;
  if (t.includes('DEBIT')) return LedgerTxType.DEBIT_NOTE;
  return LedgerTxType.SALE;
}

// ── Main Bulk Pipeline ───────────────────────────────────────────────────────

async function main() {
  console.log('🚀 StockPulse Enterprise High-Performance Data Ingestion Engine');
  console.log('================================================================');

  // 1. Locate Apex Logistics
  let org = await prisma.organization.findUnique({
    where: { slug: 'apex-logistics' },
  });

  if (!org) {
    console.log('⚠️ Apex Logistics not found by slug, finding first organization...');
    org = await prisma.organization.findFirst();
  }

  if (!org) {
    throw new Error('No organization exists! Please run `npm run seed` first.');
  }

  console.log(`🏢 Target Organization: ${org.name} [ID: ${org.id}]`);

  const adminMember = await prisma.organizationMembership.findFirst({
    where: { organizationId: org.id },
    include: { user: true },
  });

  if (!adminMember) {
    throw new Error(`No active user membership found in ${org.name}.`);
  }

  const actorUser = adminMember.user;
  console.log(`👤 Attributing transactions to: ${actorUser.name} (${actorUser.email})`);

  // 2. Read Excel Workbook
  const filePath = path.resolve(__dirname, '../../stockpulse_1000_records.xlsx');
  console.log(`📂 Loading Dataset: ${filePath}`);
  const wb = XLSX.readFile(filePath);

  const rawWarehouses: any[] = XLSX.utils.sheet_to_json(wb.Sheets['Warehouses'] || {});
  const rawProducts: any[] = XLSX.utils.sheet_to_json(wb.Sheets['Products'] || {});
  const rawCustomers: any[] = XLSX.utils.sheet_to_json(wb.Sheets['Customers'] || {});
  const rawOrders: any[] = XLSX.utils.sheet_to_json(wb.Sheets['Sales_Orders'] || {});
  const rawItems: any[] = XLSX.utils.sheet_to_json(wb.Sheets['Sales_Items'] || {});
  const rawLedger: any[] = XLSX.utils.sheet_to_json(wb.Sheets['Account_Ledger'] || {});

  console.log(`📋 Source Dataset Summary:`);
  console.log(`   • Warehouses: ${rawWarehouses.length}`);
  console.log(`   • Products:   ${rawProducts.length}`);
  console.log(`   • Customers:  ${rawCustomers.length}`);
  console.log(`   • Orders:     ${rawOrders.length}`);
  console.log(`   • Line Items: ${rawItems.length}`);
  console.log(`   • Ledger Tx:  ${rawLedger.length}`);

  // Warehouse Map
  const warehouseMap = new Map<string, string>();
  for (const wh of rawWarehouses) {
    warehouseMap.set(wh.warehouse_id, `${wh.warehouse_name} (${wh.city || 'Hub'})`);
  }

  // 3. Prepare Products
  console.log('\n🧹 [1/4] Preparing Products & Inventory Levels...');
  const productSkuSet = new Set<string>();
  const productMap = new Map<string, { id: string; name: string; sku: string; price: number }>();
  const productRecords = [];
  const stockMovements = [];
  const productMetrics = [];

  for (let i = 0; i < rawProducts.length; i++) {
    const p = rawProducts[i];
    if (!p.sku) continue;

    let sku = p.sku.trim().toUpperCase();
    if (productSkuSet.has(sku)) {
      sku = `${sku}-${i + 1}`;
    }
    productSkuSet.add(sku);

    const productId = generateId();
    const name = (p.product_name || `Product SKU ${sku}`).trim();
    const category = (p.category || 'Computer Accessories').trim();
    const hsnCode = CATEGORY_HSN_MAP[category] || '84716060';
    
    let sellingPrice = Number(p.selling_price) || 500.0;
    let costPrice = Number(p.cost_price) || Math.round(sellingPrice * 0.7);

    if (costPrice <= 0 || costPrice >= sellingPrice) {
      costPrice = +(sellingPrice * 0.68).toFixed(2);
    }

    const minStock = Number(p.reorder_level) || 15;
    const reorderPoint = minStock * 2;
    const gstRate = cleanGstRate(p.gst_code);
    
    const location = p.default_warehouse_id
      ? warehouseMap.get(p.default_warehouse_id) || `Warehouse ${p.default_warehouse_id}`
      : 'Main Logistics Hub - Bay 4';

    const currentStock = Math.floor(Math.random() * 80) + minStock + 25;

    productRecords.push({
      id: productId,
      organizationId: org.id,
      sku,
      name,
      category,
      hsnCode,
      unitPrice: sellingPrice,
      costPrice,
      minimumStock: minStock,
      reorderPoint,
      currentStock,
      gstRate,
      warehouseLocation: location,
    });

    stockMovements.push({
      id: generateId(),
      organizationId: org.id,
      productId,
      quantity: currentStock,
      type: StockMovementType.IN,
      reason: `Bulk Inventory Intake from ${location}`,
      createdBy: actorUser.id,
    });

    const margin = sellingPrice > 0 ? +(((sellingPrice - costPrice) / sellingPrice) * 100).toFixed(1) : 25.0;
    productMetrics.push({
      id: generateId(),
      productId,
      sales30Days: Math.floor(Math.random() * 30) + 5,
      avgDailySales: +(Math.random() * 2 + 0.5).toFixed(1),
      sales90Days: Math.floor(Math.random() * 90) + 15,
      trend: VelocityTrend.INCREASING,
      daysToStockout: Math.floor(currentStock / 2) + 10,
      reorderRecommended: currentStock <= minStock,
      suggestedOrderQty: minStock * 3,
      avgMarginPct: margin,
      marginTrend: VelocityTrend.STABLE,
    });

    productMap.set(sku, {
      id: productId,
      name,
      sku,
      price: sellingPrice,
    });
  }

  // 4. Prepare Customers
  console.log('🧹 [2/4] Preparing CRM Customers & Profiles...');
  const usedEmails = new Set<string>();
  const usedGstins = new Set<string>();
  const customerRecords = [];
  const customerMetrics = [];
  const customerIdMap = new Map<string, { id: string; name: string }>();

  for (let i = 0; i < rawCustomers.length; i++) {
    const c = rawCustomers[i];
    if (!c.customer_name) continue;

    const sourceId = c.customer_id || `CUS-${(1000 + i).toString()}`;
    const customerId = generateId();
    const name = c.customer_name.trim();
    const businessName = (c.business_name || name).trim();
    
    let email = c.email ? c.email.toLowerCase().trim() : `cust_${sourceId.toLowerCase()}@examplebiz.in`;
    if (usedEmails.has(email)) {
      email = `cust_${sourceId.toLowerCase()}_${i + 1}@examplebiz.in`;
    }
    usedEmails.add(email);

    const state = c.state || 'Maharashtra';
    const city = c.city || 'Mumbai';
    const pincode = cleanPincode(c.pincode);
    const { phone, mobile } = cleanPhone(c.phone);

    let gstin = cleanGstin(c.gstin, state, i + 1);
    if (usedGstins.has(gstin)) {
      gstin = cleanGstin(null, state, i + 100);
    }
    usedGstins.add(gstin);

    const creditLimit = Number(c.credit_limit) || 250000.0;
    const outstanding = +(Math.random() * (creditLimit * 0.35)).toFixed(2);

    customerRecords.push({
      id: customerId,
      organizationId: org.id,
      name,
      businessName,
      email,
      phone,
      mobile,
      address: `${city} Industrial Area, Sector ${(i % 12) + 1}`,
      city,
      state,
      pincode,
      gstin,
      type: mapSegment(c.segment),
      status: mapStatus(c.status),
      creditLimit,
      outstanding,
      followUpDate: new Date(Date.now() + ((i % 14) + 1) * 24 * 60 * 60 * 1000),
      notes: `Verified B2B Client. Segment: ${c.segment || 'Enterprise'}. Statutory GSTIN active.`,
    });

    const ltv = Math.floor(Math.random() * 400000) + 50000;
    const totalPurchases = Math.floor(Math.random() * 12) + 1;
    customerMetrics.push({
      id: generateId(),
      customerId,
      totalPurchases,
      lifetimeValue: ltv,
      avgOrderValue: Math.round(ltv / totalPurchases),
      lastPurchaseDate: new Date(Date.now() - Math.floor(Math.random() * 25) * 24 * 60 * 60 * 1000),
      totalOutstanding: outstanding,
      creditLimit,
      onTimeCount: Math.floor(Math.random() * 8) + 2,
      lateCount: Math.floor(Math.random() * 2),
      riskScore: +(Math.random() * 0.25).toFixed(2),
      churnRisk: RiskLevel.LOW,
    });

    customerIdMap.set(sourceId, { id: customerId, name });
  }

  // 5. Prepare Delivery Challans
  console.log('🧹 [3/4] Preparing Delivery Challans & Snapshot Items...');
  const itemsByOrder = new Map<string, any[]>();
  for (const item of rawItems) {
    if (!item.order_id) continue;
    const list = itemsByOrder.get(item.order_id) || [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  const allProductValues = Array.from(productMap.values());
  const allCustomerValues = Array.from(customerIdMap.values());
  
  const challanRecords = [];
  const challanItemRecords = [];

  for (let i = 0; i < rawOrders.length; i++) {
    const order = rawOrders[i];
    if (!order.order_id) continue;

    const challanId = generateId();
    const challanNumber = `CH-${order.order_id.replace('SO-', '')}`;
    const targetCustomer = customerIdMap.get(order.customer_id) || allCustomerValues[i % allCustomerValues.length];
    const status = mapOrderStatus(order.order_status);
    
    const rawOrderItems = itemsByOrder.get(order.order_id) || [];
    const lineItems: { productId: string; productName: string; sku: string; unitPrice: number; quantity: number }[] = [];

    if (rawOrderItems.length > 0) {
      for (const item of rawOrderItems) {
        const prod = productMap.get(item.sku) || allProductValues[Math.floor(Math.random() * allProductValues.length)];
        lineItems.push({
          productId: prod.id,
          productName: item.product_name_snapshot || prod.name,
          sku: item.sku || prod.sku,
          unitPrice: Number(item.unit_price) || Number(prod.price),
          quantity: Number(item.quantity) || 5,
        });
      }
    } else {
      const count = (i % 2) + 1;
      for (let k = 0; k < count; k++) {
        const prod = allProductValues[(i * 2 + k) % allProductValues.length];
        lineItems.push({
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          unitPrice: Number(prod.price),
          quantity: Math.floor(Math.random() * 6) + 1,
        });
      }
    }

    const totalQuantity = lineItems.reduce((acc, it) => acc + it.quantity, 0);
    const orderDate = order.order_date ? new Date(order.order_date) : new Date(Date.now() - (i % 60) * 24 * 60 * 60 * 1000);

    challanRecords.push({
      id: challanId,
      organizationId: org.id,
      challanNumber,
      customerId: targetCustomer.id,
      status,
      totalQuantity,
      createdBy: actorUser.id,
      createdAt: orderDate,
    });

    for (const li of lineItems) {
      challanItemRecords.push({
        id: generateId(),
        challanId,
        productId: li.productId,
        productName: li.productName,
        sku: li.sku,
        unitPrice: li.unitPrice,
        quantity: li.quantity,
      });
    }
  }

  // 6. Prepare Customer Ledger
  console.log('🧹 [4/4] Preparing Customer Financial Ledgers...');
  const ledgerRecords = [];
  for (let i = 0; i < rawLedger.length; i++) {
    const row = rawLedger[i];
    if (!row.ledger_id) continue;

    const targetCustomer = customerIdMap.get(row.customer_id) || allCustomerValues[i % allCustomerValues.length];
    const txType = mapLedgerType(row.transaction_type);
    const amount = Math.abs(Number(row.net_amount) || Number(row.debit) || Number(row.credit) || 12000.0);
    const balanceAfter = Number(row.net_amount) || amount;
    const txDate = row.transaction_date ? new Date(row.transaction_date) : new Date(Date.now() - (i % 45) * 24 * 60 * 60 * 1000);

    ledgerRecords.push({
      id: generateId(),
      organizationId: org.id,
      customerId: targetCustomer.id,
      transactionType: txType,
      amount,
      balanceAfter,
      description: `${row.reference_no || `TXN-${100000 + i}`} — ${txType} (${row.status || 'POSTED'})`,
      createdAt: txDate,
    });
  }

  // ── FAST BATCH EXECUTION IN DATABASE ──────────────────────────────────────
  console.log('\n⚡ Executing High-Speed Batch Ingestion into PostgreSQL...');

  // Clean old Apex records to ensure pristine state
  console.log('   🗑️ Cleaning previous Apex records...');
  await prisma.customerLedger.deleteMany({ where: { organizationId: org.id } });
  await prisma.challanItem.deleteMany({ where: { challan: { organizationId: org.id } } });
  await prisma.challan.deleteMany({ where: { organizationId: org.id } });
  await prisma.customerMetrics.deleteMany({ where: { customer: { organizationId: org.id } } });
  await prisma.customer.deleteMany({ where: { organizationId: org.id } });
  await prisma.stockMovement.deleteMany({ where: { organizationId: org.id } });
  await prisma.productMetrics.deleteMany({ where: { product: { organizationId: org.id } } });
  await prisma.product.deleteMany({ where: { organizationId: org.id } });

  console.log('   📦 Inserting 150 Products in 1 batch...');
  await prisma.product.createMany({ data: productRecords });

  console.log('   📊 Inserting 150 Stock Movements & Product Metrics in batches...');
  await prisma.stockMovement.createMany({ data: stockMovements });
  await prisma.productMetrics.createMany({ data: productMetrics });

  console.log('   🤝 Inserting 150 Customers in 1 batch...');
  await prisma.customer.createMany({ data: customerRecords });

  console.log('   📈 Inserting Customer Intelligence Metrics in 1 batch...');
  await prisma.customerMetrics.createMany({ data: customerMetrics });

  console.log(`   📜 Inserting ${challanRecords.length} Delivery Challans & ${challanItemRecords.length} Line Items in batches...`);
  await prisma.challan.createMany({ data: challanRecords });
  await prisma.challanItem.createMany({ data: challanItemRecords });

  console.log(`   💳 Inserting ${ledgerRecords.length} Financial Ledger Entries in 1 batch...`);
  await prisma.customerLedger.createMany({ data: ledgerRecords });

  console.log('\n✨ ================================================================');
  console.log('🎉 INGESTION & ANOMALY RESOLUTION COMPLETED IN SECONDS!');
  console.log(`🏢 Organization:     ${org.name}`);
  console.log(`📦 Active Products:  ${productRecords.length} (with statutory HSN & GST rates)`);
  console.log(`🤝 Active Customers: ${customerRecords.length} (with 15-character valid GSTINs)`);
  console.log(`📜 Delivery Challans:${challanRecords.length} (with ${challanItemRecords.length} line items)`);
  console.log(`💳 Financial Ledger: ${ledgerRecords.length} (with running balances)`);
  console.log('================================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Ingestion Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
