import { describe, expect, test } from 'vitest';

import { DEFAULT_AUCTION_BID_INCREMENT } from '../../data/auctionEngineConstants';
import { HISTORICAL_ARCHETYPES, type HistoricalArchetype } from '../../data/historicalArchetypes';
import { getLeagueTeamIds } from '../../data/leagueStructure';
import { CHEMISTRY_CODE_TO_WORD, normalizeToChemistryCode } from '../../data/chemistryCanonical';
import type { PlayerData } from '../../data/playerDatabase';
import { ALL_MLB_PLAYERS } from '../../data/players/mlb';
import { isLegalRoster, LEGAL_ROSTER, type RosterSlotPlayer } from '../../data/rosterConstruction';
import { LEAGUE_MINIMUM_SALARY } from '../../data/rosterEngineConstants';
import { LUXURY_CAP_TABLES, TIER_CAPS, type TierKey } from '../../data/tierParams';
import {
  auctionMarginalTaxWithCaps,
  normalizeAuctionLuxuryCapsForLeagueSize,
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
const COMPETITIVE_MULTI_BID_FLOOR = 12;

type TaxContext = NonNullable<Parameters<typeof applyAuctionLuxuryTaxForLot>[1]>;

type DraftKind = 'pool-first' | 'design-first';

interface DraftSpec {
  id: string;
  label: string;
  kind: DraftKind;
  teamCount: number;
  archetypes: HistoricalArchetype[];
  competitive: boolean;
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
  competitiveWins: number;
  finalBudget: number;
}

interface DraftSummary {
  draftId: string;
  label: string;
  competitive: boolean;
  surfacedLots: number;
  multiBidLots: number;
  totalChargedTax: number;
  rows: MeasurementRow[];
  evidence: SettlementEvidence[];
}

interface Instrumentation {
  chargedTaxFromBudgetDelta: Map<string, number>;
  marginalTaxFromHelper: Map<string, number>;
  forcedBackfilledFills: Map<string, number>;
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
    baseCaps: normalizeAuctionLuxuryCapsForLeagueSize(input.pool.luxuryCaps, input.teams.length),
  };
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
  const taxExtreme = [...HISTORICAL_ARCHETYPES]
    .sort((left, right) => taxExposure(right) - taxExposure(left) || left.id.localeCompare(right.id))
    .slice(0, 8);
  const designArchetypes = [
    HISTORICAL_ARCHETYPES[0],
    HISTORICAL_ARCHETYPES[3],
    HISTORICAL_ARCHETYPES[7],
    HISTORICAL_ARCHETYPES[12],
    HISTORICAL_ARCHETYPES[17],
    HISTORICAL_ARCHETYPES[21],
  ];
  return [
    {
      id: 'D1',
      label: 'D1 pool-first round-robin A',
      kind: 'pool-first',
      teamCount: 8,
      archetypes: roundRobin[0],
      competitive: false,
    },
    {
      id: 'D2',
      label: 'D2 pool-first round-robin B',
      kind: 'pool-first',
      teamCount: 8,
      archetypes: roundRobin[1],
      competitive: false,
    },
    {
      id: 'D3',
      label: 'D3 pool-first round-robin C',
      kind: 'pool-first',
      teamCount: 8,
      archetypes: roundRobin[2],
      competitive: false,
    },
    {
      id: 'D4',
      label: 'D4 design-first locked designs',
      kind: 'design-first',
      teamCount: 6,
      archetypes: designArchetypes,
      competitive: true,
      designs: designArchetypes.map((_, index) => ({
        teamId: getLeagueTeamIds('mlb')[index],
        slots: designSlotsFor(index),
      })),
    },
    {
      id: 'D5',
      label: 'D5 pool-first tax-extreme',
      kind: 'pool-first',
      teamCount: 8,
      archetypes: taxExtreme,
      competitive: true,
      poolBalancePreset: 'juiced',
      poolQualityCenter: 74,
    },
    {
      id: 'D6',
      label: 'D6 pool-first stars-and-scrubs',
      kind: 'pool-first',
      teamCount: 6,
      archetypes: taxExtreme.slice(0, 6),
      competitive: true,
      poolBalancePreset: 'juiced',
      poolQualityCenter: 76,
      poolSizeMultiplier: 1.05,
    },
  ];
}

