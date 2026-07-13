# CONTRACT — SNAKE INTELLIGENCE: MY BOARD, ASST GM BOARD, AND FAIR TRADES

**Date:** 2026-07-13  
**Base checkpoint:** `99d130805bd36227b4e8ff68aa53970c4ee0458b`  
**Branch:** `codex/snake-mock-draft-ready`  
**Authority:** JK approval of FINDING-152's ten-recommendation plan  
**Builder/auditor law:** separate agents; JK browser walk is the sole acceptance gate

## Product contract

1. **My Board is the GM's persisted plan.** An overall or position reorder immediately refits all
   22 unique slots from the new rankings on main and approved companion devices. Multi-position
   feasibility remains deterministic and scarce-role-safe. Report the number of changed slots and
   provide one-step Undo; never require a second Apply action.
2. **Asst GM Board is a separate derived view.** It recomputes from the current picked roster and
   available MLB pool using existing canonical fit, need, money/tax, chemistry, scarcity,
   replacement, and legal-finish engines. It never mutates My Board unless the GM explicitly copies
   a player/plan, never records a pick, and never persists rival/private information.
3. **Selected-player decisions are fully priced.** A click identifies the exact My Board player
   displaced and the before/after salary, tax, all-in, money-left, five-family chemistry, fit, and
   legal-finish consequences. Replace the detached two-dropdown What-If workflow with this direct
   compare/keep/revert path.
4. **Advice is actionable.** The private desk may render TAKE NOW, SAFE TO WAIT, TRADE TO #N, or
   PASS only when the engine can support the call. Neutral state creates no alert. A selected player
   may be pinned for an "optimize around" assistant read.
5. **Availability and rival pressure are public-model estimates.** Use only locked public
   archetypes, public picked rosters, public pick ownership/order, available players, frozen IV,
   tax rules, and canonical roster needs. Never use rival private rankings/boards. Counts must count
   genuine interested clubs, not the single predicted drafter. Probability/ranges require a
   deterministic, tested scenario ensemble and honest unavailable/pending states.
6. **Position cliffs are compact.** A position view may show viable options left, clubs still
   needing the role, and value/replacement drop. No explanatory prose outside Help.
7. **Trade-up packages must be strategically fair.** Equal pick counts remain required and
   balancing return picks remain supported. A buyer moving up may not underpay the seller at posted
   value. Search all authorized package sizes before choosing; minimize value gap before package
   complexity. Posted pick values must be monotone and derived from the current frozen pool's
   expected player surplus rather than raw nth-player IV alone. Recommendation and execution both
   revalidate current ownership, revision, equal turns, posted value, and legal finishes.
8. **Team-first privacy and parity remain binding.** Main and companion calculate only the selected
   or claimed club's private state. Switching/covering removes prior private DOM before paint.
   Off-clock work remains allowed; only the live pick owner may draft.
9. **Screen value law.** Keep player pool, profile, board/rankings, selected-player consequences,
   real-time plan/roster truth, legal finish, privacy, correction, and commissioner execution.
   Remove or fold detached What-If dropdowns, misleading 0/1 buyer copy, worthless one-for-one
   trade-up results, and neutral/no-action assistant noise. Do not add a new dashboard or opaque
   assistant score.
10. **Presentation law.** Existing KBL palette and team primary/secondary identity remain. Pronouns
    remain stored but are not displayed. No inline tutorial/explainer copy; Help is the only
    explanation surface.

## Frozen boundaries

- MLB snake only. Do not change auction draft behavior, auction math, farm draft truth/fog, farm
  salaries, manifests, roster handoff, staffing, schedule, Living Season, GameTracker, or franchise
  launch.
- Reuse canonical engines; do not fork tax, chemistry, roster legality, player identity, or
  archetype math in UI components.
- No LLM-generated numbers/verdicts. Template copy only unless an existing facts-validated dressing
  seam is reused without becoming a dependency.
- No second storage model. My Board continues through seat-local optimistic locking; Asst GM Board
  is derived unless a later audited need proves otherwise.

