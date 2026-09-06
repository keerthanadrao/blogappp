import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: ['reader@example.com', 'admin@example.com', 'duplicate@example.com'] } } });
});

test('Issue #3 Positive Test: Reader registers successfully', async ({ request }) => {
  const response = await request.post('http://127.0.0.1:3000/api/auth/register', {
    data: { email: 'reader@example.com', password: 'password123', name: 'Reader User' }
  });
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data.success).toBe(true);
  expect(data.user.role).toBe('READER');
});

test('Issue #3 Positive Test: Admin registers successfully with correct secret', async ({ request }) => {
  const response = await request.post('http://127.0.0.1:3000/api/auth/admin-register', {
    data: { email: 'admin@example.com', password: 'adminpassword', name: 'Admin User', secretKey: 'default_admin_secret' }
  });
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data.success).toBe(true);
  expect(data.user.role).toBe('ADMIN');
});

test('Issue #3 Negative Test: Admin registration fails with incorrect secret', async ({ request }) => {
  const response = await request.post('http://127.0.0.1:3000/api/auth/admin-register', {
    data: { email: 'fakeadmin@example.com', password: 'password123', secretKey: 'wrong_secret' }
  });
  expect(response.status()).toBe(403);
});

test('Issue #3 Negative Test: Duplicate email registration fails', async ({ request }) => {
  await request.post('http://127.0.0.1:3000/api/auth/register', {
    data: { email: 'duplicate@example.com', password: 'password123' }
  });
  
  const response = await request.post('http://127.0.0.1:3000/api/auth/register', {
    data: { email: 'duplicate@example.com', password: 'password123' }
  });
  
  expect(response.status()).toBe(409);
});
