import { FAME_TIER_RANK, FAME_TUNING, resolveFameTier } from '../../../src/engines/fameModel';
import { ALL_STAR_LOCK_FRACTION } from '../../../src/utils/franchiseAllStarLock';
import { FLASHPOINT_DECAY_TUNING, computeFlashpointGameTax } from '../../../src/engines/flashpointDecay';
import { L11_AUTO_BACKSTOP_TUNING } from '../../../src/utils/franchiseManagerAutoBackstop';
import { TRAIT_ACQUISITION_TUNING, TRAIT_OPPOSITES } from '../../../src/engines/traitAcquisition';
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

function fameReachMonotonic(snapshot: LsimStateSnapshot): LsimInvariantResult {
  if (!snapshot.previous) {
    return invariantResult('soul.fame-reach-monotonic', CRITICAL, true, 'first snapshot');
  }
  const prior = new Map(snapshot.previous.fameRows.map((row) => [row.playerId, row.reachFloor]));
  const regressions = snapshot.fameRows
    .filter((row) => isFiniteNumber(prior.get(row.playerId)) && row.reachFloor < (prior.get(row.playerId) ?? 0))
    .map((row) => `${row.playerId}:${prior.get(row.playerId)}->${row.reachFloor}`);
  return invariantResult(
    'soul.fame-reach-monotonic',
    CRITICAL,
    regressions.length === 0,
    regressions.length === 0 ? 'reachFloor never regressed from previous snapshot' : regressions.slice(0, 8).join(','),
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
  return invariantResult(
    'soul.fame-war-legitimacy-floor',
    INVESTIGATE,
    offenders.length === 0,
    offenders.length === 0
      ? 'no replacement/neg-WAR player holds the apex IMMORTAL_LEGEND tier (high-fame/low-WAR darlings are blessed §20.2 — a §9 signal, not a fail)'
      : `apexDegenerate=${offenders.slice(0, 8).join(',')}`,
  );
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

function l11BackstopGate(snapshot: LsimStateSnapshot): LsimInvariantResult {
  // §5.1 auto-backstop fires ONLY when the FIRED team's fan morale < armingThreshold and the deterministic roll <
  // perGameProbability; a successor is auto-generated; the fired tenure (date/reason) persists across the successor
  // write. (The roll<threshold gate is production-internal — the firing only exists if it held; the harness asserts
  // the observable persistence + ties <25 to the FIRED team.)
  const managerDb = snapshot.storeDump.databases['kbl-manager-identity'] ?? {};
  const assignments = (managerDb.managerAssignments ?? []) as Array<Record<string, unknown>>;
  const profiles = (managerDb.managerProfiles ?? []) as Array<Record<string, unknown>>;
  const tenureRecords = profiles.flatMap((p) => (p.tenureRecords as Array<Record<string, unknown>> | undefined) ?? []);
  const fired = assignments.filter((a) => a.fired === true && a.firedReason === 'auto-backstop');
  if (fired.length === 0) {
    return invariantResult(
      'soul.l11-backstop-under-25-plus-roll',
      CRITICAL,
      true,
      'PENDING-STEP-3: no auto-backstop firings this run (the always-up generator never drives team-fan morale < 25); strengthened logic is synthetic-falsified',
    );
  }
  const armingThreshold = L11_AUTO_BACKSTOP_TUNING.armingThreshold;
  const violations: string[] = [];
  for (const f of fired) {
    const teamId = String(f.teamId);
    // Step-3 note: the firing's relief bump raises the fired team's currentValue post-firing, so this should be
    // refined to read the firing-time value from morale history once firings are live.
    const teamMorale = snapshot.moraleSnapshots.find((m) => m.targetType === 'team-fan' && m.teamId === teamId);
    if (!teamMorale || !(isFiniteNumber(teamMorale.currentValue) && teamMorale.currentValue < armingThreshold)) {
      violations.push(`${teamId}:firedTeamMoraleNotUnder${armingThreshold}`);
    }
    if (!assignments.some((a) => a.teamId === teamId && a.fired !== true && !a.endDate)) {
      violations.push(`${teamId}:noSuccessor`);
    }
    if (!tenureRecords.some((t) => t.teamId === teamId && t.endReason === 'fired')) {
      violations.push(`${teamId}:noFiredTenure`);
    }
  }
  return invariantResult(
    'soul.l11-backstop-under-25-plus-roll',
    CRITICAL,
    violations.length === 0,
    violations.length === 0
      ? `backstopFirings=${fired.length}; each fired team <${armingThreshold} + successor + fired-tenure persists`
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
  const sourceGameNumbers = Array.from(new Set(
    snapshot.ratingsOverlays
      .map((row) => gameNumberFromSourceEventId('checkpoint-', row.sourceEventId))
      .filter((gameNumber): gameNumber is number => gameNumber !== null),
  )).sort((left, right) => left - right);
  const missing = reached.filter((gameNumber) => !sourceGameNumbers.includes(gameNumber));
  const unexpected = sourceGameNumbers.filter((gameNumber) => !snapshot.checkpointGameNumbers.includes(gameNumber));
  const finalExactFive = snapshot.gamesSimulated < snapshot.totalScheduledGames || sourceGameNumbers.length === 5;
  const pass = missing.length === 0 && unexpected.length === 0 && finalExactFive;
  return invariantResult(
    'soul.checkpoint-cadence-exactly-five',
    CRITICAL,
    pass,
    `reached=${reached.join(',') || 'none'}; overlayCheckpoints=${sourceGameNumbers.join(',') || 'none'}; missing=${missing.join(',') || 'none'}; unexpected=${unexpected.join(',') || 'none'}`,
  );
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

function traitTwoSlotNoOffsetHysteresis(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const badPlayers = snapshot.players.filter((player) => {
    const traits = [player.trait1, player.trait2].filter((trait): trait is string => Boolean(trait));
    const hasDuplicate = new Set(traits).size !== traits.length;
    const hasOpposite = traits.some((trait) => TRAIT_OPPOSITES[trait] && traits.includes(TRAIT_OPPOSITES[trait]));
    return traits.length > 2 || hasDuplicate || hasOpposite;
  });
  const badOverlays = snapshot.traitOverlays.filter((row) =>
    row.confirmationStatus !== 'pending' ||
    !isFiniteNumber(row.probability) ||
    row.probability < 0 ||
    row.probability > 1 ||
    (row.valence === 'gain' && row.probability < TRAIT_ACQUISITION_TUNING.gainThreshold) ||
    (row.valence === 'lose' && row.probability > TRAIT_ACQUISITION_TUNING.loseThreshold) ||
    (row.valence === 'gain' && TRAIT_OPPOSITES[row.traitName] === row.displacesTraitName),
  );
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
  // §5.3 honor → reach-floor ratchet. At the All-Star lock, the honor payout (applyFranchiseHonorReachFloor, gated
  // on L12+Fame) bumps each SELECTED player's fame HEAT by the role-tiered honorHeatBump (starter/wildcard 6 >
  // reserve 3), ratchets reachFloor, and stamps the fame record updatedAtCheckpoint='all-star-lock'.
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
        ? `reachFloor>=0 (honor ratchet tested at lockGame=${lockGame}; permanence covered by reach-monotonic)`
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
  const starterBump = FAME_TUNING.honorHeatBump.allStarStarter;
  const reserveBump = FAME_TUNING.honorHeatBump.allStarReserve;
  const tieredCorrectly = starterBump > reserveBump;
  const pass = negative.length === 0 && notStamped.length === 0 && tieredCorrectly;
  return invariantResult(
    'soul.reach-floor-ratchet',
    CRITICAL,
    pass,
    pass
      ? `lockGame=${lockGame}; selected=${roster.selections.length}; withFameRecord=${selectedWithRecord.length} all stamped '${SENTINEL}'; starterBump ${starterBump}>${reserveBump}`
      : `negativeReach=${negative.slice(0, 4).join(',') || 'none'}; notStamped=${notStamped.slice(0, 6).map((s) => s.playerId).join(',') || 'none'}; tiered=${tieredCorrectly}; withFameRecord=${selectedWithRecord.length}/${roster.selections.length}`,
  );
}

function emissionSnubSignal(snapshot: LsimStateSnapshot): LsimInvariantResult {
  // §5.3 emission: the snub fires for the CLOSE LOSERS only (never a winner) and the legacy positive nod
  // (AWARD_RESULT, deduped one-per-honorKind) is not double-counted. The nod is a SeasonNewsItem; the snub is a
  // morale consequence (history sourceEventId 'race-snub:...') — they are separate systems.
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
    return invariantResult(
      'soul.emission-snub-signal',
      INVESTIGATE,
      true,
      'PENDING-STEP-4: the runner does not yet call a production season-finalize, so no AWARD_RESULT nod / snub fires; strengthened logic is synthetic-falsified',
    );
  }
  const honorCounts = new Map<string, number>();
  for (const item of awardNews) {
    const honorKind = String((item.facts as { honorKind?: unknown }).honorKind ?? 'unknown');
    honorCounts.set(honorKind, (honorCounts.get(honorKind) ?? 0) + 1);
  }
  const doubleCounted = [...honorCounts.entries()].filter(([, n]) => n > 1).map(([k, n]) => `${k}:${n}`);
  const winnerIds = new Set(
    awardNews.map((item) => String((item.facts as { winnerId?: unknown }).winnerId ?? '')).filter(Boolean),
  );
  const snubbedWinners = snapshot.moraleSnapshots
    .filter((m) =>
      m.playerId !== undefined &&
      winnerIds.has(m.playerId) &&
      (m.history ?? []).some(
        (h) => typeof (h as { sourceEventId?: unknown }).sourceEventId === 'string' &&
          (h as { sourceEventId: string }).sourceEventId.startsWith('race-snub:'),
      ),
    )
    .map((m) => m.playerId);
  const pass = doubleCounted.length === 0 && snubbedWinners.length === 0;
  return invariantResult(
    'soul.emission-snub-signal',
    INVESTIGATE,
    pass,
    pass
      ? `AWARD_RESULT nods=${awardNews.length} (one per honorKind); no winner snubbed`
      : `doubleCountedHonors=${doubleCounted.join(',') || 'none'}; snubbedWinners=${snubbedWinners.join(',') || 'none'}`,
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
    ratingsOverlayValidity,
    traitTwoSlotNoOffsetHysteresis,
    backupMigrationProof,
    channelSeparation,
    allStarSixtyPercentLock,
    reachFloorRatchetFromHonors,
    emissionSnubSignal,
  ];
}
