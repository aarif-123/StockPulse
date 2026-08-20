import { productService } from '../services/product.service';
import { customerService } from '../services/customer.service';
import { challanService } from '../services/challan.service';
import { dashboardService } from '../services/dashboard.service';
import { reportService } from '../services/report.service';
import type { User, UserOrganizationSummary } from '../types';

export interface CopilotCardData {
  type: 'products' | 'customers' | 'stats' | 'challans' | 'movements' | 'valuation' | 'bom';
  items?: any[];
  stats?: any;
  categoryBreakdown?: any[];
}

export interface CopilotActionSummaryDetail {
  label: string;
  value: string;
  highlight?: boolean;
  color?: string;
}

export interface CopilotActionPayload {
  id: string;
  actionType:
    | 'CREATE_CHALLAN'
    | 'MOVE_STOCK'
    | 'CONFIRM_CHALLAN'
    | 'CANCEL_CHALLAN'
    | 'CREATE_CUSTOMER'
    | 'CREATE_PRODUCT'
    | 'BUILD_BOM_ASSEMBLY';
  isSerious?: boolean;
  seriousWarning?: string;
  title: string;
  description: string;
  summaryDetails: CopilotActionSummaryDetail[];
  params: any;
  availableCustomers?: Array<{ id: string; name: string; businessName?: string }>;
  availableProducts?: Array<{
    id: string;
    name: string;
    sku: string;
    unitPrice: number;
    currentStock: number;
  }>;
  availableChallans?: Array<{
    id: string;
    challanNumber: string;
    customerName: string;
    totalQuantity: number;
  }>;
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'REJECTED' | 'FAILED';
  errorMessage?: string;
  executionResult?: any;
}

export interface CopilotResponse {
  text: string;
  cardData?: CopilotCardData;
  action?: CopilotActionPayload;
  suggestedPrompts?: string[];
}

interface UserContext {
  user: User | null;
  activeOrg: UserOrganizationSummary | null;
}

// Built-in BOM Recipes Catalog
export const BOM_BUNDLES = [
  {
    id: 'BOM-001',
    bundleName: 'Executive 4K Dual-Screen Workstation Kit',
    sku: 'KIT-EXEC-4K',
    category: 'Workstation Bundles',
    sellingPrice: 79999.0,
    components: [
      { productSku: 'DEL-U2723-4K', productName: 'Dell UltraSharp 27" 4K Monitor', qtyRequired: 1 },
      { productSku: 'LOG-MX3S-001', productName: 'Logitech MX Master 3S Wireless Mouse', qtyRequired: 1 },
      { productSku: 'SAM-990P-2TB', productName: 'Samsung 990 PRO 2TB NVMe SSD', qtyRequired: 1 },
    ],
  },
  {
    id: 'BOM-002',
    bundleName: 'Enterprise Network Core Setup (24-Port + Fast Storage)',
    sku: 'KIT-NET-CORE',
    category: 'Networking Kits',
    sellingPrice: 72500.0,
    components: [
      { productSku: 'CIS-C1000-24T', productName: 'Cisco Catalyst 1000 Series 24-Port Switch', qtyRequired: 1 },
      { productSku: 'SAM-990P-2TB', productName: 'Samsung 990 PRO 2TB NVMe SSD', qtyRequired: 2 },
    ],
  },
  {
    id: 'BOM-003',
    bundleName: 'Commercial Cloud Productivity Package (10 Seats)',
    sku: 'KIT-CLOUD-10',
    category: 'Software Bundles',
    sellingPrice: 109900.0,
    components: [
      { productSku: 'MS-365-BUS-01', productName: 'Microsoft 365 Business Standard (1-Year)', qtyRequired: 10 },
      { productSku: 'LOG-MX3S-001', productName: 'Logitech MX Master 3S Wireless Mouse', qtyRequired: 5 },
    ],
  },
];

/**
 * Normalizes input text and applies phonetic/spelling fixes for domain terms
 */
