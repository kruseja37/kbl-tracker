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

**Legs remaining per the §3 grid:** design-first leg (P2), shills 1-2 leg, k=0 leg, 6-team leg, RUN-IT-BACK iterate leg. Update this file per run.
