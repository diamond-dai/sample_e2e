import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createTodo, deleteTodo, logout, toggleTodo } from "@/lib/actions";
import { TOKEN_COOKIE } from "@/lib/constants";

export const metadata: Metadata = { title: "TODO" };

const API_URL = process.env.API_URL ?? "http://127.0.0.1:57069";

type User = { email: string; name: string };
type Todo = { id: number; title: string; done: boolean };

async function fetchApi(path: string, token: string): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}

export default async function DashboardPage() {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) {
    redirect("/login");
  }

  // トークンの正当性はバックエンドが検証する(期限切れ・改ざんは401)
  const [meRes, todosRes] = await Promise.all([
    fetchApi("/me", token),
    fetchApi("/todos", token),
  ]);
  if (!meRes.ok || !todosRes.ok) {
    redirect("/login");
  }
  const user = (await meRes.json()) as User;
  const todos = (await todosRes.json()) as Todo[];

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">TODO</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span data-testid="user-name">{user.name}</span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border border-gray-300 px-2 py-1"
            >
              ログアウト
            </button>
          </form>
        </div>
      </header>

      <form action={createTodo} className="flex gap-2">
        <label htmlFor="new-todo" className="sr-only">
          新しいTODO
        </label>
        <input
          id="new-todo"
          name="title"
          required
          maxLength={200}
          placeholder="新しいTODOを入力"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2"
        />
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 font-medium text-white"
        >
          追加
        </button>
      </form>

      {todos.length === 0 ? (
        <p className="text-gray-500">TODOはまだありません</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className="flex items-center gap-3 rounded-md border border-gray-200 px-3 py-2"
            >
              <form action={toggleTodo}>
                <input type="hidden" name="id" value={todo.id} />
                <input type="hidden" name="done" value={String(!todo.done)} />
                <button
                  type="submit"
                  aria-label={
                    todo.done
                      ? `「${todo.title}」を未完了に戻す`
                      : `「${todo.title}」を完了にする`
                  }
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-400"
                >
                  {todo.done ? "✓" : ""}
                </button>
              </form>
              <span
                className={
                  todo.done ? "flex-1 text-gray-400 line-through" : "flex-1"
                }
              >
                {todo.title}
              </span>
              <form action={deleteTodo}>
                <input type="hidden" name="id" value={todo.id} />
                <button
                  type="submit"
                  aria-label={`「${todo.title}」を削除`}
                  className="text-sm text-gray-500 hover:text-red-600"
                >
                  削除
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
