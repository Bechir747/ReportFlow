import { useState, useEffect } from "react";
import api from "../api/client";
import type { Report } from "../types";
import NotificationBell from "../components/NotificationBell";
import CommentThread from "../components/CommentThread";

const STATUS_ACTIONS = ["APPROVED", "REJECTED", "TO_REDO", "CANCELED"] as const;

export default function ApproverDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    api.get("/reports").then((res) => setReports(res.data));
  }, []);

  const reviewReport = async (reportId: string, status: string) => {
    try {
      await api.patch(`/reports/${reportId}/review`, { status });
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      setSelectedReport(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Review failed";
      alert(msg);
    }
  };

  const downloadFile = async (reportId: string) => {
    try {
      const res = await api.get(`/reports/${reportId}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "report-file";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed");
    }
  };

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16 }}>
        <h1>Approver Dashboard</h1>
        <NotificationBell />
      </header>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th style={thStyle}>Title</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Priority</th>
            <th style={thStyle}>Submitted</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {reports.length === 0 && (
            <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: "#888" }}>No pending reports</td></tr>
          )}
          {reports.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={tdStyle}>{r.title}</td>
              <td style={tdStyle}>{r.type}</td>
              <td style={tdStyle}>{r.priority}</td>
              <td style={tdStyle}>{new Date(r.created_at).toLocaleDateString()}</td>
              <td style={tdStyle}>
                <button onClick={() => downloadFile(r.id)}>Download</button>
                <button onClick={() => setSelectedReport(r)} style={{ marginLeft: 4 }}>Review</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedReport && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", padding: 24, maxWidth: 700, width: "90%", maxHeight: "80vh", overflowY: "auto", borderRadius: 8 }}>
            <h2>{selectedReport.title}</h2>
            <button onClick={() => setSelectedReport(null)} style={{ float: "right" }}>Close</button>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              <div><strong>Type:</strong> {selectedReport.type}</div>
              <div><strong>Priority:</strong> {selectedReport.priority}</div>
              <div><strong>Status:</strong> <strong style={{ color: "blue" }}>{selectedReport.status}</strong></div>
              <div><strong>Submitted:</strong> {new Date(selectedReport.created_at).toLocaleDateString()}</div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button onClick={() => downloadFile(selectedReport.id)}>📄 Download File</button>
            </div>

            <h3>Review Decision</h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {STATUS_ACTIONS.map((action) => (
                <button
                  key={action}
                  onClick={() => reviewReport(selectedReport.id, action)}
                  style={{
                    padding: "8px 16px",
                    fontWeight: "bold",
                    background: action === "APPROVED" ? "green" : action === "REJECTED" ? "red" : action === "TO_REDO" ? "orange" : "gray",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  {action}
                </button>
              ))}
            </div>

            <CommentThread reportId={selectedReport.id} />
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { textAlign: "left", padding: "8px 12px", borderBottom: "2px solid #ddd" };
const tdStyle: React.CSSProperties = { padding: "8px 12px" };
