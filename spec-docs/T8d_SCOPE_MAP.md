# T8d — Snake-Draft Suite — SCOPE MAP

**Created:** 2026-06-14 (Captain synthesis from a 7-agent decorrelated read-only mapping fan-out)
**Status:** RATIFIED — 4 JK rulings recorded (DECISIONS_LOG 2026-06-14). Split = 3 tickets (below).
No build/test run yet (mapping task). T8d-1 contract drafted → Codex build.
**Parent:** `T8_SCOPE_MAP.md` §7 (T8d = the last, biggest T8 ticket).
**Authoritative spec:** `IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md` §7.3 (snake draft + pick chart +
trade validator + solvency v1.1.1 + per-team signals + potency overlay), §7.4 (scout-obscured farm
IV), §5.2–5.4 (budget/tier/luxury/balanceMode), §3.9 (L2-reference display rule), §12 (constants).
Cross-ref gospel `MODE_1_LEAGUE_BUILDER_FINAL.md` §8. All file:line below grep+read-verified.

> T8d definition (T8_SCOPE_MAP §7): "Snake Draft (Path B) + pick chart + trade validator + solvency
> signals + potency overlay + farm §7.4 scout-obscured IV." The interactive draft surface.

---

## 1. WHAT EXISTS — REUSE, DO NOT REBUILD (grep+read-verified)

| Asset | File:line | T8d use |
|---|---|---|
| Pick-value chart | `leagueConstruction.ts:259` `derivePickValueChart` | DONE engine. `value(pickN)=ivsDesc[N-1]`. **ORPHANED — zero UI callers.** Wire to board. |
| Trade validator | `leagueConstruction.ts:279` `validateTrade` | DONE engine. `imbalancePct=|sumA−sumB|/max(sumA,sumB,EPS)` vs `TRADE_TOLERANCE_BAND` 0.15; `overridable:true`; **throws on out-of-chart pick (:283)**. **ORPHANED.** Wire to UI. |
| Luxury tax (soft cap) | `leagueConstruction.ts:228` `luxuryTax(roster,caps,mode)→{charged,wouldBeTax,binding}` | DONE engine. `wouldBeTax` always computed; `charged` gated by balanceMode. The tax term inside solvency + the YELLOW/RED $ display. **Never blocks.** |
| Identity fns | `leagueConstruction.ts:151/191/212` `composeIdentity`/`identityCapShift`/`shiftLuxuryCaps` | DONE engine. Board recommendation weighting + per-team shifted caps. |
| Player IV | `ivEngine.ts:638` `computeIV→{rawIV,kblIV}` | Canonical board display IV — **always `potency='L2'`** (§3.9). |
| Registered pool + persistence | `leagueConstruction.ts:265` `registerPool`; persisted `registeredPools` store, `kbl-league-builder` **DB_VERSION=6** (`leagueBuilderStorage.ts:33`; `saveRegisteredPool:814`/`getRegisteredPool:831`); hook `useLeagueBuilderData.ts:352/356` | `RegisteredPool.{players,tierCap,luxuryCaps,pickValueChart}` is the Path-B draft pool, already IV-priced. **`getRegisteredPool` is wired but called by ZERO pages.** |
| Effective ratings (T6) | `effectiveRatings.ts:484` `effectiveRatings`, `:501` `defensivePlacementRisk` | DONE engine (2 exports only). Mid-season realized display. **Consumed by `rosterAnalyzer.ts` — not orphaned at engine level; zero UI consumers.** |
| Chemistry classification | `traitPricing.ts:21` `ChemistryType` (Competitive/Crafty/Disciplined/Scholarly/Spirited) + per-trait map | Counting substrate for potency overlay. |
| Potency scales | `rosterEngineConstants.ts:46-47` `POTENCY_SCALE` (pos L1 .5/L2 1/L3 2; inverted L1 2/L2 1/L3 .5); `:11` `PotencyTier` type | Reuse scales + type. |
| Scout substrate | `prospectScoutingDraftEngine.ts:461` `scoutAccuracy` (clamp 45–92), `:479` Box-Muller σ=(100−acc)/22, ±4 cap | Feeds §7.4 width `w`. **Code uses symmetric ±18; spec §8.6 wants +15/−10 (known reconciliation).** |
| Farm snake-draft template | `leagueBuilderStartupFarmDraft.ts:849` `buildProspectPickOrder` (snake order), `:1320` confirm+rollback, `:1206` view derivation; `startupDraftSessions` store | Architectural TEMPLATE for the 22-man MLB session/state-machine. **Do NOT overload its farm-shaped type.** |
| Draft UI chrome | `LeagueBuilderDraft.tsx:114` runAction, `:297` BLOCKED panel, `:319` on-the-clock banner, `:363` board grid, `:402` recent-picks | Page-chrome template. **Page is FARM-only — its `BLOCKED` is a farm blockers list, NOT solvency.** Do not modify it. |
| Path-A output contract | `LeagueBuilderRosters.tsx:644` `moveToMLB` + `:141` `updatePlayerRosterAssignment` | The EXACT dual-write each confirmed pick must mirror: `mlbRoster/farmRoster` arrays **AND** `player.leagueAssignments[].rosterStatus`. |
| Mode1→Mode2 handoff | `franchisePlayerStorage.ts:512` `deepCopyLeagueToFranchise` (hard-validates **exactly 22 MLB + 10 FARM**, :428); `franchiseInitializer.ts:335` | T8d produces input; **never edits the handoff. No wizard changes** (`FranchiseSetup.tsx` untouched). |

