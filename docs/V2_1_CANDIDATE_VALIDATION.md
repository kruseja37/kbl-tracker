# V2.1 Candidate Validation

## Scope

This is a sim-only validation pass. It does not change live auction behavior, UI, storage, schema, production pool builders, chemistry, tax, personality, or reserve-price rollout behavior.

## Command

- `node --input-type=module -e "import('vite').then(async ({ createServer }) => { const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' }); await server.ssrLoadModule('/scripts/draftEconomyCandidateValidation.ts'); await server.close(); })"`
- Seeds: 12

## Candidate Validation Table

| Scenario | Pool | Bidder | Spot11 Cash | Final Cash | Final Quality | Spread p90 | High Tail | Middle Mass | Free Fill max | Near-Free Late p90 | Middle Draft Rate | Elite Conc p90 | Quota Shortfalls | Hard Inv | Moderate | Excellent |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| V2.1 candidate | quotaShapeFromPool n=110 | marginalValueV2Liquidity | 27.7% | 18.4% | 18.4% | 3.7% | 13.0% | 74.1% | 0 | 7 | 92.5% | 28.6% | 2 | 0 | PASS | PASS |
| V2.1 candidate n132 | quotaShapeFromPool n=132 | marginalValueV2Liquidity | 27.2% | 19.0% | 19.0% | 21.5% | 17.9% | 70.1% | 0 | 12 | 81.7% | 38.1% | 14 | 0 | FAIL | FAIL |
| V1 best | quotaShapeFromPool n=110 | marginalValueV1 | 3.0% | 0.0% | 0.0% | 6.9% | 13.0% | 74.1% | 0 | 38 | 92.5% | 35.7% | 2 | 0 | FAIL | FAIL |
| V2 strict-cash reference | quotaShapeFromPool n=110 | marginalValueV2Liquidity | 40.0% | 39.1% | 39.1% | 12.3% | 13.0% | 74.1% | 0 | 43 | 91.3% | 35.7% | 2 | 0 | FAIL | FAIL |
| Rational baseline | quotaShapeFromPool n=110 | rationalBaseline | 0.0% | 0.0% | 0.0% | 17.3% | 13.0% | 74.1% | 0 | 44 | 92.5% | 35.7% | 2 | 0 | FAIL | FAIL |
| Current pool V2 n110 | currentPool n=110 | marginalValueV2Liquidity | 34.6% | 23.6% | 23.6% | 21.5% | 43.6% | 56.4% | 0 | 14 | 64.5% | 37.5% | 0 | 0 | FAIL | FAIL |
| Current pool V2 n132 | currentPool n=132 | marginalValueV2Liquidity | 34.6% | 23.6% | 23.6% | 21.5% | 36.4% | 62.1% | 0 | 14 | 48.8% | 37.5% | 0 | 0 | FAIL | FAIL |

## Gate Result

- Candidate: `candidate-v21-n110`
- Moderate gate: PASS
- Excellent gate: PASS
- Fail reasons: none
- Quota shortfalls: 2 (reported as a diagnostic, not a proposed hard gate)
- Recommendation: ACCEPT_AS_SIM_CANDIDATE

## Representative Run

Representative seed: validation-seed-01

### Team Summary

| Team | Spend | Final Cash | Strength | Stars/Core/Filler | Roles | Legal | Thin Depth | Budget 5 | Budget 11 | Budget 16 | Budget 22 |
|---|---:|---:|---:|---|---|---|---|---:|---:|---:|---:|
| Blowfish | $831,000 | $169,000 | $2,088,430 | 2/20/0 | H13/P9/SP5/RP5/CP2/C5 | yes | none | $353,000 | $275,000 | $216,000 | $169,000 |
| Crocodons | $820,000 | $180,000 | $2,232,570 | 4/18/0 | H13/P9/SP4/RP6/CP2/C7 | yes | none | $372,000 | $277,000 | $218,000 | $180,000 |
| Moonstars | $810,000 | $190,000 | $2,184,552 | 4/18/0 | H13/P9/SP5/RP5/CP1/C4 | yes | none | $385,000 | $289,000 | $225,000 | $190,000 |
| Sirloins | $812,000 | $188,000 | $2,172,202 | 4/18/0 | H14/P8/SP4/RP7/CP1/C5 | yes | none | $364,000 | $277,000 | $221,000 | $188,000 |

### Spend Curve By Roster Segment

| Roster Segment | Median Pick Price |
|---|---:|
| 1-5 | $75,000 |
| 6-11 | $15,500 |
| 12-16 | $12,000 |
| 17-22 | $7,000 |

### Top 20 Most Expensive Players

