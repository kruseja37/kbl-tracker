# CONTRACT KERNEL-TRUTH-1 — the completion-pipeline truth kernel (8 verified defects → repaired)
ROUTE: Codex 5.6 SOL | xhigh reasoning effort
DATE: 2026-07-11 · Captain: Fable · Repo worktree: /Users/johnkruse/Projects/kbl-kernel (branch codex/living-kernel)

## Authority
JK living-season rulings 2026-07-11 — `spec-docs/OBSERVER_GROUNDWORK_BRIEF_2026-07-11.md` §5 (binding),
§1 broken-truths table (verified findings). Every anchor below was double-survey-verified at main
90c971be, but you MUST re-read each cited file:line yourself before editing — if source disagrees with
an anchor, STOP and report the discrepancy instead of improvising.

## SCOPE — eight repairs, all inside the completion pipeline

**A. Season milestone crossings can actually fire.**
Today season totals are written BEFORE detection, then "previous" and "current" both load from the
already-updated row while detection requires `previous < threshold <= current` — season counting
milestones can never fire. Anchors: `src/utils/seasonAggregator.ts:189-220`,
`src/utils/milestoneAggregator.ts:722-755`, `src/utils/milestoneDetector.ts:746-760`.
Fix: capture the pre-update season totals and feed genuine previous-vs-current into detection.
Additionally: (i) milestone-generated fame events must merge into the game's `fameEvents` BEFORE the
completed-game archive write so archives carry them (`src/utils/processCompletedGame.ts:1503-1515`,
`src/utils/gameStorage.ts:920`); (ii) persist season milestone events through the SAME existing
milestone-event persistence path career milestones use (`src/utils/careerStorage.ts:516-546` pattern).
If no season-kind persistence path exists and one cannot be added without a NEW IndexedDB store, STOP
and report (a new store is a captain decision — 5-registry tax).

**B. Fail-closed scope check (JK ruling R9e).**
Regular-season ingestion must REJECT a game whose `seasonId` and `statsScopeId` are both present,
non-empty, and disagree — before any write, with a clear error. Anchor:
`src/utils/processCompletedGame.ts:148` (precedence chain chooses first-available; never validates).
Playoff ingestion already validates (`src/utils/playoffStorage.ts:1392`) — do not touch it. Games
carrying only one identifier keep today's behavior. Prove: mismatch → rejected + zero writes;
match/single-ID → unchanged.

**C. Exhibition exclusion from regular-season aggregation.**
`shouldAggregateToRegularSeasonStats` excludes playoff/elimination but NOT exhibition, so exhibition
games can pollute generic `season-N` stats. Anchors: `src/utils/processCompletedGame.ts:1150-1164`,
`src/src_figma/app/utils/gameTrackerIdentity.ts:113-122`. Fix: exhibition competition type does not
aggregate into regular-season stores. STOP-IF: if the Exhibition Leaders Almanac page
(`src/src_figma/app/pages/ExhibitionLeaders.tsx`) sources its leaderboards from the regular-season
stores this exclusion would empty, STOP and report the dependency instead of breaking it.

**D. Morale→development seam.**
Development sweeps read stale `player.morale`; canonical morale lives in the snapshot store, so changed
player morale never reaches development. Anchors: `src/utils/franchiseCheckpointSweepCompute.ts:445`
(ratings), `src/utils/franchiseTraitGrantCompute.ts:136` (traits),
`src/utils/franchiseMoraleState.ts:419-439` (canonical history/state). Fix: both sweeps read player
morale from the canonical snapshot; `player.morale` becomes fallback only when no snapshot entry
exists. Team-fan morale already reads the snapshot — leave it.

**E. Fame reach-floor ratchet.**
The ordinary fame writer copies the stored floor unchanged, so earned fame never ratchets reach; only
the separate honor path does. Anchors: `src/utils/franchiseFameCompute.ts:121-138` (writer),
`src/engines/fameModel.ts:215` (pure `updateReachFloor`, currently unused by this path),
`src/utils/franchiseHonorReachFloor.ts:28-51` (honor ratchet — leave intact). Fix: the ordinary writer
applies the pure ratchet on every update. INVARIANT: the floor moves UP only, never down (L-SIM soul
invariant expects upward-only fame floor).

