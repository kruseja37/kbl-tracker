# V1 HANDOFF — POST-C3 PLAN (2026-07-02, for the incoming Opus captain session)

**Author:** Fable 5 (closing session 2) · **Ratified direction:** JK rulings in DECISIONS_LOG
2026-07-02 (post-C3 direction entry) · **Trunk:** `experiment/manager-wpa-window` @ `76d0b6de`
(C3 committed; branch-only, never pushed).

This doc is the single continuation point for the next captain session. It supersedes the
sequencing portions of `V1_PLAN_FABLE_2026-07-01.md` and corrects two stale facts below; the
13-stage status in `V1_BUILD_STATUS.md` §3 remains the per-stage inventory (with the §2
correction noted here).

---

## §1. STATE (git-grounded)

- **The draft MATH FOUNDATION is complete on trunk:** C1 (identity-first roster construction +
  own_need + Ruling-A legality) → C1B (pool extractor) → C2A (tuning harness) → C2B (Second-Price
  market brain + completion floor + bid-log + archetype shills) → C3 (pool sizing + completion
  guarantees + end-checkpoint/FS-3 + shill cap). Every ticket survived adversarial audit
  (C2B: 1 fix round; C3: 2 fix rounds); all characterized-baseline gates green.
- **CORRECTION 1 (Opus, git-verified 2026-07-02):** `V1_BUILD_STATUS.md` §2 ("nothing draft/hub
  is on trunk; assembly is the gate") is STALE — `claude/v1-draft-ui` and
  `claude/lineups-fenway-hub` are fully contained in trunk (zero unique commits each). The
  premium-retro auction look is live. Retire those branches; there is no assembly gate anymore.
- **CORRECTION 2:** of the V1_BUILD_STATUS §4 path, items 1 (assembly) and 3's C1-C3 are DONE;
  within "auction gaps": bid-log ✅ (C2B), accurate floor ✅ (C2B+C3), shill-dissolve ✅ at v1
  semantics (commit-exclusion; the RB-10b pool-return bridge stays deferred). Still open there:
  the MOCK-DRAFT toggle (PDS-05/FS-1), the Option-A wrong-fit penalty (draft economy), and
  scout archetype-derived bands (farm draft).
- **CORRECTION 3 (Opus, test-verified 2026-07-02):** the C4-A premise "the draft→franchise
  handoff is MISSING, the single biggest gap" is WRONG — it was a grep false-negative (searched
  for `importDraftedRoster`/`hydrateFranchiseFromDraft`/etc.; the real mechanism uses different
  names). The spine IS built and wired: auction/farm results → League Builder store (committed on
  `AUCTION_COMPLETE` via `commitCompleted{Mlb,Farm}AuctionSessionToLeagueRosters`) → per-franchise
  DB via `deepCopyLeagueToFranchise` (`franchisePlayerStorage.ts:512`), plus `initializeFranchise`
  re-reading raw sessions for morale/salary/true-value seeding. PROOF: `draftPipeline.integration.test.ts`
  6/6 green (incl. "MLB auction → farm auction → franchise launch" and "carries archetype + ownership
  through to franchise rosters"). C4-A therefore RESCOPES to failure-path HARDENING + identity-UX,
  not a greenfield build (see §3 row 1).
- **Standing facts:** shills are completion-safe at S=0..4 and do NOT materially move real-team
  prices (±4%) — texture, not economics; JK set the default at 2. The three C3 design decisions
  (pool-aware strand law, exhaustion cleanup backfill, shill win cap) are JK-RATIFIED.

## §2. JK'S 2026-07-02 RULINGS (full text in DECISIONS_LOG — binding)

1. **Priorities:** Franchise/draft/living season #1 · Almanac #2 · everything else back-burner.
2. **Fable is UI BOSS** across league setup → draft → handoff → Fenway hub: kill leftover UI,
   fix redundancies (banner/tab team names, duplicated standings), one premium coherent UX,
   GameTracker = the read-only design reference (its UI is SET), tutorial content behind the
   help button, companions (Asst GM / scout / beat reporter) as the through-line voices.
3. **Assistant-GM = intelligence-first:** advice quality is the feature; manual moves allowed
   with plain UI; no per-button legality enforcement (only where trivial/already in the analyzer
   logic). Users breaking rosters is acceptable in v1.
4. **Chemistry/trait-potency must enter roster intelligence** (verified absent everywhere today):
   team chemistry counts → L1/L2/L3 potency tier → marginal player value (the L1→L2 / L2→L3
   tipping premium), in the draft board + auction advice + in-season analyzer. Single-math.
5. **Personality boundary:** Asst GM sees primary personality only; hidden modifiers generated at
   DRAFT-pool time (today: at freeze; deterministic per player id, so the move is consistent) and
   never surfaced to advice.
6. **Captain selection:** add a small five-tier age-curve tilt (today: loyalty+charisma only).
7. **Player-archetype taxonomy (Move 2):** unblocked (market brain done) and in the plan — feeds
   C4's ROBUST priority dropdowns.

## §3. THE SEQUENCE (agreed with JK; Opus orchestrates, builder≠auditor throughout)

| # | Ticket | Route | Notes |
|---|---|---|---|
| 1 | **C4-A: draft→season HARDENING (RESCOPED — see CORRECTION 3)** | Codex builds, Opus audits | NOT the missing spine — the spine works (integration test 6/6). Real work: (a) guard franchise creation against an incomplete/uncommitted draft (today unguarded); (b) make the raw-auction-session precondition checked, not a silent skip → neutral-morale franchise; (c) lift GM-name + team-archetype capture to draft-setup time (today only on the downstream franchise wizard, else seeded default). Smaller + non-blocking; identity-UX piece may fold into #6. PENDING JK reprioritization. |
| 2 | **QUICK-WIN-CATALOG-24** | Codex | Fire-anytime; wire the picker to all 24. |
| 3 | **Asst-GM analyzer intelligence (RESCOPED)** | Codex | Old "in-season legal-roster enforcement" ticket rewritten per ruling 3: analyzer adopts canonical rules (never advise illegal), manual-move UI verified present; NO blanket button enforcement. |
| 4 | **CHEM-POTENCY + PERSONALITY/CAPTAIN math ticket** | **Fable** | Ruling 4-6 in one ticket: the shared chemistry-tier marginal-value calc feeding builder/v_ij/outlooks/analyzer + hidden-modifier generation timing move + captain age tilt. Rides existing test harnesses (sweep/calibration re-run as gates). |
| 5 | **PLAYER-ARCHETYPE TAXONOMY (Move 2)** | **Fable** (design+sim) | Same method as the 24 team archetypes (value-parity sim). Feeds C4-B dropdowns. |
| 6 | **UX NORTH STAR (the UI-boss pass)** | **Fable** (design doc) | ✅ **DELIVERED 2026-07-02: `spec-docs/UX_NORTH_STAR.md`** (rulings summary in DECISIONS_LOG same date). Its §8 gives Opus two pre-steps to sequence before any reskin: the quick-win batch + the shared "Ballpark kit" ticket. Note for lane 1(c): the doc's R-IA2 (merge the two draft-setup screens; persist seat/GM names) is the same identity-UX work — one ticket, not two. Gate on #7/#8 now OPEN from the #6 side. |
| 7 | **C4-B: the auction experience** | Codex builds against #6, Fable reviews | Market brain on screen (REPLACE the old advisory — don't fuse); bid-vs-pass; CONTESTED; price bands. **HOLD until #4 and #6 exist** — otherwise the screen gets built twice. |
| 8 | **C4-C: living season / Asst-GM surface + hub polish** | Codex builds against #6 | The dedicated Asst-GM surface (intelligence-first), hub unwiring fixes, missing recent builds. |
| 9 | **Remaining auction gaps** | Codex, sequenced by Opus | MOCK-DRAFT toggle; Option-A wrong-fit penalty; scout archetype-derived bands (farm). |

Items 1-3 can run in parallel lanes today. 4-5 are Fable's next pull-ins. 6 gates 7-8.

## §3b. DISPATCH QUEUE — 5 Codex contracts WRITTEN + fire-ready (Opus, 2026-07-02)

All grounded (file:line re-verified via a 4-agent workflow) and appended to `PROMPT_CONTRACTS.md`.
**BLOCKED only on JK enabling the Codex autonomous-dispatch permission** (auto-mode denied the
`--dangerously-bypass-approvals-and-sandbox` codex-exec call; JK chose "enable Codex builds" — the
switch must be physically flipped before any fire).

| Contract | Covers | Files (surface) |
|---|---|---|
| `CODEX-ASSTGM-LEGALITY` | lane 3: analyzer never advises illegal + non-blocking only-catcher warn | rosterAnalyzerEngine.ts, TradeFlow.tsx |
| `CODEX-C4A-GUARD` | lane 1 (rescoped): block franchise-create from an INCOMPLETE draft; tighten seeding gate; keep non-auction leagues allowed | franchiseInitializer.ts, draftPipeline.integration.test.ts |
| `CODEX-QUICKWINS-B1` | 8 verified quick wins (QW-1,2,4,5,6,7,8,9) | AppHome, EndOfDraftStaffing, FranchiseHome, LeagueBuilderLeagues, LeagueBuilderFarmAuctionDraft |
| `CODEX-PREVIEW-GATE` | QW-3 pulled out (real refactor, not a quick diff): DEV-gate all /__preview/* + conditional lazy-imports | App.tsx |
| `CODEX-BALLPARK-KIT` | §1.2 shared kit (CSS-vars stylesheet + 5 primitives) + first adoption = dedup the 6 league-builder headers | new ballpark-kit.css, components/ballpark/*, the 6 LeagueBuilder* headers |

**SAFE PARALLEL PARTITION (proven disjoint file surfaces):** `CODEX-ASSTGM-LEGALITY` +
`CODEX-C4A-GUARD` + `CODEX-QUICKWINS-B1` + `CODEX-PREVIEW-GATE` touch non-overlapping files → may
run as concurrent lanes (separate worktrees). `CODEX-BALLPARK-KIT` overlaps QUICKWINS on
`LeagueBuilderLeagues.tsx` (different regions) → **run the kit AFTER quick-wins** (also matches
"kit before any reskin"). Opus is the sole auditor → may serialize audits regardless of build
concurrency.

**PULLED / DEFERRED:** QW-10 (harvest archetype explainer) is NOT a quick win — `ArchetypePicker`
has no help layer today; it needs the companion/help mechanism from §4/C4-C first. Copy to
preserve verbatim: `DraftSetupArchetypePreview.tsx:40-44` (reconcile its stale "15" → 24).

**TWO SMALL JK QUESTIONS from the lane-1 grounding (recommendations baked into the contract as
defaults; will proceed on the defaults unless JK says otherwise):** (1) add a positive
"was-auction-drafted" marker at commit time? → **default NO** (the data-loss case has no in-app
trigger). (2) a truly-flat non-auction league (neutral morale, no true-value baseline) — silent
allow or a one-time informational note? → **default silent-allow** (snake/seed/manual leagues are
first-class). CODEX-C4A-GUARD implements both defaults and STOP-IFs if a ruling is needed.

## §4. AFTER C4 (the standing plan — still valid, confirm at each step)

Per `V1_BUILD_STATUS.md` §4 (adjusted): the **L-SIM freeze-bridge spike** (riskiest seam;
de-risk early now that the spine is being built) → **PHASE 4 in strict order:** saved-game
migration check → flip the 11 soul flags ON → **§16 tuning (C5** — ~100 numbers over a live
season; Fable's mass-sim lane; MARKET_TUNING + SIZING_TUNING dials now included) → flip the live
`/franchise` route → **JK browser sign-off** (the batched sole acceptance gate). Also standing:
the **LIVING-SEASON re-audit** (JK flagged lower in-season confidence — schedule before Phase 4),
the Wave-1 purge ticket ('P'/'TWO-WAY'/'DH' primaries in the profile editor), and
SPEC-FIX-NOMINATION-2-3 (doc-only). **Then the ALMANAC** (priority #2). Playoffs stay deferred.

## §5. OPEN DECISION QUEUE (small; none blocking lane 1-3)

- Hidden-modifier generation timing details (pool-creation vs league-creation) — settle inside
  ticket #4 with a note to JK if a fork appears.
- C4-B's placeholder sub-features (true-cost penalty line, risk-posture dial) depend on the
  wrong-fit-penalty economy ticket — Opus sequences.
- Conference/division editor scope (S1 leftover, "confirm if v1") — JK ruled conferences ARE v1
  (2026-07-01 Ruling B); divisions out.

## §6. ROLES (unchanged, JK-confirmed)

Opus = captain/auditor/committer (token-efficient; keeps builder≠auditor, which caught every
must-fix this arc). Fable = math/design builder (tickets #4-6, C5) + UI-boss design authority +
C4 design reviews. Codex = mechanical/UI builds + adversarial passes. JK = rulings + browser
acceptance. Contracts in PROMPT_CONTRACTS.md before every dispatch; rulings to DECISIONS_LOG the
moment they happen; branch-only, never push.

## §7. HOLISTIC ROSTER BRAIN (new workstream — JK-flagged 2026-07-02; JK↔Fable planning session pending)

Opus deep-dive (evidence: `spec-docs/C4_AUDIT_2026-07-02.md` + memory `roster-intelligence-additive-not-holistic`):
the draft/roster valuation is TODAY **additive** — per-player IV + legality/cap — NOT "sum > parts."
The two synergy-aware pieces are built but wired to nothing live: the chemistry tipping premium
(`chemistryTierValue`, committed `3779e3df`) and the need×fit×scarcity market brain (`auctionMarketModel`).

**The 5 holism items:**
1. A **whole-roster scoring function** — today the only roster objective is `Σ iv − budget penalty`
   (`buildIdentityRoster`); no cross-player interaction term. [NEW]
2. **WIRE the chemistry premium** into the valuation/screens. [ALREADY PLANNED: C4-B + post-ASSTGM-LEGALITY analyzer]
3. **WIRE the market brain** in at all (need/fit/scarcity + bid-vs-pass) — currently dead from the app POV. [PLANNED: C4-B]
4. **Team-level L/R handedness / platoon balance** — absent everywhere in construction. [NEW]
5. **Multi-position flexibility as roster VALUE** (not just canCover legality). [NEW]

**Related findings (surfaced by the same dig, worth folding in):**
- IV gaps: position scarcity multipliers are all **1.00** (the `kbl-gotchas.md` C:1.15/SS:1.12/… table is
  STALE, not in live code); L/R handedness + `throws` unpriced; trait potency frozen at L2 in the live path.
- **Two-Way trait ↔ archetype cohorts [Opus-verified 2026-07-02]:** NOT a loophole — the OPPOSITE.
  A Two-Way player (a pitcher-primary carrying a `Two Way` trait) is treated as pitcher-only in EVERY
  cohort path: pitching counts toward pitcher caps, but their `bat` ratings are INVISIBLE to the hitter
  top-N caps (excluded by `!isPitcher` at `leagueConstruction.ts:254`, mirrored in `archetypeBalanceSimulator`).
  `bat` data is already populated; the converter `toConstructionPlayer` (`useLeagueBuilderData.ts:155`)
  just ignores the trait. **JK directive: Two-Way should count toward BOTH cohorts where ratings qualify.**
  Fix is code-small (add a two-way flag to ConstructionPlayer + widen the hitter-cohort predicate + mirror
  in the balance sim) BUT touches the calibrated luxury-tax + archetype-balance math → needs re-calibration/
  re-sim. **Recommendation: fold into the holistic-roster-brain rework (reworks these cohorts anyway) or
  v1.1 — not a standalone quick fix.**

**Sequencing [LOCKED 2026-07-02 Fable planning session — DECISIONS_LOG + `ASST_GM_DESIGN.md`]:**
- **v1:** wire the chemistry premium + the need/fit/scarcity market brain onto screens (C4-B) +
  **handedness balance as ADVICE** (the five-lights BALANCE light per ASST_GM_DESIGN — not an
  economy change). The Asst-GM surfaces (staffing hire point, per-seat WHISPER panel, click-driven
  in-season incl. lineup-vs-starter, the FIVE-LIGHTS scorecard SHAPE/IDENTITY/CHEMISTRY/BALANCE/BUDGET)
  are C4-B slice 2 + C4-C, built against `ASST_GM_DESIGN.md`.
- **v1.1:** ONE economy re-calibration campaign riding C5 — the whole-roster synergy SCORE (item 1) +
  flexibility-as-value via completion-floor deltas (item 5) + Two-Way cohorts (counts toward both) +
  the IV gaps (position multipliers / L-R handedness / L2 potency). Bundled so the calibrated cap/
  balance math is re-tuned ONCE, not piecemeal.

## §8. PLAN DELTAS — 2026-07-02 Fable session (relayed by JK; Fable logging rulings to DECISIONS_LOG)

- **ASST_GM_DESIGN (Fable, in progress today)** closes the Assistant-GM product gaps: hire point at
  staffing · per-seat WHISPER panel in the auction room · click-driven in-season scope (incl.
  lineup-vs-starter) · the five-lights roster scorecard. **C4-B slice 2 (the advice panel) and ALL of
  C4-C's Asst-GM surface now execute AGAINST this doc** — do not build those before it lands.
- **NEW TICKET — RUN-IT-BACK (small, v1):** delete saved draft + clear league rosters + reuse the LOCKED
  pool → redraft same league/settings. JK-ruled today as the mock-draft substitute. **Queue position:
  AFTER C4-B slice 1.**
- **CUT from v1: the MOCK-DRAFT toggle** (PDS-05/FS-1) — superseded by RUN-IT-BACK. Remove it from §3 row 9
  "remaining auction gaps" (the wrong-fit penalty + scout archetype-derived bands remain).
- **C4-B is UN-GATED:** its two gates are satisfied — #4 chem-potency committed (`3779e3df`) + #6 UX north
  star delivered. C4-B slice 1 (the market-read auction UI, minus the advice panel) can proceed against
  the UX north star + the Ballpark kit; slice 2 (advice panel) waits on ASST_GM_DESIGN.
- **Sequence otherwise unchanged.** Opus: keep the queued Codex batch (BALLPARK-KIT → then C4-B slice 1) +
  the bounded guards moving; builder≠auditor throughout; branch-only.

## §9. DEFERRED GATE — JK's UI readability/look sign-off (2026-07-02)

JK reviewed the auction market-read (Codex real-lot capture): market INFO approved (low/mid/high band is an
improvement); but readability/look "nearly identical to before" (correct — the kit is Stage-1 DEDUPE on the frozen
army-green values, NOT the chalk-and-ash migration). **JK's real UI/readability sign-off is DEFERRED to the
wired-AND-consistent state, done WITH Fable** — i.e. after (a) the chalk-and-ash "flip" (token values → GameTracker
surfaces, the one-file re-verified stage per FABLE_C4B_CHECKPOINT §1.1) and (b) the Draft Room setup-merge + the rest
of the journey are wired coherent. Do NOT treat the Stage-1 commit as JK's final UI acceptance. The functional
Stage-1 UI (kit + market-read) is committed as a step; the aesthetic/readability acceptance is the later Fable+JK pass.

## §10. END-OF-SESSION STATE (2026-07-02, Opus) — the whole build+audit push is LANDED

**Committed on `experiment/manager-wpa-window` (branch-only, NOTHING pushed), each Fable-or-Codex-built → Opus cross-model-audited:**
`76d0b6de` C3 → `3779e3df` chem-potency (#4) → `9949f350` quick-wins → `b1928e77` asst-gm-legality → `9966c9f9` C4-A guard
→ `f8244d69` taxonomy (#5) → `2e21ae22` Ballpark kit (Stage-1 dedupe) → `432a46b3` auction market-read (C4-B slice 1) →
`fbecbab8` Draft Room merge (R-IA2) → `7b8eee96` taxonomy-polish (§5c). The two builds that had real bugs (C3, taxonomy)
went BLOCK→fix→CLEAN. Full audit trail: `spec-docs/C4_AUDIT_2026-07-02.md`.

**Remaining to WIRED-COHERENT (not new construction — reskin + one Fable build + the look pass):**
1. **Chalk-and-ash color FLIP** — the deliberate token-values→GameTracker-surfaces stage (FABLE_C4B_CHECKPOINT §1.1,
   "one edit in one file"); Fable's reskin call. Until it lands, the league-builder/draft screens are Stage-1 army-green,
   NOT "migrated".
2. **POOL-FROM-DEMAND (Mode A)** — Fable math build (taxonomy design §6); then Opus audits. Activates the Draft Room's
   stubbed "Design first" toggle + zone-3 22-slot designer.
3. **JK look/readability pass** (§9) — with Fable, on the coherent flow, AFTER (1)+(2). The real UI acceptance gate.

**Also queued (not blocking the above):** RUN-IT-BACK action ticket (the "Drafted ✓ · Run it back" chip → button);
C4-B slice-2 (advice panel/whisper, against ASST_GM_DESIGN); C4-C (living-season Asst-GM surface + hub polish); the
v1.1 ONE economy re-calibration (Two-Way cohorts + flexibility-as-value + IV gaps, riding C5).

**Whose court:** Fable = POOL-FROM-DEMAND + the flip design + slice-2/C4-C design. JK = the look pass + rulings.
Opus = next cross-model audit (POOL-FROM-DEMAND when ready) + orchestration. Uncommitted = docs only (DECISIONS_LOG,
ASST_GM_DESIGN, the C4 audit/scope/handoff/contracts — shared, left uncommitted to avoid concurrent-doc collisions).

### §10 UPDATE — POOL-FROM-DEMAND LANDED (2026-07-02, Opus)
`c103a1ec` POOL-FROM-DEMAND (Mode A extraction) audited CLEAN + committed. **The full build+audit arc is now
committed** (11 commits `76d0b6de`→`c103a1ec`; all code committed, branch-only, nothing pushed). Remaining to
wired-coherent is UNCHANGED minus PFD: (1) the chalk-and-ash FLIP (specced in FABLE_C4B_CHECKPOINT §1.1 for Codex to
execute); (2) the remaining C4-B WIRING onto the merged Draft Room — the whisper panel (slice-2, vs ASST_GM_DESIGN),
the zone-3 22-slot designer, and flipping Mode A's toggle live to consume `extractPoolFromDemand`; (3) the small
tickets (personality-canon cleanup, DH purge, RUN-IT-BACK action, conference screen, staff carry-through); then
(4) JK's look pass at :5199 once the flip + wiring make the journey coherent. Fable: reviews-not-construction (S3/S5
harness + C5 tuning are her later builds). Opus queue: the C4-B wiring + the small tickets.