| Rank | Player | Team | Price | Grade | Band | Role | Nomination |
|---:|---|---|---:|---:|---|---|---:|
| 1 | matrix-player-006 | Blowfish | $318,000 | 90.3 | elite | OF | 1 |
| 2 | matrix-player-009 | Crocodons | $314,000 | 89.3 | elite | SP | 2 |
| 3 | matrix-player-017 | Blowfish | $275,000 | 86.6 | elite | IF | 3 |
| 4 | matrix-player-027 | Moonstars | $234,000 | 83.2 | elite | RP | 5 |
| 5 | matrix-player-025 | Crocodons | $232,000 | 83.8 | elite | SP/RP | 4 |
| 6 | matrix-player-028 | Sirloins | $231,000 | 82.8 | elite | CP | 6 |
| 7 | matrix-player-033 | Moonstars | $211,000 | 81.1 | elite | IF | 7 |
| 8 | matrix-player-035 | Sirloins | $176,000 | 80.4 | elite | OF | 8 |
| 9 | matrix-player-036 | Sirloins | $176,000 | 80.1 | elite | OF | 9 |
| 10 | matrix-player-038 | Moonstars | $75,000 | 79.4 | elite | SP | 10 |
| 11 | matrix-player-041 | Moonstars | $75,000 | 78.4 | elite | RP | 11 |
| 12 | matrix-player-043 | Crocodons | $38,000 | 77.7 | elite | C | 12 |
| 13 | matrix-player-044 | Sirloins | $37,000 | 77.4 | elite | IF | 13 |
| 14 | matrix-player-046 | Crocodons | $28,000 | 76.7 | elite | IF | 14 |
| 15 | matrix-player-051 | Moonstars | $20,000 | 75.5 | strong | SP | 18 |
| 16 | matrix-player-050 | Blowfish | $19,000 | 75.3 | strong | OF | 20 |
| 17 | matrix-player-052 | Blowfish | $19,000 | 75.3 | strong | SP | 17 |
| 18 | matrix-player-057 | Moonstars | $18,000 | 74.2 | strong | C | 27 |
| 19 | matrix-player-058 | Crocodons | $18,000 | 74.0 | strong | IF | 26 |
| 20 | matrix-player-071 | Sirloins | $17,000 | 71.1 | strong | C | 31 |

### Top 20 Highest Numeric-Grade Players

| Rank | Player | Grade | IV | Status | Team | Price |
|---:|---|---:|---:|---|---|---:|
| 1 | matrix-player-006 | 90.3 | $326,360 | drafted | Blowfish | $318,000 |
| 2 | matrix-player-009 | 89.3 | $317,456 | drafted | Crocodons | $314,000 |
| 3 | matrix-player-017 | 86.6 | $293,712 | drafted | Blowfish | $275,000 |
| 4 | matrix-player-025 | 83.8 | $269,968 | drafted | Crocodons | $232,000 |
| 5 | matrix-player-027 | 83.2 | $264,032 | drafted | Moonstars | $234,000 |
| 6 | matrix-player-028 | 82.8 | $261,064 | drafted | Sirloins | $231,000 |
| 7 | matrix-player-033 | 81.1 | $246,224 | drafted | Moonstars | $211,000 |
| 8 | matrix-player-035 | 80.4 | $240,288 | drafted | Sirloins | $176,000 |
| 9 | matrix-player-036 | 80.1 | $237,320 | drafted | Sirloins | $176,000 |
| 10 | matrix-player-038 | 79.4 | $231,384 | drafted | Moonstars | $75,000 |
| 11 | matrix-player-041 | 78.4 | $222,480 | drafted | Moonstars | $75,000 |
| 12 | matrix-player-043 | 77.7 | $216,544 | drafted | Crocodons | $38,000 |
| 13 | matrix-player-044 | 77.4 | $213,576 | drafted | Sirloins | $37,000 |
| 14 | matrix-player-046 | 76.7 | $207,640 | drafted | Crocodons | $28,000 |
| 15 | matrix-player-049 | 75.7 | $91,522 | drafted | Moonstars | $15,000 |
| 16 | matrix-player-051 | 75.5 | $92,500 | drafted | Moonstars | $20,000 |
| 17 | matrix-player-050 | 75.3 | $91,286 | drafted | Blowfish | $19,000 |
| 18 | matrix-player-052 | 75.3 | $92,612 | drafted | Blowfish | $19,000 |
| 19 | matrix-player-053 | 75.1 | $92,724 | drafted | Sirloins | $16,000 |
| 20 | matrix-player-054 | 74.8 | $92,836 | drafted | Crocodons | $16,000 |

### Final Rosters

