#!/usr/bin/env python3
"""SMB4 reverse-engineered grading + fictional player generator.

Model basis:
- Fitted on smb4_players_fixed.csv (440 SMB4 players)
- Uses the reverse-engineered equations documented in:
  spec-docs/SMB4_GRADE_ALGO_AND_POSITION_SPREAD.md

CLI examples:
  python smb4_grade_toolkit.py predict --input player.json
  python smb4_grade_toolkit.py predict-csv --input players.csv --output graded.csv
  python smb4_grade_toolkit.py generate --count 25 --kind mixed --grade B+ --output fictional_players.json --seed 7
  python smb4_grade_toolkit.py generate-archetype --archetype speed-defense --count 22 --output roster.json --seed 7
"""

from __future__ import annotations

import argparse
import csv
import json
import random
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

FULL_GRADE_SCALE = [
    "S", "A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "E+", "E", "E-", "F"
]
GRADE_TO_POINTS = {g: len(FULL_GRADE_SCALE) - 1 - i for i, g in enumerate(FULL_GRADE_SCALE)}
POINTS_TO_GRADE = {v: k for k, v in GRADE_TO_POINTS.items()}
GRADE_NUMERIC_CENTERS = {
    "S": 97,
    "A+": 92,
    "A": 87,
    "A-": 82,
    "B+": 77,
    "B": 72,
    "B-": 67,
    "C+": 62,
    "C": 57,
    "C-": 52,
    "D+": 47,
    "D": 42,
    "D-": 37,
    "E+": 32,
    "E": 27,
    "E-": 22,
    "F": 15,
}

PITCHER_POSITIONS = {"SP", "RP", "CP", "SP/RP"}
VERSATILITY_MAP = {"IF/OF": 7, "IF": 4, "1B/OF": 4, "OF": 3, "C/1B": 2, "SP/RP": 2}

# Reverse-engineered coefficients
HITTER_COEF = {
    "intercept": -0.8294,
    "base_weighted": 0.1849,
    "pos_traits": 0.1750,
    "neg_traits": -0.2969,
    "is_switch": 0.6924,
    "throws_left": 0.0457,
}

PITCHER_COEF = {
    "intercept": 0.7780,
    "base_weighted": 0.1628,
    "pos_traits": 0.2957,
    "neg_traits": -0.1912,
    "is_switch": -0.1512,
    "throws_left": 0.1600,
    "bat_pow": 0.0091,
    "bat_con": 0.0124,
    "bat_spd": 0.0017,
}

# Improved dependency-free models baked from the SMB4 roster.
# Hitters: Ridge(alpha=1.0), hybrid features, 81.2% train exact on hitters.
# Pitchers: Ridge(alpha=1.0), hybrid features, 87.7% train exact on pitchers.
HITTER_MODEL = {
    "intercept": 10.5965166711,
    "features": {
        "power": 0.2825983581,
        "contact": 0.2806503532,
        "speed": 0.2027213083,
        "fielding": 0.1147824982,
        "arm": 0.0915305332,
        "pow_con": -0.0088454122,
        "spd_fld": -0.0336045706,
        "bat_L": 2.8497389733,
        "bat_S": 4.5116226727,
        "thr_L": -0.6571546448,
        "vers": 0.0850728147,
        "vers2": 0.0129488446,
        "vers_util": 0.1909373936,
        "pos_count": 0.9656824071,
        "neg_count": -1.7517683256,
        "tr_First Pitch Slayer": 0.6985887989,
        "tr_Little Hack": -1.2708309640,
        "tr_Mind Gamer": 1.5014276130,
        "tr_Rally Starter": -0.1998738040,
        "tr_Magic Hands": -0.8310486121,
        "tr_Utility": -0.3052216719,
        "tr_Big Hack": -0.2192440495,
        "tr_Sprinter": -0.2816825373,
        "tr_Cannon Arm": -0.5417638949,
        "tr_Fastball Hitter": 2.4542565444,
        "tr_Bad Ball Hitter": -0.4592940132,
        "tr_Whiffer": -0.7381706008,
        "pos_2B": 0.8313525554,
        "pos_3B": -1.2668027922,
        "pos_C": 2.2997744611,
        "pos_CF": 0.6637032249,
        "pos_LF": -0.5614229268,
        "pos_RF": -0.1963177907,
        "pos_SS": 0.1115302985,
        "sec_1B": -0.0743925098,
        "sec_1B/OF": -0.9164565494,
        "sec_2B": 0.8398362231,
        "sec_3B": 0.3035512464,
        "sec_C": -0.8721695187,
        "sec_IF": 0.5288517627,
        "sec_LF": 0.0694935796,
        "sec_OF": 0.1776157661,
        "sec_RF": -0.4608455812,
        "sec_SS": 0.7115980783,
    },
}

PITCHER_MODEL = {
    "intercept": 16.5944849573,
    "features": {
        "velocity": 0.2529999141,
        "junk": 0.2665900378,
        "accuracy": 0.2632687105,
        "power": 0.0427586837,
        "contact": 0.0534777057,
        "speed": 0.0090158320,
        "jnk_acc": 0.0204898106,
        "arsenal_count": 1.0091022427,
        "bat_L": 1.0968542297,
        "bat_S": 0.3771555045,
        "thr_L": -0.2226159177,
        "pos_count": 1.2138502400,
        "neg_count": -1.1652812274,
        "tr_K Collector": 0.9087461920,
        "tr_Gets Ahead": 1.0320910791,
        "tr_Elite 2F": -0.5280484145,
        "tr_Elite 4F": 0.4167563425,
        "tr_Falls Behind": -0.9976052263,
        "tr_Elite CF": 0.7579419877,
        "tr_Rally Stopper": -1.1328476477,
        "tr_Elite FK": 0.4854804797,
        "tr_Specialist": 2.1540724826,
        "tr_Crossed Up": 1.5628438611,
        "tr_Elite CB": -0.2319264114,
        "tr_Volatile": 1.6516084637,
        "pos_RP": 0.0143423869,
        "pos_SP": 0.2361613210,
        "pos_SP/RP": -1.0149995619,
        "pitch_2F": 0.4731924690,
        "pitch_4F": 0.6321855453,
        "pitch_CB": 0.1994458286,
        "pitch_CF": 0.4593316468,
        "pitch_CH": 0.0411500855,
        "pitch_FK": -0.4882808759,
        "pitch_SB": 0.1040401887,
        "pitch_SL": -0.4119626453,
    },
}

HITTER_PRIMARY_ADJ = {
    "1B": 0.000,
    "2B": 0.051,
    "3B": -0.395,
    "C": 0.476,
    "CF": 0.072,
    "LF": -0.119,
    "RF": 0.014,
    "SS": -0.136,
}

