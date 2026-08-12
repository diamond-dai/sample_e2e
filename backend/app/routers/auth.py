from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import SessionDep, SettingsDep
from app.models import User
from app.schemas import LoginRequest, TokenResponse
from app.security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(
    body: LoginRequest, session: SessionDep, settings: SettingsDep
) -> TokenResponse:
    user = await session.scalar(select(User).where(User.email == body.email))
    # アカウント列挙対策: ユーザー不在とパスワード不一致で同じレスポンスを返す
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail="メールアドレスまたはパスワードが違います",
        )
    token, expires_in = create_access_token(user.email, settings)
    return TokenResponse(access_token=token, expires_in=expires_in)