function extractProductionPool(input: {
  spec: DraftSpec;
  universe: readonly DemandUniversePlayer[];
  tier: TierKey;
}): RegisteredPool {
  const selectedTeamIds = getLeagueTeamIds('mlb').slice(0, input.spec.teamCount);
  const priorityIds = ALL_MLB_PLAYERS
    .filter((player) => selectedTeamIds.includes(player.teamId))
    .map((player) => player.id)
    .sort((left, right) => left.localeCompare(right));
  const poolBalancePreset = input.spec.poolBalancePreset ?? 'balanced';
  const poolQualityCenter = input.spec.poolQualityCenter ?? DEFAULT_POOL_QUALITY_CENTER;
  const tuning = poolBalancePresetTuning(poolBalancePreset, poolQualityCenter);
  const budgetPerTeam = input.spec.budgetPerTeam ?? NORMAL_BUDGET;
  const result = extractPoolFromDemand(
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
      poolSourceMode: 'team-roster-priority',
      priorityIds,
    },
  );
  return buildRegisteredPool({
    id: input.spec.id,
    tier: input.tier,
    totalSlots: input.spec.teamCount * ROSTER_SIZE,
    budgetPerTeam,
    players: result.players,
  });
}

function buildSession(input: {
  spec: DraftSpec;
  pool: RegisteredPool;
  teams: readonly Team[];
  auctionPlayers: readonly CpuShillAuctionPlayer[];
}): CpuShillAuctionSession {
  const cpuShills: Record<string, CpuShillProfile> = {};
  input.teams.forEach((team, index) => {
    const archetype = input.spec.archetypes[index];
    cpuShills[team.id] = buildClubCpuProfile({
      teamId: team.id,
      leagueId: input.spec.id,
      bandPriorities: archetypeBandPriorities(archetype),
      archetypeId: archetype.id,
    });
  });
  return {
    ...(initAuctionSession({
      teams: input.teams.map((team) => ({
        teamId: team.id,
        budgetRemaining: input.pool.tierCap,
        rosterSlotsRemaining: ROSTER_SIZE,
        minSalary: LEAGUE_MINIMUM_SALARY,
        roster: [],
      })),
      players: input.auctionPlayers,
      nominationOrder: input.teams.map((team) => team.id),
      sessionId: `gauntlet-${input.spec.id}`,
      sessionLaunchNonce: `${input.spec.id}-nonce`,
      config: {
        nominationOrderSeed: `gauntlet:${input.spec.id}`,
        bidIncrement: DEFAULT_AUCTION_BID_INCREMENT,
        reserveFractionK: DEFAULT_RESERVE_PRICE_K,
        nominationWeightExponent: 2,
        cpuShillCount: 0,
        excludeFromLeague: true,
        nonCompletingTeamIds: [],
      },
    }) as CpuShillAuctionSession),
    cpuShills,
  };
}

function resultKey(result: AuctionResult): string {
  return `${result.playerId}:${result.disposition}:${result.winnerTeamId ?? 'none'}:${result.salary ?? 'none'}`;
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
  const beforeResultKeys = new Set(input.before.results.map(resultKey));
  const teamById = new Map(input.teams.map((team) => [team.id, team]));

  for (const result of input.after.results) {
    if (beforeResultKeys.has(resultKey(result))) continue;
    if (result.disposition !== 'SOLD' || !result.winnerTeamId || result.salary === null) continue;
    const beforeTeam = input.before.teams.find((team) => team.teamId === result.winnerTeamId);
    const afterTeam = input.after.teams.find((team) => team.teamId === result.winnerTeamId);
    if (!beforeTeam || !afterTeam) continue;
    const activeLotSale = input.before.currentLot?.playerId === result.playerId;
    if (!activeLotSale) continue;

    const projectedTax = beforeTeam.projectedTax;
    const expectedBudget = beforeTeam.budgetRemaining - result.salary - projectedTax;
    expect(afterTeam.budgetRemaining).toBe(expectedBudget);
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
    if (input.instrumentation.evidence.length < 2 && !evidenceTeams.has(result.winnerTeamId)) {
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
        normalizeAuctionLuxuryCapsForLeagueSize(input.pool.luxuryCaps, input.teams.length),
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
    if (
      beforeResult?.disposition === 'PASSED' &&
      afterResult?.disposition === 'SOLD' &&
      afterResult.winnerTeamId
    ) {
      addTo(input.instrumentation.forcedBackfilledFills, afterResult.winnerTeamId, 1);
    }
  });
}

