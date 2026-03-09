#!/usr/bin/env python3
"""SMB4 OVR v8 — Versatility-aware formula with optimized grade boundaries.

Version history:
  v5 OLS:      93.6% exact (412/440), 100% within ±1
  v6 integer:  90.0% exact — integer constraint too rigid
  v7 boundary:  94.5% exact (416/440), 99.8% within ±1
  v7+versatlty: 94.3% hitters with boundary opt (inline test)

v8 strategy:
  1. Replace binary has_S_Pos with graduated VERSATILITY score
  2. Add versatility × Utility interaction (user-discovered insight)
  3. Add stat interaction terms (POW×CON, JNK×ACC from v4 findings)
  4. Deep outlier profiling for remaining misses
  5. Cross-validated accuracy to check for overfitting
"""

import pandas as pd
import numpy as np
import re
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.model_selection import cross_val_predict, LeaveOneOut, KFold
from sklearn.metrics import r2_score, mean_absolute_error
from collections import defaultdict
import warnings
warnings.filterwarnings('ignore')

GRADE_MAP = {
    'S': 97, 'A+': 92, 'A': 87, 'A-': 82,
    'B+': 77, 'B': 72, 'B-': 67,
    'C+': 62, 'C': 57, 'C-': 52,
    'D+': 47, 'D': 42, 'D-': 37,
    'E+': 32, 'E': 27, 'E-': 22, 'F': 15
}
GRADE_ORDER = list(GRADE_MAP.keys())
PITCHER_POSITIONS = {'SP', 'RP', 'CP', 'SP/RP'}
FILEPATH = '/Users/johnkruse/Projects/kbl-tracker/spec-docs/PLAYER_DATABASE_SMB4_v2.md'

# ── Versatility scoring ──
# How many FIELDING positions does each S_Pos designation cover?
VERSATILITY_MAP = {
    'IF/OF': 7,  # 1B, 2B, SS, 3B, LF, CF, RF
    'IF': 4,     # 1B, 2B, SS, 3B
    '1B/OF': 4,  # 1B, LF, CF, RF
    'OF': 3,     # LF, CF, RF
    'C/1B': 2,   # C, 1B
    'SP/RP': 2,  # SP, RP (pitcher dual-role)
}
# Single specific secondary positions get 1
# No secondary position gets 0


def versatility_score(s_pos):
    """Compute graduated versatility score from secondary position string."""
    s = str(s_pos).strip()
    if not s or s in ('', '-', 'None', 'nan'):
        return 0
    if s in VERSATILITY_MAP:
        return VERSATILITY_MAP[s]
    return 1  # single specific secondary (e.g., "LF", "2B")


def grade_from_numeric(val, boundaries=None):
    """Convert numeric OVR to letter grade."""
    if boundaries:
        result = boundaries[0][1]
        for thresh, grade in boundaries:
            if val >= thresh:
                result = grade
        return result
    else:
        best_grade, best_dist = 'F', abs(val - 15)
        for letter, center in GRADE_MAP.items():
            d = abs(val - center)
            if d < best_dist:
                best_dist = d
                best_grade = letter
        return best_grade


def _si(val):
    val = str(val).strip()
    return int(val) if val not in ('-', '', 'None') and val.isdigit() else 0


def parse_md(filepath):
    with open(filepath, 'r') as f:
        text = f.read()
    players, current_team = [], None
    for line in text.split('\n'):
        line = line.strip()
        tm = re.match(r'^## (.+?)(?:\s*\(\d+ players\))?$', line)
        if tm:
            current_team = tm.group(1).strip()
            continue
        if not line.startswith('|') or line.startswith('| Name') or line.startswith('|---'):
            continue
        raw = line.replace('\\|', '§PIPE§')
        cols = [c.strip().replace('§PIPE§', '|') for c in raw.split('|')[1:-1]]
        if len(cols) == 20 and current_team:
            players.append({
                'Name': cols[0], 'Team': current_team,
                'Gender': cols[1], 'Age': _si(cols[2]),
                'OVR_letter': cols[3].strip(), 'P_Pos': cols[4].strip(),
                'S_Pos': cols[5].strip(), 'Bat': cols[6].strip(),
                'Thr': cols[7].strip(), 'Chem': cols[8].strip(),
                'POW': _si(cols[9]), 'CON': _si(cols[10]), 'SPD': _si(cols[11]),
                'FLD': _si(cols[12]), 'ARM': _si(cols[13]),
                'VEL': _si(cols[14]), 'JNK': _si(cols[15]), 'ACC': _si(cols[16]),
                'Arsenal_str': cols[17].strip(),
                'Trait1': cols[18].strip(), 'Trait2': cols[19].strip(),
            })
    return pd.DataFrame(players)


