# SPEC_RECONCILIATION_FINDINGS.md
# Full second-pass verification — reading actual spec content, not just grep hits
# Date: 2026-02-21
# Status: ALL DECISIONS RESOLVED — specs updated 2026-02-21

---

## RESOLUTION LOG (2026-02-21)

All 10 JK decisions received and spec updates applied. Summary:

| # | Decision | Specs Updated |
|---|----------|---------------|
| CONFLICT-003 | Real SMB4 chemistry types: Competitive, Crafty, Disciplined, Spirited, Scholarly (5 types) | TRAIT_INTEGRATION_SPEC, PROSPECT_GENERATION_SPEC |
| CONFLICT-004 | FA exchange: ±20% True Value match, no position restriction | FREE_AGENCY_FIGMA_SPEC, OFFSEASON_SYSTEM_SPEC |
| CONFLICT-005 | All grades possible on farm (A through D), bell curve per PROSPECT_GENERATION_SPEC | FARM_SYSTEM_SPEC |
| Q-001 | Rookie salary set at draft by round ($2M/1.2M/0.7M/0.5M); locked until EOS after rookie season; ratings/traits/grade hidden until call-up | FARM_SYSTEM_SPEC |
| Q-002 | Run differential tiebreaker; if still tied, user selects who advances | PLAYOFF_SYSTEM_SPEC |
| Q-003 | League Builder includes prospect draft step to populate farms at startup | LEAGUE_BUILDER_SPEC §9 |
| Q-004 | Stadium change mechanic is v1 scope (Phase 4 of offseason) | OFFSEASON_SYSTEM_SPEC §6.2b |
| Q-005 | Fat-tail deviation: normal distribution with σ scaled by position inaccuracy; ±4 hard cap; rare large misses possible | SCOUTING_SYSTEM_SPEC |
| Q-006 | Team captain is v1 scope, driven by Charisma ≥ 70; highest Charisma on team gets designation | DYNAMIC_DESIGNATIONS_SPEC |
| Q-007 | Beat reporter pre-decision warning is v1 scope; blocking modal before call-up/send-down | FARM_SYSTEM_SPEC |

---

## HOW THIS PASS WAS DIFFERENT

First pass relied primarily on grep/search to confirm presence of topics.
This pass read actual spec content section-by-section to verify:
- Whether the content matches JK's intent, not just that the word appears
- Internal consistency between specs that reference each other
- Alignment between smb4_traits_reference.md (source of truth) and calculation specs

---

## CONFIRMED ITEMS (cleared, no action needed)

| Item | Verified In | Confirmed |
|------|-------------|-----------|
| 3 options rule (send-down limit) | FARM_SYSTEM_SPEC §Options System | Full TypeScript impl with canOptionPlayer() |
| Call-up rating reveal | FARM_SYSTEM_SPEC §Call-Up Rating Reveal + SCOUTING_SYSTEM_SPEC §4.3 | Reveal ceremony specced |
| No salary matching on trades | TRADE_SYSTEM_SPEC §4 | Explicitly: "NO salary matching requirement" |
| Triple salary recalculation | OFFSEASON_SYSTEM_SPEC | Phases 3, 8, 10 |
| Fan morale 60/20/10/10 formula | FAN_MORALE_SYSTEM_SPEC §0.1 | TypeScript impl |
| Fictional date system | FRANCHISE_MODE_SPEC §11.3 | "April 1, Year 1", 2-day advance per game |
| Dynamic schedule (no auto-gen) | FRANCHISE_MODE_SPEC §11.2 | Confirmed |
| Unlimited farm / 10 at Phase 11 | FARM_SYSTEM_SPEC §Roster Constraints | Table confirmed |
| Park factor 40% activation | PARK_FACTOR_SEED_SPEC §2 | activationThreshold: 0.40 |
| 7 visible personality types | PERSONALITY_SYSTEM_SPEC | Confirmed |
| 4 hidden modifiers | PERSONALITY_SYSTEM_SPEC | Loyalty, Ambition, Resilience, Charisma |
| No salary cap (soft pressure) | SALARY_SYSTEM_SPEC §1 (line 13) | Confirmed |
| Charisma drives team captain | PERSONALITY_SYSTEM_SPEC + OFFSEASON_SYSTEM_SPEC §14 | Listed as Charisma effect — Q-006 remains open (no mechanic specced) |
| Hall of Fame is user-manual | OFFSEASON_SYSTEM_SPEC §16 | "entirely user discretion - no automatic eligibility" |
| Retirement: age-weighted, 1-2 per team | OFFSEASON_SYSTEM_SPEC §7 | Base probability 50% oldest → 1-5% youngest |
| REG absorbed into narrative events | NARRATIVE_SYSTEM_SPEC v1.2 changelog | "Removed REG as standalone" — intentional |
| Beat reporter personality types | NARRATIVE_SYSTEM_SPEC §3 | 8 types with weighted distribution |
| Trait max 2 per player | TRAIT_INTEGRATION_SPEC §5.1 | Hard cap confirmed |
| Prospect grade distribution | PROSPECT_GENERATION_SPEC §3.2 | Confirmed B/B-/C+ most common |
| Separated modes architecture | SEPARATED_MODES_ARCHITECTURE.md + FRANCHISE_MODE_SPEC §11.1 | Three modes confirmed |
| Almanac always accessible | ALMANAC_SPEC §1 | "ALWAYS accessible regardless of current mode" |
| Personality bias on hidden modifiers | PERSONALITY_SYSTEM_SPEC §3.2 | Full table (e.g. EGOTISTICAL: +15 Ambition, -10 Loyalty) |

