from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db import init_db
from app.deps import CurrentUser
from app.routers import auth, todos
from app.schemas import UserOut


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Sample E2E API", lifespan=lifespan)

app.include_router(auth.router)
app.include_router(todos.router)


@app.get("/healthz", tags=["meta"])
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/me", tags=["users"])
async def me(user: CurrentUser) -> UserOut:
    return UserOut(email=user.email, name=user.name)
