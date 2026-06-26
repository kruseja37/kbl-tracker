# Pool-Feasibility Check — Design Spec (keystone optimizer, step 1)

> Branch: `codex/draft-pipeline-fix`. Date: 2026-06-26. Owner: Captain (Opus) per AUTH; ruling source: JK.
> Source-of-truth companions: `FRANCHISE_DRAFT_ARCHETYPE_ALIGNMENT_BRIEF.md` §3, `ARCHETYPE_BALANCE_SIM_RESULTS.md`
> (value-economy section), `IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md` §5.3 (T3 EV-flatness) + the absolute-IV
> architecture (T12: "player IVs never change with the pool — only the league-environment constants recalibrate").

## Purpose
The pre-draft half of the keystone roster-optimizer. Point the existing best-roster builder at a **locked draft
pool** and tell each GM whether their chosen team archetype is **supported** or **starved** by *this specific* pool —
so nobody picks an identity the pool can't deliver. When starved, emit the actionable prompt:
**"Add ~N [type] players to activate [archetype]."**

This is COMPOSITION analysis (does the pool contain enough of each player TYPE), not strength analysis. A uniform
pool-strength change does not move the verdict; missing player *types* do.

## Tier ruling (JK 2026-06-26) — budget only
Picking a difficulty tier scales **only the budget** (`computePoolTierCap(pool.ivs, tier)`), never the players'
ratings/IV. Players keep their stock (juiced-workbook) ratings. This matches the canonical absolute-IV architecture;
`TIER_RATING_SCALES` stays **dormant** (defined, unused) for the sim + feasibility. The feasibility check therefore
reads stock ratings/IV directly; tier enters only through the budget. (Faithful-tier rating-scaling experiment is kept
as provenance in ARCHETYPE_BALANCE_SIM_RESULTS but is NOT adopted.)

## Module
- NEW `src/engines/poolFeasibility.ts` (pure, headless, deterministic — no `Date.now`/`Math.random`/fs/DOM).
- NEW `src/engines/__tests__/poolFeasibility.test.ts`.
- Reuses (read-only, import only): `archetypeBalanceSimulator` (`buildBestRoster`, `SimPlayer`, `SimArchetype`,
  `ArchetypeSimResult`), `historicalArchetypes` (`HISTORICAL_ARCHETYPES`, `archetypeCapShift`, `ArchetypeStat`,
  `ARCHETYPE_STAT_LUX_KEY`), `leagueConstruction` (`computePoolTierCap`), `tierParams` (`TierKey`).
- Frozen/untouched: `iv_oracle.json`, `archetypeBalanceSimulator.ts`, `historicalArchetypes.ts`,
  `leagueConstruction.ts`, `tierParams.ts`.

## Public API
```ts
export interface FeasibilityShortfall {
  stat: ArchetypeStat;                                   // the boosted identity axis that's short
  group: 'hitters' | 'rotation' | 'bullpen';
  demand: number;                                        // strong players the identity wants in this group
  supply: number;                                        // strong players the locked pool actually has
  needCount: number;                                     // max(0, demand - supply)
  binding: boolean;                                      // short here hurts team STRENGTH (vs identity-flavor only)
  descriptor: string;                                    // human phrase, e.g. "pinpoint command starters"
}
export interface ArchetypeFeasibility {
  archetypeId: string;
  archetypeName: string;
  support: 'supported' | 'thin' | 'starved';
  built: ArchetypeSimResult;                             // buildBestRoster() on the locked pool (diagnostic)
  shortfalls: FeasibilityShortfall[];                    // sorted binding-first, then needCount desc, then stat asc
  activationPrompt: string | null;                       // null iff support === 'supported'
}
export interface PoolFeasibilityReport {
  tier: TierKey;
  budget: number;                                        // computePoolTierCap(lockedPool.ivs, tier)
  poolSize: number;
  results: ArchetypeFeasibility[];                       // one per input archetype, input order preserved
}

/** Pure. referencePool anchors the "strong player" thresholds; defaults to lockedPool (pool-relative). */
export function analyzePoolFeasibility(
  lockedPool: SimPlayer[],
  archetypes: HistoricalArchetype[],
  tier: TierKey,
  referencePool?: SimPlayer[],
): PoolFeasibilityReport;
```

## Algorithm (per archetype)
1. **Budget + build.** `budget = computePoolTierCap(lockedPool.map(p=>p.iv), tier)`; `built = buildBestRoster(
   lockedPool, {name, rawShift: archetypeCapShift(arch)}, tier, budget)`. `built` is the solvency/fieldability probe.
