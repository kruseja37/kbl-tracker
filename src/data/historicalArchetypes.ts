/**
 * Canonical team-archetype set — built from real historical team identities, sim-balanced so a league
 * of them is dynamic but fair (see spec-docs/ARCHETYPE_BALANCE_SIM_RESULTS.md). Each archetype is a
 * trade-off: it BOOSTS 1-2 stat areas (raises the luxury-cap headroom — "stack this without tax") and
 * SACRIFICES 1-2 (lowers it). The `spec` multipliers × ARCHETYPE_STAT_UNIT give the fractional cap
 * shift; the balance simulator (archetypeBalanceSimulator) is the gate that keeps the set within the
 * ±10% parity band across all three tiers.
 *
 * Stat vocabulary: POW/CON/SPD/FLD/ARM (hitters) + ROT_x / PEN_x (rotation/bullpen velocity, junk, accuracy).
 */
export type ArchetypeStat =
  | 'POW' | 'CON' | 'SPD' | 'FLD' | 'ARM'
  | 'ROT_VEL' | 'ROT_JNK' | 'ROT_ACC'
  | 'PEN_VEL' | 'PEN_JNK' | 'PEN_ACC';

/**
 * Value-calibrated per-stat unit magnitude (fraction of the luxury cap). Small for valuable/binding
 * stats (power, command), large for cheap/inert ones (fielding, junk) — mirrors the workbook's own
 * inverse-to-value calibration so a "1.0" boost is roughly comparable in value-effect across stats.
 */
export const ARCHETYPE_STAT_UNIT: Record<ArchetypeStat, number> = {
  POW: 0.05, CON: 0.1, SPD: 0.12, FLD: 0.22, ARM: 0.12,
  ROT_VEL: 0.16, ROT_JNK: 0.3, ROT_ACC: 0.25,
  PEN_VEL: 0.2, PEN_JNK: 0.35, PEN_ACC: 0.3,
};

/** Maps each archetype stat to the luxury-cap row it shifts (`${group}/${stat}`). */
export const ARCHETYPE_STAT_LUX_KEY: Record<ArchetypeStat, string> = {
  POW: 'hitters/POW', CON: 'hitters/CON', SPD: 'hitters/SPD', FLD: 'hitters/FLD', ARM: 'hitters/ARM',
  ROT_VEL: 'rotation/VEL', ROT_JNK: 'rotation/JNK', ROT_ACC: 'rotation/ACC',
  PEN_VEL: 'bullpen/VEL', PEN_JNK: 'bullpen/JNK', PEN_ACC: 'bullpen/ACC',
};

export interface HistoricalArchetype {
  id: string;
  name: string;
  exemplars: string[];
  era: string;
  /** One-line identity/lore for the picker card. */
  lore: string;
  /** Plain-English "boost → sacrifice" line for the picker card. */
  identity: string;
  boosts: ArchetypeStat[];
  nerfs: ArchetypeStat[];
  /** Signed multipliers (× ARCHETYPE_STAT_UNIT → fractional cap shift). The tunable knobs. */
  spec: Partial<Record<ArchetypeStat, number>>;
}

