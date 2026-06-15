# MINIO_MIGRATION.md — Centralized File Storage with MinIO

## 1. Motivation

| Current (Local FS) | Target (MinIO) |
|---|---|
| Files written to a Docker named volume via `Path.write_bytes()` | Files stored in an S3-compatible object store |
| Download served by `FileResponse` reading from disk in-process | Download via presigned URLs or streaming proxy |
| Volume is opaque — no UI to browse files | MinIO Console provides a web UI for management |
| Cannot scale backend to multiple replicas (volume per-node) | Any number of replicas can read/write from MinIO |
| Backup requires Docker volume commands | Backup via MinIO CLI or S3 API |
| Path depends on container filesystem layout | Object key is portable across environments |

**Decision: Replace the local Docker volume with MinIO.**

---

## 2. Architecture Change

### Before

```
Depositor
  ↓ POST /reports/{id}/upload (multipart)
Backend
  ├─ validates file
  ├─ writes to /app/uploads/{report_id}/v{n}_{name}  ← Docker volume
  └─ stores absolute path in ReportVersion.file_path

Approver
  ↓ GET /reports/{id}/download
Backend
  ├─ reads ReportVersion.file_path
  ├─ Path.exists() check
  └─ returns FileResponse(path)
```

### After

```
Depositor
  ↓ POST /reports/{id}/upload (multipart)
Backend
  ├─ validates file
  ├─ UploadService calls StorageService.put_object()
  │     ↓
  │   MinIO bucket: reportflow/reports/{id}/v{n}_{name}
  └─ stores object key in ReportVersion.file_path

Approver
  ↓ GET /reports/{id}/download
Backend
  ├─ UploadService calls StorageService.get_presigned_url()
  │     ↓
  │   MinIO returns a time-limited URL
  └─ returns 302 redirect to presigned URL
```

**Download via presigned URL** (alternative):
- Backend verifies authorization, returns a `307 Temporary Redirect` to the presigned URL
- Client downloads directly from MinIO — no load on the backend process
- URL expires after 5 minutes
- ⚠️  The presigned URL contains the Docker-internal hostname (`minio:9000`), which is unreachable from the host browser

**Proxy through backend** (chosen for this project):
- Backend fetches from MinIO and streams the response via `Response(content=data)`
- Works from any client (host browser, curl, etc.)
- Slightly more backend load but acceptable at current scale (~100 concurrent users)
- No CORS or hostname resolution issues

---

## 3. MinIO Object Key Convention

```
reports/{report_id}/v{version_number}_{original_filename}
```

Examples:
```
reports/6403f7f2-15c1-4ce2-a46d-323bfd217400/v1_Q1_Report.pdf
reports/6403f7f2-15c1-4ce2-a46d-323bfd217400/v2_Q1_Report_revised.pdf
```

Changes from current convention:
- `/app/uploads/` prefix is dropped — key is relative to the bucket
- Bucket name (`reportflow`) is configured in settings, not hardcoded

---

## 4. Configuration (new env vars)

| Variable | Default | Description |
|---|---|---|
| `MINIO_ENDPOINT` | `minio:9000` | MinIO server host:port |
| `MINIO_ACCESS_KEY` | `minioadmin` | Access key |
| `MINIO_SECRET_KEY` | `minioadmin` | Secret key |
| `MINIO_BUCKET` | `reportflow` | Bucket name |
| `MINIO_SECURE` | `false` | Use TLS (false for Docker internal) |
| `UPLOAD_DIR` | *(removed)* | No longer used |

Existing settings kept:
- `ALLOWED_EXTENSIONS` — still validated before upload
- `MAX_UPLOAD_SIZE` — still validated before upload

---

## 5. Files to Create

### `backend/app/services/storage_service.py`

A wrapper around `boto3` (or `minio` Python SDK) exposing:

| Method | Signature | Description |
|---|---|---|
| `put_object` | `(key: str, data: bytes) -> str` | Upload bytes, return object key |
| `get_object` | `(key: str) -> bytes` | Download object bytes (fallback) |
| `get_presigned_url` | `(key: str, expires_in: int = 300) -> str` | Generate GET presigned URL |
| `delete_object` | `(key: str) -> None` | Delete object |
| `object_exists` | `(key: str) -> bool` | Check if object exists |

Implementation choice: **`boto3`** over `minio` Python SDK because:
- `boto3` is the industry standard S3 SDK
- Easy to switch to AWS S3, DigitalOcean Spaces, etc. later
- More documentation and community support

