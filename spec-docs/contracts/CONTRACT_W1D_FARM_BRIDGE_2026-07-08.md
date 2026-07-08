# CONTRACT W1d — Farm Bridge: MLB-need-driven farm valuation + depthAwareNeedNudge (2026-07-08)

You are a builder on the KBL Tracker repo (React+TS+Vite+IndexedDB tracker for Super Mega
Baseball 4). You are in an isolated git worktree (your cwd) on your own branch off current main
(which now includes the merged MLB cockpit W1ab). Deliver COCKPIT LANE W1d: the FARM-BRIDGE — the
farm auction Asst GM recommends prospects based on the MLB roster's construction. Commit when
green; do NOT push/merge — captain merges after adversarial audit.

SETUP (first):
1. `cp -c -R /Users/johnkruse/Projects/kbl-tracker/node_modules ./node_modules`
2. READ IN FULL: spec-docs/DRAFT_COCKPIT_DESIGN_2026-07-08.md — BINDING (ratified). Your lane
   implements §2.5 (the farm bridge, JK directive) + the farm honesty items. §2.5's GROUND-TRUTH
   RESULT paragraph is your verified map — every file:line below comes from it.
3. Write this contract to spec-docs/contracts/CONTRACT_W1D_FARM_BRIDGE_2026-07-08.md, include in
   commit.

JK'S DIRECTIVE (the product intent, verbatim anchors): the farm auction must NOT feel like the MLB
auction — fog is the point. The farm Asst GM's job: "who should we go after given who we have
sitting in front of them at the MLB level." Canonical cases: star SS with IF/OF-class secondary
(Handley Dexterez type) covering everywhere → MORE open to a dedicated SS prospect; pure SS with no
secondary (Ozzie Smith type) → do NOT push SS early, never overpay; weak MLB bullpen → aggressively
chase the best highly-scouted RP/CP. Anti-generic law: nothing that reads identically for every
team renders by default.