---

## 2. WHAT IS MISSING — THE T8d BUILD (all grep-verified absent)

1. **MLB snake-draft state machine (R3).** No 22-man Path-B order/cursor/per-team committed-ledger
   exists. Extract snake order from the farm pattern (`leagueBuilderStartupFarmDraft.ts:849`); price
   each pick at full `RegisteredPool` IV salary; NO scout layer on the MLB pool.
2. **Solvency guardrail (R8) — ENTIRELY ABSENT** (zero hits for
   `solvenc|cheapestFill|pickMarginalTax|projectedTax|slotsRemaining`). Inequality (§7.3:491):
   `committedSalaries + projectedTaxes + pickCost + pickMarginalTax ≤ budget − (slotsRemaining × cheapestFillCost)`.
   `pickMarginalTax = luxuryTax(roster+cand).wouldBeTax − luxuryTax(roster).wouldBeTax` (use
   `wouldBeTax`, not `charged`, so the guardrail is budget-true in advisory/off mode).
   `cheapestFillCost` = live-pool minimum-cost player satisfying each remaining positional need,
   **recomputed per pick** — the highest-correctness-risk piece; no reference exists in the codebase.
3. **Per-team pick signals (R8) — GREEN/YELLOW/RED/BLOCKED** (§7.3:492). Per team (same player can be
   green for one, red for another). BLOCKED = strict solvency violation (not confirmable). RED = severe
   tax OR within `solvencyRedMargin`(0.10) of the line (warning, still pickable). YELLOW = triggers any
   tax (show $ + post-pick math). GREEN = identity fit + no meaningful tax + solvency safe.
4. **Scout-obscured farm IV (R9)** (§7.4:496) — no width fn. `w = scoutNoiseBase(0.6)×(1−scoutAccuracy)`;
   display `[trueIV×(1−w), trueIV×(1+w)]`; seeded-jitter midpoint (≠ truth); SNAP to true IV at call-up;
   pool NERFED (`FARM_NERF_SCALES`, `tierParams.ts:51`). Obey the T7b leak rule (`rosterAnalyzer.ts:191`):
   recs may say "positive-surplus replacement" but NEVER expose true IV/ratings pre-call-up.
5. **Realized-tier resolver + marginal synergy (R12)** (§7.3:490) — **`potencyTier(p,team)` DOES NOT
   EXIST** (prior T8 map was wrong; it is a TYPE only). Build it: count same-`ChemistryType` players on a
   team → L1/L2/L3 → realized-tier preview per candidate + "drafting this raises you 2→3 Spirited,
   upgrading N traits a tier." **The count→tier numeric mapping is UNDEFINED anywhere** (not §12, not
   constants, not SMB4 ref docs).
6. **The MLB snake-draft BOARD UI** — does not exist. Hosts: L2 kblIV display, per-pick value, advisory
   trade panel, per-team signals, potency overlay, scout-obscured farm range. New page + new route;
   relabel the mislabeled DRAFT tile (`LeagueBuilder.tsx:208` says "Fantasy snake draft" but routes to
   the farm draft).
7. **Draft-session persistence** — new `mlbDraftSessions` store, `kbl-league-builder` **v6→v7 ADDITIVE**
   migration (order, currentPickIndex, completedPicks{salary,signal}, per-team committed/taxes). Mirror
   the `registeredPools` create-if-missing pattern. **Migration safety = audit-non-negotiable** (Feb-11
   IndexedDB version-conflict hang precedent).
8. **Missing §12 constants (add-only to `rosterEngineConstants.ts`):** `scoutNoiseBase` (0.6),
   `solvencyRedMargin` (0.10). [`leagueInflationBand` is NOT T8d — §7.5 auction, v1.5.]

**NOT T8d (do not pull in):** EV-flatness (§5.3 — T3 acceptance, already PASS); league-inflation report
(§7.5 auction, v1.5); auction reserve curve / AI shills (§7.5/§7.6, → T11).

---

