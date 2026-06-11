import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.report_comment import ReportComment


class CommentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, report_id: uuid.UUID, author_id: uuid.UUID, data: dict) -> ReportComment:
        comment = ReportComment(
            report_id=report_id,
            author_id=author_id,
            content=data["content"],
            version_id=uuid.UUID(data["version_id"]) if data.get("version_id") else None,
            parent_comment_id=uuid.UUID(data["parent_comment_id"]) if data.get("parent_comment_id") else None,
        )
        self.db.add(comment)
        await self.db.flush()
        return comment

    async def get_by_report(self, report_id: uuid.UUID) -> list[ReportComment]:
        result = await self.db.execute(
            select(ReportComment)
            .where(ReportComment.report_id == report_id)
            .order_by(ReportComment.created_at.asc())
        )
        return list(result.scalars().all())

    async def soft_delete(self, comment_id: uuid.UUID, user_id: uuid.UUID, is_admin: bool = False) -> bool:
        result = await self.db.execute(select(ReportComment).where(ReportComment.id == comment_id))
        comment = result.scalar_one_or_none()
        if comment is None:
            return False
        if comment.author_id != user_id and not is_admin:
            raise ValueError("Not authorized to delete this comment")
        comment.is_deleted = True
        return True
