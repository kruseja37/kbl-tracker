# Elimination Mode Verification Report
**Date:** 2026-03-08
**Build:** PASS
**Spec:** `spec-docs/ELIMINATION_MODE_SPEC.md` v2.0
**Mode 2 Reference:** `spec-docs/v1-simplification/MODE_2_V1_FINAL.md` §3.1-§3.7
**Verification Method:** Build gate + static wiring audit + interaction-chain tracing + Playwright E2E

## Summary
| Layer | Total | PASS | FAIL | NOT_IMPL | NOT_EXEC |
|-------|-------|------|------|----------|----------|
| A: Static Wiring | 26 | 18 | 8 | 0 | — |
| B: Interaction Chains | 14 | 9 | 5 | — | — |
| C: E2E Journeys | 5 | 0 | 5 | — | 0 |
| **TOTAL** | **45** | **27** | **18** | **0** | **0** |

**Audit note:** A first-principles re-audit confirmed most findings below, but narrowed two conclusions:
- The bracket-advancement issue is specific to the elimination runtime path. Franchise playoff code does call `createNextRoundSeries()` and `completePlayoff()`.
- Layer C contains both product failures and a Playwright harness failure. The roster-snapshot runtime error is real and appears in every failure artifact, but Journey E-1's immediate assertion failure is a strict-locator issue in the test.

## Blocking Issues (must fix before playable)
1. **E-1 / A-4 / Step 0 data integrity:** `Start Playoffs` fails in the browser because `createRosterSnapshots()` requires `TeamRoster` records, but `seedFromSMB4Database()` creates teams, players, and the league template only. Actual browser error: `League Builder roster not found for snapshot: beewolves`.
2. **A-2.4 / A-13.10:** `createPlayoff()` still deletes any existing playoff with the same `seasonNumber`, which violates the spec’s coexistence rule for franchise playoffs and elimination brackets.
3. **A-6.4 / A-6.5:** Elimination game launch state does not match the spec. `seriesScore`, `homeSeed`, and `awaySeed` are not passed, and `stadiumName` is fabricated as `homeTeam.teamName + ' Stadium'` instead of using real team data.
4. **A-9.3:** The elimination runtime path does not show bracket-advancement wiring after series completion. `recordSeriesGame()` updates a series result, but the elimination flow does not route through the franchise playoff advancement logic that calls `createNextRoundSeries()` / `completePlayoff()`.
5. **A-12 / B-14.14:** Awards implementation does not match spec. It computes ad hoc categories in the view layer and does not store award data in `EliminationMetadata`.

## Non-Blocking Issues (can ship, fix later)
1. **B-14.7:** Tapping the pitcher immediately substitutes the first available pitcher; there is no user-facing pitcher picker.
2. **B-14.10:** Quick Bar inventory diverges from spec: `Balk` is missing and `GRD` is present instead.
3. **A-7.3:** Team Hub uses up/down buttons instead of the spec’s drag-to-reorder interaction.

## Pre-Flight

### Build Gate
Command:
```bash
npm run build
```

Result:
```text
> kbl-tracker@0.0.0 build
> tsc -b && vite build
...
✓ built in 5.30s
```

### File Existence Audit
```text
OK	src/App.tsx	85L
OK	src/src_figma/app/pages/AppHome.tsx	107L
OK	src/src_figma/app/pages/EliminationSelector.tsx	185L
OK	src/src_figma/app/pages/EliminationSetup.tsx	532L
OK	src/src_figma/app/pages/EliminationHome.tsx	801L
OK	src/src_figma/app/pages/GameTracker.tsx	5432L
OK	src/src_figma/app/pages/PostGameSummary.tsx	742L
OK	src/src_figma/app/components/EliminationTeamHub.tsx	413L
OK	src/src_figma/app/components/EnhancedInteractiveField.tsx	4373L
OK	src/src_figma/app/components/QuickBar.tsx	170L
OK	src/src_figma/app/components/FenwayBoard.tsx	318L
OK	src/src_figma/app/components/PlayLogPanel.tsx	167L
OK	src/src_figma/app/components/LineupCard.tsx	593L
OK	src/src_figma/app/components/RunnerPopover.tsx	315L
OK	src/src_figma/app/components/FielderPopover.tsx	235L
OK	src/src_figma/app/components/MiniScoreboard.tsx	114L
OK	src/src_figma/hooks/useGameState.ts	4928L
OK	src/src_figma/app/hooks/usePlayerState.ts	565L
OK	src/utils/eliminationManager.ts	138L
OK	src/utils/eliminationRosterStorage.ts	349L
OK	src/utils/playoffStorage.ts	991L
OK	src/utils/trackerDb.ts	157L
OK	src/utils/processCompletedGame.ts	54L
OK	src/utils/gameStorage.ts	616L
OK	src/utils/eventLog.ts	1164L
OK	src/utils/mojoFitnessStorage.ts	82L
OK	src/utils/eliminationAwards.ts	99L
```

### Proof-of-Life
```text
OK src/utils/eliminationManager.ts 138L
OK src/utils/eliminationRosterStorage.ts 349L
OK src/utils/playoffStorage.ts 991L
OK src/utils/trackerDb.ts 157L
OK src/src_figma/app/pages/EliminationHome.tsx 801L
OK src/src_figma/app/pages/EliminationSetup.tsx 532L
OK src/src_figma/app/pages/EliminationSelector.tsx 185L
OK src/src_figma/app/components/EliminationTeamHub.tsx 413L
OK src/utils/mojoFitnessStorage.ts
OK src/utils/eliminationAwards.ts
```

## Layer A: Static Wiring Results

### Check A-1.1: Elimination routes exist
**Spec quote:**
> `/elimination/select → EliminationSelector`  
> `/elimination/setup → EliminationSetup`  
> `/elimination/:eliminationId → EliminationHome`

**Positive assertion:** These three routes exist in `App.tsx`.  
**Negative assertion:** Old `/world-series` routing is not the active elimination route.

**Evidence:**
```ts
// src/App.tsx:63-66
63  {/* Elimination Mode (Playoffs) - Figma Design */}
64  <Route path="/elimination/select" element={<EliminationSelector />} />
65  <Route path="/elimination/setup" element={<EliminationSetup />} />
66  <Route path="/elimination/:eliminationId" element={<EliminationHome />} />
```

**Result:** PASS  
**Reason:** The required elimination routes are wired in the app router.

### Check A-1.2: PLAYOFFS home button links to elimination selector
**Spec quote:**
> The **PLAYOFFS** button navigates to `/elimination/select`.

**Positive assertion:** `AppHome` links PLAYOFFS to `/elimination/select`.  
**Negative assertion:** It does not link to `/world-series`.

