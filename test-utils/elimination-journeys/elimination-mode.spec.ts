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

async function handlePitchCountPrompt(page: Page, timeout = 5000, required = false) {
  const pitchCountInput = page.getByRole('spinbutton').last();

  try {
    await pitchCountInput.waitFor({ state: 'visible', timeout });
  } catch (err) {
    if (required) throw err;
    return false;
  }

  const currentValue = await pitchCountInput.inputValue();
  await pitchCountInput.fill(currentValue || '0');
  await page.getByRole('button', { name: /^(Confirm & Continue|Update)$/i }).last().click();
  await expect(pitchCountInput).toBeHidden({ timeout: 10000 });
  return true;
}

async function expectEliminationHome(page: Page) {
  await expect(page).toHaveURL(/\/elimination\/elim-[^/]+$/, { timeout: 20000 });
  await expect(page.getByRole('button', { name: /^BRACKET$/i })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('button', { name: /^PLAY GAME$/i }).first()).toBeVisible({ timeout: 10000 });
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
  await expectEliminationHome(page);
}

async function openTeamHub(page: Page) {
  await page.getByRole('button', { name: /^TEAM HUB$/i }).click();
  await expect(page.getByText('POSITION PLAYERS', { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('STARTING ROTATION', { exact: true })).toBeVisible({ timeout: 10000 });
}

async function registerAllCurrentLineupsAsBenchmarks(page: Page) {
  await openTeamHub(page);

  const teamSelector = page.getByText('TEAM SELECTOR', { exact: true }).locator('xpath=..');
  const teamButtons = teamSelector.getByRole('button');
  const teamCount = await teamButtons.count();

  for (let teamIndex = 0; teamIndex < teamCount; teamIndex += 1) {
    await teamButtons.nth(teamIndex).click();
    await expect(page.getByText('LINEUP', { exact: true })).toBeVisible();

    const setButtons = page.getByRole('button', { name: /^SET$/ });
    await expect(setButtons).toHaveCount(2);
    await setButtons.nth(0).click();
    await expect(page.getByText('user registered', { exact: true })).toHaveCount(1);
    await setButtons.nth(1).click();
    await expect(page.getByText('user registered', { exact: true })).toHaveCount(2);
  }

  await page.getByRole('button', { name: /^BRACKET$/i }).click();
  await expectEliminationHome(page);
}

async function startFirstSeriesGame(page: Page) {
  let playButtons = page.getByRole('button', { name: /^PLAY GAME$/i });
  if (!(await playButtons.first().isVisible({ timeout: 10000 }).catch(() => false))) {
    await page.getByRole('button', { name: /(?:PENDING|IN_PROGRESS).*NEXT GAME/i }).first().click();
  }

  const homeTeamButtons = page.getByRole('button', { name: /^HOME TEAM/i });
  if (await homeTeamButtons.nth(1).isVisible({ timeout: 2000 }).catch(() => false)) {
    await homeTeamButtons.nth(1).click();
  }

  playButtons = page.getByRole('button', { name: /^PLAY GAME$/i });
  await expect(playButtons.first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/Matchup:/i)).toBeVisible({ timeout: 10000 });
  await playButtons.first().click();
  await expect(page).toHaveURL(/\/game-tracker\/elim-/, { timeout: 20000 });
  await page.getByRole('button', { name: /^START GAME$/i }).click();
  await page.getByRole('button', { name: /^YES$/i }).click();
  await expect(page.getByRole('button', { name: /^K$/i }).first()).toBeVisible({ timeout: 10000 });
}

async function recordSoloHomeRun(page: Page) {
  const hrButton = page.getByRole('button', { name: /^HR$/i }).first();
  await expect(hrButton).toBeVisible({ timeout: 10000 });
  await hrButton.click();
  await page.getByRole('button', { name: /^Skip$/i }).click();
}

async function recordThreeStrikeouts(page: Page) {
  const kButton = page.getByRole('button', { name: /^K$/i }).first();
  await expect(kButton).toBeVisible({ timeout: 10000 });
  await kButton.click();
  await kButton.click();
  await kButton.click();
  await page.getByRole('button', { name: /End Half-Inning/i }).click();
  await handlePitchCountPrompt(page);
}

async function finishCurrentGame(page: Page) {
  await recordSoloHomeRun(page);
  await recordThreeStrikeouts(page);
  await expect(page.getByTestId('scorebug-inning-text')).toHaveText('B1', { timeout: 10000 });

  await recordThreeStrikeouts(page);
  await expect(page.getByTestId('scorebug-inning-text')).toHaveText('T2', { timeout: 10000 });

  await page.getByRole('button', { name: /^END$/i }).click();
  await page.getByRole('button', { name: /^END GAME$/i }).click();
  if (await page.getByText('ENRICHMENT', { exact: true }).isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.getByRole('button', { name: /^CONTINUE$/i }).click();
  }
  await handlePitchCountPrompt(page, 15000, true);
  await expect(page).toHaveURL(/\/post-game\/elim-/, { timeout: 45000 });
  const continueButton = page.getByRole('button', { name: /^CONTINUE$/i });
  await expect(continueButton).toBeVisible({ timeout: 10000 });
  await continueButton.click();
  await expect(page).toHaveURL(/\/elimination\/.+/, { timeout: 10000 });
}

async function completedSeriesCardCount(page: Page) {
  return page.getByRole('button').filter({ hasText: /WINNER:/i }).count();
}

async function championshipRoundVisible(page: Page) {
  return page.getByText(/▶ CHAMPIONSHIP/i).first().isVisible({ timeout: 1000 }).catch(() => false);
}

async function playUntilSemifinalsComplete(page: Page) {
  const maxBestOfThreeSemifinalGames = 6;

  for (let gameIndex = 0; gameIndex < maxBestOfThreeSemifinalGames; gameIndex += 1) {
    const completedSeries = await completedSeriesCardCount(page);
    if (completedSeries >= 2 && (await championshipRoundVisible(page))) break;

    await startFirstSeriesGame(page);
    await finishCurrentGame(page);
    await expect(page.getByRole('button', { name: /^BRACKET$/i })).toBeVisible({ timeout: 10000 });
  }

  await expect(page.getByRole('button').filter({ hasText: /WINNER:/i })).toHaveCount(2, { timeout: 10000 });
  await expect(page.getByText(/▶ CHAMPIONSHIP/i).first()).toBeVisible({ timeout: 20000 });
}

async function playUntilChampionComplete(page: Page) {
  await playUntilSemifinalsComplete(page);

  const maxBestOfThreeChampionshipGames = 3;
  for (let gameIndex = 0; gameIndex < maxBestOfThreeChampionshipGames; gameIndex += 1) {
    if ((await completedSeriesCardCount(page)) >= 3) break;

    await startFirstSeriesGame(page);
    await finishCurrentGame(page);
    await expect(page.getByRole('button', { name: /^BRACKET$/i })).toBeVisible({ timeout: 10000 });
  }

  await expect(page.getByRole('button').filter({ hasText: /WINNER:/i })).toHaveCount(3, { timeout: 10000 });
  await expect(page.getByText('COMPLETED', { exact: true }).first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('button', { name: /^PLAY GAME$/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /(?:PENDING|IN_PROGRESS).*NEXT GAME/i })).toHaveCount(0);
}

test.describe('Elimination Mode Journeys', () => {
  test.describe.configure({ timeout: 180000 });

  test.beforeEach(async ({ page }) => {
    await clearIndexedDb(page);
  });

  test('E-1: Create Elimination Bracket', async ({ page }) => {
    const messages: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') messages.push(msg.text());
    });

    await createEliminationBracket(page, 'E1 Bracket');

    await expect(page.getByRole('button', { name: /^BRACKET$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^PLAY GAME$/i }).first()).toBeVisible();
    expect(messages).toEqual([]);
  });

  test('E-2: Play One Elimination Game', async ({ page }) => {
    await createEliminationBracket(page, 'E2 Bracket');
    await registerAllCurrentLineupsAsBenchmarks(page);
    await startFirstSeriesGame(page);
    await finishCurrentGame(page);

    await expect(page.getByText(/SCORE: (1-0|0-1)/i)).toBeVisible();
  });

  test('E-3: Verify Stats Flow to Leaders Tab', async ({ page }) => {
    await createEliminationBracket(page, 'E3 Bracket');
    await registerAllCurrentLineupsAsBenchmarks(page);
    await startFirstSeriesGame(page);
    await finishCurrentGame(page);

    await expect(page.getByText(/SCORE: (1-0|0-1)/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /^LEADERS$/i }).click();
    await expect(page.getByText('BATTING LEADERS')).toBeVisible();
    await expect(page.getByText('PITCHING LEADERS')).toBeVisible();
    await expect(page.getByText(/No playoff stats yet/i)).toHaveCount(0);
  });

  test('E-4: Complete Bracket And Crown Champion', async ({ page }) => {
    test.setTimeout(180000);

    await createEliminationBracket(page, 'E4 Bracket');
    await registerAllCurrentLineupsAsBenchmarks(page);

    await playUntilChampionComplete(page);

    await page.getByRole('button', { name: /^LEADERS$/i }).click();
    await expect(page.getByText('BATTING LEADERS')).toBeVisible();
    await expect(page.getByText('PITCHING LEADERS')).toBeVisible();
    await expect(page.getByText(/No playoff stats yet/i)).toHaveCount(0);

    await page.getByRole('button', { name: /^AWARDS$/i }).click();
    await expect(page.getByText(/Series MVP/i).first()).toBeVisible({ timeout: 20000 });

    await page.getByRole('button', { name: /^HISTORY$/i }).click();
    await expect(page.getByText('CHAMPION', { exact: true })).toBeVisible();
    await expect(page.getByText('FINAL RESULT', { exact: true })).toBeVisible();
  });

  test('E-5: Team Hub Lineup Edit', async ({ page }) => {
    await createEliminationBracket(page, 'E5 Bracket');
    await openTeamHub(page);

    await expect(page.getByText('POSITION PLAYERS', { exact: true })).toBeVisible();
    await expect(page.getByText('STARTING ROTATION', { exact: true })).toBeVisible();

    const lineupSelects = page.locator('select:not([disabled])');
    const firstLineupSelect = lineupSelects.nth(0);
    const secondLineupSelect = lineupSelects.nth(2);
    const secondNameBefore = await secondLineupSelect.inputValue();

    const firstLineupRow = firstLineupSelect.locator('xpath=../..');
    await firstLineupRow.getByRole('button').last().click();
    await expect(firstLineupSelect).toHaveValue(secondNameBefore);

    await page.getByRole('button', { name: /^BRACKET$/i }).click();
    await openTeamHub(page);
    await expect(firstLineupSelect).toHaveValue(secondNameBefore);

    const nextStarterButton = page.getByRole('button', { name: /NEXT STARTER/i }).first();
    const firstStarterBefore = await nextStarterButton.textContent();
    const makeNextButton = page.getByRole('button', { name: /MAKE NEXT/i }).first();
    await makeNextButton.click();
    await expect(nextStarterButton).not.toHaveText(firstStarterBefore ?? '');
  });
});
