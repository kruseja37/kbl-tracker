import { describe, expect, test } from 'vitest';

import { DEFAULT_AUCTION_BID_INCREMENT } from '../src/data/auctionEngineConstants';
import { CHEMISTRY_CODE_TO_WORD, normalizeToChemistryCode } from '../src/data/chemistryCanonical';
import { HISTORICAL_ARCHETYPES, type HistoricalArchetype } from '../src/data/historicalArchetypes';
import { getLeagueTeamIds } from '../src/data/leagueStructure';
import type { PlayerData } from '../src/data/playerDatabase';
import { ALL_MLB_PLAYERS } from '../src/data/players/mlb';
import { isLegalRoster, LEGAL_ROSTER, type RosterSlotPlayer } from '../src/data/rosterConstruction';
import { LEAGUE_MINIMUM_SALARY } from '../src/data/rosterEngineConstants';
import { type LuxuryCapRow, TIER_CAPS, type TierKey } from '../src/data/tierParams';
import { cheapestLegalCompletion, type CompletionCandidate } from '../src/engines/auctionCompletionFloor';
import { auctionMarginalTaxWithCaps } from '../src/engines/auctionLuxuryTax';
import { SIZING_TUNING } from '../src/engines/auctionPoolSizing';
import { DEFAULT_RESERVE_PRICE_K } from '../src/engines/auctionReservePrice';
import {
  advanceLot,
  getCurrentBidderTeamId,
  initAuctionSession,
  lotOpeningAsk,
  passBid,
  passLoneSurvivorOut,
  resolveLot,
  sessionBidCeiling,
  surfaceNextPlayer,
  type AuctionResult,
  type AuctionTransitionResult,
} from '../src/engines/auctionStateMachine';
import {
  archetypeBandPriorities,
  buildArchetypeShillProfile,
  buildClubCpuProfile,
  cpuBidOnLot,
  cpuDecideLoneSurvivor,
  type CpuShillAuctionPlayer,
  type CpuShillAuctionSession,
  type CpuShillProfile,
} from '../src/engines/cpuShillBidding';
import {
  luxuryTax,
  registerPool,
  shiftLuxuryCaps,
  type ConstructionPlayer,
  type RegisteredPool,
  type TeamCapIdentity,
} from '../src/engines/leagueConstruction';
import {
  DEFAULT_POOL_QUALITY_CENTER,
  DEFAULT_POOL_SIZE_MULTIPLIER,
  extractPoolFromDemand,
  type DemandUniversePlayer,
} from '../src/engines/poolFromDemand';
import { archetypeToCapIdentity } from '../src/engines/archetypeIdentity';
import { toRosterSlotPlayer } from '../src/engines/rosterNeed';
import { calculateIvBaseSalary, calculateSalary, type PlayerForSalary, type PlayerPosition } from '../src/engines/salaryCalculator';
import {
  applyAuctionLuxuryTaxForLot,
  strandSafeBidTransition,
  strandSafeClaimTransition,
} from '../src/src_figma/app/hooks/useAuctionDraft';
import type {
  Chemistry,
  Grade,
  PitchType,
  Player,
  Position,
  Team,
} from '../src/utils/leagueBuilderStorage';
import { computeIvPercentiles } from '../src/utils/leagueBuilderAuctionPipeline';

const RUN_DIAG = process.env.RUN_AUCTION_COLLAPSE_DIAG === '1';
const SEARCH_COUNT = Number.parseInt(process.env.AUCTION_COLLAPSE_SEARCH_COUNT ?? '0', 10);
const maybeTest = RUN_DIAG && SEARCH_COUNT === 0 ? test : test.skip;
const maybeSearchTest = RUN_DIAG && SEARCH_COUNT > 0 ? test : test.skip;
const DIAG_TIMEOUT_MS = Number.parseInt(process.env.AUCTION_COLLAPSE_TIMEOUT_MS ?? '600000', 10);
const VERBOSE = process.env.AUCTION_COLLAPSE_VERBOSE === '1';
const COMPACT = process.env.AUCTION_COLLAPSE_COMPACT === '1';

const TIER: TierKey = 'juiced';
const REAL_TEAM_COUNT = 4;
const ROSTER_SIZE = LEGAL_ROSTER.size;
const BASE_BUDGET = TIER_CAPS[TIER].tierCap;
const PHASE_SIZE = 20;
const MAX_STEPS = 20_000;

type LeverId =
  | 'baseline'
  | 'tax-half'
  | 'tax-zero'
  | 'caps-plus-25'
  | 'shill-tax-exempt'
  | 'budgets-plus-50'
  | 'completion-tax-off';

interface Lever {
  id: LeverId;
  label: string;
  taxMultiplier: number;
  capScale: number;
  budgetMultiplier: number;
  shillTaxExempt: boolean;
  completionTaxInCpuReserve: boolean;
}

