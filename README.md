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

## 前提ツール

| ツール | 用途 | 確認コマンド |
|---|---|---|
| uv | backend の依存管理・実行 | `uv --version` |
| Node.js 20+ / pnpm | frontend と e2e | `node -v` / `pnpm -v` |
| Docker + Compose | 隔離E2E(こちらだけなら uv/pnpm 不要) | `docker compose version` |

## セットアップ(ローカル実行する場合)

```bash
# backend
cd backend && uv sync

# frontend
cd frontend && pnpm install

# e2e(Playwright本体 + Chromiumブラウザ)
cd e2e && pnpm install && pnpm exec playwright install chromium
```

## 実行方法

### 1. アプリを手で触ってみる

ターミナルを2つ開いて:

```bash
# ターミナル1: バックエンド
cd backend && uv run fastapi dev app/main.py --port 57069

# ターミナル2: フロントエンド
cd frontend && pnpm dev
```

- アプリ: http://localhost:55863 (ログインページに飛ぶ)
- ログイン: `demo@example.com` / `password123`
- API仕様書 (Swagger UI): http://127.0.0.1:57069/docs
- DBは `backend/app.db` (SQLite) に自動作成される。消せばまっさらに戻る

### 2. バックエンドの単体テスト

```bash
cd backend && uv run pytest        # 10件、約2秒
cd backend && uv run pytest -v     # テスト名ごとに表示
```

テスト用DBは `backend/test.db` に分離されており、開発用の `app.db` には影響しない。

### 3. E2Eテスト(ローカル)

```bash
cd e2e && pnpm test
```

サーバーは**自動で起動される**(起動済みならそれを再利用)。約20秒、ウォーム時は5秒程度。

```bash
cd e2e && pnpm test:ui             # UIモード。ステップごとのDOMスナップショットを確認できる。開発中はこれが便利
cd e2e && pnpm test --headed       # ブラウザを表示しながら実行
cd e2e && pnpm test login.spec.ts  # ファイル指定
```

### 4. E2Eテスト(Docker Compose、完全隔離・冪等)

```bash
docker compose down                        # 前回のコンテナが残っていれば消す(DBを確実にまっさらに)
docker compose run --build --rm e2e        # ビルド → db/backend/frontend起動 → E2E実行
docker compose down                        # 後片付け
```

- 4サービスすべて内部ネットワークで通信し、**ホストへのポート公開はゼロ**(ローカルのポート使用状況と無関係に動く)
- DBはPostgresで、volumeを持たないため `down` すればデータは消える(毎回まっさらな状態から)
- 初回はイメージのダウンロードとビルドで数分かかる。2回目以降はキャッシュが効く
- コンテナ間はhttpのため `COOKIE_SECURE=false` でSecure Cookieを無効化している(本番では外さないこと)

### 5. テスト結果の確認

```bash
cd e2e && pnpm report              # HTMLレポートをブラウザで開く(compose実行の結果も同じ場所に出る)
```

- 失敗時はターミナルに期待値・実際の値・該当行が表示される
- 失敗の詳細(ページ状態のスナップショット等)は `e2e/test-results/` に保存される
- さらに深掘りするならトレース:

```bash
cd e2e && pnpm test --trace on
cd e2e && pnpm exec playwright show-trace test-results/<失敗したテスト名>/trace.zip
```

### うまく動かないとき

- **ポートが使用中**: `FRONTEND_PORT` / `BACKEND_PORT` 環境変数で変更できる(例: `BACKEND_PORT=57100 pnpm test`)。Docker Compose ならポートを一切使わないのでそもそも衝突しない
- **`pn test` の序盤が無出力**: サーバー起動待ち。`[WebServer]` プレフィックスのログが流れていれば正常
- **DBを初期化したい**: ローカルは `rm backend/app.db`、Docker は `docker compose down`

## Lint・フォーマット・Git hooks

```bash
# Python (backend)
cd backend && uv run ruff check . && uv run ruff format .

# TypeScript/JSON (frontend, e2e) — ルートから一括
pnpm lint          # チェックのみ
pnpm lint:fix      # 自動修正
```

- 初回 `pnpm install`(ルート)で **lefthook** が pre-commit フックを設置する。
  以後コミット時にステージされたファイルへ ruff / biome が自動で走り、修正は自動で再ステージされる
- フックを一時的に飛ばす場合: `git commit --no-verify`

## CI (GitHub Actions)

`.github/workflows/ci.yml` で push / PR ごとに3ジョブが並列実行される:

| ジョブ | 内容 |
|---|---|
| lint | ruff(backend)+ biome(frontend / e2e) |
| backend-test | pytest 10件 |
| e2e | `docker compose run e2e` で隔離E2E 7件。失敗時はレポートをartifactsに保存 |

## E2Eテストの構成

- `tests/auth.setup.ts` — 一度だけUIログインし、認証状態(Cookie)を `playwright/.auth/user.json` に保存
- `tests/login.spec.ts` — ログインフロー自体のテスト(未認証の `guest` プロジェクトで実行)
- `tests/dashboard.spec.ts` / `tests/todo.spec.ts` — 保存した認証状態を使い回すテスト(`authenticated` プロジェクト)

## 注意(サンプルとしての割り切り)

- JWTシークレットは開発用デフォルト。本番は `APP_JWT_SECRET` で必ず上書きする
- レート制限・リフレッシュトークン・マイグレーション(Alembic)は未実装
- ローカルE2EはSQLiteにデータが蓄積される(テストはユニークなタイトルを使うので影響しない)
