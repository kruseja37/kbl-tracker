# FABLE PLAYER-ARCHETYPE TAXONOMY — design (Move 2, handoff §3 ticket #5)

**Author:** Fable 5 · **Date:** 2026-07-02 · **Charter:** the JK-ratified Move-2 ruling
(SCOUTING_INTELLIGENCE_INTERROGATION_TRANSCRIPT :528-534) + spec V2 §2.2 + the 2026-07-02
whole-profile rider (DECISIONS_LOG). **Status:** DESIGN → build follows (classifier + registry
+ validation sims); cross-model audit after. Feeds C4-B's ROBUST per-position dropdowns, the
Asst-GM board generation (ASST_GM_DESIGN §6 `board`), and farm scout bands (gap #9).

---

## §0. WHAT THIS IS (JK's words, honored)

A **comprehensive strengths-AND-weaknesses map** of player types — "NOT just star types" —
that is simultaneously (a) the scout's vocabulary, (b) the GM's **"choose where to be weak to
save money"** lever ("glove-only SS" cheap → budget freed elsewhere), and (c) the optimizer's
per-position budget-allocation input. Per position, **bench included**, pitchers included.
Co-designed with the locked 24 team archetypes; **alignment with the chosen team archetype is
highlighted** (matching its boosts AND its nerfs) — with the recorded guard that alignment
must never be presented as "maximizes raw value" (kblIV prizes pitching; offense identities
can be raw-value traps — transcript :619).

## §1. GROUNDED STARTING POINT (verified 2026-07-02)

- **The real starter set = `ARCHETYPE_FAMILIES`** in `src/utils/prospectScoutingDraftEngine.ts:435-553` (utils, not engines):
  **17** signed tool-shape templates (10 hitter + Balanced + 6 pitcher), each
  `{family, role, template: signed tool multipliers, positionAffinity, baseWeight}`.
  (The transcript says "18" — the array and its own list have 17; discrepancy noted.)
  Already persisted on farm players (`prospectProfile.archetypeFamily`) and shown on draft
  cards — so the taxonomy MUST stay name-consistent with what GMs already see.
- **Forward-only today:** family→ratings generation exists; **no reverse classifier**
  (ratings→named type), no reuse outside the generator, no position-value awareness.
- The 12-label `PlayerArchetype` in `types/reporter.ts` is DECORATIVE editorial flavor —
  it stays untouched and separate (different concern; renaming it would churn reporter code).
- Reusable primitives: `SimPlayer` vectors, `archetypeFitScorer` (cap-shift fit — the
  single-math team-fit rule), `identityEmbodiment` z-machinery, the C1 identity builder
  (`buildIdentityRoster` + `IDENTITY_SLOT_PLAN`) as the parity-sim vehicle.
- **No preference input shape exists** (`GmDraftPreferences` is spec-only; slot plans are
  position-only). The classifier menu is therefore also the type contract C4-B's dropdowns
  and the preference-aware board need.

## §2. THE MODEL — shape classes × profile tags (the whole-profile rider)

**Inputs (the WHOLE profile, per JK):** primary + secondary position (the combo), bats,
throws, ratings, traits, arsenal, age. **Output:** one SHAPE class + orthogonal TAGS.
Menus stay small and balance-testable; labels compose ("Lefty glove-first SS/2B").

### 2.1 Shape classes (the balance-tested menu)

Normalization first: shape = the player's tool DEVIATION pattern, not his level — computed
against his own centered tool vector, so a B-grade and an S-grade Slugger classify identically
and the "cheap version of this shape" is a real menu concept at every budget. (Deliberate
exception: the depthClass shapes — Bench Bat / Pinch Runner / the Fillers — are LEVEL-
qualified by design; they claim only the depth stratum, where "cheap" IS the identity.)

**EXHAUSTIVE by construction (JK rider 2026-07-02: "GMs must be able to get specific" —
more than the generator's 17).** The menu is not a curated shortlist: it is a **systematic
sweep of the tool-combination lattice** — every single-strong-tool region and every
two-strong-tool region of the hitter (POW/CON/SPD/FLD/ARM) and pitcher (VEL/JNK/ACC) spaces
gets a named class wherever the real pool has presence, plus the special classes. The sims
(§4 S1/S3) then PRUNE per position (a class with no pool presence or an out-of-band parity
result loses its menu slot there) — exhaustive first, evidence-trimmed second.

**Hitter shapes (19 at sweep-open):** the 11 lifted generator families — Slugger · Pure-Power
· Power-Speed · Five-Tool · Speedster · Slap-Hitter · Contact-Glove · Defensive-Wizard ·
Cannon-Corner · Project · Balanced — plus the lattice regions they miss:
- **Professional Hitter** (CON+ only — the pure bat-control corner),
- **Complete Bat** (POW+CON — the middle-of-the-order hitter who is neither slugger-crude nor
  five-tool-priced),
- **Table-Setter** (CON+SPD with the on-base framing — split from Slap-Hitter's weak-power
  connotation),
- **Range Runner** (SPD+FLD — the rangy up-the-middle glove whose arm is ordinary),
- **Power Corner** (POW+ARM — the classic RF cannon-masher),
- **Bench Bat** (POW+ in a low-total package — the deliberate cheap pinch-hit weapon),
- **Pinch Runner** (SPD+ in a low-total package — the bench speed weapon),
- **Roster Filler** (flat-low — the aggressive posture ends drafts with minimum-salary scrubs;
  the menu lets a GM CHOOSE that on purpose).

**Pitcher shapes (12 at sweep-open):** the 6 lifted — Power-Ace · Power-Reliever · Crafty-Ace
· Command-Artist · Pitchability · Pitching-Project — plus:
- **Junkballer** (JNK+ / VEL− — movement-first),
- **Power-Stuff** (VEL+JNK / ACC− — nasty and erratic),
- **Effectively Wild** (VEL+ / ACC− — the classic cheap flamethrower, load-bearing weak class),
- **Strike-Thrower** (ACC+ in a modest package — the cheap innings-eater, distinct from
  Command-Artist's polish),
- **Two-Pitch Reliever** (short-arsenal VEL-or-JNK burst — the bullpen specialist shape),
- **Bullpen Filler** (flat-low).

Lattice regions with no real pool presence (e.g. CON+ARM) are documented as swept-and-empty
rather than silently absent — "exhaustive" is auditable.

Every class carries the historicalArchetypes-style card fields: name, plain
"strength → accepted weakness" identity line, lore-lite blurb — the menus are UX surfaces too.

### 2.2 Profile tags (orthogonal, filterable, non-combinatorial)

From the rest of the profile, extracted alongside the shape: **bats** L/R/**S** (switch is a
first-class tag) · **LHP** (lefty arm) · **UTILITY** (secondary coverage: the position combo,
tiered — e.g. true multi-position vs a paired middle-infield glove) · **TWO-WAY** (the trait)
· **PLATOON** (POW/CON-vs-L/R traits, with side) · **AGE BAND** (the captain-tilt five bands
reused — single-math on age semantics) · **ARSENAL** depth/elite-pitch (pitchers) ·
**PERSONALITY VALENCE** (JK rider 2026-07-02 — see below).
Tags never define the shape; menus and boards FILTER by them ("show me lefty Sluggers",
"utility Contact-Glove for the bench slot").

**Personality groups — DERIVED FROM THE ENGINES, not proposed (JK corrections 2026-07-02
×2: the canonical seven + never-assume).** The canonical personality set is the SEVEN the
generator pool and FA salary table already use: **Competitive, Tough, Relaxed, Egotistical,
Jolly, Timid, Droopy** (`PERSONALITY_POOL` prospectScoutingDraftEngine:298;
`PERSONALITY_MODIFIERS` salaryCalculator:350). The persisted 11-value union is polluted with
4 chemistry words (cleanup ticket below).

The grouping is read off how the four in-season systems ACTUALLY treat each personality
(evidence, all read 2026-07-02: `masterMoraleMatrix.ts:204-254` per-personality morale
multipliers · `fanMoraleDampener.ts:19-27` development dampening (consumed by
ratingsDevelopment — its header forbids double-counting) · `relationshipFormation.ts:310-325`
clash/compatibility/mentorship sets + feud roles · `traitAcquisition.ts:261-300`
IMAGE_DRIVER_SETS trait-image drivers, ≤±20% tilt never a gate):

| Group | Members | The mechanical evidence |
|---|---|---|
| **STEADY** | Tough, Jolly, Relaxed | The code's OWN steady/mentor set (pairwise compatibility 0.75; the ONLY mentorship-eligible three). Tough: best downside protection (negative-morale ×0.8) + drives the Clutch-family positive traits. Jolly: pure favorable asymmetry (×1.1 up / ×0.9 down), zero negative exposure anywhere. Relaxed: most stable (all swings dampened; fan-sensitivity 0.5) — one footnote: co-drives the hustle-lapse negatives (Bad Jumps/Slow Poke/Base Jogger). |
| **FIRED-UP** | Competitive | Upside-tilted amplifier (×1.15 up / ×1.05 down); the biggest POSITIVE trait-image driver (Clutch/RBI Hero/Stealer/Cannon Arm/…); but an antagonist-set member (clash 0.75 with fellow hard-heads). Spiky-positive, not steady. |
| **VOLATILE** | Egotistical | Amplifies BOTH directions (×1.25/×1.15) with an extreme ×1.5 fan-morale coupling; THE clash driver (any pairing = max clash; feud-aggressor bonus); development runs crowd-independent (dampener ×0.5 — ego ignores the mood); drives spotlight traits both ways (Two Way, Big Hack, Whiffer, K Collector). High-variance star profile with clubhouse costs — NOT flatly negative. |
| **FRAGILE** | Timid, Droopy | JK's instinct, mechanically confirmed: unfavorable morale asymmetry (Timid ×0.9/×1.2; Droopy ×0.8/×1.25 — the worst in the table), feud-TARGET bonus (they get picked on), and they drive the entire Composure-negative trait family (Choker/RBI Zero/Butter Fingers/Wild Thrower/Meltdown/…; Droopy also co-drives the lazy family). |

Single-math: group membership is exported from ONE module, and where an engine already
defines the set (steady = the relationshipFormation compatibility/mentor set; fragile = the
Composure-negative image-driver axis) the taxonomy DERIVES membership from those structures
instead of duplicating a hand table. JK ratifies the group SEMANTICS; the values are the
engines' own. Visible primary personality only (ruling-5 boundary). Polluted chemistry-word
personalities classify as group-UNKNOWN → treated as `any` until the cleanup lands.

**Spawned cleanup ticket — PERSONALITY-CANON (Codex):** narrow the `Personality` union to the
canonical 7; normalize polluted records on read (deterministic re-pick from the 7 keyed on
player id — the axis-regen determinism pattern); fix `FRANCHISE_PROFILE_PERSONALITIES` (the
profile editor offers all 11 today); sweep other 11-value lists; check the SML/MLB import
mapping as the likely pollution source. Containment note: the lock-time axis regen (chem
ticket #4) already re-stamps every DRAFT-league player's personality from the canonical 7 —
pollution survives only on non-draft paths and via the editor.

**SHIPPED (2026-07-08, WT-B, merge `a4de48c7`, lane `bcc47014`) — approach note:** the
cleanup landed via a different mechanism than sketched above. Rather than a deterministic
re-pick keyed on player id, `leagueBuilderStorage.normalizeStoredPersonality()` reconciles a
polluted legacy value by REUSING `masterMoraleMatrix`'s existing `LEGACY_PERSONALITY_RECONCILIATION`
table (verified entries incl. Crafty→Tough, Disciplined→Tough, Spirited→Jolly; Scholarly has no
explicit row in that table and falls through to the same engine's RELAXED default, same as any
other unmapped legacy value) — one source of truth instead of a second mapping. `Personality` is
narrowed 11→7; the edit
forms (`LeagueBuilderPlayers`, `franchisePlayerProfileEdit`, `TeamHubContent`) normalize on
load; `Builder.tsx`'s missing "Competitive" was restored; the dark offseason `DraftFlow.tsx`
no longer hardcodes personality/chemistry. The weighted-draw tilt away from Droopy/Timid (JK
ruling, 2026-07-08 morning) rides the same lane. Governing contract:
`spec-docs/contracts/CONTRACT_WTB_PERSONALITY_2026-07-08.md`. Audit: APPROVE-WITH-NOTES.

### 2.2b The per-slot preference input (the C4-B dropdown contract)

What a GM sets per roster slot in ROBUST mode:
`{ shape, tagFilters?, personalityTilt: 'prefer-steady' | 'avoid-fragile' | 'any' |
'embrace-volatility' }` — the options fall directly out of the derived groups above.
"Nobody wants a Droopy or Timid SP1 or starting SS" (JK) = `avoid-fragile`, the key-role
default (SP1, C, SS, CP). `embrace-volatility` is for the GM who wants Egotistical spotlight
upside at a bat-first corner, eyes open. The tilt is a PREFERENCE the board and the builder
weight, never a hard filter (a hard filter could make slots unfillable in thin pools — the
anti-starve lesson from C3 applies); the scout copy names the compromise when it happens
("best glove available — fair warning, he's Timid").

### 2.3 Per-position menus + position-VALUE awareness

The taxonomy data module carries a **(position → shape menu) matrix**: which shapes are
offered at each of the 8 field positions, DH/bench slots, and the 4 pitcher roles — seeded
from the generator's positionAffinity, then corrected by the sims (§4): a shape appears on a
position's menu only where the pool actually produces it AND it's draft-viable there. The
"glove-only SS is real / glove-only 1B is a trap" knowledge lives HERE — per-(position,shape)
annotations computed by the sim and frozen as data (the historicalArchetypes pattern:
sim-calibrated numbers shipped as a reviewed data module): typical price tier, availability,
and a viability flag with a plain-language reason.

### 2.4 Alignment scoring (the KEY FEATURE, with the trap guard)

`shapeAlignment(shape, teamArchetype)` = the shape's signed template priced against
`archetypeCapShift` (the same cap-shift resolver the auction cap math consumes — single-math;
it is the shape-level analogue of the player-level `archetypeFitScorer` rule, not a call to it): strong in
the identity's boosted stats AND weak in its nerfed stats both score as ALIGNED (matching
boosts AND nerfs, per the ruling). Dropdowns highlight the top-aligned shapes per position for
the club's declared identity. **Trap guard:** alignment is surfaced as IDENTITY FIT
("cheap under your cap identity"), never as "best value" — the market brain prices value;
the two annotations render side by side and may disagree on purpose.

## §3. THE REVERSE CLASSIFIER (`playerArchetypeClassifier.ts` — new engine)

Deterministic, pure, materialize-on-read (NO new storage; the persisted
`prospectProfile.archetypeFamily` stays as the generator's declared family, and the classifier
must agree with it — §4 S4):
1. Build the tool vector (hitters: POW/CON/SPD/FLD/ARM; pitchers: VEL/JNK/ACC + bat block if
   Two-Way); center it (level removed).
2. Score against every applicable shape template (role-filtered, position-menu-filtered) by
   weighted signed similarity; flat vectors below a deviation threshold → Balanced;
   low-total-level profiles → Filler classes; low-age/low-now with headroom markers → Project.
3. Extract tags (§2.2) from positions/handedness/traits/arsenal/age.
4. Output `{shape, tags, similarity, runnerUp}` — runner-up kept for scout-copy honesty
   ("a Slugger, arguably a Pure-Power").

Registry consolidation: the 17 family definitions LIFT out of the generator into
`src/data/playerArchetypeTaxonomy.ts` (values byte-identical; the generator imports from the
registry — pure relocation, generation behavior pinned by its existing seeded tests).

## §4. VALIDATION SIMS (the build's discovery core — the team-set precedent one level down)

> **S3 SUPERSEDED (JK re-sync 2026-07-02):** player archetypes do NOT need value parity —
> team archetypes are a closed competing menu (parity mandatory); player archetypes are a
> DESIGN VOCABULARY where weaker-but-cheaper is the point (the GM's lever; the price system
> prices the difference). The parity sim is replaced by the FEASIBILITY-AND-FEEDBACK loop:
> the Asst GM calculates whether the GM's 22-slot design is satisfiable from the actual pool
> within budget while honoring the team archetype; if not, he names the blockers in plain
> language; the GM adjusts and iterates; once feasible he builds the draft board across the
> 22 slots and ranks the whole pool per position against the requested archetypes.

| Sim | Gate |
|---|---|
| **S1 COVERAGE** | 100% of the 440-player DB + generated standard pools classify; no class >25% of a pool (degenerate catch-all); every per-position menu entry has candidates in a standard pool (no empty dropdown promises). |
| **S2 PRICE LADDER** | Per (position, shape): weak shapes are genuinely cheap (median IV below the position's Balanced/Five-Tool alternatives) and each viable shape spans price tiers — the "choose your weakness frees budget" promise, quantified (median savings per swap). |
| **S3 DESIGN FEASIBILITY** (replaces choice parity) | The feasibility evaluator: a full per-slot design → satisfiable/blocked verdict from the real pool + budget + cap identity, with named plain-language blockers per slot and the design board when feasible. Gated by construction tests (blockers fire exactly when true; feasible designs verify against legality + budget) — not by a balance band. |
| **S4 SELF-CONSISTENCY** | Generate prospects per family → classify → recover the declared family at a high rate (extreme-grade taper acknowledged; Balanced absorbs the muted spreads by design). The classifier and the generator must speak one language — GMs already see family names on farm cards. |
| **S5 HONEST HIGHLIGHTS** (rescoped from "alignment sanity") | The alignment highlighting never lies: shapes highlighted as aligned with an identity are verifiably cheaper under that identity's cap shifts (and the highlight is presented as identity-fit, never as raw value — the recorded trap guard). |

## §5. WHAT THIS TICKET SHIPS vs WHAT RIDES LATER

**This ticket (design+sim, mine):** the registry data module + reverse classifier + tag
extractor + alignment scorer + S1/S2/S4 gates + the S3/S5 parity harness and its first full
run (findings drive menu edits exactly like the team-set lock). All engine-layer; no screens.

### §5b. AS-BUILT + FIRST SWEEP FINDINGS (2026-07-02)

SHIPPED: `src/data/playerArchetypeTaxonomy.ts` (the 17 lifted byte-identical — generator now
imports them, its 39 seeded tests green — + 14 extended shapes: 18 hitter-role + 12
pitcher-role + shared Balanced; per-position menus incl. DH; personality groups; age bands;
tuning) · `src/engines/playerArchetypeClassifier.ts` (whole-profile classify + tags +
alignment scorer; restrictable shape set) · unit battery 15/15 ·
`scripts/playerTaxonomySweep.test.ts` (S1/S2/S4, opt-in) — first run 3/3 PASS.

FINDINGS (drive the S3 leg):
- **S1 (real 440 DB):** 100% classifiability; healthy spread, max hitter share ~16%
  (Defensive-Wizard). **Every extended shape earned real presence** (Complete-Bat 37,
  Range-Runner 29, Professional-Hitter 21, Table-Setter 16, Power-Corner 16) — the lattice
  expansion is justified by data. Pitchers: Strike-Thrower is the largest class (~37% —
  under the 40% collapse gate; watch at the 25% design target when tuning).
- **S4 (intent recovery, 643 generated):** top-1 0.353 / top-2 0.596 vs the 0.5 floor —
  passing but instructive: the top misses are Pitching-Project→Power-Ace and
  Five-Tool/Pure-Power→Cannon-Corner families whose templates are geometric near-twins.
  **Design insight: the Project classes' identity is AGE + rawness, not geometry** — the
  §3 age-qualification (Project claims only rookie/rising bands) is spec'd but not yet
  implemented; it is the FIRST item of the next leg and should lift recovery materially.
- **S2:** strata price monotonically (star > regular > depth medians); full per-shape
  ladder logged for the parity leg's calibration.

### §5c. THE NEXT LEG (before menus are declared LOCKED)

1. ~~Age-qualify the Project/Pitching-Project classes~~ **DONE (polish leg, 2026-07-02):**
   Project classes are now marker-qualified — a KNOWN non-young age or a KNOWN flat
   potential-gap disqualifies (the real-DB win: a 34-year-old with raw tools is his tool
   shape, never a "Project"); a strong gap (≥2) boosts the Project score. MEASURED: top-1
   recovery 0.353→0.367, Pitching-Project→Power-Ace misses 23→16; the gap≥1 boost variant
   was tried and REJECTED by measurement (no lift + it stole true Power-Relievers into
   Pitching-Project). Residual top-2 ≈0.59 is characterized as honest generation overlap:
   the taper mutes extreme-grade draws and several generator families are deliberate
   geometric near-twins — the declared family stays on farm cards, and the runner-up
   mechanism keeps boards honest. The 0.5 floor stands with margin.
2. ~~The preference-aware slot boost on `buildIdentityRoster`~~ **DONE (polish leg,
   2026-07-02):** `BuildIdentityOptions.slotPreferenceBonus` — an opt-in per-(player,
   identity-slot) bonus ADDED to the fit objective through the whole identity path (greedy
   start, shortlist fit lens, the constrained climb's assess — which now scores fit over
   PICKS, slot-positionally). The CALLER computes the bonus (adapters classify with the
   full profile; the calibrated module stays classifier-free). Absent → an exact IEEE 0 is
   added → byte-identical builds, PROVEN by the equality test (zero-bonus ≡ no-option) and
   by the full calibrated-consumer battery (historicalArchetypes in-band, draftability,
   poolFeasibility, pool sizing, sufficiency, extractor, the frozen value gate — 48/48,
   the one workbook-baseline timeout being the documented load flake, solo-green).
   Steering pinned: a preferred player wins his asked slot; steering never worsens
   solvency. The frozen value baseline never consults the bonus.
3. S3 choice parity (EV-flatness over sampled per-position preference profiles) + S5
   alignment sanity across the 24 team archetypes → menu viability flags / pruning.
4. S1 catch-all gate: hitter side can tighten 40%→25% (max share ~16%); the pitcher side
   CANNOT yet — Strike-Thrower holds ~37% of real-DB pitchers, a genuine data concentration
   (accuracy-lean arms dominate the 440), not a classifier defect. Documented rather than
   forced; revisit with the S3/S5 harness run.
**C4-B consumes:** the dropdown menus, the alignment highlights, the board filtering
(ASST_GM_DESIGN §6 `board`), farm scout bands derived from shape+grade (gap #9 gets its
basis). **v1.1:** preference-aware LIVE board re-planning depth, flexibility-as-value pricing
of the UTILITY tag (the economy batch), any shape-menu expansion the parity sim justifies.

## §6. POOL-FROM-DEMAND — the two-mode pool system (JK-ruled 2026-07-02)

**The league-level toggle:** how the draft pool and the GMs' designs meet.

### 6.1 Mode A — design-first (POOL-FROM-DEMAND, the flagship)

Flow: every GM locks team archetype + the 22-slot player-archetype design (the §2.2b
contract, set at leisure on the per-league team layer — the "draft is a thin event"
architecture is the prerequisite and this mode is why it was right) → the engine extracts a
right-sized pool from a much larger uploaded universe → the league owner add/subtract edits
→ LOCK → every hub re-runs its own design feasibility (the §4 S3 evaluator, instant per
team) and shows what drifted → GMs adjust designs or the owner adjusts the pool, iterate.

**The extraction math (the new piece — a composition, not an invention):**
1. Classify the universe (the §3 classifier; microseconds per player).
2. Aggregate demand per (position, shape[, load-bearing tags]) cell across all GM designs;
   CPU/shill teams contribute auto-derived designs from their archetypes (the band-priority
   machinery).
3. Provision each cell at demand × CONTEST multiplier (k≈2, §16-tunable): multiple GMs
   asking for the same cell get multiplicity, not exclusivity — completion is guaranteed,
   design satisfaction stays competitive (the whisper panel's CONTESTED signal tells each
   GM how hot his ask is).
4. Union with the C3 completion floors (class feasibility + body floors + shill wins +
   headroom — every team can always FINISH regardless of asks) and a liquidity quota
   (non-asked filler so the auction has real prices and choices matter).
5. Stratified deterministic selection from the classified universe against those targets
   (the C1B extractor pattern: seeded, reason-carrying shortfall reports when the universe
   itself can't meet a cell — "your league wants 6 lefty glove-first shortstops; the
   uploaded universe holds 3").
Privacy: extraction is machine-side; no GM sees another's asks; the pool itself is public.

**AS BUILT (2026-07-02, uncommitted):** `src/engines/poolFromDemand.ts` —
`extractPoolFromDemand(universe, designs, selectedArchetypes, tier, opts)` composing the
audited parts exactly as designed: classifier types the universe · demand cells aggregate
per (position | shape | hard-tags) with slot attribution · reservations = ceil(asks ×
contestMultiplier 2, §16-tunable) selected by PRICE SPREAD (the ask stays affordable at
more than one tier — pinned) · the C1B `extractDraftPool` carries archetype floors +
balance verdicts from the same universe · union (reservations always survive) ·
`evaluateRosterDesign` re-verifies EVERY human design against the final pool (the hub-drift
check) · shortfalls named in the ruled phrasing ("the uploaded universe holds N") ·
deterministic (pinned). v1 choices documented in-module: CPU/shill clubs ride the floors
(no shape cells — they bid by band priorities, not asks); no trim-to-target (oversupply is
owner-editable; trim = v1.1). Battery 4/4 first run. UI (zone 4 Mode A) = C4-B wiring
against the Draft Room design; the toggle placeholder lights up when wired.

### 6.2 Mode B — pool-first (gray-out, rides C4-B)

Flow: lock the pool first (today's shuttle) → the team hubs constrain choices to what the
pool supports: team-archetype picker cards gray via the draftability ranker's verdicts
(GREEN/YELLOW/LOCKED + plain reasons — built, C1B); player-archetype menu entries gray when
the pool holds no player classifying to them at that position (the §4 S1 presence machinery
+ `rankPoolForPreference` counts — built); a design ask that goes infeasible mid-edit
surfaces through the evaluator's blockers immediately.

### 6.3 Shared invariant + sequencing

Both modes enforce ONE relation — pool ⊨ every team's feasibility — solved in opposite
directions (Mode A solves for the pool given designs; Mode B solves for designs given the
pool). One engine stack (classifier + evaluator + extractor + sizing), two UI orders.
The §2.2b manual shuttle is the edit layer in both. SEQUENCING: Mode B wiring rides C4-B;
Mode A = the POOL-FROM-DEMAND build ticket (Fable math; after the §5c polish leg), UI in
the merged Draft Setup with the mode toggle (UX north star R-IA2 gains the toggle).
