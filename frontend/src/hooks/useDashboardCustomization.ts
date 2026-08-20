import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Role } from '../types';

export interface DashboardElementVisibility {
  // Global Major Sections
  healthStrip: boolean;
  kpiStats: boolean;
  quickActions: boolean;
  analyticsCharts: boolean;
  lowStockSection: boolean;
  activityStream: boolean;
  secondaryWidgets: boolean;

  // Granular KPI Stat Cards
  statCard1: boolean;
  statCard2: boolean;
  statCard3: boolean;
  statCard4: boolean;
}

export const DEFAULT_DASHBOARD_CONFIG: DashboardElementVisibility = {
  healthStrip: true,
  kpiStats: true,
  quickActions: true,
  analyticsCharts: true,
  lowStockSection: true,
  activityStream: true,
  secondaryWidgets: true,
  statCard1: true,
  statCard2: true,
  statCard3: true,
  statCard4: true,
};

export interface DashboardPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  config: DashboardElementVisibility;
}

export const DASHBOARD_PRESETS: DashboardPreset[] = [
  {
    id: 'all',
    name: 'All Elements',
    badge: 'DEFAULT',
    description: 'Display complete command center with all KPI stats, charts, action launchpads, and live feeds.',
    config: { ...DEFAULT_DASHBOARD_CONFIG },
  },
  {
    id: 'kpis_only',
    name: 'KPIs & Quick Actions',
    badge: 'EXECUTIVE',
    description: 'High-level overview focused purely on core metrics, status indicators, and fast-action shortcuts.',
    config: {
      healthStrip: true,
      kpiStats: true,
      quickActions: true,
      analyticsCharts: false,
      lowStockSection: false,
      activityStream: false,
      secondaryWidgets: false,
      statCard1: true,
      statCard2: true,
      statCard3: true,
      statCard4: true,
    },
  },
  {
    id: 'analytics',
    name: 'Analytics & Trends',
    badge: 'DATA HEAVY',
    description: 'Visual data mode prioritizing financial graphs, stock velocities, and audit trail movements.',
    config: {
      healthStrip: false,
      kpiStats: true,
      quickActions: false,
      analyticsCharts: true,
      lowStockSection: false,
      activityStream: true,
      secondaryWidgets: true,
      statCard1: true,
      statCard2: true,
      statCard3: true,
      statCard4: true,
    },
  },
  {
    id: 'compact',
    name: 'Essential Alerts Only',
    badge: 'MINIMAL',
    description: 'Distraction-free triage mode highlighting critical stock alerts, low inventory, and active queues.',
    config: {
      healthStrip: false,
      kpiStats: true,
      quickActions: false,
      analyticsCharts: false,
      lowStockSection: true,
      activityStream: false,
      secondaryWidgets: true,
      statCard1: false,
      statCard2: true,
      statCard3: true,
      statCard4: false,
    },
  },
];

export interface ElementLabelDefinition {
  label: string;
  description: string;
  category: 'stats' | 'sections' | 'widgets';
}

