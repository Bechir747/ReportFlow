# ReportFlow

Event-driven workflow management system for report submission, review, and approval.

**Stack:** React + Vite (frontend), FastAPI (backend), PostgreSQL, Apache Kafka, JWT auth, Docker Compose.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (with Docker Compose v2)
- Git

## Quick Start

### 1. Clone the Repository

```bash
git clone <repo-url>
cd ReportFlow
```

### 2. Configure Environment

Copy the example env file and generate a strong secret key:

```bash
cp .env.example .env
```

Generate a secure `SECRET_KEY` (e.g. with Python or PowerShell):

```bash
# PowerShell
python -c "import secrets; print(secrets.token_hex(32))"
```

Open `.env` and replace `<generate-a-strong-secret>` with the generated key.

### 3. Start All Services

```bash
docker compose up --build
```

This starts 5 containers:
| Service | Port (Host) | Description |
|---------|-------------|-------------|
| `postgres` | `5434` | Database |
| `zookeeper` | `2181` | Kafka coordinator |
| `kafka` | `9092` | Event broker |
| `backend` | `8001` | FastAPI backend |
| `frontend` | `3001` | Vite dev server |

Wait for all services to be healthy — the backend waits for postgres and kafka.

### 4. Create Kafka Topics

Open a **new terminal** and run:

```bash
.\scripts\create_kafka_topics.ps1
```

This creates all 10 required topics (`report.created`, `report.submitted`, `report.approved`, etc.) inside the Kafka container.

### 5. Seed Users

Seed three default accounts into the database:

```bash
docker exec -it reportflow-backend python -m app.seed.seed_users
```

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@reportflow.com` | `admin123` |
| Depositor | `depositor@reportflow.com` | `depositor123` |
| Approver | `approver@reportflow.com` | `approver123` |

### 6. Access the Application

Open [http://localhost:3001](http://localhost:3001) in your browser.

Log in with any of the seeded accounts — the UI redirects to the appropriate dashboard based on role.

---

## Verifying It Works

**Health check:**
```bash
curl http://localhost:8001/health
# → {"status":"ok"}
```

**Login test:**
```bash
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@reportflow.com","password":"admin123"}'
# → {"access_token":"...","refresh_token":"...","user":{...}}
```

---

## Useful Commands

| Action | Command |
|--------|---------|
| View logs | `docker compose logs -f [service]` |
| Rebuild a service | `docker compose up -d --build [service]` |
| Stop everything | `docker compose down` |
| Stop + delete volumes | `docker compose down -v` |
| Access DB shell | `docker exec -it reportflow-postgres psql -U user -d reportflow` |
| Run backend commands | `docker exec -it reportflow-backend python -m ...` |

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | None | Login |
| POST | `/api/auth/refresh` | None | Refresh token |
| POST | `/api/auth/logout` | JWT | Logout |
| GET | `/api/auth/me` | JWT | Current user |
| GET | `/api/users` | Admin | List all users |
| POST | `/api/reports` | Admin | Create report |
| GET | `/api/reports` | JWT | List reports (scoped by role) |
| GET | `/api/reports/{id}` | JWT | Get report detail |
| PATCH | `/api/reports/{id}` | Admin | Update report |
| DELETE | `/api/reports/{id}` | Admin | Delete report |
| POST | `/api/reports/{id}/activate` | Admin | Activate report |
| POST | `/api/reports/{id}/upload` | Depositor | Upload file |
| GET | `/api/reports/{id}/download` | JWT | Download latest file |
| GET | `/api/reports/{id}/versions` | JWT | List versions |
| GET | `/api/reports/{id}/versions/{vid}/download` | JWT | Download specific version |
| PATCH | `/api/reports/{id}/review` | Approver | Review (approve/reject/redo/cancel) |
| POST | `/api/reports/{id}/comments` | JWT | Post comment |
| GET | `/api/reports/{id}/comments` | JWT | List comments |
| DELETE | `/api/reports/{id}/comments/{cid}` | JWT | Delete comment |
| GET | `/api/reports/{id}/audit` | Admin | View audit log |
| GET | `/api/notifications` | JWT | List notifications |
| PATCH | `/api/notifications/{id}/read` | JWT | Mark notification read |

---

## Project Structure

```
ReportFlow/
├── backend/               # FastAPI application
│   ├── app/
│   │   ├── api/           # Route handlers
│   │   ├── auth/          # JWT + dependency guards
│   │   ├── models/        # SQLAlchemy ORM models
│   │   ├── schemas/       # Pydantic request/response models
│   │   ├── services/      # Business logic
│   │   ├── kafka/         # Producers + consumers
│   │   ├── scheduler/     # APScheduler jobs
│   │   ├── seed/          # Database seeders
│   │   ├── config.py      # Settings
│   │   ├── database.py    # DB engine + session
│   │   └── main.py        # App entry point
│   ├── alembic/           # DB migrations (config only)
│   └── requirements.txt
├── frontend/              # React + Vite application
│   ├── src/
│   │   ├── api/           # Axios client
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # Auth + toast contexts
│   │   ├── pages/         # Dashboard views
│   │   └── types/         # TypeScript types
│   └── package.json
├── scripts/               # Utility scripts
├── specs/                 # Project specifications
├── docker-compose.yml
└── .env.example
```
