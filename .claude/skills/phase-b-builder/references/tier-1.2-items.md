# Tier 1.2: Franchise Mode Infrastructure — 9 Items

---

### GAP-B5-001
- Severity: MAJOR
- Spec: FRANCHISE_MODE_SPEC.md §4
- Code Location: New franchiseManager.ts
- Spec Says: FranchiseManager API: createFranchise, loadFranchise, deleteFranchise, renameFranchise, listFranchises, exportFranchise, importFranchise, getActiveFranchise, setActiveFranchise
- Code Says: (Not implemented)
- Recommended Fix: PLANNING SPEC — No FranchiseManager implementation. franchiseStorage.ts is a stub (all functions return null)

---

### GAP-B5-002
- Severity: MAJOR
- Spec: FRANCHISE_MODE_SPEC.md §2.2
- Code Location: Storage architecture
- Spec Says: Separate IndexedDB per franchise: kbl-franchise-{id}/ with independent stores per franchise + kbl-app-meta/ for shared data
- Code Says: (Not implemented)
- Recommended Fix: Single DB used for entire app. No per-franchise isolation. No kbl-app-meta DB

---

### GAP-B5-003
- Severity: MAJOR
- Spec: FRANCHISE_MODE_SPEC.md §6.2
- Code Location: App navigation
- Spec Says: Franchise switching: close DB, clear state, open new DB, integrity check, load state
- Code Says: (Not implemented)
- Recommended Fix: No franchise switching mechanism. FranchiseHome is a page within single app context

---

### GAP-B5-004
- Severity: MAJOR
- Spec: FRANCHISE_MODE_SPEC.md §7
- Code Location: Migration logic
- Spec Says: Migration: detect legacy data, create "Default Franchise", auto-migrate, schema version per franchise
- Code Says: (Not implemented)
- Recommended Fix: No migration path. No schema versioning per franchise

---

### GAP-B5-005
- Severity: MAJOR
- Spec: FRANCHISE_MODE_SPEC.md §4.1
- Code Location: franchiseManager.ts
- Spec Says: Export/Import: exportFranchise() → Blob, importFranchise(Blob) → FranchiseId
- Code Says: (Not implemented)
- Recommended Fix: No export/import functionality

---

### GAP-B5-006
- Severity: MAJOR
- Spec: FRANCHISE_MODE_SPEC.md §5
- Code Location: New FranchiseSelector page
- Spec Says: Franchise Selector UI: startup screen with franchise cards (name, season count, storage, last played), New Franchise button, actions menu (Continue/Rename/Export/Delete)
- Code Says: (Not implemented)
- Recommended Fix: No franchise selector. App opens directly to navigation

---

### GAP-B5-007
- Severity: MAJOR
- Spec: FRANCHISE_MODE_SPEC.md §5.3
- Code Location: GameTracker header
- Spec Says: In-game franchise indicator: small header showing active franchise name
- Code Says: (Not implemented)
- Recommended Fix: No franchise name indicator in game UI

---

### GAP-B5-008
- Severity: MAJOR
- Spec: FRANCHISE_MODE_SPEC.md §3
- Code Location: franchiseManager.ts
- Spec Says: Storage monitoring: show usage per franchise, track storageUsedBytes in FranchiseSummary
- Code Says: (Not implemented)
- Recommended Fix: No storage usage tracking per franchise

---

### MAJ-B5-014
- Severity: MAJOR
- Spec: OFFSEASON_SYSTEM_SPEC.md §2
- Code Location: offseasonStorage.ts vs useOffseasonPhase.ts
- Spec Says: Spec: 11 phases in strict order, according to figma spec
- Code Says: Code: TWO conflicting phase systems — offseasonStorage.ts has 10 string-enum phases, useOffseasonPhase.ts has 10 numbered phases with different phase lists (splits FA into 3 sub-phases, omits Contraction/Expansion and Chemistry Rebalancing)
- Recommended Fix: Consolidate into single phase system matching spec's 11 phases

---
## Summary
Total items: 9
SKIP: None
DUPLICATE: None