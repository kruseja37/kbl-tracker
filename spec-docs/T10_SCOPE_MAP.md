# T10 — Lineup Delta WPA Standard Wiring + Constants Snapshotting — SCOPE MAP

**Created:** 2026-06-15 (Captain synthesis from a 6-agent decorrelated read-only mapping fan-out + 2 critics)
**Status:** RATIFIED — 3 JK rulings recorded 2026-06-15 (DECISIONS_LOG). Q1 = IV-of-effectiveRatings (misnomer
documented, rename→v2); Q2 = pure projected-vs-projected §9 scalar persisted additively, shipped realized
`managerWpa` kept separate/untouched; Q3 = full-dependency content-hash on `SeasonMetadata`, single "high" T10
(no DB migration). Q4 = single ticket. Q5 default holds. Contract: `Temp/t10-contract.md` + PROMPT_CONTRACTS
T10. No build/test run yet.
**Authoritative spec:** `IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md` **§9** (line 548 — Lineup Delta WPA
Standard), **§8.1/§8.2** (the optimizer the standard reuses), **§11** (engine boundary), **§12** (constants
registry + "snapshot-versioned per season" last line), **§13** (build seq — T10 row line 641 + audit gate
line 628), and **DECISION D9** (line 84). Routing (spec row): Codex 5.5 | high → Fable 5 CLI audit (Opus 4.8
while Fable unavailable; auditor ≠ builder).
**Verification tier:** every decision-determining claim below (semantics, the realized-vs-projected
collision, the IV→WPA divisor, the runtime boundary, the backup-restore state) was **independently
Captain-verified** by direct read/grep (file:line cited). Game-flow integration line numbers (GameTracker
init, useGameState end-game call-sites) are from the fan-out and are to be re-pinned in the build contract.

> **§9 verbatim:** "The consistent standard for judging managerial lineup decisions:
> `lineupDeltaWPA = expectedValue(actualLineup) − expectedValue(optimizerLineup)` computed at lineup-lock
> using §8.1 machinery with identical context inputs. Persisted per game; feeds existing WPA delta surfaces.
> The optimizer output is the auditable benchmark — never silently change its constants mid-season
> (constants snapshot stored with each season)."
>
> **D9 verbatim:** "Mode 2 optimizer philosophy: NOT a ratings-vs-form blend. Effective Ratings compose
> deterministically (§4); optimizer maximizes IV of effective ratings. Lineup delta WPA judged against this
> standard."
>
> **§12 last line:** "Every constant snapshot-versioned per season for WPA-standard auditability (§9)."

---

## 1. WHAT T10 IS

Two deliverables: (a) **wire the §9 standard** — persist, per game, the lineup-delta scalar
`expectedValue(actualLineup) − expectedValue(optimizerLineup)` computed from the §8.1 optimizer; and
(b) **snapshot the optimizer constants per season** so the benchmark is auditable and never silently
re-baselined mid-season. T10 is the **LAST T-stack ticket before D0** — the bias is minimal-and-correct,
not gold-plated.

The headline of the map: **the §8.1 machinery, the lineup-lock snapshots, and even the literal §9 delta are
already built.** What is genuinely new is small — and one fork is **blocking on a JK ruling** because the
shipped "Manager WPA" lineup metric is a *different* number from §9's literal text.

---

## 2. THE DECISIVE FINDINGS (re-scope the ticket)

**Finding 1 — the §9 literal scalar already exists, display-only, not persisted.**
`summarizeLineupSnapshotComparison` (`optimalLineup.ts:416-429`, **VERIFIED**) returns
`projectedOpportunityCostTotal = chosen.projectedTeamLineupKblWpa − optimal.projectedTeamLineupKblWpa` — this
*is* `expectedValue(actual) − expectedValue(optimizer)`, computed purely from the two lineup snapshots that
are already frozen at lineup-lock and persisted on the game header. It is consumed by 4 display panels
(TeamHub, EliminationTeamHub, LeagueBuilderRosters, OptimalLineupComparisonPanel) and **never persisted or
aggregated.** So T10's §9-wiring half = *persist this already-computed scalar per game.* Pure reuse.

