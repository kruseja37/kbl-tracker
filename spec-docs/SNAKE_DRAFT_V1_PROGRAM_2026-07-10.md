# SNAKE DRAFT v1 — BUILD PROGRAM (2026-07-10)
# Captain: Fable. Vision: SNAKE_DRAFT_VISION_2026-07-10.md (committed beside this doc —
# LAYERED: later sections supersede earlier on any conflict; the redline and JK closing
# rulings are the top layers). JK signed off 2026-07-10.
# THE FIRST LAW governs every lane: it's the GM's board; the Asst GM never picks, never
# optimizes, never rearranges — he does the money and the math so the GM has no blind
# spots, all in service of the GM's 22-man draft board.
# THE COPY LAW: every user-visible word passes the 14-year-old test.
# AUCTION PRESERVATION: the auction stays routed/testable, frozen for v2. Snake lanes may
# CONSUME shared pure engines; they never modify auction flow files. The auction suites
# green = a standing gate in EVERY lane. Any shared-seam change = STOP-and-report.

## STATES & LIFECYCLES APPENDIX (captain rulings — binding, one line each)
1. On-clock entry: opens in REVIEW with the advisor-recommended slot's top target loaded,
   NOTHING armed; empty board → the board view opens instead.
2. No-legal-candidate: structurally impossible after the seating proof + reserve rails —
   pinned as an invariant test; defensively, if ever hit → PLAN BROKEN + auto-pause.
3. AT-RISK threshold (money line): fires when the plan cushion is negative OR the cheapest
   legal finish depends on ≤2 remaining candidates at any position.
4. A drafted board/ranking name: strike-through beat + one toast, slot shows the promoted
   name, LOG holds the receipt; ranking views keep strike-throughs.
5. Pick correction: full pre-action snapshot restore (availability, retired versions,
   backfills, plan bills, offers invalidated by it); forecasts recompute; LOG receipt.
6. Trade correction: restores pick ownership and the active turn; anything the trade
   invalidated stays dead; LOG receipt.
7. The correction window covers ONLY the most recent completed action — no revival of
   earlier windows, ever.
8. Offer lifecycle: an offer dies on any executed pick/trade, withdrawal, decline, or its
   target pick changing hands; ONE open offer per club-pair at a time.
9. Trade-while-armed: a trade moving the live pick cancels any ARM (snap-back + notice);
   the new owner enters REVIEW.
10. Final pick: its correction window closes at an explicit commissioner CONFIRM DRAFT
    COMPLETE tap, which triggers the handoff.
11. Resume: reload restores the last recorded action; ARM is never persisted (resume =
    REVIEW); reveal state resets covered; pause state and open offers persist.
12. Companion loss: read-mostly, so nothing breaks; the seat re-claims on a new device
    (main approval) or the commissioner flips it to hotseat mid-draft in CLUBS.
13. Claims: one device per seat; a new claim replaces the old (old device gets a signed-out
    screen); main approval every time; >3 companion requests politely refused.
