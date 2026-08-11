from datetime import UTC, datetime, timedelta

import jwt
from pwdlib import PasswordHash

from app.settings import Settings

password_hash = PasswordHash.recommended()  # argon2id


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)


def create_access_token(subject: str, settings: Settings) -> tuple[str, int]:
    """アクセストークンと有効秒数を返す。"""
    expires_in = settings.access_token_expire_minutes * 60
    now = datetime.now(UTC)
    payload = {
        "sub": subject,
        "iat": now,
        "exp": now + timedelta(seconds=expires_in),
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, expires_in


def decode_access_token(token: str, settings: Settings) -> str | None:
    """検証に通れば sub(メールアドレス)を、通らなければ None を返す。"""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],  # alg は検証側で固定する
            issuer=settings.jwt_issuer,
            audience=settings.jwt_audience,
            options={"require": ["exp", "sub", "iss", "aud"]},
        )
    except jwt.InvalidTokenError:
        return None
    return payload["sub"]
