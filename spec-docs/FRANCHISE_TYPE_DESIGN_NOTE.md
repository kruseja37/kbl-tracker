# Franchise Type & Team Control — Design Note

**Created:** 2026-02-22
**Status:** DRAFT — JK approved direction, needs gospel integration
**Scope:** Defines how 1P Solo, Multiplayer Co-Op, and Custom franchise types work across all three modes
**Feeds:** MODE_1_LEAGUE_BUILDER.md, MODE_2_FRANCHISE_SEASON.md, MODE_3_OFFSEASON_WORKSHOP.md

---

## 1. Core Principle

**KBL only knows what it witnesses.** If no human was involved in a game, that game has no event data. KBL is a scorebook, not a simulation engine. This is the philosophical foundation of the event-driven model.

However, users CAN optionally input AI-vs-AI scores (no stats, no events) to maintain league-wide standings and enable playoff seeding.

---

## 2. Franchise Types

Set during Mode 1 (League Builder) and persisted for the life of the franchise.

| Type | Human Teams | AI Teams | Use Case |
|------|------------|----------|----------|
| **Solo Franchise** | 1 | Rest of league | Default. One user, one team, full story. |
| **Couch Co-Op** | All | 0 | Multiplayer. All teams human-controlled. Full tracking for all games. |
| **Custom** | 2+ | Rest of league | One user managing multiple teams, or multiple users each with 1+ teams. |

### 2.1 The `controlledBy` Flag

```typescript
interface Team {
  // ... existing fields
  controlledBy: 'human' | 'ai';
}
```

This flag does NOT gate access. The user has full editing power over every team (commissioner role). The flag gates **experience**:

- **Human team:** Full dashboard, narrative feed, stat deep-dives, proactive notifications, designation tracking, rich GameTracker experience
- **AI team:** Full editing access (roster, lineup, mojo/fitness), but surfaced reactively — user visits AI team pages when needed to sync with SMB4 reality, not because the app is pushing their story

**Analogy:** User is both the commissioner of the league AND the manager of their human team(s). Commissioner powers = edit anything. Manager experience = narrative depth.

---

## 3. Mode 2 Implications: Franchise Season

### 3.1 GameTracker — Full Control, Both Sides

The user has full real-time editing control over BOTH team lineups throughout every game. This is already how GameTracker works — the visiting team lineup is editable. No architectural change needed.

During a game, the user can:
- Edit AI team starting lineup (to match SMB4 reality)
- Record AI substitutions as they happen (pinch hitters, defensive replacements, pitching changes)
- Update mojo/fitness for any player on either team at any time
- All events are tracked for BOTH teams — hits, outs, errors, everything

Every event involving an AI team player in a game against a human team is fully tracked. This feeds:
- AI player stat accumulation (from human-team games only)
- Narrative beats (rivalries between specific pitchers/hitters across teams)
- Designation eligibility for AI players (based on available data)
- Milestone detection for AI players

### 3.2 Standings — Hybrid Model

| Game Type | Tracked Data | Source |
|-----------|-------------|--------|
| Human vs AI | Full events, full stats, full box score | GameTracker |
| Human vs Human | Full events, full stats, full box score | GameTracker |
| AI vs AI | Score only (W/L, runs) | Optional manual input |

**Standings view:**
- Human team(s): Full W-L record from all played games
- AI teams: W-L includes games vs human teams (full data) + AI-vs-AI scores (if entered)
- If AI-vs-AI scores not entered, those games don't exist — standings reflect only tracked games

**AI-vs-AI Score Entry:**
- Simple batch input screen: "Enter other results"
- Fields: Away team, Home team, Away runs, Home runs
- Quick entry — no box score, no events, no stats
- Optional — user can skip entirely
- Enables: playoff seeding, full league standings, season history completeness

### 3.3 Playoffs

