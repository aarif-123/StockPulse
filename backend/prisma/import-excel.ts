import { PrismaClient, CustomerType, CustomerStatus, StockMovementType, ChallanStatus, LedgerTxType, RiskLevel, VelocityTrend } from '@prisma/client';
import * as XLSX from 'xlsx';
import path from 'path';

const prisma = new PrismaClient();

interface WarehouseRow {
  warehouse_id: string;
  warehouse_name: string;
  city?: string;
  state?: string;
  pincode?: string | number;
  status?: string;
  capacity_units?: number;
  current_stock_units?: number;
}

interface ProductRow {
  sku: string;
  product_name: string;
  category?: string;
  selling_price?: number;
  cost_price?: number;
  reorder_level?: number;
  gst_code?: string;
  default_warehouse_id?: string;
}

interface CustomerRow {
  customer_id: string;
  customer_name: string;
  segment?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  pincode?: string | number;
  gstin?: string;
  credit_limit?: number;
  status?: string;
}

interface SalesOrderRow {
  order_id: string;
  customer_id: string;
  warehouse_id?: string;
  order_date?: string;
  sales_channel?: string;
  subtotal?: number;
  discount?: number;
  gst_rate?: number;
  gst_amount?: number;
  grand_total?: number;
  amount_paid?: number;
  payment_status?: string;
  order_status?: string;
}

interface SalesItemRow {
  order_item_id: string;
  order_id: string;
  sku: string;
  product_name_snapshot?: string;
  quantity?: number;
  unit_price?: number;
  discount_percent?: number;
  gst_rate?: number;
  gst_amount?: number;
  line_total?: number;
}

interface LedgerRow {
  ledger_id: string;
  customer_id: string;
  transaction_date?: string;
  transaction_type?: string;
  reference_no?: string;
  debit?: number;
  credit?: number;
  net_amount?: number;
  status?: string;
}

function parseGstRate(gstCode?: string | number): number {
  if (typeof gstCode === 'number') return gstCode > 1 ? gstCode / 100 : gstCode;
  if (!gstCode) return 0.18;
  const str = String(gstCode).toUpperCase();
  if (str.includes('28')) return 0.28;
  if (str.includes('18')) return 0.18;
  if (str.includes('12')) return 0.12;
  if (str.includes('5')) return 0.05;
  if (str.includes('0')) return 0.00;
  return 0.18;
}

function mapCustomerSegment(segment?: string): CustomerType {
  if (!segment) return CustomerType.RETAIL;
  const s = segment.toUpperCase();
  if (s.includes('DISTRIB')) return CustomerType.DISTRIBUTOR;
  if (s.includes('WHOLE')) return CustomerType.WHOLESALE;
  return CustomerType.RETAIL;
}

function mapCustomerStatus(status?: string): CustomerStatus {
  if (!status) return CustomerStatus.ACTIVE;
  const s = status.toUpperCase();
  if (s.includes('LEAD') || s.includes('PROSPECT')) return CustomerStatus.LEAD;
  if (s.includes('INACT') || s.includes('SUSP')) return CustomerStatus.INACTIVE;
  return CustomerStatus.ACTIVE;
}

function mapChallanStatus(status?: string): ChallanStatus {
  if (!status) return ChallanStatus.CONFIRMED;
  const s = status.toUpperCase();
  if (s.includes('DRAFT') || s.includes('PENDING') || s.includes('PROCESS')) return ChallanStatus.DRAFT;
  if (s.includes('CANCEL') || s.includes('REJECT')) return ChallanStatus.CANCELLED;
  return ChallanStatus.CONFIRMED;
}

function mapLedgerType(type?: string): LedgerTxType {
  if (!type) return LedgerTxType.SALE;
  const t = type.toUpperCase();
  if (t.includes('PAY')) return LedgerTxType.PAYMENT;
  if (t.includes('CREDIT')) return LedgerTxType.CREDIT_NOTE;
  if (t.includes('DEBIT')) return LedgerTxType.DEBIT_NOTE;
  return LedgerTxType.SALE;
}

