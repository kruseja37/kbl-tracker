import type {
  LeagueBuilderMlbDraftSession,
  SnakeDraftManifest,
  SnakeDraftTradeRecord,
} from './leagueBuilderStorage';
import {
  readSnakeDraftTruth,
  validateSnakeRosterHandoff,
} from './snakeDraftManifest';

/** Separate deterministic authority key for the FARM leg of the startup snake. */
export const FARM_SNAKE_SESSION_NUMBER = 2;
export const FARM_SLOT_SALARY_UNIT = 1_000;

const CANONICAL_MLB_SNAKE_ROUNDS = 22;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function structurallyEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((value, index) => structurallyEqual(value, right[index]));
  }
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return structurallyEqual(leftKeys, rightKeys)
    && leftKeys.every((key) => structurallyEqual(leftRecord[key], rightRecord[key]));
}

function roundFarmSalaryToUnit(value: number, unit: number): number {
  return Math.round(value / unit) * unit;
}

/** Deterministic descending slot curve for an already-rounded salary target. */
export function buildFarmSlotTableFromTarget(
  totalPicks: number,
  target: number,
  salaryUnit = FARM_SLOT_SALARY_UNIT,
): number[] {
  if (!Number.isInteger(totalPicks) || totalPicks < 1) {
    throw new Error('Farm slot table requires at least one pick.');
  }
  if (!Number.isFinite(salaryUnit) || salaryUnit <= 0) {
    throw new Error('Farm slot salary unit must be positive and finite.');
  }
  if (!Number.isFinite(target) || target <= 0 || target % salaryUnit !== 0) {
    throw new Error('Farm slot table requires a positive target aligned to its salary unit.');
  }
  if (target < totalPicks * salaryUnit) {
    throw new Error('Farm slot table target cannot fund one salary unit per pick.');
  }
  if (totalPicks === 1) return [target];

  const apportionedFallback = (): number[] => {
    const ratio = 3 ** (-1 / (totalPicks - 1));
    const weights = Array.from({ length: totalPicks }, (_, index) => ratio ** index);
    const units = Array.from({ length: totalPicks }, () => 1);
    let remainingUnits = (target / salaryUnit) - totalPicks;
    while (remainingUnits > 0) {
      let selected = 0;
      let selectedScore = -1;
      for (let index = 0; index < totalPicks; index += 1) {
        const score = weights[index] / (units[index] + 1);
        if (score > selectedScore) {
          selected = index;
          selectedScore = score;
        }
      }
      units[selected] += 1;
      remainingUnits -= 1;
    }
    return units.map((count) => count * salaryUnit);
  };

  if (totalPicks === 2) return apportionedFallback();

  const ratio = 3 ** (-1 / (totalPicks - 1));
  const weights = Array.from({ length: totalPicks }, (_, index) => ratio ** index);
  const scale = target / weights.reduce((sum, weight) => sum + weight, 0);
  const last = Math.max(salaryUnit, roundFarmSalaryToUnit(scale * weights.at(-1)!, salaryUnit));
  const table = weights.map((weight) => (
    Math.max(salaryUnit, roundFarmSalaryToUnit(scale * weight, salaryUnit))
  ));
  table[0] = 3 * last;
  table[table.length - 1] = last;

  let remainder = target - table.reduce((sum, salary) => sum + salary, 0);
  const direction = Math.sign(remainder);
  let guard = 0;
  while (remainder !== 0 && guard < totalPicks * totalPicks * 20) {
    let changed = false;
    const indexes = direction > 0
      ? Array.from({ length: totalPicks - 2 }, (_, index) => index + 1)
      : Array.from({ length: totalPicks - 2 }, (_, index) => totalPicks - 2 - index);
    for (const index of indexes) {
      if (remainder === 0) break;
      const next = table[index] + direction * salaryUnit;
      if (next <= 0 || next > table[index - 1] || next < table[index + 1]) continue;
      table[index] = next;
      remainder -= direction * salaryUnit;
      changed = true;
    }
    if (!changed) break;
    guard += 1;
  }
  if (remainder !== 0) return apportionedFallback();
  return table;
}

