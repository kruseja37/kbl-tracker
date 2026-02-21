# KBL Separated Modes Architecture

**Version**: 1.0
**Status**: Draft
**Last Updated**: February 2026

---

## 1. Overview

KBL operates across three distinct modes, each with its own UI surface, data scope, and user workflow. These modes are NOT tabs within a single view — they are fundamentally different application states.

```
┌─────────────────────────────────────────────────────────────────┐
│                    KBL APPLICATION MODES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  MODE 1: LEAGUE BUILDER                                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ One-time setup or import. Creates the league universe.     │ │
│  │ Runs ONCE per franchise (with optional mid-franchise edits)│ │
│  └────────────────────────────────────────────────────────────┘ │
│                         ↓                                        │
│  MODE 2: FRANCHISE SEASON                                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Play games in SMB4. Record results. Track stats.           │ │
│  │ Active during the regular season and playoffs.             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                         ↓                                        │
│  MODE 3: OFFSEASON WORKSHOP                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 11-phase between-season processing.                        │ │
│  │ Awards, salary, free agency, draft, trades, finalize.      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                         ↓ (loops back to Mode 2)                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Mode 1: League Builder

### 2.1 Purpose

Create the league universe: teams, divisions, roster import, initial settings. This runs ONCE per franchise, with the option to revisit for mid-franchise adjustments (expansion, etc.).

### 2.2 Scope

| Responsibility | Details |
|---------------|---------|
| Team creation/import | Import SMB4 teams or create custom |
| Division structure | Set up divisions and conferences |
| Roster import | 506-player database from SMB4 |
| Season length | User-configurable games per team |
| League rules | Playoff format, DH rules, etc. |
| Personality assignment | 7 visible types + 4 hidden modifiers |
| Initial trait distribution | ~30% zero, ~50% one, ~20% two |

### 2.3 Data Output

League Builder produces a `LeagueConfiguration` that feeds all subsequent modes:

```typescript
interface LeagueConfiguration {
  franchiseId: string;
  teams: Team[];
  divisions: Division[];
  settings: LeagueSettings;
  playerDatabase: Player[];  // Full 506+ players with ratings, traits, personalities
}
```

### 2.4 Cross-References

- LEAGUE_BUILDER_SPEC.md — Full UI/UX specification
- LEAGUE_BUILDER_FIGMA_SPEC.md — Figma wireframes

---

## 3. Mode 2: Franchise Season

### 3.1 Purpose

The active gameplay mode. User plays games in SMB4 on iPad, then records results in KBL. During the season, all stat tracking, roster management, and narrative generation occurs.

### 3.2 Scope

| Responsibility | Details |
|---------------|---------|
| GameTracker | Record game results (1-tap recording + optional enrichment) |
| Stats dashboard | Batting, pitching, fielding leaderboards |
| Standings | Division/league standings, auto-updated |
| Roster management | Call-ups, send-downs (3 options limit), lineup changes |
| Schedule view | Played games + series auto-detection |
| Narrative engine | Beat reporter stories, milestones, events |
| Almanac access | Historical reference (cross-season queries) |

### 3.3 Key Constraints During Season

- Farm roster is **UNLIMITED** (no 10-player cap)
- MLB roster is **22 players** (always)
- Players limited to **3 options** (send-downs) per season
- Schedule is **dynamic** — no auto-generation, series detected from consecutive opponents
- Fictional dates advance with each game (~2 days per game)
- Mojo/fitness are **user-reported** from SMB4, not calculated

### 3.4 Season End Trigger

Season ends when user has played the configured number of games per team. App prompts:

```
Season complete! Ready to enter the Offseason Workshop?
[Begin Offseason]  [Continue Playing (exhibition)]
```

If playoffs are configured, playoff bracket completes before offseason.

---

## 4. Mode 3: Offseason Workshop

### 4.1 Purpose

Structured 11-phase between-season processing. This is a guided workflow — each phase must complete before the next begins.

### 4.2 Phase Sequence

```
Phase 1: Season End Processing
Phase 2: Awards Ceremony (trait assignment, eye test)
Phase 3: Salary Recalculation #1
Phase 4: Expansion (optional, user-initiated)
Phase 5: Retirement & Legacy
Phase 6: Free Agency
Phase 7: Draft
Phase 8: Salary Recalculation #2
Phase 9: Offseason Trades
Phase 10: Salary Recalculation #3
Phase 11: Finalize & Advance (cut-down, signing round, roster lock)
```

### 4.3 Data Flow

Each phase consumes outputs from prior phases and produces inputs for subsequent phases:

```typescript
interface OffseasonState {
  currentPhase: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
  completedPhases: number[];
  phaseOutputs: Map<number, PhaseOutput>;
}
```

### 4.4 Cross-Reference

- OFFSEASON_SYSTEM_SPEC.md — Full 11-phase specification

---

## 5. Mode Transitions

### 5.1 Transition Rules

| From | To | Trigger |
|------|------|---------|
| League Builder | Franchise Season | League setup complete |
| Franchise Season | Offseason Workshop | Season/playoffs complete |
| Offseason Workshop | Franchise Season | Phase 11 (Finalize) complete |
| Any Mode | League Builder | User requests expansion (Phase 4) |

### 5.2 State Persistence

Each mode transition persists state to IndexedDB before switching:

```typescript
async function transitionMode(from: AppMode, to: AppMode): Promise<void> {
  await persistCurrentState(from);
  await loadModeState(to);
  setActiveMode(to);
}
```

---

## 6. Always-Available Features

Some features are accessible regardless of current mode:

| Feature | Access |
|---------|--------|
| Almanac | Top-level nav, cross-season historical reference |
| Hall of Fame Museum | Separate tab, add/view retired player honors |
| Franchise Settings | League rules, display preferences |
| Export/Backup | Full franchise data export |

---

## 7. Cross-References

| Spec | Relevance |
|------|-----------|
| FRANCHISE_MODE_SPEC.md | Save slot management, storage architecture |
| OFFSEASON_SYSTEM_SPEC.md | Full 11-phase offseason specification |
| LEAGUE_BUILDER_SPEC.md | Mode 1 detailed design |
| ALMANAC_SPEC.md | Always-available historical reference |

---

*Last Updated: February 20, 2026*
