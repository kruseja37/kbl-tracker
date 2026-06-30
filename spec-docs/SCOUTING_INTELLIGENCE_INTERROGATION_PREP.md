# SCOUTING INTELLIGENCE — Interrogation Prep (living question bank + settled decisions)

> Per [[v1-rulings-2026-06-30]] Decision A: the full scouting intelligence is a v1 BLOCKER, and JK wants a
> first-principles INTERROGATION → a completed/nuanced spec BEFORE any build. This doc accumulates the
> SETTLED decisions and the OPEN questions from the 2026-06-30 design dialogue so the interrogation starts
> from everything already established. Companions: `DRAFT_GUIDE_INTELLIGENCE_SPEC.md` (the existing spec to
> tighten), `IN_SEASON_CAP_DEADCAP_ANALYSIS_2026-06-30.md` (the economy half), `V1_PLAN_2026-06-30.md`.

## THE CRUX (JK, 2026-06-30): there is ONE canonical "true cost" per player, carried everywhere, always shown
JK identified a real hole: today the auction sells a player at his BID price and carries only that face
salary into the season; the off-archetype luxury tax only shrinks your max bid invisibly in the background
and is never tacked onto what the player actually costs you. **Fix: reify the true cost.** The scout
computes and DISPLAYS the player's full price — intrinsic value/bid **+ the archetype-fit penalty given your
declared archetype** — and THAT one number is what you pay and CARRY into the season (the season cap hit),
and is the basis for dead-cap and trades. One honest number, used at the draft, in-season, on send-down, in
trades. This **disincentivizes reaching for off-archetype players** (you see the full cost up front) without
any new mechanic — it just makes the already-real cost visible and consistent.

**This RESOLVES (un-retracts) the dead-cap double-counting question.** The double-count only existed because
today's system has TWO notions of cost (an invisible tax + a face salary). Collapse them into ONE true cost
carried everywhere, and "dead-cap on true cost" is no longer a second charge — it's the same single cost
basis applied consistently. (The earlier retraction in `IN_SEASON_CAP_DEADCAP_ANALYSIS §10` was correct for
the CURRENT invisible-tax system; JK's reified-true-cost model is the better target and flips it back.)
NUANCE for the interrogation: the reified cost is LOCKED at draft (computed against your declared archetype
at that moment); evolving your archetype later does NOT recompute already-acquired players' costs (consistent
with "no in-season archetype tax").

## SETTLED DESIGN DECISIONS (2026-06-30)
1. **One canonical true cost, reified + visible + carried** (the crux above).
2. **NO in-season archetype tax of any kind.** Changing archetypes, building/not-building around them, and
   especially cross-archetype CALL-UPS/SEND-DOWNS carry ZERO penalty. Rationale: the MLB and Farm archetypes
   are deliberately DIFFERENT (to fill holes), and the farm system EXISTS to call players up — which mixes
   the identities. Penalizing that would break the core pipeline. The archetype is a draft-time pricing lens
   + a strategic/scout frame, not an in-season leash.
3. **The game-theory of construction "drift" is EMERGENT (the development gamble), NOT a tax.** Building
   lopsided (e.g. pitching-first, weak bats) is a BET that your cheap young bats develop (ratings trend up,
   traits adapt) and you become complete for the home stretch at a low payroll — OR they regress and you
   carry a hole. The disincentive for a bad fit is the RISK the bet fails; the incentive for a good fit is
   riding the development wave to a title at similar payroll. This lives in the existing ratings/development
   system; the scout's job is to surface the projected trajectories so the GM bets with eyes open. ("That's
   the magic.") No artificial drift penalty.
4. **Archetype = declared-but-EVOLVABLE identity** (separate for MLB & Farm), evolvable freely in-season; the
   only "cost" of changing is the natural roster churn. (From the prior turn — confirmed.)
