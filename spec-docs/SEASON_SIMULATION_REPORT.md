# Season Simulation Report

Generated: 2026-06-19

## L-SIM-H2 Summary

| Leg | Seed | Games Simulated | Total Scheduled Games | Stopped Early | Final Digest |
| --- | --- | ---: | ---: | --- | --- |
| Baseline | lsim-h2-baseline | 60 | 60 | false | 9859795:3f0be15e |
| Determinism A | lsim-h2-baseline-determinism | 60 | 60 | n/a | 9903513:1c533f0d |
| Determinism B | lsim-h2-baseline-determinism | 60 | 60 | n/a | 9903513:1c533f0d |

Determinism same-seed byte-identical end-state: **PASS**

Exact baseline games simulated: **60**

Checkpoint cadence: **standard** (5 boundaries)

Checkpoint files: /Users/johnkruse/Projects/kbl-tracker/test-utils/lsim/results/lsim-h2-baseline-checkpoint-010.json, /Users/johnkruse/Projects/kbl-tracker/test-utils/lsim/results/lsim-h2-baseline-checkpoint-020.json, /Users/johnkruse/Projects/kbl-tracker/test-utils/lsim/results/lsim-h2-baseline-checkpoint-030.json, /Users/johnkruse/Projects/kbl-tracker/test-utils/lsim/results/lsim-h2-baseline-checkpoint-040.json, /Users/johnkruse/Projects/kbl-tracker/test-utils/lsim/results/lsim-h2-baseline-checkpoint-050.json, /Users/johnkruse/Projects/kbl-tracker/test-utils/lsim/results/lsim-h2-baseline-checkpoint-060.json

## L13 Relationship Morale Deltas

```json
{
  "relationshipHits": 400,
  "relationshipRecoveries": 2,
  "relationshipChargedMatchups": 6,
  "relationshipPlayerGroups": 16,
  "duplicateSourceIds": 0,
  "recoveredGroups": 2,
  "recoveredGroupsNetZero": 2,
  "nonZeroRecoveredGroups": 0,
  "hitDeltaTotal": 260,
  "recoveryDeltaTotal": 11,
  "chargedDeltaTotal": 0,
  "chargedPositiveDeltas": 3,
  "chargedNegativeDeltas": 3,
  "recoveredGroupsNetDelta": 0,
  "ratingsDevelopmentRows": 275,
  "moraleToWarLeaks": 0,
  "sampleSourceEventIds": [
    "relationship-charged:lsim-franchise-h1:lsim-franchise-h1-season-step3-3:lsim-franchise-h1-season-step3-3:lsim-franchise-h1:lsim-franchise-h1-season-step3-3:lsim-franchise-h1-season-step3-3:lsim-team-04-mlb-05-3B:lsim-team-05-mlb-05-3B:FEUD:game-43",
    "relationship-charged:lsim-franchise-h1:lsim-franchise-h1-season-step3-3:lsim-franchise-h1-season-step3-3:lsim-franchise-h1:lsim-franchise-h1-season-step3-3:lsim-franchise-h1-season-step3-3:lsim-team-04-mlb-05-3B:lsim-team-05-mlb-05-3B:FEUD:game-43",
    "relationship-charged:lsim-franchise-h1:lsim-franchise-h1-season-step3-3:lsim-franchise-h1-season-step3-3:lsim-franchise-h1:lsim-franchise-h1-season-step3-3:lsim-franchise-h1-season-step3-3:lsim-team-04-mlb-05-3B:lsim-team-05-mlb-05-3B:FEUD:game-58",
    "relationship-charged:lsim-franchise-h1:lsim-franchise-h1-season-step3-3:lsim-franchise-h1-season-step3-3:lsim-franchise-h1:lsim-franchise-h1-season-step3-3:lsim-franchise-h1-season-step3-3:lsim-team-04-mlb-05-3B:lsim-team-05-mlb-05-3B:FEUD:game-58",
    "relationship-charged:lsim-franchise-h1:lsim-franchise-h1-season-step3-3:lsim-franchise-h1-season-step3-3:lsim-franchise-h1:lsim-franchise-h1-season-step3-3:lsim-franchise-h1-season-step3-3:lsim-team-05-mlb-04-SS:lsim-team-05-mlb-05-3B:FEUD:game-13",
    "relationship-charged:lsim-franchise-h1:lsim-franchise-h1-season-step3-3:lsim-franchise-h1-season-step3-3:lsim-franchise-h1:lsim-franchise-h1-season-step3-3:lsim-franchise-h1-season-step3-3:lsim-team-05-mlb-04-SS:lsim-team-05-mlb-05-3B:FEUD:game-13"
  ]
}
```

