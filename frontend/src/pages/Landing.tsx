import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/common/ToastContainer';
import type { BillingCycleType, PlanTierType } from '../services/payment.service';
import {
  IconUsers, IconPackage, IconFileText, IconBarChart,
  IconShield, IconCheck, IconAlertTriangle,
  IconIndianRupee, IconTruck, IconDashboard,
  IconClipboardCheck, IconArrowRight,
  IconPrinter, IconLayers,
} from '../components/common/Icons';

export type FaqCategoryType = 'ALL' | 'LICENSE' | 'PRICING' | 'GST' | 'WAREHOUSE';


// ─── Inline SVG Icons ────────────────────────────────────────────────────────

const IconZap: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const IconLock: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconKey: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <circle cx="7.5" cy="15.5" r="5.5" />
    <path d="m21 2-9.6 9.6" />
    <path d="m15.5 7.5 3 3L22 7l-3-3" />
  </svg>
);

const IconActivity: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const IconClock: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconMaximize: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

const IconShieldCheck: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const IconTrendingUp: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const IconDownload: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

// ─── Showcase Tabs Type ───────────────────────────────────────────────────────

type ShowcaseTab = 'executive' | 'sales' | 'warehouse' | 'finance' | 'challan' | 'license';

// ─── Real Dashboard Mockup: Executive Command Center ─────────────────────────

interface HeroRealDashboardMockupProps {
  onZoom?: (img: string, title: string) => void;
}

const HeroRealDashboardMockup: React.FC<HeroRealDashboardMockupProps> = ({ onZoom }) => (
  <div className="hero-mockup-shell" aria-label="StockPulse Real Live Dashboard Preview">
    {/* Browser/OS Chrome Header */}
    <div className="hero-mockup-chrome">
      <div className="chrome-controls">
        <span className="chrome-dot chrome-dot--red" />
        <span className="chrome-dot chrome-dot--yellow" />
        <span className="chrome-dot chrome-dot--green" />
      </div>
      <div className="chrome-url-bar">
        <IconLock size={12} className="color-success" />
        <span>app.stockpulse.in/dashboard?perspective=EXECUTIVE</span>
        <span className="chrome-badge">PROD v2.4</span>
      </div>
      <div className="chrome-actions">
        <span className="live-pulse-indicator">
          <span className="live-pulse-dot" />
          Live Supabase Real-Time Sync
        </span>
      </div>
    </div>

    {/* Real Hero Dashboard Screen Frame */}
    <div
      className="hero-image-mockup-frame"
      onClick={() => onZoom?.('/assets/dashboards/executive-dashboard.png', 'Executive Dashboard (360°) · Executive Operations Command Center')}
    >
      <img
        src="/assets/dashboards/executive-dashboard.png"
        alt="StockPulse Executive Dashboard Command Center - Real-time B2B Inventory & Delivery Challans"
        className="hero-dashboard-real-img"
        loading="eager"
        width={1200}
        height={675}
      />

      {/* Floating Highlight Badges */}
      <div className="hero-floating-badge hero-floating-badge--top-right">
        <IconIndianRupee size={15} className="color-primary" />
        <div>
          <div className="text-xxs color-tertiary">Live Asset Valuation</div>
          <div className="font-mono font-bold color-success">₹48,74,922</div>
        </div>
      </div>

      <div className="hero-floating-badge hero-floating-badge--bottom-left">
        <IconCheck size={15} className="color-success" />
        <div>
          <div className="text-xxs color-tertiary">Statutory Dispatch</div>
          <div className="font-semibold color-primary">100% GST Rule 55 Compliant</div>
        </div>
      </div>

      <button
        type="button"
        className="dashboard-image-zoom-btn"
        onClick={(e) => {
          e.stopPropagation();
          onZoom?.('/assets/dashboards/executive-dashboard.png', 'Executive Dashboard (360°) · Executive Operations Command Center');
        }}
      >
        <IconMaximize size={13} />
        <span>Click to Zoom High-Res</span>
      </button>
    </div>
  </div>
);

// ─── Showcase Screen Views with Real Dashboard Screenshots ──────────────────

interface ShowcaseViewProps {
  onZoom?: (img: string, title: string) => void;
}

const ShowcaseExecutiveView: React.FC<ShowcaseViewProps> = ({ onZoom }) => (
  <div className="showcase-view-container">
    <div className="showcase-view-header">
      <div className="flex-center gap-10">
        <div className="showcase-icon-box bg-purple"><IconDashboard size={18} /></div>
        <div>
          <h4 className="showcase-view-title">Executive 360° Operations Command Center</h4>
          <p className="showcase-view-desc">Holistic enterprise view with real-time operational efficiency pulse, asset valuation ₹48.74L, and 100% dispatch fulfillment.</p>
        </div>
      </div>
      <div className="flex-center gap-8">
        <span className="badge badge-success">Role: ADMIN</span>
        <span className="badge badge-primary">Real-Time Pulse</span>
      </div>
    </div>

    {/* Real Screenshot Preview Frame */}
    <div
      className="showcase-dashboard-image-wrapper"
      onClick={() => onZoom?.('/assets/dashboards/executive-dashboard.png', 'Executive Dashboard (360°) · Executive Operations Command Center')}
    >
      <img
        src="/assets/dashboards/executive-dashboard.png"
        alt="Executive Operations Command Center Dashboard 360° Live View"
        className="showcase-dashboard-img"
        loading="lazy"
        width={1200}
        height={675}
      />
      <button
        type="button"
        className="dashboard-image-zoom-btn"
        onClick={(e) => {
          e.stopPropagation();
          onZoom?.('/assets/dashboards/executive-dashboard.png', 'Executive Dashboard (360°) · Executive Operations Command Center');
        }}
      >
        <IconMaximize size={13} />
        <span>Zoom Fullscreen</span>
      </button>
    </div>

    {/* Metric Feature Callouts */}
    <div className="showcase-highlights-grid">
      <div className="showcase-highlight-card">
        <div className="showcase-highlight-title color-primary">
          <IconActivity size={15} /> Real-Time Operational Pulse
        </div>
        <div className="showcase-highlight-desc">
          Live business health tracking 100% catalog health, 100% dispatch fulfillment, and 80% active accounts with daily velocity counters.
        </div>
      </div>

      <div className="showcase-highlight-card">
        <div className="showcase-highlight-title color-success">
          <IconIndianRupee size={15} /> ₹48,74,922 Asset Valuation
        </div>
        <div className="showcase-highlight-desc">
          Automated material asset valuation with live 7-day flow tracker (+5 IN replenishment vs -10 OUT customer dispatches).
        </div>
      </div>

      <div className="showcase-highlight-card">
        <div className="showcase-highlight-title color-info">
          <IconTruck size={15} /> 100% Delivery Challans
        </div>
        <div className="showcase-highlight-desc">
          Real-time donut distribution showing 5 confirmed dispatches, 0 draft backlog, and zero consignment bottleneck.
        </div>
      </div>

      <div className="showcase-highlight-card">
        <div className="showcase-highlight-title color-warning">
          <IconZap size={15} /> 1-Click Action Hub
        </div>
        <div className="showcase-highlight-desc">
          Instant quick-actions to generate GST Rule 55 dispatch challans, manage CRM leads, monitor warehouse bins, and export compliance logs.
        </div>
      </div>
    </div>
  </div>
);

