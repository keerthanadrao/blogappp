import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

test.describe('Issue #8: Post Creation and Editing UI', () => {
  let categoryId: string;
  const categoryName = 'Technology';
  const authorEmail = 'author_issue8@example.com';
  const readerEmail = 'other_reader_issue8@example.com';
  const password = 'Password123!';

  test.beforeAll(async () => {
    // Cleanup previous test runs
    await prisma.post.deleteMany({ where: { title: { startsWith: 'Test Post ' } } });
    await prisma.user.deleteMany({ where: { email: { in: [authorEmail, readerEmail] } } });

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email: authorEmail,
        password_hash: hashedPassword,
        name: 'Author Tester',
        role: 'READER',
      },
    });

    await prisma.user.create({
      data: {
        email: readerEmail,
        password_hash: hashedPassword,
        name: 'Other Reader',
        role: 'READER',
      },
    });

    // Ensure we have a test category
    let category = await prisma.category.findUnique({ where: { name: categoryName } });
    if (!category) {
      category = await prisma.category.create({ data: { name: categoryName } });
    }
    categoryId = category.id;
  });

  test.afterAll(async () => {
    await prisma.post.deleteMany({ where: { title: { startsWith: 'Test Post ' } } });
    await prisma.user.deleteMany({ where: { email: { in: [authorEmail, readerEmail] } } });
  });

  test('User can create draft, filter tabs, edit, publish, and delete their post', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // 1. Register and Authenticate author
    await prisma.user.deleteMany({ where: { email: authorEmail } });
    const regRes = await page.request.post('http://127.0.0.1:3000/api/auth/register', {
      data: { email: authorEmail, password: password, name: 'Author Tester' },
    });
    expect(regRes.ok()).toBeTruthy();

    const csrfRes = await page.request.get('http://127.0.0.1:3000/api/auth/csrf');
    const csrfData = await csrfRes.json();

    const loginRes = await page.request.post('http://127.0.0.1:3000/api/auth/callback/credentials', {
      form: {
        csrfToken: csrfData.csrfToken,
        email: authorEmail,
        password: password,
        json: 'true',
      },
    });
    expect(loginRes.ok()).toBeTruthy();

    // 2. Navigate to home and verify navigation options
    await page.goto('http://127.0.0.1:3000/');
    await expect(page.locator('text=Author Tester')).toBeVisible();
    await expect(page.locator('text=Write Post')).toBeVisible();
    await expect(page.locator('text=My Posts')).toBeVisible();

    // 3. Validation test: trying to submit empty form
    await page.click('text=Write Post');
    await page.waitForURL('**/posts/new');
    await page.click('button:has-text("Save as Draft")');
    await expect(page.locator('text=Title, body, and category are required.')).toBeVisible();

    // Fill form and save as Draft
    await page.fill('input[placeholder="Enter post title..."]', 'Test Post Draft');
    await expect(page.locator('select option[value]:not([value=""])').first()).toBeAttached();
    await page.locator('select').selectOption({ label: categoryName });
    await page.fill('textarea', 'This is the initial draft content of the article.');

    await page.click('button:has-text("Save as Draft")');
    await page.waitForURL('**/my-posts');

    // 4. Verify post in My Posts with DRAFT badge and tab filtering
    const myPostsBody = page.locator('body');
    await expect(myPostsBody).toContainText('Test Post Draft');
    await expect(myPostsBody).toContainText('DRAFT');

    // Test tab filters
    await page.click('button:has-text("Drafts")');
    await expect(page.locator('body')).toContainText('Test Post Draft');

    await page.click('button:has-text("Published")');
    await expect(page.locator('body', { hasText: 'Test Post Draft' })).toHaveCount(0);

    await page.click('button:has-text("All")');
    await expect(page.locator('body')).toContainText('Test Post Draft');

    // Verify draft is NOT visible on main feed
    await page.goto('http://127.0.0.1:3000/');
    await expect(page.locator('body', { hasText: 'Test Post Draft' })).toHaveCount(0);

    // 5. Navigate back to My Posts and Edit the draft to Publish it
    await page.goto('http://127.0.0.1:3000/my-posts');
    await page.click('text=Edit');
    await page.waitForURL('**/posts/**/edit');

    // Check pre-filled values
    await expect(page.locator('input[placeholder="Enter post title..."]')).toHaveValue('Test Post Draft');
    await expect(page.locator('textarea')).toHaveValue('This is the initial draft content of the article.');

    // Update title and content and publish
    await page.fill('input[placeholder="Enter post title..."]', 'Test Post Published Title');
    await page.fill('textarea', 'Updated published post content with full details.');
    await page.click('button:has-text("Publish"), button:has-text("Update Post")');
    await page.waitForURL('**/my-posts');

    // 6. Verify in My Posts that it is marked PUBLISHED
    await expect(page.locator('body')).toContainText('Test Post Published Title');
    await expect(page.locator('body')).toContainText('PUBLISHED');

    // Verify published post IS visible on public feed
    await page.goto('http://127.0.0.1:3000/');
    await expect(page.locator('body')).toContainText('Test Post Published Title');

    // 7. Delete the post from My Posts
    await page.goto('http://127.0.0.1:3000/my-posts');
    page.once('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Delete")');

    // Verify it is removed from My Posts
    await page.waitForTimeout(1000);
    await expect(page.locator('body', { hasText: 'Test Post Published Title' })).toHaveCount(0);

    // Verify it is removed from Main Feed
    await page.goto('http://127.0.0.1:3000/');
    await expect(page.locator('body', { hasText: 'Test Post Published Title' })).toHaveCount(0);

    await context.close();
  });

  test('Other users cannot edit or delete someone else post via API or UI', async ({ browser }) => {
    // 1. Author creates a post
    const authorUser = await prisma.user.findUnique({ where: { email: authorEmail } });
    const post = await prisma.post.create({
      data: {
        title: 'Test Post Protection',
        body: 'Post content belonging to Author Tester',
        status: 'PUBLISHED',
        authorId: authorUser!.id,
        categoryId,
      },
    });

    // 2. Login as Other Reader in new context
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('http://127.0.0.1:3000/login');
    await page.fill('input[type="email"]', readerEmail);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('http://127.0.0.1:3000/');

    // Attempt to access edit page of author's post -> should redirect to /
    await page.goto(`http://127.0.0.1:3000/posts/${post.id}/edit`);
    expect(page.url()).toBe('http://127.0.0.1:3000/');

    // Attempt API PUT to update author's post -> should return 403 Forbidden
    const putRes = await page.request.put(`http://127.0.0.1:3000/api/posts/${post.id}`, {
      data: { title: 'Hacked Title' },
    });
    expect(putRes.status()).toBe(403);

    // Attempt API DELETE -> should return 403 Forbidden
    const delRes = await page.request.delete(`http://127.0.0.1:3000/api/posts/${post.id}`);
    expect(delRes.status()).toBe(403);

    await context.close();
    await prisma.post.deleteMany({ where: { id: post.id } });
  });
});
