import { useState, useEffect } from "react";
import { Rocket, ScrollText, Trash2 } from "lucide-react";
import api from "../api/client";
import type { Report, AuditLogEntry, User } from "../types";
import { useToast } from "../contexts/ToastContext";
import Button from "../components/Button";
import Input from "../components/Input";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import Table from "../components/Table";

export default function AdminDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [auditReport, setAuditReport] = useState<Report | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "",
    priority: "MEDIUM",
    activation_date: "",
    reminder_date: "",
    due_date: "",
    depositor_id: "",
    approver_id: "",
  });
  const [depositors, setDepositors] = useState<User[]>([]);
  const [approvers, setApprovers] = useState<User[]>([]);
  const [depositorsLoading, setDepositorsLoading] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { addToast } = useToast();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (priorityFilter) params.priority = priorityFilter;
    api.get("/reports", { params, signal: controller.signal }).then((res) => {
      setReports(res.data);
      setLoading(false);
    }).catch((_err) => {
      if (controller.signal.aborted) return;
      addToast("Couldn't load reports. Check your connection and try again.", "error");
      setLoading(false);
    });
    return () => controller.abort();
  }, [statusFilter, priorityFilter, addToast]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api.get("/users", { params: { role: "DEPOSITOR" }, signal: controller.signal }),
      api.get("/users", { params: { role: "APPROVER" }, signal: controller.signal }),
    ]).then(([depRes, appRes]) => {
      setDepositors(depRes.data);
      setApprovers(appRes.data);
      setDepositorsLoading(false);
    }).catch(() => {
      setDepositors([]);
      setApprovers([]);
      setDepositorsLoading(false);
    });
    return () => controller.abort();
  }, []);

  const searchActive = search.trim().length > 0;
  const filtered = searchActive
    ? reports.filter(
        (r) =>
          r.title.toLowerCase().includes(search.toLowerCase()) ||
          r.type.toLowerCase().includes(search.toLowerCase())
      )
    : reports;

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.type.trim()) errs.type = "Type is required";
    if (!form.activation_date) errs.activation_date = "Required";
    if (!form.reminder_date) errs.reminder_date = "Required";
    if (!form.due_date) errs.due_date = "Required";
    if (!form.depositor_id.trim()) errs.depositor_id = "Required";
    if (form.activation_date && form.due_date && form.activation_date >= form.due_date) {
      errs.due_date = "Due date must be after activation date";
    }
    if (form.activation_date && form.reminder_date && form.activation_date >= form.reminder_date) {
      errs.reminder_date = "Reminder must be after activation";
    }
    if (form.reminder_date && form.due_date && form.reminder_date >= form.due_date) {
      errs.due_date = "Due date must be after reminder";
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const createReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setCreating(true);
    try {
      await api.post("/reports", { ...form, approver_id: form.approver_id || null });
      setShowCreate(false);
      setForm({ title: "", type: "", priority: "MEDIUM", activation_date: "", reminder_date: "", due_date: "", depositor_id: "", approver_id: "" });
      setFormErrors({});
      addToast("Report created", "success");
      const res = await api.get("/reports");
      setReports(res.data);
    } catch {
      addToast("Couldn't create report. Verify all fields and try again.", "error");
    } finally {
      setCreating(false);
    }
  };

  const deleteReport = async (id: string) => {
    setDeleting(id);
    setConfirmDelete(null);
    try {
      await api.delete(`/reports/${id}`);
      addToast("Report deleted", "success");
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch {
      addToast("Couldn't delete report. Try again.", "error");
    } finally {
      setDeleting(null);
    }
  };

  const viewAuditLog = async (report: Report) => {
    setAuditReport(report);
    setAuditLoading(true);
    try {
      const res = await api.get(`/reports/${report.id}/audit`);
      setAuditLog(res.data);
    } catch {
      setAuditLog([]);
      addToast("Couldn't load audit log. Try again.", "error");
    } finally {
      setAuditLoading(false);
    }
  };

  const columns = [
    { key: "title", label: "Title" },
    { key: "type", label: "Type", width: "120px" },
    { key: "priority", label: "Priority", width: "100px" },
    { key: "status", label: "Status", width: "110px" },
    { key: "depositor", label: "Depositor", width: "110px" },
    { key: "due", label: "Due", width: "110px" },
    { key: "actions", label: "", width: "180px" },
  ];

  const rows = filtered.map((r) => ({
    title: r.title,
    type: r.type,
    priority: <PriorityBadge priority={r.priority} />,
    status: <StatusBadge status={r.status} isActive={r.is_active} />,
    depositor: (
      <span style={{ font: "var(--font-code-sm)", color: "var(--color-on-surface-variant)" }}>
        {r.depositor_id.slice(0, 8)}
      </span>
    ),
    due: (
      <span style={{ color: new Date(r.due_date) < new Date() ? "var(--color-error)" : "inherit" }}>
        {new Date(r.due_date).toLocaleDateString()}
      </span>
    ),
    actions: (
      <div style={{ display: "flex", gap: "var(--space-xs)" }}>
        {!r.is_active && !r.status && (
          <Button
            variant="secondary"
            style={{ padding: 6, minWidth: 32, height: 32 }}
            aria-label="Activate report"
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await api.post(`/reports/${r.id}/activate`);
                addToast("Report activated", "success");
                const res = await api.get("/reports");
                setReports(res.data);
              } catch {
                addToast("Couldn't update report status. Try again.", "error");
              }
            }}
          >
            <Rocket size={16} />
          </Button>
        )}
        <Button
          variant="ghost"
          style={{ padding: 6, minWidth: 32, height: 32 }}
          aria-label="View audit log"
          onClick={(e) => { e.stopPropagation(); viewAuditLog(r); }}
        >
          <ScrollText size={16} />
        </Button>
        <Button
          variant="danger"
          style={{ padding: 6, minWidth: 32, height: 32 }}
          aria-label="Delete report"
          loading={deleting === r.id}
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(r.id); }}
        >
          <Trash2 size={16} />
        </Button>
      </div>
    ),
  }));

  return (
    <>
      <div style={{ display: "flex", gap: "var(--space-md)", marginBottom: "var(--space-lg)", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240, maxWidth: 320 }}>
          <input
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "var(--rounded-sm)",
              border: "1px solid var(--color-outline-variant)",
              font: "var(--font-body-md)",
              outline: "none",
              transition: "border var(--transition-fast), box-shadow var(--transition-fast)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--color-primary)";
              e.currentTarget.style.boxShadow = "0 0 0 2px color-mix(in srgb, var(--color-primary) 15%, transparent)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--color-outline-variant)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: "var(--rounded-sm)",
            border: "1px solid var(--color-outline-variant)",
            font: "var(--font-body-md)",
            background: "var(--color-surface-container-lowest)",
            outline: "none",
            cursor: "pointer",
            transition: "border var(--transition-fast), box-shadow var(--transition-fast)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--color-primary)";
            e.currentTarget.style.boxShadow = "0 0 0 2px color-mix(in srgb, var(--color-primary) 15%, transparent)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--color-outline-variant)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="TO_REDO">To Redo</option>
          <option value="CANCELED">Canceled</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: "var(--rounded-sm)",
            border: "1px solid var(--color-outline-variant)",
            font: "var(--font-body-md)",
            background: "var(--color-surface-container-lowest)",
            outline: "none",
            cursor: "pointer",
            transition: "border var(--transition-fast), box-shadow var(--transition-fast)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--color-primary)";
            e.currentTarget.style.boxShadow = "0 0 0 2px color-mix(in srgb, var(--color-primary) 15%, transparent)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--color-outline-variant)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
        <Button onClick={() => setShowCreate(true)}>+ New Report</Button>
      </div>

      {loading ? (
          <div role="status" aria-label="Loading" style={{ padding: "var(--space-xl)", textAlign: "center", color: "var(--color-on-surface-variant)" }}>
            Loading...
          </div>
      ) : (
        <Table
          columns={columns}
          rows={rows}
          emptyMessage={reports.length === 0 ? "No reports yet. Create your first report to get started." : "No reports match your filters"}
          emptyAction={<Button onClick={() => setShowCreate(true)}>Create Report</Button>}
        />
      )}

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setFormErrors({}); }} title="Create Report">
        <form onSubmit={createReport} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          <Input label="Title" maxLength={100} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} error={formErrors.title} required />
          <Input label="Type" placeholder="Quarterly, Compliance..." maxLength={100} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} error={formErrors.type} required />
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
            <label style={{ font: "var(--font-label-md)", color: "var(--color-on-surface-variant)" }}>Priority</label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              style={{
                padding: "8px 12px",
                borderRadius: "var(--rounded-sm)",
                border: "1px solid var(--color-outline-variant)",
                font: "var(--font-body-md)",
                background: "var(--color-surface-container-lowest)",
                outline: "none",
                cursor: "pointer",
                transition: "border var(--transition-fast), box-shadow var(--transition-fast)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--color-primary)";
                e.currentTarget.style.boxShadow = "0 0 0 2px color-mix(in srgb, var(--color-primary) 15%, transparent)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--color-outline-variant)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
          <Input label="Activation Date" type="datetime-local" value={form.activation_date} onChange={(e) => setForm({ ...form, activation_date: e.target.value })} error={formErrors.activation_date} required />
          <Input label="Reminder Date" type="datetime-local" value={form.reminder_date} onChange={(e) => setForm({ ...form, reminder_date: e.target.value })} error={formErrors.reminder_date} required />
          <Input label="Due Date" type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} error={formErrors.due_date} required />
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
            <label style={{ font: "var(--font-label-md)", color: "var(--color-on-surface-variant)" }}>Depositor <span style={{ color: "var(--color-error)" }}>*</span></label>
            <select
              value={form.depositor_id}
              onChange={(e) => setForm({ ...form, depositor_id: e.target.value })}
              disabled={depositorsLoading}
              style={{
                padding: "8px 12px",
                borderRadius: "var(--rounded-sm)",
                border: `1px solid ${formErrors.depositor_id ? "var(--color-error)" : "var(--color-outline-variant)"}`,
                font: "var(--font-body-md)",
                background: formErrors.depositor_id ? "var(--color-error-container)" : "var(--color-surface-container-lowest)",
                color: form.depositor_id ? "var(--color-on-surface)" : "var(--color-on-surface-variant)",
                outline: "none",
                cursor: depositorsLoading ? "not-allowed" : "pointer",
                transition: "border var(--transition-fast), box-shadow var(--transition-fast)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--color-primary)";
                e.currentTarget.style.boxShadow = "0 0 0 2px color-mix(in srgb, var(--color-primary) 15%, transparent)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = formErrors.depositor_id ? "var(--color-error)" : "var(--color-outline-variant)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <option value="" disabled>{depositorsLoading ? "Loading depositors..." : "Select a depositor"}</option>
              {depositors.map((d) => (
                <option key={d.id} value={d.id}>{d.email}</option>
              ))}
            </select>
            {formErrors.depositor_id && (
              <span style={{ font: "var(--font-code-sm)", color: "var(--color-error)" }}>{formErrors.depositor_id}</span>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
            <label style={{ font: "var(--font-label-md)", color: "var(--color-on-surface-variant)" }}>Approver</label>
            <select
              value={form.approver_id}
              onChange={(e) => setForm({ ...form, approver_id: e.target.value })}
              disabled={depositorsLoading}
              style={{
                padding: "8px 12px",
                borderRadius: "var(--rounded-sm)",
                border: "1px solid var(--color-outline-variant)",
                font: "var(--font-body-md)",
                background: "var(--color-surface-container-lowest)",
                color: form.approver_id ? "var(--color-on-surface)" : "var(--color-on-surface-variant)",
                outline: "none",
                cursor: depositorsLoading ? "not-allowed" : "pointer",
                transition: "border var(--transition-fast), box-shadow var(--transition-fast)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--color-primary)";
                e.currentTarget.style.boxShadow = "0 0 0 2px color-mix(in srgb, var(--color-primary) 15%, transparent)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--color-outline-variant)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <option value="" disabled>{depositorsLoading ? "Loading approvers..." : "Select an approver (optional)"}</option>
              <option value="">No approver</option>
              {approvers.map((a) => (
                <option key={a.id} value={a.id}>{a.email}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-sm)", marginTop: "var(--space-sm)" }}>
            <Button variant="secondary" type="button" onClick={() => { setShowCreate(false); setFormErrors({}); }}>Cancel</Button>
            <Button type="submit" loading={creating}>Create</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!auditReport}
        onClose={() => setAuditReport(null)}
        title={`Audit Log${auditReport ? `: ${auditReport.title}` : ""}`}
        width={700}
      >
        {auditLoading ? (
            <p role="status" aria-label="Loading" style={{ color: "var(--color-on-surface-variant)" }}>Loading...</p>
        ) : auditLog.length === 0 ? (
          <p style={{ color: "var(--color-on-surface-variant)" }}>No audit entries for this report.</p>
        ) : (
          <div style={{ position: "relative", paddingLeft: 24 }}>
            {auditLog.map((entry) => (
              <div
                key={entry.id}
                style={{
                  borderLeft: "2px solid var(--color-outline-variant)",
                  paddingLeft: 16,
                  paddingBottom: 16,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: -7,
                    top: 0,
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: "var(--color-surface-container-high)",
                    border: "2px solid var(--color-outline-variant)",
                  }}
                />
                <small style={{ font: "var(--font-code-sm)", color: "var(--color-outline)" }}>
                  {new Date(entry.created_at).toLocaleString()}
                </small>
                <p style={{ margin: "4px 0", font: "var(--font-body-md)" }}>
                  <strong>{entry.action}</strong>
                  {entry.from_status && <span> &mdash; {entry.from_status} &rarr; {entry.to_status}</span>}
                  {!entry.from_status && entry.to_status && <span> &rarr; {entry.to_status}</span>}
                </p>
                <small style={{ font: "var(--font-code-sm)", color: "var(--color-on-surface-variant)" }}>
                  by {entry.actor_email}
                </small>
                {entry.metadata && (
                  <pre
                    style={{
                      font: "var(--font-code-sm)",
                      background: "var(--color-surface-container-low)",
                      padding: "var(--space-sm)",
                      borderRadius: "var(--rounded-sm)",
                      marginTop: "var(--space-xs)",
                      overflow: "auto",
                    }}
                  >
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Report"
        message="Are you sure you want to delete this report? This action cannot be undone and will permanently remove all associated files, comments, and audit logs."
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={!!deleting}
        onConfirm={() => confirmDelete && deleteReport(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}
