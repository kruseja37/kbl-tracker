import { LEAGUE_MINIMUM_SALARY } from '../data/rosterEngineConstants';
import { isLegalRoster } from '../data/rosterConstruction';
import type {
  AuctionPlayer,
  AuctionSession,
  AuctionTeamInput,
} from '../engines/auctionStateMachine';
import type { RegisteredPool } from '../engines/leagueConstruction';
import { toRosterSlotPlayer } from '../engines/rosterNeed';
import type { FarmAuctionPool } from './farmAuctionPool';
import {
  getAllPlayers,
  getPlayer,
  getTeamRoster,
  savePlayer,
  saveTeamRoster,
  resetCompletedDraftArcAtomically,
  type Chemistry,
  type Grade,
  type PitchType,
  type Player,
  type Position,
  type Team,
  type TeamRoster,
  type LeagueBuilderMlbDraftSession,
} from './leagueBuilderStorage';
import { leagueHasLinkedFranchise } from './franchiseManager';
import { farmPickSalary } from '../engines/snakeFarmSlots';
import { readSnakeDraftTruth } from './snakeDraftManifest';

export const MLB_AUCTION_ROSTER_SLOTS = 22;
export const MLB_AUCTION_SEASON = 1;
export const RUN_IT_BACK_FRANCHISE_GUARD_MESSAGE =
  'A FRANCHISE IS ALREADY RUNNING ON THIS DRAFT — RE-RUNNING WOULD PULL ITS FLOOR OUT.';

export class ResetCompletedDraftLinkedFranchiseError extends Error {
  readonly leagueId: string;

  constructor(leagueId: string) {
    super(RUN_IT_BACK_FRANCHISE_GUARD_MESSAGE);
    this.name = 'ResetCompletedDraftLinkedFranchiseError';
    this.leagueId = leagueId;
    Object.defineProperty(this, 'leagueId', {
      value: leagueId,
      enumerable: true,
    });
  }
}

export interface AuctionRosterCommitReport {
  leagueId: string;
  rosterStatus: 'MLB' | 'FARM';
  committedPlayerIds: string[];
  teamRosterCounts: Record<string, number>;
}

export function computeIvPercentiles(poolPlayers: readonly RegisteredPool["players"][number][]): Map<string, number> {
  const sorted = [...poolPlayers].sort((left, right) => left.iv - right.iv || left.id.localeCompare(right.id));
  const denominator = Math.max(1, sorted.length - 1);
  const firstIndexByIv = new Map<number, number>();

  sorted.forEach((player, index) => {
    if (!firstIndexByIv.has(player.iv)) firstIndexByIv.set(player.iv, index);
  });

  return new Map(
    poolPlayers.map((player) => [
      player.id,
      sorted.length <= 1 ? 100 : ((firstIndexByIv.get(player.iv) ?? 0) / denominator) * 100,
    ]),
  );
}

export function buildAuctionPlayers(pool: RegisteredPool): AuctionPlayer[] {
  const percentiles = computeIvPercentiles(pool.players);
  return pool.players.map((player) => {
    if (!Number.isFinite(player.iv)) {
      throw new Error(`RegisteredPool player ${player.id} has no finite IV.`);
    }
    return {
      playerId: player.id,
      iv: player.iv,
      ivPercentile: percentiles.get(player.id) ?? 0,
    };
  });
}

/**
 * `buildAuctionPlayers` + position/legality enrichment for the own_need guard (FABLE-C1, spec §5).
 * The RegisteredPool is priced-only ({id, iv, salary}), so positions come from the stored Player
 * records. Enrichment is per-player permissive: a missing record leaves that player position-blind
 * (the machine's guard stands down for any roster containing him — never a false rejection).
 * MLB auction only — the farm auction's 10-man roster has different legality and stays unenriched.
 */
export async function buildAuctionPlayersWithPositions(
  pool: RegisteredPool,
  fetchPlayer: (playerId: string) => Promise<Player | null> = getPlayer,
): Promise<AuctionPlayer[]> {
  const base = buildAuctionPlayers(pool);
  return Promise.all(
    base.map(async (auctionPlayer) => {
      const stored = await fetchPlayer(auctionPlayer.playerId);
      if (!stored) return auctionPlayer;
      return {
        ...auctionPlayer,
        pos: toRosterSlotPlayer({
          primaryPosition: stored.primaryPosition,
          secondaryPosition: stored.secondaryPosition ?? null,
          traits: [stored.trait1, stored.trait2],
        }),
      };
    }),
  );
}

