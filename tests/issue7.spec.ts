import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

test.describe('Issue #7: Nested Comment System', () => {
  let testPostId: string;
  const authorEmail = 'post_author_for_comments@example.com';
  const reader1Email = 'comment_reader1@example.com';
  const reader2Email = 'comment_reader2@example.com';
  const adminEmail = 'comment_admin@example.com';
  const password = 'Password123!';

  test.beforeAll(async () => {
    // Cleanup any existing test users and comments
    await prisma.comment.deleteMany();
    await prisma.post.deleteMany({
      where: { title: 'Post For Comment Testing' },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: [reader1Email, reader2Email, adminEmail, authorEmail] },
      },
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create users directly in DB
    const author = await prisma.user.create({
      data: {
        email: authorEmail,
        name: 'Author Person',
        password_hash: hashedPassword,
        role: 'READER',
      },
    });

    await prisma.user.create({
      data: {
        email: reader1Email,
        name: 'Reader One',
        password_hash: hashedPassword,
        role: 'READER',
      },
    });

    await prisma.user.create({
      data: {
        email: reader2Email,
        name: 'Reader Two',
        password_hash: hashedPassword,
        role: 'READER',
      },
    });

    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin Moderator',
        password_hash: hashedPassword,
        role: 'ADMIN',
      },
    });

    const category = await prisma.category.upsert({
      where: { name: 'Discussion' },
      update: {},
      create: { name: 'Discussion' },
    });

    const post = await prisma.post.create({
      data: {
        title: 'Post For Comment Testing',
        body: 'This post is used to test the nested comment and reply system.',
        status: 'PUBLISHED',
        authorId: author.id,
        categoryId: category.id,
      },
    });

    testPostId = post.id;
  });

  test.afterAll(async () => {
    // Cleanup
    await prisma.comment.deleteMany();
    await prisma.post.deleteMany({ where: { id: testPostId } });
    await prisma.user.deleteMany({
      where: {
        email: { in: [reader1Email, reader2Email, adminEmail, authorEmail] },
      },
    });
  });

  test('Anonymous visitor sees login prompt in comment section', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/');
    const postArticle = page.locator('article', { hasText: 'Post For Comment Testing' });
    await expect(postArticle).toBeVisible();

    const commentToggleBtn = postArticle.locator('button.comment-toggle-btn');
    await commentToggleBtn.click();

    // Verify login / signup prompt is shown
    await expect(postArticle.locator('a[href="/login"]')).toBeVisible();
    await expect(postArticle.locator('a[href="/signup"]')).toBeVisible();
  });

  test('Registered Reader can post comment, edit comment, receive nested reply, and delete', async ({ browser }) => {
    // Context 1: Reader 1
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    // Fetch CSRF token for login
    const csrfRes1 = await page1.request.get('http://127.0.0.1:3000/api/auth/csrf');
    const csrfData1 = await csrfRes1.json();

    await page1.request.post('http://127.0.0.1:3000/api/auth/callback/credentials', {
      form: {
        csrfToken: csrfData1.csrfToken,
        email: reader1Email,
        password,
        json: 'true',
      },
    });

    await page1.goto('http://127.0.0.1:3000/');
    const post1 = page1.locator('article', { hasText: 'Post For Comment Testing' });
    await post1.locator('button.comment-toggle-btn').click();

    // 1. Post a comment as Reader 1
    const commentInput = post1.locator('textarea[placeholder="Add to the discussion..."]');
    await expect(commentInput).toBeVisible();
    await commentInput.fill('Initial comment from Reader One');
    await post1.locator('button', { hasText: 'Comment' }).click();

    const commentItem = post1.locator('.comment-item').first();
    await expect(commentItem).toBeVisible();
    await expect(commentItem.locator('.comment-content')).toHaveText('Initial comment from Reader One');

    // 2. Edit the comment
    await commentItem.locator('button.edit-comment-btn').click();
    const editTextarea = commentItem.locator('textarea');
    await editTextarea.fill('Updated comment from Reader One');
    await commentItem.locator('button', { hasText: 'Save' }).click();
    await expect(commentItem.locator('.comment-content')).toHaveText('Updated comment from Reader One');

    // Context 2: Reader 2 replies to Reader 1's comment
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    const csrfRes2 = await page2.request.get('http://127.0.0.1:3000/api/auth/csrf');
    const csrfData2 = await csrfRes2.json();

    await page2.request.post('http://127.0.0.1:3000/api/auth/callback/credentials', {
      form: {
        csrfToken: csrfData2.csrfToken,
        email: reader2Email,
        password,
        json: 'true',
      },
    });

    await page2.goto('http://127.0.0.1:3000/');
    const post2 = page2.locator('article', { hasText: 'Post For Comment Testing' });
    await post2.locator('button.comment-toggle-btn').click();

    const reader1CommentOnPage2 = post2.locator('.comment-item').first();
    await expect(reader1CommentOnPage2).toBeVisible();

    // Reader 2 should not see edit/delete on Reader 1's comment
    await expect(reader1CommentOnPage2.locator('button.edit-comment-btn')).not.toBeVisible();
    await expect(reader1CommentOnPage2.locator('button.delete-comment-btn')).not.toBeVisible();

    // Reader 2 replies to Reader 1
    await reader1CommentOnPage2.locator('button.reply-btn').click();
    const replyInput = reader1CommentOnPage2.locator('input[placeholder*="Replying to"]');
    await replyInput.fill('Nested reply from Reader Two');
    await reader1CommentOnPage2.locator('button', { hasText: 'Send' }).click();

    // Verify nested reply is visible
    const nestedReply = post2.locator('.comment-item .comment-item').filter({ hasText: 'Nested reply from Reader Two' });
    await expect(nestedReply).toBeVisible();

    // Reader 2 can delete their own reply
    page2.on('dialog', (dialog) => dialog.accept());
    await nestedReply.locator('button.delete-comment-btn').click();
    await expect(nestedReply).not.toBeVisible();

    await context1.close();
    await context2.close();
  });

  test('Admin can delete any comment or reply', async ({ browser }) => {
    // Ensure test users exist in DB
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.upsert({
      where: { email: reader1Email },
      update: { role: 'READER' },
      create: { email: reader1Email, name: 'Reader One', password_hash: hashedPassword, role: 'READER' },
    });
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: 'ADMIN' },
      create: { email: adminEmail, name: 'Admin Person', password_hash: hashedPassword, role: 'ADMIN' },
    });

    // Create a comment as Reader 1
    const readerContext = await browser.newContext();
    const readerPage = await readerContext.newPage();

    const csrfRes1 = await readerPage.request.get('http://127.0.0.1:3000/api/auth/csrf');
    const csrfData1 = await csrfRes1.json();

    await readerPage.request.post('http://127.0.0.1:3000/api/auth/callback/credentials', {
      form: {
        csrfToken: csrfData1.csrfToken,
        email: reader1Email,
        password,
        json: 'true',
      },
    });

    await readerPage.goto('http://127.0.0.1:3000/');
    const postReader = readerPage.locator('article', { hasText: 'Post For Comment Testing' });
    await postReader.locator('button.comment-toggle-btn').click();

    const commentInput = postReader.locator('textarea[placeholder="Add to the discussion..."]');
    await commentInput.fill('Comment to be moderated by Admin');
    await postReader.locator('button', { hasText: 'Comment' }).click();
    await expect(postReader.locator('.comment-content', { hasText: 'Comment to be moderated by Admin' })).toBeVisible();

    await readerContext.close();

    // Login as Admin
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();

    const csrfResAdmin = await adminPage.request.get('http://127.0.0.1:3000/api/auth/csrf');
    const csrfDataAdmin = await csrfResAdmin.json();

    await adminPage.request.post('http://127.0.0.1:3000/api/auth/callback/credentials', {
      form: {
        csrfToken: csrfDataAdmin.csrfToken,
        email: adminEmail,
        password,
        json: 'true',
      },
    });

    await adminPage.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });
    await expect(adminPage.locator('button:has-text("Sign Out")')).toBeVisible({ timeout: 10000 });
    const postAdmin = adminPage.locator('article', { hasText: 'Post For Comment Testing' });
    await postAdmin.locator('button.comment-toggle-btn').click();

    const commentToModerate = postAdmin.locator('.comment-item', { hasText: 'Comment to be moderated by Admin' });
    await expect(commentToModerate).toBeVisible();

    // Admin sees delete button and can delete
    const adminDeleteBtn = commentToModerate.locator('button.delete-comment-btn');
    await expect(adminDeleteBtn).toBeVisible();

    adminPage.on('dialog', (dialog) => dialog.accept());
    await adminDeleteBtn.click();

    await expect(postAdmin.locator('.comment-item', { hasText: 'Comment to be moderated by Admin' })).not.toBeVisible();

    await adminContext.close();
  });
});
