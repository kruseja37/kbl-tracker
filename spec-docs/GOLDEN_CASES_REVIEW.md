# Golden Cases Review Document

**Generated:** 2026-02-09
**Source:** `test-utils/golden-cases.json`
**Engine API Map:** 2026-02-08
**Total Cases:** 30
**Estimated Review Time:** ~20 minutes

---

## How to Review

1. Read each cluster (8 clusters, 30 cases total)
2. For each case, verify the **expected_output** matches your baseball knowledge
3. Pay special attention to cases marked with expected bugs (D-01, D-04, D-05, D-07)
4. Resolve any cases with baserunning assumptions
5. Mark each cluster as APPROVED or NEEDS REVISION

**Legend:**
- EXPECTED FAIL = Known bug, test should fail until bug is fixed
- NEEDS CONFIRMATION = Baserunning assumption that could go either way

---

## Known Bugs (Flagged as EXPECTED FAIL)

| Bug ID | Description | Cases Affected |
|--------|-------------|----------------|
| D-01 | W/L assignment uses "most runsAllowed" not lead-change tracking | (No golden cases test W/L directly — tested at game-end level) |
| D-04 | `recordError` accepts `rbi` parameter but `calculateRBIs` returns 0 for errors | GC-23 |
| D-05 | `recordD3K` hardcodes `leverageIndex=1.0` instead of `getBaseOutLI()` | GC-15, GC-16 |
| D-07 | TOOTBLAN fame is flat -3.0 instead of tiered -0.5 / -2.0 (rally killer) | GC-29 |

---

## Coverage Gap Priorities Addressed

| Gap | Previous Coverage | Cases Addressing |
|-----|------------------|------------------|
| **KL (strikeout looking)** | 0% | GC-13, GC-14 |
| **1-out scenarios** | 7% (93% untested) | GC-02, GC-05, GC-08, GC-11, GC-13, GC-16, GC-19, GC-22, GC-25, GC-28 |
| **R2+R3 base state** | 15% (85% untested) | GC-01, GC-06, GC-14, GC-20, GC-28 |
| **Multi-runner at 2 outs** | Sparse | GC-04, GC-07, GC-14, GC-17, GC-23, GC-27, GC-29 |

---

## Cluster 1: Hits (5 cases)

### GC-01: Single with R2+R3, 0 outs

| Field | Value |
|-------|-------|
| **Setup** | Top 3, 0 outs, R2+R3, Away 0 Home 1 |
| **Action** | `recordHit('1B', 2, {fromSecond:'third', fromThird:'home'})` |
| **Expected** | 0 outs, R1+R3, Away 2 Home 1, 2 runs scored |
| **Batter stats** | PA=1, AB=1, H=1, 1B=1, RBI=2 |
| **Reasoning** | R3 scores, R2 to 3B, batter to 1B. Standard single advancement. |

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

### GC-02: Double with R1, 1 out

| Field | Value |
|-------|-------|
| **Setup** | Bot 5, 1 out, R1, Away 3 Home 2 |
| **Action** | `recordHit('2B', 0, {fromFirst:'third'})` |
| **Expected** | 1 out, R2+R3, Away 3 Home 2, 0 runs |
| **Batter stats** | PA=1, AB=1, H=1, 2B=1, RBI=0 |
| **Reasoning** | R1 to 3B (default on 2B), batter to 2B. No scoring. |

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

### GC-03: Triple with loaded bases, 0 outs

| Field | Value |
|-------|-------|
| **Setup** | Top 1, 0 outs, loaded, 0-0 |
| **Action** | `recordHit('3B', 3, {fromFirst:'home', fromSecond:'home', fromThird:'home'})` |
| **Expected** | 0 outs, R3 only, Away 3 Home 0, 3 runs |
| **Batter stats** | PA=1, AB=1, H=1, 3B=1, RBI=3 |
| **Reasoning** | All runners score on triple. Batter to 3B. |

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

