import { expect, test, type Page } from '@playwright/test';

test.setTimeout(600_000);
test.use({ baseURL: process.env.SNAKE_PRODUCTION_BASE_URL ?? 'http://localhost:5173' });

const LEAGUE_ID = 'e2e-snake-production-lifecycle';
const TEAM_IDS = ['e2e-snake-alpha', 'e2e-snake-beta'] as const;
const TEAM_NAMES = ['Journey Alpha', 'Journey Beta'] as const;
const FRANCHISE_NAME = 'Snake Production Journey';

const LEGAL_POSITIONS = [
  'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', '1B', '2B', 'SS', 'LF', 'RF',
  'SP', 'SP', 'SP', 'SP', 'RP', 'RP', 'RP', 'CP', 'RP',
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function clearBrowserDatabases(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(async () => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    const databases = await indexedDB.databases();
    await Promise.all(databases.map((database) => new Promise<void>((resolve) => {
      if (!database.name) {
        resolve();
        return;
      }
      const request = indexedDB.deleteDatabase(database.name);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    })));
  });
}

async function seedSnakeLeague(page: Page): Promise<void> {
  await clearBrowserDatabases(page);
  await page.evaluate(async ({ leagueId, teamIds, teamNames, legalPositions }) => {
    const storage = await import('/src/utils/leagueBuilderStorage.ts');
    const leagueConstruction = await import('/src/engines/leagueConstruction.ts');
    const tierParams = await import('/src/data/tierParams.ts');
    const now = '2026-07-14T12:00:00.000Z';

    await storage.saveLeagueTemplate({
      id: leagueId,
      name: 'Snake Production Lifecycle League',
      teamIds: [...teamIds],
      conferences: [],
      divisions: [],
      defaultRulesPreset: 'standard',
      draftFormat: 'auction',
      draftPoolMode: 'pool-first',
      draftSeats: [
        { id: 'e2e-seat-alpha', name: 'Alpha GM' },
        { id: 'e2e-seat-beta', name: 'Beta GM' },
      ],
      tier: 'standard',
      balanceMode: 'taxed',
      salaryCap: tierParams.TIER_CAPS.standard.tierCap,
    });

    for (const [index, teamId] of teamIds.entries()) {
      const teamSeed: Parameters<typeof storage.saveTeam>[0] = {
        id: teamId,
        name: teamNames[index],
        abbreviation: index === 0 ? 'ALP' : 'BET',
        location: 'Journey City',
        nickname: index === 0 ? 'Alpha' : 'Beta',
        colors: index === 0
          ? { primary: '#315C2B', secondary: '#D6B85A', accent: '#F4F1DE' }
          : { primary: '#6B2D2D', secondary: '#E6C45D', accent: '#F4F1DE' },
        stadium: `${teamNames[index]} Park`,
        controlledBy: 'human',
        leagueIds: [leagueId],
        mlbArchetypeKey: index === 0 ? 'murderers-row' : 'whiteyball',
        farmArchetypeKey: index === 0 ? 'web-gems' : 'bomba-squad',
        gmSeatId: index === 0 ? 'e2e-seat-alpha' : 'e2e-seat-beta',
        gmSeatName: index === 0 ? 'Alpha GM' : 'Beta GM',
      };
      await storage.saveTeam(teamSeed);
      await storage.saveTeamRoster(storage.createEmptyTeamRoster(teamId));
    }

    const poolPositions = [
      ...legalPositions,
      ...legalPositions,
      'C', 'C', 'C', 'LF', 'LF', 'CF', 'CF', 'RF', 'RF', 'CP', 'CP',
    ];
    const poolRows: Array<{ id: string; iv: number; salary: number }> = [];
    for (const [poolIndex, primaryPosition] of poolPositions.entries()) {
        const setIndex = Math.floor(poolIndex / legalPositions.length);
        const positionIndex = poolIndex % legalPositions.length;
        const id = `e2e-snake-player-${poolIndex + 1}`;
        const pitcher = ['SP', 'RP', 'CP'].includes(primaryPosition);
        const salary = 10_000;
        const iv = 18_000 + (poolIndex * 137) % 7_000;
        const playerSeed: Parameters<typeof storage.savePlayer>[0] = {
          id,
          firstName: `Journey${setIndex + 1}`,
          lastName: `${primaryPosition}${positionIndex + 1}`,
          gender: positionIndex % 3 === 0 ? 'F' : 'M',
          age: 21 + ((setIndex + positionIndex) % 12),
          bats: positionIndex % 2 === 0 ? 'R' : 'L',
          throws: 'R',
          primaryPosition,
          secondaryPosition: positionIndex === 8 ? 'C' : undefined,
          power: pitcher ? 20 : 55,
          contact: pitcher ? 20 : 55,
          speed: 55,
          fielding: 55,
          arm: 55,
          velocity: pitcher ? 55 : 0,
          junk: pitcher ? 55 : 0,
          accuracy: pitcher ? 55 : 0,
          arsenal: pitcher ? ['4F'] : [],
          overallGrade: 'B',
          personality: 'Competitive',
          chemistry: 'Competitive',
          morale: 50,
          mojo: 'Normal',
          fame: 0,
          salary,
          sourceId: `e2e-source:${id}`,
          sourceDatabase: 'snake-production-lifecycle',
          leagueAssignments: [{ leagueId, teamId: '', rosterStatus: 'FREE_AGENT' }],
          hiddenPersonalityModifiers: { loyalty: 50, ambition: 50, resilience: 50, charisma: 50 },
          isCustom: true,
        };
        await storage.savePlayer(playerSeed);
        poolRows.push({ id, iv, salary });
    }

    await storage.saveRegisteredPool({
      leagueId,
      tier: 'standard',
      balanceMode: 'taxed',
      players: poolRows,
      tierCap: tierParams.TIER_CAPS.standard.tierCap,
      luxuryCaps: tierParams.LUXURY_CAP_TABLES.standard,
      pickValueChart: leagueConstruction.derivePickValueChart(
        poolRows.map((row) => row.iv),
        teamIds.length * 22,
        teamIds.length,
      ),
      totalSlots: teamIds.length * 22,
      poolSurplusWarning: true,
      locked: true,
      lockedAt: Date.parse(now),
    });
  }, { leagueId: LEAGUE_ID, teamIds: [...TEAM_IDS], teamNames: [...TEAM_NAMES], legalPositions: [...LEGAL_POSITIONS] });
}

