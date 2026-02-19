import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders headline", async ({ page }) => {
    await expect(
      page.getByText("Understand any codebase")
    ).toBeVisible();
  });

  test("has working navigation links", async ({ page }) => {
    await expect(page.getByText("Features")).toBeVisible();
    await expect(page.getByText("How it works")).toBeVisible();
  });

  test("repo input is present", async ({ page }) => {
    const input = page.getByPlaceholder("https://github.com/owner/repository");
    await expect(input).toBeVisible();
  });

  test("see demo button scrolls to demo section", async ({ page }) => {
    await page.getByText("See demo").click();
    await expect(page.locator("#demo")).toBeInViewport({ timeout: 2000 });
  });

  test("mobile menu works", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const menuButton = page.getByLabel("Toggle menu");
    await menuButton.click();
    await expect(page.getByText("Sign in")).toBeVisible();
  });
});
