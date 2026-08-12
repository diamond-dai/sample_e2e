import { expect, test } from "@playwright/test";

test.describe("TODO(認証済み)", () => {
  test("TODOを追加 → 完了 → 削除できる", async ({ page }) => {
    // 並列実行・再実行でも衝突しないようユニークなタイトルにする
    const title = `牛乳を買う ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await page.goto("/dashboard");
    await page.getByLabel("新しいTODO").fill(title);
    await page.getByRole("button", { name: "追加" }).click();

    const item = page.getByRole("listitem").filter({ hasText: title });
    await expect(item).toBeVisible();

    await item
      .getByRole("button", { name: `「${title}」を完了にする` })
      .click();
    await expect(
      item.getByRole("button", { name: `「${title}」を未完了に戻す` }),
    ).toBeVisible();

    await item.getByRole("button", { name: `「${title}」を削除` }).click();
    await expect(item).toHaveCount(0);
  });
});
