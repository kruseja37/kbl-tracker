import { describe, expect, test } from 'vitest';
import { buildFranchisePlayerProfileViewModel } from '../franchisePlayerProfile';
import type { FranchiseFarmRecord } from '../franchiseFarmStorage';
import type { Player } from '../leagueBuilderStorage';

function makePlayer(overrides: Partial<Player> & Record<string, unknown> = {}): Player {
  return {
    id: 'player-1',
    firstName: 'Profile',
    lastName: 'Player',
    gender: 'M',
    age: 24,
    bats: 'R',
    throws: 'L',
    primaryPosition: 'SS',
    secondaryPosition: '2B',
    power: 71,
    contact: 72,
    speed: 73,
    fielding: 74,
    arm: 75,
    velocity: 0,
    junk: 0,
    accuracy: 0,
    arsenal: [],
    overallGrade: 'B+',
    trait1: 'Sprinter',
    personality: 'Jolly',
    chemistry: 'Spirited',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 3_000_000,
    contractYears: 2,
    leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    isCustom: false,
    ...overrides,
  };
}

function makeFarmRecord(overrides: Partial<FranchiseFarmRecord> = {}): FranchiseFarmRecord {
  return {
    id: 'franchise-1:season-1:team-1:farm-player',
    franchiseId: 'franchise-1',
    seasonId: 'season-1',
    seasonNumber: 1,
    teamId: 'team-1',
    playerId: 'farm-player',
    rosterLevel: 'AAA',
    rosterStatus: 'FARM',
    optionsUsed: 1,
    optionDates: ['2026-04-01T00:00:00.000Z'],
    ratingRevealState: 'hidden',
    assignedAt: '2026-03-01T00:00:00.000Z',
    lastModified: '2026-03-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('franchise player profile view model', () => {
  test('MLB/revealed player exposes full read-only baseball details', () => {
    const profile = buildFranchisePlayerProfileViewModel({
      player: makePlayer(),
      teamId: 'team-1',
      leagueId: 'league-1',
    });

    expect(profile.hiddenSafe).toBe(false);
    expect(profile.rosterStatus).toBe('MLB');
    expect(profile.revealState).toBe('revealed');
    expect(profile.identity).toEqual(expect.objectContaining({
      name: 'Profile Player',
      age: 24,
      bats: 'R',
      throws: 'L',
      primaryPosition: 'SS',
      secondaryPosition: '2B',
      traits: ['Sprinter'],
      personality: 'Jolly',
      chemistry: 'Spirited',
    }));
    expect(profile.fullDetails).toEqual(expect.objectContaining({
      overallGrade: 'B+',
      power: 71,
      contact: 72,
      speed: 73,
      fielding: 74,
      arm: 75,
      arsenal: [],
    }));
    expect(profile.salary).toBe(3_000_000);
    expect(profile.contractYears).toBe(2);
    expect(profile.editHistory).toEqual([]);
    expect(profile.suppressedHiddenFieldLabels).toHaveLength(0);
  });

  test('unrevealed FARM hides true ratings, true grade, hidden modifiers, and hidden scout truth', () => {
    const player = makePlayer({
      id: 'farm-player',
      firstName: 'Farm',
      lastName: 'Hidden',
      primaryPosition: 'CF',
      ratingRevealState: 'hidden',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
      power: 91,
      contact: 92,
      speed: 93,
      fielding: 94,
      arm: 95,
      overallGrade: 'A+',
      salary: 1_000_000,
      prospectProfile: {
        source: 'league-builder-startup-prospect-draft',
        methodVersion: 'prospect-engine-v1',
        draftYear: 1,
        draftRound: 2,
        draftPick: 7,
        scoutedGrade: 'B',
        potentialGrade: 'A-',
        scoutName: 'Scout Visible',
        scoutConfidence: 'medium',
        scoutSpecialtiesVisible: ['OF'],
        scoutWeaknessesVisible: ['P'],
        trueGrade: 'S',
        hiddenScoutTruth: { accuracy: 99 },
      },
      hiddenPersonalityModifiers: {
        leadership: 99,
        volatility: 1,
      },
    });

    const profile = buildFranchisePlayerProfileViewModel({
      player,
      farmRecord: makeFarmRecord(),
      teamId: 'team-1',
      leagueId: 'league-1',
    });
    const serialized = JSON.stringify(profile);

    expect(profile.hiddenSafe).toBe(true);
    expect(profile.rosterStatus).toBe('FARM');
    expect(profile.revealState).toBe('hidden');
    expect(profile.fullDetails).toBeNull();
    expect(profile.prospectReport).toEqual(expect.objectContaining({
      scoutedGrade: 'B',
      potentialGrade: 'A-',
      scoutName: 'Scout Visible',
      scoutConfidence: 'medium',
      source: 'league-builder-startup-prospect-draft',
      methodVersion: 'prospect-engine-v1',
      draftRound: 2,
      draftPick: 7,
    }));
    expect(profile.prospectReport.scoutSpecialtiesVisible).toEqual(['OF']);
    expect(profile.prospectReport.scoutWeaknessesVisible).toEqual(['P']);
    expect(profile.farm).toEqual(expect.objectContaining({
      recordPresent: true,
      rosterLevel: 'AAA',
      optionsUsed: 1,
      optionDates: ['2026-04-01T00:00:00.000Z'],
    }));
    expect(serialized).not.toContain('91');
    expect(serialized).not.toContain('92');
    expect(serialized).not.toContain('93');
    expect(serialized).not.toContain('94');
    expect(serialized).not.toContain('95');
    expect(serialized).not.toContain('"S"');
    expect(serialized).not.toContain('leadership');
    expect(serialized).not.toContain('volatility');
    expect(serialized).not.toContain('hiddenScoutTruth');
    expect(serialized).not.toContain('hiddenPersonalityModifiers');
    expect(profile.limitations.join(' ')).toContain('true ratings');
  });

  test('hidden FARM profile edit history omits rating and hidden truth entries', () => {
    const profile = buildFranchisePlayerProfileViewModel({
      player: makePlayer({
        id: 'farm-player',
        firstName: 'Farm',
        lastName: 'Hidden',
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
        ratingRevealState: 'hidden',
        editHistory: [
          {
            date: '2026-04-01T00:00:00.000Z',
            field: 'firstName',
            oldValue: 'Farm',
            newValue: 'Visible',
            context: 'base',
          },
          {
            date: '2026-04-02T00:00:00.000Z',
            field: 'power',
            oldValue: 40,
            newValue: 99,
            context: 'base',
          },
          {
            date: '2026-04-03T00:00:00.000Z',
            field: 'trueGrade',
            oldValue: 'C',
            newValue: 'S',
            context: 'base',
          },
          {
            date: '2026-04-04T00:00:00.000Z',
            field: 'hiddenPersonalityModifiers',
            oldValue: { leadership: 10 },
            newValue: { leadership: 99 },
            context: 'base',
          },
        ],
      }),
      farmRecord: makeFarmRecord(),
      teamId: 'team-1',
      leagueId: 'league-1',
    });
    const serialized = JSON.stringify(profile.editHistory);

    expect(profile.editHistory).toEqual([
      {
        date: '2026-04-01T00:00:00.000Z',
        field: 'firstName',
        oldValue: 'Farm',
        newValue: 'Visible',
      },
    ]);
    expect(serialized).not.toContain('99');
    expect(serialized).not.toContain('trueGrade');
    expect(serialized).not.toContain('hiddenPersonalityModifiers');
    expect(serialized).not.toContain('leadership');
  });

  test('revealed or called-up prospect exposes full details', () => {
    const profile = buildFranchisePlayerProfileViewModel({
      player: makePlayer({
        id: 'farm-player',
        firstName: 'Farm',
        lastName: 'Revealed',
        primaryPosition: 'SP',
        secondaryPosition: 'P',
        velocity: 89,
        junk: 76,
        accuracy: 77,
        arsenal: ['4F', 'SL'],
        ratingRevealState: 'revealed',
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
        prospectProfile: {
          trueGrade: 'A',
          scoutedGrade: 'B+',
          potentialGrade: 'A',
        },
      }),
      teamId: 'team-1',
      leagueId: 'league-1',
    });

    expect(profile.hiddenSafe).toBe(false);
    expect(profile.revealState).toBe('revealed');
    expect(profile.rosterStatus).toBe('MLB');
    expect(profile.fullDetails).toEqual(expect.objectContaining({
      velocity: 89,
      junk: 76,
      accuracy: 77,
      arsenal: ['4F', 'SL'],
    }));
    expect(JSON.stringify(profile)).not.toContain('trueGrade');
  });
});