---

## NEW CONFLICTS FOUND (require JK decision)

These are genuine spec-to-spec contradictions discovered only by reading actual content.

---

### CONFLICT-003 — Chemistry Type Names and Count
**Severity: CRITICAL — touches salary, traits, prospect generation, scouting**

**smb4_traits_reference.md** (source of truth — actual SMB4 game data) defines **5** chemistry types:
1. Competitive
2. Crafty
3. Disciplined
4. Spirited
5. Scholarly

**TRAIT_INTEGRATION_SPEC.md** (Feb 20 canonical) defines **4** chemistry types:
- `type ChemistryType = 'Spirited' | 'Crafty' | 'Tough' | 'Flashy'`

**PROSPECT_GENERATION_SPEC.md** §3.5 also says 4 types: Spirited, Crafty, Tough, Flashy.

The names "Tough" and "Flashy" **do not exist** in SMB4. The names "Competitive", "Disciplined", and "Scholarly" are in the actual game but absent from all calculation specs.

**Downstream impact:**
- SALARY_SYSTEM_SPEC's trait tiers reference the wrong type names
- Prospect generation distributes across 4 incorrect types
- TRAIT_INTEGRATION_SPEC's TRAIT_CHEMISTRY_MAP maps ~20 traits with wrong labels, missing ~50+ traits from the reference
- Chemistry potency calculations will be wrong in code if built from these specs

**JK must decide:** Are "Tough" and "Flashy" intentional simplifications, or were they placeholder names that were never corrected back to the SMB4 names (Competitive/Disciplined/Scholarly)? If SMB4 has 5 chemistry types, KBL should too — the north star is "preserve SMB4 asset intact."

**Update needed:** TRAIT_INTEGRATION_SPEC, PROSPECT_GENERATION_SPEC, and any code that hardcodes Tough/Flashy must be corrected to match the actual SMB4 chemistry types.

---

### CONFLICT-004 — Free Agency Player Exchange Rules
**Severity: HIGH — two canonical specs directly contradict each other**

**FREE_AGENCY_FIGMA_SPEC.md** §Screen 4 (Feb 20 canonical):
> "Return player must be within ±10% of incoming player's TRUE VALUE (salary)"
> "No position matching required"
> Fallback: closest salary if no one meets ±10%

**OFFSEASON_SYSTEM_SPEC.md** §7.5 Player Exchange (Feb 20 canonical):
> Must match by position type (position player for position player, pitcher for pitcher)
> Grade-based requirement (equal or better grade if receiving team has better record; half grade worse allowed if worse record)
> No mention of salary matching at all

These specs describe completely different mechanics for the same Phase 7 FA exchange. One uses salary/true value as the matching criterion with no position restriction. The other uses grade and position type with no salary criterion.

**JK must decide:** Which rule governs FA player exchange?
- Option A: FIGMA spec (±10% salary/true value, no position restriction) — more elegant, uses the established True Value concept
- Option B: OFFSEASON spec (grade + position type, record-based leniency) — more baseball-realistic
- Option C: Hybrid (position matching + salary proximity)

