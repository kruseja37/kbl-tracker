import { expect, test, type Page } from '@playwright/test';

const LEAGUE_ID = 'e2e-snake-pool-performance';
const ARCHETYPES = ['murderers-row', 'whiteyball'] as const;

test.setTimeout(180_000);

async function seedPerformanceLeague(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    const databases = await indexedDB.databases();
    await Promise.all(databases.map((database) => new Promise<void>((resolve) => {
      if (!database.name) return resolve();
      const request = indexedDB.deleteDatabase(database.name);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    })));
  });

  await page.evaluate(async ({ leagueId, archetypes }) => {
    const storage = await import('/src/utils/leagueBuilderStorage.ts');
    const tiers = await import('/src/data/tierParams.ts');
    await storage.seedFromSMB4Database(true);
    const source = await storage.getLeagueTemplate('sml');
    if (!source) throw new Error('SMB4 source league did not seed.');
    const teamIds = source.teamIds.slice(0, archetypes.length);
    const teams = await storage.getAllTeams();
    for (const [index, teamId] of teamIds.entries()) {
      const team = teams.find((candidate) => candidate.id === teamId);
      if (!team) throw new Error(`Seeded team ${teamId} is missing.`);
      await storage.saveTeam({
        ...team,
        leagueIds: [...new Set([...(team.leagueIds ?? []), leagueId])],
        mlbArchetypeKey: archetypes[index],
        farmArchetypeKey: archetypes[(index + 1) % archetypes.length],
      });
    }
    await storage.saveLeagueTemplate({
      id: leagueId,
      name: 'Snake Pool Performance Journey',
      teamIds,
      conferences: [],
      divisions: [],
      defaultRulesPreset: 'standard',
      draftFormat: 'snake',
      draftPoolMode: 'pool-first',
      tier: 'standard',
      balanceMode: 'taxed',
      salaryCap: tiers.TIER_CAPS.standard.tierCap,
      sourceLeagueIds: ['sml'],
      snakeIncludeUnassignedSourcePlayers: false,
      poolAssemblyMode: 'full-sources',
      snakePoolSizeMultiplier: 1.35,
    });
  }, { leagueId: LEAGUE_ID, archetypes: [...ARCHETYPES] });
}

async function startResponsivenessProbe(page: Page): Promise<void> {
  await page.evaluate(() => {
    const sample = {
      animationFrames: 0,
      maxFrameGapMs: 0,
      longTasks: [] as number[],
      startedAt: performance.now(),
    };
    (window as typeof window & { __snakeSetupPerformance?: typeof sample }).__snakeSetupPerformance = sample;
    let previous = sample.startedAt;
    const tick = (now: number) => {
      sample.animationFrames += 1;
      sample.maxFrameGapMs = Math.max(sample.maxFrameGapMs, now - previous);
      previous = now;
      if (now - sample.startedAt < 1_500) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) sample.longTasks.push(entry.duration);
        });
        observer.observe({ type: 'longtask', buffered: true });
        window.setTimeout(() => observer.disconnect(), 1_600);
      } catch {
        // Long-task entries are not exposed by every browser build; frame cadence remains the gate.
      }
    }
  });
}

async function readResponsivenessProbe(page: Page): Promise<{
  animationFrames: number;
  maxFrameGapMs: number;
  longTasks: number[];
}> {
  await page.waitForTimeout(1_700);
  return page.evaluate(() => {
    const sample = (window as typeof window & {
      __snakeSetupPerformance?: {
        animationFrames: number;
        maxFrameGapMs: number;
        longTasks: number[];
      };
    }).__snakeSetupPerformance;
    if (!sample) throw new Error('Snake setup responsiveness probe did not start.');
    return {
      animationFrames: sample.animationFrames,
      maxFrameGapMs: sample.maxFrameGapMs,
      longTasks: sample.longTasks,
    };
  });
}

