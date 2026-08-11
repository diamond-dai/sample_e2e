import { test as setup } from "@playwright/test";
import { DEMO_USER } from "./credentials";

const AUTH_FILE = "playwright/.auth/user.json";

setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(DEMO_USER.email);
  await page.getByLabel("パスワード").fill(DEMO_USER.password);
  await page.getByRole("button", { name: "ログイン" }).click();
  await page.waitForURL("/dashboard");
  await page.context().storageState({ path: AUTH_FILE });
});
