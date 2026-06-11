import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => removeToast(id), 5000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div
        role="region"
        aria-live="polite"
        aria-label="Notifications"
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 10000,
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-sm)",
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => {
          const bg =
            toast.type === "success"
              ? "var(--color-success)"
              : toast.type === "error"
              ? "var(--color-error)"
              : "var(--color-inverse-surface)";
          return (
            <div
              key={toast.id}
              onClick={() => removeToast(toast.id)}
              style={{
                pointerEvents: "auto",
                background: bg,
                color: toast.type === "info" ? "var(--color-inverse-on-surface)" : "white",
                padding: "12px 16px",
                borderRadius: "var(--rounded-sm)",
                fontSize: 14,
                lineHeight: "20px",
                fontWeight: 500,
                maxWidth: 360,
                cursor: "pointer",
                boxShadow: "var(--shadow-overlay)",
                animation: "toast-in 200ms ease",
              }}
            >
              {toast.message}
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes toast-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
          [style*="animation: toast-in"] { animation: none !important; opacity: 1 !important; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
