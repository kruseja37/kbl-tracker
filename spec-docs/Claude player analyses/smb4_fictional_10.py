#!/usr/bin/env python3
"""Create 10 fictional SMB4 players and grade them using the v8b 4-bucket formula.
All first/last names pulled from SMB4 Names Database.xlsx."""

import numpy as np

GRADE_MAP = {
    'S': 97, 'A+': 92, 'A': 87, 'A-': 82,
    'B+': 77, 'B': 72, 'B-': 67,
    'C+': 62, 'C': 57, 'C-': 52,
    'D+': 47, 'D': 42, 'D-': 37,
    'E+': 32, 'E': 27, 'E-': 22, 'F': 15
}

# ── 4-bucket trait classification (from v8b analysis) ──
HITTER_STRONG_POS = {'PWR vs RHP', 'Off-speed Hitter', 'High Pitch'}
HITTER_MOD_POS = {'Low Pitch', 'Fastball Hitter', 'Mind Gamer', 'Bunter', 'CON vs RHP',
                  'Tough Out', 'Rally Starter', 'Consistent', 'POW vs RHP', 'First Pitch Slayer'}
HITTER_MOD_NEG = {'Slow Poke', 'Easy Target', 'Wild Thrower', 'Noodle Arm', 'RBI Zero', 'Choker'}
HITTER_STRONG_NEG = {'Whiffer', 'Injury Prone', 'Volatile', 'First Pitch Prayer'}

PITCHER_STRONG_POS = {'Two Way (IF)', 'Elite 4', 'Reverse Splits'}
PITCHER_MOD_POS = {'Stimulated', 'Durable', 'Meltdown', 'Elite CF', 'Specialist',
                   'Elite SL', 'Elite CH', 'Gets Ahead', 'K Collector', 'Clutch'}
PITCHER_MOD_NEG = {'Injury Prone', 'Consistent', 'BB Prone', 'Volatile', 'Metal Head',
                   'Choker', 'Crossed Up'}
PITCHER_STRONG_NEG = {'K Neglecter', 'Falls Behind', 'Wild Thing', 'Easy Jumps', 'Surrounded'}

VERSATILITY_MAP = {'IF/OF': 7, 'IF': 4, '1B/OF': 4, 'OF': 3, 'C/1B': 2, 'SP/RP': 2}

# ── Coefficients from C1: OLS 4-bucket ──
HITTER_COEFS = {
    'intercept': 12.0097,
    'POW': 0.2696, 'CON': 0.2708, 'SPD': 0.1772, 'FLD': 0.0851, 'ARM': 0.0920,
    'POW×CON/100': 0.0061,
    'versatility': 0.2248, 'versatility×utility': 0.1875,
    'strong_pos': 3.3900, 'mod_pos': 1.7140, 'mod_neg': -1.8663, 'strong_neg': -2.8534,
    'trait_count': 0.4608,
    'Bat=L': 2.7642, 'Bat=S': 5.6922,
    'Thr=L': 0.0651, 'Female': 0.6729,
    'Pos=C': 3.0759, 'Pos=2B': 1.7655, 'Pos=SS': 1.7853, 'Pos=CF': 1.6603,
    'Pos=3B': -0.4938, 'Pos=LF': -0.1204, 'Pos=RF': 0.0306,
    'Chem=Crafty': -0.3770, 'Chem=Disciplined': -0.3843,
    'Chem=Scholarly': -0.7611, 'Chem=Spirited': -0.3890,
}

