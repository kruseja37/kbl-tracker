# CONTRACT ROOMFIX — GO lands in a dead room (JK walkthrough blocker #2)
Captain: Fable · Builder: Codex gpt-5.6-sol xhigh · Branch: codex/snake-roomfix
(Re-dispatch after a machine crash wiped the first lane; the independent opus trace
below is COMPLETE and CONFIRMED — build directly to it.)

## THE FIELD REPORT (JK, real browser, 2026-07-11)
Created a snake-format league via the new DRAFT FORMAT dropdown → /snake-setup →
completed the cards (the seating proof said ready) → pressed START THE DRAFT → the room
shows "THE ROOM IS NOT READY / FINISH SNAKE DRAFT SETUP FIRST."
That panel renders on `!league || !pool || !session` (SnakeDraftRoom.tsx:817).

## THE CONFIRMED DIAGNOSIS (independent opus trace, evidence-verified)
THE POOL LEG IS NULL. Chain:
- Room reads getRegisteredPool(league.id) (SnakeDraftRoom.tsx:333) with NO fallback;
  registeredPools store is keyed by leagueId (leagueBuilderStorage.ts:1124, store def
  :1000-1001); the ONLY production writers are registerLeaguePoolForLeague
  (leagueBuilderPoolRegistration.ts:127) and lockLeaguePool/unlockLeaguePool
  (leagueBuilderPoolBuilder.ts:376,416).
- SnakeDraftSetup.startDraft (SnakeDraftSetup.tsx:283-322) calls NONE of them — it only
  writes snakeSetup.poolPlayerIds into the session and navigates.
- The auction flow never hits this: useAuctionDraft.ts:573-574 self-heals with
  `existingPool ?? registerLeaguePool(leagueId)`, and the auction Draft Setup locks a
  pool explicitly (LeagueBuilderDraftSetup.tsx:3168).
- The S7 gauntlet masked the gap by calling saveRegisteredPool by hand
  (snakeSeasonGauntlet.integration.test.ts:339).
- LEAGUE and SESSION legs are NOT null (query param matches; both sides use
  `${leagueId}::startup-mlb-draft::1`).

## THE FIX (build exactly this)
1. REPRO FIRST: a page-level integration test through REAL storage reproducing JK's
   exact flow: create a snake-format league (the real storage shape the League form
   writes) → drive SnakeDraftSetup's real handlers to a ready room → startDraft → mount
   SnakeDraftRoom with the navigation target setup actually used → RED against current
   code with instrumentation naming the null leg (must name `pool`).
2. FIX AT THE GO SEAM: SnakeDraftSetup.startDraft registers the pool BEFORE creating
   the session — SEEDED FROM THE USER'S PICKED MEMBERSHIP (proofPool /
   snakeSetup.poolPlayerIds), NOT registerLeaguePoolForLeague's league-assignment
   default (which may not contain picked historical/legends cards → the panel would
   clear but the room would open EMPTY — the trap behind the trap). Mirror the auction
   locked-pool pattern (explicit player-id seeding) via the CANONICAL registration/lock
   helpers — no hand-built pool records (adapter-reuse law).
3. Ensure every picked id carries a real IV in the registered pool (the room prices
   and seats from row.iv — SnakeDraftRoom.tsx:380,390,402,438); assert in the crawl.
4. Verify resolveLockedSeat derives a usable capIdentity from snakeSetup.clubs[].
   archetypeId alone (SnakeDraftRoom.tsx:409) — the room's live seating proof must not
   diverge from the setup card's READY.
5. CRAWL ONWARD in the same test: first pick through the ritual reducer states, desk
   candidates NON-EMPTY, bills finite, one guide ask — extend until the room is
   provably playable so the NEXT dead-end (if any) surfaces now.
6. The dead panel copy: name WHICH leg is missing in plain words (copy law) instead of
   the one generic line.

## LAWS
Auction files frozen (the registration helpers are shared storage — consume, don't
fork; useAuctionDraft/LeagueBuilderDraftSetup untouched) · engines done · reducer
untouchable · no fixture heals in the repro · copy law · UNKNOWN = STOP.

## GATES (real output in your report)
1. tsc clean. 2. build exit 0. 3. The repro green + all snake suites green. 4. Auction
suites green. 5. ONE full vitest (known solo-flakes verify solo).

## PROTOCOL
No git write commands. Repro red FIRST (paste the red output naming the null leg).
Builder report appended here: the seam diff summary with file:line, gate outputs,
auditor attack list.