PITCHER_ROLE_ADJ = {
    "SP": 0.000,
    "CP": -0.431,
    "RP": -0.265,
    "SP/RP": -0.353,
}

SECONDARY_ADJ = {
    "": 0.000,
    "(none)": 0.000,
    "1B": 0.104,
    "1B/OF": 0.126,
    "2B": 0.481,
    "3B": 0.268,
    "C": -0.058,
    "IF": 0.262,
    "IF/OF": 0.369,
    "LF": 0.004,
    "OF": 0.196,
    "RF": 0.159,
    "SS": 0.296,
}

TRAIT_NORMALIZATION = {
    "PWR vs RHP": "POW vs RHP",
    "PWR vs LHP": "POW vs LHP",
    "Elite 4": "Elite 4F",
    "K Neglector": "K Neglecter",
    "Two Way (IF)": "Two Way",
    "Two Way (OF)": "Two Way",
    "Con vs LHP": "CON vs LHP",
    "Con vs RHP": "CON vs RHP",
    "Con vs RPH": "CON vs RHP",
    "CON vs RPH": "CON vs RHP",
    "POW vs PHP": "POW vs RHP",
    "Slowpoke": "Slow Poke",
    "East Target": "Easy Target",
    "Base Rounds": "Base Rounder",
    "Clitch": "Clutch",
}

POSITIVE_TRAITS = {
    "Cannon Arm", "Durable", "First Pitch Slayer", "Sprinter", "K Collector", "Tough Out",
    "Stimulated", "Specialist", "Reverse Splits", "Stealer", "Pick Officer", "Sign Stealer",
    "Mind Gamer", "Distractor", "Bad Ball Hitter", "Pinch Perfect", "Base Rounder", "Composed",
    "Magic Hands", "Fastball Hitter", "Off-Speed Hitter", "Low Pitch", "High Pitch", "Inside Pitch",
    "Outside Pitch", "Metal Head", "Consistent", "Two Way", "Rally Stopper", "Clutch", "Dive Wizard",
    "Rally Starter", "RBI Hero", "CON vs LHP", "CON vs RHP", "POW vs LHP", "POW vs RHP",
    "Ace Exterminator", "Bunter", "Utility", "Big Hack", "Little Hack", "Gets Ahead", "Workhorse",
    "Elite 4F", "Elite 2F", "Elite CF", "Elite FK", "Elite SL", "Elite CB", "Elite CH", "Elite SB",
}

NEGATIVE_TRAITS = {
    "K Neglecter", "Whiffer", "Slow Poke", "First Pitch Prayer", "Injury Prone", "Noodle Arm",
    "Bad Jumps", "Easy Jumps", "Wild Thrower", "Easy Target", "Base Jogger", "BB Prone",
    "Butter Fingers", "Volatile", "Choker", "Meltdown", "Surrounded", "Wild Thing", "RBI Zero",
    "Falls Behind", "Crossed Up",
}

HITTER_PRIMARY_CHOICES = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"]
PITCHER_PRIMARY_CHOICES = ["SP", "RP", "CP", "SP/RP"]

SECONDARY_BY_PRIMARY = {
    "C": ["", "1B"],
    "1B": ["", "3B", "C", "OF", "1B/OF"],
    "2B": ["", "SS", "3B", "IF", "IF/OF"],
    "3B": ["", "1B", "SS", "IF", "IF/OF"],
    "SS": ["", "2B", "3B", "IF", "IF/OF"],
    "LF": ["", "RF", "OF", "1B/OF"],
    "CF": ["", "OF", "RF", "LF"],
    "RF": ["", "LF", "OF", "1B/OF"],
    "SP": [""],
    "RP": [""],
    "CP": [""],
    "SP/RP": [""],
}

# From in-repo gradeEngine position biases
HITTER_GENERATION_BIAS = {
    "C":  {"power": 0,  "contact": 0,  "speed": -10, "fielding": 10, "arm": 10},
    "1B": {"power": 15, "contact": 0,  "speed": -10, "fielding": -5, "arm": 0},
    "2B": {"power": -10,"contact": 5,  "speed": 5,   "fielding": 0,  "arm": 0},
    "SS": {"power": -10,"contact": 0,  "speed": 5,   "fielding": 10, "arm": 5},
    "3B": {"power": 10, "contact": 0,  "speed": -10, "fielding": 0,  "arm": 5},
    "LF": {"power": 10, "contact": 0,  "speed": 0,   "fielding": -5, "arm": -5},
    "CF": {"power": -10,"contact": 0,  "speed": 15,  "fielding": 5,  "arm": 0},
    "RF": {"power": 5,  "contact": 0,  "speed": -5,  "fielding": 0,  "arm": 10},
}

PITCHER_POSITIVE_TRAITS = [
    "K Collector", "Specialist", "Reverse Splits", "Pick Officer", "Composed", "Gets Ahead",
    "Rally Stopper", "Clutch", "Stimulated", "Durable", "Consistent",
    "Elite 4F", "Elite 2F", "Elite CF", "Elite FK", "Elite SL", "Elite CB", "Elite CH", "Elite SB",
]
HITTER_POSITIVE_TRAITS = [
    "Cannon Arm", "Durable", "First Pitch Slayer", "Sprinter", "Tough Out", "Stealer", "Sign Stealer",
    "Mind Gamer", "Distractor", "Bad Ball Hitter", "Pinch Perfect", "Base Rounder", "Magic Hands",
    "Fastball Hitter", "Off-Speed Hitter", "Low Pitch", "High Pitch", "Inside Pitch", "Outside Pitch",
    "Metal Head", "Consistent", "Two Way", "Clutch", "Dive Wizard", "Rally Starter", "RBI Hero",
    "CON vs LHP", "CON vs RHP", "POW vs LHP", "POW vs RHP", "Ace Exterminator", "Bunter", "Utility",
    "Big Hack", "Little Hack",
]
NEGATIVE_TRAIT_LIST = sorted(NEGATIVE_TRAITS)

POSITION_ORDER = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "SP", "SP/RP", "RP", "CP"]

