import { test, expect, type Page } from '@playwright/test';

test.setTimeout(120_000);

type SeededLeague = {
  leagueId: string;
  teamIds: string[];
};

type SeededFranchise = SeededLeague & {
  franchiseId: string;
  seasonId: string;
  scheduleGameIds: string[];
  gameTrackerScheduleGameId: string;
  scoreOnlyScheduleGameId: string;
  expectedPlayoffSeeds: string[];
};

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

async function seedSixteenTeamLeagueBuilderLeague(page: Page): Promise<SeededLeague> {
  await clearBrowserDatabases(page);

  return page.evaluate(async () => {
    const leagueBuilderStorage = await import('/src/utils/leagueBuilderStorage.ts');

    const leagueId = 'e2e-franchise-v1-16-team-league';
    const now = '2026-05-28T00:00:00.000Z';
    const teamIds = Array.from({ length: 16 }, (_, index) => `r16-team-${String(index + 1).padStart(2, '0')}`);
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
      power: isPitcher(primaryPosition) ? 18 + index : 54 + (index % 20),
      contact: isPitcher(primaryPosition) ? 18 + index : 58 + (index % 20),
      speed: isPitcher(primaryPosition) ? 22 : 45 + (index % 20),
      fielding: 58 + (index % 18),
      arm: 58 + (index % 18),
      velocity: isPitcher(primaryPosition) ? 76 + index : 0,
      junk: isPitcher(primaryPosition) ? 68 + index : 0,
      accuracy: isPitcher(primaryPosition) ? 70 + index : 0,
      arsenal: isPitcher(primaryPosition) ? ['4F', 'SL', 'CH'] : [],
      overallGrade: 'B',
      personality: 'Competitive',
      chemistry: 'Competitive',
      morale: 50,
      mojo: 'Normal',
      fame: 0,
      salary: 1_000_000 + (index * 25_000),
      leagueAssignments: [{ leagueId, teamId, rosterStatus: 'MLB' }],
      createdDate: now,
      lastModified: now,
      isCustom: true,
      sourceDatabase: 'franchise-v1-realistic-16-team-browser-smoke',
    });

    for (const [teamIndex, teamId] of teamIds.entries()) {
      const teamNumber = teamIndex + 1;
      const batterIds = lineupPositions.map((_position, index) => `${teamId}-mlb-b-${String(index + 1).padStart(2, '0')}`);
      const benchIds = benchPositions.map((_position, index) => `${teamId}-mlb-b-${String(lineupPositions.length + index + 1).padStart(2, '0')}`);
      const pitcherIds = pitcherPositions.map((_position, index) => `${teamId}-mlb-p-${String(index + 1).padStart(2, '0')}`);
      const conference = teamIndex < 8 ? 'Eastern' : 'Western';

      await leagueBuilderStorage.saveTeam({
        id: teamId,
        name: `Smoke ${teamNumber}`,
        abbreviation: `S${String(teamNumber).padStart(2, '0')}`,
        location: conference,
        nickname: `Smoke ${teamNumber}`,
        colors: {
          primary: teamIndex % 2 === 0 ? '#345995' : '#7D4F50',
          secondary: teamIndex % 2 === 0 ? '#EAC435' : '#F9E784',
        },
        stadium: `Smoke ${teamNumber} Park`,
        leagueIds: [leagueId],
        conference,
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
      name: 'Franchise V1 Realistic 16 Team Smoke League',
      teamIds,
      conferences: [
        { id: 'east', name: 'Eastern', divisionIds: ['east-a', 'east-b'] },
        { id: 'west', name: 'Western', divisionIds: ['west-a', 'west-b'] },
      ],
      divisions: [
        { id: 'east-a', name: 'Eastern A', conferenceId: 'east', teamIds: teamIds.slice(0, 4) },
        { id: 'east-b', name: 'Eastern B', conferenceId: 'east', teamIds: teamIds.slice(4, 8) },
        { id: 'west-a', name: 'Western A', conferenceId: 'west', teamIds: teamIds.slice(8, 12) },
        { id: 'west-b', name: 'Western B', conferenceId: 'west', teamIds: teamIds.slice(12, 16) },
      ],
      defaultRulesPreset: 'default',
      createdDate: now,
      lastModified: now,
    } as any);

    return { leagueId, teamIds };
  });
}

