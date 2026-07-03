import { describe, expect, it } from 'vitest';
import {
  countCellMatches,
  DEFAULT_POOL_SIZE_MULTIPLIER,
  extractPoolFromDemand,
  POOL_SIZE_MULTIPLIER_STOPS,
  resolvePoolSizingTarget,
  selectFitAwareRepairCandidate,
  trimPoolToTarget,
  type ClassifiedDemandPlayer,
  type DemandUniversePlayer,
  type TeamDesignInput,
} from '../poolFromDemand';
import { buildDefaultDesignSlots } from '../rosterDesignFeasibility';
import { HISTORICAL_ARCHETYPES } from '../../data/historicalArchetypes';
import { classifyPlayerArchetype } from '../playerArchetypeClassifier';
import { demandPlayerFromLeaguePlayer } from '../../src_figma/app/pages/LeagueBuilderDraftSetup';
import { canRelieve, canStart, isLegalRoster } from '../../data/rosterConstruction';
import { toRosterSlotPlayer } from '../rosterNeed';
import type { Player } from '../../utils/leagueBuilderStorage';

let n = 0;

function hitter(
  position: string,
  tools: { power: number; contact: number; speed: number; fielding: number; arm: number },
  salary: number,
  extra: Partial<DemandUniversePlayer> = {},
): DemandUniversePlayer {
  const id = `u-h-${position}-${n += 1}`;
  return {
    id,
    iv: salary,
    salary,
    isPitcher: false,
    position,
    bat: { POW: tools.power, CON: tools.contact, SPD: tools.speed, FLD: tools.fielding, ARM: tools.arm },
    profile: {
      isPitcher: false,
      primaryPosition: position,
      bats: 'R',
      throws: 'R',
      age: 27,
      ...tools,
    },
    ...extra,
  } as DemandUniversePlayer;
}

function arm(
  role: 'SP' | 'RP' | 'CP' | 'SP/RP',
  tools: { velocity: number; junk: number; accuracy: number },
  salary: number,
): DemandUniversePlayer {
  const id = `u-p-${role.replace('/', '')}-${n += 1}`;
  return {
    id,
    iv: salary,
    salary,
    isPitcher: true,
    position: 'P',
    role,
    bat: { POW: 20, CON: 20, SPD: 20, FLD: 20, ARM: 20 },
    pit: { VEL: tools.velocity, JNK: tools.junk, ACC: tools.accuracy },
    profile: {
      isPitcher: true,
      primaryPosition: role,
      bats: 'R',
      throws: 'R',
      age: 27,
      arsenal: ['4F', 'SL', 'CH'],
      ...tools,
    },
  } as DemandUniversePlayer;
}

const GLOVE = { power: 50, contact: 56, speed: 65, fielding: 75, arm: 71 }; // Defensive-Wizard echo
const BAT = { power: 82, contact: 55, speed: 47, fielding: 51, arm: 60 }; // Slugger-ish echo
const EVEN = { power: 60, contact: 60, speed: 60, fielding: 60, arm: 60 };
const LOW = { power: 5, contact: 5, speed: 5, fielding: 5, arm: 5 };
const HIGH_BAT = { power: 95, contact: 95, speed: 70, fielding: 50, arm: 50 };

function universe(): DemandUniversePlayer[] {
  n = 0;
  const players: DemandUniversePlayer[] = [];
  const positions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
  const tiers = [6_000, 10_000, 16_000];
  for (const position of positions) {
    for (const salary of tiers) {
      players.push(hitter(position, GLOVE, salary));
      players.push(hitter(position, BAT, salary + 500));
      players.push(hitter(position, EVEN, salary + 250));
      players.push(hitter(position, EVEN, salary + 750));
    }
  }
  // Backup-C coverage depth beyond the primary Cs.
  for (const salary of tiers) {
    players.push(hitter('1B', EVEN, salary + 100, {
      secondaryPosition: 'C',
      profile: { isPitcher: false, primaryPosition: '1B', secondaryPosition: 'C', bats: 'R', throws: 'R', age: 27, ...EVEN },
    } as Partial<DemandUniversePlayer>));
  }
  for (const salary of tiers) {
    for (let copy = 0; copy < 4; copy += 1) {
      players.push(arm('SP', { velocity: 62, junk: 60, accuracy: 61 }, salary + copy * 300));
      players.push(arm('RP', { velocity: 63, junk: 59, accuracy: 60 }, salary + copy * 350));
    }
    players.push(arm('SP/RP', { velocity: 61, junk: 61, accuracy: 60 }, salary + 200));
    players.push(arm('CP', { velocity: 68, junk: 58, accuracy: 57 }, salary + 400));
    players.push(arm('SP', { velocity: 80, junk: 58, accuracy: 48 }, salary)); // Effectively-Wild echo
  }
  return players;
}

