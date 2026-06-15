import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

import enum


class ReportPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ReportStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    TO_REDO = "TO_REDO"
    CANCELED = "CANCELED"


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(100), nullable=False)
    priority: Mapped[ReportPriority] = mapped_column(Enum(ReportPriority), nullable=False)
    activation_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reminder_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    reminder_notified: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[ReportStatus] = mapped_column(Enum(ReportStatus), default=None, nullable=True)
    depositor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    approver_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    current_version_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("report_versions.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    depositor: Mapped["User"] = relationship("User", back_populates="reports", foreign_keys=[depositor_id])
    approver: Mapped["User | None"] = relationship("User", back_populates="approver_reports", foreign_keys=[approver_id])
    versions: Mapped[list["ReportVersion"]] = relationship("ReportVersion", back_populates="report", foreign_keys="ReportVersion.report_id", cascade="all, delete-orphan")
    current_version: Mapped["ReportVersion | None"] = relationship("ReportVersion", foreign_keys=[current_version_id], post_update=True)
    audit_logs: Mapped[list["ReportAuditLog"]] = relationship("ReportAuditLog", back_populates="report", cascade="all, delete-orphan")
    comments: Mapped[list["ReportComment"]] = relationship("ReportComment", back_populates="report", cascade="all, delete-orphan")
