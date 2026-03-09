# KBL Tracker: Player Grade Algorithm Analysis

**Generated**: 2026-02-25  
**Source**: `spec-docs/data/all_players_combined.csv` (636 players, 28 teams)  
**Algorithm**: `src/engines/gradeEngine.ts` (437 lines)

---

## 1. Executive Summary

The player database contains **616 valid player records** across **28 teams** (20 SMB4 fantasy teams + 8 MLB-based teams). Players are split into **543 batters** and **73 pitchers** (SP/RP/CP/SP-RP/Pow/Two Way).

**Critical finding**: The CSV-assigned grades diverge significantly from the gradeEngine's weighted-rating formula. Only **19.1% of batters** have a CSV grade that matches what the algorithm would produce. This means **grades in the database are manually/holistically assigned**, not purely computed from the 3:3:2:1:1 formula. The `gradeWeight` field is the authoritative grade encoding (0.5=S, 0.6=A+, ... 1.5=D+).

---

## 2. The Grade Algorithm (gradeEngine.ts)

### 2.1 Position Player Formula

Weighted rating = `power × 0.30 + contact × 0.30 + speed × 0.20 + fielding × 0.10 + arm × 0.10`

The **3:3:2:1:1 ratio** heavily prioritizes offensive tools (power + contact = 60% of score) with speed as the secondary tool (20%) and defense as a tiebreaker (fielding + arm = 20%).

### 2.2 Pitcher Formula

Weighted rating = `velocity × 0.333 + junk × 0.333 + accuracy × 0.333`

Equal weights across all three pitching tools.

### 2.3 Two-Way Player Premium

Combined rating = `(posWeighted + pitchWeighted) × 1.25 / 2`

A 25% bonus for versatility, normalized to single-player scale.

### 2.4 Grade Thresholds (Data-Driven from 261-Player Analysis)

| Grade | Min Weighted | Description |
|-------|-------------|-------------|
| S | 80 | Generational talent |
| A+ | 78 | MVP-caliber |
| A | 73 | All-Star |
| A- | 66 | Above-average starter |
| B+ | 58 | Solid starter |
| B | 55 | Average MLB player |
| B- | 48 | Below-average / good bench |
| C+ | 45 | Organizational depth |
| C | 38 | Marginal |
| C- | 35 | Replacement level |
| D+ | 30 | Below replacement |
| D | 0 | Lowest tier |

### 2.5 gradeWeight Field Mapping

The `gradeWeight` column in the CSV maps directly to grades:

| gradeWeight | Grade |
|-------------|-------|
| 0.5 | S |
| 0.6 | A+ |
| 0.7 | A |
| 0.8 | A- |
| 0.9 | B+ |
| 1.0 | B |
| 1.1 | B- |
| 1.2 | C+ |
| 1.3 | C |
| 1.4 | C- |
| 1.5 | D+ / D |

---

## 3. Grade Distribution Across the Database

| Grade | Batters | Pitchers | Total | % of DB |
|-------|---------|----------|-------|---------|
| S | 7 | 1 | 8 | 1.3% |
| A+ | 11 | 0 | 11 | 1.8% |
| A | 19 | 1 | 20 | 3.2% |
| A- | 45 | 2 | 47 | 7.6% |
| B+ | 83 | 7 | 90 | 14.6% |
| B | 94 | 9 | 103 | 16.7% |
| B- | 106 | 18 | 124 | 20.1% |
| C+ | 112 | 22 | 134 | 21.8% |
| C | 45 | 7 | 52 | 8.4% |
| C- | 14 | 5 | 19 | 3.1% |
| D+ | 5 | 1 | 6 | 1.0% |
| D | 2 | 0 | 2 | 0.3% |

The distribution is **bell-curve shaped** centered at B-/C+ (42% of all players), which mirrors real baseball talent distribution where most players cluster around league average.

---

## 4. CSV Grade vs Algorithm Grade — The 81% Mismatch

### 4.1 The Core Discrepancy

