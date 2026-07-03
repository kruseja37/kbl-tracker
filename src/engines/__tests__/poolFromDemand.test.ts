import { describe, expect, it } from 'vitest';
import {
  extractPoolFromDemand,
  type DemandUniversePlayer,
  type TeamDesignInput,
} from '../poolFromDemand';
import { buildDefaultDesignSlots } from '../rosterDesignFeasibility';
import { HISTORICAL_ARCHETYPES } from '../../data/historicalArchetypes';

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
});
