# GAMETRACKER DELTA REPORT

**Assessment Date:** 2026-03-06
**Spec Source:** spec-docs/v1-simplification/MODE_2_V1_FINAL.md
**Scope:** §2 Event Model + §3 GameTracker 1-Tap Recording (Session 1 of 3)
**Status:** ANALYSIS ONLY — No code modified

---

## Key Code Files Examined

| File | Size | Role |
|------|------|------|
| `src/utils/eventLog.ts` | AtBatEvent interface (lines 131-180), GameHeader (103-128), IndexedDB storage | Event persistence |
| `src/types/game.ts` | AtBatResult, GameEvent, Position, HalfInning types | Shared type definitions |
| `src/src_figma/app/pages/GameTracker.tsx` | ~3,842 lines | Main UI page |
| `src/src_figma/hooks/useGameState.ts` | ~2,968 lines | State management hook |
| `src/src_figma/app/components/OutcomeButtons.tsx` | 478 lines | Outcome selection (HIT/OUT mode) |
| `src/src_figma/app/components/EnhancedInteractiveField.tsx` | ~155K | Active field interaction UI |
| `src/src_figma/app/components/UndoSystem.tsx` | Undo stack + button | Undo infrastructure |
| `src/src_figma/app/components/runnerDefaults.ts` | Runner advancement logic | Runner default calculations |
| `src/engines/mojoEngine.ts` | MojoLevel type (line 20) | Mojo definitions |
| `src/engines/fitnessEngine.ts` | FitnessState type (line 20) | Fitness definitions |
| `src/data/playerDatabase.ts` | PitcherRole (line 19) | Roster-level pitcher role |
| `src/src_figma/app/types/substitution.ts` | PitcherRole (line 29) | In-game pitcher role |
| `src/utils/gameStorage.ts` | CompletedGameRecord (line 342) | Game archive storage |

---

## §2 — Event Model: The Universal Atom

### §2.1 — AtBatEvent Interface

**Summary:** The code's AtBatEvent (eventLog.ts:131-180) has ~24 of ~93 spec fields (~26% coverage). The core identity, result, game state, and WPA/LI fields exist. Massive gaps in batter/pitcher context snapshots, team context, matchup context, park context, enrichment, and versioning.

