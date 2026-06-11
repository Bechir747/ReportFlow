import { useEffect, useRef, type ReactNode, type MouseEvent } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}

export default function Modal({ open, onClose, title, children, width = 640 }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9000,
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e: MouseEvent) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          background: "var(--color-surface-container-lowest)",
          borderRadius: "var(--rounded-md)",
          border: "1px solid var(--color-outline-variant)",
          boxShadow: "var(--shadow-overlay)",
          width,
          maxWidth: "90vw",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "var(--space-md) var(--space-lg)",
            borderBottom: "1px solid var(--color-outline-variant)",
          }}
        >
          <h2 style={{ font: "var(--font-headline-sm)", margin: 0 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              font: "var(--font-body-lg)",
              color: "var(--color-outline)",
              padding: "var(--space-xs)",
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>
        <div style={{ overflowY: "auto", padding: "var(--space-lg)" }}>{children}</div>
      </div>
    </div>
  );
}
