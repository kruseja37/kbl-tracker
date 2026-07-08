import { describe, expect, test } from 'vitest';

import { ALL_MLB_PLAYERS } from '../src/data/players/mlb';
import type { PlayerData } from '../src/data/playerDatabase';
import { DEFAULT_AUCTION_BID_INCREMENT } from '../src/data/auctionEngineConstants';
import { LEAGUE_MINIMUM_SALARY } from '../src/data/rosterEngineConstants';
import { getLeagueTeamIds } from '../src/data/leagueStructure';
import { HISTORICAL_ARCHETYPES } from '../src/data/historicalArchetypes';
import { LEGAL_ROSTER, isLegalRoster, type RosterSlotPlayer } from '../src/data/rosterConstruction';
import {
  DEFAULT_POOL_QUALITY_CENTER,
  extractPoolFromDemand,
  poolBalancePresetTuning,
  type DemandUniversePlayer,
} from '../src/engines/poolFromDemand';
import { computePoolTierCap } from '../src/engines/leagueConstruction';
import {
  calculateIvBaseSalary,
  calculateSalary,
  type PlayerForSalary,
  type PlayerPosition,
} from '../src/engines/salaryCalculator';
import { toRosterSlotPlayer } from '../src/engines/rosterNeed';
import { scoreSmb4Player } from '../src/engines/smb4GradeEmulator';
import { cheapestLegalCompletion, type CompletionCandidate } from '../src/engines/auctionCompletionFloor';
import {
  surfaceNextPlayer,
  type AuctionPlayer,
  type AuctionResult,
  type AuctionSession,
  type AuctionTeamState,
} from '../src/engines/auctionStateMachine';
import type { AuctionSimPlayer } from '../src/engines/auctionSim';

const RUN_MATRIX = process.env.RUN_M1J_COMPLETION_MATRIX === '1';
const maybeTest = RUN_MATRIX ? test : test.skip;

const SEEDS = ['m1e-s1', 'm1e-s2', 'm1e-s3'] as const;
const TEAM_COUNTS = [6, 8] as const;
const SHILL_COUNTS = [0, 2] as const;
const LEGS = [
  { id: 'k0', reserveFractionK: 0 },
  { id: 'k065', reserveFractionK: 0.65 },
] as const;

const ROSTER_SIZE = LEGAL_ROSTER.size;
const FALLBACK_BUDGET_PER_TEAM = 1_000_000;
const POOL_BALANCE_PRESET = 'balanced' as const;
const POOL_QUALITY_CENTER = DEFAULT_POOL_QUALITY_CENTER;
type GateArchetype = (typeof HISTORICAL_ARCHETYPES)[number];

type MatrixRow = {
  teams: number;
  shills: number;
  leg: string;
  playerPoolSize: number;
  poolDemandBase: number;
  poolTargetSize: number;
  runs: number;
  completedLegalRosters: number;
  expectedLegalRosters: number;
  uncompletableFlags: number;
  shortOrIllegal: number;
};

type ProductionPoolBasis = {
  players: AuctionSimPlayer[];
  budgetPerTeam: number;
  demandBase: number;
  targetSize: number;
};

function traitsOf(player: PlayerData): string[] {
  return [player.traits.trait1, player.traits.trait2].filter((trait): trait is string => Boolean(trait));
}

function toSalaryPosition(position: string | undefined): PlayerPosition {
  const allowed = new Set<string>(['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP', 'CP', 'SP/RP']);
  return position && allowed.has(position) ? position as PlayerPosition : 'UTIL';
}

function toSalaryPlayer(player: PlayerData): PlayerForSalary {
  return {
    id: player.id,
    name: player.name,
    isPitcher: player.isPitcher,
    primaryPosition: toSalaryPosition(player.primaryPosition),
    secondaryPosition: player.secondaryPosition ? toSalaryPosition(player.secondaryPosition) : undefined,
    pitcherRole: player.isPitcher && ['SP', 'RP', 'CP', 'SP/RP'].includes(player.primaryPosition)
      ? player.primaryPosition as PlayerForSalary['pitcherRole']
      : undefined,
    ratings: player.isPitcher
      ? player.pitcherRatings ?? { velocity: 0, junk: 0, accuracy: 0 }
      : player.batterRatings ?? { power: 0, contact: 0, speed: 0, fielding: 0, arm: 0 },
    battingRatings: player.batterRatings,
    age: player.age,
    bats: player.bats,
    fame: 0,
    traits: traitsOf(player),
    arsenal: player.arsenal ?? [],
    armSlot: player.armSlot ?? null,
  };
}

