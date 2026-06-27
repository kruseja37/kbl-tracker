<!-- ===== GOAL: DRAFT-PIPELINE ===== -->
## GOAL LOOP: make the full MLB-auction → farm → franchise-launch pipeline run cleanly (build-dark engine/storage level)

**ROUTE:** Build + commit in THIS worktree `/Users/johnkruse/Projects/kbl-draftfix`, branch `codex/draft-pipeline-fix` (an ISOLATED branch off `codex/franchise-v1-next`, created so this work does NOT collide with a concurrent traits-build session on the main worktree). Branch-only — do NOT commit to or touch any other worktree/branch; do NOT push. The Captain (Opus, a different model) audits your real diff after each pass.

**ROLE:** You are the builder. This is a GOAL-DRIVEN loop: keep iterating (reproduce → fix → test → re-run) until the GOAL test below is GREEN and `npm run build` is exit 0. Do as much as you can in this run; the Captain will re-dispatch you with the remaining failures if you don't finish.

**THE GOAL (your stopping condition):** A new, deterministic, headless vitest integration test that drives the WHOLE draft→franchise pipeline at the ENGINE + STORAGE level (NOT the browser, NOT React) and PASSES:
1. Seed a player pool (use the real player source — `playerDatabase` / `globalPlayers` / `convertPlayer`, whatever the league-builder actually reads; do NOT hand-fabricate fake players if a real seed path exists) and a few TEAMS whose MLB rosters start EMPTY (so the auction has open slots to fill).
2. Create an auction-format league; register a player pool to it (`registerLeaguePool`).
3. Run the **MLB auction draft to genuine completion** through the real `auctionStateMachine` + the persistence layer: nominations are surfaced, bids/claims resolve, lots are sold/passed, team rosters get filled, and the session reaches `AUCTION_COMPLETE` ONLY after real picks happened (assert ≥1 lot was actually SOLD and team rosters grew — NOT an instant vacuous complete).
4. Run the **farm/prospect draft** to completion on the same league.
5. **Launch a franchise** from the resulting league + drafted rosters (`franchiseInitializer` / the real franchise-creation path) and assert the franchise exists with teams holding the drafted players.
6. The test is deterministic (seeded) and re-runs identically.

When that test is green + the build passes + the full suite has zero NEW reds, the goal is met.

**KNOWN ROOT CAUSE (verified by the Captain — fix this first; it is the headline bug):**
- **The auction reports `AUCTION_COMPLETE` immediately and jumps to the farm draft because it silently RESUMES a stale persisted `AUCTION_COMPLETE` session.** Chain: the auction page auto-runs `loadAuction(leagueId)` on mount with no user gesture (`LeagueBuilderAuctionDraft.tsx:134`) → `getAuctionSession(leagueId, seasonNumber)` reads the saved blob (`useAuctionDraft.ts:387` → `leagueBuilderStorage.ts:1680-1696`, `STORES.AUCTION_SESSIONS`) → if `session.state === 'AUCTION_COMPLETE'`, `autoAdvanceCpu` short-circuits `if (next.state === 'AUCTION_COMPLETE') return next` (`useAuctionDraft.ts:319`) and never re-inits → the page hides BEGIN (`{!session && ...}`) and renders the "AUCTION COMPLETE / PROCEED TO FARM" block (`LeagueBuilderAuctionDraft.tsx:692`). **Nothing clears the stale session:** `Register Pool` (`LeagueBuilderLeagues.tsx:241`) calls `registerLeaguePool` but NEVER `deleteAuctionSession`; `deleteAuctionSession` (`leagueBuilderStorage.ts:1738`) is referenced ONLY by tests.
- **Likely origin of the bad blob:** an earlier init where TEAMS were already fully rostered → `buildAuctionTeams` gave `rosterSlotsRemaining === 0` (`useAuctionDraft.ts:220`, `MLB_AUCTION_ROSTER_SLOTS - mlbRoster.length`) → `findNextOpenNominationIndex` returned `-1` (`auctionStateMachine.ts:134/562-575`) → `initAuctionSession` set `AUCTION_COMPLETE` (`auctionStateMachine.ts:139`) → that vacuous-complete session got persisted and now reloads.
- **Ruled out:** "registered-pool players never feed `availablePlayerIds`" — the wiring is correct (`pool.players` → buildAuctionPlayers → `availablePlayerIds`), and an empty pool THROWS a surfaced error (`useAuctionDraft.ts:429`), not the clean farm screen.

