import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_admin
from app.database import get_db
from app.models.report_audit_log import ReportAuditLog
from app.models.user import User

router = APIRouter(prefix="/api/reports", tags=["audit"])


@router.get("/{report_id}/audit")
async def get_audit_log(
    report_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    result = await db.execute(
        select(ReportAuditLog)
        .where(ReportAuditLog.report_id == report_id)
        .order_by(ReportAuditLog.created_at.asc())
    )
    logs = result.scalars().all()

    return [
        {
            "id": str(log.id),
            "actor_id": str(log.actor_id),
            "action": log.action,
            "from_status": log.from_status,
            "to_status": log.to_status,
            "comment": log.comment,
            "extra_data": log.extra_data,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]
