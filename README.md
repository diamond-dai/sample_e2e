# sample_e2e — FastAPI + Next.js JWT認証サンプル + E2E

JWTログインを題材にした最小構成のサンプル。ログイン → 保護ページ(ダッシュボード) → ログアウトの導線を Playwright で E2E テストする。

## 構成

```
backend/    FastAPI (uv管理)。JWT発行(POST /auth/login)と保護API(GET /me)
frontend/   Next.js 16 App Router (pnpm)。BFF構成でJWTをHttpOnly Cookieに保存
e2e/        Playwright。バックエンド・フロントエンドを自動起動してテスト
```

### 認証の流れ

1. ログインフォーム → Server Action (`frontend/lib/actions.ts`) がバックエンド `POST /auth/login` を呼ぶ
2. 受け取ったJWTを **HttpOnly Cookie** に保存(ブラウザのJSからは触れない。localStorageは使わない)
3. `/dashboard` は Server Component が Cookie のトークンで `GET /me` を呼び、401ならログインへリダイレクト
4. `frontend/proxy.ts`(Next 16のミドルウェア後継)が Cookie 未所持のアクセスを事前に弾く
5. トークンは argon2id ハッシュ照合 + HS256 署名、有効期限15分、`iss`/`aud` 検証あり

デモユーザー: `demo@example.com` / `password123`(`backend/app/users.py` でシード)

## ポート

3000/8000 は他プロジェクトと衝突しやすいため、**フロント 3010 / バックエンド 8010** をデフォルトにしている。
E2E実行時は環境変数 `FRONTEND_PORT` / `BACKEND_PORT` で変更可能。

## セットアップ

```bash
# backend
cd backend && uv sync

# frontend
cd frontend && pnpm install

# e2e
cd e2e && pnpm install && pnpm exec playwright install chromium
```

## 実行

```bash
# 開発サーバー(手動で触る場合)
cd backend && uv run fastapi dev app/main.py --port 8010
cd frontend && pnpm dev          # → http://localhost:3010

# バックエンドの単体テスト
cd backend && uv run pytest

# E2E(サーバーは自動起動される。起動済みならそれを再利用)
cd e2e && pnpm test
cd e2e && pnpm test:ui           # UIモード
cd e2e && pnpm report            # HTMLレポート
```

## E2Eテストの構成

- `tests/auth.setup.ts` — 一度だけUIログインし、認証状態(Cookie)を `playwright/.auth/user.json` に保存
- `tests/login.spec.ts` — ログインフロー自体のテスト(未認証の `guest` プロジェクトで実行)
- `tests/dashboard.spec.ts` — 保存した認証状態を使い回すテスト(`authenticated` プロジェクト)

## 注意(サンプルとしての割り切り)

- ユーザーはインメモリ。実アプリではDBに置き換える
- JWTシークレットは開発用デフォルト。本番は `APP_JWT_SECRET` で必ず上書きする
- レート制限・リフレッシュトークンは未実装
