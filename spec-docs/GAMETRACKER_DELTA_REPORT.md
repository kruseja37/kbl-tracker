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

---

# SESSION 2: §4 Enrichment + §5 Between-Play Events + §6 Baseball Rules

**Date:** 2026-03-06
**Context:** GAP-GT-3-A RESOLVED — Hybrid Quick Bar (primary WHAT input) + EnhancedInteractiveField (enrichment WHERE/WHO surface). EnhancedInteractiveField already captures: ballLocation, fieldingSequence, errorType/Fielder, exitType, spraySector, runnerOutcomes, dpType, playDifficulty, hrDistance. These are enrichment assets.

---

## §4 Enrichment System

### §4.2 Play Log Entry Point

**Spec:** Scrollable play log showing each completed play (e.g., "T7 Hayata 1B [+fielding] [+location]"). Tapping any entry opens enrichment panel. K/Kc and pitches badges always shown.

**Code:**
- `activityLog` state exists at GameTracker.tsx:237 — entries pushed via `pushActivityLog()`
- Entries ARE logged (fielding events at GT:1385, fame events at GT:271)
- But `activityLog` is **NOT rendered** in the UI — only passed to `endGameOptions` at GT:2214 for game completion
- No enrichment panel exists to tap into from play log
- No K/Kc badge — code uses 'K' and 'KL' (not Kc), no UI prompt for distinction
- No [pitches?] badge

| Requirement | Status | Evidence |
|---|---|---|
| Scrollable play log visible in UI | MISSING | activityLog state exists but not rendered |
| Tap entry → enrichment panel | MISSING | No enrichment panel component |
| K/Kc badge on strikeouts | MISSING | No K→Kc distinction UI |
| [pitches?] badge on all plays | MISSING | No badge UI |

**GAP-GT-4-A:** Build visible Play Log component with enrichment panel entry point (L)
**GAP-GT-4-B:** Add K/Kc toggle badge on strikeout plays (S) — ties to GAP-GT-3-E

### §4.3 Enrichment Types

**Spec:** Field location, fielding sequence, HR distance, pitch type, pitch count per AB, pitch count per half-inning, modifiers.

**Code — Enrichment assets that EXIST (via EnhancedInteractiveField):**

| Enrichment | Status | Evidence | Notes |
|---|---|---|---|
| Field Location / Spray Chart | DIFFERENT | PlayData has `spraySector`, `sprayDirection`, `ballLocation` in EnhancedInteractiveField | Captured via drag-drop on full field, not via "tap mini-diamond" from play log. These become post-hoc enrichment assets once Play Log exists. |
| Fielding Sequence | DIFFERENT | `fieldingSequence` array in PlayData | Captured via drag-drop, not "tap numbered fielder icons in order" from play log. Same resolution as above. |
| HR Distance | DIFFERENT | `hrDistance?: number` in PlayData, set at EnhancedInteractiveField | Field exists but no standalone numeric input form — collected as part of field interaction flow. |
| Pitch Type selector | MISSING | — | `pitchType` only in LeagueBuilder context (player abilities). No per-at-bat pitch type recording. No 4F\|2F\|CF\|SL\|CB\|CH\|SB\|FK\|UNK selector. |
| Pitch Count Per At-Bat | PARTIAL | `pitchCount` param on `recordHit()`, `recordOut()`, etc. (useGameState.ts:190-194) | Field plumbed through recording functions. No QAB (7+ pitch = quality AB) detection logic found. |
| Pitch Count Per Half-Inning | EXISTS | PitchCountModal inline in GameTracker.tsx:3571. Prompts for types: 'end_inning', 'pitching_change', 'end_game' | ✅ Modal prompts at inning end, pitcher change, game end. Includes immaculate inning detection (GT:3870). |
| Modifiers | EXISTS | ModifierButtonBar component, `activeModifiers` Set in EnhancedInteractiveField | Nut shot, killed, TOOTBLAN etc. working. web_gem correctly NOT a modifier. |

**GAP-GT-4-C:** Add pitch type selector (4F\|2F\|CF\|SL\|CB\|CH\|SB\|FK\|UNK) per at-bat, filtered by pitcher repertoire (M)
**GAP-GT-4-D:** Add QAB detection — 7+ pitches = quality at-bat regardless of outcome (S)

### §4.4 Enrichment Timing

