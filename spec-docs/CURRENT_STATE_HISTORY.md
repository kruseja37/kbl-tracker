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

---

## 2026-06-16 — PHASE-2 D-STACK SEQUENCED + RATIFIED + AUTONOMOUS BUILD RUN (design → the D6a value gate)

**(OUTGOING snapshot:)** Going in, the live header was the DESIGN state: the Phase-2 L-stack sequencing drafted +
LSD-1..5 ruled + LSD-6 (living season IS part of v1), NEXT = D0 ratification + contract L1.

**This session's arc:** (1) **DESIGN** — drafted `FRANCHISE_V1_LIVING_SEASON_DSTACK.md` (the L-stack L1–L14 +
L-SIM + economy), audit-hardened (12-agent workflow), JK ruled LSD-1..6, **D0 RATIFIED**, the awards reframe
(MOY→D9; fame-ready seams). (2) **AUTONOMOUS BUILD RUN** (JK set up AUTH-1 auto-commit + AUTH-2 build-to-spec; the
Codex-builds/Opus-audits triangle on every diff): **7 feature commits + D5 confirm** — L1 (`d48ab3c`), D1
(`752882f`), D2 (`2fab709`), L1.5+OD-1 (`2f4f3e5`), L4a-connect (`0cf4ca2`), L4a-bus (`8074976`), **D6a** (`4a1bd36`
— the make-or-break True-Value TRUST gate, LIVE half; JK ruled SEASON-END FREEZE). Mid-run JK corrected an
over-cautious wrap (I'd set aside OD-1, an obvious default) → recalibrated + kept rolling → batched browser
verification → directed "D-stack to the value gate" → D5 confirmed + D6 mapped/ruled + D6a built. A browser
pre-check confirmed the app loads + L1.5+OD-1 in the runtime; a full-suite run at close caught + fixed one
self-inflicted regression (a stale v15 version-pin test) → suite back to the characterized 3-fail baseline
(7,251/3 of 7,254 / 400 files; trackerDb v17). (3) **WRAPPED at D6a** for fresh-context continuation. **NEXT =
D6b (season-end freeze) → D7 (designations live incl. Albatross) → D8 → D9.** Open: OD-2..5, the D4 scope snag,
the soul-layer "build to spec" greenlight. Detailed per-ticket trail in `AUTONOMOUS_RUN_LOG.md`.

---

## 2026-06-16 → 2026-06-17 — OVERNIGHT AUTONOMOUS CONTINUATION (AUTH-4): D6b → D9 COMPLETE (9 more commits)

**This run's arc:** Picking up at D6b under AUTH-4 (overnight unattended — the Captain makes every call, takes
documented conservative defaults where the spec is silent, never stops for JK, only SET-ASIDE-AND-CONTINUEs on a
genuine safety wall), the Codex-builds/Opus-audits triangle held on every diff (auditor re-runs tsc/build/full-suite,
reads the diff, greps invariants, mutation-tests load-bearing logic). **9 feature commits** completed the D-stack
value→awards spine:

- **`6559a19` D6b** — season-end FREEZE of the trusted-value artifact (frozen flag + idempotent freeze helper +
  Layer-A anti-thaw guard + Layer-B recompute early-return that locks both the artifact and the
  `franchiseTrueValueRows`; freeze on both season-complete paths; mutation-proven).
- **`abfa167` D7a** — designations LIVE: the dual path reconciled to the persisted store canonical; TEAM_MVP/ACE
  promoted 'projected'→'active' only when the eligibility path marks the exact holder active; ephemeral
  `DesignationEvent` with the morale/fame firewall intact.
- **`013d886` D7b** — Albatross live + **closed the untrusted-value LEAK** (canonical selection filters to the D6
  ≥2-peer trusted set; mutation-proven) → **D7 COMPLETE**.
- **`14c90fd` D8** — award-trust GATE: `trustedForAwards`/`finalWarTrusted`/`consumerThresholdsProven` promoted to
  COMPUTED off the D6 FROZEN artifact (requires `artifact.frozen===true` — a deliberate tightening vs D7) + the
  adaptive qualifier helper via `scaledThreshold` (no hardcoded 162/9) + the written `AWARD_TRUST_CONTRACT.md`.
  Frozen-gate mutation-proven. (trackerDb stayed v17 for D6b/D7/D8.)
- **`53ffd4c` D9a** — D9 SPLIT (D9a/b/c/d). The pure dark-store persistence diff: 2 new IndexedDB stores at trackerDb
  **v17→v18** — `franchiseAwardsRows` (LSD-1 fame seams baked in: candidate margins / fWAR-total split / nullable
  voteWeight / reserved KK-Bust-Comeback) + `franchiseTrueValueSnapshots` (per-game trough history) — with the full
  backup-parity lockstep (register both byte-mirrored, pin 18, optional:true; KBL_BACKUP_VERSION stays 2) + round-trip
  + the proven pin-trap test updated. Stores DARK.
