# KBL Tracker - Phase D User Stories: Awards & Recognition

> **Purpose**: User stories for Awards Ceremony, All-Star Break, Trait Lottery
> **Generated**: January 26, 2026
> **Format**: Ralph Framework - max 3 acceptance criteria per story

---

# PHASE D: AWARDS & RECOGNITION

---

## S-D001: Create AwardsCeremonyHub Component

**Parent Feature:** F-D001
**Priority:** P0
**Estimated Size:** Large

**As a** user at season end
**I want to** experience a guided awards flow
**So that** achievements are properly celebrated

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Award Categories Listed**
- **Given:** Awards ceremony starts
- **When:** AwardsCeremonyHub renders
- **Then:** All award categories visible (Leaders, Gold Glove, Silver Slugger, MVP, Cy Young, ROY)
- **Verify:** Find 6+ award category links

**AC-2: Progress Indicator**
- **Given:** User on 3rd of 6 awards
- **When:** User views hub
- **Then:** Progress shows "3 of 6" or similar
- **Verify:** Find progress indicator

**AC-3: Next Button Works**
- **Given:** On current award
- **When:** User clicks "Next Award"
- **Then:** Navigates to next award in sequence
- **Verify:** Click next, confirm navigation

### Technical Notes
- New file: `src/pages/AwardsCeremonyHub.tsx`
- Per MASTER_SPEC §9 ceremony flow

---

## S-D002: Add Skip to Summary Option

**Parent Feature:** F-D001
**Priority:** P1
**Estimated Size:** Small

**As a** user in a hurry
**I want to** skip to awards summary
**So that** I can see results quickly

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Skip Button Present**
- **Given:** Awards ceremony in progress
- **When:** User views any award screen
- **Then:** "Skip to Summary" button visible
- **Verify:** Find skip button

**AC-2: Confirms Before Skip**
- **Given:** Skip button clicked
- **When:** Confirmation shown
- **Then:** "Are you sure?" dialog appears
- **Verify:** See confirmation dialog

**AC-3: Awards Still Calculated**
- **Given:** User skips to summary
- **When:** Summary displays
- **Then:** All award winners shown (not empty)
- **Verify:** All award winners populated

### Technical Notes
- Calculation happens regardless of view

---

## S-D003: Create LeagueLeadersAward Component

**Parent Feature:** F-D002
**Priority:** P0
**Estimated Size:** Medium

**As a** user viewing awards
**I want to** see league leaders recognized
**So that** statistical excellence is celebrated

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Batting Triple Crown**
- **Given:** LeagueLeadersAward renders
- **When:** User views batting section
- **Then:** AVG, HR, RBI leaders shown with 👑 icon
- **Verify:** Find 3 batting leader rows with crown

**AC-2: Pitching Triple Crown**
- **Given:** LeagueLeadersAward renders
- **When:** User views pitching section
- **Then:** ERA, W, K leaders shown with 👑 icon
- **Verify:** Find 3 pitching leader rows with crown

**AC-3: Actual Triple Crown Detection**
- **Given:** Player leads all 3 batting categories
- **When:** Award displays
- **Then:** "TRIPLE CROWN WINNER!" banner shown
- **Verify:** Find special banner for triple crown

### Technical Notes
- Per MASTER_SPEC Screen 1

---

## S-D004: Create GoldGloveAwards Component

**Parent Feature:** F-D003
**Priority:** P0
**Estimated Size:** Large

**As a** user viewing awards
**I want to** see Gold Glove winners by position
**So that** defensive excellence is recognized

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Nine Positions Covered**
- **Given:** GoldGloveAwards renders
- **When:** User views display
- **Then:** Winner for each of 9 positions shown
- **Verify:** Count 9 position winners

**AC-2: fWAR Shown**
- **Given:** Winner displayed
- **When:** User views stats
- **Then:** fWAR value visible for each winner
- **Verify:** Find fWAR stat per winner

**AC-3: Gold Glove Icon**
- **Given:** Winner displayed
- **When:** User views row
- **Then:** 🧤 or gold glove icon visible
- **Verify:** Find icon per winner

### Technical Notes
- Per MASTER_SPEC Screen 2
- Requires fWAR calculation

---

## S-D005: Create SilverSluggerAwards Component

**Parent Feature:** F-D004
**Priority:** P0
**Estimated Size:** Large

**As a** user viewing awards
**I want to** see Silver Slugger winners by position
**So that** offensive excellence is recognized

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: All Positions Including DH**
- **Given:** SilverSluggerAwards renders
- **When:** User views display
- **Then:** Winner for each position + DH shown
- **Verify:** Count 10 position winners (9 + DH)

