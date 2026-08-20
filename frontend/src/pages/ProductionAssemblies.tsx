import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { productService } from '../services/product.service';
import { handleApiError } from '../services/api';
import type { Product } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/common/ToastContainer';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { PageHeader } from '../components/common/PageHeader';
import {
  IconLayers, IconPackage, IconShoppingCart,
  IconCheck, IconIndianRupee,
} from '../components/common/Icons';

interface BOMRecipe {
  id: string;
  bundleName: string;
  sku: string;
  category: string;
  sellingPrice: number;
  components: {
    productSku: string;
    productName: string;
    qtyRequired: number;
  }[];
}

const DEFAULT_BOM_BUNDLES: BOMRecipe[] = [
  {
    id: 'BOM-001',
    bundleName: 'Executive 4K Dual-Screen Workstation Kit',
    sku: 'KIT-EXEC-4K',
    category: 'Workstation Bundles',
    sellingPrice: 79999.00,
    components: [
      { productSku: 'DEL-U2723-4K', productName: 'Dell UltraSharp 27" 4K Monitor', qtyRequired: 1 },
      { productSku: 'LOG-MX3S-001', productName: 'Logitech MX Master 3S Wireless Mouse', qtyRequired: 1 },
      { productSku: 'SAM-990P-2TB', productName: 'Samsung 990 PRO 2TB NVMe SSD', qtyRequired: 1 },
    ],
  },
  {
    id: 'BOM-002',
    bundleName: 'Enterprise Network Core Setup (24-Port + Fast Storage)',
    sku: 'KIT-NET-CORE',
    category: 'Networking Kits',
    sellingPrice: 72500.00,
    components: [
      { productSku: 'CIS-C1000-24T', productName: 'Cisco Catalyst 1000 Series 24-Port Switch', qtyRequired: 1 },
      { productSku: 'SAM-990P-2TB', productName: 'Samsung 990 PRO 2TB NVMe SSD', qtyRequired: 2 },
    ],
  },
  {
    id: 'BOM-003',
    bundleName: 'Commercial Cloud Productivity Package (10 Seats)',
    sku: 'KIT-CLOUD-10',
    category: 'Software Bundles',
    sellingPrice: 109900.00,
    components: [
      { productSku: 'MS-365-BUS-01', productName: 'Microsoft 365 Business Standard (1-Year)', qtyRequired: 10 },
      { productSku: 'LOG-MX3S-001', productName: 'Logitech MX Master 3S Wireless Mouse', qtyRequired: 5 },
    ],
  },
];