const LEVERS: readonly Lever[] = [
  {
    id: 'baseline',
    label: 'production defaults',
    taxMultiplier: 1,
    capScale: 1,
    budgetMultiplier: 1,
    shillTaxExempt: false,
    completionTaxInCpuReserve: true,
  },
  {
    id: 'tax-half',
    label: 'tax charged x0.5',
    taxMultiplier: 0.5,
    capScale: 1,
    budgetMultiplier: 1,
    shillTaxExempt: false,
    completionTaxInCpuReserve: true,
  },
  {
    id: 'tax-zero',
    label: 'tax charged x0',
    taxMultiplier: 0,
    capScale: 1,
    budgetMultiplier: 1,
    shillTaxExempt: false,
    completionTaxInCpuReserve: true,
  },
  {
    id: 'caps-plus-25',
    label: 'luxury cap thresholds +25%',
    taxMultiplier: 1,
    capScale: 1.25,
    budgetMultiplier: 1,
    shillTaxExempt: false,
    completionTaxInCpuReserve: true,
  },
  {
    id: 'shill-tax-exempt',
    label: 'shill exempt from tax',
    taxMultiplier: 1,
    capScale: 1,
    budgetMultiplier: 1,
    shillTaxExempt: true,
    completionTaxInCpuReserve: true,
  },
  {
    id: 'budgets-plus-50',
    label: 'budgets +50%',
    taxMultiplier: 1,
    capScale: 1,
    budgetMultiplier: 1.5,
    shillTaxExempt: false,
    completionTaxInCpuReserve: true,
  },
  {
    id: 'completion-tax-off',
    label: 'completion reserve without completion tax',
    taxMultiplier: 1,
    capScale: 1,
    budgetMultiplier: 1,
    shillTaxExempt: false,
    completionTaxInCpuReserve: false,
  },
] as const;

interface SeedSpec {
  seed: string;
  archetypes: readonly HistoricalArchetype[];
}

const SEEDS: readonly SeedSpec[] = [
  { seed: 'collapse-a', archetypes: [0, 6, 12, 18].map((index) => HISTORICAL_ARCHETYPES[index]) },
  { seed: 'collapse-b', archetypes: [1, 7, 13, 19].map((index) => HISTORICAL_ARCHETYPES[index]) },
  { seed: 'collapse-c', archetypes: [2, 8, 14, 20].map((index) => HISTORICAL_ARCHETYPES[index]) },
] as const;

interface TaxContext {
  poolById: Map<string, RegisteredPool['players'][number]>;
  playerById: Map<string, Player>;
  identityByTeamId: Map<string, TeamCapIdentity | undefined>;
  baseCaps: LuxuryCapRow[];
}

interface LotTeamObservation {
  teamId: string;
  role: 'club' | 'shill';
  rosterSize: number;
  budgetRemaining: number;
  projectedTax: number;
  solvencyCeiling: number;
  cpuMaxBid: number | null;
  couldBid: boolean;
  didBid: boolean;
  rawCashSpent: number;
  salarySpent: number;
  taxSpent: number;
  completionSalaryReserve: number;
  completionTaxApplied: number;
  completionTaxCanonical: number;
  candidateMarginalTax: number;
  valuationOrRoundingGap: number;
  bindingRows: readonly string[];
}

interface LotObservation {
  lot: number;
  playerId: string;
  openingAsk: number;
  willingBidders: number;
  actualBidders: number;
  raises: number;
  disposition: AuctionResult['disposition'];
  winnerTeamId: string | null;
  clearingPrice: number | null;
  teams: readonly LotTeamObservation[];
}

interface PhaseRow {
  phase: string;
  lots: number;
  avgWillingBidders: number;
  pctTwoPlusWilling: number;
  pctPassedZeroBids: number;
}

interface ShillWin {
  lot: number;
  playerId: string;
  salary: number;
  taxCharged: number;
  budgetBefore: number;
  budgetAfter: number;
}

interface FinalTeamRow {
  teamId: string;
  role: 'club' | 'shill';
  rosterSize: number;
  legal22: boolean | null;
  budgetRemaining: number;
  longestPre60Lockout: number;
}

interface BindingPhaseRow {
  phase: string;
  row: string;
  avgTeamsBindingPerLot: number;
  pctLotsAnyTeamBinding: number;
}

interface RunResult {
  seed: string;
  lever: LeverId;
  leverLabel: string;
  archetypes: readonly string[];
  poolSize: number;
  initialBudget: number;
  completed: boolean;
  stall: string | null;
  lots: readonly LotObservation[];
  phases: readonly PhaseRow[];
  collapseLot: number | null;
  sustainedCollapseLot: number | null;
  pctTwoPlusWilling: number;
  finalTeams: readonly FinalTeamRow[];
  shillWins: readonly ShillWin[];
  shillMinBudget: number;
  success: boolean;
  bindingByPhase: readonly BindingPhaseRow[];
}

interface DiagnosisSummaryRun extends Omit<RunResult, 'lots'> {
  collapseLockedTeams: readonly LotTeamObservation[];
}

interface DiagnosisOutput {
  generatedBy: string;
  settings: {
    tier: TierKey;
    realTeams: number;
    shills: number;
    rosterSize: number;
    baseBudget: number;
    poolMultiplier: number;
    poolQualityCenter: number;
    reserveK: number;
    shillMaxWins: number;
  };
  runs: readonly DiagnosisSummaryRun[];
  lots?: readonly RunResult[];
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
  const isPitcher = ['SP', 'RP', 'CP', 'SP/RP', 'P'].includes(player.primaryPosition);
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
      ? { VEL: player.velocity, JNK: player.junk, ACC: player.accuracy }
      : undefined,
  };
}