ARCHETYPE_BLUEPRINTS = {
    # Counts are a 22-player roster template.
    "balanced": {
        "position_counts": {
            "C": 2, "1B": 2, "2B": 2, "3B": 1, "SS": 1, "LF": 2, "CF": 1, "RF": 2,
            "SP": 4, "SP/RP": 1, "RP": 3, "CP": 1,
        },
        "grade_weights": [
            ("S", 0.01), ("A+", 0.02), ("A", 0.05), ("A-", 0.10),
            ("B+", 0.17), ("B", 0.20), ("B-", 0.20), ("C+", 0.15),
            ("C", 0.07), ("C-", 0.02), ("D+", 0.01),
        ],
        "grade_shift_by_primary": {},
        "hitter_bias": {"power": 0, "contact": 0, "speed": 0, "fielding": 0, "arm": 0},
        "pitcher_bias": {"velocity": 0, "junk": 0, "accuracy": 0},
    },
    "power-heavy": {
        "position_counts": {
            "C": 2, "1B": 3, "2B": 1, "3B": 2, "SS": 1, "LF": 2, "CF": 1, "RF": 2,
            "SP": 4, "SP/RP": 1, "RP": 2, "CP": 1,
        },
        "grade_weights": [
            ("S", 0.02), ("A+", 0.04), ("A", 0.07), ("A-", 0.14),
            ("B+", 0.20), ("B", 0.20), ("B-", 0.16), ("C+", 0.11),
            ("C", 0.04), ("C-", 0.01), ("D+", 0.01),
        ],
        "grade_shift_by_primary": {"1B": 1, "3B": 1, "LF": 1, "RF": 1, "2B": -1, "SS": -1, "CF": -1},
        "hitter_bias": {"power": 9, "contact": 1, "speed": -5, "fielding": -2, "arm": 1},
        "pitcher_bias": {"velocity": 3, "junk": 1, "accuracy": -2},
    },
    "speed-defense": {
        "position_counts": {
            "C": 2, "1B": 1, "2B": 2, "3B": 1, "SS": 2, "LF": 1, "CF": 2, "RF": 1,
            "SP": 4, "SP/RP": 1, "RP": 4, "CP": 1,
        },
        "grade_weights": [
            ("S", 0.01), ("A+", 0.03), ("A", 0.06), ("A-", 0.11),
            ("B+", 0.17), ("B", 0.21), ("B-", 0.19), ("C+", 0.15),
            ("C", 0.05), ("C-", 0.02),
        ],
        "grade_shift_by_primary": {"C": 1, "2B": 1, "SS": 1, "CF": 1, "1B": -1, "LF": -1, "RF": -1},
        "hitter_bias": {"power": -6, "contact": 3, "speed": 8, "fielding": 6, "arm": 4},
        "pitcher_bias": {"velocity": -2, "junk": 2, "accuracy": 4},
    },
    "bullpen-heavy": {
        "position_counts": {
            "C": 2, "1B": 1, "2B": 2, "3B": 1, "SS": 2, "LF": 1, "CF": 1, "RF": 1,
            "SP": 3, "SP/RP": 2, "RP": 5, "CP": 1,
        },
        "grade_weights": [
            ("S", 0.01), ("A+", 0.02), ("A", 0.05), ("A-", 0.09),
            ("B+", 0.16), ("B", 0.20), ("B-", 0.21), ("C+", 0.17),
            ("C", 0.07), ("C-", 0.02),
        ],
        "grade_shift_by_primary": {"RP": 1, "CP": 1, "SP/RP": 1, "SP": -1},
        "hitter_bias": {"power": -2, "contact": -1, "speed": 1, "fielding": 1, "arm": 2},
        "pitcher_bias": {"velocity": 4, "junk": 4, "accuracy": 1},
    },
}

ARCHETYPE_HITTER_TRAITS = {
    "balanced": [],
    "power-heavy": ["POW vs RHP", "POW vs LHP", "RBI Hero", "First Pitch Slayer", "Fastball Hitter", "Big Hack"],
    "speed-defense": ["Sprinter", "Stealer", "Base Rounder", "Utility", "Cannon Arm", "Magic Hands", "Dive Wizard"],
    "bullpen-heavy": ["Clutch", "Durable", "Consistent", "Utility"],
}

ARCHETYPE_PITCHER_TRAITS = {
    "balanced": [],
    "power-heavy": ["K Collector", "Elite 4F", "Elite 2F", "Rally Stopper"],
    "speed-defense": ["Composed", "Gets Ahead", "Specialist", "Pick Officer"],
    "bullpen-heavy": ["Rally Stopper", "K Collector", "Specialist", "Reverse Splits", "Composed", "Gets Ahead", "Elite SL", "Elite CB", "Elite FK"],
}


@dataclass
class GradeResult:
    points: float
    rounded_points: int
    grade: str
    base_weighted: float
    pos_traits: int
    neg_traits: int
    player_type: str


def clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def clamp_int(value: float, lo: int = 0, hi: int = 99) -> int:
    return int(round(clamp(value, lo, hi)))


def normalize_trait(trait: str) -> str:
    t = (trait or "").strip()
    if not t:
        return ""
    return TRAIT_NORMALIZATION.get(t, t)


def normalize_secondary(secondary: str) -> str:
    s = (secondary or "").strip()
    return "" if s in {"", "none", "None", "(none)"} else s


def is_pitcher(primary_position: str) -> bool:
    return (primary_position or "").strip().upper() in PITCHER_POSITIONS


def base_weighted_hitter(power: float, contact: float, speed: float, fielding: float, arm: float) -> float:
    return 0.30 * power + 0.30 * contact + 0.20 * speed + 0.10 * fielding + 0.10 * arm


def base_weighted_pitcher(velocity: float, junk: float, accuracy: float) -> float:
    return (velocity + junk + accuracy) / 3.0


def count_trait_polarity(trait1: str = "", trait2: str = "") -> Tuple[int, int, List[str]]:
    traits = [normalize_trait(trait1), normalize_trait(trait2)]
    traits = [t for t in traits if t]
    pos = 0
    neg = 0
    unknown: List[str] = []
    for t in traits:
        if t in POSITIVE_TRAITS:
            pos += 1
        elif t in NEGATIVE_TRAITS:
            neg += 1
        else:
            unknown.append(t)
    return pos, neg, unknown


def grade_to_numeric_target(grade: str) -> float:
    return float(GRADE_NUMERIC_CENTERS[grade])


def numeric_to_grade(score: float) -> Tuple[int, str]:
    best_grade = "F"
    best_distance = float("inf")
    for grade, center in GRADE_NUMERIC_CENTERS.items():
        distance = abs(score - center)
        if distance < best_distance:
            best_grade = grade
            best_distance = distance
    idx = GRADE_TO_POINTS[best_grade]
    return idx, best_grade


def secondary_versatility(secondary: str) -> int:
    s = normalize_secondary(secondary)
    if not s:
        return 0
    return VERSATILITY_MAP.get(s, 1)


def extract_traits(trait1: str = "", trait2: str = "") -> List[str]:
    return [t for t in [normalize_trait(trait1), normalize_trait(trait2)] if t]


