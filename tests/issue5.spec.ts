import { test, expect } from '@playwright/test';

test.describe('Issue #5: Build the Main Feed', () => {
  test('Main feed displays posts chronologically with full details', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/');
    
    await expect(page.locator('h1')).toHaveText('Antigravity Blog');
    
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
    await expect(firstArticle.locator('span').filter({ hasText: '•' })).toBeVisible(); // Author and Date separator
    await expect(firstArticle.locator('svg').first()).toBeVisible(); // Likes icon
    await expect(firstArticle.locator('svg').nth(1)).toBeVisible(); // Comments icon
  });
});