def build_ols_model(sub, stat_cols, is_pitcher, include_interactions=True):
    """Build the full OLS model with versatility + interactions."""
    y = sub['OVR_letter'].map(GRADE_MAP).values.astype(float)
    n = len(sub)

    features = []
    feat_names = []

    # Raw stats
    for s in stat_cols:
        features.append(sub[s].values.astype(float))
        feat_names.append(s)

    # ── NEW: Stat interactions ──
    if include_interactions:
        if not is_pitcher:
            # POW×CON (core power-contact synergy from v4)
            pow_vals = sub['POW'].values.astype(float)
            con_vals = sub['CON'].values.astype(float)
            features.append(pow_vals * con_vals / 100.0)  # scale down
            feat_names.append('POW×CON/100')

            # SPD×FLD (speed-fielding synergy)
            spd_vals = sub['SPD'].values.astype(float)
            fld_vals = sub['FLD'].values.astype(float)
            features.append(spd_vals * fld_vals / 100.0)
            feat_names.append('SPD×FLD/100')
        else:
            # JNK×ACC (movement-control synergy from v4)
            jnk_vals = sub['JNK'].values.astype(float)
            acc_vals = sub['ACC'].values.astype(float)
            features.append(jnk_vals * acc_vals / 100.0)
            feat_names.append('JNK×ACC/100')

    # Trait indicators
    all_traits = set()
    for col in ['Trait1', 'Trait2']:
        for t in sub[col]:
            if t:
                all_traits.add(t)
    all_traits = sorted(all_traits)

    for trait in all_traits:
        indicator = ((sub['Trait1'] == trait) | (sub['Trait2'] == trait)).astype(int).values
        features.append(indicator)
        feat_names.append(f'TR:{trait}')

    # Trait count
    tc = ((sub['Trait1'] != '').astype(int) + (sub['Trait2'] != '').astype(int)).values
    features.append(tc.astype(float))
    feat_names.append('trait_count')

    # Bat hand (R is reference)
    for bat in ['L', 'S']:
        features.append((sub['Bat'] == bat).astype(int).values)
        feat_names.append(f'Bat={bat}')

    # Throw hand
    features.append((sub['Thr'] == 'L').astype(int).values)
    feat_names.append('Thr=L')

    # Gender
    features.append((sub['Gender'] == 'F').astype(int).values)
    feat_names.append('Female')

    # ── NEW: Graduated versatility (replaces binary has_S_Pos) ──
    v_scores = sub['S_Pos'].apply(versatility_score).values.astype(float)
    features.append(v_scores)
    feat_names.append('versatility')

    # Utility trait indicator (for interaction)
    has_utility = ((sub['Trait1'] == 'Utility') | (sub['Trait2'] == 'Utility')).astype(int).values

    # Versatility × Utility interaction
    features.append(v_scores * has_utility)
    feat_names.append('versatility×utility')

    # Versatility squared (diminishing returns)
    features.append(v_scores ** 2)
    feat_names.append('versatility²')

    # Position dummies
    positions = sorted(sub['P_Pos'].unique())
    ref_pos = positions[0]
    for pos in positions[1:]:
        features.append((sub['P_Pos'] == pos).astype(int).values)
        feat_names.append(f'Pos={pos}')

    # Chemistry dummies
    chems = sorted([c for c in sub['Chem'].unique() if c])
    ref_chem = chems[0]
    for chem in chems[1:]:
        features.append((sub['Chem'] == chem).astype(int).values)
        feat_names.append(f'Chem={chem}')

    # Pitcher-specific: arsenal
    if is_pitcher:
        sub_copy = sub.copy()
        sub_copy['arsenal_count'] = sub['Arsenal_str'].apply(
            lambda x: len([p for p in x.split('|') if p.strip()]) if x.strip() else 0)
        features.append(sub_copy['arsenal_count'].values.astype(float))
        feat_names.append('arsenal_count')

        all_pitches = set()
        for a in sub['Arsenal_str']:
            for p in a.split('|'):
                p = p.strip()
                if p and len(p) <= 3:
                    all_pitches.add(p)
        for pitch in sorted(all_pitches):
            indicator = sub['Arsenal_str'].apply(
                lambda x, p=pitch: int(p in [pp.strip() for pp in x.split('|')])).values
            features.append(indicator)
            feat_names.append(f'Pitch:{pitch}')

    X = np.column_stack(features).astype(float)

    # Fit OLS
    lr = LinearRegression()
    lr.fit(X, y)
    pred = lr.predict(X)

    return lr, X, pred, y, feat_names, ref_pos, ref_chem, all_traits


