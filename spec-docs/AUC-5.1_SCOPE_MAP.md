# AUC-5.1 SCOPE MAP — Farm Auction (§3)

**Recon date:** 2026-06-21 (AUTH-4) · **Captain:** Opus 4.8 · **Worktree:** `/Users/johnkruse/Projects/kbl-mode1` [`codex/mode1-v1`]
**Source of truth:** `AUCTION_DRAFT_SPEC.md` §3 (+ §6 Q6/Q7/Q8 rulings, §5.1/§5.2 #8). Grounded at source + an Explore infra map.
**Status:** RECON — split + forks + seams defined; sub-tickets NOT yet built. Next build = AUC-5.1a.

> One-line: the farm auction REUSES the §2 hot-seat machine (`auctionStateMachine.ts`, now turn-fidelity-complete via AUC-4.2)
> + §7.5 bidding WHOLESALE, with §3's four overrides: (A) scout-obscured VALUE range, (B) positions-visible/ratings-hidden card,
> (C) walled-off farm wallet, (D) scout-hiring dependency. It is the AUCTION-format path for the FARM tier (R1: one league-wide
> format applied to both tiers); the existing SNAKE prospect draft stays the snake-format path.

---

## §1. REALITY — EXISTS vs MISSING (Explore-mapped, file:line in the worktree)

**EXISTS (reuse — do NOT rebuild):**
- **§2 auction machine** — `src/engines/auctionStateMachine.ts` (reuse-ready; `AuctionTeamInput` adapts to farm budgets/slots).
- **Prospect generation + scout-obscured GRADES** — `src/utils/prospectScoutingDraftEngine.ts` (1230 lines):
  `generateProspectScoutingDraft` (:1119), `buildCandidate` (:929) on-demand prospect gen, `scoutProspect` (:875) grade-noise
  (`sigma=(100-accuracy)/22`, ±0..4 grade steps), `scoutAccuracy(position,scout)` (:863, base±specialty/weakness, clamp **[45,92]**),
  `VisibleSafeProspectReport` (:139), `LeagueBuilderProspectPlayerDto` (:157, full ratings: power/contact/speed/fielding/arm/
  velocity/junk/accuracy/arsenal/overallGrade), `POSITION_POOL` (:260).
- **Scout HIRING** — `src/utils/leagueBuilderStartupFarmDraft.ts`: `draftLeagueBuilderScout` (:1273), **2 scouts/team**
  (`STARTUP_SCOUTS_PER_TEAM`), durable, persisted (`LeagueBuilderScoutProfile.teamId`, leagueBuilderStorage.ts:169). **⇒ §3.5/§6 Q8
  scout-hiring is ALREADY BUILT** — the farm auction CONSUMES `scoutAccuracy`, it does not build scout hiring.
- **Farm roster store** — `TeamRoster.farmRoster: string[]` (leagueBuilderStorage.ts:370, store `TEAM_ROSTERS`), `STARTUP_FARM_TARGET_SIZE=10`.
- **MLB pool IV pricing** — `registerPool(cfg): RegisteredPool` (leagueConstruction.ts:270) → `PoolPlayerPriced={id,iv,salary}` via
  **`computeIV` (ivEngine.ts:638)**. Frozen IV economics — REUSE, do not redesign.

**MISSING (must build for a farm AUCTION):**
1. **Prospect numerical IV** — prospects have grade+ratings but NO `iv`. Today's obscuring is GRADE-step noise, NOT the §3.2 value
   range. **RESOLVED (not a fork): prospect trueIV = `computeIV(prospect ratings)`** — same engine as MLB, confirmed by §3.4 (wallet
   self-calibrates "§5.2 over the prospect pool" ⇒ prospects ARE IV-priced) + §3 ("reuse §7.5 bidding wholesale"). The B1–B9 generator
   already produces poolable ratings; `computeIV` prices them.
2. **§3.2 scout VALUE-RANGE** — `[trueIV·(1−w), trueIV·(1+w)]`, `w = scoutNoiseBase·(1−scoutAccuracy)`, **scoutNoiseBase=0.6 (registry §12)**,
   midpoint seeded-jittered so midpoint≠truth. NET-NEW (grade-fuzz exists; value-range does not). scoutAccuracy is 0.45–0.92 ⇒ w∈[0.05,0.33].
3. **Walled-off farm WALLET (§3.4)** — a per-team farm budget SEPARATE from the MLB tier cap; tier = **walled-off, NERFED** (§6 Q7),
   self-calibrating per §5.2 over the prospect pool; farm `minSalaryByPosition`; adapt `AuctionTeamInput`. NEW fields/store.
4. **Prospect pool REGISTRATION** — no farm `RegisteredPool` equivalent (prospects gen on-demand). Need a pre-registered, IV-priced,
   nominatable prospect pool (the lot set) — a farm analog of `registerPool`/`registerLeaguePool`.
5. **MLB→farm SEQUENCING (§3.1)** — only a "MLB=22 first" prerequisite exists; no per-tier format config (auction vs snake), no phase
   gate. NEW: league format applies to BOTH tiers (R1); MLB auction completes → farm auction runs → THEN the §4 two-number freeze fires ONCE.
6. **Farm UI card (§3.3)** — positions-visible/ratings-hidden lot card showing the scout RANGE (not true IV). Adapt the 4.1b page.

---

## §2. THE SPLIT (proposed — multi-ticket, dependency-ordered)

| Ticket | Scope | Class | Grounding TODO before contract |
|---|---|---|---|
| **5.1a** | **Farm prospect pool registration + IV pricing** — generate the farm prospect pool (reuse B1–B9 gen), price each via `computeIV` → a farm pool of `{playerId, iv, ivPercentile}` (the `AuctionPlayer` shape). Pure-ish engine/data. | engine/data | read `registerPool`/`PoolConfig` + the prospect generator's poolable entry; farm pool SIZE (10×teams + a candidate multiplier?) |
| **5.1b** | **Scout value-range obscuring (§3.2)** — pure `perceivedRange(trueIV, scoutAccuracy, seed)` = `[trueIV(1−w),trueIV(1+w)]`, w=0.6·(1−acc), midpoint seeded-jitter; consume per-team `scoutAccuracy`. | pure engine | confirm scoutAccuracy is 0..1 vs 45..92 (it's 45–92 → /100); registry §12 `scoutNoiseBase` constant home |
| **5.1c** | **Walled-off farm wallet (§3.4)** — per-team farm budget + self-calibrating nerfed tier cap (§5.2) + farm `minSalaryByPosition`; farm `AuctionTeamInput` adapter. | data/engine | §5.2 self-calibration entry; where the farm wallet persists (TeamRoster vs new store); nerf factor default |
| **5.1d** | **Farm auction wrapper + MLB→farm sequencing (§3.1)** — run the §2 machine for the farm round after MLB completes; league format config (auction vs snake, per R1 both-tiers); true-IV engine math / perceived-range display split. | wiring | the league format config field; the existing snake-farm entry to gate behind format |
| **5.1e** | **Farm auction UI (§3.3 card)** — positions-visible/ratings-hidden lot card, scout-RANGE display (not true IV), reuse the 4.1b page w/ farm overrides. | UI (JK-browser) | the 4.1b page hooks; the VisibleSafeProspectReport fields |

Dependency: 5.1a + 5.1b + 5.1c → 5.1d (wrapper) → 5.1e (UI). 5.1a/5.1b are independent and fork-free → build first.

---

## §3. DESIGN FORKS

**RESOLVED (spec-grounded, NOT JK-blocking):**
- **Prospect IV source = `computeIV` over prospect ratings** (§2 above). Same engine as MLB. The single biggest de-risk.
- **Scout HIRING already built** — §3.5/§6 Q8 ("require a scout, no scout-less path") is satisfied by the existing 2-scouts/team draft;
  the farm auction consumes `scoutAccuracy`, with a default-widest-range fallback only if a team somehow has no scout (Q8 says require one).
- **§6 Q6** grade = scout-fuzzed band (grade-noise exists); **§6 Q7** farm wallet = walled-off + nerfed + self-calibrating.

**AUTH-4 DEFAULTS (taken; spec-silent; documented for JK):**
- D1 (5.1a) farm pool size = `10 × teams × candidateMultiplier` (mirror the existing snake `candidatePoolMultiplier≈3`) so the auction has
  surplus lots to nominate; exact multiplier flagged.
- D2 (5.1b) midpoint jitter = a seeded ± within the band (deterministic), so the displayed midpoint ≠ truth per §3.2.
- D3 (5.1c) nerf factor for the farm wallet = a conservative fraction of the MLB-equivalent self-calibrated cap (e.g. ~0.25–0.4); flagged.
- D4 (5.1d) format config = a league-level `draftFormat: 'auction'|'snake'` applied to BOTH tiers (R1); auction-format ⇒ both MLB+farm auctions.

**🟡 SURFACE FOR JK (foundational — flagged, not unilaterally baked):**
- **JK-1: confirm prospect trueIV = `computeIV(ratings)`** is the intended farm-auction value basis (I'm confident per §3.4, but it is the
  foundation of the entire farm economy — a one-line confirm de-risks the whole AUC-5.1 chain).
- **JK-2: farm-wallet nerf magnitude** (D3) — "nerfed" is ruled (Q7) but the magnitude is a value-economy dial JK may want to set.
- **JK-3: does the auction-format farm REPLACE the snake prospect draft** for auction leagues (R1 implies yes), or coexist as a parallel
  option? (Default: replace for auction-format leagues; the snake path remains for snake-format leagues.)

---

## §4. SEAMS / GOTCHAS
- The §4 two-number FREEZE (L-ECON1, = AUC-5.2) fires ONCE at the END of the whole draft (after farm), NOT after MLB. Keep 5.1d's
  AUCTION_COMPLETE for the farm distinct from the freeze trigger.
- True IV drives ALL engine math (§7.5 maxBid/solvency, the wallet self-calibration); the perceived RANGE is display-only and snaps to
  truth at call-up (§7.4) — never feed the perceived value into the engine.
- POSITION_POOL (`prospectScoutingDraftEngine.ts:260`) is the separately-flagged §3.3 distribution fix — orthogonal to the auction wrapper;
  keep it its own ticket (it affects prospect GENERATION, not the auction mechanic).
- Persistence class: 5.1c (farm wallet) + 5.1a (pool registration) likely touch leagueBuilder storage → version-bump/mirror discipline
  (the AUC-3.1 / L6b-1 4-mirror-site trap). Treat as saved-shape tickets (full-suite host gate + JK browser-verify batch).
