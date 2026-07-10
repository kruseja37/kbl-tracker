# CONTRACT S0 — SNAKE DRAFT v1 TRANSFER AUDIT (COMPLETED)
Captain: Fable · Auditor: opus (independent, read-only) · Date: 2026-07-10
Program: spec-docs/SNAKE_DRAFT_V1_PROGRAM_2026-07-10.md · Vision: spec-docs/SNAKE_DRAFT_VISION_2026-07-10.md

**Verdict: APPROVE-WITH-NOTES.** The shared-engine layer is genuinely transferable and
largely pure — the auction's economic core lives in `src/engines/*` and `src/data/*`, not
in flow files, so snake lanes can consume it without touching frozen auction UI. Three
findings gate specific contracts, most severe first:

1. **STOP-SHIP TRAP (candidate 1):** No simultaneous multi-club seating proof exists
   anywhere in the codebase (exhaustive grep for joint-feasibility/bipartite/all-clubs-legal
   returned zero). `cheapestLegalCompletion` solves ONE roster against a shared pool; it
   never reserves players across clubs at once. Treating it as the seating proof would
   produce exactly the false-passing proof the vision names a stop-ship defect class. The
   proof is **greenfield** (S1a).
2. **CT1 DRIFT TRAP:** JK's preferred "top-3 RP + 1 CP = 4 bullpen" presentation does NOT
   match the cap table. There is no CP category. Surfacing that split in THE BOARD's
   tax-core would drift the advisory away from the settlement engine, violating the
   standing advisory≡settlement law. S3 copy must present top-N bullpen arms, no CP line.
3. **Two hidden partial-implementations** already do more than the candidates assume:
   `executeSnakePickTrade` already enforces pick-count balance + a legality rail, and
   `evaluateSnakePick` already computes the legal-finish cushion. These must be
   **adapted, not rebuilt** — but they carry POC coupling (CPU greed, jitter, rollouts)
   the vision explicitly cuts.

---

## THE TRANSFER MANIFEST
Every S-lane contract imports ONLY from the APPROVED column. `file:line` is the
consumption point.

