# Tier 3.1: Draft & Prospect Generation — 4 Items

Key specs: [see individual items]
Notes: [see AUTHORITY.md for Phase B decisions]

---
### MAJ-B6-011
- Severity: MAJOR
- Spec: FREE_AGENCY_FIGMA_SPEC.md §Signing Screen
- Code Location: FreeAgencyFlow.tsx
- Spec Says: Spec: Free Agent Pool/Signing Screen with contract details, team selector, payroll warning (lines 662-722)
- Code Says: Code: Entire supplemental signing screen NOT implemented
- Recommended Fix: Implement free agent pool browsing and signing screen

---
### NEW-001
- Severity: MAJOR
- Spec: League Builder
- Code Location: LeagueBuilderRosters.tsx
- Spec Says: SP/RP should be classified as pitchers (starters/relievers) not position players in roster setups
- Code Says: SP/RP treated same as position players in roster setup
- Recommended Fix: Reclassify SP/RP as pitcher category in roster management

---
### CRIT-B6-004
- Severity: CRITICAL
- Spec: CONTRACTION_EXPANSION_FIGMA_SPEC.md §Screens 6-11
- Code Location: ContractionExpansionFlow.tsx:1006-1274
- Spec Says: Spec: 5 detailed screens (Expansion Draft, Scorned Effects, Player Disposal, Team Creation Wizard, Expansion Team Draft)
- Code Says: Code: ALL 5 screens are PLACEHOLDER text only ("Full draft simulation coming in next phase", "Retirement checks complete", etc.)
- Recommended Fix: Implement all 5 placeholder screens

---
### CRIT-B6-005
- Severity: CRITICAL
- Spec: DRAFT_FIGMA_SPEC.md §Farm Model
- Code Location: DraftFlow.tsx:72
- Spec Says: Spec: Farm max=10, release modal option triggered when full in order to draft or trade or sign another player (lines 424-495)
- Code Says: Code: Farm "can exceed 10" (line 72, 1347). No release mechanism. Fundamentally different roster model — Screen 6 (Release Player Modal) entirely absent
- Recommended Fix: Decide: adopt spec's 10-cap model and implement release modal, fix code to match new spec

---
## Summary
Total items: 4
