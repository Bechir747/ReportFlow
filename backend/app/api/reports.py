import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_admin, require_depositor, require_approver
from app.database import get_db
from app.models.report import Report
from app.models.report_audit_log import ReportAuditLog
from app.models.user import User, UserRole
from app.schemas.report import ReportCreate, ReportResponse, ReportUpdate
from app.services.report_service import ReportService
from app.kafka.producer import KafkaProducer

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("", response_model=ReportResponse, status_code=201)
async def create_report(
    body: ReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    service = ReportService(db)
    report = await service.create(body.model_dump(mode="python"))

    producer = KafkaProducer()
    await producer.emit("report.created", {
        "event": "report.created",
        "report_id": str(report.id),
        "actor_id": str(current_user.id),
        "timestamp": report.created_at.isoformat(),
    })

    return ReportResponse(
        id=str(report.id),
        title=report.title,
        type=report.type,
        priority=report.priority,
        status=report.status,
        activation_date=report.activation_date,
        reminder_date=report.reminder_date,
        due_date=report.due_date,
        is_active=report.is_active,
        depositor_id=str(report.depositor_id),
        current_version_id=str(report.current_version_id) if report.current_version_id else None,
        created_at=report.created_at,
    )


@router.get("", response_model=list[ReportResponse])
async def list_reports(
    status: str | None = Query(None),
    priority: str | None = Query(None),
    depositor_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ReportService(db)

    if current_user.role == UserRole.ADMIN:
        filters = {}
        if status:
            filters["status"] = status
        if priority:
            filters["priority"] = priority
        if depositor_id:
            filters["depositor_id"] = depositor_id
        reports = await service.list_all(filters)
    elif current_user.role == UserRole.DEPOSITOR:
        reports = await service.list_for_depositor(current_user.id)
    elif current_user.role == UserRole.APPROVER:
        reports = await service.list_pending()
    else:
        reports = []

    return [
        ReportResponse(
            id=str(r.id),
            title=r.title,
            type=r.type,
            priority=r.priority,
            status=r.status,
            activation_date=r.activation_date,
            reminder_date=r.reminder_date,
            due_date=r.due_date,
            is_active=r.is_active,
            depositor_id=str(r.depositor_id),
            current_version_id=str(r.current_version_id) if r.current_version_id else None,
            created_at=r.created_at,
        )
        for r in reports
    ]


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ReportService(db)
    report = await service.get_by_id(report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    return ReportResponse(
        id=str(report.id),
        title=report.title,
        type=report.type,
        priority=report.priority,
        status=report.status,
        activation_date=report.activation_date,
        reminder_date=report.reminder_date,
        due_date=report.due_date,
        is_active=report.is_active,
        depositor_id=str(report.depositor_id),
        current_version_id=str(report.current_version_id) if report.current_version_id else None,
        created_at=report.created_at,
    )


@router.patch("/{report_id}", response_model=ReportResponse)
async def update_report(
    report_id: uuid.UUID,
    body: ReportUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    service = ReportService(db)
    report = await service.update(report_id, body.model_dump(exclude_none=True))
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    return ReportResponse(
        id=str(report.id),
        title=report.title,
        type=report.type,
        priority=report.priority,
        status=report.status,
        activation_date=report.activation_date,
        reminder_date=report.reminder_date,
        due_date=report.due_date,
        is_active=report.is_active,
        depositor_id=str(report.depositor_id),
        current_version_id=str(report.current_version_id) if report.current_version_id else None,
        created_at=report.created_at,
    )


@router.post("/{report_id}/activate", response_model=ReportResponse)
async def activate_report(
    report_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    service = ReportService(db)
    report = await service.get_by_id(report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.is_active:
        raise HTTPException(status_code=400, detail="Report is already active")

    report.is_active = True

    audit = ReportAuditLog(
        report_id=report.id,
        actor_id=current_user.id,
        action="activated",
        from_status=report.status.value if report.status else None,
        to_status=report.status.value if report.status else None,
        extra_data={"manual_activation": True},
    )
    db.add(audit)

    await db.flush()

    producer = KafkaProducer()
    await producer.emit("report.activated", {
        "event": "report.activated",
        "report_id": str(report.id),
        "actor_id": str(current_user.id),
        "timestamp": report.created_at.isoformat(),
    })

    return ReportResponse(
        id=str(report.id),
        title=report.title,
        type=report.type,
        priority=report.priority,
        status=report.status,
        activation_date=report.activation_date,
        reminder_date=report.reminder_date,
        due_date=report.due_date,
        is_active=report.is_active,
        depositor_id=str(report.depositor_id),
        current_version_id=str(report.current_version_id) if report.current_version_id else None,
        created_at=report.created_at,
    )


@router.delete("/{report_id}", status_code=204)
async def delete_report(
    report_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    service = ReportService(db)
    deleted = await service.delete(report_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Report not found")