| Spec Requirement | Code Status | Location | Notes |
|---|---|---|---|
| **IDENTITY** | | | |
| eventId: string (UUID) | EXISTS | eventLog.ts:132 | Format: `${gameId}_${sequence}` |
| gameId: string | EXISTS | eventLog.ts:133 | Present |
| seasonId: string | MISSING | — | Not in AtBatEvent |
| franchiseId: string | MISSING | — | Not in AtBatEvent |
| leagueId: string | MISSING | — | Not in AtBatEvent |
| timestamp: number | EXISTS | eventLog.ts:135 | Present |
| eventIndex: number | DIFFERENT | eventLog.ts:134 | Named `sequence` not `eventIndex` |
| **USER INPUT** | | | |
| result: AtBatResult | EXISTS | eventLog.ts:146, types/game.ts:12-14 | Type exists |
| AtBatResult values (21 values) | DIFFERENT | types/game.ts:12-14 | See AtBatResult comparison table below |
| **AUTO-CAPTURED: gameState** | | | |
| gameState.inning | EXISTS | eventLog.ts:151 | Field named `inning` (flat, not nested) |
| gameState.halfInning | EXISTS | eventLog.ts:152 | Field named `halfInning` (flat) |
| gameState.outs | EXISTS | eventLog.ts:153 | Field named `outs` (flat) |
| gameState.score.away/home | EXISTS | eventLog.ts:155-156 | Flat: `awayScore`, `homeScore` |
| gameState.runnersOn (BaseState) | DIFFERENT | eventLog.ts:154 | Code uses `RunnerState` with `RunnerInfo` objects (runnerId, runnerName, responsiblePitcherId), NOT spec's `BaseState { first?: string; second?: string; third?: string }` |
| **AUTO-CAPTURED: teamContext** | | | |
| teamContext.battingTeam.teamId | DIFFERENT | eventLog.ts:140 | Flat: `batterTeamId` exists but no team record/streak/divisionRank |
| teamContext.battingTeam.record | MISSING | — | Not captured |
| teamContext.battingTeam.streak | MISSING | — | Not captured |
| teamContext.battingTeam.divisionRank | MISSING | — | Not captured |
| teamContext.fieldingTeam.teamId | DIFFERENT | eventLog.ts:143 | Flat: `pitcherTeamId` exists |
| teamContext.fieldingTeam.record | MISSING | — | Not captured |
| teamContext.fieldingTeam.streak | MISSING | — | Not captured |
| teamContext.fieldingTeam.divisionRank | MISSING | — | Not captured |
| teamContext.isRivalryGame | MISSING | — | Not captured |
| teamContext.seriesContext | MISSING | — | Not captured |
| **AUTO-CAPTURED: LI & WP** | | | |
| leverageIndex | EXISTS | eventLog.ts:165 | Present |
| winProbabilityBefore | EXISTS | eventLog.ts:166 | Present |
| winProbabilityAfter | EXISTS | eventLog.ts:167 | Present |
| **BATTER CONTEXT** | | | |
| batterContext.playerId | EXISTS | eventLog.ts:138 | Named `batterId` |
| batterContext.playerName | EXISTS | eventLog.ts:139 | Named `batterName` |
| batterContext.position (FieldPosition) | MISSING | — | Not in AtBatEvent |
| batterContext.battingOrder | MISSING | — | Not in AtBatEvent |
| batterContext.handedness | MISSING | — | Not in AtBatEvent |
| batterContext.enteredAs | MISSING | — | Not in AtBatEvent |
| batterContext.replacedPlayer | MISSING | — | Not in AtBatEvent |
| batterContext.mojoState (MojoLevel) | MISSING | — | Not in AtBatEvent |
| batterContext.fitnessLevel | MISSING | — | Not in AtBatEvent |
| batterContext.currentSeasonAvg | MISSING | — | Not in AtBatEvent |
| batterContext.currentSeasonOPS | MISSING | — | Not in AtBatEvent |
| batterContext.currentStreak | MISSING | — | Not in AtBatEvent |
| batterContext.seasonHits | MISSING | — | Not in AtBatEvent |
| batterContext.seasonHR | MISSING | — | Not in AtBatEvent |
| batterContext.careerHits | MISSING | — | Not in AtBatEvent |
| batterContext.careerHR | MISSING | — | Not in AtBatEvent |
| batterContext.fameLevel | MISSING | — | Not in AtBatEvent |
| batterContext.personality | MISSING | — | Not in AtBatEvent |
| batterContext.hiddenModifiers | MISSING | — | Not in AtBatEvent |
| **PITCHER CONTEXT** | | | |
| pitcherContext.playerId | EXISTS | eventLog.ts:141 | Named `pitcherId` |
| pitcherContext.playerName | EXISTS | eventLog.ts:142 | Named `pitcherName` |
| pitcherContext.handedness | MISSING | — | Not in AtBatEvent |
| pitcherContext.role (5-value PitcherRole) | MISSING | — | Not in AtBatEvent |
| pitcherContext.mojoState | MISSING | — | Not in AtBatEvent |
| pitcherContext.fitnessLevel | MISSING | — | Not in AtBatEvent |
| pitcherContext.pitchCount | MISSING | — | Not in AtBatEvent |
| pitcherContext.currentSeasonERA | MISSING | — | Not in AtBatEvent |
| pitcherContext.currentSeasonWHIP | MISSING | — | Not in AtBatEvent |
| pitcherContext.seasonStrikeouts | MISSING | — | Not in AtBatEvent |
| pitcherContext.careerStrikeouts | MISSING | — | Not in AtBatEvent |
| pitcherContext.careerWins | MISSING | — | Not in AtBatEvent |
| pitcherContext.inheritedRunners | MISSING | — | Not in AtBatEvent |
| pitcherContext.fameLevel | MISSING | — | Not in AtBatEvent |
| pitcherContext.personality | MISSING | — | Not in AtBatEvent |
| pitcherContext.hiddenModifiers | MISSING | — | Not in AtBatEvent |
| **MATCHUP CONTEXT** | | | |
| matchupContext.isRivalry | MISSING | — | Not in AtBatEvent |
| matchupContext.platoonAdvantage | MISSING | — | Not in AtBatEvent |
| matchupContext.previousMatchups | MISSING | — | Not in AtBatEvent |
| matchupContext.relationshipType | MISSING | — | Not in AtBatEvent |
| **PARK CONTEXT** | | | |
| parkContext.stadiumId | MISSING | — | Not in AtBatEvent |
| parkContext.parkFactors | MISSING | — | Not in AtBatEvent |
| parkContext.lighting | MISSING | — | Not in AtBatEvent |
| parkContext.dimensions | MISSING | — | Not in AtBatEvent |
| **COMPUTED AT SAVE** | | | |
| runnerOutcomes (RunnerOutcome[]) | MISSING | — | Not in eventLog AtBatEvent; types/game.ts has RunnerOutcome type but not on event |
| rbis: number | EXISTS | eventLog.ts:147 | Named `rbiCount` |
| runsScored: string[] | DIFFERENT | eventLog.ts:148 | Code has `runsScored: number` (count), spec wants `string[]` (player IDs) |
| outsRecorded: number | MISSING | — | Not in AtBatEvent |
| isQualityAtBat: boolean | MISSING | — | Not in AtBatEvent |
| milestoneTriggered | MISSING | — | Not in AtBatEvent |
| wpa: number | EXISTS | eventLog.ts:168 | Present |
| **ENRICHMENT** | | | |
| fieldLocation: {x, y} | MISSING | — | Not in AtBatEvent (BallInPlayData has zone but different) |
| exitType | DIFFERENT | eventLog.ts:197 | BallInPlayData has `trajectory` field with different values |
| fieldingSequence: number[] | MISSING | — | BallInPlayData has `fielderIds: string[]` (different type/purpose) |
| putouts: number[] | MISSING | — | Not in AtBatEvent |
| assists: number[] | MISSING | — | Not in AtBatEvent |
| errors: {position, type}[] | MISSING | — | Not in AtBatEvent |
| hrDistance: number | MISSING | — | Not in AtBatEvent |
| pitchType (PitchType) | MISSING | — | Not in AtBatEvent |
| pitchesInAtBat: number | MISSING | — | Not in AtBatEvent |
| modifiers: string[] | MISSING | — | Not in AtBatEvent |
| **VERSIONING** | | | |
| version: number | MISSING | — | Not in AtBatEvent |
| editHistory | MISSING | — | Not in AtBatEvent |

