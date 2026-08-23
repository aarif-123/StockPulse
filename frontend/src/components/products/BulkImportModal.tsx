import React, { useState, useRef } from 'react';
import { productService } from '../../services/product.service';
import { downloadProductImportTemplate } from '../../utils/productImportTemplate';
import { handleApiError } from '../../services/api';
import { IconDownload } from '../common/Icons';

export interface ParsedImportRow {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: string;
  currentStock: string;
  minimumStock: string;
  warehouseLocation: string;
  status: 'valid' | 'warning' | 'error';
  errors: string[];
}

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (importedCount: number) => void;
  isWarehouseRole?: boolean;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isWarehouseRole = false,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedImportRow[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'valid' | 'errors'>('all');
  const [duplicateStrategy, setDuplicateStrategy] = useState<'MERGE_STOCK' | 'SKIP_DUPLICATES' | 'REPLACE_ALL' | 'STRICT'>('MERGE_STOCK');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Simple CSV parser supporting quotes & line splits
  const parseCSVText = (text: string): ParsedImportRow[] => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return [];

    // Header extraction
    const rawHeaders = splitCSVLine(lines[0] || '').map((h) => h.toLowerCase().trim());

    // Header mapping helpers
    const getIndex = (keys: string[]) =>
      rawHeaders.findIndex((h) => keys.some((k) => h.includes(k)));

    const idxName = getIndex(['name', 'product', 'title']);
    const idxSku = getIndex(['sku', 'code', 'identifier']);
    const idxCat = getIndex(['category', 'group', 'type']);
    const idxPrice = getIndex(['price', 'unit price', 'cost', 'rate']);
    const idxStock = getIndex(['current stock', 'stock', 'qty', 'quantity']);
    const idxMin = getIndex(['minimum', 'min stock', 'threshold', 'reorder']);
    const idxLoc = getIndex(['location', 'warehouse', 'rack', 'shelf', 'bin']);

    const parsed: ParsedImportRow[] = [];
    const seenSkus = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || !line.trim()) continue;

      const cols = splitCSVLine(line);
      const name = cols[idxName >= 0 ? idxName : 0]?.trim() || '';
      const sku = cols[idxSku >= 0 ? idxSku : 1]?.trim().toUpperCase() || '';
      const category = cols[idxCat >= 0 ? idxCat : 2]?.trim() || '';
      const unitPrice = cols[idxPrice >= 0 ? idxPrice : 3]?.trim() || '0';
      const currentStock = cols[idxStock >= 0 ? idxStock : 4]?.trim() || '0';
      const minimumStock = cols[idxMin >= 0 ? idxMin : 5]?.trim() || '10';
      const warehouseLocation = cols[idxLoc >= 0 ? idxLoc : 6]?.trim() || '';

      const errors: string[] = [];
      if (!name) errors.push('Product name is required');
      if (!sku) errors.push('SKU identifier is required');
      if (seenSkus.has(sku) && sku) errors.push(`Duplicate SKU "${sku}" in file`);
      if (sku) seenSkus.add(sku);

      if (isNaN(Number(unitPrice)) || Number(unitPrice) < 0) {
        errors.push('Unit Price must be a valid number >= 0');
      }
      if (isNaN(Number(currentStock)) || Number(currentStock) < 0) {
        errors.push('Current Stock must be a non-negative integer');
      }

      let status: 'valid' | 'warning' | 'error' = 'valid';
      if (errors.length > 0) {
        status = 'error';
      } else if (!category || !warehouseLocation) {
        status = 'warning';
      }

      parsed.push({
        id: `row-${i}-${Date.now()}`,
        name,
        sku,
        category: category || 'General',
        unitPrice: unitPrice || '0',
        currentStock: currentStock || '0',
        minimumStock: minimumStock || '10',
        warehouseLocation: warehouseLocation || 'Main Warehouse',
        status,
        errors,
      });
    }

    return parsed;
  };

  const splitCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const handleFileSelect = (selectedFile: File) => {
    setSubmitError(null);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        const parsedRows = parseCSVText(content);
        setRows(parsedRows);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleCellEdit = (
    rowId: string,
    field: keyof ParsedImportRow,
    value: string
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const updated = { ...r, [field]: value };
        // Re-validate row
        const errors: string[] = [];
        if (!updated.name.trim()) errors.push('Product name is required');
        if (!updated.sku.trim()) errors.push('SKU identifier is required');

        let status: 'valid' | 'warning' | 'error' = 'valid';
        if (errors.length > 0) status = 'error';
        else if (!updated.category.trim() || !updated.warehouseLocation.trim()) {
          status = 'warning';
        }

        return { ...updated, status, errors };
      })
    );
  };

  // Auto fill smart defaults for missing details
  const handleAutoFillDefaults = () => {
    setRows((prev) =>
      prev.map((r) => {
        const updated = {
          ...r,
          category: r.category.trim() || 'General',
          minimumStock: r.minimumStock.trim() || '10',
          currentStock: r.currentStock.trim() || '0',
          unitPrice: r.unitPrice.trim() || '0',
          warehouseLocation: r.warehouseLocation.trim() || 'Main Warehouse',
        };
        const errors: string[] = [];
        if (!updated.name.trim()) errors.push('Product name is required');
        if (!updated.sku.trim()) errors.push('SKU identifier is required');

        return {
          ...updated,
          status: errors.length > 0 ? 'error' : 'valid',
          errors,
        };
      })
    );
  };

  const validCount = rows.filter((r) => r.status !== 'error').length;
  const errorCount = rows.filter((r) => r.status === 'error').length;

  const filteredRows = rows.filter((r) => {
    if (filterTab === 'valid') return r.status !== 'error';
    if (filterTab === 'errors') return r.status === 'error';
    return true;
  });

  const handleImportSubmit = async () => {
    const validItems = rows.filter((r) => r.status !== 'error');
    if (validItems.length === 0) {
      setSubmitError('No valid product rows available to import. Please resolve error rows.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = validItems.map((r) => ({
        name: r.name.trim(),
        sku: r.sku.trim().toUpperCase(),
        category: r.category.trim() || 'General',
        unitPrice: isWarehouseRole ? 0 : Number(r.unitPrice) || 0,
        currentStock: Number(r.currentStock) || 0,
        minimumStock: Number(r.minimumStock) || 10,
        warehouseLocation: r.warehouseLocation.trim() || 'Main Warehouse',
      }));

      const res = await productService.bulkImportProducts(payload, duplicateStrategy);
      const totalCount = res.importedCount + (res.updatedCount || 0);
      onSuccess(totalCount);
      onClose();
    } catch (err) {
      setSubmitError(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="modal-overlay flex-center" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '960px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header flex-between">
          <div>
            <h3 className="modal-title">Bulk Product Import (CSV / Excel)</h3>
            <p className="fs-13 color-tertiary mt-2">
              Upload your catalog spreadsheet. Supports adding custom new categories dynamically!
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body p-20" style={{ overflowY: 'auto', flex: 1 }}>
          {submitError && <div className="alert alert-danger mb-16">{submitError}</div>}

          {/* File Upload Dropzone */}
          {!file || rows.length === 0 ? (
            <div>
              <div
                className={`dropzone p-32 text-center border-dashed cursor-pointer ${
                  isDragOver ? 'dropzone--active' : ''
                }`}
                style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: '8px',
                  background: isDragOver ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  transition: 'all 0.2s',
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.xlsx,.xls,.txt"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />
                <div className="fs-32 mb-8">📄</div>
                <h4 className="fw-700 fs-16 mb-4">Drag and drop your spreadsheet file here</h4>
                <p className="fs-13 color-tertiary mb-16">
                  Supports <span className="color-primary fw-600">.CSV</span> and Excel exported catalog files.
                </p>
                <button type="button" className="btn btn-secondary btn-sm">
                  Browse File
                </button>
              </div>

              {/* Template Banner */}
              <div className="mt-16 flex-between p-12" style={{ background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                <span className="fs-13 color-tertiary">
                  Need a pre-formatted template with column headers and sample data?
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm color-primary"
                  onClick={() => downloadProductImportTemplate()}
                >
                  <IconDownload size={14} /> Download Sample Template (.csv)
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Validation Summary Bar */}
              <div className="flex-between mb-16 p-12" style={{ background: 'var(--bg-secondary)', borderRadius: '8px', flexWrap: 'wrap', gap: '10px' }}>
                <div className="flex-center gap-12">
                  <span className="fs-13 fw-600">File Loaded: {file.name}</span>
                  <span className="badge badge-secondary">{rows.length} Total Rows</span>
                  <span className="badge badge-success">{validCount} Ready</span>
                  {errorCount > 0 && <span className="badge badge-danger">{errorCount} Errors</span>}
                </div>

                <div className="flex-center gap-12">
                  <div className="flex-center gap-6">
                    <label className="fs-12 fw-600 color-tertiary">If Duplicate SKU:</label>
                    <select
                      className="filter-select fs-12"
                      value={duplicateStrategy}
                      onChange={(e) => setDuplicateStrategy(e.target.value as any)}
                      style={{ padding: '4px 8px' }}
                    >
                      <option value="MERGE_STOCK">🔄 Merge & Add Stock Level (Restock)</option>
                      <option value="SKIP_DUPLICATES">⏭️ Skip Duplicate SKUs</option>
                      <option value="REPLACE_ALL">📝 Overwrite Existing Item</option>
                      <option value="STRICT">⚠️ Block / Show Error</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleAutoFillDefaults}
                    title="Automatically fill defaults for missing optional fields like category or location"
                  >
                    ✨ Auto-Fill Defaults
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setFile(null);
                      setRows([]);
                    }}
                  >
                    Change File
                  </button>
                </div>
              </div>

              {/* Filter tabs */}
              <div className="flex-between mb-12">
                <div className="status-tabs">
                  <button
                    type="button"
                    className={`status-tab ${filterTab === 'all' ? 'status-tab--active' : ''}`}
                    onClick={() => setFilterTab('all')}
                  >
                    All ({rows.length})
                  </button>
                  <button
                    type="button"
                    className={`status-tab ${filterTab === 'valid' ? 'status-tab--active' : ''}`}
                    onClick={() => setFilterTab('valid')}
                  >
                    Ready ({validCount})
                  </button>
                  <button
                    type="button"
                    className={`status-tab ${filterTab === 'errors' ? 'status-tab--active' : ''}`}
                    onClick={() => setFilterTab('errors')}
                  >
                    Errors ({errorCount})
                  </button>
                </div>
                <span className="fs-12 color-tertiary">💡 Click any cell below to edit details inline!</span>
              </div>

              {/* Validation Table */}
              <div style={{ overflowX: 'auto', maxHeight: '420px', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                <table className="table" style={{ width: '100%', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th style={{ width: '90px' }}>Status</th>
                      <th>Product Name *</th>
                      <th>SKU *</th>
                      <th>Category (Custom Supported)</th>
                      {!isWarehouseRole && <th>Unit Price (₹)</th>}
                      <th>Current Stock</th>
                      <th>Min Threshold</th>
                      <th>Warehouse Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((r, idx) => (
                      <tr key={r.id} style={{ background: r.status === 'error' ? 'rgba(239, 68, 68, 0.05)' : undefined }}>
                        <td className="color-tertiary text-mono">{idx + 1}</td>
                        <td>
                          {r.status === 'valid' ? (
                            <span className="badge badge-success" style={{ fontSize: '10px' }}>Valid</span>
                          ) : r.status === 'warning' ? (
                            <span className="badge badge-warning" style={{ fontSize: '10px' }}>Fixable</span>
                          ) : (
                            <span
                              className="badge badge-danger"
                              style={{ fontSize: '10px', cursor: 'help' }}
                              title={r.errors.join(', ')}
                            >
                              Error
                            </span>
                          )}
                        </td>

                        {/* Inline Editable Cells */}
                        <td>
                          <input
                            type="text"
                            className="input input-sm"
                            value={r.name}
                            placeholder="Product Name"
                            onChange={(e) => handleCellEdit(r.id, 'name', e.target.value)}
                            style={{ borderColor: !r.name.trim() ? 'var(--danger)' : undefined }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="input input-sm text-mono"
                            value={r.sku}
                            placeholder="SKU"
                            onChange={(e) => handleCellEdit(r.id, 'sku', e.target.value.toUpperCase())}
                            style={{ borderColor: !r.sku.trim() ? 'var(--danger)' : undefined }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="input input-sm"
                            value={r.category}
                            placeholder="e.g. Medical Supplies (Custom)"
                            onChange={(e) => handleCellEdit(r.id, 'category', e.target.value)}
                          />
                        </td>
                        {!isWarehouseRole && (
                          <td>
                            <input
                              type="number"
                              className="input input-sm text-mono"
                              value={r.unitPrice}
                              placeholder="0.00"
                              onChange={(e) => handleCellEdit(r.id, 'unitPrice', e.target.value)}
                            />
                          </td>
                        )}
                        <td>
                          <input
                            type="number"
                            className="input input-sm text-mono"
                            value={r.currentStock}
                            placeholder="0"
                            onChange={(e) => handleCellEdit(r.id, 'currentStock', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="input input-sm text-mono"
                            value={r.minimumStock}
                            placeholder="10"
                            onChange={(e) => handleCellEdit(r.id, 'minimumStock', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="input input-sm"
                            value={r.warehouseLocation}
                            placeholder="Location (e.g. Aisle A-01)"
                            onChange={(e) => handleCellEdit(r.id, 'warehouseLocation', e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer flex-between p-16" style={{ borderTop: '1px solid var(--border-color)' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={submitting}>
            Cancel
          </button>

          {file && rows.length > 0 && (
            <div className="flex-center gap-12">
              <span className="fs-12 color-tertiary">
                Will import <strong className="color-success">{validCount}</strong> valid items into catalog
              </span>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleImportSubmit}
                disabled={submitting || validCount === 0}
              >
                {submitting ? 'Importing Products...' : `🚀 Import ${validCount} Valid Products`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
