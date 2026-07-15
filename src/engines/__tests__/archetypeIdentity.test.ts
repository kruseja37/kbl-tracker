import { describe, expect, test, vi, beforeEach } from 'vitest';

import {
  HISTORICAL_ARCHETYPES,
  ARCHETYPE_STAT_LUX_KEY,
  archetypeCapShift,
  type ArchetypeStat,
} from '../../data/historicalArchetypes';
import { type LuxuryCapRow, type ModStat } from '../../data/tierParams';
import { saveTeam, type Team } from '../../utils/leagueBuilderStorage';
import { archetypeBandPriorities } from '../cpuShillBidding';
import { archetypeToCapIdentity, resolveClubBandPriorities, selectTeamArchetype } from '../archetypeIdentity';
import { identityCapShift, shiftLuxuryCaps, luxKeyToModStat, MOD_STAT_TO_LUX } from '../leagueConstruction';

const saveTeamMock = vi.hoisted(() => vi.fn(async <T>(team: T) => team));

vi.mock('../../utils/leagueBuilderStorage', () => ({
  saveTeam: saveTeamMock,
}));

const ARCHETYPE_STATS = Object.keys(ARCHETYPE_STAT_LUX_KEY) as ArchetypeStat[];
const MOD_STATS = Object.keys(MOD_STAT_TO_LUX) as ModStat[];

function minimalTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-1',
    name: 'Team One',
    abbreviation: 'T1',
    location: 'Town',
    nickname: 'Ones',
    colors: {
      primary: '#111111',
      secondary: '#eeeeee',
    },
    stadium: 'Park',
    leagueIds: ['league-1'],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function row(group: LuxuryCapRow['group'], stat: LuxuryCapRow['stat']): LuxuryCapRow {
  return {
    group,
    stat,
    topN: 1,
    cap: 100,
    penaltyCurve: 1,
    penaltyPer100: 1,
    minAdder: 0,
  };
}

