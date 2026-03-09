# GAMETRACKER DELTA & PLAYOFF PLAYTHROUGH PLAN

## Goal
Get the GameTracker matching Mode 2 §2-§7 specs → wire it to the Playoffs bracket → run a full playoff bracket as an integration test → fix bugs until shippable.

## Current State
- **GameTracker.tsx:** 195KB (~5,000 lines) — polished UI, working interactions
- **useGameState.ts:** 184KB (~5,000 lines) — state management with event logging
- **eventLog.ts:** Event persistence with AtBatEvent, GameHeader, IndexedDB storage
- **Integration engines:** 15 files in src_figma/app/engines/ (detection, fame, morale, narrative, mWAR, etc.)
- **UI components:** ~40 components (modals, field display, lineup cards, scoreboard, etc.)
- **Playoff system:** WorldSeries.tsx (34KB), playoffEngine.ts (16KB), playoffStorage.ts (24KB)

The GameTracker UI looks good. The event infrastructure exists. What we don't know is how closely the current implementation matches the gospel specs for §2-§7.

---

## Step 1: GameTracker Delta Assessment

### What We're Comparing
Mode 2 V1 FINAL §2-§7 defines:
- **§2 Event Model:** AtBatEvent interface, BetweenPlayEvent, TransactionEvent, GameRecord
- **§3 GameTracker 1-Tap Recording:** Quick Bar design, tap execution flow, undo, auto-detection, runner overrides
- **§4 Enrichment System:** Play log enrichment, enrichment types, timing
- **§5 Between-Play Events:** Runner actions, substitutions, manager moments, pitcher changes
- **§6 Baseball Rules & Logic:** Game structure, at-bat results, run scoring, force plays, runner defaults, special plays
- **§7 Substitution System:** Types, entry points, pinch runner rules, pitching changes, validation

### How to Run the Delta (Per Section)

**CRITICAL:** GameTracker.tsx and useGameState.ts are too large to read fully in one pass. The delta agent must:
1. Read the spec section (specific behaviors it requires)
2. Search the code for those specific behaviors (grep for key terms, type names, function names)
3. Read only the relevant code portions (not the entire 5,000-line files)
4. Record: EXISTS / DIFFERENT / MISSING for each specific behavior

**Output format per spec section:**
```markdown
### §[N] — [Title]

| Spec Requirement | Code Status | Location | Notes |
|---|---|---|---|
| [specific behavior from spec] | EXISTS / DIFFERENT / MISSING | [file:line or "—"] | [one line] |
| [specific behavior from spec] | ... | ... | ... |

**Gap tickets for this section:**
- GT-[N]-[letter]: [description] | Effort: [S/M/L] | Route: [tool|model]
```

### Delta Routing
```
ROUTE: Claude Code CLI | opus
```
The agent needs to read large files selectively, cross-reference with spec, and produce precise gap lists. This is deep-reasoning work.

### Session Plan for Delta
Given the file sizes and 6 spec sections:
- **Session 1:** §2 Event Model + §3 GameTracker 1-Tap (these are the architectural core)
- **Session 2:** §4 Enrichment + §5 Between-Play Events + §6 Baseball Rules
- **Session 3:** §7 Substitution System + consolidate full gap list

Each session produces a section of `GAMETRACKER_DELTA_REPORT.md`.

---

## Step 2: GameTracker Build

### Build Order (Data Flow)
Close gaps in this order — each layer feeds the next:

**Layer 1: Event Model Foundation (§2)**
- Type definitions match spec
- AtBatEvent has all required fields
- Event persistence writes correctly
- Tests: verify event shape matches spec interface

**Layer 2: 1-Tap Recording Flow (§3)**
- Quick Bar layout matches spec
- Tap → event creation → state update pipeline
- Undo system matches spec (5-step stack)
- Runner override flow matches spec
- Tests: tap scenarios produce correct events

**Layer 3: Baseball Rules (§6)**
- All at-bat result types handled
- Run scoring rules correct
- Force play logic correct
- Runner advancement defaults match spec
- Tests: edge cases (force outs with runners, walkoffs, etc.)

**Layer 4: Between-Play & Substitutions (§5, §7)**
- Runner actions (steal, advance, caught)
- Substitution types and entry points
- Pitching change flow
- Tests: substitution scenarios, mid-inning pitcher changes

