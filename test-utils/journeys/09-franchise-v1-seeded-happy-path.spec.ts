import { test, expect, type Page } from '@playwright/test';

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

async function seedFranchiseV1HappyPath(page: Page) {
  await clearBrowserDatabases(page);

  return page.evaluate(async () => {
    const leagueBuilderStorage = await import('/src/utils/leagueBuilderStorage.ts');
    const startupFarmDraft = await import('/src/utils/leagueBuilderStartupFarmDraft.ts');
    const franchiseInitializer = await import('/src/utils/franchiseInitializer.ts');
    const franchisePlayerStorage = await import('/src/utils/franchisePlayerStorage.ts');
    const scheduleStorage = await import('/src/utils/scheduleStorage.ts');
    const franchiseContract = await import('/src/utils/franchisePersistenceContract.ts');

    const leagueId = 'e2e-franchise-v1-league';
    const awayTeamId = 'e2e-away';
    const homeTeamId = 'e2e-home';
    const now = '2026-05-28T00:00:00.000Z';

    const isPitcher = (position: string) => ['SP', 'RP', 'CP', 'SP/RP', 'P'].includes(position);

    const makePlayer = (
      teamId: string,
      index: number,
      primaryPosition: string,
      rosterStatus: 'MLB' | 'FARM' = 'MLB',
    ) => ({
      id: `${teamId}-${rosterStatus.toLowerCase()}-${isPitcher(primaryPosition) ? 'p' : 'b'}-${index}`,
      firstName: rosterStatus === 'FARM' ? `Farm${index}` : isPitcher(primaryPosition) ? `Pitcher${index}` : `Batter${index}`,
      lastName: teamId,
      gender: 'M',
      jerseyNumber: index,
      age: rosterStatus === 'FARM' ? 20 + (index % 4) : 26 + (index % 5),
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
      leagueAssignments: [{ leagueId, teamId, rosterStatus }],
      createdDate: now,
      lastModified: now,
      isCustom: true,
      sourceDatabase: 'franchise-v1-seeded-smoke',
    });

    const seedTeam = async (teamId: string, name: string) => {
      const lineupPositions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
      const benchPositions = ['C', 'IF', 'OF', '1B/OF'];
      const pitcherPositions = ['SP', 'SP', 'SP', 'SP', 'RP', 'RP', 'RP', 'CP', 'SP/RP'];
      const batterIds = lineupPositions.map((_position, index) => `${teamId}-mlb-b-${index + 1}`);
      const benchIds = benchPositions.map((_position, index) => `${teamId}-mlb-b-${lineupPositions.length + index + 1}`);
      const pitcherIds = pitcherPositions.map((_position, index) => `${teamId}-mlb-p-${index + 1}`);

      await leagueBuilderStorage.saveTeam({
        id: teamId,
        name,
        abbreviation: teamId === awayTeamId ? 'AWY' : 'HME',
        location: 'Seed City',
        nickname: name,
        colors: { primary: '#123456', secondary: '#abcdef' },
        stadium: `${name} Park`,
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
        startingRotation: [pitcherIds[0], pitcherIds[1]],
      });

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
        startingRotation: [pitcherIds[0], pitcherIds[1]],
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

      return { batterIds, pitcherIds };
    };

    const awaySeed = await seedTeam(awayTeamId, 'Seed Away');
    const homeSeed = await seedTeam(homeTeamId, 'Seed Home');

    await leagueBuilderStorage.saveLeagueTemplate({
      id: leagueId,
      name: 'Franchise V1 Seed League',
      teamIds: [awayTeamId, homeTeamId],
      conferences: [],
      divisions: [],
      defaultRulesPreset: 'default',
    });

    let draftView = await startupFarmDraft.createLeagueBuilderStartupDraftSession({
      leagueId,
      seasonNumber: 1,
      seed: 'franchise-v1-browser-smoke',
      scoutOrder: [awayTeamId, homeTeamId],
    });
    if (draftView.blockers.length > 0) {
      throw new Error(`Startup scout draft blocked: ${draftView.blockers.join(' ')}`);
    }
    while (!draftView.scoutDraftComplete) {
      const scout = draftView.availableScouts[0];
      if (!scout) throw new Error('Startup scout draft ran out of available scouts.');
      draftView = await startupFarmDraft.draftLeagueBuilderScout({
        leagueId,
        seasonNumber: 1,
        scoutId: scout.id,
      });
    }
    while (!draftView.prospectDraftComplete) {
      const prospect = draftView.prospectBoard[0];
      if (!prospect) throw new Error('Startup prospect draft board is empty before all vacancies are filled.');
      draftView = await startupFarmDraft.confirmLeagueBuilderProspectPick({
        leagueId,
        seasonNumber: 1,
        candidateId: prospect.candidateId,
      });
    }

    const preparedPreview = await startupFarmDraft.createLeagueBuilderStartupFarmDraftPreview(leagueId, {
      seasonNumber: 1,
      seed: 'franchise-v1-browser-smoke',
    });
    const preparedView = await startupFarmDraft.getLeagueBuilderStartupDraftView(leagueId, 1);
    if (!preparedPreview.prepared || preparedPreview.totalVacancies !== 0 || !preparedView.prepared) {
      throw new Error(`Prepared League Builder state was not detected: ${JSON.stringify({
        preview: preparedPreview,
        view: {
          prepared: preparedView.prepared,
          blockers: preparedView.blockers,
          completedPicks: preparedView.completedPicks.length,
        },
      })}`);
    }

    const leaguePlayers = await leagueBuilderStorage.getAllPlayers();
    const farmPlayers = leaguePlayers.filter((player: any) =>
      player.leagueAssignments?.some((assignment: any) =>
        assignment.leagueId === leagueId && assignment.rosterStatus === 'FARM',
      ),
    );
    if (farmPlayers.length !== 20) {
      throw new Error(`Expected 20 FARM players after startup draft; found ${farmPlayers.length}.`);
    }
    if (farmPlayers.some((player: any) => player.ratingRevealState !== 'hidden')) {
      throw new Error('Startup FARM draft created a FARM player without hidden reveal state.');
    }
    if (farmPlayers.some((player: any) => !player.prospectProfile?.scoutedGrade || !player.prospectProfile?.scoutConfidence)) {
      throw new Error('Startup FARM draft created a FARM player without visible-safe scouting metadata.');
    }

    const franchiseId = await franchiseInitializer.initializeFranchise({
      franchiseName: 'Franchise V1 Browser Smoke',
      league: leagueId,
      leagueDetails: {
        name: 'Franchise V1 Seed League',
        teams: 2,
        conferences: 1,
        divisions: 1,
      },
      season: {
        gamesPerTeam: 1,
        inningsPerGame: 9,
        extraInningsRule: 'standard',
        scheduleType: 'balanced',
        useDH: false,
        allStarGame: false,
        tradeDeadline: false,
        mercyRule: false,
      },
      playoffs: {
        teamsQualifying: 2,
        format: 'conference',
        seriesLengths: {
          wildCard: 'best-of-3',
          divisionSeries: 'best-of-5',
          championship: 'best-of-7',
          worldSeries: 'best-of-7',
        },
        homeFieldAdvantage: 'higher-seed',
      },
      teams: {
        selectedTeams: [awayTeamId],
        mode: 'single',
        playerAssignments: {},
      },
      roster: { mode: 'existing' },
    } as any);

    const initialSchedule = await scheduleStorage.getAllGamesByFranchise(franchiseId, 1);
    if (initialSchedule.length !== 0) {
      throw new Error(`initializeFranchise generated schedule rows unexpectedly: ${initialSchedule.length}`);
    }

    const seasonId = franchiseContract.getFranchiseSeasonId(franchiseId, 1);
    const manualGame = await scheduleStorage.addGame({
      franchiseId,
      seasonId,
      statsScopeId: seasonId,
      seasonNumber: 1,
      gameNumber: 1,
      dayNumber: 1,
      awayTeamId,
      homeTeamId,
      source: 'manual',
      notes: 'Seeded browser smoke manual game',
    });

    const franchisePlayers = await franchisePlayerStorage.getAllFranchisePlayers(franchiseId);
    const franchiseFarmPlayerIds = franchisePlayers
      .filter((player: any) =>
        player.leagueAssignments?.some((assignment: any) =>
          assignment.leagueId === leagueId && assignment.rosterStatus === 'FARM',
        ),
      )
      .map((player: any) => player.id);

    return {
      leagueId,
      franchiseId,
      seasonId,
      awayTeamId,
      homeTeamId,
      awayStarterA: awaySeed.pitcherIds[0],
      awayStarterB: awaySeed.pitcherIds[1],
      homeStarterA: homeSeed.pitcherIds[0],
      manualGameId: manualGame.id,
      farmPlayerIds: franchiseFarmPlayerIds,
      startupDraftCreated: draftView.completedPicks.length,
      preparedFarmCount: farmPlayers.length,
    };
  });
}

