# KBL Scouting System Specification

**Version**: 2.0 (per-tool confidence bands + scout draft — see §1A; v1 overall-grade model in §2-§4 SUPERSEDED)
**Status**: v2 RULED 2026-06-22 (design); build = S-series in §1A.4
**Last Updated**: 2026-06-22

---

## 1. Overview

The scouting system governs how farm and draft prospects are evaluated before they reach the MLB roster. Prospects have hidden true ratings that are only revealed upon call-up. Before that, users see scouted grades with varying accuracy depending on the scout and position.

> **Key Insight**: This creates meaningful uncertainty in roster decisions. A "B" prospect might be an A- player or a C+ player — you won't know until you call them up.

---

## 1A. SCOUTING v2 — per-tool confidence bands + scout draft (AUTHORITATIVE; RULED JK 2026-06-22)

> ⚠ **SUPERSEDES the v1 overall-grade model:** this section replaces §2.1, §3 (overall-grade Gaussian fuzz), §4.1-4.2, `IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC §7.4` (single IV-range width), and `AUCTION_DRAFT_SPEC_V2 §3.1/§3.4` (single scouted letter + one 20-80). Those describe a single OVERALL-grade fuzz; v2 is PER-TOOL bands + a derived overall. **Build must REPLACE, not add alongside** — retire the old `scoutProspect` Gaussian overall-grade jitter, the single IV-range-width, and the 20-80-off-the-scouted-letter, so no dead/old-model code leaks or is half-used (JK directive). See the build tasks + cleanup at the end of this section.

**The idea:** a scout reveals a prospect's identity accurately but estimates his skill as **confidence bands** — wide or narrow depending on whether the scout specializes in that prospect's position — with the true value placed **uniformly at random inside each band** so a GM can't learn "it's always the midpoint/top/bottom."

### 1A.1 Revealed ACCURATELY (no estimation)
Name · age · **primary + secondary position** · **archetype** (the §5.6 generation family — Slugger, Speedster, Defensive-Wizard, …). Archetype gives the GM the *shape* of the skillset; the bands give the *magnitude*. (Requires the B12 archetype layer to PERSIST the chosen family on the prospect so it can be revealed — couples scouting ↔ B12. Secondary position + age already generated; age also needs B8.)

### 1A.2 Estimated as CONFIDENCE BANDS (two scales)
- **OVERALL grade → a LETTER-GRADE band** on the grade ladder, width by the scout's confidence tier for the prospect's PRIMARY position: **HIGH = 3 grade-bands** (e.g. A→B+), **MEDIUM = 5** (A→B−), **LOW = 7** (A→C). The true overall grade (`scoreSmb4Player` of the true profile) sits **uniform-random** inside the band, clamped to the ladder ends.
- **Each TOOL → a 0–99 NUMERIC band in groups of 10**, width by the same tier: **HIGH = 30 pts**, **MEDIUM = 50 pts**, **LOW = 70 pts**. Tools: 5 for hitters (POW/CON/SPD/FLD/ARM); **7 for pitchers (VEL/JNK/ACC + POW/CON/SPD/FLD — no arm)**. The true tool value sits **uniform-random** inside the band.
- **Uniform-in-band placement (un-gameable):** band `[L, L+W]` with `L` drawn uniformly from `[max(0, true−W), min(true, 99−W)]` — guarantees the band contains the true value, stays in [0,99], and the true value's offset is uniform (NOT always centered/top/bottom). Near the 0/99 extremes the feasible offset narrows (unavoidable, acceptable). Same logic on the grade ladder for the overall band. Deterministic (seeded per scout×prospect).
- **DERIVED overall + auction price:** the overall grade band drives the auction PRICE RANGE (reuse `scoutPriceOpinion`/20-80, now off the BANDED overall, never the true `scoreSmb4Player` numeric). So the auction keeps its value anchor.

### 1A.3 The scout + the SCOUT DRAFT
- **ONE scout per team** (not 2). Each scout has **exactly 2 specialty positions → HIGH confidence**, **2 blind-spot positions → LOW confidence**, and **every other position → MEDIUM confidence** (the fixed tiering replaces the free-form ±18 specialty/weakness lists). Confidence for a given prospect = the scout's tier for that prospect's **primary position**, applied to all his tool bands + the overall band.
- **SCOUT DRAFT (new phase):** before the MLB player draft, each team drafts **one** scout from a pool of **3× the number of teams** — enough that a team can find a scout matching an anticipated need. Basic UI TBD.
- **The strategic risk (the fun):** scouts are committed *before* the MLB draft (and well before the farm draft). If a GM's roster strategy strays from his scout's two specialties, the scout is less useful at farm-draft time — a real pre-commitment gamble.
- **One scout/team ⇒ no triangulation:** a single read per prospect, so the band widths hold exactly and stay un-gameable (no intersecting multiple reports toward truth).

