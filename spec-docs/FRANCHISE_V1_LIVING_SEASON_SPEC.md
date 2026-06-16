# FRANCHISE V1 — THE LIVING SEASON SPEC

**Status:** WORKING DRAFT — design-locked decisions from the 2026-06-15 living-season design session. Open sections (relationships mechanic, fame, All-Star voting, awards consolidation) are explicitly marked TO BE DESIGNED. No number here is build-ready until it clears the Simulation Gate (§16).
**Created:** 2026-06-15
**Author:** Captain (Opus 4.8), from the JK living-season design session.
**Scope:** Franchise Mode v1 — the in-season "soul" layer (morale, development, narrative, designations, managers, fan dynamics) sitting on top of the completed value / stats / GameTracker spine.
**Consolidate-and-amend:** engine-specific items fold back into their home specs (FAN_MORALE, DYNAMIC_DESIGNATIONS, NARRATIVE, PERSONALITY, IV) on finalization. This doc is the cross-cutting source of truth for what the living season *is*.

> This doc exists because these decisions were made in chat, and chat is ephemeral. It is the single source of truth for the living-season design, pending the open sections (§17) and the simulation gate (§16).

---

## 0. THE STANDARD (the bar every feature must clear)

Everything in franchise mode — fan morale, player morale, relationships, roster movement, ratings/trait changes, performance — must feed the **baseball-and-narrative ecosystem.** Nothing may feel pointless to the user. This is the acceptance test for every feature: if it does not loop back into the on-field reality or the story, it does not go in v1. (JK ruling, 2026-06-15.)

---

## 1. v1 SCOPE — ONE COMPLETE SEASON

- **v1 = one complete season, draft → champion.** A single longer season (e.g., 81 games) is the *whole saga*: players move up and down between clubs, hot/cold streaks, traits and ratings genuinely transform, managers get fired, All-Star drama, awards — all culminating in a champion.
- **The offseason is explicitly POST-v1.** It is the heaviest, riskiest unbuilt piece (carryover, aging, re-draft, state transitions). We ship a launchable, playable, bug-shaken single season *first*, then build the offseason as the bridge to Season 2 once the core loop is proven.
- The arc *is* the content: a player legitimately developing from a B- to an A over the season is the point, not a bug (see §9 on earned-and-paced development).

---

## 2. THE CORE LOOP (the keystone)

Every system below is one connected loop. Each link already has a home in an existing spec; the remaining work is connecting them and tuning magnitudes.

```
reporter take (personality-colored, sometimes unreliable)
  -> player morale moves (filtered through HIS personality)
  -> morale tilts on-field effectiveness (mojo + random-event nudges)
  -> performance shifts True Value -> designation flips (Albatross <-> Fan Favorite)
  -> designations + results move fan morale
  -> fan + player morale force the GM's hand (trade / send-down / call up the Fan Hopeful)
  -> reporter narrates the consequence -> loop
```

The **engine of divergence** — why two players in the same spot have opposite seasons — is the hidden personality layer plus the reporter's unreliability. You cannot fully game it because you cannot fully see it.

**Magnitude rule:** narrative is *secondary* in any single beat (stats are primary), but it **compounds** across a season — small nudges stack into full arcs. Never one dominant lever; felt by August.

---

## 3. TRUE VALUE & THE FROZEN ANCHORS

**True Value = on-field production measured against the player's FIXED draft-IV baseline, all season.** (JK ratified 2026-06-15.)

- The bar does **NOT** re-baseline as a player develops. It stays fixed at draft-IV for the whole season. This is what makes the development/regression story *legible* — every player is measured by the distance traveled from the promise he was drafted on.
- **Profile changes (ratings, traits) never touch True Value directly.** They change how a player *performs*; performance is what moves TV. Development raises the *ceiling* (capability); performance is what gets *banked*. A checkpoint rating bump makes a player capable of more — he still has to go do it; it never retroactively credits his value.
- This kills the loophole: if losing ratings or gaining a bad trait *raised* TV, you would reward a player for getting worse. The only honest way out of a slump is to play out of it. Keeping an underperformer is therefore a real risk, not a screen you wait out.

**Three distinct frozen-or-not states (write explicitly — never conflate):**
1. **Base value oracle** — the locked reference the value system is calibrated against (frozen for its own reasons, pre-existing).
2. **Contract (salary)** — frozen at the draft. What the player is *paid*.
3. **Draft-IV baseline** — frozen at the draft. The expectation his production is measured against.
4. **Realized production -> True Value** — *floats* live, game by game.

**Fan Favorite / Albatross = the gap** between the fixed contract and the floating True Value. Freezing the contract while TV breathes is what *powers* the value-delta arcs.

---

## 4. DESIGNATIONS (continuous, in-season)

Designations are continuous, automatic, in-season labels — "the market talking." They start as dotted "projected" badges and lock at season's end. **Distinct from Awards** (discrete season-end honors — §17.4).

**The seven:**

| Designation | Basis | Notes |
|---|---|---|
| Team MVP | Highest WAR on team | Becomes a Cornerstone the next season |
| Ace | Highest pWAR (>= 0.5 floor) | Pitcher equivalent |
| Fan Favorite | Highest positive value delta (TV - contract) | Overperformer vs pay; carries over briefly |
| Albatross | Most negative value delta | Overpaid underperformer; carries over briefly |
| Cornerstone | Last season's Team MVP | Permanent while on team; accumulates |
| Team Captain | Highest Loyalty + Charisma (Charisma >= 70) | A morale *router*, not a development modifier |
| Fan Hopeful | A called-up prospect | A countable timed cushion |

- The five value/identity-gated designations (Fan Favorite, Albatross, Cornerstone, Captain, Fan Hopeful) were *blocked on trusted value inputs* — now unblocked by the completed value spine. Promoting them to live is the work.
- **Naming reconciliation:** the fan-morale code's "Scapegoat" = the canonical "Albatross." Align to Albatross.

**Team Captain — a non-double-counting morale router.** The Captain is already the highest Loyalty+Charisma player, so it must NOT also stack more Loyalty/Charisma development effects (that would double-count). Its distinct jobs: his Charisma counts **double toward teammate morale** while he holds the badge, and morale swings tied to **his** performance are amplified team-wide. He *concentrates and amplifies the clubhouse channel*; he does not develop differently.
- **Trigger point:** the Captain is assigned at the **end of the Mode 1 draft / league finalization** — the roster must exist first. Every team enters franchise setup with its Captain already set. This is a Mode 1 -> franchise handoff requirement, not a franchise-internal step.

**Fan Hopeful — a fully-countable timed cushion.** Attaches on a *call-up* (a discrete logged event); lasts a *defined* window (a set number of games, or until the next checkpoint); grants a *fixed* fan-morale lift (hope sells tickets) and a *fixed* early-slump morale cushion (fans extend patience while the kid finds his feet); *expires* on a measurable trigger. The expiry is the story ("his honeymoon's ending — can he hold the job now?"). Numbers tuned by the Simulation Gate.

---

## 5. THE MASTER MORALE MATRIX

- **ONE authoritative event-consequence matrix.** Every event, crossed against personality type and the four hidden modifiers, with player morale and fan morale as inputs, outputs the morale and development consequences. One lookup per event, every game.
- **Not three matrices (player / fan / interaction) — one.** Separate tables fragment the truth and breed reconciliation bugs (the interaction table can quietly disagree with the other two). One table where each event row spells out *all* its consequences (this player's morale, the team's fan morale, who else is touched, the personality/designation multipliers).
- **It cannot hallucinate, because every outcome is looked up, never invented.** This is the core reason for the single-matrix design and the thing that makes the engine trustworthy to run every game over a season.
- **The matrix is the math (deterministic — *what* happens); the reporter is the words (generated — *how* it is told).** The language model never decides an outcome; it only narrates one the matrix already decided. This single rule kills both the hallucination risk and the slop risk: the reporter always has something true and specific to say because the matrix hands it the facts.
- It extends the event table the FAN_MORALE spec already has; we widen that one table to cover player morale, cross-effects, and relationship-lite edges.

**Morale delivery: automatic and logged, NEVER confirmation-gated.** (JK ratified 2026-06-15 — this reverses the current confirmation-gated build.)
- Morale updates apply silently and automatically; a visible **log/history** shows the user exactly *what* changed, *why*, and *how much*.
- Gating morale makes it feel mechanical and breaks the "witnessing" feel; over 100+ games, a confirm-per-change turns a feature people should love into a chore.
- The **log is the ledger** (facts: what/why/how much); the **reporter is the color commentary** on top of it. Same events, two registers. The designations spec already computes per-event reasons and narrative strings, so the log content largely exists — we change the *delivery*, not the content.

