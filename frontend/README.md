# frontend

Next.js 16 (App Router) 製のフロント。BFF構成で、バックエンドのJWTをHttpOnly Cookieに保存する。

```bash
pnpm install
pnpm dev        # http://localhost:55863
```

バックエンド (既定 `http://127.0.0.1:57069`) が起動している必要がある。
接続先は `API_URL` で変更できる (`.env.local.example` を参照)。

セットアップ・E2E・全体構成はリポジトリルートの [README](../README.md) を参照。
