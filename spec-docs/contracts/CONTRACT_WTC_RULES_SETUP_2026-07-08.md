# CONTRACT WT-C: Rules Setup Cleanup (2026-07-08)

You are a builder on the KBL Tracker repo (React+TS+Vite+IndexedDB tracker for Super Mega Baseball 4). You are working in an isolated git worktree (your cwd) on your own branch off main. Deliver LANE WT-C: rules-setup cleanup per JK ruling 2026-07-08 — "remove dead page entirely and simplify customizable, wired setup". Commit in your worktree branch when green; do NOT push, do NOT merge — the captain merges after an adversarial audit.

## SETUP (do this first):
1. Your worktree has no node_modules. Clone it: `cp -c -R /Users/johnkruse/Projects/kbl-tracker/node_modules ./node_modules` (APFS clone, fast).
2. Write this entire contract to spec-docs/contracts/CONTRACT_WTC_RULES_SETUP_2026-07-08.md and include it in your commit.

## CONTEXT (tracer-verified)
The old standalone rules-preset editor was pruned this morning (commits 8ceaaf3e/d2795095, merged d35f6a62) leaving a 30-line stub at src/src_figma/app/pages/LeagueBuilderRules.tsx (route /league-builder/rules registered at src/App.tsx:410; note main.tsx mounts src/App.tsx, NOT src/src_figma/app/App.tsx). Nothing links to it anymore (the hub card was deleted). The canonical rules surface for v1 is Franchise Setup's Season step: src/src_figma/app/pages/FranchiseSetup.tsx, Step2SeasonSettings at :787, wizard order League/Season/Playoffs/Teams/Rosters/Confirm at :446. Current gaps JK hit in his walkthrough: games-per-team is a fixed button set [16,32,40,80,128,162] (:867) and innings-per-game a fixed set [6,7,9] (:893) with NO free entry; the extra-innings rule (Standard / Runner-on-2nd, with a start-in-1st-or-2nd-extra-inning choice at :920/:956-958) exists but JK didn't notice it — check whether it's conditionally hidden or just easy to miss.

## CHANGE 1: delete the dead rules page entirely
- Delete src/src_figma/app/pages/LeagueBuilderRules.tsx and its characterization test src/src_figma/__tests__/leagueBuilder/LeagueBuilderRules.test.tsx.
- Remove the route registration at src/App.tsx:410 and any entry in the unused routes.tsx.
- `grep -rn "league-builder/rules" src/` and `grep -rn "LeagueBuilderRules" src/` — remove every remaining reference (imports, nav links, route constants). Report each site you touched. If any LIVE surface still links to the route (tracer believes none do), replace that link with a link to Franchise Setup rather than leaving a 404.

## CHANGE 2: make the Season step genuinely customizable
a. Games-per-team (:867): keep the preset buttons as quick picks, ADD a free-entry numeric input ("Custom"). Before choosing bounds, READ the schedule generator this value feeds (trace where FranchiseSetup persists it and which generator consumes it) and derive the real constraints (e.g., divisibility/parity requirements for a balanced schedule given team count). Clamp + inline-explain constraints in the UI (plain copy, e.g. "must be even" if that's what the generator needs — derive, don't guess). If the generator genuinely can't handle arbitrary values, constrain the input to what it CAN handle and report the limitation precisely.
b. Innings-per-game (:893): keep preset buttons [6,7,9], add free-entry with bounds 3–9 (SMB4 game lengths; extra innings extend naturally beyond regulation). Verify what consumes inningsPerGame downstream (game config → GameTracker regulation-inning logic) and confirm an off-preset value (e.g. 5) flows through without breaking — file:line trace in your report. DO NOT modify GameTracker itself (frozen surface); if an off-preset value would break GameTracker, constrain the input to safe values and report.
c. Extra-innings rule (:920/:956-958): determine why JK missed it — if it's conditionally rendered, gated, or visually buried, surface it plainly in the Season step (always visible when extras rule matters). Keep the existing two modes (Standard / Runner-on-2nd + the 1st-vs-2nd extra-inning start choice) — do NOT invent new modes. Style: match the existing wizard components exactly; this is an additive tweak, not a redesign.
d. WIRING PROOF (required in report, file:line for each): games-per-team → persisted where → consumed by schedule generation where; innings-per-game → persisted where → consumed where; extras rule → persisted where → consumed where (the runner-on-2nd GameTracker integration is a nav-shim — verify the setting reaches it, don't touch GameTracker internals).

## TESTS
- Update/replace any suites referencing the deleted page.
- Extend FranchiseSetup tests (find the existing suite covering Step2SeasonSettings) to cover: custom games value accepted + clamped per constraints; custom innings accepted within 3–9 and rejected outside; extras-rule control visible and persisting both modes. NOTE: franchise user-facing strings are characterization-test-locked in places — if a copy assertion breaks because you surfaced/relabeled something, update the test deliberately and say so in your report.

## GATES (all must pass before commit; paste real output)
1. `npx tsc -b --pretty false` — exit 0.
2. `npm run build` — exit 0.
3. Focused suites: `NODE_ENV= npx vitest run` on the FranchiseSetup suite(s), anything that referenced LeagueBuilderRules, and any router/App-level test touching the deleted route.
DO NOT run the full vitest suite (captain runs it once post-merge; three lanes share this machine).

## DO NOT touch
spec-docs/UI_TRUTH_MAP.md, SESSION_LOG.md, CURRENT_STATE.md, V1_BUILD_STATUS.md, DECISIONS_LOG.md, MODE1_PUNCHLIST (captain/scribe-owned); src/src_figma/app/pages/GameTracker.tsx and src/src_figma/hooks/useGameState.ts (frozen); the auction pages (another lane owns them); Builder.tsx / LeagueBuilderPlayers.tsx / franchisePlayerProfileEdit.ts / DraftFlow.tsx / prospectScoutingDraftEngine.ts / leaguePoolAxisRegen.ts (another lane owns them).

## Commit message
`feat(rules): delete dead rules page; custom season length + innings entry, surfaced extras rule in Franchise Setup [WT-C]` with trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

## REPORT back (final message)
Branch + worktree path + commit hash; every deleted-reference site; the derived schedule-generator constraints and the exact clamp rules you shipped; the three wiring traces (file:line chains); why the extras rule was missable and what you changed; verbatim gate outputs (tails fine); surprises. If anything in this contract contradicts the code you find, STOP that item and report the discrepancy instead of improvising.