def optimize_boundaries(pred, actual_grades, grade_order):
    """Find the optimal grade boundary thresholds to maximize exact match."""
    default_bounds = {}
    for i, g in enumerate(grade_order):
        center = GRADE_MAP[g]
        default_bounds[g] = center - 2.5

    def make_boundary_list(bounds):
        items = [(bounds[g], g) for g in grade_order]
        items.sort(key=lambda x: x[0])
        return items

    def count_exact(bounds):
        bl = make_boundary_list(bounds)
        grades = []
        for p in pred:
            g = bl[0][1]
            for thresh, grade in bl:
                if p >= thresh:
                    g = grade
            grades.append(g)
        return sum(1 for a, g in zip(actual_grades, grades) if a == g)

    best_bounds = dict(default_bounds)
    best_exact = count_exact(best_bounds)

    for _ in range(10):
        improved = False
        for grade in grade_order:
            current = best_bounds[grade]
            for delta in np.arange(-3.0, 3.1, 0.25):
                test_bounds = dict(best_bounds)
                test_bounds[grade] = current + delta
                ex = count_exact(test_bounds)
                if ex > best_exact:
                    best_bounds[grade] = current + delta
                    best_exact = ex
                    improved = True
        if not improved:
            break

    return best_bounds, best_exact, make_boundary_list(best_bounds)


def cross_validate(sub, stat_cols, is_pitcher, n_folds=10):
    """K-fold cross-validated accuracy to check for overfitting."""
    y = sub['OVR_letter'].map(GRADE_MAP).values.astype(float)
    actual_grades = sub['OVR_letter'].values

    # Rebuild feature matrix (same as build_ols_model)
    features = []
    for s in stat_cols:
        features.append(sub[s].values.astype(float))
    if not is_pitcher:
        features.append(sub['POW'].values.astype(float) * sub['CON'].values.astype(float) / 100.0)
        features.append(sub['SPD'].values.astype(float) * sub['FLD'].values.astype(float) / 100.0)
    else:
        features.append(sub['JNK'].values.astype(float) * sub['ACC'].values.astype(float) / 100.0)

    all_traits = sorted(set(t for col in ['Trait1', 'Trait2'] for t in sub[col] if t))
    for trait in all_traits:
        features.append(((sub['Trait1'] == trait) | (sub['Trait2'] == trait)).astype(int).values)
    tc = ((sub['Trait1'] != '').astype(int) + (sub['Trait2'] != '').astype(int)).values
    features.append(tc.astype(float))
    for bat in ['L', 'S']:
        features.append((sub['Bat'] == bat).astype(int).values)
    features.append((sub['Thr'] == 'L').astype(int).values)
    features.append((sub['Gender'] == 'F').astype(int).values)
    v_scores = sub['S_Pos'].apply(versatility_score).values.astype(float)
    features.append(v_scores)
    has_utility = ((sub['Trait1'] == 'Utility') | (sub['Trait2'] == 'Utility')).astype(int).values
    features.append(v_scores * has_utility)
    features.append(v_scores ** 2)
    positions = sorted(sub['P_Pos'].unique())
    for pos in positions[1:]:
        features.append((sub['P_Pos'] == pos).astype(int).values)
    chems = sorted([c for c in sub['Chem'].unique() if c])
    for chem in chems[1:]:
        features.append((sub['Chem'] == chem).astype(int).values)
    if is_pitcher:
        features.append(sub['Arsenal_str'].apply(
            lambda x: len([p for p in x.split('|') if p.strip()]) if x.strip() else 0
        ).values.astype(float))
        all_pitches = set()
        for a in sub['Arsenal_str']:
            for p in a.split('|'):
                p = p.strip()
                if p and len(p) <= 3:
                    all_pitches.add(p)
        for pitch in sorted(all_pitches):
            features.append(sub['Arsenal_str'].apply(
                lambda x, p=pitch: int(p in [pp.strip() for pp in x.split('|')])).values)

    X = np.column_stack(features).astype(float)

    kf = KFold(n_splits=n_folds, shuffle=True, random_state=42)
    cv_pred = cross_val_predict(LinearRegression(), X, y, cv=kf)
    cv_grades = [grade_from_numeric(p) for p in cv_pred]
    cv_exact = sum(1 for a, g in zip(actual_grades, cv_grades) if a == g)
    cv_within1 = sum(1 for a, g in zip(actual_grades, cv_grades)
                     if abs(GRADE_MAP[a] - GRADE_MAP[g]) <= 5)
    return cv_exact, cv_within1, len(sub), cv_pred