test.describe('Journey 9: Franchise v1 seeded happy path', () => {
  test('League Builder FARM draft to Team Hub save to no-DH GameTracker launch', async ({ page }) => {
    const seed = await seedFranchiseV1HappyPath(page);

    expect(seed.startupDraftCreated).toBe(20);
    expect(seed.preparedFarmCount).toBe(20);
    expect(seed.farmPlayerIds).toHaveLength(20);

    await page.goto('/league-builder/draft');
    await expect(page.getByRole('heading', { name: 'STARTUP SCOUT + PROSPECT DRAFT', exact: true })).toBeVisible();
    await expect(page.getByText('PREPARED', { exact: true })).toBeVisible();
    await expect(page.getByText(/two hired scouts and 10 hidden-safe FARM prospects/i)).toBeVisible();

    await page.goto('/franchise/setup');
    await expect(page.getByText(/NEW FRANCHISE/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /FRANCHISE V1 SEED LEAGUE/i })).toBeVisible();

    await page.goto(`/franchise/${seed.franchiseId}`);
    await expect(page.getByRole('button', { name: /TEAM HUB/i })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /TEAM HUB/i }).click();
    await page.getByRole('button', { name: /^ROSTER$/i }).click();

    const mlbTable = page.getByRole('table', { name: /MLB roster table/i });
    const farmRegion = page.getByRole('region', { name: /Franchise FARM prospects/i });
    const manager = page.getByRole('region', { name: /Franchise lineup and rotation manager/i });

    await expect(mlbTable).toBeVisible();
    await expect(farmRegion).toBeVisible();
    await expect(farmRegion.getByText(/Scouted:/i).first()).toBeVisible();
    await expect(farmRegion.getByText(/Confidence:/i).first()).toBeVisible();
    await expect(farmRegion.getByText(/^HIDDEN$/i).first()).toBeVisible();
    await expect(farmRegion.getByText(/trueGrade|hiddenPersonalityModifiers|Leadership|Volatility/i)).toHaveCount(0);
    await expect(manager).toBeVisible();

    await manager.getByRole('button', { name: /Move rotation pitcher 2 up/i }).click();
    await manager.getByRole('button', { name: /SAVE LINEUP \+ ROTATION/i }).click();
    await expect.poll(async () => page.evaluate(async ({ franchiseId, awayTeamId }) => {
      const franchisePlayerStorage = await import('/src/utils/franchisePlayerStorage.ts');
      const team = await franchisePlayerStorage.getFranchiseTeam(franchiseId, awayTeamId);
      return team?.startingRotation?.[0] ?? null;
    }, seed)).toBe(seed.awayStarterB);

    const savedAwayTeam = await page.evaluate(async ({ franchiseId, awayTeamId }) => {
      const franchisePlayerStorage = await import('/src/utils/franchisePlayerStorage.ts');
      return franchisePlayerStorage.getFranchiseTeam(franchiseId, awayTeamId);
    }, seed);
    expect(savedAwayTeam?.startingRotation?.[0]).toBe(seed.awayStarterB);
    expect(savedAwayTeam?.lineupWithoutDH?.[8]).toMatchObject({
      playerId: seed.awayStarterB,
      fieldingPosition: 'P',
      battingOrder: 9,
    });

    await page.getByRole('button', { name: /Today's Game/i }).click();
    await page.getByRole('button', { name: 'SCORE GAME' }).click();
    await page.getByRole('button', { name: 'CONFIRM' }).click();
    await expect(page.getByText('PRE-GAME LINEUP')).toBeVisible();
    await expect(page.getByText(/Lineup order and rotation source from Team Hub/i)).toBeVisible();
    await page.getByRole('button', { name: /REGISTER CURRENT LINEUPS/i }).click();
    await expect(page.getByRole('button', { name: 'START GAME' })).toBeEnabled();
    await page.getByRole('button', { name: 'START GAME' }).click();

    await expect(page).toHaveURL(/\/game-tracker\/franchise-g1/);

    const launchState = await page.evaluate(() => window.history.state?.usr ?? window.history.state);
    expect(launchState).toMatchObject({
      gameMode: 'franchise',
      franchiseId: seed.franchiseId,
      scheduleGameId: seed.manualGameId,
      useDH: false,
    });

    const awayPlayers = launchState.awayPlayers ?? [];
    const awayPitchers = launchState.awayPitchers ?? [];
    const homePlayers = launchState.homePlayers ?? [];
    const homePitchers = launchState.homePitchers ?? [];
    const launchedPlayerIds = [...awayPlayers, ...awayPitchers, ...homePlayers, ...homePitchers]
      .map((player: any) => player.playerId);

    expect(awayPlayers[0]?.playerId).not.toBe(seed.awayStarterB);
    expect(awayPlayers[8]).toMatchObject({
      playerId: seed.awayStarterB,
      position: 'P',
      battingOrder: 9,
    });
    expect(awayPitchers.find((pitcher: any) => pitcher.playerId === seed.awayStarterB)).toMatchObject({
      isStarter: true,
      isActive: true,
    });
    expect(homePlayers[8]).toMatchObject({
      playerId: seed.homeStarterA,
      position: 'P',
      battingOrder: 9,
    });
    expect(seed.farmPlayerIds.some((playerId) => launchedPlayerIds.includes(playerId))).toBe(false);
  });
});