**Finding 2 (BLOCKING) — the *persisted* "lineup delta WPA" is a DIFFERENT, realized-vs-projected hybrid.**
The thing that IS persisted and feeds 5 live surfaces is `ManagerLineupDeltaRecord.managerWpa`, derived in
`deriveTeamLineupDeltas` (`managerWpaGameState.ts:929-941`, **VERIFIED**):
`actualVsOptimalProjection = actualChosenKblWpa − optimal.projectedSlotKblWpa`, where
`actualChosenKblWpa = totalsByPlayerId.get(playerId).totalWpa` — the player's **REALIZED in-game WPA**. So
the shipped metric subtracts a *projected IV* slot value from a *realized win-probability* total — an
ex-post manager-credit number, dimensionally distinct from §9's ex-ante projection-vs-projection
opportunity-cost. **§9 cannot be "wired" until JK rules which number is the standard** (see Q2).

**Finding 3 — "WPA" is a misnomer: these are rescaled IV dollars, per D9.** The optimizer scores in IV
dollars (`optimizeLineup` → `totalScore` = Σ `computeIV(effectiveRatings()).kblIV`, `rosterAnalyzer.ts:153/
187/571`, **VERIFIED**). The "KblWpa" fields are that IV divided by a laundering constant:
`projectedSlotKblWpaFromIv(slotScore) = slotScore / CALIBRATE.lineupSnapshotWpaDivisor` where the divisor =
**10,000,000** (`optimalLineup.ts:625-627` + `rosterEngineConstants.ts:257-261`, **VERIFIED**) — a ~$300k IV
slot becomes a ~0.03 "WPA-looking" number. Per D9 this is correct (IV-of-effectiveRatings IS the standard);
the name is legacy branding. The literal win-probability engines (`wpaCalculator`/`wpaV2`/`winExpectancy*`)
are a separate unit system, wired only to play-by-play attribution — NOT what §8.1 maximizes.

**Finding 4 — the §12 constants snapshot is genuinely greenfield** (no `constantsVersion`/`constantsSnapshot`/
`seasonConstants` mechanism exists anywhere in `src/`, **VERIFIED**). This is the one true "build." Its cost
is entirely determined by the mechanism chosen (Q3): a hash-stamp on the existing `SeasonMetadata` is
additive (no DB bump, travels in backup), while a dedicated season store is a DB v15→16 migration.

**Finding 5 — pre-existing backup-restore defect (surfaced, not caused by T10).** `backupRestore.ts` pins
`'kbl-tracker'.version: 12` (`:275`) and its `trackerStores` registry (`:69`) omits **all three** newer
stores — `franchiseTrueValueRows` (v13), `franchiseDesignationRows` (v14), `franchiseSeasonLedgerRows` (v15,
T7c) — **0 matches, VERIFIED**. `getSchemaIssues` iterates the schema, not `db.objectStoreNames`, so the
omission fails **silently** on backup/restore. Any *new* season-scoped store T10 adds would inherit this
silent-drop bug. **Mitigation:** if T10 stamps the snapshot onto `SeasonMetadata` (already registered in
backup, `backupRestore.ts:115`, **VERIFIED**), it sidesteps the defect entirely. The 3 pre-existing omissions
are a separate backup-hardening ticket — flagged loudly so they aren't lost.

---

## 3. REUSE — DO NOT REBUILD (verified file:line)

