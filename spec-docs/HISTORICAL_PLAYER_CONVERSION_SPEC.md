# Historical Player Conversion Spec

Status: Draft
Created: 2026-05-19
Owner: KBL Tracker

Implementation: first-pass TypeScript converter lives at `src/engines/historicalPlayerConverter.ts`.

## Purpose

Create an engine that converts a historical baseball player into an SMB4-style player profile with:

- ratings
- primary and secondary positions
- handedness
- pitcher role and arsenal when applicable
- traits
- age or career-stage mode
- confidence and source notes

The goal is not to make a perfect simulation of MLB history. The goal is to create an SMB4-compatible profile that reflects the historical player's real baseball identity under SMB4 constraints.

Current API:

```ts
resolveHistoricalPlayerByName(name, records)
percentileToSmb4Rating(percentile, fallback)
convertHistoricalPlayerToSmb4({ source, mode, playerKind, gradePolicy })
```

The converter intentionally expects era-adjusted percentile signals from a source adapter. It does not fetch live historical data or disambiguate every real-world player by itself.

## Core Principle

Historical conversion must be percentile-based, not raw-stat-based.

Raw historical stats are era-dependent. A dead-ball slugger, a steroid-era slugger, a high-mound pitcher, and a modern reliever cannot be mapped fairly with direct stat thresholds. The engine must compare the player to their league/era context first, then map percentile outcomes into SMB4 ratings.

## Scope

Version 1 supports:

- manual or pre-resolved source records
- hitters
- pitchers
- two-way historical players if source data supports both sides
- `career`, `peak`, and `hybrid` modes
- trait inference from statistical shape and known role

Version 1 does not require:

- live internet lookup
- automated disambiguation for every historical name
- pitch-level Statcast-era data
- exact season-by-season import UI

## Source Boundary

The converter should not start from a bare string internally. It should start from a resolved source record.

Flow:

```text
user enters name
  -> source adapter resolves candidate records
  -> user/app selects one resolved record
  -> converter maps resolved record to SMB4 profile
```

This keeps lookup, disambiguation, and conversion separate.

### Source Adapter Interface

```ts
export interface HistoricalPlayerSourceRecord {
  sourceId: string;
  sourceName: string;
  playerName: string;
  sourceIds?: Record<string, string>;
  provenance?: HistoricalSourceProvenance[];
  birthYear?: number;
  bats?: "R" | "L" | "S";
  throws?: "R" | "L";
  primaryPositions: string[];
  seasons: HistoricalSeasonRecord[];
  careerTotals?: HistoricalCareerTotals;
  awards?: string[];
  notes?: string[];
}
```

Implemented adapters:

- `createManualHistoricalSourceRecord(input)` wraps curated/manual records with source metadata and provenance.
- `buildHistoricalSourcesFromLahmanCsv(bundle, options)` accepts caller-provided Lahman-style CSV text for People, Batting, Pitching, and Fielding tables, computes local percentile signals, and returns converter-ready source records.

Possible future adapters:

- bundled static historical dataset
- Retrosheet event/context import
- Chadwick Register ID bridge
- Baseball Savant modern enrichment import
- future connector or online lookup with source attribution

Reliability contract:

- adapters should not silently fetch remote data
- records should carry source IDs and provenance
- raw stats should be converted into era/peer percentile signals before reaching the SMB4 converter
- weak inferred fields should remain visible through confidence notes

## Conversion Modes

### Career

Represents the player's long-run identity.

Use:

- career rates
- career playing-time weighted percentiles
- conservative trait assignment
- age set near representative prime, not debut or retirement

Best for:

- "make Babe Ruth"
- "make Ichiro"
- "make Greg Maddux"

### Peak

Represents the player's best short window.

Use:

- best 3-year or 5-year weighted peak
- percentile ranks from that window
- stronger elite traits
- higher grade target

Best for:

- "make 2001 Barry Bonds"
- "make peak Pedro Martinez"

### Hybrid

Balances career identity and peak shape.

Recommended default:

```text
hybrid_metric = 0.60 * peak_percentile + 0.40 * career_percentile
```

Best for:

- players with long careers and one iconic peak
- generated leagues where historical stars should feel great but not absurd

## Hitter Rating Mapping

### Required Inputs

Recommended source metrics:

- batting value percentile
- power percentile
- contact or bat-to-ball percentile
- plate discipline percentile
- speed or baserunning percentile
- defensive value percentile
- arm or position-adjusted throwing proxy
- position history

### SMB4 Ratings

```text
power = map_percentile(power_signal)
contact = map_percentile(contact_signal)
speed = map_percentile(speed_or_baserunning_signal)
fielding = map_percentile(defense_signal)
arm = map_percentile(arm_signal)
```

Recommended percentile-to-rating curve:

```text
rating = round(5 + 94 * sigmoid_or_spline(percentile))
```

Do not map percentiles linearly by default. SMB4 ratings should preserve separation at the top end while avoiding too many 99s.

Recommended anchors:

| Percentile | Rating |
|---:|---:|
| 1 | 5 |
| 10 | 20 |
| 25 | 38 |
| 50 | 55 |
| 75 | 72 |
| 90 | 86 |
| 97 | 95 |
| 99 | 99 |

### Hitter Signal Examples

Power signal candidates:

- isolated power percentile
- home-run rate percentile
- slugging relative to league
- extra-base-hit rate percentile

Contact signal candidates:

- strikeout avoidance percentile
- batting average relative to league
- contact rate if available
- hit tool scouting proxy

Speed signal candidates:

- stolen-base rate and success
- triples rate
- baserunning runs
- known speed profile notes

