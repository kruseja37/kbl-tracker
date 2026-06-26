import { describe, expect, test } from 'vitest';

import { buildStadiumRecordFameHeatBumps } from '../franchiseStadiumRecordFame';
import type {
  FranchiseStadiumRecordChange,
  FranchiseStadiumRecordType,
} from '../franchiseStadiumRecordsStorage';

function stadiumChange(
  overrides: Partial<FranchiseStadiumRecordChange> & {
    recordType: FranchiseStadiumRecordType;
    changeKind: FranchiseStadiumRecordChange['changeKind'];
    newLeaderPlayerIds: string[];
  },
): FranchiseStadiumRecordChange {
  return {
    stadiumId: 'stadium-1',
    recordType: overrides.recordType,
    recordKey: 'overall',
    changeKind: overrides.changeKind,
    priorValue: overrides.priorValue ?? (overrides.changeKind === 'set' ? null : 400),
    priorLeaderPlayerIds: overrides.priorLeaderPlayerIds ?? [],
    newValue: overrides.newValue ?? 425,
    newLeaderPlayerIds: overrides.newLeaderPlayerIds,
  };
}

describe('buildStadiumRecordFameHeatBumps', () => {
  test('SET on a positive iconic record gives the new holder a weighted glory bump', () => {
    const bumps = buildStadiumRecordFameHeatBumps([
      stadiumChange({
        recordType: 'farthest-hr-rhb',
        changeKind: 'set',
        newLeaderPlayerIds: ['new-hero'],
      }),
    ]);

    expect(bumps).toEqual([{ playerId: 'new-hero', heatDelta: 3 }]);
  });

  test('OVERTAKE on a positive iconic record rewards the breaker and dings every prior holder', () => {
    const bumps = buildStadiumRecordFameHeatBumps([
      stadiumChange({
        recordType: 'farthest-hr-rhb',
        changeKind: 'overtake',
        priorLeaderPlayerIds: ['prior-a', 'prior-b'],
        newLeaderPlayerIds: ['breaker'],
      }),
    ]);

    expect(bumps).toEqual([
      { playerId: 'breaker', heatDelta: 2.25 },
      { playerId: 'prior-a', heatDelta: -1.5 },
      { playerId: 'prior-b', heatDelta: -1.5 },
    ]);
  });

  test('negative records move heat in the opposite direction and relieve overtaken prior holders', () => {
    const setBumps = buildStadiumRecordFameHeatBumps([
      stadiumChange({
        recordType: 'most-hr-allowed-pitcher',
        changeKind: 'set',
        newLeaderPlayerIds: ['new-infamy-holder'],
      }),
    ]);
    const overtakeBumps = buildStadiumRecordFameHeatBumps([
      stadiumChange({
        recordType: 'most-hr-allowed-pitcher',
        changeKind: 'overtake',
        priorLeaderPlayerIds: ['relieved-prior'],
        newLeaderPlayerIds: ['new-worst'],
      }),
    ]);

    expect(setBumps).toEqual([{ playerId: 'new-infamy-holder', heatDelta: -2 }]);
    expect(overtakeBumps).toEqual([
      { playerId: 'new-worst', heatDelta: -1.5 },
      { playerId: 'relieved-prior', heatDelta: 1 },
    ]);
  });

  test('zero-polarity records produce no fame bumps', () => {
    const bumps = buildStadiumRecordFameHeatBumps([
      stadiumChange({
        recordType: 'highest-team-runs-game',
        changeKind: 'set',
        newLeaderPlayerIds: ['team-record-player'],
      }),
    ]);

    expect(bumps).toEqual([]);
  });

  test('aggregates per player, drops exact zero nets, and returns sorted output', () => {
    const bumps = buildStadiumRecordFameHeatBumps([
      stadiumChange({
        recordType: 'most-hr-here-season',
        changeKind: 'overtake',
        priorLeaderPlayerIds: ['old-holder'],
        newLeaderPlayerIds: ['net-zero'],
      }),
      stadiumChange({
        recordType: 'farthest-hr-rhb',
        changeKind: 'overtake',
        priorLeaderPlayerIds: ['net-zero'],
        newLeaderPlayerIds: ['z-breaker'],
      }),
    ]);

    expect(bumps).toEqual([
      { playerId: 'old-holder', heatDelta: -1 },
      { playerId: 'z-breaker', heatDelta: 2.25 },
    ]);
  });
});