function buildPool(seedSpec: SeedSpec): {
  pool: RegisteredPool;
  players: Player[];
  constructionById: Map<string, ConstructionPlayer>;
} {
  const universe = ALL_MLB_PLAYERS.map(toDemandPlayer);
  const selectedTeamIds = getLeagueTeamIds('mlb').slice(0, REAL_TEAM_COUNT);
  const priorityIds = ALL_MLB_PLAYERS
    .filter((player) => selectedTeamIds.includes(player.teamId))
    .map((player) => player.id)
    .sort((left, right) => left.localeCompare(right));
  const extracted = extractPoolFromDemand(
    universe,
    [],
    seedSpec.archetypes,
    TIER,
    {
      teams: REAL_TEAM_COUNT,
      shills: 0,
      budgetPerTeam: BASE_BUDGET,
      poolBalancePreset: 'balanced',
      poolQualityCenter: DEFAULT_POOL_QUALITY_CENTER,
      poolSizeMultiplier: DEFAULT_POOL_SIZE_MULTIPLIER,
      poolSourceMode: 'team-roster-priority',
      priorityIds,
    },
  );
  const pool = registerPool({
    leagueId: `auction-collapse-${seedSpec.seed}`,
    tier: TIER,
    balanceMode: 'taxed',
    totalSlots: REAL_TEAM_COUNT * ROSTER_SIZE,
    salaryCap: BASE_BUDGET,
    players: extracted.players.map((player) => ({ id: player.id, iv: player.iv, salary: player.salary })),
  });
  const players = ALL_MLB_PLAYERS.map(toLeagueBuilderPlayer);
  return {
    pool,
    players,
    constructionById: new Map(players.map((player) => [player.id, toConstructionPlayer(player)])),
  };
}

function buildTeams(seedSpec: SeedSpec): Team[] {
  return getLeagueTeamIds('mlb').slice(0, REAL_TEAM_COUNT).map((id, index) => ({
    id,
    name: `Collapse Club ${index + 1}`,
    abbreviation: `C${index + 1}`,
    location: 'Diagnosis',
    nickname: seedSpec.archetypes[index].name,
    colors: { primary: '#243028', secondary: '#CBB89C' },
    stadium: 'Diagnosis Yard',
    controlledBy: 'ai',
    leagueIds: ['auction-collapse'],
    capIdentity: archetypeToCapIdentity(seedSpec.archetypes[index]),
    mlbArchetypeKey: seedSpec.archetypes[index].id,
    createdDate: '2026-07-09T00:00:00.000Z',
    lastModified: '2026-07-09T00:00:00.000Z',
  }));
}

