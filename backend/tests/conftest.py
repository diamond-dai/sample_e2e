import os
from pathlib import Path

# app.db のimport前に設定する必要がある(エンジンはimport時に生成される)
os.environ["APP_DATABASE_URL"] = "sqlite+aiosqlite:///./test.db"

import pytest
from httpx import ASGITransport, AsyncClient

_cleaned = False


@pytest.fixture(autouse=True)
async def _db():
    """各テスト前にDBを初期化する。初回のみ前回実行のファイルを消す。"""
    global _cleaned
    if not _cleaned:
        Path("test.db").unlink(missing_ok=True)
        _cleaned = True
    from app.db import init_db

    await init_db()


@pytest.fixture
async def client():
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture
async def auth_headers(client: AsyncClient) -> dict[str, str]:
    res = await client.post(
        "/auth/login", json={"email": "demo@example.com", "password": "password123"}
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