**Evidence:**
```tsx
// src/src_figma/app/pages/AppHome.tsx:78-95
78  <Link
79    to="/elimination/select"
80    className="bg-[#CC44CC] h-[71.102px] relative block w-full"
...
86    <Globe className="w-4 h-4 text-black shrink-0" />
87    <p className="font-['Press_Start_2P'] ...">PLAYOFFS</p>
```

**Result:** PASS  
**Reason:** The PLAYOFFS entry point targets the correct route.

### Check A-2.1: No new elimination database was introduced
**Spec quote:**
> No separate database — uses existing databases with key scoping.

**Positive assertion:** Elimination uses stores inside existing DBs.  
**Negative assertion:** No `kbl-elimination` DB exists in code.

**Evidence:**
```text
rg -n "kbl-elimination" src/utils src/src_figma
<no matches>
```

```ts
// src/utils/eliminationManager.ts:5-7
5  import { initMetaDatabase as openMetaDatabase } from './franchiseManager';
7  const ELIMINATION_STORE = 'eliminationList';

// src/utils/eliminationRosterStorage.ts:13-15
13 const SNAPSHOT_STORE = 'rosterSnapshots';
14 const FIELD_POSITIONS: Position[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
```

**Result:** PASS  
**Reason:** Elimination is scoped into existing DBs and stores; no standalone elimination DB exists.

### Check A-2.2: `kbl-playoffs` migration changed `seasonNumber` to non-unique
**Spec quote:**
> This MUST be changed to `unique: false` to allow both franchise playoffs and elimination brackets.

**Positive assertion:** `DB_VERSION` is 2 and migration recreates the index as non-unique.  
**Negative assertion:** The final migration state is not unique.

**Evidence:**
```ts
// src/utils/playoffStorage.ts:13-15, 242-252
13 const DB_NAME = 'kbl-playoffs';
14 const DB_VERSION = 2;
...
245 if (event.oldVersion < 2) {
246   const tx = (event.target as IDBOpenDBRequest).transaction!;
247   const playoffsStore = tx.objectStore(STORES.PLAYOFFS);
248   if (playoffsStore.indexNames.contains('seasonNumber')) {
249     playoffsStore.deleteIndex('seasonNumber');
250   }
251   playoffsStore.createIndex('seasonNumber', 'seasonNumber', { unique: false });
252 }
```

**Result:** PASS  
**Reason:** The migration exists and recreates the index as non-unique.

### Check A-2.3: `kbl-app-meta` adds `eliminationList` safely
**Spec quote:**
> The upgrade handler MUST check `db.objectStoreNames.contains()` before creating.

**Positive assertion:** Meta DB version is 3 and creates `eliminationList` behind a contains check.  
**Negative assertion:** It does not blindly recreate the store.

**Evidence:**
```ts
// src/utils/franchiseManager.ts:72-73, 130-133
72 const META_DB_NAME = 'kbl-app-meta';
73 const META_DB_VERSION = 3;
...
130 // v3: Add eliminationList store for Elimination Mode save slots
131 if (!db.objectStoreNames.contains(META_STORES.eliminationList)) {
132   db.createObjectStore(META_STORES.eliminationList, { keyPath: 'eliminationId' });
133 }
```

**Result:** PASS  
**Reason:** The migration follows the required guard pattern.

### Check A-2.4: Playoff coexistence still uses `seasonNumber` as a destructive identifier
**Spec quote:**
> Using `seasonNumber` as a unique identifier for brackets... DON'T. Always filter by `sourceType`.

**Positive assertion:** Code should preserve multiple playoff records sharing the same season number.  
**Negative assertion:** It must not delete all existing records for a season number during create.

**Evidence:**
```ts
// src/utils/playoffStorage.ts:274-285
274 // First, delete any existing playoff for this season (same transaction = atomic)
275 const index = store.index('seasonNumber');
276 const cursorReq = index.openCursor(config.seasonNumber);
277 cursorReq.onsuccess = () => {
278   const cursor = cursorReq.result;
279   if (cursor) {
280     cursor.delete();
281     cursor.continue();
282   } else {
283     const addReq = store.add(playoff);
```

```ts
// src/utils/playoffStorage.ts:306-317, 944-948
306 export async function getPlayoffBySeason(seasonNumber: number): Promise<PlayoffConfig | null> {
312   const index = store.index('seasonNumber');
313   const request = index.get(seasonNumber);
...
944 export async function deletePlayoffBySeason(seasonNumber: number): Promise<void> {
945   const existing = await getPlayoffBySeason(seasonNumber);
946   if (existing) {
947     await deletePlayoff(existing.id);
948   }
```

**Result:** FAIL  
**Reason:** The create/read/delete helpers still treat `seasonNumber` as the primary identity and delete or fetch without `sourceType`.

### Check A-2.5: `kbl-tracker` contains roster + mojo snapshot stores
**Spec quote:**
> Add a `rosterSnapshots` store... `mojoFitnessSnapshots`...

**Positive assertion:** DB v4 creates both stores and indexes.  
**Negative assertion:** These stores are not missing from the unified tracker DB.

**Evidence:**
```ts
// src/utils/trackerDb.ts:16-18, 138-153
16 const DB_NAME = 'kbl-tracker';
17 const DB_VERSION = 4;
...
141 if (!db.objectStoreNames.contains('rosterSnapshots')) {
142   const snapshotStore = db.createObjectStore('rosterSnapshots', { keyPath: 'key' });
143   snapshotStore.createIndex('eliminationId', 'eliminationId', { unique: false });
144   snapshotStore.createIndex('teamId', 'teamId', { unique: false });
145 }
148 if (!db.objectStoreNames.contains('mojoFitnessSnapshots')) {
149   const mojoStore = db.createObjectStore('mojoFitnessSnapshots', {
150     keyPath: ['eliminationId', 'playerId'],
151   });
152   mojoStore.createIndex('eliminationId', 'eliminationId', { unique: false });
153 }
```

**Result:** PASS  
**Reason:** The required stores exist in the shared tracker DB.

### Check A-3.1: EliminationSelector lists slots and supports load/new/delete
**Spec quote:**
> Lists saved elimination brackets... Actions: Load, New, Delete

**Positive assertion:** Selector calls `listEliminations`, opens, creates, and deletes.  
**Negative assertion:** The page is not a dead shell.

**Evidence:**
```tsx
// src/src_figma/app/pages/EliminationSelector.tsx:26-55
26 const loadEliminations = useCallback(async () => {
29   const list = await listEliminations();
30   setEliminations(list);
...
42 const handleOpen = (elimination: EliminationMetadata) => {
43   navigate(`/elimination/${elimination.eliminationId}`);
44 };
46 const handleNewElimination = () => {
47   navigate('/elimination/setup');
48 };
50 const handleDelete = async (eliminationId: string) => {
52   await deleteElimination(eliminationId);
```

