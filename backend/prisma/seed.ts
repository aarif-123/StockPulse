import {
  PrismaClient,
  OrgRole,
  CustomerType,
  CustomerStatus,
  StockMovementType,
  ChallanStatus,
  BillingCycle,
  SubscriptionStatus,
  PaymentRequestStatus,
  AuditScope,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 10;
const DEV_PASSWORD = 'Admin@123';

async function main(): Promise<void> {
  console.log('🧹 Cleaning old database records...');

  // Delete dependent transactional and relational records in reverse dependency order
  await prisma.auditLog.deleteMany({});
  await prisma.supportSession.deleteMany({});
  await prisma.paymentRequest.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.challanItem.deleteMany({});
  await prisma.challan.deleteMany({});
  await prisma.transactionItem.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.customerLedger.deleteMany({});
  await prisma.customerMetrics.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.productMetrics.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.organizationMembership.deleteMany({});
  await prisma.organization.deleteMany({});
  await prisma.plan.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('✅ Database successfully cleared.');

  console.log('\n👑 Seeding Platform Super Admin User...');
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, BCRYPT_ROUNDS);

  const superAdmin = await prisma.user.create({
    data: {
      name: 'StockPulse Super Admin',
      email: 'superadmin@stockpulse.io',
      passwordHash,
      isSuperAdmin: true,
    },
  });

  console.log(`✅ Super Admin created: ${superAdmin.email}`);

  console.log('\n📦 Seeding Commercial Plan Matrix...');
  const starterPlan = await prisma.plan.create({
    data: {
      name: 'Starter Tier Plan',
      code: 'starter_v1',
      description: 'Essential inventory and CRM management for emerging distributors and shops.',
      monthlyPriceINR: 149.00,
      yearlyPriceINR: 1299.00,
      maxUsers: 3,
      maxProducts: 200,
      maxCustomers: 100,
      maxWarehouses: 2,
      maxTransactions: 500,
      allowedFeatures: ['CORE_ERP', 'CRM', 'CHALLANS', 'BASIC_REPORTS'],
      isActive: true,
      version: 1,
    },
  });

  const growthPlan = await prisma.plan.create({
    data: {
      name: 'Growth Pro Plan',
      code: 'growth_v1',
      description: 'Full Unleashed-grade inventory intelligence, WhatsApp transaction engine, AIM optimizer, and BOM assemblies.',
      monthlyPriceINR: 499.00,
      yearlyPriceINR: 4499.00,
      maxUsers: 10,
      maxProducts: 2000,
      maxCustomers: 1000,
      maxWarehouses: 5,
      maxTransactions: 5000,
      allowedFeatures: [
        'CORE_ERP',
        'CRM',
        'CHALLANS',
        'BASIC_REPORTS',
        'ADVANCED_INVENTORY',
        'WHATSAPP_TX',
        'EXPORT_EXCEL',
        'BOM_ASSEMBLIES',
      ],
      isActive: true,
      version: 1,
    },
  });

  const enterprisePlan = await prisma.plan.create({
    data: {
      name: 'Enterprise Scale Plan',
      code: 'enterprise_v1',
      description: 'Custom multi-warehouse distribution with unlimited SKUs, automated vendor PO hub, and dedicated SLA.',
      monthlyPriceINR: 1499.00,
      yearlyPriceINR: 12999.00,
      maxUsers: 50,
      maxProducts: 20000,
      maxCustomers: 10000,
      maxWarehouses: 20,
      maxTransactions: 50000,
      allowedFeatures: [
        'CORE_ERP',
        'CRM',
        'CHALLANS',
        'BASIC_REPORTS',
        'ADVANCED_INVENTORY',
        'WHATSAPP_TX',
        'EXPORT_EXCEL',
        'BOM_ASSEMBLIES',
        'DEDICATED_SUPPORT',
        'CUSTOM_INTEGRATIONS',
      ],
      isActive: true,
      version: 1,
    },
  });

  console.log(`✅ Seeding 3 Plans: Starter, Growth Pro, Enterprise Scale.`);

  console.log('\n🏢 Seeding Enterprise Tenant Organizations...');
  const now = new Date();
  const nextYear = new Date();
  nextYear.setFullYear(now.getFullYear() + 1);

  // 1. Apex Logistics
  const apexOrg = await prisma.organization.create({
    data: {
      name: 'Apex Logistics & Tech Solutions Pvt Ltd',
      slug: 'apex-logistics',
      currency: 'INR',
      businessGstin: '27AAPCA1234F1Z5',
      businessPhone: '022-28475900',
      businessEmail: 'contact@apexlogistics.in',
      businessAddress: 'Plot 42, MIDC Industrial Area, Andheri East',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400093',
    },
  });

  await prisma.subscription.create({
    data: {
      organizationId: apexOrg.id,
      planId: growthPlan.id,
      status: SubscriptionStatus.ACTIVE,
      billingCycle: BillingCycle.YEARLY,
      currentPeriodStart: now,
      currentPeriodEnd: nextYear,
    },
  });

  // 2. Trident Infotech
  const tridentOrg = await prisma.organization.create({
    data: {
      name: 'Trident Infotech & Hardware Hub',
      slug: 'trident-infotech',
      currency: 'INR',
      businessGstin: '24AABCT7890C1ZP',
      businessPhone: '079-26543210',
      businessEmail: 'contact@tridentinfotech.in',
      businessAddress: 'SG Highway, Bodakdev',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380054',
    },
  });

  await prisma.subscription.create({
    data: {
      organizationId: tridentOrg.id,
      planId: starterPlan.id,
      status: SubscriptionStatus.ACTIVE,
      billingCycle: BillingCycle.MONTHLY,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // 3. Zenith Corp
  const zenithOrg = await prisma.organization.create({
    data: {
      name: 'Zenith Electronics & Retail Corp',
      slug: 'zenith-electronics',
      currency: 'INR',
      businessGstin: '29AAACZ4321B1Z9',
      businessPhone: '080-41235678',
      businessEmail: 'contact@zenithelectronics.com',
      businessAddress: '100 Feet Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
    },
  });

  await prisma.subscription.create({
    data: {
      organizationId: zenithOrg.id,
      planId: enterprisePlan.id,
      status: SubscriptionStatus.ACTIVE,
      billingCycle: BillingCycle.YEARLY,
      currentPeriodStart: now,
      currentPeriodEnd: nextYear,
    },
  });

  console.log('✅ Created 3 Tenant Organizations (Apex Logistics, Trident Infotech, Zenith Electronics).');

  console.log('\n👥 Seeding Tenant Users & Roles...');
  const aarifUser = await prisma.user.create({
    data: {
      name: 'Mohammed Aarif',
      email: 'admin@example.com',
      passwordHash,
    },
  });
  await prisma.organizationMembership.create({
    data: {
      userId: aarifUser.id,
      organizationId: apexOrg.id,
      role: OrgRole.ORG_ADMIN,
    },
  });

  const priyaUser = await prisma.user.create({
    data: {
      name: 'Priya Sharma (Sales)',
      email: 'sales@example.com',
      passwordHash,
    },
  });
  await prisma.organizationMembership.createMany({
    data: [
      { userId: priyaUser.id, organizationId: apexOrg.id, role: OrgRole.SALES },
      { userId: priyaUser.id, organizationId: tridentOrg.id, role: OrgRole.SALES },
    ],
  });

  const rajeshUser = await prisma.user.create({
    data: {
      name: 'Rajesh Verma (Warehouse)',
      email: 'warehouse@example.com',
      passwordHash,
    },
  });
  await prisma.organizationMembership.create({
    data: {
      userId: rajeshUser.id,
      organizationId: apexOrg.id,
      role: OrgRole.WAREHOUSE,
    },
  });

  const snehaUser = await prisma.user.create({
    data: {
      name: 'Sneha Patel (Accounts)',
      email: 'accounts@example.com',
      passwordHash,
    },
  });
  await prisma.organizationMembership.create({
    data: {
      userId: snehaUser.id,
      organizationId: apexOrg.id,
      role: OrgRole.ACCOUNTS,
    },
  });

  const devUser = await prisma.user.create({
    data: {
      name: 'Devasnh Patel',
      email: 'john45@example.com',
      passwordHash,
    },
  });
  await prisma.organizationMembership.create({
    data: {
      userId: devUser.id,
      organizationId: apexOrg.id,
      role: OrgRole.WAREHOUSE,
    },
  });

  const amitUser = await prisma.user.create({
    data: {
      name: 'Amit Kumar (Zenith Admin)',
      email: 'amit@zenith.com',
      passwordHash,
    },
  });
  await prisma.organizationMembership.create({
    data: {
      userId: amitUser.id,
      organizationId: zenithOrg.id,
      role: OrgRole.ORG_ADMIN,
    },
  });

  console.log('✅ Created 6 Tenant Users across multi-tenant organizations.');

  console.log('\n🤝 Seeding B2B Customers for Apex Logistics...');
  const customer1 = await prisma.customer.create({
    data: {
      organizationId: apexOrg.id,
      name: 'Vikram Mehta',
      mobile: '9820123456',
      email: 'procurement@apexlogistics.in',
      businessName: 'Apex Industrial Supply Co',
      phone: '022-28475900',
      address: 'Plot 42, MIDC Industrial Area, Andheri East',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400093',
      gstin: '27AAPCA1234F1Z5',
      type: CustomerType.DISTRIBUTOR,
      status: CustomerStatus.ACTIVE,
      creditLimit: 250000.00,
      outstanding: 45000.00,
      followUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      notes: 'Key distributor for Western India. Monthly bulk dispatch required by 20th.',
    },
  });

  await prisma.customer.create({
    data: {
      organizationId: apexOrg.id,
      name: 'Ananya Deshmukh',
      mobile: '9850987654',
      email: 'orders@nexgenretail.com',
      businessName: 'NexGen Retail Enterprises',
      phone: '020-25678901',
      address: 'Commercial Complex, FC Road, Shivajinagar',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411005',
      gstin: '27AABCN5678G2Z1',
      type: CustomerType.RETAIL,
      status: CustomerStatus.ACTIVE,
      creditLimit: 100000.00,
      outstanding: 12500.00,
      followUpDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      notes: 'Retail chain with 6 outlets in Pune. Interested in wireless peripheral bundles.',
    },
  });

  await prisma.customer.create({
    data: {
      organizationId: apexOrg.id,
      name: 'ABC Traders',
      mobile: '9876543210',
      email: 'purchase@abctraders.in',
      businessName: 'ABC Traders & Hardware Supplies Pvt Ltd',
      phone: '022-25551234',
      address: 'Shop 14, Wholesale Pipe & Electric Market, Kalbadevi',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400002',
      gstin: '27AABCA1234F1Z5',
      type: CustomerType.WHOLESALE,
      status: CustomerStatus.ACTIVE,
      creditLimit: 500000.00,
      outstanding: 185400.00,
      notes: 'Premier distributor of PVC and electrical components. WhatsApp ordering enabled.',
    },
  });

  console.log(`✅ Created 3 B2B Customers for Apex Org.`);

  console.log('\n📦 Seeding Product Catalog for Apex Logistics...');
  const prod1 = await prisma.product.create({
    data: {
      organizationId: apexOrg.id,
      name: 'Logitech MX Master 3S Wireless Mouse',
      sku: 'LOG-MX3S-001',
      category: 'Computer Accessories',
      unitPrice: 8995.00,
      costPrice: 6500.00,
      currentStock: 85,
      minimumStock: 20,
      reorderPoint: 25,
      warehouseLocation: 'WH-A-01',
    },
  });

  const prod2 = await prisma.product.create({
    data: {
      organizationId: apexOrg.id,
      name: 'Dell UltraSharp 27" 4K USB-C Hub Monitor (U2723QE)',
      sku: 'DEL-U2723-4K',
      category: 'Office Equipment',
      unitPrice: 52499.00,
      costPrice: 42000.00,
      currentStock: 28,
      minimumStock: 10,
      reorderPoint: 12,
      warehouseLocation: 'WH-B-04',
    },
  });

  const prod3 = await prisma.product.create({
    data: {
      organizationId: apexOrg.id,
      name: 'Cisco Catalyst 1000 Series 24-Port Gigabit Switch',
      sku: 'CIS-C1000-24T',
      category: 'Networking',
      unitPrice: 44800.00,
      costPrice: 36000.00,
      currentStock: 14,
      minimumStock: 8,
      reorderPoint: 10,
      warehouseLocation: 'WH-C-02',
    },
  });

  const prod4 = await prisma.product.create({
    data: {
      organizationId: apexOrg.id,
      name: 'Industrial Heavy Duty PVC Pipe 20mm (6 Meter)',
      sku: 'PVC-PIPE-20MM',
      category: 'Industrial Hardware',
      unitPrice: 250.00,
      costPrice: 180.00,
      currentStock: 482,
      minimumStock: 50,
      reorderPoint: 150,
      hsnCode: '3917',
      warehouseLocation: 'WH-PIPE-01',
    },
  });

  console.log('✅ Created 4 Product Catalog items for Apex Org.');

  console.log('\n📊 Seeding Stock Movement Inward Logs...');
  await prisma.stockMovement.createMany({
    data: [
      {
        organizationId: apexOrg.id,
        productId: prod1.id,
        quantity: 100,
        type: StockMovementType.IN,
        reason: 'Initial vendor consignment receipt from Logitech India',
        createdBy: rajeshUser.id,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: apexOrg.id,
        productId: prod2.id,
        quantity: 35,
        type: StockMovementType.IN,
        reason: 'Import batch clearance received from Dell Distribution',
        createdBy: rajeshUser.id,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: apexOrg.id,
        productId: prod3.id,
        quantity: 20,
        type: StockMovementType.IN,
        reason: 'Direct manufacturer inward shipment from Cisco Systems',
        createdBy: rajeshUser.id,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: apexOrg.id,
        productId: prod4.id,
        quantity: 500,
        type: StockMovementType.IN,
        reason: 'Factory bulk consignment receipt of PVC Pipes',
        createdBy: rajeshUser.id,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log('\n🚚 Seeding Delivery Challans...');
  const challan1 = await prisma.challan.create({
    data: {
      organizationId: apexOrg.id,
      challanNumber: 'CH-000001',
      customerId: customer1.id,
      status: ChallanStatus.CONFIRMED,
      totalQuantity: 15,
      createdBy: priyaUser.id,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          {
            productId: prod2.id,
            productName: prod2.name,
            sku: prod2.sku,
            unitPrice: prod2.unitPrice,
            quantity: 5,
          },
          {
            productId: prod1.id,
            productName: prod1.name,
            sku: prod1.sku,
            unitPrice: prod1.unitPrice,
            quantity: 10,
          },
        ],
      },
    },
  });

  await prisma.stockMovement.createMany({
    data: [
      {
        organizationId: apexOrg.id,
        productId: prod2.id,
        quantity: 5,
        type: StockMovementType.OUT,
        reason: `Dispatch against delivery challan ${challan1.challanNumber}`,
        createdBy: rajeshUser.id,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: apexOrg.id,
        productId: prod1.id,
        quantity: 10,
        type: StockMovementType.OUT,
        reason: `Dispatch against delivery challan ${challan1.challanNumber}`,
        createdBy: rajeshUser.id,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log('✅ Created confirmed delivery challans & dispatch stock movements.');

  console.log('\n💳 Seeding Subscription Payment Requests...');
  // Pending Payment Request
  await prisma.paymentRequest.create({
    data: {
      organizationId: apexOrg.id,
      planId: growthPlan.id,
      amountINR: 4499.00,
      billingCycle: BillingCycle.YEARLY,
      paymentMethod: 'UPI_MANUAL',
      referenceNumber: 'UPI/2026/08/987654321012',
      status: PaymentRequestStatus.PENDING,
      submittedBy: aarifUser.id,
      notes: 'Renewed Growth Plan via GPay UPI QR scan. UTR verified on HDFC business app.',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  // Approved Payment Request
  await prisma.paymentRequest.create({
    data: {
      organizationId: zenithOrg.id,
      planId: enterprisePlan.id,
      amountINR: 12999.00,
      billingCycle: BillingCycle.YEARLY,
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: 'HDFC/NEFT/8844332211',
      status: PaymentRequestStatus.APPROVED,
      submittedBy: amitUser.id,
      reviewedBy: superAdmin.id,
      reviewedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      notes: 'Enterprise annual subscription payment confirmed by Finance desk.',
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('✅ Created pending and approved subscription payment verification records.');

  console.log('\n📜 Seeding Platform Compliance Audit Trail...');
  await prisma.auditLog.createMany({
    data: [
      {
        scope: AuditScope.PLATFORM,
        actorUserId: superAdmin.id,
        action: 'USER_LOGIN',
        resource: 'User',
        resourceId: superAdmin.id,
        metadata: JSON.stringify({ ip: '127.0.0.1', userAgent: 'Mozilla/5.0 (Windows NT 10.0)' }),
        createdAt: new Date(Date.now() - 10 * 60 * 1000),
      },
      {
        scope: AuditScope.PLATFORM,
        actorUserId: snehaUser.id,
        action: 'USER_LOGIN',
        resource: 'User',
        resourceId: snehaUser.id,
        metadata: JSON.stringify({ ip: '49.36.120.12', organization: apexOrg.name }),
        createdAt: new Date(Date.now() - 35 * 60 * 1000),
      },
      {
        scope: AuditScope.PLATFORM,
        actorUserId: superAdmin.id,
        action: 'SUPPORT_SESSION_LAUNCHED',
        resource: 'SupportSession',
        resourceId: apexOrg.id,
        metadata: JSON.stringify({ reason: 'Investigating inventory ledger reconciliation variance', impersonatedUser: aarifUser.email }),
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        scope: AuditScope.PLATFORM,
        actorUserId: superAdmin.id,
        action: 'PLAN_UPDATED',
        resource: 'Plan',
        resourceId: growthPlan.id,
        metadata: JSON.stringify({ planCode: growthPlan.code, updatedPrice: 4499.00 }),
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      },
    ],
  });

  console.log('✅ Created initial compliance audit logs.');
  console.log('\n🎉 Multi-Tenant Production Data Seed Completed Successfully!');
}

main()
  .catch((err: unknown) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
