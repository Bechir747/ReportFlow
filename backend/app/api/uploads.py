import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.report_version import ReportVersion
from app.models.user import User, UserRole
from app.services.report_service import ReportService
from app.services.upload_service import UploadService
from app.kafka.producer import KafkaProducer

router = APIRouter(prefix="/api/reports", tags=["uploads"])


@router.post("/{report_id}/upload", status_code=201)
async def upload_file(
    report_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report_service = ReportService(db)
    report = await report_service.get_by_id(report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    upload_service = UploadService(db)
    try:
        file_content = await file.read()
        upload_service.validate_file(file.filename or "unknown", len(file_content))
        version = await upload_service.upload(report, current_user.id, file.filename or "unknown", file_content)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    topic = "report.reuploaded" if report.status is not None else "report.submitted"
    producer = KafkaProducer()
    await producer.emit(topic, {
        "event": topic,
        "report_id": str(report.id),
        "actor_id": str(current_user.id),
        "timestamp": version.uploaded_at.isoformat(),
    })

    return {
        "version_id": str(version.id),
        "version_number": version.version_number,
        "status": "PENDING",
    }


@router.get("/{report_id}/versions", response_model=list[dict])
async def list_versions(
    report_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report_service = ReportService(db)
    report = await report_service.get_by_id(report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    result = await db.execute(
        select(ReportVersion)
        .where(ReportVersion.report_id == report_id)
        .order_by(ReportVersion.version_number.desc())
    )
    versions = result.scalars().all()
    return [
        {
            "id": str(v.id),
            "version_number": v.version_number,
            "file_path": v.file_path,
            "uploaded_at": v.uploaded_at.isoformat(),
        }
        for v in versions
    ]


@router.get("/{report_id}/download")
async def download_file(
    report_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report_service = ReportService(db)
    report = await report_service.get_by_id(report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    if current_user.role == UserRole.DEPOSITOR and report.depositor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to download this file")

    upload_service = UploadService(db)
    file_path = await upload_service.get_current_version_path(report)
    if file_path is None:
        raise HTTPException(status_code=404, detail="No file uploaded yet")

    path = Path(file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found on storage")

    return FileResponse(path, filename=path.name)


@router.get("/{report_id}/versions/{version_id}/download")
async def download_version_file(
    report_id: uuid.UUID,
    version_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report_service = ReportService(db)
    report = await report_service.get_by_id(report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    if current_user.role == UserRole.DEPOSITOR and report.depositor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to download this file")

    result = await db.execute(
        select(ReportVersion).where(ReportVersion.id == version_id, ReportVersion.report_id == report_id)
    )
    version = result.scalar_one_or_none()
    if version is None:
        raise HTTPException(status_code=404, detail="Version not found")

    path = Path(version.file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found on storage")

    return FileResponse(path, filename=path.name)
