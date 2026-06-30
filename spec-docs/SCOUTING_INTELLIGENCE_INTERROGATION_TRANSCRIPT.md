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
