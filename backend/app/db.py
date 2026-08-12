from collections.abc import AsyncIterator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.settings import get_settings


class Base(DeclarativeBase):
    pass


# NullPool: 接続を使い回さない。テスト(イベントループがテストごとに変わる)でも
# 安全に動く。このサンプルの規模では接続コストは無視できる
engine = create_async_engine(get_settings().database_url, poolclass=NullPool)
session_factory = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with session_factory() as session:
        yield session


async def init_db() -> None:
    """テーブル作成とデモユーザーのシード。lifespanとテストの両方から呼ぶ(冪等)。"""
    from app.models import User
    from app.security import hash_password

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        demo = await session.scalar(
            select(User).where(User.email == "demo@example.com")
        )
        if demo is None:
            session.add(
                User(
                    email="demo@example.com",
                    name="Demo User",
                    password_hash=hash_password("password123"),
                )
            )
            await session.commit()
