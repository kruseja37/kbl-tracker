# SCOUTING INTELLIGENCE — Interrogation Transcript

> Per [[v1-rulings-2026-06-30]] Decision A: digest the spec + interrogate JK from first principles, ONE
> focused question at a time, until we have a completed/nuanced vision → THEN build. This transcript is the
> living record; it becomes the tightened spec. Every JK answer is written here verbatim-in-substance.
>
> **Foundation (already settled — see `SCOUTING_INTELLIGENCE_INTERROGATION_PREP.md` + `DRAFT_GUIDE_INTELLIGENCE_SPEC.md`):**
> ONE reified true cost per player (carried everywhere); archetype = declared + evolvable, separate for MLB &
> Farm, no in-season tax; construction game-theory = the development gamble; one analyzer powers the pre-draft
> boards + the in-season dropdown; comprehensive balanced archetype list required; auction archetype LOCKED
> during the auction; shills = hidden rival GMs w/ own secret archetype (draft-only); v1 = human teams only
> (trade reluctance is free game theory); CUT payroll→morale (flip the talent-based one live); albatross
> designation built (morale tax dark).
>
> **Spec under tightening:** `DRAFT_GUIDE_INTELLIGENCE_SPEC.md` (28 §; faithful but not buildable as-is —
> needs a what-exists-vs-new delta map, pinned math, a plan-distinctness guarantee).

---

## Q&A LOG

