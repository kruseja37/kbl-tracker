# FABLE DRAFT-JOURNEY AUDIT — setup → design → pool → draft → launch

**Author:** Fable 5 (design authority) · **Date:** 2026-07-02 · **Effort:** xhigh ·
**Method:** five parallel evidence agents (adapter seam · pool→draft seam · intelligence-vs-
intent · draft→launch seam · UI truthfulness), every finding file:line-anchored, synthesized
and deduplicated by Fable. **Charter (JK ruling, same date):** three lenses — (1) SEAMS
(rule disagreements at handoffs), (2) INTENT (built to the specs/discussions, not bare
minimum: "teams that truly match the archetypes and an Asst GM that adapts to the strategy
set by the GM"), (3) UI TRUTH (every readout traces to what its label claims).

**Verification status of this doc:** static code-read evidence only (no runtime execution
except where noted "fixed + tested"). Finding IDs DJ-xx are stable for ticketing.

---

## §0. VERDICT IN ONE PARAGRAPH

The spine is real: pool lock → auction lots is byte-identical; the auction's in-flight
legality guard derives from the single LEGAL_ROSTER law; the whisper recomputes per lot with
chemistry live; Mode A is fully wired end-to-end; all four START gates are enforced. But the
journey has (a) ONE money model wearing three different bases (universe cap vs pool cap vs
salary-vs-IV pricing), (b) a pool-membership drift at lock in design-first mode, (c) NO
legality verification at the draft exit (today's bug class at the next seam), (d) two
auction-economy holes (CPU identity re-roll, valuation leak), and (e) a GM-facing layer that
in several places shows bare-minimum math in the costume of intelligence (cheapest-fill
dollars as "your plan", a structurally-illegal roster board, two fake visual encodings).

---

## §1. FIXED THIS SESSION (Fable, built + tested, on branch)

| ID | What | Where |
|---|---|---|
| DJ-00a | Coverage-vs-primary legality bug: pos slots now PRIMARY-only, legality by construction | rosterDesignFeasibility.ts eligibleForSlot + 4 regression tests |
| DJ-00b | 10-arms count hole: tighten-and-retry pass (backupC→hitters, then SWING→hitters) | same file, solver retry |
| DJ-00c | Canned legality guess replaced by explainIllegality (names the ACTUAL failed rule) | same file |
| DJ-00d | The designer's PRIVATE COPY of the eligibility/matching rules deleted; counts now go through the engine's `countEligibleForAsk` (one rule set, one owner) | RosterDesigner.tsx + engine export |
| DJ-00e | Page ground ash→well green per JK browser ruling | ballpark-kit.css `--ballpark-page-bg` |

Gates: build exit 0 · engine+designer suites 30/30 · full suite 3 failed/8,780 passed —
the characterized pair + LeagueBuilderDraftSetup.test load-flake (solo-green, 7/7).

---

## §2. P0 — FIX BEFORE JK'S PLAYTHROUGH (breaks the first real draft or its economy)

**DJ-01 [BLOCKER · ui-truth] The auction roster board cannot display a legal roster.**
`MLB_BOARD_SLOTS` (DraftRosterBoard.tsx:45-67) frames 9 field (incl. **DH — a DH-PURGE
violation**) + 5 SP + 6 RP + 1 CP + 1 depth. The legal 22 is 8 field / 8-9 arms — so 3-4
pitcher slots glow "gap" forever on a finished club, surplus bench players are silently
dropped (LeagueBuilderAuctionDraft.tsx:217-231 splice), and secondaryPosition is ignored in
matching. A GM at a legal 22/22 is told he has needs. Fix: rebuild the stage board frame
from LEGAL_ROSTER (8 field + backupC + 4SP + 4RP + 4 bench + swing), match via canCover.
→ Codex build; Fable design-reviews (the frame IS the designer's 22-slot frame).

**DJ-02 [MAJOR · seam/economy] The CPU-turn panel shows the rival seat's internal valuation.**
buildCpuDecisionVm formats decision.valuation/maxBid (LeagueBuilderAuctionDraft.tsx:321-377);
AuctionStage renders "Read $X / Cap $Y" (:199-204). Humans can bid every shill to exactly its
fold point; the walled-internals rule (F4) is broken at the UI. Fix: CPU panel shows the MOVE
only (bid/pass + plain reason), never valuation/cap. → Codex, small.

**DJ-03 [MAJOR · seam/economy] CPU-controlled clubs don't bid their identity — it re-rolls
every lot event.** cpuBidOnLot falls back to buildSeededCpuShill(teamId, seed) where seed =
per-decision (results.length, highBid, stillIn) — cpuShillBidding.ts:458,503-513 +
LeagueBuilderAuctionDraft.tsx:288-300; session.cpuShills only holds pure shills
(useAuctionDraft.ts:484). An AI club's effective archetype changes mid-lot; the market model
prices it with band priorities the bidder never reads (auctionMarketModel.ts:510). Fix:
populate per-club CPU profiles from their REAL capIdentity at init (stable), keep the
decision seed for noise only. → Codex; Fable reviews the profile derivation.

**DJ-04 [MAJOR · seam/money] ONE budget, three bases.** (a) Design-first pre-lock verdicts +
the Mode-A re-verify use a tier cap computed over the WHOLE player universe
(LeagueBuilderDraftSetup.tsx:605-612, :769) while the auction enforces the LOCKED POOL's
tierCap (leagueBuilderPoolRegistration.ts:109-119; useAuctionDraft.ts:460) — verdicts can
flip green→over-budget the moment the pool locks. (b) The designer prices bodies at stored
salary (IV×age×fame) against a pure-IV cap, while the room's asks are reserveCurve×IV —
three currencies in one journey. Fix (two stages): (1) compute the designer/extraction
budget from the CANDIDATE pool (Mode A: the extracted set; Mode B: the in-pool set) — small
wiring change; (2) unify the price basis — Fable design decision, fold into the v1.1 economy
batch if (1) suffices for v1. → (1) Codex now, (2) Fable spec.

**DJ-05 [MAJOR · seam] Design-first pool lock freezes MORE than the room reviewed.**
Registration unions team mlb/farm rosters into the snapshot
(leagueBuilderPoolRegistration.ts:92-105) but the reconciling auto-import is gated
`poolMode === "pool-first"` (LeagueBuilderDraftSetup.tsx:722), and the Mode-A extraction diff
only edits assignments (:920-925). Stray rostered players enter the auction unreviewed AND
skip hidden-modifier regen (leaguePoolAxisRegenPersist.ts:7-10). Fix: run the reconcile in
both modes (or refuse to lock while rostered-but-unassigned players exist, with a plain
hint). → Codex, guarded by a regression test.

**DJ-06 [MAJOR · seam] No legality check at the draft exit.** Nothing on the commit /
franchise-init path calls isLegalRoster: the commit writes whatever AUCTION_COMPLETE holds
(leagueBuilderAuctionPipeline.ts:228-270), the C4-A guard is state-only
(franchiseInitializer.ts:109-125), franchise validation is count-only 22/10
(franchisePlayerStorage.ts:415-437). Companions: AUCTION_COMPLETE can leave a club SHORT
(auctionStateMachine.ts:564-579, documented "surfaces downstream") and the first stop is an
unfriendly throw mid-wizard with no repair path; position-blind resumed sessions disarm the
in-flight guard (bidWouldStrand returns false on missing pos). Fix: an exit gate at draft
complete — per-club isLegalRoster + 22-count verdict ON the complete screen with plain
blockers, before the wizard is reachable. → Codex builds the gate; Fable reviews copy/UX.

**DJ-07 [MAJOR · seam] Designs can be re-locked AFTER the pool locks; START ignores
staleness.** Unlock/re-lock is free post-pool-lock (RosterDesigner.tsx:434-448); staleness
(lockedAt > poolExtractedAt) warns in zone 4 (:1493-1497) but startReady counts only HOW MANY
designs are locked (:644-649). Fix: pool lock freezes designs (readOnly), or START blocks on
staleness with the existing banner copy. → Codex, one gate condition.

---

## §3. MAJORS — the intent layer (the JK ruling's core)

**DJ-08 [intent] The board/plan layer still shows the bare-minimum half.** Confirmed chain:
"EST. $X OF $Y" + "$N TO SPARE" = the cheapest legal fill (engine totalCost) presented as
the GM's plan on the designer chip (RosterDesigner.tsx:279-298) AND zone-4 CLUB CHECK
(LeagueBuilderDraftSetup.tsx:195-206); the one genuinely fit-first ranking engine
(rankPoolForPreference, verified fit-first sort) is UI-ORPHANED; the whisper board ranks
iv+chemistry with NO archetype-fit or need term (rosterIntelligencePayload.ts:201-216) while
the IDENTITY light next to it judges exactly that. Fix (Fable's design, already ruled): the
verdict keeps cheapest math internally; the GM-facing board becomes the BEST-22 — fit-first
target roster under the cap (machinery exists: buildIdentityRoster + slotPreferenceBonus),
per-slot rankings via rankPoolForPreference, whisper board gains identity-fit + need terms.
→ Fable specs (BEST-22 spec next), Codex builds, Opus audits.

**DJ-09 [ui-truth] Fake visual encodings on the flagship stage.** (a) The help-layer
"identity tax" meter is a hardcoded 30% bar for every lot (AuctionStage.tsx:245-251).
(b) The farm scout band bar is fixed-width (30-42%) while its caption says "narrow band =
confident" (:404-418). Fix: compute or remove — a fake gauge is worse than none. → Codex.

**DJ-10 [ui-truth] Count semantics mislead.** (a) ×N on menu rows vs slot rows now share one
rule (DJ-00d) but remain pool-wide, non-exclusive counts — three slots can each claim the
same two bodies, and a blocked slot shows ×0 while its blocker knows the real relaxation
counts (engine :399-408). (b) THE ASKS "ASKING: N clubs" counts SLOTS (poolFromDemand
asks+=1 per slot; same-kind keys collapse) — one club × 3 bench slots reads "3 clubs".
(c) THE ASKS "IN POOL" matches shape only, ignoring the position/tags in the same row.
(d) The sufficiency chip's denominator is the feasibility floor + shill wins, labeled "draft
slots". Fixes: exclusive-count or relabel (a); count distinct teams (b); count the full ask
(c); relabel (d). → Codex batch; Fable reviews copy.

**DJ-11 [intent] Mode B's archetype gray-out never reached the identity picker.**
ArchetypePicker renders all 24 with no pool awareness (ArchetypePicker.tsx:122-171) though
the grading machinery runs on the same screen for zone 4's outlook panel. The designer half
of the rule works. Fix: feed draftability verdicts into the picker (gray + verdict line).
→ Codex.

**DJ-12 [seam] Carry-through dies at the franchise door.** Seat/GM names and team archetypes
deep-copy but have ZERO franchise-side readers (wizard re-declares control from scratch);
scout profiles snapshot write-only; hired reporters are league-scoped and filtered OUT by the
hub's franchiseId query (reporterStorage.ts:122). Manager partially carries. Known tickets
(STAFF-CARRY-THROUGH, CONFERENCE-SURFACE) confirmed still open — but seat/archetype death is
NOT ticketed anywhere. Fix: extend STAFF-CARRY-THROUGH to a full IDENTITY-CARRY ticket.
→ Opus tickets; Codex builds.

**DJ-13 [seam] Mode A extraction is shill-blind while the lock floor charges 10 bodies per
shill** (poolFromDemand passes {teams} only; hardFloor += shills×10) — EXTRACT can produce a
pool its own LOCK gate rejects at the default shill count. Companion: the default shill
count is the self-described PLACEHOLDER formula while the sim-backed recommendation renders
beside it ("2 · rec 3"). Fix: pass the shill term into extraction sizing; default the
stepper to recommendedShillCount. → Codex (extraction sizing change is engine-touching:
Fable reviews).

---

## §4. MINORS (batchable)

- DJ-14 Designer debounced save can drop a just-clicked LOCK DESIGN on unmount
  (RosterDesigner.tsx:374-387 cleanup flushes only on team change). Flush on unmount.
- DJ-15 verdict-tone/copy + shape/tag matching still duplicated page-side
  (designVerdictTone/Copy on LeagueBuilderDraftSetup vs RosterDesigner) — same drift class
  as DJ-00d; consolidate.
- DJ-16 avoid-fragile default misses the closer role (spec says SP1/C/SS/CP; no RP slot
  inherits it).
- DJ-17 TWO-WAY tag toggle renders on hitter-only slots where it's unsatisfiable — bricks
  the slot; scope the toggle.
- DJ-18 "Run it back" chip promises an action that doesn't exist (RUN-IT-BACK ticket open);
  today START on a drafted league lands on the completed session with no path back.
  Companion: hide the chip's verb until the action lands.
- DJ-19 Raw machine strings surface on strand/solvency rejections ("Auction transition
  rejected: bid-strands-roster") — add the human mapping (CPU already has one).
- DJ-20 "Lot N of M" off-by-one during the SOLD beat (counter names the next lot under the
  sold stamp).
- DJ-21 "ROOM SETTINGS: Inherited from Draft Setup" is unconditional copy; direct navigation
  shows the default under the "Inherited" banner. Persist the room's choice or drop the claim.
- DJ-22 Zone-3 "every club has an identity ✓" checks MLB identity only; farm identities can
  be empty while the scout is farm-identity-steered.
- DJ-23 Zone-3 club dot vs zone-4 CLUB CHECK judge the same design against different pools
  post-extraction (universe vs extracted) — collapses when DJ-04(1) lands.
- DJ-24 Copy register: "engine" noun in a player chip; "× contest"/"universe" in shortfall
  copy; shills vs MARKET SHILLS naming split; unformatted dollars in the budget blocker;
  farm lot card's inline tutorial line outside the ? layer.
- DJ-25 ~240 lines of unreachable legacy auction UI (second lot panel, LOT LOG,
  DraftRosterBoard path) — kill-on-sight per north star §5.
- DJ-26 needAwareCompletion never enabled from live pages (CPU wedge risk in high-CPU
  leagues); nominationOdds/projectBidVsPass + chemistryRemovalAdvice remain orphaned
  (ticketed family); snake-draft page consumes a stale unlocked pool with no axis regen
  (legacy path); Mode-A receipt re-derives on reload instead of reading a stored artifact;
  franchise backfill hidden-modifier seed omits the league scope (`player.id` vs
  `${leagueId}:${player.id}`) — normal path unaffected.
- DJ-27 BALANCE light + "No read yet" copy: honest stub, but permanently hollow until
  HANDEDNESS-SIGNAL lands (Fable spec queued); IDENTITY fallback copy same shape.
- DJ-28 The whisper has no farm-auction surface (ASST_GM_DESIGN binds it to MLB + farm;
  R-IA4 folds farm onto AuctionStage — make farm-whisper explicit in that ticket) and no
  nomination-turn surface (spec owns nomination strategy; currently null outside bid/claim).

## §5. VERIFIED CLEAN (highlights — full detail in the agent transcripts)

Locked pool → auction lots byte-identical (no re-derivation) · auction in-flight guard +
completion floor derive from the single LEGAL_ROSTER law (no parallel rule set found) ·
whisper: per-seat secrecy, live per-lot recompute, chemistry premium wired end-to-end,
value-vs-market verdict (not cheapest) · market read public/walled split intact except DJ-02
· all four START gates enforced · Mode A extraction wired end-to-end (checkpoint §3's
"placeholder" note is STALE) · designer adapter: twoWayVariant via canonical derivation,
profile field-complete, salary basis consistent designer→lock→auction charge · seat names
persisted (draftSeats/gmSeatName) · hidden modifiers: single lock path, deterministic
re-stamp, survive deep-copy · shill-count handoff chain intact · money units raw dollars
end-to-end, no fee drift (scout/staffing carry no fees).

## §6. ROUTING SUMMARY

- **Codex (mechanical, contract-ready):** DJ-01, 02, 05, 06, 07, 09, 10, 11, 13-wiring,
  14-25 batch, DJ-04(1).
- **Fable (design/spec):** BEST-22 board spec (DJ-08), price-basis unification ruling
  (DJ-04(2), v1.1 economy batch candidate), HANDEDNESS-SIGNAL (DJ-27), CPU club identity
  profile derivation review (DJ-03), design-review of DJ-01's new board frame.
- **Opus (captain):** ticket the unticketed (DJ-12 IDENTITY-CARRY, farm-whisper rider on
  R-IA4), sequence P0s before JK's browser pass, audit each fix diff.
- **JK:** one ruling requested — DJ-04(2): is "one price basis end-to-end" a v1 blocker or
  a v1.1 economy-batch item? Recommendation: v1.1, provided DJ-04(1) lands (the verdicts
  and the room then share the pool-relative cap; the remaining skew is per-player pricing
  nuance, not a verdict-flipper).
