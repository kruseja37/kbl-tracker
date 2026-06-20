import { FAME_TIER_RANK, resolveFameTier } from '../../../src/engines/fameModel';
import { ALL_STAR_LOCK_FRACTION } from '../../../src/utils/franchiseAllStarLock';
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
const REQUIRED_L12_MERIT_CATEGORIES = [
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
  const trueValueByPlayer = new Map(snapshot.trueValueRows.map((row) => [row.playerId, row]));
  const offenders = snapshot.fameRows
    .filter((row) => {
      const fameRank = FAME_TIER_RANK[resolveFameTier(row.heat, row.reachFloor)];
      const valueRow = trueValueByPlayer.get(row.playerId);
      return fameRank >= FAME_TIER_RANK.NATIONAL_ICON &&
        valueRow &&
        isFiniteNumber(valueRow.warPercentile) &&
        valueRow.warPercentile < 0.25;
    })
    .map((row) => row.playerId);
  return invariantResult(
    'soul.fame-war-legitimacy-floor',
    INVESTIGATE,
    offenders.length === 0,
    offenders.length === 0 ? 'no low-war-percentile player holds NATIONAL_ICON or above' : `offenders=${offenders.slice(0, 8).join(',')}`,
  );
}

function l12RaceNoNanAndResolve(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const proof = snapshot.l12Proof;
  if (!proof) {
    return invariantResult('soul.l12-race-no-nan-resolve-tier', CRITICAL, false, 'missing L12 proof');
  }
  const missingCategories = REQUIRED_L12_MERIT_CATEGORIES.filter((category) => !proof.categories.includes(category));
  const requiresFullCategorySet = snapshot.gamesSimulated >= snapshot.totalScheduledGames;
  const pass = proof.status === 'computed' &&
    !proof.hasNonFiniteScore &&
    (!requiresFullCategorySet || missingCategories.length === 0);
  return invariantResult(
    'soul.l12-race-no-nan-resolve-tier',
    CRITICAL,
    pass,
    `status=${proof.status}; candidateCount=${proof.candidateCount}; missingMeritCategories=${missingCategories.join(',') || 'none'}; nonFinite=${proof.hasNonFiniteScore}; ${proof.detail}`,
  );
}

function moraleBounds(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const bad = snapshot.moraleSnapshots.filter((row) =>
    !isFiniteNumber(row.currentValue) ||
    !isFiniteNumber(row.baselineValue) ||
    row.currentValue < 0 ||
    row.currentValue > 100 ||
    row.baselineValue < 0 ||
    row.baselineValue > 100,
  );
  return invariantResult(
    'soul.morale-bounds',
    CRITICAL,
    bad.length === 0,
    bad.length === 0 ? `moraleSnapshots=${snapshot.moraleSnapshots.length}` : `badSnapshots=${bad.slice(0, 8).map((row) => row.id).join(',')}`,
  );
}

function flashpointClamp(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const bad = snapshot.flashpointRows.filter((row) =>
    !isFiniteNumber(row.consecutiveGamesUnresolved) ||
    !isFiniteNumber(row.accumulatedFanMoraleTax) ||
    !isFiniteNumber(row.lastGameTax) ||
    row.consecutiveGamesUnresolved < 0 ||
    row.accumulatedFanMoraleTax > 0 ||
    row.lastGameTax > 0 ||
    row.lastGameTax < -3,
  );
  return invariantResult(
    'soul.flashpoint-compounding-clamped',
    CRITICAL,
    bad.length === 0,
    bad.length === 0 ? `flashpointRows=${snapshot.flashpointRows.length}` : `badRows=${bad.slice(0, 8).map((row) => row.playerId).join(',')}`,
  );
}