*(Each entry: the question, JK's answer, and the resulting spec decision. Appended live.)*

### Q1 — Where does a team's archetype identity come from (League Builder per-team-persistent vs draft-process)?
JK reframed into an architectural proposal: League Builder treats teams as GLOBAL SINGLETONS (an archetype
set on a team would bleed across every league it's in). He proposes a **per-league TEAM-INSTANCE layer** so a
team's identity/data is editable WITHIN each league — then move the pre-draft setup (GM name, archetype,
hired scout, the scout's 3 draft boards) into a per-league team-edit page configured privately once the pool
is locked, and collapse "the draft" into JUST entering the auction (it pulls the pre-configured data). Q: is
it better/cleaner, worth it or too risky?

**VERIFIED (workflow, evidence-strict):**
- ✅ Premise CONFIRMED: a Team is a global singleton (`globalTeams` store, keyPath 'id'; league membership =
  `Team.leagueIds[]` ↔ `LeagueTemplate.teamIds[]`). No per-league team instance; roster is global too
  (`teamRosters` keyed by teamId alone). So `capIdentity`/`farmCapIdentity` on the team are shared across
  every league it's in.
- 🎁 **The per-league override pattern ALREADY EXISTS for PLAYERS** (`Player.leagueAssignments[]` +
  `leaguePlayerOverrides` store keyed leagueId+playerId) — teams just never got it. A proven idiom to mirror.
- The 4 setup pieces live at 3 scattered scopes today: GM name = FRANCHISE config; archetype = GLOBAL team
  (Teams page); scout = PER-LEAGUE (scoutProfiles + `hiredScoutIdsByTeamId` on the draft session); **the 3
  draft boards = DO NOT EXIST** (no type/store/generator — net-new).
- Current "draft" IS a multi-step wizard (DraftSetupHubPreview, branch-only): 5+ things (seats, GM names,
  human-vs-CPU, MLB+farm archetypes, shill count) + a separate scout-hire screen. Inherently draft-time =
  the live auction + shill count (room pressure) + who's at the table that night; movable to setup = GM name,
  archetypes, owner, scout, the boards.

**DECISION (resolved):** JK's per-league team-instance layer is **the right architecture and SAFE in its
additive form** — a per-(league,team) **shadow-override** store (mirror `leaguePlayerOverrides`): global team
stays the DEFAULT, the per-league record SHADOWS it when present → **zero migration**, existing leagues
untouched. **Hard fence: IDENTITY/config only (GM/archetype/scout/boards). NEVER make the ROSTER per-league
and NEVER migrate `capIdentity` off the global team** — that's the only version with real saved-data danger,
and the `teamRosters` record is the most load-bearing in the app (scope-creep is THE risk). Register the new
store in the backup/sync/L-SIM/save-slot checklist ([[new-own-db-store-three-registries]]).
**SEQUENCING:** the layer is NOT a prerequisite for the scout — the **3 draft boards (the actual v1 blocker)
can be built on the EXISTING draft-session/scout-profile rails**. So → **v1: build the boards on existing
rails (playable scouted draft); v1.1: add the per-league team-edit page (the setup-in-League-Builder /
draft-is-just-the-auction UX re-architecture) and re-home the boards into it.** The cross-league bleed is a
real but LATENT bug (needs an un-exercised "team in 2 leagues" flow to trigger) → v1.1 correctness win.
[OPEN sub-fork for JK: build-the-layer-first-then-boards (cleaner, boards built once, slower to playable) vs
boards-on-rails-now-relocate-later (faster to playable, cheap re-home). Captain lean: boards-first.]

**JK RULING (Q1 sub-fork): OPTION A — LAYER-FIRST, in v1.** Rework draft setup so it lives INSIDE the
league (pool) + the per-league teams (GM/scout/draft boards), and switch the draft to an EVENT that pulls
everything from the associated league+teams ("set up on our own time, come together when ready to draft").
⇒ the per-league team-instance layer + the per-league team-edit page + the thin-draft-event rework are now
FOUNDATIONAL v1 work (sequenced before the playable draft). Safety fences STILL apply (and matter more, since
we're building it in v1): additive shadow-override store (zero migration), per-league team holds
IDENTITY/SETUP only (GM/scout/boards/archetype-override), global team stays the default, NEVER migrate
`capIdentity` off the team, register the new store in backup/sync/L-SIM/save-slot.
**VERIFY-AT-BUILD:** where does the DRAFTED roster land — the franchise (per-league, expected, so the per-league
team layer need NOT touch `teamRosters`) vs the global team? Confirm the draft output is franchise-scoped so
the "roster stays global / identity-only" fence holds without contortion.

**Q1 ADDENDUM (JK):** managers + beat reporters should ALSO be assigned in the per-league team setup (not
post-draft/pre-season). ⇒ the per-league team-instance identity bundle = GM name + MLB/Farm archetype +
scout + draft boards + **manager + beat reporter**. All configured at leisure; the draft/season pulls them in.

### Q2 — What makes the three boards (Conservative/Optimal/Aggressive) genuinely different?
Spec §9-10 differentiates them by RISK TOLERANCE via different optimizer objective-weights (Conservative
protects completion/budget/tax; Optimal = best balanced archetype build; Aggressive = chase ceiling/stars,
accept tax + thin bench). My read: right backbone; risk = three near-identical lists; make the primary visible
differentiator budget-concentration (stars-and-scrubs vs depth) + a plan-distinctness test.

**JK ANSWER — boards differ by PER-POSITION PRIORITY × risk/spend, two input modes:**
- **ROBUST mode:** a dropdown next to EACH position to pick the desired **PLAYER ARCHETYPE** (the kind of
  player you want there). The scout prioritizes hitting those per-position targets. The 3 boards = ALIGNMENT
  levels driven by money: **Aggressive = maximal alignment** (spends/taxes to nail your ideal at each spot),
  **Conservative = least** (cheaper fallback fits), **Optimal = between.**
- **SIMPLIFIED mode (alternative the GM picks instead):** rank the 22 roster slots by priority (1: SS, 2: SP1,
  3: C, 4: CP, 5: CF, 6: SP2 … 17: Bench-C, 18: Bench-IF, 19: SP/RP…); the scout fills the highest-IV player at
  each slot in priority order, within the salary-cap / team-archetype / 3-board constraints.
- **Tax/spend profile per board (JK, the concrete enforceable differentiator):** **Conservative = ZERO luxury
  tax; Optimal = SOME tax but not enough to require scrubs; Aggressive = enough to require a few minimum-salary
  SCRUBS at the end.** ⇒ answers the distinctness bar: genuinely different teams. Cap magnitudes for
  juiced/standard/nerfed = DEFERRED to post-build §16 tuning (JK uncertain until the engine exists).

**BUILDABILITY (verified): YES, with one piece to formalize.**
- Simplified ranking mode = buildable on existing concepts (positions, IV, `buildBestRoster`, roster slots).
- `PlayerArchetype` taxonomy EXISTS but is a small narrative starter set (`src/types/reporter.ts:20` —
  ACE/SLUGGER/SPEEDSTER…; tag list in `LeagueBuilderPlayers.tsx`). ROBUST mode needs it **expanded into a
  comprehensive per-position player-type menu** — design+build connected to the TEAM-archetype matrix gap-fill
  ([[v1-rulings-2026-06-30]] C): same "what are the building blocks?" question at the player level (likely
  derive player-type from rating/trait profiles + name the menu).
- `buildBestRoster` (`archetypeBalanceSimulator.ts:269`) exists (takes pool/team-archetype/tier/budget); must
  be GENERALIZED to accept per-position targets + emit 3 tax-leveled boards (the "generalize the sim builder"
  note, [[archetype-optimizer-fielding-decisions]]).
- **Unified insight:** the two modes are the SAME thing at different fidelity — the GM's per-position
  priorities (robust = "what KIND of player"; simplified = "which positions matter most"); both feed the
  optimizer as per-position constraints; the 3 boards = how fully targets are met vs money (tax/scrubs).
  Modes are alternatives (pick one); priorities set ONCE → 3 boards generated.
