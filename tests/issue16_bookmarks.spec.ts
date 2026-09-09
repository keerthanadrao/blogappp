import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

test.describe('Issue #16: Bookmark / Save Blog functionality', () => {
  const runId = Date.now();
  const userAEmail = `bookmark_user_a_${runId}@example.com`;
  const userBEmail = `bookmark_user_b_${runId}@example.com`;
  const password = 'BookmarkTestPassword123!';

  let userA: any;
  let userB: any;
  let category: any;
  let post1: any;
  let post2: any;

  const post1Title = `Bookmark Test Post 1 - Next.js Architecture ${runId}`;
  const post2Title = `Bookmark Test Post 2 - Database Sharding ${runId}`;

  test.beforeAll(async () => {
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Create Category
    category = await prisma.category.upsert({
      where: { name: 'BookmarkTestingCat' },
      update: {},
      create: { name: 'BookmarkTestingCat' },
    });

    // 2. Create User A
    userA = await prisma.user.create({
      data: {
        email: userAEmail,
        name: 'Alice Bookmarker',
        password_hash: hashedPassword,
        role: 'READER',
        image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      },
    });

    // 3. Create User B
    userB = await prisma.user.create({
      data: {
        email: userBEmail,
        name: 'Bob Bookmarker',
        password_hash: hashedPassword,
        role: 'READER',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      },
    });

    // 4. Create Published Posts
    post1 = await prisma.post.create({
      data: {
        title: post1Title,
        body: 'Complete guide to optimizing Next.js applications and caching techniques.',
        status: 'PUBLISHED',
        authorId: userA.id,
        categoryId: category.id,
      },
    });

    post2 = await prisma.post.create({
      data: {
        title: post2Title,
        body: 'Understanding database sharding, consistency models, and partition tolerance.',
        status: 'PUBLISHED',
        authorId: userB.id,
        categoryId: category.id,
      },
    });
  });

  // --------------------------------------------------------------------------
  // 🟩 POSITIVE TEST CASES
  // --------------------------------------------------------------------------

  test('Positive 1: Save a blog updates bookmark status and persists single entry', async ({ page }) => {
    // 1. Login as User A
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded' });
    await page.fill('#email', userAEmail);
    await page.fill('#password', password);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('http://127.0.0.1:3000/', { timeout: 15000 });
    await expect(page.locator('#nav-bookmarks-link')).toBeVisible({ timeout: 10000 });

    // 2. Locate Post 2 on feed
    const post2Card = page.locator(`article:has-text("${post2Title}")`);
    await expect(post2Card).toBeVisible();

    // 3. Click Bookmark/Save button and wait for API response
    const bookmarkBtn = post2Card.locator('.bookmark-btn');
    await expect(bookmarkBtn).toContainText('Save');

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/bookmark') && r.status() === 200
    );
    await bookmarkBtn.click();
    await responsePromise;

    // 4. Verify button status changes to "Saved"
    await expect(bookmarkBtn).toContainText('Saved', { timeout: 8000 });

    // 5. Verify database has exactly 1 bookmark entry
    const bookmarks = await prisma.$queryRaw<any[]>`
      SELECT * FROM "Bookmark" WHERE "postId" = ${post2.id} AND "userId" = ${userA.id}
    `;
    expect(bookmarks.length).toBe(1);
  });

  test('Positive 2: View saved blogs in dedicated Bookmarks section', async ({ page }) => {
    // Ensure Post 2 is bookmarked for User A
    await prisma.$executeRaw`
      INSERT OR IGNORE INTO "Bookmark" ("postId", "userId", "createdAt") VALUES (${post2.id}, ${userA.id}, CURRENT_TIMESTAMP)
    `;

    // 1. Login as User A
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded' });
    await page.fill('#email', userAEmail);
    await page.fill('#password', password);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('http://127.0.0.1:3000/', { timeout: 15000 });
    await expect(page.locator('#nav-bookmarks-link')).toBeVisible({ timeout: 10000 });

    // 2. Click Bookmarks link in navigation
    const navBookmarksLink = page.locator('#nav-bookmarks-link');
    await navBookmarksLink.click();

    // 3. Verify redirected to /bookmarks
    await page.waitForURL('**/bookmarks', { timeout: 10000 });
    await expect(page.locator('#bookmarks-page-title')).toContainText('Saved Blogs');

    // 4. Verify saved Post 2 is listed
    const savedCard = page.locator(`article:has-text("${post2Title}")`);
    await expect(savedCard).toBeVisible();
    await expect(savedCard.locator('.bookmark-btn')).toContainText('Saved');
  });

  test('Positive 3: Remove a saved blog updates list and unbookmarks blog', async ({ page }) => {
    // Ensure Post 2 is bookmarked for User A
    await prisma.$executeRaw`
      INSERT OR IGNORE INTO "Bookmark" ("postId", "userId", "createdAt") VALUES (${post2.id}, ${userA.id}, CURRENT_TIMESTAMP)
    `;

    // 1. Login as User A
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded' });
    await page.fill('#email', userAEmail);
    await page.fill('#password', password);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('http://127.0.0.1:3000/', { timeout: 15000 });
    await expect(page.locator('#nav-bookmarks-link')).toBeVisible({ timeout: 10000 });

    // 2. Go to /bookmarks
    await page.goto('http://127.0.0.1:3000/bookmarks', { waitUntil: 'domcontentloaded' });

    // 3. Click "Saved" button on Post 2 to unbookmark
    const savedCard = page.locator(`article:has-text("${post2Title}")`);
    await expect(savedCard).toBeVisible();

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/bookmark') && r.status() === 200
    );
    await savedCard.locator('.bookmark-btn').click();
    await responsePromise;

    // 4. Post should disappear from active bookmarks view and show empty state
    await expect(page.locator('#bookmarks-empty-state')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#bookmarks-empty-state')).toContainText('No saved blogs yet');

    // 5. Verify database entry is deleted
    const bookmarks = await prisma.$queryRaw<any[]>`
      SELECT * FROM "Bookmark" WHERE "postId" = ${post2.id} AND "userId" = ${userA.id}
    `;
    expect(bookmarks.length).toBe(0);
  });

  test('Positive 4: Saved blogs remain available across logout and re-login', async ({ page }) => {
    // 1. Save Post 1 for User A
    await prisma.$executeRaw`
      INSERT OR IGNORE INTO "Bookmark" ("postId", "userId", "createdAt") VALUES (${post1.id}, ${userA.id}, CURRENT_TIMESTAMP)
    `;

    // 2. Login as User A
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded' });
    await page.fill('#email', userAEmail);
    await page.fill('#password', password);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('http://127.0.0.1:3000/', { timeout: 15000 });
    await expect(page.locator('#nav-bookmarks-link')).toBeVisible({ timeout: 10000 });

    // 3. Verify Post 1 is in /bookmarks
    await page.goto('http://127.0.0.1:3000/bookmarks', { waitUntil: 'domcontentloaded' });
    await expect(page.locator(`article:has-text("${post1Title}")`)).toBeVisible();

    // 4. Sign out
    await page.click('button:has-text("Sign Out")');
    await expect(page.locator('a:has-text("Login")')).toBeVisible({ timeout: 15000 });

    // 5. Log back in as User A
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded' });
    await page.fill('#email', userAEmail);
    await page.fill('#password', password);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('http://127.0.0.1:3000/', { timeout: 15000 });
    await expect(page.locator('#nav-bookmarks-link')).toBeVisible({ timeout: 10000 });

    // 6. Navigate to /bookmarks and verify Post 1 is still present
    await page.goto('http://127.0.0.1:3000/bookmarks', { waitUntil: 'domcontentloaded' });
    const post1Card = page.locator(`article:has-text("${post1Title}")`);
    await expect(post1Card).toBeVisible();
    await expect(post1Card.locator('.bookmark-btn')).toContainText('Saved');
  });

  // --------------------------------------------------------------------------
  // ❌ NEGATIVE TEST CASES
  // --------------------------------------------------------------------------

  test('Negative 1: Bookmark without login redirects to /login', async ({ page, context }) => {
    // Clear cookies/sessions
    await context.clearCookies();

    // Open home page as anonymous visitor
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });

    // Find Post 1 and click Bookmark
    const postCard = page.locator(`article:has-text("${post1Title}")`);
    await expect(postCard).toBeVisible();

    await postCard.locator('.bookmark-btn').click();

    // Must redirect to /login
    await page.waitForURL('**/login', { timeout: 10000 });
    await expect(page.locator('h1')).toBeVisible();
  });

  test('Negative 2: Repeated bookmark requests maintain single bookmark (no duplicates)', async ({ page }) => {
    // Ensure Post 1 is bookmarked
    await prisma.$executeRaw`
      INSERT OR IGNORE INTO "Bookmark" ("postId", "userId", "createdAt") VALUES (${post1.id}, ${userA.id}, CURRENT_TIMESTAMP)
    `;

    const countRows = await prisma.$queryRaw<any[]>`
      SELECT count(*) as cnt FROM "Bookmark" WHERE "postId" = ${post1.id} AND "userId" = ${userA.id}
    `;
    expect(Number(countRows[0].cnt)).toBe(1);

    // Attempting raw duplicate insertion violates PRIMARY KEY
    await expect(
      prisma.$executeRaw`
        INSERT INTO "Bookmark" ("postId", "userId", "createdAt") VALUES (${post1.id}, ${userA.id}, CURRENT_TIMESTAMP)
      `
    ).rejects.toThrow();
  });

  test('Negative 3: Access another user saved blogs is strictly denied', async ({ page, context }) => {
    // Ensure User A has Post 1 bookmarked, User B has none
    await prisma.$executeRaw`
      DELETE FROM "Bookmark" WHERE "userId" = ${userB.id}
    `;
    await prisma.$executeRaw`
      INSERT OR IGNORE INTO "Bookmark" ("postId", "userId", "createdAt") VALUES (${post1.id}, ${userA.id}, CURRENT_TIMESTAMP)
    `;

    // 1. Login as User B
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded' });
    await page.fill('#email', userBEmail);
    await page.fill('#password', password);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('http://127.0.0.1:3000/', { timeout: 15000 });
    await expect(page.locator('#nav-bookmarks-link')).toBeVisible({ timeout: 10000 });

    // 2. Open /bookmarks as User B
    await page.goto('http://127.0.0.1:3000/bookmarks', { waitUntil: 'domcontentloaded' });

    // 3. User B must NOT see User A's bookmarked Post 1
    await expect(page.locator(`article:has-text("${post1Title}")`)).not.toBeVisible();
    await expect(page.locator('#bookmarks-empty-state')).toBeVisible();
    await expect(page.locator('#bookmarks-empty-state')).toContainText('No saved blogs yet');
  });

  test('Negative 4: Attempting to save a non-existent or deleted blog returns 404', async ({ page }) => {
    // 1. Login as User A to get authenticated session
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded' });
    await page.fill('#email', userAEmail);
    await page.fill('#password', password);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('http://127.0.0.1:3000/', { timeout: 15000 });

    // 2. Post request to invalid/non-existent post
    const res = await page.evaluate(async () => {
      const response = await fetch('/api/posts/non-existent-blog-id-9999/bookmark', {
        method: 'POST',
      });
      return { status: response.status, data: await response.json() };
    });

    expect(res.status).toBe(404);
    expect(res.data.error).toContain('Post not found or is no longer available');
  });
});
