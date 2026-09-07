import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.describe('Issue #6: Like System', () => {
  test.beforeAll(async () => {
    // Cleanup any hanging data from aborted runs
    await prisma.user.deleteMany({ where: { email: 'liker_test@example.com' } });
  });

  test.afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany({ where: { email: 'liker_test@example.com' } });
  });

  test('Anonymous visitors are redirected to login when liking', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/');
    
    // Find the first post's like button
    const firstArticle = page.locator('article').first();
    const likeButton = firstArticle.locator('button.like-btn');
    
    // Make sure we have a post to test
    if (await likeButton.isVisible()) {
      await likeButton.click();
      
      // Should redirect to login
      await page.waitForURL('http://127.0.0.1:3000/login');
      expect(page.url()).toBe('http://127.0.0.1:3000/login');
    }
  });

  test('Registered user can like/unlike and see likers', async ({ page, request }) => {
    // 1. Register a user
    const regRes = await page.request.post('http://127.0.0.1:3000/api/auth/admin-register', {
      data: { email: 'liker_test@example.com', password: 'password', name: 'Liker Tester', secretKey: 'default_admin_secret' } // using admin-register just for quick setup, it's fine for testing
    });
    expect(regRes.ok()).toBeTruthy();

    // Fetch CSRF token for login
    const csrfRes = await page.request.get('http://127.0.0.1:3000/api/auth/csrf');
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken;

    // Login via API to set cookies on the shared context
    await page.request.post('http://127.0.0.1:3000/api/auth/callback/credentials', {
        form: {
          csrfToken,
          email: 'liker_test@example.com',
          password: 'password',
          json: 'true'
        }
      });

    // 2. Go to main feed
    await page.goto('http://127.0.0.1:3000/');
    
    const firstArticle = page.locator('article').first();
    const likeButton = firstArticle.locator('button.like-btn');
    const likeCountSpan = firstArticle.locator('span.like-count');
    
    if (await likeButton.isVisible()) {
      // Get initial count
      const initialCountText = await likeCountSpan.innerText();
      const initialCount = parseInt(initialCountText, 10);
      
      // 3. Like the post
      await likeButton.click();
      
      // Wait for count to increment
      await expect(likeCountSpan).toHaveText((initialCount + 1).toString());
      
      // 4. Click the like count to see the modal
      await likeCountSpan.click();
      
      // Verify modal is visible and shows user's name
      const modal = page.locator('h3', { hasText: 'Liked by' }).locator('../..');
      await expect(modal).toBeVisible();
      await expect(modal.locator('li', { hasText: 'Liker Tester' })).toBeVisible();
      
      // Close modal
      await page.locator('button', { hasText: '×' }).click();
      
      // 5. Unlike the post
      await likeButton.click();
      
      // Wait for count to decrement back
      await expect(likeCountSpan).toHaveText(initialCount.toString());
    }
  });
});
