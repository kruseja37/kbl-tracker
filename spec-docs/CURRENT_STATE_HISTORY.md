# CURRENT_STATE_HISTORY.md

Append-only arc-by-arc history. The live status header lives in CURRENT_STATE.md.
Newest entries are at the BOTTOM. This file was split out of CURRENT_STATE.md on 2026-06-14;
everything below the line is the prior CURRENT_STATE.md content, verbatim.

---

# CURRENT_STATE.md

**Last Updated:** 2026-06-14 (AI team operating setup)
**Phase:** BUILD: T-stack execution continues; next product task = T6 after EP1 closure. PROCESS: JK + Claude Opus 4.8 + Codex operating model added; no product sequencing change.

---

## Current Phase

The GameTracker UX redesign is **COMPLETE** (2026-03-16). Visual theme overhaul is **COMPLETE** (2026-04-13). Beat Reporter Voice spec is **COMPLETE** (2026-04-13).

### Recent Work (2026-04-07 through 2026-04-13)

**GameTracker Visual Theme Overhaul:**
- Dark chalkboard aesthetic applied across all panels
- Mom's Typewriter font for UI, Tox Typewriter for player names
- Team-colored lineup headers with chalk texture overlay
- Muted play log colors for visual hierarchy (lineup cards elevated over flanking panels)
- Chalky golden divider between lineup columns
- Faint chalk highlight on current batter row
- Small ⚾ indicator on due-up defensive batter
- Dark theme extended to: EnrichmentPanel, FullFenwayScoreboard, PlayerCardModal, QuickBar
- Player card modals widened to 480px (no scroll needed)

**Beat Reporter Voice Spec (spec-docs/BEAT_REPORTER_VOICE_SPEC.md):**
- 15-section comprehensive spec for AI beat reporter commentary system
- 3 dimensions: Personality (9) × Voice Style (6) × Era Flavor (5) = 270 combos
- Mood drift mechanics (80/20 true-to-form probability)
- WPA-based notability scoring for triggering commentary
- Hybrid LLM engine: Grok (client-side, in-game) + Claude Sonnet (server-side, post-game)
- Dual post-game newspaper columns (beat reporter + opposing beat reporter)
- Almanac/story archive system
- Rivalry system (established in League Builder, evolves game-by-game)
- Supabase data model defined

Current priorities:

1. Full game playtest on iPad Safari landscape (start to finish)
2. Fix any issues found during playtest
3. Resume Elimination Mode Steps 6-14 (paused during UX redesign)
4. Wire season stats to player card (currently shows game stats only)
5. Wire fWAR/pWAR to lineup columns (currently "—" placeholders)
6. Beat Reporter Phase 1 implementation (when ready)

---

## What Was Built (UX Redesign Session — 2026-03-15/16)

### Tier 1 — Architectural Rewrite (14 items)
- 4-column layout: NewsBoard (1/5), Batting Lineup (1/5), Defensive Lineup (1/5), Play Log (2/5)
- ScoreBug single-line at top with expand/collapse retro Fenway overlay
- GameDiamond removed from render (file preserved)
- Inline lineup columns: 9 players each, role-based swapping on half-inning
- Three-phase lifecycle: PRE_GAME → LIVE → POST_FINAL_OUT with START GAME gate
- Fixed viewport, no page scroll, internal column scrolling only
- Balls/strikes removed from scoreboard

### Tier 2 — Component Rewrites (20 items)
- K and Ꝁ (backwards K) as separate Quick Bar buttons
- ITPHR in overflow menu
- Undo + End Game in Quick Bar row with visual divider
- Processing-aware button feedback
- Pre-commit runner correction gate removed — immediate commit with defaults
- Player-first substitution flow (tap player → card → Sub Out → bench list)
- Real game stats wired to player card (season stats deferred)
- Enrichment taxonomy rewritten: contactType replaces exitType, fielding attempt restructured (Type + Outcome), play mechanic separated, per-result gating
- Inline SVG spray graphic with context-sensitive zone counts
- Manager moment Ⓜ in ScoreBug with Stay the Course button
- NewsBoard verified display-only
- Half-inning column swap verified

### Tier 3 — Polish & New Features (14 items)
- Runner sub-entries in play log with "└" nesting, independently enrichable
- Runner enrichment: TOOTBLAN, Out Advancing, fielding sequence, play mechanic per runner
- currentCatcherId auto-assigned on BetweenPlayEvents
- Undo-depth-aware locking (within 10 = full correction, beyond = structural locked, enrichment open)
- Defensive lineup enrichment mode (column toggles to "FIELDING SEQUENCE")
- Spray zone counts match spec §8.2 exactly
- Pitch count triggers verified at all 3 points
- Play log team colors
- CSS animations (fade-in, score highlight, lineup row flash)
- Player card initiate-only enforcement
- Audio system (Web Audio API, 8-bit retro sounds, two toggles)
- Undo toast format: "[inning] [batter] [result]"
- Save indicator ✓/⚠ in ScoreBug
- Locked result tooltip on tap

---

## Known Gaps (Not Regressions — Deferred Items)

| Gap | Status | What's Needed |
|-----|--------|---------------|
| FLO outcome silently dropped | Pre-existing bug | Add FLO to buildRunnerCorrectionForQuickBarOutcome out-type list |
| Season stats not on player card | Deferred | Wire franchise data store season aggregates to PlayerCardModal |
| Jersey numbers not shown | Data gap | Player interface doesn't include jersey number field |
| fWAR/pWAR show "—" | Deferred | Wire WAR calculation pipeline to lineup column display |
| Defensive next-inning leadoff | Simplified | Cross-half-inning batter tracking needs refinement |
| Manager moment detection | Infrastructure only | leverageIndex > 2.0 threshold trigger not wired (Ⓜ ready) |
| Mojo state font colors not rendering | RESOLVED | Root cause: BattingLineupColumn.tsx and DefensiveLineupColumn.tsx had hardcoded old mojo palettes bypassing getMojoColor(). Fixed by Codex — both columns now use canonical engine color map. Regression tests added. |

---

## Architecture Truth (Updated)

### Layout
- 3-row pinned layout: ScoreBug (top), 4-column content (middle), QuickBar (bottom)
- Columns: NewsBoard, BattingLineupColumn, DefensiveLineupColumn, PlayLogPanel
- Fixed viewport, no page scroll

### Game Lifecycle
- GameState.gamePhase: PRE_GAME | LIVE | POST_FINAL_OUT
- QuickBar transforms per phase
- Backward compat: existing saved games default to LIVE

### Enrichment
- contactType (Normal/Weak/Hard/Bloop/Bunt) replaces exitType
- Fielding Attempt: Type (8 options) + Outcome (Made/Missed)
- Play Mechanic: separate dimension (6 options including Deflection)
- Per-result ENRICHMENT_CONFIG gating
- Runner-level enrichment: TOOTBLAN, Out Advancing, fielding seq, play mechanic
- Inline SVG spray graphic with result-specific zone counts

### Substitution
- Player-first flow: tap player → card → Sub Out → bench list → select
- Swap Position and Swap Order (pre-game only) via player card
- Drag-drop substitution removed

### Score Bug
- Single-line with expand/collapse Fenway overlay
- Ⓜ manager moment indicator + Stay the Course button
- ✓/⚠ save indicator
- Audio toggle icons (🔊)

---

## Recommended Next Steps

1. **Full game playtest** on iPad Safari landscape — start to finish
2. **Fix FLO bug** — add to out-type list in buildRunnerCorrectionForQuickBarOutcome
3. **Resume Elimination Mode** Steps 6-14
4. **Wire season stats** to player card
5. **Wire WAR pipeline** to lineup columns
6. **Beat Reporter Phase 1** — Backstory session for fictional franchises, prompt engineering, Grok API setup


---

