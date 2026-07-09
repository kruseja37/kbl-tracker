import { describe, expect, test } from 'vitest';

import { DEFAULT_AUCTION_BID_INCREMENT, scaledShillDefault } from '../../data/auctionEngineConstants';
import { HISTORICAL_ARCHETYPES, type HistoricalArchetype } from '../../data/historicalArchetypes';
import { getLeagueTeamIds } from '../../data/leagueStructure';
import { CHEMISTRY_CODE_TO_WORD, normalizeToChemistryCode } from '../../data/chemistryCanonical';
import type { PlayerData } from '../../data/playerDatabase';
import { ALL_MLB_PLAYERS } from '../../data/players/mlb';
import { canCover, isCloser, isLegalRoster, LEGAL_ROSTER, type RosterSlotPlayer } from '../../data/rosterConstruction';
import { LEAGUE_MINIMUM_SALARY } from '../../data/rosterEngineConstants';
import { LUXURY_CAP_TABLES, TIER_CAPS, type TierKey } from '../../data/tierParams';
import {
  auctionMarginalTaxWithCaps,
} from '../auctionLuxuryTax';
import { DEFAULT_RESERVE_PRICE_K } from '../auctionReservePrice';
import {
  advanceLot,
  claimLoneSurvivor,
  getCurrentBidderTeamId,
  initAuctionSession,
  passBid,
  passLoneSurvivorOut,
  resolveLot,
  surfaceNextPlayer,
  type AuctionResult,
  type AuctionTransitionResult,
} from '../auctionStateMachine';
import {
  buildArchetypeShillProfile,
  buildClubCpuProfile,
  cpuBidOnLot,
  cpuDecideLoneSurvivor,
  archetypeBandPriorities,
  type CpuShillAuctionPlayer,
  type CpuShillAuctionSession,
  type CpuShillProfile,
} from '../cpuShillBidding';
import {
  computePoolTierCap,
  luxuryTax,
  registerPool,
  shiftLuxuryCaps,
  type ConstructionPlayer,
  type RegisteredPool,
} from '../leagueConstruction';
import {
  DEFAULT_POOL_QUALITY_CENTER,
  extractPoolFromDemand,
  poolBalancePresetTuning,
  type DemandUniversePlayer,
  type PoolBalancePresetKey,
  type TeamDesignInput,
} from '../poolFromDemand';
import { archetypeToCapIdentity } from '../archetypeIdentity';
import { cheapestLegalCompletion, type CompletionCandidate } from '../auctionCompletionFloor';
import { buildDefaultDesignSlots, type DesignSlot } from '../rosterDesignFeasibility';
import { toRosterSlotPlayer } from '../rosterNeed';
import { calculateIvBaseSalary, calculateSalary, type PlayerForSalary, type PlayerPosition } from '../salaryCalculator';
import { SIZING_TUNING } from '../auctionPoolSizing';
import {
  applyAuctionLuxuryTaxForLot,
  strandSafeBidTransition,
  strandSafeClaimTransition,
} from '../../src_figma/app/hooks/useAuctionDraft';
import type {
  Chemistry,
  Grade,
  PitchType,
  Player,
  Position,
  Team,
} from '../../utils/leagueBuilderStorage';
import { computeIvPercentiles } from '../../utils/leagueBuilderAuctionPipeline';

const ROSTER_SIZE = LEGAL_ROSTER.size;
const DEFAULT_TIER: TierKey = 'juiced';
const NORMAL_BUDGET = TIER_CAPS[DEFAULT_TIER].tierCap;
const GAUNTLET_TIMEOUT_MS = 120_000;
const PRODUCTION_DEFAULT_REAL_TEAMS = 8;
const PRODUCTION_DEFAULT_SHILLS = scaledShillDefault(PRODUCTION_DEFAULT_REAL_TEAMS);
const COMPETITIVE_MULTI_BID_FLOOR = 8;

type TaxContext = NonNullable<Parameters<typeof applyAuctionLuxuryTaxForLot>[1]>;

type DraftKind = 'pool-first' | 'design-first';

interface DraftSpec {
  id: string;
  label: string;
  kind: DraftKind;
  teamCount: number;
  archetypes: HistoricalArchetype[];
  competitive: boolean;
  auctionSeedId?: string;
  shillCount: number;
  poolBalancePreset?: PoolBalancePresetKey;
  poolQualityCenter?: number;
  poolSizeMultiplier?: number;
  budgetPerTeam?: number;
  designs?: TeamDesignInput[];
}

interface SettlementEvidence {
  draftId: string;
  teamId: string;
  playerId: string;
  rosterSizeBefore: number;
  helperProjectedTax: number;
  independentMarginalTax: number;
}

interface MeasurementRow {
  draft: string;
  team: string;
  archetype: string;
  salarySpent: number;
  chargedTax: number;
  impliedFinalLiability: number;
  liabilityMinusCharged: number;
  forcedBackfilledFills: number;
  settleBackstopFills: number;
  shillReclaimedFills: number;
  shillReclaimedCost: number;
  competitiveWins: number;
  feasibleShortfallAtFinal: number;
  finalBudget: number;
}

interface ShillSummaryRow {
  draft: string;
  shillTeam: string;
  winsBeforeReclaim: number;
  finalHeldPlayers: number;
  finalBudget: number;
}

interface ExtractionSupplyRow {
  draft: string;
  extractedPoolSize: number;
  primaryCBeforeFloor: number;
  primaryCAfterFloor: number;
  catcherDepthAfterFloor: number;
  cpBeforeFloor: number;
  cpAfterFloor: number;
}