PITCHER_COEFS = {
    'intercept': 14.8011,
    'VEL': 0.2533, 'JNK': 0.2771, 'ACC': 0.2835, 'FLD': 0.0362,
    'JNK×ACC/100': -0.0097,
    'versatility': 0.0, 'versatility×utility': 0.0,
    'strong_pos': 3.8646, 'mod_pos': 1.6225, 'mod_neg': -1.5013, 'strong_neg': -3.4166,
    'trait_count': 1.3525,
    'Bat=L': 1.0292, 'Bat=S': 2.0596,
    'Thr=L': -0.4206, 'Female': 0.0746,
    'Pos=SP': 0.1067, 'Pos=RP': -0.3459, 'Pos=SP/RP': -1.1155,
    'Chem=Crafty': -0.2504, 'Chem=Disciplined': -0.4989,
    'Chem=Scholarly': -0.9522, 'Chem=Spirited': -0.2592,
    'arsenal_count': 1.2618,
    'Pitch:4F': 0.6994, 'Pitch:2F': 0.4632, 'Pitch:CF': 0.3583,
    'Pitch:SL': 0.1616, 'Pitch:CB': 0.0962, 'Pitch:FK': -0.0942,
    'Pitch:SB': -0.0293, 'Pitch:CH': -0.3933,
}


def v_score(s_pos):
    if not s_pos:
        return 0
    return VERSATILITY_MAP.get(s_pos, 1)


def classify_traits_hitter(t1, t2):
    traits = [t for t in [t1, t2] if t]
    return (sum(1 for t in traits if t in HITTER_STRONG_POS),
            sum(1 for t in traits if t in HITTER_MOD_POS),
            sum(1 for t in traits if t in HITTER_MOD_NEG),
            sum(1 for t in traits if t in HITTER_STRONG_NEG),
            len(traits))


def classify_traits_pitcher(t1, t2):
    traits = [t for t in [t1, t2] if t]
    return (sum(1 for t in traits if t in PITCHER_STRONG_POS),
            sum(1 for t in traits if t in PITCHER_MOD_POS),
            sum(1 for t in traits if t in PITCHER_MOD_NEG),
            sum(1 for t in traits if t in PITCHER_STRONG_NEG),
            len(traits))


def grade_from_numeric(val):
    best_grade, best_dist = 'F', abs(val - 15)
    for letter, center in GRADE_MAP.items():
        d = abs(val - center)
        if d < best_dist:
            best_dist = d
            best_grade = letter
    return best_grade


def calc_hitter(p):
    c = HITTER_COEFS
    ovr = c['intercept']
    ovr += c['POW'] * p['POW'] + c['CON'] * p['CON'] + c['SPD'] * p['SPD']
    ovr += c['FLD'] * p['FLD'] + c['ARM'] * p['ARM']
    ovr += c['POW×CON/100'] * p['POW'] * p['CON'] / 100.0
    vs = v_score(p.get('S_Pos', ''))
    has_util = 'Utility' in [p.get('Trait1', ''), p.get('Trait2', '')]
    ovr += c['versatility'] * vs
    ovr += c['versatility×utility'] * vs * (1 if has_util else 0)
    sp, mp, mn, sn, tc = classify_traits_hitter(p.get('Trait1', ''), p.get('Trait2', ''))
    ovr += c['strong_pos'] * sp + c['mod_pos'] * mp
    ovr += c['mod_neg'] * mn + c['strong_neg'] * sn
    ovr += c['trait_count'] * tc
    bat = p.get('Bat', 'R')
    if bat == 'L': ovr += c['Bat=L']
    elif bat == 'S': ovr += c['Bat=S']
    if p.get('Thr') == 'L': ovr += c['Thr=L']
    if p.get('Gender') == 'F': ovr += c['Female']
    ovr += c.get(f"Pos={p['P_Pos']}", 0)
    ovr += c.get(f"Chem={p.get('Chem', 'Competitive')}", 0)
    return ovr


def calc_pitcher(p):
    c = PITCHER_COEFS
    ovr = c['intercept']
    ovr += c['VEL'] * p['VEL'] + c['JNK'] * p['JNK'] + c['ACC'] * p['ACC']
    ovr += c['FLD'] * p['FLD']
    ovr += c['JNK×ACC/100'] * p['JNK'] * p['ACC'] / 100.0
    sp, mp, mn, sn, tc = classify_traits_pitcher(p.get('Trait1', ''), p.get('Trait2', ''))
    ovr += c['strong_pos'] * sp + c['mod_pos'] * mp
    ovr += c['mod_neg'] * mn + c['strong_neg'] * sn
    ovr += c['trait_count'] * tc
    bat = p.get('Bat', 'R')
    if bat == 'L': ovr += c['Bat=L']
    elif bat == 'S': ovr += c['Bat=S']
    if p.get('Thr') == 'L': ovr += c['Thr=L']
    if p.get('Gender') == 'F': ovr += c['Female']
    ovr += c.get(f"Pos={p['P_Pos']}", 0)
    ovr += c.get(f"Chem={p.get('Chem', 'Competitive')}", 0)
    pitches = [x.strip() for x in p.get('Arsenal', '').split('|') if x.strip()]
    ovr += c['arsenal_count'] * len(pitches)
    for pitch in pitches:
        ovr += c.get(f'Pitch:{pitch}', 0)
    return ovr


