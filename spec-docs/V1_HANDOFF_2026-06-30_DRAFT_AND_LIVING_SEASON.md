# V1 HANDOFF — 2026-06-30 (design session: archetypes, legal rosters, the scout paradigm)

> **Purpose.** Compile what this session accomplished and fold it into the existing road-to-v1 so tomorrow's
> session understands the **expanded vision for (1) league/draft setup & execution and (2) the v1 living season.**
> This does NOT replace the plan of record — it extends it.
>
> **Read to resume, in order:** this doc → `V1_PLAN_2026-06-30.md` (the original road) →
> `SCOUTING_INTELLIGENCE_SPEC.md` (the canonical draft/scout vision) →
> `SCOUTING_INTELLIGENCE_INTERROGATION_TRANSCRIPT.md` §(b) (today's decision record) →
> `TEAM_ARCHETYPES_24.md` (the archetype reference). Live state: `CURRENT_STATE.md` header.

---

## 1. WHAT THIS SESSION ACCOMPLISHED (committed: `efc7cfb6` + `6ea3bb1d`, working branch `experiment/manager-wpa-window`)

1. **The 24 team archetypes are LOCKED** (15 original + 9 gap-fill), written to `src/data/historicalArchetypes.ts`.
   This closes the archetype-matrix gap-fill workstream (v1 plan Decision C). Full reference with exemplars +
   estimated ±rating-point construction: `TEAM_ARCHETYPES_24.md`.
2. **They pass the balance gate on LEGAL rosters.** All 24 land within ±10% team-value parity across
   juiced/standard/nerfed (max deviation 4.4%), and every archetype fields a *legal, fieldable* SMB4 roster.
3. **Canonical legal-roster construction now exists** as a shared source of truth: `src/data/rosterConstruction.ts`
   (`LEGAL_ROSTER` + `isLegalRoster` + `canStart`/`canRelieve`, guard-tested). This is the biggest architectural
   addition of the day (see §3).
4. **A head-to-head win-rate harness was built, validated, and then DEFERRED** (JK ruling) — but it surfaced two
   findings that reshape the vision (see §4): the value engine over-prices pitching, and value-maximizing builds
   don't embody archetype identity.
5. **Memory consolidated; docs updated** (transcript §(b), CURRENT_STATE header).

---

## 2. THE ORIGINAL ROAD TO V1 (recap of `V1_PLAN_2026-06-30.md` — unchanged)

**v1 = build + BEGIN and play a *living* season. Playoffs deferred.** One save-stable end-to-end franchise on the
real `/franchise` route: build league → name GM → pick MLB+farm identities → hire scout → run the FULL draft (MLB +
farm auction) **with the complete scouting-intelligence system** → freeze → launch into a **Mode-2 living season
with the soul layer ON** (fame, morale, news, rivalry, checkpoint development, honors) → play through the
franchise-lens hub → season finale crowns award winners.

The plan's phases:
- **Phase 0** — safe loose work + the A–E rulings (done).
- **Phase 1** — ASSEMBLY: merge the 3 branches (draft-UI, playoff-driver, hub) to trunk. *Nothing is on trunk yet.*
- **Phase 2** — DRAFT DEPTH (the v1 headline build, Decision A): **archetype-vocabulary reconciliation (prerequisite)**
  → competent baseline → the **deep scout** (the three-plan / live-board scouting intelligence).
- **Phase 3** — FINISH THE LIVING SEASON: wire the "engine exists but the season never calls it" seams; complete the
  setup-spine; **harden the L-SIM** (the schedule driver + freeze→real-frozen-franchise bridge — the one true landmine).
- **Phase 4** — freeze → flip the ~11 soul flags → §16 tuning → flip the live route → JK browser sign-off.

Key rulings still in force: **A** full scouting intelligence is a v1 blocker (interrogate → spec → build); **B** soft
luxury tax; **C** principled archetype gap-fill (done today); **D** full L-SIM hardening; **E** playoffs deferred.

---

## 3. TODAY'S ADDITIONS THAT EXPAND THE PLAN

### 3A. LEAGUE / DRAFT SETUP & EXECUTION — the expanded vision

The scouting-intelligence spec already defines the shape (per-league team setup; the **Scout vs Assistant-GM** entity
split; **one live draft board**; the **Second-Price market model**; the no-timer **bid-vs-pass projection**;
Option-A wrong-fit penalty). Today added the following, which the build must now honor:

- **★ LEGAL ROSTER CONSTRUCTION IS FOUNDATIONAL AND CROSS-CUTTING (new).** A real SMB4 roster is: **8 field starters
  (one each C/1B/2B/3B/SS/LF/CF/RF) + a REQUIRED backup catcher + 4 SP + 4–5 RP + 4–5 bench = 13–14 position players +
  8–9 pitchers** (bench and reliever counts are MINIMUMS; one slot swings between a 5th bat and a 5th arm). This is
  now codified once in `src/data/rosterConstruction.ts`. **JK directive: the auction draft, the scout/Assistant-GM
  draft board, AND the in-season roster advisor must ALL build and reason against this same definition.**
  - **The gap:** the live auction today enforces **NO positions** — it counts picks to 22 and stops
    (`leagueBuilderAuctionPipeline.ts`, flat `rosterSlotsRemaining`). The position-aware "own_need" roster model is
    *spec'd but unbuilt* (`SCOUTING_INTELLIGENCE_SPEC` §5). Building it is now a **foundational item that threads
    through Phases 1–3** — it's needed for the Second-Price market (need-per-position) AND to guarantee GMs draft
    legal, fieldable teams.

- **★ STRATEGY-FIRST (IDENTITY) BUILDING IS THE SCOUT'S PARADIGM (new).** The scout/Assistant-GM must build **TO the
  chosen identity** — stack the boosted areas, accept the nerfed ones — **NOT maximize raw kblIV value.** Demonstrated
  today: a value-maximizing build makes every team grab the same priciest players (e.g. a $218k elite closer) even
  when that's off-identity — which starves the rest of the roster and ignores the strategy. A strategy-first build
  instead makes a rotation team lead with starters, a power team with sluggers, a bullpen team with relievers. **This
  is what "the one live board" should show a GM**, and it's the correct objective for `buildBestRoster` / the
  deep-scout optimizer (Phase 2, 7b). (A working strategy-first prototype exists in this session's history; it was
  reverted from the committed code — re-derive it into the scout build.)

- **The 24 archetypes are the identity menu** (MLB + Farm, chosen separately) — each a cap-shift trade-off. The
  archetype-vocabulary reconciliation (v1 plan 7-pre) is still the prerequisite: unify `HISTORICAL_ARCHETYPES` (the 24)
  with the auction's `capIdentity` / `CAP_MODIFICATION_FRACTIONS` so the scout's plans match the caps the auction
  actually applies. `rosterConstruction.ts` and the locked 24 are inputs to that reconciliation.

- **Tier feel is an open tuning question.** The juiced/standard/nerfed levels change only the budget
  (≈ $1,207k / $1,065k / $956k → ~24% team-value swing, tax rising as it tightens). JK is evaluating whether that
  separation is the intended difficulty spread; it's a §16 tuning knob.

- **UI gap:** the draft-setup picker reads a hand-kept catalog (`src/src_figma/app/data/teamArchetypeCatalog.ts`)
  that still lists **15** — the 9 new archetypes need copying there (+ the "choose from 15" copy) before players can
  pick them. Display-only, belongs with the draft-setup UI.

### 3B. V1 LIVING SEASON — the expanded vision

The living-season target is unchanged (Mode-2, soul layer ON, franchise-lens hub, season finale; playoffs deferred).
Today's additions:

- **The in-season Assistant GM must use the SAME legal-roster + strategy-first logic.** It persists past the draft as
  the roster advisor (optimized lineups, roster moves, trades, archetype-evolution, performance-aware), and every move
  it recommends must keep the team a **legal roster** and honor the **identity** — the same `rosterConstruction.ts` and
  the same strategy-first objective the draft uses. (This unifies the draft optimizer and the in-season advisor into
  one brain, as the spec intends.)
- **The in-season economy stays as spec'd** (`SCOUTING_INTELLIGENCE_SPEC` §3.4 + `IN_SEASON_CAP_DEADCAP_ANALYSIS`):
  v1 = user-controlled teams only; removal = send-down (75% dead money on intrinsic salary) or trade (clean swap); no
  release / no FA pool; dead-cap on intrinsic salary; fan morale watches results-vs-talent, not payroll. Legal-roster
  enforcement applies to in-season moves too (you can't send down your only catcher).
- **Balance philosophy for the living season:** value-parity is the v1 gate; whether the identities are *truly*
  balanced *in play* is the deferred win-model question (§4). The living season itself (via the L-SIM season arc +
  JK's real-data sign-off) is the practical proving ground until the win-model is built.

---

## 4. THE TWO FINDINGS BEHIND THE VISION SHIFT (why strategy-first + the deferred win-model matter)

1. **The value engine (kblIV) prices PITCHING far above hitting** in the draft pool (the top 22 players by kblIV are
   19 pitchers / 3 hitters; elite relievers top the price list). So a raw-value-maximizer routes the budget to arms
   and starves the bats — even for offense identities. This is why strategy-first building is necessary, and it's a
   caveat the scout must respect: **align to identity + value-for-cost, never blind raw value** (else an offense
   identity becomes a value trap).
2. **The head-to-head WIN test is the true balance arbiter, and it's DEFERRED (JK Option C).** An independent
   ratings→runs→wins model was built and validated (a league-average team centers at the real run environment; a
   stronger team beats a weaker one 99%), but its raw archetype result is confounded by finding #1 + the value-max
   builder, and is tier-unstable — so v1 ships on value-parity instead. When each archetype builds to **identity**,
   team values spread ~26% (offense identities "richer," pitching/defense "leaner") — but that's the *pricing*, not
   proven imbalance (a lean run-prevention team wins differently). **Only a head-to-head sim of identity-built teams
   resolves it.** A clean win-model needs a build-to-identity roster generator (now prototyped) + real SMB4 run data
   or careful calibration. Full diagnosis: transcript §"(b) WIN-RATE VALIDATION".

---

## 5. OPEN DECISIONS FOR JK (carried into tomorrow)

- **`main` branch:** the working branch is ~1,104 commits ahead of `main`, which lacks the entire scouting/archetype
  foundation. Today's commit is on `experiment/manager-wpa-window`. Decide: keep this as the de-facto trunk, advance
  `main`, or point to the real integration trunk.
- **Win-model:** revisit building the head-to-head win test now (given identity-building is the real question), or
  stay the course (value-parity for v1, win-model later)?
- **Tier feel:** is the juiced/standard/nerfed spread (~24% team value) the intended difficulty separation?
- **Rays exemplar tidy-up** (Go-Go 2026 Rays appears in 3 archetypes) — optional flavor trim.

---

## 6. WHERE TO PICK UP TOMORROW

**Immediate next step in the design thread:** build **Move 2 — the PLAYER strengths-and-weaknesses map** (lift the 18
per-position signed prospect templates in `prospectScoutingDraftEngine.ts` into a reusable, per-position, VALUE-AWARE
*reverse* classifier + expand to full good-and-bad coverage + highlight the player types that ALIGN with each team
identity). Keep the finding-#4 caveat in mind: alignment = identity fit + value-for-cost, not raw value.

**Then Move 3 — scope the actual scout/Assistant-GM build**, folding in today's foundations: the canonical legal
roster (`rosterConstruction.ts`) wired into the auction + scout + in-season advisor; the strategy-first (identity)
objective; the archetype-vocabulary reconciliation prerequisite; the Second-Price market + bid-vs-pass projection
from the spec.

**Bigger picture:** this design thread (scout/Assistant-GM) is the Phase-2 v1 headline build. The Phase-1 assembly
(merging the 3 branches to trunk) and Phase-3/4 living-season activation remain JK-gated and separate from this thread.
