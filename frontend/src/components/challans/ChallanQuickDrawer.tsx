import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { challanService } from '../../services/challan.service';
import { handleApiError } from '../../services/api';
import type { Challan } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { computeGstBreakdown } from '../../utils/taxEngine';
import {
  IconX, IconPrinter, IconCheck, IconAlertTriangle,
  IconCopy,
} from '../common/Icons';

interface ChallanQuickDrawerProps {
  challanId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChanged?: () => void;
  canModify?: boolean;
  onToast?: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

export const ChallanQuickDrawer: React.FC<ChallanQuickDrawerProps> = ({
  challanId,
  isOpen,
  onClose,
  onStatusChanged,
  canModify = false,
  onToast,
}) => {
  const navigate = useNavigate();
  const [challan, setChallan] = useState<Challan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetails = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await challanService.getChallan(id);
      setChallan(res.data);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && challanId) {
      void fetchDetails(challanId);
    } else {
      setChallan(null);
      setError(null);
    }
  }, [isOpen, challanId, fetchDetails]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyChallanNumber = () => {
    if (!challan) return;
    void navigator.clipboard.writeText(challan.challanNumber);
    onToast?.('info', `Copied ${challan.challanNumber} to clipboard`);
  };

  const handleConfirm = async () => {
    if (!challan) return;
    const ok = window.confirm(`Confirm delivery for ${challan.challanNumber}? This will deduct inventory.`);
    if (!ok) return;

    setActionLoading(true);
    try {
      const res = await challanService.confirmChallan(challan.id);
      setChallan(res.data);
      onToast?.('success', `Challan ${challan.challanNumber} confirmed & stock deducted.`);
      onStatusChanged?.();
    } catch (err) {
      onToast?.('error', handleApiError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!challan) return;
    const ok = window.confirm(`Cancel Challan ${challan.challanNumber}?`);
    if (!ok) return;

    setActionLoading(true);
    try {
      const res = await challanService.cancelChallan(challan.id);
      setChallan(res.data);
      onToast?.('warning', `Challan ${challan.challanNumber} has been cancelled.`);
      onStatusChanged?.();
    } catch (err) {
      onToast?.('error', handleApiError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const subtotal = challan?.items?.reduce(
    (acc, item) => acc + Number(item.unitPrice) * item.quantity,
    0
  ) ?? 0;

  const taxDetails = computeGstBreakdown(
    subtotal,
    0.18,
    challan?.customer?.gstNumber
  );

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="slide-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="slide-drawer__header">
          <div className="flex-center gap-8">
            {challan && (
              <>
                <button
                  type="button"
                  className="copy-pill"
                  onClick={handleCopyChallanNumber}
                  title="Click to copy"
                >
                  <IconCopy size={13} />
                  <span>{challan.challanNumber}</span>
                </button>
                {StatusBadge.challan(challan.status)}
              </>
            )}
            {!challan && <span className="fw-700 fs-14">Dispatch Preview</span>}
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            aria-label="Close preview"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="slide-drawer__body">
          {loading && (
            <div className="flex-col gap-12">
              <LoadingSkeleton lines={2} />
              <LoadingSkeleton variant="card" count={2} />
            </div>
          )}

          {error && (
            <div className="alert alert-danger">
              <IconAlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {!loading && challan && (
            <>
              {/* Customer Profile Card */}
              <div className="card" style={{ padding: '16px', margin: 0 }}>
                <div className="flex-between mb-8">
                  <span className="fs-11 fw-700 color-tertiary" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Consignee / Customer
                  </span>
                  <span className="badge badge-info fs-11">
                    {taxDetails.isIntraState ? 'Intra-State (CGST+SGST)' : 'Inter-State (IGST)'}
                  </span>
                </div>
                <div className="fw-700 fs-15 color-primary mb-4">
                  {challan.customer?.businessName || challan.customer?.name}
                </div>
                <div className="fs-13 color-secondary mb-2">
                  Contact: {challan.customer?.name} ({challan.customer?.mobile || 'No mobile'})
                </div>
                <div className="fs-12 color-tertiary mb-2">
                  Address: {challan.customer?.address || '—'}
                </div>
                <div className="fs-12 text-mono color-secondary">
                  GSTIN: <strong>{challan.customer?.gstNumber || 'Unregistered'}</strong>
                </div>
              </div>

              {/* Order Metadata */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="card" style={{ padding: '12px', margin: 0 }}>
                  <div className="fs-11 color-tertiary fw-600 mb-2">DATE OF DISPATCH</div>
                  <div className="fs-13 fw-600">
                    {new Date(challan.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </div>
                </div>
                <div className="card" style={{ padding: '12px', margin: 0 }}>
                  <div className="fs-11 color-tertiary fw-600 mb-2">PREPARED BY</div>
                  <div className="fs-13 fw-600">
                    {challan.creator?.name || 'System'}
                  </div>
                  <div className="fs-11 color-tertiary">{challan.creator?.role}</div>
                </div>
              </div>

              {/* Items Line Breakdown */}
              <div className="card" style={{ padding: '16px', margin: 0 }}>
                <div className="flex-between mb-12">
                  <span className="fs-11 fw-700 color-tertiary" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Dispatch Items ({challan.items?.length || 0})
                  </span>
                  <span className="fs-12 fw-700 color-primary">
                    Total: {challan.totalQuantity} units
                  </span>
                </div>

                <div className="flex-col gap-8">
                  {challan.items?.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 10px',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <div>
                        <div className="fw-600 fs-13">{item.productName}</div>
                        <div className="fs-11 color-tertiary text-mono">{item.sku}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="fw-700 fs-13">{item.quantity} units</div>
                        <div className="fs-11 color-secondary">₹{Number(item.unitPrice).toFixed(2)} / unit</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Financial Summary */}
                <div
                  style={{
                    borderTop: '1px solid var(--border-color)',
                    marginTop: '16px',
                    paddingTop: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '13px',
                  }}
                >
                  <div className="flex-between color-secondary">
                    <span>Taxable Subtotal:</span>
                    <span>₹{taxDetails.subtotal.toFixed(2)}</span>
                  </div>
                  {taxDetails.isIntraState ? (
                    <>
                      <div className="flex-between color-secondary fs-12">
                        <span>CGST ({(taxDetails.cgstRate * 100).toFixed(1)}%):</span>
                        <span>+₹{taxDetails.cgstAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex-between color-secondary fs-12">
                        <span>SGST ({(taxDetails.sgstRate * 100).toFixed(1)}%):</span>
                        <span>+₹{taxDetails.sgstAmount.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex-between color-secondary fs-12">
                      <span>IGST ({(taxDetails.igstRate * 100).toFixed(1)}%):</span>
                      <span>+₹{taxDetails.igstAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex-between fw-700 fs-14 color-primary" style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '6px' }}>
                    <span>Estimated Total Value:</span>
                    <span>₹{taxDetails.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="slide-drawer__footer">
          {challan && (
            <>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => navigate(`/challans/${challan.id}`)}
              >
                Full Slip Page
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => navigate(`/challans/${challan.id}`)}
                title="Print slip"
              >
                <IconPrinter size={14} /> Print
              </button>

              {challan.status === 'DRAFT' && canModify && (
                <>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={handleCancel}
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    onClick={handleConfirm}
                    disabled={actionLoading}
                  >
                    <IconCheck size={14} />
                    {actionLoading ? 'Confirming...' : 'Confirm Delivery'}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
