import 'fake-indexeddb/auto';
import { describe, expect, test } from 'vitest';

import { evaluatePoolDemandSufficiency } from '../leagueBuilderPoolBuilder';
import { SIZING_TUNING, poolDemandModel } from '../../engines/auctionPoolSizing';

/**
 * FABLE-C3-FIX F4: the Start-Draft green light must sit at the model's CLASS-FEASIBILITY floor
 * (+ capped shill wins), not bare seats + wins — the sweep proved the bare number sheds 20/20
 * drafts. `targetSize` (identity-roomy) is the surfaced recommendation above the floor.
 */
describe('evaluatePoolDemandSufficiency (F4 green-light floor)', () => {
  test('8 teams / 2 shills: the floor is feasibilityFloor + capped wins, not seats + wins', () => {
    const model = poolDemandModel(8, 2);
    const bareSeatsFloor = model.baseSlots + model.expectedShillWins; // 176 + 20 = 196
    const classFloor = model.feasibilityFloor + model.expectedShillWins; // 202 + 20 = 222

    const atBareSeats = evaluatePoolDemandSufficiency(bareSeatsFloor, 8, 2);
    expect(atBareSeats.meetsFloor).toBe(false);
    expect(atBareSeats.mlbSlots).toBe(classFloor);

    const atClassFloor = evaluatePoolDemandSufficiency(classFloor, 8, 2);
    expect(atClassFloor.meetsFloor).toBe(true);
    expect(atClassFloor.surplus).toBe(0);
  });

  test('the recommended target and shill-win budget ride the same tuned constant', () => {
    const sufficiency = evaluatePoolDemandSufficiency(300, 8, 3);
    expect(sufficiency.expectedShillWins).toBe(3 * SIZING_TUNING.winsPerShill);
    expect(sufficiency.targetSize).toBe(poolDemandModel(8, 3).targetSize);
    expect(sufficiency.targetSize).toBeGreaterThan(sufficiency.mlbSlots);
  });

  test('shill-less leagues keep a pure class-feasibility floor', () => {
    const model = poolDemandModel(8, 0);
    const sufficiency = evaluatePoolDemandSufficiency(model.feasibilityFloor, 8, 0);
    expect(sufficiency.meetsFloor).toBe(true);
    expect(sufficiency.mlbSlots).toBe(model.feasibilityFloor); // 202
  });
});

/**
 * FABLE-C3-FIX-2 F6: all THREE Start-Draft gates (LeagueBuilderDraftSetup, DraftSetupHubPreview,
 * LeagueBuilderAuctionDraft) call this one function with (poolSize, teams, shills) as SEPARATE
 * args — so they cannot disagree at any shill count. The old auction-page pattern (summed
 * participants × 22) diverged from the setup screens at S≥3; pin the agreement and the divergence
 * it replaced.
 */
describe('F6: the three Start-Draft gates agree at every shill count', () => {
  const TEAMS_8 = 8;
  test.each([0, 2, 3])('S=%i: one shared floor for all three screens', (shills) => {
    const model = poolDemandModel(TEAMS_8, shills);
    const expectedFloor = Math.max(
      model.baseSlots + model.expectedShillWins,
      model.feasibilityFloor + model.expectedShillWins,
    );
    // Each screen's call shape is identical — (poolSize, teamCount, shillCount), never summed.
    const gate = evaluatePoolDemandSufficiency(expectedFloor, TEAMS_8, shills);
    expect(gate.mlbSlots).toBe(expectedFloor);
    expect(gate.meetsFloor).toBe(true);
    expect(evaluatePoolDemandSufficiency(expectedFloor - 1, TEAMS_8, shills).meetsFloor).toBe(false);
  });

  test('S=3 documents the divergence the fix removed: the old summed gate over-demanded', () => {
    const oldSummedFloor = (TEAMS_8 + 3) * 22; // 242 — blocked pools the setup screens green-lit
    const newFloor = evaluatePoolDemandSufficiency(0, TEAMS_8, 3).mlbSlots; // 202 + 30 = 232
    expect(newFloor).toBe(232);
    expect(oldSummedFloor).toBeGreaterThan(newFloor);
  });
});
