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
  const metrics = await controls.evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return {
      label: element.getAttribute('aria-label') ?? element.textContent ?? '',
      height: rect.height,
      width: rect.width,
      x: rect.x,
    };
  }));
  expect(metrics.length).toBeGreaterThan(0);
  const viewportWidth = page.viewportSize()!.width;
  for (const [index, metric] of metrics.entries()) {
    expect(metric.height, `control ${index}: ${metric.label}`).toBeGreaterThanOrEqual(44);
    expect(metric.x).toBeGreaterThanOrEqual(0);
    expect(metric.x + metric.width).toBeLessThanOrEqual(viewportWidth);
  }
  const help = page.getByRole('button', { name: 'HELP' });
  if (expectHelp) {
    const helpBox = await help.boundingBox();
    expect(helpBox).not.toBeNull();
    expect(helpBox!.width).toBeGreaterThanOrEqual(44);
  }
}

async function expectControlInsideViewportWithScrollRescue(page: Page, control: Locator) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await control.scrollIntoViewIfNeeded();
      break;
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }
  const box = await control.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
}

async function expectCriticalActionInsideViewport(page: Page, action: Locator) {
  const box = await action.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
}

async function holdGavel(page: Page) {
  const gavel = page.getByRole('button', { name: 'HOLD THE GAVEL' });
  const box = await gavel.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1_150);
  await page.mouse.up();
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
      await expectControlInsideViewportWithScrollRescue(page, page.getByRole('button', { name: 'HELP' }));
      await expectControlInsideViewportWithScrollRescue(page, page.getByRole('button', { name: 'REVEAL BEEWOLVES SEAT' }));

      await page.getByRole('button', { name: 'REVEAL BEEWOLVES SEAT' }).click();
      await expect(page.getByTestId('private-draft-desk')).toBeVisible();
      await expect(page.getByTestId('selected-player-card')).toBeVisible();
      await auditCurrentSurface(page);
      await expect(page.getByRole('button', { name: 'DRAFT PLAYER' })).toHaveCount(0);
      await expectControlInsideViewportWithScrollRescue(page, page.getByRole('button', { name: 'COVER' }));

      await page.getByRole('combobox', { name: 'TEAM' }).selectOption('buz');
      await expect(page.getByTestId('private-draft-desk')).toHaveCount(0);
      await page.getByRole('button', { name: 'REVEAL BUZZARDS SEAT' }).click();
      await expectControlInsideViewportWithScrollRescue(page, page.getByRole('button', { name: 'DRAFT PLAYER' }));

      await page.getByRole('button', { name: 'PLAYER POOL' }).click();
      await auditCurrentSurface(page);
      await page.getByRole('button', { name: 'Set rank for JOVITA PULO' }).click();
      const rankInput = page.getByRole('spinbutton', { name: 'Set rank for JOVITA PULO' });
      await expect(rankInput).toBeVisible();
      await expectControlInsideViewportWithScrollRescue(page, rankInput);
      expect((await rankInput.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await auditCurrentSurface(page);
      await page.getByRole('button', { name: 'TRADE PICKS' }).click();
      await auditCurrentSurface(page);
      await page.getByRole('button', { name: 'TRADE', exact: true }).click();
      await expect(page.getByRole('region', { name: 'Commissioner trade flow' })).toBeVisible();
      await auditCurrentSurface(page);
      await expectControlInsideViewportWithScrollRescue(page, page.getByRole('button', { name: 'CHECK THE GUIDE' }));
    } else {
      await expect(page.getByTestId('snake-companion-covered')).toBeVisible();
      await expect(page.getByTestId('private-draft-desk')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'FORGET ROOM' })).toBeVisible();
      await auditCurrentSurface(page, false);
      await page.getByRole('button', { name: 'RETURN TO DESK' }).click();
      await expect(page.getByRole('button', { name: 'HELP' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'FORGET ROOM' })).toHaveCount(0);
      await expect(page.getByTestId('private-draft-desk')).toBeVisible();
      await auditCurrentSurface(page);
      await expectControlInsideViewportWithScrollRescue(page, page.getByRole('button', { name: 'COVER THIS DEVICE' }));

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
      await expectControlInsideViewportWithScrollRescue(page, page.getByRole('button', { name: 'RETURN TO DESK' }));
      await expectControlInsideViewportWithScrollRescue(page, page.getByRole('button', { name: 'FORGET ROOM' }));
      await expectControlInsideViewportWithScrollRescue(page, page.getByRole('button', { name: 'SIGN OUT' }));
    }
  });
}