function driveDraft(input: {
  spec: DraftSpec;
  initialSession: CpuShillAuctionSession;
  taxContext: TaxContext;
  teams: readonly Team[];
  pool: RegisteredPool;
  constructionById: Map<string, ConstructionPlayer>;
  taxMode?: 'real' | 'zero';
  loneSurvivor?: 'decline' | 'claim' | 'raw-claim';
  instrument?: boolean;
}): CpuShillAuctionSession & { instrumentation: Instrumentation; surfacedLots: number; strand: string | null } {
  let session = input.initialSession;
  let surfacedLots = 0;
  let strand: string | null = null;
  const taxMode = input.taxMode ?? 'real';
  const loneSurvivor = input.loneSurvivor ?? 'decline';
  const instrument = input.instrument ?? true;
  const instrumentation: Instrumentation = {
    chargedTaxFromBudgetDelta: new Map(),
    marginalTaxFromHelper: new Map(),
    forcedBackfilledFills: new Map(),
    competitiveWins: new Map(),
    evidence: [],
    multiBidLots: 0,
  };

  const applyTransition = (transition: () => AuctionTransitionResult): boolean => {
    const before = session;
    const result = transition();
    if (!result.ok) {
      const short = result.session.teams
        .filter((team) => team.rosterSlotsRemaining > 0)
        .map((team) => `${team.teamId}:${team.roster.length}+${team.rosterSlotsRemaining}`)
        .join(', ');
      strand =
        `${input.spec.id} ${input.spec.label} transition rejected from ${before.state}: ${result.reason}` +
        (short ? `; open rosters ${short}` : '');
      // Preserve the rejected (post-backfill, terminalShortfall-bearing) session for the dump.
      session = result.session as CpuShillAuctionSession;
      return false;
    }
    const after = result.session as CpuShillAuctionSession;
    if (instrument) {
      instrumentTransition({
        draftId: input.spec.id,
        before,
        after,
        teams: input.teams,
        constructionById: input.constructionById,
        pool: input.pool,
        instrumentation,
      });
    }
    session = after;
    return true;
  };

  for (let step = 0; step < 6_000 && session.state !== 'AUCTION_COMPLETE' && strand === null; step += 1) {
    if (session.state === 'NOMINATION') {
      if (!applyTransition(() => surfaceNextPlayer(session))) break;
      session = applyAuctionLuxuryTaxForLot(session, taxMode === 'zero' ? null : input.taxContext);
      surfacedLots += 1;
    } else if (session.state === 'OPEN_BIDDING') {
      const bidder = getCurrentBidderTeamId(session);
      if (!input.spec.competitive || !bidder) {
        if (!applyTransition(() => (bidder ? passBid(session, bidder) : resolveLot(session)))) break;
        continue;
      }
      const decision = cpuBidOnLot(session, bidder, `gauntlet:${input.spec.id}`, { needAwareCompletion: true });
      if (decision.kind === 'bid') {
        if (!applyTransition(() => strandSafeBidTransition(session, bidder, decision.bid, true))) break;
      } else {
        if (!applyTransition(() => passBid(session, bidder))) break;
      }
    } else if (session.state === 'RESOLVE') {
      if (session.pendingClaim) {
        if (loneSurvivor === 'raw-claim') {
          // Reference-style (draftPipeline.integration.test.ts:192): lone survivor WINS at reserve.
          if (!applyTransition(() => claimLoneSurvivor(session))) break;
        } else {
          const wantClaim = loneSurvivor === 'claim'
            ? true
            : input.spec.competitive
              ? cpuDecideLoneSurvivor(
                  session,
                  session.pendingClaim.teamId,
                  `gauntlet:${input.spec.id}`,
                  { needAwareCompletion: true },
                ).kind === 'claim'
              : false;
          if (wantClaim) {
            if (!applyTransition(() => strandSafeClaimTransition(session, true))) break;
          } else {
            if (!applyTransition(() => passLoneSurvivorOut(session))) break;
          }
        }
      } else {
        if (!applyTransition(() => resolveLot(session))) break;
      }
    } else if (session.state === 'SOLD' || session.state === 'PASSED') {
      if (!applyTransition(() => advanceLot(session))) break;
    } else {
      throw new Error(`Unexpected auction state ${session.state}`);
    }
  }

  if (strand === null && session.state !== 'AUCTION_COMPLETE') {
    strand = `${input.spec.id} did not complete; stopped at ${session.state} (step budget or loop exit)`;
  }

  return Object.assign(session, { instrumentation, surfacedLots, strand });
}


// ============================================================================
// DIAGNOSTIC (auditor, 2026-07-09) — NOT the builder harness. Read-only probe.
// Isolates WHY D1 strands: tax (budget) vs pool supply (position mix / ordering).
// No product code changed. Captures strands instead of throwing so state can be dumped.
// ============================================================================

function classifyPos(pos: RosterSlotPlayer | undefined): string {
  if (!pos) return 'UNKNOWN';
  if (pos.isPitcher) return `P:${pos.role ?? '?'}`;
  return `H:${pos.position}`;
}

