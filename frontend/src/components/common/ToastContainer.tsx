import React from 'react';
import type { Toast } from '../../hooks/useToast';

const TOAST_ICONS: Record<Toast['type'], string> = {
  success: '✅',
  error:   '❌',
  warning: '⚠️',
  info:    'ℹ️',
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps): React.ReactElement {
  return (
    <div
      className={`toast toast--${toast.type}`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <span className="toast__icon" aria-hidden>
        {TOAST_ICONS[toast.type]}
      </span>
      <span className="toast__message">{toast.message}</span>
      <button
        className="toast__close"
        onClick={() => onRemove(toast.id)}
        aria-label="Dismiss notification"
        type="button"
      >
        ✕
      </button>
    </div>
  );
}

export interface ToastContainerProps {
  toasts: Toast[];
  onRemove?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove, onDismiss }: ToastContainerProps): React.ReactElement {
  const dismissHandler = onDismiss || onRemove || (() => {});
  return (
    <div className="toast-container" aria-label="Notifications">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={dismissHandler} />
      ))}
    </div>
  );
}