## 3. SPLIT (RATIFIED — 3 tickets; R9 + R12 deferred per JK rulings Q3/Q4)

The two deferred engines (R12 potency overlay, R9 scout-obscured farm IV) collapse the original second
pure-engine ticket. Final engine-first split:

- **T8d-1 — Snake + Solvency engine + constants (pure).** MLB snake-order generator (`buildSnakeOrder`) +
  `cheapestFillCost`/`pickMarginalTax`/`assessSolvency` → GREEN/YELLOW/RED/BLOCKED. budget = tierCap (Q1);
  position-agnostic fill cost (Q2). Add `solvencyRedMargin` (0.10) + `solvencySevereTaxFrac` (0.20 default,
  Q5). Exhaustive unit tests (zero solvency tests today). NO UI, NO persistence shape. **PURE engine →
  standing auto-commit.**
- **T8d-2 — Draft-session persistence + snake-board shell.** `mlbDraftSessions` store (kbl-league-builder
  v6→v7 ADDITIVE, migration-audited) + new `LeagueBuilderSnakeDraft.tsx` + new route + tile relabel + snake
  mechanics + dual-write output (`mlbRoster/farmRoster` + `leagueAssignments.rosterStatus`, 22+10 exact) +
  handoff carry-through verify. **Depends on T8d-1. PERSISTENCE + user-visible → audit non-negotiable + JK
  surface before commit.**
- **T8d-3 — Board intelligence overlays.** Pick-value chart display + trade-validator panel + per-team
  GREEN/YELLOW/RED/BLOCKED signal chips, wired onto the T8d-2 board. (Potency overlay R12 + scout-obscured
  farm range R9 DEFERRED.) **Depends on T8d-1 + T8d-2. User-visible → JK surface before commit.**

ROUTE each: Codex 5.5 | very high → Opus audit (UI + persistence audit NON-NEGOTIABLE).

**Deferred fast-follows (tracked):** R12 potency overlay (needs SMB4 count→tier thresholds) — will build
the missing `potencyTier(p,team)` resolver + `marginalSynergy` + count→tier constant. R9 §7.4 scout-obscured
farm IV-range (leak-safe; needs `scoutNoiseBase` 0.6) — also resolves the scoutedGrade-vs-IV-range model
collision.

---

## 4. SCOPE QUESTIONS — RESOLVED (JK 2026-06-14, DECISIONS_LOG)

- **Q1 — Solvency budget source → RULED: tierCap for all teams.** No per-team budget field in v1.
- **Q2 — `cheapestFillCost` model → RULED: position-agnostic.** `slotsRemaining × cheapest-available salary`.
- **Q3 — Potency overlay R12 → RULED: DEFER** (count→tier thresholds undefined; fast-follow).
- **Q4 — Farm scope → RULED: MLB board only; §7.4 R9 DEFERRED** (existing farm draft untouched).
- **Q5 (Captain default, proceed-unless-vetoed) — RED "severe tax" threshold** = `solvencySevereTaxFrac`
  ≈ 0.20 of remaining budget; added to `rosterEngineConstants.ts` in T8d-1.
- **Q6 (Captain default) — Path-B draft order** = user-arranged order (reuse the existing teamOrder UP/DOWN
  affordance), seed-stable. Lands in T8d-2.
- **Q7 (Captain default) — Trade validator** = standalone advisory panel, NO persistence/execution in v1
  (§7.3:488 sunlight-not-enforcement). Lands in T8d-3.

---

## 5. TOP RISKS

- **Budget-source ambiguity (Q1)** — blocks the entire solvency surface; an inference here is a design
  decision, not a fix.
- **`cheapestFillCost` correctness (Q2)** — a naive global-min ignores position and silently mis-blocks /
  over-permits picks. No codebase reference.
- **Persistence/migration (v6→v7)** — Feb-11 version-conflict hang precedent; add-only, no existing-store
  mutation, all `src/utils` + `src/src_figma/utils` delegates share the bumped initializer.
- **§7.4 leak risk** — any board sort/tooltip/rec derived from true IV pre-call-up leaks hidden value.
- **L2-display invariant (§3.9)** — board IV must always be `computeIV(...,'L2')`; never reprice on
  realized potency. Add a pinning regression test.
- **Output-contract drift** — must write BOTH `mlbRoster/farmRoster` AND `leagueAssignments.rosterStatus`,
  and end every team at exactly 22+10, or the handoff silently miscounts / blocks Franchise Setup.
- **Orphan realized** — `derivePickValueChart`/`validateTrade`/`getRegisteredPool` exist but have zero UI
  callers; any partial wiring leaves a Tier-2 NFL orphan.
- **Mislabel trap** — repurposing the existing `/league-builder/draft` route would break the working farm
  draft + farm-scouting handoff. Add a NEW route; only relabel the tile.
