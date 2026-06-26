import { describe, expect, it } from 'vitest';
import {
  buildFranchiseStadiumRecordSeasonNewsEvent,
  STADIUM_RECORD_NEWS_DRAMATIC_WEIGHT,
  type FranchiseStadiumRecordNewsInput,
} from '../franchiseStadiumRecordNewsAdapter';

const FRANCHISE_ID = 'franchise-1';
const SEASON_ID = 'season-4';
const SEASON_NUMBER = 4;

function stadiumRecordInput(
  overrides: Partial<FranchiseStadiumRecordNewsInput> = {},
): FranchiseStadiumRecordNewsInput {
  return {
    franchiseId: FRANCHISE_ID,
    seasonId: SEASON_ID,
    seasonNumber: SEASON_NUMBER,
    stadiumName: 'Swagger Center',
    triggerPhase: 'in-season',
    change: {
      stadiumId: 'stadium-9',
      recordType: 'farthest-hr-rhb',
      recordKey: 'stadium-9:farthest-hr-rhb',
      changeKind: 'set',
      priorValue: null,
      priorLeaderPlayerIds: [],
      newValue: 472,
      newLeaderPlayerIds: ['player-new'],
    },
    ...overrides,
  };
}

function build(overrides: Partial<FranchiseStadiumRecordNewsInput> = {}) {
  return buildFranchiseStadiumRecordSeasonNewsEvent(
    stadiumRecordInput(overrides),
  );
}

describe('buildFranchiseStadiumRecordSeasonNewsEvent', () => {
  it('maps a set farthest-hr-rhb change to STADIUM_RECORD with verbatim deterministic facts', () => {
    const result = build();

    expect(result).toEqual({
      franchiseId: FRANCHISE_ID,
      seasonId: SEASON_ID,
      seasonNumber: SEASON_NUMBER,
      eventType: 'STADIUM_RECORD',
      subjectIds: ['player-new'],
      facts: {
        recordType: 'farthest-hr-rhb',
        recordKey: 'stadium-9:farthest-hr-rhb',
        stadiumId: 'stadium-9',
        stadiumName: 'Swagger Center',
        changeKind: 'set',
        newValue: 472,
        oldValue: null,
        newHolderIds: ['player-new'],
        overtakenHolderIds: [],
        batterHand: 'R',
        playContext: null,
        triggerPhase: 'in-season',
      },
      dramaticWeight:
        STADIUM_RECORD_NEWS_DRAMATIC_WEIGHT.setBase +
        STADIUM_RECORD_NEWS_DRAMATIC_WEIGHT.magnitudeScale * 0.5,
    });
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('createdAt');
  });

  it('maps an overtake with priorValue and scales drama by computed magnitude', () => {
    const result = build({
      triggerPhase: 'season-end',
      change: {
        stadiumId: 'stadium-9',
        recordType: 'farthest-hr-lhb',
        recordKey: 'stadium-9:farthest-hr-lhb',
        changeKind: 'overtake',
        priorValue: 400,
        priorLeaderPlayerIds: ['player-old-1', 'player-old-2'],
        newValue: 460,
        newLeaderPlayerIds: ['player-new-lhb'],
      },
    });

    const magnitude = 60 / 400;
    expect(result.eventType).toBe('STADIUM_RECORD');
    expect(result.subjectIds).toEqual([
      'player-new-lhb',
      'player-old-1',
      'player-old-2',
    ]);
    expect(result.facts).toEqual({
      recordType: 'farthest-hr-lhb',
      recordKey: 'stadium-9:farthest-hr-lhb',
      stadiumId: 'stadium-9',
      stadiumName: 'Swagger Center',
      changeKind: 'overtake',
      newValue: 460,
      oldValue: 400,
      newHolderIds: ['player-new-lhb'],
      overtakenHolderIds: ['player-old-1', 'player-old-2'],
      batterHand: 'L',
      playContext: null,
      triggerPhase: 'season-end',
    });
    expect(result.dramaticWeight).toBeCloseTo(
      STADIUM_RECORD_NEWS_DRAMATIC_WEIGHT.overtakeBase +
        STADIUM_RECORD_NEWS_DRAMATIC_WEIGHT.magnitudeScale * magnitude,
    );
  });

  it('sets batterHand to null for non-HR records', () => {
    const result = build({
      change: {
        stadiumId: 'stadium-9',
        recordType: 'highest-cumulative-wpa-pitcher',
        recordKey: 'stadium-9:highest-cumulative-wpa-pitcher',
        changeKind: 'set',
        priorValue: null,
        priorLeaderPlayerIds: [],
        newValue: 1.75,
        newLeaderPlayerIds: ['pitcher-1'],
      },
    });

    expect(result.facts.batterHand).toBeNull();
  });

  it('leaves swing-record playContext null as a documented v1 defer', () => {
    const result = build({
      change: {
        stadiumId: 'stadium-9',
        recordType: 'largest-positive-wpa-swing',
        recordKey: 'stadium-9:largest-positive-wpa-swing',
        changeKind: 'set',
        priorValue: null,
        priorLeaderPlayerIds: [],
        newValue: 0.54,
        newLeaderPlayerIds: ['batter-1'],
      },
    });

    expect(result.facts.playContext).toBeNull();
  });

  it('dedups subjectIds while keeping new holders first', () => {
    const result = build({
      change: {
        stadiumId: 'stadium-9',
        recordType: 'most-hr-here-season',
        recordKey: 'stadium-9:most-hr-here-season',
        changeKind: 'overtake',
        priorValue: 5,
        priorLeaderPlayerIds: ['player-shared', 'player-old'],
        newValue: 6,
        newLeaderPlayerIds: ['player-new', 'player-shared', 'player-new'],
      },
    });

    expect(result.subjectIds).toEqual([
      'player-new',
      'player-shared',
      'player-old',
    ]);
  });

  it('does not mint id or createdAt fields', () => {
    const result = build();

    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('createdAt');
    expect(Object.keys(result)).toEqual([
      'franchiseId',
      'seasonId',
      'seasonNumber',
      'eventType',
      'subjectIds',
      'facts',
      'dramaticWeight',
    ]);
  });

  it('is pure and deterministic for equal input', () => {
    const input = stadiumRecordInput({
      stadiumName: null,
      change: {
        stadiumId: 'stadium-9',
        recordType: 'largest-positive-wpa-swing',
        recordKey: 'stadium-9:largest-positive-wpa-swing',
        changeKind: 'overtake',
        priorValue: -0.1,
        priorLeaderPlayerIds: ['prior-player'],
        newValue: 0.8,
        newLeaderPlayerIds: ['new-player'],
      },
    });

    const first = buildFranchiseStadiumRecordSeasonNewsEvent(input);
    const second = buildFranchiseStadiumRecordSeasonNewsEvent(input);

    expect(second).toEqual(first);
  });
});