for (const viewport of [
  { name: 'Mac', width: 1440, height: 1000 },
  { name: 'iPad landscape', width: 1024, height: 768 },
] as const) {
  test(`${viewport.name}: two-club Full and Loose builds keep the UI responsive`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await seedPerformanceLeague(page);
    await page.goto(`/league-builder/draft-setup?leagueId=${LEAGUE_ID}`);

    const assembly = page.getByTestId('snake-pool-assembly');
    await expect(assembly).toBeVisible();
    await expect(assembly.getByRole('button', { name: /LOOSE.*66/s })).toBeVisible();
    await expect(assembly.getByRole('button', { name: /FULL SOURCES.*440/s })).toBeVisible();

    await startResponsivenessProbe(page);
    const fullClickStarted = performance.now();
    await page.getByRole('button', { name: 'BUILD FULL SOURCES' }).click();
    expect(performance.now() - fullClickStarted).toBeLessThan(750);

    const helpClickStarted = performance.now();
    await page.getByRole('button', { name: 'HELP' }).click();
    await expect(page.getByText(/Tight, Competitive, and Loose first shape the selected sources/)).toBeVisible({ timeout: 1_000 });
    expect(performance.now() - helpClickStarted).toBeLessThan(1_000);
    const fullProbe = await readResponsivenessProbe(page);
    expect(fullProbe.animationFrames).toBeGreaterThanOrEqual(30);
    expect(fullProbe.maxFrameGapMs).toBeLessThan(250);
    expect(Math.max(0, ...fullProbe.longTasks)).toBeLessThan(250);
    await page.getByRole('button', { name: 'HELP' }).click();
    await expect(assembly).toContainText('440 IN POOL', { timeout: 90_000 });
    await expect(assembly.getByText(/^BUILT FULL SELECTED SOURCES/)).toBeVisible();
    const fullElapsedMs = performance.now() - fullClickStarted;

    await assembly.getByRole('button', { name: /LOOSE.*66/s }).click();
    await startResponsivenessProbe(page);
    const looseClickStarted = performance.now();
    await page.getByRole('button', { name: 'BUILD LOOSE POOL' }).click();
    expect(performance.now() - looseClickStarted).toBeLessThan(750);
    const looseProbe = await readResponsivenessProbe(page);
    expect(looseProbe.animationFrames).toBeGreaterThanOrEqual(30);
    expect(looseProbe.maxFrameGapMs).toBeLessThan(250);
    expect(Math.max(0, ...looseProbe.longTasks)).toBeLessThan(250);
    await expect(assembly).toContainText(
      /BUILT (LOOSE SHAPED BUILD|FULL SELECTED SOURCES · AUTO-WIDENED FROM LOOSE)/,
      { timeout: 90_000 },
    );
    await expect(assembly).toContainText(/(66|440) IN POOL/);
    const looseElapsedMs = performance.now() - looseClickStarted;
    const terminalAssembly = (await assembly.textContent())?.replace(/\s+/g, ' ').trim();
    console.log(JSON.stringify({
      viewport: viewport.name,
      fullElapsedMs: Math.round(fullElapsedMs),
      fullProbe,
      looseElapsedMs: Math.round(looseElapsedMs),
      looseProbe,
      terminalAssembly,
    }));
    expect(pageErrors).toEqual([]);
  });
}

