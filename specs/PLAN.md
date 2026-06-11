# PLAN.md — ReportFlow Workflow Management System

## Overview

| | |
|---|---|
| **Sprints** | 4 |
| **Duration** | 8 weeks |
| **Epics** | 7 |
| **Total tasks** | 38 |

---

## Epics

| ID | Epic | Sprint | Tasks |
|----|------|--------|-------|
| E1 | Project setup & infrastructure | 1 | 5 |
| E2 | Authentication & authorization | 1 | 5 |
| E3 | Report CRUD & data model | 1–2 | 6 |
| E4 | File upload, comments & workflow | 2 | 9 |
| E5 | Review workflow & status machine | 2–3 | 5 |
| E6 | Scheduler & Kafka consumers | 3 | 4 |
| E7 | Notifications, audit log & QA | 4 | 7 |

---

## Sprint Plan

### Sprint 1 — Week 1–2
**Epics: E1 · E2 · E3 (start)**

#### E1 — Project setup & infrastructure

- [x] Initialize monorepo: FastAPI backend + React frontend
- [x] Docker Compose: PostgreSQL, Kafka (+ Zookeeper), backend, frontend services
- [~] PostgreSQL: create DB, migrations with Alembic _(Alembic configured, `versions/` dir exists but empty — DB created via `metadata.create_all`)_

- [x] Kafka topics creation script (all 10 topics)
- [x] Local file storage directory structure + upload path convention

#### E2 — Authentication & authorization

- [x] User model: id, email, hashed_password, role (ADMIN/DEPOSITOR/APPROVER)
- [x] JWT issue + refresh + decode middleware
- [x] Login / refresh / me endpoints
- [x] Role-based dependency guards (`require_admin`, `require_depositor`, `require_approver`)
- [x] React: auth context, protected routes, role-aware redirects

#### E3 — Report CRUD & data model (start)

- [x] SQLAlchemy models: `Report`, `ReportVersion`, `ReportAuditLog`, `ReportComment`
- [x] Admin API: `POST /reports` (create with date validation `activation < reminder < due`, depositor assignment)

---

### Sprint 2 — Week 3–4
**Epics: E3 (finish) · E4 · E5 (start)**

#### E3 — Report CRUD & data model (finish)

- [x] Admin API: `GET /reports` (list, filters), `PATCH /reports/:id`, `DELETE /reports/:id`
- [x] Depositor/approver: `GET /reports` (scoped to assigned only)
- [x] Admin dashboard: report list, create form, depositor assignment
- [x] Kafka producer: emit `report.created` on report creation

#### E4 — File upload, comments & workflow

- [x] `POST /reports/:id/upload` — validate file type, check date/status rules, store at `uploads/reports/{id}/v{n}_{filename}`
- [x] Create `ReportVersion` record, increment `version_number`, update `current_version_id`, write `ReportAuditLog` entry
- [x] Set report status → `PENDING` on upload
- [x] `GET /reports/:id/download` — restrict to assigned depositor/approver and admin
- [x] Kafka producers: emit `report.submitted` and `report.reuploaded`
- [x] `POST /reports/:id/comments` — create comment (optional version_id, optional parent_comment_id)
- [x] `GET /reports/:id/comments` — list threaded comments (soft-deleted shown as `[deleted]`)
- [x] `DELETE /comments/:id` — soft-delete (author or admin only)
- [x] Depositor dashboard: report list, upload form, status + version history, comment thread

#### E5 — Review workflow & status machine (start)

- [x] `PATCH /reports/:id/review` — approver sets `APPROVED` / `REJECTED` / `TO_REDO` / `CANCELED`
- [x] Status transition guard: reject invalid transitions
- [x] Write `ReportAuditLog` entry on every transition (actor_id, from_status, to_status)

---

### Sprint 3 — Week 5–6
**Epics: E5 (finish) · E6**

#### E5 — Review workflow & status machine (finish)

- [x] `TO_REDO` loop: unlock depositor re-upload, audit log entry written
- [x] Kafka producers: emit `report.approved` / `report.rejected` / `report.redo_requested` / `report.canceled`
- [x] Approver dashboard: pending queue, file download, review form, comment thread per report/version

#### E6 — Scheduler & Kafka consumers

- [x] APScheduler job: poll every minute → emit `report.activated` when `activation_date` reached (once per report)
- [x] Scheduler job: emit `report.reminder` on `reminder_date` (once per report)
- [x] Notification consumer: subscribe to all topics → create `Notification` record per target user
- [x] Kafka consumer group setup: auto-recovery, offset commit, error handling

---

### Sprint 4 — Week 7–8
**Epic: E7**

#### E7 — Notifications, audit log & QA

- [x] Notification model: `id, user_id, type, message, is_read, created_at`
- [x] `GET /notifications` (paginated, unread filter), `PATCH /notifications/:id/read`
- [x] React: notification bell + dropdown, unread badge, mark-as-read
- [x] `GET /reports/:id/audit` — admin-only audit log endpoint (full `ReportAuditLog` timeline)
- [x] React: audit log timeline view in admin dashboard
- [ ] Integration tests: full upload → `PENDING` → review → `APPROVED` / `TO_REDO` cycle, audit log assertions
- [~] Docker Compose final: health checks, env vars, volumes, README _(PG has healthcheck, volumes defined; missing backend/frontend health checks + README)_

---

## Kafka Topics Reference

| Topic | Triggered by |
|-------|-------------|
| `report.created` | Admin creates report |
| `report.activated` | Activation date reached (scheduler) |
| `report.reminder` | Reminder date reached (scheduler) |
| `report.submitted` | Depositor uploads file |
| `report.reuploaded` | Depositor resubmits after TO_REDO |
| `report.redo_requested` | Approver marks TO_REDO |
| `report.approved` | Approver approves |
| `report.rejected` | Approver rejects |
| `report.canceled` | Approver cancels |
| `notification.created` | Any notification generated |

---

## File Storage Convention

```
uploads/reports/{report_id}/v{version_number}_{filename}
```

Allowed types: `pdf`, `docx`, `xlsx`, `png`, `jpg`

---

## Status Flow

```
PENDING → APPROVED   (terminal)
PENDING → REJECTED   (terminal)
PENDING → CANCELED   (terminal)
PENDING → TO_REDO  → PENDING  (loop via new ReportVersion)
```

Every transition → `ReportAuditLog` record written atomically.