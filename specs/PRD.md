# Product Requirements Document
# ReportFlow - Workflow Management System

---

## 1. Overview

**Product Name:** ReportFlow

**Purpose:** Event-driven workflow management system for report submission, review, and approval using Apache Kafka for asynchronous processing.

**Learning Objectives:**
- Event-driven architecture
- Kafka producers/consumers
- Asynchronous notifications
- Workflow state management
- Audit logging & threaded commenting

---

## 2. User Roles & Permissions

### Admin
**Responsibilities:** Configure and manage report workflows

**Permissions:**
- Create report configurations
- Assign depositors to reports
- Configure activation/reminder/due dates
- Activate/deactivate reports
- View all reports and statuses
- View full audit log per report
- Delete any comment

### Depositor
**Responsibilities:** Submit reports

**Permissions:**
- View assigned reports
- Upload report files
- Re-upload after TO_REDO status
- Post and delete own comments on assigned reports
- View report status and version history

### Approver
**Responsibilities:** Review and validate reports

**Permissions:**
- View submitted reports (PENDING queue)
- Download uploaded files
- Change report status (APPROVED/REJECTED/TO_REDO/CANCELED)
- Post and delete own comments on assigned reports

---

## 3. Data Model

### Report Entity

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| title | String | Report title |
| type | String | Report category/type |
| priority | Enum | LOW, MEDIUM, HIGH, CRITICAL |
| activation_date | Datetime | When report becomes active |
| reminder_date | Datetime | When reminder triggers |
| due_date | Datetime | Submission deadline |
| is_active | Boolean | Active status flag |
| status | Enum | Current workflow status |
| depositor_id | UUID | Assigned depositor |
| current_version_id | UUID | Reference to latest version (nullable) |
| created_at | Datetime | Creation timestamp |

### ReportVersion Entity

Stores file upload history. New version created on each re-upload.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| report_id | UUID | Parent report |
| version_number | Integer | Sequential version (1, 2, 3...) |
| file_path | String | Storage path |
| uploaded_at | Datetime | Upload timestamp |

### ReportAuditLog Entity

Immutable record of every status transition and actor action.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| report_id | UUID | Parent report |
| actor_id | UUID | User who performed the action |
| action | String | Action label (e.g. `uploaded`, `approved`, `redo_requested`) |
| from_status | String | Status before transition (nullable for initial upload) |
| to_status | String | Status after transition |
| comment | Text | Optional contextual note |
| metadata | JSON | Extra data (e.g. version_number, file_path) |
| created_at | Datetime | Timestamp |

### ReportComment Entity

Threaded comments per report, optionally scoped to a version.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| report_id | UUID | Parent report |
| version_id | UUID | Related version (nullable) |
| author_id | UUID | Comment author |
| parent_comment_id | UUID | Parent comment for threading (nullable) |
| content | Text | Comment body |
| is_deleted | Boolean | Soft-delete flag (default false) |
| created_at | Datetime | Creation timestamp |
| updated_at | Datetime | Last edit timestamp |

### Notification Entity

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Recipient |
| type | String | Mirrors Kafka topic (e.g. `report.submitted`) |
| message | Text | Human-readable message |
| is_read | Boolean | Read flag (default false) |
| created_at | Datetime | Timestamp |

---

## 4. Workflow

### Status States

- **PENDING** - Awaiting approval after upload
- **APPROVED** - Accepted by approver
- **REJECTED** - Declined by approver
- **TO_REDO** - Requires resubmission
- **CANCELED** - Workflow terminated

### Status Flow

```
Report Created (Admin)
    ↓
File Uploaded (Depositor)
    ↓
Status = PENDING
    ↓
Review (Approver)
    ↓
    ├─→ APPROVED (end)
    ├─→ REJECTED (end)
    ├─→ CANCELED (end)
    └─→ TO_REDO
         ↓
    Depositor Re-uploads
         ↓
    Status = PENDING (loop)
```

### Audit Log

Every status transition writes a `ReportAuditLog` record atomically in the same DB transaction. The log is immutable — no updates or deletes.

### TO_REDO Cycle

1. Approver marks report TO_REDO (optionally with a comment via `ReportComment`)
2. Depositor receives notification
3. Depositor uploads new version
4. New `ReportVersion` created (version_number incremented)
5. Status returns to PENDING
6. Audit log entry written

---

## 5. Business Rules

### Date Constraints

```
activation_date < reminder_date < due_date
```

All dates validated on report creation.

### Submission Rules

**Allowed when:**
- Report is assigned to depositor
- Current date ≥ activation_date
- Current date ≤ due_date
- Status allows upload (no prior version, or TO_REDO)

**Required:**
- File attachment (mandatory)

### Approval Rules

**Approver can set:**
- APPROVED
- REJECTED
- TO_REDO
- CANCELED

**Comments:** Posted separately via comment endpoint; not embedded in the status transition payload.

### File Constraints

**Allowed types:** PDF, DOCX, XLSX, PNG, JPG  
**Max size:** 10 MB

**Storage:**
```
uploads/reports/{report_id}/v{version_number}_{filename}
```

### Comment Rules

