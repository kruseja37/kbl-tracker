import { LEAGUE_MINIMUM_SALARY } from '../data/rosterEngineConstants';
import {
  LEGAL_ROSTER,
  canCover,
  canRelieve,
  canStart,
  depthReport,
  isCloser,
  isLegalRoster,
  type FieldPosition,
  type RosterSlotPlayer,
} from '../data/rosterConstruction';
import {
  CHEMISTRY_CODES,
  CHEMISTRY_CODE_TO_WORD,
  normalizeToChemistryCode,
  type ChemistryCode,
} from '../data/chemistryCanonical';
import { TRAIT_PRICING } from '../data/traitPricing';
import {
  computeOwnValue,
  computeOwnValueFactors,
  estimateMarket,
  type ArchetypeLiftTable,
  type EstimatedMarket,
  type MarketLotView,
} from './auctionMarketModel';
import type { Band, BandPriorities } from './leagueConstruction';
import {
  completionBidCeiling,
  type CompletionCandidate,
} from './auctionCompletionFloor';
import {
  rosterNeedBreakdown,
  wouldStrandRoster,
  type RosterNeedBreakdown,
  type RosterPositionMap,
} from './rosterNeed';
import {
  chemistryAdviceForCandidate,
  chemistryProfileForPlayers,
} from '../utils/chemistryIntelligence';
import type { Player } from '../utils/leagueBuilderStorage';
import {
  identityEmbodiment,
  type SimArchetype,
  type SimPlayer,
} from './archetypeBalanceSimulator';
import type { TierKey } from '../data/tierParams';
import type {
  ChemistryCrossing,
  ChemistryTipBreakdown,
  FamilyChemistryProfile,
} from './chemistryTierValue';

export type LightStatus = 'green' | 'amber' | 'red' | 'unknown';

export interface Light {
  status: LightStatus;
  sentence: string;
  detailKey?: string;
}

export interface FiveLights {
  shape: Light;
  identity: Light;
  chemistry: Light;
  balance: Light;
  budget: Light;
}

export interface MarketRead {
  playerId: string;
  band: EstimatedMarket['band'];
  interestedTeams: number;
  contested: EstimatedMarket['contested'];
  likelyPass: boolean;
}

export interface WorthToYou {
  iv: number;
  ownValue: number;
  archetypeFitMultiplier: number;
  needMultiplier: number;
  chemistry: ChemistryTipBreakdown;
  chemistryContribution: number;
  chemistryReadout: ChemistryReadout;
  verdict: 'push' | 'cap' | 'pass';
  recommendedNumber: number;
  capValue: number | null;
  handedness?: null;
}

export interface ChemistryReadoutFamily {
  family: ChemistryCode;
  word: string;
  count: number;
  tier: 'L1' | 'L2' | 'L3';
  distanceToNextTier: number | null;
  nextTierLabel: 'L2' | 'L3' | null;
  isCandidateFamily: boolean;
}

export interface ChemistryReadoutCandidate {
  family: ChemistryCode;
  word: string;
  countAfter: number;
  crossing: ChemistryCrossing | null;
  distanceToNextTierAfter: number | null;
}

export interface ChemistryReadout {
  families: ReadonlyArray<ChemistryReadoutFamily>;
  candidate: ChemistryReadoutCandidate;
}

export interface BoardEntry {
  playerId: string;
  worth: number;
  matchedShape: string | null;
  needTag: string | null;
  fitTag: 'IDENTITY' | null;
  note?: string;
}

export interface RosterIntelligencePayload {
  seatTeamId: string;
  generatedAtLotIndex?: number;
  market?: MarketRead;
  worthToYou?: WorthToYou;
  board?: BoardEntry[];
  scorecard?: FiveLights;
}

/**
 * All C4 payload thresholds live here so Fable/Opus can retune without hunting through branch logic.
 */
export const PAYLOAD_TUNING = {
  /** PUSH requires the completion ceiling to clear the market median by 10%. */
  worthPushMedianMargin: 0.1,
  /** PASS when iv + chemistry premium is under 95% of the public market low edge. */
  worthPassLowBandFraction: 0.95,
  /** A candidate can push only when iv + chemistry premium reaches at least 95% of median. */
  worthMarketJustificationFraction: 0.95,
  /** Budget green means the ceiling still has two league-minimum salaries of insurance. */
  budgetInsuranceBuffer: LEAGUE_MINIMUM_SALARY * 2,
  /** Budget amber means the ceiling can at least reach the public median read. */
  budgetTightHeadroom: 0,
  /** Chemistry red requires exposed L1 negative traits to outnumber positive L2+ traits. */
  chemistryExposureOutweighsPositiveBy: 1,
  /** Identity provisional band cuts around existing identityEmbodiment boostZ. */
  identityGreenBoostZ: 0.35,
  identityAmberBoostZ: 0,
} as const;

