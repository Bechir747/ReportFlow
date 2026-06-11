# Notification Flow — End-to-End Technical Walkthrough

## Scenario

> Admin creates a report, then manually activates it. Depositor receives a notification in real time.

---

## 1. Admin Creates a Report

**Actor:** Admin (`admin@reportflow.com`)

**Action:** Fills the form in `AdminDashboard.tsx` and clicks "Create Report".

### Frontend

`AdminDashboard.tsx:35` — `createReport()` calls:

```ts
await api.post("/reports", form);
```

### Backend

| Component | File | Line | Role |
|---|---|---|---|
| Router | `api/reports.py` | `create_report()` | Receives POST `/api/reports` |
| Schema | `schemas/report.py` | `ReportCreate` | Validates body (title, type, priority, dates, depositor_id) |
| Service | `services/report_service.py` | `ReportService.create()` | Builds `Report` ORM object with `ReportPriority` enum coercion |
| DB | — | — | `db.flush()` persists the row to `reports` table in PostgreSQL |
| Audit | `models/report_audit_log.py` | `ReportAuditLog` | Logs `action="created"` with `extra_data={"title": ...}` |
| Kafka | `kafka/producer.py` | `KafkaProducer.emit()` | Publishes `report.created` event to Kafka topic `report.created` |

### Database State (after step 1)

```
reports table:
  id          = 2689c269-... (UUID)
  title       = "Test"
  is_active   = false
  status      = null       ← "DRAFT"
```

### Notification Consumer

The `report.created` topic is **explicitly skipped** — no notification is created.

```python
# notification_consumer.py:43-44
if topic == "report.created":
    pass
```

---

## 2. Admin Activates the Report

**Actor:** Admin (`admin@reportflow.com`)

**Action:** Clicks "Activate" button next to the draft report in `AdminDashboard.tsx`.

### Frontend

`AdminDashboard.tsx:143` — inline handler:

```tsx
{!r.is_active && !r.status && (
  <button onClick={async () => {
    await api.post(`/reports/${r.id}/activate`);
    fetchReports();
  }}>Activate</button>
)}
```

The button only renders when **both** conditions are true:
- `r.is_active === false` (not already active)
- `r.status === null` (still a draft, never submitted)

### Backend

| Component | File | Line | Role |
|---|---|---|---|
| Router | `api/reports.py` | `activate_report()` | Receives POST `/api/reports/{id}/activate` |
| Guard | `auth/dependencies.py` | `require_admin` | Rejects non-admin users with 403 |
| Service | `services/report_service.py` | `get_by_id()` | Fetches report; raises 404 if missing |
| Validation | — | — | Returns 400 if `report.is_active` is already `True` |
| Mutation | — | `report.is_active = True` | Flips the boolean in the ORM object |
| Audit | `models/report_audit_log.py` | `ReportAuditLog` | Logs `action="activated"` with `extra_data={"manual_activation": true}` |
| Kafka | `kafka/producer.py` | `KafkaProducer.emit()` | Publishes `report.activated` event |

### Kafka Event Payload

```json
{
  "event": "report.activated",
  "report_id": "2689c269-...",
  "actor_id": "00000000-0000-0000-0000-000000000001",
  "timestamp": "2026-06-11T09:59:27.418720+00:00"
}
```

Topics are created on the Kafka broker via `scripts/create_kafka_topics.ps1` (all 9 event topics + 1 internal).

---

## 3. Notification Consumer Routes the Event

### Consumer Lifecycle

Started in `main.py:48` as an `asyncio.create_task`:

```python
consumer_task = asyncio.create_task(consume_notifications())
```

The `consume_notifications()` function (`main.py:15-27`) creates a single `AIOKafkaConsumer` that subscribes to **all 9 topics** with group ID `reportflow-notifications` and loops forever consuming messages.

### Routing Logic

`notification_consumer.py:36-61` — `NotificationConsumer.process()`:

```python
@staticmethod
async def process(topic: str, value: bytes) -> None:
    data = json.loads(value)
    report_id = uuid.UUID(data["report_id"])

    if topic in ("report.submitted", "report.reuploaded"):
        # → notify ALL APPROVERs
        users = await db.execute(select(User).where(User.role == UserRole.APPROVER))
    elif topic == "report.created":
        # → explicitly skipped
        pass
    else:
        # → notify the report's DEPOSITOR
        users = await db.execute(select(User).where(User.id == report_depositor_id))
```

Since the topic is `report.activated`, it falls into the `else` branch (line 46-51).

### Query Executed

```sql
SELECT * FROM users WHERE id = '<report.depositor_id>';
```

This finds the **depositor user** (`depositor@reportflow.com`, UUID ending in `...0002`).

---

## 4. Notification Row Created

`notification_consumer.py:53-69` — A `Notification` row is created:

```python
notification = Notification(
    user_id=user.id,          # depositor's UUID
    type="report.activated",  # Kafka topic name
    message="A report has been activated and is ready for submission.",
)
```

### Database State (after step 4)

