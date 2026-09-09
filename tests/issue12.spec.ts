import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.describe('Issue #12: Social Authentication Options (Google, LinkedIn, GitHub) on Signup', () => {
  const timestamp = Date.now();
  const emailUser = `social_issue12_reader_${timestamp}@example.com`;
  const testPassword = 'Password123!';

  test.beforeAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: { in: [emailUser] },
      },
    });
  });

  test.afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: { in: [emailUser] },
      },
    });
  });

  // --------------------------------------------------------------------------
  // POSITIVE TESTS
  // --------------------------------------------------------------------------

  test('Positive Test 1: Signup page displays Google, LinkedIn, and GitHub social options', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/signup', { waitUntil: 'domcontentloaded' });

    // Verify all 3 social buttons are rendered with appropriate labels and accessible roles
    const googleBtn = page.locator('#social-google-btn');
    const linkedinBtn = page.locator('#social-linkedin-btn');
    const githubBtn = page.locator('#social-github-btn');

    await expect(googleBtn).toBeVisible();
    await expect(googleBtn).toContainText('Continue with Google');

    await expect(linkedinBtn).toBeVisible();
    await expect(linkedinBtn).toContainText('Continue with LinkedIn');

    await expect(githubBtn).toBeVisible();
    await expect(githubBtn).toContainText('Continue with GitHub');

    // Verify divider
    await expect(page.locator('text=or continue with email')).toBeVisible();
  });

  test('Positive Test 2: Clicking "Continue with Google" triggers Google OAuth flow', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/signup', { waitUntil: 'domcontentloaded' });

    const googleBtn = page.locator('#social-google-btn');
    await expect(googleBtn).toBeVisible();

    // Trigger Google OAuth button
    await googleBtn.click();

    // Verify redirection towards NextAuth Google auth endpoint or external provider
    await page.waitForURL((url) => 
      url.href.includes('/api/auth/signin/google') || 
      url.href.includes('accounts.google.com') ||
      url.href.includes('/api/auth/signin'), 
      { timeout: 10000 }
    );
  });

  test('Positive Test 3: Clicking "Continue with LinkedIn" triggers LinkedIn OAuth flow', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/signup', { waitUntil: 'domcontentloaded' });

    const linkedinBtn = page.locator('#social-linkedin-btn');
    await expect(linkedinBtn).toBeVisible();

    // Trigger LinkedIn OAuth button
    await linkedinBtn.click();

    // Verify redirection towards NextAuth LinkedIn auth endpoint or external provider
    await page.waitForURL((url) => 
      url.href.includes('/api/auth/signin/linkedin') || 
      url.href.includes('linkedin.com') ||
      url.href.includes('/api/auth/signin'), 
      { timeout: 10000 }
    );
  });

  test('Positive Test 4: Clicking "Continue with GitHub" triggers GitHub OAuth flow', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/signup', { waitUntil: 'domcontentloaded' });

    const githubBtn = page.locator('#social-github-btn');
    await expect(githubBtn).toBeVisible();

    // Trigger GitHub OAuth button
    await githubBtn.click();

    // Verify redirection towards NextAuth GitHub auth endpoint or external provider
    await page.waitForURL((url) => 
      url.href.includes('/api/auth/signin/github') || 
      url.href.includes('github.com/login') ||
      url.href.includes('/api/auth/signin'), 
      { timeout: 10000 }
    );
  });

  test('Positive Test 5: Existing email-based signup continues to work seamlessly', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/signup', { waitUntil: 'domcontentloaded' });

    // Fill registration form
    await page.fill('#name', 'Social Integration Tester');
    await page.fill('#email', emailUser);
    await page.fill('#password', testPassword);

    // Submit form
    await page.click('button[type="submit"]');

    // Verify Success modal pops up
    const successModal = page.locator('#auth-success-modal');
    await expect(successModal).toBeVisible();
    await expect(page.locator('#auth-success-title')).toContainText('Account Created');

    // Verify automatic redirect to login
    await page.waitForURL('**/login', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Welcome Back');
  });

  // --------------------------------------------------------------------------
  // NEGATIVE TESTS
  // --------------------------------------------------------------------------

  test('Negative Test 1: Cancelled OAuth / AccessDenied shows clear error banner and suppresses popup', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/signup?error=AccessDenied', { waitUntil: 'domcontentloaded' });

    // Verify error banner is visible with appropriate message
    const errorBanner = page.locator('#signup-error-banner');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('Authentication was cancelled or access was denied');

    // Verify success modal is NOT shown
    await expect(page.locator('#auth-success-modal')).not.toBeVisible();
  });

  test('Negative Test 2: Social provider error shows informative banner and suppresses popup', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/signup?error=OAuthCallback', { waitUntil: 'domcontentloaded' });

    const errorBanner = page.locator('#signup-error-banner');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('Social sign-in was cancelled or encountered a provider error');

    await expect(page.locator('#auth-success-modal')).not.toBeVisible();
  });

  test('Negative Test 3: Account linking error shows descriptive banner', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/signup?error=OAuthAccountNotLinked', { waitUntil: 'domcontentloaded' });

    const errorBanner = page.locator('#signup-error-banner');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('already associated with another login provider');
  });
});
