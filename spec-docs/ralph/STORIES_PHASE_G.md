# KBL Tracker - Phase G User Stories: Polish & History

> **Purpose**: User stories for Museum, Hall of Fame, Records, Data Export
> **Generated**: January 26, 2026
> **Format**: Ralph Framework - max 3 acceptance criteria per story

---

# PHASE G: POLISH & HISTORY

---

## S-G001: Create MuseumHub Component

**Parent Feature:** F-G001
**Priority:** P2
**Estimated Size:** Medium

**As a** user
**I want to** access franchise history museum
**So that** I can explore past achievements

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Section Navigation**
- **Given:** MuseumHub renders
- **When:** User views
- **Then:** Navigation to Hall of Fame, Retired Numbers, Records, Championships
- **Verify:** Find 4+ section links

**AC-2: Featured Items**
- **Given:** Museum hub displayed
- **When:** User views main area
- **Then:** Featured highlights (recent HOF inductee, latest record) shown
- **Verify:** Find featured content

**AC-3: Clean Layout**
- **Given:** Museum displayed
- **When:** User views
- **Then:** Gallery-style clean design
- **Verify:** Visual inspection of layout

### Technical Notes
- New file: `src/pages/MuseumHub.tsx`
- Per MASTER_SPEC §24

---

## S-G002: Create HallOfFameGallery Component

**Parent Feature:** F-G002
**Priority:** P2
**Estimated Size:** Large

**As a** user
**I want to** see Hall of Fame members
**So that** I honor franchise legends

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: All HOF Members Listed**
- **Given:** 5 players in HOF
- **When:** HallOfFameGallery renders
- **Then:** All 5 displayed
- **Verify:** Count HOF entries

**AC-2: Plaque Display**
- **Given:** HOF member displayed
- **When:** User views entry
- **Then:** Plaque-style card with name and photo placeholder
- **Verify:** Find plaque visual

**AC-3: Career Summary**
- **Given:** HOF member displayed
- **When:** User views entry
- **Then:** Career stats (years, WAR, awards) visible
- **Verify:** Find career summary

### Technical Notes
- Per MASTER_SPEC §14

---

## S-G003: Create RetiredNumbersWall Component

**Parent Feature:** F-G003
**Priority:** P2
**Estimated Size:** Medium

**As a** user
**I want to** see retired jersey numbers
**So that** I honor numbered legends

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Numbers Displayed**
- **Given:** Numbers 7, 21, 42 retired
- **When:** RetiredNumbersWall renders
- **Then:** 7, 21, 42 visible in wall display
- **Verify:** Find all three numbers

**AC-2: Player Association**
- **Given:** #7 retired for "Joey Bagels"
- **When:** User views #7
- **Then:** "Joey Bagels" name shown
- **Verify:** Find name with number

**AC-3: Retirement Date**
- **Given:** #7 retired in 2028
- **When:** User views #7
- **Then:** "Retired: 2028" shown
- **Verify:** Find retirement date

### Technical Notes
- Per MASTER_SPEC §14

---

## S-G004: Create FranchiseRecords Component

**Parent Feature:** F-G004
**Priority:** P2
**Estimated Size:** Large

**As a** user
**I want to** see franchise record holders
**So that** I know historical bests

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Record Categories**
- **Given:** FranchiseRecords renders
- **When:** User views
- **Then:** Season and career categories visible
- **Verify:** Find category sections

**AC-2: Record Holder and Value**
- **Given:** Season HR record is 45 by Player X
- **When:** User views that record
- **Then:** "Player X - 45" shown
- **Verify:** Find holder and value

**AC-3: Category Filter**
- **Given:** User selects "Pitching"
- **When:** Filter applied
- **Then:** Only pitching records shown
- **Verify:** Confirm filter works

### Technical Notes
- Per MASTER_SPEC §15
- Track when records broken

---

## S-G005: Create ChampionshipBanners Component

**Parent Feature:** F-G005
**Priority:** P2
**Estimated Size:** Medium

**As a** user
**I want to** see championship banners
**So that** I celebrate past glory

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Banners Displayed**
- **Given:** 3 championships won (2026, 2028, 2030)
- **When:** ChampionshipBanners renders
- **Then:** 3 banner visuals shown
- **Verify:** Count championship banners

**AC-2: Year on Banner**
- **Given:** 2026 championship
- **When:** User views banner
- **Then:** "2026" visible on banner
- **Verify:** Find year text

**AC-3: Click for Details**
- **Given:** Banner displayed
- **When:** User clicks
- **Then:** Season summary/roster shown
- **Verify:** Click banner, see details

### Technical Notes
- Per MASTER_SPEC §24

---