**Layer 5: Enrichment (§4)**
- Play log enrichment interface
- Enrichment types available
- Tests: enrichment data persists correctly

### Build Discipline
- Each layer is a branch: `feature/gt-layer-1-event-model`, etc.
- Each layer must pass `npm run build` + `npm run test` before merging
- JK reviews diff before merge
- Protected files (KEEP.md) are not touched
- Each gap ticket gets its own sub-branch if it's large enough

### Build Routing
| Layer | Primary Route | Backup Route |
|---|---|---|
| 1 - Event Model (types, persistence) | Claude Code CLI \| opus | — |
| 2 - 1-Tap Recording (UI + state) | Codex \| 5.3 \| very high | Claude Code CLI \| opus |
| 3 - Baseball Rules (logic) | Codex \| 5.3 \| high | — |
| 4 - Substitutions (UI + state) | Codex \| 5.3 \| high | Claude Code CLI \| opus |
| 5 - Enrichment (UI + persistence) | Codex \| 5.3 \| high | — |

---

## Step 3: Playoff Pipeline Build

After the GameTracker matches spec, build **Elimination Mode** — a standalone playoff bracket system that is a PEER to Franchise Mode, not a sub-feature of it. Mirrors SMB4's "Elimination" mode. Has its own storage namespace (`kbl-elimination-{id}`), its own save slots, its own awards, and its own almanac presence. Persists past testing as a permanent app mode.

**Full spec:** `spec-docs/ELIMINATION_MODE_SPEC.md`

**Why its own mode, not a lightweight franchise:** Elimination Mode needs its own storage scope so almanac can distinguish franchise playoffs from standalone brackets. It has Elimination-specific awards (Postseason MVP, Best Pitcher, Best Fielder, Best Runner, Clutch Performer, Series MVP) that are distinct from franchise season awards. The GameTracker gets a new `gameMode: 'elimination'` value that activates ALL Mode 2 in-game systems (stats, WAR, mojo, fitness, fame, morale, narrative, designations, milestones) scoped to the elimination instance.

**Architecture:** Mirrors franchise patterns with its own namespace. New files: `eliminationManager.ts`, `eliminationStorage.ts`, `EliminationSelector.tsx`, elimination wizard page. Reuses directly: all engines, all GameTracker components, event logging, types, player data. The bracket CRUD logic from `playoffStorage.ts` is the foundation.

### Spec Sources
- **Mode 1 §11.8** — Playoff Mode abbreviated flow (setup entry point)
- **Mode 1 §11.4** — Step 3 Playoff Settings (teams, format, series lengths, home field pattern)
- **Mode 2 §21.3** — Playoff bracket structure, home field to higher seed, reseeding after each round
- **Mode 2 §8-§9** — Stats pipeline (game-level → season-level aggregation)
- **Mode 2 §14** — Mojo/fitness per game
- **Mode 2 §23** — Stadium analytics and park factors
- **ExhibitionGame.tsx** — Existing pattern for standalone game launch (league → teams → rosters → GameTracker)

### Current State (Verified 2026-03-06)
- **WorldSeries.tsx:** Full UI (Setup, Bracket, Leaders, History tabs) ✅
- **Setup tab:** League selection + playoff structure + games per round + innings + DH ✅
- **playoffStorage.ts:** Bracket CRUD, series tracking, game recording ✅
- **playoffEngine.ts:** Qualification, seeding, home field, clinch detection ✅
- **usePlayoffData.ts:** Full hook with bracket generation ✅
- **ExhibitionGame.tsx:** Standalone game launch pattern (league → teams → rosters → GameTracker) ✅
- **Setup missing from §11.8:** Seeding step (drag to order or auto-seed), home field pattern (2-3-2 / 2-2-1 / alternating), format options (bracket/pool/best_record_bye) ❌
- **PLAYOFF_STATS store:** Exists in IndexedDB, can be READ — but NOTHING WRITES TO IT ❌
- **GameTracker playoff awareness:** ZERO — doesn't know if a game is playoff ❌
- **Game completion → bracket update:** NOT CONNECTED ❌
- **Stadium analytics in playoffs:** NOT CONNECTED ❌

### What Needs Building