export interface WorthToYouInput {
  candidate: Player;
  iv: number;
  rosterPlayers: readonly Player[];
  budgetRemaining: number;
  rosterWithCandidate: readonly RosterSlotPlayer[];
  remainingPool: readonly CompletionCandidate[];
  openSlotsAfterWin: number;
  ownBandPriorities: BandPriorities;
  archetypeWeights: Partial<Record<Band, number>> | undefined;
  needBreakdown: RosterNeedBreakdown | null;
  candidateShape: RosterSlotPlayer | null;
  market?: MarketRead | null;
}

export interface BoardCandidate {
  playerId: string;
  iv: number;
  candidate?: Player;
  chemistry?: ChemistryTipBreakdown;
  matchedShape?: string | null;
  shape?: RosterSlotPlayer;
  identityZ?: number;
  note?: string;
}

export interface BoardInput {
  candidates: readonly BoardCandidate[];
  rosterPlayers: readonly Player[];
  need?: RosterNeedBreakdown;
}

export interface ShapeLightInput {
  players: readonly RosterSlotPlayer[];
  rosterIds?: readonly string[];
  candidateId?: string;
  positionMap?: RosterPositionMap;
}

export interface BudgetLightInput {
  budgetRemaining: number;
  rosterWithCandidate: readonly RosterSlotPlayer[];
  remainingPool: readonly CompletionCandidate[];
  openSlotsAfterWin: number;
  market?: MarketRead | null;
}

export interface IdentityLightInput {
  rosterPlayers: readonly SimPlayer[];
  archetype: SimArchetype;
  tier: TierKey;
  comparisonPool: readonly SimPlayer[];
}

export interface FiveLightsInput {
  shapePlayers: readonly RosterSlotPlayer[];
  chemistryPlayers: readonly Player[];
  shape?: Omit<ShapeLightInput, 'players'>;
  budget?: BudgetLightInput;
  identity?: IdentityLightInput;
}

export interface RosterIntelligencePayloadInput {
  seatTeamId: string;
  generatedAtLotIndex?: number;
  market?: MarketRead;
  worthToYou?: WorthToYou;
  board?: readonly BoardEntry[];
  scorecard?: FiveLights;
}

export function marketReadFromEstimate(view: MarketLotView, table: ArchetypeLiftTable): MarketRead {
  const market = estimateMarket(view, table);
  return {
    playerId: market.playerId,
    band: market.band,
    interestedTeams: market.interestedTeams,
    contested: market.contested,
    likelyPass: market.likelyPass,
  };
}

export function assembleWorthToYou(input: WorthToYouInput): WorthToYou {
  const chemistry = chemistryAdviceForCandidate(input.candidate, input.rosterPlayers);
  const chemistryReadout = buildChemistryReadout(
    chemistryProfileForPlayers(input.rosterPlayers),
    chemistry,
  );
  const factors = computeOwnValueFactors({
    archetypeWeights: input.archetypeWeights,
    ownBandPriorities: input.ownBandPriorities,
    needBreakdown: input.needBreakdown,
    shape: input.candidateShape,
    openSlots: input.openSlotsAfterWin,
  });
  const ownValue = computeOwnValue({
    iv: input.iv,
    archetypeWeights: input.archetypeWeights,
    ownBandPriorities: input.ownBandPriorities,
    needBreakdown: input.needBreakdown,
    shape: input.candidateShape,
    openSlots: input.openSlotsAfterWin,
  });
  const capValue = completionBidCeiling(
    input.budgetRemaining,
    input.rosterWithCandidate,
    input.remainingPool,
    input.openSlotsAfterWin,
  );
  const chemistryContribution = Math.max(0, chemistry.premium);
  const worth = ownValue + chemistryContribution;
  const recommendedNumber = Math.max(0, Math.min(worth, capValue ?? worth));
  const verdict = worthVerdict(worth, capValue, input.market ?? null);
  return {
    iv: input.iv,
    ownValue,
    archetypeFitMultiplier: factors.archetypeFitMultiplier,
    needMultiplier: factors.needMultiplier,
    chemistry,
    chemistryContribution,
    chemistryReadout,
    verdict,
    recommendedNumber,
    capValue,
  };
}

