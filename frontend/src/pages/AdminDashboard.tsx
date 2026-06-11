import { useState, useEffect } from "react";
import api from "../api/client";
import type { Report, AuditLogEntry } from "../types";
import NotificationBell from "../components/NotificationBell";

export default function AdminDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [auditReport, setAuditReport] = useState<Report | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [form, setForm] = useState({
    title: "",
    type: "",
    priority: "MEDIUM",
    activation_date: "",
    reminder_date: "",
    due_date: "",
    depositor_id: "",
  });

  useEffect(() => {
    fetchReports();
  }, [statusFilter, priorityFilter]);

  const fetchReports = async () => {
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (priorityFilter) params.priority = priorityFilter;
    const res = await api.get("/reports", { params });
    setReports(res.data);
  };

  const createReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/reports", form);
      setShowCreate(false);
      setForm({ title: "", type: "", priority: "MEDIUM", activation_date: "", reminder_date: "", due_date: "", depositor_id: "" });
      fetchReports();
    } catch (err) {
      console.error("Failed to create report", err);
    }
  };

  const deleteReport = async (id: string) => {
    if (!confirm("Delete this report?")) return;
    try {
      await api.delete(`/reports/${id}`);
      fetchReports();
    } catch {
      alert("Delete failed");
    }
  };

  const viewAuditLog = async (report: Report) => {
    setAuditReport(report);
    try {
      const res = await api.get(`/reports/${report.id}/audit`);
      setAuditLog(res.data);
    } catch {
      setAuditLog([]);
    }
  };

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16 }}>
        <h1>Admin Dashboard</h1>
        <NotificationBell />
      </header>

      <div style={{ display: "flex", gap: 8, padding: "0 16px", marginBottom: 16 }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
          <option value="TO_REDO">TO_REDO</option>
          <option value="CANCELED">CANCELED</option>
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="">All Priorities</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>
        <button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Cancel" : "+ New Report"}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={createReport} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 400, margin: "0 16px 16px", padding: 16, border: "1px solid #ccc", borderRadius: 4 }}>
          <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <input placeholder="Type (e.g. Quarterly, Compliance)" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required />
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
          <label>Activation Date</label>
          <input type="datetime-local" value={form.activation_date} onChange={(e) => setForm({ ...form, activation_date: e.target.value })} required />
          <label>Reminder Date</label>
          <input type="datetime-local" value={form.reminder_date} onChange={(e) => setForm({ ...form, reminder_date: e.target.value })} required />
          <label>Due Date</label>
          <input type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} required />
          <input placeholder="Depositor User ID" value={form.depositor_id} onChange={(e) => setForm({ ...form, depositor_id: e.target.value })} required />
          <button type="submit">Create Report</button>
        </form>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th style={thStyle}>Title</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Priority</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Depositor</th>
            <th style={thStyle}>Active</th>
            <th style={thStyle}>Due</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {reports.length === 0 && (
            <tr><td colSpan={8} style={{ textAlign: "center", padding: 24, color: "#888" }}>No reports found</td></tr>
          )}
          {reports.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={tdStyle}>{r.title}</td>
              <td style={tdStyle}>{r.type}</td>
              <td style={tdStyle}><PriorityBadge priority={r.priority} /></td>
              <td style={tdStyle}><StatusBadge status={r.status} /></td>
              <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }}>{r.depositor_id.slice(0, 8)}</td>
              <td style={tdStyle}>{r.is_active ? "✅" : "❌"}</td>
              <td style={tdStyle}>{new Date(r.due_date).toLocaleDateString()}</td>
              <td style={tdStyle}>
                {!r.is_active && !r.status && (
                  <button onClick={async () => { try { await api.post(`/reports/${r.id}/activate`); fetchReports(); } catch { alert("Activate failed"); } }} style={{ color: "green", marginRight: 4 }}>Activate</button>
                )}
                <button onClick={() => viewAuditLog(r)}>Audit</button>
                <button onClick={() => deleteReport(r.id)} style={{ color: "red", marginLeft: 4 }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {auditReport && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", padding: 24, maxWidth: 700, width: "90%", maxHeight: "80vh", overflowY: "auto", borderRadius: 8 }}>
            <h2>Audit Log: {auditReport.title}</h2>
            <button onClick={() => setAuditReport(null)} style={{ float: "right" }}>Close</button>
            {auditLog.length === 0 && <p>No audit entries found.</p>}
            <div style={{ position: "relative", paddingLeft: 24 }}>
              {auditLog.map((entry, i) => (
                <div key={entry.id} style={{ borderLeft: "2px solid #ddd", paddingLeft: 16, paddingBottom: 16, position: "relative" }}>
                  <div style={{ position: "absolute", left: -7, top: 0, width: 12, height: 12, borderRadius: "50%", background: "#666" }} />
                  <small style={{ color: "#888" }}>{new Date(entry.created_at).toLocaleString()}</small>
                  <p style={{ margin: "4px 0" }}>
                    <strong>{entry.action}</strong>
                    {entry.from_status && <span> — {entry.from_status} → {entry.to_status}</span>}
                    {!entry.from_status && entry.to_status && <span> → {entry.to_status}</span>}
                  </p>
                  <small style={{ color: "#888", fontFamily: "monospace" }}>by {entry.actor_id.slice(0, 8)}</small>
                  {entry.extra_data && <pre style={{ fontSize: 11, background: "#f9f9f9", padding: 4 }}>{JSON.stringify(entry.extra_data, null, 2)}</pre>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = { LOW: "green", MEDIUM: "orange", HIGH: "red", CRITICAL: "darkred" };
  return <span style={{ color: colors[priority] || "#888", fontWeight: "bold" }}>{priority}</span>;
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span style={{ color: "#888" }}>DRAFT</span>;
  const colors: Record<string, string> = { PENDING: "blue", APPROVED: "green", REJECTED: "red", TO_REDO: "orange", CANCELED: "gray" };
  return <span style={{ color: colors[status] || "#888", fontWeight: "bold" }}>{status}</span>;
}

const thStyle: React.CSSProperties = { textAlign: "left", padding: "8px 12px", borderBottom: "2px solid #ddd" };
const tdStyle: React.CSSProperties = { padding: "8px 12px" };