def profile_outliers(sub, pred, grades_opt, y, is_pitcher, stat_cols):
    """Deep per-player profiling of all misgraded players."""
    wrong_idxs = [i for i in range(len(sub)) if sub.iloc[i]['OVR_letter'] != grades_opt[i]]

    if not wrong_idxs:
        print("    No outliers — perfect accuracy!")
        return

    print(f"\n  ── DEEP OUTLIER PROFILES ({len(wrong_idxs)} players) ──")

    # Compute stat percentiles within this role
    for s in stat_cols:
        sub[f'{s}_pctl'] = sub[s].rank(pct=True)

    for idx in wrong_idxs:
        row = sub.iloc[idx]
        resid = y[idx] - pred[idx]
        v_score = versatility_score(row['S_Pos'])
        has_util = row['Trait1'] == 'Utility' or row['Trait2'] == 'Utility'
        traits = '/'.join(filter(None, [row['Trait1'], row['Trait2']])) or 'none'

        print(f"\n    {row['Name']} ({row['Team']})")
        print(f"      Actual={row['OVR_letter']:3s} → Predicted={grades_opt[idx]:3s}  "
              f"raw={pred[idx]:.1f}  resid={resid:+.1f}")
        print(f"      Pos={row['P_Pos']}  S_Pos={row['S_Pos'] or '(none)'}  "
              f"versatility={v_score}  utility={'YES' if has_util else 'no'}")
        print(f"      Bat={row['Bat']}  Thr={row['Thr']}  Gender={row['Gender']}  "
              f"Chem={row['Chem']}  Traits={traits}")

        if is_pitcher:
            stats = f"VEL={row['VEL']} JNK={row['JNK']} ACC={row['ACC']} FLD={row['FLD']}"
            pctls = ' '.join(f"{s}={row[f'{s}_pctl']:.0%}"
                             for s in stat_cols)
        else:
            stats = (f"POW={row['POW']} CON={row['CON']} SPD={row['SPD']} "
                     f"FLD={row['FLD']} ARM={row['ARM']}")
            pctls = ' '.join(f"{s}={row[f'{s}_pctl']:.0%}"
                             for s in stat_cols)

        print(f"      Stats: {stats}")
        print(f"      Percentiles: {pctls}")

        # Stat spread (how uneven are their stats?)
        stat_vals = [row[s] for s in stat_cols]
        spread = max(stat_vals) - min(stat_vals)
        std_dev = np.std(stat_vals)
        print(f"      Stat spread: {spread} (range), {std_dev:.1f} (σ)")

        # Distance to actual grade center vs predicted grade center
        actual_center = GRADE_MAP[row['OVR_letter']]
        pred_center = GRADE_MAP[grades_opt[idx]]
        print(f"      Grade centers: actual={actual_center} pred_grade={pred_center}  "
              f"raw_pred={pred[idx]:.1f}")

        # Diagnose: over or under?
        direction = "UNDER-rated by model" if resid > 0 else "OVER-rated by model"
        print(f"      → {direction} by {abs(resid):.1f} pts")

    # Clean up temp columns
    for s in stat_cols:
        sub.drop(f'{s}_pctl', axis=1, inplace=True)

    # Pattern summary
    print(f"\n  ── OUTLIER PATTERN SUMMARY ──")
    wrong_sub = sub.iloc[wrong_idxs]

    # Direction
    wrong_resid = y[wrong_idxs] - pred[wrong_idxs]
    n_under = (wrong_resid > 0).sum()
    n_over = (wrong_resid < 0).sum()
    print(f"    Under-rated by model: {n_under}  Over-rated: {n_over}")
    print(f"    Mean residual: {wrong_resid.mean():+.2f}  |Mean|: {np.abs(wrong_resid).mean():.2f}")

    # Position concentration
    print(f"    Position breakdown:")
    for pos in sorted(wrong_sub['P_Pos'].unique()):
        n_pos = (wrong_sub['P_Pos'] == pos).sum()
        total = (sub['P_Pos'] == pos).sum()
        print(f"      {pos:6s}: {n_pos}/{total} misgraded ({n_pos/total:.0%})")

    # Versatility
    wrong_v = wrong_sub['S_Pos'].apply(versatility_score)
    all_v = sub['S_Pos'].apply(versatility_score)
    print(f"    Avg versatility (wrong): {wrong_v.mean():.1f} vs all: {all_v.mean():.1f}")

    # Stat spread
    wrong_stats = wrong_sub[stat_cols].values
    all_stats = sub[stat_cols].values
    wrong_spread = np.std(wrong_stats, axis=1).mean()
    all_spread = np.std(all_stats, axis=1).mean()
    print(f"    Avg stat σ (wrong): {wrong_spread:.1f} vs all: {all_spread:.1f}")