## Controlled batches

### Batch 1 — My Board correctness

Allowed product files: `desk/deskModel.ts`, `pages/SnakeDraftRoom.tsx`,
`pages/SnakeCompanion.tsx`, and `components/snake/SnakeDraftRoomView.tsx` only for the room's
existing write-notice action surface. Allowed tests: their existing desk/room/companion tests only. Reorder
must call the existing deterministic refit, persist only the active seat, recalculate plan truth,
and expose one-step Undo. Tests that assert stale slots must be replaced with mutation-honest refit
assertions.

### Batch 2 — Fair posted trade packages

Allowed product files: `src/engines/snakeGuideTrade.ts`, the smallest canonical pick-value module
surface required, snake trade adapter/components, and their owned tests. Map and verify every caller
before changing a shared signature. No auction transaction or CPU auction behavior changes.

Frozen Batch 2 implementation ruling:

- Change `derivePickValueChart` to require explicit frozen IVs, `draftPickCount`, and `teamCount`.
  Sort finite IVs descending. `expectedIV(p)` is the mean of ranks `p..p+teamCount-1`, padding past
  the pool with the final IV. `replacementIV = expectedIV(draftPickCount + 1)`.
  `lateFloor = max(1, round(expectedIV(draftPickCount) - replacementIV))`.
  `value(p) = round(max(lateFloor, expectedIV(p) - replacementIV))` for exactly every drafted pick.
  Flat and exact-floor pools must remain finite, positive, monotone, and deterministic.
- The cohort mean must be scale-safe: finite IV inputs, including repeated `Number.MAX_VALUE`, may not
  overflow to `Infinity`/`NaN`. Clamp only at the numeric representation boundary; normal canonical IV
  values must preserve the exact formula.
- Both live register-pool callers pass their explicit MLB slot count and actual league club count;
  room and companion pass `session.pickOrder.length` and the current league-team count. `PoolConfig`
  may keep an inference fallback for legacy/direct test callers only. Map every direct chart caller.
- Do not change shared `validateTrade`; farm uses it. MLB adds a directional check requiring
  `offerValue >= receiveValue` and retains the canonical 15% imbalance ceiling.
- Search all equal-count one-, two-, and three-pick packages. Remove the first-count early exit.
  Rank survivors by smallest raw seller premium (`offerValue - receiveValue`), then imbalance,
  then fewer picks, then lexicographic offer/receive lists. Keep brute-force parity as the oracle.
- Execution must prove distinct buyer/seller; unique picks on each side; disjoint sides; equal
  unique counts; target pick present on the receive side and currently seller-owned; every pick
  future-owned by the named club; current revision; current canonical posted totals; and both
  constructive legal finishes. Reject tampered totals rather than persisting caller values.
- Exact product files for this batch are `src/engines/leagueConstruction.ts`,
  `src/engines/snakeGuideTrade.ts`, `src/src_figma/app/pages/SnakeDraftRoom.tsx`, and
  `src/src_figma/app/pages/SnakeCompanion.tsx`; the audit-approved explicit-club-count repair also
  allows `src/utils/leagueBuilderPoolRegistration.ts` and
  `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx`. Owned tests may change only in
  `src/engines/__tests__/leagueConstruction.test.ts`,
  `src/engines/__tests__/snakeEconomicsGuide.test.ts`,
  `src/src_figma/app/components/snake/trade/__tests__/tradeGuideModel.test.ts`,
  `src/src_figma/__tests__/pages/SnakeDraftRoom.performance.test.tsx`, and
  `src/utils/tests/snakeSeasonGauntlet.integration.test.ts`.
- Mutation-honest gates: monotone/flat/exact-floor chart; a real balancing-return package without
  hand-pinned production values; underpay-within-15% rejection; all-size search beating the old
  early exit; gap-before-complexity; insufficient capital; brute-force parity; duplicate/overlap/
  self/target-mismatch rejection; stale ownership; and caller-tampered total rejection.
