# Draft-Pool Setup — First-Principles Redesign (DESIGN, pending JK sign-off)

> Status: PROPOSED — awaiting JK ruling before build. Branch `codex/draft-pipeline-fix`,
> worktree `/Users/johnkruse/Projects/kbl-draftfix`. Authored from the deep-dive of the 5 spec
> docs + the live code (maps cross-referenced into a gap matrix). This is the engineering
> artifact; the plain-language summary + the decision forks go to JK in chat.

---

## 1. The problem (why JK rejected the current setup)

Building the draft pool today is a pile of patches scattered across three pages with no single home:

- **Players page** — a per-player **Add/Remove** button (`LeagueBuilderPlayers.tsx:922`, handler `toggleActiveLeagueAssignment:643`), a league dropdown, Create Player. **No bulk select, hard 100-row cap (`:294`), one league at a time, no IV column** (OVR shows the letter grade, `:914`). 88+ players = 88+ individual clicks.
- **Leagues page** — a **Register Pool** button (`LeagueBuilderLeagues.tsx:398` → `handleRegisterPool:238`) that computes per-player IV then **throws it away**, showing only a count + cap + surplus flag in a **transient top-of-page banner** (`:323-339`). Plus a per-league **Clear Rosters** (`:413`).
- **Teams page** — a **duplicate Clear Rosters** (`LeagueBuilderTeams.tsx:1014`), different scope, same widget.
- **Hub** — an **MLB DRAFT tile that dead-ends** on the Leagues list (`LeagueBuilder.tsx:216`).

Net: **the IV is computed and discarded** (only `RegisteredPool.players[].iv` survives, surfaced as a number in exactly one transient spot — the single active auction lot, `LeagueBuilderAuctionDraft.tsx:498`); **"who is IN vs OUT" is only legible by scanning each row's button color**; and **there is no guided draft-setup flow** — the user must hop Players → Leagues → (banner) → Draft button across two pages.

**JK's three asks:** (1) bulk add/remove, (2) see IN vs OUT at a glance, (3) register the pool and see every player's IV, then run the draft.

---

## 2. First principles — what a draft pool IS

A **draft pool** is a *league-scoped, lockable set of players*, where each member carries a **computed IV** (the economy anchor they will be auctioned against). Relative to a league a player is in exactly one of three states:

1. **OUT** — exists in the database, not in this league's pool.
2. **IN** — a member of this league's pool, available to draft.
3. **DRAFTED** — won by a team during the auction (post-setup).

Setup is entirely about **OUT ↔ IN**. The pool must hold a **surplus over total MLB slots** (teams × 22), because in the auction a player who draws zero bids leaves the pool **permanently** (`AUCTION_DRAFT_SPEC_V2 §2.2`), so you need more bodies than slots to guarantee every roster fills.

The **lock** is the hinge of the whole pipeline. Per `VISION §2.H`, "the league owns a snapshotted pool of player instances, frozen at lock time." The deep practical reason the lock matters: **the branded teams start the draft EMPTY** (`VISION §1`), and the rostered players on those teams are a *source* of the pool — so **the pool must be snapshotted before the teams are emptied**, or you lose those players. Lock = snapshot = the thing that makes it safe to clear the teams. This is the existing "register-before-clear" safety ordering (`useAuctionDraft.ts:382`), promoted from an implementation detail to a first-class user step.

---

## 3. The reconciled pipeline (where setup sits)

```
League Build ──► [DRAFT SETUP]  ──► Start Draft ──► MLB auction ──► Farm auction ──► Franchise (Mode 2)
                 ├ assemble pool (IN/OUT)          │ empties teams   (existing)       (existing,
                 ├ live per-player IV              │ + routes                           UNTOUCHED)
                 └ LOCK (snapshot + IV freeze)     └ (reuses draftRouting)
```

