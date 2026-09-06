import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

test.beforeAll(async () => {
  // Setup a test user
  const password_hash = await bcrypt.hash('testpassword', 10);
  await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: { password_hash },
    create: {
      email: 'test@example.com',
      password_hash,
      role: 'READER',
      name: 'Test User'
    }
  });
});

test.afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: 'test@example.com' } });
});

test('Issue #2 Positive Test: User logs in with valid credentials', async ({ request }) => {
  // Fetch CSRF token
  const csrfRes = await request.get('http://127.0.0.1:3000/api/auth/csrf');
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;

  // Attempt login
  const loginRes = await request.post('http://127.0.0.1:3000/api/auth/callback/credentials', {
    form: {
      csrfToken,
      email: 'test@example.com',
      password: 'testpassword',
      json: 'true'
    }
  });

  expect(loginRes.ok()).toBeTruthy();
  const loginData = await loginRes.json();
  
  // NextAuth returns a URL on successful login when json is true
  expect(loginData.url).toBeDefined();

  // NextAuth automatically sets the session cookie on the context
  // Let's verify the session API returns our user data including the role
  const sessionRes = await request.get('http://127.0.0.1:3000/api/auth/session');
  const sessionData = await sessionRes.json();
  
  expect(sessionData.user.email).toBe('test@example.com');
  expect(sessionData.user.role).toBe('READER');
  expect(sessionData.user.id).toBeDefined();
});

test('Issue #2 Negative Test: Login fails with incorrect password', async ({ request }) => {
  const csrfRes = await request.get('http://127.0.0.1:3000/api/auth/csrf');
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;

  const loginRes = await request.post('http://127.0.0.1:3000/api/auth/callback/credentials', {
    form: {
      csrfToken,
      email: 'test@example.com',
      password: 'wrongpassword',
      json: 'true'
    }
  });
  
  // When 'json: true' is passed, a failed login returns a 401
  expect(loginRes.status()).toBe(401);
});