# ════════════════════════════════════════════════════════════════
#  10 FICTIONAL PLAYERS (all names from SMB4 Names Database.xlsx)
# ════════════════════════════════════════════════════════════════

players = [
    # 1. Elite power 1B — switch hitter, strong positive trait, pure slugger profile
    {
        'Name': 'Brick Hammerhead', 'Gender': 'M', 'Age': 31,
        'P_Pos': '1B', 'S_Pos': '',
        'Bat': 'S', 'Thr': 'R', 'Chem': 'Competitive',
        'POW': 99, 'CON': 82, 'SPD': 28, 'FLD': 42, 'ARM': 38,
        'Trait1': 'PWR vs RHP', 'Trait2': 'Tough Out',
        'type': 'hitter',
        'desc': 'Prototypical cleanup hitter. Monster power, switch hits, but runs like he\'s underwater.',
    },
    # 2. Female SS with IF secondary — contact/speed, the classic shortstop build
    {
        'Name': 'Zara Swiftstep', 'Gender': 'F', 'Age': 24,
        'P_Pos': 'SS', 'S_Pos': 'IF',
        'Bat': 'L', 'Thr': 'R', 'Chem': 'Disciplined',
        'POW': 22, 'CON': 72, 'SPD': 96, 'FLD': 84, 'ARM': 68,
        'Trait1': 'Rally Starter', 'Trait2': 'Sprinter',
        'type': 'hitter',
        'desc': 'Leadoff prototype. Gets on base and steals with ease. Zero pop.',
    },
    # 3. The Dexterez archetype — IF/OF + Utility, mediocre stats everywhere
    {
        'Name': 'Flip Everdale', 'Gender': 'M', 'Age': 27,
        'P_Pos': '2B', 'S_Pos': 'IF/OF',
        'Bat': 'R', 'Thr': 'R', 'Chem': 'Scholarly',
        'POW': 52, 'CON': 58, 'SPD': 63, 'FLD': 68, 'ARM': 52,
        'Trait1': 'Utility', 'Trait2': 'Consistent',
        'type': 'hitter',
        'desc': 'Can play every position. Master of none, but never hurts you. The ultimate bench piece.',
    },
    # 4. All-or-nothing RF — huge power, double strong-negative traits
    {
        'Name': 'Crush Dingers', 'Gender': 'M', 'Age': 29,
        'P_Pos': 'RF', 'S_Pos': '',
        'Bat': 'R', 'Thr': 'R', 'Chem': 'Spirited',
        'POW': 97, 'CON': 38, 'SPD': 45, 'FLD': 32, 'ARM': 55,
        'Trait1': 'Whiffer', 'Trait2': 'Volatile',
        'type': 'hitter',
        'desc': 'When he connects it leaves the stadium. Trouble is, he rarely connects.',
    },
    # 5. Defensive catcher — glove-first, no bat, traitless
    {
        'Name': 'Bloop Butterberger', 'Gender': 'M', 'Age': 33,
        'P_Pos': 'C', 'S_Pos': '',
        'Bat': 'R', 'Thr': 'R', 'Chem': 'Crafty',
        'POW': 28, 'CON': 33, 'SPD': 18, 'FLD': 92, 'ARM': 97,
        'Trait1': '', 'Trait2': '',
        'type': 'hitter',
        'desc': 'Iron wall behind the plate. Opposing runners don\'t even try. Batting average is another story.',
    },
    # 6. Female CF — switch bat, moderate negative, well-rounded speed build
    {
        'Name': 'Dainty Breeze', 'Gender': 'F', 'Age': 22,
        'P_Pos': 'CF', 'S_Pos': 'OF',
        'Bat': 'S', 'Thr': 'R', 'Chem': 'Competitive',
        'POW': 48, 'CON': 57, 'SPD': 82, 'FLD': 68, 'ARM': 42,
        'Trait1': 'Noodle Arm', 'Trait2': '',
        'type': 'hitter',
        'desc': 'Covers center field like a blanket. Runners tag up on anything though — that arm.',
    },
    # 7. Ace SP — elite stuff across the board, strong positive traits
    {
        'Name': 'Blaze Heater', 'Gender': 'M', 'Age': 28,
        'P_Pos': 'SP', 'S_Pos': '',
        'Bat': 'R', 'Thr': 'R', 'Chem': 'Competitive',
        'VEL': 96, 'JNK': 78, 'ACC': 83, 'FLD': 48,
        'Trait1': 'Elite 4', 'Trait2': 'K Collector',
        'Arsenal': '4F|SL|CB|CH',
        'type': 'pitcher',
        'desc': 'Front-of-rotation arm. Blows it by hitters and puts them away with the slider.',
    },
    # 8. Junkball RP — low velo, high movement/control, mixed traits
    {
        'Name': 'Curly Flan', 'Gender': 'M', 'Age': 35,
        'P_Pos': 'RP', 'S_Pos': '',
        'Bat': 'R', 'Thr': 'L', 'Chem': 'Crafty',
        'VEL': 28, 'JNK': 92, 'ACC': 78, 'FLD': 44,
        'Trait1': 'Specialist', 'Trait2': 'BB Prone',
        'Arsenal': 'SL|CH|CB',
        'type': 'pitcher',
        'desc': 'Throws 50mph junk that looks like a beach ball and somehow still gets outs. Walks a few too.',
    },
    # 9. Two-way SP/RP — solid all-around, pays dual-role tax
    {
        'Name': 'Danger Dangerfield', 'Gender': 'M', 'Age': 26,
        'P_Pos': 'SP/RP', 'S_Pos': '',
        'Bat': 'L', 'Thr': 'R', 'Chem': 'Disciplined',
        'VEL': 72, 'JNK': 68, 'ACC': 74, 'FLD': 52,
        'Trait1': 'Reverse Splits', 'Trait2': 'Durable',
        'Arsenal': '2F|CF|SB|FK',
        'type': 'pitcher',
        'desc': 'Starts or relieves. Never misses a game. Hitters have no idea what his arm slot does.',
    },
    # 10. Raw female flamethrower CP — max velo, nothing else, strong negative
    {
        'Name': 'Prowlette Fuego', 'Gender': 'F', 'Age': 20,
        'P_Pos': 'CP', 'S_Pos': '',
        'Bat': 'R', 'Thr': 'L', 'Chem': 'Spirited',
        'VEL': 99, 'JNK': 32, 'ACC': 22, 'FLD': 28,
        'Trait1': 'Wild Thing', 'Trait2': '',
        'Arsenal': '4F|SL',
        'type': 'pitcher',
        'desc': 'Throws 100 and has zero idea where it\'s going. Terrifying for hitters and teammates alike.',
    },
]


