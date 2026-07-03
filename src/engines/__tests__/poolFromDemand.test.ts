import { describe, expect, it } from 'vitest';
import {
  countCellMatches,
  extractPoolFromDemand,
  type ClassifiedDemandPlayer,
  type DemandUniversePlayer,
  type TeamDesignInput,
} from '../poolFromDemand';
import { buildDefaultDesignSlots } from '../rosterDesignFeasibility';
import { HISTORICAL_ARCHETYPES } from '../../data/historicalArchetypes';
import { classifyPlayerArchetype } from '../playerArchetypeClassifier';
import { demandPlayerFromLeaguePlayer } from '../../src_figma/app/pages/LeagueBuilderDraftSetup';
import { canRelieve, canStart } from '../../data/rosterConstruction';
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
});
