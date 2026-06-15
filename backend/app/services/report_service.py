import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.report import Report, ReportPriority, ReportStatus
from app.models.report_audit_log import ReportAuditLog
from app.models.report_version import ReportVersion
from app.services.storage_service import StorageService


class ReportService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: dict) -> Report:
        report = Report(
            title=data["title"],
            type=data["type"],
            priority=ReportPriority(data["priority"]),
            activation_date=data["activation_date"],
            reminder_date=data["reminder_date"],
            due_date=data["due_date"],
            depositor_id=uuid.UUID(data["depositor_id"]),
            approver_id=uuid.UUID(data["approver_id"]) if data.get("approver_id") else None,
        )
        self.db.add(report)
        await self.db.flush()

        audit = ReportAuditLog(
            report_id=report.id,
            actor_id=report.depositor_id,
            action="created",
            from_status=None,
            to_status=None,
            extra_data={"title": report.title},
        )
        self.db.add(audit)
        return report

    async def get_by_id(self, report_id: uuid.UUID) -> Report | None:
        result = await self.db.execute(select(Report).where(Report.id == report_id))
        return result.scalar_one_or_none()

    async def list_all(self, filters: dict | None = None) -> list[Report]:
        query = select(Report)
        if filters:
            if "status" in filters:
                query = query.where(Report.status == filters["status"])
            if "priority" in filters:
                query = query.where(Report.priority == filters["priority"])
            if "depositor_id" in filters:
                query = query.where(Report.depositor_id == uuid.UUID(filters["depositor_id"]))
            if "approver_id" in filters:
                query = query.where(Report.approver_id == uuid.UUID(filters["approver_id"]))
        query = query.order_by(Report.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def list_for_depositor(self, depositor_id: uuid.UUID) -> list[Report]:
        result = await self.db.execute(
            select(Report).where(Report.depositor_id == depositor_id).order_by(Report.created_at.desc())
        )
        return list(result.scalars().all())

    async def list_pending(self) -> list[Report]:
        result = await self.db.execute(
            select(Report).where(Report.status == ReportStatus.PENDING).order_by(Report.created_at.desc())
        )
        return list(result.scalars().all())

    async def list_for_approver(self, approver_id: uuid.UUID) -> list[Report]:
        result = await self.db.execute(
            select(Report)
            .where(Report.approver_id == approver_id, Report.status == ReportStatus.PENDING)
            .order_by(Report.created_at.desc())
        )
        return list(result.scalars().all())

    async def update(self, report_id: uuid.UUID, data: dict) -> Report | None:
        report = await self.get_by_id(report_id)
        if report is None:
            return None

        for key, value in data.items():
            if value is not None and hasattr(report, key):
                if key in ("depositor_id", "approver_id"):
                    value = uuid.UUID(value)
                setattr(report, key, value)

        await self.db.flush()
        return report

    async def delete(self, report_id: uuid.UUID, actor_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            select(Report)
            .options(selectinload(Report.versions))
            .where(Report.id == report_id)
        )
        report = result.scalar_one_or_none()
        if report is None:
            return False

        storage = StorageService()

        # Clear current_version_id FK before deleting versions
        if report.current_version_id:
            report.current_version_id = None
            await self.db.flush()

        # Delete MinIO files for each version
        for version in report.versions:
            if version.file_path:
                storage.delete_object(version.file_path)

        # Create audit log entry for deletion
        audit = ReportAuditLog(
            report_id=report.id,
            actor_id=actor_id,
            action="deleted",
            from_status=report.status.value if report.status else None,
            to_status=None,
        )
        self.db.add(audit)
        await self.db.flush()

        await self.db.delete(report)
        return True

    async def transition(self, report: Report, new_status: ReportStatus, actor_id: uuid.UUID) -> Report:
        valid_transitions = {
            None: [ReportStatus.PENDING],
            ReportStatus.PENDING: [ReportStatus.APPROVED, ReportStatus.REJECTED, ReportStatus.TO_REDO, ReportStatus.CANCELED],
            ReportStatus.TO_REDO: [ReportStatus.PENDING],
        }

        allowed = valid_transitions.get(report.status, [])
        if new_status not in allowed:
            raise ValueError(f"Cannot transition from {report.status} to {new_status}")

        from_status = report.status.value if report.status else None
        report.status = new_status
        await self.db.flush()

        actions = {
            ReportStatus.PENDING: "uploaded" if from_status is None else "reuploaded",
            ReportStatus.APPROVED: "approved",
            ReportStatus.REJECTED: "rejected",
            ReportStatus.TO_REDO: "redo_requested",
            ReportStatus.CANCELED: "canceled",
        }

        audit = ReportAuditLog(
            report_id=report.id,
            actor_id=actor_id,
            action=actions.get(new_status, "transitioned"),
            from_status=from_status,
            to_status=new_status.value,
        )
        self.db.add(audit)
        return report
