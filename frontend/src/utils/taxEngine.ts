/**
 * Tax Engine — Pure Business Logic Module for Goods and Services Tax (GST) Calculations.
 *
 * Rules:
 * - Default Company State Code is extracted from company GSTIN (first 2 digits: e.g. '27' for Maharashtra).
 * - If customer GSTIN starts with the same state code (or is unregistered in same state), Intra-State tax applies:
 *   Total GST is split equally into CGST (50%) + SGST (50%).
 * - If customer GSTIN starts with a different state code, Inter-State tax applies:
 *   Total GST is applied as IGST (100%).
 */

export const COMPANY_GSTIN = '27AAAAA0000A1Z5';
export const COMPANY_STATE_CODE = COMPANY_GSTIN.slice(0, 2);

export interface TaxCalculationResult {
  isIntraState: boolean;
  stateCode: string;
  subtotal: number;
  taxRate: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  grandTotal: number;
}

/**
 * Extracts 2-digit Indian state code from a 15-character GSTIN string.
 */
export function extractStateCode(gstin?: string | null): string {
  if (!gstin) return COMPANY_STATE_CODE;
  const cleaned = gstin.trim();
  if (cleaned.length >= 2 && /^\d{2}/.test(cleaned)) {
    return cleaned.slice(0, 2);
  }
  return COMPANY_STATE_CODE;
}

/**
 * Computes deterministic tax breakdown for invoice and challan lines.
 */
export function computeGstBreakdown(
  subtotal: number,
  taxRate: number = 0.18,
  customerGstin?: string | null
): TaxCalculationResult {
  const safeSubtotal = Math.max(0, isNaN(subtotal) ? 0 : subtotal);
  const safeTaxRate = Math.max(0, isNaN(taxRate) ? 0 : taxRate);
  const customerStateCode = extractStateCode(customerGstin);
  const isIntraState = customerStateCode === COMPANY_STATE_CODE;

  const totalTax = safeSubtotal * safeTaxRate;
  const grandTotal = safeSubtotal + totalTax;

  if (isIntraState) {
    const halfRate = safeTaxRate / 2;
    const halfAmount = totalTax / 2;
    return {
      isIntraState: true,
      stateCode: customerStateCode,
      subtotal: safeSubtotal,
      taxRate: safeTaxRate,
      cgstRate: halfRate,
      sgstRate: halfRate,
      igstRate: 0,
      cgstAmount: halfAmount,
      sgstAmount: halfAmount,
      igstAmount: 0,
      totalTax,
      grandTotal,
    };
  }

  return {
    isIntraState: false,
    stateCode: customerStateCode,
    subtotal: safeSubtotal,
    taxRate: safeTaxRate,
    cgstRate: 0,
    sgstRate: 0,
    igstRate: safeTaxRate,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: totalTax,
    totalTax,
    grandTotal,
  };
}
