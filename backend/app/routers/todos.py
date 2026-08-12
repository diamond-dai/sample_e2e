from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import CurrentUser, SessionDep
from app.models import Todo
from app.schemas import TodoCreate, TodoOut, TodoUpdate

router = APIRouter(prefix="/todos", tags=["todos"])


async def _get_owned_todo(session: SessionDep, user: CurrentUser, todo_id: int) -> Todo:
    todo = await session.scalar(
        select(Todo).where(Todo.id == todo_id, Todo.user_id == user.id)
    )
    if todo is None:
        # 他人のTodoも「存在しない」と同じ扱いにする(IDOR対策)
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="todo not found")
    return todo


@router.get("")
async def list_todos(session: SessionDep, user: CurrentUser) -> list[TodoOut]:
    todos = await session.scalars(
        select(Todo).where(Todo.user_id == user.id).order_by(Todo.id)
    )
    return [TodoOut.model_validate(t) for t in todos]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_todo(
    body: TodoCreate, session: SessionDep, user: CurrentUser
) -> TodoOut:
    todo = Todo(user_id=user.id, title=body.title)
    session.add(todo)
    await session.commit()
    await session.refresh(todo)
    return TodoOut.model_validate(todo)


@router.patch("/{todo_id}")
async def update_todo(
    todo_id: int, body: TodoUpdate, session: SessionDep, user: CurrentUser
) -> TodoOut:
    todo = await _get_owned_todo(session, user, todo_id)
    todo.done = body.done
    await session.commit()
    await session.refresh(todo)
    return TodoOut.model_validate(todo)


@router.delete("/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_todo(todo_id: int, session: SessionDep, user: CurrentUser) -> None:
    todo = await _get_owned_todo(session, user, todo_id)
    await session.delete(todo)
    await session.commit()
