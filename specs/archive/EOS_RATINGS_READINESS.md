# EOS Ratings Adjustments - Figma Readiness Scoping

> **Purpose**: Define what needs to be finalized before uploading Figma designs for EOS Ratings
> **Created**: January 29, 2026
> **Status**: ✅ READY FOR FIGMA DESIGN

---

## Executive Summary

The End-of-Season (EOS) Ratings Adjustment system has **comprehensive spec documentation** and all blocking decisions have been **CONFIRMED**:

1. ✅ **Both Systems Apply**: Rating adjustments (System A) + Salary adjustments (System B)
2. ✅ **User-Controlled Manager Distribution**: Users allocate bonus/penalty points
3. ✅ **Team-by-Team Dramatic Reveal**: One team at a time with navigation

The Figma spec (`EOS_RATINGS_FIGMA_SPEC.md`) is ready for design work.

---

## Source Documents Reviewed

| Document | Section | Content |
|----------|---------|---------|
| EOS_RATINGS_ADJUSTMENT_SPEC.md | Full | Position detection, thresholds, WAR mapping |
| KBL_XHD_TRACKER_MASTER_SPEC_v3.md | §10 | Salary percentile system, calculation formulas |
| OFFSEASON_SYSTEM_SPEC.md | §5 (Phase 3) | True Value, contract adjustment, UI wireframes |
| STORIES_PHASE_E.md | S-E004 | Story acceptance criteria |
| AUDIT_REPORT.md | - | Implementation status |

---

## Current Implementation Status

| Component | Code Exists | Wired | Functional | Notes |
|-----------|-------------|-------|------------|-------|
| EOSRatingsView.tsx | ✅ | ✅ | ⚠️ Unknown | Route exists at `/offseason/ratings` |
| Calculation Engine | ⚠️ Partial | ⚠️ Unknown | ⚠️ Unknown | salaryCalculator.ts exists |
| Position Detection | ⚠️ Partial | ⚠️ Unknown | ⚠️ Unknown | Algorithm in spec only |
| WAR Calculations | ✅ | ✅ | ✅ | bWAR, rWAR, fWAR, pWAR engines exist |

---

## Spec Clarifications Needed Before Design

### 1. TWO SYSTEMS - CONFIRMED: BOTH APPLY IN SEQUENCE ✅

**RESOLVED (Jan 29, 2026)**: Both systems apply in sequence.

**System A: Position-Based Salary Percentiles** (MASTER_SPEC v3 §10)
- Compare player salary percentile vs WAR percentile AT SAME POSITION
- Uses salary tiers with asymmetric factors (high-paid = big downside, low-paid = big upside)
- Produces rating point adjustments (+/-10 max per WAR component)
- **RUNS FIRST** - Adjusts actual SMB4 ratings

**System B: True Value Recalibration** (OFFSEASON_SYSTEM_SPEC §5)
- Calculate "True Value" from WAR performance
- Adjust CONTRACT SALARY toward True Value (50% of gap)
- Uses salary floor/ceiling by grade
- **RUNS SECOND** - Adjusts salary for next season

**Complete Loop**:
```
Season Play → Accumulate WAR
    ↓
EOS System A: Ratings adjust based on WAR vs salary expectation
    ↓
EOS System B: Salary adjusts toward "true value"
    ↓
Next Season: New salary creates new expectations
    ↓
Repeat
```

---

### 2. UI FLOW NOT FULLY SPECIFIED

**Current Spec Coverage**:
- ✅ Calculation formulas (complete)
- ✅ WAR → Rating category mapping (complete)
- ⚠️ User interaction model (incomplete)
- ❌ Screen-by-screen flow (missing)
- ❌ Manager distribution UI (missing)

**Missing UI Decisions**:

| Decision | Options | Impact |
|----------|---------|--------|
| Player grouping | By team vs by position vs all players | Screen layout |
| Reveal mechanism | All at once vs one-by-one vs batch | Animation design |
| User control | Read-only vs ability to adjust | Interaction patterns |
| Manager distribution | Modal vs inline vs separate screen | Flow complexity |

