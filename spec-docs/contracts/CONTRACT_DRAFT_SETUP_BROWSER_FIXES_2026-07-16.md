# CONTRACT — Draft Setup browser-gate repairs

**Date:** 2026-07-16
**Target:** `codex/snake-legends-integration` at `6caed6f0`
**Role:** builder implementation followed by a different-agent hostile audit
**Status:** INDEPENDENTLY APPROVED — JK browser re-walk remains the sole acceptance gate

## Authority and rulings

JK's 2026-07-16 Draft Setup browser walk is the product gate. The Help-button law remains canon:
instructions and explanations stay behind `?`; inline UI is limited to labels, live values/states,
one-line consequences, and one clean primary recovery action. No commit, merge, or deploy is
authorized by this contract.

This contract supersedes the one-version-at-lock requirement in
`CONTRACT_UNIFIED_DRAFT_SETUP_2026-07-15.md` § Required outcomes 5. The governing version behavior is
`SNAKE_DRAFT_VISION_2026-07-10.md:141-160`: all selected versions may enter, the first drafted card
retires its sibling versions, and all supply/proof/board calculations count a person once.

## Ruthless triage

### FINDING-214 — Snake Edit Profile is a dead control (Blocker)

`LeagueBuilderDraftSetup.tsx:4063-4074` sets `editingPlayer`, but Snake returns at
`LeagueBuilderDraftSetup.tsx:4608-4749`; the edit modal exists only in the later Auction return at
`LeagueBuilderDraftSetup.tsx:5650-5662`. This is a deterministic render-path defect, not a data issue.

Required outcome: the shared player editor opens and saves from Snake Setup with the same mutation,
validation, persistence, and locked-state law as Auction. Add a Snake component regression that
clicks Edit Profile, changes a field, saves, and observes the refreshed value.

### FINDING-215 — Chosen identities are soft-ranked out of shaped pools (Blocker)

`poolFromDemand.ts:5-18` promises to union archetype-feasibility floors, but sizing mode explicitly
leaves the C1B extraction as verdict/fit input at `poolFromDemand.ts:2046-2055` instead of protecting
its claims. A nominal Competitive result can therefore gray an already chosen club identity.

Required outcome: selected club identities are hard membership constraints. Preserve the minimum
claimed players needed by the selected identities during shaping, then run the exact simultaneous
22-player legal/affordable proof against the real teams and cap identities. A preset may grow above
its nominal target to honor chosen identities; the UI must name that one-line consequence. If the
source universe itself cannot satisfy an identity, keep the choice intact, show a specific role/axis
shortfall and one rebuild/full-sources action, and put the deeper explanation behind Help. Never
label an unproved pool ready.

### FINDING-216 — A successful certificate can fail board seeding (Blocker)

`SnakeDraftSetupAdapter.helpers.ts:172-216` drops secondary eligibility, roster shape, source ID, and
version-group ID when converting a room player to a board candidate. Board legality depends on those
fields at `deskModel.ts:103-159`. The adapter then emits a contradiction at
`SnakeDraftSetupAdapter.helpers.ts:260-305`: a certified feasible assignment can become
`Could not seed ...: EVERY CLUB CAN FINISH A LEGAL 22`.

Required outcome: propagate canonical position/shape/version identity into board candidates and seed
from the proof certificate without losing its legal meaning. The fallback invariant error must say
that board seeding disagreed with the certificate and identify the broken slot/state; it must not
repeat a success message as the alleged cause. Cover a secondary-catcher/two-way case and version
identity in focused tests.

### FINDING-217 — Setup contradicts the ruled all-versions draft design (Major)

`SnakeDraftSetupAdapter.tsx:69-89` forces one card per person before lock even though the governing
vision at `SNAKE_DRAFT_VISION_2026-07-10.md:141-160` requires all selected cards by default and
draft-time sibling retirement. The room/session retirement engine already supports the latter; the
setup pre-filter prevents the user from using it. Separately, `deskModel.ts:173-247` matches unique
card IDs and only discovers duplicate version groups after assignment, so it can reject an otherwise
solvable all-version board.

