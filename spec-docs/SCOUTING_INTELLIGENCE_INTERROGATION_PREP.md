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

## VERIFY-AT-BUILD (factual checks before coding)
- Archetype field is mutable/persisted in-season (re-pointable).
- Trade path clears outgoing salary cleanly + takes on incoming fully (no residual).
- The roster analyzer can accept a TARGET archetype param (today it's diagnostic-only against the declared one).
- The development engine produces archetype-correlated ratings trends (the "magic" gamble).
- The auction→franchise salary handoff can carry a reified true cost instead of just the bid.
