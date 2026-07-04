# FABLE DESIGN: Positional Scarcity for Fielders (Payroll-Neutral Curve Ladder)

**Date:** 2026-07-04 · **Author:** Fable 5 (math/design authority) · **Status:** DESIGN — awaiting JK magnitude sign-off, then Codex executes
**Companion to:** `FABLE_POOL_AFFORDABILITY_DESIGN_2026-07-04.md` (the arm reprice, Step 1 there, is SHIPPED — 057f4525; this doc is the second mispricing of the same class, JK-approved)
**Problem:** all 8 hitter blocks in `src/data/ivCurves.ts` are byte-identical AND `POSITION_MULTIPLIERS` (salaryCalculator.ts:246) are all 1.0 — a premium-defense C/SS/CF prices identically to the same bat at 1B. The old scarcity ladder was retired from the multiplier table under IV_ENGINE §3.8 ("value lives in the curves") but never landed in the curves. Positional scarcity currently lives NOWHERE.
**Scope rulings (JK, binding):** 8 fielding positions only (C, 1B, 2B, 3B, SS, LF, CF, RF). NO DH — does not exist in this app (the `resolveBlockKey` DH→1B mapping at ivEngine.ts:203 is inert dead-letter; leave it, design nothing for it). Arm ladder (SP 1.00 > SP/RP 0.80 > CP 0.65 > RP 0.55) is DONE — reconcile only, do not touch.

---

## 1. MECHANISM — where the adjustment lives

### 1.1 The valuation path the pool actually prices from (pinned in code)

The design-first pool prices players through **`computeIV(...).kblIV`, and nothing else**:

- `demandPlayerFromLeaguePlayer` (leaguePlayerAdapter.ts:54–84) sets `iv = computePlayerIv(player)` and carries `salary = player.salary`.
- `computePlayerIv` (leagueBuilderPoolBuilder.ts:98–100) = `calculateIvBaseSalary(...).ivBase` = `computeIV(buildSalaryIvInput(...)).kblIV` (salaryCalculator.ts:741–747). The stored `player.salary` is set from the same calc at registration (comment at leagueBuilderPoolBuilder.ts:94–97: same calc as the registration seam), so `salary === kblIV` in the pool.
- **The pool path NEVER calls `getPositionMultiplier`** (salaryCalculator.ts:606–609). That knob is only applied inside `calculateSalaryWithBreakdown` (salaryCalculator.ts:782), the franchise season-salary path — which itself bases on the same `calculateIvBaseSalary`.

**Consequence (the pin the design hangs on):** if scarcity were put in `POSITION_MULTIPLIERS`, the pool would never see it, and the franchise salary path would diverge from draft pricing. The ONLY home where both paths agree automatically is the shared `kblIV` base. Ruling: **`POSITION_MULTIPLIERS` stays all-1.0 (retired knob, unchanged)**; scarcity goes into the curve data.

### 1.2 Chosen mechanism: position-differentiated curve scaling (Option B), not a kbl-layer factor

Scale the anchor dollars (`midSal`, `sal100`) of **all five attribute rows** (POW/CON/SPD/FLD/ARM) in each of the 8 fielder blocks of `src/data/ivCurves.ts` by that position's ladder factor. **Shape params (min/curve1/mid/curve2) stay byte-identical across all 8 blocks** — one shape family, eight scalings, exactly the D16 arm-reprice pattern. Because shapes are shared, `block_p(r) = f_p × base(r)` at EVERY rating, so attribute cells, trait marginals, and aux components all scale coherently by `f_p` (up to per-component roundup), and the ordering holds at every rating point, not just the anchors.

Why curves and not a kbl-layer multiplier (the alternative considered and rejected):

