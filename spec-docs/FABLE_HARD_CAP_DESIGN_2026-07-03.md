# FABLE DESIGN — HARD SALARY CAP (league settings) replaces the pool-relative draft budget

**Date:** 2026-07-03 · **Designer:** Fable 5 · **Builder:** Codex · **Auditor:** Opus
**Ruling:** DECISIONS_LOG.md 2026-07-03 "HARD SALARY CAP in league settings" — supersedes the
2026-06-25 "Option B" pool-relative ruling *for the draft/design team budget only*.
**Status:** DESIGN COMPLETE — Phase 1 ready to contract. NO code in this doc; Codex builds to it.

---

## §0 — Problem, ruling, scope

**The repro (JK, browser):** design-first Draft Setup showed `EST $1,050,537 OF $1,547,961`.
There is no absolute salary-cap setting anywhere; the team budget is
`computePoolTierCap(ivs, tier)` (`src/engines/leagueConstruction.ts:302`) =
`max(maxIV/0.33, meanIV×22) × TIER_SHIFTS[tier].scale` — **pool-relative**. A curated,
talent-rich design-first pool raises `meanIV`, the cap floats up to fit the talent, and
"buildable ✓" is hollow: the budget grew to afford whatever was designed.

**The ruling:** the GM types an absolute dollar ceiling in league settings. The system
**respects** it: the designer and the auction display and enforce *that* number, and the pool
is picked so a legal 22 is buildable under it.

**Scope boundary (explicit):**
- IN: the MLB draft/design team budget — designer verdicts, design-first extraction,
  locked-pool budget, auction budgets (real teams + shills), snake-draft solvency + display,
  pool-feasibility display.
- OUT (unchanged, documented in §2.4): player ratings/IVs (never tier-scaled — JK ruling
  2026-06-26), luxury caps (separate rating-concentration lever), pick-value chart (IV-derived),
  the farm wallet (`computeFarmTierCap`, stays pool-relative in v1 — §6 open item), the
  offline archetype-balance simulator (a calibration harness, not a league flow).
- DJ-04(1) (designer vs auction budget-basis inconsistency) is **subsumed by construction**:
  both read the one settings cap through one resolver (§2.1).

---

## §1 — The settings field

### 1.1 Record shape (persistence)

Add to `LeagueTemplate` (`src/utils/leagueBuilderStorage.ts:105–124`), directly after `tier`:

- `salaryCap?: number` — absolute team draft budget in dollars (same unit as player salaries
  and IV). Integer ≥ 1. **Optional/additive** → the record is schemaless at the record level,
  so **NO DB version bump** (`DB_VERSION` stays 8, `leagueBuilderStorage.ts:45`). Persists
  through the existing create/update league-template paths — no new storage function.

### 1.2 The one resolver (single source of the number)

One exported pure function, defined next to `LeagueTemplate` in
`src/utils/leagueBuilderStorage.ts`:

- `resolveLeagueSalaryCap(league) = league.salaryCap ?? TIER_CAPS[league.tier ?? 'juiced'].tierCap`
- `TIER_CAPS` is the static per-tier reference table (`src/data/tierParams.ts:65–69`):
  juiced **$1,205,836** · standard **$1,064,387** · nerfed **$954,874**.
- **Every UI/flow call site reads the budget through this resolver or through a value the
  resolver stamped** (§2.2). Nothing in the live league flow calls `computePoolTierCap`
  directly anymore.

Rationale for the fallback: the static tier reference is predictable, it is what the tier
dial has always *nominally* meant, and it is within ~0.1% of the old behavior on the stock
440-player pool — so standard leagues feel identical, while curated rich pools stop inflating
the budget (exactly JK's complaint).

### 1.3 The input (UI)

`src/src_figma/app/pages/LeagueBuilderLeagues.tsx`, create/edit league form, a new block
directly **below the "League Tier" dropdown** (~line 509) — same visual kit as the existing
selects:

- **Label:** `SALARY CAP`. Numeric text input, comma-formatted display, stored as an integer.
- **Seeding:** on league create, prefill with `TIER_CAPS[formData.tier].tierCap`. If the user
  changes tier and has **not** hand-edited the cap (track a local dirty flag), re-seed to the
  new tier's reference. If they edited it, keep their number (tier change never silently
  overwrites a typed cap).
