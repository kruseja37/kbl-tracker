import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { computeIV, type IVPlayerInput } from '../ivEngine';

interface OraclePlayer {
  id: string;
  name: string;
  position: string;
  role: string | null;
  rawIV: number;
  kblIV: number;
  rawComponents: Record<string, unknown>;
  kblComponents: Record<string, unknown>;
  input: OracleProfile;
}

interface OracleAnchor {
  name: string;
  expected: number;
  computedRawIV: number;
  input: OracleProfile;
}

interface OracleProfile {
  id?: string;
  name: string;
  isPitcher?: boolean;
  position: string;
  role: string | null;
  primaryPosition: string | null;
  secondaryPosition: string | null;
  bats: string;
  traits: string[];
  arsenal: string[];
  armSlot: 'High' | 'Mid' | 'Low' | 'Sub' | null;
  ratings?: Record<string, number>;
  batterRatings?: Record<string, number>;
  pitcherRatings?: Record<string, number> | null;
}

interface OracleFile {
  meta: {
    anchorGate: {
      passed: boolean;
      count: number;
      jonGrayInjuryProneDelta: number;
    };
  };
  anchors: OracleAnchor[];
  players: OraclePlayer[];
}

const oracle = JSON.parse(
  readFileSync('spec-docs/reference/iv_oracle.json', 'utf8'),
) as OracleFile;

function batterRatings(profile: OracleProfile): IVPlayerInput['batterRatings'] {
  const src = profile.batterRatings ?? profile.ratings;
  if (!src) {
    throw new Error(`Oracle profile ${profile.name} missing batter ratings`);
  }
  return {
    power: src.POW,
    contact: src.CON,
    speed: src.SPD,
    fielding: src.FLD,
    arm: src.ARM ?? 0,
  };
}

function pitcherRatings(profile: OracleProfile): IVPlayerInput['pitcherRatings'] {
  const src = profile.pitcherRatings ?? profile.ratings;
  if (!src || src.VEL === undefined || src.JNK === undefined || src.ACC === undefined) {
    return undefined;
  }
  return {
    velocity: src.VEL,
    junk: src.JNK,
    accuracy: src.ACC,
  };
}

function profileInput(profile: OracleProfile): IVPlayerInput {
  const isPitcher = profile.isPitcher ?? profile.role !== null;
  return {
    id: profile.id,
    name: profile.name,
    isPitcher,
    bats: profile.bats,
    primaryPosition: isPitcher ? undefined : profile.primaryPosition ?? profile.position,
    secondaryPosition: profile.secondaryPosition,
    pitcherRole: profile.role ?? undefined,
    curveBlock: profile.position,
    batterRatings: batterRatings(profile),
    pitcherRatings: isPitcher ? pitcherRatings(profile) : undefined,
    traits: profile.traits,
    arsenal: profile.arsenal,
    armSlot: profile.armSlot,
  };
}

function expectComponentParity(actual: Record<string, unknown>, expected: Record<string, unknown>, label: string) {
  for (const [key, expectedValue] of Object.entries(expected)) {
    expect(actual[key], `${label}.${key}`).toEqual(expectedValue);
  }
}

function byId(id: string): OraclePlayer {
  const player = oracle.players.find((row) => row.id === id);
  if (!player) {
    throw new Error(`Oracle missing player ${id}`);
  }
  return player;
}