for (const viewport of [{ width: 1024, height: 768 }, { width: 768, height: 1024 }] as const) {
  test(`stateful Snake test drive preserves the board at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/__preview/snake-responsive?surface=main');
    await page.getByRole('button', { name: 'REVEAL BEEWOLVES SEAT' }).click();
    await page.getByRole('button', { name: 'PLAYER POOL' }).click();

    const workspace = page.getByTestId('private-workspace-scroll');
    for (const name of ['JOVITA PULO', 'SAM SLUGGER', 'MAX BACKSTOP']) {
      const selection = page.getByRole('button', { name: new RegExp(`^SELECT ${name}`) });
      await selection.scrollIntoViewIfNeeded();
      const boardAnchor = await workspace.evaluate((element) => element.scrollTop);
      const pageAnchor = await page.evaluate(() => window.scrollY);
      await selection.evaluate((element) => (element as HTMLElement).click());
      await expect(page.getByTestId('selected-player-action-strip')).toContainText(new RegExp(name, 'i'));
      await expectCriticalActionInsideViewport(page, page.getByTestId('selected-player-action-strip'));
      expect(await workspace.evaluate((element) => element.scrollTop)).toBe(boardAnchor);
      expect(await page.evaluate(() => window.scrollY)).toBe(pageAnchor);
    }

    const search = page.getByRole('searchbox', { name: 'FIND PLAYER' });
    await search.fill('taylor utility');
    await page.getByRole('button', { name: 'Send TAYLOR UTILITY to top' }).click();
    await search.fill('');
    await page.getByRole('button', { name: 'SP', exact: true }).click();
    await search.fill('nora curveball');
    await page.getByRole('button', { name: 'Send NORA CURVEBALL to top' }).click();

    await page.getByRole('button', { name: 'MY BOARD' }).click();
    await expect(page.getByTestId('my-board-view')).toContainText('TAYLOR UTILITY');
    await expect(page.getByTestId('my-board-view')).toContainText('NORA CURVEBALL');
    await page.getByRole('button', { name: 'ASST GM BOARD' }).click();
    await expect(page.getByTestId('assistant-board-panel')).toContainText('ASST GM');
    await expect(page.getByTestId('assistant-board-panel')).toContainText('22/22');
    await expect(page.getByTestId('assistant-board-panel')).toContainText('QUINN VERSATILE');
    await page.getByRole('button', { name: 'MY BOARD' }).click();

    if (viewport.width >= 1024) {
      await expect(page.getByRole('button', { name: 'OPEN PLAYER CARD' })).toHaveCount(0);
      const profileBox = await page.getByTestId('selected-player-pane').boundingBox();
      const boardBox = await workspace.boundingBox();
      expect(profileBox).not.toBeNull();
      expect(boardBox).not.toBeNull();
      expect(profileBox!.width).toBeGreaterThanOrEqual(320);
      expect(boardBox!.width).toBeGreaterThanOrEqual(480);
      const selectedNameBox = await page.getByTestId('selected-player-action-strip').locator('h2').boundingBox();
      expect(selectedNameBox).not.toBeNull();
      expect(selectedNameBox!.height).toBeLessThanOrEqual(60);
      expect(profileBox!.x + profileBox!.width).toBeLessThanOrEqual(boardBox!.x + 1);
      expect(Math.max(profileBox!.y, boardBox!.y)).toBeLessThan(Math.min(profileBox!.y + profileBox!.height, boardBox!.y + boardBox!.height));
      await page.getByRole('button', { name: 'OPTIMIZE AROUND' }).click();
      await expect(page.getByRole('button', { name: 'ASST GM BOARD' })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByTestId('assistant-optimization-result')).toContainText('OPTIMIZED FOR');
      await page.getByRole('button', { name: 'MY BOARD' }).click();
      await page.getByRole('button', { name: 'OPTIMIZE AROUND' }).click();
      await expect(page.getByRole('button', { name: 'ASST GM BOARD' })).toHaveAttribute('aria-pressed', 'true');
    } else {
      await expect(page.getByRole('button', { name: 'OPEN PLAYER CARD' })).toBeVisible();
      const anchorBeforeCard = await workspace.evaluate((element) => element.scrollTop);
      await page.getByRole('button', { name: 'OPEN PLAYER CARD' }).click();
      await expect(page.getByTestId('selected-player-profile-body')).toBeVisible();
      expect(await workspace.evaluate((element) => element.scrollTop)).toBe(anchorBeforeCard);
      await page.getByRole('button', { name: 'CLOSE PLAYER CARD' }).click();
      expect(await workspace.evaluate((element) => element.scrollTop)).toBe(anchorBeforeCard);
    }

    const actionBeforeBoardScroll = await page.getByTestId('selected-player-action-strip').boundingBox();
    const pageBeforeBoardScroll = await page.evaluate(() => window.scrollY);
    await expectCriticalActionInsideViewport(page, page.getByTestId('selected-player-action-strip'));
    await workspace.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    const actionAfterBoardScroll = await page.getByTestId('selected-player-action-strip').boundingBox();
    expect(actionBeforeBoardScroll).not.toBeNull();
    expect(actionAfterBoardScroll).not.toBeNull();
    expect(actionAfterBoardScroll!.y).toBe(actionBeforeBoardScroll!.y);
    expect(await page.evaluate(() => window.scrollY)).toBe(pageBeforeBoardScroll);
    await expectCriticalActionInsideViewport(page, page.getByTestId('selected-player-action-strip'));

    await page.getByRole('combobox', { name: 'TEAM' }).selectOption('buz');
    await expect(page.getByTestId('private-draft-desk')).toHaveCount(0);
    await expect(page.getByTestId('selected-player-card')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'REVEAL BUZZARDS SEAT' })).toBeVisible();
    await page.getByRole('button', { name: 'REVEAL BUZZARDS SEAT' }).click();
    await expect(page.getByTestId('private-draft-desk')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
}

for (const viewport of [{ width: 1024, height: 768 }, { width: 768, height: 1024 }] as const) {
  test(`companion keeps profile actions beside or above an independently scrolling board at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/__preview/snake-responsive?surface=companion');
    await page.getByRole('button', { name: 'RETURN TO DESK' }).click();
    const profile = page.getByTestId('companion-selected-player-pane');
    const board = page.getByTestId('companion-private-workspace-scroll');
    const profileBox = await profile.boundingBox();
    const boardBox = await board.boundingBox();
    expect(profileBox).not.toBeNull();
    expect(boardBox).not.toBeNull();
    if (viewport.width >= 1024) {
      expect(profileBox!.x + profileBox!.width).toBeLessThanOrEqual(boardBox!.x + 1);
      expect(profileBox!.width).toBeGreaterThanOrEqual(300);
      expect(boardBox!.width).toBeGreaterThanOrEqual(360);
      await page.getByRole('button', { name: 'OPTIMIZE AROUND' }).click();
      await expect(page.getByRole('button', { name: 'ASST GM BOARD' })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByTestId('assistant-optimization-result')).toContainText('OPTIMIZED FOR JOVITA PULO');
    } else {
      expect(profileBox!.y + profileBox!.height).toBeLessThanOrEqual(boardBox!.y + 1);
      await expect(page.getByRole('button', { name: 'OPEN PLAYER CARD' })).toBeVisible();
    }
    const actionBefore = await page.getByTestId('selected-player-action-strip').boundingBox();
    const pageBefore = await page.evaluate(() => window.scrollY);
    await expectCriticalActionInsideViewport(page, page.getByTestId('selected-player-action-strip'));
    await board.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    expect((await page.getByTestId('selected-player-action-strip').boundingBox())!.y).toBe(actionBefore!.y);
    expect(await page.evaluate(() => window.scrollY)).toBe(pageBefore);
    await expectCriticalActionInsideViewport(page, page.getByTestId('selected-player-action-strip'));
    if (viewport.width === 768) {
      const mutationScrollAnchor = await page.evaluate(() => {
        const button = document.createElement('button');
        button.dataset.testid = 'offscreen-critical-action';
        button.textContent = 'OFFSCREEN CRITICAL ACTION';
        button.style.position = 'absolute';
        button.style.top = `${document.documentElement.scrollHeight + 500}px`;
        document.body.append(button);
        return window.scrollY;
      });
      let rejectedOffscreenAction = false;
      try {
        await expectCriticalActionInsideViewport(page, page.getByTestId('offscreen-critical-action'));
      } catch {
        rejectedOffscreenAction = true;
      }
      expect(rejectedOffscreenAction).toBe(true);
      expect(await page.evaluate(() => window.scrollY)).toBe(mutationScrollAnchor);
      await page.getByTestId('offscreen-critical-action').evaluate((element) => element.remove());
    }
    await expectNoHorizontalOverflow(page);
  });
}