export const ProductionAssemblies: React.FC = () => {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const { toasts, toast, removeToast } = useToast();
  const canAssemble = hasRole(['ORG_ADMIN', 'ADMIN', 'WAREHOUSE']);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await productService.getProducts({ limit: 100 });
      setProducts(res.data);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCatalog();
  }, [fetchCatalog]);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.sku, p));
    return map;
  }, [products]);

  const assembliesData = useMemo(() => {
    return DEFAULT_BOM_BUNDLES.map((bom) => {
      let maxCanBuild = Infinity;
      let bottleneckSku = '';
      let bottleneckAvailable = 0;
      let bottleneckRequired = 1;

      const detailedComponents = bom.components.map((comp) => {
        const prod = productMap.get(comp.productSku);
        const onHand = prod ? prod.currentStock : 0;
        const possibleUnits = Math.floor(onHand / comp.qtyRequired);

        if (possibleUnits < maxCanBuild) {
          maxCanBuild = possibleUnits;
          bottleneckSku = comp.productSku;
          bottleneckAvailable = onHand;
          bottleneckRequired = comp.qtyRequired;
        }

        return {
          ...comp,
          product: prod,
          onHand,
          possibleUnits,
        };
      });

      if (maxCanBuild === Infinity) maxCanBuild = 0;

      return {
        ...bom,
        detailedComponents,
        canAssembleQty: maxCanBuild,
        bottleneck: {
          sku: bottleneckSku,
          available: bottleneckAvailable,
          required: bottleneckRequired,
        },
      };
    });
  }, [productMap]);

  const [building, setBuilding] = useState<string | null>(null);

  const handleBuildAssembly = async (bom: (typeof assembliesData)[0]) => {
    if (bom.canAssembleQty <= 0) {
      toast.warning(`Cannot assemble kit: Missing components (Bottleneck: ${bom.bottleneck.sku}).`);
      return;
    }

    setBuilding(bom.id);
    try {
      // Deduct each component from warehouse stock
      for (const comp of bom.detailedComponents) {
        if (!comp.product) continue;
        await productService.createStockMovement(comp.product.id, {
          type: 'OUT',
          quantity: comp.qtyRequired,
          reason: `Production BOM Assembly: 1x "${bom.bundleName}" (${bom.sku})`,
        });
      }

      toast.success(`Successfully built 1x "${bom.bundleName}". Component stocks deducted.`);
      void fetchCatalog();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setBuilding(null);
    }
  };

  return (
    <div>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      <PageHeader
        title="Production Assemblies & Bill of Materials (BOM)"
        subtitle="Manage product kit recipes, evaluate 'Can Assemble' capacity in real-time, and detect component bottlenecks."
        actions={
          <div className="flex-center gap-8">
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/reorder')}>
              <IconShoppingCart size={14} /> Component Reorder Hub
            </button>
          </div>
        }
      />

      {/* Assembly KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__label">Active BOM Recipes</span>
            <div className="stat-card__icon stat-card__icon--purple">
              <IconLayers size={18} />
            </div>
          </div>
          <div className="stat-card__value">{DEFAULT_BOM_BUNDLES.length} Kits</div>
          <div className="stat-card__footer">Multi-component bundle assemblies</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__label">Total Buildable Bundles</span>
            <div className="stat-card__icon stat-card__icon--green">
              <IconPackage size={18} />
            </div>
          </div>
          <div className="stat-card__value color-success">
            {assembliesData.reduce((sum, b) => sum + b.canAssembleQty, 0)} Units
          </div>
          <div className="stat-card__footer">Ready for immediate assembly</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__label">Assembly Pipeline Value</span>
            <div className="stat-card__icon stat-card__icon--blue">
              <IconIndianRupee size={18} />
            </div>
          </div>
          <div className="stat-card__value">
            ₹{assembliesData.reduce((sum, b) => sum + (b.canAssembleQty * b.sellingPrice), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="stat-card__footer">Finished goods market valuation</div>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-16">{error}</div>}

      {loading ? (
        <LoadingSkeleton variant="card" count={3} />
      ) : (
        <div className="flex-col gap-20">
          {assembliesData.map((bom) => (
            <div key={bom.id} className="assembly-card">
              <div className="flex-between mb-16 flex-wrap gap-12">
                <div>
                  <div className="flex-center gap-8 mb-4">
                    <span className="badge badge-info text-mono">{bom.sku}</span>
                    <h3 className="fs-16 fw-700 color-primary m-0">
                      {bom.bundleName}
                    </h3>
                  </div>
                  <div className="fs-12 color-tertiary">
                    Category: {bom.category} · Bundle Price: <span className="text-mono fw-700 color-primary">₹{bom.sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* "Can Assemble" Capacity Gauge */}
                <div className="flex-center gap-12">
                  <div className="text-right">
                    <div className="fs-11 color-tertiary uppercase">
                      Can Assemble Right Now
                    </div>
                    <div className={`assembly-capacity-val ${bom.canAssembleQty > 0 ? 'color-success' : 'color-danger'}`}>
                      {bom.canAssembleQty} Units
                    </div>
                  </div>

                  {canAssemble && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={bom.canAssembleQty <= 0 || building === bom.id}
                      onClick={() => handleBuildAssembly(bom)}
                    >
                      <IconCheck size={14} /> {building === bom.id ? 'Building...' : 'Build Assembly (1x)'}
                    </button>
                  )}
                </div>
              </div>

              {/* Components Breakdown Table */}
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Component SKU</th>
                      <th>Component Name</th>
                      <th className="text-right">Qty Per Kit</th>
                      <th className="text-right">On-Hand Stock</th>
                      <th className="text-right">Buildable Capacity</th>
                      <th className="text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bom.detailedComponents.map((comp) => {
                      const isBottleneck = comp.possibleUnits === bom.canAssembleQty;

                      return (
                        <tr key={comp.productSku} className={isBottleneck ? 'bg-primary-subtle' : ''}>
                          <td className="text-mono fw-600 color-primary">{comp.productSku}</td>
                          <td>
                            {comp.product ? (
                              <Link to={`/products/${comp.product.id}`} className="color-primary fw-600">
                                {comp.productName}
                              </Link>
                            ) : (
                              <span>{comp.productName}</span>
                            )}
                          </td>
                          <td className="text-right text-mono">{comp.qtyRequired}x</td>
                          <td className="text-right text-mono fw-700">{comp.onHand} units</td>
                          <td className="text-right text-mono fw-700 color-primary">{comp.possibleUnits} kits</td>
                          <td className="text-right">
                            {isBottleneck ? (
                              <span className="badge badge-warning">
                                ⚠️ Production Bottleneck
                              </span>
                            ) : (
                              <span className="badge badge-success">
                                ✓ Sufficient
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductionAssemblies;