- **`9fa540d` D9b** — the 5 WAR-category awards ENGINE (additive/dark): pure `computeFranchiseWarAwards`
  (MVP=totalWar / Cy Young=pWAR / RoY=top totalWar∩rookies / Gold Glove=fWAR+split seam / Silver Slugger=bWAR) off the
  frozen artifact + D8 gate + adaptive qualifiers; deterministic (mutation-kill proven). `computeAndPersist…` writes
  the D9a store finalized:true. Never recomputes TV.
- **`443c86c` D9c** — Manager of the Year → the **6-category engine COMPLETE**: MANAGER_OF_YEAR = season aggregation
  of the live per-game pogAwards manager composite + the wins-above-D6-expectation record term (expected = frozen
  value-share × gamesPerTeam, derived only from the frozen artifact — no trusted expected-wins source exists),
  pool-normalized; one finalize, all 6. Record-term determinism mutation-proven; mwar retirement deferred (safe).
- **`d814c52` D9d-1** — engine WIRED to the app (D9d split D9d-1 wiring / D9d-2 UI): the season-end finalize TRIGGER
  calls `computeAndPersistFranchiseWarAwards` after the D6b freeze on BOTH paths (awaited in checkSeasonComplete;
  `.then`-chained on the isSeasonOver effect; computedAt=frozenAt byte-stable) + the game-1
  `franchiseTrueValueSnapshots` capture on `processCompletedGame` (deterministic checkpoint = scheduled gameNumber ??
  gameId, idempotent, own try/catch, regular-season-only — LIVE GAME PATH).
- **`c229733` D9d-2** — the awards UI → **D9 COMPLETE**: NEW `AwardsWatchlist.tsx` Mode-2 regular+playoff tab (gated
  `seasonPhase !== "offseason"`, separate from the dead-gated offseason ceremony, NO flag flip; read-only; renders the
  6 categories + winner + candidate margins; finalized rows when present, else the in-season PREVIEW) + the pure
  read-only `computeFranchiseAwardsPreview` (looser `warLikePreviewAvailable` gate, finalized:false, never persisted;
  the frozen-gated finalize path byte-unchanged) + the gated manifest flip (awards-watchlists blocked→included +
  awardsImplemented, gated on finalized rows, contractVersion bumped → `…-v2-awards-manifest-v1`, wave4 pin updated as
  a sanctioned baseline shift + a new blocked-when-absent case).

**Infra:** a 6h40m Codex hang (first D6b dispatch) was root-caused (stalled model-API stream, no edits written) +
killed clean + re-dispatched — every `codex exec` dispatch now runs under a 30-min watchdog so a stall self-recovers.
**Verification at close:** the full suite was independently re-run at every ticket and ended at **7,288 pass / 3
characterized fail (7,291 total, 406 files)** — the only fails the documented trio (wpaRuntimeBoundary /
franchiseManualSmokeFixture / franchiseNarrativeEventEligibility); ZERO new reds across the whole run. trackerDb
**v18** / KBL_BACKUP_VERSION **2**. **WRAPPED at D9 COMPLETE** (JK-directed close — JK returns to drive D10). **NEXT =
D10** (Mode-2 season summary/manifest finalize WITH awards + active designations) → D11–D13 → soul layer (L-stack).
Browser sign-off (the sole real-world acceptance gate) batched for JK across the live-game/UI surfaces (D6b freeze,
D7 designations, D9d-1 snapshot/finalize, D9d-2 AwardsWatchlist). Tracked D9 follow-ups: per-player profile/Almanac
award display; the mwarCalculator/calculateMOYVotes retirement (pre-flag-flip cleanup). Open: OD-2..5, the D4 scope
snag, the L-ECON1 + F-144 safety-wall set-aside. Detailed per-ticket trail in `AUTONOMOUS_RUN_LOG.md`. All on
`codex/franchise-v1-next`; nothing pushed.

---

## 2026-06-17 — ATTENDED SESSION (JK present): D10 + DESIG-RECON + D11 + the soul-layer opener (L3, L6a)

Resumed from the overnight D9-COMPLETE state. JK present throughout for design rulings. **9 feature commits**, every
code diff Codex-built → Opus-audited independently (tsc/build/full-suite re-run, diff read, invariants grep'd, key
claims test-proven), zero new reds across the whole session.

**Design rulings (DECISIONS_LOG 2026-06-17):** OD-2..5 + D4 (incl. correcting an IV≠TV conflation — OD-2 economy
scale never touches performance-based True Value); the full **DESIG-RECON** team-designation model (6 designations all
live in v1: Albatross spec-guards [2× salary + materially-overpaid], Fan Favorite promoted no-floor [Brock-Purdy
logic], Captain no-minimum badge, Fan Hopeful visible-safe [top-3 by scouted grade], Cornerstone CUT; effects dormant
until Phase-2); the **soul-layer "build to spec" GREENLIGHT**; the **L3** structural rulings (fresh clean matrix engine,
reuse the kbl-franchise-morale store, build-dark) and the **L6** plan (defaults, no new fork — §20 LOCKED).

