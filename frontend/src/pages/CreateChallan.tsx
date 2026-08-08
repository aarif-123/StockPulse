import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { customerService } from '../services/customer.service';
import { productService } from '../services/product.service';
import { challanService } from '../services/challan.service';
import { handleApiError } from '../services/api';
import type { Customer, Product } from '../types';

interface SelectedItem {
  productId: string;
  quantity: number;
}

export const CreateChallan: React.FC = () => {
  const navigate = useNavigate();

  // Catalogs
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<SelectedItem[]>([{ productId: '', quantity: 1 }]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCatalogs = async () => {
      setLoading(true);
      setError(null);
      try {
        // Retrieve all customers and products (capped at 100 for drop-down contexts)
        const [custRes, prodRes] = await Promise.all([
          customerService.getCustomers({ limit: 100 }),
          productService.getProducts({ limit: 100 }),
        ]);
        setCustomers(custRes.data);
        setProducts(prodRes.data);
      } catch (err) {
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };
    fetchCatalogs();
  }, []);

  const handleAddItem = () => {
    setItems((prev) => [...prev, { productId: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof SelectedItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (field === 'quantity') {
          const qty = parseInt(value as string, 10);
          return { ...item, quantity: isNaN(qty) ? 0 : qty };
        }
        return { ...item, productId: value as string };
      })
    );
  };

  // Calculate local client total quantities
  const totalQuantity = items.reduce((acc, curr) => acc + curr.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!customerId) {
      setSubmitError('Please select a customer.');
      return;
    }

    // Validate items
    const validItems = items.filter((item) => item.productId !== '');
    if (validItems.length === 0) {
      setSubmitError('Please add at least one valid product.');
      return;
    }

    const hasInvalidQty = validItems.some((item) => item.quantity <= 0);
    if (hasInvalidQty) {
      setSubmitError('All product quantities must be greater than zero.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerId,
        items: validItems,
      };

      const res = await challanService.createChallan(payload);
      // Navigate to detail page of the created draft challan
      navigate(`/challans/${res.data.id}`);
    } catch (err) {
      setSubmitError(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner"></div>
        <p>Loading draft settings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" style={{ margin: '32px' }}>
        <strong>Error:</strong> {error}
        <div style={{ marginTop: '16px' }}>
          <Link to="/challans" className="btn btn-secondary">
            Back to Challans
          </Link>
        </div>
      </div>
    );
  }

  // Helper map for quick product checks
  const productMap = new Map(products.map((p) => [p.id, p]));

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/challans" style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>
            ← Back to Challans
          </Link>
          <h1 className="page-title" style={{ marginTop: '8px' }}>Create Sales Challan</h1>
        </div>
      </div>

      {submitError && <div className="alert alert-danger">{submitError}</div>}

      <form onSubmit={handleSubmit} className="challan-wizard">
        {/* Left side items builder */}
        <div className="challan-item-list">
          <h3 className="card-title">Challan Line Items</h3>

          {items.map((item, index) => {
            const prod = productMap.get(item.productId);
            return (
              <div className="challan-item-row" key={index}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: index === 0 ? 'block' : 'none' }}>
                    Select Product
                  </label>
                  <select
                    className="filter-select"
                    style={{ width: '100%' }}
                    value={item.productId}
                    onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                    required
                  >
                    <option value="">Choose product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: index === 0 ? 'block' : 'none' }}>
                    Current Stock
                  </label>
                  <div className="form-input" style={{ backgroundColor: 'var(--bg-tertiary)', border: 'none', color: prod ? (prod.currentStock <= prod.minimumStock ? 'var(--warning)' : 'var(--success)') : 'var(--text-tertiary)' }}>
                    {prod ? `${prod.currentStock} avail.` : '—'}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: index === 0 ? 'block' : 'none' }}>
                    Unit Price
                  </label>
                  <div className="form-input" style={{ backgroundColor: 'var(--bg-tertiary)', border: 'none' }}>
                    {prod ? `₹${Number(prod.unitPrice).toFixed(2)}` : '—'}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: index === 0 ? 'block' : 'none' }}>
                    Quantity
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    required
                    value={item.quantity === 0 ? '' : item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ 
                    padding: '10px', 
                    marginTop: index === 0 ? '22px' : '0', 
                    borderRadius: '8px' 
                  }}
                  disabled={items.length === 1 || submitting}
                  onClick={() => handleRemoveItem(index)}
                >
                  ✕
                </button>
              </div>
            );
          })}

          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginTop: '16px' }}
            onClick={handleAddItem}
            disabled={submitting}
          >
            + Add Another Line
          </button>
        </div>

        {/* Right side customer selection & totals */}
        <div>
          <div className="card">
            <h3 className="card-title">Challan Header</h3>

            <div className="form-group">
              <label className="form-label">Client / Customer *</label>
              <select
                className="filter-select"
                style={{ width: '100%' }}
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
                disabled={submitting}
              >
                <option value="">Select client...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.businessName} ({c.name})
                  </option>
                ))}
              </select>
            </div>

            <div className="info-list" style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <div className="info-item">
                <span className="info-label">Challan Status</span>
                <span className="badge badge-warning">Draft</span>
              </div>
              <div className="info-item">
                <span className="info-label">Total Item Quantities</span>
                <span className="info-value" style={{ fontSize: '20px', fontWeight: 700 }}>
                  {totalQuantity} items
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '24px', padding: '12px' }}
              disabled={submitting}
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
