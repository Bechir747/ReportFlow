export default function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "var(--space-xl) var(--space-lg)",
        color: "var(--color-on-surface-variant)",
      }}
    >
      <p style={{ font: "var(--font-body-lg)", margin: 0 }}>{message}</p>
      {action && <div style={{ marginTop: "var(--space-md)" }}>{action}</div>}
    </div>
  );
}
