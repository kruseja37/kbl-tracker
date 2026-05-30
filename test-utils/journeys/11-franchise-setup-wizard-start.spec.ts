import { test, expect, type Page } from '@playwright/test';

test.setTimeout(90_000);

async function clearBrowserDatabases(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(async () => {
    window.localStorage.clear();
    window.sessionStorage.clear();

    const dbs = await indexedDB.databases();
    await Promise.all(
      dbs.map((db) => new Promise<void>((resolve) => {
        if (!db.name) {
          resolve();
          return;
        }
        const request = indexedDB.deleteDatabase(db.name);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
        request.onblocked = () => resolve();
      })),
    );
  });
}

async function seedTwoTeamLeagueBuilderLeague(page: Page): Promise<void> {
  await clearBrowserDatabases(page);

  await page.evaluate(async () => {
    const leagueBuilderStorage = await import('/src/utils/leagueBuilderStorage.ts');

    const leagueId = 'e2e-franchise-setup-wizard-league';
    const now = '2026-05-28T00:00:00.000Z';
    const teamIds = ['wizard-away', 'wizard-home'];
    const lineupPositions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
    const benchPositions = ['C', 'IF', 'OF', '1B/OF'];
    const pitcherPositions = ['SP', 'SP', 'SP', 'SP', 'RP', 'RP', 'RP', 'CP', 'SP/RP'];
    const isPitcher = (position: string) => ['SP', 'RP', 'CP', 'SP/RP', 'P'].includes(position);

    const makePlayer = (teamId: string, index: number, primaryPosition: string) => ({
      id: `${teamId}-mlb-${isPitcher(primaryPosition) ? 'p' : 'b'}-${String(index).padStart(2, '0')}`,
      firstName: isPitcher(primaryPosition) ? `Pitcher${index}` : `Batter${index}`,
      lastName: teamId,
      gender: 'M',
      jerseyNumber: index,
      age: 24 + (index % 8),
      bats: index % 2 === 0 ? 'L' : 'R',
      throws: isPitcher(primaryPosition) || index % 2 === 1 ? 'R' : 'L',
      primaryPosition,
      secondaryPosition: isPitcher(primaryPosition) ? 'P' : 'IF',
      power: isPitcher(primaryPosition) ? 20 + index : 58 + index,
      contact: isPitcher(primaryPosition) ? 20 + index : 63 + index,
      speed: isPitcher(primaryPosition) ? 24 : 48 + index,
      fielding: 62 + (index % 12),
      arm: 62 + (index % 10),
      velocity: isPitcher(primaryPosition) ? 78 + index : 0,
      junk: isPitcher(primaryPosition) ? 70 + index : 0,
      accuracy: isPitcher(primaryPosition) ? 72 + index : 0,
      arsenal: isPitcher(primaryPosition) ? ['4F', 'SL', 'CH'] : [],
      overallGrade: 'B',
      personality: 'Competitive',
      chemistry: 'Competitive',
      morale: 50,
      mojo: 'Normal',
      fame: 0,
      salary: 1_000_000,
      leagueAssignments: [{ leagueId, teamId, rosterStatus: 'MLB' }],
      createdDate: now,
      lastModified: now,
      isCustom: true,
      sourceDatabase: 'franchise-setup-wizard-browser-smoke',
    });

    for (const [teamIndex, teamId] of teamIds.entries()) {
      const batterIds = lineupPositions.map((_position, index) => `${teamId}-mlb-b-${String(index + 1).padStart(2, '0')}`);
      const benchIds = benchPositions.map((_position, index) => `${teamId}-mlb-b-${String(lineupPositions.length + index + 1).padStart(2, '0')}`);
      const pitcherIds = pitcherPositions.map((_position, index) => `${teamId}-mlb-p-${String(index + 1).padStart(2, '0')}`);

      await leagueBuilderStorage.saveTeam({
        id: teamId,
        name: teamIndex === 0 ? 'Wizard Away' : 'Wizard Home',
        abbreviation: teamIndex === 0 ? 'WIZ-A' : 'WIZ-H',
        location: 'Wizard City',
        nickname: teamIndex === 0 ? 'Away' : 'Home',
        colors: { primary: teamIndex === 0 ? '#345995' : '#7D4F50', secondary: '#EAC435' },
        stadium: teamIndex === 0 ? 'Wizard Away Park' : 'Wizard Home Park',
        leagueIds: [leagueId],
        lineupWithDH: lineupPositions.map((fieldingPosition, index) => ({
          battingOrder: index + 1,
          playerId: batterIds[index],
          fieldingPosition,
        })),
        lineupWithoutDH: [
          ...lineupPositions.slice(0, 8).map((fieldingPosition, index) => ({
            battingOrder: index + 1,
            playerId: batterIds[index],
            fieldingPosition,
          })),
          { battingOrder: 9, playerId: pitcherIds[0], fieldingPosition: 'P' },
        ],
        startingRotation: [pitcherIds[0], pitcherIds[1], pitcherIds[2], pitcherIds[3]],
      } as any);

      for (const [index, position] of lineupPositions.entries()) {
        await leagueBuilderStorage.savePlayer(makePlayer(teamId, index + 1, position));
      }
      for (const [index, position] of benchPositions.entries()) {
        await leagueBuilderStorage.savePlayer(makePlayer(teamId, lineupPositions.length + index + 1, position));
      }
      for (const [index, position] of pitcherPositions.entries()) {
        await leagueBuilderStorage.savePlayer(makePlayer(teamId, index + 1, position));
      }

      await leagueBuilderStorage.saveTeamRoster({
        teamId,
        mlbRoster: [...batterIds, ...benchIds, ...pitcherIds],
        farmRoster: [],
        lineupWithDH: lineupPositions.map((fieldingPosition, index) => ({
          battingOrder: index + 1,
          playerId: batterIds[index],
          fieldingPosition,
        })),
        lineupWithoutDH: [
          ...lineupPositions.slice(0, 8).map((fieldingPosition, index) => ({
            battingOrder: index + 1,
            playerId: batterIds[index],
            fieldingPosition,
          })),
          { battingOrder: 9, playerId: pitcherIds[0], fieldingPosition: 'P' },
        ],
        startingRotation: [pitcherIds[0], pitcherIds[1], pitcherIds[2], pitcherIds[3]],
        longRelievers: [],
        closingPitcher: pitcherIds[7],
        setupPitchers: [pitcherIds[6]],
        depthChart: {
          C: [],
          '1B': [],
          '2B': [],
          SS: [],
          '3B': [],
          LF: [],
          CF: [],
          RF: [],
          DH: [],
          SP: [],
          RP: [],
          CP: [],
        },
        pinchHitOrder: benchIds,
        pinchRunOrder: benchIds,
        defensiveSubOrder: benchIds,
        lastModified: now,
      });
    }

    await leagueBuilderStorage.saveLeagueTemplate({
      id: leagueId,
      name: 'Franchise Setup Wizard Smoke League',
      teamIds,
      conferences: [],
      divisions: [],
      defaultRulesPreset: 'default',
      createdDate: now,
      lastModified: now,
    } as any);
  });
}

