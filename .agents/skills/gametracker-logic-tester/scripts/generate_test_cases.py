#!/usr/bin/env python3
"""
Generate exhaustive test case matrix for KBL Tracker GameTracker.
Outputs JSON with all base/out/outcome combinations and expected results.

Usage:
    python generate_test_cases.py > test_cases.json
    python generate_test_cases.py --summary  # Print summary stats only
"""

import json
import sys
from itertools import product
from typing import Any

# ============================================================
# BASE STATE DEFINITIONS
# ============================================================

BASE_STATES = {
    "empty":    {"1B": False, "2B": False, "3B": False},
    "1st":      {"1B": True,  "2B": False, "3B": False},
    "2nd":      {"1B": False, "2B": True,  "3B": False},
    "3rd":      {"1B": False, "2B": False, "3B": True},
    "1st_2nd":  {"1B": True,  "2B": True,  "3B": False},
    "1st_3rd":  {"1B": True,  "2B": False, "3B": True},
    "2nd_3rd":  {"1B": False, "2B": True,  "3B": True},
    "loaded":   {"1B": True,  "2B": True,  "3B": True},
}

OUT_STATES = [0, 1, 2]

# ============================================================
# OUTCOME DEFINITIONS
# ============================================================

OUTCOMES = {
    # Hits
    "single": {"type": "hit", "bases_gained": 1},
    "double": {"type": "hit", "bases_gained": 2},
    "triple": {"type": "hit", "bases_gained": 3},
    "home_run": {"type": "hit", "bases_gained": 4},
    "inside_park_hr": {"type": "hit", "bases_gained": 4},

    # Outs (1 out recorded)
    "ground_out": {"type": "out", "outs_added": 1, "subtype": "ground"},
    "fly_out": {"type": "out", "outs_added": 1, "subtype": "fly"},
    "line_out": {"type": "out", "outs_added": 1, "subtype": "line"},
    "strikeout_swinging": {"type": "out", "outs_added": 1, "subtype": "strikeout"},
    "strikeout_looking": {"type": "out", "outs_added": 1, "subtype": "strikeout"},
    "fielders_choice": {"type": "out", "outs_added": 1, "subtype": "fc"},
    "sac_bunt": {"type": "out", "outs_added": 1, "subtype": "bunt"},

    # Double play (2 outs recorded)
    "double_play": {"type": "out", "outs_added": 2, "subtype": "dp"},

    # No-out events
    "walk": {"type": "no_out", "subtype": "bb"},
    "intentional_walk": {"type": "no_out", "subtype": "ibb"},
    "hit_by_pitch": {"type": "no_out", "subtype": "hbp"},
    "error": {"type": "no_out", "subtype": "error"},
    "dropped_3rd_strike": {"type": "no_out", "subtype": "d3k"},

    # Special events
    "stolen_base": {"type": "special", "subtype": "sb"},
    "caught_stealing": {"type": "special", "subtype": "cs"},
    "wild_pitch": {"type": "special", "subtype": "wp"},
    "passed_ball": {"type": "special", "subtype": "pb"},
}


def is_force_at(base: str, bases: dict) -> bool:
    """Determine if a force play exists at a given base."""
    if base == "1B":
        return True  # Batter always forces to 1st
    if base == "2B":
        return bases["1B"]
    if base == "3B":
        return bases["1B"] and bases["2B"]
    if base == "home":
        return bases["1B"] and bases["2B"] and bases["3B"]
    return False