async function main() {
  console.log('🚀 Starting Enterprise Excel Ingestion for Apex Logistics...');

  // 1. Locate Apex Logistics
  let org = await prisma.organization.findUnique({
    where: { slug: 'apex-logistics' },
  });

  if (!org) {
    console.log('⚠️ Apex Logistics organization not found, looking for first available organization...');
    org = await prisma.organization.findFirst();
  }

  if (!org) {
    throw new Error('No organization exists in database! Please run `npm run seed` first.');
  }

  console.log(`🏢 Ingesting data into Organization: ${org.name} (${org.id}) [slug: ${org.slug}]`);

  // Ensure an admin user exists for attribution
  const adminMembership = await prisma.organizationMembership.findFirst({
    where: { organizationId: org.id },
    include: { user: true },
  });

  if (!adminMembership) {
    throw new Error(`No member found for organization ${org.name}.`);
  }

  const actorUser = adminMembership.user;
  console.log(`👤 Attributing transactions to: ${actorUser.name} (${actorUser.email})`);

  // 2. Read Excel Workbook
  const filePath = path.resolve(__dirname, '../../stockpulse_1000_records.xlsx');
  console.log(`📂 Reading Excel File from: ${filePath}`);
  const wb = XLSX.readFile(filePath);

  const warehousesData: WarehouseRow[] = XLSX.utils.sheet_to_json(wb.Sheets['Warehouses'] || {});
  const productsData: ProductRow[] = XLSX.utils.sheet_to_json(wb.Sheets['Products'] || {});
  const customersData: CustomerRow[] = XLSX.utils.sheet_to_json(wb.Sheets['Customers'] || {});
  const salesOrdersData: SalesOrderRow[] = XLSX.utils.sheet_to_json(wb.Sheets['Sales_Orders'] || {});
  const salesItemsData: SalesItemRow[] = XLSX.utils.sheet_to_json(wb.Sheets['Sales_Items'] || {});
  const ledgerData: LedgerRow[] = XLSX.utils.sheet_to_json(wb.Sheets['Account_Ledger'] || {});

  console.log(`\n📊 Sheet Summary:`);
  console.log(`  • Warehouses: ${warehousesData.length}`);
  console.log(`  • Products: ${productsData.length}`);
  console.log(`  • Customers: ${customersData.length}`);
  console.log(`  • Sales Orders: ${salesOrdersData.length}`);
  console.log(`  • Sales Items: ${salesItemsData.length}`);
  console.log(`  • Ledger Entries: ${ledgerData.length}`);

  // 3. Ingest Products
  console.log('\n📦 Ingesting Products & Inventory Levels...');
  const warehouseMap = new Map<string, string>();
  for (const wh of warehousesData) {
    warehouseMap.set(wh.warehouse_id, `${wh.warehouse_name} (${wh.city || ''})`);
  }

  const productMap = new Map<string, { id: string; name: string; sku: string; price: number }>();
  let productsCreated = 0;
  let productsUpdated = 0;

  for (const p of productsData) {
    if (!p.sku) continue;

    const sellingPrice = p.selling_price ? Number(p.selling_price) : 250.0;
    const costPrice = p.cost_price ? Number(p.cost_price) : Math.round(sellingPrice * 0.7);
    const minStock = p.reorder_level ? Number(p.reorder_level) : 15;
    const gstRate = parseGstRate(p.gst_code);
    const location = p.default_warehouse_id
      ? warehouseMap.get(p.default_warehouse_id) || p.default_warehouse_id
      : 'Central Hub - Bay A1';

    // Assign realistic starting stock
    const initialStock = Math.floor(Math.random() * 100) + minStock + 10;

    const existingProduct = await prisma.product.findUnique({
      where: {
        organizationId_sku: {
          organizationId: org.id,
          sku: p.sku,
        },
      },
    });

    let savedProduct;
    if (existingProduct) {
      savedProduct = await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          name: p.product_name || existingProduct.name,
          category: p.category || existingProduct.category,
          unitPrice: sellingPrice,
          costPrice,
          minimumStock: minStock,
          reorderPoint: minStock * 2,
          gstRate,
          warehouseLocation: location,
        },
      });
      productsUpdated++;
    } else {
      savedProduct = await prisma.product.create({
        data: {
          organizationId: org.id,
          sku: p.sku,
          name: p.product_name,
          category: p.category || 'General Electronics',
          unitPrice: sellingPrice,
          costPrice,
          minimumStock: minStock,
          reorderPoint: minStock * 2,
          currentStock: initialStock,
          gstRate,
          warehouseLocation: location,
        },
      });
      productsCreated++;

      // Create initial Stock Movement IN
      await prisma.stockMovement.create({
        data: {
          organizationId: org.id,
          productId: savedProduct.id,
          quantity: initialStock,
          type: StockMovementType.IN,
          reason: `Initial Inward Ingestion from ${location}`,
          createdBy: actorUser.id,
        },
      });

      // Create Product Metrics
      await prisma.productMetrics.create({
        data: {
          productId: savedProduct.id,
          sales30Days: Math.floor(Math.random() * 40) + 5,
          avgDailySales: +(Math.random() * 2 + 0.5).toFixed(1),
          sales90Days: Math.floor(Math.random() * 120) + 20,
          trend: VelocityTrend.INCREASING,
          daysToStockout: Math.floor(initialStock / 2) + 5,
          reorderRecommended: initialStock <= minStock,
          suggestedOrderQty: minStock * 3,
          avgMarginPct: +(((sellingPrice - costPrice) / sellingPrice) * 100).toFixed(1),
        },
      });
    }

    productMap.set(p.sku, {
      id: savedProduct.id,
      name: savedProduct.name,
      sku: savedProduct.sku,
      price: Number(savedProduct.unitPrice),
    });
  }

  console.log(`✅ Products Processed: ${productsCreated} created, ${productsUpdated} updated. Total active: ${productMap.size}`);

  // 4. Ingest Customers
  console.log('\n🤝 Ingesting Customers & Accounts...');
  const customerMap = new Map<string, { id: string; name: string }>();
  let customersCreated = 0;
  let customersUpdated = 0;

  const usedEmails = new Set<string>();
  const usedGstins = new Set<string>();

  for (let i = 0; i < customersData.length; i++) {
    const c = customersData[i];
    if (!c.customer_id) continue;

    let email = c.email ? c.email.toLowerCase().trim() : `customer_${c.customer_id.toLowerCase()}@examplebiz.in`;
    if (usedEmails.has(email)) {
      email = `cust_${c.customer_id.toLowerCase()}_${i}@examplebiz.in`;
    }
    usedEmails.add(email);

    let gstin = c.gstin ? c.gstin.trim() : null;
    if (gstin && usedGstins.has(gstin)) {
      gstin = `${gstin.slice(0, 13)}${i.toString().padStart(2, '0')}`;
    }
    if (gstin) {
      usedGstins.add(gstin);
    }

    const creditLimit = c.credit_limit ? Number(c.credit_limit) : 200000.0;
    const segment = mapCustomerSegment(c.segment);
    const status = mapCustomerStatus(c.status);

    const existingCust = await prisma.customer.findFirst({
      where: {
        organizationId: org.id,
        OR: [
          { email },
          ...(gstin ? [{ gstin }] : []),
          { name: c.customer_name },
        ],
      },
    });

    let savedCustomer;
    if (existingCust) {
      savedCustomer = await prisma.customer.update({
        where: { id: existingCust.id },
        data: {
          name: c.customer_name || existingCust.name,
          businessName: c.customer_name || existingCust.businessName,
          phone: c.phone || existingCust.phone,
          city: c.city || existingCust.city,
          state: c.state || existingCust.state,
          pincode: c.pincode ? String(c.pincode) : existingCust.pincode,
          type: segment,
          status,
          creditLimit,
        },
      });
      customersUpdated++;
    } else {
      const outstanding = Math.floor(Math.random() * (creditLimit * 0.4));
      savedCustomer = await prisma.customer.create({
        data: {
          organizationId: org.id,
          name: c.customer_name,
          businessName: c.customer_name,
          email,
          phone: c.phone || '+91-9876543210',
          mobile: c.phone ? c.phone.replace(/[^0-9]/g, '').slice(-10) : '9876543210',
          address: `${c.city || 'Industrial Estate'}, ${c.state || 'Maharashtra'}`,
          city: c.city || 'Mumbai',
          state: c.state || 'Maharashtra',
          pincode: c.pincode ? String(c.pincode) : '400001',
          gstin,
          type: segment,
          status,
          creditLimit,
          outstanding,
          followUpDate: new Date(Date.now() + (Math.floor(Math.random() * 14) + 1) * 24 * 60 * 60 * 1000),
          notes: `Ingested from enterprise master. Segment: ${c.segment || 'Retailer'}.`,
        },
      });
      customersCreated++;

      // Create Customer Metrics
      await prisma.customerMetrics.create({
        data: {
          customerId: savedCustomer.id,
          totalPurchases: Math.floor(Math.random() * 15) + 1,
          lifetimeValue: Math.floor(Math.random() * 400000) + 50000,
          avgOrderValue: Math.floor(Math.random() * 35000) + 5000,
          lastPurchaseDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
          totalOutstanding: Number(savedCustomer.outstanding),
          creditLimit,
          onTimeCount: Math.floor(Math.random() * 8) + 2,
          lateCount: Math.floor(Math.random() * 2),
          riskScore: +(Math.random() * 0.3).toFixed(2),
          churnRisk: RiskLevel.LOW,
        },
      });
    }

    customerMap.set(c.customer_id, {
      id: savedCustomer.id,
      name: savedCustomer.name,
    });
  }

  console.log(`✅ Customers Processed: ${customersCreated} created, ${customersUpdated} updated. Total active: ${customerMap.size}`);

  // 5. Ingest Sales Orders & Items as Statutory Delivery Challans
  console.log('\n📜 Ingesting Sales Orders & Line Items as Delivery Challans...');
  
  // Group sales items by order_id
  const itemsByOrder = new Map<string, SalesItemRow[]>();
  for (const item of salesItemsData) {
    if (!item.order_id) continue;
    const list = itemsByOrder.get(item.order_id) || [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  const allProductList = Array.from(productMap.values());
  const allCustomerList = Array.from(customerMap.values());

  let challansCreated = 0;
  for (const order of salesOrdersData) {
    if (!order.order_id) continue;

    const challanNumber = `CH-${order.order_id.replace('SO-', '')}`;
    
    // Check if challan already exists
    const existingChallan = await prisma.challan.findUnique({
      where: {
        organizationId_challanNumber: {
          organizationId: org.id,
          challanNumber,
        },
      },
    });

    if (existingChallan) continue;

    // Resolve customer
    const targetCustomer = customerMap.get(order.customer_id) || allCustomerList[Math.floor(Math.random() * allCustomerList.length)];
    if (!targetCustomer) continue;

    const challanStatus = mapChallanStatus(order.order_status);
    const orderItems = itemsByOrder.get(order.order_id) || [];

    // If no direct sales items in sheet for this order, create 1-3 realistic line items
    const lineItemsToInsert: { productId: string; productName: string; sku: string; unitPrice: number; quantity: number }[] = [];

    if (orderItems.length > 0) {
      for (const item of orderItems) {
        const prod = productMap.get(item.sku) || allProductList[Math.floor(Math.random() * allProductList.length)];
        lineItemsToInsert.push({
          productId: prod.id,
          productName: item.product_name_snapshot || prod.name,
          sku: item.sku || prod.sku,
          unitPrice: item.unit_price ? Number(item.unit_price) : prod.price,
          quantity: item.quantity ? Number(item.quantity) : 5,
        });
      }
    } else {
      const itemCount = (challansCreated % 3) + 1;
      for (let k = 0; k < itemCount; k++) {
        const prod = allProductList[(challansCreated * 3 + k) % allProductList.length];
        lineItemsToInsert.push({
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          unitPrice: prod.price,
          quantity: Math.floor(Math.random() * 10) + 2,
        });
      }
    }

    const totalQuantity = lineItemsToInsert.reduce((sum, item) => sum + item.quantity, 0);

    const orderDate = order.order_date ? new Date(order.order_date) : new Date();

    await prisma.challan.create({
      data: {
        organizationId: org.id,
        challanNumber,
        customerId: targetCustomer.id,
        status: challanStatus,
        totalQuantity,
        createdBy: actorUser.id,
        createdAt: orderDate,
        items: {
          create: lineItemsToInsert.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
          })),
        },
      },
    });

    challansCreated++;
  }

  console.log(`✅ Delivery Challans Ingested: ${challansCreated} records.`);

  // 6. Ingest Account Ledger
  console.log('\n💳 Ingesting Customer Financial Ledger...');
  let ledgerCount = 0;

  for (const row of ledgerData) {
    if (!row.ledger_id) continue;

    const targetCustomer = customerMap.get(row.customer_id) || allCustomerList[Math.floor(Math.random() * allCustomerList.length)];
    if (!targetCustomer) continue;

    const txType = mapLedgerType(row.transaction_type);
    const amount = Math.abs(Number(row.net_amount) || Number(row.debit) || Number(row.credit) || 15000.0);
    const balanceAfter = Number(row.net_amount) || amount;
    const txDate = row.transaction_date ? new Date(row.transaction_date) : new Date();

    await prisma.customerLedger.create({
      data: {
        organizationId: org.id,
        customerId: targetCustomer.id,
        transactionType: txType,
        amount,
        balanceAfter,
        description: `${row.reference_no || 'TXN-AUTO'} — ${row.transaction_type || 'TRANSACTION'} (${row.status || 'POSTED'})`,
        createdAt: txDate,
      },
    });

    ledgerCount++;
  }

  console.log(`✅ Financial Ledger Ingested: ${ledgerCount} entries.`);

  console.log('\n✨ =======================================================');
  console.log('🎉 Ingestion Complete! 1000-Record Dataset Successfully Processed.');
  console.log(`🏢 Tenant: ${org.name}`);
  console.log(`📦 Active Catalog Products: ${productMap.size}`);
  console.log(`🤝 Active CRM Customers: ${customerMap.size}`);
  console.log(`📜 Total Delivery Challans: ${challansCreated}`);
  console.log(`💳 Financial Ledger Transactions: ${ledgerCount}`);
  console.log('=======================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during Excel ingestion:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
