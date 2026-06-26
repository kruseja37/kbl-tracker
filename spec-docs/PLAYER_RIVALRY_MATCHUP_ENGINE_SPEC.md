# Player Rivalry — Pitcher↔Batter Matchup Engine (DESIGN CAPTURE)

> **Status:** DESIGN CAPTURE — JK note 2026-06-26, **not yet ruled / not yet built.** Captured here (Write-First) so it isn't lost; needs a JK design pass before contracting. Companions: `FRANCHISE_V1_LIVING_SEASON_SPEC.md §24` (relationships + §24.7 charged matchups) · `STADIUM_ANALYTICS_SPEC_V2.md §5.6` (the park-record-overtake rivalry edge, "hop-6").

## The vision (JK)
Every at-bat between a given **pitcher and batter** accumulates into their head-to-head matchup history (the top-left GameTracker matchup panel), so over a season it gets **richer and more meaningful**. That history **feeds the relationship engine**: once a **rivalry** spawns between the two, each at-bat and each game outcome carries a **larger morale impact** when those rivals face each other than a no-rivalry matchup does. The engine should understand **both the aggregate AND recent form** — so a pitcher "knows" this hitter is **3-for-his-last-4 with 2 HR** off him and feels **extra pressure** to win the at-bat (and vice-versa for the hitter).

## What ALREADY EXISTS (Captain-verified from source 2026-06-26)
- **The matchup DATA is fully persisted + already aggregates the FULL H2H.** `getMatchupEvents(batterId, pitcherId, {excludeGameId})` (`src/utils/eventLog.ts:1687`) reads the `at_bat_events` store and returns **every at-bat between that exact pair across ALL games** (sorted by time). `buildFenwayMatchupSummary(events, batterId, pitcherId)` (`src/src_figma/app/utils/fenwayBoardContext.ts`) aggregates them into a `hits-AB` record + AVG. The GameTracker top-left panel shows it (`GameTracker.tsx:2397-2400` `matchupRecord`/`matchupAvg`/`historicalMatchupRecord`/`historicalMatchupAvg`; the matchup line at `:5706-5713`). **So "gets richer over time" is already true for the DISPLAY** — every at-bat is durably logged and re-aggregated.
- **Rivalries already SPAWN — but attribute-only.** `relationshipFormation.ts:212 scoreRivalry(left, right)` scores a RIVALRY candidate from **ambition / loyalty / ambition-gap / personality-clash** — there is **NO performance or matchup-history input.** Threshold `RIVALRY: 0.78` (`:88`). Edges persist as player↔player `RelationshipEdgeRow` (`franchiseRelationshipEdgesStorage.ts`, RIVALRY type).
- **Per-GAME charged-matchup morale partly exists (§24.7).** `franchiseRelationshipMoraleCompute.ts` has `isChargedRelationshipMatchup`/`buildRelationshipChargedMatchupEvent`; the L-SIM fires `relationship-charged:…:FEUD:game-N`. So when edge-linked players meet, that GAME's morale already amplifies. The fuller §24.7 (personality-scaled, former-team/History triggers — **L13-6**) is still **MISSING/HELD** (`MODE2_V1_COMPLETENESS.md:142`).
- **The park-record-overtake rivalry edge ("hop-6", §5.6)** is one NARROW, queued source of a RIVALRY edge (dethrone someone on a ballpark record → they're rivals). It is NOT yet built.

## What's NEW in the vision (the gaps to wire — "the ingredients exist, the wiring is the feature")
1. **Matchup history → rivalry FORMATION/INTENSITY.** A heated H2H (a hitter who "owns" a pitcher, or a back-and-forth) should be a SOURCE/booster of a rivalry — today `scoreRivalry` never sees the matchup record. Add the H2H as a formation input and/or an intensity driver.
2. **Per-AT-BAT (not just per-game) morale + pressure.** Once rivals face each other, EACH at-bat carries a bigger morale/pressure swing (win/loss of the at-bat), and the game outcome amplifies — richer than the current per-game charged-matchup. Scaled by the matchup stakes.
3. **RECENCY awareness fed into the engine.** Beyond the lifetime aggregate, a **recent-form window** ("last N PA": 3-for-4, 2 HR) should drive the in-the-moment pressure/morale, so the engine "knows" who's hot in the matchup right now — not just the career line.
4. **Surface the "knows" in the GameTracker** (pressure/heat read on the current at-bat), since the matchup panel is where this lives.

## How it connects (the build shape)
- **hop-6 (§5.6 park-record rivalry edge)** is a small slice — ONE way a rivalry is born. This spec is the **broader player-rivalry engine** the edge feeds into. Build hop-6 so its RIVALRY edge lands where this engine + the §24.7 charged-matchup consumer read it (don't build it isolated — see the HANDOFF note).
- **§24.7 charged matchups (L13-6)** is the per-GAME morale consumer; this vision EXTENDS it to per-AT-BAT + matchup-history-driven + recency.
- The matchup aggregate is a **read-side freebie** (event log already has every at-bat); the engine work is (a) a season-scoped + recent-window H2H aggregator exposed to the formation/morale engines, (b) the formation input, (c) the per-at-bat morale amplification.

## OPEN DESIGN QUESTIONS FOR JK (before contracting)
1. **Spawn vs intensify:** does a hot H2H *spawn* a rivalry on its own (a new formation source), or only *intensify* a rivalry that personality already seeded? (Cleanest v1: matchup history is an intensity/booster input; spawning stays personality-gated — but JK may want "owns him" to spawn outright.)
2. **Recency window:** "recent" = last N plate appearances in the matchup (N=?) vs last K games vs a decay. And does recency drive in-game *pressure/morale* only, or also formation?
3. **Per-at-bat morale magnitude** (rival vs non-rival) + whether it's symmetric (both feel it) or asymmetric (the one who's losing the matchup feels more pressure).
4. **Scope:** pitcher↔batter only, or any player pair? In-season only, or career H2H? Live GameTracker pressure read — build now or after the morale wiring?
5. **Sequencing vs hop-6 + L13-6:** is this the umbrella that hop-6 + L13-6 fold into (build them as one coordinated player-rivalry engine), or does hop-6 ship first as the narrow edge?
