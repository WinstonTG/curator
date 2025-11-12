import { test, expect } from '@playwright/test';

test.describe('Metrics Dashboard', () => {
  test('should render dashboard with all KPI cards', async ({ page }) => {
    await page.goto('/metrics');

    // Wait for dashboard to load
    await expect(page.locator('h1')).toContainText('Curator MVP Metrics Dashboard');

    // Verify all 4 primary KPI cards are present
    await expect(page.getByText('Match Discovery Rate')).toBeVisible();
    await expect(page.getByText('Engagement (Save)')).toBeVisible();
    await expect(page.getByText('Time to Action')).toBeVisible();
    await expect(page.getByText('Completion Rate')).toBeVisible();
  });

  test('should display metric values with correct units', async ({ page }) => {
    await page.goto('/metrics');

    // Check that metrics have proper unit displays
    await expect(page.getByText('MD/day')).toBeVisible();
    await expect(page.getByText('%', { exact: false })).toHaveCount(2); // Save % and Completion %
    await expect(page.getByText('sec')).toBeVisible();
  });

  test('should render all 4 charts', async ({ page }) => {
    await page.goto('/metrics');

    // Wait for charts to render
    await page.waitForTimeout(1000); // Give recharts time to render

    // Verify chart sections
    await expect(page.getByText('Match Discovery Rate (30 days)')).toBeVisible();
    await expect(page.getByText('Engagement Conversion (30 days)')).toBeVisible();
    await expect(page.getByText('Time to Action (30 days)')).toBeVisible();
    await expect(page.getByText('Completion & Error Rates (30 days)')).toBeVisible();
  });

  test('should display system status section', async ({ page }) => {
    await page.goto('/metrics');

    // Verify system status
    await expect(page.getByText('System Status')).toBeVisible();
    await expect(page.getByText('Error Rate')).toBeVisible();
    await expect(page.getByText('Data Freshness')).toBeVisible();
    await expect(page.getByText('Coverage')).toBeVisible();
  });

  test('should show targets for each metric', async ({ page }) => {
    await page.goto('/metrics');

    // Verify targets are displayed
    await expect(page.getByText('Target: ≥3.0 MD/day')).toBeVisible();
    await expect(page.getByText('Target: 15 %')).toBeVisible();
    await expect(page.getByText('Target: <120 sec')).toBeVisible();
    await expect(page.getByText('Target: >60 %')).toBeVisible();
  });

  test('should have links to documentation', async ({ page }) => {
    await page.goto('/metrics');

    // Check footer links
    await expect(page.getByRole('link', { name: /View MVP Scope/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Metrics Dictionary/i })).toBeVisible();
  });

  test('should show synthetic data disclaimer', async ({ page }) => {
    await page.goto('/metrics');

    await expect(page.getByText(/synthetic data generator/i)).toBeVisible();
  });
});