`DRAFT SETUP` is the new screen. Everything to its right already works and is **reused, not rebuilt**:
`registerLeaguePoolForLeague` (pool + IV), `auctionStateMachine` + `buildAuctionPlayers`/`buildAuctionTeams` (the auction), `draftRouting` (MLB/farm routing), `franchiseInitializer` (Mode-2 handoff). The integration test `draftPipeline.integration.test.ts` proves this whole spine end-to-end and **stays green**.

**Scope note — MLB only.** The pool builder curates the **MLB** pool. The **farm** pool is *generated* (synthetic prospects via `buildFarmAuctionSession`), not curated — there is no curation seam for it. The farm auction auto-generates its prospects at draft time; the setup screen does not touch it.

---

## 4. The design — one "Draft Setup" screen per league

Finally gives a body to the spec's named-but-unspecified **LB-F012 "Draft Setup"** (`LEAGUE_BUILDER_FIGMA_SPEC §1:25` — listed, never designed). Built from the spec's own design language (two-pane shuttle from Roster Manager §10.1; header-with-count; Select-All + "Selected X of Y" from League Editor §5.1; sticky in/out toggle §14.2; search+filter bar; validation footer).

### Layout (two-pane IN/OUT shuttle — recommended shape)

```
┌─ Draft Setup — <League name>  (4 teams · standard tier · 88 MLB slots) ────────────┐
│                                                                                    │
│  ┌─ IN THE POOL (91) ───────────────┐   ┌─ AVAILABLE PLAYERS (349) ──────────────┐ │
│  │ [search] [pos ▼] [sort: IV ▼]    │   │ [search] [pos ▼][grade ▼][team ▼]      │ │
│  │ ─────────────────────────────────│   │ ───────────────────────────────────────│ │
│  │ ☐ Fenomeno   SP  A   $143,641    │   │ ☐ Drake     1B  B+  $101,003           │ │
│  │ ☐ Pastimm    CF  A-  $199,126    │ ◄ │ ☐ Bradwick  C   B   $58,417            │ │
│  │ ☐ ...                    (IV)    │   │ ☐ ...               (grade)             │ │
│  │ ─────────────────────────────────│ ► │ ───────────────────────────────────────│ │
│  │ [Select all] [Remove ►]          │   │ [Select all] [◄ Add]                   │ │
│  └──────────────────────────────────┘   └────────────────────────────────────────┘ │
│                                                                                    │
│  Pool: 91 / 88 MLB slots  ✓ surplus (+3)        [Import from branded teams]         │
│  By position: C 7 · 1B 9 · ... · CP 4                                               │
│                                                                                    │
│  [ 🔒 Lock Pool ]   ← after lock: [ Unlock ]  [ ▶ Start Draft ]                     │
└────────────────────────────────────────────────────────────────────────────────────┘
```

- **Left pane = IN THE POOL** — the league's current pool members, each with a **live per-player IV** (sortable). This is JK's "see every player's IV" requirement, made persistent.
- **Right pane = AVAILABLE PLAYERS** — the whole player database minus what's already in the pool (free agents, rostered players, created players — all appear here, filterable). Shows **letter grade** (cheap, already on the player); IV is computed when a player enters the pool.
- **Bulk shuttle** — multi-select checkboxes + **Select-All-filtered** + **◄ Add / Remove ►**. Filter the AVAILABLE pane (position / grade / team / name) then Select-All to add in one action. Solves "bulk, not one-at-a-time."
- **At-a-glance IN vs OUT** — the two panes themselves, with live header counts. Solves complaint #2 directly.
- **Import from branded teams** — one-click seed of the pool from the union of the league's team rosters (pool mode **a**). Default behavior on first open (see fork Q2).
- **Sufficiency indicator** — `Pool 91 / 88 slots ✓ surplus (+3)`; turns to a hard block if under the floor, a soft warning if very over (long auction). Reuses/repaths the existing `poolSurplusWarning`.

### The two write paths (both EXISTING, just bulk-driven)