---

## 6. THE FOUR HIDDEN MODIFIERS (each load-bearing, no overlap)

| Modifier | Job | Effect |
|---|---|---|
| **Loyalty** | Team-shield | Amplifies the fan-morale ratings dampener (§8) — team success protects him most |
| **Ambition** | Upside gas pedal | More likely to convert a hot stretch into earned positive traits / positive ratings bumps; low ambition plateaus |
| **Resilience** | Downside shock absorber | Resists *losing* traits and eating negative ratings hits in a slump; recovers faster; low resilience cracks |
| **Charisma** | Clubhouse / relationship engine | Lifts *teammates'* morale, mentors young players' development; does NOT move his own ratings (avoids the Captain double-count) |

- **Ambition governs up-moves, Resilience governs down-moves** — clean division, no double-count.
- The §8 dampener is modulated by **Resilience on the negative side and Ambition on the positive side**: a resilient player on a winning team is doubly protected from a slump-driven drop; an ambitious player on a winning team is doubly likely to break out.

---

## 7. PERSONALITY TYPES (7)

COMPETITIVE, RELAXED, DROOPY, JOLLY, TOUGH, TIMID, EGOTISTICAL (per PERSONALITY_SYSTEM_SPEC — 7 visible types + the 4 hidden modifiers above). The visible type is shown to the user; it colors narrative tone and sets the dampener multiplier (§8) and the morale-response multipliers.

---

## 8. THE FAN-MORALE RATINGS DAMPENER (the team-performance reward/penalty)

Fan morale acts as a **directional dampener** on ratings adjustments — the single biggest season-long reward/penalty for *team* performance, which is ultimately what it is all about.

