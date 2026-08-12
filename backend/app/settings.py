from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="APP_", env_file=".env")

    # 本番では APP_JWT_SECRET 環境変数で必ず上書きする
    # 32バイト以上にすること
    jwt_secret: str = "dev-only-secret-change-me-0123456789abcdef"

    # ローカルはSQLite(ゼロ設定)。
    # Docker/本番は APP_DATABASE_URL でPostgres等に切り替える
    database_url: str = "sqlite+aiosqlite:///./app.db"
    jwt_algorithm: str = "HS256"
    jwt_issuer: str = "sample-e2e-backend"
    jwt_audience: str = "sample-e2e-frontend"
    access_token_expire_minutes: int = 15


@lru_cache
def get_settings() -> Settings:
    return Settings()
