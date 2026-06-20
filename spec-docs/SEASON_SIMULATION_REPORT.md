# Season Simulation Report

Generated: 2026-06-19

## L-SIM-H2 Summary

| Leg | Seed | Games Simulated | Total Scheduled Games | Stopped Early | Final Digest |
| --- | --- | ---: | ---: | --- | --- |
| Baseline | lsim-h2-baseline | 60 | 60 | false | 8405506:12b7e4df |
| Determinism A | lsim-h2-baseline-determinism | 60 | 60 | n/a | 8402147:09d18832 |
| Determinism B | lsim-h2-baseline-determinism | 60 | 60 | n/a | 8402147:09d18832 |

Determinism same-seed byte-identical end-state: **PASS**

Exact baseline games simulated: **60**

Checkpoint files: /Users/johnkruse/Projects/kbl-tracker/test-utils/lsim/results/lsim-h2-baseline-checkpoint-010.json, /Users/johnkruse/Projects/kbl-tracker/test-utils/lsim/results/lsim-h2-baseline-checkpoint-020.json, /Users/johnkruse/Projects/kbl-tracker/test-utils/lsim/results/lsim-h2-baseline-checkpoint-030.json, /Users/johnkruse/Projects/kbl-tracker/test-utils/lsim/results/lsim-h2-baseline-checkpoint-040.json, /Users/johnkruse/Projects/kbl-tracker/test-utils/lsim/results/lsim-h2-baseline-checkpoint-050.json, /Users/johnkruse/Projects/kbl-tracker/test-utils/lsim/results/lsim-h2-baseline-checkpoint-060.json

## Soul-Layer Invariants

| Invariant | Tag | Pass Count | Fail Count |
| --- | --- | ---: | ---: |
| soul.albatross-2x-min-salary-overpaid-gate | CRITICAL | 60 | 0 |
| soul.all-star-sixty-percent-lock | CRITICAL | 60 | 0 |
| soul.channel-separation-double-count-guards | CRITICAL | 60 | 0 |
| soul.checkpoint-cadence-exactly-five | CRITICAL | 60 | 0 |
| soul.designation-six-slots-single-holder | CRITICAL | 60 | 0 |
| soul.emission-snub-signal | INVESTIGATE | 59 | 1 |
| soul.fame-components-finite | CRITICAL | 60 | 0 |
| soul.fame-heat-fickle | INVESTIGATE | 60 | 0 |
| soul.fame-reach-monotonic | CRITICAL | 60 | 0 |
| soul.fame-war-legitimacy-floor | INVESTIGATE | 27 | 33 |
| soul.flashpoint-compounding-clamped | CRITICAL | 60 | 0 |
| soul.l10-per-game-cadence | INVESTIGATE | 60 | 0 |
| soul.l11-backstop-under-25-plus-roll | CRITICAL | 60 | 0 |
| soul.l12-race-no-nan-resolve-tier | CRITICAL | 60 | 0 |
| soul.morale-bounds | CRITICAL | 60 | 0 |
| soul.per-write-idempotency | CRITICAL | 60 | 0 |
| soul.persistence-backup-migration-proof | CRITICAL | 60 | 0 |
| soul.ratings-overlay-validity | CRITICAL | 60 | 0 |
| soul.reach-floor-ratchet | CRITICAL | 60 | 0 |
| soul.trait-two-slot-no-offset-hysteresis | CRITICAL | 60 | 0 |
| stats.batting-row-arithmetic | CRITICAL | 60 | 0 |
| stats.completed-games-count | CRITICAL | 60 | 0 |
| stats.derived-rate-ranges | CRITICAL | 60 | 0 |
| stats.fielding-row-arithmetic | CRITICAL | 60 | 0 |
| stats.last-game-applied-to-season-totals | CRITICAL | 60 | 0 |
| stats.league-runs-scored-equal-allowed | CRITICAL | 60 | 0 |
| stats.league-wins-equal-losses | CRITICAL | 60 | 0 |
| stats.no-nan-or-infinity | CRITICAL | 60 | 0 |
| stats.pitching-row-arithmetic | CRITICAL | 60 | 0 |
| stats.standings-match-completed-games | CRITICAL | 60 | 0 |
| stats.team-game-conservation | CRITICAL | 60 | 0 |
| stats.war-fields-finite | CRITICAL | 60 | 0 |

## Gaps / Deferred

