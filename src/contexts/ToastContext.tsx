import { useState, useCallback, ReactNode, useRef } from "react";
import { ToastContext, Toast, ToastAction } from "./toastContextDef";

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    // Clear any pending timer
    const timer = timerRefs.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timerRefs.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = `toast-${++toastId}`;
    // Longer duration for toasts with actions (user needs time to click)
    const duration = toast.duration ?? (toast.action ? 8000 : 5000);

    setToasts((prev) => [...prev, { ...toast, id }]);

    if (duration > 0) {
      const timer = setTimeout(() => removeToast(id), duration);
      timerRefs.current.set(id, timer);
    }
  }, [removeToast]);

  const success = useCallback((title: string, message?: string, action?: ToastAction) => {
    addToast({ type: "success", title, message, action });
  }, [addToast]);

  const error = useCallback((title: string, message?: string) => {
    addToast({ type: "error", title, message, duration: 8000 });
  }, [addToast]);

  const warning = useCallback((title: string, message?: string) => {
    addToast({ type: "warning", title, message });
  }, [addToast]);

  const info = useCallback((title: string, message?: string) => {
    addToast({ type: "info", title, message });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// useToast hook is in src/hooks/useToast.ts to satisfy react-refresh/only-export-components

// Toast Container Component
function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

// Individual Toast Item
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const typeStyles = {
    success: {
      bg: "bg-success dark:bg-success/90",
      icon: <CheckCircleIcon />,
    },
    error: {
      bg: "bg-danger dark:bg-danger/90",
      icon: <XCircleIcon />,
    },
    warning: {
      bg: "bg-warning dark:bg-warning/90",
      icon: <ExclamationIcon />,
    },
    info: {
      bg: "bg-sentinel-500 dark:bg-sentinel-600",
      icon: <InfoIcon />,
    },
  };

  const styles = typeStyles[toast.type];

  const handleAction = () => {
    if (toast.action) {
      toast.action.onClick();
      onRemove(toast.id);
    }
  };

  return (
    <div
      className={`
        pointer-events-auto animate-slide-in-right
        ${styles.bg} text-white rounded-lg shadow-lg p-4
        flex items-start gap-3
      `}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">{styles.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="font-semibold text-sm">{toast.title}</p>
            {toast.message && (
              <p className="text-sm text-white/80 mt-0.5">{toast.message}</p>
            )}
          </div>
          {toast.action && (
            <button
              onClick={handleAction}
              className="flex-shrink-0 px-3 py-1 text-sm font-medium bg-white/20 hover:bg-white/30 rounded-md transition-colors"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 text-white/60 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <XIcon />
      </button>
    </div>
  );
}

// Icons
function CheckCircleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ExclamationIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
