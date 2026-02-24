# Step 3: Domain 4 — Narrative / Milestones / Designations / Personality / Scouting

**Date:** 2026-02-22
**Cross-reference sources:**
- GOSPEL (KBL_UNIFIED_ARCHITECTURE_SPEC v1.2) — §2.1, §8, §9.4, §12.3, §12.4, §12.6
- PERSONALITY_SYSTEM_SPEC.md (127 lines, full read)
- SCOUTING_SYSTEM_SPEC.md (184 lines, full read)
- FAN_FAVORITE_SYSTEM_SPEC.md (536 lines, full read)
- DYNAMIC_DESIGNATIONS_SPEC.md (811 lines, full read)
- MILESTONE_SYSTEM_SPEC.md (1,111 lines, full read)
- NARRATIVE_SYSTEM_SPEC.md (2,996 lines, full read via subagent)

**Protocol note:** After FAN_FAVORITE_SYSTEM_SPEC was initially declared "0 findings" (incorrectly — missed C-055 and C-056), a cross-spec reconciliation rule was added to SKILL.md. All subsequent files were analyzed against BOTH the GOSPEL AND all previously-read specs in the domain.

---

## Contradiction Matrix

| ID | Files | Topic | File A Says | File B Says | Type |
|----|-------|-------|-------------|-------------|------|
| **C-052** | GOSPEL §2.1 lines 219-227 vs PERSONALITY_SYSTEM_SPEC §3 | Hidden personality model | GOSPEL: 6 OOTP traits (leadership, loyalty, desireForWinner, greed, workEthic, intelligence) at 1-200 scale | PERSONALITY: 4 KBL-native modifiers (Loyalty, Ambition, Resilience, Charisma) at 0-100 scale | **GOSPEL_STALE** |
| **C-053** | PERSONALITY_SYSTEM_SPEC §5.3 vs DYNAMIC_DESIGNATIONS_SPEC line 46 | Team Captain formula | PERSONALITY: "Highest combined (Loyalty + Charisma) among veterans (3+ seasons)" | DESIGNATIONS: "Highest Charisma ≥ 70" | **CONTRADICTION** |
| **C-054** | SCOUTING_SYSTEM_SPEC §2.1 vs JK Q-001 decision | Trait visibility on farm | SCOUTING: Traits ✅ "Visible in SMB4" | JK Q-001: "Ratings, traits, and grade all hidden while on farm. Revealed at call-up." | **CONTRADICTION** |
| **C-055** | FAN_FAVORITE_SYSTEM_SPEC line 206 vs DYNAMIC_DESIGNATIONS_SPEC lines 499-507 | Establishment multiplier | FAN_FAVORITE: Static "Late: ×1.25, Final: ×1.5" | DESIGNATIONS: Base ×1.0 for late/final, modified by playoff context | **CONTRADICTION** |
| **C-056** | FAN_FAVORITE_SYSTEM_SPEC line 257 vs DYNAMIC_DESIGNATIONS_SPEC line 757 | Albatross trade value | FAN_FAVORITE: `tradeValue *= 0.70` (30% discount) | DESIGNATIONS: "15% trade value discount" | **CONTRADICTION** |
| **C-057** | DYNAMIC_DESIGNATIONS_SPEC lines 169, 245-329, 689-695 | Team Captain in data models | Team Captain defined in prose (lines 45-53) with criteria, effects, narrative integration | PlayerDesignationStatus, TeamDesignationState, DesignationChangeEvent all EXCLUDE Captain. Happiness effects table omits Captain. | **INCOMPLETE_SPEC** |
| **C-065** | MILESTONE_SYSTEM_SPEC §5.1 lines 468-474 vs §5.2 line 538 | HOF-Caliber WAR scaling | §5.1: Career WAR thresholds scale with opportunityFactor (50 → ~40 in 128-game) | §5.2: "HOF-Caliber: Career WAR ≥ 50" (unscaled raw value) | **INTERNAL_INCONSISTENCY** |
| **C-066** | MILESTONE_SYSTEM_SPEC §5.2 lines 512-515 vs DYNAMIC_DESIGNATIONS_SPEC lines 458-695 | Cornerstone FA retention | MILESTONE: "+10% less likely to leave in free agency" | DESIGNATIONS: Comprehensive Cornerstone effects — happiness, immunity, baseline bonus — but NO FA retention modifier | **MISSING_MECHANIC** |
| **C-067** | DYNAMIC_DESIGNATIONS_SPEC line 51 vs NARRATIVE_SYSTEM_SPEC (full) | Team Captain in narrative | DESIGNATIONS: "Beat reporter storylines reference the Captain in leadership and team chemistry contexts. Morale events tied to Captain's performance have amplified impact (±50% morale swing magnitude)." | NARRATIVE: Zero mentions of "Team Captain" or "Captain" in 2,996 lines | **MISSING_MECHANIC** |
| **C-068** | NARRATIVE_SYSTEM_SPEC lines 1565-1588 vs PERSONALITY_SYSTEM_SPEC (full) | INSIDER reporter reveal consequences | NARRATIVE: INSIDER reporters reveal hidden chemistry/morale (10% chance), sets `revealsHiddenInfo: true` | PERSONALITY: Hidden modifiers defined at 0-100 but no mechanism for what happens when "revealed" — does user see the value? Permanent visibility? Morale consequences? | **MISSING_MECHANIC** |
| **C-069** | GOSPEL §8.6 line 977 vs NARRATIVE_SYSTEM_SPEC lines 285-326 | Reporter morale influence cap | GOSPEL: "on-field product drives 80%+... Reporter influence is the remaining 10-20%" | NARRATIVE: Per-story values can compound (DRAMATIC: +2 win × 1.5 streak × 1.5 big moment × 1.5 tenure = 6.75 pts from ONE story). No per-game or per-season cap enforced. | **CONTRADICTION** |

