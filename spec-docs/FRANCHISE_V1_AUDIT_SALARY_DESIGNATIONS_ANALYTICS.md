# Franchise v1 Audit: Salary, Designations, WPA/WAR, Adaptive Standards, and Park Factors

**Status:** Repo-first implementation audit  
**Created:** 2026-05-27  
**Scope:** Documentation-only audit for v1 calculation/value systems. No app code or tests are changed by this document.

## Executive summary

The repo has meaningful foundations for most systems in this audit, but the v1 stability story is uneven.

Strongest evidence:

- **Salary calculation engine exists** and matches the updated salary spec at the formula/component level: ratings, position, traits, age, performance, fame, personality, pitcher batting bonus, DH context, and true-value concepts are represented in `src/engines/salaryCalculator.ts`.
- **Mode 3 ratings/salary recalculation adapter exists** and writes franchise-owned `overallGrade` and `salary` only during the guarded ratings-adjustment phase.
- **WPA/LI/Clutch and manager WPA are the most mature analytics here.** Event fields, GameTracker calculation, Game Detail audit surfaces, manager overlays, and Manager Almanac aggregation all have repo evidence.
- **WAR component calculators and storage fields exist** for bWAR, pWAR, fWAR, and rWAR, and the WAR orchestrator can persist component values into season batting/pitching stats.
- **Park/stadium name propagation exists** from franchise/team context into GameTracker/archive/event context, and seed dimension data exists for SMB4 parks.

Main stability gaps:

- **Dynamic designations are required v1 but not franchise-complete.** Engines exist for Team MVP/Ace and Fan Favorite/Albatross, but canonical franchise designation storage is explicitly deferred, projected/locked/carryover UI is incomplete or unknown, and Captain/Fan Hopeful persistence is not proven.
- **WAR is not yet trustworthy enough as a fully approved v1 value backbone without a dedicated calibration/persistence pass.** Component engines exist, but park-adjusted labels, adaptive standards, league/park context, and season-summary handoff are partial.
- **Adaptive standards are required infrastructure, but the repo has two different meanings of "adaptive": fielding inference learning and league calibration. The threshold-scaling consumer story is not proven.**
- **Park factors are partial.** Seed derivation exists from SMB4 park dimensions, but the current `ParkFactors` type is narrower than the Mode 2/stadium specs, Team Hub stadium analytics are empty-state UI, and season-summary park/adaptive persistence is explicitly placeholder.
- **Luxury tax must remain out.** The stability cut list excludes luxury tax logic; any old League Builder luxury-tax references are legacy/spec drift, not v1 target behavior.

## Salary findings

### Required v1 contract

Mode 1 must initialize salaries/payroll at roster finalization. The Mode 1 worksheet says salary is part of player handoff and salary ledger initialization, and user notes require a stable salary/payroll baseline from the approved salary model while deferring advanced salary consequences/evolution unless already stable (`spec-docs/MODE_1_V1_RECONCILIATION_AND_DECISION_WORKSHEET.md:247`, `:260`, `:472`, `:485`).

Mode 2 must display and use that baseline for payroll/value inputs needed by dynamic designations. The Mode 2 worksheet says the salary system must be stable for v1, aligned to `SALARY_SYSTEM_SPEC_UPDATED.md`, and must not include luxury tax (`spec-docs/MODE_2_V1_RECONCILIATION_AND_DECISION_WORKSHEET.md:498`, `:517`).

The stability principles allow salary as deterministic v1 automation and explicitly cut salary-matching enforcement for trades (`spec-docs/FRANCHISE_V1_STABILITY_PRINCIPLES_AND_CUT_LIST.md:37`, `:56`). No luxury tax is listed among v1 automation, and the user constraint for this audit explicitly excludes luxury tax.

### Repo evidence

