# CURRENT_STATE.md

**Last Updated:** 2026-06-11 (vision session close)
**Phase:** Two tracks — BUILD: IV workstream, T4+T4-FIX COMPLETE, next = closure commit → T5. DESIGN: franchise engine architecture established (FRANCHISE_ENGINE_MAP.md v0.2), design-session queue D1–D8 opened.

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
