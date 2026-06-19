# KBL Tracker - Decisions Log

> **Purpose**: Record of key decisions made during development with context and rationale
> **Format**: Reverse chronological (newest first)

---

## June 2026

### 2026-06-18 (L11–L14 ruling pass): L11 forks RATIFIED + L14↔L11 contract & hot-seat surface RULED (JK attended)

**Context**: JK ran a ruling pass over the consolidated open-questions worksheet
`spec-docs/L11_L14_OPEN_QUESTIONS.md` (built from `L11_SCOPE_MAP.md §7` + workflow `wf_1f3e2c10-e94`, which brought
L12/L13/L14 to the L11 §7 decision-ready standard with an adversarial auditor per ticket). Starting with L11 (the
next ticket). JK confirmed the Captain defaults and ruled the two genuinely-new items.

**RATIFIED** (promoted from "Defaults TAKEN" in the kickoff entry below to JK-ruled):
- **L11-Q7 — manager-personality field** = the canonical **7-personality enum on the IDENTITY `ManagerProfile`**
  (`kbl-manager-identity`), NOT the D9-retired `mwarCalculator` career-stats type.
- **L11-Q8 — successor on firing** = **auto-generate a default identity** (`buildDefaultManagerProfile`, "new voice").
- **L11-Q9 — legacy persistence** = **ride the existing morale/identity stores** (NO new L11 store, NO trackerDb
  bump); `ManagerTeamTenureAggregate` gains hire/fire dates + an end-reason (fired/resigned/relocated).
- **L11-Q10 — L1 sequencing** = **build DARK against the `HiddenModifiers` type now**; L1 persisting
  loyalty/resilience is an ACTIVATION prerequisite (post-D13), not a build blocker.
- *(Confirmed already-ruled in the kickoff entry: clubhouse touch flat −1 [Q5]; ONE fan-write per firing [Q6]; MOY
  OUT of L11 [Q12].)*

**NEW RULINGS:**
- **L11-Q11 / L14-Q8 — the L14↔L11 firing call contract.** L14's rebrand invokes the ONE shared resolver as
  `fireManager({teamId, reason:'rebrand', skipUserConfirm:true, suppressFanReliefBump:true})`: the **per-player
  ripple STILL applies** (players react to the regime change) but the **team-fan RELIEF bump is SUPPRESSED**, because
  the rebrand's ~70 hard-set is the authoritative fan-morale outcome. ⇒ **This also settles the L14 cascade order**
  (L14-Q4): the relief bump is NOT emitted-then-overwritten — it is skipped. Pin this signature in BOTH the L11 and
  L14 contracts so the triangle audit checks both sides.
- **L11-Q13 — GM hot-seat surface in v1 = MINIMAL.** A minimal "Fire Manager" GM action ships in v1 (required by the
  trigger=BOTH ruling anyway); the full hot-seat pressure/mandate framing is DEFERRED past v1. Keeps L11 build-focused.

⇒ **L11 is fully ruled** (kickoff 4 forks + this pass). Remaining L11 work is pure build (L11-1..5, build-DARK,
activate post-D13). The L11–L14 worksheet status column is updated to match.

**— L12 (Race system + All-Star + player Awards) — RULED (JK, same pass):**
- **L12-Q1 — award-category extension = SEASON-RACE SLOTS NOW, DEFER THE 2 ONE-SHOTS** (override of "all 6"). Extend
  the persistable `FranchiseAwardCategory` with `ALL_STAR` / `BENCH_PLAYER` / `BOOGER_GLOVE` / `RELIEVER_OF_YEAR`
  now (All-Star modeled as a **multi-selection roster record**, not a single-winner row); **defer `PLATINUM_GLOVE` +
  `WORLD_SERIES_MVP`** (season-end one-shots; WS MVP depends on playoffs) to a later slot. ⇒ accepts TWO ledger
  bumps (the C4 backup DoD + the `franchiseSeasonLedgerStorage.test.ts` store-list pin must be in-ticket each time).
- **L12-Q2 — race standing = SINGLE WEIGHTED COMPOSITE with PER-RACE-TYPE WEIGHTS** (override of "merit spine + tilt",
  then reconciled). Standing = `w_merit·WAR + w_fame·fame`, bands by score-gap clustering — BUT the weights vary by
  race type: **fame-LED for fan-vote races (All-Star starters); merit-DOMINANT with fame bounded to a small
  close-race nudge for merit awards.** The per-race-type split is what preserves the ratified **RACE-4**
  (fame is a tilt-not-driver on merit awards) inside the weighted-composite form. Weights = §16 SIM-TUNE.
- **L12-Q5 — All-Star roster = BY-POSITION TEMPLATE mirroring the archived screen.** 1 fan-voted starter per position
  + a pitching contingent + a merit-reserve block; performance floor reuses the existing `minPlateAppearances` /
  `minInningsPitched` qualifier. Counts/floor sim-nudgeable.
- **L12-Q7 — TV-family = valueDelta-RANK / INVERTED / SWING.** KK = league-wide `valueDelta` (value-vs-expectation,
  the "league-wide Fan Favorite"); Bust = same metric inverted (bottom-3 inverted race); Comeback =
  `max(currentTV − own running season-low)` over the TV snapshots. Basis stable; only any normalization constant is sim.
- **L12-Q8 — status-fame layer = L6 OWNS THE WHOLE LAYER** (override of "league-leader→L12"). The entire §20.4 status
  layer (draft seed / call-up / send-down / bench 0.5× / league-leader) is **fame-internal, owned by the fame layer
  (an L6 follow-up — L6 is already built dark)**; **L12 only CONSUMES the resulting tier.** Status fame is NOT L12 scope.
- **L12-Q10 — fame double-ladder collapse = SEPARATE PRE-L12 CLEANUP ticket.** A dedicated ticket retires the legacy
  `getFameTier` (forbidden "Fan Favorite"/"Villain" labels). HARD prerequisite: races read the new `resolveFameTier`
  and the forbidden-label ladder is gone **before any race goes live**.
- **L12-Q13 — All-Star lock = at the 60% scheduled-games mark** (override of 50%), configurable; race standings
  recompute per completed game off the existing spine; All-Star roster locks at the 60% checkpoint; award races
  finalize at season end.
- **L12-Q3/Q4/Q6/Q9 — structural FORMS confirmed, magnitudes = §16 placeholders:** Q3 fame tilts only when
  `|margin| < window` AND both players' merit > floor; Q4 GoldGlove = `fWAR + share·defensive-channel-fame` (seed
  **20%**, never total fame); Q6 **MVP + Cy Young + All-Star EMIT** fame/morale, all other races visible-only at
  launch; Q9 honor→Reach-floor map (bigger honor → higher permanent floor, via the built `updateReachFloor`) + the
  snub morale hit personality-scaled through a new L3 race-snub row.
- **L12-Q11 — channel A stays OUT of L12** (confirmed): L12 READS fame for standings only; the §20.5/20.6
  fame→fan-morale plug stays the L6-ruled dark seam.
- **L12-Q12 — NO L12 ruling** (DEFER): Heat `decayPerUpdate` + WAR-floor gravity strength are §16 sim placeholders
  already in `FAME_TUNING`; L12 consumes the live config.

**— L13 (Relationships-lite + reporter accuracy) — RULED (JK, same pass):**
- **L13-Q1 — taxonomy = §24 SIX AFFECT-EDGES canonical** (Rivalry / Feud / Mentorship / Friendship / Romance /
  History). Map the code's 9 literal types into them (Romance←DATING/MARRIED/DIVORCED/CRUSH; Feud←BULLY_VICTIM;
  Rivalry←RIVALS/JEALOUS; Friendship←BEST_FRIENDS; Mentorship←MENTOR_PROTEGE) + add History; retire the surplus. The
  worksheet's 7 ENTITY-edges are a different axis (who-to-whom) → fold into edge endpoints, NOT edge types.
- **L13-Q2 — formation gate = PER-TYPE bar.** Each of the 6 types declares its own input-modifier set (per §24.2
  recipes) AND its own threshold constant. Thresholds = §16 SIM-TUNE (target ~1-3 live edges/team).
- **L13-Q3 — triggers = the EXISTING player `age` field for 'young' + a NEW co-rostered-games counter for 'extended
  time'.** ⚠ FIELD CORRECTION: `age` IS a real persisted player field (`age:number` 18-49, `playerDatabase.ts:47` /
  `unifiedPlayerStorage.ts:41` / `leagueBuilderStorage.ts:229` + the Builder UI) — the workflow's "no age field" gap
  was WRONG (it checked `HiddenModifiers`/`ManagerProfile`). So 'young' reads real age (sim-tuned cutoff); only the
  games-together counter is new. No new age field, no L1 age dependency.
- **L13-Q4 — edges have a STRENGTH that grows + fades** (not on/off). Scalar intensity [0..1] + lapse-decay (mirror
  the L5 flashpoint-decay primitive) + a hysteresis band (anti-flicker). Magnitudes = §16. (Needed for the
  "troublemaker traded → victim recovers" loop to have a quantity to recover.)
- **L13-Q5 — reporter inaccuracy = FLAT ~10%, HEDGE/FLAG only.** Relationship intel is inaccurate at a flat ~10%
  (the §24.5 number); "inaccurate" = mark the take "unconfirmed", NEVER distort the underlying edge; seeded FNV-1a
  off franchise+season+moveId. RECONCILE BY SCOPE: the live per-personality `REPORTER_ACCURACY_RATES` (0.65-0.95)
  stays as in-game-take VOICE flavor; it is NOT the relationship-intel rate. Content-distortion → v1.1.
- **L13-Q6 — charged matchup amplifies MORALE** (REL-6), built fresh, personality-scaled, keyed off the §24 History
  edge + former-team flag. The existing code's LEVERAGE-INDEX revenge/romance multipliers
  (`relationshipIntegration.ts` / `leverageCalculator.ts`) stay as an INDEPENDENT pre-existing in-game feature — do
  NOT delete, do NOT extend; Q1's taxonomy retirement eventually orphans them.
- **L13-Q7 — per-edge morale: KEEP the flat base constants + apply personality scaling via the MATRIX.**
  relationshipEngine's `MORALE_EFFECTS` is retained as the per-edge BASE magnitude (relationship domain data), but
  the morale **WRITE** routes through the L3 master matrix (`composeMoraleConsequence`), which applies the
  personality/modifier cross. ⇒ BOUNDARY (so this is NOT the FINDING-150 scatter): ONE morale-application path (the
  matrix); relationshipEngine no longer writes morale directly — it only supplies the base delta the matrix scales.
- **L13-Q8 — Captain effectiveness = `w1·Charisma + w2·Loyalty + w3·Resilience − w4·Ambition`, normalized [0..1]**;
  suppression = a multiplier on negative-edge deltas, catalysis = a boost to positive-edge formation odds. Weights +
  magnitudes = §16. (Distinct from the Charisma×2 morale-routing — no double-count, per REL-8.)
- **L13-Q9 — romance reads the EXISTING player `gender` field** (`'M'|'F'`, the `Gender` type in
  `playerDatabase`/`unifiedPlayerStorage`/`leagueBuilderStorage` + the League Builder UI). ⚠ FIELD CORRECTION: the
  workflow's "no gender field" gap was WRONG (same cause as Q3). Base-rate structure = friendship-rate ≫ romance-rate
  + a same-gender multiplier keyed on the pair's genders; magnitudes = §16. No new field, no L1 gender dependency.
- **L13-Q10 — relationship→fan-morale: ONLY REPORTED drama nudges fans directly.** The indirect path
  (drama → player morale → performance → fan morale) is always on; a small DIRECT fan-morale nudge fires only for
  edges that clear the SEA-2 emission gate (reporter-amplified = the §24.10 "visible drama"). Coefficient = §16.
- **L13-Q11 — SUPERSEDE the stale cross-ref docs.** §24/REL-1..9 are the sole L13 authority; stamp the two
  `FRANCHISE_MODE2_MORALE_RELATIONSHIP_*` docs (approval-matrix + decision-worksheet) **SUPERSEDED-BY-§24**. Closes
  the exact FINDING-150 mechanism (a builder reading "awaiting approval"/"blocked" and stalling L13).
- **L13-Q12 — storage = REUSE the reserved `rivalryScores` store in the shared `kbl-tracker` DB** IF its schema can
  carry `{player1, player2, type, intensity, formed/dissolved, accuracy}`; if it can't, a new `kbl-tracker` store
  forces the full C4 backup DoD + the `franchiseSeasonLedgerStorage.test.ts` store-list pin in THIS ticket.
  **REJECT** the separate `kbl-relationships` DB (reopens the DSTACK-item-8 backup-parity hole) and **retire that
  DSTACK wording** as superseded by SEA-3. (Decide schema-fit before build so the store-mirror scope is known.)
- **L13-Q13 — build DARK against the `HiddenModifiers` type now; L1 persisting charisma/loyalty/resilience is the
  ACTIVATION prerequisite** (post-D13), not a build blocker. Gender + age already exist (Q3/Q9) → NOT L1 additions;
  L1's only L13 prerequisite is the four hidden modifiers.

**— L14 (Rebrand circuit-breaker) — RULED (JK, same pass):**
- **L14-Q1 — trigger = a NEW dwell counter + GM-GATED.** Build a "consecutive games at rock-bottom fan morale"
  counter (the existing `trendStreak` is "same-direction changes", the WRONG primitive — a real new counter is
  needed). Once it trips, the rebrand is **OFFERED to the GM as an action** (not auto-forced). The morale band +
  window length = §16 SIM-TUNE.
- **L14-Q2 — badge reset = clear the 4 team/fanbase badges + clear the OLD Fan Hopeful, then RE-SEED a NEW Fan
  Hopeful chosen by the new fanbase** (the existing random-top-3-prospects mechanic). **Exempt Captain only** — it
  travels with the player's leadership. Because stats persist, the value-based badges re-assign to the same players
  at the next designation checkpoint, so "clear" = drop the current badge + let the engine re-derive.
- **L14-Q3 — rebrand RESETS the whole roster's fame** (override of "fame persists") **via the EXISTING trade-style
  fame reset applied team-wide** (Heat cools + Reach floor drops toward Unknown). ⇒ **rebrand becomes a SECOND
  fame-reset valve alongside trade — AMEND FAME-7** ("trade is the only reset valve" → "trade OR rebrand"). No new
  fame math; reuse the per-player trade reset across the roster. *(Spec-doc edit required: §14 + §20.3 + FAME-7.)*
- **L14-Q4 — cascade ORDER (deterministic, single fan-morale write):** (1) fire manager + apply the player morale
  ripple [fan-relief bump SUPPRESSED per L11-Q11]; (2) clear all NON-CAPTAIN badges (KEEP Captain) + re-seed the new
  Fan Hopeful; (3) relocate the stadium; (4) reset the roster fame (trade-style, team-wide); (5) wipe dead money
  (stub, Q6); (6) HARD-SET fan morale to `REBRAND_RESET_MORALE` (~70) **LAST** so nothing overwrites it.
- **L14-Q5 — new identity = USER enters the new name/city; persist a relocation history record.** Append
  `{formerTeamName, formerStadiumName, relocatedAtSeason, relocatedAtGame}` to a NEW `teamHistory` array on the
  franchise-team metadata (no such field today) so the Almanac renders "formerly known as X." Wrap the already-ruled
  LSD-5 pool-pick in a user-facing stadium picker (excluding the current park). Colors optional/deferred.
