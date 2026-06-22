import { describe, expect, test } from 'vitest';

import {
  analyzeDraftRoster,
  buildDraftAnalyzerInput,
  type DraftAnalyzerAdapterInput,
  type DraftAnalyzerFarmEntry,
  type DraftAnalyzerMlbEntry,
} from '../rosterAnalyzerDraftAdapter';

function makeMlbPlayer(overrides: Partial<DraftAnalyzerMlbEntry> & { id: string }): DraftAnalyzerMlbEntry {
  return {
    id: overrides.id,
    name: overrides.name ?? `${overrides.id} Player`,
    primaryPosition: overrides.primaryPosition ?? 'C',
    bats: 'R',
    throws: 'R',
    ratings: {
      power: 60,
      contact: 60,
      speed: 60,
      fielding: 60,
      arm: 60,
      velocity: 50,
      junk: 50,
      accuracy: 50,
    },
    arsenal: [],
    traits: [],
    chemistry: 'Competitive',
    personality: 'Competitive',
    salary: 1,
    ...overrides,
  };
}

function makeFarmPlayer(overrides: Partial<DraftAnalyzerFarmEntry> & { id: string }): DraftAnalyzerFarmEntry {
  return {
    id: overrides.id,
    name: overrides.name ?? `${overrides.id} Prospect`,
    primaryPosition: overrides.primaryPosition ?? 'SS',
    bats: 'L',
    throws: 'R',
    salary: 0,
    scoutedGrade: 'B-',
    scoutConfidence: 'medium',
    ...overrides,
  };
}

function makeInput(overrides: Partial<DraftAnalyzerAdapterInput> = {}): DraftAnalyzerAdapterInput {
  return {
    leagueId: 'league-1',
    team: {
      id: 'team-1',
      name: 'Draft Club',
    },
    mlbWonPlayers: [],
    farmWonPlayers: [],
    generatedAt: '2026-06-22T12:00:00.000Z',
    ...overrides,
  };
}

describe('rosterAnalyzerDraftAdapter', () => {
  test('buildDraftAnalyzerInput maps draft identity, roster ids, visible MLB ratings, and obscured farm scout signal', () => {
    const input = buildDraftAnalyzerInput(makeInput({
      mlbWonPlayers: [
        makeMlbPlayer({
          id: 'mlb-1',
          name: 'Visible Catcher',
          primaryPosition: 'C',
          secondaryPosition: '1B',
          ratings: { power: 72, contact: 68 },
        }),
      ],
      farmWonPlayers: [
        makeFarmPlayer({
          id: 'farm-1',
          name: 'Hidden Shortstop',
          primaryPosition: 'SS',
          secondaryPosition: '2B',
          scoutedGrade: 'A-',
          scoutConfidence: 'high',
        }),
      ],
    }));

    expect(input.identity).toMatchObject({
      mode: 'builder',
      surface: 'draft_prep',
      leagueId: 'league-1',
      teamId: 'team-1',
      generatedAt: '2026-06-22T12:00:00.000Z',
    });
    expect(input.teamName).toBe('Draft Club');
    expect(input.roster.activePlayerIds).toEqual(['mlb-1']);
    expect(input.roster.farmPlayerIds).toEqual(['farm-1']);

    const mlbPlayer = input.players.find((player) => player.id === 'mlb-1');
    expect(mlbPlayer).toMatchObject({
      rosterStatus: 'MLB',
      rosterLevel: 'MLB',
      ratings: {
        power: 72,
        contact: 68,
      },
      secondaryPositions: ['1B'],
      sourceTrust: 'high',
    });

    const farmPlayer = input.players.find((player) => player.id === 'farm-1');
    expect(farmPlayer).toMatchObject({
      rosterStatus: 'FARM',
      rosterLevel: 'FARM',
      ratings: {},
      secondaryPositions: ['2B'],
      optionState: {
        maxSeasonOptions: 3,
        ratingRevealState: 'hidden',
        eligibleForCallUp: true,
        eligibleForSendDown: false,
        scoutedGrade: 'A-',
        scoutConfidence: 'high',
      },
      sourceTrust: 'high',
    });
  });

  test('analyzeDraftRoster reuses position coverage and farm scout advice for incomplete in-progress draft rosters', () => {
    const report = analyzeDraftRoster(makeInput({
      mlbWonPlayers: [
        makeMlbPlayer({ id: 'c-1', primaryPosition: 'C' }),
        makeMlbPlayer({ id: 'oneb-1', primaryPosition: '1B' }),
        makeMlbPlayer({ id: 'twob-1', primaryPosition: '2B' }),
        makeMlbPlayer({ id: 'threeb-1', primaryPosition: '3B' }),
        makeMlbPlayer({ id: 'of-1', primaryPosition: 'LF' }),
      ],
      farmWonPlayers: [
        makeFarmPlayer({
          id: 'farm-ss-1',
          primaryPosition: 'SS',
          scoutedGrade: 'B+',
          scoutConfidence: 'medium',
        }),
        makeFarmPlayer({
          id: 'farm-of-1',
          primaryPosition: 'OF',
          scoutedGrade: 'C+',
          scoutConfidence: 'low',
        }),
      ],
    }));

    const positionCoverageFindings = report.findings.filter((finding) => finding.kind === 'position_coverage');
    expect(positionCoverageFindings.some((finding) => finding.detail.includes('SS'))).toBe(true);
    expect(positionCoverageFindings.some((finding) => finding.detail.includes('OF'))).toBe(true);
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'farm_options',
          affectedPlayerIds: ['farm-ss-1'],
        }),
        expect.objectContaining({
          kind: 'farm_options',
          affectedPlayerIds: ['farm-of-1'],
        }),
      ]),
    );
    expect(report.recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'call_up_advice',
          playerIds: ['farm-ss-1'],
          execution: 'read_only',
        }),
        expect.objectContaining({
          kind: 'call_up_advice',
          playerIds: ['farm-of-1'],
          execution: 'read_only',
        }),
      ]),
    );
  });

  test('draft prep reports stay read-only and never expose executable recommendations', () => {
    const report = analyzeDraftRoster(makeInput({
      mlbWonPlayers: [
        makeMlbPlayer({ id: 'c-1', primaryPosition: 'C' }),
      ],
      farmWonPlayers: [
        makeFarmPlayer({ id: 'farm-1', primaryPosition: 'SS' }),
      ],
    }));

    expect(report.summary.readOnly).toBe(true);
    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(report.recommendations.every((recommendation) =>
      recommendation.execution === 'read_only' || recommendation.execution === 'blocked_future_work',
    )).toBe(true);
  });

  test('empty draft input does not throw and yields under-target findings', () => {
    const report = analyzeDraftRoster(makeInput());

    expect(report.profile).toMatchObject({
      activeCount: 0,
      farmCount: 0,
      totalCount: 0,
    });
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'roster_count',
        }),
        expect.objectContaining({
          kind: 'position_coverage',
        }),
      ]),
    );
  });
});