**Commits:** `51e487a` D10 (Mode-2 season summary WITH league awards + canonical designation count + de-"no-awards"
copy) · `b48b450` DR-1 (Albatross guards + FF promote + Cornerstone removal + orphan delete — cleared the narrative
RED, characterized set 3→2) · `9d1db40` DR-2 (Captain no-min + Fan Hopeful visible-safe assignment) · `bd6b43c` DR-3
(team-hub six-designation strip) · `6e1df3c` DR-4 (spec reconciliation to MODE_2_V1_FINAL §17) · `5eaf9d9` D11 (UI
live-label sweep + smart-label D4 value panel, promote-surface/keep-effect with the keep-list intact) · `5b1431d`
L3a + `d46a071` L3b → **L3 COMPLETE** (the Master Morale Matrix spine: pure deterministic engine + the dark store
wiring, build-dark behind a Phase-2 flag, defense-in-depth, parity-guard extended to kbl-franchise-morale) · `7359cbf`
L6a (the pure Fame engine: §20.7 nine-tier Heat/Reach, trade-reset, WAR-gravity, fame-vs-merit, channel aggregates,
firewall-pure).

**End state:** D-stack D1–D11 done (D12 manual smoke + D13 checkpoint = JK gates). Soul layer underway, all DARK
(no live morale/fame until after D13): **L3 COMPLETE**, **L6a done**, **NEXT = L6b** (the fame store + dark wiring —
trackerDb v18→v19, KBL_BACKUP_VERSION stays 2 per D9a precedent, C-4 backup DoD). Suite **7,265 pass / 2 characterized
fail (7,267 total, 407 files)** — characterized set shrank to wpaRuntimeBoundary + franchiseManualSmokeFixture (DR-1
cleared the third). Browser-verify backlog #1–#15 (JK; the D10/DR-3/D11 surfaces added). All on
`codex/franchise-v1-next`; nothing pushed.

---

## 2026-06-17 (attended → AUTH-4) — L6 (Fame) COMPLETE + L5a; CONTEXT-HANDOFF at L5b

Session resumed ATTENDED at L6b, then JK left and switched to AUTH-4 mid-session. Every diff Codex 5.5-built → Opus
4.8-audited independently (full-suite re-run, diff read, invariant greps — never the builder paste). Commits:
**`3b36d35` L6b-1** (`franchiseFameRecords` store + 3-place backup parity, trackerDb **v18→v19**, optional:true,
KBL_BACKUP_VERSION stays 2, dark/EMPTY — zero non-test callers; dispatch #1 correctly BLOCKED on the
`franchiseSeasonLedgerStorage.test.ts` version-pin, swept + fixed + captured to the `trackerdb-version-bump-test-pins`
memory) · **`5a7685a` L6b-2** (Phase-2 fame flag default-OFF + per-game DARK fame compute [decay-on-write, reach
ratchet, wasNegative latch, re-entry guard; event-driven, WAR-gravity DEFERRED per JK; inactive-player no-decay per JK]
+ processCompletedGame wiring; one FIX round — build #1 hand-rolled a raw kbl-schedule open, Opus caught it, replaced
with the canonical getScheduledGame, locked by a no-raw-open test) → **L6 COMPLETE** (with L6a `7359cbf`). ·
**`428f7cb` L5a** (the pure §8 fan-morale ratings DAMPENER — directional counter-trend brake, personality ×
Resilience/Ambition × Loyalty, sim-tuned/shape-locked; pure, no consumer until L8). Suite arc 7,267/407 → 7,280/410
(2 characterized fails throughout, zero new reds). trackerDb **v19**, KBL_BACKUP_VERSION 2. Adopted two new
SESSION_RULES protocols (WAITING-ON-JK, CONTEXT-HANDOFF). Browser-batch added: L6b-1 DB v18→v19 migration + backup
round-trip; L6b-2 flag-OFF game-completion. ENDED via CONTEXT-HANDOFF (clean boundary, heavy context) → fresh session
resumes at **L5b** under AUTH-4. All on `codex/franchise-v1-next`; nothing pushed.

---
## OUTGOING SNAPSHOT — 2026-06-17 (AUTH-4 resume thread, CONTEXT-HANDOFF → L5c)

Resumed at L5b under AUTH-4 (fresh sandbox thread). RESTATED: Phase-2 L-stack; last=L5a `428f7cb` (§8 dampener);
next=L5b. **L5b (flashpoint-decay accumulator) BUILT + independently AUDITED VERIFIED, but UNCOMMITTED + two gates
UNOBSERVED** due to the sandbox: NEW dark `franchiseFlashpointDecay` store + default-OFF flag + pure compounding-clamped
tax engine + dark per-game compute wired into processCompletedGame (seam-neutral — `resolveTurnedOnPlayers` returns []
until L7/L10/L13). trackerDb v19→v20, KBL_BACKUP_VERSION 2, pin-trap updated. Mirrors L6b exactly. tsc 0 + 40 targeted
tests green + frozen-byte-unchanged observed; full `vite build` + full suite could NOT run (>42s killed) and the diff
could NOT be committed (mount blocks git unlink). Decorrelated sub-agent auditor (≠ builder) → VERDICT VERIFIED, 10/10,
risk LOW. Host must build + run full suite + commit the 15 files on codex/franchise-v1-next. WAITING_ON_JK.md written.
Suite baseline (last host-observed, post-L5a) 7,280 pass / 2 characterized fail; trackerDb host-state v19 (v20 after
the L5b commit lands).

