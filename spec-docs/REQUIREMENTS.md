# KBL Tracker - Requirements

> **Purpose**: Documented user requirements and constraints
> **Last Updated**: January 2025

---

## Core Purpose

**KBL Tracker is a stat-tracking application for VIDEO GAME baseball** (e.g., MLB The Show).

This is NOT for:
- Real-life baseball games
- Umpire/official scorer use
- Kids league or modified rules

---

## Functional Requirements

### Must Have (P0)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Track all standard at-bat results | ✅ Done | 1B, 2B, 3B, HR, BB, K, GO, FO, etc. |
| Track runner advancement | ✅ Done | User selects outcome for each runner |
| Calculate outs correctly | ✅ Done | Including DP (2 outs), inning flip at 3 |
| Calculate runs correctly | ✅ Done | Respects 3rd-out-on-force rule |
| Calculate RBIs correctly | ✅ Done | Excludes errors, DP, WP, PB, Balk |
| Track extra events | ✅ Done | SB, CS, WP, PB, Pickoff, Balk |
| Undo functionality | ✅ Done | At least 10 states |
| Activity log | ✅ Done | Shows recent plays |

### Should Have (P1)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Data persistence | ❌ Not done | Survive page refresh |
| Substitution tracking | ⚠️ Partial | Buttons exist, no logic |
| Pitcher stat tracking | ❌ Not done | IP, K, BB, ER |

### Nice to Have (P2)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Box score export | ❌ Not done | |
| Multi-game tracking | ❌ Not done | |
| Walk-off detection | ❌ Not done | |

---

## Constraints

### Video Game Context

Since this is for video games, the following real-baseball scenarios are **OUT OF SCOPE**:

- Catcher interference
- Batter interference
- Runner interference (non-obvious)
- Umpire judgment calls
- Checked swing rulings
- Infield fly rule (game handles automatically)
- Balks (game detects, user just records outcome)
- Kids league modifications
- Pitch clock violations

### User Interaction Model

- **User is the source of truth** - They watch the game and input what happened
- **No automatic detection** - App doesn't watch the game
- **User selects all outcomes** - Runner advancement, hit type, etc.
- **User can override** - RBI count can be manually adjusted

---

## Non-Functional Requirements

| Requirement | Target | Status |
|-------------|--------|--------|
| Responsive UI | Works on desktop | ✅ |
| Fast interactions | No lag on clicks | ✅ |
| Clear feedback | Know what was recorded | ✅ |
| Error prevention | Disable invalid actions | ✅ |

---

## User Preferences (Discovered)

These are preferences learned through our working sessions:

1. **Thoroughness over speed** - Complete testing before moving on
2. **Documentation required** - All decisions and findings must be written down
3. **First principles reasoning** - Don't assume, verify
4. **Negative Feedback Loop** - Actively try to break things before declaring success

---

## Glossary

| Term | Definition |
|------|------------|
| AB | At-Bat (excludes walks, HBP, SF, SAC) |
| PA | Plate Appearance (all trips to plate) |
| RBI | Run Batted In |
| RISP | Runner In Scoring Position (2B or 3B) |
| DP | Double Play |
| FC | Fielder's Choice |
| WP | Wild Pitch |
| PB | Passed Ball |
| SF | Sacrifice Fly |
| SAC | Sacrifice Bunt |
| D3K | Dropped Third Strike |
| Force Play | Runner must advance because batter/other runner takes their base |
| Time Play | Non-force out where run can score if it crosses before tag |

---

*Update this document when new requirements are discovered or clarified.*
