import { test, expect } from '@playwright/test';

test.describe('Admin menu account management', () => {
  test('admin can add, edit, and deactivate an account', async ({ page }) => {
    const uniqueUser = `autotest+${Date.now()}@example.com`;
    const updatedName = `QA User ${Date.now()}`;

    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('Admin!123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/http:\/\/localhost:5173\/(\?.*)?$/);
    await page.waitForSelector('[data-testid="analytics-dashboard"]', {
      timeout: 10000
    });

    await page.getByTestId('admin-menu-button').click();
    await expect(page.getByTestId('admin-panel')).toBeVisible();

    await page.getByTestId('add-account-button').click();
    await expect(page.getByTestId('user-modal')).toBeVisible();

    await page.getByLabel(/Email/i).fill(uniqueUser);
    await page.getByLabel(/Display name/i).fill('QA Temp User');
    await page.getByLabel(/Role/i).selectOption('analyst');
    await page.getByLabel(/Temporary password/i).fill('TempPass!123');
    await page.getByTestId('user-modal-save').click();
    await expect(page.getByTestId('user-modal')).not.toBeVisible();

    const newRow = page.locator(
      `[data-testid="admin-user-row"][data-username="${uniqueUser}"]`
    );
    await expect(newRow).toBeVisible();

    await newRow.getByTestId('edit-user-button').click();
    await page.getByLabel(/Display name/i).fill(updatedName);
    await page.getByTestId('user-modal-save').click();
    await expect(
      newRow.getByText(updatedName, { exact: false })
    ).toBeVisible();

    await newRow.getByTestId('toggle-user-button').click();
    await expect(newRow.getByText(/inactive/i)).toBeVisible();
    await newRow.getByTestId('delete-user-button').click();
    await expect(newRow).toHaveCount(0);

    await page.getByRole('button', { name: /close/i }).click();
    await expect(page.getByTestId('admin-panel')).not.toBeVisible();
  });
});
