# KBL XHD Tracker - CSV Templates v2

## Overview

This folder contains all CSV templates needed for the complete KBL XHD + Jester stat tracking system.

## Master Data (Rarely Changed)

### teams.csv
Core team information with colors and stadium assignments.
- **Key**: teamId
- **Links to**: stadiums.csv (stadiumId)

### stadiums.csv
All 21 SMB4 stadiums with dimensions, wall heights, and initial park factors.
- **Key**: stadiumId
- **Park Factor**: 1.0 = neutral, >1.0 = hitter friendly, <1.0 = pitcher friendly

### players.csv
Master player database with all SMB4 attributes.
- **Key**: playerId
- **Note**: No team assignment here - use rosters.csv for team assignments

## Season-Specific Data

### seasons.csv
Season configuration and status.
- **Key**: seasonId
- **Contains**: League rules, DH settings, rookie limits

### rosters.csv
Links players to teams for each season. Enables tracking trades and team changes.
- **Key**: rosterId
- **Links to**: seasons.csv, players.csv, teams.csv
- **Important**: A player can appear multiple times per season if traded

### schedule.csv
Game schedule with results.
- **Key**: gameId
- **Links to**: seasons.csv, teams.csv, stadiums.csv
- **Status**: pending, final, postponed

## Stats Tracking

### mvpstats.csv
KBL-specific MVP race tracking with all custom metrics.
- **Key**: mvpStatId
- **Links to**: seasons.csv, players.csv, teams.csv
- **Tracks**: Fame Bonus, Clutch, Chokes, Errors, Killed Pitchers, etc.

### batting.csv
Season batting stats with Jester-style advanced metrics.
- **Key**: battingId
- **Links to**: seasons.csv, players.csv, teams.csv
- **Includes**: Traditional stats + wOBA, wRC+, WAR

### pitching.csv
Season pitching stats with Jester-style advanced metrics.
- **Key**: pitchingId
- **Links to**: seasons.csv, players.csv, teams.csv
- **Includes**: Traditional stats + FIP, K/9, WAR

### boxscores.csv
Per-game individual player stats.
- **Key**: boxscoreId
- **Links to**: games (via gameId), players, teams
- **Use**: Calculate season stats as deltas between games

## Events & History

### homeruns.csv
Individual home run tracking with distances.
- **Key**: hrId
- **Links to**: games, players (batter + pitcher), stadiums
- **Use**: Stadium records, park factor adjustments, head-to-head data

### records.csv
League records (single-game, season, career).
- **Key**: recordId
- **Categories**: Pitching, Hitting, Fielding, Team, Stadium

### randomevents.csv
D20 random event outcomes.
- **Key**: eventId
- **D20 Events**: Traits, position changes, rating changes, stadium changes, etc.

### transactions.csv
Trades, free agency, retirements.
- **Key**: transactionId
- **Types**: trade, free_agency, retirement, draft, call_up, release

### awards.csv
End-of-season awards with rewards.
- **Key**: awardId
- **Award Types**: MVP, Cy Young, ROY, Gold Glove, etc.
- **Reward Types**: trait, rating_boost, accessory

### allstars.csv
All-Star selections and outcomes.
- **Key**: allstarId
- **Result Types**: traitGained, traitLost, ratingChange

## Data Flow

```
Master Data:
  players.csv ──┐
  teams.csv ────┼──> rosters.csv (per season)
  stadiums.csv ─┘

Game Flow:
  schedule.csv ──> boxscores.csv ──> batting.csv / pitching.csv
                        │
                        └──> mvpstats.csv (KBL tracking)
                        └──> homeruns.csv

Events:
  randomevents.csv ──> players.csv (rating changes)
                  ──> teams.csv (stadium changes)

  transactions.csv ──> rosters.csv (team changes)

End of Season:
  mvpstats.csv ──> awards.csv
  batting.csv ──> awards.csv (league leaders)
  allstars.csv ──> players.csv (trait changes)
```

## Import Order

When setting up a new season:
1. stadiums.csv (if adding new stadiums)
2. teams.csv (assign stadiums)
3. players.csv (add new players)
4. seasons.csv (create new season)
5. rosters.csv (assign players to teams)
6. schedule.csv (import game schedule)
7. Initialize mvpstats.csv, batting.csv, pitching.csv with zeros

## Key Relationships

| From | To | Via |
|------|-----|-----|
| rosters | players | playerId |
| rosters | teams | teamId |
| rosters | seasons | seasonId |
| schedule | teams | awayTeamId, homeTeamId |
| schedule | stadiums | stadiumId |
| boxscores | schedule | gameId |
| homeruns | players | batterId, pitcherId |
| homeruns | stadiums | stadiumId |
| awards | players | playerId |
| randomevents | players | targetPlayerId |
