from datetime import datetime

from pydantic import BaseModel, field_validator


class ReportCreate(BaseModel):
    title: str
    type: str
    priority: str
    activation_date: datetime
    reminder_date: datetime
    due_date: datetime
    depositor_id: str

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: str) -> str:
        allowed = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
        if v.upper() not in allowed:
            raise ValueError(f"priority must be one of {allowed}")
        return v.upper()

    @field_validator("reminder_date")
    @classmethod
    def reminder_after_activation(cls, v: datetime, info) -> datetime:
        activation = info.data.get("activation_date")
        if activation and v <= activation:
            raise ValueError("reminder_date must be after activation_date")
        return v

    @field_validator("due_date")
    @classmethod
    def due_after_reminder(cls, v: datetime, info) -> datetime:
        reminder = info.data.get("reminder_date")
        if reminder and v <= reminder:
            raise ValueError("due_date must be after reminder_date")
        return v


class ReportUpdate(BaseModel):
    title: str | None = None
    type: str | None = None
    priority: str | None = None
    activation_date: datetime | None = None
    reminder_date: datetime | None = None
    due_date: datetime | None = None
    depositor_id: str | None = None


class ReportResponse(BaseModel):
    id: str
    title: str
    type: str
    priority: str
    status: str | None
    activation_date: datetime
    reminder_date: datetime
    due_date: datetime
    is_active: bool
    depositor_id: str
    current_version_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ReviewRequest(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        allowed = {"APPROVED", "REJECTED", "TO_REDO", "CANCELED"}
        if v.upper() not in allowed:
            raise ValueError(f"status must be one of {allowed}")
        return v.upper()
