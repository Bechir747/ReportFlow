# SAD.md — ReportFlow System Architecture Document

---

## 1. System Overview

ReportFlow is an event-driven workflow management system for report submission, review, and approval. It uses Apache Kafka for asynchronous processing between the API layer and downstream consumers (notifications, auditing).

**Deployment target:** Single-host Docker Compose  
**Scale target:** 100 concurrent users, 1000 reports

---

## 2. Architecture Style

**Layered monolith** (backend) + **event-driven async** (Kafka consumers/scheduler).

Not microservices — one FastAPI process handles all HTTP. Kafka decouples state-change side-effects (notifications, audit writes) from the request/response cycle.

---

## 3. Component Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        Docker Compose Host                    │
│                                                              │
│  ┌─────────────┐   HTTP    ┌──────────────────────────────┐  │
│  │   React     │ ────────► │        FastAPI               │  │
│  │  Frontend   │ ◄──────── │                              │  │
│  │  (Vite)     │           │  ┌──────────┐ ┌───────────┐  │  │
│  └─────────────┘           │  │ REST API │ │ Auth/JWT  │  │  │
│                            │  └────┬─────┘ └───────────┘  │  │
│                            │       │                       │  │
│                            │  ┌────▼──────────────────┐   │  │
│                            │  │     Services Layer     │   │  │
│                            │  └────┬──────────┬────────┘   │  │
│                            │       │          │            │  │
│                            │  ┌────▼────┐ ┌──▼─────────┐  │  │
│                            │  │ SQLAlch │ │   Kafka    │  │  │
│                            │  │  ORM    │ │  Producer  │  │  │
│                            │  └────┬────┘ └──┬─────────┘  │  │
│                            └───────┼──────────┼────────────┘  │
│                                    │          │               │
│  ┌─────────────┐          ┌────────▼──┐  ┌───▼────────────┐  │
│  │ APScheduler │──────────►           │  │     Kafka      │  │
│  │  (in-proc)  │  produce │PostgreSQL │  │   (+ Zookeeper)│  │
│  └─────────────┘          └───────────┘  └───────┬────────┘  │
│                                                   │           │
│                                          ┌────────▼────────┐  │
│                                          │   Notification  │  │
│                                          │    Consumer     │  │
│                                          │  (in-process)   │  │
│                                          └─────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Layer Breakdown

### 4.1 Frontend — React (Vite)

- Auth context with JWT storage (memory + refresh token in httpOnly cookie)
- Protected routes with role-aware redirects (ADMIN / DEPOSITOR / APPROVER)
- Three dashboard views: Admin, Depositor, Approver
- Notification bell polling `GET /notifications` on interval
- Threaded comment UI per report / per version
- Audit log timeline view (admin only)

### 4.2 Backend — FastAPI

```
app/
├── api/              # Route handlers (thin — delegate to services)
│   ├── auth.py
│   ├── reports.py
│   ├── uploads.py
│   ├── reviews.py
│   ├── comments.py
│   ├── audit.py
│   └── notifications.py
├── auth/             # JWT issue, decode, refresh, dependency guards
├── models/           # SQLAlchemy 2.0 ORM models
├── schemas/          # Pydantic request/response models
├── services/         # Business logic (state machine, date validation)
├── kafka/
│   ├── producer.py   # Shared AIOKafkaProducer wrapper
│   └── consumers/    # One consumer per topic group
├── scheduler/        # APScheduler jobs (activation, reminder)
├── uploads/          # File validation, path resolution, storage
├── comments/         # Comment creation, soft-delete, threading
├── audit/            # Audit log writes (called inside service transitions)
└── notifications/    # Notification record creation
```

### 4.3 Database — PostgreSQL

See ERD section (§6). SQLAlchemy 2.0 async with Alembic migrations.

### 4.4 Messaging — Apache Kafka

- **Producer:** called synchronously inside service methods after DB commit
- **Consumers:** long-running async tasks started at app startup (`lifespan`)
- **Consumer group:** `reportflow-notifications`
- **Offset strategy:** auto-commit after successful DB write
- **Error handling:** dead-letter logging, no retry loop in MVP

### 4.5 Scheduler — APScheduler

- Runs inside the FastAPI process (AsyncIOScheduler)
- Polls every 60 seconds
- Two jobs: `check_activations`, `check_reminders`
- Each job queries DB and emits Kafka events for matched reports