const ShowcaseSalesView: React.FC<ShowcaseViewProps> = ({ onZoom }) => (
  <div className="showcase-view-container">
    <div className="showcase-view-header">
      <div className="flex-center gap-10">
        <div className="showcase-icon-box bg-purple"><IconUsers size={18} /></div>
        <div>
          <h4 className="showcase-view-title">Sales CRM & Order Dispatch Hub</h4>
          <p className="showcase-view-desc">Lead follow-up radar, instant catalog stock quick checks, and one-click sales delivery challan creation.</p>
        </div>
      </div>
      <div className="flex-center gap-8">
        <span className="badge badge-info">Role: SALES (Priya Sharma)</span>
        <span className="badge badge-success">5 Client Accounts</span>
      </div>
    </div>

    {/* Real Screenshot Preview Frame */}
    <div
      className="showcase-dashboard-image-wrapper"
      onClick={() => onZoom?.('/assets/dashboards/sales-crm-dashboard.png', 'Sales & CRM Dashboard · Sales CRM & Order Dispatch Hub')}
    >
      <img
        src="/assets/dashboards/sales-crm-dashboard.png"
        alt="Sales CRM & Customer Order Dispatch Radar Dashboard View"
        className="showcase-dashboard-img"
        loading="lazy"
        width={1200}
        height={675}
      />
      <button
        type="button"
        className="dashboard-image-zoom-btn"
        onClick={(e) => {
          e.stopPropagation();
          onZoom?.('/assets/dashboards/sales-crm-dashboard.png', 'Sales & CRM Dashboard · Sales CRM & Order Dispatch Hub');
        }}
      >
        <IconMaximize size={13} />
        <span>Zoom Fullscreen</span>
      </button>
    </div>

    {/* Feature Callouts */}
    <div className="showcase-highlights-grid">
      <div className="showcase-highlight-card">
        <div className="showcase-highlight-title color-primary">
          <IconClock size={15} /> Client Follow-Up Radar
        </div>
        <div className="showcase-highlight-desc">
          Scheduled follow-up alerts for enterprise accounts (Zenith Due 17 Aug, Global Electronics Due 18 Aug, Apex Logistics Due 19 Aug).
        </div>
      </div>

      <div className="showcase-highlight-card">
        <div className="showcase-highlight-title color-success">
          <IconPackage size={15} /> Catalog Stock Quick Check
        </div>
        <div className="showcase-highlight-desc">
          Sales reps see live warehouse inventory balances (100 M365, 55 Samsung 990 PRO SSDs, 80 Logitech Mice) with unit rates before quoting.
        </div>
      </div>

      <div className="showcase-highlight-card">
        <div className="showcase-highlight-title color-info">
          <IconTruck size={15} /> + Create Sales Challan
        </div>
        <div className="showcase-highlight-desc">
          Seamlessly generate outbound delivery slips directly from CRM client cards without manual SKU re-entry or double booking.
        </div>
      </div>

      <div className="showcase-highlight-card">
        <div className="showcase-highlight-title color-warning">
          <IconTrendingUp size={15} /> +5 Monthly Growth
        </div>
        <div className="showcase-highlight-desc">
          Fast-paced client onboarding with automated GSTIN verification, credit terms guardrails, and customer 360 history.
        </div>
      </div>
    </div>
  </div>
);

const ShowcaseWarehouseView: React.FC<ShowcaseViewProps> = ({ onZoom }) => (
  <div className="showcase-view-container">
    <div className="showcase-view-header">
      <div className="flex-center gap-10">
        <div className="showcase-icon-box bg-green"><IconPackage size={18} /></div>
        <div>
          <h4 className="showcase-view-title">Warehouse Logistics & Inventory Control</h4>
          <p className="showcase-view-desc">Automated restock priority matrix, aisle bin management, zero out-of-stock guard, and stock movement logs.</p>
        </div>
      </div>
      <div className="flex-center gap-8">
        <span className="badge badge-info">Role: WAREHOUSE (Rajesh Verma)</span>
        <span className="badge badge-success">5 SKUs Tracked</span>
      </div>
    </div>

    {/* Real Screenshot Preview Frame */}
    <div
      className="showcase-dashboard-image-wrapper"
      onClick={() => onZoom?.('/assets/dashboards/warehouse-ops-dashboard.png', 'Warehouse Ops Dashboard · Warehouse Logistics & Inventory Control')}
    >
      <img
        src="/assets/dashboards/warehouse-ops-dashboard.png"
        alt="Warehouse Operations Logistics & Inventory Control Dashboard View"
        className="showcase-dashboard-img"
        loading="lazy"
        width={1200}
        height={675}
      />
      <button
        type="button"
        className="dashboard-image-zoom-btn"
        onClick={(e) => {
          e.stopPropagation();
          onZoom?.('/assets/dashboards/warehouse-ops-dashboard.png', 'Warehouse Ops Dashboard · Warehouse Logistics & Inventory Control');
        }}
      >
        <IconMaximize size={13} />
        <span>Zoom Fullscreen</span>
      </button>
    </div>

    {/* Feature Callouts */}
    <div className="showcase-highlights-grid">
      <div className="showcase-highlight-card">
        <div className="showcase-highlight-title color-success">
          <IconShieldCheck size={15} /> Restock Priority Matrix
        </div>
        <div className="showcase-highlight-desc">
          Automated safety stock triggers ensure all catalog products remain healthy above minimum replenishment thresholds.
        </div>
      </div>

      <div className="showcase-highlight-card">
        <div className="showcase-highlight-title color-primary">
          <IconActivity size={15} /> 7-Day Movement Velocity
        </div>
        <div className="showcase-highlight-desc">
          Precision inflow/outflow audit tracking (+5 units inward receiving vs -10 units outbound customer shipments).
        </div>
      </div>

      <div className="showcase-highlight-card">
        <div className="showcase-highlight-title color-info">
          <IconTruck size={15} /> Pending Dispatch Prep Queue
        </div>
        <div className="showcase-highlight-desc">
          Warehouse staff manage staging lanes for confirmed challans with zero picking errors and instant seal verification.
        </div>
      </div>

      <div className="showcase-highlight-card">
        <div className="showcase-highlight-title color-warning">
          <IconLayers size={15} /> Stock In/Out Audit Logs
        </div>
        <div className="showcase-highlight-desc">
          Every barcode scan, stock transfer, and manual inventory adjustment is logged with cryptographic user attribution.
        </div>
      </div>
    </div>
  </div>
);

const ShowcaseFinanceView: React.FC<ShowcaseViewProps> = ({ onZoom }) => (
  <div className="showcase-view-container">
    <div className="showcase-view-header">
      <div className="flex-center gap-10">
        <div className="showcase-icon-box bg-blue"><IconBarChart size={18} /></div>
        <div>
          <h4 className="showcase-view-title">Financial Capital & GST Compliance</h4>
          <p className="showcase-view-desc">Inventory capital valuation ₹48.74L, 100% tax-compliant entities, and instant statutory GST tax audit CSV exports.</p>
        </div>
      </div>
      <div className="flex-center gap-8">
        <span className="badge badge-info">Role: ACCOUNTS (Sneha Patel)</span>
        <span className="badge badge-success">100% Tax Compliant</span>
      </div>
    </div>

    {/* Real Screenshot Preview Frame */}
    <div
      className="showcase-dashboard-image-wrapper"
      onClick={() => onZoom?.('/assets/dashboards/finance-accounts-dashboard.png', 'Finance & Accounts Dashboard · Financial Capital & GST Compliance')}
    >
      <img
        src="/assets/dashboards/finance-accounts-dashboard.png"
        alt="Finance, Working Capital Valuation & GST Tax Audit Dashboard View"
        className="showcase-dashboard-img"
        loading="lazy"
        width={1200}
        height={675}
      />
      <button
        type="button"
        className="dashboard-image-zoom-btn"
        onClick={(e) => {
          e.stopPropagation();
          onZoom?.('/assets/dashboards/finance-accounts-dashboard.png', 'Finance & Accounts Dashboard · Financial Capital & GST Compliance');
        }}
      >
        <IconMaximize size={13} />
        <span>Zoom Fullscreen</span>
      </button>
    </div>

    {/* Feature Callouts */}
    <div className="showcase-highlights-grid">
      <div className="showcase-highlight-card">
        <div className="showcase-highlight-title color-primary">
          <IconIndianRupee size={15} /> ₹48,74,922 Capital Valuation
        </div>
        <div className="showcase-highlight-desc">
          Live ledger asset balance computed automatically from physical warehouse stock counts and latest procurement unit costs.
        </div>
      </div>

      <div className="showcase-highlight-card">
        <div className="showcase-highlight-title color-success">
          <IconCheck size={15} /> 5/5 Tax Compliant Entities
        </div>
        <div className="showcase-highlight-desc">
          100% of transacting customers have verified GSTIN numbers with automated state code detection (Maharashtra 27, Delhi 07).
        </div>
      </div>

      <div className="showcase-highlight-card">
        <div className="showcase-highlight-title color-info">
          <IconDownload size={15} /> Export GST Tax Audit CSV
        </div>
        <div className="showcase-highlight-desc">
          1-Click download of statutory tax breakdown tables for CA reconciliation, GSTR-1 preparation, and annual audit filings.
        </div>
      </div>

      <div className="showcase-highlight-card">
        <div className="showcase-highlight-title color-warning">
          <IconClipboardCheck size={15} /> Delivery Challan Invoices
        </div>
        <div className="showcase-highlight-desc">
          Inspect confirmed sales shipments and convert Rule 55 delivery challans into formal GST tax invoices upon goods receipt.
        </div>
      </div>
    </div>
  </div>
);

