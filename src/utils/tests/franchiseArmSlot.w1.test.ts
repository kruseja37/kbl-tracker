import { describe, expect, test } from 'vitest';

import { generateSmb4Players } from '../../engines/smb4PlayerGenerator';
import { calculateFranchisePlayerSalary } from '../franchiseSalary';
import type { Player } from '../leagueBuilderStorage';
import { generateProspectScoutingDraft } from '../prospectScoutingDraftEngine';

function makePitcher(overrides: Partial<Player> = {}): Player {
  return {
    id: 'pitcher-a',
    firstName: 'Sub',
    lastName: 'Tester',
    gender: 'M',
    age: 27,
    bats: 'R',
    throws: 'R',
    armSlot: null,
    primaryPosition: 'SP',
    power: 20,
    contact: 25,
    speed: 35,
    fielding: 60,
    arm: 0,
    velocity: 82,
    junk: 78,
    accuracy: 75,
    arsenal: ['4F', 'SL', 'CH'],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 0,
    leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'MLB' }],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    isCustom: false,
    editHistory: [],
    ...overrides,
  };
}

describe('W1-C franchise armSlot threading', () => {
  test('generated players carry explicit null armSlot by default', () => {
    const [generatedPitcher] = generateSmb4Players({
      count: 1,
      targetGrade: 'B',
      positions: ['SP'],
      seed: 'w1-arm-slot',
    });

    const prospectDraft = generateProspectScoutingDraft({
      leagueId: 'league-1',
      seasonNumber: 1,
      teamDraftOrder: [{ teamId: 'team-a', teamName: 'Alpha' }],
      rounds: 1,
      seed: 'w1-arm-slot-prospect',
      existingTeamIds: ['team-a'],
      scoutsByTeamId: {
        'team-a': {
          scoutId: 'scout-a',
          scoutName: 'Scout Alpha',
        },
      },
    });

    expect(generatedPitcher.armSlot).toBeNull();
    expect(prospectDraft.generatedPlayers[0].armSlot).toBeNull();
  });

  test("franchise salary reprice distinguishes Sub arm slot from null arm slot", () => {
    const neutral = makePitcher({ armSlot: null });
    const sub = makePitcher({ armSlot: 'Sub' });

    expect(calculateFranchisePlayerSalary(sub)).not.toBe(calculateFranchisePlayerSalary(neutral));
  });
});