- **Helper line (one line, no tutorial):** `TIER REFERENCE: $1,205,836` (live for the selected
  tier). Deeper explanation goes behind the help button per the UI rules — not on-screen.
- **Validation:**
  - HARD block: cap < `22 × LEAGUE_MINIMUM_SALARY` (`src/data/rosterEngineConstants.ts:316`,
    $1,666.49 → floor ≈ **$36,663**) — below this no legal 22 can exist at any prices. Also
    block non-numeric/zero/negative.
  - SOFT advisory (amber helper text, saves fine): cap outside [0.5×, 2×] the tier reference —
    "very tight" / "rarely binding". No modal, no block.
- **Optional-vs-required:** the record field stays optional (migration, §4), but the form
  always shows a seeded number, so every league saved through the form carries an explicit
  `salaryCap`. Edits to an existing league's cap take effect at the **next pool lock / next
  draft session** — never retroactively inside a live session (§4.3).

---

## §2 — One budget: how the hard cap replaces the machinery

### 2.1 Principle

The settings cap **replaces `computePoolTierCap` as the team budget in every live league
flow**. `computePoolTierCap` itself is NOT deleted — it remains (a) the fallback inside
`registerPool` for legacy/capless callers and (b) the calibration frame of the offline
balance simulator. Engines keep taking the budget **as a parameter** (engines must not import
the storage layer); the resolver lives in the utils layer and the number is threaded down.

### 2.2 Call-site switch table (exhaustive — every site that changes)