export function buildChemistryReadout(
  profile: readonly FamilyChemistryProfile[],
  chemistry: ChemistryTipBreakdown,
): ChemistryReadout {
  const byFamily = new Map(profile.map((row) => [row.family, row]));
  return {
    families: CHEMISTRY_CODES.map((family) => {
      const row = byFamily.get(family);
      const tier = row?.tier ?? 'L1';
      return {
        family,
        word: familyWord(family),
        count: row?.count ?? 0,
        tier,
        distanceToNextTier: row ? row.distanceToNextTier : 3,
        nextTierLabel: nextTierLabel(tier),
        isCandidateFamily: family === chemistry.family,
      };
    }),
    candidate: {
      family: chemistry.family,
      word: familyWord(chemistry.family),
      countAfter: chemistry.countsAfter[chemistry.family] ?? 0,
      crossing: chemistry.crossing,
      distanceToNextTierAfter: chemistry.distanceToNextTier,
    },
  };
}

export function assembleBoard(input: BoardInput): BoardEntry[] {
  return input.candidates
    .map((candidate) => {
      const chemistry = candidate.chemistry ??
        (candidate.candidate
          ? chemistryAdviceForCandidate(candidate.candidate, input.rosterPlayers)
          : null);
      return {
        playerId: candidate.playerId,
        worth: candidate.iv + (chemistry?.premium ?? 0),
        matchedShape: candidate.matchedShape ?? null,
        needTag: boardNeedTag(candidate.shape, input.need),
        fitTag: boardFitTag(candidate.identityZ),
        ...(candidate.note ? { note: candidate.note } : {}),
      };
    })
    .sort((a, b) =>
      Number(Boolean(b.needTag)) - Number(Boolean(a.needTag)) ||
      Number(Boolean(b.fitTag)) - Number(Boolean(a.fitTag)) ||
      b.worth - a.worth ||
      a.playerId.localeCompare(b.playerId),
    );
}

function boardNeedTag(shape: RosterSlotPlayer | undefined, need: RosterNeedBreakdown | undefined): string | null {
  if (!shape || !need) return null;
  const missingPrimary = need.missingPrimaries.find((pos) => shape.position === pos);
  if (missingPrimary) return `FILLS ${missingPrimary}`;
  if (need.catcherCoverNeed > 0 && canCover(shape, 'C')) return 'CATCHER COVER';
  if (shape.isPitcher && need.rotationDeficit > 0 && canStart(shape)) return 'ROTATION';
  if (shape.isPitcher && need.closerDeficit > 0 && isCloser(shape)) return 'CLOSER';
  if (shape.isPitcher && Math.max(0, need.bullpenDeficit - need.closerDeficit) > 0 && canRelieve(shape)) return 'BULLPEN';
  if (!shape.isPitcher && need.hitterFloorNeed > 0) return 'BENCH BAT';
  if (shape.isPitcher && need.pitcherFloorNeed > 0) return 'STAFF DEPTH';
  return null;
}

function boardFitTag(identityZ: number | undefined): BoardEntry['fitTag'] {
  return identityZ !== undefined && identityZ >= PAYLOAD_TUNING.identityGreenBoostZ ? 'IDENTITY' : null;
}

export function assembleFiveLights(input: FiveLightsInput): FiveLights {
  return {
    shape: shapeLight({
      players: input.shapePlayers,
      rosterIds: input.shape?.rosterIds,
      candidateId: input.shape?.candidateId,
      positionMap: input.shape?.positionMap,
    }),
    identity: identityLight(input.identity),
    chemistry: chemistryLight(input.chemistryPlayers),
    balance: balanceLight(),
    budget: input.budget ? budgetLight(input.budget) : unknownBudgetLight(),
  };
}

export function assembleRosterIntelligencePayload(
  input: RosterIntelligencePayloadInput,
): RosterIntelligencePayload {
  return {
    seatTeamId: input.seatTeamId,
    ...(input.generatedAtLotIndex !== undefined ? { generatedAtLotIndex: input.generatedAtLotIndex } : {}),
    ...(input.market ? { market: input.market } : {}),
    ...(input.worthToYou ? { worthToYou: input.worthToYou } : {}),
    ...(input.board ? { board: [...input.board] } : {}),
    ...(input.scorecard ? { scorecard: input.scorecard } : {}),
  };
}

