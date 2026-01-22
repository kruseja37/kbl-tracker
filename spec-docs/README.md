# KBL XHD Tracker - Specification Documents

This folder contains all specification, design, and implementation documentation for the KBL XHD Tracker application.

## Quick Navigation

### 🔴 Start Here (Core Docs)

| Document | Purpose |
|----------|---------|
| [MASTER_BASEBALL_RULES_AND_LOGIC.md](./MASTER_BASEBALL_RULES_AND_LOGIC.md) | **Source of truth** for baseball rules |
| [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) | **How features are built** - code examples, tests |
| [TRACKER_LOGIC_AUDIT.md](./TRACKER_LOGIC_AUDIT.md) | **What's implemented** - status of each rule |
| [CHANGELOG.md](./CHANGELOG.md) | **What changed** - history of updates |

### 📋 Specifications

| Document | Purpose |
|----------|---------|
| KBL_XHD_TRACKER_MASTER_SPEC_v3.md | Full application specification |
| SALARY_SYSTEM_SPEC_v2.md | Player salary and contract system |
| MASTER_SPEC_CORRECTIONS_v2.md | Corrections to original spec |

### 🎮 Game Systems

| Document | Purpose |
|----------|---------|
| fame_and_events_system.md | Fame points and random events |
| grade_tracking_system.md | Player grade progression |
| offseason_system_design_v2.md | Off-season mechanics |

---

## Recent Updates

### January 21, 2026

Completed implementation of critical baseball rules:

1. ✅ **Force Out Third Out Rule** - No runs score when 3rd out is force out
2. ✅ **Fielder's Choice Flow** - User selects which runner was out
3. ✅ **Tag-Up Context** - Fly outs require tag-up for advancement
4. ✅ **SAC Validation** - Requires runners on base
5. ✅ **Hit Type Stats** - Tracks 1B, 2B, 3B separately
6. ✅ **IFR Indicator** - Shows when Infield Fly Rule is in effect

See [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for full details.

---

## Document Relationships

```
MASTER_BASEBALL_RULES_AND_LOGIC.md  (What the rules ARE)
            ↓
    TRACKER_LOGIC_AUDIT.md          (What we've implemented)
            ↓
    IMPLEMENTATION_GUIDE.md         (HOW we implemented it)
            ↓
        CHANGELOG.md                (WHEN we made changes)
```

---

## For New Developers

1. **Read** `MASTER_BASEBALL_RULES_AND_LOGIC.md` to understand baseball rules
2. **Check** `TRACKER_LOGIC_AUDIT.md` to see implementation status
3. **Reference** `IMPLEMENTATION_GUIDE.md` for code examples
4. **Update** `CHANGELOG.md` when making changes

---

## Data Files

| File | Purpose |
|------|---------|
| all_players_combined.csv | Player data |
| all_teams_combined.csv | Team data |
| names_database.json | Name generation |
| smb4_traits_reference.md | Player traits reference |

---

*Last updated: January 21, 2026*
