# CONTRACT: FLOORREFIT — the table, not a dashboard (2026-07-09)

**Status:** IN PROGRESS — this file is updated in place as the lane executes. The
prompt below is the verbatim dispatch contract this lane is executing against.

---

## VERBATIM DISPATCH PROMPT

You are a builder lane on KBL Tracker (React+TS+Vite). Work ONLY in your assigned worktree on its branch; commit there; do NOT push or merge. Independent audit follows. node_modules if missing: `cp -c -R /Users/johnkruse/Projects/kbl-tracker/node_modules ./node_modules`. Base: main @ c0a24363 (includes CALLFIX + TAXTEETH).

FIRST COMMIT: write this entire prompt verbatim to spec-docs/contracts/CONTRACT_FLOORREFIT_2026-07-09.md and commit before any code change.

READ FIRST (binding, in your worktree): spec-docs/AUCTION_FLOOR_REFIT_2026-07-09.md — the captain-ratified design you are executing EXACTLY; spec-docs/DRAFT_SKIN_STANDARD_2026-07-08.md §1-§2 (tokens/recipes); spec-docs/DRAFT_COCKPIT_DESIGN_2026-07-08.md §2 (tier IA — unchanged by this lane).

═══ LANE: FLOORREFIT — the table, not a dashboard (both auction floors) ═══
Execute the refit doc's §2 layout precisely. Summary of the six moves (the doc governs on any ambiguity):

1. **ON THE CLOCK banner** (left column, above the lot): acting team's Team.colors.primary bg + secondary 5px hard border, hard offset shadow, zero radius; text auto-contrast via relative luminance (chalk on dark, near-black on light — write one tiny helper, test it at both extremes). Copy: "{TEAM NAME} IS ON THE CLOCK" (bid turn) / "{TEAM NAME} TO NOMINATE" (nomination) / "YOU'RE UP — {TEAM NAME}" for the viewer's seat with ONE 300ms scale beat on turn arrival (CSS animation, plays once, no loop; respect prefers-reduced-motion). CPU turns render the existing calm-wait copy INSIDE the band. FALLBACK: if the floor's team record lacks populated colors, brass-on-ink band, same geometry — VERIFY which team record the floors actually hold and whether league-builder clubs carry populated colors; state the finding in the contract; ship the fallback path either way (tested).
2. **Uncage the whisper**: delete BOTH height clamps in WhisperPanel.tsx (the `max-height: min(56vh, 480px); overflow-y: auto` block and the internal `max-height: 190px; overflow-y: auto` board clamp — locate by content, line numbers have drifted). The whisper becomes the right column's natural flow; THE CALL tier gets `position: sticky; top: <sensible offset>` within the column. RESULT LAW: one scroll context — the page; zero nested `overflow-y: auto` on the floor (grep-proof it in the contract).
3. **Delete the duplicated stage seat strip**: the stage-level band(s) above the whisper that render verdict/number/fit + bid-pass ledger/next-odds/grade-band/lights duplicate whisper tiers. ATOM-BY-ATOM protocol (mandatory table in the contract): list every atom the strip renders; map each to its whisper-tier twin (per the wiring audit most already exist in THE CALL/THE READ); any atom with NO twin MOVES into its correct tier (relocation, not deletion — losing information is a REJECT). Then delete the strip surface. Tier-1 of the whisper must render whenever a human seat is active (it IS the call surface now).
4. **High-bid holder swatch**: the holder name next to HIGH BID gains a 4px left border swatch in the holding team's primary color + team abbreviation (fallback: no swatch, name as today).
5. **Market line consolidation**: the three unlabeled public-market boxes + reserve chip become ONE quiet mono line: "MARKET $lo · $mid · $hi — RESERVE $r", CONTESTED chip stays to its right. No number lost.
6. **Roster fill board moves left**: the seat's "N of 22 / gaps" board relocates from the right column's bottom to the LEFT column under the bid controls (today's dead space). Move, don't rebuild.

Both floors (MLB LeagueBuilderAuctionDraft + farm LeagueBuilderFarmAuctionDraft share AuctionStage/WhisperPanel — farm keeps its ratified tier divergences; it gets the banner, uncaging, and layout moves identically).

═══ GUARDRAILS ═══
- LAYOUT ONLY: zero information-architecture changes to whisper tiers (cockpit §2 stands); THE LIVE CALL single-source law untouched (consume worth.liveCall, never re-derive); fog law untouched; no engine files in the diff.
- Skin: ballpark tokens exclusively; the ONLY non-token colors are Team.colors.* used as data.
- Tests: this restructures DOM — testids MOVE WITH their elements (no renames/deletions); update selectors/assertions to the new structure WITHOUT weakening what they assert (every changed assertion justified in the contract); the known getByText-across-siblings pattern may need the textContent-matcher approach used by prior lanes.
- Copy: only the new banner strings above (ALWAYS-class, Text Law); no other copy changes.
- Known batch flake: LeagueBuilderDraftSetup.test.tsx — you should not touch that file; if a change forces it, judge SOLO.

═══ GATES (paste real outputs) ═══
npx tsc -b clean; npm run build exit 0; focused suites: WhisperPanel, AuctionStage, LeagueBuilderAuctionDraft (+ computeBoardAutoAdvanceLine), LeagueBuilderFarmAuctionDraft, plus the new banner/contrast-helper tests. NOT the full suite.

═══ DELIVERABLE ═══
Contract-first commit; then a commit per move (1-6) or sensible grouping; final commit updates the contract with: the atom-by-atom strip table, the colors-populated finding, the nested-scroll grep proof, per-move file:line evidence, gate outputs, honestly-flagged deviations. Final message: summary + hashes + surprises. JK's eye is the acceptance gate — a real browser pass happens after merge; your job is structural fidelity to the ratified doc. UNKNOWN mid-build = STOP and report.

---

## EXECUTION LOG (filled in as the lane proceeds)

_(to be completed)_