def normalize_pitch_name(pitch: str) -> str:
    return (pitch or "").strip().upper()


def extract_arsenal_pitches(player: Dict[str, Any]) -> List[str]:
    arsenal = player.get("arsenal", "")
    if isinstance(arsenal, list):
        return [normalize_pitch_name(p) for p in arsenal if normalize_pitch_name(p)]
    arsenal_text = str(arsenal or "").replace(",", "|")
    return [normalize_pitch_name(p) for p in arsenal_text.split("|") if normalize_pitch_name(p)]


def score_with_model(model: Dict[str, Any], feature_values: Dict[str, float]) -> float:
    score = float(model["intercept"])
    for feature_name, coefficient in model["features"].items():
        score += coefficient * float(feature_values.get(feature_name, 0.0))
    return score


def build_model_inputs(player: Dict[str, Any]) -> Dict[str, Any]:
    primary = (player.get("primaryPosition") or player.get("primary") or "").strip().upper()
    secondary = normalize_secondary(player.get("secondaryPosition") or player.get("secondary") or "")

    bats = (player.get("bats") or "R").strip().upper()
    throws = (player.get("throws") or "R").strip().upper()

    power = float(player.get("power", 0) or 0)
    contact = float(player.get("contact", 0) or 0)
    speed = float(player.get("speed", 0) or 0)
    fielding = float(player.get("fielding", 0) or 0)
    arm = float(player.get("arm", 0) or 0)
    velocity = float(player.get("velocity", 0) or 0)
    junk = float(player.get("junk", 0) or 0)
    accuracy = float(player.get("accuracy", 0) or 0)

    trait1 = player.get("trait1", "")
    trait2 = player.get("trait2", "")
    pos_traits, neg_traits, _ = count_trait_polarity(trait1, trait2)
    traits = set(extract_traits(trait1, trait2))

    bat_l = 1.0 if bats == "L" else 0.0
    bat_s = 1.0 if bats == "S" else 0.0
    thr_l = 1.0 if throws == "L" else 0.0
    vers = float(secondary_versatility(secondary))

    if is_pitcher(primary):
        base = base_weighted_pitcher(velocity, junk, accuracy)
        pitches = set(extract_arsenal_pitches(player))
        features = {
            "velocity": velocity,
            "junk": junk,
            "accuracy": accuracy,
            "power": power,
            "contact": contact,
            "speed": speed,
            "jnk_acc": (junk * accuracy) / 100.0,
            "arsenal_count": float(len(pitches)),
            "bat_L": bat_l,
            "bat_S": bat_s,
            "thr_L": thr_l,
            "pos_count": float(pos_traits),
            "neg_count": float(neg_traits),
            "pos_RP": 1.0 if primary == "RP" else 0.0,
            "pos_SP": 1.0 if primary == "SP" else 0.0,
            "pos_SP/RP": 1.0 if primary == "SP/RP" else 0.0,
        }
        for trait_name in [
            "K Collector", "Gets Ahead", "Elite 2F", "Elite 4F", "Falls Behind", "Elite CF",
            "Rally Stopper", "Elite FK", "Specialist", "Crossed Up", "Elite CB", "Volatile",
        ]:
            features[f"tr_{trait_name}"] = 1.0 if trait_name in traits else 0.0
        for pitch_name in ["2F", "4F", "CB", "CF", "CH", "FK", "SB", "SL"]:
            features[f"pitch_{pitch_name}"] = 1.0 if pitch_name in pitches else 0.0

        return {
            "player_type": "pitcher",
            "primary": primary,
            "secondary": secondary,
            "bats": bats,
            "throws": throws,
            "traits": sorted(traits),
            "pitches": sorted(pitches),
            "base_weighted": base,
            "pos_traits": pos_traits,
            "neg_traits": neg_traits,
            "features": features,
            "model": PITCHER_MODEL,
        }

    base = base_weighted_hitter(power, contact, speed, fielding, arm)
    features = {
        "power": power,
        "contact": contact,
        "speed": speed,
        "fielding": fielding,
        "arm": arm,
        "pow_con": (power * contact) / 100.0,
        "spd_fld": (speed * fielding) / 100.0,
        "bat_L": bat_l,
        "bat_S": bat_s,
        "thr_L": thr_l,
        "vers": vers,
        "vers2": vers * vers,
        "vers_util": vers if "Utility" in traits else 0.0,
        "pos_count": float(pos_traits),
        "neg_count": float(neg_traits),
        "pos_2B": 1.0 if primary == "2B" else 0.0,
        "pos_3B": 1.0 if primary == "3B" else 0.0,
        "pos_C": 1.0 if primary == "C" else 0.0,
        "pos_CF": 1.0 if primary == "CF" else 0.0,
        "pos_LF": 1.0 if primary == "LF" else 0.0,
        "pos_RF": 1.0 if primary == "RF" else 0.0,
        "pos_SS": 1.0 if primary == "SS" else 0.0,
        "sec_1B": 1.0 if secondary == "1B" else 0.0,
        "sec_1B/OF": 1.0 if secondary == "1B/OF" else 0.0,
        "sec_2B": 1.0 if secondary == "2B" else 0.0,
        "sec_3B": 1.0 if secondary == "3B" else 0.0,
        "sec_C": 1.0 if secondary == "C" else 0.0,
        "sec_IF": 1.0 if secondary == "IF" else 0.0,
        "sec_LF": 1.0 if secondary == "LF" else 0.0,
        "sec_OF": 1.0 if secondary == "OF" else 0.0,
        "sec_RF": 1.0 if secondary == "RF" else 0.0,
        "sec_SS": 1.0 if secondary == "SS" else 0.0,
    }
    for trait_name in [
        "First Pitch Slayer", "Little Hack", "Mind Gamer", "Rally Starter", "Magic Hands",
        "Utility", "Big Hack", "Sprinter", "Cannon Arm", "Fastball Hitter", "Bad Ball Hitter", "Whiffer",
    ]:
        features[f"tr_{trait_name}"] = 1.0 if trait_name in traits else 0.0

    return {
        "player_type": "hitter",
        "primary": primary,
        "secondary": secondary,
        "bats": bats,
        "throws": throws,
        "traits": sorted(traits),
        "pitches": [],
        "base_weighted": base,
        "pos_traits": pos_traits,
        "neg_traits": neg_traits,
        "features": features,
        "model": HITTER_MODEL,
    }


