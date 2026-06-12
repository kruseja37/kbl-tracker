# FRANCHISE ENGINE VISION — Q&A TRANSCRIPT
**Started:** 2026-06-11 | **Session type:** VISION/INTEGRATION
**Purpose:** Resolve cross-cutting ambiguities before drafting FRANCHISE_ENGINE_MAP.md.
Every JK answer is logged verbatim-or-paraphrased here and becomes a ruling input
to the engine map. Per-engine deep-dive Q&A sessions follow the map draft.

**Context already established this session (pre-Q&A riff):**
- Three-layer frame: Truth engines (GameTracker, Transactions, Schedule) →
  Judgment engines (IV, Effective Ratings, Stats, Salary/TV) → Story engines
  (Narrative, Morale, Relationships, Recognition).
- Stats Engine has two output channels: VALUE (WAR → True Value → designations →
  economy) and MEMORY (WPA → clutch → Fame → narrative).
- WAR drives True Value; WPA drives Fame. WAR-vs-WPA divergence is a deliberate
  narrative surface (metronome vs folk hero archetypes).
- WAR smoke-test explosion attributed (UNVERIFIED) to season-length metadata /
  read-time scaling bug, not the stat design.
- Fan morale fully public (number + state). Player morale: band + trend visible,
  exact number + response curve (personality multipliers, relationship edges)
  hidden; beat reporter = observability instrument; INSIDER = premium reveal.
- Development Engine identified as missing (sole owner of ratings-over-time;
  awards stop touching ratings). Recognition Engine unifies awards/All-Star/
  designations/milestones as two species: derived labels vs bestowed honors.
- Scouting Engine, Almanac/Archive Engine, Offseason Engine (conductor role)
  identified as missing/unnamed.
- Proposed discipline: engines never call each other; communicate through event
  log + persisted snapshots. NOT YET RATIFIED — Q1.

---

## QUESTIONS & RULINGS

### Q1 — Engine communication discipline
How strictly do engines isolate? (a) Strict bus everywhere: every engine reads
events/snapshots only, never another engine's functions. (b) Strict BETWEEN
layers, direct calls allowed WITHIN a layer (e.g., Morale may call Relationships
directly; Story may never call into Judgment except via snapshots). (c) Pragmatic
case-by-case with documented exceptions.
**Claude recommendation:** (b) strict between layers, direct calls OK within a
layer. Riders: (1) within-layer calls = pure functions only, no shared mutable
state; (2) writes one-directional always — only Truth engines write events,
Story never writes back into Judgment (F-087 precedent). Rationale: hard wall
where the testing value is (layer boundaries = typed snapshot contracts for
test harnesses); case-by-case is how the Feb orphan problem happened.
**RULING (Claude, as engineering owner — 2026-06-11):** (b) ADOPTED with both
riders. JK directive: architecture decisions are Claude's to make; JK advises
on design/vision. Escalation valve: genuinely hard architecture calls may be
drafted as a Fable 5 max prompt for a second opinion.

---

### Q2 — Story-layer hierarchy
**RULING (Claude, engineering):** SIBLINGS. Relationships, Morale, Narrative,
Recognition are four engines, each with own state/tests. The perceived nesting
is data flow, not containment: Relationships → Morale → Narrative; Recognition →
Fame → Narrative. JK's instinct preserved as the flow diagram, not the module
structure.

---

## DESIGN QUESTIONS (JK is the authority here)

### DQ1 — Who is the user in the fiction?
The engines need to know who they're talking to. Is the user the GM, the
manager, the owner, a league commissioner running all teams, or deliberately
unnamed? Determines: who the beat reporter addresses, whether mWAR judges
"you," whether fan anger at "management" means the user, who awards ceremonies
honor, and the emotional stance of every Story-layer output.
**JK RULING (2026-06-11):** GM-PROTAGONIST. My team's story; pressure lands on
me. Consequences: reporter addresses/critiques the user's moves; fan anger at
"management" = the user; rival teams are opponents; god powers exist
mechanically (user scores all games) but the emotional camera stays on the
user's team.
**JK AMENDMENT (2026-06-11, same session):** ALL USER-CONTROLLED TEAMS ARE THE
USER — whether one (Solo) or many (Co-Op/Custom, per controlledBy flags). The
protagonist lens applies PER CONTROLLED TEAM: each controlled team has its own
beat reporter addressing the user, its own fanbase whose pressure lands on the
user, full Story-layer treatment. "Wire recap / observed story" treatment
applies to NON-CONTROLLED (AI) teams only. Engine rule: protagonist treatment
keys off controlledBy, never off a single teamId.

