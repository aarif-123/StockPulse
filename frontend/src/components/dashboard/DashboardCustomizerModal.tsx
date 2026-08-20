import React from 'react';
import {
  type DashboardElementVisibility,
  getDashboardElementLabels,
  DASHBOARD_PRESETS,
} from '../../hooks/useDashboardCustomization';
import type { Role } from '../../types';
import {
  IconSliders,
  IconCheck,
  IconRefresh,
  IconEye,
  IconEyeOff,
  IconPackage,
  IconUsers,
  IconBarChart,
  IconTruck,
  IconIndianRupee,
  IconLayers,
  IconAlertTriangle,
} from '../common/Icons';

interface DashboardCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role;
  config: DashboardElementVisibility;
  onToggle: (key: keyof DashboardElementVisibility) => void;
  onSetElement: (key: keyof DashboardElementVisibility, value: boolean) => void;
  onApplyPreset: (presetId: string) => void;
  onReset: () => void;
  visibleCount: number;
  totalElements: number;
}

export const DashboardCustomizerModal: React.FC<DashboardCustomizerModalProps> = ({
  isOpen,
  onClose,
  role,
  config,
  onToggle,
  onSetElement,
  onApplyPreset,
  onReset,
  visibleCount,
  totalElements,
}) => {
  if (!isOpen) return null;

  const labels = getDashboardElementLabels(role);

  // Helper icon lookup for stat cards depending on card number & role
  const getStatCardIcon = (key: 'statCard1' | 'statCard2' | 'statCard3' | 'statCard4') => {
    switch (key) {
      case 'statCard1':
        return <IconUsers size={16} />;
      case 'statCard2':
        return <IconPackage size={16} />;
      case 'statCard3':
        return role === 'ACCOUNTS' || role === 'ADMIN' ? <IconIndianRupee size={16} /> : <IconAlertTriangle size={16} />;
      case 'statCard4':
        return <IconTruck size={16} />;
      default:
        return <IconBarChart size={16} />;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content dash-customizer-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <div className="flex-center gap-12">
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(124, 58, 237, 0.15)',
                border: '1px solid rgba(124, 58, 237, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#c084fc',
              }}
            >
              <IconSliders size={20} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '18px', margin: 0 }}>
                Customize Dashboard Elements
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px', marginTop: '2px', marginBottom: 0 }}>
                Choose which stats, charts, and operational widgets to display on your screen.
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="dash-customizer-body" style={{ overflowY: 'auto', padding: '16px 4px', flex: 1 }}>
          {/* Quick Layout Presets */}
          <div className="dash-customizer-section">
            <div className="dash-customizer-section__title">
              <IconLayers size={14} className="color-primary" />
              Quick Layout Presets
            </div>
            <div className="dash-presets-grid">
              {DASHBOARD_PRESETS.map((preset) => {
                // Check if current config matches this preset
                const isMatch = Object.keys(preset.config).every(
                  (k) => preset.config[k as keyof DashboardElementVisibility] === config[k as keyof DashboardElementVisibility]
                );

                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`dash-preset-card ${isMatch ? 'dash-preset-card--active' : ''}`}
                    onClick={() => onApplyPreset(preset.id)}
                  >
                    <div className="dash-preset-card__header">
                      <span className="dash-preset-card__name">{preset.name}</span>
                      <span className="dash-preset-card__badge">{preset.badge}</span>
                    </div>
                    <div className="dash-preset-card__desc">{preset.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 1: KPI Stat Cards */}
          <div className="dash-customizer-section">
            <div className="dash-customizer-section__title-row">
              <div className="dash-customizer-section__title">
                <IconBarChart size={14} className="color-primary" />
                1. KPI Metric Cards
              </div>
              <div className="flex-center gap-8">
                <span className="fs-12 color-tertiary">Master Grid:</span>
                <label className="dash-toggle-switch" title="Toggle entire KPI stats grid">
                  <input
                    type="checkbox"
                    checked={config.kpiStats}
                    onChange={(e) => onSetElement('kpiStats', e.target.checked)}
                  />
                  <span className="dash-toggle-slider" />
                </label>
              </div>
            </div>

            <div
              className="dash-subcards-list"
              style={{ opacity: config.kpiStats ? 1 : 0.45, pointerEvents: config.kpiStats ? 'auto' : 'none' }}
            >
              {(['statCard1', 'statCard2', 'statCard3', 'statCard4'] as const).map((key) => {
                const item = labels[key];
                const isChecked = config[key];

                return (
                  <div
                    key={key}
                    className={`dash-item-row ${isChecked && config.kpiStats ? 'dash-item-row--active' : ''}`}
                    onClick={() => onToggle(key)}
                  >
                    <div className="dash-item-row__main">
                      <div className="dash-item-row__icon">{getStatCardIcon(key)}</div>
                      <div>
                        <div className="dash-item-row__label">{item.label}</div>
                        <div className="dash-item-row__desc">{item.description}</div>
                      </div>
                    </div>
                    <div className="flex-center gap-8">
                      {isChecked ? (
                        <span className="dash-status-pill dash-status-pill--visible">
                          <IconEye size={12} /> Visible
                        </span>
                      ) : (
                        <span className="dash-status-pill dash-status-pill--hidden">
                          <IconEyeOff size={12} /> Hidden
                        </span>
                      )}
                      <label
                        className="dash-toggle-switch"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggle(key)}
                        />
                        <span className="dash-toggle-slider" />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Core Platform Sections */}
          <div className="dash-customizer-section">
            <div className="dash-customizer-section__title">
              <IconPackage size={14} className="color-primary" />
              2. Navigation &amp; Analytics Sections
            </div>

            <div className="dash-subcards-list">
              {(['healthStrip', 'quickActions', 'analyticsCharts'] as const).map((key) => {
                const item = labels[key];
                const isChecked = config[key];

                return (
                  <div
                    key={key}
                    className={`dash-item-row ${isChecked ? 'dash-item-row--active' : ''}`}
                    onClick={() => onToggle(key)}
                  >
                    <div className="dash-item-row__main">
                      <div className="dash-item-row__icon">
                        {key === 'healthStrip' ? '⚡' : key === 'quickActions' ? '🚀' : '📈'}
                      </div>
                      <div>
                        <div className="dash-item-row__label">{item.label}</div>
                        <div className="dash-item-row__desc">{item.description}</div>
                      </div>
                    </div>
                    <div className="flex-center gap-8">
                      {isChecked ? (
                        <span className="dash-status-pill dash-status-pill--visible">
                          <IconEye size={12} /> Visible
                        </span>
                      ) : (
                        <span className="dash-status-pill dash-status-pill--hidden">
                          <IconEyeOff size={12} /> Hidden
                        </span>
                      )}
                      <label
                        className="dash-toggle-switch"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggle(key)}
                        />
                        <span className="dash-toggle-slider" />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Operational Feeds & Widgets */}
          <div className="dash-customizer-section">
            <div className="dash-customizer-section__title">
              <IconTruck size={14} className="color-primary" />
              3. Operational Feeds &amp; Live Queues
            </div>

            <div className="dash-subcards-list">
              {(['lowStockSection', 'secondaryWidgets', 'activityStream'] as const).map((key) => {
                const item = labels[key];
                const isChecked = config[key];

                return (
                  <div
                    key={key}
                    className={`dash-item-row ${isChecked ? 'dash-item-row--active' : ''}`}
                    onClick={() => onToggle(key)}
                  >
                    <div className="dash-item-row__main">
                      <div className="dash-item-row__icon">
                        {key === 'lowStockSection' ? '⚠️' : key === 'secondaryWidgets' ? '🗂️' : '📜'}
                      </div>
                      <div>
                        <div className="dash-item-row__label">{item.label}</div>
                        <div className="dash-item-row__desc">{item.description}</div>
                      </div>
                    </div>
                    <div className="flex-center gap-8">
                      {isChecked ? (
                        <span className="dash-status-pill dash-status-pill--visible">
                          <IconEye size={12} /> Visible
                        </span>
                      ) : (
                        <span className="dash-status-pill dash-status-pill--hidden">
                          <IconEyeOff size={12} /> Hidden
                        </span>
                      )}
                      <label
                        className="dash-toggle-switch"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggle(key)}
                        />
                        <span className="dash-toggle-slider" />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className="modal-footer"
          style={{
            borderTop: '1px solid var(--border-color)',
            paddingTop: '14px',
            marginTop: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div className="flex-center gap-8">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onReset}
              title="Reset all elements to default visibility"
            >
              <IconRefresh size={14} />
              Reset Defaults
            </button>
            <span className="fs-12 color-tertiary">
              {visibleCount} of {totalElements} elements active
            </span>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={onClose}
          >
            <IconCheck size={16} />
            Apply &amp; Done
          </button>
        </div>
      </div>
    </div>
  );
};