function worthVerdict(
  contextualWorth: number,
  capValue: number | null,
  market: MarketRead | null,
): WorthToYou['verdict'] {
  // Without a market read we cannot prove a bargain: no affordable ceiling passes, any positive
  // ceiling is a hard cap, and push remains reserved for market-justified bargains.
  if (capValue === null) return 'pass';
  if (!market) return capValue === null || capValue <= 0 ? 'pass' : 'cap';

  if (capValue < market.band.low) return 'pass';
  if (contextualWorth < market.band.low * PAYLOAD_TUNING.worthPassLowBandFraction) return 'pass';

  const comfortableCeiling = market.band.median * (1 + PAYLOAD_TUNING.worthPushMedianMargin);
  const justified = contextualWorth >= market.band.median * PAYLOAD_TUNING.worthMarketJustificationFraction;
  if (capValue >= comfortableCeiling && justified) return 'push';

  return 'cap';
}

function shapeLight(input: ShapeLightInput): Light {
  const players = [...input.players];
  const need = rosterNeedBreakdown(players);
  const stranded = input.rosterIds && input.candidateId && input.positionMap
    ? wouldStrandRoster(input.rosterIds, input.candidateId, input.positionMap)
    : false;

  if (!isLegalRoster(players) || need.infeasible || stranded) {
    const gap = nearestShapeGap(need);
    return {
      status: 'red',
      sentence: stranded
        ? 'That move strands the roster before you can field a legal club.'
        : `${gap} is still short of a legal roster.`,
      detailKey: 'shape',
    };
  }

  const thin = depthReport(players).thinPositions;
  const exact = exactMinimumGap(players);
  if (exact || thin.length > 0) {
    const thinText = thin.length > 0 ? `${baseballList(thin)} is thin` : exact;
    return {
      status: 'amber',
      sentence: `${thinText}; one injury can turn this into a roster problem.`,
      detailKey: 'shape',
    };
  }

  return {
    status: 'green',
    sentence: 'This roster has legal starters, playable depth, and room for one bad break.',
    detailKey: 'shape',
  };
}

function nearestShapeGap(need: ReturnType<typeof rosterNeedBreakdown>): string {
  if (need.missingPrimaries.length > 0) return `${baseballList(need.missingPrimaries)} primary coverage`;
  if (need.catcherCoverNeed > 0) return 'backup catcher coverage';
  if (need.rotationDeficit > 0) return 'rotation depth';
  if (need.closerDeficit > 0) return 'closer depth';
  if (need.bullpenDeficit > 0) return 'bullpen depth';
  if (need.hitterFloorNeed > 0) return 'bench depth';
  if (need.pitcherFloorNeed > 0) return 'pitching depth';
  return 'Roster shape';
}

function exactMinimumGap(players: readonly RosterSlotPlayer[]): string | null {
  if (players.filter((p) => canCover(p, 'C')).length === LEGAL_ROSTER.minCatchers) {
    return 'catcher depth is exactly at the minimum';
  }
  if (players.filter(canStart).length === LEGAL_ROSTER.startingPitchers) {
    return 'rotation depth is exactly at the minimum';
  }
  if (players.filter(canRelieve).length === LEGAL_ROSTER.minRelievers) {
    return 'bullpen depth is exactly at the minimum';
  }
  return null;
}

function chemistryLight(players: readonly Player[]): Light {
  const profile = chemistryProfileForPlayers(players);
  const traitPressure = chemistryTraitPressure(players, profile);
  const opportunity = nearestChemistryOpportunity(profile);

  if (
    traitPressure.negativeL1 >=
    traitPressure.positiveL2Plus + PAYLOAD_TUNING.chemistryExposureOutweighsPositiveBy
  ) {
    return {
      status: 'red',
      sentence: `${traitPressure.negativeL1} negative traits are exposed at Level 1; ${opportunity}.`,
      detailKey: 'chemistry',
    };
  }

  if (!traitPressure.hasL2PlusFamily || traitPressure.negativeL1 > 0) {
    return {
      status: 'amber',
      sentence: `${opportunity}.`,
      detailKey: 'chemistry',
    };
  }

  return {
    status: 'green',
    sentence: `${opportunity}.`,
    detailKey: 'chemistry',
  };
}

