## Section Map: MODE_1_LEAGUE_BUILDER_FINAL.md
Total lines: 1823

### Front Matter
Lines 1-13 (title, metadata, STEP4 decisions, separator)

### Section Line Ranges

| Section | Title | Lines | Line Count | Subsections | Ruling |
|---|---|---|---|---|---|
| FM | Front Matter (title + metadata) | 1-13 | 13 | — | KEEP (skeleton) |
| §1 | Overview & Mode Definition | 14-60 | 47 | 5 (§1.1-1.5) | SIMPLIFY |
| §2 | Franchise Type Selection | 61-168 | 108 | 6 (§2.1-2.6) | SIMPLIFY |
| §3 | Leagues Module | 169-251 | 83 | 5 (§3.1-3.5) | KEEP |
| §4 | Teams Module | 252-320 | 69 | 4 (§4.1-4.4) | SIMPLIFY |
| §5 | Players Module | 321-686 | 366 | 9 (§5.1-5.9) | KEEP (w/ spec correction) |
| §6 | Personality & Traits — Initial Assignment | 687-761 | 75 | 5 (§6.1-6.5) | KEEP (w/ spec corrections) |
| §7 | Rosters Module | 762-825 | 64 | 4 (§7.1-7.4) | KEEP |
| §8 | Draft Module | 826-999 | 174 | 8 (§8.1-8.8) | KEEP (w/ spec gap flagged) |
| §9 | Rules Configuration | 1000-1167 | 168 | 3 (§9.1-9.3) | SIMPLIFY |
| §10 | Schedule Setup | 1168-1231 | 64 | 3 (§10.1-10.3) | SIMPLIFY |
| §11 | Franchise Creation Wizard | 1232-1391 | 160 | 7 (§11.1-11.6, 11.8-11.9) | SIMPLIFY |
| §12 | Franchise Handoff & Initialization | 1392-1553 | 162 | 3 (§12.1-12.3) | KEEP (w/ spec corrections) |
| §13 | Data Architecture | 1554-1743 | 190 | 7 (§13.1-13.7) | SIMPLIFY |
| §14 | V2 Material (Explicitly Out of Scope) | 1744-1762 | 19 | 0 | DEFER |
| §15 | Cross-References | 1763-1793 | 31 | 1 (+Source Specs Consumed) | KEEP (appendix) |
| §16 | Decision Traceability | 1794-1814 | 21 | 0 | KEEP (appendix) |
| CL | Changelog | 1815-1823 | 9 | — | KEEP (back matter) |

**Coverage check:** 1-13 + 14-60 + 61-168 + 169-251 + 252-320 + 321-686 + 687-761 + 762-825 + 826-999 + 1000-1167 + 1168-1231 + 1232-1391 + 1392-1553 + 1554-1743 + 1744-1762 + 1763-1793 + 1794-1814 + 1815-1823 = 1823 lines ✓ (no gaps, no overlaps)

### Ruling Summary
- **KEEP:** §3, §5, §6, §7, §8, §12, §15, §16 (8 sections) + FM + Changelog
- **SIMPLIFY:** §1, §2, §4, §9, §10, §11, §13 (7 sections — but §5, §6, §12 have KEEP w/ spec corrections requiring intra-section edits)
- **DEFER:** §14 (1 section)

---

### §1 SIMPLIFY Detail:
| Subsection | Title | Lines | Line Count |
|---|---|---|---|
| §1.1 | What Mode 1 Is | 16-21 | 6 |
| §1.2 | What Mode 1 Produces | 22-35 | 14 |
| §1.3 | What Mode 1 Does NOT Do | 36-42 | 7 |
| §1.4 | Entry Points | 43-50 | 8 |
| §1.5 | Key Principles | 51-60 | 10 |

**Ruling:** KEEP §1.1, §1.2, §1.3, §1.5 AS-IS. SIMPLIFY §1.4 — defer "Playoff Mode" row from entry points table.

---

### §2 SIMPLIFY Detail:
| Subsection | Title | Lines | Line Count |
|---|---|---|---|
| §2.1 | The Three Franchise Types | 63-72 | 10 |
| §2.2 | The `controlledBy` Flag | 73-101 | 29 |
| §2.3 | Franchise Type Configuration | 102-112 | 11 |
| §2.4 | Presets | 113-120 | 8 |
| §2.5 | Offseason Phase Scope Defaults | 121-154 | 34 |
| §2.6 | What Franchise Type Does NOT Change | 155-168 | 14 |

