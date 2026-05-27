# Franchise v1 Audit: Narrative, Morale, Relationships, History

**Status:** Audit thread 5 output  
**Created:** 2026-05-27  
**Scope:** Documentation-only implementation audit for Mode 2 "season feels alive" systems and Mode 2 to Mode 3 derived handoff.  
**Primary guardrails:** no hidden canonical state mutation, no false narrative completion claims, no unsupported derived outputs.

## Executive summary

The repo has a credible game-derived foundation for a livelier season: completed-game recaps, live/commentary reporter storage, game story storage, event logs, WPA/POG, manager value, milestone detection, season aggregation, standings, completed-game archives, and a scoped season-summary shell. These are strongest when they consume actual GameTracker/completed-game data.

The repo does **not** yet prove a complete v1 narrative/morale/relationship/chemistry/history system. Several surfaces exist, but many are display-time generation, placeholder panels, prototype hooks, dry-run adapters, or summary placeholders. `franchiseSeasonSummaryStorage.ts` explicitly marks `awards`, `milestones`, `fanMorale`, `narrative`, and `parkFactors` as placeholders rather than complete persisted handoff fields (`src/utils/franchiseSeasonSummaryStorage.ts:121`, `src/utils/franchiseSeasonSummaryStorage.ts:296`).

The stability decision should be: keep story-only/game-derived narrative surfaces, but do not let narrative/random systems mutate franchise state unless the event is confirmable, logged, and either applied through a real transaction path or represented as pending manual-sync. Fan morale, player morale, relationship effects, chemistry effects, formal awards, and franchise first/leader history should be treated as incomplete for v1 until their durable scoped storage and mutation/audit contracts are implemented.

## Narrative/random event findings

The narrative spec itself sets the right boundary: narrative may write beat reporter articles, fan morale modifiers, event history, and relationship triggers, but must not write SMB4-reported mojo, fitness, injuries, or ratings. It also says relationship triggers are suggested, not forced (`spec-docs/NARRATIVE_SYSTEM_SPEC.md`).

Repo evidence supports several story-only or display-only narrative paths:

- `commentaryFeedStorage.ts` persists commentary feed entries into `kbl-tracker/commentaryFeedEntries` and syncs them (`src/utils/commentaryFeedStorage.ts:34`).
- `gameStoriesStorage.ts` persists postgame columns into `kbl-tracker/gameStories` and syncs them (`src/utils/gameStoriesStorage.ts:34`).
- Franchise Home news loads recent completed games scoped by `franchiseId` and `seasonId`, then generates recaps at display time (`src/src_figma/app/pages/FranchiseHome.tsx:4360`, `src/src_figma/app/pages/FranchiseHome.tsx:4377`).
- The Game Day beat writer expandable section is explicitly an empty state with a comment saying there is no narrative engine yet for that surface (`src/src_figma/app/pages/FranchiseHome.tsx:3662`).

Randomness exists, but it is not currently an auditable controlled event layer. `narrativeEngine.ts` uses `Math.random()` for reporter IDs, reporter selection, weighted personality choice, off-brand personality, story accuracy, inaccuracy type, and HOT_TAKE morale impact (`src/engines/narrativeEngine.ts:419`, `src/engines/narrativeEngine.ts:433`, `src/engines/narrativeEngine.ts:518`, `src/engines/narrativeEngine.ts:553`, `src/engines/narrativeEngine.ts:741`). The generated narrative return includes morale impact and reliability fields (`src/engines/narrativeEngine.ts:131`, `src/engines/narrativeEngine.ts:1027`), but there is no evidence in the inspected paths that a seed/roll, eligibility reason, proposed state changes, user decision, or transaction/event-log reference is persisted for narrative/random events.

Required classification for v1:

- Story-only events: safe only when evidence-backed and logged as story/commentary/game story rows.
- Suggested-change events: not complete. Any morale, relationship, designation, scouting, role, or chemistry consequence must become pending/confirmable before canonical mutation.
- Required-manual-sync events: not complete as a generalized narrative/random event class. Injuries, roster moves, ratings/trait changes, free agency, trade, draft, and retirement effects must be represented as explicit pending manual-sync or executed through already-audited mutation flows.

Unknown: there may be additional reporter storage fields or LLM reporter paths outside this audit pass, but the inspected narrative engine does not provide the stability audit fields required by `FRANCHISE_V1_STABILITY_PRINCIPLES_AND_CUT_LIST.md`.