Of 440 batters with non-zero ratings, only **84 (19.1%) have CSV grades that match** what the weighted-rating formula would assign. The mismatches break down as:

- **231 players** have CSV grades LOWER than the algorithm would give (manually downgraded)
- **125 players** have CSV grades HIGHER than the algorithm would give (manually boosted)

### 4.2 What This Means

The CSV grades are **holistic assessments** that factor in things the pure weighted formula ignores: traits, defensive position value, intangibles, and game-specific context. The gradeEngine formula is used for **new prospect generation and recalculation**, not for the original SMB4 roster.

### 4.3 Weighted Rating Ranges by CSV Grade (Actual Data)

| Grade | # Players | Min W | Max W | Avg W | Median W | Algorithm Threshold |
|-------|-----------|-------|-------|-------|----------|-------------------|
| S | 7 | 57.7 | 83.8 | 67.4 | 61.1 | 80 |
| A+ | 11 | 51.0 | 83.9 | 67.4 | 62.7 | 78 |
| A | 18 | 50.8 | 81.0 | 67.2 | 69.2 | 73 |
| A- | 43 | 42.0 | 76.5 | 63.4 | 66.0 | 66 |
| B+ | 77 | 30.1 | 73.2 | 58.3 | 62.4 | 58 |
| B | 80 | 30.4 | 79.0 | 59.5 | 61.3 | 55 |
| B- | 83 | 31.1 | 68.2 | 53.2 | 55.5 | 48 |
| C+ | 67 | 27.5 | 77.3 | 50.2 | 51.7 | 45 |
| C | 34 | 30.0 | 60.3 | 46.2 | 47.4 | 38 |
| C- | 13 | 24.7 | 63.2 | 42.3 | 40.4 | 35 |
| D+ | 5 | 24.0 | 39.8 | 34.0 | 35.9 | 30 |
| D | 2 | 32.0 | 34.2 | 33.1 | 34.2 | 0 |

**Key observation**: The median weighted ratings are fairly close to thresholds at middle tiers (B+ through C) but diverge sharply at the extremes. S-grade players average only 67.4 weighted (threshold: 80), meaning the highest-graded players are valued for defensive excellence and tools that the offensive-heavy formula underweights.

### 4.4 Notable Mismatch Examples

**Biggest Manual Boosts** (CSV grade much higher than formula):

| Player | CSV | Calc | Weighted | Profile | Likely Reason |
|--------|-----|------|----------|---------|---------------|
| Kay Frequin | S | B | 57.7 | Low pow/con, elite speed (99), elite defense (84/97) | Speed + defense god |
| Amazo Haze | B+ | D+ | 30.1 | 13 pow, 11 con, 38 spd, 97 fld, 56 arm | Pure defensive specialist |
| Hurley Bender | S | B+ | 60.1 | 23 pow, 67 con, 73 spd, 99 fld, 86 arm | Elite glove, S-tier defender |
| Immaculo Spectaculo | A+ | B- | 54.3 | 11 pow, 56 con, 84 spd, 95 fld, 79 arm | Speed/defense package |
| Alana Lantana | A+ | B- | 51.0 | 59 pow, 7 con, 62 spd, 94 fld, 94 arm | Power + elite defense |

**Pattern**: Players boosted above their formula grade are overwhelmingly **elite defenders and speedsters** whose value the 3:3:2:1:1 formula systematically underrates.

**Biggest Manual Downgrades** (CSV grade much lower than formula):

| Player | CSV | Calc | Weighted | Profile | Likely Reason |
|--------|-----|------|----------|---------|---------------|
| Leonar Ramiro | C+ | A | 77.3 | 93 pow, 95 con, 72 spd, 35 fld, 30 arm | Terrible defense |
| Hannah Hogswind | C- | B+ | 60.2 | 56 pow, 98 con, 32 spd, 15 fld, 61 arm | No speed, awful fielding |
| Trey Mondo | C- | B+ | 63.2 | 79 pow, 92 con, 23 spd, 45 fld, 28 arm | Bat-only, defensive liability |
| David Diggler | B | A+ | 79.0 | 88 pow, 86 spd, 87 spd, 64 fld, 30 arm | BB Prone trait penalty |

