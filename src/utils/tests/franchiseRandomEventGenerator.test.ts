import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import {
  buildFranchiseRandomEventCandidates,
  franchiseRandomEventCandidatesToLogReport,
  FRANCHISE_RANDOM_EVENT_GENERATOR_VERSION,
} from '../franchiseRandomEventGenerator';
import type { FranchiseDesignationMoraleBridgeInput } from '../franchiseDesignationMoraleBridge';
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

function fameEvent(overrides: Partial<CompletedGameRecord['fameEvents'][number]> = {}): CompletedGameRecord['fameEvents'][number] {
  return {
    id: 'fame-no-hitter-1',
    gameId: 'game-1',
    eventType: 'NO_HITTER',
    playerId: 'pitcher-1',
    playerName: 'Ace One',
    playerTeam: 'team-1',
    fameValue: 5,
    fameType: 'bonus',
    inning: 6,
    halfInning: 'BOTTOM',
    timestamp: 100,
    autoDetected: true,
    description: 'No-hitter',
    ...overrides,
  };
}

function completedGameForTeam(
  index: number,
  awayScore: number,
  homeScore: number,
  overrides: Partial<CompletedGameRecord> = {},
): CompletedGameRecord {
  return completedGame({
    gameId: `archive-streak-${index}`,
    date: index,
    awayTeamId: 'team-1',
    homeTeamId: 'team-2',
    awayTeamName: 'Alpha',
    homeTeamName: 'Beta',
    finalScore: { away: awayScore, home: homeScore },
    playerStats: {},
    ...overrides,
  });
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

function scoreOnlyGameForTeam(
  index: number,
  awayScore: number,
  homeScore: number,
  overrides: Partial<ScheduledGame> = {},
): ScheduledGame {
  return scoreOnlyGame({
    id: `score-streak-${index}`,
    gameNumber: index,
    completedAt: index,
    resultEnteredAt: index,
    awayTeamId: 'team-1',
    homeTeamId: 'team-2',
    result: {
      awayScore,
      homeScore,
      winningTeamId: awayScore > homeScore ? 'team-1' : 'team-2',
      losingTeamId: awayScore > homeScore ? 'team-2' : 'team-1',
    },
    ...overrides,
  });
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

function designationContext(
  overrides: Partial<FranchiseDesignationMoraleBridgeInput> = {},
): FranchiseDesignationMoraleBridgeInput {
  return {
    ...scope,
    designationType: 'TEAM_MVP',
    designationStatus: 'preview-only',
    playerId: 'player-1',
    playerName: 'Revealed Player',
    teamId: 'team-1',
    teamName: 'Alpha',
    rosterStatus: 'MLB',
    ratingRevealState: 'revealed',
    playerCurrent: true,
    triggerKind: 'recognition',
    valueDeltaTrusted: false,
    durableDesignationStateTrusted: false,
    hiddenProspectTruthPresent: false,
    hiddenProspectTruthApproved: false,
    hiddenTruthExposed: false,
    generatedAt: 123,
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
    expect(report.candidates.filter((candidate) => candidate.triggerCategory === 'archive-backed-team-fan-reaction')).toHaveLength(4);
    expect(report.candidates.filter((candidate) => candidate.triggerCategory === 'archive-backed-player-morale-prompt')).toHaveLength(1);
    expect(report.candidates.filter((candidate) => candidate.triggerCategory === 'score-only-team-fan-reaction')).toHaveLength(2);
    expect(report.candidates.filter((candidate) => candidate.triggerCategory === 'streak-team-fan-reaction')).toHaveLength(2);
    expect(report.candidates.filter((candidate) => candidate.triggerCategory === 'roster-movement-morale-prompt')).toHaveLength(1);
    expect(JSON.stringify(report)).not.toMatch(/wrong-scope-player|Wrong/);
    expect(JSON.stringify(report)).not.toMatch(/missing-scope-player|Missing Scope Player|Missing/);
    expect(report.warnings.join(' ')).toMatch(/out-of-scope player\/profile evidence/i);
  });

  test('score-only candidates target both teams as team fan morale only', () => {
    const report = build();
    const scoreOnlyCandidates = report.candidates.filter((candidate) => candidate.triggerCategory === 'score-only-team-fan-reaction');

    expect(scoreOnlyCandidates).toHaveLength(2);
    expect(scoreOnlyCandidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        eventKind: 'score-only-context',
        targetType: 'team-fan',
        targetId: 'team-1',
        safeEffectPreview: expect.objectContaining({
          target: 'fan-morale-draft',
          targetType: 'team-fan',
          targetId: 'team-1',
          delta: 1,
          automaticMoraleMutationAllowed: false,
        }),
      }),
      expect.objectContaining({
        eventKind: 'score-only-context',
        targetType: 'team-fan',
        targetId: 'team-2',
        safeEffectPreview: expect.objectContaining({
          target: 'fan-morale-draft',
          targetType: 'team-fan',
          targetId: 'team-2',
          delta: -1,
        }),
      }),
    ]));
    expect(scoreOnlyCandidates[0].evidenceReferences[0]).toMatchObject({
      type: 'score-only-schedule-summary',
      scoreOnlyContextOnly: true,
      hiddenProspectTruth: false,
    });
    expect(JSON.stringify(scoreOnlyCandidates)).not.toMatch(/player-morale-draft/);
  });

  test('score-only prompts remain team fan morale only when designation contexts are also present', () => {
    const report = buildFranchiseRandomEventCandidates({
      ...scope,
      seed: 'score-only-designation-isolation-seed',
      scoreOnlyScheduleRows: [scoreOnlyGame()],
      designationMoraleContexts: [
        designationContext({
          designationType: 'TEAM_MVP',
          triggerKind: 'recognition',
        }),
      ],
      generatedAt: 123,
    });
    const scoreOnlyCandidates = report.candidates.filter((candidate) => candidate.triggerCategory === 'score-only-team-fan-reaction');

    expect(scoreOnlyCandidates).toHaveLength(2);
    expect(scoreOnlyCandidates.every((candidate) => candidate.targetType === 'team-fan')).toBe(true);
    expect(scoreOnlyCandidates.every((candidate) => candidate.eventKind === 'score-only-context')).toBe(true);
    expect(JSON.stringify(scoreOnlyCandidates)).not.toMatch(/TEAM_MVP|player-morale-draft/i);
  });

  test('archive-backed team candidates include signed winner and loser prompts', () => {
    const report = build();
    const teamCandidates = report.candidates.filter((candidate) => candidate.triggerCategory === 'archive-backed-team-fan-reaction');

    expect(teamCandidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        targetId: 'team-1',
        safeEffectPreview: expect.objectContaining({ targetType: 'team-fan', targetId: 'team-1', delta: 1 }),
      }),
      expect.objectContaining({
        targetId: 'team-2',
        safeEffectPreview: expect.objectContaining({ targetType: 'team-fan', targetId: 'team-2', delta: -1 }),
      }),
    ]));
  });

  test('scoped archive blowouts generate signed team fan prompts', () => {
    const report = buildFranchiseRandomEventCandidates({
      ...scope,
      seed: 'archive-blowout-seed',
      completedGames: [completedGame({ gameId: 'archive-blowout-1', finalScore: { away: 10, home: 2 } })],
      generatedAt: 123,
    });
    const blowouts = report.candidates.filter((candidate) => candidate.triggerCategory === 'blowout-team-fan-reaction');

    expect(blowouts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        eventKind: 'gametracker-archive-fact',
        targetType: 'team-fan',
        targetId: 'team-1',
        title: 'blowout win fan reaction',
        safeEffectPreview: expect.objectContaining({ delta: 1, targetId: 'team-1' }),
      }),
      expect.objectContaining({
        eventKind: 'gametracker-archive-fact',
        targetType: 'team-fan',
        targetId: 'team-2',
        title: 'blowout loss fan reaction',
        safeEffectPreview: expect.objectContaining({ delta: -1, targetId: 'team-2' }),
      }),
    ]));
    expect(blowouts[0].id).toMatch(/team-[12]:blowout-(win|loss):8:archive-blowout-1/);
  });

  test('scoped archive fame events generate achievement team-fan prompts', () => {
    const report = buildFranchiseRandomEventCandidates({
      ...scope,
      seed: 'archive-achievement-seed',
      completedGames: [completedGame({
        gameId: 'archive-achievement-1',
        fameEvents: [fameEvent({
          id: 'fame-no-hitter-archive-1',
          gameId: 'archive-achievement-1',
          eventType: 'NO_HITTER',
          playerTeam: 'team-1',
        })],
      })],
      generatedAt: 123,
    });
    const achievements = report.candidates.filter((candidate) => candidate.triggerCategory === 'achievement-team-fan-reaction');

    expect(achievements).toEqual(expect.arrayContaining([
      expect.objectContaining({
        eventKind: 'gametracker-archive-fact',
        targetType: 'team-fan',
        targetId: 'team-1',
        title: 'no hitter fan reaction',
        safeEffectPreview: expect.objectContaining({ delta: 5, targetId: 'team-1' }),
      }),
      expect.objectContaining({
        eventKind: 'gametracker-archive-fact',
        targetType: 'team-fan',
        targetId: 'team-2',
        title: 'getting no hit fan reaction',
        safeEffectPreview: expect.objectContaining({ delta: -4, targetId: 'team-2' }),
      }),
    ]));
    expect(achievements[0].id).toMatch(/team-[12]:NO_HITTER:(no-hitter|getting-no-hit):archive-achievement-1/);
    expect(achievements[0].evidenceReferences[0]).toMatchObject({
      type: 'gametracker-archive-summary',
      archiveBacked: true,
      hiddenProspectTruth: false,
    });
  });

  test('score-only rows and out-of-scope archives never create achievement prompts', () => {
    const report = buildFranchiseRandomEventCandidates({
      ...scope,
      seed: 'achievement-scope-seed',
      completedGames: [
        completedGame({
          gameId: 'wrong-scope-achievement',
          statsScopeId: 'other-scope',
          fameEvents: [fameEvent({ gameId: 'wrong-scope-achievement' })],
        }),
        completedGame({
          gameId: 'missing-scope-achievement',
          statsScopeId: undefined,
          fameEvents: [fameEvent({ gameId: 'missing-scope-achievement' })],
        }),
      ],
      scoreOnlyScheduleRows: [scoreOnlyGame({ id: 'score-only-achievement-shape' })],
      generatedAt: 123,
    });

    expect(report.candidates.filter((candidate) => candidate.triggerCategory === 'achievement-team-fan-reaction')).toEqual([]);
    expect(JSON.stringify(report.candidates)).not.toMatch(/NO_HITTER|PERFECT_GAME|no hitter|perfect game/i);
  });

  test('scoped score-only blowouts generate team-fan-only prompts', () => {
    const report = buildFranchiseRandomEventCandidates({
      ...scope,
      seed: 'score-only-blowout-seed',
      scoreOnlyScheduleRows: [scoreOnlyGame({ result: {
        awayScore: 1,
        homeScore: 9,
        winningTeamId: 'team-2',
        losingTeamId: 'team-1',
      } })],
      generatedAt: 123,
    });
    const blowouts = report.candidates.filter((candidate) => candidate.triggerCategory === 'blowout-team-fan-reaction');

    expect(blowouts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        eventKind: 'score-only-context',
        targetType: 'team-fan',
        targetId: 'team-2',
        safeEffectPreview: expect.objectContaining({ delta: 1, targetType: 'team-fan', targetId: 'team-2' }),
      }),
      expect.objectContaining({
        eventKind: 'score-only-context',
        targetType: 'team-fan',
        targetId: 'team-1',
        safeEffectPreview: expect.objectContaining({ delta: -1, targetType: 'team-fan', targetId: 'team-1' }),
      }),
    ]));
    expect(JSON.stringify(blowouts)).not.toMatch(/player-morale-draft/);
    expect(blowouts.map((candidate) => candidate.warnings.join(' ')).join(' ')).toMatch(/Score-only blowout evidence has no player archive/i);
  });

  test('scoped archive games generate signed streak prompts', () => {
    const report = buildFranchiseRandomEventCandidates({
      ...scope,
      seed: 'archive-streak-seed',
      completedGames: [
        completedGameForTeam(1, 5, 1),
        completedGameForTeam(2, 4, 2),
        completedGameForTeam(3, 3, 1),
      ],
      generatedAt: 123,
    });
    const streak = report.candidates.find((candidate) =>
      candidate.triggerCategory === 'streak-team-fan-reaction' &&
      candidate.targetId === 'team-1'
    );

    expect(streak).toMatchObject({
      eventKind: 'gametracker-archive-fact',
      targetType: 'team-fan',
      targetId: 'team-1',
      safeEffectPreview: expect.objectContaining({ delta: 2, targetType: 'team-fan', targetId: 'team-1' }),
    });
    expect(streak?.id).toMatch(/team-1:win-streak-3:3:archive-streak-3/);
  });

  test('scoped score-only rows contribute team-fan-only streak prompts', () => {
    const report = buildFranchiseRandomEventCandidates({
      ...scope,
      seed: 'score-only-streak-seed',
      scoreOnlyScheduleRows: [
        scoreOnlyGameForTeam(1, 1, 4),
        scoreOnlyGameForTeam(2, 2, 5),
        scoreOnlyGameForTeam(3, 0, 3),
      ],
      generatedAt: 123,
    });
    const streak = report.candidates.find((candidate) =>
      candidate.triggerCategory === 'streak-team-fan-reaction' &&
      candidate.targetId === 'team-1'
    );

    expect(streak).toMatchObject({
      eventKind: 'score-only-context',
      targetType: 'team-fan',
      targetId: 'team-1',
      safeEffectPreview: expect.objectContaining({ delta: -2, targetType: 'team-fan', targetId: 'team-1' }),
    });
    expect(JSON.stringify(streak)).not.toMatch(/player-morale-draft/);
    expect(streak?.warnings.join(' ')).toMatch(/Score-only streak evidence has no player archive/i);
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

  test('designation bridge integration generates MVP and Ace player morale prompt candidates with safe-effect previews', () => {
    const report = buildFranchiseRandomEventCandidates({
      ...scope,
      seed: 'designation-recognition-seed',
      designationMoraleContexts: [
        designationContext({ designationType: 'TEAM_MVP' }),
        designationContext({ designationType: 'ACE', playerId: 'pitcher-1', playerName: 'Ace One' }),
      ],
      generatedAt: 123,
    });
    const designationCandidates = report.candidates.filter((candidate) => candidate.triggerCategory === 'designation-morale-reaction');

    expect(designationCandidates).toHaveLength(2);
    expect(designationCandidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        title: 'TEAM_MVP recognition morale prompt',
        targetType: 'player',
        targetId: 'player-1',
        eventKind: 'roster-movement-context',
        safeEffectPreview: expect.objectContaining({
          target: 'player-morale-draft',
          targetType: 'player',
          targetId: 'player-1',
          delta: 3,
          automaticMoraleMutationAllowed: false,
          designationMutationAllowed: false,
        }),
      }),
      expect.objectContaining({
        title: 'ACE recognition morale prompt',
        targetType: 'player',
        targetId: 'pitcher-1',
        safeEffectPreview: expect.objectContaining({
          target: 'player-morale-draft',
          delta: 2,
        }),
      }),
    ]));
    expect(designationCandidates.every((candidate) => candidate.limitations.some((limitation) => /read-only candidate generation/i.test(limitation)))).toBe(true);
  });

  test('designation context with omitted scope fields produces no candidates while fully scoped equivalent still works', () => {
    const omittedScope = buildFranchiseRandomEventCandidates({
      ...scope,
      seed: 'designation-omitted-scope-seed',
      designationMoraleContexts: [
        designationContext({
          franchiseId: undefined,
          seasonId: undefined,
          statsScopeId: undefined,
          seasonNumber: undefined,
        }),
      ],
      generatedAt: 123,
    });

    expect(omittedScope.candidates.filter((candidate) => candidate.triggerCategory === 'designation-morale-reaction')).toHaveLength(0);
    expect(omittedScope.warnings.join(' ')).toMatch(/TEAM_MVP designation morale context blocked/i);

    const fullyScoped = buildFranchiseRandomEventCandidates({
      ...scope,
      seed: 'designation-fully-scoped-seed',
      designationMoraleContexts: [
        designationContext(),
      ],
      generatedAt: 123,
    });

    expect(fullyScoped.candidates.filter((candidate) => candidate.triggerCategory === 'designation-morale-reaction')).toHaveLength(1);
    expect(fullyScoped.candidates.find((candidate) => candidate.triggerCategory === 'designation-morale-reaction')).toMatchObject({
      targetType: 'player',
      targetId: 'player-1',
      safeEffectPreview: expect.objectContaining({ target: 'player-morale-draft' }),
    });
  });

  test('trusted Fan Favorite roster move generates fan and player prompts while untrusted value-delta blocks', () => {
    const report = buildFranchiseRandomEventCandidates({
      ...scope,
      seed: 'designation-fan-favorite-seed',
      designationMoraleContexts: [
        designationContext({
          designationType: 'FAN_FAVORITE',
          triggerKind: 'trade',
          valueDeltaTrusted: false,
          durableDesignationStateTrusted: false,
        }),
        designationContext({
          designationType: 'FAN_FAVORITE',
          triggerKind: 'trade',
          valueDeltaTrusted: true,
          durableDesignationStateTrusted: true,
        }),
      ],
      generatedAt: 123,
    });
    const designationCandidates = report.candidates.filter((candidate) => candidate.triggerCategory === 'designation-morale-reaction');

    expect(designationCandidates).toHaveLength(2);
    expect(report.warnings.join(' ')).toMatch(/FAN_FAVORITE designation morale context blocked/i);
    expect(designationCandidates.map((candidate) => candidate.targetType)).toEqual(['player', 'team-fan']);
    expect(designationCandidates.find((candidate) => candidate.targetType === 'team-fan')?.safeEffectPreview).toMatchObject({
      target: 'fan-morale-draft',
      delta: -3,
    });
    expect(designationCandidates.find((candidate) => candidate.targetType === 'player')?.safeEffectPreview).toMatchObject({
      target: 'player-morale-draft',
      delta: -2,
    });
  });

  test('trusted Albatross move generates relief candidates while untrusted value-delta blocks', () => {
    const report = buildFranchiseRandomEventCandidates({
      ...scope,
      seed: 'designation-albatross-seed',
      designationMoraleContexts: [
        designationContext({
          designationType: 'ALBATROSS',
          triggerKind: 'trade',
          valueDeltaTrusted: false,
          durableDesignationStateTrusted: false,
        }),
        designationContext({
          designationType: 'ALBATROSS',
          triggerKind: 'trade',
          valueDeltaTrusted: true,
          durableDesignationStateTrusted: true,
        }),
      ],
      generatedAt: 123,
    });
    const designationCandidates = report.candidates.filter((candidate) => candidate.triggerCategory === 'designation-morale-reaction');

    expect(designationCandidates).toHaveLength(2);
    expect(report.warnings.join(' ')).toMatch(/ALBATROSS designation morale context blocked/i);
    expect(designationCandidates.find((candidate) => candidate.targetType === 'team-fan')?.safeEffectPreview).toMatchObject({
      target: 'fan-morale-draft',
      delta: 2,
    });
    expect(designationCandidates.find((candidate) => candidate.targetType === 'player')?.safeEffectPreview).toMatchObject({
      target: 'player-morale-draft',
      delta: 1,
    });
  });

  test('trusted Cornerstone move generates stronger fan and player candidates while untrusted durable state blocks', () => {
    const report = buildFranchiseRandomEventCandidates({
      ...scope,
      seed: 'designation-cornerstone-seed',
      designationMoraleContexts: [
        designationContext({
          designationType: 'CORNERSTONE',
          triggerKind: 'trade',
          durableDesignationStateTrusted: false,
        }),
        designationContext({
          designationType: 'CORNERSTONE',
          triggerKind: 'trade',
          durableDesignationStateTrusted: true,
        }),
      ],
      generatedAt: 123,
    });
    const designationCandidates = report.candidates.filter((candidate) => candidate.triggerCategory === 'designation-morale-reaction');

    expect(designationCandidates).toHaveLength(2);
    expect(report.warnings.join(' ')).toMatch(/CORNERSTONE designation morale context blocked/i);
    expect(designationCandidates.find((candidate) => candidate.targetType === 'team-fan')?.safeEffectPreview.delta).toBe(-5);
    expect(designationCandidates.find((candidate) => candidate.targetType === 'player')?.safeEffectPreview.delta).toBe(-3);
  });

  test('Captain remains blocked when hidden-charisma safety is false', () => {
    const report = buildFranchiseRandomEventCandidates({
      ...scope,
      seed: 'designation-captain-seed',
      designationMoraleContexts: [
        designationContext({
          designationType: 'CAPTAIN',
          triggerKind: 'recognition',
          hiddenProspectTruthPresent: true,
          hiddenProspectTruthApproved: false,
        }),
      ],
      generatedAt: 123,
    });

    expect(report.candidates.filter((candidate) => candidate.triggerCategory === 'designation-morale-reaction')).toHaveLength(0);
    expect(report.warnings.join(' ')).toMatch(/CAPTAIN designation morale context blocked/i);
  });

  test('Fan Hopeful prompt is prospect-safe and does not expose hidden truth', () => {
    const report = buildFranchiseRandomEventCandidates({
      ...scope,
      seed: 'designation-fan-hopeful-seed',
      designationMoraleContexts: [
        designationContext({
          designationType: 'FAN_HOPEFUL',
          triggerKind: 'call_up',
          rosterStatus: 'FARM',
          ratingRevealState: 'hidden',
          hiddenProspectTruthPresent: false,
          hiddenTruthExposed: false,
        }),
      ],
      generatedAt: 123,
    });
    const [candidate] = report.candidates.filter((event) => event.triggerCategory === 'designation-morale-reaction');

    expect(candidate).toMatchObject({
      title: 'Fan Hopeful prospect-safe morale prompt',
      targetType: 'player',
      targetId: 'player-1',
      safeEffectPreview: expect.objectContaining({
        target: 'player-morale-draft',
        targetType: 'player',
        delta: 1,
      }),
    });
    expect(candidate.evidenceReferences[0]).toMatchObject({
      targetPlayerRevealState: 'hidden',
      hiddenProspectTruth: false,
    });
    expect(JSON.stringify(candidate)).not.toMatch(/true ratings|trueGrade|hiddenScoutTruth|hiddenPersonalityModifiers|leadership/i);
  });

  test('missing or mismatched designation scope produces no designation prompt candidates', () => {
    const report = buildFranchiseRandomEventCandidates({
      ...scope,
      seed: 'designation-scope-seed',
      designationMoraleContexts: [
        designationContext({ franchiseId: '', seasonId: '', statsScopeId: '', seasonNumber: 0 }),
        designationContext({ triggerFranchiseId: 'other-franchise', triggerStatsScopeId: 'other-scope' }),
      ],
      generatedAt: 123,
    });

    expect(report.candidates.filter((candidate) => candidate.triggerCategory === 'designation-morale-reaction')).toHaveLength(0);
    expect(report.warnings.join(' ')).toMatch(/TEAM_MVP designation morale context blocked/i);
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

    expect(report.candidates).toHaveLength(2);
    expect(report.candidates.every((candidate) => candidate.triggerCategory === 'archive-backed-team-fan-reaction')).toBe(true);
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
    expect(logReport.entries.some((entry) => entry.safeEffectPreview?.delta === -1)).toBe(true);
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
