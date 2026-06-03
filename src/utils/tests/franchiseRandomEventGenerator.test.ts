import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import {
  buildFranchiseRandomEventCandidates,
  franchiseRandomEventCandidatesToLogReport,
  FRANCHISE_RANDOM_EVENT_GENERATOR_VERSION,
} from '../franchiseRandomEventGenerator';
import type { CompletedGameRecord } from '../gameStorage';
import type { Player } from '../leagueBuilderStorage';
import type { ScheduledGame } from '../scheduleStorage';
import type { FranchiseStadiumFoundationReport } from '../franchiseStadiumFoundation';
import { FRANCHISE_STADIUM_FOUNDATION_CONTRACT_VERSION } from '../franchiseStadiumFoundation';
import type { TransactionLogEntry } from '../transactionStorage';

const scope = {
  franchiseId: 'franchise-1',
  seasonId: 'franchise-1-season-2',
  statsScopeId: 'franchise-1-season-2',
  seasonNumber: 2,
};

function player(
  id = 'player-1',
  overrides: Partial<Player> & {
    franchiseId?: string;
    seasonId?: string;
    statsScopeId?: string;
    seasonNumber?: number;
  } = {},
): Player & {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
} {
  return {
    id,
    ...scope,
    firstName: 'Revealed',
    lastName: 'Player',
    gender: 'M',
    age: 27,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'SS',
    secondaryPosition: '2B',
    power: 70,
    contact: 72,
    speed: 65,
    fielding: 80,
    arm: 78,
    velocity: 0,
    junk: 0,
    accuracy: 0,
    arsenal: [],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 8.5,
    leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    isCustom: false,
    editHistory: [],
    ...overrides,
  };
}

function completedGame(overrides: Partial<CompletedGameRecord> = {}): CompletedGameRecord {
  return {
    gameId: 'game-1',
    date: 100,
    ...scope,
    franchiseId: scope.franchiseId,
    competitionType: 'franchise',
    competitionId: scope.franchiseId,
    awayTeamId: 'team-1',
    homeTeamId: 'team-2',
    awayTeamName: 'Alpha',
    homeTeamName: 'Beta',
    finalScore: { away: 5, home: 3 },
    innings: 6,
    totalInnings: 6,
    fameEvents: [],
    playerStats: {
      'player-1': {
        playerName: 'Revealed Player',
        teamId: 'team-1',
        pa: 4,
        ab: 4,
        h: 2,
        singles: 1,
        doubles: 1,
        triples: 0,
        hr: 0,
        rbi: 1,
        r: 1,
        bb: 0,
        hbp: 0,
        k: 1,
        sb: 0,
        cs: 0,
        sf: 0,
        sh: 0,
        gidp: 0,
        putouts: 1,
        assists: 2,
        fieldingErrors: 0,
      },
    },
    pitcherGameStats: [],
    activityLog: [],
    inningScores: [],
    aggregationStatus: 'aggregated',
    ...overrides,
  };
}

function scoreOnlyGame(overrides: Partial<ScheduledGame> = {}): ScheduledGame {
  return {
    id: 'schedule-score-only-1',
    ...scope,
    gameNumber: 2,
    dayNumber: 2,
    awayTeamId: 'team-1',
    homeTeamId: 'team-2',
    status: 'COMPLETED',
    result: {
      awayScore: 4,
      homeScore: 2,
      winningTeamId: 'team-1',
      losingTeamId: 'team-2',
    },
    completionSource: 'score-only',
    resultEnteredAt: 100,
    scoreOnlyResultId: 'score-only-1',
    createdAt: 1,
    completedAt: 100,
    source: 'manual',
    ...overrides,
  };
}

function transaction(overrides: Partial<TransactionLogEntry> = {}): TransactionLogEntry {
  return {
    id: 'txn-call-up-1',
    timestamp: '2026-01-02T00:00:00.000Z',
    season: scope.seasonNumber,
    gameNumber: null,
    phase: 'REGULAR_SEASON',
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    type: 'call_up',
    actor: 'USER',
    data: {
      playerId: 'player-1',
      teamId: 'team-1',
      sourceRosterStatus: 'FARM',
      targetRosterStatus: 'MLB',
    },
    previousState: null,
    undone: false,
    undoneAt: null,
    undoneBy: null,
    ...overrides,
  };
}