**Code has EXTRA fields not in spec:**
- `outsAfter: number` (eventLog.ts:159)
- `runnersAfter: RunnerState` (eventLog.ts:160)
- `awayScoreAfter: number` (eventLog.ts:161)
- `homeScoreAfter: number` (eventLog.ts:162)
- `ballInPlay: BallInPlayData | null` (eventLog.ts:171)
- `fameEvents: FameEventRecord[]` (eventLog.ts:174)
- `isLeadoff: boolean` (eventLog.ts:177)
- `isClutch: boolean` (eventLog.ts:178)
- `isWalkOff: boolean` (eventLog.ts:179)

These extras are useful and can be reconciled with the spec.

#### AtBatResult Enum Comparison

| Spec Value | Code Status | Code Equivalent | Notes |
|---|---|---|---|
| 'K' (swinging) | EXISTS | 'K' | types/game.ts:13 |
| 'Kc' (called/looking) | DIFFERENT | 'KL' | Code uses 'KL' not 'Kc' |
| 'GO' | EXISTS | 'GO' | |
| 'FO' | EXISTS | 'FO' | |
| 'LO' | EXISTS | 'LO' | |
| 'PO' | EXISTS | 'PO' | |
| '1B' | EXISTS | '1B' | |
| '2B' | EXISTS | '2B' | |
| '3B' | EXISTS | '3B' | |
| 'HR' | EXISTS | 'HR' | |
| 'BB' | EXISTS | 'BB' | |
| 'HBP' | EXISTS | 'HBP' | |
| 'E' | EXISTS | 'E' | |
| 'FC' | EXISTS | 'FC' | |
| 'DP' | EXISTS | 'DP' | |
| 'TP' | EXISTS | 'TP' | |
| 'SAC' | EXISTS | 'SAC' | |
| 'SF' | EXISTS | 'SF' | |
| 'IBB' | EXISTS | 'IBB' | |
| 'WP_K' (wild pitch strikeout) | MISSING | — | Hybrid type not in code |
| 'PB_K' (passed ball strikeout) | MISSING | — | Hybrid type not in code |
| — | CODE ONLY | 'D3K' | Dropped 3rd strike — not in spec |

**Code also has `GameEvent` type** (types/game.ts:16) for between-play events: 'SB' | 'CS' | 'WP' | 'PB' | 'PK' | 'PITCH_CHANGE' | 'PINCH_HIT' | 'PINCH_RUN' | 'DEF_SUB' | 'POS_SWITCH'. These are separate from AtBatResult but conceptually cover some BetweenPlayEvent territory.

### §2.1 Gap Tickets

**GAP-GT-2-A:** Extend AtBatEvent with missing identity fields (seasonId, franchiseId, leagueId) | Effort: S | Route: Claude Code | opus
- Add 3 fields to interface + populate at event creation in useGameState.ts

**GAP-GT-2-B:** Rename `sequence` to `eventIndex` for spec alignment | Effort: S | Route: Claude Code | opus
- Rename field + update all references (eventLog.ts index, queries)

**GAP-GT-2-C:** Add teamContext group to AtBatEvent | Effort: M | Route: Claude Code | opus
- Nested object: battingTeam/fieldingTeam with record, streak, divisionRank
- Plus isRivalryGame, seriesContext
- Requires reading team data at event creation time

**GAP-GT-2-D:** Add batterContext snapshot fields (14 missing fields) | Effort: L | Route: Claude Code | opus
- position, battingOrder, handedness, enteredAs, replacedPlayer, mojoState, fitnessLevel, currentSeasonAvg, currentSeasonOPS, currentStreak, seasonHits, seasonHR, careerHits, careerHR, fameLevel, personality, hiddenModifiers
- Most data available in useGameState; needs to be snapshotted at event creation

**GAP-GT-2-E:** Add pitcherContext snapshot fields (13 missing fields) | Effort: L | Route: Claude Code | opus
- handedness, role, mojoState, fitnessLevel, pitchCount, currentSeasonERA, currentSeasonWHIP, seasonStrikeouts, careerStrikeouts, careerWins, inheritedRunners, fameLevel, personality, hiddenModifiers
- Requires reading pitcher stats at event creation time

**GAP-GT-2-F:** Add matchupContext group | Effort: M | Route: Claude Code | opus
- isRivalry, platoonAdvantage (compute from handedness), previousMatchups (query history), relationshipType

**GAP-GT-2-G:** Add parkContext group | Effort: S | Route: Claude Code | opus
- stadiumId, parkFactors, lighting, dimensions — available from game setup

