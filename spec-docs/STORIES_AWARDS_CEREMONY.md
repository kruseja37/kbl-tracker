# User Stories: Awards Ceremony System

> **Feature Area**: Offseason Phase 2 - Awards Ceremony
> **Epic**: End-of-Season Recognition
> **Created**: January 29, 2026
> **Source Spec**: OFFSEASON_SYSTEM_SPEC.md §4, KBL_XHD_TRACKER_MASTER_SPEC_v3.md

---

## Overview

The Awards Ceremony is a **multi-screen presentation flow** that reveals end-of-season awards in dramatic fashion. Users tap through each screen to reveal winners. Awards are presented using a **Hybrid Voting System** where the system calculates recommendations but users can override.

### Award Processing Order
| Step | Award | Selection Method |
|------|-------|------------------|
| 1 | League Leaders | Auto-calculated |
| 2 | Gold Gloves (9 positions) | Hybrid voting |
| 3 | Platinum Glove | From GG winners |
| 4 | Booger Glove | Worst fielding |
| 5 | Silver Sluggers | Hybrid voting |
| 6 | Reliever of the Year (AL/NL) | Hybrid voting |
| 7 | Bench Player of the Year | Hybrid voting |
| 8 | Rookie of the Year (AL/NL) | Hybrid voting |
| 9 | Cy Young (AL/NL) | Hybrid voting |
| 10 | MVP (AL/NL) | Hybrid voting |
| 11 | Manager of the Year (AL/NL) | mWAR-based |
| 12 | Kara Kawaguchi Award | Special criteria |
| 13 | Bust of the Year | Underperformance |
| 14 | Comeback Player of the Year | Special criteria |

---

## Story: S-AWD001 - League Leaders Calculation

**As a** system
**I want to** auto-calculate league leaders for all statistical categories
**So that** leaders can be displayed and rewarded

### Acceptance Criteria
- [ ] Calculate AL and NL leaders for each category
- [ ] Hitting: AVG, HR, RBI, SB, OPS, Hits, Runs, BB
- [ ] Pitching: ERA, K, Wins, Saves, WHIP, IP
- [ ] Handle ties (show both players)
- [ ] Apply minimum qualifications (PA for hitters, IP for pitchers)
- [ ] Store leader data for awards ceremony display

### Leader Rewards
| Leader | Reward |
|--------|--------|
| AVG (AL/NL) | +5 Contact |
| HR Leader | +5 Power |
| RBI (AL/NL) | +3 Contact, +3 Power |
| ERA (AL/NL) | +5 to ACC, JNK, or VEL (user choice) |
| K Leader (AL/NL) | +5 to JNK or VEL (user choice) |
| Most Hitting K's | **Whiffer** trait |
| Most BB's (Hitter) | +5 Speed |
| Highest Net SB% | **Stealer** trait OR +5 Speed |
| Most Saves | **Clutch** trait |

---

## Story: S-AWD002 - Hybrid Voting System

**As a** user
**I want to** see system recommendations but be able to override them
**So that** I have agency in award decisions while getting intelligent suggestions

### Acceptance Criteria
- [ ] System calculates weighted score for each candidate
- [ ] Display top 3-5 candidates with scores
- [ ] Highlight #1 as "★ System Recommendation"
- [ ] Show voting breakdown (WAR %, Clutch %, etc.)
- [ ] Buttons: "Confirm #1", "Select #2", "Select #3", "Other Player..."
- [ ] "Other Player" opens searchable player list
- [ ] Selected player receives award and associated rewards

### Voting Weights by Award

**MVP (Position Players)**
| Component | Weight | Source |
|-----------|--------|--------|
| WAR | 40% | bWAR + rWAR + fWAR |
| Clutch | 25% | Net Clutch / Opportunities |
| Traditional | 15% | AVG, HR, RBI, SB, OPS |
| Team Success | 12% | Win percentage |
| Fame | 8% | Net Fame + Milestones |

**Cy Young (Pitchers)**
| Component | Weight | Source |
|-----------|--------|--------|
| pWAR | 40% | Pitching WAR |
| Advanced | 25% | Inverse FIP + TrueERA |
| Clutch | 25% | Pitching clutch rating |
| Team | 5% | Win percentage |
| Fame | 5% | Net Fame + Milestones |

