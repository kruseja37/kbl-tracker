# Tier 4: Polish & Integration — 2 Items

This tier catches everything not assigned to Tiers 1-3.
Key specs: various
Notes from AUTHORITY.md: Maddux threshold weighted by innings/game (MIS-B14-001)

---

### MIS-B14-001
- Severity: MISMATCH
- Spec: smb_maddux_analysis.md
- Code Location: src/engines/detectionEngine.ts (Maddux check)
- Spec Says: Maddux threshold: 85 pitches for complete game shutout in 9-inning game, weighted for less innings per league builder rules
- Code Says: Code uses 100 pitches as Maddux threshold
- Recommended Fix: update spec and code to weight for number of innings/game in league builder setup

---

### NEW-002
- Severity: MAJOR
- Spec: Franchise Mode
- Code Location: FranchiseHome or GameTracker entry
- Spec Says: Franchise mode needs pre-game lineup screen like Exhibition to choose starting pitcher and reorder lineup before game starts
- Code Says: Franchise mode launches GameTracker directly without lineup configuration
- Recommended Fix: Add pre-game lineup screen to franchise mode game launch flow (match Exhibition mode pattern)

---