- Add a finite-extreme chart gate and prove both live register-pool callers pass their actual club count.
- Verification-only gates include `snakeFarmSlots.test.ts`, `SnakeTradeGuide.test.tsx`, room and
  companion integrations, auction register-pool tests, full build, and the full suite.

### Batch 3 — Separate Asst GM Board and direct consequences

#### Batch 3A — shared derived intelligence core

Allowed product files are exactly:

- `src/engines/snakeAssistantBoard.ts` (new pure engine),
- `src/src_figma/app/components/snake/desk/snakeDeskIntelligenceModel.ts` (new serializable adapter),
- `src/src_figma/app/components/snake/desk/useSnakeAssistantBoard.ts` (new fail-closed hook), and
- `src/src_figma/app/workers/snakeAssistantBoard.worker.ts` (new worker).

Owned tests may be added only at the matching engine and desk test paths. Existing canonical tax,
chemistry, legality, identity, Best-22, and roster-design engines are read-only in this slice.

Frozen implementation rulings:

- The candidate universe is the selected club's own completed MLB picks plus currently available,
  version-valid players from the frozen active pool. Rival-drafted players and alternate versions of
  selected/drafted identities are excluded. A drafted player's cost is the session's settled salary;
  an available player's price/IV is the frozen pool value. Stored mutable player salary is never
  allowed to replace either source.
- Pin every completed pick owned by the selected club, plus the optional selected player for
  `OPTIMIZE AROUND`, into the canonical 22 design slots through deterministic maximum matching using
  `isDesignPlayerEligibleForSlot`. Then call `buildBest22Target`. A result is available only when it
  contains exactly 22 unique, version-unique players, every required pin was honored, all non-owned
  players remain available, the canonical roster is legal, and the plan is solvent. Any missing
  input, dropped pin, partial build, stale result, or infeasible plan returns explicit pending or
  unavailable state; it never returns a partial board.
- Existing fit/current-need math from `computeOwnValue`, existing chemistry premium and GM preference
  blend from `assembleBoard`, and the canonical Best-22 objective order the available candidates.
  The GM's rankings are a soft preference only. Do not invent, store, or display a new assistant
  score. Recompute the returned plan with `evaluateSnakePlan` and all five chemistry families with
  `buildChemistryStrip` before exposing it.
- The output is a new derived record with no board `revision`, storage writer, draft action, or trade
  action. It can never be passed to the My Board optimistic-lock writer by structural typing.
- Best-22 work runs off the UI thread. The request/result key binds session id and revision, private
  team/seat/device identity, current My Board revision, frozen available/version signature, settled
  and frozen prices, locked team archetype, and optional selected pin. A key mismatch, cover, revoke,
  team switch, or worker failure clears prior output and renders pending/unavailable rather than stale
  private truth.

Mutation-honest gates must prove: own picks are pins; settled salary beats stored salary; frozen IV
beats stored salary for available players; rival picks and alternate versions cannot enter; all 22
are unique/legal/solvent; multi-position pin matching is deterministic; dropped pins and stale worker
results fail closed; My Board is byte-unchanged; and identical main/companion inputs return identical
derived results.

#### Batch 3B — main/companion board view and selected-player consequences

Allowed product files are exactly:

- `src/src_figma/app/components/snake/desk/PrivateDesk.tsx`,
- `src/src_figma/app/components/snake/desk/SelectedPlayerCard.tsx`,
- `src/src_figma/app/components/snake/desk/BoardView.tsx` only if the existing read-only board renderer
  cannot label the derived view,
- `src/src_figma/app/components/snake/desk/snakeDeskIntelligenceModel.ts`,
- `src/src_figma/app/components/snake/desk/useSnakeAssistantBoard.ts`,
- `src/src_figma/app/pages/SnakeDraftRoom.tsx`, and
- `src/src_figma/app/pages/SnakeCompanion.tsx`.

Owned tests are the matching desk component/model/hook tests plus existing room `2a`, companion `2b`,
privacy, and performance integrations. `WhatIfSandbox.tsx` is not rendered after this slice but is not
deleted until Batch 5 proves the replacement.