**Result:** PASS  
**Reason:** The selector performs the expected CRUD-facing actions.

### Check A-4.1: Setup wizard has five steps
**Spec quote:**
> 5-step setup wizard

**Positive assertion:** The wizard defines League, Settings, Control, Seeding, Confirm.  
**Negative assertion:** It is not a shorter or mismatched flow.

**Evidence:**
```ts
// src/src_figma/app/pages/EliminationSetup.tsx:8-11
8  type HomeFieldPattern = '2-3-2' | '2-2-1-1-1' | 'Home throughout';
9  const STEP_LABELS = ['League', 'Settings', 'Control', 'Seeding', 'Confirm'];
10 const TEAM_OPTIONS = [4, 8, 16];
11 const SERIES_OPTIONS = [3, 5, 7];
```

**Result:** PASS  
**Reason:** All five required steps are implemented.

### Check A-4.2: `handleStartPlayoffs()` follows the required chain
**Spec quote:**
> 1. Create `EliminationMetadata`  
> 2. Snapshot rosters  
> 3. Create `PlayoffConfig`  
> 4. Generate bracket  
> 5. Navigate

**Positive assertion:** The setup handler executes the chain in order.  
**Negative assertion:** It does not skip snapshot creation or navigation.

**Evidence:**
```ts
// src/src_figma/app/pages/EliminationSetup.tsx:399-461
399 const handleStartPlayoffs = async () => {
407   const elimination = await createElimination({ ... });
413   const eliminationId = elimination.eliminationId;
415   await createRosterSnapshots(eliminationId, teamIds);
426   const playoff = await createPlayoff({ ... sourceType: 'elimination', eliminationId });
442   for (let index = 0; index < numTeams / 2; index += 1) {
445     await createSeries({ ... });
458   }
459   await startPlayoff(playoff.id);
460   await updateElimination(eliminationId, { status: 'IN_PROGRESS', currentRound: 1 });
461   navigate(`/elimination/${eliminationId}`);
```

**Result:** PASS  
**Reason:** The handler follows the intended order.

### Check A-4.3: Setup is blocked by missing seeded rosters
**Spec quote:**
> Snapshot rosters — copy current League Builder rosters for all bracket teams...

**Positive assertion:** Seed data must include team rosters before `createRosterSnapshots()` runs.  
**Negative assertion:** Seed flow must not omit roster creation.

**Evidence:**
```ts
// src/utils/eliminationRosterStorage.ts:201-214
201 const [team, roster, players] = await Promise.all([
202   getTeam(teamId),
203   getTeamRoster(teamId),
204   getPlayersByTeam(teamId),
...
212 if (!roster) {
213   throw new Error(`League Builder roster not found for snapshot: ${teamId}`);
214 }
```

```ts
// src/utils/leagueBuilderStorage.ts:1044-1119
1044 for (const teamData of Object.values(SMB4_TEAMS)) {
1048   const team = convertTeam(teamData);
1049   await saveTeam(team);
...
1054 for (const playerData of Object.values(SMB4_PLAYERS)) {
1056   await savePlayer(player);
...
1109 await saveLeagueTemplate({
1110   id: 'sml',
1111   name: SUPER_MEGA_LEAGUE.name,
```

**Result:** FAIL  
**Reason:** The auto-seed path creates teams, players, and the league template, but it does not create `TeamRoster` records required by `createRosterSnapshots()`.

### Check A-5.1: Snapshot payload stores the full `Player` object
**Spec quote:**
> `players: LeagueBuilderPlayer[]; // Full player data`

**Positive assertion:** Snapshots capture `Player[]` and roster structure.  
**Negative assertion:** Snapshot is not reduced to name/position only.

**Evidence:**
```ts
// src/utils/eliminationRosterStorage.ts:17-25, 177-193
17 export interface EliminationRosterSnapshot {
22   players: Player[];
23   lineup: LineupSlot[];
24   startingRotation: string[];
...
177 function buildSnapshot(
181   players: Player[],
182   roster: TeamRoster
183 ): EliminationRosterSnapshot {
189   players,
190   lineup: roster.lineupVsRHP,
191   startingRotation: roster.startingRotation,
```

**Result:** PASS  
**Reason:** The snapshot shape preserves the full League Builder player objects.

### Check A-5.2: Snapshot key pattern matches spec
**Spec quote:**
> `key: string; // elim-roster-{eliminationId}-{teamId}`

**Positive assertion:** Key format follows `elim-roster-*`.  
**Negative assertion:** It does not use a different namespace.

**Evidence:**
```ts
// src/utils/eliminationRosterStorage.ts:158-160
158 function getSnapshotKey(eliminationId: string, teamId: string): string {
159   return `elim-roster-${eliminationId}-${teamId}`;
160 }
```

**Result:** PASS  
**Reason:** The snapshot key pattern matches the spec.

### Check A-6.1: EliminationHome exposes the five required tabs
**Spec quote:**
> Tabs: BRACKET, TEAM HUB, LEADERS, AWARDS, HISTORY

**Positive assertion:** All five tabs are defined.  
**Negative assertion:** No required tab is missing.

**Evidence:**
```ts
// src/src_figma/app/pages/EliminationHome.tsx:49-54
49 const tabs = [
50   { id: 'bracket', label: 'BRACKET', ... },
51   { id: 'teamhub', label: 'TEAM HUB', ... },
52   { id: 'leaders', label: 'LEADERS', ... },
53   { id: 'awards', label: 'AWARDS', ... },
54   { id: 'history', label: 'HISTORY', ... },
```

**Result:** PASS  
**Reason:** The five expected tabs exist.

### Check A-6.2: EliminationHome scopes history to elimination brackets
**Spec quote:**
> HISTORY tab filters to sourceType === 'elimination' completed brackets

**Positive assertion:** History filters to elimination + completed.  
**Negative assertion:** It does not load franchise playoff history.

**Evidence:**
```ts
// src/src_figma/app/pages/EliminationHome.tsx:152-154
152 allPlayoffs
153   .filter((playoff) => playoff.sourceType === 'elimination' && playoff.status === 'COMPLETED')
154   .map(async (playoff) => {
```

**Result:** PASS  
**Reason:** History is correctly scoped to completed elimination records.

### Check A-6.3: Selected series UI omits stadium display
**Spec quote:**
> Clicking a series shows... Stadium name

**Positive assertion:** Selected series panel should render stadium information.  
**Negative assertion:** Stadium must not be omitted.