Fielding signal candidates:

- position-adjusted defensive runs
- fielding percentage only as weak fallback
- Gold Glove-style awards only as weak supporting signal
- position difficulty floor/ceiling adjustment

Arm signal candidates:

- outfield assists
- catcher caught stealing
- position-specific arm reputation
- fallback by primary position

## Pitcher Rating Mapping

### Required Inputs

Recommended source metrics:

- run prevention percentile
- strikeout dominance percentile
- walk suppression percentile
- home-run suppression percentile
- workload/stamina percentile
- pitch-style notes or pitch data
- role and games started/relief usage

### SMB4 Ratings

```text
velocity = map_percentile(power_pitching_signal)
junk = map_percentile(movement_or_deception_signal)
accuracy = map_percentile(command_signal)
```

Signal mapping:

- velocity: strikeout rate, fastball velocity when available, power-pitcher reputation
- junk: ground-ball tendency, pitch movement, off-speed effectiveness, weak-contact profile
- accuracy: walk suppression, command reputation, BB rate relative to league

### Pitcher Role

```text
SP = starter workload profile
SP/RP = mixed starter/reliever profile
RP = relief specialist
CP = high-leverage closer profile
```

Closers should not be inferred from saves alone without era context. Use role, leverage, and career usage when available.

### Arsenal Mapping

If pitch-level data is unavailable, infer from era and pitcher archetype.

Rules:

- modern power starters often include `4F`, `SL`, `CH` or `CF`
- command/changeup artists often include `4F`, `CH`, `CB`
- breaking-ball specialists can include `SL`, `CB`, `FK`
- sinker/ground-ball pitchers can include `2F`, `CF`
- knuckleballers require a design decision because SMB4 does not have a true knuckleball pitch type

Arsenal size should follow role:

- SP: 4 to 5 pitches
- SP/RP: 3 to 5 pitches
- RP: 2 to 4 pitches
- CP: 2 to 3 pitches

## Trait Mapping

Traits should be inferred from durable statistical shape, not one anecdote.

### Hitter Trait Examples

| Historical Signal | Candidate SMB4 Trait |
|---|---|
| elite home-run power | `RBI Hero`, `Fastball Hitter`, `POW vs RHP`, `POW vs LHP` |
| elite bat-to-ball | `Tough Out`, `Bad Ball Hitter`, `CON vs RHP`, `CON vs LHP` |
| elite leadoff/on-base identity | `Rally Starter` |
| elite steals and baserunning | `Stealer`, `Base Rounder`, `Sprinter` |
| elite versatility | `Utility` |
| elite defense | `Magic Hands`, `Dive Wizard`, `Cannon Arm` |
| severe strikeout weakness | `Whiffer` |
| severe injury history | `Injury Prone` |

### Pitcher Trait Examples

| Historical Signal | Candidate SMB4 Trait |
|---|---|
| elite strikeout dominance | `K Collector` |
| elite control | `Gets Ahead` |
| specialist reliever profile | `Specialist` |
| durable starter workload | `Workhorse`, `Durable` |
| elite signature pitch | `Elite 4F`, `Elite 2F`, `Elite CF`, `Elite SL`, `Elite CB`, `Elite CH`, `Elite FK`, `Elite SB` |
| wildness | `Wild Thing`, `BB Prone` |
| command trouble | `Falls Behind` |

## Grade Policy

Historical conversion should not force a grade first. It should:

1. build ratings and traits from historical evidence
2. score the result using the SMB4 grade emulator
3. optionally adjust if the user requested a target grade band

Supported grade modes:

```text
natural = no target grade adjustment
targeted = nudge ratings while preserving player identity
cap = do not exceed a max grade
floor = do not fall below a min grade
```

Example:

```json
{
  "name": "Rickey Henderson",
  "conversionMode": "hybrid",
  "gradePolicy": { "mode": "natural" }
}
```

## Confidence

Every converted profile must return confidence.

```ts
export interface HistoricalConversionConfidence {
  overall: "high" | "medium" | "low";
  ratings: Record<string, "high" | "medium" | "low">;
  traits: "high" | "medium" | "low";
  reasons: string[];
}
```

Confidence should drop when:

- source data is incomplete
- defensive or arm metrics are unavailable
- pitch arsenal is inferred from era/reputation only
- player has multiple plausible career phases
- two-way conversion depends on sparse data

## Output Shape

```ts
export interface HistoricalSmb4Profile {
  source: HistoricalPlayerSourceRecord;
  mode: "career" | "peak" | "hybrid";
  player: Smb4GeneratedPlayer;
  historicalSummary: {
    archetype: string;
    primaryEvidence: string[];
    eraAdjustmentNotes: string[];
  };
  confidence: HistoricalConversionConfidence;
}
```

## Validation Gates

Version 1 should include hand-reviewed golden fixtures for at least:

- one elite power hitter
- one elite contact hitter
- one speed/defense star
- one catcher
- one elite starter
- one command pitcher
- one power closer
- one two-way player or historical two-way edge case

Each fixture should assert:

- primary position is plausible
- top 2-3 ratings match historical identity
- trait choices are explainable
- grade emulator result is in an acceptable range
- confidence notes mention weak inferred areas

## Open Questions

1. Which historical source should be bundled first?
2. Should users be allowed to paste a Baseball Reference-style stat table directly?
3. Should conversion prefer career greatness, peak dominance, or SMB4 fun by default?
4. How should knuckleball pitchers be represented?
5. How aggressively should the engine assign negative traits to historical stars?
6. Should Negro Leagues and pre-integration stars use separate era-adjustment handling?
