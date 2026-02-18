# Architectural Decisions
**Purpose:** Permanent record of structural decisions. A new thread reads this to avoid re-deriving what has already been concluded. Never delete entries. Add new entries at the bottom with date.

---

## Format
`[DATE] DECISION-NNN: [one-line statement of what was decided and why]`

---

## Decisions

[2026-02-18] DECISION-001: No separate career stats table. Career stats = SUM(PlayerSeasonStats WHERE playerId = X). Prevents sync issues. Matches Lahman/OOTP pattern. careerStorage.ts should aggregate, not store raw.

[2026-02-18] DECISION-002: Stat pipeline is synchronous and game-triggered. Every game completion fires the full pipeline: accumulate → WAR → milestones → narratives. No background jobs, no eventual consistency, no deferred writes.

[2026-02-18] DECISION-003: Season transition is atomic. closeSeason() and openSeason() are transactional. If any step fails, the season boundary must not be crossed. Partial season transitions are invalid state.

[2026-02-18] DECISION-004: src_figma/utils/ files are re-export barrels only. All persistence logic lives in src/utils/. src_figma/utils/ contains 1-line re-exports pointing there. Confirmed clean architecture, not a problem.

[2026-02-18] DECISION-005: Four-layer architecture is the active pattern. Layer 1: src/engines/ (pure logic). Layer 2: src_figma/app/engines/ (bridge). Layer 3: src_figma/app/hooks/ (React hooks). Layer 4: src_figma/hooks/ (page hooks). Hook layer (3-4) is the active surface. Orphaned code lives in 1-2.

[2026-02-18] DECISION-006: Pattern Map is the Phase 2 audit lens. For every subsystem, the question is not "does it exist?" but "does it follow the OOTP architectural pattern?" Existence without correct pattern = wrong shape.

[2026-02-18] DECISION-007: Trait system must be migrated to active types. PlayerTraits exists in unifiedPlayerStorage.ts (legacy) but not in active app types. Traits are first-class Player fields in OOTP — inputs to development rate, narrative triggers, contract behavior, morale. Must be in active type.

[2026-02-18] DECISION-008: mWAR and positional WAR are separate systems. useMWARCalculations (manager WAR — active) is not the same as bWAR/fWAR/pWAR/rWAR (positional WAR — orphaned). Do not conflate them. Positional WAR reconnection is Phase 3 work.

[2026-02-18] DECISION-009: OOTP architecture is the reference pattern. We copy OOTP structural patterns, not their assets. Same data flow shapes, same pipeline contracts, different SMB4-specific traits/ratings/narratives. Architecture is the template; SMB4 spec-docs provide the content.

[2026-02-18] DECISION-010: Documentation routing is structural. FINDINGS 001-055: AUDIT_LOG.md full text. FINDINGS 056+: FINDINGS_056_onwards.md full text, AUDIT_LOG.md index only. CURRENT_STATE.md is rewritten (not appended) at every session end. ARCHITECTURAL_DECISIONS.md is append-only, never deleted.
