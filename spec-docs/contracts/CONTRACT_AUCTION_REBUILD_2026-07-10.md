# CONTRACT — AUCTION REBUILD + VIABILITY LOOP (2026-07-10)

**Builder:** Codex (xhigh, time-loop mode per JK). **Auditor:** independent opus agent.
**Captain:** Fable. **Branch:** codex/auction-rebuild. Base: main @ 44c645e3 (post-SHILLTAX).
**Git discipline:** no git write commands; captain cuts commits; APPEND reports here only.
UNKNOWN or mid-build surprise = STOP-and-report.

## Why this exists (JK, verbatim substance)
The auction as-is is non-competitive mid-draft and "will need to be deferred" if it can't be
made to work. JK's structural rulings define the rebuild; this lane builds them and then runs
a BOUNDED measure-tune loop. The exit is a mechanical verdict: **GO** (the bar is met) or
**DEFER** (budget exhausted without meeting it). Both are acceptable outcomes — report the
truth.

## §1 The ruled structure (JK 2026-07-09/10 — none of this is negotiable)
1. **Sequential manual nomination.** Auto-nomination is removed. Non-shill clubs nominate in
   a fixed rotation (round-robin over the club order); shills NEVER nominate. A club with a
   full roster is skipped in the rotation.
2. **The nominator opens the bid**, choosing any opening price ≥ LEAGUE_MINIMUM_SALARY (low
   opens allowed — this is the point). The nomination IS a committed bid: if nobody counters,
   the nominator wins at the open. CPU clubs choose nomination targets and opens via their
   existing valuation machinery (board value / need / fit — reuse, don't invent); their open
   price policy is a TUNABLE (see §3).
3. **One shot per player.** There is no "pass the lot" and no recirculation: every nominated
   player SELLS (at worst to the nominator at the open). Un-nominated players simply never
   enter. Delete the passed-lot machinery accordingly (backfillFromPassedLots and the
   UNSOLD-returns semantics); the GONE concept applies only to shill wins.
4. **Shill wins leave the board permanently.** No redistribution to clubs — delete/disable
   the settle-from-shills redistribution and shill-reclamation paths for this flow. Shills
   remain untaxed (shipped in SHILLTAX) and become explicit **value-anchored market-makers**:
   while solvent and under their win cap, a shill counters any bid that sits meaningfully
   below the player's market band (anchor fraction of the market estimate — TUNABLE), which
   polices JK's tanking exploit (nobody gets a star at the minimum just because rivals are
   full or broke).
5. **End condition:** the auction ends the moment every non-shill roster is legally full
   (22). Remaining pool players stay exactly as they are (free agents of the league) — no
   cleanup redistribution. Users advance to the existing continuation arc.
6. **Completion with no safety nets:** deleting recirculation/redistribution removes the old
   completion guarantees, so completion must be structurally provable instead:
   - A club with open seats MUST nominate on its turn (the UI/CPU picks something; minimum
     open is affordable by construction because the completion reserve already holds back
     minimum-fill money).
   - The existing must-fill/emergency machinery constrains late bids and nominations to
     legal-roster needs (require-a-closer etc.).
   - Supply invariant at start: the existing POOLFLOOR position floors remain the entry gate.
   - PROOF OBLIGATION: a deadlock-freedom argument in the report (every state with an
     incomplete club has a legal move that strictly progresses the draft) plus gauntlet
     evidence — no stranding across all runs.

## §2 What this replaces (delete/disable honestly, don't strand code)
Auto-nomination flow; lot passing + backfillFromPassedLots; UNSOLD-comes-back semantics;
settle-from-shills redistribution + reclaimShillHeldForShortfall for THIS flow; reserve-price
as the opening ask (reserve dial's role is superseded by nominator opens + shill anchoring —
keep the storage field, retire its effect, note it for the captain's UI cleanup later).
Update the affected copy (VOICE law), tests, and the handoff-check exit screen (no more
"settle from shills" step — the end condition replaces it). Whisper/advisor surfaces that
referenced passing a lot get the minimal honest rewording ("let him go" now means letting the
current bid stand, not recirculation).

## §3 The tunables (the loop's knobs — nothing else may be tuned)
- shillCount recommendation (per league size)
- shill anchor fraction (how close to market the shill defends; e.g. 0.5–0.8 × market-low)
- shill per-win cap and total-wins cap
- CPU nomination open policy (fraction of own value; strategic-low vs sincere)
- pool surplus multiplier (supply beyond teams×22 so one-shot nominations can't starve needs)
Club tax math, cap tables, IV, and all non-auction economics are OUT OF BOUNDS this lane
(the small-league cap-normalization loop is separate, later).

## §4 The loop (bounded, mechanical)
Phase A — build §1/§2 with repro-first tests (the old behaviors pinned red where they must
die; the new mechanics pinned green), then all standard gates.
Phase B — the viability loop, max **6 iterations**: run the measurement harness
(scripts/auctionCollapseDiagnosis.test.ts pattern, extended for nomination flow) on ≥3 seeds
× {4-team, 8-team} production defaults; score against THE BAR; adjust only §3 knobs; repeat.
**THE BAR (all seeds, both sizes):** ≥2 willing bidders on ≥70% of lots; no club
>8-consecutive-lot lockout before 75% of its roster is filled; every club completes a legal
22 with zero stranding and zero safety nets; shills solvent throughout; median winning price
within [0.5, 1.5] × market estimate (sanity: neither fire-sale nor runaway).
Phase C — verdict appended here: **GO** (bar met; final knob values recorded as the tuned
defaults) or **DEFER** (best-achieved metrics per iteration, the binding constraint that
could not be satisfied, and your honest analysis of why). Do not soften the bar to reach GO.

## §5 Gates
tsc clean; build exit 0; auction suites (state machine, gauntlets — updated to the new
structure, useAuctionDraft, market model) green; ONE full vitest (new reds = fix or STOP;
known solo flakes list applies); the harness runs committed + reproducible.

## §6 Report
APPEND: per-item disposition; the deadlock-freedom argument; per-iteration loop table (knobs
+ metrics); the verdict; rough-edges list for JK's browser session if GO.