**Pattern**: Players downgraded below their formula grade are **one-dimensional hitters with defensive liabilities**, plus players with negative traits (BB Prone, Whiffer, etc.).

---

## 5. Position Analysis

### 5.1 Average Rating Profiles by Position (Batters with ratings, standard positions only)

| Pos | # | Avg Weighted | Avg Pow | Avg Con | Avg Spd | Avg Fld | Avg Arm |
|-----|---|-------------|---------|---------|---------|---------|---------|
| C | 40 | 54.7 | 56.6 | 53.6 | 43.5 | 62.0 | 67.7 |
| 1B | 31 | 61.6 | 72.5 | 66.9 | 50.0 | 48.7 | 49.5 |
| 2B | 34 | 58.7 | 49.0 | 60.8 | 72.1 | 64.8 | 48.1 |
| 3B | 28 | 64.5 | 70.1 | 66.1 | 60.7 | 51.2 | 64.4 |
| SS | 30 | 63.6 | 57.0 | 67.2 | 61.6 | 73.8 | 67.0 |
| LF | 37 | 57.7 | 59.9 | 57.2 | 59.2 | 57.0 | 49.9 |
| CF | 30 | 62.8 | 57.3 | 58.7 | 75.6 | 65.1 | 63.8 |
| RF | 31 | 62.2 | 62.3 | 60.4 | 62.4 | 57.8 | 71.7 |

### 5.2 Position Archetype Patterns

**Corner Infield (1B/3B)**: Highest power ratings (72.5 / 70.1). 1B is the power/contact archetype with weak defense. 3B offers power with better arm strength.

**Middle Infield (2B/SS)**: SS has the highest fielding (73.8) and best overall balance. 2B is the speed/contact archetype with low power (49.0) and weak arm (48.1).

**Catcher**: Lowest speed (43.5) but strong arm (67.7) and fielding (62.0). Classic tradeoff — defensive value over offensive tools.

**Outfield**: CF is the speed king (75.6) with solid defense. RF has the strongest arm (71.7). LF is the weakest defensive position with the most balanced but lowest overall profile.

### 5.3 Position-Specific Stat Biases (from gradeEngine prospect generation)

```
C:  speed -10, fielding +10, arm +10
1B: power +15, speed -10, fielding -5
2B: power -10, contact +5, speed +5
SS: power -10, speed +5, fielding +10, arm +5
3B: power +10, speed -10, arm +5
LF: power +10, fielding -5, arm -5
CF: power -10, speed +15, fielding +5
RF: power +5, speed -5, arm +10
```

These biases closely match the actual database averages, confirming the prospect generation produces position-appropriate players.

---

## 6. Trait Analysis

### 6.1 Trait Frequency (Top 30)

| Trait | Count | Avg Weighted | Most Common Grades |
|-------|-------|-------------|-------------------|
| First Pitch Slayer | 11 | 60.4 | B-, A-, B+ (3 each) |
| K Collector | 10 | 51.6 | A- (3), C+ (2), S (2) |
| Little Hack | 9 | 59.3 | B- (4), C+ (2), B (2) |
| Mind Gamer | 9 | 57.9 | B (4), C+ (2), B- (2) |
| Rally Starter | 9 | 63.9 | B- (3), A (2), B (2) |
| Gets Ahead | 9 | 50.9 | B+ (2), B- (2) — spread |
| Magic Hands | 9 | 59.9 | B (3), B- (3), C+ (2) |
| Utility | 8 | 55.9 | B- (3), C+ (2), S (1) |
| Big Hack | 8 | 62.3 | B- (3), B+ (2) |
| Clutch | 8 | 55.8 | C+ (3), B (2), B+ (2) |
| Elite 2F | 8 | 58.1 | C+ (3), pitcher trait |
| Volatile | 8 | 53.2 | B (5) — clusters at average |
| Sprinter | 8 | 65.1 | B (3), A- (2), A (1) |
| Cannon Arm | 8 | 66.8 | B+ (2), A- (2), B- (2) |
| Fastball Hitter | 7 | 65.8 | Spread across tiers |
| RBI Hero | 7 | 68.8 | B+ (3) — highest avg weighted |
| Whiffer | 7 | 64.2 | B+ (3) |
| Wild Thing | 6 | 39.3 | B- (2), D+ (1), C- (1) — lowest avg |

