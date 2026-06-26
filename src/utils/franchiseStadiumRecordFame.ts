import {
  FRANCHISE_STADIUM_RECORD_TYPE_POLARITY,
  type FranchiseStadiumRecordChange,
  type FranchiseStadiumRecordType,
} from './franchiseStadiumRecordsStorage';

export const STADIUM_RECORD_FAME_BASE = {
  set: 2.0, // §16 SIM-TUNE placeholder (shape locked, value tunable)
  break: 1.5, // §16 SIM-TUNE placeholder (shape locked, value tunable)
  overtaken: 1.0, // §16 SIM-TUNE placeholder (shape locked, value tunable)
} as const;

export const STADIUM_RECORD_FAME_WEIGHT: Partial<Record<FranchiseStadiumRecordType, number>> = {
  'farthest-hr-rhb': 1.5, // §16 SIM-TUNE placeholder (shape locked, value tunable)
  'farthest-hr-lhb': 1.5, // §16 SIM-TUNE placeholder (shape locked, value tunable)
  'largest-positive-wpa-swing': 1.5, // §16 SIM-TUNE placeholder (shape locked, value tunable)
  'largest-negative-wpa-swing': 1.5, // §16 SIM-TUNE placeholder (shape locked, value tunable)
};

export function stadiumRecordFameWeight(recordType: FranchiseStadiumRecordType): number {
  return STADIUM_RECORD_FAME_WEIGHT[recordType] ?? 1.0;
}

export function buildStadiumRecordFameHeatBumps(
  changes: FranchiseStadiumRecordChange[],
): Array<{ playerId: string; heatDelta: number }> {
  const bumpByPlayer = new Map<string, number>();

  for (const change of changes) {
    const s = FRANCHISE_STADIUM_RECORD_TYPE_POLARITY[change.recordType];
    if (s === 0) continue;

    const w = stadiumRecordFameWeight(change.recordType);
    const newHolderBase = change.changeKind === 'set'
      ? STADIUM_RECORD_FAME_BASE.set
      : STADIUM_RECORD_FAME_BASE.break;

    for (const playerId of change.newLeaderPlayerIds) {
      addBump(bumpByPlayer, playerId, newHolderBase * s * w);
    }

    if (change.changeKind === 'overtake') {
      for (const playerId of change.priorLeaderPlayerIds) {
        addBump(bumpByPlayer, playerId, -(STADIUM_RECORD_FAME_BASE.overtaken) * s * w);
      }
    }
  }

  return Array.from(bumpByPlayer.entries())
    .filter(([, heatDelta]) => heatDelta !== 0)
    .map(([playerId, heatDelta]) => ({ playerId, heatDelta }))
    .sort((left, right) => left.playerId.localeCompare(right.playerId));
}

function addBump(bumpByPlayer: Map<string, number>, playerId: string, heatDelta: number): void {
  bumpByPlayer.set(playerId, (bumpByPlayer.get(playerId) ?? 0) + heatDelta);
}
