# Snake Companion Sync Architecture Audit

**Date:** 2026-07-19
**Thread:** SNAKE_DRAFT
**Status:** INDEPENDENTLY APPROVED — MIGRATION, PREVIEW, AND JK WALK PENDING
**Product gate:** JK's browser and real-device walk

## State checked before the audit

- `origin/main` was fetched before the audit.
- Current `origin/main` was `ba7f97d68fd84e44c365c0e795f2431f6e25cbbc`.
- The failed browser build was `/private/tmp/kbl-snake-browser-feedback` at
  `572971de7607058720c526b1ea31d35b5e8053c7`.
- The clean repair build is `/private/tmp/kbl-snake-live-room-authority` on
  `codex/snake-live-room-authority`.
- The cloud-authority implementation is commit `e553fcb6`. Companion isolation from generic sync is
  commit `fd07bba0`.
- The independent auditor inspected exact branch head `cedf96ee` and returned **APPROVE — Major 0 /
  Minor 0**. Commits after `fd07bba0` are documentation only.
- No merge or deploy is authorized.

## Verdict

The old companion system is not safe for a live multi-device draft.

The Moose error is not an isolated bad record. Normal use can create it. The app keeps two live
copies of each private board. A companion edit and a Hotseat pick can write different revision-13
boards to different cloud rows. The reader finds the equal revision and different data, then stops.

The old live room also uses the account backup engine as its transport. This creates large
account-wide queues, stale-write blocks, localStorage quota failures, and delayed room updates. A
live draft must not wait for that queue.

## Confirmed findings

### 1. Each private board has two live authorities

`getMlbDraftSession()` reads the board inside `mlbDraftSessions` and the board in
`snakeSeatBoards`. `resolveAuthoritativeSeatBoard()` accepts the higher revision and throws when
equal revisions contain different data.

### 2. Normal production writes can create the split

The exact failure sequence is:

1. Hotseat and a companion both read board revision 12.
2. The companion changes the board and creates companion revision 13.
3. Hotseat records a pick. Board reconciliation creates a different Hotseat revision 13.
4. The companion board row reaches the cloud first.
5. The Hotseat room row reaches the cloud. Its separate board row is rejected as stale.
6. The cloud now has two different revision-13 boards.
7. A device reads both. The reader throws the reported corruption error.

This sequence uses only production writers. It does not require manual damage.

### 3. Local atomic writes are not cloud transactions

The browser can write the room and boards in one IndexedDB transaction. It then sends separate
cloud rows. The generic sync RPC can accept one row and reject another. It cannot commit a complete
draft action across room, claim, intent, and board records.

### 4. The live room uses the account backup queue

The old sync registry carries players, leagues, rosters, drafts, boards, events, and other account
data. The queue stores complete payloads in localStorage. A pick, trade, or correction can fail its
strict live-room flush because of an unrelated stale account row.

### 5. The old queue is not owned by one account

Old pending operations do not contain a user ID. The app restores them before it knows the active
account. A later drain uses the account that is signed in at that time. Sign-out does not quarantine
the old queue.

### 6. Draft progress and companion control share one revision

Claims, approvals, pick requests, trade intent, picks, and draft progress share one room row and one
general revision. An unrelated claim can invalidate a valid draft action. Draft truth and companion
control need separate revision domains.

### 7. Server privacy is not enforced

The old RLS policy filters by account only. Every same-account device can receive the complete room
JSON, including all private boards. The app hides other desks in the UI, but the server does not
enforce desk privacy.

### 8. Prior green tests did not run concurrent devices

The old tests use fake IndexedDB, one JavaScript process, one mutable mock device, and an in-memory
cloud array. The device steps run in sequence. Quota tests force small exceptions; they do not fill
a real Chrome origin with Auth data and a large queue.

## Frozen repair architecture

### A. One live private-board authority

- A claimed team's durable live authority is one private server board row per room and team.
- The companion keeps only a replaceable in-memory cache of that row.
- The host's local setup board is seed material only after the team transfers to a companion. It is
  not a mirror of later companion edits.
- Persisted room rows do not contain `seatBoards` or `farmSeatBoards`.
- The UI can receive hydrated board maps in memory for compatibility.

### B. A dedicated live-room service

