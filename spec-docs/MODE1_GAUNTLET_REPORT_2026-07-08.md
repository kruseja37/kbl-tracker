# MODE-1 GAUNTLET REPORT — 2026-07-08

**Leg 1 = 8-team · pool-first · shills 0 · k=0.65.** Real-browser end-to-end walk (scripted Playwright-class driver, live dev server) against main @ ~`67b39e1b`. Note: live HMR reloads hit mid-run (other lanes landing on the shared dev server) — the auction resumed cleanly from persisted state, no data loss. Per the gauntlet spec (`MODE1_PUNCHLIST_2026-07-08.md` §3), grid re-based to 8-team per the 2026-07-08 ruling (`df9acc9a`). Walker transcript: session task `a17a7f3216ebe31ea`. Report below transcribed verbatim from the walker's final output.

## VERDICT: LEG 1 PASS

---

## DRAFT A-Z: COMPLETE

The full Mode-1 journey ran start-to-finish for an 8-team league with zero manual player adds and zero console errors. **The primary blocker question is resolved: the auction-completion engine DOES complete for 8 teams with the real pool builder** — both the MLB and Farm auctions finished with every club at a legal roster.

| Phase | Result | Invariants | Console errors |
|---|---|---|---|
| League create (Gauntlet8, 8 teams, SML seed) | OK | — | 0 |
| Draft Setup — identities | Auto-fill remaining filled all 16 slots (7 CPU + 1 human) deterministically | ✓ | 0 |
| Draft Setup — pool | Initial pool illegal (176/202, tail too fat); "Regenerate production-shaped pool" fixed it to 220/220, legal, zero manual adds | ✓ legal on lock | 0 |
| Pool lock | Locked with 0 manual adds | ✓ | 0 |
| Scout reveal (MLB) | Auto-derived scout shown, no choice offered | ✓ | 0 |
| MLB Auction (220 lots) | **AUCTION COMPLETE — all 8 clubs 22/22 LEGAL** | ✓ | 0 |
| Scout reveal (Farm) | Same auto-derived pattern | ✓ | 0 |
| Farm Auction (240 lots) | **Complete, Beewolves 10/10 farmed** | ✓ (see note) | 0 |
| Staffing | Manager "L. Ward · Balanced" + reporter "N. Briggs" hired, real names generated | ✓ | 0 |
| Franchise Setup | Gauntlet8 auto-selected with "Draft complete" badge (F6 confirmed) | ✓ | 0 |
| Post-freeze summary | New screen rendered: all 8 teams show 22 MLB/10 Farm, payrolls $711k–$1.01M, fan morale | ✓ | 0 |
| Enter franchise | Lens hub loads with GM "Eli Tumblo", Mgr "L. Ward", reporter "N. Briggs" (all real, not generic); Roster tab shows full 22-man; Schedule tab is a working empty manual-entry surface | ✓ | 0 |

**Rough edges (behavior, not style):**
1. The shared-pool legality check ("Can every club build a legal 22?") went stale after regenerating the pool — showed a false ✗ ("seats 0 of 8, fails at CP") until I manually hit RE-CHECK, which then correctly showed ✓ with $481,902 to spare. A user who doesn't notice "pool changed — re-check" could misjudge pool legality either direction.
2. The "Archetype market outlook" advisory panel claimed 0 of 24 archetypes look buildable and flagged closers as the tightest market — yet the actual auction completed easily with money to spare for every team. The advisory looks overly pessimistic relative to real outcomes.
3. Farm-auction sidebar "farm gaps" panel (per-position tracker) never updated all draft long — stayed at "0 of 10, all OPEN" even as slots filled to 0 remaining. The Roster tab afterward proved the real data was correct; this is a cosmetic staleness bug in the live sidebar only.
4. Farm slots are not position-locked like the MLB "Eight" — passively passing/claiming at reserve left Beewolves with a 10/10 all-RP/CP farm class (no position players). Worth a design look: the on-screen position gaps (C GAP, 1B GAP, etc.) appear advisory only, never enforced.
5. Live HMR reloads hit mid-auction (other work landing on the shared dev server touched AuctionStage.tsx, LeagueBuilderAuctionDraft.tsx, LeagueBuilderDraftSetup.tsx, ScoutHire.tsx, App.tsx) — the auction resumed cleanly from persisted state afterward with no data loss.
6. Could not verify the press-and-hold scout-band reveal's actual numbers (both MLB and Farm) — this needs a real pointer hold and my scripted browser events didn't trigger React's onPointerDown handler. UI plumbing (locked-by-default, trait-count-only, no trait names) was confirmed correct; the band content itself is unverified due to a testing-tool limitation, not a confirmed defect.

