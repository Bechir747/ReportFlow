import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_approver
from app.database import get_db
from app.models.report import ReportStatus
from app.models.user import User
from app.schemas.report import ReviewRequest, ReportResponse
from app.services.review_service import ReviewService
from app.services.report_service import ReportService
from app.kafka.producer import KafkaProducer

router = APIRouter(prefix="/api/reports", tags=["reviews"])


@router.patch("/{report_id}/review", response_model=ReportResponse)
async def review_report(
    report_id: uuid.UUID,
    body: ReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_approver),
):
    report_service = ReportService(db)
    report = await report_service.get_by_id(report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    review_service = ReviewService(db)
    new_status = ReportStatus(body.status)

    try:
        report = await review_service.review(report, new_status, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    topic_map = {
        ReportStatus.APPROVED: "report.approved",
        ReportStatus.REJECTED: "report.rejected",
        ReportStatus.TO_REDO: "report.redo_requested",
        ReportStatus.CANCELED: "report.canceled",
    }

    topic = topic_map.get(new_status, "report.transitioned")
    producer = KafkaProducer()
    await producer.emit(topic, {
        "event": topic,
        "report_id": str(report.id),
        "actor_id": str(current_user.id),
        "timestamp": report.created_at.isoformat(),
    })

    return ReportResponse(
        id=str(report.id),
        title=report.title,
        type=report.type,
        priority=report.priority.value,
        status=report.status.value if report.status else None,
        activation_date=report.activation_date,
        reminder_date=report.reminder_date,
        due_date=report.due_date,
        is_active=report.is_active,
        depositor_id=str(report.depositor_id),
        approver_id=str(report.approver_id) if report.approver_id else None,
        current_version_id=str(report.current_version_id) if report.current_version_id else None,
        created_at=report.created_at,
    )