Alternative: `minio` SDK is lighter and has no C extension dependency — acceptable if keeping it simple wins.

---

## 6. Files to Modify

### `backend/requirements.txt`
```diff
+ boto3>=1.35.0
```

### `backend/app/config.py`
```diff
class Settings(BaseSettings):
     DATABASE_URL: str = ...
     KAFKA_BOOTSTRAP_SERVERS: str = ...
     SECRET_KEY: str = ...
     ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
     REFRESH_TOKEN_EXPIRE_DAYS: int = 7
-    UPLOAD_DIR: str = "/app/uploads"
     ALLOWED_EXTENSIONS: set[str] = {".pdf", ".docx", ".xlsx", ".png", ".jpg"}
     MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024
+    MINIO_ENDPOINT: str = "minio:9000"
+    MINIO_ACCESS_KEY: str = "minioadmin"
+    MINIO_SECRET_KEY: str = "minioadmin"
+    MINIO_BUCKET: str = "reportflow"
+    MINIO_SECURE: bool = False
```

### `backend/app/services/upload_service.py`

Replace filesystem operations with StorageService calls:

```diff
- import os
- from pathlib import Path
+ from app.services.storage_service import StorageService

     async def upload(self, report, actor_id, filename, file_content):
         ...
-        report_dir = Path(settings.UPLOAD_DIR) / str(report.id)
-        report_dir.mkdir(parents=True, exist_ok=True)
-        storage_name = f"v{version_number}_{filename}"
-        file_path = report_dir / storage_name
-        file_path.write_bytes(file_content)
+        object_key = f"reports/{report.id}/v{version_number}_{filename}"
+        storage = StorageService()
+        storage.put_object(object_key, file_content)

         version = ReportVersion(
             report_id=report.id,
             version_number=version_number,
-            file_path=str(file_path),
+            file_path=object_key,         # now stores object key, not absolute path
         )
         ...
```

### `backend/app/api/uploads.py`

Replace `FileResponse` with proxy streaming from MinIO:

```diff
- from fastapi.responses import FileResponse
+ from fastapi.responses import Response

 @router.get("/{report_id}/download")
 async def download_file(...):
     ...
-    path = Path(file_path)
-    if not path.exists():
-        raise HTTPException(status_code=404, detail="File not found on storage")
-    return FileResponse(path, filename=path.name)
+    storage = StorageService()
+    data = storage.get_object(file_path)
+    if data is None:
+        raise HTTPException(status_code=404, detail="File not found on storage")
+    filename = file_path.rsplit("/", 1)[-1]
+    return Response(content=data, media_type="application/octet-stream",
+                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})
```

Same change for `GET /{report_id}/versions/{version_id}/download`.

### `backend/app/api/uploads.py` — `list_versions` endpoint

No change needed — still returns `file_path` string (now an object key instead of an absolute path). If the frontend uses `file_path` for display, it will now show the object key format; consider returning only the filename for display.

### `docker-compose.yml`

```diff
 services:
+  minio:
+    image: minio/minio:latest
+    container_name: reportflow-minio
+    ports:
+      - "9000:9000"    # S3 API
+      - "9001:9001"    # Console UI
+    environment:
+      MINIO_ROOT_USER: minioadmin
+      MINIO_ROOT_PASSWORD: minioadmin
+    command: server /data --console-address ":9001"
+    volumes:
+      - minio_data:/data
+    healthcheck:
+      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
+      interval: 10s
+      retries: 5

   backend:
     depends_on:
       postgres:
         condition: service_healthy
       kafka:
         condition: service_started
+      minio:
+        condition: service_started
     environment:
+      MINIO_ENDPOINT: minio:9000
+      MINIO_ACCESS_KEY: minioadmin
+      MINIO_SECRET_KEY: minioadmin
+      MINIO_BUCKET: reportflow
+      MINIO_SECURE: "false"
     volumes:
       - ./backend:/app
-      - uploads:/app/uploads

 volumes:
   pgdata:
-  uploads:
+  minio_data:

```

### `frontend/src/pages/ApproverDashboard.tsx`

No change needed — the backend streams through MinIO proxy, so the existing `responseType: "blob"` / `URL.createObjectURL` pattern works unchanged.

---

## 7. Migration: Existing Files

Files currently stored in the `uploads` Docker volume must be copied into MinIO.

