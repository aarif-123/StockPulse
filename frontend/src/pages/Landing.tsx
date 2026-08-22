import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/common/ToastContainer';
import type { BillingCycleType, PlanTierType } from '../services/payment.service';
import {
  IconPackage,
  IconShield, IconCheck,
  IconTruck, IconDashboard,
  IconClipboardCheck,
  IconLayers,
} from '../components/common/Icons';

export type FaqCategoryType = 'ALL' | 'LICENSE' | 'PRICING' | 'GST' | 'WAREHOUSE';


// ─── Inline SVG Icons ────────────────────────────────────────────────────────

const IconZap: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

// ─── Main Landing Component ──────────────────────────────────────────────────

export const Landing: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toasts, toast, removeToast } = useToast();
  // Pricing state
  const [billingCycle, setBillingCycle] = useState<BillingCycleType>('MONTHLY');
  const [checkoutLoading] = useState<string | null>(null);

  // FAQ state (keyed by question string so category filtering never glitches)
  const [openFaqQuestion, setOpenFaqQuestion] = useState<string | null>(null);

  // Mobile nav state
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // FAQ Category Filter State
  const [faqCategory, setFaqCategory] = useState<FaqCategoryType>('ALL');

  const getBasicPrice = () => {
    switch (billingCycle) {
      case 'QUARTERLY':
        return { price: '₹399', period: '/ quarter', raw: 399, savingText: 'Save 11% vs monthly' };
      case 'YEARLY':
      case 'ANNUAL':
        return { price: '₹1,299', period: '/ year', raw: 1299, savingText: 'Save 27% · ₹108/mo effective' };
      case 'MONTHLY':
      default:
        return { price: '₹149', period: '/ month', raw: 149, savingText: 'Billed monthly (30-day term)' };
    }
  };

  const getPremiumPrice = () => {
    switch (billingCycle) {
      case 'QUARTERLY':
        return { price: '₹1,299', period: '/ quarter', raw: 1299, savingText: 'Save 13% vs monthly' };
      case 'YEARLY':
      case 'ANNUAL':
        return { price: '₹4,499', period: '/ year', raw: 4499, savingText: 'Save 25% · ₹375/mo effective' };
      case 'MONTHLY':
      default:
        return { price: '₹499', period: '/ month', raw: 499, savingText: 'Billed monthly (30-day term)' };
    }
  };

  const basicPrice = getBasicPrice();
  const premiumPrice = getPremiumPrice();

  const handlePlanCheckout = (planId: PlanTierType) => {
    const targetCycle = billingCycle === 'QUARTERLY' ? 'MONTHLY' : billingCycle;
    if (!user) {
      toast.info('Please create an account or sign in first to purchase a subscription.');
      sessionStorage.setItem('pendingPlanId', planId);
      sessionStorage.setItem('pendingBillingCycle', targetCycle);
      navigate('/login?register=true');
      return;
    }
    navigate(`/org/billing?planId=${planId}&billingCycle=${targetCycle}`);
  };

  const handleStartTrial = () => {
    if (!user) {
      toast.info('Please sign up or sign in to start your 7-day free trial.');
      navigate('/login?register=true');
      return;
    }
    navigate('/dashboard');
  };

  const faqItems: { q: string; a: string; cat: FaqCategoryType }[] = [
    {
      cat: 'LICENSE',
      q: 'How does the free trial and subscription work?',
      a: 'Create an account and get immediate access to the full platform. Your subscription is managed by your Organization Admin from the Billing & Subscriptions page. Plans are activated by submitting a UPI payment with a UTR reference, which the Platform Super Admin verifies and approves. Seat and quota limits are enforced automatically from the moment the plan activates.',
    },
    {
      cat: 'LICENSE',
      q: 'What happens when my plan quota is reached?',
      a: 'StockPulse enforces plan quotas at write time. If your plan allows 500 SKUs and you try to create a 501st, the API returns a clear error and the operation is blocked. Data is never lost — existing records are always readable. Upgrading your plan instantly raises the quota limits.',
    },
    {
      cat: 'LICENSE',
      q: 'How do I add team members and assign roles?',
      a: 'As the Organization Admin, go to Organization Settings → Team Members. Add a member by email and assign them one of four roles: ORG_ADMIN, SALES, WAREHOUSE, or ACCOUNTS. Each role has a distinct set of capability-based permissions enforced server-side on every API request. Members cannot access resources outside their role boundary.',
    },
    {
      cat: 'GST',
      q: 'How does StockPulse automatically resolve CGST, SGST, and IGST for Rule 55 Delivery Challans?',
      a: 'StockPulse parses the 2-digit state code from both your organization GSTIN (e.g. 27 for Maharashtra) and the customer GSTIN (e.g. 07 for Delhi). If state codes match, it automatically applies intra-state CGST (9%) + SGST (9%). If they differ, it applies inter-state IGST (18%). The correct tax split is displayed on the challan line item and summarized in the tax footer.',
    },
    {
      cat: 'WAREHOUSE',
      q: 'How do BOM Production Assemblies work?',
      a: 'Define a Bill of Materials recipe specifying which component SKUs and quantities are consumed to produce one unit of a finished good. When you trigger an assembly run, StockPulse deducts each component from stock and increments the finished SKU — all within a single database transaction, so partial assembly failures are impossible.',
    },
    {
      cat: 'WAREHOUSE',
      q: 'How does the Cycle-Count Stock Take work?',
      a: 'Navigate to the Stock Take page and enter physical counts for each SKU. StockPulse computes the variance between the physical count and the system quantity. On submission, it generates automatic stock adjustment entries (IN or OUT) to reconcile the system to reality, each stamped with the actor, timestamp, and reason code.',
    },
    {
      cat: 'PRICING',
      q: 'What payment method is used for plan activation?',
      a: 'Plans are activated through a manual UPI QR code payment flow. Your Organization Admin scans the QR, completes payment, and submits the UTR reference number in the Billing page. The Platform Super Admin reviews and approves the payment, activating the plan and its quotas. Annual plans and enterprise contracts can also be settled via NEFT/RTGS bank transfer.',
    },
    {
      cat: 'PRICING',
      q: 'Can we upgrade our plan mid-cycle?',
      a: 'Yes. Your Organization Admin can request a plan upgrade at any time from the Billing & Subscriptions page. Submit a new payment with the upgraded plan UTR, and the Platform Admin will approve it. New quota limits take effect immediately upon approval.',
    },
    {
      cat: 'GST',
      q: 'How does the customer financial ledger work?',
      a: 'Every confirmed challan automatically posts a SALE entry to the customer ledger with the taxable amount. Payments, credit notes, and debit notes can be added manually by the Accounts role. The ledger displays every transaction with a running debit/credit balance, which is also used to enforce the customer credit limit.',
    },
  ];

  const filteredFaqs = faqCategory === 'ALL'
    ? faqItems
    : faqItems.filter((item) => item.cat === faqCategory);

  return (
    <div className="landing-page">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* ── Announcement Bar ─────────────────────────────────────────────── */}
      <div className="landing-announcement" role="banner" aria-label="Platform feature highlights">
        <div className="landing-announcement-scroll">
          <IconShield size={13} aria-hidden="true" />
          <span>GST Rule 55 Delivery Challans</span>
          <span aria-hidden="true" style={{ opacity: 0.3 }}>·</span>
          <span>BOM Production Assemblies</span>
          <span aria-hidden="true" style={{ opacity: 0.3 }}>·</span>
          <span>4-Role Capability RBAC</span>
          <span aria-hidden="true" style={{ opacity: 0.3 }}>·</span>
          <span>ACID Inventory Transactions</span>
          <span aria-hidden="true" style={{ opacity: 0.3 }}>·</span>
          <span>Customer Financial Ledger</span>
        </div>
      </div>

      {/* ── Sticky Top Navigation ───────────────────────────────────────── */}
      <nav className="landing-navbar" role="navigation" aria-label="Main navigation">
        <div className="landing-nav-container">
          <Link to="/" className="landing-brand" aria-label="StockPulse home">
            <div className="logo-mark" aria-hidden="true">S</div>
            <span className="logo-text">StockPulse</span>
            <span className="landing-brand-badge">ENTERPRISE</span>
          </Link>

          <ul className="landing-nav-links" role="list">
            <li><a href="#workflow" className="landing-nav-link">Workflow</a></li>
            <li><a href="#modules" className="landing-nav-link">Industry Verticals</a></li>
            <li><a href="#pricing" className="landing-nav-link">Plans &amp; Pricing</a></li>
            <li><a href="#faqs" className="landing-nav-link">FAQs</a></li>
          </ul>

          <div className="landing-nav-actions">
            {user ? (
              <Link to="/dashboard" className="btn btn-primary btn-sm">
                Open Workspace →
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
                <button
                  type="button"
                  id="nav-get-started"
                  className="btn btn-primary btn-sm"
                  onClick={handleStartTrial}
                  disabled={checkoutLoading === 'TRIAL'}
                >
                  {checkoutLoading === 'TRIAL' ? 'Setting up…' : 'Start Free Trial'}
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="landing-mobile-menu-btn"
            aria-label="Toggle menu"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((v) => !v)}
          >
            <span /><span /><span />
          </button>
        </div>

        {/* Mobile nav drawer & backdrop */}
        {mobileNavOpen && (
          <>
            <div
              className="landing-mobile-nav-backdrop"
              onClick={() => setMobileNavOpen(false)}
              aria-hidden="true"
            />
            <div className="landing-mobile-nav" role="menu">
              <div className="flex-between mb-8 pb-8" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <span className="fs-12 fw-700 color-primary">NAVIGATION</span>
                <button
                  type="button"
                  className="btn-icon-xs color-secondary"
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Close Menu"
                >
                  ✕
                </button>
              </div>
              <a href="#modules" className="landing-mobile-nav-link" onClick={() => setMobileNavOpen(false)}>Industry Verticals</a>
              <a href="#pricing" className="landing-mobile-nav-link" onClick={() => setMobileNavOpen(false)}>Plans & Pricing</a>
              <a href="#faqs" className="landing-mobile-nav-link" onClick={() => setMobileNavOpen(false)}>FAQs</a>
              <div className="landing-mobile-nav-actions">
                <Link to="/login" className="btn btn-secondary btn-sm w-full justify-center" onClick={() => setMobileNavOpen(false)}>Sign In</Link>
                <button
                  type="button"
                  className="btn btn-primary btn-sm w-full justify-center"
                  onClick={() => { setMobileNavOpen(false); void handleStartTrial(); }}
                  disabled={checkoutLoading === 'TRIAL'}
                >
                  Start 7-Day Free Trial
                </button>
              </div>
            </div>
          </>
        )}
      </nav>

      {/* ── Hero Section with Real Dashboard Preview ────────────────────── */}
      <header className="landing-hero">
        <div className="landing-container">
          <div className="landing-hero-eyebrow">
            <span className="landing-eyebrow-pill">
              <IconShield size={11} aria-hidden="true" /> GST Rule 55 Compliant
            </span>
            <span className="landing-eyebrow-sep" aria-hidden="true">·</span>
            <span className="landing-eyebrow-pill" style={{ background: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.3)', color: '#6ee7b7' }}>
              <IconCheck size={11} aria-hidden="true" /> ACID Transactions
            </span>
            <span className="landing-eyebrow-sep" aria-hidden="true">·</span>
            <span className="landing-eyebrow-text">Multi-Tenant B2B Platform for India 🇮🇳</span>
          </div>

          <h1 className="landing-hero-title">
            GST Delivery Challans, Inventory Control &amp; Financial Ledgers — One Platform.
          </h1>

          <p className="landing-hero-subtitle">
            StockPulse unifies your customer CRM, multi-warehouse stock, statutory GST Rule 55 delivery challans,
            BOM production assemblies, and customer financial ledgers into one transaction-safe operations workspace.
          </p>

          <div className="landing-hero-cta" role="group" aria-label="Primary actions">
            <button
              type="button"
              id="hero-get-started"
              className="btn btn-primary btn-lg"
              onClick={handleStartTrial}
              disabled={checkoutLoading === 'TRIAL'}
            >
              <IconZap size={16} />
              {checkoutLoading === 'TRIAL' ? 'Setting up…' : 'Start Free Trial →'}
            </button>
            <a href="#pricing" id="hero-explore-platform" className="btn btn-secondary btn-lg">
              View Plans &amp; Pricing
            </a>
          </div>

          {/* Hero stats bar */}
          <div className="landing-hero-stats">
            <div className="landing-hero-stat">
              <div className="landing-hero-stat__value">ACID Transactions</div>
              <div className="landing-hero-stat__label">Zero inventory corruption</div>
            </div>
            <div className="landing-hero-stat-sep" aria-hidden="true" />
            <div className="landing-hero-stat">
              <div className="landing-hero-stat__value">GST Rule 55</div>
              <div className="landing-hero-stat__label">Statutory Delivery Challans</div>
            </div>
            <div className="landing-hero-stat-sep" aria-hidden="true" />
            <div className="landing-hero-stat">
              <div className="landing-hero-stat__value">4 RBAC Roles</div>
              <div className="landing-hero-stat__label">Admin · Sales · Warehouse · Accounts</div>
            </div>
            <div className="landing-hero-stat-sep" aria-hidden="true" />
            <div className="landing-hero-stat">
              <div className="landing-hero-stat__value">Multi-Tenant</div>
              <div className="landing-hero-stat__label">Strict org data isolation</div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content Area (Landmark for Accessibility & SEO) ────────── */}
      <main id="main-content">

        {/* ── SEO Industry Solutions & Verticals ──────────────────────────── */}
        <section id="modules" className="landing-section" aria-labelledby="industries-heading" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
          <div className="landing-container">
            <div className="landing-section-header" style={{ marginBottom: 28 }}>
              <div className="landing-section-tag">Industry-Tested Blueprints</div>
              <h2 id="industries-heading" className="landing-section-title">
                Engineered for High-Velocity Indian B2B Supply Chains
              </h2>
              <p className="landing-section-desc">
                Pre-configured operational workflows built specifically for distributors, manufacturers, and multi-depot wholesalers.
              </p>
            </div>

            <div className="verticals-grid">
              {[
                {
                  icon: <IconPackage size={16} />,
                  tag: '50,000+ SKU Depth',
                  metric: '⚡ Multi-Warehouse Reorder Triggers',
                  title: 'Hardware & Electricals',
                  desc: 'Real-time multi-depot stock visibility, min-safety reorder alerts, and automated GSTIN intra/inter-state delivery challans.',
                  chips: ['PVC & Wires', 'Rule 55 Challans', 'Multi-Depot Sync'],
                },
                {
                  icon: <IconTruck size={16} />,
                  tag: 'High Velocity',
                  metric: '⏱️ < 30s Fast Order Dispatch',
                  title: 'FMCG & Packaged Goods',
                  desc: 'Pessimistic row locking during dispatch, customer credit limit guardrails, and real-time running ledger per distributor.',
                  chips: ['Credit Limits', 'Atomic Locks', 'Instant UPI Ledger'],
                },
                {
                  icon: <IconLayers size={16} />,
                  tag: 'Serial & Batch Control',
                  metric: '🔍 Stock Drift < 0.1% Guaranteed',
                  title: 'Auto Parts & Spares',
                  desc: 'Warehouse barcode cycle takes with automated variance reconciliation, bin-location management, and fast inter-depot stock transfers.',
                  chips: ['Cycle Takes', 'Bin Locations', 'Inter-Hub Transfers'],
                },
                {
                  icon: <IconDashboard size={16} />,
                  tag: 'Atomic Production',
                  metric: '⚙️ Multi-Component Auto-Deduct',
                  title: 'Manufacturing & Assemblies',
                  desc: 'Define nested Bills of Materials (BOM). Atomic production runs deduct raw component batches and mint finished goods in one transaction.',
                  chips: ['Nested BOM', 'Atomic Batch Deduct', 'Production Runs'],
                },
                {
                  icon: <IconShield size={16} />,
                  tag: '4-Role RBAC',
                  metric: '🔒 100% Server-Side Authorization',
                  title: 'Electronics & IT Distribution',
                  desc: 'Strict segregation between Admin, Sales Reps, Warehouse Staff, and Accounts. Double-entry ledger with immutable audit trail logs.',
                  chips: ['4 Enforced Roles', 'Double-Entry Ledger', 'Audit Trail Logs'],
                },
                {
                  icon: <IconClipboardCheck size={16} />,
                  tag: 'Statutory GST Engine',
                  metric: '🇮🇳 CGST / SGST / IGST Auto-Resolved',
                  title: 'Chemicals, Paints & Raw Goods',
                  desc: 'Automated statutory GST Rule 55 compliance, sequential tax series numbering, delivery challan printing, and e-way bill matching.',
                  chips: ['Sequential Series', 'Statutory Declaration', 'E-Way Matching'],
                },
              ].map((v) => (
                <div key={v.title} className="vertical-card">
                  <div>
                    <div className="vertical-card__top">
                      <div className="vertical-card__icon-box">
                        {v.icon}
                      </div>
                      <span className="vertical-card__tag">{v.tag}</span>
                    </div>
                    <h3 className="vertical-card__title">{v.title}</h3>
                    <div className="vertical-card__metric">{v.metric}</div>
                    <p className="vertical-card__desc">{v.desc}</p>
                  </div>
                  <div className="vertical-card__chips">
                    {v.chips.map((c) => (
                      <span key={c} className="vertical-chip">
                        <span className="vertical-chip__dot" />
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* ── Modern Plan Cards ─────────────────────────────────────────── */}
        <section id="pricing" className="landing-section" aria-labelledby="pricing-heading">
          <div className="landing-container">
            <div className="landing-section-header">
              <div className="landing-section-tag">Pricing &amp; Plans</div>
              <h2 id="pricing-heading" className="landing-section-title">
                Simple, transparent pricing.
              </h2>
              <p className="landing-section-desc">
                Start with a 7-day free trial. Upgrade, downgrade, or cancel anytime.
              </p>

              {/* Billing Cycle Selector */}
              <div className="billing-toggle" role="group" aria-label="Billing cycle">
                {([
                  { id: 'MONTHLY', label: 'Monthly' },
                  { id: 'QUARTERLY', label: 'Quarterly', badge: 'Save 16%' },
                  { id: 'YEARLY', label: 'Annual', badge: 'Save 27%' },
                ] as { id: BillingCycleType; label: string; badge?: string }[]).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    id={`billing-${opt.id.toLowerCase()}`}
                    className={`billing-toggle__btn${billingCycle === opt.id || (opt.id === 'YEARLY' && billingCycle === 'ANNUAL') ? ' billing-toggle__btn--active' : ''}`}
                    onClick={() => setBillingCycle(opt.id)}
                    aria-pressed={billingCycle === opt.id}
                  >
                    <span>{opt.label}</span>
                    {opt.badge && <span className="billing-toggle__badge">{opt.badge}</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* 4-Tier Modern Plan Cards Grid */}
            <div className="modern-pricing-grid">
              {/* Free Trial Card */}
              <div className="modern-plan-card">
                <div className="plan-card-header">
                  <div className="plan-tier-top">
                    <div className="plan-tier-icon-box" style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#ffffff' }}>
                      <IconShield size={16} />
                    </div>
                    <span className="plan-license-pill">FREE TRIAL</span>
                  </div>
                  <h3 className="plan-tier-name">7-Day Free Trial</h3>
                  <p className="plan-tier-desc">Full platform access to test live workflows and roles.</p>
                </div>

                <div className="plan-card-pricing">
                  <div className="flex-center items-baseline gap-4">
                    <span className="plan-price-val">₹0</span>
                    <span className="plan-price-period">/ 7 days</span>
                  </div>
                  <div className="plan-saving-callout">Zero commitment</div>
                </div>

                <div className="plan-license-spec-box">
                  <div className="spec-row">
                    <span className="spec-label">Capacity:</span>
                    <span className="spec-value">10 Team Logins</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Scope:</span>
                    <span className="spec-value">All 4 Roles Included</span>
                  </div>
                </div>

                <div className="plan-features-list">
                  {[
                    'All 4 RBAC role dashboards',
                    'GST Rule 55 challan dispatch',
                    'BOM assemblies & cycle counts',
                  ].map((feat) => (
                    <div key={feat} className="plan-feature-item">
                      <IconCheck size={13} className="color-success shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <div className="plan-card-action">
                  <button
                    type="button"
                    className="btn btn-secondary w-full justify-center"
                    onClick={handleStartTrial}
                  >
                    Start Free Trial
                  </button>
                </div>
              </div>

              {/* Tier 1: Basic Plan */}
              <div className="modern-plan-card">
                <div className="plan-card-header">
                  <div className="plan-tier-top">
                    <div className="plan-tier-icon-box">
                      <IconLayers size={16} className="color-secondary" />
                    </div>
                    <span className="plan-license-pill">STARTER</span>
                  </div>
                  <h3 className="plan-tier-name">Basic Starter</h3>
                  <p className="plan-tier-desc">Essential inventory control & GST Rule 55 challans.</p>
                </div>

                <div className="plan-card-pricing">
                  <div className="flex-center items-baseline gap-4">
                    <span className="plan-price-val">{basicPrice.price}</span>
                    <span className="plan-price-period">{basicPrice.period}</span>
                  </div>
                  <div className="plan-saving-callout">{basicPrice.savingText}</div>
                </div>

                <div className="plan-license-spec-box">
                  <div className="spec-row">
                    <span className="spec-label">Capacity:</span>
                    <span className="spec-value">3 Seats · 500 SKUs</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Warehouses:</span>
                    <span className="spec-value">1 Active Hub</span>
                  </div>
                </div>

                <div className="plan-features-list">
                  {[
                    'Statutory GST Rule 55 challans',
                    'Customer CRM & live ledger',
                    'Admin + Sales role access',
                  ].map((feat) => (
                    <div key={feat} className="plan-feature-item">
                      <IconCheck size={13} className="color-success shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <div className="plan-card-action">
                  <button
                    type="button"
                    id="pricing-basic"
                    className="btn btn-secondary w-full justify-center"
                    disabled={checkoutLoading === 'BASIC'}
                    onClick={() => void handlePlanCheckout('BASIC')}
                  >
                    {checkoutLoading === 'BASIC' ? 'Initiating…' : `Activate Starter · ${basicPrice.price}`}
                  </button>
                </div>
              </div>

              {/* Tier 2: Premium Plan (Featured) */}
              <div className="modern-plan-card modern-plan-card--featured">
                <div className="featured-ribbon-badge">★ MOST POPULAR</div>

                <div className="plan-card-header">
                  <div className="plan-tier-top">
                    <div className="plan-tier-icon-box plan-tier-icon-box--pro">
                      <IconZap size={16} className="color-primary" />
                    </div>
                    <span className="plan-license-pill plan-license-pill--pro">GROWTH</span>
                  </div>
                  <h3 className="plan-tier-name color-primary">Growth Pro</h3>
                  <p className="plan-tier-desc">Full intelligence, BOM assemblies & advanced analytics.</p>
                </div>

                <div className="plan-card-pricing">
                  <div className="flex-center items-baseline gap-4">
                    <span className="plan-price-val color-primary">{premiumPrice.price}</span>
                    <span className="plan-price-period">{premiumPrice.period}</span>
                  </div>
                  <div className="plan-saving-callout color-success font-semibold">{premiumPrice.savingText}</div>
                </div>

                <div className="plan-license-spec-box plan-license-spec-box--pro">
                  <div className="spec-row">
                    <span className="spec-label">Capacity:</span>
                    <span className="spec-value font-semibold color-primary">10 Seats · Unlimited SKUs</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Warehouses:</span>
                    <span className="spec-value font-semibold color-primary">Unlimited Hubs</span>
                  </div>
                </div>

                <div className="plan-features-list">
                  {[
                    'All 4 Roles (Admin, Sales, WH, Accounts)',
                    'BOM Multi-Component Assemblies',
                    'Digital Cycle-Count Stock Takes',
                    'SVG Flow & Reorder Analytics',
                  ].map((feat) => (
                    <div key={feat} className="plan-feature-item">
                      <IconCheck size={13} className="color-success shrink-0" />
                      <span className="font-medium color-primary">{feat}</span>
                    </div>
                  ))}
                </div>

                <div className="plan-card-action">
                  <button
                    type="button"
                    id="pricing-premium"
                    className="btn btn-primary w-full justify-center shadow-purple"
                    disabled={checkoutLoading === 'PREMIUM'}
                    onClick={() => void handlePlanCheckout('PREMIUM')}
                  >
                    <IconZap size={14} />
                    {checkoutLoading === 'PREMIUM' ? 'Initiating…' : `Activate Growth Pro · ${premiumPrice.price}`}
                  </button>
                </div>
              </div>

              {/* Tier 3: Custom Software & Enterprise Plan */}
              <div className="modern-plan-card">
                <div className="plan-card-header">
                  <div className="plan-tier-top">
                    <div className="plan-tier-icon-box">
                      <IconShield size={16} className="color-secondary" />
                    </div>
                    <span className="plan-license-pill">CUSTOM ERP</span>
                  </div>
                  <h3 className="plan-tier-name">Custom Plan</h3>
                  <p className="plan-tier-desc">Tailored ERP software, bespoke workflows & private cloud.</p>
                </div>

                <div className="plan-card-pricing">
                  <div className="flex-center items-baseline gap-4">
                    <span className="plan-price-val">Custom</span>
                    <span className="plan-price-period">/ tailored quote</span>
                  </div>
                  <div className="plan-saving-callout">Bespoke SLA &amp; Architecture</div>
                </div>

                <div className="plan-license-spec-box">
                  <div className="spec-row">
                    <span className="spec-label">Capacity:</span>
                    <span className="spec-value font-semibold">Unlimited Seats &amp; Hubs</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Deployment:</span>
                    <span className="spec-value">Private Cloud / On-Prem</span>
                  </div>
                </div>

                <div className="plan-features-list">
                  {[
                    'Custom supply chain & ERP modules',
                    'Custom GST & accounting integrations',
                    'Dedicated database & SLA support',
                  ].map((feat) => (
                    <div key={feat} className="plan-feature-item">
                      <IconCheck size={13} className="color-success shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <div className="plan-card-action">
                  <a
                    href="mailto:sales@stockpulse.in?subject=Custom%20Software%20%26%20Enterprise%20ERP%20Inquiry"
                    id="pricing-custom-sales"
                    className="btn btn-secondary w-full justify-center"
                  >
                    Contact for Sales →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ Section ────────────────────────────────────────────── */}
        <section id="faqs" className="landing-section landing-section--alt" aria-labelledby="faq-heading">
          <div className="landing-container">
            <div className="landing-section-header">
              <div className="landing-section-tag">Frequently Asked Questions</div>
              <h2 id="faq-heading" className="landing-section-title">Everything you need to know.</h2>
              <p className="landing-section-desc">
                Clear answers regarding licensing, team onboarding, GST Rule 55 compliance, and internal controls.
              </p>

              {/* Category Filter Chips */}
              <div className="faq-filter-chips" role="group" aria-label="FAQ Categories">
                {[
                  { id: 'ALL', label: 'All Questions' },
                  { id: 'LICENSE', label: 'Licensing & Security' },
                  { id: 'PRICING', label: 'Pricing & Free Trial' },
                  { id: 'GST', label: 'GST & Rule 55' },
                  { id: 'WAREHOUSE', label: 'Warehouse' },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    className={`faq-filter-chip${faqCategory === chip.id ? ' faq-filter-chip--active' : ''}`}
                    onClick={() => setFaqCategory(chip.id as FaqCategoryType)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-w-800 m-auto" role="list">
              {filteredFaqs.map((faq, index) => {
                const isOpen = openFaqQuestion === faq.q;
                return (
                  <div key={faq.q} className="landing-faq-card" role="listitem">
                    <button
                      type="button"
                      id={`faq-question-${index}`}
                      className="landing-faq-question"
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${index}`}
                      onClick={() => setOpenFaqQuestion(isOpen ? null : faq.q)}
                    >
                      <span>{faq.q}</span>
                      <span aria-hidden="true" className="faq-toggle-icon">{isOpen ? '−' : '+'}</span>
                    </button>
                    {isOpen && (
                      <div id={`faq-answer-${index}`} role="region" aria-labelledby={`faq-question-${index}`} className="landing-faq-answer">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="landing-footer" role="contentinfo">
        <div className="landing-container">
          <div className="landing-footer-grid">
            <div>
              <div className="landing-footer-brand-header">
                <div className="logo-mark" aria-hidden="true">S</div>
                <span className="logo-text">StockPulse</span>
              </div>
              <p className="landing-footer-brand-desc">
                A focused B2B operations platform connecting CRM, sales, live inventory, delivery challans, GST compliance, and audit intelligence.
              </p>
              <div>
                <span className="landing-footer-status">
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: '#22c55e' }} />
                  Systems Operational
                </span>
              </div>
            </div>

            <div>
              <div className="landing-footer-col-title">Platform Modules</div>
              <ul className="landing-footer-links" role="list">
                {[
                  { label: 'Executive Dashboard', href: '#showcase' },
                  { label: 'Inventory & Warehouses', href: '#showcase' },
                  { label: 'GST Rule 55 Challans', href: '#showcase' },
                  { label: 'Customer CRM & Ledger', href: '#showcase' },
                  { label: 'BOM Assemblies & Stock Takes', href: '#showcase' },
                  { label: 'Plans & Pricing', href: '#pricing' },
                ].map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="landing-footer-link">{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="landing-footer-col-title">Security & Compliance</div>
              <ul className="landing-footer-links" role="list">
                {[
                  { label: 'Statutory GST Rule 55', href: '#showcase' },
                  { label: 'Role-Based Access (RBAC)', href: '#showcase' },
                  { label: 'UPI Manual Payment Flow', href: '#pricing' },
                  { label: 'Subscription Quota Enforcement', href: '#pricing' },
                  { label: 'Audit Trail Ledger Logs', href: '#workflow' },
                ].map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="landing-footer-link">{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          <div className="landing-footer-bottom">
            <span>© 2026 StockPulse SaaS Technologies. Built for Indian B2B Supply Chains 🇮🇳</span>
            <div className="flex-center gap-16">
              <a href="#faqs" className="landing-footer-link">Privacy Policy</a>
              <span aria-hidden="true" style={{ color: 'var(--border-color)' }}>·</span>
              <a href="#pricing" className="landing-footer-link">Terms of Service</a>
              <span aria-hidden="true" style={{ color: 'var(--border-color)' }}>·</span>
              <a href="#faqs" className="landing-footer-link">GST Declaration</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