Required outcome: lock every card that remains in the manual pool. Remove the mandatory per-person
version picker; show only a compact live `cards / people` state plus version tags, with first-pick
retirement explained behind Help. Manual shuttle removal is the optional setup curation path. New
sessions must not pre-retire siblings; existing saved sessions with legacy selections remain
readable. Rankings may contain sibling versions, while every 22-plan, seating proof, supply count,
scarcity calculation, and matching search reserves one version group per person. First pick and undo
must respectively retire and restore siblings everywhere.

## Owned implementation surface

- `src/engines/poolFromDemand.ts`
- `src/engines/snakePoolAssembly.ts`
- `src/engines/snakeAssistantBoard.ts`
- `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx`
- `src/src_figma/app/components/snake/setup/SnakeDraftSetupAdapter.tsx`
- `src/src_figma/app/components/snake/setup/SnakeDraftSetupAdapter.helpers.ts`
- `src/src_figma/app/components/snake/desk/deskModel.ts`
- `src/src_figma/app/components/snake/desk/useSnakeAssistantBoard.ts`
- focused tests for those modules and `src/engines/__tests__/snakeVersioningSession.test.ts`

The builder may add one small pure diagnostic/repair module if keeping exact proof logic out of the
page materially improves testability. It must not rewrite existing pricing or roster-law engines.
The two Assistant-board files above are included only to replace their current duplicate-group
rejection with one-person alternative selection; all other Assistant objective and money law is
protected.

## Non-goals and protected state

- No Auction behavior change except reuse of its already-canonical editor transaction.
- No IV/salary/tax tuning, archetype-weight tuning, hidden-personality work, FARM policy, or draft-room
  redesign.
- Do not touch the pre-existing dirty files in `/private/tmp/kbl-snake-legends-integration`.
- Do not change, commit, merge, push, or deploy from the root checkout or target worktree.
- Builder must not issue the audit verdict on its own work.

## Builder proof

1. Focused component test proves Snake Edit Profile opens, saves, refreshes, and respects lock.
2. Pool tests prove selected-identity claims survive Tight/Competitive/Loose shaping, deterministic
   growth is reported, manual exclusion cannot silently defeat a chosen identity, and source-level
   impossibility produces a specific blocker.
3. Setup/desk tests reproduce and close the success-certificate/failed-board contradiction, including
   secondary catcher or two-way eligibility.
4. Version tests prove multiple cards enter a new session, exact proof counts one human, a legal
   22-plan never duplicates a person, first pick retires siblings, and correction restores them.
5. Focused regressions, TypeScript, changed-file lint, production build, and `git diff --check` pass.

## Builder handoff — 2026-07-16

The builder implemented FINDING-214 through FINDING-217 without committing, merging, pushing, or
deploying. Snake pool shaping explicitly preserves selected-identity claims while the shared
default remains unchanged for Auction. The shared editor now mounts in Snake, setup admits every
remaining version card, legal plans reserve one person once, and setup-to-board materialization
retains eligibility, shape, source, and version identity.

Builder evidence only — not an audit verdict:

- Contract-focused regressions: 8 files, 176/176 tests passed.
- Focused plus all six split Draft Setup regressions: 13 files, 269/269 tests passed.
- `NODE_ENV= npx tsc -b --pretty false` passed.
- Changed-file ESLint passed.
- `env -u NODE_ENV npm run build` passed (2,728 modules transformed).
- `git diff --check` passed.

Independent hostile audit and JK's browser re-walk remain open.

## Independent audit attack surface

The non-builder auditor must attack: chosen-identity eviction at every preset; manual removal and
source insufficiency; exact-certificate/board parity; unique-person matching under multiple versions;
legacy saved-session compatibility; Auction isolation; lock/unlock persistence; and Help-law copy.
Every finding must cite file and line. Repairs return to the original builder, then the auditor
rechecks the final frozen tree. JK's browser walk is still the only product acceptance.

