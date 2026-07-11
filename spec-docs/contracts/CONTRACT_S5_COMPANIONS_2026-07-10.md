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
