# T3_POOL_ANALYSIS.md — Empirical Pool Analysis & Tier Parameter Derivation

**Date:** 2026-06-10 | **Task:** T3 (IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC §13) | **Built by:** Fable 5 CLI (max)
**Script:** `scripts/analyze-pool.py` (deterministic; rerun reproduces every number byte-identically)
**Emitted constants:** `src/data/tierParams.ts`
**Inputs:** `src/data/playerDatabase.ts` (440-player stock SMB4 pool), `src/data/ivCurves.ts` + `src/data/traitPricing.ts` (T1, authoritative), `spec-docs/reference/Team_Builder_Archetype_Logic_Template.xlsx` (Roster anchors, Luxury Cap A:F + AT:BE)

---

## 0. Executive Summary

- The 440-player pool (`src/data/playerDatabase.ts`, 20 stock teams × 22; the 66 `free-agent` entries are excluded per D3) was IV-priced with a workbook-exact engine. **All 21 priced workbook players reproduce to the dollar (±$0)** — the bootstrap gate far exceeds the ±$5 contract.
- **Juiced pool:** mean IV **$60,225**, median **$49,456**, max **$402,066**. Tier scales (grade-ladder method): **Standard ×0.7842**, **Nerfed ×0.6799**.
- **Tier caps (§5.2):** Juiced **$1,251,237**, Standard **$981,174**, Nerfed **$850,671** — roster branch dominates at 1.03×, **no starBudgetShare flag**.
- **Luxury caps (§5.3):** derived at the 65th percentile of the **20 stock teams' observed top-N concentrations** (the ignore-budget "contention ladder" alternative was derived, shown, and rejected — it produces caps the tax never touches). 11 of 19 rows active; **8 pitcher-batting rows disabled** by a real DB data gap (89/178 pitchers have no batterRatings).
- **EV-flatness (§5.3 criterion): PASS at tierCap budget** — but the pass is *structural*: at construction salary = IV, so every identity exhausts the budget tax-free where the pool is deep. Sensitivity runs show the tax layer waking between 1.5× and 2.0×; at 2.0× one identity escapes the band ADVANTAGED (Contact+Defense +14.9% — its caps barely bind). [REVISED 2026-06-10 after T3-AUDIT MAJOR fix: SP/RP now counts toward pen concentration in the tax path per JK ruling; the previously-reported −11.8% Power+Rotation/Power+Bullpen failures were artifacts of the role-set inconsistency and are resolved.] Details + proposed adjustments in §R5; **no constants were tuned**.
- **Farm nerf (§7.4):** one grade step left of the league tier — farm scale 0.7842 (Juiced league), 0.8670 (Standard), 0.9151 (Nerfed); star-rarity evidence in §R2.
- 13 spec-amendment candidates + DB-cleanup flags for JK in the final sections. The most consequential for T4: per-component ROUNDUP semantics (A4), sub-min reflection denominator (A1), SP/RP negative-trait routing (A3).

---

## 1. Source Data & IV Engine Decode (T4's implementation reference)

### 1.1 The pool
`src/data/playerDatabase.ts` `PLAYERS` record: 506 entries = **440 team-rostered stock SMB4 players** (20 teams × 22: 262 hitters incl. 15 DH, 178 pitchers: 81 SP / 22 SP-RP / 55 RP / 20 CP) + 66 free agents (excluded). Grades S…D present on all 440.

### 1.2 Workbook computation graph (decoded live from Roster-sheet formulas)
The T1 data files supply all parameters; the *assembly* below was decoded from the actual Excel formulas (`data_only=False`) and verified against every cached salary. T4's `computeIV` must reproduce this graph exactly:

1. **Attribute cells** — `ROUNDUP(twoSegment(rating), 0)` per attribute (Excel ROUNDUP = away from zero). Hitter blocks price POW/CON/SPD/FLD/ARM; pitcher blocks price POW/CON/SPD/FLD (batting) + VEL/JNK/ACC. Pitcher ARM is never priced.
2. **Sub-minimum VEL branch (§3.4)** — when `VEL <= primary.min` (only VEL rows of SP, SP/RP, RP, CP carry sub-min params):
   `reflected = 100 − 100·(r − subMin.min)/(primary.min − subMin.min)` → `ROUNDUP(twoSegment(reflected, subMinParams))`.
   **The denominator is `primary.min − subMin.min` (= 50), NOT the `(mid2 − min2)` written parenthetically in spec §3.4** (amendment A1). 83 of 178 pool pitchers (47%!) have VEL ≤ 50 — this branch is load-bearing for SMB4 in a way it never was for the XBL pool (whose Roster sheet has no sub-50 VEL pitcher).
3. **Trait cells (≤2)** — `ROUNDUP( Σ delta-marginals + Σ multiplier-terms + flatFee )` where:
   - delta-marginals = `twoSegment(r+Δ) − twoSegment(r)` on **exact** (unrounded) curve math, primary curve only (no sub-min in marginals);
   - gates: ARM deltas only on hitter-shaped blocks, VEL/JNK/ACC deltas only on pitcher-shaped blocks (workbook gates on position row `<77`/`>72`; block *shape* is the equivalent form — verified by Seager's Clutch = 3,672, which only reproduces with VEL/JNK/ACC gated off);
   - multiplier terms = `cell × mult − cell` using the **ROUNDUP'd attribute cells** (deGrom's Elite SL = 6,228 only reproduces with rounded bases; exact bases give 6,227);
   - **SP/RP special case:** negative-polarity traits price their delta-marginals on the **RP** curves (workbook helper `BW18/BW19 = if(right(trait,3)="(-)","RP","SP/RP")`) — an anti-exploit so the hyper-convex dual-role curves can't be farmed for outsized refunds. Verified by Jon Gray's Injury Prone = −2,136 (SP/RP curves would give ≈ −6,150). Amendment A3.