**GAP-GT-2-H:** Add computed fields: runnerOutcomes, outsRecorded, isQualityAtBat, milestoneTriggered | Effort: M | Route: Claude Code | opus
- runnerOutcomes: already computed in play flow, just not persisted on event
- outsRecorded: calculable from result type
- isQualityAtBat: spec defines formula, needs implementation
- milestoneTriggered: milestone detection exists, needs to link to event

**GAP-GT-2-I:** Fix runsScored: number → string[] (player IDs who scored) | Effort: S | Route: Claude Code | opus
- Change from count to array of player IDs

**GAP-GT-2-J:** Add enrichment fields to AtBatEvent (10 fields) | Effort: M | Route: Claude Code | opus
- fieldLocation, exitType, fieldingSequence, putouts, assists, errors, hrDistance, pitchType, pitchesInAtBat, modifiers
- Some overlap with existing BallInPlayData but different structure

**GAP-GT-2-K:** Add versioning (version + editHistory) | Effort: S | Route: Claude Code | opus
- version: number field, editHistory: array tracking changes

**GAP-GT-2-L:** Reconcile AtBatResult: 'KL' → 'Kc', add 'WP_K' and 'PB_K' | Effort: S | Route: Claude Code | opus
- Rename 'KL' to 'Kc' throughout codebase
- Add 'WP_K' and 'PB_K' hybrid outcome types
- Decide whether to keep 'D3K' (code-only) or remove

---

### §2.2 — BetweenPlayEvent Interface

| Spec Requirement | Code Status | Location | Notes |
|---|---|---|---|
| BetweenPlayEvent interface | MISSING | — | No such type exists anywhere in codebase |
| Discriminated union with 15 type values | MISSING | — | Code has `GameEvent` type (types/game.ts:16) with 10 values but different structure |
| type-specific payloads (stolenBase, pitcherChange, substitution, etc.) | MISSING | — | No discriminated union payloads |
| gameState snapshot per event | MISSING | — | Between-play events not structured |

**Note:** The code has a `GameEvent` type covering SB, CS, WP, PB, PK, PITCH_CHANGE, PINCH_HIT, PINCH_RUN, DEF_SUB, POS_SWITCH. These are used in useGameState.ts via `recordEvent()`. The data is recorded but NOT as a structured BetweenPlayEvent with full gameState + type-specific payloads. It's ad-hoc state mutations.

**GAP-GT-2-M:** Implement BetweenPlayEvent interface matching spec §2.2 | Effort: L | Route: Claude Code | opus
- Define interface with discriminated union in eventLog.ts
- Migrate existing GameEvent-based recording to use BetweenPlayEvent structure
- Add IndexedDB store for between-play events
- Wire stolenBase, pitcherChange, substitution, playerStateChange, wildPitchOrPassedBall, pitchCountUpdate, managerMoment payloads

---

### §2.3 — TransactionEvent Interface

| Spec Requirement | Code Status | Location | Notes |
|---|---|---|---|
| TransactionEvent interface | MISSING | — | No such type exists in codebase |
| type: 8 transaction types | MISSING | — | No transaction event logging |
| involvedPlayers array | MISSING | — | |
| trade, freeAgent, rosterMove, draftPick payloads | MISSING | — | Trades/FA exist in flows but not as event log entries |
| narrativeHook | MISSING | — | |

**GAP-GT-2-N:** Implement TransactionEvent interface matching spec §2.3 | Effort: M | Route: Claude Code | opus
- Define interface in eventLog.ts or new transactionLog.ts
- Wire into existing trade/FA/roster flows (TradeFlow.tsx, FreeAgencyFlow.tsx, etc.)
- NOT blocking for GameTracker delta — this is franchise-level

---

### §2.4 — GameRecord Interface

| Spec Requirement | Code Status | Location | Notes |
|---|---|---|---|
| GameRecord interface | DIFFERENT | gameStorage.ts:342 | Code has `CompletedGameRecord` — partial coverage |
| gameId, seasonId | EXISTS | gameStorage.ts:343-345 | Present |
| franchiseId, leagueId | MISSING | — | Not in CompletedGameRecord |
| scheduleGameId | MISSING | — | Not in CompletedGameRecord |
| teams.away/home (teamId + teamName) | EXISTS | gameStorage.ts:348-351 | Flat fields, not nested object |
| startingLineups (LineupEntry[]) | MISSING | — | Not in CompletedGameRecord |
| startingPitchers | MISSING | — | Not in CompletedGameRecord |
| stadiumId | DIFFERENT | gameStorage.ts:347 | Has `stadiumName` not `stadiumId` |
| lighting | MISSING | — | Not captured |
| totalInnings | EXISTS | gameStorage.ts:353 | Named `innings` |
| finalScore | EXISTS | gameStorage.ts:352 | Present |
| events: (AtBatEvent\|BetweenPlayEvent)[] | MISSING | — | No unified events array on game record |
| totalAtBats | MISSING | — | Not in CompletedGameRecord |
| isComplete | MISSING | — | Not in CompletedGameRecord (GameHeader has it) |
| completedAt | MISSING | — | Not in CompletedGameRecord |
| playersOfTheGame | MISSING | — | Not captured |
| gameStoryArc | MISSING | — | Not captured |
| topMoments | MISSING | — | Not captured |
| managerMoments | DIFFERENT | gameStorage.ts:360 | Has `managerDecisions` (different shape) |
| beatReporterRecap | MISSING | — | Not captured |
| depthScore | MISSING | — | Not captured |
| LineupEntry interface | MISSING | — | No matching type (spec: playerId, playerName, battingOrder, fieldPosition, primaryPosition) |