### One-time migration script

Created at `backend/scripts/migrate_to_minio.py`:

```python
"""
Usage: docker compose exec backend python scripts/migrate_to_minio.py

Scans all ReportVersion rows, reads each file from the old uploads volume,
and uploads it to MinIO. Updates file_path to the object key afterward.
"""
import asyncio
from pathlib import Path
from sqlalchemy import select
from app.database import get_db_session
from app.models.report_version import ReportVersion
from app.services.storage_service import StorageService


async def migrate():
    storage = StorageService()
    async with get_db_session() as db:
        result = await db.execute(select(ReportVersion))
        versions = result.scalars().all()
        for v in versions:
            old_path = Path(v.file_path)
            if not old_path.exists():
                print(f"SKIP  {v.id}: {old_path} not found")
                continue
            data = old_path.read_bytes()
            key = f"reports/{v.report_id}/v{v.version_number}_{old_path.name.split('_', 1)[1]}"
            storage.put_object(key, data)
            v.file_path = key
            print(f"DONE  {v.id}: {old_path} → {key}")
        await db.commit()

asyncio.run(migrate())
```

> **Pre-requisite:** Run `docker compose run --rm backend python -c "from app.config import settings; print(settings.UPLOAD_DIR)"` to confirm the old files are still accessible before migration.

### Bucket initialization

MinIO auto-creates buckets on first `put_object` if `MINIO_BUCKET` does not exist. Alternatively, create a startup script or init container.

---

## 8. Rollback Plan

If MinIO causes issues:

1. Revert `docker-compose.yml` — restore `uploads` volume, remove `minio` service
2. Revert `config.py` — restore `UPLOAD_DIR`
3. Revert `upload_service.py` — undo StorageService calls
4. Revert `uploads.py` — restore `FileResponse`
5. Run migration script in reverse: `minio_to_local.py`
6. `docker compose up -d --build backend`

---

## 9. Implementation Order

| Step | Files | Status |
|---|---|---|
| 1. Add `minio` service to docker-compose.yml | `docker-compose.yml` | ✅ Done |
| 2. Add `boto3` to requirements | `requirements.txt` | ✅ Done |
| 3. Add MinIO config fields | `config.py`, `.env`, `.env.example` | ✅ Done |
| 4. Create `StorageService` | `backend/app/services/storage_service.py` | ✅ Done |
| 5. Refactor `UploadService` to use MinIO | `upload_service.py` | ✅ Done |
| 6. Refactor download endpoints to proxy through backend | `uploads.py` | ✅ Done |
| 7. Update frontend download (no change needed) | `ApproverDashboard.tsx` | ✅ Done (unchanged) |
| 8. Create migration script | `backend/scripts/migrate_to_minio.py` | ✅ Done |
| 9. Create e2e test script | `backend/scripts/e2e_test.py` | ✅ Done |
| 10. Rebuild containers and test | — | ✅ Done |
| 11. Run migration script | — | ✅ Done (2 files migrated) |
| 12. Remove old `uploads` volume from docker-compose | `docker-compose.yml` | ✅ Done |
| 13. Clean up test data (optional) | — | Pending |
| **Total** | | **~1.5 hours** |

---

## 10. Security Considerations

| Concern | Mitigation |
|---|---|
| Files stream through backend | MinIO is not exposed to end users — all traffic goes through the FastAPI auth layer |
| MinIO exposed on network | Internal Docker network only; host ports 9100/9101 for dev access only |
| Credentials in env file | MinIO root credentials should match same security posture as DB/Kafka creds |
| Existing files in volume | Migration script runs inside container, reads directly, no network exposure of old data |
| HTTPS not enforced internally | `MINIO_SECURE = False` is safe within Docker internal network; set to True for external MinIO |

---

## 11. Testing Checklist

- [x] `docker compose up -d` — minio container starts healthy
- [x] MinIO Console accessible at `http://localhost:9101` (login: minioadmin/minioadmin)
- [x] Admin creates a report, deposits a file — file appears in MinIO bucket
- [x] Approver downloads file — 200 OK with file content streamed through backend
- [x] Approver downloads a specific version — 200 OK with file content streamed through backend
- [x] Depository cannot download reports not assigned to them — 403
- [x] Migration script copies all existing files to MinIO
- [x] `docker compose down -v` does not lose files (minio_data volume persists)
- [ ] Rollback plan works
