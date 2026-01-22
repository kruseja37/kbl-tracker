# KBL XHD Tracker - Expanded Random Events System

## Event Triggering System

### How Events Trigger During Season

Instead of manually triggering events, the app will:
1. **Pre-schedule 20 random event "slots"** at season start
2. Events are hidden - you don't know when they'll trigger
3. After each game, app checks if an event should fire
4. When triggered, event type and target player are randomized

### Scheduling Algorithm

```javascript
function scheduleSeasonEvents(totalGames, eventCount = 20) {
  const events = [];
  const minGap = Math.floor(totalGames / (eventCount + 2)); // Ensure spacing

  for (let i = 0; i < eventCount; i++) {
    // Random game number, weighted toward middle of season
    let gameNum;
    do {
      gameNum = Math.floor(Math.random() * totalGames) + 1;
    } while (events.some(e => Math.abs(e.game - gameNum) < minGap));

    events.push({
      game: gameNum,
      triggered: false,
      eventType: null,
      targetPlayer: null
    });
  }

  return events.sort((a, b) => a.game - b.game);
}
```

### Event Check After Each Game

```
╔══════════════════════════════════════════════════════════════╗
║                   ⚡ RANDOM EVENT! ⚡                          ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  After Game 34 of 80...                                       ║
║                                                               ║
║  🎲 Rolling for event type...                                 ║
║     Result: 14 - HOT STREAK!                                  ║
║                                                               ║
║  🎲 Rolling for target player...                              ║
║     Result: Player #127 - Mike Piazza (Mets)                  ║
║                                                               ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │  HOT STREAK                                            │  ║
║  │  Mike Piazza gains +15 POW and +15 CON                 │  ║
║  │  for the remainder of the season!                      │  ║
║  │                                                        │  ║
║  │  💥 This is a temporary boost that will reset          │  ║
║  │     at season's end.                                   │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  Did this change the player's grade?                          ║
║  Current Grade: B+                                            ║
║                                                               ║
║  [No Change]  [Grade Increased to: ___]  [Grade Decreased]   ║
╚══════════════════════════════════════════════════════════════╝
```

### Event Progress Indicator (Hidden Details)

During season, show mystery indicator:
```
Season Events: ████████░░░░░░░░░░░░ 8/20 triggered
Next Event: ??? (could be any game!)
```

---

## Expanded Random Events (40 Total)

### TRAIT EVENTS (1-8)

| # | Event | Description | Applies To |
|---|-------|-------------|------------|
| 1 | **Random Trait** | Gain any random trait (positive or negative) | All |
| 2 | **Random Good Trait** | Gain a random positive trait | All |
| 3 | **Random Bad Trait** | Gain a random negative trait | All |
| 4 | **Lose a Trait** | Lose one of your existing traits randomly | Has traits |
| 5 | **Trait Swap** | Swap one trait for another random trait | Has traits |
| 6 | **Chemistry Shift** | Gain trait from different chemistry type | All |
| 7 | **Elite Pitch Gained** | Pitcher gains random Elite pitch trait | Pitchers |
| 8 | **Elite Pitch Lost** | Pitcher loses an Elite pitch trait | Has Elite |

### POSITION EVENTS (9-14)

| # | Event | Description | Applies To |
|---|-------|-------------|------------|
| 9 | **Random Secondary Position** | Gain a random secondary position | Position players |
| 10 | **Random Primary Position** | Primary position changes randomly | Position players |
| 11 | **Chosen Secondary Position** | User chooses new secondary position | Position players |
| 12 | **Lose Secondary Position** | Lose ability to play secondary position | Has secondary |
| 13 | **Utility Upgrade** | Gain IF, OF, or IF-OF designation | Position players |
| 14 | **Position Downgrade** | Lose IF, OF, or IF-OF designation | Has utility |

### STATS EVENTS (15-24)