No stall, no error banner, no "uncompletable" state was ever hit for either auction.

---

## Findings ticketed from this leg (→ `MODE1_PUNCHLIST_2026-07-08.md` §1c)

F15 (stale pool-legality check after regenerate) · F16 (archetype market advisory wildly pessimistic) · F17 (farm-gaps sidebar staleness) · F18 (farm slots not position-enforced — JK design fork) · F19 (initial pool generated illegal, regenerate recovered). Press-hold band reveal = tool-limitation note, not a defect.

**Legs remaining per the §3 grid:** ~~design-first leg (P2)~~ (leg 2 below, PASS), shills 1-2 leg, k=0 leg, 6-team leg, RUN-IT-BACK iterate leg. Update this file per run.

---

# LEG 2

**Leg 2 = 8-team · design-first · shills default · k=0.65 · league "GauntletD8".** Real-browser walk against live main (same live-dev-server/HMR caveat as leg 1). Validates P2 (design-first mode — pool-first was leg 1). Walker transcript: session task `a89cda22e05432139`. Report below transcribed verbatim from the walker's final output.

## VERDICT: LEG 2 PASS

---

## GAUNTLET LEG 2 — Design-First Mode Validation Report

**DESIGN-FIRST: LOCKABLE+DRAFTABLE**

