from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_admin
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.auth import UserResponse

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
async def list_users(
    role: str | None = Query(None, description="Filter by role (ADMIN, DEPOSITOR, APPROVER)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    stmt = select(User)
    if role:
        stmt = stmt.where(User.role == UserRole(role.upper()))
    result = await db.execute(stmt)
    users = result.scalars().all()
    return [UserResponse(id=str(u.id), email=u.email, role=u.role.value) for u in users]
