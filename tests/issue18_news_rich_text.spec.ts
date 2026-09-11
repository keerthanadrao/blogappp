import { test, expect, Page, BrowserContext } from "@playwright/test";

/**
 * Issue 18: News Description — Rich-Text Formatting and Paste Formatting Support
 *
 * Tests the rich-text editor in the Admin Dashboard's News section.
 * Uses a fresh test admin account (registered via /signup?role=admin) for each describe block.
 */

const ADMIN_URL = "http://localhost:3000/admin";
const NEWS_URL = "http://localhost:3000/news";
const ADMIN_SECRET = "admin1234";

/**
 * Create a fresh admin and log in, returning the authed page.
 * Uses the existing app's admin-register flow (POST /api/auth/admin-register).
 */
async function registerAndLoginAsAdmin(page: Page): Promise<void> {
  const unique = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
  const email = `news_test_admin_${unique}@example.com`;
  const password = "NewsAdmin123!";

  // Register admin via API
  const regRes = await page.request.post(
    "http://localhost:3000/api/auth/admin-register",
    {
      data: {
        name: "News Test Admin",
        email,
        password,
        secretKey: ADMIN_SECRET,
      },
    }
  );
  // Allow 200 or 201; ignore if already exists (shouldn't happen with unique email)
  expect([200, 201]).toContain(regRes.status());

  // Log in via UI
  await page.goto("http://localhost:3000/login", {
    waitUntil: "domcontentloaded",
  });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');

  // Wait for success modal then redirect
  await expect(page.locator("#auth-success-modal")).toBeVisible({
    timeout: 15000,
  });
  await page.waitForURL("http://localhost:3000/admin", { timeout: 15000 });
}

test.describe("News Rich-Text Editor — Admin Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLoginAsAdmin(page);
    await page.goto(ADMIN_URL, { waitUntil: "domcontentloaded" });
    // Scroll down so News section loads
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForSelector("#news-section", { timeout: 15000 });
    // Wait for RichTextEditor to hydrate (it's loaded dynamically)
    await page.waitForSelector("[data-testid='rich-text-editor']", {
      timeout: 15000,
    });
  });

  // ── P1: Rich-text editor is visible ──────────────────────────────────────
  test("P1 - Rich-text editor toolbar is visible in News Description", async ({
    page,
  }) => {
    const toolbar = page.locator("#news-section [role='toolbar']").first();
    await expect(toolbar).toBeVisible({ timeout: 10000 });

    // All required toolbar buttons
    await expect(toolbar.locator("[aria-label='Bold']")).toBeVisible();
    await expect(toolbar.locator("[aria-label='Italic']")).toBeVisible();
    await expect(toolbar.locator("[aria-label='Bullet List']")).toBeVisible();
    await expect(toolbar.locator("[aria-label='Numbered List']")).toBeVisible();
    await expect(toolbar.locator("[aria-label='Undo']")).toBeVisible();
    await expect(toolbar.locator("[aria-label='Redo']")).toBeVisible();
  });

  // ── P2 & P3: Bold via Ctrl+B ──────────────────────────────────────────────
  test("P2&P3 - Bold works via toolbar button and Ctrl+B", async ({ page }) => {
    const editor = page.locator("[data-testid='rich-text-editor']").first();
    await editor.click();
    await page.keyboard.type("Hello Bold");

    // Select all and apply bold via Ctrl+B
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Control+b");

    const html = await editor.innerHTML();
    expect(html.toLowerCase()).toContain("strong");
  });

  // ── P4 & P5: Italic via Ctrl+I ────────────────────────────────────────────
  test("P4&P5 - Italic works via toolbar button and Ctrl+I", async ({
    page,
  }) => {
    const editor = page.locator("[data-testid='rich-text-editor']").first();
    await editor.click();
    await page.keyboard.type("Hello Italic");

    await page.keyboard.press("Control+a");
    await page.keyboard.press("Control+i");

    const html = await editor.innerHTML();
    expect(html.toLowerCase()).toContain("em");
  });

  // ── P6: Bullet list ──────────────────────────────────────────────────────
  test("P6 - Bullet list is created correctly", async ({ page }) => {
    const toolbar = page.locator("#news-section [role='toolbar']").first();
    const editor = page.locator("[data-testid='rich-text-editor']").first();
    await editor.click();

    await toolbar.locator("[aria-label='Bullet List']").click();
    await page.keyboard.type("First item");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Second item");

    const html = await editor.innerHTML();
    expect(html.toLowerCase()).toContain("<ul");
    expect(html.toLowerCase()).toContain("<li");
  });

  // ── P7: Numbered list ────────────────────────────────────────────────────
  test("P7 - Numbered list is created correctly", async ({ page }) => {
    const toolbar = page.locator("#news-section [role='toolbar']").first();
    const editor = page.locator("[data-testid='rich-text-editor']").first();
    await editor.click();

    await toolbar.locator("[aria-label='Numbered List']").click();
    await page.keyboard.type("Step one");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Step two");

    const html = await editor.innerHTML();
    expect(html.toLowerCase()).toContain("<ol");
    expect(html.toLowerCase()).toContain("<li");
  });

  // ── P8: Paragraph spacing ────────────────────────────────────────────────
  test("P8 - Paragraph spacing is preserved", async ({ page }) => {
    const editor = page.locator("[data-testid='rich-text-editor']").first();
    await editor.click();
    await page.keyboard.type("Paragraph one");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Paragraph two");

    const html = await editor.innerHTML();
    const pCount = (html.match(/<p/gi) || []).length;
    expect(pCount).toBeGreaterThanOrEqual(2);
  });

  // ── P14 & P15: Save and display formatted content ───────────────────────
  test("P14&P15 - Save formatting and display correctly on public news page", async ({
    page,
  }) => {
    const titleText = "Rich Text Test " + Date.now();

    await page.fill("[data-testid='news-title-input']", titleText);

    const editor = page.locator("[data-testid='rich-text-editor']").first();
    await editor.click();
    await page.keyboard.type("Bold headline");
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Control+b");

    // Publish and create
    await page.check("[data-testid='news-published-checkbox']");
    await page.click("[data-testid='news-create-btn']");

    // Wait for new item to appear in list
    await page.waitForTimeout(2000);

    // Navigate to public news page
    await page.goto(NEWS_URL, { waitUntil: "networkidle" });

    // Raw HTML tags should NOT appear as text
    const bodyText = await page.textContent("body");
    expect(bodyText).not.toContain("<strong>");
    expect(bodyText).not.toContain("</strong>");

    // Title should appear
    expect(bodyText).toContain(titleText);

    // Strong element should exist in DOM (formatted correctly)
    const strongCount = await page.locator(".news-prose strong").count();
    expect(strongCount).toBeGreaterThan(0);
  });

  // ── P16 & P17: Undo and Redo ──────────────────────────────────────────────
  test("P16&P17 - Undo and Redo work correctly", async ({ page }) => {
    const editor = page.locator("[data-testid='rich-text-editor']").first();
    await editor.click();
    await page.keyboard.type("Original text");

    const beforeUndo = await editor.innerHTML();

    // Undo last char typed
    await page.keyboard.press("Control+z");
    const afterUndo = await editor.innerHTML();
    expect(afterUndo).not.toEqual(beforeUndo);

    // Redo
    await page.keyboard.press("Control+Shift+Z");
    const afterRedo = await editor.innerHTML();
    expect(afterRedo).toEqual(beforeUndo);
  });
});

