# KBL Tracker - UI/UX Planning Session
**Date:** January 27, 2026  
**Status:** In Progress - Awaiting Hand-Drawn Sketches

---

## Overview

This document captures the UI/UX planning session for KBL Tracker, a baseball simulation companion app for Super Mega Baseball 4 (SMB4). The goal is to create a clear user journey and app flow document that can be used with Figma Make to design the interface, then reconnect to the existing backend via Claude Code.

---

## Design Direction

### Visual Aesthetic: 1990s SNES Baseball Game

Reference images provided:
- **Super Baseball Simulator 1.000** (1991, Culture Brain)
- Field view with orange-bordered player info cards, green header bars
- Title screen with gradient text effects (blue→purple, orange→red)
- Chunky pixel-style typography, high contrast colors
- Roster/lineup screen with master-detail pattern (list + player card)

**Key Visual Elements:**
- Orange/gold bordered info cards
- Green header bars on cards
- White text on dark/green backgrounds
- Retro CRT screen aesthetic
- Bold, blocky letterforms
- Color palette: deep black, vibrant primaries, teal accents

---

## App Modes (Three Core Modes)

| Mode | Use Cases | Core Activity |
|------|-----------|---------------|
| **Live Game Tracking** | 1, 2, 3, 4 | Recording at-bats in real-time while playing SMB4 |
| **Season/Stats Management** | 5, 6 | Viewing stats, standings, performance across games |
| **Franchise/League Building** | 7, 8, 9, 10 | Setup, narrative, offseason, multi-year progression |

**Primary Usage Pattern:** Users most often enter the ongoing franchise/season experience to explore storylines, stats, and potential. However, the Game Tracker is the engine that drives the dynamics of the season experience.

**Current Build Status:**
- Game Tracker: Most built-out
- Franchise experience backend: Not complete, but most stat-tracking and narrative logic exists

---

## Use Cases (Full List)

1. Track every at-bat of each SMB4 game (batting, pitching, running, fielding outcomes)
2. In-game tracker similar to GameChanger App for real-time recording
3. Embedded inferential logic that understands baseball rules, scorekeeping, strategy
4. Minimal user input required - clean UX that allows focus on playing the game
5. Track every statistical aspect across full dynamic seasons with 360-degree view
6. Organize and track all aspects of a full virtual baseball season (and multiple seasons)
7. League builder for custom leagues, rules, and multi-year seasons
8. Rich, AI-driven narrative elements impacting teams, players, and fanbase
9. Realistic MLB administrative aspects (Opening Day, All-Star, Trade Deadline, World Series, offseason, awards, retirements, Hall of Fame, free agency, drafting, roster management)
10. Dynamic and original experience across all season elements

---

## User Journey Map (Draft)

### Entry Point: Launch Menu

```
┌─────────────────────────────────────────┐
│            KBL TRACKER                  │
│                                         │
│    ┌─────────────────────────────┐      │
│    │      Load Franchise         │      │  → Most recent franchise
│    └─────────────────────────────┘      │
│    ┌─────────────────────────────┐      │
│    │      New Franchise          │      │  → Setup flow (Pages 1-4)
│    └─────────────────────────────┘      │
│    ┌─────────────────────────────┐      │
│    │      Exhibition Game        │      │  → One-off, no save
│    └─────────────────────────────┘      │
│    ┌─────────────────────────────┐      │
│    │      Exhibition Series      │      │  → 3/5/7 game series
│    └─────────────────────────────┘      │
│                                         │
└─────────────────────────────────────────┘
```

### New Franchise Flow

**Page 1 - Franchise Setup Menu:**
- # of Teams
- # of Games
- # of Innings
- DH? (yes/no)
- Playoff rounds
- Series per round

**Page 2 - Choose Teams:**
- Select teams from list with respective team colors

