import 'fake-indexeddb/auto';
import { describe, expect, test } from 'vitest';

import { evaluatePoolDemandSufficiency } from '../leagueBuilderPoolBuilder';
import { SIZING_TUNING, poolDemandModel } from '../../engines/auctionPoolSizing';

/**
 * CUT2-2: JK ruled 2026-07-07 that pure-pressure shills do not count toward the pool-lock floor.
 * The Start-Draft green light still uses the real clubs' CLASS-FEASIBILITY floor, and shill wins
 * remain advisory market-pressure data only.
 */
describe('evaluatePoolDemandSufficiency (F4 green-light floor)', () => {
  test('8 teams / 2 shills: the floor is real-club feasibility, not shill-inflated demand', () => {
    const model = poolDemandModel(8, 2);

    const atBareSeats = evaluatePoolDemandSufficiency(model.baseSlots, 8, 2);
    expect(atBareSeats.meetsFloor).toBe(false);
    expect(atBareSeats.mlbSlots).toBe(model.feasibilityFloor);

    const atClassFloor = evaluatePoolDemandSufficiency(model.feasibilityFloor, 8, 2);
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
 * args — so they cannot disagree at any shill count. CUT2-2 then makes shills advisory, not part
 * of the hard floor.
 */
describe('F6: the three Start-Draft gates agree at every shill count', () => {
  const TEAMS_8 = 8;
  test.each([0, 2, 3])('S=%i: one shared floor for all three screens', (shills) => {
    const model = poolDemandModel(TEAMS_8, shills);
    const expectedFloor = Math.max(model.baseSlots, model.feasibilityFloor);
    // Each screen's call shape is identical — (poolSize, teamCount, shillCount), never summed.
    const gate = evaluatePoolDemandSufficiency(expectedFloor, TEAMS_8, shills);
    expect(gate.mlbSlots).toBe(expectedFloor);
    expect(gate.meetsFloor).toBe(true);
    expect(evaluatePoolDemandSufficiency(expectedFloor - 1, TEAMS_8, shills).meetsFloor).toBe(false);
  });

  test('S=3 documents the divergence the fix removed: the old summed gate over-demanded', () => {
    const oldSummedFloor = (TEAMS_8 + 3) * 22; // 242 — blocked pools the setup screens green-lit
    const newFloor = evaluatePoolDemandSufficiency(0, TEAMS_8, 3).mlbSlots;
    expect(newFloor).toBe(poolDemandModel(TEAMS_8, 0).feasibilityFloor);
    expect(oldSummedFloor).toBeGreaterThan(newFloor);
  });

  test('30 clubs / 10 shills: the real-club generator target can satisfy the floor', () => {
    const realClubFloor = poolDemandModel(30, 0).feasibilityFloor;
    const withShillPressure = evaluatePoolDemandSufficiency(realClubFloor, 30, 10);

    expect(withShillPressure.meetsFloor).toBe(true);
    expect(withShillPressure.mlbSlots).toBe(realClubFloor);
    expect(withShillPressure.expectedShillWins).toBe(10 * SIZING_TUNING.winsPerShill);
  });
});