export async function buildAuctionTeams(input: {
  leagueTeams: readonly Team[];
  pool: RegisteredPool;
  getRoster: (teamId: string) => Promise<TeamRoster | null>;
}): Promise<AuctionTeamInput[]> {
  const poolById = new Map(input.pool.players.map((player) => [player.id, player]));

  return Promise.all(
    input.leagueTeams.map(async (team) => {
      const roster = await input.getRoster(team.id);
      const mlbRosterIds = roster?.mlbRoster ?? [];
      const committedRoster = mlbRosterIds
        .map((playerId) => {
          const poolPlayer = poolById.get(playerId);
          return poolPlayer ? { playerId, salary: poolPlayer.salary } : null;
        })
        .filter((assignment): assignment is { playerId: string; salary: number } => assignment !== null);
      const committedSalaries = committedRoster.reduce((sum, assignment) => sum + assignment.salary, 0);

      return {
        teamId: team.id,
        budgetRemaining: Math.max(0, input.pool.tierCap - committedSalaries),
        rosterSlotsRemaining: Math.max(0, MLB_AUCTION_ROSTER_SLOTS - mlbRosterIds.length),
        minSalary: LEAGUE_MINIMUM_SALARY,
        projectedTax: 0,
        roster: committedRoster,
      };
    }),
  );
}

function cloneRoster(roster: TeamRoster): TeamRoster {
  return {
    ...roster,
    mlbRoster: [...roster.mlbRoster],
    farmRoster: [...roster.farmRoster],
    lineupWithDH: [...roster.lineupWithDH],
    lineupWithoutDH: [...roster.lineupWithoutDH],
    startingRotation: [...roster.startingRotation],
    longRelievers: [...roster.longRelievers],
    setupPitchers: [...roster.setupPitchers],
    depthChart: {
      C: [...roster.depthChart.C],
      '1B': [...roster.depthChart['1B']],
      '2B': [...roster.depthChart['2B']],
      SS: [...roster.depthChart.SS],
      '3B': [...roster.depthChart['3B']],
      LF: [...roster.depthChart.LF],
      CF: [...roster.depthChart.CF],
      RF: [...roster.depthChart.RF],
      DH: [...roster.depthChart.DH],
      SP: [...roster.depthChart.SP],
      RP: [...roster.depthChart.RP],
      CP: [...roster.depthChart.CP],
    },
    pinchHitOrder: [...roster.pinchHitOrder],
    pinchRunOrder: [...roster.pinchRunOrder],
    defensiveSubOrder: [...roster.defensiveSubOrder],
  };
}

function completedSessionOrThrow(session: AuctionSession): void {
  if (session.state !== 'AUCTION_COMPLETE') {
    throw new Error(`Cannot commit auction roster before AUCTION_COMPLETE; current state is ${session.state}.`);
  }
}

function assignmentForLeague(player: Player, leagueId: string): NonNullable<Player['leagueAssignments']>[number] | undefined {
  return player.leagueAssignments?.find((assignment) => assignment.leagueId === leagueId);
}

async function resetAssignedLeaguePlayersByRosterStatus(
  leagueId: string,
  rosterStatus: 'MLB' | 'FARM',
): Promise<void> {
  const players = await getAllPlayers();

  for (const player of players) {
    const assignment = assignmentForLeague(player, leagueId);
    if (!assignment?.teamId || assignment.rosterStatus !== rosterStatus) continue;

    const nextAssignments = (player.leagueAssignments ?? []).map((candidate) =>
      candidate.leagueId === leagueId
        ? { ...candidate, teamId: '', rosterStatus: 'FREE_AGENT' as const }
        : candidate,
    );
    const { settledSalary: _settledSalary, ...playerWithoutSettledSalary } = player;
    void _settledSalary;
    await savePlayer({
      ...playerWithoutSettledSalary,
      leagueAssignments: nextAssignments,
    });
  }
}

function upsertAssignment(
  player: Player,
  leagueId: string,
  teamId: string,
  rosterStatus: 'MLB' | 'FARM',
): Player['leagueAssignments'] {
  return [
    ...(player.leagueAssignments ?? []).filter((assignment) => assignment.leagueId !== leagueId),
    { leagueId, teamId, rosterStatus },
  ];
}

async function commitTeamRoster(input: {
  leagueId: string;
  teamId: string;
  rosterStatus: 'MLB' | 'FARM';
  playerIds: readonly string[];
}): Promise<void> {
  const roster = await getTeamRoster(input.teamId);
  if (!roster) throw new Error(`Team "${input.teamId}" is missing a League Builder roster.`);

  const nextRoster = cloneRoster(roster);
  if (input.rosterStatus === 'MLB') {
    nextRoster.mlbRoster = [...input.playerIds];
  } else {
    nextRoster.farmRoster = [...input.playerIds];
  }
  await saveTeamRoster(nextRoster);
}