- `src/engines/salaryCalculator.ts` documents the same major components as the updated salary spec: ratings, position, traits, age, performance, fame, personality, and DH context (`src/engines/salaryCalculator.ts:1`).
- The engine defines the salary input model and `SeasonStatsForSalary` with WAR inputs, matching the spec's performance/value dependency (`src/engines/salaryCalculator.ts:79`, `:93`).
- The engine implements the 3:3:2:1:1 position-player weights and 1:1:1 pitcher weights (`src/engines/salaryCalculator.ts:194`, `:206`), consistent with `SALARY_SYSTEM_SPEC_UPDATED.md` (`spec-docs/SALARY_SYSTEM_SPEC_UPDATED.md:57`, `:90`).
- The engine implements position multipliers (`src/engines/salaryCalculator.ts:216`) and pitcher batting/two-way logic (`src/engines/salaryCalculator.ts:480`, `:520`, `:537`).
- `src/utils/franchiseRatingsSalaryAdapter.ts` builds salary proposals from franchise-owned players using `calculateSalary` (`src/utils/franchiseRatingsSalaryAdapter.ts:169`, `:206`) and writes only `overallGrade` and `salary` back to franchise player storage (`src/utils/franchiseRatingsSalaryAdapter.ts:329`, `:392`).
- The adapter is explicitly scoped to the `RATINGS_ADJUSTMENTS` offseason phase (`src/utils/franchiseRatingsSalaryAdapter.ts:287`) and its method states raw ratings are unchanged (`src/utils/franchiseRatingsSalaryAdapter.ts:341`).
- Team Hub roster rows display contract/salary, but `trueValue` and `netDiff` remain placeholders (`src/src_figma/app/components/TeamHubContent.tsx:176`, `:186`, `:1036`, `:1060`).

### Alignment notes

- The salary engine appears aligned with the updated formula components, but Mode 1 roster-finalization salary calculation is not directly proven by the inspected code. The proven writer is the Mode 3/offseason adapter, not the Mode 1 setup finalizer.
- True Value is spec-required for Fan Favorite/Albatross and salary/value decisions (`spec-docs/SALARY_SYSTEM_SPEC_UPDATED.md:516`, `:624`), but franchise UI currently shows `trueValue` and `netDiff` as placeholders. Treat true value as partially implemented until a franchise-owned, WAR-backed true-value calculation is wired and tested.
- Do not add luxury tax. Old `LEAGUE_BUILDER_SPEC.md` references to luxury tax are legacy drift and conflict with current audit constraints and v1 stability direction.

## Dynamic designation findings

### Required v1 contract

Mode 2 designations are required v1. The canonical Mode 2 spec defines seven named designation families:

- Team MVP
- Ace
- Fan Favorite
- Albatross
- Cornerstone
- Team Captain
- Fan Hopeful

Performance-based designations recalculate after every completed game as projected badges and lock at season end (`spec-docs/MODE_2_V1_FINAL.md:2273`, `:2277`). MVP uses highest total WAR, Ace uses highest pWAR, Fan Favorite and Albatross use True Value minus Contract, Cornerstone carries from prior MVP, Captain is season-start hidden-modifier logic, and Fan Hopeful is a top-farm-prospect narrative designation (`spec-docs/MODE_2_V1_FINAL.md:2279`, `:2288`, `:2298`, `:2307`, `:2317`, `:2326`, `:2337`).

The Mode 2 worksheet confirms dynamic designations are required v1, but says upstream inputs must be stabilized first: performance inputs, salary/value, WAR/WPA usage, morale/relationship dependencies where applicable, and persistence/carryover behavior (`spec-docs/MODE_2_V1_RECONCILIATION_AND_DECISION_WORKSHEET.md:456`, `:475`).

### Repo evidence

