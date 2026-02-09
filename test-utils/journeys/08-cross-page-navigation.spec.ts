/**
 * Journey 8: Cross-Page Navigation Integrity
 *
 * Tests that all routes render without crashing and that
 * the browser history back/forward works correctly.
 *
 * Pipeline coverage: All navigation pipelines
 * This tests the "B-tier" (navigation) buttons from the button audit.
 */
import { test, expect } from '@playwright/test';

const ALL_ROUTES = [
  { path: '/', name: 'Home' },
  { path: '/franchise/select', name: 'FranchiseSelector' },
  { path: '/franchise/setup', name: 'FranchiseSetup' },
  { path: '/exhibition', name: 'Exhibition' },
  { path: '/world-series', name: 'WorldSeries' },
  { path: '/league-builder', name: 'LeagueBuilder' },
  { path: '/league-builder/leagues', name: 'LB-Leagues' },
  { path: '/league-builder/teams', name: 'LB-Teams' },
  { path: '/league-builder/players', name: 'LB-Players' },
  { path: '/league-builder/rosters', name: 'LB-Rosters' },
  { path: '/league-builder/draft', name: 'LB-Draft' },
  { path: '/league-builder/rules', name: 'LB-Rules' },
];

test.describe('Journey 8: Cross-Page Navigation', () => {
  test('8a: All routes render without crash', async ({ page }) => {
    const results: { route: string; name: string; rendered: boolean; error: string | null }[] = [];

    for (const route of ALL_ROUTES) {
      await page.goto(route.path);
      await page.waitForTimeout(800);

      // Check for React error overlay
      const hasError = await page.locator('[class*="error"], [class*="Error"]').first()
        .isVisible({ timeout: 500 }).catch(() => false);

      // Check #root has content
      const rootContent = await page.locator('#root').textContent().catch(() => '');
      const rendered = !!rootContent && rootContent.trim().length > 10;

      // Check for 404
      const is404 = rootContent?.includes('not found') || rootContent?.includes('404');

      results.push({
        route: route.path,
        name: route.name,
        rendered: rendered && !is404,
        error: hasError ? 'React error overlay visible' : is404 ? '404 page' : null,
      });

      await page.screenshot({ path: `test-utils/screenshots/j8-${route.name}.png` });
    }

    console.log('Route rendering results:');
    for (const r of results) {
      console.log(`  ${r.rendered ? 'PASS' : 'FAIL'} ${r.route} (${r.name})${r.error ? ` — ${r.error}` : ''}`);
    }

    // All routes should render
    const failedRoutes = results.filter(r => !r.rendered);
    expect(failedRoutes.length).toBe(0);
  });

  test('8b: Browser back navigation works after Home → League Builder', async ({ page }) => {
    // Home
    await page.goto('/');
    await page.waitForTimeout(1000);

    // League Builder (via link click, adds to browser history)
    await page.locator('text=LEAGUE BUILDER').click();
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/league-builder');

    // Go back to home
    await page.goBack();
    await page.waitForTimeout(1000);

    // Should be on home
    // Note: The League Builder page may use navigate() which could replace history entries.
    // The test validates that goBack works for at least one level.
    const url = page.url();
    const isHome = url === 'http://localhost:5173/' || url === 'http://localhost:5173';
    expect(isHome).toBeTruthy();
  });

  test('8c: 404 page renders for unknown routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await page.waitForTimeout(1000);

    const root = page.locator('#root');
    await expect(root).not.toBeEmpty();

    await page.screenshot({ path: 'test-utils/screenshots/j8-404.png' });
  });
});