function posMix(shapes: Array<RosterSlotPlayer | undefined>): Record<string, number> {
  const mix: Record<string, number> = {};
  for (const s of shapes) {
    const key = classifyPos(s);
    mix[key] = (mix[key] ?? 0) + 1;
  }
  return mix;
}

interface StrandTeamDiag {
  team: string;
  filled: number;
  open: number;
  budgetRemaining: number;
  projectedTax: number;
  legalCompletionFeasibleAtMin: boolean;
  minCostToComplete: number;
  canAffordAtMin: boolean;
  verdict: string;
}

interface DiagResult {
  label: string;
  taxMode: 'real' | 'zero';
  loneSurvivor: 'decline' | 'claim' | 'raw-claim';
  completed: boolean;
  strand: string | null;
  totalChargedTax: number;
  soldResults: number;
  passedResults: number;
  residualPassedPool: number;
  strandedTeams: StrandTeamDiag[];
}

function runVariant(input: {
  spec: DraftSpec;
  pool: RegisteredPool;
  teams: readonly Team[];
  auctionPlayers: readonly CpuShillAuctionPlayer[];
  taxContext: TaxContext;
  constructionById: Map<string, ConstructionPlayer>;
  taxMode: 'real' | 'zero';
  loneSurvivor: 'decline' | 'claim' | 'raw-claim';
}): DiagResult {
  const session = buildSession({ spec: input.spec, pool: input.pool, teams: input.teams, auctionPlayers: input.auctionPlayers });
  const completed = driveDraft({
    spec: input.spec,
    initialSession: session,
    taxContext: input.taxContext,
    teams: input.teams,
    pool: input.pool,
    constructionById: input.constructionById,
    taxMode: input.taxMode,
    loneSurvivor: input.loneSurvivor,
    instrument: false,
  });

  // Charged tax computed from budget deltas (robust; no dependency on the builder's
  // instrumentTransition assertions): budget consumed beyond recorded roster salaries === tax.
  const initialBudget = input.pool.tierCap;
  const totalChargedTax = completed.teams.reduce((sum, team) => {
    const salarySpent = team.roster.reduce((s, a) => s + a.salary, 0);
    return sum + (initialBudget - team.budgetRemaining - salarySpent);
  }, 0);
  const soldResults = completed.results.filter((r) => r.disposition === 'SOLD').length;
  const passedResults = completed.results.filter((r) => r.disposition === 'PASSED').length;

  // Residual passed pool = still-PASSED lots (fill source that backfill left unused), deduped.
  const seen = new Set<string>();
  const passedPool: CompletionCandidate[] = [];
  for (const r of completed.results) {
    if (r.disposition !== 'PASSED') continue;
    if (seen.has(r.playerId)) continue;
    const shape = completed.players[r.playerId]?.pos;
    if (!shape) continue;
    seen.add(r.playerId);
    passedPool.push({ id: r.playerId, price: LEAGUE_MINIMUM_SALARY, shape });
  }

  const strandedTeams: StrandTeamDiag[] = [];
  for (const team of completed.teams) {
    if (team.rosterSlotsRemaining <= 0) continue;
    const rosterShapes = team.roster
      .map((a) => completed.players[a.playerId]?.pos)
      .filter((s): s is RosterSlotPlayer => Boolean(s));
    const quote = cheapestLegalCompletion(rosterShapes, passedPool, team.rosterSlotsRemaining);
    const minCost = team.rosterSlotsRemaining * LEAGUE_MINIMUM_SALARY;
    const canAffordAtMin = minCost <= team.budgetRemaining;
    const feasible = quote.feasible;
    const verdict = !feasible
      ? 'SUPPLY: no legal completion exists in residual passed pool even at minSalary (position mix / ordering)'
      : canAffordAtMin
        ? 'ANOMALY: legal completion feasible AND affordable at min — backfill should have filled'
        : 'BUDGET: legal completion exists but team cannot afford it';
    strandedTeams.push({
      team: team.teamId,
      filled: team.roster.length,
      open: team.rosterSlotsRemaining,
      budgetRemaining: round2(team.budgetRemaining),
      projectedTax: round2(team.projectedTax),
      legalCompletionFeasibleAtMin: feasible,
      minCostToComplete: round2(minCost),
      canAffordAtMin,
      verdict,
    });
  }

  return {
    label: input.spec.label,
    taxMode: input.taxMode,
    loneSurvivor: input.loneSurvivor,
    completed: completed.strand === null && completed.state === 'AUCTION_COMPLETE',
    strand: completed.strand,
    totalChargedTax: round2(totalChargedTax),
    soldResults,
    passedResults,
    residualPassedPool: passedPool.length,
    strandedTeams,
  };
}

