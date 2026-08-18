# sample_e2e — FastAPI + Next.js JWT認証 + TODO サンプル + E2E

JWTログインと簡単なTODOアプリを題材にしたサンプル。ログイン → TODOページ(追加・完了・削除) → ログアウトの導線を Playwright で E2E テストする。ローカル実行と、Docker Compose による完全隔離実行(DB込み・冪等)の両方に対応。

## このリポジトリの目的

**E2Eテストが実際どういうものかを、動かしながら説明するための教材**。
読んだ人が手元でテストを緑にできるところまで最短で辿り着けることを最優先にしている。

そのために、こういう方針で作ってある:

- **題材のアプリは意図的に小さくする** — ログインとTODOだけ。説明したいのはE2Eであってアプリではないため
- **ただしE2Eで難しくなりがちな論点は一通り入れる** — 認証状態の引き回し、画面の非同期更新待ち、テスト同士のデータ衝突、CIでの再現性。これらが無いサンプルはE2Eの本題に触れないまま終わる
- **同じテストを2通りの環境で走らせる** — 手元の速いループ(ローカル)と、まっさらな状態を毎回再現する隔離実行(Docker Compose)。E2Eの「速さ」と「再現性」がトレードオフであることを実物で示すため
- **説明の途中で環境要因につまずかせない** — ポート衝突・DB準備・ブラウザ導入といった、本題と無関係な失敗を先回りで潰してある

## 構成

```
backend/      FastAPI (uv管理)。JWT発行(/auth/login)、ユーザーAPI(/me)、
              TODO CRUD(/todos)、ヘルスチェック(/healthz)
frontend/     Next.js 16 App Router (pnpm)。BFF構成でJWTをHttpOnly Cookieに保存
e2e/          Playwright。ローカルではサーバー自動起動、composeでは外部サーバー接続
compose.e2e.yaml  db(Postgres) + backend + frontend + e2e の4サービス。ポート公開なし
(ルート)      biome + lefthook の置き場。frontend / e2e は
              それぞれ独立したpnpmプロジェクト(後述)
```

`pnpm-workspace.yaml` がルート・frontend・e2e の3箇所にあり、いずれも `packages` を増やしていない。
frontend と e2e を1つのワークスペースにまとめていないのは、
**E2Eだけ触りたい人が `e2e/` の中だけで完結できるようにする**ため
(Dockerfileも `e2e/` 単体をコピーしてビルドしている)。

各ディレクトリにファイルを置いているのは、pnpm のワークスペース探索の**境界**を作るため。
これが無いと pnpm が上位ディレクトリ(最悪ホーム直下)の `pnpm-workspace.yaml` を拾い、
そのディレクトリ全体をスキャンして起動が数分止まることがある。

### 認証の流れ

リクエストが来てからの順に:

1. `frontend/proxy.ts`(Next 16のミドルウェア後継)が `/dashboard` へのアクセスをCookieの**有無だけ**で弾く
   — トークンの中身は検証しない。検証はバックエンドの仕事なので、ここは早期リダイレクト専用
2. ログインフォーム → Server Action (`frontend/lib/actions.ts`) がバックエンド `POST /auth/login` を呼ぶ
3. 受け取ったJWTを **HttpOnly Cookie** に保存(ブラウザのJSからは触れない。localStorageは使わない)
4. `/dashboard` は Server Component が Cookie のトークンで `/me` と `/todos` を呼び、401ならログインへリダイレクト
5. パスワードは **argon2id** で照合し、トークンは **HS256** で署名。有効期限15分、`iss`/`aud` 検証あり

トークンをJSから触れる場所に置かない(BFF構成)のは、**E2E側の書き方に効くから**でもある。
テストがCookieを直接組み立てられないぶん、認証状態は「実際にUIでログインして保存する」形になり、
本物のログイン導線が毎回1回は必ず通る。

### DB

- ローカル: SQLite(`backend/app.db`、ゼロ設定)
- Docker: Postgres 17(`APP_DATABASE_URL` で切り替え)
- テーブル作成とデモユーザーのシードは起動時(lifespan)に実行。何度呼んでも同じ結果になる(冪等)

デモユーザー: `demo@example.com` / `password123`

DBを2種類持っているのは意図的。ローカルはインストール不要のSQLiteにして「E2Eを試すのにDBの用意が要る」
という入口の面倒を無くし、隔離実行は本番に近いPostgresにしてある。
同じE2Eが両方で緑になること自体が、テストがDBの実装ではなく画面の振る舞いを見ている証拠になる。

## ポート

3000/8000 等の定番ポートは他プロジェクトと衝突しやすいため、5万番台のランダムな番号
**フロント 55863 / バックエンド 57069** をデフォルトにしている。
E2E実行時は環境変数 `FRONTEND_PORT` / `BACKEND_PORT` で変更可能。
Docker Compose 実行時はホストへのポート公開が一切ないため、衝突の心配がない。

## 前提ツール

| ツール | 用途 | 確認コマンド |
|---|---|---|
| uv | backend の依存管理・実行 | `uv --version` |
| Node.js 20.9+ / pnpm | frontend と e2e (Next 16の要件。CIは24を使用) | `node -v` / `pnpm -v` |
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

