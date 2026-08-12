import { expect, test } from "@playwright/test";
import { DEMO_USER } from "./credentials";

test.describe("TODOページ(認証済み)", () => {
  test("ユーザー名とTODOページが表示される", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "TODO" })).toBeVisible();
    await expect(page.getByTestId("user-name")).toHaveText(DEMO_USER.name);
  });

  test("ログアウトするとログインページに戻り、再アクセスできない", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "ログアウト" }).click();
    await expect(page).toHaveURL(/\/login/);

    // Cookieが消えているので保護ページには戻れない
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
