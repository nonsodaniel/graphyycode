import { test, expect } from "@playwright/test";

/**
 * Guest limit flow e2e tests.
 * These tests verify the client-side guest limit modal appears after the limit is hit.
 * Since we can't actually call the real API in e2e without a DB, we test the UI flow
 * by mocking the /api/analyse response.
 */
test.describe("Guest limit flow", () => {
  test("shows analyse button on landing page", async ({ page }) => {
    await page.goto("/");
    const input = page.getByPlaceholder("https://github.com/owner/repository");
    await expect(input).toBeVisible();
    const btn = page.getByRole("button", { name: /visualise/i });
    await expect(btn).toBeVisible();
  });

  test("shows error state when analyse API returns 429", async ({ page }) => {
    // Mock the API to return guest limit exceeded
    await page.route("/api/analyse", async (route) => {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({ error: "Guest limit reached", code: "GUEST_LIMIT_REACHED" }),
      });
    });

    await page.goto("/visualiser?repo=https://github.com/vercel/next.js");
    // The page should show the guest limit modal or redirect
    // We wait for either the modal heading or sign-in button
    await expect(
      page.getByText(/sign in|limit|upgrade/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("navigates to visualiser on repo URL submit", async ({ page }) => {
    await page.goto("/");
    const input = page.getByPlaceholder("https://github.com/owner/repository");
    await input.fill("https://github.com/vercel/next.js");
    const btn = page.getByRole("button", { name: /visualise/i });
    await btn.click();
    // Should navigate to visualiser page
    await expect(page).toHaveURL(/\/visualiser/, { timeout: 5000 });
  });
});