test('main and companion show the same drafted roster money and chemistry truth', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/__preview/snake-responsive?surface=main');
  const mainTruth = await page.getByTestId('drafted-truth-bew').innerText();
  await page.goto('/__preview/snake-responsive?surface=companion');
  await page.getByRole('button', { name: 'RETURN TO DESK' }).click();
  expect(await page.getByTestId('companion-drafted-truth-bew').innerText()).toBe(mainTruth);
});

test('one companion device keeps two covered team desks private and independent', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/__preview/snake-responsive?surface=companion&proof=handoff');

  await expect(page.getByTestId('snake-companion-covered')).toBeVisible();
  await expect(page.getByRole('button', { name: 'RETURN TO DESK' })).toContainText('OPEN BEEWOLVES DESK');
  await page.getByRole('button', { name: 'RETURN TO DESK' }).click();
  await expect(page.getByTestId('companion-team-header')).toContainText('BEEWOLVES');
  await expect(page.getByTestId('selected-player-action-strip')).toContainText(/JOVITA PULO/i);

  await page.getByRole('button', { name: 'PLAYER POOL' }).click();
  const search = page.getByRole('searchbox', { name: 'FIND PLAYER' });
  await search.fill('taylor utility');
  await page.getByRole('button', { name: 'Send TAYLOR UTILITY to top' }).click();
  await expect(page.locator('[aria-label="OVERALL ranking results"]')).toContainText('#1');

  await page.getByRole('combobox', { name: 'PRIVATE TEAM DESK' }).selectOption('buz');
  await expect(page.getByTestId('snake-companion-covered')).toBeVisible();
  await expect(page.getByTestId('snake-companion-frame')).toHaveCount(0);
  await expect(page.getByText('JOVITA PULO')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'RETURN TO DESK' })).toContainText('OPEN BUZZARDS DESK');
  await page.getByRole('button', { name: 'RETURN TO DESK' }).click();
  await expect(page.getByTestId('companion-team-header')).toContainText('BUZZARDS');
  await expect(page.getByTestId('selected-player-action-strip')).toContainText(/MAX BACKSTOP/i);
  await expect(page.getByTestId('selected-player-action-strip')).not.toContainText(/JOVITA PULO/i);

  await page.getByRole('button', { name: 'PLAYER POOL' }).click();
  await page.getByRole('searchbox', { name: 'FIND PLAYER' }).fill('nora curveball');
  await page.getByRole('button', { name: 'Send NORA CURVEBALL to top' }).click();
  await expect(page.locator('[aria-label="OVERALL ranking results"]')).toContainText('#1');
  await page.getByRole('combobox', { name: 'PRIVATE TEAM DESK' }).selectOption('bew');
  await expect(page.getByTestId('snake-companion-covered')).toBeVisible();
  await expect(page.getByText('MAX BACKSTOP')).toHaveCount(0);
  await page.getByRole('button', { name: 'RETURN TO DESK' }).click();

  await expect(page.getByTestId('companion-team-header')).toContainText('BEEWOLVES');
  await page.getByRole('button', { name: 'PLAYER POOL' }).click();
  await page.getByRole('searchbox', { name: 'FIND PLAYER' }).fill('taylor utility');
  await expect(page.locator('[aria-label="OVERALL ranking results"]')).toContainText('#1');
  await page.getByRole('searchbox', { name: 'FIND PLAYER' }).fill('nora curveball');
  await expect(page.locator('[aria-label="OVERALL ranking results"]')).not.toContainText('#1');

  await page.getByRole('combobox', { name: 'PRIVATE TEAM DESK' }).selectOption('buz');
  await expect(page.getByTestId('snake-companion-covered')).toBeVisible();
  await page.getByRole('button', { name: 'RETURN TO DESK' }).click();
  await expect(page.getByTestId('selected-player-action-strip')).toContainText(/MAX BACKSTOP/i);
  await page.getByRole('button', { name: 'SEND PICK TO HOTSEAT' }).click();
  await expect(page.getByTestId('companion-pick-waiting')).toContainText('PICK #19 WAITING FOR HOTSEAT');

  await page.getByRole('button', { name: 'HOTSEAT DEVICE' }).click();
  await expect(page.getByTestId('snake-responsive-preview')).toHaveAttribute('data-proof-device', 'hotseat');
  await expect(page.getByTestId('snake-companion-frame')).toHaveCount(0);
  await expect(page.getByTestId('companion-pick-request')).toContainText('#19 · BUZZARDS · MAX BACKSTOP');
  await page.getByRole('button', { name: 'APPROVE PICK' }).click();
  await expect(page.getByTestId('companion-pick-request')).toHaveCount(0);
  await expect(page.getByTestId('preview-hotseat-public-truth')).toContainText('#19 · BUZZARDS · MAX BACKSTOP');
  await expect(page.getByTestId('preview-hotseat-public-truth')).toContainText('NEXT PICK · #20');
});

