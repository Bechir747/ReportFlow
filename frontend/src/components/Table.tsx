interface Props {
  columns: { key: string; label: string; width?: string }[];
  rows: Record<string, React.ReactNode>[];
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  onRowClick?: (index: number) => void;
}

export default function Table({ columns, rows, emptyMessage, emptyAction, onRowClick }: Props) {
  return (
    <div style={{ overflowX: "auto", maxWidth: "100%" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  font: "var(--font-label-md)",
                  letterSpacing: "0.02em",
                  color: "var(--color-on-surface-variant)",
                  background: "var(--color-surface-container-low)",
                  borderBottom: "1px solid var(--color-outline-variant)",
                  position: "sticky",
                  top: 0,
                  width: col.width,
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: 0 }}>
                <div
                  style={{
                    textAlign: "center",
                    padding: "var(--space-xl) var(--space-lg)",
                    color: "var(--color-on-surface-variant)",
                  }}
                >
                  <p style={{ font: "var(--font-body-lg)", margin: 0 }}>
                    {emptyMessage || "No data"}
                  </p>
                  {emptyAction && (
                    <div style={{ marginTop: "var(--space-md)" }}>{emptyAction}</div>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(i)}
                style={{
                  borderBottom: "1px solid var(--color-outline-variant)",
                  background: "var(--color-surface-container-lowest)",
                  transition: "background var(--transition-fast)",
                  cursor: onRowClick ? "pointer" : "default",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--color-surface-container-high)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--color-surface-container-lowest)";
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: "10px 12px",
                      font: "var(--font-body-md)",
                      verticalAlign: "middle",
                      wordBreak: "break-word",
                    }}
                  >
                    {row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
