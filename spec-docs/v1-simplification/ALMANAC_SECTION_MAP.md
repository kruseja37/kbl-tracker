# Section Map: ALMANAC.md

**Source:** ALMANAC.md
**Total lines:** 484
**Sections:** 10 (no Changelog)

| Section | Title | Lines | Count | Subsections | Ruling |
|---|---|---|---|---|---|
| FM | Front Matter | 1-11 | 11 | — | COPY |
| §1 | Overview & Purpose | 12-42 | 31 | 3 (§1.1-1.3) | SIMPLIFY (new features + defer dashboards) |
| §2 | Data Sources | 43-121 | 79 | 3 (§2.1-2.3) | SIMPLIFY (add franchise registry store + gap annotations) |
| §3 | Almanac Sections | 122-286 | 165 | 6 (§3.1-3.6) | SIMPLIFY (expand awards to 13, correct transaction types) |
| §4 | Cross-Season Query Interface | 287-336 | 50 | 3 (§4.1-4.3) | SIMPLIFY (add franchiseFilter + displayColumns + perf targets) |
| §5 | Career Player Profile | 337-398 | 62 | 3 (§5.1-5.3) | SIMPLIFY (mWAR label, franchise badge, disambiguation page) |
| §6 | Implementation Priority | 399-416 | 18 | 0 | SIMPLIFY (add Phase 0, expand Phase 7, empty state) |
| §7 | Franchise Isolation | 417-429 | 13 | 0 | SIMPLIFY (full rewrite — cross-franchise model) |
| §8 | V2 / Deferred Material | 430-444 | 15 | 0 | SIMPLIFY (update v2 list, move data export to v1) |
| §9 | Cross-References | 445-462 | 18 | 1 (Source Spec) | SIMPLIFY (correct Mode 2/3 refs + divergence note) |
| §10 | Decision Traceability | 463-484 | 22 | 2 (STEP4, Indirect) | SIMPLIFY (update C-086, add T-001) |

**Coverage:** 11 + 31 + 79 + 165 + 50 + 62 + 18 + 13 + 15 + 18 + 22 = 484 ✅

---

## SIMPLIFY Section Detail

### §1 SIMPLIFY (lines 12-42):
| Subsection | Title | Lines | Count |
|---|---|---|---|
| §1.1 | What the Almanac Is | 14-19 | 6 |
| §1.2 | Availability | 20-30 | 11 |
| §1.3 | Navigation | 31-42 | 12 |

**Ruling:** Add cross-franchise querying, franchise registry, custom views (Low+Medium tier). DEFER custom dashboards (High tier).

### §2 SIMPLIFY (lines 43-121):
| Subsection | Title | Lines | Count |
|---|---|---|---|
| §2.1 | Storage Architecture | 45-83 | 39 |
| §2.2 | Data Flow (Read-Only) | 84-105 | 22 |
| §2.3 | Pre-Aggregation Principle | 106-121 | 16 |

**Ruling:** Add 12th store (franchiseRegistry). Add v1 gap annotations to pre-aggregation table.

### §3 SIMPLIFY (lines 122-286):
| Subsection | Title | Lines | Count |
|---|---|---|---|
| §3.1 | All-Time Leaderboards | 124-175 | 52 |
| §3.2 | Season Records | 176-208 | 33 |
| §3.3 | Awards History | 209-226 | 18 |
| §3.4 | Hall of Fame Museum | 227-247 | 21 |
| §3.5 | Team History | 248-260 | 13 |
| §3.6 | Transaction History | 261-286 | 26 |

**Ruling:** §3.3 expand to 13 awards. §3.4 add empty-state placeholder. §3.6 correct to 8 transaction types (remove DFA).

### §4 SIMPLIFY (lines 287-336):
| Subsection | Title | Lines | Count |
|---|---|---|---|
| §4.1 | Query Model | 289-315 | 27 |
| §4.2 | Query Execution | 316-321 | 6 |
| §4.3 | Filtering Behavior | 322-336 | 15 |

**Ruling:** Add franchiseFilter + displayColumns to AlmanacQuery. Expand filter table. Add tiered performance targets.

### §5 SIMPLIFY (lines 337-398):
| Subsection | Title | Lines | Count |
|---|---|---|---|
| §5.1 | Profile Access | 339-342 | 4 |
| §5.2 | Profile Content | 343-384 | 42 |
| §5.3 | Season-by-Season View | 385-398 | 14 |

**Ruling:** Add mWAR display clarification, franchise badge, cross-franchise disambiguation page.

### §6 SIMPLIFY (lines 399-416):
**Ruling:** Add Phase 0 (cross-franchise infra). Expand Phase 7 (custom views). Add empty state note.

### §7 SIMPLIFY (lines 417-429):
**Ruling:** Full rewrite — 4 original isolation rules replaced with cross-franchise model + dual entry point behavior.

### §8 SIMPLIFY (lines 430-444):
**Ruling:** Move data export to v1. Update cross-franchise + custom query lines. Clarify v2 list.

### §9 SIMPLIFY (lines 445-462):
**Ruling:** Correct Mode 2 ref (§19→§17). Expand Mode 3 refs. Add cross-franchise divergence note.

### §10 SIMPLIFY (lines 463-484):
**Ruling:** Update C-086 row (trait history source-agnostic). Add T-001 row (cross-franchise query model).
