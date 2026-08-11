from fastapi import FastAPI

from app.deps import CurrentUser
from app.routers import auth
from app.schemas import UserOut

app = FastAPI(title="Sample E2E API")

app.include_router(auth.router)


@app.get("/healthz", tags=["meta"])
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/me", tags=["users"])
async def me(user: CurrentUser) -> UserOut:
    return UserOut(email=user.email, name=user.name)