function stadiumReport(overrides: Partial<FranchiseStadiumFoundationReport> = {}): FranchiseStadiumFoundationReport {
  return {
    contractVersion: FRANCHISE_STADIUM_FOUNDATION_CONTRACT_VERSION,
    generatedAt: 100,
    scope: {
      ...scope,
      status: 'trusted',
      reasons: ['scope trusted'],
      limitations: [],
    },
    stadiumIdentity: {
      status: 'trusted',
      reasons: ['identity'],
      limitations: [],
      stadiums: [],
    },
    sprayCharts: {
      status: 'trusted',
      reasons: ['spray'],
      limitations: [],
      rows: [],
      summary: {
        rows: 3,
        battingRows: 1,
        pitchingRows: 1,
        fieldingRows: 1,
        stadiumIds: ['apple-field'],
        teamIds: ['team-1'],
        playerIds: ['player-1'],
        outcomeCounts: { '1B': 1 },
        zoneCounts: { Z05: 1 },
        limitations: [],
      },
      trustedForBatting: true,
      trustedForPitching: true,
      trustedForFielding: true,
      source: 'completed-game-archive-events',
    },
    parkFactors: {
      status: 'trusted',
      reasons: ['seed'],
      limitations: [],
      seedFactorsTrusted: true,
      adaptiveFactorsPreviewOnly: true,
      adaptiveFactorsPersisted: false,
    },
    downstreamConsumers: {
      warParkAdjustment: { status: 'preview-only', reasons: [], limitations: [] },
      randomEventGenerator: { status: 'preview-only', reasons: [], limitations: [] },
      fanPlayerMorale: { status: 'preview-only', reasons: [], limitations: [] },
      mode3Handoff: { status: 'preview-only', reasons: [], limitations: [] },
    },
    limitations: [],
    ...overrides,
  };
}

function build(seed = 'seed-a') {
  return buildFranchiseRandomEventCandidates({
    ...scope,
    seed,
    completedGames: [completedGame()],
    scoreOnlyScheduleRows: [scoreOnlyGame()],
    rosterTransactions: [transaction()],
    players: [player('player-1', { editHistory: [{ date: '2026-01-02', field: 'nickname', oldValue: '', newValue: 'Spark' }] })],
    stadiumFoundationReport: stadiumReport(),
    generatedAt: 123,
  });
}