| # | Event | Description | Applies To |
|---|-------|-------------|------------|
| 15 | **+10 Random Category** | Boost random stat (POW/CON/SPD/FLD/ARM or VEL/JNK/ACC) by 10 | All |
| 16 | **-10 Random Category** | Drop random stat by 10 | All |
| 17 | **+5 All Categories** | Small boost to all stats | All |
| 18 | **-5 All Categories** | Small drop to all stats | All |
| 19 | **Hot Streak** | +15 POW and +15 CON for rest of season | Batters |
| 20 | **Cold Streak** | -15 POW and -15 CON for rest of season | Batters |
| 21 | **Pitching Surge** | +10 VEL and +10 JNK for rest of season | Pitchers |
| 22 | **Control Issues** | -15 ACC for rest of season | Pitchers |
| 23 | **Speed Burst** | +20 SPD permanent | Position players |
| 24 | **Legs Tired** | -10 SPD permanent | Position players |

### PITCHING EVENTS (25-28)

| # | Event | Description | Applies To |
|---|-------|-------------|------------|
| 25 | **Add Random Pitch** | Pitcher gains a new pitch type | Pitchers |
| 26 | **Subtract Random Pitch** | Pitcher loses a pitch type (min 2 remaining) | Has 3+ pitches |
| 27 | **Signature Pitch** | One pitch becomes "elite" level | Pitchers |
| 28 | **Pitch Regression** | Lose effectiveness on one pitch type | Pitchers |

### TEAM/STATUS EVENTS (29-34)

| # | Event | Description | Applies To |
|---|-------|-------------|------------|
| 29 | **Change Personality** | Personality type changes | All |
| 30 | **Change Stadium** | Team's home stadium changes | Team-wide |
| 31 | **Fire Manager** | Team's manager is fired (new random manager) | Team-wide |
| 32 | **Injury Scare** | Player misses 3-5 games | All |
| 33 | **Freak Injury** | Player misses 10-15 games | All |
| 34 | **Iron Man** | Player immune to injuries for rest of season | All |

### FAME/NARRATIVE EVENTS (35-38)

| # | Event | Description | Applies To |
|---|-------|-------------|------------|
| 35 | **Contract Extension** | Player gets +2 Fame Bonus (fan favorite) | All |
| 36 | **Controversy** | Player gets +2 Fame Boners (scandal/drama) | All |
| 37 | **Redemption Arc** | Clear all Fame Boners, gain +1 Fame Bonus | Has Boners |
| 38 | **Fall From Grace** | Clear all Fame Bonuses, gain +1 Fame Boner | Has Bonuses |

### COSMETIC EVENTS (39-44)

| # | Event | Description | Applies To |
|---|-------|-------------|------------|
| 39 | **Random Batting Stance** | Batting stance or pitching motion changes | All |
| 40 | **Add Silly Accessory** | Gain a funny accessory | All |
| 41 | **Add Cool Accessory** | Gain a stylish accessory | All |
| 42 | **Change Facial Hair** | Facial hair style changes | All |
| 43 | **Name Change** | Boy first name, girl last name | All |
| 44 | **Nickname Earned** | Player gets a new nickname | All |

### SPECIAL EVENTS (45-50)

| # | Event | Description | Applies To |
|---|-------|-------------|------------|
| 45 | **Wild Card!** | Roll twice, apply both events | All |
| 46 | **Double Wild Card!** | Roll THREE times, apply all events | All |
| 47 | **Team Event** | Random event applies to entire team | Team-wide |
| 48 | **Rival Curse** | Pick rival player, they get bad event | All |
| 49 | **Blessing** | Pick any player, they get good event | All |
| 50 | **Re-Roll** | Discard this result, roll again | - |

---

## Event Weighting

Not all events are equally likely. Weight by category:

| Category | Weight | Chance |
|----------|--------|--------|
| Trait Events (1-8) | 20% | Common |
| Position Events (9-14) | 10% | Uncommon |
| Stats Events (15-24) | 25% | Common |
| Pitching Events (25-28) | 10% | Uncommon |
| Team/Status Events (29-34) | 12% | Moderate |
| Fame Events (35-38) | 8% | Uncommon |
| Cosmetic Events (39-44) | 10% | Moderate |
| Special Events (45-50) | 5% | Rare |

### Weighted Roll Implementation

```javascript
function rollEvent() {
  const weights = [
    { range: [1, 8], weight: 20 },    // Trait
    { range: [9, 14], weight: 10 },   // Position
    { range: [15, 24], weight: 25 },  // Stats
    { range: [25, 28], weight: 10 },  // Pitching
    { range: [29, 34], weight: 12 },  // Team/Status
    { range: [35, 38], weight: 8 },   // Fame
    { range: [39, 44], weight: 10 },  // Cosmetic
    { range: [45, 50], weight: 5 }    // Special
  ];

  const roll = Math.random() * 100;
  let cumulative = 0;

  for (const category of weights) {
    cumulative += category.weight;
    if (roll < cumulative) {
      const [min, max] = category.range;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
  }
}
```

