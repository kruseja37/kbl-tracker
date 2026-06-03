import { describe, expect, test } from 'vitest';

import {
  buildFranchisePlayerMoraleSpecViewModel,
  clampPlayerMoraleSpecValue,
  getPlayerMoraleSpecState,
} from '../franchisePlayerMoraleSpecAdapter';

describe('franchise player morale spec adapter', () => {
  test('returns neutral 50 baseline with no snapshot', () => {
    const view = buildFranchisePlayerMoraleSpecViewModel({
      fallbackPlayerId: 'player-1',
      fallbackPlayerName: 'Player One',
    });

    expect(view.playerId).toBe('player-1');
    expect(view.playerName).toBe('Player One');
    expect(view.currentValue).toBe(50);
    expect(view.previousValue).toBeNull();
    expect(view.state).toBe('CONTENT');
    expect(view.trend).toBe('STABLE');
    expect(view.lastEvent).toBeNull();
    expect(view.implementationStatus.neutralBaseline.status).toBe('implemented');
    expect(view.implementationStatus.personalityBaseline.status).toBe('deferred');
    expect(view.limitations.join(' ')).toMatch(/starts every player at neutral 50/i);
  });

  test('maps 0-99 values into Mode 2 player morale states', () => {
    expect(clampPlayerMoraleSpecValue(-5)).toBe(0);
    expect(clampPlayerMoraleSpecValue(100)).toBe(99);
    expect(getPlayerMoraleSpecState(90)).toBe('ECSTATIC');
    expect(getPlayerMoraleSpecState(85)).toBe('ECSTATIC');
    expect(getPlayerMoraleSpecState(65)).toBe('MOTIVATED');
    expect(getPlayerMoraleSpecState(45)).toBe('CONTENT');
    expect(getPlayerMoraleSpecState(25)).toBe('FRUSTRATED');
    expect(getPlayerMoraleSpecState(24)).toBe('DEMORALIZED');
  });

  test('reads previous current trend and last event from durable player history', () => {
    const view = buildFranchisePlayerMoraleSpecViewModel({
      snapshot: {
        franchiseId: 'franchise-1',
        seasonId: 'season-1',
        statsScopeId: 'season-1',
        seasonNumber: 1,
        targetType: 'player',
        playerId: 'player-1',
        baselineValue: 50,
        currentValue: 61,
        lastModified: '2026-01-03T00:00:00.000Z',
        history: [
          {
            id: 'older',
            sourceEventId: 'event-older',
            sourceKind: 'random-event-confirmation',
            previousValue: 50,
            currentValue: 48,
            delta: -2,
            reason: 'Older dip.',
            timestamp: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'newer',
            sourceEventId: 'event-newer',
            sourceKind: 'manual-override',
            previousValue: 48,
            currentValue: 61,
            delta: 13,
            reason: 'Manual confidence reset.',
            actorDisplayName: 'User',
            timestamp: '2026-01-03T00:00:00.000Z',
          },
        ],
      },
      fallbackPlayerName: 'Player One',
    });

    expect(view.currentValue).toBe(61);
    expect(view.previousValue).toBe(48);
    expect(view.trend).toBe('RISING');
    expect(view.state).toBe('CONTENT');
    expect(view.lastEvent).toEqual({
      reason: 'Manual confidence reset.',
      sourceKind: 'manual-override',
      timestamp: '2026-01-03T00:00:00.000Z',
      delta: 13,
    });
    expect(view.recentHistory[0]?.id).toBe('newer');
  });

  test('does not treat team fan snapshots as player morale', () => {
    const view = buildFranchisePlayerMoraleSpecViewModel({
      snapshot: {
        targetType: 'team-fan',
        teamId: 'team-1',
        currentValue: 91,
        history: [{
          id: 'team-history',
          previousValue: 50,
          currentValue: 91,
          delta: 41,
          reason: 'Team fan surge.',
          timestamp: '2026-01-01T00:00:00.000Z',
        }],
      },
      fallbackPlayerId: 'player-1',
    });

    expect(view.playerId).toBe('player-1');
    expect(view.currentValue).toBe(50);
    expect(view.lastEvent).toBeNull();
    expect(view.limitations.join(' ')).toMatch(/not a player morale snapshot/i);
  });
});
