import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { customerService } from '../services/customer.service';
import { productService } from '../services/product.service';
import { challanService } from '../services/challan.service';
import { handleApiError } from '../services/api';
import type { Customer, Product } from '../types';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/common/ToastContainer';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { PageHeader } from '../components/common/PageHeader';
import { computeGstBreakdown } from '../utils/taxEngine';
import { SearchableCombobox, type ComboboxOption } from '../components/common/SearchableCombobox';
import { CatalogPickerModal } from '../components/challans/CatalogPickerModal';
import {
  IconPlus,
  IconX,
  IconAlertTriangle,
  IconPackage,
  IconUsers,
} from '../components/common/Icons';

interface SelectedItem {
  productId: string;
  quantity: number;
}

const GST_RATES = [
  { label: '0% (Exempt)', rate: 0 },
  { label: '5% GST', rate: 0.05 },
  { label: '12% GST', rate: 0.12 },
  { label: '18% Standard GST', rate: 0.18 },
  { label: '28% Luxury GST', rate: 0.28 },
];

export const CreateChallan: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cloneFromId = searchParams.get('cloneFrom');

  const { toasts, toast, removeToast } = useToast();

  // Catalogs
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clonedChallanNumber, setClonedChallanNumber] = useState<string | null>(null);

  // Form states
  const [customerId, setCustomerId] = useState('');
  const [selectedGstRate, setSelectedGstRate] = useState(0.18);
  const [items, setItems] = useState<SelectedItem[]>([{ productId: '', quantity: 1 }]);
  const [submitting, setSubmitting] = useState(false);

  // Quick Add / Catalog modal
  const [quickAddSearch, setQuickAddSearch] = useState('');
  const [showCatalogModal, setShowCatalogModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchCatalogsAndClonedData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [custRes, prodRes] = await Promise.all([
          customerService.getCustomers({ limit: 500 }),
          productService.getProducts({ limit: 500 }),
        ]);

        if (mounted) {
          setCustomers(custRes.data);
          setProducts(prodRes.data);
        }

        // If cloning from existing challan, pre-fill
        if (cloneFromId) {
          const cloneRes = await challanService.getChallan(cloneFromId);
          const orig = cloneRes.data;
          if (mounted && orig) {
            setClonedChallanNumber(orig.challanNumber);
            setCustomerId(orig.customerId);
            if (orig.items && orig.items.length > 0) {
              setItems(
                orig.items.map((i) => ({
                  productId: i.productId,
                  quantity: i.quantity,
                }))
              );
            }
          }
        }
      } catch (err) {
        if (mounted) setError(handleApiError(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void fetchCatalogsAndClonedData();

    return () => {
      mounted = false;
    };
  }, [cloneFromId]);

  // Maps & Options for Comboboxes
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const selectedCustomer = customerMap.get(customerId);

  const customerOptions: ComboboxOption[] = useMemo(() => {
    return customers.map((c) => {
      const gstinText = c.gstNumber || c.gstin || 'Unregistered';
      const isOverLimit = Number(c.outstanding || 0) > Number(c.creditLimit || 0);
      return {
        value: c.id,
        label: c.businessName || c.name,
        sublabel: c.businessName ? c.name : undefined,
        extraInfo: `GSTIN: ${gstinText} • ${c.city || 'India'} • Outstanding: ₹${Number(c.outstanding || 0).toLocaleString('en-IN')}`,
        badge: isOverLimit ? 'Over Limit' : c.type || 'RETAIL',
        badgeType: isOverLimit ? 'danger' : 'neutral',
      };
    });
  }, [customers]);

  const productOptions: ComboboxOption[] = useMemo(() => {
    return products.map((p) => {
      const isOut = p.currentStock <= 0;
      const isLow = p.currentStock <= p.minimumStock;
      const stockBadge = isOut ? 'Out of Stock' : `${p.currentStock} in stock`;
      const badgeType: 'danger' | 'warning' | 'success' = isOut ? 'danger' : isLow ? 'warning' : 'success';
      return {
        value: p.id,
        label: p.name,
        sublabel: p.sku,
        extraInfo: `₹${Number(p.unitPrice).toFixed(2)} • ${p.category || 'General'} ${p.warehouseLocation ? `• ${p.warehouseLocation}` : ''}`,
        badge: stockBadge,
        badgeType,
        disabled: isOut,
      };
    });
  }, [products]);

  const handleAddItem = () => {
    setItems((prev) => [...prev, { productId: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof SelectedItem,
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          return {
            ...item,
            [field]: field === 'quantity' ? Math.max(1, parseInt(String(value), 10) || 0) : value,
          };
        }
        return item;
      })
    );
  };

  // Quick Add from Search Bar
  const handleQuickAdd = (productId: string) => {
    if (!productId) return;
    const existingIndex = items.findIndex((i) => i.productId === productId);
    if (existingIndex >= 0) {
      handleItemChange(existingIndex, 'quantity', items[existingIndex].quantity + 1);
      toast.info('Item already in list — quantity incremented by 1.');
    } else {
      // If the first item is empty, replace it, else append
      if (items.length === 1 && items[0].productId === '') {
        setItems([{ productId, quantity: 1 }]);
      } else {
        setItems((prev) => [...prev, { productId, quantity: 1 }]);
      }
      const p = productMap.get(productId);
      toast.success(`Added ${p?.name || 'product'} to challan.`);
    }
    setQuickAddSearch('');
  };

  // Multi-Add from Catalog Modal
  const handleMultiAddProducts = (selectedList: { product: Product; quantity: number }[]) => {
    setItems((prev) => {
      const next = [...prev.filter((i) => i.productId !== '')];
      for (const item of selectedList) {
        const existingIndex = next.findIndex((i) => i.productId === item.product.id);
        if (existingIndex >= 0) {
          next[existingIndex].quantity += item.quantity;
        } else {
          next.push({ productId: item.product.id, quantity: item.quantity });
        }
      }
      return next.length > 0 ? next : [{ productId: '', quantity: 1 }];
    });
    toast.success(`Added ${selectedList.length} products to challan.`);
  };

  // Calculate realtime totals and GST split
  const totalQuantity = items.reduce((acc, curr) => acc + (curr.productId ? curr.quantity : 0), 0);
  const subtotal = items.reduce((acc, curr) => {
    const prod = productMap.get(curr.productId);
    return acc + (prod ? Number(prod.unitPrice) * curr.quantity : 0);
  }, 0);

  const taxDetails = computeGstBreakdown(
    subtotal,
    selectedGstRate,
    selectedCustomer?.gstNumber || selectedCustomer?.gstin
  );

  // Detect any stock shortages
  const hasShortages = items.some((item) => {
    const prod = productMap.get(item.productId);
    return prod && item.quantity > prod.currentStock;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      toast.warning('Please select a customer.');
      return;
    }

    const validItems = items.filter((item) => item.productId !== '');
    if (validItems.length === 0) {
      toast.warning('Please add at least one valid product line.');
      return;
    }

    const productIds = validItems.map((item) => item.productId);
    if (new Set(productIds).size !== productIds.length) {
      toast.warning('Duplicate products detected in multiple rows. Please consolidate into a single line item.');
      return;
    }

    const hasInvalidQty = validItems.some((item) => item.quantity <= 0);
    if (hasInvalidQty) {
      toast.warning('All product quantities must be greater than zero.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerId,
        items: validItems,
      };

      const res = await challanService.createChallan(payload);
      toast.success('Draft Delivery Challan created successfully.');
      navigate(`/challans/${res.data.id}`);
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '8px 0' }}>
        <div className="mb-24">
          <LoadingSkeleton lines={2} />
        </div>
        <div className="details-grid">
          <LoadingSkeleton variant="card" count={2} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" style={{ margin: '32px' }}>
        <strong>Error:</strong> {error}
        <div className="mt-16">
          <Link to="/challans" className="btn btn-secondary">
            Back to Challans
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '32px' }}>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      <CatalogPickerModal
        isOpen={showCatalogModal}
        onClose={() => setShowCatalogModal(false)}
        products={products}
        onAddProducts={handleMultiAddProducts}
      />

      <PageHeader
        title={clonedChallanNumber ? `Re-Order (Cloned from ${clonedChallanNumber})` : 'Create Sales Delivery Challan'}
        subtitle="Generate a new outbound shipment delivery slip with statutory tax computation."
        backTo={{ label: 'Delivery Challans', href: '/challans' }}
      />

      {clonedChallanNumber && (
        <div className="alert alert-info mb-16">
          ℹ️ <strong>Re-Order Mode:</strong> Pre-filled client and items from <strong>{clonedChallanNumber}</strong>. Prices have been refreshed with current inventory catalog values.
        </div>
      )}

      {hasShortages && (
        <div className="alert alert-warning mb-20">
          <IconAlertTriangle size={16} />
          <span>
            <strong>Stock Shortage Detected:</strong> One or more selected items exceed currently available warehouse stock. You can save as Draft now, but will need to replenish inventory before confirming dispatch.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="challan-wizard">
        {/* Left Side: Interactive Items Builder */}
        <div className="challan-item-list">
          {/* Card Header with Quick Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <h3 className="card-title" style={{ margin: 0 }}>
                Challan Line Items ({items.filter((i) => i.productId).length})
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                Search, pick, or batch-select products to include in this outbound dispatch.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowCatalogModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <IconPackage size={14} /> Browse Catalog & Multi-Select
              </button>
            </div>
          </div>

          {/* Quick-Add Search Bar */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary-hover)', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
              ⚡ Quick Add SKU:
            </div>
            <div style={{ flex: 1 }}>
              <SearchableCombobox
                options={productOptions}
                value={quickAddSearch}
                onChange={handleQuickAdd}
                placeholder="Type SKU or product name to instantly add to list..."
                searchPlaceholder="Search 150+ catalog SKUs..."
              />
            </div>
          </div>

          {/* Line Items Table / Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {items.map((item, index) => {
              const prod = productMap.get(item.productId);
              const isShortage = prod && item.quantity > prod.currentStock;
              const lineTotal = prod ? Number(prod.unitPrice) * item.quantity : 0;

              return (
                <div
                  key={index}
                  style={{
                    background: isShortage ? 'rgba(239, 68, 68, 0.04)' : 'var(--bg-secondary)',
                    border: isShortage ? '1px solid var(--danger)' : '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    display: 'grid',
                    gridTemplateColumns: 'minmax(220px, 3fr) 110px 110px 90px 110px 36px',
                    gap: '12px',
                    alignItems: 'center',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  {/* 1. Product Searchable Combobox */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Product {index + 1} *
                    </label>
                    <SearchableCombobox
                      options={productOptions}
                      value={item.productId}
                      onChange={(val) => handleItemChange(index, 'productId', val)}
                      placeholder="Search & choose product..."
                      searchPlaceholder="Search by SKU or name..."
                    />
                  </div>

                  {/* 2. Stock Available */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      In Stock
                    </label>
                    <div
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-tertiary)',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        textAlign: 'center',
                        color: prod
                          ? prod.currentStock < item.quantity
                            ? 'var(--danger)'
                            : prod.currentStock <= prod.minimumStock
                            ? 'var(--warning)'
                            : 'var(--success)'
                          : 'var(--text-tertiary)',
                      }}
                    >
                      {prod ? `${prod.currentStock} units` : '—'}
                    </div>
                  </div>

                  {/* 3. Unit Price */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Unit Price
                    </label>
                    <div
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-tertiary)',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        textAlign: 'right',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {prod ? `₹${Number(prod.unitPrice).toFixed(2)}` : '—'}
                    </div>
                  </div>

                  {/* 4. Quantity */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Quantity *
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      style={{ padding: '7px 8px', fontSize: '13px', textAlign: 'center', fontWeight: 700 }}
                      value={item.quantity === 0 ? '' : item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>

                  {/* 5. Line Total */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>
                      Line Total
                    </label>
                    <div
                      style={{
                        padding: '8px 4px',
                        fontSize: '13px',
                        fontWeight: 700,
                        textAlign: 'right',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--primary-hover)',
                      }}
                    >
                      ₹{lineTotal.toFixed(2)}
                    </div>
                  </div>

                  {/* 6. Remove Button */}
                  <div style={{ textAlign: 'center', paddingTop: '16px' }}>
                    <button
                      type="button"
                      className="btn-icon"
                      style={{ color: 'var(--danger)', opacity: items.length === 1 ? 0.3 : 1 }}
                      disabled={items.length === 1 || submitting}
                      onClick={() => handleRemoveItem(index)}
                      title="Remove product line"
                    >
                      <IconX size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleAddItem}
              disabled={submitting}
              id="add-challan-line-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <IconPlus size={14} /> Add Another Empty Line
            </button>

            <span style={{ fontSize: '12.5px', color: 'var(--text-tertiary)' }}>
              Total items: <strong style={{ color: 'var(--text-primary)' }}>{totalQuantity} units</strong> across {items.filter((i) => i.productId).length} lines
            </span>
          </div>
        </div>

        {/* Right Side: Customer Selector & Statutory Tax Summary */}
        <div>
          <div className="card" style={{ position: 'sticky', top: '24px' }}>
            <h3 className="card-title card-title--bordered" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconUsers size={16} /> Client & Tax Summary
            </h3>

            {/* Searchable Customer Combobox */}
            <div className="form-group">
              <label className="form-label">Client / Customer (150+ Accounts) *</label>
              <SearchableCombobox
                options={customerOptions}
                value={customerId}
                onChange={setCustomerId}
                placeholder="Search by client name, GSTIN, city..."
                searchPlaceholder="Type customer name or GSTIN..."
                disabled={submitting}
              />
            </div>

            {selectedCustomer && (
              <div
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  marginBottom: '16px',
                  lineHeight: '1.6',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>
                    {selectedCustomer.businessName || selectedCustomer.name}
                  </span>
                  <span className="badge badge-primary" style={{ fontSize: '10px' }}>
                    {selectedCustomer.type || 'RETAIL'}
                  </span>
                </div>
                <div><strong>GSTIN:</strong> {selectedCustomer.gstNumber || selectedCustomer.gstin || 'Unregistered'}</div>
                <div><strong>Tax Classification:</strong> {taxDetails.isIntraState ? '🟢 Intra-State (CGST + SGST)' : '🔵 Inter-State (IGST)'}</div>
                <div><strong>Delivery Address:</strong> {selectedCustomer.address || `${selectedCustomer.city || ''}, ${selectedCustomer.state || ''}`}</div>
                <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Outstanding: ₹{Number(selectedCustomer.outstanding || 0).toLocaleString('en-IN')}</span>
                  <span>Credit Limit: ₹{Number(selectedCustomer.creditLimit || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">GST Tax Classification Rate</label>
              <select
                className="filter-select"
                style={{ width: '100%' }}
                value={selectedGstRate}
                onChange={(e) => setSelectedGstRate(parseFloat(e.target.value))}
              >
                {GST_RATES.map((g) => (
                  <option key={g.label} value={g.rate}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            <div
              className="info-list"
              style={{
                marginTop: '16px',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '16px',
                gap: '10px',
              }}
            >
              <div className="info-item">
                <span className="info-label">Dispatch Status</span>
                <span className="badge badge-warning">Draft</span>
              </div>
              <div className="info-item">
                <span className="info-label">Total Dispatch Units</span>
                <span className="info-value" style={{ fontWeight: 700 }}>
                  {totalQuantity} units
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Subtotal</span>
                <span className="info-value" style={{ fontWeight: 600 }}>
                  ₹{taxDetails.subtotal.toFixed(2)}
                </span>
              </div>

              {taxDetails.isIntraState ? (
                <>
                  <div className="info-item">
                    <span className="info-label">CGST ({(taxDetails.cgstRate * 100).toFixed(1)}%)</span>
                    <span className="info-value" style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                      +₹{taxDetails.cgstAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">SGST ({(taxDetails.sgstRate * 100).toFixed(1)}%)</span>
                    <span className="info-value" style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                      +₹{taxDetails.sgstAmount.toFixed(2)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="info-item">
                  <span className="info-label">IGST ({(taxDetails.igstRate * 100).toFixed(1)}%)</span>
                  <span className="info-value" style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                    +₹{taxDetails.igstAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="info-item" style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '10px' }}>
                <span className="info-label" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  Estimated Grand Total
                </span>
                <span className="info-value" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary-hover)' }}>
                  ₹{taxDetails.grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '20px', padding: '12px', fontSize: '14px', fontWeight: 700 }}
              disabled={submitting || !customerId}
              id="save-draft-challan-btn"
            >
              {submitting ? 'Saving Draft...' : 'Save Draft Challan'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateChallan;