**GAP-GT-2-O:** Implement GameRecord matching spec §2.4 | Effort: M | Route: Claude Code | opus
- Either extend CompletedGameRecord or create canonical GameRecord
- Add LineupEntry type
- Add startingLineups, startingPitchers capture at game start
- Add narrative fields (fill after game completion)
- Add events array linking to AtBatEvent + BetweenPlayEvent logs

---

### §2.5 — Shared Enums

| Enum | Spec Definition | Code Status | Location | Notes |
|---|---|---|---|---|
| MojoLevel | 6-tier strings: 'Rattled'\|'Tense'\|'Neutral'\|'Locked-In'\|'On Fire'\|'Jacked' | DIFFERENT | mojoEngine.ts:20 | Code: `type MojoLevel = -2 \| -1 \| 0 \| 1 \| 2` — numeric, not string. Also only 5 values (missing 'On Fire' tier between Locked-In and Jacked) |
| FitnessLevel | 6-tier PascalCase: 'Hurt'\|'Weak'\|'Strained'\|'Well'\|'Fit'\|'Juiced' | DIFFERENT | fitnessEngine.ts:20 | Code: `type FitnessState = 'JUICED' \| 'FIT' \| 'WELL' \| 'STRAINED' \| 'WEAK' \| 'HURT'` — UPPERCASE not PascalCase, different type name |
| FameLevel | 6-tier: 'Unknown'\|'Local'\|'Regional'\|'National'\|'Superstar'\|'Legend' | MISSING | — | No FameLevel type in codebase |
| CorePosition | 12 values including SP, RP, CP, SP/RP | EXISTS | types/game.ts:9 | `Position` type covers all values |
| FieldPosition | 'C'\|'1B'\|'2B'\|'SS'\|'3B'\|'LF'\|'CF'\|'RF'\|'P'\|'DH' | EXISTS | types/game.ts:9 | Included in Position union (not a separate type) |
| PitcherRole | 5-value: 'starter'\|'closer'\|'setup'\|'middle'\|'mop_up' | DIFFERENT | playerDatabase.ts:19, substitution.ts:29 | Code has 4-value ('SP'\|'RP'\|'CP'\|'SP/RP') and 3-value ('SP'\|'RP'\|'CL') — neither matches spec's 5-value |
| ChemistryType | 5-value PascalCase | EXISTS (PARTIAL) | leagueBuilderStorage.ts | Exists in player data |
| PersonalityType | 7 SMB4-native types | EXISTS | leagueBuilderStorage.ts | Present |
| HiddenModifiers | {loyalty, ambition, resilience, charisma}: 0-100 | MISSING | — | No interface defined |
| BaseState | {first?, second?, third?}: string (player IDs) | DIFFERENT | types/game.ts:22, leverageCalculator.ts | Code has RunnerOutcome enum ('SCORED'\|'TO_3B'\|...) and RunnerState with RunnerInfo objects — different structure |

**GAP-GT-2-P:** Reconcile MojoLevel: numeric → string type | Effort: S | Route: Claude Code | opus
- Create string MojoLevel type for event snapshots; keep numeric for internal calculations
- Spec has 6 tiers; code has 5 (missing 'On Fire' between Locked-In and Jacked) — need decision

**GAP-GT-2-Q:** Reconcile FitnessLevel: UPPERCASE → PascalCase, rename type | Effort: S | Route: Claude Code | opus
- Create PascalCase FitnessLevel alias or adapter

**GAP-GT-2-R:** Implement FameLevel type | Effort: S | Route: Claude Code | opus
- Define 6-tier FameLevel in types/

**GAP-GT-2-S:** Implement HiddenModifiers interface | Effort: S | Route: Claude Code | opus
- Define {loyalty, ambition, resilience, charisma}: 0-100

**GAP-GT-2-T:** Reconcile PitcherRole: implement 5-value spec enum | Effort: S | Route: Claude Code | opus
- New type: 'starter' | 'closer' | 'setup' | 'middle' | 'mop_up'
- Map from roster-level (SP/RP/CP) to in-game role via usage patterns

---

## §3 — GameTracker: 1-Tap Recording

### Critical Architecture Finding

**The current GameTracker does NOT use a Quick Bar.** The spec describes a "single row of outcome buttons" (§3.1) as the primary input. The code has a completely different interaction model:

1. **Active UI:** `EnhancedInteractiveField` (full-screen drag-drop baseball diamond) is the primary input mechanism (GameTracker.tsx:2643)
2. **Disabled UI:** The old expandable panels with outcome buttons (OutcomeButtons.tsx) are wrapped in `{false && ...}` at GameTracker.tsx:2844 — completely disabled
3. **OutcomeButtons.tsx** uses a 2-step HIT/OUT modal pattern with separate "Advance" button — not 1-tap