### 4.6 File Storage — Local Filesystem

```
uploads/reports/{report_id}/v{version_number}_{original_filename}
```

Docker volume mount ensures persistence across container restarts.

---

## 5. Request Flow Examples

### 5.1 Depositor Upload

```
POST /reports/{id}/upload
        │
        ▼
   Auth guard (JWT + role=DEPOSITOR + assigned check)
        │
        ▼
   UploadService.validate()
   - file type allowed?
   - activation_date ≤ now ≤ due_date?
   - status allows upload?
        │
        ▼
   Write file → uploads/reports/{id}/v{n}_{name}
        │
        ▼
   DB transaction:
   - INSERT ReportVersion
   - UPDATE Report.current_version_id
   - UPDATE Report.status = PENDING
   - INSERT ReportAuditLog (action=uploaded, from_status, to_status=PENDING)
        │
        ▼
   KafkaProducer.emit("report.submitted", payload)
        │
        ▼
   Return 201
```

### 5.2 Notification Consumer

```
Kafka topic: report.submitted
        │
        ▼
   Consumer receives message
        │
        ▼
   Resolve target users (approver for this report)
        │
        ▼
   INSERT Notification per user
        │
        ▼
   Commit offset
```

### 5.3 Scheduler Reminder Job

```
Every 60s:
        │
        ▼
   SELECT reports WHERE reminder_date <= now
     AND reminder_notified = false
     AND status != APPROVED
        │
        ▼
   For each:
   - KafkaProducer.emit("report.reminder", payload)
   - UPDATE reminder_notified = true
```

### 5.4 Status Transition with Audit

```
PATCH /reports/{id}/review
        │
        ▼
   ReviewService.transition(report, new_status, actor)
   - validate transition legality
        │
        ▼
   DB transaction:
   - UPDATE Report.status
   - INSERT ReportAuditLog (actor_id, from_status, to_status, comment)
        │
        ▼
   KafkaProducer.emit("report.<event>", payload)
```

---

## 6. Data Model (ERD)

```
┌──────────────────────┐
│         User         │
├──────────────────────┤
│ id          UUID PK  │◄──────────────────────────────────────┐
│ email       String   │◄──────────────────┐                   │
│ hashed_pass String   │◄──────┐           │                   │
│ role        Enum     │       │           │                   │
│  ADMIN/DEP/APP       │       │           │                   │
└──────────────────────┘       │           │                   │
                               │           │                   │
┌──────────────────────────────┼───────────┼───────────────────┼───┐
│              Report          │           │                   │   │
├──────────────────────────────┼───────────┼───────────────────┼───┤
│ id              UUID PK      │           │                   │   │
│ title           String       │           │                   │   │
│ type            String       │           │                   │   │
│ priority        Enum         │           │                   │   │
│ activation_date Datetime     │           │                   │   │
│ reminder_date   Datetime     │           │                   │   │
│ due_date        Datetime     │           │                   │   │
│ is_active       Boolean      │           │                   │   │
│ status          Enum         │           │                   │   │
│ depositor_id    UUID FK──────┘           │                   │   │
│ current_ver_id  UUID FK (nullable)       │                   │   │
│ created_at      Datetime                 │                   │   │
└──────────────────────────────────────────┼───────────────────┼───┘
         │ 1                               │                   │
         │ N                               │                   │
┌────────▼──────────────┐    ┌─────────────┴────────┐  ┌──────┴──────────┐
│    ReportVersion      │    │    ReportAuditLog     │  │  ReportComment  │
├───────────────────────┤    ├──────────────────────┤  ├─────────────────┤
│ id          UUID PK   │    │ id        UUID PK    │  │ id      UUID PK │
│ report_id   UUID FK   │    │ report_id UUID FK    │  │ report_id FK    │
│ version_num Integer   │◄───│ actor_id  UUID FK    │  │ version_id FK?  │
│ file_path   String    │    │ action    VARCHAR     │  │ author_id FK    │
│ uploaded_at Datetime  │    │ from_status VARCHAR  │  │ parent_id FK?   │
└───────────────────────┘    │ to_status  VARCHAR   │  │ content TEXT    │
                             │ comment    TEXT      │  │ is_deleted Bool │
                             │ metadata   JSON      │  │ created_at      │
                             │ created_at Datetime  │  │ updated_at      │
                             └──────────────────────┘  └─────────────────┘

┌──────────────────────────────────┐
│          Notification            │
├──────────────────────────────────┤
│ id          UUID PK              │
│ user_id     UUID FK → User       │
│ type        String               │
│ message     Text                 │
│ is_read     Boolean default=false│
│ created_at  Datetime             │
└──────────────────────────────────┘
```

