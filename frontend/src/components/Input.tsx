import type { InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, style, ...rest }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
      {label && (
        <label style={{ font: "var(--font-label-md)", color: "var(--color-on-surface-variant)" }}>
          {label}
        </label>
      )}
      <input
        style={{
          padding: "8px 12px",
          borderRadius: "var(--rounded-sm)",
          border: `1px solid ${error ? "var(--color-error)" : "var(--color-outline-variant)"}`,
          background: error ? "var(--color-error-container)" : "var(--color-surface-container-lowest)",
          color: "var(--color-on-surface)",
          font: "var(--font-body-md)",
          outline: "none",
          transition: "border var(--transition-fast), box-shadow var(--transition-fast)",
          ...(style || {}),
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--color-primary)";
          e.currentTarget.style.boxShadow = "0 0 0 2px color-mix(in srgb, var(--color-primary) 15%, transparent)";
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? "var(--color-error)" : "var(--color-outline-variant)";
          e.currentTarget.style.boxShadow = "none";
          rest.onBlur?.(e);
        }}
        {...rest}
      />
      {error && (
        <span style={{ font: "var(--font-code-sm)", color: "var(--color-error)" }}>{error}</span>
      )}
    </div>
  );
}
