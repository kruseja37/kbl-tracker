# CONTRACT UNIFYSETUP — one setup screen, two thin format adapters (JK directive)
Captain: Fable · Builder: Codex gpt-5.6-sol xhigh · Branch: codex/unifysetup
Base: github/main @ 8f6c215a (post ROOMFIX PR #90).

## JK'S DIRECTIVE (2026-07-11, verbatim intent)
The snake draft's league/player setup must feel EXACTLY like the auction's: choose team
archetypes, move players between the database and the draft pool while seeing IV in
dollars (swap similar-cost players), click any player for the full profile (ratings,
traits, positions, handedness, age, personality), AND set up draft boards/strategy
before entering. Sync the wiring and UI; logic sound from the user's perspective.

## THE RULED DESIGN (captain + 5.6 adversarial round — build exactly this)
Unify on /league-builder/draft-setup as ONE shared setup pipeline with two thin format
adapters — not auction-plus-a-bolted-on-card:
- league.draftFormat (set at league creation) decides the adapter. ONE format-matched
  start button renders (ENTER AUCTION DRAFT / ENTER SNAKE DRAFT). NO format switcher on
  the setup page (format changes stay in League settings; out of scope here).
- AUCTION ADAPTER: today's render + handler path BYTE-BEHAVIOR-IDENTICAL. The
  characterized LeagueBuilderDraftSetup suites are the regression firewall. Auction-only
  concepts (shills, reserve pricing, price-freeze copy) render ONLY under this adapter.
- SNAKE ADAPTER adds format-gated panels (extract components; keep the page lean):
  1. VERSIONS: one-per-human pickers, chosen BEFORE lock. Strict order law:
     versions → pool lock → seating proof on the LOCKED ids → GO. After lock,
     version/pool changes require unlock (the existing unlock affordance).
  2. CLUBS extras: GM name + hotseat-vs-companion declaration per club (alongside the
     existing archetype selection).
  3. ORDER: seeded shuffle w/ visible seed, tap-two-swap, snake preview + endpoint
     back-to-backs (port from SnakeDraftSetup).
  4. READINESS: the archetype-honest SIMULTANEOUS seating proof is the GO gate —
     pass each club's capIdentity derived from its CHOSEN archetype into
     proveSimultaneousSnakeSeating (today's snake setup runs it archetype-blind — a
     pool can read READY under balanced tax yet be unaffordable under the locked
     archetypes; close that gap). Render its verdict/shortfalls in the existing
     readiness-reasons surface. Auction readiness unchanged under the auction adapter.
  5. ENTER SNAKE DRAFT (GO): registration/order law from ROOMFIX — lift
     registerPickedSnakePool WHOLESALE (SnakeDraftSetup.tsx:139-153; keep registration
     AHEAD of session creation for the no-orphan guarantee); then snapshot the setup
     rankings into per-seat seatBoards (flush any debounced ranking writes first;
     convert each snake club's saved rankings into its initial seatBoards record —
     the room's desk remains the live editor); write the EXISTING snakeSetup shape
     (unchanged — the room contract must not move); route to /snake-room?leagueId=….
- FROZEN ECONOMIC TRUTH: everywhere the snake adapter prices or proves, it reads the
  LOCKED RegisteredPool IVs — never recomputes from the live player database.
- PROFILE PARITY (JK's "exactly"): the pool-shuttle rows currently open a slimmer
  panel missing personality/chemistry (LeagueBuilderDraftSetup.tsx:~4922 area) — make
  every player row open the FULL profile popover, both adapters (this is the one
  shared-surface change that touches the auction path; it is additive display parity —
  the characterized suites must stay green; if a suite pins the slim panel, STOP and
  report rather than reword fixtures).
- RETIREMENT: /snake-setup redirects to /league-builder/draft-setup preserving
  leagueId. The SnakeDraftSetup page is deleted after its tests migrate; the ROOMFIX
  repro/crawl (SnakeDraftRoom.registration.integration.test.tsx) MUST be migrated to
  drive the UNIFIED flow with the same end-to-end assertions (setup → START → room
  mounts → desk populated → guide answer → first pick through the ritual) — that test
  is the permanent guard for this pipeline.

## LAWS
Auction byte-behavior identity under the auction adapter (suites = firewall; the ONLY
sanctioned shared-surface change is profile parity above) · adapter-reuse (canonical
pool helpers only; lift ROOMFIX's adapter, don't rewrite) · the snakeSetup record and
seatBoards shapes are FROZEN contracts to the room · copy law (14-year-old readable;
setup explanations behind Help where the auction already does that) · no percentages ·
engines done (the archetype-honest proof consumes the EXISTING engine — capIdentity is
an input, not new math; gaps = STOP) · reducer/room internals untouched except test
migration · UNKNOWN = STOP.

## TESTS (spec-first)
Migrated ROOMFIX crawl through the unified flow (the make-or-break) · format adapters:
auction league renders zero snake panels + the auction start; snake league renders the
panels + ENTER SNAKE DRAFT and no shill/reserve copy · strict order law (version change
after lock requires unlock; proof runs on locked ids) · archetype-honest proof: a pool
that passes balanced but fails under a heavy-tax archetype set must gate GO (construct
the fixture) · rankings→seatBoards snapshot (a hand-touched setup ranking lands as the
room's initial board; debounce flushed) · frozen-IV (locked pool IV disagrees with a
mutated live player → the snake adapter uses the locked value) · profile parity (a
pool-shuttle row opens the full popover incl. personality) · /snake-setup redirect
preserves leagueId · auction suites untouched and green.

## GATES (real output)
1. tsc clean. 2. build exit 0. 3. Migrated crawl + owned + snake suites green.
4. THE FULL LeagueBuilderDraftSetup characterized set + all auction suites green.
5. ONE full vitest (known solo-flakes verify solo).

## PROTOCOL
No git write commands. Spec-first. STOPs: any characterized auction fixture that pins
the slim profile panel; any need to change snakeSetup/seatBoards shapes; any engine
gap. Builder report appended here: file:line map, gate outputs, copy inventory,
auditor attack list.

---

## BUILDER REPORT — BLOCKED AT PRE-CHANGE FIREWALL (2026-07-11)

**Verdict:** BLOCKED. No production code or test files were changed. The required
pre-change `LeagueBuilderDraftSetup` firewall is red in a solo-file rerun on a
failure that is not named in the current characterized-flake list. Per
`UNKNOWN = STOP`, implementation did not begin and no fixture/assertion was
changed to make the firewall convenient.

### File:line map

- No implementation changes.
- Failure seam: `src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.testUtils.ts:327-330`
  (`waitForExtractableOption` times out because the requested option never
  becomes available within 12 seconds).
- This report is the only tracked-file change.

### Pre-change firewall output

Command:

```text
NODE_ENV= npx vitest run --silent=passed-only \
  src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.setup.test.tsx \
  src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.money.test.tsx \
  src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.poolLock.test.tsx \
  src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.board.test.tsx \
  src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.universe.test.tsx \
  src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.RankYourBoardZone.test.tsx
```

Real summary:

```text
Test Files  1 failed | 5 passed (6)
Tests       1 failed | 108 passed (109)
FAIL LeagueBuilderDraftSetup.poolLock.test.tsx
  reroll advances the deterministic generation nonce without converting roster priority into hard keeps
AssertionError: expected undefined to be defined
at LeagueBuilderDraftSetup.testUtils.ts:329
```

Required solo rerun:

```text
NODE_ENV= npx vitest run --silent=passed-only \
  src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.poolLock.test.tsx
```

Real summary:

```text
Test Files  1 failed (1)
Tests       1 failed | 20 passed (21)
FAIL LeagueBuilderDraftSetup.poolLock.test.tsx
  quality-center changes preserve user-added hard keeps and manual exclusions
AssertionError: expected undefined to be defined
at LeagueBuilderDraftSetup.testUtils.ts:329
```

The failure moved between two tests across the combined and solo-file runs,
but the solo-file result is still red and this exact file/test condition is not
listed among the current characterized solo-green flakes. That makes the
auction behavior baseline unknown rather than a green firewall.

### Gates 1-5

Not run. The contract requires the characterized firewall early and mandates a
STOP on UNKNOWN. Running implementation gates after a red pre-change firewall
would erase the ability to attribute later failures.

### Copy inventory

None. No UI copy was added, removed, or changed.

### Auditor attack list

1. Reproduce the pre-change `LeagueBuilderDraftSetup.poolLock.test.tsx` timeout
   from base `8f6c215a` / contract-only HEAD `dfe8faca` with no product diff.
2. Determine whether the moving timeout is an accepted new characterized flake
   or a real baseline regression in pool regeneration/option availability.
3. If ruled a flake, ratify the exact solo verification protocol before
   re-dispatching UNIFYSETUP; do not weaken assertions or pin a convenient
   fixture as part of this lane.
4. Re-run the full six-file firewall green before allowing any UNIFYSETUP code
   change.

---

## AMENDMENT 1 (captain ruling on the firewall STOP, 2026-07-11)
The STOP is upheld and the cause is identified: the machine is concurrently running
three other xhigh Codex lanes (other threads). Under that load the
LeagueBuilderDraftSetup family times out non-deterministically EVEN SOLO — the captain
re-ran poolLock twice on the untouched base: run 1 fully GREEN 21/21 (proving no
baseline regression), run 2 red on two DIFFERENT tests. Moving failures + intermittent
full greens under load = contention flake, not a regression.

RATIFIED FIREWALL PROTOCOL (this lane, this environment):
1. A PRE-EXISTING characterized file (the LeagueBuilderDraftSetup family,
   franchiseManualSmokeFixture, franchiseOffseasonGuards async family) counts GREEN if
   ANY of up to 3 solo attempts passes the file fully. Record every attempt's real
   output.
2. This grace applies ONLY to those pre-existing files — NEVER to tests you write or
   migrate in this lane; yours must be deterministically green (design them with
   generous waits, not tight timers).
3. An identical failure on 3 consecutive solo attempts = real red = STOP.
4. Note the machine-load context in your report so the auditor re-runs accordingly.
Resume from the firewall (it now passes under this protocol — the captain's run 1 is
the evidence) and build the contract as written.

---

## BUILDER REPORT — IMPLEMENTED, BLOCKED AT GATE 5 (2026-07-11)

**Verdict:** BLOCKED, not complete. UNIFYSETUP is implemented in the worktree and its
owned tests, snake suites, characterized Draft Setup firewall, and auction firewall
are green. Gate 5 cannot be certified: the definitive single full-suite rerun ended
with two failures outside Amendment 1's exact grace list. Per `UNKNOWN = STOP`, the
builder did not retry, loosen, or repair those unrelated suites. No git write command
was used.

### File:line map

- `src/src_figma/app/components/snake/setup/SnakeDraftSetupAdapter.tsx:46-114` —
  version grouping/selection and archetype-derived cap identity.
- `src/src_figma/app/components/snake/setup/SnakeDraftSetupAdapter.tsx:116-190` —
  locked RegisteredPool-IV seating input and initial per-seat board snapshots.
- `src/src_figma/app/components/snake/setup/SnakeDraftSetupAdapter.tsx:220-243` —
  ROOMFIX registration-before-session ordering.
- `src/src_figma/app/components/snake/setup/SnakeDraftSetupAdapter.tsx:245-403` —
  snake setup state, proof revision guard, readiness, session creation, and room entry.
- `src/src_figma/app/components/snake/setup/SnakeDraftSetupAdapter.tsx:405-486` —
  VERSIONS, CLUB SEATS, ORDER, and READINESS panels.
- `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx:2946-2977` — ranking debounce
  flush, format-gated snake adapter, and snake-only readiness gate.
- `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx:3200-3255` — exact selected-id
  lock, unlock law, and format-specific start action.
- `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx:4864-4918` — snake panels and
  the sole format-matched ENTER SNAKE DRAFT action.
- `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx:5446-5494` — shared pool rows
  use the full profile popover for both formats.
- `src/App.tsx:123-128,411-413` — retired `/snake-setup` redirect preserving the
  query string; `/snake-room` remains the room route.
- `src/src_figma/app/utils/draftRouting.ts:5-31` — snake MLB routing targets the
  existing room while auction routing remains unchanged.
- Deleted `src/src_figma/app/pages/SnakeDraftSetup.tsx` and migrated its coverage;
  the `snakeSetup` and `seatBoards` storage shapes were not changed.
- `src/src_figma/__tests__/pages/SnakeDraftSetupAdapter.test.tsx:1-129` — version,
  frozen-IV, heavy-tax proof, and board-snapshot coverage.
- `src/src_figma/__tests__/pages/SnakeDraftRoom.registration.integration.test.tsx:217-329`
  — migrated unified setup → room → private desk → guide → first-pick crawl.
- `src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.setup.test.tsx:226-275` —
  adapter isolation and full-profile parity.
- `src/src_figma/__tests__/pages/SnakeDraftSetup.route.test.tsx:1-58` — redirect and
  `leagueId` preservation.

### Gate outputs

1. `NODE_ENV= npx tsc -b --pretty false` — exit 0, no diagnostics.
2. `NODE_ENV= npm run build` — exit 0; 2,687 modules transformed; built in 12.30s.
   Existing Browserslist, dynamic-import, and chunk-size warnings only.
   Gates 1-2 ran before the final one-line auction/snake proof-isolation repair and
   later test-only expectation/timeout edits. The subsequent Gate 4 and both full
   suites transformed/executed that corrected source, but the Gate 5 STOP prevented a
   refreshed final tsc/build certification; treat Gates 1-2 as earlier green evidence,
   not a claim that the blocked worktree is fully certified.
3. Serialized migrated crawl + owned + snake suites — **19 files passed; 110 tests
   passed; duration 75.16s.** New adapter tests were 4/4 and migrated ROOMFIX was 2/2.
4. Serialized six-file characterized set + every auction-named suite — **40 files
   passed, 3 opt-in diagnostics skipped; 482 tests passed, 6 skipped; duration
   497.19s.** A prior attempt exposed a real format-isolation bug (snake proof was
   touching synthetic auction pool ids); fixed by passing no proof pool outside the
   snake adapter, then the complete Gate 4 command passed.
5. **BLOCKED.** First full run: 653 files passed / 3 failed / 8 skipped; 9,734 tests
   passed / 4 failed / 15 skipped; 1,209.94s. The owned ROOMFIX test exceeded its
   60-second whole-test allowance under load, two route expectations were stale, and
   the Amendment-covered poolLock family timed out. The route expectations were
   corrected, ROOMFIX kept all assertions and received a 180-second load allowance,
   and its exact file passed 2/2 in 17.20s. PoolLock passed solo on Amendment attempt 2,
   21/21 in 101.90s.

   Definitive full rerun: **654 files passed / 2 failed / 8 skipped; 9,736 tests
   passed / 2 failed / 15 skipped; duration 1,367.43s.** All UNIFYSETUP-owned tests
   passed in this full run, including ROOMFIX 2/2 in 31.10s and adapter 4/4. The two
   non-amended failures were:

   - `src/src_figma/__tests__/components/RosterDesigner.test.tsx:315` — `D1: TWO-WAY
     toggle only renders where a two-way player is eligible` hit its 10,000ms test
     timeout (file duration 21.25s).
   - `src/src_figma/__tests__/app/EliminationTeamHub.test.tsx:159` — `renders partial
     data warnings honestly` asserted while the panel still rendered `LOADING TEAM
     IMPACT...`.

   Neither file is in Amendment 1's exact list, and neither production surface was
   touched by this lane. They were therefore not retried or changed.

Amendment attempt ledger used during the lane:

- Pre-change six-file firewall: setup 26/26 attempt 1; money 16/16 attempt 1;
  poolLock attempt 1 red on a moving option wait, attempt 2 green 21/21; board 24/24
  attempt 1; universe 15/15 attempt 1; RankYourBoardZone 7/7 attempt 1.
- Gate 4 first run: board attempt 1 red, then solo attempt 2 green 24/24; universe's
  first red was contaminated by the builder's auction/snake isolation bug, then green
  15/15 after that bug was fixed. The complete corrected Gate 4 rerun was green.
- Gate 5 first run: poolLock attempt 1 red; exact solo attempt 2 green 21/21. The
  definitive full rerun then passed poolLock 21/21 without needing the amendment.

Machine-load context: the captain reported three concurrent heavy lanes. Timings in
this run confirm severe contention (for example, a normally ~37s poolLock file reached
101.90s solo, while still passing fully).

### Copy inventory

- New snake headings/actions: `5 · VERSIONS`, `6 · CLUB SEATS`, `7 · ORDER`,
  `8 · READINESS`, `9 · ENTER SNAKE DRAFT`, `ENTER SNAKE DRAFT`, and
  `RESUME SNAKE DRAFT`.
- Version lock law: `PICK ONE CARD FOR EACH PERSON BEFORE YOU LOCK THE POOL.` and
  `UNLOCK THE POOL TO CHANGE VERSIONS.`
- Seat/order controls: `GM NAME`, `HOTSEAT`, `COMPANION`, `DRAFT SEED`, `SHUFFLE`,
  visible round-direction preview, and tap-two-swap order buttons.
- Readiness states: `CHECKING…`, `LOCK THE POOL TO CHECK THE ROOM.`, and the existing
  proof engine's plain-language verdict/shortfall message.
- Auction-only shill/reserve copy remains format-gated; no percentages were added.

### Auditor attack list

1. First resolve Gate 5's two non-amended reds under the captain's firewall rules.
   Do not silently add them to Amendment 1 or retry them as characterized without a
   captain ruling.
2. Re-run the single full suite on a quiet machine and compare the exact two failures
   against untouched base `8f6c215a`; the builder cannot certify causation either way.
3. Attack format isolation with synthetic auction pool ids: auction setup must never
   construct or run snake seating proof.
4. Mutate live player salary/IV after lock and confirm proof/session still use the
   RegisteredPool IV; verify version changes require UNLOCK.
5. Verify simultaneous proof receives each club's chosen archetype-derived cap
   identity and blocks the constructed balanced-pass/heavy-tax-fail pool.
6. Interrupt a debounced board edit immediately before GO and confirm the initial
   `seatBoards` record contains the hand-touched rank.
7. Falsify the no-orphan law by forcing registration failure; no snake session may be
   created before the exact picked pool is registered and locked.
8. Confirm auction routes, saved-auction resume, shills, reserve pricing, and one
   format-matched action remain byte-behavior compatible apart from additive full
   profile parity.
9. Confirm deleted `SnakeDraftSetup` has no live import and `/snake-setup` preserves
   every query parameter while redirecting to unified setup.

---

## CAPTAIN CERTIFICATION OF GATE 5 (2026-07-11)
The two non-amended full-run reds (RosterDesigner two-way toggle timeout;
EliminationTeamHub loading-race assertion) were solo-verified by the captain under the
Amendment 1 protocol: BOTH GREEN on attempt 1 (untouched by this lane's diff; same
machine-load flake class — the characterized list is hereby extended to include them).
Captain also re-ran Gate 1 (tsc exit 0) and Gate 2 (build exit 0) on the FINAL
worktree, closing the builder's stale-certification caveat. Gate 5 is CERTIFIED:
zero deterministic reds attributable to this lane. → Independent audit next.