## First independent audit — REJECT

The non-builder audit rejected the first implementation pass with four blockers, two majors, and one
minor. Required repair deltas:

1. The live Assistant hook must accept sibling alternatives in recommendation order while enforcing
   one person only in the final 22.
2. Assistant optimization must retain cross-position sibling alternatives during the actual roster
   search; a preselected highest-value card is not a valid group-aware solve.
3. Lock and GO require a live simultaneous certificate that assigns disjoint unique people to every
   club's chosen identity as well as its legal/affordable 22. Manual removal must recompute it.
4. An unsaved legacy one-card locked pool with `snakeVersionSourcePlayerIds` must restore siblings,
   reprice/reprove, and relock before it can enter a new room.
5. The 345-card setup may not render an always-expanded per-person version inventory. Keep only the
   compact card/person state; version chips already exist in the shuttle.
6. Diagnostics must distinguish shaped-pool repair from source impossibility, report actual final
   removal counts, name the missing baseball role/axis, and offer one action that can work.
7. A drafted card that retires siblings needs the ruled neutral ticker receipt; undo removes it with
   the restored snapshot.

The original builder owns repairs. The same read-only auditor must recheck the frozen result before
any approval claim. No commit, merge, push, or deploy is authorized.

## Builder repair handoff after the first audit — 2026-07-16

The original builder repaired all seven rejected deltas. This is implementation evidence, not an
audit verdict:

1. Assistant recommendations may contain sibling alternatives, while the final 22 reserves one
   version group per person. The optimizer keeps every sibling's eligibility edge during roster
   search instead of preselecting the highest-value card.
2. A chosen-identity SUCCESS now carries a live simultaneous certificate: every club receives a
   legal 22, exact Snake salary plus tax is affordable, people/version groups are disjoint, the
   canonical optimal-posture value floor holds, and the chosen identity has strict positive
   embodiment. Bounded identity-search exhaustion after ordinary legal proof is reported as
   `identity-proof-unknown`, never as a fabricated source or role impossibility.
3. One explicit shaped BUILD tries the requested preset, then wider presets in fixed order, then
   the full selected source. The actual resolved mode and multiplier are persisted; the receipt
   separately names the requested preset. A full-source UNKNOWN directs the user to change or add
   a source instead of offering the same deterministic rebuild.
4. Manual membership edits invalidate the prior build receipt and recompute proof. Protected
   restorations are removed from the manual-removal ledger, so the displayed removal count reflects
   the final pool. Confirmed source failures name the missing baseball role and axis.
5. An unsaved legacy one-card Snake lock restores sibling cards, reprices, re-proves, and relocks
   before Ready or GO. The legacy ledger clears only after all four steps succeed; saved Snake
   sessions retain their frozen compatibility path.
6. Setup renders only compact card/person counts. Version labels remain in the player shuttle and
   the sibling-retirement law remains behind Help.
7. The neutral pick ticker reports how many sibling versions retired, and deriving the ticker from
   the restored undo snapshot removes that receipt after correction.

Final repaired-tree builder gates:

- Focused behavioral matrix: 8 files, 187/187 tests passed.
- Post-lint seating-proof delta rerun: 14/14 tests passed.
- Exact-tree `npx tsc -b --pretty false` passed.
- Changed-file ESLint passed with zero findings.
- `git diff --check` passed.
- Production build was not rerun after the audit repairs by coordinator instruction.
- No code was committed, merged, pushed, or deployed.

Independent re-audit and JK's browser re-walk remain open. The builder does not approve its own
repairs.

## Second independent audit — REJECT

The same non-builder auditor rejected the first repair handoff with three Majors and no Blockers:

1. Assistant's feasibility-only sibling matching could choose a legal but non-optimal set of cards
   before the weighted 22 optimizer ran. The padded alternating cycle A(G1=100,G2=99),
   B(G1=98,G3=1), C(G2=97,G3=96) exposed a 198 result where the weighted optimum is 293.