## UPDATE 2026-06-09 — New canonical spec: IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md v1.1.2 (renamed 2026-06-09 from ROSTER_ANALYZER_ARCHETYPE_ENGINE_SPEC.md)

- New workstream opened and fully specced in one session: Roster Analyzer / Team Builder / Archetype Engine (Modes 1 + 2 + GameTracker sub recs).
- **AMENDS SALARY_SYSTEM_SPEC_UPDATED.md**: IV Engine replaces base-salary Steps 1/2 and trait-tier tables. Relativity/True Value/fan morale/age/perf/fame/personality survive unchanged. Treat IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md §3.8 as the authoritative seam.
- **AMENDS farm salary model**: draft-slot pricing → scout-obscured IV; rookie-scale call-ups; 75% dead-money season ledger (wizard-configurable).
- GameTracker sub recommendation engine is now slated for REPLACEMENT (current logic = placeholder) per spec §10 — supersedes any prior "improve sub recs" plan.
- Pending named future spec: ROSTER_MOVEMENT_GAME_THEORY_SPEC (morale fallout for roster churn) — deliberately deferred.
- Next actions: Build Tasks T1–T3 per spec §13 (data extraction, TraitInteractionMatrix enumeration, empirical pool analysis). Commit source workbook + BillyYank guide to spec-docs/reference/.
- Priorities from 2026-04-13 entry (iPad playtest, Elimination Mode Steps 6–14, season stats/WAR wiring, Beat Reporter Phase 1) remain open; JK to sequence against T1–T10.

