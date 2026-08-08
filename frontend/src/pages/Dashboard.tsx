import React, { useEffect, useState } from 'react';
import { customerService } from '../services/customer.service';
import { productService } from '../services/product.service';
import { challanService } from '../services/challan.service';
import { handleApiError } from '../services/api';
import { useAuth } from '../hooks/useAuth';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
  const [stats, setStats] = useState({
    customers: 0,
    products: 0,
    lowStock: 0,
    challans: 0,
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch paginated requests with limit 1 to retrieve total counts from pagination response headers/headers payload
        const [custRes, prodRes, lowRes, challanRes] = await Promise.all([
          customerService.getCustomers({ limit: 1 }),
          productService.getProducts({ limit: 1 }),
          productService.getProducts({ limit: 1, lowStock: true }),
          challanService.getChallans({ limit: 1 }),
        ]);

        setStats({
          customers: custRes.pagination?.total || 0,
          products: prodRes.pagination?.total || 0,
          lowStock: lowRes.pagination?.total || 0,
          challans: challanRes.pagination?.total || 0,
        });
      } catch (err) {
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner"></div>
        <p>Loading dashboard metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" style={{ margin: '32px' }}>
        <strong>Error:</strong> {error}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Welcome back, {user?.name}!</h1>
      </div>

      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Operations Overview — Role: <strong>{user?.role}</strong>
      </p>

      <div className="dashboard-grid">
        <div className="stat-card">
          <span className="stat-title">Total Customers</span>
          <span className="stat-value">{stats.customers}</span>
        </div>

        <div className="stat-card">
          <span className="stat-title">Total Products</span>
          <span className="stat-value">{stats.products}</span>
        </div>

        <div className={`stat-card ${stats.lowStock > 0 ? 'warning' : ''}`}>
          <span className="stat-title">Low Stock Alerts</span>
          <span className="stat-value" style={{ color: stats.lowStock > 0 ? 'var(--warning)' : 'inherit' }}>
            {stats.lowStock}
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-title">Total Challans</span>
          <span className="stat-value">{stats.challans}</span>
        </div>
      </div>

      <div className="card" style={{ marginTop: '24px' }}>
        <h3 className="card-title">System Information</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          This operations portal is connected to the cloud PostgreSQL database. Business authorization constraints are enforced strictly at the database border. Use the navigation sidebar on the left to start processing customer, product inventory, or delivery challan workflows.
        </p>
      </div>
    </div>
  );
};
export default Dashboard;
