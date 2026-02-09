/**
 * Journey 5: Playoffs / World Series Page
 *
 * Tests the playoffs entry point:
 *   Home → World Series → verify page renders, check for bracket UI
 *
 * Pipeline coverage: PL-14 (Playoff System)
 * Button audit refs: P01-E04
 */
import { test, expect } from '@playwright/test';

test.describe('Journey 5: Playoffs / World Series', () => {
  test('5a: Navigate to World Series page from home', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    await page.locator('text=PLAYOFFS').click();
    await page.waitForTimeout(1000);

    expect(page.url()).toContain('/world-series');

    const root = page.locator('#root');
    await expect(root).not.toBeEmpty();

    await page.screenshot({ path: 'test-utils/screenshots/j5-world-series.png' });
  });

  test('5b: World Series page renders content (no crash)', async ({ page }) => {
    await page.goto('/world-series');
    await page.waitForTimeout(1000);

    const bodyText = await page.textContent('body');

    // Should have some playoff-related content or empty state
    const hasContent = bodyText!.length > 50;
    expect(hasContent).toBeTruthy();

    // Should not be a 404
    expect(bodyText).not.toContain('not found');

    await page.screenshot({ path: 'test-utils/screenshots/j5-world-series-content.png' });
  });

  test('5c: Direct navigation to world-series shows bracket or setup', async ({ page }) => {
    await page.goto('/world-series');
    await page.waitForTimeout(1000);

    // Check for playoff-related UI elements
    const bodyText = await page.textContent('body');
    // Screenshot shows: "PLAYOFF MODE", tabs: SETUP, BRACKET, LEADERS, HISTORY, SERIES
    // and QUICK START / SELECT LEAGUE sections
    const hasPlayoffUI = bodyText!.includes('PLAYOFF') ||
      bodyText!.includes('Playoff') ||
      bodyText!.includes('SETUP') ||
      bodyText!.includes('BRACKET') ||
      bodyText!.includes('SERIES') ||
      bodyText!.includes('QUICK START') ||
      bodyText!.includes('World Series');

    expect(hasPlayoffUI).toBeTruthy();

    await page.screenshot({ path: 'test-utils/screenshots/j5-playoff-ui.png' });
  });
});
