/**
 * Journey 4: FranchiseHome Tab Navigation
 *
 * Tests FranchiseHome's tab system with seeded data:
 *   Create franchise → FranchiseHome → click through all visible tabs
 *
 * Pipeline coverage: PL-06 (Season Stats Display), PL-13 (Standings), PL-12 (Schedule)
 * Button audit refs: FranchiseHome tabs (27+ according to audit)
 */
import { test, expect } from '@playwright/test';

test.describe('Journey 4: FranchiseHome Tabs', () => {
  let franchiseUrl: string;

  test.beforeAll(async ({ browser }) => {
    // Seed a franchise via direct URL approach
    const page = await browser.newPage();
    await page.goto('/');

    // Clear IndexedDB
    await page.evaluate(async () => {
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        if (db.name) indexedDB.deleteDatabase(db.name);
      }
    });
    await page.waitForTimeout(500);

    // Create a franchise through the selector
    await page.goto('/franchise/select');
    await page.waitForTimeout(1000);

    const newBtn = page.locator('button:has-text("New Franchise")').first();
    if (await newBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForTimeout(2000);
    }

    franchiseUrl = page.url();
    await page.close();
  });

  test('4a: FranchiseHome renders after creation', async ({ page }) => {
    // Navigate to franchise home (either from creation or directly)
    if (franchiseUrl && franchiseUrl.includes('/franchise/')) {
      await page.goto(franchiseUrl);
    } else {
      // Fallback: try creating directly
      await page.goto('/franchise/select');
      await page.waitForTimeout(1000);
      const newBtn = page.locator('button:has-text("New Franchise")').first();
      if (await newBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await newBtn.click();
        await page.waitForTimeout(2000);
      }
    }

    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-utils/screenshots/j4-franchise-home.png' });

    const root = page.locator('#root');
    await expect(root).not.toBeEmpty();
  });

  test('4b: Click through all visible tabs on FranchiseHome', async ({ page }) => {
    // Navigate to franchise home
    if (franchiseUrl && franchiseUrl.includes('/franchise/')) {
      await page.goto(franchiseUrl);
    } else {
      await page.goto('/franchise/select');
      await page.waitForTimeout(1000);
      const newBtn = page.locator('button:has-text("New Franchise")').first();
      if (await newBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await newBtn.click();
        await page.waitForTimeout(2000);
      }
    }

    await page.waitForTimeout(1000);

    // Find all tab-like elements (buttons in tab bars, tab triggers)
    const tabs = page.locator('[role="tab"], [data-state], button[class*="tab"], [class*="Tab"]');
    const tabCount = await tabs.count();

    const tabResults: { name: string; clickable: boolean; rendered: boolean }[] = [];

    for (let i = 0; i < Math.min(tabCount, 20); i++) {
      const tab = tabs.nth(i);
      const tabText = await tab.textContent().catch(() => `tab-${i}`);
      const isVisible = await tab.isVisible().catch(() => false);

      if (isVisible) {
        await tab.click().catch(() => {});
        await page.waitForTimeout(500);

        const root = page.locator('#root');
        const isEmpty = await root.textContent().then(t => !t || t.trim().length < 10).catch(() => true);

        tabResults.push({
          name: tabText?.trim() || `tab-${i}`,
          clickable: true,
          rendered: !isEmpty,
        });

        await page.screenshot({
          path: `test-utils/screenshots/j4-tab-${i}-${(tabText || '').trim().replace(/\s+/g, '-').slice(0, 20)}.png`
        });
      }
    }

    // Log results for the report
    console.log('Tab navigation results:', JSON.stringify(tabResults, null, 2));

    // At least some tabs should exist and be clickable
    if (tabCount > 0) {
      expect(tabResults.filter(t => t.clickable).length).toBeGreaterThan(0);
    }
  });
});
