// Unit test suite for business calculation engines: Tax Calculations and Inventory Velocity.

describe('Tax Engine & GST Calculation Rules', () => {

  const COMPANY_STATE_CODE = '27'; // Maharashtra

  function computeGstBreakdown(subtotal: number, taxRate: number = 0.18, customerGstin?: string | null) {
    const safeSubtotal = Math.max(0, isNaN(subtotal) ? 0 : subtotal);
    const safeTaxRate = Math.max(0, isNaN(taxRate) ? 0 : taxRate);
    const customerState = customerGstin && customerGstin.length >= 2 ? customerGstin.slice(0, 2) : COMPANY_STATE_CODE;
    const isIntraState = customerState === COMPANY_STATE_CODE;

    const totalTax = safeSubtotal * safeTaxRate;
    const grandTotal = safeSubtotal + totalTax;

    if (isIntraState) {
      return {
        isIntraState: true,
        subtotal: safeSubtotal,
        cgstAmount: totalTax / 2,
        sgstAmount: totalTax / 2,
        igstAmount: 0,
        totalTax,
        grandTotal,
      };
    }

    return {
      isIntraState: false,
      subtotal: safeSubtotal,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: totalTax,
      totalTax,
      grandTotal,
    };
  }

  it('correctly splits into 9% CGST and 9% SGST for intra-state supplies', () => {
    const result = computeGstBreakdown(10000, 0.18, '27ABCDE1234F1Z5');
    expect(result.isIntraState).toBe(true);
    expect(result.cgstAmount).toBe(900);
    expect(result.sgstAmount).toBe(900);
    expect(result.igstAmount).toBe(0);
    expect(result.totalTax).toBe(1800);
    expect(result.grandTotal).toBe(11800);
  });

  it('correctly applies 18% IGST for inter-state supplies (e.g. Karnataka 29)', () => {
    const result = computeGstBreakdown(10000, 0.18, '29XYZAB9876C1Z2');
    expect(result.isIntraState).toBe(false);
    expect(result.cgstAmount).toBe(0);
    expect(result.sgstAmount).toBe(0);
    expect(result.igstAmount).toBe(1800);
    expect(result.totalTax).toBe(1800);
    expect(result.grandTotal).toBe(11800);
  });

  it('defaults to intra-state if customer GSTIN is missing (unregistered retail client)', () => {
    const result = computeGstBreakdown(5000, 0.18, null);
    expect(result.isIntraState).toBe(true);
    expect(result.cgstAmount).toBe(450);
    expect(result.sgstAmount).toBe(450);
    expect(result.igstAmount).toBe(0);
    expect(result.grandTotal).toBe(5900);
  });
});

describe('Inventory Velocity & Stockout Risk Forecasting', () => {
  function calculateInventoryVelocity(currentStock: number, periodOutflow: number = 0, daysInPeriod: number = 7) {
    const stock = Math.max(0, currentStock);
    const outflow = Math.max(0, periodOutflow);
    const period = Math.max(1, daysInPeriod);

    if (stock === 0) {
      return { dailyRunRate: outflow / period, daysRemaining: 0, status: 'OUT_OF_STOCK' };
    }

    const dailyRunRate = outflow / period;
    if (dailyRunRate === 0) {
      return { dailyRunRate: 0, daysRemaining: null, status: 'SURPLUS' };
    }

    const daysRemaining = Math.round(stock / dailyRunRate);
    if (daysRemaining <= 3) {
      return { dailyRunRate: Number(dailyRunRate.toFixed(1)), daysRemaining, status: 'CRITICAL' };
    }
    if (daysRemaining <= 7) {
      return { dailyRunRate: Number(dailyRunRate.toFixed(1)), daysRemaining, status: 'WARNING' };
    }
    return { dailyRunRate: Number(dailyRunRate.toFixed(1)), daysRemaining, status: 'HEALTHY' };
  }

  it('flags stock with <= 3 days of runway as CRITICAL', () => {
    // Current stock = 6, 7-day outflow = 21 (3 units/day) -> 2 days remaining
    const result = calculateInventoryVelocity(6, 21, 7);
    expect(result.status).toBe('CRITICAL');
    expect(result.daysRemaining).toBe(2);
    expect(result.dailyRunRate).toBe(3);
  });

  it('flags stock with 4-7 days of runway as WARNING', () => {
    // Current stock = 15, 7-day outflow = 21 (3 units/day) -> 5 days remaining
    const result = calculateInventoryVelocity(15, 21, 7);
    expect(result.status).toBe('WARNING');
    expect(result.daysRemaining).toBe(5);
  });

  it('flags stock with > 7 days of runway as HEALTHY', () => {
    // Current stock = 100, 7-day outflow = 14 (2 units/day) -> 50 days remaining
    const result = calculateInventoryVelocity(100, 14, 7);
    expect(result.status).toBe('HEALTHY');
    expect(result.daysRemaining).toBe(50);
  });

  it('handles zero outflow gracefully without dividing by zero', () => {
    const result = calculateInventoryVelocity(50, 0, 7);
    expect(result.status).toBe('SURPLUS');
    expect(result.daysRemaining).toBeNull();
    expect(result.dailyRunRate).toBe(0);
  });
});