| Timing | Status | Evidence |
|---|---|---|
| Immediately after play | DIFFERENT | EnhancedInteractiveField captures enrichment inline during play recording, not from play log after. Works, but different UX. |
| Between innings prompt | MISSING | No between-inning screen showing unenriched plays |
| After game enrichment count | MISSING | No post-game screen with unenriched count |
| Never (core stats still correct) | EXISTS | Core counting stats work without enrichment ✅ |

**GAP-GT-4-E:** Build between-inning enrichment prompt for unenriched plays (M)
**GAP-GT-4-F:** Build post-game enrichment summary with unenriched count (S)

### §4.5 Enrichment for Positional Tracking

**Spec:** Every at-bat records batter's current position and defensive alignment. Every fielding enrichment tagged with fielder's position. Position changes as between-play events. IFR as modifier on PO.

| Requirement | Status | Evidence |
|---|---|---|
| Batter position per at-bat | PARTIAL | `batterFieldingPosition` collected at GT:886 area. Not confirmed persisted to AtBatEvent. |
| Defensive alignment per at-bat | MISSING | No alignment snapshot recorded per event |
| Fielding enrichment tagged with position | PARTIAL | fieldingSequence uses position numbers but not player-position mapping |
| IFR as modifier on PO | PARTIAL | IFR in modifier buttons. No auto-prompt when PO + R1+R2/loaded + <2 outs. |

**GAP-GT-4-G:** Persist batter position + defensive alignment to AtBatEvent (S) — ties to GAP-GT-2-E
**GAP-GT-4-H:** Auto-prompt IFR when PO with R1+R2 or bases loaded and <2 outs (S)

---

## §5 Between-Play Events

### §5.1 Runner Actions

**Spec:** Tapping runner on diamond opens popover: [Steal] [Pickoff] [Wild Pitch] [Passed Ball] [Advance ▼]

**Code:**
- EnhancedInteractiveField uses **drag-drop** for runners, not tap-to-popover
- ActionSelector.tsx provides SB, CS, PK, WP, PB buttons — but these are in the EnhancedInteractiveField action panel, NOT triggered by tapping a runner
- No runner tap → popover menu exists

| Action | Status | Evidence | Notes |
|---|---|---|---|
| Runner tap → popover | MISSING | — | Drag-drop exists, not tap-to-menu per spec |
| Steal (SB/CS) | EXISTS | ActionSelector.tsx:89-90, EnhancedInteractiveField:3249-3285 | Routes through RUNNER_CONFIRM flow. 1-2 taps via modal. |
| Pickoff (PK) | EXISTS | ActionSelector.tsx:91, routed through RUNNER_CONFIRM | Sub-options in RunnerOutcomesDisplay |
| Wild Pitch (WP) | DIFFERENT | EnhancedInteractiveField:3208-3247 | Auto-advances all runners one base. Spec allows "tap destination" option too. |
| Passed Ball (PB) | DIFFERENT | EnhancedInteractiveField:3208-3247 | Same as WP — auto-advance only, no destination choice. |
| Steal → mWAR decision | EXISTS | mwarIntegration.ts — `steal_call` decision type | ✅ Manager decision tracking |

**GAP-GT-5-A:** Runner tap → popover menu with [Steal] [Pickoff] [WP] [PB] [Advance] (M) — depends on Quick Bar architecture (GAP-GT-3-A resolved: field is enrichment surface, so runner tap popover fits)
**GAP-GT-5-B:** WP/PB: add "tap destination" option for non-standard advances (S)

### §5.2 Substitutions

**Spec:** Two entry points: (a) Lineup card (comprehensive drag-drop), (b) Diamond tap → [Substitute] → select from roster.

| Entry Point | Status | Evidence |
|---|---|---|
| Lineup card (comprehensive) | EXISTS | LineupCard.tsx — drag-drop lineup management, SubstitutionData includes 'player_sub'\|'position_swap'\|'pitching_change'\|'double_switch' |
| Diamond tap (quick contextual) | PARTIAL | PlayerCardModal at GT:3419-3425 has onMojoChange/onFitnessChange but no explicit [Substitute] popover entry |

**GAP-GT-5-C:** Add [Substitute] option to diamond tap PlayerCardModal (S)

### §5.3 Manager Moments

**Spec:** When LI ≥ 2.0, mark as Manager Moment. Subtle visual indicator (pulsing border or ⚡). Track across season.