### DQ2 — Beat reporter cadence & volume
**JK RULING + Claude recommendation (ADOPTED pending JK veto):**
- Post-game column WITH a player interview for EVERY CONTROLLED TEAM's games
  (JK; per DQ1 amendment — controlled-team games get the full reporter
  treatment, each in that team's reporter's voice).
- NON-CONTROLLED (AI) teams' scored games → neutral wire recaps, FEED tier.
- No wall clock: cadence is EVENT-DRIVEN, pegged to game slots/transactions.
- Three delivery tiers: FEED (silent, accumulates in Tootwhistle Times) /
  ALERT (badge + unread count: designation changes, milestone watch, morale
  crossings, awards-race checkpoints at 25/50/75%, deadline week) /
  INTERRUPT (pop-up, ~2 per session cap outside GameTracker: trades completed,
  milestones achieved, walk-off aftermath, reporter fired). In-game live
  moments belong to the X feed, never pop-ups.
- Existing 50/50 LLM routing maps cleanly: CLOUD_ONLY ≈ INTERRUPT tier.
**JK AMENDMENT (2026-06-11) — COLUMNIST DOCTRINE:** Reporters write only
interesting, emergent content — never summaries of the mundane. The reporter
is a COLUMNIST, not a stenographer; pure information (scores, stat lines)
belongs to the FEED wire tier. Every reporter piece, INCLUDING the standing
post-game column + interview, must carry the reporter's signature and an
ANGLE. Mechanism (Claude, for Narrative Engine spec): each game/event emits
notability candidates (WPA peaks, streaks, milestone proximity, morale/
relationship context, awards-race implications, designation movement); the
reporter selects the strongest angle; personality colors the take; the
interview points at the angle. Truly mundane games: the personality IS the
angle (DRAMATIC inflates, PESSIMIST grumbles) and length/priority scale down.
Generalizes BEAT_REPORTER_VOICE_SPEC's WPA-notability scoring to all output.

### DQ3 — Fame visibility & what tiers DO
Is Fame a number/tier the user sees on the player card, or invisible currency
inferred through coverage size? And what should fame tiers unlock
experientially (card border treatment, coverage priority, crowd reactions,
HOF gravity)?
**JK RULING (2026-06-11):** FULLY VISIBLE — fame tier AND number on the card.
Fame is a proud, legible progression system, not a hidden currency. Tiers get
named levels + card border treatment; number shown. Coverage priority, crowd
energy, HOF gravity all still scale with it.

### DQ4 — Relationships: the soap-opera dial
**JK RULING (2026-06-11):** LEVELS 1+2 COMBINED — wholesome-sitcom warmth
(mentors, friendships, light rivalry) PLUS sports-drama stakes (feuds, trades
that genuinely hurt, romance as morale context — mentioned, never dramatized).
HARD CEILING below telenovela: no breakup plotlines, no betrayal arcs as
authored content. An ex in the opposing dugout can be a hidden morale modifier
and a reporter aside; it cannot become a storyline the app narrates.

### DQ5 — Ratings evolution: how alive should a profile be?
The Development Engine will be the sole owner of ratings-over-time, surfacing
user-gated suggestions. The feel question: across one season, how many times
should a typical player's ratings actually CHANGE? Roughly never (offseason
only, mid-season = rare exception)? A few times for a few players (2-3
suggestions/season league-wide hot/cold)? Or frequently enough that profiles
breathe month to month?
**JK RULING (2026-06-11):** LIVING PROFILES — frequent small moves, ratings
breathe. Engineering implications (Claude, logged for Development Engine spec):
(1) user-is-the-bridge means every change is a manual SMB4 edit → suggestions
must QUEUE and batch-apply at natural breakpoints (series boundaries), not
fire one-at-a-time; (2) moves stay small (±1) so no single suggestion is
momentous; (3) salary/IV recalc must NOT churn per-change — reprice at
scheduled points or the expectations economy thrashes; (4) suggestion accept
rate becomes a tunable "alive-ness" constant, registry-style.