---
## CURRENT STATE — 2026-06-10 (IV Engine data-foundation arc CLOSED)
**Branch:** codex/franchise-v1-next. **Committed through:** T1 (8ce3b04) → T2 (cc09dde) → T3 (e7c6fec) → SOT canonization (9047970) → DB1 (a2d245d) → V117 closure (this commit).
**What exists & is trustworthy:** playerDatabase.ts (SOT-regenerated, audited 440/440, armSlot field); ivCurves.ts + traitPricing.ts (T1, workbook-exact); traitInteractionMatrix.ts (T2, 75 traits, citations); analyze-pool.py (rawIV anchor-gated 21/21 ±$0 + Jon Gray −$2,136; kblIV usage layer per §3.9); tierParams.ts FINAL (J/S/N caps $1,205,836/$1,064,387/$954,874; shifts ×0.8825/×0.7912; all 42+8 luxury rows live).
**Spec:** IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md v1.1.8 — D1-D17 all JK-ratified; §3.9 = kblIV usage doctrine (pitcher batting weights via 4-man rotation, two-way unlock, SP/RP interpolation ×1.12, FLD carve-out, armSlot, potency-neutral L2); acceptance = Bradwick crash + bridge report (parity band retired with reasoning).
**NEXT TASK: T4 — IV Engine (src/engines/ivEngine.ts), Codex 5.5 very high → Fable 5 audit.** computeIV implements BOTH layers (rawIV: A1 sub-min denominator primary.min−subMin.min, A3 RP-curve negatives, A4 per-component ROUNDUP, golden tests = 21 anchors + Jon Gray; kblIV: §3.9 verbatim, validate against analyze-pool's 440 values). Contract NOT yet drafted — first action of next session.
**Open non-blocking:** F2 SOT cell typos (~15); F4 FA trait spellings (4); 2 pre-existing test failures (wpaRuntimeBoundary allowlist, franchiseNarrativeEventEligibility) + 1 suite-order flake; T12 recalibration tool (post-T8); pitching-gate question (ACC×JNK) deferred to Mode 2 empirical loop per D17.


---

## 2026-06-11 — IV Engine status

- **T4 COMPLETE:** ivEngine.ts (both layers) + rosterEngineConstants.ts + frozen oracle
  + golden tests G1–G9. Audit: CONFORMS, zero MAJOR (see SESSION_LOG 2026-06-11).
- **NEXT ACTION: T4-FIX** — Codex 5.5 | medium → Fable delta verify. Contract in
  PROMPT_CONTRACTS.md (X1 pin raw layer to L2 + test G10; X2 byte-exact oracle freeze;
  X3 hitter-armSlot comment + documenting test, no behavior change).
- **Then:** commit T4 + T4-FIX together → T5 (salary spec integration seam).
- Sequence remaining: T4-FIX → T5 → T6 → {T7, T8} → T9 → T10 (T11 v1.5; T12 post-T8).
- Open non-blocking: F2 SOT typos (~15), F4 FA trait spellings (4), 2 baseline test
  failures + 1 flake, T12 recalibration tool.

---

## 2026-06-11 — VISION SESSION CLOSE: franchise engine architecture established

**New canonical docs (this session, ALL UNCOMMITTED — JK to review + commit):**
1. `MODE2_SYSTEMS_INTEGRATION_MAP.md` — IV→salary→TV→morale→Mode 3 chain;
   conflicts 4.1–4.7 logged; W1 (WAR orchestrator + gamesPerTeam metadata)
   identified as the gating fix for the value spine.
2. `FRANCHISE_ENGINE_VISION_QA.md` — 14 JK design rulings + 2 amendments
   (controlled-teams-are-the-user; columnist doctrine; fame visible / morale
   curve hidden; sports-drama ceiling; living profiles; full-teeth fan
   morale; playable ASG + fan-vote snubs; card binder; 3-tier almanac
   search; light chaos). Binding authority for all engine specs.
3. `FRANCHISE_ENGINE_MAP.md` v0.2 — 15 engines / 4 layers; value vs memory
   channels; §4.5 existing-asset crosswalk; §5 reclassified holes (3 NEW:
   fan economy, exhibition mode, card spec; 3 CONSOLIDATE: Recognition,
   Development, Scouting; rest AMEND/WIRE); §8 operating plan.

**Key engineering rulings:** 3-layer engine architecture, strict typed
contracts between layers, writes one-directional, user is the bridge; W1 is
a SEPARATE ticket from T5; design sessions read existing gospels first,
consolidate-and-amend only.

**Pre-build amendments folded into the T5 contract:** kill potency-reprices-
salary text (MODE_2 §15.5 + salary spec) per D15; fix IV §3.8 stale DH row.

**Design-session queue (parallel track, chat-only):** **D0 SCOPE SESSION
FIRST** (consolidate existing scope docs → FRANCHISE_PLAYABLE_V1_DEFINITION.md:
v1 loop + cut line; rulings = destination, not build order) → D1 Stats
data-contract audit → D2 Recognition → D3 Morale+fan economy (incl. H11
expected-wins ruling) → D4 Development → D5 Narrative → D6 Relationships →
D7 Almanac+card → D8 Scouting. Every session opens: read gospels in full →
verify wiring with fresh evidence (Fable CLI + discovery skills for heavy
passes) → classify ADOPT/AMEND/WIRE/REBUILD → output its own v1/v2 split.

**NEXT ACTION (new thread):** T4 arc closure commit → Claude drafts T5 prompt
contract — ROUTE: Codex 5.5 | very high → Fable 5 CLI audit (persistence-
adjacent; audit non-negotiable). After T5: W1 → TV1 → T6.
**5-session milestone:** T5 + W1 + TV1 + D1 + D2 = trustworthy value spine +
Stats/Recognition specs.

**Open pending-JK:** ASG WPA→Fame; Signature Moment on card; fame tier names.
**Stale-data flags:** SUBSYSTEM_MAP Feb-era (Transaction/Farm rows predate
May–Jun checkpoints); F-086 vs F-119 Relationships disagreement → D6.


---

## CURRENT STATE — 2026-06-11 (T5 arc CLOSED)
**Branch:** codex/franchise-v1-next. **This commit:** T5 + T5-FIX + T5-FIX-2 +
contracts + FINDING-134 + session docs (single closure commit, post
T5-FIX-VERIFY: "T5-FIX DELTA VERIFIED").
**What exists & is trustworthy:** salary pipeline base = computeIV().kblIV in
CANONICAL DOLLARS (old $M scale dead; BRIDGE=300.032521 documented in
scripts/t5-denomination-bridge.ts); D15 potency-neutral salary; rookie-scale
hook (0.50× replaces age factor; ledger = T7); prospect placeholders bridged;
TeamHub on canonical formatSalary; regression suite R1–R6 mutation-pinned;
specs amended (salary-spec potency reprice killed, MODE_2 §15.5 ×2, IV §3.8 DH
row). ivEngine/oracle/tierParams untouched and frozen.
**Suite baseline:** 2 fixed failures (wpaRuntimeBoundary,
franchiseNarrativeEventEligibility) + ≥2 order-flakes (franchiseManualSmokeFixture,
GameTrackerLaunchState — pass solo). **CLI verification MUST prefix `NODE_ENV= `**
(login shell exports NODE_ENV=production; poisons vitest with ~1,800 false fails).
**NEXT TASK: W1 — WAR orchestrator persistence + gamesPerTeam metadata,
PLUS folded X-items (JK-approved 2026-06-11): F5 armSlot (franchise Player
field + migration + reprice threading + explicit `armSlot: null` generator
default) and F7 (delete dead barrel re-export engines/index.ts:690).**
ROUTE: Codex 5.5 | high → Fable 5 CLI audit. Contract not yet drafted — first
action of next session (read MODE2_SYSTEMS_INTEGRATION_MAP.md §4.4 first).
Then TV1 → T6. Design track: D0 scope session next; D8 gains a hook (generated
prospects: Sub-slot chance? scout-obscured?).
**JK RULING (canonical): NO DH anywhere in v1** — TRAIT_INTEGRATION DH-row
deletion approved as cited cleanup (next spec-cleanup batch, with deliberate
DH-surface grep).
**Open pending-JK:** F6 PlayerCard isTwoWay heuristic (RULED: defer to T6/T9);
FINDING-134 residual $M flows (RULED: discovery slot after W1 — Fable CLI →
Codex 5.5 high); order-flake cleanup (RULED: standalone, opportunistic); ASG
WPA→Fame; Signature Moment card line; fame tier names; F2 SOT typos (~15); F4
FA trait spellings (4).


---

## CURRENT STATE — 2026-06-12 (W1 arc CLOSED)
**Branch:** codex/franchise-v1-next. **This commit:** W1 + W1-FIX + ADDENDUM 1 +
contracts (W1/W1-AUDIT/W1-FIX/W1-FIX-VERIFY) + FINDING-135 + session docs (single
closure commit, post "W1-FIX DELTA VERIFIED").
**What exists & is trustworthy:** WAR persistence LIVE — processCompletedGame →
calculateAndPersistSeasonWAR after successful regular-season aggregation, scope =
options.seasonId (mirrors aggregation); SeasonMetadata.gamesPerTeam config-sourced
via three fuel lines (creation/initializeFranchise, heal/repairFranchisePersistence
on FranchiseHome mount, belt-and-braces FranchiseHome call sites), null-only
backfill provably never overwrites a non-null snapshot, unresolved → skip+warn,
NEVER silent default or schedule-row counts (R1); useGameState deliberately
untouched (metadata-first covers it, Fable-traced); franchise Player.armSlot
('High'|'Mid'|'Low'|'Sub'|null) with full generator null-default coverage +
franchiseSalary threading (F5 closed); dead salaryCalculator barrel removed from
engines/index.ts (F7 closed). All W1/W1-FIX tests mutation-honest (re-run by Fable).
**Suite baseline:** unchanged — 2 fixed failures (wpaRuntimeBoundary,
franchiseNarrativeEventEligibility) + ≥2 order-flakes (franchiseManualSmokeFixture,
GameTrackerLaunchState). CLI: prefix `NODE_ENV= `; node at
~/.nvm/versions/node/v20.20.0/bin on non-interactive shells.
**NEXT TASK: FINDING-134 + FINDING-135 discovery slot.** ROUTE: Fable 5 CLI
(spec-ui-alignment / franchise-button-audit skills) — wiring evidence per component
(TradeFlow ×1e6 trade matching, FreeAgencyFlow, AwardsCeremonyFlow,
FinalizeAdvanceFlow $M tables/thresholds) + totalGames consumer inventory (F-135) →
fixes Codex 5.5 | high. Contract not yet drafted — first action of next session.
**Then:** TV1 (True Value canonical pass) → T6. 5-session milestone: T5 ✅ W1 ✅ +
TV1 + D1 + D2. Design track: D0 scope session next (chat-only, parallel).
**Open pending-JK:** SESSION_RULES standing rule — reasoning effort mandatory in
every contract ROUTE header + closing directive (proposed 2026-06-12); ASG WPA→Fame;
Signature Moment card line; fame tier names; F2 SOT typos (~15); F4 FA trait
spellings (4); order-flake cleanup (standalone, opportunistic).
**Parked (W1 arc):** wizard free-input gamesPerTeam UI (Codex 5.5 medium + validation
bounds); whole engines/index.ts barrel deadness (zero importers — cited cleanup);
mid-season gamesPerTeam edit semantics (snapshot-at-creation canonical); seasonId
divergence note (archiveOptions-only caller would split aggregation/WAR scopes —
unreachable today, Fable W1-FIX-VERIFY).


---

## CURRENT STATE — 2026-06-12 (F134/F135 discovery + F135-T1 arc CLOSED)
**Branch:** codex/franchise-v1-next. **This commit:** F135-T1 + tests +
contracts (F134-F135-DISCOVERY / F135-T1 / F135-T1-AUDIT) + FINDINGS
F-136/137/138 + F134_F135_DISCOVERY_REPORT.md + session docs (single closure
commit, post "F135-T1 DELTA VERIFIED").
**What exists & is trustworthy:** Leader-board WAR season length is config-
truth — resolveSeasonGamesForWAR (useSeasonStats.ts, exported pure):
gamesPerTeam (>0) → 162 warn-once fallback; SeasonMetadata.totalGames
PERMANENTLY BANNED from WAR scaling (R1' ruling — it is league-total rows,
wrong even on full schedules); finiteWAR clamps every WAR output (±Infinity
impossible); 6 mutation-pinned tests. Discovery canon (report §1-2): all 25
$M sites in the four offseason flows are DEAD today behind two gates
(offseason flag false; TradeFlow franchiseId branch); 16 latent on flag flip,
FreeAgencyFlow:541 the only persisting one. totalGames consumers fully
inventoried (18 clusters; B-1/B-2 fixed by this arc; 9 dead).
**Suite baseline:** unchanged — wpaRuntimeBoundary +
franchiseNarrativeEventEligibility fixed failures; franchiseManualSmokeFixture
+ GameTrackerLaunchState order-flakes. Test count 7,195 (+6). CLI: prefix
`NODE_ENV= `; node at ~/.nvm/versions/node/v20.20.0/bin.
**NEXT TASK: F134-T1 — FreeAgencyFlow canonical pass.** Delete ×1e6 at :541
(persists wrong-scale contractValue on flag flip); swap 7 raw-`M` formatters
(:1457/:1472/:1495/:1496/:1508/:1542/:1587) to engine formatSalary
(salaryCalculator.ts:1337, TeamHubContent precedent); ±10% ratio math
(:1353-1359) is scale-safe — DO NOT touch. ROUTE: Codex 5.5 | high →
Fable 5 audit. Contract not yet drafted — first action of next session.
**Then:** F134-T2 (Awards — NEEDS JK vote-divisor ruling) → F134-T3
(FinalizeAdvance — NEEDS JK rookie-table ruling, T5 rookie-scale hook) →
F134-T4 (DELETE ActiveTradeFlow, JK-ruled) → F135-T2 cleanup batch (dead
consumers B-5/6/7/11-15, C-7 dead duplicate useSeasonStats, M2b resolver
test one-liner, C-4 `?? 64` re-source). TV1 unblocked (leader WAR now
trustworthy). 5-session milestone: T5 ✅ W1 ✅ F135-T1 ✅ + TV1 + D1/D2.
Design track: D0 scope session next (chat-only, parallel).
**FLAG-FLIP PRECONDITION (F-138, standing):** offseason flows read STOCK
playerDatabase via useOffseasonData — denomination fixes are NOT sufficient
to enable FRANCHISE_V1_OFFSEASON_EXECUTION_ENABLED; a franchise-data-source
ticket must be scoped first.
**Open pending-JK:** standing rule v2 — reasoning effort in every ROUTE
header + closing directive AND no handoff until the contract exists in
PROMPT_CONTRACTS.md (write-first; proposed after this session's retro-log);
vote-divisor sensitivity (T2); rookie grade table → T5 rookie-scale (T3);
ASG WPA→Fame; Signature Moment card line; fame tier names; F2 SOT typos
(~15); F4 FA trait spellings (4); order-flake cleanup (standalone,
opportunistic).


---

## CURRENT STATE — 2026-06-12 (F134-T1 arc CLOSED; same-day as F135-T1)
**Branch:** codex/franchise-v1-next. **Pending commit:** ONE combined closure
commit recommended — F135-T1 + F134-T1 + discovery report + contracts +
findings + session docs (doc appends interleave; partial staging not worth it).
**What exists & is trustworthy (this arc):** FreeAgencyFlow is denomination-
canonical — contractValue persists raw kblIV dollars (buildFreeAgentSigning
FromMove, pure); all salary displays via engine formatSalary; ±10% exchange
window = pure getFreeAgencyExchangeSalaryWindow, bit-identical math, mutation-
pinned. D3 consumer sweep: contractValue has ZERO product readers (write-only;
forward-safe). 3 mutation-pinned tests. Fable: "F134-T1 DELTA VERIFIED."
**Suite baseline (RE-CHARACTERIZED this arc):** fixed failures wpaRuntime
Boundary + franchiseNarrativeEventEligibility; order-flakes franchiseManual
SmokeFixture + GameTrackerLaunchState + franchiseOffseasonGuards.component
(NEW third member — conditional: must pass solo when it fires). Test count
7,198. CLI: prefix `NODE_ENV= `; node ~/.nvm/versions/node/v20.20.0/bin.
**Standing rule (ratified 2026-06-12, in SESSION_RULES.md):** Contract
Readiness Rule — reasoning effort in ROUTE header AND closing directive;
no handoff until the contract exists in PROMPT_CONTRACTS.md.
**NEXT TASK: F134-T2 (AwardsCeremonyFlow) — BLOCKED ON JK RULING:** vote-
divisor sensitivity under canonical dollars (Captain rec: divisor 500000 →
~1666 ≈ 500000/BRIDGE to preserve original design sensitivity; or JK names
a designed canonical $-per-vote-pt). **F134-T3 (FinalizeAdvanceFlow) —
BLOCKED ON JK RULING:** rookie call-up salary (Captain rec: DELETE the grade
table entirely — F-127 canon says salary is set at draft and UNCHANGED at
call-up, so call-up should carry player.salary as-is; no recompute).
**F134-T4 ready to draft** (DELETE ActiveTradeFlow, JK-ruled 2026-06-12).
**F135-T2 cleanup list:** dead consumers B-5/6/7/11-15; C-7 dead duplicate
useSeasonStats; C-4 `?? 64`; M2b resolver test one-liner; write-only
contractValue dead-data note. TV1 unblocked. 5-session milestone: T5 ✅
W1 ✅ F135-T1 ✅ F134-T1 ✅ + TV1 + D1/D2. Design track: D0 next.
**FLAG-FLIP PRECONDITION (F-138, standing):** offseason flows still read
STOCK playerDatabase — franchise-data-source ticket required before
FRANCHISE_V1_OFFSEASON_EXECUTION_ENABLED flips.
**Open pending-JK:** vote-divisor (T2); rookie-salary disposition (T3);
commit cadence (combined vs split closure commit); ASG WPA→Fame; Signature
Moment card line; fame tier names; F2 SOT typos; F4 FA trait spellings;
order-flake cleanup (now 3 members — priority arguably rising).


---

## CURRENT STATE — 2026-06-12 (F134-T2 + T3 parallel arc CLOSED)
**Branch:** codex/franchise-v1-next. **This commit:** T2 + T3 + tests + doc
updates (combined closure, post dual "DELTA VERIFIED").
**What exists & is trustworthy (this arc):** AwardsCeremonyFlow canonical
(pass-through; divisor 1666 per F-139 via one shared vote function;
formatSalary displays; selection logic untouched, C-6 parked).
FinalizeAdvanceFlow canonical + F-127 CANON (grade table DELETED per F-140;
call-up salary unchanged-by-construction; thresholds 33330/16665 shared by
logic AND display; ?? 0 fallback; gates/season-transition provably
untouched). 7 new mutation-pinned tests. First parallel Codex execution
succeeded under the addendum.
**Suite baseline:** 7,205 tests / 383 files. Characterized set unchanged:
fixed wpaRuntimeBoundary + franchiseNarrativeEventEligibility; order-flakes
(conditional-solo) franchiseManualSmokeFixture + GameTrackerLaunchState +
franchiseOffseasonGuards.component. CLI: prefix `NODE_ENV= `; node
~/.nvm/versions/node/v20.20.0/bin.
**Parallel-execution doctrine (proven this arc):** disjoint files → parallel
builders OK; per-agent focused tests/mutations/sweeps; ONE combined
build+suite gate run by Captain or auditor (NEVER a builder — lesson logged);
closure commit precedes parallel start; audits in one Fable session with
mutual sibling carve-outs.
**NEXT TASK: F134-T4 — DELETE ActiveTradeFlow** (JK-ruled 2026-06-12):
remove the unreachable legacy branch from TradeFlow.tsx (+convertToLocal*,
mock-AI block, local formatSalary, ~1,200 lines), killing the last 4
FINDING-136 sites. ROUTE: Codex 5.5 | high → Fable 5 audit (HIGH-by-rule:
trade state file). Contract not yet drafted.
**Then:** F135-T2 cleanup batch (dead consumers B-5/6/7/11-15; C-7 duplicate
useSeasonStats; C-4 ?? 64; M2b resolver test; write-only contractValue note)
→ TV1 → D1/D2. F-138 flag-flip precondition standing. Design track: D0 next.
**Open pending-JK:** ASG WPA→Fame; Signature Moment card line; fame tier
names; F2 SOT typos; F4 FA trait spellings; order-flake cleanup (3 members).


---

## SEQUENCING RULING — 2026-06-12 (JK, canonical)
**The entire T-stack is v1 and runs to completion FIRST:** current batch
(F134-T4 + F135-T2) → TV1 → T6 → {T7, T8} → T9 → T10 (T11 = v1.5; T12
post-T8). The T-stack needs no design input (IV spec D1-D17 ratified) —
pure execution, no interleaved design sessions.
**Then D0 runs as THE cut line:** with F-136/137 closed and the value
spine finished, D0 produces FRANCHISE_PLAYABLE_V1_DEFINITION.md ruling
on everything beyond the T-stack (incl. Elimination Mode 6-14 and the
iPad playtest placement). D1-D8 follow D0; every design session outputs
its own v1/v2 split against D0's definition. Vision rulings remain
destination, not build order.
**F-138 is scoped AFTER D0** (not part of F-13x closure): the offseason
data-source ticket waits for D0's ruling on what the flows should show;
the flag stays FALSE throughout the T-stack.
**AMENDS the 5-session milestone:** was T5+W1+TV1+D1+D2; D1/D2 now
follow D0, which follows T-stack completion.


---

## CURRENT STATE — 2026-06-12 (F134-T4 + F135-T2 arc CLOSED — F-13x DEBT RETIRED)
**Branch:** codex/franchise-v1-next. **This commit:** T4 + F135-T2 +
ADDENDUM 1 + sequencing-ruling docs + session docs (combined closure, post
dual "DELTA VERIFIED").
**MILESTONE:** FINDING-136 FULLY RESOLVED (25/25 $M sites canonicalized or
deleted) + FINDING-137 FIXED-AND-CLEANED. ActiveTradeFlow gone (−1,306;
TradeFlow renders the console unconditionally, franchiseId required). 9 dead
files deleted incl. the C-7 duplicate; FranchiseStats + its contract-test
block excised (ADDENDUM 1, JK-ruled); un-rendered totalGames removed from
useFranchiseData; M2b resolver gap closed (mutant re-run RED).
**Suite baseline:** 7,113 tests / 380 files. Characterized set unchanged:
fixed wpaRuntimeBoundary + franchiseNarrativeEventEligibility; order-flakes
(conditional-solo) franchiseManualSmokeFixture + GameTrackerLaunchState +
franchiseOffseasonGuards.component. CLI: prefix `NODE_ENV= `; node
~/.nvm/versions/node/v20.20.0/bin.
**SEQUENCING RULING IN EFFECT (FINDING-141):** T-stack to completion as
pure execution → D0 cut line → D1-D8 → F-138 → flag flip → iPad playtest
exit gate. Amendment notices live in KBL_V1_EXECUTION_PLAN.md +
FRANCHISE_ENGINE_MAP.md.
**NEXT TASK: TV1 — True Value canonical pass.** First ticket of the
T-stack run (TV1 → T6 → {T7, T8} → T9 → T10). Contract not yet drafted —
first action of next session: read IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC
§3.8 (salary-spec seam) + SALARY_SYSTEM_SPEC relativity/True Value
sections, then draft. ROUTE: Codex 5.5 | high (or very high if TV math
touches state) → Fable 5 CLI audit.
**Cleanup candidates (F135-T3-class, opportunistic):** C-8 orphan
useWARCalculations copy (src_figma/app/hooks); C-5 dual milestoneAggregator;
order-flake root-cause (3 members); engines/index.ts barrel deadness;
excluded engines wake with their design sessions (calibration→T12,
calendar/trade-deadline→schedule design, fanMorale params→D3).
**Process canon added:** auditor runs combined gates (never builders);
every changed file must appear in builder reports incl. mechanically-forced
test/mock adjustments (template update pending next contract).
**Open pending-JK:** ASG WPA→Fame; Signature Moment card line; fame tier
names; F2 SOT typos; F4 FA trait spellings.


---

## CURRENT STATE — 2026-06-12 (TV1 arc CLOSED)
**Branch:** codex/franchise-v1-next. **This commit:** TV1 code + tests +
contracts (TV1 / TV1-AUDIT + execution records) + FINDING-142 + session docs
(single closure commit, post "TV1 DELTA VERIFIED").
**What exists & is trustworthy:** True Value is CANONICAL — one
implementation (calculateTrueValue, spec-faithful step-percentile per R-2;
preview interpolation deleted, preview delegates to engine);
franchiseTrueValueStorage.ts persists rows keyed franchiseId/seasonId/
statsScopeId/playerId with calculationVersion; persist trigger =
processCompletedGame AFTER successful WAR persistence, same seasonId scope,
WAR-fail → skip+warn (R-4); salary input = T5 canonical path, WAR input =
W1 persisted rows, totalGames grep-pinned absent. FINDING-142 FIXED-AND-
VERIFIED: value-input WAR composition now combines persisted bWAR + pWAR
(was silently dropping pWAR — pre-existing defect caught by DISCOVERY 1).
Trust flags remain hard-typed false per R-5 — numbers are canonical, no
consumer acts on them until TV2.
**Suite baseline:** 7,122 tests / 382 files (+9/+2 exact). Characterized
set unchanged: fixed wpaRuntimeBoundary + franchiseNarrativeEventEligibility;
order-flakes (conditional-solo) franchiseManualSmokeFixture +
GameTrackerLaunchState + franchiseOffseasonGuards.component. CLI: prefix
`NODE_ENV= `; node ~/.nvm/versions/node/v20.20.0/bin.
**NEXT TASK: TV2 — designation slice** (audit slices 3-4: canonical
designation storage + projected designations recalc). Contract not yet
drafted. Carried inputs: (1) JK RULING NEEDED — separate IndexedDB database
kbl-franchise-true-values vs shared-DB convention, before TV2 adds stores;
(2) ratify position-normalization mapping (P→SP/RP, IF/OF→UTIL) in the
contract; (3) DISCOVERY 2 gap — franchiseDesignations.ts takes trueValue
but NO valueDelta consumer exists; spec makes valueDelta THE Fan Favorite/
Albatross criterion, so TV2 adds it. ROUTE: Codex 5.5 | very high → Fable 5
CLI audit (designation persistence).
**Then:** T6 → {T7, T8} → T9 → T10 → D0 cut line (sequencing ruling F-141).
**Process canon added this arc:** pipelining (draft N+1 while N builds;
batch JK rulings forward); triangle PERMANENT — Fable never audits its own
builds (JK ruling); Wave-2 process architecture = D0 closing agenda item;
FINDINGS_142_onwards.md batch opened.
**Open pending-JK:** separate-DB ruling (TV2-blocking); untracked
reference-docs/Super Mega Baseball 4 Rosters.csv (commit or gitignore);
ASG WPA→Fame; Signature Moment card line; fame tier names; F2 SOT typos;
F4 FA trait spellings; order-flake cleanup (3 members).


---

## CURRENT STATE — 2026-06-12 (TV1-FIX arc CLOSED; R-8 ratified)
**Branch:** codex/franchise-v1-next. **This commit:** TV1-FIX code + tests
+ contracts/records + FINDINGS 143/144 + session docs.
**What exists & is trustworthy:** True Value storage lives in the SHARED
kbl-tracker DB (v13 additive, Feb-11 hazard class cleared by full-handler
audit); position handling is strict 12-label canonical validation with
loud skip reasons — zero remapping in the True Value path. RULING R-8
(38ef25a) is canonical: plurality-with-incumbency effective positions,
league-wide Reserve pool (CALIBRATE threshold), pitchers profile-role v1,
compositional two-way valuation, trait-group resolution scopes.
**Suite baseline:** 7,125 tests / 382 files. Characterized set unchanged.
CLI: prefix `NODE_ENV= `; node ~/.nvm/versions/node/v20.20.0/bin.
**NEXT TASK: TV2 — designation slice** (contract committed 56f3592, ready
to hand off): shared-DB designation storage + projected MVP/Ace/FanFav/
Albatross per §17 gospel; Phase 0 discovery STOP-gate over the 5 existing
designation files (Codex reports, Captain signs off before build); FanFav/
Albatross = the NEW valueDelta consumer reading canonical True Value rows;
trust flips projected-only with documented profile-pool limitation.
ROUTE: Codex 5.5 | very high → Fable 5 CLI audit. NOTE: TV2's folded
UTIL/BENCH cleanup is PRE-COMPLETED by TV1-FIX (audit-verified).
**Then:** EP1 (R-8 engine, closes FINDING-143) → T6 → {T7,T8} → T9 → T10
→ D0 (sequencing ruling F-141 holds).
**Open pending-JK:** ratify TV1-FIX MINOR #1 (dead merge-row deletion —
Captain recommends yes); FINDING-144 → taxonomy spec-cleanup batch (with
R-6/R-8 gospel blocks); untracked SMB4 Rosters.csv; ASG WPA→Fame;
Signature Moment card line; fame tier names; F2 SOT typos; F4 FA trait
spellings; order-flake cleanup (3 members).


---

## CURRENT STATE — 2026-06-12 (TV2 arc CLOSED — designation slice live)
**Branch:** codex/franchise-v1-next. **This commit:** TV2 code + tests +
contracts/records + FINDING-145 + session docs.
**What exists & is trustworthy:** Projected designations are CANONICAL —
shared-DB v14 franchiseDesignationRows (one holder per team per type);
§17-exact engine (MVP/Ace from persisted WAR; FanFav/Albatross from
canonical valueDelta rows — the first valueDelta consumer; floors from
gamesPerTeam config-truth; below-floor = no holder; carryover metadata
round-trip proven); post-game gate chain WAR → True Value → designations,
skip+warn per link; TeamHub READS canonical rows (load-time 'active'
write side effect DELETED, pinned by 22 distributed write-pins); trust
projected-only with limitation "peer pools are profile-position until
EP1 (R-8)". Locked effects (Fame/morale/trade discount) grep-pinned
absent — slice 5 territory.
**Suite baseline:** 7,127 tests / 382 files. Characterized set unchanged.
CLI: prefix `NODE_ENV= `; node ~/.nvm/versions/node/v20.20.0/bin.
**USER-VISIBLE CHANGE (browser-verify note):** TeamHub badges are now
dotted "Proj." driven by post-game recalc; early-season teams may show
FEWER badges than before (below-floor = no holder, per spec — correct
behavior replacing incorrect).
**NEXT TASK: EP1 — R-8 effective-position engine** (closes FINDING-143):
plurality-with-incumbency resolution, Reserve pool (CALIBRATE threshold),
compositional two-way valuation, trait-group scopes. Contract not yet
drafted — first action. ROUTE: Codex 5.5 | very high → Fable 5 CLI audit.
FINDING-145 cleanup home (EP1 vs slice 5) = JK call at drafting.
**Then:** T6 → {T7,T8} → T9 → T10 → D0 (F-141 holds). Slices 5 (locking)
and 6 (Captain/Fan Hopeful) remain queued post-T-stack or per D0.
**Open pending-JK:** ratify TV1-FIX MINOR #1 (dead merge-row deletion —
recommended yes); ratify TV2 MINOR #4 (badge dark backgrounds vs "Light X"
prose — likely deliberate for dark UI); F-145 placement; F-144 → taxonomy
cleanup batch; untracked SMB4 Rosters.csv; ASG WPA→Fame; Signature Moment
card line; fame tier names; F2 SOT typos; F4 FA trait spellings;
order-flake cleanup (3 members).