**Code:** ✅ **FULLY IMPLEMENTED**
- `checkManagerMoment()` at mwarIntegration.ts:158 — triggers when LI ≥ threshold
- UI notification at GT:2313-2347 — ⚡ MANAGER MOMENT banner with LI display, decision recording, dismiss button
- `recordDecision()` wired at GT:2334 — records decision type with game state
- Season tracking: managerStorage.ts persists decisions. useMWARCalculations.ts tracks state.
- `inferRelevantDecisionType()` at mwarIntegration.ts:170 auto-infers decision type from game state

| Requirement | Status | Evidence |
|---|---|---|
| LI threshold detection | EXISTS | mwarIntegration.ts:158, HIGH_LEVERAGE_THRESHOLD |
| Visual indicator | EXISTS | GT:2313 — ⚡ banner (spec says "pulsing border or ⚡") |
| Decision recording | EXISTS | GT:2334 `recordDecision()` |
| Season tracking | EXISTS | managerStorage.ts, useMWARCalculations hooks |
| Best/Worst Moment | UNVERIFIED | Not confirmed in season aggregation |

**GAP-GT-5-D:** Verify Manager Moment best/worst WPA tracking in season aggregation (S)

### §5.4 Pitcher Changes

**Spec:** Pitcher name in scoreboard always tappable → [Change Pitcher]. Records outgoing pitch count, IP, inherited runners.

**Code:**
- PITCH_CHANGE event type at game.ts:16 ✅
- PitchingChangeEvent type at substitution.ts:112 ✅
- LineupCard bullpen section handles pitching changes ✅
- PitchCountModal prompts for outgoing pitcher's count on change ✅
- **Tappable pitcher name in scoreboard:** UNVERIFIED — not confirmed if scoreboard pitcher name is tappable

**GAP-GT-5-E:** Verify/add tappable pitcher name in scoreboard → [Change Pitcher] flow (S)

### §5.5 Position Changes (Non-Substitution)

**Spec:** Player moves SS→3B mid-game (no new player). Diamond tap → [Move Position]. Tracks innings at each position.

**Code:**
- POS_SWITCH type at game.ts:16 ✅
- PositionSwitchEvent type at substitution.ts:208 ✅
- **UI entry point "diamond tap → [Move Position]":** NOT FOUND in EnhancedInteractiveField
- Innings-at-position tracking: NOT VERIFIED

**GAP-GT-5-F:** Add [Move Position] to diamond tap popover for non-substitution position changes (S)
**GAP-GT-5-G:** Track innings at each position for Gold Glove / dWAR (M)

### §5.6 Mojo & Fitness Changes

**Spec:** Player tokens on diamond tappable → state popover. Changes save as BetweenPlayEvent.

**Code:** ✅ **IMPLEMENTED**
- PlayerCardModal at GT:3419-3425 with onMojoChange/onFitnessChange
- playerStateIntegration.ts:481-524 — saves as 'mojo_change' and 'fitness_change' event types
- `setMojo()` and `setFitness()` at GT:843,848

No gap — this is working.

---

## §6 Baseball Rules & Logic

### §6.1 Game Structure

**Status:** EXISTS ✅
- 9-inning games with configurable innings via LeagueBuilderRules
- Extra innings with configurable rules (standard, runner_on_second, sudden_death) at franchise.ts
- Top/bottom, 3 outs per half — auto-end on 3rd out at useGameState.ts:2650-2654
- Home team bats bottom — standard in game state

### §6.2 At-Bat Results

**Status:** DIFFERENT ⚠️ (already detailed in Session 1 GAP-GT-2-B)

Spec: `'K'|'Kc'|'GO'|'FO'|'LO'|'PO'` + `'WP_K'|'PB_K'`
Code: `'K'|'KL'|'GO'|'FO'|'LO'|'PO'|'D3K'` — no Kc, no WP_K/PB_K

Covered by GAP-GT-2-B — no new ticket needed.

### §6.3 Run Scoring & Third Out Exceptions

**Status:** EXISTS ✅

**Key functions in useGameState.ts:**
- `shouldInvalidateRunsOnThirdOut()` at line 700 — checks:
  - `outsAfterPlay < 3` → no invalidation
  - GO (batter out before 1B) → invalidate ALL runs ✅
  - Any `isForceOutRunner()` → invalidate ALL runs ✅
