# Exhibition vs Elimination GameTracker Parity Audit

Updated: 2026-04-24

This audit compares exhibition and elimination across every seam that touches `GameTracker`, `useGameState`, end-game/reporting, and downstream archive surfaces.

## Status Key

- `shared and aligned`
- `shared but mode-gated`
- `shared but broken in elimination`
- `exhibition-only by design`
- `missing in elimination unexpectedly`

## Parity Matrix

| Subsystem | Exhibition | Elimination | Status | Next Action |
| --- | --- | --- | --- | --- |
| Launch handoff into `GameTracker` | Launches with nav-state team/league context | Launches with copied roster snapshots, bracket ids, round/clinch context, and manual home-team selection | shared and aligned | Keep shared route-state contract stable |
| Roster hydration into live game | Uses live exhibition rosters | Uses elimination snapshot rosters copied from League Builder | shared but mode-gated | Keep verifying lineup/bench parity after substitutions and refresh |
| `Start Game` persistence | Uses same current-game snapshot path | Used same path, but stale `PRE_GAME` snapshot could win after refresh | shared but broken in elimination | Fixed with immediate `LIVE` snapshot + stale snapshot rejection; manual QA still needed |
| Refresh / durable replay | Shared `currentGame` + event-log reload flow | Shared flow, but elimination exposed the stale pregame edge more visibly | shared but broken in elimination | Fixed in `useGameState`; verify before-first-pitch and mid-game refresh manually |
| Live player-card mojo/fitness UI | Shared modal, editable in `LIVE` / `POST_FINAL_OUT` | Shared modal, but elimination could lose visible controls when player state resolved poorly or game phase recovered incorrectly | shared but broken in elimination | Fixed resolved-player fallback and dependent phase recovery; watch for any remaining player-id mismatches |
| Between-play mojo/fitness event logging | Shared `recordPlayerStateChange` path | Shared path | shared and aligned | None unless new parity gaps appear |
| Pre-game mojo persistence | Works via saved snapshot state | Works via elimination mojo/fitness snapshots + current-game snapshot | shared and aligned | None |
| End-of-game mojo snapshot carryover | Not used beyond completed game | Saves elimination inter-game snapshots for next bracket game | shared but mode-gated | Keep current elimination-only snapshot writeback |
| Enrichment panel | Shared | Shared | shared and aligned | None |
| Fielding event extraction | Shared | Shared | shared and aligned | None |
| Gem attribution | Automatic primary credit only | Automatic primary credit plus explicit extra credit for later fielders | shared but mode-gated | Fixed primary-credit regression; keep extra-credit UI elimination/exhibition agnostic |
| Runner-out / advance fielding credit | Shared helper path | Shared helper path | shared and aligned | None |
| Undo / live log correction | Shared | Shared | shared and aligned | Manual QA after elimination refresh is still worthwhile |
| End-game processing | Shared archive + summary pipeline | Shared pipeline plus playoff series recording, run fame append, all-time elimination stats append | shared but mode-gated | None |
| Reporter / story outputs | Shared commentary/postgame systems | Shared systems with elimination competition context and bracket metadata | shared and aligned | Keep verifying refresh-resume preserves mode labeling |
| Post-game navigation | Shared summary page | Shared summary page, returns to elimination bracket | shared and aligned | Manual QA after refresh and final-out flow |
| Almanac player card stats | Exhibition instances supported | Elimination instances supported with run totals + all-time elimination totals | shared but mode-gated | None |
| Almanac game archive browser | Mature exhibition game browser | Dedicated elimination game browser with run filter | shared but mode-gated | None |
| Almanac global search fallback | Searches canonical players plus exhibition archived instances | Elimination archived instances are not first-class in the fallback search path | missing in elimination unexpectedly | Add elimination-aware archived-instance fallback search |
| Almanac mode landing / archive depth | Exhibition has broader established surfaces | Elimination now has a dedicated archive browser, but not all exhibition discovery surfaces are mirrored | shared but broken in elimination | Decide whether to mirror full exhibition archive affordances or keep elimination lighter |
| Save deletion vs archive retention | Exhibition history persists independently of live save | Elimination history now persists independently of live save | shared and aligned | Keep current intentional split |

## Immediate Follow-Up Backlog

### High priority

1. Verify the `Start Game` refresh fix in-browser for:
   - refresh immediately after `Start Game`
   - refresh after at least one at-bat
   - refresh after a between-play mojo/fitness change
2. Verify live elimination player cards now always show `Update Mojo` and `Update Fitness` during `LIVE`.
3. Verify the first fielder gets gem credit again on:
   - simple diving catch
   - diving stop plus later putout
   - explicit later extra-gem credit

### Medium priority

1. Add elimination archived-instance fallback into Almanac global search.
2. Compare exhibition vs elimination player-card affordances line-by-line and confirm no hidden UI gating remains.
3. Compare exhibition vs elimination refresh behavior around:
   - undo after refresh
   - lineup state after refresh
   - between-inning enrichment after refresh

### Lower priority

1. Decide whether elimination should mirror every exhibition Almanac surface or keep only:
   - player cards
   - run archive browser
   - historical game browsing
2. If full parity is desired, add a second audit focused only on Almanac and reporter discovery flows.

## Decision Notes

- Manual home-team selection before each elimination game is intentional divergence, not a parity bug.
- Elimination inter-game mojo/fitness snapshot carryover is intentional divergence, not a parity bug.
- Historical archive retention after deleting a live elimination save is intentional divergence, not a parity bug.
