# KBL Tracker - Phase E User Stories: Offseason System

> **Purpose**: User stories for Offseason Hub, Retirements, Free Agency, Draft, Trades
> **Generated**: January 26, 2026
> **Format**: Ralph Framework - max 3 acceptance criteria per story

---

# PHASE E: OFFSEASON SYSTEM

---

## S-E001: Create OffseasonHub Component

**Parent Feature:** F-E001
**Priority:** P0
**Estimated Size:** Large

**As a** user in offseason
**I want to** see all offseason phases
**So that** I can navigate the process

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: All 11 Phases Listed**
- **Given:** OffseasonHub renders
- **When:** User views list
- **Then:** All 11 phases visible with names
- **Verify:** Count 11 phase entries

**AC-2: Current Phase Highlighted**
- **Given:** On phase 3 (Retirements)
- **When:** User views hub
- **Then:** Phase 3 highlighted/active
- **Verify:** Find visual highlight on current

**AC-3: Navigate to Phase**
- **Given:** Phase 3 clickable
- **When:** User clicks
- **Then:** Navigation to Retirements screen
- **Verify:** Click, confirm navigation

### Technical Notes
- Per OFFSEASON_SPEC §1-16
- Phases: Awards, EOS Ratings, Retirements, FA Protection, FA Rounds, Draft, Trades, Signings, Spring Training, Schedule

---

## S-E002: Enforce Phase Order

**Parent Feature:** F-E001
**Priority:** P0
**Estimated Size:** Small

**As a** user
**I want to** complete phases in order
**So that** the process is structured

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Locked Phases Show Icon**
- **Given:** Phase 5 not yet unlocked
- **When:** User views hub
- **Then:** Phase 5 shows 🔒 icon
- **Verify:** Find lock icon on future phases

**AC-2: Cannot Skip Ahead**
- **Given:** On phase 3
- **When:** User tries to click phase 5
- **Then:** Click blocked or warning shown
- **Verify:** Click locked phase, confirm blocked

**AC-3: Unlock on Completion**
- **Given:** Phase 3 complete
- **When:** User returns to hub
- **Then:** Phase 4 now unlocked
- **Verify:** Complete phase, see next unlock

### Technical Notes
- Store completion state per phase
- Block navigation to locked phases

---

## S-E003: Create OffseasonProgressTracker Component

**Parent Feature:** F-E002
**Priority:** P0
**Estimated Size:** Medium

**As a** user
**I want to** see offseason progress
**So that** I know how far along I am

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Progress Bar**
- **Given:** 4 of 11 phases complete
- **When:** Tracker renders
- **Then:** Progress bar at ~36%
- **Verify:** Find progress bar

**AC-2: Completed Checkmarks**
- **Given:** Phases 1-4 complete
- **When:** User views tracker
- **Then:** ✓ visible on phases 1-4
- **Verify:** Find checkmarks on completed

**AC-3: Remaining Grayed**
- **Given:** Phases 5-11 pending
- **When:** User views tracker
- **Then:** Phases 5-11 grayed/dimmed
- **Verify:** Compare visual treatment

### Technical Notes
- Show in offseason hub sidebar

---

## S-E004: Create EOSRatingsView Component

**Parent Feature:** F-E003
**Priority:** P0
**Estimated Size:** Large

**As a** user
**I want to** see end-of-season rating changes
**So that** I know how players developed

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Players With Changes Listed**
- **Given:** 15 players had rating changes
- **When:** EOSRatingsView renders
- **Then:** 15 players listed
- **Verify:** Count player rows

**AC-2: Before/After Shown**
- **Given:** Player Power went 75 → 80
- **When:** User views row
- **Then:** "75 → 80" or "+5" visible
- **Verify:** Find delta indicator

**AC-3: Sortable By Change**
- **Given:** List displayed
- **When:** User clicks "Sort by Change"
- **Then:** Biggest changes at top
- **Verify:** Confirm sort order

### Technical Notes
- Per MASTER_SPEC EOS section
- Calculate from performance vs baseline

---

## S-E005: Create RetirementsScreen Component

**Parent Feature:** F-E004
**Priority:** P0
**Estimated Size:** Large

**As a** user
**I want to** see who is retiring
**So that** I can acknowledge careers

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Retirees Listed**
- **Given:** 3 players retiring
- **When:** RetirementsScreen renders
- **Then:** 3 players displayed
- **Verify:** Count retiree entries

**AC-2: Career Summary**
- **Given:** Retiree displayed
- **When:** User views entry
- **Then:** Career stats (years, WAR, key achievements) shown
- **Verify:** Find career summary per retiree

**AC-3: Jersey Retirement Flag**
- **Given:** Retiree eligible for jersey retirement
- **When:** User views entry
- **Then:** "🏆 Jersey Retirement Eligible" shown
- **Verify:** Find eligibility indicator

### Technical Notes
- Per OFFSEASON_SPEC §7
- Retirement triggers: age + decline, low ratings