function normalizeQuery(raw: string): { clean: string; tokens: string[] } {
  let text = raw.toLowerCase().trim();

  // Replace common punctuation with space
  text = text.replace(/[,.?!;:()"'`[\]{}]/g, ' ');

  // Typo & phonetic dictionary corrections
  const typoMap: Record<string, string> = {
    'chalana': 'challan',
    'chalans': 'challan',
    'chalan': 'challan',
    'chalanas': 'challan',
    'chalanan': 'challan',
    'chalanis': 'challan',
    'challans': 'challan',
    'challand': 'challan',
    'chalands': 'challan',
    'chalaan': 'challan',
    'invoices': 'challan',
    'invoice': 'challan',
    'dispatchs': 'challan',
    'dispatches': 'challan',
    'dispatch': 'challan',
    'stok': 'stock',
    'stks': 'stock',
    'stoc': 'stock',
    'stck': 'stock',
    'inventry': 'inventory',
    'godown': 'inventory',
    'prodcut': 'product',
    'prduct': 'product',
    'prod': 'product',
    'prods': 'product',
    'products': 'product',
    'items': 'product',
    'item': 'product',
    'costomer': 'customer',
    'custmer': 'customer',
    'customr': 'customer',
    'customers': 'customer',
    'clients': 'customer',
    'client': 'customer',
    'valution': 'valuation',
    'valuaion': 'valuation',
    'worth': 'valuation',
    'leed': 'lead',
    'leeds': 'lead',
    'leads': 'lead',
    'mvmt': 'movement',
    'mvmts': 'movement',
    'movements': 'movement',
    'transfers': 'movement',
    'transfer': 'movement',
    'inwards': 'inward',
    'outwards': 'outward',
    'inwrd': 'inward',
    'outwrd': 'outward',
    'creat': 'create',
    'creae': 'create',
    'billof': 'bill of',
    'bill': 'bill',
    'materials': 'materials',
    'material': 'materials',
    'bom': 'bom',
    'assembly': 'assembly',
    'assemblies': 'assembly',
    'production': 'assembly',
    'manufacturing': 'assembly',
    'bundles': 'assembly',
    'bundle': 'assembly',
    'kits': 'assembly',
    'kit': 'assembly',
    'dost': 'dost',
    'copilot': 'dost',
  };

  const words = text.split(/\s+/).filter(Boolean);
  const normalizedWords = words.map((w) => typoMap[w] || w);
  const clean = normalizedWords.join(' ');

  return { clean, tokens: normalizedWords };
}

/**
 * Extracts specific subject/entity from phrases like "stock of [item]", "price of [item]", "find [item]"
 */
function extractEntitySearchTerm(raw: string): string {
  let str = raw.trim();

  const prefixPatterns = [
    /^(?:i am admin\s*,?\s*)?(?:please\s+)?(?:can you\s+)?(?:tell me\s+)?(?:show me\s+)?(?:check\s+)?(?:get\s+)?(?:what is the\s+)?(?:what's the\s+)?(?:how many\s+)?(?:find\s+)?(?:lookup\s+)?(?:search for\s+)?(?:details of\s+)?(?:stock of\s+)?(?:price of\s+)?(?:info for\s+)?(?:where is\s+)?/i,
  ];

  for (const pattern of prefixPatterns) {
    str = str.replace(pattern, '').trim();
  }

  str = str.replace(/\s+(?:left|available|present|in stock|remaining|items|products)\s*$/i, '').trim();
  return str;
}

/**
 * Parses numbers from query string
 */
function extractQuantity(text: string): number | null {
  const qtyMatch = text.match(/(?:qty|quantity|units?|count|pieces?|pcs?|nos?)?\s*[:=]?\s*(\d+)/i);
  if (qtyMatch) {
    const num = parseInt(qtyMatch[1], 10);
    if (!isNaN(num) && num > 0) return num;
  }
  const generalNum = text.match(/\b(\d+)\b/);
  if (generalNum) {
    const num = parseInt(generalNum[1], 10);
    if (!isNaN(num) && num > 0) return num;
  }
  return null;
}

/**
 * Executes confirmed actions with real-time API invocation
 */
export async function executeCopilotAction(action: CopilotActionPayload): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> {
  try {
    switch (action.actionType) {
      case 'CREATE_CHALLAN': {
        const payload = action.params;
        const res = await challanService.createChallan(payload);
        return {
          success: true,
          message: `🎉 Successfully created Draft Delivery Challan **#${res.data.challanNumber}** with **${res.data.totalQuantity} units**!`,
          data: res.data,
        };
      }

      case 'MOVE_STOCK': {
        const { productId, type, quantity, reason } = action.params;
        const res = await productService.createStockMovement(productId, {
          type,
          quantity: Number(quantity),
          reason: reason || `DOST Action - ${type === 'IN' ? 'Stock Inward' : 'Stock Outward'}`,
        });
        return {
          success: true,
          message: `✅ Stock updated successfully! **${res.data.product.name}** now has **${res.data.product.currentStock} units** in stock.`,
          data: res.data,
        };
      }

      case 'BUILD_BOM_ASSEMBLY': {
        const { components, bundleName, sku } = action.params;
        // Deduct all components
        for (const comp of components) {
          if (comp.productId) {
            await productService.createStockMovement(comp.productId, {
              type: 'OUT',
              quantity: comp.qtyRequired,
              reason: `BOM Assembly Production: 1x "${bundleName}" (${sku})`,
            });
          }
        }
        return {
          success: true,
          message: `🛠️ Successfully assembled 1x **${bundleName}**! Components have been deducted from active stock.`,
          data: { bundleName, sku },
        };
      }

      case 'CONFIRM_CHALLAN': {
        const { challanId } = action.params;
        const res = await challanService.confirmChallan(challanId);
        return {
          success: true,
          message: `🚚 Delivery Challan **#${res.data.challanNumber}** is now **CONFIRMED**! Warehouse inventory has been permanently deducted.`,
          data: res.data,
        };
      }

      case 'CANCEL_CHALLAN': {
        const { challanId, challanNumber } = action.params;
        const res = await challanService.cancelChallan(challanId);
        return {
          success: true,
          message: `🚫 Delivery Challan **#${challanNumber || res.data.challanNumber}** has been **CANCELLED**.`,
          data: res.data,
        };
      }

      case 'CREATE_CUSTOMER': {
        const res = await customerService.createCustomer(action.params);
        return {
          success: true,
          message: `👥 Successfully added new customer account for **${res.data.businessName || res.data.name}**!`,
          data: res.data,
        };
      }

      case 'CREATE_PRODUCT': {
        const res = await productService.createProduct(action.params);
        return {
          success: true,
          message: `📦 Product **${res.data.name}** (SKU: ${res.data.sku}) added to catalog with **${res.data.currentStock} units**!`,
          data: res.data,
        };
      }

      default:
        throw new Error('Unsupported action type');
    }
  } catch (err: any) {
    const errorMsg =
      err.response?.data?.error?.message ||
      err.response?.data?.message ||
      err.message ||
      'Operation failed. Please check permissions or data validity.';
    return {
      success: false,
      message: errorMsg,
    };
  }
}

/**
 * Main Copilot & DOST Action & Natural Language Engine
 */
export async function processCopilotQuery(
  rawQuery: string,
  context: UserContext
): Promise<CopilotResponse> {
  const { clean } = normalizeQuery(rawQuery);
  const rawLower = rawQuery.toLowerCase();
  const orgName = context.activeOrg?.organizationName || 'your organization';
  const userName = context.user?.name || 'there';

  // =========================================================================
  // INTENT: BILL OF MATERIALS (BOM) & PRODUCTION ASSEMBLIES
  // =========================================================================
  if (
    clean.includes('bill of materials') ||
    clean.includes('bill of material') ||
    clean.includes('materials') ||
    clean.includes('bom') ||
    clean.includes('assembly') ||
    clean.includes('assemblies') ||
    clean.includes('manufacturing') ||
    clean.includes('bundle') ||
    clean.includes('bundles') ||
    clean.includes('recipe') ||
    rawLower.includes('billof')
  ) {
    // If user wants to build an assembly
    const isBuildAction =
      clean.includes('build') ||
      clean.includes('assemble') ||
      clean.includes('manufacture') ||
      clean.includes('create assembly');

    const prodRes = await productService.getProducts({ limit: 100 }).catch(() => ({ data: [] }));
    const products = prodRes.data || [];
    const prodMap = new Map(products.map((p) => [p.sku, p]));

    const computedBOMs = BOM_BUNDLES.map((bom) => {
      let maxCanBuild = Infinity;
      let bottleneckSku = '';
      let bottleneckName = '';

      const detailedComponents = bom.components.map((comp) => {
        const prod = prodMap.get(comp.productSku);
        const onHand = prod ? Number(prod.currentStock || 0) : 0;
        const possibleUnits = Math.floor(onHand / comp.qtyRequired);

        if (possibleUnits < maxCanBuild) {
          maxCanBuild = possibleUnits;
          bottleneckSku = comp.productSku;
          bottleneckName = comp.productName;
        }

        return {
          ...comp,
          productId: prod?.id,
          currentStock: onHand,
        };
      });

      return {
        ...bom,
        canAssembleQty: maxCanBuild === Infinity ? 0 : maxCanBuild,
        components: detailedComponents,
        bottleneckSku: bottleneckSku || undefined,
        bottleneckName: bottleneckName || undefined,
      };
    });

    if (isBuildAction) {
      // Find matching BOM
      const targetBOM =
        computedBOMs.find(
          (b) =>
            clean.includes(b.bundleName.toLowerCase()) ||
            clean.includes(b.sku.toLowerCase()) ||
            clean.includes(b.category.toLowerCase())
        ) || computedBOMs[0];

      if (targetBOM.canAssembleQty <= 0) {
        return {
          text: `⚠️ **Cannot build assembly:** One or more components for **${targetBOM.bundleName}** are out of stock (Bottleneck: ${targetBOM.bottleneckName || targetBOM.bottleneckSku}).`,
          cardData: { type: 'bom', items: [targetBOM] },
          suggestedPrompts: [
            `Inward 10 stock for ${targetBOM.bottleneckName || 'product'}`,
            'Show Bill of Materials',
            'Show workspace stats & KPIs',
          ],
        };
      }

      const actionPayload: CopilotActionPayload = {
        id: `act-${Date.now()}`,
        actionType: 'BUILD_BOM_ASSEMBLY',
        title: `Build BOM Assembly: ${targetBOM.bundleName}`,
        description: `🚨 **High-Impact Production Action**: Assembling 1x **${targetBOM.bundleName}** will consume and permanently deduct component units from active inventory.`,
        isSerious: true,
        seriousWarning: `Assembling 1x ${targetBOM.bundleName} will deduct inventory for ${targetBOM.components.length} component items in your godown.`,
        summaryDetails: [
          { label: 'Assembly Recipe', value: `${targetBOM.bundleName} (${targetBOM.sku})`, highlight: true },
          { label: 'Selling Price', value: `₹${targetBOM.sellingPrice.toLocaleString('en-IN')}`, color: 'var(--success)' },
          { label: 'Components Consumed', value: `${targetBOM.components.map((c) => `${c.qtyRequired}x ${c.productName}`).join(' + ')}` },
          { label: 'Remaining Capacity', value: `${targetBOM.canAssembleQty - 1} units after build` },
        ],
        params: {
          bundleName: targetBOM.bundleName,
          sku: targetBOM.sku,
          components: targetBOM.components,
        },
        status: 'PENDING',
      };

      return {
        text: `🚨 **Permission Required to Build Production Assembly:**\n\nReview the component deduction requirements for **${targetBOM.bundleName}** and authorize production below:`,
        action: actionPayload,
        suggestedPrompts: [
          'Show Bill of Materials',
          'Show low stock products',
          'tell me the pending chalana',
        ],
      };
    }

    const totalPipelineValue = computedBOMs.reduce(
      (acc, b) => acc + b.sellingPrice * b.canAssembleQty,
      0
    );

    return {
      text: `🛠️ **Bill of Materials (BOM) & Production Assemblies:**\n\nTrack multi-component manufacturing kits, live assembly capacity, and component bottleneck inventory in **${orgName}**:`,
      cardData: {
        type: 'bom',
        items: computedBOMs,
        stats: {
          totalPipelineValue,
          readyBundles: computedBOMs.filter((b) => b.canAssembleQty > 0).length,
          totalRecipes: computedBOMs.length,
        },
      },
      suggestedPrompts: [
        `Build assembly for ${computedBOMs[0].bundleName}`,
        'Show low stock products',
        'What is our inventory valuation?',
        'tell me the pending chalana',
      ],
    };
  }

  // =========================================================================
  // ACTION 1: CREATE DELIVERY CHALLAN
  // =========================================================================
  if (
    (clean.includes('create') ||
      clean.includes('make') ||
      clean.includes('generate') ||
      clean.includes('issue') ||
      clean.includes('draft') ||
      clean.includes('new challan') ||
      clean.includes('bill')) &&
    (clean.includes('challan') ||
      clean.includes('delivery') ||
      clean.includes('dispatch') ||
      rawLower.includes('chalan') ||
      rawLower.includes('chalana') ||
      rawLower.includes('challand'))
  ) {
    // Fetch catalogs to resolve customer and products
    const [custRes, prodRes] = await Promise.all([
      customerService.getCustomers({ limit: 100 }).catch(() => ({ data: [] })),
      productService.getProducts({ limit: 100 }).catch(() => ({ data: [] })),
    ]);

    const customers = custRes.data || [];
    const products = prodRes.data || [];

    if (customers.length === 0 || products.length === 0) {
      return {
        text: `⚠️ Cannot prepare a delivery challan because your catalog does not have active customers or products yet. Please ensure you have added at least one customer and product.`,
      };
    }

    // Try to find matching customer from query
    let targetCustomer = customers.find(
      (c) =>
        clean.includes(c.name.toLowerCase()) ||
        (c.businessName && clean.includes(c.businessName.toLowerCase()))
    );

    if (!targetCustomer) {
      targetCustomer = customers[0]; // Default to first active customer
    }

    // Try to find matching product(s) from query
    let targetProduct = products.find(
      (p) =>
        clean.includes(p.name.toLowerCase()) ||
        clean.includes(p.sku.toLowerCase())
    );

    if (!targetProduct) {
      // Find product with available stock
      targetProduct = products.find((p) => (p.currentStock || 0) > 0) || products[0];
    }

    // Parse quantity
    const quantity = extractQuantity(rawQuery) || 5;
    const totalEstimatedAmount = Number(targetProduct.unitPrice || 0) * quantity;

    const actionPayload: CopilotActionPayload = {
      id: `act-${Date.now()}`,
      actionType: 'CREATE_CHALLAN',
      title: 'Create Draft Delivery Challan',
      description: `DOST will create a new delivery challan for **${targetCustomer.businessName || targetCustomer.name}**. You can tweak parameters or click Approve to execute.`,
      isSerious: false,
      summaryDetails: [
        { label: 'Customer', value: targetCustomer.businessName || targetCustomer.name, highlight: true },
        { label: 'Product Item', value: `${targetProduct.name} (${targetProduct.sku})` },
        { label: 'Dispatch Quantity', value: `${quantity} units`, highlight: true, color: '#38bdf8' },
        { label: 'Unit Price', value: `₹${Number(targetProduct.unitPrice).toLocaleString('en-IN')}` },
        { label: 'Est. Total Value', value: `₹${totalEstimatedAmount.toLocaleString('en-IN')}`, color: 'var(--success)' },
        { label: 'Available Stock', value: `${targetProduct.currentStock} units in warehouse` },
      ],
      availableCustomers: customers.map((c) => ({ id: c.id, name: c.name, businessName: c.businessName })),
      availableProducts: products.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        unitPrice: Number(p.unitPrice || 0),
        currentStock: Number(p.currentStock || 0),
      })),
      params: {
        customerId: targetCustomer.id,
        items: [
          {
            productId: targetProduct.id,
            quantity,
          },
        ],
      },
      status: 'PENDING',
    };

    return {
      text: `🛡️ **Permission Required to Create Challan:**\n\nI have prepared the draft delivery challan for **${targetCustomer.businessName || targetCustomer.name}**. Review or adjust the parameters below and grant permission to execute:`,
      action: actionPayload,
      suggestedPrompts: [
        'tell me the pending chalana',
        'Show low stock products',
        'Show workspace stats & KPIs',
      ],
    };
  }

  // =========================================================================
  // ACTION 2: MOVE STOCK (INWARD / OUTWARD ADJUSTMENTS)
  // =========================================================================
  if (
    clean.includes('move stock') ||
    clean.includes('add stock') ||
    clean.includes('inward stock') ||
    clean.includes('outward stock') ||
    clean.includes('adjust stock') ||
    clean.includes('receive stock') ||
    clean.includes('deduct stock') ||
    clean.includes('reduce stock') ||
    clean.includes('restock') ||
    (clean.includes('stock') && (clean.includes('inward') || clean.includes('outward') || clean.includes('in') || clean.includes('out')))
  ) {
    const prodRes = await productService.getProducts({ limit: 100 }).catch(() => ({ data: [] }));
    const products = prodRes.data || [];

    if (products.length === 0) {
      return { text: `⚠️ No products found in workspace to adjust stock for.` };
    }

    // Determine type: IN or OUT
    const isOut =
      clean.includes('outward') ||
      clean.includes('out') ||
      clean.includes('deduct') ||
      clean.includes('reduce') ||
      clean.includes('damaged') ||
      clean.includes('loss');
    const moveType: 'IN' | 'OUT' = isOut ? 'OUT' : 'IN';

    // Find matching product
    let targetProduct = products.find(
      (p) =>
        clean.includes(p.name.toLowerCase()) ||
        clean.includes(p.sku.toLowerCase())
    );

    if (!targetProduct) {
      targetProduct = products[0];
    }

    const quantity = extractQuantity(rawQuery) || 10;
    const currentStock = targetProduct.currentStock || 0;
    const newStock = moveType === 'IN' ? currentStock + quantity : Math.max(0, currentStock - quantity);
    const reason = `DOST AI Assistant - ${moveType === 'IN' ? 'Restock / Inward' : 'Manual stock adjustment'}`;

    const isSerious = moveType === 'OUT' || quantity >= 50;

    const actionPayload: CopilotActionPayload = {
      id: `act-${Date.now()}`,
      actionType: 'MOVE_STOCK',
      title: `${moveType === 'IN' ? 'Inward Stock Movement' : 'Outward Stock Deduction'}`,
      description: isSerious
        ? `⚠️ **High-Impact Inventory Action**: This will ${moveType === 'IN' ? 'add' : 'deduct'} inventory units and create an official stock ledger entry.`
        : `DOST will record an inventory movement and adjust live warehouse stock in **${orgName}**.`,
      isSerious,
      seriousWarning: isSerious
        ? 'Deducting stock reduces live physical inventory in the database and updates audit logs.'
        : undefined,
      summaryDetails: [
        { label: 'Product', value: `${targetProduct.name} (${targetProduct.sku})`, highlight: true },
        { label: 'Movement Type', value: `${moveType} (${moveType === 'IN' ? 'Inward / Add' : 'Outward / Deduct'})`, color: moveType === 'IN' ? 'var(--success)' : 'var(--danger)' },
        { label: 'Quantity to Move', value: `${moveType === 'IN' ? '+' : '-'}${quantity} units`, highlight: true },
        { label: 'Current Stock', value: `${currentStock} units` },
        { label: 'Projected Stock After Movement', value: `${newStock} units`, highlight: true, color: moveType === 'IN' ? 'var(--success)' : '#f59e0b' },
        { label: 'Reason', value: reason },
      ],
      availableProducts: products.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        unitPrice: Number(p.unitPrice || 0),
        currentStock: Number(p.currentStock || 0),
      })),
      params: {
        productId: targetProduct.id,
        type: moveType,
        quantity,
        reason,
      },
      status: 'PENDING',
    };

    return {
      text: isSerious
        ? `🚨 **High-Impact Action — Explicit Confirmation Required:**\n\nPlease verify that you want to execute this **${moveType} stock movement** for **${targetProduct.name}**:`
        : `🛡️ **Permission Required to Adjust Stock:**\n\nPlease review and approve the inventory movement below:`,
      action: actionPayload,
      suggestedPrompts: [
        'Recent stock movements',
        'Show low stock products',
        'Show workspace stats & KPIs',
      ],
    };
  }

  // =========================================================================
  // ACTION 3: CONFIRM DELIVERY CHALLAN
  // =========================================================================
  if (
    (clean.includes('confirm') || clean.includes('approve') || clean.includes('finalize')) &&
    (clean.includes('challan') || rawLower.includes('chalan') || rawLower.includes('chalana') || rawLower.includes('challand'))
  ) {
    const challanMatch = rawQuery.match(/CH-\d+/i);
    const specificSearch = challanMatch ? challanMatch[0] : undefined;

    const draftRes = await challanService.getChallans({
      status: 'DRAFT',
      search: specificSearch,
      limit: 10,
    });
    const drafts = draftRes.data || [];

    if (drafts.length === 0) {
      return {
        text: `ℹ️ No pending draft challans found to confirm. All dispatches are already confirmed or cancelled.`,
        suggestedPrompts: ['tell me the pending chalana', 'Show confirmed challans'],
      };
    }

    const targetChallan = drafts[0];

    const actionPayload: CopilotActionPayload = {
      id: `act-${Date.now()}`,
      actionType: 'CONFIRM_CHALLAN',
      title: `Confirm Challan #${targetChallan.challanNumber}`,
      description: `🚨 **Serious Action (Stock Deduction)**: Confirming this delivery challan will **permanently deduct ${targetChallan.totalQuantity} units** from inventory and mark the dispatch as complete.`,
      isSerious: true,
      seriousWarning: `Confirming #${targetChallan.challanNumber} will permanently decrement ${targetChallan.totalQuantity} units from active warehouse inventory.`,
      summaryDetails: [
        { label: 'Challan Number', value: targetChallan.challanNumber, highlight: true },
        { label: 'Customer', value: targetChallan.customer?.name || targetChallan.customer?.businessName || '—' },
        { label: 'Total Quantity to Deduct', value: `${targetChallan.totalQuantity} units`, highlight: true, color: 'var(--danger)' },
        { label: 'Current Status', value: 'DRAFT (Unconfirmed)' },
        { label: 'New Status', value: 'CONFIRMED (Dispatched & Deducted)', color: 'var(--success)' },
      ],
      availableChallans: drafts.map((d) => ({
        id: d.id,
        challanNumber: d.challanNumber,
        customerName: d.customer?.name || d.customer?.businessName || 'Customer',
        totalQuantity: d.totalQuantity,
      })),
      params: {
        challanId: targetChallan.id,
        challanNumber: targetChallan.challanNumber,
      },
      status: 'PENDING',
    };

    return {
      text: `🚨 **High-Impact Action — Permission Required to Confirm Challan:**\n\nConfirming **#${targetChallan.challanNumber}** will permanently decrement live stock in your warehouse. Please review and grant approval:`,
      action: actionPayload,
      suggestedPrompts: ['tell me the pending chalana', 'Show low stock products'],
    };
  }

  // =========================================================================
  // ACTION 4: CANCEL DELIVERY CHALLAN
  // =========================================================================
  if (
    (clean.includes('cancel') || clean.includes('void')) &&
    (clean.includes('challan') || rawLower.includes('chalan') || rawLower.includes('chalana') || rawLower.includes('challand'))
  ) {
    const challanMatch = rawQuery.match(/CH-\d+/i);
    const specificSearch = challanMatch ? challanMatch[0] : undefined;

    const draftRes = await challanService.getChallans({
      status: 'DRAFT',
      search: specificSearch,
      limit: 10,
    });
    const drafts = draftRes.data || [];

    if (drafts.length === 0) {
      return {
        text: `ℹ️ No pending draft challans found to cancel.`,
        suggestedPrompts: ['tell me the pending chalana', 'Show confirmed challans'],
      };
    }

    const targetChallan = drafts[0];

    const actionPayload: CopilotActionPayload = {
      id: `act-${Date.now()}`,
      actionType: 'CANCEL_CHALLAN',
      title: `Cancel Challan #${targetChallan.challanNumber}`,
      description: `⚠️ Are you sure you want to cancel Draft Challan **#${targetChallan.challanNumber}**? This will void the dispatch.`,
      isSerious: true,
      seriousWarning: 'Cancelling a draft challan will mark it void. This cannot be undone.',
      summaryDetails: [
        { label: 'Challan Number', value: targetChallan.challanNumber, highlight: true },
        { label: 'Customer', value: targetChallan.customer?.name || targetChallan.customer?.businessName || '—' },
        { label: 'Total Quantity', value: `${targetChallan.totalQuantity} units` },
      ],
      params: {
        challanId: targetChallan.id,
        challanNumber: targetChallan.challanNumber,
      },
      status: 'PENDING',
    };

    return {
      text: `⚠️ **Permission Required to Cancel Challan:**\n\nPlease confirm cancellation for **#${targetChallan.challanNumber}**:`,
      action: actionPayload,
      suggestedPrompts: ['tell me the pending chalana', 'Show workspace stats & KPIs'],
    };
  }

  // -------------------------------------------------------------
  // 1. DELIVERY CHALLANS INTENTS (SEARCH & LIST)
  // -------------------------------------------------------------
  if (
    clean.includes('challan') ||
    clean.includes('delivery') ||
    clean.includes('dispatch') ||
    clean.includes('invoice') ||
    rawLower.includes('chalan') ||
    rawLower.includes('chalana') ||
    rawLower.includes('challand')
  ) {
    const isDraft =
      clean.includes('draft') ||
      clean.includes('pending') ||
      clean.includes('unconfirmed') ||
      clean.includes('open') ||
      clean.includes('waiting') ||
      clean.includes('to confirm');

    const isConfirmed =
      clean.includes('confirmed') ||
      clean.includes('completed') ||
      clean.includes('dispatched') ||
      clean.includes('approved') ||
      clean.includes('done');

    const isCancelled =
      clean.includes('cancelled') ||
      clean.includes('canceled') ||
      clean.includes('void') ||
      clean.includes('rejected');

    let statusFilter: 'DRAFT' | 'CONFIRMED' | 'CANCELLED' | undefined = undefined;
    if (isDraft) statusFilter = 'DRAFT';
    else if (isConfirmed) statusFilter = 'CONFIRMED';
    else if (isCancelled) statusFilter = 'CANCELLED';

    const challanMatch = rawQuery.match(/CH-\d+/i);
    const specificSearch = challanMatch ? challanMatch[0] : undefined;

    const res = await challanService.getChallans({
      status: statusFilter,
      search: specificSearch,
      limit: 10,
    });
    const items = res.data || [];

    if (isDraft) {
      if (items.length === 0) {
        return {
          text: `✅ **No Pending Draft Challans!**\n\nAll delivery challans in **${orgName}** have already been processed and confirmed. Inventory stock movements are up to date.`,
          suggestedPrompts: [
            'Create a new challan',
            'Show recent delivery challans',
            'Show low stock products',
          ],
        };
      }

      const totalPendingQty = items.reduce((sum, ch) => sum + (ch.totalQuantity || 0), 0);
      return {
        text: `🚚 Found **${items.length} Pending (Draft) Delivery Challans** totaling **${totalPendingQty} units** in **${orgName}**:\n\n*Tip: You can ask DOST "Confirm challan ${items[0].challanNumber}" or "Create a new challan".*`,
        cardData: { type: 'challans', items },
        suggestedPrompts: [
          `Confirm challan ${items[0].challanNumber}`,
          'Create a new challan',
          'Show confirmed challans',
          'Show low stock products',
        ],
      };
    }

    if (isConfirmed) {
      return {
        text: `📦 Found **${items.length} Confirmed Delivery Challans** (Dispatched & Stock Deducted):`,
        cardData: { type: 'challans', items },
        suggestedPrompts: [
          'tell me the pending chalana',
          'Create a new challan',
          'Recent stock movements',
        ],
      };
    }

    if (isCancelled) {
      return {
        text: `🚫 Found **${items.length} Cancelled Delivery Challans**:`,
        cardData: items.length > 0 ? { type: 'challans', items } : undefined,
        suggestedPrompts: ['tell me the pending chalana', 'Create a new challan'],
      };
    }

    return {
      text: `🚚 Here are the **recent Delivery Challans** in **${orgName}**:`,
      cardData: { type: 'challans', items },
      suggestedPrompts: [
        'tell me the pending chalana',
        'Create a new challan',
        'Show confirmed challans',
      ],
    };
  }

  // -------------------------------------------------------------
  // 2. PRODUCT - LOW STOCK & OUT OF STOCK INTENTS
  // -------------------------------------------------------------
  if (
    clean.includes('low stock') ||
    clean.includes('shortage') ||
    clean.includes('reorder') ||
    clean.includes('out of stock') ||
    clean.includes('zero stock') ||
    clean.includes('running out') ||
    clean.includes('critical stock')
  ) {
    const isOutOfStock = clean.includes('out of stock') || clean.includes('zero stock');

    if (isOutOfStock) {
      const allRes = await productService.getProducts({ limit: 50 });
      const outOfStockItems = allRes.data.filter((p) => (p.currentStock || 0) === 0);

      if (outOfStockItems.length === 0) {
        return {
          text: `🎉 **Zero stockouts!** No products currently have 0 inventory in **${orgName}**.`,
          suggestedPrompts: [
            'Show low stock products',
            'Show inventory valuation',
            'Show workspace stats & KPIs',
          ],
        };
      }

      return {
        text: `🚨 **Critical Stock Alert:** Found **${outOfStockItems.length} products completely out of stock (0 units)**:`,
        cardData: { type: 'products', items: outOfStockItems.slice(0, 8) },
        suggestedPrompts: [
          `Inward 50 stock for ${outOfStockItems[0].name}`,
          'Show low stock products',
          'Show workspace stats & KPIs',
        ],
      };
    }

    const prodRes = await productService.getProducts({ lowStock: true, limit: 10 });
    const items = prodRes.data || [];

    if (items.length === 0) {
      return {
        text: `🎉 **Great inventory health!** All products in **${orgName}** are currently above their safety reorder thresholds.`,
        suggestedPrompts: [
          'Show inventory valuation',
          'Recent stock movements',
          'tell me the pending chalana',
        ],
      };
    }

    return {
      text: `⚠️ **Low Stock Warning:** Found **${items.length} items** below or at minimum safety thresholds:`,
      cardData: { type: 'products', items },
      suggestedPrompts: [
        `Inward 20 stock for ${items[0].name}`,
        'Recent stock movements',
        'tell me the pending chalana',
      ],
    };
  }

  // -------------------------------------------------------------
  // 3. INVENTORY VALUATION & ANALYTICS INTENTS
  // -------------------------------------------------------------
  if (
    clean.includes('valuation') ||
    clean.includes('inventory value') ||
    clean.includes('total value') ||
    clean.includes('stock value') ||
    clean.includes('worth') ||
    clean.includes('asset value')
  ) {
    try {
      const analyticsRes = await reportService.getAnalytics();
      const a = analyticsRes.data;

      return {
        text: `💰 **Inventory Valuation & Financial Health for ${orgName}:**\n\n• **Total Retail Asset Value**: ₹${Number(a.totalValuation || 0).toLocaleString('en-IN')}\n• **Total Estimated Cost Value**: ₹${Number(a.totalCostValuation || 0).toLocaleString('en-IN')}\n• **Active SKUs with Stock**: ${a.activeSkusCount}\n• **Low Stock Items**: ${a.lowStockCount}\n• **Out of Stock SKUs**: ${a.outOfStockCount}\n\n📂 **Top Category Valuations:**\n${(a.valuationByCategory || [])
          .slice(0, 4)
          .map((c) => `• **${c.category}**: ₹${Number(c.totalValue).toLocaleString('en-IN')} (${c.totalStock} units)`)
          .join('\n')}`,
        cardData: {
          type: 'valuation',
          categoryBreakdown: a.valuationByCategory,
        },
        suggestedPrompts: [
          'Show top moving products',
          'Show low stock products',
          'tell me the pending chalana',
        ],
      };
    } catch {
      const stats = await dashboardService.getStats();
      return {
        text: `💰 **Inventory Value Snapshot for ${orgName}:**\n\n• **Total Stock Valuation**: ₹${Number(stats.products.totalStockValue || 0).toLocaleString('en-IN')}\n• **Total Products**: ${stats.products.total}\n• **Low Stock Warnings**: ${stats.products.lowStockCount}`,
        suggestedPrompts: ['Show workspace stats & KPIs', 'tell me the pending chalana'],
      };
    }
  }

  // -------------------------------------------------------------
  // 4. TOP FAST-MOVING PRODUCTS INTENT
  // -------------------------------------------------------------
  if (
    clean.includes('top moving') ||
    clean.includes('fast moving') ||
    clean.includes('best seller') ||
    clean.includes('top selling') ||
    clean.includes('highest sales') ||
    clean.includes('most sold')
  ) {
    try {
      const analyticsRes = await reportService.getAnalytics();
      const movers = analyticsRes.data.topMovingProducts || [];

      if (movers.length === 0) {
        return {
          text: `📈 **Top Moving Products:** No outbound dispatches recorded in the last 30 days.`,
          suggestedPrompts: ['tell me the pending chalana', 'Show workspace stats & KPIs'],
        };
      }

      return {
        text: `🚀 **Top Fast-Moving Products (Last 30 Days Outbound Dispatches):**\n\n${movers
          .map(
            (m, i) =>
              `${i + 1}. **${m.productName}** (${m.sku})\n   Dispatched: **${m.totalQty} units**`
          )
          .join('\n\n')}`,
        suggestedPrompts: [
          'Show inventory valuation',
          'Recent stock movements',
          'tell me the pending chalana',
        ],
      };
    } catch {
      // Fallback
    }
  }

  // -------------------------------------------------------------
  // 5. STOCK MOVEMENTS & FLOW AUDIT INTENTS
  // -------------------------------------------------------------
  if (
    clean.includes('movement') ||
    clean.includes('inward') ||
    clean.includes('outward') ||
    clean.includes('stock in') ||
    clean.includes('stock out') ||
    clean.includes('dispatches') ||
    clean.includes('audit stock')
  ) {
    const isStockIn = clean.includes('inward') || clean.includes('stock in');
    const isStockOut = clean.includes('outward') || clean.includes('stock out');

    let typeFilter: 'IN' | 'OUT' | undefined = undefined;
    if (isStockIn && !isStockOut) typeFilter = 'IN';
    else if (isStockOut && !isStockIn) typeFilter = 'OUT';

    const reportRes = await reportService.getStockMovements({
      type: typeFilter,
      limit: 6,
    });
    const movements = reportRes.data || [];

    if (movements.length === 0) {
      return {
        text: `📋 **No recent stock movements recorded** matching your criteria.`,
        suggestedPrompts: [
          'Inward 50 stock for product',
          'tell me the pending chalana',
          'Show workspace stats & KPIs',
        ],
      };
    }

    return {
      text: `📋 **Recent Stock Movement Logs (Audit Trail):**`,
      cardData: { type: 'movements', items: movements },
      suggestedPrompts: [
        'Inward 50 stock for product',
        'tell me the pending chalana',
        'Show workspace stats & KPIs',
      ],
    };
  }

  // -------------------------------------------------------------
  // 6. CUSTOMER & CRM INTENTS
  // -------------------------------------------------------------
  if (
    clean.includes('customer') ||
    clean.includes('client') ||
    clean.includes('lead') ||
    clean.includes('crm') ||
    clean.includes('buyer') ||
    clean.includes('parties') ||
    clean.includes('party')
  ) {
    const isLeadsOnly = clean.includes('lead');
    const isActiveOnly = clean.includes('active');

    let statusFilter: string | undefined = undefined;
    if (isLeadsOnly) statusFilter = 'LEAD';
    else if (isActiveOnly) statusFilter = 'ACTIVE';

    const custRes = await customerService.getCustomers({
      status: statusFilter,
      limit: 6,
    });
    const items = custRes.data || [];

    if (isLeadsOnly) {
      return {
        text: `🎯 Found **${items.length} Sales Leads** requiring follow-up in **${orgName}**:`,
        cardData: { type: 'customers', items },
        suggestedPrompts: [
          'Show active customers',
          'tell me the pending chalana',
          'Show workspace stats & KPIs',
        ],
      };
    }

    return {
      text: `👥 Here are **${items.length} customer accounts** in **${orgName}**:`,
      cardData: { type: 'customers', items },
      suggestedPrompts: [
        'Create a new challan',
        'Show customer leads',
        'tell me the pending chalana',
      ],
    };
  }

  // -------------------------------------------------------------
  // 7. SPECIFIC PRODUCT SEARCH / STOCK CHECK BY NAME OR SKU
  // -------------------------------------------------------------
  const entityTerm = extractEntitySearchTerm(rawQuery);
  if (
    entityTerm.length >= 2 &&
    (clean.includes('stock') ||
      clean.includes('price') ||
      clean.includes('sku') ||
      clean.includes('where is') ||
      clean.includes('product') ||
      clean.includes('find') ||
      clean.includes('check'))
  ) {
    const searchRes = await productService.getProducts({ search: entityTerm, limit: 5 });
    if (searchRes.data && searchRes.data.length > 0) {
      const items = searchRes.data;
      return {
        text: `🔍 Found **${items.length} product(s)** matching **"${entityTerm}"**:`,
        cardData: { type: 'products', items },
        suggestedPrompts: [
          `Inward 20 stock for ${items[0].name}`,
          'Show low stock products',
          'tell me the pending chalana',
        ],
      };
    }
  }

  // -------------------------------------------------------------
  // 8. GENERAL STATS & WORKSPACE KPIS INTENTS
  // -------------------------------------------------------------
  if (
    clean.includes('stat') ||
    clean.includes('summary') ||
    clean.includes('overview') ||
    clean.includes('dashboard') ||
    clean.includes('kpi') ||
    clean.includes('metrics') ||
    clean.includes('snapshot') ||
    clean.includes('health')
  ) {
    const stats = await dashboardService.getStats();

    return {
      text: `📊 **Workspace Snapshot for ${orgName}:**\n\n• **Total Products**: ${stats.products.total} (${stats.products.lowStockCount} low stock alerts, ${stats.products.outOfStockCount} out of stock)\n• **Total Inventory Value**: ₹${Number(stats.products.totalStockValue || 0).toLocaleString('en-IN')}\n• **Customers**: ${stats.customers.total} (${stats.customers.active} active, ${stats.customers.leads} leads)\n• **Delivery Challans**: ${stats.challans.totalConfirmed} Confirmed, **${stats.challans.totalDraft} Pending Drafts**\n• **7-Day Stock Movements**: ${stats.stockMovements.inLast7Days} In / ${stats.stockMovements.outLast7Days} Out`,
      cardData: {
        type: 'stats',
        stats,
      },
      suggestedPrompts: [
        'tell me the pending chalana',
        'Show Bill of Materials',
        'Create a new challan',
        'Show low stock products',
      ],
    };
  }

  // -------------------------------------------------------------
  // 9. ADMIN / USER ROLE & ORG PROFILE INTENTS
  // -------------------------------------------------------------
  if (
    clean.includes('who am i') ||
    clean.includes('my role') ||
    clean.includes('my permissions') ||
    clean.includes('organization') ||
    clean.includes('company') ||
    clean.includes('subscription') ||
    clean.includes('plan')
  ) {
    return {
      text: `👤 **User & Organization Profile:**\n\n• **Logged In User**: ${userName} (${context.user?.email || 'N/A'})\n• **Role**: **${context.user?.role || 'ORG_ADMIN'}**\n• **Organization**: **${orgName}**\n• **Subscription Plan**: ${context.activeOrg?.subscription?.planName || 'Enterprise Tier'} (${context.activeOrg?.subscription?.status || 'ACTIVE'})\n\n*As an authorized ${context.user?.role || 'Admin'}, you can instruct DOST to create challans, move stock, build assemblies, and audit CRM records with explicit confirmation.*`,
      suggestedPrompts: [
        'Create a new challan',
        'Show Bill of Materials',
        'tell me the pending chalana',
        'Show workspace stats & KPIs',
      ],
    };
  }

  // -------------------------------------------------------------
  // 10. HELP & CAPABILITIES GUIDE INTENT
  // -------------------------------------------------------------
  if (
    clean.includes('help') ||
    clean.includes('what can you do') ||
    clean.includes('options') ||
    clean.includes('commands') ||
    clean.includes('guide')
  ) {
    return {
      text: `👋 **DOST Capabilities & Action Center:**\n\nI can provide insights and **take direct actions** with your permission:\n\n⚡ **Actions (With Interactive Permission Card):**\n• *"Create delivery challan for [Customer] with 10 units of [Product]"*\n• *"Inward 50 stock for [Product] reason Supplier restock"*\n• *"Deduct 5 stock for [Product] reason Damaged"* (High-Impact)\n• *"Confirm challan CH-000001"* (Permanent stock deduction)\n• *"Build assembly for [Bundle Name]"*\n\n🛠️ **Production & BOM:**\n• *"Tell me about the bill of materials"*\n\n🚚 **Delivery Challans:**\n• *"tell me the pending chalana"*\n• *"Show confirmed delivery challans"*\n\n📦 **Inventory & Stock:**\n• *"Show low stock products"*\n• *"What is our total inventory valuation?"*`,
      suggestedPrompts: [
        'Tell me about the bill of materials',
        'Create a new challan',
        'Inward 50 stock for product',
        'tell me the pending chalana',
        'Show low stock products',
      ],
    };
  }

  // -------------------------------------------------------------
  // 11. MULTI-ENTITY FALLBACK SEARCH
  // -------------------------------------------------------------
  const [prodSearch, custSearch, chalSearch] = await Promise.all([
    productService.getProducts({ search: rawQuery.trim(), limit: 4 }).catch(() => ({ data: [] })),
    customerService.getCustomers({ search: rawQuery.trim(), limit: 4 }).catch(() => ({ data: [] })),
    challanService.getChallans({ search: rawQuery.trim(), limit: 4 }).catch(() => ({ data: [] })),
  ]);

  if (prodSearch.data.length > 0) {
    return {
      text: `🔍 Found **${prodSearch.data.length} product(s)** matching **"${rawQuery}"**:`,
      cardData: { type: 'products', items: prodSearch.data },
      suggestedPrompts: [
        `Inward 20 stock for ${prodSearch.data[0].name}`,
        'Show low stock products',
        'tell me the pending chalana',
      ],
    };
  }

  if (custSearch.data.length > 0) {
    return {
      text: `👥 Found **${custSearch.data.length} customer(s)** matching **"${rawQuery}"**:`,
      cardData: { type: 'customers', items: custSearch.data },
      suggestedPrompts: [
        `Create challan for ${custSearch.data[0].name}`,
        'Show active customers',
        'tell me the pending chalana',
      ],
    };
  }

  if (chalSearch.data.length > 0) {
    return {
      text: `🚚 Found **${chalSearch.data.length} challan(s)** matching **"${rawQuery}"**:`,
      cardData: { type: 'challans', items: chalSearch.data },
      suggestedPrompts: [
        'tell me the pending chalana',
        'Show confirmed challans',
        'Show workspace stats & KPIs',
      ],
    };
  }

  // Clean UI Fallback without raw bullet points
  return {
    text: `Here are the key modules and actions you can explore in **${orgName}**:`,
    suggestedPrompts: [
      'Tell me about the bill of materials',
      'Create a new challan',
      'Inward 50 stock for product',
      'tell me the pending chalana',
      'Show low stock products',
      'What is our inventory valuation?',
    ],
  };
}