**Page 3 - Roster Method:**
- Load Standard Rosters → Pre-assigned rosters from database
- Assign Players to Teams → Manual selection of 22 players per team
- Fantasy Draft → Snake-draft style with randomized team order

**Page 4 - Roster Confirmation:**
- If Fantasy Draft: Draft order shows, user confirms launch
- If Assign Players: Users fill out rosters for each team, one by one
- If Load Standard: Franchise loads rosters from team/player database

### Post-Setup Flow

**PENDING:** Hand-drawn sketches will define:
- Franchise Home screen (what user sees after setup/load)
- Navigation from Franchise Home → Game Tracker
- Game Tracker interface and interaction flow
- Return path from Game Tracker → Franchise Home
- Season/Stats views
- Offseason flows

---

## UI Pattern: Master-Detail Roster View

Based on SNES reference screenshot, the roster/lineup view uses:

```
┌─────────────────┬────────────────────────┐
│                 │                        │
│  Roster List    │    Player Card         │
│  (selectable)   │    (reactive to        │
│                 │     selection)         │
│  ► Player 1     │                        │
│    Player 2     │    [Selected player    │
│    Player 3     │     data displays      │
│    ...          │     here]              │
│                 │                        │
│  BENCH          │    - Name, Position    │
│    Player 8     │    - Team logo         │
│    Player 9     │    - Stats (AVG, HR,   │
│    ...          │      RBI)              │
│                 │    - Ratings (BAT,     │
│  PITCHER        │      POW, SPD, DEF)    │
│    Player P     │                        │
│                 │                        │
└─────────────────┴────────────────────────┘
```

**Interaction:** Arrow keys or click to navigate roster; player card updates dynamically based on selection.

---

## Technical Architecture Note

The backend and frontend are separate concerns:

```
┌─────────────────────────────────────┐
│  Frontend (UI Components)           │  ← Gets redesigned
└─────────────────┬───────────────────┘
                  │ calls
┌─────────────────▼───────────────────┐
│  Hooks / State Management           │  ← Stays the same
└─────────────────┬───────────────────┘
                  │ uses
┌─────────────────▼───────────────────┐
│  Backend Logic / Calculations       │  ← Stays the same (WAR, etc.)
└─────────────────────────────────────┘
```

New UI components will import existing hooks and display the same data with new styling. Integration approach: incremental component replacement, not wholesale rewrite.

---

## Tooling Plan

1. **Design Phase:** Figma Make with structured prompt from this document + hand-drawn sketches
2. **Integration Phase:** Figma MCP server connected to Claude Code
   - Remote server: `claude mcp add --transport http figma https://mcp.figma.com/mcp`
   - Requires Figma Dev Mode access (paid plan)
3. **Implementation Phase:** Claude Code wires new UI to existing backend
4. **Testing Phase:** Iterative verification using NFL protocol

---

## Next Steps

- [ ] JK creates hand-drawn sketches of:
  - Franchise Home screen
  - Game Tracker flow (3-5 screenshots showing at-bat sequence)
  - Navigation between screens
- [ ] Claude converts sketches + this doc into Figma Make prompt
- [ ] JK iterates in Figma until design is solid
- [ ] Reconnect via Claude Code to wire frontend to backend
- [ ] Test and iterate on functionality

---

## Reference Images

Saved from conversation:
1. `1769479695607_image.png` - SNES field view with player info cards
2. `1769479710213_image.png` - Super Baseball Simulator 1.000 title screen
3. `1769484418191_image.png` - Figma Dev Mode MCP overview
4. `1769485098874_image.png` - Figma MCP Agent app icon
5. `1769536825842_image.png` - SNES roster/lineup screen with player card

---

## Session Notes

- Game Tracker is the engine driving the franchise experience
- League builder/setup aspects are just to get things launched
- User wants minimal input during live game tracking (focus on playing SMB4)
- The app should understand baseball rules well enough to infer from user input
- Multi-season progression is a key feature (not just single season)
