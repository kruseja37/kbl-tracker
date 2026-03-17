# MODE 3: OFFSEASON WORKSHOP — Gospel Specification

**Version:** 1.2 (Gospel — Audit Applied)
**Status:** CANONICAL — This document is the single source of truth for Mode 3
**Created:** 2026-02-23
**Updated:** 2026-02-25
**Supersedes:** MODE_3_OFFSEASON_WORKSHOP_GOSPEL_V1.1.md

---

## 3. Phase 1: Season End Processing
### 3.1 Purpose
Close the completed season: finalize standings, select postseason MVP, distribute championship rewards, reset player mojo, and process fitness recovery.
* **Mojo Reset**: All players reset to 'Neutral' mojo.
* **Fitness Recovery**: All players' FitnessLevel advances by two tiers (e.g., 'Hurt' becomes 'Strained').
* **Designation Stamping**: Cornerstone and Fan Favorite designations are "stamped" here to ensure accuracy for the Phase 9 trade window.
* **NPC Tenure Update**: Increment tenure for team NPCs (Beat Reporters, Managers, Scouts).

## 4. Phase 2: Awards Ceremony
* **Team Captain**: The Team Captain is NOT awarded or changed during the awards ceremony; it is a season-start initialization handled in Phase 13.

## 9. Phase 7: Draft
### 9.6 Draft-Round Salary & Slotted Pay
* **Rookie Lock**: Draft-Round Salary is the exclusive, final flat rate and is exempt from Age/Trait/Performance modifiers until the player completes their first full MLB season. The `isSalaryLocked` flag is set to TRUE.
* **Farm Slotted Salary**: Farm prospects receive a slotted salary based strictly on draft position, which is locked during the offseason and next season.

## 10. Phase 8: Salary Recalculation #2
* **Exemptions**: Drafted rookies and Farm Roster players (where `isSalaryLocked === true`) are exempt from recalculation passes to maintain their locked slot pay.

## 15. Phase 13: Finalize & Advance
### 15.1 Season Transition
* **Team Captain Re-assignment**: Perform an automated pass to assign/re-assign the Team Captain for the upcoming season. 
* **Logic**: Highest combined score of `charisma` and `loyalty` hidden modifiers (matches Mode 1 §12.1).

[... Rest of Mode 3 content ...]
