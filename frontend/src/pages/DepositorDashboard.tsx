import { useState, useEffect } from "react";
import api from "../api/client";
import type { Report } from "../types";
import { useToast } from "../contexts/ToastContext";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import Table from "../components/Table";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import CommentThread from "../components/CommentThread";

export default function DepositorDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [versions, setVersions] = useState<Array<{ id: string; version_number: number; uploaded_at: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    const controller = new AbortController();
    api.get("/reports", { signal: controller.signal }).then((res) => {
      setReports(res.data);
      setLoading(false);
    }).catch((_err) => {
      if (controller.signal.aborted) return;
      addToast("Couldn't load reports. Check your connection and try again.", "error");
      setLoading(false);
    });
    return () => controller.abort();
  }, [addToast]);

  const uploadFile = async (reportId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    try {
      await api.post(`/reports/${reportId}/upload`, formData);
      addToast("File uploaded", "success");
      if (selectedReport?.id === reportId) loadVersions(reportId);
      const res = await api.get("/reports");
      setReports(res.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Upload failed";
      addToast(msg, "error");
    } finally {
      setUploading(false);
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

  const columns = [
    { key: "title", label: "Title" },
    { key: "type", label: "Type", width: "120px" },
    { key: "status", label: "Status", width: "110px" },
    { key: "priority", label: "Priority", width: "100px" },
    { key: "due", label: "Due", width: "110px" },
    { key: "upload", label: "Upload", width: "200px" },
    { key: "actions", label: "", width: "80px" },
  ];

  const rows = reports.map((r) => ({
    title: r.title,
    type: r.type,
    status: <StatusBadge status={r.status} />,
    priority: <PriorityBadge priority={r.priority} />,
    due: (
      <span style={{ color: new Date(r.due_date) < new Date() ? "var(--color-error)" : "inherit" }}>
        {new Date(r.due_date).toLocaleDateString()}
      </span>
    ),
    upload: (
      (r.status === null || r.status === "TO_REDO") ? (
        <label
          style={{
            display: "inline-block",
            padding: "4px 12px",
            borderRadius: "var(--rounded-sm)",
            border: "1px dashed var(--color-outline-variant)",
            font: "var(--font-code-sm)",
            cursor: "pointer",
            color: "var(--color-on-surface-variant)",
            transition: "border var(--transition-fast)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-primary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-outline-variant)"; }}
        >
          Choose file
          <input
            type="file"
            hidden
            disabled={uploading}
            onChange={(e) => {
              if (e.target.files?.[0]) uploadFile(r.id, e.target.files[0]);
            }}
          />
        </label>
      ) : (
        <span style={{ font: "var(--font-code-sm)", color: "var(--color-outline)" }}>Locked</span>
      )
    ),
    actions: (
      <Button variant="ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => openDetails(r)}>
        Details
      </Button>
    ),
  }));

  const canUpload = selectedReport && (selectedReport.status === null || selectedReport.status === "TO_REDO");

  return (
    <>
      {loading ? (
        <div role="status" aria-label="Loading" style={{ padding: "var(--space-xl)", textAlign: "center", color: "var(--color-on-surface-variant)" }}>
            Loading...
          </div>
      ) : reports.length === 0 ? (
        <EmptyState message="No reports assigned yet. New reports will appear here once assigned." />
      ) : (
        <Table columns={columns} rows={rows} />
      )}

      <Modal
        open={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title={selectedReport?.title || ""}
      >
        {selectedReport && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "var(--space-sm)",
                marginBottom: "var(--space-lg)",
              }}
            >
              <div>
                <span style={{ font: "var(--font-label-md)", color: "var(--color-on-surface-variant)" }}>Status</span>
                <div style={{ marginTop: 2 }}><StatusBadge status={selectedReport.status} /></div>
              </div>
              <div>
                <span style={{ font: "var(--font-label-md)", color: "var(--color-on-surface-variant)" }}>Priority</span>
                <div style={{ marginTop: 2 }}><PriorityBadge priority={selectedReport.priority} /></div>
              </div>
              <div>
                <span style={{ font: "var(--font-label-md)", color: "var(--color-on-surface-variant)" }}>Due</span>
                <div style={{ font: "var(--font-body-md)", marginTop: 2 }}>
                  {new Date(selectedReport.due_date).toLocaleDateString()}
                </div>
              </div>
              <div>
                <span style={{ font: "var(--font-label-md)", color: "var(--color-on-surface-variant)" }}>Created</span>
                <div style={{ font: "var(--font-body-md)", marginTop: 2 }}>
                  {new Date(selectedReport.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>

            {versions.length > 0 && (
              <>
                <h3 style={{ font: "var(--font-headline-sm)", margin: "0 0 var(--space-sm)" }}>Version History</h3>
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "var(--space-lg)" }}>
                  <thead>
                    <tr style={{ background: "var(--color-surface-container-low)" }}>
                      <th style={{ textAlign: "left", padding: "8px 12px", font: "var(--font-label-md)", color: "var(--color-on-surface-variant)" }}>Version</th>
                      <th style={{ textAlign: "left", padding: "8px 12px", font: "var(--font-label-md)", color: "var(--color-on-surface-variant)" }}>Uploaded</th>
                      <th style={{ textAlign: "left", padding: "8px 12px", font: "var(--font-label-md)", color: "var(--color-on-surface-variant)" }}>Current</th>
                    </tr>
                  </thead>
                  <tbody>
                    {versions.map((v) => (
                      <tr key={v.id} style={{ borderBottom: "1px solid var(--color-outline-variant)" }}>
                        <td style={{ padding: "8px 12px", font: "var(--font-code-sm)" }}>v{v.version_number}</td>
                        <td style={{ padding: "8px 12px", font: "var(--font-body-md)" }}>{new Date(v.uploaded_at).toLocaleString()}</td>
                        <td style={{ padding: "8px 12px" }}>
                          {selectedReport.current_version_id === v.id ? (
                            <span style={{ font: "var(--font-code-sm)", color: "var(--color-status-approved)" }}>Current</span>
                          ) : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {canUpload && (
              <div style={{ marginBottom: "var(--space-lg)" }}>
                <h3 style={{ font: "var(--font-headline-sm)", margin: "0 0 var(--space-sm)" }}>Upload File</h3>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "var(--space-sm)",
                    padding: "var(--space-lg)",
                    borderRadius: "var(--rounded-sm)",
                    border: "2px dashed var(--color-outline-variant)",
                    background: "var(--color-surface-container-low)",
                    cursor: "pointer",
                    font: "var(--font-body-md)",
                    color: "var(--color-on-surface-variant)",
                    transition: "border var(--transition-fast), background var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-primary)";
                    e.currentTarget.style.background = "var(--color-primary-tint)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-outline-variant)";
                    e.currentTarget.style.background = "var(--color-surface-container-low)";
                  }}
                >
                  {uploading ? "Uploading..." : "Click to browse or drag & drop"}
                  <input
                    type="file"
                    hidden
                    disabled={uploading}
                    onChange={(e) => {
                      if (e.target.files?.[0]) uploadFile(selectedReport.id, e.target.files[0]);
                    }}
                  />
                </label>
              </div>
            )}

            <CommentThread reportId={selectedReport.id} />
          </>
        )}
      </Modal>
    </>
  );
}
