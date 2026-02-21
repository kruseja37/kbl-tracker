# KBL Tracker - Phase F User Stories: Advanced Systems

> **Purpose**: User stories for Relationships, Aging, Park Factors, Fielding, Narrative
> **Generated**: January 26, 2026
> **Format**: Ralph Framework - max 3 acceptance criteria per story

---

# PHASE F: ADVANCED SYSTEMS

---

## S-F001: Create RelationshipEngine Module

**Parent Feature:** F-F001
**Priority:** P1
**Estimated Size:** Large

**As a** game system
**I want to** track player relationships
**So that** morale and chemistry are affected

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: 9 Relationship Types Supported**
- **Given:** RelationshipEngine created
- **When:** Type enum checked
- **Then:** DATING, MARRIED, DIVORCED, BEST_FRIENDS, MENTOR_PROTEGE, RIVALS, BULLY_VICTIM, JEALOUS, CRUSH defined
- **Verify:** Find all 9 types

**AC-2: Relationship Storage**
- **Given:** Relationship created
- **When:** Stored to IndexedDB
- **Then:** Retrievable with both player IDs
- **Verify:** Create, save, retrieve relationship

**AC-3: Relationship Limits**
- **Given:** Player already MARRIED
- **When:** Trying to create second MARRIED
- **Then:** Error or rejection occurs
- **Verify:** Confirm limit enforced

### Technical Notes
- New file: `src/engines/relationshipEngine.ts`
- Per FEATURE_WISHLIST HIGH priority
- Types per RELATIONSHIPS_SPEC

---

## S-F002: Calculate Relationship Morale Effects

**Parent Feature:** F-F001
**Priority:** P1
**Estimated Size:** Medium

**As a** game system
**I want to** calculate morale effects from relationships
**So that** relationships matter to gameplay

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Positive Effect Calculated**
- **Given:** Player in MARRIED relationship
- **When:** Morale calculated
- **Then:** +5 to +15 morale boost applied
- **Verify:** Check morale with and without relationship

**AC-2: Negative Effect Calculated**
- **Given:** Player in RIVALS relationship
- **When:** Morale calculated
- **Then:** -5 to -15 morale penalty applied
- **Verify:** Check morale difference

**AC-3: Multiple Relationships Stack**
- **Given:** Player has MARRIED (+10) and BEST_FRIENDS (+5)
- **When:** Total calculated
- **Then:** Both effects combine
- **Verify:** Confirm combined effect

### Technical Notes
- Per FEATURE_WISHLIST relationship morale table

---

## S-F003: Generate Trade Relationship Warnings

**Parent Feature:** F-F001
**Priority:** P1
**Estimated Size:** Medium

**As a** user trading players
**I want to** see relationship warnings
**So that** I understand morale impact

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Warning on Trade Screen**
- **Given:** Trading player A who is BEST_FRIENDS with player B
- **When:** Trade proposed
- **Then:** "Warning: Breaking friendship with Player B" shown
- **Verify:** Find warning in trade UI

**AC-2: Morale Impact Shown**
- **Given:** Warning displayed
- **When:** User views detail
- **Then:** "-5 morale for Player B" indicated
- **Verify:** Find morale impact number

**AC-3: Can Proceed Anyway**
- **Given:** Warning shown
- **When:** User clicks "Proceed Anyway"
- **Then:** Trade continues despite warning
- **Verify:** Confirm trade completes

### Technical Notes
- Per FEATURE_WISHLIST trade warnings

---

## S-F004: Create RelationshipPanel Component

**Parent Feature:** F-F002
**Priority:** P1
**Estimated Size:** Medium

**As a** user viewing player
**I want to** see their relationships
**So that** I understand their connections

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Panel in PlayerCard**
- **Given:** PlayerCard open
- **When:** Player has relationships
- **Then:** Relationships section visible
- **Verify:** Find relationships panel

**AC-2: Type Icons**
- **Given:** Relationship displayed
- **When:** User views entry
- **Then:** Icon for type (💑 MARRIED, 👊 RIVALS, etc.)
- **Verify:** Find type icons

**AC-3: Related Player Clickable**
- **Given:** Relationship with Player B
- **When:** User clicks Player B name
- **Then:** PlayerCard for B opens
- **Verify:** Click related name, see their card

