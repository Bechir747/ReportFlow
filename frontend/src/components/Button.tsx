import type { ButtonHTMLAttributes, ReactNode } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  children: ReactNode;
}

export default function Button({
  variant = "primary",
  loading = false,
  children,
  disabled,
  style,
  ...rest
}: Props) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-sm)",
    borderRadius: "var(--rounded-sm)",
    font: "var(--font-label-md)",
    cursor: loading || disabled ? "not-allowed" : "pointer",
    border: "none",
    padding: "10px 20px",
    transition: "background var(--transition-fast), opacity var(--transition-fast)",
    opacity: loading || disabled ? 0.6 : 1,
    ...style,
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: "var(--color-primary)",
      color: "var(--color-on-primary)",
    },
    secondary: {
      background: "var(--color-surface-container-lowest)",
      color: "var(--color-on-surface)",
      border: "1px solid var(--color-outline-variant)",
      padding: "9px 19px",
    },
    ghost: {
      background: "transparent",
      color: "var(--color-primary)",
    },
    danger: {
      background: "var(--color-error)",
      color: "white",
    },
  };

  return (
    <button
      style={{ ...base, ...variants[variant] }}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span
      style={{
        width: 14,
        height: 14,
        border: "2px solid currentColor",
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "btn-spin 600ms linear infinite",
        display: "inline-block",
      }}
    >
      <style>{`
        @keyframes btn-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          [style*="animation: btn-spin"] { animation-duration: 1200ms !important; }
        }
      `}</style>
    </span>
  );
}