- §5.3 soul.season-end-tv-freeze-awards-off-frozen-artifact: Runner does not call a production season-finalize path in H2; finalization/awards artifact checks are deferred to the step-4 matrix.
- §5.4 soul.real-export-migration-survival: H2 validates sandbox backup/restore round-trip through the real API; no real user export is touched under the sandbox-only contract.
- §5.6 soul.tv-fixed-baseline-non-drift-across-seasons: H2 baseline is one season; multi-season legs are delegated to Opus step 4.
- §5 / §H soul.l13-relationship-invariants: L13 relationship layer is explicitly not built; skipped and flagged per grounding §H.

## Section 9 Distributions

```json
{
  "fameTierDistribution": {
    "IMMORTAL_LEGEND": 6,
    "GLOBAL_SUPERSTAR": 5,
    "NATIONAL_ICON": 4,
    "REGIONAL_STAR": 0,
    "LOCAL_HERO": 50,
    "UNKNOWN": 0,
    "POLARIZING": 1,
    "NOTORIOUS": 0,
    "DESPISED": 0
  },
  "traitGrantLossCounts": {
    "gain": 1677,
    "lose": 0,
    "byTrait": {
      "Big Hack": {
        "gain": 57,
        "lose": 0
      },
      "Bunter": {
        "gain": 180,
        "lose": 0
      },
      "Cannon Arm": {
        "gain": 136,
        "lose": 0
      },
      "Durable": {
        "gain": 247,
        "lose": 0
      },
      "Easy Target": {
        "gain": 74,
        "lose": 0
      },
      "Little Hack": {
        "gain": 69,
        "lose": 0
      },
      "Mind Gamer": {
        "gain": 70,
        "lose": 0
      },
      "POW vs LHP": {
        "gain": 39,
        "lose": 0
      },
      "Rally Starter": {
        "gain": 46,
        "lose": 0
      },
      "Sprinter": {
        "gain": 147,
        "lose": 0
      },
      "Tough Out": {
        "gain": 83,
        "lose": 0
      },
      "Injury Prone": {
        "gain": 40,
        "lose": 0
      },
      "Noodle Arm": {
        "gain": 164,
        "lose": 0
      },
      "Slow Poke": {
        "gain": 33,
        "lose": 0
      },
      "Whiffer": {
        "gain": 46,
        "lose": 0
      },
      "Choker": {
        "gain": 23,
        "lose": 0
      },
      "CON vs LHP": {
        "gain": 61,
        "lose": 0
      },
      "Clutch": {
        "gain": 36,
        "lose": 0
      },
      "Butter Fingers": {
        "gain": 13,
        "lose": 0
      },
      "Composed": {
        "gain": 13,
        "lose": 0
      },
      "Crossed Up": {
        "gain": 30,
        "lose": 0
      },
      "Gets Ahead": {
        "gain": 13,
        "lose": 0
      },
      "K Collector": {
        "gain": 16,
        "lose": 0
      },
      "Specialist": {
        "gain": 10,
        "lose": 0
      },
      "Reverse Splits": {
        "gain": 11,
        "lose": 0
      },
      "BB Prone": {
        "gain": 9,
        "lose": 0
      },
      "Falls Behind": {
        "gain": 9,
        "lose": 0
      },
      "K Neglector": {
        "gain": 2,
        "lose": 0
      }
    }
  },
  "awardMargins": [],
  "randomEventFrequencyByFamily": {
    "cosmetic": 19,
    "performance": 34,
    "wildcard": 6,
    "roster": 22,
    "role": 19,
    "pitching": 10,
    "trait": 17,
    "team": 1
  },
  "moraleRanges": {
    "player": {
      "min": 42,
      "max": 58,
      "count": 21
    },
    "teamFan": {
      "min": 48,
      "max": 54,
      "count": 6
    },
    "autoBackstopFirings": 0,
    "autoBackstopFiringRate": 0
  },
  "flashpointTaxMagnitudes": {
    "count": 2,
    "minLastGameTax": -1.3,
    "maxLastGameTax": -1.3,
    "totalAccumulatedFanMoraleTax": -30.6,
    "byKind": {
      "albatross": {
        "count": 2,
        "accumulatedFanMoraleTax": -30.6
      }
    }
  }
}
```

## Findings