describe('archetype identity bridge', () => {
  beforeEach(() => {
    vi.mocked(saveTeam).mockClear();
  });

  test('round-trips archetype stats through lux keys, including PEN_ACC -> PACC', () => {
    expect(luxKeyToModStat(ARCHETYPE_STAT_LUX_KEY.PEN_ACC)).toBe('PACC');
    expect(luxKeyToModStat(ARCHETYPE_STAT_LUX_KEY.PEN_VEL)).toBe('PVEL');
    expect(luxKeyToModStat(ARCHETYPE_STAT_LUX_KEY.ROT_ACC)).toBe('RACC');

    for (const stat of ARCHETYPE_STATS) {
      expect(luxKeyToModStat(ARCHETYPE_STAT_LUX_KEY[stat]), stat).toBeDefined();
    }
  });

  test('keeps archetype boost and nerf directions on their exact ModStat keys', () => {
    for (const arch of HISTORICAL_ARCHETYPES) {
      // Cardinality pins track the LOCKED 24 (efc7cfb6): rangy-defenders carries 3 boosts;
      // nerfs stay ≤2. The pre-lock draft-lane expectation was ≤2/≤2 — reconciled in FABLE-C1
      // (the known carried-forward assembly red).
      expect(arch.boosts.length, `${arch.id} boosts`).toBeLessThanOrEqual(3);
      expect(arch.nerfs.length, `${arch.id} nerfs`).toBeLessThanOrEqual(2);

      const shift = identityCapShift(archetypeToCapIdentity(arch));

      for (const stat of arch.boosts) {
        const modStat = luxKeyToModStat(ARCHETYPE_STAT_LUX_KEY[stat]);
        expect(modStat, `${arch.id}:${stat}`).toBeDefined();
        expect(shift[modStat!], `${arch.id}:${stat}`).toBeGreaterThan(0);
      }

      for (const stat of arch.nerfs) {
        const modStat = luxKeyToModStat(ARCHETYPE_STAT_LUX_KEY[stat]);
        expect(modStat, `${arch.id}:${stat}`).toBeDefined();
        expect(shift[modStat!], `${arch.id}:${stat}`).toBeLessThan(0);
      }
    }
  });

  test('matches the spec sign for every spec stat and leaves every off-spec ModStat at zero', () => {
    // The authoritative touched-set is arch.spec (NOT boosts/nerfs): some archetypes carry a minor
    // spec entry not surfaced in the headline boosts (e.g. big-red-machine POW: 0.5). The faithful
    // rawShift must include it; everything OUTSIDE the spec must stay exactly zero (this is what
    // proves rotation/bullpen separation — a rotation-only archetype leaves PVEL/PJNK/PACC at 0).
    for (const arch of HISTORICAL_ARCHETYPES) {
      const shift = identityCapShift(archetypeToCapIdentity(arch));
      const specStats = Object.keys(arch.spec) as ArchetypeStat[];
      const touched = new Set(specStats.map((stat) => luxKeyToModStat(ARCHETYPE_STAT_LUX_KEY[stat])!));

      for (const stat of specStats) {
        const modStat = luxKeyToModStat(ARCHETYPE_STAT_LUX_KEY[stat])!;
        const mult = arch.spec[stat]!;
        expect(Math.sign(shift[modStat]), `${arch.id}:${stat} sign`).toBe(Math.sign(mult));
      }

      for (const modStat of MOD_STATS) {
        if (touched.has(modStat)) continue;
        expect(Math.abs(shift[modStat]), `${arch.id}:${modStat} off-spec`).toBeLessThan(1e-9);
      }
    }
  });

  test('matches archetypeCapShift through live shiftLuxuryCaps for the impossible pitching archetypes', () => {
    const rows: LuxuryCapRow[] = [
      row('rotation', 'VEL'),
      row('rotation', 'ACC'),
      row('bullpen', 'VEL'),
      row('bullpen', 'ACC'),
    ];

    for (const id of ['the-opener', 'hdh-royals']) {
      const arch = HISTORICAL_ARCHETYPES.find((candidate) => candidate.id === id)!;
      const shifted = shiftLuxuryCaps(rows, archetypeToCapIdentity(arch));
      const raw = archetypeCapShift(arch);

      for (const shiftedRow of shifted) {
        const key = `${shiftedRow.group}/${shiftedRow.stat}`;
        expect(shiftedRow.cap, `${id}:${key}`).toBeCloseTo(100 * (1 + (raw[key] ?? 0)), 9);
      }
    }

    const opener = HISTORICAL_ARCHETYPES.find((arch) => arch.id === 'the-opener')!;
    const openerCaps = shiftLuxuryCaps(rows, archetypeToCapIdentity(opener));
    expect(openerCaps.find((cap) => cap.group === 'bullpen' && cap.stat === 'VEL')!.cap).toBeGreaterThan(100);
    expect(openerCaps.find((cap) => cap.group === 'rotation' && cap.stat === 'VEL')!.cap).toBeLessThan(100);

    const hdh = HISTORICAL_ARCHETYPES.find((arch) => arch.id === 'hdh-royals')!;
    const hdhCaps = shiftLuxuryCaps(rows, archetypeToCapIdentity(hdh));
    expect(hdhCaps.find((cap) => cap.group === 'bullpen' && cap.stat === 'ACC')!.cap).toBeGreaterThan(100);
    expect(hdhCaps.find((cap) => cap.group === 'rotation' && cap.stat === 'ACC')!.cap).toBeLessThan(100);
  });

  test('selectTeamArchetype wires MLB and farm provenance and persists the team', async () => {
    const team = minimalTeam();
    const returned = await selectTeamArchetype(team, 'murderers-row');

    expect(returned.mlbArchetypeKey).toBe('murderers-row');
    expect(returned.capIdentity?.rawShift).toBeDefined();
    expect(returned.capIdentity!.rawShift!.POW).toBeGreaterThan(0);
    expect(returned.capIdentity!.rawShift!.CON).toBeGreaterThan(0);
    expect(returned.capIdentity!.rawShift!.SPD).toBeLessThan(0);
    expect(saveTeam).toHaveBeenCalledTimes(1);

    vi.mocked(saveTeam).mockClear();
    const withFarm = await selectTeamArchetype(minimalTeam({ id: 'team-2' }), 'murderers-row', 'rangy-defenders');
    expect(withFarm.farmArchetypeKey).toBe('rangy-defenders');
    expect(withFarm.farmCapIdentity?.rawShift).toBeDefined();
    expect(withFarm.farmCapIdentity!.increase).toEqual(['SPD', 'ARM', 'FLD']);
    expect(withFarm.farmCapIdentity!.rawShift!.SPD).toBeGreaterThan(0);
    expect(withFarm.farmCapIdentity!.rawShift!.ARM).toBeGreaterThan(0);
    expect(withFarm.farmCapIdentity!.rawShift!.FLD).toBeGreaterThan(0);
    expect(saveTeam).toHaveBeenCalledTimes(1);
  });

  test('throws on unknown archetype keys', async () => {
    await expect(selectTeamArchetype(minimalTeam(), 'not-a-key')).rejects.toThrow();
  });

  test('DJ-03 resolver prefers manual band priorities when any band is positive', () => {
    const manual = {
      Power: 0.2,
      Contact: 1,
      Speed: 0,
      Defense: 0,
      Rotation: 0,
      Bullpen: 0,
    };
    const archetype = HISTORICAL_ARCHETYPES.find((arch) => arch.id === 'murderers-row')!;

    expect(resolveClubBandPriorities({
      capIdentity: {
        bandPriorities: manual,
        ...archetypeToCapIdentity(archetype),
      },
      mlbArchetypeKey: archetype.id,
    })).toBe(manual);
  });

  test('DJ-03 resolver maps archetype provenance through the one archetype band bridge', () => {
    const archetype = HISTORICAL_ARCHETYPES.find((arch) => arch.id === 'murderers-row')!;

    expect(resolveClubBandPriorities({ mlbArchetypeKey: archetype.id }))
      .toEqual(archetypeBandPriorities(archetype));
  });

  test('reuses one immutable archetype priority result across every club with the same locked identity', () => {
    const first = resolveClubBandPriorities({ mlbArchetypeKey: 'rangy-defenders' });
    const second = resolveClubBandPriorities({ mlbArchetypeKey: 'rangy-defenders' });

    expect(first).toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
  });

  test('DJ-03 rawShift fallback is bijective with archetype provenance for archetype identities', () => {
    const archetype = HISTORICAL_ARCHETYPES.find((arch) => arch.id === 'the-opener')!;

    expect(resolveClubBandPriorities({ capIdentity: archetypeToCapIdentity(archetype) }))
      .toEqual(archetypeBandPriorities(archetype));
  });

  test('DJ-03 resolver returns uniform priorities for rawShift with no positive lift and null for no identity', () => {
    expect(resolveClubBandPriorities({
      capIdentity: {
        increase: [],
        decrease: [],
        rawShift: {
          POW: -0.1,
          CON: -0.2,
          SPD: 0,
          FLD: 0,
          ARM: 0,
          RVEL: 0,
          RJNK: 0,
          RACC: 0,
          PVEL: 0,
          PJNK: 0,
          PACC: 0,
        },
      },
    })).toEqual({
      Power: 1,
      Contact: 1,
      Speed: 1,
      Defense: 1,
      Rotation: 1,
      Bullpen: 1,
    });
    expect(resolveClubBandPriorities({})).toBeNull();
  });

  test('24-coverage: every LOCKED archetype converts and shifts at least one cap (FABLE-C1 d-rescope)', async () => {
    expect(HISTORICAL_ARCHETYPES.length).toBe(24);
    for (const arch of HISTORICAL_ARCHETYPES) {
      const identity = archetypeToCapIdentity(arch);
      const shift = identityCapShift(identity);
      const touched = MOD_STATS.filter((stat) => Math.abs(shift[stat]) > 1e-9);
      expect(touched.length, `${arch.id} shifts no caps`).toBeGreaterThan(0);
      expect(identity.increase.length, `${arch.id} increase`).toBeGreaterThan(0);
    }

    // The 3-boost regression case (rangy-defenders) — the exact pre-lock red — round-trips
    // through the persistence path like any 2-boost archetype.
    vi.mocked(saveTeam).mockClear();
    const rangy = await selectTeamArchetype(minimalTeam({ id: 'team-rangy' }), 'rangy-defenders');
    expect(rangy.mlbArchetypeKey).toBe('rangy-defenders');
    expect(rangy.capIdentity?.rawShift).toBeDefined();
    expect(saveTeam).toHaveBeenCalledTimes(1);
  });
});