def solve_role(df, is_pitcher, label):
    """Complete formula extraction for hitters or pitchers."""
    sub = df[df['P_Pos'].isin(PITCHER_POSITIONS) == is_pitcher].copy().reset_index(drop=True)
    n = len(sub)

    if is_pitcher:
        stat_cols = ['VEL', 'JNK', 'ACC', 'FLD']
    else:
        stat_cols = ['POW', 'CON', 'SPD', 'FLD', 'ARM']

    print(f"\n{'='*80}")
    print(f"  {label} (n={n})")
    print(f"{'='*80}")

    # ── Step 1: Build OLS model (with interactions + versatility) ──
    print(f"\n  Step 1: OLS Model (v8 — interactions + versatility)")
    lr, X, pred, y, feat_names, ref_pos, ref_chem, all_traits = \
        build_ols_model(sub, stat_cols, is_pitcher, include_interactions=True)

    resid = y - pred
    grades_default = [grade_from_numeric(p) for p in pred]
    exact_default = sum(1 for a, g in zip(sub['OVR_letter'], grades_default) if a == g)

    print(f"    R² = {r2_score(y, pred):.6f}")
    print(f"    OLS exact (default boundaries): {exact_default}/{n} ({exact_default/n:.1%})")
    print(f"    MAE: {np.mean(np.abs(resid)):.3f}")
    print(f"    Max |resid|: {np.max(np.abs(resid)):.3f}")

    # ── Step 1b: Compare WITH vs WITHOUT interactions ──
    lr_no_int, _, pred_no_int, _, _, _, _, _ = \
        build_ols_model(sub, stat_cols, is_pitcher, include_interactions=False)
    grades_no_int = [grade_from_numeric(p) for p in pred_no_int]
    exact_no_int = sum(1 for a, g in zip(sub['OVR_letter'], grades_no_int) if a == g)
    print(f"    Without interactions: {exact_no_int}/{n} ({exact_no_int/n:.1%})")
    print(f"    Interaction lift: {exact_default - exact_no_int:+d} players")

    # ── Step 2: Cross-validation ──
    print(f"\n  Step 2: Cross-Validation (10-fold)")
    cv_exact, cv_within1, cv_n, cv_pred = cross_validate(sub, stat_cols, is_pitcher)
    print(f"    CV exact: {cv_exact}/{cv_n} ({cv_exact/cv_n:.1%})")
    print(f"    CV within ±1: {cv_within1}/{cv_n} ({cv_within1/cv_n:.1%})")
    print(f"    Overfit gap: {exact_default/n - cv_exact/cv_n:.1%} (train - CV)")

    # ── Step 3: Optimize grade boundaries ──
    print(f"\n  Step 3: Optimize Grade Boundaries")
    opt_bounds, opt_exact, boundary_list = \
        optimize_boundaries(pred, sub['OVR_letter'].values, GRADE_ORDER)

    print(f"    Optimized exact: {opt_exact}/{n} ({opt_exact/n:.1%})")
    print(f"\n    Shifted boundaries (Δ ≠ 0 only):")
    for grade in GRADE_ORDER:
        default = GRADE_MAP[grade] - 2.5
        optimized = opt_bounds[grade]
        delta = optimized - default
        if abs(delta) > 0.01:
            print(f"      {grade:3s}: {optimized:.2f} (Δ={delta:+.2f})")

    grades_opt = []
    for p in pred:
        g = boundary_list[0][1]
        for thresh, grade in boundary_list:
            if p >= thresh:
                g = grade
        grades_opt.append(g)

    # ── Step 4: Print the complete formula ──
    print(f"\n  Step 4: COMPLETE FORMULA")
    print(f"  ─────────────────────────")
    print(f"  Intercept: {lr.intercept_:.4f}")

    # Group coefficients by category
    stat_feats = [(f, c) for f, c in zip(feat_names, lr.coef_)
                  if f in stat_cols or '×' in f or '²' in f and '×' not in f and 'versatility' not in f]
    # Actually let me be more precise
    stat_feats = []
    interaction_feats = []
    versatility_feats = []
    trait_feats = []
    categorical_feats = []
    position_feats = []
    chem_feats = []
    arsenal_feats = []

    for f, c in zip(feat_names, lr.coef_):
        if f in stat_cols:
            stat_feats.append((f, c))
        elif 'POW×CON' in f or 'SPD×FLD' in f or 'JNK×ACC' in f:
            interaction_feats.append((f, c))
        elif 'versatility' in f:
            versatility_feats.append((f, c))
        elif f.startswith('TR:'):
            trait_feats.append((f, c))
        elif f.startswith('Pos='):
            position_feats.append((f, c))
        elif f.startswith('Chem='):
            chem_feats.append((f, c))
        elif f.startswith('Pitch:'):
            arsenal_feats.append((f, c))
        else:
            categorical_feats.append((f, c))

    print(f"\n  Stat weights:")
    for f, c in stat_feats:
        print(f"    {f:20s} {c:+.4f}")

    if interaction_feats:
        print(f"\n  Stat interactions:")
        for f, c in interaction_feats:
            print(f"    {f:20s} {c:+.4f}")

    print(f"\n  Versatility:")
    for f, c in versatility_feats:
        print(f"    {f:20s} {c:+.4f}")

    print(f"\n  Traits (individual):")
    trait_feats.sort(key=lambda x: -x[1])
    for f, c in trait_feats:
        print(f"    {f[3:]:35s} {c:+6.2f}")

    print(f"\n  Categorical:")
    for f, c in categorical_feats:
        print(f"    {f:35s} {c:+6.2f}")

    if position_feats:
        print(f"\n  Position (ref={ref_pos}):")
        position_feats.sort(key=lambda x: -x[1])
        for f, c in position_feats:
            print(f"    {f:20s} {c:+6.2f}")

    if chem_feats:
        print(f"\n  Chemistry (ref={ref_chem}):")
        for f, c in chem_feats:
            print(f"    {f:20s} {c:+6.2f}")

    if arsenal_feats:
        print(f"\n  Arsenal:")
        for f, c in arsenal_feats:
            print(f"    {f:20s} {c:+6.2f}")

    # ── Step 5: Deep outlier profiling ──
    print(f"\n  Step 5: Deep Outlier Profiling")
    profile_outliers(sub, pred, grades_opt, y, is_pitcher, stat_cols)

    # ── Step 6: Remaining misgraded list ──
    wrong = [i for i in range(n) if sub.iloc[i]['OVR_letter'] != grades_opt[i]]
    print(f"\n  Step 6: Remaining misgraded ({len(wrong)}) — condensed table")
    if wrong:
        print(f"    {'Name':28s} {'Actual':>5s} {'Pred':>5s} {'Raw':>6s} {'Resid':>6s} "
              f"{'Pos':>5s} {'V':>2s} {'U':>2s} {'Traits'}")
        for idx in wrong:
            row = sub.iloc[idx]
            v = versatility_score(row['S_Pos'])
            u = 'Y' if (row['Trait1'] == 'Utility' or row['Trait2'] == 'Utility') else '.'
            traits = '/'.join(filter(None, [row['Trait1'], row['Trait2']])) or '-'
            print(f"    {row['Name']:28s} {row['OVR_letter']:>5s} {grades_opt[idx]:>5s} "
                  f"{pred[idx]:6.1f} {y[idx]-pred[idx]:+6.1f} {row['P_Pos']:>5s} "
                  f"{v:2d} {u:>2s} {traits}")

    return sub, pred, grades_opt, opt_exact, opt_bounds, boundary_list, lr, feat_names