- `isForceOutRunner()` at line 682 — implements force chain:
  - R1 always forced ✅
  - R2 forced if R1 occupied ✅
  - R3 forced if R1 + R2 occupied ✅
- Called from `recordOut` at line 2477 — wired correctly

| Requirement | Status | Evidence |
|---|---|---|
| Batter out before 1B → no runs | EXISTS | useGameState.ts:711 `if (outType === 'GO') return true` |
| Force out → no runs | EXISTS | useGameState.ts:716-720 checks all 3 bases |
| Force chain rule | EXISTS | isForceOutRunner():682-698 |
| Time play (tag out timing) | MISSING | No timing logic for "runner crossed before tag" |

**GAP-GT-6-A:** Time play rule — runner scores if crossed home before tag on non-force 3rd out (S) — edge case, low priority for SMB4

### §6.4 RBI Credit Rules

**Status:** EXISTS ✅ (mostly)

`calculateRBIs()` at useGameState.ts:652:
- Counts SCORED runners from outcomes ✅
- HR → all runners + batter ✅
- Errors → 0 RBI ✅
- DP/TP → 0 RBI ✅
- BB/HBP/IBB force-in: Implicit — forced runner advancement naturally produces SCORED outcome, function counts it ✅
- WP/PB no RBI: Moot — WP/PB are between-play events, not at-bat results, so they don't flow through calculateRBIs() ✅

No gap needed — logic is correct.

### §6.5 Runner Advancement Defaults

**Status:** EXISTS ✅ (verified in Session 1)

- Hit defaults: runnerDefaults.ts:99-157 — all correct
- Walk/HBP forced advancement: runnerDefaults.ts:323-355 — chain correct

No gap needed.

### §6.6 Special Plays

| Special Play | Status | Evidence | Notes |
|---|---|---|---|
| D3K legality | EXISTS | d3kTracker.ts:118-125 | 1B unoccupied OR 2 outs ✅ |
| D3K as K+WP / K+PB / K+E2 | DIFFERENT | D3K is separate result type, not hybrid | Covered by GAP-GT-2-B |
| IFR detection | PARTIAL | game.ts:86 `infieldFlyRule` field, test file exists | No auto-detection logic implemented |
| Sacrifice Fly rules | PARTIAL | OutcomeButtons.tsx:202-204 | SF disabled when !bases.third ✅. MISSING: outs ≥ 2 check |
| Sacrifice Bunt rules | PARTIAL | OutcomeButtons.tsx:199-201 | SAC disabled when outs ≥ 2 ✅. MISSING: runner on base check |
| Ground Rule Double | MISSING | — | No GRD type or runner advancement logic |
| Tag-Up rule | MISSING | — | No "return to base before advancing" enforcement |

**GAP-GT-6-B:** SF button: add outs ≥ 2 disable check (S)
**GAP-GT-6-C:** SAC button: add "no runners on base" disable check (S)
**GAP-GT-6-D:** Add GRD (Ground Rule Double) result type + 2-base runner advancement (M)
**GAP-GT-6-E:** Tag-up enforcement on fly outs — runners must return before advancing (M) — may be low priority for SMB4 where engine handles this

### §6.7 Statistical Definitions

**Status:** EXISTS ✅

- AVG, OBP, SLG, OPS, ERA, WHIP — standard formulas in bwarCalculator and stat engines
- IP stored as outsRecorded / 3 ✅
- `isAB` at eventLog.ts:681: `!['BB', 'HBP', 'SF', 'SH'].includes(result)` — DIFFERENT: uses 'SH' instead of 'SAC', missing 'IBB'

**GAP-GT-6-F:** Fix isAB filter: add 'IBB', change 'SH' to 'SAC' to match spec types (S)

### §6.8 Button Availability Rules

**Status:** PARTIAL ⚠️

| Rule | Spec | Code | Status |
|---|---|---|---|
| SAC: disabled when 2 outs | ✅ | OutcomeButtons.tsx:199-201 | EXISTS |
| SF: disabled when 2 outs OR no R3 | Only !bases.third | OutcomeButtons.tsx:202-204 | PARTIAL — missing outs check |
| DP: disabled when 2 outs OR no runners | Only !hasRunners | OutcomeButtons.tsx:185-188 | PARTIAL — missing outs check |
| TP: disabled when <2 runners | Only !hasRunners | OutcomeButtons.tsx:186-188 | DIFFERENT — should be <2 runners not 0 runners |
| D3K: disabled when 1B occupied AND <2 outs | Not found | — | MISSING |