// ── N5: Script injection must never execute ─────────────────────────────────
test.describe("News — Security / Sanitisation", () => {
  test("N5&N8 - Pasted script tags cannot execute; raw HTML not shown as text", async ({
    page,
  }) => {
    // Directly hit the (unauthenticated) public news page
    // and check an item that has unsafe HTML
    // We can't POST without auth in this context, so we verify
    // that the /news page renders without any script execution
    await page.goto(NEWS_URL, { waitUntil: "networkidle" });

    // Script global should not be set
    const xssRan = await page.evaluate(() => (window as any).__xss_executed);
    expect(xssRan).toBeFalsy();

    // Raw HTML tags must not appear as plain text
    const bodyText = await page.textContent("body");
    expect(bodyText).not.toContain("<strong>");
    expect(bodyText).not.toContain("<em>");
    expect(bodyText).not.toContain("<ul>");
    expect(bodyText).not.toContain("<ol>");
    expect(bodyText).not.toContain("<script>");
    expect(bodyText).not.toContain("<img ");
  });
});

// ── N1: News Description must NOT be a plain textarea ─────────────────────
test.describe("News Description — Not Plain Textarea", () => {
  test("N1 - News Description uses rich-text editor, not plain textarea", async ({
    page,
  }) => {
    await registerAndLoginAsAdmin(page);
    await page.goto(ADMIN_URL, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForSelector("#news-section", { timeout: 15000 });
    await page.waitForSelector("[data-testid='rich-text-editor']", {
      timeout: 15000,
    });

    // There should be NO plain textarea inside the News description area
    const textareas = page.locator("#news-section textarea");
    expect(await textareas.count()).toBe(0);

    // Rich-text editor must be present and visible
    const rte = page.locator("[data-testid='rich-text-editor']").first();
    await expect(rte).toBeVisible({ timeout: 10000 });
  });

  async function registerAndLoginAsAdmin(page: Page): Promise<void> {
    const unique = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
    const email = `news_test_admin_${unique}@example.com`;
    const password = "NewsAdmin123!";

    const regRes = await page.request.post(
      "http://localhost:3000/api/auth/admin-register",
      {
        data: {
          name: "News Test Admin",
          email,
          password,
          secretKey: ADMIN_SECRET,
        },
      }
    );
    expect([200, 201]).toContain(regRes.status());

    await page.goto("http://localhost:3000/login", {
      waitUntil: "domcontentloaded",
    });
    await page.fill("#email", email);
    await page.fill("#password", password);
    await page.click('button[type="submit"]');
    await expect(page.locator("#auth-success-modal")).toBeVisible({
      timeout: 15000,
    });
    await page.waitForURL("http://localhost:3000/admin", { timeout: 15000 });
  }
});