def calculate_grade(player: Dict[str, Any]) -> GradeResult:
    payload = build_model_inputs(player)
    score = score_with_model(payload["model"], payload["features"])
    idx, grade = numeric_to_grade(score)
    return GradeResult(points=score, rounded_points=idx, grade=grade, base_weighted=payload["base_weighted"],
                       pos_traits=payload["pos_traits"], neg_traits=payload["neg_traits"], player_type=payload["player_type"])


def explain_player(player: Dict[str, Any]) -> Dict[str, Any]:
    payload = build_model_inputs(player)
    model = payload["model"]
    features = payload["features"]
    contributions: List[Dict[str, Any]] = []

    for feature_name, coefficient in model["features"].items():
        value = float(features.get(feature_name, 0.0))
        contribution = coefficient * value
        if abs(value) < 1e-12:
            continue
        contributions.append({
            "feature": feature_name,
            "value": round(value, 4),
            "coefficient": round(float(coefficient), 6),
            "contribution": round(contribution, 4),
        })

    contributions.sort(key=lambda item: abs(item["contribution"]), reverse=True)
    score = score_with_model(model, features)
    idx, grade = numeric_to_grade(score)
    return {
        "input": dict(player),
        "player_type": payload["player_type"],
        "primaryPosition": payload["primary"],
        "secondaryPosition": payload["secondary"],
        "bats": payload["bats"],
        "throws": payload["throws"],
        "traits": payload["traits"],
        "arsenal_pitches": payload["pitches"],
        "base_weighted": round(payload["base_weighted"], 4),
        "pos_traits": payload["pos_traits"],
        "neg_traits": payload["neg_traits"],
        "intercept": round(float(model["intercept"]), 6),
        "numeric_score": round(score, 4),
        "grade_idx": idx,
        "grade": grade,
        "top_contributions": contributions[:20],
        "all_contributions": contributions,
    }


def random_choice_weighted(rng: random.Random, items: List[Tuple[Any, float]]) -> Any:
    total = sum(w for _, w in items)
    roll = rng.random() * total
    cumulative = 0.0
    for value, weight in items:
        cumulative += weight
        if roll <= cumulative:
            return value
    return items[-1][0]


def choose_traits(rng: random.Random, target_grade: str, kind: str) -> Tuple[str, str]:
    gp = GRADE_TO_POINTS[target_grade]
    if gp >= 13:
        trait_count = random_choice_weighted(rng, [(1, 0.7), (2, 0.3)])
        neg_chance = 0.05
    elif gp >= 10:
        trait_count = random_choice_weighted(rng, [(0, 0.3), (1, 0.5), (2, 0.2)])
        neg_chance = 0.10
    elif gp >= 7:
        trait_count = random_choice_weighted(rng, [(0, 0.45), (1, 0.45), (2, 0.10)])
        neg_chance = 0.25
    else:
        trait_count = random_choice_weighted(rng, [(0, 0.50), (1, 0.50)])
        neg_chance = 0.45

    positives = PITCHER_POSITIVE_TRAITS if kind == "pitcher" else HITTER_POSITIVE_TRAITS
    selected: List[str] = []
    for _ in range(trait_count):
        pool = NEGATIVE_TRAIT_LIST if rng.random() < neg_chance else positives
        candidate = rng.choice(pool)
        if candidate not in selected:
            selected.append(candidate)

    while len(selected) < 2:
        selected.append("")
    return selected[0], selected[1]


def resolve_traits(
    rng: random.Random,
    target_grade: str,
    kind: str,
    trait1: Optional[str],
    trait2: Optional[str],
) -> Tuple[str, str]:
    auto1, auto2 = choose_traits(rng, target_grade, kind)
    t1 = normalize_trait(trait1) if trait1 is not None else auto1
    t2 = normalize_trait(trait2) if trait2 is not None else auto2
    if t1 and t2 and t1 == t2:
        t2 = ""
    return t1, t2


def choose_primary_secondary(rng: random.Random, kind: str, primary: Optional[str], secondary: Optional[str]) -> Tuple[str, str]:
    if primary:
        p = primary.strip().upper()
    elif kind == "pitcher":
        p = random_choice_weighted(rng, [("SP", 0.48), ("RP", 0.34), ("CP", 0.08), ("SP/RP", 0.10)])
    else:
        p = rng.choice(HITTER_PRIMARY_CHOICES)

    if secondary is not None:
        s = normalize_secondary(secondary)
    else:
        options = SECONDARY_BY_PRIMARY.get(p, [""])
        s = rng.choice(options)
    return p, s


def choose_bats_throws(rng: random.Random, kind: str, bats: Optional[str], throws: Optional[str]) -> Tuple[str, str]:
    b = bats.strip().upper() if bats else ""
    t = throws.strip().upper() if throws else ""

    if not b:
        if kind == "pitcher":
            b = random_choice_weighted(rng, [("R", 0.47), ("L", 0.47), ("S", 0.06)])
        else:
            b = random_choice_weighted(rng, [("R", 0.45), ("L", 0.33), ("S", 0.22)])

    if not t:
        t = random_choice_weighted(rng, [("R", 0.74), ("L", 0.26)])

    return b, t


def choose_grade_for_archetype(rng: random.Random, archetype: str) -> str:
    cfg = ARCHETYPE_BLUEPRINTS[archetype]
    return random_choice_weighted(rng, cfg["grade_weights"])


def shift_grade(grade: str, delta: int) -> str:
    points = GRADE_TO_POINTS[grade]
    shifted = int(clamp(points + delta, 0, 16))
    return POINTS_TO_GRADE[shifted]


def build_position_plan(rng: random.Random, count: int, archetype: str) -> List[str]:
    cfg = ARCHETYPE_BLUEPRINTS[archetype]
    raw_counts = cfg["position_counts"]
    total_blueprint = float(sum(raw_counts.values()))
    exact = {pos: (raw_counts[pos] / total_blueprint) * count for pos in POSITION_ORDER}
    floors = {pos: int(exact[pos]) for pos in POSITION_ORDER}
    remainder = count - sum(floors.values())
    fractions = sorted(
        ((exact[pos] - floors[pos], rng.random(), pos) for pos in POSITION_ORDER),
        reverse=True,
    )
    for i in range(remainder):
        floors[fractions[i][2]] += 1

    plan: List[str] = []
    for pos in POSITION_ORDER:
        plan.extend([pos] * floors[pos])
    rng.shuffle(plan)
    return plan


def choose_archetype_trait(
    rng: random.Random,
    archetype: str,
    kind: str,
    target_grade: str,
) -> Optional[str]:
    if archetype == "balanced":
        return None
    gp = GRADE_TO_POINTS[target_grade]
    chance = 0.55 if gp >= 10 else 0.35
    if rng.random() > chance:
        return None
    pool = ARCHETYPE_PITCHER_TRAITS[archetype] if kind == "pitcher" else ARCHETYPE_HITTER_TRAITS[archetype]
    if not pool:
        return None
    return rng.choice(pool)


