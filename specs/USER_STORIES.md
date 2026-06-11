# USER_STORIES.md — ReportFlow

Format: `As a <role>, I want to <action> so that <outcome>.`  
Acceptance criteria use Given/When/Then.

---

## Authentication

---

### US-001 — Login
**As any user, I want to log in with email and password so that I can access my dashboard.**

**Acceptance Criteria:**
- Given valid credentials → receive JWT access token + refresh token (httpOnly cookie)
- Given invalid credentials → 401 with error message
- Given expired access token + valid refresh token → new access token issued
- Given no token → redirect to login page

---

### US-002 — Logout
**As any user, I want to log out so that my session is terminated.**

**Acceptance Criteria:**
- Given authenticated user clicks logout → access token invalidated, refresh cookie cleared
- Given logged-out user visits protected route → redirected to login

---

## Admin

---

### US-003 — Create Report Configuration
**As an admin, I want to create a report with title, type, priority, dates, and assigned depositor so that the workflow can begin.**

**Acceptance Criteria:**
- Given `activation_date < reminder_date < due_date` → report created, `report.created` event emitted
- Given invalid date order → 422 with validation error
- Given missing required fields → 422
- Given non-existent depositor_id → 422

---

### US-004 — List All Reports
**As an admin, I want to see all reports with filters so that I can monitor the system.**

**Acceptance Criteria:**
- Given no filters → all reports returned (paginated)
- Given `status` filter → only reports with that status returned
- Given `priority` filter → filtered results returned
- Given `depositor_id` filter → filtered results returned

---

### US-005 — Edit Report
**As an admin, I want to update a report's metadata so that I can correct configuration errors.**

**Acceptance Criteria:**
- Given valid PATCH payload → report updated
- Given date update that violates `activation < reminder < due` → 422
- Given report with status APPROVED → update still allowed (admin only)

---

### US-006 — Delete Report
**As an admin, I want to delete a report so that I can remove misconfigured entries.**

**Acceptance Criteria:**
- Given existing report → deleted, returns 204
- Given non-existent report → 404

---

### US-007 — View Admin Dashboard
**As an admin, I want a dashboard showing all reports, their statuses, and assignees so that I have a full system overview.**

**Acceptance Criteria:**
- Given admin login → dashboard displays report list with status, priority, depositor
- Given filter interaction → list updates without page reload

---

### US-008 — View Audit Log
**As an admin, I want to see the full audit log for a report so that I can trace every status change and actor.**

**Acceptance Criteria:**
- Given `GET /reports/{id}/audit` → returns all `ReportAuditLog` entries ordered by `created_at` asc
- Each entry shows: actor, action, from_status, to_status, comment, timestamp
- Given non-existent report → 404
- Given non-admin → 403

---

## Depositor

---

### US-009 — View Assigned Reports
**As a depositor, I want to see only reports assigned to me so that I know what I need to submit.**

**Acceptance Criteria:**
- Given depositor login → only their assigned reports returned
- Given report with `activation_date` in the future → shown with "not yet active" indicator

---

### US-010 — Upload Report File
**As a depositor, I want to upload a file for an assigned report so that the approver can review it.**

**Acceptance Criteria:**
- Given report is active (`now ≥ activation_date`), not past due (`now ≤ due_date`), status allows upload → file stored, `ReportVersion` created, status set to PENDING, `ReportAuditLog` entry written, `report.submitted` event emitted
- Given file type not in allowed list (pdf/docx/xlsx/png/jpg) → 422
- Given file size > 10MB → 422
- Given report not assigned to this depositor → 403
- Given `now < activation_date` → 422 "report not yet active"
- Given `now > due_date` → 422 "submission deadline passed"
- Given status is APPROVED/REJECTED/CANCELED → 422 "upload not allowed in current status"

---

### US-011 — Re-upload After TO_REDO
**As a depositor, I want to upload a corrected file after a TO_REDO decision so that the approver can re-review.**

**Acceptance Criteria:**
- Given status = TO_REDO → new upload allowed
- Given successful re-upload → new `ReportVersion` created with incremented `version_number`, status reset to PENDING, audit log entry written, `report.reuploaded` event emitted
- Given status ≠ TO_REDO → 422

---

### US-012 — View Report Status and Version History
**As a depositor, I want to see the current status and all previous versions of my report so that I understand the review history.**

**Acceptance Criteria:**
- Given report with multiple versions → all `ReportVersion` entries shown with uploaded_at, version_number
- Given report with single version → one entry shown

---

### US-013 — Post a Comment on a Report
**As a depositor, I want to add a comment on a report or a specific version so that I can communicate context to the approver.**

**Acceptance Criteria:**
- Given `POST /reports/{id}/comments` with content → `ReportComment` created, author_id = current user
- Given `version_id` provided → comment linked to that version
- Given `parent_comment_id` provided → stored as threaded reply
- Given empty content → 422

---

### US-014 — Receive Notifications (Depositor)
**As a depositor, I want to receive in-app notifications for key workflow events so that I stay informed.**

**Acceptance Criteria:**
- Notification created when: report activated, reminder date reached, marked TO_REDO, approved, rejected, canceled
- Unread badge visible on notification bell
- Clicking notification marks it as read

---

## Approver

---

### US-015 — View Pending Reports Queue
**As an approver, I want to see reports submitted for my review so that I know what requires action.**

