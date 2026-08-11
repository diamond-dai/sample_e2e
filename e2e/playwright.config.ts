import { defineConfig, devices } from "@playwright/test";

// 3000/8000等の定番ポートは他プロジェクトと衝突しやすいので、5万番台のランダムな番号をデフォルトにしている
const FRONTEND_PORT = Number(process.env.FRONTEND_PORT ?? 55863);
const BACKEND_PORT = Number(process.env.BACKEND_PORT ?? 57069);
const BASE_URL = `http://localhost:${FRONTEND_PORT}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    // 一度だけUIログインして認証状態(Cookie)を保存する
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    // ログインフロー自体のテスト(未認証で実行)
    {
      name: "guest",
      testMatch: /login\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // 保存した認証状態を使い回すテスト
    {
      name: "authenticated",
      testMatch: /dashboard\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/user.json",
      },
    },
  ],
  webServer: [
    {
      command: `uv run fastapi dev app/main.py --port ${BACKEND_PORT}`,
      cwd: "../backend",
      // uvicornは127.0.0.1にbindする。localhostだと::1に解決されて届かないことがある
      url: `http://127.0.0.1:${BACKEND_PORT}/healthz`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: `pnpm exec next dev --port ${FRONTEND_PORT}`,
      cwd: "../frontend",
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { API_URL: `http://127.0.0.1:${BACKEND_PORT}` },
    },
  ],
});