- Team MVP/Ace detection exists in `src/utils/teamMVP.ts`. MVP detection groups players by team and chooses highest `totalWAR` (`src/utils/teamMVP.ts:222`, `:247`). Ace detection groups pitchers by team and chooses highest pWAR above a 0.5 minimum (`src/utils/teamMVP.ts:333`, `:364`, `:369`).
- Fan Favorite/Albatross detection exists in `src/engines/fanFavoriteEngine.ts`, with projected/locked status based on season progress and inputs for salary, WAR, true value, value delta, and games played (`src/engines/fanFavoriteEngine.ts:1`, `:19`, `:47`, `:145`, `:193`).
- Canonical franchise designation storage is explicitly deferred in the save-slot manifest: the domain is acknowledged, but concrete v1 storage is not implemented (`src/utils/franchiseSaveSlotManifest.ts:671`, `:682`).
- The repo inventory also classifies awards/leaders/designations as mixed and says some regular-season award race arrays are empty (`spec-docs/FRANCHISE_REPO_IMPLEMENTATION_INVENTORY.md:118`).

### Drift and unknowns

- Fan Favorite/Albatross has a direct spec/code drift: Mode 2 says Albatross trade discount is 15% (`spec-docs/MODE_2_V1_FINAL.md:2309`, `:2314`), while `fanFavoriteEngine` still defines `ALBATROSS_DISCOUNT: 0.70`, a 30% discount (`src/engines/fanFavoriteEngine.ts:121`, `:124`). This should not ship as-is.
- Captain and Fan Hopeful persistence/assignment are unknown from the inspected code. Preserve as required v1 gaps rather than marking complete.
- Projected/locked badges and notifications are not proven in active franchise surfaces.
- Carryover behavior is partially represented for Fan Favorite/Albatross in the engine, but durable franchise carryover storage is not proven.
- WPA should not silently replace WAR/value designation inputs. The worksheet asks for a dedicated salary/designation input review to decide whether WPA augments any designation inputs (`spec-docs/MODE_2_V1_RECONCILIATION_AND_DECISION_WORKSHEET.md:475`).

## WPA/Manager Moments findings

### Required v1 contract

Mode 2 defines LI as situation importance and WPA as realized win-probability change. WPA is stored on every AtBatEvent and used for Player of the Game, top moments, and clutch attribution (`spec-docs/MODE_2_V1_FINAL.md:1594`, `:1669`, `:1675`).

Clutch is explicitly WPA-based: LI and WPA are complementary, not redundant, and clutch stats include total WPA, positive WPA, negative WPA, clutch moments, choke moments, total LI, and gmLI (`spec-docs/MODE_2_V1_FINAL.md:1680`, `:1687`, `:1696`, `:1790`).

Manager Moments are high-leverage decision points and should remain distinct from player WAR. The Mode 2 worksheet says to replace old mWAR wording with Manager Moments/WPA unless a separate mWAR metric is redefined (`spec-docs/MODE_2_V1_RECONCILIATION_AND_DECISION_WORKSHEET.md:288`, `:307`, `:309`, `:328`).

### Repo evidence

- `src/utils/eventLog.ts` has at-bat fields for leverage index, win probability before/after, WPA, model version, and clutch flag (`src/utils/eventLog.ts:238`, `:245`, `:266`).
- `eventLog` also models manager moment and recommendation event types (`src/utils/eventLog.ts:465`, `:637`).
- `src/src_figma/hooks/useGameState.ts` calculates LI/WPA during GameTracker actions and marks clutch by LI threshold (`src/src_figma/hooks/useGameState.ts:6284`, `:6305`, `:6403`, `:6407`).
- `useGameState` persists stadium name and manager decision state into completed game/archive structures (`src/src_figma/hooks/useGameState.ts:10972`, `:11005`, `:11041`).
- Game Detail exposes WPA audit, KBL WPA leaderboard, play audit, play log, clutch moments, notable events, and win probability chart (`src/src_figma/app/pages/GameDetail.tsx:1056`, `:1099`, `:1187`, `:1245`, `:1273`, `:1301`).
- Manager Almanac displays Manager WPA/manager value leaderboards, tactical manager WPA, deployment WPA, lineup delta details, best/worst decisions, and committed manager records (`src/src_figma/app/pages/ManagerAlmanac.tsx:137`, `:235`, `:250`, `:301`, `:527`, `:557`).
- The repo inventory classifies WPA/LI/clutch and manager WPA/manager value as implemented and wired with tests (`spec-docs/FRANCHISE_REPO_IMPLEMENTATION_INVENTORY.md:63`, `:64`, `:97`, `:98`, `:171`, `:172`).