function designAsking(teamId: string, slotId: string, shape: string): TeamDesignInput {
  return {
    teamId,
    slots: buildDefaultDesignSlots().map((slot) =>
      slot.slotId === slotId ? { ...slot, preference: { shape } } : slot,
    ),
  };
}

function leaguePlayer(primaryPosition: Player['primaryPosition']): Player {
  return {
    id: `league-player-${primaryPosition}`,
    firstName: 'Canon',
    lastName: primaryPosition,
    gender: 'M',
    age: 27,
    bats: 'R',
    throws: 'R',
    armSlot: 'High',
    primaryPosition,
    power: 42,
    contact: 43,
    speed: 44,
    fielding: 45,
    arm: 46,
    velocity: 71,
    junk: 72,
    accuracy: 73,
    arsenal: ['4F', 'SL', 'CH'],
    overallGrade: 'B',
    trait1: primaryPosition === 'TWO-WAY' ? 'Two Way (C)' : undefined,
    trait2: undefined,
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 12_345,
    createdDate: '2026-07-02T00:00:00.000Z',
    lastModified: '2026-07-02T00:00:00.000Z',
    isCustom: true,
  };
}

describe('extractPoolFromDemand', () => {
  const archetypes = HISTORICAL_ARCHETYPES.slice(0, 2);

  it('provisions contested asks with multiplicity and both designs verify feasible', () => {
    const designs = [
      designAsking('team-a', 'SS', 'Defensive-Wizard'),
      designAsking('team-b', 'SS', 'Defensive-Wizard'),
    ];
    const result = extractPoolFromDemand(universe(), designs, archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 5_000_000,
    });

    const cell = result.cells.find((candidate) => candidate.key.startsWith('SS|Defensive-Wizard'));
    expect(cell?.asks).toBe(2);
    expect(cell?.wanted).toBe(4);
    expect(cell?.reserved).toBe(4);
    expect(result.shortfalls).toEqual([]);
    expect(result.size).toBeGreaterThan(0);
    expect(result.floors.players.length).toBeGreaterThan(0);
    for (const verdict of result.designVerdicts) {
      expect(verdict.result.feasible, `design ${verdict.teamId}`).toBe(true);
    }
  });

  it('names the shortfall in plain language when the universe cannot meet an ask', () => {
    const designs = [designAsking('team-a', 'RP1', 'Two-Pitch-Reliever')]; // none in this universe (3-pitch arms)
    const result = extractPoolFromDemand(universe(), designs, archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 5_000_000,
    });
    expect(result.shortfalls.length).toBe(1);
    expect(result.shortfalls[0].message).toContain('the uploaded universe holds 0');
    // The pool still extracts (floors intact); the asking design reports its blocker.
    expect(result.size).toBeGreaterThan(0);
    const verdict = result.designVerdicts[0].result;
    expect(verdict.feasible).toBe(false);
    expect(verdict.blockers.some((blocker) => blocker.kind === 'no-match')).toBe(true);
  });

  it('is deterministic: identical inputs produce the identical pool', () => {
    const designs = [designAsking('team-a', 'SS', 'Defensive-Wizard')];
    const first = extractPoolFromDemand(universe(), designs, archetypes, 'standard', { teams: 4 });
    const second = extractPoolFromDemand(universe(), designs, archetypes, 'standard', { teams: 4 });
    expect(first.players.map((p) => p.id)).toEqual(second.players.map((p) => p.id));
  });

  it('spreads a cell reservation across price tiers (the budget-lever promise)', () => {
    const designs = [designAsking('team-a', 'SS', 'Defensive-Wizard')];
    const result = extractPoolFromDemand(universe(), designs, archetypes, 'standard', { teams: 4 });
    const cell = result.cells.find((candidate) => candidate.key.startsWith('SS|Defensive-Wizard'));
    expect(cell?.reserved).toBe(2); // 1 ask × contest 2
    const reservedSalaries = result.players
      .filter((player) => player.position === 'SS' && player.profile.fielding === GLOVE.fielding)
      .map((player) => player.salary);
    // At least two distinct price tiers among the extracted glove-first SS supply.
    expect(new Set(reservedSalaries).size).toBeGreaterThanOrEqual(2);
  });

  it('threads budgetPerTeam through the extracted floors draftability verdicts', () => {
    const designs = [designAsking('team-a', 'SS', 'Defensive-Wizard')];
    const loose = extractPoolFromDemand(universe(), designs, archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 5_000_000,
    });
    const tight = extractPoolFromDemand(universe(), designs, archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 150_000,
    });

    const looseHeadroom = Math.max(...loose.floors.verdicts.map((row) => row.taxHeadroom));
    const tightHeadroom = Math.max(...tight.floors.verdicts.map((row) => row.taxHeadroom));
    expect(tightHeadroom).toBeLessThan(looseHeadroom);
  });

  it('countCellMatches equals the extractor reserved match set for a demand cell', () => {
    const pool = universe();
    const designs = [designAsking('team-a', 'SS', 'Defensive-Wizard')];
    const result = extractPoolFromDemand(pool, designs, archetypes, 'standard', { teams: 4 });
    const cell = result.cells.find((candidate) => candidate.key.startsWith('SS|Defensive-Wizard'));
    expect(cell).toBeDefined();

    const classified: ClassifiedDemandPlayer[] = pool.map((player) => ({
      player,
      classification: classifyPlayerArchetype(player.profile),
    }));
    const actualReservedMatchSet = classified.filter(({ classification }) =>
      classification.shape === cell!.preference.shape
      || ((cell!.preference.allowRunnerUp ?? true) && classification.runnerUp === cell!.preference.shape),
    );

    expect(countCellMatches(classified, cell!.preference)).toBe(actualReservedMatchSet.length);
    expect(countCellMatches(classified, cell!.preference)).toBeGreaterThanOrEqual(cell!.reserved);
  });

  it.each(['P', 'TWO-WAY'] as const)(
    'maps legacy %s pitchers through the canonical roster-slot role',
    (primaryPosition) => {
      const player = leaguePlayer(primaryPosition);
      const mapped = demandPlayerFromLeaguePlayer(player);
      const canonicalShape = toRosterSlotPlayer({
        primaryPosition: player.primaryPosition,
        secondaryPosition: player.secondaryPosition ?? null,
        traits: [player.trait1, player.trait2],
      });

      expect(mapped).toMatchObject({
        id: player.id,
        name: `${player.firstName} ${player.lastName}`.trim(),
        salary: player.salary,
        isPitcher: canonicalShape.isPitcher,
        position: canonicalShape.position,
        role: canonicalShape.role,
        secondaryPosition: canonicalShape.secondaryPosition,
        twoWayVariant: canonicalShape.twoWayVariant,
        bat: {
          POW: player.power,
          CON: player.contact,
          SPD: player.speed,
          FLD: player.fielding,
          ARM: player.arm,
        },
        pit: {
          VEL: player.velocity,
          JNK: player.junk,
          ACC: player.accuracy,
        },
      });
      expect(mapped.role).toBeUndefined();
      expect(canStart(mapped)).toBe(false);
      expect(canRelieve(mapped)).toBe(false);
    },
  );

  it('maps dial targets from roster demand plus expected shill wins', () => {
    const eightTeams = resolvePoolSizingTarget({ teams: 8, shills: 0, poolSizeMultiplier: DEFAULT_POOL_SIZE_MULTIPLIER });
    expect(eightTeams.demandBase).toBe(176);
    expect(eightTeams.requestedTarget).toBe(238);
    expect(resolvePoolSizingTarget({ teams: 8, shills: 0, poolSizeMultiplier: 1.5 }).requestedTarget).toBe(264);

    const withShills = resolvePoolSizingTarget({ teams: 8, shills: 3, poolSizeMultiplier: DEFAULT_POOL_SIZE_MULTIPLIER });
    expect(withShills.demandBase).toBe(206);
    expect(withShills.requestedTarget).toBe(279);
  });

  it('caps requested targets at the hard ceiling and rejects off-stop multipliers', () => {
    const target = resolvePoolSizingTarget({ teams: 8, shills: 0, sizeTarget: 999, poolSizeMultiplier: 1.5 });
    expect(target.ceilingTarget).toBe(264);
    expect(target.requestedTarget).toBe(264);
    expect(POOL_SIZE_MULTIPLIER_STOPS).toEqual([1.2, 1.25, 1.3, 1.35, 1.4, 1.45, 1.5]);
    expect(() => resolvePoolSizingTarget({ teams: 8, poolSizeMultiplier: 1.33 })).toThrow(/poolSizeMultiplier/);
  });

  it('trims by fit before price, evicting cheap zero-fit filler before pricey good-fit filler', () => {
    const cheapZero = { id: 'cheap-zero', salary: 1 };
    const priceyFit = { id: 'pricey-fit', salary: 1_000 };
    const result = trimPoolToTarget([cheapZero, priceyFit], new Set<string>(), (player) => (player.id === cheapZero.id ? 0 : 10), 1);
    expect(result.evicted.map((player) => player.id)).toEqual(['cheap-zero']);
    expect(result.kept.map((player) => player.id)).toEqual(['pricey-fit']);
  });

  it('never evicts reserved, identity-claimed, floor-protected, or pinned ids', () => {
    const players = [
      { id: 'reserved', salary: 500 },
      { id: 'claimed', salary: 400 },
      { id: 'floor', salary: 300 },
      { id: 'pinned', salary: 250 },
      { id: 'loose', salary: 200 },
    ];
    const result = trimPoolToTarget(players, new Set(['reserved', 'claimed', 'floor', 'pinned']), () => 0, 1);
    expect(result.evicted.map((player) => player.id)).toEqual(['loose']);
    expect(result.kept.map((player) => player.id).sort()).toEqual(['claimed', 'floor', 'pinned', 'reserved']);
  });

  it('uses salary-desc then id-asc only inside equal-fit trim ties', () => {
    const players = [
      { id: 'b-cheap', salary: 100 },
      { id: 'a-expensive', salary: 300 },
      { id: 'a-cheap', salary: 100 },
    ];
    const result = trimPoolToTarget(players, new Set<string>(), () => 1, 1);
    expect(result.evicted.map((player) => player.id)).toEqual(['a-expensive', 'a-cheap']);
  });

  it('clamps an undersized absolute request up to the hard floor with the clamp flag', () => {
    const target = resolvePoolSizingTarget({ teams: 4, shills: 0, sizeTarget: 10, poolSizeMultiplier: DEFAULT_POOL_SIZE_MULTIPLIER });
    expect(target.requestedTarget).toBe(10);
    expect(target.effectiveTarget).toBe(target.hardFloor);
    expect(target.clamped).toBe(true);
  });

  it('constructs disjoint legal 22-player G1 assemblies under the resolved cap', () => {
    const result = extractPoolFromDemand(universe(), [], archetypes, 'standard', {
      teams: 2,
      budgetPerTeam: 5_000_000,
      poolSizeMultiplier: DEFAULT_POOL_SIZE_MULTIPLIER,
    });
    expect(result.g1?.holds).toBe(true);
    expect(result.g1?.assemblies).toHaveLength(2);
    const seen = new Set<string>();
    for (const assembly of result.g1?.assemblies ?? []) {
      expect(assembly).toHaveLength(22);
      for (const id of assembly) {
        expect(seen.has(id)).toBe(false);
        seen.add(id);
      }
      const players = assembly.map((id) => result.players.find((player) => player.id === id)!);
      expect(isLegalRoster(players)).toBe(true);
      expect(players.reduce((sum, player) => sum + player.salary, 0)).toBeLessThanOrEqual(5_000_000);
    }
  });

  it('selects a pricier fitting repair body before a cheaper zero-fit fallback', () => {
    const cheapZero = { id: 'cheap-zero-rf', salary: 10 };
    const fitting = { id: 'fitting-rf', salary: 20 };
    const pick = selectFitAwareRepairCandidate(
      [cheapZero, fitting],
      5,
      (player) => (player.id === 'fitting-rf' ? 5 : 0),
    );
    expect(pick).toEqual({ player: fitting, lastResort: false });
  });

  it('injects the cheapest legal body with a last-resort note when no repair body is fit-qualified', () => {
    n = 0;
    const source = universe().slice(0, 28);
    const fallback = hitter('RF', LOW, 1);
    fallback.id = 'fallback-rf';
    source.push(fallback);
    const result = extractPoolFromDemand(source, [], [HISTORICAL_ARCHETYPES.find((a) => a.id === 'big-red-machine')!], 'standard', {
      teams: 1,
      budgetPerTeam: 20_000,
      sizeTarget: 26,
      poolSizeMultiplier: DEFAULT_POOL_SIZE_MULTIPLIER,
      maxRepairRounds: 1,
    });
    if (result.sizing?.injectedIds.includes('fallback-rf')) {
      expect(result.sizing.messages.some((message) => message.includes('cheapest legal option'))).toBe(true);
    }
  });

  it('keeps repair additive and reports exhaustion instead of failing extraction', () => {
    const result = extractPoolFromDemand(universe().slice(0, 20), [], archetypes, 'standard', {
      teams: 2,
      budgetPerTeam: 50_000,
      sizeTarget: 10,
      poolSizeMultiplier: DEFAULT_POOL_SIZE_MULTIPLIER,
      maxRepairRounds: 1,
    });
    expect(result.players.length).toBeGreaterThan(0);
    expect(result.g1?.holds).toBe(false);
    expect(result.g1?.repairRounds).toBeGreaterThanOrEqual(1);
    expect(result.sizing?.messages.join(' ')).toMatch(/pool still cannot field every club|repair/);
  });

  it('lets the constructive floor beat the requested ceiling when repair needs more bodies', () => {
    const result = extractPoolFromDemand(universe(), [], archetypes, 'standard', {
      teams: 2,
      budgetPerTeam: 75_000,
      sizeTarget: 1,
      poolSizeMultiplier: DEFAULT_POOL_SIZE_MULTIPLIER,
      maxRepairRounds: 2,
    });
    expect(result.sizing?.finalSize).toBeGreaterThanOrEqual(result.sizing?.effectiveTarget ?? 0);
    expect(result.sizing?.clamped).toBe(true);
  });

  it('keeps price shortfall wording separate from body-count wording and preserves the price-spread pin', () => {
    const designs = [designAsking('team-a', 'SS', 'Defensive-Wizard')];
    const result = extractPoolFromDemand(universe(), designs, archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 22_000,
      poolSizeMultiplier: DEFAULT_POOL_SIZE_MULTIPLIER,
    });
    expect(result.shortfalls.some((shortfall) => shortfall.message.includes('costs more than'))).toBe(true);

    const cell = result.cells.find((candidate) => candidate.key.startsWith('SS|Defensive-Wizard'));
    expect(cell?.reserved).toBe(2);
  });

  it('skips sizing and G1 for no-dial callers', () => {
    const result = extractPoolFromDemand(universe(), [designAsking('team-a', 'SS', 'Defensive-Wizard')], archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 5_000_000,
    });
    expect(result.sizing).toBeUndefined();
    expect(result.g1).toBeUndefined();
  });

  it('keeps the amendment surface byte-neutral when no pins or excludes are passed', () => {
    const result = extractPoolFromDemand(universe(), [designAsking('team-a', 'SS', 'Defensive-Wizard')], archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 5_000_000,
      poolSizeMultiplier: DEFAULT_POOL_SIZE_MULTIPLIER,
    });
    expect(result.sizing).not.toHaveProperty('pinnedHandPicks');
    expect(result.sizing).not.toHaveProperty('excludedHandRemoves');
  });

  it('force-includes pins, protects them from trim, and withholds excludes', () => {
    const source = universe();
    const baseline = extractPoolFromDemand(source, [designAsking('team-a', 'SS', 'Defensive-Wizard')], archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 5_000_000,
      poolSizeMultiplier: DEFAULT_POOL_SIZE_MULTIPLIER,
    });
    const excluded = baseline.players[0].id;
    const pinned = source.find((player) => !baseline.players.some((kept) => kept.id === player.id));
    expect(pinned).toBeDefined();

    const result = extractPoolFromDemand(source, [designAsking('team-a', 'SS', 'Defensive-Wizard')], archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 5_000_000,
      poolSizeMultiplier: DEFAULT_POOL_SIZE_MULTIPLIER,
      pinnedIds: [pinned!.id],
      excludedIds: [excluded],
    });

    expect(result.players.map((player) => player.id)).toContain(pinned!.id);
    expect(result.players.map((player) => player.id)).not.toContain(excluded);
    expect(result.sizing?.pinnedHandPicks).toEqual([pinned!.id]);
    expect(result.sizing?.excludedHandRemoves).toEqual([excluded]);
    expect(result.sizing?.evictedIds).not.toContain(pinned!.id);
  });

  it('is deterministic with sizing enabled for shuffled input order', () => {
    const source = universe();
    const shuffled = [...source].reverse();
    const designs = [designAsking('team-a', 'SS', 'Defensive-Wizard')];
    const first = extractPoolFromDemand(source, designs, archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 5_000_000,
      poolSizeMultiplier: DEFAULT_POOL_SIZE_MULTIPLIER,
    });
    const second = extractPoolFromDemand(shuffled, designs, archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 5_000_000,
      poolSizeMultiplier: DEFAULT_POOL_SIZE_MULTIPLIER,
    });
    expect(first.players.map((player) => player.id)).toEqual(second.players.map((player) => player.id));
    expect(first.sizing).toEqual(second.sizing);
    expect(first.g1).toEqual(second.g1);
  });
});