### Technical Notes
- Integrate into existing PlayerCard.tsx

---

## S-F005: Create AgingEngine Module

**Parent Feature:** F-F004
**Priority:** P0
**Estimated Size:** Large

**As a** game system
**I want to** apply age-based development and decline
**So that** player careers feel realistic

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Young Players Improve**
- **Given:** Player age 22
- **When:** Season ends
- **Then:** Ratings have chance to increase
- **Verify:** Check rating changes for young player

**AC-2: Old Players Decline**
- **Given:** Player age 35
- **When:** Season ends
- **Then:** Ratings decrease
- **Verify:** Check rating decline for old player

**AC-3: Max Age Enforced**
- **Given:** Player age 49
- **When:** Season ends
- **Then:** Player forced to retire
- **Verify:** Check retirement at 49

### Technical Notes
- New file: `src/engines/agingEngine.ts`
- Per FEATURE_WISHLIST HIGH priority
- Development: 18-29, Decline: 30+

---

## S-F006: Calculate Retirement Probability

**Parent Feature:** F-F004
**Priority:** P0
**Estimated Size:** Medium

**As a** game system
**I want to** calculate retirement probability
**So that** older players retire realistically

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Probability Increases With Age**
- **Given:** Player age 38 vs player age 42
- **When:** Probabilities calculated
- **Then:** 42-year-old has higher probability
- **Verify:** Compare probabilities

**AC-2: Low Rating Increases Probability**
- **Given:** Two 38-year-olds, one rated 45, one rated 75
- **When:** Probabilities calculated
- **Then:** 45-rated has higher retirement chance
- **Verify:** Compare probabilities

**AC-3: Retirement Triggered**
- **Given:** Random roll below probability
- **When:** End of season processed
- **Then:** Player added to retirees list
- **Verify:** Check retirement status

### Technical Notes
- Formula in AGING_SPEC
- Consider Fame (famous players stay longer)

---

## S-F007: Create AgingDisplay Component

**Parent Feature:** F-F005
**Priority:** P1
**Estimated Size:** Medium

**As a** user viewing player
**I want to** see their career phase
**So that** I understand their trajectory

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Phase Indicator**
- **Given:** Player age 25
- **When:** AgingDisplay renders
- **Then:** "Prime Years" or green indicator shown
- **Verify:** Find phase label

**AC-2: Age Shown**
- **Given:** AgingDisplay renders
- **When:** User views
- **Then:** Player age visible
- **Verify:** Find age number

**AC-3: Decline Warning**
- **Given:** Star player age 34
- **When:** User views
- **Then:** "⚠️ Beginning decline" warning shown
- **Verify:** Find decline indicator

### Technical Notes
- Phases: Development (18-24), Prime (25-32), Decline (33+)

---

## S-F008: Create ParkFactorDisplay Component

**Parent Feature:** F-F006
**Priority:** P1
**Estimated Size:** Medium

**As a** user viewing stadium
**I want to** see park factors
**So that** I understand how it affects play

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Overall Factor Shown**
- **Given:** Stadium "Emerald Diamond"
- **When:** ParkFactorDisplay renders
- **Then:** Overall park factor (e.g., "1.05") shown
- **Verify:** Find overall factor

**AC-2: Breakdown Shown**
- **Given:** Park factor displayed
- **When:** User views detail
- **Then:** HR, Hits, Runs factors visible
- **Verify:** Find breakdown values

**AC-3: Confidence Indicator**
- **Given:** Few games at stadium
- **When:** User views
- **Then:** "Low confidence (5 games)" indicator
- **Verify:** Find confidence text

### Technical Notes
- Per STADIUM_ANALYTICS_SPEC.md
- Default factors until 30 games

---

## S-F009: Create StatsByParkView Component

**Parent Feature:** F-F007
**Priority:** P2
**Estimated Size:** Large

**As a** user
**I want to** see stats by stadium
**So that** I understand performance variance

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Stats Grouped By Stadium**
- **Given:** Player played at 4 stadiums
- **When:** StatsByParkView renders
- **Then:** 4 stadium sections visible
- **Verify:** Find 4 stadium groupings