async function applyStartupFarmDraftThroughLeagueBuilder(page: Page): Promise<void> {
  await page.goto('/league-builder/draft');
  await expect(page.getByRole('heading', { name: 'STARTUP SCOUT + PROSPECT DRAFT', exact: true })).toBeVisible();
  await expect(page.locator('section').filter({ hasText: 'LEAGUE BUILDER SETUP' }).getByText('16', { exact: true })).toBeVisible();
  await page.getByLabel(/DETERMINISTIC SEED/i).fill('franchise-v1-realistic-16-team-smoke');
  await page.getByRole('button', { name: /BEGIN SCOUT DRAFT/i }).click();

  for (let index = 0; index < 32; index += 1) {
    await expect(page.getByText(/ON THE CLOCK:/i)).toBeVisible({ timeout: 60_000 });
    await page.getByRole('button', { name: /HIRE SCOUT/i }).first().click();
  }

  await expect(page.getByText('PROSPECT DRAFT BOARD')).toBeVisible({ timeout: 60_000 });
  for (let index = 0; index < 160; index += 1) {
    await expect(page.getByRole('button', { name: /DRAFT TO FARM/i }).first()).toBeVisible({ timeout: 60_000 });
    await page.getByRole('button', { name: /DRAFT TO FARM/i }).first().click();
  }

  await expect(page.getByText('PREPARED', { exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/two hired scouts and 10 hidden-safe FARM prospects/i)).toBeVisible();
}

async function initializeNoDhFranchiseAndManualSchedule(
  page: Page,
  seededLeague: SeededLeague,
): Promise<SeededFranchise> {
  return page.evaluate(async ({ leagueId, teamIds }) => {
    const leagueBuilderStorage = await import('/src/utils/leagueBuilderStorage.ts');
    const franchiseInitializer = await import('/src/utils/franchiseInitializer.ts');
    const franchisePlayerStorage = await import('/src/utils/franchisePlayerStorage.ts');
    const scheduleStorage = await import('/src/utils/scheduleStorage.ts');
    const franchiseContract = await import('/src/utils/franchisePersistenceContract.ts');

    const allPlayers = await leagueBuilderStorage.getAllPlayers();
    for (const teamId of teamIds) {
      const mlbCount = allPlayers.filter((player: any) =>
        player.leagueAssignments?.some((assignment: any) =>
          assignment.leagueId === leagueId &&
          assignment.teamId === teamId &&
          assignment.rosterStatus === 'MLB',
        ),
      ).length;
      const farmCount = allPlayers.filter((player: any) =>
        player.leagueAssignments?.some((assignment: any) =>
          assignment.leagueId === leagueId &&
          assignment.teamId === teamId &&
          assignment.rosterStatus === 'FARM',
        ),
      ).length;

      if (mlbCount !== 22 || farmCount !== 10) {
        throw new Error(`Invalid prepared roster for ${teamId}: MLB ${mlbCount}, FARM ${farmCount}`);
      }
    }

    const franchiseId = await franchiseInitializer.initializeFranchise({
      franchiseName: 'Franchise V1 Realistic 16 Team Smoke',
      league: leagueId,
      leagueDetails: {
        name: 'Franchise V1 Realistic 16 Team Smoke League',
        teams: 16,
        conferences: 2,
        divisions: 4,
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
        teamsQualifying: 4,
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
        selectedTeams: [teamIds[0]],
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
    const scheduleRows = [
      { awayTeamId: teamIds[0], homeTeamId: teamIds[8], awayScore: 6, homeScore: 1, source: 'game-tracker' },
      { awayTeamId: teamIds[1], homeTeamId: teamIds[9], awayScore: 13, homeScore: 1, source: 'score-only' },
      { awayTeamId: teamIds[2], homeTeamId: teamIds[10], awayScore: 9, homeScore: 2, source: 'score-only' },
      { awayTeamId: teamIds[3], homeTeamId: teamIds[11], awayScore: 5, homeScore: 2, source: 'score-only' },
      { awayTeamId: teamIds[4], homeTeamId: teamIds[12], awayScore: 4, homeScore: 3, source: 'score-only' },
      { awayTeamId: teamIds[5], homeTeamId: teamIds[13], awayScore: 5, homeScore: 3, source: 'score-only' },
      { awayTeamId: teamIds[6], homeTeamId: teamIds[14], awayScore: 8, homeScore: 4, source: 'score-only' },
      { awayTeamId: teamIds[7], homeTeamId: teamIds[15], awayScore: 10, homeScore: 4, source: 'score-only' },
    ];

    const scheduledGames = [];
    for (const [index, row] of scheduleRows.entries()) {
      const game = await scheduleStorage.addGame({
        franchiseId,
        seasonId,
        statsScopeId: seasonId,
        seasonNumber: 1,
        gameNumber: index + 1,
        dayNumber: index + 1,
        date: `Smoke Day ${index + 1}`,
        time: '7:00 PM',
        awayTeamId: row.awayTeamId,
        homeTeamId: row.homeTeamId,
        source: 'manual',
        notes: `User-authored 16-team smoke schedule row ${index + 1}`,
      });
      scheduledGames.push(game);
    }

    const franchisePlayers = await franchisePlayerStorage.getAllFranchisePlayers(franchiseId);
    const farmPlayers = franchisePlayers.filter((player: any) =>
      player.leagueAssignments?.some((assignment: any) =>
        assignment.leagueId === leagueId && assignment.rosterStatus === 'FARM',
      ),
    );
    if (farmPlayers.length !== 160) {
      throw new Error(`Expected 160 copied franchise FARM players; found ${farmPlayers.length}.`);
    }
    if (farmPlayers.some((player: any) => player.ratingRevealState !== 'hidden')) {
      throw new Error('A copied franchise FARM player was not hidden.');
    }
    if (farmPlayers.some((player: any) => !player.prospectProfile?.scoutedGrade || !player.prospectProfile?.scoutConfidence)) {
      throw new Error('A copied franchise FARM player is missing visible-safe scouting metadata.');
    }

    return {
      leagueId,
      teamIds,
      franchiseId,
      seasonId,
      scheduleGameIds: scheduledGames.map((game) => game.id),
      gameTrackerScheduleGameId: scheduledGames[0].id,
      scoreOnlyScheduleGameId: scheduledGames[1].id,
      expectedPlayoffSeeds: [teamIds[1], teamIds[2], teamIds[7], teamIds[0]],
    };
  }, seededLeague);
}

test.describe('Journey 10: Franchise v1 realistic 16-team browser smoke', () => {
  test('16-team no-DH fixture covers FARM draft, manual schedule, GameTracker, score-only, transactions, and playoffs', async ({ page }) => {
    const seededLeague = await seedSixteenTeamLeagueBuilderLeague(page);

    await applyStartupFarmDraftThroughLeagueBuilder(page);

    const fixture = await initializeNoDhFranchiseAndManualSchedule(page, seededLeague);
    expect(fixture.scheduleGameIds).toHaveLength(8);

    await page.goto(`/franchise/${fixture.franchiseId}`);
    await expect(page.getByRole('button', { name: /TEAM HUB/i })).toBeVisible({ timeout: 30_000 });

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
      franchiseId: fixture.franchiseId,
      scheduleGameId: fixture.gameTrackerScheduleGameId,
      seasonId: fixture.seasonId,
      statsScopeId: fixture.seasonId,
      useDH: false,
    });
    expect(launchState.awayPlayers[8]).toMatchObject({
      position: 'P',
      battingOrder: 9,
    });
    expect(launchState.awayPlayers[0].position).not.toBe('P');

    const storageReport = await page.evaluate(async ({ fixture, launchState }) => {
      const processCompletedGame = await import('/src/utils/processCompletedGame.ts');
      const scheduleStorage = await import('/src/utils/scheduleStorage.ts');
      const seasonStorage = await import('/src/utils/seasonStorage.ts');
      const gameStorage = await import('/src/utils/gameStorage.ts');
      const franchiseRosterMovement = await import('/src/utils/franchiseRosterMovement.ts');
      const franchiseTradeAdapter = await import('/src/utils/franchiseTradeAdapter.ts');
      const franchisePlayerStorage = await import('/src/utils/franchisePlayerStorage.ts');
      const transactionStorage = await import('/src/utils/transactionStorage.ts');
      const almanacNarrativeArchive = await import('/src/utils/almanacNarrativeArchive.ts');

      const gameId = 'franchise-g1';
      const awayBatter = launchState.awayPlayers[0];
      const homeBatter = launchState.homePlayers[0];
      const awayStarter = launchState.awayPitchers.find((pitcher: any) => pitcher.isStarter) ?? launchState.awayPitchers[0];
      const homeStarter = launchState.homePitchers.find((pitcher: any) => pitcher.isStarter) ?? launchState.homePitchers[0];
      const playerName = (player: any) => player.playerName ?? player.name ?? player.playerId;

      const gameState = {
        id: 'current',
        gameId,
        savedAt: Date.now(),
        inning: 9,
        halfInning: 'BOTTOM',
        outs: 3,
        homeScore: 1,
        awayScore: 6,
        bases: { first: null, second: null, third: null },
        currentBatterIndex: 0,
        atBatCount: 72,
        awayTeamId: fixture.teamIds[0],
        homeTeamId: fixture.teamIds[8],
        awayTeamName: launchState.awayTeamName,
        homeTeamName: launchState.homeTeamName,
        seasonNumber: 1,
        seasonId: fixture.seasonId,
        statsScopeId: fixture.seasonId,
        franchiseId: fixture.franchiseId,
        scheduleGameId: fixture.gameTrackerScheduleGameId,
        competitionType: 'franchise',
        competitionId: fixture.franchiseId,
        leagueId: fixture.leagueId,
        totalInnings: 9,
        awayUsesDh: false,
        homeUsesDh: false,
        playerStats: {
          [awayBatter.playerId]: {
            playerName: playerName(awayBatter),
            teamId: fixture.teamIds[0],
            pa: 4,
            ab: 4,
            h: 2,
            singles: 1,
            doubles: 0,
            triples: 0,
            hr: 1,
            rbi: 4,
            r: 2,
            bb: 0,
            hbp: 0,
            k: 1,
            sb: 0,
            cs: 0,
            sf: 0,
            sh: 0,
            gidp: 0,
            putouts: 0,
            assists: 0,
            fieldingErrors: 0,
          },
          [homeBatter.playerId]: {
            playerName: playerName(homeBatter),
            teamId: fixture.teamIds[8],
            pa: 4,
            ab: 4,
            h: 1,
            singles: 1,
            doubles: 0,
            triples: 0,
            hr: 0,
            rbi: 1,
            r: 1,
            bb: 0,
            hbp: 0,
            k: 1,
            sb: 0,
            cs: 0,
            sf: 0,
            sh: 0,
            gidp: 0,
            putouts: 0,
            assists: 0,
            fieldingErrors: 0,
          },
        },
        pitcherGameStats: [
          {
            pitcherId: awayStarter.playerId,
            pitcherName: playerName(awayStarter),
            teamId: fixture.teamIds[0],
            isStarter: true,
            entryInning: 1,
            outsRecorded: 27,
            hitsAllowed: 4,
            runsAllowed: 1,
            earnedRuns: 1,
            walksAllowed: 1,
            strikeoutsThrown: 8,
            homeRunsAllowed: 0,
            hitBatters: 0,
            basesReachedViaError: 0,
            wildPitches: 0,
            pitchCount: 101,
            battersFaced: 31,
            consecutiveHRsAllowed: 0,
            firstInningRuns: 0,
            basesLoadedWalks: 0,
            inningsComplete: 9,
            decision: 'W',
            save: false,
            hold: false,
            blownSave: false,
          },
          {
            pitcherId: homeStarter.playerId,
            pitcherName: playerName(homeStarter),
            teamId: fixture.teamIds[8],
            isStarter: true,
            entryInning: 1,
            outsRecorded: 24,
            hitsAllowed: 9,
            runsAllowed: 6,
            earnedRuns: 6,
            walksAllowed: 3,
            strikeoutsThrown: 5,
            homeRunsAllowed: 1,
            hitBatters: 0,
            basesReachedViaError: 0,
            wildPitches: 0,
            pitchCount: 96,
            battersFaced: 33,
            consecutiveHRsAllowed: 0,
            firstInningRuns: 2,
            basesLoadedWalks: 0,
            inningsComplete: 8,
            decision: 'L',
            save: false,
            hold: false,
            blownSave: false,
          },
        ],
        fameEvents: [],
        lastHRBatterId: awayBatter.playerId,
        consecutiveHRCount: 0,
        inningStrikeouts: 0,
        maxDeficitAway: 0,
        maxDeficitHome: 0,
        activityLog: ['GameTracker browser smoke fixture completed this game through processCompletedGame.'],
      };

      await processCompletedGame.processCompletedGame(
        gameState as any,
        {
          seasonId: fixture.seasonId,
          franchiseId: fixture.franchiseId,
          seasonNumber: 1,
          currentSeason: 1,
          currentGame: 1,
          detectMilestones: false,
        },
        fixture.leagueId,
        {
          finalScore: { away: 6, home: 1 },
          seasonId: fixture.seasonId,
          context: {
            leagueId: fixture.leagueId,
            franchiseId: fixture.franchiseId,
            seasonId: fixture.seasonId,
            statsScopeId: fixture.seasonId,
            scheduleGameId: fixture.gameTrackerScheduleGameId,
            competitionType: 'franchise',
            competitionId: fixture.franchiseId,
          },
        },
      );

      await scheduleStorage.completeGame(fixture.gameTrackerScheduleGameId, {
        awayScore: 6,
        homeScore: 1,
        winningTeamId: fixture.teamIds[0],
        losingTeamId: fixture.teamIds[8],
        gameLogId: gameId,
      });

      const scoreOnlyScores = [
        [13, 1],
        [9, 2],
        [5, 2],
        [4, 3],
        [5, 3],
        [8, 4],
        [10, 4],
      ];
      for (let index = 1; index < fixture.scheduleGameIds.length; index += 1) {
        const [awayScore, homeScore] = scoreOnlyScores[index - 1];
        await scheduleStorage.completeFranchiseScheduleGameScoreOnly({
          scheduleGameId: fixture.scheduleGameIds[index],
          franchiseId: fixture.franchiseId,
          seasonId: fixture.seasonId,
          seasonNumber: 1,
          awayScore,
          homeScore,
        });
      }

      const franchisePlayers = await franchisePlayerStorage.getAllFranchisePlayers(fixture.franchiseId);
      const farmPlayer = franchisePlayers.find((player: any) =>
        player.leagueAssignments?.some((assignment: any) =>
          assignment.leagueId === fixture.leagueId &&
          assignment.teamId === fixture.teamIds[0] &&
          assignment.rosterStatus === 'FARM',
        ),
      );
      if (!farmPlayer) throw new Error('No team-one FARM player found for call-up.');

      const callUp = await franchiseRosterMovement.callUpFranchisePlayer({
        franchiseId: fixture.franchiseId,
        seasonId: fixture.seasonId,
        statsScopeId: fixture.seasonId,
        seasonNumber: 1,
        teamId: fixture.teamIds[0],
        playerId: farmPlayer.id,
        leagueId: fixture.leagueId,
        actor: 'USER',
        rosterMovementPhase: 'REGULAR_SEASON',
      });
      if (!callUp.success) {
        throw new Error(`Call-up failed: ${callUp.errorCode} ${callUp.errorMessage}`);
      }

      const outgoingTradePlayerId = `${fixture.teamIds[0]}-mlb-b-10`;
      const incomingTradePlayerId = `${fixture.teamIds[1]}-mlb-b-10`;
      const trade = await franchiseTradeAdapter.executeManualFranchiseTrade(
        {
          franchiseId: fixture.franchiseId,
          seasonId: fixture.seasonId,
          statsScopeId: fixture.seasonId,
          seasonNumber: 1,
          offseasonStateId: `regular-season-${fixture.seasonId}`,
          phase: 'TRADES',
          dryRun: false,
        } as any,
        {
          transactionPhase: 'REGULAR_SEASON',
          requestedTrade: {
            sourceTeamId: fixture.teamIds[0],
            targetTeamId: fixture.teamIds[1],
            outgoingPlayerIds: [outgoingTradePlayerId],
            incomingPlayerIds: [incomingTradePlayerId],
          },
        },
      );
      if (!trade.success) {
        throw new Error(`Manual trade failed: ${trade.errorCode} ${trade.message}`);
      }

      const standings = await seasonStorage.calculateStandings(fixture.seasonId);
      const archives = await gameStorage.getRecentGames(20, { seasonId: fixture.seasonId });
      const battingStats = await seasonStorage.getSeasonBattingStats(fixture.seasonId);
      const scheduleRows = await scheduleStorage.getAllGamesByFranchise(fixture.franchiseId, 1);
      const scoreOnlyRows = scheduleRows.filter((game: any) => game.completionSource === 'score-only');
      const transactions = await transactionStorage.getTransactionsByFranchiseSeason(fixture.franchiseId, fixture.seasonId);
      const tradedPlayerArchiveRows = await almanacNarrativeArchive.listAlmanacNarrativeArchive({
        franchiseId: fixture.franchiseId,
        seasonId: fixture.seasonId,
        playerId: outgoingTradePlayerId,
        kind: 'transaction-history',
      });

      return {
        standings: standings.map((standing: any) => ({
          teamId: standing.teamId,
          wins: standing.wins,
          losses: standing.losses,
          runDiff: standing.runDiff,
        })),
        archiveGameIds: archives.map((game: any) => game.gameId),
        battingStatPlayerIds: battingStats.map((stat: any) => stat.playerId),
        scoreOnlyRows: scoreOnlyRows.map((game: any) => ({
          id: game.id,
          gameLogId: game.gameLogId,
          scoreOnlyResultId: game.scoreOnlyResultId,
        })),
        gameTrackerRow: scheduleRows.find((game: any) => game.id === fixture.gameTrackerScheduleGameId),
        callUpPlayerId: farmPlayer.id,
        outgoingTradePlayerId,
        incomingTradePlayerId,
        transactionTypes: transactions.map((entry: any) => entry.type),
        transactionPlayerIds: transactions.flatMap((entry: any) => [
          ...(Array.isArray(entry.data?.playerIds) ? entry.data.playerIds : []),
          ...(Array.isArray(entry.data?.sourcePlayers) ? entry.data.sourcePlayers.map((player: any) => player.playerId) : []),
          ...(Array.isArray(entry.data?.targetPlayers) ? entry.data.targetPlayers.map((player: any) => player.playerId) : []),
        ]),
        tradedPlayerArchiveCount: tradedPlayerArchiveRows.length,
      };
    }, { fixture, launchState });

    expect(storageReport.standings.find((team: any) => team.teamId === fixture.teamIds[0])).toMatchObject({
      wins: 1,
      losses: 0,
      runDiff: 5,
    });
    expect(storageReport.standings.find((team: any) => team.teamId === fixture.teamIds[1])).toMatchObject({
      wins: 1,
      losses: 0,
      runDiff: 12,
    });
    expect(storageReport.archiveGameIds).toEqual(['franchise-g1']);
    expect(storageReport.battingStatPlayerIds).toContain(launchState.awayPlayers[0].playerId);
    expect(storageReport.scoreOnlyRows).toHaveLength(7);
    expect(storageReport.scoreOnlyRows.every((row: any) => !row.gameLogId && row.scoreOnlyResultId)).toBe(true);
    expect(storageReport.gameTrackerRow).toMatchObject({
      completionSource: 'game-tracker',
      gameLogId: 'franchise-g1',
    });
    expect(storageReport.transactionTypes).toEqual(expect.arrayContaining(['call_up', 'trade']));
    expect(storageReport.transactionPlayerIds).toEqual(expect.arrayContaining([
      storageReport.callUpPlayerId,
      storageReport.outgoingTradePlayerId,
      storageReport.incomingTradePlayerId,
    ]));
    expect(storageReport.tradedPlayerArchiveCount).toBeGreaterThan(0);

    await page.goto(`/franchise/${fixture.franchiseId}`);
    await expect(page.getByRole('button', { name: /TEAM HUB/i })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /SCHEDULE/i }).click();
    await expect(page.getByText('SCORE ONLY').first()).toBeVisible();
    await expect(page.getByText('Schedule + standings only; no game archive or player stats.').first()).toBeVisible();
    await page.getByText(/Filter: FULL LEAGUE/i).click();
    await page.getByRole('button', { name: fixture.teamIds[0] }).click();
    await expect(page.getByRole('link', { name: /Game Detail/i })).toBeVisible();

    await page.getByRole('button', { name: /TEAM HUB/i }).click();
    await page.getByRole('button', { name: /^ROSTER$/i }).click();
    const farmRegion = page.getByRole('region', { name: /Franchise FARM prospects/i });
    const transactionRegion = page.getByRole('region', { name: /Read-only franchise transaction history/i });
    await expect(farmRegion).toBeVisible();
    await expect(farmRegion.getByText(/Scouted:/i).first()).toBeVisible();
    await expect(farmRegion.getByText(/^HIDDEN$/i).first()).toBeVisible();
    await expect(transactionRegion).toBeVisible();
    await expect(transactionRegion.getByText(/^CALL UP$/i)).toBeVisible();
    await expect(transactionRegion.getByText(/^TRADE$/i)).toBeVisible();
    await expect(transactionRegion.getByText(new RegExp(storageReport.callUpPlayerId))).toBeVisible();
    await expect(transactionRegion.getByText(new RegExp(storageReport.outgoingTradePlayerId))).toBeVisible();
    await expect(transactionRegion.getByText(new RegExp(storageReport.incomingTradePlayerId))).toBeVisible();

    await page.getByRole('button', { name: /^PLAYOFFS$/i }).click();
    await page.getByRole('button', { name: /^BRACKET$/i }).click();
    await page.getByRole('button', { name: /CREATE PLAYOFF BRACKET/i }).click();

    await expect.poll(async () => page.evaluate(async ({ franchiseId, seasonId }) => {
      const playoffStorage = await import('/src/utils/playoffStorage.ts');
      const playoff = await playoffStorage.getPlayoffByFranchiseSeason({
        franchiseId,
        seasonNumber: 1,
        seasonId,
      });
      if (!playoff) return null;
      const series = await playoffStorage.getSeriesByPlayoff(playoff.id);
      return {
        id: playoff.id,
        useDH: playoff.useDH,
        teams: playoff.teams.map((team: any) => ({
          teamId: team.teamId,
          seed: team.seed,
          wins: team.regularSeasonRecord.wins,
          losses: team.regularSeasonRecord.losses,
        })),
        seriesCount: series.length,
      };
    }, { franchiseId: fixture.franchiseId, seasonId: fixture.seasonId }), {
      timeout: 30_000,
    }).toBeTruthy();

    const createdPlayoff = await page.evaluate(async ({ franchiseId, seasonId }) => {
      const playoffStorage = await import('/src/utils/playoffStorage.ts');
      const playoff = await playoffStorage.getPlayoffByFranchiseSeason({
        franchiseId,
        seasonNumber: 1,
        seasonId,
      });
      const series = playoff ? await playoffStorage.getSeriesByPlayoff(playoff.id) : [];
      return {
        useDH: playoff?.useDH,
        teams: playoff?.teams.map((team: any) => ({ teamId: team.teamId, seed: team.seed })) ?? [],
        seriesCount: series.length,
      };
    }, { franchiseId: fixture.franchiseId, seasonId: fixture.seasonId });

    expect(createdPlayoff.useDH).toBe(false);
    expect(createdPlayoff.teams.map((team: any) => team.teamId)).toEqual(fixture.expectedPlayoffSeeds);
    expect(createdPlayoff.teams.map((team: any) => team.seed)).toEqual([1, 2, 3, 4]);
    expect(createdPlayoff.seriesCount).toBeGreaterThan(0);
  });
});