**Gold Glove**
| Component | Weight | Source |
|-----------|--------|--------|
| fWAR | 55% | Fielding WAR |
| Clutch Plays | 25% | Raw fielding clutch count |
| Eye Test | 20% | Fame + User adjustment (-5 to +5) |

### Technical Notes
```typescript
interface AwardCandidate {
  playerId: string;
  playerName: string;
  team: string;
  score: number;
  breakdown: {
    war: number;
    clutch: number;
    traditional: number;
    teamSuccess: number;
    fame: number;
  };
  isSystemRecommendation: boolean;
}

function calculateMVPCandidates(league: 'AL' | 'NL'): AwardCandidate[] {
  // Filter position players in league
  // Calculate weighted scores
  // Sort by score descending
  // Mark top scorer as recommendation
}
```

---

## Story: S-AWD003 - Gold Glove Awards (9 Positions)

**As a** user
**I want to** select Gold Glove winners for each defensive position
**So that** the best fielders are recognized

### Acceptance Criteria
- [ ] Present each position sequentially: C, 1B, 2B, 3B, SS, LF, CF, RF, P
- [ ] Show top 3 fielders at each position by fWAR
- [ ] Hybrid voting UI with system recommendation
- [ ] Winner receives +5 Fielding
- [ ] After all 9, determine Platinum Glove (best fWAR among winners)
- [ ] Platinum Glove winner receives additional +5 Fielding

### Minimum Qualification
- Must have played 50%+ of games at that position

---

## Story: S-AWD004 - Booger Glove Award

**As a** user
**I want to** see the worst fielder recognized with the "Booger Glove"
**So that** poor defense has consequences

### Acceptance Criteria
- [ ] Auto-select player with lowest qualifying fWAR
- [ ] Display errors, fWAR, and defensive lowlights
- [ ] Penalty depends on current trait count:
  - If < 2 traits: Gains **Butter Fingers** trait
  - If 2 traits: Must lose one positive trait (user chooses)
- [ ] Dramatic/humorous presentation ("The glove that dreams forgot...")

### UI for Trait Loss
```
╔════════════════════════════════════════════════════╗
║  🧤 BOOGER GLOVE AWARD 🧤                           ║
║                                                     ║
║  Winner: Sluggo McBricks                           ║
║  fWAR: -1.8 | Errors: 23                           ║
║                                                     ║
║  PENALTY: Must lose one positive trait!            ║
║                                                     ║
║  [Lose RBI Hero]  [Lose Power Surge]               ║
╚════════════════════════════════════════════════════╝
```

---

## Story: S-AWD005 - Silver Slugger Awards

**As a** user
**I want to** select Silver Slugger winners for each offensive position
**So that** the best hitters at each position are recognized

### Acceptance Criteria
- [ ] Present each position: C, 1B, 2B, 3B, SS, LF, CF, RF, DH
- [ ] Ranking based on offensive output (OPS, wRC+, bWAR)
- [ ] Hybrid voting UI with system recommendation
- [ ] Winner receives +3 Power, +3 Contact

---

## Story: S-AWD006 - MVP Award Ceremony

**As a** user
**I want to** experience a dramatic MVP reveal
**So that** the top player recognition feels special

### Acceptance Criteria
- [ ] Separate AL and NL MVP presentations
- [ ] Show voting breakdown with percentage bars
- [ ] Display winner's season stats prominently
- [ ] Winner receives: Random positive trait (chemistry-weighted)
- [ ] Runner-up receives: Random trait
- [ ] 3rd place receives: Random trait
- [ ] Dramatic animation on reveal

### Display Elements
- Large player photo
- Team logo and colors
- Season stats: AVG / HR / RBI / WAR / Clutch
- Voting bar chart showing top 5

---

## Story: S-AWD007 - Cy Young Award Ceremony

**As a** user
**I want to** experience a dramatic Cy Young reveal
**So that** the top pitcher recognition feels special

### Acceptance Criteria
- [ ] Separate AL and NL Cy Young presentations
- [ ] Show voting breakdown with percentage bars
- [ ] Display winner's season stats (W-L / ERA / WHIP / K / pWAR)
- [ ] Winner receives: Random positive pitching trait
- [ ] Runner-up receives: Random trait
- [ ] Note: No traditional W-L in scoring, but display for context