5. **ONE analyzer, two surfaces.** The "aim the roster analyzer at a TARGET archetype → ranked keep/add/drop/
   trade plan with costs + fan-morale swings" engine powers BOTH: (a) the pre-auction **Scout Draft Board +
   GM Draft Board** (built after declaring archetypes, before the auction), and (b) the in-season evolution
   **dropdown**. Same engine, pre-draft and in-season.
6. **A comprehensive, balanced archetype list is now REQUIRED, not optional.** For evolution + the boards to
   be meaningful, the archetype set must cover the whole team-building strategy space with no holes, all
   sim-balanced. Reinforces [[v1-rulings-2026-06-30]] Decision C (principled gap-fill, game-able = out).
7. **Auction archetype LOCK (load-bearing guardrail).** The declared archetype is locked for the duration of
   the auction — you cannot re-declare mid-auction to dodge the off-archetype cost. Without this the entire
   "true cost is paid at the draft" logic collapses.
8. **Re-declaring the identity (not exploring) is a deliberate, cooldown-gated EVENT with a one-time
   fan-IDENTITY morale nod**, scaled to how far the new identity is from the old AND how it clashes with your
   actual evolved roster (ratify reality → ~0; whiplash against your roster → fans grumble). JK confirmed he
   likes this. Drift = free; re-declaring = a felt story beat.
