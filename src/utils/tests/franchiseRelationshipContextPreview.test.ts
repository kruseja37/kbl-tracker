import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import {
  buildFranchiseRelationshipContextPreview,
  FRANCHISE_RELATIONSHIP_CONTEXT_PREVIEW_VERSION,
} from '../franchiseRelationshipContextPreview';
import type { FranchisePlayerProfileViewModel } from '../franchisePlayerProfile';

function profile(overrides: Partial<FranchisePlayerProfileViewModel> = {}): FranchisePlayerProfileViewModel {
  return {
    playerId: 'player-1',
    teamId: 'team-1',
    leagueId: 'league-1',
    rosterStatus: 'MLB',
    revealState: 'revealed',
    hiddenSafe: false,
    identity: {
      name: 'Context Player',
      age: 27,
      bats: 'R',
      throws: 'R',
      primaryPosition: 'SS',
      secondaryPosition: '2B',
      traits: ['Sprinter'],
      personality: 'Jolly',
      chemistry: 'Spirited',
    },
    salary: 3_000_000,
    contractYears: 2,
    farm: {
      recordPresent: false,
      optionDates: [],
    },
    prospectReport: {
      scoutSpecialtiesVisible: [],
      scoutWeaknessesVisible: [],
    },
    fullDetails: {
      overallGrade: 'B',
      power: 60,
      contact: 62,
      speed: 65,
      fielding: 70,
      arm: 68,
      velocity: 0,
      junk: 0,
      accuracy: 0,
      arsenal: [],
    },
    editHistory: [],
    suppressedHiddenFieldLabels: [],
    limitations: [],
    ...overrides,
  };
}

function build(overrides: Partial<FranchisePlayerProfileViewModel> = {}) {
  return buildFranchiseRelationshipContextPreview({
    franchiseId: 'franchise-1',
    seasonId: 'franchise-1-season-1',
    statsScopeId: 'franchise-1-season-1',
    seasonNumber: 1,
    profile: profile(overrides),
  });
}

describe('franchise relationship context preview', () => {
  test('builds read-only player and fan relationship boundaries for a revealed player', () => {
    const report = build();

    expect(report.contractVersion).toBe(FRANCHISE_RELATIONSHIP_CONTEXT_PREVIEW_VERSION);
    expect(report.policyFlags).toMatchObject({
      relationshipMutationAllowed: false,
      moraleMutationAllowed: false,
      profileMutationAllowed: false,
      salaryMovementAllowed: false,
      designationMutationAllowed: false,
      storyPersistenceAllowed: false,
      mode3HandoffAllowed: false,
    });
    expect(report.rows.map((row) => row.kind)).toEqual(['player-player', 'fan-team']);
    expect(report.rows.find((row) => row.kind === 'player-player')?.blockers.join(' ')).toMatch(/relatedPlayerId/i);
    expect(report.rows.find((row) => row.kind === 'fan-team')?.warnings.join(' ')).toMatch(/schedule\/standings context only/i);
    expect(report.evidencePolicy.join(' ')).toMatch(/GameTracker\/archive facts may be factual context only/i);
    expect(report.evidencePolicy.join(' ')).toMatch(/No durable relationship state exists/i);
  });

  test('keeps unrevealed FARM/prospect context hidden-safe', () => {
    const report = build({
      rosterStatus: 'FARM',
      revealState: 'hidden',
      hiddenSafe: true,
      fullDetails: null,
      prospectReport: {
        scoutedGrade: 'B',
        potentialGrade: 'A-',
        scoutConfidence: 'medium',
        scoutName: 'Scout Safe',
        scoutSpecialtiesVisible: ['OF'],
        scoutWeaknessesVisible: ['P'],
        source: 'league-builder-startup-prospect-draft',
      },
      suppressedHiddenFieldLabels: [
        'true numeric ratings',
        'true grade',
        'hidden personality modifiers',
        'hidden scout truth',
      ],
    });

    expect(report.rows.map((row) => row.kind)).toEqual(['player-player', 'fan-team', 'scout-prospect']);
    expect(report.rows.find((row) => row.kind === 'scout-prospect')?.status).toBe('needs-approval');
    expect(report.hiddenTruthGuard?.status).toBe('invalid');
    expect(report.hiddenTruthGuard?.blockers.join(' ')).toMatch(/hidden truth cannot be used/i);
    expect(JSON.stringify(report)).not.toContain('"loyalty":92');
    expect(JSON.stringify(report)).not.toContain('"trueGrade":"A"');
  });

  test('score-only evidence remains team/schedule context only', () => {
    const report = build();
    const fanTeam = report.rows.find((row) => row.kind === 'fan-team');

    expect(fanTeam?.evidenceDescriptions.join(' ')).toMatch(/Score-only data is team\/schedule context only/i);
    expect(fanTeam?.validation?.evidenceSummary.scoreOnlyScheduleReferences).toBe(1);
    expect(fanTeam?.validation?.evidenceSummary.scoreOnlyPlayerEvidenceBlocked).toBe(false);
  });

  test('source file imports no storage or mutation APIs', () => {
    const source = readFileSync('src/utils/franchiseRelationshipContextPreview.ts', 'utf8');
    const importLines = source.split('\n').filter((line) => line.startsWith('import'));

    expect(importLines.join('\n')).not.toMatch(/save|set|persist|upsert|delete|IndexedDB|localStorage/i);
    expect(importLines.join('\n')).not.toMatch(/transactionStorage|franchisePlayerStorage|franchiseMoraleState/i);
  });
});