---

## CURRENT STATE — 2026-06-12 (SESSION CLOSED post-TV2; ratifications final)
**Branch:** codex/franchise-v1-next. **This commit:** session-end docs
(ratifications of TV1-FIX MINOR #1 and TV2 MINOR #4 — both CLOSED, no
code; §17.8 prose amendment queued to spec-cleanup batch).
**NEXT SESSION FIRST ACTION: draft EP1** — R-8 effective-position engine
(plurality-with-incumbency, Reserve pool CALIBRATE threshold,
compositional two-way valuation, trait-group scopes; closes FINDING-143;
argues FINDING-145 placement in the draft). ROUTE: Codex 5.5 | very high
→ Fable 5 CLI audit. Heaviest ticket since T5 — touches True Value
inputs; audit requires TV-level golden regression. Read this entry +
RULING R-8 (PROMPT_CONTRACTS.md) + the TV2-close entry above before
drafting.
**Suite baseline:** 7,127 / 382. Characterized set unchanged (fixed:
wpaRuntimeBoundary, franchiseNarrativeEventEligibility; order-flakes
conditional-solo: franchiseManualSmokeFixture, GameTrackerLaunchState,
franchiseOffseasonGuards.component). CLI: prefix `NODE_ENV= `; node
~/.nvm/versions/node/v20.20.0/bin.
**Browser-verify outstanding (JK):** TeamHub projected badges — dotted
"Proj.", post-game recalc, fewer early-season badges is CORRECT.
**Then:** EP1 → T6 → {T7,T8} → T9 → T10 → D0 cut line (F-141 holds).
**Spec-cleanup batch (queued, one ticket):** R-6 + R-8 taxonomy gospel
blocks; FINDING-144 salary-path remap residue; §17.8 background prose →
dark variants.
**Open pending-JK:** F-145 placement (EP1 vs slice 5); untracked SMB4
Rosters.csv; ASG WPA→Fame; Signature Moment card line; fame tier names;
F2 SOT typos; F4 FA trait spellings; order-flake cleanup (3 members).


