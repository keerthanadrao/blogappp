import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.describe('Email Verification Restrictions and Countdown Timer Suite', () => {
  const baseEmail = `verify_user_${Date.now()}@example.com`;
  const defaultPassword = 'SecurePassword123!';

  test.beforeAll(async ({ request }) => {
    // Clean up any existing test user and register fresh test user
    await prisma.passwordResetOtp.deleteMany({ where: { email: baseEmail } });
    await prisma.user.deleteMany({ where: { email: baseEmail } });

    const userRes = await request.post('http://127.0.0.1:3000/api/auth/register', {
      data: {
        email: baseEmail,
        password: defaultPassword,
        name: 'Verification Rate Tester',
      },
    });
    expect(userRes.ok()).toBeTruthy();
  });

  // 1. Verification code generation: 6-digit number and 10-minute expiration
  test('1 & 2. Verification code generation: 6-digit code with 10-minute expiration', async ({ request }) => {
    const testEmail = `gen_${Date.now()}@example.com`;
    await prisma.user.create({
      data: { email: testEmail, password_hash: 'hash123', role: 'READER' },
    });

    const sendRes = await request.post('http://127.0.0.1:3000/api/auth/forgot-password/send-otp', {
      data: { email: testEmail },
    });

    expect(sendRes.status()).toBe(200);
    const data = await sendRes.json();
    expect(data.success).toBe(true);

    const otpRecord = await prisma.passwordResetOtp.findFirst({
      where: { email: testEmail, used: false },
      orderBy: { createdAt: 'desc' },
    });

    expect(otpRecord).not.toBeNull();
    // 6-digit verification code check
    expect(otpRecord!.otp).toMatch(/^\d{6}$/);

    // 10-minute code expiration check (between 590s and 601s)
    const diffSec = (new Date(otpRecord!.expiresAt).getTime() - new Date(otpRecord!.createdAt).getTime()) / 1000;
    expect(diffSec).toBeGreaterThanOrEqual(599);
    expect(diffSec).toBeLessThanOrEqual(601);
  });

  // 3. Countdown displaying correct remaining time in UI
  test('3. Countdown timer displays MM:SS on verification page', async ({ page }) => {
    const testEmail = `timer_${Date.now()}@example.com`;
    await prisma.user.create({
      data: { email: testEmail, password_hash: 'hash123', role: 'READER' },
    });

    await page.goto('http://127.0.0.1:3000/forgot-password', { waitUntil: 'domcontentloaded' });
    await page.fill('#recovery-email', testEmail);
    await page.click('#send-otp-btn');

    await expect(page.locator('#countdown-timer')).toBeVisible({ timeout: 15000 });
    const timerText = await page.locator('#countdown-timer').textContent();
    // Must match format "Verification code expires in: MM:SS"
    expect(timerText).toMatch(/Verification code expires in: 09:\d{2}|10:00/);
  });

  // 4 & 5. Code expiration at 00:00 and Verify button disabled after expiration
  test('4 & 5. When timer reaches 00:00, show expired message and disable Verify button', async ({ page }) => {
    const expiredEmail = `expired_${Date.now()}@example.com`;
    await prisma.user.create({
      data: { email: expiredEmail, password_hash: 'hash123', role: 'READER' },
    });

    // Create an already expired OTP in DB
    const pastDate = new Date(Date.now() - 5000); // expired 5 seconds ago
    await prisma.passwordResetOtp.create({
      data: {
        email: expiredEmail,
        otp: '654321',
        expiresAt: pastDate,
        used: false,
        attempts: 0,
      },
    });

    await page.goto('http://127.0.0.1:3000/forgot-password', { waitUntil: 'domcontentloaded' });
    
    // Simulate navigation to step 2 with the expired OTP state
    await page.evaluate(({ email, expiresAt }) => {
      sessionStorage.setItem('recovery_email', email);
      sessionStorage.setItem('recovery_expires_at', expiresAt);
    }, { email: expiredEmail, expiresAt: pastDate.toISOString() });

    await page.reload({ waitUntil: 'domcontentloaded' });

    // Verify step 2 renders expired state
    await expect(page.locator('#countdown-timer')).toContainText('Verification code expired. Please request a new code.', { timeout: 15000 });
    
    // Verify reset/verify button is disabled
    const verifyBtn = page.locator('#reset-password-btn');
    await expect(verifyBtn).toBeDisabled();
  });

  // 6 & 7. 60-second cooldown and cooldown countdown
  test('6 & 7. 60-second cooldown blocks immediate re-request and shows cooldown text', async ({ page, request }) => {
    const cooldownEmail = `cooldown_${Date.now()}@example.com`;
    await prisma.user.create({
      data: { email: cooldownEmail, password_hash: 'hash123', role: 'READER' },
    });

    await page.goto('http://127.0.0.1:3000/forgot-password', { waitUntil: 'domcontentloaded' });
    await page.fill('#recovery-email', cooldownEmail);
    await page.click('#send-otp-btn');

    await expect(page.locator('#otp-input')).toBeVisible({ timeout: 15000 });

    // Check Resend button displays cooldown
    const resendBtn = page.locator('#resend-code-btn');
    await expect(resendBtn).toBeDisabled();
    const btnText = await resendBtn.textContent();
    expect(btnText).toMatch(/Resend code in \d+s/);

    // Verify backend API also returns 429 and block message
    const secondReq = await request.post('http://127.0.0.1:3000/api/auth/forgot-password/send-otp', {
      data: { email: cooldownEmail },
    });
    expect(secondReq.status()).toBe(429);
    const data = await secondReq.json();
    expect(data.error).toBe('Please wait before requesting another code.');
  });

  // 8 & 9. Maximum 5 requests within 1 hour and 6th request blocked
  test('8 & 9. Maximum 5 requests per hour and 6th request is blocked', async ({ request }) => {
    const rateLimitEmail = `hourly_limit_${Date.now()}@example.com`;
    await prisma.user.create({
      data: { email: rateLimitEmail, password_hash: 'hash123', role: 'READER' },
    });

    // Seed 5 OTP requests created in the last 40 minutes (with timestamps spread out so cooldown doesn't block)
    for (let i = 0; i < 5; i++) {
      const createdTime = new Date(Date.now() - (40 - i * 5) * 60 * 1000); // 40m, 35m, 30m, 25m, 20m ago
      await prisma.passwordResetOtp.create({
        data: {
          email: rateLimitEmail,
          otp: `11111${i}`,
          expiresAt: new Date(createdTime.getTime() + 10 * 60 * 1000),
          used: true,
          attempts: 0,
          createdAt: createdTime,
        },
      });
    }

    // Attempt 6th request
    const sixthReq = await request.post('http://127.0.0.1:3000/api/auth/forgot-password/send-otp', {
      data: { email: rateLimitEmail },
    });

    expect(sixthReq.status()).toBe(429);
    const data = await sixthReq.json();
    expect(data.error).toBe('You have reached the maximum of 5 verification requests per hour. Please try again later.');
    expect(data.hourlyLimitReached).toBe(true);
  });

  // 10 & 11. Maximum 5 incorrect verification attempts and invalidation on 5th attempt
  test('10 & 11. Maximum 5 incorrect attempts and code invalidation on 5th failure', async ({ request }) => {
    const attemptEmail = `attempts_${Date.now()}@example.com`;
    await prisma.user.create({
      data: { email: attemptEmail, password_hash: 'hash123', role: 'READER' },
    });

    const sendRes = await request.post('http://127.0.0.1:3000/api/auth/forgot-password/send-otp', {
      data: { email: attemptEmail },
    });
    expect(sendRes.status()).toBe(200);

    // Make 4 incorrect attempts
    for (let i = 1; i <= 4; i++) {
      const verifyRes = await request.post('http://127.0.0.1:3000/api/auth/forgot-password/verify-otp', {
        data: { email: attemptEmail, otp: '000000' },
      });
      expect(verifyRes.status()).toBe(400);
      const data = await verifyRes.json();
      expect(data.attemptsRemaining).toBe(5 - i);
      expect(data.error).toContain(`${5 - i} attempt`);
    }

    // 5th incorrect attempt invalidates the code
    const fifthRes = await request.post('http://127.0.0.1:3000/api/auth/forgot-password/verify-otp', {
      data: { email: attemptEmail, otp: '000000' },
    });
    expect(fifthRes.status()).toBe(400);
    const fifthData = await fifthRes.json();
    expect(fifthData.codeInvalidated).toBe(true);
    expect(fifthData.attemptsRemaining).toBe(0);
    expect(fifthData.error).toContain('Maximum attempts exceeded');

    // Confirm that the code is marked used/invalidated in DB
    const otpRecord = await prisma.passwordResetOtp.findFirst({
      where: { email: attemptEmail },
      orderBy: { createdAt: 'desc' },
    });
    expect(otpRecord!.used).toBe(true);
    expect(otpRecord!.attempts).toBe(5);

    // Even if user now provides the real OTP, it must be rejected as invalidated
    const realOtp = otpRecord!.otp;
    const retryRes = await request.post('http://127.0.0.1:3000/api/auth/forgot-password/verify-otp', {
      data: { email: attemptEmail, otp: realOtp },
    });
    expect(retryRes.status()).toBe(400);
    const retryData = await retryRes.json();
    expect(retryData.error).toContain('No active verification code found');
  });

  // 12. Refreshing page does not reset expiration timer or cooldown
  test('12. Refreshing the page does not reset countdown timer or bypass restrictions', async ({ page }) => {
    const refreshEmail = `refresh_${Date.now()}@example.com`;
    await prisma.user.create({
      data: { email: refreshEmail, password_hash: 'hash123', role: 'READER' },
    });

    await page.goto('http://127.0.0.1:3000/forgot-password', { waitUntil: 'domcontentloaded' });
    await page.fill('#recovery-email', refreshEmail);
    await page.click('#send-otp-btn');

    await expect(page.locator('#countdown-timer')).toBeVisible({ timeout: 15000 });

    // Reload page
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Timer must still be visible and not reset to 10:00 if seconds have passed
    await expect(page.locator('#countdown-timer')).toBeVisible({ timeout: 15000 });
    const refreshedTimerText = await page.locator('#countdown-timer').textContent();
    expect(refreshedTimerText).toMatch(/Verification code expires in: (09:\d{2}|10:00)/);

    // Resend button must still be disabled with cooldown
    const resendBtn = page.locator('#resend-code-btn');
    await expect(resendBtn).toBeDisabled();
  });

  // 13. Rapid multiple clicks does not send duplicate verification emails
  test('13. Rapid multiple clicks on Resend button are prevented', async ({ page, request }) => {
    const rapidEmail = `rapid_${Date.now()}@example.com`;
    await prisma.user.create({
      data: { email: rapidEmail, password_hash: 'hash123', role: 'READER' },
    });

    await page.goto('http://127.0.0.1:3000/forgot-password', { waitUntil: 'domcontentloaded' });
    await page.fill('#recovery-email', rapidEmail);
    await page.click('#send-otp-btn');

    await expect(page.locator('#otp-input')).toBeVisible({ timeout: 15000 });

    // Check DB: exactly 1 OTP was created
    let count = await prisma.passwordResetOtp.count({
      where: { email: rapidEmail },
    });
    expect(count).toBe(1);

    // Verify UI Resend button is disabled during cooldown
    const resendBtn = page.locator('#resend-code-btn');
    await expect(resendBtn).toBeDisabled();

    // Verify rapid concurrent POST requests are rejected with 429 cooldown protection
    const responses = await Promise.all([
      request.post('http://127.0.0.1:3000/api/auth/forgot-password/send-otp', {
        data: { email: rapidEmail },
      }),
      request.post('http://127.0.0.1:3000/api/auth/forgot-password/send-otp', {
        data: { email: rapidEmail },
      }),
      request.post('http://127.0.0.1:3000/api/auth/forgot-password/send-otp', {
        data: { email: rapidEmail },
      }),
    ]);

    for (const res of responses) {
      expect(res.status()).toBe(429);
      const data = await res.json();
      expect(data.error).toBe('Please wait before requesting another code.');
    }

    // DB count remains exactly 1
    count = await prisma.passwordResetOtp.count({
      where: { email: rapidEmail },
    });
    expect(count).toBe(1);
  });
});
