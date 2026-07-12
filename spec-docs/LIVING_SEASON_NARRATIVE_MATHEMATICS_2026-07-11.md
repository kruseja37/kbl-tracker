# The Living Season's Narrative Mathematics
**Fable 5 · 2026-07-11 (final design, written on last tokens) · Status: DESIGN OF RECORD for the
"seamlessly magical" layer — v1.1, after the flip gate. Every mechanism below is grounded in
engines that exist on main today; nothing requires new gameplay data capture.**

## 0. The thesis
The living season is now mechanically correct: stats aggregate, fame accrues, morale moves,
relationships form organically, development loops closed. What separates *correct* from *magical*
is not more events — it is **continuity, anticipation, memory, selection, and stakes**. Those are
five computable properties. A season feels alive when tonight's game seems to remember last
month, when something is at stake before the first pitch, and when the narrator notices the one
thing a real beat reporter would notice — and stays silent about the rest.

Everything below is a **pure compute family over existing signals** (WPA/leverage, fame
heat/reach, morale snapshots, relationship edges with provenance, milestones, park records, L12
races, schedules, civil dates) feeding the existing Tootwhistle reporter seam (pure adapter →
LLM-gated emission). No GameTracker changes. Build-dark inside the living-season flag family.

The governing constraint is JK's ruling R-E: **attention, not magnitude, is the scarce
currency.** The 38-immortals failure generalizes — a narrator that narrates everything narrates
nothing. Most of the math below is selection math.

---

## 1. Anticipation — the stakes vector (build FIRST; read-only, zero risk)
Before each scheduled game, compute `StakesVector(gameId)` from current state:

- **Milestone proximity**: for each rostered player, `prox = 1 − remaining/window` for the
  nearest career/season milestone (window: 5 HR, 3 W, 100 K, etc.). Stake if prox ≥ 0.6.
- **Record proximity**: park + league records reachable tonight (single-game records always
  "reachable"; counting records via proximity as above).
