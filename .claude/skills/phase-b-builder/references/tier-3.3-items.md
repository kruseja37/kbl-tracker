# Tier 3.3: League Builder & Setup — 3 Items

Key specs: [see individual items]
Notes: [see AUTHORITY.md for Phase B decisions]

---
### CRIT-B7-003
- Severity: CRITICAL
- Spec: LEAGUE_BUILDER_FIGMA_SPEC.md §Rules Editor
- Code Location: LeagueBuilderRules.tsx:9
- Spec Says: Spec: 8 Rules Editor tabs (Game, Season, Playoffs, DH, Roster, Econ, Dev, AI)
- Code Says: Code: Only 3 tabs (game, season, playoffs) — 5 tabs entirely missing (DH, Roster, Econ, Dev, AI)
- Recommended Fix: Implement missing 5 Rules Editor tabs

---
### CRIT-B7-004
- Severity: CRITICAL
- Spec: LEAGUE_BUILDER_FIGMA_SPEC.md §League Editor
- Code Location: LeagueBuilderLeagues.tsx:328-472
- Spec Says: Spec: 5-step creation wizard (Name→Teams→Structure→Rules→Review) with Back/Next
- Code Says: Code: Single flat modal with all fields at once. No step indicator, no wizard navigation
- Recommended Fix: Redesign as 5-step wizard or update spec

---
### NEW-003
- Severity: MINOR
- Spec: League Builder Rules
- Code Location: LeagueBuilderRules.tsx
- Spec Says: Pitch Counts and Mound Visits should not be in Rules tabs
- Code Says: Pitch Counts and Mound Visits currently appear in Rules configuration
- Recommended Fix: Remove Pitch Counts and Mound Visits from Rules in League Builder

---
## Summary
Total items: 3