---
## OUTGOING SNAPSHOT — 2026-06-17 (AUTH-4 host resume thread, CONTEXT-HANDOFF → L7c)

Resumed the L5b CONTEXT-HANDOFF on the HOST (node v20 + git write + codex CLI). JK present; chose "commit + continue
under AUTH-4." Did the session-start reads, RESTATED, proceeded. **10 commits**, every code diff Codex 5.5-built → Opus
4.8 independently audited (auditor ≠ builder: full-suite re-run, diff hand-read, purity/byte-unchanged/invariant greps),
ZERO new reds throughout. All on `codex/franchise-v1-next`; nothing pushed.

- **L5b `5ebb148`** (+docs `7a7a8e8`) — handoff cleared: host-verified the audited sandbox diff (build 0 + full suite
  within baseline) and committed the 14 flashpoint-decay files; cleaned + gitignored the sandbox junk (Temp/, sentinels,
  .git_writetest_probe, WAITING_ON_JK.md, Progress_Summary.md, HANDOFF_*).
- **L5c `8cd2cc1`** (+docs `268dd1a`) — pure §13 in-season trade-request generation engine (the loyalty inversion: angry
  fans → loyal players bolt MORE; signed loyalty term gated on fan sentiment; intensity dial).
- **L5d `e061e51`** (+docs `016eea1`) → **L5 COMPLETE (a–d)** — pure §13 reporter-intensity tooth (fan morale →
  press-heat NarrativeIntensity; live LLM reporter byte-unchanged; seam deferred post-D13).
- **L7 SPLIT L7a–d.** **L7a `0a59a24`** (+docs `17ad4a0`) — filled L5b's `resolveTurnedOnPlayers` seam (async +
  resolves each game's home+away active|locked ALBATROSS via `getFranchiseDesignationRow`; doubly-dark, no store/version
  touch). **L7b `77feeda3`** (+docs `2a493e0a`) — pure §20.4 Channel-C designation→fame nudge engine (FF +2 /
  Albatross −1 / MVP·Ace +1.5 sim; Captain/Fan Hopeful → L7d; fame-store wiring deferred seam).

Suite arc 7,280/410 → **7,327/416** (2 characterized fails throughout: `wpaRuntimeBoundary` + `franchiseManualSmokeFixture`;
zero new reds). trackerDb **v20**, KBL_BACKUP_VERSION 2. Codex-build → Opus-audit via `codex exec` background dispatch
(perl alarm watchdog) worked cleanly on the host. ENDED via CONTEXT-HANDOFF (clean boundary after 5 tickets, heavy
context) → fresh session resumes at **L7c** under AUTH-4. NEXT after L7c: **L7d** (Captain router effects + Fan Hopeful
cushion + Fan Favorite double-dep) → {L8, L9b, L10} → {L11–L14} → L-SIM gate.

---

## 2026-06-18 — AUTH-4 overnight: L7 COMPLETE + L2 COMPLETE → CONTEXT-HANDOFF → L8

Fresh session resumed at the L7c CONTEXT-HANDOFF, did the 5-file session-start reads + RESTATE, JK confirmed **AUTH-4
autonomous**, then ran the build→audit→commit loop (every diff Codex 5.5-built → Opus 4.8-independently-audited →
auto-committed on `codex/franchise-v1-next`; nothing pushed). Delivered, in order:
- **L7 (designation Phase-2 completion) COMPLETE:** L7c designation→fan-morale steady sentiment + Channel-A tilt
  `886d1dce` (double-count guard: Albatross steady = 0, §13 flashpoint owns it) · L7d-1 Captain morale-router (Charisma×2
  + perf-swing amp) `f61dcae0` · L7d-2 Fan Hopeful call-up cushion `aec5db99` · L7d-3 FF double-dep reconciliation
  (doc-only — value-half DR-1 + morale-half L7b/L7c already exist; no orphan composer).
- **L2 (franchise-instance mutable ratings-overlay layer) COMPLETE:** L2a dark `franchiseRatingsOverlays` store
  `6fdeba11` (trackerDb **v20→v21**, 3-place backup parity, **v20→v21 migration-survival proven**, KBL_BACKUP_VERSION
  stays 2, oracle locked) · L2b overlay merge math `e8ec0908` (base + confirmed active deltas; temporary absolute-expiry;
  base never mutated) · L2c two-tier confirmation infra `a77e0ed5` (console instruction + idempotent confirm transform +
  revert reminder + change log). All three pure/dark; the live read-path/confirm wiring + the writers are later tickets.