**AC-2: Batting Stats Shown**
- **Given:** Winner displayed
- **When:** User views stats
- **Then:** AVG, HR, RBI visible for each
- **Verify:** Find 3 stats per winner

**AC-3: Silver Bat Icon**
- **Given:** Winner displayed
- **When:** User views row
- **Then:** 🏏 or silver bat icon visible
- **Verify:** Find icon per winner

### Technical Notes
- Per MASTER_SPEC Screen 2
- Position eligibility: 10+ games at position

---

## S-D006: Create MVPReveal Component

**Parent Feature:** F-D005
**Priority:** P0
**Estimated Size:** Large

**As a** user at MVP reveal
**I want to** see dramatic MVP announcement
**So that** the achievement feels important

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Build-Up Display**
- **Given:** MVPReveal starts
- **When:** Initial view
- **Then:** "And the MVP is..." or build-up text shown
- **Verify:** Find anticipation text

**AC-2: Winner Revealed**
- **Given:** After build-up
- **When:** Reveal completes
- **Then:** MVP name and team prominently displayed
- **Verify:** Find winner name

**AC-3: WAR Breakdown**
- **Given:** Winner revealed
- **When:** User views stats
- **Then:** Total WAR and breakdown (bWAR, fWAR, rWAR) shown
- **Verify:** Find WAR components

### Technical Notes
- Per MASTER_SPEC Screen 4
- MVP = highest total WAR (position player)

---

## S-D007: Apply MVP Fame Bonus

**Parent Feature:** F-D005
**Priority:** P0
**Estimated Size:** Small

**As a** game system
**I want to** award Fame bonus to MVP
**So that** the honor is recorded

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: +10 Fame Applied**
- **Given:** MVP selected
- **When:** Award finalized
- **Then:** MVP's Fame increases by 10
- **Verify:** Check player Fame before/after

**AC-2: Fame Event Logged**
- **Given:** Fame bonus applied
- **When:** User checks events
- **Then:** "MVP Award: +10 Fame" event in log
- **Verify:** Find Fame event in player history

**AC-3: Award in Career**
- **Given:** MVP awarded
- **When:** User views player career
- **Then:** MVP award listed in career awards
- **Verify:** Find MVP in career achievements

### Technical Notes
- Per MASTER_SPEC Fame table

---

## S-D008: Create CyYoungReveal Component

**Parent Feature:** F-D006
**Priority:** P0
**Estimated Size:** Medium

**As a** user at Cy Young reveal
**I want to** see the best pitcher honored
**So that** pitching excellence is celebrated

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Winner Revealed**
- **Given:** CyYoungReveal renders
- **When:** Reveal complete
- **Then:** Winner name and team displayed
- **Verify:** Find winner name

**AC-2: Pitching Stats**
- **Given:** Winner revealed
- **When:** User views stats
- **Then:** W-L, ERA, K, pWAR visible
- **Verify:** Find pitching stat line

**AC-3: +8 Fame Shown**
- **Given:** Winner displayed
- **When:** User views bonus
- **Then:** "+8 Fame" indicated
- **Verify:** Find Fame bonus text

### Technical Notes
- Per MASTER_SPEC Screen 4
- Cy Young = highest pWAR

---

## S-D009: Create ROYReveal Component

**Parent Feature:** F-D007
**Priority:** P0
**Estimated Size:** Medium

**As a** user at ROY reveal
**I want to** see Rookie of the Year honored
**So that** new talent is recognized

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Winner With Rookie Badge**
- **Given:** ROYReveal renders
- **When:** Winner displayed
- **Then:** "ROOKIE" badge visible with name
- **Verify:** Find rookie badge

**AC-2: Season Stats**
- **Given:** Winner revealed
- **When:** User views stats
- **Then:** Full season line visible
- **Verify:** Find stat line

**AC-3: +5 Fame Applied**
- **Given:** ROY awarded
- **When:** Award finalized
- **Then:** Fame increased by 5
- **Verify:** Check Fame change

### Technical Notes
- Rookie = < 30 career PA before season
- Per MASTER_SPEC ROY criteria

---

## S-D010: Create AwardsSummary Component

**Parent Feature:** F-D008
**Priority:** P0
**Estimated Size:** Large

