import { test, expect, type Page } from '@playwright/test';

async function clearIndexedDb(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
      if (db.name) indexedDB.deleteDatabase(db.name);
    }
  });
  await page.waitForTimeout(500);
}

async function maybeClick(page: Page, label: RegExp, timeout = 1200) {
  const button = page.getByRole('button', { name: label }).last();
  if (await button.isVisible({ timeout }).catch(() => false)) {
    await button.click();
    return true;
  }
  return false;
}

async function handlePitchCountPrompt(page: Page) {
  await maybeClick(page, /Confirm & Continue|Update/i, 1500);
}

async function goToEliminationSetup(page: Page) {
  await page.goto('/');
  await page.getByText('ELIMINATION').click();
  await expect(page).toHaveURL(/\/elimination\/select/);
  await page.getByRole('button', { name: /New Elimination Bracket/i }).click();
  await expect(page).toHaveURL(/\/elimination\/setup/);
}

async function createEliminationBracket(page: Page, bracketName: string) {
  await goToEliminationSetup(page);

  const leagueButton = page.getByRole('button', { name: /SUPER MEGA LEAGUE/i }).first();
  await expect(leagueButton).toBeVisible({ timeout: 15000 });
  await leagueButton.click();

  await page.getByRole('button', { name: /^NEXT$/i }).click();

  await page.getByRole('button', { name: /^4$/ }).nth(1).click();
  const bestOfThreeButtons = page.getByRole('button', { name: /Best of 3/i });
  const bestOfThreeCount = await bestOfThreeButtons.count();
  for (let index = 0; index < bestOfThreeCount; index += 1) {
    await bestOfThreeButtons.nth(index).click();
  }
  await page.getByRole('button', { name: /^NEXT$/i }).click();
  await page.getByRole('button', { name: /^NEXT$/i }).click();
  await page.getByRole('button', { name: /^NEXT$/i }).click();

  const nameInput = page.locator('input[type="text"]').first();
  await expect(nameInput).toBeVisible({ timeout: 10000 });
  await nameInput.fill(bracketName);
  await page.getByRole('button', { name: /START PLAYOFFS/i }).click();
  await expect(page).toHaveURL(/\/elimination\/.+/, { timeout: 20000 });
}

async function startFirstSeriesGame(page: Page) {
  const playButtons = page.getByRole('button', { name: /^PLAY GAME$/i });
  await expect(playButtons.first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/Matchup:/i)).toBeVisible({ timeout: 10000 });
  await playButtons.first().click();
  await expect(page).toHaveURL(/\/game-tracker\/elim-/);
}

async function recordThreeStrikeouts(page: Page) {
  const kButton = page.getByRole('button', { name: /^K$/i }).first();
  await expect(kButton).toBeVisible({ timeout: 10000 });
  await kButton.click();
  await kButton.click();
  await kButton.click();
  await handlePitchCountPrompt(page);
}

async function finishCurrentGame(page: Page) {
  await recordThreeStrikeouts(page);
  await expect(page.getByText('▼1')).toBeVisible({ timeout: 10000 });

  await recordThreeStrikeouts(page);
  await expect(page.getByText('▲2')).toBeVisible({ timeout: 10000 });

  await page.getByRole('button', { name: /END GAME/i }).last().click();
  await page.getByRole('button', { name: /END GAME/i }).last().click();
  await handlePitchCountPrompt(page);
  await expect(page).toHaveURL(/\/post-game\/elim-/, { timeout: 20000 });
  await page.getByRole('button', { name: /CONTINUE/i }).click();
  await expect(page).toHaveURL(/\/elimination\/.+/, { timeout: 10000 });
}

test.describe('Elimination Mode Journeys', () => {
  test.beforeEach(async ({ page }) => {
    await clearIndexedDb(page);
  });

  test('E-1: Create Elimination Bracket', async ({ page }) => {
    const messages: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') messages.push(msg.text());
    });

    await createEliminationBracket(page, 'E1 Bracket');

    await expect(page.getByText('BRACKET')).toBeVisible();
    await expect(page.getByText(/PLAY GAME/i)).toBeVisible();
    expect(messages).toEqual([]);
  });

  test('E-2: Play One Elimination Game', async ({ page }) => {
    await createEliminationBracket(page, 'E2 Bracket');
    await startFirstSeriesGame(page);
    await finishCurrentGame(page);

    await expect(page.getByText(/1-0|0-1/)).toBeVisible();
  });

  test('E-3: Verify Stats Flow to Leaders Tab', async ({ page }) => {
    await createEliminationBracket(page, 'E3 Bracket');
    await startFirstSeriesGame(page);
    await finishCurrentGame(page);

    await page.getByRole('button', { name: /^LEADERS$/i }).click();
    await expect(page.getByText('BATTING LEADERS')).toBeVisible();
    await expect(page.getByText('PITCHING LEADERS')).toBeVisible();
    await expect(page.getByText(/No playoff stats yet/i)).toHaveCount(0);
  });

  test('E-4: Complete Opening Round And Advance Bracket', async ({ page }) => {
    await createEliminationBracket(page, 'E4 Bracket');

    for (let gameIndex = 0; gameIndex < 4; gameIndex += 1) {
      await startFirstSeriesGame(page);
      await finishCurrentGame(page);
    }

    await expect(page.getByText(/WINNER:/i)).toBeVisible();
    await expect(page.getByText(/CHAMPIONSHIP/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^PLAY GAME$/i }).first()).toBeVisible();
  });

  test('E-5: Team Hub Lineup Edit', async ({ page }) => {
    await createEliminationBracket(page, 'E5 Bracket');
    await page.getByRole('button', { name: /^TEAM HUB$/i }).click();

    await expect(page.getByText('POSITION PLAYERS')).toBeVisible();
    await expect(page.getByText('STARTING ROTATION')).toBeVisible();

    const firstLineupSelect = page.locator('select').nth(0);
    const secondLineupSelect = page.locator('select').nth(2);
    const secondNameBefore = await secondLineupSelect.inputValue();

    await page.locator('button').filter({ has: page.locator('svg') }).nth(1).click();
    await expect(firstLineupSelect).toHaveValue(secondNameBefore);

    await page.getByRole('button', { name: /^BRACKET$/i }).click();
    await page.getByRole('button', { name: /^TEAM HUB$/i }).click();
    await expect(firstLineupSelect).toHaveValue(secondNameBefore);

    const firstNextStarter = page.getByText('NEXT STARTER').first();
    const firstStarterBefore = await firstNextStarter.textContent();
    const makeNextButton = page.getByRole('button', { name: /MAKE NEXT/i }).nth(1);
    await makeNextButton.click();
    await expect(firstNextStarter).not.toHaveText(firstStarterBefore ?? '');
  });
});