**GAP-GT-6-G:** Fix button availability: SF add outs≥2 check, DP add outs≥2 check, TP require ≥2 runners, D3K disable when 1B occupied & <2 outs (S)

---

## Session 2 Gap Summary

### New Gap Tickets (Session 2)

| ID | Description | Effort | Priority | Section |
|----|-------------|--------|----------|---------|
| GAP-GT-4-A | Build visible Play Log component with enrichment panel entry | L | HIGH | §4.2 |
| GAP-GT-4-B | K/Kc toggle badge on strikeout plays | S | HIGH | §4.2 |
| GAP-GT-4-C | Pitch type selector per at-bat (4F\|2F\|CF etc.), filtered by repertoire | M | MEDIUM | §4.3 |
| GAP-GT-4-D | QAB detection — 7+ pitches = quality at-bat | S | LOW | §4.3 |
| GAP-GT-4-E | Between-inning enrichment prompt for unenriched plays | M | MEDIUM | §4.4 |
| GAP-GT-4-F | Post-game enrichment summary with unenriched count | S | LOW | §4.4 |
| GAP-GT-4-G | Persist batter position + defensive alignment per AtBatEvent | S | MEDIUM | §4.5 |
| GAP-GT-4-H | Auto-prompt IFR when PO + R1+R2/loaded + <2 outs | S | MEDIUM | §4.5 |
| GAP-GT-5-A | Runner tap → popover menu (Steal/Pickoff/WP/PB/Advance) | M | HIGH | §5.1 |
| GAP-GT-5-B | WP/PB: add "tap destination" for non-standard advances | S | LOW | §5.1 |
| GAP-GT-5-C | Add [Substitute] option to diamond tap PlayerCardModal | S | MEDIUM | §5.2 |
| GAP-GT-5-D | Verify Manager Moment best/worst WPA in season aggregation | S | LOW | §5.3 |
| GAP-GT-5-E | Verify/add tappable pitcher name in scoreboard → Change Pitcher | S | MEDIUM | §5.4 |
| GAP-GT-5-F | Add [Move Position] to diamond tap popover | S | MEDIUM | §5.5 |
| GAP-GT-5-G | Track innings at each position for Gold Glove / dWAR | M | MEDIUM | §5.5 |
| GAP-GT-6-A | Time play rule — runner scores if crossed home before tag | S | LOW | §6.3 |
| GAP-GT-6-B | SF button: add outs ≥ 2 disable check | S | HIGH | §6.6 |
| GAP-GT-6-C | SAC button: add "no runners" disable check | S | HIGH | §6.6 |
| GAP-GT-6-D | GRD (Ground Rule Double) result type + 2-base advancement | M | MEDIUM | §6.6 |
| GAP-GT-6-E | Tag-up enforcement on fly outs | M | LOW | §6.6 |
| GAP-GT-6-F | Fix isAB filter: add IBB, change SH→SAC | S | HIGH | §6.7 |
| GAP-GT-6-G | Fix button availability: SF/DP outs check, TP ≥2 runners, D3K | S | HIGH | §6.8 |

### Session 2 Effort Summary
- **S (Small):** 14 tickets
- **M (Medium):** 6 tickets
- **L (Large):** 2 tickets (Play Log + enrichment panel)

### Cumulative Totals (Sessions 1+2)
- **Session 1:** 30 gap tickets (S:15, M:10, L:5)
- **Session 2:** 22 gap tickets (S:14, M:6, L:2)
- **Total so far:** 52 gap tickets

---

# SESSION 3: §7 Substitution System + Consolidation

**Date:** 2026-03-06
**Note:** Double switch was REMOVED in v1 triage, replaced with batting order swap. Double switch references in code are artifacts — not a gap.

---

## §7 Substitution System

### §7.1 Substitution Types

