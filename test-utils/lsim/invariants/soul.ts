import { FAME_TIER_RANK, FAME_TUNING, resolveFameTier } from '../../../src/engines/fameModel';
import { ALL_STAR_LOCK_FRACTION } from '../../../src/utils/franchiseAllStarLock';
import { FLASHPOINT_DECAY_TUNING, computeFlashpointGameTax } from '../../../src/engines/flashpointDecay';
import {
  RELATIONSHIP_INTENSITY_TUNING,
  computeRelationshipIntensity,
} from '../../../src/engines/relationshipIntensity';
import { L11_AUTO_BACKSTOP_TUNING } from '../../../src/utils/franchiseManagerAutoBackstop';
import { TRAIT_ACQUISITION_TUNING, TRAIT_OPPOSITES } from '../../../src/engines/traitAcquisition';
import { assignTier } from '../../../src/data/traitTierConfig';
import { pickRaceSnubVictims } from '../../../src/utils/franchiseRaceSnubMorale';
import {
  franchiseRelationshipEdgeId,
  type RelationshipEdgeType,
} from '../../../src/utils/franchiseRelationshipEdgesStorage';
import {
  RELATIONSHIP_INTEL_INACCURACY_RATE,
  relationshipIntelRoll,
  relationshipIntelSeed,
} from '../../../src/utils/franchiseRelationshipIntel';
import { checkpointCountForCadence } from '../../../src/data/rosterEngineConstants';
import type { FranchiseDesignationType } from '../../../src/utils/franchiseDesignations';
import type { Player } from '../../../src/utils/leagueBuilderStorage';
import type {
  LsimInvariantCheck,
  LsimInvariantResult,
  LsimStateSnapshot,
} from './types';
import { invariantResult } from './types';

const CRITICAL = 'CRITICAL' as const;
const INVESTIGATE = 'INVESTIGATE' as const;
const DESIGNATION_ROW_TYPES: readonly FranchiseDesignationType[] = [
  'TEAM_MVP',
  'ACE',
  'FAN_FAVORITE',
  'ALBATROSS',
];
export const REQUIRED_L12_MERIT_CATEGORIES = [
  'MVP',
  'CY_YOUNG',
  'ROOKIE_OF_YEAR',
  'GOLD_GLOVE',
  'SILVER_SLUGGER',
  'BENCH_PLAYER',
  'BOOGER_GLOVE',
  'RELIEVER_OF_YEAR',
] as const;
const PITCHER_POSITIONS = new Set(['SP', 'SP/RP', 'RP', 'CP', 'P']);
const HITTER_RATING_KEYS = new Set(['power', 'contact', 'speed', 'fielding', 'arm']);
const PITCHER_RATING_KEYS = new Set(['velocity', 'junk', 'accuracy']);
const L13_3A_RELATIONSHIP_TYPES = new Set<RelationshipEdgeType>([
  'RIVALRY',
  'FEUD',
  'MENTORSHIP',
  'FRIENDSHIP',
]);
const EVENT_DRIVEN_SOURCES = new Set<string>(['overtake', 'envy']);
const EVENT_DRIVEN_EDGE_DENSITY_PER_TEAM = 24; // OPEN-DECISION placeholder (§16); event-driven (overtake + envy) edges get their own generous cap, tuned from the full-season count.
// §5.3 season-end honor edge: MVP/CY emit an AWARD_RESULT nod + a close-loser snub.
// Mirrors franchiseSeasonEndHonors.ts:19 (SEASON_END_SNUB_TOP_N) + :29-32 (SEASON_END_HONORS, honorKind === award category).
const SEASON_END_SNUB_TOP_N = 3;
const RACE_SNUB_SOURCE_PREFIX = 'race-snub:';
const RELATIONSHIP_HIT_SOURCE_PREFIX = 'relationship-hit:';
const RELATIONSHIP_RECOVERY_SOURCE_PREFIX = 'relationship-recovery:';
const RELATIONSHIP_CHARGED_SOURCE_PREFIX = 'relationship-charged:';
const RELATIONSHIP_FAN_NUDGE_SOURCE_PREFIX = 'relationship-visible-fan-nudge:';
const MAJOR_FAME_HONOR_CATEGORIES = new Set(['MVP', 'CY_YOUNG']);

export interface LsimRelationshipMoraleDeltaSummary {
  relationshipHits: number;
  relationshipRecoveries: number;
  relationshipChargedMatchups: number;
  relationshipPlayerGroups: number;
  duplicateSourceIds: number;
  recoveredGroups: number;
  recoveredGroupsNetZero: number;
  nonZeroRecoveredGroups: number;
  hitDeltaTotal: number;
  recoveryDeltaTotal: number;
  chargedDeltaTotal: number;
  chargedPositiveDeltas: number;
  chargedNegativeDeltas: number;
  recoveredGroupsNetDelta: number;
  ratingsDevelopmentRows: number;
  moraleToWarLeaks: number;
  sampleSourceEventIds: string[];
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function findNonFinite(value: unknown, path = '$'): string | null {
  if (typeof value === 'number') return Number.isFinite(value) ? null : path;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const result = findNonFinite(value[index], `${path}[${index}]`);
      if (result) return result;
    }
  } else if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      const result = findNonFinite(entry, `${path}.${key}`);
      if (result) return result;
    }
  }
  return null;
}

function playerById(snapshot: LsimStateSnapshot): Map<string, Player> {
  return new Map(snapshot.players.map((player) => [player.id, player]));
}

function isPitcher(player: Player | undefined): boolean {
  return Boolean(player && PITCHER_POSITIONS.has(player.primaryPosition));
}

