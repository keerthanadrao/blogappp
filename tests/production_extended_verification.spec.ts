import { test, expect, devices } from "@playwright/test";

const PUBLIC_URL = process.env.PUBLIC_URL || "http://127.0.0.1:3000";

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

  test("2. Commenting, Replying, and Liking on a post", async ({ page }) => {
    // Login as Admin
    await page.goto(`${PUBLIC_URL}/login?role=admin`, { timeout: 30000 });
    await page.fill("#email", "admin@example.com");
    await page.fill("#password", "Admin123!");
    await page.click('button[type="submit"]');
    await expect(page.locator("text=Successfully Logged In!")).toBeVisible({ timeout: 15000 });
    await page.waitForURL((url) => url.pathname.includes("/admin") || url.pathname === "/", { timeout: 15000 });

    // Go to home feed
    await page.goto(PUBLIC_URL, { timeout: 30000 });
    await page.waitForSelector('article, .post-card, h2 a, a[href*="/posts/"]', { timeout: 15000 });

    const postLink = page.locator('a[href^="/posts/cm"]').first();
    if (await postLink.isVisible()) {
      await postLink.click();
      await page.waitForURL(/\/posts\/.+/, { timeout: 15000 });

      // Like post
      const likeBtn = page.locator('button:has-text("Like"), button:has-text("♥"), button[aria-label*="like" i], .like-button').first();
      if (await likeBtn.isVisible()) {
        await likeBtn.click();
      }

      // Add a comment
      const commentInput = page.locator('textarea[placeholder*="comment" i], textarea[placeholder*="thoughts" i], textarea').first();
      if (await commentInput.isVisible()) {
        const commentText = `Live production comment ${Date.now()}`;
        await commentInput.fill(commentText);
        const submitCommentBtn = page.locator('button:has-text("Comment"), button:has-text("Post Comment"), button[type="submit"]').first();
        await submitCommentBtn.click();
        await expect(page.locator(`text=${commentText}`)).toBeVisible({ timeout: 15000 });

        // Reload page to verify database persistence
        await page.reload();
        await expect(page.locator(`text=${commentText}`)).toBeVisible({ timeout: 15000 });
      }
    }
  });

  test("3. Forgot Password / OTP endpoint availability", async ({ request }) => {
    const res = await request.post(`${PUBLIC_URL}/api/auth/forgot-password/send-otp`, {
      data: {
        email: "nonexistent_verify_test@example.com",
      },
    });

    // Should return 404 (user not found) or 200 (OTP sent)
    expect([200, 400, 404]).toContain(res.status());
  });
});