test('Mac: two-club Legends Full Sources reaches Lock without a second unresolved gate', async ({ page }) => {
  test.setTimeout(180_000);
  const leagueId = 'e2e-snake-legends-lock';
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    const databases = await indexedDB.databases();
    await Promise.all(databases.map((database) => new Promise<void>((resolve) => {
      if (!database.name) return resolve();
      const request = indexedDB.deleteDatabase(database.name);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    })));
  });
  await page.evaluate(async ({ targetLeagueId }) => {
    const storage = await import('/src/utils/leagueBuilderStorage.ts');
    const legends = await import('/src/utils/historicalLegendsImport.ts');
    const tiers = await import('/src/data/tierParams.ts');
    await storage.seedFromSMB4Database(true);
    await legends.seedHistoricalLegendsDatabase();
    const stock = await storage.getLeagueTemplate('sml');
    if (!stock) throw new Error('SMB4 source league did not seed.');
    const stockTeams = await storage.getAllTeams();
    const identities = ['nasty-boys', 'flamethrowers'];
    const teamIds: string[] = [];
    for (const [index, stockTeamId] of stock.teamIds.slice(0, 2).entries()) {
      const stockTeam = stockTeams.find((team) => team.id === stockTeamId);
      if (!stockTeam) throw new Error(`Seeded team ${stockTeamId} is missing.`);
      const teamId = `${targetLeagueId}-team-${index + 1}`;
      teamIds.push(teamId);
      await storage.saveTeam({
        ...stockTeam,
        id: teamId,
        name: `Legends Lock Club ${index + 1}`,
        leagueIds: [targetLeagueId],
        mlbArchetypeKey: identities[index],
        farmArchetypeKey: identities[(index + 1) % identities.length],
      });
    }
    await storage.saveLeagueTemplate({
      id: targetLeagueId,
      name: 'Legends Lock Journey',
      teamIds,
      conferences: [],
      divisions: [],
      defaultRulesPreset: 'standard',
      draftFormat: 'snake',
      draftPoolMode: 'pool-first',
      tier: 'standard',
      balanceMode: 'taxed',
      salaryCap: tiers.TIER_CAPS.standard.tierCap,
      sourceLeagueIds: [
        'legends-library-draft',
        'legends-library-career',
        'legends-library-peak',
      ],
      snakeIncludeUnassignedSourcePlayers: false,
      poolAssemblyMode: 'full-sources',
      snakePoolSizeMultiplier: 1.5,
    });
  }, { targetLeagueId: leagueId });

  await page.goto(`/league-builder/draft-setup?leagueId=${leagueId}`);
  const assembly = page.getByTestId('snake-pool-assembly');
  await expect(assembly.getByRole('button', { name: /FULL SOURCES.*835/s })).toBeVisible();
  await page.getByRole('button', { name: 'BUILD FULL SOURCES' }).click();
  await expect(assembly.getByText(/^BUILT FULL SELECTED SOURCES/)).toBeVisible({ timeout: 120_000 });
  await expect(assembly).toContainText('835 IN POOL');
  await expect(page.getByRole('button', { name: 'LOCK POOL' })).toBeEnabled({ timeout: 60_000 });

  await assembly.getByRole('button', { name: /LOOSE.*66/s }).click();
  await page.getByRole('button', { name: 'BUILD LOOSE POOL' }).click();
  await expect(assembly).toContainText(/BUILT (LOOSE SHAPED BUILD|FULL SELECTED SOURCES · AUTO-WIDENED FROM LOOSE)/, {
    timeout: 120_000,
  });
  const inPoolPanel = page.getByText('IN THE POOL (66)').locator('..');
  const positionFilter = inPoolPanel.getByRole('combobox');
  await positionFilter.selectOption('RP');
  const ordinaryRelieverCount = await inPoolPanel.getByRole('button', { name: / RP \$[\d,]+$/ }).count();
  await positionFilter.selectOption('SP/RP');
  const swingRelieverCount = await inPoolPanel.getByRole('button', { name: / SP\/RP \$[\d,]+$/ }).count();
  await positionFilter.selectOption('CP');
  const closerCount = await inPoolPanel.getByRole('button', { name: / CP \$[\d,]+$/ }).count();
  expect(ordinaryRelieverCount + swingRelieverCount).toBeGreaterThanOrEqual(8);
  expect(closerCount).toBeGreaterThanOrEqual(3);
  await expect(assembly.getByText(/Remove \d+ CP.*to balance rosters\./)).toBeVisible();
  const lockButton = page.getByRole('button', { name: 'LOCK POOL' });
  await expect(lockButton).toBeEnabled({ timeout: 60_000 });
  const gmInputs = page.getByLabel(/GM NAME$/);
  for (let index = 0; index < await gmInputs.count(); index += 1) {
    await gmInputs.nth(index).fill(`Legends GM ${index + 1}`);
  }
  await lockButton.click();
  await expect(page.getByRole('button', { name: 'UNLOCK POOL' })).toBeVisible();
  const enterDraftButton = page.getByRole('button', { name: 'ENTER SNAKE DRAFT' });
  await expect(enterDraftButton).toBeEnabled({ timeout: 60_000 });
  await enterDraftButton.click();
  await expect(page).toHaveURL(/\/snake-room(?:\?|$)/, { timeout: 60_000 });
});