This means the entire §3.1 Quick Bar design and §3.2 1-Tap execution flow are architecturally different from what's implemented. The EnhancedInteractiveField is a more visual approach but doesn't match the spec's 1-tap philosophy.

**JK DECISION NEEDED:** Keep EnhancedInteractiveField (current, visual) or implement spec Quick Bar (1-tap, fast)?

---

### §3.1 — Quick Bar Design

| Spec Requirement | Code Status | Location | Notes |
|---|---|---|---|
| Single-row primary Quick Bar (9 buttons + overflow) | DIFFERENT | GameTracker.tsx:2844 (disabled) | Old expandable panels exist but disabled. Active UI is EnhancedInteractiveField (drag-drop) |
| Button order: K, GO, FO, LO, 1B, BB, 2B, HR, ··· | DIFFERENT | OutcomeButtons.tsx:96-133 | HIT_TYPES: 1B, 2B, 3B, HR. OUT_TYPES split into 2 rows. Not a single Quick Bar row |
| K first (prime left-thumb position) | DIFFERENT | OutcomeButtons.tsx:126-127 | K is in OUT_TYPES_ROW2, not first position |
| K includes Kc toggle (swinging vs looking) | MISSING | — | K and KL are separate buttons, no toggle |
| HR triggers inline prompts (distance + pitch type) | MISSING | — | No inline HR distance capture in active flow |
| Overflow [···]: PO, 3B, HBP, E, FC, DP, TP, SAC, SF, IBB, WP_K, PB_K, Balk | DIFFERENT | OutcomeButtons.tsx | Items spread across primary+secondary rows; no overflow menu |
| WP_K, PB_K in overflow | MISSING | — | Hybrid outcomes not in AtBatResult type |
| Balk in overflow | MISSING | — | Balk removed from UI (Jan 25, 2026 per gotchas) — but spec includes it |

### §3.2 — 1-Tap Execution Flow

| Spec Requirement | Code Status | Location | Notes |
|---|---|---|---|
| 1. Snapshot context (0ms) | EXISTS | useGameState.ts, GameTracker.tsx:1062 | Context captured at play completion |
| 2. Apply runner defaults (0ms) | EXISTS | runnerDefaults.ts | `calculateRunnerDefaults()` exists with full baseball logic |
| 3. Create event (0ms) | EXISTS | useGameState.ts | AtBatEvent created with available context |
| 4. Save event (async) | EXISTS | eventLog.ts | IndexedDB write |
| 5. Fire event hooks (async) | EXISTS | detectionIntegration.ts | Milestone, fame, narrative hooks |
| 6. Update game state (0ms) | EXISTS | useGameState.ts | State updated |
| 7. Update display (0ms) | EXISTS | GameTracker.tsx | UI re-renders |
| <10ms total blocking time | UNVERIFIED | — | No performance tests |

**Note:** The execution flow conceptually exists but is triggered through EnhancedInteractiveField's `onPlayComplete` callback, not through a Quick Bar tap. The steps happen but via a different input path.

### §3.3 — Undo System

| Spec Requirement | Code Status | Location | Notes |
|---|---|---|---|
| Stack of events (10-state depth, configurable) | DIFFERENT | GameTracker.tsx:413 | `useUndoSystem(5, handleUndo)` — depth is 5, not 10 |
| Pressing undo: pops last event, reverses state | EXISTS | UndoSystem.tsx + GameTracker.tsx:395-411 | handleUndo calls restoreState with snapshot |
| No "are you sure?" confirmations | EXISTS | UndoSystem.tsx | Immediate action |
| Undo button top-left, shows remaining: "↩ N" | EXISTS | GameTracker.tsx:2636 | `<undoSystem.UndoButtonComponent />` floating top-left over field |
| Snapshots BEFORE: play outcome, substitution, inning end | EXISTS | GameTracker.tsx:896, 919, 933, 1251 | captureSnapshot() called before plays and subs |
| NOT undoable: Game end (requires confirmation) | UNVERIFIED | — | End game has confirmation modal (setShowEndGameConfirmation) but no explicit undo blocking |

### §3.4 — End-of-Inning Auto-Detection

| Spec Requirement | Code Status | Location | Notes |
|---|---|---|---|
| Detect 3 outs from outcome types | EXISTS | useGameState.ts | Out counting from result types |
| K=1, GO=1, FO=1, LO=1, PO=1 out | EXISTS | useGameState.ts | Standard outs handled |
| DP=2 outs, TP=3 outs | EXISTS | useGameState.ts | Multi-out plays handled |
| CS/pickoff = 1 out | EXISTS | useGameState.ts | Between-play outs |
| outs === 3 → auto inning change | EXISTS | useGameState.ts | Automatic transition |
| Optional between-inning summary screen | MISSING | — | No between-inning summary component |

### §3.5 — Runner Override Scenarios

