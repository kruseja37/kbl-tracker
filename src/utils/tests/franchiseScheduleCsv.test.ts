import { describe, expect, test } from 'vitest';
import { validateFranchiseScheduleCsv } from '../franchiseScheduleCsv';

const teams = [
  { id: 'team-away', name: 'Away Club', abbreviation: 'AWY' },
  { id: 'team-home', name: 'Home Club', abbreviation: 'HOM' },
  { id: 'team-third', name: 'Third Club', abbreviation: 'THD' },
];

describe('franchise schedule CSV parser and validator', () => {
  test('accepts valid user-authored schedule rows and resolves franchise-owned teams', () => {
    const result = validateFranchiseScheduleCsv(
      [
        'gameNumber,awayTeam,homeTeam,dayNumber,date,time,notes',
        '1,Away Club,Home Club,3,July 12,7:00 PM,"SMB4 row, user entered"',
        '2,THD,team-away,,July 13,,',
      ].join('\n'),
      { teams },
    );

    expect(result.hasErrors).toBe(false);
    expect(result.acceptedRows).toEqual([
      {
        gameNumber: 1,
        dayNumber: 3,
        date: 'July 12',
        time: '7:00 PM',
        notes: 'SMB4 row, user entered',
        awayTeamId: 'team-away',
        homeTeamId: 'team-home',
      },
      {
        gameNumber: 2,
        dayNumber: 2,
        date: 'July 13',
        time: undefined,
        notes: undefined,
        awayTeamId: 'team-third',
        homeTeamId: 'team-away',
      },
    ]);
  });

  test('rejects empty files and malformed rows', () => {
    expect(validateFranchiseScheduleCsv('', { teams }).issues).toEqual([
      {
        rowNumber: 1,
        code: 'EMPTY_FILE',
        message: 'Schedule CSV is empty.',
      },
    ]);

    const malformed = validateFranchiseScheduleCsv(
      ['gameNumber,awayTeam,homeTeam', '1,Away Club'].join('\n'),
      { teams },
    );

    expect(malformed.hasErrors).toBe(true);
    expect(malformed.issues).toMatchObject([
      { rowNumber: 2, code: 'MALFORMED_ROW' },
    ]);
    expect(malformed.acceptedRows).toEqual([]);
  });

  test('rejects unknown teams, same-team rows, invalid numbers, and duplicate game numbers', () => {
    const result = validateFranchiseScheduleCsv(
      [
        'gameNumber,awayTeam,homeTeam',
        '1,Away Club,Unknowns',
        '2,Home Club,Home Club',
        '2,Away Club,Third Club',
        'bad,Away Club,Home Club',
      ].join('\n'),
      { teams },
    );

    expect(result.hasErrors).toBe(true);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      'UNKNOWN_TEAM',
      'SAME_TEAM',
      'DUPLICATE_GAME_NUMBER',
      'INVALID_GAME_NUMBER',
    ]);
    expect(result.acceptedRows).toEqual([]);
  });

  test('rejects game numbers already present in the franchise schedule', () => {
    const result = validateFranchiseScheduleCsv(
      ['gameNumber,awayTeam,homeTeam', '4,Away Club,Home Club'].join('\n'),
      {
        teams,
        existingGames: [{ gameNumber: 4 }],
      },
    );

    expect(result.hasErrors).toBe(true);
    expect(result.issues).toMatchObject([
      { rowNumber: 2, code: 'DUPLICATE_GAME_NUMBER' },
    ]);
  });
});