Playoff seeding uses available standings data. If AI-vs-AI scores were entered, full league standings drive seeding. If not, seeding is scoped to available data (human team's record + known AI records).

Playoff games involving the human team: full GameTracker experience.
Playoff games NOT involving the human team: score-only input (same as AI-vs-AI regular season).

### 3.4 Narrative — Full Coverage for Witnessed Games

All narrative engines (beat reporters, storylines, milestones) operate on event data from human-team games. This means:

- **Rivalries:** Tracked between specific players across teams (e.g., AI pitcher vs human slugger). Built from real at-bat history.
- **Streaks/milestones:** AI players accumulate stats game by game against human teams. A rival pitcher's stats against you over multiple series create real storylines.
- **Reporter beats:** Generate stories from human-team perspective. "The rival ace shut down your lineup again" etc.
- **Designations:** AI players can earn designations based on their performance in human-team games.

What narrative CANNOT do in Solo/Custom mode:
- Report on AI-vs-AI game events (no event data exists)
- Calculate league-wide stat leaders with full accuracy (AI players only have partial seasons)
- Generate stories about things KBL didn't witness

### 3.5 All-Star Selection — Partial Data Approach

| Player Type | Data Basis | Method |
|-------------|-----------|--------|
| Human team players | Full season stats | Standard statistical voting |
| AI team players | Stats from human-team games only | Per-game averages, ranked against other AI players |

AI players are compared apples-to-apples against each other using the same limited dataset. An AI pitcher with a 1.50 ERA across 4 starts against human teams is compared against other AI pitchers using their human-team appearances.

**Alternative:** User picks All-Stars by eye test (fits "game night" vibe). Both options can coexist — statistical suggestion + user override.

### 3.6 Schedule View

- **Solo/Custom:** Shows human team's schedule. "Next game" is always a human-team game. AI-vs-AI games appear in a secondary "other games" section for optional score entry.
- **Couch Co-Op:** Shows full league schedule. "Next unplayed game" for any team. No AI-vs-AI section exists.

---

## 4. Mode 3 Implications: Offseason Workshop

### 4.1 Phase Scope Configuration

Each offseason phase has a scope setting, configured in Mode 1 (League Builder) rules:

```typescript
type PhaseScope = 'all-teams' | 'human-only';

interface OffseasonPhaseConfig {
  phase: number;
  scope: PhaseScope;
  aiResolution: 'auto' | 'skip'; // What happens for AI teams when scope is 'human-only'
}
```

### 4.2 Default Phase Scopes

| Phase | Name | Default Scope | Rationale |
|-------|------|--------------|-----------|
| 1 | Season End Processing | all-teams | Structural — everyone's season ends |
| 2 | Awards Ceremony | human-only | Requires full season stats for voting |
| 3 | Salary Recalculation #1 | human-only | Tied to EOS rating changes, needs stat basis |
| 4 | Expansion | all-teams | Structural — affects league composition |
| 5 | Retirements | all-teams | Aging happens to everyone; league ecosystem health |
| 6 | Free Agency | all-teams | Players need to move; league ecosystem |
| 7 | Draft | all-teams | Everyone needs prospects; league ecosystem |
| 8 | Salary Recalculation #2 | human-only | Post-draft, tied to rating changes |
| 9 | Offseason Trades | all-teams | League ecosystem; human teams trade interactively, AI teams auto-trade or skip |
| 10 | Salary Recalculation #3 | human-only | Post-trade, tied to rating changes |
| 11 | Finalize & Advance | all-teams | Roster compliance for everyone |
| 12 | Farm Reconciliation | human-only | Requires call-up/option data from season |
| 13 | Chemistry Rebalancing | human-only | Requires full roster interaction data |
| 14 | (TBD per C-049) | TBD | TBD |

### 4.3 AI Team Resolution in Human-Only Phases

When a phase is scoped `human-only`, AI teams either:

- **Auto-resolve:** System applies a reasonable default (e.g., salary stays flat, no rating changes)
- **Skip:** Phase simply doesn't apply to AI teams

For `all-teams` phases, AI teams get a simplified path:

| Phase | AI Team Experience |
|-------|-------------------|
| Retirements | Auto-calculated based on age + years of service (no morale factor since we lack full data) |
| Free Agency | AI teams participate in FA pool. If AI player leaves AI team → auto-destination by personality. If AI player leaves for human team → full interactive experience |
| Draft | AI teams draft via auto-pick logic (reverse record order, BPA). Human teams get full interactive draft |
| Trades | AI teams available as trade partners for human teams. AI-to-AI trades: auto or skip (configurable) |
| Finalize | AI teams auto-resolve cut-down and signing rounds |

### 4.4 Awards with Partial Data

Awards ceremony in human-only scope:

- **Human team awards:** Full statistical basis. MVP, Cy Young, etc. calculated from complete data.
- **League-wide awards:** Based on available data. AI players judged on human-team appearances. Clearly imperfect but honest.
- **User override:** User can always override any award. "I know this AI player dominated the league even though I only saw him 4 times."
- **Eye test option:** User nominates/selects awards by gut feel rather than pure stats.

---

## 5. Mode 1 Implications: League Builder

### 5.1 Franchise Type Selection

New section in League Builder: **Franchise Type**

```typescript
interface FranchiseTypeConfig {
  type: 'solo' | 'couch-coop' | 'custom';
  humanTeams: string[];  // teamIds flagged as human-controlled
  aiScoreEntry: boolean; // Enable AI-vs-AI score input during season
  offseasonPhaseScopes: OffseasonPhaseConfig[]; // Per-phase scope overrides
}
```

**Solo preset:**
- 1 human team (user selects which)
- AI score entry: enabled by default (optional)
- Phase scopes: defaults from §4.2

**Couch Co-Op preset:**
- All teams human
- AI score entry: N/A (no AI teams)
- Phase scopes: all phases are `all-teams`

**Custom preset:**
- User selects which teams are human (2+)
- AI score entry: configurable
- Phase scopes: configurable per phase

### 5.2 Rules Preset Impact

Franchise type selection adds a rules section but doesn't change existing rules presets. It's additive — a new tab/section in League Builder alongside game settings, season settings, etc.

---

## 6. Couch Co-Op Specifics

When all teams are human-controlled:

- **Every game is fully tracked.** No partial data problem.
- **Full league standings.** Complete W-L for everyone.
- **Full narrative for everyone.** Every team gets the rich experience.
- **All offseason phases apply to all teams.** No scope toggling needed.
- **Schedule:** "Next unplayed game" for the league. Players take turns playing games in SMB4 and scoring them.
- **No AI logic needed anywhere.** No auto-draft, no auto-FA, no AI trade partners.
- **Turn coordination:** Not an issue. SMB4 determines schedule order. Players play games as they come. If Team A has 3 consecutive home games, that player plays 3 games before anyone else.

This is the simplest mode architecturally. It's the "pure scorebook" experience.

---

## 7. Data Model Summary

New/modified interfaces:

```typescript
// Team model addition
interface Team {
  controlledBy: 'human' | 'ai';
}

// Franchise config addition
interface FranchiseTypeConfig {
  type: 'solo' | 'couch-coop' | 'custom';
  humanTeams: string[];
  aiScoreEntry: boolean;
  offseasonPhaseScopes: OffseasonPhaseConfig[];
}

// Offseason phase config
interface OffseasonPhaseConfig {
  phase: number;
  scope: 'all-teams' | 'human-only';
  aiResolution: 'auto' | 'skip';
}

// AI-vs-AI score entry (new, minimal)
interface AIGameScore {
  gameId: string;
  awayTeamId: string;
  homeTeamId: string;
  awayRuns: number;
  homeRuns: number;
  date: string; // fictional date
}
```

---

## 8. What This Does NOT Change

- GameTracker event model (unchanged)
- Stats pipeline (unchanged — just processes whatever events exist)
- WAR calculations (unchanged — operate on available data)
- Narrative engine (unchanged — generates from available events)
- Designation system (unchanged — triggers on available data)
- Offseason phase sequence (unchanged — just adds scope gating)
- Almanac (unchanged — stores whatever data exists)

This is a **configuration layer**, not a structural change. The core architecture processes events. This design note defines which events exist based on franchise type.

---

## 9. Gospel Integration Plan

| Gospel | What to Add | Where |
|--------|------------|-------|
| MODE_1_LEAGUE_BUILDER.md | Franchise Type section (§5.1-5.2), `controlledBy` in team model, phase scope in rules | New section after team creation, before rules presets |
| MODE_2_FRANCHISE_SEASON.md | Hybrid standings, AI-vs-AI score entry, schedule view scoping, All-Star partial data rules, narrative scoping | Additions to standings, schedule, narrative, and awards sections |
| MODE_3_OFFSEASON_WORKSHOP.md | Phase scope logic at each phase entry, AI team resolution paths, awards partial data | Gate check at top of each phase + AI resolution subsection |
| ALMANAC.md | No change — Almanac stores whatever data exists | — |

---

*This document captures the 2026-02-22 design discussion. Integrate into gospels during drafting.*