### Blowfish
| Slot | Player | Role | Grade | Band | Price | Source |
|---:|---|---|---:|---|---:|---|
| 1 | matrix-player-006 | LF | 90.3 | elite | $318,000 | auction |
| 2 | matrix-player-017 | 2B | 86.6 | elite | $275,000 | auction |
| 3 | matrix-player-052 | SP | 75.3 | strong | $19,000 | auction |
| 4 | matrix-player-050 | RF | 75.3 | strong | $19,000 | auction |
| 5 | matrix-player-063 | CF | 72.9 | strong | $16,000 | auction |
| 6 | matrix-player-062 | LF | 73.1 | strong | $16,000 | auction |
| 7 | matrix-player-061 | SS | 73.3 | strong | $16,000 | auction |
| 8 | matrix-player-060 | 3B | 73.5 | strong | $16,000 | auction |
| 9 | matrix-player-056 | CP | 74.4 | strong | $9,000 | auction |
| 10 | matrix-player-055 | RP | 74.6 | strong | $9,000 | auction |
| 11 | matrix-player-081 | SP/RP | 68.9 | core | $12,000 | auction |
| 12 | matrix-player-076 | LF | 70.0 | strong | $13,000 | auction |
| 13 | matrix-player-075 | SS | 70.2 | strong | $13,000 | auction |
| 14 | matrix-player-083 | RP | 68.5 | core | $12,000 | auction |
| 15 | matrix-player-099 | C | 64.9 | core | $11,000 | auction |
| 16 | matrix-player-094 | SP | 66.0 | core | $10,000 | auction |
| 17 | matrix-player-091 | CF | 66.7 | core | $7,000 | auction |
| 18 | matrix-player-108 | SP | 63.0 | core | $14,000 | auction |
| 19 | matrix-player-107 | SP | 63.2 | core | $14,000 | auction |
| 20 | matrix-player-101 | 2B | 64.5 | core | $6,000 | auction |
| 21 | matrix-player-100 | 1B | 64.7 | core | $6,000 | auction |
| 22 | matrix-player-126 | CP | 59.0 | core | $0 | auction |

### Crocodons
| Slot | Player | Role | Grade | Band | Price | Source |
|---:|---|---|---:|---|---:|---|
| 1 | matrix-player-009 | SP | 89.3 | elite | $314,000 | auction |
| 2 | matrix-player-025 | SP/RP | 83.8 | elite | $232,000 | auction |
| 3 | matrix-player-043 | C | 77.7 | elite | $38,000 | auction |
| 4 | matrix-player-046 | 3B | 76.7 | elite | $28,000 | auction |
| 5 | matrix-player-054 | RP | 74.8 | strong | $16,000 | auction |
| 6 | matrix-player-058 | 1B | 74.0 | strong | $18,000 | auction |
| 7 | matrix-player-070 | CP | 71.3 | strong | $16,000 | auction |
| 8 | matrix-player-068 | RP | 71.8 | strong | $16,000 | auction |
| 9 | matrix-player-065 | SP | 72.4 | strong | $16,000 | auction |
| 10 | matrix-player-064 | RF | 72.6 | strong | $15,000 | auction |
| 11 | matrix-player-077 | CF | 69.8 | core | $14,000 | auction |
| 12 | matrix-player-090 | LF | 66.9 | core | $13,000 | auction |
| 13 | matrix-player-089 | SS | 67.1 | core | $13,000 | auction |
| 14 | matrix-player-084 | CP | 68.2 | core | $12,000 | auction |
| 15 | matrix-player-097 | RP | 65.4 | core | $11,000 | auction |
| 16 | matrix-player-093 | SP | 66.3 | core | $10,000 | auction |
| 17 | matrix-player-103 | SS | 64.1 | core | $7,000 | auction |
| 18 | matrix-player-102 | 3B | 64.3 | core | $7,000 | auction |
| 19 | matrix-player-116 | 3B | 61.2 | core | $8,000 | auction |
| 20 | matrix-player-115 | 2B | 61.4 | core | $9,000 | auction |
| 21 | matrix-player-119 | CF | 60.5 | core | $7,000 | auction |
| 22 | matrix-player-130 | 3B | 58.1 | core | $0 | auction |