Suite arc **7,325/416 → 7,386/422** (2 characterized fails throughout: `wpaRuntimeBoundary` +
`franchiseManualSmokeFixture`; ZERO new reds). trackerDb **v21** (only L2a bumped it), KBL_BACKUP_VERSION **2**.
**Order-flake note (flagged for JK, not regressions):** `AwardsWatchlist.test.tsx` + `GameTrackerLaunchState.test.tsx`
both surfaced once in full-suite runs but PASS SOLO — non-deterministic worker-pool ordering, same family as the
documented conditional-solo flakes; added to the order-flake root-cause batch. Dispatch mechanism: `codex exec`
background + a shell-native watchdog (macOS has no `timeout` — see the `codex-dispatch-watchdog` memory). ENDED via
CONTEXT-HANDOFF (clean boundary after 7 feature commits + heavy context) → fresh session resumes at **L8** under AUTH-4.
NEXT: **L8** ratings development (first real writer through L2; every-20% checkpoint × §8 dampener × personality ×
Ambition/Resilience → overlays via L2 confirm; ratings only; likely SPLIT L8a/L8b) → L9a → L9b → L10 → L11–L14 → L-SIM gate.

---

**2026-06-18 (outgoing snapshot — superseded by the L9b-rebuild checkpoint):** L10 COMPLETE (random events,
build-DARK; L10-1..5) → JK ruled Q1–Q12 → FINDING-150 (L9b had built only 16 of ~50 buildable traits) → trait
measurement model RATIFIED (`TRAIT_MEASUREMENT_SPEC.md §0`, `703d78b9`) → `ROADMAP_TO_V1.md` created (`dc0ad199`).
Handoff to the L9b rebuild at R-E. Suite 7,559/438; trackerDb v23; branch codex/franchise-v1-next; nothing pushed.

**2026-06-18 (L9b-rebuild checkpoint — this session):** the L9b trait-reality REBUILD started; R-E + R1-a landed.
(1) Spec-leak root-caused + fixed → ONE authoritative measurement source (`TRAIT_MEASUREMENT_SPEC.md` §0.6 cited
proxy table / §0.7 code-deltas / §0.8 gates / §0.9 R1 derivations), stale framing purged across 4 spec docs; rulings
durable in DECISIONS_LOG (`d71767aa`). (2) R-E COMPLETE — `9eeb69d5` (E2 charisma + positive-Resilience + 3 live
latent-bug fixes) + `fc3d9dab` (E3 displacement-on-recomputed-P); E1 deferred to R3. (3) R1-a COMPLETE — `a5126afb`
(10 clean outcome-proxy traits). Earnable v1 set 16 → 26; all build-DARK; builder≠auditor + full host gate each.
Suite 7,584/438, 7,582 pass / 2 characterized fail; trackerDb v23. NEXT: R1-b (6 ruled-gap traits per §0.9, SPLIT
b1 AtBat-proxies / b2 Two Way+Utility+opt-in) → R2 → R3 → L11–L14 → L-SIM gate. FINDING-150 rebuild in progress.

---
2026-06-18 (attended session, outgoing — SESSION-END CHECKPOINT) — L9b TRAIT-REALITY REBUILD COMPLETE. The
FINDING-150 trait-from-reality engine ("game-changer feature") is fully BUILT + WIRED + the Two Way C/IF/OF family
done — all build-DARK (isFranchisePhase2TraitsEnabled OFF), activates post-D13. 8 commits this session, each
builder≠auditor → independent diff audit → full host gate → commit: R1-b1 474196e7 (Big/Little Hack, Base Rounder,
Distractor) · R1-b2 bbb839ce (Utility, Crossed Up, Bunter) · R2 b80fa135 (count-family, First-Pitch, 6 handedness
splits) · R1-b3 7e22e015 (Two Way earn-signal) · R3 9059f697 (Ace Exterminator → 47/47 earnable) · W1 6a934a9e (wire
the 4 dormant input maps from roster: handedness/primary-position + pitcher grade via scoreSmb4Player) · d4ebc357
(name the PRE-ACT-TRAITS gate) · PRE-ACT-TRAITS-1 bf10dcfa (Two Way C/IF/OF family: FNV-1a(playerId) seed +
poolTraitKey family pool, no grant-path/scorer/acquisition surgery). Every measurement/wiring/design ruling is in
TRAIT_MEASUREMENT_SPEC.md §0.6–§0.11 + DECISIONS_LOG (the single source). Suite 7,686/438, 7,683 pass / 3 characterized
fail (wpaRuntimeBoundary + franchiseManualSmokeFixture + 1 intermittent solo-passing order-flake), ZERO new reds
throughout; trackerDb v23; nothing pushed. NAMED PRE-ACTIVATION GATE: PRE-ACT-TRAITS-1 (Two Way family) DONE; remaining
-2 = JK/browser end-to-end activation verification (pairs with F-141), -3 = standing opposingHand note. A concurrent
unattended resume sandbox briefly parked WAITING_ON_JK ticket:R3 (RESOLVED; its stale CURRENT_STATE/HISTORY writes
reverted). NEXT PHASE: the L-stack (L10 Q5/Q8 rework → L11 → L12–L14 → L-SIM gate) + the §16 sim-tune FINDING at the
L-SIM gate. JK asked at checkpoint for a UI-remaining assessment (UI cleanup planning).