async function saveMlbAssignment(input: {
  leagueId: string;
  teamId: string;
  playerId: string;
  salary: number;
}): Promise<void> {
  const player = await getPlayer(input.playerId);
  if (!player) throw new Error(`Auction winner player "${input.playerId}" was not found.`);

  await savePlayer({
    ...player,
    salary: input.salary,
    settledSalary: input.salary,
    leagueAssignments: upsertAssignment(player, input.leagueId, input.teamId, 'MLB'),
  });
}

function farmProspectToPlayer(
  prospect: FarmAuctionPool['prospects'][number],
  leagueId: string,
  teamId: string,
  salary: number,
): Omit<Player, 'createdDate' | 'lastModified'> {
  return {
    ...prospect,
    primaryPosition: prospect.primaryPosition as Position,
    secondaryPosition: prospect.secondaryPosition as Position | undefined,
    arsenal: prospect.arsenal as PitchType[],
    overallGrade: prospect.overallGrade as Grade,
    personality: prospect.personality as Player['personality'],
    chemistry: prospect.chemistry as Chemistry,
    salary,
    settledSalary: salary,
    draftedAsFarmProspect: true,
    leagueAssignments: [{ leagueId, teamId, rosterStatus: 'FARM' }],
  };
}

export async function commitCompletedMlbAuctionSessionToLeagueRosters(input: {
  leagueId: string;
  session: AuctionSession;
  excludeTeamIds?: readonly string[];
}): Promise<AuctionRosterCommitReport> {
  completedSessionOrThrow(input.session);

  const teamRosterCounts: Record<string, number> = {};
  const committedPlayerIds: string[] = [];
  const excludedTeamIds = new Set(input.excludeTeamIds ?? []);

  for (const team of input.session.teams) {
    if (excludedTeamIds.has(team.teamId)) continue;
    for (const assignment of team.roster) {
      if (!await getPlayer(assignment.playerId)) {
        throw new Error(`Auction winner player "${assignment.playerId}" was not found.`);
      }
    }
  }
  await resetAssignedLeaguePlayersByRosterStatus(input.leagueId, 'MLB');

  for (const team of input.session.teams) {
    if (excludedTeamIds.has(team.teamId)) {
      teamRosterCounts[team.teamId] = team.roster.length;
      continue;
    }
    const playerIds = team.roster.map((assignment) => assignment.playerId);
    await commitTeamRoster({
      leagueId: input.leagueId,
      teamId: team.teamId,
      rosterStatus: 'MLB',
      playerIds,
    });
    teamRosterCounts[team.teamId] = playerIds.length;

    for (const assignment of team.roster) {
      await saveMlbAssignment({
        leagueId: input.leagueId,
        teamId: team.teamId,
        playerId: assignment.playerId,
        salary: assignment.salary,
      });
      committedPlayerIds.push(assignment.playerId);
    }
  }

  return {
    leagueId: input.leagueId,
    rosterStatus: 'MLB',
    committedPlayerIds,
    teamRosterCounts,
  };
}

