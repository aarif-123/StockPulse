import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { bomService, type BomAssembly, type CreateBomInput } from '../services/bom.service';
import { productService } from '../services/product.service';
import { handleApiError } from '../services/api';
import type { Product } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/common/ToastContainer';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { PageHeader } from '../components/common/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import {
  IconLayers,
  IconPlus,
  IconCheck,
  IconIndianRupee,
  IconTrash,
  IconX,
} from '../components/common/Icons';

export const ProductionAssemblies: React.FC = () => {
  const { hasRole } = useAuth();
  const { toasts, toast, removeToast } = useToast();
  const canAssemble = hasRole(['ORG_ADMIN', 'ADMIN', 'WAREHOUSE']);

  const [assemblies, setAssemblies] = useState<BomAssembly[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [buildTarget, setBuildTarget] = useState<BomAssembly | null>(null);
  const [buildQty, setBuildQty] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);

  // New Recipe Form State
  const [recipeForm, setRecipeForm] = useState<{
    name: string;
    sku: string;
    category: string;
    description: string;
    sellingPrice: string;
    components: Array<{ productId: string; qtyRequired: number }>;
  }>({
    name: '',
    sku: '',
    category: 'Workstation Bundles',
    description: '',
    sellingPrice: '',
    components: [{ productId: '', qtyRequired: 1 }],
  });

  const fetchCatalog = useCallback(async () => {
    try {
      const res = await productService.getProducts({ limit: 150 });
      setProducts(res.data || []);
    } catch {
      // Fallback
    }
  }, []);

  const fetchAssemblies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await bomService.getAssemblies({ limit: 100 });
      setAssemblies(res.data || []);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCatalog();
    void fetchAssemblies();
  }, [fetchCatalog, fetchAssemblies]);

  // Overall BOM KPIs
  const metrics = useMemo(() => {
    const totalRecipes = assemblies.length;
    const readyToBuild = assemblies.filter((a) => a.canAssembleQty > 0).length;
    const totalPipelineValue = assemblies.reduce(
      (sum, a) => sum + a.sellingPrice * a.canAssembleQty,
      0
    );
    const totalComponentsMapped = assemblies.reduce(
      (sum, a) => sum + (a.components?.length || 0),
      0
    );

    return { totalRecipes, readyToBuild, totalPipelineValue, totalComponentsMapped };
  }, [assemblies]);

  // Seed Default Starter Kits if Database is empty
  const handleSeedDefaults = async () => {
    if (products.length < 2) {
      toast.warning('Please create at least 2 catalog products before initializing starter BOM recipes.');
      return;
    }

    setSubmitting(true);
    try {
      const p1 = products[0];
      const p2 = products[1];
      const p3 = products[2] || products[0];

      const starter1: CreateBomInput = {
        name: 'Executive Dual-Screen Workstation Kit',
        sku: 'KIT-EXEC-4K',
        category: 'Workstation Bundles',
        description: 'Complete productivity bundle with monitor, high-performance mouse, and fast NVMe storage.',
        sellingPrice: Number(p1.unitPrice || 1000) + Number(p2.unitPrice || 500) + 1500,
        components: [
          { productId: p1.id, qtyRequired: 1 },
          { productId: p2.id, qtyRequired: 1 },
        ],
      };

      const starter2: CreateBomInput = {
        name: 'Enterprise Fast Network & Storage Core',
        sku: 'KIT-NET-CORE',
        category: 'Networking Kits',
        description: 'High-availability network hub with dual fast storage cache.',
        sellingPrice: Number(p2.unitPrice || 2000) * 2 + Number(p3.unitPrice || 1000),
        components: [
          { productId: p2.id, qtyRequired: 2 },
          { productId: p3.id, qtyRequired: 1 },
        ],
      };

      await Promise.all([
        bomService.createAssembly(starter1),
        bomService.createAssembly(starter2),
      ]);

      toast.success('Successfully initialized starter Bill of Materials recipes!');
      void fetchAssemblies();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Create Recipe Component Helpers
  const handleAddComponent = () => {
    setRecipeForm((prev) => ({
      ...prev,
      components: [...prev.components, { productId: '', qtyRequired: 1 }],
    }));
  };

  const handleRemoveComponent = (index: number) => {
    setRecipeForm((prev) => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index),
    }));
  };

  const handleComponentChange = (index: number, field: 'productId' | 'qtyRequired', value: any) => {
    setRecipeForm((prev) => {
      const updated = [...prev.components];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, components: updated };
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, sku, category, description, sellingPrice, components } = recipeForm;

    if (!name.trim() || !sku.trim() || !sellingPrice) {
      toast.warning('Please provide Assembly Name, SKU, and Selling Price.');
      return;
    }

    const validComponents = components.filter((c) => Boolean(c.productId) && c.qtyRequired > 0);
    if (validComponents.length === 0) {
      toast.warning('Please select at least one component product with quantity.');
      return;
    }

    setSubmitting(true);
    try {
      await bomService.createAssembly({
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        category: category.trim() || 'Assemblies',
        description: description.trim() || undefined,
        sellingPrice: Number(sellingPrice),
        components: validComponents,
      });

      toast.success(`BOM Recipe "${name}" created successfully!`);
      setIsCreateModalOpen(false);
      setRecipeForm({
        name: '',
        sku: '',
        category: 'Workstation Bundles',
        description: '',
        sellingPrice: '',
        components: [{ productId: '', qtyRequired: 1 }],
      });
      void fetchAssemblies();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Delete BOM Assembly
  const handleDelete = async (bom: BomAssembly) => {
    const ok = window.confirm(`Delete BOM Recipe "${bom.name}" (${bom.sku})?`);
    if (!ok) return;

    try {
      await bomService.deleteAssembly(bom.id);
      toast.success(`BOM Recipe "${bom.name}" deleted.`);
      void fetchAssemblies();
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  // Execute Build Assembly
  const handleExecuteBuild = async () => {
    if (!buildTarget) return;

    setSubmitting(true);
    try {
      const res = await bomService.buildAssembly(buildTarget.id, {
        quantity: buildQty,
      });
      toast.success(res.message || `Successfully assembled ${buildQty}x ${buildTarget.name}!`);
      setBuildTarget(null);
      void fetchAssemblies();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      <PageHeader
        title="Production Assemblies (BOM)"
        subtitle="Manage multi-component Bill of Materials, evaluate component stock capacity, and trigger atomic assembly builds."
        actions={
          <div className="flex-center gap-8">
            {canAssemble && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <IconPlus size={14} /> New BOM Recipe
              </button>
            )}
          </div>
        }
      />

      {error && <div className="alert alert-danger mb-16">{error}</div>}

      {/* Assembly KPI Cards */}
      <div className="stats-grid mb-20">
        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__label">Active BOM Recipes</span>
            <div className="stat-card__icon stat-card__icon--blue">
              <IconLayers size={18} />
            </div>
          </div>
          <div className="stat-card__value">{metrics.totalRecipes}</div>
          <div className="stat-card__footer">{metrics.totalComponentsMapped} component rules defined</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__label">Ready to Assemble</span>
            <div className="stat-card__icon stat-card__icon--green">
              <IconCheck size={18} />
            </div>
          </div>
          <div className="stat-card__value" style={{ color: 'var(--success)' }}>
            {metrics.readyToBuild}
          </div>
          <div className="stat-card__footer">Assemblies with all components in stock</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__label">Assembly Pipeline Value</span>
            <div className="stat-card__icon stat-card__icon--purple">
              <IconIndianRupee size={18} />
            </div>
          </div>
          <div className="stat-card__value" style={{ color: '#38bdf8' }}>
            ₹{metrics.totalPipelineValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="stat-card__footer">Total potential revenue from buildable kits</div>
        </div>
      </div>

      {/* Assembly Cards Grid */}
      {loading ? (
        <LoadingSkeleton />
      ) : assemblies.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconLayers size={36} />}
            title="No Bill of Materials (BOM) Recipes Found"
            description="Create multi-component assembly recipes to bundle items, track component stock levels, and execute one-click production assembly runs."
            action={
              <div className="flex-center gap-8">
                {products.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleSeedDefaults}
                    disabled={submitting}
                  >
                    ⚡ Initialize Starter Kits
                  </button>
                )}
                {canAssemble && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    <IconPlus size={14} /> Create First BOM Recipe
                  </button>
                )}
              </div>
            }
          />
        </div>
      ) : (
        <div className="assemblies-grid">
          {assemblies.map((bom) => {
            const canBuild = bom.canAssembleQty > 0;
            const margin =
              bom.totalComponentCost && bom.totalComponentCost > 0
                ? Math.round(((bom.sellingPrice - bom.totalComponentCost) / bom.sellingPrice) * 100)
                : 0;

            return (
              <div key={bom.id} className="assembly-card">
                {/* Header */}
                <div className="assembly-card__header">
                  <div>
                    <div className="assembly-card__category">{bom.category}</div>
                    <div className="assembly-card__title">{bom.name}</div>
                    <div className="assembly-card__sku">
                      SKU: <strong>{bom.sku}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div className="assembly-card__price">
                      ₹{bom.sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    {canAssemble && (
                      <button
                        type="button"
                        onClick={() => handleDelete(bom)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-tertiary)',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                        title="Delete BOM Recipe"
                      >
                        <IconTrash size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Description */}
                {bom.description && (
                  <div className="assembly-card__desc" style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    {bom.description}
                  </div>
                )}

                {/* Assembly Capacity Gauge */}
                <div className="assembly-capacity-strip">
                  <div>
                    <div className="assembly-capacity-label">Current Assembly Capacity</div>
                    <div
                      className={`assembly-capacity-val ${
                        canBuild ? 'color-success' : 'color-danger'
                      }`}
                    >
                      {canBuild
                        ? `⚡ ${bom.canAssembleQty} Kits Ready to Build`
                        : '⚠️ Out of Component Stock'}
                    </div>
                  </div>

                  {canAssemble && canBuild && (
                    <button
                      type="button"
                      className="btn btn-success btn-sm"
                      onClick={() => {
                        setBuildTarget(bom);
                        setBuildQty(1);
                      }}
                    >
                      <IconCheck size={14} /> Build Assembly
                    </button>
                  )}
                </div>

                {/* Component Breakdown Checklist */}
                <div className="components-table-wrap">
                  <div className="components-table-title">
                    Bill of Materials Components ({bom.components?.length || 0} items)
                  </div>
                  <table className="components-table">
                    <thead>
                      <tr>
                        <th>Required Product</th>
                        <th>Req. Qty</th>
                        <th>Godown Stock</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bom.components?.map((comp, idx) => {
                        const hasEnough = (comp.currentStock ?? 0) >= comp.qtyRequired;
                        return (
                          <tr key={idx}>
                            <td>
                              <div className="comp-name">{comp.productName}</div>
                              <div className="comp-sku">{comp.productSku}</div>
                            </td>
                            <td className="fw-700">{comp.qtyRequired}x</td>
                            <td
                              style={{
                                color: hasEnough ? 'var(--text-primary)' : 'var(--danger)',
                                fontWeight: 600,
                              }}
                            >
                              {comp.currentStock ?? 0} units
                            </td>
                            <td>
                              {hasEnough ? (
                                <span className="badge badge-success fs-10">Available</span>
                              ) : (
                                <span className="badge badge-danger fs-10">Shortage</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer Cost & Margin */}
                <div className="assembly-card__footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: 'var(--text-tertiary)' }}>
                  <div>
                    Cost: ₹{bom.totalComponentCost?.toLocaleString('en-IN') || '—'}
                  </div>
                  {margin > 0 && (
                    <div style={{ color: 'var(--success)', fontWeight: 600 }}>
                      Gross Margin: {margin}%
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE NEW BOM RECIPE */}
      {/* ========================================================= */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 className="modal-title">Create Bill of Materials (BOM) Recipe</h2>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setIsCreateModalOpen(false)}
              >
                <IconX size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Assembly / Bundle Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={recipeForm.name}
                    onChange={(e) => setRecipeForm({ ...recipeForm, name: e.target.value })}
                    placeholder="e.g. Executive 4K Workstation Kit"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Assembly SKU *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={recipeForm.sku}
                    onChange={(e) => setRecipeForm({ ...recipeForm, sku: e.target.value.toUpperCase() })}
                    placeholder="e.g. KIT-EXEC-4K"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input
                    type="text"
                    className="form-input"
                    value={recipeForm.category}
                    onChange={(e) => setRecipeForm({ ...recipeForm, category: e.target.value })}
                    placeholder="e.g. Workstation Bundles"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    value={recipeForm.sellingPrice}
                    onChange={(e) => setRecipeForm({ ...recipeForm, sellingPrice: e.target.value })}
                    placeholder="e.g. 79999.00"
                    required
                  />
                </div>

                <div className="form-group form-col-2">
                  <label className="form-label">Description (Optional)</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    value={recipeForm.description}
                    onChange={(e) => setRecipeForm({ ...recipeForm, description: e.target.value })}
                    placeholder="Describe what components make up this assembly recipe..."
                  />
                </div>
              </div>

              {/* Component Selector */}
              <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label className="form-label" style={{ marginBottom: 0, fontWeight: 700 }}>
                    Required Components *
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleAddComponent}
                  >
                    <IconPlus size={13} /> Add Component
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recipeForm.components.map((comp, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select
                        className="form-input"
                        style={{ flex: 1 }}
                        value={comp.productId}
                        onChange={(e) => handleComponentChange(idx, 'productId', e.target.value)}
                        required
                      >
                        <option value="">-- Select Product Component --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku}) — Stock: {p.currentStock} units | ₹{p.unitPrice}
                          </option>
                        ))}
                      </select>

                      <div style={{ width: '110px' }}>
                        <input
                          type="number"
                          min="1"
                          className="form-input"
                          value={comp.qtyRequired}
                          onChange={(e) =>
                            handleComponentChange(idx, 'qtyRequired', Number(e.target.value))
                          }
                          placeholder="Qty"
                          title="Quantity Required per Assembly"
                          required
                        />
                      </div>

                      {recipeForm.components.length > 1 && (
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => handleRemoveComponent(idx)}
                          style={{ color: 'var(--danger)' }}
                          title="Remove Component"
                        >
                          <IconTrash size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating Recipe...' : 'Create BOM Recipe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: BUILD PRODUCTION ASSEMBLY */}
      {/* ========================================================= */}
      {buildTarget && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Execute Production Assembly Build</h2>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setBuildTarget(null)}
              >
                <IconX size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)' }}>
                  {buildTarget.name}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  SKU: {buildTarget.sku} • Selling Price: ₹
                  {buildTarget.sellingPrice.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">How many units do you want to build?</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="number"
                    min="1"
                    max={buildTarget.canAssembleQty}
                    className="form-input"
                    value={buildQty}
                    onChange={(e) =>
                      setBuildQty(
                        Math.max(1, Math.min(Number(e.target.value), buildTarget.canAssembleQty))
                      )
                    }
                    style={{ width: '120px', fontWeight: 700, fontSize: '15px' }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    (Max buildable right now: <strong>{buildTarget.canAssembleQty} units</strong>)
                  </span>
                </div>
              </div>

              {/* Pre-Flight Component Deduction Checklist */}
              <div
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                }}
              >
                <div
                  style={{
                    fontSize: '11.5px',
                    color: 'var(--text-tertiary)',
                    fontWeight: 700,
                    marginBottom: '6px',
                  }}
                >
                  Component Inventory to be Deducted:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {buildTarget.components?.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '11.5px',
                      }}
                    >
                      <span style={{ color: 'var(--text-secondary)' }}>• {c.productName}:</span>
                      <strong style={{ color: 'var(--danger)' }}>
                        -{c.qtyRequired * buildQty} units (Leaves{' '}
                        {(c.currentStock ?? 0) - c.qtyRequired * buildQty} in godown)
                      </strong>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  fontSize: '11.5px',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'rgba(56, 189, 248, 0.1)',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                }}
              >
                ℹ️ Clicking <strong>Authorize & Execute Build</strong> will run an atomic transaction, deduct all component physical stock, and create stock movement audit records.
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setBuildTarget(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleExecuteBuild}
                  disabled={submitting}
                >
                  {submitting ? 'Executing Build...' : `Authorize & Build ${buildQty}x Kit`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionAssemblies;
