import { describe, it, expect } from 'vitest';
import {
  pickStadiumFromPool,
  resolveFranchiseStadiumChange,
} from '../franchiseStadiumChangeResolver';
import type { FranchiseL10EventCandidate } from '../franchiseL10EventEngine';
import { getAllParks, getStableParkId } from '../../data/parkLookup';
import { getDerivedParkFactorsIfAvailable } from '../parkFactorDeriver';

function makeStadiumChangeEvent(seed: number): FranchiseL10EventCandidate {
  return {
    family: 'team',
    eventType: 'stadium_change',
    targetId: 'team-x',
    targetKind: 'team',
    valence: 'neutral',
    magnitude: 1,
    probability: 0.5,
    seed,
  };
}

describe('resolveFranchiseStadiumChange', () => {
  it('is deterministic: same event + same input yields identical newStadium and snapshot', () => {
    const event = makeStadiumChangeEvent(0.42);
    const input = {
      event,
      teamName: 'Test Team',
      currentStadiumName: getAllParks()[0].name,
      seedBase: 'season-1',
    };

    const first = resolveFranchiseStadiumChange(input);
    const second = resolveFranchiseStadiumChange(input);

    expect(second.newStadium).toEqual(first.newStadium);
    expect(second.snapshot).toEqual(first.snapshot);
  });

  it('excludes the current park across all seeds', () => {
    const currentStadiumName = getAllParks()[0].name;
    const currentId = getStableParkId(currentStadiumName);

    for (let i = 0; i < 25; i += 1) {
      const event = makeStadiumChangeEvent(i * 0.037 + 0.001);
      const result = resolveFranchiseStadiumChange({
        event,
        teamName: 'Test Team',
        currentStadiumName,
        seedBase: `s-${i}`,
      });

      expect(result.newStadium.name).not.toBe(currentStadiumName);
      expect(getStableParkId(result.newStadium.name)).not.toBe(currentId);
    }
  });

  it('reaches more than one distinct park across many seeds (pool coverage)', () => {
    const currentStadiumName = getAllParks()[0].name;
    const reached = new Set<string>();

    for (let i = 0; i < 60; i += 1) {
      const event = makeStadiumChangeEvent(i * 0.013 + 0.0005);
      const result = resolveFranchiseStadiumChange({
        event,
        teamName: 'Test Team',
        currentStadiumName,
        seedBase: `cov-${i}`,
      });
      reached.add(result.newStadium.name);
    }

    expect(reached.size).toBeGreaterThan(1);
  });

  it('produces a well-formed snapshot', () => {
    const event = makeStadiumChangeEvent(0.77);
    const result = resolveFranchiseStadiumChange({
      event,
      teamName: 'Test Team',
      currentStadiumName: getAllParks()[0].name,
      seedBase: 'snap',
    });

    expect(result.snapshot.teamId).toBe(event.targetId);
    expect(result.snapshot.teamName).toBe('Test Team');
    expect(result.snapshot.stadium).toBe(result.newStadium.name);
    expect(result.snapshot.stadiumId).toBe(getStableParkId(result.newStadium.name));
    expect(result.snapshot.hasSeedParkFactors).toBe(
      getDerivedParkFactorsIfAvailable(result.newStadium.name) !== undefined,
    );
  });

  it('resolves to a pool park when current stadium is undefined (full pool eligible)', () => {
    const event = makeStadiumChangeEvent(0.31);
    const result = resolveFranchiseStadiumChange({
      event,
      teamName: 'Test Team',
      currentStadiumName: undefined,
      seedBase: 'no-current',
    });

    const poolNames = getAllParks().map((park) => park.name);
    expect(poolNames).toContain(result.newStadium.name);
  });

  it('resolves fine when current stadium name is not in the pool (full pool eligible)', () => {
    const event = makeStadiumChangeEvent(0.66);
    const result = resolveFranchiseStadiumChange({
      event,
      teamName: 'Test Team',
      currentStadiumName: 'Not A Real Park 99',
      seedBase: 'bogus-current',
    });

    const poolNames = getAllParks().map((park) => park.name);
    expect(poolNames).toContain(result.newStadium.name);
  });

  it('throws on a non-team event (player target)', () => {
    const event: FranchiseL10EventCandidate = {
      ...makeStadiumChangeEvent(0.5),
      targetKind: 'player',
    };

    expect(() =>
      resolveFranchiseStadiumChange({ event, teamName: 'Test Team' }),
    ).toThrow(/expected a team stadium_change event/);
  });

  it('throws on a non-stadium_change event type', () => {
    const event: FranchiseL10EventCandidate = {
      ...makeStadiumChangeEvent(0.5),
      eventType: 'front_office_mandate',
    };

    expect(() =>
      resolveFranchiseStadiumChange({ event, teamName: 'Test Team' }),
    ).toThrow(/expected a team stadium_change event/);
  });
});

describe('pickStadiumFromPool', () => {
  it('is deterministic for the same seed', () => {
    const a = pickStadiumFromPool(undefined, 'fixed-seed');
    const b = pickStadiumFromPool(undefined, 'fixed-seed');
    expect(b).toEqual(a);
  });

  it('never returns the excluded current park across many seeds', () => {
    const currentStadiumName = getAllParks()[0].name;
    const currentId = getStableParkId(currentStadiumName);

    for (let i = 0; i < 25; i += 1) {
      const pick = pickStadiumFromPool(currentStadiumName, `pick-${i}`);
      expect(getStableParkId(pick.name)).not.toBe(currentId);
    }
  });
});
