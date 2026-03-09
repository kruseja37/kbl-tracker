#!/usr/bin/env python3
"""SMB4 OVR v8b — Regularization + trait bucketing comparison.

Goal: Close the 18% overfit gap (91.6% train vs 73.6% CV for hitters)
by reducing model complexity while preserving signal.

Approach A: Ridge regression sweep (shrink noisy trait coefficients)
Approach B: Collapse traits into signed buckets (+trait, -trait, neutral)
Approach C: Hybrid — buckets + Ridge + versatility
Approach D: Minimal model — stats + trait_count + bat + pos + versatility (no individual traits)

All approaches compared on:
  1. Train accuracy (default boundaries)
  2. 10-fold CV accuracy
  3. Boundary-optimized accuracy
  4. Overfit gap (train - CV)
"""

import pandas as pd
import numpy as np
import re
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.model_selection import cross_val_predict, KFold
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

VERSATILITY_MAP = {
    'IF/OF': 7, 'IF': 4, '1B/OF': 4, 'OF': 3, 'C/1B': 2, 'SP/RP': 2,
}


def versatility_score(s_pos):
    s = str(s_pos).strip()
    if not s or s in ('', '-', 'None', 'nan'):
        return 0
    return VERSATILITY_MAP.get(s, 1)


def grade_from_numeric(val, boundaries=None):
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


def optimize_boundaries(pred, actual_grades, grade_order):
    default_bounds = {g: GRADE_MAP[g] - 2.5 for g in grade_order}

    def make_bl(bounds):
        items = [(bounds[g], g) for g in grade_order]
        items.sort(key=lambda x: x[0])
        return items

    def count_exact_safe(bounds):
        bl = make_bl(bounds)
        total = 0
        for p, a in zip(pred, actual_grades):
            g = bl[0][1]
            for thresh, grade in bl:
                if p >= thresh:
                    g = grade
            if a == g:
                total += 1
        return total

    best_bounds = dict(default_bounds)
    best_exact = count_exact_safe(best_bounds)

    for _ in range(10):
        improved = False
        for grade in grade_order:
            current = best_bounds[grade]
            for delta in np.arange(-3.0, 3.1, 0.25):
                test_bounds = dict(best_bounds)
                test_bounds[grade] = current + delta
                ex = count_exact_safe(test_bounds)
                if ex > best_exact:
                    best_bounds[grade] = current + delta
                    best_exact = ex
                    improved = True
        if not improved:
            break

    return best_bounds, best_exact, make_bl(best_bounds)


# ────────────────────────────────────────────────────────────────────
#  Trait classification
# ────────────────────────────────────────────────────────────────────

# From v8 OLS coefficients — traits with |coef| > 1.0 are clearly signed
# Traits between -1 and +1 are "neutral" (noisy)

HITTER_POSITIVE_TRAITS = {
    'PWR vs RHP', 'Off-speed Hitter', 'High Pitch', 'Low Pitch',
    'Fastball Hitter', 'Mind Gamer', 'Bunter', 'CON vs RHP',
    'Tough Out', 'Rally Starter', 'Consistent', 'POW vs RHP',
    'First Pitch Slayer',
}
HITTER_NEGATIVE_TRAITS = {
    'Whiffer', 'Injury Prone', 'Volatile', 'First Pitch Prayer',
    'Choker', 'Slow Poke', 'Easy Target', 'Wild Thrower',
    'Noodle Arm', 'RBI Zero',
}
# Everything else is "neutral" — too small to matter individually

PITCHER_POSITIVE_TRAITS = {
    'Two Way (IF)', 'Elite 4', 'Reverse Splits', 'Stimulated',
    'Durable', 'Meltdown', 'Elite CF', 'Specialist',
    'Elite SL', 'Elite CH', 'Gets Ahead', 'K Collector',
    'Clutch',
}
PITCHER_NEGATIVE_TRAITS = {
    'K Neglecter', 'Falls Behind', 'Wild Thing', 'Easy Jumps',
    'Surrounded', 'Injury Prone', 'Consistent', 'BB Prone',
    'Volatile', 'Metal Head', 'Choker', 'Crossed Up',
}

# Further bucketing: "strong" traits (|coef| > 2.5) vs "moderate" (1.0 - 2.5)
HITTER_STRONG_POS = {'PWR vs RHP', 'Off-speed Hitter', 'High Pitch'}
HITTER_STRONG_NEG = {'Whiffer', 'Injury Prone', 'Volatile', 'First Pitch Prayer'}
PITCHER_STRONG_POS = {'Two Way (IF)', 'Elite 4', 'Reverse Splits'}
PITCHER_STRONG_NEG = {'K Neglecter', 'Falls Behind', 'Wild Thing', 'Easy Jumps', 'Surrounded'}