### GC-04: Grand slam HR with loaded bases, 2 outs

| Field | Value |
|-------|-------|
| **Setup** | Bot 7, 2 outs, loaded, Away 6 Home 3 |
| **Action** | `recordHit('HR', 4)` (no runnerData — auto-score all) |
| **Expected** | 2 outs, empty, Away 6 Home 7, 4 runs |
| **Batter stats** | PA=1, AB=1, H=1, HR=1, RBI=4, R=1 |
| **Reasoning** | HR auto-scores all runners (line 1137-1147). Bases clear. |

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

### GC-05: Single with R1+R3, 1 out

| Field | Value |
|-------|-------|
| **Setup** | Top 4, 1 out, R1+R3, Away 1 Home 2 |
| **Action** | `recordHit('1B', 1, {fromFirst:'second', fromThird:'home'})` |
| **Expected** | 1 out, R1+R2, Away 2 Home 2, 1 run |
| **Batter stats** | PA=1, AB=1, H=1, 1B=1, RBI=1 |
| **Reasoning** | R3 scores, R1 to 2B, batter to 1B. Standard advancement. |

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

## Cluster 2: Walks & HBP (3 cases)

### GC-06: Walk with R2+R3, 0 outs (no force!)

| Field | Value |
|-------|-------|
| **Setup** | Bot 2, 0 outs, R2+R3, Away 1 Home 0 |
| **Action** | `recordWalk('BB')` |
| **Expected** | 0 outs, loaded, Away 1 Home 0, 0 runs |
| **Batter stats** | PA=1, AB=0, BB=1 |
| **Reasoning** | R1 empty means NO force chain. R2 and R3 are NOT forced. They HOLD. Batter to 1B. |

**KEY TEST:** Verifies that R2+R3 runners hold when R1 is empty. Common misconception that R3 always advances on walk.

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

### GC-07: Bases loaded walk, 2 outs

| Field | Value |
|-------|-------|
| **Setup** | Top 6, 2 outs, loaded, Away 3 Home 4 |
| **Action** | `recordWalk('BB')` |
| **Expected** | 2 outs, loaded, Away 4 Home 4, 1 run |
| **Batter stats** | PA=1, AB=0, BB=1, RBI=1 |
| **Pitcher stats** | walksAllowed+1, basesLoadedWalks+1, runsAllowed+1, ER+1 |
| **Reasoning** | All runners forced. R3 forced home (1 run). Bases remain loaded. |

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

### GC-08: HBP with R1+R2, 1 out

| Field | Value |
|-------|-------|
| **Setup** | Bot 3, 1 out, R1+R2, 1-1 |
| **Action** | `recordWalk('HBP')` |
| **Expected** | 1 out, loaded, 1-1, 0 runs |
| **Batter stats** | PA=1, AB=0, HBP=1 |
| **Pitcher stats** | hitByPitch+1 (NOT walksAllowed!) |
| **Reasoning** | R1 forced to 2B, R2 forced to 3B. HBP tracked separately (MAJ-07). |

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

## Cluster 3: Standard Outs (4 cases)

### GC-09: Strikeout (K) with bases empty, 0 outs

| Field | Value |
|-------|-------|
| **Setup** | Top 1, 0 outs, empty, 0-0 |
| **Action** | `recordOut('K')` |
| **Expected** | 1 out, empty, 0-0, 0 runs |
| **Batter stats** | PA=1, AB=1, K=1 |
| **Pitcher stats** | K+1, outsRecorded+1, BF+1 |
| **Reasoning** | Basic strikeout. Baseline case. |

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

### GC-10: Groundout with R3 only, 0 outs

| Field | Value |
|-------|-------|
| **Setup** | Bot 4, 0 outs, R3, 0-0 |
| **Action** | `recordOut('GO')` |
| **Expected** | 1 out, R3, 0-0, 0 runs |
| **Reasoning** | R3 HOLDS on GO (not forced, no tag-up opportunity on GO). Contrast with FO. |

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