function dumpResult(r: DiagResult): void {
  console.log(`\n=== ${r.label} | tax=${r.taxMode} | loneSurvivor=${r.loneSurvivor} ===`);
  console.log(`completed=${r.completed} soldResults=${r.soldResults} passedResults=${r.passedResults} residualPassedPool=${r.residualPassedPool} totalChargedTax=${r.totalChargedTax}`);
  if (r.strand) console.log(`strand: ${r.strand}`);
  if (r.strandedTeams.length > 0) console.table(r.strandedTeams);
}

function dumpPoolSupply(label: string, pool: RegisteredPool, session: CpuShillAuctionSession, teamCount: number): void {
  const shapes = pool.players.map((p) => session.players[p.id]?.pos);
  const mix = posMix(shapes);
  const pitchers = shapes.filter((s) => s?.isPitcher).length;
  const closers = shapes.filter((s) => s?.isPitcher && s.role === 'CP').length;
  const starters = shapes.filter((s) => s?.isPitcher && (s.role === 'SP' || s.role === 'SP/RP')).length;
  const relievers = shapes.filter((s) => s?.isPitcher && (s.role === 'RP' || s.role === 'CP' || s.role === 'SP/RP')).length;
  const primaryC = shapes.filter((s) => !s?.isPitcher && s?.position === 'C').length;
  console.log(`\n### POOL SUPPLY ${label}: size=${pool.players.length} demand=${teamCount}x22=${teamCount * 22}`);
  console.log(`pitchers=${pitchers} (need>=${teamCount * 8}) closers=${closers} (need>=${teamCount * 1}) starters=${starters} (need>=${teamCount * 4}) relievers=${relievers} (need>=${teamCount * 4}) primaryC=${primaryC} (need>=${teamCount * 1})`);
  console.log('posMix:', JSON.stringify(mix));
}