**THE FIXES (start here, then keep going until the GOAL test is green):**
1. **Don't resume a finished auction as if it were live + clear it on an explicit redo.** Minimal correct fix: in the `Register Pool` handler (`LeagueBuilderLeagues.tsx:241`, right after `registerLeaguePool` succeeds) call `deleteAuctionSession(leagueId, MLB_AUCTION_SEASON)` so re-registering a pool (the user's explicit "redo the draft" intent) clears any stale auction and forces a fresh `initAuction` on the next BEGIN. AND/OR in `loadAuction`, do not surface a loaded `AUCTION_COMPLETE` session as a live in-progress session on entry (so BEGIN reappears) — preserve the legitimate "review a just-finished auction" path but do not block starting a new one.
2. **Ensure a fresh auction with open roster slots actually RUNS** (does not instantly complete). If teams legitimately start empty, `initAuctionSession` must produce `NOMINATION`, not `AUCTION_COMPLETE`. If the pipeline pre-rosters teams before the auction (the default-roster issue), decide + implement the correct behavior so the auction has slots to fill, and DOCUMENT the call in `DECISIONS_LOG.md`.
3. **Whatever else breaks** in steps 3–5 of the GOAL (farm draft, franchise launch) — reproduce via the test, fix, re-run. This is a troubleshooting loop: the test is the oracle.

**GROUND ANCHORS FROM SOURCE FIRST** — re-read each cited file before editing; the line numbers are from `franchise-v1-next` and may have shifted. Key files: `src/engines/auctionStateMachine.ts`, `src/src_figma/app/hooks/useAuctionDraft.ts`, `src/utils/leagueBuilderStorage.ts` (auction-session + pool storage), `src/src_figma/app/pages/LeagueBuilderLeagues.tsx` (Register Pool handler), `src/engines/leagueConstruction*` (pool registration), the farm/prospect draft engine + hook, and `franchiseInitializer.ts` (franchise creation). LOOK for existing draft / franchise-init integration tests or harnesses and EXTEND them rather than building from zero.

**CONSTRAINTS / GUARDRAILS:**
- Branch-only on `codex/draft-pipeline-fix`. Do NOT push. Do NOT touch any other worktree.
- Do NOT modify frozen artifacts: `src/data/playerDatabase.ts`, `spec-docs/reference/iv_oracle.json`, or the IV-oracle pipeline. (You may READ them to seed the test pool.)
- NO `TRACKER_DB_VERSION` bump unless a fix genuinely requires a new store — if so, STOP and flag it (it updates store-list test pins).
- Determinism is mandatory — the draft is seeded; the test must be reproducible. No `Math.random`/`Date.now`/`new Date()` newly introduced into engine/determinism-critical paths.
- Stay scoped to the DRAFT → FRANCHISE pipeline. Do NOT refactor unrelated systems (ratings, traits, WPA, etc.).
- Keep the rest of the suite green: ZERO NEW REDS vs the characterized baseline (the sole hard fail on this lineage is `wpaRuntimeBoundary`; `franchiseManualSmokeFixture`/`GameTrackerLaunchState` are order-flakes — re-run any suspected new red SOLO before judging it real).

**VERIFICATION (run all every pass; paste raw output):**
1. `NODE_ENV= npm run build` → exit 0.
2. `NODE_ENV= npx vitest run <your new integration test>` → GREEN, with the assertions proving real picks happened (≥1 lot sold, rosters grew, franchise created with drafted players).
3. `NODE_ENV= npx vitest run` (FULL suite) → report the failed-file list; zero NEW reds.
4. `git --no-pager diff --stat` → only pipeline-relevant files + the new test (+ a `DECISIONS_LOG.md` note for any product call).

**REPORT (end of each pass):** (a) which bugs you reproduced + fixed, with file:line; (b) the integration test path + what it asserts; (c) the exact GOAL steps that now PASS vs any still failing (and why); (d) any product/design call you had to make (documented in DECISIONS_LOG); (e) whether the GOAL is fully met or what remains.

**FAILURE PROTOCOL / STOP-IF:** STOP and report (do not thrash) if: (a) reaching the goal requires a `TRACKER_DB_VERSION` bump or touching a frozen file; (b) a product decision is genuinely ambiguous (e.g. "should teams start empty or pre-rostered?") and you cannot pick a defensible default — state the options; (c) the pipeline depends on a subsystem outside the draft→franchise scope that is itself broken — name it. A correct STOP with a precise reason + partial progress is success.

Use xhigh reasoning effort. Think step-by-step. Reproduce before you fix; let the GOAL test be the oracle; keep iterating until it is green.
<!-- ===== END GOAL: DRAFT-PIPELINE ===== -->