### DQ6 — Fan morale teeth
**JK RULING (2026-06-11):** FULL TEETH — mid-season manager firing returns
(resolves integration-map ruling 4.2: MODE_2 §20 formula canonical, but the
salary spec's firing CONSEQUENCE survives and moves into the Morale Engine),
PLUS attendance/revenue effects PLUS rebuild mandates. Engineering note: this
ruling CREATES new systems — KBL currently has no attendance/revenue economy
(budgets are construction-time only) and no mandate mechanic. New holes for
the engine map: Fan Economy model + Consequence/mandate system. Staging
(v1 vs later) is a separate sequencing decision, not part of this ruling.

### DQ7 — Player morale visibility (revisiting in light of DQ3)
Earlier riff proposed: band + trend visible, exact number + response curve
hidden, reporter = observability instrument. But DQ3 chose FULLY VISIBLE fame.
Same taste here? Fully visible morale numbers (legible dashboard) vs band-only
(curve stays hidden, journalism reveals the why) vs fully hidden (pure
narrative inference)?
**JK RULING (2026-06-11):** BAND + TREND VISIBLE; number + response curve
HIDDEN. Deliberate contrast with DQ3: fame legible (scoreboard), morale
mysterious (clubhouse). Beat reporter + INSIDER reveals = the observability
instruments. Applies to ALL teams' players uniformly.

### DQ8 — All-Star break
**JK RULING (2026-06-11):** FULL EVENT — ballot-watch coverage, snub stories,
and a PLAYABLE All-Star Game that appears on the schedule, played in SMB4,
scored in GameTracker. Engineering flags (Claude): needs exhibition-game mode
(ASG stats EXCLUDED from season totals/WAR; proposal: big WPA moments still
feed Fame — pending JK confirm); roster-construction UX for the user to set
ASG lineups from the voted rosters.

### DQ8b — Who votes
**JK RULING (2026-06-11):** SIMULATED FAN VOTE, fame/morale-weighted — snubs
happen BY DESIGN. The low-fame metronome gets snubbed because of the fame
weighting itself → snub story → morale event → revenge arc, all emergent.
Recognition Engine: vote model = f(stats baseline, fame multiplier, fan morale
of player's team, designation badges).

### DQ9 — The baseball card
Earlier riff proposed: card front = identity (art, designations as badge
foils, fame tier as border treatment); card back = Savant-style percentile
bars (league percentile in POW production, hard-hit%, WPA, clutch); Almanac
stores EACH SEASON'S CARD as a collectible — a career becomes a binder you
flip through. Confirm/amend? And the art question: where do card faces come
from (SMB4 screenshots, generated art, abstract/no-portrait design)?
**JK RULING (2026-06-11):** ORIGINAL CONCEPT CONFIRMED after a rethink round —
card front = identity (abstract no-portrait art: team colors, number,
silhouette; fame-tier border; designation badge foils); card BACK = Savant-style
percentile sliders; Almanac stores each season's card as a collectible binder.
Claude's "Signature Moment" line (player's highest-WPA play of the season,
printed on the back) = candidate element, flag for the card spec session.
Savant percentiles ALSO live in an Advanced panel on player profile — card is
not the only home.

### DQ9b — Card face art
**JK RULING (2026-06-11):** ABSTRACT / NO-PORTRAIT — team colors, number,
silhouette. Fits 1990s SNES aesthetic; no art-pipeline dependency.

### DQ10 — Almanac search
**JK RULING (2026-06-11):** ALL THREE TIERS — curated surfaces (record book,
rivalry ledgers, this-day-in-franchise-history) as the front door → structured
filters underneath (baseball-reference power tools) → natural-language query
as the magic tier (LLM-translated against the event log).

### DQ11 — Chaos dial
**JK RULING (2026-06-11):** LIGHT CHAOS — rare flavor events, NEVER
season-wrecking. Stories are earned (performance + relationships + morale);
uncaused events are seasoning, not plot. Constrains the deferred d20 system:
its event table must be flavor-weighted, no catastrophic outcomes. No
user-tunable dial.

### DQ12 — Stats UI real estate
**JK RULING (2026-06-11):** CONFIRMED three-surface split — Team Hub =
operational (my team, now); Franchise Hub stats tab = league-wide current
season; Almanac = cross-season memory + search. Baseball card = the universal
primitive appearing in all three.

---

## Q&A SESSION CLOSED (14 rulings, 2026-06-11)
Open flags carried to engine map: ASG WPA→Fame confirm; Signature Moment on
card back; Fan Economy + mandate system specs (DQ6); exhibition-game mode
(DQ8); fame tier names; awards-ceremony theatricality (existing
AWARDS_CEREMONY_FIGMA_SPEC.md presumed standing — verify in Recognition
session).
**Next deliverable:** FRANCHISE_ENGINE_MAP.md drafted from these rulings.

---
