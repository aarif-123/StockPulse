import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { challanService } from '../services/challan.service';
import { handleApiError } from '../services/api';
import type { Challan } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/common/ToastContainer';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { computeGstBreakdown } from '../utils/taxEngine';
import {
  IconPrinter, IconCheck, IconAlertTriangle, IconCopy,
} from '../components/common/Icons';

export const ChallanDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole, user, activeOrg } = useAuth();
  const { toasts, toast, removeToast } = useToast();
  const canModify = hasRole(['ORG_ADMIN', 'ADMIN', 'SALES']);
  const canCreate = hasRole(['ORG_ADMIN', 'ADMIN', 'SALES']);
  const canConfirm = hasRole(['ORG_ADMIN', 'ADMIN', 'SALES', 'WAREHOUSE']);

  const currentRole = activeOrg?.role || user?.role || 'SALES';
  const isWarehouse = currentRole === 'WAREHOUSE';

  const [challan, setChallan] = useState<Challan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchChallanDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await challanService.getChallan(id);
      setChallan(response.data);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchChallanDetails();
  }, [fetchChallanDetails]);

  const handleConfirm = async () => {
    if (!id || !challan) return;

    const isConfirmed = window.confirm(
      `Confirm Delivery Challan ${challan.challanNumber}? This will deduct product inventory and cannot be undone.`
    );
    if (!isConfirmed) return;

    setActionLoading(true);
    try {
      const response = await challanService.confirmChallan(id);
      setChallan(response.data);
      toast.success(`Challan ${challan.challanNumber} confirmed and stock updated.`);
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!id || !challan) return;

    const isCancelled = window.confirm(
      `Cancel Delivery Challan ${challan.challanNumber}? This will mark it as cancelled without modifying inventory.`
    );
    if (!isCancelled) return;

    setActionLoading(true);
    try {
      const response = await challanService.cancelChallan(id);
      setChallan(response.data);
      toast.warning(`Challan ${challan.challanNumber} has been cancelled.`);
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloneReorder = () => {
    if (!challan) return;
    navigate(`/challans/new?cloneFrom=${challan.id}`);
  };

  const handleCopyChallanNumber = () => {
    if (!challan) return;
    void navigator.clipboard.writeText(challan.challanNumber);
    toast.info(`Copied ${challan.challanNumber} to clipboard`);
  };

  if (loading) {
    return (
      <div>
        <div className="mb-24">
          <LoadingSkeleton lines={2} />
        </div>
        <div className="details-grid">
          <LoadingSkeleton variant="card" count={2} />
        </div>
      </div>
    );
  }

  if (error || !challan) {
    return (
      <div className="alert alert-danger" style={{ margin: '32px' }}>
        <strong>Error:</strong> {error || 'Challan record not found.'}
        <div className="mt-16">
          <Link to="/challans" className="btn btn-secondary">
            Back to Challans List
          </Link>
        </div>
      </div>
    );
  }

  const subtotal = challan.items?.reduce(
    (acc, item) => acc + Number(item.unitPrice) * item.quantity,
    0
  ) ?? 0;

  const taxDetails = computeGstBreakdown(
    subtotal,
    0.18,
    challan.customer?.gstNumber
  );

  return (
    <div>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      <PageHeader
        title={`Challan: ${challan.challanNumber}`}
        subtitle={`Created on ${new Date(challan.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'long', year: 'numeric',
        })}`}
        backTo={{ label: 'Delivery Challans', href: '/challans' }}
        actions={
          <div className="flex-center gap-8">
            <button
              type="button"
              className="copy-pill"
              onClick={handleCopyChallanNumber}
              title="Copy ID"
            >
              <IconCopy size={13} /> {challan.challanNumber}
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => window.print()}
              id="print-challan-btn"
            >
              <IconPrinter size={14} /> Print Slip
            </button>

            {canCreate && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleCloneReorder}
                id="clone-challan-btn"
                title="Duplicate items to new draft challan"
              >
                Re-Order / Clone
              </button>
            )}

            {challan.status === 'DRAFT' && (
              <>
                {canModify && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={handleCancel}
                    disabled={actionLoading}
                    id="cancel-challan-btn"
                  >
                    <IconAlertTriangle size={13} /> Cancel
                  </button>
                )}
                {canConfirm && (
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    onClick={handleConfirm}
                    disabled={actionLoading}
                    id="confirm-challan-btn"
                  >
                    <IconCheck size={13} />
                    {actionLoading ? 'Confirming...' : 'Confirm Delivery'}
                  </button>
                )}
              </>
            )}
          </div>
        }
      />

      {/* Formal Invoice & Delivery Slip Container */}
      <div className="card" style={{ marginBottom: '24px', padding: '28px' }}>
        {/* Invoice Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary-hover)', letterSpacing: '-0.02em' }}>
              STOCKPULSE ENTERPRISES
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              GSTIN: 27AAAAA0000A1Z5 • State Code: 27 (Maharashtra)
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              Logistics Hub, Sector 4, Tech City, India
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {challan.challanNumber}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Date: {new Date(challan.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            <div style={{ marginTop: '6px' }}>
              {StatusBadge.challan(challan.status)}
            </div>
          </div>
        </div>

        {/* Bill To / Consignee Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 700, marginBottom: '6px' }}>
              CONSIGNEE / BILL TO
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {challan.customer?.businessName || challan.customer?.name}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Attention: {challan.customer?.name}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Mobile: {challan.customer?.mobile || '—'} • Email: {challan.customer?.email || '—'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Address: {challan.customer?.address || '—'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '4px', fontWeight: 600 }}>
              GSTIN: {challan.customer?.gstNumber || 'Unregistered'} • {taxDetails.isIntraState ? 'Intra-State Supply' : 'Inter-State Supply'}
            </div>
          </div>

          <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 700, marginBottom: '6px' }}>
              DISPATCH & ORDER METADATA
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
              <div><strong>Prepared By:</strong> {challan.creator?.name || 'System'}</div>
              <div><strong>Operator Email:</strong> {challan.creator?.email || '—'}</div>
              <div><strong>Mode of Transport:</strong> Surface Cargo / Direct Fleet</div>
              <div><strong>Payment Terms:</strong> Net 30 Days from Receipt</div>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>Item Description</th>
                <th>SKU</th>
                {!isWarehouse && <th className="text-right">Unit Price</th>}
                <th style={{ textAlign: 'center' }}>Qty</th>
                {!isWarehouse && <th className="text-right">Taxable Amt</th>}
              </tr>
            </thead>
            <tbody>
              {challan.items?.map((item, idx) => (
                <tr key={item.id}>
                  <td style={{ color: 'var(--text-tertiary)' }}>{idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{item.productName}</td>
                  <td className="text-mono">{item.sku}</td>
                  {!isWarehouse && <td className="text-right">₹{Number(item.unitPrice).toFixed(2)}</td>}
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                  {!isWarehouse && (
                    <td className="text-right" style={{ fontWeight: 600 }}>
                      ₹{(Number(item.unitPrice) * item.quantity).toFixed(2)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              {isWarehouse ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'right', fontWeight: 600 }}>Total Quantity:</td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{challan.totalQuantity} units</td>
                </tr>
              ) : (
                <>
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'right', fontWeight: 600 }}>Subtotal:</td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{challan.totalQuantity} units</td>
                    <td className="text-right" style={{ fontWeight: 700 }}>₹{taxDetails.subtotal.toFixed(2)}</td>
                  </tr>

                  {taxDetails.isIntraState ? (
                    <>
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                          Central GST (CGST {(taxDetails.cgstRate * 100).toFixed(1)}%):
                        </td>
                        <td className="text-right" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                          +₹{taxDetails.cgstAmount.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                          State GST (SGST {(taxDetails.sgstRate * 100).toFixed(1)}%):
                        </td>
                        <td className="text-right" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                          +₹{taxDetails.sgstAmount.toFixed(2)}
                        </td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                        Integrated GST (IGST {(taxDetails.igstRate * 100).toFixed(1)}%):
                      </td>
                      <td className="text-right" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                        +₹{taxDetails.igstAmount.toFixed(2)}
                      </td>
                    </tr>
                  )}

                  <tr style={{ background: 'var(--bg-tertiary)', fontSize: '15px' }}>
                    <td colSpan={5} style={{ textAlign: 'right', fontWeight: 800 }}>
                      Total Invoice Amount (INR):
                    </td>
                    <td className="text-right" style={{ fontWeight: 800, color: 'var(--primary-hover)' }}>
                      ₹{taxDetails.grandTotal.toFixed(2)}
                    </td>
                  </tr>
                </>
              )}
            </tfoot>
          </table>
        </div>

        {/* Signatures and Acknowledgement Footer */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '30px',
          marginTop: '40px',
          paddingTop: '24px',
          borderTop: '1px solid var(--border-color)'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '40px' }}>
              Customer Receiver Signature & Stamp:
            </div>
            <div style={{ borderBottom: '1px solid var(--border-color)', width: '80%' }} />
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              Goods received in good condition
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '40px' }}>
              For StockPulse Enterprises (Authorized Signatory):
            </div>
            <div style={{ borderBottom: '1px solid var(--border-color)', width: '80%', marginLeft: 'auto' }} />
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              Digitally Verified Dispatch
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallanDetails;