### Audit conclusion

Player WPA, manager WPA/Manager Moments, LI, and Clutch are v1-ready candidates if labels remain precise:

- Do not collapse WPA into WAR.
- Do not call manager WPA "mWAR" unless a separate mWAR metric is explicitly redefined, scoped, persisted, and reconciled.
- Carry relevant WPA/manager outputs into Mode 3 summaries only after the season-summary payload has explicit fields for them. The current Mode 2 to Mode 3 summary interface lists many derived outputs generally, but the inspected persisted summary has placeholders for several derived domains.

## WAR/adaptive standards findings

### Required v1 contract

The canonical Mode 2 spec keeps all five WAR components in scope: bWAR, pWAR, fWAR, rWAR, and mWAR, while deferring multi-season WAR calibration (`spec-docs/MODE_2_V1_FINAL.md:1454`, `:1456`). It defines bWAR, pWAR, fWAR, rWAR, and mWAR formulas (`spec-docs/MODE_2_V1_FINAL.md:1470`, `:1496`, `:1523`, `:1543`, `:1557`).

However, the reconciliation worksheet changes the implementation stance: split old WAR/mWAR into player/manager WPA analytics and player WAR components. WAR components may remain v1 only if scoped, persisted, calibrated, and explained enough for internal trust; otherwise they should be preview/experimental (`spec-docs/MODE_2_V1_RECONCILIATION_AND_DECISION_WORKSHEET.md:307`).

Adaptive standards are required infrastructure for systems that need season length, innings, league context, park context, or sample-size adjustment, including WAR/value, awards, designations, milestones, and salary inputs (`spec-docs/MODE_2_V1_RECONCILIATION_AND_DECISION_WORKSHEET.md:687`, `:706`). The Mode 2 spec defines opportunity factor, scaling rules, SMB4 defaults, qualification thresholds, floors, and position-specific adjustments (`spec-docs/MODE_2_V1_FINAL.md:2963`, `:2967`, `:3001`, `:3014`, `:3032`, `:3045`, `:3058`).

### Repo evidence

- WAR types define season lengths, SMB4 baselines, league context, confidence, and park-factor-related types (`src/types/war.ts:12`, `:47`, `:168`, `:592`).
- `src/src_figma/app/engines/warOrchestrator.ts` can calculate and persist bWAR, rWAR, fWAR, pWAR, and total WAR from season storage after games (`src/src_figma/app/engines/warOrchestrator.ts:1`, `:160`, `:206`, `:287`, `:332`).
- `src/utils/seasonStorage.ts` includes season stat fields for bWAR, rWAR, fWAR, totalWar, and pWAR (`src/utils/seasonStorage.ts:69`, `:119`).
- bWAR has explicit park-factor helper functions and imports the park factor deriver (`src/engines/bwarCalculator.ts:1`, `:23`, `:102`, `:129`, `:143`).
- The app-level WAR hook builds leaderboards for bWAR, pWAR, fWAR, rWAR, and total WAR (`src/hooks/useWARCalculations.ts:426`, `:474`).
- Calibration service exists for league context/linear weights/replacement level and has IndexedDB-oriented state types (`src/engines/calibrationService.ts:1`, `:83`, `:107`, `:201`).
- A separate `adaptiveLearningEngine` exists, but it is fielding inference learning, not the Mode 2 threshold-scaling engine (`src/engines/adaptiveLearningEngine.ts:1`, `:5`, `:118`).
- The repo inventory says adaptive standards are implemented engine/reference but franchise summary persistence is placeholder, with no direct franchise wiring test found (`spec-docs/FRANCHISE_REPO_IMPLEMENTATION_INVENTORY.md:117`, `:181`, `:182`, `:208`).

