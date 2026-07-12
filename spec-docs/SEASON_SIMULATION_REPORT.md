# Season Simulation Report

Generated: 2026-06-19

## L-SIM-H2 Summary

| Leg | Seed | Games Simulated | Total Scheduled Games | Stopped Early | Final Digest |
| --- | --- | ---: | ---: | --- | --- |
| Baseline | lsim-h2-baseline | 60 | 60 | false | 12721898:511c041c |
| Determinism A | lsim-h2-baseline-determinism | 60 | 60 | n/a | 12811603:ea55b394 |
| Determinism B | lsim-h2-baseline-determinism | 60 | 60 | n/a | 12811603:ea55b394 |

Determinism same-seed byte-identical end-state: **PASS**

Exact baseline games simulated: **60**

Checkpoint cadence: **standard** (5 boundaries)

Checkpoint files: /Users/johnkruse/Projects/kbl-relorganic/test-utils/lsim/results/lsim-h2-baseline-checkpoint-010.json, /Users/johnkruse/Projects/kbl-relorganic/test-utils/lsim/results/lsim-h2-baseline-checkpoint-020.json, /Users/johnkruse/Projects/kbl-relorganic/test-utils/lsim/results/lsim-h2-baseline-checkpoint-030.json, /Users/johnkruse/Projects/kbl-relorganic/test-utils/lsim/results/lsim-h2-baseline-checkpoint-040.json, /Users/johnkruse/Projects/kbl-relorganic/test-utils/lsim/results/lsim-h2-baseline-checkpoint-050.json, /Users/johnkruse/Projects/kbl-relorganic/test-utils/lsim/results/lsim-h2-baseline-checkpoint-060.json

## L13 Relationship Morale Deltas