9. **Visibility rule:** every decision moment shows the real $ + fan/morale consequence before you commit —
   auction (true cost + fit), send-down (exact dead money + fan reaction by the player's fame/value), trade
   (relief/take-on + morale), evolution (the full costed plan). Nothing hidden, nothing retroactive.

## OPEN INTERROGATION QUESTIONS (resolve WITH JK)
- **Q1 (NEW, JK 2026-06-30):** Should users assign team archetypes to specific teams in **League Builder**,
  before the draft pool is assembled? Does the archetype FOLLOW the specific team in the league initially
  (a persistent franchise identity — "this team is always a Bash Brothers club") or is it chosen only as
  part of the draft process (fresh each draft)? Per-team-persistent vs per-draft.
- **Q2:** The reified true-cost formula — exactly how is the archetype-fit penalty computed and turned into a
  carried dollar number? (Per-player vs the current whole-roster concentration model; how it maps to a single
  carried salary line.) The DRAFT_GUIDE spec needs pinned math here.
- **Q3:** How punitive should the off-archetype premium be — strong enough to steer, not so strong that
  filling a genuine hole off-archetype is never viable? (It's a disincentive, not a prohibition — the scout
  shows it so the GM can choose to pay it.)
- **Q4:** The three plans (Conservative/Optimal/Aggressive) + the boards + the in-season dropdown — one
  unified analyzer interface? What's the plan-distinctness guarantee?
- **Q5:** Does the development/ratings system actually produce the "young bats trend up if you build around
  them" dynamic strongly enough to BE the game-theory? (Verify the development engine supports the magic.)
- **Q6:** MLB vs Farm boards/plans — how do they "marry"? How does the scout reason about call-up candidates
  whose farm-archetype differs from the MLB identity?
- **Q7:** Hard-cap vs soft-tax interaction with the reified cost (Decision B was soft tax — confirm how the
  reified true cost interacts with the soft luxury-tax/payroll-percentile/fan-morale machinery).

## FAN-MORALE × SALARY × ALBATROSS × SHILLS (verified 2026-06-30 — JK's payroll-morale question)

**Fan morale does NOT watch total payroll today.** In-season morale moves on RESULTS vs a TALENT-based
expected-wins baseline (`expectedWins = gamesPerTeam/2 + (teamTrueValue − leagueAvgTrueValue)×0.5`;
`calculateMoraleBaseline = 50 + expectedWinsDiff×2 + standingsFactor`). The "expected wins" JK remembers is
real but **talent-derived (True Value = WAR-percentile→salary), NOT contract spend.** The ONLY payroll→morale
coupling is a ONE-TIME **draft-freeze** spend penalty (`computeDraftFanMorale` ranks teams by relative
auction spend; biggest spenders start with lower morale = higher expectations). Even the talent→expected-wins
→morale path is **confirmation-gated / `calculatesExpectedWins:false` in v1** (not auto-mutating yet).

**RECOMMENDATION: do NOT build a payroll→morale layer (CUT it).** What JK wants ("are we getting our money's
worth?") is **already answered by the talent model**, because in this economy salary ≈ True Value: a team that
pays top-3 money bought top-3 True Value → high expected-win bar → if they're in the cellar the EXISTING
performance gap already bleeds morale; and where salary diverges from True Value (overpaid), the ALBATROSS
system already handles it. A separate payroll signal is (a) redundant where it agrees, (b) **exploitable**
(spend low to lower the bar = expectation laundering), and (c) **unfair to a deliberate rebuild** (cheap+bad is
correct strategy; the talent model correctly keeps a cheap losing team neutral; a payroll layer would punish
it). → Instead, just **flip the existing talent-based expected-wins→morale path LIVE** (it's gated off in v1).

**Salary-albatross disincentive — JK's instinct is RIGHT, with caveats:**
- Albatross mechanic is BUILT and keys EXACTLY on salary-vs-production (`salary ≥ 2×MIN` AND
  `valueDelta/contractValue ≤ −25%`, valueDelta = trueValue − actual salary; the single worst-value player per
  team). A high-salary/low-IV off-archetype overpay is the textbook trigger. **BUT flag-OFF + accumulate-only**
  (`FRANCHISE_PHASE2_FLASHPOINT_ENABLED_DEFAULT=false`) — the tax never reaches live morale (needs flag + a
  consumer). The "hard to trade" half **does NOT exist** — the live trade path has NO CPU acceptance gate (user
  trades self-execute); the only salary-aware willingness logic (`evaluateTradeForAI`) is ORPHANED dead code.
- **DOUBLE/TRIPLE-PUNISHMENT GUARDRAIL (important):** the auction overpay is ALREADY the full honest cost
  (you paid more for less, self-correcting). Stacking albatross morale tax AND trade-lock on top = billing the
  same mistake 3× → a death spiral that turns a "priced choice" into a "trap." **Pick ONE back-loaded
  consequence (morale tax OR trade resistance, not both).** Ensure the albatross fires only on GENUINE absolute
  overpay (the −25% gate is hard, so a clean roster has NO albatross rather than always electing its
  least-best player). Trade resistance, if built, must be RESISTANCE (CPU takes the bad contract at a
  discount/sweetener), never a WALL (outright refusal).

**Shill aggressiveness (JK's auction-liveness worry — verified & valid):** shills today are deliberately
CONSERVATIVE, fold early, bid only the min increment, are hard-capped so they're never a guaranteed bidder
(`NO_FLOOR_MAX_INTEREST_PROBABILITY=0.92`, anti-hidden-floor), and are **OFF by default**
(`DEFAULT_CPU_SHILL_COUNT=0`). Logic lives in `cpuShillBidding.ts` (NOT the parked WIP — the WIP left it
untouched, only added shill-team-identity plumbing). There is **no pushback-on-pass** behavior. The safe fix
(NOT global aggression): a shill provides pushback **only when a lot is about to clear at the floor with zero
competing HUMAN bids**, **capped hard at fair-value-to-a-fitting-team**, and **only on lots the shill itself
fits** (else shills bid up off-archetype prices and UNDO the disincentive); **keep the 0.92 no-floor cap** —
liveliness comes from the silence TRIGGER (a state change), not from raising the probability ceiling. Add one
"liveliness" knob + flip the default shill count above 0. Aggressive-everywhere shills become the price-setter
and snipe the nominating human (worse than a dead lot).

**BUILD-REALITY (state plainly — this is DESIGNED, not mostly-built):** talent→expected-wins→morale = built
but gated off in v1; albatross salary-vs-IV math = built but dark + unconsumed; trade resistance = unbuilt
(orphan code); payroll→morale = doesn't exist (and shouldn't). So the off-archetype back-loaded "reckoning"
does NOT run in production today — shipping it = (a) flip talent-morale live, (b) wire the albatross consumer,
(c) optionally build ONE of {trade-acceptance gate}, (d) the silence-triggered shill knob — + §16 tuning of
placeholder magnitudes. Sequence into the living-season + scouting builds; do not greenlight as "mostly there."

## CORRECTIONS (JK 2026-06-30, same session) — supersede the shill + trade-build guidance above

**(S) SHILL MODEL — JK's is cleaner; my "fair-value-capped backstop" was WRONG.** Do NOT cap shills at IV /
fair value ("otherwise why not just set the reserve at IV?" — that defeats the purpose). The shill is a
**hidden rival GM building toward its OWN secret archetype** (hidden from the humans). It therefore:
- bids on SOME players and not others (by fit to ITS hidden archetype);
- goes HIGHER, aggressively, on players that fit its archetype — **allowed to pay its archetype premium ABOVE
  raw IV** for a strong fit, exactly like a human would (so NO fair-value cap);
- bows out early on players that don't fit it at all;
- is willing to STAY IN even when all-but-one human is passing — because it genuinely wants that player for
  its team (it's a bidder not on the couch);
- is **UNPREDICTABLE on purpose** — "it just can't be predictably consistent or it's pointless." Sometimes it
  contests a quiet lot, sometimes not. (This matches the existing `NO_FLOOR_MAX_INTEREST_PROBABILITY=0.92`
  never-guaranteed design — KEEP that randomness.)
This is CLOSE to the built `cpuShillBidding.ts` (archetype-fit valuation × personality × noise + a probability
roll). Likely build delta = **give each shill its OWN hidden target archetype** to build toward (verify
whether it has one today vs. generic fit), let its valuation carry an archetype premium on fits (don't cap at
IV), and ensure it'll chase its fits into a quiet room. DROP the earlier "silence-trigger + fair-value cap +
fit-to-a-fitting-team" reframe — superseded. Shills are **DRAFT-ONLY** (see below).

**(T) v1 IS USER-CONTROLLED TEAMS ONLY — no post-draft/in-season AI logic.** All teams in a league are humans
(couch co-op). Consequences:
- **No CPU trade-acceptance gate to build.** The "harder to trade an above-IV/albatross contract" disincentive
  is **FREE human game theory** — human GM B won't take GM A's overpaid underperformer because that contract
  would become B's own albatross. Nothing to wire (the earlier "trade resistance = net-new CPU wiring" is
  DROPPED for v1). The ONLY thing that must be active is the **albatross DESIGNATION logic** (so humans can SEE
  a player is an albatross / above-IV) — and that designation is already built (`franchiseDesignationEligibility`).
- **Shills exist only in the DRAFT auction**, not in-season (in-season is all humans).
- **The double-punishment / death-spiral risk is much LOWER than flagged.** It assumed a hard AI trade-WALL;
  with human-only trades the trade reluctance is SOFT and escapable (a human can still take the contract for
  the right return). So **the auction overpay + albatross morale tax + soft human trade-reluctance is a fair
  "warning + reckoning," NOT a trap** — the "pick only ONE back-loaded penalty" guardrail RELAXES (it was
  predicated on the hard wall). Still keep the albatross morale tax a "tax not a cliff" (it already is).
- **Still recommended:** flip the talent-based expected-wins→morale live; turn on the albatross designation +
  its morale tax; CUT the payroll→morale layer (unchanged). These are the only in-season economy builds for v1.

## VERIFY-AT-BUILD (factual checks before coding)
- Archetype field is mutable/persisted in-season (re-pointable).
- Trade path clears outgoing salary cleanly + takes on incoming fully (no residual).
- The roster analyzer can accept a TARGET archetype param (today it's diagnostic-only against the declared one).
- The development engine produces archetype-correlated ratings trends (the "magic" gamble).
- The auction→franchise salary handoff can carry a reified true cost instead of just the bid.