function toDemandPlayer(player: PlayerData): DemandUniversePlayer {
  const salaryPlayer = toSalaryPlayer(player);
  const iv = calculateIvBaseSalary(salaryPlayer).ivBase;
  const shape = toRosterSlotPlayer({
    primaryPosition: player.primaryPosition,
    secondaryPosition: player.secondaryPosition,
    traits: traitsOf(player),
  });
  return {
    id: player.id,
    name: player.name,
    iv,
    salary: calculateSalary(salaryPlayer),
    isPitcher: shape.isPitcher,
    position: shape.position,
    role: shape.role as DemandUniversePlayer['role'],
    secondaryPosition: shape.secondaryPosition,
    twoWayVariant: shape.twoWayVariant,
    bat: {
      POW: player.batterRatings?.power ?? 0,
      CON: player.batterRatings?.contact ?? 0,
      SPD: player.batterRatings?.speed ?? 0,
      FLD: player.batterRatings?.fielding ?? 0,
      ARM: player.batterRatings?.arm ?? 0,
    },
    pit: shape.isPitcher
      ? {
          VEL: player.pitcherRatings?.velocity ?? 0,
          JNK: player.pitcherRatings?.junk ?? 0,
          ACC: player.pitcherRatings?.accuracy ?? 0,
        }
      : undefined,
    profile: {
      isPitcher: shape.isPitcher,
      primaryPosition: player.primaryPosition,
      secondaryPosition: player.secondaryPosition ?? null,
      bats: player.bats,
      throws: player.throws,
      age: player.age,
      power: player.batterRatings?.power ?? 0,
      contact: player.batterRatings?.contact ?? 0,
      speed: player.batterRatings?.speed ?? 0,
      fielding: player.batterRatings?.fielding ?? 0,
      arm: player.batterRatings?.arm ?? 0,
      velocity: player.pitcherRatings?.velocity ?? 0,
      junk: player.pitcherRatings?.junk ?? 0,
      accuracy: player.pitcherRatings?.accuracy ?? 0,
      traits: traitsOf(player),
      arsenal: player.arsenal,
      personality: 'Competitive',
    },
  };
}

function toAuctionPool(players: readonly DemandUniversePlayer[]): AuctionSimPlayer[] {
  const priced = players.map((player) => {
    const arsenal = player.profile.arsenal ? [...player.profile.arsenal] : undefined;
    const trait1 = player.profile.traits?.[0] ?? undefined;
    const trait2 = player.profile.traits?.[1] ?? undefined;
    const scored = scoreSmb4Player({
      name: player.name ?? player.id,
      age: player.profile.age,
      primaryPosition: player.profile.primaryPosition ?? player.position,
      secondaryPosition: player.profile.secondaryPosition ?? player.secondaryPosition ?? undefined,
      bats: player.profile.bats,
      throws: player.profile.throws,
      power: player.profile.power,
      contact: player.profile.contact,
      speed: player.profile.speed,
      fielding: player.profile.fielding,
      arm: player.profile.arm,
      velocity: player.profile.velocity,
      junk: player.profile.junk,
      accuracy: player.profile.accuracy,
      arsenal,
      trait1,
      trait2,
    });
    return {
      playerId: player.id,
      iv: player.iv,
      salary: player.salary,
      numericGrade: scored.numericScore,
      grade: scored.grade,
      smb4Input: {
        name: player.name ?? player.id,
        age: player.profile.age,
        primaryPosition: player.profile.primaryPosition ?? player.position,
        secondaryPosition: player.profile.secondaryPosition ?? player.secondaryPosition ?? undefined,
        bats: player.profile.bats,
        throws: player.profile.throws,
        power: player.profile.power,
        contact: player.profile.contact,
        speed: player.profile.speed,
        fielding: player.profile.fielding,
        arm: player.profile.arm,
        velocity: player.profile.velocity,
        junk: player.profile.junk,
        accuracy: player.profile.accuracy,
        arsenal,
        trait1,
        trait2,
      },
      pos: toRosterSlotPlayer({
        primaryPosition: player.profile.primaryPosition ?? player.position,
        secondaryPosition: player.profile.secondaryPosition ?? player.secondaryPosition,
        traits: player.profile.traits,
      }),
    };
  });
  const sorted = [...priced].sort((left, right) => right.iv - left.iv || left.playerId.localeCompare(right.playerId));
  const denominator = Math.max(1, sorted.length - 1);
  const percentileById = new Map(sorted.map((player, index) => [player.playerId, 100 - (index / denominator) * 100]));
  return priced
    .map((player) => ({ ...player, ivPercentile: percentileById.get(player.playerId) ?? 0 }))
    .sort((left, right) => left.playerId.localeCompare(right.playerId));
}

