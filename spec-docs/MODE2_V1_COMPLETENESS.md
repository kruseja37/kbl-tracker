> ⚠️ **SUPERSEDED (2026-07-01).** The single v1 source of truth is **`spec-docs/V1_BUILD_STATUS.md`** (see its §5). This doc predates the 2026-06-30 draft re-design + the 24-archetype lock; its status / branch-map / scope claims are stale. Kept for history — do not plan from it.

# MODE 2 V1 COMPLETENESS AUDIT — THE LIVING SEASON

**Type:** READ-ONLY completeness audit (no code changed; this is the only output doc).
**Model / mode:** Opus 4.8, high reasoning. AUTH-4. Concurrent-safe with L13-4 + the Mode 1 audit (read-only, disjoint output).
**Created:** 2026-06-20
**Auditor:** Captain (Opus 4.8).
**Governing spec (CURRENT gospel):** `spec-docs/FRANCHISE_V1_LIVING_SEASON_SPEC.md` §0–24 — walked section-by-section against code.
**Method:** an 11-agent decorrelated spec×code walk + 5 adversarial verifiers (16 agents, ~1.53M tokens, 318 tool uses), every BUILT/PARTIAL/MISSING claim grounded in a `file:line` a sub-agent read. Build-dark code (gated behind `isFranchisePhase2*Enabled`, activates at the post-D13 flag-flip) is counted **BUILT** — its activation is itself tracked v1 work. "Looks built" ≠ built; orphans (defined, never called even darkly) are flagged.

**STATUS LEGEND**
- **BUILT** — implementing code exists with real logic + a (dark or live) caller. `(dark)` = behind a Phase-2 flag.
- **PARTIAL** — core exists but a named sub-piece is absent, stubbed, or orphaned (engine exists, no caller).
- **MISSING** — no implementing code.
- **DEFERRED-LOGGED** — intentionally out of v1 (or sequenced-later) **and** written down (citation given). NOT a gap.

---

## TL;DR (the one-screen verdict)

The living-season **spine is built and live** (True Value floats game-by-game, TV trough snapshots persist, the completed-game pipeline `processCompletedGame.ts` fans every soul system). **L1–L12 are BUILT build-dark** (morale matrix, hidden modifiers, designations, dampener, ratings/trait development, random events, managers, fame, races/All-Star/awards) behind their Phase-2 flags. The remaining v1 work is concentrated and largely *known*:

1. **L13 (relationships) is half-built.** L13-1/2/3a committed, L13-4 built-uncommitted — but the **keystone L13-5 (relationship→morale tap) is a no-op stub.** Until it lands, **every relationship edge is inert** (written, read by nothing).
2. **L14 (the rebrand circuit-breaker, §14) is MISSING** — no contract, no code, no flag. RULED (L14-Q1..Q8) but never built. This is the priority **drifted** finding.
3. **A cluster of fame wiring gaps** (`§20.5` fame→player-morale tap, `§20.6` A/B fan-morale channels, the **orphaned WAR legitimacy floor**) and the **orphaned in-season trade-request propensity engine** are v1-spec'd, partially built, and **not cleanly logged as deferred** — the subtle drift beyond L14.
4. **L12-6 (race/award/All-Star UI surfacing)** is the last unbuilt L12 piece.
5. **D12 + D13 (the manual-smoke + Playable-V1 sign-off) have not happened** — they are the literal gate before any Phase-2 flag flips live, and the **L-SIM gate** is the final hard acceptance criterion.

Deferred backlog is **clean** — no silent drops were found in §0–24 (the deferred-logged verifier CONFIRMED every candidate has a citable home).

---

# 1 — FULL §0–24 COMPLETENESS WALK

Every living-season system, status + `file:line`. Grouped by spec section.

## §0–3 — The Standard, v1 Scope, Core Loop, True Value & Frozen Anchors

| System | § | Ticket | Status | Evidence (file:line) |
|---|---|---|---|---|
| True Value floats vs the **frozen** baseline (never re-baselines); profile changes never touch TV | §3 | L2/value-spine | **BUILT** (live) | `franchiseTrueValueStorage.ts:489-589` (recompute per game), `:570-577` (`valueDelta = trueValue − contractValue`), `:246-253` (TV input = seasonWAR only, no ratings term) |
| Three frozen states + floating realized→TV row | §3 | L2 | **BUILT** (live) | `franchiseTrueValueStorage.ts:41,570` (frozen contract), `:451-457,581` (TV row replaced each game), `:318-321,511-518` (frozen-artifact guard) |
| **TV-snapshot store** (per-checkpoint trough history — KK/Comeback enabler; resolves the C5 "single cumulative row" finding) | §3 | LSD-1 SEAM-4 | **BUILT** (live) | `franchiseTrueValueSnapshotsStorage.ts:17-24,83-178`; store w/ checkpoint in keyPath `trackerDb.ts:369-377`; written `processCompletedGame.ts:314-333,615`; consumed `franchiseRaceStandingsCompute.ts:33,86` |
| Core-loop spine (aggregate→WAR→TV→snapshots→[dark soul consumers]→designations→designation-morale) | §2 | spine | **BUILT** (live spine; dark consumers) | `processCompletedGame.ts:580-696`; designation→morale `:335-431` (gated `isFranchisePhase2MoraleEnabled`); consumers gated `:58-66,619-684` |
| §0 The Standard / §1 one-season scope; offseason post-v1 | §0–1 | — | **BUILT** (honored by spine wiring) | `FRANCHISE_V1_LIVING_SEASON_SPEC.md:21-37`; offseason **DEFERRED-LOGGED** (LS-1) |

> **Note (not a gap):** the literal "draft-IV baseline" is operationalized as the **frozen canonical salary/contract** that `valueDelta` measures against — there is no separately-named `draftIvBaseline` row (grep empty). Spec-consistent (§3 names contract + draft-IV baseline as both frozen-at-draft), but worth knowing the freeze is enforced via the frozen trusted-value artifact + canonical salary, not a discrete per-player oracle row.
> **Note:** the **reporter narration leg** of the loop (the "words") is **not yet wired into the spine** — `processCompletedGame` has no reporter call (L4 owns it; LLM/reporter-gated per §5). The matrix (the "math") is live-via-flag; narration is a separate dark leg.

