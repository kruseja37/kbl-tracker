# CONTRACT S5 — COMPANION DEVICES (the private desk in your hand)
Captain: Fable · Builder: Codex gpt-5.6-sol high · Date: 2026-07-10
Branch: codex/snake-s5-companions · Base: main @ post PR #71

## AUTHORITY
1. spec-docs/SNAKE_DRAFT_VISION_2026-07-10.md — privacy four-place model; companions
   (≤3, claim = GM name + room code + MAIN-DEVICE APPROVAL); "SHARED DRAFT ROOM" vs
   "YOUR PRIVATE DRAFT DESK" labels; main = the gavel (ALL executions).
2. spec-docs/SNAKE_DRAFT_V1_PROGRAM_2026-07-10.md — S5 lane + appendix rulings
   (companion loss/reclaim; >3 companions refused with plain copy; stale companion
   state validates against the CURRENT session revision).
3. spec-docs/contracts/CONTRACT_S3_PRIVATE_DESK_2026-07-10.md +
   CONTRACT_S4_TRADE_GUIDE_2026-07-10.md — the desk/guide components you re-mount
   (S4 audit: SnakeTradeGuide is public-safe/read-only, companion-mountable; execute
   lives ONLY in SnakeCommissionerTrade and must NEVER mount on a companion).

## LAWS (REJECT criteria)
- MAIN EXECUTES, COMPANIONS NEVER: no pick arming/recording, no trade execution, no
  commissioner control ever renders on a companion. Read + own-records-write only
  (own board/rankings edits).
- FAIL-CLOSED CLAIMS: a companion shows NOTHING private until its claim is APPROVED on
  the main device. Room code alone is never sufficient (the approval is the consent
  moment). Claim state lost/expired → covered, plain copy, re-claim.
- ONE SEAT PER COMPANION, ≤3 companions per room; a 4th claim is refused in plain words.
- PRIVACY: a companion renders ONLY its claimed seat's privates. Another seat's board/
  rankings/LOG are unreachable (not hidden — unfetched/unrendered).
- Copy law · no percentages · auction frozen · engines done (gaps = STOP).

## OWNERSHIP GRANT (Amendment-2 pattern)
ONE additive optional field on LeagueBuilderMlbDraftSession in leagueBuilderStorage.ts:
```ts
snakeCompanions?: {
  roomCode: string;                       // 4 digits, generated at GO or first open
  claims: Array<{
    deviceId: string;                     // companion-generated stable id
    gmName: string;
    teamId: string;
    status: 'pending' | 'approved' | 'revoked';
  }>;
}
```
Additive only; no store rename; no DB version bump; completedPicks/pickOrder/
currentPickIndex semantics untouched.

