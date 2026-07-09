import 'fake-indexeddb/auto';
import { describe, expect, test } from 'vitest';

import { evaluatePoolDemandSufficiency } from '../leagueBuilderPoolBuilder';
import { SIZING_TUNING, poolDemandModel } from '../../engines/auctionPoolSizing';
import { derivePositionSupplyFloorTargets } from '../../engines/poolFromDemand';
import type { RosterSlotPlayer } from '../../data/rosterConstruction';

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

function floorShape(position: string): RosterSlotPlayer {
  if (position === 'SP') return { isPitcher: true, position: 'P', role: 'SP' };
  if (position === 'RP') return { isPitcher: true, position: 'P', role: 'RP' };
  if (position === 'CP') return { isPitcher: true, position: 'P', role: 'CP' };
  if (position === 'CATCHER_DEPTH') return { isPitcher: false, position: '1B', secondaryPosition: 'C' };
  return { isPitcher: false, position };
}

function floorSatisfiedShapes(teamCount: number): RosterSlotPlayer[] {
  const shapes: RosterSlotPlayer[] = [];
  const targets = derivePositionSupplyFloorTargets(teamCount);
  const primaryCatchers = targets.find((target) => target.position === 'C')?.needed ?? 0;
  for (const target of targets) {
    if (target.position === 'CATCHER_DEPTH') {
      for (let index = 0; index < Math.max(0, target.needed - primaryCatchers); index += 1) {
        shapes.push(floorShape(target.position));
      }
      continue;
    }
    if (target.position === 'RP') {
      const closers = targets.find((candidate) => candidate.position === 'CP')?.needed ?? 0;
      for (let index = 0; index < Math.max(0, target.needed - closers); index += 1) {
        shapes.push(floorShape(target.position));
      }
      continue;
    }
    for (let index = 0; index < target.needed; index += 1) {
      shapes.push(floorShape(target.position));
    }
  }
  return shapes;
}

describe('evaluatePoolDemandSufficiency position-aware floors', () => {
  test('fails with a structured reason when the actual pool is short on closers', () => {
    const teamCount = 3;
    const shapes = floorSatisfiedShapes(teamCount).filter((shape, index) => shape.role !== 'CP' || index % 2 === 0);
    const cpNeeded = derivePositionSupplyFloorTargets(teamCount).find((target) => target.position === 'CP')!.needed;
    const sufficiency = evaluatePoolDemandSufficiency(1_000, teamCount, 0, undefined, shapes);

    expect(sufficiency.meetsFloor).toBe(false);
    expect(sufficiency.surplus).toBeGreaterThan(0);
    expect(sufficiency.positionFloorReasons).toContainEqual(expect.objectContaining({
      position: 'CP',
      label: 'CLOSERS',
      needed: cpNeeded,
      missing: expect.any(Number),
    }));
  });

  test('keeps the count-only result green when the actual pool satisfies every hard position floor', () => {
    const teamCount = 3;
    const shapes = floorSatisfiedShapes(teamCount);
    const sufficiency = evaluatePoolDemandSufficiency(1_000, teamCount, 0, undefined, shapes);

    expect(sufficiency.meetsFloor).toBe(true);
    expect(sufficiency.positionFloorReasons).toEqual([]);
  });
});