describe('franchise random event generator core', () => {
  test('same seed and evidence produce identical candidates and rolls', () => {
    const first = build('same-seed');
    const second = build('same-seed');

    expect(first.generatorVersion).toBe(FRANCHISE_RANDOM_EVENT_GENERATOR_VERSION);
    expect(first.candidates).toEqual(second.candidates);
    expect(first.candidates.map((candidate) => candidate.roll)).toEqual(second.candidates.map((candidate) => candidate.roll));
    expect(first.candidates.length).toBeGreaterThan(0);
  });

  test('different seed changes deterministic rolls without changing evidence identity', () => {
    const first = build('seed-a');
    const second = build('seed-b');

    expect(first.candidates.map((candidate) => candidate.id)).toEqual(second.candidates.map((candidate) => candidate.id));
    expect(first.candidates.map((candidate) => candidate.roll)).not.toEqual(second.candidates.map((candidate) => candidate.roll));
  });

  test('strict scope filtering excludes mismatched and missing-scope evidence', () => {
    const report = buildFranchiseRandomEventCandidates({
      ...scope,
      seed: 'scope-test',
      completedGames: [
        completedGame(),
        completedGame({ gameId: 'wrong-franchise', franchiseId: 'other-franchise' }),
        completedGame({ gameId: 'missing-season', seasonNumber: undefined }),
        completedGame({
          gameId: 'missing-player-scope-game',
          playerStats: {
            'missing-scope-player': {
              ...completedGame().playerStats['player-1'],
              playerName: 'Missing Scope Player',
              teamId: 'team-1',
            },
          },
        }),
      ],
      scoreOnlyScheduleRows: [
        scoreOnlyGame(),
        scoreOnlyGame({ id: 'wrong-scope', statsScopeId: 'wrong-scope' }),
      ],
      rosterTransactions: [
        transaction(),
        transaction({ id: 'wrong-season', season: 99 }),
      ],
      players: [
        player(),
        player('wrong-scope-player', {
          franchiseId: 'other-franchise',
          editHistory: [{ date: '2026-01-02', field: 'nickname', oldValue: '', newValue: 'Wrong' }],
        }),
        player('missing-scope-player', {
          statsScopeId: undefined,
          editHistory: [{ date: '2026-01-02', field: 'nickname', oldValue: '', newValue: 'Missing' }],
        }),
      ],
      generatedAt: 123,
    });

    expect(report.candidates.some((candidate) => candidate.reason.includes('wrong-franchise'))).toBe(false);
    expect(report.candidates.some((candidate) => candidate.id.includes('wrong-scope'))).toBe(false);
    expect(report.candidates.filter((candidate) => candidate.triggerCategory === 'archive-backed-team-fan-reaction')).toHaveLength(2);
    expect(report.candidates.filter((candidate) => candidate.triggerCategory === 'archive-backed-player-morale-prompt')).toHaveLength(1);
    expect(report.candidates.filter((candidate) => candidate.triggerCategory === 'score-only-team-fan-reaction')).toHaveLength(1);
    expect(report.candidates.filter((candidate) => candidate.triggerCategory === 'roster-movement-morale-prompt')).toHaveLength(1);
    expect(JSON.stringify(report)).not.toMatch(/wrong-scope-player|Wrong/);
    expect(JSON.stringify(report)).not.toMatch(/missing-scope-player|Missing Scope Player|Missing/);
    expect(report.warnings.join(' ')).toMatch(/out-of-scope player\/profile evidence/i);
  });

  test('score-only candidates target team fan morale only', () => {
    const report = build();
    const scoreOnly = report.candidates.find((candidate) => candidate.triggerCategory === 'score-only-team-fan-reaction');

    expect(scoreOnly).toBeDefined();
    expect(scoreOnly).toMatchObject({
      eventKind: 'score-only-context',
      targetType: 'team-fan',
      targetId: 'team-1',
      safeEffectPreview: {
        target: 'fan-morale-draft',
        targetType: 'team-fan',
        targetId: 'team-1',
        automaticMoraleMutationAllowed: false,
      },
    });
    expect(scoreOnly?.evidenceReferences[0]).toMatchObject({
      type: 'score-only-schedule-summary',
      scoreOnlyContextOnly: true,
      hiddenProspectTruth: false,
    });
    expect(JSON.stringify(scoreOnly)).not.toMatch(/player-morale-draft/);
  });

  test('archive-backed revealed player morale candidate requires revealed current player target', () => {
    const report = build();
    const playerCandidate = report.candidates.find((candidate) => candidate.triggerCategory === 'archive-backed-player-morale-prompt');

    expect(playerCandidate).toBeDefined();
    expect(playerCandidate).toMatchObject({
      eventKind: 'gametracker-archive-fact',
      targetType: 'player',
      targetId: 'player-1',
      safeEffectPreview: {
        target: 'player-morale-draft',
        targetType: 'player',
        targetId: 'player-1',
      },
    });
    expect(playerCandidate?.reason).toMatch(/archive-backed player stat evidence/i);
  });

  test('hidden FARM/prospect targets and truth are excluded from candidates', () => {
    const hidden = player('hidden-prospect', {
      firstName: 'Hidden',
      lastName: 'Prospect',
      ratingRevealState: 'hidden',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
      editHistory: [{ date: '2026-01-02', field: 'firstName', oldValue: 'Hidden', newValue: 'Visible' }],
      prospectProfile: {
        trueGrade: 'A',
        scoutedGrade: 'C',
        hiddenScoutTruth: { accuracy: 90 },
      },
      hiddenPersonalityModifiers: { leadership: 92 },
    } as Partial<Player>);
    const report = buildFranchiseRandomEventCandidates({
      ...scope,
      seed: 'hidden-test',
      completedGames: [completedGame({
        playerStats: {
          'hidden-prospect': {
            ...completedGame().playerStats['player-1'],
            playerName: 'Hidden Prospect',
            teamId: 'team-1',
          },
        },
      })],
      players: [hidden],
    });

    expect(report.candidates).toHaveLength(1);
    expect(report.candidates[0].triggerCategory).toBe('archive-backed-team-fan-reaction');
    expect(JSON.stringify(report)).not.toMatch(/hiddenPersonalityModifiers|leadership|trueGrade|hiddenScoutTruth|accuracy: 90/);
    expect(report.warnings.join(' ')).toMatch(/Hidden FARM\/prospect truth is excluded/i);
  });

  test('roster movement and stadium spray prompts are generated from scoped evidence', () => {
    const report = build();

    expect(report.candidates.some((candidate) =>
      candidate.triggerCategory === 'roster-movement-morale-prompt' &&
      candidate.eventKind === 'roster-movement-context' &&
      candidate.targetId === 'player-1'
    )).toBe(true);
    expect(report.candidates.some((candidate) =>
      candidate.triggerCategory === 'stadium-spray-story-prompt' &&
      candidate.eventKind === 'stadium-spray-context' &&
      candidate.targetId === 'apple-field'
    )).toBe(true);
  });

  test('candidate conversion produces durable log-compatible entries', () => {
    const candidateReport = build('log-seed');
    const logReport = franchiseRandomEventCandidatesToLogReport(candidateReport);
    const playerEntry = logReport.entries.find((entry) =>
      entry.evidenceReferences.some((reference) => reference.targetType === 'player'),
    );

    expect(logReport.entries).toHaveLength(candidateReport.candidates.length);
    expect(logReport.entries.every((entry) => entry.contractVersion === 'franchise-random-event-log-v1-draft-only')).toBe(true);
    expect(logReport.entries.every((entry) => entry.persistable === false && entry.mutable === false)).toBe(true);
    expect(logReport.entries.every((entry) => entry.hiddenSafe === true)).toBe(true);
    expect(logReport.entries.map((entry) => entry.kind)).toEqual(candidateReport.candidates.map((candidate) => candidate.eventKind));
    expect(playerEntry?.evidenceReferences[0]).toMatchObject({
      targetType: 'player',
      targetId: 'player-1',
      targetPlayerRevealState: 'revealed',
      targetPlayerCurrent: true,
    });
  });

  test('pure generator imports no mutation or storage APIs', () => {
    const source = readFileSync('src/utils/franchiseRandomEventGenerator.ts', 'utf8');

    expect(source).not.toMatch(/from ['"].*(Storage|storage|Adapter|adapter|syncEngine|franchiseMoraleState')/);
    expect(source).not.toMatch(/\b(save|set|persist|mutate|write|confirm|dismiss|apply)[A-Z_]/);
  });
});