def fmt_traits(p):
    parts = [t for t in [p.get('Trait1', ''), p.get('Trait2', '')] if t]
    return ' / '.join(parts) if parts else '(none)'


def trait_bucket_label(p):
    t1 = p.get('Trait1', '')
    t2 = p.get('Trait2', '')
    labels = []
    for t in [t1, t2]:
        if not t: continue
        if p['type'] == 'hitter':
            if t in HITTER_STRONG_POS: labels.append(f'★+ {t}')
            elif t in HITTER_MOD_POS: labels.append(f' + {t}')
            elif t in HITTER_MOD_NEG: labels.append(f' - {t}')
            elif t in HITTER_STRONG_NEG: labels.append(f'★- {t}')
            else: labels.append(f' ~ {t}')
        else:
            if t in PITCHER_STRONG_POS: labels.append(f'★+ {t}')
            elif t in PITCHER_MOD_POS: labels.append(f' + {t}')
            elif t in PITCHER_MOD_NEG: labels.append(f' - {t}')
            elif t in PITCHER_STRONG_NEG: labels.append(f'★- {t}')
            else: labels.append(f' ~ {t}')
    return '  |  '.join(labels) if labels else '—'


# ── Main output ──
print("=" * 105)
print("  10 FICTIONAL SMB4 PLAYERS — Graded by v8b 4-Bucket Formula")
print("  All names from SMB4 Names Database.xlsx")
print("=" * 105)

