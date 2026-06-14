---
name: dummy-data-scrubber
description: Scan KBL Tracker codebase for hardcoded dummy data, placeholder values, mock objects, and static demo content, then replace with dynamic data pulls that align with specs and actual data layer. Use when asked to "find dummy data", "replace placeholder data", "connect real data", "remove hardcoded values", "scrub demo data", or any request to ensure the app displays real dynamic data instead of static placeholders. Covers GameTracker, franchise mode, stats views, and all UI components.
---

# Dummy Data Scrubber

## Context

KBL Tracker (React + TypeScript + Vite) was built iteratively with AI tools. During development, components often get hardcoded values, placeholder text, mock objects, or demo data that was never replaced with actual dynamic data pulls. This skill systematically finds and replaces all such instances.

## Architecture Note

**SHARED-SOURCE architecture** — scan BOTH directory trees:
- `src/src_figma/` = UI layer (pages, components, hooks). The `@/` alias resolves here.
- `src/engines/`, `src/utils/`, `src/types/` = CORE logic (engines, storage, types) — imported directly by src_figma
- `src/src_figma/app/engines/` = integration wrappers adapting base engines for UI
- **Import chain**: UI Component → `src/src_figma/hooks/` → `src/engines/` + `src/utils/`
- Dummy data could exist in EITHER tree — check both
- When wiring up dynamic data, the source may be in `src/utils/` (storage) or `src/engines/` (calculations)

## Critical File Paths

```
# KNOWN MOCK DATA FILE (start here)
src/src_figma/app/data/mockData.ts

# Pages (check each for hardcoded data)
src/src_figma/app/pages/AppHome.tsx
src/src_figma/app/pages/ExhibitionGame.tsx
src/src_figma/app/pages/FranchiseHome.tsx          # 228K — likely has lots of inline data
src/src_figma/app/pages/FranchiseSetup.tsx          # 62KB
src/src_figma/app/pages/GameTracker.tsx             # 3,842 lines
src/src_figma/app/pages/PostGameSummary.tsx
src/src_figma/app/pages/WorldSeries.tsx
src/src_figma/app/pages/LeagueBuilder.tsx
src/src_figma/app/pages/LeagueBuilderDraft.tsx
src/src_figma/app/pages/LeagueBuilderLeagues.tsx
src/src_figma/app/pages/LeagueBuilderPlayers.tsx
src/src_figma/app/pages/LeagueBuilderRosters.tsx
src/src_figma/app/pages/LeagueBuilderRules.tsx
src/src_figma/app/pages/LeagueBuilderTeams.tsx

# Components (check each)
src/src_figma/app/components/*.tsx (36 component files)
src/src_figma/app/components/modals/*.tsx (9 modal files)

# Hooks — verify these return real data, not defaults
src/src_figma/hooks/useGameState.ts                # 2,968 lines — check initial state
src/src_figma/hooks/useFranchiseData.ts
src/src_figma/hooks/useLeagueBuilderData.ts
src/src_figma/hooks/useMuseumData.ts
src/src_figma/hooks/useOffseasonData.ts
src/src_figma/hooks/useOffseasonState.ts
src/src_figma/hooks/usePlayoffData.ts
src/src_figma/hooks/useScheduleData.ts
src/src_figma/app/hooks/useAgingData.ts
src/src_figma/app/hooks/useFameTracking.ts
src/src_figma/app/hooks/useFanMorale.ts
src/src_figma/app/hooks/useMWARCalculations.ts
src/src_figma/app/hooks/usePlayerState.ts
src/src_figma/app/hooks/useRelationshipData.ts
src/src_figma/app/hooks/useWARCalculations.ts

# Base hooks (may have different defaults)
src/hooks/useAgingData.ts
src/hooks/useCareerStats.ts
src/hooks/useClutchCalculations.ts
src/hooks/useDataIntegrity.ts
src/hooks/useFameDetection.ts
src/hooks/useFanMorale.ts
src/hooks/useFitnessState.ts
src/hooks/useGamePersistence.ts
src/hooks/useLiveStats.ts
src/hooks/useMWARCalculations.ts
src/hooks/useMojoState.ts
src/hooks/useNarrativeMorale.ts
src/hooks/useOffseasonPhase.ts
src/hooks/useRelationshipData.ts
src/hooks/useRosterData.ts
src/hooks/useSeasonData.ts
src/hooks/useSeasonStats.ts
src/hooks/useWARCalculations.ts
```

See `references/DATA_SOURCES.md` for the complete map of what data source should feed what.