interface DraftSummary {
  draftId: string;
  label: string;
  competitive: boolean;
  surfacedLots: number;
  multiBidLots: number;
  totalChargedTax: number;
  rows: MeasurementRow[];
  shillRows: ShillSummaryRow[];
  evidence: SettlementEvidence[];
}

interface Instrumentation {
  chargedTaxFromBudgetDelta: Map<string, number>;
  marginalTaxFromHelper: Map<string, number>;
  forcedBackfilledFills: Map<string, number>;
  settleBackstopFills: Map<string, number>;
  shillReclaimedFills: Map<string, number>;
  shillReclaimedCost: Map<string, number>;
  shillWins: Map<string, number>;
  competitiveWins: Map<string, number>;
  evidence: SettlementEvidence[];
  multiBidLots: number;
}

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
      ? player.pitcherRatings ?? { velocity: 50, junk: 50, accuracy: 50 }
      : player.batterRatings ?? { power: 50, contact: 50, speed: 50, fielding: 50, arm: 50 },
    battingRatings: player.batterRatings,
    age: player.age,
    bats: player.bats,
    fame: 0,
    traits: traitsOf(player),
    arsenal: player.arsenal ?? [],
    armSlot: player.armSlot ?? null,
    personality: 'Competitive',
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
      POW: player.batterRatings?.power ?? 50,
      CON: player.batterRatings?.contact ?? 50,
      SPD: player.batterRatings?.speed ?? 50,
      FLD: player.batterRatings?.fielding ?? 50,
      ARM: player.batterRatings?.arm ?? 50,
    },
    pit: shape.isPitcher
      ? {
          VEL: player.pitcherRatings?.velocity ?? 50,
          JNK: player.pitcherRatings?.junk ?? 50,
          ACC: player.pitcherRatings?.accuracy ?? 50,
        }
      : undefined,
    profile: {
      isPitcher: shape.isPitcher,
      primaryPosition: player.primaryPosition,
      secondaryPosition: player.secondaryPosition ?? null,
      bats: player.bats,
      throws: player.throws,
      age: player.age,
      power: player.batterRatings?.power ?? 50,
      contact: player.batterRatings?.contact ?? 50,
      speed: player.batterRatings?.speed ?? 50,
      fielding: player.batterRatings?.fielding ?? 50,
      arm: player.batterRatings?.arm ?? 50,
      velocity: player.pitcherRatings?.velocity ?? 50,
      junk: player.pitcherRatings?.junk ?? 50,
      accuracy: player.pitcherRatings?.accuracy ?? 50,
      traits: traitsOf(player),
      arsenal: player.arsenal,
      personality: 'Competitive',
    },
  };
}

function toLeagueBuilderPlayer(player: PlayerData): Player {
  const nameParts = player.name.split(' ');
  const primaryPosition = player.isPitcher && player.pitcherRole
    ? player.pitcherRole as Position
    : player.primaryPosition as Position;
  return {
    id: player.id,
    firstName: nameParts[0] || 'Unknown',
    lastName: nameParts.slice(1).join(' ') || player.id,
    gender: player.gender,
    age: player.age,
    bats: player.bats,
    throws: player.throws,
    armSlot: player.armSlot ?? null,
    primaryPosition,
    secondaryPosition: player.secondaryPosition as Position | undefined,
    power: player.batterRatings?.power ?? 50,
    contact: player.batterRatings?.contact ?? 50,
    speed: player.batterRatings?.speed ?? 50,
    fielding: player.batterRatings?.fielding ?? 50,
    arm: player.batterRatings?.arm ?? 50,
    velocity: player.pitcherRatings?.velocity ?? 50,
    junk: player.pitcherRatings?.junk ?? 50,
    accuracy: player.pitcherRatings?.accuracy ?? 50,
    arsenal: (player.arsenal as PitchType[]) || [],
    overallGrade: player.overall as Grade,
    trait1: player.traits.trait1,
    trait2: player.traits.trait2,
    personality: 'Competitive',
    chemistry: CHEMISTRY_CODE_TO_WORD[normalizeToChemistryCode(player.chemistry)] as Chemistry,
    morale: 75,
    mojo: 'Normal',
    fame: 0,
    salary: calculateSalary(toSalaryPlayer(player)),
    leagueAssignments: player.teamId === 'free-agent'
      ? []
      : [{ leagueId: 'mlb', teamId: player.teamId, rosterStatus: 'MLB' }],
    createdDate: '2026-07-09T00:00:00.000Z',
    lastModified: '2026-07-09T00:00:00.000Z',
    isCustom: false,
    sourceDatabase: 'mlb',
  };
}

function toConstructionPlayer(player: Player): ConstructionPlayer {
  const isPitcher = player.primaryPosition === 'SP'
    || player.primaryPosition === 'RP'
    || player.primaryPosition === 'CP'
    || player.primaryPosition === 'SP/RP'
    || player.primaryPosition === 'P';
  return {
    id: player.id,
    isPitcher,
    role: isPitcher
      ? (player.primaryPosition === 'RP' || player.primaryPosition === 'CP' || player.primaryPosition === 'SP/RP'
          ? player.primaryPosition
          : 'SP')
      : undefined,
    bat: {
      POW: player.power,
      CON: player.contact,
      SPD: player.speed,
      FLD: player.fielding,
      ARM: player.arm,
    },
    pit: isPitcher
      ? {
          VEL: player.velocity,
          JNK: player.junk,
          ACC: player.accuracy,
        }
      : undefined,
  };
}