Frozen implementation rulings:

- `MY BOARD` remains the only persisted/editable board. `ASST GM BOARD` is visibly separate,
  read-only, live, and may be viewed or optimized around the selected available player. Merely
  viewing, selecting, switching views, or optimizing never persists, drafts, trades, or changes My
  Board. Main and companion use the same shared request/result path; the companion may not fall back
  to raw-price `advisorWorth`.
- Replace the detached slot/player dropdown flow with consequences for the player already selected in
  the pool/profile. If the player is already on My Board, report that state and offer no Keep action.
  Otherwise evaluate every possible one-player displacement and canonical reassignment. Each candidate
  result must contain 22 unique, version-unique players, a complete deterministic canonical-slot
  matching, and pass `isLegalRoster`. Prefer the feasible displacement whose incumbent is lowest in
  the GM's applicable position ranking, then overall ranking, then contextual worth, then canonical
  slot/player id. Return the minimal reassignment and the exact displaced player. Never use the desk's
  permissive FLEX/SWING shortcut as legality proof.
- The selected-player card shows exact before/after salary, tax, all-in, money-left, all five chemistry
  counts/tiers, displaced fit versus selected fit, and current-roster legal-finish consequences. Unknown
  inputs render dashes/unavailable, never zero or SAFE. `KEEP ON MY BOARD` writes the fully validated
  replacement through the existing selected seat/device optimistic revision; `REVERT` discards only the
  preview. Keep must reject stale private identity or board/session revision and reload canonical truth.
- Cover, revoke, team switch, and companion claim change remove the prior club's assistant board,
  selected-player consequences, and action controls before paint. Off-clock private work remains
  allowed; only the current pick owner may draft. No pronouns or inline explanations are displayed;
  Help remains the only explanation surface.

Mutation-honest gates must prove: main/companion parity; read-only assistant separation; optimize-around
pinning; a multi-position case the old local-slot check falsely called legal; deterministic displacement;
all exact financial/chemistry/legal-finish deltas; already-on-board behavior; stale Keep rejection; no
write on view/select/optimize/revert; and private DOM/action removal on cover, revoke, or team switch.

### Batch 4 — Availability, pressure, cliffs, and action calls

#### Batch 4A — public scenario ensemble and viable scarcity

Allowed product files are exactly:

- `src/engines/snakeRationalRoom.ts`,
- `src/src_figma/app/components/snake/desk/deskRoomModel.ts`,
- `src/src_figma/app/components/snake/desk/useSnakeRationalRisks.ts`, and
- `src/src_figma/app/workers/snakeRationalRoom.worker.ts`.

Owned tests are the existing matching engine, model, hook, and worker-contract tests. Canonical tax,
roster-construction, seating proof, archetype, chemistry, storage, and trade engines are read-only.

Frozen implementation rulings:

- Replace the single-result market claim with a deterministic ensemble: one `BASE` scenario plus one
  `RIVAL_SECOND:<teamId>` scenario for each distinct rival with a pick before the asking club's next
  pick. Stable order is next-pick order, then team id. In a rival's sensitivity scenario, only that
  club's first intervening selection skips its highest-ranked legal/affordable/completion-safe candidate
  and takes its second; all later selections use the canonical chooser. Stop immediately before the
  asking club's next selection. Never consume rival private rankings, boards, seat logs, companion state,
  or correction history.
- For each requested version group: `SAFE_TO_WAIT` means it survives every valid scenario;
  `LIKELY_GONE` means it is selected before the asking turn in every valid scenario; `AT_RISK` means the
  valid scenarios split. Return the earliest selecting pick and latest selecting pick, using the asking
  club's `YOUR #N` as the upper bound when any scenario leaves it available. Return the number of unique
  rival team ids selecting it in any scenario. Do not display or calculate a percentage.
- A missing next pick, incomplete public input, nonfinite economics, zero valid scenarios, worker error,
  stale request key, cover, revoke, or team switch returns explicit pending/unavailable output. It can
  never become `SAFE_TO_WAIT`, `0 CLUBS`, or an old club's result.