| Type | Status | Evidence | Notes |
|---|---|---|---|
| Pinch Hitter (PINCH_HIT) | EXISTS | substitution.ts:129-137, useGameState.ts:3574-3620 | Type + handler ✅ |
| Pinch Runner (PINCH_RUN) | EXISTS | substitution.ts:143-155, useGameState.ts:3695 | Type + handler, tracks pitcher responsibility ✅ |
| Defensive Sub (DEF_SUB) | EXISTS | substitution.ts:170-173 | Type defined, stored in substitutionLog ✅ |
| Pitching Change (PITCH_CHANGE) | EXISTS | substitution.ts:111-122 | Complete: bequeathedRunners, inheritedRunners, outgoingPitchCount ✅ |
| Position Swap (POS_SWITCH) | EXISTS | substitution.ts:207-210 | Single event with array of switches (not two events) ✅ |
| Double Switch | N/A | — | Removed in v1 triage — code has artifact `double_switch` in SubstitutionData. Not a gap. |

### §7.2 Entry Points (Per C-002)

**Spec:** Two entry points: (a) Lineup card with drag-drop, (b) Diamond tap → [Substitute] → select from roster.

| Entry Point | Status | Evidence | Notes |
|---|---|---|---|
| Lineup Card (comprehensive) | EXISTS | LineupCard.tsx:1-150, GT:2804-2923 | Fully wired: drag-drop bench→lineup, current batter card (GT:3381), current pitcher drop zone (GT:3385), bullpen section (GT:2853-2923) ✅ |
| Bullpen panel for relievers | EXISTS | GT:2853-2923 | Separate section, wired to changePitcher() ✅ |
| Diamond Tap → [Substitute] | MISSING | — | 6 modal files (PinchHitterModal, PinchRunnerModal, DefensiveSubModal, PitchingChangeModal, PositionSwitchModal, DoubleSwitchModal) exist in INACTIVE `src/components/GameTracker/` but are NOT rendered in active GameTracker.tsx |

**SubstitutionModalBase infrastructure EXISTS** in active path:
- `src/src_figma/app/components/modals/SubstitutionModalBase.tsx` — Base component with 9 reusable sub-components (ModalSection, PlayerSelect, PositionSelect, NumberInput, etc.)
- `src/src_figma/app/components/modals/index.ts` — All helpers exported

**GAP-GT-7-A:** Wire diamond tap → substitution flow using SubstitutionModalBase + modals (M)
- SubstitutionModalBase already exists in active path
- 6 specific modals exist in INACTIVE path — need porting to src_figma/app/components/modals/
- Wire PlayerCardModal to show [Substitute] option → open appropriate modal
- Ties to GAP-GT-5-C (add [Substitute] to PlayerCardModal)

### §7.3 Pinch Runner Critical Rule

**Spec:** PR replaces baserunner but pitcher responsibility does NOT change. If PR scores, run charged to pitcher who allowed original batter.

**Status:** EXISTS ✅

- `inheritedRunnerTracker.ts:366-404` — `handlePinchRunner()` copies `responsiblePitcherId` from original runner (line 383-384): "Keep the same pitcher responsibility!"
- `inheritedRunnerTracker.ts:222-225` — When runner scores: `chargedToPitcherId: runner.responsiblePitcherId` → ER attributed to original pitcher
- `responsiblePitcherId` tracked throughout useGameState.ts runner state (lines 777-807)

No gap — correctly implemented.

### §7.4 Pitching Change Flow

| Step | Status | Evidence | Notes |
|---|---|---|---|
| 1. Pitch count from outgoing pitcher | EXISTS | PitchCountModal at GT:3571, prompted at GT:3752 before changePitcher() | ✅ Modal enforced |
| 2. Capture outgoing stats + inherited runners + IP | EXISTS | useGameState.ts:3747-3810 — logs outgoingPitcherId, pitchCount, inherited count | ✅ |
| 3. New pitcher init: isStarter=false, entryInning=current | EXISTS | PitcherGameStats:134 `isStarter: boolean`, :135 `entryInning: number` | ✅ |
| 4. Inherited runner ERA tracking | EXISTS | inheritedRunnerTracker.ts:207-225 — chargedToPitcherId = responsiblePitcherId | ✅ |
| 5. Manager decision logged for mWAR | EXISTS | GT:938-943 `mwarHook.recordDecision('pitching_change', ...)` | ✅ |

No gap — pitching change flow fully implemented.

### §7.5 Validation Constraints