- INVESTIGATE soul.fame-war-legitimacy-floor at game 20
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-06-mlb-01-C
- INVESTIGATE soul.fame-war-legitimacy-floor at game 21
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-06-mlb-01-C
- INVESTIGATE soul.fame-war-legitimacy-floor at game 22
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-06-mlb-01-C
- INVESTIGATE soul.fame-war-legitimacy-floor at game 23
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-06-mlb-01-C
- INVESTIGATE soul.fame-war-legitimacy-floor at game 24
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-06-mlb-01-C
- INVESTIGATE soul.fame-war-legitimacy-floor at game 25
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-06-mlb-01-C
- INVESTIGATE soul.fame-war-legitimacy-floor at game 26
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-06-mlb-01-C
- INVESTIGATE soul.fame-war-legitimacy-floor at game 27
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-06-mlb-01-C
- INVESTIGATE soul.fame-war-legitimacy-floor at game 28
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-06-mlb-01-C
- INVESTIGATE soul.fame-war-legitimacy-floor at game 29
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-06-mlb-01-C,lsim-team-06-mlb-14-SP
- INVESTIGATE soul.fame-war-legitimacy-floor at game 32
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-04-mlb-01-C
- INVESTIGATE soul.fame-war-legitimacy-floor at game 34
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-06-mlb-01-C
- INVESTIGATE soul.fame-war-legitimacy-floor at game 38
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-06-mlb-01-C
- INVESTIGATE soul.fame-war-legitimacy-floor at game 40
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-05-mlb-01-C
- INVESTIGATE soul.fame-war-legitimacy-floor at game 41
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-06-mlb-01-C
- INVESTIGATE soul.fame-war-legitimacy-floor at game 43
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-06-mlb-01-C
- INVESTIGATE soul.fame-war-legitimacy-floor at game 44
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-05-mlb-01-C
- INVESTIGATE soul.fame-war-legitimacy-floor at game 45
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-06-mlb-01-C
- INVESTIGATE soul.fame-war-legitimacy-floor at game 46
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-06-mlb-01-C
- INVESTIGATE soul.fame-war-legitimacy-floor at game 47
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-06-mlb-01-C
- INVESTIGATE soul.fame-war-legitimacy-floor at game 48
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-06-mlb-01-C
- INVESTIGATE soul.fame-war-legitimacy-floor at game 49
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-06-mlb-01-C
- INVESTIGATE soul.fame-war-legitimacy-floor at game 50
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-05-mlb-01-C,lsim-team-06-mlb-14-SP
- INVESTIGATE soul.fame-war-legitimacy-floor at game 51
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-06-mlb-01-C,lsim-team-06-mlb-14-SP
- INVESTIGATE soul.fame-war-legitimacy-floor at game 52
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-06-mlb-01-C,lsim-team-06-mlb-14-SP
- INVESTIGATE soul.fame-war-legitimacy-floor at game 53
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-06-mlb-01-C,lsim-team-06-mlb-14-SP
- INVESTIGATE soul.fame-war-legitimacy-floor at game 54
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-05-mlb-01-C,lsim-team-06-mlb-14-SP
- INVESTIGATE soul.fame-war-legitimacy-floor at game 55
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-06-mlb-01-C,lsim-team-06-mlb-14-SP
- INVESTIGATE soul.fame-war-legitimacy-floor at game 56
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-06-mlb-01-C,lsim-team-06-mlb-14-SP
- INVESTIGATE soul.fame-war-legitimacy-floor at game 57
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-05-mlb-01-C,lsim-team-06-mlb-14-SP
- INVESTIGATE soul.fame-war-legitimacy-floor at game 58
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-06-mlb-01-C,lsim-team-06-mlb-14-SP
- INVESTIGATE soul.fame-war-legitimacy-floor at game 59
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-05-mlb-01-C,lsim-team-06-mlb-14-SP
- INVESTIGATE soul.fame-war-legitimacy-floor at game 60
  - classification: HALT - JK FIX DECISION
  - detail: offenders=lsim-team-04-mlb-01-C
- INVESTIGATE soul.emission-snub-signal at game 60
  - classification: HALT - JK FIX DECISION
  - detail: seasonNewsItems=0; hasSnubText=false

## Notes

- The runner drives real `processCompletedGame` with all Phase-2 flags forced on.
- The baseline sandbox is direct, deterministic, 6 teams, 20 games per team, 60 scheduled games.
- The full edge-league and multi-season matrix remains assigned to the Opus step-4 audit.

---

## Opus Step-4 Audit (2026-06-19; builder = Codex, auditor = Opus 4.8 — builder ≠ auditor)

