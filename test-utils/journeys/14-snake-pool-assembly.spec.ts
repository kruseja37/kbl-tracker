import { expect, test, type Page } from '@playwright/test';

const LEAGUE_ID = 'e2e-snake-pool-assembly';
const ARCHETYPES = [
  'murderers-row',
  'whiteyball',
  'flamethrowers',
  'nasty-boys',
  'hdh-royals',
  'the-opener',
  'the-oriole-way',
  'junkball-surgeons',
] as const;

test.setTimeout(180_000);

async function seedPoolAssemblyLeague(page: Page): Promise<void> {
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
      name: 'Snake Pool Assembly Journey',
      teamIds,
      conferences: [],
      divisions: [],
      defaultRulesPreset: 'standard',
      draftFormat: 'snake',
      draftPoolMode: 'pool-first',
      tier: 'juiced',
      balanceMode: 'taxed',
      salaryCap: tiers.TIER_CAPS.juiced.tierCap,
      sourceLeagueIds: ['sml'],
      snakeIncludeUnassignedSourcePlayers: false,
      poolAssemblyMode: 'full-sources',
      snakePoolSizeMultiplier: 1.35,
    });
  }, { leagueId: LEAGUE_ID, archetypes: [...ARCHETYPES] });
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const size = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll<HTMLElement>('body *')]
      .map((element) => ({
        tag: element.tagName,
        text: (element.getAttribute('aria-label') ?? element.textContent ?? '').trim().slice(0, 80),
        right: Math.round(element.getBoundingClientRect().right),
        width: Math.round(element.getBoundingClientRect().width),
        className: typeof element.className === 'string' ? element.className.slice(0, 100) : '',
      }))
      .filter((entry) => entry.right > document.documentElement.clientWidth + 1)
      .sort((left, right) => right.right - left.right)
      .slice(0, 8),
  }));
  expect(size.scrollWidth, JSON.stringify(size.offenders)).toBeLessThanOrEqual(size.clientWidth);
}

async function startMainThreadLatencyProbe(page: Page): Promise<void> {
  await page.evaluate(() => {
    const target = window as typeof window & {
      __snakeLatencyProbe?: { last: number; maxGap: number; timer: number };
    };
    if (target.__snakeLatencyProbe) window.clearInterval(target.__snakeLatencyProbe.timer);
    const startedAt = performance.now();
    const probe = { last: startedAt, maxGap: 0, timer: 0 };
    probe.timer = window.setInterval(() => {
      const now = performance.now();
      probe.maxGap = Math.max(probe.maxGap, now - probe.last);
      probe.last = now;
    }, 50);
    target.__snakeLatencyProbe = probe;
  });
}

async function readMainThreadMaxGap(page: Page): Promise<number> {
  return page.evaluate(() => {
    const target = window as typeof window & {
      __snakeLatencyProbe?: { maxGap: number; timer: number };
    };
    const probe = target.__snakeLatencyProbe;
    if (!probe) return Number.POSITIVE_INFINITY;
    window.clearInterval(probe.timer);
    return probe.maxGap;
  });
}

