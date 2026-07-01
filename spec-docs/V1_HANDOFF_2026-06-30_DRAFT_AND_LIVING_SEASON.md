# V1 HANDOFF — 2026-06-30 (design session: the draft re-design, the scout system, archetypes & legal rosters)

> **Purpose.** Compile what this session accomplished and fold it into the road-to-v1 so tomorrow's session
> understands the **expanded vision for (1) league/draft SETUP & EXECUTION — including the whole scouting-intelligence
> system and the league/draft setup RE-DESIGN — and (2) the v1 LIVING SEASON.** This extends, not replaces, the plan.
>
> **Read to resume, in order:** this doc → `SCOUTING_INTELLIGENCE_SPEC.md` (the canonical scout/draft vision, a v1
> BLOCKER) → `SCOUTING_INTELLIGENCE_INTERROGATION_TRANSCRIPT.md` (the full Q1–Q12 + Thread A + §(b) decision record) →
> `TEAM_ARCHETYPES_24.md` (the 24 archetype reference) → `V1_PLAN_2026-06-30.md` (the original road) →
> `IN_SEASON_CAP_DEADCAP_ANALYSIS_2026-06-30.md` (the economy). Live state: `CURRENT_STATE.md` header.

---

## 1. WHAT THIS SESSION ACCOMPLISHED (committed `efc7cfb6` + `6ea3bb1d` + `5700bbd0`, branch `experiment/manager-wpa-window`)

1. **The 24 team archetypes are LOCKED** (15 original + 9 gap-fill) in `src/data/historicalArchetypes.ts`, closing the
   archetype gap-fill workstream (v1 plan Decision C). Reference: `TEAM_ARCHETYPES_24.md`.
2. **They pass the balance gate on LEGAL rosters** — all 24 within ±10% value parity across all three tiers (maxDev 4.4%),
   each fielding a legal, fieldable SMB4 roster.
3. **Canonical legal-roster construction now exists** as a shared module (`src/data/rosterConstruction.ts`) — the biggest
   architectural addition of the day (see §3.3).
4. **A head-to-head win-rate harness was built, validated, and DEFERRED** (JK Option C) — it surfaced two findings that
   sharpen the whole vision (§3.3 / §5).
5. **Memory consolidated; docs + session log updated.**

*(This session did NOT touch the scouting-intelligence build itself, the per-league team layer, or the draft flow — those
remain to build. This handoff exists so their vision is carried forward intact.)*

---

## 2. THE ORIGINAL ROAD TO V1 (recap of `V1_PLAN_2026-06-30.md` — unchanged)

**v1 = build + BEGIN and play a *living* season; playoffs deferred.** One save-stable, end-to-end franchise on the real
`/franchise` route: build league → name GM → pick MLB+Farm identities → hire scout → run the FULL draft (MLB + farm
auction) **with the complete scouting-intelligence system** → freeze → launch into a **Mode-2 living season with the soul
layer ON** → play through the franchise-lens hub → season finale crowns award winners.

Phases: **0** safe work + rulings (done) · **1** ASSEMBLY (merge the 3 branches — draft-UI, playoff-driver, hub — to trunk;
*nothing is on trunk yet*) · **2** DRAFT DEPTH (the v1 headline build: archetype-vocab reconciliation → competent baseline →
the deep scout) · **3** FINISH THE LIVING SEASON (wire seams, setup-spine, **L-SIM hardening** — the landmine) · **4**
freeze → flip the ~11 soul flags → §16 tuning → flip the live route → JK sign-off.

Rulings in force: **A** full scouting intelligence is a v1 blocker (interrogate → spec → build — DONE: the spec exists) ·
**B** soft luxury tax · **C** principled archetype gap-fill (DONE today) · **D** full L-SIM hardening · **E** playoffs deferred.

---

## 3. THE NEW VISION — LEAGUE / DRAFT SETUP & EXECUTION

### 3.1 The league / draft setup RE-DESIGN (the architectural re-shaping — spec §2, transcript Q1)

**Today teams are GLOBAL singletons** (`globalTeams`), so an identity set on a team bleeds across every league it's in.
The re-design (**JK ruled Option A — layer-first, in v1**) re-homes setup so a league and its teams are configured at
leisure, and "the draft" becomes a thin event:

- **★ Per-league team-instance layer (NEW foundation).** Add an **additive per-(league,team) shadow-override store**
  mirroring the proven `leaguePlayerOverrides` pattern: the global team stays the DEFAULT; the per-league record SHADOWS
  it when present → **zero migration**, existing leagues untouched. **HARD FENCES:** identity/config ONLY — **NEVER make
  the ROSTER per-league** (`teamRosters` keyed by teamId is the most load-bearing record — the scope-creep danger), and
  **NEVER migrate `capIdentity` off the global team.** Register the new store in backup / sync / L-SIM-sandbox / save-slot
  (per `new-own-db-store-three-registries`). **VERIFY-AT-BUILD:** confirm the DRAFTED roster lands in the FRANCHISE
  (per-league), not the global team — so the "roster stays global / identity-only" fence holds. (The cross-league bleed is
  a real but LATENT bug — needs an un-exercised "team in two leagues" flow to trigger → safe layer-first work.)

- **★ Setup relocates INTO League Builder / the per-league team-edit page.** That page holds the full **IDENTITY BUNDLE**,
  all configured at leisure: **GM name · Assistant GM name · Scout name · Manager (name + style) · Beat reporter · MLB
  archetype (dropdown) · Farm archetype (dropdown) · draft boards/priorities** (the Assistant GM **button-generates** the
  initial board + rankings from the archetypes + per-position player archetypes). **The LEAGUE holds the draft POOL.**

- **★ "The draft" becomes a THIN EVENT** — set up on your own time, come together when ready; the draft only READS the
  pre-configured league + per-league teams and pulls it all in. Inherently draft-time = the live auction + the shill count
  (room pressure) + who's at the table that night; everything else moves to setup.

- **Staffing RELOCATES** out of the old post-draft staffing screen into the team-edit page; **couch-coop SEAT names persist**
  as durable GM identities (today throwaway local-state).

- **REFACTOR (not just add):** deprecate the scout-pool / hire-draft flow (replaced by name-it + auto-specialize on the team
  page); the entity split (Scout vs Assistant GM). **BIG GAP:** the middle of the draft chain (scout-hire / staffing / config)
  is UNMERGED to trunk — part of the JK-gated assembly.

### 3.2 The scouting-intelligence SYSTEM (the canonical vision — `SCOUTING_INTELLIGENCE_SPEC.md`)

The GM declares an identity and per-position priorities; the intelligence does the affordability/pivot math so the GM
thinks strategy, not arithmetic. **Trustworthiness (calibrated, humble, honest RANGES) is make-or-break** — a confidently
wrong scout is worse than a humble one.

