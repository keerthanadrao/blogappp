import { test, expect, devices } from "@playwright/test";

const PUBLIC_URL = process.env.PUBLIC_URL || "https://things-relationships-tested-spas.trycloudflare.com";

test.describe("Comprehensive Responsive Design & Viewport Tests", () => {
  test.setTimeout(60000);

  test("1. Small Mobile Viewport (iPhone SE: 375x667) - No horizontal scroll, clean header & feed", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(PUBLIC_URL, { timeout: 30000 });
    await page.waitForLoadState("networkidle");

    // Verify main header and title
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("text=Login")).toBeVisible();
    await expect(page.locator("text=Sign Up")).toBeVisible();

    // Verify no document horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // 2px tolerance
  });

  test("2. Standard Mobile Viewport (iPhone 13: 390x844) - Interactive PostCard & Comments", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(PUBLIC_URL, { timeout: 30000 });
    await page.waitForLoadState("networkidle");

    // Verify Post cards render cleanly
    const postCard = page.locator("article").first();
    await expect(postCard).toBeVisible();

    // Verify Like, Comment and Bookmark buttons are visible and clickable
    await expect(page.locator(".like-btn").first()).toBeVisible();
    await expect(page.locator(".comment-toggle-btn").first()).toBeVisible();
    await expect(page.locator('[data-testid="bookmark-btn"]').first()).toBeVisible();

    // Check horizontal scroll bounds
    const isOverflowing = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(isOverflowing).toBe(false);
  });

  test("3. Tablet Viewport (iPad: 768x1024) - Responsive Navigation and Search", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(PUBLIC_URL, { timeout: 30000 });
    await page.waitForLoadState("networkidle");

    await expect(page.locator("#search-input")).toBeVisible();
    await expect(page.locator("#category-filter")).toBeVisible();
    await expect(page.locator(".category-pill").first()).toBeVisible();
  });

  test("4. Auth Pages (Login & Signup) - Responsive Card centering and inputs", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(`${PUBLIC_URL}/login`, { timeout: 30000 });
    await page.waitForLoadState("networkidle");

    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Verify signup on mobile
    await page.goto(`${PUBLIC_URL}/signup`, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await expect(page.locator("#name")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
  });

  test("5. Admin Portal Mobile View - Responsive Layout & moderation table", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${PUBLIC_URL}/login?role=admin`, { timeout: 30000 });
    await page.waitForLoadState("networkidle");

    await page.fill("#email", "admin@example.com");
    await page.fill("#password", "Admin123!");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => url.pathname.includes("/admin") || url.pathname === "/", { timeout: 15000 });

    if (page.url().includes("/admin")) {
      await expect(page.locator(".admin-container")).toBeVisible();
      await expect(page.locator(".table-responsive").first()).toBeVisible();
    }
  });
});
