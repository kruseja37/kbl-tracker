# T8 — Mode 1 League Construction Suite — SCOPE MAP

**Created:** 2026-06-14 (Captain synthesis from a 6-agent decorrelated mapping fan-out)
**Status:** RATIFIED. 4 JK rulings recorded (DECISIONS_LOG 2026-06-14). T8a contract
drafted (PROMPT_CONTRACTS.md) → Codex build in progress.
**Authoritative spec:** `IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md` **§5** (League Tier
System), **§6** (Team Identity System / D11), **§7** (Mode 1 — League Construction
Suite), **§11** (engine boundary), **§12** (constants registry), **§13** (build seq).
Cross-ref gospel `MODE_1_LEAGUE_BUILDER_FINAL.md` §8 (Draft), §11 (Wizard), §13 (Data).
> "§6 + §7" in CURRENT_STATE = these IV-spec sections (NOT the gospel's §6/§7).

**T8 definition (IV §13 line ~639):** "Mode 1 suite: pool registration, snake draft,
pick chart + trade validator, identity composition UI, scout-obscured farm pricing,
luxuryTax + balanceMode wiring." ROUTE Codex 5.5 | very high → Opus audit
(persistence: pool/league state — audit NON-NEGOTIABLE).

All MISSING/WIRED/PARTIAL verdicts below are grep+read-verified by the mapping agents
(file:line cited), not assumed. No build/test was run (mapping task).

---

## 1. THE CORE GAP (what T8 actually builds)

**`src/engines/leagueConstruction.ts` does not exist.** All five §11 engine functions
are MISSING — verified by `ls` (no file) + zero defs across `src/`:
`registerPool` · `derivePickValueChart` · `validateTrade` · `composeIdentity` · `luxuryTax`.
This pure-function engine module IS the heart of T8. Every UI/persistence piece consumes it.

**The algorithms already exist as a Python oracle.** `scripts/analyze-pool.py:1149-1264`
implements `compose_identity`, `band_scores`, `identity_cap_shift`, and `roster_tax` —
the spec-faithful reference used by the T3 EV-flatness acceptance harness. T8 PORTS these
to TS **decision-identical to the Python** so the existing harness stays a live cross-check.

---

## 2. FOUNDATION — DONE / REUSE (do NOT rebuild)

| Asset | File:line | Status | T8 use |
|---|---|---|---|
| Player IV engine (T4) | `src/engines/ivEngine.ts:638` `computeIV(...)→{rawIV,kblIV}` | WIRED | Price every pool player once (`registerPool`); draft-board sort; farm true-IV. Pass `potency='L2'` for all DISPLAY (D15: never reprice on realized potency). |
| Tier/cap/luxury/identity DATA (T3) | `src/data/tierParams.ts:36-201` (`TIER_CAPS`, `LUXURY_CAP_TABLES`, `CAP_MODIFICATION_FRACTIONS` ×42, `FARM_NERF_SCALES`, `TIER_SHIFTS`, `ModStat`) | **ORPHANED** (zero prod consumers; only negative test asserts engines don't import it) | T8 is the FIRST consumer. Read-only. De-orphans T3. |
| No-oracle-leak farm valuation (T7b) | `src/engines/rosterAnalyzer.ts:191,352-357` `recommendRosterMoves` | WIRED | §7.4 farm DISPLAY reuses verbatim: scoutedGrade+scoutConfidence+scoutVisibleSalary only, NEVER true IV/ratings. Ruled in DECISIONS_LOG:463. |
| Scout-accuracy substrate | `src/utils/prospectScoutingDraftEngine.ts:461,473` `scoutAccuracy/scoutProspect`; Box-Muller σ=(100−acc)/22, ±4 cap | WIRED | §7.4 width `w = scoutNoiseBase×(1−scoutAccuracy)` reuses `scoutAccuracy()`. |
| Interactive startup farm draft + persistence | `src/utils/leagueBuilderStartupFarmDraft.ts:1133+`; stores `scoutProfiles`,`startupDraftSessions` | WIRED | Snake-draft state-machine template; repoint pricing to scout-obscured IV. |
| Rookie scale + salary relativity (T5) | `src/engines/salaryCalculator.ts:380` `ROOKIE_SCALE_FACTOR=0.50`, `buildSalaryIvInput`, `calculateIvBaseSalary` | WIRED | Pool relativity pricing; farm rookie pricing (0.50× replaces age factor). |
| Season ledger contract (T7c) | `src/engines/rosterAnalyzer.ts:129,245` `LedgerEntry`,`ledgerCapCharge` | WIRED | T8 produces a salary consistent with this; does NOT rebuild the ledger. |
| Effective ratings (T6) | `src/engines/effectiveRatings.ts` `effectiveRatings`,`potencyTier`,`defensivePlacementRisk` | WIRED | luxuryTax top-N effective-base sums; draft-board potency overlay. |
| Mode1→Mode2 handoff (C-076) | `src/utils/franchiseInitializer.ts:335`; `leagueBuilderFarmScoutingHandoff.ts:100,135` | WIRED | Both paths emit the SAME 22 MLB + 10 farm contract; copy tier/balanceMode/identity at handoff. **No wizard step changes.** |

**Existing Mode-1 UI shell (PARTIAL, non-economic):** `/league-builder` hub + 6 routed
sub-pages (`LeagueBuilder{Leagues,Teams,Players,Rosters,Draft,Rules}`) and the 6-step
`FranchiseSetup.tsx` wizard exist and are wired — but carry **zero** tier/IV/luxury/
balanceMode/identity. `LeagueBuilderDraft` is FARM-only and the "DRAFT" tile is
**mislabeled** "Fantasy snake draft" while routing to the prospect/farm draft. Pool
players priced by OLD `salaryCalculator` (`computeInitialSalary`), NOT `computeIV`. Farm
priced by `prospectSalaryForDraftRound(round)` (draft-slot), the model §7.4 REPLACES.

---

## 3. v1 REQUIREMENTS (consolidated; all grep-backed)

Engine (all MISSING → `leagueConstruction.ts`):
- **R1 registerPool** (§7.2): compute IV once/player, run relativity layer, emit
  `RegisteredPool{leagueId,tier,players[],tierCap,pickValueChart,luxuryCaps,balanceMode}`;
  warn poolSize > totalSlots×poolSurplusMax(1.2).
- **R2 tier select + self-calibrating cap** (§5.2): consume `TIER_CAPS` (J/S/N
  1,205,836 / 1,064,387 / 954,874). T8 CONSUMES, never re-derives.
- **R3 snake draft (Path B)** (§7.3): 22-man, all-user, no AI; full IV-derived salary.
- **R4 empirical pick-value chart** (§7.3): `value(pickN)=E[IV best-available@N | pool
  sorted IV dist]`, Jimmy-Johnson shape, regenerated per league.
- **R5 trade validator** (§7.3): Σ pickValue imbalance > `tradeToleranceBand`(0.15) →
  ADVISORY flag, overridable.
- **R6 identity composition** (§6): 6 bands → `composeIdentity`→{inc[≤2],dec[≤2]} over the
  42-mod vocabulary; `shiftedCap=cap×(1+Σinc−Σdec)`.
- **R7 luxuryTax + balanceMode** (§5.3/§5.4): per-group top-N effective-base vs
  identity-shifted cap; convex penalty; soft cap (never blocks a pick); SP/RP dual
  rotation+bullpen membership; team-level bullpen arsenal tax accounted here (A2 removed it
  from per-player IV). `balanceMode` taxed|advisory|off (default taxed) short-circuits the
  CHARGE only, never the COMPUTATION.
- **R8 draft solvency guardrail + per-team signals** (§7.3 v1.1.1):
  `committed+projectedTaxes+pickCost+pickMarginalTax ≤ budget − slotsRemaining×cheapestFillCost`
  (cheapestFillCost recomputed per pick from live pool); GREEN/YELLOW/RED/BLOCKED, per-team.
- **R9 scout-obscured farm IV** (§7.4/D5): true IV internal; DISPLAY range
  `[trueIV×(1−w),trueIV×(1+w)]`, `w=scoutNoiseBase(0.6)×(1−scoutAccuracy)`, seed-jittered
  midpoint; SNAPS to truth at call-up; pool NERFED (`FARM_NERF_SCALES`). Reuse T7b leak rule.
- **R10 Path A hand-select** (§7.1/D4): existing flow, now IV-priced under the same
  cap/luxury/solvency machinery; same 22+10 output. No wizard changes.
- **R11 RegisteredPool persistence** (§13): pool/league state + per-team identity + draft
  state + farm true-IV/scout seeds. **Audit non-negotiable** (migration safety + key scope).
- **R12 draft-board potency overlay** (§7.3/D15): live realized-tier preview + marginal
  synergy; IV display stays L2-reference forever.
- **R13 EV-flatness check** (§5.3): T3 reported a structural PASS; surface advisory, not
  re-tuned. (Likely a verify, not a build.)
- **R14 league-inflation/balance report** (§7.2): total rostered IV vs tier band ±10%;
  optional one-notch-nerf regeneration of the replacement tail.

DEFERRED (NOT v1-gating; do not build in T8):
- **R15 Auction Draft** (§7.5/D10) → routed as **T11**, v1.5.
- **R16 AI Shill Bidders** (§7.6/D14) → inside auction, v1.5 (hard req: no deterministic floor).
- **R17 Pool Recalibration Tool** (§13) → **T12**, post-v1 (productizes analyze-pool.py).

---

## 4. PERSISTENCE BASELINE + RECOMMENDED TARGET

Four backends today:
- `kbl-tracker` IndexedDB **v15** (`trackerDb.ts:17`) — game/season/career + T7c ledger.
- `kbl-league-builder` IndexedDB **v5** (`leagueBuilderStorage.ts:30`) — **GLOBAL pool DB**
  (MODE_1 §13.1): `leagueTemplates`,`globalTeams`,`globalPlayers`,`teamRosters`,
  `scoutProfiles`,`startupDraftSessions`. **No tier/IV/luxury/identity/balanceMode fields.**
- `kbl-app-meta` IndexedDB **v3** — franchise list/config/active.
- `kbl-leagues` **localStorage** — legacy `LeagueConfig` (parallel to `leagueTemplates`).

**Captain recommended target (proceed-unless-vetoed):** persist `RegisteredPool` /
identity / pickValueChart / balanceMode by **extending `kbl-league-builder` v5→v6**
(new fields on `LeagueTemplate` + as needed a new store), migration-audited. Rationale:
it IS the global pool DB per §13.1; avoids a **5th IndexedDB** (the documented Feb-11
version-conflict hang is the precedent against DB proliferation). This is an
audit-non-negotiable surface — flagged for JK.

---

## 5. §12 CONSTANTS TO ADD (single registry `src/data/rosterEngineConstants.ts`, add-only)

Spec'd in §12 with defaults but ABSENT from the .ts file (verified): `scoutNoiseBase`
(0.6), `tradeToleranceBand` (0.15), `solvencyRedMargin` (0.10), `poolSurplusMax` (1.2),
`evFlatnessTolerance` (0.10), `leagueInflationBand` (0.10), `balanceMode` default
('taxed'), plus the derivation inputs `starBudgetShare` (0.33), `rosterHeadroom` (1.15),
`luxuryCapPercentile` (0.65) currently living only in `tierParams.T3_DERIVATION_INPUTS`.
Two-file split is acceptable: `tierParams.ts` = generated DERIVED DATA (do not hand-edit;
rerun analyze-pool.py); `rosterEngineConstants.ts` = live tunable knobs.

---

## 6. SPEC CONFLICTS (rulings)

1. **Farm pricing:** gospel §8.7 (round-based `prospectSalaryForDraftRound`) **vs** IV §7.4
   (scout-obscured true IV). IV §1.1 changelog: draft-slot pricing is **REPLACED**. → **IV
   wins**; farm DISPLAY/internal value = `computeIV`-based scout-obscured range;
   `prospectSalary.ts` retained only (if at all) as a pre-IV bootstrap. (Build instruction,
   not a JK question.)
2. **Scout magnitudes:** code uses symmetric **±18** (`prospectScoutingDraftEngine.ts:462`);
   spec §8.6 says asymmetric **+15 / −10**. → spec wins; source from a registry constant.
   Minor reconciliation — flag in the contract.

---

## 7. PROPOSED SPLIT (Captain recommendation — PENDING JK)

Engine-first, mirroring the T6→T7 pattern (pure engine before consumers):

- **T8a — League Construction Engine + constants (pure).** Build
  `src/engines/leagueConstruction.ts` (all 5 fns) by porting analyze-pool.py
  decision-identical; add the §12 constants. Exhaustively unit-tested vs the Python oracle +
  `tierParams` data. NO UI, NO new persistence shape. De-orphans `tierParams.ts`. Foundation.
- **T8b — Tier/economy wiring + RegisteredPool persistence + Path A IV re-pricing.**
  tier-select + balanceMode + luxuryTax wired into League Builder; persist RegisteredPool
  (kbl-league-builder v5→6, migration-audited); cut Path A pool pricing to `computeIV`.
- **T8c — Identity Composition UI.** Band input + composed-stack/shifted-cap preview wired
  to T8a `composeIdentity`, persisted per-team. The named "identity composition UI."
- **T8d — Snake Draft (Path B) + pick chart + trade validator + solvency signals + potency
  overlay + farm §7.4 scout-obscured IV.** The big interactive draft surface.

(Alternatives offered to JK: coarser 3-ticket, or a single T8 ticket.)

---

## 8. JK RULINGS (2026-06-14 — RATIFIED, see DECISIONS_LOG)

1. **Split** → **4 tickets, engine-first** (T8a→T8d). ✅
2. **Custom-pool scope** → **stock pool only**; custom-pool derivation deferred to **T12**. ✅
3. **Identity decreases** → **OPTIONAL, maximize customizability.** `composeIdentity` does
   NOT force decreases; T8c UI lets the creator freely edit the inc/dec stack within the
   §6.2 envelope (≤2 inc + ≤2 dec). Luxury tax + tier cap remain the balancers. ✅
4. **Identity band input** → **point-allocation**. ✅

## 9. CAPTAIN DEFAULTS (proceed-unless-vetoed; stated for the record)

- Persistence → extend `kbl-league-builder` v5→v6 (§4).
- Identity composition is **per-team** (§6.3 implies; UI host `LeagueBuilderTeams`).
- `balanceMode` default = **'taxed'** (§12; §15.5 says revisit post-playtest — build taxed).
- Farm pricing → IV wins over §8.7 (§6.1); scout magnitudes → spec +15/−10 via registry (§6.2).
- Pick-value chart → **frozen at registration**, re-derived only on explicit pool change
  (§9 snapshot-versioning).
- Path A → **full cutover** to `computeIV` at T8 (league construction creates fresh pools).
