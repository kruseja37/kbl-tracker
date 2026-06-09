import {
  getAllFranchisePlayers,
  saveFranchisePlayer,
  type Player,
} from './franchisePlayerStorage';
import type {
  FranchiseDesignationEligibilityRecord,
  FranchiseDesignationEligibilityReport,
} from './franchiseDesignationEligibility';

export type FranchiseDesignationType =
  | 'TEAM_MVP'
  | 'ACE'
  | 'FAN_FAVORITE'
  | 'ALBATROSS';

export type FranchiseActiveDesignationType = 'TEAM_MVP' | 'ACE';

export type FranchiseDesignationStatus = 'projected' | 'locked' | 'active';

export const FRANCHISE_DESIGNATION_CALCULATION_VERSION = 'franchise-designations-v1-stable-inputs';
export const FRANCHISE_ACTIVE_DESIGNATION_CALCULATION_VERSION = 'franchise-designations-v1-active-team-mvp-ace';
export const FRANCHISE_ALBATROSS_TRADE_VALUE_MULTIPLIER = 0.85;

export interface FranchiseDesignationPlayerInput {
  playerId: string;
  playerName: string;
  teamId: string;
  position: string;
  salary?: number;
  trueValue?: number;
  gamesPlayed?: number;
  totalWAR?: number;
  pWAR?: number;
}

export interface FranchiseDesignationContext {
  franchiseId: string;
  seasonId: string;
  seasonNumber: number;
  gamesPerTeam: number;
  leagueMinSalary?: number;
  seasonProgress: number;
  calculatedAt?: string;
}

export interface FranchisePlayerDesignationRecord {
  franchiseId: string;
  seasonId: string;
  statsScopeId?: string;
  seasonNumber: number;
  teamId: string;
  playerId: string;
  playerName: string;
  type: FranchiseDesignationType;
  status: FranchiseDesignationStatus;
  sourceInputs: Record<string, number | string | null>;
  sourceEvidence?: string[];
  calculationVersion: string;
  calculatedAt: string;
  lockedAt?: string;
}

type PlayerWithDesignations = Player & {
  franchiseDesignations?: FranchisePlayerDesignationRecord[];
};

export interface DesignationEvent {
  id: string;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  teamId: string;
  playerId: string;
  designationType: FranchiseActiveDesignationType;
  previousState: FranchisePlayerDesignationRecord | null;
  newState: FranchisePlayerDesignationRecord;
  sourceEvidence: string[];
  trustReason: string;
  effectCategory: 'designation-earned' | 'designation-changed';
  createdAt: string;
  sourceGameId?: string;
  sourceArchiveId?: string;
}

export interface FranchiseActiveDesignationSyncResult {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  activeDesignations: FranchisePlayerDesignationRecord[];
  designationEvents: DesignationEvent[];
  savedPlayers: Player[];
  skippedRecords: Array<{
    playerId: string;
    designationType: string;
    reasons: string[];
  }>;
  moraleMutationApplied: false;
  relationshipMutationApplied: false;
  salaryMovementApplied: false;
  mode3HandoffApplied: false;
}

const PITCHING_POSITIONS = new Set(['SP', 'RP', 'CP', 'SP/RP', 'P', 'TWO-WAY']);

