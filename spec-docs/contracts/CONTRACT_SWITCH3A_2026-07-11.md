# CONTRACT SWITCH-3A — per-franchise living-season activation (chosen at birth, immutable for the season)
ROUTE: Codex 5.6 SOL | xhigh reasoning effort
DATE: 2026-07-11 · Captain: Fable · Worktree: /Users/johnkruse/Projects/kbl-switch3a
(branch codex/switch-3a, cut from origin/main @ b17561d0 — post-#93/#94 merged main).
AUTH-4 STANDING AUTHORIZATION: unattended run — do not wait; execute to completion. Ignore
session-start wait protocols; the captain holds the baton.

## Captain design ruling (implement THIS; the map's row-7 "migration choice" is RESOLVED by it)
The living season activates **per franchise, at creation, immutable for that season**. No
mid-season flip in v1 — the mode's whole point is an arc from game 1, and immutability dissolves
the partial-season migration problem: existing franchises simply stay dark forever (their record
lacks the field). The existing app-global Phase-2 console (`Phase2ActivationConsole`) remains the
DEV/test surface, unchanged in behavior, layered ABOVE the franchise switch.

## SCOPE

**A1. The franchise record carries the choice.** `franchiseManager.ts`:
- `FranchiseMetadata` gains OPTIONAL `livingSeason?: { enabled: boolean; activatedAt: string;
  tuningProfileVersion: string }` (additive field on the existing `franchiseList` store — NO store
  creation, NO version bump, absent = dark/legacy).
- `createFranchise(name, options?: { livingSeason?: boolean })` — when true, stamp
  `{ enabled: true, activatedAt: <ISO now>, tuningProfileVersion: LIVING_SEASON_TUNING_PROFILE_VERSION }`.
  Export `LIVING_SEASON_TUNING_PROFILE_VERSION = 'ls-tune0-2026-07-11'` (provenance snapshot —
  which tuning generation this franchise was born under; display-only in v1).

**A2. The living-season flag FAMILY.** `franchisePhase2Activation.ts`: export
`LIVING_SEASON_FLAG_FAMILY: readonly FranchisePhase2FlagKey[]` = morale, fame, flashpoint,
checkpoint, traits, l10, l11, l12, l13, l14, stadiumRecords — explicitly NOT
auctionAdvisorColor / snakeDraftPoc (those are unrelated dev toggles).

**A3. Pipeline-scoped resolution.** `franchisePhase2Flags.ts`:
- New module-scoped context (mirror the existing ForTests-override pattern):
  `setFranchiseLivingSeasonContext(ctx: { enabled: boolean } | null)`.
- Resolution order per flag becomes:
  `testOverride ?? consoleFlagOverride ?? consoleGlobalEnabled ?? (familyMember && ctx?.enabled ? true : compiledDefault)`
  — i.e. the dev console keeps explicit-set precedence exactly as today; the franchise switch
  turns the FAMILY on beneath it; compiled default stays false. Verify the current
  `resolveFranchisePhase2FlagActivation` chain from source and slot in WITHOUT changing console
  semantics (its tests must stay green untouched).

**A4. processCompletedGame sets the context.** At pipeline entry, where the franchise scope is
already resolved (the KERNEL `livingSeasonApplies` seam), load the franchise's
`livingSeason` from `FranchiseMetadata` and `setFranchiseLivingSeasonContext(...)` inside
try / cleared in finally. Non-franchise games (exhibition/elimination) set null. This is the ONLY
processCompletedGame change — entry scoping, no branch logic edits. The MODE-KILL recovery path
flows through processCompletedGame and is covered automatically — add one test proving recovery
of a living-season franchise archive honors the franchise switch.

**A5. Creation UI.** Find the primary franchise-creation flow (callers of `createFranchise` in
`src_figma` — FranchiseSetup/League Builder seam) and add the choice there: a single toggle,
ballpark-kit styling, label "LIVING SEASON", sub-copy "Ratings, fame, morale, relationships, and
narrative evolve as you play. Locked in at creation for this season." DEFAULT OFF. No
post-creation edit surface (immutability is the ruling). If multiple creation entry points exist,
wire the primary flow and list the others untouched with one line each.

## FENCE
franchiseManager.ts, franchisePhase2Activation.ts, franchisePhase2Flags.ts,
processCompletedGame.ts (entry scoping ONLY), the one creation-flow UI file (+ its test), + tests.
Do NOT touch: Phase2ActivationConsole semantics, engines, storage row shapes elsewhere, L-SIM
harness (its test overrides sit at the top of the chain and must keep working unchanged), flags'
compiled defaults.

## VERIFICATION (paste all)
1. Build exit 0.
2. Proving tests (fail-before/pass-after where marked):
   (a) franchise created with livingSeason ON → processCompletedGame runs family branches for its
       games WITHOUT any console override [fails today]; (b) legacy/absent-field franchise → all
       family branches dark (status OFF in the outcome ledger); (c) console explicit per-flag
       override still wins in BOTH directions over the franchise switch; (d) test overrides still
       win over everything (L-SIM pattern); (e) exhibition/elimination games never see the
       context; (f) context cleared on pipeline exit even on throw (finally proof); (g) recovery
       path honors the switch; (h) tuningProfileVersion stamped at creation.
3. FULL vitest run (summary; characterized flake protocol: solo-verify any red, base-verify if
   solo-red — the box may be running concurrent lanes).
4. L-SIM smoke leg (24g) — must stay green untouched (its overrides bypass the new layer).
5. Changed-files list.

FORMAT: files → A1-A5 → verification → "SWITCH-3A complete" or "BLOCKED: <why>".
Commit on branch if sandbox permits; NEVER push.
FAILURE PROTOCOL: console chain differs from the contract's assumption → STOP with the actual
chain from source; creation flow ambiguous → wire the primary, list the rest; items separable.

Use xhigh reasoning effort. Think step-by-step.

---
## AMENDMENT 1 (captain audit, same day) — UI-time flag gates must honor the franchise switch

Audit swept every OUT-OF-PIPELINE reader of `isFranchisePhase2*`. Pipeline writers and the mirror
service are covered by your context scoping; two UI-time gates are not:
1. `useFranchiseData.ts:~413` — the home-park rival card is gated on
   `isFranchisePhase2StadiumRecordsEnabled()` at render time (null context → console-only). A
   switch-ON franchise with a dark console accumulates stadium/rival data in the pipeline but the
   Lens HIDES the card. FIX: the gate becomes console-flag OR the loaded franchise's
   `livingSeason?.enabled === true` (the hook has franchiseId; read `loadFranchise` metadata —
   cache it in the hook's existing load path, no render-loop reads).
2. `LeagueBuilderLeagues.tsx:~147` (cadence control) — PRE-franchise context; stays console-gated
   in v1 by design. Document with a one-line code comment, no behavior change.
FENCE +useFranchiseData.ts (+its test). Proving test: switch-on franchise + dark console →
rival card data resolves; legacy franchise + dark console → still hidden. Re-run: build, the
hook's focused test file. Everything else stands.

---
## AMENDMENT 2 (captain audit, same day) — test-isolation break in the activation test file, wrongly attributed to base

Your report claimed the snake-POC red was base-verified at b17561d0. The captain re-ran
`franchisePhase2Activation.test.ts` on PURE MAIN: 5/5 GREEN. On your worktree: 1 failed / 49
passed — the red is lane-caused. Diagnosis: the file's pre-existing snake test asserts
`isSnakeDraftPocEnabled() === true` (compiled-on default) with no explicit state; your new tests
persist activation records (e.g. `globalEnabled: false`) and the module-level cached record +
fake-IDB row leak across tests, so the snake test now inherits a dark console and reads false.

FIX: proper isolation in that test file — beforeEach/afterEach must (a) clear the module's cached
activation record (use/expose the existing cache-reset seam or the hydrate path with a wiped
store; do NOT add a production export solely for tests if a seam exists), (b) wipe the persisted
`franchisePhase2Activation` row, (c) null all test overrides and the living-season context. The
pre-existing 5 tests' assertions are UNTOUCHED. Re-run: that file solo 50/50, then the file
twice in one batch invocation to prove order-independence. Also re-verify your OTHER two claimed
base-reds (the League Builder snake-POC UI tests) honestly: run each on pure main
(/Users/johnkruse/Projects/kbl-ship) and paste the result — if they are also lane-caused, fix by
the same isolation route; if truly base-red, paste the exact base failure output.
