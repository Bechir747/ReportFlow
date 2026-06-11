import asyncio
import uuid

from sqlalchemy import select

from app.database import async_session_factory
from app.auth.jwt import hash_password
from app.models.user import User, UserRole


SEED_USERS = [
    {
        "id": uuid.UUID("00000000-0000-0000-0000-000000000001"),
        "email": "admin@reportflow.com",
        "password": "admin123",
        "role": UserRole.ADMIN,
    },
    {
        "id": uuid.UUID("00000000-0000-0000-0000-000000000002"),
        "email": "depositor@reportflow.com",
        "password": "depositor123",
        "role": UserRole.DEPOSITOR,
    },
    {
        "id": uuid.UUID("00000000-0000-0000-0000-000000000003"),
        "email": "approver@reportflow.com",
        "password": "approver123",
        "role": UserRole.APPROVER,
    },
]


async def seed_users() -> None:
    async with async_session_factory() as db:
        for user_data in SEED_USERS:
            result = await db.execute(select(User).where(User.email == user_data["email"]))
            existing = result.scalar_one_or_none()
            if existing:
                print(f"User {user_data['email']} already exists, skipping")
                continue

            user = User(
                id=user_data["id"],
                email=user_data["email"],
                hashed_password=hash_password(user_data["password"]),
                role=user_data["role"],
            )
            db.add(user)
            print(f"Created user: {user_data['email']} ({user_data['role'].value})")

        await db.commit()


if __name__ == "__main__":
    asyncio.run(seed_users())