async function finishMlbDraftWithStoredEngine(page: Page): Promise<{
  picks: number;
  legalByTeam: Record<string, boolean>;
  canonicalTaxMatches: boolean;
  certificateCostsComplete: boolean;
  certificateCountsExact: boolean;
  certificateSeedable: boolean;
  taxByTeam: Record<string, number>;
  solventByTeam: Record<string, boolean>;
}> {
  return page.evaluate(async ({ leagueId, teamIds }) => {
    const storage = await import('/src/utils/leagueBuilderStorage.ts');
    const snakeSession = await import('/src/engines/snakeSession.ts');
    const rosterNeed = await import('/src/engines/rosterNeed.ts');
    const rosterConstruction = await import('/src/data/rosterConstruction.ts');
    const auctionTax = await import('/src/engines/auctionLuxuryTax.ts');
    const snakeGuide = await import('/src/engines/snakeGuideTrade.ts');
    const snakeIdentity = await import('/src/utils/snakePlayerIdentity.ts');
    const seatingProof = await import('/src/engines/snakeSeatingProof.ts');
    const snakeVersioning = await import('/src/engines/snakeVersioning.ts');
    const leagueData = await import('/src/src_figma/hooks/useLeagueBuilderData.ts');
    const deskRoom = await import('/src/src_figma/app/components/snake/desk/deskRoomModel.ts');
    let session = await storage.getMlbDraftSession(leagueId, 1);
    const pool = await storage.getRegisteredPool(leagueId);
    if (!session || !pool) throw new Error('MLB snake room state was not persisted by Draft Setup.');
    const teams = await Promise.all(teamIds.map((teamId) => storage.getTeam(teamId)));
    if (teams.some((team) => !team)) throw new Error('A seeded draft team disappeared before MLB completion.');
    const poolPlayers = await Promise.all(pool.players.map((row) => storage.getPlayer(row.id)));
    if (poolPlayers.some((player) => !player)) throw new Error('A registered player disappeared before MLB completion.');
    const constructionByPlayerId = new Map(poolPlayers.map((player) => [player!.id, leagueData.toConstructionPlayer(player!)]));
    const assignments = session.snakeSetup?.seatingCertificate?.assignments ?? [];
    for (const teamId of teamIds) {
      const remainingTurns = session.pickOrder.slice(session.currentPickIndex).filter((slot) => slot.teamId === teamId).length;
      const assignment = assignments.find((row) => row.teamId === teamId);
      if ((assignment?.playerIds.length ?? 0) !== remainingTurns) {
        throw new Error(`The post-gavel seating certificate does not contain the exact ${remainingTurns}-player legal remainder for ${teamId}.`);
      }
      if (!assignment || ![assignment.salaryCost, assignment.addedTax, assignment.allInCost].every(Number.isFinite)) {
        throw new Error(`The post-gavel seating certificate has incomplete cost fields for ${teamId}.`);
      }
    }
    const ivByPlayerId = new Map(pool.players.map((row) => [row.id, row.iv]));
    const caps = auctionTax.normalizeAuctionLuxuryCapsForLeagueSize(pool.luxuryCaps, teamIds.length);
    const seatingPlayers = poolPlayers.map((player) => ({
      playerId: player!.id,
      sourceId: snakeIdentity.snakePlayerSourceId(player!),
      versionGroupId: snakeIdentity.snakePlayerVersionGroupId(player!),
      price: ivByPlayerId.get(player!.id) ?? 0,
      shape: rosterNeed.toRosterSlotPlayer({
        primaryPosition: player!.primaryPosition,
        secondaryPosition: player!.secondaryPosition ?? null,
        traits: [player!.trait1, player!.trait2],
      }),
      construction: constructionByPlayerId.get(player!.id)!,
    }));
    const seatingById = new Map(seatingPlayers.map((player) => [player.playerId, player]));
    const boardCandidates = poolPlayers.flatMap((player) => {
      const seating = seatingById.get(player!.id);
      const priced = ivByPlayerId.get(player!.id);
      if (!seating || priced === undefined) return [];
      const deskPlayer = deskRoom.buildDeskRoomPlayer({ player: player!, price: priced, seating });
      return deskPlayer ? [{
        id: deskPlayer.playerId,
        position: deskPlayer.position,
        eligiblePositions: deskPlayer.eligiblePositions,
        rosterShape: deskPlayer.shape,
        sourceId: deskPlayer.sourceId,
        versionGroupId: deskPlayer.versionGroupId,
      }] : [];
    });
    const buildSeatingInput = (source: typeof session) => {
      const unavailable = new Set(source.completedPicks.map((pick) => pick.playerId));
      for (const unavailablePlayerId of snakeVersioning.unavailableVersionPlayerIds(source.versionState)) {
        unavailable.add(unavailablePlayerId);
      }
      return {
        clubs: teams.map((team) => {
          const completed = source.completedPicks.filter((pick) => pick.teamId === team!.id);
          const roster = completed.map((pick) => {
            const player = seatingById.get(pick.playerId);
            if (!player) throw new Error(`The seating row is missing for drafted player ${pick.playerId}.`);
            return player;
          });
          const committedSpent = completed.reduce((sum, pick) => (
            sum + (pick.settledSalary ?? ivByPlayerId.get(pick.playerId) ?? 0) + (pick.marginalTax ?? 0)
          ), 0);
          return {
            teamId: team!.id,
            roster,
            budgetRemaining: pool.tierCap - committedSpent,
            committedConstruction: roster.map((player) => player.construction),
            capIdentity: deskRoom.resolveLockedSeat({ team: team!, session: source }).capIdentity,
          };
        }),
        pool: seatingPlayers.filter((player) => !unavailable.has(player.playerId)),
        baseCaps: pool.luxuryCaps,
        realTeamCount: teamIds.length,
        versionState: source.versionState,
      };
    };
    let certificateCostsComplete = true;
    let certificateCountsExact = true;
    let certificateSeedable = true;

    while (session.currentPickIndex < session.pickOrder.length) {
      const slot = session.pickOrder[session.currentPickIndex];
      const currentInput = buildSeatingInput(session);
      const currentCertificate = session.snakeSetup?.seatingCertificate;
      if (!currentCertificate || !snakeGuide.seedSnakeGuideSeatingProof(currentInput, currentCertificate)) {
        throw new Error(`The stored seating certificate could not be seeded before pick ${slot.pick}.`);
      }
      const assigned = currentCertificate.assignments.find((assignment) => assignment.teamId === slot.teamId);
      const playerId = assigned?.playerIds[0];
      if (!playerId) throw new Error(`The canonical seating certificate ran out of legal MLB picks for ${slot.teamId}.`);
      const team = teams.find((row) => row!.id === slot.teamId)!;
      const existing = session.completedPicks
        .filter((pick) => pick.teamId === slot.teamId)
        .map((pick) => constructionByPlayerId.get(pick.playerId)!);
      const candidate = constructionByPlayerId.get(playerId);
      if (!candidate) throw new Error(`The canonical construction row is missing for ${playerId}.`);
      const seatingPlayer = seatingById.get(playerId);
      if (!seatingPlayer) throw new Error(`The canonical seating row is missing for ${playerId}.`);
      const marginalTax = auctionTax.auctionMarginalTaxWithCaps(
        existing,
        candidate,
        deskRoom.resolveLockedSeat({ team: team!, session }).capIdentity,
        caps,
      );
      const simultaneous = seatingProof.proveSnakePickKeepsAllClubsSeated({
        current: currentInput,
        teamId: slot.teamId,
        player: seatingPlayer,
        allInCost: (ivByPlayerId.get(playerId) ?? 0) + marginalTax,
        currentProof: currentCertificate,
      });
      if (!simultaneous.feasible) throw new Error(simultaneous.message);
      const seatingCertificate = {
        feasible: true as const,
        assignments: simultaneous.assignments,
        shortfall: null,
        message: simultaneous.message,
      };
      const expectedPick = slot.pick;
      session = await storage.updateMlbDraftSessionAtomically(leagueId, 1, (fresh) => {
        const freshSlot = fresh.pickOrder[fresh.currentPickIndex];
        if (!freshSlot || freshSlot.pick !== expectedPick || freshSlot.teamId !== slot.teamId) {
          throw new Error('The draft moved before the bulk production pick could be saved.');
        }
        const picked = snakeSession.applySnakePickWithCorrection({
          session: fresh,
          player: seatingPlayer,
          settledSalary: ivByPlayerId.get(playerId) ?? 0,
          marginalTax,
          versionPool: seatingPlayers,
        });
        const unavailable = new Set(picked.completedPicks.map((pick) => pick.playerId));
        for (const unavailablePlayerId of snakeVersioning.unavailableVersionPlayerIds(picked.versionState)) {
          unavailable.add(unavailablePlayerId);
        }
        const reconciled = deskRoom.reconcileExistingSeatBoards({
          session: picked,
          candidates: boardCandidates,
          unavailablePlayerIds: unavailable,
        });
        if (!reconciled.session.snakeSetup) throw new Error('The frozen snake setup disappeared during bulk completion.');
        return {
          ...reconciled.session,
          snakeSetup: {
            ...reconciled.session.snakeSetup,
            seatingCertificate,
          },
        };
      });
      const storedCertificate = session.snakeSetup?.seatingCertificate;
      const storedInput = buildSeatingInput(session);
      certificateSeedable = certificateSeedable && Boolean(
        storedCertificate && snakeGuide.seedSnakeGuideSeatingProof(storedInput, storedCertificate),
      );
      certificateCountsExact = certificateCountsExact && teamIds.every((teamId) => {
        const remainingTurns = session.pickOrder.slice(session.currentPickIndex).filter((row) => row.teamId === teamId).length;
        return storedCertificate?.assignments.find((assignment) => assignment.teamId === teamId)?.playerIds.length === remainingTurns;
      });
      certificateCostsComplete = certificateCostsComplete && Boolean(storedCertificate?.assignments.every((assignment) => (
        [assignment.salaryCost, assignment.addedTax, assignment.allInCost].every(Number.isFinite)
        && Math.abs((assignment.salaryCost + assignment.addedTax) - assignment.allInCost) <= 1e-6
      )));
      if (!certificateSeedable || !certificateCountsExact || !certificateCostsComplete) {
        throw new Error(`The stored seating certificate failed canonical validation after pick ${slot.pick}.`);
      }
    }

    const legalByTeam: Record<string, boolean> = {};
    const taxByTeam: Record<string, number> = {};
    const solventByTeam: Record<string, boolean> = {};
    let canonicalTaxMatches = true;
    for (const teamId of teamIds) {
      const picks = session.completedPicks.filter((pick) => pick.teamId === teamId);
      const players = await Promise.all(picks.map((pick) => storage.getPlayer(pick.playerId)));
      legalByTeam[teamId] = picks.length === 22 && rosterConstruction.isLegalRoster(players.map((player) => rosterNeed.toRosterSlotPlayer({
        primaryPosition: player!.primaryPosition,
        secondaryPosition: player!.secondaryPosition,
        traits: [player!.trait1, player!.trait2],
      })));
      const team = teams.find((row) => row!.id === teamId)!;
      const committed: ReturnType<typeof leagueData.toConstructionPlayer>[] = [];
      let totalSalary = 0;
      let totalTax = 0;
      for (const pick of picks) {
        const candidate = constructionByPlayerId.get(pick.playerId)!;
        const expectedTax = auctionTax.auctionMarginalTaxWithCaps(
          committed,
          candidate,
          deskRoom.resolveLockedSeat({ team: team!, session }).capIdentity,
          caps,
        );
        canonicalTaxMatches = canonicalTaxMatches && Math.abs((pick.marginalTax ?? Number.NaN) - expectedTax) < 1e-7;
        totalSalary += pick.settledSalary ?? Number.NaN;
        totalTax += pick.marginalTax ?? Number.NaN;
        committed.push(candidate);
      }
      taxByTeam[teamId] = totalTax;
      solventByTeam[teamId] = Number.isFinite(totalSalary + totalTax) && totalSalary + totalTax <= pool.tierCap;
    }
    return {
      picks: session.completedPicks.length,
      legalByTeam,
      canonicalTaxMatches,
      certificateCostsComplete,
      certificateCountsExact,
      certificateSeedable,
      taxByTeam,
      solventByTeam,
    };
  }, { leagueId: LEAGUE_ID, teamIds: [...TEAM_IDS] });
}