**Layer 0: Elimination Mode System (ELIMINATION_MODE_SPEC.md)**
- Build `eliminationManager.ts` + `eliminationStorage.ts` — mirror franchise patterns with `kbl-elimination-{id}` namespace
- Build `EliminationSelector.tsx` — save slot management (load, new, delete) — mirror FranchiseSelector
- Build Elimination wizard — 5-step setup per §11.8: league → settings → team control → seeding → confirm
- Seeding: drag to reorder or auto-seed from `playoffEngine.ts`
- Home field advantage: 2-3-2 / 2-2-1 / alternating (per §11.4)
- Rosters from League Builder (same pattern as ExhibitionGame.tsx)
- Creates own `eliminationId` scoped to `kbl-elimination-{id}` storage
- Wire PLAYOFFS button on home screen → `/elimination/select` route
- Add `gameMode: 'elimination'` to GameTracker navigation state type

**Layer 1: GameTracker Elimination Context**
- GameTracker handles `gameMode: 'elimination'` — activates all Mode 2 systems scoped to elimination storage
- Accepts elimination metadata via navigation state: `eliminationId`, `seriesId`, `gameNumber`, `roundName`
- Event model records elimination context on each AtBatEvent
- Fenway Board displays series context (e.g., "CHAMPIONSHIP GAME 5 — TIED 2-2")

**Layer 2: Game Completion → Bracket**
- When GameTracker completes a playoff game, call `recordSeriesGame` with the result
- Series auto-advances (this logic exists in `recordSeriesGame`)
- If series completes, trigger next round generation (exists in `createNextRoundSeries`)
- Navigate back to bracket view after game completion

**Layer 3: Playoff Stats Aggregation**
- Build `savePlayoffPlayerStats` function in playoffStorage.ts
- After each completed playoff game, aggregate player batting + pitching stats
- Accumulate across games (not overwrite) — same player across multiple series games
- Leaders tab already reads from this store, so once writing works, UI works

**Layer 4: Stadium Analytics**
- Pass stadium name/context when launching playoff games
- Load seed park factors from `parkLookup.ts` data for the home stadium
- Display stadium info in GameTracker during playoff games
- Store stadium association with each playoff game for records
- Park factor adjustments to stats (per §24.7) — use seed factors since playoffs have insufficient game count for calculated factors

**Layer 5: User-Driven Bracket Launch Flow**
- All active series in the current round are visible and clickable
- JK picks which matchup to play next — the engine does NOT determine game order within a round
- Clicking a series shows: current series score, next game number, home/away (based on home field pattern), stadium
- "Play Game" button launches GameTracker with that specific matchup
- After game completion, return to bracket — the series updates but JK still chooses the next game to play
- Round advances ONLY when all series in the round are complete
- This mirrors the SMB4 experience: games in a round are played in order through the round, but the user controls which matchup they play at any given time