ELITE_TRAIT_TO_PITCH = {
    "Elite 2F": "2F",
    "Elite 4F": "4F",
    "Elite CB": "CB",
    "Elite CF": "CF",
    "Elite CH": "CH",
    "Elite FK": "FK",
    "Elite SB": "SB",
    "Elite SL": "SL",
}

ALL_PITCH_TYPES = ["4F", "2F", "CF", "SL", "CB", "CH", "FK", "SB"]


def generate_pitcher_arsenal(
    rng: random.Random,
    role: str,
    junk: float,
    traits: List[str],
) -> str:
    forced = [ELITE_TRAIT_TO_PITCH[t] for t in traits if t in ELITE_TRAIT_TO_PITCH]
    preferred = list(dict.fromkeys(forced))

    if role == "SP":
        target_count = random_choice_weighted(rng, [(5, 0.42), (4, 0.49), (3, 0.09)])
    elif role == "CP":
        target_count = random_choice_weighted(rng, [(2, 0.60), (3, 0.30), (4, 0.10)])
    elif role == "SP/RP":
        target_count = random_choice_weighted(rng, [(4, 0.68), (5, 0.17), (3, 0.15)])
    else:
        target_count = random_choice_weighted(rng, [(3, 0.70), (4, 0.23), (2, 0.05), (5, 0.02)])

    if junk >= 75:
        pitch_pool = ["CF", "CB", "SL", "CH", "FK", "SB", "4F", "2F"]
    elif junk <= 40:
        pitch_pool = ["4F", "2F", "CF", "SL", "CH", "CB", "FK", "SB"]
    else:
        pitch_pool = ["4F", "CF", "SL", "CB", "CH", "2F", "FK", "SB"]

    arsenal = list(preferred)
    for pitch in pitch_pool:
        if len(arsenal) >= target_count:
            break
        if pitch not in arsenal:
            arsenal.append(pitch)

    while len(arsenal) < target_count:
        pitch = rng.choice(ALL_PITCH_TYPES)
        if pitch not in arsenal:
            arsenal.append(pitch)

    rng.shuffle(arsenal)
    return "|".join(arsenal)


def nudge_toward_target(player: Dict[str, Any], target_grade: str, max_steps: int = 80) -> Dict[str, Any]:
    p = dict(player)
    target_numeric = grade_to_numeric_target(target_grade)
    best_player = dict(p)
    best_result = calculate_grade(best_player)
    best_error = abs(best_result.points - target_numeric)

    if best_result.grade == target_grade and best_error <= 1.5:
        return best_player

    if best_result.player_type == "pitcher":
        stat_keys = ["velocity", "junk", "accuracy", "power", "contact", "speed"]
    else:
        stat_keys = ["power", "contact", "speed", "fielding", "arm"]

    step_schedule = [8, 5, 3, 2, 1]
    for _ in range(max_steps):
        current = calculate_grade(p)
        current_error = abs(current.points - target_numeric)
        if current.grade == target_grade and current_error <= 1.5:
            return p

        direction = 1 if current.points < target_numeric else -1
        candidates: List[Dict[str, Any]] = []

        for step in step_schedule:
            signed = direction * step
            for key in stat_keys:
                candidate = dict(p)
                candidate[key] = clamp_int(float(candidate.get(key, 0)) + signed)
                candidates.append(candidate)

            if current.player_type == "pitcher":
                triple = dict(p)
                for key in ["velocity", "junk", "accuracy"]:
                    triple[key] = clamp_int(float(triple.get(key, 0)) + signed)
                candidates.append(triple)
            else:
                pair_a = dict(p)
                for key in ["power", "contact"]:
                    pair_a[key] = clamp_int(float(pair_a.get(key, 0)) + signed)
                candidates.append(pair_a)

                pair_b = dict(p)
                for key in ["speed", "fielding", "arm"]:
                    pair_b[key] = clamp_int(float(pair_b.get(key, 0)) + signed)
                candidates.append(pair_b)

        improved = False
        local_best_player = p
        local_best_result = current
        local_best_error = current_error

        for candidate in candidates:
            result = calculate_grade(candidate)
            error = abs(result.points - target_numeric)
            better_grade = result.grade == target_grade and local_best_result.grade != target_grade
            same_grade_better = result.grade == local_best_result.grade and error < local_best_error
            closer_otherwise = error + 0.25 < local_best_error
            if better_grade or same_grade_better or closer_otherwise:
                local_best_player = candidate
                local_best_result = result
                local_best_error = error
                improved = True

        if local_best_error < best_error or (
            local_best_result.grade == target_grade and best_result.grade != target_grade
        ):
            best_player = dict(local_best_player)
            best_result = local_best_result
            best_error = local_best_error

        if not improved:
            break

        p = local_best_player

    return best_player


