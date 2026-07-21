# NOW — Snake Draft: multi-team companion verified; JK walk is the gate

**This thread belongs to the snake-draft captain line — its bookings live in the standard docs
(`SESSION_LOG.md` 2026-07-11 entries, `CURRENT_STATE.md`, `DECISIONS_LOG.md`), landed via commit
`d6c7ec49` "walkthrough wave 1". This brief is a POINTER, not the authority.**

## REPAIRED / SAME-AUDITOR RECHECK PENDING (2026-07-20; FINDING-253)
- Three Legends libraries contain 835 cards for 345 people. Tight, Competitive, and Loose now count
  one person once, shape the named pool before proof, and use Full Sources only as a final fallback.
- Four-team Loose is 132 people. Eight-team Loose is 264 people. Both pass the independent final
  proof and the balanced curve limits. Three eight-team rooms cover all 24 identities.
- The first auditor blocked `7960b043`, Major 1 / Minor 1, because protected sibling cards still
  inflated floors and curve counts. That path is repaired and directly tested.
- A separate calibration boundary is also repaired: safe source-by-club workloads use exact search;
  larger workloads use bounded search; the independent validator still owns SUCCESS.
- Builder gates are green. **Next:** same-auditor approval, one replacement preview, then JK's
  four-team and eight-team Legends-source browser walk. Production is unchanged.

## INDEPENDENTLY APPROVED / MIGRATION APPLIED / PREVIEW PENDING (2026-07-20; FINDING-249)
- FARM now uses the dedicated Snake live-room authority instead of the old Hotseat-only path.
  Hotseat alone writes public picks, order, rosters, and completion. An approved companion writes
  only its private fogged scout board and sends a pick request for Hotseat confirmation.
- The first separate audit blocked `256962dd`, Major 3 / Minor 0. UI-only trade removal did not stop
  raw FARM trade or pause RPC calls; extra catalog fields could leak private data; and correction
  used local state instead of the cloud recovery slot.
- The first repair rejected FARM trade and pause actions, added exact catalog field allowlists, and
  moved correction to the cloud recovery slot. The same auditor then blocked `1e53eb8f`, Major 2 /
  Minor 0: SQL did not require scalar identity values, and `PICK_RECORDED` did not prove one legal
  state transition. The second repair aligns TypeScript, the server model, and SQL. It accepts one
  next pick only and rejects changes to pause, trades, order, version state, or other session facts.
  The final frozen code head `7a44d2b6` received **APPROVE — Major 0 / Minor 0** from the same
  read-only auditor. Independent proof passed 33/33 focused tests, 227/227 broad Snake live-room
  tests, TypeScript, changed-file lint, diff integrity, and the 2,744-module production/PWA build.
- Migration `20260720213000_farm_snake_live_catalog.sql` extends the installed live-room catalog
  validator to FARM. It is applied; local and remote histories match and linked-schema lint reports
  no errors. The combined FINDING-249/250 code head `e8c7ee59` received a separate **APPROVE — Major
  0 / Minor 0** verdict. **Next:** push the integrated branch and create one preview. JK's browser
  walk remains the product gate.

## INDEPENDENTLY APPROVED / PREVIEW PENDING (2026-07-20; FINDING-250)
- The exact failing preview is commit `3f2b30cd`; its certification code matches isolated source
  `db8a6426`. The valid four-club room has 1,341 cards and 851 distinct people.
- Root cause: card count selected the large-source pruning path, then a six-card identity-role fit
  depth under-sampled Murderers' Row. The proof correctly refused to change UNKNOWN to SUCCESS.
- The generic repair counts people at the cutoff and keeps at least half a legal roster per fit
  lens. Four-team and eight-team rooms still use the same proof. FIT, tax, sources, named bounds,
  roster law, and Start Draft meaning did not change.
- The first auditor returned BLOCK, Major 2 / Minor 1. The repaired diff binds Lock to the exact
  accepted source, club, preset, basis, and membership fingerprint; keeps bounded UNKNOWN club-
  neutral; and removes one out-of-contract adapter edit. Target-pool free-agent assignments no
  longer change the selected source universe.