**Verdict: H2 VERIFIED — with 2 auditor-fixed invariant bugs + surfaced findings.** Independent verification:
`npm run build` exit 0; the **falsification audit** (`falsification.ts`, run via `falsification.config.ts`) = **22/22**
— every one of the 20 §5 soul invariants passes a neutral baseline AND trips RED on a targeted known-bad input (JK
directive 2026-06-19); an **independent scaled reproduction** (`smoke.scenario.ts`, `gamesPerTeam=8` → 24 games, flags-ON,
full invariants + replay-idempotency + persistence) runs green.

### Bugs the independent reproduction caught (the single 60-game leg missed both)
1. **`soul.all-star-sixty-percent-lock` — INVARIANT BUG, FIXED.** Production locks at `Math.round(totalGames × 0.6)`
   (`franchiseAllStarLock.ts:18`); the invariant used `Math.ceil`. At 60 games `60×0.6=36` is an exact integer so they
   agreed (Codex's leg passed); at 24 games `24×0.6=14.4` → prod 14, ceil 15 → 10 false reds. The **pipeline is correct**;
   the invariant was wrong. Fixed to `Math.round(... × ALL_STAR_LOCK_FRACTION)`; reproduction now 24/24 green.
2. **`soul.l12-race-no-nan-resolve-tier` — too strict for sparse seasons, SURFACED (JK ruling).** Went RED only because a
   merit category had ZERO eligible candidates at 24 games (status=`computed`, no NaN — race math is sound). That is the
   spec's flagged **§16 sparse-signal** stress, not corruption. Not unilaterally changed; the reproduction excludes it
   `KNOWN_SURFACED_PENDING_JK`. **JK question: should an empty merit category at season-end be a CRITICAL failure, or
   accepted as valid sparsity for short/edge leagues?**

### Other audit findings
- **Suite-pollution, FIXED (mechanical):** H2's `seasonRunner.test.ts` was auto-discovered by the default suite (`npm test`
  would pull a ~30-min, all-flags-ON 60-game season + global flag mutation into the characterized suite). Renamed →
  `seasonRunner.scenario.ts` (on-demand via `season.config.ts`), matching the `franchise-proof-of-life.ts` pattern;
  `vitest list` confirmed clean.
- **`soul.reach-floor-ratchet` is a WEAK invariant (H3):** it only checks `reachFloor < 0`, but reachFloor is a structural
  0–5 ratchet that never goes negative → vacuously green on real data. It does NOT verify the §5.3 honor reach-floor
  ratchet it is named for (whole-team bump, starters>reserves, `allStarSelections` increment). Strengthen in H3.

### §9 distribution signals surfaced for the §16 tuning pass (REPORT only — never tuned)
- **Traits: grants accrue, losses are 0 (60-game: 1677/0; 24-game: 342/0).** The 2-slot/no-offset/hysteresis cap holds, but
  traits never drop. Gain-easy/lose-never asymmetry or always-up synthetic data. **JK/§16 signal.**
- Fame **top-heavy** (60-game: 15 of 66 records in the top-3 tiers, 6 IMMORTAL_LEGEND). Possibly degenerate.
- Morale **inert** (player ~42–58 / 67, fan ~48–60); **0 auto-backstop firings** (morale never reached <25).
- Flashpoint working (Albatross tax accrues, clamped to ≥ −3.0).

### HALT-line findings surfaced (not fixed — JK decision)
- `fame-war-legitimacy-floor` (INVESTIGATE; 60-game 33 reds / 24-game 5 reds): a few players hold NATIONAL_ICON+ fame below
  the 25th WAR percentile — likely amplified by the synthetic generator handing a few players large WPA/fame on modest WAR.
- `emission-snub-signal` (INVESTIGATE, season-end): no snub/news emitted at finalize — partly the deferred §5.3 (the runner
  does not call a production season-finalize).

### Deferred → H3
§5.3 season-finalize checks (TV freeze / awards-off-frozen-artifact / emission-snub at real finalize); §5.6 multi-season +
TV fixed-baseline non-drift; real-export migration (read-only against an actual save); L13 relationship invariants; the
reach-floor-ratchet strengthening; the full §6 edge-league + multi-season run matrix (the 60-game leg is ~30 min — the
matrix is hours; scope/parallelize accordingly).

---

## DISAMBIGUATION NOTE (2026-06-19; read-only investigation, Opus 4.8, high reasoning effort)

> Read-only under AUTH-4. No code/spec/harness changed. Resolves the two HALT-line §9 signals:
> `soul.fame-war-legitimacy-floor` (33 reds) and traits `1677 gain / 0 lose`. All fixes are flagged for JK — none applied.

