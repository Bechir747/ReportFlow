from datetime import datetime, timezone

from sqlalchemy import select

from app.database import async_session_factory
from app.kafka.producer import KafkaProducer
from app.models.report import Report, ReportStatus


async def check_activations() -> None:
    now = datetime.now(timezone.utc)
    async with async_session_factory() as db:
        result = await db.execute(
            select(Report).where(
                Report.activation_date <= now,
                Report.is_active == False,
            )
        )
        reports = list(result.scalars().all())

        producer = KafkaProducer()
        for report in reports:
            report.is_active = True
            await producer.emit("report.activated", {
                "event": "report.activated",
                "report_id": str(report.id),
                "actor_id": str(report.depositor_id),
                "timestamp": now.isoformat(),
            })

        await db.commit()


async def check_reminders() -> None:
    now = datetime.now(timezone.utc)
    async with async_session_factory() as db:
        result = await db.execute(
            select(Report).where(
                Report.reminder_date <= now,
                Report.reminder_notified == False,
                Report.status != ReportStatus.APPROVED,
                Report.status != ReportStatus.CANCELED,
                Report.status != ReportStatus.REJECTED,
            )
        )
        reports = list(result.scalars().all())

        producer = KafkaProducer()
        for report in reports:
            report.reminder_notified = True
            await producer.emit("report.reminder", {
                "event": "report.reminder",
                "report_id": str(report.id),
                "actor_id": str(report.depositor_id),
                "timestamp": now.isoformat(),
            })

        await db.commit()
