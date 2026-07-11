import { describe, expect, it } from 'vitest';
import { BANDS } from '../leagueConstruction';
import { derivePlayerBandWeights } from '../snakePlayerBands';

const RATINGS = {
  power: 90,
  contact: 60,
  speed: 30,
  fielding: 80,
  arm: 40,
  velocity: 75,
  junk: 60,
  accuracy: 90,
};

describe('derivePlayerBandWeights (the canonical player→band adapter)', () => {
  it('masks a position player to the four hitter bands with rating-shaped weights', () => {
    const w = derivePlayerBandWeights({ isPitcher: false, ...RATINGS });
    expect(w.Power).toBeCloseTo(90 / 99, 5);
    expect(w.Contact).toBeCloseTo(60 / 99, 5);
    expect(w.Speed).toBeCloseTo(30 / 99, 5);
    expect(w.Defense).toBeCloseTo((80 + 40) / 2 / 99, 5);
    expect(w.Rotation).toBe(0);
    expect(w.Bullpen).toBe(0);
  });

  it('masks pitchers by role: SP→Rotation, CP/RP→Bullpen, SP/RP→both (mirrors the cap tables)', () => {
    const arm = (75 + 60 + 90) / 3 / 99;
    const sp = derivePlayerBandWeights({ isPitcher: true, role: 'SP', ...RATINGS });
    expect(sp.Rotation).toBeCloseTo(arm, 5);
    expect(sp.Bullpen).toBe(0);
    const cp = derivePlayerBandWeights({ isPitcher: true, role: 'CP', ...RATINGS });
    expect(cp.Bullpen).toBeCloseTo(arm, 5);
    expect(cp.Rotation).toBe(0);
    const swing = derivePlayerBandWeights({ isPitcher: true, role: 'SP/RP', ...RATINGS });
    expect(swing.Rotation).toBeCloseTo(arm, 5);
    expect(swing.Bullpen).toBeCloseTo(arm, 5);
    for (const p of [sp, cp, swing]) {
      expect(p.Power).toBe(0);
      expect(p.Contact).toBe(0);
    }
  });

  it('degrades an unknown pitcher role toward both pens, never to a zeroed player', () => {
    const w = derivePlayerBandWeights({ isPitcher: true, role: null, ...RATINGS });
    expect(w.Rotation).toBeGreaterThan(0);
    expect(w.Bullpen).toBeGreaterThan(0);
  });

  it('clamps out-of-range and non-finite ratings into [0,1]', () => {
    const w = derivePlayerBandWeights({
      isPitcher: false,
      power: 250,
      contact: -10,
      speed: Number.NaN,
      fielding: 99,
      arm: 99,
      velocity: 0,
      junk: 0,
      accuracy: 0,
    });
    expect(w.Power).toBe(1);
    expect(w.Contact).toBe(0);
    expect(w.Speed).toBe(0);
    expect(w.Defense).toBe(1);
  });

  it('always yields a non-null normalizable map for any real player (no silent neutral fallback)', () => {
    const hitter = derivePlayerBandWeights({ isPitcher: false, ...RATINGS });
    const pitcher = derivePlayerBandWeights({ isPitcher: true, role: 'RP', ...RATINGS });
    for (const w of [hitter, pitcher]) {
      expect(BANDS.some((band) => w[band] > 0)).toBe(true);
      for (const band of BANDS) {
        expect(w[band]).toBeGreaterThanOrEqual(0);
        expect(w[band]).toBeLessThanOrEqual(1);
      }
    }
  });

  it('is monotone in the underlying rating within a band', () => {
    const lo = derivePlayerBandWeights({ isPitcher: false, ...RATINGS, power: 40 });
    const hi = derivePlayerBandWeights({ isPitcher: false, ...RATINGS, power: 95 });
    expect(hi.Power).toBeGreaterThan(lo.Power);
  });
});
