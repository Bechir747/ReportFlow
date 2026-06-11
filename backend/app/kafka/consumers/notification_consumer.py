import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models.notification import Notification
from app.models.report import Report
from app.models.user import User, UserRole


class NotificationConsumer:
    TOPICS = [
        "report.created",
        "report.activated",
        "report.reminder",
        "report.submitted",
        "report.reuploaded",
        "report.redo_requested",
        "report.approved",
        "report.rejected",
        "report.canceled",
    ]

    @staticmethod
    async def process(topic: str, raw_message: bytes) -> None:
        payload = json.loads(raw_message.decode())
        report_id = payload.get("report_id")

        async with async_session_factory() as db:
            report_result = await db.execute(select(Report).where(Report.id == report_id))
            report = report_result.scalar_one_or_none()
            if report is None:
                return

            target_users = []

            if topic in ("report.submitted", "report.reuploaded"):
                approver_result = await db.execute(
                    select(User).where(User.role == UserRole.APPROVER)
                )
                target_users = list(approver_result.scalars().all())
            elif topic == "report.created":
                pass
            else:
                depositor_result = await db.execute(
                    select(User).where(User.id == report.depositor_id)
                )
                depositor = depositor_result.scalar_one_or_none()
                if depositor:
                    target_users = [depositor]

            messages = {
                "report.activated": "A report has been activated and is ready for submission.",
                "report.reminder": "Reminder: a report submission is due soon.",
                "report.submitted": "A report has been submitted and awaits your review.",
                "report.reuploaded": "A report has been re-uploaded after revision.",
                "report.redo_requested": "Your report has been marked for revision.",
                "report.approved": "Your report has been approved.",
                "report.rejected": "Your report has been rejected.",
                "report.canceled": "A report has been canceled.",
            }

            message = messages.get(topic, f"Event: {topic}")
            for user in target_users:
                notification = Notification(
                    user_id=user.id,
                    type=topic,
                    message=message,
                )
                db.add(notification)

            await db.commit()