- Scarcity is per canonical role applicable to the selected player. Deduplicate alternate versions with
  `deriveVersionGroupId`. A remaining person is viable only when the canonical role eligibility holds,
  the relevant public club can afford the player, and the constructive seating proof still finds a legal
  finish. Report viable people left, unique public clubs still needing that role, the cheapest/highest
  viable cost reachable by the asking club before its next turn, and the contextual-worth drop to the
  best viable replacement or `NO_REPLACEMENT`. Raw player-card count is forbidden.
- The worker request/result key binds session id/revision, current pick/order/ownership, asking club,
  locked public archetypes, settled public rosters/prices, frozen available version/price/worth signature,
  caps/budgets, and requested players/roles. Identical inputs produce byte-equivalent ordered results.

Mutation-honest gates must prove: the old one-playout/0-or-1 buyer implementation fails; all/mixed/none
survival categories; no-next-pick and zero-scenario fail closed; earliest/latest/`YOUR #N` range; unique
interested clubs across scenarios; stable scenario order; rival-private fields absent from the worker
request; alternate-version deduplication; secondary catcher and SP/RP/CP applicability; unaffordable or
legal-finish-breaking players excluded from supply; real replacement cliff/no-replacement; stale/private
worker result removal; and main/companion-identical model input.

#### Batch 4B — sparse decision resolver and current trade-guide bridge

Allowed product files are exactly:

- `src/src_figma/app/components/snake/desk/snakeDraftDecisionModel.ts` (new pure resolver),
- `src/src_figma/app/components/snake/desk/useSnakeGuideRecommendation.ts` (new fail-closed hook),
- `src/src_figma/app/workers/snakeGuideRecommendation.worker.ts` (new worker),
- `src/src_figma/app/components/snake/desk/deskModel.ts`,
- `src/src_figma/app/components/snake/desk/DeskCandidateRow.tsx`,
- `src/src_figma/app/components/snake/desk/RankingsView.tsx`,
- `src/src_figma/app/components/snake/desk/PrivateDesk.tsx`,
- `src/src_figma/app/components/snake/trade/tradeGuideModel.ts`,
- `src/src_figma/app/components/snake/trade/SnakeTradeGuide.tsx`,
- `src/src_figma/app/pages/SnakeDraftRoom.tsx`, and
- `src/src_figma/app/pages/SnakeCompanion.tsx`.

Owned tests are the matching desk/trade/hook/worker tests plus existing main, companion, privacy, and
performance integrations. Batch 2 engines and Batch 3 assistant/consequence engines are read-only.

Frozen implementation rulings:

- The pure resolver may return exactly `TAKE_NOW`, `SAFE_TO_WAIT`, `TRADE_TO_PICK`, `PASS`, or `null`.
  `PASS` requires either a selected-player optimize pin that cannot produce a legal solvent 22 or a
  candidate strictly Pareto-dominated by an available replacement on contextual worth, true cost, fit,
  chemistry consequence, and legal finish. Missing facts return `null`, not PASS.
- `SAFE_TO_WAIT` requires the player to be in the current assistant priority set, a known next asking
  pick, known legal/solvent consequence, and survival in every scenario. `TAKE_NOW` requires the same
  priority/legality truth, current live-pick ownership, and `LIKELY_GONE` or `AT_RISK` with no equivalent
  viable replacement before the next tier cliff. Otherwise the resolver returns `null`.
- Off-clock urgency may return `TRADE_TO_PICK` only when the target is assistant-priority, legal/solvent,
  gone/at-risk without an equivalent replacement, and the Batch 2 search returns a current package. The
  target destination is the latest pick the asking club can acquire before the ensemble's earliest threat;
  enumerate viable destinations from latest to earliest and keep the first current fair package. Carry the
  exact buyer/seller, pick arrays, posted values, target pick, and session revision returned by the guide.
- The guide worker receives a sanitized public session containing only the current id/revision, pick order,
  current index, completed public picks, locked public setup/archetypes, and fields required by the verified
  package search. It may not receive `seatBoards`, farm boards, private logs, companion claims/tokens,
  correction history, or another club's private state. A key mismatch or ownership/revision change clears
  the recommendation.
