import 'fake-indexeddb/auto';

import { describe, expect, test, afterEach } from 'vitest';
import { processCompletedGame } from '../../src/utils/processCompletedGame';
import { forceAllPhase2FlagsOn, type ForcedPhase2Flags } from './flags';
import { readLsimSoulProofState, summarizeLsimCounts, type LsimSoulProofState } from './proof';
import { setupLsimSandbox } from './sandbox';
import { generateLsimSyntheticCompletedGame } from './syntheticGame';

let forcedFlags: ForcedPhase2Flags | null = null;

afterEach(() => {
  forcedFlags?.restore();
  forcedFlags = null;
});

function failGate(gate: string, before: LsimSoulProofState, after: LsimSoulProofState, detail?: unknown): never {
  throw new Error([
    `[L-SIM-H1] ${gate} gate did not fire.`,
    `before=${JSON.stringify(summarizeLsimCounts(before))}`,
    `after=${JSON.stringify(summarizeLsimCounts(after))}`,
    detail ? `detail=${JSON.stringify(detail)}` : null,
  ].filter(Boolean).join('\n'));
}

describe('L-SIM H1 flags-on sandbox preflight', () => {
  test('one checkpoint completed game drives the real processCompletedGame soul-layer branches', async () => {
    forcedFlags = forceAllPhase2FlagsOn();
    const context = await setupLsimSandbox();
    const before = await readLsimSoulProofState(context.scope);
    const synthetic = generateLsimSyntheticCompletedGame(context);

    console.log('[L-SIM-H1] forced phase-2 flag setters', JSON.stringify(forcedFlags.setterNames));
    console.log('[L-SIM-H1] setup', JSON.stringify({
      path: context.setupPath,
      salaryBaselineVersion: context.salaryBaseline.calculationVersion,
      salaryBaselineTeams: Object.keys(context.salaryBaseline.teamPayrolls).length,
      trueValueCandidatePlayerId: context.trueValueCandidatePlayerId,
      checkpointGameNumber: context.ids.checkpointGameNumber,
    }));
    console.log('[L-SIM-H1] soul store counts before', JSON.stringify(summarizeLsimCounts(before)));

    const result = await processCompletedGame(
      synthetic.gameState,
      context.processOptions,
      context.ids.leagueId,
      synthetic.archiveOptions,
    );
    const after = await readLsimSoulProofState(context.scope);

    console.log('[L-SIM-H1] soul store counts after', JSON.stringify(summarizeLsimCounts(after)));
    console.log('[L-SIM-H1] process result', JSON.stringify(result));

    expect(result.aggregation.success).toBe(true);

    const candidateTrueValue = after.trueValueRows.find(
      (row) => row.playerId === context.trueValueCandidatePlayerId,
    );
    console.log('[L-SIM-H1] true value candidate proof', JSON.stringify(candidateTrueValue ?? null));

    if (after.counts.trueValueRows <= before.counts.trueValueRows) {
      failGate('TRUE_VALUE_PERSIST', before, after, {
        expected: 'franchiseTrueValueRows increased after real completed-game processing',
      });
    }
    if (!candidateTrueValue || !Number.isFinite(candidateTrueValue.valueDelta)) {
      failGate('TRUE_VALUE_CANDIDATE_NUMERIC_VALUE_DELTA', before, after, {
        candidatePlayerId: context.trueValueCandidatePlayerId,
      });
    }
    if (after.counts.fameRowsWithWpaSpine <= before.counts.fameRowsWithWpaSpine) {
      failGate('FAME_WPA_SPINE', before, after, {
        expected: 'franchiseFameRecords row with reachFloor>=0 and channelByChannel.wpa_spine>0',
        fameRows: after.fameRows,
      });
    }
    if (after.counts.designationRows <= before.counts.designationRows) {
      failGate('DESIGNATION_ROWS', before, after, {
        expected: 'franchiseDesignationRows row persisted after True Value',
        designationRows: after.designationRows,
      });
    }
    if (after.counts.pendingRatingsDevelopmentOverlays <= before.counts.pendingRatingsDevelopmentOverlays) {
      failGate('CHECKPOINT_RATINGS_OVERLAY', before, after, {
        expected: 'pending permanent ratings-development overlay at checkpoint',
        ratingsOverlays: after.ratingsOverlays,
      });
    }
  });
});
