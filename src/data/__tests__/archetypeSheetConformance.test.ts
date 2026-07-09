import { describe, expect, it } from 'vitest';

import { HISTORICAL_ARCHETYPES, archetypeCapShift } from '../historicalArchetypes';

/**
 * ARCHLOCK weld (2026-07-09): welds the code (`historicalArchetypes.ts`) to the ratified design
 * sheet (`spec-docs/TEAM_ARCHETYPES_24.md`).
 *
 * THIS TABLE MIRRORS spec-docs/TEAM_ARCHETYPES_24.md — any retune must update the sheet AND this
 * table in the same commit, or this test goes red. Each entry is the archetype's exact cap-shift
 * fraction per stat, read straight off the sheet's "(cap ±X%)" annotations (÷100 to a fraction),
 * keyed by the same `${group}/${stat}` scheme `archetypeCapShift` produces.
 *
 * Why this test exists and the existing balance-sim gate (historicalArchetypes.test.ts) does not
 * cover this: the balance sim only proves the 24 archetypes AS CODED are value-parity balanced
 * against EACH OTHER — it grades the code against itself and would happily pass a silently retuned
 * archetype as long as the whole set stayed in band. It has no notion of the ratified design sheet
 * at all, so a code change that drifts from the sheet (or a sheet edit nobody ported to code) is
 * invisible to it. This test is the only thing that reads the sheet's numbers into an assertion.
 *
 * Provenance of the two 2026-07-09 corrections below (sheet was stale, code was already right —
 * see spec-docs/DECISIONS_LOG.md 2026-07-09 entry and spec-docs/contracts/CONTRACT_ARCHLOCK_2026-07-09.md):
 * - hdh-royals: retuned in commit 057f4525 ("HDH Royals archetype retuned to hold value-parity").
 * - bash-brothers: re-banded in commit f71059ec ("Bash Brothers re-band: PEN_ACC -1 -> -0.5").
 */
const RATIFIED_SHIFTS: Record<string, Record<string, number>> = {
  'murderers-row': { 'hitters/POW': 0.075, 'hitters/CON': 0.10, 'hitters/SPD': -0.18 },
  'bomba-squad': { 'hitters/POW': 0.10, 'hitters/CON': -0.15, 'hitters/SPD': -0.12 },
  // Re-banded in f71059ec (PEN_ACC −0.30 → −0.15, require-a-closer work); re-verified 2026-07-09.
  'bash-brothers': { 'hitters/POW': 0.075, 'hitters/ARM': 0.12, 'rotation/ACC': -0.25, 'bullpen/ACC': -0.15 },
  'whiteyball': { 'hitters/SPD': 0.18, 'hitters/FLD': 0.33, 'hitters/POW': -0.10 },
  'go-go-small-ball': { 'hitters/CON': 0.15, 'hitters/FLD': 0.22, 'hitters/POW': -0.10 },
  'dead-ball-suppressors': { 'rotation/JNK': 0.45, 'hitters/CON': 0.10, 'hitters/POW': -0.10, 'bullpen/VEL': -0.20 },
  'billy-ball-burners': { 'hitters/SPD': 0.24, 'hitters/POW': -0.075, 'rotation/ACC': -0.25 },
  'junkball-surgeons': { 'rotation/ACC': 0.375, 'rotation/JNK': 0.30, 'hitters/POW': -0.05, 'rotation/VEL': -0.16 },
  'flamethrowers': { 'rotation/VEL': 0.32, 'hitters/POW': -0.05, 'hitters/CON': -0.10 },
  'nasty-boys': { 'bullpen/VEL': 0.40, 'bullpen/ACC': -0.45 },
  // Retuned in 057f4525 (value-parity re-pin during the reliever repricing); re-verified 2026-07-09.
  'hdh-royals': { 'bullpen/ACC': 0.09, 'hitters/SPD': 0.12, 'hitters/POW': -0.025, 'rotation/ACC': -0.0625 },
  'the-opener': { 'bullpen/VEL': 0.30, 'bullpen/JNK': 0.35, 'rotation/VEL': -0.24, 'rotation/ACC': -0.25 },
  'the-oriole-way': { 'hitters/FLD': 0.33, 'rotation/ACC': 0.375, 'hitters/SPD': -0.12, 'bullpen/VEL': -0.20 },
  'shift-era-suppressors': { 'hitters/FLD': 0.33, 'rotation/VEL': 0.16, 'hitters/CON': -0.15, 'bullpen/ACC': -0.30 },
  'big-red-machine': { 'hitters/CON': 0.15, 'hitters/FLD': 0.22, 'hitters/POW': 0.025, 'rotation/VEL': -0.24, 'rotation/ACC': -0.25 },
  'hit-em-where-they-aint': { 'hitters/CON': 0.15, 'hitters/SPD': 0.12, 'hitters/POW': -0.10 },
  'toolsy-burners': { 'hitters/POW': 0.05, 'hitters/SPD': 0.18, 'rotation/ACC': -0.25, 'hitters/FLD': -0.22 },
  'cannon-corps': { 'hitters/ARM': 0.24, 'hitters/FLD': 0.22, 'hitters/POW': -0.05, 'hitters/SPD': -0.12 },
  'gap-to-gap': { 'hitters/CON': 0.15, 'hitters/POW': 0.05, 'rotation/ACC': -0.25, 'bullpen/VEL': -0.20 },
  'web-gems': { 'hitters/FLD': 0.44, 'hitters/ARM': 0.12, 'hitters/POW': -0.075, 'hitters/CON': -0.05 },
  'launch-and-leather': { 'hitters/POW': 0.075, 'hitters/FLD': 0.22, 'rotation/ACC': -0.25, 'bullpen/ACC': -0.30 },
  'no-glove-offense': { 'hitters/POW': 0.05, 'hitters/CON': 0.10, 'hitters/FLD': -0.33, 'hitters/ARM': -0.18 },
  'wheels-and-cannons': { 'hitters/SPD': 0.18, 'hitters/ARM': 0.12, 'hitters/POW': -0.10 },
  'rangy-defenders': { 'hitters/SPD': 0.12, 'hitters/ARM': 0.12, 'hitters/FLD': 0.22, 'hitters/POW': -0.075, 'hitters/CON': -0.05 },
};