### GC-11: Flyout with R3, 1 out (tag-up scores)

| Field | Value |
|-------|-------|
| **Setup** | Top 5, 1 out, R3, Away 2 Home 2 |
| **Action** | `recordOut('FO', {fromThird:'home'})` |
| **Expected** | 2 outs, empty, Away 3 Home 2, 1 run |
| **Batter stats** | PA=1, AB=1, RBI=1 |
| **Reasoning** | FO + R3 + <2 outs = tag up. Auto-corrects FO -> SF. SF gives 1 RBI. |

**CRITICAL:** This case should trigger autoCorrectResult (FO -> SF).

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

### GC-12: Lineout with R1+R2, 2 outs (inning ends)

| Field | Value |
|-------|-------|
| **Setup** | Bot 7, 2 outs, R1+R2, Away 4 Home 5 |
| **Action** | `recordOut('LO')` |
| **Expected** | 3 outs, empty, 0 runs, triggers endInning |
| **Reasoning** | 3rd out. Runners stranded. Inning ends with 500ms delay. |

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

## Cluster 4: KL & D3K (Priority Gaps)

### GC-13: KL with R1, 1 out

| Field | Value |
|-------|-------|
| **Setup** | Top 3, 1 out, R1, 0-0 |
| **Action** | `recordOut('KL')` |
| **Expected** | 2 outs, R1, 0-0, 0 runs |
| **Batter stats** | PA=1, AB=1, K=1 |
| **Pitcher stats** | K+1, outsRecorded+1, BF+1 |
| **Reasoning** | KL identical to K for stats. Runner holds. KL had ZERO test coverage. |

**PRIORITY:** KL was 0% tested. This is the simplest KL case.

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

### GC-14: KL with R2+R3, 2 outs (triple priority gap)

| Field | Value |
|-------|-------|
| **Setup** | Bot 8, 2 outs, R2+R3, Away 4 Home 3 |
| **Action** | `recordOut('KL')` |
| **Expected** | 3 outs, empty, 0 runs, triggers endInning |
| **Reasoning** | 3rd out. R2+R3 stranded. Combines KL + R2+R3 + 2-out gaps. |

**TRIPLE PRIORITY:** KL (0%) + R2+R3 (85% untested) + multi-runner at 2 outs.

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

### GC-15: D3K batter reaches, empty bases, 2 outs

| Field | Value |
|-------|-------|
| **Setup** | Top 6, 2 outs, empty, 1-1 |
| **Action** | `recordD3K(batterReached: true)` |
| **Expected** | 2 outs, R1, 1-1, 0 runs |
| **Batter stats** | PA=1, AB=1, K=1 (K despite reaching!) |
| **Pitcher stats** | K+1, BF+1 (NO outsRecorded!) |

**EXPECTED FAIL (D-05):** leverageIndex hardcoded to 1.0 instead of `getBaseOutLI(0, 2)`.

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

### GC-16: D3K batter out (1B occupied, 1 out)

| Field | Value |
|-------|-------|
| **Setup** | Bot 4, 1 out, R1, Away 2 Home 0 |
| **Action** | `recordD3K(batterReached: false)` |
| **Expected** | 2 outs, R1, Away 2 Home 0, 0 runs |
| **Batter stats** | PA=1, AB=1, K=1 |
| **Pitcher stats** | K+1, outsRecorded+1, BF+1 |

**EXPECTED FAIL (D-05):** leverageIndex hardcoded to 1.0 instead of `getBaseOutLI(1, 1)`.

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

## Cluster 5: Double Plays & Triple Plays (3 cases)

### GC-17: DP with loaded bases, 0 outs (R3 scores, 0 RBI)

