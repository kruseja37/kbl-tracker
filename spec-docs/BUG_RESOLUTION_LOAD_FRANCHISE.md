# Bug Resolution - Load Franchise Mode

> **Purpose**: Track bugs found during user testing and their resolution status
> **Created**: February 4, 2026
> **Last Updated**: February 4, 2026

---

## Overview

Load Franchise mode allows users to resume a previously saved franchise.

**Key Files**:
- `src/src_figma/app/pages/FranchiseHome.tsx` - Main franchise hub
- `src/utils/franchiseStorage.ts` - Franchise persistence
- `src/src_figma/hooks/useFranchiseData.ts` - Franchise data hook (if exists)

**Flow**:
1. Select saved franchise from list
2. Load franchise state
3. Continue at FranchiseHome

**FranchiseHome Tabs**:
- Schedule
- Standings
- Leaders
- Roster
- Trades
- (Playoffs when active)
- (Offseason flows)

---

## Bug Log

### Format
```
### BUG-LF-XXX: [Short Description]
**Status**: [ OPEN | IN_PROGRESS | FIXED | WONT_FIX ]
**Reported**: [Date]
**Fixed**: [Date or N/A]
**Area**: [ LOAD_LIST | SCHEDULE | STANDINGS | LEADERS | ROSTER | TRADES | PLAYOFFS | OFFSEASON | OTHER ]

**Steps to Reproduce**:
1. ...
2. ...

**Expected Behavior**: ...

**Actual Behavior**: ...

**Root Cause**: [After investigation]

**Resolution**: [What was done to fix it]

**Files Changed**:
- ...
```

---

## Open Bugs

*Awaiting user testing input*

---

## Fixed Bugs

*None yet*

---

## Won't Fix

*None yet*
