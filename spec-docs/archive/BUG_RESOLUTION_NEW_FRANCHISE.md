# Bug Resolution - New Franchise Mode

> **Purpose**: Track bugs found during user testing and their resolution status
> **Created**: February 4, 2026
> **Last Updated**: February 4, 2026

---

## Overview

New Franchise mode allows users to start a new franchise from a League Builder league.

**Key Files**:
- `src/src_figma/app/pages/FranchiseSetup.tsx` - Setup wizard
- `src/src_figma/app/pages/FranchiseHome.tsx` - Main franchise hub
- `src/src_figma/hooks/useLeagueBuilderData.ts` - League/team data
- `src/utils/franchiseStorage.ts` - Franchise persistence

**Setup Flow**:
1. Select League (from League Builder)
2. Enter Franchise Name
3. Select User Team
4. Configure Settings
5. Confirm & Create

---

## Bug Log

### Format
```
### BUG-NF-XXX: [Short Description]
**Status**: [ OPEN | IN_PROGRESS | FIXED | WONT_FIX ]
**Reported**: [Date]
**Fixed**: [Date or N/A]
**Step**: [ LEAGUE_SELECT | NAME | TEAM_SELECT | SETTINGS | CONFIRM | OTHER ]

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