- The same auditor next returned BLOCK, Major 1 / Minor 0. The accepted source key now includes
  `sourceId`, `versionGroupId`, and legacy `historicalSourceId`. Changing any one after Build blocks
  Lock until a new Build succeeds.
- Production-input proof is 12/12 and other focused proof is 100/100, for 112/112 affected tests.
  Career, Peak, and Draft cards count as
  one person; choosing one retires the other two in the live room. TypeScript, changed-file lint,
  production/PWA build, diff integrity, exact four/eight-team browser paths, and four-team Lock and
  Start are green.
- The same auditor approved frozen diff hash `be166c0e`, **Major 0 / Minor 0**, and closed both prior
  audit blocks. One local production preview is live at `http://127.0.0.1:4173/` and returned HTTP
  200.
- The combined FINDING-249/250 integration auditor approved exact code head `e8c7ee59`, **Major 0 /
  Minor 0**. Combined proof passed 187/187 focused tests, TypeScript, changed-file lint, the
  2,744-module production/PWA build, and all four browser journeys. **Next:** push one integrated
  branch, create one matching preview, then JK runs the four-team, eight-team, and FARM companion
  walk. JK's browser walk remains the sole product gate.

## INDEPENDENTLY APPROVED / FARM IDENTITY PREVIEW READY / JK WALK PENDING (2026-07-20; FINDING-248)
- New and recovered Snake drafts now carry each club's frozen farm identity from Draft Setup through
  the live catalog, recovery, Scout Reveal, and farm-session creation. Missing, conflicting,
  duplicate, or changed club truth fails closed.
- Legacy completed drafts that lack farm identity get one generic Snake-only repair before scouts
  are built. Auction's Generalist fallback is unchanged.
- The production farm-pool path is the canonical Standard-only prospect generator, not a Juiced
  legacy mode. N=500 matched every grade bucket exactly, with zero A+ players. True grades and
  ratings remain hidden from public room and fog-board models.
- Exact code head `914e35e9` passed builder gates and a separate read-only audit, **Major 0 / Minor
  0**. Preview `dpl_3ZkmY2ZVujBS2K5xbX6v7G9mtNk9` is READY and passed the remote root, deployed-bundle,
  and Chrome smoke. **Next:** JK tests one new and one recovered Snake league. No merge or production
  promotion is authorized.

## INDEPENDENTLY APPROVED / NEW PREVIEW NOT AUTHORIZED (2026-07-19; FINDING-246)
- JK's completed four-team browser walk produced five exact follow-ups: position-first starting
  slots, distinct public-pick and companion-submit sounds, red `LIKELY GONE`, no pitcher-FLD tax,
  and a reliable completed-draft roster handoff.
- Frozen `aeeb00a2` was rejected Major 3 / Minor 1. The repair now keys red risk to the real
  `LIKELY_GONE` state, keys the host cue only to current pending pick intent, preserves a position
  leader through a legal six-committed-depth edge, and keeps Two Way hitter FLD active under saved
  legacy caps while pitcher FLD stays retired.
- Frozen repair head `70fde7dc` passed the same non-builder auditor with **APPROVE — Major 0 /
  Minor 0** and an independent 160/160 focused gate. The builder's focused repair set is 148/148.
  The full production-shape gate also completed both
  four- and eight-team rooms, all 176 eight-team picks, all four pool presets at Standard and Nerfed,
  and a ready Assistant GM on every turn. TypeScript, changed-file lint, and diff integrity are
  green. The 2,744-module production/PWA build is green. Only an explicitly authorized push and new
  preview remain before JK's browser re-walk.
- Current tax law has 17 active rows: five hitter rows; rotation POW/CON/SPD plus VEL/JNK/ACC; and
  bullpen POW/CON/SPD plus VEL/JNK/ACC. Ordinary pitcher FLD remains salary/IV value but creates no
  tax. A true Two Way player's position-player FLD still enters the hitter row at full use.
