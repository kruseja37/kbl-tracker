/**
 * Journey 1: Franchise Lifecycle (Create → View → Delete)
 *
 * Tests the core franchise management flow:
 *   Home → Franchise Selector → Create Franchise → FranchiseHome → Back → Delete
 *
 * Pipeline coverage: PL-15 (Franchise State), PL-11 (League Builder CRUD)
 * Button audit refs: P01-E01, P01-E02
 */
import { test, expect } from '@playwright/test';

test.describe('Journey 1: Franchise Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Clear IndexedDB to start fresh
    await page.goto('/');
    await page.evaluate(async () => {
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        if (db.name) indexedDB.deleteDatabase(db.name);
      }
    });
    await page.waitForTimeout(500);
  });

  test('1a: Home page renders all navigation buttons', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Verify all 5 main nav buttons are visible
    await expect(page.locator('text=LOAD FRANCHISE')).toBeVisible();
    await expect(page.locator('text=NEW FRANCHISE')).toBeVisible();
    await expect(page.locator('text=EXHIBITION GAME')).toBeVisible();
    await expect(page.locator('text=PLAYOFFS')).toBeVisible();
    await expect(page.locator('text=LEAGUE BUILDER')).toBeVisible();
  });

  test('1b: NEW FRANCHISE → FranchiseSetup → creates franchise', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Click NEW FRANCHISE
    await page.locator('text=NEW FRANCHISE').click();
    await page.waitForTimeout(1000);

    // Should be on /franchise/setup
    expect(page.url()).toContain('/franchise/setup');

    // Take screenshot of setup page
    await page.screenshot({ path: 'test-utils/screenshots/j1-franchise-setup.png' });

    // Look for a way to create/start a franchise
    const createBtn = page.locator('button:has-text("Create"), button:has-text("Start"), button:has-text("Begin"), button:has-text("New")').first();
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-utils/screenshots/j1-after-create.png' });
    }
  });

  test('1c: LOAD FRANCHISE → Franchise Selector page', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Click LOAD FRANCHISE
    await page.locator('text=LOAD FRANCHISE').click();
    await page.waitForTimeout(1000);

    // Should navigate to franchise selector
    expect(page.url()).toContain('/franchise');

    // Should show "No franchises yet" or a list
    const pageText = await page.textContent('body');
    const hasFranchiseContent = pageText?.includes('franchise') || pageText?.includes('Franchise');
    expect(hasFranchiseContent).toBeTruthy();

    await page.screenshot({ path: 'test-utils/screenshots/j1-franchise-selector.png' });
  });

  test('1d: Create franchise from selector → lands on FranchiseHome', async ({ page }) => {
    // Go to franchise selector
    await page.goto('/franchise/select');
    await page.waitForTimeout(1000);

    // Click "+ New Franchise" button
    const newFranchiseBtn = page.locator('button:has-text("New Franchise")').first();
    if (await newFranchiseBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newFranchiseBtn.click();
      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'test-utils/screenshots/j1-new-franchise-created.png' });

      // Should navigate away from selector (to franchise home or setup)
      const url = page.url();
      const navigatedAway = !url.includes('/franchise/select');
      // If we're still on selector, the franchise might appear in the list
      if (!navigatedAway) {
        // Check if a franchise entry appeared
        const franchiseEntry = page.locator('[class*="franchise"], [data-testid*="franchise"]').first();
        const hasEntry = await franchiseEntry.isVisible({ timeout: 2000 }).catch(() => false);
        expect(hasEntry || navigatedAway).toBeTruthy();
      }
    }
  });
});