function budgetForPool(pool: readonly AuctionSimPlayer[]): number {
  return computePoolTierCap(pool.map((player) => player.iv), 'juiced') || FALLBACK_BUDGET_PER_TEAM;
}

function productionPoolBasis(teamCount: number): ProductionPoolBasis {
  const universe = ALL_MLB_PLAYERS.map(toDemandPlayer);
  const teamIds = getLeagueTeamIds('mlb').slice(0, teamCount);
  const selectedArchetypes: GateArchetype[] = teamIds.map((_, index) => HISTORICAL_ARCHETYPES[index % HISTORICAL_ARCHETYPES.length]);
  const priorityIds = ALL_MLB_PLAYERS
    .filter((player) => teamIds.includes(player.teamId))
    .map((player) => player.id)
    .sort((left, right) => left.localeCompare(right));
  const budgetPerTeam = budgetForPool(toAuctionPool(universe));
  const tuning = poolBalancePresetTuning(POOL_BALANCE_PRESET, POOL_QUALITY_CENTER);
  const result = extractPoolFromDemand(universe, [], selectedArchetypes, 'juiced', {
    teams: teamCount,
    shills: 0,
    budgetPerTeam,
    poolBalancePreset: POOL_BALANCE_PRESET,
    poolQualityCenter: POOL_QUALITY_CENTER,
    poolSizeMultiplier: tuning.poolSlackFactor,
    poolSourceMode: 'team-roster-priority',
    priorityIds,
  });
  return {
    players: toAuctionPool(result.players),
    budgetPerTeam,
    demandBase: result.sizing?.demandBase ?? teamCount * ROSTER_SIZE,
    targetSize: result.sizing?.effectiveTarget ?? result.players.length,
  };
}

function realTeamId(index: number): string {
  return `team-${index + 1}`;
}

function shillTeamId(index: number): string {
  return `__m1j_shill__${index + 1}`;
}

function auctionPlayersFromPool(pool: readonly AuctionSimPlayer[]): AuctionPlayer[] {
  return pool.map((player) => ({
    playerId: player.playerId,
    iv: player.iv,
    ivPercentile: player.ivPercentile ?? 0,
    pos: player.pos,
  }));
}

function passedResultsFromPool(pool: readonly AuctionSimPlayer[]): AuctionResult[] {
  return pool.map((player) => ({
    playerId: player.playerId,
    disposition: 'PASSED' as const,
    nominatorTeamId: 'terminal-driver',
    winnerTeamId: null,
    salary: null,
  }));
}

function quotePool(pool: readonly AuctionSimPlayer[]): CompletionCandidate[] {
  return pool.map((player) => {
    if (!player.pos) throw new Error(`Missing position for ${player.playerId}`);
    return {
      id: player.playerId,
      price: Math.max(LEAGUE_MINIMUM_SALARY, player.salary ?? player.iv),
      shape: player.pos,
    };
  });
}

function terminalSession(input: {
  pool: ProductionPoolBasis;
  teamCount: number;
  shillCount: number;
  reserveFractionK: number;
  seed: string;
}): AuctionSession {
  const nonCompletingTeamIds = Array.from({ length: input.shillCount }, (_, index) => shillTeamId(index));
  const players = auctionPlayersFromPool(input.pool.players);
  let remainingPool = [...input.pool.players];
  const teams: AuctionTeamState[] = [];
  const passedPlayers: AuctionSimPlayer[] = [];
  for (let index = 0; index < input.teamCount; index += 1) {
    const quote = cheapestLegalCompletion([], quotePool(remainingPool), ROSTER_SIZE);
    if (!quote.feasible) throw new Error(`Unable to build terminal-driver legal seed roster for team ${index + 1}`);
    const rosteredIds = quote.pickIds.slice(0, -1);
    const terminalFillId = quote.pickIds.at(-1);
    if (!terminalFillId) throw new Error(`Missing terminal fill for team ${index + 1}`);
    const used = new Set(quote.pickIds);
    const fillPlayer = remainingPool.find((player) => player.playerId === terminalFillId);
    if (!fillPlayer) throw new Error(`Missing terminal fill player ${terminalFillId}`);
    passedPlayers.push(fillPlayer);
    teams.push({
      teamId: realTeamId(index),
      budgetRemaining: input.pool.budgetPerTeam,
      rosterSlotsRemaining: 1,
      minSalary: LEAGUE_MINIMUM_SALARY,
      projectedTax: 0,
      roster: rosteredIds.map((playerId) => ({ playerId, salary: LEAGUE_MINIMUM_SALARY })),
    });
    remainingPool = remainingPool.filter((player) => !used.has(player.playerId));
  }
  teams.push(...Array.from({ length: input.shillCount }, (_, index) => ({
    teamId: shillTeamId(index),
    budgetRemaining: input.pool.budgetPerTeam,
    rosterSlotsRemaining: ROSTER_SIZE,
    minSalary: LEAGUE_MINIMUM_SALARY,
    projectedTax: 0,
    roster: [],
  })));
  passedPlayers.push(...remainingPool);
  return {
    state: 'NOMINATION',
    config: {
      format: 'auction',
      bidIncrement: DEFAULT_AUCTION_BID_INCREMENT,
      turnTimerSeconds: null,
      nominationOrderSeed: `m1j:${input.seed}`,
      reserveFractionK: input.reserveFractionK,
      cpuShillCount: 0,
      excludeFromLeague: true,
      nonCompletingTeamIds,
    },
    teams,
    nominationOrder: [
      ...Array.from({ length: input.teamCount }, (_, index) => realTeamId(index)),
      ...nonCompletingTeamIds,
    ],
    nominationIndex: 0,
    nominationRound: 0,
    players: Object.fromEntries(players.map((player) => [player.playerId, player])),
    playerOrder: players.map((player) => player.playerId),
    availablePlayerIds: [],
    currentLot: null,
    pendingClaim: null,
    results: passedResultsFromPool(passedPlayers),
    saleCount: 0,
  };
}

