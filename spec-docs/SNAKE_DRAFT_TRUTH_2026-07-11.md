# SNAKE DRAFT TRUTH — 2026-07-11 (the one-page pickup doc)

**Read this first if you're picking up the snake draft.** It answers one question: what is the snake draft, really, right now — verified against git, not against what any brief claims. Where a claim couldn't be independently checked, that's said plainly below rather than assumed.

**UPDATE (2026-07-12, post-midnight, docs-only scribe pass):** the two lanes queued at the bottom of this doc are done — PR #110 (companion sign-in + a captain-found cross-device clobber fix) and PR #111 (help-button-law sweep + JK's ruled board-first room layout) are both MERGED to `main` (`3116ddc9`, `d6c988e9`). The Help-Button UI Law referenced below is now RATIFIED canon in `SESSION_RULES.md` (`beaad38f`). The "WHAT IT ISN'T" section below is updated accordingly — the companion fix is now built+merged, but still UNVERIFIED on real hardware.

**FINAL AUTOMATED UPDATE (2026-07-14; code commit `f8ca392d`):** the hostile repo crawl,
live UI crawl, and builder-auditor repair loop are complete. Final proof is 686 passed files /
10,227 passed tests, 17/17 responsive and production-lifecycle browser journeys, strict lint,
TypeScript, production build, and diff integrity. This makes the build ready for JK's complete
hands-on walk; it does not replace that walk or verify physical companion feel.

**CURRENT RULING (2026-07-14):** FARM draft-pick trades are retired. MLB draft-pick
trades remain. In-season player trades are separate and unchanged. References below to a
FARM trade in the historical S7 gauntlet describe what that older proof executed; they are
not a current product requirement.

---

## WHAT IT IS (built + how verified)

The whole path is ONE flow, verified end to end through real code and automated live-browser
journeys, with JK's earlier partial walkthrough findings repaired. JK's complete final walk remains
the acceptance gate:

**Draft Setup (one shared screen for both auction and snake, PR #97 UNIFYSETUP)** — the auction's own polished setup screen (pool, IV pricing, player profiles) now also carries the snake-only pieces: legends/player-version picks made before lock, GM name + hotseat/companion seat declarations, a seeded pick order with a visible shuffle, and an "archetype-honest" readiness check — every seat's plan is proven affordable before the GO button is allowed to fire. A rankings snapshot carries into the room's board. The auction side was checked hunk-by-hunk to prove it didn't change.

**THE ROOM (`/snake-room`, PR #67 S2)** — the five-state pick ritual (recorded-pick latch, privacy covers, pause, five sounds, commissioner controls), team colors/logos. First audit was a genuine REJECT (two sequencing bugs); the fix pass re-audited APPROVE.

**The private desk (companion + in-room panel, PR #68 S3)** — rankings and a 22-slot board with honest backfill, two settlement-money bills, a what-if sandbox, an advisor LOG, and REAL archetype fit (built on a canonical player→band adapter the captain wrote after the builder correctly stopped and flagged that fit had been computing as neutral everywhere, including the auction, until this lane).

**THE GUIDE + commissioner pick trades (PR #71 S4)** — posted prices, "ask for a pick" answers, commissioner execute/decline, and honesty about your next pick moving (e.g., "YOUR NEXT PICK MOVES: #9 → #14" — stated as fact, never a probability).

**The farm snake (PR #73 S6)** — its own fogged room, with slot salaries frozen at session creation (first slot = exactly 3× the last slot; the whole table sums to 75% of every team's combined farm budget).

**Season handoff, proven by the S7 gauntlet (PR #75)** — a real integration test drives an 8-club league through both full drafts (176 MLB picks + 80 farm picks), an MLB trade, corrections, staffing, and franchise init through real storage, and asserts draft-day morale exists for all 256 picks. The historical proof once included a FARM trade; that action is now retired and the proof must preserve FARM order instead. On its first run it caught a real bug (farm-snake players got zero morale because the franchise code only knew how to read the older auction-shaped farm draft) — fixed, and the fix was verified against a SHA-unchanged copy of the same test.

**The tax rule (PR #69 TAXSWING)** — every pitching arm is taxed in exactly one group now (never double-counted between rotation and bullpen), and this rule change lives in the shared settlement code, so it's live in both the snake draft and the (frozen-for-v2) auction.

**Verification levels, stated plainly:**
- Everything above is engine/integration-tested end-to-end through real storage (not mocked), independently adversarially audited (APPROVE or APPROVE-WITH-NOTES on every lane), and merged to `main`.
- JK's own hands-on browser walkthrough has verified: setup → room entry → picks, plus a first real fix wave covering five seam-level bugs his walkthrough surfaced (PRs #90 ROOMFIX, #91 routing, #96 resume-overwrite hotfix, #97 UNIFYSETUP, #98 PERFROOM — the room-code churn + a real-league-scale performance fix). A second wave (PRs #110 COMPANIONAUTH, #111 HELPSWEEP) is now also merged — companion sign-in + a cross-device clobber fix, plus the newly-ratified help-button law swept across every snake screen and JK's ruled board-first room layout — but is NOT yet walked by JK live (see below). Contracts for the whole build: `spec-docs/contracts/CONTRACT_S0_TRANSFER_AUDIT_2026-07-10.md` through `CONTRACT_S7_GAUNTLET_2026-07-10.md`, plus `CONTRACT_ROOMFIX_2026-07-11.md`, `CONTRACT_UNIFYSETUP_2026-07-11.md`, `CONTRACT_PERFROOM_2026-07-11.md`, `CONTRACT_COMPANIONAUTH_2026-07-12.md`, `CONTRACT_HELPSWEEP_2026-07-12.md`.
- **JK has NOT yet walked the farm snake, MLB pick trades, or a full multi-round season handoff live in the browser.** Those are engine-verified only so far. His continued walkthrough is the sole real acceptance gate — nothing above is "done" until he's clicked through it himself.

---

## WHAT IT ISN'T (honest)

**COMPANION CROSS-DEVICE: BUILT + MERGED, but UNVERIFIED on real hardware.** Last night's finding was that JK's own phone couldn't use the companion feature. The fix (PR #110, COMPANIONAUTH) is now merged to `main` (`3116ddc9`):
- The companion page (`/snake-companion`) now shows a real sign-in screen when the device isn't authenticated (fail-closed), with the signed-in account's email + a sign-out control on the claim screen, plus honest "pulling your leagues…" / "no open room on this account" / "code doesn't match" states — replacing the old silent no-op.
- A second, captain-found bug was fixed in the same lane: companion claim and board saves had been writing the WHOLE session row against a row-last-write-wins cloud store, so a pick made on the main device inside the sync staleness window could be silently erased by a companion write. Both writes now go through atomic field-patch helpers with pull-before-write, so a companion save can only ever touch its own field.
- Verification so far is a two-origin automated test on the real sync engine (opus-audited, the clobber regression made discriminating and mutation-verified) plus a full green suite — **not yet a real phone-to-Mac round-trip.** JK's own phone is still the first real test of this fix: `http://192.168.68.54:5173/snake-companion` on the same Wi-Fi, signed into the SAME account as the Mac, then enter the room code. The phone will now show a sign-in screen it didn't show last night.

**Also NOT in v1 (by design, not oversight):**
- CPU-controlled room members — practice mode only, no CPU seats in a real room.
- Trading already-drafted players, or building custom multi-asset trade packages — pick-for-pick trades only.
- Playoffs and offseason — deferred, out of v1 scope entirely.
- The All-Star game itself (voting/selections only ship in v1).
- Any auction changes — the auction is frozen for v2 (still routed and playable, just not being touched).

---

## PICKUP ORDER (2026-07-12 morning, updated)

1. **JK's real-phone companion round-trip, first priority.** The sign-in fix is merged — now verify it live: Mac at `http://192.168.68.54:5173` + phone on the same Wi-Fi, both at `/snake-companion`, phone signs into the SAME account as the Mac, then enters the room code. This is the actual test that last night's finding demanded; nothing before this step has touched real hardware.
2. **Continue JK's walkthrough, wave 2** — farm snake, MLB pick trades, and a fuller season-handoff pass in the real browser are still unwalked, and he'll now see the merged board-first room layout (his own draft board as the primary column) for the first time live.
3. **The ticketed side finding** — the Draft Setup "can't legally seat every club at 22 under the cap" blocker message misdirects (an SML-import repro showed raising the cap 1.2M→10M changed nothing; the real constraint is the shape of position supply, not the cap number). Flagged as a background-task chip, not a queued lane.
4. **Smaller ledger items, lowest priority:** a couple of on-screen button labels don't exactly match their accessibility labels; refresh the Browserslist data; add a code comment about the room's cache-key bump rule; do a real-browser idle-jank check while the room's assistant warms its cache; a few cosmetic S3 notes; legends-library carry-forwards (human-readable version labels, cross-namespace player IDs); and eventually upgrading the auction's own advisor to use the same real archetype-fit adapter the snake desk got.
