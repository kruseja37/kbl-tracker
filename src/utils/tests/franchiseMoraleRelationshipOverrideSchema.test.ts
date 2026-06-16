import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import {
  buildFranchiseMoraleRelationshipOverrideReport,
  FRANCHISE_MORALE_RELATIONSHIP_OVERRIDE_SCHEMA_VERSION,
  type FranchiseFanbaseTeamRelationshipOverrideProposal,
  type FranchiseMoraleRelationshipOverrideEvidenceReference,
  type FranchiseMoraleRelationshipOverrideProposal,
  type FranchisePlayerMoraleOverrideProposal,
  type FranchisePlayerRelationshipOverrideProposal,
  type FranchiseScoutProspectRelationshipOverrideProposal,
  validateFranchiseMoraleRelationshipOverrideProposal,
} from '../franchiseMoraleRelationshipOverrideSchema';

function archiveEvidence(
  overrides: Partial<FranchiseMoraleRelationshipOverrideEvidenceReference> = {},
): FranchiseMoraleRelationshipOverrideEvidenceReference {
  return {
    type: 'gametracker-archive',
    context: 'player',
    gameId: 'game-1',
    playerId: 'player-1',
    franchiseId: 'franchise-1',
    seasonId: 'franchise-1-season-1',
    statsScopeId: 'franchise-1-season-1',
    archiveBacked: true,
    description: 'Archive-backed completed game fact.',
    ...overrides,
  };
}

function scoreOnlyEvidence(
  overrides: Partial<FranchiseMoraleRelationshipOverrideEvidenceReference> = {},
): FranchiseMoraleRelationshipOverrideEvidenceReference {
  return {
    type: 'score-only-schedule',
    context: 'team',
    scheduleGameId: 'schedule-1',
    teamId: 'team-1',
    franchiseId: 'franchise-1',
    seasonId: 'franchise-1-season-1',
    statsScopeId: 'franchise-1-season-1',
    scoreOnly: true,
    description: 'Score-only schedule result.',
    ...overrides,
  };
}

function baseProposal(
  overrides: Partial<FranchisePlayerMoraleOverrideProposal> = {},
): FranchisePlayerMoraleOverrideProposal {
  return {
    schemaVersion: FRANCHISE_MORALE_RELATIONSHIP_OVERRIDE_SCHEMA_VERSION,
    kind: 'player-morale',
    franchiseId: 'franchise-1',
    seasonId: 'franchise-1-season-1',
    statsScopeId: 'franchise-1-season-1',
    seasonNumber: 1,
    actor: {
      actorType: 'user',
      actorId: 'user-1',
      displayName: 'Commissioner',
    },
    targetPlayerId: 'player-1',
    targetTeamId: 'team-1',
    overrideType: 'manual-morale-context',
    proposedEffect: {
      direction: 'increase',
      magnitude: 'minor',
      summary: 'Manual note that the player earned a morale bump.',
    },
    reason: 'User verified a clubhouse context manually.',
    evidenceReferences: [archiveEvidence()],
    hiddenProspectSafety: {
      targetRosterStatus: 'MLB',
      targetRevealState: 'revealed',
      includesHiddenTruthEvidence: false,
      hiddenFieldsReferenced: [],
    },
    approvalState: 'draft',
    ...overrides,
  };
}

