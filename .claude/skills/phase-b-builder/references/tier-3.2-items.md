# Tier 3.2: Offseason & Franchise Flows — 21 Items

Key specs: [see individual items]
Notes: [see AUTHORITY.md for Phase B decisions]

---
### CRIT-B7-001
- Severity: CRITICAL
- Spec: FINALIZE_ADVANCE_FIGMA_SPEC.md §Season Transition
- Code Location: FinalizeAdvanceFlow.tsx:366-377
- Spec Says: Spec: Season transition performs 8 real operations (archive data, increment ages, recalc salaries, reset mojo, clear stats, apply rookies, increment service, finalize)
- Code Says: Code: startSeasonTransition() is a TIMER SIMULATION — no actual data mutations, just step counter every 600ms. Only real effect: incrementing season number in localStorage
- Recommended Fix: Implement actual season transition operations

---
### CRIT-B7-002
- Severity: CRITICAL
- Spec: FINALIZE_ADVANCE_FIGMA_SPEC.md §AI Roster
- Code Location: FinalizeAdvanceFlow.tsx:352-364
- Spec Says: Spec: AI processes non-user team rosters with call-ups, send-downs, retirements
- Code Says: Code: aiProcessing() is TIMER SIMULATION with hardcoded display text — no AI logic generates actual roster transactions
- Recommended Fix: Implement AI roster management engine

---
### CRIT-B8-001
- Severity: CRITICAL
- Spec: SEASON_END_FIGMA_SPEC.md §Screens 2-3
- Code Location: N/A (missing)
- Spec Says: Spec: Postseason MVP 3-card flip reveal + confirmation with pWAR ranking, 3D card animation, rating +10 bonus
- Code Says: Code: ENTIRELY MISSING — no postseason MVP card reveal, no pWAR calculation, no rating bonus mechanism
- Recommended Fix: Implement Postseason MVP card reveal flow

---
### GAP-B11-001
- Severity: GAP
- Spec: STORIES_AWARDS_CEREMONY.md S-AWD001
- Code Location: AwardsCeremonyFlow.tsx:358-464
- Spec Says: League leaders auto-calculated from season stats with min qualifications, tie handling, leader rewards applied
- Code Says: LeagueLeadersScreen is entirely hardcoded mock data — no getAllBattingStats/getAllPitchingStats call, no min PA/IP check, rewards are display-only text not applied
- Recommended Fix: Wire to seasonStorage for real league leader calculation

---
### GAP-B11-002
- Severity: GAP
- Spec: STORIES_AWARDS_CEREMONY.md S-AWD002
- Code Location: AwardsCeremonyFlow.tsx:467-618
- Spec Says: Hybrid voting: calculate weighted scores, display top 3-5 candidates, scoring breakdown, "Other Player" opens search, selection calls addAward()
- Code Says: Candidates are hardcoded mock objects, "Other Player" button is non-functional, selection doesn't call addAward() — award is visual-only
- Recommended Fix: Implement candidate scoring from season WAR/clutch/stats + wire addAward() on selection

---
### GAP-B11-003
- Severity: GAP
- Spec: STORIES_AWARDS_CEREMONY.md S-AWD015
- Code Location: N/A (missing)
- Spec Says: Trait replacement flow when player with 2 traits earns new trait: show current traits, show new, options Replace/Replace/Decline
- Code Says: No trait replacement flow exists anywhere — Booger Glove has trait LOSS but not the general replacement modal
- Recommended Fix: Implement TraitReplacementModal per story UI wireframe

---
### GAP-B11-004
- Severity: GAP
- Spec: STORIES_AWARDS_CEREMONY.md S-AWD004
- Code Location: AwardsCeremonyFlow.tsx:685-767
- Spec Says: Booger Glove: auto-select lowest fWAR, if <2 traits → gain Butter Fingers, if 2 traits → lose one
- Code Says: Player hardcoded, only trait-loss path rendered (no <2 traits → Butter Fingers branch), auto-select logic absent
- Recommended Fix: Add <2 traits branch, wire auto-select from real fWAR data

---
### GAP-B11-005
- Severity: GAP
- Spec: STORIES_AWARDS_CEREMONY.md S-AWD006
- Code Location: AwardsCeremonyFlow.tsx:1440-1568
- Spec Says: MVP: show voting breakdown percentages, runner-up and 3rd get random trait, chemistry-weighted trait
- Code Says: Only winner gets trait roll, runner-up/3rd traits absent, voting percentages are hardcoded strings, no chemistry weighting
- Recommended Fix: Add runner-up/3rd trait awards, real voting calc

---
### GAP-B11-006
- Severity: GAP
- Spec: STORIES_DRAFT.md S-DRF013
- Code Location: DraftFlow.tsx:144-190
- Spec Says: Procedural draft class generation using round-based probability tables for grade distribution
- Code Says: Draft class is 20 hardcoded mock prospects — not procedurally generated, no probability tables
- Recommended Fix: Implement procedural generation with round-based grade probabilities per spec

---
### GAP-B11-007
- Severity: GAP
- Spec: STORIES_DRAFT.md S-DRF008
- Code Location: DraftFlow.tsx:262-274
- Spec Says: Pass/Skip only allowed when Farm roster full (≥10 players) AND drafted at least 1
- Code Says: Code only checks `draftedThisDraft < 1` — no Farm count check. Can pass with Farm at 3
- Recommended Fix: Add farmCount ≥ 10 check to handlePassPick