for (const viewport of [
  { name: 'Mac', width: 1440, height: 1000 },
  { name: 'iPad landscape', width: 1024, height: 768 },
] as const) {
  test(`${viewport.name}: exact and shaped Snake pools survive the real setup route`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await seedPoolAssemblyLeague(page);
    await page.goto(`/league-builder/draft-setup?leagueId=${LEAGUE_ID}`);

    const assembly = page.getByTestId('snake-pool-assembly');
    await expect(assembly).toBeVisible();
    await expect(assembly.getByRole('button', { name: /TIGHT.*212/s })).toBeVisible();
    await expect(assembly.getByRole('button', { name: /COMPETITIVE.*238/s })).toBeVisible();
    await expect(assembly.getByRole('button', { name: /LOOSE.*264/s })).toBeVisible();
    await expect(assembly.getByRole('button', { name: /FULL SOURCES.*440/s })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Tight, Competitive, and Loose shape the selected sources')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    await page.getByRole('button', { name: 'BUILD FULL SOURCES' }).click();
    await expect(assembly).toContainText('440 IN POOL', { timeout: 60_000 });

    await assembly.getByRole('button', { name: /COMPETITIVE.*238/s }).click();
    await page.getByRole('button', { name: 'BUILD COMPETITIVE POOL' }).click();
    await expect(assembly).toContainText('238 IN POOL', { timeout: 90_000 });
    await page.reload();
    await expect(assembly.getByRole('button', { name: /COMPETITIVE.*238/s })).toHaveAttribute('aria-pressed', 'true');
    await expect(assembly).toContainText('238 IN POOL');

    await page.getByRole('button', { name: 'HELP' }).click();
    await expect(page.getByText('Tight, Competitive, and Loose shape the selected sources')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
}

test('Mac: SMB4 and Legends certify the exact four-club Snake room once per stable setup', async ({ page }) => {
  test.setTimeout(300_000);
  const pageErrors: string[] = [];
  const workerUrls: string[] = [];
  const journeyStartedAt = Date.now();
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('worker', (worker) => workerUrls.push(worker.url()));
  await page.addInitScript(() => {
    const target = window as typeof window & {
      __snakeProofRequests?: Array<Record<string, number | string | boolean>>;
    };
    target.__snakeProofRequests = [];
    const nativePostMessage = Worker.prototype.postMessage;
    const hash = (value: string): string => {
      let result = 2166136261;
      for (let index = 0; index < value.length; index += 1) {
        result ^= value.charCodeAt(index);
        result = Math.imul(result, 16777619);
      }
      return (result >>> 0).toString(16);
    };
    Worker.prototype.postMessage = function trackedPostMessage(message: unknown, ...rest: unknown[]) {
      const request = message as {
        key?: string;
        input?: {
          clubs?: unknown[];
          pool?: Array<{ playerId?: string }>;
          identityReferencePool?: unknown[];
          identitySupportCertificate?: unknown;
          baseCaps?: unknown;
        };
      };
      if (request.key?.startsWith('snake-setup-proof-v1:') && request.input) {
        const pool = request.input.pool ?? [];
        target.__snakeProofRequests?.push({
          atMs: Math.round(performance.now()),
          keyHash: hash(request.key),
          poolHash: hash(JSON.stringify(pool)),
          poolIdHash: hash(pool.map((player) => player.playerId ?? '').join('\n')),
          poolCount: pool.length,
          clubHash: hash(JSON.stringify(request.input.clubs ?? [])),
          identityReferenceCount: request.input.identityReferencePool?.length ?? 0,
          hasIdentitySupportCertificate: Boolean(request.input.identitySupportCertificate),
          baseCapsHash: hash(JSON.stringify(request.input.baseCaps ?? [])),
        });
      }
      Reflect.apply(nativePostMessage, this, [message, ...rest]);
    };
  });
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
  await page.evaluate(async ({ leagueId, archetypes }) => {
    const storage = await import('/src/utils/leagueBuilderStorage.ts');
    const legends = await import('/src/utils/historicalLegendsImport.ts');
    const tiers = await import('/src/data/tierParams.ts');
    await storage.seedFromSMB4Database(true);
    await legends.seedHistoricalLegendsDatabase();
    const source = await storage.getLeagueTemplate('sml');
    if (!source) throw new Error('SMB4 source league did not seed.');
    const sourceTeamIds = source.teamIds.slice(0, archetypes.length);
    const teamIds: string[] = [];
    const teams = await storage.getAllTeams();
    for (const [index, sourceTeamId] of sourceTeamIds.entries()) {
      const team = teams.find((candidate) => candidate.id === sourceTeamId);
      if (!team) throw new Error(`Seeded team ${sourceTeamId} is missing.`);
      const teamId = `${leagueId}-team-${index + 1}`;
      teamIds.push(teamId);
      await storage.saveTeam({
        ...team,
        id: teamId,
        name: `${team.name} Draft Club`,
        leagueIds: [leagueId],
        mlbArchetypeKey: archetypes[index],
        farmArchetypeKey: archetypes[(index + 1) % archetypes.length],
      });
    }
    await storage.saveLeagueTemplate({
      id: leagueId,
      name: 'Four-Club Large Source Snake Journey',
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
        'sml',
        'legends-library-draft',
        'legends-library-career',
        'legends-library-peak',
      ],
      snakeIncludeUnassignedSourcePlayers: true,
      poolAssemblyMode: 'full-sources',
      snakePoolSizeMultiplier: 1.35,
    });
  }, {
    leagueId: 'e2e-snake-four-large-source',
    archetypes: [
      'murderers-row',
      'the-oriole-way',
      'go-go-small-ball',
      'wheels-and-cannons',
    ],
  });
  const seededAt = Date.now();

  await page.goto('/league-builder/draft-setup?leagueId=e2e-snake-four-large-source');
  const assembly = page.getByTestId('snake-pool-assembly');
  await expect(assembly).toBeVisible();
  await expect(assembly.getByRole('button', { name: /FULL SOURCES.*1341/s })).toBeVisible();
  await expect(assembly).toContainText('0 IN POOL');
  await expect(page.getByRole('button', { name: 'BUILD FULL SOURCES' })).toBeEnabled();
  await expect(page.getByText("Checking every club's legal, affordable 22.")).toHaveCount(0);
  const proofWorkerCountBeforeBuild = workerUrls.filter((url) => url.includes('snakeSetupProof.worker')).length;
  await startMainThreadLatencyProbe(page);
  const proofStartedAt = Date.now();
  await page.getByRole('button', { name: 'BUILD FULL SOURCES' }).click();
  const helpStartedAt = Date.now();
  await page.getByRole('button', { name: 'HELP' }).click();
  await expect(page.getByText('Tight, Competitive, and Loose shape the selected sources')).toBeVisible({ timeout: 1_000 });
  const helpResponseMs = Date.now() - helpStartedAt;
  await page.getByRole('button', { name: 'HELP' }).click();
  await expect(assembly).toContainText('1341 IN POOL', { timeout: 120_000 });
  const proofMs = Date.now() - proofStartedAt;
  const mainThreadMaxGapMs = await readMainThreadMaxGap(page);
  const stableProofWorkerCount = workerUrls.filter((url) => (
    url.includes('snakeSetupProof.worker')
  )).length - proofWorkerCountBeforeBuild;

  await page.getByRole('button', { name: 'HELP' }).click();
  await expect(page.getByText('Tight, Competitive, and Loose shape the selected sources')).toBeVisible();
  await page.waitForTimeout(6_000);
  const proofWorkerCountAfterUnrelatedRender = workerUrls.filter((url) => (
    url.includes('snakeSetupProof.worker')
  )).length - proofWorkerCountBeforeBuild;
  const proofRequests = await page.evaluate(() => (
    (window as typeof window & {
      __snakeProofRequests?: Array<Record<string, number | string | boolean>>;
    }).__snakeProofRequests ?? []
  ));

  console.info('SNAKE_FOUR_LARGE_SOURCE_BROWSER', JSON.stringify({
    seedMs: seededAt - journeyStartedAt,
    proofMs,
    totalMs: Date.now() - journeyStartedAt,
    helpResponseMs,
    mainThreadMaxGapMs,
    proofWorkerCountBeforeBuild,
    stableProofWorkerCount,
    proofWorkerCountAfterUnrelatedRender,
    proofRequests,
    workers: workerUrls,
  }));
  expect(helpResponseMs).toBeLessThan(1_000);
  expect(mainThreadMaxGapMs).toBeLessThan(1_000);
  expect(stableProofWorkerCount).toBe(1);
  expect(proofWorkerCountAfterUnrelatedRender).toBe(stableProofWorkerCount);
  expect(pageErrors).toEqual([]);
  await expectNoHorizontalOverflow(page);

  await expect(page.getByRole('button', { name: 'BUILD FULL SOURCES' })).toBeEnabled({ timeout: 30_000 });
  await expect(assembly).toContainText('BUILT FULL SELECTED SOURCES');
  const lockButton = page.getByRole('button', { name: 'LOCK POOL' });
  await expect(lockButton).toBeEnabled();
  const gmInputs = page.getByLabel(/GM NAME$/);
  await expect(gmInputs).toHaveCount(4);
  for (let index = 0; index < 4; index += 1) {
    if (!(await gmInputs.nth(index).inputValue()).trim()) {
      await gmInputs.nth(index).fill(`GM ${index + 1}`);
    }
  }
  await lockButton.click();
  await expect(page.getByRole('button', { name: 'UNLOCK POOL' })).toBeVisible();
  const enterButton = page.getByRole('button', { name: 'ENTER SNAKE DRAFT' });
  await expect(enterButton).toBeEnabled();
  await enterButton.click();
  await expect(page).toHaveURL(/\/snake-room\?leagueId=e2e-snake-four-large-source/);
});

test('Mac: combined SML, MLB, and Legends sources certify an eight-club Snake room', async ({ page }) => {
  test.setTimeout(300_000);
  const journeyStartedAt = Date.now();
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
  await page.evaluate(async ({ leagueId, archetypes }) => {
    const storage = await import('/src/utils/leagueBuilderStorage.ts');
    const legends = await import('/src/utils/historicalLegendsImport.ts');
    const tiers = await import('/src/data/tierParams.ts');
    await storage.seedFromSMB4Database(true);
    await storage.seedFromMLBDatabase(false);
    await legends.seedHistoricalLegendsDatabase();
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
      name: 'Large Source Snake Journey',
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
        'sml',
        'mlb',
        'legends-library-draft',
        'legends-library-career',
        'legends-library-peak',
      ],
      snakeIncludeUnassignedSourcePlayers: true,
      poolAssemblyMode: 'full-sources',
      snakePoolSizeMultiplier: 1.35,
    });
  }, {
    leagueId: 'e2e-snake-large-source',
    archetypes: [...ARCHETYPES],
  });
  const seededAt = Date.now();

  await page.goto('/league-builder/draft-setup?leagueId=e2e-snake-large-source');
  const workerUrls: string[] = [];
  page.on('worker', (worker) => workerUrls.push(worker.url()));
  const assembly = page.getByTestId('snake-pool-assembly');
  await expect(assembly).toBeVisible();
  await expect(assembly.getByRole('button', { name: /FULL SOURCES.*2001/s })).toBeVisible();
  await startMainThreadLatencyProbe(page);
  await page.getByRole('button', { name: 'BUILD FULL SOURCES' }).click();
  await expect(assembly).toContainText('2001 IN POOL', { timeout: 120_000 });
  const fullSourcesMainThreadMaxGapMs = await readMainThreadMaxGap(page);
  const fullBuiltAt = Date.now();

  await assembly.getByRole('button', { name: /TIGHT.*212/s }).click();
  await startMainThreadLatencyProbe(page);
  await page.getByRole('button', { name: 'BUILD TIGHT POOL' }).click();
  await expect(assembly).toContainText('212 IN POOL', { timeout: 120_000 });
  const tightMainThreadMaxGapMs = await readMainThreadMaxGap(page);
  expect(fullSourcesMainThreadMaxGapMs).toBeLessThan(1_000);
  expect(tightMainThreadMaxGapMs).toBeLessThan(1_000);
  await expectNoHorizontalOverflow(page);
  console.info('SNAKE_LARGE_SOURCE_BROWSER', JSON.stringify({
    seedMs: seededAt - journeyStartedAt,
    fullSourcesMs: fullBuiltAt - seededAt,
    tightMs: Date.now() - fullBuiltAt,
    totalMs: Date.now() - journeyStartedAt,
    fullSourcesMainThreadMaxGapMs,
    tightMainThreadMaxGapMs,
    workers: workerUrls,
  }));
});
