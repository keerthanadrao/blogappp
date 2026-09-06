import { test, expect } from '@playwright/test';

test('Issue #1 Positive Test: Database and Next.js are initialized properly', async ({ request }) => {
  // We hit the health endpoint to verify Prisma can connect to SQLite
  const response = await request.get('http://127.0.0.1:3000/api/health');
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  
  // Verify expected data structure
  expect(data.status).toBe('ok');
  expect(data.db).toBe('connected');
  expect(typeof data.userCount).toBe('number');
});

test('Issue #1 Negative Test: Invalid route returns 404', async ({ request }) => {
  // A negative test verifying that invalid routes are properly handled by Next.js
  const response = await request.get('http://127.0.0.1:3000/api/invalid-route');
  expect(response.status()).toBe(404);
});