describe('DIAG: auction gauntlet D1 strand — tax vs supply isolation', () => {
  const universe = ALL_MLB_PLAYERS.map(toDemandPlayer);
  const leaguePlayers = ALL_MLB_PLAYERS.map(toLeagueBuilderPlayer);
  const playerById = new Map(leaguePlayers.map((player) => [player.id, player]));
  const constructionById = new Map(leaguePlayers.map((player) => [player.id, toConstructionPlayer(player)]));

  const specs = buildDraftSpecs();
  const d1 = specs.find((s) => s.id === 'D1')!;

  test('D1 (8 teams, pool-first): real vs zero tax, decline vs claim-at-reserve', () => {
    const teamIds = getLeagueTeamIds('mlb').slice(0, d1.teamCount);
    const teams = teamIds.map((teamId, index) => buildTeam({ id: teamId, archetype: d1.archetypes[index], index }));
    const pool = extractProductionPool({ spec: d1, universe, tier: DEFAULT_TIER });
    const auctionPlayers = toAuctionPlayers(pool, playerById);
    const taxContext = buildTaxContext({ pool, teams, players: leaguePlayers });
    const probeSession = buildSession({ spec: d1, pool, teams, auctionPlayers });
    dumpPoolSupply('D1', pool, probeSession, d1.teamCount);

    const variants: Array<{ taxMode: 'real' | 'zero'; loneSurvivor: 'decline' | 'claim' }> = [
      { taxMode: 'real', loneSurvivor: 'decline' },
      { taxMode: 'zero', loneSurvivor: 'decline' },
      { taxMode: 'real', loneSurvivor: 'claim' },
      { taxMode: 'zero', loneSurvivor: 'claim' },
    ];
    for (const v of variants) {
      const r = runVariant({ spec: d1, pool, teams, auctionPlayers, taxContext, constructionById, ...v });
      dumpResult(r);
    }
    expect(true).toBe(true);
  }, GAUNTLET_TIMEOUT_MS);

  test('D1-DETERMINISM: real/decline twice — identical strand', () => {
    const teamIds = getLeagueTeamIds('mlb').slice(0, d1.teamCount);
    const teams = teamIds.map((teamId, index) => buildTeam({ id: teamId, archetype: d1.archetypes[index], index }));
    const pool = extractProductionPool({ spec: d1, universe, tier: DEFAULT_TIER });
    const auctionPlayers = toAuctionPlayers(pool, playerById);
    const taxContext = buildTaxContext({ pool, teams, players: leaguePlayers });
    const a = runVariant({ spec: d1, pool, teams, auctionPlayers, taxContext, constructionById, taxMode: 'real', loneSurvivor: 'decline' });
    const b = runVariant({ spec: d1, pool, teams, auctionPlayers, taxContext, constructionById, taxMode: 'real', loneSurvivor: 'decline' });
    console.log(`\n### DETERMINISM strandA===strandB: ${a.strand === b.strand}`);
    console.log(`A: ${a.strand}`);
    console.log(`B: ${b.strand}`);
    expect(a.strand).toBe(b.strand);
  }, GAUNTLET_TIMEOUT_MS);

  test('D1 PRODUCT-PATH: reference raw-claim + real competitive need-aware', () => {
    const teamIds = getLeagueTeamIds('mlb').slice(0, d1.teamCount);
    const teams = teamIds.map((teamId, index) => buildTeam({ id: teamId, archetype: d1.archetypes[index], index }));
    const pool = extractProductionPool({ spec: d1, universe, tier: DEFAULT_TIER });
    const auctionPlayers = toAuctionPlayers(pool, playerById);
    const taxContext = buildTaxContext({ pool, teams, players: leaguePlayers });

    // (A) reference-style: lone survivor WINS at reserve (draftPipeline.integration.test.ts:192)
    for (const taxMode of ['real', 'zero'] as const) {
      const r = runVariant({ spec: d1, pool, teams, auctionPlayers, taxContext, constructionById, taxMode, loneSurvivor: 'raw-claim' });
      dumpResult(r);
    }

    // (B) real competitive need-aware path (the D5/D6 path that the harness never reached)
    const competitiveD1: DraftSpec = { ...d1, id: 'D1c', label: 'D1c competitive need-aware', competitive: true };
    const rc = runVariant({ spec: competitiveD1, pool, teams, auctionPlayers, taxContext, constructionById, taxMode: 'real', loneSurvivor: 'decline' });
    dumpResult(rc);
    expect(true).toBe(true);
  }, GAUNTLET_TIMEOUT_MS);

  test('GENTLER: 4-team pool-first, real tax, decline vs claim', () => {
    const gentler: DraftSpec = {
      id: 'G4',
      label: 'G4 gentler 4-team pool-first',
      kind: 'pool-first',
      teamCount: 4,
      archetypes: d1.archetypes.slice(0, 4),
      competitive: false,
    };
    const teamIds = getLeagueTeamIds('mlb').slice(0, gentler.teamCount);
    const teams = teamIds.map((teamId, index) => buildTeam({ id: teamId, archetype: gentler.archetypes[index], index }));
    const pool = extractProductionPool({ spec: gentler, universe, tier: DEFAULT_TIER });
    const auctionPlayers = toAuctionPlayers(pool, playerById);
    const taxContext = buildTaxContext({ pool, teams, players: leaguePlayers });
    const probeSession = buildSession({ spec: gentler, pool, teams, auctionPlayers });
    dumpPoolSupply('G4', pool, probeSession, gentler.teamCount);
    for (const loneSurvivor of ['decline', 'claim'] as const) {
      const r = runVariant({ spec: gentler, pool, teams, auctionPlayers, taxContext, constructionById, taxMode: 'real', loneSurvivor });
      dumpResult(r);
    }
    expect(true).toBe(true);
  }, GAUNTLET_TIMEOUT_MS);
});

