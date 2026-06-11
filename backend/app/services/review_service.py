import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.report import Report, ReportStatus
from app.services.report_service import ReportService


class ReviewService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.report_service = ReportService(db)

    async def review(self, report: Report, new_status: ReportStatus, actor_id: uuid.UUID) -> Report:
        return await self.report_service.transition(report, new_status, actor_id)
