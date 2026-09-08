import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

test.describe('Issue #10 (GitHub Issue #8): Image URL Field for Add/Write Post and Edit Post Form', () => {
  const timestamp = Date.now();
  const authorEmail = `issue10_author_${timestamp}@example.com`;
  const authorPassword = 'Password123!';
  const categoryName = `Tech_${timestamp}`;
  let categoryId: string;

  const validImageUrl1 = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809';
  const validImageUrl2 = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe';

  test.beforeAll(async () => {
    // Create test category and test user
    const category = await prisma.category.create({
      data: { name: categoryName },
    });
    categoryId = category.id;

    const hashedPassword = await bcrypt.hash(authorPassword, 10);
    await prisma.user.create({
      data: {
        email: authorEmail,
        name: 'Image Author Tester',
        password_hash: hashedPassword,
        role: 'READER',
      },
    });
  });

  test.afterAll(async () => {
    // Clean up created posts, categories, and user
    await prisma.post.deleteMany({
      where: { author: { email: authorEmail } },
    });
    await prisma.category.deleteMany({
      where: { id: categoryId },
    });
    await prisma.user.deleteMany({
      where: { email: authorEmail },
    });
  });

  async function loginAuthor(page: any) {
    const csrfRes = await page.request.get('http://127.0.0.1:3000/api/auth/csrf');
    const csrfData = await csrfRes.json();

    const loginRes = await page.request.post('http://127.0.0.1:3000/api/auth/callback/credentials', {
      form: {
        csrfToken: csrfData.csrfToken,
        email: authorEmail,
        password: authorPassword,
        json: 'true',
      },
    });
    expect(loginRes.ok()).toBeTruthy();
  }

  test.beforeEach(async ({ page }) => {
    await loginAuthor(page);
  });

  // --------------------------------------------------------------------------
  // POSITIVE TESTS
  // --------------------------------------------------------------------------

  test('Positive Test 1 & 2: Add post with valid Image URL, verify preview, save, and display on Home feed and Post detail', async ({ page }) => {
    // 1. Open Write Post form
    await page.goto('http://127.0.0.1:3000/posts/new', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText('Create New Post');

    // 2. Enter Title, Category, Content, and valid Image URL
    const postTitle = `Post with Cover Image ${timestamp}`;
    await page.fill('input[placeholder="Enter post title..."]', postTitle);
    await page.locator('select').selectOption({ label: categoryName });
    await page.fill('#cover_image_url', validImageUrl1);
    await page.fill('textarea', 'Detailed article content featuring a high-res cover image.');

    // Verify live preview is rendered
    const previewImg = page.locator('img[alt="Cover preview"]');
    await expect(previewImg).toBeVisible();
    await expect(previewImg).toHaveAttribute('src', validImageUrl1);

    // 3. Publish the post
    await page.click('button:has-text("Publish")');
    await page.waitForURL('**/my-posts', { waitUntil: 'domcontentloaded', timeout: 10000 });

    // Verify database record
    const savedPost = await prisma.post.findFirst({
      where: { title: postTitle },
    });
    expect(savedPost).not.toBeNull();
    expect(savedPost?.cover_image_url).toBe(validImageUrl1);

    // 4. Open Home page and verify cover image is displayed in PostCard
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });
    const postCard = page.locator('article', { hasText: postTitle });
    await expect(postCard).toBeVisible();
    const cardImg = postCard.locator('img');
    await expect(cardImg).toBeVisible();
    await expect(cardImg).toHaveAttribute('src', validImageUrl1);

    // 5. Open Post Detail page and verify cover image is displayed
    await page.goto(`http://127.0.0.1:3000/posts/${savedPost?.id}`, { waitUntil: 'domcontentloaded' });
    const detailCard = page.locator('article', { hasText: postTitle });
    await expect(detailCard.locator('img')).toBeVisible();
    await expect(detailCard.locator('img')).toHaveAttribute('src', validImageUrl1);
  });

  test('Positive Test 3: Edit existing post Image URL, verify pre-fill, update URL, and display updated image', async ({ page }) => {
    // 1. Create initial post with validImageUrl1
    const post = await prisma.post.create({
      data: {
        title: `Editable Image Post ${timestamp}`,
        body: 'Content to be edited with new image URL.',
        categoryId,
        status: 'PUBLISHED',
        authorId: (await prisma.user.findUnique({ where: { email: authorEmail } }))!.id,
        cover_image_url: validImageUrl1,
      },
    });

    // 2. Open Edit page
    await page.goto(`http://127.0.0.1:3000/posts/${post.id}/edit`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText('Edit Post');

    // Verify Image URL is pre-filled
    const urlInput = page.locator('#cover_image_url');
    await expect(urlInput).toHaveValue(validImageUrl1);

    // 3. Replace with second valid Image URL
    await urlInput.fill(validImageUrl2);
    await page.click('button:has-text("Publish"), button:has-text("Update Post")');
    await page.waitForURL('**/my-posts', { waitUntil: 'domcontentloaded', timeout: 10000 });

    // Verify database record updated
    const updatedPost = await prisma.post.findUnique({ where: { id: post.id } });
    expect(updatedPost?.cover_image_url).toBe(validImageUrl2);

    // 4. Open Home feed and verify updated image is displayed
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });
    const postCard = page.locator('article', { hasText: `Editable Image Post ${timestamp}` });
    const cardImg = postCard.locator('img');
    await expect(cardImg).toHaveAttribute('src', validImageUrl2);
  });

  test('Positive Test 4: Create a post without Image URL (optional field)', async ({ page }) => {
    // 1. Open Write Post form
    await page.goto('http://127.0.0.1:3000/posts/new', { waitUntil: 'domcontentloaded' });

    // 2. Fill Title, Category, Content, leave Image URL empty
    const noImgTitle = `No Image Post ${timestamp}`;
    await page.fill('input[placeholder="Enter post title..."]', noImgTitle);
    await page.locator('select').selectOption({ label: categoryName });
    await page.fill('#cover_image_url', '');
    await page.fill('textarea', 'This post does not have a cover image.');

    // 3. Publish
    await page.click('button:has-text("Publish")');
    await page.waitForURL('**/my-posts', { waitUntil: 'domcontentloaded', timeout: 10000 });

    // Verify post created with null cover_image_url
    const savedPost = await prisma.post.findFirst({ where: { title: noImgTitle } });
    expect(savedPost).not.toBeNull();
    expect(savedPost?.cover_image_url).toBeNull();

    // 4. Check Home feed: PostCard renders without broken image
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });
    const postCard = page.locator('article', { hasText: noImgTitle });
    await expect(postCard).toBeVisible();
    await expect(postCard.locator('img')).toHaveCount(0);
  });

  // --------------------------------------------------------------------------
  // NEGATIVE TESTS
  // --------------------------------------------------------------------------

  test('Negative Test 1: Enter invalid non-URL string in Image URL displays validation error', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/posts/new', { waitUntil: 'domcontentloaded' });

    await page.fill('input[placeholder="Enter post title..."]', `Invalid URL Post ${timestamp}`);
    await page.locator('select').selectOption({ label: categoryName });
    await page.fill('#cover_image_url', 'not-a-valid-url');
    await page.fill('textarea', 'Testing invalid URL validation.');

    await page.click('button:has-text("Publish")');

    // Verify validation error is displayed
    await expect(page.locator('text=Please enter a valid HTTP or HTTPS Image URL.')).toBeVisible();
    expect(page.url()).toContain('/posts/new');
  });

  test('Negative Test 2: Enter malformed scheme URL in Image URL displays validation error', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/posts/new', { waitUntil: 'domcontentloaded' });

    await page.fill('input[placeholder="Enter post title..."]', `Malformed URL Post ${timestamp}`);
    await page.locator('select').selectOption({ label: categoryName });
    await page.fill('#cover_image_url', 'abc://invalid-scheme');
    await page.fill('textarea', 'Testing malformed scheme URL validation.');

    await page.click('button:has-text("Publish")');

    // Verify validation error is displayed
    await expect(page.locator('text=Please enter a valid HTTP or HTTPS Image URL.')).toBeVisible();
    expect(page.url()).toContain('/posts/new');
  });
});
