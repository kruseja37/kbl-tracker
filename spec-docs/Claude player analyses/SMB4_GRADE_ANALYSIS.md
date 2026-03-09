# SMB4 Player Database — Grade Prediction Analysis

**440 players | 20 teams | 12 grade tiers (D through S)**

---

## Parsing & Feature Engineering

Parsed all 440 players from the markdown database. Fixed escaped pipe characters (`\|`) in Arsenal strings that were corrupting column alignment. Built 128 features total:

**Base stats (9):** POW, CON, SPD, FLD, ARM, VEL, JNK, ACC, Age

**Derived numerics (14):** is_pitcher, hit_stats_sum, pitch_stats_sum, total_stats, hit_stats_mean, pitch_stats_mean, role_key_sum, role_key_mean, arsenal_count, trait_count, max_stat, min_stat, stat_range, Gender_F

**One-hot encoded (105):** 12 positions, 3 bat hands, 2 throw hands, 5 chemistries, 59 traits, 10 pitch types, 14 "Elite" pitch traits

The critical derived feature was `role_key_mean` — for pitchers this is `mean(VEL, JNK, ACC, FLD)`, for hitters it's `mean(POW, CON, SPD, FLD, ARM)`. This single feature dominates the RF with 68.6% importance.

---

## Model Results

### Linear Regression — R² = 0.974, MAE = 1.33

The linear model explains 97.4% of variance. The equation (intercept = 15.05) is dominated by:

| Feature | Coef | Interpretation |
|---------|------|----------------|
| role_key_sum | +0.375 | Core stat total drives grade |
| role_key_mean | −0.853 | Correction for stat distribution |
| POW | +0.079 | Power matters for hitters |
| CON | +0.084 | Contact matters for hitters |
| VEL | +0.009 | Velocity matters less than JNK/ACC |
| JNK | +0.020 | Junk contributes to pitcher grade |
| ACC | +0.025 | Accuracy contributes to pitcher grade |
| trait_count | +0.990 | Having traits adds ~1 grade point each |
| arsenal_count | +1.092 | More pitches = slightly higher grade |
| Bat_S (switch) | +2.735 | Switch hitters get a ~2.7 bonus |
| PPos_C (catcher) | +2.157 | Catchers get a ~2.2 position bonus |

**Biggest trait effects:** PWR vs RHP (+4.73), High Pitch (+3.57), Off-speed Hitter (+3.46), Elite 4 (+3.35), Wild Thing (−4.32), Easy Jumps (−4.02), K Neglecter (−3.48), Whiffer (−3.01)

### Random Forest Regressor — R² = 0.984, MAE = 1.02

Top feature importances confirm the stat-driven grading:

| Feature | Importance |
|---------|-----------|
| role_key_mean | 0.686 |
| FLD | 0.055 |
| pitch_stats_sum | 0.040 |
| pitch_stats_mean | 0.037 |
| CON | 0.030 |
| POW | 0.023 |
| ARM | 0.022 |

The top 7 features account for 89% of the model's decisions.

### Random Forest Classifier — 100% Accuracy (440/440) ✅

With 2000 trees, the classifier perfectly reproduces every letter grade in the database. This is the model saved in `rf_classifier.pkl`.

### Gradient Boosting Classifier — 100% Accuracy (440/440) ✅

### Decision Tree Classifier — 100% Accuracy, Depth 12, 137 Leaves

The interpretable decision tree reveals the grading algorithm's structure:

**Top split:** `role_key_mean ≤ 57.1` (separates lower-tier from upper-tier players)

**Key thresholds for pitchers (VEL/JNK/ACC focused):**
- `pitch_stats_sum > 158` → likely B or higher
- `JNK > 76.5` → B+ territory
- `VEL > 83.5` with high JNK → A range
- `pitch_stats_mean > 56.8` and SP → B

**Key thresholds for hitters (POW/CON/SPD/FLD/ARM focused):**
- `hit_stats_sum > 348.5` → A−/A territory
- `CON > 68.5` and `POW > 64.5` → B+ or higher
- `role_key_mean > 57.1` with `trait_count > 1.5` → bonus tier
- `SPD > 72.5` when mid-tier → pushes up one grade

---

## The Grade Formula (Simplified)

The SMB4 grading system is fundamentally **a weighted average of role-relevant stats** with adjustments for traits, position, and batting hand:

**For hitters:** `grade ≈ 15 + 0.375 × (POW+CON+SPD+FLD+ARM) + trait_bonuses + position_adj`

**For pitchers:** `grade ≈ 15 + 0.375 × (VEL+JNK+ACC+FLD) + arsenal_bonus + trait_bonuses`

The grade boundaries map to roughly: S ≈ mean 78+, A+ ≈ 73-78, A ≈ 68-73, A− ≈ 63-68, and so on down in 5-point steps.

---

## League Structure

### Position Counts Per Team

Every team has exactly 22 players. The standard template is:

| Position | Count | Notes |
|----------|-------|-------|
| SP | 4 | Every team except Platypi (3) |
| SP/RP | 1-3 | Usually 1, some teams 2-3 |
| RP | 2-4 | Fills relief corps |
| CP | 0-1 | 16 of 20 teams have a closer |
| C | 2 | Always 2 catchers |
| 1B | 1-2 | |
| 2B | 1-2 | |
| 3B | 1-2 | |
| SS | 1-2 | |
| LF | 1-2 | |
| CF | 1-2 | |
| RF | 1-2 | |

### Team Power Rankings (by Average OVR)

| Team | Avg | Med | Min | Max |
|------|-----|-----|-----|-----|
| Wideloads | 71.8 | 72 | 57 | 87 |
| Crocs | 71.3 | 72 | 47 | 97 |
| Freebooters | 71.3 | 69.5 | 57 | 97 |
| Jacks | 71.3 | 72 | 52 | 92 |
| Sirloins | 71.1 | 72 | 57 | 92 |
| Sawteeth | 71.1 | 69.5 | 57 | 92 |
| *...league avg ≈ 70.5...* | | | | |
| Overdogs | 69.3 | 69.5 | 42 | 92 |
| Platypi | 69.3 | 69.5 | 42 | 87 |

The league is remarkably balanced — only a 2.5 point spread from best to worst team average.

### Grade Distribution (League-wide)

| Grade | Count | % |
|-------|-------|---|
| B | 85 | 19.3% |
| B- | 82 | 18.6% |
| C+ | 68 | 15.5% |
| B+ | 66 | 15.0% |
| A- | 45 | 10.2% |
| C | 36 | 8.2% |
| A | 18 | 4.1% |
| C- | 13 | 3.0% |
| A+ | 13 | 3.0% |
| S | 6 | 1.4% |
| D+ | 6 | 1.4% |
| D | 2 | 0.5% |

The distribution is heavily concentrated in B−/B/B+ (53%), with a long tail toward elites.

---

## Files Produced

| File | Description |
|------|-------------|
| `smb4_full_analysis.csv` | Full 440-row DataFrame with all features |
| `rf_classifier.pkl` | Trained RF Classifier (100% accuracy) |
| `feature_cols.pkl` | Feature column names in training order |
| `smb4_analysis.py` | Complete analysis script |