## Morale/relationship/personality/chemistry findings

Fan morale has a real engine shape but not a proven durable franchise-season state. `fanMoraleEngine.ts` defines a 0-99 `FanMorale` model with history, event history, trade aftermaths, prospect spotlights, and many event types (`src/engines/fanMoraleEngine.ts:44`, `src/engines/fanMoraleEngine.ts:66`). However, Team Hub explicitly says fan morale tabs are empty states (`src/src_figma/app/components/TeamHubContent.tsx:609`), and season summaries exclude global prototype fan morale by placeholder (`src/utils/franchiseSeasonSummaryStorage.ts:298`). Fan morale should not feed EOS, awards, FA attractiveness, narrative probability, or morale consequences until a scoped store and event log exist.

Player morale is partially surfaced but not system-complete. Player snapshots/archive paths can carry `morale` alongside personality and chemistry (`src/utils/processCompletedGame.ts:64`), and Team Hub can display roster/player fields where present. That is not equivalent to durable player morale logic. Free agency explicitly says morale data is either unavailable or present but deferred for modifiers (`src/utils/franchiseFreeAgencyAdapter.ts:209`). Trade preview explicitly defers morale effects (`src/utils/franchiseTradeAdapter.ts:538`). Role, roster, performance, salary, relationship, and narrative inputs should be marked incomplete as active consumers.

Relationships have an engine and a separate storage layer, but franchise lifecycle integration is incomplete. The engine supports nine relationship types and morale effects (`src/engines/relationshipEngine.ts:11`, `src/engines/relationshipEngine.ts:37`) plus trade warnings (`src/engines/relationshipEngine.ts:162`). `relationshipStorage.ts` persists relationships in a global `kbl-relationships` DB with indexes by player/type/active status (`src/utils/relationshipStorage.ts:22`, `src/utils/relationshipStorage.ts:69`). The Figma hook, however, keeps relationships in component state and adds/removes them in memory (`src/src_figma/app/hooks/useRelationshipData.ts:79`, `src/src_figma/app/hooks/useRelationshipData.ts:116`). The visible offseason chemistry tab is "Coming Soon" (`src/src_figma/app/pages/FranchiseHome.tsx:2451`, `src/src_figma/app/pages/FranchiseHome.tsx:2485`). Relationship effects should be treated as advisory/preview unless routed through franchise-scoped storage with transaction evidence.

Personality and chemistry are distinct concepts and should remain distinct. Hidden personality modifiers are defined as loyalty, ambition, resilience, and charisma (`src/types/game.ts:123`). Salary applies personality only when joining a new team (`src/engines/salaryCalculator.ts:637`, `src/engines/salaryCalculator.ts:699`). Free agency recognizes personality markers but does not execute destination rules (`src/utils/franchiseFreeAgencyAdapter.ts:202`). Chemistry is stored/displayed/analyzed in places, but the active offseason chemistry rebalancing surface is placeholder copy, not a mutation system (`src/src_figma/app/pages/FranchiseHome.tsx:2463`, `src/src_figma/app/pages/FranchiseHome.tsx:2488`).

Hidden modifier visibility is not fully audited. The spec says hidden modifiers should not be shown as numbers. The inspected game type defines them, and narrative output includes reporter personality "for debugging" (`src/engines/narrativeEngine.ts:136`), but this audit did not find a complete visibility contract for player hidden modifiers across all UI/debug surfaces. Mark visibility as unknown until a focused UI/search pass verifies no numeric hidden modifier leakage.

## Milestone/awards findings

Milestone detection is real enough to keep as an internal detection engine, but durable franchise history is not complete. `seasonAggregator.ts` runs milestone detection after game aggregation when enabled (`src/utils/seasonAggregator.ts:123`). `milestoneAggregator.ts` processes season, career, and WAR component milestone checks and can receive `franchiseId`, `currentGame`, and `currentSeason` options (`src/utils/milestoneAggregator.ts:688`, `src/utils/milestoneAggregator.ts:710`). Franchise first/leader calls exist in the aggregator (`src/utils/milestoneAggregator.ts:794`, `src/utils/milestoneAggregator.ts:896`).