**Evidence:**
```ts
// src/src_figma/app/pages/EliminationHome.tsx:492-515
492 <div className="bg-[#5A8352] ...">
493   <div className="text-sm mb-3">▶ SELECTED SERIES</div>
494   <div className="text-xs mb-2">
495     {series.roundName} • #{series.higherSeed.seed} ...
498   <div className="text-[8px] ...">
499     STATUS: {series.status} • SCORE: {formatSeriesScore(series)} ...
507   <div className="text-[8px] ...">
508     GAME {nextGame.nextGameNumber}: {nextGame.awayTeam.teamName} at {nextGame.homeTeam.teamName}
```

**Result:** FAIL  
**Reason:** The selected-series panel renders matchup and game number, but no stadium name.

### Check A-6.4: Elimination game nav state is incomplete
**Spec quote:**
> Navigation State for Elimination Games: ... `seriesScore`, `homeSeed`, `awaySeed`, `stadiumName`

**Positive assertion:** Required playoff context fields must be passed to GameTracker.  
**Negative assertion:** These fields must not be omitted.

**Evidence:**
```ts
// src/src_figma/app/pages/EliminationHome.tsx:227-253
227 navigate(`/game-tracker/${gameId}`, {
228   state: {
229     gameMode: 'elimination',
230     eliminationId: eliminationId,
231     seriesId: series.id,
232     gameNumber: nextGameNumber,
233     roundName: series.roundName,
234     seasonId: `elimination-${eliminationId}`,
235     seasonNumber: 1,
...
248     stadiumName: homeTeam.teamName + ' Stadium',
249     playoffSeriesId: series.id,
250     playoffGameNumber: nextGameNumber,
251     playoffId: playoffConfig.id,
252     totalInnings: playoffConfig.inningsPerGame,
```

**Result:** FAIL  
**Reason:** `seriesScore`, `homeSeed`, and `awaySeed` are missing from the nav state.

### Check A-6.5: Stadium name is fabricated instead of sourced from team data
**Spec quote:**
> `stadiumName` — From home team snapshot data

**Positive assertion:** Stadium should come from real team data.  
**Negative assertion:** It must not be a synthetic `teamName + ' Stadium'`.

**Evidence:**
```ts
// src/src_figma/app/pages/EliminationHome.tsx:244-249
244 awayTeamColor: awayTeamData?.colors.primary,
245 awayTeamBorderColor: awayTeamData?.colors.secondary,
246 homeTeamColor: homeTeamData?.colors.primary,
247 homeTeamBorderColor: homeTeamData?.colors.secondary,
248 stadiumName: homeTeam.teamName + ' Stadium',
249 playoffSeriesId: series.id,
```

**Result:** FAIL  
**Reason:** The stadium label is hardcoded from the team name rather than sourced from stored team data.

### Check A-7.1: Team Hub is not coupled to franchise-only context
**Spec quote:**
> Do NOT reuse `TeamHubContent.tsx`... Build `EliminationTeamHub` from scratch

**Positive assertion:** Team Hub reads/writes snapshots directly.  
**Negative assertion:** It does not import `FranchiseDataContext`, `TeamHubContent`, or `useFranchiseData`.

**Evidence:**
```ts
// src/src_figma/app/components/EliminationTeamHub.tsx:3-9
3  import {
4    getEliminationRosterSnapshot,
5    getAllEliminationRosterSnapshots,
6    getNormalizedEliminationLineup,
7    updateEliminationRosterSnapshot,
8    type EliminationRosterSnapshot,
9  } from '../../../utils/eliminationRosterStorage';
```

```text
grep -n "getTeamRoster|getPlayersByTeam|FranchiseDataContext|TeamHubContent|useFranchiseData" src/src_figma/app/components/EliminationTeamHub.tsx
<no matches>
```

**Result:** PASS  
**Reason:** The component is standalone and snapshot-driven.

### Check A-7.2: Team Hub edits write back to snapshots
**Spec quote:**
> These edits update the roster snapshot — not League Builder.

**Positive assertion:** Team Hub persists lineup/rotation edits via snapshot updates.  
**Negative assertion:** It does not write directly to League Builder rosters.

**Evidence:**
```ts
// src/src_figma/app/components/EliminationTeamHub.tsx:148-165
148 async function persistUpdates(teamId: string, updates: Partial<Pick<EliminationRosterSnapshot, 'lineup' | 'startingRotation'>>) {
155   await updateEliminationRosterSnapshot(eliminationId, teamId, updates);
156   setSnapshot((current) =>
157     current
158       ? {
159           ...current,
160           ...updates,
161           lineup: updates.lineup ? sortLineup(updates.lineup) : current.lineup,
162           startingRotation: updates.startingRotation ?? current.startingRotation,
```

**Result:** PASS  
**Reason:** Team Hub changes are persisted to snapshot storage.

### Check A-7.3: Team Hub lineup reorder does not match drag-to-reorder spec
**Spec quote:**
> Lineup editor: drag to reorder batting order

**Positive assertion:** Spec requires drag-to-reorder.  
**Negative assertion:** Up/down-only controls are not equivalent to drag interaction.

**Evidence:**
```tsx
// src/src_figma/app/components/EliminationTeamHub.tsx:339-353
339 <div className="flex gap-1 justify-end">
340   <button onClick={() => void handleMoveLineup(index, 'up')} ...>
345     <ChevronUp className="w-3 h-3" />
347   <button onClick={() => void handleMoveLineup(index, 'down')} ...>
352     <ChevronDown className="w-3 h-3" />
```

**Result:** FAIL  
**Reason:** The shipped Team Hub supports stepwise up/down movement, not drag-to-reorder.

### Check A-8.1: GameTracker type includes `elimination`
**Spec quote:**
> `gameMode?: 'exhibition' | 'franchise' | 'playoff' | 'elimination'`

**Positive assertion:** Navigation state union includes `elimination`.  
**Negative assertion:** It is not restricted to the prior three modes.

**Evidence:**
```ts
// src/src_figma/app/pages/GameTracker.tsx:120-133
120 gameMode?: 'exhibition' | 'franchise' | 'playoff' | 'elimination';
...
131 franchiseId?: string;
132 eliminationId?: string;
133 seasonId?: string;
```

**Result:** PASS  
**Reason:** The GameTracker route state supports the elimination mode value.

### Check A-8.2: `isPlayoffGame` includes elimination
**Spec quote:**
> `gameMode === 'playoff' || gameMode === 'elimination'`

**Evidence:**
```ts
// src/src_figma/app/pages/GameTracker.tsx:228-229
228 // Set playoff context from navigation state (if this is a playoff game)
229 const isPlayoffGame = navigationState?.gameMode === 'playoff' || navigationState?.gameMode === 'elimination';
```

**Result:** PASS  
**Reason:** Elimination games are treated as playoff games for display logic.

### Check A-8.3: Schedule marking excludes elimination
**Spec quote:**
> Adding `'elimination'` to the schedule-marking check... DON'T.