The service has separate records for:

- public room state and draft revision;
- device and team claims;
- private team boards and board revisions;
- companion pick and trade intent;
- append-only public receipts.

The service also stores:

- one immutable, public-safe catalog containing only the exact active clubs and active player pool;
- one private recovery slot containing the prior public state for the latest completed pick or trade.

The generic account backup engine does not publish or pull active room or board records.

### C. Separate public and private writes

- Every action has an idempotency key.
- Every action supplies its expected revision.
- The server checks account, device, team, role, room phase, and revision.
- A companion submits intent. It cannot execute a pick or trade.
- Hotseat validates and executes public draft truth.
- A public action never reads or writes a private board.
- A stale or missing private board cannot reject or delay a public pick, trade, correction, or
  completion.
- Hotseat may seed the current setup board once when it approves the first claim for that team. The
  seed returns metadata only and cannot read or overwrite an existing board.
- After the seed, only an approved device for that team may read or write the board.
- Each companion projects public picks and corrections into its board in memory. This projection
  never writes the board or changes its saved revision.

### D. Private desk access

- Each device uses an unguessable capability token.
- The server stores only a token hash.
- Normal clients cannot read private board tables directly.
- Board RPCs check account, device, team, approval, and token.
- Public Realtime messages contain no private board payload.

### E. Realtime with a bounded fallback

- Devices subscribe to public room and event changes.
- A private change sends only a team and revision notice.
- An authorized device then uses a scoped RPC to read its board.
- A scoped fetch runs after reconnect and as a slow fallback.
- No live action waits for an account-wide queue drain.

### F. Immutable public catalog

- The host seeds the catalog once.
- The database verifies that its clubs and player IDs exactly match the active room.
- The catalog excludes hidden personality modifiers, salary factors, backstory, roster design,
  rankings, lineups, rotations, and all private board data.
- Companions fetch it once and do not refetch it after each pick or trade.
- A private board can carry its own `designSlots`; only that approved device can read them.

### G. One-step correction recovery

- A completed pick or trade stores the prior public room state in one private recovery slot.
- A pause cannot replace that slot.
- Only the Hotseat can restore it, once, with the exact room revision and an idempotency key.
- Public room JSON exposes only `correctionAvailable`; it never exposes the saved state.
- Closing the room clears the slot.

### H. Generic-sync isolation

- The remaining generic sync outbox moves from localStorage to IndexedDB.
- Every outbox item includes its owner user ID.
- Sign-out stops drains and quarantines that account's outbox.
- A new account cannot drain the prior account's work.
- The companion route uses Supabase Auth without binding the generic backup engine.
- Entering the companion route stops generic pull/drain timers and waits for tracked work to settle
  before the live room opens. Leaving the route restores the prior generic-sync setting.

## Migration and recovery law

1. Validate each embedded and standalone board.
2. If only one board exists, use it.
3. If revisions differ, use the higher valid revision.
4. If revisions and content match, keep one standalone authority.
5. If revisions match but content differs, stop and quarantine the room.
6. Write all canonical standalone boards before the persisted room drops embedded maps.
7. Set the standalone-authority format marker.
8. Old room clients must not restore embedded board authority.
9. Move claims and intent to the new control records without changing picks, order, pool, rosters,
   or current pick.
10. Remove active room and board stores from generic sync.

## Required verification

### Deterministic tests

- Companion board revision 12 to 13 versus Hotseat pick revision 12 to 13. Both must succeed.
- Claim versus board edit.
- Pick versus account backup.
- Trade versus companion request.
- Duplicate action replay.
- Network loss before and after server commit.
- Reload after local commit and before server receipt.
- Account A sign-out followed by account B sign-in.
- Equal-revision board conflict quarantine.
- Old-client write rejection after cutover.
- Stale-board non-interference for public pick, trade, correction, and completion.
- Public pick removal, owned-roster projection, correction restore, unchanged saved board revision,
  and zero board writes.

### Browser and device tests

- Two devices: Hotseat plus one companion.
- Four devices: Hotseat plus three companions in one eight-team room.
- Eight teams: complete all 176 MLB picks and required handoffs.
- Use separate persistent Chrome profiles, not tabs in one browser context.
- Target Mac mini/Neo and laptop desktop seats with a fine pointer.
- iPad is not an acceptance target for this build.
- Run a near-quota Chrome backup regression. Live-room actions must remain available.

