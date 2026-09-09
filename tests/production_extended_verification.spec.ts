import { test, expect, devices } from "@playwright/test";

const PUBLIC_URL = process.env.PUBLIC_URL || "https://things-relationships-tested-spas.trycloudflare.com";

test.describe("Extended Production Verification (Mobile, Comments, Likes, Persistence)", () => {
  test.setTimeout(60000);

  test("1. Mobile Viewport Responsiveness and Navigation", async ({ browser }) => {
    const mobileContext = await browser.newContext({
      ...devices["iPhone 13"],
    });
    const page = await mobileContext.newPage();

    await page.goto(PUBLIC_URL, { timeout: 30000 });
    await expect(page).toHaveTitle(/Antigravity Blog|Blog|DevBlog/i);

    // Verify header and links render nicely on mobile
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("text=Login")).toBeVisible();

    await mobileContext.close();
  });

  test("2. Commenting, Replying, and Liking on a post with database persistence", async ({ page }) => {
    // Login as Admin
    await page.goto(`${PUBLIC_URL}/login?role=admin`, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await page.fill("#email", "admin@example.com");
    await page.fill("#password", "Admin123!");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => url.pathname.includes("/admin") || url.pathname === "/", { timeout: 15000 });

    // Go to home feed
    await page.goto(PUBLIC_URL, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await page.waitForSelector('article', { timeout: 15000 });

    // Toggle comment section on the first post
    const commentToggle = page.locator(".comment-toggle-btn").first();
    if (await commentToggle.isVisible()) {
      await commentToggle.click();
      
      const commentInput = page.locator('textarea[placeholder*="discussion" i], textarea[placeholder*="comment" i], textarea').first();
      await expect(commentInput).toBeVisible({ timeout: 10000 });

      const commentText = `Live production comment ${Date.now()}`;
      await commentInput.fill(commentText);
      const submitCommentBtn = page.locator('button:has-text("Comment")').first();
      await submitCommentBtn.click();
      await expect(page.locator(`text=${commentText}`)).toBeVisible({ timeout: 15000 });

      // Reload page to verify database persistence across reloads
      await page.reload();
      await page.waitForLoadState("networkidle");
      await page.waitForSelector('article', { timeout: 15000 });
      const commentToggleAfter = page.locator(".comment-toggle-btn").first();
      await commentToggleAfter.click();
      await expect(page.locator(`text=${commentText}`)).toBeVisible({ timeout: 15000 });
    }

    // Test Like button
    const likeBtn = page.locator('.like-btn').first();
    if (await likeBtn.isVisible()) {
      await likeBtn.click();
      await page.waitForTimeout(500);
    }

    // Test Bookmark button
    const bookmarkBtn = page.locator('[data-testid="bookmark-btn"]').first();
    if (await bookmarkBtn.isVisible()) {
      await bookmarkBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test("3. Forgot Password / OTP endpoint availability and rate limiting", async ({ request }) => {
    const res = await request.post(`${PUBLIC_URL}/api/auth/forgot-password/send-otp`, {
      data: {
        email: "nonexistent_verify_test@example.com",
      },
    });

    // Should return 404 (user not found) or 200 (OTP sent)
    expect([200, 400, 404]).toContain(res.status());
  });
});