**Evidence:**
```ts
// src/src_figma/app/pages/GameTracker.tsx:3336-3340
3336 // T0-05 FIX: Mark the schedule game as COMPLETED (franchise mode only)
3339 if (navigationState?.scheduleGameId && (navigationState?.gameMode === 'franchise' || navigationState?.gameMode === 'playoff')) {
```

**Result:** PASS  
**Reason:** Elimination is correctly excluded from schedule completion.

### Check A-8.4: Post-game nav passes `eliminationId`
**Spec quote:**
> `eliminationId: navigationState?.eliminationId // NEW`

**Evidence:**
```ts
// src/src_figma/app/pages/GameTracker.tsx:3360-3365
3360 navigate(`/post-game/${gameId}`, {
3361   state: {
3362     gameMode: navigationState?.gameMode || 'franchise',
3363     franchiseId: navigationState?.franchiseId || ...,
3364     eliminationId: navigationState?.eliminationId,
```

**Result:** PASS  
**Reason:** Post-game navigation carries elimination context forward.

### Check A-9.1: Completed games aggregate using the elimination `seasonId`
**Spec quote:**
> `seasonId: 'elimination-{id}'` ... scopes all stats

**Evidence:**
```ts
// src/src_figma/app/pages/GameTracker.tsx:3301-3315
3301 const computedSeasonId = navigationState?.seasonId
3302   ?? (navigationState?.franchiseId ? ... : `season-${navigationState?.seasonNumber ?? 1}`);
3308 const endGameOptions = {
3310   seasonId: computedSeasonId,
3315 await hookEndGame(endGameOptions);
```

```ts
// src/src_figma/hooks/useGameState.ts:4507-4518
4507 const targetSeasonId = opts?.seasonId ?? seasonIdRef.current ?? 'season-1';
4509 const aggregationOptions = {
4510   seasonId: targetSeasonId,
4517 if (!alreadyAggregated) {
4518   await processCompletedGame(persistedState, aggregationOptions);
```

**Result:** PASS  
**Reason:** Game completion uses the route-provided elimination season key.

### Check A-9.2: Playoff stats write is present and guarded by `!alreadyAggregated`
**Spec quote:**
> Called at game completion alongside the existing `aggregateGameToSeason()`

**Evidence:**
```ts
// src/src_figma/hooks/useGameState.ts:4504-4556
4504 const header = await getGameHeader(gameState.gameId);
4505 const alreadyAggregated = header?.aggregated === true;
...
4526 if (playoffSeriesIdRef.current) {
4528   const { recordSeriesGame } = await import('../../utils/playoffStorage');
...
4552 if (!alreadyAggregated && playoffIdRef.current) {
4554   const { aggregateGameToPlayoffStats } = await import('../../utils/playoffStorage');
4555   await aggregateGameToPlayoffStats(playoffIdRef.current, persistedState);
```

**Result:** PASS  
**Reason:** The Leaders-tab write exists and is idempotency-guarded.

### Check A-9.3: Bracket advancement is missing after series completion
**Spec quote:**
> Round advances when all series complete.

**Positive assertion:** Completed rounds should trigger next-round series creation or playoff completion.  
**Negative assertion:** Updating a series record alone is not sufficient.

**Evidence:**
```ts
// src/utils/playoffStorage.ts:448-503
448 export async function recordSeriesGame(...) {
457   const games = [...series.games];
466   // Recalculate series score
479   // Check if series is complete
495   return updateSeries(seriesId, {
496     games,
497     higherSeedWins,
498     lowerSeedWins,
499     status,
500     winner,
501     completedAt,
502   });
}
```

```ts
// src/src_figma/hooks/usePlayoffData.ts:400-449
400 const recordGameResult = useCallback(async (seriesId: string, game: SeriesGame) => {
408   const updatedSeries = await recordSeriesGame(seriesId, game);
410   if (updatedSeries.status === 'COMPLETED' && updatedSeries.winner) {
427     const roundSeries = await getSeriesByRound(playoff.id, updatedSeries.round);
430     if (allRoundComplete) {
434       if (updatedSeries.round === playoff.rounds) {
438         await completePlayoff(playoff.id, champSeries.winner);
442         const { createNextRoundSeries } = await import('../../utils/playoffStorage');
446         await createNextRoundSeries(playoff.id, updatedSeries.round, latestPlayoff);
448         await updatePlayoff(playoff.id, { currentRound: updatedSeries.round + 1 });
```

```ts
// src/src_figma/app/pages/EliminationHome.tsx:227-253
227 navigate(`/game-tracker/${gameId}`, {
228   state: {
229     gameMode: 'elimination',
...
249     playoffSeriesId: series.id,
250     playoffGameNumber: nextGameNumber,
251     playoffId: playoffConfig.id,
```

```ts
// src/src_figma/hooks/useGameState.ts:4525-4556
4525 // Record playoff series game result if this was a playoff game
4526 if (playoffSeriesIdRef.current) {
4528   const { recordSeriesGame } = await import('../../utils/playoffStorage');
4531   await recordSeriesGame(playoffSeriesIdRef.current, {
...
4552 if (!alreadyAggregated && playoffIdRef.current) {
4554   const { aggregateGameToPlayoffStats } = await import('../../utils/playoffStorage');
4555   await aggregateGameToPlayoffStats(playoffIdRef.current, persistedState);
```

**Result:** FAIL  
**Reason:** The advancement/completion helpers exist and are used by franchise playoff code, but the elimination runtime path goes directly from `EliminationHome` into `GameTracker`, whose completion flow records only the series game and playoff stats. No elimination-specific path was found that advances rounds or completes the bracket.

### Check A-10.1: Mojo/Fitness persistence is elimination-only and explicit
**Spec quote:**
> Save mojo/fitness snapshots at game completion, load at next game start.

**Evidence:**
```ts
// src/src_figma/app/pages/GameTracker.tsx:912-923
912 if (navigationState?.gameMode === 'elimination' && navigationState?.eliminationId) {
914   const { loadMojoFitnessSnapshots } = await import('../../../utils/mojoFitnessStorage');
915   const snapshots = await loadMojoFitnessSnapshots(navigationState.eliminationId);
```

```ts
// src/src_figma/app/pages/GameTracker.tsx:3317-3330
3317 // Save mojo/fitness snapshots for elimination inter-game persistence
3318 if (navigationState?.gameMode === 'elimination' && navigationState?.eliminationId) {
3320   const { saveMojoFitnessSnapshots } = await import('../../../utils/mojoFitnessStorage');
3322   await saveMojoFitnessSnapshots(navigationState.eliminationId, ...);
```

**Result:** PASS  
**Reason:** Elimination games explicitly load and save snapshot state.

### Check A-11.1: PostGameSummary returns elimination games to EliminationHome
**Spec quote:**
> `'elimination' → /elimination/{eliminationId}`