async function finishFarmDraftWithStoredEngine(page: Page): Promise<number> {
  return page.evaluate(async ({ leagueId }) => {
    const storage = await import('/src/utils/leagueBuilderStorage.ts');
    const snakeSession = await import('/src/engines/snakeSession.ts');
    const farmSlots = await import('/src/engines/snakeFarmSlots.ts');
    const farmRoom = await import('/src/src_figma/app/components/snake/farm/farmRoomModel.ts');
    let session = await storage.getMlbDraftSession(leagueId, farmSlots.FARM_SNAKE_SESSION_NUMBER);
    if (!session) throw new Error('The farm snake room did not create its production session.');
    const prospectIds = session.snakeSetup?.poolPlayerIds ?? session.farmProspectSnapshot?.map((prospect) => prospect.id) ?? [];
    const drafted = new Set(session.completedPicks.map((pick) => pick.playerId));
    const remaining = prospectIds.filter((playerId) => !drafted.has(playerId));
    const versionPool = prospectIds.map((playerId) => ({ playerId }));
    let cursor = 0;
    while (session.currentPickIndex < session.pickOrder.length) {
      const playerId = remaining[cursor++];
      if (!playerId) throw new Error('The farm prospect snapshot ran out before the draft completed.');
      const expectedSlot = session.pickOrder[session.currentPickIndex];
      session = await storage.updateMlbDraftSessionAtomically(leagueId, farmSlots.FARM_SNAKE_SESSION_NUMBER, (fresh) => {
        const freshSlot = fresh.pickOrder[fresh.currentPickIndex];
        if (!expectedSlot || !freshSlot || freshSlot.pick !== expectedSlot.pick || freshSlot.teamId !== expectedSlot.teamId) {
          throw new Error('The farm draft moved before the bulk production pick could be saved.');
        }
        const picked = snakeSession.applySnakePickWithCorrection({
          session: fresh,
          player: { playerId },
          settledSalary: farmSlots.farmPickSalary(fresh, freshSlot.pick),
          marginalTax: 0,
          versionPool,
        });
        const unavailableProspectIds = new Set(picked.completedPicks.map((pick) => pick.playerId));
        const remainingTurnsByTeamId = Object.fromEntries((picked.snakeSetup?.clubs ?? []).map((club) => [
          club.teamId,
          picked.pickOrder.slice(picked.currentPickIndex).filter((slot) => slot.teamId === club.teamId).length,
        ]));
        return farmRoom.reconcileFarmSeatBoards({
          session: picked,
          unavailableProspectIds,
          remainingTurnsByTeamId,
        }).session;
      });
    }
    return session.completedPicks.length;
  }, { leagueId: LEAGUE_ID });
}