/**
 * Recover immutable MLB draft order from mutable pick ownership. The club list
 * supplies membership only: its persisted order is league-ranking order, not
 * the shuffled/manual snake order.
 */
export function recoverCanonicalMlbSnakePickOrder(
  session: LeagueBuilderMlbDraftSession,
): LeagueBuilderMlbDraftSession['pickOrder'] {
  const corrupt = () => new Error(
    'The MLB trade history is corrupt; FARM cannot recover the original snake order.',
  );
  const setupTeamIds = session.snakeSetup?.clubs?.map((club) => club.teamId);
  const manifestTeamIds = session.draftManifest?.lockedClubs?.map((club) => club.teamId);
  const frozenTeamIds = manifestTeamIds ?? setupTeamIds;
  const trades = session.trades ?? [];
  if (
    session.draftPhase === 'FARM'
    || session.draftManifest?.phase === 'FARM'
    || session.rounds !== CANONICAL_MLB_SNAKE_ROUNDS
    || !Array.isArray(frozenTeamIds)
    || frozenTeamIds.length === 0
    || frozenTeamIds.some((teamId) => typeof teamId !== 'string' || teamId.length === 0)
    || new Set(frozenTeamIds).size !== frozenTeamIds.length
    || !Array.isArray(session.pickOrder)
    || session.pickOrder.length !== frozenTeamIds.length * CANONICAL_MLB_SNAKE_ROUNDS
    || (session.trades !== undefined && !Array.isArray(session.trades))
  ) throw corrupt();

  const frozenTeamIdSet = new Set(frozenTeamIds);
  if (setupTeamIds && (
    setupTeamIds.length !== frozenTeamIdSet.size
    || setupTeamIds.some((teamId) => !frozenTeamIdSet.has(teamId))
  )) throw corrupt();

  if (session.draftManifest && (
    session.pickOrder.length !== session.draftManifest.pickOrder.length
    || session.pickOrder.some((slot, index) => {
      const frozenSlot = session.draftManifest!.pickOrder[index];
      return slot.round !== frozenSlot.round
        || slot.pick !== frozenSlot.pick
        || slot.teamId !== frozenSlot.teamId;
    })
  )) throw corrupt();

  const currentOwnership = session.draftManifest?.pickOrder ?? session.pickOrder;
  const recovered = currentOwnership.map((slot) => ({ ...slot }));
  const ownerByPick = new Map<number, string>();
  for (const [index, slot] of recovered.entries()) {
    if (
      !Number.isInteger(slot.pick)
      || slot.pick !== index + 1
      || !Number.isInteger(slot.round)
      || slot.round < 1
      || slot.round > CANONICAL_MLB_SNAKE_ROUNDS
      || !frozenTeamIdSet.has(slot.teamId)
      || ownerByPick.has(slot.pick)
    ) throw corrupt();
    ownerByPick.set(slot.pick, slot.teamId);
  }

  const seenTradeIds = new Set<string>();
  const validatedTrades: SnakeDraftTradeRecord[] = [];
  let priorAtPickIndex = -1;
  for (const rawTrade of trades as unknown[]) {
    if (!isRecord(rawTrade)) throw corrupt();
    const trade = rawTrade as unknown as SnakeDraftTradeRecord;
    if (
      typeof trade.id !== 'string'
      || trade.id.length === 0
      || seenTradeIds.has(trade.id)
      || !Number.isInteger(trade.atPickIndex)
      || trade.atPickIndex < 0
      || trade.atPickIndex > recovered.length
      || trade.atPickIndex < priorAtPickIndex
      || typeof trade.humanTeamId !== 'string'
      || typeof trade.cpuTeamId !== 'string'
      || trade.humanTeamId === trade.cpuTeamId
      || !frozenTeamIdSet.has(trade.humanTeamId)
      || !frozenTeamIdSet.has(trade.cpuTeamId)
      || !Array.isArray(trade.humanPickNumbers)
      || !Array.isArray(trade.cpuPickNumbers)
      || trade.humanPickNumbers.length === 0
      || trade.humanPickNumbers.length !== trade.cpuPickNumbers.length
    ) throw corrupt();
    const allPicks = [...trade.humanPickNumbers, ...trade.cpuPickNumbers];
    if (
      allPicks.some((pick) => (
        !Number.isInteger(pick)
        || pick < 1
        || pick > recovered.length
        || pick <= trade.atPickIndex
      ))
      || new Set(allPicks).size !== allPicks.length
    ) throw corrupt();
    seenTradeIds.add(trade.id);
    priorAtPickIndex = trade.atPickIndex;
    validatedTrades.push(trade);
  }

  for (let index = validatedTrades.length - 1; index >= 0; index -= 1) {
    const trade = validatedTrades[index];
    if (
      trade.humanPickNumbers.some((pick) => ownerByPick.get(pick) !== trade.cpuTeamId)
      || trade.cpuPickNumbers.some((pick) => ownerByPick.get(pick) !== trade.humanTeamId)
    ) throw corrupt();
    for (const pick of trade.humanPickNumbers) ownerByPick.set(pick, trade.humanTeamId);
    for (const pick of trade.cpuPickNumbers) ownerByPick.set(pick, trade.cpuTeamId);
  }
  for (const slot of recovered) slot.teamId = ownerByPick.get(slot.pick)!;

  const firstRoundOrder = recovered
    .filter((slot) => slot.round === 1)
    .map((slot) => slot.teamId);
  if (
    firstRoundOrder.length !== frozenTeamIds.length
    || new Set(firstRoundOrder).size !== frozenTeamIds.length
    || firstRoundOrder.some((teamId) => !frozenTeamIdSet.has(teamId))
  ) throw corrupt();

  const expected: LeagueBuilderMlbDraftSession['pickOrder'] = [];
  for (let round = 1; round <= CANONICAL_MLB_SNAKE_ROUNDS; round += 1) {
    const roundOrder = round % 2 === 1 ? firstRoundOrder : [...firstRoundOrder].reverse();
    for (const teamId of roundOrder) expected.push({ round, pick: expected.length + 1, teamId });
  }
  if (recovered.some((slot, index) => (
    slot.round !== expected[index].round
    || slot.pick !== expected[index].pick
    || slot.teamId !== expected[index].teamId
  ))) throw corrupt();
  return recovered;
}

