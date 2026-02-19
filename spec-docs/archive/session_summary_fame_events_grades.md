# KBL XHD Tracker - Session Summary: Fame, Events & Grades

## Documents Created This Session

1. **fame_and_events_system.md** - Overview of Fame Bonus/Boner system
2. **offseason_system_design_v2.md** - Updated awards and All-Star system
3. **random_events_expanded.md** - 50 random events with auto-triggering
4. **fame_triggers_comprehensive.md** - 100+ specific Fame trigger examples
5. **grade_tracking_system.md** - Grade change confirmation workflow
6. **smb4_traits_reference.md** - Updated with Pinch Perfect trait

---

## Key Design Decisions

### 1. Fame Bonus/Boner System
- **Fame Bonus (+1)**: Awesome/clutch moments, legendary status
- **Fame Boner (-1)**: Embarrassing failures, mental errors
- Affects All-Star voting and all subjective awards
- Pre-season Fame for legends (Babe Ruth = +3)

### 2. All-Star Voting ("Votes")
- **Formula**: `Votes = Raw Score × 10`
- **Components**: WAR (50%) + Clutch (30%) + Narrative (20%)
- **Narrative**: Traditional Stats + Milestones + Fame (split evenly)
- **Trigger**: 60% of games played
- **Reward**: Random trait (NOT ratings adjustment)
- **Minimum**: Each team gets at least 1 All-Star

### 3. Random Events System
- **50 events** across 8 categories
- **Auto-trigger**: 20 hidden events scheduled at season start
- Events fire randomly throughout season (you don't know when!)
- After each game, app checks if an event should trigger
- **Weighted**: Some events more common than others

### 4. Grade Change Tracking
- Grade confirmation required after ANY stat/trait change
- User makes change in SMB4, then confirms new grade in app
- Grade changes affect:
  - MVP Weight Factor
  - Ratings Adjustment Factor
  - Clutch/Choke Multipliers

### 5. Cy Young Criteria (No Traditional Stats)
- pWAR: 40%
- FIP/True ERA: 25%
- Clutch: 25%
- Team Success: 5%
- Fame/Narrative: 5%

### 6. Gold Glove "Eye Test"
- Eye Test = Fielding Fame + User Manual Adjustment (-5 to +5)
- Allows override when numbers don't capture reality

### 7. Bench Player of the Year
- Reward: **Pinch Perfect** trait (Disciplined chemistry)
- Trait exists in SMB4 - improves stats when entering as substitute

---

## Award Rewards Summary

### Trait Assignments

| Award | Trait |
|-------|-------|
| MVP Winner | Random positive |
| MVP 2nd/3rd | Random (any) |
| Cy Young Winner | Random positive (pitching) |
| Cy Young 2nd/3rd | Random (any) |
| Reliever of Year | **Clutch** (guaranteed) |
| Bench Player | **Pinch Perfect** (guaranteed) |
| ROY / ROY Runner-up | Random |
| Kara Kawaguchi | **Tough Out** + random positive |
| Bust of the Year | **Choker** (guaranteed) |
| All-Star Selection | Random (position-appropriate) |

### Stat Assignments (League Leaders)

| Leader | Reward |
|--------|--------|
| AVG | +5 Contact |
| HR | +5 Power |
| RBI | +3 Contact, +3 Power |
| ERA | +5 to ACC, JNK, or VEL |
| WHIP | +5 to ACC, JNK, or VEL |
| K Leader | +5 to JNK or VEL |
| Most Hitting K's | **Whiffer** trait |
| Most Hitting BB's | +5 Speed |
| Highest Net SB% | **Stealer** or +5 Speed |
| Most Saves | **Clutch** trait |
| Most BB Ratio | **BB Prone** trait |
| Most Runs | +5 Speed |
| Best Hitting Pitcher | +15 Power, +15 Contact |
| Gold Glove | +5 Fielding |
| Platinum Glove | +5 Fielding (total +10) |
| Booger Glove | **Butter Fingers** or lose trait |
| Comeback Player | Restore Old Ratings |
| Postseason MVP | +10 points (max 5 to one category) |

---

## Random Events Quick Reference

### High Probability (Common)
- Trait events (gain/lose/swap)
- Stat boosts/drops (+/- 10, +/- 5)
- Hot/Cold streaks

### Medium Probability
- Position changes
- Team events (stadium, manager)
- Cosmetic changes

### Low Probability (Rare)
- Wild Card (double events)
- Blessing/Curse (pick a player)
- Team-wide events

---

## Fame Triggers Quick Reference

### Easy +1 Fame Bonus
- Walk-off hit
- Grand slam
- Complete game shutout
- 10+ strikeout game
- Robbing home run
- Career milestone

### Easy -1 Fame Boner
- 4+ strikeouts in game
- Error allowing run
- Blown save
- TOOTBLAN
- Nutshot

### Pre-Season Fame
- All-time legend: +3
- Hall of Famer: +2
- Star player (A- or better): +1
- Known choker: -1

---

## Ratings Adjustment Reminder

The End-of-Season Ratings Calculator uses:
- **Weighted MVP Rating** based on season performance
- **Midpoint** by position type
- **Grade-based weight factors**

High-grade players: Small rewards, big penalties for underperforming
Low-grade players: Big rewards, small penalties for underperforming

This is SEPARATE from trait assignments and applies to ALL players.

---

## Next Steps

1. Verify "Pinch Perfect" trait exists in your SMB4 version
2. Decide on specific event frequency (20 events per season?)
3. Consider Fame decay rules (optional)
4. Test grade change workflow
