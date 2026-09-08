import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.describe('Issue #4: Admin Dashboard', () => {
  test.beforeAll(async () => {
    // Cleanup any hanging data from aborted runs
    await prisma.user.deleteMany({ where: { email: { in: ['admin_dashboard@example.com', 'author_test@example.com'] } } });
    await prisma.category.deleteMany({ where: { name: { in: ['Test Dashboard Category', 'Seed Category'] } } });
  });

  test.afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany({ where: { email: { in: ['admin_dashboard@example.com', 'author_test@example.com'] } } });
    await prisma.category.deleteMany({ where: { name: { in: ['Test Dashboard Category', 'Seed Category'] } } });
  });

  test('Security: Non-Admins cannot access dashboard', async ({ page, request }) => {
    // Navigate directly to /admin as a guest
    await page.goto('http://127.0.0.1:3000/admin', { waitUntil: 'domcontentloaded' });

    // Should be redirected or access denied. AdminLayout redirects to `/login?role=admin`.
    await page.waitForURL(/(\/login|\/$)/);
    expect(page.url()).toMatch(/(\/login|\/$)/);

    // Test API security
    const res = await request.get('http://127.0.0.1:3000/api/admin/categories');
    expect(res.status()).toBe(403);
  });

  test('Admin can access dashboard and manage categories and posts', async ({ page, request }) => {
    // 1. Clean up existing admin and register Admin
    await prisma.user.deleteMany({ where: { role: 'ADMIN' } });
    const regRes = await page.request.post('http://127.0.0.1:3000/api/auth/admin-register', {
      data: { email: 'admin_dashboard@example.com', password: 'password', name: 'Dashboard Admin', secretKey: 'default_admin_secret' }
    });
    if (!regRes.ok()) {
      console.log('Registration failed:', await regRes.text());
    }
    expect(regRes.ok()).toBeTruthy();

    // Fetch CSRF token for login
    const csrfRes = await page.request.get('http://127.0.0.1:3000/api/auth/csrf');
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken;

    // Login via API to set cookies on the shared context
    const loginRes = await
      page.request.post('http://127.0.0.1:3000/api/auth/callback/credentials', {
        form: {
          csrfToken,
          email: 'admin_dashboard@example.com',
          password: 'password',
          json: 'true'
        }
      });
    console.log('Login status:', loginRes.status())
    console.log('Login response:', await loginRes.text())
    // Setup dummy data: Create an author, a category, and a post via Prisma to test post deletion
    await prisma.post.deleteMany({ where: { title: 'Test Post for Admin Deletion' } });
    await prisma.user.deleteMany({ where: { email: 'author_issue4_test@example.com' } });
    const author = await prisma.user.create({
      data: { email: 'author_issue4_test@example.com', password_hash: 'dummy', name: 'Test Author', role: 'READER' }
    });
    const category = await prisma.category.upsert({
      where: { name: 'Seed Category' },
      update: {},
      create: { name: 'Seed Category' }
    });
    const post = await prisma.post.create({
      data: { title: 'Test Post for Admin Deletion', body: 'Content', authorId: author.id, categoryId: category.id, status: 'PUBLISHED' }
    });

    // 2. Go to Dashboard
    await page.goto('http://127.0.0.1:3000/admin');
    await expect(page.locator('h1')).toHaveText('Dashboard Overview');

    // 3. Create Category
    await page.fill('input[placeholder="New Category Name"]', 'Test Dashboard Category');
    await page.click('button:has-text("Add Category")');

    // Verify it appears in the table
    await expect(page.locator('td', { hasText: 'Test Dashboard Category' })).toBeVisible();

    // 4. Delete Category
    page.on('dialog', dialog => dialog.accept()); // accept browser confirm dialog
    await page.locator('tr', { hasText: 'Test Dashboard Category' }).locator('button', { hasText: 'Delete' }).click();

    // Wait for it to disappear
    await expect(page.locator('td', { hasText: 'Test Dashboard Category' })).not.toBeVisible();

    // 5. Delete Post
    await expect(page.locator('td', { hasText: 'Test Post for Admin Deletion' })).toBeVisible();
    await page.locator('tr', { hasText: 'Test Post for Admin Deletion' }).locator('button', { hasText: 'Delete' }).click();

    // Wait for it to disappear
    await expect(page.locator('td', { hasText: 'Test Post for Admin Deletion' })).not.toBeVisible();
  });
});
