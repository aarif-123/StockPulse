import React, { useState, useEffect, useCallback } from 'react';
import { api, handleApiError } from '../../services/api';
import type { Plan } from '../../types';

export const PlatformPlans: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal State for Create/Edit Plan
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    code: '',
    description: '',
    monthlyPriceINR: 0,
    yearlyPriceINR: 0,
    maxUsers: 5,
    maxProducts: 1000,
    maxCustomers: 500,
    maxWarehouses: 2,
    maxTransactions: 2000,
    allowedFeatures: ['CORE_ERP', 'CRM', 'CHALLANS', 'BASIC_REPORTS'],
    isActive: true,
  });

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/platform/plans');
      setPlans(res.data.data || []);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPlans();
  }, [fetchPlans]);

  const handleOpenCreateModal = () => {
    setEditingPlanId(null);
    setPlanForm({
      name: '',
      code: '',
      description: '',
      monthlyPriceINR: 999,
      yearlyPriceINR: 9999,
      maxUsers: 5,
      maxProducts: 1000,
      maxCustomers: 500,
      maxWarehouses: 2,
      maxTransactions: 2000,
      allowedFeatures: ['CORE_ERP', 'CRM', 'CHALLANS', 'BASIC_REPORTS'],
      isActive: true,
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (p: Plan) => {
    setEditingPlanId(p.id);
    setPlanForm({
      name: p.name,
      code: p.code,
      description: p.description || '',
      monthlyPriceINR: Number(p.monthlyPriceINR),
      yearlyPriceINR: Number(p.yearlyPriceINR),
      maxUsers: p.maxUsers,
      maxProducts: p.maxProducts,
      maxCustomers: p.maxCustomers,
      maxWarehouses: p.maxWarehouses,
      maxTransactions: p.maxTransactions,
      allowedFeatures: p.allowedFeatures || [],
      isActive: p.isActive,
    });
    setShowModal(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingPlanId) {
        await api.put(`/platform/plans/${editingPlanId}`, planForm);
        setActionSuccess(`Plan '${planForm.name}' updated successfully.`);
      } else {
        await api.post('/platform/plans', planForm);
        setActionSuccess(`Plan '${planForm.name}' created successfully.`);
      }
      setShowModal(false);
      void fetchPlans();
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  return (
    <div>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.4px' }}>
            📦 Commercial Plan Matrix & Feature Entitlements
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>
            Define tier pricing, usage capacity limits (users, SKUs, transactions), and feature flags for customer accounts.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          style={{
            padding: '9px 18px',
            backgroundColor: '#f59e0b',
            color: '#000000',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '13.5px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
          }}
        >
          + Create New Plan Tier
        </button>
      </div>

      {actionSuccess && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', borderRadius: '8px', marginBottom: '20px', fontSize: '13.5px', fontWeight: 600 }}>
          ✓ {actionSuccess}
        </div>
      )}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '8px', marginBottom: '20px', fontSize: '13.5px', fontWeight: 600 }}>
          ✕ {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', backgroundColor: '#1e293b', borderRadius: '12px' }}>
          <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
          Loading commercial plans matrix...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {plans.map((p) => (
            <div
              key={p.id}
              style={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>{p.name}</h3>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: p.isActive ? 'rgba(34,197,94,0.15)' : 'rgba(100,116,139,0.2)',
                      color: p.isActive ? '#4ade80' : '#94a3b8',
                    }}
                  >
                    {p.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>

                <div style={{ color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace', marginBottom: '16px' }}>
                  code: {p.code}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b', fontFamily: 'monospace' }}>
                    ₹{Number(p.monthlyPriceINR).toLocaleString()}
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>/ month</span>
                  <span style={{ color: '#64748b', fontSize: '12px', marginLeft: 'auto' }}>
                    (₹{Number(p.yearlyPriceINR).toLocaleString()} / yr)
                  </span>
                </div>

                <p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: 1.4, marginBottom: '20px' }}>
                  {p.description || 'Commercial plan tier with customizable feature flags and resource thresholds.'}
                </p>

                <div style={{ backgroundColor: '#0f172a', borderRadius: '8px', padding: '14px', marginBottom: '20px' }}>
                  <div style={{ color: '#f8fafc', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '10px' }}>
                    Capacity Entitlements
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12.5px', color: '#cbd5e1' }}>
                    <div>👥 Max Users: <strong>{p.maxUsers}</strong></div>
                    <div>📦 Max SKUs: <strong>{p.maxProducts}</strong></div>
                    <div>🤝 Max Clients: <strong>{p.maxCustomers}</strong></div>
                    <div>🏢 Warehouses: <strong>{p.maxWarehouses}</strong></div>
                    <div>🧾 Transactions: <strong>{p.maxTransactions}</strong></div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleOpenEditModal(p)}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Configure & Edit Plan limits
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Plan Modal (Create or Edit) */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', width: '100%', maxWidth: '560px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#f8fafc', fontWeight: 800 }}>
              {editingPlanId ? 'Configure Commercial Plan Tier' : 'Create New Commercial Plan Tier'}
            </h2>

            <form onSubmit={handleSavePlan}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px', fontWeight: 600 }}>Plan Name *</label>
                  <input
                    type="text"
                    required
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    placeholder="e.g. Enterprise Plus"
                    style={{ width: '100%', padding: '9px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px', fontWeight: 600 }}>Plan Code *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingPlanId}
                    value={planForm.code}
                    onChange={(e) => setPlanForm({ ...planForm, code: e.target.value })}
                    placeholder="e.g. enterprise_plus_v1"
                    style={{ width: '100%', padding: '9px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px', fontWeight: 600 }}>Description</label>
                <input
                  type="text"
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  placeholder="Short tier summary..."
                  style={{ width: '100%', padding: '9px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px', fontWeight: 600 }}>Monthly Price (INR) *</label>
                  <input
                    type="number"
                    required
                    value={planForm.monthlyPriceINR}
                    onChange={(e) => setPlanForm({ ...planForm, monthlyPriceINR: Number(e.target.value) })}
                    style={{ width: '100%', padding: '9px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px', fontWeight: 600 }}>Yearly Price (INR) *</label>
                  <input
                    type="number"
                    required
                    value={planForm.yearlyPriceINR}
                    onChange={(e) => setPlanForm({ ...planForm, yearlyPriceINR: Number(e.target.value) })}
                    style={{ width: '100%', padding: '9px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px', fontWeight: 600 }}>Max Users</label>
                  <input
                    type="number"
                    value={planForm.maxUsers}
                    onChange={(e) => setPlanForm({ ...planForm, maxUsers: Number(e.target.value) })}
                    style={{ width: '100%', padding: '9px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px', fontWeight: 600 }}>Max Products</label>
                  <input
                    type="number"
                    value={planForm.maxProducts}
                    onChange={(e) => setPlanForm({ ...planForm, maxProducts: Number(e.target.value) })}
                    style={{ width: '100%', padding: '9px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px', fontWeight: 600 }}>Max Customers</label>
                  <input
                    type="number"
                    value={planForm.maxCustomers}
                    onChange={(e) => setPlanForm({ ...planForm, maxCustomers: Number(e.target.value) })}
                    style={{ width: '100%', padding: '9px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '16px 0' }}>
                <input
                  type="checkbox"
                  id="isActive"
                  checked={planForm.isActive}
                  onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                />
                <label htmlFor="isActive" style={{ color: '#f8fafc', fontSize: '13px', fontWeight: 600 }}>
                  Active Plan Tier (Available for customer subscription)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '8px 16px', backgroundColor: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', backgroundColor: '#f59e0b', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Plan Tier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformPlans;