---

## Story: S-AWD008 - Rookie of the Year

**As a** user
**I want to** recognize the best first-year players
**So that** new talent is celebrated

### Acceptance Criteria
- [ ] Separate AL and NL ROY
- [ ] Filter to players in first season
- [ ] Hybrid voting based on WAR, traditional stats, fame
- [ ] Winner receives: Random trait
- [ ] Show "Rookie Year" stats vs league average

---

## Story: S-AWD009 - Reliever of the Year

**As a** user
**I want to** recognize the best relief pitchers
**So that** bullpen excellence is rewarded

### Acceptance Criteria
- [ ] Separate AL and NL
- [ ] Ranking based on: Saves, ERA, WHIP, Clutch rating
- [ ] Winner receives: **Clutch** trait (guaranteed)
- [ ] Display: Saves, ERA, Hold situations, Clutch rating

---

## Story: S-AWD010 - Bench Player of the Year

**As a** user
**I want to** recognize the best reserve player
**So that** bench contributions are valued

### Acceptance Criteria
- [ ] Filter to players with <50% starts
- [ ] Ranking based on: Pinch hit AVG, WAR per PA, Clutch in limited role
- [ ] Winner receives: **Pinch Perfect** trait (guaranteed)
- [ ] Display: PH AVG, Games, Key moments

---

## Story: S-AWD011 - Kara Kawaguchi Award

**As a** user
**I want to** recognize the player who most exceeded salary expectations
**So that** undervalued performers are celebrated

### Acceptance Criteria
- [ ] Calculate WAR percentile vs salary percentile at position
- [ ] Winner = highest positive delta
- [ ] Display: Salary, Salary %ile, WAR, WAR %ile, Delta %
- [ ] Winner receives: **Tough Out** trait + Random positive trait

### Calculation
```typescript
function calculateKaraKawaguchi(): Player {
  return players.maxBy(p => {
    const warPercentile = getWARPercentileAtPosition(p);
    const salaryPercentile = getSalaryPercentileAtPosition(p);
    return warPercentile - salaryPercentile;  // Positive = outperformed
  });
}
```

---

## Story: S-AWD012 - Bust of the Year

**As a** user
**I want to** recognize the biggest underperformer
**So that** salary vs performance matters

### Acceptance Criteria
- [ ] Calculate WAR percentile vs salary percentile
- [ ] Winner = biggest negative delta (high salary, low WAR)
- [ ] Humorous/sympathetic presentation (💩 emoji)
- [ ] Winner receives: **Choker** trait
- [ ] Display: Expected WAR, Actual WAR, Salary, Difference

---

## Story: S-AWD013 - Comeback Player of the Year

**As a** user
**I want to** recognize players who bounced back
**So that** recovery and improvement are celebrated

### Acceptance Criteria
- [ ] Compare current season WAR to previous season
- [ ] Require significant improvement (e.g., +2.0 WAR year-over-year)
- [ ] Hybrid voting for close cases
- [ ] Winner receives: "Recovered" trait (or random positive)
- [ ] Display: Previous season stats, current season stats, delta

---

## Story: S-AWD014 - Manager of the Year

**As a** user
**I want to** recognize the best managerial performance
**So that** user decisions are validated

### Acceptance Criteria
- [ ] Based on mWAR (Manager WAR)
- [ ] mWAR factors: Win% vs expected, in-game decisions (LI-weighted)
- [ ] Separate AL and NL
- [ ] Winner's team receives: +5 to EOS adjustment bonus pool, +5 Fan Morale
- [ ] Display: Record, Expected record, Overperformance, mWAR

---

## Story: S-AWD015 - Trait Replacement Flow

**As a** user
**I want to** choose which trait to replace when at max (2)
**So that** I have control over my player's development

### Acceptance Criteria
- [ ] Trigger when player with 2 traits earns new trait
- [ ] Show current traits with descriptions
- [ ] Show new trait with description
- [ ] Options: "Replace [Trait 1]", "Replace [Trait 2]", "Decline New"
- [ ] Apply selection and update player

