import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.describe('Issue #9: Forgot Password and OTP Verification Flow', () => {
    const adminEmail = `admin_recovery_${Date.now()}@example.com`;
    const userEmail = `reader_recovery_${Date.now()}@example.com`;
    const initialPassword = 'InitialPassword123!';
    const newAdminPassword = 'NewAdminPassword456!';
    const newUserPassword = 'NewReaderPassword456!';

    test.beforeAll(async ({ request }) => {
        // Clean up previous admin and register test Admin
        await prisma.user.deleteMany({ where: { role: 'ADMIN' } });
        const adminRes = await request.post('http://127.0.0.1:3000/api/auth/admin-register', {
            data: {
                email: adminEmail,
                password: initialPassword,
                name: 'Admin Recovery Tester',
                secretKey: 'default_admin_secret'
            }
        });
        expect(adminRes.ok()).toBeTruthy();

        // Register test Reader
        const userRes = await request.post('http://127.0.0.1:3000/api/auth/register', {
            data: {
                email: userEmail,
                password: initialPassword,
                name: 'Reader Recovery Tester'
            }
        });
        expect(userRes.ok()).toBeTruthy();
    });

    // ----------------------------------------------------
    // POSITIVE TESTS
    // ----------------------------------------------------

    test('Positive Test 1 & 2: Forgot Password link exists on Admin Login and User Login', async ({ page }) => {
        // 1. Check Admin Login
        await page.goto('http://127.0.0.1:3000/login?role=admin', { waitUntil: 'domcontentloaded' });
        const adminForgotLink = page.locator('a:has-text("Forgot Password?")');
        await expect(adminForgotLink).toBeVisible();
        await adminForgotLink.click();
        await page.waitForURL('**/forgot-password?role=admin');
        await expect(page.getByRole('heading', { name: 'Admin Password Recovery' })).toBeVisible();

        // 2. Check User Login
        await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded' });
        const userForgotLink = page.locator('a:has-text("Forgot Password?")');
        await expect(userForgotLink).toBeVisible();
        await userForgotLink.click();
        await page.waitForURL('**/forgot-password');
        await expect(page.getByRole('heading', { name: 'Reset Your Password' })).toBeVisible();
    });

    test('Positive Test 3: Registered Admin can request OTP and reset password', async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/forgot-password?role=admin', { waitUntil: 'domcontentloaded' });
        
        // Enter registered Admin email
        await page.fill('#recovery-email', adminEmail);
        await page.click('button:has-text("Send Verification OTP")');

        // Verify Step 2 opens with OTP input and success notice
        await expect(page.locator('text=OTP sent successfully')).toBeVisible();
        await expect(page.locator('#otp-input')).toBeVisible();

        // Fetch OTP from database
        const otpRecord = await prisma.passwordResetOtp.findFirst({
            where: { email: adminEmail, used: false },
            orderBy: { createdAt: 'desc' }
        });
        expect(otpRecord).toBeTruthy();
        const validOtp = otpRecord!.otp;

        // Enter OTP and new password
        await page.fill('#otp-input', validOtp);
        await page.fill('#new-password', newAdminPassword);
        await page.fill('#confirm-password', newAdminPassword);
        await page.click('button:has-text("Reset Password")');

        // Verify Step 3: Success state
        await expect(page.locator('text=Password Reset Complete!')).toBeVisible();
        await page.click('text=Proceed to Sign In');
        await page.waitForURL('**/login?role=admin');

        // Test logging in with the newly reset password
        await page.fill('#email', adminEmail);
        await page.fill('#password', newAdminPassword);
        await page.click('button:has-text("Enter Admin Dashboard")');
        await page.waitForURL('**/admin');
        await expect(page.getByRole('heading', { name: 'Admin Portal' })).toBeVisible();
    });

    test('Positive Test 4 & 5: Registered User can request OTP, verify, and login with new password', async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/forgot-password', { waitUntil: 'domcontentloaded' });

        // Enter registered User email
        await page.fill('#recovery-email', userEmail);
        await page.click('button:has-text("Send Verification OTP")');

        // Verify Step 2 is active
        await expect(page.locator('#otp-input')).toBeVisible();
        
        // Fetch OTP from database
        const otpRecord = await prisma.passwordResetOtp.findFirst({
            where: { email: userEmail, used: false },
            orderBy: { createdAt: 'desc' }
        });
        expect(otpRecord).toBeTruthy();
        const validOtp = otpRecord!.otp;

        // Enter valid OTP and new password
        await page.fill('#otp-input', validOtp);
        await page.fill('#new-password', newUserPassword);
        await page.fill('#confirm-password', newUserPassword);
        await page.click('button:has-text("Reset Password")');

        // Verify Success
        await expect(page.locator('text=Password Reset Complete!')).toBeVisible();
        await page.click('text=Proceed to Sign In');
        await page.waitForURL('**/login');

        // Login with new user password
        await page.fill('#email', userEmail);
        await page.fill('#password', newUserPassword);
        await page.click('button:has-text("Sign In")');
        await page.waitForURL('http://127.0.0.1:3000/');
        await expect(page.locator('text=Reader Recovery Tester')).toBeVisible();
    });

    // ----------------------------------------------------
    // NEGATIVE TESTS
    // ----------------------------------------------------

    test('Negative Test 1: Unregistered email does not receive OTP', async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/forgot-password', { waitUntil: 'domcontentloaded' });

        await page.fill('#recovery-email', 'unregistered_ghost_user@example.com');
        await page.click('button:has-text("Send Verification OTP")');

        // Verify error message is displayed and OTP step is not opened
        await expect(page.locator('text=No account found with this email address')).toBeVisible();
        await expect(page.locator('#otp-input')).not.toBeVisible();
    });

    test('Negative Test 2: Invalid email format triggers validation error', async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/forgot-password', { waitUntil: 'domcontentloaded' });

        // Disable native HTML5 validation so custom client validation runs
        await page.evaluate(() => {
            const form = document.querySelector('form');
            if (form) form.noValidate = true;
        });

        await page.fill('#recovery-email', 'invalid-email-no-domain');
        await page.click('button:has-text("Send Verification OTP")');

        await expect(page.locator('text=Please enter a valid email address format')).toBeVisible();
        await expect(page.locator('#otp-input')).not.toBeVisible();
    });

    test('Negative Test 3: Incorrect OTP fails verification and prevents password reset', async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/forgot-password', { waitUntil: 'domcontentloaded' });

        await page.fill('#recovery-email', userEmail);
        await page.click('button:has-text("Send Verification OTP")');
        await expect(page.locator('#otp-input')).toBeVisible();

        // Enter incorrect 6-digit OTP
        await page.fill('#otp-input', '000000');
        await page.fill('#new-password', 'SomeNewPassword123!');
        await page.fill('#confirm-password', 'SomeNewPassword123!');
        await page.click('button:has-text("Reset Password")');

        await expect(page.locator('text=Invalid or expired OTP')).toBeVisible();
        await expect(page.locator('text=Password Reset Complete!')).not.toBeVisible();
    });

    test('Negative Test 4: Submitting without email triggers required validation', async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/forgot-password', { waitUntil: 'domcontentloaded' });

        // Disable native HTML5 validation so custom client validation runs
        await page.evaluate(() => {
            const form = document.querySelector('form');
            if (form) form.noValidate = true;
        });

        await page.fill('#recovery-email', '');
        await page.click('button:has-text("Send Verification OTP")');

        await expect(page.locator('text=Email is required.')).toBeVisible();
        await expect(page.locator('#otp-input')).not.toBeVisible();
    });

    test('Negative Test 5: Submitting without OTP triggers required validation', async ({ page }) => {
        await page.goto('http://127.0.0.1:3000/forgot-password', { waitUntil: 'domcontentloaded' });

        await page.fill('#recovery-email', userEmail);
        await page.click('button:has-text("Send Verification OTP")');
        await expect(page.locator('#otp-input')).toBeVisible();

        // Disable native HTML5 validation on Step 2 form
        await page.evaluate(() => {
            const form = document.querySelector('form');
            if (form) form.noValidate = true;
        });

        await page.fill('#otp-input', '');
        await page.fill('#new-password', 'ValidPassword123!');
        await page.fill('#confirm-password', 'ValidPassword123!');
        await page.click('button:has-text("Reset Password")');

        await expect(page.locator('text=OTP is required.')).toBeVisible();
        await expect(page.locator('text=Password Reset Complete!')).not.toBeVisible();
    });
});