- **Grudge lines**: relationship edges (rivalry/feud, event-driven overtake/snub/envy) where the
  two players are on opposing rosters tonight — carry `intensity` and `formationSource` (a
  revenge game is a rivalry whose source event was an overtake BY tonight's opponent).
- **Race pressure**: L12 race deltas involving players on either roster (award gaps ≤ the
  90th-percentile single-game swing).
- **Hot seat**: fan morale within `hotSeatBand` of the L11 firing threshold for either manager.
- **Streaks live tonight**: any active streak (team or player) whose continuation/severance is
  decidable tonight.

Each component is normalized to [0,1]; the vector is emitted to the Lens "Tonight" card and to
the reporter as *pre-game stakes copy* (1-2 items max — see §4 selection). **This alone converts
the mode from reactive to anticipatory, and it cannot corrupt anything: it writes nothing.**

## 2. Memory — rhyme detection and callbacks (the cheapest magic multiplier)
Every narratable moment gets a lightweight feature tuple at emission time (persisted alongside
the news item — fields all exist or are trivially derivable):
`(actorIds, parkId, situationClass, valence, magnitudeBucket, civilDate, sourceEventIds)`.
`situationClass` is a small enum (walk-off, blown-lead, milestone, robbery, meltdown, duel,
comeback, collapse...). When a new moment lands, score **rhyme** against the season's memory
store:

`rhyme(new, old) = w_a·actorOverlap + w_p·samePark + w_s·sameSituationClass + w_v·valenceFlip`

where `valenceFlip` REWARDS inversion (the reliever who blew it in May closing out the same
team in August is a better story than a repeat). Callback fires when `rhyme ≥ θ_callback` and
feeds the reporter the old item's civil date and one-line summary: *"...eleven weeks after
[that night] at the same park."* Cap: at most one callback per story; fatigue per pair (§4).
Provenance via `sourceEventIds` makes every callback verifiable — no hallucinated history.

## 3. Continuity — story arcs as state machines with tension integrals
An **arc** is an open question the season is tracking. Arc rows live in a small own-DB store
(register in backup/sync/sandbox/save-slot manifests per house rules) with the outcome-ledger
receipt discipline we built for branches:

`{arcId, kind, subjectIds, openedAtGame, state, tension, lastBeatGame, receipts[]}`

- **Open** when a detector fires: slump-watch (rolling z ≤ −1.5 over `slumpWindow`), surge-watch
  (z ≥ +1.5), streak ≥ threshold, rivalry intensity crossing a band, race gap tightening below
  a band, manager under `hotSeatBand`, rookie ahead of milestone pace...
- **Tension integrates** while open: `tension += leverageWeightedDelta(game)` — each game the
  question stays unresolved under real leverage adds tension; quiet games decay it slightly
  (`tensionDecay`). Beats (mid-arc emissions) are allowed only when tension crosses ratcheting
  thresholds — an arc may speak at most every `beatSpacing` games (anti-nag).
- **Resolve** with payoff proportional to accumulated tension × resolution leverage:
  `payoff = √tension × √LI_resolution` (the same shape as fame's leverage math — consistency
  matters; players' biggest fame moments and the narrator's biggest stories will coincide).
  Redemption (slump → walk-off) pays a `valenceFlipBonus`. Fizzles resolve honestly with small
  copy ("the streak ends quietly in the eighth") — **payoff conservation: every opened arc gets
  exactly one resolution receipt; no dangling arcs** (L-SIM invariant: no arc open > `maxArcAge`
  games without a beat; season finalize closes all with fizzle receipts).

## 4. Selection — the camera principle (attention economics)
Every candidate emission (event story, arc beat, callback, stakes item) is scored:

`S = drama × novelty × leverage × resonance ÷ fatigue`

- `drama`: normalized magnitude within its situationClass (a 3-run 9th-inning shot scores by
  WPA, a milestone by rarity).
- `novelty = -log2 p̂(situationClass this season so far)` — the 6th walk-off of the month is
  not the 1st.
- `leverage`: game-state LI at the moment (already computed everywhere).
- `resonance`: +boost when the subject has high fame reach OR an open arc OR tonight's stakes
  vector flagged them (the system pays off its own setups — this term is what makes it feel
  *authored*).
- `fatigue`: per-subject and per-situationClass exponential recency penalty (half-life
  `fatigueHalfLife` games). The same player cannot headline nightly; the same trope cannot
  repeat weekly.

**Hard budget: `K_stories` per game (default 2) + at most 1 pre-game stakes item.** Everything
below the line goes to the wire (dedup rules already exist) or stays silent. Silence is a
feature: it is what makes the spoken things feel chosen.

## 5. Pacing — multiple seasons in one (R-E's compression, made concrete)
A pacing schedule `w(t)`, t = gamesPlayed/seasonLength, modulates the thresholds above:
- **Act I (t < 0.25)**: formation-friendly — arc-open thresholds lowered, callbacks rare (no
  memory yet), stakes emphasize firsts and introductions.
- **Act II (0.25 ≤ t < 0.7)**: deepening — rivalry/development arcs favored, callback weight
  rises (memory exists now), novelty term strictest here (the dog days must not repeat).
- **Act III (t ≥ 0.7)**: consequence — leverage term gains exponent (`LI^(1+actIIIBoost)`),
  race/hot-seat stakes dominate, arc resolutions preferred over new opens (close the books).
All three are monotone dial families, not new mechanics — tuned at the TUNE sit-downs against
R-E shape targets ("act III stories reference stakes ≥70% of the time"), never magnitude caps.

## 6. Surprise — computed, never asserted
`surprise = −log p(outcome | pregame model)` using the expected-stats machinery that already
powers development signals (and win probability for game outcomes). High-surprise moments get a
drama multiplier and become preferred memory anchors (§2). The guard is absolute: surprise is
**computed from the model, never claimed rhetorically** — the narrator may only call an upset
what the math says was an upset. This keeps the voice honest, which is what lets it be trusted
when it does go breathless.

## 7. Voice — deterministic register mixture at the emission seam
Per selected story, choose a register (deadpan / breathless / statistical / wry / elegiac) by
seeded draw with weights conditioned on `(drama, situationClass, act)`. The seam stays exactly
the established pattern: pure adapter computes everything incl. register; the LLM emission is
gated and receives register as instruction. Same seed → same story → same voice (L-SIM safe).

---

## 8. Build order (each a lane-sized contract; smallest magic first)
1. **STAKES-1** — §1 pre-game stakes vector → Tonight card + one pre-game reporter item.
   Read-only compute; the ideal first walk-visible win.
2. **CAMERA-1** — §4 scoring + budget over the EXISTING emission stream (no new stores).
3. **ECHO-1** — §2 memory tuples + rhyme callbacks (adds one store; registries per house rules).
4. **ARC-1** — §3 arc store + slump/surge/streak detectors only; receipts + invariants.
5. **PACING-1** — §5 schedules over the above.
6. **SURPRISE-1 / VOICE-1** — §6-§7 refinements.
Every lane: build-dark in the living-season family, deterministic (seeded, no Date.now in
compute), L-SIM invariants (arc conservation, budget ceiling, fatigue monotonicity), and R-E
shape targets — **no magnitude caps**.

## 9. What this is not
Not a text-generation upgrade — the LLM seam is untouched. Not new data capture — the GameTracker
is frozen. Not a rules engine bolted on — every number above derives from signals the season
already produces. The magic is arithmetic: *what to notice, what to remember, when to speak.*

*— Fable 5, end of watch. The lens is R-E; the currency is attention; the gate is JK's walk.*