| # | Candidate | Verdict | Value / what changes | Drift risk | Purity |
|---|-----------|---------|----------------------|------------|--------|
| 1 | `cheapestLegalCompletion` + completion math — `auctionCompletionFloor.ts:448` | **TRANSFER (as a sub-check only)** — consume as-is for the CANDIDATE-side "cheapest legal finish for one club" (the LEGAL-FINISH CUSHION). It does NOT compose into the simultaneous proof. | None for single-club use; pure & deterministic. The trap is scope creep — using it AS the seating proof. | Pure. No session/state. |
| 1b | The SIMULTANEOUS multi-club seating proof (with one-per-human dedupe) | **GREENFIELD** — new engine in S1a. May call `cheapestLegalCompletion` per club, but needs joint disjoint-assignment feasibility across all clubs + version dedupe. | The proof is the invariant that makes "no-legal-candidate" structurally impossible. A per-club-only proof is silently wrong. | New; must be pure. |
| 2 | `auctionMarginalTaxWithCaps` + `normalizeAuctionLuxuryCapsForLeagueSize` — `auctionLuxuryTax.ts:108,21` | **TRANSFER** — real club-count-normalized tax, byte-identical to settlement (already consumed by `snakeDraftPoc.ts:9,133`). The two-bills model is new consumption of the same `luxuryTax`, not a new engine. | Low — both drafts calling the SAME functions is the point. Guard: PLAN tax must call `luxuryTax(planned22)` with identical shifted caps, or the two bills diverge. | Pure. `realTeamCount` is a value arg. |
| 3 | `assembleBoard` / `boardRankOverrides` storage / `RankReorderList` — `rosterIntelligencePayload.ts:485`; `leagueBuilderStorage.ts:249`; `shared/RankReorderList.tsx:126` | **TRANSFER** — `assembleBoard` is pure; `RankReorderList` is a generic component (no auction imports); `boardRankOverrides` already schema-additive (no DB bump). `TAXONOMY_POSITIONS` (:504) matches the 22-slot board incl. SP/SP-RP/RP/CP. | Low. `worth = iv + chemistry premium` reused verbatim; the frozen-touch law lives in `sortByGmBlend(overrides)` already. | Pure engine + generic component. |
| 4 | `derivePickValueChart` + `validateTrade` — `leagueConstruction.ts:284,326` | **derivePickValueChart: TRANSFER** (pure, posted prices). **validateTrade: ADAPT** — checks value imbalance ONLY; no pick-count balance, no roster legality. The real skeleton is `executeSnakePickTrade` (`snakeDraftPoc.ts:434`): equal pick counts (:466) + `mustFillSurvives` legality rail (:469) + turn-count preservation (:508). | validateTrade alone would pass value-balanced trades that strand a club. The guide validator must wrap it with legality — and strip the CPU greed margin (:493). | Both pure. |
| 5 | POC engine `snakeDraftPoc.ts` + page `LeagueBuilderSnakeDraft.tsx` (flag-gated, `App.tsx:401`) | **SPLIT: ADAPT engine core / OBSOLETE forecast / FRESH page** — see POC inventory. | Engine pure; page flag-gated. | — |
| 6 | Scout fog (bands/grades, farm pool) — `PlayerProspectProfile` `leagueBuilderStorage.ts:279`; `LeagueBuilderScoutProfile` :299 | **TRANSFER (data model) / ADAPT (rational room on fog)** — per-scout `accuracyByPosition` + `hiredScoutIdsByTeamId` already exist. | Farm rational room must read scout-visible data only (vision R7). | Data pure. |
| 7 | Privacy reveal law — `revealedSeatTeamId` in `AuctionStage.tsx:230-266` | **ADAPT (extract, don't touch)** — the state + cover-before-paint + fail-closed render is a ~15-line self-contained block coupled to AuctionStage's VM. Extract to a new pure hook `useSeatReveal({activeSeatTeamId, lotId, revealAllowed})`; the snake room consumes the hook. **NEVER edit AuctionStage.** | Low if extracted (copied into a snake file, not imported from the auction file). | Extractable; currently coupled. |
| 8 | Per-pick session persistence — `mlbDraftSessions` store; `LeagueBuilderMlbDraftSession` `leagueBuilderStorage.ts:341` | **ADAPT (extend heavily)** — store + save/get/delete (:932, :1881, :1912) + sync/backup registration transfer. Shape is a flat single-object session (`pickOrder`, `completedPicks`, `trades`, `currentPickIndex`) — NOTHING for per-seat boards, versions retirement, correction snapshots, pause. Session model v2 = new fields on this store. | Additive extension (same pattern as `boardRankOverrides`). Extending IN PLACE avoids the new-own-DB 4-registry burden — `mlbDraftSessions` is already registered. | Storage. |
| 9 | D1 handoff — `isMlbDraftComplete` `mlbDraftCompletion.ts:49`; `commitCompletedSnakeSessionToLeagueRosters` `leagueBuilderAuctionPipeline.ts:385` | **TRANSFER (confirm delta)** — completion reads `currentPickIndex >= pickOrder.length` (:26); commit reads `completedPicks[].playerId` + `settledSalary`. A v2 session that ADDS fields stays compatible as long as `completedPicks`/`pickOrder`/`currentPickIndex` semantics are preserved. Correction/version-retirement must resolve to a final list of 22 unique IDs per team (commit throws on dupes, :400) before handoff. | Low if v2 keeps the completed-picks contract. Farm carryover (`leagueBuilderAuctionPipeline.ts:502`) unchanged. | Async storage; sequential-read caution (:33). |
| 10 | ADVISORCOLOR emission — `auctionAdvisorColorEmission.ts` + `renderValidatedAuctionAdvisorText` (`engines/auctionAdvisorColor.ts`) | **TRANSFER** — flag-gated (template fallback when off, :35), Claude call, validation rejecting invented numbers/names, template fallback on throw (:53). Payload type structurally generic. | Low — the LOG feeds its own facts; the LLM dresses ONLY the one displayed sentence (vision R2); the validator already enforces facts-only. | Pure adapter + gated emission. |
| 11 | CAPFIX rational-interest ingredients — `rosterNeed.ts` (`rosterNeedBreakdown`:148, `ownNeedMultiplier`); `auctionMarketModel.ts` (`archetypeFit`, `needMultiplier`, `estimateMarket`:372) | **ADAPT (harvest the deterministic core; drop the coin-flip layer)** — the interest formula exists: `auctionMarketModel.ts:307` `raw = iv × fit × needMultiplier × bias`; `snakeDraftPoc.ts:252` `boardValue × need × fit − λ·marginalTax`. | HIGH if consumed whole: market model carries shill/personality spread + sampling (:229, :295); POC scorer carries seeded JITTER (:276). Rational room must use LOCKED public archetypes only, no jitter, no shill. Consume `rosterNeed` + `archetypeFit`/`ownNeedMultiplier` as pure inputs; build the deterministic playout fresh. | rosterNeed pure; market model entangled with CPU-sim. |

### POC inventory (candidate 5)
- **KEEP/ADAPT:** `evaluateSnakePick` (`snakeDraftPoc.ts:106`) — composes solvency +
  completion + must-fill guard; computes `completionTaxReserve`/`completionHeadroom` =
  the LEGAL-FINISH CUSHION seed. `executeSnakePickTrade` (:434) — guide-trade validator
  with legality. `commitSnakeDraftPick` (:298), `seededSnakeShuffle` (:291, ORDER card),
  `buildSnakeOrder` (`leagueConstruction.ts:347`), `detectSnakePositionRun` (:546),
  `snakeRosterIsLegal` (:568).
- **OBSOLETE (vision cuts):** `forecastSnakeAvailability` (:348) — Monte-Carlo rollouts
  producing `survivalPct` percentages (cut list cuts percentages + rollouts; replaced by
  the deterministic rational room). `SNAKE_POC_TUNING.forecastRollouts` and
  `pickSnakeCpuCandidate` jitter (:39, :276). The POC's "solvency line" and "STEAL"
  survive as concepts, re-expressed as the two-bills model.
- **PAGE FATE: fresh page consuming the engine.** The 1076-line POC page is a single-user
  flag-gated proof with no room/ritual/companions/reveal. S1b/S2/S3 build new pages. The
  POC page survives only as PRACTICE MODE reference (program appendix 18).

---

## THE FOUR CODE-TRUTH ANSWERS

**CT1 — LUXURY_CAP_TABLES structure (`src/data/tierParams.ts:71-143`): ANSWERED.**
Three groups × per-stat rows, NOT per-player, NO CP split:
- `hitters`: 5 stats (POW/CON/SPD/FLD/ARM), each topN = 8.
- `rotation`: 7 stats, each topN = 4.
- `bullpen`: POW/CON/SPD/FLD topN = 4; VEL/JNK/ACC topN = 3.
Group membership by role (`leagueConstruction.ts:255-256`): rotation = SP + SP/RP;
bullpen = RP + CP + SP/RP. **CP counts INSIDE bullpen — no separate CP cap row.** A swing
arm (SP/RP) counts in BOTH groups. JK's preferred "top-3 RP + 1 CP" presentation does not
match the table. → **S3 tax-core copy must say "top-N bullpen arms" with NO CP line**, or
the advisory drifts from settlement.

**CT2 — Farm scout variance: PER-CLUB. ANSWERED.** `LeagueBuilderScoutProfile`
(`leagueBuilderStorage.ts:299`) carries per-scout `accuracyByPosition`, `specialties`,
`weaknesses`, `seed`, `hiredPick.teamId`; `hiredScoutIdsByTeamId` (:326) maps teams→hired
scouts; `PlayerProspectProfile` (:279) stores per-scout `scoutedGrade`/`scoutAccuracy`/
`scoutId`. → S6 farm SCOUT PRESSURE with named-player reads is PERMITTED, reading each
club's own scouting snapshot.

**CT3 — Human-identity/version linkage: DOES NOT EXIST. ANSWERED.** The stored `Player`
interface (`leagueBuilderStorage.ts:395-434`) has no versionGroupId/humanId/versionOf.
The historical converter has `mode: "career"|"peak"|"hybrid"` and source `sourceId` like
`lahman:ruthba01` + `sourceIds: { lahman: playerID }` — multiple Ruth cards share the
Lahman person key inside `sourceId`, but each generated player gets its own `id` with no
back-link. → **S1a builds a `versionGroupId` shim** (derive from `sourceId`'s person key;
natural-duplicate names get a disambiguating chip per vision v5.1 §4). Build the seam to
a real field only if the legends thread lands one first.

**CT4 — Team identity storage + logo feasibility: ANSWERED, EASY.** The `Team` interface
has `colors: { primary, secondary, accent? }` + `logoUrl?: string`
(`leagueBuilderStorage.ts:204-209`); league-builder source path maps
`primaryColor`/`secondaryColor` (:2360). A `logoUrl?` field already exists — no schema
surgery. **Size discipline:** store as a client-resized data-URI: resize to ≤128×128 px,
re-encode PNG/WebP, hard-cap ~32 KB (≈43 KB stored). Keeps 8-20 logos well under 1 MB in
IndexedDB and under the sync path's per-record ceiling (same `syncEngine.upsert` route as
draft sessions, `leagueBuilderStorage.ts:1902`). Reject over-cap files client-side before
write; never store the original.

