from httpx import AsyncClient

Headers = dict[str, str]


async def test_todos_require_auth(client: AsyncClient):
    assert (await client.get("/todos")).status_code == 401
    assert (await client.post("/todos", json={"title": "x"})).status_code == 401


async def test_todo_crud_flow(client: AsyncClient, auth_headers: Headers):
    created = await client.post(
        "/todos", json={"title": "牛乳を買う"}, headers=auth_headers
    )
    assert created.status_code == 201
    todo = created.json()
    assert todo["title"] == "牛乳を買う"
    assert todo["done"] is False
    todo_id = todo["id"]

    listed = (await client.get("/todos", headers=auth_headers)).json()
    assert any(t["id"] == todo_id for t in listed)

    patched = await client.patch(
        f"/todos/{todo_id}", json={"done": True}, headers=auth_headers
    )
    assert patched.status_code == 200
    assert patched.json()["done"] is True

    deleted = await client.delete(f"/todos/{todo_id}", headers=auth_headers)
    assert deleted.status_code == 204

    listed = (await client.get("/todos", headers=auth_headers)).json()
    assert all(t["id"] != todo_id for t in listed)


async def test_todo_not_found(client: AsyncClient, auth_headers: Headers):
    res = await client.patch("/todos/999999", json={"done": True}, headers=auth_headers)
    assert res.status_code == 404
    deleted = await client.delete("/todos/999999", headers=auth_headers)
    assert deleted.status_code == 404


async def test_todo_title_validation(client: AsyncClient, auth_headers: Headers):
    res = await client.post("/todos", json={"title": ""}, headers=auth_headers)
    assert res.status_code == 422
