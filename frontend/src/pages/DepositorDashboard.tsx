import { useState, useEffect } from "react";
import api from "../api/client";
import type { Report } from "../types";
import NotificationBell from "../components/NotificationBell";
import CommentThread from "../components/CommentThread";

export default function DepositorDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [versions, setVersions] = useState<Array<{ id: string; version_number: number; uploaded_at: string }>>([]);

  useEffect(() => {
    api.get("/reports").then((res) => setReports(res.data));
  }, []);

  const uploadFile = async (reportId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      await api.post(`/reports/${reportId}/upload`, formData);
      alert("File uploaded successfully");
      if (selectedReport?.id === reportId) loadVersions(reportId);
      const res = await api.get("/reports");
      setReports(res.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Upload failed";
      alert(msg);
    }
  };

  const loadVersions = async (reportId: string) => {
    try {
      const res = await api.get(`/reports/${reportId}/versions`);
      setVersions(res.data);
    } catch {
      setVersions([]);
    }
  };

  const openDetails = (report: Report) => {
    setSelectedReport(report);
    if (report.current_version_id) loadVersions(report.id);
    else setVersions([]);
  };

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16 }}>
        <h1>Depositor Dashboard</h1>
        <NotificationBell />
      </header>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th style={thStyle}>Title</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Priority</th>
            <th style={thStyle}>Active</th>
            <th style={thStyle}>Due</th>
            <th style={thStyle}>Upload</th>
            <th style={thStyle}></th>
          </tr>
        </thead>
        <tbody>
          {reports.length === 0 && (
            <tr><td colSpan={8} style={{ textAlign: "center", padding: 24, color: "#888" }}>No assigned reports</td></tr>
          )}
          {reports.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={tdStyle}>{r.title}</td>
              <td style={tdStyle}>{r.type}</td>
              <td style={tdStyle}><StatusBadge status={r.status} /></td>
              <td style={tdStyle}>{r.priority}</td>
              <td style={tdStyle}>{r.is_active ? "✅" : "⏳"}</td>
              <td style={{ ...tdStyle, color: new Date(r.due_date) < new Date() ? "red" : "inherit" }}>
                {new Date(r.due_date).toLocaleDateString()}
              </td>
              <td style={tdStyle}>
                {(r.status === null || r.status === "TO_REDO") && (
                  <input
                    type="file"
                    onChange={(e) => {
                      if (e.target.files?.[0]) uploadFile(r.id, e.target.files[0]);
                    }}
                  />
                )}
                {r.status !== null && r.status !== "TO_REDO" && <span style={{ color: "#888", fontSize: 12 }}>Locked</span>}
              </td>
              <td style={tdStyle}>
                <button onClick={() => openDetails(r)}>Details</button>
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
              <div><strong>Status:</strong> <StatusBadge status={selectedReport.status} /></div>
              <div><strong>Priority:</strong> {selectedReport.priority}</div>
              <div><strong>Active:</strong> {selectedReport.is_active ? "Yes" : "No"}</div>
              <div><strong>Due:</strong> {new Date(selectedReport.due_date).toLocaleDateString()}</div>
              <div><strong>Created:</strong> {new Date(selectedReport.created_at).toLocaleDateString()}</div>
            </div>

            {versions.length > 0 && (
              <>
                <h3>Version History</h3>
                <table style={{ width: "100%", marginBottom: 16 }}>
                  <thead>
                    <tr style={{ background: "#f5f5f5" }}>
                      <th style={thStyle}>Version</th>
                      <th style={thStyle}>Uploaded</th>
                      <th style={thStyle}>Current</th>
                    </tr>
                  </thead>
                  <tbody>
                    {versions.map((v) => (
                      <tr key={v.id}>
                        <td style={tdStyle}>v{v.version_number}</td>
                        <td style={tdStyle}>{new Date(v.uploaded_at).toLocaleString()}</td>
                        <td style={tdStyle}>{selectedReport.current_version_id === v.id ? "✅" : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {(selectedReport.status === null || selectedReport.status === "TO_REDO") && (
              <div style={{ marginBottom: 16 }}>
                <h3>Upload File</h3>
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files?.[0]) uploadFile(selectedReport.id, e.target.files[0]);
                  }}
                />
              </div>
            )}

            <CommentThread reportId={selectedReport.id} />
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span style={{ color: "#888" }}>DRAFT</span>;
  const colors: Record<string, string> = { PENDING: "blue", APPROVED: "green", REJECTED: "red", TO_REDO: "orange", CANCELED: "gray" };
  return <span style={{ color: colors[status] || "#888", fontWeight: "bold" }}>{status}</span>;
}

const thStyle: React.CSSProperties = { textAlign: "left", padding: "8px 12px", borderBottom: "2px solid #ddd" };
const tdStyle: React.CSSProperties = { padding: "8px 12px" };
