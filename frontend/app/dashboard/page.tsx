import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logout } from "@/lib/actions";
import { TOKEN_COOKIE } from "@/lib/constants";

export const metadata: Metadata = { title: "ダッシュボード" };

const API_URL = process.env.API_URL ?? "http://127.0.0.1:57069";

type User = { email: string; name: string };

export default async function DashboardPage() {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) {
    redirect("/login");
  }

  // トークンの正当性はバックエンドが検証する(期限切れ・改ざんは401)
  const res = await fetch(`${API_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    redirect("/login");
  }
  const user = (await res.json()) as User;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>
      <p>
        ようこそ、<span data-testid="user-name">{user.name}</span> さん(
        <span data-testid="user-email">{user.email}</span>)
      </p>
      <form action={logout}>
        <button
          type="submit"
          className="rounded-md border border-gray-300 px-3 py-2 font-medium"
        >
          ログアウト
        </button>
      </form>
    </main>
  );
}