- **★ The two-entity split** (a real baseball-org division — scouts EVALUATE, the front office CONSTRUCTS):
  - **THE SCOUT — farm talent EVALUATION only.** Farm prospects have HIDDEN true ratings. The Scout **specializes in your
    FARM archetype**, which DERIVES its per-area confidence: **3-band = strong/precise** (archetype-aligned), **5-band =
    average**, **7-band = weak/fuzzy** — fewer bands = tighter. (NOT a GM choice; archetype-derived.)
  - **THE ASSISTANT GM — MLB construction + money** (draft AND in-season). The optimizer, the price/market model, the
    bid-vs-pass projection, cap discipline, the in-season advisor. Reasons ACROSS archetypes (yours, rivals', theoretical).
    MLB ratings are PUBLIC, so its competency is CONSTRUCTION, not rating-accuracy. *(Note the terminology: the transcript's
    early Q4–Q6 says "scout" for what Q11 later split off as the Assistant GM — the rename happened at Q11.)*

- **★ The draft board — rank-order + ONE LIVE board.** The GM gets (a) a rank-ordering of all players and (b) ONE live
  board = the Assistant GM's current best roster-build PATH given the live draft state + priorities + risk posture,
  re-drawing continuously as players sell. The **three risk levels are a POSTURE DIAL / views of the one board**
  (Conservative = ZERO luxury tax · Optimal = some tax, never enough to need scrubs · Aggressive = enough tax to leave a
  few minimum-salary scrubs) — NOT three separately-locked static boards. GM steers via **per-position priorities, two
  input modes (pick one):** ROBUST (a player-archetype dropdown per position, incl. cheap/weak archetypes) or SIMPLIFIED
  (rank the 22 roster slots by priority). **Light-touch:** priorities do the steering; the board is good enough to run as-is;
  full manual calibration is optional. What LOCKS before the draft = priorities + posture + archetype (the board stays live).

- **★ The Second-Price market / price-prediction model.** Predict what each yet-to-be-bid player will SELL for ≈ the
  **second-highest valuation among interested bidders + one increment** (open ascending auctions clear at the runner-up's
  drop point). `v_ij = IV_i × archetypeFit × needMultiplier_j(pos) × personalityBias_j` (clamped to solvency);
  `needMultiplier = own_need_j(pos) × leagueScarcity(pos)`. **`own_need` uses the REAL roster model** (a team isn't "filled"
  at C until it has its backup C; SP = 4 critical slots). **Surplus** (your valuation − predicted price) is the pivot signal.
  **The ACCURACY GATE (make-or-break):** never a point price, ALWAYS a range (low/median/high); band widens with
  unknowable/shill bidders + early-auction + thin pool; **pre-ship calibration against `auctionTuningSim` until the true
  price lands inside [low,high] ~85–90%.** **Nomination-timing** (weighted-random by IV^2.5, seeded → a KNOWN process) powers
  overspend-EARLY-vs-WAIT advice. Deterministic/closed-form, sub-ms, no Monte-Carlo in the hot path. **Staging:** v1
  "Second-Price Board" → v1.1 "Underbidder Memory" (consume the new bid log) → v1.2 "Market Heat" → v2 "Forward Projection".
  **Infra to add now (log-first):** `Lot.bidLog` + `AuctionResult.{bidderSet,underbidder,numBidders}` (currently discarded).

- **★ THE KILLER FEATURE — real-time BID-vs-PASS board projection.** *"If you BID at this figure → here's your board going
  forward; if you PASS → here's your board going forward."* Deterministic re-optimization on the live shrinking pool.
  Show-don't-tell; the load-bearing guidance. **Needs NO LLM.**

- **The live auction experience:** **NO TIMER, pass-the-iPad** couch co-op — the design constraint is **PRIVACY** (hide a
  GM's analysis from rivals), not brevity. PUBLIC = the player + IV + full profile (MLB public; FARM keeps hidden attrs) +
  the active GM's live roster. PRIVATE (behind a click) = everything the Assistant GM provides. **Cap discipline** = the
  live projection IS the guidance; keep a HARD completion floor but make it the ACCURATE "can you still complete a legal
  roster from the players actually left" calc (strip the crude `projectedTax` reservation; reuse the forced-filler). **Shills**
  = hidden rival GMs, each toward its own secret archetype, unpredictable on purpose. **LLM = optional polish only** (never
  lets an LLM decide whether a bid breaks your plan; the math is always deterministic).

- **The farm draft (scout-run):** same one-live-board machine, but the Scout supplies **3/5/7-banded 20-80 overall values**
  (never true ratings — the hidden-attribute gate stays), with **MUCH WIDER bid bands** and a **CAP-SPACE RISK DISCIPLINE**
  headline (don't bet it all on one or two fuzzy prospects).

- **The economy** (`§3` + `IN_SEASON_CAP_DEADCAP_ANALYSIS`): **Option-A wrong-fit penalty** — a GRADUATED, VISIBLE debit
  from your DRAFT BUDGET when you win an off-fit player (shown before the bid), paid ONCE at the draft; the player then
  carries his INTRINSIC salary into the season; **dead-cap = on intrinsic** (no carried premium, no in-season archetype tax).
  In-season (v1): user-controlled teams only (no CPU trade AI); removal = **send-down** (75% dead money on intrinsic) or
  **TRADE** (clean swap); **no release / no FA pool**; demotion-to-save IS intended rebuilding, gated by fan morale on the
  demoted player's fame × net-TV; **fan morale watches results-vs-talent, NOT payroll** (cut the payroll→morale layer).

- **The FREEZE → season handoff** (the "4-number" model, `draftMorale.ts`): everything freezes into the season as the
  franchise starting state — roster + identity (MLB/Farm archetype) + Scout + Assistant GM + Manager + Beat reporter + draft
  posture + GM. Writes per-player starting morale (slot-class ±15 + pay-class ±10, personality-adjusted) + team fan-morale +
  settled salaries + draft-baseline True-Value rows. **v1 = auction-only** (snake skips the freeze). **MOCK-DRAFT toggle**
  (v1, low-risk): a draft marked MOCK plays out + shows rosters in-session but SKIPS both durable writes (no roster commit,
  no franchise advance); reset via `deleteAuctionSession`.

- **The in-season Assistant GM** (persists as the roster advisor — same brain as the draft optimizer): **advise-by-default**
  (the GM clicks; one-click apply only for the safe lineup case), a **DEDICATED invoked surface** (not the passive sidebar),
  **performance-aware** (wire real season stats into the analyzer, today hard-coded 'unavailable'), and **surface
  pool-feasibility as the EVOLVE-YOUR-ARCHETYPE tool** ("you have the bodies for Power but you're 2 bats short"). Learning has
  three horizons: within-draft (v1) · within-season (v1) · across-seasons (deferred).

- **Manager & Beat reporter (mostly built):** Manager = a named person + style in team setup; in-game tactical VALUE = the
  Manager-WPA layer (LIVE in GameTracker; the season/career roll-up = build-plan STEP 4, manual firing = L11 flag, both dark;
  legacy `mwarCalculator`/`managerStorage` deprecated). Beat reporter = a narrator (engines own the math); **v1 ships the
  live post-game columns + in-game commentary**; franchise season-news = fast-follow (rides the Phase-2 flag-flip + JK LLM
  browser sign-off).

### 3.3 Today's FOUNDATIONS that plug into that system

- **★ Legal-roster construction is now a shared, cross-cutting foundation.** A legal SMB4 roster = **8 field starters (one
  each C/1B/2B/3B/SS/LF/CF/RF) + a REQUIRED backup catcher + 4 SP + 4–5 RP + 4–5 bench = 13–14 position + 8–9 pitchers**
  (bench & reliever counts are MINIMUMS; one slot swings). Codified once in **`src/data/rosterConstruction.ts`**
  (`LEGAL_ROSTER`/`isLegalRoster`/`canStart`/`canRelieve`). **JK directive: the auction draft, the scout/Assistant-GM board,
  AND the in-season advisor must ALL build and reason against this same definition.** **⚠ Build blocker it exposes:** the
  live auction enforces **NO positions** today — `rosterSlotsRemaining = 22 − drafted`, a flat count; the position-aware
  `own_need` roster model in §5 is **spec'd but UNBUILT.** Building it is foundational for BOTH the Second-Price market
  (need-per-position) AND for guaranteeing GMs draft legal, fieldable teams.

- **★ Strategy-first (identity) building is the scout's paradigm.** The Assistant GM must build **TO the identity** — stack
  the boosted areas, accept the nerfed ones — NOT maximize raw kblIV. Proven today: a value-maximizer makes every team hoard
  the same priciest players (a $218k elite closer) even off-identity, starving the roster; a strategy-first build makes a
  rotation team lead with starters, a power team with sluggers. This is the correct objective for `buildBestRoster` / the
  deep-scout optimizer and what the "one live board" should show. (A working prototype was built + reverted this session;
  re-derive it into the scout build.)

- **★ The 24 archetypes are the identity menu** (MLB + Farm, chosen separately), each a cap-shift trade-off. Built on the
  **matrix: 8 raw ratings → 11 cap-mod axes → 6 user-facing bands** (Power, Contact, Speed, Defense, Rotation, Bullpen).
  **Design rule (JK):** power is SMB4's most-valued category, so power-adders sacrifice **negative PITCHING**; a
  balanced/"complete" identity needs a ROTATION or DEFENSE sacrifice (not bullpen).
  - **Prerequisite (v1 plan 7-pre):** reconcile the TWO archetype vocabularies — `HISTORICAL_ARCHETYPES` (the 24, ×
    `ARCHETYPE_STAT_UNIT`) vs the auction's `capIdentity` / `CAP_MODIFICATION_FRACTIONS` — so the scout's plans match the caps
    the auction applies. The locked 24 + `rosterConstruction.ts` are inputs.
  - **UI wiring gap:** the picker reads a hand-kept catalog `src/src_figma/app/data/teamArchetypeCatalog.ts` that still lists
    **15** — the 9 new need copying there (+ the "choose from 15" copy in `ArchetypePicker.tsx`/`DraftSetupArchetypePreview.tsx`).

- **The two findings behind the paradigm shift** (full diagnosis: transcript §"(b) WIN-RATE VALIDATION"):
  1. **kblIV prices PITCHING far above hitting** (top-22 by kblIV = 19 pitchers / 3 hitters). A raw-value-maximizer routes
     budget to arms and starves bats. **★ Consequence for the player map:** an offense-leaning identity can be a **value TRAP**
     — so the "which player archetypes ALIGN with your team identity" highlighting must mean **identity fit + value-for-cost,
     never blind raw value.**
  2. **The head-to-head WIN test is the true balance arbiter, and it's DEFERRED (Option C).** A validated independent
     ratings→runs→wins model exists, but its raw archetype result is confounded by #1 + tier-unstable → v1 ships on
     value-parity. When each archetype builds to identity, team values spread ~26% (offense priced higher) — resolvable only
     by simulating identity-built teams playing each other.

---

## 4. THE NEW VISION — V1 LIVING SEASON

Target unchanged (Mode-2, soul layer ON — fame, morale, news, rivalry, checkpoint development, honors; franchise-lens hub;
season finale; playoffs deferred). Today's additions:

- **The in-season Assistant GM runs on the SAME legal-roster + strategy-first logic** as the draft — it's one brain. Every
  move it recommends (lineups, call-ups/send-downs, trades, archetype-evolution) must keep the team a **legal roster**
  (`rosterConstruction.ts`) and honor the **identity**. This unifies the draft optimizer and the in-season advisor.
- **The in-season economy stays as spec'd** (§3.4) — user-controlled teams only; send-down (75% dead money) or clean-swap
  trade; no release/FA pool; dead-cap on intrinsic; fan morale watches results-vs-talent. **Legal-roster enforcement applies
  to in-season moves too** (you can't send down your only catcher).
- **Balance in the living season:** value-parity is the v1 gate; whether identities are truly balanced *in play* is the
  deferred win-model question — the L-SIM season arc + JK's real-data sign-off is the practical proving ground until then.

---

## 5. OPEN DECISIONS FOR JK (carried into tomorrow)

- **`main` branch:** the working branch is ~1,104 commits ahead of `main`, which lacks the entire scouting/archetype
  foundation. Today's commits are on `experiment/manager-wpa-window`. Decide: keep this as the de-facto trunk, advance `main`,
  or point to the real integration trunk.
- **Win-model:** revisit building the head-to-head win test now (identity-building is the real question), or stay the course
  (value-parity for v1, win-model later)?
- **Tier feel:** is the juiced/standard/nerfed spread (~24% team value; budgets ≈ $1,207k / $1,065k / $956k) the intended
  difficulty separation?
- **Rays exemplar trim** (Go-Go 2026 Rays appears in 3 archetypes) — optional flavor tidy-up.

---

## 6. WHERE TO PICK UP TOMORROW

**Immediate (design thread):** **Move 2 — the PLAYER strengths-and-weaknesses map.** It's ~80% there: `ProspectArchetypeFamily`
(`prospectScoutingDraftEngine.ts:435-553`) is **18 per-position signed rating-bias templates**, but forward-only (no reverse
classifier), locked inside the generator, and not position-value-aware. Move 2 = lift them into a reusable, per-position,
VALUE-AWARE *reverse* classifier menu + expand to full good-and-bad coverage + highlight the player types that ALIGN with each
team identity (alignment = identity fit + value-for-cost, per §3.3 finding #1). Applies to the bench too.

**Then Move 3 — scope the scout/Assistant-GM build**, on the JK layer-first SEQUENCE: **per-league team layer → setup-in-team-page
(incl. staffing relocation) → archetype-vocab reconciliation + the player-archetype menu → the generalized (strategy-first)
optimizer + the Second-Price market → the live board + bid-vs-pass projection + nomination cue → farm parity → the in-season
Assistant GM → the calibration gate → flag-flips + §16 tuning + sign-off.** Reuse the built engines (`buildBestRoster`,
`analyzePoolFeasibility`, `auctionMaxBid`, `evaluateCpuValuation`, `selectNextNominee`, `auctionTuningSim`, the roster/lineup
analyzers, the manager + reporter, the 4-number freeze, `leaguePlayerOverrides`); wire `rosterConstruction.ts` into the auction
+ scout + advisor; make the optimizer strategy-first.

**Bigger picture:** this design thread (scout/Assistant-GM) is the Phase-2 v1 headline build. The Phase-1 assembly (the 3
branch merges) and Phase-3/4 living-season activation stay JK-gated and separate from this thread.