/**
 * `spec` multipliers × `ARCHETYPE_STAT_UNIT` are IEEE-754 floats, so e.g. `1.5 * 0.1` computes to
 * `0.15000000000000002`, not `0.15` — representation noise, not a real value drift. Round both sides
 * to 9 decimal places (every ratified fraction here is clean to at most 4 decimals, e.g. 0.0625) so
 * the comparison is exact for anything that matters and immune to float noise.
 */
function roundShift(map: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(map)) out[key] = Math.round(value * 1e9) / 1e9;
  return out;
}

describe('archetype sheet conformance — welds historicalArchetypes.ts to TEAM_ARCHETYPES_24.md', () => {
  it('covers all 24 archetypes and coverage cannot shrink', () => {
    expect(HISTORICAL_ARCHETYPES.length).toBe(24);
    const codeIds = new Set(HISTORICAL_ARCHETYPES.map((a) => a.id));
    const sheetIds = new Set(Object.keys(RATIFIED_SHIFTS));
    expect(sheetIds.size).toBe(24);
    for (const id of codeIds) expect(sheetIds.has(id)).toBe(true);
    for (const id of sheetIds) expect(codeIds.has(id)).toBe(true);
  });

  it.each(HISTORICAL_ARCHETYPES.map((a) => [a.id, a] as const))(
    '%s — cap shift exactly matches the ratified sheet (categories and magnitudes)',
    (id, archetype) => {
      const expected = RATIFIED_SHIFTS[id];
      expect(expected, `no ratified-sheet entry found for archetype id "${id}"`).toBeDefined();
      const actual = archetypeCapShift(archetype);
      // Deep-equal: same keys (no extra/missing shifted categories) AND same magnitudes. Untouched
      // categories are simply absent from both sides (archetypeCapShift only emits keys present in
      // `spec`), which is the "untouched categories are absent/zero" requirement.
      expect(roundShift(actual)).toEqual(roundShift(expected));
    },
  );
});
