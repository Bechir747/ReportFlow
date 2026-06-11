import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

import enum


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    DEPOSITOR = "DEPOSITOR"
    APPROVER = "APPROVER"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    reports: Mapped[list["Report"]] = relationship("Report", back_populates="depositor", foreign_keys="Report.depositor_id")
    audit_logs: Mapped[list["ReportAuditLog"]] = relationship("ReportAuditLog", back_populates="actor")
    comments: Mapped[list["ReportComment"]] = relationship("ReportComment", back_populates="author")
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="user")
