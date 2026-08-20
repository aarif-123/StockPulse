import React from 'react';
import type { Product } from '../../types';
import { IconShoppingCart, IconPrinter, IconCheck } from '../common/Icons';

export interface GeneratedPOData {
  poNumber: string;
  createdAt: string;
  items: { product: Product; orderQty: number; unitPrice: number; total: number }[];
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
  supplierName: string;
}

interface PurchaseOrderModalProps {
  po: GeneratedPOData | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({
  po,
  onClose,
  onConfirm,
}) => {
  if (!po) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal aria-label="Purchase Order Details">
      <div className="modal-dialog po-dialog">
        <div className="modal-header">
          <div className="flex-center gap-8">
            <IconShoppingCart size={20} className="color-primary" />
            <span className="modal-title">Vendor Purchase Order ({po.poNumber})</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} type="button" aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* PO Corporate Header */}
          <div className="po-header-card">
            <div>
              <div className="fs-12 color-tertiary">ISSUED BY</div>
              <div className="fw-700 fs-15 color-primary">StockPulse Enterprise Solutions</div>
              <div className="fs-12 color-secondary">Operations & Supply Chain Center</div>
            </div>
            <div className="text-right">
              <div className="fs-12 color-tertiary">PO NUMBER & DATE</div>
              <div className="fw-700 fs-14 text-mono color-primary">{po.poNumber}</div>
              <div className="fs-12 color-secondary">
                {new Date(po.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="table-wrapper mb-16">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th className="text-right">Order Qty</th>
                  <th className="text-right">Unit Price</th>
                  <th className="text-right">Total (INR)</th>
                </tr>
              </thead>
              <tbody>
                {po.items.map((item) => (
                  <tr key={item.product.id}>
                    <td className="fw-600">{item.product.name}</td>
                    <td className="text-mono fs-12">{item.product.sku}</td>
                    <td className="text-right fw-700 text-mono">+{item.orderQty}</td>
                    <td className="text-right text-mono">₹{item.unitPrice.toFixed(2)}</td>
                    <td className="text-right text-mono fw-600">₹{item.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Totals */}
          <div className="po-totals-box">
            <div className="flex-between">
              <span className="color-secondary">Items Subtotal:</span>
              <span className="text-mono fw-600">₹{po.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex-between">
              <span className="color-secondary">Estimated GST (18%):</span>
              <span className="text-mono fw-600">₹{po.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="po-grand-total">
              <span>Grand Total:</span>
              <span className="text-mono color-primary">
                ₹{po.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
            <IconPrinter size={14} /> Print PO Slip
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            <IconCheck size={14} /> Confirm & Transmit PO
          </button>
        </div>
      </div>
    </div>
  );
};