| Asset | File:line | T10 use |
|---|---|---|
| **§8.1 optimizer** | `rosterAnalyzer.ts:153` `optimizeLineup(team, vs, states)` | Σ IV-of-effectiveRatings over slots; greedy assign + local swap; per-call single hand. `totalScore` (`:187`) = the lineup EV scalar. |
| IV-of-effectiveRatings kernel | `rosterAnalyzer.ts:529-571` `ivOfEffectiveRatings` → `computeIV(effectiveRatings(...)).kblIV` | The per-slot `expectedValue`. "One truth" with T7a/T9. |
| effectiveRatings / computeIV | `effectiveRatings.ts` / `ivEngine.ts:638` `.kblIV` | §4 composition + canonical IV scalar. Unchanged. |
| **§9 literal delta (already computed)** | `optimalLineup.ts:416-429` `summarizeLineupSnapshotComparison` → `projectedOpportunityCostTotal = chosen.projectedTeamLineupKblWpa − optimal.projectedTeamLineupKblWpa` | **Source the §9 scalar from here** — do not re-derive. Currently display-only. |
| Lineup-lock snapshots (chosen + optimal) | `GameTracker.tsx:~4503-4552` (init effect, single-fire `gameInitialized` guard) → persisted on game header (`gameStorage.ts:~213`) | Both snapshots frozen at game-init using identical opposing-starter-hand context; the §9 inputs are already locked + persisted. *(re-pin lines in contract)* |
| vs-L/vs-R selection | `optimalLineup.ts:166` `selectOptimalLineupForOpposingPitcher` | Picks the applicable benchmark from opposing starter's throwing hand. |
| Per-game delta derivation (game-end, both managers) | `managerWpaGameState.ts:182-184` (`gameEnded` gate) + `:189-239` (away + home) | The single per-game compute lane; called from `useGameState.ts` end-game path (completeGameInternal + endGame). **Natural home** for an additive §9 scalar. Already on the WPA boundary allowlist. |
| Per-game persistence carriers | `CompletedGameRecord` `gameStorage.ts:570` (write site `archiveCompletedGame:856`); `PersistedGameState.managerLineupDeltas` | `completedGames` keyed by `gameId`, whole-object put → **additive field = no DB bump**; `src_figma/utils/gameStorage.ts` is a pure `export *` barrel → dual-copy auto-satisfied; **registered in backup** (`backupRestore.ts:71`). |
| **WPA runtime boundary (respect, don't touch)** | `wpaRuntimeBoundary.test.ts:166-191`: allowlist includes `managerWpaGameState.ts` + `managerWpaDerivation.ts` (`:179-180`); regex matches bare `wpa:`/`.wpa=`/`wpaModelVersion:` only (`:186-187`) | camelCase `*KblWpa`/`lineupDeltaWpa`/`projectedTeamLineupKblWpa` **clear** the `\bwpa` pattern (VERIFIED); T10 writes through already-allowlisted files → **zero allowlist edits**. |
| Per-season snapshot host (precedent) | `SeasonMetadata` `seasonStorage.ts:153`; existing per-season snapshot field `gamesPerTeam` (`:162`, "season-length snapshot for WAR scaling") | Additive `optimizerConstants{Hash,Version}` field — no DB bump, travels in backup. The minimal-correct snapshot home. |
| Season-store template (only if Q3 → new store) | `franchiseSeasonLedgerStorage.ts` + `trackerDb.ts:323` (v15 store) + migration test `franchiseSeasonLedgerStorage.test.ts:97-107` | T7c's proven season-scoped store + migration-safety proof. Use only if JK rules a dedicated store over the SeasonMetadata stamp. |
| §12 constants registry (the snapshot payload) | `rosterEngineConstants.ts` (the §12 "single file" registry); optimizer also reads `ivCurves.ts` + `traitPricing.ts` + `traitInteractionMatrix.ts` (via computeIV/effectiveRatings). `tierParams.ts` is **NOT** imported by any of the 3 optimizer engines (VERIFIED) | Defines what the hash covers — scope is Q3. |

---

## 4. MISSING / BUILD (post-ruling)

1. **§9 scalar persistence** — add an additive optional field (e.g. `lineupDeltaWpa` team-level, distinct
   from the per-slot `managerWpa`) to the per-game record, sourced from
   `summarizeLineupSnapshotComparison(...).projectedOpportunityCostTotal`, written at the existing game-end
   call-sites for both managers. No DB bump; travels in backup. **Additive only** — must NOT fold into the
   `managerValue` rollup that already sums per-slot `managerWpa` (double-count risk, Q2/risk #2).
2. **§12 constants snapshot** — a `captureOptimizerConstantsSnapshot()` that produces a stable canonical
   **content hash** (+ `algorithmVersion`) over the in-scope constants, stamped once per season onto
   `SeasonMetadata` and asserted-immutable on later locks (loud warn, never silent overwrite). Scope of the
   payload + value-copy-vs-hash + storage home are Q3. No existing mechanism — greenfield.
3. **Misnomer documentation** — one-line spec note + code comment that "KblWpa" denotes rescaled IV (÷10⁷),
   not win probability. Defer any field rename to a v2 ticket (renaming touches persisted records + ~30
   readers).
4. **Golden conformance tests** — assert the persisted §9 scalar equals `EV(actual) − EV(optimizer)` from the
   frozen snapshots; assert NO change to existing `managerWpa`/`managerValue` totals; assert the season
   constants hash is stable + immutable.

---

## 5. PROPOSED SPLIT (Captain recommendation — PENDING JK)

The §13 routing row assigns T10 a single **"Codex 5.5 | high."** That is **achievable and correct IF** the
minimal-correct mechanisms are chosen (hash-stamp on `SeasonMetadata` + additive per-game field = no DB
migration). The split is therefore **contingent on the Q3 mechanism ruling**:

- **T10-PRE — JK semantics ruling (decision-only, no code).** Resolve Q1 (IV-of-effectiveRatings vs literal
  win-probability) and Q2 (pure projected-vs-projected §9 scalar vs the shipped realized-vs-projected
  hybrid). Output: a ratified §9 definition the builder/auditor hold to. **Blocking.**

- **T10 — single build ticket (RECOMMENDED), Codex 5.5 | high → Opus audit.** §9 scalar persistence (§4.1) +
  constants hash-stamp on `SeasonMetadata` (§4.2, minimal mechanism) + misnomer doc + golden tests. Stays at
  "high" because nothing touches a DB migration or the reducer compute path; reuses verified machinery.
  Cohesive: the snapshot certifies the constants that produced the scalar, so one golden test covers both.

- **(Alternative split, ONLY IF Q3 → dedicated store / read-at-compute):** carve **T10b** = season-scoped
  constants store (trackerDb v15→16 + T7c migration test + backup registration) at **Codex 5.5 | very high**
  per the §13(4) migration-safety gate, leaving **T10a** = §9 scalar wiring at high. Heavier; only if JK
  wants a separate store or compute-time enforcement.

- **FLAG (separate ticket, not T10): backup-restore hardening.** Register the 3 pre-existing v13/v14/v15
  stores in `backupRestore.ts` (bump its `'kbl-tracker'` schema to 16). Decoupled from T10 if T10 uses the
  `SeasonMetadata` stamp; still must be tracked.

Per the triangle rule, none of T10 / T10a / T10b may be audited by its own builder.

---

## 6. SCOPE QUESTIONS FOR JK (the genuine forks)

**Q1 — Is §9 "expectedValue" the IV-of-effectiveRatings objective (per D9), and is "Lineup Delta WPA" thus an
IV delta, not a win-probability delta?**
*Captain recommendation:* **YES — IV-of-effectiveRatings.** D9 is explicit and all shipped code agrees.
"WPA" is legacy branding; document the misnomer in spec + code, defer rename to v2. (If JK actually wants
literal win-probability, T10 becomes a large re-architecture touching the WPA engines — flagged, not
expected.)

**Q2 (BLOCKING) — Which number is the §9 standard: the literal pure projected-vs-projected scalar
(`summarizeLineupSnapshotComparison`, already computed, IV−IV, deterministic at lock), or the already-shipped
realized-vs-projected per-slot `managerWpa` (which mixes realized in-game WPA with projected IV)?**
*Captain recommendation:* **Adopt §9 verbatim — the pure projected-vs-projected scalar — and KEEP the existing
realized hybrid as a separate "manager realized lineup credit" metric, unchanged.** They measure two
legitimately different things (ex-ante opportunity cost vs ex-post manager credit). Persist the §9 scalar
additively; do NOT replace or fold into the existing `managerValue` rollup (avoids double-count + zero
regression on the 5 live surfaces).

**Q3 — Constants snapshot: (a) payload scope, (b) mechanism, (c) storage home.**
- **(a) Scope:** literal §12 = exports of `rosterEngineConstants.ts` (the named registry). But true benchmark
  reproducibility also needs `ivCurves` + `traitPricing` + `traitInteractionMatrix` (read by computeIV/
  effectiveRatings); `tierParams` is OUT (not imported by the optimizer, VERIFIED).
  *Captain recommendation:* **hash the full optimizer dependency set** (rosterEngineConstants optimizer
  subset + ivCurves + traitPricing + traitInteractionMatrix; tierParams excluded) — the §9 intent ("never
  silently change its constants") is about benchmark drift, and only the full set detects it. A registry-only
  hash would miss curve/trait-table drift.
- **(b) Mechanism:** content **hash + version stamp** (prove-no-change) vs full **value-copy blob**
  (re-computable history).
  *Captain recommendation:* **hash + version (prove-only) for v1.** The per-game §9 scalar is already
  persisted, so the value is recoverable from history; the snapshot only needs to certify *which* constants
  produced it. Value-copy is over-built for the last pre-D0 ticket — defer unless JK wants historical
  re-derivation.
- **(c) Home:** additive field on `SeasonMetadata` (no DB bump, travels in backup — RECOMMENDED) vs dedicated
  season store (DB v16 + migration + backup registration).
  *Captain recommendation:* **`SeasonMetadata` stamp** (mirrors the `gamesPerTeam` precedent) — keeps T10 at
  "high" and avoids the backup defect.

**Q4 — Split: single T10 build, or split out the constants snapshot?**
*Captain recommendation:* **single T10 build at "high"** if Q3 → hash-stamp-on-SeasonMetadata (cohesive,
matches the routing row). Split into T10a (high) + T10b (very-high) only if Q3 → dedicated store or
compute-time enforcement.

**Q5 (minor, can default) — does the §9 scalar persist for ALL modes (exhibition/elimination/playoff) or only
seasoned games that have a constants snapshot to audit against?**
*Captain default (proceed unless vetoed):* persist whenever an optimizer baseline is computed; stamp/require
the season constants snapshot only for games carrying a `seasonId`; for snapshot-less modes record the live
constants `version` string so the delta stays traceable.

---

## 7. TOP RISKS

- **Semantics-before-build (blocking):** wiring §9 before the Q2 ruling risks blessing the dimensionally-
  incoherent realized-vs-projected hybrid as "the standard," or silently picking the literal and contradicting
  the shipped surfaces. Must be ruled first.
- **`managerValue` double-count:** the per-slot `managerWpa` already flows into `managerValue` across 5
  surfaces (`almanacManagerWpa.test.ts` pins Tactical/Deployment/Lineup/ManagerValue distinct). Adding a
  team-level §9 scalar into that same sum double-counts. Keep it additive/audit-only.
- **Constants-snapshot under-scope:** hashing only `rosterEngineConstants` (or only the CALIBRATE divisors)
  misses `ivCurves`/`traitPricing`/`traitInteractionMatrix` drift — the §9 benchmark would silently
  re-baseline while *appearing* protected (the exact failure §9 forbids). Hash the full optimizer dependency
  set.
- **Persistence tier creep:** a dedicated season store forces DB v15→16 + the §13(4) migration-safety +
  key-scope audit at very-high effort (and inherits the backup defect). The `SeasonMetadata` stamp avoids all
  of it — pick the mechanism deliberately (Q3).
- **Backup silent-drop (pre-existing):** `backupRestore.ts` is stale at v12 and `getSchemaIssues` won't flag
  the omission. Any new season store added without backup registration silently fails the migration-safety
  gate. Use SeasonMetadata, and flag the 3 pre-existing omissions separately.
- **WPA boundary false-positive:** introducing any bare `wpa:`/`.wpa=`/`wpaModelVersion:` token in a
  NON-allowlisted file adds entries to the already-red boundary test, masking the characterized
  `franchiseAnalyticsTrust.ts` fail as if it were a T10 regression. camelCase `*Wpa` names are safe; route
  any committed write through the allowlisted `managerWpaGameState.ts`/`managerWpaDerivation.ts`.
- **Misnomer permanence:** keeping the `*KblWpa` names (recommended, for migration safety) cements a label
  that reads as win-probability but carries rescaled IV — document it loudly or every future auditor re-treads
  this analysis.
- **Lock-vs-end timing (low):** §9 says "computed at lineup-lock" but the delta record is derived at game-end
  from inputs frozen at lock (so the value is identical). Acceptable, but state it explicitly so a literal
  reading of §9 doesn't fail T10 in audit.