function legalRealTeamCount(session: AuctionSession, shillCount: number): number {
  const nonCompleting = new Set(Array.from({ length: shillCount }, (_, index) => shillTeamId(index)));
  let count = 0;
  for (const team of session.teams) {
    if (nonCompleting.has(team.teamId)) continue;
    const shapes = team.roster.map((assignment) => session.players[assignment.playerId]?.pos);
    if (shapes.length === ROSTER_SIZE && shapes.every(Boolean) && isLegalRoster(shapes as RosterSlotPlayer[])) count += 1;
  }
  return count;
}

function runRow(teamCount: number, shillCount: number, leg: (typeof LEGS)[number]): MatrixRow {
  const pool = productionPoolBasis(teamCount);
  let completedLegalRosters = 0;
  let uncompletableFlags = 0;
  for (const seed of SEEDS) {
    const result = surfaceNextPlayer(terminalSession({
      pool,
      teamCount,
      shillCount,
      reserveFractionK: leg.reserveFractionK,
      seed: `${seed}:teams${teamCount}:shills${shillCount}:${leg.id}`,
    }));
    if (!result.ok) {
      if (result.reason === 'auction-uncompletable') {
        completedLegalRosters += legalRealTeamCount(result.session, shillCount);
        uncompletableFlags += result.session.terminalShortfall?.teamIds.length ?? teamCount;
      }
      continue;
    }
    expect(result.session.state).toBe('AUCTION_COMPLETE');
    completedLegalRosters += legalRealTeamCount(result.session, shillCount);
  }

  const expectedLegalRosters = teamCount * SEEDS.length;
  return {
    teams: teamCount,
    shills: shillCount,
    leg: leg.id,
    playerPoolSize: pool.players.length,
    poolDemandBase: pool.demandBase,
    poolTargetSize: pool.targetSize,
    runs: SEEDS.length,
    completedLegalRosters,
    expectedLegalRosters,
    uncompletableFlags,
    shortOrIllegal: expectedLegalRosters - completedLegalRosters,
  };
}

describe('M1J live completion terminal matrix', () => {
  maybeTest('routes production-pool terminal exhaustion through cleanup for v1-scale rooms', () => {
    const rows: MatrixRow[] = [];
    for (const teamCount of TEAM_COUNTS) {
      for (const shillCount of SHILL_COUNTS) {
        for (const leg of LEGS) {
          rows.push(runRow(teamCount, shillCount, leg));
        }
      }
    }

    console.info('M1J_COMPLETION_LIVE_MATRIX');
    console.table(rows);

    for (const row of rows) {
      expect(row.completedLegalRosters, `${row.teams}/${row.shills}/${row.leg} legal rosters`)
        .toBe(row.expectedLegalRosters);
      expect(row.uncompletableFlags, `${row.teams}/${row.shills}/${row.leg} uncompletable flags`)
        .toBe(0);
      expect(row.shortOrIllegal, `${row.teams}/${row.shills}/${row.leg} short/illegal`)
        .toBe(0);
    }
  }, 300_000);
});