- **L14-Q6 — dead-money wipe = STUB in L14, real wipe in the ECONOMY TRACK.** L14 ships a clearly-labeled
  `clearCarriedDeadMoney(teamId)` hook; the persisted carried-balance ledger + the real wipe are built by the economy
  track (which IS in v1 per LSD-6). Until that lands, the wipe is a documented no-op. (LSD-4 cut next-season budget
  PRESSURE but not the in-season carry ledger — that's economy-track scope.)
- **L14-Q7 — reset value = named constant `REBRAND_RESET_MORALE = 70`** (sim-nudgeable). Structure fixed (a fresh
  fanbase lands upper-CONTENT, ~70); the exact integer is §16-tunable. (70 is inside CONTENT 55-74; EXCITED starts at 75.)
- **L14-Q8 — ALREADY RULED = L11-Q11.** L14 invokes the shared resolver as
  `fireManager({teamId, reason:'rebrand', skipUserConfirm:true, suppressFanReliefBump:true})`; pinned in both contracts.

⇒ **The L11–L14 ruling pass is COMPLETE.** Every SAFE-NOW + MIXED-structural question is ruled; only sim magnitudes
(the §16 placeholders) remain deferred. **Spec-doc reconciliation follow-ups generated by this pass** (doc-hygiene,
to apply before/at each ticket's build): (a) **amend FAME-7** for the rebrand fame-reset valve (L14-Q3); (b) stamp
the two `FRANCHISE_MODE2_MORALE_RELATIONSHIP_*` docs **SUPERSEDED-BY-§24** (L13-Q11); (c) **retire the DSTACK
`kbl-relationships` DB wording** as superseded by SEA-3 (L13-Q12); (d) reconcile the **stale DSTACK** so no builder
rebuilds the now-built fame/awards engines; (e) the **fame double-ladder collapse** as a pre-L12 cleanup ticket
(L12-Q10). The L11–L14 worksheet status is updated to RULED.

### 2026-06-18 (L11 manager-firings kickoff): trigger + ripple + relief rulings (JK attended)

**Context**: L11 (manager firings) grounding recon (workflow `wf_107b9eb5-faf`, 5 readers) → `spec-docs/L11_SCOPE_MAP.md`.
Captain-verified: the `MANAGER_FIRED` morale-matrix row (self −2 / fan bump / clubhouse −1, masterMoraleMatrix.ts:24/148/375)
+ the `ManagerAssignment.fired`/`endDate` fields (managerWpa.ts:86) + the Manager Almanac page ALREADY EXIST — but the row
has ZERO emitters and nothing ever writes `fired:true`. ⇒ **L11 is the missing PRODUCER + the two consequence-writes, not
a new subsystem.** MOY stays OUT (Phase-1 D9 award). Captain surfaced 4 forks; JK ruled (richer/scaled across the board):

**Rulings (JK, 2026-06-18):**
- **Trigger = BOTH + L14.** A firing fires via (a) a manual GM action (the §12 "valve the GM spends"), (b) an AUTO
  backstop roll on sustained low fan morale (revives the orphaned `managerFireProbability` 0.05–0.15-by-payroll,
  salaryCalculator.ts:1278-1294, as the backstop probability), AND (c) the L14 rebrand auto-cascade — all routed through
  ONE shared firing resolver. The "sustained low fan morale" arming threshold/duration is §16 SIM-TUNE (no such
  measurement exists today; conservative placeholder + the payroll-band probs).
- **Personality ripple = BUILD FULL NOW, dark vs the types.** Build the COMPLETE mechanic incl. the personality half
  against the type defs; it stays inert until L1 wires player loyalty/resilience + a new manager-personality field. ⇒ L11
  ADDS a manager-personality field (default home: the IDENTITY `ManagerProfile`, managerWpa.ts:68, `kbl-manager-identity`;
  reuse the canonical 7-personality enum — NOT the career-stats `mwarCalculator` type, which D9 retires). The ripple
  DIRECTIONS come VERBATIM from §12 ("a loyal player takes a morale hit, a resilient one shrugs it off, a producing
  egotist barely notices"); magnitudes are §16 SIM-TUNE.
- **Performance gate = SCALED by how underwater.** A net-positive True-Value player is untouchable (zero ripple); a
  net-negative player's morale hit SCALES with how negative their True Value is (gradient, not a cliff). Source = the LIVE
  season-to-date True Value (`FranchiseTrueValueRow.valueDelta`), NOT the D6 frozen artifact.
- **Fan-relief bump = SCALED by how bad it is.** The relief pop is NOT flat (both +4 and +15 rejected) — it scales with
  team struggle (lower fan morale / worse record → bigger relief). §16 SIM-TUNE scale; emitted ONCE per firing, not
  per-player.

**Defaults TAKEN (Captain, not asked — low-stakes; flagged for any later JK override):** MOY OUT (no manager
fame/award/ceremony — do not touch `mwarCalculator`/`AwardsCeremonyFlow`/`AwardsWatchlist`); ONE fan-write per firing;
successor = auto-generate a default identity (`buildDefaultManagerProfile`, "new voice"); the Almanac tenure aggregate
gains hire/fire dates + an end-reason ("fired"/"resigned"/"relocated"); RIDE the existing morale/identity stores (NO new
L11 overlay store, NO trackerDb bump) — all writes gated by a new default-OFF `isFranchisePhase2L11Enabled` flag
(doubly-dark with the morale flag). Clubhouse touch stays flat −1 in v1. **Build order:** L11-1 pure firing+ripple engine
→ L11-2 manager-personality field + legacy/tenure write → L11-3 flag + the shared resolver/hook (manual + auto-backstop +
L14 entry) → L11-4 Almanac surfacing → L11-5 reporter tap. All build-DARK, activate post-D13.

### 2026-06-18 (R1 proxy derivations): the gap rulings for the R1 build (JK attended)

**Context**: R1 grounding surfaced 6 implementation gaps where §0.6's proxy needed a computation ruling (the
scorer takes ONE signalValue + one peer pool). JK ruled. Full buildable derivations now in
`TRAIT_MEASUREMENT_SPEC.md §0.9`.

- **Documented default:** all R1 rates are **per plate appearance (PA)** (the conventional reading of "rate").
- **Big Hack / Little Hack = OPTION B (percentile-merge):** percentile HR-rate and AVG separately vs peers, then
  **Big Hack = (HR-rate %ile + (1 − AVG %ile)) / 2** (Little Hack = mirror). Both inputs on the 0–1 percentile
  scale → fair blend (no unit mismatch). JK: "yes, gap 1 = option B."
- **Two Way = ONE earn-signal** (elite hitting = pitcher wOBA/PA vs the pitcher pool); C/IF/OF = random fielding
  position assigned AT GRANT, not three candidates. JK: "yep."
- **Base Rounder = advances beyond the forced minimum** (1st→3rd on a single, scoring from 2nd on a single, etc.)
  over advancement opportunities (from `runnerOutcomes`). JK: "yes."
- **Distractor — REFINED by JK:** success = the batter **reaches base (hit OR walk OR HBP)** while the
  Distractor-owner is the runner on 1B/2B; denominator = PAs with the owner on 1B/2B; credited to the runner.
  JK: "i like it but should we also add hits while on first or second? the key here is that the pitcher is failing
  at a higher rate because of the runner on base" → broadened from walks-only to all reach-base.
- **Crossed Up = passed balls per batters-faced; Bunter = successful sacs per bunt attempt** (both opt-in). JK: "yes."
- **Utility** = fielding perf at a non-primary position → thread a `primaryPositionByPlayer` map into the builder
  input (mechanical). JK: "yep."

**Build split:** R1-a (clean, no-gap: strikeout family + Slow Poke/Sprinter/Mind Gamer + Pick Officer/Easy Jumps +
K Neglector acq delta) DISPATCHED; R1-b (the 6 ruled-gap traits above) next, after R1-a commits (same files).

### 2026-06-18 (latest): No personality-only traits + spec-integrity fix (JK attended, R-E kickoff)

**Context**: At the R-E (trait rebuild enabling pieces) kickoff, the Captain re-surfaced
Big/Little Hack + the count-family as "personality-primary (no data proxy)" — reverting to the
SUPERSEDED §C/§D table language and losing JK's ratified §0.2 data proxies (HR-AVG, walks-allowed).
3rd recurrence of the soul-layer inference pattern. Root cause diagnosed: `TRAIT_MEASUREMENT_SPEC.md`
is internally CONTRADICTORY — the ratified §0 decisions sit on top of un-updated §B/§C/§D tables that
still say "personality-primary (no data proxy specified)" (e.g. `:125` BB Prone, `:168` Composed,
`:172` Big Hack, `:175` Little Hack). Every fresh read risks anchoring on the stale half.

**Rulings (JK, 2026-06-18 latest):**
- **NO trait may be earned in v1 from personality ALONE.** Every earnable trait MUST have a documented
  performance/data/ratings proxy; personality is influence (a tilt) on top. A trait with no proxy is
  left dormant/out — never personality-only. Reason: only with a real proxy can a trait's acquisition
  probability P be compared on the same currency as every other performance-based, personality-influenced
  trait. (This REAFFIRMS the §0.2 data-proxy model and SUPERSEDES the "personality-primary" framing of
  Q12/§VI.3:122/§C/§D wherever it implied a proxy-less trait. "Personality-primary" now means personality
  is the DOMINANT influence over a real proxy floor — not the only input.)
- **Stimulated → OUT of v1** (dormant until the mojo auto-derivation engine exists — it has no proxy today).
- **First Pitch Slayer / First Pitch Prayer → IN for v1**, measured by **first-pitch hits/outs** (the
  outcome on logged first-pitch PAs, `pitchesInAtBat==1`). If the user hasn't logged enough first-pitch
  data to clear the min-sample threshold, they DON'T trigger — exactly like every other enrichment-gated
  trait. So they are a data-proxy trait gated on opt-in enrichment, NOT personality-earnable.
- **Player grades recompute on ANY profile change** — ratings, traits, handedness, primary/secondary
  positions — APP-WIDE, not just for the Ace Exterminator trait. This is its own ticket (the displayed
  grade card can currently go stale). The trait engine uses a freshly-recomputed grade so it is never stale.
- **Charisma mirrors Resilience** in the acquisition combiner (E2); K Neglector's driver = **low Charisma
  + Timid/Droopy** (restoring the Timid/Droopy half).
- **Two-layer personality model CONFIRMED:** Layer 1 (universal, EVERY trait) — a positive-image trait gets a
  high-Ambition tilt, a negative-image trait gets a low-Resilience tilt (`§VI.3:114`); Layer 2 (the image axes,
  `§VI.3:116-122`) stacks on top. Personality is ALWAYS a tilt over a real proxy, NEVER an eligibility gate.
- **Two Way:** tilt = **high Ambition + Egotistical** (`§VI.3:118`); ANY personality is eligible — it's earned by
  a pitcher *hitting elite for a pitcher* (performance is the gate, not personality). [CORRECTION after the
  reconciliation: the CODE is already right — "Ambitious" is the Layer-1 Ambition modifier (fires via
  positive-image membership) and `IMAGE_DRIVER_SETS['Two Way (*)']=['EGOTISTICAL']` supplies Layer 2, so the code
  already does ↑Amb + Egotistical. Only my §0.6 draft had dropped the ↑Amb half; no code change needed for Two Way.]
- **Two Way gateway → REMOVED (JK ruling 2026-06-18 latest):** Two Way is **pitcher-only**, and a two-way player
  **can only ever hold pitcher traits — there is NO gateway into the position-player (batting) trait pool.** This
  REVERSES the prior model (`§VI.2:111` / TS-9: "hits elite → everyday player → eligible for batting traits"). The
  on-grant random IF/OF/C fielding-position assignment still applies (defensive roster only). **Proxy RULED (JK):**
  Two Way is earned by **elite HITTING for a pitcher** = high percentile of **wOBA per PA vs the PITCHER peer pool**,
  valve-gated → naturally super-rare. **NOT fielding.** (The "fielding perf at non-primary positions" proxy belongs to
  the distinct **Utility** trait — a position player fielding well at secondary spots.) The (C)/(IF)/(OF) label is just
  the random fielding position assigned on grant, not a separate earning signal.
- **Noodle Arm → CUT from v1 (dormant).** No clean reality signal exists: ARM rating alone is single-rating
  (banned by §0.0); the OF-assist / runner-advance proxies are conflated/suspect (a low rate ≠ weak arm — could
  just mean untested). Re-add only if throw-velocity or reliable per-throw fielder attribution is captured. Cannon
  Arm stays (a HIGH assist rate is a defensible positive signal; only the negative end is ambiguous).
- **Spec-over-code precedence (the recurring-miss fix):** when sources disagree, **§0.2 (latest ruling) > §VI.3 >
  the code's `IMAGE_DRIVER_SETS`.** The code is known to be NARROWER than the spec (omits the Layer-1 universal
  tilt; missing §0.2's added image drivers) and must be FIXED to match the spec — never the reverse. Root cause of
  the two R-E-kickoff misses: the Captain sourced the personality data from the code instead of §VI.3 + decisions.

**Action (spec-integrity, before any R-E build):** rewrite `TRAIT_MEASUREMENT_SPEC.md` so the §0 rulings
are folded INTO each trait's row and the stale "personality-primary / no data proxy" language is DELETED —
ONE consistent source, no contradiction left to misread. Verify every earnable trait names its proxy.

**Process lessons** → written to the SESSION_RULES pending pen (Write-First): (1) when the spec is
internally inconsistent, treat the ratified/latest section as authoritative AND purge the superseded text
in the same pass — never present stale framing as the measurement; (2) when JK ratifies a decision that
supersedes existing spec text, delete/rewrite the superseded text in the same pass.

### 2026-06-18 (later): L9b trait-from-reality MEASUREMENT model — RATIFIED (JK attended)

**Context**: FINDING-150 found the trait detection scope was wrong; JK demanded "100% certain
of how we are measuring these." Captain consolidated a per-trait measurement spec (51 traits,
workflow `wf_368f24d0-78d`); 15 needed rulings. JK ruled them + corrected the model. Full spec:
`TRAIT_MEASUREMENT_SPEC.md §0`.

**Architectural ruling — the acquisition model:**
- **P (acquisition probability) is the single comparison currency** for displacement AND lose-low.
- **Re-evaluate-to-drop:** every HELD trait re-emits a candidate each cycle, recomputing P from its
  best-available signal in priority **data > ratings > personality**. Personality earns when evidence
  is thin; contradicting evidence/ratings can REVOKE → no trait permanently sticky. (Resolves JK's
  concern that personality-driven traits would never drop + the cross-basis comparison question.)
- Personality is a TILT on the data/ratings signal, PRIMARY only where no data/ratings exists.

**Per-trait measurement rulings:**
- Strikeout family (K Collector/Neglector, Whiffer, Tough Out): build now on strikeout-rate-vs-peers.
- Pitcher count-family (BB Prone/Composed/Gets Ahead/Falls Behind): **walks-allowed rate** + personality
  (Composed/Gets Ahead = low-walks inverse → Composed reclassified buildable, no count needed).
- **Big Hack = high HR-rate + low AVG; Little Hack = low HR-rate + high AVG** (JK's performance proxy,
  replaces the static POW/CON ratings ratio — performance-earned + droppable).
- **Slow Poke = GIDP (DP) rate; Sprinter = FC rate** (JK's idea; auto-persisted, no new capture).
  beat_throw is dead because the BT button is hook-state-only (no log row) — fixable later as a
  complementary signal, not needed for v1.
- **Noodle Arm = ARM rating < 11 + Droopy/Timid + low Ambition → probability** (JK; ratings/personality-
  driven, replaces the suspect bWAR proxy).
- **Ace Exterminator = wire the opposing-pitcher-grade join** (by `atBat.pitcherId`) — JK: "we need this
  in v1."
- First Pitch Slayer/Prayer: personality-earned when no pitch-count data, refined by opt-in `pitchesInAtBat`.
- IMAGE_DRIVER: K Neglector → low Charisma + Timid/Droopy (adds a CHARISMA factor — new); Big Hack→
  Egotistical, Little Hack→Tough, First Pitch Slayer→Competitive/Egotistical, First Pitch Prayer→Timid/Droopy.

**Enabling pieces (build first):** E1 thread player ratings/grades into the builder input; E2 charisma
factor in the combiner; E3 the re-evaluate-to-drop model. Then the proxy families (R1 clean outcomes,
R2 data-proxy+personality, R3 ratings-gated). Sequence in `TRAIT_MEASUREMENT_SPEC.md §0.4`.

**Process note (ratified into SESSION_RULES pending pen):** soul-layer measurement comes from spec
verbatim, never inference — origin: the Captain inferred trait proxies twice before going to spec.

### 2026-06-18: L10 §7 + L9/trait open-question rulings (JK attended session, Q1–Q12)

**Context**: After L10 (random events) was built (5/5, build-DARK), the Captain
surfaced all outstanding design forks — the L10 §7 questions (built on AUTH-4
defaults) and the accumulated L9a/L9b trait DEFAULTS-TAKEN. JK ruled in plain
language. Several rulings OVERRIDE what was already built and trigger rework.

**Rulings (JK, 2026-06-18):**
- **Q2 — Random events build-now/activate-later:** AGREED. Compute everything but
  change nothing in the save until a post-D13 "switch on" step. (Confirms the
  build-DARK model for L10-3/4/5.)
- **Q3 — Personality-shift events:** AGREED — excluded from the random roll
  (personality shifts are arc-earned, not dice).
- **Q4 — Trade-demand ownership:** AGREED — L10 only *surfaces/triggers*; the
  propensity math stays in `tradeRequestGeneration.ts`.
- **Q5 — Cadence: OVERRIDE.** Random events do NOT batch at the 20%-of-season
  checkpoint. Traits are ongoing and can fire *any time*; other random events
  should feel similar and fire **randomly/continuously**, so changes don't all
  land at once every 20%. → reshapes the L10 firing model (L10-1 roll cadence +
  L10-3 hook trigger, currently gated on `isCheckpointBoundary`).
- **Q6 — Stadium change on the user's team:** AGREED — your team IS eligible, but
  suppressed when fans are happy.
- **Q7 — Cosmetic changes while dark:** AGREED — write to overlay, never render
  pre-launch.
- **Q8 — Name change: OVERRIDE.** Name-change IS included in v1 (not deferred);
  L10 currently excludes it. (Per Q2 it stays dark until activation; the opt-in
  nature is honored by the confirm step, not by omitting it.)
- **Q9 — `Workhorse` trait:** CONFIRMED pitcher-only.
- **Q10 — `TRAIT_OPPOSITES`:** CONFIRMED — the 14 authored pairs stand (First
  Pitch Slayer↔Prayer, Cannon↔Noodle, Clutch↔Choker, RBI Hero↔Zero, Magic
  Hands↔Butter Fingers, Tough Out↔Whiffer, Big↔Little Hack, Sprinter↔Slow Poke,
  Base Rounder↔Jogger, Stealer↔Bad Jumps, Consistent↔Volatile, Durable↔Injury
  Prone, Gets Ahead↔Falls Behind, K Collector↔Neglector).
- **Q11 — Trait reality signal:** CONFIRMED — outcome-weighted SUCCESS-RATE model
  (not bare predicate fire-count).
- **Q12 — Personality-primary exception: OVERRIDE.** Build it in v1 (was
  deferred). Personality DRIVES the trait when the measured signal is thin
  (Stimulated, Gets Ahead/Falls Behind, Big/Little Hack) — this is the §VI.3:122
  mechanism and the key to the count-family traits.
- **Q1 — The 8 "count" traits:** the per-pitch ball-strike count (L9a-2) is a
  PRECISION input, NOT a hard gate (corrects the superseded §D framing; see
  FINDING-150). First Pitch Slayer/Prayer come free from `pitchesInAtBat==1`;
  the multi-count family is personality-primary + walks/ratings proxies. JK ruling:
  **defer the per-pitch count for v1** (it only sharpens 4 traits). Triggered a
  trait-detection-scope audit (FINDING-150) before any L9b-3a rebuild.

**Consequences (rework queued, build was paused by JK):**
1. **FINDING-150** — L9b-3a built ~16 of ~39+ §VI-buildable traits (inherited the
   stale §D triage). Foundations sound; detection scope incomplete.
2. Q5 → L10 firing cadence redesign (continuous, not 20%-batched).
3. Q8 → add name-change to L10's v1 catalog (dark).
4. Q12 → build the L9b-2 personality-primary exception.
5. Q1 → L9a-2 reframed precision-only; expand L9b-3a buildable set
   (`pitchesInAtBat` first-pitch, L9a-3 handedness platoon splits, outcome
   proxies, personality-primary count-family).

### 2026-06-14: T8 (Mode 1 League Construction Suite) — scope rulings + split (JK)

**Context**: Opening the T8 ticket (IV spec §5/§6/§7 — pool registration, snake
draft, pick chart + trade validator, identity composition UI, scout-obscured farm
pricing, luxuryTax + balanceMode). Captain mapped scope across 6 surfaces
(`T8_SCOPE_MAP.md`) and surfaced 4 genuine decisions; JK ruled.

**Decisions (JK, 2026-06-14):**
1. **Split** — T8 ships as **four engine-first sub-tickets** (mirrors T6→T7):
   **T8a** pure `leagueConstruction.ts` engine + §12 constants → **T8b** tier/luxuryTax/
   balanceMode wiring + RegisteredPool persistence (`kbl-league-builder` v5→v6) + Path A
   IV re-pricing → **T8c** identity-composition UI → **T8d** snake draft (Path B) + pick
   chart + trade validator + solvency signals + potency overlay + farm scout-obscured IV.
2. **Pool scope** — T8 supports the **stock 440-pool only**; in-app custom/non-stock
   tier derivation is **deferred to T12** (Pool Recalibration Tool). T8 consumes the
   precomputed `tierParams.ts` (Juiced/Standard/Nerfed); spec §13 favors this.
3. **Identity composition — decreases are OPTIONAL, maximize customizability.** JK:
   "allow all-increase but also allow decreases … less requirements, better to allow
   the user to customize league texture." So `composeIdentity` does NOT force 2
   decreases (the §6.3 reference impl already defaults decreases to none); the T8c UI
   lets the creator freely edit the increase/decrease stack within the §6.2 envelope
   (≤2 increase + ≤2 decrease). The luxury tax + tier cap remain the balancers.
   Supersedes the open ID-9 design flag in `analyze-pool.py:1185-1188`.
4. **Identity band-priority input** — **point-allocation** (the spec'd input), not
   rank-order.

**Rationale**: Engine-first isolates the highest-correctness-risk surface (a port of
the spec-faithful Python oracle `analyze-pool.py`) for hard audit before any consumer
wires onto it; the data layer (`tierParams.ts`) already exists and is the first
production consumer here. Stock-only keeps T8 bounded and avoids duplicating T12.
Optional decreases makes identity a creative texture tool rather than a forced
trade-off, per JK's product taste.

**Trade-offs**: Optional decreases means a rational creator may take pure-upside
identities; the luxury concentration tax (not the identity stack) is then the sole
balancer of those gains — acceptable and intended. Custom-pool leagues are not
tier-calibrated until T12.

**Routing**: each sub-ticket Codex 5.5 | very high → Opus 4.8 audit (Fable unavailable;
auditor ≠ builder). T8b/T8c/T8d persistence/UI audits non-negotiable per §13.

**T8b rulings + scope refinement (2026-06-14):**
- (a) **Migration is ADDITIVE-ONLY** (JK): the `kbl-league-builder` v5→v6 upgrade adds
  `tier`/`balanceMode` (optional, on `LeagueTemplate`) + a `RegisteredPool` store; existing
  saved leagues are NOT re-priced — re-pricing applies to new construction only. No data rewrite.
- (b) **balanceMode lives in the League Builder only** (JK); the Franchise Setup Wizard
  INHERITS it (no wizard control — honors §7.1 "no wizard changes").
- (c) **SCOPE FINDING (Captain, first-hand verified):** "Path A IV re-pricing" is LARGELY
  ALREADY DONE. T5/D15 rebuilt `calculateSalary` on `computeIV().kblIV`
  (`salaryCalculator.ts:739-776`; `leagueBuilderStorage.computeInitialSalary → calculateSalary`
  at `:1653-1680`). Pool salaries are already IV-based AND tier-invariant (a player's IV never
  changes with tier; tier only shifts caps + the generated-player nerf). So T8b shrinks to:
  `registerPool` assembly (IV + tierCap + luxuryCaps + pickValueChart + balanceMode) + additive
  v5→v6 persistence + tier/balanceMode League-Builder UI — NOT a salary rewrite. The mapping
  agent's "pool priced by the OLD salaryCalculator" was imprecise; corrected here.

---

### 2026-06-14: AI-team setup reconciliation (Captain pass over Codex's setup)

**Context**: Codex built the shared operating setup (entry below). A Captain
review against existing canon (SESSION_RULES + AUDIT_PLAN + the prompt-contract
pipeline) found it ~85% aligned, with one conflict, stale facts, and three new
policies needing a JK ruling. Reconciled in one session; committed with the
setup.

**Decisions (JK-ruled 2026-06-14)**:
1. **One session-start ritual.** CLAUDE.md's startup block was reading 3 files
   (CURRENT_STATE/SESSION_LOG/DECISIONS); corrected to the canonical 5
   (SESSION_RULES → AUDIT_LOG → AUDIT_PLAN → SESSION_LOG → CURRENT_STATE) so
   every runtime boots identically. AI_TEAM_OPERATING_MODEL's build-loop opener
   aligned to the same list.
2. **Stale facts purged from CLAUDE.md.** useGameState.ts corrected to ~12,585
   lines (both prior figures — 4,647 and 2,344 — were wrong); test count no
   longer hardcoded (pointed at CURRENT_STATE live baseline, currently
   7,140/383); skill counts de-hardcoded (dirs are source of truth).
3. **Browser-verification gate.** Codex pre-checks via Playwright and reports,
   but JK's manual sign-off on real data is the SOLE closing gate. A browser
   pre-check never closes a ticket on its own.
4. **Self-Improvement Loop uses a pending-ratification pen.** Agents WRITE the
   proposed rule immediately into a `Lessons Learned (pending JK ratification)`
   section of SESSION_RULES (Write-First), but it is a PROPOSAL until JK says
   "ratify." No agent promotes its own rule or edits ratified rules without JK.
   (Chosen over fully-automatic to prevent unsupervised edits to the governing
   rulebook — the canon-drift failure mode.)
5. **Subagent strategy kept as-is** (low-risk, no conflict).
6. **CURRENT_STATE split.** The 693-line file became a ~40-line live header +
   CURRENT_STATE_HISTORY.md (full arc trail, verified byte-identical on split).
   Session-end protocol updated to match (append outgoing snapshot to history,
   rewrite live header in place).

**Rationale**: The existing system is mature; the goal was to close drift, not
add a framework. The conflict (#1) was the only true partnership-breaker — a
fresh runtime would otherwise skip its own rules file. The footgun blocks
(NODE_ENV= prefix + characterized baseline; builder-reporting completeness)
were folded into SESSION_RULES because they had been living only in scattered
CURRENT_STATE notes.

**Implications**:
- Three docs now agree on the session-start ritual; no second source of truth.
- Roles/routing/loops live in AI_TEAM_OPERATING_MODEL.md (resolves the stale
  3-role table in SESSION_RULES' Accountability section by reference).
- The current Codex session that authored the setup is now stale (files changed
  underneath it); T6 should start in a FRESH Codex session reading committed
  canon — this is a sanctioned exception to "continue long sessions" (arc
  boundary).

---

### 2026-06-14: Shared Codex / Claude Opus 4.8 Operating Model (initial setup)

**Context**: JK wants Codex, Claude Opus 4.8, and himself working as a tighter build/audit team on KBL Tracker, with less setup drift and stronger handoffs.

**Decision**: Keep `CLAUDE.md` as the canonical repo instruction file. Add `AGENTS.md` as a short Codex bridge, add `spec-docs/AI_TEAM_OPERATING_MODEL.md` as the shared team protocol, mirror selected Claude/project skills into `.agents/skills/` by symlink for Codex discovery, and mirror Playwright MCP into `.codex/config.toml`.

**Rationale**: One canonical instruction source prevents Claude/Codex drift. Symlinked skills let both runtimes share workflow definitions without copying. Separate MCP configs let both runtimes use browser tooling. The builder/auditor triangle keeps speed from eroding verification quality.

**Implications**:
- Future Codex sessions should read `AGENTS.md`, then `CLAUDE.md`, then the team operating model for multi-agent work.
- Future Claude sessions should treat Codex as the default builder/local verifier unless JK routes otherwise.
- Claude Opus 4.8 can audit Codex work when Fable is unavailable, but no agent audits its own diff.
- New shared skills should be added to the source skill folder and mirrored into `.agents/skills/` when Codex should discover them.

---

## Deferred Technical Debt Register
> Items explicitly deferred during Phase 1/2 audit (2026-02-18). Each has a trigger condition — the event that makes it worth picking up.

| ID | Finding | Item | Trigger to Re-open |
|----|---------|------|--------------------|
| DEFER-001 | F-107 | **franchiseId scoping** — seasonStorage, gameStorage, offseasonStorage have no franchiseId scope. Stats are seasonId-scoped only. Single-franchise constraint masks the gap today. | **Multi-franchise support.** When a second franchise is added, stats will bleed across franchises without this fix. Must be resolved before multi-franchise ships. |
| DEFER-002 | F-109 | **Career stats idempotency** — incremental write pattern (accepted over derive-on-read). Risk: mid-pipeline failure causes career ↔ season drift. | Any reported career stat discrepancy, OR when a write-failure bug is found in the aggregation pipeline. Add transaction-level guard at that point. |
| DEFER-003 | F-115 | **Salary service time** — age-based salary calc accepted as KBL design. No service time, no contract eligibility tiers. | If KBL adds free agency, arbitration, or contract negotiation features that require eligibility gating. |
| DEFER-004 | F-121 | **Player Dev Engine** — no 10-factor growth model exists. Design deferred. | Phase 2 design session with JK. Implement season-close development pass once model is defined. |
| DEFER-005 | F-101C | **Fan morale localStorage → IndexedDB** — will be fixed in same pass as Bug A/B per Phase 2 plan. Listed here for completeness. | Included in Phase 2 FIX-CODE execution. Not a future defer. |

> **DEFER-001 is the most important.** Multi-franchise is a planned feature. When it's on the roadmap, pull F-107 immediately — it requires touching storage, hooks, and every stats display that reads season data.

---

## February 2026

### 2026-02-18: Phase 2 Fix Queue Decisions (11 FIX-DECISION items resolved)

**Context**: Phase 1 audit complete. 11 FIX-DECISION items required JK calls before Phase 2 fix execution could begin.

**Decisions Made**:
| # | Finding | Decision |
|---|---------|----------|
| 1 | F-101C | Fan morale localStorage → IndexedDB: **same pass** as Bug A/B fix |
| 2 | F-107 | franchiseId scoping: **DEFER** — see DEFER-001 above |
| 3 | F-109 | Career stats model: **accept incremental write** + add idempotency guard |
| 4 | F-113 | Playoff stats write path: **wire it** — GameTracker → PLAYOFF_STATS during playoff games |
| 5 | F-114 | Mojo auto-update: **stay manual**. Persistence between games: **YES** (IndexedDB) |
| 6 | F-115 | Salary service time: **accept age-based** as KBL design — see DEFER-003 |
| 7 | F-119 | Relationships system: **re-enable** (add persistence + wire to LI + dev rate) |
| 8 | F-120A | Narrative persistence: **persist recaps to IndexedDB** |
| 9 | F-120B | Headline engine: **wire it** into the pipeline |
| 10 | F-121 | Player Dev Engine: **defer design** — JK has idea, define in Phase 2 before implement |
| 11 | F-122 | Record Book: **wire oddityRecordTracker AND build standard record book** |



### 2026-02-05: D3K (Dropped Third Strike) Confirmed in SMB4

**Context**: Spec documents (`RUNNER_ADVANCEMENT_RULES.md` line 23, `archive/SMB4_GAME_MECHANICS.md` line 16) incorrectly stated "Dropped 3rd Strike: ❌ NO". However, `RUNNER_ADVANCEMENT_RULES.md` line 253 correctly described D3K rules, creating an internal contradiction. The `recordD3K()` function was already fully implemented in `useGameState.ts` and fires via specific 2-3 fielding sequence detection.

**Decision**: D3K **exists** in SMB4. Updated all spec docs to reflect ✅ YES. Code implementation (`recordD3K`) is correct and requires no changes.

**Rationale**: User confirmed from direct gameplay experience that D3K is a real mechanic in Super Mega Baseball 4. The original spec entries were wrong.

**Files Changed**:
- `spec-docs/RUNNER_ADVANCEMENT_RULES.md` — Line 23: ❌ NO → ✅ YES
- `spec-docs/archive/SMB4_GAME_MECHANICS.md` — Line 16: ❌ NO → ✅ YES

**Implications**: The existing `recordD3K()` code in `useGameState.ts` is correct as-is. D3K detection via 2-3 fielding sequence can remain active.

---

### 2026-02-03: Testing Plan Expanded to Cover Complete Figma UI

**Context**: Testing Implementation Plan originally focused heavily on GameTracker and calculation engines. User requested comprehensive coverage of ALL Figma UI components.

**Decision**: Expand testing plan from 6 phases to 11 phases, covering every page and component in the Figma codebase.

**Rationale**:
- Original plan would leave 60+ UI components untested
- League Builder, Franchise Mode, Exhibition, and Playoffs all have significant business logic
- Offseason flows (Trade, Draft, Free Agency, etc.) have complex state management
- Complete coverage ensures no orphaned or broken UI code

**Phases Added**:
| Phase | Coverage | Tests |
|-------|----------|-------|
| Phase 6 (Expanded) | GameTracker UI Components | 50+ |
| Phase 7 | League Builder (7 pages) | 40+ |
| Phase 8 | Franchise Mode (15 components, 6 hooks) | 80+ |
| Phase 9 | Exhibition Mode | 15+ |
| Phase 10 | Playoff/World Series | 25+ |
| Phase 11 | Navigation | 10+ |

**Sprint Plan Extended**:
- 5 sprints → 8 sprints
- Sprint 5-8 cover Phases 6-11

**Target Changes**:
- Test files: 55+ → 120+
- Passing tests: 1800+ → 3000+

**Intentionally Skipped**:
- 45 shadcn/ui primitive components (library code, not business logic)
- DragDropFieldDemo.tsx (demo component)
- SubstitutionModalBase.tsx (tested via derived modals)

**Document Updated**: `spec-docs/TESTING_IMPLEMENTATION_PLAN.md`

---

### 2026-02-03: Legacy↔Figma Codebase Reconciliation Complete

**Context**: Build was failing with 42 TypeScript errors after Phase 1 & 2 Figma buildout.

**Decision**: Fix API mismatches in integration wrappers rather than rewriting integrations.

**Rationale**:
- Root cause was AI-generated integration files that hallucinated API signatures
- Integration wrappers assumed different function signatures than actual legacy engines
- Fixing to match actual APIs is faster and preserves existing architecture

**Root Cause Pattern Identified**:
```
Integration file assumed: processEndOfSeasonAging(age, rating)
Actual legacy API:       processEndOfSeasonAging(age, {overall: rating}, fame, modifier)
```

**Files Fixed**: 7 integration/hook files
**Files Created**: 2 stub files for missing franchiseStorage

**Special Case**: `useFanMorale.ts` was stubbed out (not imported anywhere, 21 errors)

---

## January 2026

### 2026-01-25: SMB4 UI Cleanup - Removed Balk Button

**Context**: User manual testing revealed Balk button was still present in GameTracker despite balks not being possible in SMB4.

**Decision**: Remove BALK from event buttons entirely.

**Rationale**:
- SMB4 does not have balks as a game mechanic
- "Too many throws over" IS possible but is not a balk
- The button was creating confusion and wasting UI space
- Per SMB4_GAME_MECHANICS.md - only real baseball rules that SMB4 implements should have buttons

**Files Changed**:
- `src/components/GameTracker/AtBatButtons.tsx` - Removed 'BALK' from eventButtons array

---

### 2026-01-25: Added Position Switch Feature

**Context**: User feedback that there was no way to change a defensive player's position without first removing them from the game (Def Sub → new player at new position).

**Decision**: Add POS_SWITCH event type allowing position swaps between players on field.

**Rationale**:
- In baseball, managers can move players to different positions without substitution
- Example: Move SS to 2B and 2B to SS (defensive realignment)
- This is common for defensive positioning based on batter handedness or late-game situations

**Files Created/Changed**:
- `src/types/game.ts` - Added 'POS_SWITCH' to GameEvent, PositionSwitchEvent interface
- `src/components/GameTracker/PositionSwitchModal.tsx` - New modal component
- `src/components/GameTracker/AtBatButtons.tsx` - Added "Pos Switch" button
- `src/components/GameTracker/index.tsx` - Wired up modal

---

### 2026-01-25: Day 3 Spec Contradiction Resolution

**Context**: NFL audit identified 5 spec contradictions that appeared to conflict but actually represented intentional dual-purpose systems.

**Decisions** (per user):

1. **Mojo Jacked (WAR 0.90x vs Stat 1.18x)**: **Keep both** - These serve different purposes. The 0.90x WAR credit is for attribution (luck factor), while 1.18x stat boost is for simulated performance.

2. **Juiced Fitness (Fame 0.5x vs Stat 1.20x)**: **Keep both** - Fame credit (0.5x) applies to all games as PED stigma, stat boost (1.20x) primarily for simulated games. Clarifying note added to spec.

3. **Strained Fitness (WAR 1.10x vs Fame 1.15x)**: **Use both values** - Different contexts. WAR credit 1.10x for stat attribution, Fame credit 1.15x for achievement recognition ("playing through pain").

4. **Rattled Mojo (Clutch 1.30x vs WAR 1.15x)**: **Use both values** - Clutch 1.30x applies to leverage-weighted situations, WAR 1.15x for general attribution. Both reward overcoming adversity.

5. **FIP Constant (3.10 vs 3.15)**: **Use 3.15 for spec examples** - Updated PWAR_CALCULATION_SPEC.md. Actual SMB4 implementation uses 3.28 (calibrated from league data per ADAPTIVE_STANDARDS_ENGINE_SPEC.md).

**Rationale**: The apparent contradictions are intentional design - a nuanced system where stat performance, WAR attribution, Fame recognition, and clutch evaluation each have their own appropriate modifiers.

**Implications**:
- Clarifying notes added to MOJO_FITNESS_SYSTEM_SPEC.md
- FIP constant guidance updated in PWAR_CALCULATION_SPEC.md
- MASTER_SPEC_ERRATA.md should be updated to mark these as resolved

---

## January 2025

### 2025-01-21: Adaptive Learning Architecture

**Context**: Building fielding inference system - need probability matrices for which fielder handles balls by direction/type. No perfect MLB data source exists for exact percentages.

**Decision**: Implement "reasonable defaults + learn over time" architecture across ALL statistical systems, not just fielding.

**Design**:
1. Start with sensible defaults based on MLB research/first principles
2. Track expected vs. actual outcomes for every inference
3. Store historical data to refine probabilities over time
4. Apply learning to: fielding assignments, park factors (HR distance), batted ball outcomes, etc.

**Rationale**:
- Avoids over-engineering upfront with fake precision
- Real usage data from YOUR games is more relevant than MLB averages
- Creates a system that gets smarter the more you use it
- Allows for player-specific tendencies (e.g., "this CF has exceptional range to left-center")

**Implications**:
- Data persistence becomes even more critical (must store historical data)
- Need schema design that supports expected/actual tracking
- Future features: "confidence intervals" on inferences, anomaly detection

---

### 2025-01-21: UI/UX Deferred Until Feature Complete

**Context**: Current UI is functional but rough. Question arose: design now or later?

**Decision**: Complete all backend logic/features first, then do comprehensive UI/UX pass.

**Rationale**:
- Designing before features are complete risks rework
- One coherent design pass is better than incremental patches
- Well-documented specs make future design a "translation" exercise
- Risk of designing wrong thing > cost of designing later

**Implications**: Current UI will remain rough during development phase.

---

### 2025-01-21: UI Testing Protocol Established

**Context**: Needed to verify that code logic worked correctly through the actual UI, not just unit tests.

**Decision**: Established comprehensive UI testing protocol using browser automation to click through all scenarios.

**Rationale**: Unit tests verify logic in isolation, but UI tests catch:
- Modal interaction bugs
- State not updating correctly
- Button enable/disable issues
- Visual feedback problems

**Outcome**: 17 UI test scenarios documented in WORST_CASE_SCENARIOS.md

---

### 2025-01-21: Video Game Tracker Clarification

**Context**: Initial edge case list included real-baseball scenarios like catcher interference, kids league rules.

**Decision**: Removed inapplicable scenarios. This is a VIDEO GAME tracker (MLB The Show style), not real baseball.

**Implications**:
- No umpire judgment calls needed
- No catcher interference, balk detection by system
- User manually inputs all outcomes (game tells them what happened)
- DH rules still apply (can be removed mid-game)
- Substitution rules still apply

**Rationale**: User clarified the use case. Real baseball has scenarios that don't occur or matter in video games.

---

### 2025-01-21: DP Out Counting Fix

**Context**: DP was adding 3 outs instead of 2 (DP result + runner marked as out).

**Decision**: DP result adds exactly 2 outs. Runner outcomes during DP that show "Out" are part of the DP, not additional outs.

**Code Change**: Modified `handleAtBatFlowComplete` to not double-count runner outs on DP.

**Test**: Verified with bases loaded, 1 out. DP should result in exactly 3 outs (1+2), not 4.

---

### 2025-01-21: Base Clearing Bug Fix

**Context**: When R2 scored, wrong base was being cleared (third instead of second).

**Decision**: Fixed line 183 in index.tsx to clear `second` base, not `third`.

**Root Cause**: Copy-paste error during initial implementation.

---

### 2025-01-21: Extra Events Processing Fix

**Context**: Extra events (SB, WP, PB, Balk) recorded during at-bat weren't being processed when at-bat completed.

**Decision**: Added `extraEvents` processing in `handleAtBatFlowComplete`.

**Rationale**: Events during an at-bat need to be applied to game state before moving to next batter.

---

### 2025-01-XX: RBI Exclusion Rules

**Context**: Needed to define when RBIs should NOT be credited.

**Decision**: No RBI credited for:
- Runs scored on errors (E)
- Runs scored on double plays (DP)
- Runs scored on wild pitches (WP)
- Runs scored on passed balls (PB)
- Runs scored on balks

**Rationale**: Follows MLB Official Scoring Rules. These are not "driven in" by the batter.

---

### 2025-01-XX: Force Play Logic

**Context**: Needed to determine when runners are forced to advance.

**Decision**: Implemented `getMinimumBase()` function with rules:
- Walk/HBP: Only force if all bases behind are occupied
- Single: R1 forced to 2B minimum
- Double: R1/R2 forced to 3B minimum
- Triple/HR: All runners must score

**Rationale**: Follows baseball rules - a runner is forced when the batter (or another forced runner) takes their base.

---

### 2025-01-XX: 3rd Out on Force Play Rule

**Context**: If 3rd out is a force play, runs that crossed plate before the out do NOT count.

**Decision**: Implemented check in scoring logic - if 3rd out is force, nullify any runs scored on that play.

**Rationale**: MLB Rule 5.08 - run cannot score if third out is force out at any base.

---

## Template for New Entries

```markdown
### YYYY-MM-DD: [Brief Title]

**Context**: [What situation led to this decision?]

**Decision**: [What was decided?]

**Alternatives Considered**: [Optional - what else was considered?]

**Rationale**: [Why this choice?]

**Implications**: [What does this affect going forward?]

**Outcome**: [Optional - what happened as a result?]
```

---

*Add new decisions at the top of this document.*
## Feb 15, 2026 — Park Dimensions as Canonical Data

**Decision:** Use Billy Yank's Guide to Super Mega Baseball (3rd Edition) as the canonical source for all SMB4 park dimensions (fence distances and wall heights).

**Context:** The app needs real park dimensions for two features: (1) HR distance validation during at-bat recording, and (2) park factor derivation for WAR calculations. The existing ParkFactors interface in src/types/war.ts had abstract multipliers but no connection to actual stadium geometry.

**Rationale:** Billy Yank's Guide is the most comprehensive community resource for SMB4 data. The fence distances were manually compiled from in-game measurements across all 23 stadiums. Wall heights are categorized as low/medium/high.

**Implementation:** src/data/smb4-parks.json + src/data/parkLookup.ts. Consumed by upcoming R2 (park factor derivation) and B3 (stadium association + HR validation).

**Trade-offs:** The dimensions are representative, not pixel-perfect. Parks have variable geometry that a simple LF/CF/RF + wall height model doesn't fully capture (e.g., Lafayette Corner's frequent wall height variations, Stade Royale's unusual outfield shape). This is acceptable for v1; refinement is deferred.

---

## Feb 15, 2026 — Shim Modules for src_figma Imports

**Decision:** Create re-export shim modules in src/src_figma/utils/ rather than mass-renaming import paths.

**Context:** The src_figma directory tree had stale imports pointing to ../../utils/gameStorage etc. that broke when the root utils modules were restructured. The options were: (a) fix every import path in src_figma, or (b) create thin shim modules that re-export from the correct locations.

**Rationale:** Shims minimize churn and risk. Changing dozens of import paths across components and tests is high-risk for a non-functional change. Shims achieve the same result with 4 small files.

**Trade-offs:** Adds a layer of indirection. If src_figma is ever consolidated into the main source tree, the shims should be removed and imports updated directly.

---

## Feb 15, 2026 — Archived Code Excluded from Build

**Decision:** Exclude src/archived-pages/ and src/archived-tests/ from TypeScript compilation via tsconfig.app.json rather than deleting them.

**Context:** 16 of 26 pre-existing build errors came from archived files referencing modules that no longer exist. These files are not used by the running application.

**Rationale:** Excluding preserves git history and allows future reference. Deleting would be cleaner but irreversible without git archaeology.

**Trade-offs:** The files still exist on disk and could confuse future contributors. A comment in tsconfig.app.json explains why they're excluded.

---

## Jun 14, 2026 — Recommendation surfaces may never consume hidden information (no-oracle-leak principle)

**Decision:** Any KBL recommendation surface (Mode 2 call-up/send-down recs = T7b; in-game sub recs = T9; any future advisory surface) may consume ONLY scout-visible / user-visible information when valuing a player whose true ratings are hidden. Farm prospects are valued from `scoutedGrade` + `scoutConfidence` (the scouted view), NEVER from true ratings / true IV. MLB players (known commodities) use the true TV2 value.

**Context:** Drafting T7b (§8.3 call-up/send-down recs), the proposed v1 valued farm prospects on their internal trueIV. JK caught that this leaks: a rec built on true value is an oracle — an astute user back-calculates relative value, and thereby the hidden ratings, regardless of scouting accuracy.

**Rationale:** (1) Preserves §7.4 (scout-obscured farm IV) — the rec adds no information the user doesn't already have. (2) Preserves the risk/reward asymmetry: MLB players are KNOWN (true value); farm prospects are UNCERTAIN (scouted estimate carries noise w = scoutNoiseBase × (1 − scoutAccuracy)) — so calling up a prospect is a genuine gamble and sending down a known commodity is the certain side. (3) Preserves call-up excitement: true ratings reveal ONLY at call-up; the rec never knew them.

**Trade-offs:** The rec is only as good as the scouting (it can be wrong) — which is the intended design, not a defect. A richer scouted-distribution / expected-value model (vs the v1 scouted point-estimate + confidence label) is a flagged follow-up. Governs T7b; cite in T9.

---

## Jun 14, 2026 — T8d scope rulings (snake-draft suite)

**Decision (4 rulings, JK via AskUserQuestion):** For T8d (the §7.3 snake-draft surface):
1. **Solvency budget source = tierCap for every team.** No new per-team budget field is added in v1.
   `budget` in the §7.3:491 solvency inequality = `TIER_CAPS[tier].tierCap`. Per-team divergence in the
   GREEN/YELLOW/RED/BLOCKED signals comes ONLY from identity-shifted luxury caps + each team's drafted
   roster, not from per-team budgets. (§5.2's "budgets may be set below tier cap" is NOT implemented in v1.)
2. **`cheapestFillCost` = position-agnostic for v1.** The reserve term is `slotsRemaining × (cheapest
   available salary in the live remaining pool)`, ignoring the 22-man positional skeleton (which the spec
   never enumerates). Luxury tax + tier cap remain the real balancers.
3. **Potency overlay (R12) DEFERRED to a fast-follow.** The chemistry count→tier (L1/L2/L3) numeric
   mapping is undefined anywhere (not §12, not constants, not any SMB4 reference doc). Building it now would
   mean inventing thresholds (a spec-discipline violation). T8d ships without the potency overlay; R12
   returns once the SMB4 in-game thresholds are known. Note: the prior `T8_SCOPE_MAP.md` claim that an
   `effectiveRatings.potencyTier` function exists is FALSE — `potencyTier` is a TYPE only
   (`rosterEngineConstants.ts:11`); the resolver function must be built when R12 is undeferred.
4. **Farm scope = MLB board only; §7.4 scout-obscured farm IV (R9) DEFERRED to a fast-follow.** T8d builds
   ONLY the 22-man MLB snake board. The existing farm/prospect draft (`LeagueBuilderDraft.tsx`, scoutedGrade
   model) stays exactly as-is, protecting the working farm-scouting handoff. The §7.4 trueIV-range display
   becomes a clean follow-on (which will then resolve the scoutedGrade-vs-trueIV-range model collision).

**Context:** Captain mapped T8d via a 7-agent decorrelated fan-out (`T8d_SCOPE_MAP.md`). Four design forks
genuinely gated the build (no defensible default existed). JK ruled all four to the recommended (leanest)
option.

**Implications:** T8d collapses from 4 sub-tickets to **3**: T8d-1 (snake + solvency engine, pure),
T8d-2 (draft-session persistence v6→v7 + snake-board shell + dual-write + handoff verify), T8d-3 (board
overlays: pick chart + trade validator + per-team signals). R9 + R12 are tracked fast-follows. Two
constants enter the registry now (`solvencyRedMargin` 0.10; `solvencySevereTaxFrac` ≈ 0.20 Captain default
for the RED "severe tax" band, proceed-unless-vetoed); `scoutNoiseBase` defers with R9.

**Trade-offs:** Position-agnostic `cheapestFillCost` can theoretically let a team overspend and be unable
to fill a specific position — acceptable for v1 (tax+cap are the real guardrails; revisit if playtest shows
position starvation). MLB-first defers the farm IV-range, leaving two farm-value models un-unified until R9.

---

## Jun 14, 2026 — T9 scope rulings (GameTracker sub-recommendation rebuild)

**Decision (4 rulings, JK via AskUserQuestion):** For T9 (IV spec §10 — rebuild the in-game
`generateManagerRecommendations` placeholder onto effectiveRatings, the "third surface"):
1. **Delta metric = IV-of-effectiveRatings (kblIV).** `delta = computeIV(effectiveRatings(sub)).kblIV −
   computeIV(effectiveRatings(current)).kblIV`, identical to T7a `optimizeLineup` / §8.1 — "one truth,
   three surfaces." Leverage enters via pressure→mojo amplification inside effectiveRatings; the dedicated
   leverage-weighted surface is T10 (Lineup Delta WPA), kept separate.
2. **`subRecThreshold` = per-type** (pinch-hit / defensive-replacement / pitcher-change), in kblIV-dollar
   units, CALIBRATE/playtest-tunable. (kblIV magnitudes differ by rec type, so a single global threshold
   would over/under-fire by type.)
3. **New pure engine module** `src/engines/subRecommendations.ts` (`recommendSubs` → neutral
   `SubRecommendation[]`); `managerWpaRecommendations.ts` becomes a thin adapter mapping
   `SubRecommendation → ManagerRecommendation`. Matches §11's pure-engine boundary.
4. **Split = 2 tickets** (engine-first): **T9a** pure engine (+ `subRecThreshold`), exhaustively unit-tested,
   standing auto-commit; **T9b** GameTracker integration (widen the call-site mapping, derive the pressure
   band, rebuild the 3 generators to call the engine, rewrite generation tests) — user-visible +
   GameTracker-state → audit non-negotiable + JK surface before commit.

**Context:** Captain mapped T9 via a 4-agent decorrelated fan-out (`T9_SCOPE_MAP.md`). Decisive finding:
full ratings + traits are ALREADY in live state (the rec call-site just strips them), so T9 needs no deep
`useGameState` plumbing — only a widened call-site mapping + a derived pressure band + `subRecThreshold`.

**Implications:** T9a is a clean isolated engine addition (new file + additive type exports + an
`activeTraitNames` helper on effectiveRatings.ts for justification naming + the per-type constant);
rosterAnalyzer/T7 stays byte-unchanged (the scorer is reimplemented and the audit diffs it for
equivalence vs `rosterAnalyzer.ts:535-571`). The `ManagerRecommendation` output type + watch/decision
plumbing + NewsBoard UI are preserved by T9b.

**Captain defaults (proceed-unless-vetoed):** pressure band none<1.5≤high<3.0≤extreme (builds on the
existing isClutch LI≥1.5 precedent, CALIBRATE); role-misuse applied as a mojo-LEVEL down-shift on the
candidate before scoring (CP early-entry inning derived from totalInnings); defensive-sub folds
DefensivePlacementRisk into the kblIV delta (mirrors T7a `assignmentEntry`) AND surfaces it as
justification; no-oracle-leak N/A for T9 (active known 22-man roster).

**Trade-offs:** kblIV for a pitcher-change compares two pitchers' arsenal-dominated kblIV — a coarse but
consistent in-game signal; refine via T10 if playtest shows need. Reimplementing the scorer duplicates ~15
lines of clamp+assemble mapping (audit-diffed) rather than refactoring T7 — chosen to keep T9a isolated.

**T9b firing-gate addendum (JK 2026-06-14):** in-game sub recs fire on a **PURE IV-delta gate** — emit
whenever the best sub's per-type IV-delta > `SUB_REC_THRESHOLD[type]`, with NO separate situational
pre-filter. The rebuild REMOVES the placeholder's situational firing heuristics entirely (leverage floor,
batting-order 7-9 pinch-hit gate, pitcher meltdown triggers: consecutive baserunners / runs-allowed-in-
inning). Rationale (JK): fatigue is baked into the tiring player's effectiveRatings and leverage amplifies
via mojo/pressure, so the IV-delta self-limits — spec-literal "replace, do not patch." Accepted tradeoff: a
situational meltdown with no ratings drop (e.g. a pitcher walking the bases loaded) won't trigger a rec, and
recs may surface in low-leverage spots; revisit in playtest if the firing cadence feels off. (Captain had
recommended a situational-gate + IV-delta hybrid; JK chose the pure gate.)

---

## Jun 15, 2026 — T10 scope rulings (Lineup Delta WPA standard + constants snapshotting)

**Context:** Captain mapped T10 (IV §9 Lineup Delta WPA standard + §12 per-season constants snapshot) via a
6-agent decorrelated fan-out + 2 critics (`T10_SCOPE_MAP.md`). All decision-determining claims independently
Captain-verified (file:line). Decisive findings: (1) the §8.1 optimizer (`optimizeLineup`) and the lineup-lock
snapshots are already built; (2) the LITERAL §9 delta already exists but display-only —
`summarizeLineupSnapshotComparison` (`optimalLineup.ts:416-429`) returns
`projectedOpportunityCostTotal = chosen.projectedTeamLineupKblWpa − optimal.projectedTeamLineupKblWpa`; (3) the
ALREADY-PERSISTED `ManagerLineupDeltaRecord.managerWpa` (`managerWpaGameState.ts:929-941`) is a DIFFERENT
number — realized-vs-projected (`actualChosenKblWpa` realized in-game WPA − projected IV), a unit mix; (4)
"WPA" is a misnomer — per D9 the values are IV-of-effectiveRatings dollars rescaled by a ÷10,000,000 divisor
(`rosterEngineConstants.ts:260`); (5) no constants-snapshot mechanism exists (greenfield); (6) a pre-existing
defect: `backupRestore.ts` is stale at v12 and silently drops the v13/v14/v15 stores (separate ticket).

**JK rulings (3 forks, recommendations adopted):**
1. **§9 semantics = IV-of-effectiveRatings (NOT literal win-probability).** Per D9 + all shipped code. "WPA"
   is legacy branding; the misnomer is documented in spec + code comment, and any field rename is DEFERRED to
   a v2 ticket (renaming would touch persisted records + ~30 readers).
2. **The §9 standard = the LITERAL pure projected-vs-projected scalar, persisted additively; the existing
   realized-vs-projected `managerWpa` is KEPT SEPARATE and UNTOUCHED.** They measure two legitimately
   different things (ex-ante opportunity cost vs ex-post manager credit). The new §9 scalar is sourced from
   `summarizeLineupSnapshotComparison` and persisted as a NEW, additive, audit-only field — it does NOT fold
   into the `managerValue` rollup (would double-count the per-slot deltas already summed there) and MUST NOT
   regress any of the 5 live surfaces or `almanacManagerWpa.test.ts`.
3. **Constants snapshot = full-dependency CONTENT HASH stamped on `SeasonMetadata`; single "high" T10 ticket.**
   Hash the full optimizer dependency set — the optimizer subset of `rosterEngineConstants` + `ivCurves` +
   `traitPricing` + `traitInteractionMatrix`; **`tierParams` EXCLUDED** (not imported by any of the 3 optimizer
   engines, verified). Stamp `optimizerConstantsVersion`/`optimizerConstantsHash` additively on `SeasonMetadata`
   (precedent: `gamesPerTeam`; no DB bump; travels in backup since `seasonMetadata` IS registered). Mechanism =
   prove-no-change (hash + version), NOT a value-copy blob (the per-game §9 scalar is already persisted, so the
   value is recoverable; the snapshot only certifies WHICH constants produced it). Write-once per season,
   assert-immutable with a LOUD warn on divergence (never silent overwrite).

**Split (auto-resolved by ruling 3):** single **T10** build ticket — Codex 5.5 | high → Opus 4.8 audit
(auditor ≠ builder). NOT split, because the SeasonMetadata-hash mechanism adds NO DB migration. (Would have
split T10a/T10b only if a dedicated season store or value-copy had been chosen.)

**Captain default (proceed-unless-vetoed, Q5):** persist the §9 scalar whenever an optimizer baseline is
computed (all modes that lock a lineup); require/stamp the season constants snapshot only for games carrying a
`seasonId`; for snapshot-less modes (exhibition/elimination) record the live constants `version` string so the
delta stays traceable.

**Asset gate:** T10 reads mojo/fitness/traits only as optimizer INPUTS and snapshots constants READ-ONLY — it
modifies none of the SMB4-protected engines. No asset-gate approval required beyond these rulings.

**Persistence note:** T10 adds new persisted fields (per-game §9 summary + per-season constants hash) → it is a
persistence / saved-data-shape change → per the risk-scoped ruling it SURFACES to JK before commit (NOT
auto-commit) and is prioritized in the browser-verify batch.

---

### 2026-06-16: Reporter (§18.1 verification read) — franchise wiring rulings (JK)

**Context**: First of the four `FRANCHISE_V1_LIVING_SEASON_SPEC.md` §18 verification reads. Captain ran a
`reporter-certification-read` workflow (8 dimension-mappers + 5 adversarial verifiers; full doc
`spec-docs/REPORTER_CERTIFICATION.md`). Certified: the base reporter is a **certify-and-connect** job for
franchise (downstream engine is already franchise-aware, no mode gate), with one genuine **build** gap (the
accuracy model). Key facts behind the forks: (a) only two of five cadence beats fire live in any mode —
between-inning summaries + post-game columns; per-play + preamble are orphaned everywhere; (b) TWO reporter
systems coexist — the live `GameStory`/`PostGameColumns` system (wired into Exhibition/Elimination) vs the
legacy `narrativeEngine.ts` template that FranchiseHome's hub actually shows; (c) assignment + lookup key on
`leagueId` only, but franchise scope is `franchiseId/seasonId`; (d) the ~10% inaccuracy model §24.5/§24.7 needs
exists only on the legacy engine — flag-only (never distorts text), orphaned at consumption, absent from the
live pipeline. §5 invariant (LLM narrates, never decides) CONFIRMED safe; reporter persistence CONFIRMED
backup-safe (the v12 defect drops only the v13-15 franchise-economy stores, not reporter data).

**Decisions (JK, 2026-06-16):**
1. **REP-1 — Franchise reporter cadence v1 = POST-GAME COLUMNS ONLY.** Leaner than the Captain's "match
   Exhibition/Elimination" recommendation: franchise v1 skips live in-game commentary entirely (no
   between-inning summaries, no per-play, no preamble) — the reporter speaks only after the game. Implication:
   the `liveBeatReporterEnabled` flag is not needed for franchise; only `postGameColumnsEnabled` must be set on
   franchise launch. Smallest connect surface + lowest LLM cost.
2. **REP-2 — Canonical franchise news = the LIVE `GameStory`/`PostGameColumns` system.** Rewrite
   `FranchiseHome.BeatReporterNews` to read the persisted `GameStory` records; retire the legacy
   `generateGameRecap` template path for franchise. One system, the real reporter columns.
3. **REP-3 — Franchise reporters keyed by `franchiseId`** (stable across the franchise's life, not per-season).
   Avoids collision with Exhibition reporters that share `teamId+leagueId`. Requires reconciling
   assignment/`getReporterForTeam` (currently `leagueId`-keyed) to a `franchiseId` scope for franchise games.
4. **REP-4 — The ~10% inaccuracy model is BUILT FRESH inside the §24 relationships-lite ticket, not the base
   reporter-connect ticket.** Base reporter ships WITHOUT it. The §24 build adds a reusable **seeded**
   inaccuracy primitive + a persisted accuracy field; meaning recommended as hedge/flag in v1 with
   content-distortion deferred (final meaning ruled when §24 is drafted). Unblocks the base reporter now.

**Non-blocking (noted, not gating cadence):** the whole backup/restore feature + the reporter-almanac
"living-memory" writer are both orphaned (no user trigger today); Claude column spend has no client-side rail
(Grok-only 500/day); the reporter is server-key/network-dependent (no offline fallback). Bump the
`backupRestore` v12 pin → 15 remains a separate tracked ticket.

**Asset gate:** none required — this is a read + design ruling; no SMB4-protected engine is touched. The build
tickets these rulings unblock are persistence/user-visible → they SURFACE to JK before commit per the
risk-scoped rule.

---

### 2026-06-16: Reporter SEASON-LONG cadence (§18.1b) — publish-bus model + rulings (JK)

**Context**: JK flagged that the REP-1 ruling settled only the IN-GAME cadence (post-game columns); the
SEASON-LONG narrative cadence — how the reporter tells the morale / relationship / race / designation story
BETWEEN games — was never addressed (logged as a scoping lesson in SESSION_RULES pen). Captain ran a second
read (`reporter-season-cadence-read` workflow, 7 mappers + 5 adversarial verifiers; full doc
`REPORTER_CERTIFICATION.md` Part 2 §K-O). **Decisive finding:** unlike the in-game half (certify-and-connect),
the season-long narrative is **overwhelmingly UNBUILT** and is a downstream consumer of nearly every Phase-2
system — the reporter narrates what the deterministic matrix produces, and most of those event SOURCES (live
designations/flips, races, random events §10, the auto/logged morale ledger, relationships, manager firings)
ARE the unbuilt Phase-2 features. Certified gaps: no season-news record type (only game-bound `GameStory` +
`CommentaryFeedEntryRecord`); the season-memory substrate (almanac/legacy-summary) is half-wired (read-back
live, write/regen orphaned → prompt input always empty); no sim-tunable emission gate; pre-action hooks
(§24.5/§24.7) are build-from-scratch (the revenge substrate in `tradeEngine.ts`/`headlineEngine.ts` exists but
orphaned; relationship data source empty). Today only game-end drives a take; trade/roster moves fire as bare
transactions with morale/relationship riders hardcoded `false`.

**Decisions (JK, 2026-06-16):**
1. **SEA-1 — Accept the PUBLISH-BUS cadence model; build the reporter foundation EARLY.** The season-long
   cadence is event-driven, not a clock: a Phase-2 system produces a narratable outcome → emits a
   `NarrativeEvent` → a sim-tunable emission gate (marquee-only default) decides if it warrants a take → the
   canonical reporter renders it into a persisted `SeasonNewsItem` → seeds reporter season-memory → surfaces on
   the franchise hub feed + Almanac. The foundation (news record + emission gate + a non-game generation method
   on the canonical live reporter + hub season-feed + wiring the orphaned season-memory) is built EARLY as
   Phase-2 infrastructure; each later soul-layer system then adds its event tap as it lands. The reporter is
   near the FRONT of the Phase-2 dependency order, not a late standalone ticket.
2. **SEA-2 — Separate season-emission-config.** The sim-tunable emission gate is a NEW config keyed by the
   season-event taxonomy (per-event-type base rate + per-race Top-N depth + global marquee-only flag),
   sim-writable, kept DISTINCT from the player-facing in-game `narrativeIntensity` dial. (The season analog of
   the in-game `notabilityScorer`; emission volume settled by the Simulation Gate §16 per the 2026-06-16
   "let the sim decide" ruling.)
3. **SEA-3 (deferred to data-model design)** — whether to fold season news into one `SeasonNewsItem` vs reuse
   the two reserved-but-dead stores (`narrativeContext` for storyline/momentum state, `rivalryScores` for §24
   relationship-edge state). Captain lean: one `SeasonNewsItem` for news + `rivalryScores` for relationship
   edges; finalized when the record is designed.
4. **SEA-4 (Captain reconciliation, JK did not veto) — pre-move heads-up is ADVISORY, never a hard gate.**
   §24.5 ("a pre-commit heads-up, NEVER a hard gate") supersedes the older `FARM_SYSTEM_SPEC` blocking-modal
   wording (FINDING-133, which has zero code anyway).
5. **SEA-5 (Captain reconciliation, JK did not veto) — REP-2 holds for season takes.** Generation lives on the
   canonical LIVE reporter; the orphaned legacy `generateTradeNarrative`/`generateMilestoneNarrative` templates
   are NOT revived — their `NarrativeEventType` vocabulary is reused, the generation is rebuilt on the live
   system.

**Status:** §18.1 (reporter) verification read is now COMPLETE — both the in-game cadence (REP-1..4) and the
season-long narrative cadence (SEA-1..5) are settled. The reporter-foundation build ticket + the per-source
event taps fold into the Phase-2 "living-season D-stack" sequencing the Captain drafts after the remaining §18
reads. Asset gate: none (read + design only).

---

### 2026-06-16: Traits-from-reality (§18.2 / §9) — full trait→signal model (JK)

**Context**: Second §18 verification read. Captain ran a `trait-to-signal-mapping` workflow (4 ground-truth readers
+ 5 per-chemistry mappers covering all 72 traits + 3 adversarial verifiers) → `TRAIT_SIGNAL_CERTIFICATION.md`.
Certified the crux (`typed ≠ populated`): the pressure spine (leverage/WPA/clutch/runners/RBI) is auto-populated,
but the discriminating signals (count, pitch type, pitch location, fielding difficulty, chase, handedness, mojo)
are absent / typed-but-unwritten / manual-opt-in. Initial triage 13 A / 24 B / 35 C; then a JK design session
worked the 33-deep C bucket down to **1 cut + everything else buildable**. Also certified: the §9 *engine* (3
layers — log-reconstructed activation context, strength scoring, trait grant/write-back) is entirely UNBUILT, but
`traitInteractionMatrix.ts` already encodes every activation predicate (the foundation).

**Decisions (JK, 2026-06-16):**
1. **TS-1 — Acquisition formula:** P(gain/lose) = f(reality-percentile-vs-peers, personality-tilt, current-morale),
   min-sample gated, gain-high/lose-low hysteresis, 2-trait cap (strength-ranked displacement, no offsetting pair).
2. **TS-2 — Peer-relative is mandatory** for both valences (anti-dilution + it IS the strength score; rides the
   Adaptive Standards machinery; auto-scales by season length + pool talent).
3. **TS-3 — Min-sample safety valve** ⇒ enrichment is opt-in ("Franchise-lite"); thin data = trait dormant, never
   flickers; also guards against confirmation spam (trait changes are confirmed per §11).
4. **TS-4 — Season-length-scaled thresholds** for count-based triggers (mirrors WAR's `RUNS_PER_WIN` scaling;
   percentile model handles most for free). E.g. Injury Prone: 40g→2 injuries, 80g→3, 120g→4.
5. **TS-5 — Personality weighting** in two layers: universal (Ambition↑ positive-gain, low-Resilience↑
   negative-catch) + four "image" axes (Composure / Hustle / Big-game / Approach — see cert §VI.3). Personality is
   PRIMARY where the measured signal is thin (Stimulated, Gets Ahead/Falls Behind, Big/Little Hack), a TILT where
   strong. Mechanical splits (vs L/RHP, Specialist, Reverse Splits, Pick Officer, K Neglecter, Utility) = no
   personality image.
6. **TS-6 — Role eligibility (crystal):** 24 pitcher-only, 40 position-player-only (25 batting / 7 baserunning /
   8 fielding), 7 universal (Clutch, Choker, Durable, Injury Prone, Consistent, Volatile, Stimulated), 1 cut.
   Full lists in cert §VI.2. Two Way is pitcher-only and the GATEWAY (a pitcher who hits elite-for-a-pitcher →
   everyday player → then eligible for batting traits). Captain-default edge cases (veto open): Wild Thrower +
   Pinch Perfect = position-player-only.
7. **TS-7 — Sign Stealer CUT** entirely, including from draft-class generation (least-valuable, no signal).
8. **TS-8 — Reclassified from C via JK rulings:** Easy Target = chase-for-OUTS (negative mirror of Bad Ball
   Hitter = chase-for-HITS, same signal split by outcome); the steal-vulnerability trait is **Easy Jumps**
   (SB-allowed/IP percentile, pitcher); Metal Head = pitcher hit by KP+nut-shot ≥2 combined → protective grant;
   Mind Gamer = high walk + pitch-grinding rate (batter); Distractor = high rWAR (baserunner); Crossed Up =
   passed-ball-on-advance (catcher); Wild Thing = wild-pitch-on-advance (pitcher); Consistent/Volatile =
   mojo-change frequency vs peers; Stimulated = late-game performance vs peers + PED-personality.
9. **TS-9 — Two Way corrected** to pitcher-batting-excellence (super-rare); Dive Wizard += `beat_runner`;
   Sprinter += `beat_throw`, Slow Poke += `beat_runner`; Sprinter/Slow Poke stay event-driven (not profile).
10. **TS-10 — Big/Little Hack** = the one "not earned from a log event" trait: profile-weighted (POW/CON ratio) +
    personality, probabilistically applied.
11. **TS-11 — Capture surface:** net-new = pitch zone, OF extra-base-credit (bWAR expected-extra-bases), injury
    accumulator (folds into fitness/dev engine); everything else reuses existing fields/events; handedness JOIN
    (`bats`/`throws`) is a low-cost win unlocking 6 split traits.
12. **TS-12 — Build the §9 engine on `traitInteractionMatrix`** (log-reconstructed context + peer-relative
    strength scorer + grant/write-back to the franchise-instance `traits` field). All thresholds/bands/weights →
    Simulation Gate (§16).

13. **TS-13 — Role-eligibility corrections + refinements (JK, same session):** **Crossed Up is PITCHER-ONLY**
    (a pitcher trait whose effect manifests as the catcher dropping the pitch — attribute the passed-ball signal
    to the PITCHER). Revised counts: **25 pitcher-only / 39 position-player-only (25 batting / 7 baserunning /
    7 fielding) / 7 universal / 1 cut.** Wild Thrower + Pinch Perfect confirmed position-player-only. **Two-Way
    grant** (evolution or generation) randomly assigns the pitcher a two-way fielding position (IF / OF / C).
    **Roster-role tilt:** bench classification raises acquisition likelihood for **Pinch Perfect** and **Utility**
    (starter lowers it) — a role input separate from personality.

**Status:** §18.2 (traits-from-reality) verification read COMPLETE. Asset gate: none yet (read + design); the
build ticket touches the SMB4-protected trait/mojo/fitness systems → SURFACES to JK per the asset rule when drafted.
Next: §18 read (3) — draft/salary/farm economics.

---

### 2026-06-16: Draft/Salary/Farm economics (§18.3) — DSF rulings (JK)

**Context**: Third §18 read (`draft-salary-farm-economics-read` workflow; full doc `DRAFT_SALARY_FARM_CERTIFICATION.md`).
Certified (salary core 3-way corroborated; the 2 dedicated salary mappers + verifiers 529'd mid-run and are
re-running to harden): 22-man salary = IV-based + tier-invariant; farm-prospect = a flat 4-row draft-round table
(CALIBRATE bridge), unchanged at call-up (F-127); rookie scale = absolute 0.50× age-replacement — so the two
scales are DISCONNECTED today. The pick-value chart is already relative-to-pool but MLB-22-only and unconsumed by
salary; the IVs it ranks are RAW (the tier-scale constants TIER_SHIFTS/FARM_NERF_SCALES exist in tierParams.ts but
are ORPHANED); pick-trade execution does NOT exist (validateTrade is advisory-only); per-draft grade distribution
has no knob (round-keyed, tier-independent). Startup drafts (LeagueBuilderSnakeDraft MLB-22 + LeagueBuilderDraft
farm-10) + scout-obscuring (R9) are LIVE; the in-season franchise draft is dry-run only.

**Decisions (JK, 2026-06-16):**
1. **DSF-1 — UNIFY on the tier-scaled pool anchor.** Connect TIER_SHIFTS[tier].scale into the pool-IV feed
   (useLeagueBuilderData.ts:414) so pickValueChart[0] becomes tier-sensitive; then peg BOTH 22-man rookie pricing
   AND farm-prospect pricing to that tier-scaled pool top, tapering down the slots — REPLACING the absolute 0.50×
   rookie factor AND the flat farm-round table. One coherent relative-to-pool, tier-sensitive scale (nerfed pool →
   lower top-slot price; "is this pick worth it?" stays live).
2. **DSF-2 — Tradeable asset = DRAFT PICKS (order positions).** Build a pick-ownership model + a pick-trade
   executor that mutates/persists pickOrder (gated behind validateTrade), and extend derivePickValueChart +
   validateTrade to the farm round. (Not roster-vacancies, not the prospects-via-player-trade.)
3. **DSF-3 — Farm grade mode = MULTIPLICATIVE SHIFT.** Add farmGradeMode (Juiced/Standard/Nerfed) that skews the
   existing round-keyed roundGradeWeights tables via FARM_NERF_SCALES, independent of the 22-man pool tier
   (enables nerfed-22-man + juiced-farm). Reuses the validated bell curve; sim-tunable.
4. **DSF-4 (Captain default, not vetoed) — in-season annual draft DEFERRED to the offseason (post-v1, per LS-1).**
   The League Builder startup draft suffices for v1; the dry-run franchiseDraftAdapter apply path is post-v1.

**Status:** §18.3 verification read COMPLETE (salary verification hardening re-running post-529). Asset gate: none
(read + design); the build ticket touches salary/tier economics (not an SMB4-protected engine) but is
persistence/economics → SURFACES to JK per the risk rule when drafted. Next: §18 read (4) — Manager WPA
reconciliation for MOY (the last §18 read).

---

### 2026-06-16: Manager-WPA / Manager-of-the-Year (§18(4) + AWARD-7) — MOY rulings (JK + Captain)

**Context**: Fourth and LAST §18 read (`moy-reconciliation-read` workflow — 5 mappers + 3 adversarial verifiers + a
completeness critic; full doc `MANAGER_WPA_MOY_CERTIFICATION.md`). Certified: the v2 Manager-WPA truth-layer is real,
live-wired, and persisted — decision-WPA = a true team win-probability delta × per-type manager share
(`managerWpaDerivation.ts:1734-1747`). The three §23.7 reconciliations are all real and all UNIMPLEMENTED. The read
forced three corrections to AWARD-7's framing: (i) the live composite is FOUR quantities (tactical decision-WPA +
**deployment-WPA** + lineup-delta), not three, and **team record is not in the live sum at all**; (ii) MOY is NOT
greenfield — `pogAwards.ts:589-590` ships a live, persisted, displayed per-game `best_manager` award on the exact
composite (gated `MIN_POSITIVE_WPA = 0.005`), so season MOY is a season-grain aggregation of it; (iii) a name/scale
trap — the live composite sums the CAPPED REALIZED record `delta.managerWpa`, while §23.7 literally names the T10
`ManagerLineupDeltaSummary.lineupDeltaWpaStandard` (built + persisted but **orphaned**, read nowhere). The deprecated
salary MOY (`calculateMOYVotes`, `getExpectedWinPct = 0.35 + salaryScore×0.30`) is dead-gated behind
`FRANCHISE_V1_OFFSEASON_EXECUTION_ENABLED = false` → retiring it re-points, never breaks.

**Decisions — JK (the design/scope forks):**
1. **MOY-1 — Input set = FOUR.** Season MOY = decision-WPA + deployment-WPA + lineup-delta + team record. Deployment
   kept as a distinct scored term (already built/capped/shown); team record ADDED as the new fourth input. (Closes
   AWARD-7's undercount.)
2. **MOY-2 — Lineup quantity DEFERRED to build time.** Capped realized record (`delta.managerWpa`, the live composite
   input) vs T10's pure projected `lineupDeltaWpaStandard` (the §23.7-named, currently-orphaned Summary field) is
   resolved when the MOY engine is drafted, both on the table; structure locked around the open slot. (Realized record
   is already aggregated + commensurate; the T10 standard needs a new aggregator + denomination fix.)
3. **MOY-3 — Record term = EXPECTATION-RELATIVE on the D6 trusted-value artifact.** Wins-above-roster-strength-
   expectation, expectation = the D6/D8 trusted True-Value projection (NOT raw W-L, NOT the untrusted
   `franchiseExpectedWinsPreview`). Drops the salary-based expectation per (c). **HARD-couples the MOY build to D6** —
   consistent with the D-stack order (D9 → D8 → D6); MOY cannot be built before the value-trust gate.
4. **MOY-4 — No fame tilt for v1.** MOY is a PURE truth-layer computation; managers sit outside the player fame
   economy; legacy = the Almanac record. (Diverges deliberately from §21/RACE-4's player merit-award fame tilt.)
   Manager-fame is a post-v1 revisit.

**Decisions — Captain (engineering / architecture / sim-deferred; JK-overridable):**
5. **MOY-5 (architecture) — Build as a season aggregation of the existing `pogAwards` per-game composite.** Reuse
   `PogManagerValueTotal` → extend to season grain; wrap in the absent `franchiseAwardsEngine`/`franchiseAwardsStorage`;
   NOT a parallel engine. Retire `calculateMOYVotes` + the deprecated `mwarCalculator` salary path + the orphaned
   `useMWARCalculations` hooks. Re-point `AwardsCeremonyFlow`/`RatingsAdjustmentFlow` off `calculateMOYVotes` BEFORE any
   offseason flag flip.
6. **MOY-6 (common-scale, reconciliation a) — Pool-relative normalization for the SEASON award.** Normalize each of the
   4 inputs across the manager pool (rank/z-score) BEFORE weighting — dissolves the denomination mismatch without
   inventing an IV→WP constant or touching the frozen value layer. The per-game `pogAwards` raw-sum + caps stay unchanged.
7. **MOY-7 (weighting, reconciliation b — sim-deferred) — Composite weights → Simulation Gate (§16).** Lock structure
   now (4 pool-normalized inputs, record expectation-relative on D6); the weight split (the 60/40's 4-way successor) is
   a sim-tuned starting guess.

**Status:** §18(4) verification read COMPLETE → **all four §18 reads DONE.** Asset gate: none (read + design); the MOY
build ticket is greenfield awards + persistence + a D6 dependency → SURFACES to JK per the risk rule when drafted, and
sequences POST-D6/D8 inside D9. Next: Captain drafts the Phase-2 "living-season D-stack" sequencing (fold in the §18-
unblocked tickets; reconcile the D9/D7 couplings) for JK ratification.

---

### 2026-06-16: Phase-2 "Living-Season D-stack" (the L-stack) — sequencing draft + five fork rulings (JK)

**Context**: Captain drafted the dependency-ordered Phase-2 build sequence (`FRANCHISE_V1_LIVING_SEASON_DSTACK.md`,
tickets L1–L14 + L-SIM + an economy track) from `FRANCHISE_V1_LIVING_SEASON_SPEC.md` §5–§24 + the four §18 certs,
then hardened it with a 12-agent decorrelated verification workflow (`wf_b5734e06-e2c`: 7 grounding code-readers +
5 adversarial ordering critics, ~1.26M tokens). The audit forced structural corrections folded into the doc:
**(i)** MOY is a Phase-1 **D9** sub-ticket (the §18(4) read specifies the D9 manager-award contract — MOY-1..7), NOT
a Phase-2 ticket (MOY-4 bars manager fame → no Phase-2 layer); removed from L12c. **(ii)** New ticket **L1.5** (Team
Captain initial assignment at Mode-1 league finalization) closes a BLOCKER gap — the handoff is unbuilt in both
stacks (`franchiseInitializer.ts:335-433` has zero Captain assignment; CAPTAIN hard-blocked at
`franchiseDesignationEligibility.ts:151-157`). **(iii)** L1's hidden modifiers are generated mis-named + un-persisted
(`prospectScoutingDraftEngine.ts:542-547` emits leadership/volatility/adaptability/pressure, not loyalty/ambition/
resilience/charisma) → L1 is a real build. **(iv)** Reporter base split out (L4a, no morale-matrix dep) + hoisted to
Tier 0 per SEA-1; trait-capture (L9a) hoisted to Tier 0 (longest data lead). **(v)** DSF-1 is COUPLED to the value/IV
spine (re-prices the frozen draft-IV anchor) → sequence before the v1 franchise's draft/salary freeze. **(vi)** Backup
parity escalated — the D2 guard covers only `kbl-tracker`; Phase-2 stores land in separate DBs; export/restore is
orphaned + a stale-pin restore destroys newer stores → re-scope the guard to all DBs + a prerequisite hardening ticket
+ a per-ticket backup DoD. **(vii)** Floating TV is built but overwrites one cumulative row → KK/Comeback need a NEW
`franchiseTrueValueSnapshots` store captured from game 1. **Parallelism rule:** BUILD Phase-2 foundations dark in
parallel with the late D-stack, ACTIVATE strictly after D13 (the §5 "no phantom morale" + D12 smoke gate).

**Five fork rulings (JK, 2026-06-16):**

1. **LSD-1 (F1) — D9 fame-ready seam checklist RATIFIED; build the award engine ONCE.** Fame IS in full v1 (Phase-2
   L6), but the award *engine* is built at the Phase-1 checkpoint before fame exists, so build it once with the fame
   hooks left empty and let L12 fill them — no rebuild. The four seams baked into the D9 contract NOW: (1) store
   per-award **candidate margins** (not winner-only) for the close-race fame tilt; (2) store the **fWAR vs total-WAR
   split** on Gold Glove for the later defensive-fame blend (~15–25%); (3) make the ceremony **vote-weight field
   pluggable/nullable** (salary→fame swap without migration); (4) reserve the **KK/Bust/Comeback award-type slots +
   the `franchiseTrueValueSnapshots` store**, capturing TV from game 1 (or season-1 Comeback data is lost). Fame's
   award role is a **merit-led TILT** (§21.4 — flips only a genuinely-close race), **defensive-fame** on Gold Glove,
   **fame-weighted** ceremony votes (replacing salary), **fame-led** All-Star *starters* (the one exception); the
   TV-family runs on True Value, not fame; awards pay fame+morale+badge only (no rating rewards). *(Captain rec'd (a);
   (b) build-then-rework = two builds, (c) hold-D9-for-fame reopens the D0 "real awards in Phase-1" ruling — both declined.)*
2. **LSD-2 (F2) — FA-attraction DEFERRED to v1.1; FA-gravity struck from §13 "live teeth."** Keep only the in-season
   **trade-request generation** (loyalty/morale-scaled roster destabilization) in L5 (+ an L10 event tap + an L13
   trade-demander flashpoint). Free-agent attraction/destination weighting is an offseason concept incompatible with
   the one-season v1 (LS-1) → v1.1.
3. **LSD-3 (F3) — Cornerstone CUT from v1.** Matches the D0 deferral; L7 drops it. ("Last season's MVP; accumulates"
   is structurally impossible in a single-season v1.) Revisit at the offseason/multi-season bridge.
4. **LSD-4 (F4) — Budget pressure CUT from v1.** The §13 "optional/capped" tooth is next-season spending room =
   offseason = post-v1. Revisit v1.1.
5. **LSD-5 (F5) — Stadium change = pick from the EXISTING Super Mega stadium pool in League Builder; NO custom
   stadiums.** On relocation (L14) the user chooses from the built-in stadium list; the build must **pull the full
   stadium record (dimensions, name, park factors) into the franchise** so stadium analytics recompute correctly
   after the move. The L10 independent random-event stadium-change leg (fan-morale-suppressed rate) uses the same
   pool-pick mechanism. (No custom-stadium entry — consistent with the standing hard exclusion.)

**Status:** Phase-2 sequencing DRAFTED + all 5 forks RULED + folded into `FRANCHISE_V1_LIVING_SEASON_DSTACK.md`
(Status: PROPOSED). No product code, nothing committed (JK commits). Asset gate: none (design/docs only) — each L-ticket
re-gates when contracted (Codex builds → Opus audits → JK browser sign-off). Remaining ratification gates before any
build contract: (a) JK explicit sign-off on the L-stack structure; (b) D0 ratification (still PROPOSED). First Tier-0
critical-path opener to contract = **L1** (personality/modifier substrate). Living-season spec §4/§13/§14 carry
amendment notes for the cuts (Cornerstone, FA-attraction, budget pressure, stadium pool-pick).

---

### 2026-06-16 (follow-up): Release-boundary ruling — the living season IS part of v1 (LSD-6)

**Context**: With the L-stack sequenced + LSD-1..5 ruled, JK was asked whether (a) Phase-1 "Playable-V1" (the
D-stack, soul-layer-excluded) ships as a standalone milestone with the living season as a true follow-on, or (b)
the living season is part of "v1" proper — v1 isn't done until both stacks + the sim gate complete. This reconciles
the D0 doc's older "Phase-2 automation → v1.1" deferral language with the week's living-season design.

**Ruling — JK (2026-06-16): (B).** The living season (Phase-2 L-stack) is **PART OF v1**, not v1.1.
- **v1 = Phase-1 (D-stack D1–D13) + Phase-2 (L-stack L1–L14 + economy track) + the L-SIM gate.** One release — the
  full living, playable season (draft → champion *with* the soul layer).
- **"Playable-V1" (D0's D13) is reframed as an INTERNAL Phase-1 checkpoint**, NOT the v1 release. D13 approves the
  value-spine-live milestone; the v1 release sign-off comes after the L-stack + the L-SIM gate.
- **Sequencing UNCHANGED:** the D-stack still builds first; Phase-2 foundations build dark in parallel; the soul
  layer activates after D13; every magnitude is sim-gated.
- **D0's "Phase-2 automation → v1.1" deferral is SUPERSEDED for the soul layer** — morale / fame / development /
  traits / relationships / managers / rebrand / the morale-gated designations are **v1** (Phase-2), not v1.1.
- **Genuinely post-v1 / v1.1 (unchanged):** the offseason / Season-2 bridge (LS-1); the three LSD cuts (Cornerstone
  LSD-3, FA-attraction LSD-2, budget pressure LSD-4); the tracked JK-gated fast-follows (R9, R12, FINDING-148).
- **The v1 exit gate (iPad playtest) is of the FULL living season** (after L-stack + L-SIM), not the stats-only D13
  checkpoint; the offseason flag stays FALSE throughout v1 (offseason remains post-v1).

**Status:** Release boundary RULED. Reconciliation notes added to `FRANCHISE_PLAYABLE_V1_DEFINITION.md` (D0),
`FRANCHISE_V1_LIVING_SEASON_DSTACK.md`, and `CURRENT_STATE.md`. No code impact (labeling/scope-boundary only).

---

### 2026-06-17: Skipped-step forks cleared — OD-2..5 + D4 RULED (attended session, JK present)

**Context**: A fresh attended session resumed at D10 after the overnight AUTH-4 run closed D9. The five open design
forks the Captain had left at documented conservative defaults during the unattended run (OD-2..5 + the D4 scope
snag) were walked one-by-one and ruled by JK. (OD-1 was already resolved 2026-06-16.) These settle the L-stack
design + D4 scoping ahead of need; none blocked D10.

**OD-2 — economy scale (L-ECON1 / DSF-1), the rookie/farm/draft IV pricing — NOT True Value.** First clarified a
Captain conflation: there are THREE separate systems — **IV** (ratings-based intrinsic $, `ivEngine.computeIV().kblIV`
→ drives salary + the pick-value chart), **TV** (performance-based, persisted WAR peer-compared at the actually-played
position, `franchiseValueInputs.ts` → the D6 frozen artifact) and the **pick-value chart** (pool IVs sorted→slots).
Verified in code: `franchiseValueInputs.ts` consumes `totalWar` stat rows and does **not** import `computeIV` — TV is
100% performance-based and OD-2 does not touch it. OD-2 is ONLY the pricing of players with no game performance yet
(22-man pool at construction, rookies, draft picks, farm prospects).
- **A — scope: NEW-LEAGUE-CONSTRUCTION-ONLY, no retroactive.** JK: none of the currently-loaded leagues are
  in-progress (they're templates to pull from); franchises will be deleted/recreated to browser-test the new features.
  So nothing is re-priced retroactively; the new scale applies at construction for franchises built after it lands.
- **B — ruler: reuse the existing pick-value chart, same machinery / different anchor.** 22-man-rookie/draft anchor =
  `pickValueChart[0]` scaled by the league **tier** (`TIER_SHIFTS[tier].scale`); **farm anchor = that ×
  `FARM_NERF_SCALES[tier]`** (§7.4 "one grade step left of the league tier") then tapered by slot/grade. This RESOLVES
  JK's "will farm price like the 22-man?" concern: a juiced league's farm pool prices at 0.8827 = exactly the standard
  tier — farm sits ~one grade-tier below its MLB pool, systematically. Only boundary overlap (elite A-prospect ≈
  low-end MLB roster player) remains, which is realistic. `farmGradeMode` (DSF-3) skews farm grades further,
  independent of the MLB tier. `FARM_NERF_SCALES`/`TIER_SHIFTS`/`TIER_RATING_SCALES` already exist in `tierParams.ts`
  but are orphaned — the build wires them in. Replaces the absolute 0.50× rookie factor AND the flat 4-row farm table.
- **C — tier sensitivity applied by scaling raw IVs BEFORE the chart (not a `computeIV` input)** so the frozen IV
  oracle (`iv_oracle.json`) stays byte-untouched. Approach confirmed. The *build* therefore remains a watched /
  safety-walled ticket (adjacent to the frozen anchor); this ruling settles only the design.
- All magnitudes (nerf depth, taper steepness, grade skew) → Simulation Gate (§16).

**OD-3 — L2 mutable ratings layer, confirmation UX.** (A) pending ratings/trait changes **queue quietly + clearly,
async/non-blocking** — never gate the next game; users learn to check the queue before each game and confirm once
they've applied the change in the SMB4 console so engine and console match. (B) edit instructions in **plain text**
("Raise Joe's Power 65→70"). (C) temporary-overlay expiry = **game-count** (re-evaluated on load), not wall-time.
(D) overlays **season-scoped** (reset each season, no carry-forward).

**OD-4 — team-tied NPC assignment.** (A) league-vs-franchise reporter scope = **franchiseId-precedence cascade**
(franchise reporter wins for franchise games; already shipped in L4a-connect). (B) **manager + reporter are assigned
on the team-edit page in League Builder. SCOUTS are NOT** — scouts are **drafted during the league draft process**
(they're unique to the *farm* draft; they add nothing functional to the 22-man), then **reflected/displayed on the
team page** once drafted. **Scout drafting is FRONT-LOADED to before the 22-man draft** (better UX than mid-process:
one front-office staffing step, then uninterrupted 22-man→farm drafting). This unlocks a **cosmetic** win: the scout's
name rides each team's 22-man **draft-guide insider info** ("intel from your scout") — flavor only; scout
abilities/specialties still apply only to the farm draft. NOTE: today scouts are hired *inside* the farm-draft flow
(`LeagueBuilderDraft.tsx`), so this is a **re-sequence** of the League-Builder flow and shifts the 22+10+2-scout
handoff-gate ordering → capture in the League-Builder draft-flow spec. (C) `SeasonNewsItem.facts` schema defined at
first event-tap build.

**OD-5 — L9a trait enrichment capture (live game path).** (A) **manual/opt-in capture, never forced** — but where
the data IS present, it absolutely determines whether performance-warranted traits are granted; traits whose data is
absent simply aren't awarded. **All performance-related (vs personality-weighted) trait determination needs
GameTracker data → this requires OPTIONAL ZONE INPUTS for pitching/hitting in the GameTracker** (the net-new capture).
(B) injury accumulator = **cumulative season running tally** (injuries are already tracked in the GameTracker, so the
tally rides on top) → feeds Durable / Injury-Prone.

**D4 — salary-live UI de-gate: RE-SCOPED, fold into D11.** The original snag (salary live but the True Value/Expected
Wins preview still D6-gated on the combined `TeamHubContent.tsx:4623-4648` panel) is **MOOT** now that D6–D9 landed —
the value preview is trusted/frozen, nothing left to gate. **Ruling: the whole combined panel goes live; fold the
salary de-gate into D11** (the UI live-label sweep already covers salary / True Value / designations / awards on
exactly this surface). D4 is no longer a standalone ticket.

**Status:** OD-2..5 + D4 RULED. No product code this turn (decisions/docs only). OD-2 + OD-5 builds remain
watched/safety-walled per their notes; the rest fold into their L-stack tickets. CURRENT_STATE "OPEN PENDING-JK" and
AUTONOMOUS_RUN_LOG "OPEN DECISIONS" updated to reflect closure. Next action: **D10**.

---

### 2026-06-17: DESIG-RECON — team-designation model reconciled + ruled (attended session, JK present)

**Context**: While scoping D10's awards/designation display, JK flagged possible drift in the committed D6/D7
designation work. A 3-reader reconciliation workflow (`wf_a7edf687-814`: as-built code / spec / coverage) mapped the
team-designation system against the spec (MODE_2_V1_FINAL §17 = canonical; DYNAMIC_DESIGNATIONS_SPEC /
FAN_FAVORITE_SYSTEM_SPEC / PERSONALITY_SYSTEM_SPEC = gospel) and JK's intra-team six-per-team model.

**Reconciliation finding (no bug on the axis JK worried about):** ALBATROSS is built INTRA-TEAM in both selection
paths (`franchiseDesignations.ts:426` `selectLowest` inside the `byTeam` loop; eligibility candidateKey
`teamId:type`) — it is the worst net Value-Delta player on the player's OWN team, NEVER a cross-team comparison. The
"≥2 MLB peers" rule (`FRANCHISE_TRUSTED_VALUE_PEER_POOL_MIN_THRESHOLD=2`) is a True-Value RELIABILITY/trust gate
(is this player's TV number even computable from enough peers), used only as a candidacy FILTER — it is NOT a
selection rule and NOT a league ranking. Code does not conflate the two. v1 reality before this ruling: only 3 of 6
were live (MVP/Ace/Albatross); FF projected-only, Captain assigned-but-no-badge, Fan Hopeful unbuilt, Cornerstone
cut-but-lingering.

**JK RULINGS (2026-06-17) — the full v1 team-designation set is SIX per team, ALL in v1 (LSD-6: the living season
is v1, so "lights up with the Phase-2 morale layer" = later in v1, not deferred out of v1). Selection is always
INTRA-TEAM. Designation EFFECTS (fame/morale/fan-happiness) stay DORMANT until the Phase-2 morale/fame layer.**

1. **Team MVP** — LIVE (unchanged). Highest total WAR on team; games floor max(5, 20%). Intra-team.
2. **Ace** — LIVE (unchanged). Highest pWAR among team pitchers; appearances floor max(4, 20%); pWAR ≥ 0.5.
3. **Albatross** — LIVE, **spec guards RESTORED into the live path**: most-negative Value-Delta on team **AND**
   salary ≥ 2× league minimum ("can't blame the cheap guy") **AND** materially overpaid (~≥25%) **AND** value-trusted
   (≥2-peer); games floor 10%. **Can be null.** The 2×-salary + materiality gates currently exist only in the ORPHAN
   `fanFavoriteEngine.ts` and must be ported into the live `franchiseDesignations.ts` path. −1 fame DORMANT.
4. **Fan Favorite** — **PROMOTED to LIVE**: highest POSITIVE Value-Delta on team, **NO salary floor** (deliberate
   asymmetry vs Albatross — JK ruling: the underpaid overperformer, e.g. Brock Purdy, is the *best* fan-favorite
   story, so a floor would exclude exactly the players fans love); value-trusted (≥2-peer); games floor 10%. Add to
   `ACTIVE_PROMOTION_TYPES` + `LIVE_DESIGNATION_BADGES` + de-gate eligibility for SELECTION/BADGE (drop the
   morale-block on the badge; +2 fame/morale effect stays DORMANT until Phase-2).
5. **Captain** — **LIVE BADGE**: highest combined (Loyalty + Charisma), **NO minimum** (every team gets one) —
   remove L1.5's `charisma ≥ 70` gate (a stale-spec import; canonical §17.6 says no minimum); tiebreak more seasons
   on team, then current-season WAR. **Clear the reveal-safety block** (the badge shows the ROLE, not the numeric
   hidden modifier). Reconcile the split brain: Captain currently lives only as `team.captainPlayerId`
   (`franchiseInitializer.ts`) and is NOT in the designation engine union → the build must surface it as a badge
   (either fold CAPTAIN into the designation surface, or render directly from `team.captainPlayerId` on the team hub).
   Charisma-double-morale effect DORMANT until Phase-2.
6. **Fan Hopeful** — **BUILD it (visible-safe)**: each team's Fan Hopeful = a RANDOM pick from its top-3 farm
   prospects ranked by **SCOUTED grade** (never hidden true ratings — clears the old hidden-farm-truth block);
   assigned at season start, one per team, badge live; +5 morale boost DORMANT until Phase-2.

**Cornerstone** — **fully CUT** (LSD-3): remove the blocked policy-matrix entry + the blocked-truth UI row + stale
stubs (do not leave dead entries).

**Cross-cutting rulings:**
- **≥2-peer trust filter KEPT** on the value-delta designations (Albatross + Fan Favorite) as a candidacy filter —
  don't brand a player on an unreliable TV number; accept the rare null (≥2 peers is near-always satisfied in a full
  stock-MLB league). It is a reliability gate, NOT a league ranking.
- **Albatross 15% trade discount → DORMANT/DEFERRED** (NOT "fixed to 15%"). JK: with all trades MANUAL and no AI
  trade valuation in v1, the discount modifier has no live consumer; revisit if/when a trade-valuation surface
  exists. (The 30% in `FAN_FAVORITE_SYSTEM_SPEC` is superseded regardless; the canonical value is 15% when it
  reactivates.)
- **Spec hygiene:** reconcile DYNAMIC_DESIGNATIONS_SPEC / PERSONALITY_SYSTEM_SPEC / FAN_FAVORITE_SYSTEM_SPEC to the
  canonical MODE_2_V1_FINAL §17 (Captain = Loyalty+Charisma, no minimum; Team MVP is INTRA-TEAM not "league-wide" —
  the league-wide WAR-MVP is the separate D9 AWARDS system; Albatross discount deferred; Cornerstone removed). After
  porting Albatross's salary/materiality gates into the live path, the orphan `fanFavoriteEngine.ts` should be
  deleted (single source of truth) unless a reason to keep surfaces at build time.

**Sequencing (JK ruling D):** **D10 (league-awards season summary) ships FIRST** — unblocked, self-contained, and
the league awards (MVP/Cy Young/etc. via `franchiseAwardsEngine`) are a SEPARATE system from team designations.
Then a dedicated **team-designations build ticket ("DESIG-RECON build")** does items 3–6 + Cornerstone removal +
spec reconciliation + the **year-end team-designation DISPLAY on the TEAM HUB** (placement ruling D: team hub, a
compact per-team designation strip — NOT inline with league awards, NOT a separate team-by-team season-summary page).
D10 still includes the manifest **active-designations canonical-source fix** (read `franchiseDesignationRows`, not the
stale embedded `player.franchiseDesignations`) so the handoff-manifest COUNT is accurate; the user-facing designation
DISPLAY is the team-hub ticket.

**Status:** DESIG-RECON RULED. No product code this turn. Affected spec docs to be reconciled to canonical §17 as part
of the DESIG-RECON build ticket (DECISIONS_LOG is the authority until then). Next action: **draft + dispatch the D10
build** (league awards inline via AwardsWatchlist + manifest canonical-source fix + page copy + pass5 test update),
then the DESIG-RECON build ticket.

---

### 2026-06-17: DESIG-RECON build split + fork rulings (attended; build map `wf_9ea0e360-d00`)

D10 shipped (`51e487a`); the DESIG-RECON build was mapped (4 readers) and split into **4 tickets**:
- **DR-1** (engine logic, no forks) — Albatross spec-guards ported INLINE (2× salary floor via injected
  `salaryCalculator.MIN_SALARY`; 25% materiality `valueDelta/contractValue ≤ -0.25`) into BOTH selection +
  eligibility; Fan Favorite promoted to live (ACTIVE_PROMOTION_TYPES + LIVE_DESIGNATION_BADGES + eligibility de-gate,
  NO salary floor, +≥2-peer trust); Cornerstone fully removed (+4 stale stubs, NOT the FAME `FRANCHISE_CORNERSTONE`
  in teamMVP/legacyDynastyTracker); delete the orphan `fanFavoriteEngine.ts`. Effects stay dormant (firewall flags
  false). DISPATCHED to Codex.
- **DR-2** (assignment logic) — remove Captain's `charisma ≥ 70` gate (`franchiseInitializer`, canonical §17.6 =
  no minimum); build Fan Hopeful season-start assignment (random top-3 by SCOUTED grade, visible-safe).
- **DR-3** (display) — the compact six-designation strip on the team hub. Depends on DR-1/DR-2.
- **DR-4** (docs) — reconcile DYNAMIC_DESIGNATIONS_SPEC / PERSONALITY_SYSTEM_SPEC / FAN_FAVORITE_SYSTEM_SPEC to
  MODE_2_V1_FINAL §17.

**Fork rulings (JK, attended 2026-06-17):**
- **Team-hub strip placement = under the 'team' tab**, below the "Currently viewing: <team>" card (the at-a-glance
  team-identity row; leaves the analytic 'roster' panels untouched).
- **Fan Hopeful persistence = a `team.fanHopefulPlayerId` field** on the Team record (mirrors `captainPlayerId`;
  simplest, naturally one-per-team; single-season v1, overwritten each season like Captain) — NOT a new store.
- **Captain wiring = render directly from `team.captainPlayerId`** with a UI-only badge (option a) — Captain is
  personality-based/assigned-at-init, so it does NOT fold into the WAR-ranked designation engine (1 file vs ~6).
- **Year-end semantics = always-visible strip** with a "projected mid-season / final" caption — true season-end
  locking is an unbuilt later slice; gating on it now would render an empty/cosmetic "final."

---

### 2026-06-17: SOUL-LAYER "BUILD TO SPEC" GREENLIGHT (JK, attended) — the L-stack opens

**Context**: D11 closed the autonomously-buildable D-stack (D1–D11 done; D12 manual smoke + D13 checkpoint are JK
gates). JK was asked the next arc and **greenlit the soul layer (the Phase-2 L-stack)**.

**Ruling — JK (2026-06-17):** GREENLIT. Build the Phase-2 soul-layer engines (L3 morale matrix → L5/L6 fan-teeth/fame
→ L7 designation effects → L8/L9b development → L10–L14) **to the ratified living-season spec** (`FRANCHISE_V1_
LIVING_SEASON_SPEC.md` §5–§24 + the L-stack sequence in `FRANCHISE_V1_LIVING_SEASON_DSTACK.md`), with **sim-tunable
placeholder magnitudes** and **documented conservative defaults where the spec is silent**. This satisfies the
standing "SOUL-LAYER BUILD TO SPEC GREENLIGHT" pending-JK item.

**Constraints (unchanged, from the L-stack rules):**
- **Build DARK, activate strictly after D13** (§E parallelism rule): Phase-2 foundations build behind a Phase-2 flag;
  NO live morale/relationship consumer rides alongside D7 (the §5 "no phantom morale" invariant + the D12 smoke gate).
- Per-ticket: Codex builds → Opus audits (auditor ≠ builder) → JK browser sign-off batched. Every store-creating
  ticket carries the C-4 backup DoD (register byte-mirrored + version pin + KBL_BACKUP_VERSION bump + all-DB
  parity-guard + syncConfig + round-trip test).
- The LSD-1..5 forks stay ruled; LSD-6 (the living season IS v1) governs; safety walls hold (L-ECON1 stays
  watched/oracle-adjacent per OD-2; L9a is live-game-path).

**Starting point:** the critical path is `{L1✓, L1.5✓, L4a✓, L2, L9a, L-ECON1} → L3 → {L5,L6} → …`. **L3 (Master
Morale Matrix)** is the spine, depends only on L1 (done), and is the first soul-layer build. Mapping L3 now; structural
decisions (matrix representation, ledger store shape, the event taxonomy/default-neutral taps) surface to JK before the
build contract.

**L3 STRUCTURAL RULINGS (JK, attended 2026-06-17; map `wf_04a84b30-ef5`, 4 readers):**
- **Matrix engine = a FRESH clean engine that IS the one table** (`NEW src/engines/masterMoraleMatrix.ts`): an
  event-keyed base table + a pure composer function (personality×4-modifier multipliers → player+fan morale deltas +
  cross-effects). It subsumes the fan event taxonomy but leaves the reporter's word-generation OUT (firewall: math
  only) — NOT a literal widen of the 1,366-line narrative-laden `fanMoraleEngine`. Magnitudes = a single SIM-TUNED
  `MORALE_TUNING` config (Sim Gate owns the numbers). §8 dampener is L5's, not L3's.
- **Morale store = REUSE the existing `franchiseMoraleState` (`kbl-franchise-morale`)** — it already models player +
  fan + per-change history. Add a new non-confirmation `sourceKind` ('matrix-auto') + an automatic+logged apply path
  (the LS-9 reversal), idempotent dedupe kept. NOT a second store (avoids the two-sources-of-truth hazard §5 warns of).
  Verified the store is ALREADY in `backupRestore.ts:637` + `syncConfig.ts:108` (backed up + synced); the only gap is
  the parity-GUARD test covers only `kbl-tracker` — **L3 extends the parity guard to cover `kbl-franchise-morale`**
  (closes the C-4 deficit for this DB). Likely no DB version bump (new sourceKind is a value, not a schema change).
- **Defaults (consensus, conservative): one ledger discriminated by player/fan (reuse the existing model); a typed
  default-neutral tap interface** (fame/designation/race/relationship return neutral until their owners land);
  **subscribe to the D7 `DesignationEvent` stream** at the current void-ignore site (`processCompletedGame.ts:303`);
  **build DARK behind a Phase-2 flag** (compute + dark-ledger only; NO live morale mutation/consumer until after D13 —
  the §5 no-phantom-morale invariant); **firewall** (engine imports no reporter/LLM); reconcile the non-canonical
  personality names (playerMorale.ts GRUMPY/FIERY/SPIRITED → the canonical 7).
- **UI cleanup (JK ask, tracked): remove the endless confirmation gates from the Team Hub roster tab** and replace
  with the morale log/history view. This is the USER-VISIBLE half of LS-9; it **pairs with L3 ACTIVATION (post-D13)**
  because auto+logged delivery replaces the gates (removing them before the replacement is live would strand the
  current morale path). A standalone earlier UX ticket is possible if JK wants gate relief sooner.
- **L3 SPLIT: L3a** = the pure matrix engine (math; testable; no store/wiring/narrative) → **L3b** = reuse+un-gate the
  store + D7 subscription (dark) + build-dark flag + parity-guard extension.

**L3 COMPLETE** (L3a `5b1431d` + L3b `d46a071`, 2026-06-17). **L3 ACTIVATION FOLLOW-UP (tracked):** the roster-tab
confirmation-gate UI removal + the morale fame/race/relationship tap fills pair with post-D13 activation.

---

### 2026-06-17: L6 (Fame) plan + defaults (attended; map `wf_d44466a5-632`, greenlight covers it — no new fork)

Next soul-layer ticket after L3 (JK "keep rolling"). §20 is LOCKED design; the L6 map (3 readers) found STRONG
consensus and NO genuine design fork (every choice resolves to §20 + the established build-dark/pure-then-wire
patterns), so proceeding under the soul-layer greenlight with documented conservative defaults:
- **Split L6a (pure engine) / L6b (store + dark wiring)** — mirrors L3a/L3b + ivEngine (pure→audited→wired).
- **L6a (pure, no IO):** the canonical §20.7 **nine-tier ladder** (ONE type + threshold table — Immortal Legend >
  Global Superstar > National Icon > Regional Star > Local Hero · Unknown · Polarizing > Notorious > Despised —
  collapsing the 3 debt ladders) + the pure **Heat** (recency exponential decay) / **Reach** (integer floor that
  ratchets up, never erodes in-season; trade resets it + pulls Heat toward Unknown) / **tier = Heat floored at Reach**
  + the **WAR-legitimacy-floor gravity** (pulls Heat toward a WAR-justified level; not a direct contributor) + the
  **fame-vs-merit** (snub/bust/darling) classifier + the **fame-by-attribution-channel breakdown** (defensive-fame
  sub-aggregate for Gold Glove §23.2 + role-player fame for the bench award — an explicit L6 deliverable per the
  DSTACK). All magnitudes (decay rate, WAR-floor gravity, tier thresholds, channel weights) in a SIM-TUNED
  `FAME_TUNING` config (§20.9 owns the numbers).
- **RETAIN (reuse, not extend, §20.8):** `FAME_VALUES` iconic-event catalog + `calculateFame`/`getLIMultiplier`/
  `getPlayoffMultiplier` (the √LI bump scoring) + `kblWpaAttribution` (the layer-1 WPA spine) + POG. **DEBT (collapse,
  don't extend):** `getFameTier` (cumulative 9-tier), `FameLevel` (6-tier), reporter `FameTier` (5-tier),
  `eliminationRunFameStorage`, `applyChampionshipFame` flat +1.
- **L6b:** a NEW parity-guarded `franchiseFameRecords` store in **trackerDb v18→v19** (keyPath
  [franchiseId,seasonId,statsScopeId,playerId] + by_scope; the C-4 backup DoD + PIN-TRAP update + KBL_BACKUP_VERSION
  bump) — storing one decayed running Heat float + the integer Reach floor + wasNegative (+ the channel sub-aggregates);
  decay-on-write per game; the dark per-game compute wired into the post-game spine behind a Phase-2 fame flag (reuse
  the `franchisePhase2Flags` pattern). **Parallel-run:** the LIVE cumulative fame (`aggregateFameEvents`,
  `salaryCalculator` `player.fame` read, the GameTracker/`useFameTracking` display) is NOT disturbed — reconcile/retire
  post-D13. **The L3 `fame` morale tap stays DARK** (the §20.5/§20.6 fame→morale plug is a deferred post-D13
  integration; note the seam, don't fill).

---

### 2026-06-18: R1-b Base Rounder measurement rulings (attended; L9b trait-reality rebuild)

Building R1-b (the 6 ruled-gap traits per `TRAIT_MEASUREMENT_SPEC.md §0.9`), the Captain surfaced the two measurement
details §0.9's Base Rounder line left open (the soul-layer discipline: surface gaps, never infer). JK ruled:
- **Denominator — count thrown-out tries.** Every recorded advancement (safe OR out) is a "chance"; safely taking the
  extra base is the success. Most literal to §0.9 ("over the runner's advancement opportunities, from `runnerOutcomes`").
  A runner gunned down trying for extra counts as a non-success opportunity (lightly drags the rate); a held runner
  (`toBase:'end'`) is not a chance.
- **Scope — include batter stretches.** Base Rounder also credits the batter-runner for taking extra bases on their own
  batted ball (single→double, etc.), not only true baserunners already on base. The batter's forced minimum = the base
  the result entitles them to (1B→1st, 2B/GRD→2nd, 3B→3rd, HR/ITPHR→home, BB/IBB/HBP/E/FC/D3K/WP_K/PB_K→1st).
Folded into §0.9 verbatim. (The forced-minimum baseball model itself is mechanical — port `isRunnerForced`/
`getMinimumAdvancement` from `atBatLogic.ts` into the engine, not a JK fork.) Distractor + Big/Little Hack (Option B
percentile-merge) were already fully pinned by §0.9 — no rulings needed.

---

### 2026-06-18: R1-b2 scope + Bunter measurement rulings (attended; L9b trait-reality rebuild)

Grounding R1-b2 (Two Way / Utility / Crossed Up / Bunter), the Captain surfaced two genuine forks. JK ruled:
- **Two Way → its own ticket (NOT R1-b2).** §0.9 pins the SIGNAL (a pitcher's elite hitting = wOBA percentile vs the
  pitcher pool) cleanly, but Two Way also needs the "random C/IF/OF fielding position assigned AT GRANT" mechanic, which
  is NEW logic in the already-built L9b-3c grant/confirm writer — beyond the pure signal-builder. So Two Way spans
  builder + grant-path and is split out (R1-b3 / pairs with R3's grant/ratings work). **R1-b2 = Utility + Crossed Up +
  Bunter** (3 clean pure-builder traits).
- **Bunter = volume/frequency, not a success rate.** signalValue = successful sacrifice bunts (`result==='SAC'`) per PA
  (position batters), percentiled vs the position pool; failures don't drag it (numerator = SAC only). Side effect: this
  reads the standard `SAC` result, so Bunter is **no longer enrichment-gated/OPT-IN**. JK accepted "rewards frequency,
  not execution skill."
- **Captain FINDING flagged (non-blocking):** the rate-signal family inherits a `getPercentile`-on-mostly-zeros property
  — when a signal is sparse league-wide (no one logs it), every player's 0-rate maps to a HIGH percentile (all peers ≤ 0),
  mass-inflating acquisitions. Acute for the sparsest signals (Bunter, Crossed Up). A §16 sim-tune / pooling-convention
  concern for the WHOLE family (R1-a + R1-b), not an R1-b2 fix; build-DARK + the sim gate contain it. Logged here for a
  future tuning ticket.
Distractor + Big/Little Hack (R1-b1) and the §0.9 derivations for Utility (fielding success-rate at non-primary
positions) + Crossed Up (PB/batters-faced) were already pinned — built to documented defaults.

---

### 2026-06-18: R2 scope + measurement rulings (attended; L9b trait-reality rebuild)

JK ruled "do ALL of R2 now" (count-family + First-Pitch pair + the 6 handedness splits; the handedness half builds DARK +
dormant until the handedness join is wired). Measurement rulings (folded into §0.10 verbatim):
- **Count-family** (BB Prone / Composed / Gets Ahead / Falls Behind): walks-allowed rate = (BB+IBB)/batters-faced;
  BB Prone/Falls Behind = rate (high), Composed/Gets Ahead = 1−rate (low). Personality tilt differentiates the pairs.
- **First Pitch Slayer / Prayer**: **HIT vs OUT** on logged first-pitch PAs (`pitchesInAtBat===1`). Slayer = hits/(hits+outs),
  Prayer = 1−Slayer. First-pitch HBP / reached-on-error excluded (neither hit nor out).
- **Handedness splits** (DORMANT until the handedness join is fed — thread `pitcherHandByPlayer` + `batterHandByPlayer`
  maps into the input, mirror Utility): **CON vs LHP/RHP** = 1−K/PA vs that-handed pitchers; **POW vs LHP/RHP** = ISO vs
  that-handed pitchers; **Specialist** = 1−BAA vs SAME-handed batters; **Reverse Splits** = 1−BAA vs OPPOSITE-handed.
  **JK CHOSE BAA over K-rate for the pitcher splits** ("better measure and doesn't get conflated with K Collector").
  Switch hitters excluded from same/opposite cohorts.
- **Structural note:** the handedness data is NOT currently persisted on AtBatEvent (`opposingHand` hardcoded `'R'`; the
  "L9a-3 join" was never wired). R2 threads optional handedness maps (deferred-wiring seam, like Utility's
  primaryPositionByPlayer) so the splits build now but stay dormant until a hook populates them.

---

### 2026-06-18: R1-b3 Two Way v1 scope ruling (attended; L9b trait-reality rebuild)

Grounding R1-b3 (Two Way) surfaced a real architectural tension: the earn-signal (a pitcher's batting wOBA percentile
vs the pitcher pool) requires all two-way pitchers to share ONE peer pool AND to re-evaluate stably each cycle — but
the trait data is a triplet (Two Way C/IF/OF). Per-variant candidate names would fragment the pool into ~⅓ sizes AND
make the just-built re-evaluate-to-drop see a held `Two Way (OF)` with no matching candidate → re-randomize/drop the
position every checkpoint. Honoring "random C/IF/OF at grant" properly needs "treat the 3 variants as one family"
plumbing across the scorer + acquisition — beyond the pure builder. JK ruled **"earn-signal now, defer C/IF/OF":**
- **R1-b3 builds the earn-signal only:** per PITCHER-role player, compute batting wOBA (`calculateWOBA`), emit ONE
  candidate under a single representative variant **`Two Way (C)`** (v1 label; all three variants share EGOTISTICAL +
  POSITIVE so the choice is cosmetic for earning), sampleSize = batting PA, percentiled vs the pitcher pool.
- **DEFERRED to a later ticket:** the random C/IF/OF defensive-position assignment + the family plumbing (shared pool +
  joint re-evaluation), to land with the post-D13 grant flow / roster wiring.
No acquisition or grant-path change in R1-b3 (Two Way (C) is already in POSITIVE_IMAGE_TRAITS + IMAGE_DRIVER_SETS).

---

### 2026-06-18: R3 Ace Exterminator ruling (attended; L9b trait-reality rebuild — the last earnable trait)

Grounding R3 showed it is NOT blocked: `smb4GradeEmulator.ts` already provides `SMB4_FULL_GRADE_SCALE` (incl. "A-") +
`SMB4_GRADE_TO_INDEX` for the "A− or better" threshold, and Ace Exterminator is already POSITION + POSITIVE +
COMPETITIVE/EGOTISTICAL in acquisition (no change). The builder half is cleanly buildable now via the established
deferred-map pattern; the grade-freshness external dependency bites only at the deferred hook, decoupled from the pure
builder. JK ruled the one measurement gap:
- **Ace Exterminator success = REACHED BASE (hit/walk/HBP) vs A−-or-better opposing pitchers.** Denominator = PAs vs
  A−+ pitchers; numerator = reached-base PAs. Same reach set as Distractor.
- **E1 plumbing:** thread an OPTIONAL `pitcherGradeByPlayer?: ReadonlyMap<string, Smb4Grade>` into the input (mirror the
  handedness maps); the grade-deriving/refreshing hook is the DEFERRED app-wide grade-freshness step → Ace Exterminator
  stays dormant until then. No acquisition or grant-path change. This is the LAST earnable v1 trait (→ 47/47).

---

### 2026-06-18: W1 — wire the dormant-trait input maps live-dark (attended; L9b post-rebuild)

With the 47/47 earnable trait set built, the handedness splits + Utility + Ace Exterminator are DORMANT — their optional
`SeasonTraitCandidateInput` maps (`pitcherHandByPlayer`/`batterHandByPlayer`/`primaryPositionByPlayer`/
`pitcherGradeByPlayer`) go unpopulated by the grant hook. Grounding (Explore map) confirmed the data is all on the
franchise `Player` record (`leagueBuilderStorage.ts`: `bats`, `throws`, `primaryPosition`, `velocity/junk/accuracy`) and
the hook (`franchiseTraitGrantCompute.ts` `resolveTraitGrantRoster`) already loads the full roster. JK ruled **"wire all
4 now"** — including the grade map, computed on-demand via the canonical pure `scoreSmb4Player` (the same function the
app-wide grade-freshness ticket would use, so no divergence; on-demand from current ratings is itself fresh). This
OVERRIDES the §0.4 grade-freshness DEFERRAL (the grade-freshness ticket may later add caching/unification). Everything
stays flag-gated (`isFranchisePhase2TraitsEnabled` default OFF) → build-DARK, zero live effect until post-D13. W1 =
extend `TraitGrantRosterEntry` with bats/throws/primaryPosition/grade, capture them in `resolveTraitGrantRoster`, and
build the 4 maps at the `computeSeasonTraitCandidates` call site.

---

### 2026-06-18: PRE-ACT-TRAITS — named pre-activation trait-seam gate (JK directive; attended)

JK elevated (post-FINDING-150 close) the risk that the ~9 newly-built traits behind dormant data seams could "ship dead
at activation." STATUS (verified, not asserted): **W1 (`6a934a9e`) already wired the DATA seams** — it populates all 4
optional `SeasonTraitCandidateInput` maps on the SOLE production path (`processCompletedGame` →
`persistDarkTraitGrantForCompletedGame` → `computeSeasonTraitCandidates`; grep-confirmed no second caller). So Utility
(`primaryPositionByPlayer`) + the 6 handedness splits (`pitcherHandByPlayer`/`batterHandByPlayer`) + Ace Exterminator
(`pitcherGradeByPlayer`) are wired (8 of 9). The `opposingHand='R'` hardcode does NOT block the handedness splits —
they read the THREADED maps, not `ctx.opposingHand` (which feeds only the matrix probe, whose traits are not
handedness-conditional). **Remaining pre-activation work (the named gate, so it doesn't slip):**
- **PRE-ACT-TRAITS-1:** Two Way (IF)/(OF) random-position-at-grant + the 3-variant "family" plumbing (builder currently
  emits one representative `Two Way (C)`). The one genuinely-still-deferred seam (= item B).
- **PRE-ACT-TRAITS-2:** END-TO-END activation verification — W1 is UNIT-verified only (its hook test stubs the seam; the
  builder tests use synthetic maps). Before the flag flips, verify on REAL franchise data that all 47 traits — especially
  the 9 newly-wired/sparse ones — produce sane candidates (browser/integration; pairs with the F-141 D0/flag-flip gate).
- **PRE-ACT-TRAITS-3 (standing note):** un-hardcode `opposingHand` in `reconstructAtBatContext` ONLY IF a
  matrix-handedness trait is ever added to the v1 set (not needed for the current 47).
This gate clears BEFORE the L9b flag-flip / D13 activation. JK directive: name it explicitly so it is not lost.

## 2026-06-19 (AUTH-4) — L12-Q10 fame double-ladder collapse: SCOPE ruling (defer live purge, constrain races)
**Context:** §20.8 (FRANCHISE_V1_LIVING_SEASON_SPEC.md:423-439) says all 3 fame classification schemes (6-tier geographic
`FameLevel`, 9-tier scalar `getFameTier()` in fameEngine.ts, 5-tier reporter `FameTier`) collapse to the single §20.7
canonical Heat/Reach ladder (`resolveFameTier`/`heatToFameTier`: IMMORTAL_LEGEND..DESPISED); thresholds are TBD/sim-tuned
("do NOT import existing code's thresholds"). The legacy scalar `getFameTier(totalFame)` (forbidden labels "Fan
Favorite":359 / "Villain":363) is still LIVE in the UI (`fameIntegration.ts:556` PlayerFameSummary.tier +
`useFameTracking` re-export). The canonical Heat/Reach model is build-DARK (only flashpoint/processCompletedGame
flag-gated paths) — its live per-player heat/reachFloor data does NOT exist until the post-D13 fame activation.
**The fork the Captain surfaced (rather than auto-build a protected SMB4 asset on the live path — the
no-inference/soul-layer-verbatim rule holds under AUTH-4):** §20.8 describes the post-activation TARGET but does not
resolve the pre-activation scope — (a) defer the live label-purge to post-D13 activation + only constrain the build-DARK
L12 race code to read `resolveFameTier`; (b) narrow-relabel the live scalar ladder now (user-visible, browser-verify,
semantic mismatch); (c) other.
**JK RULING (a):** DEFER the live `getFameTier` label-purge to the post-D13 fame-activation ticket (when the live UI
migrates to the Heat/Reach model anyway). L12-Q10 has NO standalone build now. Its only HARD requirement folds into the
L12 build: **every L12 race / fame-tier read MUST go through `resolveFameTier`, NEVER the scalar `getFameTier`.** Add the
live-`getFameTier` label-purge to the post-D13 activation checklist (alongside the L9b/L10/L11 flag-flips).
**Rationale:** lowest risk; no risky live-display change on a protected asset before the data model is live; satisfies the
"races read the canonical ladder before any race goes live" requirement directly in the L12 build; no browser-verify
needed now.