### UI Example
```
╔════════════════════════════════════════════════════╗
║  TRAIT REPLACEMENT                                  ║
║                                                     ║
║  Player: Mike Trout                                ║
║  Award: All-Star Selection                         ║
║                                                     ║
║  Current Traits:                                    ║
║    1. RBI Hero (Spirited) - Bonus with RISP        ║
║    2. Tough Out (Competitive) - +CON on 2-strike   ║
║                                                     ║
║  New Trait: ★ Clutch (Spirited) ★                  ║
║                                                     ║
║  [Replace RBI Hero]  [Replace Tough Out]  [Decline]║
╚════════════════════════════════════════════════════╝
```

---

## Story: S-AWD016 - Awards Summary Screen

**As a** user
**I want to** see a complete summary of all awards
**So that** I can review the entire ceremony at once

### Acceptance Criteria
- [ ] Display all award winners in organized layout
- [ ] Group by: Major Awards, Position Awards, Special Awards
- [ ] Show team totals (e.g., "Giants: 5 awards")
- [ ] Show all ratings changes applied
- [ ] Show all traits awarded
- [ ] "View Full Details" option
- [ ] "Continue to [Next Phase]" button

---

## Story: S-AWD017 - Awards Ceremony Navigation

**As a** user
**I want to** progress through awards screens sequentially
**So that** the ceremony feels like an event

### Acceptance Criteria
- [ ] Fixed screen order (per Award Processing Order table)
- [ ] Cannot skip ahead
- [ ] "Next" button to advance
- [ ] Progress indicator (e.g., "Screen 3 of 6")
- [ ] All awards auto-save after each screen
- [ ] Can exit and resume later (saves progress)

### Screen Flow
```
Screen 1: League Leaders
    ↓
Screen 2: Gold Glove & Silver Slugger
    ↓
Screen 3: ROY, Reliever, Comeback, Kara Kawaguchi, Bench
    ↓
Screen 4: MVP (AL/NL)
    ↓
Screen 5: Cy Young (AL/NL)
    ↓
Screen 6: Bust of the Year
    ↓
Screen 7: Manager of the Year
    ↓
Screen 8: Summary
```

---

## Implementation Priority

| Story | Priority | Complexity | Dependencies |
|-------|----------|------------|--------------|
| S-AWD001 | P0 | Medium | Season stats |
| S-AWD002 | P0 | High | S-AWD001 |
| S-AWD003 | P0 | Medium | S-AWD002, fWAR |
| S-AWD004 | P1 | Low | S-AWD003 |
| S-AWD005 | P0 | Medium | S-AWD002 |
| S-AWD006 | P0 | Medium | S-AWD002 |
| S-AWD007 | P0 | Medium | S-AWD002 |
| S-AWD008 | P1 | Low | S-AWD002 |
| S-AWD009 | P1 | Low | S-AWD002 |
| S-AWD010 | P2 | Low | S-AWD002 |
| S-AWD011 | P1 | Medium | Salary data |
| S-AWD012 | P1 | Low | S-AWD011 |
| S-AWD013 | P1 | Low | Previous season data |
| S-AWD014 | P2 | Medium | mWAR calculation |
| S-AWD015 | P0 | Low | Trait system |
| S-AWD016 | P1 | Low | All above |
| S-AWD017 | P0 | Medium | All above |

---

## Technical Notes

### Existing Components (from CURRENT_STATE.md)
- `AwardsCeremonyHub.tsx` - Awards ceremony navigation
- `awards/MVPCeremony.tsx` - MVP presentation
- `awards/CyYoungCeremony.tsx` - Cy Young presentation
- `awards/RookieOfYearCeremony.tsx` - ROY presentation
- `awards/GoldGloveCeremony.tsx` - Gold Glove presentation
- `awards/AllStarReveal.tsx` - All-Star team reveal
- `awards/BattingTitleCeremony.tsx` - Batting champion presentation
- `awards/PitchingAwardsCeremony.tsx` - Pitching awards

### Data Dependencies
- Season stats (batting, pitching, fielding)
- WAR calculations (bWAR, pWAR, fWAR, rWAR)
- Clutch ratings
- Fame accumulation
- Salary data
- Previous season stats (for Comeback)
- mWAR (Manager WAR)

---

*End of Stories Document*
