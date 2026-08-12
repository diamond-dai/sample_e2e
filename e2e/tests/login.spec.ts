import { expect, test } from "@playwright/test";
import { DEMO_USER } from "./credentials";

test.describe("ログイン", () => {
  test("未ログインでダッシュボードにアクセスするとログインページへリダイレクトされる", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
  });

  test("正しい資格情報でログインするとダッシュボードが表示される", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("メールアドレス").fill(DEMO_USER.email);
    await page.getByLabel("パスワード").fill(DEMO_USER.password);
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByTestId("user-name")).toHaveText(DEMO_USER.name);
  });

  test("間違ったパスワードではエラーメッセージが表示される", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("メールアドレス").fill(DEMO_USER.email);
    await page.getByLabel("パスワード").fill("wrong-password");
    await page.getByRole("button", { name: "ログイン" }).click();

    // Next.jsのroute announcerもrole="alert"を持つため、テキストで絞り込む
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "メールアドレスまたはパスワードが違います" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