### Build Order
Layer 0 first (setup flow must work before bracket launches games). Then Layers 1-3 (critical path — can't play through without them). Layer 4 adds stadium context. Layer 5 ties the UX together.

### Routing
| Layer | Route | Reasoning |
|---|---|---|
| 0 - Elimination Mode system | Claude Code CLI \| opus | New storage namespace + manager + selector + wizard + routes |
| 1 - Playoff context | Claude Code CLI \| opus | Touches GameTracker state (5K line file) |
| 2 - Game → bracket | Codex \| 5.3 \| high | Defined contract, well-scoped |
| 3 - Stats aggregation | Codex \| 5.3 \| high | New function, clear input/output |
| 4 - Stadium analytics | Codex \| 5.3 \| high | Data lookup + wiring |
| 5 - Bracket launch | Claude Code CLI \| opus | User-driven game selection UX + cross-page state passing |

---

## Step 4: Playoff Playthrough

### Setup
- Create a league (or use an existing one) with 4-8 teams
- Configure a bracket (best-of-3 or best-of-5 per round to keep it manageable)
- JK plays each game in SMB4, tracks each game in KBL Tracker

### What to Verify During Playthrough
Beyond basic GameTracker functionality, specifically check:
- **Game selection:** Can you click on any active series in the round and choose to play it? Are you never forced into a specific game order?
- **Playoff context:** Does the Fenway Board show series info (e.g., "ALCS Game 3, Team leads 2-1")?
- **Stats accumulation:** After each game, do the Leaders tab numbers update? Do batting and pitching leaders reflect reality?
- **Bracket advancement:** When a series ends, does the bracket show the correct winner advancing? Does the next round generate correctly?
- **Stadium display:** Is the correct stadium shown for each game? Does home field advantage follow the configured pattern (higher seed)?
- **Mojo/Fitness:** Do player mojo states change between games based on performance? Does the Fenway Board show current mojo/fitness?
- **Narrative/Fame:** Do fame events trigger during big moments (walkoffs, milestone hits)? Do narrative headlines generate?
- **Fan morale:** Does team morale shift based on wins/losses across the bracket?
- **LI/WPA:** Does the leverage index display during high-pressure situations? Do WPA values appear reasonable?
- **Designations:** Do player designations (hot streak, cold streak, etc.) accumulate across playoff games?
- **Milestones:** If a player approaches a career milestone during the bracket, does the system detect it?
- **Series completion:** When the final series ends, does the championship display correctly? Is MVP selectable?
- **History tab:** After the bracket completes, does history show the correct champion, results, and MVP?
- **Career stats:** After the bracket completes, have playoff stats persisted? Can they be queried?

### Bug Log Template
Create `PLAYOFF_PLAYTHROUGH_LOG.md`:

```markdown
# Playoff Playthrough Bug Log
Started: [date]
League: [name]
Teams: [list]
Bracket: [format]

---

## Game [N]: [Away] @ [Home] — [Series, Game X]
**Date:** [date]
**Result:** [score]

### Bugs Found
- **PT-[N]:** [what happened] | SEVERITY: blocker / major / minor / cosmetic | WHERE: [screen/action]

### Worked Well
- [what felt right]

### Notes
- [anything relevant for future fixes]
```

### Bug Fix Cycle
After each game (or batch of 2-3 games):
1. Review bugs with Claude
2. Blockers get fixed immediately (can't continue without)
3. Major bugs get tickets for batch fix between rounds
4. Minor/cosmetic bugs accumulate for post-playthrough cleanup
5. Build + test after every fix batch
6. Continue playthrough

### Fix Routing
| Bug Type | Route |
|---|---|
| Blocker — state/persistence | Claude Code CLI \| opus |
| Blocker — UI | Claude Code CLI \| sonnet |
| Major — engine logic | Codex \| 5.3 \| high |
| Major — UI wiring | Claude Code CLI \| sonnet |
| Minor/cosmetic — batch | Codex \| 5.1 mini \| medium |

---

## Step 5: After the Playthrough

Once the playoff bracket completes cleanly:
- GameTracker is proven for the core loop
- Stats pipeline is proven with real data
- Playoff system is proven end-to-end

**Then** move to:
- Mode 2 remaining sections (§8+ stats, WAR, standings, schedule) — quick delta check
- Mode 1 and Mode 3 — quick delta checks (98% there)
- Almanac — backend inventory + build

The playthrough dramatically reduces the scope of remaining work because the core is proven.

---

## Deliverables

| Document | When | Purpose |
|---|---|---|
| `KEEP.md` | Now | Protects working code |
| `ELIMINATION_MODE_SPEC.md` | Now | Gospel spec for standalone Elimination Mode |
| `GAMETRACKER_DELTA_REPORT.md` | Step 1 (3 sessions) | Section-by-section gap list |
| `GAMETRACKER_BUILD_PLAN.md` | After Step 1 | Ordered gap tickets with routing |
| `PLAYOFF_PLAYTHROUGH_LOG.md` | Step 4 | Bug log from actual gameplay |
| Green playoff bracket | End of Step 4 | Proof the core works |

---

## Success Criteria

- [ ] GameTracker delta assessment complete for §2-§7
- [ ] All gap tickets from delta resolved (build passes, tests pass)
- [ ] Elimination Mode system built (storage, manager, selector, wizard, routes)
- [ ] Elimination pipeline layers 1-5 built and verified
- [ ] Bracket launches games with correct teams, lineups, and stadium
- [ ] User can choose which series to play next within a round (no forced game order)
- [ ] Game results flow back to bracket and advance series correctly
- [ ] Playoff stats accumulate — Leaders tab shows real batting/pitching leaders
- [ ] Stadium info displays during playoff games with seed park factors
- [ ] Mojo/fitness, narrative, fame, fan morale, LI/WPA all firing during games
- [ ] Elimination awards compute at bracket completion (MVP, Best Pitcher/Fielder/Runner, Clutch)
- [ ] Elimination save slots work (load, new, delete)
- [ ] JK completes a full Elimination bracket without blockers
- [ ] All major bugs from playthrough fixed
- [ ] Minor/cosmetic bugs documented for later