export function getDashboardElementLabels(role: Role): Record<keyof DashboardElementVisibility, ElementLabelDefinition> {
  switch (role) {
    case 'SALES':
      return {
        healthStrip: {
          label: 'System Operational Health Strip',
          description: 'Live indicator showing sync status and platform health.',
          category: 'sections',
        },
        kpiStats: {
          label: 'Sales KPI Summary Grid',
          description: 'Master toggle for the 4 sales and CRM metric cards.',
          category: 'stats',
        },
        statCard1: {
          label: 'Active CRM Leads',
          description: 'Tracks prospect pipeline count & active client ratios.',
          category: 'stats',
        },
        statCard2: {
          label: 'Orders Dispatched Today',
          description: 'Daily confirmed shipments and delivery throughput.',
          category: 'stats',
        },
        statCard3: {
          label: 'Drafts Requiring Sign-off',
          description: 'Challans awaiting executive or customer confirmation.',
          category: 'stats',
        },
        statCard4: {
          label: 'New Accounts (This Month)',
          description: 'Monthly client acquisition velocity and growth pace.',
          category: 'stats',
        },
        quickActions: {
          label: 'Sales Quick Actions',
          description: 'Fast launch buttons to create delivery challans & add leads.',
          category: 'sections',
        },
        analyticsCharts: {
          label: 'Sales & Inventory Visualizations',
          description: 'Trend charts for volume flows and category performance.',
          category: 'sections',
        },
        lowStockSection: {
          label: 'Stock Alerts & Safety Check',
          description: 'Warning indicators for inventory items below safety thresholds.',
          category: 'widgets',
        },
        secondaryWidgets: {
          label: 'Follow-Up Radar & Catalog Availability',
          description: 'Side-by-side widgets for customer reminders & live stock check.',
          category: 'widgets',
        },
        activityStream: {
          label: 'Recent Customer Delivery Challans',
          description: 'Table of recent customer shipments with status & date.',
          category: 'widgets',
        },
      };

    case 'WAREHOUSE':
      return {
        healthStrip: {
          label: 'Warehouse Operational Health Strip',
          description: 'Live sensor showing sync status and node connectivity.',
          category: 'sections',
        },
        kpiStats: {
          label: 'Warehouse KPI Summary Grid',
          description: 'Master toggle for catalog SKUs, velocity, and stock health.',
          category: 'stats',
        },
        statCard1: {
          label: 'Active Inventory SKUs',
          description: 'Total active catalog items managed across warehouse bins.',
          category: 'stats',
        },
        statCard2: {
          label: 'Low Stock Safety Alerts',
          description: 'Products requiring replenishment below minimum threshold.',
          category: 'stats',
        },
        statCard3: {
          label: 'Out of Stock (Zero Units)',
          description: 'Depleted SKUs needing immediate supplier restock.',
          category: 'stats',
        },
        statCard4: {
          label: '7-Day Movement Velocity',
          description: 'Inflow vs outflow units over the trailing 7 days.',
          category: 'stats',
        },
        quickActions: {
          label: 'Warehouse Operations Action Grid',
          description: 'Shortcuts to manage bin locations and audit material logs.',
          category: 'sections',
        },
        analyticsCharts: {
          label: 'Material Movement Charts',
          description: 'Graphs displaying warehouse throughput & velocity.',
          category: 'sections',
        },
        lowStockSection: {
          label: 'Restock Priority Matrix',
          description: 'Visual progress meters with 1-click Inward Stock buttons.',
          category: 'widgets',
        },
        secondaryWidgets: {
          label: 'Pending Dispatch Prep Queue',
          description: 'Draft challans queued for packing & material staging.',
          category: 'widgets',
        },
        activityStream: {
          label: 'Recent Inflow & Outflow Movement Stream',
          description: 'Real-time audit log of stock inward and outbound dispatches.',
          category: 'widgets',
        },
      };

    case 'ACCOUNTS':
      return {
        healthStrip: {
          label: 'Financial Health & GST Compliance Strip',
          description: 'Live system status & tax engine readiness.',
          category: 'sections',
        },
        kpiStats: {
          label: 'Finance & Accounting KPI Grid',
          description: 'Master toggle for capital, billing slips, and tax compliance.',
          category: 'stats',
        },
        statCard1: {
          label: 'Total Capital in Inventory',
          description: 'Total material asset valuation in INR.',
          category: 'stats',
        },
        statCard2: {
          label: 'Confirmed Billing Slips',
          description: 'Revenue-recognized confirmed delivery challans.',
          category: 'stats',
        },
        statCard3: {
          label: 'Unconfirmed Draft Invoices',
          description: 'Pending billing documents awaiting finalization.',
          category: 'stats',
        },
        statCard4: {
          label: 'Tax Compliant Entities (GST)',
          description: 'Verified GSTIN registration status across accounts.',
          category: 'stats',
        },
        quickActions: {
          label: 'Accounts Export & Action Grid',
          description: 'One-click CSV tax audits, invoice browser, and audit logs.',
          category: 'sections',
        },
        analyticsCharts: {
          label: 'Revenue & Valuation Charts',
          description: 'Financial trend charts and capital movement breakdowns.',
          category: 'sections',
        },
        lowStockSection: {
          label: 'Material Valuation Details',
          description: 'Asset valuation insights and category distributions.',
          category: 'widgets',
        },
        secondaryWidgets: {
          label: 'GST Compliance & Tax Breakdown',
          description: 'Summary of intra-state (CGST/SGST) & inter-state tax rules.',
          category: 'widgets',
        },
        activityStream: {
          label: 'Recent Invoice Billing Queue',
          description: 'Live table showing invoice status of recent dispatches.',
          category: 'widgets',
        },
      };

    case 'ADMIN':
    default:
      return {
        healthStrip: {
          label: 'Executive Operational Health Strip',
          description: 'Real-time sync heartbeat and operational status.',
          category: 'sections',
        },
        kpiStats: {
          label: 'Executive KPI Metrics Grid',
          description: 'Master toggle for CRM, Inventory, Valuation, and Challans.',
          category: 'stats',
        },
        statCard1: {
          label: 'Accounts & Leads (CRM)',
          description: 'Active client accounts, pipeline leads, and monthly growth.',
          category: 'stats',
        },
        statCard2: {
          label: 'Catalog Inventory & Alerts',
          description: 'Total SKU count and low/out-of-stock safety flags.',
          category: 'stats',
        },
        statCard3: {
          label: 'Asset Valuation (INR)',
          description: 'Total capitalized inventory valuation with 7-day flow.',
          category: 'stats',
        },
        statCard4: {
          label: 'Delivery Challans Summary',
          description: 'Confirmed dispatches and pending draft shipments.',
          category: 'stats',
        },
        quickActions: {
          label: 'Executive Action Shortcuts',
          description: 'Quick links to create dispatches, manage CRM, and view reports.',
          category: 'sections',
        },
        analyticsCharts: {
          label: 'Analytics & Trend Visualizations',
          description: 'Revenue trajectory, category splits, and stock velocity.',
          category: 'sections',
        },
        lowStockSection: {
          label: 'Critical Stock Priority',
          description: 'Priority replenishment list with 1-click inward restock.',
          category: 'widgets',
        },
        secondaryWidgets: {
          label: 'Operational Secondary Widgets',
          description: 'Auxiliary widgets customized for operational focus.',
          category: 'widgets',
        },
        activityStream: {
          label: 'Recent Inventory Audit Stream',
          description: 'Live timeline of recent material inflows and outbound shipments.',
          category: 'widgets',
        },
      };
  }
}