**Evidence:**
```ts
// src/src_figma/app/pages/PostGameSummary.tsx:703-709
703 onClick={() => {
705   if (gameMode === 'exhibition') {
707   } else if (gameMode === 'elimination' && eliminationId) {
708     // Return to elimination bracket home
709     navigate(`/elimination/${eliminationId}`);
```

**Result:** PASS  
**Reason:** Elimination post-game routing returns to the bracket home page.

### Check A-12.1: Awards implementation diverges from the spec
**Spec quote:**
> Awards: Postseason MVP, Best Pitcher, Best Fielder, Best Runner, Clutch Performer, Series MVP  
> Computed when the bracket completes. Stored in `EliminationMetadata`.

**Positive assertion:** Required categories and storage behavior must exist.  
**Negative assertion:** Ad hoc categories and view-only computation are not spec-compliant.

**Evidence:**
```ts
// src/utils/eliminationAwards.ts:38-96
38 const postseasonMvp = [...qualifiedBatters].sort((a, b) => (b.ops || 0) - (a.ops || 0))[0];
49 const bestPitcher = [...qualifiedPitchers].sort((a, b) => (a.era || 0) - (b.era || 0))[0];
60 const bestHitter = [...qualifiedBatters].sort((a, b) => (b.avg || 0) - (a.avg || 0))[0];
71 const bestPower = [...stats]...
84 const clutchPerformer = [...stats]...
97 return awards;
```

```ts
// src/src_figma/app/pages/EliminationHome.tsx:612-626
612 useEffect(() => {
621   async function loadAwards() {
624     const computedAwards = await computeEliminationAwards(playoffId);
625     if (!cancelled) {
626       setAwards(computedAwards);
```

**Result:** FAIL  
**Reason:** The code computes `Best Hitter` and `Best Power`, omits `Best Fielder`, `Best Runner`, and `Series MVP`, and does not store awards in `EliminationMetadata`.

### Check A-13.1: Pitfall compliance for snapshots vs mutable League Builder data
**Spec quote:**
> Loading rosters from League Builder during bracket games... DON'T. Load from roster snapshots.

**Evidence:**
```ts
// src/src_figma/app/pages/EliminationHome.tsx:219-223
219 const [awayRoster, homeRoster, awayTeamData, homeTeamData] = await Promise.all([
220   buildEliminationGameTrackerRoster(eliminationId, awayTeam.teamId),
221   buildEliminationGameTrackerRoster(eliminationId, homeTeam.teamId),
222   getTeam(awayTeam.teamId),
223   getTeam(homeTeam.teamId),
```

**Result:** PASS  
**Reason:** Game launch loads rosters from elimination snapshots, not directly from mutable League Builder rosters.

## Layer B: Interaction Chain Results

### B-14.1: Tap [K] on QuickBar → Game state updates
**Spec quote:**
> Tap outcome button → save event → next batter loads → scoreboard updates

**Evidence:**
```ts
// src/src_figma/app/components/QuickBar.tsx:98-103
98  <button
101   onClick={() => {
102     onOutcome?.(btn);
103     setOverflowOpen(false);
```

```ts
// src/src_figma/app/pages/GameTracker.tsx:1934-2058
1934 const handleQuickBarOutcome = useCallback(async (outcome: string) => {
2024   await recordOut('GO' as OutType, runnerAdv);
2056 } else if (QUICK_BAR_OUTS.includes(outcome)) {
2057   await recordOut(outcome as OutType, runnerAdv);
```

```ts
// src/src_figma/hooks/useGameState.ts:2881-2899
2881 return {
2884   outs: newOuts,
2885   bases: newBases,
...
2891 if (newOuts >= 3) {
2895   endInningRef.current?.();
2897 } else {
2898   advanceToNextBatter();
```

```tsx
// src/src_figma/app/pages/GameTracker.tsx:3488-3491, 3657-3670
3488 inning={gameState.inning}
3489 isTop={gameState.isTop}
3490 outs={gameState.outs}
...
3657 <PlayLogPanel entries={playLogEntries} ... />
3667 <QuickBar ... onOutcome={handleQuickBarOutcome} />
```

**Result:** PASS  
**Reason:** QuickBar calls GameTracker, GameTracker calls `recordOut`, `useGameState` updates outs/batter state, and the score/inning/log surfaces render from that state.

### B-14.2: Tap [1B] on QuickBar → Runner advances
**Evidence:**
```ts
// src/src_figma/app/pages/GameTracker.tsx:1960-2034
1960 const defaults: RunnerDefaults = calculateRunnerDefaults(minimalPlay as PlayData, bases, outs);
1978 const toRunnerAdvancement = (): RunnerAdvancement | undefined => { ... }
2032 } else if (QUICK_BAR_HITS.includes(outcome)) {
2033   await recordHit(outcome as HitType, rbi, runnerAdv);
2034   logAction(`${outcome}${rbi > 0 ? ` — ${rbi} RBI` : ''}`);
```

**Result:** PASS  
**Reason:** The single is routed through runner default calculation, hit recording, and UI log update.

### B-14.3: Tap [HR] on QuickBar → All runners score
**Evidence:**
```ts
// src/src_figma/app/pages/GameTracker.tsx:1943-1949, 2001-2004, 2118-2132
1943 if (QUICK_BAR_HITS.includes(outcome)) {
1944   if (outcome === 'HR') {
1945     return { type: 'hr' as const, hitType: 'HR' as const, ... };
...
2001 if (outcome === 'HR') {
2003   setHrPrompt({ rbi, runnerAdv, defaults, distance: '', pitchType: '' });
...
2131 await recordHit('HR' as HitType, rbi, runnerAdv);
```

**Result:** PASS  
**Reason:** HR uses the same runner-default/RBI pipeline, with the actual hit recording deferred through the HR prompt.

### B-14.4: Record 3 outs → Inning flips
**Evidence:**
```ts
// src/src_figma/hooks/useGameState.ts:2891-2899, 4246-4284
2891 if (newOuts >= 3) {
2895   endInningRef.current?.();
...
4246 setGameState(prev => {
4247   const newIsTop = !prev.isTop;
4250   const newInning = newIsTop ? prev.inning + 1 : prev.inning;
...
4274   inning: newInning,
4275   isTop: newIsTop,
4276   outs: 0,
4280   currentBatterId: nextBatter?.playerId || '',
4282   currentPitcherId: newPitcherId,
```

**Result:** PASS  
**Reason:** Third out triggers `endInning`, which flips inning/half, resets outs, swaps batter, and swaps pitcher.

