import { useCallback, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastHelpers {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

export interface UseToastReturn {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
  toast: ToastHelpers;
}

let idCounter = 0;
const nextId = () => String(++idCounter);

/**
 * Hook that manages a list of transient toast notifications.
 * Auto-dismisses toasts after `dismissAfterMs` (default: 4000ms).
 *
 * Usage:
 *   const { toasts, toast, removeToast } = useToast();
 *   toast.success('Saved successfully!');
 *   toast.error('Failed to save.');
 */
export function useToast(dismissAfterMs = 4000): UseToastReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = nextId();
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => removeToast(id), dismissAfterMs);
    },
    [dismissAfterMs, removeToast],
  );

  const toast: ToastHelpers = {
    success: useCallback((msg: string) => showToast(msg, 'success'), [showToast]),
    error: useCallback((msg: string) => showToast(msg, 'error'), [showToast]),
    warning: useCallback((msg: string) => showToast(msg, 'warning'), [showToast]),
    info: useCallback((msg: string) => showToast(msg, 'info'), [showToast]),
  };

  return { toasts, showToast, removeToast, toast };
}
