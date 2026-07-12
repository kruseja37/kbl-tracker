# SNAKE DRAFT TRUTH — 2026-07-11 (the one-page pickup doc)

**Read this first if you're picking up the snake draft tomorrow.** It answers one question: what is the snake draft, really, right now — verified against git, not against what any brief claims. Where a claim couldn't be independently checked, that's said plainly below rather than assumed.

---

## WHAT IT IS (built + how verified)

The whole path is ONE flow, verified end to end through real code and JK's own live walkthrough:

**Draft Setup (one shared screen for both auction and snake, PR #97 UNIFYSETUP)** — the auction's own polished setup screen (pool, IV pricing, player profiles) now also carries the snake-only pieces: legends/player-version picks made before lock, GM name + hotseat/companion seat declarations, a seeded pick order with a visible shuffle, and an "archetype-honest" readiness check — every seat's plan is proven affordable before the GO button is allowed to fire. A rankings snapshot carries into the room's board. The auction side was checked hunk-by-hunk to prove it didn't change.

**THE ROOM (`/snake-room`, PR #67 S2)** — the five-state pick ritual (recorded-pick latch, privacy covers, pause, five sounds, commissioner controls), team colors/logos. First audit was a genuine REJECT (two sequencing bugs); the fix pass re-audited APPROVE.

**The private desk (companion + in-room panel, PR #68 S3)** — rankings and a 22-slot board with honest backfill, two settlement-money bills, a what-if sandbox, an advisor LOG, and REAL archetype fit (built on a canonical player→band adapter the captain wrote after the builder correctly stopped and flagged that fit had been computing as neutral everywhere, including the auction, until this lane).

**THE GUIDE + commissioner pick trades (PR #71 S4)** — posted prices, "ask for a pick" answers, commissioner execute/decline, and honesty about your next pick moving (e.g., "YOUR NEXT PICK MOVES: #9 → #14" — stated as fact, never a probability).

**The farm snake (PR #73 S6)** — its own fogged room, with slot salaries frozen at session creation (first slot = exactly 3× the last slot; the whole table sums to 75% of every team's combined farm budget).

**Season handoff, proven by the S7 gauntlet (PR #75)** — a real integration test drives an 8-club league through both full drafts (176 MLB picks + 80 farm picks), trades, a correction, staffing, and franchise init through real storage, and asserts draft-day morale exists for all 256 picks. On its first run it caught a real bug (farm-snake players got zero morale because the franchise code only knew how to read the older auction-shaped farm draft) — fixed, and the fix was verified against a SHA-unchanged copy of the same test.

**The tax rule (PR #69 TAXSWING)** — every pitching arm is taxed in exactly one group now (never double-counted between rotation and bullpen), and this rule change lives in the shared settlement code, so it's live in both the snake draft and the (frozen-for-v2) auction.

**Verification levels, stated plainly:**
- Everything above is engine/integration-tested end-to-end through real storage (not mocked), independently adversarially audited (APPROVE or APPROVE-WITH-NOTES on every lane), and merged to `main`.
- JK's own hands-on browser walkthrough has verified: setup → room entry → picks, plus a first real fix wave covering five seam-level bugs his walkthrough surfaced (PRs #90 ROOMFIX, #91 routing, #96 resume-overwrite hotfix, #97 UNIFYSETUP, #98 PERFROOM — the room-code churn + a real-league-scale performance fix). Contracts for the whole build: `spec-docs/contracts/CONTRACT_S0_TRANSFER_AUDIT_2026-07-10.md` through `CONTRACT_S7_GAUNTLET_2026-07-10.md`, plus `CONTRACT_ROOMFIX_2026-07-11.md`, `CONTRACT_UNIFYSETUP_2026-07-11.md`, `CONTRACT_PERFROOM_2026-07-11.md`.
- **JK has NOT yet walked the farm snake, trades, or a full multi-round season handoff live in the browser.** Those are engine-verified only so far. His continued walkthrough is the sole real acceptance gate — nothing above is "done" until he's clicked through it himself.

---

## WHAT IT ISN'T (honest)

**COMPANION CROSS-DEVICE: NOT WORKING on real devices.** This is tonight's finding — JK's own phone couldn't use the companion feature. Root cause identified by code inspection (not yet fixed, not yet confirmed by a live retest):
- The companion page (`/snake-companion`, `SnakeCompanion.tsx`) has no sign-in screen anywhere in it. It never imports or shows the app's existing sign-in surface (the `SyncModal`/login flow that lives on the home screen).
- The data sync it depends on is account-based cloud sync (Supabase). Every sync operation silently does nothing — no error, no message — if the device isn't signed into an account. So an unsigned-in phone polls forever, never finds the league, and just sits on "that room code does not match" with zero explanation of why.
- This was actually a known, named tradeoff, not an oversight: the original build (PR #72, S5) explicitly assumed every companion device is the league owner's OWN hardware, already signed into the same account (their spare phone/iPad, handed around the table) — a real friend's own unregistered phone was intentionally deferred to a future version. JK's phone tonight was presumably not already signed in, which exposes the gap: there's no way for a phone in that state to even find out it needs to sign in, let alone do it, from the companion page itself.
- Same-browser / same-device companion flows are test-green only — they haven't been proven on a second physical device either, beyond this one real-world data point.

**Also NOT in v1 (by design, not oversight):**
- CPU-controlled room members — practice mode only, no CPU seats in a real room.
- Trading already-drafted players, or building custom multi-asset trade packages — pick-for-pick trades only.
- Playoffs and offseason — deferred, out of v1 scope entirely.
- The All-Star game itself (voting/selections only ship in v1).
- Any auction changes — the auction is frozen for v2 (still routed and playable, just not being touched).

---

## TOMORROW'S PICKUP (in order)

1. **Companion live-debug, first priority.** Add a real sign-in path onto the companion page (or surface the existing sign-in screen there), then verify an actual round-trip on JK's own phone and the Mac — a real device test, not just automated tests passing.
2. **Continue JK's walkthrough, wave 2** — farm snake, trades, and a fuller season-handoff pass in the real browser are still unwalked.
3. **Smaller ledger items, lowest priority:** a couple of on-screen button labels don't exactly match their accessibility labels; refresh the Browserslist data; add a code comment about the room's cache-key bump rule; do a real-browser idle-jank check while the room's assistant warms its cache; a few cosmetic S3 notes; legends-library carry-forwards (human-readable version labels, cross-namespace player IDs); and eventually upgrading the auction's own advisor to use the same real archetype-fit adapter the snake desk got.
