"""
Migrate existing files from local Docker volume to MinIO.

Usage:
  docker compose exec backend python scripts/migrate_to_minio.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import async_session_factory
from app.models.report_version import ReportVersion
from app.services.storage_service import StorageService


async def migrate():
    storage = StorageService()
    old_upload_dir = Path("/app/uploads")

    if not old_upload_dir.exists():
        print("No /app/uploads directory found. Nothing to migrate.")
        return

    async with async_session_factory() as session:
        session: AsyncSession
        result = await session.execute(select(ReportVersion))
        versions = result.scalars().all()

        if not versions:
            print("No ReportVersion records found. Nothing to migrate.")
            return

        migrated = 0
        skipped = 0
        for v in versions:
            old_path = Path(v.file_path)
            if not old_path.exists():
                print(f"  SKIP  {v.id}: file not found at {old_path}")
                skipped += 1
                continue

            if old_path.is_absolute():
                relative = old_path.relative_to(old_upload_dir)
                new_key = f"reports/{relative}"
            else:
                new_key = f"reports/{v.report_id}/v{v.version_number}_{old_path.name}"

            data = old_path.read_bytes()
            storage.put_object(new_key, data)

            v.file_path = new_key
            print(f"  DONE  {v.id}: {old_path.name} -> {new_key}")
            migrated += 1

        await session.commit()

    print(f"\nMigration complete: {migrated} migrated, {skipped} skipped.")


if __name__ == "__main__":
    asyncio.run(migrate())
