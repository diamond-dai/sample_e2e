# backend

FastAPI 製のAPI。JWT発行 (`/auth/login`)、ユーザー情報 (`/me`)、TODO CRUD (`/todos`)、
ヘルスチェック (`/healthz`)。

```bash
uv sync
uv run fastapi dev app/main.py --port 57069   # Swagger UI: http://127.0.0.1:57069/docs
uv run pytest                                  # 10件
```

DBはローカルがSQLite (`app.db`)、Dockerでは `APP_DATABASE_URL` でPostgresに切り替わる。
全体構成はリポジトリルートの [README](../README.md) を参照。
