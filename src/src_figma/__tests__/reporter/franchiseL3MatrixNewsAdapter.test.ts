import { describe, it, expect } from 'vitest';
import {
  buildFranchiseMatrixMoraleSeasonNewsEvent,
  L4B_MATRIX_NEWS_TUNING,
  type FranchiseMatrixMoraleNewsInput,
} from '../../app/engines/reporter/franchiseL3MatrixNewsAdapter';

const FRANCHISE_ID = 'franchise-1';
const SEASON_ID = 'season-4';
const SEASON_NUMBER = 4;

function matrixInput(
  overrides: Partial<FranchiseMatrixMoraleNewsInput> = {},
): FranchiseMatrixMoraleNewsInput {
  return {
    franchiseId: FRANCHISE_ID,
    seasonId: SEASON_ID,
    seasonNumber: SEASON_NUMBER,
    matrixEventType: 'AWARD_SNUB',
    personality: 'EGOTISTICAL',
    playerId: 'player-12',
    teamId: 'team-7',
    selfPlayerMoraleDelta: -6,
    teamFanMoraleDelta: -3,
    totalPlayerMoraleDelta: -8,
    reason: 'Close awards-race loser takes the snub personally.',
    isNeutral: false,
    sourceEventId: 'matrix:season-4:award-snub:player-12',
    ...overrides,
  };
}

describe('buildFranchiseMatrixMoraleSeasonNewsEvent', () => {
  it('maps a significant matrix consequence to a SEASON_SUMMARY SeasonNewsEvent', () => {
    const result = buildFranchiseMatrixMoraleSeasonNewsEvent(matrixInput());

    expect(result).toEqual({
      franchiseId: FRANCHISE_ID,
      seasonId: SEASON_ID,
      seasonNumber: SEASON_NUMBER,
      eventType: 'SEASON_SUMMARY',
      subjectIds: ['player-12', 'team-7'],
      facts: {
        matrixEventType: 'AWARD_SNUB',
        personality: 'EGOTISTICAL',
        selfPlayerMoraleDelta: -6,
        teamFanMoraleDelta: -3,
        totalPlayerMoraleDelta: -8,
        reason: 'Close awards-race loser takes the snub personally.',
        sourceEventId: 'matrix:season-4:award-snub:player-12',
      },
      dramaticWeight:
        L4B_MATRIX_NEWS_TUNING.base +
        L4B_MATRIX_NEWS_TUNING.magnitudeScale * (8 / 10),
    });
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('createdAt');
  });

  it('returns null for a sub-threshold magnitude', () => {
    const result = buildFranchiseMatrixMoraleSeasonNewsEvent(
      matrixInput({
        teamFanMoraleDelta: 4,
        totalPlayerMoraleDelta: -3,
      }),
    );

    expect(result).toBeNull();
  });

  it('returns null for neutral consequences even when magnitude is high', () => {
    const result = buildFranchiseMatrixMoraleSeasonNewsEvent(
      matrixInput({
        isNeutral: true,
        teamFanMoraleDelta: -12,
        totalPlayerMoraleDelta: -12,
      }),
    );

    expect(result).toBeNull();
  });

  it('is deterministic: same input yields a deeply-equal SeasonNewsEvent', () => {
    const input = matrixInput();
    const first = buildFranchiseMatrixMoraleSeasonNewsEvent(input);
    const second = buildFranchiseMatrixMoraleSeasonNewsEvent(input);

    expect(second).toEqual(first);
  });

  it('scales dramaticWeight with magnitude and clamps at the configured ceiling', () => {
    const moderate = buildFranchiseMatrixMoraleSeasonNewsEvent(
      matrixInput({
        teamFanMoraleDelta: -2,
        totalPlayerMoraleDelta: 6,
      }),
    );
    const severe = buildFranchiseMatrixMoraleSeasonNewsEvent(
      matrixInput({
        teamFanMoraleDelta: -40,
        totalPlayerMoraleDelta: -30,
      }),
    );

    expect(moderate?.dramaticWeight).toBeCloseTo(
      L4B_MATRIX_NEWS_TUNING.base +
        L4B_MATRIX_NEWS_TUNING.magnitudeScale * (6 / 10),
    );
    expect(severe?.dramaticWeight).toBeCloseTo(
      L4B_MATRIX_NEWS_TUNING.base + L4B_MATRIX_NEWS_TUNING.magnitudeScale,
    );
    expect(severe?.dramaticWeight).toBeGreaterThan(
      moderate?.dramaticWeight ?? 0,
    );
    expect(severe?.dramaticWeight).toBeLessThanOrEqual(1);
  });
});