---

## Grade Change Tracking

### When Grade Changes Can Occur

1. After any trait change (gain, lose, swap)
2. After any stats change (+/- to ratings)
3. After All-Star trait assignment
4. After end-of-season ratings adjustment
5. After league leader/award bonuses

### Grade Change Confirmation UI

```
╔══════════════════════════════════════════════════════════════╗
║                   GRADE CHECK                                 ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Player: Mike Piazza                                          ║
║  Change Applied: +10 Power (Random Event #15)                 ║
║                                                               ║
║  Previous Stats:                                              ║
║  POW: 85 → 95 | CON: 78 | SPD: 45 | FLD: 72 | ARM: 68        ║
║                                                               ║
║  Previous Grade: B+                                           ║
║                                                               ║
║  ────────────────────────────────────────────────────────────║
║                                                               ║
║  After making this change in SMB4, did the grade change?      ║
║                                                               ║
║  [No - Still B+]                                              ║
║                                                               ║
║  [Yes - New Grade: ___]                                       ║
║     ○ S   ○ A+  ○ A   ○ A-  ○ B+  ○ B   ○ B-                 ║
║     ○ C+  ○ C   ○ C-  ○ D+  ○ D   ○ D-                       ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

### Grade Change Logging

```javascript
{
  id: 'grade_change_001',
  playerId: 'player_123',
  seasonId: 2024,
  gameNumber: 34, // or 'offseason'
  previousGrade: 'B+',
  newGrade: 'A-',
  cause: 'random_event',
  eventDetails: {
    eventType: 15, // +10 Random Category
    statChanged: 'POW',
    changeAmount: 10
  },
  timestamp: '2024-07-15T20:30:00Z'
}
```

### Impact of Grade Changes

When grade changes, the following are recalculated:
1. **MVP Weight Factor** (for weighted MVP rating)
2. **Ratings Adjustment Factor** (for end-of-season)
3. **Clutch/Choke Multipliers** (Grade affects multiplier)
4. **WAR positional adjustments** (if applicable)

---

## Event History Log

### Season Event Summary

```
╔══════════════════════════════════════════════════════════════╗
║                   SEASON EVENT LOG                            ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Game 12: Hot Streak → Mike Piazza (B+ → A-)                 ║
║           +15 POW, +15 CON (temporary)                        ║
║                                                               ║
║  Game 23: Random Bad Trait → Derek Jeter                     ║
║           Gained "Whiffer" trait (no grade change)            ║
║                                                               ║
║  Game 34: Fire Manager → Yankees                              ║
║           Billy Martin → Joe Torre                            ║
║                                                               ║
║  Game 41: Wild Card! → Pedro Martinez                         ║
║           Roll 1: +10 VEL (no grade change)                   ║
║           Roll 2: Add Random Pitch - Gained Screwball         ║
║                                                               ║
║  Game 55: Controversy → Barry Bonds                           ║
║           +2 Fame Boners                                       ║
║                                                               ║
║  [View All 20 Events]  [Export Log]                           ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Event Applicability Rules

### Events That Don't Apply

If an event doesn't apply to the target player, re-roll:

| Event | Doesn't Apply If |
|-------|------------------|
| Lose a Trait | Player has no traits |
| Trait Swap | Player has no traits |
| Elite Pitch Gained | Player is not a pitcher |
| Elite Pitch Lost | Player has no Elite pitch traits |
| Lose Secondary | Player has no secondary position |
| Hot/Cold Streak | Player is a pitcher |
| Pitching Surge | Player is not a pitcher |
| Add Random Pitch | Player is not a pitcher |
| Subtract Pitch | Pitcher has only 2 pitches |
| Redemption Arc | Player has no Fame Boners |
| Fall From Grace | Player has no Fame Bonuses |

### Re-Roll Limit

Maximum 3 re-rolls per event trigger. If still no valid event after 3 re-rolls, event is skipped and logged as "Event Fizzled."