**F. Stadium records include the just-completed game.**
The tap discards current `gameState` and reads only already-archived games, but runs BEFORE the current
game is archived — every record is evaluated one game late. Anchors:
`src/utils/franchiseStadiumRecordsTap.ts:28-33`, call site `src/utils/processCompletedGame.ts:1338`,
archive write `:1503`. PREFERRED FIX (falls out of scope item H's archive-early restructure): run the
tap after the core archive write so the current game is naturally in the candidate set. Reruns of the
same game must not double-set records (idempotency by gameId).

**G. Civil-date contract (JK NEW RULING — real dates).**
Games must carry the DEVICE-LOCAL civil date (`YYYY-MM-DD` in the device timezone) stamped at the
moment the result is confirmed, persisted DISTINCTLY from the user-authored schedule `date` string.
Known defect: reporter/date code derives a UTC `YYYY-MM-DD`, which is one day wrong for evening play in
US timezones (`src/src_figma/app/pages/GameTracker.tsx:11622`). Scope: add a `completedCivilDate`
(exact name your choice, but one name used everywhere) to the schedule row AND the completed-game
archive record, stamped on BOTH resolution paths — fully tracked completion and score-only entry
(`src/utils/scheduleStorage.ts:633-706` already stamps `completedAt`/`resultEnteredAt` epoch times —
keep those; the new field is the civil-date projection). Fix the UTC derivation at the GameTracker site
to use the same helper. NO fictional calendar; no new store.

**H. Archive-early + soul-branch outcome ledger — a field, not a store (peer-reviewed design).**
Soul branches catch errors, warn, and continue; the game is then marked aggregated and archived, so
"completed" can silently mean "several living-season writes failed"
(`src/utils/processCompletedGame.ts:1319`, `:1493`). Fix, in the peer-agreed shape:
1. **Archive early.** Write the completed-game archive as soon as core stats/WAR/TrueValue are durable,
   carrying `livingSeasonProcessing: { version: string, overall: 'pending', branches: {} }`.
2. **Run soul branches**, then PATCH the outcome map via ONE read-modify-write helper (whole-record
   sync makes ad-hoc partial writes an overwrite hazard): per branch in {fame, moraleAuto,
   checkpointDev, traits, L10, L11, L12raceAllstar, L13, stadium, trueValueSnapshot} record
   `'OFF' | 'SUCCESS' | 'NO_EVENT' | 'FAILED'` + short bounded error code/message when FAILED (no
   stack traces in the row). `overall` becomes `'complete'` or `'partial-failure'`.
3. **The idempotency exits must consult the map.** The early return at
   `src/utils/processCompletedGame.ts:1274` currently treats any non-incomplete archive as wholly
   finished; it must now treat `overall: 'pending' | 'partial-failure'` as re-processable for the
   failed/unrun branches only (idempotent per branch — a rerun must not double-apply a SUCCESS branch).
   A crash mid-processing now leaves an honest `pending`, never a falsely complete record.
4. Export a small pure reader (`getSoulOutcomes(record)`), no UI work in this contract.
OFF = flag disabled; NO_EVENT = ran, nothing to do; FAILED = branch threw (still caught — core
completion still succeeds, but the truth is durable).

## OUT OF SCOPE / FENCE
- NO new IndexedDB stores, NO trackerDb version bump (the pin test must not change).
- Do NOT touch: `src/src_figma/hooks/useFranchiseLensData.ts`, `FranchiseLensHub.tsx` (MIRROR lane),
  `test-utils/lsim/**` (FIDELITY lane), activation/flag defaults (`franchisePhase2Flags.ts`,
  `franchisePhase2Activation.ts`), career WAR, PITCHING_APPEARANCES, `generateBoxScore`, legacy
  narrator, calendarEngine, franchise-firsts stubs, season-end/finalize machinery (JK deferred R4).
- LLM/news emission wrappers unchanged.

## VERIFICATION (paste all)
1. `NODE_ENV= npm run build` → exit 0 (tail).
2. `NODE_ENV= npx vitest run` — FULL suite (this contract wires into processCompletedGame: partial-mock
   tests may break at load on new imports — fix via test-only mock stubs, list each). Two known
   solo-green batch flakes (LeagueBuilderDraftSetup, franchiseManualSmokeFixture) are baseline; any
   OTHER new red is yours. Read the vitest summary, not the exit code.
3. Proving tests per scope item A-H: each fails on pre-fix behavior, passes after (state which file).
4. L-SIM smoke leg (24g) — compare in-memory/side artifacts only; do NOT regenerate or commit canonical
   baselines. Milestone/fame-floor deltas are EXPECTED (that's the fix working) — paste the before/after
   summary and label expected vs unexpected drift.
5. Changed-files list + the archive-record field additions listed explicitly.

FORMAT: 1. Files changed 2. Per-scope-item (A-H) result 3. Verification pasted 4. "KERNEL-TRUTH-1
complete" OR "BLOCKED: <exact reason>". Commit on branch codex/living-kernel if the sandbox permits;
else clean tree + say so. NEVER push.
FAILURE PROTOCOL: anchor mismatch → STOP + report. Ambiguity → quote this contract + STOP. A product
question this contract doesn't answer → STOP (never improvise). Scope item independently blocked →
finish the others, report the blocked one (partial landing is acceptable for A-H, they are separable).

Use xhigh reasoning effort. Think step-by-step.
