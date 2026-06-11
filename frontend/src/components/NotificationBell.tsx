import { useState, useEffect, useCallback, useRef } from "react";
import api from "../api/client";
import type { Notification } from "../types";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications?unread_only=true&limit=10");
      setNotifications(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // ignore
    }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "var(--space-sm)",
          borderRadius: "var(--rounded-sm)",
          color: "var(--color-outline)",
          fontSize: 20,
          lineHeight: 1,
          position: "relative",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {notifications.length > 0 && (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--color-status-rejected)",
            }}
          />
        )}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 4px)",
            background: "var(--color-surface-container-lowest)",
            border: "1px solid var(--color-outline-variant)",
            borderRadius: "var(--rounded-sm)",
            boxShadow: "var(--shadow-overlay)",
            width: 300,
            maxHeight: 400,
            overflowY: "auto",
            zIndex: 100,
          }}
        >
          {notifications.length === 0 ? (
            <p style={{ padding: "var(--space-md)", margin: 0, color: "var(--color-on-surface-variant)", font: "var(--font-body-md)" }}>
              No unread notifications
            </p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => markRead(n.id)}
                style={{
                  padding: "var(--space-sm) var(--space-md)",
                  borderBottom: "1px solid var(--color-outline-variant)",
                  cursor: "pointer",
                  transition: "background var(--transition-fast)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-surface-container-high)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <p style={{ margin: 0, font: "var(--font-body-md)" }}>{n.message}</p>
                <small style={{ font: "var(--font-code-sm)", color: "var(--color-outline)" }}>
                  {new Date(n.created_at).toLocaleString()}
                </small>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