def build_features(sub, stat_cols, is_pitcher, mode='full'):
    """
    Build feature matrix with different trait representations.

    mode='full'      — v8 style: every trait gets its own dummy (47+ features)
    mode='buckets'   — 3 features: positive_count, negative_count, neutral_count
    mode='4buckets'  — 4 features: strong_pos, mod_pos, mod_neg, strong_neg
    mode='minimal'   — no individual traits, just trait_count
    mode='signed'    — 2 features: sum of signed trait values (+1/-1/0)
    """
    y = sub['OVR_letter'].map(GRADE_MAP).values.astype(float)
    features = []
    feat_names = []

    # Stats
    for s in stat_cols:
        features.append(sub[s].values.astype(float))
        feat_names.append(s)

    # Stat interactions
    if not is_pitcher:
        features.append(sub['POW'].values.astype(float) * sub['CON'].values.astype(float) / 100.0)
        feat_names.append('POW×CON/100')
    else:
        features.append(sub['JNK'].values.astype(float) * sub['ACC'].values.astype(float) / 100.0)
        feat_names.append('JNK×ACC/100')

    # ── TRAITS (varies by mode) ──
    if mode == 'full':
        all_traits = sorted(set(t for col in ['Trait1', 'Trait2'] for t in sub[col] if t))
        for trait in all_traits:
            indicator = ((sub['Trait1'] == trait) | (sub['Trait2'] == trait)).astype(int).values
            features.append(indicator)
            feat_names.append(f'TR:{trait}')

        # Also trait count
        tc = ((sub['Trait1'] != '').astype(int) + (sub['Trait2'] != '').astype(int)).values
        features.append(tc.astype(float))
        feat_names.append('trait_count')

    elif mode == 'buckets':
        pos_traits = PITCHER_POSITIVE_TRAITS if is_pitcher else HITTER_POSITIVE_TRAITS
        neg_traits = PITCHER_NEGATIVE_TRAITS if is_pitcher else HITTER_NEGATIVE_TRAITS

        def count_cat(row, cat_set):
            count = 0
            if row['Trait1'] in cat_set:
                count += 1
            if row['Trait2'] in cat_set:
                count += 1
            return count

        pos_count = sub.apply(lambda r: count_cat(r, pos_traits), axis=1).values.astype(float)
        neg_count = sub.apply(lambda r: count_cat(r, neg_traits), axis=1).values.astype(float)
        tc = ((sub['Trait1'] != '').astype(int) + (sub['Trait2'] != '').astype(int)).values.astype(float)
        neutral_count = tc - pos_count - neg_count

        features.append(pos_count)
        feat_names.append('pos_trait_count')
        features.append(neg_count)
        feat_names.append('neg_trait_count')
        features.append(neutral_count)
        feat_names.append('neutral_trait_count')

    elif mode == '4buckets':
        if is_pitcher:
            strong_pos = PITCHER_STRONG_POS
            strong_neg = PITCHER_STRONG_NEG
            mod_pos = PITCHER_POSITIVE_TRAITS - strong_pos
            mod_neg = PITCHER_NEGATIVE_TRAITS - strong_neg
        else:
            strong_pos = HITTER_STRONG_POS
            strong_neg = HITTER_STRONG_NEG
            mod_pos = HITTER_POSITIVE_TRAITS - strong_pos
            mod_neg = HITTER_NEGATIVE_TRAITS - strong_neg

        def count_cat(row, cat_set):
            return int(row['Trait1'] in cat_set) + int(row['Trait2'] in cat_set)

        features.append(sub.apply(lambda r: count_cat(r, strong_pos), axis=1).values.astype(float))
        feat_names.append('strong_pos_traits')
        features.append(sub.apply(lambda r: count_cat(r, mod_pos), axis=1).values.astype(float))
        feat_names.append('mod_pos_traits')
        features.append(sub.apply(lambda r: count_cat(r, mod_neg), axis=1).values.astype(float))
        feat_names.append('mod_neg_traits')
        features.append(sub.apply(lambda r: count_cat(r, strong_neg), axis=1).values.astype(float))
        feat_names.append('strong_neg_traits')

        # Also total trait count for "having any trait" bonus
        tc = ((sub['Trait1'] != '').astype(int) + (sub['Trait2'] != '').astype(int)).values
        features.append(tc.astype(float))
        feat_names.append('trait_count')

    elif mode == 'signed':
        pos_traits = PITCHER_POSITIVE_TRAITS if is_pitcher else HITTER_POSITIVE_TRAITS
        neg_traits = PITCHER_NEGATIVE_TRAITS if is_pitcher else HITTER_NEGATIVE_TRAITS

        def signed_sum(row):
            val = 0
            for t in [row['Trait1'], row['Trait2']]:
                if t in pos_traits:
                    val += 1
                elif t in neg_traits:
                    val -= 1
            return val

        signed = sub.apply(signed_sum, axis=1).values.astype(float)
        features.append(signed)
        feat_names.append('trait_signed_sum')
        tc = ((sub['Trait1'] != '').astype(int) + (sub['Trait2'] != '').astype(int)).values
        features.append(tc.astype(float))
        feat_names.append('trait_count')

    elif mode == 'minimal':
        tc = ((sub['Trait1'] != '').astype(int) + (sub['Trait2'] != '').astype(int)).values
        features.append(tc.astype(float))
        feat_names.append('trait_count')

    # Bat hand
    for bat in ['L', 'S']:
        features.append((sub['Bat'] == bat).astype(int).values)
        feat_names.append(f'Bat={bat}')

    # Throw hand
    features.append((sub['Thr'] == 'L').astype(int).values)
    feat_names.append('Thr=L')

    # Gender
    features.append((sub['Gender'] == 'F').astype(int).values)
    feat_names.append('Female')

    # Versatility
    v_scores = sub['S_Pos'].apply(versatility_score).values.astype(float)
    features.append(v_scores)
    feat_names.append('versatility')
    has_utility = ((sub['Trait1'] == 'Utility') | (sub['Trait2'] == 'Utility')).astype(int).values
    features.append(v_scores * has_utility)
    feat_names.append('versatility×utility')

    # Position dummies
    positions = sorted(sub['P_Pos'].unique())
    for pos in positions[1:]:
        features.append((sub['P_Pos'] == pos).astype(int).values)
        feat_names.append(f'Pos={pos}')

    # Chemistry dummies
    chems = sorted([c for c in sub['Chem'].unique() if c])
    for chem in chems[1:]:
        features.append((sub['Chem'] == chem).astype(int).values)
        feat_names.append(f'Chem={chem}')

    # Pitcher arsenal
    if is_pitcher:
        features.append(sub['Arsenal_str'].apply(
            lambda x: len([p for p in x.split('|') if p.strip()]) if x.strip() else 0
        ).values.astype(float))
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
    return X, y, feat_names