| # | Site | Today | Becomes |
|---|------|-------|---------|
| 1 | `src/engines/leagueConstruction.ts:312–324` `registerPool` | stamps `tierCap: computePoolTierCap(ivs, tier)` (:318) | `PoolConfig` gains `salaryCap?: number`; stamp `tierCap: cfg.salaryCap ?? computePoolTierCap(ivs, tier)`. Keep the `RegisteredPool.tierCap` field NAME (persisted records + wide consumer surface; re-document it as "the team draft budget — the settings hard cap when provided"). |
| 2 | `src/utils/leagueBuilderPoolRegistration.ts:109–119` `registerLeaguePoolForLeague` | no cap passed | pass `salaryCap: resolveLeagueSalaryCap(league)` (it already loads the template at :85). Because `lockLeaguePool` re-registers (`src/utils/leagueBuilderPoolBuilder.ts:240–244`), every lock stamps the hard cap onto the frozen pool. |
| 3 | `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx:609–611` `tierBudget` useMemo | `computePoolTierCap(designer-pool IVs, tier)` | `resolveLeagueSalaryCap(league)` — no longer a function of pool IVs; drop the `computePoolTierCap` import (:48). Automatically fixes its four consumers: designer status tones (:623), design verdicts (:635), extraction `budgetPerTeam` (:769), `RosterDesigner budget` prop (:1447) → the `EST X OF Y` line (`src/src_figma/app/components/leagueBuilder/RosterDesigner.tsx:238–251`) shows JK's number as Y. |
| 4 | `src/engines/poolFeasibility.ts:163` `analyzePoolFeasibility` | `budget = computePoolTierCap(lockedPool IVs, tier)` | add `budget?: number` (options or 5th param); use it when provided, keep the pool-relative fallback. Caller `src/utils/leagueBuilderPoolBuilder.ts:385` passes the resolved cap. (Verdicts are composition-driven — budget only feeds the `solvent` diagnostic — but the surfaced number must be the real one.) |
| 5 | `src/engines/draftPoolExtractor.ts:274` `sourceBudget` | `computePoolTierCap(universe IVs, tier)` — budgets the per-archetype identity seed builds | add `budgetPerTeam?: number` to its options; `sourceBudget = options.budgetPerTeam ?? computePoolTierCap(...)`. |
| 6 | `src/engines/poolFromDemand.ts:199–201` (`extractPoolFromDemand` → `extractDraftPool`) | forwards only `teams` | forward `budgetPerTeam: options.budgetPerTeam` so the floors extraction seeds within the SAME budget the designs are verified against (:215–219 already uses it for verdicts). |
| 7 | `src/engines/draftabilityRanker.ts:131,153` | `budgetOverride` option already exists; defaults pool-relative | no signature change; any live-league caller must pass the resolved cap (today its live consumer is `draftPoolExtractor`, covered by #5 — `LeagueBuilderAuctionDraft.tsx:81` imports only `historicalToSimArchetype`, no budget). |

### 2.3 Sites that inherit automatically (verify, don't edit)

Once #1/#2 stamp the cap onto `RegisteredPool.tierCap`, these read the right number with
zero diff — the auditor should verify, not modify:

- Auction real-team budgets: `src/utils/leagueBuilderAuctionPipeline.ts:114`
  (`budgetRemaining = max(0, pool.tierCap − committedSalaries)`).
- Auction shill budgets: `src/src_figma/app/hooks/useAuctionDraft.ts:460`
  (`budget: pool.tierCap`) — locked pool is reused as-is at :444–447.
- Snake draft solvency + display: `src/src_figma/app/pages/LeagueBuilderSnakeDraft.tsx:145`
  (solvency `tierCap`), :352, :576 (`Cap $X` display).
- Solvency engine: `assessSolvency` (`src/engines/leagueConstruction.ts:406`) — takes
  `tierCap` as input; untouched.

⚠ Exception for already-locked pools carrying a stale pool-relative stamp: §4.2.

### 2.4 What tier still means (and one prompt-vs-canon correction)

**Canon check:** the build prompt for this task assumed "tier still scales player ratings
(`TIER_RATING_SCALES`)". That is **backwards vs JK's 2026-06-26 ruling** ("Tier scales BUDGET
ONLY… players keep their stock ratings/IV; `TIER_RATING_SCALES` stays dormant/unused"). This
design keeps the 2026-06-26 canon: **ratings and IVs never change with tier.** Reactivating
rating-scaling would be a separate JK fork (§6), not part of this change.

After the hard cap, tier's live roles are:
1. **Seeds the default cap** — the settings input prefill + the resolver fallback
   (`TIER_CAPS[tier].tierCap`). Tier remains the one-tap economy preset; the cap field is the
   override.
2. **Keys the luxury-cap tables** — `LUXURY_CAP_TABLES[tier]` stamped at `registerPool`
   (`leagueConstruction.ts:319`); `luxuryTax` and the whole rating-concentration lever are
   untouched by this change.
3. **Farm nerf + prospect generation scaling** (`FARM_NERF_SCALES`, generator paths) —
   untouched.

**Pick-value chart:** `derivePickValueChart` (`leagueConstruction.ts:284–288, :320`) is
IV-derived, not budget-derived — untouched, keeps working.

**Explicitly NOT switched (intentional):**
- `src/engines/archetypeBalanceSimulator.ts:333` — offline archetype-balance tuning harness;
  pool-relative IS its calibration frame. Add a one-line comment marking it intentionally
  pool-relative so a future sweep doesn't "fix" it.
- The farm wallet (`computeFarmTierCap`; `src/utils/farmAuctionWallet.ts`,
  `useFarmAuctionDraft.ts`) — the ruling covers the MLB draft/design budget. §6 open item.

---

## §3 — Cap-aware extraction (the hard part) + phasing

### 3.0 What "cap-aware" can and cannot promise

Two different guarantees hide in "a legal 22 is buildable under the cap":

- **G1 — league solvency (poolwide):** the pool contains **N disjoint legal 22s, each with
  salary sum ≤ cap** (N = number of real teams). This is exactly the auction-completability
  condition: the end-checkpoint force-fills every real team to 22 within `budgetRemaining`.
  This one the extractor CAN and MUST guarantee. (Luxury taxes are deliberately outside the
  guarantee — they are advisory/eviction pressure per balance mode, not part of the seat-fill
  arithmetic.)
- **G2 — design serviceability (per design):** each human 22-slot design fits under the cap.
  This CANNOT be guaranteed by any pool — a GM who designs 22 aces is over any honest cap.
  G2 stays a **verdict**, not a promise: the pool must merely never be the *reason* (the
  cheapest matching candidate for every ask must be reserved), and the OVER BUDGET verdict
  (already built — `rosterDesignFeasibility.ts:439–459`, `RosterDesigner.tsx:243–247`) tells
  the truth against JK's number.

### 3.1 RECOMMENDED PHASING

**Phase 1 (pre-playthrough — small, unblocks JK's browser read):** settings field + resolver
+ the §2.2 switch + honest verdicts + a display-only solvency banner. No extraction-selection
changes. Verdicts flip honestly to OVER BUDGET where designs exceed the cap.

**Phase 2 (after JK's playthrough):** cap-aware pool selection — the G1 constructive
guarantee + price-vs-bodies shortfall naming.

Why this split: Phase 1 is a plumbing change over audited seams (one stamp, one resolver,
seven call sites) and delivers 100% of what JK sees in the browser — his number, everywhere,
enforced. Phase 2 touches the extractor's selection loop (repair rounds, determinism
invariants C1B-4) and needs its own adversarial audit; rushing it into the pre-playthrough
window risks the pool pipeline for a guarantee that today's rich universes rarely violate
(rich universes fail on *design cost*, which Phase 1 already reports honestly — not on
*cheapest-fill* cost).

### 3.2 Phase 1 — precise definition

1. §1 field + resolver + UI.
2. §2.2 switch table, all seven sites.
3. §4 migration rules.
4. **Solvency banner (display-only guardrail):** in Draft Setup, after extraction/pool
   assembly, compute `cheapestLegal22Cost(pool)` = `evaluateRosterDesign(no-preference 22-slot
   design, pool, ∞).totalCost` — the evaluator is already cheapest-first
   (`rosterDesignFeasibility.ts:207`), so an all-no-ask design IS the cheapest legal 22
   estimate. If it exceeds the cap, show one plain line: *"This pool can't seat a legal
   roster under your $X cap — raise the cap or add cheaper players."* No block (Phase 1 is
   honest, not preventive). NOTE: single-team estimate, not the N-disjoint G1 — named as
   an estimate in the banner copy? No — keep copy plain; the doc records the limitation.
5. Explicitly out of Phase 1: any change to cell reservation, floors, priceSpread, repair.

### 3.3 Phase 2 — precise definition (cap-aware selection)

All inside `extractPoolFromDemand` (`src/engines/poolFromDemand.ts`) after step 5 (union),
plus one classification change in the shortfall reporter. `budgetPerTeam` finite ⇒ the new
logic runs; `Infinity`/absent ⇒ identical to today (backwards-compatible, keeps every
existing test meaningful).

**(a) Constructive G1 check — "N disjoint cheapest legal 22s".**
Run the design-feasibility matching frame (reuse `rosterDesignFeasibility`'s builder with an
all-no-ask 22-slot design; cheapest-first is already its fill order) N times against the
pool, REMOVING each assembled 22 from the candidate set before the next pass. Pass k fails
if it cannot fill 22 legally or its salary sum > cap. Result: either N assemblies (the
constructive proof — return them in the result for tests/audit) or the first failing pass +
its failing groups.

**(b) Repair loop — inject affordability, never evict.**
On failure, inject from the UNIVERSE (not yet in the pool) the cheapest players eligible for
the failing groups (position/role eligibility per the classifier), a bounded batch per round
(suggested: one body per failing group per round), then re-run (a). Bounded rounds — mirror
the `EXTRACTOR_TUNING.maxRepairRounds` pattern (`draftPoolExtractor.ts`). Determinism:
candidates ordered `salary asc, id asc` (the existing tiebreak convention, `poolFromDemand.ts:182`).
Invariants: repair only ADDS (cell reservations and floors picks always survive — the v1
"never trim" stance holds); if rounds exhaust without G1, emit a shortfall (c) and DON'T
fail the extraction — the pool ships with the honest banner. Universe exhausted of eligible
cheap bodies ⇒ same.

**(c) Price-vs-bodies shortfall naming.**
Today's `DemandShortfall` speaks bodies ("the universe holds 3"). Add a distinct
price-shortfall: an ask is **cap-unbearable** when every matching candidate's salary >
`cap − 21 × poolMinSalary` (the true single-slot bound: no legal 22 under the cap can carry
that player even with 21 minimum fills). Message shape: *"Your league wants a [shape] at
[pos]; every candidate costs more than a $X cap can carry."* Also emit a league-level
shortfall when (b) exhausts. Plain language, per the extractor's charter.

**(d) Cell reservation affordability — verify, don't change.**
`priceSpread` (`poolFromDemand.ts:130–137`) already always includes index 0 = the cheapest
match (candidates sorted salary-asc at :182), so every ask already reserves its cheapest
serviceable body. Phase 2 adds a regression test pinning this (it's now load-bearing), no
behavior change.

**Non-goals for Phase 2 (recorded):** trim-to-target stays v1.1 (unchanged stance from the
extractor header); per-design G2 remains a verdict; taxes stay out of G1; the snake path
needs no extraction change (same pool, same stamped budget, solvency engine already blocks
stranding picks).

---

## §4 — Migration (leagues with no `salaryCap`)

1. **Capless league records:** resolver falls back to `TIER_CAPS[tier].tierCap` (missing
   `tier` → `'juiced'`, matching the existing `:613` convention). Predictable, static —
   and for JK's current test league it flips the shown budget from ~$1,547,961 (floated) to
   $1,205,836 (juiced reference): the intended fix, not a regression. NO data rewrite, NO DB
   bump, NO backfill pass — pure read-time resolution.
2. **Already-LOCKED pools with a stale pool-relative `tierCap` stamp:** the lock freezes
   *membership + per-player IV* (`leagueConstruction.ts:45–53`); the budget is a league
   setting, NOT part of the frozen promise. Rule: **session-build reads win** — when the
   auction pipeline reuses a locked pool (`useAuctionDraft.ts:444–447`), it sets team budgets
   from `resolveLeagueSalaryCap(league)` (equivalently: overwrite the reused pool object's
   `tierCap` at session build, without touching membership). Any re-lock re-stamps via §2.2#2.
   Snake reads the same resolved number. The stale stamp then only ever appears in dormant
   stored records, never in a session.
3. **In-flight persisted draft sessions** (auction is per-pick crash-safe): budgets already
   snapshotted per team in the session — **never retro-edited**. Cap changes take effect at
   the next lock/session only. (This is the same atomicity stance the auction already takes
   for membership.)
4. **Backup/sync/L-SIM surface:** no new store, no renamed field — the existing
   `kbl-league-builder` registries are untouched.

---

## §5 — Acceptance tests

### Phase 1
1. **Resolver:** `salaryCap` present → returned verbatim; absent → `TIER_CAPS[tier].tierCap`
   for all three tiers; absent tier → juiced.
2. **Stamp:** `registerPool({salaryCap: X})` → `tierCap === X` regardless of pool IVs;
   without `salaryCap` → pool-relative unchanged (existing suites stay green untouched).
3. **Designer respects the number:** fixture league `salaryCap = 1,000,000` + a talent-rich
   pool (pool-relative would exceed $1.5M): `tierBudget` = 1,000,000; a design costing $1.05M
   → verdict `OVER BUDGET · $50,537 OVER`; a $950k design → `BUILDS · $50,000 TO SPARE`.
4. **Extraction threading:** `extractPoolFromDemand` verdicts computed against the settings
   cap; `extractDraftPool` identity seeds receive the same `budgetPerTeam`.
5. **Auction:** session build on that league → every real team `budgetRemaining` = cap;
   every shill `budget` = cap; a rich pool does NOT inflate either.
6. **Snake:** solvency `tierCap` + the `Cap $X` display = cap.
7. **Migration:** locked pool stamped $1.55M + league `salaryCap = $1.2M` → new auction
   session budgets = $1.2M; an in-flight persisted session's `budgetRemaining` untouched on
   resume.
8. **Validation:** form blocks cap < 22 × $1,666.49; advisory (non-blocking) outside
   [0.5×, 2×] tier reference; tier flip re-seeds only when the field is un-edited.
9. **Solvency banner:** pool whose cheapest legal 22 > cap → banner shows; ≤ cap → absent.
10. **Ratings invariant guard:** player ratings/IVs identical across tiers before/after
    (pins the 2026-06-26 canon this change must not disturb).
11. **Gates:** `npm run build` exit 0 + full vitest green (count/copy reconciliation rule:
    full run, not a filtered one). L-SIM: not required — draft/auction modules are outside
    the L-SIM import graph (documented orthogonality); Codex documents the graph check.

### Phase 2
1. **Constructive G1:** cap-tight fixture → result contains N disjoint legal 22s, each
   sum ≤ cap (assert on the returned assemblies, not a boolean).
2. **Repair:** pool initially unaffordable, universe holds cheap eligible bodies → repair
   injects until G1 holds; bounded rounds; deterministic across runs (C1B-4 stays: same
   input SET → same pool regardless of array order).
3. **Additive-only:** repair never removes a cell reservation or floors pick.
4. **Price-shortfall:** universe where a demanded cell's every match is cap-unbearable →
   price-worded shortfall (not a bodies count); bodies-shortfall wording unchanged elsewhere.
5. **Vacuous-cap no-regression:** `salaryCap` set exactly to the pool-relative value → output
   pool identical to today's (guarantee vacuous when loose).
6. **Exhaustion honesty:** universe with NO affordable repair bodies → extraction still
   returns, league-level shortfall present, banner logic (Phase 1 #9) fires.
7. **priceSpread pin:** cheapest match always reserved for every cell (now load-bearing).

---

## §6 — Open items for JK (each framed as a plain decision)

1. **Farm wallet:** the farm draft budget stays pool-relative in v1. Want a matching farm
   cap field later? Recommendation: defer to the v1.1 economy batch — the farm economy was
   deliberately pool-relative and nobody has hit a farm budget surprise.
2. **Tier bite:** with the cap in settings, tier is now a *default + luxury-cap* dial, not a
   budget law. If JK ever wants tier to bite harder, the dormant `TIER_RATING_SCALES` path
   (scale player ratings) is the lever — that would be a NEW ruling reversing 2026-06-26,
   not part of this build. Recommendation: leave dormant.
3. **Mid-session cap edits:** designed here as "takes effect at next lock/session" (§4.3).
   Flag for ratification; recommendation: keep — retro-editing a crash-safe session's
   budgets mid-draft is how force-sell negatives happen.

---

## §7 — Build routing

- **Phase 1 = one Codex contract** (settings field + resolver + 7-site switch + banner +
  migration + tests). Surfaces: `leagueBuilderStorage.ts`, `LeagueBuilderLeagues.tsx`,
  `leagueConstruction.ts`, `leagueBuilderPoolRegistration.ts`, `LeagueBuilderDraftSetup.tsx`,
  `poolFeasibility.ts` (+ its poolBuilder caller), `draftPoolExtractor.ts`,
  `poolFromDemand.ts`, `useAuctionDraft.ts` (§4.2 session-build read). No GameTracker files.
- **Phase 2 = a second contract after JK's playthrough**, audited against §3.3's invariants.
- Opus audits both diffs (builder/auditor triangle; Fable reviews the design fidelity of
  the extraction change, per the adapter-fidelity lesson — three C4 bugs lived exactly in
  "adapter hand-builds the engine input" territory).