The blocker is storage. `franchiseStorage.ts` is explicitly a stub created to allow the build to pass, with TODOs for full first/leader tracking (`src/utils/franchiseStorage.ts:1`, `src/utils/franchiseStorage.ts:8`). `getMilestoneFirstKey()` returns null (`src/utils/franchiseStorage.ts:99`), `recordFranchiseFirst()` returns null (`src/utils/franchiseStorage.ts:111`), and `updateFranchiseLeader()` returns null (`src/utils/franchiseStorage.ts:133`). Season summaries also mark milestones as not promoted into the payload (`src/utils/franchiseSeasonSummaryStorage.ts:297`). Therefore, do not claim durable franchise firsts/leaders or complete milestone history.

Milestone watch exists but is not fully deduped. Franchise Home computes watches from career and season stats, but uses an empty achieved set with a TODO to load career milestones (`src/src_figma/app/pages/FranchiseHome.tsx:3015`, `src/src_figma/app/pages/FranchiseHome.tsx:3035`). This can surface useful watch prompts, but it is not proof of complete milestone history.

Awards/watchlists are mostly placeholder or proxy-driven. Regular-season award-race arrays are explicitly empty (`src/src_figma/app/pages/FranchiseHome.tsx:3971`). Awards Ceremony saves selected awards through offseason state (`src/src_figma/app/components/AwardsCeremonyFlow.tsx:174`), but the candidate source uses `useOffseasonData()` (`src/src_figma/app/components/AwardsCeremonyFlow.tsx:142`), and that hook loads from `data/playerDatabase`, infers personality heuristically, estimates WAR from salary, and gives teams 0-0 records (`src/src_figma/hooks/useOffseasonData.ts:1`, `src/src_figma/hooks/useOffseasonData.ts:111`, `src/src_figma/hooks/useOffseasonData.ts:228`, `src/src_figma/hooks/useOffseasonData.ts:259`, `src/src_figma/hooks/useOffseasonData.ts:286`). Gold Glove, Silver Slugger, Cy Young, and MVP candidate/vote data are salary/proxy/simulated rather than derived from approved Mode 2 season stats/WPA (`src/src_figma/app/components/AwardsCeremonyFlow.tsx:487`, `src/src_figma/app/components/AwardsCeremonyFlow.tsx:803`, `src/src_figma/app/components/AwardsCeremonyFlow.tsx:1334`). Trait reward rolls use UI randomness and are not proven as persisted player mutations (`src/src_figma/app/components/AwardsCeremonyFlow.tsx:1438`).

WPA is strong for game-level recognition but not yet formal season awards. POG uses KBL WPA first and falls back with warnings when only legacy data exists (`src/utils/pogAwards.ts:15`, `src/utils/pogAwards.ts:190`). Game Detail surfaces WPA audit and warns when event logs are missing before trusting WPA/audit sections (`src/src_figma/app/pages/GameDetail.tsx:791`). For short seasons, this means WPA can support per-game recognition and maybe watchlists after aggregation rules are approved, but formal awards need explicit sample-size/season-length rules before v1.

## Season-summary/handoff findings

The Mode 2 to Mode 3 handoff has a real scoped shell for core facts. `FranchiseSeasonSummary` includes franchise/season identity, schedule snapshot, completed-game snapshot, standings, season batting/pitching/fielding stats, playoff config/stats, and offseason state id (`src/utils/franchiseSeasonSummaryStorage.ts:79`, `src/utils/franchiseSeasonSummaryStorage.ts:89`, `src/utils/franchiseSeasonSummaryStorage.ts:98`, `src/utils/franchiseSeasonSummaryStorage.ts:106`, `src/utils/franchiseSeasonSummaryStorage.ts:110`, `src/utils/franchiseSeasonSummaryStorage.ts:115`). These are the real handoff fields.

The following derived fields are placeholders and must not be consumed as completed data:

- `awards`: "Awards are not finalized in Mode 2 v1 persisted season summaries."
- `milestones`: "Milestone storage is not yet promoted into the franchise season summary payload."
- `fanMorale`: "Fan morale is not finalized in Mode 2 v1 and global prototype data is excluded from persisted summaries."
- `narrative`: "Narrative/news recaps are currently generated from completed games at display time."
- `parkFactors`: "Park-factor and adaptive-standard season summaries are not yet persisted by franchise season."