---

## GREENFIELD BUILDS (vision needs, no existing implementation)
1. The simultaneous multi-club seating proof (S1a) — joint disjoint-assignment
   feasibility with one-per-human dedupe (COUNT-HUMANS-NOT-CARDS).
2. The deterministic rational room (S1a) — rational playout + risk-read-matches-playout
   invariant + 8-club validation harness. POC rollout/jitter forecaster is cut.
3. The two-bills quantities as first-class engine outputs (S1a) — PLAN COST/TAX/CUSHION
   vs LEGAL-FINISH CUSHION (the POC conflates them into one guard).
4. Session model v2 extensions (S1a) — per-seat boards, version-retirement state,
   correction snapshots, pause/resume — NEW fields on `mlbDraftSessions`.
5. The guide-package validator with balancing return picks (S4) — `executeSnakePickTrade`
   has the skeleton but is fused to the CPU greed model; the human-vs-human search for a
   legal balancing package is new.
6. `versionGroupId` shim + one-per-human dedupe across seating proof, supply, scarcity,
   rational room (S1a) — per CT3.
7. Extracted `useSeatReveal` hook (S2/S5) — copy AuctionStage reveal logic into a new
   pure hook; do not import from or edit the auction file.

**Auction preservation confirmed:** every shared engine consumed lives in `src/engines/*`
/ `src/data/*` (pure, not flow files). The only auction component touched (candidate 7)
is handled by extraction, not modification. 28 auction test files stand as the
preservation gate.

**Not independently run:** no tsc/build/vitest (S0 is read-only inventory, no diff to
gate). Every claim is file:line-grounded; the seating-proof absence is proven by
exhaustive grep returning zero; the CT1 CP finding is proven by the role filter at
`leagueConstruction.ts:256`.