function chemistryTraitPressure(
  players: readonly Player[],
  profile: readonly FamilyChemistryProfile[],
): { negativeL1: number; positiveL2Plus: number; hasL2PlusFamily: boolean } {
  const tierByFamily = new Map(profile.map((row) => [row.family, row.tier]));
  let negativeL1 = 0;
  let positiveL2Plus = 0;
  for (const player of players) {
    for (const traitName of [player.trait1, player.trait2]) {
      if (!traitName) continue;
      const priced = TRAIT_PRICING.find((entry) => entry.name === traitName);
      if (!priced) continue;
      const family = normalizeToChemistryCode(priced.chemistry);
      const tier = tierByFamily.get(family) ?? 'L1';
      if (priced.polarity === 'negative' && tier === 'L1') negativeL1 += 1;
      if (priced.polarity === 'positive' && tier !== 'L1') positiveL2Plus += 1;
    }
  }
  return {
    negativeL1,
    positiveL2Plus,
    hasL2PlusFamily: profile.some((row) => row.tier !== 'L1'),
  };
}

function nearestChemistryOpportunity(profile: readonly FamilyChemistryProfile[]): string {
  const reachable = profile
    .filter((row) => row.distanceToNextTier !== null)
    .sort((a, b) => (a.distanceToNextTier ?? 0) - (b.distanceToNextTier ?? 0) || a.family.localeCompare(b.family))[0];
  if (!reachable || reachable.distanceToNextTier === null) {
    return 'Every chemistry family is already at its top trait tier';
  }
  const familyName = familyWord(reachable.family);
  const noun = reachable.distanceToNextTier === 1 ? 'bat' : 'bats';
  const verb = reachable.distanceToNextTier === 1 ? 'puts' : 'put';
  const target = reachable.tier === 'L1' ? 'doubles' : 'triples';
  return `${reachable.distanceToNextTier} more ${familyName} ${noun} ${verb} ${familyName} traits at the ${target} tier`;
}

function budgetLight(input: BudgetLightInput): Light {
  const capValue = completionBidCeiling(
    input.budgetRemaining,
    input.rosterWithCandidate,
    input.remainingPool,
    input.openSlotsAfterWin,
  );
  if (capValue === null) {
    return {
      status: 'red',
      sentence: 'The finish quote is infeasible from the players left.',
      detailKey: 'budget',
    };
  }
  const target = input.market?.band.median ?? 0;
  const headroom = capValue - target;
  if (headroom >= PAYLOAD_TUNING.budgetInsuranceBuffer) {
    return {
      status: 'green',
      sentence: 'You can meet this price and still insure the finish.',
      detailKey: 'budget',
    };
  }
  if (headroom >= PAYLOAD_TUNING.budgetTightHeadroom) {
    return {
      status: 'amber',
      sentence: 'You can meet the median read, but the finish gets tight.',
      detailKey: 'budget',
    };
  }
  return {
    status: 'red',
    sentence: 'The median read traps the rest of the roster.',
    detailKey: 'budget',
  };
}

function unknownBudgetLight(): Light {
  return {
    status: 'unknown',
    sentence: 'Budget read needs a completion quote.',
    detailKey: 'budget',
  };
}

function identityLight(input: IdentityLightInput | undefined): Light {
  if (!input) {
    // TODO(IDENTITY): wire the caller's chosen archetype + comparison pool when C4-B/C4-C pass it.
    return { status: 'unknown', sentence: 'Identity read coming.' };
  }

  const report = identityEmbodiment(
    [...input.rosterPlayers],
    input.archetype,
    input.tier,
    [...input.comparisonPool],
  );
  if (report.boostZ >= PAYLOAD_TUNING.identityGreenBoostZ) {
    return {
      status: 'green',
      sentence: 'This roster is visibly leaning into the chosen identity.',
      detailKey: 'identity',
    };
  }
  if (report.boostZ >= PAYLOAD_TUNING.identityAmberBoostZ) {
    return {
      status: 'amber',
      sentence: 'This roster is close to the chosen identity, but the edge is thin.',
      detailKey: 'identity',
    };
  }
  return {
    status: 'red',
    sentence: 'This roster is drifting away from the chosen identity.',
    detailKey: 'identity',
  };
}

function balanceLight(): Light {
  // TODO(BALANCE): pending Fable HANDEDNESS-SIGNAL constants spec.
  return { status: 'unknown', sentence: 'Balance read coming.' };
}

function baseballList(items: readonly FieldPosition[]): string {
  if (items.length === 0) return 'Roster';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function nextTierLabel(tier: 'L1' | 'L2' | 'L3'): ChemistryReadoutFamily['nextTierLabel'] {
  if (tier === 'L1') return 'L2';
  if (tier === 'L2') return 'L3';
  return null;
}

function familyWord(family: ChemistryCode): string {
  return CHEMISTRY_CODE_TO_WORD[family];
}