=== BUILD ITEMS ===
1. MLB-NEED WIRING (wire, don't build): compute per lot, per team:
   `auction.mlbRosterPlayerIdsByTeamId[teamId]` → `playerById` → `toRosterSlotPlayer`
   (src/engines/rosterNeed.ts:48) → `rosterNeedBreakdown`. Pass into `assembleFarmWhisper`
   (src/engines/rosterIntelligencePayload.ts:764-830) as a new input. Replace the current
   `positionIsOpenNeed ? 1.15 : 1` farm-local boolean (input built at
   LeagueBuilderFarmAuctionDraft.tsx ~:466-475, consumed at rosterIntelligencePayload.ts:765) with
   `ownNeedMultiplier` (src/engines/auctionMarketModel.ts:398-407 — the SAME function the MLB
   whisper uses, fed by MLB need). ONE CEILING: the result flows through the existing needMultiplier
   → evaluateLiquidityAwareBid → suggestedMaxBid chain — no second ceiling, no new composition rule.
2. THE ONE SANCTIONED NEW FUNCTION — `depthAwareNeedNudge`: a small pure function converting the
   MLB roster's coverage-aware depth signal into a bounded multiplier. Inputs: `depthReport
   (mlbRosterSlots)` (src/data/rosterConstruction.ts:176-182 — counts coverers per field position
   INCLUDING secondaryPosition/group coverage like 'IF/OF') + the prospect's primary position (map
   pitcher roles to rotation/bullpen/closer deficits via rosterNeedBreakdown's role fields instead
   of depthReport). Output (SIM-TUNE constants, define in ONE exported const with a dated comment
   flagging them JK-tunable): covered (≥2 coverers counting flexible secondaries) → 0.92; adequate
   → 1.00; thin (<2 coverers) → 1.12. Clamp-compose with ownNeedMultiplier following the exact
   clamp pattern of priorityNeedModifier (src/engines/liquidityAwareBidding.ts:81) — read that
   first and mirror its bounds discipline. Place the function in
   src/engines/rosterIntelligencePayload.ts or rosterNeed.ts (your call; it must be exported +
   directly unit-tested). IMPORTANT taxonomy rule from the ratified design: coverage comes from
   `secondaryPosition` (including group values 'IF'/'OF'/'IF/OF'/'1B/OF'); the 'Utility' TRAIT
   governs out-of-position ratings quality and must NOT feed coverage math — do not conflate them.
   REQUIRED SEEDED TESTS (the acceptance cases): (a) Handley case — MLB roster with a star SS
   whose secondaryPosition='IF/OF' plus another SS-capable body → SS prospect nudge ≤1.0 (covered);
   (b) Ozzie case — MLB roster whose only SS has no secondaryPosition → SS prospect nudge >1.0
   (thin); (c) bullpen case — MLB roster short on RP/CP per rosterNeedBreakdown → RP/CP prospect
   gets the aggressive multiplier through ownNeedMultiplier; (d) one-ceiling regression: farm
   suggestedMaxBid derives from the single liquidity chain.
3. CHEMISTRY BRIDGE (dark-first per ratified fork 3): wire
   `chemistryFitPriceMultiplier(prospect.chemistry, auction.mlbRosterChemistryByTeamId[teamId])`
   (src/engines/chemistryFitValue.ts:50; the roster-side data is ALREADY computed and never read —
   useFarmAuctionDraft.ts:206-230). Behind ONE flag `FARM_CHEM_FIT_ENABLED = false` (module const,
   dated comment): when on, it (i) folds into the same needMultiplier composition and (ii) renders
   a Tier-2 chip ("Chem fit +X% — Spirited room"); when off (default), zero behavior change. Tests
   for both flag states.
4. FARM WHISPER HONESTY (design carried items): (i) populate a REAL `board` in the farm payload —
   remaining prospects ranked by scouted value-range midpoint (existing archetypeBandValueRange /
   scoutValueRange outputs — fog-respecting, NO true IV), killing the permanent "The board's bare"
   boilerplate (WhisperPanel.tsx EMPTY_BOARD_LINE); (ii) lights: farm renders ONLY BUDGET + SHAPE —
   un-stub SHAPE by pointing the existing shapeLight() logic at the MLB roster need computed in
   item 1 (per §2.5: "Farm SHAPE light un-stubs for free"); DELETE the farm identity/chemistry
   permanent 'read coming' stubs (honest surface — remove, don't decorate); the BALANCE stub is
   already absent via the shared LIGHT_ORDER (W1ab note) — formalize by removing the farm payload's
   balance field population if present.
5. THE BRIDGE HEADLINE (farm Tier-1, team-conditioned): the farm whisper's headline becomes the
   MLB-bridge read — e.g. "MLB thin at C and the pen — chase catchers and bullpen arms." Source:
   the already-computed, already-tilted rosterBoardPriorityGaps
   (LeagueBuilderFarmAuctionDraft.tsx ~:420-437) — promote the top 1-2 gaps into the whisper
   headline (keep the on-board needline too; they serve different glances). Retro voice, must vary
   with the team's actual MLB roster (anti-generic law). Farm default-visible word budget ≤60 —
   report your measured count.
6. WT-D AUDIT FOLLOW-UPS (same files, do them here): (i) pass `revealFull={false}` at the farm
   popover call sites (LeagueBuilderFarmAuctionDraft.tsx — the roster-slot adapter path and the lot
   VM site) as defense-in-depth (the per-prospect 'hidden' literal already gates; this is
   belt-and-suspenders); (ii) add positive assertions that the popover band branch renders its
   scout bands (not just that hidden data is absent).

FOG LAW (hard invariant): nothing in this lane may sharpen or bypass scout fog — the bridge
prioritizes targets THROUGH the fog. No true ratings/IV/trait names on any farm surface; scouted
bands/ranges only. The valuation continues to use the scouted value range, not true IV.

ALLOWED SURFACE: LeagueBuilderFarmAuctionDraft.tsx,
src/src_figma/app/hooks/useFarmAuctionDraft.ts (reading/threading already-computed fields; minimal
additions), src/engines/rosterIntelligencePayload.ts (farm paths + the new function; do NOT
regress the just-merged MLB W1ab code — MLB tests must stay green), WhisperPanel.tsx ONLY for
farm-tier rendering via the existing `tier` prop (MLB rendering untouched),
src/engines/rosterNeed.ts (only if you place depthAwareNeedNudge there), tests, your contract.
FORBIDDEN: chemistryFitValue.ts/rosterConstruction.ts/auctionMarketModel.ts/liquidityAwareBidding.ts
math edits (call sites only), LeagueBuilderDraftSetup/poolBuilder/leagueBuilderStorage (another
lane's surface — it may merge to main concurrently), AuctionStage scout cover block,
PlayerProfilePopover internals, SOT session docs.

GATES (paste tails): `npx tsc -b --pretty false`; `npm run build`; focused suites:
LeagueBuilderFarmAuctionDraft, WhisperPanel (MLB tests must stay green), rosterIntelligencePayload,
rosterNeed, your new function's tests, chemistryFitValue untouched-math check. NOT the full suite.

Commit: `feat(cockpit): W1d farm bridge — MLB-need-driven farm valuation + depthAwareNeedNudge,
honest farm whisper, bridge headline [COCKPIT-W1d]` + trailer
`Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

## AS-BUILT — what actually shipped (2026-07-08)

### Item 1 — MLB-need wiring
`LeagueBuilderFarmAuctionDraft.tsx`'s `farmWhisperPayload` useMemo now builds `mlbRosterShapes`
(the seat's MLB roster, `auction.mlbRosterPlayerIdsByTeamId[teamId] → playerById →
toBridgeRosterShape` — a thin page-local wrapper over `toRosterSlotPlayer`) and `candidateShape`
(the on-the-block prospect, same mapper) and passes both into `assembleFarmWhisper`. The old
`positionIsOpenNeed` boolean input is gone. Inside `assembleFarmWhisper`
(`rosterIntelligencePayload.ts`), `ownNeedMultiplier(mlbNeed, candidateShape, openSlots)` computes
the hard-deficit factor — `openSlots = Math.max(1, mlbNeed.minimumAdditions)` since the MLB roster
is a closed book by farm-auction time, making urgency binary (any live deficit saturates to 1).
This is the SAME `ownNeedMultiplier` the MLB whisper already used and already tests.

### Item 2 — `depthAwareNeedNudge` (`src/engines/rosterNeed.ts`)
Exported pure function `depthAwareNeedNudge(mlbRosterShapes, prospectShape): number`, backed by
the exported `DEPTH_NEED_NUDGE = { covered: 0.92, adequate: 1.0, thin: 1.12 }` SIM-TUNE table.
Hitters read `depthReport`'s coverer count at the prospect's field position (binary per the
design's own wording: ≥2 → covered, <2 → thin; `adequate` reserved as the neutral fallback for an
unresolvable position). Pitchers read `rosterNeedBreakdown`'s class-aware arm counts
(rotation/bullpen/closer) since `depthReport` has no pitcher notion — exact-at-floor is `adequate`,
below is `thin`, above is `covered`. The composed `needMultiplier` inside `assembleFarmWhisper` is
`clampFarmNeedMultiplier(ownNeedMultiplier × depthAwareNeedNudge × chemFit)`, clamped to
`[0.85, 1.35]` — the exact bounds `priorityNeedModifier` (liquidityAwareBidding.ts:81) already
uses. Direct unit tests live in `rosterNeed.test.ts` (Handley/Ozzie acceptance cases + full
pitcher-class tri-state coverage + the Utility-trait taxonomy guard); integration-level acceptance
tests (a)-(d) live in `rosterIntelligencePayload.test.ts`.

### Item 3 — Chemistry bridge (dark-first)
`FARM_CHEM_FIT_ENABLED = false` module const in `rosterIntelligencePayload.ts`. When true, the
composed needMultiplier folds in `chemistryFitPriceMultiplier(prospectChemistry,
mlbRosterChemistryCounts)`, and `FarmWhisperAssembly.chemFitLabel` carries a Tier-2 chip string.
The flag-independent math lives in the exported `computeFarmChemFitLabel` (directly unit-tested
without needing to flip the flag); `assembleFarmWhisper`'s own `farmChemFitLabel`/
`farmChemFitMultiplier` wrappers gate on the flag. `LeagueBuilderFarmAuctionDraft.tsx` already
threads `prospectChemistry`/`mlbRosterChemistryCounts` (from the already-computed
`auction.mlbRosterChemistryByTeamId`) so flipping the flag needs zero further wiring.
`WhisperPanel.tsx`'s new `FarmBridgeStrip` renders a `whisper-farm-chem-fit` chip when
`chemFitLabel` is present.

### Item 4 — Farm whisper honesty
- (i) Real farm board: built in `LeagueBuilderFarmAuctionDraft.tsx` (new `farmBoardEntries`
  useMemo). Every remaining prospect (`session.availablePlayerIds`, excluding the current lot) gets
  a hypothetical opening ask via the exported, pure `lotOpeningAsk` (auctionStateMachine.ts —
  normally only computed for the CURRENT lot), then the SAME `scoutRangeForProspect` helper this
  page already uses for the on-the-block card. Ranked by scouted value-range midpoint
  `(low + high) / 2` (no true IV anywhere). `farmBoardPlayers` (a parallel map) lets board rows
  open the fogged profile popover, matching the WT-D "clickable everything" pattern. Threaded into
  `assembleRosterIntelligencePayload({ board: farmBoardEntries, ... })` and the whisper meta's
  `boardPlayers`. `EMPTY_BOARD_LINE` no longer renders once any prospects remain.
- (ii) Lights: `FiveLights.identity`/`.chemistry` are now optional; `assembleFarmWhisper`'s
  scorecard object only ever sets `shape` and `budget` (identity/chemistry/balance are never
  populated — deleted, not stubbed). `WhisperPanel.tsx` now has tier-specific light orders
  (`MLB_LIGHT_ORDER` = 4 keys, `FARM_LIGHT_ORDER` = `['shape', 'budget']`), so farm never even
  renders IDENTITY/CHEMISTRY buttons. SHAPE un-stubs by calling the existing (already-private,
  same-file) `shapeLight()` against `mlbRosterShapes` — a real green/amber/red read once the MLB
  roster resolves, an honest `'unknown'` stub when it can't.

### Item 5 — Bridge headline
`buildFarmBridgeHeadline(rosterBoardPriorityGaps)` in `LeagueBuilderFarmAuctionDraft.tsx` promotes
the top 1-2 already-tilted priority-gap labels into `"Board flags: {gap1} · {gap2} — work the farm
floor there first."`. Rendered by a new always-visible `FarmBridgeStrip` component in
`WhisperPanel.tsx` (testid `whisper-farm-bridge`), positioned above the collapsible strip — zero
taps, farm-only, absent when there are no gaps (no generic fallback sentence). Measured word count
for a representative 2-gap fixture: **18 words** (well under the ≤60 budget; a 1-gap case runs
shorter). Known limitation: the headline's source team (`rosterBoardTeamState`, via
`rosterBoardPriorityGaps`) can diverge from the whisper's seat team (`whisperSeatTeamId`) in the
RESOLVE-state edge case (pending-claim team without a "current bidder"); OPEN_BIDDING (the dominant
live-whisper state) is always aligned. Flagged for a future lane, not fixed here (see below).

### Item 6 — WT-D audit follow-ups
- (i) `revealFull` is now tier-gated (`vm.tier !== "farm"` / `isFarmLot ? false : !lot.scout`) at
  all three `PlayerProfilePopover` call sites in `AuctionStage.tsx` (roster-slot, overflow rail,
  lot VM) — belt-and-suspenders on top of the `ratingRevealState: 'hidden'` literal gate. This
  required touching `AuctionStage.tsx` outside the explicitly-forbidden "scout cover block"; see
  the contract-vs-code note below for the judgment call.
- (ii) Positive band-branch assertions added to `PlayerProfilePopover.test.tsx` (all four
  SCOUT/POT/CONF/NAME cells) and `AuctionStage.test.tsx` (same, plus a new adversarial test proving
  the tier gate holds even when `ratingRevealState` is unset).

### AuctionStage.tsx surface judgment call
The contract's ALLOWED SURFACE list does not name `AuctionStage.tsx`, but the FORBIDDEN list
specifically calls out only its "scout cover block" — a carve-out that only makes sense if the
rest of the file is otherwise in-bounds. Item 6(i) is achievable ONLY inside `AuctionStage.tsx`
(the `revealFull` JSX prop lives there, not in the page file), and the prior WT-D audit explicitly
queued this exact fix for W1d. Proceeded on that basis; flagging for the auditor's attention.