---

## CURRENT STATE — 2026-06-12 (EP1 ARC CLOSED — R-8 effective-position engine live)
**Branch:** codex/franchise-v1-next. **This commit:** EP1 closure — build
(12 paths: franchiseEffectivePosition.ts + .test, salaryCalculator pool
construction, value-inputs/storage/preview/readiness + their tests,
salaryCalculator.test) + golden artifacts (scripts/ep1-golden-regression
.mjs, spec-docs/EP1_GOLDEN_REGRESSION.md) + MINOR #2 mock fix (2
processCompletedGame test files) + contracts/records + FINDING-146 CLOSED
/ FINDING-143 DELTA-CERTIFIED + session/state docs. Single commit.
**What exists & is trustworthy:** EP1 is CANONICAL. valuePosition resolves
to EFFECTIVE position — plurality-with-incumbency over per-game STARTS
(GameHeader.startingLineups, ordered date,gameId), recomputed each call,
no persisted incumbency state. League-wide Reserve pool below
RESERVE_STARTS_SHARE_THRESHOLD=0.40 (strict <). Two-way trait holders
EXCLUDED from single pools, valued compositionally (arm pWAR vs profile-
role pool + bat WAR vs trait-anchor pool; anchors C→C/IF→2B/OF→CF).
Pitchers profile-role v1. Step-percentile machinery untouched. FINDING-143
closed; the R-6 profile-position violation is resolved. Audit: EP1-AUDIT
9/10 + 4 mutations killed; EP1-GOLDEN-R-AUDIT "D8 VERIFIED" (52 players/13
changed/0 unattributed, all hand-verified, tamper-proven refusal gate).
**Both audit legs ran on Opus 4.8 Max (Fable unavailable)** — deliberate
substitution, triangle preserved, UNCHARACTERIZED config; JK browser pass
on real data is the final confirmation.
**Suite baseline:** 7,140 tests / 383 files (EP1 +13/+1 vs 7,127/382;
0 deletions). The MINOR #2 mock fix adds no test count (mock-only). CLI:
prefix `NODE_ENV= `; node ~/.nvm/versions/node/v20.20.0/bin.
**Browser-verify outstanding (JK):** (1) EP1 effective-position pooling on
real franchise data — does a player who shifts positions get repooled;
do bench players land in Reserve. (2) TV2 TeamHub projected badges (dotted
"Proj.", fewer early-season badges is correct).
**NEXT TASK: T6** (sequencing ruling F-141 holds: full T-stack to
completion before D0). Then {T7,T8} → T9 → T10 → D0 cut line. Slices 5
(season-end locking) + 6 (Captain/Fan Hopeful) queued post-T-stack/per D0.
**Open pending-JK / cleanup batch:** F-144 (salary-path R-6 residue) +
F-145 (designation 'active' vocabulary) + F-147 (stale peerPoolLimitation
written live into designation rows; couples F-145; slice 5) → taxonomy/
spec-cleanup batch with R-6/R-8/§17.8 blocks. MINOR #3 (builder reporting
underreport — 4 instances) → D0 process agenda (standing template line).
Stray Rosters.csv (commit/gitignore). ASG WPA→Fame; Signature Moment card
line; fame tier names; F2 SOT typos; F4 FA trait spellings; order-flake
cleanup (3 members).