- **High team fan morale softens counter-trend NEGATIVE swings** (a winning team's fans insulate its players from big rating drops).
- **Low team fan morale softens counter-trend POSITIVE swings** (a losing team's low morale suppresses big rating gains).
- It only ever softens the move that runs *against* how the team is playing. **A brake, never an accelerator** — which is why it cannot create a runaway / rich-get-richer loop.

**Dampener strength = (team fan morale, directional) x (personality-type multiplier) x (Resilience for down-moves / Ambition for up-moves).**

**Personality multiplier matrix** — how much team success shields a player from a counter-trend swing (STARTING values, tuned by the Simulation Gate):

| Personality | Multiplier | Read |
|---|---|---|
| High Loyalty | ~1.4x | Team success protects him most; rides the team's energy |
| Jolly / Relaxed | ~1.15x | Easygoing; takes the team's cues |
| Tough / Competitive | ~1.0x | Steady; reacts to reality without team-mood coloring |
| Timid | ~0.85x | Anxious / internal; team success comforts him less |
| Egotistical | ~0.5x | It is about *him*; team success barely shields him, and a bad personal stretch tanks him even on a winner |
| Droopy | ~0.7x | Reduced and asymmetric — quick to feel the negative, slow to feel any team-driven lift |

A loyal grinder on a hot team is nearly bulletproof through a cold patch; an egotist on that same team still craters if *he* is slumping. Two knobs to tune live: the base dampener strength (how much fan morale softens a swing at the extremes), and whether the multipliers are this spread or tighter — the *shape* is locked, the values are sim-tuned.

---

## 9. TRAITS vs RATINGS — THE SEPARATION

**The rule: team performance touches RATINGS, never TRAITS.**

- **Ratings = the TEAM story.** Slow, heavy, league-shaping. **Checkpoint cadence: every 20% of the season's games.** Get the team-level fan-morale dampener (§8). Batching keeps the league coherent and creates discrete "the league just shifted" moments.
- **Traits = the INDIVIDUAL story.** *His* clutch, *his* slump, *his* leadership. **Continuous** (move in near-real-time, so an earned trait shows up *now*, while the streak is happening). Answer ONLY to: measured reality (the signal) + personality + morale. **NOT team performance** (tying traits to the team would muddy the individual narrative — "he earned Clutch because his *teammates* won?" reads false).

**Development magnitude — earned and paced, NOT limited.** A B- *can* become an A within a season *if* sustained performance justifies it (that is the saga). The Simulation Gate (§16) checks that changes are **earned and paced** (an A-leap needs sustained A-performance, not a lucky week) and that the league keeps a believable spread — NOT that changes are small.

**Two-trait cap.** A player holds at most two traits at a time.
- Each qualifying trait carries a **strength score** (how hard the underlying reality is — crushing in the clutch scores higher on Clutch than barely clearing the bar).
- When a player qualifies for more than two, the **two highest-strength win**; the rest sit "knocking on the door."
- **Displacement drama:** a newly-surging trait can bump an older, fading one out of the two slots — a story the reporter tells ("his bat speed earned a new label, and the old one is slipping away").
- **Gain/loss buffer:** a trait must *clear* a threshold to be gained and fall below a *lower* one to be lost. Prevents flickering on/off at the line. Stable enough to feel real, fluid enough to feel alive.

**Traits-from-reality (the game-changer feature).** Map each SMB4 trait to measurable signals in the GameTracker enrichment logs (e.g., Clutch <- high-leverage performance; RBI Hero <- driving in runs with men on; Tough Out <- long at-bats / low strikeouts; pitching traits <- K-rate / durability). Trigger an add/subtract when recent reality crosses the threshold (still probabilistic — not a guaranteed switch). This makes trait changes *earned*, not random, and creates scarcity: take advantage of positive traits or risk losing them; play your way out of negative ones.
- **Buildability is pending verification** (§18): confirm exactly which enrichment fields actually persist. Three-bucket triage — (a) maps cleanly to existing data, (b) needs a creative proxy signal, (c) cannot be measured without a new input -> JK rules add-the-input or cut-the-trait.

---

## 10. THE RANDOM-EVENTS SYSTEM

Reactivates the previously-deferred "Chaos / d20" concept, but **smarter** — weighted by personality and morale, reporter-surfaced, under light-chaos guardrails: **nothing season-wrecking, no catastrophic outcomes, no user-tunable magnitude dial.**

- **The reframe:** shift from flat-equal-odds-random-for-its-own-sake to **weighted by who the player is (personality) + how his season is going (morale)** -> earned and meaningful, not arbitrary. Many changes are *earned* (the traits-from-reality system, §9); a small slice stays *genuinely* random (cosmetic + wildcard flavor). This solves the "fun but overused" problem via rarity + meaning + clustering.

**The event menu (approved in principle; mark final selections during build):**
- *Performance swings:* temp hot streak (+N for X games), temp slump (-N), permanent breakout (+N), permanent regression (-N), clutch-gene temp boost, defensive yips (temp).
- *Pitching:* add a pitch (perm), lose feel for a pitch (temp), velocity bump/dip, new arm angle.
- *Traits:* earn a positive (from streak/milestone — earned), pick up a negative (slump / bad press), lose one.
- *Position / role:* gain a secondary position, change primary, become a utility piece.
- *Identity / cosmetic (SMB4 flavor, sparingly):* facial hair, accessory (cool or silly), batting stance / windup / arm angle, walk-up, number, name change (rare / opt-in).
- *Personality shift:* rare, career-defining, earned through a major arc — not a roll.
- *Team-level (fan-morale-driven):* manager fired (crisis), front-office mandate (win-now / rebuild), stadium change, promo / giveaway night, rivalry flares.
- *Roster / relationship-lite:* trade demand (low loyalty + low morale), veteran mentorship (boosts a rookie), clubhouse rift (two players, morale drag).
- *Wildcard:* a reporter-driven surprise.

**Cadence — measured in GAMES, not weeks** (there is no MLB calendar; just game slots). E.g., "every 8 games" for a 42-game season. Two systems run on different game-intervals: **traits checked frequently** (live), **ratings every 20% of total games** (the batched shift). At each ratings checkpoint the engine sweeps the whole league, rolls everything, and outputs a per-team change log the user works through on the console.

**Probability decides WHO — no headcount setting.** Every MLB-level rostered player is a candidate each checkpoint; performance + personality + morale decide who actually shifts. The number of changes emerges from how the league is actually playing, which makes the inputs matter more.

**Intensity dial: Juiced / Standard / Nerfed** (reusing the pool-tier vocabulary). Scales the *base rate* (volume), never a fixed count. Nerfed = rare, Standard = occasional, Juiced = lively Game-of-Life energy — never season-wrecking at any setting. Global intensity x individual likelihood.

**Morale weighting on changes:**
- **Player morale = a strong weight.** High morale -> more likely to gain positives / shrug off negatives; low morale -> inverse. Individual and self-correcting (a slumping star loses morale, becomes less likely to keep his positive traits — the arc working as intended).
- **Fan morale -> NOT a direct development weight.** It touches development *only* via the §8 directional dampener (a brake). This is the deliberate guard against rich-get-richer. Fan morale's real teeth live on the circumstance side (§13).

---

## 11. THE TWO-TIER CONFIRMATION MODEL

- **Morale changes: silent, automatic, logged. NO confirmation.** (§5.)
- **Ratings / trait changes: REQUIRE user confirmation.** They must land in *two* places: the user's **SMB4 console** (the user's edit) AND the **app's database** (so value / designation / morale math stays in sync going forward). On confirm, the app writes the change to its records automatically; the user makes the matching console edit.
- **Database adoption is mandatory:** if the app's database does not adopt an engine-logic change, the app drifts out of sync with what is actually in the SMB4 game. So a ratings/trait event mutates the player's *franchise record*, which then flows through the whole loop (value -> designation -> player/fan morale -> reporter). A reality-driven change ripples through everything downstream.
- **These changes hit the player's FRANCHISE INSTANCE** — a *mutable layer on top of* the frozen base ratings — not the frozen value oracle. The oracle stays locked (the value system needs it); franchise players genuinely evolve. **Permanent** change = a persisted layer; **temporary** change = a time-boxed overlay the app auto-expires on its end (and reminds the user to revert on the console).

---

## 12. MANAGERS

- Managers are **named, tracked entities in the Almanac** (already true in other modes — franchise mostly needs to point at the existing machinery, and manager-WPA / decision data already lives in the engine). Tracked: WPA, record, tenure. A firing is a real **legacy** consequence — managers are like players in that their performance is recorded over time, so firing one *ends a recorded legacy*.
- **Manager firings are IN v1** (with a real consequence, per The Standard).
- **Firing consequence:**
  - *Fan morale:* a relief bump when a struggling team fires its manager (the scapegoat discharge — "the fans got their guy").
  - *Player effect = individual performance x personality.* The performance gate: a player who has been *net-negative on True Value* has reason to worry under a new regime (his job is less safe); a net-positive performer is untouchable. Personality on top: a **loyal** player takes a morale hit (he was attached to the manager), a **resilient** one shrugs it off, a producing **egotist** barely notices.
- A firing is a **pressure-release valve** the GM can spend when fan morale craters — breathing room at the cost of disruption (some players tighten under a new voice, some are relieved). No obvious outcome: it reads the room player by player.

---

## 13. FAN MORALE — THE TEETH

Fan morale is **not cosmetic.** It earns weight through real, balance-safe teeth. **Principle: fan morale changes a team's CIRCUMSTANCES freely, but touches the DEVELOPMENT math in only one bounded way — the §8 dampener.** Circumstances self-correct (or actively restore parity); uncapped development compounds.

**The four core teeth:**
1. **Directional ratings dampener** (§8).
2. **Decay on ignored flashpoints.** A turned-on player (a locked Albatross, a trade-demander) who stays *bleeds* fan morale slowly every game — not a cliff, a compounding tax. Ignoring it is not free, and because fan morale now has real downstream teeth (the dampener flips against you, FA gravity sours, the budget tightens, the rebrand trigger gets closer), letting it rot has consequences felt on the field and in the checkbook. Converts "trade to appease" into a genuine GM decision: eat the dead money and move him, or hold and pay in slow-rotting morale.
3. **Indirect through player morale.** Team fan morale pushes on each player's morale, *scaled by personality* (an egotist feeds on a loud happy crowd and is poisoned by a hostile one; a relaxed player barely notices; a loyal player aches when his fans are miserable) -> which feeds his trait/rating odds. Safe (individual, self-correcting). The FAN_MORALE spec already has the skeleton of this (egotistical ~1.5x, relaxed ~0.5x); we make it a first-class, personality-scaled link in the matrix.
4. **The rebrand circuit-breaker** (§14).

**Supporting teeth:** free-agent gravity (high-morale franchises attract, hostile ones repel — self-correcting under the cap); the **GM hot seat** (sustained low fan morale = a stated mandate, "make the playoffs or else"; pure pressure, zero balance risk); reporter intensity (low morale = the press turns up the heat). **Optional / capped:** budget pressure (fan morale nudges next season's spending room — real runaway risk, so hard-capped + mean-reverting if used; tune last, after the league is proven).

**Free-agency / trade inversions (sharper than the obvious version):**
- **Loyal players are MORE likely to leave when fans are angry** — their bond was to the *fans and city*; when that turns toxic, the thing they were loyal to is gone, so they are *more* likely to walk than a mercenary who never cared. A hostile fanbase costs you exactly the players you would most want to keep.
- **Angry fans -> more trade requests** (scaled by personality + morale; low-loyalty / low-morale players bolt first). A fan-morale collapse does not just sit there — it actively *destabilizes the roster* and forces action.

---

## 14. THE REBRAND CIRCUIT-BREAKER

The floor that turns total failure into a fresh start — and the cleanest way to give fan morale teeth without unbalancing the league. It is the *escape hatch* for the whole loop: a team cannot rot into oblivion; hitting bottom *transforms* you rather than destroying you.

- **Trigger:** sustained bottomed-out fan morale (threshold / duration tuned by the Simulation Gate).
- **RESETS on relocation:** fan morale -> ~70 (a fresh, excited fanbase); **all badges except Captain** (everything else is tied to the old team/fanbase; Captain travels with the *player's* leadership); **manager auto-fired** ("new regime wants their own guy" — just the existing firing event, triggered automatically; the rebrand cascades cleanly: relocation -> firing -> its morale ripple -> fresh fanbase); **stadium changes**; **dead money cleared** (the financial half of the fresh start — a relocated team is almost certainly in last place and *needs* to churn its roster; the dead-money tax is the very thing that would otherwise prevent the rebuild).
- **PERSISTS (because it is mid-season):** player stats, team record, player development to date. (Wiping these mid-season would feel like a save-wipe; the rebrand is a fresh start with *earned progress intact*.)
- **History:** **one continuous franchise history with a relocation marker** (do NOT split into eras — less work, and the better story: "the franchise formerly known as the X, who relocated and became the Y").
- **Stadium dual-path:** relocation changes the stadium AND stadium can change independently via the random-events table at a *low* rate that is *suppressed by high fan morale.*
- **Exploit watch:** "tank to wipe dead money" is a *painful* escape hatch, not a free one (you must bottom out fan morale for a sustained stretch, lose the team's identity / stadium / badges, and spend a chunk of season in the cellar — nobody tanks a season they are enjoying just to clear cap space). The Simulation Gate watches for deliberate-bottoming abuse; recommendation is a full wipe unless the sim shows a problem. The rebrand is meant to incentivize *not* tanking (you lose your branding and stadium), while still giving a genuinely failed franchise a floor.

---

## 15. RELATIONSHIPS-LITE

**Principle (locked):** shallow edges — a mentorship, a friendship, a rivalry — that exist only to **feed reporter angles and nudge morale.** No dramatized storylines, no soap opera. Sports-drama warmth plus real feud / trade stakes; romance, if any, is a morale modifier and a reporter aside, never a plot. **Charisma is the engine** (high-charisma players form the edges and mentor young players). This fits the "Game of Life" feel — probabilistic life-event beats with narrative color — and the engine must keep track of the edges so nothing is improvised.

**The MECHANIC is now LOCKED — see §24** (six threshold-gated edge types, sourced from personality + race envy, Captain-governed, reporter-surfaced with ~10% unreliability).

---

## 16. THE SIMULATION GATE (hard acceptance criterion)

We cannot playtest a season by hand, so **the master matrix and every tuned number must be proven by simulation before we trust them.** The matrix is not "done" when written — it is done when the sim shows healthy behavior. This is the NFL principle applied to a design surface: assume the numbers are wrong until the simulation proves otherwise.

**What the simulation must prove:**
- **Earned, paced drift:** a typical player's profile moves *meaningfully* over a season, large moves are *justified by sustained performance* (a B- -> A leap requires sustained A-performance, not a lucky week), and the league ends with a *believable spread* (not everyone converging to stars or scrubs).
- **Holds across season length:** short (e.g., 32g), medium, and long (e.g., 81-162g) seasons each produce alive-but-not-runaway change. (Cadence is in games, so it should scale — but prove it; a 32-game season must not feel dead, a 162-game one must not run away.)
- **League balance over time:** the dampener and parity mechanics actually prevent a rich-get-richer spiral across multiple seasons; variance does not compound into permanent haves and have-nots.
- **No exploding edge cases:** e.g., a low-resilience, low-morale player on a tanking team has a floor, not an oblivion spiral.
- **No relocation abuse:** users are not deliberately bottoming out to wipe dead money.

The numbers gated here: dampener strength, the personality multipliers, the Fan Hopeful window / lift / cushion, rebrand thresholds, event base rates, trait strength thresholds and gain/loss buffers. **A season-simulator and accumulated-state test scaffolding already exist in the project** — so "pressure-test the matrix across short / medium / long seasons" is a runnable plan, not a hope. **Passing the simulation is a hard gate.**

---

## 17. OPEN SECTIONS — TO BE DESIGNED

Each got a dedicated design pass; **all are now LOCKED** — Fame (§20), the Race system (§21), All-Star (§22), Awards (§23), Relationships (§24). The stubs below are retained as pointers.

**17.1 Fame — LOCKED (designed this session).** Full design moved to **§20**. In brief: a recency-weighted WPA spine + a WAR legitimacy floor + the iconic-event catalog + a status/celebrity layer, on a nine-tier ladder, feeding player morale and fan morale. Existing fame code carries significant tech debt and is treated as debt to reconcile *to* §20 — not a foundation to extend (see §20.8).

**17.2 All-Star — LOCKED.** Full design in **§22** (and the shared Race system, §21). v1 = voting + team selections, no game played; starters fame-led, reserves merit-led; a nod raises the player's fame reach floor.

**17.3 Relationships-lite — LOCKED.** Full mechanic in **§24** (principle in §15). Six threshold-gated edge types, sourced from personality + race envy, surfaced fallibly by the reporter, governed by the Captain.

**17.4 Awards — LOCKED.** Full design in **§23** (and the shared Race system, §21). Season-long merit races + the TV-award family (Kara Kawaguchi / Bust / Comeback) + inverted negative races; fame-weighted and snub-capable; MOY on the Manager WPA truth-layer.

---

## 18. PENDING VERIFICATION READS (build dependencies)

Before the dependent pieces can be finalized or numbered, the Captain must read the code and confirm reality (no assertion — evidence over assertion):

1. **Reporter implementation end-to-end** — certify exactly what is built (per-team assignment in `reporterAssignment.ts` / `ReporterAssignmentPanel`, the LLM clients `grokClient.ts` / `claudeClient.ts`, the accuracy/inaccuracy model in `narrativeEngine.ts`, `PostGameColumns`, persistence) and settle the reporter's *cadence*. The soul anchor. **NOTE:** a large reporter system already exists and is wired into Exhibition / Elimination — this is largely a certify-and-connect job, not a from-scratch build.
2. **Trait-to-signal mapping** — read the SMB4 trait list and verify exactly which enrichment fields the GameTracker logs persist; draft the trait->signal map with strength scoring (the three-bucket triage of §9). Where a trait cannot be reconciled to existing inputs, JK decides add-the-input, connect-creatively, or cut.
3. **Draft / salary / farm economics** — read the salary, draft, farm, and Mode 1 specs; lock how the 22-man and farm-prospect salaries relate; then produce the **tier-adjusted, relative-to-pool rookie-scale** table (top slots anchored to the *top of the available pool given that draft's tier*, NOT an absolute star value — so a nerfed pool gets lower top-slot prices; scarcity preserved, no structural overpay, "is this pick worth the price?" stays a live decision). **Tradeable farm-slot execution** (extend the existing pick-value chart + trade validator to the farm round, plus build actual pick-trade execution) and the **user-controlled per-draft grade distribution** (independent Juiced/Standard/Nerfed control for farm-prospect generation, separate from the 22-man pool tier — enabling e.g. nerfed 22-man + juiced farm for a prospect/rebuild season) land here.

---

## 19. DECISION LOG (this session — anti-re-litigation)

| # | Decision |
|---|---|
| LS-1 | v1 = one complete season (draft -> champion); offseason is post-v1 |
| LS-2 | Every feature must feed the baseball-and-narrative ecosystem; nothing pointless in v1 (The Standard) |
| LS-3 | True Value = on-field production vs the FIXED draft-IV baseline, all season; bar does not re-baseline |
| LS-4 | Contract and draft-IV baseline frozen at draft; realized production floats to TV; profile changes never touch TV directly |
| LS-5 | Seven designations; the five value/identity-gated ones go live now the value spine exists; "Scapegoat" -> "Albatross" |
| LS-6 | Captain assigned at end of Mode 1 draft; it is a morale router (charisma x2 to teammates + amplifies swings on his performance), not a development modifier |
| LS-7 | Fan Hopeful = a countable timed cushion (fixed window/lift/cushion) that expires |
| LS-8 | ONE master morale matrix (deterministic, looked-up); the reporter narrates, never decides |
| LS-9 | Morale changes are automatic + logged, NEVER confirmation-gated |
| LS-10 | Four hidden modifiers: Loyalty=team-shield, Ambition=upside gas pedal, Resilience=downside shock absorber, Charisma=clubhouse (not own development) |
| LS-11 | Fan morale = a directional dampener on ratings (brake, not accelerator); strength = fan morale x personality multiplier x Ambition/Resilience |
| LS-12 | Team performance touches RATINGS, never TRAITS; ratings on a 20%-of-games checkpoint, traits continuous |
| LS-13 | Development magnitude can be large (B- -> A) if earned and paced; sim proves "earned," not "small" |
| LS-14 | Two-trait cap by strength score, with a gain/loss buffer; displacement drama |
| LS-15 | Traits-from-reality: map SMB4 traits to enrichment-log signals; earned not random (buildability pending read) |
| LS-16 | Random events reactivated as morale/personality-weighted, reporter-surfaced, light-chaos; cadence in games; probability decides who; Juiced/Standard/Nerfed scales the rate |
| LS-17 | Two-tier confirmation: morale auto/no-confirm; ratings/trait changes confirmed (console + DB); changes hit the franchise instance, not the oracle |
| LS-18 | Managers are tracked Almanac legacies; firings in v1 with fan-relief bump + (performance x personality) player ripple |
| LS-19 | Fan morale changes circumstances freely, development only via the one dampener; decay on ignored flashpoints; loyal players flee + more trade requests when fans angry |
| LS-20 | Rebrand circuit-breaker: trigger on sustained bottom; reset fan morale ~70 + all badges but Captain + auto-fire manager + change stadium + wipe dead money; persist stats/record/development; one continuous history |
| LS-21 | Relationships-lite principle locked (edges feed reporter + morale, no soap opera); mechanic TBD |
| LS-22 | Simulation gate is a hard acceptance criterion for the matrix and all tuned numbers |
| LS-23 | Fame fully designed this session — see §20 (FAME, LOCKED) and its FAME-1..14 decision log |
| LS-24 | Race system (§21): All-Star + Awards are one season-long Race primitive (WAR + fame), with a Visibility-vs-Emission overcounting valve — see RACE-1..5 |
| LS-25 | All-Star (§22): voting/selections only in v1; starters fame-led / reserves merit-led; a nod raises the fame reach floor — see ASG-1..3 |
| LS-26 | Awards (§23): season-long merit races (MVP=total WAR, GG=fWAR+def-fame), the TV-award family (KK/Bust/Comeback), MOY on Manager WPA truth-layer, no rating rewards — see AWARD-1..8 |
| LS-27 | Relationships (§24): six threshold-gated edge types, potential-vs-active, reporter pre-move intel, Captain four-modifier effectiveness, charged matchups — see REL-1..9 |

---

## 20. FAME (LOCKED — designed this session)

**Status / discipline note.** This section is the *target* fame design for franchise v1, ratified this session. It SUPERSEDES the §17.1 stub. FAME carries significant pre-existing tech debt (§20.8); this design is the single source of truth the build migrates *toward*, and existing fame code is treated as debt to reconcile, **not** a foundation to extend. **Anything not stated in this section was not approved this session — do not import behavior, thresholds, or magnitudes from the existing fame implementation without explicit ratification.**

### 20.0 The standard (why fame exists)

Fame is a living organism in the ecosystem: it is *driven by* performance and circumstance, and it *drives* player morale, fan morale, reporter coverage, All-Star voting, and awards. It must be extremely dynamic, reflect the uniqueness of each player, capture the fickleness of celebrity, and be un-gameable. Superstars, busts, unexpected All-Stars, award-winners, and snubs must emerge **organically**, never scripted.

### 20.1 The four-layer architecture

A player's fame is one running quantity, produced by four layers:

1. **Spine — recency-weighted net clutch (WPA).** The fickle heartbeat. Driven by Win Probability Added: leverage-weighted (a 9th-inning swing matters far more than a blowout swing), real-time (every meaningful play nudges it), and **net** (WPA can be negative — this is the villain side). Recency-weighted, so recent clutch matters more than old clutch — this is the fickleness.
2. **Floor — legitimacy (WAR).** A slow-moving gravity that pulls fame toward what a player is *actually* worth (raw value vs peers). Prevents pure-clutch flukes from being the whole story and slowly accrues a floor for the quietly excellent. **WAR is a legitimacy floor only — not a direct fame contributor.**
3. **Bumps — the iconic-event catalog (existing machinery, retained).** Discrete fame/infamy for feats and disasters famous *regardless* of leverage (perfect game, cycle, no-hitter; meltdown, sombrero) plus SMB4 flavor (nut shots, killed pitchers). Retained as-built; whether to curate which events fire in v1 is an OPEN tuning question (§20.9).
4. **Status — the celebrity/circumstance layer.** Off-field notability: draft seed, trades, call-ups, send-downs, starter-vs-bench role, league-leader rank, designation nudges (§20.4).

**Why WPA is the spine but not a monopoly:** WPA is the master signal because it is leverage-weighted, real-time, net, and un-gameable — and it already drives POG (Player of the Game = highest WPA) and the reporter's "top moments." But it cannot see (a) iconic feats famous regardless of leverage, (b) off-field celebrity status, or (c) legitimacy. Those are the other three layers.

### 20.2 The fame-vs-merit engine (why snubs and busts emerge)

Fame (WPA-driven, what people *feel*) plotted against merit (WAR, what's *real*) produces four archetypes with no scripting:

| | High merit (WAR) | Low merit (WAR) |
|---|---|---|
| **High fame** | Deserved Superstar | Darling / overrated (clutch flukes — makes the All-Star team) |
| **Low fame** | The Snub (quietly great, no moments) | Bust / Villain (if WPA net-negative) |

The **gap** between the two signals is the snub engine, the bust engine, and the overrated-darling engine. This is why fame needs both WPA and WAR, not one.

### 20.3 Heat vs Reach (the two quantities fame separates into)

Fame is recency-weighted (fickle) AND sticky (you don't get un-known). The tension resolves by recognizing fame is two quantities:

- **Heat** — *how they feel about you right now.* Recency-weighted, fickle, swings with recent WPA + events. Drives movement and trajectory.
- **Reach** — *how far your name has spread / that you've made an impression.* **Ratchets** — climbs and sticks; only a trade resets it.

**Unknown is an entry/reset-only state, not a resting tier.** A player is "Unknown" only if the game genuinely has no impression of them — a fresh rookie, or someone just traded into a new market. Rules:

- On the **first crossing out of the Unknown band**, a **reach floor** sets: a positive crossing floors the player at **Local Hero**, a negative crossing floors at **Polarizing**. You cannot un-make an impression.
- **Above the floor, Heat moves freely.** A cold superstar cools (Global Superstar -> National Icon) but cannot crater back to Unknown.
- **Recovering from the negative side skips Unknown** (Despised -> Notorious -> Polarizing -> jumps to Local Hero on crossing into positive). The reporter receives a `was-negative` flag for the redemption-story angle (math in the matrix, words in the reporter).
- **The trade is the only reset valve:** a trade **drops the reach floor and pulls Heat toward Unknown** — a traded star keeps *some* Heat ("reputation precedes him," not nuked) but loses the *earned floor*, so a flop in the new city can now fade to obscurity. This is the "rebuild your fame with a new fanbase" feeling, made mechanical.
- **In-season, the reach floor does not erode.** One season isn't long enough to be forgotten. Slow erosion ("the league forgets an aging star") is a post-v1 / multi-season concern.

**Storage:** two small fields on the fame record — a recency-weighted **Heat** score and a ratcheting **Reach floor** (plus a `was-negative` boolean for the reporter). The displayed tier floors Heat at Reach. (Confirmed: existing code derives tier from a pure cumulative total with no floor and no recency — both behaviors are NEW here; see §20.8.)

### 20.4 The status / celebrity layer (directions — all sim-tuned starting values)

| Event | Effect on fame | Notes |
|---|---|---|
| **Draft seed** | Sets the *starting* tier — high pick = higher, scaling down to Unknown for late picks | Parallels the draft-IV value baseline: the draft seeds both value-expectation and fame-expectation. From game one, recency-weighted WPA takes over. |
| **Trade** | Drops the reach floor + pulls Heat toward Unknown | Always dilutes (never raises) in v1; every trade is "starting over with a new fanbase." Headliner-trade-raises-fame deferred to v2. |
| **Call-up** | Small positive (~+0.5) | The player's fame; separate from the Fan Hopeful designation's fan-morale lift. |
| **Send-down** | Negative, stings *more* than a call-up cheers (~-1 to -1.5) | A demotion is more memorable than a promotion. |
| **Starter vs bench (role)** | Accrual *multiplier* (bench ~0.5x on fame gains) | You can't become an Immortal Legend riding the pine — stardom needs playing time. Uses effectivePosition. |
| **League-leader rank** | Per-checkpoint fame to the top of marquee leaderboards, scaled by rank (1st > 2nd > 3rd) | The "great relative to peers" idea as leaderboard fame; another surface where WAR-vs-peers shows. |
| **Designations** | One-time fame nudge on naming (Fan Favorite +2, Albatross -1 already wired) | Extend to other designations (Captain, Ace, MVP, Cornerstone) as fame nudges — magnitudes TBD/sim. |

All magnitudes above are **starting guesses to be settled by the Simulation Gate.**

### 20.5 Fame -> player morale (via the personality matrix)

Fame is an **input** to the master morale matrix (§5), scaled by the same personality + hidden-modifier multipliers used everywhere else. Both fame **level** and fame **change (direction)** are felt: a fading famous player takes a morale hit; an unknown on the rise gets a boost. Personality governs sensitivity — chronic low fame is a standing morale drag for an **Egotistical** player (he craves the spotlight) and a non-event for a **Relaxed** one, with **Ambition** multiplying the sensitivity. No new mechanism — fame plugs into the matrix as another event input.

### 20.6 Fame -> fan morale (amplifier + designation; three distinct channels, no double-count)

- **Channel A — Fame amplifies & colors per-play swings.** A player's per-event impact on fan morale = base swing × **fame** (volume) × **designation-tilt** (lean). Fame is the volume knob (an Immortal Legend's heroics thrill the crowd; a Despised player's gaffe enrages it); the designation makes the amplifier **asymmetric** toward the fan relationship (a Fan Favorite's *ups* hit harder; an Albatross's *downs* hit harder).
- **Channel B — Designation adds a steady per-game sentiment** (Fan Favorite = ongoing warmth; Albatross = ongoing irritation, compounding via the decay-on-ignored-flashpoint, §13).
- **Channel C — Designation -> fame is a one-time seed** (the +2/-1 naming nudge, §20.4).

Magnitude from fame, steady lean + direction from designation, one-time bump from naming — the three channels stay distinct so they compose without compounding.

### 20.7 The nine-tier ladder

> **Immortal Legend -> Global Superstar -> National Icon -> Regional Star -> Local Hero · Unknown · Polarizing -> Notorious -> Despised**

Nine tiers. **Unknown** is the neutral pivot (the blank-slate entry/reset state, §20.3). The **positive** side is *geographic reach* — renown spreads horizontally (Local Hero up to Global Superstar), capped by **Immortal Legend** (transcendent, known across generations, not just geography). The **negative** side is *notoriety* — infamy sinks vertically (Polarizing -> Notorious -> Despised, the floor). Loved players are measured by reach; hated players by depth.

Tier **thresholds are TBD and sim-tuned** — do NOT import the existing code's thresholds (they belong to the deprecated ladders, §20.8).

### 20.8 Tech-debt reconciliation (what this replaces — do not extend blindly)

FAME has significant existing debt. The build reconciles *to* §20, treating the following as debt to migrate:

- **Three conflicting classification schemes exist in code** — a 6-tier geographic `FameLevel` type, a 9-tier symmetric `getFameTier()` in `fameEngine.ts`, and a 5-tier reporter `FameTier` (Elimination-scoped). **All collapse to the single §20.7 ladder.** (The §20.7 ladder is geographic-positive + notoriety-negative — closest to the `FameLevel` intent, extended with the negative side and the Immortal Legend apex.)
- **The current model is pure-cumulative** (`totalFame` keeps summing; tier is a pure function of it) — it has **neither** the recency-weighting (Heat) **nor** the reach floor this design requires. Both are new.
- **Fame is currently Elimination-run-scoped** (`RunFameStanding`, `eliminationRunFameStorage`, the accept/dismiss promotion UI). Franchise needs the §20 model wired into the season loop. The Elimination promotion UI is a reference, not an assumed adoption.
- **Naming collisions purged:** the existing ladders use "Fan Favorite" and "Captain" as fame-tier labels, which collide with designations. The §20.7 ladder uses neither — those names belong to designations only.
- **Retained as-built (reused, not rebuilt):** the iconic-event catalog (`FAME_VALUES`) as the §20.1 "bumps" layer, the WPA attribution engine (`kblWpaAttribution.ts`), and POG (highest-WPA). Pending the verification reads (§18) before wiring.

### 20.9 Open fame items (for the Simulation Gate / later passes)

- All magnitudes in §20.4 and all tier thresholds in §20.7 — starting guesses, settled by sim.
- Whether to **curate** which catalog events fire in v1 (all ~150, or a subset).
- The **decay rate** of Heat and the **WAR-floor gravity** strength — the two numbers that set "how fickle vs how sticky."
- Fame **display** (card borders / pips / leaderboard) — adopt or rebuild from the Elimination components, TBD.
- Designation -> fame nudge magnitudes beyond the wired Fan Favorite / Albatross.

### Fame Decision Log (this session)

| # | Decision |
|---|---|
| FAME-1 | Fame is recency-weighted, NOT cumulative (a fast decaying Heat layer, not a running total) |
| FAME-2 | Four-layer architecture: recency-weighted WPA spine + WAR legitimacy floor + iconic-event catalog (bumps) + status/celebrity layer |
| FAME-3 | WPA is the spine (leverage-weighted, real-time, net/negative, un-gameable) but not a monopoly; WAR is a legitimacy floor only, not a direct contributor |
| FAME-4 | The WPA(fame)-vs-WAR(merit) gap produces Superstar / Snub / Darling / Bust-Villain organically — snubs and busts are emergent, never scripted |
| FAME-5 | Fame = two quantities: Heat (recency, fickle) + Reach (ratchets, sticky); Unknown is an entry/reset-only state, not a resting tier |
| FAME-6 | First crossing out of Unknown sets a reach floor (positive->Local Hero, negative->Polarizing); above it Heat moves freely; recovery from negative skips Unknown (reporter gets a was-negative flag) |
| FAME-7 | Trade is the only reset: drops the reach floor + pulls Heat toward Unknown (star keeps some Heat, loses earned floor); every trade dilutes, never raises (headliner-raises deferred v2) |
| FAME-8 | In-season the reach floor does not erode; slow erosion is post-v1 / multi-season |
| FAME-9 | Initial fame seeded by draft position (high pick higher, scaling down); parallels the draft-IV value baseline; WPA takes over from game one |
| FAME-10 | Status layer directions (sim-tuned): call-up +, send-down - (stings more), bench role ~0.5x accrual multiplier, league-leader rank + by rank, designation naming one-time nudge |
| FAME-11 | Fame -> player morale via the personality matrix (level AND direction; Egotist craves it, Ambition multiplies sensitivity) — fame is another matrix input |
| FAME-12 | Fame -> fan morale via three distinct channels: fame amplifies/colors per-play swings (volume), designation tilts the amplifier asymmetrically + adds steady sentiment (lean), naming is a one-time fame seed — no double-count |
| FAME-13 | Nine-tier ladder: Immortal Legend -> Global Superstar -> National Icon -> Regional Star -> Local Hero · Unknown · Polarizing -> Notorious -> Despised (positive = geographic reach + Immortal Legend apex; negative = notoriety; Unknown = neutral pivot) |
| FAME-14 | Existing fame is tech debt (three conflicting ladders, pure-cumulative, Elimination-scoped) — reconcile TO this design; retain only the event catalog, WPA engine, and POG; thresholds/magnitudes are NOT imported |

---

*(Sections §21–§24 below complete the open-section designs — added this session.)*

---

## 21. THE RACE SYSTEM (shared primitive — All-Star + Awards)

**Status / discipline note.** Target design, ratified this session. All-Star (§22) and Awards (§23) are two instances of this one primitive. Same discipline as §20: anything not stated was not approved; existing award/ceremony code (§23.9) is debt to reconcile, not a foundation to extend.

### 21.1 A Race is a season-long standing for an honor

Not an end-of-season popup — a continuously-updated standing with a **projected winner**, **contenders on the bubble**, and **the field**. Derived from the two signals already built: **WAR (merit)** and **fame (narrative, recency-weighted)**. It feeds the ecosystem the whole way, then pays out at resolution.

### 21.2 The shared loop (same shape as everything else)

```
standing updates each checkpoint (WAR + fame)
  -> player morale (projected winner = pride; deserving-but-behind = snub drag; losing a lead = a hit)
  -> fan morale (a contender-stacked team = civic pride; a hometown snub = fan anger, the useful kind)
  -> relationships (teammates compare standings -> envy / vicarious pride; see §24)
  -> reporter (the race narrative: "MVP race down to two," "how is he not starting?")
  -> resolves into: persistent fame boost + a designation/badge + a morale boost (+ a morale HIT for the snubbed)
```

### 21.3 Two kinds of snub, from the fame-vs-WAR gap, pointing opposite ways

- **Fan-vote honors (All-Star starters) are fame-led** (with a performance floor) -> the **popularity snub**: the quiet star (high WAR, low fame) loses the start to the Darling (low WAR, high fame).
- **Merit honors (awards) are WAR-led, fame a *secondary* tilt** -> the **narrative snub**: the analytics darling (highest WAR, modest fame) loses MVP to the famous favorite (a hair less WAR, far more fame).

Same gap, two injustices, deliberately asymmetric.

### 21.4 The fame guardrail (anti-rich-get-richer)

For merit awards, **fame is a TILT, not a driver — it can only flip a *close* race between two genuinely-great players.** Merit leads; fame breaks ties and writes the drama. Without this, famous players hoover up every trophy. (Fan-vote honors are the deliberate exception where fame *does* lead.)

### 21.5 Visibility vs Emission (the overcounting safety valve)

Two separate things:
- **Visibility (cheap):** the leaders table shows **every** race's standings, all the way down. Full almanac experience.
- **Emission (expensive):** only a **curated subset** of races actually pushes fame/morale during the season. The sim decides which races emit and how shallow the Top-N effects are.

This split is the guard against ~13 simultaneous races all spraying morale. Start marquee-only with shallow Top-N; let the sim pull it in.

### 21.6 Resolution payouts

A race resolves into: a **persistent fame boost** (sized to the honor — uses the §20.3 reach-ratchet to raise the permanent reach floor), the **selection/award badge** as a dynamic designation (the 16-emblem system already exists, §23), and a **morale boost** for the winner(s) + a **morale hit** for the deserving-but-snubbed. All magnitudes sim-tuned.

---

## 22. ALL-STAR (uses the Race system, §21)

### 22.1 Scope (v1)

**Voting + team selections only — no game is played in v1.** (Revisit post-launch.) The All-Star race is the one **mid-season** tentpole: it runs opening day -> the All-Star break, rosters **lock at the break**, and the fame/morale payouts apply and **persist through the season.**

### 22.2 Roster construction (maps onto the existing archived screen: by-position starters + reserves)

- **Starters = fan vote (fame-led, performance floor).** Produces the popularity snub.
- **Reserves = WAR / merit.** The reserve layer **rescues some** popularity snubs (a deserving guy who can't win the fan vote still earns a merit reserve nod), while roster limits mean some still miss.
- So each player's outcome is one of three rungs — **start / make it as a reserve / total snub** — each a different story.

### 22.3 Payout

An All-Star nod gives a **fame boost that raises the player's permanent reach floor** (§20.3) — "once an All-Star, always at least Regionally known." A permanent reach achievement, which is exactly what the ratchet is for. Plus the All-Star badge (designation) and a morale boost; snubs take a personality-scaled morale hit.

### 22.4 Envy feed (-> §24)

A jealous, ambitious teammate who isn't getting votes takes a morale hit when a teammate is in line to start. This is a **relationship edge being born from the race** (envy / rivalry) — see §24. The race is one of the two main *sources* of relationship edges.

---

## 23. AWARDS (uses the Race system, §21)

### 23.1 Award races run ALL SEASON

Unlike All-Star's mid-season cutoff — this is where the **ebbs and flows** live. Each award has a live standing off the relevant WAR flavor, tilted (secondarily) by fame, so a hot streak vaults a player up the board and a slump drops him, narrated all year by the reporter.

### 23.2 The merit races (WAR-led, fame as a close-race tilt)

- **MVP = TOTAL WAR (all facets: batting + pitching + fielding + baserunning)**, fame-tilted. NOT just bWAR — an elite defender, a baserunning demon, or a two-way player can win it.
- **Cy Young = pWAR.**
- **Rookie of the Year, Silver Slugger, Reliever of the Year** = merit races (WAR-led, fame-tilted).
- **Gold Glove = fWAR + a *defensive-fame* component** (NOT total fame — the "reputation glove" is real, but it must ride *defensive* reputation: web gems, robberies, the `fielder`-targeted fame channel — not general offensive celebrity). Defensive-fame share capped ~15-25%, sim-tuned.

### 23.3 The TV-award family (where True Value belongs — and ONLY here)

TV is expectation-relative; merit awards are absolute (best player, period, regardless of expectation), so **TV stays out of MVP / Cy Young / etc.** It powers its own three-award family, three distinct metrics:
- **Kara Kawaguchi = best value *level*** (TV-vs-contract, league-wide). It is the **league-wide version of the Fan Favorite designation** (Fan Favorite = best value on a team; KK = best value in the league) — a team's Fan Favorites are the KK contenders. Season-long race. Structurally favors the undervalued grower over the drafted star — *which is the point.*
- **Bust of the Year = worst value *level*** (inverted race — see §23.5).
- **Comeback Player = biggest in-season TV *swing*** (trough-to-recovery: a player's climb back from his **own season-low TV**, so only the bad-then-good guys score). Tailor-made for the early-Albatross-who-redeems-himself arc. Needs a small build addition: **snapshot TV over the season** so the trough is visible (TV itself already exists).

### 23.4 The Cinderella MVP is possible and earned

Awards are decided by **on-field WAR + recent-performance fame**, never by ratings or draft slot. A late-round pick who produces MVP-level WAR wins, full stop — pedigree is invisible to the award. Higher ratings shift the *base rates* (more likely to perform well) but never *gate* the award. And the fame tilt doesn't sneak pedigree back in: fame is recency-weighted, so by award time the draft hype has washed out and fame reflects who's been raking. The live development system makes the underdog path earned, not a fluke.

### 23.5 Negative awards = inverted bottom-3 races

Booger Glove (worst fielder), Bust of the Year: run as **bottom-3 races where the valence flips** — **falling into the bottom-3 hurts** (fame/morale), **climbing out gives a relief boost.** The redemption arc pays twice: an early Albatross clawing out of the Bust race feels the relief on the way up.

### 23.6 Bench award = the fame on-ramp for role players

Positive, **Top-3**, gives a fame/morale boost to a bench player — the **designed counterweight** to the §20.4 bench fame-suppression (0.5× accrual). It is the *one* channel where a role player earns real recognition, so the suppression isn't a dead end.

### 23.7 Manager of the Year (runs on the updated Manager WPA truth-layer)

MOY is a season-long race, but it feeds **manager legacy + the reporter**, NOT player morale (managers have no clubhouse morale). It runs on:
- the **updated Manager WPA truth-layer** (`managerWpaDerivation`, v2 WPA model) — each decision scored by its *actual* win-probability impact (not fixed values),
- **plus lineup delta** (`ManagerLineupDeltaSummary` — actual lineup vs optimal),
- **plus team record.**

The **deprecated fixed-value mWAR is retired** (`mwarCalculator` is `@deprecated` in-code: `decisionWAR×0.60 + overperformanceWAR×0.40` off fixed decision values + salary-based expectation). Three **build-time reconciliations** (gated by the §18 verification reads, not design forks): (a) **unit/denomination** — decision WPA is win-probability, lineup delta is rescaled-IV; they need a common scale before summing; (b) the **composite weighting** of decision-WPA + lineup-delta + record (the old 60/40 is a starting point, sim-tuned); (c) **drop the salary-based win expectation** (the same salary-weighting being removed from award voting, §23.9) for a cleaner roster-strength / projected-wins basis.

### 23.8 Season-end & out-of-scope

Platinum Glove and World Series MVP = season-end computations (no season-long race). **Hall of Fame is OUT for v1** (inherently multi-season).

### 23.9 Tech-debt reconciliation (do not extend blindly)

The full 16-emblem award system (`awardEmblems.ts`) is **retained** for badges. But:
- The ceremony (`AwardsCeremonyFlow`) currently lives in the **offseason** flow — for v1, **decouple a season-end ceremony** (the saga's capstone) without dragging in the rest of the offseason.
- The ceremony's vote percentages are **salary-weighted** (`calculateAwardWinnerVotePct`) — **swap to fame-weighting** (fame is the right narrative proxy; salary is not).
- The ceremony's **mechanical rewards** (Gold Glove -> +5 fielding; some awards -> lose a trait) are **removed**: development is now continuous and earned, so an award rating-reward double-counts the same excellence. Contract recalculation that captures growth is a **v2/offseason** job.
- The **deprecated mWAR** is retired in favor of the Manager WPA truth-layer (§23.7).

---

## 24. RELATIONSHIPS-LITE (the mechanic; principle in §15)

### 24.1 The standard

Shallow edges that feed reporter angles and nudge morale — sports-drama, never soap opera (§15). Edges form from **personality + performance**, gated by **thresholds** (most pairs have NO edge), feed **player morale -> development**, are surfaced (fallibly) by the reporter, drive roster decisions, and charge specific matchups. **Charisma is the engine.**

### 24.2 The fixed edge taxonomy (six types — a small fixed set is what keeps it "lite")

- **Rivalry** (mutual competitive tension) — from race **envy** (§21/§22) or a personality clash.
- **Feud / domineering** (asymmetric — an aggressor + a vulnerable target). Concrete trigger: an **egotistical + ambitious + low-loyalty** aggressor over a **droopy/timid + low-charisma** target. The **target eats the morale hit**; the aggressor is largely unaffected. Must clear a threshold to exist.
- **Mentorship** (asymmetric — a **high-Charisma vet** lifts a young player's development; the vet gets a smaller leadership/morale benefit).
- **Friendship** (mutual, compatible personalities).
- **Romance** (mutual; female players exist, so any pairing is possible — but **weighted**, §24.6). Kept light: a morale modifier + a reporter aside, never a plot.
- **History** (a *former* edge that persists after a player leaves — the seed of charged matchups, §24.7).

### 24.3 The threshold gate (the anti-spam heart of "lite")

An edge forms only when the personality/modifier product crosses a threshold — **and**, for some types, a trigger fires (a **race** for envy, extended **time together** for friendship, a **young player present** for mentorship). Most pairs never cross it. The sim tunes the threshold so each team carries roughly **1-3 live edges** — a handful of meaningful edges, each a story, not a web of twenty.

### 24.4 Potential vs Active (relationships move in all directions)

- **Potential** (latent compatibility/incompatibility) is computable for **any** pair from personalities — including a **farm prospect vs a 22-man player**, even though they've never been teammates.
- **Active** requires co-rostering (both on the 22-man).
- So the reporter surfaces **potential** edges as **roster-move intel**: "calling up this kid could clash with your Captain," "this prospect would thrive mentored by your vet," "your toxic veteran is the reason not to keep him when the rookie comes up." Edges move up from the farm, down on a send-down, across on a trade.

### 24.5 Reporter-mediated intel (the value-add UX, with built-in risk)

- **The pre-move heads-up:** at the moment a roster move (trade / call-up / send-down) is finalized, the reporter interjects if a notable edge — **active OR potential** — is involved ("Heads up before you pull the trigger — he feuds with your Captain. Still want to do this?"). It is a **pre-commit heads-up, NEVER a hard gate** — the GM decides.
- **Unreliability:** all relationship intel inherits the reporter's **~10% inaccuracy** — a reported feud may be overblown, a phantom romance, or a real rift the reporter missed. That is the value-add *and* the risk in one: trust the intel or not. Makes every roster move a judgment call, not a rubber stamp.

### 24.6 Romance weighting (anti-silliness guardrail)

**Cross-gender romance is the default.** Same-gender romance is **rarer for male pairs and somewhat more permitted for female pairs.** **Friendship base-rates sit well above romance base-rates** — the relationship mix is mostly mentorships and friendships, with romance as the occasional spice. All sim-tuned. (Consistent with the no-soap-opera rule.)

### 24.7 Charged matchups (the "revenge game")

When a player faces his **former team**, or faces a player he has a **History edge** with (former friend, mentor, mentee, rival, or ex), that game is flagged and **that game's morale swing is amplified**, scaled by personality (an egotist facing the team that dumped him is extra-charged; a loyal player facing a traded friend feels it more). The reporter pre-narrates it ("the reunion," "the revenge game," "facing his old mentor"). Discrete, buildable, high-flavor.

### 24.8 Edge lifecycle

Edges **form, intensify, and dissolve** — a feud cools, a mentee graduates, a friendship fades, and a **trade or send-down ends the edge** (they're no longer teammates). Roster makeup *creates* edges; roster moves *dissolve* them. This is what makes the loop pay off: **trade/demote the troublemaker -> the edge resolves -> the victim's morale recovers -> his performance recovers.**

### 24.9 Captain & Charisma as relationship governors

High-Charisma players — **especially the Captain** — **suppress negative edges** (a strong leader keeps the domineering guy in check) and **catalyze positive ones** (mentorship). The Captain is a **clubhouse stabilizer**, which creates a real strategic tension: keep an aging Captain for the locker-room glue even as his play declines? This reinforces his §4 "morale router" identity.
- **Captain effectiveness = a four-modifier composite:** **Charisma + Loyalty + Resilience**, tempered by **selflessness (low Ambition)**. (Selection uses Charisma + Loyalty — two modifiers; *effectiveness* uses all four, so it's not circular.) Resilience = a steady captain holds the room together through adversity; a me-first captain (high Ambition) is weaker glue. This is **distinct** from his morale-routing job (Charisma ×2 routes morale; the leadership score governs edge suppression/catalysis) — no double-count.
- **Absolute composite for v1**; a **league-relative curve** (the league's best leader maximally effective, the worst a liability) is a **sim-gated extension** if captains feel too samey.

### 24.10 Sources & fan-morale coupling

- Edges are sourced from two places: **personality compatibility** (structural — who's on the roster) and **race competition** (the envy hook from All-Star/awards, §21-22).
- **Relationships -> fan morale is LIGHT and reporter-mediated.** The primary path is the one already built: relationship -> player morale -> performance -> fan morale. On top, fans react to **visible** dramas the reporter amplifies (a feud visibly tanking the team frustrates them; a beloved mentorship or romance lifts them a little). The *direct* relationship->fan-morale effect is small and gated through the reporter, to avoid over-coupling.

---

## Decision Log — §21-24 (this session)

| # | Decision |
|---|---|
| RACE-1 | All-Star and Awards are two instances of ONE primitive — a season-long Race (standing + projected winner + bubble + field), derived from WAR (merit) + fame (narrative) |
| RACE-2 | A race feeds player morale, fan morale, relationships (envy), and the reporter continuously, then resolves into a persistent fame boost + a designation/badge + a morale boost (+ a morale hit for the snubbed) |
| RACE-3 | Two snubs from the fame-vs-WAR gap: fan-vote honors are fame-led (popularity snub); merit awards are WAR-led with a secondary fame tilt (narrative snub) |
| RACE-4 | Fame guardrail: for merit awards, fame is a TILT not a driver — it can only flip a close race between two genuinely-great players (anti-rich-get-richer); fan-vote honors are the deliberate fame-led exception |
| RACE-5 | Visibility vs Emission: the leaders table shows EVERY race; only a curated, sim-chosen subset emits in-season fame/morale effects (overcounting valve); start marquee-only, shallow Top-N |
| ASG-1 | All-Star v1 = voting + team selections only, no game played; mid-season tentpole, runs to the break, payouts persist through the season |
| ASG-2 | Starters = fan vote (fame-led, perf floor); reserves = WAR/merit (rescues some snubs); outcomes are start / reserve / total snub |
| ASG-3 | An All-Star nod raises the player's permanent fame reach floor (§20.3) + badge + morale boost; snubs take a personality-scaled morale hit; envy feeds relationships (§24) |
| AWARD-1 | Award races run all season (the ebbs and flows); standings off the relevant WAR flavor, fame-tilted (secondary) |
| AWARD-2 | MVP = TOTAL WAR (all facets), not bWAR; Cy Young = pWAR; Gold Glove = fWAR + a defensive-fame component (~15-25%, sim-tuned), not total/offensive fame |
| AWARD-3 | TV stays OUT of merit awards (those are absolute); TV powers its own family: Kara Kawaguchi (best value level = league-wide Fan Favorite), Bust (worst value level, inverted), Comeback (biggest in-season TV swing from own season-low; needs TV snapshotting) |
| AWARD-4 | Cinderella MVP is possible and earned: awards decided by on-field WAR + recency-weighted fame, never ratings/draft slot; ratings only shift base rates |
| AWARD-5 | Negative awards (Booger Glove, Bust) = inverted bottom-3 races (falling in hurts, climbing out = relief boost); Bench award = positive Top-3 fame on-ramp for role players (counterweight to bench fame suppression) |
| AWARD-6 | Award winners get fame + morale + badge ONLY — NO rating/trait rewards (development is now continuous; would double-count); contract recalc is v2/offseason |
| AWARD-7 | MOY runs on the updated Manager WPA truth-layer (decision WPA + lineup delta) + team record; deprecated fixed-value mWAR retired; feeds manager legacy + reporter, not player morale; 3 build-time reconciliations (denomination, composite weighting, drop salary-expectation) |
| AWARD-8 | Platinum Glove + WS MVP = season-end computations; Hall of Fame out for v1 (multi-season); ceremony decoupled from offseason to season-end; salary-weighted voting swapped for fame-weighting; ceremony mechanical rewards removed |
| REL-1 | Six-edge taxonomy: Rivalry, Feud/domineering, Mentorship, Friendship, Romance, History — a small fixed set keeps it "lite" |
| REL-2 | Threshold gate + triggers (race for envy, time for friendship, youth for mentorship); most pairs have no edge; sim tunes to ~1-3 live edges per team |
| REL-3 | Potential (any pair incl. farm vs 22-man, from personalities) vs Active (requires co-rostering); reporter surfaces potential edges as roster-move intel; relationships move in all directions |
| REL-4 | Pre-move reporter heads-up on trades/call-ups/send-downs if a notable edge (active or potential) is involved — a heads-up, never a hard gate; inherits ~10% reporter unreliability |
| REL-5 | Romance weighting: cross-gender default; same-gender rarer for male pairs, more permitted for female; friendship base-rates >> romance (mostly mentorships/friendships); sim-tuned |
| REL-6 | Charged matchups: facing a former team or a History-edge player amplifies that game's morale swing (personality-scaled); reporter pre-narrates |
| REL-7 | Edge lifecycle: form/intensify/dissolve; a trade or send-down ends an edge; enables trade-troublemaker -> victim recovers -> performance recovers |
| REL-8 | Captain & Charisma govern relationships (suppress negative, catalyze positive); Captain effectiveness = Charisma + Loyalty + Resilience − Ambition-weight (selection uses 2 modifiers, effectiveness uses 4; distinct from morale-routing); absolute for v1, league-relative as sim-gated extension |
| REL-9 | Relationships -> fan morale is light + reporter-mediated (primary path is via player morale -> performance); fans react to visible dramas only |

---

*End — WORKING DRAFT. All open-section designs are now LOCKED: Fame (§20), the Race system (§21), All-Star (§22), Awards (§23), Relationships (§24). Remaining path to build-ready: the Simulation Gate (§16) that tunes every number, and the §18 verification reads — reporter cadence, trait-to-signal mapping, draft/salary/farm economics, and the Manager WPA reconciliation for MOY.*