def evaluate_model(X, y, actual_grades, model_cls, model_kwargs=None, n_folds=10):
    """Evaluate a model: train accuracy, CV accuracy, boundary-optimized accuracy."""
    if model_kwargs is None:
        model_kwargs = {}

    model = model_cls(**model_kwargs)
    model.fit(X, y)
    pred_train = model.predict(X)

    # Train accuracy (default boundaries)
    grades_train = [grade_from_numeric(p) for p in pred_train]
    train_exact = sum(1 for a, g in zip(actual_grades, grades_train) if a == g)

    # CV accuracy
    kf = KFold(n_splits=n_folds, shuffle=True, random_state=42)
    cv_pred = cross_val_predict(model_cls(**model_kwargs), X, y, cv=kf)
    cv_grades = [grade_from_numeric(p) for p in cv_pred]
    cv_exact = sum(1 for a, g in zip(actual_grades, cv_grades) if a == g)
    cv_within1 = sum(1 for a, g in zip(actual_grades, cv_grades)
                     if abs(GRADE_MAP[a] - GRADE_MAP[g]) <= 5)

    # Boundary-optimized accuracy
    _, opt_exact, opt_bl = optimize_boundaries(pred_train, actual_grades, GRADE_ORDER)

    # CV boundary-optimized (optimize on CV predictions)
    _, cv_opt_exact, _ = optimize_boundaries(cv_pred, actual_grades, GRADE_ORDER)

    n = len(y)
    mae_train = np.mean(np.abs(y - pred_train))
    mae_cv = np.mean(np.abs(y - cv_pred))

    return {
        'n': n,
        'n_features': X.shape[1],
        'train_exact': train_exact,
        'train_pct': train_exact / n,
        'cv_exact': cv_exact,
        'cv_pct': cv_exact / n,
        'cv_within1': cv_within1,
        'cv_within1_pct': cv_within1 / n,
        'opt_exact': opt_exact,
        'opt_pct': opt_exact / n,
        'cv_opt_exact': cv_opt_exact,
        'cv_opt_pct': cv_opt_exact / n,
        'overfit_gap': (train_exact - cv_exact) / n,
        'mae_train': mae_train,
        'mae_cv': mae_cv,
        'model': model,
        'pred_train': pred_train,
        'cv_pred': cv_pred,
    }