---

### 3. MANAGER ADJUSTMENT SYSTEM NEEDS UI SPEC

**From EOS_RATINGS_ADJUSTMENT_SPEC.md §Manager Adjustment System**:

- Managers get a "pool" of points to distribute (±20 base + mWAR bonus + MOY bonus)
- Can be positive OR negative to any player
- Max 50% to single player
- Can target any rating category
- Negative pools MUST be distributed (poor managers penalize their team)

**UI Questions**:
1. Does the USER distribute points, or is it AUTO?
2. If user-controlled: per team or batch?
3. How to visualize negative pool distribution?
4. Real-time validation as points are allocated?

**Recommendation**: Spec suggests user-controlled distribution. Need confirmation.

---

### 4. DH HANDLING CONFIRMED BUT NEEDS VISUAL TREATMENT

**From Spec**:
- DHs have no fWAR → Display "N/A" for fielding adjustments
- Other WAR components (bWAR, rWAR) still apply

**Design Decision Needed**:
- Gray out fielding row?
- Hide fielding row entirely?
- Show "N/A (DH - no fielding)" inline?

---

### 5. POSITION DETECTION TIMING

**Question**: When does position detection run?
- At season end (one-time)?
- Stored and displayed to user?
- Or calculated on-the-fly during EOS?

**Impact**: If stored, we might show "Detected Position: UTIL" on player card.

---

## Pre-Design Decisions - RESOLVED

### Priority 1 (Previously Blocking - NOW CONFIRMED)

| # | Decision | Resolution | Date |
|---|----------|------------|------|
| 1 | System A vs System B relationship | **BOTH SYSTEMS APPLY**: System A (rating adjustments) runs first, then System B (salary adjustments). This creates complete loop: ratings change based on performance, then salary adjusts toward "true value". | Jan 29, 2026 |
| 2 | Manager distribution | **USER-CONTROLLED**: Users manually allocate manager bonus/penalty points to players. | Jan 29, 2026 |
| 3 | Reveal mechanism | **TEAM-BY-TEAM DRAMATIC REVEAL**: Show one team at a time with ability to navigate between teams. | Jan 29, 2026 |

### Priority 2 (Confirmed Defaults)