E2Eと役割を分けてある。**細かい条件の網羅はこちら**(不正なトークン、他人のTODOへのアクセス、
タイトルのバリデーション等)、**画面をまたぐ導線はE2E**、という分担。
E2Eは1件あたりのコストが桁違いに高いので、ここで代替できるものをE2Eに書くと
「遅くて壊れやすいテスト群」になる。E2Eの件数が7件しかないのは手抜きではなく、この線引きの結果。

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
docker compose -f compose.e2e.yaml down                        # 前回のコンテナが残っていれば消す(DBを確実にまっさらに)
docker compose -f compose.e2e.yaml run --build --rm e2e        # ビルド → db/backend/frontend起動 → E2E実行
docker compose -f compose.e2e.yaml down                        # 後片付け
```

- 4サービスすべて内部ネットワークで通信し、**ホストへのポート公開はゼロ**(ローカルのポート使用状況と無関係に動く)
- DBはPostgresで、volumeを持たないため `down` すればデータは消える(毎回まっさらな状態から)
- 初回はイメージのダウンロードとビルドで数分かかる。2回目以降はキャッシュが効く
- コンテナ間はhttpのため `COOKIE_SECURE=false` でSecure Cookieを無効化している(本番では外さないこと)
- 起動順は `depends_on` + `healthcheck` で制御している(db → backend → frontend → e2e)。
  「起動したはず」ではなく `/healthz` が応答してから次に進むので、遅いマシンでも順番待ちで落ちない

こちらが**壊れにくい代わりに遅い**実行。ローカル実行(3)は速い代わりに、
前回のデータが残る・すでに起動中のサーバーを再利用するといった「手元の状態」に影響される。
E2Eを運用するときはこの2系統を持っておき、日常は速いほう、CIと再現確認は隔離のほうを使う。

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
- **`pnpm test` の序盤が無出力**: サーバー起動待ち。`[WebServer]` プレフィックスのログが流れていれば正常
  (Playwright の `webServer.stdout: "pipe"` は、この「待たされている間の無音」を消すために入れてある)
- **DBを初期化したい**: ローカルは `rm backend/app.db`、Docker は `docker compose -f compose.e2e.yaml down`

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
| e2e | `docker compose -f compose.e2e.yaml run --build --rm e2e` で隔離E2E 7件。失敗時はレポートをartifactsに保存 |

CIのE2Eジョブが**手元と全く同じcomposeコマンド**なのは意図的。
CI専用のセットアップ手順を書かないことで、「CIだけ落ちる/CIだけ通る」を原理的に起きにくくしている。
CI用の環境構築コードは、それ自体がメンテ対象になり、しかもローカルで再現できないという二重の負債になりやすい。

## E2Eテストの構成

計7件。`playwright.config.ts` の projects で3つに分けている。

| ファイル | project | 件数 | 内容 |
|---|---|---|---|
| `tests/auth.setup.ts` | `setup` | 1 | 一度だけUIログインし、認証状態(Cookie)を `playwright/.auth/user.json` に保存 |
| `tests/login.spec.ts` | `guest` | 3 | ログインフロー自体(未ログインのリダイレクト、成功、パスワード誤り) |
| `tests/dashboard.spec.ts` | `authenticated` | 2 | 表示、ログアウト後に保護ページへ戻れないこと |
| `tests/todo.spec.ts` | `authenticated` | 1 | TODOを追加 → 完了 → 削除 |

### なぜこの分け方なのか

- **認証を `setup` に切り出す理由** — 全テストの先頭でログインし直すと、テスト数に比例して遅くなるうえ、
  ログイン画面が壊れたとき無関係なテストまで一斉に落ちて原因が見えなくなる。
  ログインの検証は `guest` の3件に閉じ込め、他は保存済みCookieから始める
- **`guest` を分ける理由** — ログインのテストだけは「認証されていない状態」が前提。
  `storageState` を渡さない project にしないと、そもそもテストが成立しない
- **ロケータは `getByRole` / `getByLabel` で書く** — CSSクラスやDOM構造ではなく、
  ユーザーから見えるラベルで要素を指す。スタイル変更で落ちず、落ちたときは実際に使えなくなっている。
  そのためアプリ側にも `aria-label`(例: `「牛乳を買う」を削除`)を入れてある。**テストのために実装側を整える**のは
  この種のE2Eでは正当なコストで、結果としてアクセシビリティも上がる
- **TODOのタイトルに毎回ユニークな文字列を使う** (`todo.spec.ts`) — `fullyParallel: true` で並列実行し、
  ローカルではDBが消えずに残るため。固定文字列にすると自分の過去の実行結果と衝突して落ちる。
  E2Eのフレークの典型例である「テスト間のデータ干渉」を、あえて踏まずに済む形で見せている
- **待ちは `expect(...).toBeVisible()` などのweb-firstアサーションに任せる** — 固定の `waitForTimeout` を書かない。
  自動リトライで待つので、遅いCIでも短いローカルでも同じコードで動く
- **リトライはCIだけ (`retries: 2`)、トレースは `on-first-retry`** — 手元では落ちたら落ちたままにして
  問題を見逃さず、CIでは1回目の失敗のトレースを残したうえで再試行する。
  「本当に壊れている」のか「一時的に失敗した」のかを、記録を捨てずに切り分けられる

## 注意(サンプルとしての割り切り)

入れていないもの:

- JWTシークレットは開発用デフォルト。本番は `APP_JWT_SECRET` で必ず上書きする
- レート制限・リフレッシュトークン・マイグレーション(Alembic)は未実装
- ローカルE2EはSQLiteにデータが蓄積される(テストはユニークなタイトルを使うので影響しない)

一方、サンプルでも**あえて入れてある**もの。省くと「サンプルではこう書く」が
そのまま真似されてしまい、後から直しにくい類のため:

- ログイン失敗時、ユーザー不在とパスワード誤りで同じ応答を返す(アカウント列挙対策)
- 他人のTODOは403ではなく404にする(存在の有無を漏らさない / IDOR対策)
- JWT検証時に `algorithms` を明示して固定する(`alg: none` 等をトークン側に決めさせない)
- トークンはHttpOnly Cookieに置き、フロントのJSからは読めないようにする