function toAuctionPlayers(
  pool: RegisteredPool,
  playerById: Map<string, Player>,
): CpuShillAuctionPlayer[] {
  const percentiles = computeIvPercentiles(pool.players);
  return pool.players.map((poolPlayer) => {
    const player = playerById.get(poolPlayer.id);
    if (!player) throw new Error(`Missing player ${poolPlayer.id}`);
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

function shillTeamId(seed: string): string {
  return `__auction_shill__auction-collapse-${seed}__1`;
}

function buildSession(input: {
  seedSpec: SeedSpec;
  lever: Lever;
  pool: RegisteredPool;
  teams: readonly Team[];
  auctionPlayers: readonly CpuShillAuctionPlayer[];
}): CpuShillAuctionSession {
  const shillId = shillTeamId(input.seedSpec.seed);
  const initialBudget = input.pool.tierCap * input.lever.budgetMultiplier;
  const profiles: Record<string, CpuShillProfile> = {};
  input.teams.forEach((team, index) => {
    profiles[team.id] = buildClubCpuProfile({
      teamId: team.id,
      leagueId: `auction-collapse-${input.seedSpec.seed}`,
      bandPriorities: archetypeBandPriorities(input.seedSpec.archetypes[index]),
      archetypeId: input.seedSpec.archetypes[index].id,
    });
  });
  profiles[shillId] = {
    ...buildArchetypeShillProfile(shillId, `auction-collapse-${input.seedSpec.seed}:shill-archetype`),
    shillMaxWins: SIZING_TUNING.winsPerShill,
  };
  const teamInputs = [...input.teams.map((team) => team.id), shillId].map((teamId) => ({
    teamId,
    budgetRemaining: initialBudget,
    rosterSlotsRemaining: ROSTER_SIZE,
    minSalary: LEAGUE_MINIMUM_SALARY,
    roster: [],
  }));
  return {
    ...(initAuctionSession({
      teams: teamInputs,
      players: input.auctionPlayers,
      nominationOrder: teamInputs.map((team) => team.teamId),
      sessionId: `auction-collapse-${input.seedSpec.seed}`,
      // Counterfactuals must replay the identical nomination order. Lever identity is deliberately
      // absent from both session identity and launch nonce.
      sessionLaunchNonce: input.seedSpec.seed,
      config: {
        nominationOrderSeed: `auction-collapse:${input.seedSpec.seed}`,
        bidIncrement: DEFAULT_AUCTION_BID_INCREMENT,
        reserveFractionK: DEFAULT_RESERVE_PRICE_K,
        nominationWeightExponent: 2,
        cpuShillCount: 0,
        excludeFromLeague: true,
        nonCompletingTeamIds: [shillId],
      },
    }) as CpuShillAuctionSession),
    cpuShills: profiles,
  };
}

function scaledCaps(caps: readonly LuxuryCapRow[], scale: number): LuxuryCapRow[] {
  return caps.map((row) => ({ ...row, cap: row.cap * scale }));
}

function buildTaxContext(
  pool: RegisteredPool,
  teams: readonly Team[],
  players: readonly Player[],
  lever: Lever,
): TaxContext {
  return {
    poolById: new Map(pool.players.map((player) => [player.id, player])),
    playerById: new Map(players.map((player) => [player.id, player])),
    identityByTeamId: new Map(teams.map((team) => [team.id, team.capIdentity])),
    baseCaps: scaledCaps(pool.luxuryCaps, lever.capScale),
  };
}

function applyTaxLever(
  session: CpuShillAuctionSession,
  context: TaxContext,
  lever: Lever,
  shillId: string,
): CpuShillAuctionSession {
  const projected = applyAuctionLuxuryTaxForLot(session, context);
  return {
    ...projected,
    teams: projected.teams.map((team) => ({
      ...team,
      projectedTax: lever.shillTaxExempt && team.teamId === shillId
        ? 0
        : team.projectedTax * lever.taxMultiplier,
    })),
  };
}

function cpuDecisionSeed(session: CpuShillAuctionSession, kind: 'bid' | 'claim', teamId: string): string {
  const lot = session.currentLot;
  return [
    session.config.nominationOrderSeed,
    'preview',
    kind,
    session.results.length,
    teamId,
    lot?.playerId ?? session.pendingClaim?.playerId ?? 'no-player',
    lot?.highBid ?? 'open',
    lot?.stillIn.join('-') ?? 'resolve',
  ].join(':');
}

function transitionOrThrow(result: AuctionTransitionResult): CpuShillAuctionSession {
  if (!result.ok) throw new Error(result.reason);
  return result.session as CpuShillAuctionSession;
}

function constructionRoster(
  session: CpuShillAuctionSession,
  teamId: string,
  constructionById: ReadonlyMap<string, ConstructionPlayer>,
): ConstructionPlayer[] {
  const team = session.teams.find((candidate) => candidate.teamId === teamId);
  if (!team) return [];
  return team.roster
    .map((assignment) => constructionById.get(assignment.playerId))
    .filter((player): player is ConstructionPlayer => Boolean(player));
}

function capsForTeam(
  teamId: string,
  taxContext: TaxContext,
): LuxuryCapRow[] {
  const identity = taxContext.identityByTeamId.get(teamId);
  return identity ? shiftLuxuryCaps(taxContext.baseCaps, identity) : [...taxContext.baseCaps];
}

function completionTaxRead(input: {
  session: CpuShillAuctionSession;
  teamId: string;
  constructionById: ReadonlyMap<string, ConstructionPlayer>;
  taxContext: TaxContext;
  lever: Lever;
  shillId: string;
}): { canonical: number; salaryReserve: number } {
  const team = input.session.teams.find((candidate) => candidate.teamId === input.teamId);
  const lot = input.session.currentLot;
  if (!team || !lot || team.rosterSlotsRemaining <= 0 || input.teamId === input.shillId) {
    return { canonical: 0, salaryReserve: 0 };
  }
  const candidate = input.constructionById.get(lot.playerId);
  if (!candidate) return { canonical: 0, salaryReserve: 0 };
  const rosterShapes = team.roster
    .map((assignment) => input.session.players[assignment.playerId]?.pos)
    .filter((shape): shape is RosterSlotPlayer => Boolean(shape));
  const candidateShape = input.session.players[lot.playerId]?.pos;
  if (!candidateShape || rosterShapes.length !== team.roster.length) return { canonical: 0, salaryReserve: 0 };
  const openSlotsAfterWin = Math.max(0, team.rosterSlotsRemaining - 1);
  const pool: CompletionCandidate[] = input.session.availablePlayerIds.map((playerId) => ({
    id: playerId,
    price: Math.max(LEAGUE_MINIMUM_SALARY, lotOpeningAsk(input.session.players[playerId], input.session.config)),
    shape: input.session.players[playerId].pos!,
  })).filter((entry) => Boolean(entry.shape));
  const quote = cheapestLegalCompletion([...rosterShapes, candidateShape], pool, openSlotsAfterWin);
  if (!quote.feasible) return { canonical: 0, salaryReserve: openSlotsAfterWin * team.minSalary };
  const completionPlayers = quote.pickIds
    .map((playerId) => input.constructionById.get(playerId))
    .filter((player): player is ConstructionPlayer => Boolean(player));
  if (completionPlayers.length !== quote.pickIds.length) return { canonical: 0, salaryReserve: quote.cost };
  const currentRoster = [...constructionRoster(input.session, input.teamId, input.constructionById), candidate];
  const caps = capsForTeam(input.teamId, input.taxContext);
  const currentTax = luxuryTax(currentRoster, caps, 'taxed').charged;
  const completedTax = luxuryTax([...currentRoster, ...completionPlayers], caps, 'taxed').charged;
  const canonical = Math.max(0, completedTax - currentTax) * input.lever.taxMultiplier;
  return { canonical, salaryReserve: quote.cost };
}

function bindingRows(
  session: CpuShillAuctionSession,
  teamId: string,
  constructionById: ReadonlyMap<string, ConstructionPlayer>,
  taxContext: TaxContext,
): string[] {
  return luxuryTax(
    constructionRoster(session, teamId, constructionById),
    capsForTeam(teamId, taxContext),
    'taxed',
  ).binding.map((row) => `${row.group}/${row.stat}`);
}

function buildLotStart(input: {
  session: CpuShillAuctionSession;
  lot: number;
  initialBudget: number;
  lever: Lever;
  shillId: string;
  constructionById: ReadonlyMap<string, ConstructionPlayer>;
  taxContext: TaxContext;
}): LotObservation {
  const lot = input.session.currentLot;
  if (!lot) throw new Error('Missing surfaced lot');
  const teams: LotTeamObservation[] = input.session.teams.map((team) => {
    const ceiling = sessionBidCeiling(input.session, team.teamId) ?? 0;
    const decision = cpuBidOnLot(
      input.session,
      team.teamId,
      cpuDecisionSeed(input.session, 'bid', team.teamId),
      { needAwareCompletion: true },
    );
    const cpuMaxBid = decision.maxBid;
    const completion = completionTaxRead({
      session: input.session,
      teamId: team.teamId,
      constructionById: input.constructionById,
      taxContext: input.taxContext,
      lever: input.lever,
      shillId: input.shillId,
    });
    const appliedCompletionTax = 0;
    const stateReserve = team.teamId === input.shillId
      ? 0
      : Math.max(0, team.budgetRemaining - team.projectedTax - ceiling);
    const completionSalaryReserve = Math.max(
      stateReserve,
      decision.liquidity?.minimumFutureFillReserve ?? 0,
    );
    const maxBid = cpuMaxBid ?? ceiling;
    const salarySpent = team.roster.reduce((sum, assignment) => sum + assignment.salary, 0);
    const rawCashSpent = input.initialBudget - team.budgetRemaining;
    const economicCeiling = Math.max(
      0,
      team.budgetRemaining - team.projectedTax - completionSalaryReserve - appliedCompletionTax,
    );
    return {
      teamId: team.teamId,
      role: team.teamId === input.shillId ? 'shill' : 'club',
      rosterSize: team.roster.length,
      budgetRemaining: team.budgetRemaining,
      projectedTax: team.projectedTax,
      solvencyCeiling: ceiling,
      cpuMaxBid,
      couldBid: team.rosterSlotsRemaining > 0 && maxBid >= lot.openingAsk,
      didBid: false,
      rawCashSpent,
      salarySpent,
      taxSpent: rawCashSpent - salarySpent,
      completionSalaryReserve,
      // The live cpuBidOnLot path does not pass completionTaxContext into evaluateLiquidityAwareBid.
      // Keep the applied component explicit and separately report the canonical latent amount.
      completionTaxApplied: appliedCompletionTax,
      completionTaxCanonical: completion.canonical,
      candidateMarginalTax: team.projectedTax,
      valuationOrRoundingGap: Math.max(0, economicCeiling - maxBid),
      bindingRows: bindingRows(input.session, team.teamId, input.constructionById, input.taxContext),
    };
  });
  return {
    lot: input.lot,
    playerId: lot.playerId,
    openingAsk: lot.openingAsk,
    willingBidders: teams.filter((team) => team.couldBid).length,
    actualBidders: 0,
    raises: 0,
    disposition: 'SET_ASIDE',
    winnerTeamId: null,
    clearingPrice: null,
    teams,
  };
}

function finishLot(
  start: LotObservation,
  beforeFinalization: CpuShillAuctionSession,
  afterFinalization: CpuShillAuctionSession,
): LotObservation {
  const result = [...afterFinalization.results].reverse().find((row) => row.playerId === start.playerId);
  if (!result) throw new Error(`Missing result for lot ${start.lot}`);
  const bidLog = beforeFinalization.currentLot?.bidLog ?? afterFinalization.currentLot?.bidLog ?? [];
  const actualIds = new Set(
    bidLog
      .filter((entry) => entry.action === 'bid' || entry.action === 'claim')
      .map((entry) => entry.teamId),
  );
  const bidCount = bidLog.filter((entry) => entry.action === 'bid').length;
  return {
    ...start,
    actualBidders: actualIds.size,
    raises: Math.max(0, bidCount - 1),
    disposition: result.disposition,
    winnerTeamId: result.winnerTeamId,
    clearingPrice: result.salary,
    teams: start.teams.map((team) => ({ ...team, didBid: actualIds.has(team.teamId) })),
  };
}

function phaseLabel(lot: number): string {
  const start = Math.floor((lot - 1) / PHASE_SIZE) * PHASE_SIZE + 1;
  return `${start}-${start + PHASE_SIZE - 1}`;
}

function round(value: number, digits = 2): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function pct(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : round(numerator / denominator * 100, 1);
}

function summarizePhases(lots: readonly LotObservation[]): PhaseRow[] {
  const phases = new Map<string, LotObservation[]>();
  for (const lot of lots) {
    const key = phaseLabel(lot.lot);
    phases.set(key, [...(phases.get(key) ?? []), lot]);
  }
  return [...phases.entries()].map(([phase, rows]) => ({
    phase,
    lots: rows.length,
    avgWillingBidders: round(rows.reduce((sum, row) => sum + row.willingBidders, 0) / rows.length),
    pctTwoPlusWilling: pct(rows.filter((row) => row.willingBidders >= 2).length, rows.length),
    pctPassedZeroBids: pct(
      rows.filter((row) => row.disposition === 'PASSED' && row.actualBidders === 0).length,
      rows.length,
    ),
  }));
}

function collapseLot(lots: readonly LotObservation[]): number | null {
  for (let index = 0; index < lots.length; index += 1) {
    if (lots[index].willingBidders >= 2) continue;
    if (lots.slice(index).every((lot) => lot.willingBidders < 2)) return lots[index].lot;
  }
  return null;
}

function longestPre60Lockout(lots: readonly LotObservation[], teamId: string): number {
  let longest = 0;
  let current = 0;
  for (const lot of lots.filter((entry) => entry.lot <= 60)) {
    const team = lot.teams.find((entry) => entry.teamId === teamId);
    if (team && !team.couldBid) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

function firstSustainedLowWillingLot(lots: readonly LotObservation[], streakLength = 8): number | null {
  for (let index = 0; index <= lots.length - streakLength; index += 1) {
    if (lots.slice(index, index + streakLength).every((lot) => lot.willingBidders < 2)) {
      return lots[index].lot;
    }
  }
  return null;
}

function summarizeBindings(lots: readonly LotObservation[]): BindingPhaseRow[] {
  const phaseRows = new Map<string, LotObservation[]>();
  for (const lot of lots) {
    const phase = phaseLabel(lot.lot);
    phaseRows.set(phase, [...(phaseRows.get(phase) ?? []), lot]);
  }
  const output: BindingPhaseRow[] = [];
  for (const [phase, rows] of phaseRows) {
    const keys = new Set(rows.flatMap((lot) => lot.teams.flatMap((team) => team.bindingRows)));
    for (const key of keys) {
      const teamObservations = rows.reduce(
        (sum, lot) => sum + lot.teams.filter((team) => team.bindingRows.includes(key)).length,
        0,
      );
      const lotsWithAny = rows.filter((lot) => lot.teams.some((team) => team.bindingRows.includes(key))).length;
      output.push({
        phase,
        row: key,
        avgTeamsBindingPerLot: round(teamObservations / rows.length),
        pctLotsAnyTeamBinding: pct(lotsWithAny, rows.length),
      });
    }
  }
  return output.sort((left, right) => (
    Number.parseInt(left.phase, 10) - Number.parseInt(right.phase, 10)
    || right.avgTeamsBindingPerLot - left.avgTeamsBindingPerLot
    || left.row.localeCompare(right.row)
  ));
}

function finalTeamRows(
  session: CpuShillAuctionSession,
  lots: readonly LotObservation[],
  shillId: string,
): FinalTeamRow[] {
  return session.teams.map((team) => {
    const shapes = team.roster
      .map((assignment) => session.players[assignment.playerId]?.pos)
      .filter((shape): shape is RosterSlotPlayer => Boolean(shape));
    return {
      teamId: team.teamId,
      role: team.teamId === shillId ? 'shill' : 'club',
      rosterSize: team.roster.length,
      legal22: team.teamId === shillId ? null : shapes.length === ROSTER_SIZE && isLegalRoster(shapes),
      budgetRemaining: team.budgetRemaining,
      longestPre60Lockout: longestPre60Lockout(lots, team.teamId),
    };
  });
}

function runOne(seedSpec: SeedSpec, lever: Lever): RunResult {
  const { pool, players, constructionById } = buildPool(seedSpec);
  const teams = buildTeams(seedSpec);
  const playerById = new Map(players.map((player) => [player.id, player]));
  const auctionPlayers = toAuctionPlayers(pool, playerById);
  const shillId = shillTeamId(seedSpec.seed);
  const taxContext = buildTaxContext(pool, teams, players, lever);
  const initialBudget = pool.tierCap * lever.budgetMultiplier;
  let session = buildSession({ seedSpec, lever, pool, teams, auctionPlayers });
  let lotNumber = 0;
  let currentStart: LotObservation | null = null;
  let stall: string | null = null;
  const lots: LotObservation[] = [];
  const shillWins: ShillWin[] = [];
  let shillMinBudget = initialBudget;

  const applyTransition = (transition: () => AuctionTransitionResult): boolean => {
    const before = session;
    const result = transition();
    if (!result.ok) {
      stall = `${before.state}:${result.reason}`;
      session = result.session as CpuShillAuctionSession;
      return false;
    }
    session = result.session as CpuShillAuctionSession;
    if (currentStart) {
      const beforeCount = before.results.filter((row) => row.playerId === currentStart!.playerId).length;
      const afterCount = session.results.filter((row) => row.playerId === currentStart!.playerId).length;
      if (afterCount > beforeCount) {
        const finished = finishLot(currentStart, before, session);
        lots.push(finished);
        if (finished.winnerTeamId === shillId && finished.clearingPrice !== null) {
          const startShill = currentStart.teams.find((team) => team.teamId === shillId)!;
          const endShill = session.teams.find((team) => team.teamId === shillId)!;
          shillWins.push({
            lot: finished.lot,
            playerId: finished.playerId,
            salary: finished.clearingPrice,
            taxCharged: startShill.budgetRemaining - endShill.budgetRemaining - finished.clearingPrice,
            budgetBefore: startShill.budgetRemaining,
            budgetAfter: endShill.budgetRemaining,
          });
          shillMinBudget = Math.min(shillMinBudget, endShill.budgetRemaining);
        }
        currentStart = null;
      }
    }
    return true;
  };

  for (let step = 0; step < MAX_STEPS && session.state !== 'AUCTION_COMPLETE' && stall === null; step += 1) {
    if (session.state === 'NOMINATION') {
      if (!applyTransition(() => surfaceNextPlayer(session))) break;
      session = applyTaxLever(session, taxContext, lever, shillId);
      lotNumber += 1;
      currentStart = buildLotStart({
        session,
        lot: lotNumber,
        initialBudget,
        lever,
        shillId,
        constructionById,
        taxContext,
      });
    } else if (session.state === 'OPEN_BIDDING') {
      const bidder = getCurrentBidderTeamId(session);
      if (!bidder) {
        if (!applyTransition(() => resolveLot(session))) break;
        continue;
      }
      const decision = cpuBidOnLot(
        session,
        bidder,
        cpuDecisionSeed(session, 'bid', bidder),
        { needAwareCompletion: true },
      );
      if (decision.kind === 'bid') {
        if (!applyTransition(() => strandSafeBidTransition(session, bidder, decision.bid, true))) break;
      } else if (!applyTransition(() => passBid(session, bidder))) {
        break;
      }
    } else if (session.state === 'RESOLVE') {
      if (!session.pendingClaim) {
        if (!applyTransition(() => resolveLot(session))) break;
        continue;
      }
      const claimant = session.pendingClaim.teamId;
      const decision = cpuDecideLoneSurvivor(
        session,
        claimant,
        cpuDecisionSeed(session, 'claim', claimant),
        { needAwareCompletion: true },
      );
      if (decision.kind === 'claim') {
        if (!applyTransition(() => strandSafeClaimTransition(session, true))) break;
      } else if (!applyTransition(() => passLoneSurvivorOut(session))) {
        break;
      }
    } else if (session.state === 'SOLD' || session.state === 'PASSED') {
      if (!applyTransition(() => advanceLot(session))) break;
    } else {
      stall = `unexpected-state:${session.state}`;
    }
  }

  if (stall === null && session.state !== 'AUCTION_COMPLETE') stall = `step-limit:${session.state}`;
  const phases = summarizePhases(lots);
  const finalTeams = finalTeamRows(session, lots, shillId);
  const twoPlus = lots.filter((lot) => lot.willingBidders >= 2).length;
  const success = pct(twoPlus, lots.length) >= 70
    && finalTeams.filter((team) => team.role === 'club').every((team) => team.longestPre60Lockout <= 8)
    && shillMinBudget >= 0
    && finalTeams.filter((team) => team.role === 'club').every((team) => team.legal22 === true);
  return {
    seed: seedSpec.seed,
    lever: lever.id,
    leverLabel: lever.label,
    archetypes: seedSpec.archetypes.map((archetype) => archetype.name),
    poolSize: pool.players.length,
    initialBudget,
    completed: session.state === 'AUCTION_COMPLETE',
    stall,
    lots,
    phases,
    collapseLot: collapseLot(lots),
    sustainedCollapseLot: firstSustainedLowWillingLot(lots),
    pctTwoPlusWilling: pct(twoPlus, lots.length),
    finalTeams,
    shillWins,
    shillMinBudget,
    success,
    bindingByPhase: summarizeBindings(lots),
  };
}

export function runAuctionCollapseDiagnosis(): DiagnosisOutput {
  const rawRuns = LEVERS.flatMap((lever) => SEEDS.map((seedSpec) => runOne(seedSpec, lever)));
  const runs = rawRuns.map((run): DiagnosisSummaryRun => {
    const diagnosticLot = run.collapseLot ?? run.sustainedCollapseLot;
    const collapse = diagnosticLot === null ? null : run.lots.find((lot) => lot.lot === diagnosticLot) ?? null;
    const { lots: _lots, ...summary } = run;
    return {
      ...summary,
      bindingByPhase: run.lever === 'baseline' ? summary.bindingByPhase : [],
      collapseLockedTeams: collapse?.teams.filter((team) => !team.couldBid) ?? [],
    };
  });
  return {
    generatedBy: 'scripts/auctionCollapseDiagnosis.test.ts',
    settings: {
      tier: TIER,
      realTeams: REAL_TEAM_COUNT,
      shills: 1,
      rosterSize: ROSTER_SIZE,
      baseBudget: BASE_BUDGET,
      poolMultiplier: DEFAULT_POOL_SIZE_MULTIPLIER,
      poolQualityCenter: DEFAULT_POOL_QUALITY_CENTER,
      reserveK: DEFAULT_RESERVE_PRICE_K,
      shillMaxWins: SIZING_TUNING.winsPerShill,
    },
    runs,
    ...(VERBOSE ? { lots: rawRuns } : {}),
  };
}

describe('auction collapse diagnosis (measurement only)', () => {
  maybeTest('reproduces the 4-club + 1-shill collapse and measures six one-at-a-time levers', () => {
    const output = runAuctionCollapseDiagnosis();
    const baseline = output.runs.filter((run) => run.lever === 'baseline');
    expect(baseline).toHaveLength(3);
    expect(output.runs).toHaveLength(LEVERS.length * SEEDS.length);
    expect(output.runs.every((run) => run.phases.length > 0)).toBe(true);
    expect(output.runs.every((run) => run.finalTeams.filter((team) => team.role === 'club').length === 4)).toBe(true);
    const deterministicReplay = runOne(SEEDS[0], LEVERS[0]);
    const firstBaseline = output.runs.find((run) => run.seed === SEEDS[0].seed && run.lever === 'baseline')!;
    expect(deterministicReplay.phases).toEqual(firstBaseline.phases);
    expect(deterministicReplay.shillWins).toEqual(firstBaseline.shillWins);
    const completionTaxControl = output.runs.filter((run) => run.lever === 'completion-tax-off');
    for (const control of completionTaxControl) {
      const baselineRun = output.runs.find((run) => run.seed === control.seed && run.lever === 'baseline')!;
      expect(control.phases).toEqual(baselineRun.phases);
      expect(control.shillWins).toEqual(baselineRun.shillWins);
      expect(control.finalTeams).toEqual(baselineRun.finalTeams);
    }
    console.info('AUCTION_COLLAPSE_DIAG_RESULT');
    const leverAggregates = LEVERS.map((lever) => {
      const rows = output.runs.filter((run) => run.lever === lever.id);
      const phaseNames = [...new Set(rows.flatMap((run) => run.phases.map((phase) => phase.phase)))];
      return {
        lever: lever.id,
        pctTwoPlusWillingBySeed: rows.map((run) => [run.seed, run.pctTwoPlusWilling]),
        successBySeed: rows.map((run) => [run.seed, run.success]),
        completedBySeed: rows.map((run) => [run.seed, run.completed]),
        phaseTable: phaseNames.map((phaseName) => {
          const phaseRows = rows.map((run) => run.phases.find((phase) => phase.phase === phaseName)).filter(Boolean) as PhaseRow[];
          const lots = phaseRows.reduce((sum, phase) => sum + phase.lots, 0);
          const weighted = (field: 'avgWillingBidders' | 'pctTwoPlusWilling' | 'pctPassedZeroBids') => round(
            phaseRows.reduce((sum, phase) => sum + phase[field] * phase.lots, 0) / Math.max(1, lots),
            1,
          );
          return [
            phaseName,
            lots,
            weighted('avgWillingBidders'),
            weighted('pctTwoPlusWilling'),
            weighted('pctPassedZeroBids'),
          ];
        }),
      };
    });
    const baselineBindingRows = output.runs
      .filter((run) => run.lever === 'baseline')
      .flatMap((run) => run.bindingByPhase);
    const baselineBindingTop = [...new Set(baselineBindingRows.map((row) => row.phase))].flatMap((phase) => {
      const aggregate = new Map<string, { sum: number; count: number }>();
      const phaseRunCount = output.runs.filter((run) => (
        run.lever === 'baseline' && run.phases.some((candidate) => candidate.phase === phase)
      )).length;
      for (const row of baselineBindingRows.filter((candidate) => candidate.phase === phase)) {
        const current = aggregate.get(row.row) ?? { sum: 0, count: 0 };
        current.sum += row.avgTeamsBindingPerLot;
        current.count += 1;
        aggregate.set(row.row, current);
      }
      return [...aggregate.entries()]
        // A row absent from a seed bound zero teams there, so divide by every baseline run that
        // reached the phase rather than only the runs where the row appeared.
        .map(([row, values]) => [phase, row, round(values.sum / Math.max(1, phaseRunCount))] as const)
        .sort((left, right) => right[2] - left[2])
        .slice(0, 4);
    });
    const printable = COMPACT ? {
      settings: output.settings,
      leverAggregates,
      runs: output.runs.map((run) => ({
        seed: run.seed,
        lever: run.lever,
        completed: run.completed,
        stall: run.stall,
        collapseLot: run.collapseLot,
        sustainedCollapseLot: run.sustainedCollapseLot,
        pctTwoPlusWilling: run.pctTwoPlusWilling,
        success: run.success,
        shillMinBudget: round(run.shillMinBudget),
        shillWinCount: run.shillWins.length,
        ...(run.lever === 'baseline' ? {
          archetypes: run.archetypes,
          phases: run.phases.map((phase) => [
            phase.phase,
            phase.lots,
            phase.avgWillingBidders,
            phase.pctTwoPlusWilling,
            phase.pctPassedZeroBids,
          ]),
          finalTeams: run.finalTeams.map((team) => [
            team.teamId,
            team.role,
            team.rosterSize,
            team.legal22,
            round(team.budgetRemaining),
            team.longestPre60Lockout,
          ]),
          ...(run.seed === 'collapse-c' ? {
            shillWins: run.shillWins.map((win) => ({ ...win, taxCharged: round(win.taxCharged), budgetAfter: round(win.budgetAfter) })),
          } : {}),
          collapseLockedTeams: run.collapseLockedTeams,
        } : {}),
      })),
      baselineBindingTop,
    } : output;
    console.info(JSON.stringify(printable, null, 2));
  }, DIAG_TIMEOUT_MS);

  maybeSearchTest('searches deterministic production-default seeds for collapse reproductions', () => {
    const baseline = LEVERS[0];
    const results = Array.from({ length: SEARCH_COUNT }, (_, index) => {
      const start = index % HISTORICAL_ARCHETYPES.length;
      const seedSpec: SeedSpec = {
        seed: `search-${String(index).padStart(2, '0')}`,
        archetypes: [0, 6, 12, 18].map((offset) => HISTORICAL_ARCHETYPES[(start + offset) % HISTORICAL_ARCHETYPES.length]),
      };
      const run = runOne(seedSpec, baseline);
      return {
        seed: run.seed,
        archetypes: run.archetypes,
        lots: run.lots.length,
        firstEightLotCollapse: firstSustainedLowWillingLot(run.lots),
        collapseLot: run.collapseLot,
        pctTwoPlusWilling: run.pctTwoPlusWilling,
        shillWins: run.shillWins.length,
        shillMinBudget: round(run.shillMinBudget),
        shillLastWin: run.shillWins.at(-1) ?? null,
        success: run.success,
      };
    });
    console.info('AUCTION_COLLAPSE_SEED_SEARCH');
    console.info(JSON.stringify(results, null, 2));
    expect(results).toHaveLength(SEARCH_COUNT);
  }, DIAG_TIMEOUT_MS);
});