Evidence: `src/utils/franchiseSeasonSummaryStorage.ts:296` through `src/utils/franchiseSeasonSummaryStorage.ts:300`.

Mode 3 also has an 11-phase offseason state machine, not the gospel 13-phase contract (`src/utils/offseasonStorage.ts:1`, `src/utils/offseasonStorage.ts:27`). The phase mismatch matters because awards, chemistry, farm reconciliation, and handoff claims can appear as completed phases while underlying mutation systems are preview/placeholder.

## Blockers for v1 stability

- No generalized narrative/random event audit record with event type, franchise/season scope, affected ids, eligibility reason, seed/roll, proposed changes, user decision, and transaction reference.
- Narrative engine randomness uses `Math.random()` without persisted seed/roll, so generated story effects are not replayable or auditable.
- Fan morale has no proven durable franchise/team state and is excluded from season summaries.
- Player morale lacks a durable, scoped update model tying role/roster/performance inputs to audited effects.
- Relationship storage is global and the active hook is in-memory; franchise lifecycle, scoping, and transaction hooks are not proven.
- Chemistry rebalancing is a placeholder surface.
- Franchise first/leader storage is stubbed and returns null/no-op.
- Formal awards candidates use proxy/offseason data and simulated stats/votes rather than approved Mode 2 season inputs.
- Trait/award reward rolls are not proven as scoped, confirmed, journaled player mutations.
- Season summary derived fields are placeholders and must not be consumed by Mode 3 as real outputs.

## Non-blocking gaps

- Display-time completed-game recaps are acceptable as story-only flavor if labeled as generated recaps rather than durable narrative history.
- Live commentary and game stories can remain as story surfaces because they persist their own rows and do not prove or require canonical morale/relationship mutation.
- Milestone watch can remain advisory, but should warn or dedupe correctly once achieved milestones are loaded.
- Game-level WPA/POG can remain canonical for Game Detail and archives; season-level award use should wait for candidate rules.
- Personality labels and chemistry labels can be preserved as stored player fields without activating downstream mechanics.

## Recommended next implementation slices

1. Add a franchise-scoped narrative/random event ledger before any new event effects. Include story-only, suggested-change, and required-manual-sync statuses, persisted seed/roll/selector fields, eligibility reason, proposed changes, user decision, and transaction/event-log references.
2. Promote fan morale only after adding durable franchise/team morale state with event history and explicit consumers. Start with game-result and reporter-story inputs; defer trades/FA/draft/relationship effects until those mutation paths are real.
3. Promote player morale separately from fan morale. Start with stored player morale, display, and manual/confirmed adjustments; later add role/playing-time/performance inputs.
4. Rework relationship storage for franchise scope and lifecycle. Connect storage to hooks/UI, add create/end provenance, and keep relationship effects advisory until player morale mutation is auditable.
5. Implement franchise milestone first/leader storage or remove all claims of franchise firsts/leaders from v1 surfaces. Then promote milestone summary payloads.
6. Replace awards proxy candidate logic with season-stat/WPA/Manager Value candidate sources. Add short-season sample-size rules before formal awards.
7. Keep season-summary placeholders as placeholders until each upstream system has durable, scoped storage.

## Focused tests to run or add later

- Narrative event ledger: story-only events persist without mutating franchise state; suggested-change events stay pending until confirmed; dismissed events never mutate state.
- Randomness audit: generated events persist seed/roll or deterministic selector fields and can be replayed/explained.
- Manual-sync events: injuries, roster moves, ratings/trait changes, and relationship/morale shifts require pending/confirmed/manual-applied state before downstream consumption.
- Fan morale: completed games update only the scoped franchise/team morale state and append event history; no global prototype morale leaks into summaries.
- Player morale: role/roster/performance/manual adjustments are scoped, idempotent, and logged.
- Relationships: global relationship rows cannot leak across franchises; create/end operations persist and update UI after reload.
- Chemistry: chemistry rebalancing does not complete a phase unless it writes scoped outputs or is explicitly skipped.
- Milestones: achieved milestone storage dedupes watch prompts; franchise firsts/leaders persist and appear in summaries only after storage is real.
- Awards: candidates derive from scoped season stats/WPA/Manager Value, not salary proxies; short seasons apply approved eligibility/sample-size thresholds.
- Handoff: Mode 3 consumers treat placeholder summary fields as unavailable, not as completed derived systems.