| Field | Value |
|-------|-------|
| **Setup** | Top 5, 0 outs, loaded, Away 1 Home 2 |
| **Action** | `recordOut('DP', {fromFirst:'out', fromSecond:'third', fromThird:'home'})` |
| **Expected** | 2 outs, R3 only, Away 2 Home 2, 1 run |
| **Batter stats** | PA=1, AB=1, RBI=0 |
| **Reasoning** | R3 scores, R2 to 3B, R1 out at 2B, batter out at 1B. DP/TP = 0 RBI always. |

**KEY:** DP always gives 0 RBI even when runs score.

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

### GC-18: Classic DP with R1 only, 0 outs

| Field | Value |
|-------|-------|
| **Setup** | Bot 2, 0 outs, R1, 0-0 |
| **Action** | `recordOut('DP', {fromFirst:'out'})` |
| **Expected** | 2 outs, empty, 0-0, 0 runs |
| **Reasoning** | Classic 6-4-3 DP. R1 out at 2B, batter out at 1B. |

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

### GC-19: Triple play with R1+R2, 0 outs

| Field | Value |
|-------|-------|
| **Setup** | Top 3, 0 outs, R1+R2, Away 0 Home 1 |
| **Action** | `recordOut('TP', {fromFirst:'out', fromSecond:'out'})` |
| **Expected** | 3 outs, empty, 0 runs, triggers endInning |
| **Reasoning** | R1 out, R2 out, batter out = 3 outs. Inning ends. 0 RBI. |

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

## Cluster 6: Sacrifice Plays & Fielder's Choice (3 cases)

### GC-20: Sac fly with R2+R3, 0 outs

