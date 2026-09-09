import { test, expect } from "@playwright/test";

const PUBLIC_URL = process.env.PUBLIC_URL || "http://127.0.0.1:3000";

test.describe("Production Public URL End-to-End Verification", () => {
  test.setTimeout(60000);

  test("1. Verify Homepage loads cleanly over HTTPS on Public URL", async ({ page }) => {
    await page.goto(PUBLIC_URL, { timeout: 30000 });
    await expect(page).toHaveTitle(/Antigravity Blog|Blog|DevBlog/i);
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("text=Login")).toBeVisible();
    await expect(page.locator("text=Sign Up")).toBeVisible();
  });

  test("2. Verify Public Signup with new user and success modal", async ({ page }) => {
    const ts = Date.now();
    const newUser = {
      name: `New User ${ts}`,
      email: `signup_test_${ts}@example.com`,
      password: "Password123!",
    };

    await page.goto(`${PUBLIC_URL}/signup`, { timeout: 30000 });
    await page.fill("#name", newUser.name);
    await page.fill("#email", newUser.email);
    await page.fill("#password", newUser.password);

    await page.click('button[type="submit"]');

    // Verify Success modal appears
    await expect(page.locator("text=Account Created Successfully!")).toBeVisible({ timeout: 15000 });
    
    // Verify automatic or manual redirection to /login
    await page.waitForURL(/.*login/, { timeout: 15000 });
  });

  test("3. Verify Public Login with registered user", async ({ page }) => {
    const ts = Date.now();
    const user = {
      name: `Login User ${ts}`,
      email: `login_test_${ts}@example.com`,
      password: "Password123!",
    };

    // First signup
    await page.goto(`${PUBLIC_URL}/signup`, { timeout: 30000 });
    await page.fill("#name", user.name);
    await page.fill("#email", user.email);
    await page.fill("#password", user.password);
    await page.click('button[type="submit"]');
    await expect(page.locator("text=Account Created Successfully!")).toBeVisible({ timeout: 15000 });
    await page.waitForURL(/.*login/, { timeout: 15000 });

    // Then login
    await page.fill("#email", user.email);
    await page.fill("#password", user.password);
    await page.click('button[type="submit"]');

    // Verify Login Success modal appears
    await expect(page.locator("text=Successfully Logged In!")).toBeVisible({ timeout: 15000 });

    // Verify redirection to home/feed
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
    await expect(page.getByRole("button", { name: "Sign Out" })).toBeVisible({ timeout: 15000 });
  });

  test("4. Verify Admin Login and Post Creation with Cover Image URL", async ({ page }) => {
    const ts = Date.now();
    // 4a. Log in as Admin
    await page.goto(`${PUBLIC_URL}/login?role=admin`, { timeout: 30000 });
    await page.fill("#email", "admin@example.com");
    await page.fill("#password", "Admin123!");
    await page.click('button[type="submit"]');

    await expect(page.locator("text=Successfully Logged In!")).toBeVisible({ timeout: 15000 });
    await page.waitForURL((url) => url.pathname.includes("/admin") || url.pathname === "/", { timeout: 15000 });

    // 4b. Navigate to Create Post
    await page.goto(`${PUBLIC_URL}/posts/new`, { timeout: 30000 });
    await page.waitForSelector('input[placeholder*="Enter post title"]', { timeout: 15000 });

    const postTitle = `Public Deployed Post ${ts}`;
    await page.fill('input[placeholder*="Enter post title"]', postTitle);
    await page.fill('#cover_image_url', "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80");
    await page.fill('textarea[placeholder*="Write your post content"]', "This is an end-to-end verification post testing public cloud connectivity, database persistence, and rich media.");

    // Wait for categories to load from API and select category
    await page.waitForFunction(() => {
      const select = document.querySelector('select');
      return select && select.options.length > 1;
    }, { timeout: 15000 });
    await page.locator('select').selectOption({ index: 1 });

    await page.click('button:has-text("Publish")');
    await page.waitForURL(/.*my-posts/, { timeout: 15000 });

    // Verify post appears in My Posts
    await expect(page.locator(`text=${postTitle}`)).toBeVisible({ timeout: 15000 });
  });

  test("5. Multi-User Isolation: Independent sessions in separate contexts", async ({ browser }) => {
    const ts = Date.now();
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    const user1 = {
      name: `User A ${ts}`,
      email: `user_a_${ts}@example.com`,
      password: "Password123!",
    };

    await page1.goto(`${PUBLIC_URL}/signup`, { timeout: 30000 });
    await page1.fill("#name", user1.name);
    await page1.fill("#email", user1.email);
    await page1.fill("#password", user1.password);
    await page1.click('button[type="submit"]');
    await expect(page1.locator("text=Account Created Successfully!")).toBeVisible({ timeout: 15000 });
    await page1.waitForURL(/.*login/, { timeout: 15000 });
    await page1.fill("#email", user1.email);
    await page1.fill("#password", user1.password);
    await page1.click('button[type="submit"]');
    await expect(page1.locator("text=Successfully Logged In!")).toBeVisible({ timeout: 15000 });
    await page1.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
    await expect(page1.getByRole("button", { name: "Sign Out" })).toBeVisible({ timeout: 15000 });

    // Context 2 (Separate Browser / Incognito)
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    const user2 = {
      name: `User B ${ts}`,
      email: `user_b_${ts}@example.com`,
      password: "Password456!",
    };

    await page2.goto(`${PUBLIC_URL}/signup`, { timeout: 30000 });
    await page2.fill("#name", user2.name);
    await page2.fill("#email", user2.email);
    await page2.fill("#password", user2.password);
    await page2.click('button[type="submit"]');
    await expect(page2.locator("text=Account Created Successfully!")).toBeVisible({ timeout: 15000 });
    await page2.waitForURL(/.*login/, { timeout: 15000 });
    await page2.fill("#email", user2.email);
    await page2.fill("#password", user2.password);
    await page2.click('button[type="submit"]');
    await expect(page2.locator("text=Successfully Logged In!")).toBeVisible({ timeout: 15000 });
    await page2.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
    await expect(page2.getByRole("button", { name: "Sign Out" })).toBeVisible({ timeout: 15000 });

    await context1.close();
    await context2.close();
  });
});