for i, p in enumerate(players, 1):
    is_pitcher = p['type'] == 'pitcher'
    raw_ovr = calc_pitcher(p) if is_pitcher else calc_hitter(p)
    grade = grade_from_numeric(raw_ovr)

    print(f"\n  ┌─────────────────────────────────────────────────────────────────────────────")
    print(f"  │  #{i}  {p['Name']:<28s} {p['Gender']}/Age {p['Age']}   "
          f"Bat: {p['Bat']}  Thr: {p.get('Thr','R')}  Chem: {p.get('Chem','Competitive')}")
    print(f"  │  Pos: {p['P_Pos']}", end='')
    if p.get('S_Pos'):
        vs = v_score(p['S_Pos'])
        print(f"  →  Secondary: {p['S_Pos']} (V={vs})", end='')
    print()

    if is_pitcher:
        print(f"  │  VEL {p['VEL']:3d}   JNK {p['JNK']:3d}   ACC {p['ACC']:3d}   FLD {p['FLD']:3d}")
        pitches = [x.strip() for x in p.get('Arsenal', '').split('|') if x.strip()]
        print(f"  │  Arsenal: {' | '.join(pitches)} ({len(pitches)} pitches)")
    else:
        print(f"  │  POW {p['POW']:3d}   CON {p['CON']:3d}   SPD {p['SPD']:3d}   FLD {p['FLD']:3d}   ARM {p['ARM']:3d}")

    print(f"  │  Traits: {fmt_traits(p)}")
    print(f"  │  Buckets: {trait_bucket_label(p)}")
    print(f"  │")
    print(f"  │  \"{p['desc']}\"")
    print(f"  │")

    # Show formula breakdown
    if is_pitcher:
        c = PITCHER_COEFS
        stat_total = c['VEL']*p['VEL'] + c['JNK']*p['JNK'] + c['ACC']*p['ACC'] + c['FLD']*p['FLD']
        interact = c['JNK×ACC/100'] * p['JNK'] * p['ACC'] / 100
        sp, mp, mn, sn, tc = classify_traits_pitcher(p.get('Trait1',''), p.get('Trait2',''))
    else:
        c = HITTER_COEFS
        stat_total = (c['POW']*p['POW'] + c['CON']*p['CON'] + c['SPD']*p['SPD']
                      + c['FLD']*p['FLD'] + c['ARM']*p['ARM'])
        interact = c['POW×CON/100'] * p['POW'] * p['CON'] / 100
        sp, mp, mn, sn, tc = classify_traits_hitter(p.get('Trait1',''), p.get('Trait2',''))

    trait_total = c['strong_pos']*sp + c['mod_pos']*mp + c['mod_neg']*mn + c['strong_neg']*sn + c['trait_count']*tc
    bat_val = c.get(f"Bat={p['Bat']}", 0) if p['Bat'] != 'R' else 0
    pos_val = c.get(f"Pos={p['P_Pos']}", 0)
    chem_val = c.get(f"Chem={p.get('Chem','Competitive')}", 0)
    misc = 0
    if p.get('Thr') == 'L': misc += c.get('Thr=L', 0)
    if p.get('Gender') == 'F': misc += c.get('Female', 0)

    if not is_pitcher:
        vs = v_score(p.get('S_Pos', ''))
        has_util = 'Utility' in [p.get('Trait1',''), p.get('Trait2','')]
        vers_total = c['versatility']*vs + c['versatility×utility']*vs*(1 if has_util else 0)
    else:
        vers_total = 0

    arsenal_total = 0
    if is_pitcher:
        pitches = [x.strip() for x in p.get('Arsenal', '').split('|') if x.strip()]
        arsenal_total = c['arsenal_count'] * len(pitches)
        for pitch in pitches:
            arsenal_total += c.get(f'Pitch:{pitch}', 0)

    print(f"  │  BREAKDOWN:")
    print(f"  │    Base intercept ........... {c['intercept']:+7.2f}")
    print(f"  │    Stat weights ............. {stat_total:+7.2f}  (the big driver)")
    if abs(interact) > 0.01:
        print(f"  │    Stat interaction ......... {interact:+7.2f}")
    if abs(trait_total) > 0.01:
        print(f"  │    Trait adjustments ........ {trait_total:+7.2f}  ({sp}★+ {mp}+ {mn}- {sn}★-  count={tc})")
    if abs(bat_val) > 0.01:
        print(f"  │    Bat hand ({p['Bat']}) ............. {bat_val:+7.2f}")
    if abs(pos_val) > 0.01:
        ref = '1B' if not is_pitcher else 'CP'
        print(f"  │    Position (vs {ref}) ........ {pos_val:+7.2f}")
    if abs(chem_val) > 0.01:
        print(f"  │    Chemistry ................ {chem_val:+7.2f}")
    if abs(vers_total) > 0.01:
        print(f"  │    Versatility .............. {vers_total:+7.2f}")
    if abs(arsenal_total) > 0.01:
        print(f"  │    Arsenal .................. {arsenal_total:+7.2f}")
    if abs(misc) > 0.01:
        print(f"  │    Other (thr/gender) ....... {misc:+7.2f}")
    print(f"  │                              ─────────")
    print(f"  │    TOTAL .................... {raw_ovr:+7.2f}  →  ██  {grade}  ██")
    print(f"  └─────────────────────────────────────────────────────────────────────────────")