**Update needed:** Whichever spec is wrong must be updated to match the decision.

---

### CONFLICT-005 — Draft Prospect Grade Range vs Farm Roster Grade Range
**Severity: MEDIUM — creates logical gap in the draft → farm pipeline**

**PROSPECT_GENERATION_SPEC.md** §3.2 shows draft grades ranging from D to A:
- A: 2%, A-: 5%, B+: 10%, B: 15%, B-: 15%, C+: 15%, C: 18%, C-: 12%, D: 8%

**FARM_SYSTEM_SPEC.md** §interface FarmPlayer explicitly states:
> "Rating: B to C- only (no A-tier prospects)"
> `overallRating: 'B' | 'B-' | 'C+' | 'C' | 'C-'`

This means A, A-, B+, and D grade prospects can be drafted, but can't exist on a farm roster per the FARM_SYSTEM_SPEC schema. The pipeline is broken: what happens to a drafted A- prospect? Do they go straight to the MLB roster? Are they blocked from existing in the system?

FARM_SYSTEM_SPEC also doesn't have B+ in the schema, meaning a B+ draft pick has no valid destination.

**JK must decide:**
- Option A: Farm spec is right — draft grade distribution needs to be capped at B (remove A, A-, B+, D from draft)
- Option B: Draft spec is right — FARM_SYSTEM_SPEC schema needs B+, A-, A, and D grades added
- Option C: A-tier and B+ prospects are immediately eligible for the MLB roster on draft day (never go to farm), and D players don't make the team. This creates a new mechanic that needs speccing.

**Update needed:** One or both specs must be corrected to create a coherent pipeline.

---

## OPEN QUESTIONS (carried forward from first pass, now with corrections)

### Q-001 — Rookie Salary: Draft Position vs Rating at Call-Up
**Status: GENUINE CONFLICT**

FARM_SYSTEM_SPEC §calculateRookieSalary() sets salary by rating at call-up time (B = $1.2M, C- = $0.5M). JK's feedback says salary should be based on draft position (you don't know ratings until call-up, so salary should be pre-committed at draft time).

These are mutually exclusive. True Value comparison also changes depending on which anchor you use.

Note: If CONFLICT-005 is resolved with Option A (cap draft grades at B), then rating-at-callup becomes less ambiguous because only B through C- exist. If Option B or C is chosen, the salary model needs to handle A-tier MLB-ready draftees too.

**JK must decide:** Draft position salary OR call-up rating salary.

---

### Q-002 — Run Differential as Playoff/Standings Tiebreaker
**Status: TRUE GAP — not in any spec**

Confirmed absent from FRANCHISE_MODE_SPEC, PLAYOFF_SYSTEM_SPEC, and all other Feb 20 specs. PLAYOFF_SYSTEM_SPEC §seeding mentions seeding options (BEST_RECORDS, DIVISION_WINNERS_PLUS_WILDCARDS) but no tiebreaker mechanism at all.

Run differential also needs to be tracked in the standings data model if it's to be used.

**JK must confirm:** Run differential is the only tiebreaker? Any secondary tiebreaker (head-to-head)?

---

### Q-003 — Prospect Draft in League Builder (Farm Population at Startup)
**Status: TRUE GAP — not in any spec**

LEAGUE_BUILDER_SPEC has no farm population step. FARM_SYSTEM_SPEC assumes farms are filled via the annual draft, but the first draft happens at end of Season 1 — meaning all farms start empty. No spec addresses how farms are populated before the first season begins.

**JK must decide:** (a) v1 scope? (b) Auto-populate with generated prospects? (c) League builder draft step?

---

### Q-004 — Stadium Change Mechanic
**Status: TRUE GAP — not in any spec**

OFFSEASON_SYSTEM_SPEC §6.2 only covers stadium selection for new expansion teams. No mechanic exists for changing an existing team's stadium.

**JK must decide:** v1 scope? Which offseason phase?

---

### Q-005 — Scout Grade Deviation: Deterministic Cap vs Fat-Tail
**Status: CONFIRMED PARTIAL — current spec has capped ±2 step deviation**