describe('ivEngine T4 golden oracle parity', () => {
  test('G1 workbook anchors match cached rawIV salaries at ±$0', () => {
    expect(oracle.meta.anchorGate.passed).toBe(true);
    expect(oracle.meta.anchorGate.count).toBe(21);

    for (const anchor of oracle.anchors) {
      const result = computeIV(profileInput(anchor.input));
      expect(result.rawIV, `${anchor.name} rawIV`).toBe(anchor.expected);
      expect(anchor.computedRawIV, `${anchor.name} oracle computed rawIV`).toBe(anchor.expected);
    }
  });

  test('G2 Jon Gray Injury Prone isolated rawIV delta remains pinned after arm repricing', () => {
    const gray = oracle.anchors.find((anchor) => anchor.name === 'Jon Gray');
    expect(gray).toBeTruthy();
    expect(oracle.meta.anchorGate.jonGrayInjuryProneDelta).toBe(-836);

    const base = profileInput(gray!.input);
    const withoutTrait = computeIV({ ...base, traits: [], arsenal: [] }).rawIV;
    const injuryOnly = computeIV({ ...base, traits: ['Injury Prone'], arsenal: [] }).rawIV;
    expect(injuryOnly - withoutTrait).toBe(-836);
  });

  test('G3 all 440 stock players match frozen rawIV/kblIV totals and components', () => {
    expect(oracle.players).toHaveLength(440);
    for (const player of oracle.players) {
      const result = computeIV(profileInput(player.input));
      expect(result.rawIV, `${player.id} rawIV`).toBe(player.rawIV);
      expect(result.kblIV, `${player.id} kblIV`).toBe(player.kblIV);
      expectComponentParity(result.raw as unknown as Record<string, unknown>, player.rawComponents, `${player.id}.raw`);
      expectComponentParity(result.kbl as unknown as Record<string, unknown>, player.kblComponents, `${player.id}.kbl`);
    }
  });

  test('G4 final named oracle constants are hard-coded', () => {
    expect(computeIV(profileInput(byId('crc-fenomeno').input)).kblIV).toBe(124165);
    expect(computeIV(profileInput(byId('bee-pastimm').input)).kblIV).toBe(122198);
    expect(computeIV(profileInput(byId('wpg-drake').input)).kblIV).toBe(56490);
    expect(computeIV(profileInput(byId('blf-bradwick').input)).kblIV).toBe(58417);
  });

  test('G5 Bradwick crash gate remains below half of rawIV', () => {
    const bradwick = byId('blf-bradwick');
    const result = computeIV(profileInput(bradwick.input));
    expect(result.kblIV).toBeLessThanOrEqual(Math.floor(result.rawIV * 0.5));
  });

  test('G6 Two Way holders expose 1.00 effective usage while retaining role weights', () => {
    const fenomeno = computeIV(profileInput(byId('crc-fenomeno').input));
    expect(fenomeno.kbl.twoWayUnlock).toBeGreaterThan(0);
    expect(fenomeno.kbl.effectiveUsage).toEqual({ POW: 1, CON: 1, SPD: 1, FLD: 1 });
    expect(fenomeno.kbl.usageWeights?.POW).toBeLessThan(1);
  });

  test('G7 hitter kblIV is identical to rawIV for every non-pitcher', () => {
    const hitters = oracle.players.filter((player) => !player.input.isPitcher);
    expect(hitters.length).toBeGreaterThan(0);
    for (const hitter of hitters) {
      const result = computeIV(profileInput(hitter.input));
      expect(result.kblIV, hitter.id).toBe(result.rawIV);
      expect(result.kbl, hitter.id).toEqual(result.raw);
    }
  });

  test('G8 ivEngine remains pure of React, IndexedDB, DOM, player DB, tier params, and interaction imports', () => {
    const source = readFileSync('src/engines/ivEngine.ts', 'utf8');
    expect(source).not.toMatch(/from ['"]react['"]/);
    expect(source).not.toMatch(/indexeddb|idb|document|window|localStorage/i);
    expect(source).not.toMatch(/playerDatabase|tierParams|traitInteractionMatrix/);
  });

  test('G9 two full-pool passes are deterministic', () => {
    const once = oracle.players.map((player) => {
      const result = computeIV(profileInput(player.input));
      return [player.id, result.rawIV, result.kblIV, result.raw, result.kbl];
    });
    const twice = oracle.players.map((player) => {
      const result = computeIV(profileInput(player.input));
      return [player.id, result.rawIV, result.kblIV, result.raw, result.kbl];
    });
    expect(twice).toEqual(once);
  });

  test('G10 rawIV is pinned to workbook L2 semantics regardless of potency input', () => {
    const traited = byId('crc-fenomeno');
    const input = profileInput(traited.input);
    const l1 = computeIV(input, undefined, undefined, 'L1');
    const l2 = computeIV(input, undefined, undefined, 'L2');
    const l3 = computeIV(input, undefined, undefined, 'L3');

    expect(l1.rawIV).toBe(l2.rawIV);
    expect(l3.rawIV).toBe(l2.rawIV);
    expect(l1.raw).toEqual(l2.raw);
    expect(l3.raw).toEqual(l2.raw);
    expect(l1.kblIV).not.toBe(l3.kblIV);
  });

  test('X3 documents current synthetic hitter Sub armSlot edge pending spec §15 review', () => {
    const base: IVPlayerInput = {
      id: 'synthetic-hitter-sub-edge',
      name: 'Synthetic Hitter',
      isPitcher: false,
      bats: 'R',
      primaryPosition: 'SS',
      batterRatings: {
        power: 50,
        contact: 50,
        speed: 50,
        fielding: 50,
        arm: 50,
      },
      traits: [],
      arsenal: [],
    };

    const noSlot = computeIV(base);
    const subSlot = computeIV({ ...base, armSlot: 'Sub' });

    expect(subSlot.raw.angle).toBe(4000);
    expect(subSlot.rawIV - noSlot.rawIV).toBe(4000);
    expect(subSlot.kblIV - noSlot.kblIV).toBe(4000);
  });
});
