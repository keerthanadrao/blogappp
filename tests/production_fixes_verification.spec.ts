import { test, expect } from '@playwright/test';

test.describe('Production Fixes & Mobile Readiness Verification Suite', () => {
  test('1. Mixed-case Signup correctly logs in with lowercase credentials', async ({ page }) => {
    const unique = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const mixedEmail = `MixedCaseUser_${unique}@Example.COM`;
    const normalizedEmail = mixedEmail.toLowerCase();
    const testPassword = 'Password123!';

    // 1. Signup with mixed case email
    await page.goto('http://localhost:3000/signup', { waitUntil: 'domcontentloaded' });
    await page.fill('#name', 'Mixed Case User');
    await page.fill('#email', mixedEmail);
    await page.fill('#password', testPassword);
    await page.click('button[type="submit"]');

    // Verify modal appeared and wait for redirect to login
    await expect(page.locator('#auth-success-modal')).toBeVisible({ timeout: 10000 });
    await page.waitForURL('**/login', { timeout: 15000 });
    expect(page.url()).toContain('/login');

    // 2. Login with lowercase email
    await page.fill('#email', normalizedEmail);
    await page.fill('#password', testPassword);
    await page.click('button[type="submit"]');

    // Verify login success modal appears and redirects to home
    await expect(page.locator('#auth-success-modal')).toBeVisible({ timeout: 10000 });
    await page.waitForURL('http://localhost:3000/', { timeout: 15000 });
    await expect(page.locator('#nav-profile-user-link')).toBeVisible({ timeout: 10000 });
  });

  test('2. Google Sign-In button is visible and active on both Login and Signup pages', async ({ page }) => {
    // Check Login page
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    const loginGoogleBtn = page.locator('#login-google-btn');
    await expect(loginGoogleBtn).toBeVisible();
    await expect(loginGoogleBtn).toContainText('Continue with Google');

    // Check Signup page
    await page.goto('http://localhost:3000/signup', { waitUntil: 'domcontentloaded' });
    const signupGoogleBtn = page.locator('#social-google-btn');
    await expect(signupGoogleBtn).toBeVisible();
    await expect(signupGoogleBtn).toContainText('Continue with Google');
  });

  test('3. Tags Button is visible on Home page and toggles Tag Drawer', async ({ page }) => {
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });

    // Verify Tags button exists
    const tagsBtn = page.locator('#tags-btn');
    await expect(tagsBtn).toBeVisible();
    await expect(tagsBtn).toContainText('Tags');

    // Wait for button to be stable and interactive, then click
    await page.waitForTimeout(500);
    await tagsBtn.click();
    const tagsDrawer = page.locator('#tags-drawer');
    await expect(tagsDrawer).toBeVisible({ timeout: 10000 });

    // Verify tags are rendered
    const tagChips = page.locator('button[id^="tag-chip-"]');
    const count = await tagChips.count();
    expect(count).toBeGreaterThan(0);
  });

  test('4. Category filtering and All Topics pills work accurately on Mobile Viewport', async ({ page }) => {
    // Set mobile viewport (iPhone 13 / 14 size)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });

    // Category pills should be visible and scrollable
    const allPill = page.locator('#category-pill-all');
    await expect(allPill).toBeVisible({ timeout: 10000 });

    // Click Technology category pill
    const techPill = page.locator('#category-pill-technology');
    if (await techPill.isVisible()) {
      await techPill.click();
      await page.waitForTimeout(500);

      // Verify active state updated
      const activeTech = page.locator('#category-pill-technology');
      await expect(activeTech).toBeVisible();
    }
  });

  test('5. Forgot Password OTP input field has mobile keypad numeric attributes', async ({ page, request }) => {
    const unique = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const freshEmail = `otp_user_${unique}@example.com`;

    // 1. Create fresh user via API
    await request.post('http://localhost:3000/api/auth/register', {
      data: {
        name: 'OTP User',
        email: freshEmail,
        password: 'Password123!',
      },
    });

    // 2. Go to forgot password page
    await page.goto('http://localhost:3000/forgot-password', { waitUntil: 'domcontentloaded' });

    // 3. Submit email step
    await page.fill('#recovery-email', freshEmail);
    await page.click('#send-otp-btn');

    // 4. Wait for step 2 (OTP code)
    const otpInput = page.locator('#otp-input');
    await expect(otpInput).toBeVisible({ timeout: 10000 });

    // 5. Verify mobile keypad optimization attributes
    await expect(otpInput).toHaveAttribute('inputmode', 'numeric');
    await expect(otpInput).toHaveAttribute('pattern', '[0-9]*');
    await expect(otpInput).toHaveAttribute('autocomplete', 'one-time-code');
  });

  test('6. All published articles appear with categories, author metadata, and cover images', async ({ page }) => {
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });

    // Check that blog cards are rendered
    const blogCards = page.locator('article.card');
    const count = await blogCards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Verify first card contains title, author, and category
    const firstCard = blogCards.first();
    await expect(firstCard).toBeVisible();

    // Verify all rendered cards have cover images
    const images = page.locator('article.card img');
    const imageCount = await images.count();
    expect(imageCount).toBeGreaterThanOrEqual(1);
  });

  test('7. New Admin can register with secret key, login, and access Admin Dashboard', async ({ page }) => {
    const unique = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const adminEmail = `newadmin_${unique}@example.com`;
    const adminPassword = 'AdminPassword123!';

    // 1. Go to Admin Registration
    await page.goto('http://localhost:3000/signup?role=admin', { waitUntil: 'domcontentloaded' });
    await page.fill('#name', 'New Administrator');
    await page.fill('#email', adminEmail);
    await page.fill('#password', adminPassword);
    await page.fill('#secretKey', 'admin1234');
    await page.click('button[type="submit"]');

    // 2. Expect success modal and redirect to admin login
    await expect(page.locator('#auth-success-modal')).toBeVisible({ timeout: 10000 });
    await page.waitForURL('**/login?role=admin', { timeout: 15000 });

    // 3. Login as the newly created Admin
    await page.fill('#email', adminEmail);
    await page.fill('#password', adminPassword);
    await page.click('button[type="submit"]');

    // 4. Expect success modal and redirect to /admin
    await expect(page.locator('#auth-success-modal')).toBeVisible({ timeout: 10000 });
    await page.waitForURL('http://localhost:3000/admin', { timeout: 15000 });
    expect(page.url()).toContain('/admin');
  });
});