---

## S-E006: Check HOF Eligibility

**Parent Feature:** F-E004
**Priority:** P1
**Estimated Size:** Medium

**As a** user viewing retirements
**I want to** see HOF-eligible players
**So that** I know who may enter Hall of Fame

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: HOF Badge Shown**
- **Given:** Retiree career WAR > threshold
- **When:** User views entry
- **Then:** "🏛️ HOF Eligible" badge shown
- **Verify:** Find HOF indicator

**AC-2: Career WAR Threshold**
- **Given:** HOF threshold is 40 WAR
- **When:** Player has 45 career WAR
- **Then:** Badge appears
- **Verify:** Check calculation

**AC-3: Link to Induction**
- **Given:** HOF eligible
- **When:** User clicks badge
- **Then:** Navigate to HOF induction flow
- **Verify:** Click badge, see induction UI

### Technical Notes
- HOF threshold per MASTER_SPEC

---

## S-E007: Create FreeAgencyHub Component

**Parent Feature:** F-E005
**Priority:** P0
**Estimated Size:** Large

**As a** user in free agency
**I want to** see available free agents
**So that** I can sign players

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: FA Pool Displayed**
- **Given:** 20 free agents available
- **When:** FreeAgencyHub renders
- **Then:** All 20 listed with key stats
- **Verify:** Count FA entries

**AC-2: Cap Space Shown**
- **Given:** User has $15M cap space
- **When:** User views hub
- **Then:** "$15,000,000 available" displayed
- **Verify:** Find cap space amount

**AC-3: Round Indicator**
- **Given:** Currently Round 2 of 3
- **When:** User views hub
- **Then:** "Round 2/3" shown
- **Verify:** Find round indicator

### Technical Notes
- Per OFFSEASON_SPEC §8
- Multiple rounds of FA

---

## S-E008: Create ProtectedPlayerSelection Component

**Parent Feature:** F-E006
**Priority:** P0
**Estimated Size:** Medium

**As a** user before FA
**I want to** protect one player
**So that** they cannot leave

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Roster Displayed**
- **Given:** ProtectedPlayerSelection opens
- **When:** User views
- **Then:** Full roster shown for selection
- **Verify:** Find all roster players

**AC-2: Single Selection**
- **Given:** User selects player A
- **When:** User tries to select player B
- **Then:** A is deselected, B selected
- **Verify:** Only one can be protected

**AC-3: Confirm Protection**
- **Given:** Player selected
- **When:** User clicks "Protect"
- **Then:** Protection saved, player cannot be FA
- **Verify:** Confirm protection status

### Technical Notes
- 1 protected player per team
- Per OFFSEASON_SPEC §8

---

## S-E009: Create DraftHub Component

**Parent Feature:** F-E007
**Priority:** P0
**Estimated Size:** Large

**As a** user in draft
**I want to** see draft order and prospects
**So that** I can make my picks

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Draft Order Displayed**
- **Given:** 8-team draft
- **When:** DraftHub renders
- **Then:** Order 1-8 with team names shown
- **Verify:** Find draft order list

**AC-2: Prospects Pool**
- **Given:** 24 prospects available
- **When:** User views pool
- **Then:** All 24 listed with ratings
- **Verify:** Count prospect entries

**AC-3: User's Turn Highlighted**
- **Given:** User picks 3rd
- **When:** Pick 3 is active
- **Then:** Prominent "YOUR PICK" indicator
- **Verify:** Find turn indicator

### Technical Notes
- Per OFFSEASON_SPEC §9
- 3 rounds typical

---

## S-E010: Add Pick Selection to Draft

**Parent Feature:** F-E007
**Priority:** P0
**Estimated Size:** Medium

**As a** user making draft pick
**I want to** select a prospect
**So that** they join my team

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Select From Pool**
- **Given:** My pick active
- **When:** User clicks prospect
- **Then:** Prospect highlighted as selection
- **Verify:** Find selection highlight

**AC-2: Confirm Pick**
- **Given:** Prospect selected
- **When:** User clicks "Draft"
- **Then:** Prospect removed from pool, added to my farm
- **Verify:** Check farm system for new player

**AC-3: Cannot Double-Pick**
- **Given:** Prospect already drafted
- **When:** User views pool
- **Then:** Drafted prospects not shown
- **Verify:** Confirm no drafted prospects in pool

### Technical Notes
- Add to farm system, not active roster

---

## S-E011: Create DraftOrderReveal Component

**Parent Feature:** F-E008
**Priority:** P0
**Estimated Size:** Medium

**As a** user before draft
**I want to** see how order was determined
**So that** I understand the process

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Lottery Results**
- **Given:** Bottom 4 teams in lottery
- **When:** DraftOrderReveal shows
- **Then:** Lottery results displayed
- **Verify:** Find lottery outcome

**AC-2: Final Order Listed**
- **Given:** Order determined
- **When:** User views
- **Then:** Full 1-8 order with team names
- **Verify:** Find complete order

