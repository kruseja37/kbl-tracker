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
      ratingModelGrade: 'A-',
      storedOverallGrade: 'B+',
      power: 71,
      contact: 72,
      speed: 73,
      fielding: 74,
      arm: 75,
      pitchingModelAvailable: false,
      pitchingRatings: null,
    }));
    expect(JSON.stringify(profile.fullDetails)).not.toContain('velocity');
    expect(JSON.stringify(profile.fullDetails)).not.toContain('junk');
    expect(JSON.stringify(profile.fullDetails)).not.toContain('accuracy');
    expect(JSON.stringify(profile.fullDetails)).not.toContain('arsenal');
    expect(profile.salary).toBe(3_000_000);
    expect(profile.contractYears).toBe(2);
    expect(profile.activeDesignations).toEqual([]);
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
        loyalty: 99,
        ambition: 1,
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
    expect(serialized).not.toContain('loyalty');
    expect(serialized).not.toContain('ambition');
    expect(serialized).not.toContain('hiddenScoutTruth');
    expect(serialized).not.toContain('hiddenPersonalityModifiers');
    expect(profile.limitations.join(' ')).toContain('true ratings');
    expect(profile.activeDesignations).toEqual([]);
  });

  test('revealed current player exposes active TEAM_MVP and ACE designation context', () => {
    const profile = buildFranchisePlayerProfileViewModel({
      player: makePlayer({
        franchiseDesignations: [
          {
            franchiseId: 'franchise-1',
            seasonId: 'season-1',
            statsScopeId: 'season-1',
            seasonNumber: 1,
            teamId: 'team-1',
            playerId: 'player-1',
            playerName: 'Profile Player',
            type: 'TEAM_MVP',
            status: 'active',
            sourceInputs: { totalWAR: 1.8 },
            calculationVersion: 'franchise-designations-v1-active-team-mvp-ace',
            calculatedAt: '2026-06-01T00:00:00.000Z',
          },
          {
            franchiseId: 'franchise-1',
            seasonId: 'season-1',
            statsScopeId: 'season-1',
            seasonNumber: 1,
            teamId: 'team-2',
            playerId: 'player-1',
            playerName: 'Profile Player',
            type: 'ACE',
            status: 'active',
            sourceInputs: { pWAR: 1.2 },
            calculationVersion: 'franchise-designations-v1-active-team-mvp-ace',
            calculatedAt: '2026-06-02T00:00:00.000Z',
          },
          {
            franchiseId: 'franchise-1',
            seasonId: 'season-1',
            statsScopeId: 'season-1',
            seasonNumber: 1,
            teamId: 'team-1',
            playerId: 'player-1',
            playerName: 'Profile Player',
            type: 'FAN_FAVORITE',
            status: 'projected',
            sourceInputs: { valueDelta: 2 },
            calculationVersion: 'legacy-test',
            calculatedAt: '2026-06-03T00:00:00.000Z',
          },
        ],
      }),
      teamId: 'team-1',
      leagueId: 'league-1',
    });

    expect(profile.hiddenSafe).toBe(false);
    expect(profile.activeDesignations).toEqual([
      {
        type: 'TEAM_MVP',
        status: 'active',
        teamId: 'team-1',
        calculatedAt: '2026-06-01T00:00:00.000Z',
      },
    ]);
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
            oldValue: { loyalty: 10 },
            newValue: { loyalty: 99 },
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
    expect(serialized).not.toContain('loyalty');
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
      pitchingModelAvailable: true,
      pitchingRatings: {
        velocity: 89,
        junk: 76,
        accuracy: 77,
        arsenal: ['4F', 'SL'],
      },
    }));
    expect(JSON.stringify(profile)).not.toContain('trueGrade');
  });

  test('TWO-WAY revealed player exposes full pitching model details', () => {
    const profile = buildFranchisePlayerProfileViewModel({
      player: makePlayer({
        id: 'two-way-player',
        firstName: 'Two',
        lastName: 'Way',
        primaryPosition: 'TWO-WAY',
        secondaryPosition: 'OF',
        velocity: 81,
        junk: 79,
        accuracy: 74,
        arsenal: ['4F', 'CH', 'SL'],
        ratingRevealState: 'revealed',
      }),
      teamId: 'team-1',
      leagueId: 'league-1',
    });

    expect(profile.fullDetails).toEqual(expect.objectContaining({
      pitchingModelAvailable: true,
      pitchingRatings: {
        velocity: 81,
        junk: 79,
        accuracy: 74,
        arsenal: ['4F', 'CH', 'SL'],
      },
    }));
  });

  test('sent-down revealed player remains full-detail visible and keeps known salary context on FARM', () => {
    const profile = buildFranchisePlayerProfileViewModel({
      player: makePlayer({
        id: 'sent-down-player',
        firstName: 'Sent',
        lastName: 'Down',
        salary: 7.5,
        ratingRevealState: 'revealed',
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
      }),
      farmRecord: makeFarmRecord({
        playerId: 'sent-down-player',
        ratingRevealState: 'hidden',
      }),
      teamId: 'team-1',
      leagueId: 'league-1',
    });

    expect(profile.rosterStatus).toBe('FARM');
    expect(profile.revealState).toBe('revealed');
    expect(profile.hiddenSafe).toBe(false);
    expect(profile.fullDetails).toEqual(expect.objectContaining({
      ratingModelGrade: 'A-',
      storedOverallGrade: 'B+',
      power: 71,
      contact: 72,
      pitchingModelAvailable: false,
      pitchingRatings: null,
    }));
    expect(profile.salary).toBe(7.5);
  });
});
