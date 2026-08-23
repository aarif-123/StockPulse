import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerService } from '../../services/customer.service';
import { productService } from '../../services/product.service';
import { challanService } from '../../services/challan.service';
import type { Customer, Product, Challan } from '../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [challans, setChallans] = useState<Challan[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !query.trim()) {
      setCustomers([]);
      setProducts([]);
      setChallans([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [custRes, prodRes, chalRes] = await Promise.allSettled([
          customerService.getCustomers({ search: query, limit: 4 }),
          productService.getProducts({ search: query, limit: 4 }),
          challanService.getChallans({ search: query, limit: 4 }),
        ]);

        if (custRes.status === 'fulfilled') setCustomers(custRes.value.data);
        if (prodRes.status === 'fulfilled') setProducts(prodRes.value.data);
        if (chalRes.status === 'fulfilled') setChallans(chalRes.value.data);
      } catch {
        // Suppress search errors gracefully
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  const handleSelect = (path: string) => {
    onClose();
    navigate(path);
  };

  const hasResults = customers.length > 0 || products.length > 0 || challans.length > 0;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: '10vh' }}>
      <div
        className="command-palette-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="command-palette-header">
          <span style={{ fontSize: '18px', color: 'var(--text-tertiary)' }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Search anything (Customers, SKUs, Challans, Pages)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="command-palette-kbd">ESC</kbd>
        </div>

        <div className="command-palette-body">
          {loading && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Searching StockPulse...
            </div>
          )}

          {!loading && !query && (
            <div className="command-palette-section">
              <div className="command-palette-section-title">Quick Jump</div>
              <div className="command-palette-item" onClick={() => handleSelect('/dashboard')}>
                <span>📊 Executive Dashboard</span>
                <span className="command-palette-hint">Overview</span>
              </div>
              <div className="command-palette-item" onClick={() => handleSelect('/reorder')}>
                <span>🛒 Purchasing & Reorder Hub</span>
                <span className="command-palette-hint">Procurement</span>
              </div>
              <div className="command-palette-item" onClick={() => handleSelect('/aim')}>
                <span>🧠 AIM Stock Optimizer</span>
                <span className="command-palette-hint">Forecasting</span>
              </div>
              <div className="command-palette-item" onClick={() => handleSelect('/stock-take')}>
                <span>📋 Stock Taking & Physical Audit</span>
                <span className="command-palette-hint">Cycle Count</span>
              </div>
              <div className="command-palette-item" onClick={() => handleSelect('/assemblies')}>
                <span>📦 Production & BOM Bundles</span>
                <span className="command-palette-hint">Kits</span>
              </div>
              <div className="command-palette-item" onClick={() => handleSelect('/challans/new')}>
                <span>📝 Create Delivery Challan</span>
                <span className="command-palette-hint">Dispatch</span>
              </div>
              <div className="command-palette-item" onClick={() => handleSelect('/products?lowStock=true')}>
                <span>⚠️ Stock Alert Warnings</span>
                <span className="command-palette-hint">Inventory</span>
              </div>
              <div className="command-palette-item" onClick={() => handleSelect('/notifications')}>
                <span>🔔 Role Alerts & Notification History</span>
                <span className="command-palette-hint">Audit Log</span>
              </div>
              <div className="command-palette-item" onClick={() => handleSelect('/reports')}>
                <span>📈 Stock Movement Audit Reports</span>
                <span className="command-palette-hint">Audit</span>
              </div>
            </div>
          )}

          {!loading && query && !hasResults && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No matches found for &quot;<strong>{query}</strong>&quot;
            </div>
          )}

          {!loading && customers.length > 0 && (
            <div className="command-palette-section">
              <div className="command-palette-section-title">Customers CRM ({customers.length})</div>
              {customers.map((c) => (
                <div
                  key={c.id}
                  className="command-palette-item"
                  onClick={() => handleSelect(`/customers/${c.id}`)}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {c.businessName ? `${c.businessName} • ` : ''}{c.mobile}
                    </div>
                  </div>
                  <span className={`badge ${c.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!loading && products.length > 0 && (
            <div className="command-palette-section">
              <div className="command-palette-section-title">Products Inventory ({products.length})</div>
              {products.map((p) => (
                <div
                  key={p.id}
                  className="command-palette-item"
                  onClick={() => handleSelect(`/products/${p.id}`)}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--mono)' }}>
                      {p.sku} • {p.category}
                    </div>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>
                    {p.currentStock} units
                  </span>
                </div>
              ))}
            </div>
          )}

          {!loading && challans.length > 0 && (
            <div className="command-palette-section">
              <div className="command-palette-section-title">Delivery Challans ({challans.length})</div>
              {challans.map((ch) => (
                <div
                  key={ch.id}
                  className="command-palette-item"
                  onClick={() => handleSelect(`/challans/${ch.id}`)}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontFamily: 'var(--mono)' }}>{ch.challanNumber}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {ch.customer?.name || 'Customer'} • {ch.items?.length || 0} items
                    </div>
                  </div>
                  <span className={`badge ${
                    ch.status === 'CONFIRMED' ? 'badge-success' : ch.status === 'DRAFT' ? 'badge-warning' : 'badge-danger'
                  }`}>
                    {ch.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
