from datetime import datetime

from pydantic import BaseModel


class CommentCreate(BaseModel):
    content: str
    version_id: str | None = None
    parent_comment_id: str | None = None


class CommentResponse(BaseModel):
    id: str
    report_id: str
    version_id: str | None
    author_id: str
    parent_comment_id: str | None
    content: str
    is_deleted: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