SCOUTING_SYSTEM_SPEC §3.2 confirmed: `maxDeviation = Math.floor((100 - accuracy) / 20)` = max 2 grade steps. This is deterministic capping, not probabilistic fat-tail distribution.

Example: CF scout (65% accuracy) gives maxDeviation = 1. A true B prospect can only be reported as B+, B, or B-. It can never be reported as C+ regardless of how unlucky.

JK asked for "element of probability so scout sometimes gets position super wrong." Current math doesn't allow this.

**JK must decide:** Keep capped model or implement fat-tail?

---

### Q-006 — Team Captain Feature
**Status: REFERENCED BUT NOT SPECCED**

PERSONALITY_SYSTEM_SPEC and OFFSEASON_SYSTEM_SPEC both list "team captain selection" as one of Charisma's effects. But there is no spec defining what team captain is, how it's determined, what it displays, or what its mechanical effects are. The designation is mentioned in exactly one table cell in two specs, then never elaborated on.

**JK must decide:** v1 scope? Is this the same as Cornerstone/Veteran Leader, or a distinct designation?

---

### Q-007 — Beat Reporter Pre-Decision Roster Move Warning
**Status: CONTEXT EXISTS BUT UI FLOW NOT SPECCED**

NARRATIVE_SYSTEM_SPEC has `callUpRecommendations: CallUpRecommendation[]` and `sendDownRecommendations: SendDownRecommendation[]` in the context object fed to the AI event generator. The data exists. But the specific mechanic — a pre-action pop-up interrupting the call-up/send-down flow with a reporter warning based on hidden relationship data — is not specced as a UI flow anywhere.

**JK must decide:** Is this a blocking pre-action modal or a passive sidebar? Always shown or conditional on relationship data being present?

---

## ITEMS CONFIRMED PARTIALLY — WATCH LIST

These are specced but have notable gaps worth flagging to JK.

| Item | Status | Gap |
|------|--------|-----|
| Retirement + personality interaction | SPECCED | Resilience modifier is listed as affecting retirement probability in the table but no formula shows how — only age drives the probability in calculateRetirementProbabilities(). Personality modifier not applied. |
| Prospect potentialRating vs overallRating | SPECCED | FARM_SYSTEM_SPEC has both fields. But no spec defines what potential actually does during the season — is it ever surfaced to the user mid-season, or only referenced in narrative? |
| TRAIT_INTEGRATION_SPEC TRAIT_CHEMISTRY_MAP | SPECCED | Incomplete — maps only ~20 traits to 4 (wrong) chemistry types. smb4_traits_reference has 60+ traits across 5 types. Even if the type names are intentional simplifications, the map is missing ~40 traits. |
| EOS ratings for called-up prospects | SPECCED | EOS_RATINGS_ADJUSTMENT_SPEC has no section for farm prospects who were called up mid-season. Do they qualify for EOS adjustments? What's the minimum games threshold? |
| Cornerstones accumulation | SPECCED | DYNAMIC_DESIGNATIONS_SPEC says "Multiple Cornerstones can exist on a team (one per qualifying season)" — but no cap. A team that's been playing 10 seasons could have 10 Cornerstones on their current roster. Is that intended? |

---

## SUMMARY DECISION COUNT

| Category | Count |
|----------|-------|
| New conflicts requiring JK decision | 3 (CONFLICT-003, 004, 005) |
| Open questions carried forward | 7 (Q-001 through Q-007) |
| Watch list items | 5 |
| Total items cleared / confirmed | 22 |
| **Total JK decisions needed** | **10** |

---

## RECOMMENDED DECISION ORDER

1. **CONFLICT-003 first** (Chemistry types) — it's the most architecturally fundamental and touches salary, traits, prospects, and any code that runs these systems. Everything built on Tough/Flashy is wrong if the answer is Competitive/Disciplined/Scholarly.
2. **CONFLICT-005** (Draft grade range vs Farm grade range) — resolves the draft pipeline before any code is built.
3. **Q-001** (Rookie salary model) — builds on CONFLICT-005 resolution.
4. **CONFLICT-004** (FA exchange rules) — two canonical specs, one answer needed.
5. **Q-002 through Q-007** — all important but none block each other.

---

*Last updated: 2026-02-21*
*Next action: Present to JK for decisions. After decisions, update affected specs before Phase A archive/mark step.*
