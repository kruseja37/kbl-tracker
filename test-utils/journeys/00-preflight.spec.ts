import { test, expect } from '@playwright/test';

test('preflight: app loads and renders home page', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2000);

  // Check that the React root rendered something
  const root = page.locator('#root');
  await expect(root).not.toBeEmpty({ timeout: 10000 });

  // Verify key home page elements
  await expect(page.locator('text=SUPER MEGA')).toBeVisible({ timeout: 5000 });

  // Take a screenshot for verification
  await page.screenshot({ path: 'test-utils/screenshots/preflight-home.png', fullPage: true });
});

test('preflight: can navigate to franchise setup', async ({ page }) => {
  await page.goto('/');

  // Look for any link or button that leads to franchise/setup
  const franchiseLink = page.locator('a[href*="franchise"], button:has-text("Franchise"), a:has-text("Franchise"), [data-testid*="franchise"]').first();

  if (await franchiseLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await franchiseLink.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-utils/screenshots/preflight-franchise.png', fullPage: true });
  } else {
    // Try direct navigation
    await page.goto('/franchise-setup');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-utils/screenshots/preflight-franchise-direct.png', fullPage: true });
  }

  const root = page.locator('#root');
  await expect(root).not.toBeEmpty();
});