# ── Summary card ──
print(f"\n\n{'=' * 105}")
print(f"  ROSTER CARD — SUMMARY")
print(f"{'=' * 105}")
print(f"  {'#':>2s}  {'Name':<25s} {'Pos':>5s} {'2nd':>5s} {'Bat':>3s} {'G':>1s}  "
      f"{'Main Stats':>28s}  {'Traits':>28s} {'Raw':>6s} {'GRD':>4s}")
print(f"  {'─'*2}  {'─'*25} {'─'*5} {'─'*5} {'─'*3} {'─'*1}  {'─'*28}  {'─'*28} {'─'*6} {'─'*4}")

for i, p in enumerate(players, 1):
    is_pitcher = p['type'] == 'pitcher'
    raw_ovr = calc_pitcher(p) if is_pitcher else calc_hitter(p)
    grade = grade_from_numeric(raw_ovr)

    if is_pitcher:
        stats = f"V{p['VEL']:02d} J{p['JNK']:02d} A{p['ACC']:02d} F{p['FLD']:02d}"
    else:
        stats = f"P{p['POW']:02d} C{p['CON']:02d} S{p['SPD']:02d} F{p['FLD']:02d} A{p['ARM']:02d}"

    traits_str = fmt_traits(p)
    if len(traits_str) > 28: traits_str = traits_str[:25] + '...'

    print(f"  {i:2d}  {p['Name']:<25s} {p['P_Pos']:>5s} {p.get('S_Pos',''):>5s} "
          f"{p['Bat']:>3s} {p['Gender']:>1s}  {stats:>28s}  {traits_str:>28s} "
          f"{raw_ovr:6.1f} {grade:>4s}")

# ── Grade distribution ──
grades = []
for p in players:
    is_pitcher = p['type'] == 'pitcher'
    raw = calc_pitcher(p) if is_pitcher else calc_hitter(p)
    grades.append(grade_from_numeric(raw))

print(f"\n  Grade distribution: ", end='')
from collections import Counter
for g, cnt in sorted(Counter(grades).items(), key=lambda x: -GRADE_MAP[x[0]]):
    print(f"{g}({cnt}) ", end='')
print()