| # | Decision | Confirmed Approach |
|---|----------|-------------------|
| 4 | Player grouping | By team (user's teams first) |
| 5 | DH fielding display | Show "N/A" inline |
| 6 | Position detection visibility | Show detected position |

### Priority 3 (Nice to have - Polish)

| # | Decision | Notes |
|---|----------|-------|
| 7 | Animation style | Card flip vs number roll-up |
| 8 | Export/share functionality | PDF export of changes |
| 9 | Historical comparison | Compare to last season |

---

## Proposed Screen Flow (Draft)

Based on spec analysis, I propose this flow for design:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EOS RATINGS ADJUSTMENT FLOW                           │
└─────────────────────────────────────────────────────────────────────────────┘

SCREEN 1: OVERVIEW
├── Season summary stats
├── Total players with changes
├── Breakdown: Improved / Declined / No Change
└── [Begin Review] button

SCREEN 2: TEAM-BY-TEAM REVEAL (repeat for each team)
├── Team header (logo, name, record)
├── Player list with adjustments
│   ├── Before/After ratings
│   ├── WAR breakdown (bWAR, rWAR, fWAR, pWAR)
│   ├── Net change indicator (+5, -3, etc.)
│   └── Detected position badge
├── Team totals (sum of all adjustments)
└── [Next Team] / [Previous Team]

SCREEN 3: MANAGER DISTRIBUTION (if user-controlled)
├── Manager info (name, grade, mWAR)
├── Pool size display (+25 points to distribute)
├── Player allocation interface
│   ├── Player selector
│   ├── Rating category selector
│   ├── Point amount (+/-)
│   └── Running total
├── Validation (must use all points)
└── [Confirm Distribution]

SCREEN 4: SUMMARY
├── League-wide changes
├── Biggest risers / fallers
├── Notable changes (traits gained, etc.)
└── [Continue to Retirements]
```

---

## Data Requirements for UI

### Player Card Data

```typescript
interface EOSPlayerAdjustment {
  playerId: string;
  playerName: string;
  teamId: string;

  // Position
  detectedPosition: string;  // 'SP', 'UTIL', 'CF', etc.
  primaryPosition: string;   // From roster

  // Before/After Ratings
  ratingsBefore: {
    power: number;
    contact: number;
    speed: number;
    fielding: number;
    arm: number;
    velocity: number;
    junk: number;
    accuracy: number;
  };
  ratingsAfter: { /* same structure */ };

  // Adjustment Breakdown
  adjustments: {
    bWAR: { percentile: number; delta: number; ratingChange: number; };
    rWAR: { percentile: number; delta: number; ratingChange: number; };
    fWAR: { percentile: number; delta: number; ratingChange: number; } | null;  // null for DH
    pWAR: { percentile: number; delta: number; ratingChange: number; } | null;  // null for non-pitcher
  };

  // Salary Context
  salary: number;
  salaryPercentile: number;
  salaryTier: 'elite' | 'high' | 'midHigh' | 'midLow' | 'low' | 'minimum';

  // Net Change
  totalRatingChange: number;  // Sum of all adjustments
}
```

### Manager Distribution Data

```typescript
interface ManagerDistributionState {
  managerId: string;
  managerName: string;
  teamId: string;

  // Pool
  basePool: number;      // Always 20
  mwarBonus: number;     // From mWAR vs median
  moyBonus: number;      // +5 if Manager of Year
  totalPool: number;     // Sum

  // Allocations
  allocations: Array<{
    playerId: string;
    ratingCategory: string;
    points: number;  // Can be negative
  }>;

  // Validation
  remainingPoints: number;
  isValid: boolean;  // Must be 0 remaining
}
```

---

## Next Steps

1. ~~**JK to confirm** blocking decisions (Priority 1)~~ ✅ DONE (Jan 29, 2026)
2. ~~**Claude to create** Figma spec based on decisions~~ ✅ DONE - See `EOS_RATINGS_FIGMA_SPEC.md`
3. **Designer to build** screens in Figma ← **CURRENT STEP**
4. **Review cycle** with stakeholder

---

## Appendix: Quick Reference Tables

### WAR → Rating Mapping

| WAR Component | Applies To | Rating Categories | Distribution |
|---------------|------------|-------------------|--------------|
| bWAR | Batters | Power, Contact | 50/50 |
| rWAR | All | Speed | 100% |
| fWAR | Fielders (not DH) | Fielding, Arm | 50/50 |
| pWAR | Pitchers | Velocity, Junk, Accuracy | 33/33/33 |

### Salary Tier Factors

| Tier | Salary %ile | Positive Factor | Negative Factor |
|------|-------------|-----------------|-----------------|
| Elite | 90-100% | 1.0 | 10.0 |
| High | 75-89% | 2.0 | 7.0 |
| Mid-High | 50-74% | 4.0 | 5.0 |
| Mid-Low | 25-49% | 6.0 | 3.0 |
| Low | 10-24% | 8.0 | 1.5 |
| Minimum | 0-9% | 10.0 | 1.0 |

### Grade Factors (from EOS_RATINGS_ADJUSTMENT_SPEC.md)

| Grade | Positive Factor | Negative Factor |
|-------|-----------------|-----------------|
| S | 0.10 | 2.50 |
| A+ | 0.15 | 2.00 |
| A | 0.20 | 1.75 |
| A- | 0.30 | 1.50 |
| B+ | 0.50 | 1.25 |
| B | 0.75 | 1.00 |
| B- | 1.00 | 0.85 |
| C+ | 1.25 | 0.70 |
| C | 1.50 | 0.50 |
| C- | 1.75 | 0.35 |
| D+ | 2.00 | 0.25 |
| D | 2.25 | 0.20 |

---

*End of Readiness Scoping Document*