async function firstCertifiedPlayerName(page: Page, teamId: string): Promise<string> {
  return page.evaluate(async ({ leagueId, teamId: requestedTeamId }) => {
    const storage = await import('/src/utils/leagueBuilderStorage.ts');
    const session = await storage.getMlbDraftSession(leagueId, 1);
    const playerId = session?.snakeSetup?.seatingCertificate?.assignments
      .find((assignment) => assignment.teamId === requestedTeamId)?.playerIds[0];
    if (!playerId) throw new Error(`The Draft Setup certificate has no first player for ${requestedTeamId}.`);
    const player = await storage.getPlayer(playerId);
    if (!player) throw new Error(`The Draft Setup certificate player ${playerId} is missing.`);
    return `${player.firstName} ${player.lastName}`.trim();
  }, { leagueId: LEAGUE_ID, teamId });
}

async function storedSnakeState(page: Page): Promise<{
  mlbPicks: number;
  farmPicks: number;
  rosterCounts: Record<string, { mlb: number; farm: number }>;
  scouts: number;
  staffReady: Record<string, boolean>;
}> {
  return page.evaluate(async ({ leagueId, teamIds }) => {
    const storage = await import('/src/utils/leagueBuilderStorage.ts');
    const farmSlots = await import('/src/engines/snakeFarmSlots.ts');
    const managers = await import('/src/utils/managerIdentityStorage.ts');
    const reporters = await import('/src/utils/reporterStorage.ts');
    const mlb = await storage.getMlbDraftSession(leagueId, 1);
    const farm = await storage.getMlbDraftSession(leagueId, farmSlots.FARM_SNAKE_SESSION_NUMBER);
    const rosterCounts: Record<string, { mlb: number; farm: number }> = {};
    const staffReady: Record<string, boolean> = {};
    for (const teamId of teamIds) {
      const roster = await storage.getTeamRoster(teamId);
      rosterCounts[teamId] = { mlb: roster?.mlbRoster.length ?? 0, farm: roster?.farmRoster.length ?? 0 };
      const manager = await managers.getManagerAssignment({
        teamId,
        mode: 'franchise',
        instanceId: managers.LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
      });
      const reporter = await reporters.getReporterForTeam(teamId, leagueId);
      staffReady[teamId] = Boolean(manager && reporter);
    }
    return {
      mlbPicks: mlb?.completedPicks.length ?? 0,
      farmPicks: farm?.completedPicks.length ?? 0,
      rosterCounts,
      scouts: (await storage.getScoutProfilesForLeague(leagueId)).length,
      staffReady,
    };
  }, { leagueId: LEAGUE_ID, teamIds: [...TEAM_IDS] });
}

