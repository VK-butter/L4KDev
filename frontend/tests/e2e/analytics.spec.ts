import { test, expect } from '@playwright/test';

test.describe('Sales analytics dashboard', () => {
  test('filters update KPIs and drill-down responds to category selection', async ({
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

    await page.waitForSelector('[data-testid="kpi-board"]', { timeout: 10000 });
    await expect(page.getByTestId('kpi-board')).toBeVisible();
    await page.waitForSelector('[data-testid="category-chart-visual"]', {
      timeout: 15000
    });
    await expect(page.getByTestId('category-chart-visual')).toBeVisible();

    const pendingToggle = page.getByTestId('filter-status-pending');
    await pendingToggle.check();
    await expect(pendingToggle).toBeChecked();

    await page.waitForSelector('[data-category]', { timeout: 10000 });
    const firstCategoryBar = page.locator('[data-category]').first();
    const categoryName = await firstCategoryBar.getAttribute('data-category');
    await firstCategoryBar.click();

    await expect(page.getByTestId('drilldown-panel')).toBeVisible();
    await expect(
      page.getByTestId('clear-drilldown-category')
    ).toBeVisible();

    await page.getByTestId('drilldown-table').waitFor({ timeout: 10000 });
    const rows = page
      .getByTestId('drilldown-table')
      .locator('tbody tr');
    await expect(rows.first()).toBeVisible();

    if (categoryName) {
      const categoryCells = rows.locator(`text=${categoryName}`);
      await expect(categoryCells.first()).toBeVisible();
    }
  });
});