```
notifications table:
  id          = f1a2b3c4-... (UUID)
  user_id     = 00000000-...-000000000002   ← depositor
  type        = "report.activated"
  message     = "A report has been activated and is ready for submission."
  is_read     = false
  created_at  = 2026-06-11T09:59:27.418720+00:00
```

---

## 5. Frontend Polls and Displays

**Actor:** Depositor (`depositor@reportflow.com`)

### Polling Mechanism

All dashboards mount `NotificationBell`:

```tsx
<NotificationBell />
```

`NotificationBell.tsx` calls on mount and at intervals:

```ts
GET /api/notifications?unread_only=true&limit=10
```

### API Response

`api/notifications.py` — `list_notifications()`:

```python
result = await db.execute(
    select(Notification)
    .where(Notification.user_id == current_user.id, Notification.is_read == False)
    .order_by(Notification.created_at.desc())
    .limit(10)
)
```

Returns:

```json
[
  {
    "id": "f1a2b3c4-...",
    "type": "report.activated",
    "message": "A report has been activated and is ready for submission.",
    "is_read": false,
    "created_at": "2026-06-11T09:59:27.418720+00:00"
  }
]
```

### UI Update

The bell icon badge count increments. When clicked, the notification is displayed in a dropdown and the user can mark it as read (`PATCH /api/notifications/{id}/read`).

---

## Full Sequence Diagram

```
Admin Browser          FastAPI               PostgreSQL          Kafka               Consumer             Depositor Browser
    │                     │                      │                 │                    │                       │
    │  POST /reports      │                      │                 │                    │                       │
    │────────────────────>│                      │                 │                    │                       │
    │                     │ INSERT report         │                │                    │                       │
    │                     │─────────────────────>│                 │                    │                       │
    │                     │ INSERT audit_log      │                │                    │                       │
    │                     │─────────────────────>│                 │                    │                       │
    │                     │ emit report.created   │                │                    │                       │
    │                     │──────────────────────────────────────>│                    │                       │
    │                     │                      │                 │  (consumer skips   │                       │
    │                     │                      │                 │   report.created)  │                       │
    │  201 Created        │                      │                 │                    │                       │
    │<────────────────────│                      │                 │                    │                       │
    │                     │                      │                 │                    │                       │
    │  POST /activate     │                      │                 │                    │                       │
    │────────────────────>│                      │                 │                    │                       │
    │                     │ UPDATE is_active=TRUE │                │                    │                       │
    │                     │─────────────────────>│                 │                    │                       │
    │                     │ INSERT audit_log      │                │                    │                       │
    │                     │─────────────────────>│                 │                    │                       │
    │                     │ emit report.activated  │                │                    │                       │
    │                     │──────────────────────────────────────>│                    │                       │
    │                     │                      │                 │  consume topic      │                       │
    │                     │                      │                 │───────────────────>│                       │
    │                     │                      │                 │                    │ SELECT user by role   │
    │                     │                      │                 │                    │──────────────────────>│
    │                     │                      │                 │                    │  user found           │
    │                     │                      │                 │                    │<──────────────────────│
    │                     │                      │                 │                    │                       │
    │                     │                      │ INSERT notification                  │                       │
    │                     │                      │<──────────────────────────────────────│                       │
    │                     │                      │                 │                    │                       │
    │                     │                      │                 │                    │  GET /notifications   │
    │                     │                      │                 │                    │<──────────────────────│
    │                     │                      │ SELECT unread   │                    │                       │
    │                     │                      │─────────────────│───────────────────>│                       │
    │                     │                      │─────────────────│───────────────────>│                       │
    │                     │                      │                 │                    │  [notification]       │
    │                     │                      │                 │                    │──────────────────────>│
```

---

## Key Files Reference

| Layer | File | Key Function/Class |
|---|---|---|
| Backend Router | `backend/app/api/reports.py` | `activate_report()` — POST handler |
| Backend Router | `backend/app/api/notifications.py` | `list_notifications()` — GET handler |
| Backend Service | `backend/app/services/report_service.py` | `ReportService.get_by_id()` |
| Backend Model | `backend/app/models/report.py` | `Report` — ORM with `is_active` field |
| Backend Model | `backend/app/models/notification.py` | `Notification` — ORM row |
| Backend Model | `backend/app/models/report_audit_log.py` | `ReportAuditLog` — audit trail |
| Backend Kafka | `backend/app/kafka/producer.py` | `KafkaProducer.emit()` |
| Backend Kafka | `backend/app/kafka/consumers/notification_consumer.py` | `NotificationConsumer.process()` — routing logic |
| Backend Scheduler | `backend/app/scheduler/jobs.py` | `check_activations()` — alternative auto-activation path |
| Backend Config | `backend/app/main.py` | Lifespan — starts consumer task + APScheduler |
| Frontend | `frontend/src/pages/AdminDashboard.tsx` | Activate button + create form |
| Frontend | `frontend/src/components/NotificationBell.tsx` | Polling + badge display |