## Soul-Layer Invariants

| Invariant | Tag | Pass Count | Fail Count |
| --- | --- | ---: | ---: |
| soul.albatross-2x-min-salary-overpaid-gate | CRITICAL | 60 | 0 |
| soul.all-star-sixty-percent-lock | CRITICAL | 60 | 0 |
| soul.awards-off-frozen-artifact | CRITICAL | 60 | 0 |
| soul.channel-separation-double-count-guards | CRITICAL | 60 | 0 |
| soul.checkpoint-cadence-matches-setting | CRITICAL | 60 | 0 |
| soul.designation-six-slots-single-holder | CRITICAL | 60 | 0 |
| soul.emission-snub-signal | INVESTIGATE | 60 | 0 |
| soul.fame-components-finite | CRITICAL | 60 | 0 |
| soul.fame-heat-fickle | INVESTIGATE | 60 | 0 |
| soul.fame-reach-monotonic | CRITICAL | 60 | 0 |
| soul.fame-war-legitimacy-floor | INVESTIGATE | 60 | 0 |
| soul.flashpoint-compounding-clamped | CRITICAL | 60 | 0 |
| soul.l10-per-game-cadence | INVESTIGATE | 60 | 0 |
| soul.l11-backstop-under-25-plus-roll | CRITICAL | 60 | 0 |
| soul.l12-race-no-nan-resolve-tier | CRITICAL | 60 | 0 |
| soul.l13-relationship-formation-checkpoint-write | CRITICAL | 60 | 0 |
| soul.l13-relationship-intensity-lifecycle | CRITICAL | 60 | 0 |
| soul.l13-relationship-morale-development-boundary | CRITICAL | 60 | 0 |
| soul.l13-rep4-fan-nudge-boundary | CRITICAL | 60 | 0 |
| soul.morale-bounds | CRITICAL | 60 | 0 |
| soul.per-write-idempotency | CRITICAL | 60 | 0 |
| soul.persistence-backup-migration-proof | CRITICAL | 60 | 0 |
| soul.ratings-overlay-validity | CRITICAL | 60 | 0 |
| soul.reach-floor-ratchet | CRITICAL | 60 | 0 |
| soul.trait-two-slot-no-offset-hysteresis | CRITICAL | 60 | 0 |
| soul.tv-freeze | CRITICAL | 60 | 0 |
| stats.batting-row-arithmetic | CRITICAL | 60 | 0 |
| stats.completed-games-count | CRITICAL | 60 | 0 |
| stats.derived-rate-ranges | CRITICAL | 60 | 0 |
| stats.fielding-row-arithmetic | CRITICAL | 60 | 0 |
| stats.last-game-applied-to-season-totals | CRITICAL | 60 | 0 |
| stats.league-runs-scored-equal-allowed | CRITICAL | 60 | 0 |
| stats.league-wins-equal-losses | CRITICAL | 60 | 0 |
| stats.no-nan-or-infinity | CRITICAL | 60 | 0 |
| stats.pitching-row-arithmetic | CRITICAL | 60 | 0 |
| stats.standings-match-completed-games | CRITICAL | 60 | 0 |
| stats.team-game-conservation | CRITICAL | 60 | 0 |
| stats.war-fields-finite | CRITICAL | 60 | 0 |

## Gaps / Deferred

- §5.4 soul.real-export-migration-survival: H2 validates sandbox backup/restore round-trip through the real API; no real user export is touched under the sandbox-only contract.
- §5.6 soul.tv-fixed-baseline-non-drift-across-seasons: H2 baseline is one season; multi-season legs are delegated to Opus step 4.

## Section 9 Distributions