def print_comparison(results, label):
    """Print a nice comparison table."""
    print(f"\n{'='*100}")
    print(f"  {label}")
    print(f"{'='*100}")
    print(f"  {'Approach':<45s} {'Feats':>5s} {'Train':>8s} {'CV':>8s} {'Opt':>8s} "
          f"{'CV+Opt':>8s} {'Gap':>7s} {'CV±1':>8s} {'MAE-CV':>6s}")
    print(f"  {'-'*45} {'-'*5} {'-'*8} {'-'*8} {'-'*8} {'-'*8} {'-'*7} {'-'*8} {'-'*6}")

    for name, r in results.items():
        print(f"  {name:<45s} {r['n_features']:5d} "
              f"{r['train_exact']:3d}/{r['n']:3d} "
              f"{r['cv_exact']:3d}/{r['n']:3d} "
              f"{r['opt_exact']:3d}/{r['n']:3d} "
              f"{r['cv_opt_exact']:3d}/{r['n']:3d} "
              f"{r['overfit_gap']:+6.1%} "
              f"{r['cv_within1']:3d}/{r['n']:3d} "
              f"{r['mae_cv']:5.2f}")

    # Find best by CV+Opt (most realistic "production" accuracy)
    best_name = max(results, key=lambda k: results[k]['cv_opt_pct'])
    best = results[best_name]
    print(f"\n  ★ Best CV+Opt: {best_name} → {best['cv_opt_exact']}/{best['n']} ({best['cv_opt_pct']:.1%})")

    # Find best by raw CV (most honest generalization)
    best_cv = max(results, key=lambda k: results[k]['cv_pct'])
    r = results[best_cv]
    print(f"  ★ Best raw CV: {best_cv} → {r['cv_exact']}/{r['n']} ({r['cv_pct']:.1%})")

    # Smallest overfit gap
    min_gap = min(results, key=lambda k: abs(results[k]['overfit_gap']))
    r = results[min_gap]
    print(f"  ★ Smallest gap: {min_gap} → {r['overfit_gap']:+.1%}")


def deep_coefficient_analysis(results, feat_names_dict, stat_cols, is_pitcher, label):
    """For the best model, print a clean coefficient table."""
    # Pick the best CV model
    best_name = max(results, key=lambda k: results[k]['cv_opt_pct'])
    best = results[best_name]
    model = best['model']

    print(f"\n  ── COEFFICIENT ANALYSIS: {best_name} ({label}) ──")

    feat_names = feat_names_dict[best_name]
    coefs = model.coef_ if hasattr(model, 'coef_') else None
    if coefs is None:
        print("    (no coefficients available)")
        return

    intercept = model.intercept_

    print(f"    Intercept: {intercept:.4f}")
    print(f"\n    {'Feature':<35s} {'Coef':>8s}")
    print(f"    {'-'*35} {'-'*8}")

    # Sort by abs(coef) descending
    pairs = list(zip(feat_names, coefs))

    # Group: stats first, then traits, then others
    stats_p = [(f, c) for f, c in pairs if f in stat_cols or '×' in f and 'versatility' not in f and 'utility' not in f]
    vers_p = [(f, c) for f, c in pairs if 'versatility' in f or 'utility' in f]
    trait_p = [(f, c) for f, c in pairs if f.startswith('TR:') or 'trait' in f.lower()]
    other_p = [(f, c) for f, c in pairs if (f, c) not in stats_p + vers_p + trait_p]

    for group_name, group in [("Stats", stats_p), ("Versatility", vers_p),
                                ("Traits", trait_p), ("Other", other_p)]:
        if group:
            print(f"\n    [{group_name}]")
            group.sort(key=lambda x: -abs(x[1]))
            for f, c in group:
                bar = '█' * int(abs(c) * 2)
                sign = '+' if c >= 0 else '-'
                print(f"    {f:<35s} {c:+8.4f}  {bar}")


