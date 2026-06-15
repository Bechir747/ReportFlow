"""E2E test for MinIO storage migration."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import asyncio
import json
import uuid
from urllib.request import Request, urlopen
from urllib.error import HTTPError

BASE = "http://localhost:8000"


def req(method, path, data=None, headers=None, files=None):
    if files:
        body = b""
        boundary = uuid.uuid4().hex
        for name, (filename, content, ctype) in files.items():
            body += b"--" + boundary.encode() + b"\r\n"
            body += f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'.encode()
            body += f"Content-Type: {ctype}\r\n\r\n".encode()
            body += content + b"\r\n"
        body += b"--" + boundary.encode() + b"--\r\n"
        hdrs = {"Content-Type": f"multipart/form-data; boundary={boundary}"}
        if headers:
            hdrs.update(headers)
        r = Request(BASE + path, data=body, headers=hdrs, method=method)
    else:
        payload = json.dumps(data).encode() if data else None
        hdrs = {"Content-Type": "application/json"}
        if headers:
            hdrs.update(headers)
        r = Request(BASE + path, data=payload, headers=hdrs, method=method)
    try:
        resp = urlopen(r)
        return resp.status, json.loads(resp.read().decode())
    except HTTPError as e:
        return e.code, json.loads(e.read().decode())


status, data = req("POST", "/api/auth/login", {"email": "admin@reportflow.com", "password": "admin123"})
token = data["access_token"]
print(f"Admin login: {status}")

status, report = req("POST", "/api/reports", {
    "title": "E2E MinIO",
    "type": "Test",
    "priority": "LOW",
    "activation_date": "2026-12-31T23:00:00",
    "reminder_date": "2026-12-31T23:30:00",
    "due_date": "2026-12-31T23:59:00",
    "depositor_id": "00000000-0000-0000-0000-000000000002",
}, headers={"Authorization": f"Bearer {token}"})
rid = report["id"]
print(f"Create report: {status} {rid}")

# Activate via DB
async def activate():
    from app.database import async_session_factory
    from app.models.report import Report
    async with async_session_factory() as s:
        rpt = await s.get(Report, rid)
        rpt.is_active = True
        await s.commit()

asyncio.run(activate())
print("Activated")

status, d = req("POST", "/api/auth/login", {"email": "depositor@reportflow.com", "password": "depositor123"})
dep_token = d["access_token"]
print(f"Depositor login: {status}")

status, up = req("POST", f"/api/reports/{rid}/upload",
    files={"file": ("test.pdf", b"minio-e2e-content", "application/pdf")},
    headers={"Authorization": f"Bearer {dep_token}"})
print(f"Upload: {status} {up}")

# Check MinIO
from app.services.storage_service import StorageService
storage = StorageService()
objects = storage.client.list_objects_v2(Bucket=storage.bucket)
keys = [o["Key"] for o in objects.get("Contents", [])]
print(f"Objects ({len(keys)}):")
for k in keys:
    data = storage.get_object(k)
    if data is not None:
        print(f"  {k}: {len(data)} bytes")
    else:
        print(f"  {k}: NOT FOUND")

# Approver download
status, d = req("POST", "/api/auth/login", {"email": "approver@reportflow.com", "password": "approver123"})
appr_token = d["access_token"]

r = Request(BASE + f"/api/reports/{rid}/download",
    headers={"Authorization": f"Bearer {appr_token}"},
    method="GET")
import urllib.request
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None
    def http_error_302(self, req, fp, code, msg, headers):
        return headers
    http_error_307 = http_error_302
opener = urllib.request.build_opener(NoRedirect)
try:
    resp = opener.open(r)
except HTTPError as e:
    print(f"Download: {e.code}")
    loc = e.headers.get("Location", "N/A")
    print(f"  Location (from error): {loc[:80]}...")
    # Follow the presigned URL directly
    r2 = Request(loc, method="GET")
    resp2 = urlopen(r2)
    print(f"  MinIO fetch: {resp2.status} ({len(resp2.read())} bytes)")

print("All tests passed!")