def calculate_expected_result(base_name: str, outs: int, outcome_name: str) -> dict:
    """Calculate expected game state after an outcome."""
    bases = BASE_STATES[base_name].copy()
    outcome = OUTCOMES[outcome_name]
    result: dict[str, Any] = {
        "base_state": base_name,
        "outs_before": outs,
        "outcome": outcome_name,
        "runs_scored": 0,
        "outs_after": outs,
        "new_bases": {"1B": False, "2B": False, "3B": False},
        "batter_reaches": False,
        "inning_ends": False,
        "is_valid": True,
        "notes": [],
        "sac_fly": False,
        "rbi_credited": False,
    }

    # ===================== HITS =====================
    if outcome["type"] == "hit":
        bg = outcome["bases_gained"]
        result["batter_reaches"] = True

        if bg == 4:  # Home run (any type)
            # All runners + batter score
            runs = 1  # batter
            if bases["1B"]: runs += 1
            if bases["2B"]: runs += 1
            if bases["3B"]: runs += 1
            result["runs_scored"] = runs
            result["new_bases"] = {"1B": False, "2B": False, "3B": False}
            result["rbi_credited"] = True
            result["notes"].append(f"HR: {runs} runs score (all runners + batter)")

        elif bg == 3:  # Triple
            runs = 0
            if bases["1B"]: runs += 1
            if bases["2B"]: runs += 1
            if bases["3B"]: runs += 1
            result["runs_scored"] = runs
            result["new_bases"] = {"1B": False, "2B": False, "3B": True}
            result["rbi_credited"] = runs > 0
            result["notes"].append(f"Triple: {runs} runners score, batter to 3rd")

        elif bg == 2:  # Double
            runs = 0
            if bases["2B"]: runs += 1
            if bases["3B"]: runs += 1
            # Runner on 1st: usually scores on double but depends on speed
            # Default: runner on 1st goes to 3rd
            new_3b = bases["1B"]
            if bases["1B"]:
                result["notes"].append("Runner from 1st → 3rd (default) or home (speed-dependent)")
            result["runs_scored"] = runs
            result["new_bases"] = {"1B": False, "2B": True, "3B": new_3b}
            result["rbi_credited"] = runs > 0

        elif bg == 1:  # Single
            runs = 0
            new_bases = {"1B": True, "2B": False, "3B": False}  # Batter to 1st

            if bases["3B"]:
                runs += 1  # Runner from 3rd scores

            if bases["2B"]:
                new_bases["3B"] = True  # Runner from 2nd → 3rd (default)
                result["notes"].append("Runner from 2nd → 3rd (default, may score on speed)")

            if bases["1B"]:
                new_bases["2B"] = True  # Runner from 1st → 2nd
                result["notes"].append("Runner from 1st → 2nd (default)")

            result["runs_scored"] = runs
            result["new_bases"] = new_bases
            result["rbi_credited"] = runs > 0

    # ===================== OUTS =====================
    elif outcome["type"] == "out":
        outs_added = outcome["outs_added"]

        # Check validity
        if outcome_name == "double_play":
            if outs == 2:
                result["is_valid"] = False
                result["notes"].append("DP impossible with 2 outs (only need 1 more)")
                return result
            if not any(bases.values()):
                result["is_valid"] = False
                result["notes"].append("DP impossible with no runners on base")
                return result

        if outcome_name == "sac_bunt" and not any(bases.values()):
            result["is_valid"] = False
            result["notes"].append("Sac bunt with no runners is just a bunt out")
            return result

        result["outs_after"] = outs + outs_added

        if result["outs_after"] >= 3:
            result["inning_ends"] = True
            result["outs_after"] = 3

            # Run scoring on 3rd out
            if outcome["subtype"] == "ground" or outcome_name == "double_play":
                # Force out — no run scores
                if is_force_at("home", bases):
                    result["notes"].append("Force at home on ground ball — run does NOT score")
                else:
                    # Tag play — run might score if runner crosses before out
                    if bases["3B"] and outs + outs_added == 3:
                        result["notes"].append("CHECK: Did runner from 3rd cross before tag? Tag play timing matters")

            elif outcome["subtype"] == "fly":
                # Fly out for 3rd out — runner does NOT score (can't tag on 3rd out... wait)
                # Actually: sac fly with <2 outs is valid, but fly out for 3rd out means 2 outs before
                if outs == 2 and bases["3B"]:
                    result["notes"].append("3rd out on fly — runner on 3rd does NOT score")

            elif outcome["subtype"] == "strikeout":
                result["notes"].append("Strikeout for 3rd out — no runs score")

        else:
            # Not 3rd out — handle runner movement
            if outcome["subtype"] == "fly" and bases["3B"] and outs < 2:
                # Sac fly situation
                result["runs_scored"] = 1
                result["sac_fly"] = True
                result["rbi_credited"] = True
                new_bases = bases.copy()
                new_bases["3B"] = False
                # Other runners may or may not advance on fly
                result["new_bases"] = new_bases
                result["notes"].append("Sac fly: runner from 3rd scores")

            elif outcome["subtype"] == "ground":
                # Ground out — runners may advance on force
                new_bases = bases.copy()
                if bases["3B"] and not is_force_at("home", bases):
                    # Runner on 3rd can score on ground out (not forced)
                    result["runs_scored"] = 1
                    new_bases["3B"] = False
                    result["rbi_credited"] = True
                    result["notes"].append("Runner from 3rd scores on ground out (not in force)")
                result["new_bases"] = new_bases

            elif outcome_name == "fielders_choice":
                # Batter reaches, but a runner is out
                result["batter_reaches"] = True
                result["new_bases"] = {"1B": True, "2B": False, "3B": False}
                result["notes"].append("Fielder's choice: batter reaches, runner retired")

            elif outcome_name == "sac_bunt":
                new_bases = {"1B": False, "2B": False, "3B": False}
                if bases["1B"]:
                    new_bases["2B"] = True
                if bases["2B"]:
                    new_bases["3B"] = True
                if bases["3B"]:
                    result["runs_scored"] = 1
                    result["rbi_credited"] = True
                result["new_bases"] = new_bases
                result["notes"].append("Sac bunt: runners advance")

            elif outcome_name == "double_play":
                result["new_bases"] = {"1B": False, "2B": False, "3B": False}
                # Most common DP clears runner from 1st
                if bases["3B"] and not is_force_at("home", bases):
                    result["runs_scored"] = 1
                    result["notes"].append("Runner from 3rd may score on DP (not forced)")
                result["notes"].append("Double play: 2 outs recorded")

            else:
                result["new_bases"] = bases.copy()

    # ===================== NO-OUT EVENTS =====================
    elif outcome["type"] == "no_out":
        result["batter_reaches"] = True
        result["new_bases"] = bases.copy()

        if outcome["subtype"] in ("bb", "ibb", "hbp"):
            # Walk/HBP: batter to 1st, force runners advance
            new_bases = {"1B": True, "2B": False, "3B": False}

            if bases["1B"]:
                new_bases["2B"] = True
            if bases["1B"] and bases["2B"]:
                new_bases["3B"] = True
            if bases["1B"] and bases["2B"] and bases["3B"]:
                result["runs_scored"] = 1
                result["rbi_credited"] = True
                result["notes"].append("Bases loaded walk — run scores")
            elif not bases["1B"]:
                # No force, runners stay
                new_bases["2B"] = bases["2B"]
                new_bases["3B"] = bases["3B"]

            result["new_bases"] = new_bases

        elif outcome["subtype"] == "error":
            # Batter reaches on error, runners stay (fixed Feb 5)
            result["new_bases"]["1B"] = True
            result["notes"].append("Error: batter reaches 1st, existing runners NOT wiped (Feb 5 fix)")

        elif outcome["subtype"] == "d3k":
            # D3K: batter to 1st if unoccupied or 2 outs
            if not bases["1B"] or outs == 2:
                result["new_bases"]["1B"] = True
                result["notes"].append("D3K: batter reaches 1st")
            else:
                result["is_valid"] = False
                result["notes"].append("D3K invalid: 1st occupied with <2 outs")

    # ===================== SPECIAL EVENTS =====================
    elif outcome["type"] == "special":
        if outcome["subtype"] == "sb":
            if not any(bases.values()):
                result["is_valid"] = False
                result["notes"].append("Stolen base impossible with no runners")
            else:
                result["notes"].append("SB: verify which runner advances and to where")
                result["new_bases"] = bases.copy()

        elif outcome["subtype"] == "cs":
            if not any(bases.values()):
                result["is_valid"] = False
                result["notes"].append("CS impossible with no runners")
            else:
                result["outs_after"] = outs + 1
                if result["outs_after"] >= 3:
                    result["inning_ends"] = True
                result["notes"].append("CS: runner out, verify correct runner removed")

        elif outcome["subtype"] in ("wp", "pb"):
            if not any(bases.values()):
                result["notes"].append("WP/PB with no runners: just a ball/passed ball")
            else:
                new_bases = {"1B": False, "2B": False, "3B": False}
                if bases["3B"]:
                    result["runs_scored"] = 1
                    result["notes"].append("WP/PB: runner from 3rd scores (verify scoreboard line update)")
                if bases["2B"]:
                    new_bases["3B"] = True
                if bases["1B"]:
                    new_bases["2B"] = True
                result["new_bases"] = new_bases

    return result