### Moonstars
| Slot | Player | Role | Grade | Band | Price | Source |
|---:|---|---|---:|---|---:|---|
| 1 | matrix-player-027 | RP | 83.2 | elite | $234,000 | auction |
| 2 | matrix-player-033 | SS | 81.1 | elite | $211,000 | auction |
| 3 | matrix-player-038 | SP | 79.4 | elite | $75,000 | auction |
| 4 | matrix-player-041 | RP | 78.4 | elite | $75,000 | auction |
| 5 | matrix-player-051 | SP | 75.5 | strong | $20,000 | auction |
| 6 | matrix-player-049 | CF | 75.7 | strong | $15,000 | auction |
| 7 | matrix-player-057 | C | 74.2 | strong | $18,000 | auction |
| 8 | matrix-player-072 | 1B | 70.9 | strong | $17,000 | auction |
| 9 | matrix-player-067 | SP/RP | 72.0 | strong | $16,000 | auction |
| 10 | matrix-player-080 | SP | 69.1 | core | $15,000 | auction |
| 11 | matrix-player-079 | SP | 69.3 | core | $15,000 | auction |
| 12 | matrix-player-078 | RF | 69.6 | core | $14,000 | auction |
| 13 | matrix-player-088 | 3B | 67.4 | core | $13,000 | auction |
| 14 | matrix-player-087 | 2B | 67.6 | core | $13,000 | auction |
| 15 | matrix-player-082 | RP | 68.7 | core | $12,000 | auction |
| 16 | matrix-player-098 | CP | 65.2 | core | $12,000 | auction |
| 17 | matrix-player-104 | LF | 63.8 | core | $16,000 | auction |
| 18 | matrix-player-114 | 1B | 61.6 | core | $9,000 | auction |
| 19 | matrix-player-113 | C | 61.9 | core | $9,000 | auction |
| 20 | matrix-player-120 | RF | 60.3 | core | $1,000 | auction |
| 21 | matrix-player-129 | 2B | 58.3 | core | $0 | auction |
| 22 | matrix-player-128 | 1B | 58.6 | core | $0 | auction |

### Sirloins
| Slot | Player | Role | Grade | Band | Price | Source |
|---:|---|---|---:|---|---:|---|
| 1 | matrix-player-028 | CP | 82.8 | elite | $231,000 | auction |
| 2 | matrix-player-035 | CF | 80.4 | elite | $176,000 | auction |
| 3 | matrix-player-036 | RF | 80.1 | elite | $176,000 | auction |
| 4 | matrix-player-044 | 1B | 77.4 | elite | $37,000 | auction |
| 5 | matrix-player-053 | SP/RP | 75.1 | strong | $16,000 | auction |
| 6 | matrix-player-059 | 2B | 73.7 | strong | $16,000 | auction |
| 7 | matrix-player-071 | C | 71.1 | strong | $17,000 | auction |
| 8 | matrix-player-069 | RP | 71.5 | strong | $15,000 | auction |
| 9 | matrix-player-066 | SP | 72.2 | strong | $11,000 | auction |
| 10 | matrix-player-074 | 3B | 70.4 | strong | $14,000 | auction |
| 11 | matrix-player-073 | 2B | 70.7 | strong | $14,000 | auction |
| 12 | matrix-player-086 | 1B | 67.8 | core | $13,000 | auction |
| 13 | matrix-player-085 | C | 68.0 | core | $13,000 | auction |
| 14 | matrix-player-096 | RP | 65.6 | core | $11,000 | auction |
| 15 | matrix-player-095 | SP/RP | 65.8 | core | $11,000 | auction |
| 16 | matrix-player-092 | RF | 66.5 | core | $8,000 | auction |
| 17 | matrix-player-106 | RF | 63.4 | core | $1,000 | auction |
| 18 | matrix-player-105 | CF | 63.6 | core | $8,000 | auction |
| 19 | matrix-player-117 | SS | 61.0 | core | $9,000 | auction |
| 20 | matrix-player-111 | RP | 62.3 | core | $1,000 | auction |
| 21 | matrix-player-109 | SP/RP | 62.7 | core | $6,000 | auction |
| 22 | matrix-player-118 | LF | 60.8 | core | $8,000 | auction |

## Pick-Log Weirdness Audit

- 7 late sold picks were at or below one bid increment.

## Read

- Middle-class draft rate median: 92.5%
- Elite concentration p90: 28.6%
- Best/worst roster spread p90: 3.7%
- Near-free late picks p90: 7
- Quota shortfalls: 2
- Free fill max: 0
- Hard invariant failures: 0

The candidate validates as a believable sim candidate if the product accepts the moderate gate. It still should not be wired to production until a separate design contract decides how this sim policy maps to the real pool extractor and live bidder.

## Next Production-Design Recommendation

Do not ship this bidder directly. Use it to write a production design contract around the moderate gate: spot11 cash 20-35%, non-negative final cash/surplus, spread p90 <=7%, free fill 0, high tail <=15%, middle mass >=70%, and no hard invariants. Then decide whether the live auction should use liquidity-aware WTP, pool-shape controls, or both.
