# CURRENT_STATE.md — LIVE HEADER

**Last Updated:** 2026-06-18 (**✅ L9b COMPLETE — the trait-from-reality engine, the "game-changer feature." NOW L10**
(random events). L9b-3c committed → L9b-3 COMPLETE → **L9b COMPLETE.** Full L9b chain: L9b-1 scorer `398533d1` ·
L9b-2 acquisition `f616373a` · L9b-3a candidate-builder `54fae510`+`4e3ad01d` · L9b-3b-i dark store `0cd75d9a` ·
L9b-3b-ii dark grant-hook `e08be415` · L9b-3c confirm/write. **L9b-3c** = the §11 trait-confirm transform + ATOMIC
trait1/trait2 displacement: PURE engine `src/engines/traitOverlayConfirmation.ts` (`applyTraitDisplacement` 6-case
gain/lose/displace math + canonical guard + `confirmTraitOverlay` + `buildTraitConfirmationRequest` +
`summarizeTraitOverlayChangeLog`) + impure applier `src/utils/franchiseTraitConfirmApply.ts` (`applyConfirmedTraitOverlay`:
load player → displace → `saveFranchisePlayer` FLAT trait1/trait2 → mark overlay confirmed+applied; idempotent doubly).
NO live caller (confirm UI = deferred post-D13 D-ticket). Codex-built → Opus-audited VERIFIED (tsc-0 / full suite
**7,514/433, 7,512 pass / 2 characterized fail**, ZERO new reds). trackerDb **v22**. **Whole L9b is build-DARK** —
activate post-D13 (the L9b-3b-ii hook flag default-OFF; L9b-3c orphaned-pending its confirm UI). **➡ NEXT = L10**
(random events) per the L-stack: L10 → L11 managers → L12 races/All-Star/awards-fame → L13 relationships → L14 rebrand →
the L-SIM gate. **L10 RECON DONE** (workflow `wf_b3129cd8-9e3`) → full scope/split/forks/seams/open-questions in
`spec-docs/L10_SCOPE_MAP.md`. SPLIT: **L10-1** pure event-selection engine (✅ DONE) · **L10-2** dark
`franchiseL10Overlays` store (✅ DONE, trackerDb v23) · **L10-3** flag + dark league-sweep hook (✅ DONE) · **L10-4**
stadium-change resolver (✅ DONE) · **L10-5** reporter tap (✅ DONE) → **L10 COMPLETE (1-5), all build-DARK.** ➡ NEXT = **L11** (managers). **L10-1 DONE** = `src/engines/franchiseL10EventEngine.ts` (`computeFranchiseL10Events`: pure deterministic
league-sweep roll — `P = baseRate[family] × intensity dial × morale × personality`, FNV-1a-seeded fire, 8 families with
personality-shift excluded, fan-morale-suppressed team/stadium; mirrors `tradeRequestGeneration`; build-DARK).
Codex-built → Opus-audited VERIFIED (tsc-0 / suite **7,527/434, 7,525 pass / 2 characterized fail**, ZERO new reds).
Build-DARK; do NOT extend `franchiseRandomEventGenerator.ts` (boundary). 6 non-blocking open questions for
JK in the scope map §7 (AUTH-4 defaults taken meanwhile).
*(Prior L9b-3b detail below.)* **L9b-3b DONE:** b-i = the dark
`franchiseTraitOverlays` store (trackerDb v22) · b-ii = the default-OFF `isFranchisePhase2TraitsEnabled` flag +
`persistDarkTraitGrantForCompletedGame` hook (flag-gate-first → 20%-checkpoint cadence → loads season events → enumerates
MLB roster → L9b-3a `computeSeasonTraitCandidates` → L9b-2 `computeTraitAcquisition` per player → writes PENDING trait
rows; wired after the checkpoint gate at processCompletedGame.ts:632; mirrors L8b `franchiseCheckpointSweepCompute`;
doubly-dark = flag OFF + pending/`applied:false` rows that DON'T mutate player records until L9b-3c; Codex-built →
Opus-audited VERIFIED, tsc-0 / full suite **7,499/431, 7,497 pass / 2 characterized fail**, ZERO new reds; live game
path → browser-pending #22). **L9b-3c (NEXT)** = the §11 confirm + ATOMIC trait1/trait2 displacement via
`saveFranchisePlayer` (do NOT route trait rows through `ratingsOverlayMerge` — rating-key-only, silently drops them). **STORE FORK RESOLVED (AUTH-4 default):** NEW `franchiseTraitOverlays`
store (reuse carried a silent-trait-drop landmine via `ratingsOverlayMerge`). **L9b-3b-i** = the dark store mirroring
`franchiseRatingsOverlays` at every site (storage module + trackerDb v22 + syncConfig + backupRestore + the store-list
PIN + parity/manifest tests + a new storage test); DARK/EMPTY, KBL_BACKUP_VERSION stays 2; Codex-built →
Opus-independently-audited VERIFIED (tsc-0 / vite build OK / full suite **7,495/430, 7,493 pass / 2 characterized fail**,
ZERO new reds; v21→v22 migration-survival + backup parity PROVEN; ratings template byte-unchanged). Persistence →
browser-pending (#21).
[AUTH-4 overnight; a fresh session does the session-start reads, RESTATEs, and PROCEEDs at **L9b-3b-ii** under AUTH-4 WITHOUT
waiting for JK — AUTH-4 is the standing go]. **L9b-3a DONE** = the PURE context-reconstructor + candidate-builder
`src/engines/traitCandidateBuilder.ts`: replays a season's already-loaded AtBat/Fielding/BetweenPlay events →
reconstructs per-AtBat `GameContext` → probes the FROZEN `activeTraitNames` for trait opportunities → outcome-weighted
RATE signal per the 16 v1-buildable traits → role-bucketed peer pools → feeds L9b-1 `computeTraitRealityScore` →
`TraitCandidate[]` per player; PURE (no IndexedDB/store/flag/Date/random/async), build-DARK; Codex-built →
Opus-independently-audited VERIFIED (21 tests; tsc-0 / full suite **7,486/429, 7,484 pass / 2 characterized fail**, ZERO
new reds; frozen matrix/scorer byte-unchanged). **AUDIT DEVIATIONS HANDLED:** Codex left an abandoned earlier-attempt pair
`traitContextReconstructor.*` (a broken EXPOSURE-COUNT model — opposing pairs Clutch/Choker, RBI Hero/Zero, Stealer/Bad
Jumps, etc. came out indistinguishable) → DELETED by the auditor; Codex also edited 5 Captain-owned spec-docs → REVERTED +
re-authored. **L9b-3** (grant/write-back — the FIRST real trait writer, PERSISTENCE class,
audit HARDEST) is RECONNED (`wf_4275ff58-dc1`) + SPLIT into **L9b-3a** (PURE context-reconstructor + candidate-builder —
DONE) · **L9b-3b** (dark hook + PENDING write, mirror L8b; the STORE FORK lands here — NEXT)
· **L9b-3c** (§11 trait-confirm + ATOMIC trait1/trait2 displacement). Full scope/split/forks/gotchas in
`AUTONOMOUS_RUN_LOG.md` (the 2026-06-18 "L9b-3 RECON DONE" entry). **JK FORKS (non-blocking for L9b-3a):** the write
store (reuse `franchiseRatingsOverlays` v21 = AUTH-4 default / vs a NEW `franchiseTraitOverlays` v21→v22 = recon's
write-path reader's recommendation — `WAITING_ON_JK`), the cadence trigger, and the Two-Way role-promotion. **A fresh
thread: contract + build L9b-3a first; build-DARK, activate post-D13.** **L9b-2** = the PURE acquisition engine `src/engines/traitAcquisition.ts` (the VI.0
MULTIPLICATIVE combiner `P = realityPercentile × ambition/resilience/image/morale/roster factors` + gain-high/lose-low
hysteresis dead-band + no-offsetting-pair + 2-trait-cap strength-ranked displacement; PROPOSALS only, build-dark; Codex
5.5-built → Opus-4.8-independently-audited **VERIFIED**; 24 tests; tsc-0 / build-0 / full suite **7,465/428, 7,463 pass /
2 characterized fail**, ZERO new reds; trackerDb stays **v21**, no store). **DEFAULTS-TAKEN flagged for JK:**
`TRAIT_OPPOSITES` (14 pairs) authored as new trait-asset data + the VI.3:122 personality-primary thin-signal exception
DEFERRED (valve dominates v1). *(L9b-1 detail preserved below.)* L9b-1 = the PURE trait-from-reality SCORER (TS-2): NEW `src/engines/percentile.ts`
(getPercentile/getValueAtPercentile lifted verbatim out of salaryCalculator, math-identical) + salaryCalculator
re-imports them + NEW `src/engines/traitRealityScorer.ts` (role-eligibility VI.2 + min-sample valve VI.1 +
scaledThreshold scaling + percentile strength score; PURE, no IndexedDB/mutation) + 19-test file. **HOST GATE PASSED**
(host session, real node v20): tsc-0 / build-0 / full suite **7,441 tests, 7,437 pass / 4 fail** = 2 characterized
(`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`) + 2 solo-passing order-flakes (`GameTrackerLaunchState` +
newly-surfaced `EliminationTeamHub`), **ZERO new reds**; 19/19 new + 121/121 salaryCalculator-family green (lift
behavior-neutral). **Builder=Opus → INDEPENDENTLY audited by Codex 5.5: VERDICT VERIFIED** (decorrelated AST check
confirmed 28/39/7/1=75, no dupes/missing/extra; no real defect; only non-blocking test-coverage nits). DEFAULT-TAKEN
flagged for JK: `Workhorse` (unlisted in VI.2) classified PITCHER. trackerDb stays **v21** (pure engine, no store).
NEXT=L9b-2. *(Prior status preserved below.)* **L8 COMPLETE (L8a `cfdd7752` + L8b `cd9e4589`)** [AUTH-4 overnight
run; a fresh session does the session-start reads, RESTATEs, and PROCEEDs at L9a under AUTH-4 WITHOUT waiting for JK —
AUTH-4 is the standing go]. This run built→audited→committed, each Codex 5.5-built → Opus 4.8-independently-audited:
**L8 COMPLETE** (L8a pure dev-math engine `cfdd7752` + L8b dark checkpoint-sweep compute/overlay-writer `cd9e4589`) on
top of the prior clean boundary **L7 COMPLETE** (L7c `886d1dce` · L7d-1 `f61dcae0` · L7d-2 `aec5db99` · L7d-3 doc) +
**L2 COMPLETE** (L2a store `6fdeba11` · L2b merge `e8ec0908` · L2c confirm `a77e0ed5`). trackerDb host-state **v21** (L8
added NO store); KBL_BACKUP_VERSION stays **2**. ⚠ NEWLY-OBSERVED order-flake
`AwardsWatchlist.test.tsx` (passes solo; non-deterministic — appeared in 1 of 6 full-suite runs across L7d/L2a; NOT a
regression) — flagged for JK, see SUITE BASELINE + OPEN PENDING-JK. AUTH-4 host resume; the L5b handoff is CLEARED.
**L5b COMMITTED `5ebb148`** —
the flashpoint-decay accumulator was host-verified (`NODE_ENV= npm run build` exit 0 + full suite **7,298 pass / 2
characterized fail** [`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`], ZERO new reds; the +18 tests / +3 files over
the post-L5a 7,280/410 baseline are exactly L5b's 3 new test files) and committed (14 code/test files; sandbox junk
cleaned + gitignored). The prior AUTH-4 sandbox build + decorrelated independent audit (≠ builder, VERDICT VERIFIED,
10/10, faithful L6b mirror) stands. **L6 (Fame) COMPLETE** — `7359cbf` L6a + `3b36d35` L6b-1 + `5a7685a` L6b-2. **L5a
`428f7cb`** (pure §8 fan-morale DAMPENER). **L5b** = a NEW dark `franchiseFlashpointDecay` store (trackerDb **v19→v20**)
+ a default-OFF `isFranchisePhase2FlashpointEnabled()` flag + a pure compounding-but-clamped per-game fan-morale TAX
engine (`flashpointDecay.ts`, magnitudes in `FLASHPOINT_DECAY_TUNING`) + a dark gated per-game compute in
processCompletedGame (after the fame compute). **SEAM-NEUTRAL** — `resolveTurnedOnPlayers` returns [] until L7 Albatross
+ L10/L13 trade-demander land, so even flag-ON writes nothing today. KBL_BACKUP_VERSION stays **2**; backup-parity +
syncConfig lockstep; version-pin trap `franchiseSeasonLedgerStorage.test.ts` at `toBe(20)`. **L5c `8cd2cc1`** (pure §13 trade-request gen) +
**L5d `e061e51`** (pure §13 reporter-intensity tooth, live reporter byte-unchanged) → **L5 COMPLETE** (a–d: dampener /
flashpoint-decay / trade-requests / reporter-heat; all Codex-built → Opus-audited VERIFIED). **L7 SPLIT L7a–d;
L7a COMMITTED `0a59a24`** (filled L5b's `resolveTurnedOnPlayers` seam — the per-game flashpoint-decay now taxes a team's
active|locked Albatross; doubly-dark, no store/version touch). **L7b COMMITTED `77feeda3`** (pure §20.4 Channel-C
designation→fame nudge ENGINE — FF +2 / Albatross −1 / MVP·Ace sim; fame-store WIRING deferred). **L7c COMMITTED
`886d1dce`** (pure §20.6 Channel B FF-warmth +0.5 + Channel A asymmetric swing-tilt ENGINE; DOUBLE-COUNT GUARD
ALBATROSS=0 — §13 flashpoint already owns it; morale-store + per-play wiring deferred post-D13). **L7d SPLIT L7d-1..3;
L7d-1 `f61dcae0`** (Captain morale-router) **+ L7d-2 `aec5db99`** (Fan Hopeful cushion) **+ L7d-3 doc-only** (FF
double-dependency reconciliation — value-half DR-1 + morale-half L7b/L7c already exist) → **L7 (designation Phase-2
completion) COMPLETE.** **L8 depends on L2** (the mutable ratings-overlay layer) → L2 lands first, SPLIT L2a..c;
**L2a COMMITTED `6fdeba11`** (dark `franchiseRatingsOverlays` store, trackerDb v20→v21, backup parity, migration-survival
proven; oracle locked) **+ L2b COMMITTED `e8ec0908`** (pure overlay merge math: base + confirmed active deltas; temporary
absolute-expiry; base never mutated) **+ L2c COMMITTED `a77e0ed5`** (§11 two-tier confirmation infra — console
instruction + idempotent confirm transform + revert reminder + change log; pure/dark) → **L2 COMPLETE.** **NOW: L8**
(ratings development — the first real writer through L2) under AUTH-4. trackerDb host-state **v21** / KBL_BACKUP_VERSION
**2**. Branch codex/franchise-v1-next; nothing pushed.)
**Branch:** codex/franchise-v1-next

> This file is the LIVE status header — the thing every session-start reads.
> Rewrite it in place each session (do not append). Full arc-by-arc history
> lives in `CURRENT_STATE_HISTORY.md`. Roles/routing/loops live in
> `AI_TEAM_OPERATING_MODEL.md`. Non-negotiable rules live in `SESSION_RULES.md`.

---

## RIGHT NOW

- **✅ L10-5 VERIFIED + COMMITTED (2026-06-18, fresh attended session, AUTH-4 keep-rolling) → L10 COMPLETE (1-5) — the
  PURE reporter tap / news adapter (the final L10 piece).** NEW pure module
  `src/src_figma/app/engines/reporter/franchiseL10NewsAdapter.ts` (lives WITH the reporter — core `src/engines` must not
  depend on the UI-layer `SeasonNewsEvent` type): `buildFranchiseL10SeasonNewsEvent({event, franchiseId, seasonId,
  seasonNumber})` maps a fired `FranchiseL10EventCandidate` → a `SeasonNewsEvent` with `eventType:'RANDOM_EVENT'`,
  `subjectIds:[targetId]`, `facts` = the deterministic ground-truth event fields (never fabricated), and a conservative
  bounded `dramaticWeight = clamp(L10_NEWS_DRAMATIC_WEIGHT.base[valence] + magnitudeScale×magnitude, 0, 1)`. **PURE** (no
  LLM/network/IndexedDB/Date/Math.random/async) / **build-DARK** — NO production caller, does NOT call the live reporter
  `generateSeasonNewsTake` (byte-unchanged) and does NOT wire any emission path (the live emission is the deferred post-D13
  seam, mirroring L5d + L10-4); reporter heat stays hardcoded `'medium'`; trackerDb stays **v23**. **DESIGN CALL (AUTH-4
  default, FLAGGED for JK — same shape as L10-4):** pure adapter only, no live emission now. **Subagent-BUILT →
  Opus-Captain-INDEPENDENTLY-audited VERIFIED** (read line-by-line; builder ≠ auditor; 0 major / 0 minor): host build exit 0
  + full suite **7,559/438, 7,557 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO
  new reds (+9 / +1 file = `franchiseL10NewsAdapter.test.ts`; an exact-key-set assertion locks the `SeasonNewsEvent` shape).
  Committed on codex/franchise-v1-next (2 code files + doc updates; not pushed). **⇒ L10 (random events) COMPLETE: L10-1
  engine `607fa015` · L10-2 store `a830a61f` · L10-3 hook `8a33d9d3` · L10-4 resolver `057340ed` · L10-5 adapter — all
  build-DARK, activate post-D13.** **➡ NEXT = L11 (managers)** per the L-stack (L11 → L12 races/All-Star/awards-fame → L13
  relationships → L14 rebrand → the L-SIM gate); L11 is a FRESH subsystem needing a grounding recon before contracting.
  *(Prior L10-4 entry below.)*
- **✅ L10-4 VERIFIED + COMMITTED (2026-06-18, fresh attended session, AUTH-4 keep-rolling) — the PURE stadium-change
  resolver (the concrete-resolution step for a fired `stadium_change` team event).** NEW pure engine
  `src/engines/franchiseStadiumChangeResolver.ts`: (1) `pickStadiumFromPool(currentStadiumName, seed)` — the SHARED
  deterministic pool-pick helper (reused by L14 rebrand; do NOT fork): pool = `getAllParks()` (23 SMB parks), excludes the
  current park by normalized `getStableParkId`, falls back to the full pool if exclusion empties the set, throws only on an
  empty pool, index = `clamp(floor(franchiseL10DeterministicRoll(seed) × len))`. (2) `resolveFranchiseStadiumChange({event,
  teamName, currentStadiumName?, seedBase?})` — guards `targetKind==='team' && eventType==='stadium_change'` (throws
  otherwise), derives `pickSeed = ${seedBase}:${event.targetId}:stadium_change:${event.seed}`, returns `{newStadium,
  snapshot}` where snapshot = `FranchiseTeamStadiumSnapshot {teamId: event.targetId, teamName, stadium, stadiumId, hasSeedParkFactors}`
  (hasSeedParkFactors from `getDerivedParkFactorsIfAvailable`). **PURE** (no IndexedDB/Date/Math.random/async) / **build-DARK**
  — NO production caller (orphaned-pending the post-D13 apply step that will write the snapshot + recompute analytics), NO
  store / NO wiring / trackerDb stays **v23**. Fan-morale suppression is UPSTREAM (L10-1's `teamSuppressed`), so the resolver
  takes no morale. **DESIGN CALL (AUTH-4 default, FLAGGED for JK):** L10-4 is the pure concrete-resolution step, NOT a live
  persistence/analytics mutation — the snapshot WRITE + recompute defer to the post-D13 apply ticket (mirrors L9b-3c's
  orphaned-pending applier). Open-question #4 (stadium change on the USER's team vs AI-only) only bites at that future apply
  step → default `allowed/suppressed` taken upstream; not decided here. **Subagent-BUILT → Opus-Captain-INDEPENDENTLY-audited
  VERIFIED** (read line-by-line; builder ≠ auditor): host build exit 0 + full suite **7,550/437, 7,548 pass / 2 characterized
  fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds (+10 / +1 file =
  `franchiseStadiumChangeResolver.test.ts`). 2 trivial non-blocking minors (single-park-pool fallback untested w/o mocking
  the real pool; per-team divergence not explicitly asserted). Committed on codex/franchise-v1-next (2 code files + the doc
  updates; not pushed). **➡ NEXT = L10-5** (reporter tap: applied L10 event → `SeasonNewsEvent` `RANDOM_EVENT` via
  `seasonNewsGenerator.ts` → `seasonNewsItems`; risk low-med) per `L10_SCOPE_MAP.md` §3. *(Prior L10-3 entry below.)*
- **✅ L10-3 VERIFIED + COMMITTED (2026-06-18, AUTH-4 overnight; host-gate passed in a fresh attended session) — the flag +
  dark league-sweep hook that wires the L10-1 engine → the L10-2 store (the wiring half of L10).** (1) 6th default-OFF
  Phase-2 flag `isFranchisePhase2L10Enabled` (cloned the TRAITS block in `franchisePhase2Flags.ts`). (2) NEW
  `src/utils/franchiseL10SweepCompute.ts` `persistDarkL10ForCompletedGame(gameState, scope, archiveOptions)`: flag-gate
  FIRST (normal play = zero-cost no-op, no loads) → resolve league `gameNumber` → `getSeasonMetadata().totalGames` →
  `isCheckpointBoundary` (20%-of-season cadence, reused) → `resolveL10Candidates` (mirrors `resolveCheckpointRoster`:
  MLB-only roster, per-team fan morale memoized via `getFranchiseMoraleSnapshot(scope,'team-fan',teamId)?.currentValue ??
  50`, player morale, `normalizePersonality`, `performanceSignal` via `normalizePerformanceSignal(valueDelta)`; builds
  BOTH player AND distinct-team candidates) → `computeFranchiseL10Events({candidates, intensity:'standard',
  seedBase})` (L10-1; seedBase = `${franchiseId}:${seasonId}:${gameNumber}`) → writes each emitted event as a PENDING
  `franchiseL10Overlays` row via `putFranchiseL10Overlay` (L10-2) — deterministic idempotent id
  `${franchiseId}:${seasonId}:${statsScopeId}:${targetId}:${family}:${eventType}:l10-${gameNumber}`, `applied:false`,
  `source:'l10-random-event'`, `createdAt` from the MAX persisted at-bat timestamp (NO Date.now). `l10SweepSeam` exposes
  roster/compute for stubbing. (3) 6th gate branch `if (isFranchisePhase2L10Enabled()) { try { await
  persistDarkL10ForCompletedGame(...) } catch (e) { console.warn('[L10] …') } }` inside `if (trueValueScope)` after the
  Traits gate (processCompletedGame.ts:639). (4) NEW `franchiseL10SweepCompute.test.ts` (5 tests: flag-off dark-noop
  loads-nothing · non-boundary not-checkpoint · boundary writes pending rows + idempotent replay · a REAL
  producer→consumer SEAM test feeding live `computeFranchiseL10Events` · two-runs-identical determinism). **Doubly-dark**
  (flag OFF + every row pending+applied:false). NO new store / trackerDb stays **v23** / KBL_BACKUP_VERSION stays **2**.
  **Captain(Opus)-BUILT (no Codex CLI in sandbox) → INDEPENDENTLY decorrelated-reader-AUDITED VERIFIED** (0 major / 3
  minor; M1 seam-team-path CLOSED in-session by seeding `team-dd` so a `targetKind:'team'` row is live-tested; M2
  cosmetic; M3 = sandbox probe artifacts to delete host-side): tsc --noEmit exit 0 (full project) + 5/5 targeted green
  (engine fires 3 events for the seed → non-vacuous); flag default OFF + flag-gate FIRST; gate branch try/catch never
  rethrows; deterministic (no Date.now/random); MLB-roster + per-team morale faithful; NO store/DB/backup/PIN drift; no
  `franchiseRandomEventGenerator` boundary violation; diff EXACTLY the 5 FILE LIST paths. **HOST GATE PASSED (2026-06-18,
  fresh attended session, real node v20):** `NODE_ENV= npm run build` exit 0 (`✓ built in 7.74s` + PWA) + full suite
  **7,540/436, 7,538 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds
  (+5 / +1 file = `franchiseL10SweepCompute.test.ts`). Probe artifacts deleted; the diff was independently re-verified
  against the contract (flag-gate-first, try/catch gate branch, no Date.now/random, no store/DB/PIN touch) before commit.
  Committed on codex/franchise-v1-next (5 contracted files + the 3 session docs folded in per JK; never pushed). Live
  path → browser-pending (#24). **➡ NEXT = L10-4** (stadium-
  change event: low base rate suppressed by high fan morale, pool-pick from `parkLookup.ts`, writes
  `FranchiseTeamStadiumSnapshot` so analytics recompute) then **L10-5** (reporter tap) per `L10_SCOPE_MAP.md` §3.
  *(Prior L10-2 entry below.)*
- **✅ L10-2 VERIFIED + COMMITTED (2026-06-18, AUTH-4 overnight) — the dark `franchiseL10Overlays` store (trackerDb
  v22→v23; the persistence half of L10).** NEW `src/utils/franchiseL10OverlayStorage.ts` (1:1 mirror of
  `franchiseTraitOverlayStorage` with the L10-event row: `targetId`/`targetKind` player|team + family/eventType/valence/
  magnitude/probability + confirmationStatus/applied lifecycle; second index `by_target` not `by_player`) + the store
  mirrored at all 8 sites (trackerDb v23 store def; syncConfig 'id'; backupRestore `optional:true` + static schema v23;
  the `franchiseSeasonLedgerStorage` store-list PIN toBe(22)→23 + alpha-insert + the legacy-seed v22→v23 migration-survival
  proof; parity + manifest + a new 8-test storage test). DARK/EMPTY (no production consumer; L10-3 writes it);
  KBL_BACKUP_VERSION stays 2. **Codex-built → Opus-INDEPENDENTLY-audited VERIFIED:** tsc-0 / full suite **7,535/435, 7,533
  pass / 2 characterized fail**, ZERO new reds (+8); v22→v23 migration-survival + backup parity PROVEN; trait template +
  all prior stores byte-unchanged; Codex hit EXACTLY the 8 FILE LIST paths. Persistence → browser-pending (#23). **➡ NEXT
  = L10-3** (default-OFF `isFranchisePhase2L10Enabled` flag + `persistDarkL10ForCompletedGame` league-sweep hook gated by
  flag AND `isCheckpointBoundary`, wiring L10-1 → L10-2; mirror L9b-3b-ii; 6th gate branch after processCompletedGame.ts:632).
  *(Prior L10-1 entry below.)*
- **✅ L10-1 VERIFIED + COMMITTED (2026-06-18, AUTH-4 overnight) — the pure random-event SELECTION engine (first L10
  piece).** NEW `src/engines/franchiseL10EventEngine.ts` (`computeFranchiseL10Events`): a PURE, deterministic, build-DARK
  league-sweep roll. Per candidate × eligible family → `P = clamp01(baseRate[family] × intensityMultiplier[Juiced/Standard/
  Nerfed] × moraleFactor × personalitySensitivity × perfSignal)`; fires iff `franchiseL10DeterministicRoll(seed) < P`
  (FNV-1a, local re-impl — boundary respected). 8 families (`performance/pitching/trait/role/cosmetic/team/roster/wildcard`)
  — **personality-shift EXCLUDED (arc-earned)**; eligibility (team→team specs incl. `stadium_change`, `pitching`→pitcher-
  only, wildcard→players); HIGH fan morale SUPPRESSES team/stadium; morale-tilted valence sub-roll; trade_demand
  proposed-only; name-change excluded. Mirrors `tradeRequestGeneration` (Tuning + §16 const + components + deterministic
  sort). **Codex-built → Opus-INDEPENDENTLY-audited VERIFIED** (read line-by-line): tsc-0 / full suite **7,527/434, 7,525
  pass / 2 characterized fail**, ZERO new reds (+13); pure (no IndexedDB/Date/random/async); build-dark (no production
  importer; L10-3 wires it); Codex hit EXACTLY the 2 FILE LIST files. **➡ NEXT = L10-2** (dark `franchiseL10Overlays`
  store, trackerDb v22→v23 — the 8-site mirror incl. the `franchiseSeasonLedgerStorage` store-list PIN; mirror
  `franchiseTraitOverlays`/L9b-3b-i). *(Prior L9b-3c entry below.)*
- **✅ L9b-3c VERIFIED + COMMITTED (2026-06-18, AUTH-4 overnight) → L9b-3 + L9b COMPLETE — the §11 trait-confirm transform
  + the ATOMIC trait1/trait2 displacement write (the LAST L9b piece; the first code that mutates a player's traits).**
  NEW PURE `src/engines/traitOverlayConfirmation.ts` (`applyTraitDisplacement` — the 2-slot categorical math: gain →
  already-held no-op / displaces-named replaces that slot / free slot fills / cap+no-displaces → applied:false; lose →
  remove held / not-held no-op; canonical-name guard on traitName + displacesTraitName) + `confirmTraitOverlay`
  (pending→confirmed + applied) + `buildTraitConfirmationRequest` (SMB4-console instruction + resulting slots) +
  `summarizeTraitOverlayChangeLog`. NEW impure `src/utils/franchiseTraitConfirmApply.ts` (`applyConfirmedTraitOverlay`:
  idempotent guard → load player → displace → `saveFranchisePlayer` FLAT trait1/trait2 → mark overlay confirmed+applied;
  player-write-first; cross-DB note). Mirrors `ratingsOverlayConfirmation` [L2c] but CATEGORICAL — traits have NO
  read-merge (do NOT route through `ratingsOverlayMerge`), so the WRITE is the mechanism. **NO live caller** (the confirm UI
  is a deferred post-D13 D-ticket — orphaned-pending-its-UI by design). **Codex 5.5-built → Opus-4.8-INDEPENDENTLY-audited
  VERIFIED** (read line-by-line — all 6 displacement cases + double idempotency + flat-write re-derived): tsc-0 / full suite
  **7,514/433, 7,512 pass / 2 characterized fail**, ZERO new reds (+15 = the 2 new test files); engine pure (no
  IndexedDB/Date/random/async); Codex hit EXACTLY the 4 FILE LIST files (no doc edits, no abandoned files). **⇒ L9b
  (trait-from-reality engine) COMPLETE** (1 scorer · 2 acquisition · 3a candidate-builder · 3b store+hook · 3c
  confirm/write) — all build-DARK, activate post-D13. **➡ NEXT = L10 (random events)** — a FRESH L-stack subsystem; needs
  a grounding recon before contracting. *(Prior L9b-3b-ii entry below.)*
- **✅ L9b-3b-ii VERIFIED + COMMITTED (2026-06-18, AUTH-4 overnight) → L9b-3b COMPLETE — the flag + dark trait-grant hook
  (the first live-path trait WRITER, doubly-dark).** NEW `src/utils/franchiseTraitGrantCompute.ts` +
  `isFranchisePhase2TraitsEnabled` (default-OFF, 5th block in `franchisePhase2Flags.ts`) +
  `persistDarkTraitGrantForCompletedGame(gameState, scope, archiveOptions)` wired after the checkpoint gate at
  `processCompletedGame.ts:632` (inside `if (trueValueScope)`, matching the `[Checkpoint]` try/catch — never blocks game
  completion). Mirrors L8b EXACTLY: **flag-gate FIRST** (normal play = zero-cost no-op, no load) → resolve league
  gameNumber → `getSeasonMetadata().totalGames` → `isCheckpointBoundary` (20%-of-season; the min-sample valve keeps early
  checkpoints dormant so trait changes emerge late-season with a populated pool — DEFAULT-TAKEN vs a season-end trigger) →
  load season events (`getSeasonGames`→per-game `getGameEvents`/`getBetweenPlayEvents`/`getGameFieldingEvents`) + injury
  counts + season fielding + games-per-player → enumerate MLB roster (league-wide) → `computeSeasonTraitCandidates`
  (L9b-3a, config `deriveAdaptiveStandardsConfig({gamesPerSeason: totalGames})`) → per player
  `computeTraitAcquisition` (L9b-2; heldTrait `strength` = that trait's current candidate realityPercentile ?? 0.5;
  `rosterRole:'unknown'` v1) → writes PENDING `franchiseTraitOverlays` rows (`putFranchiseTraitOverlay`) with deterministic
  idempotent id `…:${traitName}:trait-grant-${gameNumber}`, `applied:false`, `createdAt` from the max persisted at-bat
  timestamp (NO Date.now). `traitGrantSeam` exposes the roster/candidate/acquisition for stubbing.
  **Codex 5.5-built → Opus-4.8-INDEPENDENTLY-audited VERIFIED** (read line-by-line — the test stubs the seam): tsc-0 / full
  suite **7,499/431, 7,497 pass / 2 characterized fail**, ZERO new reds (+4 = the hook test); DARK (only
  `processCompletedGame` consumes it, flag-gated); no Date.now/random; Codex hit EXACTLY the FILE LIST (no doc edits, no
  abandoned files). **LIMITATION:** the hook test stubs the L9b-3a→L9b-2 seam (gate/cadence/persistence/idempotency/
  determinism covered; the engines have their own suites + the seam test) → the real end-to-end through the hook is
  browser-pending (#22). **➡ NEXT = L9b-3c** (the LAST L9b piece: the §11 trait-confirm transform + ATOMIC trait1/trait2
  displacement write via `saveFranchisePlayer` — mirror `ratingsOverlayConfirmation` [L2c] but CATEGORICAL; on confirm
  apply the gain[/displace weakest]/lose to the flat franchise `trait1`/`trait2`; do NOT route trait rows through
  `ratingsOverlayMerge`; the live confirm UI is a deferred post-D13 D-ticket). *(Prior L9b-3b-i entry below.)*
- **✅ L9b-3b-i VERIFIED + COMMITTED (2026-06-18, AUTH-4 overnight) — the dark `franchiseTraitOverlays` store
  (persistence half of the first trait writer; trackerDb v21→v22).** NEW `src/utils/franchiseTraitOverlayStorage.ts`
  (a 1:1 mirror of `franchiseRatingsOverlayStorage` with a CATEGORICAL trait-change row: `valence` gain/lose · `traitName`
  · `displacesTraitName` · `realityPercentile`/`probability` audit snapshots · `confirmationStatus` pending/confirmed ·
  `applied` lifecycle flag · caller-supplied `createdAt`) + the store mirrored at every site (trackerDb v22 createObjectStore
  with `by_scope`/`by_player`; syncConfig `'id'`; backupRestore `optional:true` + STATIC schema v22; the
  `franchiseSeasonLedgerStorage` store-list PIN `toBe(21)`→22 + alphabetical insert; parity + manifest + a new storage
  test). **STORE FORK RESOLVED (AUTH-4 default):** the NEW store, NOT reuse — `ratingsOverlayMerge` is rating-key-only and
  silently drops trait rows, so reuse carried an orphaned-write-back landmine. DARK/EMPTY (no production consumer; L9b-3b-ii
  writes it); KBL_BACKUP_VERSION stays 2. **Codex 5.5-built → Opus-4.8-INDEPENDENTLY-audited VERIFIED:** tsc-0 / `vite build`
  OK / full suite **7,495/430, 7,493 pass / 2 characterized fail**, ZERO new reds; the **v21→v22 migration-survival**
  (the pin test seeds a v21 DB incl. a ratings-overlay row → proves both it AND the new trait store survive at v22 with
  correct keyPath+indexes) + **backup round-trip parity** PROVEN; `franchiseRatingsOverlays` template + all prior stores
  byte-unchanged; Codex hit EXACTLY the FILE LIST (no abandoned files, no doc edits — the tightened contract held).
  Persistence → browser-pending (#21). **➡ NEXT = L9b-3b-ii** (the default-OFF `isFranchisePhase2TraitsEnabled` flag +
  `persistDarkTraitGrantForCompletedGame` hook, mirroring the L8b `franchiseCheckpointSweepCompute` pattern: flag gate →
  20%-checkpoint cadence → load season events → enumerate MLB roster → `computeSeasonTraitCandidates` [L9b-3a] →
  `computeTraitAcquisition` [L9b-2] per player → write PENDING `franchiseTraitOverlays` rows; wired after the checkpoint
  gate at `processCompletedGame.ts:623`). *(Prior L9b-3a entry below.)*
- **✅ L9b-3a VERIFIED + COMMITTED (2026-06-18, AUTH-4 overnight) — the PURE context-reconstructor + candidate-builder
  (the read-half of the first trait writer).** NEW `src/engines/traitCandidateBuilder.ts` (+ 21-test file):
  `computeSeasonTraitCandidates(input, config?)` takes a season's ALREADY-LOADED events + rosters + L9a-4 aggregates
  (no IndexedDB I/O — the DB reads are L9b-3b) → for each AtBat reconstructs the matrix `GameContext`
  (`reconstructAtBatContext`: pressure from `isClutch`, risp/runnersOn/basesEmpty from `RunnerState`, teamLosing by
  half-inning, isSubstitutionAB from `enteredAs`, a per-(game,pitcher,inning,half) `consecutiveBaserunnersAllowed` tally
  for Meltdown) → runs ONE synthetic all-traits probe through the FROZEN `activeTraitNames` to detect trait OPPORTUNITIES
  → aggregates an outcome-weighted RATE `signalValue` per the 16 v1-buildable traits (Clutch/Choker WPA-favorable by role;
  RBI Hero/Zero `rbiCount`; Rally Stopper/Surrounded pitcher-favorable/unfavorable; Rally Starter reach-rate; Meltdown
  freq/units; Stealer/Bad Jumps SB success/`1-rate`; Pinch Perfect; Butter Fingers error-rate; Cannon/Noodle ±OF-arm-rate;
  Durable/Injury-Prone ∓injury-rate) → role-bucketed peer pools → feeds L9b-1 `computeTraitRealityScore` (basis `'none'`)
  → `TraitCandidate[]` per player. The 33 Bucket-C traits stay DORMANT (never in BUILDABLE_TRAITS; no proxy fabricated).
  PURE / build-DARK (no production importer; L9b-3b wires it). **Codex 5.5-built → Opus-4.8-INDEPENDENTLY-audited
  VERIFIED:** tsc-0 / focused 22/22 / full suite **7,487 tests / 429 files, 7,485 pass / 2 characterized fail**, ZERO new
  reds (+22 tests / +1 file = exactly this engine's test, incl. a seam test); purity + build-dark greps clean; frozen
  matrix/scorer/`traitAcquisition`/`percentile`/`traitPricing`/`rosterEngineConstants` BYTE-UNCHANGED; every per-trait
  outcome direction re-derived by the auditor. **SEAM FIX (FINDING-149):** the decorrelated builder self-audit caught — and
  the Captain verified from source — that L9b-3a's output was a FLAT `TraitCandidate` incompatible with L9b-2's
  `computeTraitAcquisition` (which reads `candidate.score.*`). The first commit `54fae510` shipped the flat shape; a
  follow-up commit FIXED it: output is now `SeasonTraitCandidate extends TraitCandidate` (L9b-2's nested `{traitName,
  score}`) + a seam integration test that feeds L9b-3a output straight into `computeTraitAcquisition`. (Codex's self-audit
  recommended reverting to the count model — REJECTED: the count model is the fatally-broken one; the fix keeps the RATE
  model AND fixes the seam.) **AUDIT DEVIATIONS HANDLED (the builder over-produced):** (1) Codex left an
  ABANDONED earlier-attempt pair `traitContextReconstructor.*` implementing a broken EXPOSURE-COUNT model (bare fire-count
  made opposing pairs indistinguishable — Clutch≡Choker, RBI Hero≡Zero, Stealer≡Bad Jumps, Butter≡Cannon≡Noodle) → the
  auditor DELETED it (nothing imported it; the contracted `traitCandidateBuilder.ts` is the correct rate-model file); (2)
  Codex edited 7 Captain-owned spec-docs (incl. AUDIT_LOG + FINDINGS) → REVERTED to HEAD + re-authored here. trackerDb stays **v21** (pure, no store).
  **DEFAULTS-TAKEN (AUTH-4, flagged for JK — see OPEN PENDING-JK):** outcome-weighted RATE model (not bare fire-count);
  `pressure='high'` from the populated `isClutch` flag (finer extreme banding deferred); Cannon/Noodle share one
  OF-arm-per-GAME signal (no per-OF-chance denominator exists in v1); Durable/Injury-Prone = injuries/games; all signals
  `basis:'none'`; Clutch/Choker role-determined (position→batting WPA, pitcher→fielding-team WPA). **➡ NEXT = L9b-3b**
  (the dark hook + PENDING write — clone the L8b `franchiseCheckpointSweepCompute` pattern: a default-OFF
  `isFranchisePhase2TraitsEnabled` flag + a gated `persistDarkTraitGrantForCompletedGame` in `processCompletedGame.ts`
  that LOADS the season events, calls `computeSeasonTraitCandidates` → `computeTraitAcquisition` (L9b-2) → writes PENDING
  trait-change rows; PERSISTENCE class → audit HARDEST). **BLOCKS on the JK STORE FORK** (reuse `franchiseRatingsOverlays`
  v21 = AUTH-4 default / new `franchiseTraitOverlays` v21→v22 = Captain's lean; `WAITING_ON_JK`). *(Prior L9b-2 entry
  below.)*
- **✅ L9b-2 VERIFIED + COMMITTED `f616373a` (2026-06-18, AUTH-4 overnight) — the PURE trait-ACQUISITION engine.** L9b
  SPLIT: L9b-1 scorer (DONE `398533d1`) · **L9b-2** acquisition (DONE, this entry) · **L9b-3** grant/write-back (NEXT —
  persistence, audit hardest). NEW `src/engines/traitAcquisition.ts` (+ 24-test file): `computeTraitAcquisition` consumes
  L9b-1 reality scores → trait-change PROPOSALS via the SPEC-FIXED MULTIPLICATIVE combiner `P = realityPercentile ×
  ambitionTilt × resilienceTilt × imageAxisTilt × moraleFactor × rosterRoleFactor` (all factors neutral-at-1.0; §16
  sim-tuned magnitudes in `TRAIT_ACQUISITION_TUNING`). Gates: min-sample valve (VI.1 — thin/null score → no proposal),
  role-eligibility (VI.2, reuses L9b-1 `isTraitEligibleForRole`/`traitRole`), gain-high(≥0.75)/lose-low(≤0.35) hysteresis
  dead-band; reconciliation = no-offsetting-pair (held opposite blocks gain / both-gain keeps higher-P) + 2-trait-cap
  strength-ranked weakest displacement (strict-exceed; a LOSE frees a slot). VI.3 image-valence + driver sets + the new
  `TRAIT_OPPOSITES` (14 pairs) use CANONICAL `TRAIT_PRICING` names (Two Way triplet, K Neglector); a module-load guard
  asserts every opposite is canonical. PURE — no IndexedDB/mutation/Date.now/Math.random; no production caller (L9b-3
  wires it). **Codex 5.5-built → Opus-4.8-independently-audited VERIFIED** (tsc-0 / build-0 / focused 24/24 / full suite
  7,465/428 7,463 pass / 2 characterized fail, ZERO new reds; combiner directions + hysteresis + reconciliation
  hand-verified vs tests; one dead import removed by the auditor + re-verified). trackerDb stays **v21** (pure, no store).
  **DEFAULTS-TAKEN (AUTH-4, flagged for JK):** (1) `TRAIT_OPPOSITES` 14-pair list authored here = NEW trait-asset data;
  (2) the VI.3:122 "personality-PRIMARY where signal thin" exception (Stimulated / Gets Ahead / Falls Behind / Big Hack /
  Little Hack) NOT implemented v1 — the min-sample valve's thin→dormant default dominates (conservative; never wrong-fires);
  (3) factor curves centered at neutral-50→1.0; (4) displacement = weakest-held strict-exceed; (5) absent
  morale/modifiers/role → neutral. **➡ NEXT = L9b-3** (grant/write-back — the FIRST real trait writer: L8b-pattern dark
  flag-gated hook + GameContext reconstructor + PENDING trait rows + §11 trait-confirm transform writing `trait1`/`trait2`
  via `saveFranchisePlayer`; PERSISTENCE class → audit HARDEST; JK store fork in WAITING_ON_JK [default=reuse
  `franchiseRatingsOverlays`]). *(Prior L9b-1 entry below.)*
- **✅ L9b-1 VERIFIED + COMMITTED `398533d1` (2026-06-18, AUTH-4 overnight, host session) — the PURE trait-from-reality
  SCORER (TS-2).** L9b SPLIT (per the recon): **L9b-1** scorer (DONE, committed) · **L9b-2** acquisition (NEXT) · **L9b-3**
  grant/write-back (persistence, audit hardest). Committed 4 files (`398533d1`, branch codex/franchise-v1-next):
  NEW `src/engines/percentile.ts` (lifted getPercentile + getValueAtPercentile VERBATIM out of salaryCalculator —
  byte-identical, exported; one truth, not re-implemented) + MODIFIED `salaryCalculator.ts` (deletes the inlined helpers,
  re-imports them — behavior-neutral, the 121 salaryCalculator-family tests prove it) + NEW
  `src/engines/traitRealityScorer.ts` (`computeTraitRealityScore` → realityPercentile 0..1, gated in order by
  unknown-trait → role-ineligible VI.2 → thin sample VI.1 valve [season-scaled via `scaledThreshold`] → thin peer pool →
  percentile over sorted peers; PURE, no IndexedDB/mutation; does NOT compute P [L9b-2] or write back [L9b-3]) + a
  19-test file with a 75-name completeness/role-count guard. **PATH CORRECTION:** `franchiseAdaptiveStandards.ts` +
  `franchiseAwardTrust.ts` are in `src/utils/` (the recon said engines/); `getPercentile` IS in
  `src/engines/salaryCalculator.ts`. **NAME-DRIFT reconciled to canonical TRAIT_PRICING data** (a misspell silently never
  fires): `K Neglector` (not the spec's "Neglecter"), `Two Way (C)/(IF)/(OF)` (not "Two Way"). **DEFAULT-TAKEN (AUTH-4,
  spec silent → FLAGGED for JK):** `Workhorse` (75th canonical trait, a staminaModifier pitcher trait, unlisted in any
  VI.2 role list) classified PITCHER → canonical pitcher count 28. **HOST GATE PASSED (host session):** tsc-0 / build-0 /
  full suite 7,441 tests, 7,437 pass / 4 fail (2 characterized + 2 solo-passing order-flakes [`GameTrackerLaunchState` +
  newly-surfaced `EliminationTeamHub`], ZERO new reds); traitRealityScorer 19/19; salaryCalculator + .matrix + salarySeam.t5
  121/121. **Builder=Opus → INDEPENDENTLY audited by Codex 5.5 (decorrelated): VERDICT VERIFIED** — own AST check confirmed
  28/39/7/1=75 with no dupes/missing/extra, no real defect (non-blocking nits: "byte-identical" overstated → math-identical;
  optional combined-basis / non-mutation / dup-array tests). Auto-committed `398533d1`. trackerDb stays **v21** (pure engine,
  no store). WAITING_ON_JK `[ticket:L9b-1]` host-gate line RESOLVED.
  **➡ NEXT = L9b-2** (pure acquisition: `P(gain/lose) = realityPercentile × personalityTilt(§6/VI.3) × morale(L3)`,
  multiplicative spec-fixed shape + gain-high/lose-low hysteresis + no-offsetting-pair + 2-trait-cap displacement;
  PROPOSALS only). The matrix `traitInteractionMatrix.ts` stays FROZEN SMB4-asset data — consume, never regenerate.
- **✅ L5b COMMITTED `5ebb148` (2026-06-17, AUTH-4 host resume) — handoff CLEARED.** The flashpoint-decay accumulator
  (§13 tooth #2 / LS-19) was host-verified (`NODE_ENV= npm run build` exit 0 + full suite **7,298 pass / 2 characterized
  fail**, ZERO new reds — the +18 tests / +3 files = L5b's new test files) and committed (14 code/test files). The prior
  AUTH-4 sandbox build + decorrelated independent audit (VERDICT VERIFIED, 10/10, faithful L6b mirror) stands; the host
  run closed the 2 previously-unobserved gates (full build + full suite). Sandbox junk cleaned + gitignored (Temp/,
  sentinels, probe). L5c followed (committed `8cd2cc1`, below).
- **✅ L5c COMMITTED `8cd2cc1` (2026-06-17, AUTH-4 host resume) — in-season trade-request generation.** Pure §13
  "trade inversions" (LS-19 / LSD-2) engine `tradeRequestGeneration.ts`: scores each player's trade-request propensity
  from team fan morale + loyalty + player-morale + personality + a Juiced/Standard/Nerfed intensity dial. The signature
  mechanic = the §13 235-vs-236 inversion as a SIGNED loyalty term gated on fan sentiment (angry fans → loyal players
  bolt MORE / content fans → loyalty protective; whole thing gated on fan anger, so happy fans → 0 requests). Mirrors
  L5a (pure primitive, no store/flag/wiring) — consumed by L10 event-tap + L13 flashpoint later (those fill L5b's
  `resolveTurnedOnPlayers` seam). **Codex 5.5 built → Opus 4.8 independently audited VERIFIED** (tsc 0 / build 0 / full
  suite **7,307 pass / 2 characterized fail**, ZERO new reds [+9 tests / +1 file]; inversion sign hand-verified both
  directions; pure type-only imports; frozen engines byte-unchanged). Auto-committed (pure engine, no user surface).
  L5d followed (committed `e061e51`, below).
- **✅ L5d COMMITTED `e061e51` (2026-06-17, AUTH-4 host resume) — reporter-intensity tooth → L5 COMPLETE (a–d).** Pure
  §13 line-230 engine `reporterIntensity.ts`: maps team fan morale → a press-heat `NarrativeIntensity` signal (low morale
  = the press turns up the heat). Build-DARK — the live LLM/Supabase reporter (`generateSeasonNewsTake`) is BYTE-UNCHANGED;
  the seam (replacing the hardcoded `intensity:"medium"` at `seasonNewsGenerator.ts:165`) is a deferred post-D13
  activation step. Mirrors L5a/L5c (pure primitive). **Codex 5.5 built → Opus 4.8 independently audited VERIFIED** (tsc 0
  / build 0 / full suite **7,314 pass / 2 characterized fail**, ZERO new reds [+7 tests / +1 file]; live reporter + frozen
  engines byte-unchanged; pure single type-only import; math hand-verified — monotonic + band crossings + clamp).
  Auto-committed. **L5 (fan-morale teeth) COMPLETE: a dampener `428f7cb` · b flashpoint-decay `5ebb148` · c trade-requests
  `8cd2cc1` · d reporter-heat `e061e51`.** L7 (designation effects) followed — SPLIT L7a–d; L7a committed (below).
- **✅ L7a COMMITTED `0a59a24` (2026-06-17, AUTH-4 host resume) — Albatross → L5b flashpoint seam.** L7 ("designations
  Phase-2 completion") is a sub-stack → SPLIT into **L7a** (Albatross→flashpoint seam, DONE) · **L7b** (designation→fame
  nudge, §20.4 Channel C — greenfield) · **L7c** (designation→fan-morale steady sentiment, Channel B/A) · **L7d** (Captain
  router effects + Fan Hopeful cushion + Fan Favorite double-dep). L7a made `resolveTurnedOnPlayers` async + resolves each
  completed game's home+away **active|locked ALBATROSS** holder (via the existing `getFranchiseDesignationRow`), so the
  already-built L5b per-game flashpoint-decay taxes a team's Albatross who stays. **Doubly-dark** — gated by
  `isFranchisePhase2FlashpointEnabled()` (OFF), and even ON it only ACCUMULATES a tax artifact (no live morale mutation).
  NO store/flag/version/backup touch. **Codex 5.5 built → Opus 4.8 independently audited VERIFIED** (tsc 0 / build 0 /
  full suite **7,317 pass / 2 characterized fail**, ZERO new reds [+3 tests, existing file]; flashpoint engine/store/flag +
  trackerDb/backup byte-unchanged; firewall source-scans green; real-designation-store tests; diff hand-verified).
  Auto-committed. L7b followed (committed `77feeda3`, below).
- **✅ L7b COMMITTED `77feeda3` (2026-06-17, AUTH-4 host resume) — designation→fame nudge (pure §20.4 Channel C).** NEW
  pure `src/engines/designationFameNudge.ts`: the one-time fame NAMING seed a player earns when named to a store-backed
  team designation — `computeDesignationFameNudge(type)` + `summarizeDesignationFameNudges(types)` +
  `DESIGNATION_FAME_NUDGE_TUNING` (FF **+2** / Albatross **−1** §20.4-canonical; TEAM_MVP/ACE **+1.5** §16 sim
  placeholders; Captain/Fan Hopeful EXCLUDED — separate entities → L7d). Mirrors L5a/L5d (pure primitive, type-only
  import, no store/flag/wiring). The fame-store WIRING (firing on naming, idempotent once-per-naming into the L6b fame
  records) is a DEFERRED seam — documented, NOT built (it mutates the fame asset + needs idempotency; build-dark).
  **Codex 5.5 built → Opus 4.8 independently audited VERIFIED** (tsc 0 / build 0 / full suite **7,325 pass / 2
  characterized fail**, ZERO new reds [+8 tests / +1 file]; fame + designation engines byte-unchanged; pure single
  type-only import). Auto-committed. L7c followed (committed `886d1dce`, below).
- **✅ L7c COMMITTED `886d1dce` (2026-06-17, AUTH-4 host resume) — designation→fan-morale steady sentiment (§20.6
  Channel B) + the fame-amplifier designation tilt (Channel A).** NEW pure `src/engines/designationFanMorale.ts`:
  `computeDesignationSteadyFanSentiment` (Channel B — Fan Favorite ongoing warmth **+0.5**) +
  `summarizeDesignationSteadyFanSentiment` + `computeDesignationSwingTilt`/`applyDesignationSwingTilt` (Channel A — FF
  ups ×1.25 / Albatross downs ×1.25, merit neutral, sign-preserving), magnitudes in `DESIGNATION_FAN_MORALE_TUNING`.
  **DOUBLE-COUNT GUARD (the headline):** Albatross steady sentiment = **0** (reason → flashpoint) because the §13
  flashpoint-decay (L5b/L7a) ALREADY taxes a held Albatross every game — re-adding it here would double-count; this
  engine's Channel-B contribution is the FF warmth (the positive counterpart the negative-only flashpoint tax doesn't
  cover). Channel A ships the pure tilt MULTIPLIER only (full `base × fame × tilt` needs live fame [dark] + a live
  per-play swing pipeline → post-D13 seam); the Channel-B per-game morale-store wiring is a documented deferred seam
  (mutates the SMB4 morale asset + needs per-game idempotency + HELD-designation enumeration; mirrors L7b deferring its
  fame-store wiring). Mirrors L5a/L7b (pure primitive, single type-only import, no store/flag/wiring). **Codex 5.5 built
  → Opus 4.8 independently audited VERIFIED** (tsc 0 / build 0 / full suite **7,335 pass / 2 characterized fail**, ZERO
  new reds [+10 tests / +1 file]; double-count guard + Channel-A asymmetry + sign-preserving apply verified; 6 frozen
  engines byte-unchanged; pure). Auto-committed. L7d followed — SPLIT L7d-1..3; L7d-1 committed (below).
- **✅ L7d-1 COMMITTED `f61dcae0` (2026-06-17, AUTH-4 host resume) — Team Captain morale-router (pure §4/LS-6).** L7d
  (the last L7 sub-stack) bundles three mechanics → SPLIT: **L7d-1** Captain router (DONE) · **L7d-2** Fan Hopeful
  call-up cushion (pure: window/lift/slump-cushion/expiry, §4:87/LS-7) · **L7d-3** Fan Favorite double-dependency
  reconciliation (FF = D6 value-half [DR-1, live] + L5/§20.6 morale-half [L7b fame nudge + L7c warmth/tilt] — both
  halves already exist; thin). NEW pure `src/engines/captainMoraleRouter.ts`: `computeCaptainCharismaRouting` /
  `applyCaptainCharismaRouting` (Charisma **×2** teammate-morale routing — the spec-CANONICAL "double") +
  `applyCaptainPerformanceSwingAmplification` (sign-preserving team-wide amp of swings tied to the Captain's OWN
  performance, ×1.5 sim placeholder), magnitudes in `CAPTAIN_MORALE_ROUTER_TUNING`. Pure (ZERO imports).
  **ANTI-DOUBLE-COUNT:** routes/amplifies the clubhouse MORALE channel ONLY — NOT the Captain's own ratings/development,
  and NOT the §24.9 leadership-effectiveness composite (→ L13). Matrix wiring deferred post-D13. **Codex 5.5 built →
  Opus 4.8 independently audited VERIFIED** (tsc 0 / build 0 / 9 focused tests green; canonical ×2 + sign-preserving
  swing amp + linear charisma routing hand-verified; 6 frozen engines byte-unchanged; pure). Auto-committed. L7d-2 + L7d-3
  followed (below).
- **✅ L7d-2 COMMITTED `aec5db99` + L7d-3 doc-only → L7 (designation Phase-2 completion) COMPLETE (2026-06-17, AUTH-4).**
  **L7d-2** = NEW pure `src/engines/fanHopefulCushion.ts` (§4/LS-7 Fan Hopeful timed cushion):
  `computeFanHopefulWindowState` (game-count window + measurable expiry) + `computeFanHopefulCallUpLift` (one-time hope
  lift) + `applyFanHopefulSlumpCushion` (reduces NEGATIVE fan-morale swings while active; positives/expired/inactive pass
  through; sign-preserving), magnitudes in `FAN_HOPEFUL_CUSHION_TUNING` (windowGames 10 / fanMoraleLift 3 /
  slumpCushionFactor 0.5 — §16 placeholders). Pure (ZERO imports). Call-up + matrix wiring deferred post-D13. **Codex 5.5
  built → Opus 4.8 independently audited VERIFIED** (tsc 0 / build 0 / 11 focused tests; full suite 7,355 pass / 2
  characterized fail, ZERO new reds; frozen engines byte-unchanged; pure). Auto-committed.
  **L7d-3** = DOC-ONLY reconciliation (AUTH-4 default; NO code): the Fan Favorite double-dependency is already structurally
  COMPLETE — value-half `classifyFanFavorite` (`franchiseDesignationEligibility.ts`, DR-1 `b48b450`) + morale-half
  `designationFameNudge` FF +2 (L7b) + `designationFanMorale` FF +0.5 warmth & up×1.25 tilt (L7c). No new engine (both
  halves exist; morale-half is dark with deferred wiring; a composer would repeat the orphan DR-1 just deleted).
  **⇒ L7 COMPLETE: L7a `0a59a24` · L7b `77feeda3` · L7c `886d1dce` · L7d-1 `f61dcae0` · L7d-2 `aec5db99` · L7d-3 doc.**
  **L8 (ratings dev) DEPENDS on L2** (the mutable ratings-overlay layer, greenfield) → L2 lands first (SPLIT L2a..c).
- **✅ L2a COMMITTED `6fdeba11` (2026-06-18, AUTH-4 overnight) — dark `franchiseRatingsOverlays` store (§11 / L2; the
  persistence half of the franchise-instance mutable layer).** L2 SPLIT: **L2a** dark store (DONE) · **L2b** read-path
  merge + temporary absolute-trigger auto-expiry (re-evaluated on load) · **L2c** two-tier confirmation infra (console+DB;
  ratings/trait changes confirm, morale stays silent). NEW `src/utils/franchiseRatingsOverlayStorage.ts` (mirrors L5b
  flashpoint storage): the store (keyPath `id`; `by_scope` + `by_player` indexes) holds per-entry overlays over the FROZEN
  base ratings — permanent + temporary (`expiresAtGameNumber`), with confirmationStatus/source/sourceEventId/caller-
  supplied createdAt. trackerDb **v20→v21**; 3-place backup parity (`optional:true` + syncConfig `'id'`),
  KBL_BACKUP_VERSION stays **2**. **DARK/EMPTY** — no production writer/reader (L2b/L2c/L8/L9b wire it); oracle stays
  locked. **Codex 5.5 built → Opus 4.8 independently audited VERIFIED (hardest — persistence class)** (tsc 0 / build 0 /
  full suite 7,363 pass / 2 characterized fail, ZERO new reds; **v20→v21 migration-survival + backup round-trip parity +
  DARK + byte-unchanged-oracle + KBL_BACKUP_VERSION-2 all PROVEN**). Auto-committed; persistence → browser-pending
  (migration + round-trip prioritized, scenario #16). L2b followed (below).
- **✅ L2b COMMITTED `e8ec0908` (2026-06-18, AUTH-4 overnight) — ratings-overlay MERGE engine (pure read-path math; §11/L2).**
  NEW pure `src/engines/ratingsOverlayMerge.ts`: `resolveActiveOverlayDeltas` (net delta/ratingKey from CONFIRMED + active
  overlays — pending excluded per §11 two-tier; temporary active iff `currentGameNumber < expiresAtGameNumber`) +
  `mergeRatingsOverlays` (effective = frozen base + deltas, only for keys in base via hasOwnProperty guard; base NEVER
  mutated — oracle locked; returns a copy) + `selectExpiredTemporaryOverlays` (expired-temporary ids for the deferred
  on-load cleanup). Single type-only import; live wiring into value/designation/morale read paths DEFERRED (pointless
  with the empty L2a store + touches live consumers). **Codex 5.5 built → Opus 4.8 independently audited VERIFIED**
  (tsc 0 / build 0 / full suite 7,374 pass / 2 characterized fail, ZERO new reds; filters/base-immutability/expiry-id
  hand-verified; pure; frozen engines byte-unchanged). Auto-committed. L2c followed (below).
- **✅ L2c COMMITTED `a77e0ed5` (2026-06-18, AUTH-4 overnight) — §11 two-tier confirmation infra → L2 COMPLETE.** NEW
  pure `src/engines/ratingsOverlayConfirmation.ts`: `buildOverlayConfirmationRequest` (SMB4-console edit instruction +
  resulting rating) + `confirmOverlay` (`pending`→`confirmed`, idempotent + non-mutating; store put deferred) +
  `buildExpiryRevertReminder` (temporary console-revert text) + `summarizeOverlayChangeLog` (deterministic per-team
  change log, DSTACK L8). Morale excluded (auto/logged §11:202); traits (L9b) reuse the pattern; live confirm UI/flow
  deferred post-D13. **Codex 5.5 built → Opus 4.8 independently audited VERIFIED** (tsc 0 / build 0 / full suite 7,384
  pass / 2 characterized fail, ZERO new reds; pure; frozen engines byte-unchanged). Auto-committed.
  **⇒ L2 (franchise-instance mutable ratings-overlay layer) COMPLETE: L2a `6fdeba11` · L2b `e8ec0908` · L2c `a77e0ed5`.**
- **✅ L8 COMPLETE (ratings development — the first real WRITER through L2): L8a `cfdd7752` + L8b `cd9e4589`.** L8a =
  pure `src/engines/ratingsDevelopment.ts` (rawDelta = on-field performance × player-morale alignment → the L5a §8
  `fanMoraleDampener` CONSUMED [personality + Ambition/Resilience + Loyalty all live inside it → no double-count] →
  0-99 integer clamp → deterministic earned-magnitude shift gate; all magnitudes in `RATINGS_DEVELOPMENT_TUNING`). L8b =
  default-OFF `isFranchisePhase2CheckpointEnabled` flag + `src/utils/franchiseCheckpointSweepCompute.ts` + a flag-gated
  dark hook in processCompletedGame (after the flashpoint gate): at each deterministic 20%-of-season boundary (fires 5×/
  season) sweeps the MLB roster (perf signal = `valueDelta` ÷ 200000; team fan morale `?? 50` dark-safe) and writes one
  `pending`+`permanent` ratings overlay per shifter through `putFranchiseRatingsOverlay` (deterministic idempotent id;
  checkpoints stack). **Doubly-dark** (flag OFF + `pending` overlays inert in the merge until a post-D13 confirm UI); NO
  new store / trackerDb stays **v21**. Both Codex-built → Opus-independently-audited VERIFIED (tsc/build 0; suite 7,401
  then 7,410 pass / 2 characterized fail, zero new reds; frozen engines/store byte-unchanged). L8b = live game path +
  overlay writes → **browser-pending** (scenario #17). **OPEN DECISION logged for JK** (`AUTONOMOUS_RUN_LOG.md`): the
  L5a dampener weights a cold-team counter-trend-UP gain by AMBITION as MORE-brake vs §6:111's "upside gas pedal" framing
  — L8 consumes L5a as-built (L5 owns the §8 primitive); flagged, not relitigated.
- **✅ L9a — net-new reality CAPTURE layer (§9 / OD-5 / TS-1..13) — effectively COMPLETE** (L9a-1 `e28706e9` pitch-location
  + L9a-3 `32244393` handedness join + L9a-4 `acce899c` OF-arm tally/injury derive-on-read; **L9a-2 SET ASIDE for JK** —
  the per-pitch count UX fork). All three built additive (no version bump), each verified-to-persist, Codex-built →
  Opus-independently-audited VERIFIED. **➡ NEXT (fresh session resumes here): L9b — the trait-from-reality ENGINE** (the
  "game-changer feature"; built on `traitInteractionMatrix.ts`; consumes ALL the L9a captures): log-reconstructed
  activation context + a peer-relative strength/percentile scorer (rides Adaptive Standards) + P(gain/lose) acquisition
  = reality-percentile × personality × morale + the grant/write-back (2-trait cap, hysteresis, no-offsetting-pair,
  role-eligibility VI.2, the min-sample valve). DSTACK L9b line 84; Cert VI.5; deps L9a ✓ / L2 ✓ / L3 ✓ / L1 ✓. **RECON DONE (wf_8a9e7769-576, 5 readers) — full
  scope + the split + key gotchas in `AUTONOMOUS_RUN_LOG.md` (the 2026-06-18 "L9b RECON DONE" entry).** SPLIT: **L9b-1**
  scorer (PURE — lift `getPercentile`→`src/engines/percentile.ts`, role peer-pools VI.2, scale via `scaledThreshold`;
  build FIRST, lowest risk — **✅ BUILT 2026-06-18, host-gate queued, see the RIGHT-NOW top entry**) → **L9b-2** acquisition (PURE — `P=percentile×personality×morale` + min-sample valve +
  hysteresis + no-offsetting-pair + role-eligibility) → **L9b-3** grant/write-back (PERSISTENCE — L8b-pattern dark hook +
  context reconstructor + PENDING trait rows + §11 trait-confirm → writes `trait1`/`trait2` 2-slot displacement via
  `saveFranchisePlayer`; **L9b is the FIRST trait writer**; audit HARDEST). The matrix is FROZEN SMB4-asset data
  (consume, never regenerate). **JK FORK (non-blocking, default=REUSE):** trait write-back store — reuse
  `franchiseRatingsOverlays` (no version bump) vs new `franchiseTraitOverlays` (v21→v22 + pin) — in `WAITING_ON_JK.md`.
  **➡ FRESH THREAD: contract + build L9b-1 first.** Build-DARK, activate post-D13.
  *(Historical L9a detail below for the arc trail.)* Per the JK ruling
  (OD-5, DECISIONS_LOG 2026-06-17): **manual/opt-in, never forced, used when data present** → **REQUIRES optional
  GameTracker zone inputs for pitch/hit location** + a **cumulative season injury tally**. Net-new captures per
  `TRAIT_SIGNAL_CERTIFICATION.md` (TS-1..13): pitch-ZONE, OF-extra-base-credit (arm), the injury accumulator; everything
  else reuses existing fields. This is the capture substrate L9b (the trait engine) consumes. **Build stays WATCHED**
  (live GameTracker path → browser-pending). **The full L9a scope — recommended SPLIT L9a-1..4, the DEFAULT-TAKEN forks
  (pitch-zone = coarse strike-zone enum; injury tally = derive-on-read, no new store), and every file:line anchor — is in
  `AUTONOMOUS_RUN_LOG.md` (the 2026-06-18 "L9a RECON DONE" entry). **✅ L9a-1 DONE `e28706e9`** (optional
  `enrichment.pitchLocation` strike-zone capture — additive, no version bump, verified-to-persist; EnrichmentPanel grid →
  browser-pending #18). **⏸ L9a-2 SET ASIDE for JK** (recon wf_e3ff7176-528: the per-AB ball/strike count is VESTIGIAL —
  `advanceCount` 0 callers, never displayed, lone caller is dead code — so making it real needs a NEW per-pitch GameTracker
  input UX = HIGH user-intensity, which tensions the `kbl-detection-philosophy` "non-user-intensive" principle + OD-5A;
  a genuine product/UX fork beyond AUTH-4's bounded-rework envelope → `WAITING_ON_JK.md` + the run-log OPEN DECISION; the
  persist seam [`finalBalls/finalStrikes` on `AtBatEvent` via `buildContextSnapshot:4005`] is ready for when JK rules;
  Captain's lean = option (b) a low-intensity post-play "final count" on the EnrichmentPanel). **✅ L9a-3 DONE `32244393`**
  (handedness join, TS-4: `batterContext`/`pitcherContext.handedness` + `matchupContext.platoonAdvantage` now persist on
  each AtBatEvent — threaded via a `handednessByIdRef` from the full rosters; no UI/field/store/version; happy-path,
  refresh-edge documented-graceful → browser-pending #19). **✅ L9a-4 DONE `acce899c`** (the last L9a build piece): OF
  extra-base-credit per-player SEASON tally (per-play `heldByOf`/`baseSaved` exist on FieldingEvent/EnrichmentPanel; add
  ≤1 new field on PlayerSeasonFielding + wire in seasonAggregator — **if it touches a versioned trackerDb store, the
  `franchiseSeasonLedgerStorage.test.ts` store-list PIN is in scope** [MEMORY: broke a prior L6b dispatch]) + injury
  accumulator (DEFAULT-TAKEN: DERIVE-ON-READ from the persisted injury `BetweenPlayEvent`s — `comebackerInjuries` season
  field exists `seasonStorage.ts:99` but has ZERO live writers — no new store). **L9a-2 remains SET ASIDE for JK**
  (per-pitch count UX fork). Recon: wf_f3e99cd3-8a8. Deps: L8 ✓ / L1 ✓. After L9a → **L9b**
  traits → **L10** random events →
  **L11** managers → **L12** races/All-Star/awards-fame → **L13** relationships → **L14** rebrand → the **L-SIM gate**.
  (SET ASIDE remains: **L-ECON1** frozen draft-IV oracle + **F-144**.)
- **ATTENDED DESIGN SESSION (2026-06-17, JK present) — forks cleared + designation model reconciled; D10 build next.**
  No product code yet this session. (1) **OD-2..5 + D4 RULED** (DECISIONS_LOG 2026-06-17): OD-2 economy scale =
  new-league-construction-only / reuse pick-chart with farm anchor nerfed one grade-step via `FARM_NERF_SCALES` /
  scale raw IVs pre-chart (oracle untouched; build safety-walled); corrected a Captain conflation — **IV (ratings→
  salary) ≠ TV (performance/WAR)**, OD-2 never touches TV. OD-3 async/plain-text/game-count/season-scoped. OD-4
  cascade + manager/reporter on team-edit page, **scouts drafted front-loaded before the 22-man** (cosmetic draft-
  guide attribution), reflected on team page. OD-5 manual/opt-in + **requires optional GameTracker zone inputs** +
  cumulative injury tally. D4 moot post-D6 → folded into D11. (2) **DESIG-RECON RULED** (DECISIONS_LOG 2026-06-17):
  the full v1 team-designation set is **SIX per team, ALL in v1** (LSD-6) — Team MVP, Ace, **Albatross** (spec guards
  restored: ≥2× salary + materially-overpaid + value-trusted, can be null), **Fan Favorite** (PROMOTED to live, NO
  salary floor — underpaid-overperformer logic), **Captain** (live badge, Loyalty+Charisma NO minimum, reveal-safety
  cleared, L1.5 charisma≥70 gate removed), **Fan Hopeful** (BUILD visible-safe = random from top-3 by scouted grade).
  Cornerstone fully CUT. ≥2-peer = a TV-trust reliability gate (NOT a league comparison; Albatross confirmed correct/
  intra-team as-built — no bug). Designation EFFECTS (fame/morale) stay dormant until the Phase-2 morale layer (still
  v1). Albatross 15% trade discount = dormant/deferred (no AI-trade consumer in v1). (3) **D10 COMMITTED `51e487a`**
  (Codex-built → Opus-audited VERIFIED: tsc 0 / build 0 / suite 7,289 pass / 3 characterized fail, zero new reds;
  USER-VISIBLE → browser-pending, scenario #12) — re-scoped to LEAGUE awards only: AwardsWatchlist mounted inline on
  the SeasonSummary page + manifest active-designation canonical-source fix + de-"no-awards" copy + pass5/wave4 tests;
  summary.awards stays placeholder, no contractVersion bump, no flag flip; team designations NOT shown here.
  **NEXT = the DESIG-RECON build ticket** (Albatross guards / FF promote no-floor / Captain badge no-min / Fan Hopeful
  visible-safe / Cornerstone removal / spec reconciliation to MODE_2_V1_FINAL §17 + the year-end team-designation
  display on the **TEAM HUB**). Maps: `wf_4e882441-17c` (D10) + `wf_a7edf687-814` (designations).
  (4) **DESIG-RECON BUILD — COMPLETE** (split via `wf_9ea0e360-d00` into DR-1..4; all committed, every code diff
  Codex-built → Opus-audited VERIFIED): **DR-1 `b48b450`** (Albatross spec-guards + FF promote-to-live + Cornerstone
  removal + orphan delete; characterized set 3→2). **DR-2 `9d1db40`** (Captain charisma≥70 removal + Fan Hopeful
  visible-safe season-start assignment to `team.fanHopefulPlayerId`; visible-safe PROVEN by test). **DR-3 `bd6b43c`**
  (team-hub six-designation strip under the 'team' tab — display-only, USER-VISIBLE → browser-batch scenario #13).
  **DR-4** (docs-only spec reconciliation to MODE_2_V1_FINAL §17 — banners + stale-line fixes across DYNAMIC_
  DESIGNATIONS / FAN_FAVORITE_SYSTEM / PERSONALITY_SYSTEM). **All six team designations now live in v1**
  (Captain/MVP/Ace/Fan Favorite/Albatross/Fan Hopeful), effects dormant until the Phase-2 morale layer. Suite
  7,243 pass / 2 characterized fail.
- **OVERNIGHT CONTINUATION (2026-06-17, AUTH-4) — 3 more feature commits, D7 COMPLETE:** `6559a19` **D6b**
  (season-end FREEZE of the trusted-value artifact: frozen-flag + idempotent freeze helper + a Layer-A anti-thaw
  guard in the sole writer + a Layer-B recompute early-return that locks BOTH the artifact and the
  `franchiseTrueValueRows` numbers; freeze triggered at season-complete via `checkSeasonComplete` AND the
  `isSeasonOver` effect; mutation-proven) · `abfa167` **D7a** (reconcile the dual designation path → persisted store
  canonical: TEAM_MVP/ACE promoted 'projected'→'active' ONLY when the eligibility path marks the exact holder active;
  live non-'Proj.' badge; ephemeral changed-only `DesignationEvent` with the morale/fame firewall intact) · `013d886`
  **D7b** (Albatross live + **closed the untrusted-value LEAK** — the canonical selection now filters to the D6
  per-player ≥2-peer trusted set, so an untrusted worst-value player is never branded Albatross; mutation-proven; -1
  fame stays dormant; Fan Favorite stays projected/morale-gated). **+ `14c90fd` D8** (award-trust GATE: the literal-false
  `trustedForAwards`/`finalWarTrusted`/`consumerThresholdsProven` promoted to COMPUTED off the D6 FROZEN artifact —
  award trust requires `artifact.frozen===true` [a deliberate tightening vs D7, since awards are season-end
  finalizations]; new `franchiseAwardTrust.ts` adaptive qualifier helper via scaledThreshold; written
  `AWARD_TRUST_CONTRACT.md`; D8 is the GATE only — the engine/storage/UI/winners are D9). Frozen-gate mutation-proven.
  Suite **7,263 pass / 3 characterized fail** throughout; trackerDb stayed **v17** for D6b/D7/D8 (no store).
  **+ `53ffd4c` D9a** (D9 SPLIT into D9a/b/c/d; D9a = the pure dark-store persistence diff — D6a precedent): 2 NEW
  IndexedDB stores at **trackerDb v17→v18** — `franchiseAwardsRows` (LSD-1 fame seams baked in: candidate margins /
  fWAR-total split / nullable voteWeight / reserved KK-Bust-Comeback) + `franchiseTrueValueSnapshots` (per-game trough
  history) — with the FULL backup-parity lockstep (register both byte-mirrored + pin 18 + optional:true, KBL_BACKUP_
  VERSION stays 2) + round-trip + the proven pin-trap test updated. Stores are DARK (no engine writers — D9b/c/d).
  Suite **7,271 pass / 3 characterized fail (7,274 total, 403 files)** at D9a. **+ `9fa540d` D9b** (the 5 WAR-category
  awards ENGINE, additive/dark — D9d wires it): pure `computeFranchiseWarAwards` (MVP=totalWar / Cy Young=pWAR /
  RoY=top totalWar∩rookies / Gold Glove=fWAR+split seam / Silver Slugger=bWAR) off the D6 FROZEN artifact + D8 gate +
  adaptive qualifiers; deterministic (mutation-kill proven: untrusted 99-WAR row can't win; qualifier scales with
  season length); `computeAndPersistFranchiseWarAwards` writes the D9a store finalized:true. Never recomputes TV.
  Suite **7,277 pass / 3 characterized fail (7,280 total, 404 files)** at D9b. **+ `443c86c` D9c** (Manager of the
  Year → the **6-category awards engine is COMPLETE**): MANAGER_OF_YEAR = a season aggregation of the live per-game
  pogAwards manager composite + the wins-above-D6-expectation record term (expected = frozen value-share ×
  gamesPerTeam, derived ONLY from the frozen artifact — no trusted expected-wins source exists), pool-normalized;
  folded into `computeAndPersistFranchiseWarAwards` (one finalize, all 6); additive nullable
  managerActualWins/ExpectedWins (no store/version bump). Record-term determinism mutation-proven; mwar retirement
  deferred (safe). Suite **7,281 pass / 3 characterized fail (7,284 total)** at D9c. **+ `d814c52` D9d-1** (D9d split
  D9d-1 wiring / D9d-2 UI): the season-end finalize TRIGGER calls `computeAndPersistFranchiseWarAwards` after the D6b
  freeze on BOTH season-complete paths (awaited in checkSeasonComplete; `.then`-chained on the isSeasonOver effect;
  computedAt=frozenAt byte-stable) + the game-1 `franchiseTrueValueSnapshots` capture on `processCompletedGame`
  (deterministic checkpoint = scheduled gameNumber ?? gameId, idempotent, own try/catch, regular-season-only — LIVE
  GAME PATH → browser-batch). Suite **7,285 pass / 3 characterized fail (7,288 total, 405 files)** at D9d-1.
  **+ `c229733` D9d-2** (the awards UI → **D9 COMPLETE**): NEW `AwardsWatchlist.tsx` — a Mode-2 regular+playoff tab in
  FranchiseHome (gated `seasonPhase !== "offseason"`, SEPARATE from the dead-gated offseason ceremony, NO flag flip),
  read-only, rendering the 6 categories + winner + candidate margins (finalized rows when present, else the in-season
  PREVIEW) + a pure read-only `computeFranchiseAwardsPreview` (looser `warLikePreviewAvailable` gate, `finalized:false`,
  NEVER persisted; the frozen-gated finalize path byte-unchanged) + the manifest flip (awards-watchlists blocked→included
  + `awardsImplemented`, GATED on finalized rows existing, contractVersion bumped → `…-v2-awards-manifest-v1`, wave4 pin
  updated as a sanctioned baseline shift + a new blocked-when-absent case). USER-VISIBLE → browser-batch. Independently
  re-audited (tsc 0 / build 0 / FULL suite **7,288 pass / 3 characterized fail (7,291 total, 406 files)**, zero new
  reds). **D9 COMPLETE — SESSION ENDED (JK-directed close); NEXT = D10.**
- **AUTONOMOUS BUILD RUN COMPLETE (2026-06-16) — 7 feature commits + D5 confirm on `codex/franchise-v1-next`
  (nothing pushed); every diff Codex-built → Opus-audited independently (tsc/tests re-run, substance read,
  invariants grep'd).** In order: `d48ab3c` **L1** (hidden-modifier rename + typed on Player) · `752882f` **D1**
  (WAR-scaling 162 de-dup, zero behavior change) · `2fab709` **D2** (backup parity + structural parity-guard —
  silent-drop defect closed) · `2f4f3e5` **L1.5+OD-1** (backfill the 4 hidden modifiers for ALL franchise players
  at init [MLB players had none — OD-1 ruled: generate at init] + assign Team Captains; 54 tests; browser-confirmed
  in the real runtime) · `0cf4ca2` **L4a-connect** (franchise reporter wired to live GameStory; browser-pending,
  Supabase) · `8074976` **L4a-bus** (the SEA-1 season-narrative publish-bus core; build-dark; §5-firewall-correct)
  · `4a1bd36` **D6a** (the make-or-break True-Value TRUST gate, LIVE half: peer-pool audit ≥2 hard-block + the
  trusted-value artifact + the 4 flag-flips to computed; RIGOROUSLY audited — oracle untouched, real no-leak
  boundary test, parity-guard green). **D5 CONFIRMED** (TEAM_MVP/ACE trust engine, 51 tests). **D6 ruled:
  SEASON-END FREEZE** (D6a = live half; D6b adds the freeze).
- **⏰ OVERNIGHT MODE AUTHORIZED (AUTH-4, JK 2026-06-16) — a fresh thread should KEEP ROLLING, no stoppages.**
  Per `AUTONOMOUS_RUN_PROTOCOL.md` AUTH-4: the Captain makes **every** call — engineering AND spec-bounded DESIGN
  (incl. the soul-layer engines + value-design forks) — by building to the ratified spec + rulings, taking a
  **documented conservative default** where the spec is silent, and **continuing**. This SUPERSEDES the per-change
  SMB4-Asset gate + the "build to spec" greenlight. The run **never stops for JK**; the only pause is
  **SET-ASIDE-AND-CONTINUE** on a genuine safety wall (oracle/data-corruption/runaway/unresolvable-regression),
  after which the loop moves to the next ticket. Everything → `AUTONOMOUS_RUN_LOG.md` for JK's morning review;
  rework is the accepted cost of momentum. **A fresh thread: do the session-start reads, RESTATE the state, and
  PROCEED IMMEDIATELY — do NOT wait for JK's start-of-session confirmation (JK is unattended overnight; AUTH-4 is
  the standing "go"). Start at D10 and keep dispatching the Queue** (`AUTONOMOUS_RUN_PROTOCOL.md`) until it is
  exhausted or everything left is set-aside on a safety wall. (D6b/D7a/D7b/D8/D9a/D9b/D9c/D9d-1/D9d-2 all committed this
  run — **D9 COMPLETE** — see the OVERNIGHT CONTINUATION bullet above + `AUTONOMOUS_RUN_LOG.md`.)
- **NEXT (fresh session resumes here):** **D10 — Mode-2 season-summary / manifest HANDOFF finalize** (supersedes the
  no-awards 1.10A stopgap): finalize the Mode-2 season summary + manifest now WITH awards (D9 just landed
  `AwardsWatchlist` + the gated manifest flip) AND active designations (D7). Touch the SeasonSummary PAGE copy (D9d-2
  deliberately did NOT — that was reserved for D10). Depends on D2, D7, D9 (all done). Then **D11** (UI live-label
  sweep — strip residual preview/READ-ONLY vocabulary across salary / True Value / designations / awards) → **D12**
  (full Phase-1 manual smoke on real local franchise state, iPad) → **D13** (Playable-V1 internal checkpoint) → the
  **soul layer** (L3 morale matrix → L6 fame → L7 effects → L8/L9b development → L10–L14 → the L-SIM gate; L2 lands
  with its first consumer). Take the **OD-3/4/5** leans + continue. **Tracked D9 FOLLOW-UPS** (logged in the run log):
  per-player profile/Almanac award display (PlayerInstanceCard / almanac); the `mwarCalculator`/`calculateMOYVotes`
  retirement (pre-flag-flip cleanup — re-point AwardsCeremonyFlow:1620 + RatingsAdjustmentFlow:388 BEFORE any flag
  flip). **SET ASIDE (the one safety wall): L-ECON1** (re-prices the frozen draft-IV anchor → oracle touch) + F-144.
  The **D4** scope snag: take the conservative call or leave for the browser session — either, just log it.
  → **D10–D13** → then the
  **soul layer** (L3 morale matrix → L6 fame → L7 effects → L8/L9b development → L10–L14 → the L-SIM gate; L2 lands
  with its first consumer). Take the **OD-3/4/5** leans + continue. **SET ASIDE (the one safety wall): L-ECON1**
  (re-prices the frozen draft-IV anchor → oracle touch) + F-144. The **D4** scope snag: take the conservative call
  or leave for the browser session — either, just log it.
- **PHASE-2 "L-STACK" SEQUENCING DRAFTED + FORKS RULED (2026-06-16; design + docs only, NO product code):**
  `FRANCHISE_V1_LIVING_SEASON_DSTACK.md` (Status: PROPOSED) sequences the living-season spec §5–§24 into
  dependency-ordered tickets **L1–L14 + L-SIM + an economy track**, hardened by a 12-agent decorrelated
  workflow (`wf_b5734e06-e2c`: 7 grounding code-readers + 5 adversarial ordering critics, ~1.26M tokens).
  Audit-forced corrections folded in: **MOY → Phase-1 D9** (not a Phase-2 ticket; MOY-4 bars manager fame);
  **new L1.5** Captain Mode-1-handoff (BLOCKER gap — unbuilt in both stacks); **L1** is a real build (hidden
  modifiers generated mis-named + un-persisted); **L4a/L9a hoisted to Tier 0**; **DSF-1 coupled to the value/IV
  spine** (re-prices the frozen draft-IV anchor → land before the salary freeze); **backup-parity escalated**
  (D2 guard covers only `kbl-tracker`; export/restore orphaned + stale-pin restore destroys newer stores);
  **floating TV built but no trough history** → new `franchiseTrueValueSnapshots` store from game 1. **Rule:
  BUILD Phase-2 dark in parallel with the late D-stack, ACTIVATE strictly after D13** (§5 no-phantom-morale +
  D12 gate). **Five forks RULED by JK (LSD-1..5, DECISIONS_LOG):** LSD-1 D9 fame-ready seam checklist ratified
  (build the award engine ONCE, fame hooks empty, L12 fills them); LSD-2 FA-attraction → v1.1 (keep only
  in-season trade-requests in L5); LSD-3 Cornerstone CUT; LSD-4 budget pressure CUT; LSD-5 stadium change =
  pick from the existing SMB pool (pull dimensions/name/park-factors). **+ LSD-6 (JK ruling B, 2026-06-16): the
  living season IS part of v1** — v1 = D-stack + L-stack + the L-SIM gate (one release); D0's "Playable-V1" (D13)
  is an INTERNAL Phase-1 checkpoint, not the v1 release; the soul layer is v1-Phase-2 (NOT v1.1); only the
  offseason + the 3 LSD cuts stay post-v1. D0 reconciled for (B) (D9 now carries the LSD-1 seams + MOY-1..7).
  **NEXT:** D0 ratification (now clean to ratify), then contract the Tier-0 opener **L1** (personality/modifier
  substrate). Structure signed off (JK "move forward as recommended").
- **§18 VERIFICATION READS — 4 of 4 COMPLETE (2026-06-16; reads + design + docs only, NO product code):**
  (1) **reporter** → `REPORTER_CERTIFICATION.md` + **REP-1..4** (in-game cadence = POST-GAME COLUMNS ONLY, live
  GameStory canonical, franchiseId-keyed, accuracy model built in §24) + **SEA-1..5** (season-long narrative = a
  sim-tunable "PUBLISH BUS" built EARLY in Phase-2; most beats gated on their unbuilt Phase-2 event source);
  (2) **traits-from-reality (§9)** → `TRAIT_SIGNAL_CERTIFICATION.md` + **TS-1..13** (acquisition = reality-percentile
  × personality × morale, min-sample valve = Franchise-lite toggle, role-eligibility 25 pitcher / 39 position / 7
  universal / 1 cut [Sign Stealer], four personality "image" axes; net-new capture = pitch-ZONE + OF-extra-base-credit
  + injury accumulator, rest reuses existing fields; §9 engine builds on `traitInteractionMatrix`);
  (3) **draft/salary/farm (§18.3)** → `DRAFT_SALARY_FARM_CERTIFICATION.md` + **DSF-1..4** (UNIFY rookie+farm on a
  tier-scaled RELATIVE-TO-POOL scale via the orphaned `TIER_SHIFTS`; tradeable asset = DRAFT PICKS; `farmGradeMode`
  multiplicative skew; in-season annual draft DEFERRED post-v1). All design rulings in `DECISIONS_LOG.md` (2026-06-16
  entries); (4) **Manager-WPA / MOY (§18(4) + AWARD-7)** → `MANAGER_WPA_MOY_CERTIFICATION.md` + **MOY-1..7**
  (input set = 4 [decision-WPA + DEPLOYMENT-WPA + lineup-delta + team record — deployment was a SILENT 4th term, record
  was NOT in the live sum]; lineup-quantity DEFERRED to build [capped realized record vs orphaned T10
  `lineupDeltaWpaStandard`]; record = EXPECTATION-RELATIVE on the D6 trusted artifact → MOY HARD-couples to D6; NO fame
  tilt v1; build = season aggregation of the LIVE `pogAwards` `best_manager` composite into a NEW
  `franchiseAwardsEngine`/`Storage`, retiring the dead-gated salary `mwarCalculator`/`calculateMOYVotes`; POOL-RELATIVE
  normalization dissolves the denomination; weights → Sim Gate). **All four §18 prerequisite reads DONE.**
- **Phase:** **T-STACK COMPLETE** (T4→T10 all built / audited CONFORMS / committed) +
  **LIVING-SEASON (PHASE-2) DESIGN COMPLETE** (`FRANCHISE_V1_LIVING_SEASON_SPEC.md`, §0-24, locked
  this session). TWO SEQUENCED LAYERS now exist: **Phase-1 = the D-stack** (value-spine LIVE + real
  awards on trusted value — the SOUL-LAYER-EXCLUDED cut line in `FRANCHISE_PLAYABLE_V1_DEFINITION.md`,
  still PROPOSED/pending-ratification); **Phase-2 = the living-season spec** (morale / development /
  fame / the morale-gated designations / races / relationships / rebrand — exactly what the D0 doc's
  D6/D7 explicitly deferred). Per F-141 the D-stack (D1-D13) still ships FIRST; Phase-2 layers on top.
- **Last completed:** **T10 — Lineup Delta WPA standard + per-season constants snapshot** (commit `5010126`).
  Codex 5.5 BUILT → Opus 4.8 audit **CONFORMS** → **JK APPROVED** (persistence / saved-data-shape; not
  auto-committed). §9 standard = the PURE projected-vs-projected scalar `ManagerLineupDeltaSummary.
  lineupDeltaWpaStandard` (= `summarizeLineupSnapshotComparison`'s `projectedOpportunityCostTotal` =
  `chosen.projectedTeamLineupKblWpa − optimal.projectedTeamLineupKblWpa`), derived at game-end for BOTH
  managers, persisted ADDITIVE as a sibling of `managerLineupDeltas`. The pre-existing realized-vs-projected
  `managerWpa` is BYTE-UNCHANGED and the new scalar is NOT folded into the `managerValue` rollup (regression-
  guard test proves no double-count). §12 snapshot = a full-dependency FNV-1a content hash (NEW
  `src/engines/optimizerConstantsSnapshot.ts`; optimizer subset of `rosterEngineConstants` + `ivCurves` +
  `traitPricing` + `traitInteractionMatrix`; `tierParams` EXCLUDED) stamped write-once on `SeasonMetadata`
  (NO DB bump; warn-once on mid-season drift; travels in backup). "WPA" documented as rescaled IV per D9
  (§9 spec note added; field rename → v2). Independently re-verified: tsc 0 / build 0 / suite 7,230 (only the
  3 characterized fails) / `wpaRuntimeBoundary` unchanged (camelCase clears the pattern → ZERO allowlist
  edits) / optimizer engines + data files BYTE-UNCHANGED / orphan trace RESOLVED. BROWSER-PENDING
  (persistence-prioritized). LOW: micro-inefficiency (summary stamps `version` via a full hash recompute —
  cleanup); pre-existing `backupRestore.ts` v12 staleness surfaced as a SEPARATE backup-hardening ticket
  (T10 avoided a new store → does NOT inherit it). Map: `T10_SCOPE_MAP.md`.
- **Prior (committed) this arc:** **T9b — GameTracker sub-rec integration** (commit `93763ee`). Codex 5.5 BUILT →
  Opus 4.8 audit **CONFORMS** → **JK APPROVED** (user-visible + GameTracker-state, not auto-committed).
  Wired T9a `recommendSubs` into the live in-game rec surface: the 3 generators in
  `managerWpaRecommendations.ts` rebuilt onto the engine (adapters → EffectiveRatingsPlayer + PlayerState +
  live GameContext incl. opposing player); the `GameTracker.tsx` rec useMemo mapping widened to feed full
  ratings/traits/hands/positions/mojo (`getMojoForPlayer`, 6-level normalize)/fitness/pitchCount/count/
  bases/opposing player (the data was already in live state, just stripped). **PURE IV-delta firing gate**
  (JK ruling) — situational heuristics removed (no leverage floor / batting-order gate / pitcher meltdown
  triggers); fires IFF best per-type delta > `SUB_REC_THRESHOLD`. `PRESSURE_LEVERAGE_BANDS {high 1.5,
  extreme 3.0}` added. ManagerRecommendation output + watch/decision plumbing + NewsBoard UI UNCHANGED.
  Independently re-verified: tsc 0 / build 0 / suite 7,220 (only the 3 characterized fails;
  `wpaRuntimeBoundary` unchanged) / orphan trace RESOLVED (traits/mojo/fitness/opposing-player flow UI→
  engine) / T9a engine + rosterAnalyzer + ivEngine BYTE-UNCHANGED. **→ T9 COMPLETE.** BROWSER-PENDING.
  (T9a `ef85c80` + T8d-1/2/3 + T8a/b/c + T6/T7-stack — all CONFORMS — COMMITTED.) LOW findings: vestigial
  unused input fields (cleanup candidate); global `kbl-gotchas.md` says 5-level mojo but code is 6-level
  (stale doc — fix when convenient).
- **T9a — Pure in-game sub-recommendation engine** (commit `ef85c80`). Codex 5.5
  BUILT → Opus 4.8 audit **CONFORMS** → COMMITTED (pure engine, no user-visible surface → standing
  auto-commit). NEW `src/engines/subRecommendations.ts` (`recommendSubs`): scores eligible subs vs the
  current player on **IV-of-effectiveRatings** (`computeIV(effectiveRatings(...)).kblIV`, the same recipe +
  byte-identical clamp as `rosterAnalyzer.ts:546-571` — "one truth, three surfaces"), recommends when the
  per-type delta > `SUB_REC_THRESHOLD` {pinch_hit 5k / defensive 7.5k / pitcher_change 12k, CALIBRATE}.
  Role-misuse mojo down-shift for pitcher changes; DefensivePlacementRisk folded into the delta for
  defensive subs; justification strings (mojo/fitness/trait activations/standoffs/fatigue/IV). ADDITIVE to
  `effectiveRatings.ts` (export the 7 shapes + new `activeTraitNames`; no behavior change). Independently
  re-verified: tsc 0 / build 0 / suite 7,217 (only the 3 characterized fails) / rosterAnalyzer + ivEngine +
  managerWpa + GameTracker BYTE-UNCHANGED. **T9 mapped (4-agent fan-out → `T9_SCOPE_MAP.md`); JK ruled 4
  forks (IV-of-effectiveRatings delta / per-type threshold / new pure engine / 2-ticket split).**
  (T8d-1/2/3 + T8a/b/c + T6/T7-stack — all CONFORMS — COMMITTED.)
- **T8d-3 — Board intelligence overlays** (commit `2738cf5`). Codex 5.5 BUILT →
  Opus 4.8 audit **CONFORMS** → **JK APPROVED** (user-visible, not auto-committed). Three display-only
  overlays on `LeagueBuilderSnakeDraft.tsx`: pick-value chart panel (`pool.pickValueChart` + on-clock pick
  value) + advisory trade-validator panel (`validateTrade`, try/catch friendly out-of-range, no
  persistence per Q7) + on-demand per-candidate cross-team solvency chips (`assessSolvency` across all
  teams, §7.3 "green for one team, red for another"). Closes the last 2 T8a engine orphans
  (`derivePickValueChart` output + `validateTrade` now have UI consumers). Independently re-verified: tsc 0
  / build 0 / suite 7,210 (only the 3 characterized fails) / diff = 2 files / do-not-touch byte-unchanged /
  DB still 7 / no R9/R12 / IV display stays pool.iv (L2). BROWSER-PENDING. **→ T8d COMPLETE.**
  (T8d-1 `9f94412` + T8d-2 `2a5cd95` + T8a/T8b/T8c + T6/T7-stack — all CONFORMS — COMMITTED.)
- **T8d-2 — MLB snake-draft board shell + draft-session persistence** (commit `2a5cd95`). Codex 5.5 BUILT → Opus 4.8 audit **CONFORMS** → **JK APPROVED** (persistence + user-visible,
  not auto-committed). New `LeagueBuilderSnakeDraft.tsx` board at a NEW route `/league-builder/snake-draft`
  + new "MLB DRAFT" tile (existing farm-draft tile relabeled "Farm prospect draft"; farm draft UNTOUCHED).
  Drafts 22-man rosters from the league RegisteredPool; per-candidate solvency via T8d-1 `assessSolvency`
  (rosterSize 22, budget=tierCap, identity-shifted caps); GREEN/YELLOW/RED/BLOCKED signal + BLOCKED disables
  confirm; user-arranged snake order (`buildSnakeOrder`). **Persistence: kbl-league-builder v6→v7 ADDITIVE**
  — new `mlbDraftSessions` store (keyPath id, leagueId index) + `LeagueBuilderMlbDraftSession` + CRUD +
  sync/backup collateral; **DB_VERSION 7 is the only version change** (migration test seeds raw v6 → proves
  all 9 prior stores + data survive). Each confirmed pick does the **dual-write** (`mlbRoster` append +
  `leagueAssignments rosterStatus:'MLB'`) satisfying the 22+10 handoff. `toConstructionPlayer` adapter added
  (hook layer; engine pure). Independently re-verified: tsc 0 / build 0 / full suite 7,206 (only the 3
  characterized fails) / all do-not-touch incl. the farm draft + handoff BYTE-UNCHANGED. BROWSER-PENDING.
  (T8d-1 `9f94412` + T8a/T8b/T8c + T6/T7-stack — all CONFORMS — COMMITTED.)
- **§18 read (4) — Manager WPA reconciliation for MOY: COMPLETE** (this session) → `MANAGER_WPA_MOY_CERTIFICATION.md` + **MOY-1..7** (DECISIONS_LOG 2026-06-16). All four §18 prerequisite reads DONE. The MOY build ticket = greenfield awards + persistence + a HARD D6 dependency → sequences POST-D6/D8 inside D9 (surfaces to JK per the risk rule when drafted).
- **DONE (2026-06-16) → see the RIGHT-NOW top entry + `FRANCHISE_V1_LIVING_SEASON_DSTACK.md`. (Historical scope of the task that produced the L-stack:)** Captain sequenced `FRANCHISE_V1_LIVING_SEASON_SPEC.md` §5-§24 into dependency-ordered tickets for JK ratification, **FOLDING IN the build tickets these §18 reads unblocked**: the **reporter-foundation publish-bus (built EARLY)** + its per-source event taps; the **§9 trait engine** (on `traitInteractionMatrix`) + the pitch-zone / OF-arm / injury captures; the **unified relative-to-pool salary scale** + **tradeable draft-pick trading** + **`farmGradeMode`**; the **MOY award engine** (MOY-1..7, season aggregation of the `pogAwards` composite, POST-D6/D8). Reconcile the Phase-1↔Phase-2 COUPLINGS: **D9 awards** (MVP = TOTAL WAR; Gold Glove = fWAR + DEFENSIVE fame; vote-weighting = FAME not salary — adopt-now vs build-then-rework; **+ MOY now contracted via MOY-1..7, sequenced POST-D6/D8**) and **D7 Fan Favorite** (deferred morale-gated half now designed). **The existing D-stack (D1-D13) is Phase-1 and can proceed in parallel** once JK ratifies D0.
  **Reconciliation carried into Phase-2 planning:** re-triage the deferred fast-follows against the new design — R9 scout-obscured farm IV (feeds the draft/farm read), R12 chemistry overlay (overlaps relationships-lite), FINDING-148 (base AUX_PRICING L/R premium, JK-gated, oracle regen — affects the True Value that fame/awards now lean on); the **D2 backup-parity + backupRestore.ts v12 hardening GROW** to cover Phase-2's new persisted state (morale ledger, fame Heat + Reach floor, relationship edges, race standings, Comeback TV-snapshots). Tech-debt surfaced this session lives in the spec: §20.8 (fame: 3 ladders->1, cumulative->recency+reach, Elimination-scoped->franchise) and §23.9 (awards: offseason-decouple, fame-weighting, remove mechanical rewards, retire deprecated mWAR). Planning-doc sprawl (~45 franchise docs) -> collapse the authoritative set to D0 + the living-season spec + this file. Maps: `T10_SCOPE_MAP.md`, `T9_SCOPE_MAP.md`, `T8d_SCOPE_MAP.md`.
- **STANDING MODE (JK 2026-06-14):** per ticket = build → independent ENGINEERING
  audit → auto-commit verified-complete (browser-pending) → proceed. Captain
  surfaces only the audit verdict, the browser backlog, and genuine scope/design/
  asset decisions when drafting each contract. Browser sign-off BATCHED (see
  BROWSER-VERIFY), never waived; clears before D0.
- **FINDING-148 (JK-gated, non-T-stack):** base AUX_PRICING L/R premium gap
  (switch>left>right; lefty missing; T1 contract-scope gap). Touches FROZEN base-IV
  → oracle regen + golden re-validation required. JK to sequence; do NOT
  auto-insert. ROUTE Codex 5.5 | high → Opus audit.

## SUITE BASELINE

**7,559 tests / 438 files** — full suite run 2026-06-18 (fresh attended session, real node v20, `NODE_ENV=`) after
**L10-5** (the pure reporter news adapter → **L10 COMPLETE**): **7,557 pass / 2 fail** = EXACTLY the characterized
baseline (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture` 5000ms timeout). ZERO new reds (+9 tests / +1 file =
`franchiseL10NewsAdapter.test.ts`); delta over post-L10-4 is +9 pass / +0 fail = exactly the new test file (a pure
orphaned adapter imported by no production code cannot affect any other test). Build exit 0. trackerDb **v23** unchanged.
*(Prior baseline retained below for the arc trail.)* **7,550 tests / 437 files** — full suite run 2026-06-18 (fresh attended session, real node v20, `NODE_ENV=`) after
**L10-4** (the pure stadium-change resolver): **7,548 pass / 2 fail** = EXACTLY the characterized baseline
(`wpaRuntimeBoundary` + `franchiseManualSmokeFixture` 5000ms timeout). ZERO new reds (+10 tests / +1 file =
`franchiseStadiumChangeResolver.test.ts`); delta over the post-L10-3 baseline is +10 pass / +0 fail = exactly the new
test file (a pure orphaned engine imported by no production code cannot affect any other test). Build exit 0 (PWA → tsc
clean). trackerDb **v23** unchanged (L10-4 added no store). *(Prior baseline retained below for the arc trail.)* **7,540 tests / 436 files** — full suite run 2026-06-18 (fresh attended session, real node v20, `NODE_ENV=`) after
**L10-3** (the flag + dark league-sweep hook): **7,538 pass / 2 fail** = EXACTLY the characterized baseline
(`wpaRuntimeBoundary` "stays-allowlisted" + `franchiseManualSmokeFixture` 5000ms timeout). ZERO new reds (+5 tests /
+1 file = `franchiseL10SweepCompute.test.ts`). Build exit 0 (`✓ built in 7.74s` + PWA → tsc clean). trackerDb **v23**
unchanged (L10-3 added no store); KBL_BACKUP_VERSION 2. *(Prior baseline retained below for the arc trail.)* **7,535 tests / 435 files** — full suite run 2026-06-18 (AUTH-4 overnight, host session) after **L10-2** (the dark
`franchiseL10Overlays` store; trackerDb v22→v23): **7,533 pass / 2 fail** = EXACTLY the characterized baseline
(`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`). ZERO new reds (+8 tests / +1 file =
`franchiseL10OverlayStorage.test.ts`). tsc 0; v22→v23 migration-survival + backup parity proven; KBL_BACKUP_VERSION 2.
trackerDb **v23**. *(Prior baseline retained below for the arc trail.)* **7,527 tests / 434 files** — full suite run 2026-06-18 (AUTH-4 overnight, host session) after **L10-1** (the pure
random-event selection engine): **7,525 pass / 2 fail** = EXACTLY the characterized baseline (`wpaRuntimeBoundary` +
`franchiseManualSmokeFixture`). ZERO new reds (+13 tests / +1 file = `franchiseL10EventEngine.test.ts`). tsc 0. trackerDb
**v22** (L10-1 is a pure engine, no store). *(Prior baseline retained below for the arc trail.)* **7,514 tests / 433 files** — full suite run 2026-06-18 (AUTH-4 overnight, host session) after **L9b-3c** (→ L9b
COMPLETE): **7,512 pass / 2 fail** = EXACTLY the characterized baseline (`wpaRuntimeBoundary` +
`franchiseManualSmokeFixture`). ZERO new reds (+15 tests / +2 files = `traitOverlayConfirmation.test.ts` [10] +
`franchiseTraitConfirmApply.test.ts` [5]). tsc 0. trackerDb **v22** (L9b-3c added no store; pure engine + a confirm
applier with no live caller). *(Prior baseline retained below for the arc trail.)* **7,499 tests / 431 files** — full suite run 2026-06-18 (AUTH-4 overnight, host session) after **L9b-3b-ii** (the flag +
dark trait-grant hook → L9b-3b COMPLETE): **7,497 pass / 2 fail** = EXACTLY the characterized baseline
(`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`). ZERO new reds (+4 tests / +1 file =
`franchiseTraitGrantCompute.test.ts`; the hook is flag-gated dark + the test stubs the L9b-3a→L9b-2 seam). tsc 0. trackerDb
**v22** (b-ii added no store). Live game path (flag-gated) → browser-pending (#22). *(Prior baseline retained below for the arc trail.)* **7,495 tests / 430 files** — full suite run 2026-06-18 (AUTH-4 overnight, host session) after **L9b-3b-i** (the dark
`franchiseTraitOverlays` store; trackerDb v21→v22): **7,493 pass / 2 fail** = EXACTLY the characterized baseline
(`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`, confirmed via FAIL-file grep). ZERO new reds (+8 tests / +1 file =
L9b-3b-i's `franchiseTraitOverlayStorage.test.ts`; the modified pin/parity/manifest tests gained assertions, not test
cases). Also `vite build` OK + `tsc` 0. trackerDb **v22**; KBL_BACKUP_VERSION stays 2. *(Prior baseline retained below for the arc trail.)* **7,487 tests / 429 files** — full suite run 2026-06-18 (AUTH-4 overnight, host session) after **L9b-3a + the FINDING-149
seam fix**: **7,485 pass / 2 fail** — the 2 = EXACTLY the characterized baseline (`wpaRuntimeBoundary` +
`franchiseManualSmokeFixture`, confirmed via FAIL-file grep). An earlier run (pre-fix) showed 3 fails, the 3rd being the
documented order-flake `EliminationTeamHub.test.tsx`, which did NOT reproduce on re-runs (passes solo) — same
worker-pool-reorder family, NOT a regression. **ZERO new reds** (+22 tests / +1 file = exactly L9b-3a's
`traitCandidateBuilder.test.ts`, incl. the L9b-2 seam test; the engine is pure/build-dark, imported by nothing in
production → cannot regress any UI/other test). trackerDb **v21** (L9b-3a added no store). *(Prior baseline retained below for the arc trail.)* **7,465 tests / 428 files** — full suite run 2026-06-18 (AUTH-4 overnight, host session) after **L9b-2** commit
`f616373a`: **7,463 pass / 2 fail** — the 2 = EXACTLY the characterized baseline (`wpaRuntimeBoundary` +
`franchiseManualSmokeFixture`, confirmed via FAIL-line grep); the order-flakes did NOT surface this run. **ZERO new reds**
(+24 tests / +1 file = exactly L9b-2's `traitAcquisition.test.ts`; the engine is pure/build-dark). trackerDb **v21**
(L9b-2 added no store). *(Prior baseline retained below for the arc trail.)* **7,441 tests / 427 files** — full suite run 2026-06-18 (AUTH-4 overnight, host session) after **L9b-1** commit
`398533d1`: **7,437 pass / 4 fail**. The 4 = the 2 FIXED characterized fails (`wpaRuntimeBoundary` +
`franchiseManualSmokeFixture` — names personally confirmed via the FAIL-line grep) **+ 2 order-flakes**
(`GameTrackerLaunchState` + **newly-surfaced `EliminationTeamHub`**), BOTH of which **PASS SOLO** (9/9 and 6/6) → they are
worker-pool-order flakes (shared fake-IndexedDB/global state), NOT regressions. **ZERO new reds attributable to L9b-1**
(+19 tests / +1 file = exactly L9b-1's `traitRealityScorer.test.ts`; the salaryCalculator percentile lift is
behavior-neutral → 121/121 family green, adds no tests). `EliminationTeamHub` is the SAME phenomenon documented for
`AwardsWatchlist` on L7d-1 — a pre-existing latent flake surfaced when a new test file shifts vitest's worker ordering;
added to the order-flake family in OPEN PENDING-JK (NOT silently relabeled into the characterized set). trackerDb **v21**
(L9b-1 is a pure engine; no store, no version bump). *(Prior baseline retained below for the arc trail.)* **7,422 tests / 426 files** — full suite independently re-run 2026-06-18 (AUTH-4 overnight) after **L9a-4** commit
`acce899c`: **7,420 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture` — NAMES personally
confirmed), ZERO new reds (+3 tests / +2 new files = `seasonAggregator.outfieldArm.test.ts` + `eventLog.injuryCounts.test.ts`).
L9a-4 is purely additive: NO version bump (trackerDb **v21** / eventLog `DB_VERSION` 3), NO new store, the
`franchiseSeasonLedgerStorage` PIN stays GREEN untouched. Live aggregation path → browser-pending (#20).
*(Prior baseline retained below for the arc trail.)* **7,419 tests / 424 files** — full suite independently re-run
2026-06-18 (AUTH-4 overnight) after **L9a-3** commit
`32244393`: **7,417 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture` — NAMES
personally confirmed this run), ZERO new reds (+4 handedness tests across 2 EXISTING files; no new file → 424 unchanged).
L9a-3 is pure wiring: `eventLog` `DB_VERSION` 3 / trackerDb **v21** / no new `AtBatEvent` field / `buildContextSnapshot`
deps unchanged. Live game path → browser-pending (#19). *(Prior baseline retained below for the arc trail.)* **7,415
tests / 424 files** — full suite independently re-run 2026-06-18 (AUTH-4 overnight) after **L9a-1** commit
`e28706e9`: **7,413 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture` — failing-test
NAMES personally re-confirmed this run), ZERO new reds (+3 tests, SAME file `EnrichmentPanel.test.tsx`; no new file →
424 unchanged). L9a-1 is additive: `eventLog` `DB_VERSION` stays 3, trackerDb stays **v21**, no new store. USER-VISIBLE
(EnrichmentPanel) → browser-pending (#18). *(Prior baseline retained below for the arc trail.)* **7,412 tests / 424
files** — full suite independently re-run 2026-06-18 (AUTH-4 overnight) after **L8b** commit
`cd9e4589`: **7,410 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds
(+26 tests / +2 files = L8a `ratingsDevelopment.test.ts` [17] + L8b `franchiseCheckpointSweepCompute.test.ts` [9], over
the post-L2c 7,386/422). trackerDb stays **v21** (L8 added NO store); KBL_BACKUP_VERSION **2**. L8a auto-committed (pure);
L8b → browser-pending (live game path + overlay writes). The known order-flakes did NOT appear in either L8 audit run.
*(Prior baseline retained below for the arc trail.)* **7,386 tests / 422 files** — full suite independently re-run
2026-06-18 (AUTH-4 overnight) after **L2c** commit
`a77e0ed5`: **7,384 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds
(+10 tests / +1 file = L2c's `ratingsOverlayConfirmation.test.ts`, over the post-L2b 7,374/421; trackerDb still **v21** —
L2c is a pure engine, no store). **L2 trio all pure/dark + persistence-clean; trackerDb at v21 (only L2a bumped it).**
*(Prior baseline retained below for the arc trail.)* **7,376 tests / 421 files** — full suite independently re-run
2026-06-18 (AUTH-4 overnight) after **L2b** commit
`e8ec0908`: **7,374 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds
(+11 tests / +1 file = L2b's `ratingsOverlayMerge.test.ts`, over the post-L2a 7,363/420; trackerDb still **v21** — L2b is
a pure engine, no store). *(Prior baseline retained below for the arc trail.)* **7,365 tests / 420 files** — full suite
independently re-run 2026-06-18 (AUTH-4 overnight) after **L2a** commit
`6fdeba11`: **7,363 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds
(+8 tests / +1 file = L2a's `franchiseRatingsOverlayStorage.test.ts` [7] + the v20→v21 migration test [1]; the other 2
pin/parity files gained assertions, not new test cases; over the post-L7d-2 7,355/419). **trackerDb now v21** (L2a's
`franchiseRatingsOverlays`; KBL_BACKUP_VERSION stays 2). AwardsWatchlist order-flake did NOT appear this run.
*(Prior baseline retained below for the arc trail.)* **7,357 tests / 419 files** — full suite independently re-run
2026-06-17 (AUTH-4 host resume) after **L7d-2** commit
`aec5db99`: **7,355 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds
(+11 tests / +1 file = L7d-2's `fanHopefulCushion.test.ts`, over the post-L7d-1 7,344/418; trackerDb still **v20** — L7d-2
is a pure engine, no store). The AwardsWatchlist order-flake did NOT appear this run (1 of 4 full-suite runs across L7d).
*(Prior baseline retained below for the arc trail.)* **7,346 tests / 418 files** — full suite independently re-run
2026-06-17 (AUTH-4 host resume) after **L7d-1** commit
`f61dcae0`: **7,344 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`) on the
deduped/solo-passing basis (+9 tests / +1 file = L7d-1's `captainMoraleRouter.test.ts`, over the post-L7c 7,335/417;
trackerDb still **v20** — L7d-1 is a pure engine, no store). **⚠ NEWLY-OBSERVED ORDER-FLAKE (2026-06-17, flagged for
JK — NOT a regression):** my full-suite run after L7d-1 showed **3 fails**, the third being
`src/src_figma/__tests__/franchiseMode/AwardsWatchlist.test.tsx`; Codex's full-suite run on the IDENTICAL tree showed
only the 2 characterized. AwardsWatchlist **passes SOLO (2/2)** → it is a non-deterministic order-dependent flake (same
family as the documented conditional-solo flakes `GameTrackerLaunchState` + `franchiseOffseasonGuards.component`),
surfaced because L7d-1's new test file shifted vitest's worker pool ordering. L7d-1 (zero-import pure engine, imported by
nothing) has NO coupling to it. NOT silently added to the characterized set — belongs in the order-flake root-cause batch
(OPEN PENDING-JK). *(Prior baseline retained below for the arc trail.)* **7,337 tests / 417 files** — full suite
independently re-run 2026-06-17 (AUTH-4 host resume) after **L7c** commit
`886d1dce`: **7,335 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds
(+10 tests / +1 file = L7c's `designationFanMorale.test.ts`, over the post-L7b 7,325/416; trackerDb still **v20** — L7c
is a pure engine, no store). *(Prior baseline retained below for the arc trail.)* **7,327 tests / 416 files** — full
suite re-run 2026-06-17 (AUTH-4 host resume) after **L7b** commit `77feeda3`: **7,325
pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds (+8 tests / +1 file =
L7b's `designationFameNudge.test.ts`, over the post-L7a 7,319/415; trackerDb still **v20** — L7b is a pure engine).
Prior step: L7a commit `0a59a24`: **7,317
pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds (+3 tests in the
existing `franchiseFlashpointDecayCompute.test.ts`, no new file, over the post-L5d 7,316/415; trackerDb still **v20** —
L7a touched no store/version). Prior step: L5d commit `e061e51` (**L5
COMPLETE**): **7,314 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds
(+7 tests / +1 file = L5d's `reporterIntensity.test.ts`, over the post-L5c 7,309/414; trackerDb still **v20** — L5d is a
pure engine, no store). Prior step: L5c commit `8cd2cc1` = 7,309/414 (+9 tests / +1 file =
L5c's `tradeRequestGeneration.test.ts`, over the post-L5b 7,300/413; **trackerDb still v20** — L5c is a pure engine, no
store). Prior step: L5b commit `5ebb148` = 7,300/413 (+18 tests / +3 files over post-L5a 7,280/410). Arc this
session: 7,267/407 (post-L6a) →
+4/+1 L6b-1 (7,269/408) → +4/+1 L6b-2 (7,273/409) → +7/+1 L5a (7,280/410). **trackerDb now v19** (L6b-1's
`franchiseFameRecords`; KBL_BACKUP_VERSION stays 2). *(Prior baseline retained below for the arc trail.)* **7,267
tests / 407 files** — full suite re-run 2026-06-17 after L6a: **7,265 pass / 2 fail**, the 2 being EXACTLY
the (now-shrunk) characterized set. (Arc this session: 7,292/406 after D10 → 7,242/405 after DR-1 [deleted the orphan
`fanFavoriteEngine.test` + cleared the narrative RED, set 3→2] → +D11/L3a/L3b/L6a tests → 7,267/407. Build-dark
soul-layer tests [matrix, morale-store, fame] all green.) (+34 tests / +5 files over the prior 7,254 / 400 — D6b/D7/D8 added tests to existing files +
`franchiseAwardTrust.test.ts`; D9a added `franchiseAwardsStorage.test.ts` + `franchiseTrueValueSnapshotsStorage.test.ts`;
D9b/D9c grew `franchiseAwardsEngine.test.ts`.) **trackerDb is now v18** — only D9a bumped it (its 2 dark stores); D6b→D8
added NO store (D6b's freeze is a field on the existing artifact, DesignationEvents are ephemeral, D8 stores nothing,
D9b is a pure engine). `KBL_BACKUP_VERSION` stays 2. Characterized set (a new RED OUTSIDE it is a real regression) is now **wpaRuntimeBoundary + franchiseManualSmokeFixture**
(2, down from 3). **`franchiseNarrativeEventEligibility` was CLEARED by DR-1** (2026-06-17): it was the PRE-EXISTING
stale "TEAM_MVP/ACE preview-only" assertion (the deferred narrative-gate cleanup); DR-1's Cornerstone-field removal
forced the test edit, and the stale `teamMvpAcePreview` assertion was aligned to the verified pre-existing
`not-applicable` output (NOT gutting — source `teamMvpAcePreview` logic unchanged). No longer a known RED.
(GameTrackerLaunchState + franchiseOffseasonGuards.component are conditional-solo order-flakes that passed here.)
**CLI:** prefix `NODE_ENV= `; node at `~/.nvm/versions/node/v20.20.0/bin`.

## BROWSER-VERIFY OUTSTANDING (JK)

> BATCHED per the SESSION_RULES pen (JK 2026-06-14) — cleared in one pass before
> the D0 / flag-flip / playtest gate; persistence/data-shape items prioritized.
> Engineering audits already passed per ticket; these verify experience/feel.

> **NEW from the 2026-06-16 autonomous run** (NOTE: creating a franchise needs the League Builder startup farm
> draft + scout hiring first — the 22+10 handoff gate, pre-existing): **(A) L1.5** — a created franchise's teams
> each get a `captainPlayerId` (highest Loyalty+Charisma MLB player, Charisma≥70; null+warn if none); all players
> carry the 4 hidden modifiers (OD-1 backfill). [The shipped logic was browser-confirmed in the runtime; this is
> the real-franchise pass.] **(B) L4a reporter** — with a reporter assigned + Supabase configured, the franchise
> hub `BeatReporterNews` shows live post-game `GameStory` columns (not the legacy template). Reporter text is
> Supabase/network-dependent (D-R5).

1. EP1 effective-position pooling on real franchise data — does a position-
   shifting player get repooled; do bench players land in Reserve.
2. TV2 TeamHub projected badges — dotted "Proj.", post-game recalc, fewer
   early-season badges is CORRECT (below-floor = no holder).
3. **T7a** optimal-lineup recommendations now score by IV-of-effectiveRatings
   (was raw heuristic) — verify vs-RHP / vs-LHP lineups look sensible on real
   franchise data, and one-button RECALC produces a coherent lineup + defensive
   arrangement (low-glove players kept off high-traffic spots).
4. **T7b** call-up/send-down advisory recs render in the analyzer panel — ranked,
   read-only, leak-safe (no hidden prospect ratings/true IV shown; "projects as a
   positive-surplus replacement" + scout-confidence label); a low-cost high-surplus
   prospect surfaces over a high-cost MLB underperformer.
5. **T7c** salary ledger: calling up a prospect applies rookie-scale salary (0.50×,
   replacing age factor); sending down a player applies dead-money capCharge; the
   ledger persists per season and resets at offseason Phase 3 (fresh scope). No
   double-discount; re-call-up doesn't stack.
6. **T8b** League Builder tier + balanceMode selectors persist on the league (create/edit form);
   the "Register Pool" button builds + persists a RegisteredPool that survives reload (shows tier,
   tierCap, player count, surplus warning). An existing pre-T8b league still opens fine (additive
   migration). Backup/restore + sync still round-trip with the new `registeredPools` store.
7. **T8c** Team Identity (Cap) section in the team-edit modal: set band priorities, click Suggest
   (composeIdentity fills the increase stack), manually edit increase/decrease mods, watch the live
   cap-shift % preview update, save + reopen the team → the identity persists. A team with no
   identity opens cleanly.
8. **T8d-2** MLB snake-draft board (new "MLB DRAFT" tile → `/league-builder/snake-draft`): start draft
   (registers pool if needed), snake order advances, per-candidate GREEN/YELLOW/RED/BLOCKED solvency
   signal shows for the team on the clock, BLOCKED disables DRAFT, confirming a pick persists (roster +
   player MLB assignment) and survives reload, 22-per-team completes; the existing farm/prospect draft
   (relabeled "Farm prospect draft") still fills the 10; Franchise Setup handoff accepts the league.
   Backup/restore + sync round-trip with the new `mlbDraftSessions` store. (PERSISTENCE/data-shape →
   prioritized in the batch.)
9. **T8d-3** snake-draft board overlays: the pick-value chart panel renders (+ current pick's value on the
   on-the-clock banner); the trade-validator panel flags balanced vs imbalanced (imbalance % vs 15% band,
   favored side, "advisory — overridable") and shows a friendly message for out-of-range pick numbers; the
   per-candidate "Compare teams" toggle shows a GREEN/YELLOW/RED/BLOCKED chip per league team.
10. **T9 (T9b)** in-game NewsBoard sub recommendations now fire on IV-of-effectiveRatings: a clearly-better
   bench bat surfaces a pinch-hit rec with a trait/mojo justification; a tiring pitcher surfaces a fresh-arm
   rec; situational-only triggers (e.g. a meltdown with no ratings drop) no longer fire on their own (pure
   IV-delta gate); keep/decline actions + watch persistence still work; recs feel sensibly-timed vs leverage.
11. **T10** (PERSISTENCE — prioritized) lineup-delta WPA standard: start a seasoned (franchise) game, set a
   deliberately sub-optimal lineup, play to completion → a per-game `lineupDeltaWpaStandard` (≤ 0) persists
   for BOTH managers and survives reload; the existing Manager-WPA overlay/almanac totals are UNCHANGED (no
   double-count); the season carries an `optimizerConstantsHash` that survives backup/restore.
12. **D10** (USER-VISIBLE) Mode-2 SeasonSummary page: after a completed regular season with finalized awards, the
   Awards Status section shows the real finalized LEAGUE awards (MVP/Cy Young/RoY/Gold Glove/Silver Slugger/Manager
   of Year via the AwardsWatchlist) — not the old "Internal v1 does not finalize…" preview copy; before finalize it
   shows the projected preview; the "Season Complete Manifest" reads "awards-aware handoff package" (not "no-awards")
   and the still-blocked families (True Value/salary/morale/Mode 3) remain visibly blocked. Team designations are NOT
   shown here (that's the DESIG-RECON team-hub ticket).
13. **DR-3** (USER-VISIBLE) team-hub TEAM DESIGNATIONS strip: open a franchise → Team Hub → 'team' tab; below
   "Currently viewing: <team>" a six-slot strip shows Captain / Team MVP / Ace / Fan Favorite / Albatross / Fan
   Hopeful for that team — holders + badges (solid = final/live, dotted Proj. = mid-season), "— none" for empty
   slots; Fan Hopeful shows "Scouted <grade>" (visible-safe, never a hidden grade); Captain + Fan Hopeful resolve to
   the assigned players; switching teams updates the strip. (DR-1/DR-2 logic underneath: Albatross only on a
   ≥2×-min-salary materially-overpaid player; Fan Favorite on the best underpaid overperformer; no morale/fame effect
   yet — Phase-2.)
14. **D11** (USER-VISIBLE) Team Hub → roster tab → the "TRUE VALUE + EXPECTED WINS" value panel (D4): mid-season it
   reads **"TRUE VALUE PROJECTED"** (badge PROJECTED); after a season completes (the value artifact freezes) it reads
   **"TRUE VALUE FINAL"** (badge TRUSTED). Salary shows as real (no "preview" framing); "NO SALARY MOVEMENT" + the
   blocked families (expected-wins persistence, final-handoff, morale, Mode 3) STILL show blocked; Expected Wins reads
   as an estimate. No internal contradiction (VALUE INPUTS card no longer says "deferred" while the badge says trusted).
15. **D11** (USER-VISIBLE) label sweep elsewhere: the season-complete manifest no longer lists Fan Favorite/Albatross/
   Captain/Fan Hopeful (or the cut Cornerstone) as "blocked"; "Awards persistence" reads LIVE (not BLOCKED) on the
   Team Hub + the FranchiseHome league-leaders card — WITHOUT enabling any offseason ceremony/voting control; the
   stadium-spray panels + all salary-movement/morale/Mode-3 lines REMAIN provisional/blocked (verify nothing
   over-promoted).
16. **L2a** (PERSISTENCE — prioritized; trackerDb v20→v21) the new dark `franchiseRatingsOverlays` store: open an
   existing pre-v21 franchise → it migrates cleanly (no data loss — prior stores/games/standings/value intact); the
   store is empty (no overlays written yet — it's dark until L8/L9b); backup → wipe → restore round-trips with the new
   store present (empty). This is a saved-data-shape change, so it leads the batch. (Engine audit already proved the
   v20→v21 migration-survival + backup round-trip in unit tests; this is the real-franchise confirmation.)
17. **L8b** (PERSISTENCE/live-path — prioritized; the first real WRITER through L2) the dark ratings-development
    checkpoint sweep: with the **default-OFF** `isFranchisePhase2CheckpointEnabled` flag (normal play), confirm playing a
    franchise season writes ZERO overlays and adds no perceptible overhead (the hook flag-gates first → true no-op). Then
    (dev/QA only — flip the flag) play to a 20%-of-season boundary game and confirm the `franchiseRatingsOverlays` store
    receives `pending`+`permanent` overlays for shifting MLB players (correct franchise/season/team scope, valid rating
    key per player type, deterministic id `…:checkpoint-N`), idempotent on a replayed boundary (no dup rows), and that
    **nothing in the live UI changes** (pending overlays stay inert in the merge until the post-D13 confirm UI). Saved-
    data-shape adjacent (writes into the v21 store; no schema change), so it rides with the persistence batch.
18. **L9a-1** (USER-VISIBLE — GameTracker EnrichmentPanel) the new optional "Pitch Location" capture: during a tracked
    at-bat, the post-play EnrichmentPanel shows a "Pitch Location" row of 5 buttons (Low / High / Inside / Outside / Out
    of Zone) for ALL enrichable plays (incl. K/BB — it is NOT spray-gated); tapping one highlights it and tapping it again
    clears it; skipping it leaves the play un-annotated (optional, undefined-when-skipped). The selection persists with the
    play (reload mid-game → the chosen zone is still shown). It is dark-for-now from the user's view (no trait/rating effect
    yet — L9b consumes it later). Confirms the OD-5 "manual/opt-in zone input" feels right and doesn't clutter the panel.
19. **L9a-3** (DATA/live-path — no visible UI) handedness now persists on at-bat events: play a fresh franchise game to
    completion and confirm (via the event log / a later L9b consumer) that recorded at-bats carry `batterContext.handedness`
    + `pitcherContext.handedness` + `matchupContext.platoonAdvantage` (from the rosters' bats/throws). Edge to spot-check:
    a mid-game page REFRESH — at-bats recorded AFTER the reload will have undefined handedness (known happy-path-only
    limitation; degrades gracefully). No visible UI change; this is a data-capture verification.
20. **L9a-4** (DATA/season-aggregation — no visible UI) OF-arm + injury captures: after playing franchise games with
    outfield-assist / runner-held plays, confirm `PlayerSeasonFielding.outfieldAssists`/`baserunnersHeld` accumulate for
    the credited outfielders (season stats), and that `getSeasonInjuryCountsByPlayer` returns sensible per-player injury
    counts derived from the injury events. No visible UI change (these feed L9b's Cannon/Noodle/Durable/Injury-Prone
    traits later); a data/season-stat verification, not a visual one.
21. **L9b-3b-i** (PERSISTENCE — prioritized; trackerDb v21→v22) the new dark `franchiseTraitOverlays` store: open an
    existing pre-v22 franchise → it migrates cleanly (no data loss — prior stores/games/standings/value/ratings-overlays
    intact); the new store is empty (dark until L9b-3b-ii writes PENDING trait rows); backup → wipe → restore round-trips
    with the new store present (empty). Saved-data-shape change, so it leads the batch. (Engine audit already proved the
    v21→v22 migration-survival + backup parity in unit tests; this is the real-franchise confirmation.)
22. **L9b-3b-ii** (LIVE game path — flag-gated; the first trait WRITER) the dark trait-grant hook: with the **default-OFF**
    `isFranchisePhase2TraitsEnabled` flag (normal play), confirm playing a franchise season writes ZERO trait overlays and
    adds no perceptible overhead (the hook flag-gates first → true no-op, no event loading). Then (dev/QA only — flip the
    flag) play to a 20%-of-season checkpoint near season's end (so the min-sample valve's pool is populated) and confirm
    the `franchiseTraitOverlays` store receives `pending`+`applied:false` trait-change rows for MLB players (correct
    franchise/season/team scope, canonical trait names, `valence` gain/lose, deterministic id `…:trait-grant-N`),
    idempotent on a replayed boundary (no dup rows), and that **nothing in the live UI changes** (pending rows don't mutate
    `trait1`/`trait2` until the L9b-3c confirm). Writes into the v22 store; rides the persistence batch.
23. **L10-2** (PERSISTENCE — prioritized; trackerDb v22→v23) the new dark `franchiseL10Overlays` store: open an existing
    pre-v23 franchise → it migrates cleanly (no data loss — prior stores/games/standings/value/ratings-overlays/
    trait-overlays intact); the new store is empty (dark until L10-3 writes L10 event rows); backup → wipe → restore
    round-trips with the new store present (empty). Saved-data-shape change, so it leads the batch. (Engine audit already
    proved the v22→v23 migration-survival + backup parity in unit tests; this is the real-franchise confirmation.)

## OPEN PENDING-JK (rolling)

**✅ OD-2..5 + D4 ALL RULED 2026-06-17 (attended session) — full text in `DECISIONS_LOG.md` (2026-06-17 entry):**
- **OD-2 (L-ECON1) — RULED:** new-league-construction-only (no retroactive — no in-progress leagues); reuse the
  pick-value chart, **farm anchor nerfed one grade-step via `FARM_NERF_SCALES`** (resolves the farm≈22-man concern);
  scale raw IVs pre-chart so the frozen IV oracle stays byte-untouched. *Build remains watched/safety-walled (oracle-
  adjacent).* Captain conflation corrected: **IV (ratings→salary) ≠ TV (performance/WAR)** — OD-2 never touches TV.
- **OD-3 (L2) — RULED:** queue async/non-blocking + clearly · plain-text edit instructions · game-count expiry ·
  season-scoped overlays.
- **OD-4 — RULED:** franchiseId-precedence cascade · manager+reporter assigned on the team-edit page · **scouts
  DRAFTED front-loaded before the 22-man** (cosmetic draft-guide attribution; reflected on team page) — a re-sequence
  of the League-Builder flow → capture in the draft-flow spec · facts schema at first event-tap build.
- **OD-5 (L9a) — RULED:** manual/opt-in (never forced; used when data present) → **REQUIRES optional GameTracker zone
  inputs for pitch/hit location** · cumulative season injury tally. *Build stays watched (live game path).*
- **D4 — RULED:** moot post-D6 (value preview now trusted/frozen) → **folded into D11** (no standalone ticket).
- **SOUL-LAYER "BUILD TO SPEC" GREENLIGHT** (still open) — L3 morale matrix / L5 fan teeth / L6 fame / L7 designation effects /
  L8 ratings dev / L9b traits / L10–L14: the SMB4 soul-layer engines are JK's design vision. They build to the
  ratified living-season spec (with sim-tunable placeholder magnitudes) once JK greenlights "build to spec."

**DEFERRED FUTURE TICKET (T7c spillover, JK 2026-06-14):** capCharge → soft
payroll-expectation baseline → fan-morale consequence. BLOCKED on a declared-budget
design (no `declaredBudget` field/UI exists; v1.1.2 requires declared ≠ realized
spend). The consumer machinery is orphaned (`calculateFanExpectations` 0 callers) /
hard-gated (`fanMoraleMutationAllowed:false`). T7c persisted capCharge + ledgerCapCharge
ready for it. Also deferred: one-click execute-from-rec; deadMoneyRate league presets
(100/75/50) + Setup-Wizard control.
**FINDING-148** (base AUX_PRICING L/R batter premium gap — new JK-gated ticket;
sequence vs T-stack; regen frozen oracle). **T6 + T7a: COMMITTED** (audit CONFORMS,
flags ratified; T7a browser-pending). Standing auto-commit mode adopted (JK
2026-06-14) — Captain commits verified-complete tickets + proceeds, browser tests
batched.
F-144 (salary-path R-6 residue) + F-145 (designation 'active' vocabulary) +
F-147 (stale peerPoolLimitation written live) → taxonomy/spec-cleanup batch
(with R-6/R-8/§17.8 blocks). MINOR #3 builder-reporting → now ratified into
SESSION_RULES. Stray reference-docs/Super Mega Baseball 4 Rosters.csv
(commit or gitignore). ASG WPA→Fame; Signature Moment card line; fame tier
names; F2 SOT typos (~15); F4 FA trait spellings (4); order-flake root-cause
(now **5 members**: franchiseManualSmokeFixture [characterized] + GameTrackerLaunchState + franchiseOffseasonGuards.component
+ `AwardsWatchlist.test.tsx` [observed 2026-06-17] + **NEWLY-OBSERVED 2026-06-18 `EliminationTeamHub.test.tsx`** — all pass
solo; non-deterministic full-suite order/worker-pool sensitivity [shared fake-IndexedDB/global state]; EliminationTeamHub
surfaced when L9b-1 added `traitRealityScorer.test.ts`, exactly the L7d-1/AwardsWatchlist pattern).
**`Workhorse` trait role (L9b-1 DEFAULT-TAKEN):** classified PITCHER (staminaModifier, unlisted in VI.2) → confirm or
re-classify; affects only which players are eligible to earn it (L9b-2+), not the scorer math.
**L9b-3a DEFAULTS-TAKEN (AUTH-4, flagged):** (1) **outcome-weighted RATE signal model** — the reality `signalValue` is a
success-RATE within a trait's matrix-detected opportunities (e.g. Clutch = WPA-favorable rate in high-pressure PAs), NOT a
bare predicate fire-COUNT. The L9b-3 recon line said "COUNT real fires," which Codex first built literally — but a pure
count makes every OPPOSING pair indistinguishable (Clutch≡Choker, RBI Hero≡Zero, Stealer≡Bad Jumps, Butter≡Cannon≡Noodle
all share one predicate), so the Captain's contract + the shipped engine use the §B-faithful outcome-weighted rate. JK:
confirm the rate model (vs revisiting the recon's count wording). (2) `pressure='high'` derived from the populated
`isClutch` flag (finer leverage-band → 'extreme' deferred). (3) **Cannon Arm / Noodle Arm share ONE OF-arm-per-GAME
signal** = (outfieldAssists + baserunnersHeld) / games, inverted for Noodle — there is no per-OF-throw opportunity
denominator in v1 (approximation). (4) Durable / Injury-Prone = injuries / games (inverted for Durable). (5) ALL signals
use `basis:'none'` (rate floor `minSampleRate`, no season scaling). (6) Clutch/Choker are role-determined (a position
player's signal from his batting WPA, a pitcher's from the fielding-team WPA). (7) **AUDIT NOTE (not a default — a builder
deviation handled):** Codex over-produced — it left an abandoned `traitContextReconstructor.*` pair (the broken count
model) which the auditor DELETED, and edited 5 Captain-owned spec-docs which the auditor REVERTED + re-authored. No JK
action needed on the deviation; flagged for visibility.
**L9b-2 DEFAULTS-TAKEN (AUTH-4, flagged):** (1) **`TRAIT_OPPOSITES`** — a NEW 14-pair canonical positive↔negative trait
pairing list authored in `traitAcquisition.ts` (none existed in code/spec; derived from VI.3 +/− image groupings + the 2
SMB4 mutual-exclusion examples). Touches the frozen trait system → JK review (add/remove pairs?). (2) **personality-PRIMARY
thin-signal exception** (VI.3:122 — Stimulated / Gets Ahead / Falls Behind / Big Hack / Little Hack should let personality
drive even when the measured signal is thin) is NOT implemented in v1; the min-sample valve's thin→dormant default
dominates (conservative). JK: confirm deferral or prioritize. (3) sim-tuned magnitudes in `TRAIT_ACQUISITION_TUNING`
(swings 0.25–0.35, gain 0.75 / lose 0.35) are §16 Simulation-Gate placeholders. (4) the 2-trait-cap displacement can
emit multiple gains all referencing the same weakest-held trait — L9b-3 (atomic write) must pick one.
**NEW (T10): backupRestore.ts stale-schema hardening** — the `trackerStores` registry is pinned at
`version: 12` and omits `franchiseTrueValueRows` (v13) / `franchiseDesignationRows` (v14) /
`franchiseSeasonLedgerRows` (v15); those silently drop on backup/restore and `getSchemaIssues` won't flag the
omission (it iterates the schema, not `db.objectStoreNames`). Separate backup-hardening ticket; T10 avoided a
new store so the §9 snapshot rides `seasonMetadata` (already registered) and does NOT inherit the defect.

## RECENT NON-PRODUCT CHANGE (2026-06-14)

AI-team operating setup added + reconciled: AGENTS.md bridge,
AI_TEAM_OPERATING_MODEL.md, .codex/config.toml, 31 mirrored Codex skills.
CLAUDE.md session-start corrected to the canonical 5-file ritual and stale
facts fixed (useGameState ~12,585 lines; suite count now points here, not
hardcoded). Browser-verification gate (Codex pre-checks, JK signs off) and the
Lessons-Learned pending-ratification pen are canon. CURRENT_STATE split into
this live header + CURRENT_STATE_HISTORY.md. Docs/config only — no app code.

Also added + verified: copy-based skill sync (.claude/skills + spec-docs/skills
→ .agents/skills) with a Claude Code PostToolUse hook (stdin/jq) — auto-fire and
delete-propagation both verified live; codex-ideation skill (Claude consults
Codex CLI as a READ-ONLY peer reviewer; round-trip + resume loop verified;
sandbox pinned read-only on all paths). Codex CLI installed (codex-cli 0.139.0,
~/.local/bin/codex).

## NEXT NON-PRODUCT BUILD (queued, next thread) — opus-audit wrapper

**Goal:** an `opus-audit` wrapper (sibling to codex-ideation) that lets a Claude
Code session INVOKE Opus 4.8 as the read-only auditor of a Codex build and
capture its verdict WITHOUT JK relaying text by hand. Opus stands in because
Fable is currently unavailable; if Fable returns, update the wrapper to target
it. Triangle preserved: auditor (Opus) ≠ builder (Codex); neither self-audits.

**PRE-BUILD UNKNOWN to resolve first (do not assume):** how is Opus 4.8
invokable as a CLI on this machine? codex-ideation works because a `codex`
binary exists; verify the equivalent entry point for Opus (likely the `claude`
CLI in a fresh non-Captain session, or another binary) BEFORE building. Same
diligence that caught the codex-install gap.

**JK RULING 2026-06-14 — risk-scoped audit automation (this is the wrapper's
contract):** Autonomous build↔audit↔fix loops ARE permitted, BUT the loop must
HALT and surface to JK (not auto-proceed) whenever a change touches ANY of:
(a) specs / gospel / design decisions; (b) user-visible behavior (anything that
changes what a player sees or how the app behaves); (c) persistence or data
integrity (storage, migrations, schema, saved-game shape); (d) the
SMB4-asset-protected systems (mojo, fitness, chemistry, fame, clutch, narrative,
etc. — the existing approval-gated list in SESSION_RULES); (e) anything the
auditor flags as a judgment call rather than a mechanical fix. BELOW that line
(internal refactors, test/type fixes, dead-code removal, wiring bugs with no
behavior change) the Codex↔Opus loop runs to verified-complete and JK sees the
RESULT once, not the chain. Rationale: the decorrelated two-AI loop does the
engineering verification; JK's irreplaceable judgment is classifying when an
"engineering fix" has crossed into a DESIGN/behavior decision — so the loop must
stop AT that boundary, not barrel through it. This maps onto the existing
risk-tiering (very-high reasoning for engine/state; medium for scoped fixes).
Weak point to engineer carefully: the auditor's self-classification must be
STRICT about calling behavior/spec touches → halt; over-halting is the safe
direction, under-halting is a bug to fix immediately. Watch the first loops
closely before trusting unattended. "Verified complete" still ≠ "JK approved" —
JK's browser pass remains the close even for low-risk auto-loops.

**Also queued for that thread:** add the risk-scoped rule above to
SESSION_RULES.md as a ratified non-negotiable (JK already ruled it 2026-06-14;
write it in on build).