## Pre-Flight

1. Read `spec-docs/CURRENT_STATE.md` for implementation status
2. Read `spec-docs/REQUIREMENTS.md` for expected data sources
3. Read `references/DATA_SOURCES.md` (in this skill directory)
4. Understand the data layer architecture:
   - **Storage (IndexedDB)**: `src/utils/*.Storage.ts` and `src/src_figma/utils/*.Storage.ts`
   - **Engines (calculations)**: `src/engines/*.ts` and `src/src_figma/app/engines/*.ts`
   - **Hooks (React state)**: `src/hooks/*.ts`, `src/src_figma/hooks/*.ts`, `src/src_figma/app/hooks/*.ts`
5. Run `npm run build` — baseline must compile

## Detection Patterns

Scan all files in `src/` for these patterns:

### Pattern 1: Hardcoded Strings
```typescript
// SUSPECT: Literal strings that should be dynamic
"Player Name"
"John Doe"
"Team A" / "Team B"
"Sample"
"Test"
"TODO"
"placeholder"
"Lorem"
"xxx" / "TBD"
```

### Pattern 2: Hardcoded Numbers
```typescript
// SUSPECT: Magic numbers that should come from game state or calculations
const avg = 0.300    // Should be calculated from at-bats/hits
const era = 3.50     // Should be calculated from earned runs/innings
const hr = 25        // Should come from player stats
score = 4            // Should come from game state
```

### Pattern 3: Mock Objects / Arrays
```typescript
// SUSPECT: Inline data objects not from storage/state
const players = [{ name: "...", position: "SS", ... }]
const standings = [{ team: "...", wins: 50, ... }]
const lineup = ["Player 1", "Player 2", ...]
```

### Pattern 4: Commented-Out Dynamic Code with Static Fallback
```typescript
// const data = useGameState()  ← commented out
const data = { runs: 0, hits: 0 }  // ← static replacement
```

### Pattern 5: Default Props That Should Be Required
```typescript
// Component accepts optional data with hardcoded defaults
function PlayerCard({ name = "Unknown", avg = ".000" })
// Should require actual data: function PlayerCard({ name, avg }: PlayerCardProps)
```

### Pattern 6: Stale Demo State in Hooks/Context
```typescript
// Initial state that looks like demo data
const [gameState, setGameState] = useState({
  homeTeam: "Sirloins",  // Should be selected by user
  awayTeam: "Moose",     // Should be selected by user
  inning: 5,             // Should start at 1
})
```

### Pattern 7: Imports from mockData.ts
```typescript
// ANY import from this file is suspect
import { ... } from '../data/mockData'
import { ... } from '@/data/mockData'
```

## Dummy Data Decision Matrix

Before replacing any hardcoded value, classify it:

| Classification | Criteria | Action |
|---------------|----------|--------|
| **REPLACE** | Has a TODO comment saying it should be dynamic | Replace with the specified data source |
| **REPLACE** | Uses fake names/teams that don't come from user data (e.g., "TIGERS", "Mike Rodriguez") | Replace with dynamic hook/storage data |
| **REPLACE** | A hook or storage function exists that returns this exact data type | Wire up the hook |
| **KEEP AS FALLBACK** | Used as `\|\| 'default'` pattern where the primary source is dynamic | Keep but document: intentional empty-state fallback |
| **KEEP AS DEFAULT** | Sensible initialization value (e.g., `inning: 1`, `outs: 0`, `isPlayoffs: false`) | Keep unless a dynamic source exists |
| **DOCUMENT AS TODO** | No dynamic data source exists yet for this data type | Don't remove — add `// TODO: Wire to [missing hook/storage]` comment |
| **PLACEHOLDER SCREEN** | Entire screen/section with placeholder content (e.g., ContractionExpansionFlow screens 6-11) | Don't scrub — these are architectural TODOs, not dummy data |

## Scanning Process

### Step 1: Automated Grep Scan

Run these searches and collect results:

```bash
# Direct mockData imports (HIGHEST PRIORITY)
grep -rn --include="*.tsx" --include="*.ts" 'mockData' src/

# Hardcoded player/team names (common SMB4 teams)
grep -rn --include="*.tsx" --include="*.ts" -E '"(Sirloins|Moose|Beewolves|Herbisaurs|Sawteeth|Nemesis|Blowfish|Overdogs|Grapplers|Platypi|Jacks|Wild Pigs|Wideloads|Freebooters|Sand Cats|Hot Corners)"' src/

# Generic placeholder strings
grep -rn --include="*.tsx" --include="*.ts" -iE '(placeholder|sample|test data|mock|dummy|todo|tbd|lorem|"Player|"Team )' src/ --exclude-dir=__tests__ --exclude-dir=node_modules

# Suspicious numeric literals (stats that should be calculated)
grep -rn --include="*.tsx" -E '\b(0\.\d{3}|\d+\.\d{2})\b' src/src_figma/app/components/ src/src_figma/app/pages/

# Inline array/object literals in components (not in types or test files)
grep -rn --include="*.tsx" -E '(const|let) \w+ = \[?\{' src/src_figma/app/components/ src/src_figma/app/pages/ | grep -v 'useState\|useRef\|useCallback\|useMemo\|import\|interface\|type '

# Default prop values that look like data
grep -rn --include="*.tsx" -E '= "[A-Z]' src/src_figma/app/components/

# Commented-out data fetching
grep -rn --include="*.tsx" --include="*.ts" -E '//.*use[A-Z]|//.*fetch|//.*get[A-Z]' src/src_figma/
```

### Step 2: Trace mockData.ts Consumers

Read `src/src_figma/app/data/mockData.ts` fully. Then find every file that imports from it:

```bash
grep -rn 'mockData' src/ --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v node_modules
```

For each consumer: determine what real data source should replace it.

### Step 3: Manual Component Walk

For each component directory in `src/src_figma/app/components/` and `src/src_figma/app/pages/`:

1. Open the main component file
2. Identify all displayed text, numbers, and data
3. Trace each piece of displayed data back to its source:
   - Comes from props? → Trace up to parent
   - Comes from hook/context? → Verify hook pulls from storage
   - Comes from local state? → Is initial value real or placeholder?
   - Hardcoded in JSX? → **FLAG IT**

### Step 4: Cross-Reference with Data Layer

For each flagged instance, use `references/DATA_SOURCES.md` to identify:

1. What the data SHOULD be (from specs or baseball logic)
2. Does the correct data source exist?
3. If data source exists → wire up the connection
4. If data source doesn't exist → document as missing, create if straightforward

## Replacement Protocol

### Categorize

| Category | Action |
|----------|--------|
| Data source exists, just not connected | Wire up the import/hook call |
| Data source exists but returns wrong shape | Add transformation layer |
| Data source doesn't exist yet | Create if <30 min work, else document as TODO |
| Intentional default (empty state) | Keep but verify it's appropriate |
| Test/dev-only data | Move to test files, remove from production code |
| mockData.ts import | Replace with real data source, remove import |

### Replacement Mapping Reference

| Dummy Data | Location | Replace With | Hook/Storage |
|-----------|----------|-------------|--------------|
| `'TIGERS'` / `'SOX'` team names | GameTracker.tsx | navigationState.awayTeamName / homeTeamName | Already wired — fallback is intentional |
| `game-123` game ID | FranchiseHome.tsx GameDayContent | Actual game ID from useFranchiseData | `useFranchiseData().currentGame?.id` |
| `MOCK_TEAMS` in TradeFlow | TradeFlow.tsx | franchise.teams from useFranchiseData | Already partially wired — fallback for no data |
| `allStarBallot` data | FranchiseHome.tsx | Season stats aggregation | TODO: No hook exists yet — create useAllStarBallot or extend useSeasonStats |
| WorldSeries stats | WorldSeries.tsx | Playoff stats storage | TODO: Need playoffStorage integration |
| `batterGrade = 'A'` | GameTracker.tsx | Player database lookup | TODO: No grade calculation hook exists |
| `isPlayoffs: false` | GameTracker.tsx (3 places) | Game context/navigation state | TODO: Need isPlayoffs in navigation state |

### Replace

1. Import the correct data source (hook, storage call, engine)
2. Replace hardcoded value with dynamic value
3. Add loading state if data is async (IndexedDB reads are async)
4. Add null/empty check with appropriate fallback
5. Verify TypeScript types align

### Verify After Each Replacement

- `npm run build` passes
- Component renders correctly with real data
- Component renders correctly with empty/null data (new game, no history)
- No TypeScript errors
- No console errors at runtime

### Note on mockData.ts

`src/src_figma/app/data/mockData.ts` is a legacy file. No production code currently imports from it (only test files). If imports are discovered during scanning, they should be removed.

## Component Priority Order