### 1A.4 Build tasks (S-series) + supersede/cleanup
- **S1** SCOUT DRAFT phase: 1 scout/team from a 3×-teams pool, before the MLB draft (basic UI). (Scout-hiring persistence reuses `LeagueBuilderScoutProfile`; change `STARTUP_SCOUTS_PER_TEAM` 2→1 + add the draft.)
- **S2** Fixed specialty structure: exactly 2 HIGH / 2 LOW positions + MEDIUM default (replace free-form `specialties[]`/`weaknesses[]`; the `accuracyByPosition` map becomes a 3-tier map). No DH (position removed).
- **S3** Per-tool band engine: 0–99 bands 30/50/70 by tier, uniform-in-band (clamp [0,99]), 10-pt groups, deterministic. Per-tool, not overall.
- **S4** Overall grade band: 3/5/7 letter-steps by tier, uniform-in-band, + derive the auction price range from the banded overall.
- **S5** Reveal archetype (persist via B12) + secondary position + age into the visible report.
- **S6** Draft-board UI: per-tool 0–99 bands + overall grade band; **default-covered / long-press-to-reveal** scout report (JK ruling 2026-06-20, never built).
- **S7 ⚠ SUPERSEDE + DEAD-CODE CLEANUP:** retire the old `scoutProspect` Gaussian overall-grade jitter, the single IV-range width (`IV §7.4`), and the 20-80-off-scouted-letter; re-derive everything from the v2 bands. Mark `SCOUTING_SYSTEM_SPEC §2.1/§3/§4`, `IV §7.4`, `AUCTION_DRAFT_SPEC_V2 §3.1/§3.4` superseded. Breaking schema change (overall→per-tool) across `prospectScoutingDraftEngine.ts`, `leagueBuilderStartupFarmDraft.ts`, `franchiseStartupProspectDraft.ts`, the draft UIs, and tests — audit each for old-model leakage.

**Reusable scaffolding (audit `wzhrggi4m`):** the scout entity + `accuracyByPosition` map, `scoutAccuracy`/`specialtyMatches`, seeded RNG (`hashString`/`randomUnit`/`normal`/`pick`), the `GRADES` ladder + `adjustGrade`/`gradeDistance`, the `PlayerArchetype` type (12 labels), the call-up reveal ceremony + leak-discipline, generated `secondaryPosition`.

---

## 2. Rating Visibility

> ⚠ **SUPERSEDED by §1A** (v2 per-tool bands). Retained for history only.

### 2.1 Farm Prospects (Pre-Call-Up)

| Data Point | Visible? | Notes |
|-----------|----------|-------|
| Scouted Grade (A+, A, B+, B, B-, C+, C, C-, D) | ✅ Yes | Scout's estimate |
| Position | ✅ Yes | Known |
| Chemistry Type | ✅ Yes | Visible in SMB4 |
| Traits | ✅ Yes | Visible in SMB4 |
| Personality (visible type) | ✅ Yes | 1 of 7 types |
| Personality (hidden modifiers) | ❌ No | Never shown as numbers |
| True numeric ratings | ❌ No | Hidden until call-up |

### 2.2 After Call-Up

All true numeric ratings (Power, Contact, Speed, Arm, Fielding, Velocity, etc.) are revealed immediately upon promotion to the MLB roster.

```typescript
function callUpProspect(prospect: FarmPlayer): MLBPlayer {
  prospect.ratingsRevealed = true;
  prospect.level = 'MLB';
  // True ratings may differ significantly from scouted grade
  return prospect;
}
```

---

## 3. Scout Accuracy

> ⚠ **SUPERSEDED by §1A** — the single overall-grade Gaussian fuzz (`σ=(100−accuracy)/22`, ±4 letter steps) is replaced by per-tool 0–99 bands + an overall letter-grade band, with a fixed 2-high/2-low/medium specialty tiering. The per-position `accuracyByPosition` substrate is reused; this §3 math is retired.

### 3.1 Accuracy by Position

Scouts are better at evaluating some positions than others:

```typescript
const SCOUT_ACCURACY_BY_POSITION: Record<string, number> = {
  // Higher = more accurate (0-100 scale)
  'SP': 75,    // Starters: fairly predictable
  'RP': 65,    // Relievers: smaller sample
  'CP': 60,    // Closers: high variance role
  'C':  70,    // Catchers: defensive tools visible
  '1B': 80,    // First base: power/contact clear
  '2B': 70,    // Second base: moderate
  'SS': 65,    // Shortstop: range hard to evaluate
  '3B': 75,    // Third base: arm/power visible
  'LF': 70,    // Left field: moderate
  'CF': 65,    // Center field: speed/range uncertain
  'RF': 70,    // Right field: arm visible
  'DH': 85,    // DH: only batting to evaluate
};
```

