# NOW — Snake Draft: exact and shaped pool assembly ready; JK walk is the gate

**This thread belongs to the snake-draft captain line — its bookings live in the standard docs
(`SESSION_LOG.md` 2026-07-11 entries, `CURRENT_STATE.md`, `DECISIONS_LOG.md`), landed via commit
`d6c7ec49` "walkthrough wave 1". This brief is a POINTER, not the authority.**

## VERIFIED (git, 2026-07-15; latest code commit `498be692`)
- **Current thread move:** keep the build running for JK's League Builder and Snake-room browser
  walk. Snake setup now offers `TIGHT`, `COMPETITIVE`, `LOOSE`, and `FULL SOURCES` from the same
  chosen source leagues, player-version groups, and hand-add/remove shuttle used by the shared
  Draft Setup surface. The next move is browser acceptance, not more speculative hardening.
- For eight clubs the shaped targets are exactly 212 / 238 / 264 players. `FULL SOURCES` is the
  exact post-override source union. Hand adds, hand removes, and pins survive reload and reshape;
  Auction's pool controls and saved preferences remain format-isolated.
- Snake's only lock authority is the simultaneous exact 22-slot proof using each club's own cap and
  archetype tax rows. Room size never rescales those economics. All three production-source shapes
  built tax-aware legal finishes for all eight tested archetypes.
- Assistant GM is explicit and enforced: legality/solvency first, archetype identity next, then
  contextual value, while literal frozen IV stays at least 90% of the best-IV legal build. My Board
  remains the GM's own order. Source-player roster/IV edits immediately retire stale advisor reads.
- Pitcher POW/CON/SPD/FLD are not free bonuses under current canon: the base top-four rotation and
  bullpen rows tax them. Pitcher ARM is excluded; archetypes shift hitter rows and pitcher
  VEL/JNK/ACC only. This pass verified that law and did not change it.
- Final builder evidence: 15 focused files / 252 tests, TypeScript, changed-file ESLint,
  2,728-module production build, and diff integrity green. Playwright passed the pool-assembly
  journey on Mac and iPad (2/2) and the full main/companion responsive room journey (16/16).
  Independent audit repaired six initial defects plus one stale-fingerprint edge; final re-audit:
  **APPROVE**. Fresh `origin/main` was `ea66830e`; branch was 57 ahead / 0 behind before commit.
- **Pending / only gate:** JK walks actual Draft Setup and Snake Room on Mac/iPad. The dev server is
  listening on port 5173 from `/private/tmp/kbl-snake-legends-integration`.

## PRIOR VERIFIED (git, 2026-07-14; code commit `6ae55543`)
- **Current thread move:** keep the frozen preview running and hand the repaired build to JK for
  his Mac/iPad browser walk. The reported companion lag, false `CALCULATING`, team-specific fit,
  projected board tax, Assistant GM availability, and desktop scroll defects are fixed. Companion
  GMs can submit intent for the on-clock player; only the Hotseat's fresh atomic approval records
  the pick. The no-clock room has no normal Pause control; `RESUME ROOM` exists only for a real
  automatic/legacy stopped state. Independent delta re-audit is **APPROVE** with zero findings.
- Snake tax is roster-local. My Board and Assistant GM Board each construct an independent live
  22-player projection using the selected team's archetype, salary, exact cap shifts, position
  groups, and ratings. The same roster produces the same tax in a 2-, 8-, or 20-club room; room
  size is not an input. Candidate tax/fit remains contextual and updates when a board changes or a
  drafted player leaves the pool.
- Main/companion refresh no longer overlaps or rereads the entire League Builder data graph every
  cycle. Calculation state is limited to the players actually requested. Missing/failed Assistant
  workers fall back to the same validated local engine and the same Optimize Around baseline proof.
- Mac/laptop fine-pointer layouts use one document scroll; iPad retains bounded touch panes. Live
  1440x1000 proof: no horizontal overflow, false calculation state, Assistant-unavailable state,
  normal Pause, or normal-state Resume. Full Snake/companion gate: 54 files / 499 tests; sync and
  SyncModal: 112/112; production build: 2,720 modules; independent focused re-audit: 168/168.
- The production route is shared Draft Setup → `/snake-room`; the retired
  `LeagueBuilderSnakeDraft.tsx` page and `snakeDraftPoc` engine are deleted. Legacy snake URLs
  redirect into the canonical setup/room flow.
- The assembled path now covers team-first private work, exact player inspection and search,
  overall/position boards, explicit 22-slot planning, live roster and money/tax/fit/chemistry
  truth, atomic MLB pick trades and phase-appropriate corrections, immutable MLB/farm manifests,
  fog-safe farm boards with no draft-pick trades, recap
  confirmation, staffing, compact Franchise Setup, and zero-schedule launch. Pronouns remain in
  engine data and do not render.
- My Board and Asst GM Board share the same live public/player truth on main and companion. Board
  refits, salary/tax/fit/chemistry, scarcity/rival risk, opportunity cost, TAKE/WAIT/TRADE/PASS,
  and fair executable MLB pick packages recalculate as players and picks leave the room.