| Spec Requirement | Code Status | Location | Notes |
|---|---|---|---|
| FO with R3 + <2 outs → "Sac fly — run scores?" prompt | UNVERIFIED | EnhancedInteractiveField | Field has runner outcome handling but spec's specific inline prompt not confirmed |
| GO that isn't DP: tap FC from overflow | DIFFERENT | — | No Quick Bar overflow; FC available in EnhancedInteractiveField play types |
| Per C-017: GO→DP correction manual via play log | UNVERIFIED | — | No auto-correction confirmed; play log edit capability unclear |
| GO with R3 only: tap R3 on diamond → [Score] or [Out at home] | EXISTS | EnhancedInteractiveField | Runner tap interactions exist on diamond |
| Error: E → base selection → fielder → error type (3-4 taps) | DIFFERENT | GameTracker.tsx:1120-1200 | Error-on-advance detection exists but flow is different (auto-infer vs prompt sequence) |
| No correction requires >3 taps | UNVERIFIED | — | Cannot verify without running app |

### §3.7 — iPad Layout

| Spec Requirement | Code Status | Location | Notes |
|---|---|---|---|
| iPad landscape primary platform | EXISTS | GameTracker.tsx | Layout designed for landscape |
| Fenway Board (top-left): scoreboard + context | EXISTS | GameTracker.tsx:2418-2641 | MiniScoreboard with pitcher/batter context cards; no "Fenway Board" branding |
| Diamond (center): runner positions, tap actions | EXISTS | EnhancedInteractiveField | Full-screen interactive diamond |
| Play Log (right panel): recent plays + enrichment | UNVERIFIED | — | Play log exists in disabled section; unclear if active in current UI |
| Quick Bar (bottom left, thumb zone) | MISSING | — | No Quick Bar in active UI |
| Modifier/Action (bottom right) | MISSING | — | No modifier zone in active UI |
| 5-zone layout per spec diagram | DIFFERENT | GameTracker.tsx | Layout is: scoreboard (top) → full-screen field (center) → disabled panels (below) |

### §3 Gap Tickets

**GAP-GT-3-A:** ✅ RESOLVED — Build the spec's 5-zone layout (§3.7)
- **The spec already defines this.** §3.7 specifies the full iPad layout with 5 zones:
  - **Fenway Board** (top-left): Scoreboard + pitcher/batter context + matchup history + milestone proximity
  - **Diamond Display** (center): Runner positions, tap runner to act, tap field to enrich
  - **Play Log** (right panel): Recent plays with enrichment badges ([+fielding] [+location]), tap to enrich/edit
  - **Quick Bar** (bottom-left, thumb zone): K, GO, FO, LO, 1B, BB, 2B, HR, [···] overflow — replaces the current EnhancedInteractiveField as PRIMARY input
  - **Modifier/Action** (bottom-right): Fielding enrichment, modifiers, runner actions
- **Existing EnhancedInteractiveField assets to reuse:** Ball location, fielder icon tap sequences, fielding sequence capture, runner drag/adjust, spray sector, exit type, play difficulty, error tracking, HR distance. These become the enrichment interaction (§4) triggered from the play log, not the primary input.
- **PlayData interface already captures the enrichment data** — fieldingSequence, ballLocation, errorType/Fielder, exitType, spraySector, sprayDirection, hrDistance, runnerOutcomes, dpType, playDifficulty
- Effort: L | Route: Claude Code CLI \| opus (restructure GameTracker.tsx to 5-zone layout, build QuickBar component, rewire field as enrichment surface, build Fenway Board with matchup context)

**GAP-GT-3-B:** Undo stack depth: 5 → 10 (configurable) | Effort: S | Route: Claude Code | sonnet
- GameTracker.tsx:413 — change `useUndoSystem(5, handleUndo)` to `useUndoSystem(10, handleUndo)`

**GAP-GT-3-C:** Implement between-inning summary screen | Effort: M | Route: Claude Code | opus
- Create component showing inning recap when outs reach 3
- Per spec §16.5 (optional)

**GAP-GT-3-D:** Implement HR inline distance + pitch type capture | Effort: M | Route: Claude Code | opus
- When HR is recorded, show inline prompts for distance and pitch type
- Both optional — user can dismiss

**GAP-GT-3-E:** Implement K/Kc toggle (if Quick Bar adopted) | Effort: S | Route: Claude Code | sonnet
- Single K button with toggle to distinguish swinging vs looking

**GAP-GT-3-F:** Add WP_K and PB_K to AtBatResult and overflow menu | Effort: S | Route: Claude Code | sonnet
- Hybrid outcome types per spec

**GAP-GT-3-G:** Implement error enrichment flow (E → base → fielder → type) | Effort: M | Route: Claude Code | opus
- Spec requires: "Batter reached which base?" → "Error by?" → "Error type?"
- Code has auto-inference for error-on-advance but no manual enrichment sequence

**GAP-GT-3-H:** Implement sac fly prompt for FO with R3 | Effort: S | Route: Claude Code | sonnet
- "Sac fly — run scores?" YES/NO when FO with R3 and <2 outs

**GAP-GT-3-I:** Implement play log correction capability | Effort: M | Route: Claude Code | opus
- Spec says corrections happen "via play log"
- Need editable play log entries

**GAP-GT-3-J:** Game end undo prevention | Effort: S | Route: Claude Code | sonnet
- Spec: game end NOT undoable (requires confirmation)
- Need to clear undo stack or disable undo after game completion

---

## Summary

### §2 Event Model Coverage