- No merge, push, deployment, or product acceptance is authorized by this repair.

## VERIFIED / JK RE-WALK OPEN (2026-07-16; WALKTHROUGH WAVE 2)
- The live decision desk now keeps committed roster truth ahead of projections: the highest-IV
  owned closer owns CP, other owned closers remain legal depth, complete saved boards are repaired
  on reopen, and undrafted extra closers do not enter normal completed plans.
- Owned players remain on both private 22s as team-colored `ROSTER` rows; rival picks leave private
  actionable boards and Player Pool. Player Pool adds local fit filtering and Board/Fit/IV/signed
  Tax If Picked/True Cost/rating views. Snake IV is salary, so no duplicate Salary sort exists;
  only `TOP` writes to the current Overall or position board.
- Repeated per-player unavailable/calculating copy is gone. Only actionable player risk remains;
  Assistant methodology and diagnostics stay behind Help, and the live title is `ASST GM 22`.
- Focused gates are 139/139 plus lifecycle 36/36; the post-audit closer gate is 67/67 and the
  main/companion gate is 45/45. TypeScript, changed-file lint, production build, and diff integrity
  are green. Mac/iPad checks found no overflow or console errors; sorts measured 38-61 ms, filters
  22-83 ms, and contextual `TOP` 279 ms.
- A separate auditor found one complete-saved-board CP bypass, verified narrow repair `8a2602eb`,
  then returned **APPROVE with zero findings**. No merge or deploy is authorized here. **Next move:**
  update PR #115 and return the room to JK for browser walkthrough wave 2; that walk is the sole
  product-acceptance gate.

## BUILDER COMPLETE / AUDIT PENDING (2026-07-16; RELEASE-SUITE REPAIR)
- The isolated release-suite failures are repaired without weakening production validation. The
  identity builder now keeps legality, solvency, and IV floor first, then requires a feasible
  positive boosted-cohort expression before choosing by full boost-and-sacrifice fit. All 24
  Standard identities pass; Bomba Squad now lands at positive boost with 98% baseline IV.
- The completed Snake-to-Franchise fixture now contains the same frozen farm prospect snapshot and
  slot salary required in production. The production handoff still fails closed when frozen farm IV
  truth is genuinely absent.
- D5's gauntlet assertion now reflects current usage-aware tax: two of eight teams pay a combined
  $7,079.52, and every charged dollar exactly matches independently recomputed final liability. No
  tax engine was changed. The four stale picker snapshot sections now match the already-ratified
  starter-hitting copy and axes.
- The eight-team Standard/Nerfed x four-preset proof is unchanged and passes all 6 tests; its heavy
  gate measured 206.778s in isolation, so its explicit bound is 300s rather than the false 180s
  failure. `poolFromDemand` was left unchanged after passing 63/63 in isolation and 63/63 in the
  surrounding contention run.
- **Next move:** separate non-builder audit and bounded release-suite rerun; JK's browser walk remains
  the product acceptance gate.

## BUILDER COMPLETE / AUDIT PENDING (2026-07-16; LEGENDS-IMPORT-RECOVERY-32)
- League Builder now has a narrow repair path for the reproduced partial Legends import collision.
  Normal import still refuses every non-Legends owner. Repair is offered only when a complete
  read-only preflight proves every non-Legends `hl:` row is an exact pinned-payload card, owned by
  exactly `League Builder`, and unassigned.
- Repair validates the pinned asset before storage inspection, preflights the entire candidate set
  before any write, adopts only proven legacy rows, and reconciles through the normal importer.
  Assigned, SMB4, MLB, custom, mixed, and non-payload cases all produce zero mutation.