2. Full Sources let a hard keep restore a hand-removed card but persisted the stale removal ledger,
   so the visible count and next reload still claimed that restored card was removed.
3. Full Sources UNKNOWN copy branched on the ephemeral build receipt. Reloading or making a manual
   edit cleared the receipt and incorrectly told a persisted Full Sources user to try wider presets.

No audit approval followed this verdict. The original builder retained the repair assignment.

## Builder repair handoff after the second audit — 2026-07-16

Builder evidence only — independent re-audit remains required:

- Assistant now passes every sibling card into the actual weighted optimizer. An optional
  `exclusiveGroupByPlayerId` constraint inside `buildIdentityRoster` performs a deterministic exact
  maximum-weight slot-to-version-group assignment for both value and fit starts, keeps pins
  group-exclusive, and preserves group occupancy through constrained climbs. The old unweighted
  representative pre-collapse is removed. If 22 distinct groups cannot match, the Assistant fails
  closed instead of falling back to a lower-objective heuristic.
- The padded real-Assistant alternating-cycle regression selects A-G2=99, B-G1=98, and C-G3=96,
  totaling the required 293. Secondary-catcher backup specificity and SP/RP SWING ranking remain
  green. Callers that omit the new group map retain the prior path; the surrounding Best 22 and
  archetype simulator suites are green.
- After Full Sources computes `nextIdSet`, every final-pool ID is removed from
  `manualExcludedIds`; the cleaned set drives React state and `poolFirstHandRemoves` persistence.
  The component regression proves two attempted removals plus one restored hard keep become one
  persisted and visible removal.
- UNKNOWN recovery copy now branches on persisted `poolAssemblyMode`. A Full Sources reload and a
  subsequent manual edit both continue to direct the user to add or change a selected source even
  with no build receipt.

Second-repair gates:

- Focused residual tests: Assistant 21/21; Full Sources ledger/copy 2/2.
- Combined optimizer/default-caller/persistence gate: 5 files, 78/78 tests passed.
- Exact-tree `npx tsc -b --pretty false` passed.
- Changed-file ESLint passed with zero findings.
- `git diff --check` passed.
- Production build was not run, by coordinator instruction.
- No commit, merge, push, or deploy was performed.

All edits remain isolated in `/private/tmp/kbl-snake-browser-feedback`. The original target
worktree's pre-existing `archetypeBalanceSimulator.ts` collision was not touched; integration must
preserve and reconcile that state deliberately. The builder does not claim audit approval. JK's
browser re-walk remains the sole product-acceptance gate.

## Third independent audit — REJECT

The same non-builder auditor rejected the second repair handoff with two Majors:

1. The exact additive slot-to-version-group seed did not prove the nonlinear roster objective.
   Salary tax and roster fit are evaluated on the whole 22, so an improving exchange can require an
   arbitrary alternating cycle longer than the seed's local neighborhood. A completed result could
   therefore claim optimization without exhausting that neighborhood.
2. The optional slot-preference term leaked into callers that did not opt into exclusive version
   grouping. That changed the frozen default `rosterFitScore(players)` comparison for ordinary Best
   22 and archetype callers.

No audit approval followed this verdict. The original builder retained the repair assignment.

## Builder repair handoff after the third audit — 2026-07-16

Builder evidence only — independent re-audit remains required:

- Exclusive-version optimization now treats the additive assignment only as a deterministic seed.
  A separate bounded pass enumerates deterministic simple occupied-group cycles through every
  relevant unpinned slot, including singleton intermediary groups, and scores every candidate with
  the actual full-roster legality, exact nonlinear tax, value-floor, and fit objectives. Two-node
  and four-node nonlinear tax-cycle regressions prove improvements that additive/local scoring
  cannot certify.
- Node and candidate caps are separate from the improvement-pass cap. A fully exhausted
  neighborhood may report completion; any cap hit or pass exhaustion reports incomplete. The
  Assistant then fails closed with `INCOMPLETE_BOARD` instead of presenting a board as optimized.
  No global exactness claim is made beyond the explicitly exhausted bounded neighborhood.
