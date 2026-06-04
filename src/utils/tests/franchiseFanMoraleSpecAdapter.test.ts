import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import {
  buildFranchiseFanMoraleSpecViewModel,
  FRANCHISE_FAN_MORALE_SPEC_ADAPTER_VERSION,
  getFanMoraleRiskLevel,
  getFanMoraleSpecState,
} from '../franchiseFanMoraleSpecAdapter';

function snapshot(overrides: Record<string, unknown> = {}) {
  return {
    franchiseId: 'franchise-1',
    seasonId: 'season-1',
    statsScopeId: 'season-1',
    seasonNumber: 1,
    targetType: 'team-fan',
    teamId: 'team-1',
    baselineValue: 50,
    currentValue: 51,
    lastModified: '2026-01-02T00:00:00.000Z',
    history: [{
      id: 'history-1',
      sourceEventId: 'event-1',
      sourceKind: 'random-event-confirmation',
      previousValue: 50,
      currentValue: 51,
      delta: 1,
      reason: 'Confirmed score-only fan reaction.',
      actorDisplayName: 'Tester',
      timestamp: '2026-01-02T00:00:00.000Z',
    }],
    ...overrides,
  };
}

describe('franchise fan morale spec adapter', () => {
  test('clamps and labels 0-99 morale values according to the fan morale spec states', () => {
    expect(getFanMoraleSpecState(-5)).toBe('HOSTILE');
    expect(getFanMoraleSpecState(0)).toBe('HOSTILE');
    expect(getFanMoraleSpecState(9)).toBe('HOSTILE');
    expect(getFanMoraleSpecState(10)).toBe('APATHETIC');
    expect(getFanMoraleSpecState(24)).toBe('APATHETIC');
    expect(getFanMoraleSpecState(25)).toBe('FRUSTRATED');
    expect(getFanMoraleSpecState(39)).toBe('FRUSTRATED');
    expect(getFanMoraleSpecState(40)).toBe('RESTLESS');
    expect(getFanMoraleSpecState(54)).toBe('RESTLESS');
    expect(getFanMoraleSpecState(55)).toBe('CONTENT');
    expect(getFanMoraleSpecState(74)).toBe('CONTENT');
    expect(getFanMoraleSpecState(75)).toBe('EXCITED');
    expect(getFanMoraleSpecState(89)).toBe('EXCITED');
    expect(getFanMoraleSpecState(90)).toBe('EUPHORIC');
    expect(getFanMoraleSpecState(120)).toBe('EUPHORIC');

    expect(getFanMoraleRiskLevel(45)).toBe('SAFE');
    expect(getFanMoraleRiskLevel(25)).toBe('WATCH');
    expect(getFanMoraleRiskLevel(10)).toBe('DANGER');
    expect(getFanMoraleRiskLevel(0)).toBe('CRITICAL');
  });

  test('derives current value previous value trend and last event from history', () => {
    const report = buildFranchiseFanMoraleSpecViewModel({
      snapshot: snapshot({
        currentValue: 63,
        history: [
          {
            id: 'old-history',
            previousValue: 50,
            currentValue: 49,
            delta: -1,
            reason: 'Older dip.',
            sourceKind: 'random-event-confirmation',
            timestamp: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'new-history',
            previousValue: 57,
            currentValue: 63,
            delta: 6,
            reason: 'Archive-backed win lifted the fanbase.',
            sourceKind: 'random-event-confirmation',
            timestamp: '2026-01-03T00:00:00.000Z',
          },
        ],
      }),
      fallbackTeamName: 'Copied Alpha',
    });

    expect(report.contractVersion).toBe(FRANCHISE_FAN_MORALE_SPEC_ADAPTER_VERSION);
    expect(report.currentValue).toBe(63);
    expect(report.previousValue).toBe(57);
    expect(report.trend).toBe('RISING');
    expect(report.state).toBe('CONTENT');
    expect(report.riskLevel).toBe('SAFE');
    expect(report.lastEvent).toMatchObject({
      reason: 'Archive-backed win lifted the fanbase.',
      sourceKind: 'random-event-confirmation',
      delta: 6,
    });
  });

  test('handles empty history safely with neutral baseline semantics', () => {
    const report = buildFranchiseFanMoraleSpecViewModel({
      snapshot: null,
      fallbackTeamId: 'team-1',
      fallbackTeamName: 'Copied Alpha',
    });

    expect(report.teamId).toBe('team-1');
    expect(report.currentValue).toBe(50);
    expect(report.previousValue).toBeNull();
    expect(report.trend).toBe('STABLE');
    expect(report.state).toBe('RESTLESS');
    expect(report.riskLevel).toBe('SAFE');
    expect(report.lastEvent).toBeNull();
    expect(report.limitations.join(' ')).toMatch(/No durable team fan morale snapshot/i);
  });

  test('marks full formula consequences snapshots and weighting areas as deferred partial or blocked', () => {
    const report = buildFranchiseFanMoraleSpecViewModel({ snapshot: snapshot() });

    expect(report.implementationStatus.canonicalStorage.status).toBe('implemented');
    expect(report.implementationStatus.confirmedEventEffects.status).toBe('implemented');
    expect(report.implementationStatus.randomEventConfirmation.status).toBe('partial');
    expect(report.implementationStatus.scoreOnlyFanMorale.status).toBe('partial');
    expect(report.implementationStatus.expectedWinsBaseline.status).toBe('partial');
    expect(report.implementationStatus.performanceGapFormula.status).toBe('partial');
    expect(report.implementationStatus.rosterCompositionFormula.status).toBe('deferred');
    expect(report.implementationStatus.randomEventWeighting.status).toBe('partial');
    expect(report.implementationStatus.trueValueInputs.status).toBe('blocked');
    expect(report.implementationStatus.designations.status).toBe('blocked');
    expect(report.implementationStatus.beatReporterSentiment.status).toBe('blocked');
    expect(report.implementationStatus.freeAgencyConsequences.status).toBe('deferred');
    expect(report.implementationStatus.franchiseHealthConsequences.status).toBe('deferred');
    expect(report.implementationStatus.dailySnapshots.status).toBe('deferred');
    expect(report.implementationStatus.automaticGameTrackerMutation.status).toBe('blocked');
    expect(report.implementationStatus.playerMoraleCoupling.status).toBe('deferred');
    expect(report.calculatesExpectedWins).toBe(false);
    expect(report.trustsTrueValueDesignationsOrBeatReporter).toBe(false);
  });

  test('does not present a non-team-fan snapshot value as real team fan morale', () => {
    const report = buildFranchiseFanMoraleSpecViewModel({
      snapshot: snapshot({
        targetType: 'player',
        teamId: undefined,
        playerId: 'player-1',
        currentValue: 91,
        history: [{
          id: 'player-history',
          previousValue: 50,
          currentValue: 91,
          delta: 41,
          reason: 'Player morale event should not become fan morale.',
          sourceKind: 'random-event-confirmation',
          timestamp: '2026-01-02T00:00:00.000Z',
        }],
      }),
      fallbackTeamId: 'team-1',
      fallbackTeamName: 'Copied Alpha',
    });

    expect(report.teamId).toBe('team-1');
    expect(report.currentValue).toBe(50);
    expect(report.previousValue).toBeNull();
    expect(report.trend).toBe('STABLE');
    expect(report.state).toBe('RESTLESS');
    expect(report.lastEvent).toBeNull();
    expect(report.limitations.join(' ')).toMatch(/not a team fan morale snapshot/i);
  });

  test('utility is read-only and imports no persistence or mutation APIs', () => {
    const source = readFileSync('src/utils/franchiseFanMoraleSpecAdapter.ts', 'utf8');
    const report = buildFranchiseFanMoraleSpecViewModel({ snapshot: snapshot() });

    expect(source).not.toMatch(/indexedDB|syncEngine|save[A-Z]|set[A-Z]|persist[A-Z]|applyFranchiseMoraleEffect|confirmFranchiseRandomEvent/);
    expect(report.readOnly).toBe(true);
    expect(report.mutatesMorale).toBe(false);
  });
});