test('a recorded pick becomes unavailable everywhere and cannot be drafted twice', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/__preview/snake-responsive?surface=main');
  await page.getByRole('combobox', { name: 'TEAM' }).selectOption('buz');
  await page.getByRole('button', { name: 'REVEAL BUZZARDS SEAT' }).click();
  await expect(page.getByTestId('selected-player-action-strip')).toContainText('Max Backstop');
  await page.getByRole('button', { name: 'DRAFT PLAYER' }).click();
  await holdGavel(page);
  await expect(page.getByLabel('Buzzards pick 19')).not.toHaveAttribute('aria-current', 'step');

  await page.getByRole('combobox', { name: 'TEAM' }).selectOption('bew');
  await page.getByRole('button', { name: 'REVEAL BEEWOLVES SEAT' }).click();
  await page.getByRole('button', { name: 'PLAYER POOL' }).click();
  const drafted = page.getByRole('button', { name: /^SELECT MAX BACKSTOP/ });
  await expect(drafted).toHaveCount(0);
  await page.getByRole('button', { name: 'MY BOARD' }).click();
  await expect(page.getByTestId('my-board-view')).not.toContainText('MAX BACKSTOP');
  await page.getByRole('button', { name: 'ASST GM BOARD' }).click();
  await expect(page.getByTestId('assistant-board-panel')).not.toContainText('MAX BACKSTOP');
  await expect(page.getByRole('button', { name: 'TRADE TO #19' })).toHaveCount(0);
  await expect(page.getByText('PICK 19 IS AVAILABLE.')).toHaveCount(0);
  await page.getByRole('button', { name: 'TRADE TO #22' }).click();
  await page.getByRole('button', { name: 'TRADE PICKS' }).click();
  await expect(page.getByRole('spinbutton', { name: 'WHAT WOULD IT COST TO REACH PICK N?' })).toHaveValue('22');
});

