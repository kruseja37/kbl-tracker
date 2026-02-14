# KBL XHD Tracker - Grade Change Tracking System

## Overview

Player grades in SMB4 are calculated by the game based on their stats. When we change stats or traits, the grade may change. Since the app doesn't know SMB4's exact grade formula, we must manually confirm grade changes after any modification.

---

## When Grade Checks Are Required

### During Season
1. **Random Event** that affects stats (+/- to any rating)
2. **Random Event** that affects traits (gain/lose trait)
3. **All-Star trait assignment**
4. **Temporary boosts** (Hot Streak, Cold Streak, etc.)

### End of Season
5. **League Leader bonuses** (stat increases)
6. **Award trait assignments** (MVP, Cy Young, etc.)
7. **End-of-Season ratings adjustment**
8. **Any manual stat correction**

---

## Grade Confirmation Flow

### Step 1: Change Applied in App
```
╔══════════════════════════════════════════════════════════════╗
║               CHANGE RECORDED                                 ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Player: Derek Jeter                                          ║
║  Current Grade: A-                                            ║
║                                                               ║
║  Change Applied:                                              ║
║  • League Leader Bonus: +5 Contact (AVG Leader)               ║
║                                                               ║
║  New Stats:                                                   ║
║  POW: 72 | CON: 88 → 93 | SPD: 78 | FLD: 85 | ARM: 82        ║
║                                                               ║
║  ────────────────────────────────────────────────────────────║
║                                                               ║
║  Next Step: Apply this change in SMB4                         ║
║                                                               ║
║                    [Continue to Grade Check]                  ║
╚══════════════════════════════════════════════════════════════╝
```

### Step 2: Apply in SMB4

User goes to SMB4, makes the change to the player, and observes the new grade.

### Step 3: Confirm Grade in App
```
╔══════════════════════════════════════════════════════════════╗
║               GRADE CONFIRMATION                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Player: Derek Jeter                                          ║
║  Previous Grade: A-                                           ║
║                                                               ║
║  After applying +5 Contact in SMB4, what is the new grade?    ║
║                                                               ║
║  ┌──────────────────────────────────────────────────────────┐║
║  │  ○ S                                                     │║
║  │  ○ A+                                                    │║
║  │  ● A   ← (Grade increased!)                              │║
║  │  ○ A-  ← (Previous grade - No change)                    │║
║  │  ○ B+                                                    │║
║  │  ○ B                                                     │║
║  │  ○ B-                                                    │║
║  │  ○ C+                                                    │║
║  │  ○ C                                                     │║
║  │  ○ C-                                                    │║
║  │  ○ D+ or below                                           │║
║  └──────────────────────────────────────────────────────────┘║
║                                                               ║
║                         [Confirm Grade]                       ║
╚══════════════════════════════════════════════════════════════╝
```

### Step 4: Grade Change Logged
```
╔══════════════════════════════════════════════════════════════╗
║               GRADE CHANGE RECORDED                           ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ✓ Derek Jeter: A- → A                                       ║
║                                                               ║
║  This affects:                                                ║
║  • MVP Weight Factor: 0.8 → 0.7                              ║
║  • Ratings Adj Factor (Positive): 0.4 → 0.3                  ║
║  • Ratings Adj Factor (Negative): 5 → 7                      ║
║  • Clutch Multiplier: 0.8× → 0.75×                           ║
║  • Choke Multiplier: 1.3× → 1.35×                            ║
║                                                               ║
║  All calculations have been updated.                          ║
║                                                               ║
║                           [Done]                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Impact of Grade Changes

### MVP Weight Factor
Used in Weighted MVP Rating calculation:

| Grade | MVP Weight |
|-------|------------|
| S | 0.5 |
| A+ | 0.6 |
| A | 0.7 |
| A- | 0.8 |
| B+ | 0.9 |
| B | 1.0 |
| B- | 1.1 |
| C+ | 1.2 |
| C | 1.3 |
| C- | 1.4 |
| D+ or less | 1.5 |

### Ratings Adjustment Factor
Used in End-of-Season calculations:

| Grade | If Positive | If Negative |
|-------|-------------|-------------|
| S | 0.1 | 10 |
| A+ | 0.2 | 8 |
| A | 0.3 | 7 |
| A- | 0.4 | 5 |
| B+ | 0.5 | 4 |
| B | 0.75 | 3 |
| B- | 1.0 | 2 |
| C+ | 1.4 | 1 |
| C | 2.0 | 0.8 |
| C- | 2.5 | 0.5 |
| D+ or less | 3.0 | 0.3 |

### Clutch/Choke Multipliers
From the clutch system design:

| Grade | Clutch Mult | Choke Mult |
|-------|-------------|------------|
| S | 0.6× | 1.5× |
| A+ | 0.7× | 1.4× |
| A | 0.75× | 1.35× |
| A- | 0.8× | 1.3× |
| B+ | 0.9× | 1.15× |
| B | 1.0× | 1.0× |
| B- | 1.1× | 0.9× |
| C+ | 1.25× | 0.75× |
| C | 1.35× | 0.65× |
| C- | 1.45× | 0.55× |
| D+ or less | 1.5× | 0.5× |

---

## Batch Grade Updates

For end-of-season when many players get changes:

### Batch Entry Mode
```
╔══════════════════════════════════════════════════════════════╗
║               BATCH GRADE UPDATE                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  14 players had stat changes. Update their grades:            ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ Player           │ Prev │ Change          │ New Grade   │ ║
║  ├──────────────────┼──────┼─────────────────┼─────────────┤ ║
║  │ Derek Jeter      │ A-   │ +5 CON          │ [A-]  ▼     │ ║
║  │ Mike Piazza      │ B+   │ +5 FLD (GG)     │ [B+]  ▼     │ ║
║  │ Pedro Martinez   │ A    │ +5 VEL (ERA)    │ [A]   ▼     │ ║
║  │ Barry Bonds      │ A+   │ +5 POW (HR)     │ [A+]  ▼     │ ║
║  │ Ken Griffey Jr.  │ A-   │ +5 SPD (Runs)   │ [A-]  ▼     │ ║
║  │ ...              │ ...  │ ...             │ ...         │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  [Apply All Changes] [Skip Unchanged] [Cancel]                ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Grade History Log