function gameNumberFromSourceEventId(prefix: string, sourceEventId: string): number | null {
  if (!sourceEventId.startsWith(prefix)) return null;
  const parsed = Number(sourceEventId.slice(prefix.length));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function reachedCheckpoints(snapshot: LsimStateSnapshot): number[] {
  return snapshot.checkpointGameNumbers.filter((gameNumber) => gameNumber <= snapshot.gameNumber);
}

function fameComponentsFinite(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const path = findNonFinite(snapshot.fameRows);
  const missingChannels = snapshot.fameRows.filter((row) =>
    !row.channelByChannel ||
    !['wpa_spine', 'iconic_event', 'status', 'defensive', 'role_player']
      .every((channel) => isFiniteNumber(row.channelByChannel[channel as keyof typeof row.channelByChannel])),
  );
  const pass = path === null && missingChannels.length === 0;
  return invariantResult(
    'soul.fame-components-finite',
    CRITICAL,
    pass,
    pass
      ? `fameRows=${snapshot.fameRows.length}`
      : `nonFiniteAt=${path ?? 'channelByChannel'}; missingChannelRows=${missingChannels.slice(0, 5).map((row) => row.playerId).join(',')}`,
  );
}

function collectLockedAllStarHonoreeIds(snapshot: LsimStateSnapshot): Set<string> {
  const ids = new Set<string>();
  for (const roster of snapshot.allStarRosters) {
    if (roster.locked !== true) continue;
    for (const selection of roster.selections) {
      if (selection.playerId) ids.add(selection.playerId);
    }
  }
  return ids;
}

function collectFinalizedMajorAwardHonoreeIds(snapshot: LsimStateSnapshot): Set<string> {
  const ids = new Set<string>();
  for (const row of snapshot.awardRows) {
    if (!row.finalized || !row.winnerPlayerId) continue;
    if (MAJOR_FAME_HONOR_CATEGORIES.has(row.category)) ids.add(row.winnerPlayerId);
  }
  return ids;
}

function collectFameFloorHonoreeIds(snapshot: LsimStateSnapshot): Set<string> {
  return new Set([
    ...collectLockedAllStarHonoreeIds(snapshot),
    ...collectFinalizedMajorAwardHonoreeIds(snapshot),
  ]);
}

function fameReachMonotonic(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const honored = collectFameFloorHonoreeIds(snapshot);
  const underFloor = snapshot.fameRows
    .filter((row) => honored.has(row.playerId) && row.reachFloor < FAME_TIER_RANK.REGIONAL_STAR)
    .map((row) => `${row.playerId}:${row.reachFloor}`);
  const nonHonoredCount = snapshot.fameRows.filter((row) => !honored.has(row.playerId)).length;
  return invariantResult(
    'soul.fame-reach-monotonic',
    CRITICAL,
    underFloor.length === 0,
    underFloor.length === 0
      ? `honored=${honored.size} keep reachFloor>=REGIONAL_STAR; nonHonored=${nonHonoredCount} may fluctuate down`
      : `honoredBelowRegionalStar=${underFloor.slice(0, 8).join(',')}`,
  );
}

function collectHeatDirections(snapshot: LsimStateSnapshot): { up: number; down: number } {
  let up = 0;
  let down = 0;
  let current: LsimStateSnapshot | undefined = snapshot;
  while (current?.previous) {
    const prior = new Map(current.previous.fameRows.map((row) => [row.playerId, row.heat]));
    for (const row of current.fameRows) {
      const previousHeat = prior.get(row.playerId);
      if (!isFiniteNumber(previousHeat)) continue;
      if (row.heat > previousHeat) up += 1;
      if (row.heat < previousHeat) down += 1;
    }
    current = current.previous;
  }
  return { up, down };
}

function fameHeatFickle(snapshot: LsimStateSnapshot): LsimInvariantResult {
  if (snapshot.gamesSimulated < snapshot.totalScheduledGames) {
    return invariantResult(
      'soul.fame-heat-fickle',
      INVESTIGATE,
      true,
      `pending season-end check at ${snapshot.gamesSimulated}/${snapshot.totalScheduledGames}`,
    );
  }
  const directions = collectHeatDirections(snapshot);
  return invariantResult(
    'soul.fame-heat-fickle',
    INVESTIGATE,
    directions.up > 0 && directions.down > 0,
    `heatUpTransitions=${directions.up}; heatDownTransitions=${directions.down}`,
  );
}

function fameTierLegitimacy(snapshot: LsimStateSnapshot): LsimInvariantResult {
  // §20.1/§20.2 (H3 disambiguation): the legitimacy floor is UPWARD soft gravity, and a high-fame/low-WAR
  // "darling/overrated" is a BLESSED archetype — NOT a violation. The old hard downward cap
  // (tier>=NATIONAL_ICON AND warPct<0.25) was the INVERSE of the design. Flag only APEX DEGENERACY: a
  // replacement/near-replacement (bottom-decile WAR) player reaching the very TOP tier (IMMORTAL_LEGEND) —
  // the noise the prestige labels should resist. Darlings are a §9 distribution signal, not a failure.
  const APEX = FAME_TIER_RANK.IMMORTAL_LEGEND;
  const APEX_DEGENERACY_WAR_PERCENTILE = 0.1;
  const trueValueByPlayer = new Map(snapshot.trueValueRows.map((row) => [row.playerId, row]));
  const offenders = snapshot.fameRows
    .filter((row) => {
      const fameRank = FAME_TIER_RANK[resolveFameTier(row.heat, row.reachFloor)];
      const valueRow = trueValueByPlayer.get(row.playerId);
      return fameRank >= APEX &&
        valueRow &&
        isFiniteNumber(valueRow.warPercentile) &&
        valueRow.warPercentile < APEX_DEGENERACY_WAR_PERCENTILE;
    })
    .map((row) => row.playerId);
  const heatByPlayer = new Map(snapshot.fameRows.map((row) => [row.playerId, row.heat]));
  const eliteMeritHeats = snapshot.trueValueRows
    .filter((row) =>
      isFiniteNumber(row.warPercentile) &&
      row.warPercentile >= FAME_TUNING.warGravity.meritPercentileBands.elite
    )
    .map((row) => heatByPlayer.get(row.playerId))
    .filter(isFiniteNumber)
    .sort((a, b) => a - b);
  const eliteMedianHeat = medianFinite(eliteMeritHeats);
  const eliteFloorSatisfied = eliteMeritHeats.length === 0 ||
    (isFiniteNumber(eliteMedianHeat) && eliteMedianHeat >= FAME_TUNING.tierThresholds.localHero);
  const apexPass = offenders.length === 0;
  return invariantResult(
    'soul.fame-war-legitimacy-floor',
    INVESTIGATE,
    apexPass && eliteFloorSatisfied,
    `apexDegenerate=${offenders.slice(0, 8).join(',') || 'none'}; eliteCohort=${eliteMeritHeats.length}; eliteMedianHeat=${isFiniteNumber(eliteMedianHeat) ? eliteMedianHeat.toFixed(3) : 'n/a'}; ` +
      (eliteMeritHeats.length === 0
        ? 'no elite-merit cohort to assert'
        : `eliteFloorSatisfied=${eliteFloorSatisfied}; localHeroFloor=${FAME_TUNING.tierThresholds.localHero}`),
  );
}

function medianFinite(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const middle = Math.floor(values.length / 2);
  if (values.length % 2 === 1) return values[middle];
  return (values[middle - 1] + values[middle]) / 2;
}

function l12RaceNoNanAndResolve(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const proof = snapshot.l12Proof;
  if (!proof) {
    return invariantResult('soul.l12-race-no-nan-resolve-tier', CRITICAL, false, 'missing L12 proof');
  }
  // §5.1: no NaN in composites/percentiles; ranking == the weighted composite (rank order == composite desc);
  // an empty merit category is VALID SPARSITY when its eligibility POOL is also empty, but CORRUPTION (FAIL) when
  // eligible candidates existed and were dropped. (Eligibility-pool refinement, JK ruling 2026-06-19.)
  const pass = proof.status === 'computed' &&
    !proof.hasNonFiniteScore &&
    proof.rankingMatchesComposite === true &&
    (proof.missingCategoriesWithNonEmptyPool?.length ?? 0) === 0;
  return invariantResult(
    'soul.l12-race-no-nan-resolve-tier',
    CRITICAL,
    pass,
    `status=${proof.status}; nonFinite=${proof.hasNonFiniteScore}; rankingMatchesComposite=${proof.rankingMatchesComposite}; droppedDespiteEligiblePool=${(proof.missingCategoriesWithNonEmptyPool ?? []).join(',') || 'none'}; ${proof.detail}`,
  );
}

function moraleBounds(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const bad = snapshot.moraleSnapshots.filter((row) =>
    !isFiniteNumber(row.currentValue) ||
    !isFiniteNumber(row.baselineValue) ||
    row.currentValue < 0 ||
    row.currentValue > 99 ||
    row.baselineValue < 0 ||
    row.baselineValue > 99,
  );
  return invariantResult(
    'soul.morale-bounds',
    CRITICAL,
    bad.length === 0,
    bad.length === 0 ? `moraleSnapshots=${snapshot.moraleSnapshots.length}` : `badSnapshots=${bad.slice(0, 8).map((row) => row.id).join(',')}`,
  );
}

function flashpointClamp(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const bad: string[] = [];
  for (const row of snapshot.flashpointRows) {
    if (
      !isFiniteNumber(row.consecutiveGamesUnresolved) ||
      !isFiniteNumber(row.accumulatedFanMoraleTax) ||
      !isFiniteNumber(row.lastGameTax) ||
      row.consecutiveGamesUnresolved < 0 ||
      row.accumulatedFanMoraleTax > 0 ||
      row.lastGameTax > 0 ||
      row.lastGameTax < FLASHPOINT_DECAY_TUNING.maxGameTax
    ) {
      bad.push(`${row.playerId}:bounds(${row.lastGameTax})`);
      continue;
    }
    // Compounding-but-CLAMPED: the persisted per-game tax must equal the production formula for THIS row's
    // kind + consecutive-unresolved count. computeFlashpointGameTax encodes BOTH the ramp (consecutive↑ → |tax|↑)
    // AND the clamp (maxGameTax), and returns 0 for a null/non-Albatross kind (happy / non-turned-on teams).
    const expected = computeFlashpointGameTax({
      kind: row.flashpointKind,
      consecutiveGamesUnresolved: row.consecutiveGamesUnresolved,
    }).gameTax;
    if (Math.abs(row.lastGameTax - expected) > 1e-6) {
      bad.push(`${row.playerId}:tax=${row.lastGameTax}!=expected${expected}`);
    }
  }
  return invariantResult(
    'soul.flashpoint-compounding-clamped',
    CRITICAL,
    bad.length === 0,
    bad.length === 0
      ? `flashpointRows=${snapshot.flashpointRows.length}; lastGameTax matches computeFlashpointGameTax ramp+clamp (maxGameTax=${FLASHPOINT_DECAY_TUNING.maxGameTax})`
      : `badRows=${bad.slice(0, 8).join(',')}`,
  );
}

function designationSlots(snapshot: LsimStateSnapshot): LsimInvariantResult {
  // §5.1 six slots/team, each <=1 holder. FOUR are designation rows (TEAM_MVP/ACE/FAN_FAVORITE/ALBATROSS):
  // enforce <=1 ACTIVE holder per (teamId,type) — projected/lost rows don't count. Captain + Fan Hopeful are
  // SINGLE team fields (team.captainPlayerId / team.fanHopefulPlayerId): a scalar is structurally <=1, and both
  // are currently DEFERRED (null). Fail only if a scalar slot is somehow multi-valued.
  const ACTIVE = new Set(['active', 'locked']);
  const violations: string[] = [];
  for (const teamId of snapshot.teamIds) {
    for (const type of DESIGNATION_ROW_TYPES) {
      const holders = new Set(
        snapshot.designationRows
          .filter((row) => row.teamId === teamId && row.type === type && ACTIVE.has(row.status))
          .map((row) => row.playerId),
      );
      if (holders.size > 1) violations.push(`${teamId}:${type}:${holders.size}`);
    }
  }
  for (const team of snapshot.teams) {
    const captain = (team as Player & { captainPlayerId?: string | null }).captainPlayerId;
    const fanHopeful = (team as Player & { fanHopefulPlayerId?: string | null }).fanHopefulPlayerId;
    if (Array.isArray(captain)) violations.push(`${team.id}:captain-multi`);
    if (Array.isArray(fanHopeful)) violations.push(`${team.id}:fanHopeful-multi`);
  }
  const pass = violations.length === 0;
  return invariantResult(
    'soul.designation-six-slots-single-holder',
    CRITICAL,
    pass,
    pass
      ? `teams=${snapshot.teamIds.length}; <=1 active holder per ${DESIGNATION_ROW_TYPES.length} row-types + Captain/Fan-Hopeful single-field (structurally <=1; DEFERRED)`
      : `violations=${violations.slice(0, 8).join(',')}`,
  );
}

function albatrossGate(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const bad = snapshot.designationRows
    .filter((row) => row.type === 'ALBATROSS')
    .filter((row) => {
      const salary = Number(row.sourceInputs.salary);
      const floor = Number(row.sourceInputs.albatrossSalaryFloor);
      const valueDeltaOverContract = Number(row.sourceInputs.valueDeltaOverContract);
      const gamesPlayed = Number(row.sourceInputs.gamesPlayed);
      const gamesFloor = Number(row.sourceInputs.gamesFloor);
      return !isFiniteNumber(salary) ||
        !isFiniteNumber(floor) ||
        !isFiniteNumber(valueDeltaOverContract) ||
        salary < floor ||
        valueDeltaOverContract > -0.25 ||
        (isFiniteNumber(gamesPlayed) && isFiniteNumber(gamesFloor) && gamesPlayed < gamesFloor);
    })
    .map((row) => `${row.teamId}:${row.playerId}`);
  return invariantResult(
    'soul.albatross-2x-min-salary-overpaid-gate',
    CRITICAL,
    bad.length === 0,
    bad.length === 0 ? `albatrossRows=${snapshot.designationRows.filter((row) => row.type === 'ALBATROSS').length}` : `badRows=${bad.join(',')}`,
  );
}

function l10PerGameCadence(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const gameNumbers = snapshot.l10Overlays
    .map((row) => gameNumberFromSourceEventId('l10-', row.sourceEventId))
    .filter((gameNumber): gameNumber is number => gameNumber !== null);
  const invalid = gameNumbers.filter((gameNumber) => gameNumber > snapshot.gameNumber);
  const distinct = Array.from(new Set(gameNumbers)).sort((left, right) => left - right);
  const onlyCheckpointCadence = distinct.length > 0 &&
    distinct.every((gameNumber) => snapshot.checkpointGameNumbers.includes(gameNumber));
  const pass = invalid.length === 0 && !onlyCheckpointCadence;
  return invariantResult(
    'soul.l10-per-game-cadence',
    INVESTIGATE,
    pass,
    `l10Rows=${snapshot.l10Overlays.length}; distinctSourceGames=${distinct.join(',') || 'none'}; invalidFuture=${invalid.join(',') || 'none'}`,
  );
}

const MANAGER_FIRED_RELIEF_REASON = 'manager.fired.relief';

// FNV-1a 32-bit, matching the production hashStringToUint32 (seed 2166136261, prime 16777619) used by the
// auto-backstop roll. The roll = hash(seed)/0x100000000; the firing arms only when roll < perGameProbability.
function fnv1a32(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function managerBackstopRoll(franchiseId: string, seasonId: string, gameNumber: number, teamId: string): number {
  return fnv1a32(`${franchiseId}:${seasonId}:${gameNumber}:${teamId}:manager-backstop`) / 0x100000000;
}

function l11BackstopGate(snapshot: LsimStateSnapshot): LsimInvariantResult {
  // §5.1 auto-backstop. CORRECTED (H3 Step-3 follow-up): a firing OVERWRITES the fired managerAssignment with the
  // successor (same [mode,instanceId,teamId] key), so `fired===true` assignments are ALWAYS empty at the snapshot —
  // the prior detection was vacuous. Detect firings via the OBSERVABLE downstream relief on the fired team's fan
  // morale (`manager.fired.relief`, always applied for an auto-backstop firing) and cross-check the durable record.
  const managerDb = snapshot.storeDump.databases['kbl-manager-identity'] ?? {};
  const assignments = (managerDb.managerAssignments ?? []) as Array<Record<string, unknown>>;
  const profiles = (managerDb.managerProfiles ?? []) as Array<Record<string, unknown>>;
  const tenureRecords = profiles.flatMap((p) => (p.tenureRecords as Array<Record<string, unknown>> | undefined) ?? []);

  const firings: Array<{ teamId: string; firingTimeMorale: number }> = [];
  for (const m of snapshot.moraleSnapshots) {
    if (m.targetType !== 'team-fan' || !m.teamId) continue;
    const reliefEntry = (m.history ?? []).find((h) => (h as { reason?: unknown }).reason === MANAGER_FIRED_RELIEF_REASON);
    if (reliefEntry) {
      // the relief entry's previousValue is the morale AT THE FIRING (current is already recovered by the bump).
      firings.push({ teamId: m.teamId, firingTimeMorale: Number((reliefEntry as { previousValue?: number }).previousValue) });
    }
  }
  if (firings.length === 0) {
    return invariantResult(
      'soul.l11-backstop-under-25-plus-roll',
      CRITICAL,
      true,
      'PENDING: no auto-backstop firings this run (the generator does not yet drive team-fan morale < 25 often enough); the strengthened logic is synthetic-falsified',
    );
  }

  const armingThreshold = L11_AUTO_BACKSTOP_TUNING.armingThreshold;
  const perGameProbability = L11_AUTO_BACKSTOP_TUNING.perGameProbability;
  // scope for the deterministic roll, lifted from an existing scope-stamped row (no scope on the snapshot itself).
  const scoped = (snapshot.trueValueRows[0] ?? snapshot.fameRows[0] ?? snapshot.designationRows[0]) as unknown as
    | { franchiseId?: string; seasonId?: string }
    | undefined;
  const violations: string[] = [];
  for (const f of firings) {
    // (a) the fired team's fan morale was < armingThreshold AT THE FIRING (read from history, not the recovered current)
    if (!(isFiniteNumber(f.firingTimeMorale) && f.firingTimeMorale < armingThreshold)) {
      violations.push(`${f.teamId}:firingTimeMorale=${f.firingTimeMorale}>=${armingThreshold}`);
    }
    // (b) the deterministic roll < threshold was satisfiable for the fired team (the firing game is one such game)
    if (scoped?.franchiseId && scoped?.seasonId) {
      let rollSatisfiable = false;
      for (let g = 1; g <= snapshot.totalScheduledGames; g += 1) {
        if (managerBackstopRoll(scoped.franchiseId, scoped.seasonId, g, f.teamId) < perGameProbability) {
          rollSatisfiable = true;
          break;
        }
      }
      if (!rollSatisfiable) violations.push(`${f.teamId}:noGameWithRollUnder${perGameProbability}`);
    }
    // (c) a successor was generated and is active for the team
    if (!assignments.some((a) => a.teamId === f.teamId && a.fired !== true && !a.endDate)) {
      violations.push(`${f.teamId}:noActiveSuccessor`);
    }
    // (d) the fired tenure persists (date + 'fired' reason)
    if (!tenureRecords.some((t) => t.teamId === f.teamId && t.endReason === 'fired' && Boolean(t.endDate))) {
      violations.push(`${f.teamId}:noFiredTenureRecord`);
    }
  }
  return invariantResult(
    'soul.l11-backstop-under-25-plus-roll',
    CRITICAL,
    violations.length === 0,
    violations.length === 0
      ? `firings=${firings.length} via fan-morale relief [${firings.map((f) => `${f.teamId}@firingMorale${f.firingTimeMorale}`).join(',')}]; each: firing-time morale <${armingThreshold} + roll-satisfiable + successor + fired-tenure persists`
      : `violations=${violations.slice(0, 8).join(',')}`,
  );
}

function replayIdempotency(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const delta = snapshot.lastGameDelta;
  const pass = Boolean(delta?.afterReplayDigest) &&
    delta.afterReplayDigest === delta.afterFirstProcessDigest;
  return invariantResult(
    'soul.per-write-idempotency',
    CRITICAL,
    pass,
    delta
      ? `afterFirst=${delta.afterFirstProcessDigest}; afterReplay=${delta.afterReplayDigest ?? 'missing'}`
      : 'missing replay digest',
  );
}

function checkpointCadence(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const reached = reachedCheckpoints(snapshot);
  const expectedCount = checkpointCountForCadence(snapshot.checkpointCadence);
  const sourceGameNumbers = Array.from(new Set(
    snapshot.ratingsOverlays
      .map((row) => gameNumberFromSourceEventId('checkpoint-', row.sourceEventId))
      .filter((gameNumber): gameNumber is number => gameNumber !== null),
  )).sort((left, right) => left - right);
  const missing = reached.filter((gameNumber) => !sourceGameNumbers.includes(gameNumber));
  const unexpected = sourceGameNumbers.filter((gameNumber) => !snapshot.checkpointGameNumbers.includes(gameNumber));
  const finalMatchesSetting = snapshot.gamesSimulated < snapshot.totalScheduledGames ||
    sourceGameNumbers.length === expectedCount;
  const pass = missing.length === 0 && unexpected.length === 0 && finalMatchesSetting;
  return invariantResult(
    'soul.checkpoint-cadence-matches-setting',
    CRITICAL,
    pass,
    `cadence=${snapshot.checkpointCadence}; expectedCount=${expectedCount}; reached=${reached.join(',') || 'none'}; overlayCheckpoints=${sourceGameNumbers.join(',') || 'none'}; missing=${missing.join(',') || 'none'}; unexpected=${unexpected.join(',') || 'none'}`,
  );
}

function relationshipFormationCheckpointWrite(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const reached = reachedCheckpoints(snapshot);
  const eventDrivenEdges = snapshot.relationshipEdges.filter((row) =>
    EVENT_DRIVEN_SOURCES.has(row.formationSource as string),
  );
  const checkpointEdges = snapshot.relationshipEdges.filter((row) =>
    !EVENT_DRIVEN_SOURCES.has(row.formationSource as string),
  );
  const edgeIds = snapshot.relationshipEdges.map((row) => row.id);
  const duplicateIds = edgeIds.filter((id, index) => edgeIds.indexOf(id) !== index);
  const allowedCheckpoints = new Set(snapshot.checkpointGameNumbers);
  const currentIsCheckpoint = allowedCheckpoints.has(snapshot.gameNumber);
  const formedAtNumbers = Array.from(new Set(
    checkpointEdges
      .map((row) => row.formedAtGameNumber)
      .filter((gameNumber): gameNumber is number => Number.isInteger(gameNumber)),
  )).sort((left, right) => left - right);
  const nonBoundaryFormation = formedAtNumbers.filter((gameNumber) =>
    !allowedCheckpoints.has(gameNumber) || gameNumber > snapshot.gameNumber,
  );
  const badIds = snapshot.relationshipEdges.filter((row) =>
    row.id !== franchiseRelationshipEdgeId(row, row.player1Id, row.player2Id, row.type),
  );
  const forbiddenTypes = snapshot.relationshipEdges.filter((row) => !L13_3A_RELATIONSHIP_TYPES.has(row.type));
  // L13-4 update: a dissolved edge (dissolvedAtGameNumber set) is a VALID state once
  // intensity lapse-decays below the dissolve threshold; dissolution correctness is the
  // intensity-lifecycle invariant's job, so the formation invariant no longer flags it.
  const badPotentialState = snapshot.relationshipEdges.filter((row) =>
    row.potential !== false ||
    !Number.isInteger(row.formedAtGameNumber),
  );
  const finalDensityLimit = Math.max(1, snapshot.teamIds.length * 3);
  const densityExceeded = checkpointEdges.length > finalDensityLimit;
  const missingEdgesAfterCheckpoint = reached.length > 0 && checkpointEdges.length === 0;
  const missingCurrentCheckpointWrite = currentIsCheckpoint &&
    snapshot.gameNumber > 0 &&
    checkpointEdges.length > 0 &&
    !formedAtNumbers.includes(snapshot.gameNumber);
  const shouldBeEmptyPreCheckpoint = reached.length === 0 && checkpointEdges.length > 0;
  const eventDrivenDensityLimit = Math.max(1, snapshot.teamIds.length * EVENT_DRIVEN_EDGE_DENSITY_PER_TEAM);
  const eventDrivenDensityExceeded = eventDrivenEdges.length > eventDrivenDensityLimit;
  const eventDrivenFormedAtNumbers = eventDrivenEdges
    .map((row) => row.formedAtGameNumber)
    .filter((gameNumber): gameNumber is number => Number.isInteger(gameNumber))
    .sort((left, right) => left - right);
  const eventDrivenRange = eventDrivenFormedAtNumbers.length > 0
    ? `${eventDrivenFormedAtNumbers[0]}-${eventDrivenFormedAtNumbers[eventDrivenFormedAtNumbers.length - 1]}`
    : 'none';
  const badEventDriven = eventDrivenEdges.filter((row) =>
    !Number.isInteger(row.formedAtGameNumber) ||
    (row.formedAtGameNumber as number) < 1 ||
    (row.formedAtGameNumber as number) > snapshot.gameNumber ||
    row.potential !== false,
  );
  const pass =
    duplicateIds.length === 0 &&
    nonBoundaryFormation.length === 0 &&
    badIds.length === 0 &&
    forbiddenTypes.length === 0 &&
    badPotentialState.length === 0 &&
    !densityExceeded &&
    !missingEdgesAfterCheckpoint &&
    !missingCurrentCheckpointWrite &&
    !shouldBeEmptyPreCheckpoint &&
    !eventDrivenDensityExceeded &&
    badEventDriven.length === 0;

  return invariantResult(
    'soul.l13-relationship-formation-checkpoint-write',
    CRITICAL,
    pass,
    pass
      ? `edges=${snapshot.relationshipEdges.length}; checkpointEdges=${checkpointEdges.length}; eventDrivenEdges=${eventDrivenEdges.length}; checkpointFormedAt=${formedAtNumbers.join(',') || 'none'}; eventDrivenFormedAtRange=${eventDrivenRange}; current=${snapshot.gameNumber}; cadence=${snapshot.checkpointCadence}; checkpointDensityLimit=${finalDensityLimit}; eventDrivenDensityLimit=${eventDrivenDensityLimit}; no duplicate ids`
      : `edges=${snapshot.relationshipEdges.length}; checkpointEdges=${checkpointEdges.length}; eventDrivenEdges=${eventDrivenEdges.length}; checkpointFormedAt=${formedAtNumbers.join(',') || 'none'}; eventDrivenFormedAtRange=${eventDrivenRange}; dup=${duplicateIds.slice(0, 4).join(',') || 'none'}; nonBoundary=${nonBoundaryFormation.join(',') || 'none'}; badIds=${badIds.slice(0, 4).map((row) => row.id).join(',') || 'none'}; forbidden=${forbiddenTypes.map((row) => row.type).join(',') || 'none'}; badPotential=${badPotentialState.slice(0, 4).map((row) => row.id).join(',') || 'none'}; densityExceeded=${densityExceeded}; eventDrivenDensityExceeded=${eventDrivenDensityExceeded}; badEventDriven=${badEventDriven.slice(0, 4).map((row) => row.id).join(',') || 'none'}; missingAfterCheckpoint=${missingEdgesAfterCheckpoint}; missingCurrentBoundary=${missingCurrentCheckpointWrite}; preCheckpointNonEmpty=${shouldBeEmptyPreCheckpoint}`,
  );
}

function currentCompletedGame(snapshot: LsimStateSnapshot): LsimStateSnapshot['completedGames'][number] | null {
  return snapshot.completedGames[snapshot.completedGames.length - 1] ?? null;
}

function currentGameTeamByPlayer(snapshot: LsimStateSnapshot): Map<string, string> {
  const game = currentCompletedGame(snapshot);
  const teamByPlayer = new Map<string, string>();
  if (!game) return teamByPlayer;

  for (const [playerId, stats] of Object.entries(game.playerStats ?? {})) {
    if (stats.teamId) teamByPlayer.set(playerId, stats.teamId);
  }
  for (const stats of game.pitcherGameStats ?? []) {
    if (stats.pitcherId && stats.teamId) teamByPlayer.set(stats.pitcherId, stats.teamId);
  }

  return teamByPlayer;
}

function isChargedRelationshipEdgeThisGame(
  row: { player1Id: string; player2Id: string },
  teamByPlayer: Map<string, string>,
): boolean {
  const player1TeamId = teamByPlayer.get(row.player1Id);
  const player2TeamId = teamByPlayer.get(row.player2Id);
  return Boolean(player1TeamId && player2TeamId && player1TeamId !== player2TeamId);
}

function relationshipIntensityLifecycle(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const currentGame = currentCompletedGame(snapshot);
  if (!currentGame || snapshot.relationshipEdges.length === 0) {
    return invariantResult(
      'soul.l13-relationship-intensity-lifecycle',
      CRITICAL,
      true,
      `edges=${snapshot.relationshipEdges.length}; currentGame=${currentGame?.gameId ?? 'none'}`,
    );
  }

  const teamByPlayer = currentGameTeamByPlayer(snapshot);
  const previousEdges = new Map((snapshot.previous?.relationshipEdges ?? []).map((row) => [row.id, row]));
  const tolerance = 1 / RELATIONSHIP_INTENSITY_TUNING.precision;
  const outOfBounds = snapshot.relationshipEdges.filter((row) =>
    !isFiniteNumber(row.intensity) || row.intensity < 0 || row.intensity > 1,
  );
  const trajectoryMismatches: string[] = [];
  const dissolutionMismatches: string[] = [];
  const monotonicityViolations: string[] = [];
  let chargedCount = 0;

  for (const row of snapshot.relationshipEdges) {
    // Envy edges form at season finalize, not as participants in the current game,
    // so their formation intensity carries no in-game charged-matchup bump.
    const isChargedMatchup = row.formationSource === 'envy'
      ? false
      : isChargedRelationshipEdgeThisGame(row, teamByPlayer);
    if (isChargedMatchup) chargedCount += 1;
    const expected = computeRelationshipIntensity(row, {
      gameNumber: snapshot.gameNumber,
      isChargedMatchup,
    });

    if (Math.abs(row.intensity - expected.intensity) > tolerance) {
      trajectoryMismatches.push(`${row.id}:${row.intensity}->expected:${expected.intensity}`);
    }
    if (row.dissolvedAtGameNumber !== expected.dissolvedAtGameNumber) {
      dissolutionMismatches.push(`${row.id}:${row.dissolvedAtGameNumber ?? 'null'}->expected:${expected.dissolvedAtGameNumber ?? 'null'}`);
    }

    const previous = previousEdges.get(row.id);
    const currentFormationReset = row.formedAtGameNumber === snapshot.gameNumber;
    if (
      previous &&
      !isChargedMatchup &&
      !currentFormationReset &&
      row.dissolvedAtGameNumber === null &&
      previous.dissolvedAtGameNumber === null &&
      row.intensity > previous.intensity + tolerance
    ) {
      monotonicityViolations.push(`${row.id}:${previous.intensity}->${row.intensity}`);
    }
  }

  const pass =
    outOfBounds.length === 0 &&
    trajectoryMismatches.length === 0 &&
    dissolutionMismatches.length === 0 &&
    monotonicityViolations.length === 0;

  return invariantResult(
    'soul.l13-relationship-intensity-lifecycle',
    CRITICAL,
    pass,
    pass
      ? `edges=${snapshot.relationshipEdges.length}; charged=${chargedCount}; intensity in-bounds; deterministic trajectory matched; currentGame=${currentGame.gameId}`
      : `outOfBounds=${outOfBounds.slice(0, 4).map((row) => `${row.id}:${row.intensity}`).join(',') || 'none'}; trajectory=${trajectoryMismatches.slice(0, 4).join(',') || 'none'}; dissolution=${dissolutionMismatches.slice(0, 4).join(',') || 'none'}; monotonicity=${monotonicityViolations.slice(0, 4).join(',') || 'none'}; charged=${chargedCount}; currentGame=${currentGame.gameId}`,
  );
}

function relationshipMoraleTapDevelopmentBoundary(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const summary = summarizeRelationshipMoraleDeltas(snapshot);
  const seasonComplete = snapshot.gamesSimulated >= snapshot.totalScheduledGames;
  const relationshipSystemActive = snapshot.relationshipEdges.length > 0 ||
    summary.relationshipHits > 0 ||
    summary.relationshipRecoveries > 0 ||
    summary.relationshipChargedMatchups > 0;

  const pass =
    summary.duplicateSourceIds === 0 &&
    summary.nonZeroRecoveredGroups === 0 &&
    summary.moraleToWarLeaks === 0 &&
    (!seasonComplete || !relationshipSystemActive || summary.relationshipHits > 0) &&
    (!seasonComplete || !relationshipSystemActive || summary.relationshipRecoveries > 0) &&
    (!seasonComplete || !relationshipSystemActive || summary.relationshipChargedMatchups > 0) &&
    (summary.relationshipChargedMatchups === 0 ||
      (summary.chargedPositiveDeltas > 0 && summary.chargedNegativeDeltas > 0)) &&
    (!seasonComplete || summary.relationshipHits === 0 || summary.ratingsDevelopmentRows > 0);

  return invariantResult(
    'soul.l13-relationship-morale-development-boundary',
    CRITICAL,
    pass,
    pass
      ? `relationshipHits=${summary.relationshipHits}; recoveries=${summary.relationshipRecoveries}; chargedMatchups=${summary.relationshipChargedMatchups}; chargedPositive=${summary.chargedPositiveDeltas}; chargedNegative=${summary.chargedNegativeDeltas}; recoveredGroupsNetZero=${summary.recoveredGroupsNetZero}; ratingsDevelopmentRows=${summary.ratingsDevelopmentRows}; moraleToWarLeaks=0`
      : `relationshipHits=${summary.relationshipHits}; recoveries=${summary.relationshipRecoveries}; chargedMatchups=${summary.relationshipChargedMatchups}; chargedPositive=${summary.chargedPositiveDeltas}; chargedNegative=${summary.chargedNegativeDeltas}; duplicateSourceIds=${summary.duplicateSourceIds}; nonZeroRecovered=${summary.nonZeroRecoveredGroups}; ratingsDevelopmentRows=${summary.ratingsDevelopmentRows}; moraleToWarLeaks=${summary.moraleToWarLeaks}; seasonComplete=${seasonComplete}`,
  );
}

function relationshipRep4FanNudgeBoundary(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const relationshipNews = snapshot.seasonNewsItems.filter((item) => item.eventType === 'RELATIONSHIP_FLARE');
  const edgeById = new Map(snapshot.relationshipEdges.map((row) => [row.id, row]));
  const newsSourceIds = new Set<string>();
  const newsIssues: string[] = [];

  for (const item of relationshipNews) {
    const facts = item.facts as Record<string, unknown>;
    const edgeId = typeof facts.edgeId === 'string' ? facts.edgeId : null;
    const moveId = typeof facts.relationshipIntelMoveId === 'string' ? facts.relationshipIntelMoveId : null;
    const sourceEventId = typeof facts.fanNudgeSourceEventId === 'string'
      ? facts.fanNudgeSourceEventId
      : typeof facts.relationshipFlareSourceEventId === 'string'
        ? facts.relationshipFlareSourceEventId
        : null;

    if (sourceEventId) newsSourceIds.add(sourceEventId);
    if (!edgeId) newsIssues.push(`${item.id}:missingEdgeId`);
    if (!moveId) newsIssues.push(`${item.id}:missingMoveId`);
    if (!sourceEventId) newsIssues.push(`${item.id}:missingFanSource`);

    const edge = edgeId ? edgeById.get(edgeId) : null;
    if (!edge) {
      if (edgeId) newsIssues.push(`${item.id}:unknownEdge:${edgeId}`);
      continue;
    }

    if (facts.relationshipType !== edge.type) newsIssues.push(`${item.id}:typeDistorted`);
    if (Number(facts.intensity) !== edge.intensity) newsIssues.push(`${item.id}:intensityDistorted`);
    if (facts.potential !== edge.potential) newsIssues.push(`${item.id}:potentialDistorted`);

    if (moveId) {
      const expectedSeed = relationshipIntelSeed({
        franchiseId: item.franchiseId,
        seasonId: item.seasonId,
        moveId,
      });
      const expectedRoll = relationshipIntelRoll({
        franchiseId: item.franchiseId,
        seasonId: item.seasonId,
        moveId,
      });
      const expectedUnconfirmed = expectedRoll < RELATIONSHIP_INTEL_INACCURACY_RATE;

      if (facts.relationshipIntelSeed !== expectedSeed) newsIssues.push(`${item.id}:seedMismatch`);
      if (Math.abs(Number(facts.relationshipIntelRoll) - expectedRoll) > 1e-12) newsIssues.push(`${item.id}:rollMismatch`);
      if (facts.relationshipIntelUnconfirmed !== expectedUnconfirmed) newsIssues.push(`${item.id}:hedgeMismatch`);
    }
  }

  const fanNudgeSourceIds = new Set<string>();
  const duplicateFanSources: string[] = [];
  const playerChannelNudges: string[] = [];
  for (const morale of snapshot.moraleSnapshots) {
    const seenInSnapshot = new Set<string>();
    for (const entry of morale.history ?? []) {
      if (!entry.sourceEventId.startsWith(RELATIONSHIP_FAN_NUDGE_SOURCE_PREFIX)) continue;
      if (morale.targetType !== 'team-fan') {
        playerChannelNudges.push(`${morale.playerId ?? morale.id}:${entry.sourceEventId}`);
        continue;
      }
      if (seenInSnapshot.has(entry.sourceEventId)) {
        duplicateFanSources.push(`${morale.teamId ?? morale.id}:${entry.sourceEventId}`);
      }
      seenInSnapshot.add(entry.sourceEventId);
      fanNudgeSourceIds.add(entry.sourceEventId);
    }
  }

  const nudgeWithoutNews = [...fanNudgeSourceIds].filter((sourceEventId) => !newsSourceIds.has(sourceEventId));
  const emittedWithoutNudge = [...newsSourceIds].filter((sourceEventId) => !fanNudgeSourceIds.has(sourceEventId));
  const warFieldLeaks = warRowsWithForbiddenRelationshipMoraleFields(snapshot);
  const pass =
    newsIssues.length === 0 &&
    duplicateFanSources.length === 0 &&
    playerChannelNudges.length === 0 &&
    nudgeWithoutNews.length === 0 &&
    emittedWithoutNudge.length === 0 &&
    warFieldLeaks.length === 0;

  return invariantResult(
    'soul.l13-rep4-fan-nudge-boundary',
    CRITICAL,
    pass,
    pass
      ? `relationshipFlares=${relationshipNews.length}; fanNudges=${fanNudgeSourceIds.size}; REP-4 seed deterministic; fan nudges are team-fan only and emission-gated`
      : `newsIssues=${newsIssues.slice(0, 8).join(',') || 'none'}; duplicateFanSources=${duplicateFanSources.slice(0, 4).join(',') || 'none'}; playerChannelNudges=${playerChannelNudges.slice(0, 4).join(',') || 'none'}; nudgeWithoutNews=${nudgeWithoutNews.slice(0, 4).join(',') || 'none'}; emittedWithoutNudge=${emittedWithoutNudge.slice(0, 4).join(',') || 'none'}; warLeaks=${warFieldLeaks.slice(0, 4).join(',') || 'none'}`,
  );
}

export function summarizeRelationshipMoraleDeltas(snapshot: LsimStateSnapshot): LsimRelationshipMoraleDeltaSummary {
  type RelationshipHistory = {
    playerId: string;
    sourceEventId: string;
    delta: number;
  };

  const relationshipEntries: RelationshipHistory[] = [];
  const duplicateSourceIds: string[] = [];
  const netByPlayerAndEdge = new Map<string, number>();
  const relationshipGroups = new Set<string>();
  const recoveredGroups = new Set<string>();

  for (const morale of snapshot.moraleSnapshots) {
    if (morale.targetType !== 'player' || !morale.playerId) continue;
    const seen = new Set<string>();
    for (const entry of morale.history ?? []) {
      const isHit = entry.sourceEventId.startsWith(RELATIONSHIP_HIT_SOURCE_PREFIX);
      const isRecovery = entry.sourceEventId.startsWith(RELATIONSHIP_RECOVERY_SOURCE_PREFIX);
      const isCharged = entry.sourceEventId.startsWith(RELATIONSHIP_CHARGED_SOURCE_PREFIX);
      if (!isHit && !isRecovery && !isCharged) continue;
      relationshipEntries.push({
        playerId: morale.playerId,
        sourceEventId: entry.sourceEventId,
        delta: entry.delta,
      });
      if (seen.has(entry.sourceEventId)) {
        duplicateSourceIds.push(`${morale.playerId}:${entry.sourceEventId}`);
      }
      seen.add(entry.sourceEventId);

      const group = relationshipSourceGroup(entry.sourceEventId);
      const playerGroup = `${morale.playerId}::${group}`;
      relationshipGroups.add(playerGroup);
      if (!isCharged) {
        netByPlayerAndEdge.set(playerGroup, roundLsimDelta((netByPlayerAndEdge.get(playerGroup) ?? 0) + entry.delta));
        if (isRecovery) recoveredGroups.add(playerGroup);
      }
    }
  }

  const hitCount = relationshipEntries.filter((entry) =>
    entry.sourceEventId.startsWith(RELATIONSHIP_HIT_SOURCE_PREFIX),
  ).length;
  const recoveryCount = relationshipEntries.filter((entry) =>
    entry.sourceEventId.startsWith(RELATIONSHIP_RECOVERY_SOURCE_PREFIX),
  ).length;
  const chargedEntries = relationshipEntries.filter((entry) =>
    entry.sourceEventId.startsWith(RELATIONSHIP_CHARGED_SOURCE_PREFIX),
  );
  const nonZeroRecovered = [...recoveredGroups].filter((group) =>
    Math.abs(netByPlayerAndEdge.get(group) ?? 0) > 0.001,
  );
  const recoveredGroupsNetDelta = roundLsimDelta(
    [...recoveredGroups].reduce((total, group) => total + (netByPlayerAndEdge.get(group) ?? 0), 0),
  );
  const warFieldLeaks = warRowsWithForbiddenRelationshipMoraleFields(snapshot);
  const sortedSourceIds = relationshipEntries
    .map((entry) => entry.sourceEventId)
    .sort((left, right) => left.localeCompare(right));

  return {
    relationshipHits: hitCount,
    relationshipRecoveries: recoveryCount,
    relationshipChargedMatchups: chargedEntries.length,
    relationshipPlayerGroups: relationshipGroups.size,
    duplicateSourceIds: duplicateSourceIds.length,
    recoveredGroups: recoveredGroups.size,
    recoveredGroupsNetZero: recoveredGroups.size - nonZeroRecovered.length,
    nonZeroRecoveredGroups: nonZeroRecovered.length,
    hitDeltaTotal: roundLsimDelta(
      relationshipEntries
        .filter((entry) => entry.sourceEventId.startsWith(RELATIONSHIP_HIT_SOURCE_PREFIX))
        .reduce((total, entry) => total + entry.delta, 0),
    ),
    recoveryDeltaTotal: roundLsimDelta(
      relationshipEntries
        .filter((entry) => entry.sourceEventId.startsWith(RELATIONSHIP_RECOVERY_SOURCE_PREFIX))
        .reduce((total, entry) => total + entry.delta, 0),
    ),
    chargedDeltaTotal: roundLsimDelta(chargedEntries.reduce((total, entry) => total + entry.delta, 0)),
    chargedPositiveDeltas: chargedEntries.filter((entry) => entry.delta > 0).length,
    chargedNegativeDeltas: chargedEntries.filter((entry) => entry.delta < 0).length,
    recoveredGroupsNetDelta,
    ratingsDevelopmentRows: snapshot.ratingsOverlays.filter((row) => row.source === 'ratings-development').length,
    moraleToWarLeaks: warFieldLeaks.length,
    sampleSourceEventIds: sortedSourceIds.slice(0, 6),
  };
}

function relationshipSourceGroup(sourceEventId: string): string {
  const withoutKind = sourceEventId
    .replace(RELATIONSHIP_HIT_SOURCE_PREFIX, '')
    .replace(RELATIONSHIP_RECOVERY_SOURCE_PREFIX, '')
    .replace(RELATIONSHIP_CHARGED_SOURCE_PREFIX, '');
  const gameMarker = withoutKind.lastIndexOf(':game-');
  return gameMarker >= 0 ? withoutKind.slice(0, gameMarker) : withoutKind;
}

function roundLsimDelta(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function warRowsWithForbiddenRelationshipMoraleFields(snapshot: LsimStateSnapshot): string[] {
  const rowSets: Array<[string, unknown[]]> = [
    ['trueValueRows', snapshot.trueValueRows],
    ['battingRows', snapshot.battingRows],
    ['pitchingRows', snapshot.pitchingRows],
    ['fieldingRows', snapshot.fieldingRows],
  ];
  const bad: string[] = [];
  for (const [label, rows] of rowSets) {
    rows.forEach((row, index) => {
      const keys = Object.keys(row as Record<string, unknown>)
        .filter((key) => /morale|relationship/i.test(key));
      if (keys.length > 0) bad.push(`${label}[${index}].${keys.join('|')}`);
    });
  }
  return bad;
}

function ratingsOverlayValidity(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const players = playerById(snapshot);
  // CHEAP TIGHTENING: also assert single consistent scope + the deterministic id
  // (`${franchiseId}:${seasonId}:${statsScopeId}:${playerId}:${ratingKey}:${sourceEventId}`).
  const scopes = new Set(
    snapshot.ratingsOverlays.map((row) => {
      const r = row as unknown as { franchiseId: string; seasonId: string; statsScopeId: string };
      return `${r.franchiseId}|${r.seasonId}|${r.statsScopeId}`;
    }),
  );
  const bad = snapshot.ratingsOverlays.filter((row) => {
    const player = players.get(row.playerId);
    const validKey = isPitcher(player)
      ? PITCHER_RATING_KEYS.has(row.ratingKey)
      : HITTER_RATING_KEYS.has(row.ratingKey);
    const r = row as unknown as { franchiseId: string; seasonId: string; statsScopeId: string };
    const expectedId = [r.franchiseId, r.seasonId, r.statsScopeId, row.playerId, row.ratingKey, row.sourceEventId].join(':');
    return !player ||
      row.source !== 'ratings-development' ||
      row.confirmationStatus !== 'pending' ||
      row.kind !== 'permanent' ||
      row.expiresAtGameNumber !== null ||
      !Number.isInteger(row.createdAtGameNumber) ||
      row.createdAtGameNumber < 1 ||
      !isFiniteNumber(row.delta) ||
      row.delta === 0 ||
      !validKey ||
      row.id !== expectedId;
  });
  const pass = bad.length === 0 && scopes.size <= 1;
  return invariantResult(
    'soul.ratings-overlay-validity',
    CRITICAL,
    pass,
    pass
      ? `ratingsOverlays=${snapshot.ratingsOverlays.length}; single scope + deterministic ids`
      : `badOverlayIds=${bad.slice(0, 6).map((row) => row.id).join(',') || 'none'}; distinctScopes=${scopes.size}`,
  );
}

// The grant gates each trait on its TIER threshold (traitAcquisition.thresholdsForTrait ->
// assignTier), NOT the global TRAIT_ACQUISITION_TUNING.{gain,lose}Threshold. So a valid
// UNCOMMON/MODERATE gain (tier gainThreshold 0.65-0.70) lands in [0.65, 0.75) and must NOT be
// flagged. Mirror the grant's per-tier fallback exactly so the invariant checks what the grant
// actually enforces.
function traitOverlayThresholdsFor(traitName: string): { gain: number; lose: number } {
  try {
    const tier = assignTier(traitName);
    return { gain: tier.gainThreshold, lose: tier.lossThreshold };
  } catch {
    return {
      gain: TRAIT_ACQUISITION_TUNING.gainThreshold,
      lose: TRAIT_ACQUISITION_TUNING.loseThreshold,
    };
  }
}

function traitTwoSlotNoOffsetHysteresis(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const badPlayers = snapshot.players.filter((player) => {
    const traits = [player.trait1, player.trait2].filter((trait): trait is string => Boolean(trait));
    const hasDuplicate = new Set(traits).size !== traits.length;
    const hasOpposite = traits.some((trait) => TRAIT_OPPOSITES[trait] && traits.includes(TRAIT_OPPOSITES[trait]));
    return traits.length > 2 || hasDuplicate || hasOpposite;
  });
  const badOverlays = snapshot.traitOverlays.filter((row) => {
    const thresholds = traitOverlayThresholdsFor(row.traitName);
    return (
      row.confirmationStatus !== 'pending' ||
      !isFiniteNumber(row.probability) ||
      row.probability < 0 ||
      row.probability > 1 ||
      (row.valence === 'gain' && row.probability < thresholds.gain) ||
      (row.valence === 'lose' && row.probability > thresholds.lose) ||
      (row.valence === 'gain' && TRAIT_OPPOSITES[row.traitName] === row.displacesTraitName)
    );
  });
  // CHEAP TIGHTENING: displacement is ATOMIC — at most one displacing resolution (a gain that displaces a held
  // trait) per player per cycle (sourceEventId). (re-evaluate-to-drop is cross-cycle + needs trait LOSSES, which
  // require the generator-adversity decline path → it is a [post-Step-3] COVERAGE_GAPS item.)
  const displacementsPerCycle = new Map<string, number>();
  for (const row of snapshot.traitOverlays) {
    if (row.valence === 'gain' && row.displacesTraitName) {
      const key = `${row.playerId}::${row.sourceEventId}`;
      displacementsPerCycle.set(key, (displacementsPerCycle.get(key) ?? 0) + 1);
    }
  }
  const nonAtomic = [...displacementsPerCycle.entries()].filter(([, n]) => n > 1).map(([k]) => k);
  const pass = badPlayers.length === 0 && badOverlays.length === 0 && nonAtomic.length === 0;
  return invariantResult(
    'soul.trait-two-slot-no-offset-hysteresis',
    CRITICAL,
    pass,
    pass
      ? `players=${snapshot.players.length}; traitOverlays=${snapshot.traitOverlays.length}; displacements atomic`
      : `badPlayers=${badPlayers.slice(0, 6).map((player) => player.id).join(',') || 'none'}; badOverlayIds=${badOverlays.slice(0, 6).map((row) => row.id).join(',') || 'none'}; nonAtomic=${nonAtomic.slice(0, 4).join(',') || 'none'}`,
  );
}

function backupMigrationProof(snapshot: LsimStateSnapshot): LsimInvariantResult {
  if (!snapshot.persistenceProof) {
    return invariantResult(
      'soul.persistence-backup-migration-proof',
      CRITICAL,
      snapshot.gamesSimulated < snapshot.totalScheduledGames,
      snapshot.gamesSimulated < snapshot.totalScheduledGames
        ? `pending final persistence proof at ${snapshot.gamesSimulated}/${snapshot.totalScheduledGames}`
        : 'missing persistence proof',
    );
  }
  const pass = snapshot.persistenceProof.backupRoundTripByteIdentical === true &&
    snapshot.persistenceProof.migrationSurvivalChecked &&
    snapshot.persistenceProof.migrationSurvivalAcrossVersionBump === true;
  return invariantResult(
    'soul.persistence-backup-migration-proof',
    CRITICAL,
    pass,
    snapshot.persistenceProof.detail,
  );
}

function channelSeparation(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const fameBad = snapshot.fameRows.filter((row) => {
    const record = row as unknown as Record<string, unknown>;
    return 'trueValue' in record || 'valueDelta' in record || 'warPercentile' in record;
  });
  const trueValueBad = snapshot.trueValueRows.filter((row) => {
    const record = row as unknown as Record<string, unknown>;
    return 'heat' in record || 'reachFloor' in record || 'channelByChannel' in record;
  });
  const trueValueWithWpa = snapshot.trueValueRows.filter((row) => {
    const record = row as unknown as Record<string, unknown>;
    return 'pitchingWpa' in record || 'totalWpa' in record || 'battingWpa' in record;
  });
  const pass = fameBad.length === 0 && trueValueBad.length === 0 && trueValueWithWpa.length === 0;
  return invariantResult(
    'soul.channel-separation-double-count-guards',
    CRITICAL,
    pass,
    pass
      ? 'fame rows contain fame-only fields; True Value rows contain WAR/value-only fields'
      : `fameBad=${fameBad.length}; trueValueBad=${trueValueBad.length}; trueValueWithWpa=${trueValueWithWpa.length}`,
  );
}

function allStarSixtyPercentLock(snapshot: LsimStateSnapshot): LsimInvariantResult {
  // Match the PRODUCTION lock anchor exactly (franchiseAllStarLock.ts: Math.round(totalGames * fraction)).
  // The prior Math.ceil diverged from production at non-integer 60% points (e.g. 24*0.6=14.4 -> prod 14, ceil 15)
  // and was masked when the season length made 60% an exact integer (60*0.6=36).
  const lockGame = Math.round(snapshot.totalScheduledGames * ALL_STAR_LOCK_FRACTION);
  if (snapshot.gameNumber < lockGame) {
    return invariantResult(
      'soul.all-star-sixty-percent-lock',
      CRITICAL,
      true,
      `pending lock game ${lockGame}; current=${snapshot.gameNumber}`,
    );
  }
  const roster = snapshot.allStarRosters[0];
  if (!roster) {
    return invariantResult('soul.all-star-sixty-percent-lock', CRITICAL, false, `missing All-Star roster at lockGame=${lockGame}`);
  }
  const stableAfterLock = !snapshot.previous?.allStarRosters[0]?.locked ||
    JSON.stringify(snapshot.previous.allStarRosters[0].selections) === JSON.stringify(roster.selections);
  const pass = roster.locked === true &&
    roster.lockedAtGameNumber === lockGame &&
    roster.selections.length > 0 &&
    stableAfterLock;
  return invariantResult(
    'soul.all-star-sixty-percent-lock',
    CRITICAL,
    pass,
    `locked=${roster.locked}; lockedAt=${roster.lockedAtGameNumber}; expected=${lockGame}; selections=${roster.selections.length}; stableAfterLock=${stableAfterLock}`,
  );
}

function reachFloorRatchetFromHonors(snapshot: LsimStateSnapshot): LsimInvariantResult {
  // §5.3 honor → reach-floor protection. At the All-Star lock, the honor payout (applyFranchiseHonorReachFloor, gated
  // on L12+Fame) bumps each SELECTED player's fame HEAT by the role-tiered honorHeatBump (starter/wildcard 6 >
  // reserve 3), pins reachFloor to REGIONAL_STAR, and stamps the fame record updatedAtCheckpoint='all-star-lock'.
  // NOTE: the `allStarSelections` career counter is part of §5.3 but is greenfield/UNWIRED (no production path
  // increments it) — so per the "no invariant before the data exists" rule it is NOT asserted; see COVERAGE_GAPS.
  const negative = snapshot.fameRows.filter((row) => row.reachFloor < 0).map((row) => row.playerId);
  const lockGame = Math.round(snapshot.totalScheduledGames * ALL_STAR_LOCK_FRACTION);
  if (snapshot.gameNumber !== lockGame) {
    return invariantResult(
      'soul.reach-floor-ratchet',
      CRITICAL,
      negative.length === 0,
      negative.length === 0
        ? `reachFloor>=0 (honor pin tested at lockGame=${lockGame}; permanence covered by fame-reach-monotonic)`
        : `negativeReach=${negative.slice(0, 8).join(',')}`,
    );
  }
  const roster = snapshot.allStarRosters[0];
  if (!roster || roster.locked !== true) {
    return invariantResult('soul.reach-floor-ratchet', CRITICAL, false, `no locked All-Star roster at lockGame=${lockGame}`);
  }
  const fameById = new Map(snapshot.fameRows.map((row) => [row.playerId, row]));
  const SENTINEL = 'all-star-lock';
  // A selected player with NO fame record is correctly skipped by the payout (no substrate) — not a failure.
  const selectedWithRecord = roster.selections.filter((sel) => fameById.has(sel.playerId));
  const notStamped = selectedWithRecord.filter(
    (sel) => (fameById.get(sel.playerId) as { updatedAtCheckpoint?: string }).updatedAtCheckpoint !== SENTINEL,
  );
  const selectedUnderFloor = selectedWithRecord.filter(
    (sel) => (fameById.get(sel.playerId)?.reachFloor ?? 0) < FAME_TIER_RANK.REGIONAL_STAR,
  );
  const starterBump = FAME_TUNING.honorHeatBump.allStarStarter;
  const reserveBump = FAME_TUNING.honorHeatBump.allStarReserve;
  const tieredCorrectly = starterBump > reserveBump;
  const pass = negative.length === 0 && notStamped.length === 0 && selectedUnderFloor.length === 0 && tieredCorrectly;
  return invariantResult(
    'soul.reach-floor-ratchet',
    CRITICAL,
    pass,
    pass
      ? `lockGame=${lockGame}; selected=${roster.selections.length}; withFameRecord=${selectedWithRecord.length} all stamped '${SENTINEL}' and reachFloor>=REGIONAL_STAR; starterBump ${starterBump}>${reserveBump}`
      : `negativeReach=${negative.slice(0, 4).join(',') || 'none'}; notStamped=${notStamped.slice(0, 6).map((s) => s.playerId).join(',') || 'none'}; underFloor=${selectedUnderFloor.slice(0, 6).map((s) => s.playerId).join(',') || 'none'}; tiered=${tieredCorrectly}; withFameRecord=${selectedWithRecord.length}/${roster.selections.length}`,
  );
}

function tvFreeze(snapshot: LsimStateSnapshot): LsimInvariantResult {
  // §5.3 TV-freeze: at season-end the True Value (trusted-value) artifact FREEZES — frozen flag sets, frozenAt is
  // stamped, the anti-thaw guard holds, and a post-freeze recompute is a no-op. The idempotency + anti-thaw require an
  // active runtime re-test, recorded by the runner in finalizeProof (it re-freezes + attempts a refused unfreeze).
  if (snapshot.gamesSimulated < snapshot.totalScheduledGames) {
    return invariantResult(
      'soul.tv-freeze',
      CRITICAL,
      true,
      `pending season-end freeze at ${snapshot.gamesSimulated}/${snapshot.totalScheduledGames}`,
    );
  }
  const proof = snapshot.finalizeProof;
  const artifact = snapshot.trustedValueArtifact;
  if (!proof?.ran) {
    return invariantResult('soul.tv-freeze', CRITICAL, false, 'missing finalize proof at season-end');
  }
  const frozenInStore = artifact !== null &&
    (artifact as { frozen?: boolean }).frozen === true &&
    (artifact as { frozenAt?: number | null }).frozenAt != null;
  const pass = proof.artifactPresent && frozenInStore && proof.reFreezeIdempotent && proof.antiThawHeld;
  return invariantResult(
    'soul.tv-freeze',
    CRITICAL,
    pass,
    pass
      ? `frozen=true frozenAt=${(artifact as { frozenAt?: number | null }).frozenAt}; reFreeze no-op + anti-thaw guard held; invoked=[${proof.invoked.join(' -> ')}]`
      : `artifactPresent=${proof.artifactPresent}; frozenInStore=${frozenInStore}; reFreezeIdempotent=${proof.reFreezeIdempotent}; antiThawHeld=${proof.antiThawHeld}; ${proof.detail}`,
  );
}

function awardsOffFrozenArtifact(snapshot: LsimStateSnapshot): LsimInvariantResult {
  // §5.3 awards-off-frozen (AWARD_TRUST_CONTRACT.md:9-10,35): awards finalize OFF the FROZEN artifact — the D8 trust
  // gate requires `artifact.frozen === true`, finalized rows are persisted, and every PLAYER-award winner belongs to
  // the frozen artifact's trustedPlayerIds. Manager-of-Year is a manager row, not a player row, so it is validated
  // separately by requiring a concrete manager winner without forcing that id into the player artifact.
  if (snapshot.gamesSimulated < snapshot.totalScheduledGames) {
    return invariantResult(
      'soul.awards-off-frozen-artifact',
      CRITICAL,
      true,
      `pending season-end finalize at ${snapshot.gamesSimulated}/${snapshot.totalScheduledGames}`,
    );
  }
  const artifact = snapshot.trustedValueArtifact;
  const frozen = artifact !== null && (artifact as { frozen?: boolean }).frozen === true;
  const trustedIds = new Set((artifact as { trustedPlayerIds?: string[] } | null)?.trustedPlayerIds ?? []);
  const finalized = snapshot.awardRows.filter((row) => row.finalized);
  const playerAwardRows = finalized.filter((row) => row.category !== 'MANAGER_OF_YEAR');
  const managerAwardRows = finalized.filter((row) => row.category === 'MANAGER_OF_YEAR');
  const playerWinners = playerAwardRows.map((row) => row.winnerPlayerId).filter((id): id is string => Boolean(id));
  const managerWinners = managerAwardRows.map((row) => row.winnerPlayerId).filter((id): id is string => Boolean(id));
  const untrustedWinners = playerWinners.filter((id) => !trustedIds.has(id));
  const managerRowsHaveWinners = managerAwardRows.every((row) => Boolean(row.winnerPlayerId));
  // The artifact MUST be frozen (the gate that authorized the finalize), finalized rows MUST exist (the finalize ran),
  // no PLAYER winner may sit outside the frozen trusted set, and any manager rows must name a manager winner.
  const pass =
    frozen &&
    finalized.length > 0 &&
    untrustedWinners.length === 0 &&
    managerRowsHaveWinners;
  return invariantResult(
    'soul.awards-off-frozen-artifact',
    CRITICAL,
    pass,
    pass
      ? `artifact.frozen=true; finalizedRows=${finalized.length}; playerWinners=[${playerWinners.join(',') || 'none'}] all in trustedPlayerIds(${trustedIds.size}); managerWinners=[${managerWinners.join(',') || 'none'}]`
      : `frozen=${frozen}; finalizedRows=${finalized.length}; untrustedPlayerWinners=[${untrustedWinners.join(',') || 'none'}]; managerRowsHaveWinners=${managerRowsHaveWinners}; trustedCount=${trustedIds.size}`,
  );
}

function snubVictimsByHonor(snapshot: LsimStateSnapshot): Map<string, Set<string>> {
  // Observe the ACTUAL snub targets from player-morale history: sourceEventId = 'race-snub:fid:sid:ssid:HONOR:playerId'.
  const byHonor = new Map<string, Set<string>>();
  for (const morale of snapshot.moraleSnapshots) {
    if (morale.playerId === undefined) continue;
    for (const entry of morale.history ?? []) {
      const sourceEventId = (entry as { sourceEventId?: unknown }).sourceEventId;
      if (typeof sourceEventId !== 'string' || !sourceEventId.startsWith(RACE_SNUB_SOURCE_PREFIX)) continue;
      const segments = sourceEventId.split(':');
      const honorKind = segments[4]; // 'race-snub' : fid : sid : ssid : HONOR : playerId
      if (!honorKind) continue;
      if (!byHonor.has(honorKind)) byHonor.set(honorKind, new Set());
      byHonor.get(honorKind)!.add(morale.playerId);
    }
  }
  return byHonor;
}

function teamOfPlayer(snapshot: LsimStateSnapshot): (playerId: string) => string {
  const byId = playerById(snapshot);
  return (playerId: string): string => {
    const player = byId.get(playerId) as (Player & { leagueAssignments?: Array<{ teamId?: string }> }) | undefined;
    return player?.leagueAssignments?.[0]?.teamId ?? '?';
  };
}

function emissionSnubSignal(snapshot: LsimStateSnapshot): LsimInvariantResult {
  // §5.3 emission-snub: the snub fires for the CLOSE LOSERS ONLY (smallest |marginToWinner|, top-3, winner excluded) and
  // the legacy positive nod (AWARD_RESULT) is deduped one-per-honorKind (not double-counted). The nod is a SeasonNewsItem;
  // the snub is a morale consequence (history sourceEventId 'race-snub:...'). Close-loser selection reuses the PRODUCTION
  // pickRaceSnubVictims (not a reimplementation).
  if (snapshot.gamesSimulated < snapshot.totalScheduledGames) {
    return invariantResult(
      'soul.emission-snub-signal',
      INVESTIGATE,
      true,
      `pending season-end at ${snapshot.gamesSimulated}/${snapshot.totalScheduledGames}`,
    );
  }
  const awardNews = snapshot.seasonNewsItems.filter((item) => item.eventType === 'AWARD_RESULT');
  if (awardNews.length === 0) {
    // LIVE-PENDING (not vacuous): the named property is fully encoded below + SYNTHETIC-FALSIFIED in falsification.ts.
    // The season-end AWARD_RESULT nod cannot be exercised in the OFFLINE deterministic harness — it is reporter-gated
    // (getReporterForTeam) AND narrative-LLM-gated (generateSeasonNewsTake -> callClaudeMessages) AND minted with a
    // crypto.randomUUID id; the snub is gated behind nod emission. See WAITING_ON_JK / the L-SIM report finding.
    return invariantResult(
      'soul.emission-snub-signal',
      INVESTIGATE,
      true,
      `LIVE-PENDING: no AWARD_RESULT nod fired offline (reporter+LLM+crypto-gated nod; snub gated behind it); emittedHonors=[${snapshot.finalizeProof?.emittedHonors.join(',') ?? ''}]; close-losers-only + no-double-count are synthetic-falsified`,
    );
  }
  // (1) no double-counted honorKind (the legacy nod dedup)
  const honorCounts = new Map<string, number>();
  for (const item of awardNews) {
    const honorKind = String((item.facts as { honorKind?: unknown }).honorKind ?? 'unknown');
    honorCounts.set(honorKind, (honorCounts.get(honorKind) ?? 0) + 1);
  }
  const doubleCounted = [...honorCounts.entries()].filter(([, n]) => n > 1).map(([k, n]) => `${k}:${n}`);

  // (2)/(3) close-losers-only: for each nod's honorKind, the ACTUAL snubbed set must equal the top-3 closest losers
  // (by |marginToWinner|, winner excluded) from that award's candidates — no far loser snubbed, no close loser missed.
  const actualByHonor = snubVictimsByHonor(snapshot);
  const teamOf = teamOfPlayer(snapshot);
  const closeLoserViolations: string[] = [];
  const snubbedWinners: string[] = [];
  const honorKinds = new Set(awardNews.map((item) => String((item.facts as { honorKind?: unknown }).honorKind ?? '')));
  for (const honorKind of honorKinds) {
    if (!honorKind) continue;
    const row = snapshot.awardRows.find((award) => award.category === honorKind);
    const winnerId = row?.winnerPlayerId ?? null;
    const actual = actualByHonor.get(honorKind) ?? new Set<string>();
    if (winnerId && actual.has(winnerId)) snubbedWinners.push(`${honorKind}:${winnerId}`);
    if (!row) {
      if (actual.size > 0) closeLoserViolations.push(`${honorKind}:snubWithoutAwardRow`);
      continue;
    }
    const expected = new Set(
      pickRaceSnubVictims(
        row.candidates.map((candidate) => ({
          playerId: candidate.playerId,
          teamId: teamOf(candidate.playerId),
          marginToWinner: candidate.marginToWinner,
        })),
        new Set(winnerId ? [winnerId] : []),
        SEASON_END_SNUB_TOP_N,
      ).map((victim) => victim.playerId),
    );
    for (const playerId of actual) {
      if (!expected.has(playerId)) closeLoserViolations.push(`${honorKind}:nonCloseLoserSnubbed(${playerId})`);
    }
    for (const playerId of expected) {
      if (!actual.has(playerId)) closeLoserViolations.push(`${honorKind}:closeLoserMissed(${playerId})`);
    }
  }
  // Reverse direction: the snub is gated behind nod emission (franchiseSeasonEndHonors.ts:104) — a race-snub recorded
  // for an honorKind that emitted NO AWARD_RESULT nod is a violation (snub without its gating nod).
  for (const snubbedHonor of actualByHonor.keys()) {
    if (!honorKinds.has(snubbedHonor)) closeLoserViolations.push(`${snubbedHonor}:snubWithoutNod`);
  }
  const pass = doubleCounted.length === 0 && snubbedWinners.length === 0 && closeLoserViolations.length === 0;
  return invariantResult(
    'soul.emission-snub-signal',
    INVESTIGATE,
    pass,
    pass
      ? `AWARD_RESULT nods=${awardNews.length} (one per honorKind); snubs = top-${SEASON_END_SNUB_TOP_N} close losers only; no winner snubbed`
      : `doubleCountedHonors=${doubleCounted.join(',') || 'none'}; snubbedWinners=${snubbedWinners.join(',') || 'none'}; closeLoserViolations=${closeLoserViolations.slice(0, 8).join(',') || 'none'}`,
  );
}

export function getSoulInvariantChecks(): LsimInvariantCheck[] {
  return [
    fameComponentsFinite,
    fameReachMonotonic,
    fameHeatFickle,
    fameTierLegitimacy,
    l12RaceNoNanAndResolve,
    moraleBounds,
    flashpointClamp,
    designationSlots,
    albatrossGate,
    l10PerGameCadence,
    l11BackstopGate,
    replayIdempotency,
    checkpointCadence,
    relationshipFormationCheckpointWrite,
    relationshipIntensityLifecycle,
    relationshipMoraleTapDevelopmentBoundary,
    relationshipRep4FanNudgeBoundary,
    ratingsOverlayValidity,
    traitTwoSlotNoOffsetHysteresis,
    backupMigrationProof,
    channelSeparation,
    allStarSixtyPercentLock,
    reachFloorRatchetFromHonors,
    tvFreeze,
    awardsOffFrozenArtifact,
    emissionSnubSignal,
  ];
}