```json
{
  "fameTierDistribution": {
    "IMMORTAL_LEGEND": 1,
    "GLOBAL_SUPERSTAR": 3,
    "NATIONAL_ICON": 1,
    "REGIONAL_STAR": 6,
    "LOCAL_HERO": 5,
    "UNKNOWN": 11,
    "POLARIZING": 18,
    "NOTORIOUS": 10,
    "DESPISED": 11
  },
  "fameHeatTransitions": {
    "up": 497,
    "down": 740
  },
  "traitGrantLossCounts": {
    "gain": 1640,
    "lose": 10,
    "byTrait": {
      "Bunter": {
        "gain": 180,
        "lose": 0
      },
      "Cannon Arm": {
        "gain": 112,
        "lose": 0
      },
      "Durable": {
        "gain": 209,
        "lose": 4
      },
      "Easy Target": {
        "gain": 74,
        "lose": 0
      },
      "Little Hack": {
        "gain": 67,
        "lose": 0
      },
      "Mind Gamer": {
        "gain": 70,
        "lose": 0
      },
      "POW vs LHP": {
        "gain": 40,
        "lose": 0
      },
      "Rally Starter": {
        "gain": 38,
        "lose": 0
      },
      "Sprinter": {
        "gain": 136,
        "lose": 0
      },
      "Tough Out": {
        "gain": 72,
        "lose": 1
      },
      "Big Hack": {
        "gain": 52,
        "lose": 0
      },
      "Injury Prone": {
        "gain": 78,
        "lose": 0
      },
      "Noodle Arm": {
        "gain": 186,
        "lose": 0
      },
      "Slow Poke": {
        "gain": 44,
        "lose": 0
      },
      "Whiffer": {
        "gain": 48,
        "lose": 0
      },
      "Choker": {
        "gain": 28,
        "lose": 0
      },
      "CON vs LHP": {
        "gain": 63,
        "lose": 0
      },
      "Clutch": {
        "gain": 28,
        "lose": 0
      },
      "Butter Fingers": {
        "gain": 14,
        "lose": 0
      },
      "Composed": {
        "gain": 12,
        "lose": 0
      },
      "Crossed Up": {
        "gain": 30,
        "lose": 0
      },
      "Gets Ahead": {
        "gain": 12,
        "lose": 0
      },
      "K Collector": {
        "gain": 9,
        "lose": 5
      },
      "Specialist": {
        "gain": 10,
        "lose": 0
      },
      "Reverse Splits": {
        "gain": 10,
        "lose": 0
      },
      "BB Prone": {
        "gain": 8,
        "lose": 0
      },
      "Falls Behind": {
        "gain": 8,
        "lose": 0
      },
      "K Neglector": {
        "gain": 2,
        "lose": 0
      }
    }
  },
  "awardMargins": [
    {
      "category": "CY_YOUNG",
      "winnerPlayerId": "lsim-team-01-mlb-17-RP",
      "topMarginToWinner": 0,
      "candidateCount": 12,
      "finalized": true
    },
    {
      "category": "GOLD_GLOVE",
      "winnerPlayerId": "lsim-team-05-mlb-22-CF",
      "topMarginToWinner": 0,
      "candidateCount": 84,
      "finalized": true
    },
    {
      "category": "MVP",
      "winnerPlayerId": "lsim-team-01-mlb-01-C",
      "topMarginToWinner": 0,
      "candidateCount": 84,
      "finalized": true
    },
    {
      "category": "ROOKIE_OF_YEAR",
      "winnerPlayerId": "lsim-team-01-mlb-01-C",
      "topMarginToWinner": 0,
      "candidateCount": 84,
      "finalized": true
    },
    {
      "category": "SILVER_SLUGGER",
      "winnerPlayerId": "lsim-team-01-mlb-01-C",
      "topMarginToWinner": 0,
      "candidateCount": 84,
      "finalized": true
    }
  ],
  "randomEventFrequencyByFamily": {
    "performance": 47,
    "roster": 20,
    "role": 17,
    "trait": 19,
    "pitching": 9,
    "wildcard": 6,
    "cosmetic": 12,
    "team": 1
  },
  "moraleRanges": {
    "player": {
      "min": 0,
      "max": 99,
      "count": 85
    },
    "teamFan": {
      "min": 7,
      "max": 99,
      "count": 6
    },
    "autoBackstopFirings": 1,
    "autoBackstopFiringRate": 0.016666666666666666
  },
  "flashpointTaxMagnitudes": {
    "count": 5,
    "minLastGameTax": -1.1,
    "maxLastGameTax": -0.55,
    "totalAccumulatedFanMoraleTax": -22.15,
    "byKind": {
      "albatross": {
        "count": 5,
        "accumulatedFanMoraleTax": -22.15
      }
    }
  }
}
```

## Findings

No RED findings logged.

## Notes

- The runner drives real `processCompletedGame` with all Phase-2 flags forced on.
- The baseline sandbox is direct, deterministic, 6 teams, 20 games per team, 60 scheduled games.
- The full edge-league and multi-season matrix remains assigned to the Opus step-4 audit.
