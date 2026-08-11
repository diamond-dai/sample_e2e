from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="APP_", env_file=".env")

    # 本番では APP_JWT_SECRET 環境変数で必ず上書きする
    jwt_secret: str = "dev-only-secret-change-me-0123456789abcdef"  # 32バイト以上
    jwt_algorithm: str = "HS256"
    jwt_issuer: str = "sample-e2e-backend"
    jwt_audience: str = "sample-e2e-frontend"
    access_token_expire_minutes: int = 15


@lru_cache
def get_settings() -> Settings:
    return Settings()