- Focused proof covers partial Draft/Peak recovery into complete Draft/Career/Peak, the real pinned
  835-card payload and all three libraries, idempotence, unrelated-player preservation, adversarial
  zero-write cases, structured UI eligibility, confirmation cancellation, success, and hidden repair
  actions for blocked/unrelated failures. TypeScript and changed-file lint are green. The subsequent
  release-build repair aligns module workers with Vite's ES output; production packaging now passes
  after 2,728 transformed modules and emits the PWA service worker normally.
- **Next move:** separate non-builder audit, then JK retries the exact League Builder import recovery
  in the browser. JK's browser result remains the acceptance gate.

## VERIFIED (2026-07-16; SNAKE-MULTI-TEAM-COMPANION-31)
- One companion device may now hold multiple separately approved team desks. Duplicate normalized
  companion GM names in Draft Setup intentionally define a team package, and capacity remains three
  distinct companion packages/devices rather than three teams. Unnamed companion teams and a fourth
  distinct package remain blocked.
- Authorization is exact per `(deviceId, teamId)`. Package claims create one pending row per team;
  Hotseat approves or refuses each team independently without erasing approved siblings. Board,
  Assistant GM, MLB trade, and pick-intent writes all revalidate the active exact tuple, including
  after the cloud pull and inside the atomic write, so work started on a prior desk cannot land after
  a switch.
- The companion has one compact approved-team switcher and exposes exactly one private desk at a
  time. Switching teams invalidates the prior private epoch immediately, clears transient private
  state, covers the device, and requires an explicit open before the next team's branding or board
  renders. Active-team revocation follows the same cover-before-fallback law.
- Companion MLB pick submission remains intent only; Hotseat remains the authoritative confirmation
  writer. Same-account Supabase, room code, three-device ceiling, exact draft/economy engines, and
  the farm no-trade ruling are unchanged.
- Builder commit: `0d28e63f`. Proof: focused companion/setup/persistence suite 140/140; full Vitest
  exit 0; responsive real-browser journey 17/17 across main/companion Mac and iPad sizes, including
  independent two-team board mutations and cover-gated switching; TypeScript, changed-file ESLint,
  production build, and diff integrity green. The browser crawl exposed and repaired the new team
  selector's 36px touch target; it now meets the 44px law.
- Separate non-builder audit of production `0d28e63f` plus proof repair `888c144d` returned
  **VERIFIED with 0 Major / 0 Minor findings**. Independent proof: companion/setup/persistence 97/97;
  standalone snake-room persistence 60/60; pick-handoff UI/persistence 22/22; responsive browser
  17/17; TypeScript, focused lint, production build, and diff integrity green. The repaired real
  browser proof sends the active Buzzards desk's #19 Max Backstop request into the Hotseat approval
  card, runs the production approval assertion, records public truth, and advances to #20.
- **Next move / sole product gate:** JK runs the actual same-Wi-Fi Mac/iPad/phone latency and privacy
  walkthrough with multiple teams on one companion device.

## VERIFIED (builder + separate auditor, 2026-07-16; SNAKE-PITCHER-HITTING-RECALIBRATION-30)
- Exact zero-axis ablation against `9e5901d7` proved the playing-time correction made
  Flamethrowers' prior +10% rotation POW/CON and HDH Royals' prior +10% rotation CON decorative in at
  least one priority tier. The smallest simple values with visible Standard and Nerfed starter-bat
  selection are Flamethrowers +30% rotation POW/CON and HDH +40% rotation CON. Bash Brothers +15%
  rotation POW and Launch & Leather +10% rotation POW/CON already remained visible and are unchanged.
- Ordinary RP/CP hitting was explicitly checked and is not taxed as everyday offense. RP
  POW/CON/SPD exposure is `.08/.08/.16`; CP is `.05/.05/.11`. Pitcher FLD is not taxed. Two Way relievers are
  full-use hitters but are excluded from bullpen secondary rows, so the same rating is never charged
  twice. No bullpen-hitting archetype axis exists and none was added.
