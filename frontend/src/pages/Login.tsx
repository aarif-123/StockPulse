import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/auth.service';
import { handleApiError } from '../services/api';
import { IconEye, IconEyeOff } from '../components/common/Icons';

export const Login: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const registerParam = searchParams.get('register') === 'true';
  const [isRegister, setIsRegister] = useState(registerParam);

  // Authentication Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Registration Fields
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [slug, setSlug] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsRegister(searchParams.get('register') === 'true');
  }, [searchParams]);

  useEffect(() => {
    if (isAuthenticated && !loading) {
      const pendingPlanId = sessionStorage.getItem('pendingPlanId');
      const pendingBillingCycle = sessionStorage.getItem('pendingBillingCycle') || 'YEARLY';
      if (pendingPlanId) {
        sessionStorage.removeItem('pendingPlanId');
        sessionStorage.removeItem('pendingBillingCycle');
        navigate(`/org/billing?planId=${pendingPlanId}&billingCycle=${pendingBillingCycle}`, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, navigate, loading]);

  const handleBusinessNameChange = (val: string) => {
    setBusinessName(val);
    const generatedSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setSlug(generatedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isRegister) {
      if (!name.trim() || !email.trim() || !password || !businessName.trim() || !slug.trim()) {
        setError('Please fill in all fields.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (!/^[a-z0-9-]+$/.test(slug)) {
        setError('Slug must be lowercase alphanumeric with hyphens.');
        return;
      }

      setLoading(true);
      try {
        const response = await authService.register({
          name: name.trim(),
          email: email.trim(),
          password,
          organizationName: businessName.trim(),
          organizationSlug: slug.trim(),
        });

        login(response.token, response.user, [
          {
            organizationId: response.organization.id,
            organizationName: response.organization.name,
            organizationSlug: response.organization.slug,
            role: 'ORG_ADMIN',
            status: 'ACTIVE',
          },
        ]);
      } catch (err) {
        setError(handleApiError(err));
        setLoading(false);
      }
    } else {
      if (!email.trim() || !password) {
        setError('Please fill in all fields.');
        return;
      }

      setLoading(true);
      try {
        const response = await authService.login(email.trim(), password);
        login(response.token, response.user, response.organizations);
      } catch (err) {
        setError(handleApiError(err));
        setLoading(false);
      }
    }
  };

  const handleFillDemo = (demoEmail: string, demoPass: string = 'Admin@123') => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: isRegister ? '440px' : '400px' }}>
        <div className="login-header">
          <div className="login-logo">S</div>
          <h1 className="login-title">{isRegister ? 'Register Workspace' : 'StockPulse'}</h1>
          <p className="login-subtitle">
            {isRegister
              ? 'Launch your dedicated inventory & CRM hub'
              : 'Intelligent Multi-Tenant B2B SaaS Platform'}
          </p>
        </div>

        {error && <div className="alert alert-danger mb-16">{error}</div>}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="name">
                  Full Name
                </label>
                <input
                  className="form-input"
                  type="text"
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aarif Khan"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="businessName">
                  Business / Company Name
                </label>
                <input
                  className="form-input"
                  type="text"
                  id="businessName"
                  required
                  value={businessName}
                  onChange={(e) => handleBusinessNameChange(e.target.value)}
                  placeholder="e.g. Apex Industrial Supplies"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="slug">
                  Workspace URL Identifier (Slug)
                </label>
                <input
                  className="form-input"
                  type="text"
                  id="slug"
                  required
                  pattern="^[a-z0-9-]+$"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  placeholder="e.g. apex-supplies"
                  disabled={loading}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
                <span className="fs-11 color-tertiary" style={{ marginTop: '4px', display: 'block' }}>
                  Your team will access via StockPulse slug link.
                </span>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <input
              className="form-input"
              type="email"
              id="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <div className="form-input-wrapper">
              <input
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegister ? 'At least 6 characters' : 'Enter your password'}
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((p) => !p)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '14px', padding: '11px', fontSize: '14px' }}
            disabled={loading}
          >
            {loading
              ? isRegister
                ? 'Creating Workspace…'
                : 'Signing in…'
              : isRegister
              ? 'Create Workspace & Get Started'
              : 'Sign in to Workspace'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13.5px' }}>
          {isRegister ? (
            <>
              Already have a workspace?{' '}
              <span
                onClick={() => {
                  setIsRegister(false);
                  setError(null);
                  navigate('/login', { replace: true });
                }}
                style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
              >
                Sign In
              </span>
            </>
          ) : (
            <>
              Need a new workspace?{' '}
              <span
                onClick={() => {
                  setIsRegister(true);
                  setError(null);
                  navigate('/login?register=true', { replace: true });
                }}
                style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
              >
                Sign Up / Register
              </span>
            </>
          )}
        </div>

        {/* Demo Fast-Login Helpers (only shown in Login mode) */}
        {!isRegister && (
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
            <div
              className="fs-11 color-tertiary fw-600 mb-8"
              style={{ textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}
            >
              Quick Demo Credentials
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleFillDemo('superadmin@stockpulse.io')}
                style={{ fontSize: '11px', padding: '6px 8px', borderColor: '#f59e0b', color: '#b45309' }}
              >
                👑 Platform Super Admin
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleFillDemo('admin@example.com')}
                style={{ fontSize: '11px', padding: '6px 8px' }}
              >
                🏢 Org Admin (Apex)
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleFillDemo('sales@example.com')}
                style={{ fontSize: '11px', padding: '6px 8px' }}
              >
                💼 Sales Rep
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleFillDemo('warehouse@example.com')}
                style={{ fontSize: '11px', padding: '6px 8px' }}
              >
                📦 Warehouse Manager
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
