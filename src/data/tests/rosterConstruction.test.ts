import { describe, it, expect } from 'vitest';
import { LEGAL_ROSTER, isLegalRoster, canStart, canRelieve, type RosterSlotPlayer } from '../rosterConstruction';

/** Build a roster from position/role tokens: 'C','1B',… for hitters; 'SP','RP','CP','SP/RP' for pitchers. */
function roster(tokens: string[]): RosterSlotPlayer[] {
  const pitcherRoles = new Set(['SP', 'RP', 'CP', 'SP/RP']);
  return tokens.map((t) =>
    pitcherRoles.has(t)
      ? { isPitcher: true, position: t === 'CP' ? 'CP' : t.startsWith('SP') ? 'SP' : 'RP', role: t }
      : { isPitcher: false, position: t },
  );
}

// A canonical 14-position / 8-pitcher legal roster (config A): 8 field + backup C + 5 bench + 4 SP + 4 RP.
const LEGAL_14_8 = roster([
  'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF',
  'C', 'LF', 'CF', '1B', 'SS', '2B',
  'SP', 'SP', 'SP', 'SP',
  'RP', 'RP', 'RP', 'CP',
]);

// The flex variant: 13 position / 9 pitchers (bench 4, relievers 5): 8 field + backup C + 4 bench + 4 SP + 5 RP.
const LEGAL_13_9 = roster([
  'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF',
  'C', 'LF', 'CF', '1B', 'SS',
  'SP', 'SP', 'SP', 'SP',
  'RP', 'RP', 'RP', 'RP', 'CP',
]);

describe('rosterConstruction — the canonical legal SMB4 roster', () => {
  it('accepts both legal flex configurations (14/8 and 13/9)', () => {
    expect(LEGAL_14_8).toHaveLength(LEGAL_ROSTER.size);
    expect(isLegalRoster(LEGAL_14_8)).toBe(true);
    expect(LEGAL_13_9).toHaveLength(LEGAL_ROSTER.size);
    expect(isLegalRoster(LEGAL_13_9)).toBe(true);
  });

  it('rejects a roster with no backup catcher (only one catcher)', () => {
    const noBackupC = roster([
      'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF',
      'RF', 'LF', 'CF', '1B', 'SS', '2B', // 6 bench, none a catcher
      'SP', 'SP', 'SP', 'SP', 'RP', 'RP', 'RP', 'CP',
    ]);
    expect(noBackupC).toHaveLength(LEGAL_ROSTER.size);
    expect(isLegalRoster(noBackupC)).toBe(false);
  });

  it('rejects a roster missing a required field position (no SS)', () => {
    const noSS = roster([
      'C', '1B', '2B', '3B', 'LF', 'CF', 'RF', 'RF', // no SS anywhere
      'C', 'LF', 'CF', '1B', '2B', '3B',
      'SP', 'SP', 'SP', 'SP', 'RP', 'RP', 'RP', 'CP',
    ]);
    expect(noSS).toHaveLength(LEGAL_ROSTER.size);
    expect(isLegalRoster(noSS)).toBe(false);
  });

  it('rejects fewer than four startable arms (only 3 SP)', () => {
    const threeStarters = roster([
      'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF',
      'C', 'LF', 'CF', '1B', 'SS', '2B',
      'SP', 'SP', 'SP', 'RP', 'RP', 'RP', 'RP', 'CP', // 3 SP + 5 relief-eligible
    ]);
    expect(threeStarters).toHaveLength(LEGAL_ROSTER.size);
    expect(isLegalRoster(threeStarters)).toBe(false);
  });

  it('rejects the wrong roster size', () => {
    expect(isLegalRoster(LEGAL_14_8.slice(0, 21))).toBe(false);
  });

  it('classifies pitcher roles for start/relieve eligibility (SP/RP swings both)', () => {
    expect(canStart({ isPitcher: true, position: 'SP', role: 'SP' })).toBe(true);
    expect(canStart({ isPitcher: true, position: 'SP', role: 'SP/RP' })).toBe(true);
    expect(canStart({ isPitcher: true, position: 'RP', role: 'RP' })).toBe(false);
    expect(canRelieve({ isPitcher: true, position: 'CP', role: 'CP' })).toBe(true);
    expect(canRelieve({ isPitcher: true, position: 'SP', role: 'SP/RP' })).toBe(true);
    expect(canRelieve({ isPitcher: true, position: 'SP', role: 'SP' })).toBe(false);
  });
});