function finite(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isPitchingPosition(position: string): boolean {
  return PITCHING_POSITIONS.has(String(position).trim().toUpperCase());
}

function statusFor(progress: number): FranchiseDesignationStatus {
  return progress >= 1 ? 'locked' : 'projected';
}

function makeRecord(
  player: FranchiseDesignationPlayerInput,
  context: FranchiseDesignationContext,
  type: FranchiseDesignationType,
  sourceInputs: FranchisePlayerDesignationRecord['sourceInputs'],
): FranchisePlayerDesignationRecord {
  const status = statusFor(context.seasonProgress);
  const calculatedAt = context.calculatedAt ?? new Date().toISOString();

  return {
    franchiseId: context.franchiseId,
    seasonId: context.seasonId,
    seasonNumber: context.seasonNumber,
    teamId: player.teamId,
    playerId: player.playerId,
    playerName: player.playerName,
    type,
    status,
    sourceInputs,
    calculationVersion: FRANCHISE_DESIGNATION_CALCULATION_VERSION,
    calculatedAt,
    lockedAt: status === 'locked' ? calculatedAt : undefined,
  };
}

function isActiveDesignationType(
  designationType: string,
): designationType is FranchiseActiveDesignationType {
  return designationType === 'TEAM_MVP' || designationType === 'ACE';
}

function activeDesignationKey(designation: {
  franchiseId: string;
  seasonId: string;
  statsScopeId?: string;
  seasonNumber: number;
  teamId: string;
  type: string;
}): string {
  return [
    designation.franchiseId,
    designation.seasonId,
    designation.statsScopeId ?? '',
    designation.seasonNumber,
    designation.teamId,
    designation.type,
  ].join(':');
}

function playerDesignationRecords(player: Player): FranchisePlayerDesignationRecord[] {
  return ((player as PlayerWithDesignations).franchiseDesignations ?? [])
    .filter((designation): designation is FranchisePlayerDesignationRecord => Boolean(designation));
}

function activeRecordFromEligibility(
  record: FranchiseDesignationEligibilityRecord,
  calculatedAt: string,
): FranchisePlayerDesignationRecord | null {
  if (!isActiveDesignationType(record.designationType)) return null;
  if (record.status !== 'active' || !record.persistable || !record.teamId) return null;

  const sourceInputs: FranchisePlayerDesignationRecord['sourceInputs'] = {
    status: record.status,
    trust: record.designationType === 'ACE' ? 'ace-war-consumer-trust' : 'team-mvp-war-consumer-trust',
    seasonStatsAvailable: record.sourceInputs.seasonStatsAvailable ? 'true' : 'false',
    seasonMetadataAvailable: record.sourceInputs.seasonMetadataAvailable ? 'true' : 'false',
    seedParkFactorsAvailable: record.sourceInputs.seedParkFactorsAvailable ? 'true' : 'false',
    totalWAR: record.sourceInputs.totalWar ?? null,
    pWAR: record.sourceInputs.pitchingWar ?? null,
  };

  return {
    franchiseId: record.franchiseId,
    seasonId: record.seasonId,
    statsScopeId: record.statsScopeId,
    seasonNumber: record.seasonNumber,
    teamId: record.teamId,
    playerId: record.playerId,
    playerName: record.playerName,
    type: record.designationType,
    status: 'active',
    sourceInputs,
    sourceEvidence: [
      ...record.reasons,
      ...record.limitations,
    ],
    calculationVersion: FRANCHISE_ACTIVE_DESIGNATION_CALCULATION_VERSION,
    calculatedAt,
  };
}

function hasSameDesignationState(
  previous: FranchisePlayerDesignationRecord | null,
  next: FranchisePlayerDesignationRecord,
): boolean {
  return Boolean(
    previous &&
    previous.franchiseId === next.franchiseId &&
    previous.seasonId === next.seasonId &&
    (previous.statsScopeId ?? '') === (next.statsScopeId ?? '') &&
    previous.seasonNumber === next.seasonNumber &&
    previous.playerId === next.playerId &&
    previous.teamId === next.teamId &&
    previous.type === next.type &&
    previous.status === next.status &&
    previous.calculationVersion === next.calculationVersion &&
    hasSameSourceInputs(previous.sourceInputs, next.sourceInputs) &&
    hasSameSourceEvidence(previous.sourceEvidence, next.sourceEvidence),
  );
}

function normalizedSourceInputs(
  sourceInputs: FranchisePlayerDesignationRecord['sourceInputs'],
): string {
  return JSON.stringify(
    Object.keys(sourceInputs)
      .sort()
      .map((key) => [key, sourceInputs[key] ?? null]),
  );
}

function hasSameSourceInputs(
  previous: FranchisePlayerDesignationRecord['sourceInputs'],
  next: FranchisePlayerDesignationRecord['sourceInputs'],
): boolean {
  return normalizedSourceInputs(previous) === normalizedSourceInputs(next);
}

function hasSameSourceEvidence(
  previous: FranchisePlayerDesignationRecord['sourceEvidence'],
  next: FranchisePlayerDesignationRecord['sourceEvidence'],
): boolean {
  return JSON.stringify(previous ?? []) === JSON.stringify(next ?? []);
}

function designationEvent(
  previousState: FranchisePlayerDesignationRecord | null,
  newState: FranchisePlayerDesignationRecord,
  createdAt: string,
): DesignationEvent {
  const effectCategory = previousState ? 'designation-changed' : 'designation-earned';
  return {
    id: [
      'designation-event',
      newState.franchiseId,
      newState.seasonId,
      newState.statsScopeId ?? newState.seasonId,
      newState.seasonNumber,
      newState.teamId,
      newState.type,
      previousState?.playerId ?? 'none',
      newState.playerId,
      createdAt,
    ].join(':'),
    franchiseId: newState.franchiseId,
    seasonId: newState.seasonId,
    statsScopeId: newState.statsScopeId ?? newState.seasonId,
    seasonNumber: newState.seasonNumber,
    teamId: newState.teamId,
    playerId: newState.playerId,
    designationType: newState.type as FranchiseActiveDesignationType,
    previousState,
    newState,
    sourceEvidence: newState.sourceEvidence ?? [],
    trustReason: String(newState.sourceInputs.trust ?? 'trusted scoped WAR consumer gate'),
    effectCategory,
    createdAt,
  };
}

function activeRecordsFromEligibility(
  report: FranchiseDesignationEligibilityReport,
  calculatedAt: string,
): {
  records: FranchisePlayerDesignationRecord[];
  skippedRecords: FranchiseActiveDesignationSyncResult['skippedRecords'];
} {
  const records: FranchisePlayerDesignationRecord[] = [];
  const skippedRecords: FranchiseActiveDesignationSyncResult['skippedRecords'] = [];

  for (const record of report.records) {
    if (!isActiveDesignationType(record.designationType)) {
      if (record.status !== 'blocked') {
        skippedRecords.push({
          playerId: record.playerId,
          designationType: record.designationType,
          reasons: [`${record.designationType} is not promoted in this v1 active designation slice.`],
        });
      }
      continue;
    }

    const active = activeRecordFromEligibility(record, calculatedAt);
    if (active) {
      records.push(active);
    } else {
      skippedRecords.push({
        playerId: record.playerId,
        designationType: record.designationType,
        reasons: record.reasons.length > 0 ? record.reasons : ['Eligibility record is not active/persistable.'],
      });
    }
  }

  return { records, skippedRecords };
}

function mergeActiveDesignationsForPlayer(
  player: Player,
  activeRecords: FranchisePlayerDesignationRecord[],
  replacementKeys: Set<string>,
): Player {
  const activeByKey = new Map<string, FranchisePlayerDesignationRecord>();
  for (const designation of activeRecords) {
    activeByKey.set(activeDesignationKey(designation), designation);
  }

  const usedKeys = new Set<string>();
  const current = playerDesignationRecords(player);
  const nextDesignations: FranchisePlayerDesignationRecord[] = [];

  for (const designation of current) {
    if (!isActiveDesignationType(designation.type) || designation.status !== 'active') {
      nextDesignations.push(designation);
      continue;
    }

    const key = activeDesignationKey(designation);
    if (!replacementKeys.has(key)) {
      nextDesignations.push(designation);
      continue;
    }

    const replacement = activeByKey.get(key);
    if (replacement && replacement.playerId === player.id) {
      nextDesignations.push(replacement);
      usedKeys.add(key);
    }
  }

  for (const designation of activeRecords) {
    if (designation.playerId !== player.id) continue;
    const key = activeDesignationKey(designation);
    if (usedKeys.has(key)) continue;
    nextDesignations.push(designation);
  }

  return {
    ...player,
    franchiseDesignations: nextDesignations,
  } as Player;
}

function replacementKeysFromEligibility(report: FranchiseDesignationEligibilityReport): Set<string> {
  return new Set(
    report.records
      .filter((record) => isActiveDesignationType(record.designationType) && record.teamId)
      .map((record) => activeDesignationKey({
        franchiseId: record.franchiseId,
        seasonId: record.seasonId,
        statsScopeId: record.statsScopeId,
        seasonNumber: record.seasonNumber,
        teamId: record.teamId!,
        type: record.designationType,
      })),
  );
}

function previousActiveByKey(players: Player[]): Map<string, FranchisePlayerDesignationRecord> {
  const previous = new Map<string, FranchisePlayerDesignationRecord>();
  for (const player of players) {
    for (const designation of playerDesignationRecords(player)) {
      if (!isActiveDesignationType(designation.type) || designation.status !== 'active') continue;
      previous.set(activeDesignationKey(designation), designation);
    }
  }
  return previous;
}

function preserveUnchangedActiveDesignationMetadata(
  designations: FranchisePlayerDesignationRecord[],
  previousByKey: Map<string, FranchisePlayerDesignationRecord>,
): FranchisePlayerDesignationRecord[] {
  return designations.map((designation) => {
    const previous = previousByKey.get(activeDesignationKey(designation)) ?? null;
    return hasSameDesignationState(previous, designation) ? previous! : designation;
  });
}

function playerChanged(left: Player, right: Player): boolean {
  return JSON.stringify((left as PlayerWithDesignations).franchiseDesignations ?? []) !==
    JSON.stringify((right as PlayerWithDesignations).franchiseDesignations ?? []);
}

function byTeam(players: FranchiseDesignationPlayerInput[]): Map<string, FranchiseDesignationPlayerInput[]> {
  const grouped = new Map<string, FranchiseDesignationPlayerInput[]>();
  for (const player of players) {
    const current = grouped.get(player.teamId) ?? [];
    current.push(player);
    grouped.set(player.teamId, current);
  }
  return grouped;
}

function selectHighest(
  players: FranchiseDesignationPlayerInput[],
  value: (player: FranchiseDesignationPlayerInput) => number | undefined,
): FranchiseDesignationPlayerInput | null {
  return [...players]
    .filter((player) => value(player) != null)
    .sort((left, right) => {
      const diff = (value(right) ?? 0) - (value(left) ?? 0);
      return diff || left.playerId.localeCompare(right.playerId);
    })[0] ?? null;
}

export function calculateFranchiseDesignations(
  players: FranchiseDesignationPlayerInput[],
  context: FranchiseDesignationContext,
): FranchisePlayerDesignationRecord[] {
  const records: FranchisePlayerDesignationRecord[] = [];

  for (const teamPlayers of byTeam(players).values()) {
    const mvp = selectHighest(
      teamPlayers.filter((player) => !isPitchingPosition(player.position)),
      (player) => finite(player.totalWAR),
    );
    if (mvp && (finite(mvp.totalWAR) ?? 0) > 0) {
      records.push(makeRecord(mvp, context, 'TEAM_MVP', {
        totalWAR: finite(mvp.totalWAR) ?? null,
      }));
    }

    const ace = selectHighest(
      teamPlayers.filter((player) => isPitchingPosition(player.position)),
      (player) => finite(player.pWAR),
    );
    if (ace && (finite(ace.pWAR) ?? 0) >= 0.5) {
      records.push(makeRecord(ace, context, 'ACE', {
        pWAR: finite(ace.pWAR) ?? null,
      }));
    }
  }

  return records;
}

export function applyFranchiseDesignationsToPlayers(
  players: Player[],
  designations: FranchisePlayerDesignationRecord[],
): Player[] {
  const designationsByPlayer = new Map<string, FranchisePlayerDesignationRecord[]>();
  for (const designation of designations) {
    const rows = designationsByPlayer.get(designation.playerId) ?? [];
    rows.push(designation);
    designationsByPlayer.set(designation.playerId, rows);
  }

  return players.map((player) => {
    const current = (player as PlayerWithDesignations).franchiseDesignations ?? [];
    const replacementKeys = new Set(
      designations
        .filter((designation) => designation.playerId === player.id)
        .map((designation) => `${designation.seasonId}:${designation.type}`),
    );
    const retained = current.filter(
      (designation) => !replacementKeys.has(`${designation.seasonId}:${designation.type}`),
    );
    const next = designationsByPlayer.get(player.id) ?? [];
    return {
      ...player,
      franchiseDesignations: [...retained, ...next],
    } as Player;
  });
}

export function updateFranchiseDesignationTeamForTrade(
  player: Player,
  fromTeamId: string,
  toTeamId: string,
): Player {
  const designations = (player as PlayerWithDesignations).franchiseDesignations;
  if (!designations?.length) return player;

  return {
    ...player,
    franchiseDesignations: designations.map((designation) =>
      designation.teamId === fromTeamId
        ? {
            ...designation,
            teamId: toTeamId,
            sourceInputs: {
              ...designation.sourceInputs,
              previousTeamId: fromTeamId,
            },
          }
        : designation,
    ),
  } as Player;
}

export async function persistFranchiseDesignationsForPlayers(
  franchiseId: string,
  players: Player[],
  designations: FranchisePlayerDesignationRecord[],
): Promise<Player[]> {
  const updatedPlayers = applyFranchiseDesignationsToPlayers(players, designations);
  const designationPlayerIds = new Set(designations.map((designation) => designation.playerId));
  const saved: Player[] = [];

  for (const player of updatedPlayers) {
    if (!designationPlayerIds.has(player.id)) continue;
    saved.push(await saveFranchisePlayer(franchiseId, player));
  }

  return saved;
}

export async function syncActiveTeamMvpAceDesignationsFromEligibility(
  report: FranchiseDesignationEligibilityReport,
  options: {
    franchiseId?: string;
    players?: Player[];
    calculatedAt?: string;
  } = {},
): Promise<FranchiseActiveDesignationSyncResult> {
  const calculatedAt = options.calculatedAt ?? new Date().toISOString();
  const franchiseId = options.franchiseId ?? report.franchiseId;
  const players = options.players ?? await getAllFranchisePlayers(franchiseId);
  const { records: candidateActiveDesignations, skippedRecords } = activeRecordsFromEligibility(report, calculatedAt);
  const replacementKeys = replacementKeysFromEligibility(report);
  const previousByKey = previousActiveByKey(players);
  const activeDesignations = preserveUnchangedActiveDesignationMetadata(
    candidateActiveDesignations,
    previousByKey,
  );
  const designationEvents = activeDesignations
    .map((designation) => {
      const previous = previousByKey.get(activeDesignationKey(designation)) ?? null;
      if (hasSameDesignationState(previous, designation)) return null;
      return designationEvent(previous, designation, calculatedAt);
    })
    .filter((event): event is DesignationEvent => Boolean(event));

  const savedPlayers: Player[] = [];
  for (const player of players) {
    const next = mergeActiveDesignationsForPlayer(player, activeDesignations, replacementKeys);
    if (!playerChanged(player, next)) continue;
    savedPlayers.push(await saveFranchisePlayer(franchiseId, next));
  }

  return {
    franchiseId,
    seasonId: report.seasonId,
    statsScopeId: report.statsScopeId,
    seasonNumber: report.seasonNumber,
    activeDesignations,
    designationEvents,
    savedPlayers,
    skippedRecords,
    moraleMutationApplied: false,
    relationshipMutationApplied: false,
    salaryMovementApplied: false,
    mode3HandoffApplied: false,
  };
}
