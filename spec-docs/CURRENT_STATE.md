# CURRENT_STATE.md

**Last Updated:** 2026-03-07
**Phase:** V1 Simplification — Phase B COMPLETE → Phase C Next | GameTracker Delta: Layer 4 COMPLETE

---

## Current Phase and Step

Phase B — V1 Spec Assembly — **COMPLETE.** Four V1_FINAL.md build specs produced, V2_DEFERRED_BACKLOG.md updated, cross-reference reconciliation passed (3 conflicts found and resolved). Phase C — Code Alignment is next.

## Last Completed Action

Session 2026-03-07 (E): Completed GameTracker Delta Layer 4 — Between-Play Events & Substitutions.

- **TICKET 4.1 (GAP-GT-5-A)**: Runner tap → popover (Steal/Advance/WP/PB/Pickoff/Substitute)
- **TICKET 4.2 (GAP-GT-5-B)**: WP/PB destination picker (non-standard advance)
- **TICKET 4.3 (GAP-GT-7-A)**: Fielder tap → substitution flow (SubstitutionModalBase)
- **TICKET 4.4 (GAP-GT-5-C)**: Pinch runner [Substitute] in runner popover
- **TICKET 4.5 (GAP-GT-5-F)**: [Move Position] in fielder popover
- **TICKET 4.6 (GAP-GT-5-E)**: Tappable pitcher in FenwayBoard → pitching change
- **TICKET 4.10 (GAP-GT-5-G)**: Position innings tracking (positionInningsRef)
- Branch: `feature/gt-layer4-between-play-subs` — build pass, 4,028 tests pass

## Next Action

**GameTracker Delta Layer 5** — Special Events (TOOTBLAN, Web Gem, Nut Shot auto-detect).
OR continue **Phase C — Code Alignment** (V1 spec → code gap analysis).

## GameTracker Delta Progress

| Layer | Status | Commit |
|-------|--------|--------|
| Layer 1: Type Definitions | ✅ COMPLETE | ecce786 |
| Layer 1B: Context Snapshot | ✅ COMPLETE | (session C) |
| Layer 1C: New Interfaces | ✅ COMPLETE | (session C) |
| Layer 2A: Grid Scaffold | ✅ COMPLETE | 9a28ef0 |
| Layer 2B: Quick Bar | ✅ COMPLETE | 512e7ea |
| Layer 2C+D: Fenway Board + Play Log | ✅ COMPLETE | 8077ddc |
| Layer 3: Baseball Rules | ✅ COMPLETE | 070affc |
| Layer 4: Between-Play Wiring | ✅ COMPLETE | (branch: feature/gt-layer4-between-play-subs) |
| Layer 5: Special Events | ⬜ NOT STARTED | — |

---

**Begin Phase C — Code Alignment.**
Per V1_SIMPLIFICATION_SESSION_RULES.md:
1. Map every v1 spec section to existing code (or identify as a build gap)
2. Quarantine v2 code (identify and catalog code that implements deferred features)
3. Gap-analyze and produce build plan for any v1 sections not yet implemented
Governed by `V1_CODE_ALIGNMENT_PLAN.md`.

## Phase B Summary

| Deliverable | Lines | Status |
|---|---|---|
| MODE_2_V1_FINAL.md | 3,428 | ✅ Complete |
| MODE_1_V1_FINAL.md | 1,682 | ✅ Complete |
| MODE_3_V1_FINAL.md | 1,619 | ✅ Complete |
| ALMANAC_V1_FINAL.md | 610 | ✅ Complete |
| V2_DEFERRED_BACKLOG.md | ~340 | ✅ Complete |
| Cross-ref reconciliation | — | ✅ 3 conflicts resolved, 12 checks passed |

## Key Resolved Decisions (Cumulative)

All prior decisions from Phase A still apply. From Phase B:
- SeasonSummary interface has NO `seasonClassification` field in v1 (always PRIMARY, field removed)
- `offseasonScope` is 3-value everywhere: `'default' | 'human-only' | 'all-teams'`
- `franchiseRegistry` is the 7th global store in kbl-app-meta (required for Almanac cross-franchise)
- V2_DEFERRED_BACKLOG.md is the authoritative, complete deferral record across all 4 modes + Almanac

## Working Documents

- `spec-docs/v1-simplification/MODE_1_V1_FINAL.md` — ✅ v1 build spec for League Builder
- `spec-docs/v1-simplification/MODE_2_V1_FINAL.md` — ✅ v1 build spec for Franchise Season
- `spec-docs/v1-simplification/MODE_3_V1_FINAL.md` — ✅ v1 build spec for Offseason Workshop
- `spec-docs/v1-simplification/ALMANAC_V1_FINAL.md` — ✅ v1 build spec for Almanac
- `spec-docs/v1-simplification/V2_DEFERRED_BACKLOG.md` — ✅ complete deferral record
- `spec-docs/v1-simplification/V1_SIMPLIFICATION_TRACKER.md` — session progress
- `spec-docs/V1_SIMPLIFICATION_SESSION_RULES.md` — governing principles
- `spec-docs/V1_CODE_ALIGNMENT_PLAN.md` — Phase C governance (next)