2. **"Strong in stat S" threshold (composition anchor).** From `referencePool ?? lockedPool`, within S's group, the
   **P67** (top third) of that group's S-ratings. A locked-pool player "counts as strong in S" iff its S-rating ≥
   that threshold. Anchoring to a reference (the app passes the full canonical pool) is what makes a *uniformly thin*
   pool read as starved rather than masking it with its own (low) top third.
   - Percentile: nearest-rank P67 on the sorted ratings of the relevant group, deterministic (no interpolation
     ambiguity — define exactly: `sorted[ceil(0.67*n)-1]`, n = group size, clamp index to [0, n-1]).
   - Group membership for supply/threshold: **hitters** = `!isPitcher`; **rotation** = `role ∈ {SP, SP/RP}`;
     **bullpen** = `role ∈ {RP, CP, SP/RP}` (SP/RP counts to both, mirroring the sim's `isStarter`/`isReliever`).
3. **Per-boosted-stat demand vs supply.** For each stat in `arch.boosts` (read straight off the archetype's
   `spec` keys with a positive multiplier — the RAISED bands):
   - `demand`: how many strong players realize the over-stack. **Hitter-group boost → 7** (a majority of the 13
     hitter slots: 8 set + 5 flex). **Rotation boost → 3** (of 4 SP). **Bullpen boost → 3** (of 5 RP).
   - `supply`: count of locked-pool players in S's group strong in S (step 2).
   - `needCount = max(0, demand - supply)`.
4. **Binding.** `binding = stat ∈ {POW, CON, ROT_VEL, ROT_JNK, ROT_ACC, PEN_VEL}` (short → real strength hit per
   the value-economy findings: power/contact + premium pitching). `{SPD, FLD, ARM, PEN_JNK, PEN_ACC}` are
   identity-flavor (the IV engine underprices these; a pool can be short without a strength loss — FLD's true-value
   correction is the SEPARATE step-2 build, not this gate).
5. **Classify.**
   - `notFieldable = !built.solvent || built.rosterSize < 22`.
   - `hasBindingShortfall = shortfalls.some(s => s.binding && s.needCount > 0)`.
   - `hasAnyShortfall = shortfalls.some(s => s.needCount > 0)`.
   - `support = notFieldable || hasBindingShortfall ? 'starved' : hasAnyShortfall ? 'thin' : 'supported'`.
6. **Activation prompt** (null when supported):
   - `notFieldable` with no stat shortfall → `"This pool is too thin to field a full {name} roster — add more players."`
   - else take the **top** shortfall (sort: binding desc, needCount desc, stat asc) →
     `"Add ~{needCount} {descriptor} to activate {name}."`

### Descriptor map (stat → phrase)
```
POW: power bats            CON: contact hitters       SPD: speed/baserunning threats
FLD: rangy defenders       ARM: strong-armed fielders
ROT_VEL: power starters    ROT_JNK: finesse starters  ROT_ACC: pinpoint command starters
PEN_VEL: power relievers   PEN_JNK: junkball relievers PEN_ACC: pinpoint command relievers
```

## Tunable constants (documented; conservative defaults — Captain set, not JK-blessed numerics)
`STRONG_PERCENTILE = 0.67`, hitter `DEMAND_HITTER = 7`, `DEMAND_ROTATION = 3`, `DEMAND_BULLPEN = 3`,
`BINDING_STATS = {POW, CON, ROT_VEL, ROT_JNK, ROT_ACC, PEN_VEL}`. All exported so the draft-guide/scout steps and the
empirical Mode-2 calibration can re-tune without touching call sites.

## Determinism / guarantees (same family as the optimizer interface contract)
Pure function; same inputs → byte-identical output. No `Date.now`/`Math.random`/fs/DOM/IndexedDB. Stable sorts only
(no reliance on input order for tie-breaks except the documented `stat asc` final key). Output `results` preserves the
input `archetypes` order.

## Tests (poolFeasibility.test.ts)
1. **Full canonical pool (440)** → every one of the 15 archetypes `supported`, all `activationPrompt === null`
   (mirrors the balance-sim 15/15 — a healthy pool supports every identity).
2. **Glove-stripped pool** (drop all reference-strong-FLD hitters) → Whiteyball / Go-Go / Oriole Way return a FLD
   shortfall with `needCount > 0`, `descriptor` = "rangy defenders", and a non-null activation prompt.
3. **Command-stripped pool** (drop low-ACC... i.e. keep only weak-ACC starters) → Junkball Surgeons / Oriole Way flag
   `ROT_ACC` (binding ⇒ `starved`).
4. **Too-thin pool** (~18 players) → `notFieldable` ⇒ `starved` + the "too thin to field" prompt.
5. **Determinism** — two calls on the same inputs are `JSON.stringify`-equal.
6. **Binding vs flavor** — a FLD-only shortfall classifies `thin` (flavor), an equal POW shortfall classifies
   `starved` (binding).

## Out of scope (later optimizer steps)
Draft-guide pick recommendations, in-season scout (call-up/trade/lineup), the fielding-corrected true-value
(`effectiveRatings` edit — step 2), and the two manager-lane contract functions (step 3). This step is the
pre-draft pool gate only; it consumes the locked pool and the canonical archetype set, nothing else.