**AC-2: Home Park Highlighted**
- **Given:** Player's home is "Emerald Diamond"
- **When:** User views
- **Then:** Emerald Diamond section highlighted
- **Verify:** Find home park indicator

**AC-3: Sample Size Shown**
- **Given:** 5 games at one stadium
- **When:** User views that section
- **Then:** "(5 G)" or "5 games" shown
- **Verify:** Find sample size

### Technical Notes
- User requested feature
- Need stadium on game records

---

## S-F010: Create AdaptiveLearningSystem Module

**Parent Feature:** F-F008
**Priority:** P1
**Estimated Size:** Large

**As a** game system
**I want to** improve fielding inference over time
**So that** predictions become more accurate

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Track Inference vs Actual**
- **Given:** Fielding event occurs
- **When:** Stored to database
- **Then:** Inference (predicted fielder) and actual fielder recorded
- **Verify:** Find both values in record

**AC-2: Update At N>=20**
- **Given:** 20 events for hit zone "CF-deep"
- **When:** System calculates
- **Then:** Probability weights updated
- **Verify:** Check probability changed from default

**AC-3: Per-Player Adjustments**
- **Given:** Madoka Hayata has unusual range
- **When:** 20 events tracked
- **Then:** Hayata-specific probabilities stored
- **Verify:** Find player-specific weights

### Technical Notes
- Per FEATURE_WISHLIST HIGH
- Minimum 20 samples for confidence

---

## S-F011: Create FieldingStatsAggregation Service

**Parent Feature:** F-F009
**Priority:** P1
**Estimated Size:** Large

**As a** game system
**I want to** aggregate fielding stats by position
**So that** Gold Glove can be awarded

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Per-Position Stats**
- **Given:** Player played 50 games at SS, 10 at 2B
- **When:** Stats aggregated
- **Then:** Separate stats for SS and 2B
- **Verify:** Find position-split stats

**AC-2: Standard Stats**
- **Given:** Stats aggregated
- **When:** User views
- **Then:** PO, A, E, FLD% visible
- **Verify:** Find all 4 fielding stats

**AC-3: Season Totals**
- **Given:** Season ends
- **When:** Stats finalized
- **Then:** Season totals per player-position
- **Verify:** Find full season aggregates

### Technical Notes
- Per FWAR_CALCULATION_SPEC
- Needed for Gold Glove awards

---

## S-F012: Create LeagueNewsFeed Component

**Parent Feature:** F-F010
**Priority:** P1
**Estimated Size:** Large

**As a** user
**I want to** see league news feed
**So that** I stay informed about happenings

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Stories Listed**
- **Given:** 10 news events occurred
- **When:** LeagueNewsFeed renders
- **Then:** 10 story items shown
- **Verify:** Count news items

**AC-2: Chronological Order**
- **Given:** Stories from different dates
- **When:** User views feed
- **Then:** Most recent at top
- **Verify:** Check date ordering

**AC-3: Team Filter**
- **Given:** Filter set to "Sirloins"
- **When:** Feed updates
- **Then:** Only Sirloins stories shown
- **Verify:** Confirm filter works

### Technical Notes
- Per NARRATIVE_ENGINE_SPEC
- Story types: trades, milestones, injuries, signings

---

# PHASE F SUMMARY

| ID | Feature | Priority |
|----|---------|----------|
| S-F001 | RelationshipEngine Module | P1 |
| S-F002 | Relationship Morale Effects | P1 |
| S-F003 | Trade Relationship Warnings | P1 |
| S-F004 | RelationshipPanel | P1 |
| S-F005 | AgingEngine Module | P0 |
| S-F006 | Retirement Probability | P0 |
| S-F007 | AgingDisplay | P1 |
| S-F008 | ParkFactorDisplay | P1 |
| S-F009 | StatsByParkView | P2 |
| S-F010 | AdaptiveLearningSystem | P1 |
| S-F011 | FieldingStatsAggregation | P1 |
| S-F012 | LeagueNewsFeed | P1 |

**Total Phase F Stories:** 12
**P0 Stories:** 2
**P1 Stories:** 9
**P2 Stories:** 1

---

*All stories follow Ralph Framework: < 200 lines, max 3 acceptance criteria, Given/When/Then/Verify format.*