const ShowcaseChallanView: React.FC = () => (
  <div className="showcase-view-container">
    <div className="showcase-view-header">
      <div className="flex-center gap-10">
        <div className="showcase-icon-box bg-blue"><IconClipboardCheck size={18} /></div>
        <div>
          <h4 className="showcase-view-title">GST Rule 55 Statutory Delivery Challan & Invoicing</h4>
          <p className="showcase-view-desc">Automatic two-digit state code resolution, intra-state (CGST+SGST) vs inter-state (IGST) split, and print readiness.</p>
        </div>
      </div>
      <div className="flex-center gap-8">
        <span className="badge badge-success"><IconPrinter size={12} /> Print-Ready</span>
        <span className="badge badge-primary">Challan #CH-2026-0841</span>
      </div>
    </div>

    {/* Challan Document Replica */}
    <div className="showcase-challan-document">
      <div className="challan-doc-header">
        <div>
          <div className="challan-doc-badge">STATUTORY DELIVERY CHALLAN</div>
          <div className="text-xxs color-tertiary">ISSUED UNDER RULE 55 OF CGST RULES, 2017</div>
        </div>
        <div className="text-right">
          <div className="font-mono font-bold text-sm color-primary">CH-2026-0841</div>
          <div className="text-xxs color-tertiary">Date: 16-AUG-2026 · Dispatch: Road Cargo</div>
        </div>
      </div>

      <div className="challan-doc-parties">
        <div className="party-box">
          <div className="party-label">CONSIGNOR (SELLER)</div>
          <div className="party-name">StockPulse Operations Hub</div>
          <div className="party-detail">Plot 42, Industrial Zone, Andheri East, Mumbai</div>
          <div className="party-gst">GSTIN: <span className="font-mono font-semibold">27AAACS1234F1Z9 (Maharashtra - 27)</span></div>
        </div>
        <div className="party-box">
          <div className="party-label">CONSIGNEE (BUYER)</div>
          <div className="party-name">Rajan Traders Pvt Ltd</div>
          <div className="party-detail">B-14 Okhla Phase 3, Industrial Area, New Delhi</div>
          <div className="party-gst">GSTIN: <span className="font-mono font-semibold">07AAACR9876E1Z2 (Delhi - 07 • Inter-State)</span></div>
        </div>
      </div>

      <div className="mockup-table mt-12">
        <div className="mockup-thead">
          <span># Item Description</span>
          <span>HSN</span>
          <span>Qty</span>
          <span>Rate (INR)</span>
          <span className="text-right">Taxable Amt</span>
        </div>
        {[
          { no: '1', name: 'Microsoft 365 Business Standard (1-Year)', hsn: '9973', qty: '10 Lic', rate: '₹11,990.00', tax: '₹1,19,900.00' },
          { no: '2', name: 'Samsung 990 PRO 2TB NVMe SSD', hsn: '8471', qty: '5 Nos', rate: '₹17,250.00', tax: '₹86,250.00' },
          { no: '3', name: 'Dell UltraSharp 27" 4K USB-C Hub Monitor', hsn: '8528', qty: '2 Nos', rate: '₹52,499.00', tax: '₹1,04,998.00' },
        ].map((item) => (
          <div key={item.no} className="mockup-trow">
            <span className="font-semibold text-xs">{item.no}. {item.name}</span>
            <span className="mockup-code">{item.hsn}</span>
            <span className="text-xs">{item.qty}</span>
            <span className="font-mono text-xs">{item.rate}</span>
            <span className="mockup-amount-cell">{item.tax}</span>
          </div>
        ))}
      </div>

      {/* Tax Summary Footer */}
      <div className="challan-tax-summary">
        <div className="tax-notes">
          <div className="flex-center gap-6 text-xs color-success font-semibold">
            <IconCheck size={14} /> Automatic IGST (18%) applied based on State 27 (MH) → State 07 (DL) dispatch.
          </div>
          <div className="text-xxs color-tertiary mt-4">
            Declared that goods are dispatched for supply to recipient under statutory Rule 55. Stock deducted atomically from active catalog inventory.
          </div>
        </div>

        <div className="tax-breakdown-box">
          <div className="tax-row"><span>Taxable Value:</span><span>₹3,11,148.00</span></div>
          <div className="tax-row"><span>IGST (18%):</span><span>₹56,006.64</span></div>
          <div className="tax-row tax-row--grand"><span>Grand Invoice Total:</span><span className="color-primary">₹3,67,154.64</span></div>
        </div>
      </div>
    </div>
  </div>
);