1. **§3.8 letter and spirit.** §3.8 retired POSITION_MULTIPLIERS *because* "position value lives in the curves." A kbl-layer position factor would be the same knob rebuilt one layer down — the exact thing §3.8 retired.
2. **D16 precedent + one mechanism.** Arm role value already lives in the curve blocks (IV_ENGINE §3.9, v1.1.9/D16). Fielders and arms should express positional/role value through ONE mechanism, not two.
3. **Data-only change.** Zero engine code changes. A kbl-layer factor needs new engine code plus separate rulings for pitcher-batting blocks, two-way unlocks, and aux components; curve scaling handles all of those organically because every consumer prices through the block.
4. **Preserves the G7 architecture invariant.** The oracle pins hitter `kblIV === rawIV` (ivEngine.test.ts G7, :170–178). Curve scaling keeps that invariant green with zero test edits; a kbl-layer factor breaks it.

**Reconciliation with "rawIV is ORACLE-FROZEN":** frozen means *changed only by explicit re-bless* (IV_ENGINE §3.9: "changed only by explicit re-bless"). The D16 arm reprice just did precisely this — curve data changed, oracle deliberately regenerated, every new pin hand-checked. This design follows the identical protocol (§5 below). Note: the byte-identical hitter blocks are faithful to the source workbook — position-blindness was XBL's semantics. This change is a deliberate KBL divergence from the workbook, same class as D16, and gets logged as such (D17).