```json
{
  "relationshipHits": 694,
  "relationshipRecoveries": 2,
  "relationshipChargedMatchups": 84,
  "relationshipPlayerGroups": 110,
  "duplicateSourceIds": 0,
  "recoveredGroups": 2,
  "recoveredGroupsNetZero": 2,
  "nonZeroRecoveredGroups": 0,
  "hitDeltaTotal": -821,
  "recoveryDeltaTotal": -11,
  "chargedDeltaTotal": -2,
  "chargedPositiveDeltas": 39,
  "chargedNegativeDeltas": 41,
  "recoveredGroupsNetDelta": 0,
  "ratingsDevelopmentRows": 357,
  "moraleToWarLeaks": 0,
  "sampleSourceEventIds": [
    "relationship-charged:lsim-franchise-h1:lsim-franchise-h1-season-step3-3:lsim-franchise-h1-season-step3-3:lsim-franchise-h1:lsim-franchise-h1-season-step3-3:lsim-franchise-h1-season-step3-3:lsim-team-01-mlb-01-C:lsim-team-04-mlb-10-C:RIVALRY:game-48",
    "relationship-charged:lsim-franchise-h1:lsim-franchise-h1-season-step3-3:lsim-franchise-h1-season-step3-3:lsim-franchise-h1:lsim-franchise-h1-season-step3-3:lsim-franchise-h1-season-step3-3:lsim-team-01-mlb-01-C:lsim-team-04-mlb-10-C:RIVALRY:game-48",
    "relationship-charged:lsim-franchise-h1:lsim-franchise-h1-season-step3-3:lsim-franchise-h1-season-step3-3:lsim-franchise-h1:lsim-franchise-h1-season-step3-3:lsim-franchise-h1-season-step3-3:lsim-team-01-mlb-02-1B:lsim-team-03-mlb-02-1B:RIVALRY:game-47",
    "relationship-charged:lsim-franchise-h1:lsim-franchise-h1-season-step3-3:lsim-franchise-h1-season-step3-3:lsim-franchise-h1:lsim-franchise-h1-season-step3-3:lsim-franchise-h1-season-step3-3:lsim-team-01-mlb-02-1B:lsim-team-03-mlb-02-1B:RIVALRY:game-47",
    "relationship-charged:lsim-franchise-h1:lsim-franchise-h1-season-step3-3:lsim-franchise-h1-season-step3-3:lsim-franchise-h1:lsim-franchise-h1-season-step3-3:lsim-franchise-h1-season-step3-3:lsim-team-01-mlb-04-SS:lsim-team-03-mlb-04-SS:RIVALRY:game-47",
    "relationship-charged:lsim-franchise-h1:lsim-franchise-h1-season-step3-3:lsim-franchise-h1-season-step3-3:lsim-franchise-h1:lsim-franchise-h1-season-step3-3:lsim-franchise-h1-season-step3-3:lsim-team-01-mlb-04-SS:lsim-team-03-mlb-04-SS:RIVALRY:game-47"
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
| soul.l13-relationship-formation-organic | CRITICAL | 60 | 0 |
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
    "GLOBAL_SUPERSTAR": 1,
    "NATIONAL_ICON": 30,
    "REGIONAL_STAR": 33,
    "LOCAL_HERO": 28,
    "UNKNOWN": 5,
    "POLARIZING": 4,
    "NOTORIOUS": 0,
    "DESPISED": 0
  },
  "fameHeatTransitions": {
    "up": 705,
    "down": 616
  },
  "traitGrantLossCounts": {
    "gain": 641,
    "lose": 4,
    "byTrait": {
      "Big Hack": {
        "gain": 27,
        "lose": 0
      },
      "Cannon Arm": {
        "gain": 121,
        "lose": 0
      },
      "Easy Target": {
        "gain": 6,
        "lose": 0
      },
      "Outside Pitch": {
        "gain": 8,
        "lose": 0
      },
      "Noodle Arm": {
        "gain": 104,
        "lose": 0
      },
      "Wild Thrower": {
        "gain": 174,
        "lose": 0
      },
      "Mind Gamer": {
        "gain": 15,
        "lose": 0
      },
      "Slow Poke": {
        "gain": 3,
        "lose": 0
      },
      "Tough Out": {
        "gain": 29,
        "lose": 0
      },
      "CON vs LHP": {
        "gain": 2,
        "lose": 0
      },
      "Inside Pitch": {
        "gain": 8,
        "lose": 0
      },
      "POW vs LHP": {
        "gain": 10,
        "lose": 0
      },
      "Rally Starter": {
        "gain": 3,
        "lose": 0
      },
      "Durable": {
        "gain": 44,
        "lose": 3
      },
      "Injury Prone": {
        "gain": 7,
        "lose": 0
      },
      "BB Prone": {
        "gain": 2,
        "lose": 0
      },
      "Crossed Up": {
        "gain": 11,
        "lose": 0
      },
      "K Collector": {
        "gain": 5,
        "lose": 1
      },
      "Specialist": {
        "gain": 5,
        "lose": 0
      },
      "Workhorse": {
        "gain": 17,
        "lose": 0
      },
      "Gets Ahead": {
        "gain": 3,
        "lose": 0
      },
      "Reverse Splits": {
        "gain": 5,
        "lose": 0
      },
      "Whiffer": {
        "gain": 13,
        "lose": 0
      },
      "Sprinter": {
        "gain": 4,
        "lose": 0
      },
      "Clutch": {
        "gain": 2,
        "lose": 0
      },
      "Wild Thing": {
        "gain": 8,
        "lose": 0
      },
      "Falls Behind": {
        "gain": 4,
        "lose": 0
      },
      "Metal Head": {
        "gain": 1,
        "lose": 0
      }
    }
  },
  "awardMargins": [
    {
      "category": "CY_YOUNG",
      "winnerPlayerId": "lsim-team-03-mlb-17-RP",
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
      "category": "MANAGER_OF_YEAR",
      "winnerPlayerId": "lsim-team-06:manager",
      "topMarginToWinner": 0,
      "candidateCount": 6,
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
    "roster": 13,
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
      "count": 102
    },
    "teamFan": {
      "min": 56,
      "max": 99,
      "count": 6
    },
    "autoBackstopFirings": 1,
    "autoBackstopFiringRate": 0.016666666666666666
  },
  "flashpointTaxMagnitudes": {
    "count": 6,
    "minLastGameTax": -0.6,
    "maxLastGameTax": 0,
    "totalAccumulatedFanMoraleTax": -20.8,
    "byKind": {
      "null": {
        "count": 4,
        "accumulatedFanMoraleTax": -16.65
      },
      "albatross": {
        "count": 2,
        "accumulatedFanMoraleTax": -4.15
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
