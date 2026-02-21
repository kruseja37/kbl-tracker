# Handoff Prompt: Spec-to-Fix-Queue Reconciliation

## Context

You are picking up KBL Tracker audit work across two prior sessions:

**Session 1 (Audit + OOTP Research):** Completed Phase 1 audit (26/26 Pattern Map rows closed), built Phase 2 fix queue (11 FIX-CODE items, 11 FIX-DECISION items), and ingested OOTP architectural research that informed several FIX-DECISION recommendations.

**Session 2 (Spec Sync):** Executed 20 spec updates — 8 major rewrites, 7 new specs created, 5 minor cross-reference updates. These updates embedded significant architectural decisions that changed what the specs say the code SHOULD do.

## The Problem

The Phase 2 fix queue was built BEFORE the spec sync. The specs have now changed. This means:
- Some FIX-CODE items may now be differently scoped (spec says something different than when the fix was written)
- Some FIX-DECISION items may already be resolved by spec decisions made during sync
- New gaps may have emerged (spec now describes behavior that wasn't in scope when audit ran)
- Fix priority order may need adjustment based on new spec dependencies

## Your Task

**Produce a reconciliation plan** that maps every Phase 2 fix queue item against the updated specs and identifies:

1. **UNCHANGED** — Fix item still valid as-is, spec change doesn't affect it
2. **RE-SCOPED** — Fix item is still needed but scope/approach changed due to spec update
3. **RESOLVED** — FIX-DECISION item is now answered by a spec decision (state which spec + section)
4. **NEW GAP** — Spec now describes something that has no corresponding fix queue item
5. **OBSOLETE** — Fix item no longer applies given spec changes

## Files to Read (in this order)

1. `/Users/johnkruse/Projects/kbl-tracker/spec-docs/SESSION_RULES.md` — operating protocol
2. `/Users/johnkruse/Projects/kbl-tracker/spec-docs/CURRENT_STATE.md` — current status with full 20-item spec sync summary + Phase 2 fix queue
3. `/Users/johnkruse/Projects/kbl-tracker/spec-docs/SESSION_LOG.md` — read the LAST TWO session entries (OOTP research session + Spec Sync verification session)
4. `/Users/johnkruse/Projects/kbl-tracker/spec-docs/AUDIT_LOG.md` — findings F-098 through F-123 (the Phase 2 items)

Then for each fix queue item, read the UPDATED spec it relates to:

| Fix Item | Spec to Check |
|----------|--------------|
| F-098 (clutch) | CLUTCH_ATTRIBUTION_SPEC.md |
| F-099 (LI) | LEVERAGE_INDEX_SPEC.md |
| F-101 (fan morale) | FAN_MORALE_SYSTEM_SPEC.md ← **MAJOR UPDATE** |
| F-102 (standings pipeline) | STAT_TRACKING_ARCHITECTURE_SPEC.md |
| F-103 (WAR wiring) | BWAR_CALCULATION_SPEC.md, PWAR_CALCULATION_SPEC.md |
| F-104 (traits) | TRAIT_INTEGRATION_SPEC.md ← **NEW SPEC** |
| F-109 (career stats) | ALMANAC_SPEC.md ← **NEW SPEC** |
| F-110 (mWAR hardcoded) | MWAR_CALCULATION_SPEC.md |
| F-112 (clearSeasonalStats) | OFFSEASON_SYSTEM_SPEC.md ← **MAJOR UPDATE** |
| F-113 (playoff stats) | PLAYOFF_SYSTEM_SPEC.md |
| F-114 (mojo/fitness) | MOJO_FITNESS_SYSTEM_SPEC.md |
| F-115 (salary) | SALARY_SYSTEM_SPEC.md ← **MAJOR UPDATE** |
| F-118 (aging) | EOS_RATINGS_ADJUSTMENT_SPEC.md ← **UPDATED** |
| F-119 (relationships) | NARRATIVE_SYSTEM_SPEC.md ← **UPDATED** |
| F-120 (narrative) | NARRATIVE_SYSTEM_SPEC.md ← **UPDATED** |
| F-121 (player dev) | PROSPECT_GENERATION_SPEC.md ← **NEW SPEC**, SCOUTING_SYSTEM_SPEC.md ← **NEW SPEC** |
| F-122 (record book) | ALMANAC_SPEC.md ← **NEW SPEC** |

Also check these new specs for NEW GAP items that have no fix queue entry:
- PERSONALITY_SYSTEM_SPEC.md — is any of this wired in code?
- SEPARATED_MODES_ARCHITECTURE.md — does current code match this mode separation?
- PARK_FACTOR_SEED_SPEC.md — is park factor seeding implemented?

## Part 2: Figma Spec Alignment Audit

The spec sync updated system specs but did NOT systematically update their corresponding Figma specs (UI wireframe blueprints). There are 13 Figma specs total. Several are now contradicted by the system specs they implement.

**Known problems (confirm and document these):**

| Figma Spec | System Spec Changed | Likely Issue |
|---|---|---|
| CONTRACTION_EXPANSION_FIGMA_SPEC.md | Contraction REMOVED from OFFSEASON_SYSTEM_SPEC.md | **Entire file is obsolete** — describes UI for a removed feature |
| FINALIZE_ADVANCE_FIGMA_SPEC.md | OFFSEASON Phase 11 restructured, signing round added | Missing signing round UI, phase numbering may be wrong |
| TRADE_FIGMA_SPEC.md | TRADE_SYSTEM_SPEC.md removed salary matching | Probably still shows salary matching UI flows |
| EOS_RATINGS_FIGMA_SPEC.md | EOS_RATINGS_ADJUSTMENT_SPEC.md updated with trait assignment | May not reflect trait-based adjustments in UI |
| RETIREMENT_FIGMA_SPEC.md | OFFSEASON phase restructure | Phase numbering may be wrong |
| SEASON_END_FIGMA_SPEC.md | OFFSEASON phase restructure | Phase numbering may be wrong |

**Figma specs with unknown drift (check these):**

| Figma Spec | Related Change | Question |
|---|---|---|
| LEAGUE_BUILDER_FIGMA_SPEC.md | SEPARATED_MODES_ARCHITECTURE.md is new | Does the Figma spec match the 3-mode separation? |
| SCHEDULE_SYSTEM_FIGMA_SPEC.md | Dynamic scheduling decision made | Does UI reflect fictional dates + dynamic schedule? |
| SEASON_SETUP_FIGMA_SPEC.md | Season setup may be affected by mode separation | Unchecked |
| PLAYOFFS_FIGMA_SPEC.md | Probably fine | Quick confirm |

**Figma specs already touched during spec sync (likely OK):**
- DRAFT_FIGMA_SPEC.md — grade distribution table added
- FREE_AGENCY_FIGMA_SPEC.md — personality cross-ref added
- AWARDS_CEREMONY_FIGMA_SPEC.md — already aligned

For each Figma spec, classify as:
- **ALIGNED** — matches its system spec, no changes needed
- **STALE** — contradicts updated system spec, needs rewrite
- **OBSOLETE** — describes a removed feature, should be archived to `spec-docs/archive/`

## Output Format

Produce a markdown document with:
1. **Fix Queue Reconciliation Table** (one row per fix item, columns: Finding ID | Status | Rationale | Updated Scope if changed)
2. **Figma Spec Alignment Table** (one row per Figma spec, columns: Figma Spec | Status | Issue | Action Needed)
3. A NEW GAPS section listing any spec requirements with no fix queue coverage
4. A recommended REVISED PRIORITY ORDER for Phase 2 execution
5. Any FIX-DECISION items that are now RESOLVED (with the spec section that resolves them)
6. A list of Figma specs to archive, rewrite, or leave as-is

## Rules
- Do NOT start fixing code. This is a planning session only.
- Do NOT re-audit Pattern Map rows. Phase 1 is done.
- Do NOT modify specs. They were just verified and confirmed.
- Write your reconciliation plan to `spec-docs/RECONCILIATION_PLAN.md`
- Append a session entry to SESSION_LOG.md when done
- Update CURRENT_STATE.md if status changes
