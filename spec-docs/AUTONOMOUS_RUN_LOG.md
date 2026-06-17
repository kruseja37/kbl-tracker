# AUTONOMOUS RUN LOG

**Run started:** 2026-06-16. Captain (Opus 4.8) driving the autonomous build→audit→commit loop per
`AUTONOMOUS_RUN_PROTOCOL.md`. JK away; reads this top-to-bottom on return.

> **Format:** newest entries at the BOTTOM of the "Ticket log" section. Each ticket: STATUS (COMMITTED /
> BUILT-NOT-COMMITTED / SET-ASIDE / HALTED), what changed, the audit verdict, and any open decision for JK.

---

## SESSION SUMMARY (TL;DR on return)

**Committed — 7 feature tickets + D5 confirm, all VERIFIED via the Codex-build / Opus-audit triangle
(`codex/franchise-v1-next`, nothing pushed):**
- `d48ab3c` **L1** — hidden-modifier rename (loyalty/ambition/resilience/charisma) + typed on `Player`.
- `752882f` **D1** — `useSeasonStats` 162 hardcode → canonical `MLB_BASELINE_GAMES` (zero behavior change).
- `2fab709` **D2** — backup parity: 3 franchise stores + pin 12→15 + a structural parity-guard (silent-drop defect closed).
- `2f4f3e5` **L1.5 + OD-1** — backfill the 4 hidden modifiers for all franchise players at init + assign Team
  Captains. 21 unit + 33 integration tests. (Also browser-verified in the real runtime — see BROWSER PRE-CHECK.)
- `0cf4ca2` **L4a-connect** — franchise reporter wired (auto-assign + post-game-columns + BeatReporterNews reads
  live GameStory). **Browser-pending** (reporter text is Supabase-dependent).
- `8074976` **L4a-bus** — the SEA-1 season-long narrative publish-bus core (SeasonNewsItem store + emission config
  + `generateSeasonNewsTake`). Build-dark; §5-firewall-correct; parity-guard green.
- `4a1bd36` **D6a** — the make-or-break True-Value TRUST gate, live half: peer-pool audit (≥2 hard-block) +
  the live trusted-value artifact + the 4 flag-flips to computed. RIGOROUSLY audited; oracle untouched; real
  no-leak boundary test. **JK ruled season-end-freeze** (D6b adds the freeze).
- **D5 CONFIRMED** (confirm-only) — TEAM_MVP/ACE `warConsumerTrust` trust engine green (51 tests).