---

## CURRENT STATE — 2026-06-14 (AI team operating setup)
**Branch:** codex/franchise-v1-next. **Product sequence unchanged:** next
product task remains T6 per the EP1 close entry above.

**What changed:** Added repo-level multi-agent setup so JK, Claude Opus 4.8,
and Codex can share instructions, skills, and browser tooling:
- `AGENTS.md` bridges Codex into canonical `CLAUDE.md`.
- `spec-docs/AI_TEAM_OPERATING_MODEL.md` defines roles, routing, build/audit
  loops, the triangle rule, and handoff templates.
- `.codex/config.toml` mirrors Playwright MCP for Codex and raises project
  instruction budget.
- `.agents/skills/` mirrors existing Claude/project skills by symlink for
  Codex discovery.
- `CLAUDE.md`, `SESSION_RULES.md`, and `DECISIONS_LOG.md` now reference the
  shared operating model.

**Verification:** Static setup only; no app code changed. Symlink discovery
and file presence verified locally. No build/test run needed for non-runtime
instruction/config/doc changes.

**Next product action:** Draft/run the T6 contract. Before that, future
sessions should read `CLAUDE.md`, `spec-docs/AI_TEAM_OPERATING_MODEL.md`,
the latest EP1 close entries, and the relevant T6 source specs/contracts.