| Constraint | Status | Evidence | Notes |
|---|---|---|---|
| noReEntry (each player enters once) | EXISTS | substitution.ts:57 `usedPlayers: string[]`, useGameState.ts:3640-3650 updates used set | ✅ |
| minLineupSize: 9, maxLineupSize: 9 | MISSING | — | No runtime validation that lineup stays at 9 |
| phMustBat: true (PH bats before position assigned) | MISSING | — | No validation preventing position assignment before PH bats |
| pitchCountRequired: true | EXISTS | GT:3752 PitchCountModal enforced on pitching change | ✅ |
| Player states: In Game / Available / Used | PARTIAL | LineupCard.tsx:95-150 — `isUsed` styling (gray, strikethrough) | Missing ❌ emoji on used players per spec |

**GAP-GT-7-B:** Add lineup size validation — min/max 9 enforcement on substitutions (S)
**GAP-GT-7-C:** Add PH-must-bat-first validation — block position assignment until PH has batted (S)
**GAP-GT-7-D:** Add ❌ emoji to used player display in lineup/bench (S)

---

## Session 3 Gap Summary

### New Gap Tickets (Session 3)

| ID | Description | Effort | Priority | Section |
|----|-------------|--------|----------|---------|
| GAP-GT-7-A | Wire diamond tap → substitution flow using SubstitutionModalBase + port modals | M | HIGH | §7.2 |
| GAP-GT-7-B | Lineup size validation — min/max 9 enforcement | S | MEDIUM | §7.5 |
| GAP-GT-7-C | PH-must-bat-first validation | S | MEDIUM | §7.5 |
| GAP-GT-7-D | Add ❌ emoji to used player display | S | LOW | §7.5 |

### Session 3 Effort Summary
- **S (Small):** 3 tickets
- **M (Medium):** 1 ticket
- **L (Large):** 0 tickets

### §7 Overall Assessment: **70-75% implemented**

**What WORKS (strong foundation):**
- All 5 substitution types defined with proper event types ✅
- LineupCard drag-drop fully wired (batter card, pitcher drop zone, bench, bullpen) ✅
- Pinch runner pitcher responsibility correctly tracked ✅
- Pitching change flow complete (pitch count modal, stats capture, inherited runner ER, mWAR) ✅
- No-reentry tracking with usedPlayers set ✅
- SubstitutionModalBase infrastructure ready in active path ✅

**What's MISSING (25-30%):**
- Diamond tap → substitution modals (6 modals orphaned in inactive path)
- Lineup size validation
- PH-must-bat-first validation
- ❌ emoji on used players

---

## FINAL CONSOLIDATED GAP SUMMARY (All 3 Sessions)

### By Session

| Session | Tickets | S | M | L |
|---------|---------|---|---|---|
| Session 1 (§2 + §3) | 30 | 15 | 10 | 5 |
| Session 2 (§4 + §5 + §6) | 22 | 14 | 6 | 2 |
| Session 3 (§7) | 4 | 3 | 1 | 0 |
| **TOTAL** | **56** | **32** | **17** | **7** |

*Note: GAP-GT-3-A RESOLVED (not counted). Actual actionable tickets: **55**.*

### By Spec Section

| Section | Tickets | Key Gap |
|---------|---------|---------|
| §2 Event Model | 20 | AtBatEvent 26% coverage → needs 70+ fields |
| §3 1-Tap Recording | 9 | 5-zone layout + Quick Bar |
| §4 Enrichment | 8 | Play Log + enrichment panel |
| §5 Between-Play | 7 | Runner tap popover |
| §6 Baseball Rules | 7 | Button availability, GRD, tag-up |
| §7 Substitution | 4 | Diamond tap modals |

### By Effort

| Effort | Count | Estimated Hours |
|--------|-------|----------------|
| S (Small) | 32 | ~32-48 hrs (1-1.5 hr each) |
| M (Medium) | 17 | ~34-68 hrs (2-4 hr each) |
| L (Large) | 7 | ~42-70 hrs (6-10 hr each) |
| **Total** | **56** | **~108-186 hrs** |

### Critical Path

1. **Layer 1 — Event Model (§2):** Must come first — all other layers depend on correct AtBatEvent shape
2. **Layer 2 — Quick Bar + Layout (§3):** Architectural change — 5-zone layout is the scaffold everything attaches to
3. **Layer 3 — Baseball Rules (§6):** Button availability + type fixes enable correct 1-tap recording
4. **Layer 4 — Between-Play + Subs (§5, §7):** Runner actions + substitution modals
5. **Layer 5 — Enrichment (§4):** Play log + enrichment panel — only possible after Quick Bar + layout exist

**See `GAMETRACKER_BUILD_PLAN.md` for ordered ticket list with dependencies.**