14. Sync: board/ranking edits are per-seat records (last-write-wins safe); a stale
    companion offer validates against the CURRENT session revision at main ("the draft
    moved on — refresh").
15. Setup failure: the seating proof names the shortfall ("NOT ENOUGH CATCHERS FOR 8 CLUBS
    — ADD PLAYERS OR REMOVE A CLUB"); GO stays dark; any pool/seat/order change re-checks.
16. Farm entry/exit: enters from the existing continuation arc after scout hire (same
    session model, farm mode bit); ends when all farm rosters are full → staff hire; prep
    carries per seat.
17. Versions (one-per-human): per the vision's v5.1 section; the COUNT-HUMANS-NOT-CARDS
    invariant has dedicated tests in every counting system (seating proof, supply, rational
    room, scarcity).
18. Practice mode (solo vs POC CPU picker): correction and pause work identically;
    fast-forward pauses on tap.

## CODE-TRUTH CHECKS (block their dependent contracts until answered with file evidence)
CT1. LUXURY_CAP_TABLES category structure: exact taxed categories and top-N per category;
     whether CP counts inside the reliever category (JK's preferred presentation: top-3 RP
     + 1 CP if the table agrees). → blocks S3's tax-core view final copy.
CT2. Farm scout variance: are scout bands per-club (scout hire quality) or league-shared?
     Per-club → farm named-player SCOUT PRESSURE allowed; shared → public role pressure
     only. → blocks S6's farm advisor scope.
CT3. Player-version linkage: does any human-identity field exist yet (legends thread may
     add one)? Determines the one-per-human implementation seam. → blocks S1a's versions
     work item (build the seam to the field if present; else a versionGroupId shim).
CT4. Team identity storage: where primary/secondary/alternate colors live; feasibility +
     size discipline for a logo image field (client-resize, cap). → blocks S7's logo slot.

## THE LANE MAP (contract bodies — dispatch-time contracts copy these verbatim)
Common to every lane: contract-first commit · spec/repro-first tests · gates = tsc, build,
owned suites, THE AUCTION SUITES (preservation), one full vitest (known solo-flake list
applies) · builder Codex 5.6-class at xhigh for engine/economics lanes, medium for
UI-assembly lanes (probe for a higher 5.6 variant on CRITICAL lanes — S1a, S4 — per JK) ·
independent opus audit · captain merges via JK-clicked PRs · UNKNOWN = STOP.

### S0 — THE TRANSFER AUDIT (investigation; opus)
For each candidate (cheapestLegalCompletion + seating math · auctionMarginalTaxWithCaps +
normalize · assembleBoard/rankings storage · derivePickValueChart · scout fog components ·
privacy reveal law · per-pick session persistence · D1 handoff · POC snake page/engine ·
ADVISORCOLOR emission pattern): verdict TRANSFER (with the value it adds) / ADAPT (what
changes) / STAYS BEHIND (auction-shaped). Output: the transfer manifest; every S-lane
imports only manifest-approved modules. Also confirm the POC page's fate: rebuilt in place
vs fresh page consuming its engine.

### S1a — FOUNDATIONS: ENGINE (critical lane)
Session model v2 (board storage per seat · positional rankings · versions/one-per-human
retirement · pause/resume · correction snapshots per appendix 5-7) · the SIMULTANEOUS
seating proof (with versions dedupe) · the rational room (public-inputs hard invariant,
locked-at-GO archetypes, interest = fit-worth × need − true-cost drag, legality rail;
deterministic; 8-club validation harness + "risk read matches playout" invariants) · the
plan/tax model (22 unique IDs; membership-not-slots changes tax; PLAN COST/TAX/CUSHION vs
LEGAL-FINISH CUSHION as two engines-level quantities) · the guide package validator
(balancing return picks; both clubs keep legal finishes; revalidation entrypoint).
STOPs: any need to modify a shared auction engine; CT1/CT3 unresolved at their work items.

### S1b — SETUP (UI assembly)
The four-card lean setup on a NEW page (not Draft Setup): POOL (source leagues → everyone
in; trim list grouped by human with version pickers; supply line from the seating proof) ·
CLUBS (one-line rows: seat, human, companion-vs-hotseat, archetype, GM name) · ORDER
(seeded shuffle w/ visible seed; tap-two-swap; snake preview + endpoint back-to-backs) ·
GO (readiness; re-check staleness per appendix 15). Copy law throughout.

### S2 — THE ROOM (UI assembly)
The shared main: public frame (order strip, neutral ticker, club lens: real-time roster +
owned picks) + the focus stage · THE RITUAL five-state machine (REVIEW/ARM/ANNOUNCE/
RECORDED/CORRECTION; gavel hold w/ fill meter + release-cancel; face-down team card) ·
the five sounds (toggleable) · commissioner controls (pause/resume, correction, trade
approval seat) · reveal-on-main + hotseat PASS-TO covers · team colors alive everywhere.

### S3 — THE PRIVATE DESK (UI assembly + engine consumption)
Positional rankings prep (frozen-touch law; archetype chip + fit word + TRUE COST per
card) · THE BOARD view per the pixel law (danger badges only; plan ledger; tax core
tap-down [CT1]; WHAT-IF keep/revert — no optimizer, ever [First Law tripwire test]) ·
backfill toast+receipt · THE LOG (leash rules; expiry; one live sentence; LLM-dressed via
the gated ADVISORCOLOR pattern) · risk badges ("NEXT PICK — SAFE TO WAIT / AT RISK /
LIKELY GONE" with reasons behind taps).

### S4 — TRADES (critical lane)
The guide surface (posted prices, always accessible, "what does pick N cost?") · trade-up
flow (slot → auto package incl. balancing picks → dual nod → COMMISSIONER approve/decline
→ ownership swap → active turn changes if the live pick moved) · LOG trade recommendations
(validator-sourced only; revalidate at approval; EXPIRED semantics) · appendix 8/9 offer
lifecycle.

### S5 — COMPANIONS
Seat claim (name + room code + main approval, team logo on request) · the private desk on
companions (write: own records only) · read surfaces (ticker/board/lens) · sync freshness
+ appendix 12-14 lifecycles · "SHARED DRAFT ROOM" / "YOUR PRIVATE DRAFT DESK" labeling.

### S6 — THE FARM ROOM
Farm snake variant: fog cards (scout bands; SCOUT'S CALL), slotted salaries from the
absolute pick (fixed table, tuned once), SCOUT PRESSURE advisor per CT2's answer, guide
trades, same ritual/room, farm handoff (appendix 16).

### S7 — IDENTITY, SOUND & SEASON PROOF
Team editor LOGO slot [CT4] + logo rendering (ritual card, lens, order rail) · the 14-year-
old copy sweep across both rooms (audited against the copy law) · practice-mode wiring
check · THE CLOSING GAUNTLET: full snake draft (8 clubs, humans simulated) → farm snake →
staff → franchise init → season-ready assertions (salaries, morale, farm budgets, staff) —
the program's exit proof, extending D1's gauntlet to the new session model.

Sequencing: S0 ∥ CT1-4 → S1a → S1b ∥ S2 (file-disjoint) → S3 → S4 → S5 ∥ S6 → S7.
File-surface partition proven before any parallel pair runs.