4. **Switch-hitter cell** — `ROUNDUP(exact marginals of +5 POW/+5 CON)` on the player's own block (Heim = 1,474 ✓). L/R bats cost 0.
5. **Secondary-position cell** — Roster col J ('-' = none): `ROUNDUP(exact marginals of the 2nd-POSITION aux deltas)` on the player's primary block (Josh Smith IF/OF = 11,988 ✓). Hitter-only in the workbook (pitcher rows have no slot); no DB pitcher carries one.
6. **Pitch cells (pitchers)** — per pitch `ROUNDUP(flat 500 + Σ rounded-cell multiplier terms over VEL/JNK/ACC)`, summed (Eovaldi 2F+CF+CB+FK = 10,261 ✓ requires per-pitch rounding).
7. **Arm angle** — $0 except 'Sub' (flat 4000 + VEL×1.075/JNK×1.2 terms). The SMB4 DB has no arm-angle field → $0 for all 440 (flag F6).
8. **Player salary = Σ of the already-rounded component cells.** There is **no player-total ROUNDUP** — rounding is per component (amendment A4).
9. **Bullpen arsenal tax** — applied by the workbook at the *team* level (PEN section row sums the whole pen's pitch count; cached −10,000 for its example pen). It is **not part of any player's salary cell** (Eovaldi's components sum to exactly 54,582 without it) — amendment A2.

### 1.3 KBL-side mapping decisions (documented, all value-neutral or forced)
- **DH → 1B curve block.** The workbook has no DH block; all 8 hitter blocks (C…RF) carry *identical* curve parameters in the T1 extraction, so the choice prices identically — it exists only to name a block. (A9)
- **Pitchers without batterRatings (89/178):** batting attrs priced at 0 — the only non-invented default. Effect is small per player (the priced batting components of pitchers who *have* data are typically $1–4k, with rare large exceptions like Drake §R6) but it corrupts pitcher-batting *luxury caps* fatally (§R4). Flag F1.
- **DB trait-name typos normalized in-script:** `Clitch→Clutch`, `K Neglecter→K Neglector`, `Off-speed Hitter→Off-Speed Hitter` (flag F2; DB untouched per T3 constraints).
- **One stock hitter carries an arsenal** (`crc-fenomeno`) — unpriced (hitters have no pitch cells; matches workbook structure). Flag F3 / amendment A10.
- **Chemistry potency:** all pool pricing at L2 (×1.0), matching the workbook's "Restrict to Level 2 Chemistry = True" baseline; potency scaling is a downstream league-context concern (§3.5).

## 2. Golden Anchor Gate (bootstrap rule — verbatim)

All **21** priced players on the workbook Roster sheet (the contract required ≥4):

```
| Player             | Pos   | Workbook $ | Computed $ |  Diff | Verdict |
|--------------------|-------|------------|------------|-------|---------|
| Nathan Eovaldi     | SP    |     54,582 |     54,582 |    +0 | PASS    |
| Jacob deGROM       | SP    |     71,609 |     71,609 |    +0 | PASS    |
| Jack Leiter        | SP    |     65,884 |     65,884 |    +0 | PASS    |
| Patrick Corbin     | SP    |     38,544 |     38,544 |    +0 | PASS    |
| Jon Gray           | SP/RP |    184,533 |    184,533 |    +0 | PASS    |
| Danny Coulombe     | RP    |     50,329 |     50,329 |    +0 | PASS    |
| Phil Maton         | RP    |     44,886 |     44,886 |    +0 | PASS    |
| Josh Sborz         | CP    |     61,472 |     61,472 |    +0 | PASS    |
| Jonah Heim         | C     |     21,683 |     21,683 |    +0 | PASS    |
| Jake Burger        | 1B    |     35,398 |     35,398 |    +0 | PASS    |
| Marcus Semien      | 2B    |     28,287 |     28,287 |    +0 | PASS    |
| Josh Jung          | 3B    |     28,098 |     28,098 |    +0 | PASS    |
| Corey Seager       | SS    |     38,711 |     38,711 |    +0 | PASS    |
| Wyatt Langford     | LF    |     65,335 |     65,335 |    +0 | PASS    |
| Evan Carter        | CF    |     43,434 |     43,434 |    +0 | PASS    |
| Adolis Garcia      | RF    |     43,925 |     43,925 |    +0 | PASS    |
| Rowdy Tellez       | 1B    |     23,981 |     23,981 |    +0 | PASS    |
| Joc Pederson       | LF    |     31,397 |     31,397 |    +0 | PASS    |
| Kyle Higashioka    | C     |     17,258 |     17,258 |    +0 | PASS    |
| Alejandro Osuna    | LF    |     24,541 |     24,541 |    +0 | PASS    |
| Josh Smith         | 3B    |     57,886 |     57,886 |    +0 | PASS    |

ANCHOR GATE: 21/21 PASS (incl. Eovaldi $54,582, deGrom $71,609)
```

The gate runs **live against the committed workbook on every script execution** — the anchors are read from the Roster sheet at runtime, never hardcoded. The anchor set exercises: sub-min boundary (Corbin VEL=50→$0), SP/RP negative-trait routing (Gray), hitter trait gates (Seager Clutch), switch pricing (Heim), secondary positions (Smith IF/OF, Pederson 1B/OF, Osuna OF, Langford CF), multiplier traits (deGrom, Sborz Rally Stopper), all-8-delta negatives (Maton Choker), pitch pricing (all pitchers).

## R1. IV Distribution (440-player pool = Juiced)

```
| Segment        |   n |       mean |     median |       p10 |       p25 |        p75 |        p90 |        max |        sd |
|----------------|-----|------------|------------|-----------|-----------|------------|------------|------------|-----------|
| ALL (440)      | 440 |     60,225 |     49,456 |    25,020 |    34,888 |     69,548 |    104,961 |    402,066 |    42,179 |
| Hitters        | 262 |     49,783 |     46,057 |    24,816 |    33,889 |     63,546 |     75,156 |    127,836 |    20,909 |
| SP             |  81 |     58,350 |     49,253 |    25,963 |    35,960 |     69,689 |    104,525 |    171,850 |    32,881 |
| SP/RP          |  22 |    141,873 |    117,826 |    43,814 |    67,700 |    207,578 |    232,027 |    402,066 |    94,255 |
| RP             |  55 |     82,915 |     67,773 |    23,517 |    33,980 |    126,536 |    166,877 |    217,449 |    54,942 |
| CP             |  20 |     52,386 |     53,332 |    23,433 |    39,430 |     58,822 |     66,478 |    129,670 |    26,592 |
```

```
| Hitters by pos |   n |       mean |     median |       p10 |       p25 |        p75 |        p90 |        max |        sd |
|----------------|-----|------------|------------|-----------|-----------|------------|------------|------------|-----------|
| C              |  34 |     40,871 |     39,903 |    24,726 |    33,556 |     51,193 |     61,525 |     65,734 |    13,015 |
| 1B             |  27 |     54,902 |     54,288 |    28,692 |    41,720 |     68,622 |     73,728 |    127,836 |    22,502 |
| 2B             |  33 |     44,472 |     39,782 |    27,558 |    32,279 |     53,669 |     61,743 |    101,199 |    16,287 |
| SS             |  32 |     51,066 |     43,788 |    21,513 |    29,498 |     68,449 |     86,483 |    101,035 |    24,760 |
| 3B             |  29 |     50,752 |     46,044 |    24,784 |    31,463 |     67,322 |     80,311 |     86,626 |    21,026 |
| LF             |  36 |     47,769 |     45,900 |    26,306 |    32,810 |     62,158 |     67,270 |     96,254 |    17,504 |
| CF             |  26 |     57,211 |     54,358 |    26,060 |    36,721 |     72,817 |     95,180 |    106,862 |    25,969 |
| RF             |  30 |     55,239 |     52,134 |    27,457 |    39,407 |     67,875 |     88,722 |    119,750 |    23,136 |
| DH             |  15 |     48,895 |     51,730 |    34,449 |    35,372 |     58,770 |     64,203 |     67,440 |    12,620 |
```

**Grade overlay** (SMB4 letter grades carried by the DB — confirmed present on all 440):

```
| Grade | n   | mean IV    | median IV  | min IV     | max IV     |
|-------|-----|------------|------------|------------|------------|
| S     |   6 |    120,058 |    117,534 |     81,498 |    171,850 |
| A+    |  13 |    118,462 |    106,862 |     82,229 |    196,947 |
| A     |  18 |     91,694 |     83,331 |     48,991 |    170,703 |
| A-    |  45 |     84,396 |     66,103 |     29,589 |    303,480 |
| B+    |  78 |     65,505 |     56,952 |     24,367 |    402,066 |
| B     |  76 |     61,246 |     50,479 |     26,858 |    231,070 |
| B-    |  86 |     52,587 |     38,794 |     15,364 |    217,449 |
| C+    |  65 |     41,919 |     33,073 |     11,235 |    218,864 |
| C     |  33 |     34,107 |     30,556 |     16,106 |     77,462 |
| C-    |  12 |     32,010 |     26,990 |     12,979 |     62,582 |
| D+    |   6 |     33,327 |     27,238 |     15,907 |     59,799 |
| D     |   2 |     34,596 |     34,596 |     19,222 |     49,970 |
```

Reading: medians are cleanly monotonic from S down to C− (117.5k → 27.0k); the D/D+ tail inverts slightly (n=2/6 — noise, and one grade-D player prices at 49,970; see flag F5). The per-grade *max* column shows the headline structural fact: **grade and IV agree on direction but diverge wildly on magnitude for SP/RP and junkball profiles** — the B+ max of $402k and C+ max of $218k are both SP/RP cases dissected in §R6. SMB4's grade is a flat summary; IV prices role convexity, traits, and arsenal.

## R2. Tier Derivation (§5.1)

**Method (no hand-picked means, per §5.1):**
1. Empirical grade→$ ladder: median IV per letter grade (table above), piecewise-linear in grade ordinal (D=0 … S=11).
2. Pool mean grade ordinal = **5.770** (between B− and B, leaning B — "Juiced ≈ B" as the spec guessed).
3. Tier target = ladder evaluated at (meanOrdinal − steps); **scale = ladder(meanOrdinal − steps) / ladder(meanOrdinal)**.

```
Ladder IV at pool mean ordinal (5.770): 47,797

| Tier     | grade steps left | ladder target IV | scale  | implied mean IV | implied median IV |
|----------|------------------|------------------|--------|-----------------|-------------------|
| juiced   |                0 |           47,797 | 1.0000 |          60,225 |            49,456 |
| standard |                1 |           37,480 | 0.7842 |          47,226 |            38,782 |
| nerfed   |                2 |           32,495 | 0.6799 |          40,945 |            33,623 |
```

Cross-check — raw adjacent grade-step ratios near the mean: B→B− 0.7685, B−→C+ 0.8525; the interpolated 1-step ratio 0.7842 sits between them as expected.

**Transform choice — multiplicative scale (IV′ = s × IV), rejected alternatives:**
- *Additive shift:* IV is bounded below by ~$0 and grade steps are multiplicative in dollars (the curves are convex); subtracting a constant deforms the bottom of the distribution and can go negative.
- *Quantile remap to a synthetic target:* maximal flexibility but requires inventing an entire target distribution — more hand-picked structure, harder for the Player Generator to apply.
- *Multiplicative scale* preserves the observed shape (a "bell shifted left" in log-dollars), maps $0→$0, scales mean/median/sd by exactly s, and the Player Generator can apply it directly (target quantiles = Juiced quantiles × s). Zero free parameters beyond the derived scale.

**Player Generator convenience — first-order rating multipliers** (bisection-solved on this pool: the uniform rating scale whose attribute-IV total matches the tier's IV scale): Standard **×0.9138**, Nerfed **×0.8626** (`TIER_RATING_SCALES`). These are convenience approximations only; the IV-space scales are canonical.

**Farm-draft nerf (§7.4)** — one *additional* grade step left of the league tier, same ladder machinery, no new free parameter:

```
| League tier | farm ordinal target | farmScale (vs tier) | farmScale (vs Juiced) |
|-------------|---------------------|---------------------|-----------------------|
| juiced      |               4.770 |              0.7842 |                0.7842 |
| standard    |               3.770 |              0.8670 |                0.6799 |
| nerfed      |               2.770 |              0.9151 |                0.6222 |

| League tier | P(farm >= tier p75) | P(farm >= tier p90) |
|-------------|---------------------|---------------------|
| juiced      |               14.8% |                5.5% |
| standard    |               17.7% |                7.3% |
| nerfed      |               19.3% |                8.4% |
```

Star-rarity evidence: a Juiced-league farm draftee out-IVs the league's p90 player 5.5% of the time, the p75 player 14.8% of the time. Whether that meets "immediate-star call-ups are rare" is JK's call (flag F4): a 2-step farm nerf is a one-constant rerun if 14.8% feels too generous. The flattening at lower tiers (19.3% for Nerfed) reflects the ladder's compression near the C grades.

## R3. Tier Caps (§5.2)

```
tierCap = max( maxObservedPoolIV / starBudgetShare(0.33), 22 x medianPoolIV x rosterHeadroom(1.15) )

| Tier     | maxIV      | medianIV  | star branch (max/0.33) | roster branch (22*med*1.15) | tierCap    | dominant | ratio |
|----------|------------|-----------|-------------------------|------------------------------|------------|----------|-------|
| juiced   |    402,066 |    49,456 |               1,218,382 |                    1,251,237 |  1,251,237 | roster   |  1.03 |
| standard |    315,285 |    38,782 |                 955,411 |                      981,174 |    981,174 | roster   |  1.03 |
| nerfed   |    273,350 |    33,623 |                 828,334 |                      850,671 |    850,671 | roster   |  1.03 |
```

The roster branch wins by 1.03× — comfortably inside the >1.5× flag threshold, so **no starBudgetShare retune signal**, and remarkably so given the $402k outlier at max: the two branches nearly agree, meaning a generational player naturally costs ≈⅓ of a sensible team budget in this pool. Both branches scale linearly with s, so dominance is tier-invariant.

## R4. Luxury Cap Scaling (§5.3)

**Penalty-$ scale:** σ(juiced) = pool median IV / XBL anchor median salary = 49,456 / 43,434 = **1.1386**. Penalty `per100`/`minAdder` dollars scale by σ×s per tier; penalty *curve exponents* port unchanged — they are the "shape" D13 protects. (The XBL anchor median comes from the 21 priced workbook players, read live.)

**Basis decision.** Two candidate "best-plausible top-N sum" distributions were fully derived:

- **A. Stock-team basis [ADOPTED]:** the top-N sums of each of the **20 real SMB4 rosters** — the pool arrives pre-organized into the manufacturer's own notion of plausible teams. Caps at the 65th percentile sit just above typical real-team concentration: ordinary builds stay free, focused builds pay, degenerate hoards pay convexly.
- **B. Contention ladder [REJECTED, shown below for the record]:** S(k) = the top-N sum a focused team amasses when k of 20 teams contend for the stat (every k-th rank of the sorted subpool), k = 1…20; cap = 65th pct of {S(k)}. It answers "what could a focused team hoard *ignoring budget*" — and produces caps so high that under any real budget **the tax layer never binds** (verified: the budget-optimal roster pays $0 against ladder caps in every row; the EV-flatness test went vacuous). Caps that never bind are not a balance mechanism.

```
| Group    | Stat | topN | XBL cap | teams min | teams p50 | 65th pct -> cap (juiced) | teams max | ladder-B cap | vs XBL | status |
|----------|------|------|---------|-----------|-----------|--------------------------|-----------|--------------|--------|--------|
| hitters  | POW  |    8 |     500 |       498 |     576.0 |                    609.4 |       703 |        718.8 |  1.219 | ACTIVE |
| hitters  | CON  |    8 |     545 |       478 |     605.0 |                    624.5 |       708 |        726.8 |  1.146 | ACTIVE |
| hitters  | SPD  |    8 |     550 |       464 |     545.0 |                    583.8 |       698 |        708.5 |  1.061 | ACTIVE |
| hitters  | FLD  |    8 |     585 |       492 |     601.5 |                    626.4 |       682 |        721.5 |  1.071 | ACTIVE |
| hitters  | ARM  |    8 |     565 |       386 |     581.5 |                    593.8 |       688 |        690.5 |  1.051 | ACTIVE |
| rotation | POW  |    4 |     120 |         0 |       6.5 |                     72.1 |       313 |        181.8 |  0.601 | DISABLED (data gap) |
| rotation | CON  |    4 |     160 |         0 |       9.5 |                     89.7 |       257 |        218.5 |  0.561 | DISABLED (data gap) |
| rotation | SPD  |    4 |     300 |         0 |      28.0 |                    105.1 |       304 |        245.5 |  0.350 | DISABLED (data gap) |
| rotation | FLD  |    4 |     396 |         0 |       0.0 |                    113.5 |       324 |        280.9 |  0.287 | DISABLED (data gap) |
| rotation | VEL  |    4 |     100 |        88 |     239.5 |                    261.0 |       317 |        336.4 |  2.610 | ACTIVE |
| rotation | JNK  |    4 |     260 |       125 |     218.5 |                    239.1 |       306 |        318.8 |  0.919 | ACTIVE |
| rotation | ACC  |    4 |     260 |       186 |     276.5 |                    293.9 |       341 |        363.1 |  1.130 | ACTIVE |
| bullpen  | POW  |    4 |     120 |         0 |      11.5 |                     53.4 |       304 |        195.8 |  0.445 | DISABLED (data gap) |
| bullpen  | CON  |    4 |     120 |         0 |      22.0 |                     49.0 |       288 |        192.7 |  0.409 | DISABLED (data gap) |
| bullpen  | SPD  |    4 |     260 |         0 |      31.0 |                     71.9 |       301 |        216.9 |  0.277 | DISABLED (data gap) |
| bullpen  | FLD  |    4 |     396 |         0 |       0.0 |                    146.9 |       335 |        306.1 |  0.371 | DISABLED (data gap) |
| bullpen  | VEL  |    3 |      65 |        36 |     217.5 |                    228.5 |       263 |        274.4 |  3.515 | ACTIVE |
| bullpen  | JNK  |    3 |     150 |        20 |     191.0 |                    231.1 |       280 |        275.0 |  1.541 | ACTIVE |
| bullpen  | ACC  |    3 |     165 |        65 |     184.5 |                    195.7 |       263 |        247.4 |  1.186 | ACTIVE |
```

- **vs-XBL ratios for hitter rows cluster at 1.05–1.22** — our pool runs hotter than XBL's MLB-rated pool, and the derivation tracked it (this is exactly the re-calibration §5.3 demanded). The pitching ratios (VEL 2.6–3.5×) confirm the XBL VEL caps were calibrated to a velocity-starved pool; SMB4's is velo-rich, so porting raw XBL caps would have taxed every pen in the league perpetually.
- **DISABLED rows (8):** rotation/bullpen POW-CON-SPD-FLD are *pitcher batting* caps. With 89/178 pitchers carrying no batterRatings, several stock rotations sum FLD = 0 — the team distribution is corrupted toward zero and a 65th-pct cap would megatax any pitcher who *has* batting data (measured: the optimizer then exploits the gap by drafting only zero-batting pitchers). They ship disabled (`DISABLED_LUXURY_ROWS` in tierParams.ts, XBL shapes preserved) and re-derive with one script run after DB cleanup. Flag F1/A8.
- **Tier scaling of rating caps:** caps scale by the tier rating multipliers (×0.9138 / ×0.8626) since they live in rating units, while penalty $ scale by σ×s. Spec §5.2's "recompute per registered pool" remains the canonical path at league registration; these static tables are the v1 defaults.

Percentile sensitivity (ACTIVE rows), for the `luxuryCapPercentile` calibration JK owns (§12):

```
| Group/Stat | 50th | 65th (default) | 75th | 90th |
|------------|------|----------------|------|------|
| hitters/POW  |  576 |          609.4 |  637 |  693 |
| hitters/CON  |  605 |          624.5 |  640 |  674 |
| hitters/SPD  |  545 |          583.8 |  614 |  656 |
| hitters/FLD  |  602 |          626.4 |  632 |  677 |
| hitters/ARM  |  582 |          593.8 |  604 |  640 |
| rotation/VEL |  240 |          261.0 |  284 |  291 |
| rotation/JNK |  218 |          239.1 |  248 |  263 |
| rotation/ACC |  276 |          293.9 |  311 |  326 |
| bullpen/VEL  |  218 |          228.5 |  248 |  256 |
| bullpen/JNK  |  191 |          231.1 |  240 |  263 |
| bullpen/ACC  |  184 |          195.7 |  203 |  236 |
```

**Modification rescaling:** all 42 modification deltas (see A5 — the spec's "44" is a count error) are stored as **fractions of the XBL cap of the row they shift** (`CAP_MODIFICATION_FRACTIONS`) — tier-invariant exactly as §5.3 prescribes ("+337 FLD" ≡ +57.6% of the FLD cap at any tier). Applied as `shiftedCap = cap × (1 + Σinc − Σdec)`.

## R5. EV-Flatness (§5.3 acceptance criterion)

Setup: 6 single-band identities + 6 crosses (justification: Power+Rotation "bash & pitch", Contact+Speed "small ball", Speed+Defense = the workbook's own Run n' Gun pairing, Defense+Rotation "run prevention", Power+Bullpen "slug & slam the door", Contact+Defense "fundamentals" — the realistic two-band archetypes a human league actually fields). Each identity composes per §6.3 (see A6 for the scoring instantiation), shifts the active caps, then a deterministic two-start greedy hill-climb builds the best 22-man roster (13 hitters covering all 8 positions + 4 SP + 1 SP/RP + 3 RP + 1 CP — the stock-team shape) under `payroll + taxes ≤ budget` at balanceMode='taxed'.

### Primary criterion table (verbatim artifact) — budget = juiced tierCap = 1,251,237

```
| Identity         | inc1 / inc2                       | dec1 / dec2 | roster IV   | taxes paid | IV vs mean | verdict |
|------------------|-----------------------------------|-------------|-------------|------------|------------|---------|
| Power            | POW / Torpedo Bats                | -- / --     |   1,251,179 |          0 |    -0.00% | PASS    |
| Contact          | Bloop Hitters / CON               | -- / --     |   1,251,179 |          0 |    -0.00% | PASS    |
| Speed            | Run Like the Wind / Flash Leather | -- / --     |   1,251,179 |          0 |    -0.00% | PASS    |
| Defense          | Big D / Defense Boost             | -- / --     |   1,251,179 |          0 |    -0.00% | PASS    |
| Rotation         | JNK / Rotation Boost              | -- / --     |   1,251,179 |          0 |    -0.00% | PASS    |
| Bullpen          | Junk Ballers / JNK                | -- / --     |   1,251,179 |          0 |    -0.00% | PASS    |
| Power+Rotation   | POW / JNK                         | -- / --     |   1,251,179 |          0 |    -0.00% | PASS    |
| Contact+Speed    | Bloop Hitters / Run Like the Wind | -- / --     |   1,251,203 |          0 |    +0.00% | PASS    |
| Speed+Defense    | Big D / Run Like the Wind         | -- / --     |   1,251,179 |          0 |    -0.00% | PASS    |
| Defense+Rotation | Big D / JNK                       | -- / --     |   1,251,179 |          0 |    -0.00% | PASS    |
| Power+Bullpen    | Junk Ballers / POW                | -- / --     |   1,251,179 |          0 |    -0.00% | PASS    |
| Contact+Defense  | Bloop Hitters / Big D             | -- / --     |   1,251,179 |          0 |    -0.00% | PASS    |

Cross-identity mean roster IV: 1,251,181  ->  EV-FLATNESS: PASS (all within +/-10%)
```

**Why the pass is structural, and why that matters.** At construction time salary **= IV** (the relativity stack applies later). "Maximize Σ IV subject to Σ IV + taxes ≤ budget" is therefore exhausted by *any* roster that spends the full budget tax-free — total IV ≡ budget − taxes-paid. The 440 pool is deep enough that every identity finds a full-budget, zero-tax roster, so flatness at tierCap is guaranteed by accounting, not by the tax architecture. This is a genuine property of the §5.3 criterion as written, not an artifact of the greedy (the optimizer correctly treats a taxed dollar as a wasted dollar). The criterion is *satisfied*; its evidentiary weight at tierCap budgets is weak — amendment A7 proposes sharpening it.

### Sensitivity — where the tax layer comes alive (informational, out of v1 envelope since §5.2 budgets ≤ tierCap)

Budget = 1.5 × tierCap (1,876,855): still flat (max deviation ±0.11%), first taxes appear ($0–3.5k — rotation/ACC, hitters/ARM start to pinch).

Budget = 2.0 × tierCap (2,502,474) — [REVISED 2026-06-10, corrected pen role-set incl. SP/RP]:

```
| Identity         | inc1 / inc2                       | dec1 / dec2 | roster IV   | taxes paid | IV vs mean | verdict |
|------------------|-----------------------------------|-------------|-------------|------------|------------|---------|
| Power            | POW / Torpedo Bats                | -- / --     |   2,171,343 |    330,932 |    +2.07% | PASS    |
| Contact          | Bloop Hitters / CON               | -- / --     |   2,109,411 |    392,754 |    -0.84% | PASS    |
| Speed            | Run Like the Wind / Flash Leather | -- / --     |   2,260,097 |    242,205 |    +6.24% | PASS    |
| Defense          | Big D / Defense Boost             | -- / --     |   1,984,609 |    517,861 |    -6.71% | PASS    |
| Rotation         | JNK / Rotation Boost              | -- / --     |   2,118,894 |    383,564 |    -0.40% | PASS    |
| Bullpen          | Junk Ballers / JNK                | -- / --     |   1,984,528 |    517,861 |    -6.71% | PASS    |
| Power+Rotation   | POW / JNK                         | -- / --     |   1,984,528 |    517,861 |    -6.71% | PASS    |
| Contact+Speed    | Bloop Hitters / Run Like the Wind | -- / --     |   2,262,852 |    237,747 |    +6.37% | PASS    |
| Speed+Defense    | Big D / Run Like the Wind         | -- / --     |   2,238,174 |    263,110 |    +5.21% | PASS    |
| Defense+Rotation | Big D / JNK                       | -- / --     |   1,984,528 |    517,861 |    -6.71% | PASS    |
| Power+Bullpen    | Junk Ballers / POW                | -- / --     |   1,984,528 |    517,861 |    -6.71% | PASS    |
| Contact+Defense  | Bloop Hitters / Big D             | -- / --     |   2,444,724 |     51,069 |   +14.92% | FAIL    |
```

What binds [REVISED]: with SP/RP arms now taxable in the pen, the previously-failing Power+Rotation/Power+Bullpen pay their VEL/JNK concentration properly and rejoin the band (−6.71%). The remaining outlier inverts: **Contact+Defense escapes ADVANTAGED (+14.92%)** — its composed caps (Bloop Hitters CON + Big D FLD/ARM, all cheap-curve stats) barely bind at 2× budget ($51k tax vs $518k for the heavy payers), so it skims more raw IV than identities whose desired stats sit on expensive, tightly-capped rows. Same root cause as before viewed from the other side: at budgets far above tierCap, band-level composition can't equalize when the binding rows differ this much in $/point. The proposed adjustments below stand unchanged (option 1 remains recommended: the divergence lives outside the legal §5.2 envelope).

**Per the contract: no retune applied.** Proposed adjustments for JK (pick at most one, rerun is one command):
1. **Accept as-is for v1** — §5.2 bounds budgets at tierCap, where the criterion passes; the divergence lives outside the legal envelope. Revisit when Mode 2 decouples salary from IV (True Value/relativity) — the spec already schedules a balanceMode revisit post-T3 (§15.5).
2. **Composition granularity fix (T8 design):** compose at stat level (raise the rows your draft plan actually concentrates) instead of band level — directly repairs the Power+Rotation failure mode.
3. **Re-anchor `luxuryCapPercentile`** upward for pitching rows (e.g. 75th) to soften the VEL chokepoint — weakens the anti-VEL stance D13 deliberately takes; not recommended without playtest evidence.

## R6. Sanity Narrative — five players a human can argue with

1. **Hammer Longballo** (sir-longballo, RF, A+, $98,209, p87). The pool's marquee slugger: POW 99/CON 78 prices $80.9k of attributes, and his two contact-side traits (POW vs RHP, Fastball Hitter) add $17.3k — *trait convexity in action*: the same deltas on a 50-POW player would cost a third of that, because marginal points near the top of the POW curve are the most expensive points in the hitter system. His secondary 1B adds a comedic $24 (FLD/ARM marginals on a corner-bat profile are nearly free). Grade and IV agree here.

2. **Chuck Filthwick** (hrb-filthwick, RP, **grade A**, $48,991, **p50**). The argument-starter: SMB4 grades this VEL-2 junk specialist an A; IV prices him dead-median. His VEL 2 runs through the sub-min reverse curve (reflected rating 96 on the RP mirror params) and is worth ~$19k as a timing-disruption asset — real value, but not ace value; ACC 73 adds ~$15k. If JK's gut says "an A-grade arm should price above p50," the lever is the RP sub-min curve (midSal 9,000 / sal100 20,000), which the workbook calibrated for a pool where junkballers were rare. Here they are 47% of all pitchers.

3. **Norm Fenomeno** (crc-fenomeno, SS, A, $101,035, p89). The two-way showcase: POW 77/CON 79/FLD 78 prices $48.4k, then **Two Way (IF) + Elite 4F add $52.7k** — more than his attributes — because Two Way's +15/+15/+15/+10 deltas land on already-high ratings (convexity again). His pitching arsenal is *unpriced* (hitters have no pitch cells — A10), and his ARM 0 looks like a data quirk worth eyeballing (F5).

4. **Donovan Drake** (wpg-drake, SP/RP, **grade C+**, **$218,864, p99**). The system's most arguable output, and it is *workbook-faithful*: his batting POW 92 prices ≈$157k on the SP/RP batting curve (sal100 $200k — the dual-role block treats a slugging swingman as near-priceless), plus VEL 6 → ≈$45k via the SP/RP sub-min mirror (midSal 20,000/sal100 50,000, 2.5× the other roles' mirror). A C+ game grade versus a p99 IV is the starkest grade-IV divergence in the pool. If this offends, the levers are the SP/RP POW/CON/SPD sal100 values and the SP/RP sub-min params — flagged in A12, not tuned.

5. **Danny Deals** (wdl-deals, SP, **grade A−**, $29,589, **p17**). The opposite divergence: an A− game grade priced in the pool's bottom quintile. He is one of the 89 no-batterRatings pitchers (his batting prices $0 — F1), VEL 9 on the *SP* block whose sub-min mirror (midSal 7,500/sal100 18,000) is the gentlest of the four, JNK 43/ACC 23 price modestly. Some of his gap is the data hole; most is the SP mirror's conservatism versus the SP/RP mirror that made Drake rich. Deals vs Drake is the cleanest A/B exhibit for JK's review of sub-min pricing.

Bookends (auto-included): pool max **Buzz Pastimm** (bee-pastimm, SP/RP, B+, **$402,066**, p100 — $165.9k attributes + **$197.9k from Specialist + Elite 4F**, whose multiplier terms compound his huge VEL/ACC cells; multiplier-trait stacking on the SP/RP block is the pool's biggest single price phenomenon, A12) and pool min **Rusty Nozzle** (ply-nozzle, SP, C+, **$11,235** — zeroed batting data, modest arm, and two negative traits refunding $3.2k).

---

## SPEC AMENDMENT CANDIDATES (for JK — T3 changes no spec text)

| # | Section | Finding | Proposed amendment |
|---|---------|---------|-------------------|
| A1 | §3.4 | Sub-min reflection: workbook formula divides by `(primary.min − subMin.min)`, not the parenthetical `(mid2 − min2)` | Correct the parenthetical; the section's own "implement exactly as the workbook's AE-column formula" already governs. T4 must use primary.min. |
| A2 | §3.7 | `computeIV` signature includes `arsenalTax(role)`, but the workbook applies the bullpen arsenal tax at TEAM level (sums the whole pen's pitch count); per-player salaries exclude it (anchor-proven to the dollar) | Move arsenalTax out of computeIV into roster-level construction accounting (T8); per-player IV = attributes + traits + pitches + aux only |
| A3 | §3.5 | NEGATIVE traits on SP/RP price their delta-marginals on RP curves (workbook BW18/BW19 helper) — anti-refund-farming asymmetry not in spec | Document in §3.5; T4 must implement (golden test: Jon Gray Injury Prone = −2,136) |
| A4 | §3.2/§3.7 | "ROUNDUP at player-total level, not per attribute" is FALSE to the workbook: every component cell (attribute, each trait, each pitch, handed, 2nd-pos, angle) is ROUNDUP'd away-from-zero; salary = Σ of rounded components; multiplier terms consume the ROUNDED attribute cells, delta terms consume exact curve math | Rewrite the rounding note; T4 golden tests only pass with per-component semantics |
| A5 | §6.2/D11/§13 | "44 cap modifications" — workbook AT:BE and the spec's own §6.2 table both contain **42** rows (41 named + '--') | Correct the count |
| A6 | §6.3 | `composeIdentity` underspecified: naive positive-score greedy elects pathological all-in mods ('Call Your Shot') whose side-deltas crater unrelated caps; decreases are optional ('--' legal, workbook team uses one) so rational stacks skip them | T3 instantiation: harm-aware scoring (positives credited in priority bands, ALL negative deltas charged) + round-robin one increase per priority band + '--' decreases. JK to ratify or redesign before T8; consider whether decreases should be mandatory/balanced |
| A7 | §5.3 | EV-flatness at tierCap budgets is structurally guaranteed (salary = IV ⇒ any full-budget tax-free roster ties); criterion passes but with weak evidentiary weight | Keep the criterion AND add a binding-margin probe (e.g. report the budget multiple at which first identity exits the ±10% band — here ≈2.0×) or re-express flatness on Mode 2 value once relativity decouples salary from IV |
| A8 | §5.3 table | 8 pitcher-batting luxury rows underivable until the DB gap (F1) closes | Footnote the §5.3 table; rows ship disabled in tierParams.ts with XBL shapes preserved |
| A9 | §3.3 | No DH curve block exists; all 8 hitter blocks carry identical params, so DH→1B is value-neutral | Declare the DH→1B mapping explicitly for T4 |
| A10 | §3.6 | One stock hitter (crc-fenomeno) carries a pitch arsenal; workbook structure prices pitches for pitcher blocks only | State: hitter arsenals unpriced until a two-way pitching role exists |
| A11 | §5.1 | Grade ladder tail inverts at D/D+ (n=2/6, medians 34.6k/27.2k vs C− 27.0k) — harmless to the scales (mean ordinal 5.77 is far away) but worth knowing | No change; recorded for the record |
| A12 | §3.3/§3.4 | SP/RP block economics dominate the pool's right tail: multiplier-trait stacking (Pastimm $402k) and the rich SP/RP sub-min mirror + batting curves (Drake $219k at grade C+). Workbook-faithful, but XBL's pool had no such players to price | JK review: SP/RP sal100 values and sub-min params vs SMB4's junkballer-dense, two-way-dense pool; any change re-runs T1→T3 cleanly |
| A13 | §5.3 | "best-plausible top-N sum distribution" needed interpretation; the stock-team basis was adopted over the ignore-budget contention ladder (which produces never-binding caps) | Name the basis in the spec: "the top-N sums of the pool's constituent stock rosters (or registered-league rosters at recompute time)" |

## DATA-CLEANUP FLAGS (playerDatabase.ts — out of T3 scope to edit)

| # | Issue | Impact |
|---|-------|--------|
| F1 | 89/178 pitchers missing `batterRatings` (teams entered in a later pass: htc, mns, blf, swt, wdl, …) | Their batting IV prices $0 (usually $1–4k understatement); blocks 8 luxury rows (A8); single biggest data debt T3 leaves behind |
| F2 | Trait typos: `Clitch` (1), `K Neglecter` (5), `Off-speed Hitter` (5, case) | Normalized in-script; fix at source so future consumers don't need the map |
| F3 | `crc-fenomeno` (hitter) carries `arsenal` | Unpriced (A10); harmless but inconsistent |
| F4 | Farm star-rarity at 1-step nerf = 14.8% above tier p75 (Juiced) | If "rare" should mean <10%, switch to a 2-step farm nerf (one constant) |
| F5 | Oddities worth eyeballing: `crc-fenomeno` ARM 0 on a SS; one grade-D player priced $49,970 (D medians invert vs C−, A11) | Spot-verify against the game |
| F6 | DB carries no arm-angle field | 'Sub' angle pricing ($4,000 + VEL/JNK terms) contributes $0 pool-wide; add the field if Sub-angle pitchers exist in SMB4 stock data |

## VERIFICATION APPENDIX

1. **Golden anchors:** 21/21 PASS at **±$0** (§2; live-read from the workbook every run; contract tolerance ±$5, contract minimum 4 players).
2. **Determinism:** two consecutive runs → `diff` of both `tierParams.ts` and full stdout **empty**; `shasum` identical (`317172798a05afcad3b39e4c5c370bc319b01c34  src/data/tierParams.ts`). No timestamps, no randomness in the generated file.
3. **Build:** `npm run build` (tsc -b && vite build) → **exit 0** (tierParams.ts type-checks; imported nowhere yet — expected at T3).
4. **Tests:** full suite 373 files: **7,156 passed / 3 failed** — the 3 failures are exactly the known pre-existing set (wpaRuntimeBoundary, franchiseNarrativeEventEligibility, franchiseManualSmokeFixture; the 4th known flake, franchiseOffseasonGuards, passed this run). Zero new failures; T3 adds only an unimported data file and a script.
5. **R5 table:** §R5 primary table above is the verbatim script output.

*End T3_POOL_ANALYSIS.md*
