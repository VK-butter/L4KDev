import { test, expect } from '@playwright/test';

test.describe('Authentication flow', () => {
  test('allows user admin to log in and reach dashboard shell', async ({
    page
  }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('Admin!123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/http:\/\/localhost:5173\/(\?.*)?$/);
    await page.waitForSelector('[data-testid="analytics-dashboard"]', {
      timeout: 10000
    });
    await expect(page.getByTestId('kpi-board')).toBeVisible();
    await expect(page.getByText(/Demo Admin/i)).toBeVisible();
  });

  test('rejects invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('wrong');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