---
### GAP-B11-008
- Severity: GAP
- Spec: STORIES_DRAFT.md S-DRF009
- Code Location: N/A (missing)
- Spec Says: Full Farm Release Rule: when Farm=10, drafting requires releasing a player of same grade or worse
- Code Says: No release mechanism exists. Code at line 1347 says "can exceed 10". Farm over-flow is allowed without release
- Recommended Fix: Implement release modal per spec before confirming pick when farmCount ≥ 10

---
### GAP-B11-009
- Severity: GAP
- Spec: STORIES_FINALIZE_ADVANCE.md S-FA007
- Code Location: N/A (missing)
- Spec Says: Swap: combined call-up + send-down in one atomic action with combined impact summary
- Code Says: No swap functionality exists — user must do separate call-up and send-down
- Recommended Fix: Add Swap button and modal per spec

---
### GAP-B11-012
- Severity: GAP
- Spec: STORIES_FREE_AGENCY.md S-FA001
- Code Location: FreeAgencyFlow.tsx
- Spec Says: Spec defines direct FA signing: click FA card → contract modal → sign with cap space validation
- Code Says: No direct signing action exists. Flow is entirely dice-based (protection → dice → destination → exchange). No contract modal or cap space check
- Recommended Fix: Implement direct signing flow per S-FA001 or remove story if dice-only is intended [USER NOTE: Confirmed - builds supplemental signing screen per Figma spec, coexists with dice flow]

---
### GAP-B11-013
- Severity: GAP
- Spec: STORIES_FREE_AGENCY.md S-FA006
- Code Location: FreeAgencyFlow.tsx
- Spec Says: H2H record tracking: store head-to-head records between teams, use for COMPETITIVE personality rival calculation
- Code Says: No H2H storage or tracking system exists anywhere in codebase. COMPETITIVE hardcodes rival
- Recommended Fix: Implement H2H tracking in franchise storage; wire to findRival() for COMPETITIVE routing

---
### GAP-B11-014
- Severity: GAP
- Spec: STORIES_FREE_AGENCY.md S-FA008
- Code Location: FreeAgencyFlow.tsx:391-404
- Spec Says: Two-round flow with state persistence across sessions (resume interrupted FA)
- Code Says: Two rounds work in-session (currentRound 1→2) but no persistence — closing and reopening loses all FA progress
- Recommended Fix: Add FA round state to offseason persistence

---
### GAP-B11-015
- Severity: GAP
- Spec: STORIES_FREE_AGENCY.md S-FA009
- Code Location: FreeAgencyFlow.tsx:1283-1443
- Spec Says: Summary UI: team filter dropdown, net WAR/salary change per team, export/print
- Code Says: Summary shows moves grouped by round with personality icons but missing: team filter, net WAR/salary calculations, export/print functionality
- Recommended Fix: Add team filter, WAR/salary deltas, and export to FA summary

---
### MAJ-B6-012
- Severity: MAJOR
- Spec: FREE_AGENCY_FIGMA_SPEC.md §Drag Reorder
- Code Location: FreeAgencyFlow.tsx:691-706
- Spec Says: Spec: Drag-to-reorder dice assignment rows with drag handles (lines 236-253)
- Code Says: Code: UP/DOWN arrow buttons for swapping adjacent rows — functionally equivalent but different UX for iPad
- Recommended Fix: Consider implementing drag gesture for iPad-friendly UX

---
### MAJ-B7-009
- Severity: MAJOR
- Spec: FINALIZE_ADVANCE_FIGMA_SPEC.md §Transaction Report
- Code Location: FinalizeAdvanceFlow.tsx:816-833
- Spec Says: Spec: Report shows retirement count, user/AI breakdown, filter dropdowns
- Code Says: Code: Only shows Total/Call-Ups/Send-Downs — missing retirement count, user/AI split, and filter controls
- Recommended Fix: Add retirement rows, user/AI breakdown, filter dropdowns

---
### MAJ-B8-009
- Severity: MAJOR
- Spec: SEASON_SETUP_FIGMA_SPEC.md §Playoff Mode
- Code Location: N/A (missing)
- Spec Says: Spec: SS-F008/F009 Playoff Mode Entry + Seeding screens with drag-to-reorder, auto-seed
- Code Says: Code: Entire Playoff Mode entry flow missing — no seeding configuration UI
- Recommended Fix: Implement playoff mode entry and seeding screens

---
### MAJ-B8-011
- Severity: MAJOR
- Spec: SUBSTITUTION_FLOW_SPEC.md §Validation
- Code Location: substitution.ts, game.ts
- Spec Says: Spec: SUBSTITUTION_RULES constant, validateSubstitution with pitch count check, validateLineup with 9-position check
- Code Says: Code: SUBSTITUTION_RULES missing, validateSubstitution has different params, validateLineup missing entirely, validateDefensiveAlignment exists but ORPHANED (never called)
- Recommended Fix: Implement/wire validation functions

---

### CRIT-B8-002
- Severity: CRITICAL
- Spec: SEASON_END_FIGMA_SPEC.md §Season End Flow
- Code Location: Multiple files
- Spec Says: Spec: 7-screen sequential Season End flow (Standings→MVP→Championship→Mojo→Archive→Complete)
- Code Says: Code: NO dedicated Season End flow — responsibilities split across FranchiseHome standings tab, FinalizeAdvanceFlow (timer simulation), AwardsCeremonyFlow. Screens 4-6 collapsed into single processing animation
- Recommended Fix: Create unified SeasonEndFlow component

---

## Summary
Total items: 21
DUPLICATE: GAP-B11-010→CRIT-B7-001, GAP-B11-011→CRIT-B7-002, GAP-B12-004→GAP-B11-012
