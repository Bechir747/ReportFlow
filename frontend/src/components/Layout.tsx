import { useAuth } from "../contexts/AuthContext";
import NotificationBell from "./NotificationBell";

interface Props {
  children: React.ReactNode;
}

const ROLE_LINKS: Record<string, { label: string; path: string }[]> = {
  ADMIN: [
    { label: "Reports", path: "/admin" },
  ],
  DEPOSITOR: [
    { label: "My Reports", path: "/depositor" },
  ],
  APPROVER: [
    { label: "Review Queue", path: "/approver" },
  ],
};

export default function Layout({ children }: Props) {
  const { user, logout } = useAuth();
  const role = user?.role || "ADMIN";
  const links = ROLE_LINKS[role] || [];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <nav
        style={{
          width: 256,
          flexShrink: 0,
          background: "var(--color-surface-container-lowest)",
          borderRight: "1px solid var(--color-outline-variant)",
          display: "flex",
          flexDirection: "column",
          padding: "var(--space-md) 0",
        }}
      >
        <div
          style={{
            padding: "var(--space-md) var(--space-lg)",
            font: "var(--font-headline-sm)",
            color: "var(--color-primary)",
            marginBottom: "var(--space-lg)",
          }}
        >
          ReportFlow
        </div>
        {links.map((link) => {
          const active = location.pathname === link.path;
          return (
            <a
              key={link.path}
              href={link.path}
              style={{
                display: "block",
                padding: "8px var(--space-lg)",
                margin: "2px var(--space-sm)",
                borderRadius: "var(--rounded-sm)",
                font: "var(--font-body-md)",
                color: active ? "var(--color-primary)" : "var(--color-on-surface-variant)",
                background: active
                  ? "var(--color-primary-tint)"
                  : "transparent",
                fontWeight: active ? 600 : 400,
                textDecoration: "none",
                transition: "background var(--transition-fast)",
              }}
            >
              {link.label}
            </a>
          );
        })}
        <div style={{ flex: 1 }} />
        <div style={{ padding: "var(--space-md) var(--space-lg)" }}>
          <div style={{ font: "var(--font-code-sm)", color: "var(--color-outline)", marginBottom: 4 }}>
            {user?.email}
          </div>
          <button
            onClick={() => logout()}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              font: "var(--font-label-md)",
              color: "var(--color-primary)",
              padding: 0,
            }}
          >
            Sign out
          </button>
        </div>
      </nav>
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "var(--space-md) var(--space-lg)",
            borderBottom: "1px solid var(--color-outline-variant)",
            background: "var(--color-surface-container-lowest)",
          }}
        >
          <h1 style={{ font: "var(--font-headline)", margin: 0 }}>
            {links.find((l) => l.path === location.pathname)?.label || "Dashboard"}
          </h1>
          <NotificationBell />
        </header>
        <div style={{ flex: 1, padding: "var(--space-lg)", overflow: "auto" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