### Q1 — Does a WAR legitimacy floor exist, and does the invariant match it?

**VERDICT: (a) — the invariant tests a NON-REQUIREMENT (and arguably an ANTI-requirement).** A WAR-legitimacy
*concept* is ratified in the spec, but it is an **upward soft gravity**, not the **downward hard tier-cap** the invariant
implements. The spec *explicitly blesses* the exact archetype the invariant reds on. Not (b)/(c): there is **no** hard
floor — narrow or broad — that caps fame tiers on WAR anywhere in spec or engine.

**Spec evidence (ratified, §20 "LOCKED — designed this session"):**
- §20.1, [FRANCHISE_V1_LIVING_SEASON_SPEC.md:353](spec-docs/FRANCHISE_V1_LIVING_SEASON_SPEC.md:353), verbatim:
  *"Floor — legitimacy (WAR). A slow-moving gravity that pulls fame toward what a player is actually worth (raw value vs
  peers). Prevents pure-clutch flukes from being the whole story and slowly accrues a floor for the quietly excellent.
  **WAR is a legitimacy floor only — not a direct fame contributor.**"* → it *raises the quietly-excellent*; it is a
  slow gravity, not a hard ceiling on the clutch.
- §20.2 fame-vs-merit matrix, [line 365](spec-docs/FRANCHISE_V1_LIVING_SEASON_SPEC.md:365), verbatim cell:
  High fame × Low merit = *"Darling / overrated (clutch flukes — **makes the All-Star team**)."* The high-fame/low-WAR
  player is a **designed, blessed, emergent archetype**, not a defect.
- FAME-3, [line 447](spec-docs/FRANCHISE_V1_LIVING_SEASON_SPEC.md:447): *"WAR is a legitimacy floor only, not a direct
  contributor."* Status = **ratified** (Fame Decision Log FAME-1…14, §20 supersedes the §17.1 stub).

**Engine behavior (production):**
- The spec's floor is implemented as a **soft gravity**, not a cap: `applyWarLegitimacyGravity()`
  [src/engines/fameModel.ts:161-174](src/engines/fameModel.ts:161) nudges heat `+ (target − heat) × strength` with
  `warGravity.strength = 0.2` ([:110-118](src/engines/fameModel.ts:110)). It can only *pull gently*, never *cap*.
- **That gravity is ORPHANED — not wired into the sim.** `grep applyWarLegitimacyGravity src/ test-utils/` returns
  **only `fameModel.test.ts`**. It is never called by `processCompletedGame`, the L6 fame layer, or the runner → the
  spec's actual floor mechanism **is not even executing** in H2.
- Tier resolution takes **NO WAR input at all**: `resolveFameTier(heat, reachFloor)`
  [fameModel.ts:205-225](src/engines/fameModel.ts:205) is a pure function of heat + reach floor. There is no WAR
  floor/cap on tiers anywhere in the engine.
- The engine *codifies* the Darling: `classifyFameVsMerit()` [fameModel.ts:240-268](src/engines/fameModel.ts:240)
  returns `'darling'` for low merit (`meritScore ≤ 2`) at `fameRank ≥ REGIONAL_STAR (2)` — i.e. a low-WAR
  NATIONAL_ICON is a *canonical, named* output of production code.

**The invariant:** [soul.ts:142-159](test-utils/lsim/invariants/soul.ts:142) reds when
`FAME_TIER_RANK[tier] ≥ NATIONAL_ICON (3)` **AND** `warPercentile < 0.25`. That is a **hard upper cap keyed on WAR
percentile** — the inverse of the spec's upward gravity, and a direct contradiction of the §20.2 Darling cell. It is
**stricter than, and opposite to, the design.**

