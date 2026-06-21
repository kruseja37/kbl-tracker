
# MODE 1 — LEAGUE BUILD → DRAFT VISION & RATIFIED DECISIONS

**Status:** Vision spec + ratified design rulings — the source of truth for the
League-Build → Draft pipeline (Mode 1). Authored 2026-06-20 from JK ↔ Captain decisions.
The League-Build→Draft audit checks code against THIS doc; this doc persists regardless.

**Why this exists:** the launch-readiness audit (`MODE1_TO_MODE2_V1_LAUNCH_READINESS.md`)
covered the franchise-creation HANDOFF but did NOT map the draft PROCESS or the league-build
seam feeding it. JK's review surfaced that the draft's correctness DEPENDS on the
league-build flow (the locked pool + budget tiers feed IV; salaries freeze against IV;
stadiums must flow through). These decisions are durable — captured here so they aren't lost.

## 1. THE PIPELINE (one connected flow, not separate features)

**League Build → Lock → IV Computation → Draft → Freeze.**

1. **League Build.** User assembles a league by selecting:
   - **Team brandings** — number + which teams, pulled from League Builder teams, WITH their
     associated **stadiums and dimensions**. [OPEN: confirm stadiums/dimensions flow into Mode 2.]
   - **Player pool** — two modes (user's choice): (a) use the players already rostered on the
     selected branded teams, OR (b) hand-pick player-by-player from the player database.
2. **Lock.** Once teams + pool are set, the league is LOCKED — freezing the draft pool (who is
   available). [OPEN: confirm a "lock" step exists, explicit or implicit.]
3. **IV Computation.** The locked pool is analyzed — players × team **budget tiers** → each
   player's **True Value (IV)**. The economy anchor.
4. **Draft.** Teams (which start EMPTY) draft from the locked pool. AUCTION is the
   primary/default format for v1 (snake deferred — §2.G).
5. **Freeze (at draft's end).** BOTH numbers freeze when the draft finalizes:
   - **True Value (IV)** — the player's quality baseline; the economy's permanent anchor.
   - **Salary** — what the team ACTUALLY paid (auction may diverge from IV; snake equals IV).

## 2. RATIFIED DECISIONS (JK, 2026-06-20)

**A — Two-number freeze at draft's end.** True Value (IV) and Salary are DISTINCT frozen
numbers, both stamped when the draft finalizes. They MATCH in snake (no bidding) but DIVERGE
in auction (a player worth 80 IV can sell for 95 → IV=80, salary=95 — the divergence IS the
point of an auction). The launch audit found salary frozen but the IV baseline stamped
NOWHERE (gap G1). `valueDelta = TV − contract` already expects both numbers; only one is
currently stamped.

**B — Personality generation.** Generated players use ONLY the canonical 7 personality types,
paired with some combination of the 4 hidden modifiers (Loyalty/Ambition/Resilience/
Charisma). The current generator's `PERSONALITY_POOL` is non-canonical (only 3 of 7 match) →
the morale matrix silent-defaults on generated players. Fix: pin generators to the canonical 7.

**C — Name generation (HARD RULE + randomization — TWO distinct fixes).**
  1. **Source:** ALL generated names (players, prospects, managers, scouts, AND reporters)
     draw first names from the SMB4 "Possible First Names" pool and last names from the
     "Possible Last Names" pool — NEVER invented (console/announcer limit). Currently violated
     by reporters (invented 18-name array) and bridge/startup scouts (`Startup Farm Scout N`).
  2. **Distribution:** TRUE randomization — the same first/last names currently REPEAT (a
     distribution bug, separate from the source bug). Even from the right pool, selection
     clusters. Fix so names don't repeat over and over.

**G — Auction-only for v1; defer snake.** Auction is the PRIMARY, default draft format. Snake
→ v1.1. CAVEAT: auction is spec-only today (from-scratch build) — "auction-only v1" is
CONDITIONAL on auction being FULLY built and bug-free. The audit scopes whether that's
achievable. (Deferring snake discards only partial work; auction is the bigger lift, not the
smaller one — go in clear-eyed.)

**H — Player-instance architecture (resolved in principle).** There is ONE player definition.
The LEAGUE owns a SNAPSHOTTED POOL of player INSTANCES, frozen at lock time. League-specific
fields (IV, draft status, settled salary) attach to the INSTANCE; the base player definition
is unchanged everywhere. The launch audit's "multiple player shapes" is most likely
base-player vs league-instanced-player — a HEALTHY pattern IF cleanly separated.
[OPEN: verify the code cleanly separates base-player from league-instanced-player.]

## 3. DRAFT-PROCESS MECHANICS IN SCOPE (the launch audit SKIPPED these)

The launch audit checked the franchise-creation handoff ONLY. These draft-PROCESS mechanics
are unverified and owed — they're the difference between the draft STARTING correctly and
the draft FUNCTIONING correctly:
- **Salary-from-IV during the draft** — recommended salary starts at IV; auction lets teams
  pay more/less; final settles at draft's end (per §2.A).
- **AI picking logic/wiring** — CPU teams must draft (auction: bid logic). The launch audit
  found NO snake autopick; auction AI is unverified.
- **Scout hiring at the start of the draft** — the hiring step before/at draft start.
- **Scout guidance for team-building during the draft** — scouts guide a team's draft choices.
- **Trade value logic** — in-draft / franchise trade valuation (unverified; not in launch scope).
- **Auction mechanics** — budget tracking, bidding/nomination, no-overspend, roster-slot
  satisfaction under budget.

## 3.5 — STAFF-ROLE ASSIGNMENT: managers / scouts / reporters (JK, 2026-06-20)

These three roles are CONSUMED by Mode 2 (living season) → each must be assigned somewhere in
Mode 1. They are NOT missing — they EXIST but are plumbed to the WRONG entry point for the
franchise/draft flow. This is a RE-PATHING problem (relocate the assignment to franchise
creation / draft), not a from-scratch build — with one upgrade caveat for managers. Derive
each requirement BACKWARDS from its Mode 2 consumer (what must the role BE at launch?).

- **Managers** — currently a bare TEXT FIELD in the team-edit section of League Builder. Mode
  2's manager layer (firing, L11 mechanics, manager WPA/moments) needs a manager ENTITY with
  attributes (cf. the Captain needing Charisma+Loyalty), not just a name string. So manager =
  RE-PATH + likely UPGRADE the entity (generate WITH attributes + SMB4-pool name, assigned via
  the franchise/draft flow). The text-field → structured-entity change is a TYPE change, not
  just a wire move — flag this is more than relocation.
- **Reporters** — currently assigned in PRE-GAME for EXHIBITION (Mode 1 game flow). Mode 2's
  beat-reporter system needs a reporter assigned at FRANCHISE CREATION, persisting for the
  season. The mechanism EXISTS; re-path the trigger from exhibition pre-game → franchise
  creation. (Plus the §2.C name fix — reporters currently use an invented array.)
- **Scouts** — partially covered in §3 (hiring at draft start, guidance during draft). CONFIRM
  whether "scout hiring at draft start" is the SAME assignment Mode 2 needs for ongoing use, or
  two distinct things. (Plus the §2.C name fix — bridge scouts use placeholders.)

## 4. OPEN CODE-VERIFICATION ITEMS (the audit resolves these against the current tree)

1. Do **stadiums/dimensions** flow from League Builder teams into Mode 2 at franchise creation?
2. Does a **"lock the league"** step exist (explicit or implicit) that freezes the draft pool?
3. Does **IV computation** run on the locked pool against **budget tiers**?
4. Is **base-player cleanly separated from league-instanced-player** (the §2.H architecture)?
5. Which of the §3 **draft mechanics** exist / partial / missing (esp. auction + AI picking)?
6. Is **auction buildable bug-free** for v1, or is the gap too large (informs §2.G's caveat)?
7. Does the draft **stamp BOTH frozen numbers** (IV + settled salary) at finalization (§2.A)?
8. **Managers** — is the team-edit text field the ONLY manager pathway? What does Mode 2's
   manager layer require a manager to BE (entity + attributes)? Re-path + upgrade scope? (§3.5)
9. **Reporters** — confirm the exhibition pre-game pathway; what does Mode 2's beat-reporter
   need at franchise creation? Re-path scope? (§3.5)
10. **Scouts** — is draft-start hiring the SAME as Mode 2's ongoing scout need, or distinct? (§3.5)

## 5. DEFERRED (not v1)
- [Anything the audit finds out of v1 scope — LOG here, do not silently drop.]
- (Snake draft status REVISED 2026-06-20 — see §6; it is now a CANDIDATE v1 OPTION, not a flat deferral.)

## 6. AUCTION ELEVATED TO V1 + SYMMETRIC DRAFT FORMATS (JK 2026-06-20)

**SCOPE CHANGE (deliberate, JK):** Auction draft is ELEVATED v1.5 → **v1** — the PRIMARY,
non-negotiable Mode-1 feature. This REVERSES `IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md`
§7.5 ("v1.5 module, not v1-gating") + §7.3 (snake tagged "v1"). The auction LOGIC/ECONOMICS
are ALREADY fully specced in IV_ENGINE §7.5/§7.6 — DO NOT rewrite; REFERENCE them. Update
those §-tags v1.5→v1 when ratified.

**R1 — Draft format is a LEAGUE-WIDE choice (auction OR snake) applied to BOTH the MLB draft
AND the farm draft, consistently.** No mixing — an auction league auctions both tiers; a snake
league snakes both. (More coherent than IV_ENGINE's current split, which auctioned MLB but kept
farm non-auction regardless.)

**R2 — Snake = a candidate v1 OPTION, not deferred (CONDITIONAL).** Snake is LARGELY BUILT
already (`LeagueBuilderSnakeDraft.tsx` is the current live MLB rail, IV-priced — audit-
confirmed). So "keep snake as an option" = KEEP the existing snake + add a format-selector,
NOT build-from-scratch. KEEP IN v1 **IF** the farm-snake path + the format-toggle wire cleanly
(VERIFY). FALLBACK (JK's explicit): if the toggle is messy, DEFER snake, ship auction-only.

**R3 — FARM AUCTION design (NEW — overrides IV_ENGINE's non-auction farm for auction leagues).**
In an auction league the FARM draft is ALSO an auction, with:
  - **Scout-obscured value RANGES** per prospect (reuse §7.4's scout-range mechanic) — users bid
    on PERCEIVED value, not true IV.
  - A **SEPARATE, WALLED-OFF farm budget** (tiered juiced/standard/nerfed), distinct from the MLB
    auction wallet. Overpaying early FORCES later scrimping (budget-scarcity + regret — the
    auction's core tension carried into the farm).

**R4 — SNAKE farm = slotted salaries.** In a snake league the farm draft uses the existing
slotted/tier-scaled prospect pricing (per DRAFT_SALARY_FARM_CERTIFICATION DSF rulings). No bidding.

**R5 — Bidding mechanic = OPEN ASCENDING** (the IV_ENGINE §7.5 design), CONFIRMED by the iPad
hot-seat model (a single passed-around device fits turn-based ascending; blind-sealed can't
collect simultaneous secret bids on one screen). Blind-sealed = NOT v1.

**R6 — INTERACTION MODEL (net-new — in NO existing spec):** the auction runs on a SINGLE iPad
PASSED AROUND the room (single- or multi-player). The device passes to whoever is on the clock /
bidding / counter-bidding. §7.5/§7.6 cover auction LOGIC but NOT this hot-seat pass-around UX →
this is the ONE genuinely net-new spec to author (a focused UX spec, not a from-scratch auction).

**META — audit blind spot:** the prior audits were anchored to the living-season spec + this
vision doc and did NOT reference `IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md` (IV engine, tiers,
luxury caps, all 3 drafts). The v1 roadmap MUST account for that spec too.

**OPEN VERIFICATION (next pass / build):**
- V1: does the existing snake cleanly handle the FARM side under R1 (symmetric format)?
- V2: does a format-toggle cleanly route BOTH the MLB and farm drafts (auction vs snake)?
- V3: scope the net-new farm-auction (R3) — how much builds on §7.5 auction + §7.4 scout-range?

---

## §7 — RATIFIED RULINGS (2026-06-20, JK Part-D walk)

These four answers resolve open Part-D / launch-readiness items. Authoritative.

### R7 — Tier model: IV objective, TIER scales the BUDGET (not the base IV number)
- Player IV is evaluated **objectively** (one true IV per player, tier-independent). The **juiced/standard/nerfed tier sets the TEAM BUDGET/CAP**, not the per-player IV.
- **Design intent:** the tier is the user's lever for *how stacked teams CAN be after the draft*. Juiced cap → more great players per team. Nerfed cap → great players stand out, with **greater albatross risk** (a star eats more of a smaller budget).
- **Calibration anchor:** the **stock 440-player pool IS a JUICED pool.** Standard = a step DOWN from stock; nerfed = a further step down. (So "standard" is not the stock baseline — it is deliberately leaner than what SMB4 ships.)
- **Default intent:** users would typically pick **STANDARD for MLB budgets** and **NERFED for farm budgets.**
- **Farm consequence:** the **farm prospect IV distribution must be tuned up/down by the selected tier** (the generator's quality/ratings spread shifts with juiced/standard/nerfed — this is L-ECON3 / farmGradeMode territory, now confirmed v1-relevant).
- **Reconciles:** launch-readiness items #9 (TIER_SHIFTS latent) + #11 (tier-flat IV) + #1 (G1 freeze). IV stays objective; the tier transform lands on the BUDGET and on the FARM-generation distribution, NOT on the frozen objective IV number.

### R8 — Scouts: ONE scout per team, SAME scout for draft + ongoing
- Exactly **one scout per team**, and it is the **same** scout for the farm draft AND ongoing Mode-2 scouting (one role, not two).
- **DISCREPANCY TO FIX:** current code has teams select **TWO** scouts before the farm draft → reduce to one. (Launch-readiness item #6 resolved: SAME, not distinct; plus the two-scout bug.)

### R9 — Stadiums: LOCK to default Super Mega League stadiums (no custom in franchise)
- **There is NEVER a custom stadium in franchise mode.** Stadium options are **locked to the default Super Mega League stadiums** shipped with the game.
- **Consequence:** name-keyed re-derivation of dimensions/park-factors is **SAFE for v1** (all names are known/stock) — the by-value build (launch-readiness item #7) is NOT required, *provided* the picker is locked to the stock set so an unknown/renamed stadium can never reach the snapshot. The real work is the **LOCK** (constrain the option set), not a value-carrying schema change.

### R10 — Morale seeds at 50 (NEEDS-VERIFICATION in builds)
- Player morale **starts at 50** at franchise creation (neutral midpoint). Fame starts neutral (item #13, by-design).
- **VERIFY:** confirm the launch initializer actually seeds morale=50 (JK unsure this is explicit in the builds). If it defaults to 0 or something else, that is a launch-contract bug.

---

## §8 — NEW BACKLOG ADDITIONS (2026-06-20, JK Part-D walk) — triaged, not yet scoped

Raw additions captured verbatim, each tagged: COVERED (already specced/built) · GAP (real, needs build) · VERIFY (needs a code/spec check) · NEW-SPEC (needs its own design). See the roadmap's launch-readiness section for placement.

1. **Reporter pronouns** [GAP — small] — reporters must use the player's CORRECT pronouns; NO "They/Them" default for singular players. Gender is in the player profile → thread it into the narrative generator. (Pairs with the name-source fix — same generator surface.)
2. **Franchise stats display — what shows where** [NEW-SPEC — not urgent] — which stats appear in Team Hub vs Almanac is undefined. Address before UI/display work, not now. (Display-layer spec, post-build.)
3. **Team archetypes → draft experience / budgets** [VERIFY] — how do archetypes affect the draft + team budgets? Was part of Fable's pool-analysis (IV_ENGINE §6 identity/archetype + §5.3 luxury, T3/T8). Confirm it's specced + on the roadmap, or surface it as a gap.
4. **Prospect names random from SMB4 DB?** [VERIFY] — are farm prospect names already generated randomly from the SMB4 name pool? (Likely yes for prospects; reporters/bridge-scouts are the known violators per launch-readiness #3a. Confirm prospects specifically.)
5. **Pitcher game score per game (Baseball-Savant style)** [NEW-SPEC / GAP] — compute a per-game pitcher game score from the GameTracker statistical depth. Desirable addition; needs a formula spec + where it surfaces.
6. **Beat-reporter depth + standout Q&A** [NEW-SPEC] — give the franchise beat reporter MORE context, and have it ask 1–2 questions of the team standout whose ANSWERS are shaped by personality modifiers/makeup. Pull context from season data, game data, player/team profiles, and Almanac entries tied to the SPECIFIC game instance. (Extends L4/L13-7 reporter work — significant.)
7. **Scouting specialties visible** [NEW-SPEC] — let users hire a scout matching their needs by rating category and/or position (and/or both). Still never 100% accurate, but a more strategic selection. (Builds on R8's one-scout model + §7.4 scout-obscured ranges.)
8. **Stadium analytics depth in Team Hub** [VERIFY — v1 critical] — ensure MAXIMAL park-factor/stadium-stat depth, especially for player WAR. Should already be in (WAR consumes park factors); CONFIRM it's actually wired + surfaced in v1, not shortchanged.
9. **Farm prospect generation up to spec?** [VERIFY — important] — the full farm draft is built, but the player-quality DISTRIBUTION + ratings spread + generation-rule compliance may never have been audited. Audit the generation logic against the rules. (Directly tied to R7's tier-driven farm distribution.)