export async function commitCompletedSnakeSessionToLeagueRosters(input: {
  leagueId: string;
  session: LeagueBuilderMlbDraftSession;
  pool: RegisteredPool;
}): Promise<AuctionRosterCommitReport> {
  if (!input.session.draftManifest && input.session.currentPickIndex < input.session.pickOrder.length) {
    throw new Error(
      `Cannot commit snake roster before completion; current pick ${input.session.currentPickIndex} of ${input.session.pickOrder.length}.`,
    );
  }

  const frozenTruth = input.session.draftManifest ? readSnakeDraftTruth(input.session, 'MLB') : null;
  if (frozenTruth?.manifest?.leagueId !== undefined && frozenTruth.manifest.leagueId !== input.leagueId) {
    throw new Error('The MLB snake manifest belongs to a different league.');
  }
  const availableMlbPoolIds = new Set(input.pool.players.map((player) => player.id));
  if (frozenTruth?.manifest && frozenTruth.manifest.pool.playerIds.some((playerId) => !availableMlbPoolIds.has(playerId))) {
    throw new Error('The MLB snake pool no longer matches its frozen manifest.');
  }
  const completedPicks = frozenTruth?.completedPicks ?? input.session.completedPicks;
  const pickOrder = frozenTruth?.pickOrder ?? input.session.pickOrder;
  if (completedPicks.length !== pickOrder.length) {
    throw new Error('Cannot commit snake rosters until every MLB pick is recorded.');
  }
  const poolById = new Map(input.pool.players.map((player) => [player.id, player]));
  const frozenSettlementByPlayerId = new Map(
    (frozenTruth?.completedPicks ?? []).map((pick) => [pick.playerId, pick.launchSalary]),
  );
  const settlementByPlayerId = new Map<string, number>();
  const seenPlayerIds = new Set<string>();
  for (const pick of completedPicks) {
    if (seenPlayerIds.has(pick.playerId)) {
      throw new Error(`Snake draft player "${pick.playerId}" appears in more than one completed pick.`);
    }
    seenPlayerIds.add(pick.playerId);
    const poolPlayer = poolById.get(pick.playerId);
    const settlement = frozenTruth ? frozenSettlementByPlayerId.get(pick.playerId) : poolPlayer?.iv;
    if (!Number.isFinite(settlement) || settlement! < 0) {
      throw new Error(`Snake draft player "${pick.playerId}" was not found with a finite RegisteredPool IV.`);
    }
    settlementByPlayerId.set(pick.playerId, settlement!);
  }

  const picksByTeamId = new Map<string, Array<{ round: number; pick: number; teamId: string; playerId: string }>>();
  for (const pick of completedPicks) {
    picksByTeamId.set(pick.teamId, [...(picksByTeamId.get(pick.teamId) ?? []), pick]);
  }

  const teamRosterCounts: Record<string, number> = {};
  const committedPlayerIds: string[] = [];
  const teamIds = [...new Set(pickOrder.map((pick) => pick.teamId))];

  // Fail closed before the first roster/player write. Pick-time rails are not
  // durable proof: synced, migrated, or tampered sessions can bypass them.
  for (const teamId of teamIds) {
    const picks = picksByTeamId.get(teamId) ?? [];
    const storedPlayers = await Promise.all(picks.map((pick) => getPlayer(pick.playerId)));
    if (storedPlayers.some((player) => !player)) {
      throw new Error(`The completed MLB snake roster for ${teamId} is missing player data.`);
    }
    const legalityPlayers = storedPlayers.map((player) => toRosterSlotPlayer({
      primaryPosition: player!.primaryPosition,
      secondaryPosition: player!.secondaryPosition ?? null,
      traits: [player!.trait1, player!.trait2],
    }));
    if (!isLegalRoster(legalityPlayers)) {
      throw new Error(`The completed MLB snake roster for ${teamId} is not a legal 22-player roster.`);
    }
  }

  await resetAssignedLeaguePlayersByRosterStatus(input.leagueId, 'MLB');

  for (const teamId of teamIds) {
    const picks = picksByTeamId.get(teamId) ?? [];
    const playerIds = picks.map((pick) => pick.playerId);
    await commitTeamRoster({
      leagueId: input.leagueId,
      teamId,
      rosterStatus: 'MLB',
      playerIds,
    });
    teamRosterCounts[teamId] = playerIds.length;

    for (const pick of picks) {
      await saveMlbAssignment({
        leagueId: input.leagueId,
        teamId,
        playerId: pick.playerId,
        salary: settlementByPlayerId.get(pick.playerId)!,
      });
      committedPlayerIds.push(pick.playerId);
    }
  }

  return {
    leagueId: input.leagueId,
    rosterStatus: 'MLB',
    committedPlayerIds,
    teamRosterCounts,
  };
}

export async function commitCompletedFarmAuctionSessionToLeagueRosters(input: {
  leagueId: string;
  session: AuctionSession;
  pool: FarmAuctionPool;
}): Promise<AuctionRosterCommitReport> {
  completedSessionOrThrow(input.session);

  const prospectsById = new Map(input.pool.prospects.map((prospect) => [prospect.id, prospect]));
  const teamRosterCounts: Record<string, number> = {};
  const committedPlayerIds: string[] = [];

  for (const team of input.session.teams) {
    for (const assignment of team.roster) {
      if (!prospectsById.has(assignment.playerId)) {
        throw new Error(`Farm auction prospect "${assignment.playerId}" was not found in the saved pool.`);
      }
    }
  }
  await resetAssignedLeaguePlayersByRosterStatus(input.leagueId, 'FARM');

  for (const team of input.session.teams) {
    const playerIds = team.roster.map((assignment) => assignment.playerId);
    await commitTeamRoster({
      leagueId: input.leagueId,
      teamId: team.teamId,
      rosterStatus: 'FARM',
      playerIds,
    });
    teamRosterCounts[team.teamId] = playerIds.length;

    for (const assignment of team.roster) {
      const prospect = prospectsById.get(assignment.playerId);
      if (!prospect) throw new Error(`Farm auction prospect "${assignment.playerId}" was not found in the saved pool.`);
      await savePlayer(farmProspectToPlayer(prospect, input.leagueId, team.teamId, assignment.salary));
      committedPlayerIds.push(assignment.playerId);
    }
  }

  return {
    leagueId: input.leagueId,
    rosterStatus: 'FARM',
    committedPlayerIds,
    teamRosterCounts,
  };
}

