# sample_e2e — FastAPI + Next.js JWT認証 + TODO サンプル + E2E

JWTログインと簡単なTODOアプリを題材にしたサンプル。ログイン → TODOページ(追加・完了・削除) → ログアウトの導線を Playwright で E2E テストする。ローカル実行と、Docker Compose による完全隔離実行(DB込み・冪等)の両方に対応。

## 構成

```
backend/      FastAPI (uv管理)。JWT発行(/auth/login)、ユーザーAPI(/me)、TODO CRUD(/todos)
frontend/     Next.js 16 App Router (pnpm)。BFF構成でJWTをHttpOnly Cookieに保存
e2e/          Playwright。ローカルではサーバー自動起動、composeでは外部サーバー接続
compose.yaml  db(Postgres) + backend + frontend + e2e の4サービス。ポート公開なし
```

### 認証の流れ

1. ログインフォーム → Server Action (`frontend/lib/actions.ts`) がバックエンド `POST /auth/login` を呼ぶ
2. 受け取ったJWTを **HttpOnly Cookie** に保存(ブラウザのJSからは触れない。localStorageは使わない)
3. `/dashboard` は Server Component が Cookie のトークンで API を呼び、401ならログインへリダイレクト
4. `frontend/proxy.ts`(Next 16のミドルウェア後継)が Cookie 未所持のアクセスを事前に弾く
5. トークンは argon2id ハッシュ照合 + HS256 署名、有効期限15分、`iss`/`aud` 検証あり

### DB

- ローカル: SQLite(`backend/app.db`、ゼロ設定)
- Docker: Postgres 17(`APP_DATABASE_URL` で切り替え)
- テーブル作成とデモユーザーのシードは起動時(lifespan)に実行

デモユーザー: `demo@example.com` / `password123`

## ポート

3000/8000 等の定番ポートは他プロジェクトと衝突しやすいため、5万番台のランダムな番号
**フロント 55863 / バックエンド 57069** をデフォルトにしている。
E2E実行時は環境変数 `FRONTEND_PORT` / `BACKEND_PORT` で変更可能。
Docker Compose 実行時はホストへのポート公開が一切ないため、衝突の心配がない。

## セットアップ(ローカル実行する場合)

```bash
# backend
cd backend && uv sync

# frontend
cd frontend && pnpm install

# e2e
cd e2e && pnpm install && pnpm exec playwright install chromium
```

## 実行

### ローカル

```bash
# 開発サーバー(手動で触る場合)
cd backend && uv run fastapi dev app/main.py --port 57069
cd frontend && pnpm dev          # → http://localhost:55863

# バックエンドの単体テスト
cd backend && uv run pytest

# E2E(サーバーは自動起動される。起動済みならそれを再利用)
cd e2e && pnpm test
cd e2e && pnpm test:ui           # UIモード
cd e2e && pnpm report            # HTMLレポート
```

### Docker Compose(完全隔離・冪等)

```bash
docker compose down                        # 前回のコンテナが残っていれば消す(DBを確実にまっさらに)
docker compose run --build --rm e2e        # ビルド → db/backend/frontend起動 → E2E実行
docker compose down                        # 後片付け
```

- 4サービスすべて内部ネットワークで通信し、**ホストへのポート公開はゼロ**
- DBはvolumeを持たないため、`down` すればデータは消える(毎回まっさらな状態から)
- 失敗時の成果物は `e2e/test-results/`、レポートは `e2e/playwright-report/` にマウントされる
- コンテナ間はhttpのため `COOKIE_SECURE=false` でSecure Cookieを無効化している(本番では外さないこと)

## E2Eテストの構成

- `tests/auth.setup.ts` — 一度だけUIログインし、認証状態(Cookie)を `playwright/.auth/user.json` に保存
- `tests/login.spec.ts` — ログインフロー自体のテスト(未認証の `guest` プロジェクトで実行)
- `tests/dashboard.spec.ts` / `tests/todo.spec.ts` — 保存した認証状態を使い回すテスト(`authenticated` プロジェクト)

## 注意(サンプルとしての割り切り)

- JWTシークレットは開発用デフォルト。本番は `APP_JWT_SECRET` で必ず上書きする
- レート制限・リフレッシュトークン・マイグレーション(Alembic)は未実装
- ローカルE2EはSQLiteにデータが蓄積される(テストはユニークなタイトルを使うので影響しない)
