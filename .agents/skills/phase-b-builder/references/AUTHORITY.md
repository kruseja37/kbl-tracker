# Authority Hierarchy & Pre-Resolved Decisions

## Authority Hierarchy (Non-Negotiable)

When building any Phase B item, resolve conflicts in this order:

1. **"Your Decision:" field** on each item = user's final call (overrides all other sources)
2. **"Spec Says:" field** = WHAT to build
3. **"Recommended Fix:" field** = HOW to build it (user-edited notes take highest priority)
4. **If spec doc on disk conflicts** with TRIAGE_DECISIONS.md content → TRIAGE_DECISIONS.md wins

**Field clarification:**
- "My Triage:" = Claude's initial assessment (FEATURE BUILD, FIX CODE, NEEDS YOUR CALL, etc.)
- "Your Decision:" = User's override decision (BUILD, SKIP, etc.) — THIS is the authoritative decision
- "Status:" = Final status (APPROVED (Phase B), DONE (Phase A), DUPLICATE, etc.)

Read item data from: `spec-docs/TRIAGE_DECISIONS.md` (markdown export of xlsx, 356 rows)
Each item is a `### ITEM-ID` header followed by key-value pairs with `- ` prefix.

---

## Item Selection Criteria

**Build an item if:**
- `My Triage: FEATURE BUILD` and NOT in the SKIP or DUPLICATE lists below, OR
- `My Triage: NEEDS YOUR CALL` with `Your Decision: BUILD` (see §User-Decided BUILD Items below)

**Do NOT build if:**
- Item is in the SKIP list (§Items to SKIP)
- Item is in the DUPLICATE list (§Duplicate Items) — the primary covers it
- `My Triage: FIX CODE` → handled by batch-fix-protocol, not phase-b-builder
- `My Triage: DOC ONLY` or `My Triage: UPDATE SPEC` or `My Triage: DEFER`

---

## User-Decided BUILD Items (15 — triaged as NEEDS YOUR CALL, user decided BUILD)

These items have `My Triage: NEEDS YOUR CALL` but the user explicitly approved them as BUILD.
They will NOT appear in a search for "My Triage: FEATURE BUILD" — you MUST include them.

| Item ID | Batch | Spec | Tier |
|---------|-------|------|------|
| MAJ-B4-004 | 4 | GRADE_ALGORITHM_SPEC.md §Position Player Thresholds | 1.1 |
| MAJ-B5-014 | 5 | OFFSEASON_SYSTEM_SPEC.md §2 | 1.2 |
| MIN-B1-006 | 1 | RWAR_CALCULATION_SPEC.md §8 | 1.3 |
| MIN-B1-007 | 1 | MWAR_CALCULATION_SPEC.md §5 | 1.3 |
| MAJ-B9-001 | 9 | ADAPTIVE_STANDARDS_ENGINE_SPEC.md §3 | 1.3 |
| CRIT-B6-004 | 6 | CONTRACTION_EXPANSION_FIGMA_SPEC.md §Screens 6-11 | 3.1 |
| CRIT-B6-005 | 6 | DRAFT_FIGMA_SPEC.md §Farm Model | 3.1 |
| CRIT-B7-001 | 7 | FINALIZE_ADVANCE_FIGMA_SPEC.md §Season Transition | 3.2 |
| CRIT-B7-002 | 7 | FINALIZE_ADVANCE_FIGMA_SPEC.md §AI Roster | 3.2 |
| CRIT-B7-004 | 7 | LEAGUE_BUILDER_FIGMA_SPEC.md §League Editor | 3.3 |
| CRIT-B8-002 | 8 | SEASON_END_FIGMA_SPEC.md §Season End Flow | 3.2 |
| MAJ-B6-012 | 6 | FREE_AGENCY_FIGMA_SPEC.md §Drag Reorder | 3.2 |
| GAP-B13-001 | 13 | STORIES_RETIREMENT.md S-RET005 | 3.5 |
| MIS-B13-001 | 13 | STORIES_RETIREMENT.md S-RET001 | 3.5 |
| MIS-B14-001 | 14 | smb_maddux_analysis.md | 4 |

**CRITICAL:** CRIT-B7-001 and CRIT-B7-002 are the PRIMARY items for duplicates GAP-B11-010 and GAP-B11-011. If these primaries are missed, the duplicates would also be skipped, and the Season Transition + AI Roster features would never be built.

---

## Pre-Resolved User Decisions (DO NOT re-surface)

These were explicitly decided by the user. Do not ask about them again:

| Decision | Context |
|----------|---------|
| Farm cap = 10 with release modal | CRIT-B6-005 |
| No shift logic | GAP-B3-010 SKIPPED |
| IFR stays user input only (low pop-ups don't always trigger) | GAP-B2-001, GAP-B3-014 SKIPPED |
| No ground rule double tracking | GAP-B3-015 SKIPPED |
| HOF score weighted by games/season variable from season setup | GAP-B10-006 |
| Full 40+ field FieldingPlay minus shift fields, keep zoneId/foulOut/savedRun | GAP-B3-011 |
| All fielding aligns with enhanced FieldCanvas, NOT legacy zones | GAP-B3-013 |
| Supplemental FA signing coexists with dice-based flow | GAP-B11-012 |
| SP/RP classified as pitchers in League Builder roster setups | NEW-001 |
| Pre-game lineup screen for Franchise Mode | NEW-002 |
| Remove Pitch Counts and Mound Visits from Rules | NEW-003 |
| Maddux threshold weighted by innings/game | MIS-B14-001 |

---

## Items to SKIP (5)

| Item ID | Reason |
|---------|--------|
| GAP-B2-001 | IFR auto-detect — user input only |
| GAP-B3-001 | Shift clutch adjustment — depends on skipped shift |
| GAP-B3-010 | Shift logic — not needed |
| GAP-B3-014 | IFR auto-detect — same as GAP-B2-001 |
| GAP-B3-015 | Ground rule double tracking — not needed |

## Duplicate Items (7 — skip duplicate, primary covers work)

| Duplicate | Primary | Topic |
|-----------|---------|-------|
| GAP-B11-010 | CRIT-B7-001 | Season transition |
| GAP-B11-011 | CRIT-B7-002 | AI roster building |
| GAP-B13-004 | CRIT-B8-001 | Postseason MVP |
| MAJ-B1-002 | GAP-B1-002 | Stats calibration |
| MAJ-B1-003 | GAP-B1-004 | Pitcher park factor |
| GAP-B12-004 | GAP-B11-012 | Direct FA signing |
| GAP-B3-024 | GAP-B12-003 | Undo count badge |

## New Features (3 — beyond original audit)

| ID | Feature |
|----|---------|
| NEW-001 | SP/RP classified as pitchers (not position players) in League Builder roster setups |
| NEW-002 | Franchise Mode pre-game lineup screen (choose starting pitcher + reorder lineup) |
| NEW-003 | Remove Pitch Counts and Mound Visits from Rules in League Builder |
