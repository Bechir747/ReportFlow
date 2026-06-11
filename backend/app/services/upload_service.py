import uuid
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.report import Report, ReportStatus
from app.models.report_version import ReportVersion
from app.models.report_audit_log import ReportAuditLog
from app.services.report_service import ReportService


class UploadService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.report_service = ReportService(db)

    def validate_file(self, filename: str, content_length: int) -> None:
        ext = Path(filename).suffix.lower()
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise ValueError(f"File type {ext} not allowed. Allowed: {settings.ALLOWED_EXTENSIONS}")
        if content_length > settings.MAX_UPLOAD_SIZE:
            raise ValueError(f"File size exceeds {settings.MAX_UPLOAD_SIZE // (1024*1024)}MB limit")

    async def upload(self, report: Report, actor_id: uuid.UUID, filename: str, file_content: bytes) -> ReportVersion:
        if report.depositor_id != actor_id:
            raise ValueError("Only the assigned depositor can upload")

        if not report.is_active:
            raise ValueError("Report is not active")
        now = datetime.now(timezone.utc)
        if now > report.due_date:
            raise ValueError("Submission deadline has passed")

        if report.status is None:
            pass
        elif report.status == ReportStatus.TO_REDO:
            pass
        else:
            raise ValueError(f"Upload not allowed in status {report.status}")

        versions_result = await self.db.execute(
            select(ReportVersion).where(ReportVersion.report_id == report.id)
        )
        existing = list(versions_result.scalars().all())
        version_number = len(existing) + 1

        report_dir = Path(settings.UPLOAD_DIR) / str(report.id)
        report_dir.mkdir(parents=True, exist_ok=True)

        storage_name = f"v{version_number}_{filename}"
        file_path = report_dir / storage_name
        file_path.write_bytes(file_content)

        version = ReportVersion(
            report_id=report.id,
            version_number=version_number,
            file_path=str(file_path),
        )
        self.db.add(version)
        await self.db.flush()

        report.current_version_id = version.id

        is_redo = report.status == ReportStatus.TO_REDO
        old_status = report.status.value if report.status else None

        await self.report_service.transition(report, ReportStatus.PENDING, actor_id)

        audit = ReportAuditLog(
            report_id=report.id,
            actor_id=actor_id,
            action="reuploaded" if is_redo else "uploaded",
            from_status=old_status,
            to_status=ReportStatus.PENDING.value,
            extra_data={"version_number": version_number, "file_path": str(file_path)},
        )
        self.db.add(audit)

        return version

    async def get_current_version_path(self, report: Report) -> str | None:
        if report.current_version_id is None:
            return None
        result = await self.db.execute(
            select(ReportVersion).where(ReportVersion.id == report.current_version_id)
        )
        version = result.scalar_one_or_none()
        if version is None:
            return None
        return version.file_path