test('terminal pick opens a local recap and restart returns to a covered room', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/__preview/snake-responsive?surface=main&terminal=1');
  await expect(page.getByRole('button', { name: 'CORRECT LAST ACTION' })).toHaveCount(0);
  await page.getByRole('button', { name: 'REVEAL BEEWOLVES SEAT' }).click();
  await page.getByRole('button', { name: 'DRAFT PLAYER' }).click();
  await holdGavel(page);
  await expect(page.getByTestId('local-draft-recap')).toContainText('6 PICKS RECORDED', { timeout: 3_000 });
  await page.getByRole('button', { name: 'RESTART TEST DRIVE' }).click();
  await expect(page.getByRole('button', { name: 'REVEAL BEEWOLVES SEAT' })).toBeVisible();
  await expect(page.getByTestId('local-draft-recap')).toHaveCount(0);
});

test('companion sign out and forget room clear every private preview choice', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/__preview/snake-responsive?surface=companion');
  await page.getByRole('button', { name: 'RETURN TO DESK' }).click();
  await page.getByRole('button', { name: 'PLAYER POOL' }).click();
  await page.getByRole('searchbox', { name: 'FIND PLAYER' }).fill('taylor utility');
  await page.getByRole('button', { name: /^SELECT TAYLOR UTILITY/ }).click();
  await page.getByRole('button', { name: 'Send TAYLOR UTILITY to top' }).click();
  await page.getByRole('button', { name: 'OPTIMIZE AROUND' }).click();
  await page.getByRole('button', { name: 'TRADE TO #19' }).click();
  await page.getByRole('button', { name: 'TRADE PICKS' }).click();
  await expect(page.getByRole('spinbutton', { name: 'WHAT WOULD IT COST TO REACH PICK N?' })).toHaveValue('19');
  await page.getByRole('button', { name: 'COVER THIS DEVICE' }).click();
  await page.getByRole('button', { name: 'SIGN OUT' }).click();
  await expect(page.getByRole('alert')).toContainText('SIGNED OUT');
  await page.getByRole('button', { name: 'RETURN TO DESK' }).click();
  await expect(page.getByTestId('selected-player-action-strip')).toContainText('Jovita Pulo');
  await page.getByRole('button', { name: 'MY BOARD' }).click();
  await expect(page.getByTestId('my-board-view')).not.toContainText('TAYLOR UTILITY');
  await page.getByRole('button', { name: 'COVER THIS DEVICE' }).click();
  await page.getByRole('button', { name: 'FORGET ROOM' }).click();
  await expect(page.getByRole('alert')).toContainText('ROOM FORGOTTEN');
  await page.getByRole('button', { name: 'RETURN TO DESK' }).click();
  await expect(page.getByTestId('companion-private-epoch')).toHaveAttribute('data-private-epoch', '1');
  await expect(page.getByTestId('selected-player-action-strip')).toContainText('Jovita Pulo');
});