- Clicking `TRADE TO #N` switches to and prefills the selected club's existing private guide with the exact
  target/package. It does not post, nod, execute, persist, select another team, or arm/draft a player.
  `TAKE NOW` may focus the existing selected-player draft action but cannot bypass live-owner arming and
  commissioner persistence. Neutral `null` advice renders nothing and creates no log/activity entry.
- Main and approved companion use the same resolver and sanitized guide path. Cover, revoke, team switch,
  claim change, session revision change, or worker failure removes all prior advice and actions before paint.
  Labels/values/states only; explanations remain behind Help.

Mutation-honest gates must prove every action and every required negative: infeasible and Pareto PASS;
unknown is not PASS; all-survive wait; live urgent take; off-clock urgent fair trade; no package/null; an
equivalent replacement suppresses urgency; current owner/revision/package truth; latest viable destination;
no auto-post/execute/persist/draft/log; sanitized worker payload; stale/private removal; main/companion parity;
and the old manual-pick-only guide cannot satisfy the prefill test.

### Batch 5 — UI consolidation and final wiring

Allowed product files are exactly:

- `src/src_figma/app/pages/SnakeDraftRoom.tsx` (MLB path only),
- `src/src_figma/app/pages/SnakeCompanion.tsx`,
- `src/src_figma/app/components/snake/SnakeDraftRoomView.tsx`,
- `src/src_figma/app/components/snake/desk/PrivateDesk.tsx`,
- `src/src_figma/app/components/snake/desk/BoardView.tsx`,
- `src/src_figma/app/components/snake/desk/RankingsView.tsx`,
- `src/src_figma/app/components/snake/desk/DeskCandidateRow.tsx`,
- `src/src_figma/app/components/snake/desk/SelectedPlayerCard.tsx`,
- `src/src_figma/app/components/snake/desk/DraftTruthStrip.tsx`,
- `src/src_figma/app/components/snake/desk/WhatIfSandbox.tsx` (delete only),
- `src/src_figma/app/components/snake/companion/SnakeCompanionFrame.tsx`,
- `src/src_figma/app/components/snake/trade/SnakeTradeGuide.tsx`,
- `src/src_figma/app/components/snake/trade/TradePackageCard.tsx`, and
- `src/src_figma/app/components/snake/trade/SnakeCommissionerTrade.tsx` only for presentation parity.

Owned tests are the matching component tests, `SnakeDraftRoomView.test.tsx`, companion surface/privacy/auth
tests, trade-guide tests, and existing MLB main/companion integration/performance tests. `deskModel.ts`,
`tradeGuideModel.ts`, engines, storage, routes, draft setup, farm components/logic, auction, manifests,
handoff, and Living Season are read-only unless an auditor proves a stop condition requiring a new contract.

Frozen implementation rulings:

- One `TEAM` selector controls the shared device's private seat. It must show selected club identity/branding,
  cover and synchronously remove the old club's private DOM/action handlers before switching, then require
  reveal. Live-pick cards are non-mutating public status. Remove the second all-team `CLUB LENS` button cloud;
  public roster/truth/owned picks follow the one selected team. Off-clock private work and live-owner-only
  drafting remain unchanged.
- The private MLB tabs are exactly `MY BOARD`, `ASST GM BOARD`, `PLAYER POOL`, and `TRADE PICKS` when the
  guide is available. `PLAYER POOL` contains the overall/position selector, searchable available players,
  drag/arrow/top ranking controls, and player selection. A fifth `ACTIVITY` tab may render only when it has
  nonempty consequential history. Do not retain generic `BOARD`, `RANKINGS`, `LOG`, or duplicate guide tabs.
- Delete `WhatIfSandbox.tsx`, its imports/state/handlers, and tests that assert the detached slot/player flow
  only after Batch 3B direct consequences pass on main and companion. `evaluateSnakePlanWhatIf` must have no
  remaining MLB page caller. Do not change the frozen engine solely to erase an unused export.
