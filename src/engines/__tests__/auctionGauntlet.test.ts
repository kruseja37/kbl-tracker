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
  auctionSeedId?: string;
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
  feasibleShortfallAtFinal: number;
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
      competitive: true,
      auctionSeedId: 'D1c',
    },
    {
      id: 'D2',
      label: 'D2 pool-first round-robin B',
      kind: 'pool-first',
      teamCount: 8,
      archetypes: roundRobin[1],
      competitive: true,
      auctionSeedId: 'D2d',
      poolSizeMultiplier: 1.5,
      budgetPerTeam: NORMAL_BUDGET * 2,
    },
    {
      id: 'D3',
      label: 'D3 pool-first round-robin C',
      kind: 'pool-first',
      teamCount: 8,
      archetypes: roundRobin[2],
      competitive: true,
      auctionSeedId: 'D3a',
      poolSizeMultiplier: 1.5,
      budgetPerTeam: NORMAL_BUDGET * 2,
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
      poolSizeMultiplier: 1.5,
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
      poolSizeMultiplier: 1.5,
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
      // Current LeagueBuilderDraftSetup defaults pool-first to team-roster-priority when no
      // session override exists; the contract evidence documents this intentional parity choice.
      poolSourceMode: input.spec.kind === 'pool-first' ? 'team-roster-priority' : undefined,
      priorityIds: input.spec.kind === 'pool-first' ? priorityIds : undefined,
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
  const auctionSeedId = input.spec.auctionSeedId ?? input.spec.id;
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
      teams: input.teams.map((team) => ({
        teamId: team.id,
        budgetRemaining: input.pool.tierCap,
        rosterSlotsRemaining: ROSTER_SIZE,
        minSalary: LEAGUE_MINIMUM_SALARY,
        roster: [],
      })),
      players: input.auctionPlayers,
      nominationOrder: input.teams.map((team) => team.id),
      sessionId: `gauntlet-${auctionSeedId}`,
      sessionLaunchNonce: `${auctionSeedId}-nonce`,
      config: {
        nominationOrderSeed: `gauntlet:${auctionSeedId}`,
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

  for (let index = input.before.results.length; index < input.after.results.length; index += 1) {
    const result = input.after.results[index];
    if (result.disposition !== 'SOLD' || !result.winnerTeamId || result.salary === null) continue;
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

function activePassedCompletionPool(session: CpuShillAuctionSession): CompletionCandidate[] {
  const seen = new Set<string>();
  const pool: CompletionCandidate[] = [];
  session.results.forEach((result) => {
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
    competitiveWins: new Map(),
    evidence: [],
    multiBidLots: 0,
  };
  const auctionSeedId = input.spec.auctionSeedId ?? input.spec.id;

  const applyTransition = (transition: () => AuctionTransitionResult): void => {
    const before = session;
    const result = transition();
    if (!result.ok) {
      const short = result.session.teams
        .filter((team) => team.rosterSlotsRemaining > 0)
        .map((team) => `${team.teamId}:${team.roster.length}+${team.rosterSlotsRemaining}`)
        .join(', ');
      throw new Error(
        `${input.spec.id} ${input.spec.label} transition rejected from ${before.state}: ${result.reason}` +
          (short ? `; open rosters ${short}` : ''),
      );
    }
    const after = result.session as CpuShillAuctionSession;
    for (const team of after.teams) {
      expect(
        team.budgetRemaining,
        `${input.spec.id} ${team.teamId} budget went negative after ${before.state} transition`,
      ).toBeGreaterThanOrEqual(0);
    }
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
  const passedCompletionPool = activePassedCompletionPool(input.session);
  for (const team of input.session.teams) {
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
    const normalizedCaps = normalizeAuctionLuxuryCapsForLeagueSize(input.pool.luxuryCaps, input.teams.length);
    const implied = luxuryTax(finalRoster, identity ? shiftLuxuryCaps(normalizedCaps, identity) : normalizedCaps, 'taxed').charged;
    rows.push({
      draft: input.spec.id,
      team: team.teamId,
      archetype: teamById.get(team.teamId)?.mlbArchetypeKey ?? 'unknown',
      salarySpent: round2(team.roster.reduce((sum, assignment) => sum + assignment.salary, 0)),
      chargedTax: round2(charged),
      impliedFinalLiability: round2(implied),
      liabilityMinusCharged: round2(implied - charged),
      forcedBackfilledFills: input.session.instrumentation.forcedBackfilledFills.get(team.teamId) ?? 0,
      competitiveWins: input.session.instrumentation.competitiveWins.get(team.teamId) ?? 0,
      feasibleShortfallAtFinal: finalFeasibleShortfall,
      finalBudget: round2(team.budgetRemaining),
    });
  }

  const taxedTeamCount = rows.filter((row) => row.chargedTax > 0).length;
  expect(input.session.instrumentation.evidence).toHaveLength(Math.min(2, taxedTeamCount));
  return {
    draftId: input.spec.id,
    label: input.spec.label,
    competitive: input.spec.competitive,
    surfacedLots: input.session.surfacedLots,
    multiBidLots: input.session.instrumentation.multiBidLots,
    totalChargedTax: rows.reduce((sum, row) => sum + row.chargedTax, 0),
    rows,
    evidence: input.session.instrumentation.evidence,
  };
}

describe('auction gauntlet -- real luxury tax completion proof', () => {
  test('six production-extracted drafts complete with real per-lot tax drains', () => {
    const universe = ALL_MLB_PLAYERS.map(toDemandPlayer);
    const leaguePlayers = ALL_MLB_PLAYERS.map(toLeagueBuilderPlayer);
    const playerById = new Map(leaguePlayers.map((player) => [player.id, player]));
    const constructionById = new Map(leaguePlayers.map((player) => [player.id, toConstructionPlayer(player)]));
    const summaries: DraftSummary[] = [];

    for (const spec of buildDraftSpecs()) {
      const teamIds = getLeagueTeamIds('mlb').slice(0, spec.teamCount);
      const teams = teamIds.map((teamId, index) => buildTeam({
        id: teamId,
        archetype: spec.archetypes[index],
        index,
      }));
      const pool = extractProductionPool({ spec, universe, tier: DEFAULT_TIER });
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
    const competitiveMultiBidLots = summaries
      .filter((summary) => summary.competitive)
      .reduce((sum, summary) => sum + summary.multiBidLots, 0);
    expect(competitiveMultiBidLots).toBeGreaterThanOrEqual(COMPETITIVE_MULTI_BID_FLOOR);

    // TAXSWING Amendment 1: preserve the real-tax reachability gate across the full six-draft run.
    expect(allRows.some((row) => row.chargedTax > 0)).toBe(true);

    // Usage-aware pitcher tax makes D5 an honest low-tax (not zero-tax) room. Preserve reachability
    // and pin every incremental charge to the independently recomputed final liability.
    const d5Rows = allRows.filter((row) => row.draft === 'D5');
    expect(d5Rows.length).toBeGreaterThan(0);
    expect(d5Rows.some((row) => row.chargedTax > 0)).toBe(true);
    expect(d5Rows.every((row) => row.liabilityMinusCharged === 0)).toBe(true);

    // CONTRACT_TAXSWING_2026-07-10 Amendment 1: the ruled identity retunes shift the normalized
    // tax-crossing fixture from D5 to D6; the 20-team tripwire still protects the established contract.
    const d6Rows = allRows.filter((row) => row.draft === 'D6');
    expect(d6Rows.length).toBeGreaterThan(0);
    expect(d6Rows.some((row) => row.chargedTax > 0)).toBe(true);
    expect(d6Rows.some((row) => row.impliedFinalLiability > 0)).toBe(true);

    console.log('\nAUCTION GAUNTLET D6 SQUEEZE TABLE');
    console.table(allRows);
    console.log('\nAUCTION GAUNTLET D5 EXACT-MARGINAL EVIDENCE');
    console.table(summaries.flatMap((summary) => summary.evidence).map((entry) => ({
      draft: entry.draftId,
      team: entry.teamId,
      player: entry.playerId,
      rosterBefore: entry.rosterSizeBefore,
      helperProjectedTax: round2(entry.helperProjectedTax),
      independentMarginalTax: round2(entry.independentMarginalTax),
    })));
    console.log('\nAUCTION GAUNTLET SUMMARY');
    console.table(summaries.map((summary) => ({
      draft: summary.draftId,
      label: summary.label,
      competitive: summary.competitive,
      surfacedLots: summary.surfacedLots,
      multiBidLots: summary.multiBidLots,
      totalChargedTax: round2(summary.totalChargedTax),
    })));
  }, GAUNTLET_TIMEOUT_MS);
});
