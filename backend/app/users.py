"""サンプル用のインメモリユーザーストア。実際のアプリではDBに置き換える。"""

from dataclasses import dataclass

from app.security import hash_password


@dataclass(frozen=True)
class User:
    email: str
    name: str
    password_hash: str


_USERS: dict[str, User] = {
    "demo@example.com": User(
        email="demo@example.com",
        name="Demo User",
        password_hash=hash_password("password123"),
    ),
}


def find_by_email(email: str) -> User | None:
    return _USERS.get(email)