## §4 — Designations (the seven)

| Designation | Ticket | Status | Evidence (file:line) |
|---|---|---|---|
| Team MVP (highest WAR) | L7 | **BUILT** | `franchiseDesignations.ts:383-395,193-196`; eligibility `franchiseDesignationEligibility.ts:120-129,364-394` |
| Ace (highest pWAR, ≥0.5 floor) | L7 | **BUILT** | `franchiseDesignations.ts:397-415,198-201`; `franchiseDesignationEligibility.ts:130-140,347-355` |
| Fan Favorite (highest +valueDelta) | L7 | **BUILT** | `franchiseDesignations.ts:417-438,203-206`; `franchiseDesignationEligibility.ts:434-463` (D6 value-half) |
| Albatross (most −valueDelta) + **Scapegoat→Albatross reconciliation** | L7 | **BUILT** | `franchiseDesignations.ts:440-472`; reconciliation complete (grep `scapegoat` in `src/` = 0) `designationFameNudge.ts:21,82-83` |
| Cornerstone (last season's MVP) | L7 | **DEFERRED-LOGGED** | CUT — `SPEC:77`, `DSTACK:90,192`, **LSD-3**; union excludes it `franchiseDesignations.ts:3-7` |
| Team Captain (L1.5 assign + morale router) | L1.5/L7 | **BUILT** ⚠ | assign `franchiseInitializer.ts:227-287`, called at Mode-1 finalize `:660`; router (Charisma×2, swing-amp) `captainMoraleRouter.ts:31-75` |
| Fan Hopeful (call-up timed cushion) | L1.5/L7 | **BUILT** ⚠ | seed `franchiseInitializer.ts:312-348,661,724`; window/lift/cushion `fanHopefulCushion.ts:28-79` |

> **⚠ Captain caveats:** (a) the §4 **Charisma ≥ 70 floor is NOT enforced** — `computeTeamCaptains` always picks the top loyalty+charisma player even if charisma < 70 (`franchiseInitializer.ts:232-250`, no `charismaFloor`). **Spec mismatch.** (b) `captainMoraleRouter.ts` and `fanHopefulCushion.ts` are **orphaned at runtime** (refs only in own file + test) — documented build-dark seams (their wiring into the morale matrix is the deferred half), so BUILT-but-no-live-consumer.

## §5–7 — Master Morale Matrix, Four Hidden Modifiers, Personalities

| System | § | Ticket | Status | Evidence (file:line) |
|---|---|---|---|---|
| **ONE** deterministic event×personality×modifier matrix; auto/logged (LS-9, no confirm) | §5 | L3 | **BUILT** (dark) | single table `masterMoraleMatrix.ts:273-395`; deterministic lookup `:411-417,522-526`; auto/logged write `franchiseMoraleState.ts:388-462` (`sourceKind 'matrix-auto'`); wired `processCompletedGame.ts:395-401`; **13 importers** (not orphaned) |
| Four hidden modifiers (Loyalty/Ambition/Resilience/Charisma) renamed + persisted | §6 | L1 | **BUILT** | schema `game.ts:123-128`; persisted `prospectScoutingDraftEngine.ts:69-74`, `franchisePlayerProfile.ts:41,233`; Ambition-up/Resilience-down split `masterMoraleMatrix.ts:532-538` |
| 7 canonical personalities + reconciliation | §7 | L1/L3 | **BUILT** | `masterMoraleMatrix.ts:4-11,245-264`; `normalizePersonality` maps legacy GRUMPY/FIERY/SPIRITED → canonical |

> **Notes:** the `MORALE_TAP_REGISTRY` fame/designation/**relationship** taps return **NEUTRAL stubs** today; only the **race** tap carries a live non-neutral delta (`masterMoraleMatrix.ts:399-409`). Designation morale reaches the matrix by a separate route (`persistDesignationMoraleConsequencesAfterTrueValue`), so designation is wired-by-another-route, but the registry taps themselves are placeholders (the relationship one is the L13-5 keystone — §2 below). Legacy `PERSONALITY_BASELINES` still physically present in `playerMorale.ts:83-91` (reconciled at the boundary; stale-data foothold, not a functional gap).

## §8–9 — Dampener, Traits vs Ratings, Development Cadence

| System | § | Ticket | Status | Evidence (file:line) |
|---|---|---|---|---|
| §8 directional fan-morale ratings dampener (brake-never-accelerator) — the L5 **primitive** | §8 | L5 | **BUILT** (dark) | `fanMoraleDampener.ts:43-106` (counter-trend); personality matrix `:15-31` (matches §8 table exactly: Loyalty 1.4 … Egotistical 0.5, Droopy asymmetric); Ambition-up/Resilience-down `:62-73`; consumed `ratingsDevelopment.ts:118-124` |
| Ratings checkpoint sweep (20%-of-games batched league shift) — consumes the dampener | §8/§9 | L8 | **BUILT** (dark) | `franchiseCheckpointSweepCompute.ts:201-289`; boundary `:107-117`; cadence config `rosterEngineConstants.ts:276-291` (`standard:5`/`frequent:10`); wired `processCompletedGame.ts:635` |
| Traits-from-reality (continuous; two-trait cap; gain/loss hysteresis; displacement) | §9 | L9a/L9b | **PARTIAL** | engine `traitAcquisition.ts:235-312,415-434` (cap), `:91-92,285-295` (hysteresis); scorer `traitRealityScorer.ts`; ~50 buildable `traitCandidateBuilder.ts:42-116`; wired `processCompletedGame.ts:642` |
| Morale→**development** tap (the §24.10 built loop); morale→performance deferred | §24.10 | L8 | **BUILT** (dark) | `ratingsDevelopment.ts:86-104` (morale-alignment multiplier); fan morale enters dev **only** via dampener `:16-18,118-124` |

> **Traits PARTIAL (FINDING-150, `AUDIT_LOG.md:1100`):** the matrix + scorer + acquisition + built traits are sound, but several listed traits are **DORMANT** pending unfed joins (the 6 handedness/platoon splits need a handedness-map join; Ace Exterminator needs a pitcher-grade join) — coverage incomplete vs the full earnable set. Deferred seams, logged inline `traitCandidateBuilder.ts:86-115`.
> **Cadence under JK review** (flag, not a build gap): currently fixed 20% = 5/season; JK wants it configurable by season length (`CURRENT_STATE.md:6`). The `frequent:10` option exists; the season-length-scaled cadence is a pending design decision. *(This is the shared cadence used by L8 ratings + L9b traits + L13-3a formation.)*

## §10–11 — Random Events, Two-Tier Confirmation

| System | § | Ticket | Status | Evidence (file:line) |
|---|---|---|---|---|
| §10 random-events engine (8-family menu, Juiced/Std/Nerfed rate, per-game cadence, probability-decides-who, `name_change`, stadium-change leg) | §10 | L10 | **BUILT** (dark) | `franchiseL10EventEngine.ts:27-35,61-128,152-154,218-221,338-345`; wired `processCompletedGame.ts:659-665`; dark overlay store `franchiseL10OverlayStorage.ts:4-15` |
| §11 two-tier confirm / **L2 mutable ratings overlay** (permanent + temporary absolute-expiry; console+DB; oracle locked) | §11 | L2 | **BUILT** (dark) ⚠ | store `franchiseRatingsOverlayStorage.ts:15-24`; merge `ratingsOverlayMerge.ts:42-78`; confirm infra `ratingsOverlayConfirmation.ts:41-90`; producer = L8 sweep `franchiseCheckpointSweepCompute.ts:243-285` |

> **⚠ L2 read-path ORPHANED by design (verified):** no value/designation/morale read path calls `mergeRatingsOverlays`/`confirmOverlay` (grep empty outside own modules+tests). So confirmed overlays never reach effective ratings yet — the §11 loop (change→value→designation→morale→reporter) is **not closed in code**. This is the documented deferred seam (`ratingsOverlayConfirmation.ts:18-21`; live confirm UI = a post-D13 D-ticket), not an accidental orphan. There is no dedicated `isFranchisePhase2L2` flag — L2 is substrate gated through its writers.

## §12 — Managers

| System | § | Ticket | Status | Evidence (file:line) |
|---|---|---|---|---|
| Manager firing (ONE shared `fireManager` resolver; fan-relief bump + performance×personality ripple; pressure-release valve) | §12 | L11 | **BUILT** (dark) | resolver `franchiseManagerFiring.ts:139,174-198`; engine `franchiseL11FiringEngine.ts:55-97`; auto-backstop `franchiseManagerAutoBackstop.ts:148-171`; wired `processCompletedGame.ts:666-672` |
| Manager legacy (named Almanac entities; tenure-end records; WPA/record/tenure) | §12 | L11 | **BUILT** (dark write; WPA machinery live) | `managerWpa.ts:83-103`; `managerIdentityStorage.ts:378-413`; `managerWpaDerivation.ts:281-349` |

> **Notes:** ripple writes via the raw ledger writer (`applyFranchiseMoraleEffect`, reason `manager.fired.ripple`) **not** through the matrix consequence resolver — a routing note, not a §12 violation. No live manual-GM-firing UI button exists (grep empty) — consistent with build-dark. The L14 rebrand reuse (`fireManager({reason:'rebrand',suppressFanReliefBump:true})`) is fully **provisioned** (enum + param exist) but **no rebrand caller invokes it** (→ L14 MISSING).

## §13–14 — Fan-Morale Teeth & the Rebrand Circuit-Breaker

| Tooth / System | § | Ticket | Status | Evidence (file:line) |
|---|---|---|---|---|
| #1 Directional ratings dampener | §13/§8 | L5 | **BUILT** (dark) | `fanMoraleDampener.ts:15-43`; consumed `ratingsDevelopment.ts:118-144` |
| #2 Decay on ignored flashpoints (compounding tax) | §13 | L5 | **BUILT** (dark) | `flashpointDecay.ts:21-52`; store `franchiseFlashpointDecayStorage.ts:16-26`; wired `processCompletedGame.ts:626-628` |
| #3 Indirect through player morale (personality-scaled, egotist 1.5×/relaxed 0.5×) | §13 | L3 | **BUILT** (dark) | `masterMoraleMatrix.ts:62,88,166-233,421-457` |
| #4 Rebrand circuit-breaker | §13 | L14 | **MISSING** | see §14 rows below |
| *Supporting:* in-season trade-request generation (loyalty/morale-scaled) | §13 | L5c/L10 | **PARTIAL (orphaned)** | propensity math `tradeRequestGeneration.ts:30,77,117` exists but is **never imported** by L10/any pipeline; L10 emits a bare `trade_demand` valence `franchiseL10EventEngine.ts:338` without the propensity math |
| *Supporting:* GM hot seat (sustained-low-morale mandate) | §13 | L11 | **DEFERRED-LOGGED** | full pressure/mandate framing deferred past v1 (`DECISIONS_LOG:111-112`, L11-Q13); minimal "fire manager" valve = L11 (built) |
| *Supporting:* reporter intensity (press turns up the heat) | §13 | L5d | **PARTIAL / DEFERRED-LOGGED** | pure engine `reporterIntensity.ts` built; live LLM wiring deferred post-D13 (`DSTACK:83`) |

**§14 THE REBRAND CIRCUIT-BREAKER — MISSING (every distinct mechanic absent; two shared primitives pre-positioned by L10/L11):**

| §14 piece | Status | Evidence (file:line) |
|---|---|---|
| **L14 build contract** | **MISSING** | `grep 'CONTRACT — L14' PROMPT_CONTRACTS.md` = 0 (L11 has 5); only cross-refs inside L10/L11 contracts. RULED but never contracted. |
| **Dwell counter** (consecutive games at rock-bottom fan-morale band; the L14-Q1 trigger primitive) | **MISSING** | `grep dwell src/` = only "Caldwell" city data; spec says `trendStreak` is the wrong primitive, a NEW counter is required — none exists. No `isFranchisePhase2L14Enabled` flag. |
| **GM-gated rebrand action** (offered, not auto-forced) | **MISSING** | `grep executeRebrand|triggerRebrand|rebrandCascade|circuitBreaker|franchiseRebrand` = 0 |
| Cascade #1 — manager auto-fire (`fireManager` reason:'rebrand', suppress relief, keep ripple) | **PARTIAL** | primitive fully ready (`franchiseManagerFiring.ts:50-53,174,193`; enum `managerWpa.ts:104`) — **no caller** |
| Cascade #2 — clear 4 badges + re-seed Fan Hopeful (exempt Captain) | **MISSING** | no rebrand-triggered badge-clear/re-seed code |
| Cascade #3 — stadium relocation (SMB pool pick, dual-path) | **PARTIAL** | pool-pick helper `franchiseStadiumChangeResolver.ts:23,40-61` ("shared with L14") — no rebrand caller; user-pick path + park-factor pull-in **not built** |
| Cascade #4 — team-wide roster fame reset (trade-style) | **MISSING** | L6 has a trade-style reset valve, but no rebrand-triggered team-wide application |
| Cascade #5 — `clearCarriedDeadMoney(teamId)` **stub** hook | **MISSING** | `grep clearCarriedDeadMoney src/` = 0 (the *stub itself* is L14 v1 scope; the real wipe is correctly economy-track-deferred per LSD-6) |
| Cascade #6 — fan morale hard-set LAST to `REBRAND_RESET_MORALE` (~70) | **MISSING** | `grep REBRAND_RESET_MORALE src/` = 0 |
| `teamHistory` relocation marker `{formerTeamName, formerStadiumName, relocatedAtSeason, relocatedAtGame}` | **MISSING** | grep = 0 franchise-metadata hits; `tradeEngine.formerTeamName` is the unrelated trade-return storyline; `teamMVP.PlayerTeamHistory` is player-legacy carryover (both decoys) |

> **Verifier verdict (NUANCED → confirmed):** both halves of "no contract, no implementing code" are literally true; NUANCED only because three **shared seams** are live and would fool a careless sweep — the `fireManager` rebrand-arg (L11), `pickStadiumFromPool` (L10-4, header "shared with L14, do NOT fork"), and the L11-5 news adapter mapping `rebrand→relocated`. These are L10/L11-owned scaffolding pre-positioned for L14 reuse — **not L14 code**. Provenance: every git commit touching L14 is `docs(...)`, zero `feat(...)`.

## §15 + §24 — Relationships-Lite (the L13 stack)

| Sub-ticket | § | Status | Evidence (file:line) |
|---|---|---|---|
| L13-1 edge store + 6-edge enum + v24→v25 migration | §24.2 | **BUILT** | `franchiseRelationshipEdgesStorage.ts:4,15-39,92,109`; `trackerDb.ts:17,455-459` (v25); browser-verified `CURRENT_STATE.md:1462-1472` |
| L13-2 taxonomy reconciliation 9→6 | §24.2 | **BUILT** | `relationshipEngine.ts:16-67` (`RELATIONSHIP_9_TO_6_MAP`) |
| L13-3a edge **formation** (threshold-gate + checkpoint write; first store writer) | §24.2-4 | **BUILT** (dark, `f737c67e`) | `relationshipFormation.ts`; writer `franchiseRelationshipFormationCompute.ts:94-193`; wired `processCompletedGame.ts:647-652`. Forms 4 of 6 (ROMANCE/HISTORY → L13-3b) |
| L13-3b formation refinements (Captain composite + romance/gender + co-rostered time) | §24.6/24.9/24.3 | **DEFERRED-LOGGED** | `PROMPT_CONTRACTS.md:13731` (LOGGED-deferred contract) |
| L13-4 intensity lifecycle (per-game decay + charged-matchup intensity + dissolution) | §24.8/24.7 | **BUILT** (dark, **UNCOMMITTED**) | `relationshipIntensity.ts:99-176`; writer `franchiseRelationshipIntensityCompute.ts:136-191`; wired `processCompletedGame.ts:653-657` |
| **L13-5 morale tap (KEYSTONE)** | §24.1/24.10 | **MISSING** | stub `masterMoraleMatrix.ts:408` (`relationship: () => NEUTRAL_BASE_CONSEQUENCE`); contract `PROMPT_CONTRACTS.md:13841` (AUTHORED — build HELD) |
| L13-6 charged-matchup **morale** amplification | §24.7 | **MISSING** | authored/held `PROMPT_CONTRACTS.md:13872`; depends on L13-5 + History edges (L13-3b) |
| L13-7 reporter integration (REP-4 ~10% inaccuracy + pre-move intel + news adapter + fan nudge) | §24.5/24.10 | **MISSING** | authored/held `PROMPT_CONTRACTS.md:13892`; edge `accuracy`/`potential` fields ready but unconsumed `franchiseRelationshipEdgesStorage.ts:33-34` |
| L13-8 flag-gated `processCompletedGame` wiring | §24.8 | **PARTIAL** | formation+intensity branches wired `processCompletedGame.ts:647-658`; morale/charged/reporter live callers HELD `PROMPT_CONTRACTS.md:13917` |

> **KEYSTONE (verifier NUANCED→confirmed):** relationships are functionally **INERT**. Orphan check: the only non-test reader of the edge store is L13-4's own intensity recompute, which writes intensity straight back and feeds **no** morale/development/reporter. **Two** stacked missing links: (1) a **producer** that emits a `kind:'relationship'` morale event from the edge store (none exists), and (2) a non-stub **resolver** at `masterMoraleMatrix.ts:408` (currently NEUTRAL). Until **both** land, edges accumulate in IndexedDB and influence nothing. *(Naming precision: the wired morale path writes the morale ledger; whether morale then reaches development is the next hop — moot until edges reach morale at all.)*

## §20 — Fame

| System | Status | Evidence (file:line) |
|---|---|---|
| Heat (recency decay) + Reach (ratcheting floor) + `wasNegative`; trade reset valve | **BUILT** (dark) | `fameModel.ts:27-32,145-238`; wired `franchiseFameCompute.ts:100-118`, `processCompletedGame.ts:621`; honor ratchet `franchiseHonorReachFloor.ts:12-47` |
| Single §20.7 nine-tier ladder (`resolveFameTier`, neg-recovery skips Unknown) | **BUILT** (dark) | `fameModel.ts:6-88,205-225`; consumed dark by race scorer `franchiseRaceStandingScorer.ts:69` |
| Four layers | **PARTIAL** | WPA spine `franchiseFameCompute.ts:160-164` ✔; iconic catalog `fameModel.ts:300-314` ✔; defensive + role-player sub-aggregates `franchiseFameCompute.ts:46-71` ✔; **WAR legitimacy floor ORPHANED** (`applyWarLegitimacyGravity fameModel.ts:161-174` never wired into the compute); **status channel has no producer** |
| §20.4 status layer (draft seed, call-up, send-down, bench 0.5× multiplier, league-leader) | **MISSING / DEFERRED-LOGGED** | only the `status` channel slot + `applyTradeReset` exist; no producer. Owned by **L6 follow-up** per L12-Q8 (`DECISIONS_LOG:134-136`) |
| §20.5 fame→player morale + §20.6 fan-morale channels | **PARTIAL** | Channel C (designation→fame seed) built (L7b); **§20.5 player-morale tap NOT wired** (no fame term in `masterMoraleMatrix.ts`); **§20.6 A/B no producers** in `fanMoraleEngine`/utils |

> **The 3 legacy fame ladders** (6-tier `FameLevel` `game.ts:106`, 9-tier symmetric `getFameTier` `fameEngine.ts:349`, 5-tier reporter `FameTier` `reporter.ts:10`) are **not purged** (the reporter 5-tier is actively UI-wired). Purge **DEFERRED-LOGGED** to post-D13 fame activation (L12-Q10, `DECISIONS_LOG:137`); the only hard requirement (races read `resolveFameTier`, not `getFameTier`) is already met.

## §21–23 — Race System, All-Star, Awards

| System | Status | Evidence (file:line) |
|---|---|---|
| §21 Race primitive (close-race tilt window + fan-vote mode + per-game recompute; Visibility/Emission split) | **BUILT** (dark) | `franchiseRaceStandingScorer.ts:31-126`; recompute `franchiseRaceStandingsCompute.ts:89-158`; wired `processCompletedGame.ts:673-678` |
| §22 All-Star builder (26-man one-league-wide) + 60% lock + LOCK payout | **BUILT** (dark) | `franchiseAllStarSelector.ts:55-372`; lock `franchiseAllStarLock.ts:1-20`; persist `franchiseAllStarRosterCompute.ts:38-108`; payout `franchiseAllStarLockPayouts.ts:69-133` |
| §23 merit awards — 8 categories (MVP=totalWAR, CY=pWAR, GG=fWAR+def-fame, RoY, SS, Reliever, Bench, Booger) + MOY | **BUILT** | `franchiseAwardsEngine.ts:43-52,267-288`; MOY truth-layer `managerValueTrace.ts:14-33` (Phase-1 D9, live) |
| §23.3 TV-family (KK / Bust / Comeback) | **BUILT** | `franchiseTvFamilyScorer.ts:28-67` (Comeback = currentTV − season-low via snapshots) |
| §23.8 Platinum Glove + WS MVP | **DEFERRED-LOGGED** | emblems only `awardEmblems.ts:14-17`; no compute — L12-Q1 defers season-end one-shots (`DECISIONS_LOG:118-122`). Hall of Fame OUT v1 |
| L12-5 emission + L3 race-snub morale + honor→reach-floor ratchet | **BUILT** (dark) | `franchiseRaceSnubMorale.ts:50-156`; `franchiseHonorReachFloor.ts:5-46`; season-end `franchiseSeasonEndHonors.ts:72-158` (chained `FranchiseHome.tsx:3319,3359`) |
| §23.9 season-end ceremony decouple (payouts decoupled from the LLM nod — the H3 production fix) | **BUILT** (dark) | `franchiseSeasonEndHonors.ts:82-155`; `CURRENT_STATE.md:305-314` |
| **L12-6 Almanac/UI surfacing** (flag-off All-Star UI from the real builder; race/award standings + 4 new categories in `AwardsWatchlist`; `allStarSelections` counter) | **MISSING** | `CURRENT_STATE.md:28-29`; `AwardsWatchlist.tsx` is the D9 awards UI, doesn't import the race/All-Star surfaces |

## §16 / §17 / §18 / Economy

| System | Status | Evidence (file:line) |
|---|---|---|
| §16 L-SIM Simulation-Gate harness | **BUILT** (23 committed soul invariants) | runner `test-utils/lsim/seasonRunner.scenario.ts`; invariants `test-utils/lsim/invariants/soul.ts:988-1015`; falsification `test-utils/lsim/falsification.ts:301-320`; report `SEASON_SIMULATION_REPORT.md` |
| §17 open sections (Fame/Race/All-Star/Awards/Relationships) | **LOCKED** (designs ratified §20-24) | pointers `SPEC:282-294` |
| §18.1-4 verification reads (Reporter / Trait-signal / Draft-salary-farm / Manager-WPA) | **BUILT** (4 cert docs) | `REPORTER_CERTIFICATION.md`, `TRAIT_SIGNAL_CERTIFICATION.md`, `DRAFT_SALARY_FARM_CERTIFICATION.md`, `MANAGER_WPA_MOY_CERTIFICATION.md` |
| L-ECON1 unified relative-to-pool salary scale (DSF-1) | **DEFERRED-LOGGED** (in v1; "safety wall" set-aside) | new-league-only `CURRENT_STATE.md:1488`; `TIER_SHIFTS` has 0 consumers `tierParams.ts:36-55` |
| L-ECON2 tradeable picks (DSF-2) / L-ECON3 farmGradeMode (DSF-3) | **DEFERRED-LOGGED** (in v1; contracted, no code) | `DSTACK:109-110`; `DECISIONS_LOG:1294,1297` |
| DSF-4 in-season annual draft | **DEFERRED-LOGGED** (post-v1) | `DSTACK:111`; `DECISIONS_LOG:1300` |

> **L-SIM notes:** the gate is runnable by structure + committed regenerated baselines + the committed report, but has **no npm script** (file is `*.scenario.ts`, outside the default vitest include) and a clean in-session live run was not obtained. Two doc/test hygiene items: (1) the **uncommitted L13-4 diff** adds a 24th invariant (`relationshipIntensityLifecycle`) but `falsification.ts` still asserts `length === 23` → the working tree's count/coverage tests will fail until L13-4 is finished; (2) `L_SIM_COVERAGE_GAPS.md:7` says "20 implemented" — **stale** vs the 23 committed.

---

# 2 — DRIFTED / FORGOTTEN ITEMS (priority)

These fell out of view in the recent L12/L13/H3 work. Ordered by severity.

### 2.1 — L14 Rebrand circuit-breaker — **MISSING entirely** (the headline finding)
**Specced FOR v1** (LSD-6), **RULED in full** (L14-Q1..Q8, `DECISIONS_LOG:203-230`), but **no contract and no code.** Every §14 cascade sub-step is absent except the two shared primitives L10/L11 pre-built in anticipation (`fireManager` rebrand-arg, `pickStadiumFromPool`). No `isFranchisePhase2L14Enabled` flag. Including the §13 **Tooth #4** (rebrand) and the §13 **decay-feeds-rebrand** teeth, the *entire* circuit-breaker arm of fan-morale's "teeth" is unbuilt. **Status: design RULED, contract NOT written, code NOT built.** This is *sequencing* (L-stack order is L13 → L14 → L-SIM), not a silent drop — but it is the single largest unbuilt v1 system and the priority drifted item.

### 2.2 — L13-5 keystone — relationships are **INERT** until it lands
The relationship→morale tap is a no-op stub (`masterMoraleMatrix.ts:408`). Edges written by L13-3a/L13-4 are read by nothing downstream. This single gap **gates the entire §24 value loop** and (with L13-6/7/8) the relationships feature's payoff. See §3 keystone flag.

### 2.3 — Fame wiring gaps **NOT cleanly logged as deferred** (the subtle drift)
The closest things to silent gaps — v1-spec'd in the LOCKED §20 design, partially built, but the *wiring* is neither done nor logged-as-deferred:
- **WAR legitimacy floor (layer 2) is ORPHANED** — `applyWarLegitimacyGravity` (`fameModel.ts:161`) is called only from its test; the slow merit-floor gravity that the §20.1/§20.2 **snub/bust engine** depends on does **not run** in the per-game compute. The fame-vs-merit gap (the whole reason fame needs WAR *and* WPA) is currently WPA-only.
- **§20.5 fame→player-morale tap NOT wired** — fame is not yet an input to the master morale matrix (no fame term in `masterMoraleMatrix.ts`).
- **§20.6 Channel A/B (fame amplifies/colors fan-morale swings + steady designation sentiment) — no producers** in `fanMoraleEngine`/utils. (Only Channel C, designation→fame seed, is built.)

These three are flagged as **dark seams consistent with build-dark sequencing**, but unlike the §20.4 status layer (which *is* logged as an L6 follow-up, L12-Q8), they are **not separately enumerated as deferrals** anywhere found. **→ RULED (JK 2026-06-20): WIRE FOR V1.** All three are hard v1 scope (see §3 #4); they should be built before the flag-flip, not deferred.

### 2.4 — In-season trade-request propensity — **ORPHANED** → priced as **WIRING (cheap)**, not BUILD
The §13 "angry fans → more trade requests; low-loyalty/low-morale bolt first" math (`tradeRequestGeneration.ts`) is **never imported** by L10 or any pipeline. L10 emits a bare `trade_demand` valence without consulting the loyalty/morale propensity. The in-season trade-request tooth (kept in v1 per LSD-2) is therefore **not actually driven by the spec'd math** today.

**PRICING (2026-06-20, read-only investigation — for the v1-vs-v1.1 decision):**

*How a trade demand fires TODAY (the real mechanism — verified, not assumed):* the L10 dark sweep `computeFranchiseL10Events` (`franchiseL10EventEngine.ts:175-196`) rolls each player candidate against the `roster` family at a flat per-family base rate × intensity × generic morale/personality factors (`computeProbability:227-258`). If the roster roll fires, `getRosterEvent` (`franchiseL10EventEngine.ts:331-346`) does a **second seeded roll split into flat equal thirds** — `trade_demand` (roll < 1/3), `mentorship` (< 2/3), `clubhouse_rift` (else). **So `trade_demand` is a flat 1/3 dice split — no loyalty, no fan-anger, no morale-scaling.** The loyalty-inversion / discontent / fan-anger math the spec calls for is *not* consulted.

*What the orphaned engine actually is:* `tradeRequestGeneration.ts` is a **complete, pure, deterministic, unit-tested engine** with §16 sim-tune placeholders already in place — not a stub. Signature: `computeTradeRequestPropensity(player: TradeRequestPlayer, teamFanMorale, intensity, config?) → { propensity, wouldRequest, reason, components }` (`:77-115`) + `rankTradeRequestCandidates(...)` (`:117-130`). Its inputs are `TradeRequestPlayer = { loyalty, personality, playerMorale }` + `teamFanMorale` + `intensity` (`:53-57`). **Consumed by:** nothing but its own test (`__tests__/tradeRequestGeneration.test.ts`) — confirmed orphan. **What it needs to consume:** loyalty + personality + playerMorale + teamFanMorale + intensity.

*The gap is WIRING, not BUILD.* The L10 candidate (`FranchiseL10Candidate`, `franchiseL10EventEngine.ts:81-89`) **already carries 3 of the 4 player inputs** — `personality`, `playerMorale`, `fanMorale` — all populated per-player by the sweep (`franchiseL10SweepCompute.ts:143-151`), and `intensity` is in scope at the engine. The **only** missing input is `loyalty`, which is **already available on the `player` object at the sweep site** (`player.hiddenPersonalityModifiers.loyalty` — the L1 substrate, same source the captain selector reads at `franchiseInitializer.ts:241-243`). Concretely the wiring is ~3 edit sites:
1. `franchiseL10EventEngine.ts` — `import { computeTradeRequestPropensity }`; add `loyalty?: number` to `FranchiseL10Candidate`; replace the flat 1/3 `trade_demand` branch in `getRosterEvent` (`:331-346`) with a **propensity-gated** decision (gate: emit `trade_demand` only if `wouldRequest`, else fall through to mentorship/clubhouse_rift — or bias the split by `propensity`); thread `intensity` into `getEventType`/`getRosterEvent` (a trivial signature add — they don't receive it today).
2. `franchiseL10SweepCompute.ts:143-151` — add one line populating `loyalty` on each player candidate from the hidden modifiers.
3. `franchiseL10EventEngine.test.ts` — extend the existing roster-events test (`:316`) to cover the propensity-gated path + loyalty-scaling determinism.

**No new store, no schema/DB version bump, no new flag (rides the existing default-OFF `isFranchisePhase2L10Enabled`), no new pipeline.** The one embedded design choice (gate-vs-weight the 1/3 split, and whether `rankTradeRequestCandidates` should also cap how many demands fire league-wide) is a small builder/JK call, not a blocker. **VERDICT: WIRING (cheap) — ~2 production files + 1 test, ~1 field + 1 import + one branch swap + a 1-line thread. The propensity engine is build-complete; this connects an existing primitive.** **RULED (JK 2026-06-20): WIRE FOR V1.**

### 2.5 — Smaller drift
- **Captain Charisma ≥ 70 floor — RESOLVED (JK ruled 2026-06-20: code is right, spec was stale).** The relaxation is intentional: captain = highest combined Charisma+Loyalty, **NO floor** (every team always has a captain), and captain **effectiveness scales** with the combo. The spec's ≥70 floor was the drift; `FRANCHISE_V1_LIVING_SEASON_SPEC.md` §4 corrected to match `computeTeamCaptains` (`franchiseInitializer.ts:227-257`). No code change.
- **L2 overlay loop not closed** — the §11 change→value→designation→morale loop has no live reader (deferred post-D13 confirm UI).
- **`captainMoraleRouter` + `fanHopefulCushion` orphaned** at runtime (documented dark seams; their matrix/per-game wiring is the held half).
- **Stale `PERSONALITY_BASELINES`** in `playerMorale.ts:83-91` (reconciled at the boundary; cleanup-only).

**No §-section of the spec has zero corresponding code** *except* §14 (L14). Every other §0–24 system has at least a built primitive or a wired dark consumer.

---

# 3 — REMAINING-FOR-V1 SCOPE (dependency-ordered)

The Mode-2 work still required for v1, ordered by dependency. **★ = the keystone.**

| # | Work | Ticket(s) | Blocker class | Depends on |
|---|---|---|---|---|
| 1 ★ | **L13-5 — relationship→morale tap** (producer in the pipeline + non-stub resolver at `masterMoraleMatrix.ts:408`). **HARD BLOCKER: until it lands, all relationship edges are inert** — L13 has no payoff. | L13-5 | **HARD** | L13-3a/4 (done) |
| 2 | L13-6 (charged-matchup morale) + L13-7 (reporter intel/inaccuracy) + L13-8 completion (live callers) | L13-6/7/8 | HARD (feature completeness) | L13-5; L13-3b (History edges) for L13-6 |
| 3 | **L14 — rebrand circuit-breaker** (author the contract, then build: dwell counter, GM-gated action, the 6-step atomic cascade, `teamHistory` marker, `clearCarriedDeadMoney` stub, `REBRAND_RESET_MORALE`). Consumes the ready `fireManager`/`pickStadiumFromPool` seams. | L14 | **HARD** (§14 is v1 / LSD-6) | L5, L7, L11, L6, stadium-analytics |
| 4 | **Fame→morale wiring** — §20.5 player-morale tap + §20.6 A/B fan-morale channels + **wire the orphaned WAR legitimacy floor** into `franchiseFameCompute` | L6/L3/L7 | **HARD — RULED v1** (JK 2026-06-20) | L6, L3 |
| 5 | **L12-6 — race/award/All-Star UI surfacing** + `allStarSelections` counter (the last L12 piece) | L12-6 | HARD (no UI = invisible races) | L12-1..5 (done) |
| 6 | Connect the **trade-request propensity** engine to L10's `trade_demand` (priced **WIRING/cheap** — §2.4: ~2 prod files + 1 test, 1 field + 1 import + branch swap; no store/schema/flag) | L5c/L10 | LOW (WIRING) — **RULED v1** (JK 2026-06-20) | L10 (done) |
| 7 | §20.4 **fame status layer** (draft seed / call-up / send-down / bench multiplier / league-leader) | L6 follow-up | MEDIUM (logged L12-Q8) | L6 |
| 8 | **Traits-from-reality completion** — feed the dormant joins (handedness map, pitcher-grade) so the full earnable set fires | L9a/L9b | MEDIUM (FINDING-150) | L9a enrichment capture |
| 9 | **L2 overlay loop closure** — live confirm UI + a value/designation/morale read path that calls the merge | L2c (post-D13 D-ticket) | MEDIUM | L8 (done) |
| 10 | **L-SIM gate** — drive the matrix; tune every §16 number; **final hard acceptance gate** (continuous + last). Fix the working-tree falsification/count drift + the stale `L_SIM_COVERAGE_GAPS` "20" | L-SIM | **HARD (gate)** | all of the above (per-engine sub-checkpoints) |
| 11 | **D12 + D13** — manual iPad smoke ("no phantom morale") + JK Playable-V1 sign-off → the **literal flag-flip gate** | D12/D13 | **HARD (gate)** | D1–D11 (done) |
| 12 | Pre-activation cleanups: PRE-ACT-TRAITS; retire `mwarCalculator`/`calculateMOYVotes` + re-point `AwardsCeremonyFlow`/`RatingsAdjustmentFlow`; remove the roster-tab confirmation-gate UI (LS-9); deferred `getFameTier` label-purge (L12-Q10) | D-tickets | POLISH (pre-flip) | — |
| 13 | L-ECON1 (safety-wall, new-league-only) / L-ECON2 / L-ECON3 — in v1, orthogonal; L-ECON1 must precede a new league's draft/salary freeze | L-ECON1/2/3 | MEDIUM (orthogonal) | IV spine |
| 14 | Polish: legacy fame-ladder purge (post-D13); stale `PERSONALITY_BASELINES` cleanup *(Captain ≥70 floor — RESOLVED, spec corrected, no code change)* | L1/L6 | POLISH | — |

**Hard blockers to a shippable living-season v1:** #1 (L13-5 keystone), #3 (L14 — it is §14 v1 scope), **#4 (fame→morale wiring — RULED v1)**, #5 (L12-6 UI), #10 (L-SIM gate), #11 (D12/D13). Everything else is feature-completeness, medium, or polish (#6 trade-propensity is cheap WIRING, ruled v1).

**Critical-path order:** finish **L13 (5→6→7→8)** → **L14** → **fame→morale wiring + L12-6 UI** (parallel) → **L-SIM tuning continuous** → **D12 → D13 → flag-flip**, with L-SIM the final gate.

---

# 4 — DEFERRED-AND-LOGGED CONFIRMATION ("defer is fine, dropped is not")

The deferred-backlog verifier **CONFIRMED: no true silent drop in §0–24.** Every Mode-2 item currently treated as deferred has a citable home:

| Deferred item | Logged where |
|---|---|
| Cornerstone designation (CUT) | LSD-3 — `DECISIONS_LOG:1399`; `DSTACK:90,192` |
| FA-attraction / free-agent gravity (→ v1.1) | LSD-2 — `DECISIONS_LOG:1395` |
| Budget pressure (CUT) | LSD-4 — `DECISIONS_LOG:1401` |
| Custom stadiums (pool-pick only) | LSD-5 — `DECISIONS_LOG:1403` |
| Offseason / Season-2 bridge (post-v1); in-season annual draft | LS-1; DSF-4 — `DECISIONS_LOG:1300`; `DSTACK:111` |
| morale→in-game-performance / WAR (only morale→development is v1) | §24.10 correction / REL-9 — `SPEC:639,671`; `DECISIONS_LOG:53,65-68` |
| Captain §24.9 effectiveness composite; ROMANCE/HISTORY formation; co-rostered "extended time" | L13-3b (LOGGED-deferred contract) — `PROMPT_CONTRACTS.md:13731-13738` |
| §20.4 fame status layer | L6 follow-up — L12-Q8, `DECISIONS_LOG:134-136` |
| Legacy fame-ladder purge | L12-Q10 — `DECISIONS_LOG:137` |
| Platinum Glove + WS MVP (season-end one-shots); Hall of Fame (OUT) | L12-Q1 — `DECISIONS_LOG:118-122`; AWARD-8 |
| GM hot-seat full mandate framing (minimal fire-manager ships v1) | L11-Q13 — `DECISIONS_LOG:111-112` |
| Reporter-intensity live LLM wiring (post-D13) | `DSTACK:83` |
| All-Star 1-vs-2-team / dual-conference formats; per-checkpoint race narration | v2 — `DECISIONS_LOG:1969,2003`; `CURRENT_STATE.md:33-35` |
| L-ECON1/2/3 (in v1, contracted, unbuilt); DSF-4 (post-v1) | DSF-1..4 — `DECISIONS_LOG:1289-1300`; `DSTACK:75,109-111` |
| L-SIM un-built soul-invariant coverage (tagged by enabler) | `L_SIM_COVERAGE_GAPS.md:12-35` |

**Three items were deferred-by-sequencing-but-NOT-cleanly-logged-as-deferred** (the §2.3/§2.4 drift) — the **fame WAR-legitimacy-floor wiring**, the **§20.5/§20.6 A/B fame→morale channels**, and the **orphaned trade-request propensity**. Not silent *drops* (code primitives exist), but silent *gaps*. **RESOLVED (JK 2026-06-20):** the fame items are **RULED v1** (wire before the flag-flip — §3 #4); the trade-request propensity is priced **WIRING/cheap** (§2.4) and **RULED v1**. None remains an un-owned gap.

**L14** is MISSING-but-logged-as-pending (RULED + owned + sequenced) — not a silent drop, but it has no build contract yet.

---

# WAITING_ON_JK — RESOLVED (rulings folded in 2026-06-20)

The 4-item block has been ruled. Status of each:

1. **Fame→morale wiring (§20.5 + §20.6 A/B + the orphaned WAR legitimacy floor).** ✅ **RULED — WIRE FOR V1.** All three are hard v1 scope; build before the flag-flip (§3 #4). *(The WAR floor powers the §20.2 snub/bust engine — without it, fame-vs-merit is WPA-only.)*

2. **In-season trade-request propensity (§13 / LSD-2).** ✅ **RULED — WIRE FOR V1** (JK 2026-06-20). Priced **WIRING (cheap), not BUILD** (§2.4): ~2 production files + 1 test, 1 field + 1 import + a branch swap; no store/schema/flag/pipeline. The decision rule (wire if cheap WIRING) resolved to wire-for-v1 and JK confirmed.

3. **L14 contract authoring.** ✅ **RULED — author the contract NOW** (shared `fireManager`/`pickStadiumFromPool` seams are ready); **build later / queued behind L13.** *(JK to direct the contract authoring separately — NOT done in this pass.)*

4. **Captain Charisma ≥ 70 floor (§4).** ✅ **RESOLVED — relaxation intentional; the code is right.** No floor (every team always has a captain); effectiveness scales with the Loyalty+Charisma combo. `FRANCHISE_V1_LIVING_SEASON_SPEC.md` §4 corrected to match code (`computeTeamCaptains`, `franchiseInitializer.ts:227-257`). No code change.

---

*Follow-up complete (2026-06-20). Read-only on code — doc edits only (`MODE2_V1_COMPLETENESS.md` + the §4 captain correction in `FRANCHISE_V1_LIVING_SEASON_SPEC.md`). **All 4 WAITING_ON_JK items resolved** (item 2 ruled wire-for-v1). The trade-propensity wiring + the fame→morale wiring are now owned v1 build items; L14 contract authoring is greenlit (separate pass).*