**AC-3: User Position Highlighted**
- **Given:** User picking 5th
- **When:** User views order
- **Then:** Position 5 highlighted
- **Verify:** Find user's spot highlight

### Technical Notes
- Per OFFSEASON_SPEC §9
- Bottom teams get lottery advantage

---

## S-E012: Create ProspectList Component

**Parent Feature:** F-E009
**Priority:** P0
**Estimated Size:** Large

**As a** user evaluating prospects
**I want to** see all prospects with ratings
**So that** I can make informed picks

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: All Prospects Listed**
- **Given:** 24 prospects in class
- **When:** ProspectList renders
- **Then:** 24 prospect cards shown
- **Verify:** Count prospect entries

**AC-2: Ratings Visible**
- **Given:** Prospect displayed
- **When:** User views card
- **Then:** Key ratings (Power, Contact, etc.) shown
- **Verify:** Find rating values

**AC-3: Sortable/Filterable**
- **Given:** List displayed
- **When:** User selects "Filter: Pitchers"
- **Then:** Only pitcher prospects shown
- **Verify:** Confirm filter works

### Technical Notes
- Per OFFSEASON_SPEC §9
- Prospect generation algorithm in spec

---

## S-E013: Create TradeHub Component

**Parent Feature:** F-E010
**Priority:** P0
**Estimated Size:** Large

**As a** user
**I want to** access trade functionality
**So that** I can manage roster via trades

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: New Trade Button**
- **Given:** TradeHub renders
- **When:** User views
- **Then:** "Propose Trade" button visible
- **Verify:** Find proposal button

**AC-2: Active Proposals Shown**
- **Given:** 2 pending trade proposals
- **When:** User views hub
- **Then:** Both proposals listed
- **Verify:** Count pending trades

**AC-3: Trade History**
- **Given:** 3 completed trades this season
- **When:** User views history
- **Then:** All 3 visible
- **Verify:** Find trade history section

### Technical Notes
- Per MASTER_SPEC §25

---

## S-E014: Create TradeProposalBuilder Component

**Parent Feature:** F-E011
**Priority:** P0
**Estimated Size:** Large

**As a** user proposing a trade
**I want to** build a trade package
**So that** I can send an offer

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Two-Column Layout**
- **Given:** TradeProposalBuilder opens
- **When:** User views
- **Then:** "Sending" and "Receiving" columns visible
- **Verify:** Find two-column structure

**AC-2: Player Selection**
- **Given:** Builder open
- **When:** User clicks player from roster
- **Then:** Player added to "Sending" column
- **Verify:** Find player in sending list

**AC-3: Submit When Valid**
- **Given:** Players selected both sides
- **When:** Trade valid (salary match)
- **Then:** "Propose Trade" button enabled
- **Verify:** Button activates on valid trade

### Technical Notes
- Per SALARY_SPEC trade rules

---

## S-E015: Create TradeSalaryMatcher Component

**Parent Feature:** F-E012
**Priority:** P0
**Estimated Size:** Medium

**As a** user building a trade
**I want to** see salary matching
**So that** I know if trade is valid

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Salary Totals Shown**
- **Given:** Trade in progress
- **When:** User views matcher
- **Then:** "Sending: $5M | Receiving: $8M" visible
- **Verify:** Find salary totals

**AC-2: Match Requirement Displayed**
- **Given:** Salary rule requires 80% match
- **When:** User views
- **Then:** "Must be within 80%" shown
- **Verify:** Find matching rule text

**AC-3: Pass/Fail Indicator**
- **Given:** Trade doesn't match
- **When:** User views
- **Then:** Red "❌ Does not match" indicator
- **Verify:** Find fail indicator

### Technical Notes
- Per SALARY_SPEC matching rules
- Different rules by cap status

---

# PHASE E SUMMARY

| ID | Feature | Priority |
|----|---------|----------|
| S-E001 | OffseasonHub | P0 |
| S-E002 | Phase Order Enforcement | P0 |
| S-E003 | OffseasonProgressTracker | P0 |
| S-E004 | EOSRatingsView | P0 |
| S-E005 | RetirementsScreen | P0 |
| S-E006 | HOF Eligibility Check | P1 |
| S-E007 | FreeAgencyHub | P0 |
| S-E008 | ProtectedPlayerSelection | P0 |
| S-E009 | DraftHub | P0 |
| S-E010 | Draft Pick Selection | P0 |
| S-E011 | DraftOrderReveal | P0 |
| S-E012 | ProspectList | P0 |
| S-E013 | TradeHub | P0 |
| S-E014 | TradeProposalBuilder | P0 |
| S-E015 | TradeSalaryMatcher | P0 |

**Total Phase E Stories:** 15
**P0 Stories:** 14
**P1 Stories:** 1

---

*All stories follow Ralph Framework: < 200 lines, max 3 acceptance criteria, Given/When/Then/Verify format.*