### Audit conclusion

WAR should be treated as **partial/conditional v1**, not a fully stable value backbone yet.

Trust level by component:

- **bWAR:** Engine exists and includes park-factor hooks. Trust is medium for calculation presence, lower for franchise park-adjusted labeling/persistence.
- **pWAR:** Engine and season field exist. Trust is medium; park adjustments and leverage usage should be audited against Mode 2 formulas before using for designations/salary.
- **fWAR:** Engine exists and the orchestrator uses persisted fielding events. Trust is medium-low because fielding enrichment/chance boundaries are sensitive to user inputs and recent dirty-worktree changes.
- **rWAR:** Engine exists and is included in orchestration. Trust is medium-low until baserunning opportunity capture and GameTracker runner outcomes are audited against v1 rules.
- **mWAR:** Do not keep old mWAR wording as a v1 claim. Manager WPA/Manager Moments are proven separately. A separate mWAR metric would need a new explicit definition, persistence model, UI label, and reconciliation.

Adaptive standards should be audited as consumer-specific infrastructure. Do not expose them as a standalone feature unless a stable UI exists. The immediate v1 need is making sure season length, innings, league context, sample size, and park context are used consistently by WAR/value/designations/awards/milestones/salary where approved.

## Stadium/park-factor findings

### Required v1 contract

Mode 1 must include stadium as team identity because park factors feed Mode 2 stat tracking (`spec-docs/MODE_1_V1_RECONCILIATION_AND_DECISION_WORKSHEET.md:142`, `:155`). The Mode 1 handoff should include stadium/park-factor inputs (`spec-docs/MODE_1_V1_RECONCILIATION_AND_DECISION_WORKSHEET.md:580`).

Mode 2 must preserve stadium/park-factor inputs and use them in approved park-adjusted stats, WAR/value, salary, or designation calculations. Labels must state whether calculations are park-adjusted or unadjusted (`spec-docs/MODE_2_V1_RECONCILIATION_AND_DECISION_WORKSHEET.md:477`, `:496`).

The park factor seed spec says park factors are seeded from BillyYank/SMB4 stadium data and activate after 40% of the season (`spec-docs/PARK_FACTOR_SEED_SPEC.md:9`, `:13`, `:17`, `:32`, `:96`, `:109`). The stadium analytics spec requires park factors, spray charts, stadium records, WAR adjustments, data storage, UI indicators, and historical tracking (`spec-docs/STADIUM_ANALYTICS_SPEC.md:25`, `:56`, `:173`, `:381`, `:553`, `:746`, `:1029`, `:1147`).

The canonical Mode 2 spec keeps full ParkFactors interface, confidence blending, seed factors, spray chart, stadium records, and WAR integration, with exit velocity deferred (`spec-docs/MODE_2_V1_FINAL.md:3079`, `:3081`).

### Repo evidence

- SMB4 park data exists in `src/data/smb4-parks.json` and `src/data/smb4-park-dimensions.json`.
- `src/data/parkLookup.ts` loads park dimensions by name and exposes park lookup/name helpers (`src/data/parkLookup.ts:1`, `:15`, `:26`, `:30`).
- `src/engines/parkFactorDeriver.ts` derives LOW-confidence seed-like park factors from LF/CF/RF distance and wall height (`src/engines/parkFactorDeriver.ts:1`, `:18`, `:62`, `:83`).
- The deriver explicitly says directional factors are future work and currently collapse directional data into aggregate factors (`src/engines/parkFactorDeriver.ts:67`).
- The current `ParkFactors` type is narrower than the canonical Mode 2 interface: it has overall/runs/homeRuns/handedness AVG/HR/confidence, but no doubles, triples, strikeouts, walks, directionFactors, gamesIncluded, or source (`src/types/war.ts:592`; compare `spec-docs/MODE_2_V1_FINAL.md:3084`).
- Team Hub has a stadium tab, but it explicitly states fan morale, stadium park factors, and manager tracking are not implemented and the stadium tab is an empty state (`src/src_figma/app/components/TeamHubContent.tsx:609`, `:1247`, `:1266`).
- GameTracker persists stadium name and event `parkContext`, but uses stadium name as ID because no separate stadiumId system exists yet (`src/src_figma/hooks/useGameState.ts:3992`, `:3994`).
- Franchise season summaries explicitly do not persist park factors/adaptive-standard summaries yet (`src/utils/franchiseSeasonSummaryStorage.ts:296`, `:300`).
- The repo inventory classifies park/stadium name propagation as implemented, but park factor analytics as engine-only with franchise summary/UI persistence placeholder (`spec-docs/FRANCHISE_REPO_IMPLEMENTATION_INVENTORY.md:113`, `:114`, `:218`).

