const STATUS_STYLES: Record<string, { bg: string; fg: string }> = {
  APPROVED: { bg: "var(--color-success-container)", fg: "#065f46" },
  PENDING: { bg: "var(--color-warning-container)", fg: "#92400e" },
  REJECTED: { bg: "var(--color-error-container)", fg: "var(--color-on-error-container)" },
  TO_REDO: { bg: "var(--color-warning-container)", fg: "#92400e" },
  CANCELED: { bg: "var(--color-surface-container-high)", fg: "var(--color-on-surface-variant)" },
};

export default function StatusBadge({ status }: { status: string | null }) {
  const key = status || "DRAFT";
  const s = STATUS_STYLES[key as keyof typeof STATUS_STYLES] || {
    bg: "var(--color-surface-container-high)",
    fg: "var(--color-on-surface-variant)",
  };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "var(--rounded-full)",
        background: s.bg,
        color: s.fg,
        font: "var(--font-code-sm)",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {key}
    </span>
  );
}
