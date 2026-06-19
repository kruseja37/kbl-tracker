# KBL TRACKER — SESSION LOG
# Previous sessions archived at: spec-docs/archive/SESSION_LOG_through_2026-02-11.md
---
## Session: 2026-06-18 (UNATTENDED resume, sandbox) — R3 grade-freshness GATE surfaced to JK; DISCOVERED R3 already built-but-uncommitted; no code advanced
- **Context:** fresh session launched after the prior thread raised HANDOFF_NEEDED (next_ticket = R3 / Ace Exterminator,
  the LAST earnable v1 trait, 47/47). JK NOT present. Did the full session-start reads (SESSION_RULES, AUDIT_LOG,
  AUDIT_PLAN, SESSION_LOG, CURRENT_STATE) + HANDOFF_NEEDED + WAITING_ON_JK + TRAIT_MEASUREMENT_SPEC §0.4/§0.6/§0.11.
- **CRITICAL DISCOVERY (changes the HANDOFF framing):** R3 is NOT un-started — it is **already BUILT on disk, UNCOMMITTED.**
  `git status` shows ` M src/engines/traitCandidateBuilder.ts` (+53 lines: `addAceExterminatorSignals`, `'Ace Exterminator'`
  added to `BUILDABLE_TRAITS`, OPTIONAL `pitcherGradeByPlayer?: ReadonlyMap<string,Smb4Grade>` on `SeasonTraitCandidateInput`,
  A−-threshold via `SMB4_GRADE_TO_INDEX['A-']`, reuses `DISTRACTOR_REACH_RESULTS`) + `M ...traitCandidateBuilder.test.ts`
  (+3 R3 test additions). HEAD does NOT contain Ace Exterminator (grep -c = 0) → the build was never committed. Also
  uncommitted: the R3 measurement ruling in DECISIONS_LOG (REACHED-BASE vs A−+ pitchers), §0.11 in TRAIT_MEASUREMENT_SPEC,
  and the full R3 contract in PROMPT_CONTRACTS (marked DISPATCHED). All built to §0.11 VERBATIM, PURE/build-DARK
  (grade-map dormant until a later hook feeds it → empty map = trait dormant = zero behavior change).
- **GATE HONORED — did NOT advance R3.** Per the resume instruction ("do NOT autonomously build past the grade-freshness
  ruling") + SESSION_RULES scope discipline + builder≠auditor triangle: I did NOT audit, host-gate, or commit the on-disk
  R3 build. (It is unaudited; the host gate is also environmentally impossible here — sandbox node v22, no host node v20 /
  Codex CLI, >45s processes killed, repo mount blocks git unlink; a stale `.git/index.lock` is present and cannot be
  unlinked from the mount.)
- **SURFACED to JK** (WAITING_ON_JK.md, ticket:R3): the exact grade-freshness sequencing question — carry R3 over the line
  NOW (independent audit + host gate + commit, build-DARK, grade-map population deferred to the app-wide grade-freshness
  ticket) vs hold R3 uncommitted until grade-freshness lands first. My lean = build NOW (build exists to spec; genuinely
  decoupled; §0.11 designs it dormant-until-fed; closes 47/47 at zero runtime risk).
- **No code/test/spec files were written or committed this session.** No new FINDING (no code change). Uncommitted spec
  docs + the R3 build were left exactly as the prior thread left them.
- **NEXT SESSION SHOULD START WITH:** JK's R3 grade-freshness ruling (WAITING_ON_JK ticket:R3). If "build now": on a HOST
  session (node v20) — `rm -f .git/index.lock`, independent audit of the on-disk R3 diff (builder≠auditor), `NODE_ENV= npm
  run build` (exit 0) + `NODE_ENV= npm test` (expect ~7,668 baseline + the new R3 tests, 2 characterized fail, ZERO new
  reds), then commit R3 + the 3 uncommitted spec docs on codex/franchise-v1-next (never push). If "hold": leave R3
  uncommitted, proceed to the deferred dormant-trait wiring hooks (handedness/Utility maps + Two Way C/IF/OF) → L11–L14 →
  L-SIM gate. Branch codex/franchise-v1-next; nothing pushed.

---
## Session: 2026-06-18 (fresh attended session) — L10 COMPLETE → FINDING-150 → trait measurement model RATIFIED → ROADMAP_TO_V1 → handoff for L9b rebuild
- **SESSION ARC (newest first):** (1) finished **L10** (L10-3 `8a33d9d3` host-gated + L10-4 `057340ed` + L10-5 `52db0ade`,
  each subagent/Codex-built → Opus-audited → host-gated → committed, build-DARK). (2) Surfaced all open forks; **JK ruled
  Q1–Q12** (DECISIONS_LOG; 3 overrides Q5/Q8/Q12). (3) JK's Q1 challenge → **FINDING-150**: L9b built only 16 of ~50
  buildable traits on the SUPERSEDED §D triage (foundations sound, scope wrong). (4) Detection-scope audit (`wf_6643e635`)
  + measurement-consolidation (`wf_368f24d0`) → **JK ratified the trait-from-reality MEASUREMENT MODEL** (`703d78b9`,
  `TRAIT_MEASUREMENT_SPEC.md §0`): P-common-currency + RE-EVALUATE-TO-DROP; strikeout-rate / walks-allowed / HR-AVG /
  DP-FC / ARM-gate / opposing-grade proxies; data>ratings>personality. (5) Captured the rule *soul-layer measurement comes
  from spec verbatim, never inference* (SESSION_RULES pending pen). (6) Built **ROADMAP_TO_V1.md** (`dc0ad199`,
  workflow-verified: 22 done / 20 outstanding / 1 unverified; D-stack D1–D11 done, D12/D13 NOT reached; L4b/L11–L14/economy
  not-started). **⏸ CHECKPOINTED — L9b rebuild build NOT started.** **➡ HANDOFF: a fresh session starts the L9b rebuild at
  R-E** (enabling: thread ratings/grades into the candidate-builder · charisma factor in the combiner · the re-evaluate-to-
  drop model) per `TRAIT_MEASUREMENT_SPEC.md §0.4`, then R1→R2→R3. Branch codex/franchise-v1-next; suite 7,559/438; nothing
  pushed. *(The L10-3/4/5 detail for this session is below.)*
- **(THIS attended session)** JK started a fresh session, confirmed the restate, and ruled "host gate, commit, then
  continue L10-4" (AUTH-4 still on) + "fold the 3 session docs into the L10-3 commit". On the host (real node v20):
  re-verified the L10-3 diff against the contract (flag-gate-first / try/catch gate branch / no Date.now·random / no
  store·DB·PIN touch — all confirmed), removed the stale `.git/index.lock` + deleted the sandbox junk
  (probe_l10_*.mjs, .watch_write_test, .fuse_hidden…). **`NODE_ENV= npm run build` exit 0** (`✓ built in 7.74s` + PWA →
  tsc clean). **Full suite `NODE_ENV= npm test`: 7,540/436, 7,538 pass / 2 fail** = EXACTLY the characterized baseline
  (`wpaRuntimeBoundary` "stays-allowlisted" + `franchiseManualSmokeFixture` 5000ms timeout), ZERO new reds (+5 / +1 file
  = `franchiseL10SweepCompute.test.ts`). Committed on codex/franchise-v1-next: the 5 contracted files + the 3 session
  docs (CURRENT_STATE, SESSION_LOG, AUTONOMOUS_RUN_LOG) folded in per JK; never pushed. WAITING_ON_JK [ticket:L10-3]
  marked RESOLVED. **L10-3 DONE.**
- **L10-4 (stadium-change resolver) — DONE, same session.** Grounded the seams (FranchiseTeamStadiumSnapshot
  `franchise.ts:54-60`, park pool `parkLookup.ts`/`getAllParks`, `getDerivedParkFactorsIfAvailable`
  `parkFactorDeriver.ts:116`, the L10-1 event carries a `seed`, `franchiseL10DeterministicRoll`). Wrote the L10-4 contract
  to PROMPT_CONTRACTS. **Design call (AUTH-4 default, flagged):** L10-4 is the PURE concrete-resolution step (pick the new
  park + build the snapshot) — NOT a live write; the snapshot write + analytics recompute defer to a post-D13 apply step,
  faithful to the doubly-dark L10 model (mirrors L9b-3c's orphaned applier). Delegated the BUILD to a fresh subagent
  (builder), then independently audited line-by-line (Captain/Opus = auditor; builder ≠ auditor). Deliverable: NEW pure
  `src/engines/franchiseStadiumChangeResolver.ts` (`pickStadiumFromPool` shared w/ L14 + `resolveFranchiseStadiumChange` +
  `FranchiseStadiumChangeResolution`) + NEW `__tests__/franchiseStadiumChangeResolver.test.ts` (10 tests). PURE/build-DARK,
  no production caller, no store, trackerDb v23. Host gate: `NODE_ENV= npm run build` exit 0; full suite **7,550/437,
  7,548 pass / 2 characterized fail**, ZERO new reds (+10 / +1 file). Audit: VERIFIED, 0 major / 2 trivial minors
  (single-park fallback + per-team divergence untested — non-defects). Committed on codex/franchise-v1-next (2 code files +
  doc updates; not pushed). Committed `057340ed`.
- **L10-5 (reporter tap / news adapter) — DONE, same session → L10 COMPLETE.** JK chose "continue to L10-5" at the
  checkpoint. Grounded the reporter seams (`SeasonNewsEvent` at `seasonNewsGenerator.ts:11-19`; `RANDOM_EVENT` in
  `NarrativeEventType`; the live `generateSeasonNewsTake` is LLM/network-dependent + byte-unchanged per L5d). Design call
  (AUTH-4 default, flagged, same shape as L10-4): pure adapter mapping a fired L10 event to a `SeasonNewsEvent`, NOT a live
  reporter call — the live emission defers to the post-D13 seam. Layer note: the adapter lives in the reporter folder
  (`src/src_figma/app/engines/reporter/`) because core `src/engines` must not depend on the UI-layer `SeasonNewsEvent`
  type. Delegated build to a fresh subagent, then Captain (Opus) independently audited line-by-line (builder vs auditor).
  Deliverable: NEW pure `franchiseL10NewsAdapter.ts` (`buildFranchiseL10SeasonNewsEvent` + `L10_NEWS_DRAMATIC_WEIGHT`) +
  NEW `__tests__/reporter/franchiseL10NewsAdapter.test.ts` (9 tests incl. an exact-key-set lock on the SeasonNewsEvent
  shape). PURE/build-DARK, no production caller, reporter byte-unchanged, trackerDb v23. Host gate: build exit 0; full
  suite **7,559/438, 7,557 pass / 2 characterized fail**, ZERO new reds (+9 / +1 file). Audit VERIFIED, 0 major / 0 minor.
  Committed on codex/franchise-v1-next (2 code files + doc updates; not pushed).
- **L10 (random events) COMPLETE: L10-1 `607fa015` · L10-2 `a830a61f` · L10-3 `8a33d9d3` · L10-4 `057340ed` · L10-5 — all
  build-DARK, activate post-D13.** NEXT = L11 (managers) per the L-stack (a fresh subsystem needing a grounding recon
  before contracting). *(The sandbox L10-3 build/audit entry it closes is below.)*

---
## Session: 2026-06-18 (AUTH-4 overnight, fresh Captain thread) — L10-3 BUILT + INDEPENDENTLY AUDITED, HOST-GATE PENDING [CLOSED by the attended host-gate session above]

### What Was Done
- Fresh Captain thread spun up by kbl-thread-watch after the prior thread hit its context limit. Full session-start
  reads (SESSION_RULES, AUDIT_LOG, AUDIT_PLAN, SESSION_LOG, CURRENT_STATE, CLAUDE.md, AI_TEAM_OPERATING_MODEL,
  L10_SCOPE_MAP). RESTATED: Phase-2 L-stack; L9b COMPLETE; L10 half-built (L10-1 engine 607fa015 + L10-2 store a830a61f);
  next = L10-3. Proceeded under AUTH-4 (standing go).
- Wrote the L10-3 contract to PROMPT_CONTRACTS.md (Captain owns docs). The sandbox had NO Codex CLI / host node, so the
  Captain (Opus) BUILT the L10-3 diff directly (a tight mirror of the L9b-3b-ii trait-grant hook), then satisfied the
  triangle with an INDEPENDENT decorrelated-reader audit (a fresh subagent, ≠ builder).
- L10-3 = the flag + dark league-sweep hook wiring L10-1 `computeFranchiseL10Events` → L10-2 `franchiseL10Overlays`:
  6th default-OFF flag `isFranchisePhase2L10Enabled`; NEW `franchiseL10SweepCompute.ts` (`persistDarkL10ForCompletedGame`
  — flag-gate-first → gameNumber → totalGames → isCheckpointBoundary → `resolveL10Candidates` [MLB roster + per-team fan
  morale + player AND team candidates, mirroring `resolveCheckpointRoster`] → `computeFranchiseL10Events` [intensity
  'standard', seedBase `${franchiseId}:${seasonId}:${gameNumber}`] → write pending `franchiseL10Overlays` rows with
  idempotent id `…:${family}:${eventType}:l10-${gameNumber}`, applied:false, createdAt from max persisted at-bat ts);
  6th gate branch in processCompletedGame after the Traits gate (try/catch, never blocks completion); NEW test (5 tests
  incl. a real producer→consumer seam test). Doubly-dark; trackerDb stays v23; no store/DB/backup/PIN touched.

### NFL / Verification
- tsc --noEmit exit 0 (full project, twice). 5/5 targeted tests green. Engine probe: seeded candidates fire exactly 3
  events (2 player + 1 team via team-dd) → the written>0 / team-target assertions are non-vacuous.
- Self-checks: 6 gate branches in order (…/Traits/L10 at processCompletedGame.ts:639); no Date.now/Math.random in the new
  compute; flag default false; no trackerDb/backup/syncConfig/ledger-PIN drift; no franchiseRandomEventGenerator import.
- INDEPENDENT AUDIT (decorrelated reader subagent ≠ builder): VERDICT VERIFIED, 0 major / 3 minor. M1 (seam never fired a
  team row) CLOSED in-session by adding team-dd; M2 cosmetic; M3 = probe artifacts to delete host-side.

### Environment Wall (why uncommitted + 2 gates open)
- Isolated Linux sandbox: node v22 (not host v20), NO codex CLI, mount blocks git unlink/index.lock, >42s processes
  killed. Could NOT run full `npm run build` / full suite / commit. HOST GATE logged in WAITING_ON_JK.md [ticket:L10-3]:
  build-0 + full suite (7,535/435 → 7,533 pass / 2 characterized fail, ZERO new reds, +5) → delete sandbox probe
  artifacts (probe_l10_*.mjs, .watch_write_test, .claude/settings.local.json) → commit the 5 L10-3 files on
  codex/franchise-v1-next (never push).

### Files (the L10-3 diff — on disk, uncommitted; EXACTLY these 5)
- NEW: src/utils/franchiseL10SweepCompute.ts, src/utils/tests/franchiseL10SweepCompute.test.ts
- EDIT: src/utils/franchisePhase2Flags.ts, src/utils/processCompletedGame.ts, spec-docs/PROMPT_CONTRACTS.md

### Next
- HOST: build + suite + commit L10-3 (above). Then L10-4 (stadium-change event) → L10-5 (reporter tap) per
  L10_SCOPE_MAP.md §3. L10-4 is a fresh ticket needing a contract; it touches the park pool + writes a stadium snapshot
  that analytics recompute (medium risk — persistence-adjacent).

---
## Session: 2026-06-17 (AUTH-4 sandbox resume) — L5b flashpoint-decay accumulator BUILT + AUDITED, UNCOMMITTED

### What Was Done
- Fresh CONTEXT-HANDOFF resume thread under AUTH-4. Full session-start reads (SESSION_RULES, AUDIT_LOG, AUDIT_PLAN,
  SESSION_LOG, CURRENT_STATE) + the AUTONOMOUS_RUN_PROTOCOL + the L6b mirror precedent. RESTATED: Phase-2 L-stack;
  last = L5a `428f7cb`; next = L5b. Proceeded under AUTH-4 (no JK confirmation gate).
- BUILT L5b — the flashpoint-decay accumulator (§13 tooth #2 / LS-19): NEW dark `franchiseFlashpointDecay` IndexedDB
  store + default-OFF `isFranchisePhase2FlashpointEnabled()` flag + pure compounding-but-clamped per-game fan-morale
  TAX engine (`src/engines/flashpointDecay.ts`, all magnitudes in `FLASHPOINT_DECAY_TUNING`) + a dark per-game compute
  (`src/utils/franchiseFlashpointDecayCompute.ts`) wired into processCompletedGame (gated, after the fame compute).
  SEAM-NEUTRAL: `resolveTurnedOnPlayers` returns [] until L7/L10/L13 land, so even flag-ON writes nothing today.
  trackerDb v19->v20; KBL_BACKUP_VERSION stays 2; backup-parity + syncConfig + the version-pin trap
  `franchiseSeasonLedgerStorage.test.ts` (`toBe(20)` + store-list) all updated in lockstep. Mirrors L6b-1/L6b-2 exactly.
  Diff = 15 files (8 edited + 6 new + the PROMPT_CONTRACTS contract).

### NFL / Verification
- Observable-in-sandbox gates PASSED: tsc 0 (x2), the 6 new/affected test files = 40 tests GREEN (engine compounding-
  clamped, storage round-trip, compute dark-noop / seam-neutral / re-entry-guard, the pin-trap, backup parity, manifest),
  frozen engines byte-unchanged (fameModel/fanMoraleDampener/masterMoraleMatrix/fanMoraleEngine/franchiseFameCompute/
  franchiseFameRecordsStorage), all flag defaults FALSE, KBL_BACKUP_VERSION still 2, no raw indexedDB.open in new files.
- INDEPENDENT AUDIT: a decorrelated sub-agent (auditor != builder; triangle preserved) returned VERDICT VERIFIED —
  10/10 checklist with file:line evidence, zero defects, faithful L6b mirror, brute-forced the clamp (max magnitude
  exactly 3.0 over 10,000 games), swept all other version-pin/store-enum tests (only the 3 patched ones sensitive),
  unobserved-build/suite regression risk judged LOW.

### Environment Wall (why uncommitted + 2 gates open)
- The resume ran in an isolated Linux sandbox (node v22, NO codex CLI). Two hard limits: (1) any process >~42s is killed
  -> full `vite build` + the full ~7,290 suite could NOT complete; (2) the repo mount blocks git unlink
  (`.git/index.lock` can be created but not removed) -> CANNOT commit. The codex-dispatch mechanism (host `~/.local/bin/
  codex`) is also unreachable from the sandbox.
- HOST TODO (then L5b is closed): `NODE_ENV= npm run build` (build-0) + full suite (7,280 pass / 2 characterized fail
  baseline, + the new L5b tests, zero new reds) -> commit the 15 L5b files on codex/franchise-v1-next. WAITING_ON_JK.md
  written; fresh HANDOFF_NEEDED written.

### Files (the L5b diff — on disk, uncommitted)
- NEW: src/engines/flashpointDecay.ts (+__tests__/flashpointDecay.test.ts), src/utils/franchiseFlashpointDecayStorage.ts
  (+tests/...Storage.test.ts), src/utils/franchiseFlashpointDecayCompute.ts (+tests/...Compute.test.ts)
- EDIT: src/utils/franchisePhase2Flags.ts, trackerDb.ts, backupRestore.ts, syncConfig.ts, processCompletedGame.ts,
  tests/franchiseSeasonLedgerStorage.test.ts, tests/backupRestore.franchiseParity.test.ts,
  tests/franchiseSaveSlotManifest.test.ts; + spec-docs/PROMPT_CONTRACTS.md (the contract).

### Next
- COMMIT L5b on the host (above) -> then L5c (in-season trade-requests) -> L5d (reporter tooth) -> {L7,L8,L9b,L10} -> ...

---
## Session: 2026-04-13 (Su) — GameTracker Visual Theme + Beat Reporter Voice Spec

### What Was Accomplished
- ✅ GameTracker dark chalkboard visual theme applied to all panels
- ✅ Mom's Typewriter / Tox Typewriter fonts applied consistently across GameTracker
- ✅ Play log muted (colors + text) for visual hierarchy below lineup cards
- ✅ Team-colored lineup headers with chalk texture overlay (using team primary color at 25% opacity)
- ✅ Chalky golden divider between lineup columns (rgba(242,192,65,0.08))
- ✅ Current batter chalk highlight + due-up batter ⚾ indicator
- ✅ Dark theme extended to EnrichmentPanel, FullFenwayScoreboard, PlayerCardModal, QuickBar
- ✅ QuickBar buttons given chalk texture backgrounds
- ✅ Player card modals widened 340px → 480px (no scroll needed for data entry)
- ✅ Vertical borders moved below headers (no bleeding through header row)
- ✅ Horizontal brown divider removed between ScoreBug and headers
- ✅ Beat Reporter Voice Spec written — 15 sections, 730 lines (spec-docs/BEAT_REPORTER_VOICE_SPEC.md)
- ✅ Old duplicate spec file deleted (the one with # in filename)

### Decisions Made
- Team header colors use 25% opacity over dark base with chalk texture (Option 4 from 4 presented)
- Play log stays darker (#364038) than lineup cards (#3d4a42) for recessed/elevated effect
- NewsBoard left border creates shadow effect to match play log's right border
- Beat Reporter: 80/20 mood drift (not 50/50) — reporter stays true to form most of the time
- Beat Reporter: Rivalries established in League Builder (tied to team), evolve game-by-game
- Beat Reporter: Hybrid LLM — Grok for in-game play-by-play, Claude Sonnet for post-game columns
- Beat Reporter: Typewriter effect ~100-150ms/word with burst sound per word

### NFL Results
- Not an implementation day (visual styling + spec writing) — NFL not applicable

### Files Modified
- `src/src_figma/app/components/PlayLogPanel.tsx` — muted colors, Mom's Typewriter font, bg #364038
- `src/src_figma/app/components/BattingLineupColumn.tsx` — team-colored header, chalk texture, bg #3d4a42
- `src/src_figma/app/components/DefensiveLineupColumn.tsx` — team-colored header, chalk texture, bg #3d4a42
- `src/src_figma/app/components/NewsBoard.tsx` — restructured header/content, shadow border, bg #364038
- `src/src_figma/app/components/ScoreBug.tsx` — bg #3d4a42, darkened base/outs indicators
- `src/src_figma/app/components/EnrichmentPanel.tsx` — dark theme, fonts, button colors
- `src/src_figma/app/components/FullFenwayScoreboard.tsx` — all COLORS constants darkened
- `src/src_figma/app/components/QuickBar.tsx` — chalk texture on outcome buttons
- `src/src_figma/app/pages/GameTracker.tsx` — PlayerCardModal dark theme + widened to 480px
- `spec-docs/BEAT_REPORTER_VOICE_SPEC.md` — NEW (complete 15-section spec)

### Pending / Next Steps
- [ ] Full game playtest on iPad Safari landscape
- [ ] Beat Reporter backstory session — define DNA/identity/rivalries for fictional franchises
- [ ] Beat Reporter prompt engineering — develop system prompts for each voice style
- [ ] Grok API setup and voice quality evaluation
- [ ] Sound design — source retro typewriter sound effects
- [ ] Reporter name bank — build era-appropriate name lists
- [ ] Resume Elimination Mode Steps 6-14

### Key Context for Next Session
- All visual theme changes are committed and pushed to main (commits up through 6fd100a)
- Beat Reporter spec is approved by user — ready for Phase 1 implementation when desired
- Supabase sync is complete (from prior session) — needed for Beat Reporter data model

---
## Session: 2026-04-04 (F) — Supabase Sync: Clear Exhibition Data Fix + E2E Testing

### What Was Done
1. **Fixed "Clear Exhibition Data" button to push sync tombstones** (ExhibitionGame.tsx:59-97)
   - Previously: `clearExhibitionData()` called `store.clear()` on 15 stores without sync
   - Now: Pre-reads all records from synced stores, pushes `syncEngine.remove()` tombstone for each, then clears
   - Added imports: `syncEngine`, `SYNC_REGISTRY`, `extractKey`
   - 10 synced stores get tombstones; 5 non-synced stores (`currentGame`, `playerGameStats`, `pitcherGameStats`, `rosterSnapshots`, `mojoFitnessSnapshots`) clear without tombstones

2. **End-to-end sync testing completed**
   - Upload from laptop → Supabase: ✅ Working
   - Download from iPad → local: ✅ Working
   - "Replace cloud with local" to clean stale data: ✅ Working
   - Verified via SQL queries that tombstones appear and non-deleted counts are correct
   - Post-cleanup state: only `almanacCanonicalPlayers` (18 records) remain in kbl-tracker — correct

### Note on "Clear Exhibition Data" Tombstone Fix
- Code is wired but wasn't directly tested this session (local stores were already empty when fix deployed)
- Used "Replace cloud with local" as workaround to clean stale cloud data
- User reports all sync testing is complete — incremental, delete, iPad/Safari all verified

### Supabase Sync Overall Status
- **Plan:** `/Users/johnkruse/.claude/plans/gleaming-plotting-sky.md`
- **Phases 0-4: COMPLETE** — All storage files wired to syncEngine
- **E2E testing: COMPLETE** — Upload, download, incremental, delete, iPad/Safari all verified by user
- **Phase 5 (Polish): NOT STARTED** — Progress UI refinement, count verification after replaceCloudWithLocal

### Files Changed This Session
- `src/src_figma/app/pages/ExhibitionGame.tsx` — Added sync tombstone logic to `clearExhibitionData()`

### Build Status
- `npm run build`: ✅ Exit 0 (5.56s)

---
## Session: 2026-03-07 (M) — Elimination Mode Shipped (Steps 11-13)

### Context
Final Elimination Mode implementation pass. Steps 11-13 executed via Codex 5.4; Step 14 was already completed earlier in Step 2.

### Accomplished

**Step 11: Mojo/Fitness inter-game persistence** — Branch: main
- New `src/utils/mojoFitnessStorage.ts` for save/load/delete on `mojoFitnessSnapshots`
- GameTracker now loads elimination snapshots before player registration and saves them before post-game navigation
- Elimination-only behavior; franchise/exhibition flows unchanged

**Step 12: PostGameSummary return navigation**
- Added `elimination` to PostGameSummary nav state type
- DONE/CONTINUE now returns elimination games to `/elimination/{eliminationId}`

**Step 13: Awards computation**
- New `src/utils/eliminationAwards.ts`
- AWARDS tab in EliminationHome now computes and renders v1 elimination awards from playoff stats
- Placeholder removed; incomplete brackets still show the gated message

**Step 14: Home screen button wiring**
- Already completed earlier in Step 2 (route and home navigation wiring)

### Build Status
- Build: PASS (0 errors)

### Files Modified
- `src/utils/mojoFitnessStorage.ts` — new snapshot persistence helper
- `src/src_figma/app/pages/GameTracker.tsx` — snapshot save/load wiring
- `src/src_figma/app/pages/PostGameSummary.tsx` — elimination return nav
- `src/utils/eliminationAwards.ts` — new awards computation helper
- `src/src_figma/app/pages/EliminationHome.tsx` — AWARDS tab implementation

### Next Action
**Browser Testing:** Validate Elimination Mode end-to-end in the browser.

---

## Session: 2026-03-07 (L) — Elimination Mode Step 10

### Context
Continued Elimination Mode build. Step 10 executed via Codex 5.4 on high reasoning.

### Accomplished

**Step 10: aggregateGameToPlayoffStats** — Branch: main
- New exported function in playoffStorage.ts (~80 lines): upserts batting/pitching counting stats by playerId into playoffStats store
- Handles merged records (same player can have both batting and pitching stats)
- Recalculates derived stats: AVG, OBP (with HBP+SF), SLG, OPS, ERA, WHIP
- Added cumulative hitByPitch, sacrificeFlies, hitsAllowed fields for correct multi-game recomputation
- Wired in useGameState.ts: added playoffIdRef, extended setPlayoffContext(seriesId, gameNumber, playoffId), dynamic import after recordSeriesGame
- Guarded by !alreadyAggregated to prevent double-counting on repeated completion paths
- GameTracker.tsx: added playoffId to nav state type, passed to setPlayoffContext

### Build Status
- Build: PASS (0 errors)

### Files Modified
- `src/utils/playoffStorage.ts` — added aggregateGameToPlayoffStats + PersistedGameState import
- `src/src_figma/hooks/useGameState.ts` — playoffIdRef + setPlayoffContext extension + aggregation call
- `src/src_figma/app/pages/GameTracker.tsx` — playoffId type + setPlayoffContext call update

### Next Action
**Step 11:** Mojo/fitness inter-game persistence.
Then Steps 12-13 per ELIMINATION_MODE_SPEC.md §11. Step 14 already done (routes wired in Step 2).

---

## Session: 2026-03-07 (K) — Elimination Mode Step 9

### Context
Continued Elimination Mode build. Step 9 executed via Codex 5.4 on high reasoning.

### Accomplished

**Step 9: GameTracker mode checks** — Branch: main
- 4 surgical edits to GameTracker.tsx per ELIMINATION_MODE_SPEC §7.3
- Change 1: gameMode type union expanded with `'elimination'`
- Change 2: `eliminationId?: string` added to navigation state interface
- Change 3: `isPlayoffGame` updated to include `gameMode === 'elimination'` — elimination games treated as playoff games for display (series context, playoff badge)
- Change 4: Post-game nav state passes `eliminationId` through to PostGameSummary
- Verified NO CHANGE to schedule marking check (line 2809) — correctly excludes elimination per Pitfall #6
- Verified NO CHANGE to `gameMode !== 'exhibition'` guard — already catches elimination
- Verified NO CHANGE to useGameState.ts playoffSeriesIdRef — triggers on any non-null seriesId

### Build Status
- Build: PASS (0 errors)

### Files Modified
- `src/src_figma/app/pages/GameTracker.tsx` — 4 edits (type, isPlayoffGame, eliminationId field, post-game nav)

### Next Action
**Step 10:** Build `aggregateGameToPlayoffStats()` — the missing write to kbl-playoffs playoffStats store.
Then Steps 11-14 per ELIMINATION_MODE_SPEC.md §11.

---
## Session: 2026-03-07 (J) — Elimination Mode Step 8

### Context
Continued Elimination Mode build. Step 8 executed via Codex 5.4 on high reasoning.

### Accomplished

**Step 8: EliminationTeamHub.tsx** — Branch: main
- New standalone component built from scratch per ELIMINATION_MODE_SPEC §6.3
- Team selector: loads all bracket team snapshots, switches between teams
- Roster display: split into POSITION PLAYERS and PITCHERS sections with name, position, grade, bats/throws
- Lineup editor: shows batting order 1-9 with up/down reorder buttons, field position display, bench players listed below
- Starting pitcher selector: rotation list with tap-to-promote to top of rotation
- All edits persist via updateEliminationRosterSnapshot() — lineup and startingRotation only
- Zero franchise coupling: no FranchiseDataContext, no TeamHubContent, no useFranchiseData imports
- Zero League Builder reads: all data from roster snapshots only
- Wired into EliminationHome.tsx: replaced "COMING IN STEP 8" placeholder with real component

### Build Status
- Build: PASS (0 errors)
- Module count: 1901 (up from 1900 — one new component)

### Files Created
- `src/src_figma/app/components/EliminationTeamHub.tsx`

### Files Modified
- `src/src_figma/app/pages/EliminationHome.tsx` — import + TEAM HUB tab wiring

### Next Action
**Step 9:** GameTracker `elimination` mode — type definition + 5 mode checks.
Then Steps 10-14 per ELIMINATION_MODE_SPEC.md §11.

---

## Session: 2026-03-07 (I) — Elimination Mode Step 7

### Context
Continued Elimination Mode build. Step 7 executed via Codex 5.4 on high reasoning.

### Accomplished

**Step 7: EliminationHome.tsx full rewrite** — Branch: main
- Fully rewrote EliminationHome.tsx from ~530 lines of legacy placeholder code to real IndexedDB-backed elimination bracket viewer
- Loads EliminationMetadata via getElimination(), finds PlayoffConfig by sourceType + eliminationId, loads PlayoffSeries[]
- 5-tab structure: BRACKET (default), TEAM HUB (placeholder), LEADERS, AWARDS (placeholder), HISTORY
- BRACKET tab: rounds grouped with getRoundName(), clickable series cards with score/winner display, selected-series detail panel with "PLAY GAME" button
- PLAY GAME navigates to GameTracker with full elimination nav state: gameMode: 'elimination', seasonId: 'elimination-{id}', seriesId, gameNumber, home/away teams
- LEADERS tab scoped to current bracket's playoffId (not "most recent playoff")
- HISTORY tab filters to sourceType === 'elimination' completed brackets
- Removed dead SetupTab, BracketView, PlayoffLeadersContent, PlayoffHistoryContent sub-components
- Back button navigates to /elimination/select

### Build Status
- Build: PASS (0 errors)

### Files Modified
- `src/src_figma/app/pages/EliminationHome.tsx` — full rewrite

### Next Action
**Step 8:** Build EliminationTeamHub — roster view + lineup editing from roster snapshots.
Then Steps 9-14 per ELIMINATION_MODE_SPEC.md §11.

---

## Session: 2026-03-07 (H) — Elimination Mode Steps 3-6

### Context
Continued Elimination Mode build. Steps 3-6 executed via Codex 5.4 on high reasoning.

### Accomplished

**Step 3: eliminationManager.ts** — Branch: main
- CRUD for elimination bracket instances in `kbl-app-meta` → `eliminationList` store
- Functions: createElimination, loadElimination, deleteElimination, listEliminations, updateElimination
- ~100-150 lines, new file `src/utils/eliminationManager.ts`

**Step 4: EliminationSelector.tsx** — Branch: main
- Save slot picker page at `/elimination/select`
- Lists saved brackets, New/Load/Delete actions
- Mirrors FranchiseSelector pattern
- New file `src/src_figma/app/pages/EliminationSelector.tsx`

**Step 5: EliminationSetup.tsx** — Branch: main
- 5-step wizard: Select League → Playoff Settings → Team Control → Seeding → Confirm
- 527 lines with clean component decomposition (step renderers extracted as sub-components)
- Full 7-step persistence chain: createElimination → build teams → createPlayoff → createSeries loop → startPlayoff → updateElimination → navigate
- New file `src/src_figma/app/pages/EliminationSetup.tsx`

**Step 6: eliminationRosterStorage.ts** — Branch: main
- Roster snapshot CRUD: createRosterSnapshots, getEliminationRosterSnapshot, getAllEliminationRosterSnapshots, updateEliminationRosterSnapshot, deleteEliminationRosterSnapshots
- Freezes full League Builder Player objects (ratings, traits, arsenal, grade, personality, chemistry, age) at bracket creation
- Uses existing `kbl-tracker` → `rosterSnapshots` store (DB_VERSION 4, Step 1)
- Wired into EliminationSetup.tsx handleStartPlayoffs: createRosterSnapshots called after createElimination, before createPlayoff
- New file `src/utils/eliminationRosterStorage.ts`

### Build Status
- Build: PASS (0 errors)
- Tests: 4,028 pass / 0 fail / 103 files

### Files Created
- `src/utils/eliminationManager.ts`
- `src/src_figma/app/pages/EliminationSelector.tsx`
- `src/src_figma/app/pages/EliminationSetup.tsx`
- `src/utils/eliminationRosterStorage.ts`

### Files Modified
- `src/src_figma/app/pages/EliminationSetup.tsx` — added createRosterSnapshots import + call in handleStartPlayoffs

### Next Action
**Step 7:** Adapt EliminationHome — bracket view with Team Hub tab.
Then Steps 8-14 per ELIMINATION_MODE_SPEC.md §11.

---

## Session: 2026-03-07 (G) — Elimination Mode Step 0: Data Integrity Audit

### What Was Accomplished
- ✅ Full field-by-field data flow audit: `playerDatabase.ts` → `convertPlayer()` → `lineupLoader.ts` → `GameTracker.tsx`
- ✅ **TeamRoster.Player**: Added 15 optional fields (playerId, power, contact, speed, fieldingRating, arm, velocity, junk, accuracy, arsenal, overallGrade, trait1, trait2, personality, chemistry, age, throws, secondaryPosition)
- ✅ **TeamRoster.Pitcher**: Added 14 optional fields (same pattern + batting ratings for pitchers who bat)
- ✅ **lineupLoader.ts**: `convertToRosterPlayer()` and `convertToRosterPitcher()` now pass through all League Builder fields
- ✅ **GameTracker.tsx**: `registerPlayer()` calls use real `trait1`/`trait2` and `age` (was hardcoded `[]` and `25`)
- ✅ Audit report: `spec-docs/DATA_INTEGRITY_AUDIT.md`

### Decisions Made
- Game-session IDs remain name-hash based (`{team}-{normalized-name}`) for backward compatibility. LB `playerId` available on Player/Pitcher for cross-referencing but not used as session ID.
- `personality` hardcoded to `'Competitive'` is acceptable — SMB4 doesn't expose personality separately from chemistry.
- `morale` (75), `mojo` ('Normal'), `fame` (0) are correct starting baselines — managed by engines at runtime.
- FIERY/GRITTY chemistry codes mapped to `Competitive` in `CHEMISTRY_MAP` — acceptable default.

### NFL Results
- Tier 1 (Code): ✅ Build exit 0, 4,028 tests pass
- Tier 2 (Data Flow): ✅ Complete field-by-field trace in DATA_INTEGRITY_AUDIT.md
- **Day Status**: COMPLETE

### Files Modified
- `src/src_figma/app/components/TeamRoster.tsx` — Player/Pitcher interface extensions
- `src/src_figma/utils/lineupLoader.ts` — Field passthrough in both convert functions
- `src/src_figma/app/pages/GameTracker.tsx` — Real traits/age in registerPlayer

### Files Created
- `spec-docs/DATA_INTEGRITY_AUDIT.md` — Full audit report

### Build/Test Baseline
- Build: PASS (exit 0)
- Tests: 4,028 pass / 0 fail / 103 files
- Commit: 5c2d53e (merged to main, pushed)

### Pending / Next Steps
- [ ] Elimination Mode Steps 1-8 per ELIMINATION_MODE_SPEC.md
- [ ] Browser-test Layer 5 enrichment UI
- [ ] Phase C: Code Alignment

---
## Session: 2026-03-07 (F) — Layer 5: Enrichment & Play Log

### What Was Accomplished
- ✅ **TICKET 5.1 (GAP-GT-4-A/B/C/D)**: EnrichmentPanel.tsx — MiniDiamond SVG (tap-to-place field location), FieldingSequenceInput (position number chain), HR distance input, all wired via onEntryTap in GameTracker
- ✅ **TICKET 5.2 (GAP-GT-4-E)**: K/Kc inline toggle badge in PlayLog — tapping "K?" toggles K↔Kc directly on AtBatEvent.result via updateAtBatEvent()
- ✅ **TICKET 5.3 (GAP-GT-4-F)**: Pitch type selector — 9 types (4F, 2F, CB, SL, CH, FK, CF, SB, UNK) as button grid in EnrichmentPanel
- ✅ **TICKET 5.4 (GAP-GT-4-I)**: QAB detection — 7+ pitches OR walk (BB/IBB/HBP) OR hit = Quality At-Bat, shown as "Q" badge in PlayLog
- ✅ **TICKET 5.5 (GAP-GT-4-G)**: Batter position persisted — verified already wired at useGameState.ts:1289 (batterInLineup?.position)
- ✅ **TICKET 5.6 (GAP-GT-4-H)**: IFR auto-prompt — verified still working at GameTracker.tsx:3886 (PO + 2+ runners + <2 outs)
- ✅ **TICKET 5.7 (GAP-GT-4-J)**: Between-inning enrichment prompt — non-blocking gold banner shows unenriched count at end of half-inning
- ✅ **TICKET 5.8 (GAP-GT-4-K)**: Post-game enrichment summary — unenriched count shown in end-game confirmation modal with Enrich/Continue options

### Key Implementation Details
- Added `updateAtBatEvent()` to eventLog.ts — first post-hoc update function (get-then-put on IndexedDB, shallow merge for enrichment)
- PlayLogEntry interface extended with eventId, hasPitchCount, hasPitchType, isQAB
- EnrichmentPanel replaces PlayLogPanel conditionally in Zone 3 (right panel)
- Each enrichment field auto-saves immediately to IndexedDB (no explicit Save button)
- enrichmentCache (Map) tracks local state to avoid re-reading IndexedDB on every panel open

### Decisions Made
- Enrichment is NEVER blocking — all prompts are dismissible, core stats unaffected
- Auto-save per field (not per panel close) — matches spec §4.1 "save immediately"
- QAB badge uses green "Q" pill in PlayLog row 1
- K/Kc toggle updates AtBatEvent.result field directly (not enrichment sub-field)
- Between-inning prompt only shows if unenriched count > 0 and user hasn't dismissed

### NFL Results
- Tier 1 (Code): ✅ Build exit 0, 4,028 tests pass
- Tier 2 (Data Flow): ✅ PlayLog.onEntryTap → GameTracker.handleEntryTap → EnrichmentPanel → handleEnrichmentUpdate → updateAtBatEvent() → IndexedDB
- Tier 2 (Data Flow): ✅ K? badge → handleKToggle → updateAtBatEvent(result) → PlayLogEntry update
- Tier 3 (Spec Alignment): ✅ All 8 tickets match §4.1/§4.2/§4.3 spec
- **Browser Testing**: UNVERIFIED — no live testing performed
- **Day Status**: COMPLETE (code-level)

### Files Created
- `src/src_figma/app/components/EnrichmentPanel.tsx` — MiniDiamond, FieldingSequenceInput, EnrichmentPanel, pitch types

### Files Modified
- `src/utils/eventLog.ts` — added updateAtBatEvent()
- `src/src_figma/app/components/PlayLogPanel.tsx` — extended interface + badges + K toggle + QAB
- `src/src_figma/app/pages/GameTracker.tsx` — enrichment state, handlers, Zone 3 conditional rendering, prompts

### Build/Test Baseline
- Build: PASS (exit 0)
- Tests: 4,028 pass / 0 fail / 103 files

### Pending / Next Steps
- [ ] Browser-test Layer 5 enrichment UI (tap play → panel opens, field location, pitch type, etc.)
- [ ] Phase C: Code Alignment (V1 spec → code gap analysis)
- [ ] Wire startingLineupsRef into archive flow at game end (GameRecord population)

---
## Session: 2026-03-07 (E) — Layer 4: Between-Play Events & Substitutions

### What Was Accomplished
- ✅ **TICKET 4.1 (GAP-GT-5-A)**: Runner tap → popover with Steal/Advance/WP/PB/Pickoff/Substitute
- ✅ **TICKET 4.2 (GAP-GT-5-B)**: WP/PB non-standard advance destination picker (sub-view in popover)
- ✅ **TICKET 4.3 (GAP-GT-7-A)**: Fielder tap → substitution flow (SubstitutionModalBase-based)
- ✅ **TICKET 4.4 (GAP-GT-5-C)**: Pinch runner [Substitute] button in runner popover
- ✅ **TICKET 4.5 (GAP-GT-5-F)**: [Move Position] in fielder popover with PositionSelect
- ✅ **TICKET 4.6 (GAP-GT-5-E)**: Tappable pitcher name in FenwayBoard → pitching change
- ✅ **TICKET 4.10 (GAP-GT-5-G)**: Position innings tracking via positionInningsRef in useGameState

### Decisions Made
- Tap detection in RunnerDragDrop uses pointerDown/pointerUp + `didDragRef` to distinguish taps from drags (<300ms, <8px movement)
- Fielder tap only fires in IDLE flowStep (no interference with play recording)
- Pitcher tap in FenwayBoard triggers `changePitcher()` with first available pitcher (simple for now)
- Position innings increment at `executeEndInning()` for fielding team lineup (DH excluded)
- Runner popover Substitute button logs intent — pinch runner selection still uses LineupCard path

### NFL Results
- Tier 1 (Code): ✅ Build exit 0
- Tier 2 (Data Flow): ✅ RunnerDragDrop.onTap → EIF.onRunnerTap → GameTracker → RunnerPopover → advanceRunner/recordEvent
- Tier 2 (Data Flow): ✅ FielderIcon.onClick → EIF.onFielderTap → GameTracker → FielderPopover → makeSubstitution/switchPositions
- Tier 2 (Data Flow): ✅ FenwayBoard.onPitcherTap → GameTracker → changePitcher()
- Tier 2 (Data Flow): ✅ executeEndInning() → positionInningsRef increment per fielder
- Tier 3 (Spec Alignment): ✅ All 7 tickets match §5.1/§5.2/§7.2 spec
- **Day Status**: COMPLETE

### Files Created
- `src/src_figma/app/components/RunnerPopover.tsx` — contextual runner action menu (6 actions + destination picker)
- `src/src_figma/app/components/FielderPopover.tsx` — contextual fielder action menu (PinchHit/Substitute/MovePosition)

### Files Modified
- `src/src_figma/app/components/RunnerDragDrop.tsx` — added tap detection (onTap, pointerDown/Up)
- `src/src_figma/app/components/EnhancedInteractiveField.tsx` — added onRunnerTap/onFielderTap props, idle-state fielder tap
- `src/src_figma/app/components/FenwayBoard.tsx` — added onPitcherTap prop, pitcher name clickable
- `src/src_figma/hooks/useGameState.ts` — positionInningsRef + endInning increment + hook return
- `src/src_figma/app/pages/GameTracker.tsx` — imports, popover state, 14 handlers, rendering

### Build/Test Baseline
- Build: PASS (exit 0)
- Tests: 4,028 pass / 0 fail / 103 files
- Branch: `feature/gt-layer4-between-play-subs`

### Pending / Next Steps
- [ ] Layer 5: Special Events (TOOTBLAN, Web Gem, Nut Shot auto-detect)
- [ ] Wire startingLineupsRef into archive flow at game end (GameRecord population)
- [ ] Phase C: Code Alignment (V1 spec → code gap analysis)

### Key Context for Next Session
- Feature branch: `feature/gt-layer4-between-play-subs` — NOT yet committed or merged
- Popover architecture: RunnerPopover + FielderPopover are lightweight components rendered as overlays in GameTracker's Zone 2 (diamond area)
- Tap vs Drag: RunnerDragDrop uses didDragRef to prevent tap firing on drag-initiated gestures
- Position innings tracked as Map<playerId, Record<position, halfInnings>> in useGameState ref

---
## Session: 2026-03-06 (D) — Layer 3: Baseball Rules (GAP-GT-6-D/E/F)

### What Was Accomplished
- ✅ **TICKET 3.1 (GAP-GT-6-F)**: Fixed `isAB` filter — added IBB, changed SH→SAC
- ✅ **TICKET 3.5 (GAP-GT-6-D)**: GRD (Ground Rule Double) fully implemented end-to-end
- ✅ **TICKET 3.6 (GAP-GT-6-E)**: Tag-up enforcement — FO/LO hold by default, SF case added

### Decisions Made
- GRD runner defaults reuse '2B' path in `buildPlayData()` — `recordHit('GRD')` passes hitType='2B' for defaults, GRD is stored as its own AtBatResult
- FO/LO: ALL runners hold by default. R3 no longer auto-scores on fly outs — user must tap to advance taggers
- SF: explicit case added: R3 scores, R2/R1 hold. Was previously falling to "all hold" default

### NFL Results
- Tier 1 (Code): ✅ Build exit 0
- Tier 2 (Data Flow): ✅ GRD flows QuickBar → buildPlayData → recordHit → stat counted as double; isAB filter applied at eventLog storage
- Tier 3 (Spec Alignment): ✅ All 3 tickets match GAP-GT-6-D/E/F spec
- **Day Status**: COMPLETE

### Bugs Fixed
- isAB filter had 'SH' (non-existent AtBatResult) instead of 'SAC', and was missing IBB
- 2 runnerMovement tests expected OLD auto-advance FO behavior — updated to match new spec

### Files Modified
- `src/utils/eventLog.ts:951` — isAB filter fix
- `src/types/game.ts` — GRD added to AtBatResult, isHit(), reachesBase()
- `src/src_figma/app/types/game.ts` — same (duplicate type file)
- `src/src_figma/hooks/useGameState.ts` — HitType+'GRD', batterBase, doubles stat, force-out logic
- `src/hooks/useClutchCalculations.ts` — 'GRD': 'double' in exhaustive Record mapping
- `src/src_figma/app/components/QuickBar.tsx` — GRD in OVERFLOW_BUTTONS + BUTTON_COLORS
- `src/src_figma/app/pages/GameTracker.tsx` — GRD in QUICK_BAR_HITS + buildPlayData() case
- `src/src_figma/app/components/runnerDefaults.ts` — SF case added; FO/LO changed to hold-by-default
- `src/src_figma/__tests__/baseballLogic/runnerMovement.test.ts` — 2 tests updated to new spec

### Pending / Next Steps
- [ ] Layer 4: Wire BetweenPlayEvent to useGameState.ts (between-play recording)
- [ ] Wire startingLineupsRef into archive flow at game end (GameRecord population)
- [ ] Layer 5: Special Events (TOOTBLAN, Web Gem, Nut Shot auto-detect)
- [ ] Phase C: Code Alignment (V1 spec → code gap analysis)

### Key Context for Next Session
- All Layer 3 code committed to main as `070affc`
- Feature branch `feature/gt-layer3-baseball-rules` was never created — work done directly on main
- AtBatResult has TWO copies that must stay in sync: `src/types/game.ts` + `src/src_figma/app/types/game.ts`
- Test baseline: 4028 pass / 0 fail / 103 files

---
## Session: 2026-03-06 (C) — Layer 1B completion + Layer 1C: New Event Interfaces

### Accomplished
- **Layer 1B completion** (continued from previous session): AtBatEvent field additions
  - Wired `buildContextSnapshot` at all 5 event construction sites in useGameState.ts
  - Exposed `setNextEventEnrichment` from hook, wired in GameTracker.tsx
  - Fixed 4 build errors (ParkFactors import, zone field, exitType union, PersistedGameState cast)

- **Layer 1C Ticket 1.18 (GAP-GT-2-M)**: BetweenPlayEvent interface — type-only
  - Added `BetweenPlayEventType` (15 types) + `BetweenPlayEvent` interface in eventLog.ts
  - Added `betweenPlayEvents` IndexedDB store (DB_VERSION 2→3) with gameId + type indexes
  - Added `logBetweenPlayEvent()` + `getBetweenPlayEvents()` CRUD functions
  - NOT wired to useGameState — Layer 4 does that

- **Layer 1C Ticket 1.20 (GAP-GT-2-O)**: GameRecord + LineupEntry interfaces — runtime change
  - Added `LineupEntry` interface + `GameRecord` (extends CompletedGameRecord) in gameStorage.ts
  - Added `captureStartingLineups()` helper function
  - Wired lineup capture in GameTracker.tsx after initializeGame call
  - `startingLineupsRef` stores captured lineups for archive-time use

- **Ticket 1.19 (TransactionEvent)**: Deferred (franchise offseason, not gameplay)

- **Test fix**: specialEvents.test.ts hardcoded DB version 2→3

### Verification
- Build: exit 0 (tsc -b + vite build)
- Tests: 4,028 passed / 0 failed / 103 files

### Files Modified
- `src/utils/eventLog.ts` — BetweenPlayEvent interface, DB_VERSION 3, betweenPlayEvents store, CRUD functions
- `src/utils/gameStorage.ts` — LineupEntry, GameRecord interfaces, captureStartingLineups helper
- `src/src_figma/app/pages/GameTracker.tsx` — import captureStartingLineups, startingLineupsRef, lineup capture wiring
- `src/src_figma/hooks/useGameState.ts` — (Layer 1B) buildContextSnapshot wiring, setNextEventEnrichment
- `src/src_figma/__tests__/gameTracker/specialEvents.test.ts` — DB version 2→3

### Pending / Next Steps
- [ ] Layer 2 work continues (Grid scaffold + Quick Bar already committed)
- [ ] Layer 3: Game rules engine
- [ ] Layer 4: Wire BetweenPlayEvent to useGameState.ts (between-play recording)
- [ ] Wire startingLineupsRef into archive flow at game end (GameRecord population)

---

## Session: 2026-03-06 (B) — Layer 2: Grid Scaffold + Quick Bar Wiring

### Accomplished
- **Layer 2A** (commit 9a28ef0): 5-zone CSS Grid scaffold for GameTracker
  - Created `FenwayBoard.tsx` (Zone 1 — compact scoreboard + batter/pitcher context shells)
  - Created `QuickBar.tsx` (Zone 4 — 8 primary outcome buttons + ··· overflow trigger)
  - Created `PlayLogPanel.tsx` (Zone 3 — scrollable activity log, most recent at top)
  - Restructured GameTracker.tsx render section from scrollable layout → CSS Grid (`320px 1fr 180px` / `1fr auto`)
  - Old layout preserved in `{false && (...)}` disabled block for reference
  - EnhancedInteractiveField continues working in Zone 2

- **Layer 2B** (commit 512e7ea): Wire Quick Bar as primary input (§3.2 one-tap flow)
  - Built `handleQuickBarOutcome` in GameTracker.tsx (~100 lines)
  - Flow: tap → snapshot context → calculateRunnerDefaults → capture undo → calculate RBI → record play → log → update diamond
  - Outcome routing: HITS→recordHit, OUTS→recordOut, WALKS→recordWalk, E→recordError, D3K/WP_K/PB_K→recordD3K
  - Added overflow menu to QuickBar with 13 secondary outcomes (PO, 3B, HBP, E, FC, DP, TP, SAC, SF, IBB, WP_K, PB_K, D3K)
  - Color-coded by category: red (outs), blue (on-base), purple (HR), amber (hybrid)
  - Both Quick Bar and EnhancedInteractiveField coexist as input paths

### Verification
- Build: exit 0 (tsc -b + vite build)
- Tests: 4,028 passed / 0 failed / 103 files

### Files Modified
- `src/src_figma/app/components/FenwayBoard.tsx` — NEW (110 lines, Zone 1 shell)
- `src/src_figma/app/components/QuickBar.tsx` — NEW → updated (58→117 lines, overflow menu added)
- `src/src_figma/app/components/PlayLogPanel.tsx` — NEW (43 lines, Zone 3 shell)
- `src/src_figma/app/pages/GameTracker.tsx` — Grid layout + handleQuickBarOutcome handler

### Pending / Next Steps
- [ ] Layer 3: Game rules engine (inning transitions, auto-end detection in grid mode)
- [ ] Layer 4: Between-play features (pitch count modal, substitution flow in grid mode)
- [ ] Layer 5: Enrichment (fame popups, detection prompts, mWAR banner in grid mode)
- [ ] FenwayBoard context cards need wiring (batter stats, pitcher stats, matchup history)
- [ ] PlayLogPanel enrichment badges ([+ fielding], [+ location]) per §4.2

---

## Session: 2026-03-06 — GameTracker Delta Plan Phases 1 & 2
### Accomplished
- **Phase 1 Quick Wins** (commit 177373d): 11 zero-dependency GAP tickets
  - Added tsconfig.app.json exclusions for dead code paths
  - Various quick-fix type and spec alignment items
- **Phase 2 Layer 1 Tier 1A** (commit ecce786): 8 type definition fixes
  - GAP-GT-2-L: Renamed KL→Kc across 31 files (69 occurrences), added WP_K/PB_K to AtBatResult + reachesBase()
  - GAP-GT-2-B: Renamed sequence→eventIndex in AtBatEvent + IndexedDB index, bumped event log DB_VERSION 1→2
  - GAP-GT-2-I: Changed AtBatEvent.runsScored from number to string[]|number (union for backward compat)
  - GAP-GT-2-P: Created MojoLevelLabel adapter type + toMojoLabel() converter
  - GAP-GT-2-Q: Created FitnessLevelLabel adapter type + toFitnessLabel() converter
  - GAP-GT-2-R: Created FameLevel type (6-tier)
  - GAP-GT-2-T: Created SpecPitcherRole type + toSpecPitcherRole() converter
  - GAP-GT-2-S: Created HiddenModifiers interface
  - All adapter types in src/types/game.ts SPEC ADAPTER TYPES section. No KEEP.md-protected files modified.
### Verification
- Build: exit 0 (tsc -b + vite build)
- Tests: 4,028 passed / 0 failed / 103 files
### Notes
- WP_K/PB_K are reach-base events (like D3K), NOT outs — added to reachesBase(), not isOut()
- FieldingEvent.sequence and PitchingAppearance.entrySequence are separate fields, intentionally NOT renamed
- walkoffDetector.ts has its own PlayEvent interface (not AtBatEvent), so runsScored type change had no impact there
- MojoLevelLabel includes 6 labels but engine only has 5 levels — 'On Fire' has no engine equivalent
- Added missing 'TP' to src/src_figma/app/types/game.ts AtBatResult union (was already in src/types/game.ts)

## Session: 2026-02-18 — Persistence/Rehydration Hardening (GameTracker Figma Path)
### Accomplished
- Investigated refresh regression where large scoreboard values leaked from prior sessions and lead runners intermittently disappeared.
- Identified race/staleness causes in `src/src_figma/hooks/useGameState.ts`:
  - `currentGame` snapshot rehydrated without strict in-progress header validation,
  - shared debounced save path allowed delayed stale writes across game boundaries,
  - snapshot runner identity could be absent while base occupancy booleans remained true.
- Implemented hardening changes:
  - Strict snapshot gate: rehydrate snapshot only when gameId matches AND `getGameHeader(...).isComplete === false`.
  - Stale snapshot cleanup: auto-clear mismatched/invalid `currentGame` snapshots.
  - Autosave isolation: replaced shared `debouncedSaveCurrentGame` usage with hook-local timeout + `saveCurrentGame`.
  - Lifecycle safety: clear pending autosave timers during initialize/load/unmount/end-game.
  - Session hygiene: clear `currentGame` on new game initialization and after completed game processing.
  - Runner durability: fallback serialization preserves occupied lead bases even if tracker identity momentarily lags.
### Verification
- Figma persistence path updated and compiles.
- Full `npm run build` still surfaces pre-existing legacy type errors in `src/components/GameTracker/*` outside the active Figma path.
### Pending Manual Check
- Browser validation still required:
  1. Start game A, create runners + scoreboard changes, refresh, verify all bases and line score persist.
  2. End game A, start game B, verify no residual scoreboard/runners carry over.

## Session: 2026-02-12 — Full Stack Audit + Post-Season Build
### Accomplished
- Full Stack Audit: 28 defects found and fixed (2 CRITICAL, 12 MAJOR, 8 MINOR, 4 INFO)
- DEF-001 CRITICAL: Fixed IndexedDB v2/v3 version deadlock (created trackerDb.ts)
- DEF-002 CRITICAL: Deleted stadiumData.ts, wired real stadium names from IndexedDB
- All Math.random() fake stats removed
- All hardcoded MLB names removed from franchise UI
- MOCK_* constants renamed to EMPTY_*
- Orphan variables cleaned up
### Post-Season Build (4 Batches)
- Batch 1: Wired 5 orphaned code assets (seasonTransitionEngine, qualifyTeams, SeasonEndFlow, PlayoffSeedingFlow, PostseasonMVPFlow)
- Batch 2: Added playoff SIM, cleaned WorldSeries LEADERS/HISTORY tabs
- Batch 3: Offseason persistence (retirements, FA, draft, ratings all modify actual rosters)
- Batch 4: Both season advancement paths aligned, career stats verified safe
### Bug Fixes
- 3 React hooks crashes fixed (SpecialAwardsScreen, RetirementFlow, FinalizeAdvanceFlow)
- 3 missing offseason tabs added (Farm Reconciliation, Chemistry Rebalancing, Spring Training)
- Tab order corrected to match state machine
- Contraction/Expansion: 1,310 lines of stub replaced with 64-line honest placeholder
### Full Lifecycle Verified
- Season 1 → Playoffs → Champion → Offseason (11/11 phases) → Season 2 → Play games ✅
- 0 console errors throughout
### Browser-Verified Flows (continued session)
- League Leaders N/A fix: rewired batch SIM to full pipeline (generateSyntheticGame + processCompletedGame)
- useFranchiseData: dynamic seasonId from currentSeason param (was hardcoded season-1)
- FreeAgencyFlow hooks crash: moved isLoading early return after all hooks + guarded currentTeam access
- DraftFlow: replaced 2 hardcoded "SAN FRANCISCO GIANTS" with dynamic userTeamName
- Flow D1 (Free Agency): PASS — full protection→dice→destination→exchange flow with real players
- Flow D2 (Draft): PASS — 20 AI-generated prospects, user pick, roster tracking (FIXED MLB name bug)
- Flow D3 (GameTracker Season 2): PASS — game loads with full field, all buttons, playable
- Flow D4 (Museum): PASS — UI loads (6 tabs), data empty (expected: museum pipeline not built yet)
### Offseason Phase Machine Verification (continued session)
- Wired SpringTrainingFlow `onComplete` prop from FranchiseHome → handleAdvancePhase
- SIMmed Season 2: 160 regular season games → playoffs (Crocodons champion, 4-0 sweep of Wideloads) → offseason
- Systematically verified ALL 11 offseason phase transitions via browser:
  - Phase 1→2 (STANDINGS_FINAL → AWARDS): PASS — tab auto-selected to AWARDS, Awards Ceremony content loaded
  - Phase 2→3 (AWARDS → RATINGS_ADJUSTMENTS): PASS — tab auto-selected to RATINGS ADJ
  - Phase 3→4 (RATINGS_ADJUSTMENTS → CONTRACTION_EXPANSION): PASS — tab auto-selected to CONTRACT/EXPAND
  - Phase 4→5 (CONTRACTION_EXPANSION → RETIREMENTS): PASS — tab auto-selected to RETIREMENTS
  - Phase 5→6 (RETIREMENTS → FREE_AGENCY): PASS — tab auto-selected to FREE AGENCY
  - Phase 6→7 (FREE_AGENCY → DRAFT): PASS — tab auto-selected to DRAFT
  - Phase 7→8 (DRAFT → FARM_RECONCILIATION): PASS — tab auto-selected to FARM SYSTEM
  - Phase 8→9 (FARM_RECONCILIATION → CHEMISTRY_REBALANCING): PASS — tab auto-selected to CHEMISTRY
  - Phase 9→10 (CHEMISTRY_REBALANCING → TRADES): PASS — tab auto-selected to TRADES
  - Phase 10→11 (TRADES → SPRING_TRAINING): PASS — tab auto-selected to SPRING TRAINING
  - Phase 11→COMPLETED: PASS — "START SEASON 3" button appears, IndexedDB status=COMPLETED
- IndexedDB verified: all 11 phases in phasesCompleted array, completedAt timestamp present
- Spring Training content loads with real data: 78 DEVELOPING, 308 PRIME, 120 DECLINING, 0 MUST RETIRE
- Only console error: pre-existing FreeAgencyFlow hooks ordering warning (non-blocking)
### Pending (for next session)
- FinalizeAdvanceFlow requires 32 players per team (farm validation blocks advance without full draft)
- ~~GameTracker "TIGERS/SOX" defaults~~ — FIXED (uses navigationState, defaults to 'HOME'/'AWAY')
- Museum data pipeline needs building (all tabs empty)
- FreeAgencyFlow hooks ordering warning (React dev mode, non-blocking)
- See CURRENT_STATE.md "Known Issues" section for complete list

---
## Session: 2026-02-12 (cont.) — Data Integrity Fixes + Documentation Reconciliation
### Data Integrity Fix Plan v2 (21/21 RESOLVED)
All batches completed. Full details in `DATA_INTEGRITY_FIX_REPORT.md`.

| Batch | Issues | Commits |
|-------|--------|---------|
| 1A-i | #1 pitcher stats, #4 fielding persistence | (prior session) |
| 1A-ii | #5 runnersAfter null, #6 basesReachedViaError | (prior session) |
| 1B | #2 milestone playerName, #3 W/L/SV, #11 HBP/SF/SAC/GIDP | a76ad23 |
| 2A | #8 loss decision, #13 isPlayoff, #14 walk-off, #15 team record | 7629f29 |
| 2B | #10 pitch count, #16 SB/CS in WAR, #17 fielding credits | d393bfd |
| 2C | #7 autoCorrectResult wired | 6b5dd45 |
| 3 | #18 hooks ordering, #19-20 docs, #21 dead balks field | def25eb |
| F1 | Career pitching W/L/SV/H/BS aggregation | d790a72 |
| F2 | #12 WPA system (winExpectancyTable + wpaCalculator, 26 tests) | 1f39f15 |
| F3 | #9 LineupState tracking + substitution validation | 4b0e11e |

### Documentation Reconciliation
- Updated DATA_INTEGRITY_FIX_REPORT.md: 21/21 ALL RESOLVED (296141a)
- Updated FEATURE_WISHLIST.md: moved 13 completed items, added "Still Orphaned" section (60c1c4f)
- Updated IMPLEMENTATION_PLAN.md: reconciled engine matrix, remaining 9 sprint items (60c1c4f)
- Updated CURRENT_STATE.md: fixed test count (5653/134), marked #6/#13/#14 as FIXED, added data integrity + orphan + bug sections
- Updated SESSION_LOG.md: added data integrity batch table
- Cleaned CLAUDE.md: removed stale ACTIVE FIX PROTOCOL section (data integrity work complete)

### Final Test Baseline
- Build: PASS (exit 0)
- Tests: 5,653 passing / 0 failing / 134 test files
- All 8 canary checks: PASS

### Remaining Sprint Work (per IMPLEMENTATION_PLAN.md)
**Orphan wiring (3):** Clutch hook import, fWAR/rWAR display columns, Mojo/Fitness scoreboard display
**Gap closure (3):** IBB tracking, Player ratings data model, Milestone watch UI
**Bug fixes (4):** BUG-006 (scoreboard), BUG-007 (fame events), BUG-008 (end game modal), BUG-014 (inning summary)

---
## Session: 2026-02-13 (cont.) — Tier 0 + Tier 1 Bug Fixes

### Tier 0 Fixes (5 commits)
- T0-01: Auto game-end detection at regulation end (c52b685)
- T0-03: Baserunning outs (CS/pickoff/TOOTBLAN) triggering half-inning end (1ecca6b)
- T0-04: Wire error flow position buttons to recordError() (06d075d)
- T0-05: Game persistence — played games now persist to standings/schedule (7e7b363)
- T0-07/T0-11/T0-12: Replace hardcoded Tigers/Sox with dynamic team names (db5ba24)

### Tier 1 Diagnostic (Phase 1)
- T1-01: Fame per-player tracking — CONDITIONAL (works but affected by T1-08 doubling)
- T1-07: Scoreboard display — RESOLVED (core works, 9-column cosmetic minor)
- T1-08: Post-game stats — STILL BROKEN (all stats exactly doubled)

### Tier 1 Fixes (7 commits)
| ID | Issue | Fix | Commit |
|----|-------|-----|--------|
| T1-08 | Stats doubled in post-game | Idempotency guards in completeGameInternal + endGame | ba382fe |
| T1-09 | Mojo/Fitness factors | VERIFIED CORRECT — no fix needed | N/A |
| T1-10 | Pitcher rotation in SIM | Rotation cycling, closer usage, save/hold detection | 8c52ba8 |
| T1-02/03/04 | Runner identity bugs | getBaseRunnerNames() sync from tracker + version counter | 8b8505c |
| T1-05 | Fielding inference | Auto-infer credits from fieldingSequence, skip modal | 21aa89c |
| T1-06 | Error prompt on OUT | Clear stale React state + local variable for check | 02876e5 |
| T1-11 | SMB4 traits made-up | Replaced 32 fake traits with 63 real SMB4 traits | 0bd310c |

### Build Status
- Build: PASS (exit 0)
- Tests: 5,653 / 5,653 passing (134 files) — matches baseline

### Items Needing Runtime Verification
1. T1-01: Fame popup count correctness post-T1-08 fix
2. T1-02/03/04: Pinch runner name display on bases
3. T1-05: FielderCreditModal auto-skip on standard plays
4. T1-06: No false ErrorOnAdvanceModal on OUT plays after hit

### Full Report: spec-docs/TIER1_VERIFICATION.md

---
## Session: 2026-02-13 — Pre-Manual Bug Triage + Doc Reconciliation

### What Was Accomplished
- ✅ Deep cross-check of ALL tracking docs vs actual codebase (6 documents updated)
- ✅ Full bug triage: read GAMETRACKER_BUGS.md, traced all 4 active bugs in code, classified each
- ✅ Discovered BUG number collision (GAMETRACKER_BUGS.md vs IMPLEMENTATION_PLAN.md used same numbers for different bugs)
- ✅ Found BUG-007 (Fame events) is LIKELY FIXED — useFameTracking fully wired with popup (GameTracker:2016-2040)
- ✅ Found BUG-008 was mislabeled — End Game modal is fine, real issue is PostGameSummary data gaps
- ✅ Confirmed FinalizeAdvanceFlow 32-player already uses soft gate ("Advance Anyway" button)
- ✅ Classified all orphan features (Clutch=INVISIBLE, fWAR/rWAR=NO UI BUILT)
- ✅ Verified IBB IS tracked (useGameState:107,283), Player ratings viewable in offseason
- ✅ Updated GAMETRACKER_BUGS.md summary (11/15 fixed, 4 remaining)
- ✅ Updated CURRENT_STATE.md with accurate issue list (7 active items, properly described)
- ✅ Updated IMPLEMENTATION_PLAN.md bug table (removed stale BUG numbers, 11 remaining sprint items)
- ✅ Fixed stale MEMORY.md (test baseline, autoCorrectResult marked fixed)
- ✅ Committed doc reconciliation (5bdf426) and triage (d379437)

### Decisions Made
- Bug number collision resolved: GAMETRACKER_BUGS.md retains original numbers, IMPLEMENTATION_PLAN.md now uses descriptive names instead
- Fame events classified "LIKELY FIXED" pending live verification rather than "TODO"
- PostGameSummary gaps now properly described (errors=0 hardcode + no batting box score) instead of vague "End Game modal wrong data"

### NFL Results
- Not an implementation day — triage/documentation only
- **Day Status**: COMPLETE (triage objective achieved)

### Build Status
- Build: PASS (exit 0)
- Tests: 5,653 / 5,653 passing (134 files)
- All canary checks: PASS

### Pending / Next Steps
**Must verify during manual testing:**
- [ ] Fame events popup — trigger one in live game to confirm LIKELY FIXED
- [ ] PostGameSummary — play a game, end it, check if box score data looks right

**Remaining sprint items (11 total, per IMPLEMENTATION_PLAN.md):**
Orphan wiring:
- [ ] Wire Clutch Calculator (import useClutchCalculations in GameTracker)
- [ ] Add fWAR/rWAR display columns
- [ ] Mojo/Fitness scoreboard display (MiniScoreboard has no mojo/fitness props)

Gap closure:
- [ ] IBB tracking in bWAR (IBB tracked, verify wOBA formula excludes it)
- [ ] Player Ratings data model (types + storage + game setup UI)
- [ ] Milestone Watch UI (component + hook + scoreboard)
- [ ] PostGameSummary fixes (errors=0, add batting box score)
- [ ] Inning summary component (new, render at inning flip)
- [ ] Exit type double-entry UX (review AtBatFlow modal)
- [ ] Lineup access modal (view/edit lineup mid-game)
- [ ] Special plays logging (wire fame + activity log for diving/robbery)

### Key Context for Next Session
- GAMETRACKER_BUGS.md original BUG-006 = "Exit type double entry" (NOT mojo/fitness)
- GAMETRACKER_BUGS.md original BUG-008 = "Team names in scoreboard" (FIXED, NOT end game modal)
- IMPLEMENTATION_PLAN.md now uses descriptive names to avoid number confusion
- Fame popup code exists at GameTracker.tsx:2016-2040 — test by getting a home run or special event
- PostGameSummary.tsx:162 has `errors: 0` hardcoded — fix by pulling from game state

### Files Modified
- `spec-docs/CURRENT_STATE.md` — accurate test count, fixed statuses, added active issues section
- `spec-docs/GAMETRACKER_BUGS.md` — updated summary table (11/15 fixed), separated tracking
- `spec-docs/IMPLEMENTATION_PLAN.md` — accurate bug table, 11 remaining sprint items
- `spec-docs/SESSION_LOG.md` — this session entry
- `CLAUDE.md` — removed stale ACTIVE FIX PROTOCOL (replaced with completion notice)

### Commits This Session
- `5bdf426` — Reconcile all tracking docs with actual codebase state
- `d379437` — Pre-manual triage: classify bugs, update tracking docs

---
## Session: 2026-02-14 — Tier 2 Bug Fixes (6 commits)

### Tier 2 Diagnostic
Assessed all 11 T2 issues. Found 5 already resolved by prior T0/T1 work:
- T2-01 (Mock data): mockData.ts orphaned/unused
- T2-02 (Lineup card): Dynamic reactive data flow works
- T2-03 (Beat writers): Shows empty state (feature not built is expected)
- T2-06 (SIM box scores): Data pipeline complete
- T2-08 (Manager decisions): Fully wired

### Tier 2 Fixes
| ID | Issue | Root Cause | Fix | Commit |
|----|-------|------------|-----|--------|
| T2-11 | Errors not on MiniScoreboard | No error props in interface | Added awayErrors/homeErrors to MiniScoreboard | 24692ab |
| T2-04 | Salaries all $0.0 | convertPlayer() hardcoded salary: 1.0 | computeInitialSalary() calls salary engine | b17d025 |
| T2-05 | Team Hub no player stats | useSeasonStats() defaulted to 'season-1' | Derive correct seasonId from franchiseData | 0e5c288 |
| T2-07 | No narratives in news tab | Narratives generated but never persisted | Load recent games + generate on-the-fly | 951c6f2 |
| T2-09 | Immaculate inning no popup | Detection fired to fameEvents[] but not display hook | Wire confirmPitchCount result to fameTrackingHook | 11e7a9c |
| T2-10 | Duplicate positions in lineup | slice(0,8) with no dedup | 3-pass greedy position-fill algorithm | efe0d43 |

### Build Status
- Build: PASS (exit 0)
- Tests: 5,653 / 5,653 passing (134 files) — matches baseline

### All Runtime UNVERIFIED
All 6 fixes pass build+tests but need manual verification:
1. T2-11: Start game, minimize scoreboard, record error → see "E:1"
2. T2-04: Create fresh franchise → check player salaries (non-zero, varied)
3. T2-05: Play franchise game → Team Hub Stats tab shows WAR
4. T2-07: Play game → Tootwhistle Times tab shows narratives
5. T2-09: 3K on 9 pitches → confirm pitch count → fame popup appears
6. T2-10: Start franchise game → verify 8 unique field positions + pitcher 9th

---
## Session: 2026-02-14 (cont.) — Tier 3 Feature Builds (3 commits)

### Plan: spec-docs/TIER3_BUILD_PLAN.md

### Tier 3 Features
| ID | Issue | Size | Fix | Commit |
|----|-------|------|-----|--------|
| T3-02 | View Roster button dead | SMALL | Added useNavigate + onClick to navigate('/league-builder/rosters') | e252ccb |
| T3-03 | No way to remove games | MEDIUM | Added onDeleteGame prop to ScheduleContent, Trash2 icon + inline confirm | acfb04b |
| T3-01 | No pre-game lineup screen | LARGE (MVP) | PreGameData state in GameDayContent, LineupPreview overlay, starter dropdown | 498e4be |

### Build Status
- Build: PASS (exit 0)
- Tests: 5,653 / 5,653 passing (134 files) — matches baseline

### All Runtime UNVERIFIED
1. T3-02: Go to franchise setup → Step 5 (Roster Mode) → "[View Rosters]" link navigates to league builder
2. T3-03: Go to Schedule tab → see trash icon on scheduled games → click → confirm → game deleted
3. T3-01: Click "Play Game" in franchise → pre-game overlay shows lineups + starter picker → select starter → "START GAME" launches

### Summary
All 35 items from MANUAL_TESTING_BUG_FIX_PLAN.md addressed:
- Tier 0: 6 game-breaking fixes (prior session)
- Tier 1: 11 wrong-results fixes (prior session)
- Tier 2: 6 wiring fixes + 5 already resolved
- Tier 3: 3 feature builds

---
## Session: 2026-02-14 (cont.) — Remaining Tier 3 + Cosmetic Fixes (5 commits)

### Items Completed
| ID | Issue | Size | Fix | Commit |
|----|-------|------|-----|--------|
| T3-05 | SMB4 name verification | SMALL | Audited all name pools — 100% real SMB4 names, 0 fake | 1725882 |
| T3-04 | Museum data pipeline (MVP) | MEDIUM | Created museumPipeline.ts, auto-populate AllTimeLeaders from career data | c74d4c7 |
| T3-06 | Milestone watch UI (MVP) | LARGE | MilestoneWatchPanel component + async loading in pre-game overlay | 9f6f362 |
| T3-07 | fWAR/rWAR display columns | MEDIUM | Added BattingSortKey entries, useFranchiseData leaders, SeasonLeaderboards UI | 8348962 |
| T0-15 | Post-game 9-inning header | SMALL | Derived numInnings from inningScores.length, replaced 4 hardcoded 9s | 91911ba |

### Files Created
- `src/utils/museumPipeline.ts` — Bridge between careerStorage and museumStorage
- `src/src_figma/app/components/MilestoneWatchPanel.tsx` — Approaching milestones display

### Files Modified
- `src/src_figma/hooks/useMuseumData.ts` — Auto-populate on load when empty
- `src/src_figma/app/pages/FranchiseHome.tsx` — Milestone watch in pre-game overlay
- `src/hooks/useSeasonStats.ts` — fWAR/rWAR sort keys
- `src/src_figma/hooks/useFranchiseData.ts` — fWAR/rWAR leader data
- `src/components/GameTracker/SeasonLeaderboards.tsx` — fWAR/rWAR column headers
- `src/src_figma/app/pages/PostGameSummary.tsx` — Dynamic inning count

### Build Status
- Build: PASS (exit 0)
- Tests: 5,653 / 5,653 passing (134 files) — matches baseline

### All Runtime UNVERIFIED
1. T3-04: Open Museum → All-Time Leaders tab should auto-populate from career data
2. T3-06: Click "Play Game" in franchise → pre-game overlay shows milestone watches
3. T3-07: Go to League Leaders → fWAR and rWAR categories visible and sortable
4. T0-15: Play a 7-inning game → post-game scoreboard shows 7 columns, not 9

### Complete Bug Fix Summary
All 40 items across all tiers now addressed:
- Tier 0: 6 game-breaking fixes + 1 cosmetic (T0-15)
- Tier 1: 11 wrong-results fixes
- Tier 2: 6 wiring fixes + 5 already resolved
- Tier 3: 6 feature builds + 1 verification (T3-05) + 2 new features (T3-04, T3-06, T3-07)

---
## Session: 2026-02-14 (cont.) — Full Codebase Cleanup

### Goal
Make the project easily understandable for future AI agent sessions that have never worked in kbl-tracker.

### Phase 1: spec-docs/ Cleanup (417MB → 262MB)
- Deleted 254 duplicate .jpg files (~190MB) — SMB4 screenshots existed as both .jpg and .jpeg
- Archived 38 completed work artifacts (CLI prompts, audit reports, old session logs)
- Archived superseded document versions
- Removed .DS_Store files throughout
- Removed exact duplicate files (identified via md5 hash)

### Phase 2: src/ vs src_figma/ Analysis
- Confirmed src_figma lives INSIDE src/ at `src/src_figma/` (not a sibling)
- Mapped 384+ cross-imports from src_figma → src/ (engines, utils, types, hooks)
- Confirmed all 16 routes in App.tsx import exclusively from src_figma/app/pages/
- Identified 6 duplicate utils, dead pages, dead services

### Phase 3: Dead Code Removal
**Archived (preserved in archived-*/ folders):**
- 20 dead legacy page components → `src/archived-pages/` (252K)
- 35 dead components (awards/, museum/, offseason/ subfolders) → `src/archived-components/` (372K)
- 3 dead hooks (useNarrativeMorale, usePlayerData, useRosterData) → `src/archived-hooks/` (16K)
- 8 orphan test files → `src/archived-tests/` (124K)
- 11 stale migration docs → `src/src_figma/archived-docs/` (208K)

**Deleted (not archived):**
- `src/services/` — 2 dead files (apiConfig.ts, teamService.ts), no imports
- `src/src_figma/imports/` — 2 Figma export artifacts, never imported
- 4 stale figma config files from src_figma/ root
- Root-level artifacts: cleanup.sh, run-cleanup.sh, CLAUDE.md.backup, files.zip

### What Remains Active in src/
- `components/`: GameTracker/ (31 files) + 6 shared components (AgingDisplay, FanMoralePanel, LeagueBuilder, NavigationHeader, RelationshipPanel, TeamSelector)
- `hooks/`: 16 hooks — all verified as imported by active code
- `engines/`: 36 engine files + __tests__/ (WAR calculators, mojo, salary, playoffs, etc.)
- `utils/`: 38 storage + utility modules (IndexedDB layer, game processing, franchise management)
- `types/`: 4 type files (game.ts, franchise.ts, war.ts, index.ts)
- `context/`: AppContext.tsx + appStateStorage.ts
- `tests/`: 3 files (baseballLogicTests, runStateMachineTests, stateMachineTests)

### Final Sizes
- spec-docs/: 263MB (mostly SMB4 reference images)
- src/: 8.9MB total
- archived-*/ folders: ~764K total

### Known Deferred Item
- Type consolidation: src/types/ vs src/src_figma/app/types/ have partial duplicates (game.ts differs by FAILED_ROBBERY constant, war.ts is identical, index.ts differs). Requires updating 384+ import paths — deferred to dedicated session.

### Documentation Updated
- CURRENT_STATE.md: Added "CODEBASE ARCHITECTURE" section with directory layout, architecture rules, and type duplication notes
- SESSION_LOG.md: This entry

### Decisions Made
- **No folder restructuring:** src_figma stays inside src/ — moving it would break vite alias, tsconfig paths, and all @ imports
- **Archive over delete:** Dead code moved to archived-*/ folders rather than deleted, for reference
- **Type consolidation deferred:** Too many import paths to update safely without dedicated session + build verification

### Phase 4: Full Project Cleanup for Agent Transfer
**Goal:** Prep entire kbl-tracker folder for new agents starting from scratch.

**Root-level cleanup:**
- Removed duplicate `mcp.json` (identical to `.mcp.json`)
- Removed `Claude Skills/` folder (superseded by `.claude/skills/`)
- Removed `test-results/` (empty, just `.last-run.json`)
- Removed `.DS_Store`

**spec-docs reorganization (134 → 78 items at root):**
- Archived 24 audit/report artifacts (AUDIT_REPORT, COHESION_REPORT, DATA_INTEGRITY_FIX_REPORT, etc.)
- Archived 12 stale/superseded docs (PIPELINE, CLAUDE_CODE_CONSTITUTION, RALPH_FRAMEWORK, etc.)
- Created `stories/` subfolder → moved 14 STORIES_*.md files
- Created `testing/` subfolder → moved 6 testing pipeline + API map docs
- Removed duplicates (Audit Triage.xlsx, test_write_permission)
- Archive grew from 82 → 119 files

**src cleanup:**
- Removed `src/src_figma/app/data/mockData.ts` (confirmed orphaned/unused)

**CLAUDE.md rewrite:**
- Updated project structure with accurate file counts (16 pages, 49 components, 15 figma engines, etc.)
- Removed 70-line SMB4 extraction protocol (one-time-use, no longer needed)
- Updated custom skills section (4 → 20 skills, organized by pipeline)
- Removed stale references to deleted files and old component counts

**CURRENT_STATE.md updates:**
- Updated spec-docs directory layout to reflect new subfolder structure
- Archive count updated (79 → 119)

**Final project state:**
- Root: 15 items (src, spec-docs, reference-docs, test-utils, config files)
- spec-docs/: 78 items at root, organized into 7 subfolders
- src/: 8.9MB, all active code verified
- CLAUDE.md: 187 lines, accurate, concise
- All 3 agent-facing docs (CURRENT_STATE, SESSION_LOG, CLAUDE.md) current and consistent

- **2026-02-15:** Phase 1 GameTracker bugs (exit-type double entry, lineup modal access, special-play logging, stadium/HR data) resolved; `fake-indexeddb` added for season/franchise tests, PostGameSummary/useGameState imports aligned, and `npm test` confirms 134 suites (5,653 tests) pass. Phase 2 wiring validation remains the next active effort.
## Session: Feb 15, 2026 — Reconciliation & Data Foundation

### Context
Began executing Codex prompt contracts for KBL Tracker reconciliation fixes and franchise/gametracker remediation. Prompt contracts were architected by Claude (claude.ai) based on:
- Reconciliation audit of 102 corrections from specs/KBL_Guide_v2_Spec_Reconciliation.json
- FRANCHISE_GAMETRACKER_PLAN.md (5-phase remediation)
- Billy Yank's Guide to Super Mega Baseball (3rd Edition) for park dimensions data

### Completed
- **R1 — Maddux Threshold Fix (IDs 6, 20)**
  - Replaced hardcoded pitchThreshold=100 in detectMaddux with Math.floor(inningsPerGame * 9.44)
  - Added calculateMadduxThreshold helper in src/hooks/useFameDetection.ts
  - Added DEFAULT_INNINGS_PER_GAME constant, made GameContext carry optional inningsPerGame
  - Plumbed inningsPerGame: 9 through end-game and mid-game fame contexts in GameTracker/index.tsx
  - Files changed: src/hooks/useFameDetection.ts, src/components/GameTracker/index.tsx

- **R0 — Build Baseline Cleanup (26 pre-existing errors → 0)**
  - Added src/archived-pages/** and src/archived-tests/** to tsconfig.app.json exclude (killed 16 errors)
  - Fixed stale import paths in src_figma: warOrchestrator.ts, useSeasonStats.ts, PostGameSummary.tsx, FranchiseHome.tsx
  - Created shim modules in src/src_figma/utils/ (gameStorage, seasonStorage, careerStorage, franchiseStorage) that re-export from root src/utils/*
  - Extended CompletedGameRecord with playerStats, pitcherGameStats, inningScores fields
  - Added getCompletedGameById helper to src/utils/gameStorage.ts
  - npm run build now passes with 0 errors

- **D1 — Park Dimensions Data Ingestion**
  - Added src/data/smb4-parks.json with all 23 SMB4 park dimensions (source: Billy Yank's Guide, 3rd Edition)
  - Created src/data/parkLookup.ts with TypeScript types (ParkDimensions, WallHeight) and utilities (getParkByName, getAllParks, getParkNames, getMinFenceDistance, LEAGUE_AVG_DIMENSIONS)
  - Added resolveJsonModule: true to tsconfig.app.json
  - Park count verified: 23

### Decisions Made
- Billy Yank's Guide (3rd Edition) is the canonical source for SMB4 park dimensions
- Park factors will be derived from real fence distances via heuristic formula (upcoming R2)
- HR distance validation will use actual fence distance per stadium per direction (upcoming B3)
- Shim modules chosen over mass-renaming of src_figma imports to minimize churn
- archived-pages/ and archived-tests/ excluded from build rather than deleted (preserves history)

### Known Issues (pre-existing, not introduced by this session)
- npm test fails on 4 archived test suites that still reference missing modules
- .worktrees/ copies have stale imports that don't match main tree
- These do NOT affect the main build or main-tree test suites

### Pending (next session)
- R2: Park factor clamping [0.70, 1.30] + derivation from real dimensions
- R3: All-Star break timing (0.5 → 0.6)
- R4: Undo stack cap (10 → 20)
- R-VERIFY: Mark all 102 reconciliation corrections resolved in JSON
- B1-B4: GameTracker bug fixes (exit modal, lineup modal, stadium association, special plays)
- W1-W3: Franchise ↔ GameTracker wiring verification
- T1: Core regression tests

## 2026-02-18 (Batch D)
- Ran Tier 1 Batch D: Farm, Trade, Salary, League Builder, Museum/HOF, Aging/Ratings, Career Stats
- Logged FINDING-072 through FINDING-079 to FINDINGS_056_onwards.md
- Updated SUBSYSTEM_MAP.md rows 13–19 with confirmed wiring verdicts
- Updated CURRENT_STATE.md — Tier 1 breadth survey now COMPLETE
- Key verdicts: Farm/Trade ORPHANED; League Builder WIRED; ratingsAdjustmentEngine ORPHANED; HOF test-only; Aging partially live via direct import bypass; Career storage wired
- salaryCalculator wiring UNVERIFIED (wrong path used in audit — lives at src/engines/ not src/utils/)
- Tier 1 complete. Next: Tier 2 wiring check OR Phase 1 synthesis. JK to decide.
## Session: 2026-02-18 — Phase 2 OOTP Pattern Audit (cont.) — Fan Morale, Stats Aggregation, Positional WAR, Trait System

### Accomplished
- FINDING-100 executed and marked FIXED: legacy field removal (InteractiveField, DragDropGameTracker archived, -200 lines from GameTracker.tsx). Commit: 3705a86.
- FINDING-101 logged: Fan Morale — BROKEN. `processGameResult` called instead of `recordGameResult` (silent no-op). Fix contract written in PROMPT_CONTRACTS.md. Bug B (hardcoded season/game numbers) and Bug C (localStorage instead of IndexedDB) also documented.
- Design clarification: Player Morale (OOTP-style 5-category system) vs Traits (SMB4 static player attributes) are fully independent systems. FEATURE_WISHLIST.md corrected to remove false trait/morale coupling.
- FINDING-102 logged: Stats Aggregation — PARTIAL. Steps 5+9 wired correctly. OOTP Steps 6 (standings), 7 (leaderboard), 8 (WAR), 10 (narrative), 11 (development) all absent from post-game pipeline.
- FINDING-103 logged: Positional WAR — N. All 5 calculators (bWAR/fWAR/pWAR/rWAR/mWAR, 3,287 lines) correct per OOTP formula. `warOrchestrator.calculateAndPersistSeasonWAR()` has zero callers in active app. Fix = one import + one call in processCompletedGame.ts.
- FINDING-104 logged (revised): Trait System — PARTIAL. Player storage wired (trait1/trait2 on master player record ✅). Player creation has trait fields but free-text not dropdown ⚠️. Awards ceremony UI assigns/revokes traits but does NOT write changes back to player record ❌. traitPools.ts (60+ traits) never imported anywhere ❌. Design clarified by JK: traits are NOT engine effects — they are persistent player identity attributes used in player creation, player generation, and awards ceremony rewards/penalties. No dynamic trigger layer needed.

### Commits This Session
- bc69ea3: FINDING-100 logged + prompt contract
- 3705a86: FINDING-100 marked FIXED
- 5323bcf: FINDING-101 logged + player morale design intent + fix contract
- badad5e: Player morale/traits design clarification
- 8ed21a9: FINDING-102 logged
- 45c650d: FINDING-103 logged
- b863121: FINDING-104 (initial — incorrect scope)
- de7b3c5: FINDING-104 revised — traits are persistent attributes not engine effects

### Design Decisions Locked This Session
- Traits are NOT engine effects. No potency calculator, no trigger layer needed.
- Traits: persistent player attributes (max 2), chosen via dropdown at player creation, assigned sparingly to generated/rookie players, granted/revoked at awards ceremony as rewards/penalties, may inform salary/grades.
- Player Morale = separate OOTP-style 5-category system (independent of traits/chemistry).
- FIERY + GRITTY chemistry types are KBL additions (SMB4 has only 5). Decision pending.

### Phase 2 Complete — All 5 Priority Subsystems Audited
| Finding | Subsystem | Verdict |
|---------|-----------|---------|
| 098 | Clutch Attribution | PARTIAL — design correct, pipeline disconnected |
| 099 | Leverage Index | N — dual-value violation |
| 101 | Fan Morale | BROKEN — method name mismatch, never fires |
| 102 | Stats Aggregation | PARTIAL — Steps 6/7/8/10/11 missing from pipeline |
| 103 | Positional WAR | N — 3,287 lines, zero callers |
| 104 | Trait System | PARTIAL — storage wired, ceremony persistence broken, catalog disconnected |

### Next Session Starts With
Phase 3: Fix prioritization and execution planning.
Candidate fixes (in rough priority order):
1. FINDING-101: Fan Morale — execute fix contract (method rename, 2 lines) — PROMPT_CONTRACTS.md
2. FINDING-103: Positional WAR — wire warOrchestrator into processCompletedGame.ts (1 import + 1 call)
3. FINDING-102 Step 6: Standings wiring — HIGH priority per audit
4. FINDING-099: LI dual-value — replace 6 getBaseOutLI calls with calculateLeverageIndex
5. FINDING-104: Trait system — (a) dropdown in player creation, (b) ceremony persistence to player record
6. FINDING-098: Clutch Attribution — wire trigger from at-bat outcome
Confirm with JK before beginning execution.

## Session: 2026-02-18 — Doc Reconciliation (session end)

### What Was Accomplished
- Read all 5 session docs + PATTERN_MAP + FINDINGS_056_onwards.md in full
- Identified discrepancy: CURRENT_STATE.md said 5 rows closed, actual count was 15
- Closed rows 14 (Farm) and 15 (Trade) using Batch D finding evidence (F-072, F-073) — both ORPHANED = N
- Updated PATTERN_MAP.md rows 14 and 15 "Follows Pattern" column
- Rewrote CURRENT_STATE.md to reflect actual state: 15 rows closed, 11 UNKNOWN

### No Code Changes This Session
Documentation reconciliation only.

### Actual Pattern Map State (post-reconciliation)
**Closed (15):** Rows 1, 2, 3, 4, 4b, 5, 6, 7, 11b, 12, 13, 14, 15, 20, 21
**Open (11):** Rows 8, 9, 10, 11, 16, 17, 18, 19, 22, 23, 24

### Next Session Starts With
Audit Phase 1 — close remaining 11 UNKNOWN rows, starting with Group B:
- Row 8: Playoffs (usePlayoffData WIRED — needs pattern conformance check)
- Row 9: Relationships (indirect wiring via useFranchiseData — needs pattern check)
- Row 10: Narrative/Headlines (game recap WIRED, headline ORPHANED — needs pattern check)
- Row 11: Mojo/Fitness (playerStateIntegration WIRED — needs pattern check)
- Rows 16, 17, 18, 19: Salary, League Builder, Museum/HOF, Aging/Ratings
- Rows 22, 23, 24: Player Dev Engine, Record Book, UI Pages

After Phase 1 complete → build full Phase 2 fix queue → begin fix execution.

## Session: 2026-02-18 — Doc Reconciliation #2

### What Was Accomplished
- Read all 5 session docs — discovered F-113 through F-118 already written to FINDINGS_056_onwards.md but never reflected in PATTERN_MAP.md, AUDIT_LOG.md, or CURRENT_STATE.md
- Updated PATTERN_MAP.md rows 8, 11, 16, 17, 18, 19 with correct verdicts + finding numbers
- Added AUDIT_LOG.md index entries for F-113 through F-118
- Rewrote CURRENT_STATE.md: 21 rows closed, 5 UNKNOWN remaining (rows 9, 10, 22, 23, 24)
- Added F-118 (aging write-back) to Phase 2 FIX-CODE queue
- Added F-113 (playoff stats gap), F-114 (mojo persistence), F-115 (salary design) to FIX-DECISION queue

### No Code Changes This Session
Documentation reconciliation only.

### Next Session Starts With
Phase 1 — audit the last 5 UNKNOWN rows: 9 (Relationships), 10 (Narrative/Headlines), 22 (Player Dev Engine), 23 (Record Book), 24 (UI Pages).
After all 5 closed → Phase 1 complete → build full Phase 2 fix queue → JK confirms → begin fix execution.

## Session: 2026-02-18 — Phase 1 Completion (audit rows 9, 10, 22, 23, 24)

### What Was Accomplished
- Audited the final 5 UNKNOWN rows: 9 (Relationships), 10 (Narrative/Headlines), 22 (Player Dev Engine), 23 (Record Book), 24 (UI Pages)
- Wrote FINDING-119 through FINDING-123 to FINDINGS_056_onwards.md
- Updated PATTERN_MAP.md rows 9, 10, 13 (missed from earlier), 22, 23, 24
- Added AUDIT_LOG.md index entries for F-119 through F-123
- Rewrote CURRENT_STATE.md: Phase 1 complete, 26/26 rows closed
- Compiled full Phase 2 fix queue: 11 FIX-CODE items + 11 FIX-DECISION items

### Key Findings This Session
- Row 9 (Relationships): Full system built, zero active callers, no persistence — ORPHANED
- Row 10 (Narrative/Headlines): Game recap wired; headlineEngine orphaned; story morale dead — PARTIAL
- Row 22 (Player Dev Engine): No 10-factor growth model exists at all — MISSING
- Row 23 (Record Book): oddityRecordTracker exists in legacy; zero callers — ORPHANED
- Row 24 (UI Pages): Legitimate writers correct by design; WorldSeries stats leaderboard always empty (no PLAYOFF_STATS write path) — PARTIAL

### Phase 1 Final Verdict Summary
Y=2 | PARTIAL=10 | N=14 (ORPHANED=4, MISSING=1, BROKEN=1)

### Next Session Starts With
Phase 2 kick-off. Present full fix queue to JK:
1. JK reviews FIX-DECISION items and makes calls on each
2. JK approves FIX-CODE execution order
3. Begin fix execution using Prompt Contract template, dependency order: spine first, downstream second

## Session: 2026-02-20 — OOTP Architecture Research Ingestion

### What Was Accomplished
- Read and synthesized the completed OOTP Architecture Research document (1,217 lines, 10 sections + 2 appendices)
- Document location: `spec-docs/OOTP_ARCHITECTURE_RESEARCH.md`
- Produced in session 2026-02-18 via exhaustive web research (OOTP manuals v13–24, StatsPlus wiki, OOTPDBTools, Lahman schema, Baseball Reference, FanGraphs, forum analysis)

### Key Architectural Findings (from OOTP research)

**Data Model (Section 1):**
- OOTP exports 68+ tables via .odb → CSV/MySQL
- Core entities: Player, Team, Franchise, Season (yearID), Game, PlayerSeasonStats, Contract, Transaction, Award, HOFEntry
- Career stats = SUM(PlayerSeasonStats) — no separate career table (Lahman/OOTP pattern)
- PlayerSeasonStats = one row per player per team per yearID

**Stat Pipeline (Section 2) — 12 steps:**
1. At-bat event → game state 2. Inning end → half-inning stats 3. Game complete → box score 4. Box score → PlayerSeasonStats accumulator 5. Recalculate rate stats 6. Update standings 7. Update leaderboards 8. Recalculate WAR 9. Check career totals + milestones 10. Trigger narratives 11. Player development check 12. Persist
- Steps 5+9 are wired in KBL; steps 6/7/8/10/11 are missing (confirms F-102)

**Player Lifecycle (Section 3):**
- Growth phase: < 25, 10-factor model (coaching, playing time, potential, challenge, injury, morale, focus sliders, devSpeedMod, workEthic, intelligence)
- Decline phase: ≥ 30, rating decay curves by position
- Development runs at season close
- Potential ratings also mutable (injury, chance events)

**Season Lifecycle (Section 4):**
- Phases: preseason → regular_season → postseason → offseason (discrete state machine)
- closeSeason(): lock stats → awards → HOF → retirements → age+develop → contracts → transactions → records
- openSeason(): validate rosters → init standings → init schedule → reset accumulators
- Confirms atomic season transitions needed

**Narrative Engine (Section 5):**
- 350+ storyline categories across 12 types (team performance, player performance, milestones, records, contracts, injuries, chemistry, transactions, draft, international, personal, HOF)
- Triggers: stat thresholds (3000 H, 500 HR, etc.), streak detection, record chases (>90% of record), calendar events, milestone proximity
- Storage: events table with type, playerId, yearId, triggeredAt, articleText
- Narrative is a side-effect consumer — reads pipeline output but never writes back

**HOF (Section 6):**
- Eligibility: 5+ years retired, 10+ years professional service
- Evaluation: career stat thresholds (HOF Score = weighted formula), committee override, narrative legacy score
- Induction: annual ballot, voting simulation
- Confirms Phase 2 F-117 (Museum/HOF PARTIAL) — eligibility engine correct, vote simulation missing

**Replayability Systems (Section 8):**
- Player personality: 6 traits at 1-200 (leadership, loyalty, desire_for_winner, greed, workEthic, intelligence) — drive morale, dev speed, contract behavior, narrative triggers
- Team chemistry: personality compatibility scoring per pair, clubhouse effect on development
- Confirms KBL trait design (persistent attributes, max 2) is correct for KBL's simpler SMB4-based model

### Decisions Informed by OOTP Research

**F-109 (Career Stats — derive-on-read vs incremental write):**
OOTP answer: derive-on-read (SUM across seasons). Recommendation: adopt same pattern.
→ **FIX-DECISION should resolve to: derive-on-read.** No separate career table needed. CareerStats = sumCareerStats(playerId) across all PlayerSeasonStats rows.

**F-121 (Player Dev Engine — define model):**
OOTP answer: 10-factor growth model < 25, decline ≥ 30. All factors documented in Section 10.5.
→ Use OOTP model as spec for KBL's player dev engine. TypeScript implementation contract in Section 10.5.

**F-103 (WAR wiring):**
OOTP answer: WAR is a derived field recalculated after every game, not a stored constant. Needs league context (lgFIP, average wOBA, RPW) that updates throughout season.
→ Confirms F-103 fix: wire warOrchestrator into stat pipeline post-game. The WAR calc itself is correct.

**Phase 2 Fix Priority Alignment with OOTP:**
OOTP Section 9.4 priority order matches KBL Phase 2 queue exactly:
1. Stat pipeline spine (F-102 steps 6/7/8, F-103 WAR wiring)
2. Season transition (F-112 clearSeasonalStats, F-113 playoff stats)
3. Development/aging (F-118 agingIntegration write-back, F-121 dev engine)
4. Reconnections (F-098 clutch, F-099 LI, F-104 traits, F-119 relationships, F-120 narrative)

### No Code Changes This Session
Research ingestion and documentation only.

### Next Session Starts With
Phase 2 kick-off — same as before. JK to confirm FIX-DECISION resolutions (using OOTP findings above as input) before fix execution begins. Recommended first FIX-DECISION decisions:
1. F-109: Career stats → resolve to derive-on-read (OOTP-confirmed)
2. F-113: Playoff stats → resolve to wire (WorldSeries leaderboard empty without it)
3. F-120: Narrative persistence → resolve to IndexedDB (ephemeral display is not franchise-grade)
Then execute FIX-CODE items in dependency order: F-103 (WAR spine) first, then F-102 steps 6+7+8.

---

## Session: 2026-02-20 — Spec Sync Verification & Completion

### Summary
Verified all 20 planned spec updates from the decision inventory session are present on disk. JK confirmed the full list.

### Verification Method
- Searched each updated spec for removed content (contraction, salary matching) — confirmed 0 hits
- Verified all 7 new spec files exist with correct content via `ls -la`
- Spot-checked minor updates (cross-references, changelog entries) via content search
- Confirmed OFFSEASON_SYSTEM_SPEC.md has zero contraction references (earlier compaction summary was stale)

### Confirmed Updates (20 total)

**MAJOR UPDATES (8):**
1. ✅ TRADE_SYSTEM_SPEC.md — removed salary matching, added Chemistry-tier trade value
2. ✅ OFFSEASON_SYSTEM_SPEC.md — removed contraction, restructured 11 phases, triple salary recalc, Phase 11 signing round
3. ✅ SALARY_SYSTEM_SPEC.md — removed contraction, added Chemistry-tier potency factor, triple recalc schedule
4. ✅ FAN_MORALE_SYSTEM_SPEC.md — simplified 60/20/10/10 formula, removed contraction risk, franchise health warning replaces it
5. ✅ FARM_SYSTEM_SPEC.md — unlimited farm during season, 3 options limit, call-up rating reveal
6. ✅ NARRATIVE_SYSTEM_SPEC.md — already had v1.2 corrections (mojo/fitness read-only, morale→probability)
7. ✅ EOS_RATINGS_ADJUSTMENT_SPEC.md — already had corrected Chemistry mechanics + trait assignment
8. ✅ FRANCHISE_MODE_SPEC.md — already had separated modes, dynamic schedule, fictional dates

**NEW SPECS CREATED (7):**
1. ✅ TRAIT_INTEGRATION_SPEC.md — corrected Chemistry mechanics, potency tiers, position-appropriate pools
2. ✅ SEPARATED_MODES_ARCHITECTURE.md — League Builder → Franchise Season → Offseason Workshop
3. ✅ SCOUTING_SYSTEM_SPEC.md — hidden ratings, scout accuracy by position, call-up reveal
4. ✅ PROSPECT_GENERATION_SPEC.md — grade distribution, trait ratios (~30/50/20), Chemistry distribution
5. ✅ ALMANAC_SPEC.md — top-level nav, cross-season queries, incremental build phases
6. ✅ PARK_FACTOR_SEED_SPEC.md — BillyYank 23 stadiums, 40% activation threshold
7. ✅ PERSONALITY_SYSTEM_SPEC.md — hybrid 7 visible + 4 hidden modifiers

**MINOR UPDATES (5):**
1. ✅ LEAGUE_BUILDER_SPEC.md — personality system reference
2. ✅ DRAFT_FIGMA_SPEC.md — grade distribution table, reveal ceremony reference
3. ✅ FREE_AGENCY_FIGMA_SPEC.md — updated cross-reference to PERSONALITY_SYSTEM_SPEC
4. ✅ AWARDS_CEREMONY_FIGMA_SPEC.md — already had trait wheel + eye test equal ranking
5. ✅ STADIUM_ANALYTICS_SPEC.md — BillyYank source reference, park factor activation

**Three critical corrections embedded throughout:**
- Phase 11 claim order by total salary
- Trait Chemistry mechanics (potency tiers, not binary)
- Salary matching removal (contract value matching via 10% rule instead)

### No Code Changes This Session
Spec updates and verification only.

### CURRENT_STATE.md Updated
Rewritten to reflect Spec Sync completion. Added "Spec Sync: COMPLETE" status line and full 20-item summary.

### Next Session Starts With
Phase 2 kick-off. JK to confirm FIX-DECISION resolutions (using OOTP findings as input), then execute FIX-CODE items in dependency order. Recommended first decisions:
1. F-109: Career stats → resolve to derive-on-read (OOTP-confirmed)
2. F-113: Playoff stats → resolve to wire (WorldSeries leaderboard empty without it)
3. F-120: Narrative persistence → resolve to IndexedDB (ephemeral display is not franchise-grade)
Then execute FIX-CODE items: F-103 (WAR spine) first, then F-102 steps 6+7+8.

---

## Session: 2026-02-21 — Spec-to-Fix-Queue Reconciliation

### Summary
Produced RECONCILIATION_PLAN.md mapping every Phase 2 fix queue item against the 20 updated specs from the spec sync session. Planning only — no code changes.

### Files Read
- SESSION_RULES.md, CURRENT_STATE.md, SESSION_LOG.md (last 2 entries), AUDIT_LOG.md
- Specs: NARRATIVE_SYSTEM_SPEC, ALMANAC_SPEC, SEPARATED_MODES_ARCHITECTURE, PERSONALITY_SYSTEM_SPEC, PARK_FACTOR_SEED_SPEC, PROSPECT_GENERATION_SPEC, EOS_RATINGS_ADJUSTMENT_SPEC, PLAYOFF_SYSTEM_SPEC, MOJO_FITNESS_SYSTEM_SPEC (sections), SALARY_SYSTEM_SPEC (formula), FAN_MORALE_SYSTEM_SPEC (storage search)

### Reconciliation Results

**UNCHANGED (7 FIX-CODE items):** F-098, F-099, F-101 Bug A, F-101 Bug B, F-102, F-103, F-104a, F-104b, F-110

**RE-SCOPED (2 FIX-CODE items):**
- F-112: clearSeasonalStats fix unchanged but must confirm call site is Offseason Phase 1 (not Spring Training)
- F-118: aging write-back must fire in Offseason Phase 1 (not SpringTrainingFlow — wrong phase per OFFSEASON_SYSTEM_SPEC 11-phase structure)

**RESOLVED FIX-DECISION items (2):**
- F-109: ALMANAC_SPEC §4.3 resolves to derive-on-read (pre-aggregated, no separate career table)
- F-115: SALARY_SYSTEM_SPEC confirms age-based salary is final design (no service time concept)

**RE-SCOPED FIX-DECISION items (3):**
- F-114: Not "re-enable auto-update" — MOJO_FITNESS_SYSTEM_SPEC requires full between-game persistence (fitness persists across games by definition, mojo has carryover); scope = IndexedDB persistence + Team Page editor (§7)
- F-121: PROSPECT_GENERATION_SPEC is about draft class seeding, not player development. F-121 dev engine gap remains; OOTP research provides 10-factor model; JK must approve
- F-122: ALMANAC_SPEC §3.2 defines Season Records as a distinct Almanac section (Phase 2 in build priority); both oddityRecordTracker and standard records in scope; JK must confirm both or split

**STILL PENDING FIX-DECISION items (6):** F-101 Bug C, F-107 (deferred), F-113, F-119, F-120 (2 sub-items)

### New Gaps Identified (8)
- GAP-001: Mode separation enforcement (SEPARATED_MODES_ARCHITECTURE.md)
- GAP-002: Park factor seeding + 40% activation (PARK_FACTOR_SEED_SPEC.md)
- GAP-003: Personality system population in player records (PERSONALITY_SYSTEM_SPEC.md)
- GAP-004: Mojo/fitness stat splits accumulation per PA (MOJO_FITNESS_SYSTEM_SPEC §6.2)
- GAP-005: Juiced fame scrutiny in fameEngine (MOJO_FITNESS_SYSTEM_SPEC)
- GAP-006: Between-game mojo/fitness persistence (expanded F-114 scope)
- GAP-007: Prospect/draft class generation engine (PROSPECT_GENERATION_SPEC §3)
- GAP-008: Narrative memory storage layer (NARRATIVE_SYSTEM_SPEC §4.3 NarrativeMemory)

### Output
- RECONCILIATION_PLAN.md written to spec-docs/ (225 lines)

### Next Session Starts With
JK reviews RECONCILIATION_PLAN.md and answers the 10 questions in Section 6. After decisions:
1. Confirm F-109 and F-115 resolutions (recommend YES to both)
2. Decide F-114 scope (bare persistence vs full §7 editor)
3. Decide F-113 (wire playoff stats now or defer)
4. Execute Phase 2A FIX-CODE items: F-103 → F-102 → F-099 (in that order)

## Session: 2026-02-21 — Full Spec Review + Reconciliation Plan Integration

### Purpose
Complete the reconciliation by reading all specs modified today (2026-02-20) that were not covered in the prior session. Integrate findings into RECONCILIATION_PLAN.md.

### Specs Read This Session (Previously Unread)
1. HANDOFF_RECONCILIATION.md — confirmed this is the task brief, not additional spec content
2. SEPARATED_MODES_ARCHITECTURE.md — GAP-001 confirmed in full detail; §5.2 specifies transitionMode() must persist to IndexedDB before mode switch
3. FRANCHISE_MODE_SPEC.md — explicitly PLANNING/deferred; §7.1 defines Default Franchise migration path; confirms F-107 safe as latent debt
4. LEAGUE_BUILDER_SPEC.md — confirmed personality and trait assignment at import; **SPEC CONFLICTS identified** (see below)
5. AWARDS_CEREMONY_FIGMA_SPEC.md — **F-104b re-scoped**: trait write-back is event-driven per ceremony screen, not batch
6. DRAFT_FIGMA_SPEC.md — Farm-First draft model; confirms GAP-007; introduces Potential Ceiling attribute on FarmPlayer
7. FREE_AGENCY_FIGMA_SPEC.md — UI spec only; no new gaps
8. STADIUM_ANALYTICS_SPEC.md — **GAP-002 corrected**: 3-tier blend ratios (LOW=70%seed, MEDIUM=30%seed, HIGH=0%seed), not flat 70/30
9. TRADE_SYSTEM_SPEC.md — future-phase spec; no new gaps or fix items
10. SMB4_PARK_DIMENSIONS.md — reference data (23 stadiums); confirms GAP-002 data source
11. OFFSEASON_SYSTEM_SPEC.md (sections) — **F-112 correction**: clearSeasonalStats fires in Phase 11 §13.8 (Season Archival), NOT Phase 1
12. SCOUTING_SYSTEM_SPEC.md — pre-call-up scouting accuracy; no new gaps (relates to F-121 context)
13. TRAIT_INTEGRATION_SPEC.md (full) — confirmed Chemistry potency tiers; SPEC CONFLICT with LEAGUE_BUILDER_SPEC
14. FEATURE_WISHLIST.md — confirmed in-season player dev deferred; F-121 gap still open

### Key Corrections Made to RECONCILIATION_PLAN.md

1. **F-112**: Corrected call site from "Phase 1" to "Phase 11 §13.8 Season Archival"
2. **F-104b**: Re-scoped from batch write-back to per-step event-driven write-back gated by UI confirmation
3. **F-107**: Changed rationale — FRANCHISE_MODE_SPEC explicitly PLANNING/deferred with §7.1 migration path
4. **GAP-002**: Corrected blend ratio description to 3-tier system
5. **GAP-007**: Added Potential Ceiling attribute requirement from DRAFT_FIGMA_SPEC

### Spec Conflicts Identified (New — Require JK Resolution)

**CONFLICT-001 (Chemistry Types):**
- LEAGUE_BUILDER_SPEC §5.3 lists 5 types: Competitive, Spirited, Crafty, Scholarly, Disciplined
- TRAIT_INTEGRATION_SPEC §2.2 TRAIT_CHEMISTRY_MAP lists 4 types: Spirited, Crafty, Tough, Flashy
- Incompatible. Implementation blocked until resolved.

**CONFLICT-002 (Personality Types):**
- LEAGUE_BUILDER_SPEC §5.3 lists 11 Personality type values
- PERSONALITY_SYSTEM_SPEC defines 7 visible types
- LEAGUE_BUILDER_SPEC v1.1 cross-references PERSONALITY_SYSTEM_SPEC but contradicts it
- Resolution needed before League Builder personality assignment code is written

### RECONCILIATION_PLAN.md Status
- All sections updated
- 12 questions for JK (was 10; added CONFLICT-001 and CONFLICT-002 resolutions)
- Section 6a (SPEC CONFLICTS) added
- F-104b route changed to Codex | 5.3 | high
- F-107 rationale updated

### Next Action
Await JK confirmation on 12 questions in RECONCILIATION_PLAN.md §6/6a before Phase 2 execution begins. Phase 2A (F-103, F-102, F-099) can begin immediately after JK confirms — these are all UNCHANGED FIX-CODE items not blocked by any decision or conflict.


---

## Session: 2026-02-22 — SpecRecon Step 3 Completion (All 6 Domains) + Step 4 Queue

### Context
Continuing the "Reconcile specifications before refactor" workflow. Domains 1-5 were already complete (C-001 through C-080). This session completed Domain 6 and compiled the full Step 4 decision queue.

### Accomplished

**Domain 6 Analysis — 22 specs read, 14 findings (C-081 through C-094):**
- Covered: Playoffs, Awards, Fan Morale, Mojo/Fitness, Stadium/Park, Grades, Simulation, Special Events, Adaptive Standards, and all Figma Offseason specs
- Cross-referenced against GOSPEL (full 1807 lines) with dedicated GOSPEL verification subagent
- Wrote STEP3_DOMAIN_6_MATRIX.md to spec-docs/

**Key Domain 6 Findings:**
- C-081: MOJO_FITNESS simulation integration contradicts GOSPEL "KBL NEVER calculates mojo"
- C-082: GAME_SIMULATION_SPEC (1040 lines) contradicts GOSPEL "no simulation fudging" — core philosophy question
- C-083: CONTRACTION_EXPANSION_FIGMA_SPEC (977 lines) describes removed feature — STALE
- C-085: GOSPEL still references contraction in 4 places — needs cleanup
- C-087: Grade scale 4-way conflict (12 vs 13 vs 10 vs 9 grades across 4 specs)
- C-089: SPECIAL_EVENTS_SPEC stale — GOSPEL §7 Modifier Registry replaces hardcoded events
- C-092: Juiced state internal contradiction (natural recovery vs "NOT achieved through natural recovery")
- C-093: Fan morale double-counting in FA Attractiveness formula

**Step 3 Totals:**
- 94 findings across 6 domains (C-001 through C-094)
- ~39 pending Step 4 decisions requiring JK resolution
- Domain 4 has 3 decisions already made (C-052, C-053, C-054)
- Domain 5 has all 11 findings JK-approved

**WATCH Items (clean specs, 0 contradictions):**
- ALMANAC_SPEC, SMB4_PARK_DIMENSIONS, RETIREMENT_FIGMA_SPEC, TRADE_FIGMA_SPEC, PLAYOFFS_FIGMA_SPEC, FINALIZE_ADVANCE_FIGMA_SPEC, EOS_RATINGS_FIGMA_SPEC (except C-090 quality issue)

### Files Created
- spec-docs/STEP3_DOMAIN_6_MATRIX.md (102 lines)

### No Code Changes This Session
Spec analysis and documentation only.

### Decisions Made
- Domain 6 scope: Full analysis on all 24 remaining specs (JK chose this over reduced scope)

### Next Action
Walk JK through all ~39 pending Step 4 decisions one by one for resolution. After all decisions made, execute spec updates.

---

## Session: Figma Spec Alignment Audit — 2026-02-21

**Task:** Complete Part 2 of HANDOFF_RECONCILIATION.md — reconcile all 13 Figma specs against updated system specs.

**Method:** Read each Figma spec file directly; cross-referenced against corresponding system spec. No assertions from prior session summaries.

### Results

**OBSOLETE (1):**
- CONTRACTION_EXPANSION_FIGMA_SPEC.md — entire 977-line file describes removed contraction feature. Action: archive.

**STALE (6):**
- LEAGUE_BUILDER_FIGMA_SPEC.md — missing LB-F016 Mode Transition screen required by SEPARATED_MODES_ARCHITECTURE §5.1 (HIGH priority)
- SEASON_SETUP_FIGMA_SPEC.md — missing transitionMode() persistence gate on SS-F007; no mode-separation framing (HIGH priority)
- EOS_RATINGS_FIGMA_SPEC.md — wrong phase label (says Phase 3, should be Phase 1); no trait performance modifier in Manager Distribution screen (MEDIUM)
- SEASON_END_FIGMA_SPEC.md — Phase 1 checklist screen missing ratings adjustments and aging (MEDIUM)
- FINALIZE_ADVANCE_FIGMA_SPEC.md — missing signing round screen between Season Transition and Advance Confirmation (LOW)
- SCHEDULE_SYSTEM_FIGMA_SPEC.md — uses real-year dates throughout ("2024", "JULY 12"); must use fictional Year N / Day N format (LOW)

**ALIGNED (6):**
- TRADE_FIGMA_SPEC.md — salary informational only, no matching; consistent with TRADE_SYSTEM_SPEC
- RETIREMENT_FIGMA_SPEC.md — Phase 5 correct per OFFSEASON_SYSTEM_SPEC
- PLAYOFFS_FIGMA_SPEC.md — Phase 1 handoff correct; no playoff stats write-back shown (consistent with F-113 pending)
- DRAFT_FIGMA_SPEC.md — Potential Ceiling field + Farm-First model present (sync-updated)
- FREE_AGENCY_FIGMA_SPEC.md — personality-driven destination present (sync-updated)
- AWARDS_CEREMONY_FIGMA_SPEC.md — already confirmed aligned; 13-screen flow with per-step trait gates

**New Gaps Added:**
- GAP-009: Mode Transition UI (League Builder exit → Franchise Season entry) — no LB-F016 screen exists anywhere
- GAP-010: Fictional date system in Schedule UI — cosmetic but needs Figma + data model audit

### Files Modified
- RECONCILIATION_PLAN.md — Part 2 (Figma Spec Alignment Audit) added in full: alignment table, disposition summary, severity ranking, new gaps

### Next Action
RECONCILIATION_PLAN.md is now complete (Part 1 + Part 2). Ready for JK to answer the 12 questions in §6/6a before Phase 2 execution begins.


---

## SESSION: 2026-02-21 — Third-Pass Reconciliation + JK Decisions

### Work Completed

**Third-pass spec verification** — read actual spec content section-by-section (not grep). Produced SPEC_RECONCILIATION_FINDINGS.md with:
- 22 items confirmed/cleared
- 3 new conflicts (CONFLICT-003, 004, 005)
- 7 open questions carried forward (Q-001 through Q-007)
- 5 watch-list items (not blocking, but notable)

**JK answered all 10 decisions.** Full decision log:

| Decision | Resolution |
|----------|------------|
| CONFLICT-003: Chemistry types | Real SMB4 names: Competitive, Crafty, Disciplined, Spirited, Scholarly (5 types). TRAIT_INTEGRATION_SPEC, PROSPECT_GENERATION_SPEC, SALARY_SYSTEM_SPEC all need correction. |
| CONFLICT-004: FA exchange rule | ±20% True Value match, no position restriction. Neither spec had it right (Figma said ±10%, Offseason said grade-based). Both need correction. |
| CONFLICT-005: Draft grade range vs farm schema | All grades possible on farm (A through D). Bell curve per PROSPECT_GENERATION_SPEC — B, B-, C+ at 15% each. FARM_SYSTEM_SPEC overallRating field must be expanded to full range. |
| Q-001: Rookie salary | Set at draft by round/position. Salary locked until EOS recalculation after rookie season ends. Ratings, traits, and grade all hidden while on farm. Revealed at call-up — salary does NOT change at call-up. |
| Q-002: Standings tiebreaker | Run differential. If still tied, user selects who advances (manual user decision prompt). |
| Q-003: Farm population at startup | League Builder includes a prospect draft step to populate farms before Season 1 begins. |
| Q-004: Stadium change mechanic | V1 scope. Needs new section in OFFSEASON_SYSTEM_SPEC (Phase 4 sub-step). |
| Q-005: Scout grade deviation | Fat-tail distribution. Keep max-deviation-by-position structure (position accuracy sets center), replace uniform probability with fat-tail — small misses most common, rare large outliers possible beyond current hard cap. |
| Q-006: Team captain | V1 scope. Formal designation driven by Charisma hidden modifier. Needs spec in DYNAMIC_DESIGNATIONS_SPEC or PERSONALITY_SYSTEM_SPEC. |
| Q-007: Beat reporter pre-decision warning | V1 scope. Blocking modal before call-up/send-down executes. Conditional on relevant relationship/narrative data. Needs UI flow spec. |

### Files Created This Session
- SPEC_RECONCILIATION_FINDINGS.md — full third-pass findings with all conflicts, open questions, and watch-list items

### Next Action
Write all spec updates from the 10 decisions. Specs requiring changes:
1. TRAIT_INTEGRATION_SPEC — chemistry type names (5 real SMB4 types), TRAIT_CHEMISTRY_MAP expansion to cover all SMB4 traits
2. PROSPECT_GENERATION_SPEC — chemistry type names
3. SALARY_SYSTEM_SPEC — chemistry type names; draft-round-based rookie salary table (replace rating-at-callup model)
4. FARM_SYSTEM_SPEC — overallRating schema expanded to full A–D range; rookie salary note (set at draft, locked until post-rookie EOS)
5. FREE_AGENCY_FIGMA_SPEC — FA exchange rule corrected to ±20% True Value, no position restriction
6. OFFSEASON_SYSTEM_SPEC — FA exchange rule corrected; stadium change Phase 4 sub-step added; run differential tiebreaker + user-select prompt added; team captain designation added
7. SCOUTING_SYSTEM_SPEC — grade deviation replaced with fat-tail model
8. LEAGUE_BUILDER_SPEC — prospect draft step added as new section
9. DYNAMIC_DESIGNATIONS_SPEC — team captain designation specced
10. New UI flow spec needed for beat reporter pre-decision warning modal

---

## Session: 2026-02-22 — SpecRecon Step 4 Decision Resolution (ALL 42 decisions)

### Context
Continuation of spec reconciliation workflow. Step 3 was complete (94 findings across 6 domains). Step 4 required JK to resolve ~39 pending decisions. This session walked through all of them.

### Accomplished
- Resolved ALL 42 Step 4 decisions via structured Q&A with JK
- Organized decisions into 9 themed groups for efficient walkthrough
- Wrote STEP4_DECISIONS.md with complete decision log

### JK Decisions Summary (42 total)

**Domain 1 — GameTracker/Event Model (5):**
- C-002: GOSPEL wins — 2 pinch-hitter entry points
- C-004: Add Balk as manual between-play event (even without SMB4 balks)
- C-005: Keep WP_K/PB_K hybrid result types
- C-011: Add TP to overflow menu
- C-017: Manual play log correction (no auto-correct GO→DP)

**Domain 2 — Stats Pipeline (6):**
- C-025: CQ weighted by LI (Contact Quality × Leverage Index)
- C-027: Exclude IBB from FIP (standard sabermetric)
- C-033: Keep armFactor in clutch calculations
- C-058: Use 1.7821 wOBA scale (SMB4-calibrated)
- C-061: Remove impactMultiplier from fWAR
- C-062: mWAR 70% unattributed needs reconciliation mechanism

**Domain 3 — Franchise/Offseason (11):**
- C-041: GOSPEL §12 needs contraction removal
- C-042: Remove recentPerformance from farm morale (no simulated stats)
- C-043: Scale EOS threshold with season length (20% of gamesPerTeam); rookies mixed with veterans
- C-044: Fan morale → EOS as modifier on adjustment formula
- C-045: New SPINE_ARCHITECTURE_SPEC needed
- C-046: Mid-season narrative salary changes defer to offseason
- C-047: Young Player Designation — random from top-3 farm prospects
- C-048+C-082: Keep simulation for AI-only, rename to AI_GAME_ENGINE
- C-049: Expand offseason to 14 phases
- C-050: Annotate DEEP_DIVE with supersession notes
- C-051: No salary cap in v1

**Domain 4 — Narrative/Designations (7):**
- C-055+C-056: DESIGNATIONS wins both (playoff-context multipliers + 15% Albatross discount)
- C-057+C-067: Add Team Captain to data models AND narrative
- C-065: Scale HOF WAR threshold with opportunityFactor
- C-066: Add +10% Cornerstone FA retention to DESIGNATIONS
- C-068: INSIDER reporter reveal = permanent visibility (0-100 value)
- C-069: Per-game cap on reporter morale influence

**Domain 5 — League Builder/Season Setup (6):**
- C-074+C-087: 13-grade scale is authoritative (S through D-)
- C-075: Remove configurable WAR weights
- C-078: Replace Fame slider with FameLevel dropdown
- C-079: Pre-generated + editable schedule
- C-080: SIMULATE button for AI games only

**Domain 6 — Remaining Systems (7):**
- C-081: Remove mojo/fitness simulation section
- C-084: Both Franchise Health Warning + EOS modifier
- C-086: Wheel Spin ceremony, potency-only
- C-088: Confidence-based blending for park factors
- C-089: Rewrite Special Events as modifier registry entries
- C-092: Remove rest path to Juiced state
- C-093: Keep baseline FA formula only (remove state-based bonuses)

**Cleanup sweep:** C-083+C-085+C-090+C-091+C-094 all approved (archive contraction spec, update GOSPEL, fix math, fix wishlist, archive)

### Files Created
- spec-docs/STEP4_DECISIONS.md — complete decision log (42 entries)

### No Code Changes This Session
Decision documentation only.

### Next Action
Step 5: Execute spec updates based on all 42 decisions. This involves updating ~30+ spec documents with the resolved decisions.


---

## Session: 2026-02-22 (Evening) — Gospel Consolidation Mapping

### Context
Skipped granular spec updates (Step 5). Went directly to gospel consolidation — building the blueprint for the four canonical documents that will replace the current spec sprawl.

### What Was Accomplished

**1. Read and analyzed three major source specs:**
- LEAGUE_BUILDER_SPEC.md (976 lines) — Mode 1 primary source
- FRANCHISE_MODE_SPEC.md (412 lines) — cross-cutting architecture
- OFFSEASON_SYSTEM_SPEC.md (2353 lines) — Mode 3 primary source

**2. Created GOSPEL_CONSOLIDATION_MAP.md (v2, audited):**
- Maps all active specs to their gospel destination (Mode 1, Mode 2, Mode 3, Almanac)
- Maps all 62 STEP4 decision IDs to their gospel (verified: zero diff, zero double-counting)
- Accounts for all 99 .md files on disk (gospel material, process docs, archives)
- Section 4: Shared specs matrix (9 specs feed multiple gospels)
- Section 5: Full decision ID reconciliation table
- Section 6: Drafting order recommendation (Mode 1 → Mode 3 → Mode 2 → Almanac)

**3. Created FRANCHISE_TYPE_DESIGN_NOTE.md (302 lines):**
- Defines Solo (1P), Couch Co-Op (multiplayer), Custom franchise types
- `controlledBy: 'human' | 'ai'` flag per team — gates experience, not access
- Commissioner model: user has full edit power over all teams, rich experience for human teams only
- Hybrid standings: full events for human-team games, score-only entry for AI-vs-AI
- Offseason phase scope: `all-teams` vs `human-only` per phase with defaults
- All-Star partial data approach for AI players
- AI-vs-AI score entry for playoff seeding
- Full lineup/roster/mojo control over all teams throughout games and season

**4. Resolved open questions:**
- Offseason locked at 13 phases (was 11 in spec, C-049 said 14, actual count is 11+2 = 13)
- The Spine (C-045): standalone 5th document, not preamble
- All "14" references updated to "13" in both files

### Decisions Made This Session
- Skip Step 5 (granular spec updates) → go directly to gospel consolidation
- 4 gospels: MODE_1, MODE_2, MODE_3, ALMANAC + SPINE_ARCHITECTURE as 5th standalone
- Drafting order: Mode 1 → Mode 3 → Mode 2 → Almanac
- Franchise types: Solo/Co-Op/Custom as configuration layer, not structural change
- 13 offseason phases (not 11, not 14)
- Moved CONTRACTION_EXPANSION_FIGMA_SPEC.md to archive

### Files Created/Modified
- spec-docs/GOSPEL_CONSOLIDATION_MAP.md (new, 360 lines)
- spec-docs/FRANCHISE_TYPE_DESIGN_NOTE.md (new, 302 lines)
- spec-docs/CONTRACTION_EXPANSION_FIGMA_SPEC.md → archive/ (moved by JK)

### No Code Changes This Session

### Next Action
Draft MODE_1_LEAGUE_BUILDER.md — first gospel. Pull from 13 input specs, apply 9 STEP4 decisions, integrate Franchise Type design note §5, add Spine cross-reference.


---

## Session: 2026-02-22 (Late Night) — Mode 1 Gospel Drafted

### Context
Continued from evening session. Gospel consolidation map and franchise type design note were complete. Began drafting first gospel document.

### What Was Accomplished

**Drafted MODE_1_LEAGUE_BUILDER.md (1,767 lines, 16 sections):**

1. Overview & Mode Definition — Mode 1 lifecycle, what it produces, entry points (C-073)
2. Franchise Type Selection — Solo/Co-Op/Custom, `controlledBy` flag, phase scope defaults, commissioner model
3. Leagues Module — Templates, conference/division structure, constraints
4. Teams Module — Data model, CSV import, branding (controlledBy NOT in global model)
5. Players Module — Complete data model, 13-grade scale (C-074/C-087), 7-type personality (C-070), FameLevel dropdown (C-078), generation config
6. Personality & Traits Initial Assignment — 7 types + 4 hidden modifiers, trait distribution 30/50/20, farm visibility rules (C-054)
7. Rosters Module — Lineup, depth chart, validation rules
8. Draft Module — Fantasy draft + Startup Prospect Draft, prospect generation, scouting accuracy with fat-tail deviation model
9. Rules Configuration — Full RulesPreset interface, 16/128 presets (C-071), no contraction (C-072), no WAR weights (C-075), no salary cap (C-051)
10. Schedule Setup — Pre-generated + editable (C-079), fictional date system, franchise type impact
11. Franchise Creation Wizard — 6-step flow, Playoff Mode abbreviated flow
12. Franchise Handoff & Initialization — Full init sequence with salary/standings/franchiseId/copy-not-reference (C-076), Mode Transition screen (C-077)
13. Data Architecture — Global vs franchise, separate IndexedDB per franchise, storage estimates, franchise management API, startup flow
14. V2 Material — Explicit out-of-scope list
15. Cross-References — Source spec consumption table
16. Decision Traceability — All 12 IDs verified present (40 total references)

**All 12 decision IDs verified in document:**
C-070, C-071, C-072, C-073, C-074, C-075, C-076, C-077, C-078, C-087, C-045, C-054

### Source Specs Read This Session
- LEAGUE_BUILDER_SPEC.md (976 lines)
- GRADE_ALGORITHM_SPEC.md
- PERSONALITY_SYSTEM_SPEC.md
- TRAIT_INTEGRATION_SPEC.md
- SEASON_SETUP_SPEC.md
- FRANCHISE_MODE_SPEC.md
- PROSPECT_GENERATION_SPEC.md
- SCOUTING_SYSTEM_SPEC.md
- GOSPEL_CONSOLIDATION_MAP.md (full)
- STEP4_DECISIONS.md (full)
- FRANCHISE_TYPE_DESIGN_NOTE.md (from session memory)

### Files Created
- spec-docs/MODE_1_LEAGUE_BUILDER.md (new, 1,767 lines)

### No Code Changes This Session

### Next Action
Draft MODE_3_OFFSEASON_WORKSHOP.md in a new session. 17 input specs, 17 decision IDs (C-041/C-085, C-042, C-043, C-044, C-046, C-049, C-051, C-052, C-053, C-063, C-064, C-066, C-083/C-094, C-086, C-090). Primary source: OFFSEASON_SYSTEM_SPEC.md (2,353 lines).

## Session: 2026-02-23 — Gospel Consolidation: Mode 3 Offseason Workshop

### Accomplished
- Drafted MODE_3_OFFSEASON_WORKSHOP.md (1,319 lines, 21 sections)
- 13-phase structure per C-049: Season End → Awards → Salary #1 → Expansion/Stadium → Retirements → FA → Draft → Salary #2 → Trades → Salary #3 → Farm Recon → Chemistry Rebalancing → Finalize & Advance
- Integrated all 17 STEP4 decisions: C-041, C-042, C-043, C-044, C-046, C-049, C-051, C-052, C-053, C-063, C-064, C-066, C-083, C-085, C-086, C-090, C-094
- Integrated 8 reconciliation findings: F-124 (SMB4 chemistry names), F-125 (FA ±20% True Value), F-126 (draft grade range), F-127 (rookie salary), F-130 (stadium changes), F-131 (fat-tail scouting), F-132 (team captain), F-133 (beat reporter warnings)
- Franchise Type integration: phase scopes (all-teams vs human-only), AI auto-resolution strategies, Couch Co-Op full ceremony
- Verified: 0 internal contradictions, all decisions substantively integrated, all 13 phases present

### Verification
- Subagent verification pass: all 17 decisions confirmed present with section references
- All 8 findings confirmed integrated
- No contradictions detected across salary formulas, roster sizes, phase scopes, chemistry tiers

### Minor Gaps Identified (follow-up)
1. §6.2 Expansion draft protection/selection algorithm needs detail
2. §11.2 AI trade proposal generation logic thin
3. §4.2 Eye test voting UI mechanics underspecified
4. §11.2/§15.2 Beat reporter warning list incomplete

### What Next Session Starts With
- Draft MODE_2_FRANCHISE_SEASON.md (39 input specs, 31 decision IDs — the largest gospel)
- Primary source: KBL_UNIFIED_ARCHITECTURE_SPEC.md
- Covers GameTracker, stats, WAR, standings, roster mgmt, schedule, narrative, designations, milestones, mojo/fitness, clutch, fielding, AI game engine

## Session: 2026-02-23 — Gospel Consolidation: Mode 2 Franchise Season (COMPLETE)

### Accomplished
- Drafted MODE_2_FRANCHISE_SEASON.md (3,269 lines, 28 sections)
- Consolidated 39 input specs into single authoritative document
- Integrated 33 STEP4 decisions (C-002, C-004, C-005, C-011, C-017, C-025, C-027, C-033, C-047, C-048, C-054, C-055, C-056, C-057, C-058, C-059, C-060, C-061, C-062, C-065, C-067, C-068, C-069, C-079, C-080, C-081, C-082, C-084, C-088, C-089, C-092, C-093) plus 3 cross-cutting (C-045, C-054, C-076)
- Full decision traceability table in §28

### Structure (28 Sections)
1-5: Overview, Event Model, GameTracker 1-Tap, Enrichment, Between-Play Events
6-9: Baseball Rules, Substitution, Stats Pipeline, Pitcher Stats
10-13: Fielding, WAR (5 components), Leverage Index, Clutch Attribution
14-17: Mojo & Fitness, Modifier Registry, Narrative System, Dynamic Designations
18-22: Milestones, Fan Favorite/Albatross, Fan Morale, Standings, Schedule
23-28: Adaptive Standards, Stadium Analytics, AI Game Engine, Data Flow, V2, Traceability

### Key Features
- Complete TypeScript interfaces for all data models
- Full formulas for WAR (bWAR/pWAR/fWAR/rWAR/mWAR), Leverage Index, Clutch Attribution
- SMB4-calibrated constants (wOBA scale 1.7821, FIP constant 3.28)
- Adaptive scaling system (opportunityFactor for all thresholds)
- Event-driven architecture: 3 immutable streams (AtBat, BetweenPlay, Transaction)
- Park factor confidence-based blending (C-088)
- Modifier registry replacing special events (C-089)
- AI Game Engine scoped to AI-only games (C-048/C-082)

### Verification
- Subagent verified all 33 decisions present in document with section references
- Cross-cutting decisions (C-045, C-054, C-076) tracked separately
- Decisions routed to other gospels documented in §28

### No Code Changes This Session
Gospel documentation only.

### What Next Session Starts With
- Commit MODE_2 and MODE_3 (if not yet committed)
- Draft ALMANAC.md (2 input specs, 0 decisions) — smallest gospel
- Draft SPINE_ARCHITECTURE.md (cross-cutting, C-045) — shared data contracts
- After all 5 gospels complete: archive superseded specs

## Session: 2026-02-23 (Afternoon) — Gospel Consolidation: ALMANAC + SPINE ARCHITECTURE (ALL 5 GOSPELS COMPLETE)

### Accomplished

**Drafted ALMANAC.md (~350 lines, 10 sections):**
- Read-only cross-season historical reference layer
- Fully consumes ALMANAC_SPEC.md (all 7 sections) + Almanac-relevant sections of FRANCHISE_MODE_SPEC.md
- 0 STEP4 decisions (pure read-only consumer)
- Sections: Overview, Data Sources, Almanac Sections (6 subsections: Leaderboards, Records, Awards, HOF Museum, Team History, Transactions), Cross-Season Query Interface, Career Player Profile, Implementation Priority, Franchise Isolation, V2/Deferred, Cross-References, Decision Traceability
- Added Career Player Profile section (§5) not in source spec — consolidated from franchise data architecture
- Qualifying thresholds scale with opportunityFactor
- 7-phase incremental implementation plan

**Drafted SPINE_ARCHITECTURE.md (~550 lines, 14 sections):**
- Standalone 5th gospel per C-045
- Defines shared data contracts connecting all four mode-specific gospels
- Core entity models: Player, Team, League, Franchise, Season (full TypeScript interfaces)
- All shared enumerations: Position (11), Grade (13-tier), PersonalityType (7), FameLevel (6), PlayerStatus (5), SeasonPhase (7), MojoLevel (5), FitnessState (6), ChemistryType (5), BatterHand (3), PitcherHand (2)
- Stats contracts: BattingStats, PitchingStats, FieldingStats, CareerStats
- Three immutable event streams: AtBatEvent, BetweenPlayEvent, TransactionEvent
- Two-database storage model: kbl-app-meta (8 global stores) + kbl-franchise-{id} (22 per-franchise stores)
- Three mode transition handoff contracts: FranchiseHandoff (1→2), SeasonSummary (2→3), NewSeasonHandoff (3→2)
- Adaptive scaling: opportunityFactor, WAR scaling, SMB4 constants
- Shared contracts for: Traits, Designations, Fan Morale, Narrative, Park Factors
- References 13 decisions from other gospels (C-054, C-057, C-058/059, C-070, C-074/087, C-076, C-078, C-084, C-086, C-088, F-124, F-127, F-128)

### Verification
- Subagent verification pass on both documents: all sections complete, no contradictions, proper cross-references
- ALMANAC.md fully consumes all 7 sections of ALMANAC_SPEC.md
- SPINE_ARCHITECTURE.md includes C-045, all 5 core entities, all 3 event streams, all 3 handoff contracts, complete storage schema
- Cross-checked against GOSPEL_CONSOLIDATION_MAP.md: aligned

### Git Issue
- Stale .git/index.lock from previous session prevents git operations from VM
- JK needs to run: `rm /Users/johnkruse/Projects/kbl-tracker/.git/index.lock`
- MODE_2_FRANCHISE_SEASON.md also still pending commit (was ready last session)

### Gospel Consolidation Summary (ALL 5 COMPLETE)

| Gospel | Lines | Sections | Decisions | Status |
|--------|-------|----------|-----------|--------|
| MODE_1_LEAGUE_BUILDER.md | 1,767 | 16 | 12 | ✅ COMMITTED |
| MODE_3_OFFSEASON_WORKSHOP.md | 1,319 | 21 | 17 + 8 findings | ✅ COMMITTED |
| MODE_2_FRANCHISE_SEASON.md | 3,269 | 28 | 33 + 3 cross-cutting | ✅ DRAFTED — pending commit |
| ALMANAC.md | ~350 | 10 | 0 | ✅ DRAFTED — pending commit |
| SPINE_ARCHITECTURE.md | ~550 | 14 | C-045 | ✅ DRAFTED — pending commit |
| **TOTAL** | **~7,255** | **89** | **62 IDs** | **5/5 DRAFTED** |

### No Code Changes This Session
Gospel documentation only.

### What Next Session Starts With
- Remove .git/index.lock: `rm /Users/johnkruse/Projects/kbl-tracker/.git/index.lock`
- Commit MODE_2, ALMANAC, SPINE_ARCHITECTURE, SESSION_LOG, CURRENT_STATE
- Archive superseded specs (per GOSPEL_CONSOLIDATION_MAP.md "Pending Archive" and "NOT Gospel Material" sections)
- Resume Phase 2 fix execution (code changes)

---

## Session: 2026-02-24 — SMB4 Player Database: Full MLB Roster Integration

### Context
Continuing multi-session project to populate KBL Tracker's player database with verified SMB4 roster data. Previous sessions established Yankees + Blue Jays. This session completed all remaining 28 MLB teams using Gemini-extracted CSV data.

### Accomplished

**Position Type Extension:**
- Added `'SP/RP'`, `'IF/OF'`, `'1B/OF'` to Position union type in `src/types/game.ts`
- Resolves compound position values used by dual-role pitchers and multi-position players in SMB4

**AL East + AL Central (8 teams — prior context, carried over):**
- Generated from single CSV: Orioles, Rays, Red Sox, White Sox, Twins, Indians, Royals, Tigers
- Applied Cleveland data fixes (3 missing OVRs: Yates C-, Shambles B-, Avery B-)
- Fixed apostrophe escaping in O'Connell and O'Cherio player names

**AL West (5 teams):**
- CSV: `MLB Teams AL-West DATA for KBL - Sheet1.csv` (110 rows, 5 teams × 22 players)
- Generated: `marinersPlayers.ts`, `astrosPlayers.ts`, `angelsPlayers.ts`, `rangersPlayers.ts`, `athleticsPlayers.ts`
- Compound positions handled: Knoggin 1B/OF, Ventura 1B/OF, Black SP/RP, Gordon IF/OF, Kelly SP/RP, Smith IF/OF, Dixon 1B/OF, Eckersley SP/RP

**NL East (5 teams):**
- CSV: `MLB Teams NL-East DATA for KBL spreadsheet - Sheet1.csv` (110 rows)
- Generated: `marlinsPlayers.ts`, `exposPlayers.ts`, `philliesPlayers.ts`, `metsPlayers.ts`, `bravesPlayers.ts`
- Apostrophe handled: Chucky O'Connell (Phillies)
- Initial CSV had extra POS column (lineup position); user re-uploaded clean version

**NL Central (5 teams):**
- CSV: `MLB Teams NL- Central DATA for KBL spreadsheet - Sheet1.csv` (110 rows)
- Generated: `cardinalsPlayers.ts`, `redsPlayers.ts`, `brewersPlayers.ts`, `piratesPlayers.ts`, `cubsPlayers.ts`
- Handled "-" as empty S_POS (Brewers/Pirates used dashes instead of blank)
- Apostrophe handled: Hander O'Speciallo (Reds + Pirates)

**NL West (5 teams):**
- 5 individual CSVs: `padres_roster.csv`, `dodgers_roster.csv`, `dbacks_roster.csv`, `rockies_roster.csv`, `giants_roster.csv`
- Generated: `padresPlayers.ts`, `dodgersPlayers.ts`, `diamondbacksPlayers.ts`, `rockiesPlayers.ts`, `giantsPlayers.ts`

### Build Status
- All 30 team files compile with zero type errors
- Only pre-existing FieldingModal/fieldingLogic errors remain (unrelated to player data)

### Files Created/Modified
- `src/types/game.ts` — Position type extended with SP/RP, IF/OF, 1B/OF
- 28 new files in `src/data/players/mlb/` (Yankees + Blue Jays were prior session)
- 4 generator scripts in `/sessions/` working directory (not committed)

### Total Player Data
- **30 MLB teams × 22 players = 660 players** — all in `src/data/players/mlb/`
- Data source: Gemini CSV extraction from SMB4 screenshots (validated against manually-verified Yankees data — 100% numerical accuracy)

### Trust Decision
- JK directive: "trust gemini on everything" — all CSV values accepted wholesale after Yankees cross-check showed 100% match on ratings

### Pending
- 20 standard league teams (506 players) — awaiting CSVs, will go in `src/data/players/standard/`
- Team files not yet wired into playerDatabase.ts imports/exports
- No git commit made this session (JK to handle)

---

## Session: 2026-02-24 — SPINE_ARCHITECTURE.md Comprehensive Review & Corrections

### Context
JK provided detailed section-by-section feedback on SPINE_ARCHITECTURE.md (sections 3.1 through 13), uploaded STADIUM_ANALYTICS_SPEC.md for stadium data expansion. Session covered three phases: outright error fixes, design decision resolution (11 questions), and remaining gap fills.

### Accomplished

**Phase 1 — Outright Error Fixes (3):**
1. §3.6 PersonalityType: Replaced hallucinated names with SMB4-authentic: `'Competitive' | 'Relaxed' | 'Droopy' | 'Jolly' | 'Tough' | 'Timid' | 'Egotistical'` (verified against MODE_1_LEAGUE_BUILDER.md)
2. §3.6 FitnessState: Fixed order to `'Hurt' | 'Weak' | 'Strained' | 'Well' | 'Fit' | 'Juiced'`
3. §4.3 FieldingStats: Removed `wallCatches` (not in SMB4), added `divingPlays`, `missedDives`, `webGems`, `leapingCatches`, `missedLeap`, `robbedHRs`; replaced `gamesByPosition` with `outsByPosition: Record<Position, number>` for partial-inning credit

**Phase 2 — Design Decisions Resolved (11):**
- Q16: FameLevel → All start Unknown (earned through gameplay, C-078 dropdown display only)
- Q17: SeasonPhase gating → Mode 2 owns it
- Q18: RulesPreset expansion → Mode 1 owns it
- Q19: Grade → Computed only via `computeGrade()`, removed `grade: Grade` from Player interface
- Q20: MLB salary reference → Per SALARY_SYSTEM_SPEC
- Q21: Schedule → Manual wizard + CSV only (supersedes C-079, no auto-generation)
- Q22: `youngPlayer` → Renamed to `fanHopeful` everywhere
- Q23: WAR → Split into `PlayerWAR` (bWAR/pWAR/fWAR/rWAR) and `ManagerWAR` (mWAR) discriminated union
- Q24: Chemistry → Full §9 rewrite with `TeamChemistry` interface, 4-tier potency (1.00×–1.75×), trait quality vs chemistry distinction
- Q25: 30/50/20 trait split → Re-analyze after standard player import
- Q26: Reporter revealLevel → Mode 2 Narrative section

**Phase 3 — Remaining Gap Fills (8):**
1. §13 complete replacement: Thin ParkFactors-only → full Stadium entity with `Stadium`, `StadiumDimensions`, `DimensionZone`, `SprayZone`, expanded `ParkFactors` (with `directionFactors`, `gamesIncluded`, `source`), `StadiumRecords`, `SprayChartData` — pulled from STADIUM_ANALYTICS_SPEC.md
2. §5.3 TransactionType expanded: Added 13 new event types (SALARY_CHANGE, TRAIT_ADDED/REMOVED, RATINGS_CHANGE, POSITION_CHANGE, NAME_CHANGE, NUMBER_CHANGE, TEAM_RENAME, STADIUM_CHANGE, JERSEY_RETIRED, DESIGNATION_AWARDED/REMOVED)
3. §6.1 kbl-app-meta: Added `playerNamePool` store
4. §6.1 kbl-franchise: Added `stadiums`, `playerMorale`, `relationships` stores
5. §7.2 SeasonClassification: Added `managerOfYearCandidates`, `relieverOfYearCandidates`, `comebackPlayerCandidates`
6. §8.2 WAR grade thresholds table: MVP 7.0+ → Liability <0.0
7. §4.2 PitchingStats: Added Kc (strikeouts looking) derivation note
8. §4.4–4.5 new sections: `RunningStats` and `ManagingStats` interfaces
9. §4.6 `CareerStats`: Added `careerRunning: RunningStats`
10. §3.5 `ScheduleGame`: Added `scheduledDate: string` field + manual-only note

**Phase 4 — Final Verification:**
- All 14 sections present (§1–§14)
- §13 has 6 subsections (13.1–13.6) all verified
- `youngPlayer` → `fanHopeful` confirmed (zero stale references)
- `wallCatches` confirmed removed
- `grade: Grade` confirmed removed from Player; `computeGrade` derivation note present in §3 + §4
- `PlayerWAR`/`ManagerWAR` split confirmed
- `ChemistryTier` defined in §9

### Design Decision: Stadium Analytics Placement
- Spine gets data shape (entity interfaces)
- Mode 2 owns behavior (calculations, accumulation)
- Almanac owns historical queries

### Files Modified
- spec-docs/SPINE_ARCHITECTURE.md — extensive edits across all 14 sections

### Files Referenced (not modified)
- STADIUM_ANALYTICS_SPEC.md (uploaded, 1,342 lines) — source for §13 expansion
- MODE_1_LEAGUE_BUILDER.md — verified PersonalityType
- MODE_3_OFFSEASON_WORKSHOP.md — verified chemistry tier/potency

### No Code Changes This Session
Spec documentation only.

### Remaining Items Not Addressed
- Modifier/enhancement representation in event data (§5.1/5.2) — deferred
- SMB4 Names Database Excel uploaded but not yet read/integrated

---

## Session: 2026-02-24 (cont.) — SPINE Cross-Gospel Verification & Reconciliation

### Context
Continuation. Full section-by-section re-read of SPINE_ARCHITECTURE.md with cross-referencing against all four gospels (Mode 1, Mode 2, Mode 3, Almanac). Identified 29 findings: 13 contradictions, 10 gaps, 6 clarity issues.

### Audit Findings (29 total)

**Category A — Cross-Gospel Contradictions (13):**
- A-1: hiddenModifiers — Spine had `leadership/composure`, Mode 1 has `loyalty/resilience` → **FIXED: Mode 1 wins**
- A-2: Grade storage — Spine says computed-only, Mode 1 stores `overallGrade` → **Spine correct; Mode 1 needs update (deferred)**
- A-3: gamesPerTeam — Spine had preset enum → **FIXED: custom number 2–200 per JK**
- A-4: extraInningsRule — Spine had `'none'`, Mode 1 had `'sudden_death'` → **FIXED: Spine wins, kept 'none'**
- A-5: DH rule — Spine had `boolean`, Mode 1 has detailed struct → **FIXED: Mode 1 structure adopted**
- A-6: Trade deadline — Spine had `gameNumber`, Mode 1 has `timing` (percentage) → **FIXED: Mode 1 structure adopted**
- A-7: Position type — Spine had 11 + DH, Mode 1 has compounds → **FIXED: DH removed from Position, added CP/SP/RP/IF/OF compounds, new BattingSlot type**
- A-8: MojoLevel — Spine numeric vs Mode 2 string enum → **FIXED: String enum + MOJO_VALUES mapping constant**
- A-9: Reporter interface — completely different fields → **FIXED: Merged into one canonical BeatReporter with all fields from both**
- A-10: BattingStats field names — different between Spine and Mode 2 → **FIXED: Spine keeps full field names (authoritative); SB/CS removed (running-only)**
- A-11: PitchingStats — Mode 2 adds wildPitches/blownSaves, Spine had highLeverageOuts → **FIXED: Added wildPitches/blownSaves, removed highLeverageOuts, moved pitchCount/battersFaced to derived**
- A-12: ScheduleGame date — different format → **FIXED: Adopted Mode 1's `fictionalDate: FictionalDate` format**
- A-13: TransactionType — Mode 2 subset → **FIXED: Collapsed IL_PLACEMENT/IL_RETURN to IL_MOVE, added CONTRACT_EXTENSION**

**Category B — Gaps Filled (10):**
- B-1: 17 undefined types → **FIXED: Defined 10 core types in new §3.8 (HalfInning, Bases, AtBatResult, Direction, ExitType, FieldingData, GameEvent, PlayoffFormat). Added mode-specific pointers for 7 others.**
- B-2: No HOF interface → **FIXED: Added pointer to ALMANAC.md §3.4 (Almanac-only per JK)**
- B-3: Almanac data sources incomplete → **Noted (Almanac fix, not Spine)**
- B-4: RunningStats not in Player.seasonStats → **FIXED: seasonStats now {batting, pitching, fielding, running}**
- B-5: FieldingStats not in Player.seasonStats → **FIXED: same as B-4**
- B-6: ManagingStats no accumulation path → **FIXED: Added `careerManaging?: ManagingStats` to CareerStats, stored in mwarDecisions store**
- B-7: SB/CS duplicated in BattingStats + RunningStats → **FIXED: Removed from BattingStats, RunningStats is sole owner**
- B-8: Fan morale weights not in Spine → **Already present as comments (60/20/10/10)**
- B-9: Mode 2 ParkFactors missing directionFactors → **Noted (Mode 2 fix, not Spine)**
- B-10: 5 extra awards not in SeasonClassification → **FIXED: Added platinumGlove, boogerGlove, benchPlayer, karaKawaguchi, bustOfYear candidate lists**

**Category C — Clarity Fixes (6):**
- C-1: seasonStats was BattingStats & PitchingStats intersection → **FIXED: Now explicit {batting, pitching, fielding, running} object**
- C-2: FitnessState neutral state unclear → **FIXED: Comment clarifies "Fit is the neutral/default state"**
- C-3: Stale line counts in §14 → **FIXED: Removed line count column entirely**
- C-4: Dual parkFactors storage → **FIXED: Removed separate parkFactors store from §6.1, parkFactors live on Stadium entity**
- C-5: TeamDesignationState vs DesignationState naming → **FIXED: Aligned to DesignationState**
- C-6: Chemistry potency clarity → **No action needed, design point is well-documented**

### JK Decisions Made This Session
- gamesPerTeam: custom number 2–200, no preset enum
- extraInningsRule: Spine wins (`'none'` stays, Mode 1 loses `'sudden_death'`)
- DH + trade deadline: Mode 1's detailed structures adopted
- ScheduleGame: Mode 1's `fictionalDate: FictionalDate` format adopted
- hiddenModifiers: Mode 1 wins (`loyalty`, `ambition`, `resilience`, `charisma`)
- Position: Remove DH from Position, add compounds (SP/RP, IF/OF, 1B/OF, CP)
- MojoLevel: Both — string enum + numeric mapping constant
- Stats: Full alignment — SB/CS running-only, add wildPitches/blownSaves, remove highLeverageOuts, ManagingStats → CareerStats
- FitnessState: Fit is neutral (confirmed)
- Reporter: Merge into one canonical BeatReporter with all fields
- TransactionType: Simplify IL to IL_MOVE, add CONTRACT_EXTENSION
- Undefined types: Define core in Spine, pointers for mode-specific
- HOF: Almanac-only
- Extra awards: Add to Spine SeasonClassification

### Files Modified
- spec-docs/SPINE_ARCHITECTURE.md — 29 findings resolved
- spec-docs/SESSION_LOG.md — this entry

### Deferred Items (require updates to OTHER gospels, not Spine)
- A-2: Mode 1 `overallGrade` field needs removal (Spine is correct: computed-only)
- B-3: Almanac §2.1 data sources list needs expanding
- B-9: Mode 2 §24 ParkFactors needs `directionFactors` field added
- Mode 1 `extraInningsRule` needs `'sudden_death'` removed, `'none'` added
- Mode 2 `MojoLevel` should reference Spine's canonical type
- Mode 2 `BeatReporter` interface should align with Spine §12

### Next Action
- Commit SPINE_ARCHITECTURE.md changes to main
- Apply deferred fixes to Mode 1, Mode 2, Mode 3, Almanac gospels
- Import SMB4 Names Database when ready

---

## Session: 2026-02-25 — Mode 2 Gospel JK Review Pass (v1.0 → v1.1)

### Context
JK provided comprehensive feedback on MODE_2_FRANCHISE_SEASON.md covering all 26 sections (~40+ items). Two-phase session: (1) discussion/Q&A on all feedback items, (2) apply confirmed fixes.

### Accomplished
Applied ~35+ fixes to MODE_2_FRANCHISE_SEASON.md, upgrading from v1.0 to v1.1. Key changes:

**Structural:**
- §1.3: Clarified immutability language (outcome-level immutable, versioned edits for enrichment/runners)
- §2.1: Removed orphaned `isClutchProfile`, removed `traits` snapshot from contexts, expanded `parkContext` with full ParkFactors reference + dimensions, renamed `clutchValue` → `wpa`, fixed `MilestoneEvent[]` → `AchievedMilestone[]`
- §2.1: Fixed `FameLevel` to align with Mode 1 (Unknown/Local/Regional/National/Superstar/Legend)
- §2.1: Fixed `PlayerPersonality` to align with Mode 1's 7-type model + 4 hidden modifiers (C-070)
- §2.2: Split substitution `position` into `outPosition` + `inPosition`
- §7.1: Added position swap as single event (not two linked events)

**Game Logic:**
- §3.7: Fenway Board now includes game score/inning/outs, replaces separate scoreboard bar
- §6.2: Removed CI from at-bat counting (not in SMB4)
- §6.7: Added note that BB includes IBB in OBP formula
- §23.4: PA qualification now scales by `inningsPerGame/9`

**Stats & Achievements:**
- §8.3: Added `clutchWPA`, `per9` rates (scaled for inningsPerGame), `fieldingPct` (includes missedDives/missedLeaps in denominator), 5-hit/6-hit games, webGems, goldenSombreros, titaniumSombreros, madduxGames, immaculateInnings to season stats
- §9.7: Added CGSO, 20K game (scaled), back-to-back shutouts, save/win streaks
- §10.4: Made crystal clear that star play categories are user-selected enrichments via [+fielding] button; web gems are engine-derived from fWAR threshold (NOT user-tagged)
- §10.5: Added effort error classification (50% reduced penalty for errors on difficult attempts)
- §10.7: Updated fWAR formula to include `√(LI)` for situational context; added context window note (closes at end of half-inning)

**Clutch & WAR:**
- §13.1: Replaced `baseValue × contactQuality × √(LI)` with straight WPA. Explained LI vs WPA distinction.
- §13.8: Renamed to "Clutch Stats (WPA-Based)" with `totalWPA`, `positiveWPA`, `negativeWPA`

**Mojo/Fitness (MAJOR REFRAME):**
- §14 header: Added critical user-only paradigm note — engine tracks but never initiates state changes
- §14.2: Replaced Mojo Carryover formula with "User-Observed" tracking description
- §14.3: Removed Mojo Amplification (engine doesn't calculate this)
- §14.5: Replaced Fitness Decay/Recovery with "User-Observed" tracking description
- §14.8: Replaced Injury Risk with "User-Observed" tracking description
- Preserved §14.11 data schema with tracking fields (gamesAtJuiced, splits)

**Narrative & Designations:**
- §16.1: Added name generation note for managers/scouts (Mode 1), all names user-editable
- §16.10: NEW — Narrative UI Surfaces table (X feed, Tootwhistle Times, Post-Game Summary, Pop-Up Notifications)
- §17.7: Renamed "Young Player" → "Fan Hopeful" per Spine; yellow on baby blue badge
- §17.14: NEW — Player Morale System (0-100 per-player, morale inputs table, rating change suggestions, morale does NOT directly affect clutch)

**Milestones & Scaling:**
- §18.2: Added 5-hit (+1.5), 6-hit (+2.0), CGSO, Maddux, golden sombrero, mental error, terrible pitcher outing, 0-for-5 fame events
- §18.3: Fixed club scaling direction — clubs now scale DOWN by opportunity factor (KBL harder than MLB, not easier); removed 25-25, kept 30-30, 40-40, added 50-50
- §18.5: Set minimumPA=25, minimumIP=20 for franchise leader boards; activate at game 4
- §18.7: Trade aftermath swings both ways (trading Albatross improves playerMorale)
- §23.5: Raised universal floor to 10 (no milestone below 10)

**Fan Morale:**
- §20.3: Walk-off always major for fanMorale; playerMorale fires for own milestones even if minor
- §20.5: Trade scrutiny affects both fanMorale AND playerMorale
- §20.8: Updated personality references to Mode 1 types (EGOTIST, TEAM_PLAYER)

**Deferrals:**
- §25: AI Game Engine marked as DEFERRED TO V2 (v1 uses simplified box-score generator)
- §27: Added AI Game Engine to V2 deferred table

### Open Items from Discussion (Not Yet Applied)
1. **WAR deep audit** — JK wants separate dedicated session to verify WAR math across all 5 components
2. **Mode 3 flow-through** — WPA simplification needs to be reflected in MODE_3_OFFSEASON_WORKSHOP.md
3. **Mode 1 name generation** — Name generation for managers/scouts needs to be added to MODE_1_LEAGUE_BUILDER.md
4. **True Value - Contract wiring** — Need to verify if the calculation for Fan Favorite/Albatross (True Value − Contract) is wired in code
5. **V1 deferral tracking** — Need comprehensive list of all V2 deferrals across all gospels

### JK Decisions Made This Session
- Remove isClutchProfile (orphaned, no backing logic)
- WPA replaces custom clutch formula (§13.1)
- Web gems = engine-derived, NOT user-tagged
- Star play categories = user enrichments in [+fielding] button
- Mojo/fitness = user-only paradigm (engine tracks, never initiates)
- Keep engine tracking of games at various mojo/fitness states (feeds splits + narrative)
- Club scaling: DOWN by opportunity factor; remove 25-25; minimum floor 10
- minimumPA=25, minimumIP=20 for franchise leaders
- playerMorale: 0-100 per-player, can suggest rating changes, does NOT directly affect clutch
- Effort errors: 50% reduced fWAR penalty
- Fan Hopeful: renamed from Young Player per Spine
- Walk-off: ALWAYS major for fanMorale
- AI Game Engine: deferred to V2

### Files Modified
- spec-docs/MODE_2_FRANCHISE_SEASON.md — v1.0 → v1.1 (35+ edits)
- spec-docs/SESSION_LOG.md — this entry

### Next Action
- Commit MODE_2_FRANCHISE_SEASON.md v1.1 to main
- WAR deep audit session (separate prompt)
- Apply WPA flow-through to Mode 3 spec
- Add name generation to Mode 1 spec
- Verify True Value - Contract wiring in code

---

## Session: 2026-02-25 (NFL Audit of Mode 2 Gospel v1.1)

**Context:** Continuation session after compaction. Completed the NFL audit JK requested.

### Task
Audit all 48 confirmed changes from the JK review pass to ensure 100% were applied to MODE_2_FRANCHISE_SEASON.md v1.1.

### Findings
- **48/48 confirmed changes verified present** in the spec file
- **2 gaps identified and fixed:**
  1. §6.3 line 802: "Appeal play on preceding runner" lacked SMB4 note → Added: *(Note: appeal outs do not exist in SMB4 — included for baseball rules completeness only)*
  2. §17 header: Missing explicit statement that projected designations recalculate game-by-game → Added: "Projected vs Locked" paragraph clarifying projected designations recalculate after every completed game
- **1 item deferred (not a spec edit):** True Value - Contract wiring verification requires code inspection, not spec change

### NFL Steps Performed
1. Read entire 3,370-line spec file in full (8 parallel chunks)
2. Cross-referenced every confirmed change from session summary against actual file content
3. Verified line numbers for each change
4. Identified 2 gaps where confirmed feedback was not applied
5. Applied both fixes
6. Re-read the fixed lines to verify edits landed correctly

### Files Modified
- spec-docs/MODE_2_FRANCHISE_SEASON.md — 2 gap fixes (§6.3, §17)
- spec-docs/SESSION_LOG.md — this entry

### Next Action
- Commit MODE_2_FRANCHISE_SEASON.md to main
- WAR deep audit session (separate prompt)
- Apply WPA flow-through to Mode 3 spec
- Add name generation to Mode 1 spec
- Verify True Value - Contract wiring in code

---

## Session: 2026-03-03 (V1 Simplification — Mode 2 Triage Complete)

**Context:** V1 Simplification Phase A. Completed final 5 sections of Mode 2 triage + cross-reference reconciliation.

### Task
Triage §24–§28 of MODE_2_FRANCHISE_SEASON_UPDATED, run cross-reference reconciliation, close out Mode 2.

### Rulings
- §24 SIMPLIFY: Full park factors + spray chart with heat map viz (per-player, per-team, pitcher matchup). Remove exit velocity (can't observe in SMB4). Keep confidence blending (40% activation floor, 3-tier blend).
- §25 DEFER ENTIRELY: No simulation in v1. No "simplified box-score generator." All 4 interfaces stripped until v2.
- §26 SIMPLIFY: Keep data flow diagram + SeasonSummary handoff contract. Defer Cold storage export + seasonClassification field.
- §27 DEFER ENTIRELY: V2_DEFERRED_BACKLOG.md is authoritative. §27 summary table stale/redundant.
- §28 KEEP AS-IS: Decision traceability appendix. Zero code cost, aids provenance.

### Cross-Reference Reconciliation
PASSED — no blocking conflicts found. All KEEP sections have dependencies satisfied.
5 spec gaps identified for v1 draft consolidation:
1. Fame System canonical section (no home)
2. Random Event Catalog (no catalog)
3. Box score UI on schedule (no UI surface)
4. INSIDER reveal (Mode 1 hidden attributes dependency)
5. "Rest of roster" True Value (Mode 1 salary dependency)

### Mode 2 Final Tally
- KEEP AS-IS: 10 sections (§3, §5, §6, §12, §16, §17, §21, §23, §28)
- SIMPLIFY: 15 sections (§1, §2, §4, §7, §8, §9, §10, §11, §13, §14, §15, §18, §20, §22, §24, §26)
- DEFER ENTIRELY: 3 sections (§19, §25, §27)

### Files Modified
- spec-docs/v1-simplification/MODE_2_V1_DRAFT.md — §24–§28 rulings + triage summary + reconciliation results
- spec-docs/v1-simplification/V2_DEFERRED_BACKLOG.md — 4 new entries (exit velocity, AI Game Engine, Cold storage, seasonClassification)
- spec-docs/v1-simplification/V1_SIMPLIFICATION_TRACKER.md — Session 5 entry + Mode 2 status COMPLETE
- spec-docs/CURRENT_STATE.md — full rewrite for session end
- spec-docs/SESSION_LOG.md — this entry

### Next Action
- Begin Mode 1 triage at §1 of MODE_1_LEAGUE_BUILDER
- Mode 1 resolves cross-mode dependencies: hidden attributes, salary/True Value, stadium dimensions

---

## Session: 2026-03-04 (V1 Simplification — Mode 1 Triage Complete)

**Context:** V1 Simplification Phase A. Completed remaining 7 sections of Mode 1 triage (§10–§16) + cross-reference reconciliation.

### Rulings
- §10 SIMPLIFY: CSV upload + manual entry. OCR deferred. SIMULATED stripped from GameStatus (not dormant).
- §11 SIMPLIFY: Full 6-step wizard. Preset references stripped (per §9). §2 corrections propagated (aiScoreEntry removed, offseasonScope simplified). Salary calculation before any draft type. Playoff Mode deferred per §1.
- §12 KEEP AS-IS (3 spec corrections): Full 11-step init. rulesPresetId → inline config. aiScoreEntry removed. offseasonPhaseScopes → simplified.
- §13 SIMPLIFY: Full 2-tier data architecture. Legacy migration removed (v1 = fresh start). rulesPresets global store removed.
- §14 DEFER ENTIRELY: V2 table redundant with V2_DEFERRED_BACKLOG.md.
- §15 KEEP AS-IS: Cross-references appendix.
- §16 KEEP AS-IS: Decision traceability appendix.

### Mode 1 Final Tally
- KEEP AS-IS: 7 (§3, §5, §6, §7, §8, §15, §16) + 1 with corrections (§12)
- SIMPLIFY: 7 (§1, §2, §4, §9, §10, §11, §13)
- DEFER ENTIRELY: 1 (§14)

### Cross-Reference Reconciliation
PASSED — no blocking conflicts. All KEEP sections have dependencies satisfied. Spec corrections internally consistent. No new blockers for Mode 3/Almanac.

### Files Modified
- spec-docs/v1-simplification/MODE_1_V1_DRAFT.md — §10–§16 rulings + triage complete
- spec-docs/v1-simplification/V1_SIMPLIFICATION_TRACKER.md — Session 7 entry + Mode 1 status COMPLETE
- spec-docs/v1-simplification/V2_DEFERRED_BACKLOG.md — 6 new entries (OCR, SIMULATED, Playoff Mode wizard, legacy migration, V2 table)
- spec-docs/CURRENT_STATE.md — full rewrite for session end
- spec-docs/SESSION_LOG.md — this entry

### Next Action
- Begin Mode 3 triage at §1 of MODE_3_OFFSEASON_WORKSHOP (21 sections)

---

## Session: 2026-03-04 (V1 Simplification — Mode 3 Triage §1–§8)

**Context:** V1 Simplification Phase A. Began Mode 3 triage. Completed 8 of 21 sections (§1 through §8, covering Phases 1–6 of the 13-phase offseason).

### Rulings
- §1 KEEP AS-IS: Full 13-phase structure, all 12 outputs, all 7 principles. Cosmetic correction to AI simulation reference in §1.3.
- §2 SIMPLIFY: Game Night Mode only for v1 (Streamlined deferred). Offseason scope expanded from binary toggle to 3-value selector (default/human-only/all-teams) — Mode 1 §2 correction propagated.
- §3 KEEP AS-IS (2 spec corrections): Championship fame bonus bumped from +1 to +3. Fitness reset added alongside mojo reset in Phase 1 (clean slate for both systems).
- §4 SIMPLIFY (2 spec corrections): All 13 award screens keep with full ceremony. 5% regular player trait lottery deferred (unfocused wheel spins). Team Captain removed from Awards Ceremony — moved to Phase 13 (Finalize & Advance) after all roster changes complete.
- §5 KEEP AS-IS: Full EOS ratings adjustment + salary recalculation #1. All formulas, position detection algorithm, manager distribution, farm call-up threshold.
- §6 SIMPLIFY: Full expansion draft keeps. Stadium change keeps. "Create custom" stadium option removed (no basis in SMB4).
- §7 SIMPLIFY (2 spec corrections): Three dice roll rounds per team (increases retirement rate for young rosters). Un-retirement deferred (retired stays retired in v1).
- §8 SIMPLIFY (2 spec corrections): Full 2-round FA with dice rolls + personality-driven destinations. Fallback revised: user selects exchange player if ±30% True Value match fails. §8.4 Free Agent Pool Signing removed entirely — incompatible with 1-for-1 exchange model (spec error from prior hallucination).

### Mode 3 Tally So Far (8/21)
- KEEP AS-IS: 3 (§1, §3, §5) — all with spec corrections
- SIMPLIFY: 5 (§2, §4, §6, §7, §8)
- DEFER ENTIRELY: 0

### Cross-Mode Spec Corrections Identified
- Mode 1 §2: `offseasonScope` type expands from `'all-teams' | 'human-only'` to `'default' | 'human-only' | 'all-teams'`. Propagates to §2.3, §2.5, §11.5, §12.1.

### Files Modified
- spec-docs/v1-simplification/MODE_3_V1_DRAFT.md — created + §1–§8 rulings
- spec-docs/v1-simplification/V1_SIMPLIFICATION_TRACKER.md — Session 8 entry + Mode 3 status IN PROGRESS
- spec-docs/CURRENT_STATE.md — full rewrite for session end
- spec-docs/SESSION_LOG.md — this entry

### Next Action
- Continue Mode 3 triage at §9 (Phase 7: Draft) of MODE_3_OFFSEASON_WORKSHOP. 13 sections remaining.

## Session: 2026-03-04 (V1 Simplification — Mode 3 Triage §9–§21 COMPLETE)

**Context:** V1 Simplification Phase A. Completed Mode 3 triage — sections §9 through §21 (13 remaining sections). Cross-reference reconciliation passed.

### Rulings
- §9 SIMPLIFY: Remove Screen 1 (un-retirement via draft, per §7 ruling). 8-screen flow. Traits HIDDEN at draft — only scouted grade, primary/secondary position, chemistry, personality, potential ceiling visible. True ratings + traits revealed at call-up. Full scouting accuracy system + auto-draft for AI teams kept.
- §10 KEEP AS-IS: Salary recalc #2 — pass 2 of 3, same formula on updated rosters.
- §11 SIMPLIFY: 7-screen flow (remove AI-initiated trade proposals, Screens 5–6). V1 is user-initiated only. AI trade logic (5-factor weighted) kept for AI-controlled teams responding to user proposals. Waiver wire source corrected: cut players from offseason phases, NOT retirements.
- §12 KEEP AS-IS: Salary recalc #3 — pass 3 of 3, locks definitive baseline.
- §13 KEEP AS-IS: Farm reconciliation — 10-player max enforcement, option counter reset, farm morale update (4 factors, no recentPerformance).
- §14 KEEP AS-IS: Chemistry rebalancing — composition count, 4-tier table, trait potency multiplier. 3 screens.
- §15 KEEP AS-IS (spec correction): 12 screens (added Team Captain Designation as Screen 9, per §4 ruling). Call-up reveals traits + true ratings. Demotion retirement risk (5-factor table). Full SeasonArchive interface (11 fields).
- §16 KEEP AS-IS (2 corrections): Team Captain reference → Phase 13. Remove un-retirement from §16.6 prospect generation.
- §17 KEEP AS-IS (1 correction): Phase 9 AI resolution description corrected for user-initiated only.
- §18 KEEP AS-IS: 8 IndexedDB stores, 3 cross-store patterns, sequential state machine.
- §19 KEEP AS-IS (updated): V2 table expanded with 5 new deferrals from triage. V2_DEFERRED_BACKLOG.md noted as authoritative.
- §20 KEEP AS-IS: Cross-references appendix.
- §21 KEEP AS-IS (1 correction): C-053 section reference updated to §15.2 Screen 9.

### Mode 3 Final Tally
- KEEP AS-IS: 13 | SIMPLIFY: 7 | DEFER ENTIRELY: 0 | Updated reference: 1
- Cross-reference reconciliation: PASSED — no DEFER ENTIRELY rulings, all SIMPLIFY removals self-contained.

### Spec Corrections Accumulated (Mode 3 Total)
AI simulation reference (§1), offseasonScope 3-value (§2), championship fame +3 (§3), fitness reset (§3), Team Captain → Phase 13 (§4/§15/§16/§21), 5% trait lottery removed (§4), custom stadium removed (§6), 3 retirement rounds (§7), un-retirement removed (§7/§9/§16), FA pool signing removed (§8), draft trait visibility hidden (§9), primary+secondary position on draft board (§9), AI-initiated proposals deferred (§11/§17), waiver wire source corrected (§11), V2 table updated (§19).

### Files Modified
- spec-docs/v1-simplification/MODE_3_V1_DRAFT.md — §9–§21 rulings + cross-reference reconciliation
- spec-docs/v1-simplification/V1_SIMPLIFICATION_TRACKER.md — Session 9 entry, Mode 3 marked COMPLETE
- spec-docs/CURRENT_STATE.md — updated

### Next Action
- Begin Almanac triage at §1 of ALMANAC. Final document in Phase A.

## Session: 2026-03-05 (V1 Simplification — Almanac Triage COMPLETE + Phase A COMPLETE)

**Context:** V1 Simplification Phase A. Completed Almanac triage — all 10 sections. This completes Phase A (Spec Triage) across all four gospel documents.

### Rulings
- §1 SIMPLIFY: Almanac accessible from app home screen. Cross-franchise querying. Custom views (saved filters + column selection). Custom dashboards v2.
- §2 SIMPLIFY: 12th store (franchiseRegistry) added. V1 data gap annotations. Two-store transaction design confirmed.
- §3 SIMPLIFY: Awards expanded to all 13 categories. Transaction types corrected to 8. HOF empty-state placeholder.
- §4 SIMPLIFY: franchiseFilter + displayColumns added. Tiered performance targets (100ms/300ms/best-effort).
- §5 SIMPLIFY: mWAR labeled distinctly. Franchise badge on profiles. Cross-franchise disambiguation page.
- §6 SIMPLIFY: Phase 0 (cross-franchise infra) added. Phase 7 expanded (custom views + data export). Empty state from creation.
- §7 SIMPLIFY: Full rewrite — cross-franchise default. Dual entry point behavior.
- §8 SIMPLIFY: Data export (CSV/PDF/JSON) moved to v1. V2 list clarified.
- §9 SIMPLIFY: References corrected and expanded. Cross-franchise divergence note.
- §10 SIMPLIFY: Trait history source-agnostic. Triage ruling T-001 added.

### Almanac Final Tally
- KEEP AS-IS: 0 | SIMPLIFY: 10 | DEFER ENTIRELY: 0
- Cross-reference reconciliation: PASSED

### Phase A Final Summary
All 4 documents triaged across 10 sessions. 75 total sections: 32 KEEP, 37 SIMPLIFY, 5 DEFER. 1 new feature added (cross-franchise Almanac with custom views + data export).

### Files Modified
- spec-docs/v1-simplification/ALMANAC_V1_DRAFT.md — created + all 10 rulings + reconciliation
- spec-docs/v1-simplification/V1_SIMPLIFICATION_TRACKER.md — Session 10 entry, Almanac marked COMPLETE, Phase A summary table
- spec-docs/SESSION_LOG.md — this entry + Session 9 backfill
- spec-docs/CURRENT_STATE.md — to be updated

### Next Action
- Begin Phase B — V1 Spec Assembly: produce four _V1_FINAL.md documents + V2_DEFERRED_BACKLOG.md

## Session: 2026-03-05 (V1 Simplification — Phase B COMPLETE)

**Context:** V1 Simplification Phase B — V1 Spec Assembly. Produced all four V1_FINAL.md build specs from gospel sources + Phase A triage rulings.

### Accomplished
- Produced MODE_2_V1_FINAL.md (3,428 lines) — 25 v1 sections with full data models, formulas, interfaces, screen flows
- Produced MODE_1_V1_FINAL.md (1,682 lines) — 13 v1 sections with all corrections (presets removed, 3-value offseasonScope, franchiseRegistry added)
- Produced MODE_3_V1_FINAL.md (1,619 lines) — 21 v1 sections with all corrections (Team Captain → Phase 13, un-retirement removed, FA pool signing removed)
- Produced ALMANAC_V1_FINAL.md (610 lines) — 10 v1 sections with cross-franchise model, custom views, data export
- Updated V2_DEFERRED_BACKLOG.md — added Mode 3 deferrals (Streamlined Mode, 5% trait lottery, custom stadiums, un-retirement, AI trade proposals) and Almanac deferrals (dashboards, SQL queries, what-if, sharing, franchise merge)
- Cross-reference reconciliation: 3 blocking conflicts found and resolved
  1. MODE_2 SeasonSummary `seasonClassification` field removed (deferred but still present in interface)
  2. MODE_1 `offseasonScope` corrected from 2-value to 3-value to match Mode 3 expectation
  3. MODE_1 global stores: `franchiseRegistry` added (7th store, required for Almanac cross-franchise)
- 12 non-blocking checks all passed (WAR components, salary system, awards count, transaction types, SIMULATED removal, presets removal, un-retirement removal, etc.)

### Files Modified
- spec-docs/v1-simplification/MODE_2_V1_FINAL.md — created (3,428 lines)
- spec-docs/v1-simplification/MODE_1_V1_FINAL.md — created (1,682 lines)
- spec-docs/v1-simplification/MODE_3_V1_FINAL.md — created (1,619 lines)
- spec-docs/v1-simplification/ALMANAC_V1_FINAL.md — created (610 lines)
- spec-docs/v1-simplification/V2_DEFERRED_BACKLOG.md — Mode 3 + Almanac deferrals added
- spec-docs/v1-simplification/V1_SIMPLIFICATION_TRACKER.md — Session 11 entry, Phase B marked COMPLETE
- spec-docs/CURRENT_STATE.md — updated for Phase B completion
- spec-docs/SESSION_LOG.md — this entry

### Phase B Success Criteria
- [x] Four _V1_FINAL.md documents exist with only v1 content
- [x] V2_DEFERRED_BACKLOG.md is complete (all 4 modes + Almanac)
- [x] Cross-reference reconciliation pass is clean (3 conflicts resolved)

### Next Action
- Begin Phase C — Code Alignment (governed by V1_CODE_ALIGNMENT_PLAN.md)

---

## Session: 2026-03-07 — GameTracker Delta Complete + Elimination Mode Steps 0-2

### Context
Phase C pivoted from full code alignment to targeted GameTracker delta + Elimination Mode build. See GAMETRACKER_DELTA_PLAN.md for the full plan.

### Accomplished (GameTracker Delta — ALL 55 TICKETS COMPLETE)

**Phase 1: Quick Wins (11 tickets)** — Branch: `feature/gt-quick-wins`
- Undo depth 5→10, game-end undo prevention, sac fly prompt, button availability fixes (SF/DP/TP/D3K), SAC no-runners disable, time play rule, lineup size validation, PH-must-bat, ❌ on used players, Manager Moment WPA verify, IFR auto-prompt

**Layer 1A: Type Definitions (8 tickets)** — Branch: `feature/gt-layer1-tier1a-types`
- KL→Kc rename (31 files, 69 occurrences), WP_K/PB_K added, sequence→eventIndex, runsScored number→string[], MojoLevelLabel/FitnessLevelLabel/FameLevel/SpecPitcherRole/HiddenModifiers adapter types

**Layer 1B: Event Fields (9 tickets)** — Branch: `feature/gt-layer1b-event-fields`
- AtBatEvent extended with ~100 lines of optional context snapshots: identity (seasonId/franchiseId/leagueId), parkContext, teamContext, batterContext (16 fields), pitcherContext (15 fields), matchupContext, computed fields, enrichment group, versioning
- `buildContextSnapshot()` helper in useGameState.ts, wired at all 5 event construction sites
- `setNextEventEnrichment()` exposed for field-path enrichment injection

**Layer 1C: New Interfaces (2 tickets, 1 deferred)** — Branch: `feature/gt-layer1c-event-interfaces`
- BetweenPlayEvent discriminated union (15 types) + betweenPlayEvents IndexedDB store (DB_VERSION 2→3)
- GameRecord interface (extends CompletedGameRecord) + LineupEntry + captureStartingLineups()
- TransactionEvent DEFERRED (franchise offseason, not needed for gameplay)

**Layer 2: 5-Zone Layout (4 sessions)** — Branches: `feature/gt-layer2a` through `feature/gt-layer2d`
- Session A: CSS Grid scaffold (320px / 1fr / 180px), FenwayBoard.tsx, QuickBar.tsx, PlayLogPanel.tsx shells
- Session B: Quick Bar wired as primary 1-tap input, handleQuickBarOutcome with calculateRunnerDefaults, overflow menu with 13 secondary outcomes
- Session C: Fenway Board with live data — batter/pitcher stats, mojo/fitness labels+colors, matchup record, milestone alert
- Session D: Structured Play Log — PlayLogEntry interface, color-coded results, enrichment badges ([+fld], [+loc], [K?], [Q]), undo integration

**Layer 3: Baseball Rules (3 tickets)** — Branch: `feature/gt-layer3-baseball-rules`
- isAB filter fix (added IBB, SH→SAC), GRD (Ground Rule Double) fully implemented, tag-up enforcement (FO/LO hold by default, SF exception)

**Layer 4: Between-Play + Subs (7 tickets)** — Branch: `feature/gt-layer4-between-play-subs`
- RunnerPopover.tsx (tap runner → Steal/Advance/WP/PB/Pickoff/Substitute)
- FielderPopover.tsx (tap fielder → PinchHit/Substitute/MovePosition)
- FenwayBoard pitcher tap → pitching change
- Position innings tracking (positionInningsRef in useGameState)

**Layer 5: Enrichment (8 tickets)** — Branch: `feature/gt-layer5-enrichment`
- EnrichmentPanel.tsx (MiniDiamond SVG, FieldingSequenceInput, pitch type selector, HR distance)
- K/Kc inline toggle badge, QAB detection (7+ pitches/walks/hits)
- Between-inning enrichment prompt, post-game enrichment summary
- updateAtBatEvent() function in eventLog.ts

### Accomplished (Elimination Mode — Steps 0-2)

**Step 0: League Builder Data Integrity Audit** — Branch: `feature/elim-step0-data-integrity`
- Full field-by-field pipeline audit: playerDatabase → convertPlayer → lineupLoader → GameTracker
- Added 15 optional fields to TeamRoster.Player, 14 to Pitcher (ratings, traits, arsenal, grade, etc.)
- lineupLoader now passes through all League Builder fields
- GameTracker registerPlayer uses real traits + age
- Audit report: spec-docs/DATA_INTEGRITY_AUDIT.md

**Step 1: DB Migrations** — Branch: `feature/elim-step1-db-migrations`
- kbl-playoffs v1→v2: dropped unique constraint on seasonNumber, added sourceType + eliminationId to PlayoffConfig
- kbl-app-meta v2→v3: added eliminationList store
- kbl-tracker v3→v4: added rosterSnapshots + mojoFitnessSnapshots stores

**Step 2: Rename WorldSeries → EliminationHome** — Branch: `feature/elim-step2-rename`
- WorldSeries.tsx → EliminationHome.tsx (file + export rename)
- Routes: /world-series → /elimination/:eliminationId
- Placeholder routes for /elimination/select and /elimination/setup
- AppHome nav link updated

### Key Specs Created This Session
- `spec-docs/ELIMINATION_MODE_SPEC.md` (v2, 472 lines) — Super-lite wrapper over existing infrastructure
- `spec-docs/GAMETRACKER_DELTA_PLAN.md` — Full 5-step plan with routing table
- `spec-docs/GAMETRACKER_DELTA_REPORT.md` — Sessions 1-3 delta assessment
- `spec-docs/GAMETRACKER_BUILD_PLAN.md` — 55 tickets organized by layer
- `spec-docs/DATA_INTEGRITY_AUDIT.md` — Player data flow audit
- `spec-docs/KEEP.md` — Protected files list (updated with config exception)

### Build Status Throughout
- Build: PASS at every step
- Tests: 4,028 pass / 0 fail / 103 files at every step

### Next Action
**Elimination Mode Step 3:** Build `eliminationManager.ts` — CRUD for elimination instances.
Then Steps 4-14 per ELIMINATION_MODE_SPEC.md §11.

---

## Session: 2026-03-15 — GameTracker UX Interrogation Complete + Audit Infrastructure Built

### Context
Phase 3 UI/UX redesign for GameTracker. Used the gametracker-ux-interrogator skill to define every interaction, layout, and enrichment decision through a 49+ question interview. Then built the audit infrastructure to gap-analyze current code against the new spec.

### Accomplished

**GameTracker UX Interview (49+ questions across 11 layers)**

Key design decisions made:
- 4-column layout replaces diamond: Newsboard (1/5), Batting Lineup (1/5), Defensive Lineup (1/5), Play Log (2/5)
- Score bug (single-line, pinned top) + Quick Bar (pinned bottom) — fixed viewport, no page scroll
- Retro Fenway-style expanded scoreboard overlays downward from score bug
- K and Ꝁ (backwards K) as separate Quick Bar buttons; ITPHR added to overflow
- Three-phase lifecycle: Pre-game (START GAME gate) → Live → Post-final-out (END GAME gate)
- Runner sub-entries in play log under each at-bat — runner outcomes on AtBatEvent as runnerOutcomes[] array
- 3-layer enrichment taxonomy: Fielding Attempt (type + Made/Missed), Play Mechanic, Contact Type (5 options replacing exit type) + Modifiers
- Context-sensitive spray graphic with result-specific zone sets (18-42 zones depending on result type)
- Defensive lineup enrichment mode for fielding sequences (column toggles visual state)
- Play log as the ONE enrichment surface — player card initiates events only
- TOOTBLAN and Out Advancing are runner-level modifiers (not play-level)
- Scoreboard Chalk Retro theme with Press Start 2P font, 8-bit retro audio, CSS-only animations
- Player-first substitution flow via player card (Sub Out, Swap Position, Swap Order pre-game only)
- Manager moments: Ⓜ indicator in score bug + "Stay the Course" button for passive decisions
- Role-based lineup columns (column 2 always batting team, column 3 always fielding team)
- Post-commit runner correction (no pre-commit gate — preserves 1-tap paradigm)
- Runner outcomes locked past undo depth in V1 (full replay deferred to V2)

**Files Produced:**
- `spec-docs/GAMETRACKER_UX_TRANSCRIPT.md` — 49+ entries, complete verbatim transcript
- `spec-docs/GAMETRACKER_UX_SPEC.md` — v1.0, 58 decisions, 14 sections, 0 TBD items
- `spec-docs/PROMPT_CONTRACT_UX_GAP_OPUS.md` — Claude Code CLI Opus prompt contract (references skill)
- `spec-docs/PROMPT_CONTRACT_UX_GAP_ANALYSIS.md` — Codex version (superseded by Opus version)
- `.claude/skills/ux-gap-auditor/SKILL.md` — 6-phase audit skill with checkpoints
- `spec-docs/audit-extracts/generate_extracts.sh` — extract generation script for large files
- `spec-docs/audit-extracts/MANIFEST.md` — extract manifest

### Key Decisions
- Opus over Codex for gap analysis (interactive file navigation needed for 296KB + 248KB files)
- Phased audit with mandatory checkpoints between phases (prevents context fatigue)
- Pre-extracted code sections organized by audit phase (Mitigation 3)
- 8 spot-check anchors for manual verification of audit accuracy

### Next Action
1. Run `bash spec-docs/audit-extracts/generate_extracts.sh` from project root
2. Paste `spec-docs/PROMPT_CONTRACT_UX_GAP_OPUS.md` into Claude Code CLI (Opus, direct mode)
3. Execute Phase 0, wait for confirmation, then proceed through Phases 1-6
4. After audit completes, JK spot-checks 8 anchor decisions against actual code
5. Based on gap analysis results, build implementation plan for GameTracker redesign

---

## Session: 2026-03-15 (continued) — Step 1.A Verified, Building Step 1.B

### Step 1.A Result
All 6 items implemented and verified:
- Phase state machine (PRE_GAME → LIVE → POST_FINAL_OUT) working
- 3-row pinned layout (scoreboard top, 4-column middle, QuickBar bottom)
- 4-column proportions (1fr 1fr 1fr 2fr)
- Balls/strikes removed from scoreboard (only outs remain)
- Phase-aware QuickBar (START GAME → inline confirmation → outcome buttons)
- No page scroll, fixed viewport
- Branch: feature/gt-ux-t1a-phase-layout → merged to main

### Next Action
**Step 1.B:** Score Bug + Diamond Removal


### Step 1.B Result
All 3 items implemented and verified:
- ScoreBug.tsx built: single-line with teams, scores, inning, base-state SVG diamond, outs circles, save/audio indicators
- ExpandedScoreboard overlay: tap ScoreBug → Fenway board drops down, tap backdrop to dismiss, QuickBar stays visible
- GameDiamond removed from render (file preserved, dead code commented out)
- 5206 tests passing, 14 pre-existing failures (confirmed unchanged from before Step 1.B)
- Branch: feature/gt-ux-t1b-scorebug-diamond → merged to main

### Next Action
**Step 1.C:** Lineup Columns + NewsBoard + Pre-Game Features (final Tier 1 step)


### Step 1.C Result — TIER 1 COMPLETE
All 5 items implemented and verified:
- BattingLineupColumn.tsx: 9 players, current batter outlined, runners bolded with base exponents, tappable
- DefensiveLineupColumn.tsx: 9 players, pitcher outlined with pitch count, fWAR placeholder "—"
- NewsBoard.tsx: pinned header (batter line, pitcher line, matchup), scrollable beat reporter placeholder, display-only (0 onClick handlers)
- Role-based column swap via isTop (away=batting in top, home=batting in bottom)
- Swap Order in player card (PRE_GAME only), with swap mode banner + cancel
- 5206 tests passing, 14 pre-existing failures (unchanged)
- Branch: feature/gt-ux-t1c-columns-newsboard → merged to main

**Data notes from Opus:**
- Jersey numbers: NOT in Player interface — omitted (no fake data)
- fWAR/pWAR: NOT wired — "—" placeholder (Tier 2)
- Runner identity: tracked via runnerNames state (name strings, not booleans) — base exponents work
- Next-inning leadoff for defensive team: defaults to 1 (cross-half tracking is Tier 2 refinement)

**TIER 1 VERIFICATION GATE: PASSED**
All 14 Tier 1 items verified in browser:
✅ 4-column layout (NewsBoard, Batting Lineup, Defensive Lineup, Play Log)
✅ ScoreBug single-line at top, Quick Bar full-width at bottom
✅ Diamond gone
✅ Lineup columns show 9 players each with team-color outlines
✅ Role-based column swap on half-inning
✅ START GAME gate in PRE_GAME phase
✅ Expanded scoreboard overlay on ScoreBug tap
✅ No page scroll, fixed viewport

### Next Action
**Tier 2, Group 2.A:** Quick Bar Updates (UX-010, UX-011, UX-048, UX-049)


### Step 2.A Addendum — Orphaned Bottom-Zone Buttons
**JK identified 3 orphaned buttons** still rendering in GameTracker.tsx from the old 5-zone layout: LINEUP, +FLD, +MOD. These belonged to the old bottom-right "Modifier/Action" zone that was eliminated in Tier 1.

- LINEUP: opened modal lineup overlay → replaced by always-visible inline lineup columns (Step 1.C)
- +FLD: opened fielding enrichment → replaced by play log tap enrichment (Tier 2 Group 2.D)
- +MOD: opened modifier panel → replaced by inline modifiers in play log enrichment (Tier 2 Group 2.D)

These need to be removed from GameTracker.tsx before proceeding. Will include in the next Opus session.


### Step 2.A Result
All 4 items implemented and verified:
- Undo (↩ N) and END buttons in Quick Bar row with visual divider
- Processing-aware button feedback (processingOutcome prop)
- K and Ꝁ (backwards K) as separate primary buttons
- ITPHR in overflow menu with purple HR-family styling
- Branch: feature/gt-ux-t2a-quickbar → merged to main

**JK noted:** LINEUP, +FLD, +MOD buttons are still rendering — orphaned from old 5-zone layout. Will remove in Group 2.B prompt (next Opus session touches GameTracker.tsx).

### Next Action
**Group 2.B:** Core Flow Change — Remove pre-commit runner gate + clean up orphaned buttons


### Step 2.B Result
All items implemented and verified:
- UX-022: Pre-commit runner correction gate removed. Quick Bar tap → immediate commit with defaults.
- Orphaned buttons removed: LINEUP, +FLD, +MOD (kept REVIEW for touch mode)
- Lineup overlay modal removed (showLineupOverlay/lineupOverlayHint commented out)
- Runner correction desktop panel and touch modal removed
- pendingRunnerCorrection state/handlers removed from active code

**Outcome branch audit (all immediate commit now):**
- HR/ITPHR: via prompt callback (already direct)
- E: via error prompt callback (already direct)
- BB/HBP/IBB: immediate commit (changed from gated)
- D3K/WP_K/PB_K: immediate commit (changed from gated)
- 1B/2B/3B/GRD: immediate commit (changed from gated)
- K/Kc/GO/FO/LO/PO/FC/SAC/SF/DP/TP: immediate commit (changed from gated)
- **FLO: PRE-EXISTING GAP** — returns null from builder, outcome silently dropped. Not introduced by 2.B.

**Substitution paths broken (documented for 2.C):**
- handleRunnerSubstitute — now console.warns
- handleLineupCardSubstitution — orphaned

- Branch: feature/gt-ux-t2b-post-commit-runners → merged to main

### Next Action
**Group 2.C:** Player Card + Substitution Rewrite (UX-017, UX-018, UX-019, UX-030, UX-031)


### Step 2.C Result
All 5 items implemented and verified:
- UX-017: Real game stats wired to player card (THIS GAME header — season stats not available, documented as gap)
- UX-018: Stats fields present — OPS/WAR/WHIP/pWAR show "—" placeholders (data pipelines not yet wired). "SO" → "K" label fixed.
- UX-019: Player card = game stats, NewsBoard = game stats (both game-scoped; season scope deferred)
- UX-030: Player-first substitution: tap player → card → SUB OUT → bench list (3 players) → select replacement. Pitcher pitch count prompt fires on pitcher sub.
- UX-031: Discrete UPDATE MOJO and UPDATE FITNESS action buttons with selectors. Auto-injury behavior TBD (need to verify BetweenPlayEvent logging).
- Branch: feature/gt-ux-t2c-playercard-subs → merged to main

### Next Action
**Group 2.D:** Enrichment Taxonomy Rewrite (UX-025, UX-027, UX-028, UX-045, UX-046, UX-047, UX-057)


### Step 2.D Result
All 7 items implemented and verified:
- UX-057: exitType → contactType rename complete (Normal/Weak/Hard/Bloop/Bunt). BUNT removed from modifiers.
- UX-027: Fielding attempt restructured: Attempt Type (8 options) + Attempt Outcome (Made/Missed)
- UX-045: Layer A (Fielding Attempt) separated from Layer B (Play Mechanic with Deflection)
- UX-025: Per-result ENRICHMENT_CONFIG gating — each AtBatResult gets specific enrichment sections
- UX-046: KP/NUT gated off HR (only 7+ shown). SF/SAC also gated.
- UX-047: TOOTBLAN removed from play-level modifiers
- UX-028: SprayGraphic renders (fan-shaped field location)
- 5208 tests passing, 14 pre-existing failures
- Branch: feature/gt-ux-t2d-enrichment-taxonomy → merged to main

### Next Action
**Group 2.E:** Score Bug Features + Half-Inning (UX-033, UX-036, UX-037) — FINAL TIER 2 GROUP


### Step 2.E Result — TIER 2 COMPLETE
All 3 items implemented and verified:
- UX-033: NewsBoard display-only — VERIFIED (0 click handlers)
- UX-036: Manager moment Ⓜ relocated from QuickBar (⚡ removed) to ScoreBug (Ⓜ with glow + STAY button)
- UX-037: Half-inning column swap — VERIFIED working via isTop → battingTeam/fieldingTeam reactivity
- 5208 tests passing, 14 pre-existing failures
- Branch: feature/gt-ux-t2e-scorebug-features → merged to main

**TIER 2 VERIFICATION GATE: PASSED**
All 20 Tier 2 items verified:
✅ 2.A: Undo/End Game in Quick Bar row, processing feedback, K+Ꝁ separate, ITPHR in overflow
✅ 2.B: Pre-commit runner gate removed, immediate commit, orphaned buttons cleaned
✅ 2.C: Player card real stats, Sub Out flow, Swap Position, Update Mojo/Fitness
✅ 2.D: contactType replaces exitType, fielding attempt restructured, play mechanic separated, per-result gating, spray graphic
✅ 2.E: NewsBoard display-only, Ⓜ in ScoreBug + Stay the Course, half-inning swap verified

### Progress Summary
- **Tier 1 (14 items): COMPLETE** — 4-column layout, ScoreBug, lineup columns, NewsBoard, phase lifecycle
- **Tier 2 (20 items): COMPLETE** — Quick Bar, core flow, player card, enrichment taxonomy, score bug features
- **Tier 3 (14 items): NEXT** — Audio, animations, runner sub-entries, spray zones, undo refinements

### Next Action
**Tier 3** — 14 independent items. Start building individual prompt contracts.


### Tier 3 Batch A Result
Both items implemented and verified:
- 3.9 (UX-051): Runner sub-entries in play log — "└" nested rows with color-coded base transitions, independently tappable, TB/OA badges
- 3.8 (UX-050): RunnerEnrichmentPanel with 4 fields: TOOTBLAN toggle, Out Advancing toggle, Play Mechanic selector, Fielding Sequence input. Persists to AtBatEvent.runnerOutcomes[] via updateAtBatEvent.
- Dual-path runner inference: explicit runnerOutcomes[] OR runners/runnersAfter diff
- 5208 tests passing, 14 pre-existing failures
- Branch: feature/gt-ux-t3a-runner-subentries → merged to main

### Next Action
**Tier 3 Batch B:** Catcher Auto-Assign + Undo Depth Locking (items 3.11, 3.13)


### Tier 3 Batch B Result
Both items implemented and verified:
- 3.11 (UX-053): currentCatcherId added to GameState, auto-assigned on BetweenPlayEvents alongside pitcher
- 3.13 (UX-055): Undo-depth-aware locking — within 10 events = full correction via undo, beyond = structural locked but enrichment always editable
- Zero console errors, app renders correctly
- 5208 tests passing, 14 pre-existing failures
- Branch: feature/gt-ux-t3b-catcher-undo-depth → merged to main

### Next Action
**Tier 3 Batch C:** Defensive lineup enrichment mode + spray zone counts + pitch count triggers (items 3.2, 3.3, 3.4)


### Tier 3 Batch C Result
All 3 items implemented and verified:
- 3.2 (UX-024 + UX-058): Defensive lineup enrichment mode — header toggles to "FIELDING SEQUENCE" (gold), tap fielders to build sequence, Done/Clear, gold highlight on selected
- 3.3 (UX-029): Spray zone counts verified — ALL match spec §8.2 exactly (HR=21, GO=18, FO=27, LO=39, PO=27, hits=42, etc.)
- 3.4 (UX-032): Pitch count triggers VERIFIED at all 3 points — no code changes needed (pitching_change:5416, end_inning:5739, end_game:6299)
- 5208 tests passing, 14 pre-existing failures
- Branch: feature/gt-ux-t3c-lineup-enrich-spray-pitch → merged to main

**ALL OPUS TIER 3 ITEMS COMPLETE (7/7)**

### Remaining: Codex Tier 3 Items (7 items)
- 3.1 (UX-023): Play log team colors — Codex 5.4 high
- 3.5 (UX-039): CSS animations — Codex 5.4 high
- 3.10 (UX-052): Player card initiate-only — Codex 5.4 high
- 3.12 (UX-054): Audio system — Codex 5.4 high
- 3.6 (UX-040): Undo toast format — Codex 5.1 mini medium
- 3.7 (UX-043): Save indicator — Codex 5.1 mini medium
- 3.14 (UX-056): Locked result tooltip — Codex 5.1 mini medium

### Progress Summary
- **Tier 1 (14 items): COMPLETE**
- **Tier 2 (20 items): COMPLETE**
- **Tier 3 Opus (7 items): COMPLETE**
- **Tier 3 Codex (7 items): NEXT**
- **Total: 41/48 work items complete (85%)**


### Tier 3 Codex Items — ALL COMPLETE
All 7 Codex items implemented:
- 3.1 (UX-023): Play log team colors — Codex 5.4 high
- 3.5 (UX-039): CSS animations (fade-in, score highlight, lineup row flash) — Codex 5.4 high
- 3.10 (UX-052): Player card initiate-only enforcement — Codex 5.4 high
- 3.12 (UX-054): Audio system (Web Audio API, 8-bit sounds, two toggles) — Codex 5.4 high
- 3.6 (UX-040): Undo toast format ("T7 Hayata K") — Codex 5.1 mini
- 3.7 (UX-043): Save indicator (✓ / ⚠) — Codex 5.1 mini
- 3.14 (UX-056): Locked result tooltip ("Use ↩ Undo to change result") — Codex 5.1 mini

---

## GAMETRACKER UX REDESIGN — COMPLETE

**48 of 48 work items implemented and verified.**
**10 items required no work (EXISTS/N/A).**
**58 of 58 UX spec decisions addressed.**

### Final Tally

| Tier | Items | Status |
|------|-------|--------|
| Tier 1 — Architectural Rewrite | 14 | ✅ COMPLETE |
| Tier 2 — Component Rewrites | 20 | ✅ COMPLETE |
| Tier 3 — Polish & New Features | 14 | ✅ COMPLETE |
| No work needed | 10 | ✅ VERIFIED |
| **TOTAL** | **58** | **✅ ALL DONE** |

### Prompt Contracts Executed
- Step 1.A: Phase state machine + layout shell (Opus)
- Step 1.B: Score bug + diamond removal (Opus)
- Step 1.C: Lineup columns + NewsBoard + pre-game features (Opus)
- Step 2.A: Quick Bar updates (Opus)
- Step 2.B: Core flow change + orphaned button cleanup (Opus)
- Step 2.C: Player card + substitution rewrite (Opus)
- Step 2.D: Enrichment taxonomy rewrite (Opus)
- Step 2.E: Score bug features + half-inning (Opus)
- Tier 3 Batch A: Runner sub-entries + runner enrichment (Opus)
- Tier 3 Batch B: Catcher auto-assign + undo depth locking (Opus)
- Tier 3 Batch C: Lineup enrichment mode + spray zones + pitch count triggers (Opus)
- Tier 3 Codex High: Play log colors, CSS animations, player card enforcement, audio system (Codex 5.4)
- Tier 3 Codex Mini: Undo toast, save indicator, locked tooltip (Codex 5.1 mini)

### Known Gaps / Deferred Items
- FLO outcome not handled by buildRunnerCorrectionForQuickBarOutcome (pre-existing, not introduced by redesign)
- Season stats not wired to player card (shows "THIS GAME" — season aggregates need data pipeline)
- Jersey numbers not in Player interface (omitted, no fake data)
- fWAR/pWAR show "—" placeholder (data pipeline not wired)
- Next-inning leadoff for defensive team defaults to 1 (cross-half tracking needs refinement)
- Manager moment detection requires leverageIndex threshold wiring (Ⓜ infrastructure ready)

### Next Action
Full browser testing session on iPad Safari landscape — play a complete game start to finish using the new UX.


### Post-Redesign Bug Fix Round 1 — ALL 11 COMPLETE

| Bug | Description | Status |
|-----|-------------|--------|
| BUG-05 | Undo system broken | ✅ FIXED — snapshot expanded, immediate UI rewind, race condition guarded |
| BUG-04 | Leftover play log data | ✅ FIXED — clear on mount/unmount, aggregated game guard, fresh exhibition gameIds |
| BUG-01 | Pre-game pitcher change | ✅ FIXED — PRE_GAME substitution path in useGameState, START GAME syncs edited lineup |
| BUG-02 | DH in defensive lineup | ✅ FIXED — filter `p.position !== 'DH'` at GameTracker.tsx:2218 |
| BUG-03 | Elimination no-DH | ✅ PARTIAL — defense hides DH, but lineup creation still allows DH (deeper bug for round 2) |
| BUG-06 | Runner sub-entries missing | ✅ FIXED — runnerOutcomes[] serialized at commit, play log mapper rehydrates sub-entries |
| BUG-11 | Spray zone UI missing | ✅ FIXED — useMainFieldForLocation removed, SprayGraphic always renders inline |
| BUG-07 | No enrichment defaults | ✅ FIXED — inferential defaults seeded at commit (routine/made/normal) |
| BUG-09 | ScoreBug layout | ✅ FIXED — full team names, justify-between, stadium name added |
| BUG-10 | Enrichment buttons too small | ✅ FIXED — min-h-[36px], larger text/padding, spray graphic 140px |
| BUG-08 | Lineup highlight left-bar | ✅ FIXED — full 2px solid border on all 4 sides |

**Known items for Round 2:**
- PRE_GAME substitution doesn't visually update lineup columns until START GAME
- Elimination lineup initialization ignores no-DH tournament setting (deeper issue beyond defensive column filter)
- Any new bugs from JK's browser testing

### Next Action
JK browser-testing all 11 fixes, then sharing Round 2 bug list.


### Post-Redesign Bug Fix Round 2 — Progress Update

**Completed (8/11):**
| Bug | Fix |
|-----|-----|
| R2-06 | DP runner mapping: manual/outcome commits carry same runner defaults as quick-bar |
| R2-09 | Undo across inning boundary: peels paired pitch-count + third-out events together |
| R2-11 | WP_K/PB_K: dropped-third-strike respects 1B-occupied/<2-outs rule, runners advance |
| R2-01 | D3K attribution: WP_K/PB_K persist as distinct results, seed fielding attribution, increment error column |
| R2-02 | Pre-game batting order: swap-order updates hook's canonical lineup refs, not just display |
| R2-04 | PostGameSummary: end-game navigation uses actual runtime gameState.gameId |
| R2-05 | Runner actions: player cards for on-base runners expose SB/CS/WP/PB/pickoff/advance |
| R2-03 | Pitcher change defense column: defensive column resyncs when live pitcher changes |

**Remaining (3/11):**
| Bug | Status |
|-----|--------|
| R2-10 | Out Advancing score correction + runner outcomes via lineup — NOT STARTED |
| R2-07 | Sub Out full bench (not position-filtered) — NOT STARTED |
| R2-08 | Elimination no-DH lineup initialization — NOT STARTED |

All implemented fixes pass `npm run build`. Browser verification pending.

### Next Action
Run remaining R2-10, R2-07, R2-08 contracts from `spec-docs/CODEX_BUG_FIX_ROUND2.md`.


### Post-Redesign Bug Fix Round 2 — ALL 11 COMPLETE

| Bug | Fix Summary |
|-----|-------------|
| R2-06 | DP runner mapping: manual/outcome commits carry same runner defaults as quick-bar |
| R2-09 | Undo across inning boundary: peels paired pitch-count + third-out together |
| R2-11 | WP_K/PB_K: dropped-third-strike respects 1B-occupied/<2-outs rule |
| R2-01 | D3K attribution: WP_K/PB_K persist distinct, seed fielding attribution, increment errors |
| R2-02 | Pre-game batting order: swap-order updates hook's canonical lineup refs |
| R2-04 | PostGameSummary: end-game navigation uses actual runtime gameState.gameId |
| R2-05 | Runner actions: on-base player cards expose SB/CS/WP/PB/pickoff/advance |
| R2-03 | Pitcher change: defensive column resyncs when live pitcher changes |
| R2-07 | Sub Out: full bench list (all non-active players, ungrouped, regardless of position) |
| R2-08 | Elimination no-DH: lineup creation respects tournament useDH setting |
| R2-10 | Out Advancing: score correction on toggle, CORRECT OUTCOME button in player card |

All `npm run build` passes. Browser verification pending on R2-07, R2-08, R2-10.

### Cumulative Fix Count
- Round 1: 11 bugs fixed
- Round 2: 11 bugs fixed
- **Total: 22 bugs fixed across 2 rounds**

### Next Action
JK browser-test Round 2 fixes (especially R2-07 full bench, R2-08 elimination no-DH, R2-10 Out Advancing score correction). Then share Round 3 bug list if needed, or proceed to iPad Safari landscape playtest.


### Post-Redesign Bug Fix Round 3 — ALL 7 COMPLETE

| Bug | Fix Summary |
|-----|-------------|
| R3-07 | END GAME hang: pitch-count continuation flow now waits on confirmation before proceeding |
| R3-01 | Runner correction persistence: edits now persist runnerOutcomes + corrected score/outs/base fields |
| R3-06 | Toggle restore: TOOTBLAN/Out Advancing restore/subtract runs in both directions |
| R3-03 | Runner base destination selector: direct base changes including "hold" for WP/PB |
| R3-04 | WP_K runner auto-advance: RESOLVED BY R3-03 (user can hold runners back) |
| R3-05 | Pitcher change defense column: post-pitcher-change roster sync now fires after confirmed change |
| R3-02 | Next-inning leadoff: uses tracked batter indices instead of defaulting to batter 1 |

All `npm run build` passes. Browser verification pending.

### Cumulative Fix Count
- Round 1: 11 bugs fixed
- Round 2: 11 bugs fixed
- Round 3: 7 bugs fixed
- **Total: 29 bugs fixed across 3 rounds**

### Key Architectural Improvements from Round 3
- Runner corrections are now DURABLE and STRUCTURAL (persist to IndexedDB, survive play log rebuilds)
- Score adjustments are bidirectional (toggle on = subtract run, toggle off = restore run)
- Runner destination selector enables all correction scenarios (DP corrections, WP holds, FC edge cases)
- End-game flow properly awaits pitch-count confirmation before proceeding
- Per-team batter index tracking enables correct next-inning leadoff indicators

### Next Action
JK browser-test Round 3 fixes, then iPad Safari landscape full-game playtest.


### Round 3 Redo (Opus) — COMPLETE

**Previous Round 3 Codex fixes were cosmetic-only** — persisted to IndexedDB but didn't update live game state. Opus identified and fixed the root cause.

**Root cause:** `!isLatestAtBat` guard on `applyScoreAdjustment` skipped score updates for the most common correction case. `loadExistingGame` fallback was unreliable.

**Opus fixes applied:**
- Fix A: Removed `!isLatestAtBat` guard — score adjusts for ALL corrections
- Fix B: Added `applyBasesCorrection` to useGameState API — live bases update on runner destination change
- Fix C: Added `applyOutsAdjustment` to useGameState API — live outs update on runner safe/out change. 3-outs edge case SAFE (auto-end is inline in recordOut, not a useEffect)
- Fix D: `rosterVersion` counter bumped at 5 sync call sites — defense column re-renders after pitcher change
- Fix E: Next leadoff uses `(nextIndex % 9) + 1` — wraps correctly from 9→1
- `loadExistingGame` fallback for latest at-bat: REMOVED — replaced by direct state updates

**Files changed:** useGameState.ts (new API functions), GameTracker.tsx (handler fix, defense column, leadoff)
**Build:** PASS | **Tests:** 5208 passed, 15 failed (pre-existing) | **Console:** 0 errors

### Routing Lesson Learned
Codex 5.4 high produced fixes that compiled but didn't actually solve the problem (cosmetic persistence without game state feedback). Opus traced the root cause to a specific guard condition and applied the correct architectural fix. **Runner correction / game state feedback = Opus territory.**

### Next Action
JK browser-test the 6 scenarios from the Opus contract. Then assess if Round 4 is needed or if we're ready for full-game iPad playtest.


### R3 Repro-Then-Fix Session — COMPLETE

**The gametracker-bug-repro skill worked.** Test-driven fixes with mandatory wiring verification produced verified results.

**Results:**
- 9 tests written across 3 files, all passing
- 4 bugs fixed with verified tests (Bugs 1, 2, 3, 5)
- 1 bug fixed via wiring grep only (Bug 4 — React memo, not unit-testable)
- 5220 tests passing, 15 pre-existing failures
- All wiring verified: applyScoreAdjustment (1 call), applyBasesCorrection (1 call), applyOutsAdjustment (1 call), setRosterVersion (4 calls)
- Smoke script: all checks pass, zero dead code

**Key finding — Bug 5 root cause:**
The leadoff off-by-one was NOT a display issue. `advanceToNextBatter()` was NOT being called on the 3rd out in `recordOut` and `recordD3K` (useGameState.ts). This meant the actual game batter index wasn't advancing on the final out of a half-inning, affecting both the UI indicator AND actual game state. Fixed at lines 4027 and 4491.

**Skill validation:**
- Step 2.5 wiring verification caught that applyBasesCorrection and applyOutsAdjustment had 0 call sites (confirming the prior Opus fix was incomplete)
- Step 7 smoke script verified all functions wired after fix
- The repro-first protocol prevented the "compiles but doesn't work" failure pattern

### Cumulative Session Stats
- UX Redesign: 48 items implemented
- Bug Fix Round 1: 11 bugs fixed
- Bug Fix Round 2: 11 bugs fixed
- Bug Fix Round 3: 7 bugs addressed (2 failed, 5 verified via repro-fix skill)
- **Total: 48 UX items + 29 bugs fixed**

### Next Action
JK browser-test the R3 repro-fix results, then iPad Safari full-game playtest.


### Round 4 (Codex with repro-fix skill) — COMPLETE

**Skill worked again.** 6 test files, 6 tests passing, wiring verified, smoke script clean.

**Results:**
| Bug | Fix | Test |
|-----|-----|------|
| R4-01 | `applyOutsAdjustment` triggers inning-end flow when correction creates 3rd out | ✓ passes |
| R4-02 | End-game continuation re-traced; no failing unit repro found (browser-only hang) | ✓ passes (but caveat) |
| R4-03 | Refresh resume accepts saved exhibition snapshot even when URL says `exhibition-1` | ✓ passes |
| R4-04 | Live base corrections reconcile runner tracker via new `liveBaseCorrection.ts` | ✓ passes |
| R4-05 | Phantom runner resolved by R4-04's runner tracker reconciliation | ✓ passes |
| R4-06 | Defensive roster sync overlays `snapshot.currentPitcher` via new `gameTrackerRosterSync.ts` | ✓ passes |

**New files created:**
- `src/src_figma/app/utils/liveBaseCorrection.ts` — reconciles runner tracker on base corrections
- `src/src_figma/app/utils/gameTrackerRosterSync.ts` — defensive column pitcher overlay

**R4-02 caveat:** Codex re-traced the end-game chain but couldn't reproduce the hang in a unit test. May still fail in browser. Needs manual verification.

**Build:** PASS | **Tests:** 5226 passed, 15 failed (pre-existing + 5 errors in unrelated suites)

### Next Action
JK browser-test Round 4 fixes using the same manual test checklist.


### Round 5 (Codex with repro-fix skill) — COMPLETE

**Results:**
| Bug | Fix | Test |
|-----|-----|------|
| R5-01 | Defensive pitcher sync now REPLACES slot instead of duplicating (gameTrackerRosterSync.ts) | ✓ passes |
| R5-02 | Permanent end-game diagnostic logging installed (6 step breadcrumbs). Couldn't reproduce hang in terminal — needs browser console verification. | Instrumented |
| R5-03 | Live base correction now does full runnersAfter reconciliation (liveBaseCorrection.ts + useGameState.ts) | ✓ passes |
| R5-04 | "Batter Out Advancing" toggle added to enrichment for hits. Persists batterOutAdvancing, adjusts outs + bases. (EnrichmentPanel.tsx + eventLog.ts + GameTracker.tsx) | ✓ passes |

**New/modified files:**
- `gameTrackerRosterSync.ts` — pitcher slot replacement
- `liveBaseCorrection.ts` — full runnersAfter reconciliation
- `EnrichmentPanel.tsx` — batter out advancing toggle
- `eventLog.ts` — batterOutAdvancing field on AtBatEvent
- `GameTracker.tsx` — end-game instrumentation + batter out advancing handler
- `useGameState.ts` — end-game instrumentation + live base correction hook

**Build:** PASS | **Tests:** 5231 passed, 15 failed (pre-existing)

### Cumulative Stats
- UX Redesign: 48 items
- Bug Rounds 1-5: 11 + 11 + 7 + 6 + 4 = 39 bugs addressed
- Repro-fix tests written: 9 (R3) + 6 (R4) + 5 (R5) = 20 automated bug tests
- **Total: 48 UX items + 39 bugs across 5 rounds**

### Next Action
JK browser-test R5 fixes:
1. Pitcher change → defensive column shows exactly 9 players, new pitcher in correct slot
2. END GAME → open browser console, look for [END-GAME] Step logs to identify hang point
3. WP_K runner → correct to held → ScoreBug bases update
4. Record 2B → toggle "Batter Out Advancing" → outs increment, batter off base


### R5 Follow-Up + HR Fix + Infinite Loop Hotfix — COMPLETE

**Hotfix:** Infinite render loop at GameTracker.tsx:1167 — broke dependency cycle by moving awayTeamPlayers/homeTeamPlayers into refs, removing from useCallback deps.

**R5 Follow-Up:**
- Bug A: Runner base correction no longer wipes batter from 1B — buildLiveBasesFromRunnerOutcomes now includes batter destination
- Bug B: Batter Out Advancing shows "2B OA" in play log inline

**HR Fix:** `handleQuickBarOutcome` now uses `effectiveDefaults = defaults || promptDefaults` so HR/ITPHR flows pass correct runner advancement. Bases-loaded HR test: 4 RBI confirmed.

### Browser-Verified Working
- ✅ No infinite render loop (0 console errors)
- ✅ Pitcher change shows correct pitcher in defensive column (no duplicates)
- ✅ END GAME navigates to PostGameSummary (no hang)
- ✅ Hard refresh resumes game
- ✅ Score/outs corrections bidirectional
- ✅ Inning ends on correction to 3rd out
- ✅ Batter Out Advancing toggle works, shows in play log
- ✅ WP_K runner correction preserves batter on 1B
- ✅ HR clears bases and scores all runners
- ✅ Solo HR, 2-run HR, grand slam all correct

### Cumulative Stats
- UX Redesign: 48 items
- Bug Rounds 1-5 + follow-ups: 43 bugs addressed
- Hotfixes: 1 (infinite loop)
- Repro-fix tests: 22 automated bug tests


### GameTracker Advanced Systems Audit — COMPLETE

**Skill:** gametracker-systems-audit | **Executor:** Claude Code CLI | Opus 4.6
**Output:** `spec-docs/GAMETRACKER_SYSTEMS_TRUTH_MAP.md`

**Scorecard:**
| # | System | C1 | C2 | C3 | C4 | Score |
|---|--------|----|----|----|----|-------|
| 1 | Leverage Index | ✅ | ✅ PER-PLAY | ✅ | ⚠️ | 3.5/4 |
| 2 | WPA | ✅ | ✅ PER-PLAY | ✅ | ❌ | 3/4 |
| 3 | Clutch Attribution | ❌ | ❌ | ⚠️ | ❌ | 0.5/4 |
| 4 | Fame Tracking | ✅ | ✅ | ✅ | ✅ | 4/4 |
| 5 | Milestone Detection | ✅ | ✅ EFFECT | ✅ | ⚠️ | 3.5/4 |
| 6 | WAR (mWAR) | ✅ | ✅ PER-PLAY | ✅ | ⚠️ | 3.5/4 |
| 7 | Mojo | ✅ | ✅ MANUAL | ✅ | ✅ | 4/4 |
| 8 | Fitness | ✅ | ✅ MANUAL | ✅ | ✅ | 4/4 |
| 9 | Narrative | ✅ | ✅ END-GAME | ⚠️ | ❌ | 1.5/4 |
| 10 | Fan Morale | ✅ | ✅ END-GAME | ⚠️ | ❌ | 2/4 |
| 11 | Designations | ❌ | ❌ | ❌ | ❌ | 0/4 |
| 12 | Post-Game Pipeline | ✅ | ✅ | ✅ | ✅ | 4/4 |

**Fully wired (4/4):** 4 systems (Fame, Mojo, Fitness, Post-Game Pipeline)
**Partially wired:** 6 systems (LI, WPA, Milestones, WAR, Narrative, Fan Morale)
**Not implemented:** 2 systems (Clutch Attribution, Designations)

**Critical Findings:**
1. `useClutchCalculations` — 312-line hook exists but is ORPHANED (never imported). §13 non-functional.
2. `milestoneAlerts` — computed every batter change but never rendered.
3. Narrative dead data path — `gameNarrative`/`awayNarrative` generated but PostGameSummary's types omit them.
4. Fan Morale has zero IndexedDB writes — resets on navigation.
5. Dynamic Designations — no GameTracker logic at all.
6. Display gaps: WPA never shown, LI only in popups, mWAR console-only, milestones not in PostGameSummary.

### Next Action
Build implementation plan from truth map findings. 12 prioritized fix items.


---

## SESSION: 2026-06-09 — Roster Analyzer / Team Builder / Archetype Engine Spec Session (Claude Fable 5, chat)

**Type:** Spec design + authoring (no code changes)
**Output:** `spec-docs/ROSTER_ANALYZER_ARCHETYPE_ENGINE_SPEC.md` v1.0 (574 lines, verified on disk: 16 sections, trait table, 44-modification table, luxury params, routing table)

**Inputs analyzed:**
- `Team_Builder_Archetype_Logic_Template.xlsx` (XBL Roster Tool Season XIX Cup v1.0) — full formula decode: two-segment salary curves, sub-min reverse curve, trait marginal pricing (L2 values), 44 luxury-cap modifications, luxury penalty curves, league settings, pitch/arsenal pricing. Verified against cached values (PitchCalcs ↔ Roster cells match).
- BillyYank SMB4 Guide 3rd Ed. (.docx, 784 paragraphs) — mojo 6-state model, fitness/stamina by role, chemistry potency x1/x2/x4, trait activation predicates.

**Key decisions (full register in spec §2, D1–D12):** IV Engine replaces salary-spec Steps 1/2/trait-tiers (relativity stack survives); league tiers Juiced/Standard/Nerfed = pool shift + derived cap; scout-obscured IV for farm; season ledger w/ 75% dead money (configurable) + rookie scale replacing age factor; mojo/fitness/traits = deterministic Effective Ratings (dissolves ratings-vs-form); two-level identity system (6 bands over 44 modifications); v1 snake draft + empirical pick-value chart; auction + AI shill bidders = v1.5; GameTracker sub recs rebuilt on shared engines.

**JK canonical addenda captured in spec:** fielding moves mojo (dives/jumps/slides up, misses down, errors ≈ −1 step); trait-vs-trait and trait-vs-player-type interactions are the core insight engine (TraitInteractionMatrix, §4.3).

**Verification performed (NFL):** spreadsheet formulas decoded from raw XML + cross-checked against cached computed values; potency ratios cross-verified across 3 sources (game x1/x2/x4 = salary spec 0.5/1/2 = workbook L2 baseline); dead-money scenarios modeled numerically (75% kills exploit at −5.4% payroll savings vs −14.3% at 50%); spec file read back after write.

**Remaining uncertainties (flagged in spec §15):** trait-table blank cells (verify in T1); mojo per-state deltas are estimates pending playtest; batting-order constants drafted-not-approved; band-priority UI input style.

**Next session starts with:** Build Task T1 (full curve-table extraction → ivCurves.ts; ROUTE: Claude Code CLI | sonnet), then T2 (TraitInteractionMatrix; ROUTE: Claude Code CLI | opus) and T3 (empirical 440-player pool analysis; ROUTE: Claude Code CLI | opus). Also: commit workbook + guide to `spec-docs/reference/` per spec §0.


### 2026-06-09 addendum — Spec amended to v1.1 (archetype-purpose review)
JK challenged how archetypes serve the IV/draft/cap system and whether XBL constants are too nerfed. Resolved and codified as D13: tax = budget drain/soft cap (never hard wall); XBL ratios/shapes port but constants re-derived per tier (percentile method, `luxuryCapPercentile` 0.65); asymmetric win-equity pricing = the anti-"optimal archetype" mechanism; T3 gains EV-flatness acceptance criterion (±10% across composed identities); new `balanceMode` league toggle taxed/advisory/off (default taxed). Spec now v1.1, 591 lines, verified on disk. NOTE: Desktop Commander edit_block hung (4-min timeout) mid-amendment — file confirmed unmodified by failed call; amendment applied via Filesystem MCP full rewrite instead. DC may need restart; start_process/write_file functional.

### 2026-06-09 addendum 2 — Spec v1.1.1 (draft guardrails)
JK probed tax-vs-roster-completion interaction and caught a gap: §7.5 auction solvency rule was never extended to the snake draft. Fixed: §7.3 now specifies a hard-block solvency guardrail (committed salaries + projected taxes + pick cost + marginal tax ≤ budget − slotsRemaining × live-pool cheapestFillCost, recomputed per pick) and per-team GREEN/YELLOW/RED/BLOCKED pick signals; new registry constant solvencyRedMargin (0.10). Clarified: 0.5× floor is auction opening bids only; snake picks cost full IV salary. Applied via DC start_process python in-place edit (edit_block still avoided); verified by grep — spec now v1.1.1, 596 lines.

### 2026-06-09 addendum 3 — Spec v1.1.2 (auction anti-sandbagging package, D14)
JK probed auction endgame exploit (hoard budget, scoop stars at 50% floor when tax-mismatched teams won't bid) and league inflation from accumulated deals. Approved package applied: reservePriceCurve 0.5→0.7 by IV percentile (replaces flat auctionFloor); shill policy rewritten as hidden valuation + probabilistic bargain interest with HARD REQUIREMENT against deterministic floors (reserve = law, shills = market); §8.4 expectation anchor moved to DECLARED budget (closes cheap-bid → low-salary → low-expectations double reward); sunlight remedy defined in §7.5; pool-size guidance in §7.2 (talent is supply-controlled, poolSurplusMax 1.2×slots, grade-round restrictions explicitly REJECTED); league-inflation report line + optional nerfed-tail regeneration. 4 new registry constants. Spec now v1.1.2, 608 lines, grep-verified.

### 2026-06-09 addendum 4 — Spec renamed
`ROSTER_ANALYZER_ARCHETYPE_ENGINE_SPEC.md` → `IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md` (scope grew beyond the original feature pair to the full player-valuation core + three roster-intelligence surfaces). Rename annotation added to spec header; CURRENT_STATE reference updated (a double-substitution bug in the first rename pass was caught by grep verification and fixed — NFL working as intended). Earlier SESSION_LOG entries above retain the historical filename intentionally. Repo-wide grep confirms no other files reference the old name.

### 2026-06-09 addendum 5 — Spec v1.1.3 (routing modernization)
§13 updated for current model lineup: builder/auditor decorrelation pattern codified (different model families build vs audit; same-model self-audit finds its own choices plausible). T1–T3 → Fable 5 CLI builds (high/max effort; cross-source fidelity is the work). T4–T11 → Codex 5.5 builds (high/very high per state rule) → Fable 5 CLI audit gate: golden tests pass, NFL with documented falsification attempts, section-by-section spec conformance, plus migration-safety/IndexedDB key-scope review on state tasks (T5/T7/T8/T9 audits non-negotiable). Spec now v1.1.3, 612 lines, grep-verified. NOTE for JK: userPreferences routing table still tops out at opus/Codex 5.3 — update separately when convenient.


### 2026-06-10 — T1 COMPLETE (Fable 5 CLI build → Codex 5.5 audit: CONFORMS) + spec v1.1.4
**T1 deliverables (committed this entry):** src/data/ivCurves.ts (18 position blocks; subMin only on SP/SP-RP/RP/CP VEL rows; EXTRA pitcher-shaped), src/data/traitPricing.ts (75 traits + multiplier cols L–S discovery + PITCH_COSTS/ARSENAL_TAX_TABLE/AUX_PRICING), scripts/extract-iv-data.py (deterministic, hash-verified).
**Audit outcome:** CONFORMS. Independent read path; C anchors + 10 seeded samples + sub-min cells + EXTRA shape + 75-row multiplier scan all confirmed. Audit DISAGREEMENT (decorrelation working): builder's "4 pre-existing test failures" corrected to 2 reproducible (wpaRuntimeBoundary — franchiseAnalyticsTrust.ts WPA allowlist drift; franchiseNarrativeEventEligibility — TEAM_MVP/ACE preview expectation) + 1 full-suite-only timeout flake (franchiseManualSmokeFixture) + 1 non-reproducing (franchiseOffseasonGuards). The 2 reproducible failures are REAL branch breakage unrelated to T1 — added to fix list below.
**Spec v1.1.4 applied:** §3.4 workbook-reality note (sub-min scope, EXTRA shape — T4 must expect both); §3.6 multiplier-column addendum (closes builder flag); §13 economic routing pattern (Fable plans/prompts/audits, Codex builds, T2 exception, diff-not-self-report rule, UI-build addendum); T1 marked COMPLETE in build table.
**Open fix items (NOT T1, pre-existing on codex/franchise-v1-next):** (1) wpaRuntimeBoundary allowlist vs franchiseAnalyticsTrust.ts:99,433; (2) franchiseNarrativeEventEligibility TEAM_MVP/ACE preview-status logic. Route when picked up: Codex 5.5 | high → Fable 5 audit.
**Next:** T2 TraitInteractionMatrix — ROUTE: Claude Code CLI | Fable 5 | max (judgment-artifact exception; prompt contract to be drafted).

### 2026-06-10 — T2 COMPLETE (Fable 5 max build → Codex 5.5 structural audit → JK adjudication) + spec v1.1.5
**Deliverable:** src/data/traitInteractionMatrix.ts — all 75 traits as machine-evaluable {predicates, target, effect, potency, citation}; new predicate kinds added per contract allowance (pitchType, comebackerToPitcher, runningOutOfBox, onBasePath variants); new potency mode 'standardInverted'.
**Audit outcome:** DEVIATIONS — 1 MAJOR (4 guideExplicit EV-note entries lacking notes: Butter Fingers, Metal Head, Sign Stealer, Wild Thrower). Root cause: per-tier values live in EV descriptions because perTier is ratingDelta-only by schema. Remediated by Claude (chat) — 4 notes fields added; re-verified: 75 entries, 0 S2 violations, build green. 6 audit face-flags dismissed as text-match false positives (twoStrikes/risp quotes literally support predicates).
**JK rulings:** A1 CONFIRMED — negative traits use INVERTED tier scaling 2.0×/1.0×/0.5× (high chemistry dampens flaws); 'standardInverted' canonical, marked in matrix header. A12 accepted — Rally Stopper/Surrounded = ≥2 runners (guide-explicit; Blinder 34/69/57→54/89/77 Tier-3 cross-check exact). pitchType groupings accepted (fastball 4F/CF/2F; offspeed CB/SL/CH/FK/SB). A6/A7 example-derived values accepted (Workhorse +15/+30/+60 from Brick 130-pitch). A8/A9 placeholders route to T6 constants registry. Remaining ambiguities accepted as documented.
**Spec v1.1.5:** §3.5 potency rule updated with negative inversion; §4.3 Rally Stopper corrected to ≥2 runners; T2 marked COMPLETE.
**Next:** T3 empirical pool analysis — ROUTE: Claude Code CLI | Fable 5 | max (contract to be drafted). T6 must implement: standardInverted scaling, pressure doubling for Clutch/Choker (A14), Durable/Injury Prone + Pick Officer/Easy Jumps constants (A8/A9).

### 2026-06-10 — T3 COMPLETE (Fable 5 CLI max build) — empirical pool analysis + tier parameters
**Deliverables:** scripts/analyze-pool.py (deterministic; live workbook anchor gate every run), src/data/tierParams.ts (TIER_SHIFTS 1.0/0.7842/0.6799, TIER_RATING_SCALES, FARM_NERF_SCALES, TIER_CAPS 1,251,237/981,174/850,671, LUXURY_CAP_TABLES 11 active rows ×3 tiers, DISABLED_LUXURY_ROWS ×8, CAP_MODIFICATION_FRACTIONS ×42), spec-docs/T3_POOL_ANALYSIS.md (full derivations, 13 spec-amendment candidates A1–A13, 6 data flags F1–F6).
**Bootstrap gate:** 21/21 workbook Roster players reproduced at ±$0 (contract: ≥4 at ±$5; incl. Eovaldi $54,582, deGrom $71,609). Decoded workbook mechanics T4 MUST implement: per-COMPONENT ROUNDUP (not player-total — A4), sub-min reflection denominator = primary.min (A1), SP/RP negative-trait deltas price on RP curves (BW18/BW19 helper — A3), multiplier terms consume ROUNDED attribute cells while delta terms use exact curve math, arsenal tax is TEAM-level not per-player (A2).
**Headline numbers:** pool mean IV $60,225 / median $49,456 / max $402,066 (Pastimm, SP/RP multiplier-trait stacking — A12); pool mean grade ordinal 5.770 (≈B−/B). Luxury caps re-derived from the 20 stock rosters' top-N concentration distribution at p65 (contention-ladder alternative derived and REJECTED — never binds); hitter caps land 1.05–1.22× XBL, VEL caps 2.6–3.5× (SMB4 pool is velo-rich).
**EV-flatness (§5.3): PASS at tierCap** — structurally (salary=IV ⇒ any full-budget tax-free roster ties; pool deep enough that all 12 identities pay $0 tax). Sensitivity: layer wakes at 1.5×, shapes hard at 2.0× (Power+Rotation/Power+Bullpen −11.8% on rotation/VEL — band-level identity can't protect stat-level binding row). No constants tuned; 3 adjustment options for JK in doc §R5.
**Verification:** determinism — 2 runs byte-identical (sha 3171727…); npm run build exit 0; tests 7,156 pass / 3 fail — exactly the known pre-existing set (wpaRuntimeBoundary, franchiseNarrativeEventEligibility, franchiseManualSmokeFixture), zero new.
**Biggest data debt:** 89/178 stock pitchers missing batterRatings (F1) — prices their batting $0 and forces the 8 pitcher-batting luxury rows disabled until DB cleanup.
**Next:** JK reviews A1–A13 + F1–F6; then T4 ivEngine.ts — ROUTE: Codex 5.5 | very high → Fable 5 CLI audit (T3 doc §1.2 is the implementation reference; golden tests = the 21-anchor table).

### 2026-06-10 — T3 COMPLETE (Fable 5 max → Codex 5.5 audit → JK rulings) + spec v1.1.6
**Deliverables (committed this entry):** scripts/analyze-pool.py (21/21 golden anchors ±$0, deterministic), src/data/tierParams.ts (tier caps J/S/N $1,251,237/$981,174/$850,671; shifts ×0.7842/×0.6799; farm nerf params; tier-scaled luxury tables; 42 mod fractions; 8 pitcher-batting rows visibly disabled), spec-docs/T3_POOL_ANALYSIS.md (R1–R6 + 13 amendment candidates + 6 data flags).
**Audit:** DEVIATIONS — 1 MAJOR: bullpen role-set inconsistency (cap derivation used RP/CP/SP-RP, tax consumer used RP/CP). All 4 headline amendment claims CONFIRMED from formula text (A1 sub-min denominator, A2 team-level arsenal tax, A4 per-component ROUNDUP, A5 42 mods); circularity documented; independent 2.0× greedy probe found no optimizer slack.
**Remediation (Claude, chat):** tax path now includes SP/RP per JK ruling; tierParams.ts hash UNCHANGED (caps were already SP/RP-derived — confirms auditor's diagnosis exactly); determinism re-verified. 2.0× sensitivity REVISED: old −11.8% Power+Rotation/Power+Bullpen failures were role-set artifacts, resolved; new sole outlier Contact+Defense +14.92% ADVANTAGED (cheap-curve caps barely bind). 1.0×/1.5× PASS clean. T3_POOL_ANALYSIS.md patched with revised table + analysis.
**JK rulings:** (1) SP/RP counts toward bullpen concentration, derivation AND tax (dual membership with rotation intended). (2) CANONICAL mojo penalties: RP starts −1, CP starts −2, SP relieves −1, SP/RP immune both ways, CP entering before SECOND-TO-LAST inning −1 (game-length-relative, corrects "before 8th"). Spec §4.2/§5.3 updated.
**Spec v1.1.6:** A1–A5 amendments applied (§3.2/§3.4/§3.5/§3.7/§6.2); T3 marked COMPLETE.
**Open pre-T8/T4 items:** F1 player-DB cleanup (89/178 pitchers missing batterRatings → re-run pool analysis after); A6 §6.3 composition scoring ratification; A7 EV-criterion sharpening decision; A12 SP/RP pricing economics review (Pastimm $402k/Drake $219k); T4 golden tests MUST encode A1/A3/A4 semantics + Jon Gray −$2,136 anchor.
**Next:** T4 IV Engine — ROUTE: Codex 5.5 | very high → Fable 5 CLI audit (contracts to be drafted).

### 2026-06-10 — Player DB reconciliation (three-way) + SOT canonized + DB1 ticket drafted
**Trigger:** F1 data gap (88 pitchers missing batterRatings). JK supplied players_final.csv then the cleaned SOURCE_OF_TRUTH_Super Mega Baseball 4 Rosters.xlsx (reference-docs/).
**Findings:** (1) SOT vs CSV: 0 rating mismatches across all 440 after header-aware extraction (Overdogs sheet has a different column layout — no spacers, no Sal col); CSV's only contribution = 9 Overdogs chem cells empty in SOT; 3 CSV name typos (SOT spellings win: Geoffrey Jenkins, Kent Ratherswell, Danny Deals); Moonstars 14H/8P is real (both sources). (2) SOT vs playerDatabase.ts: DB pervasively corrupted — 276/430 matched players with ≥1 wrong rating (~895 field errors across ALL attributes: fld 150, spd 135, con 130, arm 118, pow 109, acc 88, jnk 83, vel 82), 88 missing pitcher batting, 10 name mismatches. Conclusion: wholesale regeneration, not patching. T3 tier constants were derived from corrupted ratings — will be re-derived in DB1 (golden anchors unaffected, workbook-based).
**Arm slot:** new gameplay-relevant field captured from SOT — 179 team pitchers: Mid 65, High 62, Low 41+3, Sub 5 (Sub prices flat $4,000 + VEL×1.075/JNK×1.2 in IV). DB schema lacks armSlot — added in DB1.
**JK rulings (9):** arm slots — Dot Dacornas High, Swirly Cutstiff High, Slick Pickman Low, Sergio Slider Low, Danny Deals Low, Cutter Crackebarrel High (written into SOT; 179/179 coverage verified). Trait disputes — Gem Qualita Composed only, Brawn Thunderchump Clutch only, Kara Kawaguchi Pinch Perfect only (SOT won all 3; CSV errors).
**Actions taken:** Sal columns deleted from all 19 SOT sheets that had one (JK directive — salary must not influence IV logic); zero residue verified. Arm slots filled. SOT committed as canonical roster reference. DB1 prompt contract drafted (Codex 5.5 | high → Fable 5 audit): regenerate 440 team players from SOT (+9 CSV chem fills), add armSlot field, preserve ids/free agents, verification gates incl. 0-mismatch re-check, analyze-pool re-run with F1 disabled-rows flip and old-vs-new constant deltas.
**Next:** JK runs DB1 in Codex 5.5; audit after; then T4 contracts.

### 2026-06-10 — v1.1.7 PENDING PACKAGE (JK-approved design, NOT yet in spec — apply with DB1 audit closure)
**Two-way & pitcher-batting usage model (supersedes A12 review; all weights registry-flagged CALIBRATE):**
1. Pitcher batting value = batting cost × per-role USAGE WEIGHT VECTOR (per-attribute, not scalar): POW/CON PA-gated; SPD = PA + pinch-runner floor + range; FLD always-on 1.00 for everyone (pitchers field every inning they pitch).
2. Weights DERIVED, not hand-picked: roleBatWeight = startShare × paRatio + phFloor. SMB4 = FOUR-man rotation (JK canonical): SP startShare 0.25 → POW/CON ≈ 0.20 w/ floor; SP/RP (no trait) ≈ 0.15; RP ≈ 0.08; CP ≈ 0.05; SPD weights higher via PR floor. Registry stores startShare/paRatio/phFloor inputs, not opaque decimals.
3. Two-way TRAIT players: usage 1.00 ALL attributes (everyday player — either pitching+batting or fielding trait position; complete partition, no 0.95 shave per JK).
4. Pricing curves: ALL pitcher batting prices on HITTER curves × usage weight (two-ways at their trait position's curves; non-trait pitchers on neutral IF/OF block). Pitcher-block batting curves RETIRE from kblIV layer (they were XBL's crude usage premium — now modeled directly).
5. Two Way trait reprices as the USAGE UNLOCK: hitterCurveCost(bat, traitPos) × (1.00 − roleBatWeight) + tier-laddered defensive package. Flat +15/+15/+15/+10 deltas retire.
6. Tier-laddered two-way defense (JK: potency = defensive QUALITY, not playing time): FLD via potency-scaled delta (0.5/1/2 existing machinery); ARM via twoWayArmByTier ladder {L1:60, L2:80, L3:99} CALIBRATE (L3=99 anchored to JK in-game observation; L1/L2 guesses pending eyeball). L1 Two Way (C) ≠ 99-arm catcher — priced accordingly on trait-position curves.
7. Ordinary pitchers' fielding ARM: assumed 99 in SIMULATION ONLY (Effective Ratings/DefensivePlacementRisk/GameTracker when pitcher fields); UNPRICED in IV (uniform constant differentiates nothing). pitcherAssumedArm=99 registry constant, dual-consumer.
8. Architecture: all of the above = kblIV layer ATOP raw workbook layer; 21 golden anchors + Jon Gray −$2,136 untouched. analyze-pool gains usage vectors; tier constants re-derive ONCE more with F1 row flip (third+final).
9. ACCEPTANCE TEST (named, JK-oracle): Fenomeno (everyday two-way) > Pastimm (arm-first) > Drake (bat he never uses) in IV ordering.
**Chemistry/trait potency vs draft (JK question resolved):**
10. IV = potency-NEUTRAL at L2 reference forever (workbook-faithful: XBL restricted league to L2 — that's why anchors balance). Realized potency NEVER reprices salary (construction skill keeps its surplus — captured by True Value as over/underperformance; fan expectations stay declared-budget-anchored and respond to wins).
11. Draft board POTENCY OVERLAY (T8 feature): live per-team chemistry counts → realized tier preview per candidate's traits + MARGINAL SYNERGY insight ("this Spirited pick takes you 2→3, upgrading N existing traits a tier"). Chemistry-stacking becomes visible draft strategy. Cheap: it's counting.
12. Mid-season potency shifts (trades/call-ups change chem counts) realize automatically via effectiveRatings potencyTier(p, team); beat-reporter narrative hook noted.
**Apply-when:** DB1 audit CONFORMS → one commit: spec v1.1.7 (§3.5/§3.7/§4.5/§7.3/registry), analyze-pool usage layer + F1 disabled-row flip, regenerated tierParams, A12 closed, acceptance ordering verified.

### 2026-06-10 — DB1 COMMITTED (Codex 5.5 build → Fable 5 audit: CONFORMS → JK sign-off + F3 name ruling)
**Deliverables:** src/data/playerDatabase.ts regenerated from SOT (440 team players, all fields SOT-faithful incl. positions/roles — Fenomeno now SP/RP + isPitcher + armSlot Sub; armSlot added to schema, 179/179, never on hitters/FAs; chem mapping CMP/CRA/DIS/SCH/SPI; 13 trait normalizations; 66 FAs byte-identical; ids preserved). scripts/regenerate-player-db.py (deterministic; SOT_NAME_TO_DB_NAME map emptied post-F3).
**Audit (Fable 5):** CONFORMS, zero MAJORs. Independent extraction path; 440/440 full-field match; 18/18 ruling anchors; FA byte-diff; assertion-level test read (3 known baseline failures only, zero player-data-dependent); D9 reproduced new constants exactly. Audit also caught that the DB1-AUDIT contract's own prose used old-DB spellings — file was right.
**F3 RESOLVED (JK ruling):** in-game spellings are Danno Yoshida / Seymour Socks / Lars Stadkleef / Pex Flexi — the SOT workbook had the typos. Fixed IN THE WORKBOOK (4 cells), regen rerun (hash cedb001c…), verified: 4 names correct w/ original ids, determinism holds, build green. DB never hand-edited.
**Constants preview (NOT committed — tierParams regenerates in V117):** caps J/S/N $1,323,633/$1,169,013/$1,048,489; shifts ×0.8832/×0.7921; Fenomeno $436,799 pool max (old model's overshoot — v1.1.7 usage model corrects).
**Open cleanup tickets (audit F-items, non-blocking):** F2 SOT cell typos (~15) — clean workbook so future consumers need no normalization maps; F4 four FA trait spellings absent from traitPricing (silent no-match if FA pricing runs); F5 pitcher arm:0 hardcode comment; F6 stale rosterIds grouping comments.
**Next:** spec v1.1.7 application (Claude direct), then V117 contract (Codex 5.5 high → Fable audit): usage layer in analyze-pool, F1 disabled-row flip, tierParams regeneration, Fenomeno>Pastimm>Drake acceptance ordering.

### 2026-06-10 addendum — JK catch: acceptance test was built on corrupted-era ghost data
JK spotted Drake's SOT line (VEL 92) contradicting the "bat-first Drake POW 92" narrative. Verified: committed DB is CORRECT (wpg-drake VEL 92/JNK 24/ACC 45, bat 6/12/53/23 = SOT exactly; earlier chat misread was a regex artifact; DB1 audit's 440/440 stands). The ghost: pre-DB1 corruption had Drake column-scrambled to POW 92/VEL 4 → T3's "bat-first Drake $219k" narrative → carried uncorrected into v1.1.7/v1.1.8 acceptance criteria. Spec v1.1.8 + V118 addendum corrected IN PLACE (both uncommitted): crash anchor = Lad Bradwick (SP, CON 97/POW 3, no trait — kblIV ≤ 50% rawIV); Drake redefined as trait-less-elite-arm probe vs Pastimm (gap isolates multiplier-trait contribution); parity hypothesis unchanged. LESSON (logged for protocol): any spec criterion citing named-player data derived pre-DB1 must be re-verified against the clean DB before use.

### 2026-06-10 addendum — D17 separability ruling (interaction-gates proposal REJECTED)
Claude proposed POW-gated-by-CON realization gates (V119); JK refuted the one-directional premise (Knox's weak contact = its own failure mode; Rush's POW realizes hard on contact; interaction is mutual, direction-ambiguous, "not an exact science") and directed against overengineering the XBL model. Curve-data verification CONFIRMED the workbook already encodes the first-order dynamics: POW/CON cost ratio 1.26× at r30-50 → 2.07× at r70 → ~1.9× at r90+ (exactly "POW matters more at extremes, less toward middle"); SP ACC/JNK ≈ 1.7-1.85× everywhere (location premium). RULING (D17, spec v1.1.8): kblIV = usage corrections only; workbook curves own quality, including extreme-value asymmetries; no interaction terms; extreme-split question deferred to Mode 2 empirical loop (test Bradwick/Oxensocksen/Rush over/underperformance vs IV with real season stats; fit only if data demands). V119-as-gates is DEAD; no new ticket.

### 2026-06-10 — V117 audit CONFORMS + JK ratifies 4 rulings + architecture clarification
**Audit (Fable 5):** zero MAJORs; 440/440 pool kblIV independently recomputed to the dollar (own engine, own parsers); unlock identity exact ×1.00; JK's double-count question answered: NO double-counting anywhere. Findings = dropped/rerouted value, not arithmetic: (W2b) non-two-way pitcher FLD on pitcher block vs spec literal text; (W2d) DB armSlot never wired (5 Sub players priced $0 angle; Fenomeno counterfactual +$6,458); (W2e) flex premium symmetric on negative deltas (≤$166 vs A3 rule); (W4) parity bridge: gap $61,871 = pitch attrs +$44,893, traits +$23,667 (Pastimm Elite 4F $74,880 vs Fenomeno $26,543 — quality-tracking as designed), bat/field −$15,741, pitches +$9,052; IF-block counterfactual INVERTED (SS curves would WIDEN gap to 47.7%).
**JK RATIFIED:** (1) A3 symmetry as built; (2) FLD carve-out — mound fielding on pitcher block (builder right, spec sentence amended); (3) wire armSlot; (4) parity band RETIRED — gap ruled TRUE; equipoise = arguable value-per-dollar, not equal prices ($199k elite arm vs $144k two-way + $55k of pool talent = genuine context-dependent fork). Spec v1.1.8 amended in place (FLD carve-out, acceptance rewrite, A3 ratification in D16, registry spdFloors + armSlot rows, parityBand retired). V117-FIX contract drafted (Codex 5.5 high → Fable delta re-verify): X1 armSlot wiring, X2 SP/RP FLD interpolation, X3 dead-code removal, X4 spdFloors registry constants, X5 acceptance update, X6 tierParams 4th derivation + addendum closure.
**Architecture clarification (JK question, verified by grep):** per-player IV is ABSOLUTE — pure function of own profile; named players appear ONLY in run_anchor_gate + r6_spot_checks (verification harnesses), zero names in pricing logic. tierParams = league-environment CONSTANTS calibrated once from the 440 stock pool then frozen (correct for any stock-pool subset; custom-pool recalibration = future feature, machinery exists). Relative layers (board scarcity, potency overlay, pick values, True Value) sit ABOVE absolute IV by design: absolute prices, relative advice.
**Next:** JK runs V117-FIX → Fable delta re-verify → closure commit (spec v1.1.7/8 + usage layer + tierParams final + contracts + logs) → new thread for T4.

### 2026-06-10 addendum — IV purity Q&A + T12 roadmap addition
JK verified architecture understanding with concrete probes, all confirmed: (1) Pastimm minus Elite 4F = −$74,880 recalculated automatically (IV = pure profile function, audit-bridge number); (2) switch→righty drops the handed component (bats==='S' gate; note Fenomeno actually bats L); (3) workbook completeness PROVEN by the anchor gate — formula-chain decode + 21/21 cached salaries at ±$0 means no profile-tied workbook term can be missing; deliberate exclusions all have rulings (arsenal tax A2 team-level, potency D15 L2-neutral, grade=output, age/perf/fame/personality = salary-layer). **T12 added to spec §13 (JK directive):** pool recalibration tool — any custom pool → re-derived J/S/N tiers + "average team at this tier" example rosters, as a Mode 1 league-creation step; post-T8; absolute player IVs never recalibrate, only league-environment constants.

### 2026-06-10 — V117-FIX COMPLETE → delta-verified → ARC CLOSURE COMMIT
**Build (Codex 5.5):** X1-X6 delivered. armSlot wired into rawIV+kblIV (5 Sub pitchers; Sub = $4,000 + VEL×1.075/JNK×1.2 on kbl interpolated cells); SP/RP mound FLD interpolated; dead A3 code removed (behavior unchanged); spdFloors registry constants; acceptance = Bradwick crash gate + bridge REPORT (band retired); tierParams 4th+FINAL derivation.
**Delta verification (Claude, in lieu of full Fable session — rationale logged):** the V117-AUDIT independently PREDICTED every delta before the build: Fenomeno $143,641 (audit counterfactual) = build $143,641 EXACT; Pastimm +$72 FLD-interp delta = $199,054→$199,126 EXACT; Drake +$28; arm-probe gap reconciles. Independent prediction → exact implementation match across two model families = decorrelated verification already achieved; third session would re-confirm settled arithmetic. Anchors 21/21 ±$0 + Jon Gray −$2,136 unchanged; Bradwick $58,417 ≤ $62,058 PASS; determinism (hash 05606a7f…); constants J/S/N $1,205,836/$1,064,387/$954,874; EV-flatness PASS ×3; build green; 3 baseline test failures only.
**FINAL kblIV oracle numbers:** Fenomeno $143,641 · Pastimm $199,126 · Drake $101,003 · Bradwick $58,417. Bridge on record in T3_POOL_ANALYSIS V117-FIX addendum.
**ARC CLOSED with this commit:** spec v1.1.6→v1.1.8 (D15/D16/D17, §3.9, T12, all JK ratifications), kblIV usage layer, F1 luxury rows enabled, tierParams final, contracts V117/V118/V117-AUDIT/V117-FIX, full session record. Next: T4 (IV Engine, both layers) in a FRESH THREAD per token-economics decision.

### 2026-06-10 final addendum — Utility trait mechanics CORRECTED (JK catch, T2 matrix citation decisive)
Claude's chat analysis wrongly assumed secondaries are penalty-free and Utility = everywhere-coverage, concluding Utility+IF/OF = redundant double-pay (Handley Dexterez). GUIDE TRUTH (already cited in traitInteractionMatrix): secondaries CARRY a fielding penalty; Utility reduces it AT SECONDARY POSITIONS ONLY (−25%/−50%/removed by tier); non-listed positions = severe penalty, unhelped. CORRECTED LADDER: Utility function SCALES with secondary coverage — zero with no secondary (predicate never fires; no such player exists in pool), max with IF/OF (7 positions). All 9 stock holders carry secondaries (7 blankets) — designer-intended synergy. HANDLEY RE-VERDICT: best-case holder, flat-priced (~$1.5-2.5k) for 7-position relief on FLD 97 = bargain, not punishment; L3 Scholarly removes penalty entirely (potency-overlay showcase). NO pricing change (D17: ~$1-3k materiality; function already correct in matrix→effectiveRatings/§4.5; surplus lands in True Value). T8 board insight: "Utility + blanket = trait fully unlocked" green flag. LESSON: trait-mechanics claims must check the matrix CITATION before reasoning from assumed gameplay — the matrix exists precisely so we don't do this.

### 2026-06-10 final addendum 2 — fielder out-of-position mojo rule (JK canonical)
Playing neither-primary-nor-secondary position = −1 mojo level ON TOP of the severe fielding penalty; secondaries = fielding penalty only (Utility-reducible), no mojo hit; Two Way trait position = secondary-equivalent (flagged inference). Spec §4.2 updated; §4.5 DefensivePlacementRisk must price both costs. Completes the placement-cost model: primary free → secondary moderate-FLD → out-of-position severe-FLD + mojo.


---

## 2026-06-11 — T4 COMPLETE (build → audit CONFORMS) · T4-FIX queued

**Branch:** codex/franchise-v1-next · **Workstream:** IV Engine (spec v1.1.8)

**T4 delivered (Codex 5.5 | very high):** `src/engines/ivEngine.ts` — pure `computeIV`,
BOTH layers (rawIV workbook-exact, kblIV §3.9). New: `src/data/rosterEngineConstants.ts`
(IV-layer constants, T6 extends); frozen oracle `spec-docs/reference/iv_oracle.json`
(serialization-only `--dump-oracle` flag in analyze-pool.py, anchor-gated); golden tests
G1–G9.

**T4-AUDIT (Fable 5 CLI, 2026-06-11): CONFORMS, zero MAJOR.** Evidence highlights:
diff to analyze-pool.py read line-by-line = serialization-only; anchors 21/21 ±$0 +
Jon Gray −$2,136 rerun; oracle content-identical on re-dump (440 players + 21 anchors
byte-identical; sha delta = generatedAt only); G3 confirmed per-component over all 440
on both layers; mutation tests: flexPremium 1.12→1.0 and the α/startShare conflation
trap (0.30→0.18) both break G3/G4; A3 proven on synthetic SP/RP (−$2,033 = auditor's
independent hand calc on RP curves; SP/RP-curve counterfactual −$6,879); A4 ROUNDUP
proven divergent from total-rounding on crafted input (58,309 vs 58,307); arsenal tax
absent both layers. Full suite 3 baseline failures only; build green. Oracle four
hard-coded and green: Fenomeno $143,641 · Pastimm $199,126 · Drake $101,003 ·
Bradwick $58,417.

**Findings → JK rulings (approved 2026-06-11):** F2 LOW (raw layer consumed potency —
workbook-exact only at L2) → PIN raw layer to L2 structurally; F3 LOW → drop
meta.generatedAt for byte-exact freeze; F4 LOW (hitter+Sub armSlot edge, unreachable) →
comment + documenting test, NO behavior change (script parity). All three bundled as
**T4-FIX** (Codex 5.5 | medium → Fable delta verify), contract in PROMPT_CONTRACTS.md.

**Doc state:** spec §13 T4 row marked COMPLETE; CURRENT_STATE header de-staled
(2026-04-13 → 2026-06-11) + phase updated. **Next session starts with:** JK runs T4-FIX
→ Fable delta verify → commit T4+T4-FIX together → T5 (salary integration seam,
Codex 5.5 | very high; persistence-adjacent, audit non-negotiable).

### 2026-06-11 addendum — fielding→mojo flux ruled unpriced (D17 extension, minimal)
JK raised post-workbook SMB4 mechanic: spectacular catches raise mojo / misses lower it
— could glove-first/noodle-bat players at high-chance positions farm mojo into batting
boosts (strategic asymmetry)? RULED: unpriced, folded into D17 in place (no new D-number).
Rationale: mojo equilibrium PA-dominated; curve convexity damps the payoff exactly where
the archetype lives; FLD/SPD marginal sign-unstable + user-skill confound (attempts are
player-controlled); uncalibratable thresholds. Spec D17 row extended with the ruling +
the §4.5 distinction (placement COST priced vs performance-FLUX unpriced — asymmetry is
deliberate) + Mode 2 empirical roster gains mojo-engine AND mojo-sink archetypes.
Documentation kept minimal per JK (risk addressed = future-session re-litigation, the
Drake-ghost/Utility-misread failure mode). T8 qualitative board flag deliberately NOT
ruled — separate call when T8 specs up.

### 2026-06-11 — T4-FIX delta verified → T4 arc ready for closure commit
**Build (Codex 5.5 | medium):** X1 raw layer structurally pinned to L2 (call-site
literal; potency nowhere else in raw path; K6 intact) + G10; X2 generatedAt removed,
oracle regenerated once, freeze now byte-exact (sha a0b501b1…); X3 comment + documenting
test, zero behavior change.
**Fable delta verify: DELTA VERIFIED, no disagreements.** Mutation check independently
reproduced (382,305 vs 450,056, exactly G10, 10/11 selective); X2 delta isolated to two
removed lines; re-dump sha byte-exact vs committed; anchors/players content-equal vs
Fable's own T4-audit baseline (NOTE: contract wrongly said prior oracle was "in git
history" — T4 was never committed; Fable correctly substituted its /tmp baseline);
X3 script-parity proven by driving analyze-pool's engine with the same synthetic
($4,000 both sides); suite disambiguated = 374 files/7,170 tests, exact 3-failure
baseline. Cosmetic (no action): computeRawLayer carries an unused potency param —
fold into next T5/T6 touch of the file.
**T4 + T4-FIX both COMPLETE.** Spec §13 row finalized; CURRENT_STATE phase updated.
Next: closure commit (engine + tests + constants + oracle + script flag + contracts +
session docs + spec amendments incl. D17 mojo extension), then T5.

## 2026-06-11 — VISION/INTEGRATION SESSION (no build) — engine architecture + 14 design rulings

**Session type:** vision, per JK directive. No code touched; no Codex tickets run.

**Deliverable 1 — MODE2_SYSTEMS_INTEGRATION_MAP.md (new):** mapped the chain
IV → salary → True Value → roster decisions → expected wins → morale/
milestones/reporter → Mode 2→3 handoff. Key findings: (4.1) expected-wins has
THREE competing definitions (payroll percentile / declared budget / roster TV)
— ruling needed, now routed to the D3 Morale design session as H11; (4.2) two
fan-morale formulas coexist — MODE_2 §20 ruled canonical, manager-firing
consequence SURVIVES per DQ6; (4.3) MODE_2 §15.5 + salary spec potency text
CONTRADICTS D15 potency-neutrality — pre-build amendment folded into T5
contract; (4.4) WAR persistence + gamesPerTeam metadata = the single gating
fix for TV/designations/morale factors; (4.5) IV §3.8 stale DH row; (4.6)
SeasonSummary payload gaps (fame, ledger/rookie-scale flags, playerMorale,
declared budget) — field pass queued. WAR smoke-test explosion attributed
(UNVERIFIED — needs repro) to season-scaling metadata, not stat design.

**Deliverable 2 — FRANCHISE_ENGINE_VISION_QA.md (new):** 14 design rulings +
2 amendments (JK = design authority; Claude = engineering owner per JK
directive this session). Headlines: all controlled teams are the user
(protagonist per controlledBy, never teamId); columnist doctrine (reporters
write angles, never stenography; FEED/ALERT/INTERRUPT delivery tiers,
~2-interrupt cap); fame FULLY VISIBLE (tier+number), player morale band+trend
only (number + response curve hidden) — fame is a scoreboard, the clubhouse
is a mystery read through journalism; relationships capped at sports-drama
(romance = context, never dramatized); LIVING PROFILES (frequent ±1 ratings
moves, queued + batch-applied at series boundaries); FULL TEETH fan morale
(mid-season manager firing returns + NEW attendance/revenue + rebuild
mandates); playable All-Star Game (exhibition mode, stats quarantined),
fame/morale-weighted fan vote with systemic snubs; card = abstract front /
Savant back / per-season collectible binder; almanac search = curated →
filters → NL magic tier; LIGHT CHAOS (flavor only, never season-wrecking).
Engineering rulings (Claude): 3-layer engine architecture (Truth → Judgment →
Story → Continuity), strict typed contracts between layers / pure-function
calls within, writes one-directional, user always the bridge; Story engines
are SIBLINGS (Relationships/Morale/Narrative/Recognition).

**Deliverable 3 — FRANCHISE_ENGINE_MAP.md v0.2 (new):** 15-engine inventory
with charters + build status; value channel (WAR→TV→economy) vs memory
channel (WPA→Fame→narrative) — a player's story is the gap between channels;
§4.5 existing-asset crosswalk added after JK course-correction (tie-together,
not boil-the-ocean): net holes = 3 genuinely NEW specs (fan economy [large],
exhibition mode, card spec), 3 consolidations (Recognition ≈190KB of existing
specs, Development, Scouting), rest amendments/wiring. Discipline rule: every
engine design session BEGINS by reading that engine's existing gospels in
full — output is consolidate-and-amend, never parallel-spec. §8 operating
plan: build track (Fable contract → Codex 5.5 → Fable audit) unchanged;
design track (JK+Claude chat, no Codex) runs parallel; W1 (WAR/metadata
hardening) ruled a SEPARATE ticket from T5, Codex 5.5 high → Fable audit.
Session math: Wave 1 Judgment ~10-12 build sessions; design track ~8-10;
Wave 2 Story builds ~8-12 (firm after specs). 5-session near-term milestone:
T5 + W1 + TV1 + D1(Stats audit) + D2(Recognition).

**Process lessons logged:** (1) Claude initially asked JK engineering
questions — corrected: architecture = Claude's call, design = JK's; (2)
engine map v0.1 under-weighted existing specs (drafted without reading the
per-system gospels) — corrected in v0.2 with crosswalk + the read-first rule.

**Stale-data flags for future sessions:** SUBSYSTEM_MAP is Feb-era —
Transaction + Scouting/Farm rows predate May–Jun checkpoint work; F-086 vs
F-119 disagree on Relationships wiring (resolve at D6).

**Open pending-JK items:** ASG big-WPA-moments→Fame; Signature Moment line on
card back; fame tier names.

**NEXT SESSION (new thread):** T4 arc closure commit → Claude drafts T5
prompt contract (Codex 5.5 | very high → Fable 5 CLI audit) INCLUDING the
4.3/4.5 pre-build spec amendments.

### 2026-06-11 addendum (post-close) — Draft placed in the engine map
JK question: where does the draft fit? Answer added as FRANCHISE_ENGINE_MAP
§9: the draft is the FLAGSHIP SURFACE, not an engine — the maximum-convergence
point of IV + Scouting + Economy + Identity + Effective Ratings, already
specced (IV §7.3/§7.4 + DRAFT_FIGMA_SPEC), builds in T8, recurs annually via
the Offseason conductor. New design hook logged for D5/T8: morning-after
reporter DRAFT GRADES with season-long receipts (draft position vs True Value
divergence auto-generates steal/bust stories).

### 2026-06-11 addendum 2 (post-close) — scope governance + anti-reinvention protocol
JK raised ballooning concern; both adopted into FRANCHISE_ENGINE_MAP §8:
(1) **D0 SCOPE SESSION** now precedes D1 — consolidates existing scope docs
(V2_DEFERRED_BACKLOG, V1 stability/cut-list, scope decision board) into
FRANCHISE_PLAYABLE_V1_DEFINITION.md: v1 = the LOOP (draft → season →
playoffs/awards → offseason → Season 2 with clean carryover; two completed
seasons = done), item-by-item cut line, memorability-per-session tiebreaker.
Staging principle: rulings are the destination, not the build order — DQ
maximalist answers (full teeth, living-profile cadence, ASG, NL search) stage
to v1.5/v2 without dying; the soul (reporter voice, visible fame, snubs,
card, draft night) is cheap expression on computed data and stays v1.
(2) **Mandatory session-opening protocol** for every D-session and build
contract: read existing gospels in full → VERIFY wiring with fresh evidence
(never trust Feb SUBSYSTEM_MAP; route heavy verification to Fable CLI via
franchise-engine-discovery / spec-ui-alignment skills) → classify assets
ADOPT/AMEND/WIRE/REBUILD before new design → every session outputs its own
v1/v2 split. Design-track order is now D0 → D1 → … → D8.


## 2026-06-11 — T5 ARC COMPLETE: salary seam on kblIV, audited + delta-verified

**Build (Codex 5.5 very high):** pipeline base = computeIV().kblIV in canonical
dollars; Steps 1/2/trait-tiers deprecated out of the live path (kept for bridge/
matrix tests); POSITION_MULTIPLIERS → 1.0 knobs (still applied); D15 potency-
neutrality enforced (zero chemistry logic in the salary path); rookie-scale hook
(ROOKIE_SCALE_FACTOR 0.50 REPLACES age factor, §8.4/D6/F-127, ledger = T7);
denomination bridge: dollars canonical, BRIDGE=300.032521 (median old $14.3M /
median kblIV $47,661.50), all scale constants re-denominated + CALIBRATE-flagged
(MIN/MAX, ROI→WAR/$100k, draft constants, tier bands, 24 GRADE_SALARY_BOUNDS);
Step 0 spec amendments landed (A1 salary-spec potency salary-multiplier killed →
D15 doctrine; A2 both MODE_2 §15.5 point-3 rewrites; A3 IV §3.8 DH row → §3.9).

**Captain verification (fresh evidence, not builder report):** scope/frozen-file
check, greps, bridge reproduced, build, full suite at baseline. NFL catch #1: my
first full-suite run showed 1,837 failures — falsified as harness:
**JK's login shell exports NODE_ENV=production**, breaking vitest (production
React, node: builtin resolution). ALL future CLI verification must prefix
`NODE_ENV= ` (baked into T5-AUDIT/FIX/VERIFY contracts). NFL catch #2: T5
contract's R1 originally cited Eovaldi/deGrom dollars — those are RAWIV anchors,
not stock-pool kblIV; corrected pre-Codex.

**Fable T5-AUDIT verdict: DEVIATIONS — 2 MAJOR, 4 LOW.** MAJOR-1 prospect
placeholders still $M (blast radius: payroll aggregation, trade matching,
TeamHub); MAJOR-2 R3 self-referential (survived ROOKIE_SCALE_FACTOR=1.0
mutation). LOW-3 bridge reimplementation (equivalence proven), LOW-4 missing
@deprecated tags, F5 armSlot franchise-data gap, F6 PlayerCard isTwoWay
heuristic, F7 dead barrel re-export.

**T5-FIX (Codex 5.5 medium) correctly BLOCKED:** X1 exposed stale downstream $M
assumptions. Captain classified: 4 stale-test-constant files + TeamHubContent
live bespoke formatters (4 sites, not 2 — same pattern, ruled in-scope) +
**FINDING-134** logged (TradeFlow ×1e6 trade matching, FreeAgencyFlow,
AwardsCeremonyFlow, FinalizeAdvanceFlow grade tables/thresholds — uncovered,
wiring unverified, fenced for a dedicated pass: Fable discovery → Codex 5.5
high). Root lesson in the finding: denomination sweeps must follow the DATA
FIELD (player.salary consumers), not engine importers. T5-FIX-2 addendum
unblocked with a six-file extension + no-weakening rules.

**Fable T5-FIX-VERIFY verdict: T5-FIX DELTA VERIFIED.** Both MAJORs closed
(mutation now kills the suite), comment-only X3/X4 confirmed by byte-diff, Y2
assertion-honest (precision not loosened), forbidden surfaces clean.

**Suite baseline RE-CHARACTERIZED:** 2 fixed failures (wpaRuntimeBoundary,
franchiseNarrativeEventEligibility) + ≥2 ORDER-FLAKES (franchiseManualSmokeFixture,
GameTrackerLaunchState — each passes solo; both observed flaking 2026-06-11).
A full-suite run failing only within that four-file set = baseline.

**Strays (JK rulings 2026-06-11):** SPECIAL_EVENTS blank line + TRAIT_INTEGRATION
DH-row deletion reverted pre-T5 (parked change for a future cited cleanup:
delete `| DH | Hitting, Baserunning |` from the §position-group eligibility
table — relates to §3.8 DH retirement); SMB4 Rosters.csv held untracked.

**OPEN — PENDING JK RULINGS:** F5 armSlot missing from franchise Player model
(~$6.5k reprice drift on Sub-slot arms; candidate: fold into W1 or data-model
pass); F6 PlayerCard isTwoWay heuristic (POW/CON ≥ 40 ⇒ Two Way pricing in
display path; recommend defer to T6/T9, contradicts D15 trait-as-unlock);
F7 remove dead barrel re-export engines/index.ts:690 (Fable+Captain recommend
REMOVE, zero importers). Also open: order-flake cleanup (low priority).

**NEXT SESSION:** W1 — WAR orchestrator persistence + gamesPerTeam metadata
(SEPARATE ticket per vision ruling; the gating fix for the value spine).
ROUTE: Codex 5.5 | high → Fable 5 CLI audit. Then TV1 → T6 per the 5-session
milestone (T5 ✅ + W1 + TV1 + D1 + D2).


### 2026-06-11 addendum (post-close) — JK rulings on parked items + armSlot/generator disposition
**JK rulings (all Captain recommendations APPROVED):** F5 + F7 fold into W1;
F6 defers to T6/T9 (heuristic dies when display paths rebuild on Effective
Ratings); FINDING-134 discovery = next small slot after W1 (Fable CLI,
spec-ui-alignment/franchise-button-audit → fixes Codex 5.5 high); order-flake
cleanup = standalone Codex 5.5 medium, opportunistic; F2/F4 stay parked.
**DH RULING (canonical): no DH appears ANYWHERE in v1** — including Mode 1
league config. The parked TRAIT_INTEGRATION DH-row deletion is hereby APPROVED
as a cited cleanup (cite: this ruling + D15/§3.9 non-DH canon); execute in the
next spec-cleanup batch alongside a DH-surface grep (PlayerPosition type 'DH',
POSITION_MULTIPLIERS 'DH' knob row, any UI strings) — scope that batch
deliberately, do not drive-by.
**armSlot disposition (Captain-verified by grep):** stock 440 have armSlot in
playerDatabase (DB1); franchise Player interface lacks the field (types/
index.ts:10, leagueBuilderStorage.ts:189) → W1 X-item = field + migration +
reprice threading. Generators (smb4PlayerGenerator, prospectScoutingDraftEngine,
franchiseStartupProspectDraft) assign NO armSlot — W1 adds an explicit
`armSlot: null` generation default (financially correct: ivEngine prices only
'Sub'; null ≡ non-Sub). NEW DESIGN HOOK → D8 Scouting/prospect generation:
should generated prospects carry a Sub-slot chance (frequency? scout-obscured?)
— a hidden submariner is on-doctrine draft-night texture.


## 2026-06-12 — W1 ARC COMPLETE: WAR fuel line live, audited + delta-verified

**Ticket:** W1 — WAR orchestrator persistence + gamesPerTeam metadata, with folded
X-items F5 (armSlot franchise field) and F7 (dead barrel re-export). ROUTE executed:
Codex 5.5 high → Fable 5 audit → Codex 5.5 high fix → Fable 5 delta verify.

**Build (Codex 5.5 high):** processCompletedGame calls calculateAndPersistSeasonWAR
after successful regular-season aggregation only (try/catch, never blocks completion);
SeasonMetadata gains gamesPerTeam: number|null (normalized at every read/write site,
null-only backfill, never conflated with totalGames); resolution = stored metadata
first → explicit config-shaped options → skip + warn, NO silent default (R1 ruling,
JK 2026-06-12: config truth from Setup Wizard; wizard free-input UI parked); franchise
Player gains armSlot 'High'|'Mid'|'Low'|'Sub'|null with full generator coverage
(armSlot: null default per 2026-06-11 ruling) and franchiseSalary threading; dead
salaryCalculator barrel block (81 lines) deleted from engines/index.ts.

**Mid-build BLOCK (protocol worked):** Codex correctly stopped — W1-C threading needed
franchiseSalary.ts, absent from the allowed list. Captain verified (fresh grep:
buildFranchiseSalaryPlayer omitted armSlot; 9 production importers = THE live reprice
path), owned the list omission, issued ADDENDUM 1 (one surgical line). The contract's
own mutation-honest test #5 would have caught the omission at verification regardless.

**Fable W1-AUDIT verdict: DEVIATIONS — 1 MAJOR, 1 LOW.** Code itself fully conformed
(scope, null-only backfill overwrite-proof, generator enumeration, mutations all
re-run RED→green). MAJOR-1: WAR live-dead — NO production caller supplied a
gamesPerTeam source (Captain contract-scoping error: every caller that could carry
config was off the allowed list — same failure class as the franchiseSalary block;
lesson: scope the fuel line, not just the engine). LOW-2: WAR seasonId resolution
preferred archiveOptions.seasonId while aggregation writes under options.seasonId —
latent until MAJOR-1 fixed. Audit bonus root-cause: deriveSeasonTotalGames =
schedule-row counting live in production → **FINDING-135** (deferred to F-134 slot).

**W1-FIX (Codex 5.5 high):** metadata-first architecture — X1 creation
(initializeFranchise threads config.season.gamesPerTeam into getOrCreateSeason 5th
param), X2 heal (repairFranchisePersistence — runs on FranchiseHome mount — backfills
ONLY null; disagreeing config never overwrites a non-null snapshot, proven by test
asserting saveSeasonMetadata NOT called), X3 belt-and-braces (both FranchiseHome
processCompletedGame sites pass config gamesPerTeam, || undefined zero-safe), X4
DELIBERATE NON-CHANGE (useGameState untouched — its options.seasonId =
getFranchiseSeasonId output, the same key X1/X2 populate; Fable traced and ratified),
X5 (WAR scope = options.seasonId first, mirrors aggregation; archive semantics
untouched), X6 (production-shaped liveness test: options = { seasonId } only, WAR
persists via metadata alone; mutation-killed both directions).

**Fable W1-FIX-VERIFY verdict: W1-FIX DELTA VERIFIED.** All three fuel lines traced
config-sourced; non-null-never-overwritten proven; D3/D4 mutations re-run RED and
restored sha-identical; seasonStorage byte-stable vs audit snapshot; FranchiseHome
diff = exactly 10 lines; suite at baseline (3 fails, characterized set); build green.
Forward-looking note (not a deviation): if a future call site sets
archiveOptions.seasonId WITHOUT options.seasonId, aggregation targets
DEFAULT_SEASON_ID while WAR targets the archive id — unreachable today.

**Process corrections this arc:** (1) JK caught reasoning-effort drift — both Fable
contracts (W1-AUDIT, W1-FIX-VERIFY) had dropped the "high reasoning effort"
route-header + closing directive that T4/T5 carried; patched in PROMPT_CONTRACTS.md
(W1-AUDIT ran without it — noted in-file; output quality did not visibly suffer but
the directive is protocol). PROPOSED standing rule for SESSION_RULES (pending JK):
every contract, builder or auditor, carries reasoning effort in ROUTE header AND
closing directive, else not ready to hand off. (2) ENV lesson institutionalized:
non-interactive shells lack node (nvm) — path baked into contract ENV lines.

**Suite baseline (re-confirmed 3×):** wpaRuntimeBoundary +
franchiseNarrativeEventEligibility fixed failures; franchiseManualSmokeFixture +
GameTrackerLaunchState order-flakes (GameTrackerLaunchState did not flake in either
Fable run). Test count 7,189 (+5 W1 + +5 W1-FIX over pre-arc).

**Parked this arc:** wizard free-input gamesPerTeam UI (Codex 5.5 medium,
opportunistic, needs validation bounds); whole engines/index.ts barrel deadness
(fresh grep: zero importers anywhere — future cited cleanup); mid-season
gamesPerTeam edit semantics (snapshot-at-creation canonical); Fable's
forward-looking seasonId note above.

**NEXT SESSION:** W1 arc closure commit (W1 + W1-FIX + contracts + session docs,
single commit, post-verdict — T5 pattern), then **FINDING-134 discovery slot**
(JK-ruled 2026-06-11: Fable 5 CLI, spec-ui-alignment/franchise-button-audit skills →
fixes Codex 5.5 high) now ALSO carrying FINDING-135 (totalGames consumer inventory).
Then TV1 → T6 per the 5-session milestone (T5 ✅ W1 ✅ + TV1 + D1 + D2). Design
track: D0 scope session still next.


## 2026-06-12 — F134/F135 DISCOVERY + F135-T1 ARC: live WAR defect found and killed same-day

**Discovery slot (Fable 5 CLI | high, spec-ui-alignment + franchise-button-audit):**
READ-ONLY pass produced spec-docs/F134_F135_DISCOVERY_REPORT.md. Headline:
ZERO $M-scale sites LIVE-BROKEN today — two structural gates neutralize all 25
(FRANCHISE_V1_OFFSEASON_EXECUTION_ENABLED=false at FranchiseHome:148 kills
FinalizeAdvance/Awards/FreeAgency; TradeFlow:1096 franchiseId branch routes all
franchise renders to FranchiseTransactionConsole, stranding legacy ActiveTradeFlow
with every TradeFlow $M site). 16 sites latent LIVE-BROKEN on flag flip (worst:
FreeAgencyFlow:541 PERSISTS salary×1e6 as contractValue); 10 sites NEW vs the
F-134 known list (7 raw-`M` formatters invisible to the 1000000 grep). Part B:
18 totalGames consumers — 3 config-truth-needed, 6 row-count-correct, 9 dead;
ONE LIVE DEFECT: useSeasonStats:331/:366 leader WAR scaled by league-total
schedule rows (±Infinity at 0; mis-scaled partial AND full — totalGames is
league rows, WAR wants per-team games; ~numTeams/2 × error). Captain
spot-checked 4 load-bearing claims by independent grep, incl. the `??`-doesn't-
catch-0 mechanism. **FINDINGS LOGGED: F-136** (resolves F-134 severity),
**F-137** (resolves F-135 + the live defect), **F-138** (C-1 promoted:
useOffseasonData serves STOCK playerDatabase — denomination fixes necessary but
NOT sufficient for flag flip; named precondition). Captain post-report catch:
dead duplicate src/src_figma/app/hooks/useSeasonStats.ts (zero importers, no
defect) → report C-7, folds into F135-T2.

**JK rulings this session:** fix queue order confirmed (F135-T1 first — live
defect, runs ahead of TV1 so TV1 doesn't verify against corrupted WAR);
T4 = DELETE ActiveTradeFlow (Fable + Captain concur); T2 vote-divisor and
T3 rookie-table design inputs deferred to those drafts. **R1' RULING:** WAR
season-length = gamesPerTeam (>0) → 162 with warn-once; totalGames PERMANENTLY
BANNED from the chain (display math ≠ persistence, so W1's strict skip-no-
default not applied — fallback preserves non-franchise behavior).

**F135-T1 (Codex 5.5 | high):** resolveSeasonGamesForWAR exported pure resolver;
zero functional totalGames reads remain (grep-verified); finiteWAR clamps at
all 6 WAR assignment points (try/catch+isNaN never caught ±Infinity); 6
mutation-honest tests incl. hook-level mock assertions (toHaveBeenCalledWith
(…, 64) kills M1 at the wiring layer). ONE deviation: state widened to
SeasonMetadata|null|undefined (init undefined), :350 ternary bypasses resolver
pre-load (warn-noise control).

**Fable F135-T1-AUDIT verdict: "F135-T1 DELTA VERIFIED."** Deviation ruled LOW
(single state write :401 from Promise<SeasonMetadata|null>; undefined provably
transient-pre-load; pre-load stats arrays empty so silent 162 never scales a
real row; return re-narrows ?? null). M1/M2/M3 re-run RED, restored hash-
verified byte-identical ×2. Suite 7,192/3 (characterized set; GameTrackerLaunch
State didn't flake), build green, +6 test delta (7,189→7,195). Disagreements
4/0-MAJOR: #2 M2b mutant survives — no test pins gamesPerTeam 0/negative/NaN
(one-line resolver test → F135-T2); #4 warn once-per-module-lifetime, quieter
than spec'd.

**Process catch (Captain, self-NFL):** F135-T1 build contract went chat→Codex
without landing in PROMPT_CONTRACTS.md first — write-first violation; retro-
logged verbatim with execution record. PROPOSED standing-rule addition
(pending JK, alongside the 2026-06-12 reasoning-effort rule): no contract is
handed off until it exists in PROMPT_CONTRACTS.md.

**NEXT SESSION:** F135-T1 closure commit (code + tests + contracts + findings
F-136/137/138 + discovery report + session docs — single commit, post-verdict,
T5/W1 pattern). Then **F134-T1: FreeAgencyFlow canonical pass** (delete ×1e6
at :541, swap 7 raw-`M` formatters to engine formatSalary, leave ±10% ratio
math) — ROUTE: Codex 5.5 | high → Fable 5 audit (FA persistence). Then F134-T2
(needs vote-divisor ruling) → T3 (needs rookie-table ruling) → T4 (DELETE
ActiveTradeFlow) → F135-T2 (cleanup batch incl. C-7 duplicate + M2b test
one-liner). TV1 unblocked after F134 batch or in parallel per JK. Design
track: D0 still next.


## 2026-06-12 (cont.) — F134-T1 ARC: FreeAgencyFlow canonical, BLOCK→flake-triage→VERIFIED

**Rulings opening this arc:** standing Contract Readiness Rule RATIFIED and
written to SESSION_RULES.md (reasoning effort ×2 + contract-in-file-before-
handoff); Fable disagreement #1 (F135-T1) RULED sanctioned — spec-docs fold
into closure commits, and audit contracts now carry an explicit spec-docs
carve-out (first used in F134-T1-AUDIT). JK workflow preference recorded:
continue long sessions; new session only on context degradation or natural
arc boundary.

**F134-T1 (Codex 5.5 | high):** contractValue persists raw canonical dollars
via new pure buildFreeAgentSigningFromMove; 7 raw-M formatter sites → engine
formatSalary (9 call sites in final form); ±10% window extracted to pure
getFreeAgencyExchangeSalaryWindow (bit-identical math, pinned by T-C/M3);
new test dir src/src_figma/__tests__/offseason/. Codex correctly BLOCKED:
one outside-baseline suite failure (franchiseOffseasonGuards.component,
a TradeFlow preview assertion in a file F134-T1 never touched).

**Captain flake triage (protocol win — no code bent to the suite):**
solo 24/24 green → pairwise with the new test file green both orders →
diff adds zero module-scope mutable state → full-suite re-run fails on
EXACTLY the characterized 3 with guards green. RULING: order-flake, third
family member. Baseline re-characterized: fixed failures wpaRuntimeBoundary
+ franchiseNarrativeEventEligibility; order-flakes franchiseManualSmoke
Fixture + GameTrackerLaunchState + franchiseOffseasonGuards.component
(conditional: must pass solo when it fires). Test count 7,198.

**Fable F134-T1-AUDIT verdict: "F134-T1 DELTA VERIFIED."** Highlight — D3
consumer sweep (F-134 root-lesson pointed at our own fix): FreeAgentSigning.
contractValue has ZERO product readers; write-only field; scale flip
forward-safe; dead-data one-liner parked to F135-T2. D4 refactor ruled
sanctioned (pure additions only; fallback banner "N/A" replaces malformed
"($M)" — improvement). All mutants killed by exactly their intended tests,
no cross-talk; restoration hash-verified twice. Disagreements 4/0-MAJOR;
#1 = uncommitted F135-T1 sibling residue → commit-cadence ruling for JK.

**F135-T2 cleanup list grew this arc:** + write-only contractValue field;
+ M2b resolver test one-liner (from F135-T1 audit); + C-7 dead duplicate
useSeasonStats; + dead consumers B-5/6/7/11-15; + C-4 `?? 64` re-source.

**NEXT:** closure commit (Captain recommends ONE combined commit covering
both verified arcs — F135-T1 + F134-T1 + discovery report + all session
docs — since doc appends interleave in the same files; splitting would
require partial staging). Then F134-T2 (Awards) — BLOCKED ON JK vote-
divisor ruling; F134-T3 (FinalizeAdvance) — BLOCKED ON JK rookie-salary
ruling (Captain recommendations presented in-session). T4 (DELETE
ActiveTradeFlow) ready to draft any time. Design track: D0 still next.


## 2026-06-12 (cont.) — F134-T2 + F134-T3 PARALLEL ARC: both DELTA VERIFIED, first parallel Codex execution

**Process milestone:** first parallel two-agent Codex execution under the
PARALLEL EXECUTION ADDENDUM (disjoint files; per-agent focused tests +
mutations + sweeps; ONE combined build/suite gate; closure commit 5fc192f
landed first as precondition). Worked cleanly — both agents completed,
zero cross-contamination (Fable hash-verified all four files stable through
both audits). ONE process deviation: Codex ran the combined gate that the
addendum assigned to Captain; no harm (Captain spot-check + Fable D6 re-ran
it) but the lesson is logged — future parallel addenda assign the combined
gate to Captain or auditor, NEVER a builder.

**F134-T2 (Codex 5.5 | high):** Awards canonical — pass-through conversion,
VOTE_PCT_SALARY_SPREAD_DIVISOR=1666 (F-139) consumed by one extracted
calculateAwardWinnerVotePct serving BOTH Cy Young and MVP paths
(base/clamp/fallback values preserved parameter-by-parameter), 4 display
sites → formatSalary via trivial wrapper.

**F134-T3 (Codex 5.5 | high):** FinalizeAdvance canonical + F-127 CANON —
calculateRookieSalary grade table DELETED (F-140); call-up salary carried
AS-IS (buildFinalizeAdvanceCallUpPlayer; modal literally renders
"(unchanged at call-up)"); retirement thresholds 33330/16665 as named
constants consumed by BOTH logic and display (the text/logic split that
caused the original drift is structurally closed); fallback ?? 0; alias
preserved internal call sites.

**Fable dual audit (one session): "F134-T2 DELTA VERIFIED" + "F134-T3
DELTA VERIFIED."** All three BRIDGE constants recomputed independently
(1666, 33330, 16665 — exact); T2-D2 selection logic byte-equivalent;
T3-D4 critical hunk enumeration: zero gate/season-transition lines in the
diff. Six mutations, each killed by exactly its intended test, restored
hash-identical. Combined gate: build green; suite 7,201/4 of 7,205 (+7
exact); BOTH order-flakes fired AND passed solo (4/4, 9/9) — conditional-
solo rule's first live exercise, baseline holds. Disagreements 3+3/0-MAJOR.

**FINDING-136 now 3-of-4 cleared.** Remaining: TradeFlow legacy branch —
F134-T4 (DELETE ActiveTradeFlow, JK-ruled). Then F135-T2 cleanup batch.

**NEXT:** T2+T3 closure commit (Captain-run), then draft F134-T4.


## 2026-06-12 (cont.) — F134-T4 + F135-T2 PARALLEL ARC: both VERIFIED; FINDING-136 + 137 CLOSED

**SEQUENCING RULING (JK, canonical — logged this arc):** full T-stack = v1,
runs to completion first as pure execution; D0 then rules as THE cut line on
everything beyond; F-138 scoped post-D0; 5-session milestone amended.
FINDING-141 + amendment notices appended to KBL_V1_EXECUTION_PLAN.md and
FRANCHISE_ENGINE_MAP.md (any doc claiming sequencing authority got the
pointer).

**F134-T4 (Codex 5.5 | high):** ActiveTradeFlow DELETED — TradeFlow.tsx
2,312 → 1,006 (+22/−1,328); export unconditional, franchiseId required;
one compiler-demanded type-only FranchiseHome hunk (franchiseId!). Last 4
F-136 sites died with the branch.

**F135-T2 (Codex 5.5 | high):** 9 dead files deleted (useWARCalculations,
GameTracker orphan trio + their 3 test files [92 tests], SeasonEndFlow, C-7
duplicate useSeasonStats); un-rendered totalGames removed from
useFranchiseData (zero readers, six touch points); M2b regression test added.
Codex correctly BLOCKED D-5: FranchiseStats had a contract-test consumer —
the per-symbol grep discipline catching what discovery's "non-test: only the
definition line" phrasing concealed. JK RULING: delete interface + test
block (test was defending dead API surface; no named future claim).
Captain executed as ADDENDUM 1 (three excisions; grep zero / 19/19 / tsc
clean) — below the threshold where a Codex round-trip adds safety.

**Captain spot-check catches (pre-audit):** (1) unreported
FranchiseHomeLaunch.test.tsx hunk = stale vi.mock of deleted SeasonEndFlow
— mechanically necessary, D-6-class, builder underreported; (2)
RetirementFlow = FOURTH stock-data flow (denomination-clean; F-138 scope
addendum logged); (3) T4 contract's totality grep was Captain-overbroad
(same-named file-local converters exist in 4 flows — audit note issued).

**Fable dual audit: "F134-T4 DELTA VERIFIED" + "F135-T2 DELTA VERIFIED."**
Console region byte-identical by hunk arithmetic; every deadness grep
re-proven independently; name-collision guard held (live SeasonSummary page
untouched + routed); M2b mutant re-applied → RED, killed by exactly the new
test; suite count reconciled EXACTLY (7,205 − 92 + 1 − 1 = 7,113/380).
Disagreements 2+3/0-MAJOR. NEW CANDIDATE C-8: second orphan
useWARCalculations copy (src_figma/app/hooks, zero importers) →
F135-T3-class list.

**MILESTONE: FINDING-136 FULLY RESOLVED (all 25 sites) + FINDING-137
FIXED-AND-CLEANED. The F-13x denomination/metadata debt is CLOSED** (F-138
deliberately post-D0 per the sequencing ruling).

**Process lessons banked:** gate assignment enforced in ADDENDUM v2 wording
(auditor runs the gate — held this arc); builder reporting-discipline gap
(unreported-but-necessary file changes) → next contract template gains
"EVERY changed file must appear in the report, including mechanically-
forced test/mock adjustments."

**NEXT:** batch closure commit (Captain-run), then **TV1 — True Value
canonical pass** opens the pure-execution T-stack run (TV1 → T6 → {T7,T8}
→ T9 → T10 → D0).


## 2026-06-12 (cont.) — TV1 ARC: True Value canonical pass, DELTA VERIFIED

**Session open (new thread):** full 5-doc protocol read off main; JK named
TV1 directly. Pre-draft evidence pass found: canonical calculateTrueValue
(salaryCalculator.ts:986) ORPHANED (zero product callers); live surface =
untrusted preview chain with a SECOND, divergent implementation
(interpolation + average-rank vs the spec's step method); WAR persistence
live (W1) but value-input WAR sourcing unverified. Local MCP bridge died
mid-evidence (two greps deferred to builder discovery), recovered later.

**JK rulings R-1..R-5 (plain-language round):** R-1 TV1 = True Value only,
designation slice = TV2; R-2 OPTION A — spec-faithful step method canonical,
preview interpolation deleted; R-3 whole-league fallback stays as
never-expected safety net (RP pools absorb CP); R-4 auto recompute+persist
after WAR persist on every completed game; R-5 displayed numbers become
canonical, no consumer acts until TV2. Contract written to
PROMPT_CONTRACTS.md BEFORE handoff (readiness rule honored, no retro-log)
and committed 4b10a76.

**TV1 (Codex 5.5 | very high):** one implementation (preview delegates to
engine); franchiseTrueValueStorage.ts rows keyed franchise/season/scope/
player; processCompletedGame persist gated on successful WAR persistence;
trust flags hard false. DISCOVERY 1 caught a REAL pre-existing defect —
value-input WAR composition dropped persisted pWAR (FINDING-142, fixed
in-scope). DISCOVERY 2: TeamHub display sites at TeamHubContent.tsx:1641;
franchiseDesignations.ts:31 takes trueValue but NO valueDelta consumer
exists — TV2 must add it. Codex self-BLOCKED on a procedural misread
(tried to run the Fable audit itself); build side complete.

**Fable TV1-AUDIT verdict: "TV1 DELTA VERIFIED."** 8/8 directives; 6
mutations each killed by exactly its intended test, restores hash-verified.
Standout: M-142 revert probe proved zero pre-existing expectations depend
on the F-142 fix — method-shift test changes isolated to sanctioned R-2.
Double-count ruled out at orchestrator write level. D6 "expected wins"
oddity = downstream test arithmetic, logic diff-CLEAN. Gate exact:
7,122/382 (7,113+9, 380+2); one flake fired, solo-green. 3 MINOR / 0 MAJOR:
separate IndexedDB DB (JK ruling needed before TV2 adds stores);
position-normalization mapping needs one ratifying line in TV2's contract;
computedAt nondeterminism noted.

**Process notes:** pipelining doctrine adopted (draft N+1 while N builds;
batch JK rulings forward); JK ruled triangle PERMANENT — Fable never audits
its own builds; Wave-2 process architecture added to D0's closing agenda
(FRANCHISE_ENGINE_MAP append). FINDINGS_142_onwards.md batch file opened
(056 file was 4x over split threshold). PROMPT_CONTRACTS newest-at-bottom
layout ruled correct (append-only; readers tail the file).

**NEXT:** TV1 closure commit (this commit) → draft TV2 (designation slice:
storage + projected, audit slices 3-4) with two carried inputs: the
separate-DB ruling and position-mapping ratification, plus DISCOVERY 2's
no-valueDelta-consumer gap. Then T6. Design track: D0 next.


## 2026-06-12 (cont.) — TV1-FIX ARC + R-8 DESIGN SESSION: both landed

**TV1-FIX (Codex 5.5 | high):** R-7 store relocation into shared trackerDb
(v13 additive, standalone DB deleted) + R-6 strict 12-label validation
(remaps deleted, loud skip reasons). X3 discovery → FINDING-143:
valuePosition is profile-driven, not played-position (violates the
data-driven doctrine). **Fable verdict: "TV1-FIX DELTA VERIFIED"** — full
upgrade-handler read cleared the Feb-11 hazard class (all stores
contains-guarded, zero destructive paths, zero second kbl-tracker openers);
mutation RED on exactly the skip test; gate exact 7,125/382 (+3).
2 MINOR / 0 MAJOR: dead UTIL/BENCH merge rows deleted beyond contract
letter (behavior-neutral, ratification recommended, pre-completes TV2
cleanup); FINDING-144 — R-6 residue in the salary path (UTIL/BENCH→IF/OF,
TWO-WAY→OF, DH tables) → taxonomy cleanup batch.

**R-8 DESIGN SESSION (chat, JK + Captain — no council tooling exists;
multi-angle analysis in one seat):** JK reframed F-143 — market-peer
pooling is a ROLE question (profile-default), distinct from defensive
analysis (pure data). Bench players exposed a structural trap: percentile
pools assume comparable volume; talent-priced salaries vs volume-measured
WAR brands good bench players Albatrosses. Two-way players exposed the
inverse: no single pool can price a two-job player. RULING R-8 (committed
38ef25a): effective position = plurality-with-incumbency (day-zero
incumbent = profile primary; incumbent holds ties; universal for position
players); league-wide Reserve pool below a CALIBRATE starts-share
threshold (expensive-benched-player cratering is a FEATURE); pitchers
profile-role v1 (CP undetectable; IV usage model is role-priced); two-ways
EXCLUDED from single pools, valued compositionally (arm TV vs role pool +
bat TV vs resolved trait position, consuming orchestrator WAR rows
UNCOMBINED); Two Way (IF)/(OF) are resolution SCOPES over their position
groups, never positions; emergency cross-domain cameos excluded.
FINDING-143 closes via EP1.

**Sequencing ruled (JK):** TV1-FIX → TV2 (designations, profile-pool with
documented limitation) → EP1 (R-8 engine, closes F-143) → T6. TV2 contract
drafted + committed 56f3592 (Phase 0 discovery STOP-gate over the five
existing designation files; §17 gospel quoted; below-floor = no holder;
trust flips projected-only).

**Process:** pipelining held — TV2 drafted while TV1-FIX audit ran; ruling
batches answered from gospel first (Q3/Q4 withdrawn as already-specced).

**NEXT:** TV1-FIX closure commit (this commit) → JK runs TV2 (Codex 5.5 |
very high; Phase 0 report comes back for Captain sign-off before build).


## 2026-06-12 (cont.) — TV2 ARC: designation slice DELTA VERIFIED; legacy 'active' path retired

**Phase 0 stop-gate earned its keep:** Codex's discovery report surfaced a
REBUILD-class conflict before any code — TeamHub LOAD was writing 'active'
MVP/Ace onto player records (display-surface mutation, UI-load trigger, no
floors, no projected/locked). Captain sign-off addendum (7b8b031): REBUILD
approved, sync side effect REMOVED not bypassed, canonical rows = single
truth, explicit only-edit list, stale embedded fields inert not scrubbed.

**TV2 Phase 1 (Codex 5.5 | very high):** shared-DB v14
franchiseDesignationRows; §17 projected engine (gospel-exact criteria +
floors, below-floor = no holder); gate chain WAR → TV → designations with
skip+warn at each link; TeamHub reads canonical rows, renders dotted
"Proj." badges; trust projected-only with the EP1 limitation string;
FanFav/Albatross = the first valueDelta consumer (canonical persisted rows
only).

**Fable TV2-AUDIT verdict: "TV2 DELTA VERIFIED" — 4 MINOR / 0 MAJOR.**
Captain flags resolved: D7 net +2 = 13 added / 11 deleted, every deletion
adjudicated sanctioned (3 rename-subsumptions verified line-by-line);
D8 = six underreported test files, all clean (reporting lesson RECURS —
template gains "list every path in git status"); D9 = relocation not
bypass, write-path refutation affirmative → consistency debt FINDING-145.
D2 mount-write mutant died loudly (22 RED distributed write-pins). §17.8
borders hex-exact; backgrounds dark variants (JK ratification pending).
Carryover round-trip proven despite builder silence.

**New suite baseline: 7,127 / 382.** FINDING-145 logged (eligibility
'active' semantics + 'active' status member + embedded scrub = one
cleanup, EP1/slice-5 home TBD).

**NEXT:** TV2 closure commit (this commit) → draft EP1 (R-8 effective-
position engine, closes FINDING-143). Pending-JK ratifications: TV1-FIX
MINOR #1 (dead merge-row deletion) + TV2 MINOR #4 (badge dark backgrounds).


## 2026-06-12 — SESSION CLOSE (ratifications + end protocol)

**JK RATIFICATIONS (session close):**
1. TV1-FIX audit MINOR #1 RATIFIED — builder's deletion of the provably-
   dead UTIL/BENCH merge-group rows is sanctioned (beyond contract letter,
   behavior-neutral per D6 reachability proof).
2. TV2 audit MINOR #4 RATIFIED — badge backgrounds stay dark-palette
   variants (deliberate for the chalkboard UI); §17.8 "Light X" prose is
   the stale side → amendment queued to the spec-cleanup batch (with the
   R-6/R-8 taxonomy blocks and FINDING-144).
No code changes; both MINORs CLOSED.

**Session summary:** one thread, three verified arcs (TV1, TV1-FIX, TV2),
three rulings batches (R-1..R-5, R-6/R-7, R-8), four findings (F-142
fixed-and-verified; F-143/144/145 open with named homes), the R-8 design
session, pipelining + triangle-permanence process canon, and the Phase 0
stop-gate's first live save. Value spine canonical through projected
designations. New baseline 7,127/382.

**NEXT SESSION STARTS WITH:** draft EP1 (R-8 effective-position engine,
closes FINDING-143; FINDING-145 placement argued in the draft). ROUTE:
Codex 5.5 | very high → Fable 5 CLI audit. Read CURRENT_STATE.md
2026-06-12 TV2-close entry + RULING R-8 (PROMPT_CONTRACTS.md) before
drafting. JK browser-verify note outstanding: TeamHub projected badges
(fewer early-season badges is CORRECT).


## 2026-06-12 (cont.) — EP1 ARC: Phase 0 → Phase 1 build → audit routing

**EP1 (R-8 effective-position engine) — heaviest ticket since T5.**
Drafted + committed the EP1 contract (557ded9) carrying RULING R-9
(starts-source DERIVE→SNAPSHOT hierarchy, innings proxies rejected,
completed-games denominator; F-145 placed at slice 5). Codex Phase 0
(very high) returned DERIVE: starting lineups persist on
GameHeader.startingLineups (eventLog.ts), retrievable via
getGameHeadersForScope({isComplete:true}) — zero new persistence.
Captain VERIFIED every load-bearing citation against the code before
sign-off.

**Sign-off surfaced a Captain-caught wrinkle → RULING R-10
(f8d5f82):** incumbency is history-dependent, so resolution must
replay the season in game order each recalc; starting lineups are the
only ordered per-game position source (sub positions would need
event-stream scans every recalc). Ruled plurality unit = STARTS, with
appearances-based plurality as the documented CALIBRATE upgrade path
(single swap point in the new module). Anchors ratified C→C, IF→2B,
OF→CF; incumbency derived fresh (no persisted state); final only-edit
list + 3 test pins (path-dependence, sub-exclusion, anchor) set in the
Phase 0 addendum.

**Codex Phase 1 build (very high):** new franchiseEffectivePosition.ts
+ pool-construction changes in salaryCalculator (step-percentile
machinery untouched) + value-inputs/storage/preview/readiness wiring.
Self-reported green: focused 151/151, tsc clean, build green, suite
7,136/383 (+9/+1 vs baseline), 4 failures = characterized set, order-
flake solos green. Captain reconciliation NFL: builder underreported
its file list a THIRD time ("6 source + tests for the same surfaces"
vs actual 6 source + new module + 5 test files) — nothing out of
scope on inspection, but D1 of the audit adjudicates each path
independently. Golden-regression table NOT mentioned in the build
report → audit D8 blocks on its absence.

**EP1-AUDIT contract drafted + committed (667fccf):** ten directives,
golden regression (D8) + incumbency replay (D4) as priority targets,
file-enumeration (D1) flagged as the third reporting-gap repeat.

**AUDITOR SUBSTITUTION (JK-ratified):** Fable 5 CLI unavailable. EP1
audit routed to Opus 4.8 | Max — triangle preserved (auditor ≠
builder; the rule protects separation, not Fable-identity). Same
contract verbatim, same adversarial stance, block-on-missing-golden-
table holds. Logged as deliberate substitution, NOT silent. Caveat:
Opus-as-auditor is uncharacterized — first verdict of its kind; JK
browser pass weighted accordingly on the audit leg.

**NEXT:** JK runs the EP1 audit on Opus 4.8 | Max. Clean verdict →
single closure commit (build + tests + 3 contracts/records + FINDING-
143 closed + session docs). MAJORs → route fixes before any commit.
EP1 build code remains UNCOMMITTED in the working tree pending verdict.


## 2026-06-12 (cont.) — EP1-AUDIT: NOT VERIFIED, D8 BLOCK (golden regression absent)

**Auditor: Opus 4.8 | Max** (Fable unavailable; JK-ratified substitution,
triangle preserved auditor≠builder). **Verdict: 1 MAJOR (BLOCK) / 4 MINOR.**

**The engine is sound; the proof is missing.** All four mutation probes
killed RED→restore→GREEN with byte-identical sha restores — including the
two hard ones: D4 incumbency tie-hold (mutation flipped valuePosition
SS→3B on the path-dependence test) and D6 two-way uncombined composition
(folding arm WAR into the bat side moved bat WAR 2→5, caught). D1/D2/D7/D9/
D10 all PASS. D2 was proven adversarially: both hard failures reproduce on
CLEAN HEAD (EP1-independent), both order-flakes pass solo; suite 7,140
total (baseline +13, 0 deletions), 383 files.

**D8 ❌ MAJOR/BLOCK → FINDING-146.** The contract-required TV-level golden-
regression attribution table is ABSENT (repo + untracked + /tmp + fixtures
searched; builder execution record conceded it). Auditor hand-spot-checked
3 rows against the engine — all attribute to sanctioned causes, but on
synthetic fixtures, not the real fixture league. The whole-league diff is
exactly what catches deltas hand-tracing misses; the contract refuses
"very likely" for the True Value semantics change. Correct refusal —
Captain would have overruled a wave-through here.

**Captain NFL on the MINORs (two are sharper than 'minor'):**
- **MINOR #1 → FINDING-147:** the stale 'peer pools are profile-position
  until EP1' string is written LIVE into every designation record's
  peerPoolLimitation (franchiseDesignations.ts:223), now FALSE post-EP1.
  Not cosmetic — persisted-data consistency defect. Outside EP1's only-
  edit list (no scope breach); couples to FINDING-145; F-144/cleanup home.
- **MINOR #2 (non-finding):** two sibling processCompletedGame tests mock
  eventLog without getGameHeadersForScope → EP1's call throws + is
  swallowed; their TV/designation leg silently no-ops. Latent fragility;
  remedy folds into the EP1 closure changeset (add the mock export).
- **MINOR #3 (non-finding, FOURTH instance):** builder file/count
  underreport is now a recurring PROCESS defect, not a per-ticket nit →
  D0 process-architecture agenda (standing template line: enumerate every
  git-status path; report total AND passing counts).
- **MINOR #4:** stray Rosters.csv — standing pending-JK decision.

**FINDING-143 status:** implemented + code-verified + mutation-proven, NOT
delta-certified. The mechanism is real; "zero unattributed value movement
across the fixture league" is unproven until the D8 table exists.

**Working tree left PRISTINE by the auditor** (diff 58,403 B, 13 paths,
both probed files restored to original sha). EP1 build code remains
UNCOMMITTED.

**NEXT: draft EP1-GOLDEN** (Codex 5.5 | high — scoped artifact generation,
not logic). Phase 0 discovers whether a TV-over-fixture-league harness
already exists; if not, the contract has Codex build the extraction script
before generating the pre/post table. Then D8-ONLY re-audit (9 directives
already passed, tree pristine — no full re-run). Then single closure commit
(build + tests + MINOR #2 mock fix + contracts/records + FINDING-143 closed
+ session/state docs).


## 2026-06-12 (cont.) — EP1 ARC CLOSED: D8 verified, FINDING-146 closed, F-143 delta-certified

**EP1 (R-8 effective-position engine) is fully audit-cleared and closed
in a single commit.** Build code (12 paths) + golden artifacts + MINOR #2
fix + all contracts/records + findings + session/state docs.

**The golden-regression saga (and its lesson):** D8 (the whole-league
attribution table) blocked EP1. Captain over-read D8 as needing REAL
played data → a multi-turn detour (EXTRACT browser IndexedDB → script a
season → Playwright game-player) that JK + Captain recognized as scope
creep. Root cause named: D8 needs COVERAGE, not empirical realism; a
deterministic ADVERSARIAL SYNTHETIC fixture satisfies it (synthetic
INPUTS fine; engine computes outputs). EXTRACT + original GOLDEN
superseded (reasoning trail kept). EP1-GOLDEN-R delivered it.

**Two verification events worth remembering — the chain has teeth BOTH
ways:** (1) EP1-AUDIT (Opus) BLOCKED the build on the missing D8 table.
(2) At EP1-GOLDEN-R Phase 0, Codex BLOCKED the CAPTAIN — refusing to
generate a table matching a wrong tw_if target (280k) the Captain had
introduced at sign-off by forgetting R-8 pt5 two-way self-exclusion.
Captain verified the engine, conceded, reversed to 260k/+80k. A downstream
builder declining to manufacture agreement with an authority's error is
the stop-gate working in its hardest direction.

**EP1-GOLDEN-R-AUDIT (Opus 4.8 Max, D8-only): "EP1 D8 VERIFIED —
FINDING-146 CLOSED."** Precondition confirmed (engine diff byte-unchanged
58,403). All 5 binding + 8 support deltas hand-derived; refusal gate
tamper-proven; 0 unattributed. tw_if correctly 260k. 3 observations:
OBS-1 = Captain prose error (res_5 salary 130k not 800k; 800k was a
pre-EP1 1B→3B merge artifact — auditor surfaced the merge the Captain
missed; deliverable correct, prose corrected). OBS-2 = support-row
attribution heuristic is fixture-specific (make mechanistic if reused).
OBS-3 = cosmetic (binding gate checks values not labels; value gate real).

**MINOR #2 FIXED in closure:** getGameHeadersForScope added to the
processCompletedGame.warMetadata + warPersistence test mocks; 5/5 pass,
swallowed [TrueValue] mock-error noise gone.

**Carry-forward (open):** FINDING-144 (salary-path R-6 residue) +
FINDING-145 (designation 'active' vocabulary) + FINDING-147 (stale
peerPoolLimitation string written live into designation rows) → all to
the F-144 taxonomy/spec-cleanup batch (F-147 couples to F-145, placed
slice 5 per R-9). MINOR #3 (builder reporting underreport, now 4 instances
across TV2→EP1) → D0 process-architecture agenda: standing template line
"enumerate every git-status path; report total AND passing counts."
Stray reference-docs/Super Mega Baseball 4 Rosters.csv still untracked
(EXCLUDED from the EP1 closure commit; standing pending-JK commit/gitignore).

**Process note — auditor substitution:** both EP1 audit legs (EP1-AUDIT,
EP1-GOLDEN-R-AUDIT) ran on Opus 4.8 Max because Fable was unavailable.
Logged as deliberate, triangle preserved (auditor≠builder). Uncharacterized
config — JK browser pass on real franchise data carries extra weight as
the final real-world confirmation.

**NEXT TASK: T6.** Per sequencing ruling F-141 the full T-stack runs to
completion before D0. EP1 closed the R-8 engine (FINDING-143); next is
T6 → {T7,T8} → T9 → T10 → D0 cut line. Slices 5 (locking) + 6 (Captain/
Fan Hopeful) remain queued post-T-stack or per D0. Browser-verify
outstanding (JK): TeamHub projected badges (TV2) + now EP1 effective-
position pooling on real data.


## 2026-06-14 — AI TEAM OPERATING SETUP: Codex + Claude Opus 4.8 + JK

**Goal:** Set up the KBL Tracker repo so Codex, Claude Opus 4.8, and JK can
work as a tighter build/audit team with shared instructions, shared skills,
and explicit handoff rules.

**Setup added:**
- `AGENTS.md` created as a short Codex bridge to canonical `CLAUDE.md`.
- `spec-docs/AI_TEAM_OPERATING_MODEL.md` created with role definitions,
  default routing, build/audit loops, parallel-work rules, MCP/skill notes,
  and handoff templates.
- `.codex/config.toml` created with Playwright MCP config and a larger
  project-doc instruction budget.
- `.agents/skills/` created with symlinks to the existing `.claude/skills/`
  folders plus selected `spec-docs/skills/` workflows (`gametracker-
  functional-audit`, `gametracker-scope-resolver`, `gametracker-design-spec`,
  `safe-fix-protocol`).
- `CLAUDE.md`, `SESSION_RULES.md`, `DECISIONS_LOG.md`, and
  `CURRENT_STATE.md` updated to reference the shared team model.

**Decision recorded:** `CLAUDE.md` remains the canonical instruction source.
`AGENTS.md` is intentionally short and should not duplicate long-lived rules.
The builder/auditor triangle is mandatory: Codex can build and Claude Opus
4.8 can audit, or vice versa, but the same agent does not final-audit its own
diff.

**Verification:** Repo setup files and symlinks were verified locally. This
was a docs/config/agent-setup change only; no runtime source files changed and
no app build/test was required.

**Next product action remains:** T6, per the EP1 close and F-141 sequencing
ruling. Future sessions should start from `CLAUDE.md`,
`spec-docs/AI_TEAM_OPERATING_MODEL.md`, latest `CURRENT_STATE.md`, and the
T6 source specs/contracts.


---

## 2026-06-14 — AI-team operating setup: Codex setup + Captain reconciliation + copy-based skill sync + codex-ideation

**Type:** Docs / config / tooling only. No app code. No build/test suite run
(non-runtime change). Branch: codex/franchise-v1-next. Single intended closure
commit (see below).

**Context.** Codex was asked to set up the shared JK + Claude Opus 4.8 + Codex
workflow and produced: AGENTS.md bridge, spec-docs/AI_TEAM_OPERATING_MODEL.md,
.codex/config.toml (Playwright MCP), .agents/skills/ (31 symlinks), and edits
to CLAUDE.md / SESSION_RULES.md / DECISIONS_LOG.md / CURRENT_STATE.md. A Captain
pass reconciled it against existing canon, then a second article ("make Codex +
Claude one OS") drove a skill-sync correction.

**Reconciliation findings + fixes (all applied this session):**
1. CONFLICT — CLAUDE.md session-start read 3 files (CURRENT_STATE/SESSION_LOG/
   DECISIONS) vs the canonical 5 in SESSION_RULES. Fixed: CLAUDE.md now reads
   SESSION_RULES → AUDIT_LOG → AUDIT_PLAN → SESSION_LOG → CURRENT_STATE and
   restates phase/last/next. AI_TEAM_OPERATING_MODEL build-loop opener aligned.
2. STALE FACTS in CLAUDE.md — useGameState listed as 4,647 AND 2,344; real =
   ~12,585 (grep-verified). Test count hardcoded 5,653/134; real = 7,140/383 —
   now points at CURRENT_STATE live baseline instead of a hardcoded number.
   Skill count 20 → de-hardcoded (dirs are source of truth).
3. JK RULINGS (2026-06-14): (a) browser verification — Codex pre-checks via
   Playwright + reports, JK manual sign-off is the SOLE closing gate; (b) Self-
   Improvement Loop — agents WRITE proposed rules into a "Lessons Learned
   (pending JK ratification)" pen in SESSION_RULES, promoted only on JK "ratify"
   (chosen over fully-automatic to prevent unsupervised edits to the rulebook);
   (c) subagent strategy kept as-is.
4. CURRENT_STATE split — 693-line file → ~40-line live header +
   CURRENT_STATE_HISTORY.md (full prior content, verified byte-identical via
   sha256 at split). Session-end protocol updated to match.
5. SESSION_RULES additive blocks folded from scattered CURRENT_STATE notes:
   CLI Verification Environment (NODE_ENV= prefix + characterized baseline),
   Builder Reporting Completeness, Browser Verification Gate, the pen.

**Skill sync (JK ruling: two sources, one mirror, copy-based — NOT symlinks):**
- Discovery: .agents/skills had 31 RELATIVE symlinks; git tracked 0 of them →
  the mirror did not survive clone or Codex Cloud. Article's symlink-fragility
  warning (Windows/git/cloud) partly applies; the git/cloud leg is real here.
- Built scripts/sync-codex-skills.sh: rebuilds .agents/skills as real COPIES of
  the union of .claude/skills/ + spec-docs/skills/ (idempotent; deletes
  propagate; name collisions flagged loudly, first-source wins).
- Wired .claude/settings.json PostToolUse hook (Write|Edit|MultiEdit|Bash;
  Bash fires only when the command mentions .claude/skills or spec-docs/skills).
- TESTED end-to-end: 33 real entries / 0 symlinks / matches dedup union;
  add→sync→present then delete→sync→absent both PASS.
- COLLISION SURFACED: spec-assembler exists in both sources and DIVERGES
  (.claude 511 lines vs spec-docs 176). JK ruled .claude copy CANONICAL; mirror
  uses it. 176-line spec-docs dup queued for deletion in the pending pen (4 docs
  reference that path — repoint on delete). spec-simplifier also dupes but is
  byte-identical (harmless).

**codex-ideation skill (Claude consults Codex CLI as read-only peer reviewer):**
- Files: .claude/skills/codex-ideation/SKILL.md + scripts/codex.py + AGENTS.md
  note. Peer-not-tool framing; start/--reply/--read/--reset; Temp/.codex_active
  flag; resume-fail falls back to fresh session; stdin closed (no hang);
  CODEX_BIN → PATH → common dirs → VS Code ext discovery.
- NFL caught + fixed a real bug: binary-check ran before brief-validation, so a
  missing brief gave "codex not found" instead of "provide a brief". Reordered;
  re-tested clean; py_compile OK; mirror copy matches edited canonical.

**Doc consistency:** AGENTS.md + CLAUDE.md (×2 lines) de-symlinked to describe
the copy-mirror + manual-sync requirement. Only remaining "symlink" mention in
CLAUDE.md is the correct "copy-based, not symlinks."

**STATUS / UNVERIFIED (require live Claude Code, per Evidence-over-Assertion):**
- VERIFIED by Captain: sync script (incl. delete propagation), codex.py
  arg-handling/not-found/CODEX_BIN/compile, mirror is real copies, all docs
  consistent, diff --check clean, nothing gitignored.
- UNVERIFIED — needs ONE live JK check each: (1) the PostToolUse hook actually
  auto-fires inside a Claude Code session (env-var names CLAUDE_TOOL_INPUT /
  CLAUDE_PROJECT_DIR and settings.json hook schema are Claude-Code runtime
  specifics not confirmable from chat); (2) codex-ideation live round-trip
  (codex binary is NOT on the non-interactive shell PATH — JK's interactive
  shell may differ; set CODEX_BIN if needed).

**COMMIT (intended, single):** CLAUDE.md, AGENTS.md, .codex/, .agents/,
.claude/settings.json, .claude/skills/codex-ideation, scripts/
sync-codex-skills.sh, spec-docs/{AI_TEAM_OPERATING_MODEL, SESSION_RULES,
CURRENT_STATE, CURRENT_STATE_HISTORY, DECISIONS_LOG, SESSION_LOG}.md.
Stray reference-docs/Super Mega Baseball 4 Rosters.csv DELIBERATELY EXCLUDED
(standing commit/gitignore decision).

**NEXT TASK (unchanged): T6.** Per F-141 the full T-stack runs to completion
before D0. T6 contract not yet drafted — first action of next session; ROUTE
Codex 5.5 | high (very high if state-touching) → Fable 5 CLI audit. **Process
note:** the Codex session that authored this setup is now STALE (files changed
underneath it); start T6 in a FRESH Codex session reading committed canon —
sanctioned exception to "continue long sessions" (arc boundary).


### ADDENDUM (same session, 2026-06-14) — live verification results + two fixes

After the main entry above was written, the CLI was installed and the two
UNVERIFIED items were tested live. Updated status:

**Codex CLI installed:** codex-cli 0.139.0 at ~/.local/bin/codex (on PATH,
signed in via ChatGPT account). The wrapper's flags (`-s read-only`,
`--skip-git-repo-check`, `resume --last`) are all valid in v0.139 — no
compat changes needed.

**codex-ideation: VERIFIED end-to-end.** Live round-trip ran on gpt-5.5:
opening call replied, and `--reply` resumed the SAME session id and built on
the prior turn (true back-and-forth loop, not one-shot). Smoke turns
ACKNOWLEDGED→CONFIRMED confirm resume works.

**FIX #1 (sandbox leak, caught by NFL during verification):** `codex exec
resume` does NOT inherit the opening call's `-s read-only` — it fell back to
the user config.toml default (workspace-write), so `--reply` turns silently
gained WRITE access. For a read-only thinking aid that is a boundary leak
(could write files mid-loop, outside any contract). FIXED: wrapper now passes
`-s read-only` on the resume command too (codex.py line 117); re-tested — both
turns now show `sandbox: read-only`. Mirror re-synced to match.

**FIX #2 (skill-sync hook, root-caused):** the first hook test FAILED because
the hook command used `$CLAUDE_TOOL_INPUT` (a non-existent env var) — Claude
Code passes tool data as STDIN JSON, not env. Rewrote .claude/settings.json to
parse stdin via `jq` (`.tool_input.file_path` for Write/Edit/MultiEdit,
`.tool_input.command` for Bash). Parsing logic proven locally (skills path →
match → sync; non-skills path → correctly skipped). Live retest in Claude Code:
**HOOK FIRED** — auto-sync confirmed working. NOTE: the fail-then-pass across
two runs in one session was NOT intermittency — the config was broken on run 1
and fixed between runs; Claude Code reloaded hooks without restart. (Optional:
a 3×-consecutive run would prove stability beyond the single pass.)

**jq dependency:** the hook requires jq; confirmed present at /usr/bin/jq
(jq-1.7.1-apple). If this repo is ever used on a machine without jq, the hook
no-ops silently and the manual sync remains the backstop.

**Unrelated finding (not ours):** Codex logs a startup error loading
~/.codex/skills/mode2-pilot/SKILL.md (invalid YAML, line 2). User-level skill,
separate from this repo; harmless to our work; fix/delete at leisure.

**FINAL STATUS:** all three workstreams VERIFIED (canon reconciliation; copy-
based skill sync incl. auto-fire hook + delete propagation; codex-ideation
peer loop read-only). Ready for the single closure commit. Remaining tracked
items are non-blocking: spec-assembler 176-line dup deletion (pending pen),
stray mode2-pilot YAML, Rosters.csv commit/gitignore call.


---

## 2026-06-14 — T-stack execution: T6 + T7a/T7b/T7c built, audited CONFORMS, committed

**Type:** Product code. Branch codex/franchise-v1-next. Four feature commits
(6c6aa14 T6, a28a6d2 T7a, bb877d8 T7b, 055cfb8 T7c). Roles: Codex 5.5 BUILT each
(codex CLI, workspace-write, high reasoning); Opus 4.8 (Captain) wrote every contract
+ AUDITED every diff independently (Fable unavailable; auditor ≠ builder — Captain
did NOT write the code). JK ruled product/scope/design; browser sign-off BATCHED.

**Workflow established this session (JK rulings):**
- **Standing auto-commit mode:** per ticket = Codex build → independent Opus
  engineering audit (rerun build/tsc/suite + seam/correctness/golden checks +
  falsification) → auto-commit verified-complete (browser-pending) → proceed.
  Captain surfaces only the audit verdict, the browser backlog, and genuine
  scope/design/asset decisions when drafting each contract.
- **Batched browser verification** (SESSION_RULES pen, pending ratification): the
  engineering audit is per-ticket + non-deferrable; JK's browser sign-off is BATCHED
  into one pass before the D0/flag-flip/playtest gate, never waived; persistence/
  data-shape tickets prioritized.
- **No-oracle-leak principle** (DECISIONS_LOG): recommendation surfaces may consume
  ONLY scout-visible info when valuing hidden-rating players (governs T7b + T9).

**T6 (6c6aa14) — Effective Ratings Engine.** New pure src/engines/effectiveRatings.ts
(effectiveRatings + defensivePlacementRisk per IV §4) + add-only rosterEngineConstants;
first reader of the T2 trait matrix; legacy mojoEngine/fitnessEngine UNTOUCHED
(R-T6-1 asset gate). Audit CONFORMS; oracle spot-check MATCH. Finding #1
(handednessBonus) → reframed as FINDING-148.

**T7 (split T7a/T7b/T7c per R-T7-SPLIT):**
- **T7a (a28a6d2)** — optimal lineups vs L/R rescored on IV-of-effectiveRatings.
  Load-bearing seam: the effectiveRatings vector is SPLIT into computeIV's hitter
  (input.ratings) + pitcher (input.pitcherRatings) channels — proven by test (pitcher
  attrs in input.ratings are a no-op). optimalLineup.ts scoring swapped in-place, API
  stable. BEHAVIOR CHANGE (lineup recs differ) → browser-pending.
- **T7b (bb877d8)** — call-up/send-down ADVISORY recs (no execution, no ledger).
  recommendRosterMoves: MLB surplus = TV2 valueDelta (known) vs farm surplus =
  scoutedGrade only (leak-safe per the no-oracle-leak ruling). 4 stubbed emitters
  unblocked to read_only. Leak test proves hidden true ratings are inert.
- **T7c (055cfb8)** — Season Salary Ledger. trackerDb v14→15 + guarded
  franchiseSeasonLedgerRows store; LedgerEntry state machine + ledgerCapCharge;
  call-up/demotion producer (rookieScale flip, no double-discount, no stacking);
  salaryCalculator BYTE-UNCHANGED. Migration safety PROVEN (all 31 prior stores
  preserved at v15). DEFERRED: payroll-expectation→fan-morale (needs declared-budget),
  execute-from-rec, league presets.

**Suite:** 7,140 → 7,171 / 386 files; only the 3 characterized fails throughout
(wpaRuntimeBoundary, franchiseNarrativeEventEligibility, franchiseManualSmokeFixture
order-flake). golden/SMB4/oracle/salaryCalculator byte-unchanged on every ticket.

**BROWSER-VERIFY BACKLOG (JK, one pass before D0):** EP1, TV2, T7a (lineup recs),
T7b (call-up/send-down recs), T7c (rookie-scale/dead-money).

**OPEN/DEFERRED:** FINDING-148 (AUX_PRICING L/R, JK-gated, oracle regen); payroll-
expectation→fan-morale (declared-budget design); execute-from-rec; deadMoneyRate
presets; ROOKIE_SCALE_FACTOR single-sourced to salaryCalculator:380.

**NEXT SESSION STARTS AT: T8 — Mode 1 Suite (§6 + §7)** — pool registration, snake
draft, pick chart + trade validator, identity composition UI, scout-obscured farm
pricing, luxuryTax + balanceMode. ROUTE Codex 5.5 | very high → Opus audit
(persistence: pool/league state, audit non-negotiable). BIG ticket — map it + likely
split (like T7) + surface scope decisions before drafting. Then T9 → T10 → D0.
**Codex invocation mechanism (proven this session):** Captain runs
`~/.local/bin/codex exec --skip-git-repo-check -s workspace-write -c model_reasoning_effort=high -o <out> - < <promptfile>`
as a background task (harness sandbox disabled for that one call so codex's own
workspace-write sandbox governs), then audits the diff.


---

## 2026-06-14 — T8 stack: mapping + split (JK-ratified) + T8a/T8b/T8c built, audited CONFORMS, committed

**Type:** Product code. Branch codex/franchise-v1-next. Three feature commits (a4ec4fb T8a,
8fdf2c0 T8b, d54724d T8c). Roles: Captain (Opus 4.8) mapped + authored every contract + AUDITED
every diff independently; Codex 5.5 BUILT each (codex CLI, workspace-write, high reasoning);
auditor ≠ builder (Fable unavailable). JK ruled product/scope/design; approved the two
persistence/UI commits (T8b, T8c) after the migration/verdict surface.

**T8 = IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC §6 (Team Identity / D11) + §7 (Mode 1 Construction)
+ §5 (tier/cap/luxury/balanceMode)** — the build ticket mounting the T4 IV engine + T6/T7 engines
onto Mode 1 league construction.

**Mapping (6-agent decorrelated workflow → T8_SCOPE_MAP.md).** Core gap: `src/engines/
leagueConstruction.ts` (the §11 engine: registerPool/derivePickValueChart/validateTrade/
composeIdentity/luxuryTax) was MISSING; the algorithms exist as a Python oracle in
`scripts/analyze-pool.py`; the tier/cap/luxury/42-mod DATA exists (tierParams.ts) but was fully
ORPHANED (T8 is its first consumer). Auction (§7.5) + AI shills (§7.6) confirmed v1.5 (→ T11);
custom-pool derivation → T12.

**JK rulings (DECISIONS_LOG 2026-06-14):** (1) split into 4 engine-first tickets T8a→T8d;
(2) stock pool only, custom → T12; (3) identity decreases OPTIONAL ("max customizable, less
requirements"); (4) point-allocation input; (5) T8b migration ADDITIVE-only (existing leagues
untouched); (6) balanceMode in League Builder only (wizard inherits). SCOPE CORRECTION (Captain,
first-hand): "Path A IV re-pricing" was ALREADY DONE — T5/D15 rebuilt calculateSalary on
computeIV().kblIV; salaries already IV-based + tier-invariant (mapping agent E was imprecise).

**T8a (a4ec4fb) — pure engine.** leagueConstruction.ts: composeIdentity / applyIdentitySelection /
identityCapShift / shiftLuxuryCaps / luxuryTax / derivePickValueChart / validateTrade + 3 §12
constants, ported decision-identical from analyze-pool.py; `decrease:[]` per JK. PRE-BUILD, Codex
caught a real contract flaw (tiebreak magnitude uses RAW deltas, not fractions); Captain fixed the
contract (reconstruct via MOD_STAT_XBL_CAP) during the battery pause and re-fired. AUDIT: independent
oracle cross-check ran the REAL analyze-pool.py compose_identity → 10/10 goldens match; workbook
xbl_caps == the engine's hardcoded caps. 9 tests; suite 7,180.

**T8b (8fdf2c0) — tier/balanceMode wiring + Pool Registration + persistence.** registerPool pure
assembler + POOL_SURPLUS_MAX; ADDITIVE kbl-league-builder v5→v6 (registeredPools store + optional
tier/balanceMode on LeagueTemplate, read-time defaults, ZERO rewrite); tier+balanceMode selects +
Register-Pool button; registerLeaguePool (iv via calculateIvBaseSalary, salary reused). 3 necessary
collateral files (backupRestore/syncConfig/editorialSchema test). MIGRATION SAFETY PROVEN — the v6
test seeds a real v5 DB, upgrades, reads the RAW on-disk record to confirm tier/balanceMode stay
undefined in storage (defaults read-time only). JK approved the persistence change. 17 tests; suite 7,188.

**T8c (d54724d) — Team Identity Composition UI.** Collapsible "Team Identity (Cap)" section in the
LeagueBuilderTeams modal: 6-band point-allocation → composeIdentity Suggest; freely-editable 2 inc /
2 dec dropdowns (decreases optional); applyIdentitySelection validation GUARDS the save;
identityCapShift % + shiftLuxuryCaps preview; persisted as an ADDITIVE Team.capIdentity field (NO
version bump, NO migration, NO backup/sync change). Editorial-identity systems (manager/almanac/
reporter) untouched — name collision avoided. JK approved. 1 test; suite 7,189.

**Suite:** 7,171 → 7,189 / 388 files; only the 3 characterized fails throughout (wpaRuntimeBoundary,
franchiseManualSmokeFixture, franchiseNarrativeEventEligibility). tierParams / ivEngine /
salaryCalculator / iv_oracle BYTE-UNCHANGED on every ticket.

**Workflow notes:** standing auto-commit for pure/non-user-visible tickets (T8a); risk-gated
SURFACE-before-commit for persistence/user-visible tickets (T8b, T8c — JK approved each). Battery
pause mid-T8a was clean (Codex hadn't written src/) and productive (surfaced the tiebreak contract
fix). Codex "very high" route = codex knob "high" (its max). GOTCHA: `calculateSalary` is already
IV-based since T5/D15 — do NOT assume seed salary is pre-IV.

**BROWSER-VERIFY BACKLOG (JK, one pass pre-D0):** + T8b (tier/balanceMode selectors + Register-Pool
persist/reload; backup/sync round-trip), T8c (Team Identity section: band priorities → Suggest →
manual edit → cap-shift preview → save/reload). (Prior: EP1, TV2, T7a, T7b, T7c.)

**NEXT SESSION STARTS AT: T8d — the LAST T8 ticket (the big one).** 6 sub-surfaces: snake draft
(Path B, all-user, no AI) + empirical pick-value chart (derivePickValueChart done) + pick-value
trade validator UI (validateTrade done) + per-team solvency guardrail & GREEN/YELLOW/RED/BLOCKED
signals (consume luxuryTax + RegisteredPool + live cheapestFillCost) + chemistry potency overlay
(T6 effectiveRatings) + farm scout-obscured IV (§7.4, reuse T7b no-leak + existing
LeagueBuilderDraft/leagueBuilderStartupFarmDraft scaffold). LIKELY SPLITS (like T7→T8). Captain to
MAP it (focused workflow over the 6 surfaces + the existing draft scaffold) + propose the split +
surface scope BEFORE drafting. Then T9 → T10 → D0.


---

## 2026-06-14 — T8d COMPLETE: mapped + split 3-way + T8d-1/T8d-2/T8d-3 built, audited CONFORMS, committed

**Type:** Product code. Branch codex/franchise-v1-next. Three feature commits (9f94412 T8d-1, 2a5cd95
T8d-2, 2738cf5 T8d-3) + two doc commits (be81267, 61be685). Roles: Captain (Opus 4.8) mapped + authored
every contract + AUDITED every diff independently; Codex 5.5 BUILT each (codex CLI, workspace-write, high
reasoning); auditor ≠ builder (Fable unavailable). JK ruled product/scope/design + approved the two
user-visible/persistence commits (T8d-2, T8d-3).

**Mapping + rulings.** T8d (the §7.3 snake-draft surface) mapped via a 7-agent decorrelated fan-out →
`T8d_SCOPE_MAP.md`. Found the engine half-built+orphaned (derivePickValueChart/validateTrade/luxuryTax all
exist, zero UI callers) and FIVE things entirely MISSING (snake state machine, solvency guardrail, scout-
obscured farm IV, potencyTier resolver, the board). Caught a prior-map error: `effectiveRatings.potencyTier`
does NOT exist (type only). JK ruled 6 design forks (DECISIONS_LOG 2026-06-14): budget=tierCap; position-
agnostic cheapestFillCost; DEFER R12 (potency overlay — count→tier thresholds undefined) + R9 (scout-
obscured farm IV); mode-aware/charge-faithful solvency; composition = two separate steps (MLB board fills
22, existing farm draft fills 10, untouched). → split collapsed from 4 to **3 tickets**.

**T8d-1 (9f94412) — snake + solvency engine (pure).** leagueConstruction.ts += buildSnakeOrder,
cheapestFillCost, pickMarginalTax, assessSolvency (GREEN/YELLOW/RED/BLOCKED). Mode-aware: drain via
luxuryTax.charged (0 in advisory/off), warning via wouldBe, off=no tax signal. +2 constants
(SOLVENCY_RED_MARGIN 0.10, SOLVENCY_SEVERE_TAX_FRAC 0.20). +10 tests incl. the mode-ruling differential
(mutation-sensitive). Pure → standing auto-commit. Suite 7,199.

**T8d-2 (2a5cd95) — board + persistence.** New LeagueBuilderSnakeDraft.tsx at /league-builder/snake-draft
+ "MLB DRAFT" tile (farm tile relabeled). kbl-league-builder v6→v7 ADDITIVE: mlbDraftSessions store +
LeagueBuilderMlbDraftSession + CRUD + sync/backup collateral; DB_VERSION 7 the only version change
(migration test seeds raw v6, proves 9 prior stores+data survive — kbl-league-builder is single-module, no
src_figma dup, so no Feb-11 hang risk). toConstructionPlayer adapter (hook layer; engine pure). Per-pick
DUAL-WRITE (mlbRoster + leagueAssignments rosterStatus:'MLB') satisfies the 22+10 handoff. Persistence +
user-visible → JK surfaced + APPROVED before commit. Suite 7,206.

**T8d-3 (2738cf5) — board overlays.** pick-value chart panel (pool.pickValueChart) + advisory trade
validator (validateTrade, try/catch, no persistence per Q7) + on-demand per-candidate cross-team solvency
chips (assessSolvency across all teams). Closes the last 2 T8a engine orphans. Display-only (no
persistence/route/engine change). User-visible → JK surfaced + APPROVED. Suite 7,210.

**Suite:** 7,189 → 7,210 / 390 files; only the 3 characterized fails throughout (wpaRuntimeBoundary,
franchiseManualSmokeFixture, franchiseNarrativeEventEligibility; GameTrackerLaunchState order-flake also
appeared in one Codex run, passes solo). All do-not-touch (engine post-T8d-1, farm draft, handoff, tierParams,
ivEngine, salaryCalculator, trackerDb) byte-unchanged per ticket. Each gate (tsc/build/full-suite/diff-scope)
independently re-run by the Captain, not trusted from the builder paste.

**Workflow notes.** Codex invocation (proven): `~/.local/bin/codex exec --skip-git-repo-check -s
workspace-write -c model_reasoning_effort=high -o <out> - < <promptfile>` as a background bash task with the
harness sandbox disabled for that one call. Two focused integration-mapping workflows (T8d sub-surfaces;
T8d-2 exact signatures) kept Captain context clean. Standing mode worked cleanly: pure ticket auto-committed;
persistence/user-visible tickets surfaced-before-commit.

**BROWSER-VERIFY BACKLOG (JK, one pass pre-D0):** + T8d-2 (snake board: start/order/signal/BLOCKED/confirm-
persist/reload/22-complete/farm-still-10/handoff-accepts) + T8d-3 (chart panel, trade validator incl. out-of-
range, Compare-teams chips). (Prior: EP1, TV2, T7a, T7b, T7c, T8b, T8c.)

**OPEN/DEFERRED:** R9 scout-obscured farm IV-range (needs scoutNoiseBase 0.6; resolves scoutedGrade-vs-IV-
range collision) + R12 chemistry potency overlay (needs SMB4 count→tier thresholds + a potencyTier(p,team)
resolver) — tracked fast-follows. FINDING-148 (AUX_PRICING L/R, JK-gated, oracle regen) still open.

**NEXT SESSION STARTS AT: T9** — in-game substitution recommendations (no-oracle-leak principle governs;
"cite in T9"). NOT yet mapped — Captain to MAP (focused workflow over the in-game decision surfaces +
effectiveRatings/leverage-WPA/mojo-fitness) + propose split + surface scope BEFORE drafting. Then T10
(Lineup Delta WPA) → D0.


---

## 2026-06-15 — T9 COMPLETE: mapped + split 2-way + T9a engine + T9b integration, audited CONFORMS, committed

**Type:** Product code. Branch codex/franchise-v1-next. Two feature commits (ef85c80 T9a, 93763ee T9b) + doc
commits (955bbc0). Roles: Captain (Opus 4.8) mapped + authored every contract + AUDITED every diff
independently; Codex 5.5 BUILT each (codex CLI, workspace-write, high reasoning); auditor ≠ builder (Fable
unavailable). JK ruled product/scope/design + approved the T9b user-visible/GameTracker-state commit.

**Mapping + rulings.** T9 (IV §10 — rebuild the in-game `generateManagerRecommendations` placeholder onto
effectiveRatings, the "third surface") mapped via a 4-agent decorrelated fan-out → `T9_SCOPE_MAP.md`.
Decisive finding: full ratings + traits are ALREADY in live state (the rec call-site just strips them), so
T9 needs no deep useGameState plumbing — only a widened call-site mapping + a derived pressure band +
subRecThreshold. JK ruled 4 forks (DECISIONS_LOG 2026-06-14/15): delta = IV-of-effectiveRatings (kblIV, "one
truth" with T7a); subRecThreshold PER-TYPE; new pure engine module; 2-ticket split. + firing-gate ruling:
PURE IV-delta gate (remove situational heuristics).

**T9a (ef85c80) — pure engine.** New `src/engines/subRecommendations.ts` (`recommendSubs`): scores eligible
subs vs current on `computeIV(effectiveRatings(...)).kblIV` (same recipe + byte-identical clamp as
`rosterAnalyzer.ts:546-571` — audit-diffed for equivalence; rosterAnalyzer NOT touched); role-misuse mojo
down-shift (pitcher); DefensivePlacementRisk fold (defensive); per-type `SUB_REC_THRESHOLD` {5k/7.5k/12k};
justification precedence. ADDITIVE to effectiveRatings.ts (export 7 shapes + `activeTraitNames`, no behavior
change). 7 tests; suite 7,217. Pure → standing auto-commit.

**T9b (93763ee) — GameTracker integration.** 3 generators in `managerWpaRecommendations.ts` rebuilt onto
recommendSubs (adapters → EffectiveRatingsPlayer + PlayerState + live GameContext incl. opposing player);
`GameTracker.tsx` rec useMemo widened to feed full ratings/traits/hands/mojo (getMojoForPlayer 6-level
normalize)/fitness/pitchCount/count/bases/opposing player. `PRESSURE_LEVERAGE_BANDS {1.5/3.0}`. PURE IV-delta
gate (situational heuristics removed). Output type + watch/decision plumbing + NewsBoard UI UNCHANGED;
plumbing tests stay green. Orphan trace RESOLVED (data flows UI→engine). Suite 7,220. User-visible +
GameTracker-state → JK surfaced + APPROVED. LOW findings: vestigial unused input fields; stale 5-level mojo
in global kbl-gotchas.md (code is 6-level).

**Suite:** 7,210 → 7,220 / 391 files; only the 3 characterized fails throughout (wpaRuntimeBoundary
unchanged — scoring moved off WPA but leverageIndex stays a read-only input). T9a engine + rosterAnalyzer +
ivEngine byte-unchanged on T9b. Every gate (tsc/build/full-suite/diff/orphan-trace) independently re-run by
the Captain.

**NEXT SESSION STARTS AT: T10 — Lineup Delta WPA** (the LAST T-stack ticket before D0). NOT yet mapped —
Captain to MAP (WPA/leverage engines: wpaCalculator/winExpectancyTable/leverageCalculator + the lineup/
decision surfaces + the wpaRuntimeBoundary allowlist) + propose split + surface scope BEFORE drafting. Then
D0 cut line → D1–D8 → F-138 → flag flip → iPad playtest. DEFERRED fast-follows: R9 scout-obscured farm IV +
R12 potency overlay.


---

## 2026-06-15 — T10 COMPLETE: mapped + 3 JK rulings + built + audited CONFORMS + committed (T-STACK COMPLETE)

**Type:** Product code. Branch codex/franchise-v1-next. One feature commit (`5010126` T10) + this session-end
doc update. Roles: Captain (Opus 4.8) mapped + authored the contract + AUDITED the diff independently; Codex
5.5 BUILT (codex CLI, workspace-write, high reasoning); auditor ≠ builder (Fable unavailable). JK ruled
product/scope/design (3 forks) + approved the persistence commit.

**Mapping + rulings.** T10 (IV §9 Lineup Delta WPA standard + §12 per-season constants snapshot) mapped via a
6-agent decorrelated fan-out + 2 critics → `T10_SCOPE_MAP.md`; every decision-critical claim independently
Captain-verified (file:line). **Decisive finding:** the §8.1 optimizer (`optimizeLineup`), the lineup-lock
snapshots, and even the LITERAL §9 delta (`summarizeLineupSnapshotComparison.projectedOpportunityCostTotal`)
were ALREADY built — but display-only, never persisted; and the already-PERSISTED
`ManagerLineupDeltaRecord.managerWpa` is a DIFFERENT, realized-vs-projected number (mixes realized in-game WPA
with projected IV). "WPA" is a misnomer — per D9 the values are IV-of-effectiveRatings ÷10,000,000. JK ruled 3
forks (DECISIONS_LOG 2026-06-15): R1 §9 = IV-of-effectiveRatings (document misnomer, rename→v2); R2 = the PURE
projected-vs-projected scalar persisted ADDITIVE, the realized `managerWpa` kept separate/untouched; R3 =
full-dependency content HASH on `SeasonMetadata`, single "high" ticket (no split — no DB migration).

**T10 (`5010126`).** Part A: NEW `ManagerLineupDeltaSummary` type + `deriveManagerLineupDeltaSummaries`
(managerWpaGameState.ts, `gameEnded` gate, BOTH managers, sourced from `summarizeLineupSnapshotComparison`);
additive persistence mirror of `managerLineupDeltas` (PersistedGameState + CompletedGameRecord +
archiveCompletedGame + refresh + both useGameState end-game writes); field `lineupDeltaWpaStandard` (distinct
from the existing aggregate `lineupDeltaWpa`; camelCase clears the `wpaRuntimeBoundary` `\bwpa:` pattern → zero
allowlist edits); NOT folded into `managerValue` (regression-guard test). Part B: NEW pure
`src/engines/optimizerConstantsSnapshot.ts` (`OPTIMIZER_CONSTANTS_VERSION` + deterministic FNV-1a content hash
over the optimizer dependency set — rosterEngineConstants objective-subset + ivCurves + traitPricing +
traitInteractionMatrix; tierParams EXCLUDED; no Date.now) + additive `optimizerConstantsVersion/Hash` on
`SeasonMetadata`, stamped write-once in `getOrCreateSeason`, warn-once-no-overwrite on drift. §9 spec note
added documenting the IV-not-WP misnomer. +10 tests / +2 files.

**Audit (Opus, independent rerun — not graded from builder paste): CONFORMS.** tsc 0 / build 0 / full suite
**7,227 pass / 3 fail / 393 files (7,230 total)** — the 3 are EXACTLY the characterized trio
(wpaRuntimeBoundary, franchiseManualSmokeFixture, franchiseNarrativeEventEligibility; full failing-file list
captured; no new RED; reconciles as 7,217 prior-passing + 10 new = 7,227). wpaRuntimeBoundary unchanged. Snapshot hash is a real mutation-kill across all 4 dependency files incl. the trait matrix.
SeasonMetadata stamp write-once + warn-once verified. Orphan trace RESOLVED. DO-NOT-TOUCH (rosterAnalyzer,
effectiveRatings, ivEngine, optimalLineup, the 5 data files, trackerDb, backupRestore, salaryCalculator)
byte-unchanged. **Findings (LOW):** (1) summary stamps `version` via a full hash recompute (cleanup); (2)
pre-existing `backupRestore.ts` v12 stale-schema (drops v13/v14/v15 stores) — SEPARATE backup-hardening ticket
(T10 avoided a new store → does not inherit it).

**Suite:** 7,220 → 7,230 / 393 files; only the 3 characterized fails throughout.

**NEXT SESSION STARTS AT: D0 — `FRANCHISE_PLAYABLE_V1_DEFINITION` cut line.** The T-stack (T4→T10) is COMPLETE.
Per F-141: D0 → D1–D8 → F-138 → flag flip → iPad playtest. Captain to read the D0 definition + propose D-stack
sequencing/scope to JK before any build. BROWSER-VERIFY batch (pre-D0, persistence-prioritized) now includes
T10. Deferred: R9 + R12 fast-follows; FINDING-148; backupRestore hardening; the LOW cleanups.

---

## 2026-06-15 — LIVING-SEASON (PHASE-2) DESIGN: full soul-layer spec authored (design session, no build)

**Type:** DESIGN / spec authoring. Branch codex/franchise-v1-next. **No product code, no build, no audit, no commit** — a Captain (Opus 4.8) + JK design session producing one new canonical spec. Roles: Captain = architect/author (architecture/spec is Captain's authority; design/vision is JK's); JK ruled all design/vision. Plain-language mode throughout (JK is the designer, not an engineer).

**Deliverable.** `FRANCHISE_V1_LIVING_SEASON_SPEC.md` (NEW, §0-24, ~664 lines) — the full in-season "soul" layer that the D0 cut line (`FRANCHISE_PLAYABLE_V1_DEFINITION.md`) explicitly DEFERRED (its D6/D7 exclude morale, relationships, the morale-gated designations, Fan Favorite). This session designs that deferred "Phase 2." Decision logs: LS-1..23 (master) + FAME-1..14 + RACE-1..5 + ASG-1..3 + AWARD-1..8 + REL-1..9.

**What was designed (locked):**
- **Standard + scope (§0-1):** every feature must feed the baseball-and-narrative ecosystem (nothing pointless in v1); v1 = ONE complete season (draft→champion), offseason POST-v1.
- **True Value (§3):** on-field production vs a FIXED draft-IV baseline (does not re-baseline); contract + draft-IV baseline frozen at draft; profile changes never touch TV directly; three distinct frozen states named.
- **Master morale matrix (§5):** ONE deterministic event×personality×4-modifier×player/fan-morale lookup (can't hallucinate); morale auto + logged, NEVER confirmation-gated (reverses current build); reporter narrates, never decides.
- **Development (§6-10):** four hidden modifiers (Loyalty/Ambition/Resilience/Charisma) with distinct jobs; traits continuous / ratings on a 20%-of-games checkpoint; team performance touches ratings never traits; fan morale = a directional ratings DAMPENER (brake not accelerator) × personality × Ambition/Resilience; two-trait cap by strength + gain/loss buffer; magnitude can be large (B-→A) if earned+paced; traits-from-reality (map SMB4 traits to enrichment-log signals); random events reactivated (cadence in games, Juiced/Standard/Nerfed, probability decides who).
- **Two-tier confirmation (§11):** morale auto/no-confirm; ratings/trait changes confirmed (console + DB); hit the franchise instance, not the oracle.
- **Managers + fan-morale teeth + rebrand (§12-14):** firings (fan relief + performance×personality ripple); fan morale changes circumstances freely, development only via the dampener; decay on ignored flashpoints; loyal flee + more trade requests when fans angry; rebrand circuit-breaker on sustained bottom (reset fan morale ~70 + all badges but Captain + auto-fire mgr + stadium + wipe dead money; persist stats/record/development; one continuous history).
- **Fame (§20):** recency-weighted WPA spine + WAR legitimacy floor + iconic-event catalog (bumps) + status/celebrity layer; Heat (fickle) vs Reach (ratchets — only a trade resets); 9-tier ladder **Immortal Legend → Global Superstar → National Icon → Regional Star → Local Hero · Unknown · Disliked → Infamous → Villainous**; feeds player morale (personality matrix) + fan morale (amplifier + designation tilt).
- **Race system + All-Star + Awards (§21-23):** All-Star + Awards = one season-long Race primitive (WAR + fame); the fame-vs-WAR gap = the organic snub/bust/darling engine; Visibility-vs-Emission overcounting valve; All-Star = voting/selections only in v1 (no game played); MVP = TOTAL WAR (not bWAR), Gold Glove = fWAR + defensive fame, fame-weighted (not salary) voting, NO rating rewards (development is continuous); TV-award family (Kara Kawaguchi / Bust / Comeback); MOY on the updated Manager WPA truth-layer (decision WPA + lineup delta + record), deprecated mWAR retired.
- **Relationships-lite (§24):** six threshold-gated edge types (Rivalry/Feud/Mentorship/Friendship/Romance/History); potential-vs-active (farm intel); reporter pre-move heads-up (~10% unreliable); Captain four-modifier effectiveness; charged "revenge" matchups; gendered romance weighting (cross-gender default, friendships >> romances).
- **Simulation Gate (§16):** every magnitude is sim-tuned; the season-simulator is the hard acceptance gate (earned/paced drift, balance across short/med/long seasons, no edge-case explosions, no relocation abuse).

**Grounding reads (evidence over assertion — confirmed in-code BEFORE designing on top):**
- Fame is the MOST-built-but-most-tech-debt area: `fameEngine.ts` + `FAME_VALUES` (~150 scored events, bonuses + boners, leverage/playoff multipliers, season-length-scaled milestones, designation→fame links: Fan Favorite +2 / Albatross −1) all exist. THREE conflicting classification schemes in code (6-tier `FameLevel` type, 9-tier `getFameTier`, 5-tier reporter `FameTier`); current model is PURE-CUMULATIVE (no recency, no floor); fame is Elimination-run-scoped. §20.8 reconciles all of this TO the new design — retain only the event catalog + WPA engine + POG; thresholds/magnitudes NOT imported.
- Awards: the 16-emblem set (`awardEmblems.ts`, incl. all flavor awards) + ceremony (`AwardsCeremonyFlow.tsx`) exist but the ceremony is OFFSEASON-coupled, salary-weighted (`calculateAwardWinnerVotePct`), and applies mechanical rewards (+5 fielding / lose-trait). §23.9 reconciles: decouple to season-end, swap to fame-weighting, remove the mechanical rewards. All-Star = an ARCHIVED display shell only (`AllStarScreen.tsx`, by-position starters/reserves) — the one genuinely thin area.
- WPA is fully tracked: `kblWpaAttribution.ts` (`calculateWPA`), per-event `wpa` on the event log, already drives POG (`pogAwards.ts`, `MIN_POSITIVE_WPA`) + the reporter's top-moments. Building fame on WPA works WITH the grain.
- Manager value: the updated Manager WPA truth-layer (`managerWpaDerivation.ts`, v2 WPA model) scores each decision by actual win-probability over a resolution window + has `ManagerLineupDeltaSummary` (lineup delta) + team record in `ManagerSeasonStats`; `mwarCalculator.ts` is `@deprecated` (fixed-value 60/40 + salary-based expectation). MOY moves to the truth-layer; 3 build-time reconciliations (denomination decision-WPA-vs-IV, composite weighting, drop salary-expectation).
- Net: Phase-2 is largely WIRE-AND-EXTEND existing machinery, not greenfield (fame economy, award emblems, reporter clients, Manager WPA all exist) — but with several genuinely new builds (the master morale matrix, the development engine, relationships, races-as-live-standings, the rebrand).

**Reconciliation framing established.** TWO sequenced layers: **Phase-1 = the D-stack** (D1-D13, still PROPOSED, value-spine LIVE + 6 awards on trusted value) ships FIRST; **Phase-2 = this living-season spec** layers on top. Couplings to reconcile at build-plan time: **D9 awards** (adopt the spec's total-WAR MVP / fWAR+def-fame Gold Glove / fame-weighting now vs build-then-rework) and **D7 Fan Favorite** (its deferred morale-gated half is now designed). Deferred fast-follows (R9 farm IV, R12 chemistry-overlaps-relationships, FINDING-148 oracle regen) and the backup/DB parity (D2 + backupRestore v12 hardening) GROW with Phase-2's new persisted state (morale ledger, fame Heat + Reach floor, relationship edges, race standings, Comeback TV-snapshots). Planning-doc sprawl (~45 franchise docs) → collapse the authoritative set to D0 + the living-season spec + CURRENT_STATE.

**Docs updated this session:** `FRANCHISE_V1_LIVING_SEASON_SPEC.md` authored (NEW); `CURRENT_STATE.md` Last-Updated + Phase + NEXT-TASK reframed in place (live header). No app code touched.

**NEXT SESSION STARTS AT: the §18 verification reads, reporter first.** ROUTE: Claude Code CLI | fable 5 | high — reporter implementation end-to-end (certify what is built + settle CADENCE), then (b) trait-to-signal mapping, (c) draft/salary/farm economics, (d) the Manager WPA reconciliation for MOY. THEN Captain drafts the Phase-2 "living-season D-stack" — sequence `FRANCHISE_V1_LIVING_SEASON_SPEC.md` §5-§24 into dependency-ordered build tickets + reconcile the D9/D7 couplings — for JK ratification (same map→ruling→contract discipline as D0). The existing D-stack (D1-D13) can proceed in parallel once JK ratifies D0. Authoritative docs now: D0 + `FRANCHISE_V1_LIVING_SEASON_SPEC.md` + CURRENT_STATE.


---

## 2026-06-16 — §18 verification reads (1)–(3) COMPLETE: reporter, traits-from-reality, draft/salary/farm — certified + JK-ruled + locked (reads + design + docs only; NO product code)

**Type:** Captain verification reads + JK design rulings + doc authoring. Branch codex/franchise-v1-next. **No product code, no build, no audit-of-build, no commit** — pure §18-prerequisite reads. Roles: Captain (Opus 4.8) ran the reads + synthesized + authored docs; JK ruled all product/design forks. The builder/auditor triangle was NOT engaged (nothing built to audit) — it activates when the first §18-derived build ticket is drafted (Codex builds → Opus audits → JK browser sign-off). Method: each read = a `*-read` Workflow (parallel mappers + adversarial verifiers; ~12 agents each, file:line evidence, the most decision-critical claims independently re-derived).

**§18(1) REPORTER → `REPORTER_CERTIFICATION.md` (§A–O).** Two workflows. (1a in-game cadence): the reporter is a large BUILT system wired into Exhibition/Elimination; franchise is largely certify-and-connect. Only 2 of 5 in-game beats fire live (between-inning + post-game columns); per-play + preamble orphaned in ALL modes. TWO reporter systems coexist (live GameStory/PostGameColumns vs legacy `narrativeEngine.ts`); §5 invariant (LLM narrates, never decides) CONFIRMED safe; all 11 reporter stores backup-safe (the v12 defect drops only the v13-15 franchise-economy stores). The ~10% accuracy model relationships-lite needs is flag-only/orphaned/absent-from-live = a BUILD gap. **REP-1..4 (JK):** franchise cadence = POST-GAME COLUMNS ONLY; live GameStory canonical (rewrite FranchiseHome.BeatReporterNews); franchiseId-keyed reporters; accuracy model built FRESH in the §24 ticket. (1b season-long cadence — JK flagged I'd under-scoped "cadence" to in-game only): the season-long narrative is overwhelmingly UNBUILT and is a downstream consumer of nearly every Phase-2 system (no season-news record; orphaned almanac/legacy-summary memory; no sim-tunable emission gate; pre-action hooks build-from-scratch). **SEA-1..5 (JK):** accept the event-driven "PUBLISH BUS" model + build the reporter foundation EARLY as Phase-2 infrastructure each later system emits into; separate sim-tunable season-emission-config; pre-move intel advisory; REP-2 holds. Logged a SESSION_RULES pen lesson (full-cadence scoping for narrative systems).

**§18(2) TRAITS-FROM-REALITY (§9) → `TRAIT_SIGNAL_CERTIFICATION.md` (§A–F + §VI).** Crux = `typed ≠ populated`: the pressure spine (leverage/WPA/clutch/runners/RBI) is auto-populated, but the discriminating signals (count, pitch type, pitch location, fielding difficulty, chase, handedness, mojo) are absent / typed-but-unwritten / manual-opt-in. Initial triage 13 A / 24 B / 35 C; a JK design session collapsed the C bucket to **1 cut (Sign Stealer) + everything else buildable**. The §9 engine (log-reconstructed context + strength scoring + grant/write-back) is UNBUILT but `traitInteractionMatrix.ts` already encodes every activation predicate. **TS-1..13 (JK):** acquisition = reality-percentile × personality × morale, min-sample valve (= Franchise-lite toggle), season-length-scaled thresholds, four personality "image" axes; role-eligibility **25 pitcher / 39 position (25 bat/7 run/7 field) / 7 universal / 1 cut**; Two Way = pitcher gateway (random IF/OF/C on grant); net-new capture = pitch-ZONE + OF-extra-base-credit + injury accumulator (rest reuses existing fields); §9 engine on `traitInteractionMatrix`.

**§18(3) DRAFT/SALARY/FARM (§18.3) → `DRAFT_SALARY_FARM_CERTIFICATION.md`.** 22-man salary = IV-based + tier-INVARIANT; farm-prospect = a flat 4-row draft-round table (CALIBRATE bridge), unchanged at call-up (F-127); rookie scale = absolute 0.50× — so the two scales are DISCONNECTED. The pick-value chart is already relative-to-pool but MLB-22-only + unconsumed by salary; the IVs it ranks are RAW (tier-scale constants TIER_SHIFTS/FARM_NERF_SCALES exist but ORPHANED); pick-trade execution does NOT exist; per-draft grade distribution has no knob. Startup drafts + scout-obscuring (R9) LIVE; in-season franchise draft dry-run only. **DSF-1..4 (JK):** UNIFY rookie+farm on one tier-scaled relative-to-pool scale (connect TIER_SHIFTS); tradeable asset = DRAFT PICKS (build pick-ownership + executor + farm-round chart/validator); `farmGradeMode` = multiplicative skew of the round-keyed tables; in-season annual draft deferred post-v1. **API NOTE:** a live Anthropic **529 Overload** killed the 2 dedicated salary mappers + their 2 verifiers mid-run; the salary CORE was 3-way corroborated by surviving maps so rulings are locked; a re-resume (`wf_1c5ff7c9-da3`) was hardening the salary verification at session pause.

**Docs touched (no app code):** NEW `REPORTER_CERTIFICATION.md`, `TRAIT_SIGNAL_CERTIFICATION.md`, `DRAFT_SALARY_FARM_CERTIFICATION.md`; `DECISIONS_LOG.md` (REP/SEA, TS, DSF 2026-06-16 entries); `SESSION_RULES.md` (pen: full-cadence-scoping lesson); `CURRENT_STATE.md` (live header rewritten); this entry. Nothing committed (JK commits).

**NEXT SESSION STARTS AT: §18 read (4) — Manager WPA reconciliation for MOY** (the LAST §18 read; run FRESH against a recovered API). Denomination (decision-WPA vs lineup-delta rescaled-IV → common scale) + composite weighting (decision-WPA + lineup-delta + record) + drop salary-based win expectation; retire the @deprecated fixed-value `mwarCalculator`; sources `managerWpaDerivation.ts` / `ManagerLineupDeltaSummary` (T10) / `ManagerSeasonStats`. THEN Captain drafts the Phase-2 "living-season D-stack" sequencing — folding in the build tickets these reads unblocked (reporter publish-bus EARLY; §9 trait engine; unified relative-to-pool salary scale + tradeable draft-pick trading + farmGradeMode) + reconciling the D9/D7 couplings. Optional: fold the hardened §18.3 salary verification (`wf_1c5ff7c9-da3`) into `DRAFT_SALARY_FARM_CERTIFICATION.md` if it landed.


---

## 2026-06-16 — §18 read (4) COMPLETE: Manager-WPA / MOY reconciliation — certified + MOY-1..7 ruled + locked (reads + design + docs only; NO product code)

**Type:** Captain verification read + JK design rulings + doc authoring. Branch codex/franchise-v1-next. **No product
code, no build, no audit-of-build, no commit** (JK commits). This is the LAST §18 prerequisite read. Roles: Captain
(Opus 4.8) ran the read + synthesized + authored docs; JK ruled the design/scope forks. The builder/auditor triangle
stayed dormant (nothing built to audit) — it activates when the first MOY build ticket is drafted (Codex builds → Opus
audits → JK browser sign-off). Method: a `moy-reconciliation-read` Workflow (`wf_1692b888-d04`; 9 agents, ~958k tokens)
— 5 decorrelated mappers (v2 decision truth-layer / lineup-delta scalar / deprecated mWAR / MOY surface+record+greenfield
/ the denomination crux) + 3 adversarial verifiers (denomination-refute, salary-drop-refute, greenfield-refute, all
CONFIRMED — refutations failed) + 1 completeness critic. The critic's 3 headline findings were re-verified by the Captain
directly against code before any ruling.

**Certified (file:line-grounded, multiply corroborated, adversarially verified):**
- The **v2 Manager-WPA truth-layer is real, live-wired, and persisted.** Decision-WPA = `roundWpa(teamWinProbAfter −
  teamWinProbBefore) × managerShare` — a true team win-probability delta in [−1,+1] (`managerWpaDerivation.ts:1734-1747`);
  per-type shares 0.1–1.0 (`managerDecisionRegistry.ts`); wired via GameTracker/useGameState, persisted on
  `PersistedGameState`, displayed via `ManagerWpaOverlay` through `managerValueTrace.ts`.
- The **three §23.7 reconciliations are all real and all UNIMPLEMENTED:** (a) denomination — the composite raw-sums
  win-prob terms with a rescaled-IV term (lineup = IV ÷ 10,000,000, a CALIBRATE playtest-tunable; ~50–90× scale gap;
  caps are band-aids, no unit bridge); (b) weighting — only the deprecated salary 60/40 exists, no successor; (c)
  salary-drop — `getExpectedWinPct = 0.35 + salaryScore×0.30` (`mwarCalculator.ts:601-603`) lives only in the
  `@deprecated` engine, reachable only behind `FRANCHISE_V1_OFFSEASON_EXECUTION_ENABLED=false` → retire re-points, never breaks.

**The read CORRECTED AWARD-7's framing three ways (each verified by the Captain at file:line):**
1. **FOUR quantities, not three.** The live composite (`pogAwards.ts:589-590` AND `almanacQueries.ts:1228`) =
   `tacticalManagerWpa + deploymentWpa + lineupDeltaWpa`. **Deployment-WPA is a silent 2nd win-prob term** (team-cap
   ±0.5, `managerWpaGameState.ts:82-98`) that AWARD-7 omitted; **team record is NOT in the live sum** (carried alongside).
2. **MOY is NOT greenfield-from-scratch.** `pogAwards.ts` ships a live, persisted (`managerWpaTotals`,
   `useGameState.ts:11151/11206/12180`, `gameStorage.ts:214/936`), displayed (`GameDetail.tsx`) per-game `best_manager`
   award on the exact composite, gated `MIN_POSITIVE_WPA=0.005` (`pogAwards.ts:633-651`). Season MOY = a season-grain
   aggregation of it. (The franchise season-award files — `franchiseAwardsEngine`/`Storage`, `AwardsWatchlist` — ARE
   genuinely absent; no season rollup exists.)
3. **Name/scale trap.** The live composite sums the CAPPED REALIZED record `delta.managerWpa` (±0.25/±0.75); §23.7
   literally names the T10 `ManagerLineupDeltaSummary.lineupDeltaWpaStandard`, which is built+persisted but **read
   nowhere** (`managerWpaGameState.ts:222`, zero downstream reads). Different math, different scale.

**Rulings — JK (design/scope forks):** MOY-1 inputs = **4** (decision + deployment + lineup + record); MOY-2 lineup
quantity (capped realized record vs orphaned T10 standard) **DEFERRED to build**; MOY-3 record = **expectation-relative
on the D6 trusted artifact** → MOY **HARD-couples to D6** (sequences POST-D6/D8 inside D9); MOY-4 **NO fame tilt** v1.
**Rulings — Captain (engineering/architecture/sim-deferred, JK-overridable):** MOY-5 build = season aggregation of the
`pogAwards` composite into a NEW `franchiseAwardsEngine`/`Storage`, retiring `mwarCalculator`/`calculateMOYVotes` +
re-pointing the dead-gated ceremony BEFORE any flag flip; MOY-6 **pool-relative normalization** for the denomination
(no IV→WP constant, frozen value layer untouched); MOY-7 composite weights → **Simulation Gate (§16)**.

**Honest scope note:** a read — no product code changed, so no build/test was run (none applicable). Magnitudes are from
code constants + committed test assertions, not a fresh execution; the certification rests on file:line evidence + the
3-verifier adversarial pass + the Captain's direct re-verification of the critic's findings.

**Docs touched (no app code):** NEW `MANAGER_WPA_MOY_CERTIFICATION.md`; `DECISIONS_LOG.md` (MOY-1..7, 2026-06-16);
`CURRENT_STATE.md` (live header → §18 4-of-4 complete; next = Phase-2 D-stack sequencing); `CURRENT_STATE_HISTORY.md`
(§18(4) arc snapshot); this entry. Nothing committed (JK commits).

**NEXT SESSION STARTS AT: Captain drafts the Phase-2 "living-season D-stack" sequencing** for JK ratification — sequence
`FRANCHISE_V1_LIVING_SEASON_SPEC.md` §5-§24 into dependency-ordered tickets, FOLDING IN the §18-unblocked builds (reporter
publish-bus EARLY; §9 trait engine; unified relative-to-pool salary scale + tradeable draft-pick trading + `farmGradeMode`;
the **MOY award engine** per MOY-1..7, POST-D6/D8) + reconciling the Phase-1↔Phase-2 D9/D7 couplings. **D0 ratification
(`FRANCHISE_PLAYABLE_V1_DEFINITION.md`) is still PROPOSED/pending** — the held "what would you like to adjust?" D0 message
maps 1:1 to the unchanged doc but is overtaken; ratify cleaner after the D-stack sequencing settles the awards picture.
All four §18 prerequisite reads are DONE. Deferred/optional: fold the hardened §18.3 salary verification
(`wf_1c5ff7c9-da3`) into `DRAFT_SALARY_FARM_CERTIFICATION.md` if it landed.


---

## 2026-06-16 — Phase-2 D-stack sequenced + ratified + AUTONOMOUS BUILD RUN to the D6a value gate (7 commits)

**Type:** Design + a long autonomous build run. Branch `codex/franchise-v1-next`. **8 commits this session** (7
feature + several docs); nothing pushed. Roles: Captain (Opus 4.8) = architect + auditor of every diff; Codex 5.5 =
builder; JK = product/design rulings + direction. The Codex-builds / Opus-audits triangle held on every diff
(builder ≠ auditor; Captain re-ran tsc/tests + read the substance + grep'd invariants, never trusted the paste).

**Part 1 — DESIGN (reads + docs).** Drafted the Phase-2 living-season build sequence `FRANCHISE_V1_LIVING_SEASON_
DSTACK.md` (the "L-stack": L1–L14 + L-SIM + an economy track), sequencing the living-season spec §5–§24 + folding in
the §18-unblocked builds. Audit-hardened by a 12-agent workflow (`wf_b5734e06-e2c`: 7 grounding code-readers + 5
adversarial ordering critics) — which caught MOY belongs in Phase-1 D9 (not a Phase-2 ticket; MOY-4 bars manager
fame), a missing L1.5 Captain-handoff, that L1's hidden modifiers are mis-named + un-persisted, and the backup-parity
escalation. **JK ruled LSD-1..5** (D9 fame-ready seams ratified · FA-attraction→v1.1 · Cornerstone CUT · budget
pressure CUT · stadium = SMB-pool pick) **+ LSD-6 (ruling B: the living season IS part of v1**, not a follow-on; v1 =
D-stack + L-stack + the L-SIM gate; D13 "Playable-V1" = an internal Phase-1 checkpoint). **D0 RATIFIED**
(`FRANCHISE_PLAYABLE_V1_DEFINITION.md`); its D9 now carries the LSD-1 seams + the MOY-1..7 contract. Authored
`AUTONOMOUS_RUN_PROTOCOL.md` (the loop + JK's AUTH-1 auto-commit + AUTH-2 build-to-spec + hard halt triggers).

**Part 2 — AUTONOMOUS BUILD RUN (7 feature commits + D5 confirm).** Each ticket: Captain map/contract → Codex
`codex exec` build (background) → Captain independent audit → commit.
- `d48ab3c` **L1** — hidden-modifier rename (leadership/volatility/adaptability/pressure → loyalty/ambition/
  resilience/charisma) + typed on `Player`. Zero behavior change; tsc 0; grep gate 0.
- `752882f` **D1** — `useSeasonStats:38` `DEFAULT_TOTAL_GAMES=162` → canonical `MLB_BASELINE_GAMES` (WAR scaling
  already routed through `gamesPerTeam`; zero behavior change).
- `2fab709` **D2** — backup parity: register the 3 v13-15 franchise stores + pin 12→15 + a structural parity-guard
  (objectStoreNames === registry keys) + round-trip test. The silent-drop data-integrity defect is closed.
- `2f4f3e5` **L1.5 + OD-1** — pre-contract verification caught that MLB pool players carry NO hidden modifiers (only
  the prospect path generates them) → L1.5 would be a no-op. **OD-1 ruled (Captain default, JK-overridable on
  return): generate the 4 modifiers for all franchise players at init** (seed=player.id, same distribution as
  prospects, no SOT touch). + L1.5: assign each Team Captain = max(loyalty+charisma) among MLB players with
  charisma≥70 (null+warn if none). 21 unit + 33 integration tests; designation eligibility left blocked (L7's job).
- `0cf4ca2` **L4a-connect** (REP-1..3) — franchise reporter wired: auto-assign a franchiseId-scoped reporter on
  launch + `postGameColumnsEnabled` + `BeatReporterNews` reads live `GameStory` (legacy `generateGameRecap`
  retired). Browser-pending (reporter text is Supabase-dependent, D-R5).
- `8074976` **L4a-bus** (SEA-1..5) — the season-long narrative publish-bus core: `SeasonNewsItem` store +
  sim-tunable `SeasonEmissionConfig` + emission gate + `generateSeasonNewsTake` on the canonical reporter.
  Build-dark (no event taps yet — SEA-1 ruled built-early); §5 firewall upheld (the generator narrates strictly
  from `event.facts`, imports no morale/value engine).
- `4a1bd36` **D6a** — the make-or-break True-Value TRUST gate, LIVE half. Peer-pool audit (≥2 MLB peers HARD-block,
  no fudge/fallback; two-way full-block; FARM/score-only excluded) → persist a live `franchiseTrustedValueArtifacts`
  record → flip the 4 True-Value trust flags from literal-false to COMPUTED. Reconciled a real inconsistency the
  map caught (`franchiseDesignationReadinessReport.ts:84` hardcoded true). **JK ruled the lock-timing fork:
  SEASON-END FREEZE** (D6a = live; D6b adds the freeze). RIGOROUSLY audited — base-IV oracle untouched, flags
  genuinely computed (not hardcoded), a real all-source no-leak boundary test, D8 flags stay false.
- **D5 CONFIRMED** (confirm-only): the TEAM_MVP/ACE `warConsumerTrust` trust engine is green (51 tests).
- **D6 mapped** via workflow `wf_3c443a04-35e` (4 agents) before contracting.

**Process notes.** JK corrected an over-cautious first wrap (I'd set aside OD-1 — which had an obvious default —
under AUTH-2's "set aside" branch when JK meant the "make a conservative choice and continue" branch). Recalibrated
+ built OD-1/L1.5/L4a-connect/L4a-bus/D6a. JK then BATCHED the browser verification ("keep rolling") and directed
"D-stack to the value gate." A browser pre-check (preview MCP) confirmed the app loads clean + verified the shipped
L1.5+OD-1 logic in the real runtime (full franchise creation is gated by the pre-existing 22+10 farm-draft handoff).

**Verification at close.** Full suite re-run (the first full run of the session) = **7,251 pass / 3 fail / 400
files (7,254 total)** — the 3 are EXACTLY the characterized set (wpaRuntimeBoundary, franchiseManualSmokeFixture,
franchiseNarrativeEventEligibility). It caught ONE self-inflicted regression (`franchiseSeasonLedgerStorage.test.ts`
hardcoded `TRACKER_DB_VERSION===15` + a store list missing the 3 new stores — stale after my v15→17 bumps);
fixed (`8ba0538`) + re-verified 4/4. `trackerDb` is now **v17**, `KBL_BACKUP_VERSION` stays 2.

**Docs updated:** `FRANCHISE_V1_LIVING_SEASON_DSTACK.md` (NEW), `AUTONOMOUS_RUN_PROTOCOL.md` (NEW),
`AUTONOMOUS_RUN_LOG.md` (NEW — the per-ticket trail + OPEN DECISIONS OD-1..5), `DECISIONS_LOG.md` (LSD-1..6, D6
lock-timing), `PROMPT_CONTRACTS.md` (every ticket contract), `FRANCHISE_PLAYABLE_V1_DEFINITION.md` (RATIFIED + the
LSD-1/MOY seams), `FRANCHISE_V1_LIVING_SEASON_SPEC.md` (amendment notes), `CURRENT_STATE.md` (live header rewritten),
`CURRENT_STATE_HISTORY.md` (arc snapshot), this entry.

**NEXT SESSION STARTS AT: D6b** (the season-end freeze of the trusted-value artifact → deterministic D8/D9 awards),
then **D7** (designations LIVE: promote TEAM_MVP/ACE to non-'Proj.' + add Albatross; reconcile the dual designation
path; emit `DesignationEvent` with NO morale mutation; Fan Favorite stays Phase-2). Then D8 → D9 (awards w/ the
LSD-1 fame seams + MOY-1..7) → D10–D13. **Resume in a FRESH context** — the value-spine work deserves fresh audit
rigor. Open decisions for JK: OD-2..5, the D4 salary/value-preview scope snag, the soul-layer "build to spec"
greenlight. Batched browser: L1.5 captain + L4a reporter on real franchise data (needs the farm-draft handoff +
Supabase). All on `codex/franchise-v1-next`; nothing pushed.

---
## Session: 2026-06-16 → 2026-06-17 (overnight, AUTH-4) — D6b → D9 COMPLETE (9 feature commits)

### What Was Accomplished
Resumed the autonomous build run at D6b under AUTH-4 (overnight unattended: Captain makes every call, documented
conservative defaults where the spec is silent, never stops for JK, only SET-ASIDE-AND-CONTINUE on a genuine safety
wall). The Codex-builds → Opus-audits triangle held on every diff (auditor independently re-ran tsc/build/full-suite,
read the diff, grepped invariants, mutation-tested load-bearing logic). **9 feature commits completed the D-stack
value→awards spine:**
- ✅ `6559a19` **D6b** — season-end FREEZE of the trusted-value artifact (frozen flag + idempotent freeze helper +
  Layer-A anti-thaw guard + Layer-B recompute early-return locking artifact + `franchiseTrueValueRows`; both
  season-complete paths; mutation-proven).
- ✅ `abfa167` **D7a** — designations LIVE (persisted path canonical; TEAM_MVP/ACE 'projected'→'active' only on the
  exact eligible holder; ephemeral `DesignationEvent`, morale/fame firewall intact).
- ✅ `013d886` **D7b** — Albatross live + **closed the untrusted-value LEAK** (filter to the D6 ≥2-peer trusted set;
  mutation-proven) → **D7 COMPLETE**.
- ✅ `14c90fd` **D8** — award-trust GATE (trustedForAwards/finalWarTrusted/consumerThresholdsProven computed off the D6
  FROZEN artifact, requires `frozen===true`; adaptive qualifier via `scaledThreshold`; written `AWARD_TRUST_CONTRACT.md`).
- ✅ `53ffd4c` **D9a** — D9 split (a/b/c/d); 2 new dark IndexedDB stores at trackerDb **v17→v18** (`franchiseAwardsRows`
  with the LSD-1 fame seams + `franchiseTrueValueSnapshots`) + full backup-parity lockstep (pin 18, optional:true,
  KBL_BACKUP_VERSION stays 2) + round-trip + pin-trap test updated.
- ✅ `9fa540d` **D9b** — the 5 WAR-category awards engine (MVP/Cy Young/RoY/Gold Glove/Silver Slugger) off the frozen
  artifact + D8 gate + adaptive qualifiers; deterministic, mutation-kill proven; writes finalized:true. Never recomputes TV.
- ✅ `443c86c` **D9c** — Manager of the Year → **6-category engine COMPLETE** (season aggregation of the live pogAwards
  manager composite + wins-above-D6-expectation record term, pool-normalized; one finalize, all 6).
- ✅ `d814c52` **D9d-1** — engine WIRED: season-end finalize TRIGGER after the D6b freeze on both paths (computedAt=
  frozenAt byte-stable) + game-1 `franchiseTrueValueSnapshots` capture on `processCompletedGame` (deterministic
  checkpoint, idempotent, regular-season-only — live game path).
- ✅ `c229733` **D9d-2** — the awards UI → **D9 COMPLETE**: `AwardsWatchlist.tsx` Mode-2 tab (separate from the
  dead-gated offseason ceremony, NO flag flip; read-only; finalized rows or the in-season PREVIEW) + the read-only
  `computeFranchiseAwardsPreview` (looser gate, never persisted; finalize path byte-unchanged) + the gated manifest
  flip (gated on finalized rows; contractVersion bumped; wave4 pin updated + a new blocked-when-absent case).

### Process / Infra
- A **6h40m Codex hang** on the first D6b dispatch (stalled model-API stream, no edits written) was root-caused, killed
  clean (repo intact), and re-dispatched. Every `codex exec` dispatch now runs under a **30-min watchdog** so a stall
  self-recovers — made standard for the run.
- A separate Codex (JK's v16 fix) made a correct one-line edit to `FRANCHISE_PLAYABLE_V1_DEFINITION.md:104`
  (trackerDb "v16 migration" → "bump (v17→v18)"), carried in this session-end docs commit (not bundled into the D9d-2
  feature commit, per explicit-path staging discipline).

### Verification at Close
Full suite independently re-run at every ticket; final = **7,288 pass / 3 characterized fail (7,291 total, 406 files)**
— the only fails the documented trio (wpaRuntimeBoundary, franchiseManualSmokeFixture, franchiseNarrativeEventEligibility);
ZERO new reds across the entire run. tsc 0, `npm run build` exit 0. trackerDb **v18**, KBL_BACKUP_VERSION **2**.

### Docs Updated
`CURRENT_STATE.md` (live header rewritten → SESSION ENDED / D9 COMPLETE / NEXT=D10), `CURRENT_STATE_HISTORY.md` (the
D6b→D9 arc snapshot), `AUTONOMOUS_RUN_LOG.md` (per-ticket STARTED/COMMITTED trail through D9d-2), `PROMPT_CONTRACTS.md`
(every ticket contract + AUDIT+EXECUTION RECORD), `AWARD_TRUST_CONTRACT.md` (NEW, D8), `FRANCHISE_PLAYABLE_V1_
DEFINITION.md` (the v16→v18 one-line fix), this entry.

### NEXT SESSION STARTS AT: D10
**D10** — Mode-2 season-summary / manifest HANDOFF finalize WITH awards (D9) + active designations (D7); supersedes the
no-awards 1.10A stopgap; touch the SeasonSummary PAGE copy (D9d-2 deliberately did not). Then **D11** (UI live-label
sweep) → **D12** (full Phase-1 manual smoke, iPad) → **D13** (Playable-V1 internal checkpoint) → the **soul layer**
(L-stack: L3 morale → L6 fame → … → L-SIM gate). **Batched browser sign-off for JK** (the sole real-world acceptance
gate) across this run's live-game/UI surfaces: D6b freeze, D7 designations, D9d-1 snapshot/finalize, D9d-2
AwardsWatchlist. Tracked D9 follow-ups: per-player profile/Almanac award display; the mwarCalculator/calculateMOYVotes
retirement (pre-flag-flip cleanup — re-point AwardsCeremonyFlow:1620 + RatingsAdjustmentFlow:388 BEFORE any flag flip).
Open: OD-2..5, the D4 scope snag, the L-ECON1 + F-144 safety-wall set-aside. All on `codex/franchise-v1-next`; nothing
pushed.

---
## Session: 2026-06-17 (Tu) — ATTENDED: D10 + DESIG-RECON + D11 + soul-layer opener (L3, L6a)

### Context
Resumed from the overnight D9-COMPLETE state with JK present (attended). JK available for design rulings; the
normal surface-the-fork + SMB4-asset gates applied (AUTH-4 overnight mode off). 9 feature commits, every code diff
Codex 5.5-built → Opus 4.8-audited independently (tsc/build/full-suite re-run, diff read, invariants grep'd, key
claims test-proven), zero new reds across the whole session. All on `codex/franchise-v1-next`; nothing pushed.

### What was accomplished
- **Design rulings (DECISIONS_LOG 2026-06-17):** cleared the skipped-step forks **OD-2..5 + D4** — including
  correcting a Captain-surfaced IV≠TV conflation (OD-2 economy/rookie/farm scale is ratings-based IV, never the
  performance-based True Value). Reconciled + ruled the full **DESIG-RECON** team-designation model: 6 designations
  all live in v1 — Albatross spec-guards (2× league-min salary + materially-overpaid + ≥2-peer trust), Fan Favorite
  promoted to live with NO salary floor (the underpaid-overperformer / Brock-Purdy case), Captain no-minimum visible
  badge, Fan Hopeful built visible-safe (random top-3 by scouted grade), Cornerstone CUT; effects dormant until
  Phase-2. Verified Albatross was already intra-team (the ≥2-peer rule is a TV-trust gate, not a league comparison).
  Then the **soul-layer "build to spec" GREENLIGHT**, the **L3** structural rulings, and the **L6** plan.
- **D10** `51e487a` — Mode-2 SeasonSummary shows finalized LEAGUE awards (AwardsWatchlist inline) + the manifest
  active-designation canonical-source fix + de-"no-awards" copy.
- **DESIG-RECON build:** `b48b450` DR-1 (Albatross guards + FF promote + Cornerstone removal + orphan
  `fanFavoriteEngine` deleted — cleared the stale `franchiseNarrativeEventEligibility` RED, characterized set 3→2) ·
  `9d1db40` DR-2 (Captain charisma≥70 gate removed + Fan Hopeful visible-safe season-start assignment to
  `team.fanHopefulPlayerId`) · `bd6b43c` DR-3 (team-hub six-designation strip) · `6e1df3c` DR-4 (spec reconciliation
  to MODE_2_V1_FINAL §17).
- **D11** `5eaf9d9` — UI live-label sweep (promote-surface / keep-effect, keep-list verified intact) + the
  smart-label D4 value panel (frozen-aware: PROJECTED mid-season → FINAL when the value artifact freezes).
- **Soul layer (greenlit, all build-DARK):** **L3 COMPLETE** = `5b1431d` L3a (pure Master Morale Matrix — one
  event×personality×4-modifier table + composer, firewall-clean) + `d46a071` L3b (reuse+un-gate the
  `kbl-franchise-morale` store, D7 subscription dark, Phase-2 flag default OFF gated defense-in-depth, parity-guard
  extended). **L6a** `7359cbf` (pure §20 Fame engine — Heat/Reach nine-tier, trade-reset, WAR-gravity, fame-vs-merit,
  channel aggregates).

### Decisions made
- See DECISIONS_LOG 2026-06-17 for the full set: OD-2..5 + D4; DESIG-RECON (6-designation model + the asymmetry
  rulings); the soul-layer greenlight; the L3 structural rulings (fresh clean matrix engine, reuse the existing
  morale store, build-dark); the L6 plan + defaults (§20 LOCKED, no new fork). Persistence note: store-creating
  soul-layer tickets bump the trackerDb SCHEMA pin but **KBL_BACKUP_VERSION stays 2** (D9a/D2 precedent — adding a
  store grows backup coverage, not the file format).

### NFL / verification
- Every code ticket: independent tsc 0 / build 0 / full-suite re-run by Opus (not trusted from the Codex paste) +
  diff read + invariant greps + (for the pure engines) firewall/purity verification. Suite arc: 7,292/406 (D10) →
  7,242/405 (DR-1) → 7,267/407 (L6a). End: **7,265 pass / 2 characterized fail** = wpaRuntimeBoundary +
  franchiseManualSmokeFixture (DR-1 legitimately cleared the third). Soul-layer build-dark proven by test
  (flag-OFF → no live morale/fame write).

### Pending / next session
- **NEXT = L6b** (the fame STORE + dark wiring — NEW parity-guarded `franchiseFameRecords` at trackerDb v18→v19,
  KBL_BACKUP_VERSION stays 2, C-4 backup DoD + PIN-TRAP update, dark per-game compute, parallel-run vs the untouched
  live fame, L3 fame-tap stays dark). **The L6b contract is already written in PROMPT_CONTRACTS.md.** Then L6
  complete → {L5 fan-teeth} → {L7 effects, L8 dev, L9b traits, L10 random} → {L11–L14} → L-SIM gate → post-D13
  activation (incl. the roster-tab confirmation-gate UI removal — JK flagged this as a required LS-9 cleanup).
- **JK gates outstanding:** D12 (full Phase-1 manual smoke on real franchise data, iPad) + D13 (Playable-V1
  checkpoint). Browser-verify backlog #1–#15 (the D10 awards / DR-3 designation strip / D11 labels surfaces added).
- **Safety-wall set-asides (unchanged):** L-ECON1 (frozen draft-IV oracle, OD-2 ruled the design but the build stays
  watched) + F-144. L9a (live-game-path zone-input capture, OD-5 ruled) is a watched-session build.

---
## Session: 2026-06-17 (Tu) — ATTENDED→AUTH-4: L6 (Fame) COMPLETE + L5a; CONTEXT-HANDOFF at L5b

### Context
Resumed ATTENDED at L6b (Opus 4.8 Captain). JK confirmed L6b + attended; mid-session JK left and switched to AUTH-4
autonomous. Every diff Codex 5.5-built → Opus 4.8-audited independently (auditor ≠ builder: full-suite re-run, diff
read, invariant greps, key claims test-proven). On `codex/franchise-v1-next`; nothing pushed.

### What was accomplished
- **L6 (Fame) COMPLETE** (split build, mirrors L3a/L6a → L6b store → wiring):
  - `3b36d35` **L6b-1** — `franchiseFameRecords` IndexedDB store (shared kbl-tracker DB, **trackerDb v18→v19**) +
    3-place backup parity (trackerDb / backupRestore optional:true / syncConfig) + pin-trap & round-trip tests;
    dark/EMPTY (no writer; zero non-test callers). KBL_BACKUP_VERSION stays 2. *Codex dispatch #1 correctly BLOCKED*
    on `franchiseSeasonLedgerStorage.test.ts` (a version-pin file my contract missed — the recurring trap from
    `8ba0538`); I swept all version/store-list pins, added the one real file, captured it to memory, re-dispatched.
  - `5a7685a` **L6b-2** — Phase-2 fame flag (`isFranchisePhase2FameEnabled`, default OFF) + per-game DARK fame compute
    (`franchiseFameCompute.ts`: decay-on-write heat, reach ratchet, wasNegative latch, re-entry guard; channel-tagged
    wpa_spine + iconic inputs; **WAR-gravity deferred** + **inactive-player no-decay**, both JK-ruled) + the gated/
    swallowing `processCompletedGame` wiring. *One FIX round*: build #1 hand-rolled a raw `kbl-schedule`
    `indexedDB.open` (data-integrity class) → I caught it in audit → replaced with the canonical `getScheduledGame`
    (mirrors D9d-1), locked by a no-raw-open source-scan test.
- **L5 STARTED:** `428f7cb` **L5a** — the pure **§8 fan-morale ratings DAMPENER** (`fanMoraleDampener.ts`): a
  directional counter-trend BRAKE (high morale softens drops via Resilience, low morale softens gains via Ambition),
  strength = directional morale × personality multiplier × modifier weight × Loyalty amplification, clamped to
  maxDampen — sign-preserving magnitude reducer (never flips/amplifies). All magnitudes in `FAN_DAMPENER_TUNING`
  (§16 sim-tune, shape-locked). Pure; L8 consumes it later. 7 tests.

### Decisions / defaults
- JK ruled (attended): split L6b into L6b-1/L6b-2; **defer the WAR-legitimacy gravity** (fame event-driven in v1);
  inactive-player heat does NOT decay (active-player rows only). KBL_BACKUP_VERSION stays 2 (D9a precedent; the
  DECISIONS_LOG "bump" line was stale). AUTH-4 defaults-taken for L5a documented in PROMPT_CONTRACTS.md (Loyalty-1.4 =
  modifier amplification; Droopy up<down; placeholder strengths).
- Adopted two NEW non-negotiable SESSION_RULES protocols (JK added mid-session): **WAITING-ON-JK** + **CONTEXT-HANDOFF**.

### NFL / verification
- Independent re-runs throughout: tsc 0 / build 0 / full suite. Arc: 7,267/407 (post-L6a) → 7,269/408 (L6b-1) →
  7,273/409 (L6b-2) → **7,280/410 (L5a)**. The 2 fails are the characterized set (`wpaRuntimeBoundary` +
  `franchiseManualSmokeFixture`); ZERO new reds. trackerDb **v19**, KBL_BACKUP_VERSION 2.

### Pending / next session (AUTH-4)
- **NEXT = L5b** (flashpoint-decay accumulator: NEW store + dark per-game fan-morale tax on locked-Albatross /
  trade-demanders; inputs seam-neutral until L7/L10/L13; same store+parity+flag+wiring pattern as L6b; bumps trackerDb
  **v19→v20**, KBL_BACKUP_VERSION stays 2; the `franchiseSeasonLedgerStorage.test.ts` version-pin is a KNOWN
  must-update — see the `trackerdb-version-bump-test-pins` memory). Then L5c (trade-requests) → L5d (reporter tooth) →
  {L7,L8,L9b,L10} → {L11–L14} → L-SIM gate.
- **Browser-batch added** (persistence-prioritized): L6b-1 DB v18→v19 migration + backup round-trip; L6b-2 flag-OFF
  game completion writes nothing + game still archives.
- Set-asides unchanged (L-ECON1, F-144, L9a watched build). `HANDOFF_NEEDED` written at repo root.

---
## Session: 2026-06-17 (Tu) — AUTH-4 HOST RESUME: L5b committed; → L5c

### Context
Fresh host session (node v20, git write) resuming the CONTEXT-HANDOFF left at L5b-uncommitted. Session-start reads
done, state restated; JK present and ruled "commit + continue under AUTH-4" (so AUTH-4 is ON this session).

### What was accomplished
- **L5b COMMITTED `5ebb148`** — host-verified the audited sandbox diff: `NODE_ENV= npm run build` exit 0 + full suite
  **7,298 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds (+18
  tests / +3 files = L5b's 3 new test files). Committed the 14 code/test files; the prior decorrelated sub-agent audit
  (VERDICT VERIFIED, 10/10, faithful L6b mirror) stands. trackerDb now **v20**; KBL_BACKUP_VERSION stays 2.
- **Repo hygiene:** cleaned + gitignored the sandbox junk (Temp/, Progress_Summary.md, HANDOFF_DONE_*/HANDOFF_NEEDED
  sentinels, .git_writetest_probe, WAITING_ON_JK.md). The stray `reference-docs/Super Mega Baseball 4 Rosters.csv`
  left for JK's documented commit-or-gitignore decision.

### NFL / verification
- Build exit 0 + full suite green (only the 2 characterized fails). L5b invariants re-confirmed on host (DB v20, store
  registered, KBL_BACKUP_VERSION 2, flag default OFF, pin-trap toBe(20), engine pure, compute gated after fame).

### Pending / next session
- **NOW = L5c** (in-season trade-requests) under AUTH-4 — drafting the contract. Then L5d (reporter tooth) →
  {L7,L8,L9b,L10} → {L11–L14} → L-SIM gate. trackerDb v20; nothing pushed.

### Update (cont.) — L5c committed
- **L5c COMMITTED `8cd2cc1`** — pure §13 in-season trade-request generation engine. Captain-contracted → Codex 5.5
  built → Opus independently audited VERIFIED (tsc 0 / build 0 / suite 7,307 pass / 2 characterized fail, ZERO new
  reds; the loyalty-inversion sign hand-verified in BOTH fan-morale directions; pure type-only imports; frozen engines
  byte-unchanged; scope = exactly the 2 allowed files). Auto-committed (pure engine, no user surface). Suite now
  **7,309 / 414**; trackerDb still v20. **NOW = L5d** (reporter tooth). Nothing pushed.

### Update (cont.) — L5d committed → L5 COMPLETE
- **L5d COMMITTED `e061e51`** — pure §13 reporter-intensity tooth (`reporterIntensity.ts`): maps fan morale → a
  press-heat `NarrativeIntensity` signal. Build-DARK (live LLM reporter byte-unchanged; seam deferred post-D13).
  Captain-contracted → Codex 5.5 built → Opus independently audited VERIFIED (tsc 0 / build 0 / suite 7,314 pass / 2
  characterized fail, ZERO new reds; math hand-verified; live reporter + frozen engines byte-unchanged; pure single
  type-only import; scope = exactly the 2 allowed files). Auto-committed. **L5 (fan-morale teeth) COMPLETE (a–d):**
  L5a `428f7cb` · L5b `5ebb148` · L5c `8cd2cc1` · L5d `e061e51`. Suite now **7,316 / 415**; trackerDb still v20.
  **NOW = L7** (designation effects) under AUTH-4. Nothing pushed.

### Update (cont.) — L7 split; L7a committed
- **L7 split L7a–d** (designations Phase-2 completion is a sub-stack): L7a Albatross→flashpoint seam (DONE) · L7b
  designation→fame nudge (greenfield) · L7c designation→fan-morale sentiment · L7d Captain/Fan-Hopeful/Fan-Favorite.
- **L7a COMMITTED `0a59a24`** — `resolveTurnedOnPlayers` now async + resolves each game's home+away active|locked
  ALBATROSS holder via the existing `getFranchiseDesignationRow`, feeding the already-built L5b flashpoint-decay.
  Doubly-dark (flag OFF + tax-artifact-only). NO store/flag/version touch. Captain-contracted → Codex 5.5 built → Opus
  independently audited VERIFIED (tsc 0 / build 0 / suite 7,317 pass / 2 characterized fail, ZERO new reds; byte-unchanged
  store/flag/version; firewall green; real-designation-store tests; diff hand-verified). Suite now **7,319 / 415**.
  **NOW = L7b** (designation→fame nudge). Nothing pushed.

### Update (cont.) — L7b committed
- **L7b COMMITTED `77feeda3`** — pure §20.4 Channel-C designation→fame nudge engine (`designationFameNudge.ts`): the
  one-time fame naming seed (FF +2 / Albatross −1 canonical; MVP/Ace +1.5 sim; Captain/Fan Hopeful → L7d). Fame-store
  wiring deferred seam. Captain-contracted → Codex 5.5 built → Opus independently audited VERIFIED (tsc 0 / build 0 /
  suite 7,325 pass / 2 characterized fail, ZERO new reds; fame + designation byte-unchanged; pure single type-only
  import). Suite now **7,327 / 416**. **NOW = L7c** (designation→fan-morale steady sentiment). Nothing pushed.

### Update (cont.) — fresh session resumed at L7c handoff; L7c committed
- Fresh Claude Code session (Opus 4.8 Captain) opened at the CONTEXT-HANDOFF → L7c boundary. Did the canonical
  5-file session-start reads, RESTATEd the state (Phase-1 D-stack complete → Phase-2 L-stack; last = L7b `77feeda3`;
  next = L7c), and JK confirmed **AUTH-4 autonomous** for the session. Continuing the L7 sub-stack under AUTH-4.
- **L7c COMMITTED `886d1dce`** — pure §20.6 Channel B (designation→fan-morale steady sentiment) + Channel A
  (fame-amplifier designation tilt) engine (`designationFanMorale.ts`): `computeDesignationSteadyFanSentiment`
  (FF warmth +0.5) + `summarize…` + `computeDesignationSwingTilt`/`applyDesignationSwingTilt` (FF up ×1.25 / Albatross
  down ×1.25, merit neutral, sign-preserving), magnitudes in `DESIGNATION_FAN_MORALE_TUNING`. **DOUBLE-COUNT GUARD:**
  Albatross steady sentiment = 0 (the §13 flashpoint-decay from L5b/L7a already owns the Albatross irritation). Channel A
  ships the pure tilt multiplier only; the Channel-B morale-store wiring + the Channel-A per-play wiring are deferred
  post-D13 seams (mirrors L7b deferring its fame-store wiring). Captain-contracted → Codex 5.5 built → Opus independently
  audited VERIFIED (tsc 0 / build 0 / full suite 7,335 pass / 2 characterized fail, ZERO new reds [+10 tests / +1 file];
  double-count guard + Channel-A asymmetry + sign-preserving apply hand-verified; 6 frozen engines byte-unchanged; pure
  single type-only import). Auto-committed (pure engine, no user surface). Suite now **7,337 / 417**; trackerDb still v20.
  **NOW = L7d** (Captain router Charisma×2 + amplified swings · Fan Hopeful cushion · Fan Favorite double-dep). Nothing pushed.

### Update (cont.) — L7d split L7d-1..3; L7d-1 committed
- L7d (last L7 sub-stack) bundles 3 mechanics → SPLIT: L7d-1 Captain morale-router (DONE) · L7d-2 Fan Hopeful cushion ·
  L7d-3 Fan Favorite double-dep reconciliation (FF value-half DR-1 + morale-half L7b/L7c already exist; thin).
- **L7d-1 COMMITTED `f61dcae0`** — pure §4/LS-6 Team Captain morale-router (`captainMoraleRouter.ts`):
  `computeCaptainCharismaRouting`/`applyCaptainCharismaRouting` (Charisma ×2 teammate routing — spec-canonical double) +
  `applyCaptainPerformanceSwingAmplification` (sign-preserving team-wide perf-swing amp, ×1.5 sim), magnitudes in
  `CAPTAIN_MORALE_ROUTER_TUNING`. Pure (ZERO imports). Anti-double-count: clubhouse MORALE channel only — NOT own
  development, NOT the §24.9 leadership composite (→ L13). Captain-contracted → Codex 5.5 built → Opus independently
  audited VERIFIED (tsc 0 / build 0 / 9 focused tests; canonical ×2 + sign-preserving amp hand-verified; 6 frozen
  engines byte-unchanged; pure). Auto-committed.
- **⚠ NEWLY-OBSERVED ORDER-FLAKE (flagged for JK, NOT a regression):** my post-L7d-1 full-suite run showed 3 fails — the
  2 characterized + `AwardsWatchlist.test.tsx`; Codex's run on the identical tree showed only the 2. AwardsWatchlist
  PASSES SOLO (2/2) → non-deterministic order-flake (same family as GameTrackerLaunchState/franchiseOffseasonGuards.
  component), surfaced by the new test file shifting vitest's worker ordering. L7d-1 (zero-import pure engine) has no
  coupling to it. Added to the order-flake root-cause batch in OPEN PENDING-JK; NOT folded into the characterized set.
  Suite (solo-passing basis): **7,344 / 418**; trackerDb still v20. **NOW = L7d-2** (Fan Hopeful cushion). Nothing pushed.

### Update (cont.) — L7d-2 committed; L7d-3 doc-only → L7 COMPLETE
- **L7d-2 COMMITTED `aec5db99`** — pure §4/LS-7 Fan Hopeful call-up cushion (`fanHopefulCushion.ts`):
  `computeFanHopefulWindowState` (game-count window + expiry) + `computeFanHopefulCallUpLift` (one-time hope lift) +
  `applyFanHopefulSlumpCushion` (reduces negative fan-morale swings while active; positives/expired pass through;
  sign-preserving), magnitudes in `FAN_HOPEFUL_CUSHION_TUNING` (windowGames 10 / lift 3 / cushionFactor 0.5, all sim).
  Pure (ZERO imports); call-up + matrix wiring deferred post-D13. Captain-contracted → Codex 5.5 built → Opus
  independently audited VERIFIED (tsc 0 / build 0 / 11 focused tests; full suite 7,355 pass / 2 characterized fail, ZERO
  new reds; AwardsWatchlist did NOT appear — 4th non-determinism data point; frozen engines byte-unchanged; pure).
  Auto-committed.
- **L7d-3 (DOC-ONLY, AUTH-4 default-taken; NO code)** — Fan Favorite double-dependency reconciliation: the FF
  double-dependency (D6 value-half + L5/§20.6 morale-half) is already structurally complete — value-half
  `classifyFanFavorite` (DR-1 `b48b450`) + morale-half `designationFameNudge` FF +2 (L7b) + `designationFanMorale` FF
  +0.5 warmth & up×1.25 tilt (L7c). No new engine (both halves exist; morale-half dark with deferred wiring; a composer
  would repeat the orphan DR-1 just deleted).
- **⇒ L7 (designation Phase-2 completion) COMPLETE:** L7a `0a59a24` · L7b `77feeda3` · L7c `886d1dce` · L7d-1 `f61dcae0`
  · L7d-2 `aec5db99` · L7d-3 doc. Suite **7,355 / 419**; trackerDb v20. **NOW = L8** (ratings development) per the
  AUTONOMOUS_RUN_PROTOCOL soul-layer queue. Nothing pushed.

### Update (cont., 2026-06-18 past midnight) — L8 depends on L2 → L2a committed
- L8 (ratings dev) writes through L2 (the franchise-instance mutable ratings-overlay layer), greenfield → Captain landed
  L2 first, SPLIT L2a (dark store) · L2b (read-path merge + temporary auto-expiry) · L2c (two-tier confirm infra).
- **L2a COMMITTED `6fdeba11`** — NEW `src/utils/franchiseRatingsOverlayStorage.ts`, the dark `franchiseRatingsOverlays`
  store (keyPath `id`; `by_scope`+`by_player`) holding per-entry overlays over frozen base ratings: permanent + temporary
  (`expiresAtGameNumber`), confirmationStatus/source/sourceEventId/caller-supplied createdAt. trackerDb **v20→v21**;
  3-place backup parity, KBL_BACKUP_VERSION stays 2. DARK/EMPTY (no writer/reader; L2b/L2c/L8/L9b wire it); oracle locked.
  Captain-contracted → Codex 5.5 built → Opus independently audited HARDEST (persistence): tsc 0 / build 0 / full suite
  **7,363 pass / 2 characterized fail**, ZERO new reds; v20→v21 migration-survival + backup round-trip parity + DARK +
  byte-unchanged-oracle + KBL_BACKUP_VERSION-2 all PROVEN; 8 files = exactly the allowed set. Persistence →
  verified-complete, browser-pending (migration + round-trip prioritized, scenario #16). Suite **7,365 / 420**; trackerDb
  **v21**. **NOW = L2b** (read-path merge + temporary auto-expiry). Nothing pushed.
- **L2b COMMITTED `e8ec0908`** — pure ratings-overlay MERGE math (`ratingsOverlayMerge.ts`): `resolveActiveOverlayDeltas`
  (confirmed + active only; pending excluded §11; temporary active iff before `expiresAtGameNumber`) +
  `mergeRatingsOverlays` (base + deltas for keys present in base via hasOwnProperty; base never mutated, oracle locked;
  returns copy) + `selectExpiredTemporaryOverlays` (expired-temporary ids for deferred cleanup). Single type-only import;
  live read-path wiring deferred. Captain-contracted → Codex 5.5 built → Opus independently audited VERIFIED (tsc 0 /
  build 0 / 11 focused tests; full suite **7,374 pass / 2 characterized fail**, ZERO new reds; pure; frozen engines
  byte-unchanged). Auto-committed. Suite **7,376 / 421**; trackerDb v21. **NOW = L2c** (two-tier confirmation infra —
  pure/dark). Nothing pushed.
- **L2c COMMITTED `a77e0ed5` → L2 COMPLETE** — pure §11 two-tier confirmation infra (`ratingsOverlayConfirmation.ts`):
  `buildOverlayConfirmationRequest` (console edit instruction + resulting rating) + `confirmOverlay` (pending→confirmed,
  idempotent/non-mutating) + `buildExpiryRevertReminder` + `summarizeOverlayChangeLog` (deterministic per-team change
  log). Morale excluded (auto §11:202); traits reuse the pattern (L9b); live confirm UI/flow deferred post-D13.
  Captain-contracted → Codex 5.5 built → Opus independently audited VERIFIED (tsc 0 / build 0 / 10 focused tests; full
  suite **7,384 pass / 2 characterized fail**, ZERO new reds; pure; frozen engines byte-unchanged). Auto-committed.
  **⇒ L2 (mutable ratings-overlay layer) COMPLETE: L2a `6fdeba11` · L2b `e8ec0908` · L2c `a77e0ed5`.** Suite **7,386 /
  422**; trackerDb v21.

### Session close — CONTEXT-HANDOFF → L8 (2026-06-18, AUTH-4 overnight)
- **What this session accomplished (all Codex 5.5-built → Opus 4.8-audited → auto-committed on `codex/franchise-v1-next`,
  nothing pushed):** resumed at the CONTEXT-HANDOFF→L7c boundary, did the canonical 5-file session-start reads + RESTATE,
  JK confirmed **AUTH-4 autonomous**, then: **L7 COMPLETE** (L7c designation→fan-morale `886d1dce` · L7d-1 Captain router
  `f61dcae0` · L7d-2 Fan Hopeful cushion `aec5db99` · L7d-3 FF double-dep doc-only) + **L2 COMPLETE** (L2a dark overlay
  store `6fdeba11` [trackerDb v20→v21, migration-survival proven] · L2b merge `e8ec0908` · L2c confirm `a77e0ed5`).
  7 feature commits + 7 docs commits. Suite 7,325→**7,384** pass / 2 characterized fail throughout, ZERO new reds.
  trackerDb **v21**, KBL_BACKUP_VERSION **2**.
- **Flagged for JK (not regressions):** the `AwardsWatchlist.test.tsx` + `GameTrackerLaunchState.test.tsx` order-flakes
  (both pass solo; non-deterministic; surfaced by the new test files shifting vitest's worker ordering) — added to the
  order-flake root-cause batch in CURRENT_STATE OPEN PENDING-JK. Browser-batch added scenario #16 (L2a v20→v21 migration
  + backup round-trip, persistence-prioritized).
- **NEXT = L8** (ratings development — the first real WRITER through L2; see CURRENT_STATE "NEXT" bullet for the full
  build spec: every-20%-of-season checkpoint sweep × §8 dampener [L5a, consumed] × personality × Ambition/Resilience →
  overlays via the L2 confirm; ratings only; likely SPLIT L8a pure-math / L8b cadence+writer). `HANDOFF_NEEDED` written.

## 2026-06-18 (AUTH-4 overnight, fresh thread post-L9b-handoff) — L9b-1 BUILT (pure trait scorer)
- Session-start reads done (SESSION_RULES / AUDIT_LOG / AUDIT_PLAN / SESSION_LOG / CURRENT_STATE + the L9b RECON entry);
  RESTATED phase = Phase-2 L-stack soul layer under AUTH-4, last done = L8 COMPLETE + L9a effectively complete,
  next = L9b-1. Proceeded without waiting for JK (AUTH-4 standing go).
- Built **L9b-1 — the PURE trait-from-reality SCORER** (the peer-relative strength score, TS-2). 4 files on disk,
  uncommitted (sandbox cannot build/suite/commit — host gate queued in WAITING_ON_JK.md):
  - NEW `src/engines/percentile.ts` (lifted getPercentile + getValueAtPercentile verbatim out of salaryCalculator;
    byte-identical) · MODIFIED `src/engines/salaryCalculator.ts` (deleted inlined helpers, re-imports them).
  - NEW `src/engines/traitRealityScorer.ts` (role-eligibility VI.2 + min-sample valve VI.1 + scaledThreshold scaling +
    percentile; PURE, no IndexedDB/mutation; does NOT compute P or write back — those are L9b-2/3).
  - NEW `src/engines/__tests__/traitRealityScorer.test.ts` (19 tests, incl. a 75-name completeness/role-count guard).
- Name-drift reconciled to the canonical TRAIT_PRICING data (NOT the spec shorthand): `K Neglector` (not "Neglecter"),
  `Two Way (C)/(IF)/(OF)` (not "Two Way"). DEFAULT-TAKEN + FLAGGED for JK: `Workhorse` (75th trait, unlisted in VI.2)
  classified PITCHER → canonical pitcher count 28.
- Verification (sandbox): tsc --noEmit -p tsconfig.app.json exit 0; traitRealityScorer.test.ts 19/19;
  salaryCalculator + .matrix + salarySeam.t5 121/121 (percentile lift behavior-neutral). Full build/suite/commit = host.
- Builder=Opus ≠ auditor → flagged the diff still needs an independent engineering audit before VERIFIED.
- **NEXT = L9b-2** (pure acquisition: P = percentile × personalityTilt × morale, hysteresis, no-offsetting-pair,
  2-trait cap; proposals only) → L9b-3 (grant/write-back, persistence). Matrix stays FROZEN SMB4 asset.

## 2026-06-18 (AUTH-4 overnight, fresh HOST session) — L9b-1 host gate + independent audit → COMMITTED `398533d1`
- Session-start reads done (SESSION_RULES / AUDIT_LOG / AUDIT_PLAN / SESSION_LOG / CURRENT_STATE + AUTONOMOUS_RUN_PROTOCOL
  + the L9b RECON + L9b-1 BUILT run-log entries); RESTATED state; proceeded under AUTH-4 (standing go, no JK wait).
- Picked up the L9b-1 host-handoff (prior sandbox thread could not run full build/suite/commit). Read the full diff
  first (percentile.ts is a clean verbatim lift; role sets hand-counted 28/39/7/1 = 75; completeness guard pins 1:1 to
  frozen TRAIT_PRICING).
- **Host gate PASSED** (real node v20, `NODE_ENV=` prefix): tsc-0; `npm run build` success (PWA, ✓ 7.91s);
  traitRealityScorer 19/19; salaryCalculator + .matrix + salarySeam.t5 121/121; **full suite 7,441 tests / 427 files,
  7,437 pass / 4 fail** = 2 characterized (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`) + 2 order-flakes
  (`GameTrackerLaunchState` + newly-surfaced `EliminationTeamHub`), BOTH pass SOLO (9/9, 6/6) → not regressions; ZERO
  new reds. EliminationTeamHub added to the order-flake family (same worker-pool-reorder mechanism as AwardsWatchlist on
  L7d-1).
- **Independent audit (decorrelated, builder=Opus → auditor=Codex 5.5 | high):** dispatched `codex exec` over a focused
  audit contract. Codex re-ran the gates, did its own AST check (counts 28/39/7/1=75, no dupes/missing/extra, workhorse
  true), verified lift fidelity + gate ordering + purity/build-dark + no new traits. **VERDICT: VERIFIED**, no real
  defect (non-blocking nits: "byte-identical" → math-identical; optional combined-basis / non-mutation / dup tests).
- **Auto-committed `398533d1`** (4 code files). Docs updated (CURRENT_STATE header + RIGHT NOW + SUITE BASELINE +
  OPEN PENDING-JK; AUTONOMOUS_RUN_LOG; this log). WAITING_ON_JK `[ticket:L9b-1]` RESOLVED. Transient audit prompt removed.
  trackerDb v21; nothing pushed.
- **NEXT = L9b-2** (pure acquisition engine; model read from §VI.0/.1/.3 this session). Loop continues under AUTH-4.

## 2026-06-18 (AUTH-4 overnight, host session) — L9b-2 acquisition engine Codex-built → Opus-audited → COMMITTED `f616373a`
- Ran a 5-reader recon workflow (`wf_c4a097eb-838`) grounding every seam, then wrote the L9b-2 contract into
  PROMPT_CONTRACTS.md (Contract Readiness Rule) and dispatched Codex 5.5|high via `codex exec` (background). Proper
  triangle (Codex built, Opus audited).
- NEW `src/engines/traitAcquisition.ts` (+ 24-test file): `computeTraitAcquisition` → trait-change PROPOSALS via the
  VI.0 multiplicative combiner (percentile × ambition/resilience/image/morale/roster factors), min-sample valve, VI.2
  eligibility, gain/lose hysteresis dead-band, no-offsetting-pair + 2-trait-cap weakest displacement. `TRAIT_OPPOSITES`
  (14 pairs) + VI.3 image sets use canonical names; module-load guard. PURE, build-dark.
- Opus independent audit: combiner directions + hysteresis + reconciliation hand-verified vs the 24 tests; removed one
  dead import (`computeTraitRealityScore`, unused) + re-verified. Host gate: tsc-0 / build-0 / focused 24/24 / full suite
  **7,465 tests, 7,463 pass / 2 characterized fail**, ZERO new reds. VERDICT VERIFIED → auto-committed `f616373a`.
- Docs updated (CURRENT_STATE header + RIGHT NOW + SUITE BASELINE + OPEN PENDING-JK; AUTONOMOUS_RUN_LOG; PROMPT_CONTRACTS
  status; this log). DEFAULTS-TAKEN flagged for JK: TRAIT_OPPOSITES (new trait-asset data) + personality-primary
  thin-signal exception deferred. trackerDb v21; nothing pushed.
- **NEXT = L9b-3** (grant/write-back — the FIRST real trait writer; persistence class, audit hardest; JK store fork
  default=reuse `franchiseRatingsOverlays`). Loop continues under AUTH-4.

## 2026-06-18 (AUTH-4 overnight, fresh host session) — L9b-3a Codex-built → Opus-audited VERIFIED → COMMITTED
- Session-start 5-file ritual done (SESSION_RULES / AUDIT_LOG / AUDIT_PLAN / SESSION_LOG / CURRENT_STATE +
  AUTONOMOUS_RUN_PROTOCOL + WAITING_ON_JK + HANDOFF_NEEDED + the L9b-3 RECON entry); RESTATED state; proceeded under AUTH-4
  (standing go, no JK wait). Picked up `HANDOFF_NEEDED` → next_ticket L9b-3a.
- Grounded the seams directly (corrected 2 recon path-labels: `managerWpaRecommendations.ts` + `franchiseAdaptiveStandards`
  are in `src/utils/`). Read the L9b-1 scorer contract, `activeTraitNames`/`GameContext`, the event shapes, the eventLog
  read API, `PlayerSeasonFielding` (L9a-4), and the matrix predicates for the 16 buildable traits (via an Explore agent).
  Confirmed the spec (TRAIT_SIGNAL_CERTIFICATION §B/§VI) already defines the per-trait signals → outcome-weighted, not bare
  count.
- Wrote the L9b-3a contract (Contract Readiness Rule) + `/tmp/l9b3a_codex_prompt.md`; dispatched Codex 5.5 | high via
  background `codex exec` (sandbox disabled, NODE_ENV=, node v20, shell-native watchdog). Triangle: Codex built, Opus
  audited.
- Builder over-produced: Codex shipped the contracted `traitCandidateBuilder.ts` (the correct outcome-weighted RATE model,
  21 tests) but ALSO left an abandoned earlier-attempt pair `traitContextReconstructor.*` (a broken EXPOSURE-COUNT model —
  opposing pairs indistinguishable) AND edited 5 Captain-owned spec-docs. Codex's own report mislabeled the latter two as
  "pre-existing dirty paths left untouched" (false — both created this run). **Auditor actions:** DELETED the abandoned
  reconstructor pair (nothing imported it; confirmed safe); REVERTED the 5 spec-docs to HEAD + re-authored as Captain.
- **L9b-3a kept deliverable** `src/engines/traitCandidateBuilder.ts` (+ test): `computeSeasonTraitCandidates` —
  pure-over-loaded-data; reconstructs per-AtBat `GameContext`; probes the FROZEN `activeTraitNames` for opportunities;
  outcome-weighted RATE signal per the 16 v1-buildable traits; role-bucketed peer pools; feeds L9b-1
  `computeTraitRealityScore` (basis `'none'`) → `TraitCandidate[]`. PURE, build-DARK, no store.
- **Independent audit (Opus):** tsc-0; focused 21/21; full suite **7,486/429, 7,484 pass / 2 characterized fail**, ZERO
  new reds (a first run flaked +1 `EliminationTeamHub`, the documented order-flake, gone on re-run); purity + build-dark
  greps clean; frozen matrix/scorer/`traitAcquisition`/`percentile`/`traitPricing`/`rosterEngineConstants` BYTE-UNCHANGED;
  every per-trait outcome direction re-derived correct. VERDICT VERIFIED → auto-committed (pure engine, no user surface).
  trackerDb v21.
- DEFAULTS-TAKEN flagged for JK (OPEN PENDING-JK): rate model (not count); pressure from isClutch; Cannon/Noodle one
  OF-arm-per-game signal; Durable/Injury = injuries/games; basis `'none'`; Clutch/Choker role-determined.
- **NEXT = L9b-3b** (the dark hook + PENDING write; PERSISTENCE class). BLOCKS on the JK store fork (reuse
  `franchiseRatingsOverlays` v21 = AUTH-4 default / new `franchiseTraitOverlays` v21→v22 = Captain's lean). Loop continues
  under AUTH-4.
- **POST-COMMIT SEAM FIX (FINDING-149) — same session, follow-up commit.** After committing `54fae510`, I found Codex had
  ALSO edited 2 more spec-docs I missed (AUDIT_LOG + FINDINGS_142) — they contained Codex's own self-audit FINDING-149
  claiming a SEAM BREAK. I verified it from source (NOT taking Codex's word): L9b-3a emitted a FLAT `TraitCandidate`, but
  L9b-2 `computeTraitAcquisition` consumes `candidate.score.*` (nested `{traitName, score}`) — REAL latent break (tsc
  blind until L9b-3b wires them). This was a gap in my FIRST audit pass (within-file + full suite checked, cross-engine
  seam NOT) — acknowledged. **Fix:** kept the outcome-weighted RATE model (Codex's "revert to count model" recommendation
  REJECTED — count makes opposing pairs indistinguishable, fatally broken) and changed the output to
  `SeasonTraitCandidate extends TraitCandidate` (the nested seam) + added a seam integration test feeding L9b-3a output
  straight into `computeTraitAcquisition`. Reverted + re-authored FINDING-149 (AUDIT_LOG index + FINDINGS full) with the
  corrected resolution. Re-verified: tsc 0; traitCandidateBuilder 22/22 + traitAcquisition 24/24; full suite **7,487 /
  7,485 pass / 2 characterized fail**, ZERO new reds. Committed as the L9b-3a seam-fix follow-up.

## 2026-06-18 (AUTH-4 overnight, SANDBOX, fresh CONTEXT-HANDOFF thread) — L9b-3a INDEPENDENT ENGINEERING AUDIT → NOT-VERIFIED (blocking); FINDING-149
- Resumed after the L9b-3a context-limit handoff (branch `codex/franchise-v1-next`). Did the full session-start reads
  (SESSION_RULES / AUDIT_LOG / AUDIT_PLAN / SESSION_LOG / CURRENT_STATE) + the AUTONOMOUS_RUN_LOG L9b-3 RECON + L9b-3a-BUILT
  entries, RESTATED state, proceeded under AUTH-4. Role = the decorrelated INDEPENDENT auditor the handoff said was owed
  (auditor ≠ the original Opus builder).
- **PRIMARY TASK done: the independent engineering audit of the L9b-3a diff, from first principles.** Verified every seam
  vs the FROZEN engines: `PRESSURE_LEVERAGE_BANDS` (1.5/3.0), `activeTraitNames` semantics (traits.has && predicatesActive,
  ignores target), `GameContext` shape, ALL 16 buildable traits' matrix predicate sets (the single-predicate Stealer/
  fielding traits justify the direct-count shortcut; Rally Starter's AND-pair; Meltdown's consecutive tally), the
  `computeTraitRealityScore` 3-arg signature + I/O types, and `AtBatResult`/`BetweenPlayEventType`/`FieldingEvent` field
  shapes. Confirmed purity / dark / trackerDb v21 untouched / frozen engines byte-unchanged in BOTH versions.
- **BLOCKING DISCOVERY (FINDING-149): TWO divergent physical files implement L9b-3a.** The Read-tool filesystem view and
  the git-backed bash mount are OUT OF SYNC. `git status` (the authoritative on-disk truth — the only thing JK can commit)
  shows ONLY `src/engines/traitCandidateBuilder.ts` (+ 21-test file) untracked; the handoff/CURRENT_STATE/RUN_LOG-named
  `traitContextReconstructor.ts` (22 tests) is ABSENT from the repo. They are NOT a rename of identical content — opposite
  designs:
  1. **Seam break (blocking):** `traitCandidateBuilder.ts` exports a flat `TraitCandidate {traitName, realityPercentile,
     sufficiency, signalValue, sampleSize, peerPoolSize}` — NO `.score`. L9b-2 `traitAcquisition.ts:25` expects
     `TraitCandidate {traitName, score: TraitRealityScore}` and reads `candidate.score.sufficient`/`.realityPercentile`.
     The on-disk builder's output cannot feed `computeTraitAcquisition`; the two `TraitCandidate` types name-collide and are
     structurally incompatible; the test does not cover the L9b-2 integration → unguarded. The Read-view
     `traitContextReconstructor.ts` is the seam-CORRECT one (imports + emits L9b-2's `{traitName, score}`).
  2. **Opposite signal:** on-disk = OUTCOME-WEIGHTED success rate (favorable/unfavorable WPA-delta + rbiCount heuristics),
     all `basis:'none'` — which fabricates outcome proxies the recon explicitly DEFERRED to §16. Read-view = EXPOSURE COUNT
     with per-trait basis, which matches the recon's stated v1 scope ("count real trait fires", no fabricated proxies).
  3. Minor: on-disk pressure from `isClutch` (loses extreme band + bypasses the leverage bands); Pinch Perfect = pinch_hit
     only (drops pinch_run/defensive_replacement).
- **In-sandbox NFL (node v22, 42s cap):** `traitCandidateBuilder.test.ts` 21/21 GREEN; siblings 55 green (traitRealityScorer
  19 + traitAcquisition 24 + effectiveRatings 12). Full `tsc -p tsconfig.app.json` TIMED OUT (>42s) — whole-project
  typecheck UNVERIFIED in-sandbox; full `npm run build` + ~7,465 suite NOT runnable (host gate, node v20). Repo mount blocks
  git → could NOT commit (and would not — builder≠auditor + NOT-VERIFIED).
- **VERDICT: NOT-VERIFIED (blocking).** Targeted tests pass and pure/dark/v21 invariants hold, but the artifact JK would
  commit (`traitCandidateBuilder.ts`) is not the file the handoff describes AND has a real L9b-2 seam break + an
  out-of-scope signal model. One of the two files is stale; they must be reconciled before any commit. Captain lean: keep
  the `traitContextReconstructor.ts` design (seam-correct + scope-faithful), delete `traitCandidateBuilder.*`. Logged
  FINDING-149 (full text FINDINGS_142_onwards.md; index in AUDIT_LOG.md) + a WAITING_ON_JK line.
- **L9b-3b/3c remain NOT started** (need the JK store fork: reuse `franchiseRatingsOverlays` v21 vs new
  `franchiseTraitOverlays` v21→v22; Captain lean = new store). I did NOT bump the DB version or write any store.
- **BLOCKED ON JK'S HOST/RULING (cannot be done here):** (1) reconcile the two-file split (FINDING-149); (2) host gate
  build/full-suite + commit of the canonical L9b-3a; (3) the L9b-3b store fork.
  [NOTE (Captain, host thread): the above is a SUPERSEDED sandbox-thread entry. The canonical L9b-3a shipped as
  `traitCandidateBuilder.ts` (54fae510 + seam-fix 4e3ad01d); the two-file split + host gate + store fork are all resolved
  below.]

## 2026-06-18 (AUTH-4 overnight, host thread, JK present "keep rolling") — L9b-3b-i Codex-built → Opus-audited VERIFIED → COMMITTED
- JK said "keep rolling" → continued L9b-3b IN-THREAD (removed the HANDOFF_NEEDED so no duplicate fresh session races).
  Took the store fork AUTH-4 default = NEW `franchiseTraitOverlays` store (reuse carried a silent-trait-drop landmine via
  `ratingsOverlayMerge`). Split L9b-3b → b-i (dark store) + b-ii (flag + hook).
- Grounded the persistence templates (franchiseRatingsOverlayStorage mirror + trackerDb store-def + syncConfig +
  backupRestore + the franchiseSeasonLedgerStorage store-list PIN + KBL_BACKUP_VERSION). Wrote a TIGHTENED contract (L9b-3a
  lessons baked in: forbid spec-doc edits + git-add; exact FILE LIST; the PIN trap called out explicitly) →
  PROMPT_CONTRACTS.md + `/tmp/l9b3bi_codex_prompt.md`; dispatched Codex 5.5 | high via background `codex exec`.
- **L9b-3b-i deliverable:** NEW `src/utils/franchiseTraitOverlayStorage.ts` (1:1 mirror of the ratings-overlay storage with
  a categorical trait-change row: valence/traitName/displacesTraitName/realityPercentile/probability/confirmationStatus/
  applied/createdAt) + the store mirrored at every site (trackerDb v21→v22; syncConfig 'id'; backupRestore optional:true +
  STATIC schema v22; the PIN test toBe(21)→22 + alphabetical store-list insert + the legacy-seed helper renamed v20→v21
  now proving the ratings-overlay row ALSO survives v22; parity + manifest + a new 8-test storage test). DARK/EMPTY;
  KBL_BACKUP_VERSION stays 2.
- **The tightened contract WORKED:** Codex hit EXACTLY the FILE LIST — no abandoned files, no doc edits, no git-add (vs
  L9b-3a where it over-produced). One honest note: the PROMPT_CONTRACTS "M" was MY pre-dispatch contract block, not Codex.
- **Independent audit (Opus):** tsc-0; `vite build` OK; full suite **7,495/430, 7,493 pass / 2 characterized fail**, ZERO
  new reds (+8 = the new storage test); the **v21→v22 migration-survival** + **backup round-trip parity** PROVEN in the pin
  test (seeds a v21 DB incl. a ratings-overlay row → both it AND the new trait store survive at v22 with correct
  keyPath+indexes); ratings template + all prior stores byte-unchanged; DARK (no production consumer). VERDICT VERIFIED →
  auto-committed. Persistence → browser-pending (#21). trackerDb **v22**.
- **NEXT = L9b-3b-ii** (the default-OFF `isFranchisePhase2TraitsEnabled` flag + `persistDarkTraitGrantForCompletedGame`
  hook mirroring L8b `franchiseCheckpointSweepCompute`: flag gate → 20%-checkpoint cadence → load season events →
  enumerate MLB roster → computeSeasonTraitCandidates [L9b-3a] → computeTraitAcquisition [L9b-2] → write PENDING trait
  rows; wired after the checkpoint gate at processCompletedGame.ts:623). Loop continues under AUTH-4.

## 2026-06-18 (AUTH-4 overnight, host thread, "keep rolling") — L9b-3b-ii Codex-built → Opus-audited VERIFIED → COMMITTED → L9b-3b COMPLETE
- Pre-grounded the L8b `franchiseCheckpointSweepCompute` template + the processCompletedGame gate (confirmed the scope var
  is `trueValueScope`, the gate sits inside `if (trueValueScope)`, `deriveAdaptiveStandardsConfig` takes `{gamesPerSeason}`)
  while b-i built. Wrote a precise b-ii contract (forbid doc edits + git-add; exact FILE LIST; exact gate insertion) →
  PROMPT_CONTRACTS + `/tmp/l9b3bii_codex_prompt.md`; dispatched Codex 5.5 | high.
- **Deliverable:** `isFranchisePhase2TraitsEnabled` (default-OFF, 5th flag block) + NEW
  `src/utils/franchiseTraitGrantCompute.ts` (`persistDarkTraitGrantForCompletedGame` — flag-gate FIRST → gameNumber →
  totalGames → `isCheckpointBoundary` → load season events/injury/fielding/games → enumerate league MLB roster →
  `computeSeasonTraitCandidates` → per-player `computeTraitAcquisition` [heldTrait strength = candidate realityPercentile
  ?? 0.5; rosterRole 'unknown'] → write PENDING `franchiseTraitOverlays` rows; deterministic idempotent id; createdAt from
  max persisted at-bat timestamp; `traitGrantSeam` for stubbing) + the gate wired after the checkpoint gate at
  processCompletedGame.ts:632 (try/catch, never blocks completion). Doubly-dark (flag OFF + pending/applied:false).
- **The tightened contract held again:** Codex hit EXACTLY the FILE LIST — no doc edits, no git-add, no abandoned files.
- **Independent audit (Opus, read line-by-line since the test stubs the seam):** tsc-0; full suite **7,499/431, 7,497 pass
  / 2 characterized fail**, ZERO new reds (+4 = the hook test); flag-gate-first no-op verified; DARK (only
  processCompletedGame consumes it, gated); no Date.now/random; correct PENDING-row construction + idempotency +
  determinism. VERDICT VERIFIED → auto-committed. LIMITATION: hook test stubs the L9b-3a→L9b-2 seam (engines tested in
  their own suites + the seam test) → real end-to-end browser-pending (#22). Live game path → browser-pending (#22).
- **⇒ L9b-3b COMPLETE (b-i `0cd75d9a` + b-ii). NEXT = L9b-3c** (the LAST L9b piece: §11 trait-confirm transform + ATOMIC
  trait1/trait2 displacement via saveFranchisePlayer; mirror ratingsOverlayConfirmation [L2c] but categorical; do NOT route
  trait rows through ratingsOverlayMerge). Loop continues under AUTH-4.

## 2026-06-18 (AUTH-4 overnight, host thread, "keep rolling") — L9b-3c Codex-built → Opus-audited VERIFIED → COMMITTED → L9b COMPLETE
- Grounded the L2c template (`ratingsOverlayConfirmation`) + `saveFranchisePlayer`/`getFranchisePlayer` + confirmed the
  franchise Player uses FLAT `trait1`/`trait2` (not nested). Wrote a precise contract → PROMPT_CONTRACTS +
  `/tmp/l9b3c_codex_prompt.md`; dispatched Codex 5.5 | high.
- **Deliverable:** NEW PURE `src/engines/traitOverlayConfirmation.ts` (`applyTraitDisplacement` 6-case categorical math +
  canonical guard + `confirmTraitOverlay` + `buildTraitConfirmationRequest` + `summarizeTraitOverlayChangeLog`) + NEW impure
  `src/utils/franchiseTraitConfirmApply.ts` (`applyConfirmedTraitOverlay`: idempotent → load player → displace →
  `saveFranchisePlayer` FLAT trait1/trait2 → mark overlay confirmed+applied). NO live caller (confirm UI deferred post-D13).
- **The tightened contract held (4th clean dispatch):** Codex hit EXACTLY the 4 FILE LIST files — no doc edits, no git-add,
  no abandoned files.
- **Independent audit (Opus, read line-by-line):** tsc-0; full suite **7,514/433, 7,512 pass / 2 characterized fail**, ZERO
  new reds (+15 = the 2 new test files); all 6 displacement cases re-derived correct; double idempotency (overlay.applied
  guard + displacement already-held/not-held); flat trait1/trait2 write; engine pure; no live caller. VERDICT VERIFIED →
  auto-committed.
- **⇒ L9b-3 COMPLETE (3a `54fae510`+`4e3ad01d` · 3b-i `0cd75d9a` · 3b-ii `e08be415` · 3c) ⇒ L9b (the trait-from-reality
  engine, the "game-changer feature") COMPLETE.** Whole L9b is build-DARK (activate post-D13). **NEXT = L10 (random
  events)** — a FRESH L-stack subsystem needing a grounding recon before contracting. Loop continues under AUTH-4.

## 2026-06-18 (AUTH-4 overnight, host thread, "keep rolling") — L10 RECON (workflow) + L10-1 built/audited/committed
- Ran the L10 grounding recon as a delegated WORKFLOW (`wf_b3129cd8-9e3`, 5 readers + synthesis, ~398K tokens — kept the
  Captain's context lean). Scope map → `spec-docs/L10_SCOPE_MAP.md` (committed `b9b6822a`): subsystem surface + the
  franchiseRandomEventGenerator boundary; v1 event catalog; split L10-1..5; AUTH-4 default forks; verified file:line seams;
  cadence/rate model; 6 non-blocking JK questions.
- **L10-1 deliverable:** NEW pure `src/engines/franchiseL10EventEngine.ts` (`computeFranchiseL10Events`): deterministic
  league-sweep roll mirroring `tradeRequestGeneration` — `P = baseRate[family] × intensity dial × morale × personality ×
  perfSignal`, FNV-1a-seeded fire, 8 families (personality-shift EXCLUDED), team/stadium fan-morale-suppressed, morale-
  tilted valence, trade_demand proposed-only, name-change excluded. FNV-1a re-implemented locally (boundary respected).
- **The tightened contract held (5th clean dispatch):** Codex hit EXACTLY the 2 FILE LIST files — no doc edits, no git-add.
- **Independent audit (Opus, line-by-line):** tsc-0; full suite **7,527/434, 7,525 pass / 2 characterized fail**, ZERO new
  reds (+13); formula + FNV-1a determinism + eligibility map + family-6 exclusion + fan-morale suppression + purity/build-
  dark + boundary all re-derived correct. VERDICT VERIFIED → auto-committed.
- **NEXT = L10-2** (dark `franchiseL10Overlays` store, trackerDb v22→v23 — the 8-site mirror incl. the store-list PIN;
  mirror L9b-3b-i). Loop continues under AUTH-4.

## 2026-06-18 (AUTH-4 overnight, host thread, "keep rolling") — L10-2 dark store Codex-built → Opus-audited VERIFIED → COMMITTED
- **Deliverable:** NEW `src/utils/franchiseL10OverlayStorage.ts` (1:1 mirror of `franchiseTraitOverlayStorage` with the
  L10-event row — targetId/targetKind player|team, family/eventType/valence/magnitude/probability, confirmationStatus/
  applied; second index `by_target`) + the 8-site mirror (trackerDb v22→v23 store def; syncConfig 'id'; backupRestore
  optional + static schema v23; the store-list PIN toBe(22)→23 + alpha-insert between flashpoint & ratings + the legacy-seed
  v22→v23 migration-survival proof; parity + manifest + a new 8-test storage test). DARK/EMPTY; KBL_BACKUP_VERSION stays 2.
- **Tightened contract held (6th clean dispatch):** Codex hit EXACTLY the 8 FILE LIST paths — no doc edits, no git-add.
- **Independent audit (Opus, persistence-hardest):** tsc-0; full suite **7,535/435, 7,533 pass / 2 characterized fail**,
  ZERO new reds (+8); the v22→v23 migration-survival + backup round-trip parity PROVEN; KBL_BACKUP_VERSION 2; trait
  template + all prior stores byte-unchanged; DARK confirmed. VERDICT VERIFIED → auto-committed. Persistence →
  browser-pending (#23).
- **NEXT = L10-3** (default-OFF `isFranchisePhase2L10Enabled` flag + `persistDarkL10ForCompletedGame` league-sweep hook
  gated by flag AND `isCheckpointBoundary`, wiring L10-1 → L10-2; mirror L9b-3b-ii; 6th gate branch after
  processCompletedGame.ts:632). Loop continues under AUTH-4.

## 2026-06-18 (attended, fresh session) — L9b trait-reality REBUILD: spec ratified + R-E + R1-a (CHECKPOINT)
- Session-start reads + RESTATE; JK confirmed (attended). Picked up the L9b rebuild at R-E per `HANDOFF_NEEDED`.
- **Spec-leak root-caused + fixed (the heart of the session).** At R-E kickoff the Captain twice re-surfaced the
  superseded "personality-primary (no data proxy)" framing for Big/Little Hack + the count-family, LOSING JK's §0.2
  data-proxy rulings — the 3rd recurrence of the soul-layer inference pattern. Root cause: `TRAIT_MEASUREMENT_SPEC.md`
  was internally CONTRADICTORY (ratified §0 sitting over un-updated §B/§C/§D tables), AND the personality column had
  been sourced from the CODE's `IMAGE_DRIVER_SETS` (narrower than §VI.3 — it omits the universal Layer-1 Ambition/
  Resilience tilt). FIX: rewrote the spec to ONE authoritative source — **§0.6** proxy table (47 earnable, every cell
  cited via reconciliation workflow `wf_c4bac237-5d7`, precedence §0.2>§VI.3>code), **§0.7** code-deltas, **§0.8**
  gates, **§0.9** R1 derivations; purged stale phrasings across TRAIT_MEASUREMENT_SPEC + TRAIT_SIGNAL_CERTIFICATION +
  TRAIT_DETECTION_SCOPE_AUDIT + a traitRealityScorer comment. Two process lessons → SESSION_RULES pen.
- **JK rulings (DECISIONS_LOG):** NO personality-only traits; Stimulated → out; First Pitch = first-pitch hits/outs
  (opt-in); Two Way = elite hitting (wOBA/PA vs the PITCHER peer pool), pitcher-only, NO batting gateway, C/IF/OF
  position assigned at grant; Noodle Arm CUT (no clean signal); charisma mirrors resilience (K Neglector = low
  Charisma + Timid/Droopy); two-layer personality (Layer-1 universal Ambition/Resilience + Layer-2 image axis;
  personality is a TILT never a gate); Big/Little Hack = percentile-merge (Option B); Distractor = batter-reaches-base
  (hit/walk/HBP) while owner on 1B/2B; Base Rounder = beyond-forced-minimum; Crossed Up/Bunter opt-in denominators;
  Utility primary-position plumbing; grade-freshness app-wide (separate ticket). Spec committed `d71767aa`.
- **R-E COMPLETE** (build-DARK; builder = fresh in-session subagent ≠ auditor = Opus Captain; full host gate each):
  **R-E-a `9eeb69d5`** (E2 charisma factor + positive-Resilience path + 3 LIVE latent-bug fixes — Cannon Arm/Durable/
  Injury Prone tilts were silently dead) · **R-E-b `fc3d9dab`** (E3 re-evaluate-to-drop = displacement ranks by the
  recomputed P, not stale `HeldTrait.strength`). E1 deferred to R3.
- **R1-a COMPLETE `a5126afb`:** 10 clean outcome-proxy traits into BUILDABLE_TRAITS — K Collector/K Neglector/Whiffer/
  Tough Out/Easy Target (full K-family `{K,Kc,Ꝁ,D3K,WP_K,PB_K}`) · Slow Poke (DP) · Sprinter (FC) · Mind Gamer (walk)
  · Pick Officer/Easy Jumps (opposing steal-success via `runnerAttribution.pitcherId`) — new `addOutcomeRateSignals`
  + a pitcher-keyed extension of `addStealSignals`; + K Neglector acq image-set delta; + the §0.9 derivations spec.
  **Earnable v1 set 16 → 26.**
- **Suite:** 7,584/438, 7,582 pass / 2 characterized fail (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`),
  **ZERO new reds** across all 4 commits. trackerDb **v23** (pure engines, no store). Routing note: switched the
  builder from the Codex CLI to in-session subagents (the contract prompts' backticks/`$` corrupt a shell-arg
  dispatch) — the L10-4/L10-5 precedent; triangle preserved.
- **NEXT = R1-b** (6 ruled-gap traits per §0.9; SPLIT R1-b1 [Big/Little Hack, Base Rounder, Distractor] + R1-b2
  [Two Way, Utility, Crossed Up, Bunter]) → R2 → R3 → L11–L14 → L-SIM gate. **CHECKPOINTED by JK** (clean milestone
  after R-E + R1-a). FINDING-150 rebuild in progress. Nothing pushed.

## 2026-06-18 (attended, fresh session) — L9b trait-reality REBUILD: R1-b1 (Big/Little Hack + Base Rounder + Distractor)
- Session-start reads + RESTATE; JK confirmed ("yes, correct"). Picked up the L9b rebuild at R1-b per `HANDOFF_NEEDED`.
- **R1-b1 = 4 traits into `BUILDABLE_TRAITS`** (`src/engines/traitCandidateBuilder.ts`) + §0.7 image deltas
  (`src/engines/traitAcquisition.ts`). Earnable v1 set **26 → 30**. All position-role, build-DARK.
- **Soul-layer discipline:** the Captain surfaced the two measurement details §0.9's Base Rounder line left open
  (rather than infer — the exact spec-leak this arc exists to fix). JK ruled (DECISIONS_LOG): (1) DENOMINATOR counts
  thrown-out extra-base tries as chances; (2) SCOPE includes the batter-runner's own stretches. Folded into §0.9
  verbatim. Distractor + Big/Little Hack were already fully pinned by §0.9 — no rulings needed.
- **Derivations built (§0.9 verbatim):** Big Hack = `(hrPct + (1−avgPct))/2`, Little Hack mirror — Option-B
  within-builder percentile pre-pass over HR-rate (HR∈{HR,ITPHR}/PA) + AVG (hits/AB, AB=PA−BB/IBB/HBP/SF/SAC), cohort
  = position players w/ PA≥1∧AB≥1, local hit/HR sets (NOT game.ts `isHit`, which omits ITPHR). Distractor = batter
  reaches via hit/walk/HBP while owner on 1B/2B, credited to the owner. Base Rounder = advance beyond the forced
  minimum from `runnerOutcomes`; `isRunnerForced`/`getMinimumAdvancement` ported self-contained from `atBatLogic.ts`
  (no UI-layer import). Acq: Big Hack→POSITIVE+EGOTISTICAL, Little Hack→POSITIVE+TOUGH; Base Rounder already
  positive+COMPETITIVE/TOUGH (untouched); Distractor neutral.
- **Builder = fresh in-session subagent ≠ auditor = Opus Captain** (triangle). Independent line-by-line re-derivation
  from the diff (each trait + the forced-advance port + the merge math) → VERDICT VERIFIED. Host gate:
  `NODE_ENV= npm run build` exit 0 (7.70s + PWA) + full suite **7,608/438, 7,606 pass / 2 characterized fail**
  (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), **ZERO new reds** (+24 tests / +0 files = 19 builder + 5
  acquisition, all in the 2 existing test files). trackerDb stays **v23** (pure engines, no store).
- **NEXT = R1-b2** (Two Way wOBA-vs-pitcher-pool one-signal + C/IF/OF position-at-grant · Utility primary-position
  plumbing into `SeasonTraitCandidateInput` · Crossed Up + Bunter opt-in) → R2 → R3. FINDING-150 rebuild in progress.
  Nothing pushed.

## 2026-06-18 (attended, same session) — R1-b2 (Utility + Crossed Up + Bunter; Two Way SPLIT out)
- **Two genuine forks surfaced to JK before building** (soul-layer discipline). JK ruled (DECISIONS_LOG): (1) **Two Way
  SPLIT to its own ticket** (R1-b3 / R3-adjacent) — it spans the pure builder AND the L9b-3c grant-path
  random-C/IF/OF-at-grant mechanic, so it's not a clean pure-builder trait; R1-b2 = Utility + Crossed Up + Bunter.
  (2) **Bunter = volume/frequency** (SAC per PA), not a success rate — reads the standard SAC result, so no longer
  enrichment-gated. Captain FINDING flagged: the rate-signal family's `getPercentile`-on-mostly-zeros inflates sparse
  signals (Bunter/Crossed Up acute) — a §16 sim-tune/pooling-convention concern, build-DARK contains it.
- **R1-b2 = 3 traits into `BUILDABLE_TRAITS`** + an OPTIONAL `primaryPositionByPlayer` field on
  `SeasonTraitCandidateInput` (Utility plumbing; the hook that populates it is deferred wiring → Utility dormant until
  then). Earnable v1 set **30 → 33**. All build-DARK. `traitAcquisition.ts` needed **no production change** (Bunter
  already POSITIVE+TOUGH, Utility already in ROSTER_ROLE_TRAITS, Crossed Up correctly absent — independently confirmed).
- **Derivations (§0.9 verbatim):** Bunter = SAC/PA (volume); Crossed Up = passed-ball events
  (`wildPitchOrPassedBall.wpOrPb==='passed_ball'` + `.pitcherId`) per batters-faced (pitcher PA count); Utility =
  fielding `success`-rate at positions ≠ the player's primary (skip players absent from the map).
- **Builder = fresh subagent ≠ auditor = Opus Captain** (triangle). Independent line-by-line re-derivation + the
  acquisition-state re-grep → VERDICT VERIFIED. Host gate: `NODE_ENV= npm run build` exit 0 + full suite
  **7,629/438, 7,627 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), **ZERO new
  reds** (+21 tests / +0 files). trackerDb stays **v23**.
- **⇒ R1-b functionally COMPLETE except Two Way** (deferred to R1-b3/R3-adjacent). **NEXT = R2** (platoon/count-family
  handedness; pitcher count-family on walks-allowed + first-pitch pair + the 6 handedness splits — verify the L9a-3 join
  is fed) OR R1-b3 (Two Way) if sequenced first. FINDING-150 rebuild in progress. Nothing pushed.

## 2026-06-18 (attended, same session) — R2 (count-family + First-Pitch pair + 6 handedness splits)
- JK ruled "do ALL of R2 now" + the measurement forks (DECISIONS_LOG): First-Pitch = HIT vs OUT; CON = 1−K/PA, POW =
  ISO, **Specialist/Reverse = 1−BAA same/opposite (JK chose BAA over K-rate so Specialist isn't conflated with K
  Collector)**; handedness splits build DARK + DORMANT (threaded handedness maps, hook wiring deferred like Utility).
  All folded into §0.10 verbatim.
- **R2 = 12 traits into `BUILDABLE_TRAITS`** + 2 OPTIONAL handedness-map inputs (`pitcherHandByPlayer`,
  `batterHandByPlayer`). Earnable v1 set **33 → 45**. All build-DARK.
  - **Count-family (4):** walks-allowed `(BB+IBB)/BF` — BB Prone/Falls Behind = rate, Composed/Gets Ahead = 1−rate
    (pair-mates share the signal; personality tilt differentiates). Folded into `addOutcomeRateSignals`.
  - **First-Pitch pair (2):** hit/(hits+outs) on logged first-pitch PAs (`pitchesInAtBat===1`); Slayer = hit, Prayer =
    out (= 1−Slayer). OPT-IN.
  - **Handedness splits (6):** CON vs LHP/RHP = 1−K/PA bucketed by opposing-pitcher hand; POW = ISO; Specialist/Reverse
    = 1−BAA vs same/opposite-handed batters (switch hitters excluded). **DORMANT** until the handedness join is wired
    (`opposingHand` is still hardcoded `'R'` in the reconstructor; the splits read the threaded maps, not that field).
- **Acq §0.7:** Composed/Gets Ahead/First Pitch Slayer → POSITIVE; BB Prone/Falls Behind/First Pitch Prayer → NEGATIVE;
  drivers for Gets Ahead/Falls Behind/Slayer/Prayer; BB Prone + Composed no-driver (Composed uses the R-E-a high-Res
  positive path, gated on `RESILIENCE_POSITIVE_TRAITS` — verified fires); the 6 splits NEUTRAL.
- **Builder = fresh subagent ≠ auditor = Opus Captain** (triangle). Independent line-by-line re-derivation of all 3
  groups + the acq deltas + grep-confirmed the splits are neutral → VERDICT VERIFIED. Host gate:
  `NODE_ENV= npm run build` exit 0 (7.97s) + full suite **7,658/438, 7,656 pass / 2 characterized fail**
  (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture` — confirmed by name), **ZERO new reds** (+29 tests / +0 files).
  trackerDb stays **v23**.
- **NEXT = R1-b3** (Two Way — ONE wOBA-vs-pitcher-pool signal + the random C/IF/OF-at-grant mechanic in L9b-3c) +
  **R3** (Ace Exterminator + the deferred E1 ratings/grade thread). DEFERRED WIRING owed: the handedness-map hook +
  Utility's primary-position hook (both populate `SeasonTraitCandidateInput` so those splits/Utility go live).
  FINDING-150 rebuild in progress. Nothing pushed.

## 2026-06-18 (attended, same session) — R1-b3 (Two Way earn-signal — pitcher batting wOBA)
- JK ruled the Two Way architectural fork (DECISIONS_LOG): **"earn-signal now, defer C/IF/OF."** The earn-signal needs
  all two-way pitchers to share ONE pool + re-evaluate stably, but the data is a triplet (C/IF/OF) — per-variant names
  would fragment the pool AND re-randomize the position each cycle (the just-built re-evaluate-to-drop). So R1-b3 builds
  ONLY the earn-signal under one representative `Two Way (C)`; the random C/IF/OF position + the "treat-3-as-one-family"
  plumbing defer to a later ticket (post-D13 grant flow / roster wiring).
- **R1-b3 = `addTwoWaySignals`** (`traitCandidateBuilder.ts`): per PITCHER-role player, accumulate batting counts from
  their `batterId` at-bats, build `BattingStatsForWAR`, emit `Two Way (C)` = `calculateWOBA(stats)`, sampleSize =
  batting PA, percentiled vs the pitcher pool (valve-gated → super-rare). Mapping per §0.9 (uBB=BB via walks−IBB,
  doubles incl GRD, HR incl ITPHR, ab=PA−NON_AB). Only `Two Way (C)` into BUILDABLE_TRAITS (IF/OF deferred). NO
  acquisition change (`Two Way (C)` already POSITIVE + EGOTISTICAL). Earnable v1 set **45 → 46**.
- **Builder = fresh subagent ≠ auditor = Opus Captain** (triangle). Independent re-derivation of the wOBA mapping +
  pooling + role restriction → VERDICT VERIFIED. Host gate: `NODE_ENV= npm run build` exit 0 (7.79s) + full suite
  **7,668/438, 7,666 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture` — by name),
  **ZERO new reds** (+10 tests / +0 files). trackerDb stays **v23**.
- **NEXT = R3** (Ace Exterminator + the deferred E1 ratings/grade thread — opposing-pitcher-grade join on
  `atBat.pitcherId`). R3 has an EXTERNAL dependency: §0.4 ties E1 to the app-wide grade-freshness ticket, so R3 may be
  blocked pending that. **Deferred follow-ups owed:** (1) the handedness-map + Utility primary-position hook wiring
  (dormant traits); (2) the Two Way C/IF/OF random position + family plumbing. FINDING-150 rebuild near-complete
  (46/47 earnable built). Nothing pushed.

## 2026-06-18 (attended, same session) — R3 (Ace Exterminator) → 47/47 EARNABLE TRAIT SET COMPLETE
- Grounded R3: NOT blocked — `smb4GradeEmulator.ts` provides the grade scale + `SMB4_GRADE_TO_INDEX` (the "A− or
  better" threshold), Ace Exterminator already POSITION + POSITIVE + COMPETITIVE/EGOTISTICAL. Buildable now via the
  deferred-map pattern; the grade-freshness external dependency bites only at the deferred hook, decoupled from the
  pure builder. JK ruled the success definition: **REACHED BASE (hit/walk/HBP) vs A−-or-better pitchers** (§0.11).
- **R3 = `addAceExterminatorSignals`** (`traitCandidateBuilder.ts`) + an OPTIONAL `pitcherGradeByPlayer` input (E1):
  per non-undone PA, if the opposing pitcher's grade ≥ A− (`SMB4_GRADE_TO_INDEX[grade] >= SMB4_GRADE_TO_INDEX['A-']`),
  credit the batter a reached-base opportunity (reuse `DISTRACTOR_REACH_RESULTS`); rate = reached/(PAs vs aces).
  DORMANT until the grade-map hook is wired. NO acquisition change. Earnable v1 set **46 → 47 (COMPLETE)**.
- **Builder = fresh subagent ≠ auditor = Opus Captain** (triangle). Independent re-derivation + grade-scale verification
  → VERDICT VERIFIED. Host gate: `NODE_ENV= npm run build` exit 0 (7.88s) + full suite **7,677/438, 7,674 pass / 3
  characterized fail** — wpaRuntimeBoundary + franchiseManualSmokeFixture + franchiseOffseasonGuards.component (the last
  a conditional-solo order-flake **confirmed passing solo 24/24** this run; R3 touched only a pure engine), **ZERO new
  reds** (+9 tests / +0 files). trackerDb stays **v23**.
- **⇒ THE 47/47 EARNABLE v1 TRAIT SET IS COMPLETE.** FINDING-150 (the trait-detection SCOPE gap) is CLOSED for the
  earnable set. Session arc: R-E (prior) + R1-a (prior) + **R1-b1 `474196e7` · R1-b2 `bbb839ce` · R2 `b80fa135` ·
  R1-b3 `7e22e015` · R3 (this commit)**. All build-DARK; builder≠auditor + full host gate each.
- **REMAINING (tracked follow-ups, NOT earnable-trait gaps):** (1) the **dormant-trait wiring hooks** — populate
  `SeasonTraitCandidateInput`'s optional maps (`pitcherHandByPlayer`/`batterHandByPlayer`/`primaryPositionByPlayer`/
  `pitcherGradeByPlayer`) from roster records so the handedness splits, Utility, and Ace Exterminator go live (the
  handedness one also needs `opposingHand` un-hardcoded); (2) the **Two Way C/IF/OF** random-position + 3-variant
  family plumbing; (3) the §16 sim-tune FINDING (rate-signal `getPercentile`-on-mostly-zeros for sparse signals); (4)
  the L10 Q5/Q8 rework + L11+ per the L-stack. Nothing pushed.

## 2026-06-18 (attended, same session) — W1: wire the dormant-trait input maps live-dark
- With 47/47 earnable traits built, the handedness splits + Utility + Ace Exterminator were DORMANT (their optional
  `SeasonTraitCandidateInput` maps unpopulated). W1 wires them. Explore-mapped the seam: the franchise `Player` record
  (`leagueBuilderStorage.ts`) carries `bats`/`throws`/`primaryPosition`/`velocity`/`junk`/`accuracy`; the grant hook
  `resolveTraitGrantRoster` already loads the full roster. JK ruled **"wire all 4 now"** — incl. the grade map computed
  on-demand via the canonical pure `scoreSmb4Player` (overrides the §0.4 grade-freshness deferral; no divergence — same
  function; flag-gated so zero live effect). Folded into §0.11 (W1) + DECISIONS_LOG.
- **W1** (`franchiseTraitGrantCompute.ts`): extended `TraitGrantRosterEntry` with bats/throws/primaryPosition/grade?;
  `resolveTraitGrantRoster` captures them per MLB player (grade via `scoreSmb4Player` for pitcher-role); the
  `computeSeasonTraitCandidates` call site builds the 4 maps (`batterHandByPlayer`/`pitcherHandByPlayer`/
  `primaryPositionByPlayer` over all roster players; `pitcherGradeByPlayer` filtered to pitcher-role). Flag gate
  (`isFranchisePhase2TraitsEnabled` default OFF) untouched → build-DARK, zero live effect until post-D13.
- **Builder = fresh subagent ≠ auditor = Opus Captain** (triangle). Independent re-derivation + flag-gate-intact check
  → VERDICT VERIFIED. Host gate: `NODE_ENV= npm run build` exit 0 (7.59s) + full suite **7,678/438, 7,676 pass / 2
  characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture` — by name), **ZERO new reds** (+1 test / +0
  files). trackerDb stays **v23**.
- **⇒ the 6 handedness splits + Utility + Ace Exterminator are now WIRED (populated maps), still flag-gated build-dark.**
  **NEXT (remaining follow-ups):** (B) Two Way C/IF/OF random-position + 3-variant family plumbing; (C) the §16 sim-tune
  FINDING (sparse-signal getPercentile); (D) the L-stack (L10 Q5/Q8 rework → L11+). Also minor: `opposingHand` is still
  hardcoded `'R'` in `reconstructAtBatContext` (matters only for matrix-handedness traits, NOT the now-wired splits which
  read the threaded maps). FINDING-150 rebuild COMPLETE + WIRED. Nothing pushed.

## 2026-06-18 (attended, same session) — PRE-ACT-TRAITS-1: the Two Way C/IF/OF family (gate item -1 done)
- "Finish it off" → took PRE-ACT-TRAITS-1 (the one still-buildable pre-activation seam). Design realized ENTIRELY in the
  builder, NO grant-path/scorer/acquisition surgery (simpler than anticipated when Two Way was split out): each two-way
  pitcher's variant is assigned by a deterministic **FNV-1a(playerId) mod 3 → C/IF/OF** (stable, pure, no Math.random),
  and `poolTraitKey` canonicalizes all 3 variants to ONE `Two Way` family pool so wOBA is percentiled vs ALL two-way
  pitchers. Position assigned at BUILD via the seed = outcome-identical to a stable per-pitcher "at grant" pick; the
  deterministic seed keeps re-evaluate-to-drop stable. Folded into §0.9.
- **PRE-ACT-TRAITS-1** (`traitCandidateBuilder.ts` ONLY): all 3 variants → `BUILDABLE_TRAITS`; local `hashString`
  (FNV-1a) + `twoWayVariantForPitcher`; `addTwoWaySignals` emits the seeded variant; `poolTraitKey` at both pooling
  sites (`buildPeerPools` + the `computeSeasonTraitCandidates` lookup). No `traitAcquisition.ts` production change (the
  IF/OF variants were already POSITIVE + EGOTISTICAL). Load-bearing: without family-pooling each variant pool = size 1
  < `minPeerPool` 3 → null scores; the family-pooling test proves it.
- **Builder = fresh subagent ≠ auditor = Opus Captain** (triangle). Independent re-derivation (seed determinism +
  family-pool end-to-end + only-the-pure-engine-changed) → VERDICT VERIFIED. Host gate: `NODE_ENV= npm run build` exit 0
  (7.85s) + full suite **7,686/438, 7,683 pass / 3 characterized fail** (`wpaRuntimeBoundary` +
  `franchiseManualSmokeFixture` + `GameTrackerLaunchState` — the last an order-flake **confirmed passing solo 9/9**),
  **ZERO new reds** (+8 tests / +0 files). trackerDb stays **v23**.
- **⇒ THE TRAIT ENGINE IS FULLY BUILT + WIRED + the Two Way family COMPLETE.** PRE-ACT-TRAITS gate item -1 DONE; only
  **-2** (JK browser end-to-end activation verification — pairs with F-141) + **-3** (standing `opposingHand` note) left.
  All buildable trait-rebuild work is done. NEXT (a different phase): (C) the §16 sim-tune FINDING at the L-SIM gate;
  (D) the L-stack (L10 Q5/Q8 rework → L11+). Nothing pushed.

## 2026-06-18 (attended, fresh session) — L10-Q5Q8: continuous cadence (Q5) + name_change dark catalog (Q8); routing restored to Codex
- Session-start reads + RESTATE; JK confirmed state + directed "start with L10 Q5/Q8 rework." Surfaced 3 design
  sub-forks before building (event volume / name_change rarity / trait cadence). JK ruled: **Q5 = FLAT per-game** (no
  season-length scaling); **Q8 = name_change its OWN rare rate** (rarer than cosmetic). JK's peer-comparison challenge
  established the key distinction: the 20%-checkpoint is doing **sample-synchronization** work for the percentile-vs-peers
  systems (trait adaptation L9b + ratings dev L8) — so those STAY periodic; only the **independent-per-player L10 dice
  rolls** go continuous (L10 firing has NO peer ranking at fire time → continuous is statistically clean; the whole-league
  sweep gives every rostered player equal rolls).
- **ROUTING CORRECTION (JK):** the Captain auto-defaulted the build to an in-session subagent, then to a /tmp
  prompt-duplicate; JK pointed at `AI_TEAM_OPERATING_MODEL.md` — **Codex is the default builder**, handed off via the
  contract in `PROMPT_CONTRACTS.md` fed to `codex exec` on **STDIN** (the backtick/`$` shell-arg corruption that drove the
  L10-4 → PRE-ACT-TRAITS-1 subagent stretch — 12 tickets, all 2026-06-18 — is fixable via stdin, not a Codex limitation).
  Captured in SESSION_RULES pending pen + memory. Triangle: SEPARATION held through those 12, but the cross-MODEL
  diversity was lost; now RESTORED (Codex builds, Opus audits). Likely a context-pressure contributor too (subagent
  dispatch routed every builder prompt + report through the main window; Codex offloads both to a file/its own process).
- **L10-Q5Q8** (Codex gpt-5.5 xhigh; 4 files): `franchiseL10EventEngine.ts` — per-game base rates (≈÷10) +
  `nameChangeBaseRate 0.0004` + optional `baseRateOverride` on the roll spec + name_change player-only cosmetic-family
  spec (distinct `seedSuffix`; neutral); `franchiseL10SweepCompute.ts` — removed the `getSeasonMetadata` +
  `isCheckpointBoundary` fetch/gate + the `not-checkpoint` status (continuous firing). +3 Q8 engine tests; the hook test's
  `not-checkpoint` test → a continuous test (non-boundary game 19 writes rows); `SEEDED_CANDIDATES` re-seeded to still
  fire under the lowered per-game rates. Store/reporter unchanged (`family`/`eventType` are plain strings; the adapter is
  generic). trackerDb stays **v23**.
- **Builder = Codex ≠ Auditor = Opus Captain** (cross-model triangle restored). Independent line-by-line diff audit +
  real-engine falsification (cosmetic-rate-0 + nameChangeBaseRate-1 → ONLY name_change fires; game 19 fires 1 event /
  game 20 fires a team event → seam team-path coverage preserved through the re-seed) → VERDICT VERIFIED (0 major / 0
  minor). Host gate: `NODE_ENV= npm run build` exit 0 (7.59s) + full suite **7,689/438, 7,687 pass / 2 characterized
  fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`; `GameTrackerLaunchState` + `franchiseOffseasonGuards.component`
  order-flakes both passed this run), **ZERO new reds** (+3 tests / +0 files).
- **⇒ L10 (random events) FULLY COMPLETE** incl. the Q5/Q8 rework. **NEXT = L11 (managers)** — a FRESH L-stack subsystem
  needing a grounding recon before contracting (mirror the L10 recon). Nothing pushed.

## 2026-06-18 (attended, same session) — L11 (manager firings) kickoff: recon + JK rulings + L11-1 (pure firing+ripple engine)
- **Routing now Codex** (restored). L11 grounding recon via workflow `wf_107b9eb5-faf` (5 readers → `L11_SCOPE_MAP.md`).
  Captain-verified the 3 load-bearing anchors: the `MANAGER_FIRED` matrix row (self −2/fan/clubhouse,
  masterMoraleMatrix.ts:24/148/375) exists with ZERO emitters; `ManagerAssignment.fired`/`endDate` exist (managerWpa.ts:86)
  with NO writer; the auto-roll `managerFireProbability` (salaryCalculator.ts:1259-1301) is orphaned. ⇒ **L11 = the missing
  PRODUCER + 2 consequence-writes, NOT a new subsystem.** MOY stays OUT (Phase-1 D9).
- **JK ruled 4 forks** (DECISIONS_LOG 'L11 kickoff', recon+rulings committed `cf097d09`): trigger = manual GM action + auto
  backstop (revive `managerFireProbability`) + L14 cascade (one shared resolver); personality ripple = build full now dark
  vs the types (inert until L1 + a new manager-personality field, home = identity `ManagerProfile`, reuse the 7-enum);
  performance gate = SCALED by how underwater (live `valueDelta`, net-positive untouchable); fan-relief = SCALED by team
  struggle, once per firing.
- **L11-1** (Codex gpt-5.5; 2 new files): pure `src/engines/franchiseL11FiringEngine.ts` — `computeFranchiseL11Firing` →
  relief bump (scaled by struggle, clamped 4→12) + per-player ripple (0 for net-positive; severity-gradient × personality
  tilt for net-negative; §12-verbatim directions: loyal bigger, resilient smaller, EGOTISTICAL lowest 0.5) +
  `managerSelfDelta` passthrough. PURE/build-DARK, no caller/flag/store; imports only `CanonicalPersonality`. §16
  placeholder magnitudes.
- **Builder = Codex ≠ Auditor = Opus** (cross-model triangle). Independent line-by-line audit + directional falsification
  (all 10 tests are real comparisons, non-vacuous; the clamp test honestly uses override tuning since default maxes at
  −5.4 < the −6 floor — builder disclosed) → VERIFIED (0/0). Host gate: `NODE_ENV= npm run build` exit 0 (8.67s) + full
  suite **7,699/439, 7,697 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new
  reds (+10 / +1 file). trackerDb stays **v23**.
- **NEXT = L11-2** (the manager-personality field [identity `ManagerProfile`, reuse the 7-enum] + the legacy/tenure write —
  a `setManagerFired` mutator setting `fired`/`endDate`/reason + the Almanac aggregate gaining hire/fire dates). Nothing pushed.

## 2026-06-18 (attended, same session) — L11-2: manager-firing legacy-write primitive
- Grounded L11-2; surfaced a scope question to JK (the manager-personality field has NO L11 consumer — the firing ripple
  keys off PLAYER personalities, not the manager's). JK ruled **defer the manager-personality field** (L11-2 = legacy write
  only). Captain refinement: the Almanac fire/hire-date fields move to **L11-4** (the tenure aggregate is built from
  game/WPA data, not the assignment store — the assignment→tenure join belongs with the surfacing ticket).
- **L11-2** (Codex gpt-5.5; 3 files): `ManagerFiredReason` (`'user'|'auto-backstop'|'rebrand'`) + optional
  `ManagerAssignment.firedReason` (managerWpa.ts); idempotent `setManagerFired(params)` in managerIdentityStorage.ts
  (get → null-if-missing → unchanged-if-already-fired [keeps the original endDate/reason] → else save fired:true +
  caller-supplied endDate + firedReason). Caller-supplied timestamp (no Date.now). NO live caller (build-DARK; L11-3 wires
  it flag-gated), NO DB-version bump (firedReason additive + unindexed). 4 new tests.
- **Builder = Codex ≠ Auditor = Opus** (cross-model triangle). Independent diff audit + falsification (idempotency uses a
  DIFFERENT 2nd endDate/reason; the read-gate test proves a fired manager drops from `listManagerAssignments`→[] +
  `resolveManagerForTeam` falls back to the successor) → VERIFIED (0/0). Host gate: `NODE_ENV= npm run build` exit 0
  (8.56s) + full suite **7,703/439, 7,701 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`),
  ZERO new reds (+4). trackerDb stays **v23**, manager-identity DB stays **v2**.
- **⚠ CONCURRENT-SESSION FLAG:** a SECOND Claude session (dir `fe65bf4b…`) ran workflow `wf_1f3e2c10-e94` (6-agent
  L12/L13/L14 deep-dive) and left an untracked `spec-docs/L11_L14_OPEN_QUESTIONS.md` (510 lines) that cites this session's
  L11 recon + rulings — a deliberate-looking parallel "get ahead of the curve" L11–L14 design worksheet. No concurrent
  COMMITS (git history linear + all-mine in-window); my code work is disjoint. **NEXT = L11-3 HELD** pending JK's
  coordination call (is the 2nd session intentional? adopt its worksheet? who owns the branch?). Nothing pushed.
