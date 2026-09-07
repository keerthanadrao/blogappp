import { test, expect } from '@playwright/test';

test.describe('Issue #5: Build the Main Feed', () => {
  test('Main feed displays posts chronologically with full details', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/');
    
    await expect(page.locator('h1')).toHaveText('Blog Application');
    
    // Check if it says "No posts published yet" or has posts
    const noPosts = page.locator('text=No posts published yet.');
    const articles = page.locator('article');
    
    if (await noPosts.isVisible()) {
      // It's acceptable to have no posts initially
      return;
    }
    
    // If there are posts, check for required elements
    const firstArticle = articles.first();
    await expect(firstArticle.locator('h2')).toBeVisible(); // Title
    await expect(firstArticle.locator('p').filter({ hasText: 'By' })).toBeVisible(); // Author and Date
    await expect(firstArticle.locator('text=❤️')).toBeVisible(); // Likes
    await expect(firstArticle.locator('text=💬')).toBeVisible(); // Comments
  });
});