test('prepared League Builder startup farm draft can create franchise through the visible setup wizard', async ({ page }) => {
  await seedTwoTeamLeagueBuilderLeague(page);

  await page.goto('/league-builder/draft');
  await expect(page.getByRole('heading', { name: 'STARTUP SCOUT + PROSPECT DRAFT', exact: true })).toBeVisible();
  await page.getByLabel(/DETERMINISTIC SEED/i).fill('franchise-setup-wizard-smoke');
  await page.getByRole('button', { name: /BEGIN SCOUT DRAFT/i }).click();
  for (let index = 0; index < 4; index += 1) {
    await expect(page.getByText(/ON THE CLOCK:/i)).toBeVisible({ timeout: 60_000 });
    await page.getByRole('button', { name: /HIRE SCOUT/i }).first().click();
  }
  await expect(page.getByText('PROSPECT DRAFT BOARD')).toBeVisible({ timeout: 60_000 });
  for (let index = 0; index < 20; index += 1) {
    await expect(page.getByRole('button', { name: /DRAFT TO FARM/i }).first()).toBeVisible({ timeout: 60_000 });
    await page.getByRole('button', { name: /DRAFT TO FARM/i }).first().click();
  }
  await expect(page.getByText('PREPARED', { exact: true })).toBeVisible({ timeout: 60_000 });

  await page.goto('/franchise/setup');
  await page.getByText('FRANCHISE SETUP WIZARD SMOKE LEAGUE').click();
  await page.getByRole('button', { name: /NEXT/i }).click();
  await page.getByRole('button', { name: /NEXT/i }).click();
  await page.getByRole('button', { name: /NEXT/i }).click();
  await page.getByText('WIZARD AWAY').click();
  await page.getByRole('button', { name: /NEXT/i }).click();
  await expect(page.getByText(/League Builder farm\/scouting state is prepared/i)).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: /NEXT/i }).click();
  await page.getByPlaceholder(/Enter franchise name/i).fill('Wizard Smoke Franchise');
  await page.getByRole('button', { name: /START FRANCHISE/i }).click();

  await expect(page).toHaveURL(/\/franchise\/[^/]+$/, { timeout: 60_000 });
  await expect(page.getByText(/NO GAMES SCHEDULED/i)).toBeVisible({ timeout: 60_000 });
});
