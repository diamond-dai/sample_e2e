from httpx import AsyncClient


async def login(client: AsyncClient, email: str, password: str):
    return await client.post("/auth/login", json={"email": email, "password": password})


async def test_login_success(client: AsyncClient):
    res = await login(client, "demo@example.com", "password123")
    assert res.status_code == 200
    body = res.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["expires_in"] == 15 * 60


async def test_login_wrong_password(client: AsyncClient):
    res = await login(client, "demo@example.com", "wrong-password")
    assert res.status_code == 401


async def test_login_unknown_user_returns_same_error(client: AsyncClient):
    wrong_pw = await login(client, "demo@example.com", "wrong-password")
    unknown = await login(client, "nobody@example.com", "password123")
    # アカウント列挙対策: どちらも同じステータス・同じメッセージ
    assert unknown.status_code == wrong_pw.status_code == 401
    assert unknown.json() == wrong_pw.json()


async def test_me_with_valid_token(client: AsyncClient, auth_headers: dict[str, str]):
    res = await client.get("/me", headers=auth_headers)
    assert res.status_code == 200
    assert res.json() == {"email": "demo@example.com", "name": "Demo User"}


async def test_me_without_token(client: AsyncClient):
    res = await client.get("/me")
    assert res.status_code == 401


async def test_me_with_invalid_token(client: AsyncClient):
    res = await client.get("/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert res.status_code == 401
