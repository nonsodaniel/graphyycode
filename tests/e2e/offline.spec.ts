import { test, expect } from "@playwright/test";

test.describe("Offline page", () => {
  test("renders offline page directly", async ({ page }) => {
    await page.goto("/offline");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("You are offline");
  });

  test("offline page shows available features list", async ({ page }) => {
    await page.goto("/offline");
    await expect(page.getByText("Available offline:")).toBeVisible();
    await expect(page.getByText("Previously loaded visualisations")).toBeVisible();
    await expect(page.getByText("Cached dashboard history")).toBeVisible();
  });

  test("offline page has a link to cached analyses", async ({ page }) => {
    await page.goto("/offline");
    const link = page.getByRole("link", { name: /cached analyses/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/dashboard");
  });

  test("offline page shows GraphyyCode branding", async ({ page }) => {
    await page.goto("/offline");
    await expect(page.getByText("GraphyyCode")).toBeVisible();
  });
});
