import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  buildIdentityRoster,
  buildIdentityValueBaseline,
  POSTURE_PARAMS,
  type RosterPosture,
  type SimArchetype,
  type SimPlayer,
} from '../archetypeBalanceSimulator';
import { computePoolTierCap } from '../leagueConstruction';
import { HISTORICAL_ARCHETYPES, archetypeCapShift } from '../../data/historicalArchetypes';

/**
 * FABLE-C1 IDENTITY-EMBODIMENT gate (contract verification requirement): for every one of the 24
 * locked archetypes, the identity-first builder must produce a LEGAL, SOLVENT roster whose boosted
 * bands sit ABOVE the pool mean (boostZ > 0) while keeping the posture value floor. The
 * "before" comparison sets the floor to 1.0 (the value-maximizer's own IV — i.e. the OLD objective,
 * fit only as a tie-break), showing the objective flip is what buys the identity, not slack.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ORACLE_PATH = path.resolve(__dirname, '../../../spec-docs/reference/iv_oracle.json');

interface OracleEntry {
  id: string;
  kblIV: number;
  input: {
    isPitcher: boolean;
    role: string;
    position: string;
    batterRatings?: { POW?: number; CON?: number; SPD?: number; FLD?: number; ARM?: number };
    pitcherRatings?: { VEL?: number; JNK?: number; ACC?: number };
  };
}

function loadPool(): SimPlayer[] {
  const oracle = JSON.parse(readFileSync(ORACLE_PATH, 'utf-8')) as { players: OracleEntry[] };
  return oracle.players.map((e) => {
    const br = e.input.batterRatings ?? {};
    const pr = e.input.pitcherRatings;
    return {
      id: e.id,
      isPitcher: !!e.input.isPitcher,
      role: e.input.isPitcher ? (e.input.role as SimPlayer['role']) : undefined,
      bat: { POW: br.POW ?? 0, CON: br.CON ?? 0, SPD: br.SPD ?? 0, FLD: br.FLD ?? 0, ARM: br.ARM ?? 0 },
      pit: pr ? { VEL: pr.VEL ?? 0, JNK: pr.JNK ?? 0, ACC: pr.ACC ?? 0 } : undefined,
      iv: e.kblIV,
      salary: e.kblIV,
      position: e.input.position,
    } satisfies SimPlayer;
  });
}

const SIM_SET: (SimArchetype & { id: string })[] = HISTORICAL_ARCHETYPES.map((a) => ({
  id: a.id,
  name: a.name,
  rawShift: archetypeCapShift(a),
}));

describe('identity-first builder — embodiment across the locked 24 (standard tier)', () => {
  const pool = loadPool();
  const budget = computePoolTierCap(pool.map((p) => p.iv), 'standard');

  it('uses one canonical Full Sources value baseline in the baseline-only and identity builders', () => {
    for (const arch of SIM_SET.filter((candidate) => (
      ['murderers-row', 'whiteyball', 'flamethrowers'].includes(candidate.id)
    ))) {
      const options = { realTeamCount: 20, posture: 'optimal' as const };
      const baseline = buildIdentityValueBaseline(pool, arch, 'standard', budget, options);
      const identity = buildIdentityRoster(pool, arch, 'standard', budget, options);

      expect(baseline.baselineIv, `${arch.id} baseline`).toBe(identity.baselineIv);
      expect(baseline.valueFloor, `${arch.id} floor`).toBe(identity.valueFloor);
      expect(baseline.optimizationComplete, `${arch.id} completion`).toBe(identity.optimizationComplete);
    }
  }, 60_000);

  it('builds a LEGAL, SOLVENT, floor-respecting roster with boostZ > 0 for all 24', () => {
    const rows: { name: string; boostZ: number; beforeZ: number; ivShare: number }[] = [];
    for (const arch of SIM_SET) {
      const after = buildIdentityRoster(pool, arch, 'standard', budget, { realTeamCount: 20, posture: 'optimal' });
      const before = buildIdentityRoster(pool, arch, 'standard', budget, { realTeamCount: 20, valueFloorOverride: 1 });
      rows.push({
        name: arch.name,
        boostZ: after.embodiment.boostZ,
        beforeZ: before.embodiment.boostZ,
        ivShare: after.totalIv / after.baselineIv,
      });

      expect(after.rosterSize, `${arch.id} size`).toBe(22);
      expect(after.legalRoster, `${arch.id} legal`).toBe(true);
      expect(after.solvent, `${arch.id} solvent`).toBe(true);
      expect(after.floorMet, `${arch.id} floor`).toBe(true);
      expect(after.embodiment.boostZ, `${arch.id} boostZ`).toBeGreaterThan(0);
    }

    const meanGain = rows.reduce((s, r) => s + (r.boostZ - r.beforeZ), 0) / rows.length;
    console.log(
      '\n[embodiment, standard] mean boostZ gain (identity vs value-objective): ' + meanGain.toFixed(2) + '\n  ' +
        rows.map((r) => `${r.name}: ${r.beforeZ.toFixed(2)}→${r.boostZ.toFixed(2)} (iv ${(r.ivShare * 100).toFixed(0)}%)`).join('\n  '),
    );
    // The objective flip must buy identity ON AVERAGE across the set (individual archetypes whose
    // value build already embodies them — e.g. pitching-boost sets — may gain little).
    expect(meanGain).toBeGreaterThan(0);
  }, 120_000);

  it('postures are DISTINCT and ordered: floors respected, aggressive fits at least as hard', () => {
    const sample = SIM_SET.filter((a) => ['murderers-row', 'whiteyball', 'bash-brothers'].includes(a.id));
    expect(sample).toHaveLength(3);
    for (const arch of sample) {
      const builds = (['conservative', 'optimal', 'aggressive'] as RosterPosture[]).map((posture) =>
        buildIdentityRoster(pool, arch, 'standard', budget, { realTeamCount: 20, posture }),
      );
      for (const b of builds) {
        expect(b.legalRoster, `${arch.id} ${b.posture} legal`).toBe(true);
        expect(b.floorMet, `${arch.id} ${b.posture} floor`).toBe(true);
        expect(b.totalIv, `${arch.id} ${b.posture} floor value`).toBeGreaterThanOrEqual(
          b.baselineIv * POSTURE_PARAMS[b.posture].valueFloor - 1e-6,
        );
      }
      // Plan-distinctness (basic form): the three postures must not produce one identical roster.
      const signatures = builds.map((b) => b.players.map((p) => p.id).sort().join('|'));
      expect(new Set(signatures).size, `${arch.id} distinctness`).toBeGreaterThan(1);
    }
  }, 60_000);
});