### Performance gates

- Local board interaction: p95 at or below 100 ms.
- Public remote update: p95 at or below 1.5 seconds; no update above 3 seconds.
- Claim or approval update: p95 at or below 1.5 seconds; no update above 3 seconds.
- Reconnect convergence: at or below 5 seconds.
- Cold reload convergence: at or below 8 seconds.
- Zero duplicate picks or trades.
- Zero lost claims or board edits.
- Zero drafted-player resurrection.
- Zero equal-revision unequal-board state.
- One authoritative on-clock team on every device.

## Scope limits

- Do not change FIT, tax, roster, archetype, draftability, Assistant GM, or trade-value math.
- Do not change FARM trade law.
- Do not add explanatory text to the main draft screen. Help-button law remains canon.
- Do not merge or deploy before the independent audit and JK's browser walk.

## Delivered repair

- The Hotseat is the only public draft writer.
- Companions send team-scoped claims, board changes, pick requests, and trade requests.
- Each private board has one server authority and one private revision.
- Public draft state has its own revision. A board failure cannot stop a pick, trade, correction, or
  draft completion.
- Live-room actions do not use the generic account backup queue.
- The remaining account backup outbox is account-owned and stored in IndexedDB.
- The shared catalog is immutable, exact to the active room, and server-checked for private fields.
- Pick and trade correction uses a private, one-use server recovery slot.
- Cloud public state is immediate authority. A failed local Hotseat mirror can warn, but it cannot
  reject a cloud pick, trade, pause, correction, or final public pick.
- Companion authentication and routing do not start or pull the generic account backup engine.
- Final roster freeze still uses the Hotseat's local canonical private player records and local
  League Builder transaction. The current repair does not claim that the whole application is
  cloud-only.

## Current verification

- The combined live-room, catalog, host, companion, completion, reconnect, registration, and auth
  matrix is 12 files / 130 tests, all green.
- TypeScript, changed-file ESLint, production/PWA build, and diff integrity are green.
- The final independent audit returned **APPROVE — Major 0 / Minor 0** against exact branch head
  `cedf96ee`. The auditor independently passed 12 files / 130 focused tests, TypeScript,
  changed-file ESLint, the 2,744-module production/PWA build with 223 precache entries, diff
  integrity, and the clean-worktree check.

## Bounded follow-up outside this preview

- Hotseat discovery and rejoin still require its local League Builder session plus the small host
  capability key. Cloud room state alone cannot cold-boot a wiped Hotseat profile. Do not clear the
  original Hotseat's League Builder or live-capability storage after a room starts.
- A completed cloud draft still needs the original Hotseat's local canonical private player records
  for final freeze and roster handoff.
- Moving League Builder setup and final roster handoff to owner-only cloud records is a separate
  product migration. It is not required for the controlled preview while the original Hotseat
  storage remains intact.
- This dedicated authority is for the MLB Snake live room. The FARM Snake room remains a Hotseat
  path that reads local League Builder data and generic sync. Do not claim FARM is cloud-authoritative
  or include FARM companion drafting in this preview.
- Realtime events are hints. Each device also performs a bounded scoped read of current server
  state after subscribe, reconnect, and every five seconds while the room is open.
- The source league keeps its original team IDs and rosters. A draft target receives new team IDs
  and empty rosters, so the draft cannot erase a source roster or inherit its slot state.
- The live room targets Mac mini/Neo and laptop layouts first. One document scroll replaces nested
  desktop panes where possible.

## Remaining product gate

Migration `009_snake_live_rooms.sql` has not been applied to the remote project. The repaired app has
not been deployed. After those two actions, remove only old Snake test rooms and retired local sync
keys, then run one real Hotseat-plus-companion browser walk. Do not wipe players, source leagues,
teams, archetypes, or registered pools. JK's walk remains the sole product acceptance gate.

The exact migration, preview, cleanup, rollback, and browser sequence is recorded in
`spec-docs/SNAKE_LIVE_ROOM_PREVIEW_RUNBOOK_2026-07-19.md`.