**Acceptance Criteria:**
- Given approver login → reports with status PENDING visible in queue
- Given no pending reports → empty state shown

---

### US-016 — Download Report File
**As an approver, I want to download the submitted file so that I can review its contents.**

**Acceptance Criteria:**
- Given `GET /reports/{id}/download` with approver role → file download succeeds
- Given no file uploaded yet → 404

---

### US-017 — Approve Report
**As an approver, I want to mark a report as APPROVED so that the workflow is completed successfully.**

**Acceptance Criteria:**
- Given status = PENDING → status updated to APPROVED, audit log entry written, `report.approved` event emitted
- Given status ≠ PENDING → 422

---

### US-018 — Reject Report
**As an approver, I want to mark a report as REJECTED so that invalid submissions are formally declined.**

**Acceptance Criteria:**
- Given status = PENDING → status updated to REJECTED, audit log entry written, `report.rejected` event emitted
- Given status ≠ PENDING → 422

---

### US-019 — Request Redo
**As an approver, I want to mark a report as TO_REDO so that the depositor can correct and resubmit.**

**Acceptance Criteria:**
- Given status = PENDING → status updated to TO_REDO, audit log entry written, `report.redo_requested` event emitted
- Given depositor → receives notification of TO_REDO
- Given status ≠ PENDING → 422

---

### US-020 — Cancel Report
**As an approver, I want to cancel a report so that abandoned or irrelevant workflows are closed.**

**Acceptance Criteria:**
- Given any non-terminal status → status updated to CANCELED, audit log entry written, `report.canceled` event emitted
- Given status already APPROVED/REJECTED/CANCELED → 422

---

### US-021 — Post a Comment on a Report
**As an approver, I want to add a comment on a report or version so that I can communicate feedback without changing the status.**

**Acceptance Criteria:**
- Same rules as US-013
- Given `parent_comment_id` → stored as reply to depositor's comment

---

### US-022 — Receive Notifications (Approver)
**As an approver, I want to receive an in-app notification when a depositor uploads a file so that I know when to begin review.**

**Acceptance Criteria:**
- Notification created on `report.submitted` and `report.reuploaded` events
- Unread badge visible on notification bell

---

## Comments

---

### US-023 — View Comments on a Report
**As any assigned user, I want to see all comments on a report threaded by version so that I can follow the conversation.**

**Acceptance Criteria:**
- Given `GET /reports/{id}/comments` → returns comments with author, content, version_id, parent_comment_id, created_at
- Soft-deleted comments (`is_deleted = true`) → returned as `[deleted]` placeholder, content hidden
- Given user not assigned to the report and not admin → 403

---

### US-024 — Delete a Comment
**As the comment author or an admin, I want to soft-delete a comment so that inappropriate content can be removed without breaking thread structure.**

**Acceptance Criteria:**
- Given `DELETE /comments/{id}` by author or admin → `is_deleted = true`, content nulled
- Given non-author non-admin → 403
- Given non-existent comment → 404

---

## Notifications

---

### US-025 — View Notifications
**As any user, I want to see my notifications in a dropdown so that I can stay up to date.**

**Acceptance Criteria:**
- Given unread notifications → unread badge shows count
- Given clicking bell → dropdown shows latest notifications with message and timestamp
- Given no notifications → empty state shown

---

### US-026 — Mark Notification as Read
**As any user, I want to mark a notification as read so that the unread count is accurate.**

**Acceptance Criteria:**
- Given `PATCH /notifications/{id}/read` → `is_read` set to true
- Given notification not belonging to current user → 403
- Unread badge count decrements

---

## Scheduler (System)

---

### US-027 — Auto-activate Reports
**As the system, I want to emit an activation event when a report's activation_date is reached so that depositors are notified.**

**Acceptance Criteria:**
- Given `now ≥ activation_date` and `is_active = true` → `report.activated` event emitted once
- Given already activated (event previously emitted) → no duplicate event

---

### US-028 — Send Reminder
**As the system, I want to emit a reminder event on reminder_date so that depositors are prompted to submit.**

**Acceptance Criteria:**
- Given `now ≥ reminder_date` and report not yet APPROVED → `report.reminder` event emitted once
- Depositor receives notification

---

## Summary Table

| ID | Role | Epic |
|----|------|------|
| US-001 | All | Auth |
| US-002 | All | Auth |
| US-003 | Admin | E3 |
| US-004 | Admin | E3 |
| US-005 | Admin | E3 |
| US-006 | Admin | E3 |
| US-007 | Admin | E3 |
| US-008 | Admin | E7 |
| US-009 | Depositor | E3 |
| US-010 | Depositor | E4 |
| US-011 | Depositor | E5 |
| US-012 | Depositor | E5 |
| US-013 | Depositor | E4 |
| US-014 | Depositor | E7 |
| US-015 | Approver | E4 |
| US-016 | Approver | E4 |
| US-017 | Approver | E5 |
| US-018 | Approver | E5 |
| US-019 | Approver | E5 |
| US-020 | Approver | E5 |
| US-021 | Approver | E4 |
| US-022 | Approver | E7 |
| US-023 | All | E4 |
| US-024 | All | E4 |
| US-025 | All | E7 |
| US-026 | All | E7 |
| US-027 | System | E6 |
| US-028 | System | E6 |