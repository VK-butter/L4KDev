import { test, expect } from '@playwright/test';

test.describe('Embedding module', () => {
  test('switches between Superset and NocoDB placeholders with retry', async ({
    page
  }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('analyst@example.com');
    await page.getByLabel(/password/i).fill('Analyst!123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/http:\/\/localhost:5173\/(\?.*)?$/);
    await page.waitForSelector('[data-testid="analytics-dashboard"]', {
      timeout: 10000
    });

    await page.getByText(/Embedding Playground/i).scrollIntoViewIfNeeded();

    const supersetTab = page.getByTestId('embed-tab-superset-main');
    const nocodbTab = page.getByTestId('embed-tab-nocodb-orders');

    await expect(supersetTab).toBeVisible();
    await expect(nocodbTab).toBeVisible();

    await supersetTab.click();
    await expect(page.getByTitle(/Superset Sales Overview/)).toBeVisible();

    await nocodbTab.click();
    await page.waitForSelector('[data-testid="embed-panel"]', {
      timeout: 10000
    });
    await expect(
      page.getByTestId('embed-panel').getByRole('heading', {
        name: 'NocoDB Order Tracker'
      })
    ).toBeVisible({ timeout: 10000 });
  });
});
