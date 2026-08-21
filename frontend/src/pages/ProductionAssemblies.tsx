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
import { Pagination } from '../components/common/Pagination';
import {
  IconLayers,
  IconPlus,
  IconCheck,
  IconIndianRupee,
  IconTrash,
  IconX,
  IconSearch,
} from '../components/common/Icons';

export const ProductionAssemblies: React.FC = () => {
  const { hasRole, user, activeOrg } = useAuth();
  const { toasts, toast, removeToast } = useToast();
  const canAssemble = hasRole(['ORG_ADMIN', 'ADMIN', 'WAREHOUSE']);
  const canManageRecipes = hasRole(['ORG_ADMIN', 'ADMIN']);
  const currentRole = activeOrg?.role || user?.role || 'SALES';
  const isWarehouse = currentRole === 'WAREHOUSE';

  const [assemblies, setAssemblies] = useState<BomAssembly[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(() => {
    const saved = localStorage.getItem('stockpulse_assemblies_page_size');
    return saved ? Math.min(Math.max(parseInt(saved, 10) || 10, 5), 100) : 10;
  });

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
    localStorage.setItem('stockpulse_assemblies_page_size', String(newSize));
  };

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

  // Unique Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    assemblies.forEach((a) => {
      if (a.category) set.add(a.category);
    });
    return Array.from(set);
  }, [assemblies]);

  // Filtered Assemblies
  const filteredAssemblies = useMemo(() => {
    return assemblies.filter((bom) => {
      const matchesSearch =
        !searchTerm.trim() ||
        bom.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bom.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bom.description && bom.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCat =
        selectedCategory === 'ALL' || bom.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [assemblies, searchTerm, selectedCategory]);

  const totalItems = filteredAssemblies.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedAssemblies = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAssemblies.slice(start, start + pageSize);
  }, [filteredAssemblies, page, pageSize]);

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
        description: 'Complete productivity bundle with dual monitors and high-speed NVMe storage cache.',
        sellingPrice: Number(p1.unitPrice || 1000) + Number(p2.unitPrice || 500) + 1500,
        components: [
          { productId: p1.id, qtyRequired: 1 },
          { productId: p2.id, qtyRequired: 2 },
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
    <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      <PageHeader
        title="Production Assemblies & Bill of Materials"
        subtitle="Manage multi-component manufacturing kits, live component godown capacity, and atomic assembly build runs."
        actions={
          <div className="flex-center gap-8">
            {products.length > 0 && assemblies.length === 0 && canManageRecipes && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleSeedDefaults}
                disabled={submitting}
              >
                ⚡ Initialize Starter Kits
              </button>
            )}
            {canManageRecipes && (
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
          <div className="stat-card__footer">{metrics.totalComponentsMapped} component items mapped</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__label">Ready to Assemble</span>
            <div className="stat-card__icon stat-card__icon--green">
              <IconCheck size={18} />
            </div>
          </div>
          <div className="stat-card__value" style={{ color: '#10b981' }}>
            {metrics.readyToBuild}
          </div>
          <div className="stat-card__footer">Assemblies with all components in godown</div>
        </div>

        {!isWarehouse && (
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
            <div className="stat-card__footer">Total potential revenue from buildable units</div>
          </div>
        )}
      </div>

      {/* Toolbar: Search and Category Filter */}
      {assemblies.length > 0 && (
        <div
          className="table-toolbar mb-20"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            padding: '10px 14px',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
              <IconSearch
                size={14}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)',
                }}
              />
              <input
                type="text"
                className="form-input form-input--sm"
                style={{ paddingLeft: '32px' }}
                placeholder="Search assembly recipe or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {categories.length > 1 && (
              <select
                className="form-input form-input--sm"
                style={{ width: 'auto' }}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="ALL">All Categories ({assemblies.length})</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Showing <strong>{filteredAssemblies.length}</strong> of{' '}
            <strong>{assemblies.length}</strong> recipes
          </div>
        </div>
      )}

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
                {canManageRecipes && (
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
        <div>
          <div className="assemblies-grid">
            {paginatedAssemblies.map((bom) => {
              const canBuild = bom.canAssembleQty > 0;
              const margin =
                bom.totalComponentCost && bom.totalComponentCost > 0
                  ? Math.round(((bom.sellingPrice - bom.totalComponentCost) / bom.sellingPrice) * 100)
                  : 0;

              return (
                <div key={bom.id} className="assembly-card">
                  {/* Header */}
                  <div className="assembly-card__header">
                    <div style={{ flex: 1 }}>
                      <div className="assembly-card__category">{bom.category}</div>
                      <div className="assembly-card__title">{bom.name}</div>
                      <div className="assembly-card__sku">
                        SKU: <strong>{bom.sku}</strong>
                      </div>
                    </div>

                    <div className="assembly-card__price-badge">
                      {!isWarehouse && (
                        <div className="assembly-card__price">
                          ₹{bom.sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      )}
                      {canManageRecipes && (
                        <button
                          type="button"
                          onClick={() => handleDelete(bom)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-tertiary)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            transition: 'color 0.15s ease',
                          }}
                          title="Delete BOM Recipe"
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                        >
                          <IconTrash size={13} /> Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {bom.description && (
                    <div className="assembly-card__desc">
                      {bom.description}
                    </div>
                  )}

                  {/* Assembly Capacity Gauge Strip */}
                  <div className="assembly-capacity-strip">
                    <div>
                      <div className="assembly-capacity-label">Current Assembly Capacity</div>
                      <div
                        className={`assembly-capacity-val ${
                          canBuild ? 'color-success' : 'color-danger'
                        }`}
                      >
                        {canBuild ? (
                          <>⚡ {bom.canAssembleQty} Kits Ready to Build</>
                        ) : (
                          <>⚠️ Component Shortage</>
                        )}
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
                        style={{ boxShadow: '0 0 12px rgba(16, 185, 129, 0.25)' }}
                      >
                        <IconCheck size={14} /> Build Assembly
                      </button>
                    )}
                  </div>

                  {/* Component Breakdown Checklist */}
                  <div className="components-table-wrap">
                    <div className="components-table-title">
                      Required Components ({bom.components?.length || 0} items)
                    </div>
                    <table className="components-table">
                      <thead>
                        <tr>
                          <th>Component Product</th>
                          <th style={{ textAlign: 'center' }}>Per Kit</th>
                          <th>Godown Stock</th>
                          <th style={{ textAlign: 'right' }}>Status</th>
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
                              <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {comp.qtyRequired}x
                              </td>
                              <td
                                style={{
                                  color: hasEnough ? 'var(--text-primary)' : 'var(--danger)',
                                  fontWeight: 600,
                                }}
                              >
                                {comp.currentStock ?? 0} units
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {hasEnough ? (
                                  <span
                                    className="badge badge-success fs-10"
                                    style={{
                                      background: 'rgba(16, 185, 129, 0.15)',
                                      color: '#34d399',
                                      border: '1px solid rgba(16, 185, 129, 0.3)',
                                    }}
                                  >
                                    In Stock
                                  </span>
                                ) : (
                                  <span
                                    className="badge badge-danger fs-10"
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.15)',
                                      color: '#f87171',
                                      border: '1px solid rgba(239, 68, 68, 0.3)',
                                    }}
                                  >
                                    Shortage
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer Cost & Margin */}
                  {!isWarehouse && (
                    <div className="assembly-card__footer">
                      <div>
                        Unit Component Cost:{' '}
                        <strong style={{ color: 'var(--text-primary)' }}>
                          ₹{bom.totalComponentCost?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '—'}
                        </strong>
                      </div>
                      {margin > 0 && (
                        <div
                          style={{
                            color: '#34d399',
                            fontWeight: 700,
                            background: 'rgba(16, 185, 129, 0.12)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                          }}
                        >
                          Gross Margin: {margin}%
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!loading && totalItems > 0 && (
            <div className="pagination-footer" style={{ marginTop: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
              <span>
                Showing {Math.min((page - 1) * pageSize + 1, totalItems)}–
                {Math.min(page * pageSize, totalItems)} of {totalItems} recipes
              </span>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                pageSizeOptions={[10, 25, 30, 50, 100]}
                totalItems={totalItems}
              />
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE NEW BOM RECIPE */}
      {/* ========================================================= */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
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
                  SKU: {buildTarget.sku}
                  {!isWarehouse && ` • Selling Price: ₹${buildTarget.sellingPrice.toLocaleString('en-IN')}`}
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