- `BoardView` renders plan ledger and five-family chemistry before rows, then every canonical design slot in
  canonical order. Missing assignment, unavailable player, broken legality, and unknown player identity have
  explicit value/state labels; a raw id is never display text. The read-only assistant board follows the same
  order and aggregate-first layout. Tax-core detail stays collapsed.
- One `SelectedPlayerCard` owns player identity/logo or pixel portrait, positions, all nonzero ratings,
  attributes/traits/archetype/personality, team-fit signal, exact Batch 3 consequences, optimize/Keep/Revert,
  Batch 4 action call, and the existing guarded draft action. Remove the separate duplicate selected header,
  detached consequence box, and private note outside the card. Pronouns remain engine-only and are not shown.
- The MLB GM guide renders only inside the selected private desk. Remove the MLB shared top-level `THE GUIDE`
  control/content; retain the commissioner trade control and the farm room's existing shared guide behavior.
  Proposed and open offers show named counterparty, `YOU GIVE`, `YOU GET`, offer and receive posted totals,
  and raw seller premium. Values must come from the current proposal/session, never recomputed in JSX or
  inferred from labels. The full posted chart remains a collapsed disclosure.
- The active companion frame has a `?` Help toggle using the existing companion Help pattern. Combine current
  order and ticker into one compact horizontal live strip; preserve selected profile, drafted truth, and private
  desk above optional history. Remove `FORGET ROOM` from the active desk only; keep it on covered, invalid,
  pending, and recovery screens where it is an actual escape action.
- In the shared room, hide correction entirely when unavailable. Fold recent picks into a compact collapsed
  rail by default, with current public pick/team state still visible. Do not remove pause, sound, Help,
  companion approval, commissioner trade, gavel ritual, recap, reload, or material write/error warnings.
- All persistent elements must support a repeat GM/commissioner decision or action. Labels, values, state, and
  one-line action consequences may remain inline; tutorials, definitions, workflow prose, and neutral assistant
  narration live behind Help. Preserve the established KBL palette, club primary/secondary/accent branding,
  logos, minimum 44px touch targets, keyboard semantics, focus visibility, horizontal overflow containment,
  and usable 1024x768 iPad portrait/landscape layouts.

Mutation-honest gates must prove: one team selector and cover-before-switch DOM removal; pick-window buttons
cannot switch seats; exact tab set and conditional activity; What-If import/caller/file absence; aggregate-first
canonical 22 including missing/broken/unavailable and no raw id; one selected identity/action owner; one private
MLB guide plus separate commissioner and unchanged farm guide; two-sided package/open-offer values; correction
absence; collapsed recent history; companion Help/live strip/no active Forget Room; main/companion privacy;
keyboard/touch behavior; and automated 1024x768/768x1024 overflow and critical-action visibility.

## Verification after every batch

1. Owned engine/model tests, including adversarial/mutation probes for the changed rule.
2. Main room and companion integration tests when either surface is touched.
3. `npm run build` must exit 0.
4. Run the full suite after each correctness/engine batch when practical; no unexplained new red.
5. Trace every changed engine signature through all callers.
6. Separate auditor reads contract, diff, tests, and tries to falsify privacy, persistence,
   affordability, multi-position feasibility, current-revision trades, and advice honesty.
7. Final: full build + full suite + automated iPad/desktop crawl. JK performs the only acceptance
   walk.

## Stop conditions

- A required change crosses a frozen boundary.
- A displayed probability lacks a defined/calibratable scenario basis.
- A trade can pass while the seller loses posted value or either team loses a legal finish.
- Asst GM output can overwrite My Board without an explicit GM action.
- Any covered seat leaks private DOM or any companion writes another team's state.
- A new test passes without failing against the pre-fix behavior it claims to protect.

## Required reports

Every builder reports all changed files, exact behavior, exact test/build output, and blockers. The
auditor returns VERIFIED / NOT VERIFIED / BLOCKED with major/minor findings and adversarial evidence.