Track all grade changes throughout season:

```javascript
{
  playerId: 'player_123',
  gradeHistory: [
    {
      date: '2024-04-01',
      event: 'season_start',
      grade: 'A-',
      note: 'Opening day grade'
    },
    {
      date: '2024-05-15',
      event: 'random_event',
      eventType: 'Hot Streak',
      previousGrade: 'A-',
      newGrade: 'A',
      note: '+15 POW, +15 CON (temporary)'
    },
    {
      date: '2024-07-01',
      event: 'all_star_trait',
      trait: 'RBI Hero',
      previousGrade: 'A',
      newGrade: 'A',
      note: 'No change from trait'
    },
    {
      date: '2024-10-01',
      event: 'hot_streak_expired',
      previousGrade: 'A',
      newGrade: 'A-',
      note: 'Temporary boost ended'
    },
    {
      date: '2024-10-15',
      event: 'league_leader',
      award: 'AVG Leader',
      bonus: '+5 CON',
      previousGrade: 'A-',
      newGrade: 'A',
      note: 'Permanent stat increase'
    }
  ]
}
```

---

## Temporary vs Permanent Changes

### Temporary Changes (Reset at Season End)
- Hot Streak / Cold Streak
- Pitching Surge / Control Issues
- Any "for rest of season" random event

### Permanent Changes
- Random Event stat changes (+/- 10, +/- 5 all)
- Trait gains/losses
- League Leader bonuses
- Award bonuses
- End-of-Season Ratings Adjustment

### Handling Temporary Expiration

At season end:
```
╔══════════════════════════════════════════════════════════════╗
║           TEMPORARY BOOSTS EXPIRING                           ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  The following temporary effects are now ending:              ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ Mike Piazza: Hot Streak expires                         │ ║
║  │   Remove: +15 POW, +15 CON                              │ ║
║  │   Current Grade: A-                                     │ ║
║  │   Check new grade after removal: [___]                  │ ║
║  ├─────────────────────────────────────────────────────────┤ ║
║  │ Randy Johnson: Pitching Surge expires                   │ ║
║  │   Remove: +10 VEL, +10 JNK                              │ ║
║  │   Current Grade: A+                                     │ ║
║  │   Check new grade after removal: [___]                  │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  [Process Expirations]                                        ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Integration Points

### Random Event Integration
After any random event that affects stats/traits:
1. Log the event
2. Display grade check prompt
3. Update grade-dependent calculations

### All-Star Integration
After trait assignment:
1. Log the trait
2. Display grade check prompt
3. Update grade-dependent calculations

### End-of-Season Integration
Process in order:
1. Expire temporary boosts (check grades)
2. Apply league leader bonuses (check grades)
3. Apply award bonuses (check grades)
4. Calculate EOS ratings adjustment
5. Apply EOS adjustment (check grades)
6. Finalize grades for next season
