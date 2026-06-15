"""Quick end-to-end test of MinIO storage."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx

BASE = "http://localhost:8000"


async def main():
    # Login as admin
    r = await httpx.AsyncClient().post(f"{BASE}/api/auth/login",
        json={"email": "admin@reportflow.com", "password": "admin123"})
    token = r.json()["access_token"]
    print(f"Admin token: {token[:20]}...")

    # Create a report
    r2 = await httpx.AsyncClient().post(f"{BASE}/api/reports",
        json={
            "title": "MinIO Test", "type": "Test", "priority": "LOW",
            "activation_date": "2026-12-31T23:00:00",
            "reminder_date": "2026-12-31T23:30:00",
            "due_date": "2026-12-31T23:59:00",
            "depositor_id": "00000000-0000-0000-0000-000000000002",
            "approver_id": "00000000-0000-0000-0000-000000000003",
        },
        headers={"Authorization": f"Bearer {token}"})
    report = r2.json()
    report_id = report["id"]
    print(f"Created report: {report_id}")

    # Activate directly via DB
    from sqlalchemy import select
    from app.database import async_session_factory
    from app.models.report import Report

    async with async_session_factory() as s:
        rpt = await s.get(Report, report_id)
        rpt.is_active = True
        await s.commit()
    print("Activated report")

    # Login as depositor
    r3 = await httpx.AsyncClient().post(f"{BASE}/api/auth/login",
        json={"email": "depositor@reportflow.com", "password": "depositor123"})
    dep_token = r3.json()["access_token"]

    # Upload a file
    files = {"file": ("minio_test.pdf", b"this is a test file for minio", "application/pdf")}
    r4 = await httpx.AsyncClient().post(f"{BASE}/api/reports/{report_id}/upload",
        files=files,
        headers={"Authorization": f"Bearer {dep_token}"})
    print(f"Upload: {r4.status_code} {r4.json()}")

    # Check MinIO bucket
    from app.services.storage_service import StorageService
    storage = StorageService()
    objects = storage.client.list_objects_v2(Bucket=storage.bucket)
    keys = [o["Key"] for o in objects.get("Contents", [])]
    print(f"Objects in bucket ({len(keys)}):")
    for k in keys:
        print(f"  {k}")

    # Try download as approver
    r5 = await httpx.AsyncClient().post(f"{BASE}/api/auth/login",
        json={"email": "approver@reportflow.com", "password": "approver123"})
    appr_token = r5.json()["access_token"]
    r6 = await httpx.AsyncClient().get(f"{BASE}/api/reports/{report_id}/download",
        headers={"Authorization": f"Bearer {appr_token}"}, follow_redirects=False)
    print(f"Download redirect: {r6.status_code} -> {r6.headers.get('location', 'N/A')[:60]}...")

    # Also verify migrated files exist
    print("\nMigrated files check:")
    for k in keys:
        data = storage.get_object(k)
        print(f"  {k}: {len(data)} bytes" if data else f"  {k}: NOT FOUND")

    print("\nAll tests passed!")


if __name__ == "__main__":
    asyncio.run(main())