---

**2026-06-19 (ATTENDED session) — L12-3 COMPLETE (the race-standing system).** Picked up at L12-1+L12-2 done; built the
entire L12-3 stack over one long attended session (Codex-built → Opus-audited per ticket, branch-only, nothing pushed):
**L12-3a `5ce0d940`** (pure composite engine — per-race-type weighted composite + Q3 close-race fame-tilt + score-gap bands
+ Q4 GG `fWAR+20%·defensiveFame` blend; + Bench/Booger merit selectors) · **L12-3b `da554ed7`** (the dark per-game recompute
gate branch — orchestrator wiring the composite + the L12-2 TV scorer; recompute-only) · **L12-3c `7f78618e`** (Bench/Booger
standings — the D9-adjacent reserve filter + relaxed qualifier + a reusable `computeFranchiseRaceCandidateRows` exporter) ·
**L12-3R-1 `036d842e`** (the LIVE/saved-shape `pitchingWpa` season rollup — additive-optional field + ungated aggregator
accumulation, no DB churn; browser-verify batched #24) · **L12-3R-2 `cd7a4eae`** (the dark Reliever-of-Year binding —
pitchingWpa basis, pure-reliever `gamesStarted===0` filter + relief-IP floor). **DESIGN RULINGS (JK, this session,
DECISIONS_LOG):** the new-merit-award BASES re-grounded on the data reality (Bench = total WAR among designated reserves
[specced §23.6]; Reliever = WPA-not-LI [LI unpersisted + FINDING-099 defect + orphaned modifiers]; WPA via a new season
field); the reliever pool = PURE RELIEVERS ONLY (⇒ dropped reliefWpa/`!isStarter` — for a 0-start pitcher relief-WPA ==
total pitching-WPA). `WAR_AWARD_CATEGORIES` stays the 5 throughout ⇒ the D9 season-end finalize is byte-neutral (the new
categories ride the flag-gated recompute only). The per-game recompute now covers all 8 merit categories
(MVP/CY/SS/GG/RoY/Bench/Booger/Reliever) + the TV-family. **The full host gate earned its keep twice** — it caught 2 real
new reds Codex's scoped runs missed (L12-3b's processCompletedGame mock gap; L12-3R-2's 4 franchiseValueInputs pitchingWpa
shape assertions), both auditor-fixed mechanically (test-only). Survived a platform server-error mid-L12-3c (resumed from
the intact tree, nothing lost). Suite 7,745/444 → **7,765/447, ZERO new reds**; trackerDb v24 (only L12-1 bumped it).
**NEXT: L12-4** (All-Star roster builder + 60% lock — a fresh high-risk subsystem; start with a grounding recon) → L12-5
(emission/snub/honor/reporter) → L12-6 (Almanac/UI) → L13 → L14 → L-SIM.

---

### 2026-06-23 (attended, Opus 4.8 / Claude Code) — A1.2 fame→morale FULLY COMPLETE (3 legs) · L13-8 closed · A1.3 deferred
Resumed v1 keystone-build on Branch A (`codex/franchise-v1-next`) under JK's *"knock out as much as we can without context loss."* Drove the Codex-builds / Opus-audits loop with a per-ticket grounding-workflow + adversarial-verify discipline. **A1.2 (the fame→morale wiring, an L-SIM blocker) was SPLIT into 3 legs, all built + INDEPENDENTLY gate-verified (Opus re-ran tsc + the full suite each time), branch-only, zero-new-reds, no DB bump:** leg-a `bc24dff4` (fame WAR-floor gravity bidirectional→upward-only `Heat += max(0, strength×(floor−Heat))` + never-lowers-Heat test; the function is a verified orphan, build-dark-safe); leg-b `f374271c` (§20.5 fame→player-morale tap, change-only via net `heatDelta = heat − prior heat`; `resolveFameTap` + a producer-B emitter that reuses the designation-morale plumbing so fame stays morale-free); leg-c `49d56ea5` (§20.6 fan-morale Channels A+B — NEW `computeFameVolume` U-shaped, BOTH fame+infamy amplify, + 2 dark writers, double-dark fame read, the per-game base swing wired into the dark Phase-2 path for the FIRST time). **L13-8 CLOSED** (`e9a3fd1e`) — the dagger anchor re-verify found the flag-gated `processCompletedGame` wiring already SUBSUMED by L13-3a..6 (`:648-664`, all 3 computes wired); JK WAIVED the standalone proof-test (driving processCompletedGame faithfully = L-SIM-harness work; the L-SIM + per-compute tests are the proof); **L-SIM blocker cleared**. **A1.3 trade-demander DEFERRED** (`cf5c23d9`) — grounding (`wf_8556b1a7`) proved it `large-feature-needs-split` (orphan propensity engine + empty flashpoint seam + a needed persisted demander source, 5 design forks + a possible trackerDb bump), NOT the "cheap" roadmap billing; JK pivoted to the leg-b/c fame taps. **8 JK rulings** (DECISIONS_LOG 2026-06-23): §20.5 change-only + net-heatDelta scalar + producer-B; §20.6 A+B + standout=per-team-top-WPA + volume=both-amplify; L13-8 close; A1.3 defer (+ documented non-soul defaults). **The discipline caught TWO wasted builds before they happened** (L13-8 was already done; A1.3 was mis-billed cheap) — the Lane-1 roadmap one-liners systematically undersell reality; every soul-layer measurement fork went to JK, never inferred. Suite 471 files / 2 characterized fail (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`, both solo-pass; `GameTrackerLaunchState` an intermittent order-flake) throughout; trackerDb untouched; nothing pushed. Wrapped attended at JK's call — **NO HANDOFF_NEEDED baton (JK starts the fresh session manually).** **NEXT: RA-2** (wire RA-1 `expectedStatsEngine` live, replace `valueDelta` @ `franchiseCheckpointSweepCompute.ts:184`, + the sim-tune curvature check — a FRESH ratings subsystem; start with a grounding recon) → Lane-4 tail (T/S/B13/B14) + Lane-1 tail (L12-6, L4b) → A1.3 (forks-first) → the lane-merge (Branch B → A) → the gate chain (L-SIM final → RB-16 → D12 → D13 → flag-flip → F-141). **leg-c minor (build-dark, §16-tuned at flag-flip):** Channel A's no-hitter/shutout detection is solo-CG-only + walk-off approximate — magnitude-only.

