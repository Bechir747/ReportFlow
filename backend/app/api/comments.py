import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.comment import CommentCreate, CommentResponse
from app.services.comment_service import CommentService

router = APIRouter(prefix="/api/reports", tags=["comments"])


@router.post("/{report_id}/comments", response_model=CommentResponse, status_code=201)
async def create_comment(
    report_id: uuid.UUID,
    body: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CommentService(db)
    comment = await service.create(report_id, current_user.id, body.model_dump())
    return CommentResponse(
        id=str(comment.id),
        report_id=str(comment.report_id),
        version_id=str(comment.version_id) if comment.version_id else None,
        author_id=str(comment.author_id),
        parent_comment_id=str(comment.parent_comment_id) if comment.parent_comment_id else None,
        content=comment.content,
        is_deleted=comment.is_deleted,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
    )


@router.get("/{report_id}/comments", response_model=list[CommentResponse])
async def list_comments(
    report_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CommentService(db)
    comments = await service.get_by_report(report_id)
    return [
        CommentResponse(
            id=str(c.id),
            report_id=str(c.report_id),
            version_id=str(c.version_id) if c.version_id else None,
            author_id=str(c.author_id),
            parent_comment_id=str(c.parent_comment_id) if c.parent_comment_id else None,
            content="[deleted]" if c.is_deleted else c.content,
            is_deleted=c.is_deleted,
            created_at=c.created_at,
            updated_at=c.updated_at,
        )
        for c in comments
    ]


@router.delete("/comments/{comment_id}", status_code=204)
async def delete_comment(
    comment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CommentService(db)
    is_admin = current_user.role == UserRole.ADMIN
    try:
        deleted = await service.soft_delete(comment_id, current_user.id, is_admin)
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    if not deleted:
        raise HTTPException(status_code=404, detail="Comment not found")