async function launchState(page: Page): Promise<{
  franchiseId: string;
  initialGames: number;
  schedulePolicy: unknown;
  livingSeasonEnabled: boolean;
}> {
  return page.evaluate(async ({ franchiseName }) => {
    const manager = await import('/src/utils/franchiseManager.ts');
    const schedules = await import('/src/utils/scheduleStorage.ts');
    const franchises = await manager.listFranchises();
    const franchise = franchises.find((row) => row.name === franchiseName);
    if (!franchise) throw new Error('The launched franchise was not persisted.');
    const config = await manager.getFranchiseConfig(franchise.id);
    const metadata = await manager.loadFranchise(franchise.id);
    return {
      franchiseId: franchise.id,
      initialGames: (await schedules.getAllGamesByFranchise(franchise.id, 1)).length,
      schedulePolicy: config?.schedulePolicy ?? null,
      livingSeasonEnabled: Boolean(metadata?.livingSeason?.enabled),
    };
  }, { franchiseName: FRANCHISE_NAME });
}

test('production snake draft launches Living Season empty and accepts later manual and CSV schedule rows', async ({ page }) => {
  await seedSnakeLeague(page);
  console.log('[snake-lifecycle] seeded');

  await page.goto('/league-builder/leagues');
  await page.getByTitle('Edit league').click();
  await page.getByLabel('Draft format').selectOption('snake');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect.poll(async () => page.evaluate(async (leagueId) => (
    (await import('/src/utils/leagueBuilderStorage.ts')).getLeagueTemplate(leagueId)
  ).then((league) => league?.draftFormat), LEAGUE_ID), { timeout: 20_000 }).toBe('snake');
  await page.getByTitle('Edit league').click();
  await expect(page.getByLabel('Draft format')).toHaveValue('snake');
  await page.getByRole('button', { name: 'Cancel' }).click();
  console.log('[snake-lifecycle] settings-persisted');

  await page.getByTitle('Draft setup').click();
  await expect(page.getByTestId('snake-setup-adapter')).toBeVisible({ timeout: 60_000 });
  const enterDraft = page.getByRole('button', { name: 'ENTER SNAKE DRAFT' });
  await expect(enterDraft).toBeEnabled({ timeout: 90_000 });
  await enterDraft.click();
  await expect(page).toHaveURL(new RegExp(`/snake-room\\?leagueId=${LEAGUE_ID}`), { timeout: 60_000 });
  console.log('[snake-lifecycle] draft-setup-entered-room');

  const roomPass = page.getByRole('button', { name: 'I HAVE THE ROOM' });
  await expect(roomPass).toBeVisible({ timeout: 60_000 });
  await roomPass.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('private-draft-desk')).toHaveCount(0);
  await page.getByRole('button', { name: `REVEAL ${TEAM_NAMES[0].toUpperCase()} SEAT` }).click();
  await expect(page.getByTestId('private-draft-desk')).toBeVisible({ timeout: 60_000 });
  await page.getByLabel('TEAM', { exact: true }).selectOption(TEAM_IDS[1]);
  await expect(page.getByTestId('private-draft-desk')).toHaveCount(0);
  await expect(page.getByRole('button', { name: `REVEAL ${TEAM_NAMES[1].toUpperCase()} SEAT` })).toBeVisible();
  console.log('[snake-lifecycle] private-seat-switch-covered');

  await page.getByLabel('TEAM', { exact: true }).selectOption(TEAM_IDS[0]);
  await page.getByRole('button', { name: `REVEAL ${TEAM_NAMES[0].toUpperCase()} SEAT` }).click();
  const certifiedPlayerName = await firstCertifiedPlayerName(page, TEAM_IDS[0]);
  const playerPoolTab = page.getByRole('button', { name: 'PLAYER POOL' });
  await playerPoolTab.click();
  await expect(playerPoolTab).toHaveAttribute('aria-pressed', 'true');
  const certifiedPlayer = page.getByRole('button', {
    name: new RegExp(`^SELECT ${escapeRegExp(certifiedPlayerName)}`, 'i'),
  }).first();
  await expect(certifiedPlayer).toBeVisible({ timeout: 60_000 });
  await certifiedPlayer.click();
  console.log('[snake-lifecycle] player-pool-certified-player-selected');
  const draftPlayer = page.getByRole('button', { name: 'DRAFT PLAYER' });
  await expect(draftPlayer).toBeVisible({ timeout: 60_000 });
  await draftPlayer.click();
  const gavel = page.getByRole('button', { name: 'HOLD THE GAVEL' });
  await expect(gavel).toBeVisible({ timeout: 20_000 });
  await gavel.dispatchEvent('pointerdown');
  await page.waitForTimeout(1_250);
  const holding = page.getByRole('button', { name: 'KEEP HOLDING' });
  if (await holding.isVisible().catch(() => false)) await holding.dispatchEvent('pointerup');
  console.log('[snake-lifecycle] real-gavel-held');
  await expect.poll(async () => page.evaluate(async (leagueId) => {
    const session = await (await import('/src/utils/leagueBuilderStorage.ts')).getMlbDraftSession(leagueId, 1);
    return {
      completedPicks: session?.completedPicks.length ?? 0,
      currentPickIndex: session?.currentPickIndex ?? 0,
    };
  }, LEAGUE_ID), { timeout: 90_000 }).toEqual({ completedPicks: 1, currentPickIndex: 1 });
  console.log('[snake-lifecycle] real-gavel-pick-primary-state-stored');
  await page.getByLabel('TEAM', { exact: true }).selectOption(TEAM_IDS[1]);
  await expect(page.getByLabel('TEAM', { exact: true })).toHaveValue(TEAM_IDS[1]);
  await expect(page.getByTestId('private-draft-desk')).toHaveCount(0);
  const passToBetaDialog = page.getByRole('dialog').filter({ hasText: 'PASS TO BETA GM' });
  await expect(passToBetaDialog).toBeVisible({ timeout: 90_000 });
  await passToBetaDialog.getByRole('button', { name: 'I HAVE THE ROOM' }).click();
  await expect(passToBetaDialog).toHaveCount(0);
  await page.getByRole('button', { name: `REVEAL ${TEAM_NAMES[1].toUpperCase()} SEAT` }).click();
  await expect(page.getByTestId('private-draft-desk')).toBeVisible({ timeout: 60_000 });
  console.log('[snake-lifecycle] real-gavel-pick-stored');

  const completedMlb = await finishMlbDraftWithStoredEngine(page);
  expect(completedMlb.picks).toBe(44);
  expect(completedMlb.legalByTeam).toEqual({ [TEAM_IDS[0]]: true, [TEAM_IDS[1]]: true });
  expect(completedMlb.canonicalTaxMatches).toBe(true);
  expect(completedMlb.certificateSeedable).toBe(true);
  expect(completedMlb.certificateCountsExact).toBe(true);
  expect(completedMlb.certificateCostsComplete).toBe(true);
  expect(Object.values(completedMlb.taxByTeam).every(Number.isFinite)).toBe(true);
  expect(completedMlb.solventByTeam).toEqual({ [TEAM_IDS[0]]: true, [TEAM_IDS[1]]: true });
  console.log('[snake-lifecycle] mlb-engine-complete-legal-tax-solvent');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'MLB DRAFT RECAP' })).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: 'CONFIRM MLB DRAFT' }).click();
  await expect(page).toHaveURL(new RegExp(`/league-builder/scout-hire\\?leagueId=${LEAGUE_ID}`), { timeout: 60_000 });
  console.log('[snake-lifecycle] mlb-recap-confirmed');

  await expect(page.getByRole('heading', { name: 'Meet Your Draft Scouts' })).toBeVisible();
  const confirmScouts = page.getByRole('button', { name: 'Confirm Scouts' });
  await expect(confirmScouts).toBeEnabled({ timeout: 60_000 });
  await confirmScouts.click();
  await expect(page).toHaveURL(new RegExp(`/snake-room\\?leagueId=${LEAGUE_ID}&phase=farm`), { timeout: 60_000 });
  await expect.poll(async () => page.evaluate(async (leagueId) => (
    (await import('/src/utils/leagueBuilderStorage.ts')).getScoutProfilesForLeague(leagueId)
  ).then((scouts) => scouts.length), LEAGUE_ID), { timeout: 30_000 }).toBe(2);
  console.log('[snake-lifecycle] scouts-stored-farm-room-open');

  const readFarmAuthority = () => page.evaluate(async (leagueId) => {
    const storage = await import('/src/utils/leagueBuilderStorage.ts');
    const farmSlots = await import('/src/engines/snakeFarmSlots.ts');
    const session = await storage.getMlbDraftSession(leagueId, farmSlots.FARM_SNAKE_SESSION_NUMBER);
    return {
      phase: session?.draftPhase ?? null,
      mlbBoards: Object.keys(session?.seatBoards ?? {}).length,
      farmBoards: Object.keys(session?.farmSeatBoards ?? {}).length,
    };
  }, LEAGUE_ID);
  const freshFarmAuthority = { phase: 'FARM', mlbBoards: 0, farmBoards: TEAM_IDS.length };
  await expect.poll(readFarmAuthority, { timeout: 60_000 }).toEqual(freshFarmAuthority);
  await page.reload();
  await expect(page).toHaveURL(new RegExp(`/snake-room\\?leagueId=${LEAGUE_ID}&phase=farm`));
  await expect(page.getByRole('heading', { name: 'THE FARM ROOM COULD NOT OPEN' })).toHaveCount(0);
  await expect.poll(readFarmAuthority, { timeout: 60_000 }).toEqual(freshFarmAuthority);
  console.log('[snake-lifecycle] farm-authority-reload-clean');

  const farmPass = page.getByRole('button', { name: 'I HAVE THE ROOM' });
  await expect(farmPass).toBeVisible({ timeout: 60_000 });
  await farmPass.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: `REVEAL ${TEAM_NAMES[0].toUpperCase()} SEAT` })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('region', { name: 'Farm private desk' })).toHaveCount(0);
  await page.getByRole('button', { name: `REVEAL ${TEAM_NAMES[0].toUpperCase()} SEAT` }).click();
  await expect(page.getByRole('region', { name: 'Farm private desk' })).toBeVisible({ timeout: 60_000 });

  expect(await finishFarmDraftWithStoredEngine(page)).toBe(20);
  console.log('[snake-lifecycle] farm-engine-complete');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'FARM DRAFT RECAP' })).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: 'CONFIRM FARM DRAFT' }).click();
  await expect(page).toHaveURL(new RegExp(`/league-builder/staff-hire\\?leagueId=${LEAGUE_ID}`), { timeout: 60_000 });
  console.log('[snake-lifecycle] farm-recap-confirmed');

  await expect(page.getByRole('heading', { name: 'Staff Your Clubs' })).toBeVisible();
  const confirmStaff = page.getByRole('button', { name: 'Confirm Staff and Continue to Franchise Setup' });
  await expect(confirmStaff).toBeEnabled({ timeout: 60_000 });
  await confirmStaff.click();
  await expect(page).toHaveURL(new RegExp(`/franchise/setup\\?leagueId=${LEAGUE_ID}`), { timeout: 60_000 });
  console.log('[snake-lifecycle] staffing-confirmed');

  const draftedState = await storedSnakeState(page);
  expect(draftedState).toEqual({
    mlbPicks: 44,
    farmPicks: 20,
    rosterCounts: {
      [TEAM_IDS[0]]: { mlb: 22, farm: 10 },
      [TEAM_IDS[1]]: { mlb: 22, farm: 10 },
    },
    scouts: 2,
    staffReady: { [TEAM_IDS[0]]: true, [TEAM_IDS[1]]: true },
  });
  console.log('[snake-lifecycle] handoffs-rosters-scouts-staff-stored');

  await expect(page.getByRole('heading', { name: 'SEASON SETTINGS' })).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: 'NEXT' }).click();
  await expect(page.getByRole('heading', { name: 'CONFIRM & LAUNCH' })).toBeVisible();
  await expect(page.getByText('MLB + FARM DRAFT PICKS COMPLETE')).toBeVisible();
  await expect(page.getByText('ROSTERS READY')).toBeVisible({ timeout: 60_000 });
  await page.getByLabel('FRANCHISE NAME').fill(FRANCHISE_NAME);
  const livingSeason = page.getByRole('switch');
  if (await livingSeason.getAttribute('aria-checked') !== 'true') await livingSeason.click();
  await page.getByRole('button', { name: 'START FRANCHISE' }).click();
  const freezeDialog = page.getByRole('dialog', { name: 'Start the franchise?' });
  await expect(freezeDialog).toBeVisible();
  await freezeDialog.getByRole('button', { name: 'Start Franchise' }).click();
  await expect(page.getByRole('button', { name: 'ENTER YOUR FRANCHISE' })).toBeVisible({ timeout: 120_000 });
  console.log('[snake-lifecycle] franchise-launched');

  const launched = await launchState(page);
  expect(launched.initialGames).toBe(0);
  expect(launched.schedulePolicy).toMatchObject({
    policy: 'empty-manual-user-supplied',
    generatedSchedulesAllowed: false,
    initialScheduleRows: 0,
  });
  expect(launched.livingSeasonEnabled).toBe(true);
  console.log('[snake-lifecycle] zero-schedule-policy-stored');

  await page.getByRole('button', { name: 'ENTER YOUR FRANCHISE' }).click();
  await expect(page).toHaveURL(new RegExp(`/franchise/${launched.franchiseId}$`), { timeout: 60_000 });
  await page.getByRole('button', { name: 'Schedule', exact: true }).click();
  await expect(page.getByText('NO GAMES SCHEDULED')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('button', { name: 'Add Game' }).first()).toBeVisible();
  await expect(page.getByText('Review CSV')).toBeVisible();

  await page.getByRole('button', { name: 'Add Game' }).first().click();
  const addGameDialog = page.getByRole('dialog', { name: 'ADD GAME TO SCHEDULE' });
  await addGameDialog.getByLabel('Away Team').selectOption(TEAM_IDS[0]);
  await addGameDialog.getByLabel('Home Team').selectOption(TEAM_IDS[1]);
  await addGameDialog.getByRole('button', { name: 'ADD GAME' }).click();
  await expect.poll(
    async () => page.evaluate(async ({ franchiseId }) => (
      (await import('/src/utils/scheduleStorage.ts')).getAllGamesByFranchise(franchiseId, 1)
    ).then((games) => games.map((game) => game.source)), { franchiseId: launched.franchiseId }),
    { timeout: 30_000 },
  ).toEqual(['manual']);
  console.log('[snake-lifecycle] manual-schedule-row-stored');

  await page.locator('input[type="file"][accept*=".csv"]').setInputFiles({
    name: 'snake-production-schedule.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(`gameNumber,awayTeam,homeTeam,dayNumber\n2,${TEAM_NAMES[1]},${TEAM_NAMES[0]},2\n`),
  });
  await expect(page.getByText('1 valid rows')).toBeVisible();
  await page.getByRole('button', { name: 'Accept Import' }).click();
  await expect.poll(
    async () => page.evaluate(async ({ franchiseId }) => (
      (await import('/src/utils/scheduleStorage.ts')).getAllGamesByFranchise(franchiseId, 1)
    ).then((games) => games.map((game) => game.source).sort()), { franchiseId: launched.franchiseId }),
    { timeout: 30_000 },
  ).toEqual(['csv-import', 'manual']);
  console.log('[snake-lifecycle] csv-schedule-row-stored');
});