def generate_hitter(
    rng: random.Random,
    target_grade: str,
    primary: Optional[str],
    secondary: Optional[str],
    bats: Optional[str],
    throws: Optional[str],
    trait1: Optional[str],
    trait2: Optional[str],
    extra_bias: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    p, s = choose_primary_secondary(rng, "hitter", primary, secondary)
    b, t = choose_bats_throws(rng, "hitter", bats, throws)

    tr1, tr2 = resolve_traits(rng, target_grade, "hitter", trait1, trait2)
    target_numeric = grade_to_numeric_target(target_grade)
    required_base = clamp(target_numeric - 10.0, 15, 92)

    bias = HITTER_GENERATION_BIAS.get(p, {"power": 0, "contact": 0, "speed": 0, "fielding": 0, "arm": 0})
    archetype_bias = extra_bias or {}
    stats = {}
    for stat in ["power", "contact", "speed", "fielding", "arm"]:
        noise = rng.uniform(-10, 10)
        stats[stat] = clamp_int(required_base + bias.get(stat, 0) + archetype_bias.get(stat, 0) + noise)

    for _ in range(15):
        cur_base = base_weighted_hitter(stats["power"], stats["contact"], stats["speed"], stats["fielding"], stats["arm"])
        err = required_base - cur_base
        if abs(err) < 0.2:
            break
        for stat in ["power", "contact", "speed", "fielding", "arm"]:
            stats[stat] = clamp_int(stats[stat] + err)

    player = {
        "name": "Generated Hitter",
        "primaryPosition": p,
        "secondaryPosition": s,
        "bats": b,
        "throws": t,
        "trait1": tr1,
        "trait2": tr2,
        "power": stats["power"],
        "contact": stats["contact"],
        "speed": stats["speed"],
        "fielding": stats["fielding"],
        "arm": stats["arm"],
        "velocity": 0,
        "junk": 0,
        "accuracy": 0,
    }
    return nudge_toward_target(player, target_grade)


def generate_pitcher(
    rng: random.Random,
    target_grade: str,
    primary: Optional[str],
    secondary: Optional[str],
    bats: Optional[str],
    throws: Optional[str],
    trait1: Optional[str],
    trait2: Optional[str],
    extra_bias: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    p, s = choose_primary_secondary(rng, "pitcher", primary, secondary)
    b, t = choose_bats_throws(rng, "pitcher", bats, throws)

    tr1, tr2 = resolve_traits(rng, target_grade, "pitcher", trait1, trait2)
    target_numeric = grade_to_numeric_target(target_grade)

    bat_pow = clamp_int(rng.uniform(0, 35))
    bat_con = clamp_int(rng.uniform(0, 40))
    bat_spd = clamp_int(rng.uniform(0, 60))
    required_base = clamp(target_numeric - 15.0, 18, 96)

    if p == "SP":
        biases = {"velocity": -2, "junk": -3, "accuracy": 5}
    elif p == "CP":
        biases = {"velocity": 8, "junk": 5, "accuracy": -13}
    elif p == "SP/RP":
        biases = {"velocity": 3, "junk": 2, "accuracy": 0}
    else:
        style = rng.choice(["power", "crafty", "balanced"])
        if style == "power":
            biases = {"velocity": 10, "junk": -2, "accuracy": -8}
        elif style == "crafty":
            biases = {"velocity": -8, "junk": 10, "accuracy": -2}
        else:
            biases = {"velocity": 2, "junk": 2, "accuracy": 0}

    archetype_bias = extra_bias or {}
    vel = clamp_int(required_base + biases["velocity"] + archetype_bias.get("velocity", 0) + rng.uniform(-10, 10))
    jnk = clamp_int(required_base + biases["junk"] + archetype_bias.get("junk", 0) + rng.uniform(-10, 10))
    acc = clamp_int(required_base + biases["accuracy"] + archetype_bias.get("accuracy", 0) + rng.uniform(-10, 10))

    for _ in range(15):
        cur_base = base_weighted_pitcher(vel, jnk, acc)
        err = required_base - cur_base
        if abs(err) < 0.2:
            break
        vel = clamp_int(vel + err)
        jnk = clamp_int(jnk + err)
        acc = clamp_int(acc + err)

    player = {
        "name": "Generated Pitcher",
        "primaryPosition": p,
        "secondaryPosition": s,
        "bats": b,
        "throws": t,
        "trait1": tr1,
        "trait2": tr2,
        "power": bat_pow,
        "contact": bat_con,
        "speed": bat_spd,
        "fielding": clamp_int(rng.uniform(20, 80)),
        "arm": 0,
        "velocity": vel,
        "junk": jnk,
        "accuracy": acc,
        "arsenal": generate_pitcher_arsenal(rng, p, jnk, extract_traits(tr1, tr2)),
    }
    return nudge_toward_target(player, target_grade)


def generate_player(rng: random.Random, target_grade: str, kind: str = "mixed", primary: Optional[str] = None,
                    secondary: Optional[str] = None, bats: Optional[str] = None, throws: Optional[str] = None,
                    trait1: Optional[str] = None, trait2: Optional[str] = None,
                    extra_bias: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
    if kind == "mixed":
        kind = "hitter" if rng.random() < 0.593 else "pitcher"
    if kind == "hitter":
        return generate_hitter(rng, target_grade, primary, secondary, bats, throws, trait1, trait2, extra_bias=extra_bias)
    if kind == "pitcher":
        return generate_pitcher(rng, target_grade, primary, secondary, bats, throws, trait1, trait2, extra_bias=extra_bias)
    raise ValueError(f"Unknown kind: {kind}")


def result_with_details(player: Dict[str, Any]) -> Dict[str, Any]:
    result = calculate_grade(player)
    pos_traits, neg_traits, unknown = count_trait_polarity(player.get("trait1", ""), player.get("trait2", ""))
    out = dict(player)
    out.update({
        "pred_numeric": round(result.points, 4),
        "pred_grade_idx": result.rounded_points,
        "pred_points": round(result.points, 4),
        "pred_points_rounded": result.rounded_points,
        "pred_grade": result.grade,
        "pred_base_weighted": round(result.base_weighted, 4),
        "pred_player_type": result.player_type,
        "pos_traits": pos_traits,
        "neg_traits": neg_traits,
        "unknown_traits": unknown,
    })
    return out


def read_json_player(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, list):
        raise ValueError("--input for predict expects a single JSON object, not a list")
    return data


def cmd_predict(args: argparse.Namespace) -> None:
    if args.input:
        player = read_json_player(args.input)
    elif args.player:
        player = json.loads(args.player)
    else:
        raise ValueError("Provide --input file.json or --player '{...json...}'")

    output = result_with_details(player)
    print(json.dumps(output, indent=2 if args.pretty else None))


def cmd_explain_player(args: argparse.Namespace) -> None:
    if args.input:
        player = read_json_player(args.input)
    elif args.player:
        player = json.loads(args.player)
    else:
        raise ValueError("Provide --input file.json or --player '{...json...}'")

    output = explain_player(player)
    print(json.dumps(output, indent=2 if args.pretty else None))


def cmd_predict_csv(args: argparse.Namespace) -> None:
    with open(args.input, "r", encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))

    out_rows: List[Dict[str, Any]] = []
    for row in rows:
        out_rows.append(result_with_details(row))

    fieldnames = list(rows[0].keys()) + [
        "pred_numeric", "pred_grade_idx", "pred_points", "pred_points_rounded",
        "pred_grade", "pred_base_weighted", "pred_player_type",
        "pos_traits", "neg_traits", "unknown_traits",
    ]
    with open(args.output, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in out_rows:
            row = dict(row)
            row["unknown_traits"] = "|".join(row.get("unknown_traits", []))
            writer.writerow(row)


def cmd_generate(args: argparse.Namespace) -> None:
    rng = random.Random(args.seed)
    grade = args.grade.upper()
    if grade not in GRADE_TO_POINTS:
        raise ValueError(f"Unsupported grade '{args.grade}'. Use one of: {', '.join(FULL_GRADE_SCALE)}")

    players = []
    for i in range(args.count):
        p = generate_player(
            rng=rng,
            target_grade=grade,
            kind=args.kind,
            primary=args.primary,
            secondary=args.secondary,
            bats=args.bats,
            throws=args.throws,
            trait1=args.trait1,
            trait2=args.trait2,
        )
        p["name"] = f"Generated {i + 1}"
        players.append(result_with_details(p))

    if args.output.endswith(".csv"):
        keys = sorted({k for p in players for k in p.keys() if k != "unknown_traits"}) + ["unknown_traits"]
        with open(args.output, "w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=keys)
            w.writeheader()
            for row in players:
                row = dict(row)
                row["unknown_traits"] = "|".join(row.get("unknown_traits", []))
                w.writerow(row)
    else:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(players, f, indent=2)

    summary = {
        "count": len(players),
        "kind": args.kind,
        "target_grade": grade,
        "output": args.output,
        "seed": args.seed,
        "achieved_grade_counts": {},
    }
    for p in players:
        summary["achieved_grade_counts"][p["pred_grade"]] = summary["achieved_grade_counts"].get(p["pred_grade"], 0) + 1
    print(json.dumps(summary, indent=2))


def cmd_generate_archetype(args: argparse.Namespace) -> None:
    rng = random.Random(args.seed)
    archetype = args.archetype.lower()
    if archetype not in ARCHETYPE_BLUEPRINTS:
        raise ValueError(f"Unsupported archetype '{args.archetype}'.")

    override_grade = args.grade.upper() if args.grade else None
    if override_grade and override_grade not in GRADE_TO_POINTS:
        raise ValueError(f"Unsupported grade '{args.grade}'. Use one of: {', '.join(FULL_GRADE_SCALE)}")

    position_plan = build_position_plan(rng, args.count, archetype)
    cfg = ARCHETYPE_BLUEPRINTS[archetype]

    players: List[Dict[str, Any]] = []
    for i, primary in enumerate(position_plan, start=1):
        kind = "pitcher" if primary in PITCHER_POSITIONS else "hitter"

        sampled_grade = override_grade or choose_grade_for_archetype(rng, archetype)
        shift = cfg["grade_shift_by_primary"].get(primary, 0)
        target_grade = shift_grade(sampled_grade, shift)

        forced_trait = choose_archetype_trait(rng, archetype, kind, target_grade)

        p = generate_player(
            rng=rng,
            target_grade=target_grade,
            kind=kind,
            primary=primary,
            secondary=None,
            bats=None,
            throws=None,
            trait1=forced_trait,
            trait2=None,
            extra_bias=cfg["pitcher_bias"] if kind == "pitcher" else cfg["hitter_bias"],
        )
        p["name"] = f"{archetype.title()} {i}"
        p["target_grade"] = target_grade
        p["archetype"] = archetype
        players.append(result_with_details(p))

    if args.output.endswith(".csv"):
        keys = sorted({k for p in players for k in p.keys() if k != "unknown_traits"}) + ["unknown_traits"]
        with open(args.output, "w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=keys)
            w.writeheader()
            for row in players:
                row = dict(row)
                row["unknown_traits"] = "|".join(row.get("unknown_traits", []))
                w.writerow(row)
    else:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(players, f, indent=2)

    position_counts: Dict[str, int] = {}
    grade_counts: Dict[str, int] = {}
    kind_counts: Dict[str, int] = {"hitter": 0, "pitcher": 0}
    for p in players:
        position_counts[p["primaryPosition"]] = position_counts.get(p["primaryPosition"], 0) + 1
        grade_counts[p["pred_grade"]] = grade_counts.get(p["pred_grade"], 0) + 1
        kind_counts[p["pred_player_type"]] = kind_counts.get(p["pred_player_type"], 0) + 1

    summary = {
        "archetype": archetype,
        "count": len(players),
        "seed": args.seed,
        "output": args.output,
        "override_grade": override_grade,
        "kind_counts": kind_counts,
        "position_counts": position_counts,
        "achieved_grade_counts": grade_counts,
    }
    print(json.dumps(summary, indent=2))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="SMB4 reverse-engineered grade toolkit")
    sub = parser.add_subparsers(dest="command", required=True)

    p1 = sub.add_parser("predict", help="Predict grade for one player from JSON")
    p1.add_argument("--input", type=str, help="Path to JSON file with one player object")
    p1.add_argument("--player", type=str, help="Inline JSON object string")
    p1.add_argument("--pretty", action="store_true", help="Pretty-print output")
    p1.set_defaults(func=cmd_predict)

    p1b = sub.add_parser("explain-player", help="Explain one player's grade from JSON")
    p1b.add_argument("--input", type=str, help="Path to JSON file with one player object")
    p1b.add_argument("--player", type=str, help="Inline JSON object string")
    p1b.add_argument("--pretty", action="store_true", help="Pretty-print output")
    p1b.set_defaults(func=cmd_explain_player)

    p2 = sub.add_parser("predict-csv", help="Predict grades for players in CSV")
    p2.add_argument("--input", type=str, required=True, help="Input CSV path")
    p2.add_argument("--output", type=str, required=True, help="Output CSV path")
    p2.set_defaults(func=cmd_predict_csv)

    p3 = sub.add_parser("generate", help="Generate fictional players at target grade")
    p3.add_argument("--count", type=int, default=10, help="Number of players")
    p3.add_argument("--kind", type=str, default="mixed", choices=["hitter", "pitcher", "mixed"], help="Player type")
    p3.add_argument("--grade", type=str, default="B", help="Target grade")
    p3.add_argument("--primary", type=str, default=None, help="Force primary position")
    p3.add_argument("--secondary", type=str, default=None, help="Force secondary position")
    p3.add_argument("--bats", type=str, default=None, help="Force bats hand (R/L/S)")
    p3.add_argument("--throws", type=str, default=None, help="Force throws hand (R/L)")
    p3.add_argument("--trait1", type=str, default=None, help="Force trait1")
    p3.add_argument("--trait2", type=str, default=None, help="Force trait2")
    p3.add_argument("--seed", type=int, default=42, help="Random seed")
    p3.add_argument("--output", type=str, required=True, help="Output file (.json or .csv)")
    p3.set_defaults(func=cmd_generate)

    p4 = sub.add_parser("generate-archetype", help="Generate roster-realistic players for a team archetype")
    p4.add_argument("--archetype", type=str, required=True, choices=sorted(ARCHETYPE_BLUEPRINTS.keys()),
                    help="Team archetype preset")
    p4.add_argument("--count", type=int, default=22, help="Number of players to generate")
    p4.add_argument("--grade", type=str, default=None,
                    help="Optional fixed target grade override for every player")
    p4.add_argument("--seed", type=int, default=42, help="Random seed")
    p4.add_argument("--output", type=str, required=True, help="Output file (.json or .csv)")
    p4.set_defaults(func=cmd_generate_archetype)

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