- The final browser-repair gate is 9 files / 133 tests, zero failures. The full repository run
  reached 10,235 passed / 15 skipped with three unrelated batch-load failures across two files;
  every affected exact subset passes solo (8/8). The exact-tree responsive plus full-production
  Playwright gate is 17/17 across both iPad orientations and a 430px companion. Strict
  changed-file lint, TypeScript, the 2,719-module production build, and diff integrity are green.
- Rapid My Board/Optimize changes use ordered worker epochs instead of render-time state writes;
  own picks remain COMMITTED and display settled salary plus current marginal tax, rival picks
  leave boards, all drafted players leave Player Pool, and Recent Picks expands to the complete
  numbered log. Older leagues missing Snake-specific archetype selection now use the team's saved
  MLB archetype rather than silently degrading every fit to weak.
- Companion instructions now discover Vite's real same-Wi-Fi address and include the room code in
  the URL; the claim screen prefills it. The configured Supabase hostname is externally
  unreachable and the connected account exposes no project, so real login still requires an
  active Supabase project connection. The UI now reports that condition instead of raw Safari
  `Load failed` or the false `Supabase not configured` diagnosis.
- Walkthrough wave 1 merged as PRs #90-#98: unified setup (UNIFYSETUP), room performance
  (PERFROOM: room-code write-once + field-patch persistence; 217,865→1 proofs), route bridge,
  room fixes. Design/plan of record: `spec-docs/SNAKE_DRAFT_VISION_2026-07-10.md` +
  `spec-docs/SNAKE_DRAFT_V1_PROGRAM_2026-07-10.md` (lanes S0-S7).
- The snake POC flag was deliberately retired (compiles OFF — "the real snake draft shipped");
  its test/descriptor mismatch on main was fixed by the snake thread itself (#96-#98 era) and
  the living-season thread's SWITCH-3A rebase adopted that truth.
- **Help-button UI law RATIFIED into `SESSION_RULES.md` non-negotiables** (commit `beaad38f`,
  2026-07-12) — explanatory copy behind a per-screen `?` Help affordance, inline text limited to
  labels/values/states/one-line consequences, decision-critical warnings stay inline; density
  corollary rides with it.
- **Wave 1.5 MERGED to `main`:** **PR #110 COMPANIONAUTH** (merge `3116ddc9`) — the companion
  page (`/snake-companion`) now has a real fail-closed sign-in gate, honest empty/pulling states,
  account email + sign-out, AND a captain-found cross-device clobber fix (companion claim/board
  saves were whole-session-row writes against a row-last-write-wins cloud store; now atomic
  field-patches with pull-before-write). **PR #111 HELPSWEEP** (merge `d6c988e9`, then-current `main`
  tip) — applies the ratified help-button law across every snake screen (13 strings relocated,
  2 deleted, price chart collapsed by default) plus JK's ruled **board-first room layout**
  (team's own draft board is now the primary column; commissioner/ceremony panel compacted into
  a sticky ~400px right rail). Both opus-audited APPROVE-WITH-NOTES, all notes resolved; full
  suites 100% green (659/9,774 and 658/9,770 respectively). Contracts:
  `spec-docs/contracts/CONTRACT_COMPANIONAUTH_2026-07-12.md`,
  `spec-docs/contracts/CONTRACT_HELPSWEEP_2026-07-12.md`.

## OPEN ACCEPTANCE ONLY
- **Companion cross-device behavior is code-, sync-, and two-origin-browser-verified but still
  unaccepted on real hardware.** JK's own phone/iPad-to-Mac round-trip (same Wi-Fi, same account)
  belongs inside the final hands-on walk after the external Supabase project connection is live.
- JK should walk the MLB room, pick trade, FARM draft, recap/staffing handoff, zero-schedule launch,
  and later schedule entry. His browser walk remains the sole acceptance gate.
- A smaller ticketed finding: the Draft Setup "can't legally seat every club at 22 under the cap"
  blocker message misdirects (an SML-import repro found raising the cap 1.2M→10M changed
  nothing — the real constraint is position-supply shape, not the cap number).
- The snake draft is the ruled v1 flagship draft path; the auction stays routed/testable,
  frozen for v2.
- General state: code/system/UI crawl repairs are committed; JK walkthrough findings, not an
  agent's visual opinion, decide acceptance and any next repair queue.

## ADDENDUM (2026-07-12 early AM) — EXECUTED, see VERIFIED above
JK held a paste-ready walkthrough prompt (delivered in the living-season thread's chat) that
opened with the now-RATIFIED help-button law + density corollary (SESSION_RULES canon) and
ordered a pre-walkthrough explainer-text sweep of every snake screen, then the companion
sign-in fix, then the wave protocol. **Both pieces of that order are now done and merged** —
PR #111 HELPSWEEP (the explainer sweep + board-first layout) and PR #110 COMPANIONAUTH (the
sign-in fix) — see the VERIFIED section above for the git-checked detail. If a fresh prompt is
ever needed again: reconstruct from SESSION_RULES "Help-Button UI Law" + this folder's briefs.
