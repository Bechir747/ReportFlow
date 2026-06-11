const PRIORITY_STYLES: Record<string, string> = {
  LOW: "#505f76",
  MEDIUM: "#f59e0b",
  HIGH: "#e11d48",
  CRITICAL: "#611e00",
};

export default function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      style={{
        font: "var(--font-code-sm)",
        fontWeight: 600,
        color: PRIORITY_STYLES[priority] || "var(--color-on-surface-variant)",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {priority}
    </span>
  );
}
