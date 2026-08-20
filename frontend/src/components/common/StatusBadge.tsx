import React from 'react';
import type { CustomerStatus, ChallanStatus } from '../../types';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info';

interface StatusBadgeProps {
  variant: BadgeVariant;
  label: string;
  className?: string;
}

const CUSTOMER_STATUS_MAP: Record<CustomerStatus, { variant: BadgeVariant; label: string }> = {
  ACTIVE:   { variant: 'success', label: 'Active' },
  LEAD:     { variant: 'info',    label: 'Lead' },
  INACTIVE: { variant: 'danger',  label: 'Inactive' },
};

const CHALLAN_STATUS_MAP: Record<ChallanStatus, { variant: BadgeVariant; label: string }> = {
  CONFIRMED: { variant: 'success', label: 'Confirmed' },
  DRAFT:     { variant: 'warning', label: 'Draft' },
  CANCELLED: { variant: 'danger',  label: 'Cancelled' },
};

/**
 * Renders a styled status badge pill.
 * Use the convenience helpers `StatusBadge.customer()` and `StatusBadge.challan()`
 * to avoid mapping statuses manually.
 */
export const StatusBadge: React.FC<StatusBadgeProps> & {
  customer: (status: CustomerStatus) => React.ReactElement;
  challan: (status: ChallanStatus) => React.ReactElement;
} = ({ variant, label, className }) => (
  <span className={`badge badge-${variant} ${className ?? ''}`.trim()}>
    {label}
  </span>
);

StatusBadge.customer = (status: CustomerStatus): React.ReactElement => {
  const { variant, label } = CUSTOMER_STATUS_MAP[status] ?? { variant: 'info' as BadgeVariant, label: status };
  return <StatusBadge variant={variant} label={label} />;
};

StatusBadge.challan = (status: ChallanStatus): React.ReactElement => {
  const { variant, label } = CHALLAN_STATUS_MAP[status] ?? { variant: 'info' as BadgeVariant, label: status };
  return <StatusBadge variant={variant} label={label} />;
};