- The retune changes no base cap, tax coefficient, salary/IV, roster law, optimizer objective,
  reliever law, or other archetype lever. All three tiers remain 24/24 inside ±10%; maximum deviations
  remain Juiced 4.9%, Standard 2.8%, and Nerfed 3.5%. The independent non-builder audit returned
  **VERIFIED with no Major or Minor findings** after reproducing the old-model ablation, lower-bound
  sweep, 72 parity rosters, 48 identity rosters, RP/CP settlement, and Two Way no-double-tax proof.

## PRIOR VERIFIED (git, 2026-07-15; latest runtime commit `e26f9970`, canonical result docs `9e6fdd9e`)
- **Current thread move:** JK walks actual Draft Setup and Snake Room on Mac/iPad. Browser acceptance
  remains JK's gate; no agent visual pass can close it. The Standard/Nerfed archetype presentation
  built from `9e5901d7` is economically stale and must be regenerated from this final tax model.
- Ordinary pitcher POW/CON/SPD now enters tax and identity math at canonical role exposure rather
  than everyday-player strength. Pitcher FLD remains salary/IV value but does not enter tax.
  Pitcher ARM remains excluded.
- A true Two Way pitcher's POW/CON/SPD/FLD enters hitter rows at full use, while VEL/JNK/ACC enters
  exactly one pitching group. The same batting ratings never enter pitcher-secondary rows. SP/RP
  assignment is roster-level and settlement-exact: pure SPs fill the rotation first, only needed
  swing arms are promoted, and every other swing arm belongs to the bullpen.
- Settlement, Snake projections, My Board, Assistant GM/Best-22, pool shaping, embodiment, Auction
  recommendations, and displayed fit share that classification. Stock SP/RP Two Way Norm Fenomeno
  is explicitly proved as bullpen plus everyday hitter when four pure starters are rostered.
- Newly generated rows carry `pitcher-role-usage-v1`; markerless saved cap tables retain their exact
  legacy raw-rating economics. The deterministic generator reproduces `tierParams.ts` at SHA-256
  `de656fa5dab376547abe647cb3e30e1ab86fb0e3b0939f3e647686546c6e21f9`.
- All 72 tier/archetype rosters are legal and solvent. Juiced compatibility maximum deviation is
  4.9%; Standard is 2.8%; Nerfed is 3.5%. The four starter-hitting identities land at
  Juiced/Standard/Nerfed: Bash +0.5/−0.5/+0.4, Launch +0.4/+0.2/+0.4,
  Flamethrowers +0.4/+0.3/−0.1, HDH −0.1/+0.2/+0.4.
- Final affected proof: 17 files / 278 tests, TypeScript, changed-file ESLint with zero errors, and
  diff integrity green. A post-final full-suite attempt was environment-blocked before tests by
  `ENOSPC`; the complete affected surface is green. Production packaging remains separately blocked
  by the recorded Vite/PWA `worker.format = iife` conflict after 2,726 transformed modules.
- The independent audit's runtime verdict is **APPROVE**: it rejected and forced repairs for the old
  Two Way fit path, stock SP/RP assignment, and non-absolute simulator solvency, then independently
  reproduced all 72 legal/solvent rosters with no remaining runtime Major or Minor. This close also
  removes the stale current-state numbers that were its final documentation blocker.

## PRIOR VERIFIED (git, 2026-07-15; code commit `c5ca1e9c`)
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
- Pitcher POW/CON/SPD are not free bonuses under current canon: the base top-four rotation and
  bullpen rows tax them. Pitcher FLD and ARM are excluded from tax; archetypes shift hitter rows and pitcher
  VEL/JNK/ACC only. The POW/CON rows now use a quadratic ramp instead of a linear cliff at all three
  tiers; caps, top-four grouping, coefficients, adders, and every other tax row are unchanged. New
  or rebuilt pools receive the curve; locked/saved drafts keep their frozen `luxuryCaps`.
- Pitcher-hitting archetype analysis recommends testing this as a Flamethrowers extension, not
  adding a 25th archetype. Production archetype axes do not yet model rotation POW/CON, so no
  identity change is ratified until a joint velocity+hitting supply/parity simulation passes.
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