---

## JK Decisions Already Made (This Domain)

| Finding | JK Decision |
|---------|-------------|
| **C-052** | 4-modifier approach approved. GOSPEL is stale on personality model. |
| **C-053** | Formula = highest combined (Loyalty + Charisma), NO minimum tenure, NO minimum trait value. Both specs wrong. |
| **C-054** | Traits hidden on farm, revealed at call-up (Q-001 confirmed). SCOUTING_SYSTEM_SPEC needs correction. |

---

## WATCH Items (Not Findings)

| Item | Spec | Note |
|------|------|------|
| Grade scale missing A- | SCOUTING_SYSTEM_SPEC §2.1 line 23 | 9 grades listed: A+, A, B+, B, B-, C+, C, C-, D — A- absent. Possible intentional omission or oversight. |
| Reporter hiring/firing incomplete | NARRATIVE_SYSTEM_SPEC §10.2 lines 374-510 | Firing logic defined (5% base + triggers) but no spec for who selects the replacement reporter. |
| 80/20 rule naming overlap | NARRATIVE_SYSTEM_SPEC §2.3 + §6.3 | Same "80/20 rule" name used for both reporter personality alignment and player quote generation — two independent probability systems. |

---

## Summary by Type

| Type | Count | IDs | Severity |
|------|-------|-----|----------|
| **CONTRADICTION** | 5 | C-053, C-054, C-055, C-056, C-069 | HIGH |
| **GOSPEL_STALE** | 1 | C-052 | HIGH (JK approved KBL-native approach) |
| **MISSING_MECHANIC** | 3 | C-066, C-067, C-068 | MEDIUM |
| **INCOMPLETE_SPEC** | 1 | C-057 | MEDIUM |
| **INTERNAL_INCONSISTENCY** | 1 | C-065 | MEDIUM |

---

## Step 4 Decision Queue (Domain 4)

| Priority | ID | Topic | Core Question for JK |
|----------|-----|-------|---------------------|
| 1 | **C-055 + C-056** | Establishment multiplier + Albatross discount | FAN_FAVORITE vs DESIGNATIONS: which values are authoritative? Static late-season multipliers or playoff-context-modified? 30% or 15% Albatross discount? |
| 2 | **C-069** | Reporter morale influence cap | GOSPEL says 10-20%. NARRATIVE allows unbounded compounding. Add a per-game or per-season cap? |
| 3 | **C-057 + C-067** | Team Captain completeness | Captain missing from DESIGNATIONS data models AND from NARRATIVE system. Add Captain to both? |
| 4 | **C-065** | HOF-Caliber WAR scaling | Should the 50 WAR threshold scale with opportunityFactor like other career WAR thresholds? |
| 5 | **C-066** | Cornerstone FA retention | "+10% less likely to leave in FA" — add to DESIGNATIONS? Add to OFFSEASON FA phase? |
| 6 | **C-068** | INSIDER reporter reveal | What are the mechanical consequences of revealing hidden modifiers? User sees value? Permanent? Morale penalty? |
| 7 | **C-054** | Trait visibility on farm | SCOUTING spec needs update per Q-001. Straightforward fix. |

---

*Domain 4 complete. 18 findings total (C-052 through C-069). 3 JK decisions already made. 7 items in Step 4 decision queue. Awaiting JK review before proceeding to Domain 5 (League Builder / Season Setup).*
