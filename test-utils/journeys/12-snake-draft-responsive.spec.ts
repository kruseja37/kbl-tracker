import { expect, test, type Locator, type Page } from '@playwright/test';

const cases = [
  { surface: 'main', viewport: { width: 1024, height: 768 } },
  { surface: 'main', viewport: { width: 768, height: 1024 } },
  { surface: 'companion', viewport: { width: 1024, height: 768 } },
  { surface: 'companion', viewport: { width: 768, height: 1024 } },
] as const;

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

async function expectTouchTargets(page: Page, expectHelp = true) {
  const controls = page.locator('[data-testid="snake-responsive-preview"] button:visible, [data-testid="snake-responsive-preview"] input:visible, [data-testid="snake-responsive-preview"] select:visible, [data-testid="snake-responsive-preview"] summary:visible');
  expect(await controls.count()).toBeGreaterThan(0);
  for (let index = 0; index < await controls.count(); index += 1) {
    const control = controls.nth(index);
    const box = await control.boundingBox();
    expect(box, `control ${index} must have a box`).not.toBeNull();
    expect(box!.height, `control ${index}: ${await control.getAttribute('aria-label') ?? await control.textContent()}`).toBeGreaterThanOrEqual(44);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual((await page.viewportSize())!.width);
  }
  const help = page.getByRole('button', { name: 'HELP' });
  if (expectHelp) {
    const helpBox = await help.boundingBox();
    expect(helpBox).not.toBeNull();
    expect(helpBox!.width).toBeGreaterThanOrEqual(44);
  }
}

async function expectActionInsideViewport(page: Page, action: Locator) {
  await action.scrollIntoViewIfNeeded();
  const box = await action.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
}

async function auditCurrentSurface(page: Page, expectHelp = true) {
  await expectNoHorizontalOverflow(page);
  await expectTouchTargets(page, expectHelp);
}

for (const entry of cases) {
  test(`${entry.surface} Snake surface at ${entry.viewport.width}x${entry.viewport.height}`, async ({ page }) => {
    await page.setViewportSize(entry.viewport);
    await page.goto(`/__preview/snake-responsive?surface=${entry.surface}`);
    await expect(page.getByTestId('snake-responsive-preview')).toHaveAttribute('data-surface', entry.surface);

    if (entry.surface === 'main') {
      await expect(page.getByTestId('private-draft-desk')).toHaveCount(0);
      await expect(page.getByTestId('selected-player-card')).toHaveCount(0);
      await auditCurrentSurface(page);
      await expectActionInsideViewport(page, page.getByRole('button', { name: 'HELP' }));
      await expectActionInsideViewport(page, page.getByRole('button', { name: 'REVEAL BEEWOLVES SEAT' }));

      await page.getByRole('button', { name: 'REVEAL BEEWOLVES SEAT' }).click();
      await expect(page.getByTestId('private-draft-desk')).toBeVisible();
      await expect(page.getByTestId('selected-player-card')).toBeVisible();
      await auditCurrentSurface(page);
      await expectActionInsideViewport(page, page.getByRole('button', { name: 'DRAFT PLAYER' }));
      await expectActionInsideViewport(page, page.getByRole('button', { name: 'COVER' }));

      await page.getByRole('button', { name: 'PLAYER POOL' }).click();
      await auditCurrentSurface(page);
      await page.getByRole('button', { name: 'Set rank for JOVITA PULO' }).click();
      const rankInput = page.getByRole('spinbutton', { name: 'Set rank for JOVITA PULO' });
      await expect(rankInput).toBeVisible();
      await expectActionInsideViewport(page, rankInput);
      expect((await rankInput.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await auditCurrentSurface(page);
      await page.getByRole('button', { name: 'TRADE PICKS' }).click();
      await auditCurrentSurface(page);
      await page.getByRole('button', { name: 'TRADE', exact: true }).click();
      await expect(page.getByRole('region', { name: 'Commissioner trade flow' })).toBeVisible();
      await auditCurrentSurface(page);
      await expectActionInsideViewport(page, page.getByRole('button', { name: 'CHECK THE GUIDE' }));
    } else {
      await expect(page.getByRole('button', { name: 'HELP' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'FORGET ROOM' })).toHaveCount(0);
      await expect(page.getByTestId('private-draft-desk')).toBeVisible();
      await auditCurrentSurface(page);
      await expectActionInsideViewport(page, page.getByRole('button', { name: 'COVER THIS DEVICE' }));

      await page.getByRole('button', { name: 'HELP' }).click();
      await expect(page.getByText("THIS DEVICE SHOWS ONLY THE CLAIMED CLUB'S PRIVATE DESK.")).toBeVisible();
      await auditCurrentSurface(page);
      await page.getByRole('button', { name: 'PLAYER POOL' }).click();
      await auditCurrentSurface(page);
      await page.getByRole('button', { name: 'TRADE PICKS' }).click();
      await auditCurrentSurface(page);
      await expect(page.getByRole('button', { name: 'FORGET ROOM' })).toHaveCount(0);
      await page.getByRole('button', { name: 'COVER THIS DEVICE' }).click();
      await expect(page.getByTestId('snake-companion-covered')).toBeVisible();
      await expect(page.getByRole('button', { name: 'FORGET ROOM' })).toBeVisible();
      await auditCurrentSurface(page, false);
      await expectActionInsideViewport(page, page.getByRole('button', { name: 'RETURN TO DESK' }));
      await expectActionInsideViewport(page, page.getByRole('button', { name: 'FORGET ROOM' }));
      await expectActionInsideViewport(page, page.getByRole('button', { name: 'SIGN OUT' }));
    }
  });
}