| Group | Spec Fields | Code Fields | Coverage |
|-------|-------------|-------------|----------|
| Identity | 7 | 4 | 57% |
| User Input (AtBatResult) | 21 values | 18 values | 86% |
| Auto-Captured (gameState) | 5 | 5 | 100% (flat vs nested) |
| Team Context | 10 | 2 (partial) | 20% |
| Leverage & WP | 3 | 3 | 100% |
| Batter Context | 16 | 2 | 13% |
| Pitcher Context | 15 | 2 | 13% |
| Matchup Context | 4 | 0 | 0% |
| Park Context | 4 | 0 | 0% |
| Computed | 7 | 3 | 43% |
| Enrichment | 10 | 1 (partial) | 10% |
| Versioning | 2 | 0 | 0% |
| **Total AtBatEvent** | **~93** | **~24** | **~26%** |

| Interface | Status |
|-----------|--------|
| AtBatEvent | 26% — core exists, missing context snapshots and enrichment |
| BetweenPlayEvent | 0% — not implemented (GameEvent type covers some ground) |
| TransactionEvent | 0% — not implemented |
| GameRecord | ~25% — CompletedGameRecord has basics, missing lineups/narrative |

### §3 GameTracker 1-Tap Coverage

| Area | Status |
|------|--------|
| Quick Bar (primary input) | **ARCHITECTURAL MISMATCH** — spec: Quick Bar, code: EnhancedInteractiveField |
| 1-Tap Flow | EXISTS (conceptually, via different input path) |
| Undo System | EXISTS (depth 5 vs spec 10) |
| End-of-Inning Detection | EXISTS |
| Runner Overrides | PARTIAL — diamond interaction exists but spec's prompt flows differ |
| iPad Layout | PARTIAL — scoreboard + field exist but 5-zone layout not implemented |

### Total Gap Tickets: 30

| ID | Description | Effort | Priority |
|---|---|---|---|
| GAP-GT-2-A | Add seasonId/franchiseId/leagueId to AtBatEvent | S | HIGH |
| GAP-GT-2-B | Rename sequence → eventIndex | S | LOW |
| GAP-GT-2-C | Add teamContext group | M | MEDIUM |
| GAP-GT-2-D | Add batterContext snapshot (14 fields) | L | HIGH |
| GAP-GT-2-E | Add pitcherContext snapshot (13 fields) | L | HIGH |
| GAP-GT-2-F | Add matchupContext group | M | LOW |
| GAP-GT-2-G | Add parkContext group | S | LOW |
| GAP-GT-2-H | Add computed fields (runnerOutcomes, outsRecorded, isQualityAtBat, milestoneTriggered) | M | MEDIUM |
| GAP-GT-2-I | Fix runsScored: number → string[] | S | MEDIUM |
| GAP-GT-2-J | Add enrichment fields (10) | M | LOW |
| GAP-GT-2-K | Add versioning (version + editHistory) | S | LOW |
| GAP-GT-2-L | Fix AtBatResult: KL→Kc, add WP_K/PB_K | S | HIGH |
| GAP-GT-2-M | Implement BetweenPlayEvent interface | L | HIGH |
| GAP-GT-2-N | Implement TransactionEvent interface | M | LOW (franchise-level) |
| GAP-GT-2-O | Implement GameRecord matching spec | M | MEDIUM |
| GAP-GT-2-P | Reconcile MojoLevel (numeric → string) | S | MEDIUM |
| GAP-GT-2-Q | Reconcile FitnessLevel (UPPERCASE → PascalCase) | S | MEDIUM |
| GAP-GT-2-R | Implement FameLevel type | S | MEDIUM |
| GAP-GT-2-S | Implement HiddenModifiers interface | S | LOW |
| GAP-GT-2-T | Reconcile PitcherRole (5-value spec enum) | S | MEDIUM |
| GAP-GT-3-A | ✅ RESOLVED: Hybrid Quick Bar + Field | L | HIGH |
| GAP-GT-3-B | Undo stack depth 5 → 10 | S | LOW |
| GAP-GT-3-C | Between-inning summary screen | M | LOW |
| GAP-GT-3-D | HR inline distance + pitch type capture | M | MEDIUM |
| GAP-GT-3-E | K/Kc toggle | S | HIGH (if Quick Bar) |
| GAP-GT-3-F | Add WP_K, PB_K to overflow | S | MEDIUM |
| GAP-GT-3-G | Error enrichment flow (E → base → fielder → type) | M | MEDIUM |
| GAP-GT-3-H | Sac fly prompt for FO with R3 | S | HIGH |
| GAP-GT-3-I | Play log correction capability | M | MEDIUM |
| GAP-GT-3-J | Game end undo prevention | S | MEDIUM |

### Effort Summary
- **S (Small):** 15 tickets
- **M (Medium):** 10 tickets
- **L (Large):** 5 tickets (AtBatEvent batter/pitcher context, BetweenPlayEvent, Quick Bar hybrid implementation)

---

## Remaining Sessions

- **Session 2:** §4 Enrichment + §5 Between-Play Events + §6 Baseball Rules
- **Session 3:** §7 Substitution System + consolidate full gap list