function frozenSnakeTeamIds(session: LeagueBuilderMlbDraftSession): Set<string> {
  const clubs = session.snakeSetup?.clubs;
  if (!Array.isArray(clubs)) return new Set();
  const teamIds = new Set<string>();
  for (const club of clubs as unknown[]) {
    if (!isRecord(club) || typeof club.teamId !== 'string' || club.teamId.trim().length === 0) return new Set();
    if (teamIds.has(club.teamId)) return new Set();
    teamIds.add(club.teamId);
  }
  return teamIds;
}

/**
 * Single canonical creation contract used by local storage and clean-device
 * sync. Any caller that creates a season-2 authority must pass this exact gate.
 */
export function assertCanonicalMlbToFarmTransition(
  candidate: LeagueBuilderMlbDraftSession,
  expectedId: string,
  mlbAuthority: LeagueBuilderMlbDraftSession | null | undefined,
): void {
  const setup = candidate.snakeSetup;
  const slotSalaries = candidate.farmSlotSalaries;
  const snapshot = candidate.farmProspectSnapshot as unknown;
  const malformed = () => new Error('The MLB-to-FARM transition is malformed and cannot be saved.');
  const missingAuthority = () => new Error(
    'A separately persisted, completed MLB authority with roster handoff is required before FARM can open.',
  );
  let mlbManifest: SnakeDraftManifest;
  let recoveredMlbPickOrder: LeagueBuilderMlbDraftSession['pickOrder'];
  try {
    if (
      !mlbAuthority
      || mlbAuthority.id !== `${candidate.leagueId}::startup-mlb-draft::1`
      || mlbAuthority.leagueId !== candidate.leagueId
      || mlbAuthority.seasonNumber !== 1
      || mlbAuthority.currentPickIndex !== mlbAuthority.pickOrder.length
      || mlbAuthority.completedPicks.length !== mlbAuthority.pickOrder.length
    ) throw missingAuthority();
    const truth = readSnakeDraftTruth(mlbAuthority, 'MLB');
    if (!truth.manifest) throw missingAuthority();
    validateSnakeRosterHandoff(mlbAuthority, 'MLB');
    mlbManifest = truth.manifest;
    recoveredMlbPickOrder = recoverCanonicalMlbSnakePickOrder(mlbAuthority);
  } catch {
    throw missingAuthority();
  }

  const mlbTeamIds = mlbManifest.lockedClubs.map((club) => club.teamId);
  const mlbTeamIdSet = new Set(mlbTeamIds);
  const firstRoundTeamOrder = recoveredMlbPickOrder
    .filter((slot) => slot.round === 1)
    .sort((left, right) => left.pick - right.pick)
    .map((slot) => slot.teamId);
  if (
    mlbTeamIdSet.size === 0
    || mlbTeamIdSet.size !== mlbTeamIds.length
    || firstRoundTeamOrder.length !== mlbTeamIds.length
    || new Set(firstRoundTeamOrder).size !== firstRoundTeamOrder.length
    || firstRoundTeamOrder.some((teamId) => !mlbTeamIdSet.has(teamId))
  ) throw missingAuthority();

  const hasOwn = (key: keyof LeagueBuilderMlbDraftSession): boolean => (
    Object.prototype.hasOwnProperty.call(candidate, key)
  );
  const sourceClubByTeamId = new Map(mlbManifest.lockedClubs.map((club) => [club.teamId, club]));
  if (
    candidate.id !== expectedId
    || candidate.seasonNumber !== FARM_SNAKE_SESSION_NUMBER
    || candidate.leagueId !== mlbManifest.leagueId
    || candidate.workflowVersion !== 'snake-v1-farm'
    || candidate.engineMethodVersion !== 'snake-s6'
    || candidate.rounds !== 10
    || candidate.draftPhase !== 'FARM'
    || candidate.seed !== `${mlbManifest.seed}:farm`
    || candidate.tier !== mlbManifest.tier
    || candidate.balanceMode !== mlbManifest.balanceMode
    || hasOwn('draftManifest')
    || hasOwn('rosterHandoff')
    || candidate.currentPickIndex !== 0
    || candidate.revision !== 0
    || !Array.isArray(candidate.completedPicks)
    || candidate.completedPicks.length !== 0
    || hasOwn('seatBoards')
    || hasOwn('farmSeatBoards')
    || !Array.isArray(candidate.trades)
    || candidate.trades.length !== 0
    || hasOwn('openTradeOffers')
    || hasOwn('roomLogByTeamId')
    || hasOwn('versionState')
    || hasOwn('snakeCompanions')
    || hasOwn('paused')
    || !Array.isArray(candidate.correctionSnapshots)
    || candidate.correctionSnapshots.length !== 0
    || !setup
    || Object.prototype.hasOwnProperty.call(setup, 'seatingCertificate')
    || !isRecord(setup.versionSelections)
    || Object.keys(setup.versionSelections).length !== 0
    || setup.orderSeed !== mlbManifest.seed
    || !Array.isArray(setup.clubs)
    || setup.clubs.length !== firstRoundTeamOrder.length
    || setup.clubs.some((club, index) => {
      const sourceClub = sourceClubByTeamId.get(club.teamId);
      return !sourceClub
        || club.teamId !== firstRoundTeamOrder[index]
        || (club.gmName ?? null) !== sourceClub.gmName
        || club.hotseat !== sourceClub.hotseat;
    })
    || !Array.isArray(slotSalaries)
    || slotSalaries.length !== candidate.pickOrder.length
    || slotSalaries.some((salary) => (
      !Number.isInteger(salary)
      || salary <= 0
      || salary % FARM_SLOT_SALARY_UNIT !== 0
    ))
    || !Array.isArray(snapshot)
    || !isStringArray(setup.poolPlayerIds)
    || snapshot.length !== setup.poolPlayerIds.length
    || snapshot.length < candidate.pickOrder.length
  ) throw malformed();

  try {
    if (slotSalaries.length > 0) {
      for (const teamId of firstRoundTeamOrder) {
        const ownedSlots = candidate.pickOrder
          .filter((slot) => slot.teamId === teamId)
          .map((slot) => slotSalaries[slot.pick - 1]);
        if (ownedSlots.length === 0) continue;
        const target = ownedSlots.reduce((sum, salary) => sum + salary, 0);
        if (!structurallyEqual(
          ownedSlots,
          buildFarmSlotTableFromTarget(ownedSlots.length, target, FARM_SLOT_SALARY_UNIT),
        )) throw malformed();
      }
    }
  } catch {
    throw malformed();
  }

  const snapshotIds = snapshot.map((prospect) => isRecord(prospect) ? prospect.id : undefined);
  if (
    !snapshotIds.every((playerId): playerId is string => typeof playerId === 'string' && playerId.length > 0)
    || new Set(snapshotIds).size !== snapshotIds.length
    || !structurallyEqual(snapshotIds, setup.poolPlayerIds)
  ) throw malformed();

  const frozenTeamIds = frozenSnakeTeamIds(candidate);
  const roundsByTeamId = new Map(firstRoundTeamOrder.map((teamId) => [teamId, new Set<number>()]));
  if (frozenTeamIds.size !== mlbTeamIdSet.size || [...frozenTeamIds].some((teamId) => !mlbTeamIdSet.has(teamId))) {
    throw malformed();
  }
  if (candidate.pickOrder.some((slot, index) => (
    !isRecord(slot)
    || !Number.isInteger(slot.round)
    || slot.round < 1
    || slot.round > candidate.rounds
    || slot.pick !== index + 1
    || typeof slot.teamId !== 'string'
    || !frozenTeamIds.has(slot.teamId)
  ))) throw malformed();

  for (const slot of candidate.pickOrder) {
    const teamRounds = roundsByTeamId.get(slot.teamId)!;
    if (teamRounds.has(slot.round)) throw malformed();
    teamRounds.add(slot.round);
  }
  for (const rounds of roundsByTeamId.values()) {
    const count = rounds.size;
    for (let round = 1; round <= count; round += 1) {
      if (!rounds.has(round)) throw malformed();
    }
  }
  const expectedPickOrder: LeagueBuilderMlbDraftSession['pickOrder'] = [];
  for (let round = 1; round <= candidate.rounds; round += 1) {
    const roundOrder = round % 2 === 1 ? firstRoundTeamOrder : [...firstRoundTeamOrder].reverse();
    for (const teamId of roundOrder) {
      if (!roundsByTeamId.get(teamId)!.has(round)) continue;
      expectedPickOrder.push({ round, pick: expectedPickOrder.length + 1, teamId });
    }
  }
  if (!structurallyEqual(candidate.pickOrder, expectedPickOrder)) throw malformed();
}