### Audit conclusion

Park factors/stadium analytics are **partial v1 infrastructure**:

- Stadium names and basic SMB4 park dimension lookup are present.
- Seed derivation exists but is narrower than the spec.
- Dynamic/blended park factors, activation threshold, gamesIncluded/source/confidence metadata, spray chart stadium metrics, stadium records, historical snapshots, and Team Hub analytics are not proven complete.
- Any UI or value calculation must label values clearly as `park-adjusted`, `unadjusted`, `seed`, `calculated`, or `blended` once those states exist. Current unadjusted/placeholder surfaces should not imply park-adjusted trust.

## Blockers for v1 stability

1. **Mode 1 salary initialization proof.** The repo proves salary engines and an offseason recalculation adapter, but not the exact Mode 1 roster-finalization salary/payroll ledger initialization path.
2. **Canonical designation storage.** `franchiseSaveSlotManifest` explicitly marks designations as deferred; required v1 designations need franchise-scoped storage, projection/lock state, carryover, and season handoff.
3. **Designation input contract.** WAR, True Value, WPA augmentation, morale/relationship effects, Captain hidden modifiers, and Fan Hopeful farm inputs need a frozen contract before designations can be v1-complete.
4. **Fan Favorite/Albatross spec drift.** Current code uses a 30% Albatross trade discount while Mode 2 says 15%.
5. **True Value implementation gap.** Team Hub displays placeholders for true value/net diff; Fan Favorite/Albatross require real position-relative true value.
6. **WAR trust boundary.** WAR components exist, but park-adjusted labels, season/innings scaling, league calibration, and component-specific persistence/consumer trust need a dedicated pass.
7. **Old mWAR terminology.** Manager WPA is strong; old mWAR wording should be removed from v1 labels unless a separate metric is explicitly redefined.
8. **Adaptive standards consumer wiring.** Threshold scaling is required, but consumers need auditing one by one.
9. **Park factor persistence/UI.** Park factor analytics and adaptive-standard summaries are placeholders in franchise season summaries, and Team Hub stadium analytics are empty-state UI.
10. **ParkFactors type mismatch.** Current type and deriver do not match the full Mode 2/stadium specs.
11. **Spray-chart stadium metrics unknown.** GameTracker has field location/spray data concepts, but stadium-linked spray analytics and records are not proven as franchise-complete.

## Non-blocking gaps

- Salary display can remain read-only in Mode 2 while salary/value consequences are stabilized.
- Dynamic fan morale/player morale effects from salary/designations can be deferred if baseline fields and audit trails remain clear.
- Multi-season calibration can remain deferred per Mode 2 v1 scope, as long as Season 1 defaults and labels are honest.
- Stadium records and historical factor snapshots can be staged after basic seed/adjusted label correctness.
- Awards/watchlists can consume stable leaders/WPA later, but should not finalize from incomplete WAR/value/designation inputs.
- Full dynamic park-factor calculation from observed KBL game results can follow the seed-factor implementation if v1 labels keep seed vs calculated distinction.

