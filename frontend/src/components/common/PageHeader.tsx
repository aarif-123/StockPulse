import React from 'react';
import { Link } from 'react-router-dom';
import { IconArrowLeft } from './Icons';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Renders a "← Back to X" link above the title */
  backTo?: { label: string; href: string };
  /** Right-side action buttons slot */
  actions?: React.ReactNode;
}

/**
 * Consistent page header used across all pages.
 * Provides title, optional subtitle, optional back-link breadcrumb, and an action slot.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, backTo, actions }) => (
  <div className="page-header">
    <div>
      {backTo && (
        <Link to={backTo.href} className="page-header__back">
          <IconArrowLeft size={14} />
          {backTo.label}
        </Link>
      )}
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
    </div>
    {actions && <div className="page-header__actions">{actions}</div>}
  </div>
);