---

## 7. Status Machine

```
States: PENDING | APPROVED | REJECTED | TO_REDO | CANCELED

Valid transitions:
  (none)    ──[upload]──►  PENDING
  PENDING   ──[approve]──► APPROVED   (terminal)
  PENDING   ──[reject]───► REJECTED   (terminal)
  PENDING   ──[cancel]───► CANCELED   (terminal)
  PENDING   ──[redo]─────► TO_REDO
  TO_REDO   ──[re-upload]► PENDING    (loop)
```

Every transition writes a `ReportAuditLog` record (actor_id, from_status, to_status, optional comment).

Guard implemented in `ReportService.transition(report, new_status, actor)` — raises `InvalidTransitionError` on illegal move.

---

## 8. Kafka Topic Inventory

| Topic | Producer | Consumer(s) |
|-------|----------|-------------|
| `report.created` | `ReportService` | `NotificationConsumer` |
| `report.activated` | `Scheduler` | `NotificationConsumer` |
| `report.reminder` | `Scheduler` | `NotificationConsumer` |
| `report.submitted` | `UploadService` | `NotificationConsumer` |
| `report.reuploaded` | `UploadService` | `NotificationConsumer` |
| `report.redo_requested` | `ReviewService` | `NotificationConsumer` |
| `report.approved` | `ReviewService` | `NotificationConsumer` |
| `report.rejected` | `ReviewService` | `NotificationConsumer` |
| `report.canceled` | `ReviewService` | `NotificationConsumer` |
| `notification.created` | `NotificationConsumer` | — (future) |

> `report.overdue` topic removed — OVERDUE is no longer a system status.

**Message schema (all topics):**
```json
{
  "event":      "report.submitted",
  "report_id":  "uuid",
  "actor_id":   "uuid",
  "timestamp":  "ISO8601"
}
```

---

## 9. Authentication & Authorization

| Mechanism | Detail |
|-----------|--------|
| Token type | JWT (HS256) |
| Access token TTL | 24h |
| Refresh token TTL | 7d (httpOnly cookie) |
| Guards | FastAPI `Depends` — `require_admin`, `require_depositor`, `require_approver` |
| Ownership check | `require_assigned_depositor(report_id, user)` — depositor only; approver resolved from audit/assignment context |

---

## 10. Docker Compose Services

| Service | Image | Ports | Notes |
|---------|-------|-------|-------|
| `postgres` | `postgres:16` | 5432 | Volume: `pgdata` |
| `zookeeper` | `confluentinc/cp-zookeeper:7` | 2181 | — |
| `kafka` | `confluentinc/cp-kafka:7` | 9092 | Depends on zookeeper |
| `backend` | `./backend` (Dockerfile) | 8000 | Depends on postgres, kafka |
| `frontend` | `./frontend` (Dockerfile) | 3000 | Depends on backend |

Health checks on postgres and kafka — backend waits for both.

---

## 11. Environment Variables

```
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@postgres:5432/reportflow

# Kafka
KAFKA_BOOTSTRAP_SERVERS=kafka:9092

# Auth
SECRET_KEY=<strong-secret>
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Storage
UPLOAD_DIR=/app/uploads
```

---

## 12. Non-Functional Constraints

| Concern | Decision |
|---------|----------|
| File size limit | 10 MB — enforced in upload endpoint |
| Allowed MIME types | pdf, docx, xlsx, png, jpg — checked server-side |
| DB transactions | All status transitions inside `async with session.begin()` — includes audit log write |
| Kafka producer | Fire-and-forget after DB commit — eventual consistency acceptable |
| Consumer idempotency | Not required for MVP — offset auto-commit after DB write |
| Comment soft-delete | `is_deleted = true`, content preserved in DB, hidden in API response |
| HTTPS | Handled at host reverse-proxy layer (out of scope for MVP) |

---

## 13. Out of Scope (MVP)

- Email delivery
- File preview in browser
- Bulk operations
- Horizontal scaling / multi-instance Kafka consumer groups beyond one replica