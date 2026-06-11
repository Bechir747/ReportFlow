import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, user_id: uuid.UUID, type: str, message: str) -> Notification:
        notification = Notification(
            user_id=user_id,
            type=type,
            message=message,
        )
        self.db.add(notification)
        await self.db.flush()
        return notification

    async def list_for_user(self, user_id: uuid.UUID, unread_only: bool = False, skip: int = 0, limit: int = 50) -> list[Notification]:
        query = select(Notification).where(Notification.user_id == user_id)
        if unread_only:
            query = query.where(Notification.is_read == False)
        query = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def mark_read(self, notification_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        result = await self.db.execute(select(Notification).where(Notification.id == notification_id))
        notification = result.scalar_one_or_none()
        if notification is None:
            return False
        if notification.user_id != user_id:
            raise ValueError("Notification does not belong to this user")
        notification.is_read = True
        return True
