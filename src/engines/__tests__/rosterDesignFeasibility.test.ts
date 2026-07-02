import { describe, expect, it } from 'vitest';
import {
  buildDefaultDesignSlots,
  evaluateRosterDesign,
  personalityTiltPenalty,
  rankPoolForPreference,
  type DesignPoolPlayer,
} from '../rosterDesignFeasibility';
import type { TaxonomyPosition } from '../../data/playerArchetypeTaxonomy';
import { classifyPlayerArchetype } from '../playerArchetypeClassifier';

let nextId = 0;

function hitter(
  position: string,
  options: {
    id?: string;
    salary?: number;
    tools?: { power: number; contact: number; speed: number; fielding: number; arm: number };
    personality?: string;
    secondary?: string | null;
  } = {},
): DesignPoolPlayer {
  const id = options.id ?? `h-${position}-${nextId += 1}`;
  const tools = options.tools ?? { power: 60, contact: 60, speed: 60, fielding: 60, arm: 60 };
  return {
    id,
    name: id,
    salary: options.salary ?? 10_000,
    profile: {
      isPitcher: false,
      primaryPosition: position,
      secondaryPosition: options.secondary ?? null,
      bats: 'R',
      throws: 'R',
      age: 27,
      personality: options.personality,
      ...tools,
    },
    slotPlayer: {
      isPitcher: false,
      position,
      secondaryPosition: options.secondary ?? null,
    },
  };
}

function arm(
  role: 'SP' | 'RP',
  options: { id?: string; salary?: number; tools?: { velocity: number; junk: number; accuracy: number } } = {},
): DesignPoolPlayer {
  const id = options.id ?? `p-${role}-${nextId += 1}`;
  const tools = options.tools ?? { velocity: 60, junk: 60, accuracy: 60 };
  return {
    id,
    name: id,
    salary: options.salary ?? 12_000,
    profile: {
      isPitcher: true,
      primaryPosition: role,
      bats: 'R',
      throws: 'R',
      age: 27,
      arsenal: ['4F', 'SL', 'CH'],
      ...tools,
    },
    slotPlayer: { isPitcher: true, position: role, role },
  };
}