## SCOPE
S5a. THE COMPANION PAGE — new route /snake-companion (you own App.tsx for this one
route + its lazy import; flag-gated like the others): claim screen (enter GM name +
room code → pending), then after approval the claimed seat's PRIVATE DESK (S3
components re-mounted read/own-write) + THE GUIDE (read-only SnakeTradeGuide) + the
public frame basics (order strip state, ticker text — read-only). Label: "YOUR PRIVATE
DRAFT DESK". Board/ranking edits from the companion persist via the SAME per-seat
seatBoards path (last-write-wins per appendix 14; a stale companion write validates
against the current session revision — on conflict: "THE DRAFT MOVED ON — REFRESH").
S5b. MAIN-SIDE APPROVAL — an exported standalone component
(components/snake/companion/CompanionApprovalCard.tsx): shows pending claims ("LET
[GM NAME] SEE THE [TEAM] DESK?") with APPROVE / REFUSE, plus a room-code display and
per-claim REVOKE. DO NOT mount it into SnakeDraftRoom/View (S6 owns those files
concurrently) — export it with a clear prop contract; the captain wires the one-line
mount at merge. Test it standalone.
S5c. FRESHNESS — the companion polls/subscribes through the EXISTING storage/sync
path (the same mlbDraftSessions read the room uses; IndexedDB is same-origin across
tabs/devices via the existing sync engine). Target: seconds-fresh. If the existing
sync machinery cannot deliver cross-device updates without NEW infrastructure → STOP
and report exactly what's missing (do not build new sync).

## FILE SURFACE
NEW: src/src_figma/app/pages/SnakeCompanion.tsx · src/src_figma/app/components/snake/
companion/ (claim screen, approval card, companion frame) + tests.
OWNED EDITS: src/App.tsx (one route + lazy import) · the ONE storage field above.
FORBIDDEN (S6 owns concurrently): SnakeDraftRoom.tsx · SnakeDraftRoomView.tsx ·
components/snake/desk|trade internals (import, don't edit) · engines · auction files ·
flags · reducer.

## TESTS
Fail-closed claim lifecycle (nothing private pre-approval; revoke covers immediately;
4th claim refused with the plain copy) · one-seat isolation (claimed seat A cannot
render seat B data — assert unfetched) · no-execute tripwire (no gavel/commissioner/
execute control in the companion tree; grep + render test) · stale-write refusal ·
board edit from companion round-trips through seatBoards · route flag-gated.

## GATES (real output)
1. tsc clean. 2. build exit 0. 3. Owned + S3 desk suites green. 4. Auction suites
green. 5. ONE full vitest (known solo-flakes — verify solo if red).

## PROTOCOL
No git write commands. Spec-first tests. UNKNOWN = STOP. Builder report appended here.

---

## BUILDER REPORT — Codex S5 (2026-07-10) — BLOCKED / CONTRACT STOP

### Outcome

STOPPED at S5c's required existing-sync proof before writing tests or implementation. The
current sync path cannot deliver the contract's room-code companion flow across separate
devices without new infrastructure. No git write command was run. No product code, test,
auction file, engine, flag, reducer, or S6-owned file was edited. This contract report is
the only lane change; the three pre-existing untracked captain artifacts remain untouched.

### Blocking engine / infrastructure gap

The companion contract grants access with GM name + four-digit room code + approval on the
main device. The existing sync engine grants access only through the currently authenticated
Supabase user:

- `src/utils/syncEngine.ts:448-460` returns without a Supabase/auth session and pulls only
  for `session.user.id`.
- `src/utils/syncEngine.ts:1342-1349` filters every cloud-store pull by that user id.
- `src/utils/syncEngine.ts:995-1025` likewise writes every queued session row under the
  current authenticated user id.
- `src/supabase.ts:3-12` makes the cloud client optional; with no configured client there
  is no cross-device path at all.

Therefore a companion device that knows only the room code cannot see or submit a pending
claim to the host's account-scoped `mlbDraftSessions` row. Signing the companion into the
host's account would be a new, unstated access requirement and would not implement the
contract's room-code consent boundary.

Freshness also misses the binding target. `src/utils/syncEngine.ts:261-262,333-352` drains
writes every five seconds but pulls remote changes only every 60 seconds (plus startup,
online, and manual pull). That is not the required seconds-fresh companion state. Adding a
room-scoped realtime channel, public/anonymous claim endpoint, room-code lookup, or a new
polling/auth protocol is expressly outside S5c's permission to reuse the existing path.

One further seam is not available in the granted storage surface: the only public draft-
session read is keyed by league id + season (`src/utils/leagueBuilderStorage.ts:1917-1931`),
not room code. A fresh companion route has neither key before the room-code claim resolves.

### Required captain decision / infrastructure before redispatch

Provide an existing, authorized room-scoped transport that supports all of the following,
or amend the program with a separate infrastructure lane:

1. Look up a draft room from the four-digit code without already knowing `leagueId`.
2. Submit a pending claim from a companion that is not authenticated as the host.
3. Let the main device approve/revoke that claim and propagate the result within seconds.
4. Enforce server-side room/seat isolation so a room code cannot fetch another seat's
   board, rankings, or LOG.
5. Apply own-seat board/ranking writes against the current session revision without a
   stale whole-session overwrite.

The contract must also define authentication/authorization and collision/expiry behavior
for a four-digit room code at that transport boundary. Those decisions cannot be invented
inside this UI lane.

### Spec-first tests and Gates 1–5

- Spec-first tests: **NOT WRITTEN — the required production transport does not exist, so
  mocks would falsely certify an unavailable cross-device path.**
- Gate 1 (tsc): **NOT RUN — contract STOP before implementation.**
- Gate 2 (build): **NOT RUN — contract STOP before implementation.**
- Gate 3 (owned + S3): **NOT RUN — contract STOP before implementation.**
- Gate 4 (auction): **NOT RUN — contract STOP before implementation; auction untouched.**
- Gate 5 (one full Vitest): **NOT RUN — contract STOP before implementation.**

### Changed-path inventory

S5 changed paths: **1**

1. `spec-docs/contracts/CONTRACT_S5_COMPANIONS_2026-07-10.md` — this blocked builder report.

Pre-existing untracked, untouched captain artifacts: `DISPATCH_PROMPT.txt`, `run_lane.sh`,
`sentinel.sh`.

---

## AMENDMENT 1 (captain ruling on the STOP, 2026-07-10) — the v1 deployment model

The STOP is upheld and the analysis is correct: room-code access for UNAUTHENTICATED
guest devices is real infrastructure (anonymous claims, room-scoped ACL, realtime) and
is hereby ruled a V2 LANE — booked, not built.

V1 DEPLOYMENT MODEL (ruled): all companion devices are the league owner's own hardware
signed into the SAME account (the actual table setup: Mac main + the owner's iPads/
phones handed to friends). Consequences:
1. TRANSPORT EXISTS: the account-scoped sync engine already moves mlbDraftSessions
   across the owner's devices. No new infrastructure.
2. THE CLAIM/APPROVAL FLOW IS UNCHANGED in UX and purpose — it is the TABLE-CONSENT
   boundary (which seat a given device may RENDER), enforced fail-closed at render.
   State v1 honestly in a code comment + the contract: v1 privacy = render-level
   consent among people at one table on one account; server-side seat ACL for guest
   accounts = the v2 lane. The room code stays (it is the friction that makes a claim
   deliberate), stored in the session field as granted.
3. ROOM LOOKUP: the companion page enumerates the account's leagues/sessions through
   EXISTING storage reads and matches the entered room code against
   snakeCompanions.roomCode. No new key path.
4. FRESHNESS: the companion page drives `syncEngine.pull()` (src/utils/syncEngine.ts:448)
   on a 5-second interval while mounted + on visibilitychange, alongside the existing
   cadence. Picks are minutes apart; ≤5s staleness is ruled acceptable for v1. If
   pull() is unsafe to call at that cadence (rate limits, cost), STOP with specifics.
5. Stale own-seat writes: the granted seatBoards per-seat LWW + revision refusal
   already covers it (S3 machinery).
Resume from the STOP seam and build S5a/S5b/S5c under this model. Everything else in
the contract binds unchanged.

---

## BUILDER FINAL REPORT — Codex S5 (2026-07-10) — AMENDMENT 1 COMPLETE

### Outcome

S5a/S5b/S5c are complete under Amendment 1's ruled same-account hardware model. No git
write command was run. No auction file, S6-owned room/view file, desk/trade internal,
engine, flag, reducer, store name, or DB version was changed. The three pre-existing
untracked captain artifacts remain untouched.

The new default-off `/snake-companion` route now:

- enumerates the signed-in account's existing leagues and MLB draft sessions, then matches
  the entered four-digit room code;
- persists a stable per-device id locally and submits the named GM's claim into the granted
  `snakeCompanions` session field;
- stays fail-closed before approval, while pending, after refusal/revoke, or after the old
  device is replaced by a new claim for the same seat;
- polls the existing account-scoped `syncEngine.pull()` path every five seconds and again
  on `visibilitychange`, then reloads the current session;
- constructs and renders only the approved seat's `seatBoards[teamId]` record through the
  existing S3 `PrivateDesk`, plus the public order/ticker and the read-only S4
  `SnakeTradeGuide` fixed to that seat;
- persists only that seat's ranking/board edits through the existing
  `saveMlbDraftSession` path after re-reading and validating both current session revision
  and current board revision. A conflict refuses with `THE DRAFT MOVED ON — REFRESH`;
- contains no pick arm/record, gavel, commissioner, correction, pause, trade-execute, or
  other main-device control.

The standalone `CompanionApprovalCard` generates the room code on first open when needed,
shows pending claims with APPROVE/REFUSE, shows approved devices with per-device REVOKE,
and deliberately is not mounted into the concurrently-owned S6 room/view files.

The storage comment states the v1 boundary honestly: these are the league owner's own
same-account devices and privacy is table-consent/render-level; guest-account server-side
seat ACL is the booked v2 lane.

### Spec-first / negative-feedback evidence

The first focused run was RED before implementation exactly because the new model and
surfaces did not exist:

```text
FAIL CompanionSurfaces.test.tsx — Failed to resolve ../CompanionApprovalCard
FAIL companionModel.test.ts — Failed to resolve ../companionModel
Test Files  2 failed | 1 passed (3)
Tests       1 passed (1)
```

The implemented focused gate pins:

- no private render before approval and immediate loss after revoke;
- one device per seat, replacement of the old device, and a plain refusal for a fourth
  companion;
- exact one-seat board isolation with the sibling seat record preserved byte-for-byte;
- stale session and stale board revision refusal;
- board/ranking edit round-trip in the granted `seatBoards` field;
- standalone approve/refuse/revoke behavior and room-code display;
- no-execute companion tree tripwire;
- five-second pull, visible-tab pull, and cleanup;
- route hidden with the snake-v1 flag OFF and registered with it ON;
- all pre-existing S3 desk/reveal tests unchanged and green.

Static no-execute grep over the production companion page/folder returned no matches for
`GAVEL|COMMISSIONER|EXECUTE|onRecordPick|SnakeCommissionerTrade`. The only production
`seatBoards` lookup on the companion page is the approved claimed team id.

### Final Gates 1→5 — real terminal output

**Gate 1 — `npx tsc -b --pretty false`**

```text
GATE1_EXIT=0
(no compiler output)
```

**Gate 2 — `npm run build`**

```text
✓ 2680 modules transformed.
✓ built in 12.04s
PWA v1.2.0
precache  200 entries (5464.48 KiB)
files generated
  dist/sw.js
  dist/workbox-1d305bb8.js
GATE2_EXIT=0
```

Only the existing Browserslist, dynamic-import, and chunk-size warnings were emitted.

**Gate 3 — owned companion + S3 desk/reveal suites**

```text
Test Files  8 passed (8)
Tests       35 passed (35)
Duration    2.24s
GATE3_EXIT=0
```

**Gate 4 — every current auction-named suite**

```text
GATE4_FILE_COUNT=39
Test Files  36 passed | 3 skipped (39)
Tests       452 passed | 6 skipped (458)
Duration    64.59s
GATE4_EXIT=0
```

**Gate 5 — the one full `NODE_ENV= npx vitest run` invocation**

```text
Test Files  2 failed | 639 passed | 8 skipped (649)
Tests       2 failed | 9640 passed | 15 skipped (9657)
Duration    293.89s
GATE5_EXIT=1
```

Both reds were timeout-only members of the contract's characterized
`LeagueBuilderDraftSetup` full-suite pressure family:

```text
LeagueBuilderDraftSetup.money.test.tsx
  Cap Fit diagnostic survives preset, source, Regenerate, and Reroll without salary cap mutation
  timed out at 20000ms

LeagueBuilderDraftSetup.poolLock.test.tsx
  reroll preserves roster-design pinned players as hard keeps
  timed out at 15000ms
```

The exact two-test solo verification was green:

```text
Test Files  2 passed (2)
Tests       2 passed | 35 skipped (37)
Duration    13.07s
SOLO_VERIFY_EXIT=0
```

Verdict: zero new deterministic reds; the full-suite Gate 5 result matches the documented
solo-flake protocol.

### Changed-path inventory

S5 changed paths: **13** (12 implementation/test paths plus this required final report).

1. `src/App.tsx` — default-off companion lazy route.
2. `src/utils/leagueBuilderStorage.ts` — the one granted additive `snakeCompanions` field
   and honest v1/v2 privacy-boundary comment.
3. `src/src_figma/app/pages/SnakeCompanion.tsx` — room discovery, claim/revoke state,
   approved-seat-only desk/guide/public frame, current-revision writes, and sync refresh.
4. `src/src_figma/app/components/snake/companion/companionModel.ts` — fail-closed claim,
   approval/revoke/replacement/cap, and stale own-seat board-write model.
5. `src/src_figma/app/components/snake/companion/companionFreshness.ts` — five-second and
   visibility refresh scheduler.
6. `src/src_figma/app/components/snake/companion/CompanionClaimScreen.tsx` — claim and
   covered/pending UI.
7. `src/src_figma/app/components/snake/companion/CompanionApprovalCard.tsx` — standalone
   main-device room-code and approval card.
8. `src/src_figma/app/components/snake/companion/SnakeCompanionFrame.tsx` — public frame,
   claimed private desk, and read-only guide mount.
9. `src/src_figma/app/components/snake/companion/__tests__/companionModel.test.ts` — lifecycle,
   capacity/replacement, isolation, stale write, and seatBoards round-trip tests.
10. `src/src_figma/app/components/snake/companion/__tests__/companionFreshness.test.ts` —
    interval/visibility/cleanup proof.
11. `src/src_figma/app/components/snake/companion/__tests__/CompanionSurfaces.test.tsx` —
    approval-card and no-execute/private-tree render tests.
12. `src/src_figma/__tests__/pages/SnakeCompanion.route.test.tsx` — route flag OFF/ON tests.
13. `spec-docs/contracts/CONTRACT_S5_COMPANIONS_2026-07-10.md` — this final report.

Pre-existing untracked, untouched captain artifacts: `DISPATCH_PROMPT.txt`, `run_lane.sh`,
`sentinel.sh`.

**S5 AMENDMENT 1 COMPLETE — ready for independent audit.**

---

## AUDIT — opus, independent, 2026-07-10 — VERDICT: APPROVE
Fail-closed proven STRUCTURAL (private board never computed for an unapproved device,
not merely hidden); no leak constructible (wrong-name, seat-replacement, inter-poll
revoke race all cover); one-seat isolation exact (every seatBoards access keyed to the
claimed team; sibling byte-preservation pinned); no-execute clean (grep + tree); stale
writes doubly guarded (session + board revision), residual TOCTOU sub-ms within the
ruled v1 LWW tolerance; Amendment 1 conformance exact (no new sync infra; 5s pull +
visibilitychange with teardown); storage grant exact (one field, model-level 4th-claim
refusal); partition clean; flag OFF double-gated.
NOTES: add a page-level integration test mounting the REAL desk with a pending claim
(frame test currently uses stubs); tighten CompanionApprovalCard effect deps.
CAPTAIN MERGE DUTY: mount CompanionApprovalCard into the room post-S6 (one line,
session/teams/onChange via saveMlbDraftSession) — until then the flow is correctly
inert in production.
