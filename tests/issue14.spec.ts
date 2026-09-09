import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

test.describe('Issue #14: User Profile Page (Name, Image, Posts, Comments, Camera/Gallery Upload)', () => {
  const user1Email = `profile_active_${Date.now()}@example.com`;
  const user2Email = `profile_empty_${Date.now()}@example.com`;
  const password = 'ProfilePassword123!';

  let user1: any;
  let user2: any;
  let testCategory: any;
  let post1: any;
  let post2: any;

  const user1Name = 'Alice Profile Tester';
  const user2Name = 'Bob Empty Tester';
  const user1AvatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
  const post1Title = 'Alice Masterclass on Modern Web Performance';
  const post2Title = 'Alice Guide to Server-Driven UI';
  const bobPostTitle = 'Bob Private Draft Note';
  const user1CommentText = 'Incredible architecture pattern! Highly recommended.';

  test.beforeAll(async () => {
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Create User 1 (Active User with image, posts, and comments)
    user1 = await prisma.user.create({
      data: {
        email: user1Email,
        name: user1Name,
        password_hash: hashedPassword,
        role: 'READER',
        image: user1AvatarUrl,
        bio: 'Senior Frontend Architect & Open Source Enthusiast',
      },
    });

    // 2. Create User 2 (Empty User with no published posts, no comments)
    user2 = await prisma.user.create({
      data: {
        email: user2Email,
        name: user2Name,
        password_hash: hashedPassword,
        role: 'READER',
      },
    });

    // 3. Create Category
    testCategory = await prisma.category.upsert({
      where: { name: 'ProfileDev' },
      update: {},
      create: { name: 'ProfileDev' },
    });

    // 4. Create Posts for User 1
    post1 = await prisma.post.create({
      data: {
        title: post1Title,
        body: 'Optimizing web applications for blazing fast performance and low latency.',
        tags: 'performance, webdev',
        status: 'PUBLISHED',
        authorId: user1.id,
        categoryId: testCategory.id,
      },
    });

    post2 = await prisma.post.create({
      data: {
        title: post2Title,
        body: 'Exploring next generation server components and edge rendering pipelines.',
        tags: 'nextjs, react',
        status: 'PUBLISHED',
        authorId: user1.id,
        categoryId: testCategory.id,
      },
    });

    // Create a draft post for Bob (User 2) so he has 0 published posts
    await prisma.post.create({
      data: {
        title: bobPostTitle,
        body: 'Draft note not yet published.',
        status: 'DRAFT',
        authorId: user2.id,
        categoryId: testCategory.id,
      },
    });

    // 5. Create Comments
    // User 1 comments on post 1
    await prisma.comment.create({
      data: {
        content: user1CommentText,
        postId: post1.id,
        authorId: user1.id,
      },
    });
  });

  // --------------------------------------------------------------------------
  // 🟩 POSITIVE TEST CASES
  // --------------------------------------------------------------------------

  test('Positive 1 & 2: View user profile and verify user name and details', async ({ page }) => {
    // 1. Log in as User 1
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded' });
    await page.fill('#email', user1Email);
    await page.fill('#password', password);
    await page.click('button:has-text("Sign In")');

    // Wait for redirect to home
    await page.waitForURL('http://127.0.0.1:3000/', { timeout: 15000 });
    await expect(page.locator('#nav-profile-link')).toBeVisible({ timeout: 10000 });

    // Click Profile link in nav
    await page.click('#nav-profile-link');

    // Verify User Profile page opened
    await page.waitForURL('**/profile', { timeout: 15000 });
    await expect(page.locator('#profile-name')).toHaveText(user1Name);
    await expect(page.locator('#profile-email')).toHaveText(user1Email);
    await expect(page.locator('#profile-joined-date')).toBeVisible();
    await expect(page.locator('#profile-bio')).toHaveText('Senior Frontend Architect & Open Source Enthusiast');
  });

  test('Positive 3: Display user profile image correctly', async ({ page }) => {
    // View User 1's public profile directly by ID
    await page.goto(`http://127.0.0.1:3000/profile/${user1.id}`, { waitUntil: 'domcontentloaded' });

    // Verify avatar section has image rendered with correct URL
    const avatarImg = page.locator('#profile-avatar img');
    await expect(avatarImg).toBeVisible();
    await expect(avatarImg).toHaveAttribute('src', user1AvatarUrl);
  });

  test('Positive 4: Display user published posts and verify post isolation', async ({ page }) => {
    await page.goto(`http://127.0.0.1:3000/profile/${user1.id}`, { waitUntil: 'domcontentloaded' });

    // Verify posts section contains Alice's published posts
    const postsSection = page.locator('#profile-posts-section');
    await expect(postsSection).toBeVisible();
    await expect(page.locator(`text=${post1Title}`)).toBeVisible();
    await expect(page.locator(`text=${post2Title}`)).toBeVisible();

    // Bob's post or draft should NOT be visible
    await expect(page.locator(`text=${bobPostTitle}`)).not.toBeVisible();
  });

  test('Positive 5: Display user comments on profile', async ({ page }) => {
    await page.goto(`http://127.0.0.1:3000/profile/${user1.id}`, { waitUntil: 'domcontentloaded' });

    // Click on Comments tab
    const commentsTab = page.locator('#tab-comments');
    await expect(commentsTab).toBeVisible();
    await commentsTab.click();

    // Verify Alice's comment is visible with post reference
    const commentsSection = page.locator('#profile-comments-section');
    await expect(commentsSection).toBeVisible();
    await expect(page.locator(`text=${user1CommentText}`)).toBeVisible();
    await expect(page.locator(`text=Commented on: ${post1Title}`)).toBeVisible();
  });

  test('Positive 6: Clicking avatar icon opens Photo options with Camera and Gallery/Folder buttons', async ({ page }) => {
    // 1. Log in as User 1
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded' });
    await page.fill('#email', user1Email);
    await page.fill('#password', password);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('http://127.0.0.1:3000/', { timeout: 15000 });

    // 2. Open Profile
    await page.goto('http://127.0.0.1:3000/profile', { waitUntil: 'domcontentloaded' });

    // 3. Click avatar or camera edit button
    const changeAvatarBtn = page.locator('#change-avatar-btn');
    await expect(changeAvatarBtn).toBeVisible();
    await changeAvatarBtn.click();

    // 4. Verify Photo picker modal appears with two prominent buttons
    const photoModal = page.locator('#photo-picker-modal');
    await expect(photoModal).toBeVisible();

    const cameraBtn = page.locator('#btn-camera-capture');
    await expect(cameraBtn).toBeVisible();
    await expect(cameraBtn).toContainText('Take Photo with Camera');

    const galleryBtn = page.locator('#btn-gallery-upload');
    await expect(galleryBtn).toBeVisible();
    await expect(galleryBtn).toContainText('Choose from Gallery / Folder');
  });

  test('Positive 7: Edit Profile form has no image URL text field and provides direct Camera/Gallery actions', async ({ page }) => {
    // 1. Log in as User 1
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded' });
    await page.fill('#email', user1Email);
    await page.fill('#password', password);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('http://127.0.0.1:3000/', { timeout: 15000 });

    // 2. Open Profile and click Edit Profile
    await page.goto('http://127.0.0.1:3000/profile', { waitUntil: 'domcontentloaded' });
    await page.locator('#edit-profile-btn').click();

    // 3. Verify Edit Form is open
    const editForm = page.locator('#edit-profile-form');
    await expect(editForm).toBeVisible();

    // 4. Verify Image URL input field is completely removed
    await expect(page.locator('#edit-image-input')).not.toBeVisible();

    // 5. Verify Camera and Gallery buttons are present in form
    await expect(page.locator('#form-camera-btn')).toBeVisible();
    await expect(page.locator('#form-gallery-btn')).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // ❌ NEGATIVE TEST CASES
  // --------------------------------------------------------------------------

  test('Negative 1: Access /profile without login redirects to /login', async ({ browser }) => {
    // Create an isolated fresh browser context (unauthenticated)
    const context = await browser.newContext();
    const freshPage = await context.newPage();

    await freshPage.goto('http://127.0.0.1:3000/profile', { waitUntil: 'domcontentloaded' });

    // Should be redirected to /login with callbackUrl
    await freshPage.waitForURL((url) => url.pathname === '/login');
    await expect(freshPage.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();

    await context.close();
  });

  test('Negative 2: User with no published posts displays "No posts found"', async ({ page }) => {
    // Open Bob's profile (who has no published posts)
    await page.goto(`http://127.0.0.1:3000/profile/${user2.id}`, { waitUntil: 'domcontentloaded' });

    // Verify Empty State for posts
    const noPosts = page.locator('#no-profile-posts');
    await expect(noPosts).toBeVisible();
    await expect(noPosts).toContainText('No posts found');

    // Make sure Alice's posts are NOT shown under Bob's profile
    await expect(page.locator(`text=${post1Title}`)).not.toBeVisible();
    await expect(page.locator(`text=${post2Title}`)).not.toBeVisible();
  });

  test('Negative 3: User with no comments displays "No comments found"', async ({ page }) => {
    // Open Bob's profile (who has no comments)
    await page.goto(`http://127.0.0.1:3000/profile/${user2.id}`, { waitUntil: 'domcontentloaded' });

    // Switch to comments tab
    await page.locator('#tab-comments').click();

    // Verify Empty State for comments
    const noComments = page.locator('#no-profile-comments');
    await expect(noComments).toBeVisible();
    await expect(noComments).toContainText('No comments found');

    // Make sure Alice's comments are NOT shown under Bob's profile
    await expect(page.locator(`text=${user1CommentText}`)).not.toBeVisible();
  });

  test('Negative 4: Invalid user profile ID displays "User not found" error state gracefully', async ({ page }) => {
    // Attempt to access an invalid non-existing user ID
    await page.goto('http://127.0.0.1:3000/profile/non-existent-user-cuid-99999', { waitUntil: 'domcontentloaded' });

    // Verify user-not-found container appears without application crash
    const notFoundCard = page.locator('#user-not-found');
    await expect(notFoundCard).toBeVisible();
    await expect(notFoundCard).toContainText('User not found');
  });
});