/** S6 additive farm-snake handoff. The auction commit above remains unchanged. */
export async function commitCompletedSnakeFarmSessionToLeagueRosters(input: {
  leagueId: string;
  session: LeagueBuilderMlbDraftSession;
  pool: FarmAuctionPool;
}): Promise<AuctionRosterCommitReport> {
  if (!input.session.draftManifest && input.session.draftPhase !== 'FARM') {
    throw new Error('Cannot commit a non-farm snake session to farm rosters.');
  }
  if (!input.session.draftManifest && input.session.currentPickIndex < input.session.pickOrder.length) {
    throw new Error(
      `Cannot commit farm snake roster before completion; current pick ${input.session.currentPickIndex} of ${input.session.pickOrder.length}.`,
    );
  }
  const frozenTruth = input.session.draftManifest ? readSnakeDraftTruth(input.session, 'FARM') : null;
  if (frozenTruth?.manifest?.leagueId !== undefined && frozenTruth.manifest.leagueId !== input.leagueId) {
    throw new Error('The FARM snake manifest belongs to a different league.');
  }
  const availableFarmPoolIds = new Set(input.pool.prospects.map((prospect) => prospect.id));
  if (frozenTruth?.manifest && frozenTruth.manifest.pool.playerIds.some((playerId) => !availableFarmPoolIds.has(playerId))) {
    throw new Error('The FARM snake pool no longer matches its frozen manifest.');
  }
  const completedPicks = frozenTruth?.completedPicks ?? input.session.completedPicks;
  const pickOrder = frozenTruth?.pickOrder ?? input.session.pickOrder;
  const frozenSettlementByPlayerId = new Map(
    (frozenTruth?.completedPicks ?? []).map((pick) => [pick.playerId, pick.launchSalary]),
  );
  const prospectsById = new Map(input.pool.prospects.map((prospect) => [prospect.id, prospect]));
  if (completedPicks.length !== pickOrder.length) {
    throw new Error('Cannot commit farm snake rosters until every farm pick is recorded.');
  }
  const seenPlayerIds = new Set<string>();
  const picksByTeamId = new Map<string, Array<{ round: number; pick: number; teamId: string; playerId: string }>>();
  for (const pick of completedPicks) {
    if (seenPlayerIds.has(pick.playerId)) {
      throw new Error(`Farm snake prospect "${pick.playerId}" appears in more than one completed pick.`);
    }
    seenPlayerIds.add(pick.playerId);
    if (!prospectsById.has(pick.playerId)) {
      throw new Error(`Farm snake prospect "${pick.playerId}" was not found in the deterministic farm pool.`);
    }
    picksByTeamId.set(pick.teamId, [...(picksByTeamId.get(pick.teamId) ?? []), pick]);
  }

  const teamRosterCounts: Record<string, number> = {};
  const committedPlayerIds: string[] = [];
  const teamIds = [...new Set(pickOrder.map((pick) => pick.teamId))];
  await resetAssignedLeaguePlayersByRosterStatus(input.leagueId, 'FARM');
  for (const teamId of teamIds) {
    const picks = picksByTeamId.get(teamId) ?? [];
    const playerIds = picks.map((pick) => pick.playerId);
    await commitTeamRoster({ leagueId: input.leagueId, teamId, rosterStatus: 'FARM', playerIds });
    teamRosterCounts[teamId] = playerIds.length;
    for (const pick of picks) {
      const prospect = prospectsById.get(pick.playerId)!;
      const salary = frozenTruth
        ? frozenSettlementByPlayerId.get(pick.playerId)!
        : farmPickSalary(input.session, pick.pick);
      await savePlayer(farmProspectToPlayer(prospect, input.leagueId, teamId, salary));
      committedPlayerIds.push(pick.playerId);
    }
  }
  return { leagueId: input.leagueId, rosterStatus: 'FARM', committedPlayerIds, teamRosterCounts };
}

export async function resetCompletedDraftArc(leagueId: string): Promise<void> {
  if (await leagueHasLinkedFranchise(leagueId)) {
    throw new ResetCompletedDraftLinkedFranchiseError(leagueId);
  }

  await resetCompletedDraftArcAtomically(leagueId);
}