/** The locked set (15). Profiles balanced via the sim; see ARCHETYPE_BALANCE_SIM_RESULTS.md. */
export const HISTORICAL_ARCHETYPES: HistoricalArchetype[] = [
  {
    id: 'murderers-row', name: "Murderers' Row", exemplars: ['1927 Yankees', '1928 Yankees'], era: '1920s–30s',
    lore: 'Mash and hit for average — but never run.', identity: '+power +contact → −speed',
    boosts: ['POW', 'CON'], nerfs: ['SPD'], spec: { POW: 1.5, CON: 1, SPD: -1.5 },
  },
  {
    id: 'bomba-squad', name: 'Bomba Squad', exemplars: ['2019 Twins'], era: 'launch-angle / 2019',
    lore: 'Launch-angle thunder: 430 feet or a whiff.', identity: '+power → −contact −speed',
    boosts: ['POW'], nerfs: ['CON', 'SPD'], spec: { POW: 2, CON: -1.5, SPD: -1 },
  },
  {
    id: 'bash-brothers', name: 'Bash Brothers', exemplars: ['1989 Athletics', '1996 Mariners'], era: 'late 1980s–90s',
    lore: 'Forearm-bashing bombs and cannon arms; the pitching leaks.', identity: '+power +arm → −command (rotation & bullpen)',
    boosts: ['POW', 'ARM'], nerfs: ['ROT_ACC', 'PEN_ACC'], spec: { POW: 1.5, ARM: 1, ROT_ACC: -1, PEN_ACC: -1 },
  },
  {
    id: 'whiteyball', name: 'Whiteyball', exemplars: ['1985 Cardinals', '1982 Cardinals'], era: 'turf era / 1980s',
    lore: 'Turf-burning thieves and elite gloves; power is for other teams.', identity: '+speed +defense → −power',
    boosts: ['SPD', 'FLD'], nerfs: ['POW'], spec: { SPD: 1.5, FLD: 1.5, POW: -2 },
  },
  {
    id: 'go-go-small-ball', name: 'Go-Go Small Ball', exemplars: ['1959 White Sox', '2026 Rays'], era: 'Go-Go → modern revival',
    lore: 'Put it in play, beat out the hit, win with the glove.', identity: '+contact +defense → −power',
    boosts: ['CON', 'FLD'], nerfs: ['POW'], spec: { CON: 1.5, FLD: 1, POW: -2 },
  },
  {
    id: 'dead-ball-suppressors', name: 'Dead-Ball Suppressors', exemplars: ['1906 Cubs', '1907 Tigers'], era: 'dead-ball (1900s–1910s)',
    lore: 'Win 2–1: a bunt, a steal, and a junkballer who never gives in.', identity: '+rotation finesse +contact → −power −bullpen velocity',
    boosts: ['ROT_JNK', 'CON'], nerfs: ['POW', 'PEN_VEL'], spec: { ROT_JNK: 1.5, CON: 1, POW: -2, PEN_VEL: -1 },
  },
  {
    id: 'billy-ball-burners', name: 'Billy Ball Burners', exemplars: ["1982 Athletics (Rickey Henderson)"], era: 'early 1980s',
    lore: 'Steal first; the staff is an afterthought.', identity: '+speed → −power −rotation command',
    boosts: ['SPD'], nerfs: ['POW', 'ROT_ACC'], spec: { SPD: 2, POW: -1.5, ROT_ACC: -1 },
  },
  {
    id: 'junkball-surgeons', name: 'Junkball Surgeons', exemplars: ['1995 Braves', '1971 Orioles'], era: '1990s',
    lore: 'Maddux–Glavine: paint corners, change speeds; ordinary bats.', identity: '+rotation command +junk → −power −velocity',
    boosts: ['ROT_ACC', 'ROT_JNK'], nerfs: ['POW', 'ROT_VEL'], spec: { ROT_ACC: 1.5, ROT_JNK: 1, POW: -1, ROT_VEL: -1 },
  },
  {
    id: 'flamethrowers', name: 'Flamethrowers', exemplars: ['1963 Dodgers (Koufax/Drysdale)'], era: '1960s',
    lore: 'Koufax–Drysdale heat; the lineup is along for the ride.', identity: '+rotation velocity → −power −contact',
    boosts: ['ROT_VEL'], nerfs: ['POW', 'CON'], spec: { ROT_VEL: 2, POW: -1, CON: -1 },
  },
  {
    id: 'nasty-boys', name: 'Nasty Boys', exemplars: ['1990 Reds'], era: '1990',
    lore: 'A power pen that misses bats and a few zones.', identity: '+bullpen velocity → −bullpen command',
    boosts: ['PEN_VEL'], nerfs: ['PEN_ACC'], spec: { PEN_VEL: 2, PEN_ACC: -1.5 },
  },
  {
    id: 'hdh-royals', name: 'HDH Royals', exemplars: ['2014 Royals', '2015 Royals'], era: '2010s',
    lore: 'Shorten the game: a lockdown pen and fast gloves.', identity: '+bullpen command +speed → −power −rotation command',
    boosts: ['PEN_ACC', 'SPD'], nerfs: ['POW', 'ROT_ACC'], spec: { PEN_ACC: 1.5, SPD: 1, POW: -1.5, ROT_ACC: -1 },
  },
  {
    id: 'the-opener', name: 'The Opener', exemplars: ['2018 Rays'], era: '2018',
    lore: 'Bullpenning: relievers over starters.', identity: '+bullpen → −rotation',
    boosts: ['PEN_VEL', 'PEN_JNK'], nerfs: ['ROT_VEL', 'ROT_ACC'], spec: { PEN_VEL: 1.5, PEN_JNK: 1, ROT_VEL: -1.5, ROT_ACC: -1 },
  },
  {
    id: 'the-oriole-way', name: 'The Oriole Way', exemplars: ['1969 Orioles', '1970 Orioles'], era: 'late 1960s–70s',
    lore: 'Run prevention: elite gloves behind pinpoint starters.', identity: '+defense +rotation command → −speed −bullpen velocity',
    boosts: ['FLD', 'ROT_ACC'], nerfs: ['SPD', 'PEN_VEL'], spec: { FLD: 1.5, ROT_ACC: 1.5, SPD: -1, PEN_VEL: -1 },
  },
  {
    id: 'shift-era-suppressors', name: 'Shift-Era Suppressors', exemplars: ['2008 Rays', '2010 Rays'], era: '2010s',
    lore: 'Modern run prevention: defense and power arms, light bats.', identity: '+defense +rotation velocity → −contact −bullpen command',
    boosts: ['FLD', 'ROT_VEL'], nerfs: ['CON', 'PEN_ACC'], spec: { FLD: 1.5, ROT_VEL: 1, CON: -1.5, PEN_ACC: -1 },
  },
  {
    id: 'big-red-machine', name: 'Big Red Machine', exemplars: ['1975 Reds', '1976 Reds'], era: '1970s',
    lore: 'The complete offense that out-scores its ordinary rotation.', identity: '+contact +defense (+power) → −rotation',
    boosts: ['CON', 'FLD'], nerfs: ['ROT_VEL', 'ROT_ACC'], spec: { CON: 1.5, FLD: 1, POW: 0.5, ROT_VEL: -1.5, ROT_ACC: -1 },
  },
];

/** Resolve an archetype's spec to a fractional cap-shift map keyed by `${group}/${stat}`. */
export function archetypeCapShift(a: HistoricalArchetype): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [stat, mult] of Object.entries(a.spec) as [ArchetypeStat, number][]) {
    out[ARCHETYPE_STAT_LUX_KEY[stat]] = mult * ARCHETYPE_STAT_UNIT[stat];
  }
  return out;
}