### B-14.5: Tap runner on diamond → Popover appears → steal works
**Evidence:**
```ts
// src/src_figma/app/pages/GameTracker.tsx:2764-2787
2764 const handleRunnerTap = useCallback((base, anchorPosition) => {
2767   setActiveRunnerPopover({ base, runnerName, playerId: ..., anchorPosition });
...
2783 const handleRunnerSteal = useCallback((base: RunnerBase) => {
2785   advanceRunner(base, nextBaseMap[base], 'safe');
2786   recordEvent('SB');
2787   setActiveRunnerPopover(null);
```

```tsx
// src/src_figma/app/pages/GameTracker.tsx:3593-3605
3593 {activeRunnerPopover && (
3594   <RunnerPopover
3595     base={activeRunnerPopover.base}
3596     runnerName={activeRunnerPopover.runnerName}
3598     onSteal={handleRunnerSteal}
```

**Result:** PASS  
**Reason:** The full runner-tap chain exists from diamond tap to stateful popover to steal action.

### B-14.6: Tap fielder on diamond → Substitution flow completes
**Evidence:**
```ts
// src/src_figma/app/pages/GameTracker.tsx:2840-2851, 2870-2884
2840 const handleFielderTap = useCallback((positionNumber, playerName, anchorPosition) => {
2848   setActiveFielderPopover({ fielder: {...}, anchorPosition });
...
2870 const handleFielderSubstitute = useCallback((benchPlayerId, benchPlayerName, fielderId, fielderName) => {
2874   handleLineupCardSubstitution({
2875     type: 'player_sub',
2876     incomingPlayerId: benchPlayerId,
2878     outgoingPlayerId: fielderId,
2883   setActiveFielderPopover(null);
```

```ts
// src/src_figma/app/components/FielderPopover.tsx:208-213, 99-105
208 <button onClick={() => setModalMode('substitute')} ...>
212   Substitute
...
99  const handlePlayerSelect = useCallback((benchPlayer) => {
100   if (modalMode === 'substitute') {
101     onSubstitute(benchPlayer.id, benchPlayer.name, fielder.playerId, fielder.playerName);
```

**Result:** PASS  
**Reason:** The popover’s substitute action reaches the real substitution handler; it does not dead-end into “use LineupCard” text.

### B-14.7: Pitching change flow is not user-selectable
**Spec quote:**
> Does the handler open a pitcher selector or directly call `changePitcher`?

**Evidence:**
```ts
// src/src_figma/app/pages/GameTracker.tsx:2911-2920
2911 const handlePitcherTap = useCallback(() => {
2913   if (availablePitchers.length > 0) {
2914     const firstAvailable = availablePitchers[0];
2918     // For now, trigger the change with the first available pitcher
2920     handlePitcherSubstitution(fieldingTeam, firstAvailable.name, resolvedCurrentPitcherName, 'pitcher');
```

**Result:** FAIL  
**Reason:** Tapping the pitcher immediately selects the first available pitcher; there is no pitcher picker or choice UI.

### B-14.8: End-game flow is incomplete for elimination progression
**Evidence:**
```ts
// src/src_figma/app/pages/GameTracker.tsx:3315-3368
3315 await hookEndGame(endGameOptions);
...
3360 navigate(`/post-game/${gameId}`, {
3362   gameMode: navigationState?.gameMode || 'franchise',
3364   eliminationId: navigationState?.eliminationId,
```

```ts
// src/src_figma/hooks/useGameState.ts:4526-4556
4526 if (playoffSeriesIdRef.current) {
4531   await recordSeriesGame(playoffSeriesIdRef.current, { ... });
4552 if (!alreadyAggregated && playoffIdRef.current) {
4555   await aggregateGameToPlayoffStats(playoffIdRef.current, persistedState);
```

**Result:** FAIL  
**Reason:** End-game records the current series game and playoff stats, but does not advance the bracket to the next round or complete the playoff.

### B-14.9: ActionSelector is suppressed while QuickBar is active
**Evidence:**
```tsx
// src/src_figma/app/pages/GameTracker.tsx:3556-3589
3556 <EnhancedInteractiveField
3589   hideActionSelector={true}
```

```tsx
// src/src_figma/app/components/EnhancedInteractiveField.tsx:4163-4167
4163 {/* LEFT FOUL ZONE: Action Selection (Step 1) */}
4165 {flowStep === 'IDLE' && !hideActionSelector && (
4166   <ActionSelector ... />
```

**Result:** PASS  
**Reason:** GameTracker explicitly hides the legacy ActionSelector, so the two input systems are not rendered simultaneously.

### B-14.10: QuickBar inventory mismatches the spec
**Spec quote:**
> Overflow menu contains... `Balk`

**Evidence:**
```ts
// src/src_figma/app/components/QuickBar.tsx:20-26
20 const PRIMARY_BUTTONS = ['K', 'GO', 'FO', 'LO', '1B', 'BB', '2B', 'HR'] as const;
23 const OVERFLOW_BUTTONS = [
24   'PO', '3B', 'HBP', 'E', 'FC', 'DP', 'TP',
25   'SAC', 'SF', 'IBB', 'WP_K', 'PB_K', 'GRD',
26 ] as const;
```

**Result:** FAIL  
**Reason:** `Balk` is missing from overflow, and `GRD` is present instead.

### B-14.11: LineupCard is accessible
**Evidence:**
```tsx
// src/src_figma/app/pages/GameTracker.tsx:3816-3855
3816 {showLineupOverlay && (
3847   <LineupCard
3848     lineup={lineupCardData}
3852     onSubstitution={handleLineupCardSubstitution}
```

```tsx
// src/src_figma/app/pages/GameTracker.tsx:4860-4868
4860 {/* LineupCard - Drag-drop substitution interface */}
4862 <LineupCard
4867   onSubstitution={handleLineupCardSubstitution}
```

**Result:** PASS  
**Reason:** LineupCard is rendered both in the overlay and in the substitutions panel.

### B-14.12: Play Log K/Kc toggle updates the event record
**Evidence:**
```tsx
// src/src_figma/app/components/PlayLogPanel.tsx:125-133
125 {(entry.result === 'K' || entry.result === 'Kc') && !entry.hasKType && onKToggle && (
128   className="... cursor-pointer ..."
129   onClick={(e) => { e.stopPropagation(); onKToggle(entry); }}
132   K?
```

```ts
// src/src_figma/app/pages/GameTracker.tsx:3103-3114
3103 const handleKToggle = useCallback(async (entry: PlayLogEntry) => {
3106   const newResult = entry.result === 'K' ? 'Kc' : 'K';
3108   await updateAtBatEvent(entry.eventId, {
3109     result: newResult as ...,
3112   setPlayLogEntries(prev => prev.map(e =>
3113     e.id === entry.id ? { ...e, result: newResult, hasKType: true } : e
```

**Result:** PASS  
**Reason:** The badge is wired all the way through to persistent event updates and local UI refresh.