**1. Legal, lockable pool, zero manual adds?**
YES. Extracted pool was legal on the **first attempt** — no "regenerate" click ever needed (unlike leg 1's pool-first, which needed one regenerate). Shared-pool check showed ✓ immediately: "tightest club has $717,309 to spare." After LOCK POOL triggered its automatic resize (317→246 players), the check re-ran and stayed ✓ ("tightest club has $114,755 to spare"). Zero manual player adds/removes at any point. Zero regenerate attempts needed (0 of however-many).

**2. Does the pool reflect the chosen archetypes?**
YES, strongly for the human club: the pre-lock check flagged "Design targets 12/22 included" (10 excluded for curve/cap reasons); after locking, the pool auto-resized and re-extracted, landing at **"Design targets 22/22 included."** System message confirmed the same for all 8 CPU clubs: "the pool covers the league's identities." No per-CPU-club player-level archetype label exists in the UI to spot-check individually, but the aggregate mechanism visibly works.

**3. Does the MLB auction begin and progress normally?**
YES. Ran 30 lots (target was 25+) via scripted advance/pass clicks. Multiple players sold normally to CPU clubs and market shills (e.g., Maurice Brick → Market Shill 1 for $114,756; Kay Frequin → Market Shill 2 for $91,204). Budgets decremented correctly, no stalls, no error banners, no "uncompletable" state.

**4. Invariants:**
- Console errors: **0** (checked error/warning/all — only benign Vite HMR debug logs from mid-run hot-reloads touching AuctionStage.tsx, LeagueBuilderAuctionDraft.tsx, LeagueBuilderDraftSetup.tsx, ScoutHire.tsx, App.tsx — consistent with the expected live-server caveat; auction state survived cleanly).
- Pool size: 317 raw extraction → 246 after lock (1.25× target size, 202 draft slots, +44 surplus).
- Legality check: accurate at every checkpoint, never showed a false result.
- **F15 (stale legality recheck) did NOT reproduce** — but note this leg never exercised that exact code path, since the pool never needed "Regenerate production-shaped pool" (it was legal from the first extraction). So F15 is unconfirmed-either-way here, not disproven.

**Rough edges (behavior, not style):**
1. Locking the pool silently re-runs extraction/resizing (317→246) rather than locking what was shown — the 22/22 vs 12/22 design-target jump only became visible after the fact, could confuse a user who checked fit before locking.
2. "Most you can bid" for a still-winless club drifted slightly between lots (937,990→937,844) purely from pool depletion — advisory-only, not wrong, but easy to misread as a budget change.
3. Same CPU-archetype "market outlook" pessimism pattern as leg 1 (not re-verified in depth this leg, but nothing suggested it improved).

Created league: **GauntletD8** (8 teams, Juiced tier, Auction/Taxed — same seeding as Gauntlet8).

---

## Findings ticketed from leg 2 (→ `MODE1_PUNCHLIST_2026-07-08.md`)

F20 (silent re-extraction on lock — pre-lock design-target fit can mislead) · F16 pattern re-observed (noted on the F16 row) · P2 marked LANDED-BY-GAUNTLET (§2).

**Legs remaining:** ~~shills 1-2~~ (leg 3 below), k=0, 6-team, RUN-IT-BACK iterate leg.

---

# LEG 3

**Leg 3 = shills FULL-DRAFT.** Two runs: GauntletD8 resumed from lot 30 to the end, plus "GauntletD8 Copy" (pool-first, shills=2 default) as a fresh full run after the first hit a live bug. Targets: **P10** shill dissolution at completion + farm shill-absence spot-check (F13 regression) + human-seat-never-CPU. Walker transcript: session task `a2a8684ffc9125224`. Report below transcribed verbatim.

## VERDICT: MIXED → SHILL DISSOLUTION PROVEN CLEAN (IndexedDB-verified, 8 real clubs only, zero shill roster holders) + farm shill-absence + human-seat-never-CPU all CONFIRMED. The leg's discovery — the F21 completion deadlock — was FIXED AND MERGED the same night (`3f98eb06`, lane M1Q).

---

MIXED: GauntletD8 hit a real completion-deadlock bug; the fallback league proves SHILLS DISSOLVE CLEAN once an auction actually completes.

1. Completion: GauntletD8 (resumed at lot 30/246) did NOT complete — the pool ran dry at lot 246/246 with Crocodons and Freebooters each 1 player short of a legal 22. Traced the bug: the completion gate (`finalizeTerminalAuction` in `auctionStateMachine.ts`) runs its own backfill cascade, still finds a shortfall, and permanently refuses to set state `AUCTION_COMPLETE`. But the one recovery button ("settle empty seats from Market Shills," `settleShortClubs`) only works when state IS `AUCTION_COMPLETE` — a circular deadlock with no UI escape. "NEXT LOT" clicks became true no-ops (byte-identical DOM before/after). Per the mission's fallback rule, I duplicated the league (GauntletD8 Copy, pool-first setup, shills=2 default) and drove that one through all 245 lots — it completed cleanly.

2. Shill dissolution (fresh league, real full run): "MLB DRAFT COMPLETE — THE HANDOFF CHECK" listed only the 8 real clubs, every one "22 of 22 ✓ LEGAL 22" — no shill entity appeared. Verified underneath in IndexedDB: the persisted `teamRosters` store has exactly 8 team entries (22 players each) and zero entries with a shill team ID. The two shills capped out at their designed 10-win limit and never surface as roster holders anywhere downstream — clean dissolve, no stranded players. (In the original GauntletD8's session data the shills still showed 10 held picks each in the live in-progress session object — that's normal/expected mid-draft bookkeeping, not a leak, since that draft never reached the commit step.)

3. Budgets: healthy in both runs. Fresh-league real clubs finished with $118–$387,691 left over (normal auction spread, nobody negative). Original GauntletD8's Beewolves seat (which I drove) had $607k of $1.2M left with a full roster.

4. Console errors: zero, across both MLB runs and the farm auction. HMR landed mid-session exactly as flagged (multiple vite reconnects, an unrelated whisper-panel file hot-updated) with no errors and no state corruption.

Farm auction (fresh league, 36 lots run): config showed "AI clubs: 7" with no shill slot at all; 36-lot log had zero "Market Shill" mentions — shills correctly absent. Beewolves needed an explicit human bid/pass on every single lot (73 manual actions) — confirms no CPU auto-controlled the human seat.

Rough edges: my own aggressive/naive auto-bidding in the first run likely contributed to draining the pool unevenly (should be noted as a caveat, not a clean isolated repro of the shortfall). Separately hit a distinct, narrower warning message ("Can't afford her and still fill the roster") that a naive bid-loop can spin on forever if not special-cased — minor UX/automation gotcha, not a correctness bug.

---

## Findings from leg 3 (→ `MODE1_PUNCHLIST_2026-07-08.md`)

**F21** — the completion deadlock (pool-exhausted shortfall + settle gated on `AUCTION_COMPLETE` = circular trap) — **FIXED AND MERGED same night** (lane M1Q `3f98eb06`, audit CLEAN APPROVE: automatic shill reclamation in the terminal cascade). P10 marked LANDED-BY-GAUNTLET (dissolution proof).

**Legs remaining:** k=0, 6-team, RUN-IT-BACK iterate leg.