**Ruling:** KEEP §2.1, §2.2, §2.6 AS-IS. SIMPLIFY §2.3 — remove `aiScoreEntry` field. SIMPLIFY §2.4 — remove AI score entry references. SIMPLIFY §2.5 — replace 13-row per-phase table with global toggle; drop OffseasonPhaseConfig interface.

---

### §4 SIMPLIFY Detail:
| Subsection | Title | Lines | Line Count |
|---|---|---|---|
| §4.1 | Purpose | 254-257 | 4 |
| §4.2 | Features | 258-268 | 11 |
| §4.3 | Team Data Model | 269-303 | 35 |
| §4.4 | Team CSV Import | 304-320 | 17 |

**Ruling:** KEEP §4.1, §4.2, §4.4 AS-IS. SIMPLIFY §4.3 — remove 3 metadata fields (foundedYear, championships, retiredNumbers).

---

### §9 SIMPLIFY Detail:
| Subsection | Title | Lines | Line Count |
|---|---|---|---|
| §9.1 | Purpose | 1002-1005 | 4 |
| §9.2 | Rules Preset Structure | 1006-1114 | 109 |
| §9.3 | Default Presets | 1115-1167 | 53 |

**Ruling:** KEEP §9.1 AS-IS. SIMPLIFY §9.2 — remove `ai` config group (6 sliders), remove `pitchCounts` and `moundVisits` from `game` group. DEFER §9.3 ENTIRELY — remove all 4 built-in presets + preset selection concept.

---

### §10 SIMPLIFY Detail:
| Subsection | Title | Lines | Line Count |
|---|---|---|---|
| §10.1 | Schedule Model | 1170-1213 | 44 |
| §10.2 | User Editing | 1214-1221 | 8 |
| §10.3 | Franchise Type Impact on Schedule | 1222-1231 | 10 |

**Ruling:** SIMPLIFY §10.1 — remove Screenshot/OCR content, strip SIMULATED from GameStatus enum. KEEP §10.2, §10.3 AS-IS.

---

### §11 SIMPLIFY Detail:
| Subsection | Title | Lines | Line Count |
|---|---|---|---|
| §11.1 | Overview | 1234-1245 | 12 |
| §11.2 | Step 1: Select League | 1246-1261 | 16 |
| §11.3 | Step 2: Season Settings | 1262-1279 | 18 |
| §11.4 | Step 3: Playoff Settings | 1280-1294 | 15 |
| §11.5 | Step 4: Franchise Type & Team Control | 1295-1326 | 32 |
| §11.6 | Step 5: Rosters, Salary & Draft | 1327-1368 | 42 |
| §11.8 | Playoff Mode (Abbreviated Flow) | 1369-1382 | 14 |
| §11.9 | Navigation Rules | 1383-1391 | 9 |

**Ruling:** KEEP §11.1, §11.4, §11.6, §11.9 AS-IS. SIMPLIFY §11.2 — remove `defaultRulesPreset` from Step1Data. SIMPLIFY §11.3 — strip preset references. SIMPLIFY §11.5 — remove `aiScoreEntry`, replace offseasonPhaseScopes. DEFER §11.8 ENTIRELY — Playoff Mode wizard.

---

### §13 SIMPLIFY Detail:
| Subsection | Title | Lines | Line Count |
|---|---|---|---|
| §13.1 | Global vs Franchise Data | 1556-1610 | 55 |
| §13.2 | Storage Strategy: Separate IndexedDB Per Franchise | 1611-1652 | 42 |
| §13.3 | Storage Estimates | 1653-1671 | 19 |
| §13.4 | Franchise Management | 1672-1699 | 28 |
| §13.5 | App Startup Flow | 1700-1725 | 26 |
| §13.6 | Franchise Switching | 1726-1733 | 8 |
| §13.7 | Legacy Data Migration | 1734-1743 | 10 |

**Ruling:** KEEP §13.1, §13.3, §13.4, §13.5, §13.6 AS-IS. SIMPLIFY §13.2 — remove `rulesPresets` store reference. DEFER §13.7 ENTIRELY — legacy data migration.
