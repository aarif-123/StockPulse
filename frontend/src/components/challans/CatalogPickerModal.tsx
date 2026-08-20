import React, { useState, useMemo } from 'react';
import type { Product } from '../../types';
import { IconSearch, IconX, IconPlus, IconPackage } from '../common/Icons';

interface CatalogPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onAddProducts: (selected: { product: Product; quantity: number }[]) => void;
}

export const CatalogPickerModal: React.FC<CatalogPickerModalProps> = ({
  isOpen,
  onClose,
  products,
  onAddProducts,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedMap, setSelectedMap] = useState<Map<string, number>>(new Map());

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ['ALL', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      if (!matchCat) return false;
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        (p.category && p.category.toLowerCase().includes(term))
      );
    });
  }, [products, selectedCategory, searchTerm]);

  const handleToggle = (prod: Product) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(prod.id)) {
        next.delete(prod.id);
      } else {
        next.set(prod.id, 1);
      }
      return next;
    });
  };

  const handleQtyChange = (prodId: string, qty: number) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (qty <= 0) {
        next.delete(prodId);
      } else {
        next.set(prodId, qty);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const itemsToAdd: { product: Product; quantity: number }[] = [];
    const prodMap = new Map(products.map((p) => [p.id, p]));
    for (const [prodId, qty] of selectedMap.entries()) {
      const prod = prodMap.get(prodId);
      if (prod && qty > 0) {
        itemsToAdd.push({ product: prod, quantity: qty });
      }
    }
    if (itemsToAdd.length > 0) {
      onAddProducts(itemsToAdd);
    }
    setSelectedMap(new Map());
    onClose();
  };

  if (!isOpen) return null;

  const totalSelectedCount = selectedMap.size;
  const totalUnits = Array.from(selectedMap.values()).reduce((a, b) => a + b, 0);

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '840px', width: '95%', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(124,58,237,0.15)', color: 'var(--primary-hover)' }}>
              <IconPackage size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>Quick Catalog Multi-Select</h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                Select multiple products, adjust quantities, and insert into challan in 1-click
              </p>
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <IconX size={18} />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '12px', background: 'var(--bg-tertiary)', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <IconSearch size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by SKU, Product Name, Category..."
              className="search-input"
              style={{ width: '100%', paddingLeft: '32px', fontSize: '13px' }}
              autoFocus
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="filter-select"
            style={{ minWidth: '180px', fontSize: '13px' }}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'ALL' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        {/* Product Items Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', maxHeight: '420px' }}>
          {filteredProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)' }}>
              No products found matching your search.
            </div>
          ) : (
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '36px' }}></th>
                  <th>Product Details</th>
                  <th>Category</th>
                  <th>Stock Available</th>
                  <th>Unit Price</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Dispatch Qty</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const isSelected = selectedMap.has(p.id);
                  const qty = selectedMap.get(p.id) || 1;
                  const isLow = p.currentStock <= p.minimumStock;
                  const isOut = p.currentStock <= 0;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleToggle(p)}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(124, 58, 237, 0.12)' : undefined,
                      }}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggle(p)}
                          style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: isSelected ? 'var(--primary-hover)' : 'var(--text-primary)' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                          {p.sku} {p.warehouseLocation ? `• ${p.warehouseLocation}` : ''}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-secondary" style={{ fontSize: '11px' }}>
                          {p.category}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '12.5px',
                            color: isOut ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--success)',
                          }}
                        >
                          ● {p.currentStock} units
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                        ₹{Number(p.unitPrice).toFixed(2)}
                      </td>
                      <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
                        {isSelected ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 8px', height: '26px' }}
                              onClick={() => handleQtyChange(p.id, qty - 1)}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={qty}
                              onChange={(e) => handleQtyChange(p.id, parseInt(e.target.value, 10) || 1)}
                              style={{
                                width: '45px',
                                textAlign: 'center',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                color: 'var(--text-primary)',
                                padding: '2px 4px',
                                fontSize: '12.5px',
                                fontWeight: 700,
                              }}
                            />
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 8px', height: '26px' }}
                              onClick={() => handleQtyChange(p.id, qty + 1)}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Selected: <strong style={{ color: 'var(--text-primary)' }}>{totalSelectedCount} products</strong> ({totalUnits} total units)
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirm}
              disabled={totalSelectedCount === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <IconPlus size={14} /> Add {totalSelectedCount} Products to Challan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
