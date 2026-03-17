# MODE 2: FRANCHISE SEASON — Gospel Specification

**Version:** 1.4 (Gospel — Audit & Contradiction Resolutions Applied)
**Status:** CANONICAL — This document is the single source of truth for Mode 2
**Created:** 2026-02-23
**Updated:** 2026-02-25
**Supersedes:** MODE_2_FRANCHISE_SEASON_GOSPEL_V1.3.md

---

## 1. Overview & Mode Definition
Mode 2 — the Franchise Season — is the **active gameplay hub** where users play games in SMB4, record results in KBL's GameTracker, and manage their franchise throughout a season. It handles the GameTracker, stats pipeline, WAR calculation, narrative engine, and standings.

## 2. Event Model
### 2.1 Shared Enums
* **MojoLevel**: Canonical 6-tier scale: 'Rattled' (-2), 'Tense' (-1), 'Neutral' (0), 'Locked-In' (+1), 'On Fire' (+2), 'Jacked' (+3). **Initialization:** All players start at 'Neutral' during franchise creation (Mode 1) or season-end processing (Mode 3).
* **FitnessLevel**: 'Hurt', 'Weak', 'Strained', 'Well', 'Fit', 'Juiced'.
* **ChemistryType**: 'Competitive', 'Spirited', 'Crafty', 'Scholarly', 'Disciplined'.

## 7. Substitution & Roster System
### 7.5 Team Captain Designation
* **Persistence**: The Team Captain (assigned in Mode 1 §12.1 or Mode 3 §13) is a persistent designation.
* **Effects**: Provides morale and development bonuses based on the player's `charisma` and `loyalty` hidden modifiers.

### 7.6 In-Season Waivers & DFA
* **Waiver Period**: When a player is DFA’d or released, they enter a 3-day (CalendarDate) waiver period.
* **Claim Logic**: Other teams can claim the player in reverse-standings order.
* **Unclaimed Players**: After the 3rd CalendarDate update, unclaimed players move to the **`FREE_AGENT`** `RosterLevel` (the Inactive Player Database) or the Farm Roster (if options remain).

## 22. Schedule System
### 22.1 Schedule & Calendar Sync
* **Calendar-Match Logic**: The schedule system performs a daily check matching the `CalendarDate` in the Franchise Home with the `fictionalDate` of a `ScheduledGame`.
* **Display**: Matching games are automatically pulled into the "Active Game" slot on the dashboard.

[... Rest of Mode 2 content ...]