---

## ARC SNAPSHOT — 2026-06-14 (session end): T6 + T7 stack complete

**Outgoing live-header state:** T-stack execution. Last completed = **T7c (Season
Salary Ledger)** — the T7 stack (T7a/T7b/T7c) is COMPLETE; T6 also done. Four feature
commits this session, each Codex-built → Opus-audited CONFORMS → committed:
- 6c6aa14 T6 — Effective Ratings Engine + DefensivePlacementRisk
- a28a6d2 T7a — optimal lineups vs L/R rescored on IV-of-effectiveRatings
- bb877d8 T7b — call-up/send-down advisory recs (leak-safe)
- 055cfb8 T7c — Season Salary Ledger (trackerDb v15; migration safety proven)

Suite 7,140 → 7,171 / 386; only the 3 characterized fails throughout; golden / SMB4 /
oracle / salaryCalculator byte-unchanged on every ticket.

**Next action:** **T8 — Mode 1 Suite (§6 + §7)** → T9 (GameTracker sub-rec rebuild) →
T10 (Lineup Delta WPA) → D0.

**Workflow rulings (JK 2026-06-14):** standing auto-commit mode; batched browser
verification (SESSION_RULES pen); no-oracle-leak principle (DECISIONS_LOG).

**Browser-batch backlog (one pass pre-D0):** EP1, TV2, T7a, T7b, T7c.

**Deferred/open:** FINDING-148 (AUX_PRICING L/R, oracle regen); payroll-expectation →
fan-morale (declared-budget design); execute-from-rec; deadMoneyRate league presets.

---

## 2026-06-14 — T8 arc (T8a / T8b / T8c committed; T8d pending)

T8 (IV §5/§6/§7 — Mode 1 League Construction Suite) mapped via a 6-agent decorrelated workflow
(→ `T8_SCOPE_MAP.md`), split into 4 engine-first tickets (JK-ratified), 3 of 4 built + audited
CONFORMS + committed:
- **T8a (a4ec4fb)** pure `leagueConstruction.ts` engine (composeIdentity / applyIdentitySelection /
  identityCapShift / shiftLuxuryCaps / luxuryTax / derivePickValueChart / validateTrade) ported
  decision-identical from `analyze-pool.py` — independent oracle cross-check 10/10. Decreases optional
  per JK. Pre-build, Codex caught a real tiebreak flaw (RAW vs fraction magnitude); Captain fixed the
  contract (MOD_STAT_XBL_CAP) during the battery pause.
- **T8b (8fdf2c0)** tier/balanceMode wiring + `registerPool` + ADDITIVE `kbl-league-builder` v5→v6
  (`registeredPools` store; ZERO rewrite, proven by a raw-record migration test). JK approved.
- **T8c (d54724d)** Team Identity Composition UI (band point-allocation + free mod edit + cap-shift
  preview), additive `Team.capIdentity` field (no migration). JK approved.

Suite 7,171 → 7,189 / 388; the frozen surfaces (tierParams / ivEngine / salaryCalculator / iv_oracle)
byte-unchanged throughout. Scope correction: Path A salary already IV-based (T5/D15) — not rewritten.
Standing auto-commit for pure tickets; risk-gated surface-before-commit for persistence/UI tickets.

**NEXT:** **T8d** — snake draft + pick-value chart + trade validator UI + per-team solvency signals +
chemistry potency overlay + farm scout-obscured IV (the big one; likely splits; map first) → T9 →
T10 → D0.

**Browser-batch (pre-D0):** + T8b, T8c (added). **Deferred:** FINDING-148; payroll-expectation →
fan-morale; T11 auction; T12 pool recalibration.

---

## 2026-06-15 — T8d COMPLETE + T9 COMPLETE (single session)

Two full arcs mapped → split → built → independently audited CONFORMS → committed. Per ticket: Captain
(Opus 4.8) mapped via decorrelated workflow + authored every contract + AUDITED every diff; Codex 5.5 BUILT;
auditor ≠ builder. Pure tickets auto-committed; persistence/user-visible tickets JK-approved before commit.

**T8d — snake-draft suite** (`T8d_SCOPE_MAP.md`; 7-agent map; JK ruled 5 forks: budget=tierCap,
position-agnostic cheapestFillCost, defer R12 + R9, mode-aware solvency → 3-ticket split):
- **T8d-1 (9f94412)** pure snake + solvency engine (`buildSnakeOrder`, `cheapestFillCost`, `pickMarginalTax`,
  `assessSolvency` → GREEN/YELLOW/RED/BLOCKED; mode-aware charge-faithful). +SOLVENCY_RED_MARGIN/SEVERE_TAX_FRAC.
- **T8d-2 (2a5cd95)** MLB snake-draft board + `kbl-league-builder` v6→v7 ADDITIVE (`mlbDraftSessions` store;
  raw-v6 migration test proves 9 prior stores survive); dual-write (mlbRoster + leagueAssignments) for the
  22+10 handoff; new route/tile; farm draft untouched. JK approved.
- **T8d-3 (2738cf5)** board overlays (pick-value chart + advisory trade validator + on-demand cross-team
  signals) — closes the last 2 T8a engine orphans. JK approved.

**T9 — in-game sub-recommendation rebuild** (`T9_SCOPE_MAP.md`; 4-agent map; decisive finding: ratings+traits
already in live state — no deep useGameState plumbing; JK ruled 4 forks: IV-of-effectiveRatings delta /
per-type threshold / new pure engine / 2-ticket split; + pure IV-delta firing gate):
- **T9a (ef85c80)** pure `subRecommendations.ts` (`recommendSubs`): IV-of-effectiveRatings scoring (same
  recipe + byte-identical clamp as rosterAnalyzer — audit-diffed; T7 untouched); role-misuse mojo shift;
  DefensivePlacementRisk fold; per-type `SUB_REC_THRESHOLD`. +additive effectiveRatings exports +
  `activeTraitNames`.
- **T9b (93763ee)** GameTracker integration — 3 generators rebuilt onto recommendSubs; rec call-site widened
  to feed full ratings/traits/mojo/fitness/opposing-player (orphan trace verified); `PRESSURE_LEVERAGE_BANDS`;
  pure IV-delta gate (situational heuristics removed); output type + watch/UI unchanged. JK approved.

Suite 7,189 → 7,220 / 391; only the 3 characterized fails throughout (wpaRuntimeBoundary unchanged). All
frozen/engine/handoff surfaces byte-unchanged per ticket; every gate independently re-run by the Captain.

**NEXT:** **T10 — Lineup Delta WPA** (last T-stack ticket; map first — wpaCalculator/winExpectancyTable/
leverageCalculator + lineup surfaces + wpaRuntimeBoundary allowlist) → **D0** cut line → D1–D8 → F-138 →
flag flip → iPad playtest.