- Any assigned user (depositor, approver) or admin can post comments
- Comments support threading via `parent_comment_id`
- Comments can be optionally scoped to a specific `version_id`
- Authors and admins can soft-delete their own comments
- Soft-deleted comments return `[deleted]` placeholder — thread structure preserved

---

## 6. Kafka Integration

### Event Topics

| Topic | Triggered By |
|-------|--------------|
| report.created | Admin creates report |
| report.activated | Activation date reached |
| report.reminder | Reminder date reached |
| report.submitted | Depositor uploads file |
| report.redo_requested | Approver marks TO_REDO |
| report.reuploaded | Depositor resubmits after TO_REDO |
| report.approved | Approver approves |
| report.rejected | Approver rejects |
| report.canceled | Approver cancels |
| notification.created | Any notification generated |

### Event Flow Examples

**Upload Flow:**
```
Depositor uploads → report.submitted → Notification consumer → Approver notified
```

**TO_REDO Flow:**
```
Approver marks TO_REDO → report.redo_requested → Notification consumer → Depositor notified
```

**Reminder Flow:**
```
Scheduler checks dates → report.reminder → Notification consumer → Depositor notified
```

---

## 7. Notifications

### Depositor Notifications

Triggered on: report activation, reminder date reached, report marked TO_REDO, approved, rejected, canceled

### Approver Notifications

Triggered on: file uploaded by depositor (submitted or reuploaded)

### Delivery Channels

- In-app notifications (required)
- Email notifications (excluded from MVP)

---

## 8. Authentication & Authorization

### Authentication
JWT-based token authentication

### Roles
- ADMIN
- DEPOSITOR
- APPROVER

### Access Control
- Admins: Full access to all reports and audit logs
- Depositors: Access only to assigned reports
- Approvers: Access to reports in PENDING queue

---

## 9. Technical Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React (Vite) |
| Backend | FastAPI |
| Database | PostgreSQL |
| Messaging | Apache Kafka |
| Authentication | JWT |
| File Storage | Local filesystem |
| Deployment | Docker Compose |

---

## 10. Architecture

```
┌─────────────────┐
│  React Frontend │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  FastAPI Backend│
└────────┬────────┘
         │
    ┌────┴────┐
    ↓         ↓
┌──────┐  ┌──────┐
│ PG DB│  │Kafka │
└──────┘  └───┬──┘
              ↓
    ┌─────────────────┐
    │ Notification     │
    │ Consumer         │
    └─────────────────┘
```

---

## 11. Backend Structure

```
app/
├── api/              # REST endpoints
├── auth/             # JWT authentication
├── kafka/            # Producers and consumers
├── models/           # Database models
├── services/         # Business logic
├── scheduler/        # Date-based triggers
├── uploads/          # File handling
├── comments/         # Threaded comment logic
├── audit/            # Audit log writes
└── notifications/    # Notification service
```

---

## 12. User Interface

### Admin Dashboard
- Create report form
- Report list with filters
- User assignment interface
- Status overview
- Audit log timeline per report

### Depositor Dashboard
- Assigned reports list
- Upload interface
- Deadline indicators
- Version history
- Comment thread per report/version

### Approver Dashboard
- Pending reports queue
- File downloader
- Review form with status options
- Comment thread per report/version

---

## 13. MVP Scope

**Included:**
- ✅ JWT authentication and role management
- ✅ Report CRUD operations
- ✅ File upload/download with versioning
- ✅ Complete review workflow
- ✅ TO_REDO cycle
- ✅ Kafka event publishing
- ✅ Notification consumers
- ✅ Scheduled activation and reminders
- ✅ Immutable audit log per report
- ✅ Threaded comments per report/version
- ✅ Local file storage
- ✅ Docker Compose setup

**Excluded from MVP:**
- Email delivery (in-app only)
- File preview in browser
- Bulk operations
- Advanced reporting/analytics
- Automatic overdue status detection

---

## 14. Success Criteria

Project successful when:

1. **Workflow Functionality**
   - Admin creates reports with valid date constraints
   - Depositor uploads files for assigned reports
   - Approver reviews and changes status
   - TO_REDO cycle works end-to-end with versioning

2. **Event Processing**
   - All workflow changes publish Kafka events
   - Notification consumers process events correctly
   - In-app notifications display properly

3. **Audit & Comments**
   - Every status transition logged in `ReportAuditLog`
   - Threaded comments visible per report and per version
   - Soft-delete preserves thread structure

4. **Scheduling**
   - Activation events emitted on activation_date
   - Reminders trigger on reminder_date

5. **Technical**
   - System runs via Docker Compose
   - File versioning preserves history
   - Authentication prevents unauthorized access

---

## 15. Non-Functional Requirements

### Performance
- Page load < 2s
- File upload < 30s for files up to 10MB
- Event processing < 5s end-to-end

### Scalability
- Support 100 concurrent users
- Handle 1000 reports in system

### Security
- JWT tokens expire after 24h
- File access restricted to authorized users
- HTTPS for all communication

### Reliability
- 99% uptime
- Kafka consumer auto-recovery
- Database transactions for status changes and audit writes