### 3.2 Grade Deviation

When generating a prospect's scouted grade, the true grade is modified by a fat-tail random deviation scaled by scout accuracy. Small misses are most common; large misses are rare but possible.

```typescript
/**
 * Fat-tail scout deviation model.
 *
 * σ is derived from position inaccuracy. Most reports land within ±1 step.
 * Rare outliers can deviate ±3 or ±4 steps — a true B might look like a C-,
 * or a C+ might look like an A-.
 *
 * Implementation:
 *   1. Draw a standard normal Z (Box-Muller or equivalent).
 *   2. Scale by σ = (100 - accuracy) / 22.
 *      - DH (accuracy 85): σ ≈ 0.68  → almost always within ±1 step
 *      - 1B (accuracy 80): σ ≈ 0.91  → usually ±1 step, rare ±2
 *      - CF (accuracy 65): σ ≈ 1.59  → often ±1-2 steps, occasional ±3
 *      - CP (accuracy 60): σ ≈ 1.82  → widest spread, rare ±4 possible
 *   3. Round to nearest integer for grade steps.
 *   4. Hard cap at ±4 steps to prevent impossible grades.
 */
function generateScoutedGrade(trueGrade: Grade, position: string): Grade {
  const accuracy = SCOUT_ACCURACY_BY_POSITION[position] || 70;
  const sigma = (100 - accuracy) / 22;

  // Box-Muller normal sample
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  // Scale, round, and hard-cap
  const rawDeviation = z * sigma;
  const deviation = Math.max(-4, Math.min(4, Math.round(rawDeviation)));

  return adjustGrade(trueGrade, deviation);
}
```

**Expected deviation distribution by position (approximate):**

| Position | Accuracy | σ | ±0 steps | ±1 step | ±2 steps | ±3+ steps |
|----------|----------|---|----------|---------|---------|----------|
| DH | 85 | 0.68 | ~50% | ~40% | ~9% | ~1% |
| 1B | 80 | 0.91 | ~42% | ~44% | ~12% | ~2% |
| SP, 3B | 75 | 1.14 | ~35% | ~46% | ~15% | ~4% |
| C, 2B, LF, RF | 70 | 1.36 | ~29% | ~46% | ~19% | ~6% |
| SS, CF, RP | 65 | 1.59 | ~24% | ~46% | ~22% | ~8% |
| CP | 60 | 1.82 | ~21% | ~44% | ~24% | ~11% |

> **Note**: The ±4 hard cap prevents impossible grades (e.g., a D prospect cannot be reported as A+). The `adjustGrade()` function also clamps to the valid grade range (D to A).

**Example:**
```
True grade B, position CF (σ = 1.59)
z = -1.8 → deviation = -2 → scouted grade C+
(A two-step miss — scout significantly underestimated this player)

True grade C+, position CF (σ = 1.59)
z = 2.1 → deviation = +2 → scouted grade A-
(Scout was wildly optimistic about a C+ player — rare but possible)
```

---

## 4. Draft Prospect Scouting

### 4.1 Pre-Draft Information

Before the draft, users see:
- Scouted grade (with position-based accuracy)
- Position
- Chemistry type
- Personality (visible type only)
- Traits (if any — ~30% of prospects have 0)

### 4.2 Post-Draft, Pre-Call-Up

Same visibility as farm prospects. True ratings still hidden.

### 4.3 Call-Up Reveal Ceremony

When a prospect is called up, a reveal animation shows the true ratings compared to the scouted grade:

```
╔══════════════════════════════════════════════════════════════╗
║              PROSPECT REVEAL: Jake Morrison (CF)             ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Scouted Grade: B-                                           ║
║  TRUE Grade: B+ ⬆️                                           ║
║                                                               ║
║  "Your scout underestimated this kid's range!"               ║
║                                                               ║
║  ┌──────────────────────────────────────────────────────────┐║
║  │ Power:    62  │ Contact:  78  │ Speed:   85              │║
║  │ Arm:      71  │ Fielding: 80  │ Clutch:  55              │║
║  └──────────────────────────────────────────────────────────┘║
╚══════════════════════════════════════════════════════════════╝
```

---

## 5. Cross-References

| Spec | Relevance |
|------|-----------|
| FARM_SYSTEM_SPEC.md | Farm roster management, call-up/send-down rules |
| PROSPECT_GENERATION_SPEC.md | How prospects are generated for drafts |
| DRAFT_FIGMA_SPEC.md | Draft UI with scouted grades |
| EOS_RATINGS_ADJUSTMENT_SPEC.md | Trait assignment for new players |

---

*Last Updated: February 20, 2026*