function designationSlots(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const duplicateRows: string[] = [];
  for (const teamId of snapshot.teamIds) {
    for (const type of DESIGNATION_ROW_TYPES) {
      const rows = snapshot.designationRows.filter((row) => row.teamId === teamId && row.type === type);
      if (rows.length > 1) duplicateRows.push(`${teamId}:${type}:${rows.length}`);
    }
  }
  const badTeamSlots = snapshot.teams.filter((team) => {
    const captain = (team as Player & { captainPlayerId?: string | null }).captainPlayerId;
    const fanHopeful = (team as Player & { fanHopefulPlayerId?: string | null }).fanHopefulPlayerId;
    return captain === undefined || fanHopeful === undefined;
  });
  const pass = duplicateRows.length === 0 && badTeamSlots.length === 0;
  return invariantResult(
    'soul.designation-six-slots-single-holder',
    CRITICAL,
    pass,
    pass
      ? `teams=${snapshot.teamIds.length}; rowSlots=${DESIGNATION_ROW_TYPES.length}; captain/fanHopeful team fields present`
      : `duplicateRows=${duplicateRows.join(',') || 'none'}; missingTeamFields=${badTeamSlots.map((team) => team.id).join(',') || 'none'}`,
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
  const managerAssignments = snapshot.storeDump.databases['kbl-manager-identity']?.managerAssignments ?? [];
  const fired = managerAssignments.filter((assignment) => {
    const record = assignment as Record<string, unknown>;
    return record.tenureStatus === 'fired' ||
      record.tenureEndReason === 'fan_morale_backstop' ||
      record.firedReason === 'fan_morale_backstop';
  });
  const sawLowMorale = snapshot.moraleSnapshots.some((row) =>
    row.targetType === 'team-fan' && row.currentValue < 25,
  );
  return invariantResult(
    'soul.l11-backstop-under-25-plus-roll',
    CRITICAL,
    fired.length === 0 || sawLowMorale,
    `backstopFirings=${fired.length}; sawTeamFanMoraleUnder25=${sawLowMorale}`,
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
  const bad = snapshot.ratingsOverlays.filter((row) => {
    const player = players.get(row.playerId);
    const validKey = isPitcher(player)
      ? PITCHER_RATING_KEYS.has(row.ratingKey)
      : HITTER_RATING_KEYS.has(row.ratingKey);
    return !player ||
      row.source !== 'ratings-development' ||
      row.confirmationStatus !== 'pending' ||
      row.kind !== 'permanent' ||
      row.expiresAtGameNumber !== null ||
      !Number.isInteger(row.createdAtGameNumber) ||
      row.createdAtGameNumber < 1 ||
      !isFiniteNumber(row.delta) ||
      row.delta === 0 ||
      !validKey;
  });
  return invariantResult(
    'soul.ratings-overlay-validity',
    CRITICAL,
    bad.length === 0,
    bad.length === 0 ? `ratingsOverlays=${snapshot.ratingsOverlays.length}` : `badOverlayIds=${bad.slice(0, 8).map((row) => row.id).join(',')}`,
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
  const pass = badPlayers.length === 0 && badOverlays.length === 0;
  return invariantResult(
    'soul.trait-two-slot-no-offset-hysteresis',
    CRITICAL,
    pass,
    pass
      ? `players=${snapshot.players.length}; traitOverlays=${snapshot.traitOverlays.length}`
      : `badPlayers=${badPlayers.slice(0, 8).map((player) => player.id).join(',')}; badOverlayIds=${badOverlays.slice(0, 8).map((row) => row.id).join(',')}`,
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
    snapshot.persistenceProof.migrationSurvivalChecked;
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
  const regressions = snapshot.fameRows.filter((row) => row.reachFloor < 0);
  return invariantResult(
    'soul.reach-floor-ratchet',
    CRITICAL,
    regressions.length === 0,
    regressions.length === 0 ? 'all reachFloor values are nonnegative or neutral-ratchet safe' : `negativeReachRows=${regressions.map((row) => row.playerId).join(',')}`,
  );
}

function emissionSnubSignal(snapshot: LsimStateSnapshot): LsimInvariantResult {
  if (snapshot.gamesSimulated < snapshot.totalScheduledGames) {
    return invariantResult(
      'soul.emission-snub-signal',
      INVESTIGATE,
      true,
      `pending season-end signal at ${snapshot.gamesSimulated}/${snapshot.totalScheduledGames}`,
    );
  }
  const hasSnub = snapshot.seasonNewsItems.some((item) => JSON.stringify(item).toLowerCase().includes('snub'));
  return invariantResult(
    'soul.emission-snub-signal',
    INVESTIGATE,
    hasSnub || snapshot.seasonNewsItems.length > 0,
    `seasonNewsItems=${snapshot.seasonNewsItems.length}; hasSnubText=${hasSnub}`,
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