def main():
    df = parse_md(FILEPATH)
    df['is_pitcher'] = df['P_Pos'].isin(PITCHER_POSITIONS)
    print(f"Parsed {len(df)} players — "
          f"{(~df['is_pitcher']).sum()} hitters, "
          f"{df['is_pitcher'].sum()} pitchers")

    # Versatility distribution
    df['_vscore'] = df['S_Pos'].apply(versatility_score)
    print(f"\nVersatility distribution:")
    for v in sorted(df['_vscore'].unique()):
        cnt = (df['_vscore'] == v).sum()
        bar = '█' * cnt
        print(f"  V={v}: {cnt:3d} {bar}")
    df.drop('_vscore', axis=1, inplace=True)

    # Hitters
    h_sub, h_pred, h_grades, h_exact, h_bounds, h_bl, h_lr, h_feat = \
        solve_role(df, False, "HITTERS")

    # Pitchers
    p_sub, p_pred, p_grades, p_exact, p_bounds, p_bl, p_lr, p_feat = \
        solve_role(df, True, "PITCHERS")

    # ── GRAND SUMMARY ──
    total = len(h_sub) + len(p_sub)
    exact = h_exact + p_exact

    print(f"\n\n{'='*80}")
    print(f"  GRAND SUMMARY — v8")
    print(f"{'='*80}")
    print(f"  Hitters:  {h_exact}/{len(h_sub)} ({h_exact/len(h_sub):.1%})")
    print(f"  Pitchers: {p_exact}/{len(p_sub)} ({p_exact/len(p_sub):.1%})")
    print(f"  Combined: {exact}/{total} ({exact/total:.1%})")

    h_y = h_sub['OVR_letter'].map(GRADE_MAP).values
    p_y = p_sub['OVR_letter'].map(GRADE_MAP).values
    all_actual = np.concatenate([h_sub['OVR_letter'].values, p_sub['OVR_letter'].values])
    all_grades = h_grades + p_grades
    all_resid = np.concatenate([h_y - h_pred, p_y - p_pred])

    within1 = sum(1 for a, g in zip(all_actual, all_grades)
                  if abs(GRADE_MAP[a] - GRADE_MAP[g]) <= 5) / total
    within2 = sum(1 for a, g in zip(all_actual, all_grades)
                  if abs(GRADE_MAP[a] - GRADE_MAP[g]) <= 10) / total
    print(f"  Within ±1: {within1:.1%}")
    print(f"  Within ±2: {within2:.1%}")
    print(f"  MAE: {np.mean(np.abs(all_resid)):.3f}")

    # Version comparison
    print(f"\n  Version comparison:")
    print(f"    v5 (OLS):              412/440 (93.6%)")
    print(f"    v6 (integer):          396/440 (90.0%)")
    print(f"    v7 (boundary opt):     416/440 (94.5%)")
    print(f"    v8 (versatility+int):  {exact}/440 ({exact/440:.1%})")


if __name__ == '__main__':
    main()
