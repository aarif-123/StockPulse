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
      <div className="card printable-slip-card" style={{ marginBottom: '24px', padding: '28px' }}>
        {/* Invoice Header */}
        <div className="printable-slip-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--border-color)', paddingBottom: '20px', marginBottom: '20px' }}>
          <div>
            <div className="slip-title" style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
              {activeOrg?.organizationName?.toUpperCase() || 'VYAAPARSYNC ENTERPRISES'}
            </div>
            <div className="slip-gstin" style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '4px', fontWeight: 600 }}>
              GSTIN: 27AAAAA0000A1Z5 • State Code: {taxDetails.stateCode || '27'} (Maharashtra)
            </div>
            <div className="slip-address" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 500 }}>
              Logistics Hub, Sector 4, Tech City, India
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div className="slip-doc-type" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary-hover)', fontWeight: 800 }}>
              DELIVERY CHALLAN
            </div>
            <div className="slip-challan-num" style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '2px' }}>
              {challan.challanNumber}
            </div>
            <div className="slip-date" style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '4px', fontWeight: 600 }}>
              Date: {new Date(challan.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
              {StatusBadge.challan(challan.status)}
            </div>
          </div>
        </div>

        {/* Bill To / Consignee & Order Metadata Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          {/* CONSIGNEE / BILL TO */}
          <div className="printable-slip-box" style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div className="slip-box-header" style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-primary)', fontWeight: 800, marginBottom: '8px', borderBottom: '1.5px solid var(--border-color)', paddingBottom: '4px' }}>
              CONSIGNEE / BILL TO
            </div>
            <div className="slip-customer-name" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {challan.customer?.businessName || challan.customer?.name}
            </div>
            {challan.customer?.businessName && (
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '4px', fontWeight: 600 }}>
                Attention: {challan.customer?.name}
              </div>
            )}
            <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '3px', fontWeight: 500 }}>
              Mobile: {challan.customer?.mobile || '—'} • Email: {challan.customer?.email || '—'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '3px', lineHeight: '1.4', fontWeight: 500 }}>
              Address: {challan.customer?.address || '—'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '8px', fontWeight: 700, paddingTop: '6px', borderTop: '1px dashed var(--border-color)' }}>
              GSTIN: {challan.customer?.gstNumber || 'Unregistered'} • {taxDetails.isIntraState ? 'Intra-State Supply (CGST+SGST)' : 'Inter-State Supply (IGST)'}
            </div>
          </div>

          {/* DISPATCH & ORDER METADATA */}
          <div className="printable-slip-box" style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div className="slip-box-header" style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-primary)', fontWeight: 800, marginBottom: '8px', borderBottom: '1.5px solid var(--border-color)', paddingBottom: '4px' }}>
              DISPATCH & ORDER METADATA
            </div>
            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ color: 'var(--text-secondary)', padding: '4px 0', width: '140px', fontWeight: 700 }}>Prepared By:</td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{challan.creator?.name || user?.name || 'System'}</td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--text-secondary)', padding: '4px 0', fontWeight: 700 }}>Operator Email:</td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{challan.creator?.email || user?.email || '—'}</td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--text-secondary)', padding: '4px 0', fontWeight: 700 }}>Mode of Transport:</td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Surface Cargo / Direct Fleet</td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--text-secondary)', padding: '4px 0', fontWeight: 700 }}>Payment Terms:</td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Net 30 Days from Receipt</td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--text-secondary)', padding: '4px 0', fontWeight: 700 }}>Place of Supply:</td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{taxDetails.isIntraState ? 'Maharashtra (27)' : 'Inter-State'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="table-wrapper">
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center', color: 'var(--text-primary)', fontWeight: 800 }}>#</th>
                <th style={{ textAlign: 'left', color: 'var(--text-primary)', fontWeight: 800 }}>Item Description</th>
                <th style={{ textAlign: 'left', width: '140px', color: 'var(--text-primary)', fontWeight: 800 }}>SKU</th>
                {!isWarehouse && <th className="text-right" style={{ width: '120px', color: 'var(--text-primary)', fontWeight: 800 }}>Unit Price (₹)</th>}
                <th style={{ textAlign: 'center', width: '80px', color: 'var(--text-primary)', fontWeight: 800 }}>Qty</th>
                {!isWarehouse && <th className="text-right" style={{ width: '140px', color: 'var(--text-primary)', fontWeight: 800 }}>Taxable Amt (₹)</th>}
              </tr>
            </thead>
            <tbody>
              {challan.items?.map((item, idx) => (
                <tr key={item.id}>
                  <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>{idx + 1}</td>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.productName}</td>
                  <td className="text-mono" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.sku}</td>
                  {!isWarehouse && <td className="text-right" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>₹{Number(item.unitPrice).toFixed(2)}</td>}
                  <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--text-primary)' }}>{item.quantity}</td>
                  {!isWarehouse && (
                    <td className="text-right" style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                      ₹{(Number(item.unitPrice) * item.quantity).toFixed(2)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              {isWarehouse ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>Total Quantity:</td>
                  <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--text-primary)' }}>{challan.totalQuantity} units</td>
                </tr>
              ) : (
                <>
                  {/* Subtotal Row */}
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700, paddingRight: '12px', color: 'var(--text-primary)' }}>Subtotal:</td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--text-primary)' }}>{challan.totalQuantity} units</td>
                    <td className="text-right" style={{ fontWeight: 800, color: 'var(--text-primary)' }}>₹{taxDetails.subtotal.toFixed(2)}</td>
                  </tr>

                  {/* GST Rows */}
                  {taxDetails.isIntraState ? (
                    <>
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'right', color: 'var(--text-primary)', fontWeight: 700, paddingRight: '12px' }}>
                          Central GST (CGST {(taxDetails.cgstRate * 100).toFixed(1)}%):
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>—</td>
                        <td className="text-right" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                          +₹{taxDetails.cgstAmount.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'right', color: 'var(--text-primary)', fontWeight: 700, paddingRight: '12px' }}>
                          State GST (SGST {(taxDetails.sgstRate * 100).toFixed(1)}%):
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>—</td>
                        <td className="text-right" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                          +₹{taxDetails.sgstAmount.toFixed(2)}
                        </td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'right', color: 'var(--text-primary)', fontWeight: 700, paddingRight: '12px' }}>
                        Integrated GST (IGST {(taxDetails.igstRate * 100).toFixed(1)}%):
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>—</td>
                      <td className="text-right" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                        +₹{taxDetails.igstAmount.toFixed(2)}
                      </td>
                    </tr>
                  )}

                  {/* Grand Total Row */}
                  <tr className="grand-total-row" style={{ background: 'var(--bg-tertiary)', fontSize: '15px' }}>
                    <td colSpan={4} style={{ textAlign: 'right', fontWeight: 900, paddingRight: '12px', color: 'var(--text-primary)' }}>
                      Total Invoice Amount (INR):
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--text-secondary)' }}>—</td>
                    <td className="text-right" style={{ fontWeight: 900, color: 'var(--text-primary)' }}>
                      ₹{taxDetails.grandTotal.toFixed(2)}
                    </td>
                  </tr>
                </>
              )}
            </tfoot>
          </table>
        </div>

        {/* Signatures and Acknowledgement Footer */}
        <div
          className="signature-block"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: '30px',
            marginTop: '44px',
            paddingTop: '24px',
            borderTop: '2px solid var(--border-color)',
          }}
        >
          <div style={{ width: '45%' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '48px' }}>
              Customer Receiver Signature & Stamp:
            </div>
            <div className="sig-line" style={{ borderBottom: '2px dashed var(--border-color)', width: '100%' }} />
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: 600 }}>
              Goods received in good condition
            </div>
          </div>

          <div style={{ width: '45%', textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '48px' }}>
              For {activeOrg?.organizationName || 'VyaaparSync Enterprises'} (Authorized Signatory):
            </div>
            <div className="sig-line" style={{ borderBottom: '2px dashed var(--border-color)', width: '100%' }} />
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: 600 }}>
              Digitally Verified Dispatch
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallanDetails;
