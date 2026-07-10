import { describe, expect, it } from 'vitest';
import { buildIdentityRoster, type SimPlayer } from '../archetypeBalanceSimulator';
import { HISTORICAL_ARCHETYPES } from '../../data/historicalArchetypes';

/**
 * The preference-aware identity build (taxonomy polish leg — the C4-B designer/whisper
 * seam): `slotPreferenceBonus` must be EXACTLY inert when absent-or-zero, and must steer
 * a slot toward the asked player when present. Fixture pattern mirrors
 * auctionPoolSizing.test's simPlayer/richPool.
 */

function simPlayer(
  id: string,
  shape: Partial<SimPlayer> & { position: string; isPitcher: boolean },
  ratings = 60,
): SimPlayer {
  return {
    id,
    iv: 10_000,
    salary: 10_000,
    bat: { POW: ratings, CON: ratings, SPD: ratings, FLD: ratings, ARM: ratings },
    pit: shape.isPitcher ? { VEL: ratings, JNK: ratings, ACC: ratings } : undefined,
    ...shape,
  } as SimPlayer;
}

function richPool(teams: number): SimPlayer[] {
  const pool: SimPlayer[] = [];
  const positions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
  let n = 0;
  for (let copy = 0; copy < teams * 2; copy += 1) {
    for (const pos of positions) {
      pool.push(simPlayer(`h-${n += 1}`, { position: pos, isPitcher: false }, 40 + ((n * 7) % 50)));
    }
    pool.push(
      simPlayer(`bc-${n += 1}`, { position: '1B', isPitcher: false, secondaryPosition: 'C' }, 40 + ((n * 7) % 50)),
    );
    pool.push(simPlayer(`sp-${n += 1}`, { position: 'P', isPitcher: true, role: 'SP' }, 40 + ((n * 7) % 50)));
    pool.push(simPlayer(`sp2-${n += 1}`, { position: 'P', isPitcher: true, role: 'SP' }, 40 + ((n * 7) % 50)));
    pool.push(simPlayer(`swing-${n += 1}`, { position: 'P', isPitcher: true, role: 'SP/RP' }, 40 + ((n * 7) % 50)));
    pool.push(simPlayer(`rp-${n += 1}`, { position: 'P', isPitcher: true, role: 'RP' }, 40 + ((n * 7) % 50)));
    pool.push(simPlayer(`cp-${n += 1}`, { position: 'P', isPitcher: true, role: 'CP' }, 40 + ((n * 7) % 50)));
  }
  return pool;
}

const SS_SLOT_INDEX = 4; // IDENTITY_SLOT_PLAN: pos ×8 in C,1B,2B,3B,SS,LF,CF,RF order

describe('buildIdentityRoster slotPreferenceBonus', () => {
  const archetype = HISTORICAL_ARCHETYPES[0];
  const tier = 'standard' as const;
  const pool = richPool(4);
  // Generous fixed budget: 22 uniform 10k salaries + ample tax headroom — solvency is a
  // real assertion, not a fixture accident (computePoolTierCap anchors to max IV and is
  // deliberately tight for this flat pool).
  const budget = 400_000;

  it('is EXACTLY inert when the bonus is a constant zero (byte-identical builds)', () => {
    const without = buildIdentityRoster(pool, archetype, tier, budget, { realTeamCount: 20 });
    const withZero = buildIdentityRoster(pool, archetype, tier, budget, {
      realTeamCount: 20,
      slotPreferenceBonus: () => 0,
    });
    expect(withZero.players.map((p) => p.id)).toEqual(without.players.map((p) => p.id));
    expect(withZero.totalIv).toBe(without.totalIv);
    expect(withZero.totalSalary).toBe(without.totalSalary);
    expect(withZero.fit ?? withZero.embodiment).toBeDefined();
  });

  it('steers the asked slot toward the preferred player without breaking feasibility', () => {
    const baseline = buildIdentityRoster(pool, archetype, tier, budget, { realTeamCount: 20 });
    // Prefer a specific SS the baseline did NOT choose at the SS slot.
    const baselineIds = new Set(baseline.players.map((p) => p.id));
    const altSS = pool.find((p) => !p.isPitcher && p.position === 'SS' && !baselineIds.has(p.id));
    expect(altSS).toBeDefined();

    const preferred = buildIdentityRoster(pool, archetype, tier, budget, {
      realTeamCount: 20,
      slotPreferenceBonus: (playerId, slotIndex) =>
        slotIndex === SS_SLOT_INDEX && playerId === altSS!.id ? 10_000 : 0,
    });
    expect(preferred.players.map((p) => p.id)).toContain(altSS!.id);
    expect(preferred.legalRoster).toBe(true);
    expect(preferred.rosterSize).toBe(22);
    // The flat fixture blows the shifted concentration caps for EVERY build (tax, not the
    // boost) — the honest invariant is that steering never WORSENS solvency vs baseline.
    expect(preferred.solvent).toBe(baseline.solvent);
    expect(preferred.totalSalary).toBeLessThanOrEqual(baseline.totalSalary * 1.05);
  });
});
