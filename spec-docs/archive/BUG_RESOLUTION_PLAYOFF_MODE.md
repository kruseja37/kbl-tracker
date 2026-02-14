# Bug Resolution - Playoff Mode

> **Purpose**: Track bugs found during user testing and their resolution status
> **Created**: February 4, 2026
> **Last Updated**: February 4, 2026

---

## Overview

Playoff Mode handles postseason bracket play within a franchise.

**Key Files**:
- `src/src_figma/app/pages/FranchiseHome.tsx` - Playoff tabs integration
- `src/src_figma/app/pages/PlayoffBracket.tsx` - Bracket visualization
- `src/utils/playoffStorage.ts` - Playoff persistence
- `src/src_figma/hooks/usePlayoffData.ts` - Playoff data hook

**Playoff Tabs** (in FranchiseHome):
- Bracket - Visual bracket view
- Series - Series-by-series breakdown
- Playoff Stats - Aggregated playoff statistics

**Flow**:
1. Regular season ends
2. Create Playoff (select teams, seeding)
3. Start Playoffs
4. Play series (best-of-5, best-of-7)
5. Advance rounds
6. World Series
7. Complete → Offseason

---

## Bug Log

### Format
```
### BUG-PO-XXX: [Short Description]
**Status**: [ OPEN | IN_PROGRESS | FIXED | WONT_FIX ]
**Reported**: [Date]
**Fixed**: [Date or N/A]
**Area**: [ CREATE | BRACKET | SERIES | STATS | ADVANCE | WORLD_SERIES | OTHER ]

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