describe('DIAG2: competitive-lot tax self-consistency (harness instrumentation model check)', () => {
  const universe = ALL_MLB_PLAYERS.map(toDemandPlayer);
  const leaguePlayers = ALL_MLB_PLAYERS.map(toLeagueBuilderPlayer);
  const playerById = new Map(leaguePlayers.map((player) => [player.id, player]));
  const d1 = buildDraftSpecs().find((s) => s.id === 'D1')!;

  test('record impliedTax vs before-winner.projectedTax on every competitive settlement', () => {
    const teamIds = getLeagueTeamIds('mlb').slice(0, d1.teamCount);
    const teams = teamIds.map((teamId, index) => buildTeam({ id: teamId, archetype: d1.archetypes[index], index }));
    const pool = extractProductionPool({ spec: d1, universe, tier: DEFAULT_TIER });
    const auctionPlayers = toAuctionPlayers(pool, playerById);
    const taxContext = buildTaxContext({ pool, teams, players: leaguePlayers });
    const spec: DraftSpec = { ...d1, id: 'D1c', label: 'D1c competitive', competitive: true };

    let session = buildSession({ spec, pool, teams, auctionPlayers });
    let prevResultsLen = session.results.length;
    const mismatches: Array<{ player: string; winner: string; salary: number; impliedTax: number; beforeProjectedTax: number; delta: number }> = [];
    let settlements = 0;

    for (let step = 0; step < 6000 && session.state !== 'AUCTION_COMPLETE'; step += 1) {
      const before = session;
      let next: AuctionTransitionResult | null = null;
      if (session.state === 'NOMINATION') {
        next = surfaceNextPlayer(session);
        if (next.ok) { session = applyAuctionLuxuryTaxForLot(next.session as CpuShillAuctionSession, taxContext); }
        else break;
        continue;
      } else if (session.state === 'OPEN_BIDDING') {
        const bidder = getCurrentBidderTeamId(session);
        if (!bidder) { next = resolveLot(session); }
        else {
          const decision = cpuBidOnLot(session, bidder, `gauntlet:${spec.id}`, { needAwareCompletion: true });
          next = decision.kind === 'bid' ? strandSafeBidTransition(session, bidder, decision.bid, true) : passBid(session, bidder);
        }
      } else if (session.state === 'RESOLVE') {
        next = session.pendingClaim ? passLoneSurvivorOut(session) : resolveLot(session);
      } else if (session.state === 'SOLD' || session.state === 'PASSED') {
        next = advanceLot(session);
      } else break;

      if (!next.ok) break;
      const after = next.session as CpuShillAuctionSession;

      // Detect newly-appended SOLD active-lot settlements.
      for (let i = prevResultsLen; i < after.results.length; i += 1) {
        const r = after.results[i];
        if (r.disposition !== 'SOLD' || !r.winnerTeamId || r.salary == null) continue;
        if (before.currentLot?.playerId !== r.playerId) continue;
        const bt = before.teams.find((t) => t.teamId === r.winnerTeamId);
        const at = after.teams.find((t) => t.teamId === r.winnerTeamId);
        if (!bt || !at) continue;
        const impliedTax = bt.budgetRemaining - at.budgetRemaining - r.salary;
        const delta = impliedTax - bt.projectedTax;
        settlements += 1;
        if (Math.abs(delta) > 1e-6) {
          mismatches.push({ player: r.playerId, winner: r.winnerTeamId, salary: round2(r.salary), impliedTax: round2(impliedTax), beforeProjectedTax: round2(bt.projectedTax), delta: round2(delta) });
        }
      }
      prevResultsLen = after.results.length;
      session = after;
    }

    console.log(`\n### COMPETITIVE SETTLEMENT SELF-CONSISTENCY: completed=${session.state === 'AUCTION_COMPLETE'} settlements=${settlements} mismatches=${mismatches.length}`);
    if (mismatches.length > 0) {
      console.log('First 10 mismatches (impliedTax != before-winner.projectedTax):');
      console.table(mismatches.slice(0, 10));
    }
    expect(true).toBe(true);
  }, GAUNTLET_TIMEOUT_MS);
});