- Callers without exclusive version grouping again compare the literal frozen
  `rosterFitScore(players)` objective. A nonzero slot-preference/rank regression proves omitted and
  explicit-undefined options preserve the prior membership and ordering.
- The room-registration fixture was updated to a canonical chosen-identity-success pool instead of
  bypassing the live certificate. It still performs the real LOCK-to-GO registration journey and
  preserves its Murderers' Row identity assertion.

Final third-repair gates:

- Complete changed behavioral matrix: 12 files, 246/246 tests passed.
- Optimizer/default/Assistant matrix: 3 files, 51/51 tests passed.
- Exact-tree `npx tsc -b --pretty false` passed.
- All changed TypeScript/TSX files passed ESLint with zero findings.
- `git diff --check` passed.
- `npm run build` passed: TypeScript plus Vite production build, 2,729 modules transformed.
- Full-repository lint still reports 939 unrelated existing problems across archived and untouched
  files; none are in the changed-file lint gate.
- No code was committed, merged, pushed, or deployed.

All edits remain isolated in `/private/tmp/kbl-snake-browser-feedback`. The original target
worktree and its pre-existing collision remain untouched. The builder does not claim audit
approval. Independent re-audit and JK's browser re-walk remain open.

## Fourth independent audit — REJECT

The same non-builder auditor rejected the third repair handoff with one Major. Completion was
stored only on the winning value/fit baseline start and the winning identity start. If a secondary
executed start hit its proof cap but lost the board comparison, its incomplete result was discarded
and Assistant could report READY without exhausting every search it had executed.

No audit approval followed this verdict. The original builder retained the narrow repair.

## Builder repair handoff after the fourth audit — 2026-07-16

Builder evidence only — independent re-audit remains required:

- Baseline completion is now the conjunction of every executed value and fit start, independent of
  which roster wins the objective comparison.
- Identity completion is now the conjunction of both identity starts, independent of which roster
  is feasible or wins the final fit comparison. Any incomplete executed start propagates through
  `optimizationComplete=false`, so Assistant fails closed with `INCOMPLETE_BOARD`.
- A real Assistant regression proves the secondary baseline fit start can be the only capped start
  while the completed value start supplies the board. A second real Assistant regression proves the
  unselected identity fit start can be the only capped identity start while the completed value
  identity board wins. The latter intentionally exhausts the production 250,000-candidate cap and
  has a test-only 10-second timeout; no UI timeout or product cap changed.

Fourth-repair gates:

- Focused simulator and Assistant suites: 2 files, 31/31 tests passed.
- Exact-tree `npx tsc -b --pretty false` passed.
- Narrow changed-file ESLint passed with zero findings.
- `git diff --check` passed.
- Production build was not rerun because only about 1.58 GiB remained and the prior frozen-tree
  production build was green before this two-file logic/test delta.
- No code was committed, merged, pushed, or deployed.

The external target worktree now points to `codex/home-bar-proportions` at `7ba9922f` and is clean;
the builder did not change tracked files there. All repairs remain isolated in
`/private/tmp/kbl-snake-browser-feedback`. The builder does not claim audit approval. Independent
re-audit and JK's browser re-walk remain open.

## Final independent re-audit — APPROVE

The same non-builder auditor independently approved the fourth repair with zero actionable
findings. It verified that baseline completion ANDs every executed value/fit start, identity
completion ANDs both identity starts, winning-board selection remains separate, and either capped
unselected start forces Assistant `INCOMPLETE_BOARD`. Its independent narrow run passed 48/48 tests
and `git diff --check`. No diagnostic or test-only production seam was found; the sole 10-second
timeout belongs to the adversarial test that deliberately exhausts the unchanged 250,000-candidate
production cap.

This is code-audit approval only. JK's browser re-walk remains the sole product-acceptance gate. No
commit, merge, push, or deploy is authorized or performed.