## S-G006: Create DataExport Service

**Parent Feature:** F-G006
**Priority:** P2
**Estimated Size:** Large

**As a** user
**I want to** export data to CSV/JSON
**So that** I can analyze externally

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Box Score Export**
- **Given:** Game completed
- **When:** User clicks "Export Box Score"
- **Then:** CSV file downloads
- **Verify:** Check downloaded file contents

**AC-2: Season Stats Export**
- **Given:** Season has data
- **When:** User clicks "Export Season Stats"
- **Then:** CSV with all player stats downloads
- **Verify:** Check downloaded file

**AC-3: Format Selection**
- **Given:** Export dialog
- **When:** User selects format
- **Then:** CSV or JSON options available
- **Verify:** Find format dropdown

### Technical Notes
- Use Blob API for downloads
- Include headers in CSV

---

## S-G007: Create ContractionWarning Component

**Parent Feature:** F-G007
**Priority:** P1
**Estimated Size:** Medium

**As a** user
**I want to** be warned about contraction risk
**So that** I can save my team

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Warning at <30 Morale**
- **Given:** Team morale at 25
- **When:** Dashboard viewed
- **Then:** "⚠️ Contraction Risk" warning visible
- **Verify:** Find warning banner

**AC-2: Risk Factors Shown**
- **Given:** Warning displayed
- **When:** User views detail
- **Then:** "Low fan morale (25)" factor shown
- **Verify:** Find factor explanation

**AC-3: Dismissible**
- **Given:** Warning shown
- **When:** User clicks dismiss
- **Then:** Warning hidden (until next session)
- **Verify:** Dismiss and confirm hidden

### Technical Notes
- Per OFFSEASON_SPEC §6
- Contraction happens at offseason if morale < 30

---

## S-G008: Create ChemistryDisplay Component

**Parent Feature:** F-F003 (From Phase F, lower priority)
**Priority:** P2
**Estimated Size:** Large

**As a** user
**I want to** see team chemistry overview
**So that** I understand team cohesion

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Chemistry Score**
- **Given:** Team chemistry calculated
- **When:** ChemistryDisplay renders
- **Then:** Team score (0-100) visible
- **Verify:** Find chemistry score

**AC-2: Chemistry Grade**
- **Given:** Score is 75
- **When:** User views
- **Then:** Grade "B" shown
- **Verify:** Find letter grade

**AC-3: Top Pairings**
- **Given:** Best chemistry pairs identified
- **When:** User views detail
- **Then:** "Best: Player A + Player B" shown
- **Verify:** Find top pairing

### Technical Notes
- Per CHEMISTRY_SPEC
- Depends on Relationship Engine

---

# PHASE G SUMMARY

| ID | Feature | Priority |
|----|---------|----------|
| S-G001 | MuseumHub | P2 |
| S-G002 | HallOfFameGallery | P2 |
| S-G003 | RetiredNumbersWall | P2 |
| S-G004 | FranchiseRecords | P2 |
| S-G005 | ChampionshipBanners | P2 |
| S-G006 | DataExport Service | P2 |
| S-G007 | ContractionWarning | P1 |
| S-G008 | ChemistryDisplay | P2 |

**Total Phase G Stories:** 8
**P0 Stories:** 0
**P1 Stories:** 1
**P2 Stories:** 7

---

# COMPLETE STORY SUMMARY ACROSS ALL PHASES

| Phase | Description | Stories | P0 | P1 | P2 |
|-------|-------------|---------|----|----|-----|
| A | Foundation | 22 | 21 | 1 | 0 |
| B | Core Game Loop | 18 | 8 | 10 | 0 |
| C | Season Infrastructure | 15 | 4 | 11 | 0 |
| D | Awards & Recognition | 13 | 9 | 4 | 0 |
| E | Offseason System | 15 | 14 | 1 | 0 |
| F | Advanced Systems | 12 | 2 | 9 | 1 |
| G | Polish & History | 8 | 0 | 1 | 7 |
| **TOTAL** | | **103** | **58** | **37** | **8** |

## Implementation Order

1. **Phase A (Foundation)** - Must complete first, enables routing and state
2. **Phase B (Core Game)** - Requires Phase A, completes game loop
3. **Phase C (Season)** - Requires Phase B, adds season context
4. **Phase D (Awards)** - Requires Phase C, end-of-season features
5. **Phase E (Offseason)** - Requires Phase D, between-season features
6. **Phase F (Advanced)** - Can parallel Phases D-E, independent systems
7. **Phase G (Polish)** - Lowest priority, polish and history

---

*All stories follow Ralph Framework: < 200 lines, max 3 acceptance criteria, Given/When/Then/Verify format.*