**As a** user completing awards ceremony
**I want to** see summary of all awards
**So that** I have a complete record

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: All Winners Listed**
- **Given:** AwardsSummary renders
- **When:** User views list
- **Then:** MVP, Cy Young, ROY, Gold Gloves, Silver Sluggers all shown
- **Verify:** Find all award categories with winners

**AC-2: Key Stat Per Winner**
- **Given:** Award winner listed
- **When:** User views row
- **Then:** One key stat shown (e.g., ".342 AVG" for Silver Slugger)
- **Verify:** Find stat per winner

**AC-3: Continue Button**
- **Given:** Summary displayed
- **When:** User clicks "Continue to Offseason"
- **Then:** Navigation to offseason hub
- **Verify:** Click, confirm navigation

### Technical Notes
- Per MASTER_SPEC Screen 6

---

## S-D011: Create AllStarScreen Component

**Parent Feature:** F-D009
**Priority:** P1
**Estimated Size:** Large

**As a** user at All-Star Break
**I want to** see All-Star selections
**So that** midseason honors are shown

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Both Rosters Displayed**
- **Given:** AllStarScreen renders
- **When:** User views
- **Then:** Two roster columns visible
- **Verify:** Find two team columns

**AC-2: User's Players Highlighted**
- **Given:** User manages Sirloins
- **When:** Sirloins player is All-Star
- **Then:** That player highlighted in roster
- **Verify:** Find highlight on user's players

**AC-3: Trait Lottery Link**
- **Given:** AllStarScreen displayed
- **When:** User views All-Star
- **Then:** "Spin for Trait" button available
- **Verify:** Find trait lottery button

### Technical Notes
- Per MASTER_SPEC §8
- All-Star selection criteria in spec

---

## S-D012: Create TraitLotteryWheel Component

**Parent Feature:** F-D010
**Priority:** P1
**Estimated Size:** Large

**As a** user with All-Star/Award winner
**I want to** spin for a new trait
**So that** they get a reward

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Wheel Displayed**
- **Given:** TraitLotteryWheel opens
- **When:** Component renders
- **Then:** Spinning wheel with trait segments visible
- **Verify:** Find wheel element

**AC-2: Spin Animation**
- **Given:** Wheel displayed
- **When:** User clicks "Spin"
- **Then:** Wheel animates spinning then stops
- **Verify:** Observe animation

**AC-3: Result Applied**
- **Given:** Wheel lands on "Whiffer" trait
- **When:** Result finalized
- **Then:** Player's traits updated to include "Whiffer"
- **Verify:** Check player traits after spin

### Technical Notes
- Per OFFSEASON_SPEC §4 trait pools
- Different pools for All-Star vs MVP

---

## S-D013: Configure Trait Pools

**Parent Feature:** F-D010
**Priority:** P1
**Estimated Size:** Medium

**As a** game system
**I want to** appropriate trait pools for events
**So that** rewards match achievement level

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: All-Star Pool**
- **Given:** All-Star spinning
- **When:** Wheel configured
- **Then:** Pool contains positive traits only
- **Verify:** Check all wheel options are beneficial

**AC-2: MVP Pool Different**
- **Given:** MVP spinning
- **When:** Wheel configured
- **Then:** Pool contains elite-tier traits
- **Verify:** Find "elite" traits like Utility, Unfazed

**AC-3: No Duplicate Traits**
- **Given:** Player already has "Tough Out"
- **When:** Wheel spins
- **Then:** "Tough Out" not possible result
- **Verify:** Existing traits filtered from pool

### Technical Notes
- Per OFFSEASON_SPEC trait pools

---

# PHASE D SUMMARY

| ID | Feature | Priority |
|----|---------|----------|
| S-D001 | AwardsCeremonyHub | P0 |
| S-D002 | Skip to Summary | P1 |
| S-D003 | LeagueLeadersAward | P0 |
| S-D004 | GoldGloveAwards | P0 |
| S-D005 | SilverSluggerAwards | P0 |
| S-D006 | MVPReveal | P0 |
| S-D007 | MVP Fame Bonus | P0 |
| S-D008 | CyYoungReveal | P0 |
| S-D009 | ROYReveal | P0 |
| S-D010 | AwardsSummary | P0 |
| S-D011 | AllStarScreen | P1 |
| S-D012 | TraitLotteryWheel | P1 |
| S-D013 | Trait Pools Config | P1 |

**Total Phase D Stories:** 13
**P0 Stories:** 9
**P1 Stories:** 4

---

*All stories follow Ralph Framework: < 200 lines, max 3 acceptance criteria, Given/When/Then/Verify format.*