def generate_all_test_cases() -> list[dict]:
    """Generate all combinations of base state × outs × outcome."""
    cases = []
    for base_name in BASE_STATES:
        for outs in OUT_STATES:
            for outcome_name in OUTCOMES:
                result = calculate_expected_result(base_name, outs, outcome_name)
                cases.append(result)
    return cases


def main():
    cases = generate_all_test_cases()
    valid = [c for c in cases if c["is_valid"]]
    invalid = [c for c in cases if not c["is_valid"]]

    if "--summary" in sys.argv:
        print(f"Total test cases: {len(cases)}")
        print(f"Valid combinations: {len(valid)}")
        print(f"Invalid combinations: {len(invalid)}")
        print(f"\nBy outcome type:")
        by_type = {}
        for c in valid:
            t = OUTCOMES[c["outcome"]]["type"]
            by_type[t] = by_type.get(t, 0) + 1
        for t, count in sorted(by_type.items()):
            print(f"  {t}: {count}")

        print(f"\nBy base state:")
        by_base = {}
        for c in valid:
            by_base[c["base_state"]] = by_base.get(c["base_state"], 0) + 1
        for b, count in sorted(by_base.items()):
            print(f"  {b}: {count}")

        print(f"\nCases with runs scoring: {sum(1 for c in valid if c['runs_scored'] > 0)}")
        print(f"Cases with inning ending: {sum(1 for c in valid if c['inning_ends'])}")
        print(f"Sac fly cases: {sum(1 for c in valid if c['sac_fly'])}")
    else:
        output = {
            "metadata": {
                "total_cases": len(cases),
                "valid_cases": len(valid),
                "invalid_cases": len(invalid),
                "base_states": list(BASE_STATES.keys()),
                "out_states": OUT_STATES,
                "outcomes": list(OUTCOMES.keys()),
            },
            "test_cases": valid,
            "invalid_cases": invalid,
        }
        print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