Scrub in this order (GameTracker first since it's most built-out):

1. **`src/src_figma/app/data/mockData.ts`** — identify all consumers, then eliminate
2. **`src/src_figma/app/pages/GameTracker.tsx`** — most critical, 3,842 lines
3. **`src/src_figma/app/pages/FranchiseHome.tsx`** — 228K, likely lots of inline data
4. **`src/src_figma/app/pages/FranchiseSetup.tsx`** — 62KB
5. **`src/src_figma/app/components/`** — all subcomponents
6. **`src/src_figma/hooks/`** — verify hooks return real data
7. **`src/src_figma/app/hooks/`** — same
8. **`src/hooks/`** — base hooks
9. **LeagueBuilder pages** — all 7 LeagueBuilder*.tsx files
10. Any remaining files

## Additional Dummy Data Locations (Found by Audit)

**FranchiseHome.tsx** (lines 130-179):
- `allStarBallot` object: ~65 hardcoded player records with names like "B. Foster", "M. Thompson", "K. Suzuki" and teams "Herbisaurs", "Wild Pigs", "Beewolves"
- Classification: REPLACE — should pull from season stats aggregated by useSeasonStats or equivalent
- Data source: Not yet built — DOCUMENT AS TODO

**TradeFlow.tsx** (lines 125-291):
- `MOCK_TEAMS` array: Hardcoded teams with players (e.g., "J. Rodriguez", "Detroit Tigers", overall: 92)
- `mockAIProposals` array: Hardcoded trade proposals with beatReporterNote
- Classification: KEEP AS FALLBACK — used when `!franchise?.teams?.length`; the component ALSO loads real data from useFranchiseData when available

**WorldSeries.tsx** (lines 443-543):
- Hardcoded World Series statistics with player names "D. Wilson", "K. Lee" and team "Beewolves"
- Classification: REPLACE — should pull from actual playoff stats storage

**MuseumContent.tsx** (line 25) and **TeamHubContent.tsx** (lines 14-17):
- `MOCK_TEAMS` and `MOCK_STADIUMS` arrays: ["Tigers", "Sox", "Bears", ...]
- Classification: KEEP AS FALLBACK — used when `hasRealData === false` or `realTeams.length === 0`

**ContractionExpansionFlow.tsx** (lines 1006-1247):
- 6 unimplemented placeholder screens (screens 6-11)
- Classification: PLACEHOLDER SCREEN — architectural TODO, not dummy data to scrub

**GameTracker.tsx specific locations:**
- Line 98: `awayTeamName = navigationState?.awayTeamName \|\| 'TIGERS'` → KEEP AS FALLBACK (primary source is navigationState)
- Line 156, 162, 1302: `isPlayoffs: false // TODO` → DOCUMENT AS TODO (no playoff context hook exists yet)
- Line 712: `batterGrade = 'A' // TODO` → DOCUMENT AS TODO (no player grade hook exists yet)

## Anti-Hallucination Rules

- Do NOT replace a value unless you've confirmed the dynamic source exists and works
- Do NOT assume a hook or storage method exists — verify by reading the file
- Do NOT create elaborate new data fetching infrastructure — use what exists
- If unsure whether something is intentionally static vs accidentally hardcoded, flag it for user review rather than changing it
- After replacements, verify the app still works by running build AND checking console for runtime errors
- FranchiseHome.tsx is 228K — read it in chunks, don't skip sections

## Conditional Fallback Handling

When replacing dummy data with dynamic sources, ALWAYS handle the loading/empty state:

```typescript
// WRONG — will break UI when data hasn't loaded
const teamName = useTeamData().name; // undefined during load!

// RIGHT — keep fallback for loading state
const { data: teamData, isLoading } = useTeamData();
if (isLoading) return <Skeleton />;
const teamName = teamData?.name ?? 'Loading...';
```

For each replacement, verify:
1. What displays during initial load? (loading spinner, skeleton, or empty?)
2. What displays if no data exists? (empty state message, not broken UI)
3. What displays if the hook errors? (error boundary or fallback text)

## Output

Produce a structured report:

```
# Dummy Data Scrub Report
Date: [date]
Files scanned: [count]
Instances found: [count]
Instances fixed: [count]
Instances deferred: [count] (with reasons)

## Fixed
| File | Line | Was | Now | Data Source |
|------|------|-----|-----|-------------|

## Deferred (Needs User Decision)
| File | Line | Current Value | Why Deferred |
|------|------|---------------|-------------|

## Missing Data Sources (New Work Needed)
| Component Needs | Data Description | Suggested Implementation |
|----------------|-----------------|------------------------|
```

Save report to `spec-docs/DUMMY_DATA_SCRUB_REPORT.md`.