describe('franchise morale/relationship manual override schema', () => {
  test('validates a player morale manual override proposal as draft-only', () => {
    const result = validateFranchiseMoraleRelationshipOverrideProposal(baseProposal());

    expect(result).toMatchObject({
      schemaVersion: FRANCHISE_MORALE_RELATIONSHIP_OVERRIDE_SCHEMA_VERSION,
      proposalKind: 'player-morale',
      status: 'valid-draft',
      validAsDraft: true,
      needsApproval: false,
      persistable: false,
      mutable: false,
      automaticEffectsAllowed: false,
    });
    expect(result.evidenceSummary.gameTrackerArchiveReferences).toBe(1);
    expect(result.reasons.join(' ')).toMatch(/archive-backed evidence/i);
  });

  test('validates a player-player relationship proposal', () => {
    const proposal: FranchisePlayerRelationshipOverrideProposal = {
      ...baseProposal(),
      kind: 'player-relationship',
      targetPlayerId: 'player-1',
      relatedPlayerId: 'player-2',
      overrideType: 'manual-player-relationship-context',
      proposedEffect: {
        direction: 'strengthen',
        magnitude: 'moderate',
        summary: 'Manual note that two players worked well together.',
      },
    };

    const result = validateFranchiseMoraleRelationshipOverrideProposal(proposal);

    expect(result.status).toBe('valid-draft');
    expect(result.proposalKind).toBe('player-relationship');
    expect(result.persistable).toBe(false);
  });

  test('validates a fanbase/team relationship proposal', () => {
    const proposal: FranchiseFanbaseTeamRelationshipOverrideProposal = {
      ...baseProposal(),
      kind: 'fanbase-team-relationship',
      targetTeamId: 'team-1',
      fanbaseId: 'fanbase-1',
      overrideType: 'manual-fanbase-team-context',
      proposedEffect: {
        direction: 'strengthen',
        magnitude: 'minor',
        summary: 'Manual note that the fanbase responded to a rivalry win.',
      },
      evidenceReferences: [scoreOnlyEvidence()],
    };

    const result = validateFranchiseMoraleRelationshipOverrideProposal(proposal);

    expect(result.status).toBe('valid-draft');
    expect(result.proposalKind).toBe('fanbase-team-relationship');
    expect(result.evidenceSummary.scoreOnlyScheduleReferences).toBe(1);
    expect(result.warnings.join(' ')).toMatch(/schedule\/standings context only/i);
  });

  test('scout/prospect relationship proposals are draft-valid but approval-gated', () => {
    const proposal: FranchiseScoutProspectRelationshipOverrideProposal = {
      ...baseProposal(),
      kind: 'scout-prospect-relationship',
      targetScoutId: 'scout-1',
      targetProspectPlayerId: 'prospect-1',
      overrideType: 'manual-scout-prospect-context',
      proposedEffect: {
        direction: 'strengthen',
        magnitude: 'minor',
        summary: 'Manual note that a scout had extended visible contact with a prospect.',
      },
      evidenceReferences: [{
        type: 'scouting-report',
        context: 'prospect-visible',
        scoutId: 'scout-1',
        playerId: 'prospect-1',
        description: 'Visible scouting report summary only.',
      }],
      hiddenProspectSafety: {
        targetRosterStatus: 'FARM',
        targetRevealState: 'hidden',
        includesHiddenTruthEvidence: false,
        hiddenFieldsReferenced: [],
      },
    };

    const result = validateFranchiseMoraleRelationshipOverrideProposal(proposal);

    expect(result.status).toBe('needs-approval');
    expect(result.needsApproval).toBe(true);
    expect(result.persistable).toBe(false);
  });

  test('hidden FARM/prospect proposal blocks hidden truth evidence', () => {
    const result = validateFranchiseMoraleRelationshipOverrideProposal(baseProposal({
      targetPlayerId: 'prospect-1',
      hiddenProspectSafety: {
        targetRosterStatus: 'FARM',
        targetRevealState: 'hidden',
        includesHiddenTruthEvidence: true,
        hiddenFieldsReferenced: ['trueGrade', 'hiddenPersonalityModifiers.loyalty'],
      },
      evidenceReferences: [
        {
          type: 'hidden-prospect-truth',
          context: 'hidden-truth',
          playerId: 'prospect-1',
          hiddenProspectTruth: true,
          hiddenFields: ['trueGrade'],
        },
      ],
    }));

    expect(result.status).toBe('invalid');
    expect(result.evidenceSummary.hiddenTruthReferences).toBe(1);
    expect(result.blockers.join(' ')).toMatch(/hidden truth cannot be used/i);
    expect(result.blockers.join(' ')).toMatch(/hidden prospect fields cannot be referenced/i);
  });

  test('missing scope blocks proposal', () => {
    const result = validateFranchiseMoraleRelationshipOverrideProposal(baseProposal({
      franchiseId: '',
      seasonId: '',
      statsScopeId: '',
      seasonNumber: 0,
    }));

    expect(result.status).toBe('invalid');
    expect(result.blockers.join(' ')).toMatch(/franchiseId, seasonId, statsScopeId/i);
  });

  test('missing reason blocks proposal', () => {
    const result = validateFranchiseMoraleRelationshipOverrideProposal(baseProposal({ reason: '   ' }));

    expect(result.status).toBe('invalid');
    expect(result.blockers).toContain('A human-readable reason is required for every manual override draft.');
  });

  test('approved or rejected states are invalid until an approval workflow exists', () => {
    const approved = validateFranchiseMoraleRelationshipOverrideProposal({
      ...baseProposal(),
      approvalState: 'approved',
    } as FranchiseMoraleRelationshipOverrideProposal);
    const rejected = validateFranchiseMoraleRelationshipOverrideProposal({
      ...baseProposal(),
      approvalState: 'rejected',
    } as FranchiseMoraleRelationshipOverrideProposal);

    expect(approved.status).toBe('invalid');
    expect(rejected.status).toBe('invalid');
    expect(approved.blockers.join(' ')).toMatch(/draft-only/i);
    expect(rejected.blockers.join(' ')).toMatch(/draft-only/i);
  });

  test('system-note actor source is invalid for manual override drafts', () => {
    const result = validateFranchiseMoraleRelationshipOverrideProposal({
      ...baseProposal(),
      actor: { actorType: 'system-note', displayName: 'System' },
    } as FranchiseMoraleRelationshipOverrideProposal);

    expect(result.status).toBe('invalid');
    expect(result.blockers).toContain('Manual override drafts only allow user, admin, or manual-note actor sources.');
  });

  test('score-only evidence is blocked as player evidence', () => {
    const result = validateFranchiseMoraleRelationshipOverrideProposal(baseProposal({
      evidenceReferences: [scoreOnlyEvidence({ context: 'player', playerId: 'player-1' })],
    }));

    expect(result.status).toBe('invalid');
    expect(result.evidenceSummary.scoreOnlyPlayerEvidenceBlocked).toBe(true);
    expect(result.blockers).toContain('Score-only schedule evidence is allowed only as team/schedule context, not player evidence.');
  });

  test('report summary counts statuses correctly', () => {
    const valid = baseProposal({ targetPlayerId: 'player-valid' });
    const needsApproval = baseProposal({
      targetPlayerId: 'player-approval',
      proposedEffect: {
        direction: 'increase',
        magnitude: 'major',
        summary: 'Major manual override requires approval.',
      },
    });
    const invalid = baseProposal({
      targetPlayerId: 'player-invalid',
      reason: '',
    });

    const report = buildFranchiseMoraleRelationshipOverrideReport([valid, needsApproval, invalid]);

    expect(report).toMatchObject({
      schemaVersion: FRANCHISE_MORALE_RELATIONSHIP_OVERRIDE_SCHEMA_VERSION,
      total: 3,
      validDrafts: 1,
      needsApproval: 1,
      invalid: 1,
      persistable: false,
      mutable: false,
      automaticEffectsAllowed: false,
    });
    expect(report.results.map((result) => result.status)).toEqual([
      'valid-draft',
      'needs-approval',
      'invalid',
    ]);
  });

  test('utility imports no save/set/persist APIs', () => {
    const source = readFileSync('src/utils/franchiseMoraleRelationshipOverrideSchema.ts', 'utf8');

    expect(source).not.toMatch(/from ['"].*(Storage|storage|Adapter|adapter|transaction|gameStories|offseason|sync)/);
    expect(source).not.toMatch(/\b(save|set|persist|mutate|write)[A-Z_]/);
  });

  test('all proposal variants remain non-persistable and non-mutating', () => {
    const proposals: FranchiseMoraleRelationshipOverrideProposal[] = [
      baseProposal(),
      {
        ...baseProposal(),
        kind: 'player-relationship',
        targetPlayerId: 'player-1',
        relatedPlayerId: 'player-2',
      },
      {
        ...baseProposal(),
        kind: 'fanbase-team-relationship',
        targetTeamId: 'team-1',
      },
      {
        ...baseProposal(),
        kind: 'scout-prospect-relationship',
        targetScoutId: 'scout-1',
        targetProspectPlayerId: 'prospect-1',
      },
    ];

    const results = proposals.map(validateFranchiseMoraleRelationshipOverrideProposal);

    expect(results.every((result) => result.persistable === false)).toBe(true);
    expect(results.every((result) => result.mutable === false)).toBe(true);
    expect(results.every((result) => result.automaticEffectsAllowed === false)).toBe(true);
  });
});