### 6.2 Trait Impact on Grades

**Traits that appear to BOOST grades beyond formula**:
- **K Collector**: Avg weighted 51.6 but appears at S and A- tiers (pitcher-killers valued above stats)
- **Elite CF / Elite CB / Elite 2F / Elite 4F**: "Elite [pitch]" traits mark pitching specialists
- **Utility**: Players with this trait get grade bumps for versatility

**Traits that appear to LOWER grades below formula**:
- **Wild Thing**: Avg weighted 39.3, lowest of any trait — erratic players penalized
- **Falls Behind**: Avg 45.1, pitchers who fall behind in counts
- **BB Prone**: Players who walk too much are penalized
- **Whiffer**: High weighted (64.2) but spread across tiers — contact problems cap upside

**Neutral/flavor traits** (no clear grade impact):
- Volatile, Mind Gamer, Distractor, Sign Stealer — roughly grade-neutral

### 6.3 Pitcher-Specific Traits

The database includes pitcher traits like Elite 4F, Elite 2F, Elite CB, Elite SL, Elite FK, Elite CH, Elite SB, Gets Ahead, Falls Behind, K Collector, Wild Thing, BB Prone, Rally Stopper, and Workhorse. These describe pitch repertoire strengths and tendencies.

---

## 7. Chemistry Analysis

| Chemistry | Count | Avg Weighted | S/A+/A Count |
|-----------|-------|-------------|-------------|
| Disciplined | 88 | 57.5 | 9 (10.2%) |
| Competitive | 84 | 57.1 | 12 (14.3%) |
| Crafty | 83 | 56.3 | 6 (7.2%) |
| Spirited | 92 | 55.4 | 7 (7.6%) |
| Scholarly | 88 | 52.6 | 1 (1.1%) |

**Competitive** has the highest star density (14.3% at A or above). **Scholarly** has the lowest average weighted rating and fewest stars — these players tend to cluster in the B-/C+ range.

Chemistry does NOT appear to feed into the grade algorithm directly. It's a gameplay/team-building attribute independent of the grade calculation.

---

## 8. Team Strength Rankings

| Rank | Team | Avg Weighted | Stars (S/A+/A) | Roster Profile |
|------|------|-------------|----------------|---------------|
| 1 | Overdogs | 59.2 | 1 | Deep roster, no weak spots |
| 2 | Herbisaurs | 58.4 | 1 | Strong middle (A-/B+ heavy) |
| 3 | Buzzards | 58.2 | 1 | Consistent A-/B+ core |
| 4 | Sirloins | 57.7 | 3 | Most top-end talent |
| 5 | Nemesis | 57.0 | 2 | Two A+ anchors |
| 6 | Beewolves | 56.6 | 2 | Two S-tier players |
| 7 | Sandcats | 56.6 | 2 | Two A-tier, five A- |
| 8 | Jacks | 56.0 | 2 | Balanced across tiers |
| 9 | Crocodons | 55.7 | 3 | S + two A players |
| 10 | Wild Pigs | 55.4 | 3 | A+, two A players |

*Teams 11-20 range from 55.2 (Platypi) to 53.4 (Moose)*
*MLB-based teams (Angels, Blue Jays, Giants, Indians, Mets, Twins, White Sox, Yankees) have pitchers with zero batter ratings, bringing their averages to 0 — these teams use a different data schema where pitcher stats are in the velocity/junk/accuracy columns.*

---

## 9. Handedness Analysis

| Bats | Count | Avg Weighted |
|------|-------|-------------|
| Left (L) | 182 | 55.3 |
| Right (R) | 227 | 55.6 |
| Switch (S) | 31 | 59.2 |