**Process arc this session:** my first wrap was too conservative (set aside OD-1, an obvious default) → JK flagged
it → recalibrated and built OD-1/L1.5/L4a-connect → JK batched browser verification ("keep rolling") → built
L4a-bus → JK directed "D-stack to the value gate" → D5 confirmed + D6 mapped + ruled + D6a built. The
Codex-builds / Opus-audits triangle held throughout (every diff independently re-verified: tsc/tests re-run,
substance read, invariants grep'd — never trusted from the builder paste).

**⏰ OVERNIGHT MODE AUTHORIZED (AUTH-4, JK 2026-06-16) — a fresh thread KEEPS ROLLING, no stoppages.** This session
hit a clean milestone at D6a (the value-gate's live half, rigorously audited). JK then authorized AUTH-4: an
unattended/overnight run where the Captain makes **every** call (engineering AND spec-bounded design, incl. the
soul-layer + value-design forks) by building to the ratified spec + rulings, taking a documented conservative
default where the spec is silent, and CONTINUING — the run NEVER stops for JK; the only pause is
SET-ASIDE-AND-CONTINUE on a genuine safety wall. **A fresh thread resumes from a clean context AND runs under
AUTH-4** (see `AUTONOMOUS_RUN_PROTOCOL.md` AUTH-4 + the Queue, and the CURRENT_STATE ⏰ bullet). Everything's
captured in PROMPT_CONTRACTS.md + this log + the D6 decisions, so it resumes cleanly.

**NEXT (overnight, in order):** **D6b** (season-end freeze) → **D7** (designations live incl. Albatross) → **D8**
(award-trust) → **D9** (awards w/ LSD-1 seams + MOY-1..7) → **D10–D13** → the **soul layer** (L3 morale matrix → L6
fame → L7 effects → L8/L9b → L10–L14 → L-SIM gate; L2 with its first consumer). **Take the OD-3/4/5 leans +
continue.** **SET ASIDE (the one safety wall): L-ECON1** (frozen-draft-IV re-price → oracle touch) + F-144. The
**D4** scope snag: take the conservative call or leave for the browser session — log it either way.
**Browser backlog (batched, JK morning):** L1.5 captain + L4a reporter (Supabase) on real franchise data.

---

## OPEN DECISIONS FOR JK (read these first)

> **✅ OD-1..5 + the D4 snag ALL RESOLVED.** OD-1 resolved 2026-06-16 (inline below). **OD-2, OD-3, OD-4, OD-5 + D4
> ruled by JK in the attended 2026-06-17 session — full rulings in `DECISIONS_LOG.md` (2026-06-17 entry).** Highlights:
> OD-2 = new-league-construction-only, reuse pick-chart with farm anchor nerfed one grade-step via `FARM_NERF_SCALES`,
> scale raw IVs pre-chart (oracle untouched; build stays safety-walled) — and a Captain conflation corrected (IV≠TV;
> OD-2 never touches performance-based True Value). OD-3 = async/plain-text/game-count/season-scoped. OD-4 = cascade;
> manager+reporter on team-edit page, scouts DRAFTED front-loaded before the 22-man (cosmetic draft-guide
> attribution), reflected on team page. OD-5 = manual/opt-in + REQUIRES optional GameTracker zone inputs; cumulative
> injury tally. D4 = moot post-D6, folded into D11. The OD-2..5 text below is retained as the original fork context.

- **OD-1 (HIGH — blocks L1.5 + the morale/development layer for MLB players) — How do imported MLB players
  acquire the 4 hidden modifiers?** Verified in code: `hiddenPersonalityModifiers` (loyalty/ambition/resilience/
  charisma) is assigned ONLY in `prospectScoutingDraftEngine.ts` (the prospect/farm path). The **22-man MLB pool
  players** (imported from `playerDatabase` via `leagueConstruction`) carry it as **`undefined`**. Consequences:
  L1.5 Captain selection (searches MLB players for highest Loyalty+Charisma) finds nothing → null captains; and
  L3 morale / L5 dampener / L8 ratings / L9b traits have no modifier data for MLB players. **This is a foundational
  gap, not just an L1.5 detail.** Options: **(a)** deterministically generate the 4 modifiers for every player at
  pool-registration/import using the same `clamp(50 + normal(seed)*20, 0, 100)` distribution the prospect path
  uses — simplest, spec-consistent, *Captain lean*; **(b)** derive them from the visible personality + ratings (so
  recognizable players get characterful modifiers); **(c)** add them to the `playerDatabase` SOT (touches a
  protected source-of-truth). This touches the SMB4 personality asset + possibly the SOT → flagged for your ruling
  rather than defaulted. **L1.5 is SET ASIDE until you rule OD-1.** (Once ruled, OD-1 itself is a small build, then
  L1.5 follows.)
  **→ RESOLVED 2026-06-16 (built with default (a), commit below):** modifiers generated at franchise-init,
  seeded by `player.id`, same distribution as prospects, no SOT touch; L1.5 Captain assignment shipped on top.
  Override the distribution on return if you'd prefer (b) derive-from-personality or (c) SOT.

- **OD-2 (MED — L-ECON1 salary scale) — sequencing + taper + frozen-anchor scope.** DSF-1 re-prices the same
  `computeIV` curve-block the frozen draft-IV baseline + D4 salary + D6 trusted-value read. Decisions: **(i)**
  scope L-ECON1 to **new-league construction only** (never re-prices an already-frozen franchise) vs land it
  **before** the v1 franchise's draft/salary freeze (ahead of D4/D6 in the build calendar) — *Captain lean:
  new-league-construction-only is the safest, but it must still precede the freeze for the v1 league*; **(ii)**
  taper = the `pickValueChart` IS the taper (pick N → chart[N-1]) vs a separate MLB/farm taper — *Captain lean:
  the chart IS the taper*; **(iii)** confirm IV-curve tier sensitivity = scale raw IVs before the chart (NOT a
  computeIV input — keeps §3.9 / the frozen oracle untouched). Rookie/farm pricing pegs to the tier-scaled
  `chart[0]`. Not built (value-sensitive + sequencing-coupled to unbuilt D4/D6).

- **OD-3 (L2 mutable layer — two-tier confirmation UX).** Greenfield; the product-UX is the crux: **(i)** does a
  pending ratings/trait confirmation **BLOCK** further games or run **async-background**? *(Captain lean: async,
  non-blocking — a 100-game season can't gate on a confirm)*; **(ii)** console-edit instruction format — plain
  text ("Power 65→70 on X") vs structured vs clipboard command? *(lean: plain text)*; **(iii)** temp-overlay
  expiry = **game-count** (re-evaluated on load) vs absolute timestamp? *(lean: game-count — the season clock is
  games, not wall-time)*; **(iv)** overlays season-scoped vs carry-forward. The store/read-path/parity are
  mechanical once these are ruled. Map in `wf_7b56fa48-a58`.

- **OD-4 (L4a reporter base-connect + publish bus).** **(i)** franchiseId-vs-leagueId reporter scope rule
  (exclusive vs franchiseId-precedence cascade)? *(lean: cascade — franchiseId wins for franchise games)*;
  **(ii)** `ReporterAssignmentPanel` UI placement — season-setup modal vs pregame screen? *(your UX call)*;
  **(iii)** `SeasonNewsItem.facts` schema (the §5 fact dict the reporter renders). SEA-3 already ruled
  (SeasonNewsItem + reuse rivalryScores). Map in `wf_7b56fa48-a58`.

- **OD-5 (L9a trait enrichment capture).** **(i)** manual vs auto capture for pitch-zone / pitch-type /
  OF-extra-base-credit — manual = sparse data → "Franchise-lite" (some enrichment-detail traits stay dormant via
  the §VI.1 min-sample valve); auto needs a reliable SMB4 read. *(Captain lean: manual/opt-in is spec-consistent —
  L9a just ENABLES capture; L9b gates on min-sample — so sparse is acceptable, no blocker)*; **(ii)** injury
  accumulator = cumulative season tally (for Durable/Injury-Prone) vs per-event snapshot? *(lean: cumulative
  season tally)*. Touches the live game path (useGameState/GameTracker) → wanted your eyes before building.
  Map in `wf_7b56fa48-a58`.

---

## CONSERVATIVE DEFAULTS TAKEN (AUTH-2 — documented, continued; override any on return)

- **L1:** no data-migration for old saved data (pre-launch; live consumers are presence-only; no by-key reader
  exists until the unbuilt L3). Field typed fully as `HiddenPersonalityModifiers`.
- **D1:** left the season-CREATION game count (`getOrCreateSeason` line 359) out of scope — it's a separate
  concern from WAR-scaling and would need franchise-schedule threading.
- **D2:** `KBL_BACKUP_VERSION` left at 2 (bumping breaks existing backups via the restore guard); parity-guard
  scoped to the `kbl-tracker` DB only (the all-DB extension + syncConfig/manifest reconciliation = a separate
  hardening ticket).

---

## BROWSER PRE-CHECK (2026-06-16 — Captain, via preview MCP on :5199; NOT a sign-off — JK's manual pass is the gate)

- **App loads cleanly** with all 5 commits (title "Super Mega Baseball", root mounts, zero server/console errors).
- **Franchise area renders end-to-end:** select screen → 6-step New-Franchise flow (League/Season/Playoffs/Teams/
  Rosters/Confirm) all render + advance; no crash from any commit.
- **L1.5+OD-1 shipped code VERIFIED in the real browser runtime** (dynamic-imported the actual modules, not the
  test env): `generateHiddenPersonalityModifiers` → 4 canonical keys, all in [0,100]; `computeTeamCaptains` →
  picked the max-(loyalty+charisma) MLB player with charisma≥70, **excluded the FARM player** (higher raw score)
  + the **charisma-69** player. Logic discriminates exactly as designed.
- **BLOCKED (pre-existing, NOT my code):** full franchise CREATION is gated by the 22+10 handoff validation
  ("0/10 FARM players; run the League Builder startup prospect draft; expected 2 hired scouts") — the default
  SUPER MEGA LEAGUE has only MLB rosters. To create a franchise (and thus exercise the backfill on real rosters +
  reach FranchiseHome for L4a), the League Builder startup farm draft + scout hiring must run first. So end-to-end
  L1.5/L4a on a live franchise is **deferred to JK's session** (run the farm draft → create → verify).
- **L4a reporter:** logic test-verified (30 tests); BeatReporterNews/FranchiseHome not reached live (no franchise
  created); reporter TEXT needs Supabase regardless (D-R5). JK browser-verifies when a franchise + Supabase exist.
- Dev server left running on :5199 for JK.

## TICKET LOG

- **2026-06-16 — RUN INITIALIZED.** Baseline committed (design docs + this protocol). Codex CLI verified.
  Queue per protocol: D2 → L9a → L1 → L1.5 → D1 (mechanical, auto-commit); L-ECON1 (build, hold); then L2, L4a.
  Next action: map the mechanical batch (parallel read-only workflow) → draft contracts → begin Codex builds.

- **2026-06-16 — MAPS COMPLETE** (workflow `wf_7b56fa48-a58`, 8 mappers). Triage after reading all 8 maps —
  the "mechanical" tickets split by judgment-density:
  - **BUILD + auto-commit:** **L1** (rename — FIRST, validates the loop), **L1.5** (Captain, after L1),
    **D1** (162 WAR-scaling closure — mostly already wired, 3-line change + grep gate), **D2** (backup parity —
    SCOPED: register the 3 stores + bump the kbl-tracker pin 12→15 + the all-DB parity-guard + a round-trip
    test; EXCLUDE the L2-dependent temp-overlay-expiry test and the export/restore-UI wiring [separate
    hardening ticket]).
  - **BUILD + HOLD for JK (do NOT commit):** **L-ECON1** (re-prices the frozen draft-IV anchor — value-sensitive).
  - **SET ASIDE for JK** (contracts to draft; these carry genuine product/UX decisions beyond conservative
    defaults): **L2** (two-tier confirmation UX — console-edit format, blocking-vs-async, temp-overlay expiry
    semantics; 9 open questions), **L4a** (reporter UI placement + franchiseId-vs-leagueId scope rule +
    SeasonNewsItem.facts schema), **L9a** (manual-vs-auto capture for pitch-zone/type/OF-credit + injury-
    accumulator scope; touches the live game path). See OPEN DECISIONS section when these are written up.
  - **STARTED: L1.** Contract appended to PROMPT_CONTRACTS.md; Codex invoked (high reasoning, workspace-write).

- **2026-06-16 — L1 COMMITTED.** Codex built (exit 0); Captain (Opus) independent audit = **VERIFIED** (triangle:
  builder=Codex, auditor=Opus). Diff = 3 ALLOWED source files (`HiddenPersonalityModifiers` rename
  loyalty/ambition/resilience/charisma + the typed `Player.hiddenPersonalityModifiers` field + the carrier type)
  + 20 test files (pure fixture-key + leak-regex renames; Codex grepped beyond the named set — all within the
  "test files referencing old keys" contract clause). **Independent gates:** `tsc --noEmit` = 0; `grep` for old
  keys in src/ = 0; `prospectScoutingDraftEngine` 14/14; `franchiseNarrativeEventEligibility` 10 pass / 1 fail =
  ONLY the characterized "TEAM_MVP/ACE preview-only" (not a new break); `npm run build` 0 (Codex, corroborated by
  tsc 0). No behavior change, no oracle/value touch, no out-of-ALLOWED edits. Conservative default applied: no
  data migration (pre-launch; presence-only live consumers). **→ NEXT: L1.5 (Captain assignment).**

- **2026-06-16 — L1.5 SET ASIDE (blocked on OD-1).** Pre-contract verification found MLB pool players lack the
  hidden modifiers (assigned only in the prospect path) → Captain selection would be a no-op. Escalated as **OD-1**
  (above) — an SMB4-personality-asset decision for JK. Not built. **→ NEXT: D1 (162 WAR-scaling closure — modifier-
  independent).**

- **2026-06-16 — STARTED: D1.** Pre-contract analysis: WAR scaling already routes through stored `gamesPerTeam`
  (`resolveSeasonGamesForWAR`); the `/ 162` division gate is already green; only the `= 162` literal at
  `useSeasonStats.ts:38` remains → D1 = a ZERO-behavior-change alias to canonical `MLB_BASELINE_GAMES` (the
  `seasonAggregator.ts:39` pattern). Season-CREATION game count (line 359) noted OUT of scope (separate concern).
  Contract in PROMPT_CONTRACTS.md; Codex invoked.

- **2026-06-16 — D1 COMMITTED.** Codex built (exit 0); Captain audit = **VERIFIED**. Diff = `useSeasonStats.ts`
  only (`import { MLB_BASELINE_GAMES }` + line 38 alias). **ZERO behavior change** — `MLB_BASELINE_GAMES === 162`
  (confirmed `franchiseAdaptiveStandards.ts:8`); WAR scaling already routed through `gamesPerTeam`. Independent
  gates: tsc 0; grep `= 162|/ 162|* 162` in useSeasonStats = 0; seasonLength 7/7; Codex's 5-file WAR gate 305/305
  (it found the real pwar/fwar/rwar paths under `src_figma/__tests__/statCalculations/`). Season-creation game
  count (line 359) left out-of-scope (separate concern). **→ NEXT: D2 (backup parity, scoped).**

- **2026-06-16 — STARTED: D2.** Pre-contract reads pinned the exact mirror (trackerDb.ts 3 store defs) + the
  registry shape + the version anchors. **Key ruling (documented):** do NOT bump `KBL_BACKUP_VERSION` (stays 2) —
  restore REJECTS backups whose version ≠ KBL_BACKUP_VERSION (`backupRestore.ts:1232/1253`), and the file FORMAT
  is unchanged (only store COVERAGE grows); bumping would break every existing backup. Only the kbl-tracker
  SCHEMA pin goes 12→15. Scope: register the 3 stores + the pin + a parity-guard (kbl-tracker only) + round-trip
  test. OUT of D2 (→ separate hardening ticket): the all-DB guard extension, syncConfig/manifest reconciliation,
  export/restore UI wiring, the L2-expiry test. Contract in PROMPT_CONTRACTS.md; Codex invoked.

- **2026-06-16 — D2 COMMITTED.** Codex built (exit 0); Captain audit = **VERIFIED**. Diff = `backupRestore.ts`
  (3 stores added to `trackerStores` mirroring trackerDb EXACTLY — keyPaths + indexes +
  `franchiseTrueValueRows.by_player_scope` unique via `options:{unique:true}`; pin `12→15` line 298) + NEW
  `backupRestore.franchiseParity.test.ts`. **`KBL_BACKUP_VERSION` UNCHANGED at 2** (confirmed — the ruling held).
  Test is mutation-honest: parity-guard = real `objectStoreNames === registry-keys` set comparison (would've
  failed pre-D2); round-trip seeds → exports → **WIPES the DB** → restores → reads each row back by composite key.
  Parity-guard passed without revealing other missing stores → the 3 were the COMPLETE gap (D2 fully closes the
  silent-drop defect). Independent gates: tsc 0; parity (2) + elimination (10) = 12 passed. SMB4 assets untouched;
  backup/restore still orphaned (UI wiring + all-DB guard = the separate hardening ticket). **→ NEXT: L-ECON1
  (build + HOLD — value-sensitive, do NOT commit).**

- **2026-06-16 — L-ECON1 SET ASIDE (revised from build-and-hold) → OD-2.** On reflection: it re-prices the
  frozen draft-IV anchor on the IV/salary value spine, carries value-design open questions, and is
  sequencing-coupled to the unbuilt D4/D6 — no urgency, and building it unwatched would bake value defaults on
  the protected spine. Set aside with OD-2.

- **2026-06-16 — AUTONOMOUS BUILD PHASE WRAPPED.** Safe-mechanical set complete: **L1 + D1 + D2 committed** (all
  VERIFIED). Remaining Tier-0 work is design/value/product-laden → 5 open decisions (OD-1..5) surfaced for JK; the
  loop resumes on his rulings. No pushes; tree clean except the pre-existing `Temp/` + roster CSV. Triangle held
  throughout (Codex built every diff; Opus audited every diff independently — tsc/tests re-run, not trusted from
  the builder paste). Next watched session: D4 (salary-live UI de-gate) is the natural first build (browser-
  verifiable), and OD-1 (the cheapest unblock) lets L1.5 + the modifier-consuming layer proceed.

- **2026-06-16 — RUN RESUMED (recalibration).** JK flagged the wrap was too conservative: AUTH-2 authorized "make
  a conservative choice AND CONTINUE (and document)" — I'd over-applied the "set aside" branch. Recalibrated: build
  with documented conservative defaults; HALT only on genuine frozen-value-oracle touches or truly new design the
  spec doesn't cover. **OD-1 reclassified "halt" → BUILD with default (a)** — the spec already says all players
  carry the 4 modifiers, so generating them at init is building-to-spec (no SOT touch). Combined OD-1 + L1.5 into
  ONE franchise-init ticket (shared file). **STARTED: L1.5+OD-1.** Contract in PROMPT_CONTRACTS.md; Codex invoked.
  Queue after: L9a, L2, L4a with their logged leans; **L-ECON1 remains HELD** (frozen draft-IV anchor = a real
  hard-halt trigger).

- **2026-06-16 — L1.5+OD-1 COMMITTED.** Codex built (exit 0); Captain audit = **VERIFIED**. Diff:
  `prospectScoutingDraftEngine.ts` (extract+export `generateHiddenPersonalityModifiers(seed)`, output-preserving
  refactor of buildCandidate) · `franchiseInitializer.ts` (backfill = skip-if-present, seed=player.id; captains =
  max(loyalty+charisma), charisma≥70, MLB-only, null+warn, deterministic ties; wired backfill→captains→season-
  metadata, captains consume the backfilled players) · `leagueBuilderStorage.ts` (`captainPlayerId?: string|null`
  on Team, additive) · NEW `franchiseInitializer.test.ts` (4 mutation-honest tests incl. a FARM-with-highest-raw-
  score exclusion + a charisma-69 gate-out) + w1fix ordering test. **Invariants confirmed:** designation
  eligibility NOT unblocked (L7 owns activation) · playerDatabase SOT NOT touched · prospect output unchanged.
  Independent gates: tsc 0; my 3 unit files 21/21; **the 3 end-to-end initializeFranchise integration tests 33/33
  (no regression to the init path)**. **→ NEXT: L4a-connect (L9a deferred to a watched session — see below).**

- **2026-06-16 — STARTED: L4a base reporter-connect (REP-1..3); L9a DEFERRED to a watched session.** Chose L4a
  over L9a with an ENGINEERING (not over-caution) rationale: **L9a touches the LIVE GAME PATH**
  (`useGameState`/`GameTracker`), **activates a dead code path** (`advanceCount`, 0 callers), and **needs new
  in-game capture UI** — hard to unit-test, a break is user-visible gameplay corruption → genuinely warrants a
  WATCHED session with browser verification. (Distinct from the OD-1 over-caution, which had an obvious default and
  is now built.) **L4a-connect** is cert-specified, off the live game path, no new store: REP-1..3 = auto-assign a
  franchiseId-scoped reporter on launch + the post-game-columns flag + rewrite `BeatReporterNews` to read
  `GameStory`. DEFERRED within L4a: the publish bus (SeasonNewsItem / emission config / generateSeasonNewsTake) +
  a manual assignment panel. Defaults: franchiseId-precedence cascade, auto-assign. Reporter TEXT is
  Supabase/network-dependent (existing D-R5) — this WIRES it; JK browser-verifies when configured. Contract in
  PROMPT_CONTRACTS.md; Codex invoked.

- **2026-06-16 — L4a-connect COMMITTED (browser-pending).** Codex built (exit 0); Captain audit = **VERIFIED**.
  Diff = 4 ALLOWED files: `reporterStorage` (getReporterForTeam += franchiseId, cascade precedence — franchiseId
  filters & ignores leagueId when present, else leagueId fallback) · `reporterAssignment` (autoGenerate/assign +=
  franchiseId) · `FranchiseHome` (both launch blocks auto-assign-if-missing a franchiseId reporter + write the
  post-game-columns sessionStorage key + navigate state `liveBeat:false`/`postGame:true`; `BeatReporterNews`
  rewritten to read `listGameStoriesForFranchiseSeason`, `generateGameRecap` RETIRED) · `useCommentaryFeed`
  (franchiseId passed when gameMode==='franchise'). **Invariants:** NO publish-bus built (the 2 grep hits were my
  contract-doc text) · NO new store/trackerDb/backup · NO value/oracle touch · liveBeat off. Independent gates:
  tsc 0; reporter + franchise-launch tests 30/30 (Codex's broader run 83). **LOW (cleanup candidates):** the new
  franchiseId-scope leans on existing tests (no new unit coverage added — diff-verified + browser-gated); franchiseId
  rides a storage-layer intersection type, not the core `BeatReporter` type. **BROWSER-PENDING (JK): reporter TEXT
  is Supabase/network-dependent (D-R5) — when configured, verify the franchise hub shows live GameStory columns
  (not the legacy template).** **→ NEXT: assess L2 (greenfield mutable-layer).**

- **2026-06-16 — BROWSER DEFERRED (JK) → keep rolling; D4 SNAG flagged; STARTED L4a publish-bus.** JK ruled to
  BATCH the live-franchise + reporter-text browser checks (the ratified batched-browser process; engineering audits
  already passed) so the loop continues. **D4 snag (genuine finding for JK):** the salary preview chips D0 cited
  (`TeamHubContent.tsx:4623-4636`) sit on the COMBINED "TRUE VALUE + EXPECTED WINS PREVIEW" panel — salary numbers
  are CONTEXT for the value preview, not a separable surface. D0's "de-gate salary, don't touch True-Value/Expected-
  Wins (wait for D6)" can't be cleanly satisfied without a presentation decision (how to show live-salary in an
  otherwise-D6-gated panel) → **D4 needs a JK scope clarification.** Rolled instead with **L4a publish-bus core**
  (SEA-1: ruled built EARLY; off the live path; SEA-3 ruled): SeasonNewsItem store + SeasonEmissionConfig +
  emission gate + generateSeasonNewsTake on the canonical reporter. BUILD-DARK (no event taps yet) + network-
  dependent (returns null gracefully w/o Supabase). New stores → trackerDb v15→16 + backup (D2 pattern, KBL_BACKUP_
  VERSION stays 2). Contract in PROMPT_CONTRACTS.md; Codex invoked.

- **2026-06-16 — L4a publish-bus core COMMITTED.** Codex built (exit 0); Captain audit = **VERIFIED**. New:
  `types/reporter` (SeasonNewsItem + SeasonEmissionConfig) · `seasonNewsStorage` (mirrors gameStoriesStorage) ·
  `seasonEmissionConfigStorage` · `seasonNewsGenerator` (shouldEmitSeasonNews gate + generateSeasonNewsTake) ·
  `trackerDb` v15→16 (2 stores) · `backupRestore` (register 2, pin 16) · `syncConfig`. **§5 INVARIANT UPHELD:** the
  generator imports NO morale/value engine, narrates strictly from `event.facts`, the system prompt hard-codes
  "matrix is the math, reporter narrates only, never invent, the gate already decided"; returns null gracefully on
  gate-reject / parse-fail / transport-error (no throw w/o Supabase). Invariants: KBL_BACKUP_VERSION stays 2 ·
  TRACKER_DB_VERSION 16 · no live-game-path / value / legacy-narrativeEngine touch. Independent gates: tsc 0; 12
  tests pass incl. **the D2 parity-guard STILL GREEN with the 2 new stores** (data-integrity confirmed). BUILD-DARK
  (no event taps yet — SEA-1 ruled built-early) + network-dependent. NOT browser-pending (backend; no user-visible
  surface this increment). DEFERRED within L4a-bus: event taps, memory writer/regen, hub season-feed UI.
  **→ Pausing for JK direction: D4 scope ruling · soul-layer "build to spec" greenlight · L-ECON1 held · L2
  premature · L9a live-path (browser-batchable).**

- **2026-06-16 — JK DIRECTION: "D-stack to the value gate."** Re-ordered: D4 (salary UI) is NOT a D6 dependency
  + has the presentation snag → left as a flagged browser-session UI item; route **D5 → D6**.
- **2026-06-16 — D5 CONFIRMED** (confirm-only, no build). TEAM_MVP/ACE `warConsumerTrust` trust engine green:
  51 tests across `franchiseValueInputs` + `franchiseAnalyticsTrust` + `franchiseDesignationEligibility` pass.
  D6 precondition clear.
- **2026-06-16 — D6 MAPPING (workflow `wf_3c443a04-35e`, 4 mappers).** D6 = the make-or-break value-trust gate
  (its frozen artifact feeds D7/D8/MOY). Trust flags (`trustedForTrueValue`, `valueDeltaTrustedForDesignations`,
  `finalTrueValueCalculated`, `persistedTrueValueCreated`) are literal-false across franchiseAnalyticsTrust/
  TrueValuePreview/ValueInputs; peerPoolSize already computes; values recompute-each-game today (no freeze). D0
  specified the core policy (≥2 peers BLOCK, no fudge, hidden-FARM/score-only excluded) but left D6 to DEFINE the
  frozen-snapshot rules (which roster state / season-vs-playoff / when values lock) — genuine value-design forks.
  Mapping → then surface the contract + those forks to JK before building (the make-or-break ticket warrants the
  map→ruling→build discipline; risk-rule says value-design judgment calls surface).

- **2026-06-16 — D6 DECISIONS RULED + D6a STARTED.** Map complete (4 agents). **JK ruled the lock-timing fork:
  SEASON-END FREEZE** (artifact live each game for live designations + floating value; locks at the last
  regular-season game so D8/D9 awards compute on a deterministic frozen spine; regular-season-only). Captain
  conservative defaults (in the contract): hard-block <2 peers · full-player block · new dedicated
  `franchiseTrustedValueArtifacts` store · boundary via assertion + no-leak test · reconcile the
  `franchiseDesignationReadinessReport.ts:84` inconsistency the map caught. **Split D6 for safety on the
  make-or-break gate: D6a = the LIVE artifact + peer-pool audit + flag-flips + exclusions + reconcile + backup
  (unblocks D7); D6b = the season-end freeze (for D8/D9).** D6a contract in PROMPT_CONTRACTS.md; Codex invoked
  (trackerDb v16→17). Will audit RIGOROUSLY (value spine; high blast radius — D7/D8/MOY consume the artifact).

- **2026-06-16 — D6a COMMITTED.** Codex built (exit 0); Captain RIGOROUS audit = **VERIFIED** (make-or-break value
  spine). Diff = NEW `franchiseTrustedValueStorage` (artifact store, frozen:false) + `franchiseTrueValueStorage`
  (peer-pool audit) + the 4 flag-flips (`franchiseValueInputs`/`TrueValuePreview`/`AnalyticsTrust`) + readiness-
  report reconcile + `trackerDb` v16→17 + `backupRestore` (pin 17) + `syncConfig` + tests. **Substance verified by
  reading:** audit = per-pool ≥2 MLB peers HARD-block (no fudge/fallback), two-way FULL-block if either arm/bat
  pool fails, FARM/score-only excluded, deterministic sorted artifact; flags GENUINELY COMPUTED from the artifact
  (not hardcoded-true; null-safe→false); NO existing trust assertion removed/weakened. **Invariants:** base-IV
  oracle UNTOUCHED · boundary intact (a REAL no-leak test scans all source: no file mixes `trustedForTrueValue`
  with salary/morale/Captain/FanHopeful/Cornerstone → []) · D8 award flags stay false · salaryMovement/morale stay
  false · KBL_BACKUP_VERSION 2 · no freeze (D6b). Independent gates: tsc 0; 68 tests pass incl. the D2 parity-guard
  green with the new store + the boundary no-leak. NOT browser-pending (backend trust computation; the user-visible
  label flip is D7/D11). **→ NEXT: D6b (season-end freeze) → D7 (designations live, incl. Albatross + Fan Favorite).**

- **2026-06-16 (overnight, AUTH-4) — STARTED: D6b (season-end freeze).** Fresh thread resumed under the AUTH-4
  start-of-session waiver (did the 5-file reads + both run docs, restated, proceeded — no JK wait). Mapped via
  workflow `wf_6f52f76d-cf6` (5 grounded readers: artifact store + write path / season-end trigger / D8-D9
  consumption / persistence-parity / adversarial failure-modes). Every decision-critical claim Captain-verified at
  file:line before contracting. **The freeze is data-cheap but correctness-critical:** D6a's per-game recompute
  (`calculateAndPersistFranchiseTrueValueForSeason` → `persistTrustedValueArtifact`, unconditional put) hardcodes
  `frozen:false` every game (`franchiseTrueValueStorage.ts:317-318`), so a freeze is meaningless unless the recompute
  RESPECTS it — the central guard. Design: type-widen `frozen` literal→boolean; idempotent
  `freezeTrustedValueArtifactForSeason` helper; Layer-A anti-thaw guard in the sole writer + Layer-B early-return in
  the recompute orchestrator (locks BOTH the artifact and the `franchiseTrueValueRows` numbers); trigger in BOTH
  `checkSeasonComplete` and the `isSeasonOver` effect. NO new store, NO DB bump (stays v17), KBL_BACKUP_VERSION 2,
  contractVersion `'d6-v1'` — confirmed migration-free (parity-guard compares store NAMES only). Contract in
  PROMPT_CONTRACTS.md; Codex invoked (high reasoning). Will audit RIGOROUSLY (value spine; D7/D8/MOY consume it).

  **DEFAULTS-TAKEN (AUTH-4, JK-overridable on review):**
  - **Freeze BOTH stores** (artifact + `franchiseTrueValueRows`), not just the artifact — D9 ranks on the row
    numbers; freezing membership alone = a determinism hole. Gated by one read of the artifact's `frozen` flag.
  - **Freeze-in-place**, not recompute-then-freeze (artifact already current as of the last aggregated game).
  - **Hard anti-thaw v1** — no unfreeze affordance; a frozen scope is immutable for the season.
  - **No `contractVersion` bump** (`'d6-v1'` stays); `frozen:true`+`frozenAt` is the signal.
  - **Trigger BOTH** `checkSeasonComplete` + the `isSeasonOver` effect (the second covers a live-PLAYED finale that
    returns to FranchiseHome via the effect, not the sim/batch/skip handlers — a real gap the map caught).
  - **KNOWN LIMITATION (documented):** the read path never recomputes, so reload is safe; but a season completed
    under PRE-D6b code (no freeze ever triggered) stays unfrozen until something re-enters the trigger — not a
    concern for new v1 franchises. No back-fill freeze in scope.

- **2026-06-17 (overnight, AUTH-4) — D6b BUILD #1 HUNG → killed + re-dispatched (infra stall, NOT a safety wall).**
  The first `codex exec` dispatch (PID 97560) stalled mid-run: ran its exploration greps, made the next model-API
  call, and the stream never returned — process alive in `S` (I/O sleep) for ~6h40m with the run log frozen
  (292,193 bytes, unchanged) and **ZERO product files written** (repo clean: only the 2 doc edits). Diagnosed via
  etime + a live no-growth sample + `git status`. Killed (TERM, no survivors); repo intact (nothing half-written →
  no revert needed). Cause: transient model-API/stream hang AFTER several successful tool calls (codex auth/API
  worked initially), so a fresh retry is the correct call — the contract is unchanged (NOT a fix iteration). **Guard
  added:** re-dispatched inside a 30-min watchdog (`kill -9` if codex outlives 1800s) so any repeat hang becomes a
  completion notification instead of a silent multi-hour stall. Build #2 running (task `bi0hfc44x`, run2.log/out2).

- **2026-06-17 (overnight, AUTH-4) — D6b COMMITTED.** Build #2 exit 0; Captain (Opus) RIGOROUS independent audit =
  **VERIFIED** (make-or-break value spine — audited hardest per AUTH-4). Diff = 6 files (3 product + 3 test), all
  within ALLOWED. Substance: `frozen` literal→`boolean`; idempotent `freezeTrustedValueArtifactForSeason` (no-op +
  warn if no artifact; never re-stamps `frozenAt`); **Layer-A** anti-thaw guard in the sole writer
  `persistTrustedValueArtifact` (refuses to overwrite a frozen record with a non-frozen one); **Layer-B** early-return
  in `calculateAndPersistFranchiseTrueValueForSeason` (skips the whole recompute when frozen → locks BOTH the artifact
  AND `franchiseTrueValueRows`); freeze triggered from `checkSeasonComplete` AND the `isSeasonOver` effect (covers a
  live-PLAYED finale). **Independent gates (re-ran, not trusted from paste):** tsc 0 · build 0 · full suite **7,254
  pass / 3 fail** = EXACTLY the characterized set, ZERO new reds, +3 new D6b tests pass · **mutation-proven** (Layer-B
  disabled → anti-thaw test RED) · TRACKER_DB_VERSION 17 / pin 17 / KBL_BACKUP_VERSION 2 / contractVersion `'d6-v1'`
  unchanged · `franchiseAnalyticsTrust.ts` (D8 flags) UNTOUCHED · scope matches the stored key · sole recompute
  caller tolerates the `!persisted` early-return. **BROWSER-PENDING (batched):** finish a regular season on real
  franchise data → artifact freezes; a later game doesn't un-freeze. **→ NEXT: D7 (designations LIVE incl.
  Albatross).** Hang-guard lesson: wrap every `codex exec` dispatch in a watchdog so a stalled call self-recovers.

- **2026-06-17 (overnight, AUTH-4) — D7 SPLIT into D7a + D7b; STARTED: D7a.** JK ruled (mid-run) "Map D7, build
  autonomously" = full AUTH-4 unattended. Mapped via `wf_fde440e6-dd3` (6 readers; Captain file:line-verified the
  riskiest claims). Map findings drove the split + defaults: (1) THREE designation surfaces (persisted store /
  read-only eligibility report [ALREADY at status:'active' for TEAM_MVP/ACE from a prior slice] / dormant
  player-embedded array); (2) the persisted path still hardcodes 'projected' → the reconcile is "make the persisted
  STORE emit 'active' matching eligibility, add a live badge, mint the event"; (3) the characterized
  franchiseNarrativeEventEligibility "TEAM_MVP/ACE preview-only" RED is PRE-EXISTING (eligibility already 'active',
  consumer/test never updated) — a separate narrative cleanup, NOT D7a; (4) Albatross is a DE-GATE not a build
  (selection logic exists) but has an UNTRUSTED-VALUE LEAK (named off live valueDelta with no peer-pool check) →
  fixing it (the D6 trustedPlayerIds filter) is D7b's correctness payload; (5) DesignationEvent is greenfield
  (precedent: RosterMoveEvent/TradeEvent are ephemeral, no store). **D7a** = persisted TEAM_MVP/ACE → 'active'
  (gated on the eligibility verdict) + live non-'Proj.' badge + TeamHubContent render + ephemeral changed-only
  DesignationEvent (no morale/fame). Contract in PROMPT_CONTRACTS.md; Codex invoked under the 30-min watchdog.
  **DEFAULTS-TAKEN:** persisted canonical / promote-only-when-both-paths-agree / event ephemeral+changed-only /
  narrative gate untouched (baseline unchanged) / embedded array stays dormant / FF+Captain+FanHopeful+Cornerstone
  deferred. Audit the morale/fame firewall HARDEST (asset-protected). **D7b QUEUED:** Albatross de-gate + trust filter.

- **2026-06-17 (overnight, AUTH-4) — D7a COMMITTED.** Build #1 clean (watchdog held; no hang). Captain (Opus) RIGOROUS
  independent audit = **VERIFIED** (asset-protected designations — firewall audited hardest). Diff = 6 files (4 product
  + 2 test). Substance: live solid TEAM_MVP/ACE badge + `getLiveDesignationBadge`; `DesignationEvent` type (3 firewall
  markers); pure `diffActiveDesignationHolders`; the persisted store now stamps TEAM_MVP/ACE 'active' ONLY when the
  eligibility path marks the EXACT (type,team,player) active (conservative both-paths-agree gate); ephemeral
  changed-only event returned from the persist fn (`void`-ignored in processCompletedGame); TeamHubContent surfaces
  active rows (the `||'active'` filter fix) with live vs 'Proj.' badges. **Gates (re-ran, not from paste):** tsc 0 ·
  build 0 · full suite **7,258 pass / 3 fail (7,261 total, +4)** = EXACTLY the characterized set, **narrative
  preview-only RED UNCHANGED** (untouched — baseline preserved), ZERO new reds · **FIREWALL INTACT** (grep: no
  morale/fame/teamMVP/fanFavoriteEngine import in the designation path; event flags false; Codex hardened the source
  firewall test) · promotion mutation-honest (pinned both sides) · no new store/version bump. **BROWSER-PENDING
  (batched):** trusted MVP/ACE shows solid live badge; untrusted/non-top stays 'Proj.'; FF/Albatross still 'Proj.'.
  **→ NEXT: D7b (Albatross live + the D6 trustedPlayerIds trust filter — the untrusted-value-leak fix).**

- **2026-06-17 (overnight, AUTH-4) — STARTED: D7b (Albatross live + close the untrusted-value leak).** Grounding from
  the D7 map (`wf_fde440e6-dd3`) + Captain code-verification: (a) the canonical Albatross selection names the
  most-negative valueDelta player per team with NO peer-pool check → an untrusted (<2-MLB-peer) player can be branded
  Albatross, violating the D0 ">=2 MLB peers BLOCK" boundary (the leak); (b) `warConsumerTrust.
  fanFavoriteAlbatrossDesignations` is HARDCODED false (franchiseValueInputs.ts:47/:341) — not yet wired to trust; (c)
  `isPlayerTrustedForValue(artifact, player.id)` (per-player ≥2-peer membership) is the authoritative source, already
  used for trustedForTrueValue (:469). **D7b** = wire that flag real + filter the Albatross SELECTION to trusted (close
  the leak at the naming site) + de-gate Albatross in eligibility → 'active' for trusted+negative+worst-on-team + add
  ALBATROSS to ACTIVE_PROMOTION_TYPES (reuse D7a's promotion/event/badge machinery) + ALBATROSS live badge. Contract in
  PROMPT_CONTRACTS.md; Codex invoked under the 30-min watchdog. **DEFAULTS-TAKEN:** trust = isPlayerTrustedForValue
  (read-only live/frozen artifact, never recompute TV) / filter at the selection site / v1 policy = most-negative
  trusted valueDelta, NO salary floor (orphaned fanFavoriteEngine policy NOT adopted) / -1 fame DORMANT / Fan Favorite
  stays projected-blocked (morale-gated) / FF selection unchanged (follow-up if JK wants its preview trust-filtered).

- **2026-06-17 (overnight, AUTH-4) — D7b COMMITTED → D7 COMPLETE.** Build clean (watchdog held). Captain (Opus)
  RIGOROUS independent audit = **VERIFIED**. Diff = 9 files (4 product + 5 test). The untrusted-value LEAK is CLOSED at
  the selection site (`valueTrusted` filter) AND the eligibility de-gate; both bind the D6 per-player ≥2-peer
  membership (`isPlayerTrustedForValue` → `warConsumerTrust.fanFavoriteAlbatrossDesignations`, previously hardcoded
  false). Albatross promotes via the same D7a eligibility-verdict gate; FF stays blocked. **Gates (re-ran):** tsc 0 ·
  build 0 · full suite **7,260 pass / 3 fail (7,263 total)** = EXACTLY the characterized set, ZERO new reds ·
  **LEAK CLOSURE MUTATION-PROVEN** (remove `valueTrusted` → 4 tests RED; eligibility test: untrusted worst −28/1-peer
  BLOCKED, trusted worst −14/4-peer active) · **FIREWALL INTACT** (no morale/fame import; ALBATROSS_NAMED −1 dormant;
  no live emitter) · no new store/version bump · TV read-only. **BROWSER-PENDING (batched):** Albatross named only for
  a ≥2-peer worst-negative-value player; solid red live badge; no morale/salary effect. **→ NEXT: D8 (award-trust
  gate) — consume D6's frozen artifact; promote trustedForAwards/finalWarTrusted to computed; adaptive thresholds.**

- **2026-06-17 (overnight, AUTH-4) — STARTED: D8 (award-trust GATE).** Mapped via `wf_6babf91f-7d4` (5 readers,
  Captain file:line-verified). Key findings: D8 is the GATE ONLY (booleans + written contract + adaptive-threshold
  helper + tests) — the awards engine/storage/UI/stored-winners + mwar retirement are D9 (greenfield, 0 files). The
  trust booleans (trustedForAwards/finalWarTrusted/consumerThresholdsProven) are literal-false in
  franchiseAnalyticsTrust.ts; the D6 trustedForTrueValue promotion is the template (artifact→isPlayerTrustedForValue→
  row flag→report). **Determinism crux:** the artifact re-persists every game until frozen (processCompletedGame:227);
  existing D6/D7 reads ignore `frozen` → in-season drift. So D8 gates award trust on `artifact.frozen===true` (a
  deliberate tightening vs D7). Exclusions (score-only/hidden-FARM/<2-peer) inherited via trustedPlayerIds. Contract
  in PROMPT_CONTRACTS.md; Codex invoked under the 30-min watchdog. **DEFAULTS-TAKEN:** D8 stores nothing (no store/
  bump) · frozen-required gate · "not a flip" (Boolean(frozen && member && thresholds), mutation-tested false-when-
  ungated) · qualifier helper via scaledThreshold (502 PA / 162 IP baselines scaled; magnitudes sim-tunable) · manifest
  left to D10 · narrative characterized test stays green (unfrozen fixtures stay preview-only). **D9 QUEUED** (awards
  engine + MOY-1..7 + LSD-1 fame seams).

- **2026-06-17 (overnight, AUTH-4) — D8 COMMITTED.** Build clean. Captain (Opus) RIGOROUS independent audit =
  **VERIFIED**. Diff = 2 product + 2 new (`franchiseAwardTrust.ts` qualifier helper, `AWARD_TRUST_CONTRACT.md`) + tests
  (incl. 7 mechanical `trustedValueArtifactFrozen:false` fixture additions). The award-trust booleans are now COMPUTED
  off the D6 FROZEN artifact: `finalWarTrusted = frozen && trueValueTrust`; `trustedForAwards = finalWarTrusted &&
  consumerThresholdsProven && hasAwardTrust`; downstream awards status computed; adaptive `awardQualifierThresholds`
  via scaledThreshold (502 PA / 162 IP baselines scaled, no raw 162/9). **Gates (re-ran):** tsc 0 · build 0 · full
  suite **7,263 pass / 3 fail (7,266 total)** = EXACTLY the characterized set, ZERO new reds, narrative RED unchanged ·
  **FROZEN-GATE MUTATION-PROVEN** (drop frozen → test RED) · exclusions tested · BOUNDARY HELD (no store/DB bump/
  manifest/mwar touch; no awards engine created). **DETERMINISM TIGHTENING (flagged for JK):** award trust requires
  `artifact.frozen===true`, stricter than D7 designation readiness — awards are season-end finalizations.
  **BROWSER-PENDING (batched):** awards preview-only until freeze, then 'trusted' (no winners — D9). **→ NEXT: D9
  (real awards: franchiseAwardsEngine/Storage [NEW store + migration + backup parity] + AwardsWatchlist + MOY-1..7 +
  LSD-1 fame seams — the biggest ticket; will likely SPLIT like D6/D7).**

- **2026-06-17 (overnight, AUTH-4) — D9 mapped + SPLIT; STARTED: D9a (persistence spine).** Mapped via
  `wf_1a49cc24-8d7` (5 readers, Captain-verified). All of franchiseAwardsEngine/Storage/AwardsWatchlist/
  franchiseTrueValueSnapshots confirmed GREENFIELD (0 files). **D9 SPLIT (D6/D7 precedent):** D9a = the persistence
  dark-store diff (highest data-shape risk, isolated first) → D9b = the 5 WAR-category engine (off D6 frozen artifact +
  D8 gate) → D9c = MOY (season-aggregate pogAwards + record=wins-above-D6-expectation + retire calculateMOYVotes,
  re-point AwardsCeremonyFlow/RatingsAdjustmentFlow first) → D9d = AwardsWatchlist UI + per-game watchlist recompute +
  game-1 snapshot capture + season-end finalize + display. **D9a** = 2 stores (franchiseAwardsRows
  [LSD-1 seams: candidate margins / fWAR-total split / nullable voteWeight / reserved KK-Bust-Comeback] +
  franchiseTrueValueSnapshots [trough history from game 1]) at **trackerDb v17→v18** + backup-parity lockstep
  (register both + pin 18, optional:true, KBL_BACKUP_VERSION stays 2) + CRUD + the round-trip/parity/PIN-TRAP tests.
  Contract in PROMPT_CONTRACTS.md; Codex invoked under the 30-min watchdog. **DEFAULTS-TAKEN:** v18 (spec "v16" stale)
  · dark stores (writers = D9b/c/d) · optional:true (don't brick pre-D9 backups) · getTrackerDb delegation (no SIM-hang)
  · seam fields nullable (L12 additive). **THE TRAP TO CATCH:** `franchiseSeasonLedgerStorage.test.ts` hardcodes the
  version literal + store list (broke the v15→v17 bump, commit 8ba0538) — D9a must update it; the full suite is the net.
  **D9b/c/d QUEUED.**

- **2026-06-17 (overnight, AUTH-4) — D9a COMMITTED.** Build clean. Captain (Opus) RIGOROUS independent audit =
  **VERIFIED** (data-shape migration — audited hardest). Diff = 6 edited + 4 new (2 dark storage modules + 2 tests).
  **Migration lockstep BYTE-PERFECT:** trackerDb v17→18 + 2 idempotent stores; backupRestore registers both
  (byte-mirrored keyPath+by_scope, optional:true) + pin 18; syncConfig both — 3 places each. KBL_BACKUP_VERSION 2.
  **The proven PIN-TRAP handled** (franchiseSeasonLedgerStorage.test.ts 17→18 + store list). **Gates (re-ran):**
  tsc 0 · build 0 · full suite **7,271 pass / 3 fail (7,274 total)** = EXACTLY characterized, ZERO new reds ·
  round-trip proves both stores survive export→wipe→restore by exact composite key (keyPath fidelity) · parity-guard
  GREEN · franchiseAwardRow carries ALL LSD-1 seams · getTrackerDb delegation (no SIM-hang) · optional:true (pre-D9
  backups safe) · stores DARK (zero engine writers). **→ NEXT: D9b (the 5 WAR-category engine: MVP=total WAR /
  Cy Young / RoY / Gold Glove=fWAR+def split / Silver Slugger — off the D6 FROZEN artifact + frozen TV rows, gated on
  D8 trustedForAwards + awardQualifierThresholds; populate franchiseAwardsRows + candidate margins; determinism
  mutation-kill test [perturb live TV → winners don't move]). RoY rookie source = careerStorage.seasonsPlayed===0
  [Captain default]. Then D9c MOY, D9d UI/finalize.**

- **2026-06-17 (overnight, AUTH-4) — STARTED: D9b (the 5 WAR-category awards engine).** Contracted directly from the
  D9 map (no new map). NEW `franchiseAwardsEngine.ts`: a PURE `computeFranchiseWarAwards` (winner + all candidates +
  marginToWinner per category) + `computeAndPersistFranchiseWarAwards` (loads frozen artifact + frozen TV rows + D8
  report + rookie set → writes the D9a `franchiseAwardsRows`, finalized:true). 5 categories: MVP=totalWar /
  CyYoung=pitchingWar / RoY=top totalWar among rookies / GoldGlove=fieldingWar (+goldGloveSplit seam) /
  SilverSlugger=battingWar. Gated on D8 trustedForAwards + isPlayerTrustedForValue(frozen) + awardQualifierThresholds.
  Reads the FROZEN spine only — never recomputes TV (the determinism make-or-break). Contract in PROMPT_CONTRACTS.md;
  Codex invoked under the 30-min watchdog. **DEFAULTS-TAKEN:** RoY = careerStorage.seasonsPlayed===0 (input set, no new
  field) · engine is pure fn + directly-callable persist fn, NOT app-wired in D9b (D9d wires the trigger/UI — the
  D9a-dark precedent) · reserved KK/Comeback/Bust not emitted · voteWeight null · no defensive-fame blend (Phase-2).
  **D9c (MOY) + D9d (UI/finalize/recompute) QUEUED.**

- **2026-06-17 (overnight, AUTH-4) — D9b COMMITTED.** Build clean. Captain (Opus) independent audit = **VERIFIED**.
  Diff = 2 NEW files only (`franchiseAwardsEngine.ts` + test), ZERO existing-file edits (additive/dark). Pure
  `computeFranchiseWarAwards` (5 WAR categories, gated on D8 + frozen membership + adaptive qualifier, deterministic
  sort, candidate margins, GG split seam) + `computeAndPersistFranchiseWarAwards` (loads frozen spine → writes the D9a
  store, finalized:true). **Gates (re-ran):** tsc 0 · build 0 · full suite **7,277 pass / 3 fail (7,280 total)** =
  EXACTLY characterized, ZERO new reds · **DETERMINISM MUTATION-KILL** (99-WAR untrusted row can't win; non-ranking
  mutations → identical winners) · adaptive qualifier SCALES (sub-PA wins MVP at 16g, not 32g — no 162/9) · exclusions
  / trust-off→[] / RoY rookie-set / GG split / persist round-trip · engine never recomputes TV, no app wiring (DARK —
  D9d wires it), versions unchanged. **→ NEXT: D9c (MOY — season-aggregate the live pogAwards PogManagerValueTotal
  composite; 4 pool-normalized inputs [MOY-6]; record term = wins-above-D6-expectation [MOY-3, hard D6 couple, drops
  salary expectation]; no fame tilt [MOY-4]; RETIRE calculateMOYVotes/mwarCalculator salary path + RE-POINT
  AwardsCeremonyFlow.tsx + RatingsAdjustmentFlow.tsx off it FIRST [MOY-5]; weights sim-deferred [MOY-7]; lineup
  quantity = capped realized record [MOY-2 Captain default]). Then D9d (UI/finalize/recompute).**

- **2026-06-17 (overnight, AUTH-4) — STARTED: D9c (Manager of the Year).** Mapped via `wf_0cec26a0-9be` (5 readers,
  Captain-verified). MOY = a season aggregation of the live per-game `pogAwards.PogManagerValueTotal` (read
  `getRecentGames(1000,scope)` → group `managerWpaTotals` by `managerId` → sum tactical/deployment/lineup), + the 4th
  input = wins-above-D6-expectation. **The one modeling fork RESOLVED (FORK-A):** no trusted expected-wins source
  exists (both `franchiseExpectedWinsPreview` + the baseline store are `expectedWinsTrusted:false`, MOY-3-forbidden),
  so expected wins is DERIVED from the frozen artifact: `valueShare × gamesPerTeam` (team value = Σ frozen `trueValue`
  over `trustedPlayerIds` via the frozen `rosterStateSnapshot.teamId` — denomination-free, .500-anchored, sim-tunable);
  actual wins from `calculateStandings`; record = actual − expected (persisted on the row for reproducibility since
  standings read live). Pool-normalize all 4 (min-max [0,1], degenerate→0.5) + equal 0.25 weights (MOY-6/7
  sim-deferred). Gate = D8 trustedForAwards + D6 frozen. Contract in PROMPT_CONTRACTS.md; Codex invoked under the
  30-min watchdog. **DEFAULTS-TAKEN:** FORK-A expected-wins · frozen rosterStateSnapshot team map · capped-realized
  lineup (MOY-2) · min-max norm + 0.25 weights · no fame tilt (MOY-4) · managerId as winnerPlayerId · persist
  actual/expected. **RETIREMENT DEFERRED (confirmed SAFE):** `calculateMOYVotes`'s only 2 call sites
  (AwardsCeremonyFlow:1620, RatingsAdjustmentFlow:388) are triple-gated behind `FRANCHISE_V1_OFFSEASON_EXECUTION_
  ENABLED=false` → no live salary-MOY path; D9c does NOT touch mwar/the Flows; the retire+re-point goes to the
  pre-flag-flip cleanup batch (caveat: re-point BEFORE any flag flip; 2-line grep confirm at cleanup). **D9d QUEUED.**

- **2026-06-17 (overnight, AUTH-4) — D9c COMMITTED → the 6-category awards engine is COMPLETE.** Build clean. Captain
  (Opus) independent audit = **VERIFIED**. Diff = engine +269 (MANAGER_OF_YEAR: season-aggregate the live per-game
  manager composite + the FORK-A wins-above-D6-expectation record term [expected = frozen value-share × gamesPerTeam,
  derived ONLY from the frozen artifact] + min-max pool-norm + equal 0.25 sim-gate weights; folded into
  computeAndPersistFranchiseWarAwards → all 6 categories) + storage +2 (additive nullable managerActualWins/Expected
  Wins) + test +276. **Gates (re-ran):** tsc 0 · build 0 · full suite **7,281 pass / 3 fail (7,284 total)** = EXACTLY
  characterized, ZERO new reds, D9a parity survived the additive fields · **RECORD-TERM DETERMINISM MUTATION-PROVEN**
  (perturb a non-frozen trueValue → MOY unchanged) · degenerate-pool 0.5 / trust-off→null / persist-6 tested · mwar/
  Flows untouched (retirement deferred, safe) · frozen rosterStateSnapshot (not live) · no preview / no TV recompute /
  no flag flip · versions unchanged. **→ NEXT: D9d — the FINAL D9 sub-ticket (AwardsWatchlist UI [new Mode-2 surface,
  NOT the dead-gated offseason ceremony] + per-game watchlist recompute + game-1 franchiseTrueValueSnapshots capture
  on the processCompletedGame chain + the season-end finalize TRIGGER calling computeAndPersistFranchiseWarAwards +
  flip the franchiseSeasonSummary awards-watchlists manifest blocked→live + profile/Almanac display via awardEmblems;
  do NOT flip the offseason flag). Completes D9 → then D10–D13 → soul layer.**

- **2026-06-17 (overnight, AUTH-4) — D9 SPLIT into D9d-1/D9d-2; STARTED: D9d-1 (engine→app wiring).** Mapped via
  `wf_c235f00a-95e` (5 readers, Captain-verified). D9d is large + touches the LIVE game path + adds UI → split:
  **D9d-1 = the backend wiring** (season-end finalize TRIGGER + game-1 snapshot capture); **D9d-2 = the surface**
  (AwardsWatchlist tab + per-game watchlist PREVIEW [the pure engine returns [] mid-season by design — needs the
  looser `warLikePreviewAvailable` path / on-read computation, NOT a mid-season store write] + the season-summary
  manifest flip [contract-version + test-pin coordination] + profile/Almanac display via the orphaned awardEmblems
  catalog). **D9d-1:** (1) `processCompletedGame` snapshot capture — surface `persistTrueValueAfterWar` rows, write
  `franchiseTrueValueSnapshots` in the post-WAR block, checkpoint = scheduled gameNumber ?? gameId (deterministic →
  idempotent), one batched put, try/catch-isolated (non-blocking, 10s budget), regular-season gate inherited; (2)
  `FranchiseHome` GameDayContent finalize TRIGGER — `computeAndPersistFranchiseWarAwards` after the awaited freeze in
  `checkSeasonComplete` (byte-stable computedAt=frozenAt) + chained via `.then` on the `isSeasonOver`-effect freeze.
  Contract in PROMPT_CONTRACTS.md; Codex invoked under the 30-min watchdog. **DEFAULTS-TAKEN:** checkpoint = scheduled
  gameNumber ?? gameId (no counter/timestamp) · computedAt = frozenAt · finalize on both season-complete paths
  (mirrors D6b) · snapshot try/catch-isolated · manifest flip + UI deferred to D9d-2. **LIVE-GAME-PATH touch →
  BROWSER-BATCH** (the snapshot capture + the finalize's runtime effect). **D9d-2 QUEUED.**

- **2026-06-17 (overnight, AUTH-4) — D9d-1 COMMITTED.** Build clean. Captain (Opus) independent audit = **VERIFIED**.
  Diff = FranchiseHome +26 (finalize trigger, both season-complete paths) + processCompletedGame +70 (surface TV rows +
  snapshot capture) + new snapshot test. **FREEZE→FINALIZE ordering correct on BOTH paths** (awaited in
  checkSeasonComplete; `.then`-chained on the isSeasonOver effect — no parallel race; computedAt=frozenAt byte-stable).
  **Snapshot capture** deterministic (checkpoint = scheduled gameNumber ?? gameId), idempotent, own try/catch
  (non-blocking, 10s-budget-safe), regular-season-only. **Gates (re-ran):** tsc 0 · build 0 · full suite **7,285 pass /
  3 fail (7,288 total)** = EXACTLY characterized, ZERO new reds · snapshot test (write/readback + re-completion
  idempotency + playoff/elimination exclusion + failure-isolation) · no UI/manifest/flag edit · no mid-season award
  write · versions unchanged. **BROWSER-PENDING (batched, LIVE GAME PATH):** season-end awards finalize+persist;
  per-game snapshot checkpoint captured; no completion regression. **→ NEXT: D9d-2 — the FINAL D9 piece (AwardsWatchlist
  UI [new Mode-2 regular+playoff tab, reads getFranchiseAwardRowsByScope, renders 6 categories + winner + candidate
  margins via the awardEmblems catalog] + the per-game watchlist PREVIEW [looser warLikePreviewAvailable / on-read, NO
  mid-season store write] + the season-summary manifest flip [awards-watchlists blocked→included + awardsImplemented,
  gated on award rows existing; coordinate the contract-version + the franchiseSeasonSummary.wave4 test pin] +
  profile/Almanac display; do NOT flip the offseason flag). Completes D9 → then D10–D13 → soul layer.**

- **2026-06-17 (overnight, AUTH-4) — STARTED: D9d-2 (the awards UI → completes D9).** Contracted directly from the D9d
  map (areas 3-4; no new map). Scope: NEW `AwardsWatchlist.tsx` (Mode-2 regular+playoff tab; reads
  `getFranchiseAwardRowsByScope`; renders the 6 categories + winner + candidate margins via the orphaned `awardEmblems`
  catalog, resolving player/manager names; finalized rows when present, else the in-season PREVIEW) + a read-only
  `computeFranchiseAwardsPreview` (looser `warLikePreviewAvailable` gate, finalized:false, NEVER persisted — the
  finalized engine returns [] mid-season by design) + the manifest flip (awards-watchlists blocked→included +
  awardsImplemented, GATED on rows; bump the stale 'no-awards-manifest-v1' contractVersion; update the
  franchiseSeasonSummary.wave4 test pin). Codex invoked under the 30-min watchdog. **DEFAULTS-TAKEN:** AwardsWatchlist
  fully separate from the dead-gated offseason ceremony (NO flag flip) · preview = looser-gate read-only, no mid-season
  write · manifest flip gated on rows + contractVersion coordinated + wave4 updated (sanctioned baseline shift) ·
  per-player profile/Almanac display = FOLLOW-UP · SeasonSummary PAGE = D10. **USER-VISIBLE → BROWSER-BATCH.** On
  VERIFIED + commit, **D9 COMPLETE** → D10–D13 → soul layer. **Tracked follow-ups:** per-player profile/Almanac award
  display; the mwarCalculator retirement (pre-flag-flip cleanup).**

- **2026-06-17 (overnight, AUTH-4) — COMMITTED: D9d-2 `c229733` → D9 COMPLETE.** 7 code/test files via explicit-path
  staging (NO docs in the feature commit). Independent re-audit (auditor ≠ builder): tsc 0 · `npm run build` exit 0 ·
  FULL suite **7,288 pass / 3 characterized fail (7,291 total, 406 files)** — the only fails are the documented trio
  (wpaRuntimeBoundary / franchiseManualSmokeFixture / franchiseNarrativeEventEligibility); ZERO new reds. Invariant
  greps confirmed: offseason flag UNTOUCHED in the FranchiseHome diff (the awards tab renders behind `seasonPhase !==
  "offseason"`, fully separate from the dead-gated `AwardsCeremonyFlow`) · `AwardsWatchlist.tsx` has NO store write and
  NO AwardsCeremonyFlow/offseason-flag reference (reads `getFranchiseAwardRowsByScope` + `computeFranchiseAwardsPreview`
  only) · `computeFranchiseAwardsPreview` is read-only / looser-gated (`warLikePreviewAvailable`) / `finalized:false` /
  never persisted, and the frozen-gated finalize path is byte-unchanged · manifest flip gated on `finalizedAwardRows.
  length > 0` with the contractVersion coordinated (wave4 pin updated as a sanctioned baseline shift + a new
  blocked-when-absent case) · TRACKER_DB_VERSION 18 / KBL_BACKUP_VERSION 2 unchanged. **D9 COMPLETE** (D9a→D9d-2 all
  committed this run). **SESSION ENDED — JK-directed close after D9; a fresh session resumes at D10.** Tracked D9
  follow-ups remain: per-player profile/Almanac award display; the mwarCalculator/calculateMOYVotes retirement
  (pre-flag-flip cleanup — re-point AwardsCeremonyFlow:1620 + RatingsAdjustmentFlow:388 BEFORE any flag flip).

---

## 2026-06-17 (attended → AUTH-4 mid-session) — L6 COMPLETE; AUTH-4 resumed for the L-stack

- **Session began ATTENDED** (JK present), resuming at L6b. Completed the full L6 (Fame) layer, every diff Codex-built →
  Opus-audited independently (auditor ≠ builder; full-suite re-run, diff read, invariant greps — never the builder paste):
  - **L6b-1 `3b36d35`** — `franchiseFameRecords` store + 3-place backup parity (trackerDb **v18→v19**, optional:true,
    `KBL_BACKUP_VERSION` stays 2), dark/EMPTY (no writer; zero non-test callers). *Dispatch #1 BLOCKED correctly* on the
    `franchiseSeasonLedgerStorage.test.ts` version-pin (a file my contract missed — swept all version/store-list pins,
    added the one real file, captured the trap to memory). Suite 7,269/2-char-fail.
  - **L6b-2 `5a7685a`** — Phase-2 fame flag (default OFF) + per-game DARK fame compute + `processCompletedGame` wiring
    (decay-on-write, reach ratchet, wasNegative latch, re-entry guard; event-driven, **WAR-gravity DEFERRED per JK**;
    inactive-player no-decay per JK). *One FIX round*: build #1 hand-rolled a raw `kbl-schedule` open (data-integrity
    class) → Opus caught it in audit → replaced with the canonical `getScheduledGame` (mirrors D9d-1), locked by a
    no-raw-open source-scan test. Suite **7,273 pass / 2 characterized fail (7,275 total, 409 files)**.
  - **L6 COMPLETE** = L6a `7359cbf` + L6b-1 `3b36d35` + L6b-2 `5a7685a`, all dark behind `isFranchisePhase2FameEnabled()`.
- **CHARACTERIZED SET is now 2** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`) — DR-1 cleared the third
  (`franchiseNarrativeEventEligibility`) earlier this arc. Build baseline: **7,273 / 409**, trackerDb **v19**,
  `KBL_BACKUP_VERSION` 2.
- **BROWSER-BATCH added (persistence-prioritized):** (A) real franchise DB migrates v18→v19 cleanly + backup/restore
  round-trips (L6b-1, empty store); (B) completing a real game with the fame flag OFF writes nothing + the game still
  archives within PROCESSING_TIMEOUT (L6b-2 live-game-path).
- **MID-SESSION: JK left → switched to AUTH-4 (fully autonomous overnight).** New non-negotiable protocols adopted from
  SESSION_RULES.md: **WAITING-ON-JK** (genuine-need-JK items → one exact-format line in `./WAITING_ON_JK.md`, keep
  working, never idle if other work exists) and **CONTEXT-HANDOFF** (compaction-near → full Session End + write
  `HANDOFF_NEEDED`). No AskUserQuestion while unattended.
- **NOW ROLLING: L5 (fan teeth).** Per DSTACK:75 — connect `fanMoraleEngine` + build the teeth; owns the **§8 dampener
  PRIMITIVE** (L8 consumes) + the **flashpoint-decay accumulator** (new store) + **in-season trade-request generation**
  (FA-attraction deferred LSD-2, budget pressure cut LSD-4) + a reporter-intensity tooth. Splitting like L6: **L5a** =
  the pure §8 dampener primitive (started — directional counter-trend brake, personality × Resilience/Ambition,
  sim-tuned, shape-locked) → **L5b** = flashpoint-decay store (dark, backup DoD) → **L5c** = trade-requests → **L5d** =
  reporter tooth. Deps L1+L3 done.

- **2026-06-17 (AUTH-4) — COMMITTED: L5a `428f7cb`** (the pure §8 fan-morale ratings dampener). Codex 5.5 built → Opus
  independently audited: tsc 0 · build 0 · FULL suite **7,280 pass / 2 characterized fail (7,282 total, 410 files)**,
  ZERO new reds (+7 tests / +1 file from 7,273/409). Engine read in full + grep-verified: pure (no Math.random/Date.now/
  IO/store/reporter), brake invariant `|dampened| ≤ |delta|` + sign-preserved holds mathematically (dampenStrength
  clamped to maxDampen 0.9 → factor ∈ [0.1,1]); counter-trend-only (with-trend passes through untouched); direction→
  modifier routing (down→Resilience, up→Ambition) isolated; personality spread + Droopy up<down asymmetry; all
  magnitudes in `FAN_DAMPENER_TUNING`; `masterMoraleMatrix.ts`/`fanMoraleEngine.ts` byte-unchanged. No consumer yet (L8
  consumes it). DEFAULTS-TAKEN (§16-tunable): Loyalty-1.4 = loyalty-modifier amplification; Droopy {down:0.7,up:0.5};
  baseStrength 0.6 / maxDampen 0.9 / resilience+ambition atZero 0.6.

- **2026-06-17 (AUTH-4) — CONTEXT-HANDOFF at L5b.** Heavy session context (full session-start reads + the 6-reader L6b
  grounding + three build/audit cycles), clean ticket boundary → ran the full Session End Protocol (CURRENT_STATE live
  header rewritten, SESSION_LOG + CURRENT_STATE_HISTORY appended, this log) + wrote `HANDOFF_NEEDED`. **Fresh session
  resumes at L5b under AUTH-4** (the standing go). Run so far this AUTH-4 stint: L6b-1 `3b36d35`, L6b-2 `5a7685a`
  (→ L6 COMPLETE), L5a `428f7cb`. Nothing pushed.
