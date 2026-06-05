import { describe, expect, test } from 'vitest';
import {
  applyFranchisePlayerProfileEdit,
  validateFranchisePlayerProfileEdit,
} from '../franchisePlayerProfileEdit';
import type { FranchiseFarmRecord } from '../franchiseFarmStorage';
import type { Player } from '../leagueBuilderStorage';

function makePlayer(overrides: Partial<Player> & Record<string, unknown> = {}): Player {
  return {
    id: 'player-1',
    firstName: 'Editable',
    lastName: 'Player',
    nickname: 'Old Nick',
    gender: 'M',
    age: 25,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'SS',
    secondaryPosition: '2B',
    power: 50,
    contact: 51,
    speed: 52,
    fielding: 53,
    arm: 54,
    velocity: 0,
    junk: 0,
    accuracy: 0,
    arsenal: [],
    overallGrade: 'B',
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
    editHistory: [],
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
    optionsUsed: 0,
    optionDates: [],
    ratingRevealState: 'hidden',
    assignedAt: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('franchise player profile manual edit utility', () => {
  test('MLB/revealed edit payload validates and applies allowed fields', () => {
    const result = applyFranchisePlayerProfileEdit({
      player: makePlayer(),
      teamId: 'team-1',
      leagueId: 'league-1',
      changes: {
        firstName: 'Manual',
        lastName: 'Patch',
        nickname: 'MP',
        age: '29',
        bats: 'S',
        throws: 'L',
        primaryPosition: 'SP',
        secondaryPosition: 'P',
        power: '61',
        contact: 62,
        speed: 63,
        fielding: 64,
        arm: 65,
        velocity: 88,
        junk: 77,
        accuracy: 76,
        arsenal: ['4F', 'SL', '4F'],
        trait1: 'Workhorse',
        trait2: '',
        personality: 'Competitive',
        chemistry: 'Competitive',
        overallGrade: 'A-',
      },
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.player).toEqual(expect.objectContaining({
      firstName: 'Manual',
      lastName: 'Patch',
      nickname: 'MP',
      age: 29,
      bats: 'S',
      throws: 'L',
      primaryPosition: 'SP',
      secondaryPosition: 'P',
      power: 61,
      contact: 62,
      speed: 63,
      fielding: 64,
      arm: 65,
      velocity: 88,
      junk: 77,
      accuracy: 76,
      arsenal: ['4F', 'SL'],
      trait1: 'Workhorse',
      trait2: undefined,
      personality: 'Competitive',
      chemistry: 'Competitive',
      overallGrade: 'A-',
    }));
    expect(result.editHistoryEntries.map((entry) => entry.field)).toEqual(expect.arrayContaining([
      'firstName',
      'lastName',
      'nickname',
      'age',
      'bats',
      'throws',
      'primaryPosition',
      'power',
      'velocity',
      'arsenal',
      'personality',
      'chemistry',
      'overallGrade',
    ]));
  });

  test('rejects invalid ratings, age, hands, positions, grade, and pitch arsenal', () => {
    const result = validateFranchisePlayerProfileEdit({
      player: makePlayer(),
      changes: {
        age: 9,
        bats: 'X',
        throws: 'S',
        primaryPosition: 'GOALIE',
        secondaryPosition: 'MID',
        power: 101,
        contact: 10.5,
        arsenal: ['4F', 'XX'],
        personality: 'Mystery',
        chemistry: 'Fiery',
        overallGrade: 'Z',
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('age must be an integer from 16 to 60');
    expect(result.errors.join(' ')).toContain('power must be an integer from 0 to 99');
    expect(result.errors.join(' ')).toContain('contact must be an integer from 0 to 99');
    expect(result.errors.join(' ')).toContain('bats must be one of');
    expect(result.errors.join(' ')).toContain('throws must be one of');
    expect(result.errors.join(' ')).toContain('primaryPosition must be one of');
    expect(result.errors.join(' ')).toContain('secondaryPosition must be one of');
    expect(result.errors.join(' ')).toContain('arsenal must be one of');
    expect(result.errors.join(' ')).toContain('personality must be one of');
    expect(result.errors.join(' ')).toContain('chemistry must be one of');
    expect(result.errors.join(' ')).toContain('overallGrade must be one of');
  });

  test('allows clearing secondary position on revealed players', () => {
    const result = applyFranchisePlayerProfileEdit({
      player: makePlayer({ secondaryPosition: '2B' }),
      changes: {
        secondaryPosition: '',
      },
    });

    expect(result.valid).toBe(true);
    expect(result.player.secondaryPosition).toBeUndefined();
    expect(result.editHistoryEntries.map((entry) => entry.field)).toContain('secondaryPosition');
  });

  test('revealed non-pitcher blocks pitching rating and arsenal edits', () => {
    const result = validateFranchisePlayerProfileEdit({
      player: makePlayer({
        primaryPosition: 'LF',
        secondaryPosition: 'OF',
        velocity: 0,
        junk: 0,
        accuracy: 0,
        arsenal: [],
      }),
      changes: {
        velocity: 50,
        junk: 51,
        accuracy: 52,
        arsenal: ['4F'],
      },
    });

    expect(result.valid).toBe(false);
    expect(result.blockedFields).toEqual(expect.arrayContaining([
      'velocity',
      'junk',
      'accuracy',
      'arsenal',
    ]));
    expect(result.sanitizedChanges).toEqual({});
    expect(result.errors.join(' ')).toContain('blocked unless the player is a pitcher or TWO-WAY');
  });

  test('TWO-WAY revealed player allows pitching rating and arsenal edits', () => {
    const result = applyFranchisePlayerProfileEdit({
      player: makePlayer({
        primaryPosition: 'TWO-WAY',
        secondaryPosition: 'OF',
        velocity: 70,
        junk: 71,
        accuracy: 72,
        arsenal: ['4F'],
      }),
      changes: {
        velocity: 82,
        junk: 83,
        accuracy: 84,
        arsenal: ['4F', 'CH'],
      },
    });

    expect(result.valid).toBe(true);
    expect(result.player).toEqual(expect.objectContaining({
      velocity: 82,
      junk: 83,
      accuracy: 84,
      arsenal: ['4F', 'CH'],
    }));
  });

  test('unrevealed FARM can edit visible identity fields only', () => {
    const result = applyFranchisePlayerProfileEdit({
      player: makePlayer({
        id: 'farm-player',
        firstName: 'Farm',
        lastName: 'Hidden',
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
        ratingRevealState: 'hidden',
      }),
      farmRecord: makeFarmRecord(),
      teamId: 'team-1',
      leagueId: 'league-1',
      changes: {
        firstName: 'Visible',
        lastName: 'Correction',
        nickname: 'VC',
        age: 22,
        bats: 'L',
        throws: 'L',
        primaryPosition: 'CF',
        secondaryPosition: 'OF',
        trait1: 'Sprinter',
        personality: 'Jolly',
        chemistry: 'Spirited',
      },
    });

    expect(result.valid).toBe(true);
    expect(result.hiddenFarmLimitedEdit).toBe(true);
    expect(result.player).toEqual(expect.objectContaining({
      firstName: 'Visible',
      lastName: 'Correction',
      nickname: 'VC',
      age: 22,
      bats: 'L',
      throws: 'L',
      primaryPosition: 'CF',
      secondaryPosition: 'OF',
      trait1: 'Sprinter',
      personality: 'Jolly',
      chemistry: 'Spirited',
      ratingRevealState: 'hidden',
    }));
  });

  test('unrevealed FARM blocks ratings, arsenal, true grade, hidden fields, scout truth, salary, roster, and reveal fields', () => {
    const result = validateFranchisePlayerProfileEdit({
      player: makePlayer({
        id: 'farm-player',
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
        ratingRevealState: 'hidden',
      }),
      farmRecord: makeFarmRecord(),
      teamId: 'team-1',
      leagueId: 'league-1',
      changes: {
        power: 99,
        contact: 99,
        arsenal: ['4F'],
        overallGrade: 'A+',
        trueGrade: 'S',
        hiddenPersonalityModifiers: { leadership: 99 },
        hiddenScoutTruth: { trueGrade: 'S' },
        prospectProfile: { scoutedGrade: 'A' },
        salary: 10_000_000,
        contractYears: 3,
        rosterStatus: 'MLB',
        leagueAssignments: [],
        ratingRevealState: 'revealed',
        optionsUsedBySeason: {},
      },
    });

    expect(result.valid).toBe(false);
    expect(result.hiddenFarmLimitedEdit).toBe(true);
    expect(result.blockedFields).toEqual(expect.arrayContaining([
      'power',
      'contact',
      'arsenal',
      'overallGrade',
      'trueGrade',
      'hiddenPersonalityModifiers',
      'hiddenScoutTruth',
      'prospectProfile',
      'salary',
      'contractYears',
      'rosterStatus',
      'leagueAssignments',
      'ratingRevealState',
      'optionsUsedBySeason',
    ]));
    expect(result.sanitizedChanges).toEqual({});
  });

  test('salary, roster, reveal, scouting metadata, morale, mojo, and relationships remain read-only for revealed players', () => {
    const result = validateFranchisePlayerProfileEdit({
      player: makePlayer(),
      changes: {
        salary: 12_000_000,
        contractYears: 4,
        leagueAssignments: [],
        rosterStatus: 'FREE_AGENT',
        ratingRevealState: 'hidden',
        prospectProfile: { scoutedGrade: 'S' },
        morale: 99,
        mojo: 'On Fire',
        relationship: 'best friends',
      },
    });

    expect(result.valid).toBe(false);
    expect(result.blockedFields).toEqual(expect.arrayContaining([
      'salary',
      'contractYears',
      'leagueAssignments',
      'rosterStatus',
      'ratingRevealState',
      'prospectProfile',
      'morale',
      'mojo',
      'relationship',
    ]));
  });
});