**Blocks NOT touched:** `IF`, `OF`, `IF/OF`, `1B/OF`, `-`, `EXTRA` (utility/neutral blocks) stay unchanged. They price UTIL/BENCH players and — critically — **pitcher batting** (non-two-way pitchers price batting on `IF/OF`; Two Way (IF)/(OF) holders on `IF`/`OF`, per rosterEngineConstants TWO_WAY_TRAIT_POSITION). Leaving them at the current level (≈ the ladder's 1.00 center) keeps the entire pitcher price surface byte-stable and does not reopen the just-shipped arm reprice. Two Way (C) holders would price batting/defense on the scaled C block — coherent (they deliver real catcher service) — and **zero stock players carry Two Way (C)**, so no stock pin moves; the rule simply governs future generated prospects.

---

## 2. PRIMARY-POSITION LADDER (recommended numbers)

### 2.1 The ladder — mirrored pairs around 1.00, sum exactly 8.00

| Position | Factor | Paired with | Basis |
|---|---|---|---|
| **C** | **1.12** | 1B 0.88 (±0.12) | Hardest defensive job; every club must start one every game; MLB positional adjustment's top slot (+12.5 runs) |
| **SS** | **1.10** | LF 0.90 (±0.10) | Premium infield range/arm; MLB +7.5 |
| **CF** | **1.06** | RF 0.94 (±0.06) | OF range anchor; SMB4 CF covers the most ground |
| **2B** | **1.03** | 3B 0.97 (±0.03) | DP pivot, more chances than 3B in SMB4 play |
| **3B** | **0.97** | — | Reaction position but shortest spectrum gap to corners |
| **RF** | **0.94** | — | Corner OF, arm slightly more valuable than LF |
| **LF** | **0.90** | — | Easiest OF corner |
| **1B** | **0.88** | — | Least defensive demand; the bat-parking position |

- **Order preserved from the retired ladder** (C > SS > CF > 2B > 3B > RF > LF > 1B — the old 1.15/1.12/1.08/1.05/1.02/0.98/0.95/0.92), but **re-centered**: the old ladder's mean was 1.034 (a hidden +3.4% payroll premium); this one's unweighted mean is exactly 1.000.
- **Magnitude:** extremes ±12% (old ladder spread C:1B = 1.25×; new = 1.27× — same felt size). Principled basis is the defensive spectrum (MLB positional-adjustment ordering, whose 8 fielder adjustments also sum to zero) blended with SMB4 gameplay reality. NOT stock-supply headcount — the stock DB actually has more C's (46) than any other fielder; scarcity here is scarcity of *usable defensive service*, demand-side, not roster-sheet supply.
- **Nudge rule for JK:** adjust any mirrored pair symmetrically (e.g. C/1B to ±0.10 or ±0.15) and the sum stays 8.00 — neutrality survives any pair-nudge.

### 2.2 Aggregate-neutrality math

Count-weighted over the 440-player stock universe (301 fielders: C 46, LF 41, 2B 40, RF 37, 1B 36, CF 35, SS 34, 3B 32):

```
Σ w_p·f_p = (46·1.12 + 34·1.10 + 35·1.06 + 40·1.03 + 32·0.97 + 37·0.94 + 41·0.90 + 36·0.88) / 301
          = 301.62 / 301 = 1.0021  →  +0.21% on fielder payroll
```

Fielders are roughly half of total pool value → expected **total-universe drift ≈ +0.1%**. Value-weighted drift will differ slightly (depends where the expensive bats sit); acceptance band and a one-shot renormalization rule are in §7.

### 2.3 Worked example (C block, ×1.12) and expected player impact

Current shared anchors → C anchors (builder MAY round to nearest $25; the RATIO is the spec):

| Attr | midSal | sal100 | → midSal ×1.12 | sal100 ×1.12 |
|---|---|---|---|---|
| POW | 8,000 | 56,000 | 8,960 | 62,720 |
| CON | 7,000 | 31,500 | 7,840 | 35,280 |
| SPD | 5,500 | 34,000 | 6,160 | 38,080 |
| FLD | 1,400 | 5,600 | 1,568 | 6,272 |
| ARM | 2,550 | 10,200 | 2,856 | 11,424 |

Same table shape for the other 7 blocks at their factors. Concrete before/after JK should see: a $40k bat prices **$44.8k at C vs $35.2k at 1B** (same ratings); anchor examples — Jonah Heim (C) $21,683 → ≈$24,285; Rowdy Tellez (1B) $23,981 → ≈$21,103; Corey Seager (SS) $38,711 → ≈$42,582.

---

## 3. SECONDARY-POSITION SCARCITY — verdict: measurable, NOT worthwhile for v1. Primary-only.

**Feasibility:** yes, it is measurable — the machinery even exists already. `computeRawLayer` prices a secondary-position component today (ivEngine.ts:372–377) from `AUX_PRICING.secondaryPositions` (traitPricing.ts:522–535), keyed by exactly the values that appear in the data (single positions plus the compound forms `IF`, `OF`, `IF/OF`, `1B/OF` — confirmed the full stock value set). A scarcity-weighted version is a small, well-defined change. I still recommend **against** it now, for four reasons:

1. **It is the D16 argument again, verbatim.** A secondary position is overwhelmingly *optionality* (he might play there), not expected production (he mostly plays primary). D16 just stripped exactly this class of value out of SP/RP (0.90 → 0.80) on the ruling that speculative flexibility value is deferred to the v1.1 flexibility-as-value item and is claimed at the POOL/ROSTER layer instead. Secondary-C coverage already earns real value there today: the extractor's C-coverage floors and seating legality both consume `secondaryPosition`. Pricing it in IV now would double-count the day v1.1 flexibility lands.
2. **The honest production sliver is already priced.** The existing aux component (small FLD/ARM/SPD deltas per secondary) covers the occasional-innings production a secondary actually delivers, and it is correctly small (hundreds of dollars). Scarcity-weighting that sliver (×0.88–1.12) moves it by *tens* of dollars — invisible, so it cannot deliver JK's instinct anyway.
3. **A material secondary credit is payroll-inflationary by construction.** Credits are one-sided (no negative secondary to mirror them), so any version big enough to feel breaks the neutrality constraint this whole design is built around.
4. **Compound parsing needs conventions with no data behind them yet.** Choosing mean-vs-max for `IF/OF` today is a guess; the v1.1 flexibility design can measure realized secondary usage and do it right.

**v1.1-ready convention (specced now so the future design doesn't re-litigate; NOT built now):** a secondary tag maps to a scarcity factor as — single position → that position's ladder factor; group tags take the **MEAN of members, never the max** (a generic tag doesn't guarantee premium-position-quality coverage): `OF` → mean(LF, CF, RF) = 0.967; `IF` → mean(1B, 2B, 3B, SS) = 0.995; `1B/OF` → mean(1B, OF-group) = 0.923; `IF/OF` → mean(IF-group, OF-group) = 0.981.

**Known micro-incoherence, accepted:** under curve scaling, the existing aux secondary component prices its marginals on the PRIMARY block (ivEngine.ts:375), so a C-primary's secondary-LF credit scales ×1.12 (wrong direction, magnitude ≤ ~$100). Documented, tolerated for v1, resolved properly by the v1.1 flexibility design.

---

## 4. COHERENCE WITH THE ARM LADDER

Fielders and arms now express positional/role value through the identical mechanism — one shape family per class, one scalar per position/role, living in the curve data — so the whole league prices off a single coherent picture: arms span 0.55–1.00 anchored at SP = 1.00 of the pitching family; fielders span 0.88–1.12 centered at 1.00 of the hitting family. The two ladders never touch each other's attribute families (VEL/JNK/ACC vs POW/CON/SPD/FLD/ARM), and because the fielder ladder is payroll-neutral by construction, the hitter-vs-pitcher aggregate payroll split that the arm reprice just established is preserved — the fielder ladder redistributes *within* hitters exactly as the arm ladder redistributed *within* pitchers. Neutral utility blocks (≈1.00) sit at the fielder center, so pitcher batting and UTIL pricing remain consistent with both ladders.

---

## 5. RE-BLESS PLAN (D16 protocol, second application)

`salary === kblIV` feeds auction budgets, cap math, and frozen oracle pins, so this is a deliberate re-bless, never a blind regenerate:

1. **`src/data/ivCurves.ts`** — apply §2.3 scaling to the 8 fielder blocks (data-only; shapes untouched; utility/pitcher blocks byte-identical). Extend the header comment: hitter blocks now carry the D17 KBL scarcity ladder (deliberate divergence from workbook, like D16 arm rows) — the extraction script must NOT be re-run over them blindly.
2. **Regenerate `spec-docs/reference/iv_oracle.json`** (same regeneration used for D16), then hand-check pins against §2 ratios:
   - **G1 (21 anchors):** 13 hitter anchors re-pin to old×f (spot-check per §2.3); **8 pitcher anchors must be byte-identical** — tripwire that the arm surface is untouched.
   - **G2:** Jon Gray Injury Prone delta stays **exactly −836** (pitcher block) — zero-edit tripwire.
   - **G3 (440 players):** every hitter scales by his primary factor; **every pitcher rawIV AND kblIV byte-identical** (no stock Two Way (C); Two Way (IF)/(OF) price on unscaled utility blocks).
   - **G4 named pins UNCHANGED:** Fenomeno $124,165 / Pastimm $122,198 / Drake $56,490 / Bradwick $58,417 — all four are SP/SP-RP with IF/neutral batting blocks; if any of these moves, the build touched something out of scope. G5–G10 (incl. G7 hitter kbl===raw) must pass with **zero test-file edits**.
3. **`spec-docs/IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md`:** add the D17 entry alongside §3.9's D16 note — the 8-position ladder table, the "one shape family × 8 scalars" rule, POSITION_MULTIPLIERS stays all-1.0 (the §3.8 knob remains retired; salarySeam.t5's knob-liveness test at :331–340 is unaffected and stays).
4. **`spec-docs/DECISIONS_LOG.md`:** D17 entry — this ruling, this date, the neutrality constraint, secondary-position deferral to v1.1.
5. **Full vitest** — expected churn: `salarySeam.t5`, `optimizerConstantsSnapshot`, `draftabilityRanker`, `draftPoolExtractor`, `poolFeasibility`, `leagueConstruction`, `rosterDesignFeasibility`; verify `historicalArchetypes.test` SOLO (known big-batch flake). Grade oracle (`smb4GradeEmulator`) is untouched — grades price ratings, not IV; grade-vs-IV divergence is the product (§3.9.3).
6. **Stale stored salaries:** pre-existing league pools store `player.salary` from the old curves; the pool **basis-staleness** detection (shipped 57742d00) must flag them for re-extraction so `salary === kblIV` holds post-reprice. Acceptance: a pre-reprice pool opened in Draft Setup surfaces the staleness path, and a fresh extraction shows `salary === iv` for every member.

## 6. ARCHETYPE RE-BAND PLAN (JK confirmed: re-band anything knocked out)

Run `archetypeBalanceSimulator` (+ its test) over all 24 archetypes after the curve change. Directional expectation: catcher/SS/CF-heavy builds (defense-spine archetypes) get pricier at fixed budget; corner-bat builds get cheaper — parity moves TOWARD truth, exactly as the arm reprice did for bullpen-heavy builds. Any archetype outside its value band gets its **budget split / shape targets** retuned — **never** re-touch the ladder factors to patch parity (same rule as D16). Record the 24/24 re-band verdict in the audit evidence; expect a handful of nudges, not a redesign.

## 7. ACCEPTANCE BANDS + POOL-AFFORDABILITY IMPACT

1. **Per-position ratios:** price one synthetic bat at two rating points (all-60s and all-85s, ARM included) under each of the 8 blocks; ratio vs the unscaled base within **±0.01 of the ladder factor at BOTH points**; ordering C > SS > CF > 2B > 3B > RF > LF > 1B at both.
2. **Aggregate neutrality:** Σ kblIV over the 440 stock universe — fielder-subset drift within **±1.5%**, total-universe drift within **±1.0%**. If outside: one-shot renormalization (divide all 8 factors by the measured value-weighted fielder mean, round to 2 decimals, re-check once).
3. **Pitcher invariance:** all 440 stock pitchers byte-identical rawIV and kblIV (hard gate).
4. **Affordability (must stay fixed):** re-run the 4-team symptom fixture from the affordability arc — G1/seating still `holds:true`, required cap within **±3%** of the post-arm-fix measurement, per-club leeway spread criterion unchanged, cheap-depth floor bodies still present and affordable (cheapest bodies move at most ±12% of *small* numbers — a $6k backup C → $6.7k; the floors survive by construction). Record measured numbers in audit evidence.
5. **Global gates:** `npm run build` exit 0 · full vitest at CURRENT_STATE baseline · L-SIM NOT required (pool/IV modules outside the L-SIM import graph — documented orthogonality).

**Expected aggregate payroll impact, stated explicitly: ≈ +0.2% on fielder payroll, ≈ +0.1% league-wide (count-weighted; §2.2) — bounded by band 2. This is a relative repricing, not a level change; the affordability fix is not re-broken.**

## 8. OPEN QUESTIONS FOR JK (plain)

1. **Size of the spread:** premium positions up to +12% (catcher), bat-parking positions down to −12% (first base). The old retired ladder felt about the same size. Bigger, smaller, or right? (Nudge any mirrored pair symmetrically — neutrality survives.)
2. **Third base lands just below average (0.97).** The old ladder had 3B slightly above average, but a centered ladder needs half the positions below the line, and 3B is the weakest of the up-the-middle claims. OK to let 3B sit a hair under, or would you rather 3B = 1.00 with LF/RF taking the difference?
3. **Secondary positions: my call is no scarcity credit in v1** — the roster/pool layer already rewards a backup catcher tag where it matters (coverage requirements), and pricing it into salary now would double-count when the v1.1 flexibility work lands. Sign off, or overrule and I design the small credit anyway.
4. **Future two-way catchers** (none exist in stock today) would automatically price their bat on the catcher-scaled curves — coherent with "they deliver real catcher service." Confirm.
