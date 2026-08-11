import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "ログイン" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-2xl font-bold">ログイン</h1>
      <LoginForm />
      <p className="text-sm text-gray-500">
        デモ用アカウント: demo@example.com / password123
      </p>
    </main>
  );
}
