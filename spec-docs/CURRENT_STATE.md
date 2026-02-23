# KBL Tracker — Current State
**Last updated:** 2026-02-22 (Gospel Consolidation Map complete, ready to draft)
**Protocol:** REWRITE this file (do not append) at every session end.
**Max length:** 2 pages. If it grows beyond this, you are doing it wrong.

---

## Current Phase and Step
- **Phase:** Gospel Consolidation — MAPPING COMPLETE, DRAFTING NEXT
- **Next action:** Draft MODE_1_LEAGUE_BUILDER.md (first gospel)
- **Drafting order:** Mode 1 → Mode 3 → Mode 2 → Almanac → Spine

---

## Gospel Consolidation Status

| Gospel | Input Specs | Decisions | Status |
|--------|-----------|-----------|--------|
| MODE_1_LEAGUE_BUILDER.md | 13 | 10 | **NEXT** |
| MODE_3_OFFSEASON_WORKSHOP.md | 17 | 17 | Queued |
| MODE_2_FRANCHISE_SEASON.md | 39 | 31 | Queued |
| ALMANAC.md | 2 | 0 | Queued |
| SPINE_ARCHITECTURE.md | Cross-cutting (C-045) | — | Queued |

### Key Resolved Decisions Affecting All Gospels
- **13 offseason phases** (not 11, not 14). Phases 12-13: Farm Reconciliation + Chemistry Rebalancing.
- **Spine = standalone 5th document**, referenced by all 4 gospels.
- **Franchise Types:** Solo (1P) / Couch Co-Op / Custom — configuration layer, not structural change. Design note written.
- **Step 5 (granular spec updates) was skipped** — decisions fold directly into gospels.

---

## Blueprint Files (the consolidation instruction set)

| File | Purpose |
|------|---------|
| GOSPEL_CONSOLIDATION_MAP.md | Master mapping: specs → gospels, decisions → gospels, shared specs, archive list |
| FRANCHISE_TYPE_DESIGN_NOTE.md | Solo/Co-Op/Custom franchise types, `controlledBy` flag, phase scope, hybrid standings |
| STEP4_DECISIONS.md | All 42 decisions (62 unique IDs) — consumed during drafting |

---

## Prior Completed Work (do not re-derive)
- SpecRecon Steps 1-4: ALL COMPLETE
- Phase 1 Pattern Map: 26/26 rows COMPLETE
- Spec Sync: 20 items verified on disk COMPLETE
- Phase B Reconciliation: 92 kept, 48 archived from 140 specs
- Step 3: 94 findings across 6 domains, all resolved
- Step 4: 42 decisions (62 IDs), all resolved in STEP4_DECISIONS.md
- Consolidation Map: all 62 IDs verified, all files on disk accounted for

---

## Files a New Thread Must Read (in order)
1. This file (CURRENT_STATE.md)
2. spec-docs/SESSION_RULES.md
3. spec-docs/GOSPEL_CONSOLIDATION_MAP.md — **THE KEY FILE** — master blueprint
4. spec-docs/FRANCHISE_TYPE_DESIGN_NOTE.md — franchise type design
5. spec-docs/STEP4_DECISIONS.md — all 42 resolved decisions

For Mode 1 drafting, also read:
6. spec-docs/LEAGUE_BUILDER_SPEC.md — primary source
7. spec-docs/SEPARATED_MODES_ARCHITECTURE.md — mode boundaries (being superseded)

---

## What a New Thread Should NOT Do
- Re-audit anything — all audit phases complete
- Re-run reconciliation — all decisions answered
- Re-ask Step 4 decisions — all 42 resolved
- Skip reading GOSPEL_CONSOLIDATION_MAP.md — it IS the drafting instruction set
- Start drafting Mode 2 or Mode 3 before Mode 1 — order matters
- Modify existing specs — changes go INTO the new gospel docs, not back into source specs