function toAuctionPlayers(pool: RegisteredPool, playerById: Map<string, Player>): CpuShillAuctionPlayer[] {
  const percentiles = computeIvPercentiles(pool.players);
  return pool.players.map((poolPlayer) => {
    const player = playerById.get(poolPlayer.id);
    if (!player) throw new Error(`Missing player record for ${poolPlayer.id}`);
    return {
      playerId: poolPlayer.id,
      iv: poolPlayer.iv,
      ivPercentile: percentiles.get(poolPlayer.id) ?? 0,
      pos: toRosterSlotPlayer({
        primaryPosition: player.primaryPosition,
        secondaryPosition: player.secondaryPosition ?? null,
        traits: [player.trait1, player.trait2],
      }),
    };
  });
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function addTo(map: Map<string, number>, key: string, amount: number): void {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function transitionOrThrow(result: AuctionTransitionResult): CpuShillAuctionSession {
  if (!result.ok) throw new Error(`Auction transition rejected: ${result.reason}`);
  return result.session as CpuShillAuctionSession;
}

function buildRegisteredPool(input: {
  id: string;
  tier: TierKey;
  totalSlots: number;
  budgetPerTeam: number;
  players: readonly DemandUniversePlayer[];
}): RegisteredPool {
  return registerPool({
    leagueId: input.id,
    tier: input.tier,
    balanceMode: 'taxed',
    totalSlots: input.totalSlots,
    salaryCap: input.budgetPerTeam,
    players: input.players.map((player) => ({
      id: player.id,
      iv: player.iv,
      salary: player.salary,
    })),
  });
}

function buildTeam(input: {
  id: string;
  archetype: HistoricalArchetype;
  index: number;
}): Team {
  return {
    id: input.id,
    name: `Gauntlet ${input.index + 1}`,
    abbreviation: `G${input.index + 1}`,
    location: 'Gauntlet',
    nickname: input.archetype.name,
    colors: { primary: '#243028', secondary: '#CBB89C' },
    stadium: 'Gauntlet Yard',
    controlledBy: 'ai',
    leagueIds: ['gauntlet'],
    capIdentity: archetypeToCapIdentity(input.archetype),
    mlbArchetypeKey: input.archetype.id,
  };
}

function buildTaxContext(input: {
  pool: RegisteredPool;
  teams: readonly Team[];
  players: readonly Player[];
}): TaxContext {
  return {
    poolById: new Map(input.pool.players.map((player) => [player.id, player])),
    playerById: new Map(input.players.map((player) => [player.id, player])),
    identityByTeamId: new Map(input.teams.map((team) => [team.id, team.capIdentity])),
    baseCaps: input.pool.luxuryCaps,
  };
}

function productionShillTeamId(leagueId: string, index: number): string {
  return `__auction_shill__${leagueId}__${index + 1}`;
}

function buildPureShillProfiles(leagueId: string, count: number): Record<string, CpuShillProfile> {
  return Object.fromEntries(Array.from({ length: count }, (_, index) => {
    const teamId = productionShillTeamId(leagueId, index);
    return [teamId, {
      ...buildArchetypeShillProfile(teamId, `${leagueId}:shill-archetype`),
      shillMaxWins: SIZING_TUNING.winsPerShill,
    }];
  }));
}

function buildPureShillAuctionTeams(input: {
  leagueId: string;
  count: number;
  budget: number;
}): Array<{
  teamId: string;
  budgetRemaining: number;
  rosterSlotsRemaining: number;
  minSalary: number;
  projectedTax: number;
  roster: [];
}> {
  return Array.from({ length: input.count }, (_, index) => ({
    teamId: productionShillTeamId(input.leagueId, index),
    budgetRemaining: input.budget,
    rosterSlotsRemaining: ROSTER_SIZE,
    minSalary: LEAGUE_MINIMUM_SALARY,
    projectedTax: 0,
    roster: [],
  }));
}

function nonCompletingTeamSet(session: CpuShillAuctionSession): Set<string> {
  return new Set(session.config.nonCompletingTeamIds ?? []);
}

function isNonCompletingTeam(session: CpuShillAuctionSession, teamId: string | null | undefined): boolean {
  return Boolean(teamId && nonCompletingTeamSet(session).has(teamId));
}

function taxExposure(archetype: HistoricalArchetype): number {
  const identity = archetypeToCapIdentity(archetype);
  return Object.values(identity?.rawShift ?? {}).reduce((sum, shift) => sum + Math.abs(Math.min(0, shift)), 0);
}

function designSlotsFor(index: number): DesignSlot[] {
  const hitterShapes = [
    'Slugger',
    'Speedster',
    'Contact-Glove',
    'Defensive-Wizard',
    'Cannon-Corner',
    'Five-Tool',
  ];
  const pitcherShapes = ['Power-Ace', 'Command-Artist', 'Power-Reliever', 'Junkballer'];
  return buildDefaultDesignSlots().map((slot, slotIndex) => {
    if (slot.kind === 'pos' || slot.kind === 'backupC' || slot.kind === 'flex') {
      return {
        ...slot,
        preference: {
          shape: hitterShapes[(index + slotIndex) % hitterShapes.length],
          allowRunnerUp: true,
        },
      };
    }
    if (slot.kind === 'swing') {
      return {
        ...slot,
        preference: {
          shape: index % 2 === 0 ? 'Power-Reliever' : 'Contact-Glove',
          allowRunnerUp: true,
        },
      };
    }
    return {
      ...slot,
      preference: {
        shape: pitcherShapes[(index + slotIndex) % pitcherShapes.length],
        allowRunnerUp: true,
      },
    };
  });
}

function buildDraftSpecs(): DraftSpec[] {
  const roundRobin = [
    HISTORICAL_ARCHETYPES.slice(0, 8),
    HISTORICAL_ARCHETYPES.slice(8, 16),
    HISTORICAL_ARCHETYPES.slice(16, 24),
  ];
  return [
    {
      id: 'D2',
      label: 'GAUNTLET-2 D2 production-default shills',
      kind: 'pool-first',
      teamCount: PRODUCTION_DEFAULT_REAL_TEAMS,
      archetypes: roundRobin[1],
      competitive: true,
      auctionSeedId: 'D2d',
      shillCount: PRODUCTION_DEFAULT_SHILLS,
    },
    {
      id: 'D3',
      label: 'GAUNTLET-2 D3 production-default shills',
      kind: 'pool-first',
      teamCount: PRODUCTION_DEFAULT_REAL_TEAMS,
      archetypes: roundRobin[2],
      competitive: true,
      auctionSeedId: 'D3a',
      shillCount: PRODUCTION_DEFAULT_SHILLS,
    },
  ];
}

function extractProductionPool(input: {
  spec: DraftSpec;
  universe: readonly DemandUniversePlayer[];
  tier: TierKey;
}): { pool: RegisteredPool; extraction: ReturnType<typeof extractPoolFromDemand> } {
  const selectedTeamIds = getLeagueTeamIds('mlb').slice(0, input.spec.teamCount);
  const priorityIds = ALL_MLB_PLAYERS
    .filter((player) => selectedTeamIds.includes(player.teamId))
    .map((player) => player.id)
    .sort((left, right) => left.localeCompare(right));
  const poolBalancePreset = input.spec.poolBalancePreset ?? 'balanced';
  const poolQualityCenter = input.spec.poolQualityCenter ?? DEFAULT_POOL_QUALITY_CENTER;
  const tuning = poolBalancePresetTuning(poolBalancePreset, poolQualityCenter);
  const budgetPerTeam = input.spec.budgetPerTeam ?? NORMAL_BUDGET;
  const extraction = extractPoolFromDemand(
    [...input.universe],
    input.spec.designs ?? [],
    input.spec.archetypes,
    input.tier,
    {
      teams: input.spec.teamCount,
      shills: 0,
      budgetPerTeam,
      poolBalancePreset,
      poolQualityCenter,
      poolSizeMultiplier: input.spec.poolSizeMultiplier ?? tuning.poolSlackFactor,
      // Current LeagueBuilderDraftSetup defaults pool-first to team-roster-priority when no
      // session override exists; the contract evidence documents this intentional parity choice.
      poolSourceMode: input.spec.kind === 'pool-first' ? 'team-roster-priority' : undefined,
      priorityIds: input.spec.kind === 'pool-first' ? priorityIds : undefined,
    },
  );
  return {
    pool: buildRegisteredPool({
      id: input.spec.id,
      tier: input.tier,
      totalSlots: input.spec.teamCount * ROSTER_SIZE,
      budgetPerTeam,
      players: extraction.players,
    }),
    extraction,
  };
}

function beforeFloorCount(messages: readonly string[], label: string, fallback: number): number {
  const message = messages.find((candidate) => candidate.includes(` ${label.toLowerCase()} `));
  const match = message?.match(/\((\d+)\/\d+ before top-up\)/);
  return match ? Number(match[1]) : fallback;
}

function extractionSupplyRow(input: {
  spec: DraftSpec;
  extraction: ReturnType<typeof extractPoolFromDemand>;
}): ExtractionSupplyRow {
  const players = input.extraction.players;
  const messages = input.extraction.sizing?.messages ?? [];
  const primaryCAfterFloor = players.filter((player) => !player.isPitcher && player.position === 'C').length;
  const catcherDepthAfterFloor = players.filter((player) => canCover(player, 'C')).length;
  const cpAfterFloor = players.filter(isCloser).length;
  return {
    draft: input.spec.id,
    extractedPoolSize: players.length,
    primaryCBeforeFloor: beforeFloorCount(messages, 'catchers', primaryCAfterFloor),
    primaryCAfterFloor,
    catcherDepthAfterFloor,
    cpBeforeFloor: beforeFloorCount(messages, 'closers', cpAfterFloor),
    cpAfterFloor,
  };
}

function buildSession(input: {
  spec: DraftSpec;
  pool: RegisteredPool;
  teams: readonly Team[];
  auctionPlayers: readonly CpuShillAuctionPlayer[];
}): CpuShillAuctionSession {
  const cpuShills: Record<string, CpuShillProfile> = {};
  const auctionSeedId = input.spec.auctionSeedId ?? input.spec.id;
  const leagueId = `gauntlet2-${auctionSeedId}`;
  const shillTeams = buildPureShillAuctionTeams({
    leagueId,
    count: input.spec.shillCount,
    budget: input.pool.tierCap,
  });
  input.teams.forEach((team, index) => {
    const archetype = input.spec.archetypes[index];
    cpuShills[team.id] = buildClubCpuProfile({
      teamId: team.id,
      leagueId: auctionSeedId,
      bandPriorities: archetypeBandPriorities(archetype),
      archetypeId: archetype.id,
    });
  });
  return {
    ...(initAuctionSession({
      teams: [
        ...input.teams.map((team) => ({
          teamId: team.id,
          budgetRemaining: input.pool.tierCap,
          rosterSlotsRemaining: ROSTER_SIZE,
          minSalary: LEAGUE_MINIMUM_SALARY,
          roster: [],
        })),
        ...shillTeams,
      ],
      players: input.auctionPlayers,
      sessionId: `gauntlet2-${auctionSeedId}`,
      sessionLaunchNonce: `${auctionSeedId}-nonce`,
      config: {
        nominationOrderSeed: `gauntlet:${auctionSeedId}`,
        bidIncrement: DEFAULT_AUCTION_BID_INCREMENT,
        reserveFractionK: DEFAULT_RESERVE_PRICE_K,
        nominationWeightExponent: 2,
        cpuShillCount: 0,
        excludeFromLeague: true,
        nonCompletingTeamIds: shillTeams.map((team) => team.teamId),
      },
    }) as CpuShillAuctionSession),
    cpuShills: {
      ...buildPureShillProfiles(leagueId, input.spec.shillCount),
      ...cpuShills,
    },
  };
}

function instrumentTransition(input: {
  draftId: string;
  before: CpuShillAuctionSession;
  after: CpuShillAuctionSession;
  teams: readonly Team[];
  constructionById: Map<string, ConstructionPlayer>;
  pool: RegisteredPool;
  instrumentation: Instrumentation;
}): void {
  const teamById = new Map(input.teams.map((team) => [team.id, team]));

  const recordSettledBackstop = (beforeResult: AuctionResult | null, afterResult: AuctionResult): void => {
    if (afterResult.disposition !== 'SOLD' || !afterResult.winnerTeamId || afterResult.salary === null) return;
    if (!afterResult.settled) return;
    if (isNonCompletingTeam(input.after, afterResult.winnerTeamId)) return;
    addTo(input.instrumentation.settleBackstopFills, afterResult.winnerTeamId, 1);
    if (beforeResult?.winnerTeamId && isNonCompletingTeam(input.before, beforeResult.winnerTeamId)) {
      addTo(input.instrumentation.shillReclaimedFills, afterResult.winnerTeamId, 1);
      addTo(input.instrumentation.shillReclaimedCost, afterResult.winnerTeamId, afterResult.salary);
    }
  };

  for (let index = input.before.results.length; index < input.after.results.length; index += 1) {
    const result = input.after.results[index];
    if (result.disposition !== 'SOLD' || !result.winnerTeamId || result.salary === null) continue;
    if (isNonCompletingTeam(input.after, result.winnerTeamId)) {
      addTo(input.instrumentation.shillWins, result.winnerTeamId, 1);
      continue;
    }
    if (result.settled) {
      recordSettledBackstop(
        input.before.currentLot?.highBidder
          ? {
              playerId: result.playerId,
              disposition: 'SOLD',
              nominatorTeamId: input.before.currentLot.nominatorTeamId,
              winnerTeamId: input.before.currentLot.highBidder,
              salary: input.before.currentLot.highBid,
            }
          : null,
        result,
      );
      continue;
    }
    const beforeTeam = input.before.teams.find((team) => team.teamId === result.winnerTeamId);
    const afterTeam = input.after.teams.find((team) => team.teamId === result.winnerTeamId);
    if (!beforeTeam || !afterTeam) continue;
    const activeLotSale = input.before.currentLot?.playerId === result.playerId;
    if (!activeLotSale) continue;

    const projectedTax = beforeTeam.projectedTax;
    const observedTax = beforeTeam.budgetRemaining - afterTeam.budgetRemaining - result.salary;
    addTo(input.instrumentation.chargedTaxFromBudgetDelta, result.winnerTeamId, observedTax);
    addTo(input.instrumentation.marginalTaxFromHelper, result.winnerTeamId, projectedTax);

    if ((result.numBidders ?? 0) > 1) {
      addTo(input.instrumentation.competitiveWins, result.winnerTeamId, 1);
      input.instrumentation.multiBidLots += 1;
    }
    if ((input.before.currentLot?.highBid ?? null) === null && (result.numBidders ?? 0) === 1) {
      addTo(input.instrumentation.forcedBackfilledFills, result.winnerTeamId, 1);
    }

    const evidenceTeams = new Set(input.instrumentation.evidence.map((entry) => entry.teamId));
    if (projectedTax > 0 && input.instrumentation.evidence.length < 2 && !evidenceTeams.has(result.winnerTeamId)) {
      const candidate = input.constructionById.get(result.playerId);
      if (!candidate) throw new Error(`Missing construction player ${result.playerId}`);
      const preRoster = beforeTeam.roster.map((assignment) => {
        const player = input.constructionById.get(assignment.playerId);
        if (!player) throw new Error(`Missing construction roster player ${assignment.playerId}`);
        return player;
      });
      const independent = auctionMarginalTaxWithCaps(
        preRoster,
        candidate,
        teamById.get(result.winnerTeamId)?.capIdentity,
        input.pool.luxuryCaps,
      );
      expect(projectedTax).toBe(independent);
      input.instrumentation.evidence.push({
        draftId: input.draftId,
        teamId: result.winnerTeamId,
        playerId: result.playerId,
        rosterSizeBefore: preRoster.length,
        helperProjectedTax: projectedTax,
        independentMarginalTax: independent,
      });
    }
  }

  input.before.results.forEach((beforeResult, index) => {
    const afterResult = input.after.results[index];
    if (!afterResult) return;
    if (beforeResult?.disposition === 'SOLD' && beforeResult.winnerTeamId && isNonCompletingTeam(input.before, beforeResult.winnerTeamId)) {
      recordSettledBackstop(beforeResult, afterResult);
    }
    if (
      beforeResult?.disposition === 'PASSED' &&
      afterResult?.disposition === 'SOLD' &&
      afterResult.winnerTeamId &&
      !isNonCompletingTeam(input.after, afterResult.winnerTeamId)
    ) {
      addTo(input.instrumentation.forcedBackfilledFills, afterResult.winnerTeamId, 1);
      recordSettledBackstop(beforeResult, afterResult);
    }
  });
}

function activePassedCompletionPool(session: CpuShillAuctionSession): CompletionCandidate[] {
  const seen = new Set<string>();
  const pool: CompletionCandidate[] = [];
  session.results.forEach((result, index) => {
    if (result.disposition !== 'PASSED') return;
    if (result.supersededByResultIndex !== undefined) return;
    if (seen.has(result.playerId)) return;
    const shape = session.players[result.playerId]?.pos;
    if (!shape) return;
    seen.add(result.playerId);
    pool.push({ id: result.playerId, price: LEAGUE_MINIMUM_SALARY, shape });
  });
  return pool.sort((left, right) => left.price - right.price || left.id.localeCompare(right.id));
}

function terminalBackstopCompletionPool(session: CpuShillAuctionSession): CompletionCandidate[] {
  const seen = new Set<string>();
  const pool = activePassedCompletionPool(session);
  for (const entry of pool) seen.add(entry.id);
  const shillIds = nonCompletingTeamSet(session);
  for (const team of session.teams) {
    if (!shillIds.has(team.teamId)) continue;
    for (const assignment of team.roster) {
      if (seen.has(assignment.playerId)) continue;
      const shape = session.players[assignment.playerId]?.pos;
      if (!shape) continue;
      seen.add(assignment.playerId);
      pool.push({ id: assignment.playerId, price: LEAGUE_MINIMUM_SALARY, shape });
    }
  }
  return pool.sort((left, right) => left.price - right.price || left.id.localeCompare(right.id));
}

function supplySummary(candidates: readonly CompletionCandidate[]): string {
  const counts: Record<string, number> = {
    total: candidates.length,
    C: 0,
    SP: 0,
    RP: 0,
    CP: 0,
    pitchers: 0,
    hitters: 0,
  };
  for (const candidate of candidates) {
    const shape = candidate.shape;
    if (shape.isPitcher) {
      counts.pitchers += 1;
      if (shape.role === 'SP' || shape.role === 'SP/RP') counts.SP += 1;
      if (shape.role === 'RP' || shape.role === 'CP' || shape.role === 'SP/RP') counts.RP += 1;
      if (shape.role === 'CP') counts.CP += 1;
    } else {
      counts.hitters += 1;
      if (shape.position === 'C') counts.C += 1;
    }
  }
  return Object.entries(counts).map(([key, value]) => `${key}=${value}`).join('/');
}

function driveDraft(input: {
  spec: DraftSpec;
  initialSession: CpuShillAuctionSession;
  taxContext: TaxContext;
  teams: readonly Team[];
  pool: RegisteredPool;
  constructionById: Map<string, ConstructionPlayer>;
}): CpuShillAuctionSession & { instrumentation: Instrumentation; surfacedLots: number } {
  let session = input.initialSession;
  let surfacedLots = 0;
  const instrumentation: Instrumentation = {
    chargedTaxFromBudgetDelta: new Map(),
    marginalTaxFromHelper: new Map(),
    forcedBackfilledFills: new Map(),
    settleBackstopFills: new Map(),
    shillReclaimedFills: new Map(),
    shillReclaimedCost: new Map(),
    shillWins: new Map(),
    competitiveWins: new Map(),
    evidence: [],
    multiBidLots: 0,
  };
  const auctionSeedId = input.spec.auctionSeedId ?? input.spec.id;

  const applyTransition = (transition: () => AuctionTransitionResult): void => {
    const before = session;
    const result = transition();
    if (!result.ok) {
      const failureSession = result.session as CpuShillAuctionSession;
      const passedPool = activePassedCompletionPool(failureSession);
      const terminalPool = terminalBackstopCompletionPool(failureSession);
      const short = result.session.teams
        .filter((team) => team.rosterSlotsRemaining > 0 && !isNonCompletingTeam(failureSession, team.teamId))
        .map((team) => {
          const shapes = team.roster
            .map((assignment) => failureSession.players[assignment.playerId]?.pos)
            .filter((shape): shape is RosterSlotPlayer => Boolean(shape));
          const quote = cheapestLegalCompletion(shapes, passedPool, team.rosterSlotsRemaining);
          const terminalQuote = cheapestLegalCompletion(shapes, terminalPool, team.rosterSlotsRemaining);
          return `${team.teamId}:${team.roster.length}+${team.rosterSlotsRemaining}` +
            ` budget=${round2(team.budgetRemaining)}` +
            ` tax=${round2(team.projectedTax)}` +
            ` passedFeasible=${quote.feasible}` +
            ` terminalFeasible=${terminalQuote.feasible}`;
        })
        .join(', ');
      const remainingIds = new Set(failureSession.availablePlayerIds);
      const remainingShapes = [...remainingIds]
        .map((playerId) => failureSession.players[playerId]?.pos)
        .filter((shape): shape is RosterSlotPlayer => Boolean(shape));
      const remainingClosers = remainingShapes.filter((shape) => shape.isPitcher && shape.role === 'CP').length;
      const shillHeld = failureSession.teams
        .filter((team) => isNonCompletingTeam(failureSession, team.teamId))
        .map((team) => `${team.teamId}:${team.roster.length}`)
        .join(', ');
      throw new Error(
        `${input.spec.id} ${input.spec.label} transition rejected from ${before.state}: ${result.reason}` +
          (failureSession.terminalShortfall?.teamIds.length
            ? `; terminalShortfall=${failureSession.terminalShortfall.teamIds.join(',')}`
            : '') +
          (short ? `; real open rosters ${short}` : '') +
          `; remainingPool=${remainingIds.size} remainingClosers=${remainingClosers}` +
          `; passedSupply ${supplySummary(passedPool)}` +
          `; terminalBackstopSupply ${supplySummary(terminalPool)}` +
          (shillHeld ? `; shillHeld ${shillHeld}` : ''),
      );
    }
    const after = result.session as CpuShillAuctionSession;
    instrumentTransition({
      draftId: input.spec.id,
      before,
      after,
      teams: input.teams,
      constructionById: input.constructionById,
      pool: input.pool,
      instrumentation,
    });
    session = after;
  };

  for (let step = 0; step < 6_000 && session.state !== 'AUCTION_COMPLETE'; step += 1) {
    if (session.state === 'NOMINATION') {
      applyTransition(() => surfaceNextPlayer(session));
      session = applyAuctionLuxuryTaxForLot(session, input.taxContext);
      surfacedLots += 1;
    } else if (session.state === 'OPEN_BIDDING') {
      const bidder = getCurrentBidderTeamId(session);
      if (!input.spec.competitive || !bidder) {
        applyTransition(() => (bidder ? passBid(session, bidder) : resolveLot(session)));
        continue;
      }
      const decision = cpuBidOnLot(session, bidder, `gauntlet:${auctionSeedId}`, { needAwareCompletion: true });
      if (decision.kind === 'bid') {
        applyTransition(() => strandSafeBidTransition(session, bidder, decision.bid, true));
      } else {
        applyTransition(() => passBid(session, bidder));
      }
    } else if (session.state === 'RESOLVE') {
      if (session.pendingClaim) {
        if (input.spec.competitive) {
          const decision = cpuDecideLoneSurvivor(
            session,
            session.pendingClaim.teamId,
            `gauntlet:${auctionSeedId}`,
            { needAwareCompletion: true },
          );
          applyTransition(() => (
            decision.kind === 'claim'
              ? strandSafeClaimTransition(session, true)
              : passLoneSurvivorOut(session)
          ));
        } else {
          applyTransition(() => claimLoneSurvivor(session));
        }
      } else {
        applyTransition(() => resolveLot(session));
      }
    } else if (session.state === 'SOLD' || session.state === 'PASSED') {
      applyTransition(() => advanceLot(session));
    } else {
      throw new Error(`Unexpected auction state ${session.state}`);
    }
  }

  if (session.state !== 'AUCTION_COMPLETE') {
    throw new Error(`${input.spec.id} did not complete; stopped at ${session.state}`);
  }

  return Object.assign(session, { instrumentation, surfacedLots });
}

function summarizeDraft(input: {
  spec: DraftSpec;
  session: CpuShillAuctionSession & { instrumentation: Instrumentation; surfacedLots: number };
  teams: readonly Team[];
  constructionById: Map<string, ConstructionPlayer>;
  pool: RegisteredPool;
}): DraftSummary {
  const rows: MeasurementRow[] = [];
  const teamById = new Map(input.teams.map((team) => [team.id, team]));
  const nonCompleting = nonCompletingTeamSet(input.session);
  const passedCompletionPool = activePassedCompletionPool(input.session);
  for (const team of input.session.teams) {
    if (nonCompleting.has(team.teamId)) continue;
    const shapes = team.roster.map((assignment) => input.session.players[assignment.playerId]?.pos);
    const finalFeasibleShortfall = team.rosterSlotsRemaining > 0 && cheapestLegalCompletion(
      shapes.filter((shape): shape is RosterSlotPlayer => Boolean(shape)),
      passedCompletionPool,
      team.rosterSlotsRemaining,
    ).feasible ? 1 : 0;
    expect(team.rosterSlotsRemaining).toBe(0);
    expect(shapes.every(Boolean)).toBe(true);
    expect(isLegalRoster(shapes as RosterSlotPlayer[])).toBe(true);
    expect(team.budgetRemaining).toBeGreaterThanOrEqual(0);

    const charged = input.session.instrumentation.chargedTaxFromBudgetDelta.get(team.teamId) ?? 0;
    const helperMarginal = input.session.instrumentation.marginalTaxFromHelper.get(team.teamId) ?? 0;
    expect(charged).toBeCloseTo(helperMarginal, 8);

    const finalRoster = team.roster.map((assignment) => {
      const player = input.constructionById.get(assignment.playerId);
      if (!player) throw new Error(`Missing final construction player ${assignment.playerId}`);
      return player;
    });
    const identity = teamById.get(team.teamId)?.capIdentity;
    const implied = luxuryTax(finalRoster, identity ? shiftLuxuryCaps(input.pool.luxuryCaps, identity) : input.pool.luxuryCaps, 'taxed').charged;
    rows.push({
      draft: input.spec.id,
      team: team.teamId,
      archetype: teamById.get(team.teamId)?.mlbArchetypeKey ?? 'unknown',
      salarySpent: round2(team.roster.reduce((sum, assignment) => sum + assignment.salary, 0)),
      chargedTax: round2(charged),
      impliedFinalLiability: round2(implied),
      liabilityMinusCharged: round2(implied - charged),
      forcedBackfilledFills: input.session.instrumentation.forcedBackfilledFills.get(team.teamId) ?? 0,
      settleBackstopFills: input.session.instrumentation.settleBackstopFills.get(team.teamId) ?? 0,
      shillReclaimedFills: input.session.instrumentation.shillReclaimedFills.get(team.teamId) ?? 0,
      shillReclaimedCost: round2(input.session.instrumentation.shillReclaimedCost.get(team.teamId) ?? 0),
      competitiveWins: input.session.instrumentation.competitiveWins.get(team.teamId) ?? 0,
      feasibleShortfallAtFinal: finalFeasibleShortfall,
      finalBudget: round2(team.budgetRemaining),
    });
  }

  expect(input.session.instrumentation.evidence.length).toBeGreaterThanOrEqual(2);
  const shillRows = input.session.teams
    .filter((team) => nonCompleting.has(team.teamId))
    .map((team) => ({
      draft: input.spec.id,
      shillTeam: team.teamId,
      winsBeforeReclaim: input.session.instrumentation.shillWins.get(team.teamId) ?? 0,
      finalHeldPlayers: team.roster.length,
      finalBudget: round2(team.budgetRemaining),
    }));
  return {
    draftId: input.spec.id,
    label: input.spec.label,
    competitive: input.spec.competitive,
    surfacedLots: input.session.surfacedLots,
    multiBidLots: input.session.instrumentation.multiBidLots,
    totalChargedTax: rows.reduce((sum, row) => sum + row.chargedTax, 0),
    rows,
    shillRows,
    evidence: input.session.instrumentation.evidence,
  };
}

describe('GAUNTLET-2 -- production-default shill fidelity leg', () => {
  test('D2/D3 production-default auctions complete with two non-completing shills and normal cushions', () => {
    expect(PRODUCTION_DEFAULT_SHILLS).toBe(2);
    const universe = ALL_MLB_PLAYERS.map(toDemandPlayer);
    const leaguePlayers = ALL_MLB_PLAYERS.map(toLeagueBuilderPlayer);
    const playerById = new Map(leaguePlayers.map((player) => [player.id, player]));
    const constructionById = new Map(leaguePlayers.map((player) => [player.id, toConstructionPlayer(player)]));
    const summaries: DraftSummary[] = [];
    const supplyRows: ExtractionSupplyRow[] = [];

    for (const spec of buildDraftSpecs()) {
      const teamIds = getLeagueTeamIds('mlb').slice(0, spec.teamCount);
      const teams = teamIds.map((teamId, index) => buildTeam({
        id: teamId,
        archetype: spec.archetypes[index],
        index,
      }));
      const { pool, extraction } = extractProductionPool({ spec, universe, tier: DEFAULT_TIER });
      supplyRows.push(extractionSupplyRow({ spec, extraction }));
      // Pool-relative cap sanity: the test uses the app's tier cap as the wallet, but the extracted
      // pool still carries a real production IV distribution and caps table.
      expect(computePoolTierCap(pool.players.map((player) => player.iv), DEFAULT_TIER)).toBeGreaterThan(0);
      expect(pool.luxuryCaps).toEqual(LUXURY_CAP_TABLES[DEFAULT_TIER]);

      const auctionPlayers = toAuctionPlayers(pool, playerById);
      const session = buildSession({ spec, pool, teams, auctionPlayers });
      const taxContext = buildTaxContext({ pool, teams, players: leaguePlayers });
      const completed = driveDraft({
        spec,
        initialSession: session,
        taxContext,
        teams,
        pool,
        constructionById,
      });
      summaries.push(summarizeDraft({ spec, session: completed, teams, constructionById, pool }));
    }

    const allRows = summaries.flatMap((summary) => summary.rows);
    const shillRows = summaries.flatMap((summary) => summary.shillRows);
    const competitiveMultiBidLots = summaries
      .filter((summary) => summary.competitive)
      .reduce((sum, summary) => sum + summary.multiBidLots, 0);
    expect(competitiveMultiBidLots).toBeGreaterThanOrEqual(COMPETITIVE_MULTI_BID_FLOOR);

    expect(allRows).toHaveLength(PRODUCTION_DEFAULT_REAL_TEAMS * 2);
    expect(shillRows).toHaveLength(PRODUCTION_DEFAULT_SHILLS * 2);
    expect(allRows.every((row) => row.finalBudget >= 0)).toBe(true);
    expect(allRows.every((row) => row.feasibleShortfallAtFinal === 0)).toBe(true);

    console.log('\nGAUNTLET-2 PRODUCTION-DEFAULT D6-STYLE TABLE');
    console.table(allRows);
    console.log('\nGAUNTLET-2 SHILL CONTRIBUTION TABLE');
    console.table(shillRows);
    console.log('\nGAUNTLET-2 EXTRACTION SUPPLY TABLE');
    console.table(supplyRows);
    console.log('\nGAUNTLET-2 EXACT-MARGINAL EVIDENCE');
    console.table(summaries.flatMap((summary) => summary.evidence).map((entry) => ({
      draft: entry.draftId,
      team: entry.teamId,
      player: entry.playerId,
      rosterBefore: entry.rosterSizeBefore,
      helperProjectedTax: round2(entry.helperProjectedTax),
      independentMarginalTax: round2(entry.independentMarginalTax),
    })));
    console.log('\nGAUNTLET-2 SUMMARY');
    console.table(summaries.map((summary) => ({
      draft: summary.draftId,
      label: summary.label,
      competitive: summary.competitive,
      realTeams: PRODUCTION_DEFAULT_REAL_TEAMS,
      shills: PRODUCTION_DEFAULT_SHILLS,
      surfacedLots: summary.surfacedLots,
      multiBidLots: summary.multiBidLots,
      totalChargedTax: round2(summary.totalChargedTax),
      shillReclaimedFills: summary.rows.reduce((sum, row) => sum + row.shillReclaimedFills, 0),
      shillReclaimedCost: round2(summary.rows.reduce((sum, row) => sum + row.shillReclaimedCost, 0)),
    })));
  }, GAUNTLET_TIMEOUT_MS);
});