const ShowcaseLicenseView: React.FC = () => (
  <div className="showcase-view-container">
    <div className="showcase-view-header">
      <div className="flex-center gap-10">
        <div className="showcase-icon-box bg-purple"><IconKey size={18} /></div>
        <div>
          <h4 className="showcase-view-title">Cryptographic License, Plan Expiry & RBAC Security</h4>
          <p className="showcase-view-desc">Dynamic seat allocation, cryptographically signed license keys, 7-day grace period protection, and RBAC governance.</p>
        </div>
      </div>
      <div className="flex-center gap-8">
        <span className="badge badge-success">Status: ACTIVE</span>
        <span className="badge badge-primary">Key: SP-LIC-PREM-9842</span>
      </div>
    </div>

    <div className="mockup-grid-2">
      {/* Active License Details Card */}
      <div className="showcase-crm-card">
        <div className="font-bold text-xs text-uppercase tracking-wider color-secondary mb-12">License & Validity Overview</div>
        <div className="license-info-box">
          <div className="flex-center justify-between mb-8">
            <span className="text-xs color-secondary">Active Subscription Plan:</span>
            <span className="badge badge-primary">GROWTH LICENSE PRO</span>
          </div>
          <div className="flex-center justify-between mb-8">
            <span className="text-xs color-secondary">License Serial Token:</span>
            <span className="font-mono text-xs font-bold color-success">SP-LIC-GROW-2026-9A31</span>
          </div>
          <div className="flex-center justify-between mb-8">
            <span className="text-xs color-secondary">Validity Window:</span>
            <span className="font-mono text-xs color-primary">365 Days (Valid till 16-AUG-2027)</span>
          </div>
          <div className="flex-center justify-between">
            <span className="text-xs color-secondary">Grace Period Protection:</span>
            <span className="badge badge-success text-xxs">7-Day Zero Data-Loss Guard</span>
          </div>
        </div>

        <div className="mt-16">
          <div className="flex-center justify-between text-xs mb-4">
            <span className="font-semibold color-secondary">Seat License Utilization</span>
            <span className="font-mono font-bold color-primary">4 of 10 Seats Active</span>
          </div>
          <div className="mockup-progress-bg">
            <div className="mockup-progress-bar progress--good" style={{ width: '40%' }} />
          </div>
        </div>
      </div>

      {/* Role-Based Access Governance */}
      <div className="showcase-crm-card">
        <div className="font-bold text-xs text-uppercase tracking-wider color-secondary mb-12">Assigned User Roles & Access Guard</div>
        <div className="mockup-table">
          <div className="mockup-thead">
            <span>User Member</span>
            <span>Assigned Role</span>
            <span>License Status</span>
          </div>
          {[
            { name: 'Mohmmed Aarif (Admin)', role: 'ADMIN', badge: 'Full Executive HQ', status: 'Active' },
            { name: 'Priya Sharma (Sales)', role: 'SALES', badge: 'CRM & Sales Challans', status: 'Active' },
            { name: 'Rajesh Verma (Warehouse)', role: 'WAREHOUSE', badge: 'Logistics & Stock Control', status: 'Active' },
            { name: 'Sneha Patel (Accounts)', role: 'ACCOUNTS', badge: 'Finance & GST Compliance', status: 'Active' },
          ].map((u) => (
            <div key={u.name} className="mockup-trow">
              <span className="text-xs font-semibold color-primary">{u.name}</span>
              <span className="badge badge-info text-xxs">{u.role}</span>
              <span className="status-pill status--dispatched text-xxs">{u.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ─── Main Landing Component ──────────────────────────────────────────────────

export const Landing: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toasts, toast, removeToast } = useToast();
  // Pricing state
  const [billingCycle, setBillingCycle] = useState<BillingCycleType>('MONTHLY');
  const [checkoutLoading] = useState<string | null>(null);

  // Showcase tab state
  const [activeShowcase, setActiveShowcase] = useState<ShowcaseTab>('executive');

  // Lightbox modal for high-res dashboard preview
  const [lightboxData, setLightboxData] = useState<{ src: string; title: string } | null>(null);

  // FAQ state (keyed by question string so category filtering never glitches)
  const [openFaqQuestion, setOpenFaqQuestion] = useState<string | null>(null);

  // Mobile nav state
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close lightbox on Escape key and prevent body scroll
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxData) {
        setLightboxData(null);
      }
    };
    if (lightboxData) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxData]);

  const openLightbox = (src: string, title: string) => {
    setLightboxData({ src, title });
  };

  const closeLightbox = () => {
    setLightboxData(null);
  };

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

  const getEnterprisePrice = () => {
    switch (billingCycle) {
      case 'QUARTERLY':
        return { price: '₹3,999', period: '/ quarter', raw: 3999, savingText: 'Save 11% vs monthly' };
      case 'YEARLY':
      case 'ANNUAL':
        return { price: '₹13,999', period: '/ year', raw: 13999, savingText: 'Save 22% · Fleet Multi-Branch' };
      case 'MONTHLY':
      default:
        return { price: '₹1,499', period: '/ month', raw: 1499, savingText: 'Custom fleet deployment' };
    }
  };

  const basicPrice = getBasicPrice();
  const premiumPrice = getPremiumPrice();
  const enterprisePrice = getEnterprisePrice();

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

  const showcaseComponents: Record<ShowcaseTab, React.ReactNode> = {
    executive: <ShowcaseExecutiveView onZoom={openLightbox} />,
    sales: <ShowcaseSalesView onZoom={openLightbox} />,
    warehouse: <ShowcaseWarehouseView onZoom={openLightbox} />,
    finance: <ShowcaseFinanceView onZoom={openLightbox} />,
    challan: <ShowcaseChallanView />,
    license: <ShowcaseLicenseView />,
  };

  const showcaseTabs: { id: ShowcaseTab; label: string; icon: React.ReactNode }[] = [
    { id: 'executive', label: 'Executive HQ (360°)', icon: <IconDashboard size={14} /> },
    { id: 'sales', label: 'Sales & CRM Hub', icon: <IconUsers size={14} /> },
    { id: 'warehouse', label: 'Warehouse Logistics', icon: <IconPackage size={14} /> },
    { id: 'finance', label: 'Finance & Accounts', icon: <IconBarChart size={14} /> },
    { id: 'challan', label: 'Rule 55 Challans', icon: <IconClipboardCheck size={14} /> },
    { id: 'license', label: 'License & Access Guard', icon: <IconKey size={14} /> },
  ];

  const faqItems: { q: string; a: string; cat: FaqCategoryType }[] = [
    {
      cat: 'LICENSE',
      q: 'How does cryptographic license activation and the 7-day free trial work?',
      a: 'When you activate a subscription or start the 7-day trial, StockPulse instantly generates a cryptographically signed license token bound to your Organization ID and seat quota. You pay ₹0 today for the trial, get full access to all role dashboards, and can cancel anytime before day 7 with zero fees.',
    },
    {
      cat: 'LICENSE',
      q: 'What happens when a plan expires? Is our data and dispatch flow safe?',
      a: 'Yes, your data is 100% safe. When a subscription term concludes, StockPulse triggers an automated 7-Day Zero Data-Loss Grace Period. Dispatches, challans, and stock queries continue uninterrupted. Even after grace expiry, your database remains safely preserved in read-only mode until license renewal.',
    },
    {
      cat: 'LICENSE',
      q: 'How do I give access and assign roles to my team members?',
      a: 'As the Organization Admin, navigate to the User Access Console in your dashboard. You invite team members via email or mobile and assign them one of four dedicated profiles: Admin, Sales, Warehouse, or Accounts. Each member receives their own login credentials constrained by their role boundaries.',
    },
    {
      cat: 'GST',
      q: 'How does StockPulse automatically resolve CGST, SGST, and IGST for Rule 55 Delivery Challans?',
      a: 'StockPulse parses the 2-digit state code from both your warehouse GSTIN (e.g. 27 for Maharashtra) and the customer GSTIN (e.g. 07 for Delhi). If state codes match, it automatically applies intra-state CGST (9%) + SGST (9%). If they differ, it applies inter-state IGST (18%). All calculations and statutory declarations print automatically on the delivery slip.',
    },
    {
      cat: 'WAREHOUSE',
      q: 'Can our warehouse staff use physical USB or Bluetooth barcode scanners?',
      a: 'Yes. The Stock Take & Cycle Count module works with any standard HID USB or Bluetooth barcode scanner without installing drivers. Warehouse staff can scan an SKU barcode at the rack or bin, and the inventory count and movement velocity update instantly in real time.',
    },
    {
      cat: 'PRICING',
      q: 'What payment methods are supported for license activation?',
      a: 'We support all major Indian payment methods through our 256-bit encrypted Razorpay checkout, including UPI (Google Pay, PhonePe, Paytm), Net Banking across 50+ Indian banks, Corporate Credit/Debit cards, and NEFT/RTGS wire transfers for annual enterprise contracts.',
    },
    {
      cat: 'GST',
      q: 'Can we convert confirmed delivery challans into GST Tax Invoices?',
      a: 'Yes. Once a delivery challan is confirmed and goods are received at the customer site, your Accounts team can click "Convert to Tax Invoice" with 1 click. StockPulse copies all item lines, HSN codes, and tax breakdowns into a compliant tax invoice with zero manual re-entry.',
    },
    {
      cat: 'PRICING',
      q: 'Can we upgrade our plan or add more seats mid-cycle?',
      a: 'Yes. You can upgrade from Basic to Premium Pro or add additional user seat licenses at any time from your Organization settings. Billing is automatically pro-rated for the remainder of your active billing cycle.',
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
            <li><a href="#modules" className="landing-nav-link">Modules</a></li>
            <li><a href="#showcase" className="landing-nav-link">Showcase</a></li>
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
              <a href="#workflow" className="landing-mobile-nav-link" onClick={() => setMobileNavOpen(false)}>Workflow</a>
              <a href="#modules" className="landing-mobile-nav-link" onClick={() => setMobileNavOpen(false)}>Modules</a>
              <a href="#showcase" className="landing-mobile-nav-link" onClick={() => setMobileNavOpen(false)}>Product Showcase</a>
              <a href="#license-security" className="landing-mobile-nav-link" onClick={() => setMobileNavOpen(false)}>License & Access</a>
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
            <span className="landing-eyebrow-pill">B2B Operations & Supply Chain Platform</span>
            <span className="landing-eyebrow-sep" aria-hidden="true">·</span>
            <span className="landing-eyebrow-text">Built for Indian Wholesale & Distribution Commerce 🇮🇳</span>
          </div>

          <h1 className="landing-hero-title">
            Connect CRM, Live Stock, Delivery Challans &amp; GST Invoicing.
          </h1>

          <p className="landing-hero-subtitle">
            StockPulse unifies your sales pipeline, warehouse stock, statutory GST Rule 55 delivery challans,
            and executive audit intelligence into one ultra-fast, transaction-safe operations workspace.
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
              {checkoutLoading === 'TRIAL' ? 'Activating 7-Day Trial…' : 'Start 7-Day Free Trial (₹0 Today)'}
            </button>
            <a href="#showcase" id="hero-explore-platform" className="btn btn-secondary btn-lg">
              View Real Product Live
            </a>
          </div>

          {/* Hero stats bar */}
          <div className="landing-hero-stats">
            <div className="landing-hero-stat">
              <div className="landing-hero-stat__value">Atomic Consistency</div>
              <div className="landing-hero-stat__label">Zero inventory corruption</div>
            </div>
            <div className="landing-hero-stat-sep" aria-hidden="true" />
            <div className="landing-hero-stat">
              <div className="landing-hero-stat__value">GST Rule 55</div>
              <div className="landing-hero-stat__label">Statutory Delivery Slips</div>
            </div>
            <div className="landing-hero-stat-sep" aria-hidden="true" />
            <div className="landing-hero-stat">
              <div className="landing-hero-stat__value">4 Built-in Roles</div>
              <div className="landing-hero-stat__label">Admin, Sales, WH, Accounts</div>
            </div>
            <div className="landing-hero-stat-sep" aria-hidden="true" />
            <div className="landing-hero-stat">
              <div className="landing-hero-stat__value">Cryptographic Key</div>
              <div className="landing-hero-stat__label">Instant License Dispatch</div>
            </div>
          </div>

          {/* Real Live Dashboard Preview in Hero */}
          <div className="landing-hero-mockup-wrapper" aria-hidden="true">
            <HeroRealDashboardMockup onZoom={openLightbox} />
          </div>
        </div>
      </header>

      {/* ── Main Content Area (Landmark for Accessibility & SEO) ────────── */}
      <main id="main-content">

        {/* ── Problem → Solution ──────────────────────────────────────────── */}
        <section className="landing-section" aria-labelledby="problem-heading">
          <div className="landing-container">
            <div className="landing-section-header">
              <div className="landing-section-tag">The Operational Gap</div>
              <h2 id="problem-heading" className="landing-section-title">
                Stop running your B2B supply chain across 5 disconnected tools.
              </h2>
              <p className="landing-section-desc">
                Traditional ERPs are slow and expensive, while spreadsheets and WhatsApp groups lead to stock mismatches,
                tax calculation errors, and missed customer follow-ups.
              </p>
            </div>

            <div className="problem-solution-grid">
              <div className="problem-side">
                <div className="problem-side__label">
                  <IconAlertTriangle size={14} />
                  Without StockPulse (Fragmented Chaos)
                </div>
                <ul className="problem-list" role="list">
                  {[
                    'Excel stock registers that go out-of-sync after every phone order',
                    'Warehouse and Sales arguing about whether an SKU is actually in stock',
                    'Manually typed Word challans with wrong state codes and tax penalties',
                    'Separate accounting software with no live view of physical warehouse bays',
                    'No license guardrails or role permissions — everyone sees all sensitive margins',
                    'Hours lost reconciling stock movement logs for annual tax audits',
                  ].map((item) => (
                    <li key={item} className="problem-list-item">
                      <span className="problem-list-icon" aria-hidden="true">✕</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="solution-divider" aria-hidden="true">
                <div className="solution-divider__line" />
                <div className="solution-divider__arrow">
                  <IconArrowRight size={18} />
                </div>
                <div className="solution-divider__line" />
              </div>

              <div className="solution-side">
                <div className="solution-side__label">
                  <IconCheck size={14} />
                  With StockPulse (Unified Operations)
                </div>
                <ul className="solution-list" role="list">
                  {[
                    'Live SKU stock deducted atomically the exact second a challan is sealed',
                    'Sales reps verify real-time stock on mobile before promising client delivery',
                    'Rule 55 compliant Delivery Challans generated in 60 seconds with auto-tax splits',
                    'Integrated CRM follow-ups, credit limit alerts, and ledger balance tracking',
                    'Strict Role-Based Access Control (Admin, Sales, Warehouse, Accounts)',
                    'Cryptographically verified license management with 7-day grace period safety',
                  ].map((item) => (
                    <li key={item} className="solution-list-item">
                      <IconCheck size={14} className="solution-check" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── SEO Industry Solutions & Verticals ──────────────────────────── */}
        <section id="modules" className="landing-section landing-section--compact" aria-labelledby="industries-heading" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="landing-container">
          <div className="landing-section-header" style={{ marginBottom: 28 }}>
            <div className="landing-section-tag">Target B2B Verticals</div>
            <h2 id="industries-heading" className="landing-section-title" style={{ fontSize: 24 }}>
              Tailored for High-Velocity Indian B2B Supply Chains
            </h2>
            <p className="landing-section-desc" style={{ fontSize: 14 }}>
              Purpose-built inventory intelligence, GST Rule 55 delivery challans, and multi-warehouse control across industries.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {[
              {
                title: 'Hardware & Electricals',
                keywords: 'PVC Pipes, Copper Wires, Fasteners',
                desc: 'Variant tracking, dynamic unit-rate calculations, and automated vendor purchase orders with 18% GST.',
                tag: 'High SKU Depth',
              },
              {
                title: 'FMCG & Packaged Goods',
                keywords: 'Wholesale Food, Beverages, Consumer Goods',
                desc: 'Batch stock runway forecasting, AIM demand simulation, and WhatsApp conversational order intake.',
                tag: 'High Velocity',
              },
              {
                title: 'Auto Parts & Spares',
                keywords: 'OEM Spares, Bearings, Lubricants',
                desc: 'Zone-based barcode stock audit, multi-bay cycle counts, and fast delivery challan printing.',
                tag: 'Multi-Warehouse',
              },
              {
                title: 'Chemicals & Polymers',
                keywords: 'Resins, Additives, Industrial Solvents',
                desc: 'BOM multi-component production assemblies and statutory Rule 55 goods transportation compliance.',
                tag: 'Rule 55 Compliant',
              },
              {
                title: 'Electronics & Appliances',
                keywords: 'Appliances, Sub-assemblies, Components',
                desc: 'Customer credit limits, overdue aging ledgers, and 4-role RBAC security for sales and accounts.',
                tag: 'Credit Guardrails',
              },
            ].map((ind) => (
              <div
                key={ind.title}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 12,
                  padding: '18px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-color)', letterSpacing: '0.05em' }}>
                    {ind.tag}
                  </span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>{ind.title}</h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>{ind.keywords}</div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{ind.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Product Workflow ────────────────────────────────────────────── */}
      <section id="workflow" className="landing-section landing-section--alt" aria-labelledby="workflow-heading">
        <div className="landing-container">
          <div className="landing-section-header">
            <div className="landing-section-tag">End-to-End Pipeline</div>
            <h2 id="workflow-heading" className="landing-section-title">
              From lead capture to GST dispatch in one fluid chain.
            </h2>
            <p className="landing-section-desc">
              Every transaction moves automatically through the pipeline with zero manual re-entry.
            </p>
          </div>

          <div className="workflow-flow" role="list" aria-label="Product workflow">
            {[
              { step: '01', icon: <IconUsers size={22} />, title: 'Customer Lead', desc: 'Capture GSTIN, verified state code, credit limits & follow-up reminders.', color: 'blue' },
              { step: '02', icon: <IconFileText size={22} />, title: 'Order Intake', desc: 'Itemize order with snapshot unit rates, quantities, and customer terms.', color: 'violet' },
              { step: '03', icon: <IconPackage size={22} />, title: 'Live Stock Check', desc: 'Real-time SKU validation across warehouse bays before confirming dispatch.', color: 'indigo' },
              { step: '04', icon: <IconClipboardCheck size={22} />, title: 'Challan Seal', desc: 'Generate GST Rule 55 Delivery Challan with snapshot HSN codes & rates.', color: 'teal' },
              { step: '05', icon: <IconTruck size={22} />, title: 'Atomic Dispatch', desc: 'Inventory deducted in a transaction-safe lock. Challan print-ready.', color: 'green' },
              { step: '06', icon: <IconIndianRupee size={22} />, title: 'GST Ledger', desc: 'Intra/Inter state tax splits calculated automatically for audit reconciliation.', color: 'amber' },
            ].map((node, idx, arr) => (
              <React.Fragment key={node.step}>
                <div className={`workflow-step workflow-step--${node.color}`} role="listitem">
                  <div className="workflow-step__number">{node.step}</div>
                  <div className={`workflow-step__icon workflow-icon--${node.color}`} aria-hidden="true">
                    {node.icon}
                  </div>
                  <div className="workflow-step__title">{node.title}</div>
                  <div className="workflow-step__desc">{node.desc}</div>
                </div>
                {idx < arr.length - 1 && (
                  <div className="workflow-connector" aria-hidden="true">
                    <div className="workflow-connector__arrow">›</div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ── Product Showcase (Real Live Dashboard Visuals) ─────────────── */}
      <section id="showcase" className="landing-section" aria-labelledby="showcase-heading">
        <div id="license-security" style={{ position: 'absolute', top: '-100px' }} />
        <div className="landing-container">
          <div className="landing-section-header">
            <div className="landing-section-tag">Interactive Product Preview</div>
            <h2 id="showcase-heading" className="landing-section-title">
              See the real StockPulse application in action.
            </h2>
            <p className="landing-section-desc">
              Explore how each operational module is designed for scannability, rapid order dispatch, and regulatory compliance.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="showcase-tabs" role="tablist" aria-label="Product modules">
            {showcaseTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                id={`showcase-tab-${tab.id}`}
                role="tab"
                aria-selected={activeShowcase === tab.id}
                aria-controls={`showcase-panel-${tab.id}`}
                className={`showcase-tab${activeShowcase === tab.id ? ' showcase-tab--active' : ''}`}
                onClick={() => setActiveShowcase(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Interactive Screen Panel */}
          <div
            id={`showcase-panel-${activeShowcase}`}
            role="tabpanel"
            aria-labelledby={`showcase-tab-${activeShowcase}`}
            className="showcase-panel"
          >
            {showcaseComponents[activeShowcase]}
          </div>
        </div>
      </section>


      {/* ── Modern Plan Cards with License Details & Expiry ───────────── */}
      <section id="pricing" className="landing-section" aria-labelledby="pricing-heading">
        <div className="landing-container">
          <div className="landing-section-header">
            <div className="landing-section-tag">Transparent SaaS Pricing</div>
            <h2 id="pricing-heading" className="landing-section-title">
              Predictable Plans with Full License Governance.
            </h2>
            <p className="landing-section-desc">
              All plans include complete GST Rule 55 compliance, cryptographic license keys, and 7-day grace period protection. Start free for 7 days today.
            </p>

            {/* Billing Cycle Selector */}
            <div className="billing-toggle" role="group" aria-label="Billing cycle">
              {([
                { id: 'MONTHLY', label: 'Monthly Term', badge: 'Standard 30d' },
                { id: 'QUARTERLY', label: 'Quarterly Lock', badge: 'Save 16% · 90d' },
                { id: 'YEARLY', label: 'Annual License', badge: 'Save 27% · Best Value (2 Mo Free)' },
              ] as { id: BillingCycleType; label: string; badge?: string }[]).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  id={`billing-${opt.id.toLowerCase()}`}
                  className={`billing-toggle__btn${billingCycle === opt.id || (opt.id === 'YEARLY' && billingCycle === 'ANNUAL') ? ' billing-toggle__btn--active' : ''}`}
                  onClick={() => setBillingCycle(opt.id)}
                  aria-pressed={billingCycle === opt.id}
                >
                  {opt.label}
                  {opt.badge && <span className="billing-toggle__badge">{opt.badge}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* 4-Tier Modern Plan Cards Grid */}
          <div className="modern-pricing-grid">
            {/* Free Trial Card */}
            <div className="modern-plan-card" style={{ borderColor: 'var(--border-color)' }}>
              <div className="plan-card-header">
                <div className="plan-tier-top">
                  <div className="plan-tier-icon-box" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}>
                    <IconShield size={20} />
                  </div>
                  <span className="plan-license-pill" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>FREE TRIAL</span>
                </div>
                <h3 className="plan-tier-name">7-Day Free Trial</h3>
                <p className="plan-tier-desc">Fully featured access to our Growth Pro plan. Test drive PO automation, dashboard customization, and report analytics.</p>
              </div>

              <div className="plan-card-pricing">
                <div className="flex-center items-baseline gap-4">
                  <span className="plan-price-val">₹0</span>
                  <span className="plan-price-period">/ 7 days</span>
                </div>
                <div className="plan-saving-callout" style={{ color: '#60a5fa' }}>No Credit Card Required</div>
              </div>

              <div className="plan-license-spec-box">
                <div className="spec-row">
                  <span className="spec-label flex-center gap-6">
                    <IconUsers size={13} className="color-tertiary" />
                    <span>User Seats:</span>
                  </span>
                  <span className="spec-value font-semibold">10 Team Logins</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label flex-center gap-6">
                    <IconClock size={13} className="color-tertiary" />
                    <span>License Term:</span>
                  </span>
                  <span className="spec-value font-semibold">7 Days (Expires)</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label flex-center gap-6">
                    <IconTruck size={13} className="color-tertiary" />
                    <span>Flexibility:</span>
                  </span>
                  <span className="spec-value font-semibold color-success">Upgrade to Paid anytime</span>
                </div>
              </div>

              <div className="plan-features-list">
                {[
                  'Full Growth Pro features included',
                  'Unlimited products & customers',
                  'Custom dashboards per role',
                  'Shift to paid plans at any time',
                ].map((feat) => (
                  <div key={feat} className="plan-feature-item">
                    <IconCheck size={14} className="color-success shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <div className="plan-card-action">
                <button
                  type="button"
                  className="btn btn-secondary w-full justify-center"
                  onClick={handleStartTrial}
                  style={{ borderColor: '#3b82f6', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.05)' }}
                >
                  Start 7-Day Free Trial
                </button>
              </div>
            </div>

            {/* Tier 1: Basic Plan */}
            <div className="modern-plan-card">
              <div className="plan-card-header">
                <div className="plan-tier-top">
                  <div className="plan-tier-icon-box">
                    <IconLayers size={20} className="color-secondary" />
                  </div>
                  <span className="plan-license-pill">STARTER LICENSE</span>
                </div>
                <h3 className="plan-tier-name">Basic Starter</h3>
                <p className="plan-tier-desc">Essential inventory control, GST Rule 55 delivery challans, and customer CRM for emerging distributors.</p>
              </div>

              <div className="plan-card-pricing">
                <div className="flex-center items-baseline gap-4">
                  <span className="plan-price-val">{basicPrice.price}</span>
                  <span className="plan-price-period">{basicPrice.period}</span>
                </div>
                <div className="plan-saving-callout">{basicPrice.savingText}</div>
              </div>

              {/* License & Expiry Specs Box */}
              <div className="plan-license-spec-box">
                <div className="spec-row">
                  <span className="spec-label flex-center gap-6">
                    <IconUsers size={13} className="color-tertiary" />
                    <span>User Seats:</span>
                  </span>
                  <span className="spec-value font-semibold">3 Team Logins</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label flex-center gap-6">
                    <IconClock size={13} className="color-tertiary" />
                    <span>License Term:</span>
                  </span>
                  <span className="spec-value font-mono">{billingCycle === 'YEARLY' ? '365 Days' : billingCycle === 'QUARTERLY' ? '90 Days' : '30 Days'} (+7d Grace)</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label flex-center gap-6">
                    <IconTruck size={13} className="color-tertiary" />
                    <span>Warehouse Hubs:</span>
                  </span>
                  <span className="spec-value">1 Active Hub</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label flex-center gap-6">
                    <IconPackage size={13} className="color-tertiary" />
                    <span>SKU Catalog:</span>
                  </span>
                  <span className="spec-value">Up to 500 SKUs</span>
                </div>
              </div>

              <div className="plan-features-list">
                <div className="plan-feature-header">INCLUDED CAPABILITIES:</div>
                {[
                  'GST Rule 55 statutory Delivery Challans',
                  'Automatic intra/inter state tax splitting',
                  'Customer CRM with GSTIN verification',
                  'Dynamic min/max reorder alerts',
                  'Stock movement audit logging',
                  'Cryptographic license key dispatch',
                ].map((feat) => (
                  <div key={feat} className="plan-feature-item">
                    <IconCheck size={14} className="color-success shrink-0" />
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
                  {checkoutLoading === 'BASIC' ? 'Initiating Activation…' : `Activate Basic License · ${basicPrice.price}`}
                </button>
              </div>
            </div>

            {/* Tier 2: Premium Plan (Featured) */}
            <div className="modern-plan-card modern-plan-card--featured">
              <div className="featured-ribbon-badge">★ MOST POPULAR &amp; RECOMMENDED</div>

              <div className="plan-card-header">
                <div className="plan-tier-top">
                  <div className="plan-tier-icon-box plan-tier-icon-box--pro">
                    <IconZap size={20} className="color-primary" />
                  </div>
                  <span className="plan-license-pill plan-license-pill--pro">GROWTH LICENSE</span>
                </div>
                <h3 className="plan-tier-name color-primary">Growth Pro</h3>
                <p className="plan-tier-desc">Full inventory intelligence, automated vendor POs, AIM demand runway simulator, and all 4 role dashboards.</p>
              </div>

              <div className="plan-card-pricing">
                <div className="flex-center items-baseline gap-4">
                  <span className="plan-price-val color-primary">{premiumPrice.price}</span>
                  <span className="plan-price-period">{premiumPrice.period}</span>
                </div>
                <div className="plan-saving-callout color-success font-semibold">{premiumPrice.savingText}</div>
              </div>

              {/* License & Expiry Specs Box */}
              <div className="plan-license-spec-box plan-license-spec-box--pro">
                <div className="spec-row">
                  <span className="spec-label flex-center gap-6">
                    <IconUsers size={13} className="color-primary" />
                    <span>User Seats:</span>
                  </span>
                  <span className="spec-value font-semibold color-primary">10 Team Logins (All 4 Roles)</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label flex-center gap-6">
                    <IconClock size={13} className="color-primary" />
                    <span>License Term:</span>
                  </span>
                  <span className="spec-value font-mono">{billingCycle === 'YEARLY' ? '365 Days' : billingCycle === 'QUARTERLY' ? '90 Days' : '30 Days'} (+7d Grace)</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label flex-center gap-6">
                    <IconTruck size={13} className="color-primary" />
                    <span>Warehouse Hubs:</span>
                  </span>
                  <span className="spec-value font-semibold">Unlimited Warehouses</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label flex-center gap-6">
                    <IconPackage size={13} className="color-primary" />
                    <span>SKU Catalog:</span>
                  </span>
                  <span className="spec-value font-semibold">Unlimited SKUs</span>
                </div>
              </div>

              <div className="plan-features-list">
                <div className="plan-feature-header">EVERYTHING IN BASIC, PLUS:</div>
                {[
                  'All 4 Role Profiles (Admin, Sales, WH, Accounts)',
                  'AIM 12-Month Demand Runway Optimizer',
                  'Zone Barcode Stock Taking & Cycle Count',
                  'BOM Multi-Component Production Assemblies',
                  '1-Click Automated Vendor POs with 18% GST',
                  'Priority 24/7 SLA Customer & Technical Support',
                ].map((feat) => (
                  <div key={feat} className="plan-feature-item">
                    <IconCheck size={14} className="color-success shrink-0" />
                    <span className="font-medium color-primary">{feat}</span>
                  </div>
                ))}
              </div>

              <div className="plan-card-action">
                <button
                  type="button"
                  id="pricing-premium"
                  className="btn btn-primary w-full justify-center btn-lg shadow-purple"
                  disabled={checkoutLoading === 'PREMIUM'}
                  onClick={() => void handlePlanCheckout('PREMIUM')}
                >
                  <IconZap size={16} />
                  {checkoutLoading === 'PREMIUM' ? 'Initiating Activation…' : `Activate Growth Pro · ${premiumPrice.price}`}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs mt-6 w-full justify-center fs-11 color-secondary"
                  onClick={() => void handleStartTrial()}
                  disabled={checkoutLoading === 'TRIAL'}
                >
                  Or Start 7-Day Free Trial (₹0 Today)
                </button>
              </div>
            </div>

            {/* Tier 3: Enterprise Fleet License */}
            <div className="modern-plan-card">
              <div className="plan-card-header">
                <div className="plan-tier-top">
                  <div className="plan-tier-icon-box">
                    <IconShieldCheck size={20} className="color-secondary" />
                  </div>
                  <span className="plan-license-pill">FLEET LICENSE</span>
                </div>
                <h3 className="plan-tier-name">Fleet Multi-Branch</h3>
                <p className="plan-tier-desc">Multi-branch enterprises, custom GST compliance rules, ERP data migration, and dedicated SLA governance.</p>
              </div>

              <div className="plan-card-pricing">
                <div className="flex-center items-baseline gap-4">
                  <span className="plan-price-val">{enterprisePrice.price}</span>
                  <span className="plan-price-period">{enterprisePrice.period}</span>
                </div>
                <div className="plan-saving-callout">{enterprisePrice.savingText}</div>
              </div>

              {/* License & Expiry Specs Box */}
              <div className="plan-license-spec-box">
                <div className="spec-row">
                  <span className="spec-label flex-center gap-6">
                    <IconUsers size={13} className="color-tertiary" />
                    <span>User Seats:</span>
                  </span>
                  <span className="spec-value font-semibold">Unlimited Team Seats</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label flex-center gap-6">
                    <IconClock size={13} className="color-tertiary" />
                    <span>License Term:</span>
                  </span>
                  <span className="spec-value font-mono">Annual Multi-Year Contract</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label flex-center gap-6">
                    <IconTruck size={13} className="color-tertiary" />
                    <span>Multi-Branch:</span>
                  </span>
                  <span className="spec-value">Multi-State GSTINs</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label flex-center gap-6">
                    <IconShield size={13} className="color-tertiary" />
                    <span>SLA &amp; Support:</span>
                  </span>
                  <span className="spec-value">1-Hour SLA Dedicated</span>
                </div>
              </div>

              <div className="plan-features-list">
                <div className="plan-feature-header">ENTERPRISE ADVANTAGES:</div>
                {[
                  'Custom ERP & Tally data migration pipeline',
                  'Dedicated PostgreSQL database instance',
                  'SSO / SAML 2.0 & Okta authentication',
                  'Custom GST E-way Bill API integration',
                  'Quarterly business review & training',
                  'Custom contract & direct bank NEFT billing',
                ].map((feat) => (
                  <div key={feat} className="plan-feature-item">
                    <IconCheck size={14} className="color-success shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <div className="plan-card-action">
                <button
                  type="button"
                  id="pricing-enterprise"
                  className="btn btn-secondary w-full justify-center"
                  disabled={checkoutLoading === 'ENTERPRISE'}
                  onClick={() => void handlePlanCheckout('ENTERPRISE')}
                >
                  {checkoutLoading === 'ENTERPRISE' ? 'Initiating…' : `Activate Fleet License · ${enterprisePrice.price}`}
                </button>
              </div>
            </div>
          </div>

          {/* Complete Feature Comparison Table */}
          <div className="comparison-table-wrapper">
            <div className="comparison-table-header">
              <div>
                <h3 className="fs-16 fw-800 color-primary">Complete Plan Feature Comparison</h3>
                <p className="fs-12 color-secondary mt-2">Itemized capability checklist across all subscription tiers.</p>
              </div>
              <span className="badge badge-success text-xxs">100% Feature Parity Guarantee</span>
            </div>

            <table className="comparison-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Operational Capability</th>
                  <th style={{ width: '20%' }}>Basic Starter</th>
                  <th style={{ width: '20%' }} className="highlight-col">Growth Pro (★)</th>
                  <th style={{ width: '20%' }}>Fleet Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feat: 'User Seats License', basic: '3 Seats', pro: '10 Seats', ent: 'Unlimited Seats' },
                  { feat: 'License Validity Terms', basic: '30 / 90 / 365 Days', pro: '30 / 90 / 365 Days', ent: 'Multi-Year Contract' },
                  { feat: 'Zero Data-Loss Grace Period', basic: '7 Days', pro: '7 Days', ent: '14 Days' },
                  { feat: 'GST Rule 55 Delivery Challans', basic: '✓ Included', pro: '✓ Included', ent: '✓ Multi-State' },
                  { feat: 'Automatic Intra/Inter State GST Split', basic: '✓ CGST+SGST/IGST', pro: '✓ CGST+SGST/IGST', ent: '✓ Custom Rules' },
                  { feat: 'Customer CRM & Follow-Up Radar', basic: '✓ Up to 100 Accts', pro: '✓ Unlimited Accts', ent: '✓ Dedicated DB' },
                  { feat: 'Warehouse Locations Supported', basic: '1 Warehouse', pro: 'Unlimited Hubs', ent: 'Multi-Branch Fleet' },
                  { feat: 'SKU Catalog Capacity', basic: '500 SKUs', pro: 'Unlimited SKUs', ent: 'Unlimited SKUs' },
                  { feat: 'Role Profiles (Admin, Sales, WH, Accts)', basic: 'Admin + Sales Only', pro: 'All 4 Role Dashboards', ent: 'Custom Granular RBAC' },
                  { feat: 'Barcode Scanner Cycle Counts', basic: '—', pro: '✓ USB / Bluetooth HID', ent: '✓ Industrial Handhelds' },
                  { feat: 'AIM 12-Month Demand Runway Optimizer', basic: '—', pro: '✓ Included', ent: '✓ Custom ML Models' },
                  { feat: '1-Click Export GST Tax Audit CSV', basic: '✓ Basic CSV', pro: '✓ Full CA Audit Pack', ent: '✓ GSTR-1 API Sync' },
                  { feat: 'Technical Support SLA', basic: 'Email (24h)', pro: 'Priority Chat & Phone (2h)', ent: 'Dedicated Mgr (1h SLA)' },
                ].map((row, idx) => (
                  <tr key={idx}>
                    <td className="feature-col">{row.feat}</td>
                    <td>{row.basic.startsWith('✓') ? <span className="feature-check-icon">{row.basic}</span> : row.basic}</td>
                    <td className="highlight-col">{row.pro.startsWith('✓') ? <span className="feature-check-icon">{row.pro}</span> : row.pro}</td>
                    <td>{row.ent.startsWith('✓') ? <span className="feature-check-icon">{row.ent}</span> : row.ent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Trust Footnote */}
          <div className="pricing-trust-strip">
            <div className="trust-item"><IconShield size={14} className="color-success" /> Instant License Key Dispatch via SMS &amp; Email</div>
            <div className="trust-item"><IconCheck size={14} className="color-success" /> 7-Day Zero-Risk Free Trial on All Plans</div>
            <div className="trust-item"><IconLock size={14} className="color-success" /> 256-Bit Encrypted Razorpay Checkout</div>
            <div className="trust-item"><IconFileText size={14} className="color-success" /> Automated GST Invoices with 18% Input Credit</div>
          </div>
        </div>
      </section>

      {/* ── FAQ Section with Category Filters ────────────────────────────── */}
      <section id="faqs" className="landing-section landing-section--alt" aria-labelledby="faq-heading">
        <div className="landing-container">
          <div className="landing-section-header">
            <div className="landing-section-tag">Frequently Asked Questions</div>
            <h2 id="faq-heading" className="landing-section-title">Everything you need to know.</h2>
            <p className="landing-section-desc">
              Clear answers regarding licensing, team onboarding, GST Rule 55 compliance, and barcode scanning.
            </p>

            {/* Category Filter Chips */}
            <div className="faq-filter-chips" role="group" aria-label="FAQ Categories">
              {[
                { id: 'ALL', label: 'All Questions' },
                { id: 'LICENSE', label: 'Licensing & Security' },
                { id: 'PRICING', label: 'Pricing & Free Trial' },
                { id: 'GST', label: 'GST & Rule 55' },
                { id: 'WAREHOUSE', label: 'Warehouse & Barcodes' },
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

      {/* ── Final Call to Action ────────────────────────────────────────── */}
      <section className="landing-final-cta" aria-labelledby="final-cta-heading">
        <div className="landing-container">
          <div className="landing-final-cta__inner">
            <div className="landing-eyebrow-pill mb-16 inline-block">Instant Setup • No IT Required</div>
            <h2 id="final-cta-heading" className="landing-final-cta__title">
              Bring your entire B2B operations into the modern era.
            </h2>
            <p className="landing-final-cta__desc">
              Join leading Indian distributors, manufacturers, and wholesalers who operate faster, eliminate stock errors, and deliver with 100% GST compliance.
            </p>
            <div className="landing-final-cta__actions">
              <button
                type="button"
                id="final-cta-get-started"
                className="btn btn-primary btn-lg shadow-purple"
                onClick={handleStartTrial}
                disabled={checkoutLoading === 'TRIAL'}
              >
                <IconZap size={16} />
                {checkoutLoading === 'TRIAL' ? 'Setting up Trial…' : 'Start 7-Day Free Trial (₹0 Today)'}
              </button>
              <Link to="/login" id="final-cta-explore" className="btn btn-ghost btn-lg">
                Sign In to Workspace
              </Link>
            </div>
            <div className="landing-final-cta__note">
              <IconShield size={13} className="color-success" />
              7-Day Free Trial • Encrypted License Key • Zero Risk • Cancel Anytime
            </div>
          </div>
        </div>
      </section>
    </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="landing-footer" role="contentinfo">
        <div className="landing-container">
          <div className="landing-footer-grid">
            <div>
              <div className="flex-center gap-10 mb-12">
                <div className="logo-mark" aria-hidden="true">S</div>
                <span className="logo-text">StockPulse</span>
              </div>
              <p className="fs-13 color-secondary line-height-16 mb-16" style={{ maxWidth: 280 }}>
                A focused B2B operations platform connecting CRM, sales, live inventory, delivery challans, GST compliance, and audit intelligence.
              </p>
              <div className="fs-12 color-tertiary flex-center gap-8">
                <span className="badge badge-success" style={{ fontSize: 10 }}>🟢 Systems Operational</span>
                <span>PostgreSQL 16 · TLS 1.3</span>
              </div>
            </div>

            <div>
              <div className="landing-footer-col-title">Platform Modules</div>
              <ul className="landing-footer-links" role="list">
                {[
                  { label: 'Executive Command Center', href: '#showcase' },
                  { label: 'Inventory & Warehouse', href: '#showcase' },
                  { label: 'GST Rule 55 Challans', href: '#showcase' },
                  { label: 'Customer CRM 360', href: '#showcase' },
                  { label: 'Plans & Pricing', href: '#pricing' },
                ].map((l) => (
                  <li key={l.label}><a href={l.href} className="landing-footer-link">{l.label}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <div className="landing-footer-col-title">Security & Compliance</div>
              <ul className="landing-footer-links" role="list">
                {[
                  { label: 'Statutory GST Rule 55', href: '#showcase' },
                  { label: 'Role-Based Access (RBAC)', href: '#showcase' },
                  { label: '256-Bit Razorpay Payments', href: '#pricing' },
                  { label: '7-Day Grace Protection', href: '#pricing' },
                  { label: 'Audit Trail Ledger Logs', href: '#workflow' },
                ].map((l) => (
                  <li key={l.label}><a href={l.href} className="landing-footer-link">{l.label}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <div className="landing-footer-col-title">Quick Activation</div>
              <div className="flex-col gap-8 mb-16">
                <button
                  type="button"
                  className="btn btn-primary btn-sm justify-center"
                  onClick={handleStartTrial}
                  disabled={checkoutLoading === 'TRIAL'}
                >
                  Start Free Trial
                </button>
                <Link to="/login" className="btn btn-secondary btn-sm justify-center">
                  Sign In
                </Link>
              </div>
              <div className="fs-12 color-tertiary">
                <div>Starter: ₹149/mo (3 Seats)</div>
                <div>Pro: ₹499/mo (10 Seats)</div>
              </div>
            </div>
          </div>

          <div className="landing-footer-bottom">
            <span>© 2026 StockPulse SaaS Technologies. Built for Indian B2B Supply Chains 🇮🇳</span>
            <div className="flex-center gap-16">
              <a href="#faqs" className="landing-footer-link">Privacy Policy</a>
              <span aria-hidden="true">·</span>
              <a href="#pricing" className="landing-footer-link">Terms of Service</a>
              <span aria-hidden="true">·</span>
              <a href="#faqs" className="landing-footer-link">GST Declaration</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ── High-Res Dashboard Lightbox Modal ────────────────────── */}
      {lightboxData && (
        <div className="dashboard-lightbox-backdrop" onClick={closeLightbox}>
          <div className="dashboard-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="dashboard-lightbox-header">
              <div className="flex-center gap-8">
                <span className="live-pulse-dot" />
                <span className="dashboard-lightbox-title">{lightboxData.title}</span>
              </div>
              <button
                type="button"
                className="dashboard-lightbox-close"
                onClick={closeLightbox}
                aria-label="Close Preview"
              >
                ✕
              </button>
            </div>
            <div className="dashboard-lightbox-body">
              <img
                src={lightboxData.src}
                alt={lightboxData.title}
                className="dashboard-lightbox-img"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;
