import { describe, expect, test } from 'vitest';
import {
  chemistryAdviceForCandidate,
  chemistryProfileForPlayers,
  chemistryRemovalAdvice,
  toChemistryContextPlayer,
} from '../chemistryIntelligence';
import type { Player } from '../leagueBuilderStorage';

function makePlayer(overrides: Partial<Player> & Pick<Player, 'id'>): Player {
  return {
    id: overrides.id,
    firstName: 'Test',
    lastName: overrides.id,
    gender: 'M',
    age: 28,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'CF',
    power: 60,
    contact: 60,
    speed: 60,
    fielding: 60,
    arm: 60,
    velocity: 50,
    junk: 50,
    accuracy: 50,
    arsenal: [],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 1000,
    leagueAssignments: [],
    ...overrides,
  } as Player;
}

describe('chemistryIntelligence adapters', () => {
  test('toChemistryContextPlayer extracts chemistry + real traits and builds a priceable IV input', () => {
    const context = toChemistryContextPlayer(
      makePlayer({ id: 'p1', chemistry: 'Scholarly', trait1: 'Big Hack', trait2: undefined }),
    );
    expect(context.chemistry).toBe('Scholarly');
    expect(context.traits).toEqual(['Big Hack']);
    expect(context.iv.isPitcher).toBe(false);
    expect(context.iv.batterRatings ?? context.iv.ratings).toBeTruthy();
  });

  test('end-to-end: a Scholarly add that tips 2->3 prices the teammate Big Hack lift in dollars', () => {
    const roster = [
      makePlayer({ id: 'sch-1', chemistry: 'Scholarly', trait1: 'Big Hack' }),
      makePlayer({ id: 'sch-2', chemistry: 'Scholarly' }),
      makePlayer({ id: 'cmp-1', chemistry: 'Competitive', trait1: 'Cannon Arm' }),
    ];
    const advice = chemistryAdviceForCandidate(
      makePlayer({ id: 'candidate', chemistry: 'Scholarly' }),
      roster,
    );
    expect(advice.crossing).toBe('L1->L2');
    expect(advice.teamLift).toBeGreaterThan(0);
    expect(advice.liftedTraitCount).toBe(1);
    expect(advice.premium).toBe(advice.teamLift + advice.ownContext);
  });

  test('removal advice prices the down-tier ripple and skips the departing player by id', () => {
    const departing = makePlayer({ id: 'sch-out', chemistry: 'Scholarly', trait1: 'Big Hack' });
    const roster = [
      departing,
      makePlayer({ id: 'sch-stay', chemistry: 'Scholarly', trait1: 'Big Hack' }),
      makePlayer({ id: 'sch-3', chemistry: 'Scholarly' }),
    ];
    const advice = chemistryRemovalAdvice(departing, roster);
    expect(advice.crossing).toBe('L2->L1');
    expect(advice.affectedTraitCount).toBe(1); // sch-stay's Big Hack only
    expect(advice.teamLoss).toBeLessThan(0);
  });

  test('profile summarizes counts, tiers and trait supply per family', () => {
    const profile = chemistryProfileForPlayers([
      makePlayer({ id: 'a', chemistry: 'Scholarly', trait1: 'Big Hack' }),
      makePlayer({ id: 'b', chemistry: 'Scholarly' }),
      makePlayer({ id: 'c', chemistry: 'Crafty', trait1: 'Stealer' }),
    ]);
    expect(profile.find((f) => f.family === 'SCH')).toMatchObject({ count: 2, tier: 'L1', traitCount: 1 });
    expect(profile.find((f) => f.family === 'CRA')).toMatchObject({ count: 1, tier: 'L1', traitCount: 1 });
  });
});