def main():
    df = parse_md(FILEPATH)
    df['is_pitcher'] = df['P_Pos'].isin(PITCHER_POSITIONS)
    print(f"Parsed {len(df)} players — "
          f"{(~df['is_pitcher']).sum()} hitters, "
          f"{df['is_pitcher'].sum()} pitchers")

    for is_pitcher, label in [(False, "HITTERS"), (True, "PITCHERS")]:
        sub = df[df['is_pitcher'] == is_pitcher].copy().reset_index(drop=True)
        stat_cols = ['VEL', 'JNK', 'ACC', 'FLD'] if is_pitcher else ['POW', 'CON', 'SPD', 'FLD', 'ARM']
        actual_grades = sub['OVR_letter'].values
        n = len(sub)

        results = {}
        feat_names_dict = {}

        # ── A. v8 baseline (full traits, OLS) ──
        X_full, y, fn_full = build_features(sub, stat_cols, is_pitcher, mode='full')
        results['A1: v8 OLS (full traits)'] = evaluate_model(X_full, y, actual_grades, LinearRegression)
        feat_names_dict['A1: v8 OLS (full traits)'] = fn_full

        # ── A2-A5. Ridge with different alphas ──
        for alpha in [0.5, 2.0, 5.0, 10.0, 25.0, 50.0]:
            name = f'A2: Ridge α={alpha}'
            results[name] = evaluate_model(X_full, y, actual_grades, Ridge, {'alpha': alpha})
            feat_names_dict[name] = fn_full

        # ── B. 3-bucket traits ──
        X_buck, _, fn_buck = build_features(sub, stat_cols, is_pitcher, mode='buckets')
        results['B1: OLS 3-bucket traits'] = evaluate_model(X_buck, y, actual_grades, LinearRegression)
        feat_names_dict['B1: OLS 3-bucket traits'] = fn_buck

        results['B2: Ridge 3-bucket α=2'] = evaluate_model(X_buck, y, actual_grades, Ridge, {'alpha': 2.0})

        # ── C. 4-bucket traits (strong/moderate split) ──
        X_4b, _, fn_4b = build_features(sub, stat_cols, is_pitcher, mode='4buckets')
        results['C1: OLS 4-bucket traits'] = evaluate_model(X_4b, y, actual_grades, LinearRegression)
        feat_names_dict['C1: OLS 4-bucket traits'] = fn_4b

        results['C2: Ridge 4-bucket α=2'] = evaluate_model(X_4b, y, actual_grades, Ridge, {'alpha': 2.0})
        feat_names_dict['C2: Ridge 4-bucket α=2'] = fn_4b

        # ── D. Signed sum ──
        X_signed, _, fn_signed = build_features(sub, stat_cols, is_pitcher, mode='signed')
        results['D1: OLS signed-sum'] = evaluate_model(X_signed, y, actual_grades, LinearRegression)
        feat_names_dict['D1: OLS signed-sum'] = fn_signed

        # ── E. Minimal (no individual traits at all) ──
        X_min, _, fn_min = build_features(sub, stat_cols, is_pitcher, mode='minimal')
        results['E1: OLS minimal (trait count only)'] = evaluate_model(X_min, y, actual_grades, LinearRegression)
        feat_names_dict['E1: OLS minimal (trait count only)'] = fn_min

        results['E2: Ridge minimal α=2'] = evaluate_model(X_min, y, actual_grades, Ridge, {'alpha': 2.0})

        # ── Print comparison ──
        print_comparison(results, f"{label} (n={n})")

        # ── Coefficient analysis for best model ──
        deep_coefficient_analysis(results, feat_names_dict, stat_cols, is_pitcher, label)

    # ── FINAL: Best combined approach ──
    print(f"\n\n{'='*100}")
    print(f"  INTERPRETATION GUIDE")
    print(f"{'='*100}")
    print(f"""
  Train:  In-sample accuracy (optimistic, shows memorization)
  CV:     10-fold cross-validated (honest, simulates new players)
  Opt:    Train + boundary optimization (slightly optimistic)
  CV+Opt: CV predictions + boundary optimization (BEST realistic estimate)
  Gap:    Train - CV gap (high = overfitting)

  The "true" accuracy for predicting a new player's grade is between CV and CV+Opt.

  Key insight: Individual trait dummies cause massive overfitting because most traits
  appear on only 5-15 players. The model memorizes noise in those small groups.

  The game likely uses:
    1. Weighted stat sum (the big driver)
    2. A simple trait adjustment system (positive/negative/neutral bucket, NOT per-trait)
    3. Position adjustment
    4. Bat hand adjustment
    5. Versatility bonus (graduated, with Utility multiplier)
    6. Round to nearest grade
""")


if __name__ == '__main__':
    main()
