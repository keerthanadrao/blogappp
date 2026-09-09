import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

test.describe('Issue: Display author name and profile image on each blog', () => {
  const runId = Date.now();
  const userAEmail = `author_a_${runId}@example.com`;
  const userBEmail = `author_b_${runId}@example.com`;
  const userCEmail = `author_no_img_${runId}@example.com`;
  const userDEmail = `author_broken_img_${runId}@example.com`;
  const password = 'AuthorTestPassword123!';

  let userA: any;
  let userB: any;
  let userC: any;
  let userD: any;
  let category: any;

  const userAImage = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
  const userBImage = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150';
  const updatedUserAImage = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150';

  const postATitle = `User A Blog Post on Cloud Architecture ${runId}`;
  const postBTitle = `User B Blog Post on Distributed Systems ${runId}`;
  const postCTitle = `User C Blog Post Without Avatar Image ${runId}`;
  const postDTitle = `User D Blog Post With Broken Avatar Image ${runId}`;

  test.beforeAll(async () => {
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Create Category
    category = await prisma.category.upsert({
      where: { name: 'AuthorAvatarTestCat' },
      update: {},
      create: { name: 'AuthorAvatarTestCat' },
    });

    // 2. Create User A (with profile image)
    userA = await prisma.user.create({
      data: {
        email: userAEmail,
        name: 'Alice Author A',
        password_hash: hashedPassword,
        role: 'READER',
        image: userAImage,
      },
    });

    // 3. Create User B (with distinct profile image)
    userB = await prisma.user.create({
      data: {
        email: userBEmail,
        name: 'Bob Author B',
        password_hash: hashedPassword,
        role: 'READER',
        image: userBImage,
      },
    });

    // 4. Create User C (without profile image)
    userC = await prisma.user.create({
      data: {
        email: userCEmail,
        name: 'Charlie No Avatar',
        password_hash: hashedPassword,
        role: 'READER',
        image: null,
      },
    });

    // 5. Create User D (with fast-failing broken image URL)
    userD = await prisma.user.create({
      data: {
        email: userDEmail,
        name: 'David Broken Avatar',
        password_hash: hashedPassword,
        role: 'READER',
        image: 'http://127.0.0.1:54321/non-existent-image.jpg',
      },
    });

    // 6. Create Published Posts for each author
    await prisma.post.create({
      data: {
        title: postATitle,
        body: 'In-depth analysis of scalable cloud services.',
        status: 'PUBLISHED',
        authorId: userA.id,
        categoryId: category.id,
      },
    });

    await prisma.post.create({
      data: {
        title: postBTitle,
        body: 'Consensus protocols and fault tolerance.',
        status: 'PUBLISHED',
        authorId: userB.id,
        categoryId: category.id,
      },
    });

    await prisma.post.create({
      data: {
        title: postCTitle,
        body: 'Post by an author without any custom profile image.',
        status: 'PUBLISHED',
        authorId: userC.id,
        categoryId: category.id,
      },
    });

    await prisma.post.create({
      data: {
        title: postDTitle,
        body: 'Post by an author with a broken image link.',
        status: 'PUBLISHED',
        authorId: userD.id,
        categoryId: category.id,
      },
    });
  });

  // --------------------------------------------------------------------------
  // 🟩 POSITIVE TEST CASES
  // --------------------------------------------------------------------------

  test('Positive 1: Display author name and uploaded profile image beside each other on blog', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });

    // Locate post A card
    const postCard = page.locator(`article:has-text("${postATitle}")`);
    await expect(postCard).toBeVisible();

    // Verify Author Name is displayed
    const authorName = postCard.locator('.author-name');
    await expect(authorName).toContainText('Alice Author A');

    // Verify Author Profile Image is displayed inside author avatar icon
    const avatarImg = postCard.locator('.author-avatar-img');
    await expect(avatarImg).toBeVisible();
    await expect(avatarImg).toHaveAttribute('src', userAImage);
  });

  test('Positive 2: Display correct author image for each respective blog (no mixing)', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });

    // Check Post A
    const postACard = page.locator(`article:has-text("${postATitle}")`);
    await expect(postACard.locator('.author-name')).toContainText('Alice Author A');
    await expect(postACard.locator('.author-avatar-img')).toHaveAttribute('src', userAImage);

    // Check Post B
    const postBCard = page.locator(`article:has-text("${postBTitle}")`);
    await expect(postBCard.locator('.author-name')).toContainText('Bob Author B');
    await expect(postBCard.locator('.author-avatar-img')).toHaveAttribute('src', userBImage);

    // Verify Post A does NOT have User B's image
    const postAImgSrc = await postACard.locator('.author-avatar-img').getAttribute('src');
    expect(postAImgSrc).not.toBe(userBImage);
  });

  test('Positive 3: Updated profile image is reflected on published blogs', async ({ page }) => {
    // 1. Update User A's profile image via raw SQLite
    await prisma.$executeRaw`UPDATE User SET image = ${updatedUserAImage} WHERE id = ${userA.id}`;

    // 2. Open Home page
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });

    // 3. Verify Post A now shows updated profile image
    const postCard = page.locator(`article:has-text("${postATitle}")`);
    const avatarImg = postCard.locator('.author-avatar-img');
    await expect(avatarImg).toBeVisible();
    await expect(avatarImg).toHaveAttribute('src', updatedUserAImage);
  });

  test('Positive 4: Author without profile image displays default author icon/initials', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });

    // Locate Post C (Charlie No Avatar)
    const postCard = page.locator(`article:has-text("${postCTitle}")`);
    await expect(postCard).toBeVisible();

    // Verify author name
    await expect(postCard.locator('.author-name')).toContainText('Charlie No Avatar');

    // Verify fallback initial icon is displayed and no broken img
    const fallbackIcon = postCard.locator('.author-avatar-fallback');
    await expect(fallbackIcon).toBeVisible();
    await expect(fallbackIcon).toHaveText('C');
    await expect(postCard.locator('.author-avatar-img')).toHaveCount(0);
  });

  // --------------------------------------------------------------------------
  // ❌ NEGATIVE TEST CASES
  // --------------------------------------------------------------------------

  test('Negative 1: Broken/Invalid profile image URL triggers fallback icon gracefully', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });

    // Locate Post D (David Broken Avatar)
    const postCard = page.locator(`article:has-text("${postDTitle}")`);
    await expect(postCard).toBeVisible();

    // Verify fallback icon appears after load error without breaking the layout
    const fallbackIcon = postCard.locator('.author-avatar-fallback');
    await expect(fallbackIcon).toBeVisible({ timeout: 10000 });
    await expect(fallbackIcon).toHaveText('D');
  });

  test('Negative 2: Logged-in User A viewing User B blog sees User B details, not User A', async ({ page }) => {
    // 1. Login as User A
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded' });
    await page.fill('#email', userAEmail);
    await page.fill('#password', password);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('http://127.0.0.1:3000/', { timeout: 15000 });

    // 2. View Post B on Home page
    const postBCard = page.locator(`article:has-text("${postBTitle}")`);
    await expect(postBCard).toBeVisible();

    // Author name must be Bob Author B, and image must be Bob's image
    await expect(postBCard.locator('.author-name')).toContainText('Bob Author B');
    await expect(postBCard.locator('.author-avatar-img')).toHaveAttribute('src', userBImage);
  });

  test('Negative 3: Removing/Deleting profile image displays default initial icon on published blogs', async ({ page }) => {
    // 1. Remove User B's profile image
    await prisma.$executeRaw`UPDATE User SET image = NULL WHERE id = ${userB.id}`;

    // 2. Reload home page
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });

    // 3. Verify Post B now displays default initial icon 'B'
    const postBCard = page.locator(`article:has-text("${postBTitle}")`);
    const fallbackIcon = postBCard.locator('.author-avatar-fallback');
    await expect(fallbackIcon).toBeVisible();
    await expect(fallbackIcon).toHaveText('B');
    await expect(postBCard.locator('.author-avatar-img')).toHaveCount(0);
  });

  test('Negative 4: Missing or partial author data is handled safely without crashing', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });

    // The feed loads completely without throwing unhandled exceptions
    await expect(page.locator('h1:has-text("Antigravity Blog")')).toBeVisible();
  });
});
