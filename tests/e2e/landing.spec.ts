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

  test("has working navigation links", async ({ page, viewport }) => {
    // On mobile viewports, nav links are hidden behind the hamburger menu
    if (viewport && viewport.width < 768) {
      await page.getByLabel("Toggle menu").click();
      await expect(page.getByRole("link", { name: "Features" }).last()).toBeVisible();
      await expect(page.getByRole("link", { name: "How it works" }).last()).toBeVisible();
    } else {
      const nav = page.getByRole("navigation");
      await expect(nav.getByRole("link", { name: "Features" })).toBeVisible();
      await expect(nav.getByRole("link", { name: "How it works" })).toBeVisible();
    }
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
    await page.reload();
    const menuButton = page.getByLabel("Toggle menu");
    await menuButton.click();
    // Sign in appears in the mobile dropdown (outside <nav>), use last() to
    // target the visible menu item rather than the CSS-hidden desktop one
    await expect(page.getByRole("link", { name: "Sign in" }).last()).toBeVisible();
  });
});
