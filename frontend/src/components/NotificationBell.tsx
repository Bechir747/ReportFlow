import { useState, useEffect, useCallback } from "react";
import api from "../api/client";
import type { Notification } from "../types";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

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

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // ignore
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)}>
        🔔 {notifications.length > 0 && <span>({notifications.length})</span>}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "100%",
            background: "white",
            border: "1px solid #ccc",
            width: 300,
            maxHeight: 400,
            overflowY: "auto",
          }}
        >
          {notifications.length === 0 ? (
            <p style={{ padding: 8 }}>No new notifications</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                style={{ padding: 8, borderBottom: "1px solid #eee", cursor: "pointer" }}
                onClick={() => markRead(n.id)}
              >
                <p style={{ margin: 0 }}>{n.message}</p>
                <small>{new Date(n.created_at).toLocaleString()}</small>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
