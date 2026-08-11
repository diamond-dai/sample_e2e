"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { TOKEN_COOKIE } from "@/lib/constants";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:57069";

export type LoginState = { error: string } | null;

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return { error: "メールアドレスとパスワードを入力してください" };
  }

  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  if (!res.ok) {
    return { error: "メールアドレスまたはパスワードが違います" };
  }

  const { access_token, expires_in } = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  // JWTはHttpOnly Cookieに保存し、ブラウザのJSからは触れないようにする(BFF構成)
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE, access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: expires_in,
  });
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_COOKIE);
  redirect("/login");
}