describe('DIAG3: claim-path tax self-consistency (matches builder competitive path)', () => {
  const universe = ALL_MLB_PLAYERS.map(toDemandPlayer);
  const leaguePlayers = ALL_MLB_PLAYERS.map(toLeagueBuilderPlayer);
  const playerById = new Map(leaguePlayers.map((player) => [player.id, player]));
  const d1 = buildDraftSpecs().find((s) => s.id === 'D1')!;

  test('record impliedTax on competitive+claim settlements (cpuDecideLoneSurvivor path)', () => {
    const teamIds = getLeagueTeamIds('mlb').slice(0, d1.teamCount);
    const teams = teamIds.map((teamId, index) => buildTeam({ id: teamId, archetype: d1.archetypes[index], index }));
    const pool = extractProductionPool({ spec: d1, universe, tier: DEFAULT_TIER });
    const auctionPlayers = toAuctionPlayers(pool, playerById);
    const taxContext = buildTaxContext({ pool, teams, players: leaguePlayers });
    const spec: DraftSpec = { ...d1, id: 'D1cc', label: 'D1cc competitive+claim', competitive: true };

    let session = buildSession({ spec, pool, teams, auctionPlayers });
    let prevResultsLen = session.results.length;
    const mismatches: Array<{ player: string; winner: string; salary: number; impliedTax: number; beforeProjectedTax: number; delta: number; via: string }> = [];
    let settlements = 0;

    for (let step = 0; step < 6000 && session.state !== 'AUCTION_COMPLETE'; step += 1) {
      const before = session;
      let next: AuctionTransitionResult | null = null;
      let via = '';
      if (session.state === 'NOMINATION') {
        const n = surfaceNextPlayer(session);
        if (!n.ok) break;
        session = applyAuctionLuxuryTaxForLot(n.session as CpuShillAuctionSession, taxContext);
        continue;
      } else if (session.state === 'OPEN_BIDDING') {
        const bidder = getCurrentBidderTeamId(session);
        if (!bidder) { next = resolveLot(session); via = 'resolveLot'; }
        else {
          const decision = cpuBidOnLot(session, bidder, `gauntlet:${spec.id}`, { needAwareCompletion: true });
          next = decision.kind === 'bid' ? strandSafeBidTransition(session, bidder, decision.bid, true) : passBid(session, bidder);
          via = decision.kind === 'bid' ? 'bid' : 'pass';
        }
      } else if (session.state === 'RESOLVE') {
        if (session.pendingClaim) {
          const dec = cpuDecideLoneSurvivor(session, session.pendingClaim.teamId, `gauntlet:${spec.id}`, { needAwareCompletion: true });
          next = dec.kind === 'claim' ? strandSafeClaimTransition(session, true) : passLoneSurvivorOut(session);
          via = dec.kind === 'claim' ? 'claim' : 'passLone';
        } else { next = resolveLot(session); via = 'resolveLot'; }
      } else if (session.state === 'SOLD' || session.state === 'PASSED') {
        next = advanceLot(session); via = 'advance';
      } else break;

      if (!next.ok) break;
      const after = next.session as CpuShillAuctionSession;
      for (let i = prevResultsLen; i < after.results.length; i += 1) {
        const r = after.results[i];
        if (r.disposition !== 'SOLD' || !r.winnerTeamId || r.salary == null) continue;
        if (before.currentLot?.playerId !== r.playerId) continue;
        const bt = before.teams.find((t) => t.teamId === r.winnerTeamId);
        const at = after.teams.find((t) => t.teamId === r.winnerTeamId);
        if (!bt || !at) continue;
        const impliedTax = bt.budgetRemaining - at.budgetRemaining - r.salary;
        const delta = impliedTax - bt.projectedTax;
        settlements += 1;
        if (Math.abs(delta) > 1e-6) {
          mismatches.push({ player: r.playerId, winner: r.winnerTeamId, salary: round2(r.salary), impliedTax: round2(impliedTax), beforeProjectedTax: round2(bt.projectedTax), delta: round2(delta), via });
        }
      }
      prevResultsLen = after.results.length;
      session = after;
    }

    console.log(`\n### CLAIM-PATH SELF-CONSISTENCY: completed=${session.state === 'AUCTION_COMPLETE'} settlements=${settlements} mismatches=${mismatches.length}`);
    if (mismatches.length > 0) {
      console.log('First 12 mismatches:');
      console.table(mismatches.slice(0, 12));
    }
    expect(true).toBe(true);
  }, GAUNTLET_TIMEOUT_MS);
});

describe('DIAG4: do D2/D3 complete at NORMAL budget + default pool (no inflation)?', () => {
  const universe = ALL_MLB_PLAYERS.map(toDemandPlayer);
  const leaguePlayers = ALL_MLB_PLAYERS.map(toLeagueBuilderPlayer);
  const playerById = new Map(leaguePlayers.map((p) => [p.id, p]));
  const constructionById = new Map(leaguePlayers.map((p) => [p.id, toConstructionPlayer(p)]));
  const rr = [HISTORICAL_ARCHETYPES.slice(0, 8), HISTORICAL_ARCHETYPES.slice(8, 16), HISTORICAL_ARCHETYPES.slice(16, 24)];

  test('D2/D3 archetypes, competitive, NORMAL budget, DEFAULT pool multiplier', () => {
    for (const [label, arch, seed] of [['D2@normal', rr[1], 'D2d'], ['D3@normal', rr[2], 'D3a']] as const) {
      const spec: DraftSpec = { id: seed, label, kind: 'pool-first', teamCount: 8, archetypes: [...arch], competitive: true };
      const teamIds = getLeagueTeamIds('mlb').slice(0, 8);
      const teams = teamIds.map((teamId, index) => buildTeam({ id: teamId, archetype: arch[index], index }));
      const pool = extractProductionPool({ spec, universe, tier: DEFAULT_TIER });
      const auctionPlayers = toAuctionPlayers(pool, playerById);
      const taxContext = buildTaxContext({ pool, teams, players: leaguePlayers });
      const r = runVariant({ spec, pool, teams, auctionPlayers, taxContext, constructionById, taxMode: 'real', loneSurvivor: 'decline' });
      const closers = pool.players.map((p) => buildSession({ spec, pool, teams, auctionPlayers }).players[p.id]?.pos).filter((s) => s?.isPitcher && s.role === 'CP').length;
      console.log(`\n### ${label}: NORMAL budget=${round2(pool.tierCap)} default-pool size=${pool.players.length} closers=${closers} -> completed=${r.completed} tax=${r.totalChargedTax} strand=${r.strand ?? 'none'}`);
    }
    expect(true).toBe(true);
  }, GAUNTLET_TIMEOUT_MS);
});