function canonicalCreationProjection(
  session: LeagueBuilderMlbDraftSession,
): LeagueBuilderMlbDraftSession {
  const creationFields = { ...session };
  delete creationFields.draftManifest;
  delete creationFields.rosterHandoff;
  delete creationFields.seatBoards;
  delete creationFields.farmSeatBoards;
  delete creationFields.openTradeOffers;
  delete creationFields.roomLogByTeamId;
  delete creationFields.versionState;
  delete creationFields.snakeCompanions;
  delete creationFields.paused;
  return {
    ...creationFields,
    completedPicks: [],
    currentPickIndex: 0,
    revision: 0,
    trades: [],
    correctionSnapshots: [],
  };
}

/**
 * Clean-device bootstrap accepts live progress only after projecting the row
 * through the exact local-creation contract and validating every mutable fact.
 */
export function assertCanonicalFarmSyncBootstrap(
  candidate: LeagueBuilderMlbDraftSession,
  expectedId: string,
  mlbAuthority: LeagueBuilderMlbDraftSession | null | undefined,
): void {
  const malformed = () => new Error('Inbound sync carried a noncanonical FARM authority.');
  if (
    candidate.draftPhase !== 'FARM'
    || candidate.seasonNumber !== FARM_SNAKE_SESSION_NUMBER
    || !Array.isArray(candidate.trades)
    || candidate.trades.length !== 0
    || Object.prototype.hasOwnProperty.call(candidate, 'openTradeOffers')
    || !Array.isArray(candidate.completedPicks)
    || !Number.isInteger(candidate.currentPickIndex)
    || candidate.currentPickIndex < 0
    || candidate.currentPickIndex > candidate.pickOrder.length
    || candidate.completedPicks.length !== candidate.currentPickIndex
    || !Number.isInteger(candidate.revision)
    || candidate.revision! < 0
    || !Array.isArray(candidate.correctionSnapshots)
  ) throw malformed();

  try {
    assertCanonicalMlbToFarmTransition(canonicalCreationProjection(candidate), expectedId, mlbAuthority);
  } catch {
    throw malformed();
  }

  const poolPlayerIds = candidate.snakeSetup!.poolPlayerIds;
  const poolPlayerIdSet = new Set(poolPlayerIds);
  const seenPlayerIds = new Set<string>();
  for (const [index, pick] of candidate.completedPicks.entries()) {
    const slot = candidate.pickOrder[index];
    if (
      !slot
      || pick.round !== slot.round
      || pick.pick !== slot.pick
      || pick.teamId !== slot.teamId
      || typeof pick.playerId !== 'string'
      || !poolPlayerIdSet.has(pick.playerId)
      || seenPlayerIds.has(pick.playerId)
      || pick.settledSalary !== candidate.farmSlotSalaries![slot.pick - 1]
      || (pick.marginalTax !== undefined && !Number.isFinite(pick.marginalTax))
    ) throw malformed();
    seenPlayerIds.add(pick.playerId);
  }

  if (!candidate.draftManifest) {
    if (candidate.rosterHandoff) throw malformed();
    return;
  }

  try {
    const truth = readSnakeDraftTruth(candidate, 'FARM');
    const manifest = truth.manifest!;
    const lockedClubs = candidate.snakeSetup!.clubs.map((club) => ({
      teamId: club.teamId,
      gmName: club.gmName ?? null,
      hotseat: club.hotseat,
      archetypeId: club.archetypeId ?? null,
    }));
    if (
      manifest.seed !== candidate.seed
      || manifest.tier !== candidate.tier
      || manifest.balanceMode !== candidate.balanceMode
      || manifest.rounds !== candidate.rounds
      || manifest.versions.workflow !== candidate.workflowVersion
      || manifest.versions.engine !== candidate.engineMethodVersion
      || !structurallyEqual(manifest.pickOrder, candidate.pickOrder)
      || !structurallyEqual(manifest.lockedClubs, lockedClubs)
      || !structurallyEqual(manifest.pool.playerIds, [...poolPlayerIds].sort((a, b) => a.localeCompare(b)))
      || manifest.completedPicks.length !== candidate.completedPicks.length
      || manifest.completedPicks.some((pick, index) => {
        const livePick = candidate.completedPicks[index];
        return pick.round !== livePick.round
          || pick.pick !== livePick.pick
          || pick.teamId !== livePick.teamId
          || pick.playerId !== livePick.playerId
          || pick.settledSalary !== (livePick.settledSalary ?? null)
          || pick.marginalTax !== (livePick.marginalTax ?? null)
          || pick.launchSalary !== candidate.farmSlotSalaries![pick.pick - 1]
          || pick.salarySource !== 'farm-slot';
      })
    ) throw malformed();
    if (candidate.rosterHandoff) validateSnakeRosterHandoff(candidate, 'FARM');
  } catch {
    throw malformed();
  }
}