### B-14.13: Diamond width on iPad is above the failure threshold
**Spec quote:**
> If [diamond width] is less than 400px → FAIL

**Evidence:**
```ts
// src/src_figma/app/pages/GameTracker.tsx:3471-3475
3471 <div
3473   style={{
3474     gridTemplateColumns: 'minmax(248px, 300px) 1fr minmax(184px, 228px)',
3475     gridTemplateRows: '1fr auto',
```

**Result:** PASS  
**Reason:** On a 1024px-wide iPad, the center column remains roughly 496px wide at minimum (`1024 - 248 - 184 = 592`, or `1024 - 300 - 228 = 496`), above the 400px threshold.

### B-14.14: FenwayBoard contract exists, but GameTracker does not pass matchup/milestone data
**Spec quote:**
> FenwayBoard must show... milestone proximity, matchup history

**Evidence:**
```ts
// src/src_figma/app/components/FenwayBoard.tsx:48-58
48 // Matchup (batter vs pitcher this game)
49 matchupRecord?: string;
50 matchupAvg?: string;
52 // Milestone proximity
53 milestoneAlert?: string;
57 onPitcherTap?: () => void;
```

```tsx
// src/src_figma/app/pages/GameTracker.tsx:3481-3550
3481 <FenwayBoard
3491   currentBatterName={currentBatterDisplayName}
3518   pitcherPitchCount={pitcherPitchCount}
3548   showScoreboard={true}
3549   onBatterTap={handleBatterTap}
3550   onPitcherTap={availablePitchers.length > 0 ? handlePitcherTap : undefined}
```

**Result:** FAIL  
**Reason:** `FenwayBoard` supports matchup and milestone props, but `GameTracker` does not pass them, so those spec fields cannot render.

## Layer C: Journey Results

### Setup
Command:
```bash
npx playwright test --config=playwright.elimination.config.ts
```

### Journey E-1: Create Elimination Bracket
**Expected:** Create bracket through the 5-step wizard and land on `/elimination/{id}`.  
**Actual:** FAIL.

**Browser evidence:**
```text
Playwright reached setup Step 5, filled the bracket name, clicked START PLAYOFFS,
and the page remained on the wizard with this app error banner:

"League Builder roster not found for snapshot: beewolves"
```

**Playwright failure detail:** The test's immediate assertion is also a strict-mode locator failure on `getByText('BRACKET')`, because multiple elements on the page contain the text `BRACKET`.

**Code evidence for root cause:**
```ts
// src/utils/eliminationRosterStorage.ts:202-214
202 getTeam(teamId),
203 getTeamRoster(teamId),
204 getPlayersByTeam(teamId),
...
212 if (!roster) {
213   throw new Error(`League Builder roster not found for snapshot: ${teamId}`);
214 }
```

```ts
// src/utils/leagueBuilderStorage.ts:1048-1119
1048 const team = convertTeam(teamData);
1049 await saveTeam(team);
1056 await savePlayer(player);
1109 await saveLeagueTemplate({
```

**Result:** FAIL  
**Reason:** The journey fails for two reasons: the Playwright spec uses an ambiguous locator, and the product itself stops at snapshot generation because the seeded SMB4 league lacks team rosters.

### Journey E-2: Play One Elimination Game
**Expected:** Start a bracket, launch a game, record outs, end game, return to EliminationHome.  
**Actual:** FAIL.

**Result:** FAIL  
**Reason:** Blocked by the runtime roster-snapshot error from E-1. No bracket can be created because `Start Playoffs` fails before navigation to EliminationHome.

### Journey E-3: Verify Stats Flow to Leaders Tab
**Expected:** Complete one elimination game and verify the LEADERS tab is populated.  
**Actual:** FAIL.

**Result:** FAIL  
**Reason:** Blocked by E-1. The setup wizard never creates a bracket, so no elimination game can be launched.

### Journey E-4: Complete a Series / Advance Bracket
**Expected:** Complete opening-round series and observe next-round availability.  
**Actual:** FAIL.

**Result:** FAIL  
**Reason:** Blocked at setup by missing seeded rosters. Static analysis also shows that round advancement is not implemented after `recordSeriesGame()`.

### Journey E-5: Team Hub Lineup Edit
**Expected:** Open Team Hub for a created bracket and verify lineup/rotation persistence.  
**Actual:** FAIL.

**Result:** FAIL  
**Reason:** Blocked by E-1. No elimination bracket exists to open.

## Recommended Fix Order
| Priority | Check | Issue | Fix | Files | Effort |
|----------|-------|-------|-----|-------|--------|
| 1 | E-1 / A-4.3 | SMB4 auto-seed does not create `TeamRoster` records, so setup cannot snapshot rosters | Create default rosters/rotations during `seedFromSMB4Database()` for every seeded team | `src/utils/leagueBuilderStorage.ts` | M |
| 2 | A-2.4 / A-13.10 | Playoff create/read/delete still key off `seasonNumber` without `sourceType` | Stop deleting by season number during create; add `sourceType`-aware lookup/delete helpers | `src/utils/playoffStorage.ts` | M |
| 3 | A-9.3 | Elimination runtime path does not advance rounds after series completion | Route elimination results through the same advancement logic used by franchise playoffs, or add equivalent advancement/completion handling and sync `EliminationMetadata` | `src/src_figma/hooks/usePlayoffData.ts`, `src/src_figma/hooks/useGameState.ts`, `src/src_figma/app/pages/EliminationHome.tsx`, `src/utils/eliminationManager.ts` | M |
| 4 | A-6.4 / A-6.5 | Elimination game nav state omits series context and uses fake stadium data | Pass `seriesScore`, `homeSeed`, `awaySeed`, and real `stadiumName` from team data/snapshot | `src/src_figma/app/pages/EliminationHome.tsx` | S |
| 5 | A-12 | Awards categories/storage do not match the spec | Replace ad hoc categories with spec categories and persist award results onto elimination metadata when the bracket completes | `src/utils/eliminationAwards.ts`, `src/src_figma/app/pages/EliminationHome.tsx`, `src/utils/eliminationManager.ts` | M |
| 6 | B-14.7 | Pitcher tap auto-selects first reliever | Add an actual picker modal or open the bullpen selection UI on tap | `src/src_figma/app/pages/GameTracker.tsx` | S |
| 7 | B-14.10 | QuickBar inventory diverges from spec | Restore `Balk` to overflow or update the spec; remove unapproved divergence | `src/src_figma/app/components/QuickBar.tsx` | S |
| 8 | Layer C harness | E-1 uses an ambiguous strict-mode locator | Replace `getByText('BRACKET')` with a unique locator tied to the BRACKET tab/button or URL/state change | `test-utils/elimination-journeys/elimination-mode.spec.ts` | S |