**Offender — legit darling or degenerate?** **Legit darling (by the spec's own matrix).** Exact heat/WAR could not be
read (checkpoints persist only `rowCounts` + `findings`, not fame/value rows; and the gravity is unwired so heat carries
no WAR signal). Structural proof from the generator: the recurring offender is always a **catcher** (`*-mlb-01-C` on
teams 04/05/06) and a starting pitcher (`*-14-SP`). The home-side catcher is `POSITION_ORDER` index 0
([syntheticGame.ts:23](test-utils/lsim/syntheticGame.ts:23)) and is handed **consistently positive `battingWpa`** every
home game (`magnitude = 0.04 + …`, sign `+1`, [syntheticGame.ts:222-239](test-utils/lsim/syntheticGame.ts:222)). That
accumulates positive heat → NATIONAL_ICON while WAR percentile (rating-derived) stays low. **High WPA + low WAR =
Darling = NATIONAL_ICON (not IMMORTAL).** Exactly the blessed archetype, not a replacement/negative-WAR player parked at
the apex.

**Generator realism call: PARTIAL ARTIFACT (over-produces darlings).** Synthetic WPA is **hash-derived and
talent-decoupled** — it does **not** flow from the same ratings that drive WAR/trueValue (`magnitude` is a function of
`hash + gameNumber + index`, not of the player's stats). Real games would produce a natural WPA↔WAR correlation; here it
is absent, so the darling rate is **inflated** vs realistic correlated data. But the archetype itself is
spec-legitimate, so even realistic data would occasionally trip a *cap-style* invariant.

**Q1 recommended fix CLASS — flagged for JK (do NOT apply):**
1. **Primary — relax/recalibrate the INVARIANT (HARNESS).** It currently asserts a cap the design forbids. Options:
   (i) narrow the red to the **apex only** (IMMORTAL_LEGEND / GLOBAL_SUPERSTAR) where a true bust would be indefensible,
   leaving NATIONAL_ICON darlings legal; (ii) demote to a **distribution/INVESTIGATE** signal (count of darlings) rather
   than a per-player red; or (iii) **retire it** as written and rebuild it to test the spec's *actual* floor — that
   low-WPA **high**-WAR players accrue a rising floor — which is the real §20.1 requirement.
2. **Secondary — BEHAVIOR + JK.** If JK wants the legitimacy floor to actually bite, the orphaned
   `applyWarLegitimacyGravity` must be **wired** into the fame layer. Engine change → JK ruling (and it's a *gravity*,
   so it still would not hard-cap a sustained darling).
3. **Tertiary — GENERATOR (HARNESS).** Seed synthetic WPA from the same talent that drives WAR so the WPA/WAR split is
   realistic; reduces artifact darlings.
   *No spec correction needed — the spec is internally consistent; the invariant, not the gospel, is the outlier.*

### Q2 — Traits: 1,677 gains, 0 losses. Drop path absent or untriggered?

**VERDICT: WIRED-BUT-UNTRIGGERED — not a code gap.** The re-evaluate-to-drop path exists, is reachable, and is
evaluated on every checkpoint sweep; the always-up synthetic data simply never pushes a held trait's probability to the
lose hysteresis.

**Drop logic (wired + reachable):**
- Lose branch: [traitAcquisition.ts:290-292](src/engines/traitAcquisition.ts:290) —
  `if (isHeld && proposalBase.probability <= tuning.loseThreshold) rawProposals.push({…, valence: 'lose' })`, with
  `loseThreshold: 0.35` ([:91-92](src/engines/traitAcquisition.ts:91)) — the exact "P ≤ 0.35 hysteresis" drop.
- **Held traits are re-scored every sweep**, proving reachability: held names are iterated and their probability stored
  ([:281-283](src/engines/traitAcquisition.ts:281)); lose proposals are reconciled and emitted
  ([:298-309](src/engines/traitAcquisition.ts:298)). Because **gains fire (1677)**, the function runs each checkpoint,
  so the lose branch is *evaluated* each checkpoint too — it just never satisfies `≤ 0.35`.

**Why 0 losses (data, not code):** held traits stay above the dead band because the synthetic signal only trends up.
The reality scorer gates on a min-sample valve and a `realityPercentile`
([traitRealityScorer.ts:61-65](src/engines/traitRealityScorer.ts:61),
[:262 sufficiency gate](src/engines/traitAcquisition.ts:262)); with monotonically positive synthetic performance, a
held trait's `realityPercentile` stays high → probability stays `> 0.35` (lands in `'dead_band'`,
[:295](src/engines/traitAcquisition.ts:295)), or the held signal is insufficient and is skipped entirely — never a
`'lose'`. The lose path is correct and complete; the **sim never supplies a downswing to exercise it.**

**Q2 recommended fix CLASS — flagged for JK (do NOT apply):**
- **Primary — improve the GENERATOR (HARNESS).** Inject downward performance swings / regression so a held trait's
  reality probability can fall ≤ 0.35 and actually drive the drop path. Until then the lose branch is sim-untested
  (a coverage gap in the harness, not a defect in the engine).
- **No ENGINE change** (drop path is wired and correct). **No SPEC change.**