| Field | Value |
|-------|-------|
| **Setup** | Bot 8, 0 outs, R2+R3, Away 5 Home 4 |
| **Action** | `recordOut('SF', {fromThird:'home'})` |
| **Expected** | 1 out, R2 only, Away 5 Home 5, 1 run |
| **Batter stats** | PA=1, AB=0 (SF doesn't count as AB!), RBI=1 |
| **Reasoning** | R3 scores (that's what makes it SF). R2 holds. No AB charged. |

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

### GC-21: Sac bunt with R1, 0 outs

| Field | Value |
|-------|-------|
| **Setup** | Top 7, 0 outs, R1, 3-3 |
| **Action** | `recordOut('SH', {fromFirst:'second'})` |
| **Expected** | 1 out, R2 only, 3-3, 0 runs |
| **Batter stats** | PA=1, AB=0 (SH doesn't count as AB!) |
| **Reasoning** | R1 to 2B, batter out. No AB charged. |

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

### GC-22: FC with R1+R3, 1 out (batter reaches!)

| Field | Value |
|-------|-------|
| **Setup** | Bot 6, 1 out, R1+R3, Away 2 Home 3 |
| **Action** | `recordOut('FC', {fromFirst:'out'})` |
| **Expected** | 2 outs, R1+R3, Away 2 Home 3, 0 runs |
| **Reasoning** | FC: batter reaches 1B (safe!), R1 out at 2B, R3 holds. |

**CRITICAL:** FC is the only "out" where the batter reaches base.

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

## Cluster 7: Errors & IBB (3 cases)

### GC-23: Error with R1+R2, 2 outs

| Field | Value |
|-------|-------|
| **Setup** | Top 5, 2 outs, R1+R2, Away 0 Home 1 |
| **Action** | `recordError(0, {fromFirst:'second', fromSecond:'third'})` |
| **Expected** | 2 outs, loaded, Away 0 Home 1, 0 runs |
| **Batter stats** | PA=1, AB=1 |
| **Scoreboard** | Fielding team errors +1 |

**EXPECTED FAIL (D-04):** `recordError` accepts rbi parameter but `calculateRBIs` returns 0 for errors. Discrepancy in code.

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

### GC-24: Error with R3, 0 outs (unearned run)

| Field | Value |
|-------|-------|
| **Setup** | Bot 3, 0 outs, R3, Away 1 Home 0 |
| **Action** | `recordError(0, {fromThird:'home'})` |
| **Expected** | 0 outs, R1 only, Away 1 Home 1, 1 run |
| **Pitcher stats** | runsAllowed+1, earnedRuns+0 (UNEARNED!) |
| **Reasoning** | R3 scores. Run is UNEARNED because it scored on an error. |

**KEY:** Verifies ER attribution. Error runs = unearned.

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

### GC-25: IBB with R2, 1 out

| Field | Value |
|-------|-------|
| **Setup** | Top 7, 1 out, R2, 3-3 |
| **Action** | `recordWalk('IBB')` |
| **Expected** | 1 out, R1+R2, 3-3, 0 runs |
| **Batter stats** | PA=1, AB=0, BB=0 (IBB is NOT a BB!) |
| **Pitcher stats** | intentionalWalks+1, walksAllowed+0 |
| **Reasoning** | R2 not forced (R1 empty). R2 holds. IBB tracked separately. |

**KEY:** IBB does NOT increment walksAllowed or batter BB. Only intentionalWalks.

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

## Cluster 8: Transitions & Fame (5 cases)

### GC-26: Walk-off HR, bottom 9, trailing by 1

| Field | Value |
|-------|-------|
| **Setup** | Bot 9, 1 out, R1, Away 5 Home 4 |
| **Action** | `recordHit('HR', 2)` (auto-score all) |
| **Expected** | 1 out, empty, Away 5 Home 6, 2 runs, isWalkOff=true |
| **Reasoning** | Bottom 9+, home trailing, HR gives lead. Walk-off detected. |

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

### GC-27: Force out 3rd out — R3 run does NOT count

| Field | Value |
|-------|-------|
| **Setup** | Top 4, 2 outs, R1+R3, Away 1 Home 2 |
| **Action** | `recordOut('GO', {fromFirst:'out', fromThird:'home'})` |
| **Expected** | 3 outs, empty, 0 runs (R3 run nullified!), triggers endInning |
| **Reasoning** | Force out at 2B is 3rd out. Timing rule: force out 3rd out = no runs score. |

**CRITICAL TIMING RULE:** Even though R3 crossed home, the force out at 2B for the 3rd out means the run doesn't count. This is one of baseball's most important rules.

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

### GC-28: Popup with R2+R3, 1 out

| Field | Value |
|-------|-------|
| **Setup** | Bot 2, 1 out, R2+R3, 0-0 |
| **Action** | `recordOut('PO')` |
| **Expected** | 2 outs, R2+R3, 0-0, 0 runs |
| **Reasoning** | PO: runners hold. PO does NOT allow tag-up (unlike FO). |

**KEY:** FO vs PO distinction. FO allows R3 tag-up, PO does not.

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

### GC-29: TOOTBLAN fame event with R1, 2 outs

| Field | Value |
|-------|-------|
| **Setup** | Top 7, 2 outs, R1, Away 4 Home 5 |
| **Action** | `recordEvent('TOOTBLAN', 'runner-001')` |
| **Expected** | Fame event: baseFame=-3.0, formula=baseFame*sqrt(LI) |

**EXPECTED FAIL (D-07):** TOOTBLAN fame is flat -3.0. Spec says -0.5 base / -2.0 rally killer. At 2 outs this SHOULD be a rally killer (-2.0).

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

### GC-30: FO for 3rd out, top of inning (TOP->BOTTOM transition)

| Field | Value |
|-------|-------|
| **Setup** | Top 5, 2 outs, R2 only, Away 2 Home 3 |
| **Action** | `recordOut('FO')` |
| **Expected** | 3 outs, empty, triggers endInning |
| **After endInning** | outs=0, empty bases, isTop=false, inning=5 (stays 5!) |
| **Reasoning** | TOP->BOTTOM: isTop flips, inning does NOT increment (only increments on BOTTOM->TOP). |

**KEY:** Inning stays 5 on TOP->BOTTOM transition.

- [ ] APPROVED
- [ ] NEEDS REVISION: ___

---

## Integrity Check

| Check | Status |
|-------|--------|
| Exactly 30 cases | 30 |
| All 20 outcomes covered | See matrix below |
| All 8 base states covered | See matrix below |
| All 3 out states (0,1,2) covered | 0: 10 cases, 1: 11 cases, 2: 9 cases |
| Inning transition case | GC-12, GC-14, GC-19, GC-27, GC-30 |
| Game-ending case (walk-off) | GC-26 |
| Scoring cases | GC-01 thru GC-05, GC-07, GC-11, GC-17, GC-20, GC-24, GC-26 |
| Non-scoring cases | GC-06, GC-09, GC-10, GC-12, GC-13, GC-14, etc. |
| All EXPECTED FAIL bugs flagged | D-04: GC-23, D-05: GC-15+GC-16, D-07: GC-29 |
| All priority gaps addressed | KL: GC-13+14, 1-out: 10 cases, R2+R3: 5 cases, multi-runner 2-out: 7 cases |

### Outcome Coverage Matrix

| Outcome | Case(s) | Base State | Outs |
|---------|---------|-----------|------|
| 1B | GC-01, GC-05 | R2+R3, R1+R3 | 0, 1 |
| 2B | GC-02 | R1 | 1 |
| 3B | GC-03 | loaded | 0 |
| HR | GC-04, GC-26 | loaded, R1 | 2, 1 |
| K | GC-09 | empty | 0 |
| KL | GC-13, GC-14 | R1, R2+R3 | 1, 2 |
| GO | GC-10, GC-27 | R3, R1+R3 | 0, 2 |
| FO | GC-11, GC-30 | R3, R2 | 1, 2 |
| LO | GC-12 | R1+R2 | 2 |
| PO | GC-28 | R2+R3 | 1 |
| DP | GC-17, GC-18 | loaded, R1 | 0, 0 |
| TP | GC-19 | R1+R2 | 0 |
| FC | GC-22 | R1+R3 | 1 |
| SF | GC-20 | R2+R3 | 0 |
| SH | GC-21 | R1 | 0 |
| D3K | GC-15, GC-16 | empty, R1 | 2, 1 |
| BB | GC-06, GC-07 | R2+R3, loaded | 0, 2 |
| HBP | GC-08 | R1+R2 | 1 |
| IBB | GC-25 | R2 | 1 |
| E | GC-23, GC-24 | R1+R2, R3 | 2, 0 |

### Base State Coverage

| Base State | Case(s) |
|-----------|---------|
| empty | GC-09, GC-15 |
| R1 | GC-02, GC-13, GC-16, GC-18, GC-21, GC-29 |
| R2 | GC-25, GC-30 |
| R3 | GC-10, GC-11, GC-24 |
| R1+R2 | GC-08, GC-12, GC-19, GC-23 |
| R1+R3 | GC-05, GC-22, GC-26, GC-27 |
| R2+R3 | GC-01, GC-06, GC-14, GC-20, GC-28 |
| loaded | GC-03, GC-04, GC-07, GC-17 |

---

## Summary

- **30 cases** across **8 clusters**
- **All 20 outcomes** represented at least once
- **All 8 base states** represented at least once
- **All 3 out states** well-distributed (10/11/9)
- **4 EXPECTED FAIL** cases (D-04, D-05 x2, D-07)
- **Priority gaps heavily targeted:** KL (2 cases), 1-out (10 cases), R2+R3 (5 cases), multi-runner 2-out (7 cases)

### Next Steps

After user approval:
1. Feed `test-utils/golden-cases.json` to **test-harness-builder** skill
2. Test harness will validate these 30 cases first as self-test
3. Then expand to the full 480-combination matrix
4. EXPECTED FAIL cases will be tracked separately
