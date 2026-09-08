import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

test.describe('Issue #11: Auth Success Popups and Automatic Redirection', () => {
  const timestamp = Date.now();
  const testUserEmail = `issue11_reader_${timestamp}@example.com`;
  const existingUserEmail = `issue11_existing_${timestamp}@example.com`;
  const testPassword = 'Password123!';

  test.beforeAll(async () => {
    // Clean up and pre-seed an existing user for negative tests
    await prisma.user.deleteMany({
      where: {
        email: { in: [testUserEmail, existingUserEmail] },
      },
    });

    const hashedPassword = await bcrypt.hash(testPassword, 10);
    await prisma.user.create({
      data: {
        email: existingUserEmail,
        name: 'Existing Test User',
        password_hash: hashedPassword,
        role: 'READER',
      },
    });
  });

  test.afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: { in: [testUserEmail, existingUserEmail] },
      },
    });
  });

  // --------------------------------------------------------------------------
  // POSITIVE TESTS
  // --------------------------------------------------------------------------

  test('Positive Test 1: Successful Signup displays success popup and immediately opens Login page', async ({ page }) => {
    // 1. Open Signup page
    await page.goto('http://127.0.0.1:3000/signup', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText('Create Account');

    // 2. Enter valid registration details
    await page.fill('#name', 'New Sprint User');
    await page.fill('#email', testUserEmail);
    await page.fill('#password', testPassword);

    // 3. Click Signup
    await page.click('button:has-text("Sign Up")');

    // Verify Success popup is displayed
    const successModal = page.locator('#auth-success-modal');
    await expect(successModal).toBeVisible();
    await expect(page.locator('#auth-success-title')).toContainText('Account Created');
    await expect(page.locator('#auth-success-message')).toContainText('Welcome to Antigravity Blog');

    // Verify Login page opens automatically
    await page.waitForURL('**/login', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Welcome Back');
  });

  test('Positive Test 2 & 3: Successful Login displays "Successfully logged in" popup and redirects to Home page', async ({ page }) => {
    // 1. Open Login page
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText('Welcome Back');

    // 2. Enter valid login credentials
    await page.fill('#email', existingUserEmail);
    await page.fill('#password', testPassword);

    // 3. Click Login
    await page.click('button:has-text("Sign In")');

    // Verify "Successfully logged in" success popup is displayed
    const successModal = page.locator('#auth-success-modal');
    await expect(successModal).toBeVisible();
    await expect(page.locator('#auth-success-title')).toContainText('Successfully Logged In');

    // Verify automatic redirect to Home page
    await page.waitForURL('http://127.0.0.1:3000/', { timeout: 10000 });
    await expect(page.locator('text=Existing Test User')).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // NEGATIVE TESTS
  // --------------------------------------------------------------------------

  test('Negative Test 1: Signup with already registered email displays error and suppresses popup', async ({ page }) => {
    // 1. Open Signup page
    await page.goto('http://127.0.0.1:3000/signup', { waitUntil: 'domcontentloaded' });

    // 2. Enter already registered email
    await page.fill('#name', 'Duplicate User');
    await page.fill('#email', existingUserEmail);
    await page.fill('#password', testPassword);

    // 3. Click Signup
    await page.click('button:has-text("Sign Up")');

    // Verify appropriate error message is displayed
    await expect(page.locator('text=User already exists')).toBeVisible();

    // Verify success popup is NOT displayed and user remains on Signup page
    await expect(page.locator('#auth-success-modal')).not.toBeVisible();
    expect(page.url()).toContain('/signup');
  });

  test('Negative Test 2: Signup with invalid or missing details displays validation error', async ({ page }) => {
    // 1. Open Signup page
    await page.goto('http://127.0.0.1:3000/signup', { waitUntil: 'domcontentloaded' });

    // Disable HTML5 form validation to test backend/custom validation
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) form.noValidate = true;
    });

    // 2. Enter incomplete details (missing email)
    await page.fill('#name', 'Incomplete User');
    await page.fill('#email', '');
    await page.fill('#password', '123');

    // 3. Click Signup
    await page.click('button:has-text("Sign Up")');

    // Verify validation error or required field stop
    await expect(page.locator('#auth-success-modal')).not.toBeVisible();
    expect(page.url()).toContain('/signup');
  });

  test('Negative Test 3: Login with incorrect password displays error and suppresses popup', async ({ page }) => {
    // 1. Open Login page
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded' });

    // 2. Enter valid email with incorrect password
    await page.fill('#email', existingUserEmail);
    await page.fill('#password', 'WrongPassword999!');

    // 3. Click Login
    await page.click('button:has-text("Sign In")');

    // Verify error message is displayed
    await expect(page.locator('text=Invalid email or password')).toBeVisible();

    // Verify success popup is NOT displayed and user remains on Login page
    await expect(page.locator('#auth-success-modal')).not.toBeVisible();
    expect(page.url()).toContain('/login');
  });

  test('Negative Test 4: Login with unregistered email displays error and suppresses popup', async ({ page }) => {
    // 1. Open Login page
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded' });

    // 2. Enter unregistered email
    await page.fill('#email', 'ghost_unregistered_email@example.com');
    await page.fill('#password', 'SomePassword123!');

    // 3. Click Login
    await page.click('button:has-text("Sign In")');

    // Verify error message is displayed
    await expect(page.locator('text=Invalid email or password')).toBeVisible();

    // Verify success popup is NOT displayed and user remains on Login page
    await expect(page.locator('#auth-success-modal')).not.toBeVisible();
    expect(page.url()).toContain('/login');
  });
});