test('companion cover starts a clean private epoch at 430x932 without clearing My Board', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto('/__preview/snake-responsive?surface=companion');
  await page.getByRole('button', { name: 'RETURN TO DESK' }).click();
  const firstEpoch = await page.getByTestId('companion-private-epoch').getAttribute('data-private-epoch');

  await page.getByRole('button', { name: 'PLAYER POOL' }).click();
  await page.getByRole('searchbox', { name: 'FIND PLAYER' }).fill('taylor utility');
  await page.getByRole('button', { name: /^SELECT TAYLOR UTILITY/ }).click();
  await page.getByRole('button', { name: 'Send TAYLOR UTILITY to top' }).click();
  await page.getByRole('button', { name: 'OPEN PLAYER CARD' }).click();
  await page.getByRole('button', { name: 'OPTIMIZE AROUND' }).click();
  await expect(page.getByTestId('assistant-optimization-result')).toContainText('OPTIMIZED FOR TAYLOR UTILITY');
  await page.getByRole('button', { name: 'TRADE TO #19' }).click();
  await page.getByRole('button', { name: 'COVER THIS DEVICE' }).click();

  await expect(page.getByTestId('snake-companion-covered')).toBeVisible();
  await expect(page.getByText('TAYLOR UTILITY')).toHaveCount(0);
  await page.getByRole('button', { name: 'RETURN TO DESK' }).click();
  await expect(page.getByTestId('companion-private-epoch')).not.toHaveAttribute('data-private-epoch', firstEpoch ?? '');
  await expect(page.getByTestId('selected-player-action-strip')).toContainText('Jovita Pulo');
  await expect(page.getByTestId('assistant-optimization-result')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'REVERT' })).toHaveCount(0);
  await page.getByRole('button', { name: 'MY BOARD' }).click();
  await expect(page.getByTestId('my-board-view')).toContainText('TAYLOR UTILITY');
  await page.getByRole('button', { name: 'TRADE PICKS' }).click();
  await expect(page.getByRole('spinbutton', { name: 'WHAT WOULD IT COST TO REACH PICK N?' })).toHaveValue('');
  await expectNoHorizontalOverflow(page);
});