**Switch hitters average 4 points higher** in weighted rating — the rarest handedness type (5% of batters) tends to be assigned to more talented players.

---

## 10. Individual Rating Impact on Grade Assignment

### 10.1 High-Rating Correlations (≥80 in a single stat)

| Rating ≥80 | # Players | % at A- or above | % at C+ or below |
|------------|-----------|-------------------|-------------------|
| Power | 65 | 30.8% | 12.3% |
| Contact | 90 | 32.2% | 14.4% |
| Speed | 92 | 29.3% | 1.1% |
| Fielding | 91 | 37.4% | 11.0% |
| Arm | 82 | 34.1% | 14.6% |

**Elite fielding (≥80)** has the strongest correlation with high grades at 37.4% A- or above. **Elite speed (≥80)** has the strongest protection against low grades — only 1.1% of fast players are graded C+ or below.

### 10.2 Low-Rating Impact (≤30 in a single stat)

| Rating ≤30 | # Players | % at A- or above | % at C+ or below |
|------------|-----------|-------------------|-------------------|
| Power | 150 | 18.7% | 17.3% |
| Contact | 49 | 6.1% | 49.0% |
| Speed | 47 | 2.1% | 57.4% |
| Fielding | 46 | 2.2% | 52.2% |
| Arm | 41 | 7.3% | 39.0% |

**Low speed (≤30)** and **low fielding (≤30)** are the most damaging to grade assignment — over half of players with these ratings end up C+ or below, even if their offensive stats are strong. This directly contradicts the formula which only weights fielding at 10%, confirming that CSV grades value defense far more than the algorithm suggests.

---

## 11. Key Findings

1. **The grade algorithm (gradeEngine.ts) and the CSV database use different grading philosophies.** The algorithm is a pure weighted formula; the CSV grades are holistic assessments that weight defense and speed much more heavily.

2. **Defense matters more than the formula says.** Players with elite fielding (≥80) have the highest rate of top-tier grades. Players with terrible fielding (≤30) get downgraded 3-5 grades below what the formula would give. The 10% weight on fielding in the formula significantly undervalues its actual impact on assigned grades.

3. **Speed protects against low grades.** Only 1.1% of players with 80+ speed are graded C+ or below, making it the strongest "floor raiser" — even more than power or contact.

4. **Traits function as grade modifiers.** K Collector and Elite [pitch] traits boost grades. Wild Thing, Falls Behind, and BB Prone lower grades. The formula doesn't account for traits at all.

5. **Chemistry is grade-independent.** The five chemistry types (Disciplined, Competitive, Crafty, Spirited, Scholarly) show minimal correlation with grade assignment. Competitive players have slightly more stars; Scholarly players trend lower.

6. **The gradeWeight field is the authoritative grade encoding**, mapping cleanly to the 12-tier grade scale (0.5=S through 1.5=D+). This is more reliable than parsing the overallGrade text field, which sometimes contains compound values like "B B-".

7. **Prospect generation faithfully reproduces position archetypes.** The POSITION_STAT_BIAS constants in gradeEngine.ts closely match the actual average stat profiles seen in the database (e.g., CF speed bias of +15 matches the 75.6 CF average vs 55-60 for other positions).

---

## 12. Implications for Grade Algorithm Calibration

If the goal is to make gradeEngine.ts produce grades that match the CSV database's holistic assessments, consider:

1. **Increase fielding + arm weight** from 10%+10% to at least 15%+15% (reducing power/contact to 25% each)
2. **Add a speed floor bonus** — players with 80+ speed should get a minimum B- grade floor
3. **Add trait modifiers** — K Collector: +3 to weighted, Wild Thing: -5, BB Prone: -3, etc.
4. **Add a defensive specialist premium** — if fielding ≥ 90, add +8 to weighted rating regardless of position
5. **Penalize one-dimensional sluggers** — if speed ≤ 30 AND fielding ≤ 40, apply -5 penalty

These adjustments would close the gap between the formula output and the manually-assigned grades in the database.