---

### 2026-06-23 (attended Hybrid via /kbl-captain, Opus 4.8 / Claude Code) — A1.5c-1/2/3 + S6: dual-branch parallel aggregator build
Picked up the AUTH-4 Captain loop from the A1.5c-split seam; JK ran `/kbl-captain` but stayed attended and ruled POSTURE=Hybrid (keep rolling on engineering, surface genuine measurement/design forks inline). Shipped 4 tickets, each Codex-built → Opus-audited-on-the-real-diff (builder≠auditor) → independent tsc+suite gate → committed branch-only; zero-new-reds throughout, NO trackerDb bump, oracle byte-unchanged, nothing pushed. **Branch A** (the A1.5c 4-aggregator split's first three, all pure build-dark, field-leak-safe via stamped IDs): A1.5c-1 difficulty-weighted fielding (`6b7879d7`, RULED §9 ladder from `specialPlayType` via the reused mapper, denominator decoupled → JK ruled default `difficultyOpportunities`), A1.5c-2 UBR (`8bf12bec`, zero-inits the 3 orphan-guard fields so the real-UBR branch becomes reachable at RA-2; rwarCalculator untouched), A1.5c-3 extraBasesAllowed OF-arm (`e66a5399`, + pure `outfieldArmRate`) ⇒ **A1.5c CLOSED** (-4 catcher-CS deferred to RA-8). **Branch B** (fan-out per JK, in parallel): S6 draft-board per-tool + grade bands (`c545abac`), recon'd via an Explore subagent, bands compute at the board layer + render default-covered via `LongPressReveal`, the S5 no-raw-leak invariant held. JK rulings: Hybrid · fan-out B · pull RA-8 forward · A1.5c-1 denominator=`difficultyOpportunities`. Open decisions all tracked in the ledgers (D-A1.5c-1-2/2-2/3, D-S6-1, A1.5b-2, BV-S6). Wrapped attended at JK's call ("close session, prep docs for my handoff"). **NEXT: RA-8 (A2.2, first saved-shape ticket — additive catcher CS/SB fields + the seasonStorage.test.ts mirror, NO DB bump, audit HARDEST) → A1.5c-4 → A1.5d; Branch B → S7.** HANDOFF_NEEDED baton written for the fresh session. Branch A HEAD `16615e45`; Branch B HEAD `c545abac`; caffeinate PID 84474 alive.

---

### 2026-06-23 (attended Hybrid via /kbl-captain, Opus 4.8 / Claude Code) — RA-8 + A1.5c-4 (⇒ A1.5c CLOSED) + S7a + S7 grounding/rulings
Fresh session ("start new session"); did the full Session Start Protocol, restated, JK confirmed POSTURE=Hybrid (Codex-builds / Opus-audits-the-real-diff / independent-gate / commit-branch-only; keep rolling, surface genuine forks inline). Sole worker (no HANDOFF_NEEDED, no concurrent codex/claude). Drove both worktrees. **3 tickets shipped, each builder=Codex≠auditor=Opus, real-diff audit, independent gate, ZERO-NEW-REDS, NO trackerDb bump, oracle byte-unchanged, branch-only (nothing pushed).** **Branch A:** RA-8 (`0edf060a`) additive optional `caughtStealingAgainst?`/`stolenBasesAllowed?` on PlayerSeasonFielding, BUILD-DARK (JK ruled — no writer; grounded hardest via `wf_a3e3b400`, which corrected the map: `kblWpaAttribution.ts` is in `src/utils/`, the `seasonStorage.test.ts:82` "mirror" is a decoupled phantom that does NOT pin the prod field name → canonical names `caughtStealingAgainst`/`stolenBasesAllowed`). A1.5c-4 (`f16cbfd3`) ⇒ **A1.5c CLOSED (1/2/3/4)**: catcher-CS RATE `(CS×0.95)/((CS×0.95)+(SB_allowed×0.45))` (JK ruled **k=0.45** — source spec named percentages but no formula, surfaced per no-inference) + the LIVE WRITER in `aggregateFieldingStats` populating the RA-8 fields from BETWEEN_PLAY_EVENTS by stamped `runnerAttribution.catcherId` (undoneAt-excluded, empty-catcherId bucketed). Make-or-break held: the new `getBetweenPlayEvents` import routed through the `isMissingVitestMockExport` swallow-guard → the 3 processCompletedGame object-literal mock tests stayed green at module-load. **Branch B (fan-out per JK):** S7 grounded (`wf_1bc063bb`) → 4-way sub-split (`2edc66a9`); S7a (`d1a578ab`) pure `gradeBandToPriceRange` (midpoint range off the now-exported canonical GRADE_SALARY_BOUNDS, single source, build-dark). **7 JK RULINGS (DECISIONS_LOG):** Hybrid · RA-8 build-dark · k=0.45 · S7 guidance=grade-band+chemFit · S7a range=midpoint · S7b guidance=band-is-range (drop perceivedValueRange) · S7c salary=all-real-winners; + defaults S7d keep-perceivedValueRange/relocate-gradeToTwentyEighty. ALL S7 forks ruled → Branch B can roll straight through. Wrapped at JK's call ("wrap and I'll start a new session"). **NEXT: Branch A = A1.5d stadium records OR A-W2 ratings (A2.3 RA-rookie → A2.4 RA-2b); Branch B = S7b (re-anchor) → S7c → S7d.** Still deferred: A1.5b-2 SVG re-derivation (precondition before wiring the carry converter live); branch hygiene (eventLog fix merge + ~28 stray branches) before the lane-merge. Branch A HEAD `993d895d`; Branch B HEAD `bcbb74fe`; caffeinate PID 84474 alive.

---

### 2026-06-24 (attended, dedicated session, Opus 4.8 / Claude Code) — THE LANE-MERGE landed (outgoing: MERGE FREEZE)
Outgoing header was the 2026-06-24 MERGE FREEZE banner (both code lanes held still; Captain/Opus to staple them on a side branch with JK). This session executed it. **`codex/mode1-v1-b` → `codex/franchise-v1-next`, fast-forwarded to `87a59ec0`** — the entire Mode-1 build (auction + prospect-gen + scout + draft-freeze + draft-morale + GM entity + roster board, 91 commits) is now on the living-season branch alongside the L/D-stack; D12 unblocked. Ran the merge on side branch `merge/mode1-into-franchise` in an isolated worktree with an APFS-cloned node_modules so the live main worktree (concurrent doc-worker's uncommitted edits) was untouched; after the full gate + JK confirm, `merge --ff-only` from main, then removed the temp worktree + side branch. **Conflict surface (read-only 3-way merge predicted it exactly): only 2 real conflicts, neither production code** — `franchiseInitializer.test.ts` (kept BOTH lanes' tests + union imports) + `PROMPT_CONTRACTS.md` (base-aware union); the 6 auto-merges included all real code; mode1-b legacy deletions applied with zero dangling refs. eventLog box-score fix (`875e4368`) folded in via cherry-pick. **GATE all green:** build 0 · suite 8,228 pass / 1 fail = pre-existing `wpaRuntimeBoundary` hard fail, proven byte-identical on the pre-merge tip ⇒ ZERO new reds · IV oracle byte-identical · trackerDb v25 reconciled (no double-bump) · L-SIM smoke all CRITICAL invariants green (2 non-blocking fame-war-legitimacy-floor INVESTIGATE notes). Branch hygiene cleared (eventLog folded; ~26 stray codex/* branches all pre-June/stale, left untouched). **MERGE FREEZE LIFTED — resume on the single combined `codex/franchise-v1-next` tree;** mode1-v1-b parked `fe98cdbc` (fully merged). **NEXT (gate chain): L-SIM final → RB-16 → D12 → D13 → flag-flip → F-141.** Branch-only, nothing pushed. HEAD `87a59ec0`.
---

## Outgoing Live Header Snapshot — before 2026-07-07 CUT1 Codex session

Previous `CURRENT_STATE.md` live header was the 2026-07-02 C2B/C3 trunk-advanced banner, with next action listed as QUICK-WIN-CATALOG-24 / in-season legal-roster enforcement before C4. This CUT1 session advanced the Phase 1.5c route cutover/gating branch instead, so the live header was refreshed to the cutover status.

## Outgoing Live Header Snapshot — before 2026-07-07 Lever A Codex session end

Previous `CURRENT_STATE.md` live header was the 2026-07-07 CUT1 route-cutover banner. This Lever A session refreshed the live header to record steps 4-6 complete in `/private/tmp/kbl-lever-a`, the Git metadata EPERM commit/pull limitation, the `LEVER_A_COMMIT_PLAN.txt` handoff, the green final gates, and the reserve measurement numbers.