**Browser-batch (pre-D0):** + T8d-2 (snake board), T8d-3 (overlays), T9 (in-game recs). **Deferred:** R9
scout-obscured farm IV-range; R12 chemistry potency overlay; FINDING-148; payroll-expectation → fan-morale;
T11 auction; T12 pool recalibration. **LOW doc cleanups:** vestigial rec-input fields; kbl-gotchas.md stale
5-level mojo (code is 6-level).

---

## 2026-06-15 — T10 COMPLETE → T-STACK COMPLETE → D0 next

**T10 — Lineup Delta WPA standard + per-season constants snapshot** (commit `5010126`). Mapped via a 6-agent
decorrelated fan-out + 2 critics (`T10_SCOPE_MAP.md`, all decision-critical claims Captain-verified); 3 JK
rulings (DECISIONS_LOG 2026-06-15); single "high" ticket (no split — the SeasonMetadata-hash mechanism adds no
DB migration). Codex 5.5 BUILT → Opus 4.8 audit CONFORMS (auditor ≠ builder) → JK APPROVED (persistence) →
committed. **Decisive map finding:** the §8.1 optimizer + lineup-lock snapshots + the literal §9 delta
(`summarizeLineupSnapshotComparison`) were ALREADY built but display-only, and the already-PERSISTED
`managerWpa` is a DIFFERENT realized-vs-projected number. So T10 = persist the pure projected-vs-projected
scalar additively (`ManagerLineupDeltaSummary.lineupDeltaWpaStandard`, both managers) WITHOUT touching the
realized `managerWpa` or the `managerValue` rollup, + a §12 full-dependency FNV-1a content hash
(`optimizerConstantsSnapshot.ts`; tierParams excluded) stamped write-once on `SeasonMetadata` (no DB bump,
warn-once on drift). "WPA" documented as rescaled IV per D9 (§9 spec note; rename→v2). Verify: tsc 0 / build 0
/ suite 7,230 / 393 (only the 3 characterized fails) / wpaRuntimeBoundary unchanged / engines+data
byte-unchanged. **T-STACK (T4→T10) COMPLETE.** Next = **D0** cut line (FRANCHISE_PLAYABLE_V1_DEFINITION) →
D1–D8 → F-138 → flag flip → iPad playtest.

**Browser-batch (pre-D0):** + T10 (persistence-prioritized: per-game `lineupDeltaWpaStandard` persists for both
managers + survives reload; overlay/almanac totals unchanged; season `optimizerConstantsHash` survives
backup/restore). **New deferred ticket:** backupRestore.ts v12 stale-schema hardening (drops v13/v14/v15
stores). **LOW:** summary stamps version via a full hash recompute (cleanup).

---

## 2026-06-15 → 2026-06-16 — LIVING-SEASON DESIGN + §18 VERIFICATION READS (1)–(3)

**Outgoing header at this arc's start:** T-STACK (T4→T10) COMPLETE + LIVING-SEASON (Phase-2) DESIGN COMPLETE
(`FRANCHISE_V1_LIVING_SEASON_SPEC.md` §0-24); next = §18 verification reads, reporter first. Suite 7,230 / 393.

**This arc (2026-06-16, reads + design + docs only — NO product code):** §18 verification reads (1)–(3) COMPLETE,
each certified by a parallel-mapper + adversarial-verifier Workflow and ruled by JK. (1) **Reporter** →
`REPORTER_CERTIFICATION.md` + REP-1..4 (in-game cadence = post-game columns only; live GameStory canonical;
franchiseId-keyed; accuracy in §24) + SEA-1..5 (season-long narrative = a sim-tunable "publish bus" built EARLY in
Phase-2; most beats gated on their unbuilt Phase-2 event source). (2) **Traits-from-reality (§9)** →
`TRAIT_SIGNAL_CERTIFICATION.md` + TS-1..13 (acquisition = reality-percentile × personality × morale; min-sample
valve = Franchise-lite; role-eligibility 25 pitcher / 39 position / 7 universal / 1 cut; §9 engine on
`traitInteractionMatrix`; net-new capture = pitch-zone + OF-arm + injury accumulator). (3) **Draft/salary/farm
(§18.3)** → `DRAFT_SALARY_FARM_CERTIFICATION.md` + DSF-1..4 (unify rookie+farm on a tier-scaled relative-to-pool
scale; tradeable DRAFT PICKS; `farmGradeMode` skew; in-season draft deferred post-v1). A live Anthropic **529
overload** hit mid-§18.3 (lost 2 salary mappers + 2 verifiers; core 3-way corroborated, rulings locked; re-resume
`wf_1c5ff7c9-da3` hardening). The builder/auditor triangle stayed dormant (nothing built to audit). **Next =
§18(4) Manager WPA for MOY** (run fresh against a recovered API), then the Phase-2 "living-season D-stack"
sequencing folding in the build tickets these reads unblocked.

---

## 2026-06-16 — §18 VERIFICATION READ (4): MANAGER-WPA / MOY (the LAST §18 read)

**Outgoing header at this arc's start:** §18 reads 1-3 COMPLETE; only §18(4) Manager-WPA-for-MOY remains; next then =
Phase-2 D-stack sequencing. Suite 7,230 / 393 (unchanged — no product code).

**This arc (2026-06-16, reads + design + docs only — NO product code):** §18(4) COMPLETE via a `moy-reconciliation-read`
Workflow (5 decorrelated mappers + 3 adversarial verifiers + 1 completeness critic; the critic's 3 headline findings
re-verified by the Captain at file:line) → `MANAGER_WPA_MOY_CERTIFICATION.md` + **MOY-1..7** (DECISIONS_LOG 2026-06-16).
Certified: the v2 Manager-WPA truth-layer is real/live-wired/persisted (decision-WPA = true team win-prob delta × share,
`managerWpaDerivation.ts:1734-1747`); the three §23.7 reconciliations (denomination / weighting / salary-drop) are all
real and all UNIMPLEMENTED. The read CORRECTED AWARD-7's framing three ways: (i) the live composite is FOUR quantities
(tactical + **deployment** + lineup), not three, and team record is NOT in the sum; (ii) MOY is NOT greenfield — a live,
persisted, displayed per-game `best_manager` award already ships the exact composite (`pogAwards.ts:589-590`, gate
`MIN_POSITIVE_WPA=0.005`), so season MOY is a season-grain aggregation of it; (iii) name/scale trap — the live composite
sums the CAPPED REALIZED record `delta.managerWpa`, while §23.7 names the ORPHANED T10 `lineupDeltaWpaStandard`.
Rulings: **MOY-1** inputs = 4 (decision + deployment + lineup + record); **MOY-2** lineup-quantity DEFERRED to build;
**MOY-3** record = expectation-relative on the **D6 trusted artifact** (MOY HARD-couples to D6, sequences POST-D6/D8 in
D9); **MOY-4** NO fame tilt v1; **MOY-5/6/7** (Captain) build = season aggregation of the `pogAwards` composite into a
NEW `franchiseAwardsEngine`/`Storage` (retire the dead-gated salary `mwarCalculator`/`calculateMOYVotes`), pool-relative
normalization dissolves the denomination, weights → Sim Gate (§16). The deprecated salary MOY was already dead-gated
behind `FRANCHISE_V1_OFFSEASON_EXECUTION_ENABLED=false` → retiring it re-points, never breaks. Builder/auditor triangle
stayed dormant (nothing built). **ALL FOUR §18 PREREQUISITE READS DONE. Next = the Phase-2 "living-season D-stack"
sequencing for JK ratification** (fold in the §18-unblocked tickets incl. the MOY engine; reconcile the D9/D7 couplings;
D0 ratification still PROPOSED/pending).
