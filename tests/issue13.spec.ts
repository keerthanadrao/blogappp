import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

test.describe('Issue #13: Search & Filter functionality by title, category, and tag', () => {
  let techCategory: any;
  let lifestyleCategory: any;
  let emptyCategory: any;
  let author: any;

  const post1Title = 'Mastering Next.js 14 and React Server Components';
  const post2Title = 'Modern CSS Tricks and Animations for 2026';
  const post3Title = 'Healthy Morning Routines for Developers';

  test.beforeAll(async () => {
    // 1. Create or get test author
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    author = await prisma.user.upsert({
      where: { email: 'search_author_test@example.com' },
      update: {},
      create: {
        email: 'search_author_test@example.com',
        name: 'Search Tester',
        password_hash: hashedPassword,
        role: 'ADMIN',
      },
    });

    // 2. Create test categories
    techCategory = await prisma.category.upsert({
      where: { name: 'Technology' },
      update: {},
      create: { name: 'Technology' },
    });

    lifestyleCategory = await prisma.category.upsert({
      where: { name: 'Lifestyle' },
      update: {},
      create: { name: 'Lifestyle' },
    });

    emptyCategory = await prisma.category.upsert({
      where: { name: 'UnusedCategory' },
      update: {},
      create: { name: 'UnusedCategory' },
    });

    // 3. Clean up any existing test posts
    await prisma.post.deleteMany({
      where: {
        title: {
          in: [post1Title, post2Title, post3Title, 'Special Characters & Symbols Post [2026]'],
        },
      },
    });

    // 4. Seed test posts with distinct titles, categories, and tags
    await prisma.post.create({
      data: {
        title: post1Title,
        body: 'Deep dive into React server components, streaming SSR, and edge deployments. #nextjs #fullstack',
        tags: 'nextjs, react, typescript',
        status: 'PUBLISHED',
        authorId: author.id,
        categoryId: techCategory.id,
      },
    });

    await prisma.post.create({
      data: {
        title: post2Title,
        body: 'Explore modern CSS subgrid, scroll animations, and glassmorphism styling tricks. #css #frontend',
        tags: 'css, design, styling',
        status: 'PUBLISHED',
        authorId: author.id,
        categoryId: techCategory.id,
      },
    });

    await prisma.post.create({
      data: {
        title: post3Title,
        body: 'How to build sustainable daily routines, meditation, and healthy screen habits. #mindset #wellness',
        tags: 'wellness, health, productivity',
        status: 'PUBLISHED',
        authorId: author.id,
        categoryId: lifestyleCategory.id,
      },
    });
  });

  // --------------------------------------------------------------------------
  // 🟩 POSITIVE TEST CASES
  // --------------------------------------------------------------------------

  test('Positive 1: Search by title displays matching blogs and filters out non-matching blogs', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });

    // Ensure search input is visible
    const searchInput = page.locator('#search-input');
    await expect(searchInput).toBeVisible();

    // Search for "Next.js"
    await searchInput.fill('Next.js');
    await page.locator('#search-submit-btn').click();

    // Verify Post 1 is displayed
    await expect(page.locator(`text=${post1Title}`)).toBeVisible();

    // Verify unrelated posts are not displayed
    await expect(page.locator(`text=${post2Title}`)).not.toBeVisible();
    await expect(page.locator(`text=${post3Title}`)).not.toBeVisible();
  });

  test('Positive 2: Filter by category via dropdown and category pills', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });

    // Select Lifestyle category via dropdown
    const categoryFilter = page.locator('#category-filter');
    await expect(categoryFilter).toBeVisible();
    await categoryFilter.selectOption('Lifestyle');

    // Verify Lifestyle post is displayed
    await expect(page.locator(`text=${post3Title}`)).toBeVisible();

    // Verify Technology posts are filtered out
    await expect(page.locator(`text=${post1Title}`)).not.toBeVisible();
    await expect(page.locator(`text=${post2Title}`)).not.toBeVisible();

    // Now test clicking the Technology category pill
    const techPill = page.locator('.category-pill[data-category="Technology"]');
    await expect(techPill).toBeVisible();
    await techPill.click();

    // Technology posts should now be visible, Lifestyle post hidden
    await expect(page.locator(`text=${post1Title}`)).toBeVisible();
    await expect(page.locator(`text=${post2Title}`)).toBeVisible();
    await expect(page.locator(`text=${post3Title}`)).not.toBeVisible();
  });

  test('Positive 3: Filter by tag displays only matching blogs', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });

    // Select "css" tag via tag filter dropdown
    const tagFilter = page.locator('#tag-filter');
    await expect(tagFilter).toBeVisible();
    await tagFilter.selectOption('css');

    // Verify Post 2 (CSS Tricks) is displayed
    await expect(page.locator(`text=${post2Title}`)).toBeVisible();

    // Verify other posts are not displayed
    await expect(page.locator(`text=${post1Title}`)).not.toBeVisible();
    await expect(page.locator(`text=${post3Title}`)).not.toBeVisible();
  });

  test('Positive 4: Combined Search and Category filter displays only matching intersection', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });

    // Select Category "Technology"
    await page.locator('#category-filter').selectOption('Technology');

    // Both Tech posts should initially be visible
    await expect(page.locator(`text=${post1Title}`)).toBeVisible();
    await expect(page.locator(`text=${post2Title}`)).toBeVisible();

    // Now refine search with "Next.js"
    await page.locator('#search-input').fill('Next.js');

    // Only Post 1 should match both Technology AND "Next.js"
    await expect(page.locator(`text=${post1Title}`)).toBeVisible();
    await expect(page.locator(`text=${post2Title}`)).not.toBeVisible();
    await expect(page.locator(`text=${post3Title}`)).not.toBeVisible();
  });

  test('Positive 5: Clicking a tag chip on a PostCard filters by that tag', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });

    // Find and click the #wellness tag chip on the Lifestyle post card
    const wellnessTagBtn = page.locator('button.post-tag-chip:has-text("#wellness")').first();
    await expect(wellnessTagBtn).toBeVisible();
    await wellnessTagBtn.click();

    // Should only show Post 3
    await expect(page.locator(`text=${post3Title}`)).toBeVisible();
    await expect(page.locator(`text=${post1Title}`)).not.toBeVisible();
    await expect(page.locator(`text=${post2Title}`)).not.toBeVisible();
  });

  // --------------------------------------------------------------------------
  // ❌ NEGATIVE TEST CASES
  // --------------------------------------------------------------------------

  test('Negative 1: Search with non-existent keyword displays "No blogs found" message', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });

    // Search for a random string that doesn't exist
    await page.locator('#search-input').fill('NonExistentKeywordXYZ99999');

    // Expect empty state container to appear
    const emptyState = page.locator('#no-blogs-found');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('No blogs found');

    // Verify none of the test posts are shown
    await expect(page.locator(`text=${post1Title}`)).not.toBeVisible();
    await expect(page.locator(`text=${post2Title}`)).not.toBeVisible();
    await expect(page.locator(`text=${post3Title}`)).not.toBeVisible();
  });

  test('Negative 2: Filter by category with no matching blogs displays "No blogs found"', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });

    // Select the empty category
    await page.locator('#category-filter').selectOption('UnusedCategory');

    // Expect empty state
    const emptyState = page.locator('#no-blogs-found');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('No blogs found');
  });

  test('Negative 3: Search with special/invalid characters handles gracefully without errors', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });

    // Enter special regex-sensitive characters
    await page.locator('#search-input').fill('!@#$%^&*()_+{}[]|:;<>?,./~`');

    // Page must not crash; either matches or displays empty state safely
    const emptyState = page.locator('#no-blogs-found');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('No blogs found');
  });

  test('Negative 4: Clearing search and resetting filters restores all published blogs', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });

    // Apply search filter
    await page.locator('#search-input').fill('Next.js');
    await expect(page.locator(`text=${post2Title}`)).not.toBeVisible();

    // Click clear search button (X)
    const clearBtn = page.locator('#search-clear-btn');
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    // All posts should now be visible again
    await expect(page.locator(`text=${post1Title}`)).toBeVisible();
    await expect(page.locator(`text=${post2Title}`)).toBeVisible();
    await expect(page.locator(`text=${post3Title}`)).toBeVisible();

    // Filter by category and reset using "Reset All Filters" button
    await page.locator('#category-filter').selectOption('Lifestyle');
    await expect(page.locator(`text=${post1Title}`)).not.toBeVisible();

    const resetFiltersBtn = page.locator('#clear-filters-btn');
    await expect(resetFiltersBtn).toBeVisible();
    await resetFiltersBtn.click();

    // All posts should be visible
    await expect(page.locator(`text=${post1Title}`)).toBeVisible();
    await expect(page.locator(`text=${post2Title}`)).toBeVisible();
    await expect(page.locator(`text=${post3Title}`)).toBeVisible();
  });
});