test('preview trade requires both nods and transfers the exact picks', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/__preview/snake-responsive?surface=main');
  await page.getByRole('button', { name: 'TRADE', exact: true }).click();
  const execute = page.getByRole('button', { name: 'EXECUTE TRADE' });
  await expect(execute).toBeDisabled();
  await page.getByRole('button', { name: 'BUYER NOD' }).click();
  await expect(execute).toBeDisabled();
  await page.getByRole('button', { name: 'SELLER NOD' }).click();
  await expect(execute).toBeEnabled();
  await execute.click();
  await expect(page.locator('[role="status"]').filter({ hasText: 'PICKS 20+21 FOR 19+22' })).toBeVisible();
  await expect(page.getByLabel('Beewolves pick 19')).toHaveAttribute('aria-current', 'step');
  await expect(page.getByTestId('snake-responsive-preview')).toHaveAttribute('data-trade-revision', '1');
  await expect(page.getByTestId('snake-responsive-preview')).toHaveAttribute('data-current-pick-team', 'bew');
  await expect(page.getByTestId('preview-trade-receipts')).toContainText('BEW · YOU TRADED PICKS 20+21 FOR 19+22 — YOUR NEXT PICK: #19.');
  await expect(page.getByTestId('preview-trade-receipts')).toContainText('BUZ · YOU TRADED PICKS 19+22 FOR 20+21 — YOUR NEXT PICK: #20.');
  await page.getByRole('button', { name: 'CLOSE' }).click();
  await expect(page.getByRole('region', { name: 'Selected team public roster' })).toContainText('19, 22, 24, 36');
  await page.getByRole('button', { name: 'REVEAL BEEWOLVES SEAT' }).click();
  await expect(page.getByRole('button', { name: 'TRADE TO #19' })).toHaveCount(0);
  await expect(page.getByText('PICK 19 IS AVAILABLE.')).toHaveCount(0);
});

for (const viewport of [{ width: 1024, height: 768 }, { width: 768, height: 1024 }] as const) {
  test(`companion test drive starts covered and rotates its private epoch at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/__preview/snake-responsive?surface=companion');
    await expect(page.getByTestId('snake-companion-covered')).toBeVisible();
    await expect(page.getByTestId('private-draft-desk')).toHaveCount(0);
    await expect(page.getByText('JOVITA PULO')).toHaveCount(0);
    await page.getByRole('button', { name: 'RETURN TO DESK' }).click();
    const firstEpoch = await page.getByTestId('companion-private-epoch').getAttribute('data-private-epoch');
    await expect(page.getByTestId('private-draft-desk')).toBeVisible();
    await page.getByRole('button', { name: 'COVER THIS DEVICE' }).click();
    await expect(page.getByText('JOVITA PULO')).toHaveCount(0);
    await page.getByRole('button', { name: 'RETURN TO DESK' }).click();
    expect(await page.getByTestId('companion-private-epoch').getAttribute('data-private-epoch')).not.toBe(firstEpoch);
    await expectNoHorizontalOverflow(page);
  });
}