const STORAGE_PREFIX = 'stockpulse_dash_config_v1';

export function useDashboardCustomization(userId?: string, role: Role = 'ADMIN') {
  const storageKey = useMemo(() => {
    return `${STORAGE_PREFIX}_${userId || 'default'}_${role}`;
  }, [userId, role]);

  const [config, setConfig] = useState<DashboardElementVisibility>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<DashboardElementVisibility>;
        return { ...DEFAULT_DASHBOARD_CONFIG, ...parsed };
      }
    } catch {
      // ignore storage parse errors
    }
    return { ...DEFAULT_DASHBOARD_CONFIG };
  });

  // Reload config when switching user or role view
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<DashboardElementVisibility>;
        setConfig({ ...DEFAULT_DASHBOARD_CONFIG, ...parsed });
      } else {
        setConfig({ ...DEFAULT_DASHBOARD_CONFIG });
      }
    } catch {
      setConfig({ ...DEFAULT_DASHBOARD_CONFIG });
    }
  }, [storageKey]);

  // Persist whenever config updates
  const saveConfig = useCallback(
    (newConfig: DashboardElementVisibility) => {
      setConfig(newConfig);
      try {
        localStorage.setItem(storageKey, JSON.stringify(newConfig));
      } catch {
        // ignore localStorage quota errors
      }
    },
    [storageKey]
  );

  const toggleElement = useCallback(
    (key: keyof DashboardElementVisibility) => {
      saveConfig({
        ...config,
        [key]: !config[key],
      });
    },
    [config, saveConfig]
  );

  const setElement = useCallback(
    (key: keyof DashboardElementVisibility, value: boolean) => {
      saveConfig({
        ...config,
        [key]: value,
      });
    },
    [config, saveConfig]
  );

  const applyPreset = useCallback(
    (presetId: string) => {
      const found = DASHBOARD_PRESETS.find((p) => p.id === presetId);
      if (found) {
        saveConfig({ ...found.config });
      }
    },
    [saveConfig]
  );

  const resetToDefaults = useCallback(() => {
    saveConfig({ ...DEFAULT_DASHBOARD_CONFIG });
  }, [saveConfig]);

  // Calculate statistics
  const keys = Object.keys(DEFAULT_DASHBOARD_CONFIG) as (keyof DashboardElementVisibility)[];
  const totalElements = keys.length;
  const visibleCount = keys.filter((k) => config[k]).length;
  const hiddenCount = totalElements - visibleCount;

  const isAllStatsHidden =
    !config.kpiStats || (!config.statCard1 && !config.statCard2 && !config.statCard3 && !config.statCard4);

  const isAllElementsHidden = visibleCount === 0;

  return {
    config,
    toggleElement,
    setElement,
    applyPreset,
    resetToDefaults,
    hasHiddenElements: hiddenCount > 0,
    hiddenCount,
    visibleCount,
    totalElements,
    isAllStatsHidden,
    isAllElementsHidden,
  };
}