function standardPool(): DesignPoolPlayer[] {
  return [
    ...(['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const).map((position) => hitter(position)),
    hitter('C', { id: 'backup-c' }),
    ...Array.from({ length: 5 }, (_, index) => hitter('LF', { id: `bench-${index}` })),
    ...Array.from({ length: 4 }, () => arm('SP')),
    ...Array.from({ length: 4 }, () => arm('RP')),
  ];
}

describe('evaluateRosterDesign', () => {
  it('fills the default 22-slot frame from a sufficient pool: feasible, legal, budget-true', () => {
    const pool = standardPool();
    const result = evaluateRosterDesign(buildDefaultDesignSlots(), pool, 500_000);
    expect(result.blockers).toEqual([]);
    expect(result.feasible).toBe(true);
    expect(result.legal).toBe(true);
    expect(result.slots.every((slot) => slot.playerId !== null)).toBe(true);
    expect(result.totalCost).toBe(pool.reduce((sum, player) => sum + player.salary, 0));
    expect(result.headroom).toBe(500_000 - result.totalCost);
  });

  it('honors a shape ask when the pool carries it', () => {
    const pool = standardPool();
    // Replace the SS with a clear Defensive-Wizard shape.
    const wizard = hitter('SS', {
      id: 'ss-wizard',
      tools: { power: 40, contact: 50, speed: 60, fielding: 80, arm: 70 },
    });
    const slots = buildDefaultDesignSlots().map((slot) =>
      slot.slotId === 'SS' ? { ...slot, preference: { shape: 'Defensive-Wizard' } } : slot,
    );
    const result = evaluateRosterDesign(slots, [...pool.filter((p) => p.profile.primaryPosition !== 'SS'), wizard], 500_000);
    const ss = result.slots.find((slot) => slot.slotId === 'SS');
    expect(ss?.playerId).toBe('ss-wizard');
    expect(ss?.matchedShape).toBe('Defensive-Wizard');
    expect(result.feasible).toBe(true);
  });

  it('names the blocker in plain language when the ask does not exist, with relaxation counts', () => {
    const slots = buildDefaultDesignSlots().map((slot) =>
      slot.slotId === 'SS' ? { ...slot, preference: { shape: 'Slugger', allowRunnerUp: false } } : slot,
    );
    const result = evaluateRosterDesign(slots, standardPool(), 500_000);
    expect(result.feasible).toBe(false);
    const blocker = result.blockers.find((candidate) => candidate.slotId === 'SS');
    expect(blocker?.kind).toBe('no-match');
    expect(blocker?.message).toContain('No Slugger');
    expect(blocker?.relaxations?.withoutShape).toBeGreaterThan(0);
  });

  it('reports the budget gap with the priciest asks named when the design fills but costs too much', () => {
    const result = evaluateRosterDesign(buildDefaultDesignSlots(), standardPool(), 100_000);
    expect(result.feasible).toBe(false);
    const blocker = result.blockers.find((candidate) => candidate.kind === 'budget');
    expect(blocker?.message).toContain('over');
    expect(result.legal).toBe(true); // it fills legally — money is the only obstacle
  });

  it('F1 regression: a loose earlier slot cannot strand a later specific ask (matching, not greedy)', () => {
    // 3 generic SP + 1 CHEAP Effectively-Wild arm. Greedy cheapest-first would hand the EW
    // arm to the loose SP1 and falsely block SP2's ask; matching must return feasible.
    const pool = [
      ...standardPool().filter((p) => p.slotPlayer.role !== 'SP'),
      ...Array.from({ length: 3 }, (_, index) => arm('SP', { id: `generic-sp-${index}`, salary: 12_000 })),
      arm('SP', { id: 'ew-arm', salary: 6_000, tools: { velocity: 80, junk: 58, accuracy: 48 } }),
    ];
    const slots = buildDefaultDesignSlots().map((slot) =>
      slot.slotId === 'SP2' ? { ...slot, preference: { shape: 'Effectively-Wild' } } : slot,
    );
    const result = evaluateRosterDesign(slots, pool, 500_000);
    expect(result.blockers).toEqual([]);
    expect(result.feasible).toBe(true);
    expect(result.slots.find((slot) => slot.slotId === 'SP2')?.playerId).toBe('ew-arm');
  });

  it('F3: a runner-up match reports the ASKED shape, flagged viaRunnerUp', () => {
    const nearMiss = hitter('SS', {
      id: 'ss-near-miss',
      tools: { power: 85, contact: 58, speed: 45, fielding: 50, arm: 60 },
    });
    // Derive the runner-up honestly from the classifier rather than assuming geometry.
    const probe = evaluateRosterDesign(
      [{ slotId: 'SS', kind: 'pos', position: 'SS' }],
      [nearMiss],
      500_000,
    );
    const primary = probe.slots[0].matchedShape as string;
    const runnerUp = classifyPlayerArchetype(nearMiss.profile).runnerUp as string;
    expect(runnerUp).not.toBe(primary);

    const asked = evaluateRosterDesign(
      [{ slotId: 'SS', kind: 'pos', position: 'SS', preference: { shape: runnerUp } }],
      [nearMiss],
      500_000,
    );
    const resolution = asked.slots[0];
    expect(resolution.playerId).toBe('ss-near-miss');
    expect(resolution.matchedShape).toBe(runnerUp); // the ASKED shape, not the primary
    expect(resolution.viaRunnerUp).toBe(true);
  });

  it('personality tilt reorders but never blocks (the anti-starve rule)', () => {
    const steady = hitter('SS', { id: 'ss-steady', salary: 20_000, personality: 'Tough' });
    const fragile = hitter('SS', { id: 'ss-fragile', salary: 8_000, personality: 'Droopy' });
    const basePool = standardPool().filter((p) => p.profile.primaryPosition !== 'SS');
    const tilted = buildDefaultDesignSlots().map((slot) =>
      slot.slotId === 'SS' ? { ...slot, preference: { personalityTilt: 'avoid-fragile' as const } } : slot,
    );

    const withBoth = evaluateRosterDesign(tilted, [...basePool, steady, fragile], 500_000);
    expect(withBoth.slots.find((slot) => slot.slotId === 'SS')?.playerId).toBe('ss-steady');

    // Untilted, saturated pool (22 players / 22 slots): the matching may place either
    // SS-capable player at SS (a permutation, not a preference violation) — the engine's
    // promises are feasibility, total cost, and tilt ordering, not slot-local cheapest.
    const anyTilt = evaluateRosterDesign(buildDefaultDesignSlots(), [...basePool, steady, fragile], 500_000);
    expect(['ss-steady', 'ss-fragile']).toContain(anyTilt.slots.find((slot) => slot.slotId === 'SS')?.playerId);
    expect(anyTilt.totalCost).toBe(withBoth.totalCost); // same player set either way

    const onlyFragile = evaluateRosterDesign(tilted, [...basePool, fragile], 500_000);
    expect(onlyFragile.slots.find((slot) => slot.slotId === 'SS')?.playerId).toBe('ss-fragile'); // soft, not a filter
    expect(onlyFragile.blockers).toEqual([]);
  });
});

describe('rankPoolForPreference', () => {
  it('ranks the requested shape first, breaks ties by tilt then price', () => {
    const wizardCheap = hitter('SS', {
      id: 'wiz-cheap',
      salary: 9_000,
      tools: { power: 40, contact: 50, speed: 60, fielding: 80, arm: 70 },
      personality: 'Droopy',
    });
    const wizardSteady = hitter('SS', {
      id: 'wiz-steady',
      salary: 11_000,
      tools: { power: 40, contact: 50, speed: 60, fielding: 80, arm: 70 },
      personality: 'Tough',
    });
    const slugger = hitter('SS', {
      id: 'ss-slugger',
      salary: 7_000,
      tools: { power: 85, contact: 55, speed: 45, fielding: 50, arm: 60 },
    });
    const ranked = rankPoolForPreference(
      'SS' as TaxonomyPosition,
      { shape: 'Defensive-Wizard', personalityTilt: 'avoid-fragile' },
      [wizardCheap, wizardSteady, slugger],
    );
    expect(ranked.map((entry) => entry.playerId)).toEqual(['wiz-steady', 'wiz-cheap', 'ss-slugger']);
  });
});

describe('personalityTiltPenalty', () => {
  it('maps the four tilts over the derived groups', () => {
    expect(personalityTiltPenalty('FRAGILE', 'avoid-fragile')).toBe(1);
    expect(personalityTiltPenalty('STEADY', 'avoid-fragile')).toBe(0);
    expect(personalityTiltPenalty('STEADY', 'prefer-steady')).toBe(0);
    expect(personalityTiltPenalty('FRAGILE', 'prefer-steady')).toBe(2);
    expect(personalityTiltPenalty('VOLATILE', 'embrace-volatility')).toBe(0);
    expect(personalityTiltPenalty('VOLATILE', 'any')).toBe(0);
  });
});