## Recommended next implementation slices

1. **Salary baseline slice:** prove or add Mode 1 roster-finalization salary/payroll initialization using `calculateSalary`; persist franchise-owned salary fields/ledger; exclude luxury tax.
2. **True Value slice:** implement position-relative true value/value delta from franchise-owned salary + WAR data; replace Team Hub placeholders with labeled values only when inputs are trusted.
3. **Designation storage slice:** add canonical franchise designation records with `franchiseId`, `seasonId`, `teamId`, `playerId`, `type`, `status`, `sourceInputs`, `calculationVersion`, `lockedAt`, and carryover metadata.
4. **Projected designation slice:** recalculate projected MVP/Ace/Fan Favorite/Albatross after completed games, with badges that explicitly say projected and no locked effects until season end.
5. **Season-end designation slice:** lock MVP/Ace/Fan Favorite/Albatross; award Cornerstone; initialize next-season carryovers; write Mode 2 to Mode 3 handoff.
6. **Captain/Fan Hopeful slice:** implement season-start assignment from hidden modifiers/farm inputs with audit-friendly source metadata and no hidden numeric exposure.
7. **WPA handoff slice:** keep player WPA, manager WPA, LI, Clutch, and Manager Moments distinct from WAR; add season-summary fields only for proven outputs.
8. **WAR trust slice:** audit bWAR/pWAR/fWAR/rWAR formulas, season storage, park adjustment use, and UI labels; mark preview/experimental until complete.
9. **Adaptive consumer slice:** inventory every threshold consumer and apply season length/innings/sample-size/league/park context only where needed.
10. **Park factor seed slice:** expand `ParkFactors` to the canonical interface, load SMB4 seed data with source/confidence/games metadata, and label all values as seed/unadjusted until activation.
11. **Stadium analytics slice:** connect stadium IDs to teams/games/events, then build Team Hub/stadium views for park factors, spray-zone metrics, and records.

## Focused tests to run or add later

- Mode 1 roster finalization calculates salary for every copied franchise player and initializes team payroll/ledger with no luxury-tax fields.
- Mode 2 Team Hub displays contract salary from franchise-owned player records and does not show True Value/Net Diff until real value inputs exist.
- True Value calculates position-relative peer pools, small-pool merges, value delta, and bargain/overpaid flags from franchise-owned WAR and salary.
- Fan Favorite/Albatross use the approved True Value contract, 10% season/minimum game thresholds, and the current 15% Albatross trade discount.
- Designations persist projected and locked states with franchise/season/team/player scope and survive reload.
- Carryover behavior keeps Fan Favorite/Albatross until 10% of the next season and Cornerstone while the player remains on team.
- Captain selection uses hidden Loyalty + Charisma with documented tie-breakers and does not reveal hidden numeric modifiers.
- Fan Hopeful selection uses top farm prospects and persists source inputs.
- WPA/LI/Clutch fields persist on every completed AtBatEvent and Game Detail recomputes/audits without mutating stored outcomes.
- Manager Moments/manager WPA persist and aggregate by franchise/season/manager without being labeled WAR.
- bWAR/pWAR/fWAR/rWAR are persisted after completed franchise games and use season length/innings context consistently.
- WAR surfaces label preview/unadjusted/park-adjusted states correctly.
- Adaptive thresholds scale counting stats, PA/IP qualification, and career WAR thresholds but not rate stats or season WAR thresholds.
- Park factor seed data maps every SMB4 stadium to a stable stadium ID/name and canonical ParkFactors fields.
- Park factors remain inactive before 40% season completion unless explicitly labeled seed-only.
- Park-adjusted stats/WAR adjust home stats only and leave road stats unadjusted as specified.
- Spray-chart events are linked to stadium/game/player/handedness/zone and can produce stadium metrics without fabricated exit velocity.
- Franchise season summary includes park factors/adaptive/designations/WPA/WAR only when the upstream system is approved and proven.
