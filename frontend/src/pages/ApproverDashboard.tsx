import { useState, useEffect } from "react";
import api from "../api/client";
import type { Report } from "../types";
import { useToast } from "../contexts/ToastContext";
import Button from "../components/Button";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import Table from "../components/Table";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import CommentThread from "../components/CommentThread";

const STATUS_ACTIONS = [
  { value: "APPROVED", label: "Approve" },
  { value: "REJECTED", label: "Reject" },
  { value: "TO_REDO", label: "Request changes" },
  { value: "CANCELED", label: "Cancel" },
] as const;

export default function ApproverDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
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

  const reviewReport = async (reportId: string, status: string) => {
    setReviewing(`${reportId}-${status}`);
    try {
      await api.patch(`/reports/${reportId}/review`, { status });
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      setSelectedReport(null);
      const label = STATUS_ACTIONS.find((a) => a.value === status)?.label || status.toLowerCase();
      addToast(`Report ${label.toLowerCase()}`, "success");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Review failed";
      addToast(msg, "error");
    } finally {
      setReviewing(null);
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
      addToast("Couldn't download report. Try again.", "error");
    }
  };

  const actionColors: Record<string, string> = {
    APPROVED: "var(--color-status-approved)",
    REJECTED: "var(--color-status-rejected)",
    TO_REDO: "var(--color-warning)",
    CANCELED: "var(--color-outline)",
  };

  const columns = [
    { key: "title", label: "Title" },
    { key: "type", label: "Type", width: "120px" },
    { key: "priority", label: "Priority", width: "100px" },
    { key: "status", label: "Status", width: "110px" },
    { key: "submitted", label: "Submitted", width: "110px" },
    { key: "actions", label: "", width: "160px" },
  ];

  const rows = reports.map((r) => ({
    title: r.title,
    type: r.type,
    priority: <PriorityBadge priority={r.priority} />,
    status: <StatusBadge status={r.status} isActive={r.is_active} />,
    submitted: (
      <span style={{ font: "var(--font-body-md)" }}>
        {new Date(r.created_at).toLocaleDateString()}
      </span>
    ),
    actions: (
      <div style={{ display: "flex", gap: "var(--space-xs)" }}>
        <Button
          variant="secondary"
          style={{ fontSize: 12, padding: "4px 10px" }}
          onClick={(e) => { e.stopPropagation(); downloadFile(r.id); }}
        >
          Download
        </Button>
        <Button
          variant="primary"
          style={{ fontSize: 12, padding: "4px 10px" }}
          onClick={(e) => { e.stopPropagation(); setSelectedReport(r); }}
        >
          Review
        </Button>
      </div>
    ),
  }));

  return (
    <>
      {loading ? (
        <div role="status" aria-label="Loading" style={{ padding: "var(--space-xl)", textAlign: "center", color: "var(--color-on-surface-variant)" }}>
          Loading...
        </div>
      ) : reports.length === 0 ? (
        <EmptyState message="No pending reports to review. New submissions will appear here." />
      ) : (
        <Table columns={columns} rows={rows} />
      )}

      <Modal
        open={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title={selectedReport?.title || "Review Report"}
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
                <span style={{ font: "var(--font-label-md)", color: "var(--color-on-surface-variant)" }}>Type</span>
                <div style={{ font: "var(--font-body-md)", marginTop: 2 }}>{selectedReport.type}</div>
              </div>
              <div>
                <span style={{ font: "var(--font-label-md)", color: "var(--color-on-surface-variant)" }}>Priority</span>
                <div style={{ marginTop: 2 }}><PriorityBadge priority={selectedReport.priority} /></div>
              </div>
              <div>
                <span style={{ font: "var(--font-label-md)", color: "var(--color-on-surface-variant)" }}>Status</span>
                <div style={{ marginTop: 2 }}><StatusBadge status={selectedReport.status} isActive={selectedReport.is_active} /></div>
              </div>
              <div>
                <span style={{ font: "var(--font-label-md)", color: "var(--color-on-surface-variant)" }}>Submitted</span>
                <div style={{ font: "var(--font-body-md)", marginTop: 2 }}>
                  {new Date(selectedReport.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "var(--space-lg)" }}>
              <Button
                variant="secondary"
                onClick={() => downloadFile(selectedReport.id)}
              >
                Download File
              </Button>
            </div>

            <h3 style={{ font: "var(--font-headline-sm)", margin: "0 0 var(--space-sm)" }}>Review Decision</h3>
            <div style={{ display: "flex", gap: "var(--space-sm)", marginBottom: "var(--space-lg)" }}>
              {STATUS_ACTIONS.map(({ value, label }) => (
                <Button
                  key={value}
                  variant="secondary"
                  loading={reviewing === `${selectedReport.id}-${value}`}
                  style={{
                    background: actionColors[value],
                    color: "white",
                    border: "none",
                  }}
                  onClick={() => reviewReport(selectedReport.id, value)}
                >
                  {label}
                </Button>
              ))}
            </div>

            <CommentThread reportId={selectedReport.id} />
          </>
        )}
      </Modal>
    </>
  );
}