- **Add to pool** = append `{ leagueId, teamId:'', rosterStatus:'FREE_AGENT' }` to `player.leagueAssignments` (exactly what `toggleActiveLeagueAssignment` does today, `:649-654`) — driven in bulk.
- **Remove from pool** = filter that assignment out (same handler's other branch).
- **Live IV** = `calculateIvBaseSalary(toSalaryPlayer(player)).ivBase` computed once when a player enters the pool, cached on the in-pane row (incremental, not a 440-player rescan).

### The three actions

1. **Build** (ongoing) — shuttle players in/out; IV shows live in the IN pane.
2. **Lock Pool** (commit) — calls `registerLeaguePoolForLeague(leagueId)` (authoritative IV recompute + persist of the `RegisteredPool` snapshot + surplus check), then sets `locked=true` + `lockedAt`. After lock the panes go read-only; **Unlock** re-opens; **Start Draft** enables. *The "Register Pool" engine call survives here — its IV output is now actually displayed, not discarded.*
3. **Start Draft** — preserves register-before-clear order: pool is already snapshotted (locked) → **clear the league's team rosters** (`clearTeamRoster`, empties the teams) → route to the MLB auction (`draftRouting`). The auction → farm → franchise spine is unchanged.

---

## 5. Data model — exactly ONE additive change

| Concept | Where it lives today | Change |
|---|---|---|
| Pool membership | `player.leagueAssignments[]` (derived scan by `leagueId`) | **none** — reuse the existing write |
| Priced pool + IV | `RegisteredPool { leagueId, tier, players:[{id,iv,salary}], tierCap, … }` in store `registeredPools` (keyed `leagueId`) | **none** — reuse `registerLeaguePoolForLeague` + `saveRegisteredPool` |
| **Lock state** | **nowhere** (no `locked`/`status` on `LeagueTemplate`, `RegisteredPool`, or `Player`) | **ADD `locked?: boolean` + `lockedAt?: number` to `RegisteredPool`** (type in `leagueConstruction.ts`) |

**No DB-version bump.** League Builder is its own DB `kbl-league-builder` (v8), separate from `kbl-tracker` (v25). Adding a *field* to an existing record type is schemaless at the record level — **no store add, no version bump.** `saveRegisteredPool` persists the object as-is. `TRACKER_DB_VERSION` is not touched.

**Cross-branch overlap file respected.** `leagueBuilderStorage.ts` (additive-only) is **not reshaped**. The lock field lands on the `RegisteredPool` type in `leagueConstruction.ts` (additive). Any new helper (e.g. bulk "import from rostered teams") goes in a **new file** (e.g. `leagueBuilderPoolBuilder.ts`) so the overlap file stays untouched, or is composed from existing `savePlayer` writes.

**Instance snapshot (`VISION §2.H`) — v1 interpretation.** Full base-player→instance materialization is *not* built (the spec leaves keying undefined; the base `Player` stays the canonical record). The v1 lock satisfies the snapshot intent minimally: at lock, the `RegisteredPool` freezes **membership + per-player IV** (the league-scoped economy fields), and `locked` guarantees that frozen set is what the auction consumes. Deeper instance materialization is deferred.

---

## 6. What gets REMOVED (the cleanup — after the new flow supersedes it)

| Obsolete patch | Location | Disposition |
|---|---|---|
| Per-player Add/Remove button | `LeagueBuilderPlayers.tsx:922-934`, `toggleActiveLeagueAssignment:643` | **Delete** — pool membership moves entirely to Draft Setup; Players page reverts to pure DB management (create/edit/delete/generate). **The league-scoping `<select>` is KEPT** — `activeLeagueId` still drives the Players-page team filter, `getActiveAssignment`, and the team column; do NOT remove it in a later cleanup pass. |
| Register Pool button + transient banner | `LeagueBuilderLeagues.tsx:323-339, 398-410` | **Delete** — registration becomes the Lock step in Draft Setup; the IV table replaces the banner |
| Clear Rosters (Leagues page) | `LeagueBuilderLeagues.tsx:413-423` | **Delete** — emptying teams is now automatic inside Start Draft |
| Clear Rosters (Teams page, duplicate) | `LeagueBuilderTeams.tsx:1014-1023` | **Delete** — duplicate of the above |
| MLB DRAFT dead-end tile | `LeagueBuilder.tsx:216-223` | **Repurpose** — becomes the entry to Draft Setup |
| Leagues-page per-league "Draft" button | `LeagueBuilderLeagues.tsx:426-433` | **Repath** — now opens Draft Setup (not straight to the auction) |

`clearTeamRoster` (the storage fn) is **kept** — it's still called, just internally by Start Draft instead of by a user button. `draftRouting` is **kept** (called from Start Draft). Self-redirect routing hacks in the draft pages will be reviewed and simplified only if it's clean to do so (flagged, not force-ripped).

---

## 7. Reuse surface (do NOT rebuild — the seams the new screen drives)

- `registerLeaguePoolForLeague(leagueId)` → `RegisteredPool` — `leagueBuilderPoolRegistration.ts:84`. The pool+IV seam; called by Lock.
- `calculateIvBaseSalary(PlayerForSalary)` → `{ivBase}` — `salaryCalculator.ts:741`. Needs the full Player; compute once per pool entry.
- `auctionStateMachine.initAuctionSession` — `auctionStateMachine.ts:123`. **Hard guard: non-finite IV throws** — Lock's authoritative re-register is what guarantees every entry has a finite IV before the auction.
- `buildAuctionPlayers` / `buildAuctionTeams` — `leagueBuilderAuctionPipeline.ts:50,64`.
- `draftRouting(league.draftFormat)` — `draftRouting.ts:6`. Called by Start Draft.
- `clearTeamRoster(teamId, leagueId)` — `leagueBuilderStorage.ts:1504`. Called by Start Draft (after lock).
- `initializeFranchise(config)` — `franchiseInitializer.ts:606`. **Untouched** (Phase-2 freeze/handoff de-scoped, already works).

---

## 8. Test plan — keep green + extend

`draftPipeline.integration.test.ts` (89-player pool, 88 MLB sold, 40 farm, 128 franchise players, two-run determinism) **stays green**. Extend it to prove the new flow at the logic level:

- Replace the hand-curation (`assignPlayerToLeague`/`removePlayerFromLeague` locals) with the **bulk pool-builder seam**; assert the resulting `registerLeaguePoolForLeague` output is **identical** (same 89 ids, same exclusions) — anchors new code to the proven contract.
- **Lock assertions (net-new):** after Lock, `RegisteredPool.locked === true` + a stamped `lockedAt`; post-lock add/remove is **rejected** (pool unchanged); the auction consumes the **locked snapshot** (re-assert 88-SOLD / removed-player-absent).
- **Determinism:** wrap the new path in the same two-run deep-equal guard; pin any new timestamp to the mocked `Date.now`.

---

## 9. Guardrails honored

- Branch-only on `codex/draft-pipeline-fix`; never push.
- **No DB-version bump** (additive field only). If anything forces a store add → STOP and flag.
- **No Phase-2 freeze touch** — the redesign is entirely upstream of `initializeFranchise`. ("Lock the pool" at setup ≠ the draft-end "freeze" that seeds Mode 2 — distinct concepts, distinct moments.)
- Frozen artifacts (`playerDatabase.ts`, `iv_oracle.json`) untouched; IV math not perturbed (determinism guard would flake otherwise).
- `leagueBuilderStorage.ts` additive-only; new helpers in a new file.
- Zero-new-reds; the one characterized hard fail on this lineage is `wpaRuntimeBoundary`; re-run any suspected new red SOLO.

---

## 10. FORKS — RATIFIED BY JK 2026-06-25

1. **Screen shape** → ✅ **two-pane IN/OUT shuttle.**
2. **How the pool starts** → ✅ **auto-import from the branded teams' rosters on first open** (then adjust).
3. **Lock behavior** → ✅ **a real, reversible lock** (freezes membership + IV; Unlock until Start Draft; what makes emptying the teams safe).
4. **Pool-size safety** → ✅ **block Start Draft below the slot floor, warn when very over.**
5. (Default, accepted) **IV detail** — single IV dollar number per player, sortable (the per-layer breakdown is currently discarded; a future inspector).
6. (Default, accepted) **Farm** — out of this screen; the farm draft auto-generates prospects.
7. (Default, accepted) **Stadium-by-name bug** — adjacent setup-layer bug, **separate ticket**, not folded in.

---

## 11. Build sequencing (build-right → swap → clean)

1. Add `locked`/`lockedAt` to `RegisteredPool` (additive).
2. Build the **Draft Setup** screen (route + page) composing the existing seams; wire Lock (register + snapshot) and Start Draft (clear + route).
3. Repoint the hub tile + Leagues "Draft" button to Draft Setup.
4. **Swap** — verify the new flow drives the full pipeline (extend the integration test; manual/browser check on JK's real data at :5173).
5. **Clean** — delete the obsolete patches (§6) once the new flow supersedes them, without breaking the auction→franchise pipeline.
6. Gate: `npm run build` exit 0 + `vitest run` zero-new-reds (read the summary, not the RC).

---

## 12. BUILD STATUS — DONE (2026-06-25), pending JK manual sign-off

**Built (all on `codex/draft-pipeline-fix`):**
- Data model: `RegisteredPool.locked?`/`lockedAt?` (additive, `leagueConstruction.ts`) — no DB bump.
- Logic seam: `src/utils/leagueBuilderPoolBuilder.ts` — `addPlayersToLeaguePool`, `removePlayersFromLeaguePool`, `importRosteredPlayersToLeaguePool`, `lockLeaguePool`/`unlockLeaguePool` (lock enforced at the data layer via `assertPoolUnlocked`), `evaluatePoolSufficiency`, `computePlayerIv`, `isPlayerInLeaguePool`. New file → `leagueBuilderStorage.ts` untouched.
- Screen: `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx` (route `/league-builder/draft-setup`) — two-pane IN/OUT shuttle, bulk add/remove, live IV (sorted), auto-import from branded teams, sufficiency badge, Lock/Unlock/Start Draft. Matches the live retro theme.
- Handoff: `useAuctionDraft.initAuction` prefers the locked pool snapshot.
- Repointed: hub MLB DRAFT tile + Leagues "Draft" button → Draft Setup.
- Cleanup (§6): removed the per-player Add/Remove (Players), Register Pool + transient banner + Clear Rosters (Leagues), duplicate Clear Rosters (Teams). Storage fns (`clearTeamRoster`, `registerLeaguePool`) kept — still called by the auction.
- Tests: extended `draftPipeline.integration.test.ts` (new lock test: import→89 parity, lock persist+stamp, lock enforced, unlock); updated 3 characterized page tests to the new behavior.

**Gate evidence:**
- `tsc -b` + `vite build` → exit 0.
- Full `vitest run` → 8205 passed / 1 failed; the 1 fail is the pre-existing characterized `wpaRuntimeBoundary` ("direct committed WPA field materialization stays allowlisted"), confirmed failing SOLO and unrelated to this change. **Zero new reds.**
- Live preview (isolated 5199 origin, JK's 5173 data untouched): verified render + auto-import (88) + live IV (matches audited values, e.g. Fenomeno $143,641) + bulk add (88→89) + remove (89→88) + sufficiency live-update + Lock (read-only, badge) + Unlock + Start Draft → auction OPEN_BIDDING off the locked pool; all 3 cleaned pages render with the obsolete affordances gone.

**Independent audit (builder≠auditor, multi-lens adversarial) + fixes:**
The audit found a HIGH defect my live test had masked: pool membership had TWO sources that diverged — the UI defined "in the pool" by league-assignment, but lock/registration ALSO unions the league's team rosters. Consequences: rostered players could show as OUT yet be swept into the lock, and — reproduced live — **removing a rostered player did not stick** (the roster-union re-added it at lock). Fixes (kept the shared registration seam + the auction/snake fallbacks intact):
- **Reliable auto-import:** on open, reconcile EVERY rostered player into a league assignment (idempotent; not gated on an empty pool; retries on failure) — so the pool the user sees equals the pool the lock freezes.
- **Authoritative remove:** `removePlayersFromLeaguePool` now also pulls the player off the league's team rosters, so the registration roster-union can't re-add a removed player.
- **Select-All:** selects the full filtered set (not the rendered-500 cap).
- **Tests:** added a rostered-player-remove assertion (pool 89→88, stays out) + a locked-snapshot→`buildAuctionPlayers` feed assertion; removed a dead page→util re-export (test repointed to `draftRouting`).
- Deferred (LOW, hypothetical): non-finite IV guard at lock — no real code path produces a NaN rating; the auction's existing guard + the new finite-IV test assertion cover it.

**Re-verification after fixes:** build exit 0; full suite 8205 passed / 1 failed (only the pre-existing `wpaRuntimeBoundary`); integration test green (incl. the new rostered-remove + locked-feed proofs); **live DB-level confirmation** on a 30-team MLB league — auto-import reconciled all 660 rostered players, removing a rostered player held through the lock (locked snapshot = 659, not 660), and the sufficiency gate flipped to "need 1 more" / blocked Start.

**Remaining:** commit (branch-only) → JK manual sign-off on real data. (Minor note: auto-import on a 30-team league reconciles ~660 players on first open — a few seconds; negligible for typical small leagues.)

---

## 13. FEEDBACK ROUND (JK, 2026-06-25) — 5 commits, all branch-only on codex/draft-pipeline-fix

| # | Item | Commit | Status |
|---|---|---|---|
| 1 | Draft Setup position filter: drop DH (0 players), add SP/RP (~59) | 2e149303 | done |
| 2 | Players-page menus: scrub DH + TWO-WAY (DH = lineup slot; TWO-WAY = trait) | 7b4777f1 | done |
| 3 | **Option B** — MLB team budget scales with the actual pool (was a fixed per-tier cap). `cap = max(maxIV/starBudgetShare, meanIV×22) × tierShift`; reproduces the published caps within ~0.1% on the stock pool, drops when stars are removed. Demo'd live: 88-pool $1,139,268 → minus top-5 $999,771 (−12%). | 60392efc | done |
| 4 | **SP/RP swingmen can start** — rotation backfill when pure SP < 5 (default bullpen); + fixed depth-chart bug (swingmen were filed at DH). | 2d47be68 | done |
| 5 | **Edit a player from Draft Setup** (AUTH-4: Codex built, Opus audited) — focus panel + edit modal; value + canonical grade (scoreSmb4Player) recompute live from ratings; Save persists the derived grade. | 1550e4a1 | done |

**Diagnosis (not a code change):** the "lots of DH players" JK saw is STALE browser data — the current seed produces ZERO DH (convertPlayer only rewrites pitchers, never to DH; the former Yankees DH is now LF). A re-import on the real server clears it.

**OPEN-DECISIONS for JK:**
- (Edit feature) Editing an IN-POOL player while the pool is LOCKED moves the live IV but not the frozen auction snapshot → divergence. Block edit when locked, or auto-re-register on save? (Defaulted to: editing allowed; flagged.)
- (Option B) The cap tracks the pool MEAN IV (the binding roster-branch). Removing a few of 88 moves it modestly; a genuinely weaker/stronger pool moves it more. If JK wants the very top end weighted more heavily, switch the roster-branch toward a sum-of-top-rosterable formula (tunable).
- (SP/RP) Rotation target hardcoded to a 5-man staff for the backfill; confirm.

**Gate (cumulative):** build exit 0; full suite zero-new-reds (only the pre-existing `wpaRuntimeBoundary` characterized red + the `franchiseManualSmokeFixture`/`franchiseOffseasonGuards` order-flakes, all confirmed solo-passing).
