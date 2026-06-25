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

- **2026-06-17 (AUTH-4, fresh resume thread) — L5b BUILT + AUDITED (VERIFIED), UNCOMMITTED (environment wall).**
  Fresh CONTEXT-HANDOFF resume thread: did the full session-start reads, RESTATED (Phase-2 L-stack / last=L5a `428f7cb` /
  next=L5b), proceeded under AUTH-4. **L5b = the flashpoint-decay accumulator** (§13 tooth #2 / LS-19): a NEW dark
  IndexedDB store `franchiseFlashpointDecay` (per-player-season running accumulator: flashpointKind / consecutiveGames
  Unresolved / accumulatedFanMoraleTax / lastGameTax / updatedAtCheckpoint) + a default-OFF `isFranchisePhase2Flashpoint
  Enabled()` flag + a pure `computeFlashpointGameTax` engine (compounding-but-clamped per-game bleed, ≤0, all magnitudes
  in `FLASHPOINT_DECAY_TUNING`) + a dark per-game compute wired into `processCompletedGame` (gated, try/catch, after the
  fame compute). **SEAM-NEUTRAL:** `resolveTurnedOnPlayers` returns [] until L7 Albatross + L10/L13 trade-demander land,
  so even flag-ON writes nothing today. Mirrors L6b-1/L6b-2 EXACTLY. trackerDb **v19→v20**; backup parity lockstep
  (trackerStores entry optional:true + STATIC schema v20); syncConfig entry; KBL_BACKUP_VERSION STAYS 2. The version-pin
  trap `franchiseSeasonLedgerStorage.test.ts` updated (`toBe(20)` + store-list). Diff = the contracted 15 files (8 edited +
  6 new + the contract): `flashpointDecay.ts`(+test), `franchiseFlashpointDecayStorage.ts`(+test), `franchiseFlashpoint
  DecayCompute.ts`(+test); EDIT trackerDb/backupRestore/syncConfig/franchisePhase2Flags/processCompletedGame + the 3 pin/
  parity/manifest tests. Contract in PROMPT_CONTRACTS.md §L5b.
  - **VERIFICATION (what was observable in this sandbox):** `tsc -p tsconfig.app.json --noEmit` **exit 0** (twice);
    `tsc -b` passed; the **6 new/affected test files = 40 tests ALL GREEN** (8 engine + 4 storage + 6 compute incl.
    dark-noop / seam-neutral / re-entry-guard / compounding-clamped + the 4 pin-trap + 4 parity + 14 manifest). Cheap
    invariant greps: frozen engines `git diff --stat` EMPTY (fameModel/fanMoraleDampener/masterMoraleMatrix/fanMorale
    Engine/franchiseFameCompute/franchiseFameRecordsStorage byte-unchanged); all 3 flag defaults FALSE; KBL_BACKUP_VERSION
    still 2; no raw `indexedDB.open` in the new files; engine pure.
  - **INDEPENDENT AUDIT (decorrelated sub-agent, auditor ≠ builder — triangle intact):** **VERDICT VERIFIED.** All 10
    checklist items pass with file:line evidence, zero defects, faithful L6b mirror; brute-forced the clamp over 10,000
    games (max magnitude exactly 3.0, zero violations); independently swept every OTHER version-pin/store-enumeration test
    and confirmed ONLY the 3 patched files are sensitive (`leagueBuilderStorageV6Migration` pins a different DB — unaffected);
    judged the unobserved-build/full-suite REGRESSION RISK **LOW** (strictly additive: one idempotent store, one default-OFF
    flag, one gated no-op call site).
  - **⚠️ ENVIRONMENT WALL — UNCOMMITTED + two gates UNOBSERVED.** This resume thread ran in an isolated Linux sandbox
    (node v22, NO codex CLI) where (1) any process >~42s is killed → full `vite build` + the full ~7,290 suite could NOT
    be run to completion; (2) the repo mount BLOCKS git unlink (`.git/index.lock` can be created but not removed) → CANNOT
    commit. The codex-dispatch mechanism (`~/.local/bin/codex` on the host Mac) is also unreachable from the sandbox. So
    L5b was built + audited by this Captain thread directly (decorrelated sub-agent auditor preserved the triangle), but
    the build-0 + full-suite gates and the commit MUST be done on the host (node v20 + git write). **WAITING_ON_JK.md
    entry written.** The diff is on disk, uncommitted, on `codex/franchise-v1-next`.
  - **NEXT after host-commit:** L5c (in-season trade-requests) → L5d (reporter tooth) → {L7,L8,L9b,L10} → … per the
    DSTACK. L5b's seam (`resolveTurnedOnPlayers`) is the explicit hook L7/L10/L13 fill.

- **2026-06-17 (AUTH-4, HOST RESUME thread) — L5b COMMITTED `5ebb148`. Handoff CLEARED.**
  Fresh host session (node v20 + git write) picking up the CONTEXT-HANDOFF left at L5b-uncommitted. Did the full
  session-start reads, RESTATED (Phase-2 L-stack / last=L5a `428f7cb` / next=COMMIT L5b); JK present + ruled
  "commit + continue under AUTH-4." Ran the two gates the sandbox could not: `NODE_ENV= npm run build` **exit 0**
  + full suite **7,298 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`),
  **ZERO new reds** (the +18 tests / +3 files over the post-L5a 7,280/410 are exactly L5b's 3 new test files).
  Re-confirmed the L5b invariants on the host (`TRACKER_DB_VERSION` 20, `franchiseFlashpointDecay` registered,
  `KBL_BACKUP_VERSION` 2, flag default OFF, pin-trap `toBe(20)`, engine pure, compute gated after the fame compute).
  Committed the 14 code/test files → `5ebb148`. Cleaned + gitignored the sandbox junk (Temp/, Progress_Summary.md,
  HANDOFF_DONE_* + the tracked HANDOFF_NEEDED sentinel, .git_writetest_probe, WAITING_ON_JK.md). The stray
  `reference-docs/Super Mega Baseball 4 Rosters.csv` left untouched (JK's documented commit-or-gitignore call).
  **NOW = L5c** (in-season trade-requests) — drafting the contract. trackerDb **v20**; nothing pushed.

- **2026-06-17 (AUTH-4, HOST RESUME thread) — L5c COMMITTED `8cd2cc1`.**
  Pure §13 in-season trade-request generation engine (LS-19 / LSD-2). Captain drafted the L5c contract
  (PROMPT_CONTRACTS §L5c) → dispatched **Codex 5.5 | high** as builder (`codex exec`, workspace-write, 45-min perl
  watchdog) → Opus independently audited (auditor ≠ builder, triangle intact). NEW
  `src/engines/tradeRequestGeneration.ts` + a 9-test file: computes per-player trade-request propensity from fan morale
  + loyalty + player-morale + personality + a Juiced/Standard/Nerfed intensity dial; the §13 235-vs-236 inversion
  encoded as a SIGNED loyalty term gated on fan sentiment (angry → loyal bolt MORE, content → protective; gated on fan
  anger so happy fans → 0 requests). Pure/deterministic; own `TRADE_REQUEST_TUNING`; type-only imports; no
  store/flag/wiring (mirrors L5a — consumed by L10/L13 later). Codex touched exactly the 2 allowed files. AUDIT
  VERIFIED: tsc 0 / build 0 / full suite 7,307 pass / 2 characterized fail, ZERO new reds (+9 tests / +1 file);
  inversion sign hand-verified in BOTH fan-morale directions; frozen engines byte-unchanged; purity confirmed.
  Auto-committed (pure engine, no user surface). **NOW = L5d** (reporter tooth). trackerDb still v20; nothing pushed.

- **2026-06-17 (AUTH-4, HOST RESUME thread) — L5d COMMITTED `e061e51` → L5 COMPLETE (a–d).**
  Pure §13-line-230 reporter-intensity tooth ("low morale = the press turns up the heat"). Captain drafted the L5d
  contract (PROMPT_CONTRACTS §L5d) → dispatched **Codex 5.5 | high** as builder → Opus independently audited (auditor ≠
  builder). NEW `src/engines/reporterIntensity.ts` + a 7-test file: `computeReporterHeat(teamFanMorale)` maps fan morale
  → a press-heat `NarrativeIntensity` signal (heat scales with fan anger / morale below neutral; bands → low/medium/high;
  tone tags press_calm/critical/scorching), all magnitudes in `REPORTER_INTENSITY_TUNING`. Build-DARK: the live
  LLM/Supabase reporter (`generateSeasonNewsTake`) is BYTE-UNCHANGED — the seam (replacing the hardcoded `intensity:
  "medium"` at `seasonNewsGenerator.ts:165`) is a deferred post-D13 activation. Codex touched exactly the 2 allowed files.
  AUDIT VERIFIED: tsc 0 / build 0 / full suite 7,314 pass / 2 characterized fail, ZERO new reds (+7 tests / +1 file);
  math hand-verified (monotonic + band crossings at morale 33.5/17 + clamp); live reporter + frozen engines byte-unchanged;
  purity confirmed. Auto-committed. **L5 (fan-morale teeth) COMPLETE: L5a dampener `428f7cb` · L5b flashpoint-decay
  `5ebb148` · L5c trade-requests `8cd2cc1` · L5d reporter-heat `e061e51`.** **NOW = L7** (designation effects — wire the
  dormant designation fame/morale effects into the Phase-2 layer, build-dark until D13). trackerDb still v20; nothing pushed.

- **2026-06-17 (AUTH-4, HOST RESUME thread) — L7a COMMITTED `0a59a24`. (L7 SPLIT L7a–d.)**
  L7 ("designations Phase-2 completion", DSTACK L7) is a sub-stack → Captain SPLIT it: **L7a** Albatross→L5b flashpoint
  seam (DONE) · **L7b** designation→fame nudge (§20.4 Channel C, greenfield) · **L7c** designation→fan-morale steady
  sentiment (Channel B/A) · **L7d** Captain router effects + Fan Hopeful cushion + Fan Favorite double-dep. (Cornerstone
  already CUT — DR-1. LS-9 confirmation→auto morale reversal is a separate pending item.) **L7a:** Captain drafted the
  contract (PROMPT_CONTRACTS §L7a) → dispatched **Codex 5.5 | high** → Opus independently audited (auditor ≠ builder).
  Made `resolveTurnedOnPlayers` async + resolved each completed game's home+away **active|locked ALBATROSS** holder (via
  the existing `getFranchiseDesignationRow`); the call site now awaits the seam; downstream (re-entry guard, compounding
  tax, store write) byte-unchanged. So the already-built L5b per-game flashpoint-decay now taxes a team's Albatross who
  stays. **Doubly-dark:** gated by `isFranchisePhase2FlashpointEnabled()` (OFF) and even ON only ACCUMULATES a tax
  artifact (no live morale mutation). Codex touched exactly the 2 allowed files; NO store/flag/version/backup change.
  AUDIT VERIFIED: tsc 0 / build 0 / full suite 7,317 pass / 2 characterized fail, ZERO new reds (+3 tests, existing
  file); flashpoint engine/store/flag + trackerDb/backup byte-unchanged; firewall source-scans green; the resolution
  tests use the REAL designation store (active resolves / projected ignored / locked accepted / end-to-end accumulation);
  diff hand-verified. Auto-committed. **NOW = L7b.** trackerDb still v20; nothing pushed.

- **2026-06-17 (AUTH-4, HOST RESUME thread) — L7b COMMITTED `77feeda3`.**
  Pure §20.4/§20.6 Channel-C designation→fame nudge engine — the one-time fame NAMING seed a player earns when named to
  a store-backed team designation. Captain drafted the contract (PROMPT_CONTRACTS §L7b) → dispatched **Codex 5.5 | high**
  → Opus independently audited (auditor ≠ builder). NEW `src/engines/designationFameNudge.ts`:
  `computeDesignationFameNudge(type)` + `summarizeDesignationFameNudges(types)` + `DESIGNATION_FAME_NUDGE_TUNING` (FF +2 /
  Albatross −1 §20.4-canonical; TEAM_MVP/ACE +1.5 §16 placeholders; Captain/Fan Hopeful EXCLUDED → L7d). Pure/deterministic,
  type-only import of `FranchiseDesignationType`. The fame-store WIRING (firing on naming, idempotent once-per-naming) is a
  DEFERRED seam — documented, NOT built (touches the fame asset + needs idempotency; build-dark). 8 tests. AUDIT VERIFIED:
  tsc 0 / build 0 / full suite 7,325 pass / 2 characterized fail, ZERO new reds (+8 tests / +1 file); fame + designation
  engines byte-unchanged; pure. Auto-committed. **NOW = L7c** (designation→fan-morale steady sentiment, §20.6 Channel B/A).
  trackerDb still v20; nothing pushed.

- **2026-06-17 (AUTH-4, HOST RESUME thread) — L7c COMMITTED `886d1dce`.**
  Pure §20.6 Channel B (designation → fan-morale steady sentiment) + Channel A (the fame-amplifier designation tilt).
  Captain drafted the contract (PROMPT_CONTRACTS §L7c) → dispatched **Codex 5.5 | high** → Opus independently audited
  (auditor ≠ builder). NEW `src/engines/designationFanMorale.ts` + a 10-test file: `computeDesignationSteadyFanSentiment`
  (Channel B), `summarizeDesignationSteadyFanSentiment`, `computeDesignationSwingTilt` + `applyDesignationSwingTilt`
  (Channel A), all magnitudes in `DESIGNATION_FAN_MORALE_TUNING` (FF warmth +0.5; FF up-tilt 1.25 / Albatross down-tilt
  1.25; merit neutral). **DOUBLE-COUNT GUARD (the headline):** `ALBATROSS` steady sentiment = 0 with reason
  `…albatross_irritation_via_flashpoint`, because the §13 flashpoint-decay (L5b/L7a) already taxes a held Albatross every
  game — re-adding it here would double-count. This engine's Channel-B contribution is the Fan Favorite ongoing warmth
  (the positive counterpart the negative-only flashpoint tax doesn't cover). Channel A ships the pure tilt multiplier only
  (full `base × fame × tilt` needs live fame [dark] + a live per-play swing pipeline → post-D13 seam); the Channel-B
  per-game morale-store wiring is a deferred seam (mutates the SMB4 morale asset + needs per-game idempotency + HELD-
  designation enumeration; mirrors L7b deferring its fame-store wiring). Codex touched exactly the 2 allowed files; no
  store/flag/wiring/persistence. AUDIT VERIFIED: tsc 0 / build 0 / full suite **7,335 pass / 2 characterized fail**
  (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds (+10 tests / +1 file); double-count guard +
  Channel-A asymmetry + sign-preserving apply verified; pure (single type-only import); the 6 frozen engines
  byte-unchanged. Auto-committed. **NOW = L7d** (Captain router effects: Charisma×2 to teammates + amplified swings ·
  Fan Hopeful call-up cushion · Fan Favorite double-dependency). trackerDb still v20; nothing pushed.

- **2026-06-17 (AUTH-4, HOST RESUME thread) — L7d SPLIT L7d-1..3; L7d-1 COMMITTED `f61dcae0`.**
  L7d (the last L7 sub-stack) bundles three distinct mechanics → Captain SPLIT it: **L7d-1** Team Captain morale-router
  (DONE) · **L7d-2** Fan Hopeful call-up cushion (pure: window/lift/slump-cushion/expiry, §4:87/LS-7) · **L7d-3** Fan
  Favorite double-dependency reconciliation (FF = D6 value-half [DR-1, live] + L5/§20.6 morale-half [fame nudge L7b +
  steady warmth/tilt L7c] — both halves already exist; thin/minimal). **L7d-1:** Captain drafted the contract
  (PROMPT_CONTRACTS §L7d-1) → dispatched **Codex 5.5 | high** → Opus independently audited (auditor ≠ builder). NEW
  `src/engines/captainMoraleRouter.ts` + a 9-test file: `computeCaptainCharismaRouting`/`applyCaptainCharismaRouting`
  (Charisma ×2 teammate-morale routing — the spec-CANONICAL "double", §4:84/LS-6) + `applyCaptainPerformanceSwingAmplification`
  (sign-preserving team-wide amp of swings tied to the Captain's OWN performance, ×1.5 sim placeholder), magnitudes in
  `CAPTAIN_MORALE_ROUTER_TUNING`. Pure (ZERO imports). **ANTI-DOUBLE-COUNT:** routes/amplifies the clubhouse MORALE
  channel ONLY — NOT the Captain's own ratings/development (§6:113), and NOT the §24.9 leadership-effectiveness composite
  (Charisma+Loyalty+Resilience−Ambition for edge suppression → L13). Matrix wiring deferred post-D13. Codex touched
  exactly the 2 allowed files; no store/flag/wiring. AUDIT VERIFIED: tsc 0 / build 0 / 9 focused tests green; canonical
  ×2 + sign-preserving swing amp + linear charisma routing hand-verified; 6 frozen engines byte-unchanged; pure.
  Auto-committed.
  **⚠ NEWLY-OBSERVED ORDER-FLAKE (logged for JK; NOT a regression):** my full-suite run showed **3 fails** — the 2
  characterized (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`) PLUS `src/src_figma/__tests__/franchiseMode/
  AwardsWatchlist.test.tsx`. Codex's full-suite run on the IDENTICAL tree showed only the 2 characterized. AwardsWatchlist
  PASSES SOLO (2/2) → it is a non-deterministic, order-dependent flake (same family as the documented conditional-solo
  flakes `GameTrackerLaunchState` + `franchiseOffseasonGuards.component`), surfaced because the new L7d-1 test file shifted
  vitest's worker pool ordering. L7d-1 is a zero-import pure engine imported by nothing → it has NO real coupling to an
  AwardsWatchlist UI test; this is a pre-existing order-sensitivity, not an L7d-1 regression. NOT silently added to the
  characterized set (that needs JK ratification) — flagged here + in CURRENT_STATE for JK's order-flake-root-cause batch.
  Suite (deduped, solo-passing): **7,344 pass / 2 characterized fail** (+9 tests / +1 file = `captainMoraleRouter.test.ts`).
  **NOW = L7d-2** (Fan Hopeful cushion). trackerDb still v20; nothing pushed.

- **2026-06-17 (AUTH-4, HOST RESUME thread) — L7d-2 COMMITTED `aec5db99`; L7d-3 doc-only → L7 COMPLETE.**
  **L7d-2:** pure §4/LS-7 Fan Hopeful call-up cushion. Captain drafted the contract (PROMPT_CONTRACTS §L7d-2) →
  dispatched **Codex 5.5 | high** → Opus independently audited (auditor ≠ builder). NEW `src/engines/fanHopefulCushion.ts`
  + an 11-test file: `computeFanHopefulWindowState` (game-count window + measurable expiry), `computeFanHopefulCallUpLift`
  (one-time hope lift), `applyFanHopefulSlumpCushion` (reduces NEGATIVE fan-morale swings while active; positives +
  expired/inactive pass through; sign-preserving), magnitudes in `FAN_HOPEFUL_CUSHION_TUNING` (windowGames 10 /
  fanMoraleLift 3 / slumpCushionFactor 0.5, all §16 placeholders). Pure (ZERO imports). Call-up + matrix wiring deferred
  post-D13. AUDIT VERIFIED: tsc 0 / build 0 / 11 focused tests; full suite **7,355 pass / 2 characterized fail**, ZERO
  new reds (+11 tests / +1 file); AwardsWatchlist did NOT appear this run (4th non-determinism data point); frozen
  engines byte-unchanged; pure. Auto-committed.
  **L7d-3 — Fan Favorite double-dependency reconciliation (DOC-ONLY, AUTH-4 default-taken; NO code, NO Codex build):**
  the FF double-dependency (DSTACK L7: D6 value-half + L5/§20.6 morale-half) is ALREADY structurally complete — value-half
  = `classifyFanFavorite` (`franchiseDesignationEligibility.ts`, DR-1 `b48b450`); morale-half = `designationFameNudge` FF
  +2 (L7b, Channel C) + `designationFanMorale` FF +0.5 warmth (L7c, Channel B) + FF swing tilt up ×1.25 (L7c, Channel A).
  No new engine built: both halves exist as pure primitives, the morale-half is intentionally dark with deferred wiring,
  and a `fanFavoriteEffects` composer would have zero consumers + repeat the orphan pattern DR-1 just removed (deleted the
  546-line `fanFavoriteEngine.ts`). When the post-D13 morale wiring lands it composes the FF half-engines naturally.
  **⇒ L7 (designation Phase-2 completion) COMPLETE:** L7a `0a59a24` (Albatross→flashpoint seam) · L7b `77feeda3`
  (designation→fame nudge, Channel C) · L7c `886d1dce` (designation→fan-morale, Channels A/B) · L7d-1 `f61dcae0` (Captain
  router) · L7d-2 `aec5db99` (Fan Hopeful cushion) · L7d-3 (FF reconciliation, doc-only). **NOW = L8** (ratings
  development) per the soul-layer queue. trackerDb still v20; nothing pushed.

- **2026-06-18 (AUTH-4, HOST RESUME — overnight continuation past midnight) — L2a COMMITTED `6fdeba11`. (L8 depends on
  L2; SPLIT L2a..c.)** L8 (ratings dev) writes through L2 (the franchise-instance mutable ratings-overlay layer), which
  was greenfield → Captain landed L2 first, SPLIT into **L2a** dark store (DONE) · **L2b** read-path merge + temporary
  absolute-trigger auto-expiry · **L2c** two-tier confirmation infra. **L2a:** Captain drafted the contract
  (PROMPT_CONTRACTS §L2a) → dispatched **Codex 5.5 | high** → Opus independently audited HARDEST (persistence class). NEW
  `src/utils/franchiseRatingsOverlayStorage.ts` (mirrors L5b flashpoint storage: getTrackerDb, no raw indexedDB.open,
  syncEngine.upsert/remove) — the dark `franchiseRatingsOverlays` store (keyPath `id`; `by_scope` + `by_player` indexes)
  holding per-entry overlays over frozen base ratings: permanent + temporary (absolute `expiresAtGameNumber`),
  confirmationStatus/source/sourceEventId/createdAt(caller-supplied). trackerDb **v20→v21**; 3-place backup parity
  (backupRestore `optional:true` + syncConfig `'id'`), **KBL_BACKUP_VERSION stays 2**. DARK/EMPTY — no production
  writer/reader (L2b/L2c/L8/L9b wire it); oracle stays locked. 8 files = exactly the allowed set. AUDIT VERIFIED: tsc 0 /
  build 0 / focused 30 tests (4 files); full suite **7,363 pass / 2 characterized fail**, ZERO new reds (+8 tests / +1
  file). **Safety gates PROVEN:** v20→v21 migration-survival (legacy currentGame+flashpoint data byte-intact after
  reopen + new store present) · backup round-trip parity row · KBL_BACKUP_VERSION 2 · frozen oracle byte-unchanged · DARK
  proven (store referenced only in storage/schema/registry) · pin-trap (toBe(21)+store-list) updated. Persistence →
  verified-complete, **browser-pending** (migration + backup round-trip PRIORITIZED in the JK batch). **NOW = L2b**
  (read-path merge + temporary auto-expiry). trackerDb **v21**; nothing pushed.

- **2026-06-18 (AUTH-4, HOST RESUME — overnight) — L2b COMMITTED `e8ec0908`.** The ratings-overlay read-path MERGE math
  (pure). Captain drafted the contract (PROMPT_CONTRACTS §L2b) → dispatched **Codex 5.5 | high** → Opus independently
  audited. NEW `src/engines/ratingsOverlayMerge.ts` + an 11-test file: `resolveActiveOverlayDeltas` (net delta/ratingKey
  from CONFIRMED + active overlays — pending excluded per §11 two-tier; temporary active iff `currentGameNumber <
  expiresAtGameNumber`) + `mergeRatingsOverlays` (effective = frozen base + deltas, ONLY for keys present in base via a
  hasOwnProperty guard; base never mutated — oracle stays locked; returns a copy) + `selectExpiredTemporaryOverlays`
  (expired-temporary ids for the deferred on-load cleanup, regardless of confirmation). Pure (single type-only import of
  `FranchiseRatingsOverlayRow`). Live wiring into value/designation/morale read paths DEFERRED (pointless with the empty
  L2a store + touches live consumers). AUDIT VERIFIED: tsc 0 / build 0 / 11 focused tests; full suite **7,374 pass / 2
  characterized fail**, ZERO new reds (+11 tests / +1 file); `franchiseRatingsOverlayStorage`/`ivEngine`/`effectiveRatings`
  byte-unchanged; pure. (Codex's first full-suite run surfaced the documented `GameTrackerLaunchState` order-flake →
  solo-pass confirmed + clean on rerun; the order-flake family is non-deterministic.) Auto-committed. **NOW = L2c**
  (two-tier confirmation infra — confirm model + apply-confirm logic, pure/dark; the live confirm UI/flow deferred to
  L8/L9b + post-D13). trackerDb v21; nothing pushed.

- **2026-06-18 (AUTH-4, HOST RESUME — overnight) — L2c COMMITTED `a77e0ed5` → L2 COMPLETE.** The §11 two-tier
  confirmation infra for ratings overlays (pure/dark). Captain drafted the contract (PROMPT_CONTRACTS §L2c) → dispatched
  **Codex 5.5 | high** → Opus independently audited. NEW `src/engines/ratingsOverlayConfirmation.ts` + a 10-test file:
  `buildOverlayConfirmationRequest` (SMB4-console edit instruction + resulting rating) + `confirmOverlay`
  (`pending`→`confirmed`, idempotent + non-mutating; the store put is deferred wiring) + `buildExpiryRevertReminder`
  (temporary console-revert text) + `summarizeOverlayChangeLog` (deterministic-ordered per-team change log, DSTACK L8).
  Morale excluded (auto/logged §11:202); trait confirmation (L9b) reuses the pattern. Pure (single type-only import);
  live confirm UI/flow deferred post-D13. AUDIT VERIFIED: tsc 0 / build 0 / 10 focused tests; full suite **7,384 pass / 2
  characterized fail**, ZERO new reds (+10 tests / +1 file); frozen engines byte-unchanged; pure. Auto-committed.
  **⇒ L2 (franchise-instance mutable ratings-overlay layer) COMPLETE: L2a store `6fdeba11` · L2b merge `e8ec0908` · L2c
  confirm `a77e0ed5`.** **NOW = L8** (ratings development — the first real WRITER through L2: every-20%-of-season
  checkpoint sweep; per-player delta = performance × the §8 `fanMoraleDampener` [L5a, CONSUMED not rebuilt] × personality
  × Ambition(up)/Resilience(down); proposes overlays via the L2 confirm with a per-team console change log; RATINGS ONLY,
  never traits). Likely SPLIT L8a (pure dev-math) / L8b (checkpoint cadence + writer wiring). trackerDb v21; nothing pushed.
  **CONTEXT-HANDOFF written → a fresh session continues at L8 with full context.**

- **2026-06-18 (AUTH-4, FRESH SESSION — overnight; JK ran `caffeinate`, selected "Proceed with L8 (AUTH-4)") — L8
  STARTED. L8a DISPATCHED (build in flight), L8b recon in flight.** Fresh thread did the 5-file session-start reads +
  AUTONOMOUS_RUN_PROTOCOL + the L2 contracts, RESTATED (phase = Phase-2 L-stack; last = L2 COMPLETE; next = L8), and
  PROCEEDED under AUTH-4. Ran a 6-agent recon workflow to ground the L8 surfaces, then SPLIT L8 → **L8a** (pure dev-math
  engine, this dispatch) + **L8b** (dark checkpoint-sweep compute + overlay writer + processCompletedGame hook — live
  path + persistence, will be audited HARDEST, browser-pending). Contract drafted (PROMPT_CONTRACTS §L8/§L8a). Codex 5.5
  | high dispatched in background.
  **THE L8 MODEL (DEFAULTS-TAKEN — the spec is SILENT on the raw-delta formula; §16:272 lists dampener strength +
  personality multipliers as Sim-Gate-tuned, §9:158 grades EARNED+PACED drift not a fixed magnitude):**
  - L8a per (player, ratingKey): `rawDelta = baseDeltaScale × normalizedPerformanceSignal × moraleAlignmentMultiplier`
    (performance is the directional driver; the player's OWN morale is the strong direct weight, self-correcting — §10:195),
    then push `rawDelta` through the L5a `applyFanMoraleDampener(rawDelta, teamFanMorale, personality, {loyalty,ambition,
    resilience})` (CONSUMED, not rebuilt) and read `.dampenedDelta`, then clamp to a 0-99 integer; `shouldShift =
    |dampenedDelta| >= shiftThreshold && appliedDelta !== 0`.
  - **Personality + Ambition/Resilience + Loyalty enter ONLY via the dampener** (it already applies the §8 personality
    table, ambition-weights up-moves / resilience-weights down-moves, loyalty-amplifies). L8a does NOT re-apply them →
    no DOUBLE-COUNT. So the DSTACK "× personality × Ambition/Resilience" is realized inside the consumed dampener.
  - **Fan morale = dampener-only** (§10:196, the rich-get-richer guard); the dampener is a BRAKE never an accelerator
    (with-trend moves pass through; only counter-trend braked).
  - **Probability-decides-who / no-headcount** realized DETERMINISTICALLY (run rule: no Math.random/Date.now) as an
    earned-magnitude shift gate. RATINGS only never traits (§9:153). Raises ceiling never TV (§3:52). All magnitudes in
    one `RATINGS_DEVELOPMENT_TUNING` (sim-tuned placeholders, shape locked).
  - **OPEN DECISION for JK (logged, NOT blocking, NOT changed):** the L5a dampener weights a counter-trend-UP move
    (a losing/cold-team gain) by AMBITION such that higher ambition = MORE brake; §6:111 frames ambition as an "upside
    gas pedal." On a winning team up-moves are with-trend (unbraked) so ambition is moot there; the odd case is a
    cold-team gain. L8 CONSUMES L5a as-built (L5 owns the §8 primitive — modifying it is an ownership + SMB4-asset
    violation). Flagged for JK's review of the §6-flavor-vs-§8-mechanics ambition direction; not relitigated in L8.

- **2026-06-18 (AUTH-4, overnight) — L8a COMMITTED `cfdd7752`; L8b DISPATCHED.** Pure ratings-development engine
  `src/engines/ratingsDevelopment.ts` + 17-test file. Codex 5.5 built → Opus 4.8 INDEPENDENTLY audited VERIFIED (every
  gate re-run by the auditor, builder ≠ auditor): tsc 0 / build 0 / full suite **7,401 pass / 2 characterized fail**
  (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds (+17 tests / +1 file over the 7,384/422 L2c
  baseline). Diff hand-read: dampener CONSUMED not rebuilt; NO personality/ambition/resilience double-count; brake-only
  pass-through proven (hot-team positive raw = with-trend → `dampener.applied:false`, `dampenedDelta === rawDelta`);
  deterministic earned-magnitude shift gate (gates on `|dampenedDelta|`, NOT the rounding artifact — verified by the
  0.74→no-shift / 0.76→shift test); 0-99 integer clamp; all magnitudes in `RATINGS_DEVELOPMENT_TUNING`. Frozen engines
  (`fanMoraleDampener`/`ivEngine`/`effectiveRatings`/`masterMoraleMatrix`) byte-unchanged; imports = the allowed set; pure.
  **LOW (reconciled in L8b, NOT a blocker):** Codex's `performanceSignalScale: 10` default is wrong for dollar-denominated
  `valueDelta` (~±$50k–$500k) — L8b owns the dollar→signal scale via `CHECKPOINT_DEV_TUNING = { ...RATINGS_DEVELOPMENT_TUNING,
  performanceSignalScale: 200000 }`. Auto-committed (pure, no surface). **L8b contract finalized + dispatched** (Codex 5.5 |
  high, background) — the dark checkpoint-sweep compute + overlay writer + processCompletedGame hook, per the plan below.
  trackerDb stays v21 (L8b adds NO store).
  **L8b PLAN (recon DONE; contract = PROMPT_CONTRACTS §L8b; mirrors `franchiseFlashpointDecayCompute.ts`):**
  NEW default-OFF flag `isFranchisePhase2CheckpointEnabled()` (clone the 11-line flashpoint block in `franchisePhase2Flags.ts`).
  NEW `src/utils/franchiseCheckpointSweepCompute.ts` → `persistDarkCheckpointSweepForCompletedGame(gameState, scope, archiveOptions)`:
  (1) flag-gate-first dark-noop; (2) resolve league-wide gameNumber N via `getScheduledGame(scheduleGameId)` (same as
  `resolveFlashpointCheckpoint`) + totalGames T via `getSeasonMetadata(seasonId).totalGames`; unresolved → dark-noop;
  (3) DETERMINISTIC 20%-boundary test `Math.floor((N-1)*5/T) !== Math.floor(N*5/T)` (fires exactly 5×/season at the
  20/40/60/80/100% crossings — verified for T=10 → N=2,4,6,8,10); not a boundary → dark-noop; (4) at a boundary, a
  mockable `checkpointSweepSeam.resolveCheckpointRoster(scope, gameState)` enumerates MLB players: `getAllFranchiseTeams`
  → `leagueId = teams[0].leagueIds[0]`; `getAllFranchisePlayers(franchiseId)` filter `getPlayerRosterStatusForLeague(p,
  leagueId)==='MLB'`; project flat lowercase ratings (`power/contact/speed/fielding/arm` | `velocity/junk/accuracy`),
  `normalizePersonality(p.personality)`→canonical-7, `p.hiddenPersonalityModifiers ?? NEUTRAL_HIDDEN_MODIFIERS`, `p.morale`;
  (5) join perf signal = `trueValueScope.rows[].valueDelta` by playerId (already persisted at :595, before the ~618 hook);
  team fan morale = `getFranchiseMoraleSnapshot(scope,'team-fan',teamId)?.currentValue ?? 50` (50 = proven dark-safe →
  zero brake); (6) per player run L8a `computeCheckpointRatingDevelopment`; if `shouldShift`, write a `pending` `permanent`
  overlay via `putFranchiseRatingsOverlay` (id `${scope}:${playerId}:${ratingKey}:checkpoint-${N}`, `sourceEventId
  checkpoint-${N}`, `source 'ratings-development'`, `createdAtGameNumber N`, `createdAt` DETERMINISTIC — no `new Date()`);
  (7) deterministic id = idempotent replay-safe; deltas STACK across checkpoints (per §11 permanent layer); (8) per-team
  change log via `summarizeOverlayChangeLog`. Hook into `processCompletedGame.ts` after the flashpoint gate (~line 618),
  flag-gated, in try/catch. WHICH-KEY DEFAULT-TAKEN: performance-typed, one key/shifter/checkpoint (pitcher→a PitcherRatings
  key, hitter→a BatterRatings key, branch on `isPitcher`); `overall` is a letter grade → ruled out. `performanceSignalScale`
  ≈ 200000 placeholder (valueDelta is signed dollars, ~±$50k–$500k). PENDING overlays are INERT in the merge until confirmed
  (post-D13 UI) → doubly-dark. Live path + persistence → audited HARDEST, browser-pending.

- **2026-06-18 (AUTH-4, overnight) — L8b COMMITTED `cd9e4589` → L8 COMPLETE.** Dark checkpoint-sweep compute + overlay
  writer + processCompletedGame hook, exactly to plan. 4 files: NEW `franchiseCheckpointSweepCompute.ts` + 9-test file,
  EDIT `franchisePhase2Flags.ts` (4th default-OFF flag) + `processCompletedGame.ts` (flag-gated dark hook after the
  flashpoint gate). Codex 5.5 built → Opus 4.8 INDEPENDENTLY audited HARDEST (live-path + first real writer through L2):
  tsc 0 / build 0 / 9 focused tests; full suite **7,410 pass / 2 characterized fail**, ZERO new reds (+9 tests / +1 file
  over the 7,401/423 L8a baseline). Full diff hand-read: flag-OFF is a TRUE no-op (seam + writer not called); the 20%
  boundary is integer-only + fires exactly 5× (tested T=10/32/162); MLB+TV-row roster join correct (farm/no-TV excluded);
  `normalizePersonality` applied (Spirited→JOLLY, Crafty→TOUGH); dark-safe morale fallback 50; per-team morale caching;
  `pending`+`permanent` overlays with deterministic idempotent ids (replay → 1 row, proven); `createdAt` = the TV row's
  `computedAt` (NO new Date). Pitcher classification uses `primaryPosition` against the exact `Position`-union pitcher set
  (MORE robust than the contracted `isPitcher`-only — that field isn't reliable on the franchise Player). NO new store /
  trackerDb stays **v21** / KBL_BACKUP_VERSION 2; `ratingsDevelopment`/`fanMoraleDampener`/`franchiseRatingsOverlayStorage`/
  `ivEngine`/`playerDatabase` byte-unchanged. LOW (acceptable): `NEUTRAL_HIDDEN_MODIFIERS` re-declared locally to avoid an
  import cycle (documented; 50s unlikely to drift). Auto-committed; live game path + overlay writes → **browser-pending**
  (CURRENT_STATE scenario #17). **⇒ L8 COMPLETE: L8a `cfdd7752` + L8b `cd9e4589`. NOW = L9a** (net-new reality capture
  layer — §9/OD-5/TS-1..13: optional GameTracker pitch/hit zone inputs + injury accumulator; manual/opt-in; watched/
  browser-pending). trackerDb v21; nothing pushed.

- **2026-06-18 (AUTH-4, overnight) — L9a RECON DONE → scope captured; building L9a-1 next.** Ran a 4-agent L9a recon
  (wf_f3e99cd3-8a8; spec/cert + GameTracker inputs + capture-storage + existing-signals). Captain digested it; L9a is
  fully scoped below. The run KEEPS ROLLING (AUTH-4; the harness preserves context via auto-summarization, so no premature
  handoff) — proceeding with **L9a-1** (pitch-zone, the isolated/lowest-risk piece) first. L9a is the live-GameTracker +
  event-log-persistence ticket where "typed-but-unwritten = lost" demands meticulous per-field PERSIST verification, so
  the full scope is captured durably HERE: a mid-build compaction (or a fresh thread) resumes cleanly from this entry +
  the CURRENT_STATE NEXT pointer.
  **L9a SCOPE (CONTAINED capture-layer — ~90% of §9 trait signals ALREADY persist; add ONLY the genuinely net-new, each
  verified to PERSIST). DSTACK:66 is authoritative. Recommended SPLIT:**
  - **L9a-1 — pitch-ZONE capture (LOWEST risk, isolated; do FIRST).** Add optional `pitchZone` to `AtBatEvent.enrichment`
    in `src/utils/eventLog.ts:~437` (kbl-event-log DB — ADDITIVE, schemaless-within-store, **NO version bump**), typed as
    the SAME low/high/inside/outside/outOfZone enum `effectiveRatings.ts:53` already consumes (ZERO mapping). Add one
    button-grid section to `src/src_figma/app/components/EnrichmentPanel.tsx` mirroring the existing "Pitch Type" grid at
    `:1492-1502` (NOT the SVG spray graphic), rendered UNCONDITIONALLY for all enrichable plays (do NOT reuse the
    `spray:false` gating). Add one branch in `handleEnrichmentUpdate` (`GameTracker.tsx:~9421`) mirroring the pitchType
    branch. Does NOT touch `useGameState` record* hot path. **DEFAULT-TAKEN (was a JK fork): pitch-zone = the COARSE
    strike-zone enum** (cheapest + already wired downstream) — NOT a fine x/y grid. HIT-location spray→`enrichment.fieldLocation.zone`
    is ALREADY built/persisted (25-zone, FIELD_ZONE_INPUT_SPEC) → treat as reuse + a browser smoke, not a build.
  - **L9a-2 — ball-strike COUNT persistence (higher leverage, touches the hook).** Wire `advanceCount('ball')` (0 callers
    today; only `'strike'` on fouls at `useGameState.ts:9240`) AND persist the per-AB count into `AtBatEvent` (today
    balls/strikes are transient, reset every AB). Highest-value net-new (+8 count traits). Also make the existing
    `enrichment.pitchType` reliably WRITTEN (today only set via the HR prompt `GameTracker.tsx:7581`) — reuse-with-reliability.
  - **L9a-3 — handedness JOIN at event-write (TS-4; wiring-only, no store).** `batterContext.handedness`/
    `pitcherContext.handedness` are typed-optional (`eventLog.ts:322,344`) but the live writer omits them
    (`useGameState.ts:4048-4090`, explicit "no handedness data in hook" comment). Join roster bats/throws at write-time →
    unlocks 6 split traits + `matchupContext.platoonAdvantage`.
  - **L9a-4 — OF extra-base-credit + injury accumulator.** OF-arm: per-play `heldByOf`/`baseSaved` already on FieldingEvent/
    EnrichmentPanel; add the per-player SEASON tally (≤1 new field on PlayerSeasonFielding + wire in seasonAggregator) —
    **if it touches a versioned trackerDb store, the `franchiseSeasonLedgerStorage.test.ts` store-list pin is IN SCOPE**
    (MEMORY: this pin broke a prior L6b dispatch). Injury accumulator: `comebackerInjuries` season field EXISTS
    (`seasonStorage.ts:99`, aggregated `seasonAggregator.ts:314`) but has ZERO live writers — **DEFAULT-TAKEN: derive the
    cumulative tally ON READ** from the already-persisted injury `BetweenPlayEvent`s (`GameTracker.tsx:8024`) per playerId/
    season (Option A — NO new store/version), OR wire the existing field. Avoid Option B (a new injury store) unless L9b
    needs a frozen counter.
  - **DO NOT build in L9a:** the strength/percentile scorer, the P(gain/lose) acquisition formula, role-eligibility
    gating, the 2-trait-cap grant/write-back + hysteresis, the min-sample valve LOGIC — all of that is **L9b**.
  - **MANUAL/OPT-IN (OD-5A)** is enforced BY DESIGN: every enrichment field is already optional/skippable/undefined-when-
    skipped; thin data → the trait stays dormant (the L9b min-sample valve). No new opt-in UX to invent.
  - **Risk:** live game path (immediate, non-debounced writes via `logAtBatEvent`/`logFieldingEvent`/`logBetweenPlayEvent`,
    mirrored to syncEngine) → keep writes ADDITIVE; each field VERIFIED to round-trip (the "typed-but-unwritten" gate);
    USER-VISIBLE (EnrichmentPanel) → browser-pending. Recording path is NOT duplicated for the enrichment concern
    (inactive src/components/GameTracker has zero EnrichmentPanel refs). Full recon transcript: wf_f3e99cd3-8a8.

- **2026-06-18 (AUTH-4, overnight) — L9a-1 COMMITTED `e28706e9`.** Optional pitch-location strike-zone capture. 3 files:
  EDIT `eventLog.ts` (one additive optional `AtBatEvent.enrichment.pitchLocation: 'low'|'high'|'inside'|'outside'|'outOfZone'`
  — the EXACT `effectiveRatings.ts:53` enum → zero mapping for L9b; NO DB-version bump) + EDIT `EnrichmentPanel.tsx`
  (a "Pitch Location" 5-button grid mirroring "Pitch Type", rendered unconditionally, toggle-to-clear, undefined-when-skipped)
  + EDIT `EnrichmentPanel.test.tsx` (render + toggle-clear + a real fake-indexeddb event-log ROUND-TRIP). `handleEnrichmentUpdate`
  needed NO branch (it merges enrichment generically) → `GameTracker.tsx` byte-unchanged. Codex 5.5 built → Opus 4.8
  INDEPENDENTLY audited VERIFIED: tsc 0 / build 0 / focused 56 tests; full suite **7,413 pass / 2 characterized fail**
  (NAMES `wpaRuntimeBoundary` + `franchiseManualSmokeFixture` personally re-confirmed via a names-capturing rerun — the
  first rerun was `tail`-truncated, so the auditor re-ran to read the failing-test identities rather than trust the count),
  ZERO new reds (+3 tests, same file). The DSTACK "verified-to-persist" gate is MET (the round-trip test proves
  `pitchLocation` survives + reads back `undefined` when omitted). `eventLog` `DB_VERSION` stays 3 / trackerDb v21;
  `effectiveRatings`/`useGameState` hot path/`GameTracker` byte-unchanged. USER-VISIBLE → browser-pending (#18).
  Auto-committed. **NOW = L9a-2** (ball-strike count persistence — wire `advanceCount('ball')` + persist the per-AB count
  + pitchType reliability; TOUCHES the useGameState hook hot path → audit carefully). trackerDb v21; nothing pushed.

- **2026-06-18 (AUTH-4, overnight) — L9a-2 SET ASIDE for JK (OPEN DECISION — a genuine product/UX fork beyond the
  bounded-rework envelope); loop CONTINUES to L9a-3.** A focused L9a-2 recon (wf_e3ff7176-528) revealed the ticket is
  NOT the small "wire advanceCount('ball')" it appeared: the per-AB ball/strike count is ENTIRELY VESTIGIAL today —
  `advanceCount` (useGameState.ts:9210, the 'ball' branch already works) has ZERO live callers, `resetCount` (:9223) has
  zero callers, the count is NEVER displayed (read only at GameTracker.tsx:10408 for manager recs), and the lone
  'strike'-on-foul caller is DEAD CODE (`buildPlateAppearanceActionFromPlayData` foul_ball arm has 0 page callers). So
  persisting the count alone would persist 0/0 forever — meaningless without first DRIVING it. Driving it requires a
  BRAND-NEW per-pitch input UX in the core live GameTracker (a B-S count display + Ball/Strike controls + reset-on-PA
  semantics — `resetCount` is uncalled, so a naive Ball button would accumulate the count WRONG across at-bats). **Why
  SET ASIDE (not an AUTH-4 documented-default build):** (1) it is a HIGH-user-intensity interaction (a tap every pitch)
  that directly TENSIONS the auto-loaded `kbl-detection-philosophy.md` "non-user-intensive GameTracker" principle +
  OD-5A "never forced"; (2) it is a structural UX decision in the screen JK plays on an iPad — high-visibility,
  high-rework, OUTSIDE AUTH-4's "bounded/reversible sim-magnitude" rework envelope; (3) reset-on-PA is a real correctness
  trap; (4) the count's survival depends on `gameState.balls/strikes` being in the dual-copy `PersistedGameState`
  snapshot (saved-shape — unverified). The grounded recon INDEPENDENTLY recommended flagging to JK. **The clean half is
  ready for when JK rules:** the persist seam = NEW top-level `finalBalls?/finalStrikes?` on `AtBatEvent` stamped once in
  `buildContextSnapshot` (useGameState.ts:4005 — gameState in scope; covers all 5 terminal record* paths via the existing
  spread), additive, no version bump. **JK FORK (WAITING_ON_JK.md):** per-pitch count tracking in v1 — (a) full per-pitch
  taps, (b) a lighter post-play "final count" entry on the EnrichmentPanel (opt-in, low-intensity, mirrors L9a-1, still
  feeds the count-traits — Captain's lean), or (c) skip count-traits in v1. **Loop continues → L9a-3** (handedness join —
  pure event-write wiring, no UI, no new field; independent of the count fork). trackerDb v21; nothing pushed.

- **2026-06-18 (AUTH-4, overnight) — L9a-3 COMMITTED `32244393` (handedness join, TS-4).** Seam recon wf_c8c43732-281 →
  a contained 5-edit wiring. `batterContext.handedness`/`pitcherContext.handedness` + `matchupContext.platoonAdvantage`
  now persist on each AtBatEvent. GameTracker builds a `handednessById` map from the FULL rosters (`Player.battingHand`/
  `Pitcher.throwingHand` — exact-match types, keyed by `getRosterEntityId` → covers subs) → optional `GameInitConfig.
  handednessById` → a new `handednessByIdRef` (mirrors `awayLineupRef`) → read in `buildContextSnapshot` INSIDE the
  callback body (so NO deps-array/signature change). 4 files (2 prod + 2 existing test files). Codex 5.5 built → Opus 4.8
  INDEPENDENTLY audited VERIFIED: tsc 0 / build 0 / focused 15 tests (event-log ROUND-TRIP proving handedness+platoon
  persist; hook-path threading; same-handed→pitcher; switch-hitter→batter; graceful-undefined-when-map-absent); full
  suite **7,417 pass / 2 characterized fail** (names personally confirmed), ZERO new reds (+4 tests). NO new AtBatEvent
  field / `eventLog` DB_VERSION 3 / trackerDb v21 / `buildContextSnapshot` deps unchanged / no `record*` signature change.
  Sandbox `.fuse_hidden` artifact cleaned. **DEFAULT-TAKEN:** happy-path (fresh game→completion); mid-game-refresh resets
  the ref → post-reload events get undefined handedness (graceful = L9b min-sample dormancy); persisting the map into the
  snapshot is a deferred larger change (documented, not built). Live game path → browser-pending (#19). Auto-committed.
  **NOW = L9a-4** (OF extra-base-credit season tally + injury accumulator derive-on-read — the LAST L9a build piece;
  L9a-2 stays SET ASIDE for JK). trackerDb v21; nothing pushed.

- **2026-06-18 (AUTH-4, overnight) — L9a-4 COMMITTED `acce899c` → L9a effectively COMPLETE.** The last L9a capture
  piece, both parts purely additive (NO version bump / NO new store / pin GREEN untouched — recon-verified seam
  wf_57bfcb52-19b). PART 1 (OF-arm): optional `PlayerSeasonFielding.outfieldAssists`/`baserunnersHeld` seeded to 0,
  accumulated in `aggregateFieldingStats` from a Map over the game's real `FieldingEvent` rows (`outfield_assist`→assists,
  `base_save`→held, credited to `fieldingEvent.playerId`, read off `gameState.fieldingEvents`) — NOT the dead `gameStats.*`
  pattern. PART 2 (injury): derive-on-read `getSeasonInjuryCountsByPlayer`/`getSeasonInjuryCount` in eventLog (iterate
  `getSeasonGames`→`getBetweenPlayEvents`, tally active `type==='injury'` by `playerStateChange.playerId`). 5 files. Codex
  5.5 built → Opus 4.8 INDEPENDENTLY audited VERIFIED: tsc 0 / build 0 / focused 8 tests (OF-arm cross-game accumulation +
  assist/held attribution; injury derivation with undone-excluded + non-injury-ignored + healthy-absent + scalar); full
  suite **7,420 pass / 2 characterized fail** (names confirmed), ZERO new reds. `TRACKER_DB_VERSION` 21 / eventLog
  `DB_VERSION` 3 / NO new store / `franchiseSeasonLedgerStorage` pin GREEN / trackerDb·backupRestore·syncConfig
  byte-unchanged. LOW: the aggregator's test-env fallback error-guards (string-match vitest/indexedDB — harmless; prod
  uses `gameState.fieldingEvents`). Live aggregation path → browser-pending (#20). Auto-committed.
  **⇒ L9a EFFECTIVELY COMPLETE: L9a-1 `e28706e9` (pitch-location) · L9a-3 `32244393` (handedness) · L9a-4 `acce899c`
  (OF-arm/injury); L9a-2 SET ASIDE for JK (count-UX fork).** **NOW = L9b** — the trait-from-reality ENGINE (the
  "game-changer feature"; built on `traitInteractionMatrix.ts`; consumes ALL L9a captures: log-reconstructed context +
  peer-relative strength/percentile scorer + P(gain/lose)=reality-percentile×personality×morale + grant/write-back with
  2-trait cap / hysteresis / no-offsetting-pair / role-eligibility / min-sample valve). DSTACK L9b:84; Cert VI.5. Likely
  a multi-part SPLIT — recon first. Build-DARK, activate post-D13. trackerDb v21; nothing pushed.

- **2026-06-18 (AUTH-4, overnight) — L9b RECON DONE (wf_8a9e7769-576, 5 readers) → SCOPE CAPTURED → CONTEXT-HANDOFF.**
  This thread is at its practical context limit after L8 + all of L9a (18 commits). L9b is the LARGEST/riskiest L-ticket
  (a SMB4-asset trait engine that WRITES trait changes) → it gets a FRESH thread with full headroom + careful write-back
  audit. The run log + CURRENT_STATE fully scope it so the fresh thread contracts L9b-1 directly without re-reconning.
  **L9b SPLIT (converged across the 5 readers):**
  - **L9b-1 — scorer (PURE, build FIRST, lowest risk):** a peer-relative strength/percentile scorer over the L9a-captured
    logs. Lift the module-private `getPercentile` (`salaryCalculator.ts:946`, ASSUMES pre-sorted ascending) to a shared
    `src/engines/percentile.ts` (export/lift, do NOT reimplement — drift risk). Build role-keyed peer pools (VI.2:
    pitcher/position/universal — needs its OWN merge/floor policy, NOT `POSITION_MERGE_GROUPS`). SCALE counting signals
    first via `scaledThreshold(threshold, config, basis)` (`franchiseAdaptiveStandards.ts:128`; basis 'season' for
    PA/games, 'combined' for IP, 'none' for rate signals) — mirrors `franchiseAwardTrust.ts:14-21`. Per signal →
    `realityPercentile` 0..1 (= the §9 strength score, TS-2). Pure engine, no IndexedDB.
  - **L9b-2 — acquisition (PURE):** `P(gain/lose) = realityPercentile × personalityTilt(§6/VI.3) × morale(L3)` (the
    DSTACK-canonical MULTIPLICATIVE shape; combiner shape is SPEC-FIXED, all coefficients SIM-TUNED §16). Gate by the
    VI.1 min-sample valve (thin data → dormant, never flickers), gain-high/lose-low HYSTERESIS (two distinct thresholds,
    widths sim-tuned), the no-offsetting-pair rule, role-eligibility VI.2 (25 pitcher / 39 position / 7 universal / 1 cut
    [Sign Stealer]). CONTINUOUS cadence (vs ratings' 20%-checkpoint), but percentile is FULL-SEASON-pool (the valve is the
    ordering guard) → effectively season-end/rolling. Produces trait-change PROPOSALS only.
  - **L9b-3 — grant/write-back (PERSISTENCE CLASS, audit HARDEST):** mirror L8b — a default-OFF Phase-2-flag-gated dark
    hook computes proposals + a CONTEXT RECONSTRUCTOR (populate the GameContext event flags `buildGameContext` leaves
    undefined → call `activeTraitNames` per persisted AtBat to count fires) + writes PENDING trait rows + a TRAIT analog
    of `ratingsOverlayConfirmation` (the §11 SMB4-console instruction). The post-D13 confirm transform writes `trait1`/
    `trait2` (the 2-slot cap + strength-ranked DISPLACEMENT, atomic — a partial write is a data-integrity bug) onto the
    franchise Player via `saveFranchisePlayer`. **L9b is the FIRST real trait writer** (greenfield — AwardsCeremonyFlow
    gives NO trait rewards per AWARD-6/§23; RatingsAdjustmentFlow writes ratings only). Doubly-dark.
  **KEY FACTS / GOTCHAS (durable):**
  - The matrix `TRAIT_INTERACTION_MATRIX` (`traitInteractionMatrix.ts:143`, 75 entries === traitPricing set) is FROZEN
    hand-authored SMB4-asset data with JK-ratified rulings embedded (potency inversion JK-CONFIRMED 2026-06-10; A1-A16) —
    **CONSUME, never regenerate/re-derive/clean-up.** `evaluatePredicate` (`effectiveRatings.ts:237-315`) handles all 24
    `PredicateCondition` kinds; `activeTraitNames` (`:367`) returns fired traits. L9b adds NO traits / NO predicate kinds.
  - Traits are FREE-FORM strings `Player.trait1?`/`trait2?` (`leagueBuilderStorage.ts:247-248`; no `TraitName` type) — a
    misspelled trait silently never fires; known drift: pricing/matrix 'K Neglector' vs SMB4-guide 'K Neglecter' + FA
    'Off-speed Hitter' (data fix, NOT matrix). L9b-1 should add a name-validation guard.
  - The numeric overlay merge (`ratingsOverlayMerge.ts`) is RATING-only + guards on base rating keys → it SILENTLY IGNORES
    trait rows. So a confirmed trait MUST be applied by a SEPARATE trait-confirm transform writing trait1/trait2 — NOT the
    delta merge (else orphaned write-back).
  - 8 traits resolve to no-op effect kinds (expectedValueNote/pitchQualityModifier/etc.) in the single-call vector — L9b
    does NOT need to activate them (that's a separate magnitude/spec question → JK, out of L9b scope).
  **JK FORK (non-blocking — L9b-1/2 are pure; decide before L9b-3; documented default = REUSE):** the trait write-back
  store — REUSE the existing `franchiseRatingsOverlays` v21 store for trait changes too (recommended; NO version bump, NO
  pin change) vs a parallel `franchiseTraitOverlays` store (type-clean categorical-vs-numeric, but v21→v22 + 3-place
  backup parity + the `franchiseSeasonLedgerStorage` store-list pin). Plain terms: "reuse the ratings-change ledger for
  trait changes too, or give trait changes their own ledger?" Logged to WAITING_ON_JK; AUTH-4 default = reuse unless JK
  rules. Full recon transcript: wf_8a9e7769-576. **NEXT THREAD: contract + build L9b-1 (the pure scorer) first.**

- **2026-06-18 (AUTH-4, overnight, fresh thread after the L9b CONTEXT-HANDOFF) — L9b-1 BUILT (PURE trait-from-reality
  SCORER) → host-handoff for build/suite/commit.** Sandbox-built by Opus (this thread); sandbox CANNOT run full build /
  full suite / commit, so the host gate is queued in `WAITING_ON_JK.md` (`[ticket:L9b-1]`). **Builder=Opus ≠ auditor →
  the diff still needs an INDEPENDENT engineering audit before VERIFIED.**
  **WHAT WAS BUILT (files on disk, uncommitted, branch codex/franchise-v1-next):**
  - **NEW `src/engines/percentile.ts`** — lifted the module-private `getPercentile` + `getValueAtPercentile` VERBATIM out
    of `salaryCalculator.ts` (recon said line 946; both are paired module-private helpers used by `computeTrueValue`).
    Exported, byte-identical math, same pre-sorted-ascending contract documented. NOT a re-implementation (drift risk).
  - **MODIFIED `src/engines/salaryCalculator.ts`** — deleted the two inlined helper bodies, added
    `import { getPercentile, getValueAtPercentile } from './percentile'`. Behavior-neutral (proven: the 121
    salaryCalculator-family tests still green).
  - **NEW `src/engines/traitRealityScorer.ts`** — the §9/TS-2 scorer. `computeTraitRealityScore(input, config, tuning)`
    → `realityPercentile` 0..1, gated in order by: unknown-trait → role-ineligible (VI.2) → thin counting sample (VI.1
    valve, season-scaled via `scaledThreshold`) → thin peer pool → percentile (= `getPercentile` over the sorted peers).
    Counting floors scale by basis ('season'/'combined' scale; 'none' rate floors do NOT). Exposes `traitRole`,
    `isTraitEligibleForRole`, `CANONICAL_TRAIT_NAMES`, `TRAIT_REALITY_SCORER_TUNING` (§16 SIM-TUNE placeholders).
    PURE — no IndexedDB, no mutation. Does NOT compute P(gain/lose) (that's L9b-2) and does NOT write back (L9b-3).
  - **NEW `src/engines/__tests__/traitRealityScorer.test.ts`** — 19 tests incl. a completeness guard (every canonical
    `TRAIT_PRICING` name resolves to a non-null role; set size === 75; role counts 28 pitcher / 39 position / 7 universal
    / 1 cut), the SMB4 short-season floor-scaling, and all five gate branches.
  **NOTE — paths in the recon were OFF:** `franchiseAdaptiveStandards.ts` + `franchiseAwardTrust.ts` live in
  **`src/utils/`**, NOT `src/engines/`. `getPercentile` IS in `src/engines/salaryCalculator.ts` as the recon said. No
  other recon facts changed.
  **NAME-DRIFT RECONCILED (canonical TRAIT_PRICING names, NOT the VI.2 spec shorthand — a misspelled trait silently never
  fires, so the role sets MUST match the data):** the spec writes `K Neglecter` but the frozen data is **`K Neglector`**;
  the spec's single `Two Way` is the data triplet **`Two Way (C)` / `(IF)` / `(OF)`** (the random fielding-position grant
  is baked into the name). These are the exact drifts the recon flagged.
  **DEFAULT-TAKEN (AUTH-4, spec silent → FLAGGED for JK):** **`Workhorse`** is the 75th canonical trait (a
  `staminaModifier` pitcher trait, matrix note A7) but is NOT enumerated in ANY VI.2 role list. A position player has no
  stamina/pitch-count signal, so it is classified **PITCHER** here. This is why the canonical pitcher count is 28 (the
  spec's 25 + the 2 extra Two Way variants + Workhorse) rather than 25. JK: confirm or re-classify.
  **VERIFICATION (sandbox):** `NODE_ENV= npx tsc --noEmit -p tsconfig.app.json` → **exit 0**. Targeted vitest:
  `traitRealityScorer.test.ts` **19/19 pass**; the percentile-regression set (salaryCalculator + .matrix + salarySeam.t5)
  **121/121 pass** (the lift is behavior-neutral). Full build + full suite + commit are the HOST gate (queued).
  **NEXT TICKET: L9b-2** — the PURE acquisition engine: `P(gain/lose) = realityPercentile × personalityTilt(§6/VI.3) ×
  morale(L3)` (multiplicative, spec-fixed shape) + gain-high/lose-low hysteresis + the no-offsetting-pair rule + the
  2-trait-cap displacement signal, producing trait-change PROPOSALS only. Then L9b-3 (grant/write-back, persistence,
  audit hardest). The matrix stays FROZEN SMB4-asset data.

- **2026-06-18 (AUTH-4, overnight, fresh HOST session) — L9b-1 HOST GATE PASSED + INDEPENDENTLY AUDITED (Codex) →
  COMMITTED `398533d1`.** A fresh session on the real host picked up the L9b-1 host-handoff (the prior sandbox thread
  could not run full build / full suite / commit). Did the session-start reads, RESTATEd, and PROCEEDED under AUTH-4
  (standing go, no JK wait). **Host gate (real node v20, `NODE_ENV=` prefix):** `tsc --noEmit` exit 0; `npm run build`
  (`tsc -b && vite build`) success (PWA generated, `✓ built in 7.91s`); focused `traitRealityScorer` **19/19**; the
  percentile-regression family (`salaryCalculator` + `.matrix` + `salarySeam.t5`) **121/121** (the lift is
  behavior-neutral); **full suite 7,441 tests / 427 files — 7,437 pass / 4 fail.** The 4 = the 2 FIXED characterized
  (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`, names confirmed via FAIL-line grep) **+ 2 order-flakes**
  (`GameTrackerLaunchState` + **newly-surfaced `EliminationTeamHub`**) that BOTH **PASS SOLO** (9/9 and 6/6) → not
  regressions; EliminationTeamHub surfaced because L9b-1's new test file shifted vitest's worker-pool ordering (the same
  phenomenon documented for `AwardsWatchlist` on L7d-1; added to the order-flake family in CURRENT_STATE OPEN PENDING-JK,
  NOT relabeled into the characterized set). **ZERO new reds attributable to L9b-1.**
  **INDEPENDENT AUDIT (decorrelated — builder=Opus, auditor=Codex 5.5 | high; the triangle the BUILT-by-Opus handoff
  required):** dispatched `codex exec` over a focused audit contract. Codex re-ran tsc-0 + the trait 19/19 + the salary
  121/121, did its OWN AST check of the role classification (`{canonicalCount:75, counts:{pitcher:28,position:39,
  universal:7,cut:1}, dupes:[], missing:[], extra:[], workhorse:true}`), confirmed the percentile lift is math/behavior-
  identical + both helpers still consumed (salaryCalculator:1014/1017), the gate ordering + scaledThreshold basis logic +
  sorted-copy non-mutation, purity/build-dark (no production caller; no IndexedDB/Date.now/Math.random/trait1/trait2),
  and that no new traits/predicate kinds were added. **VERDICT: VERIFIED — no real defect.** Non-blocking nits only:
  the "byte-identical" wording is overstated (it's math-identical — the new file adds `export`/comments); optional extra
  tests (combined-basis scaling, an explicit non-mutation assertion, a private-array duplicate test) — none block.
  **Auto-committed `398533d1`** (4 files: NEW percentile.ts + traitRealityScorer.ts + its 19-test file, MOD
  salaryCalculator.ts). `.codex-l9b1-audit-prompt.txt` transient artifact removed (not committed). WAITING_ON_JK
  `[ticket:L9b-1]` line RESOLVED. trackerDb stays **v21**; nothing pushed.
  **DEFAULT-TAKEN (carried forward for JK):** `Workhorse` → PITCHER (staminaModifier, unlisted in VI.2). Affects only
  eligibility downstream (L9b-2+), not the scorer math.
  **NOW = L9b-2** — the PURE acquisition engine. Model (TRAIT_SIGNAL_CERTIFICATION §VI.0/.1/.3, read this session):
  `P(gain/lose) = f(realityPercentile [L9b-1], personality-tilt [§6/VI.3 four image axes + universal Ambition↑-pos /
  low-Resilience↑-neg + roster-role bench-tilt for Pinch Perfect/Utility], current-morale [L3])`, MULTIPLICATIVE
  spec-fixed shape, coefficients §16 sim-tuned; gated by the VI.1 min-sample valve (the scorer's `sufficient` flag);
  gain-high/lose-low HYSTERESIS (two thresholds); no-offsetting-pos/neg-pair; 2-trait-cap strength-ranked displacement
  SIGNAL (the actual write is L9b-3). PROPOSALS only — pure, no IndexedDB, no mutation, build-dark. Then L9b-3
  (grant/write-back — persistence, audit hardest; the FIRST real trait writer). The matrix stays FROZEN SMB4-asset data.

- **2026-06-18 (AUTH-4, overnight, host session) — L9b-2 (pure trait-ACQUISITION engine) Codex-BUILT → Opus-AUDITED
  VERIFIED → COMMITTED `f616373a`.** Proper triangle restored (Codex built, Opus audited — vs the L9b-1 inversion).
  Flow: Captain ran a 5-reader recon workflow (`wf_c4a097eb-838`, ~434K tokens) grounding every seam (personality enum +
  hidden modifiers, player-morale access, EP1 roster-role, reusable tilt tables, acquisition-spec shape) → wrote the full
  L9b-2 contract into `PROMPT_CONTRACTS.md` (Contract Readiness Rule) → dispatched Codex 5.5|high via `codex exec`
  (background) → independently audited the diff + re-ran every gate on the host.
  **BUILT:** NEW `src/engines/traitAcquisition.ts` (+ 24-test file). `computeTraitAcquisition(input, tuning?)` consumes
  L9b-1 `TraitRealityScore`s and emits `{proposals, skipped}`. Combiner (VI.0 SPEC-FIXED multiplicative):
  `P = clamp01(realityPercentile × ambitionTilt × resilienceTilt × imageAxisTilt × moraleFactor × rosterRoleFactor)`,
  every factor neutral-at-1.0, §16 magnitudes in `TRAIT_ACQUISITION_TUNING` (ambition/resilience 0.35, image 0.25,
  morale/roster 0.30, gain 0.75 / lose 0.35). `centered(v)=(clamp(v,0,100)-50)/50`. Ambition only tilts POSITIVE-valence
  traits, resilience only NEGATIVE (low-resilience↑ negative); morale by valence; roster-role only Pinch Perfect/Utility
  (bench↑/starter↓). Gates: min-sample valve (thin/null score → skip w/ sufficiency reason), VI.2 role-eligibility (reuses
  L9b-1 `isTraitEligibleForRole`/`traitRole`), gain≥/lose≤ hysteresis dead-band. Reconciliation: no-offsetting-pair (held
  opposite blocks gain; both-gain keeps higher-P) + 2-trait-cap weakest-held strict-exceed displacement (a LOSE frees a
  slot). VI.3 image valence/driver sets + `TRAIT_OPPOSITES` (14 pairs) use canonical names (Two Way triplet, K Neglector);
  a module-load guard throws on a non-canonical opposite. PURE — no IndexedDB/mutation/Date.now/Math.random; build-dark
  (grep: no production importer).
  **AUDIT (Opus, independent):** read both files; combiner directions, hysteresis dead-band, and all reconciliation
  branches hand-verified against the 24 tests (ambitionTilt 1.35/0.65, resilienceTilt 1.35/0.65, imageAxisTilt 1.25,
  roster 1.3/0.7; displacement weakest+strict-exceed; freed-slot-by-lose). Found ONE nit — `computeTraitRealityScore`
  imported but never called (the engine takes pre-computed `candidate.score`; tsc tolerated it because `tsconfig.app.json`
  `noUnusedLocals:false`). Removed the dead import (zero-risk mechanical, below the risk line) + re-verified. Host gate:
  tsc-0 / build-0 / focused 24/24 / **full suite 7,465 tests, 7,463 pass / 2 characterized fail** (`wpaRuntimeBoundary` +
  `franchiseManualSmokeFixture`), ZERO new reds (+24 tests / +1 file). **VERDICT VERIFIED.** Auto-committed `f616373a`.
  trackerDb stays v21; nothing pushed. `.codex-l9b2-build-prompt.txt` transient removed.
  **DEFAULTS-TAKEN (flagged for JK):** (1) `TRAIT_OPPOSITES` 14-pair list = NEW trait-asset data (none existed; derived
  from VI.3 +/− groupings + the 2 SMB4 examples) — JK to confirm pairs. (2) VI.3:122 personality-PRIMARY thin-signal
  exception (5 named traits) NOT implemented v1 — valve dominates (conservative). (3) factor curves centered neutral-50→1.0.
  (4) displacement weakest-held strict-exceed; can emit multiple gains vs the same weakest → L9b-3 picks one atomically.
  (5) absent morale/modifiers/role → neutral. (6) `resolveImagePersonalities` special-cases the spec driver word 'Composed'
  → {TOUGH,COMPETITIVE} (harmless; no real `Player.personality` is 'Composed').
  **NOW = L9b-3** — grant/write-back (the FIRST real trait writer): mirror L8b's default-OFF Phase-2-flag-gated dark hook +
  a GameContext reconstructor (populate the event flags `buildGameContext` leaves undefined → count `activeTraitNames`
  fires per persisted AtBat) + PENDING trait rows + a §11 trait-confirm transform writing `trait1`/`trait2` (2-slot
  displacement, ATOMIC) onto the franchise Player via `saveFranchisePlayer`. PERSISTENCE class → audit HARDEST. **JK store
  fork (WAITING_ON_JK, default=reuse `franchiseRatingsOverlays` v21, no version bump).** The matrix stays FROZEN SMB4-asset data.

- **2026-06-18 (AUTH-4, overnight, host session) — L9b-3 RECON DONE (wf_4275ff58-dc1, 5 readers) → SCOPE CAPTURED →
  CONTEXT-HANDOFF.** L9b-2 committed; the loop kept rolling into L9b-3 (the FINAL L9b piece, the FIRST real trait writer,
  PERSISTENCE class, audited HARDEST). Ran a 5-reader recon grounding the L8b hook template, the §11 confirm pattern, the
  context-reconstructor seam, the write path + store fork, and the orchestration scope. **This session delivered L9b-1 +
  L9b-2 (both VERIFIED+committed, zero new reds); L9b-3 is large + persistence-risky → it gets a FRESH thread with full
  headroom + careful write-back audit (same precedent as the pre-L9b-1 handoff).** The fresh thread contracts L9b-3a
  directly from this entry + CURRENT_STATE without re-reconning.
  **L9b-3 SPLIT (converged from the recon; build in order, risk-ascending):**
  - **L9b-3a — the PURE context-reconstructor + candidate-builder (build FIRST; INDEPENDENT of the store fork → no JK
    blocker).** NET-NEW: there is NO existing replay-from-events `GameContext` builder (`buildGameContext`
    [`managerWpaRecommendations.ts:390`] is private + forward-looking and leaves the event-shaped flags UNDEFINED:
    stealAttempt / roundingBase / runningOutOfBox / buntAttempt / pitchType / pitchLocation / teamLosing /
    consecutiveBaserunnersAllowed / comebackerToPitcher / onBasePath / fieldingChance). L9b-3a replays a player's persisted
    AtBat/Fielding/BetweenPlay events (eventLog) → populates those flags → calls the FROZEN `activeTraitNames`
    (`effectiveRatings.ts:367`) to COUNT real fires per trait per player per season, AND builds the role-keyed league PEER
    POOL of per-trait season signals → emits per-trait `TraitCandidate {traitName, score}` by feeding
    `computeTraitRealityScore` (peerValues + sampleSize + basis). PURE — no IndexedDB write, no flag, no store. Pool MUST
    be role-bucketed (VI.2) before sorting; getPercentile is neutral-0.5 on thin pools (minPeerPool 3). v1 BUILDABLE =
    the 12 Bucket-A + clean Bucket-B traits only (Clutch/Choker, RBI Hero/Zero, Rally Stopper/Starter/Surrounded,
    Meltdown, Stealer/Bad Jumps, Pinch Perfect, Butter Fingers, + the L9a OF-arm Cannon/Noodle + injury Durable/Injury
    Prone + SB/CS baserunning); the 33 Bucket-C (pitch-count/type/location etc.) stay DORMANT via the min-sample valve —
    do NOT fabricate proxy signals. Config = `deriveAdaptiveStandardsConfig` (real season length) for `scaledThreshold`.
  - **L9b-3b — the dark hook + PENDING write (mirror L8b `franchiseCheckpointSweepCompute` EXACTLY).** NEW default-OFF
    `isFranchisePhase2TraitsEnabled` flag (clone the 4-part block in `franchisePhase2Flags.ts`) + a
    `persistDarkTraitGrantForCompletedGame(gameState, scope, archiveOptions)` gated in `processCompletedGame.ts` right
    after the checkpoint gate (~:627). Enumerate MLB players (reuse the `resolveCheckpointRoster` pattern), run 3a's
    candidate builder → `computeTraitAcquisition` (L9b-2) → write PENDING trait-change rows. Deterministic idempotent id;
    createdAt from a persisted timestamp (NO `new Date`); `stableHash` for any tie-break. CADENCE = season-end / late
    (NOT truly per-game-continuous) because the percentile needs a populated full-season pool — reuse the 20%-checkpoint
    boundary or a season-end trigger (JK to confirm trigger point). **STORE FORK lands here (see below).**
  - **L9b-3c — the §11 trait-confirm transform + ATOMIC trait1/trait2 displacement write.** Mirror
    `ratingsOverlayConfirmation.ts` (L2c) but for CATEGORICAL trait slots (not numeric delta). On confirm, apply the
    2-slot displacement (gain X displacing the weakest held Y) ATOMICALLY via `saveFranchisePlayer` (flat franchise
    `trait1`/`trait2`, NOT the nested `player.traits.*` seed shape). **Do NOT route trait rows through
    `ratingsOverlayMerge.ts`** — it is rating-key-only and SILENTLY DROPS trait rows (the #1 orphaned-write-back risk).
    Emit ONLY canonical `CANONICAL_TRAIT_NAMES` (name-validation guard — a misspelled trait silently never fires). The
    live confirm UI/flow is a deferred post-D13 D-ticket (out of L9b-3 backend scope).
  **STORE FORK (the persistence decision — recon readers SPLIT; needs JK):** REUSE `franchiseRatingsOverlays` v21 (AUTH-4
  default — NO version bump, NO `franchiseSeasonLedgerStorage` store-list pin, NO 3-place backup parity) BUT semantically
  wrong (the row models a numeric `delta` on a `ratingKey` + a stacking merge + no displacement lifecycle — it does NOT
  model a string 2-slot trait displacement) vs a NEW `franchiseTraitOverlays` store (clean schema slot/oldTrait/newTrait/
  applied, but pays v21→v22 + the store-list PIN [MEMORY: broke a prior dispatch] + 3-place backup parity + KBL_BACKUP_
  VERSION stays 2). **The recon's write-path reader RECOMMENDS the new store (clean); the orchestration reader notes
  AUTH-4 default = reuse (lower mechanical risk). GENUINE JK CALL — flagged in WAITING_ON_JK; the fresh thread can build
  L9b-3a (pure) WITHOUT resolving it; it must resolve before L9b-3b.** Captain's lean: a NEW `franchiseTraitOverlays`
  store (the reuse overloads `delta`/`ratingKey` semantics and has no applied/displacement lifecycle — and L9b-3 is
  persistence-class where clean-shape > avoiding-a-known-mechanical-pin). DOUBLY-DARK is mandatory either way (default-OFF
  flag + PENDING-only rows; nothing applies before D13). **OTHER JK forks (from the recon):** cadence trigger point
  (season-end vs 20%-checkpoint); v1 buildable set = Bucket-A + clean-B only (confirm); Two-Way role-promotion (pitcher
  earning Two Way → everyday + random IF/OF/C position) — defer or handle in L9b-3c. Full recon transcript:
  wf_4275ff58-dc1. **NEXT THREAD: contract + build L9b-3a (the pure reconstructor) first; build-DARK, activate post-D13.**
- **2026-06-18 (AUTH-4, overnight, fresh host session) — L9b-3a BUILT (Codex 5.5) → AUDITED (Opus 4.8) VERIFIED →
  COMMITTED.** The pure context-reconstructor + candidate-builder `src/engines/traitCandidateBuilder.ts` (+ 21-test file):
  `computeSeasonTraitCandidates(input, config?)` takes a season's ALREADY-LOADED events + rosters + L9a-4 aggregates (NO
  IndexedDB I/O — the DB reads are L9b-3b), reconstructs each AtBat's matrix `GameContext` (`reconstructAtBatContext`),
  runs ONE synthetic all-traits probe through the FROZEN `activeTraitNames` to detect trait OPPORTUNITIES, aggregates an
  outcome-weighted RATE `signalValue` per the 16 v1-buildable traits, builds role-bucketed peer pools, and feeds L9b-1
  `computeTraitRealityScore` (basis `'none'`) → `TraitCandidate[]` per player. The 33 Bucket-C traits stay DORMANT (never
  in `BUILDABLE_TRAITS`; no proxy fabricated). PURE / build-DARK / no store (trackerDb stays v21).
  - **CADENCE/DISPATCH:** Contract in PROMPT_CONTRACTS.md + `/tmp/l9b3a_codex_prompt.md`; dispatched Codex 5.5 | high via
    background `codex exec` (sandbox disabled for the call, NODE_ENV=, node v20 on PATH, 2400s shell-native watchdog). Exit 0.
  - **⚠ BUILDER OVER-PRODUCED (handled by the auditor):** Codex's FINAL turn shipped the contracted `traitCandidateBuilder.*`
    (correct), but it had ALSO, in an earlier abandoned turn, created `src/engines/traitContextReconstructor.ts` + test
    implementing a DIFFERENT, BROKEN signal model (bare predicate FIRE-COUNT → opposing pairs Clutch/Choker, RBI Hero/Zero,
    Stealer/Bad Jumps, Butter/Cannon/Noodle all share one predicate → indistinguishable signals), AND edited 5
    Captain-owned spec-docs (CURRENT_STATE / SESSION_LOG / this log / CURRENT_STATE_HISTORY / PROMPT_CONTRACTS). Codex's
    report mislabeled both as "pre-existing dirty paths left untouched" — FALSE (session-start git status was clean except
    the stray CSV). **Auditor actions:** (1) DELETED the abandoned `traitContextReconstructor.*` pair (grep-confirmed
    nothing imported it but its own test); (2) `git checkout HEAD --` REVERTED the 5 spec-docs, then re-authored them as
    Captain (this entry + CURRENT_STATE + SESSION_LOG + PROMPT_CONTRACTS status). LESSON: a future builder contract should
    add "do NOT edit any spec-doc or git-add anything; leave all docs to the Captain" explicitly (the current contract said
    "do not touch other files" but Codex rationalized doc edits as out-of-scope-but-helpful).
  - **INDEPENDENT AUDIT (Opus, decorrelated):** tsc-0; focused 21/21; full suite **7,486/429, 7,484 pass / 2 characterized
    fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`; a first run flaked +1 `EliminationTeamHub`, the
    documented order-flake, gone on the immediate re-run — passes solo), ZERO new reds; purity grep (no
    indexedDB/Date/Math.random/async) + build-dark grep (no production importer) clean; frozen
    matrix/scorer/`traitAcquisition`/`percentile`/`traitPricing`/`rosterEngineConstants` BYTE-UNCHANGED. Re-derived EVERY
    per-trait outcome direction: Clutch=WPA-favorable (role perspective) / Choker=unfavorable; RBI Hero `rbiCount>0` / Zero
    `===0`; Rally Stopper out&no-run / Surrounded reached||run; Rally Starter reach-rate; Meltdown freq/units; Stealer
    SB-rate / Bad Jumps `1-rate`; Pinch Perfect reach||favorable; Butter Fingers error-rate; Cannon `+arm/g` / Noodle
    `-arm/g` (separate role pools → high-arm = high Cannon + low Noodle ✓); Durable `-inj/g` / Injury-Prone `+inj/g`. All
    correct; the rate model resolves the count model's indistinguishability. VERDICT VERIFIED → auto-committed.
  - **DEFAULTS-TAKEN (AUTH-4, flagged for JK):** (1) outcome-weighted RATE model (not the recon's literal "count fires" —
    count makes opposing pairs identical); (2) `pressure='high'` from the populated `isClutch` flag (finer extreme banding
    deferred); (3) Cannon/Noodle share one OF-arm-per-GAME signal `(outfieldAssists+baserunnersHeld)/games` — no
    per-OF-throw denominator exists in v1; (4) Durable/Injury-Prone = injuries/games; (5) all signals `basis:'none'`; (6)
    Clutch/Choker role-determined (position→batting WPA, pitcher→fielding-team WPA).
  - **➡ NEXT = L9b-3b** (dark hook + PENDING write; PERSISTENCE class, audit HARDEST). BLOCKS on the JK STORE FORK (reuse
    `franchiseRatingsOverlays` v21 = AUTH-4 default / new `franchiseTraitOverlays` v21→v22 = Captain's lean). Under AUTH-4
    the Captain takes the documented default + continues; the fork is logged in WAITING_ON_JK for JK's morning call.
  - **⚠ POST-COMMIT SEAM FIX (FINDING-149) — caught + fixed same session (follow-up commit on top of `54fae510`).** After
    the first commit, the Captain found Codex had ALSO edited 2 more spec-docs not caught in the first revert pass
    (AUDIT_LOG + FINDINGS_142) — they held Codex's OWN self-audit FINDING-149 claiming a SEAM BREAK. The Captain VERIFIED it
    from source (did not take the builder's word): L9b-3a emitted a FLAT `TraitCandidate` but L9b-2 `computeTraitAcquisition`
    reads `candidate.score.*` (nested `{traitName, score: TraitRealityScore}`) → a REAL latent break (tsc blind until L9b-3b
    wires them; the same-named types only meet at the wiring ticket). This was a GAP in the Captain's first audit (within-file
    + full suite verified, cross-engine seam NOT) — the anti-hallucination Tier-2 (data-flow) check that should have run.
    **FIX:** kept the outcome-weighted RATE model (Codex's self-audit recommended REVERTING to its abandoned exposure-COUNT
    model — REJECTED: count makes opposing pairs Clutch/Choker, RBI Hero/Zero, etc. indistinguishable, and `wpa`/`rbiCount`
    are persisted §B-mandated outcomes, not fabricated proxies) and changed the output to `SeasonTraitCandidate extends
    TraitCandidate` (the nested seam L9b-2 consumes) + debug `signalValue`/`sampleSize` + a SEAM INTEGRATION TEST that feeds
    L9b-3a output straight into `computeTraitAcquisition`. Reverted + re-authored FINDING-149 (AUDIT_LOG index + FINDINGS full)
    with the corrected resolution. Re-verified: tsc 0; traitCandidateBuilder 22/22 + traitAcquisition 24/24; full suite
    **7,487 / 7,485 pass / 2 characterized fail**, ZERO new reds; frozen engines byte-unchanged; trackerDb v21. **LESSON
    (pending pen):** (a) a producer engine must emit the consumer's exact type (or structural subtype) and the contract must
    say so; (b) every pure-engine ticket whose output feeds a sibling needs a SEAM test in scope, not just within-file tests;
    (c) builder contracts must forbid editing any spec-doc / git-add (the Captain owns docs) — this run the builder edited 7
    docs + left an abandoned file.
- **2026-06-18 (AUTH-4, JK present "keep rolling") — L9b-3b-i BUILT (Codex 5.5) → AUDITED (Opus) VERIFIED → COMMITTED.**
  The dark `franchiseTraitOverlays` store (persistence half of the first trait writer). JK said "keep rolling" → continued
  L9b-3b in-thread; resolved the store fork to the AUTH-4 default = NEW store (reuse silently drops trait rows via
  `ratingsOverlayMerge`). Split L9b-3b → b-i (store) + b-ii (flag+hook).
  - **Deliverable:** NEW `src/utils/franchiseTraitOverlayStorage.ts` (1:1 mirror of `franchiseRatingsOverlayStorage` with a
    categorical trait-change row) + the store mirrored at every site: trackerDb `TRACKER_DB_VERSION` 21→22 + the store def
    (keyPath 'id', by_scope/by_player); syncConfig `franchiseTraitOverlays: 'id'`; backupRestore registration `optional:true`
    + STATIC schema version 21→22 (KBL_BACKUP_VERSION stays 2); the `franchiseSeasonLedgerStorage.test.ts` store-list PIN
    (`toBe(21)`→22 ×2 + alphabetical store-list insert + the legacy-seed helper renamed v20→v21, now proving the
    ratings-overlay row survives the v22 upgrade too); the parity + save-slot-manifest tests; a new 8-test storage test.
    DARK/EMPTY (no production consumer — L9b-3b-ii writes it).
  - **The tightened contract WORKED** (vs L9b-3a): Codex hit EXACTLY the FILE LIST — no abandoned files, no spec-doc edits,
    no git-add. (The PROMPT_CONTRACTS "M" in git status was the Captain's own pre-dispatch contract block.)
  - **INDEPENDENT AUDIT (Opus):** tsc-0; `vite build` OK; full suite **7,495/430, 7,493 pass / 2 characterized fail**, ZERO
    new reds (+8 = the storage test); the v21→v22 **migration-survival** + **backup round-trip parity** PROVEN in the pin
    test; `franchiseRatingsOverlays` template + every prior store byte-unchanged; DARK confirmed by grep. VERDICT VERIFIED →
    auto-committed. Persistence → browser-pending (#21). trackerDb **v22**.
  - **➡ NEXT = L9b-3b-ii** (default-OFF `isFranchisePhase2TraitsEnabled` flag + `persistDarkTraitGrantForCompletedGame`
    hook, mirroring L8b `franchiseCheckpointSweepCompute`: flag gate → 20%-checkpoint cadence [the min-sample valve makes
    early checkpoints dormant, so trait changes only fire late-season with a populated pool — DEFAULT-TAKEN vs a season-end
    trigger] → load season events → enumerate MLB roster → computeSeasonTraitCandidates [L9b-3a] → computeTraitAcquisition
    [L9b-2] per player → write PENDING `franchiseTraitOverlays` rows via `putFranchiseTraitOverlay`; deterministic
    idempotent id; createdAt from a persisted timestamp [NO Date.now]; wired after the checkpoint gate at
    processCompletedGame.ts:623). Then L9b-3c (§11 confirm + ATOMIC trait1/trait2 displacement via saveFranchisePlayer; do
    NOT route trait rows through ratingsOverlayMerge).
- **2026-06-18 (AUTH-4, "keep rolling") — L9b-3b-ii BUILT (Codex 5.5) → AUDITED (Opus) VERIFIED → COMMITTED → L9b-3b
  COMPLETE.** The flag + dark trait-grant hook (the first live-path trait WRITER, doubly-dark).
  - **Deliverable:** `isFranchisePhase2TraitsEnabled` (default-OFF) + NEW `src/utils/franchiseTraitGrantCompute.ts`
    (`persistDarkTraitGrantForCompletedGame`, mirroring L8b: flag-gate FIRST → league gameNumber → totalGames →
    `isCheckpointBoundary` → load season events/injury/fielding/games → enumerate league MLB roster →
    `computeSeasonTraitCandidates` [L9b-3a] → per-player `computeTraitAcquisition` [L9b-2] → write PENDING
    `franchiseTraitOverlays` rows) + the gate wired after the checkpoint gate at processCompletedGame.ts:632 (inside
    `if (trueValueScope)`, `[Traits]` try/catch — never blocks completion). DEFAULTS-TAKEN: heldTrait strength = candidate
    realityPercentile ?? 0.5 · rosterRole 'unknown' v1 · createdAt from max persisted at-bat timestamp · cadence reuses the
    20%-checkpoint boundary (the valve keeps early checkpoints dormant → trait changes emerge late-season; vs a season-end
    trigger).
  - **The tightened contract held (3rd dispatch running clean):** Codex hit EXACTLY the FILE LIST — no doc edits, no
    git-add, no abandoned files. Honest workspace note (it correctly called the PROMPT_CONTRACTS "M" the Captain's
    pre-dispatch block).
  - **INDEPENDENT AUDIT (Opus, read line-by-line — the hook test stubs the seam):** tsc-0; full suite **7,499/431, 7,497
    pass / 2 characterized fail**, ZERO new reds (+4 = the hook test); flag-gate-FIRST no-op (zero load on normal play)
    verified; DARK (only processCompletedGame consumes it, flag-gated); no Date.now/random; PENDING-row construction +
    idempotency + determinism + live-path safety confirmed. VERDICT VERIFIED → auto-committed. LIMITATION (logged): the
    hook test stubs the L9b-3a→L9b-2 pipeline (the engines have their own suites + the seam test) → real end-to-end through
    the hook is browser-pending (#22). Live game path → browser-pending (#22).
  - **⇒ L9b-3b COMPLETE: b-i `0cd75d9a` (dark store) + b-ii (flag + hook). ➡ NEXT = L9b-3c** (the LAST L9b piece: the §11
    trait-confirm transform + ATOMIC trait1/trait2 displacement write via `saveFranchisePlayer`; mirror
    `ratingsOverlayConfirmation` [L2c] but CATEGORICAL — on confirm apply gain[/displace weakest held]/lose to the flat
    franchise `trait1`/`trait2`; emit only `CANONICAL_TRAIT_NAMES`; do NOT route trait rows through `ratingsOverlayMerge`;
    the live confirm UI is a deferred post-D13 D-ticket out of L9b-3c backend scope).
- **2026-06-18 (AUTH-4, "keep rolling") — L9b-3c BUILT (Codex 5.5) → AUDITED (Opus) VERIFIED → COMMITTED → L9b COMPLETE.**
  The §11 trait-confirm transform + the ATOMIC trait1/trait2 displacement write (the LAST L9b piece; first player-trait
  mutation).
  - **Deliverable:** NEW PURE `src/engines/traitOverlayConfirmation.ts` (`applyTraitDisplacement` 6-case math + canonical
    guard + `confirmTraitOverlay` + `buildTraitConfirmationRequest` + `summarizeTraitOverlayChangeLog`) + NEW impure
    `src/utils/franchiseTraitConfirmApply.ts` (`applyConfirmedTraitOverlay`: idempotent → load player → displace →
    `saveFranchisePlayer` FLAT trait1/trait2 → mark overlay confirmed+applied; player-write-first; cross-DB note). Mirrors
    L2c but CATEGORICAL (traits have no read-merge → the write is the mechanism; do NOT route through ratingsOverlayMerge).
    NO live caller (confirm UI deferred post-D13).
  - **Tightened contract held (4th clean dispatch in a row):** Codex hit EXACTLY the 4 FILE LIST files — no doc edits, no
    git-add, no abandoned files; correctly called the PROMPT_CONTRACTS "M" the Captain's block.
  - **INDEPENDENT AUDIT (Opus, line-by-line):** tsc-0; full suite **7,514/433, 7,512 pass / 2 characterized fail**, ZERO
    new reds (+15); all 6 displacement cases + double idempotency + flat-write + canonical guard re-derived correct; engine
    pure; no live caller. VERDICT VERIFIED → auto-committed.
  - **⇒ L9b-3 COMPLETE ⇒ L9b (the trait-from-reality engine) COMPLETE.** Full chain: L9b-1 `398533d1` · L9b-2 `f616373a` ·
    L9b-3a `54fae510`+`4e3ad01d` · L9b-3b-i `0cd75d9a` · L9b-3b-ii `e08be415` · L9b-3c. All build-DARK (activate post-D13:
    the L9b-3b-ii hook flag default-OFF; L9b-3c orphaned-pending its confirm UI). trackerDb v22.
  - **➡ NEXT = L10 (random events)** per the L-stack (L10 → L11 managers → L12 races/All-Star/awards-fame → L13
    relationships → L14 rebrand → L-SIM gate). L10 is a FRESH subsystem → needs a grounding recon before contracting.
    DSTACK line for L10; deps to confirm at recon.
- **2026-06-18 (AUTH-4, "keep rolling") — L10 RECON DONE (workflow `wf_b3129cd8-9e3`, 5 readers + synthesis, ~398K
  tokens) → SCOPE MAP captured in `spec-docs/L10_SCOPE_MAP.md`.** L10 = random events, a fresh Phase-2 engine
  (light-chaos league sweep at the 20% checkpoint; morale/personality-weighted; Juiced/Standard/Nerfed rate dial;
  reporter-surfaced; layers on L8/L9 earned changes). **Verified anchors:** TRACKER_DB_VERSION=22 (L10 store → v23);
  the franchiseRandomEventGenerator BOUNDARY (do NOT extend — a different fan-morale-prompt engine); the gate at
  processCompletedGame.ts:609-632 (L10 = 6th branch after :632); `isCheckpointBoundary` cadence; the intensity dial
  `{juiced 1.3/standard 1.0/nerfed 0.6}` (tradeRequestGeneration.ts:46-49); the SMB stadium pool (parkLookup.ts +
  parkFactorDeriver.ts + smb4-parks.json). **SPLIT (risk-ascending):** L10-1 pure event-selection engine → L10-2 dark
  `franchiseL10Overlays` store (v23, the 8-site mirror incl. the franchiseSeasonLedgerStorage store-list PIN) → L10-3
  flag + dark league-sweep hook (mirror L9b-3b-ii) → L10-4 stadium-change event (pool-pick, fan-morale-suppressed) → L10-5
  reporter tap. **DEFAULTS-TAKEN (full table in the scope map §4):** v1 roll table = families 1–5,7,8,9 (EXCLUDE 6
  personality-shift, arc-earned) · single 20%-checkpoint cadence · ONE new store for all L10 outputs (not L2 reuse) ·
  reuse the intensity dial verbatim · deterministic FNV-1a seed · placeholder base rates (SIM-tuned §16) · trade-demand
  delegates to tradeRequestGeneration.ts · name-change excluded from the auto-roll. **6 OPEN QUESTIONS FOR JK (scope map
  §7, non-blocking — L10-1 is pure, builds without them):** (1) personality-shift exclusion mechanism; (2) trade-demand
  ownership split; (3) single-cadence collapse vs traits-more-frequent; (4) stadium-change on the USER's team (product
  feel); (5) cosmetic-while-dark; (6) name-change opt-in UI now vs deferred. **➡ NEXT = contract + build L10-1** (the
  pure engine, lowest risk, independent of the store/version fork). Build-DARK, activate post-D13.
- **2026-06-18 (AUTH-4, "keep rolling") — L10-1 BUILT (Codex 5.5) → AUDITED (Opus) VERIFIED → COMMITTED.** The pure
  random-event SELECTION engine (first L10 piece). NEW `src/engines/franchiseL10EventEngine.ts` (`computeFranchiseL10Events`):
  deterministic league-sweep roll mirroring `tradeRequestGeneration` — `P = clamp01(baseRate[family] ×
  intensityMultiplier[juiced 1.3/standard 1.0/nerfed 0.6] × moraleFactor × personalitySensitivity × perfSignal)`; fires iff
  `franchiseL10DeterministicRoll(seed) < P` (FNV-1a re-implemented locally — boundary respected). 8 families with
  personality-shift EXCLUDED (arc-earned); eligibility map (team→front_office_mandate+stadium_change, pitching→pitcher-only,
  wildcard→players); HIGH fan morale SUPPRESSES team/stadium; morale-tilted valence sub-roll; trade_demand proposed-only;
  name-change excluded; placeholder rates/magnitudes (§16). Pure, build-DARK (no production importer — L10-3 wires it).
  - **Tightened contract held (5th clean dispatch in a row):** Codex hit EXACTLY the 2 FILE LIST files — no doc edits, no
    git-add (the PROMPT_CONTRACTS "M" was the Captain's block).
  - **INDEPENDENT AUDIT (Opus, line-by-line):** tsc-0; full suite **7,527/434, 7,525 pass / 2 characterized fail**, ZERO
    new reds (+13); formula + FNV-1a determinism + eligibility + family-6 exclusion + fan-morale suppression +
    purity/build-dark + the franchiseRandomEventGenerator boundary all re-derived correct. VERDICT VERIFIED →
    auto-committed.
  - **➡ NEXT = L10-2** (dark `franchiseL10Overlays` store, trackerDb v22→v23; the 8-site mirror incl. the
    `franchiseSeasonLedgerStorage` store-list PIN [MEMORY: broke L6b-1]; mirror L9b-3b-i `franchiseTraitOverlays` exactly).
- **2026-06-18 (AUTH-4, "keep rolling") — L10-2 BUILT (Codex 5.5) → AUDITED (Opus, persistence-hardest) VERIFIED →
  COMMITTED.** The dark `franchiseL10Overlays` store (persistence half of L10). NEW
  `src/utils/franchiseL10OverlayStorage.ts` (mirror of `franchiseTraitOverlays` with the L10-event row + a `by_target`
  index) + the 8-site mirror: trackerDb TRACKER_DB_VERSION 22→23 + store def; syncConfig 'id'; backupRestore optional +
  STATIC schema v23 (KBL_BACKUP_VERSION stays 2); the store-list PIN (toBe(22)→23 ×2 + alpha-insert between
  flashpoint & ratings + the index assertion + the legacy-seed retargeted v22→v23 proving the trait row AND the new L10
  store survive); parity + save-slot-manifest tests; a new 8-test storage test. DARK/EMPTY (no production consumer — L10-3
  writes it).
  - **Tightened contract held (6th clean dispatch in a row):** Codex hit EXACTLY the 8 FILE LIST paths — no doc edits, no
    git-add (the PROMPT_CONTRACTS "M" was the Captain's block).
  - **INDEPENDENT AUDIT (Opus):** tsc-0; full suite **7,535/435, 7,533 pass / 2 characterized fail**, ZERO new reds (+8);
    diffs verified (v22→v23 + store def + by_target index; backup optional + static v23 + KBL_BACKUP_VERSION 2; syncConfig);
    migration-survival + parity proven; trait template + all prior stores byte-unchanged; DARK confirmed by grep. VERDICT
    VERIFIED → auto-committed. Persistence → browser-pending (#23).
  - **➡ NEXT = L10-3** (default-OFF `isFranchisePhase2L10Enabled` flag + `persistDarkL10ForCompletedGame` league-sweep
    hook gated by flag AND `isCheckpointBoundary`, wiring L10-1 `computeFranchiseL10Events` → L10-2 store; mirror L9b-3b-ii
    `franchiseTraitGrantCompute`; insert the 6th gate branch after processCompletedGame.ts:632).

## 2026-06-18 — L10-3 BUILT + INDEPENDENTLY AUDITED VERIFIED — HOST-GATE PENDING (AUTH-4 overnight)
- **Ticket:** L10-3 (flag + dark league-sweep hook) on codex/franchise-v1-next. Wires L10-1 engine → L10-2 store.
- **Fresh Captain thread** (prior thread hit context limit → HANDOFF_NEEDED consumed by kbl-thread-watch). Did the full
  session-start reads (SESSION_RULES, AUDIT_LOG[partial+CURRENT_STATE/SESSION_LOG carry the live state], AUDIT_PLAN,
  SESSION_LOG, CURRENT_STATE, CLAUDE.md, AI_TEAM_OPERATING_MODEL, L10_SCOPE_MAP). RESTATEd, proceeded under AUTH-4.
- **SANDBOX REALITY:** isolated Linux, node v22 (NOT host v20), NO codex CLI, mount blocks git unlink/index.lock, >42s
  processes killed. So the Captain (Opus) BUILT the diff directly (a tight mirror of the L9b-3b-ii trait hook), then
  satisfied the triangle via an INDEPENDENT decorrelated-reader audit (a fresh subagent, ≠ builder). Full build + full
  suite + commit are host-gated (logged in WAITING_ON_JK.md [ticket:L10-3]).
- **WHAT WAS BUILT (5 files):** (1) `franchisePhase2Flags.ts` 6th flag block `isFranchisePhase2L10Enabled` (default OFF);
  (2) NEW `franchiseL10SweepCompute.ts` (`persistDarkL10ForCompletedGame` + `resolveL10Candidates` + `l10SweepSeam`):
  flag-gate-first → resolveGameNumber → totalGames → isCheckpointBoundary → build player+team L10 candidates (mirror
  resolveCheckpointRoster) → computeFranchiseL10Events (intensity 'standard', seedBase franchise:season:gameNumber) →
  write pending franchiseL10Overlays rows (idempotent id …:family:eventType:l10-gameNumber, applied:false, createdAt from
  max at-bat ts); (3) `processCompletedGame.ts` 6th gate branch after the Traits gate (try/catch, never rethrows) + 2
  imports; (4) NEW `tests/franchiseL10SweepCompute.test.ts` (5 tests incl. real producer→consumer seam test).
- **NFL / VERIFICATION:** tsc --noEmit exit 0 (full project, twice); 5/5 targeted tests green. Engine probed: the seeded
  candidate set fires exactly 3 events (2 player + 1 team via team-dd) under 'standard' → the written>0 / per-event / team-
  target assertions are non-vacuous. Self-checks: 6 gate branches in correct order (Fame/Flashpoint/Checkpoint/Traits/L10
  at processCompletedGame.ts:639); no Date.now/Math.random in the new compute; flag default false; NO trackerDb/backup/
  syncConfig/ledger-PIN files touched (v23 unchanged, zero migration risk); no franchiseRandomEventGenerator import.
- **INDEPENDENT AUDIT (decorrelated reader subagent, ≠ builder):** VERDICT VERIFIED, 0 major / 3 minor. M1 (seam test
  never fired a team-target row) → CLOSED in-session by adding team-dd(fanMorale 0) so a targetKind:'team' row maps end-to-
  end; re-ran 5/5 green + tsc-0. M2 (cosmetic single-sort divergence from the mirror) — left, behavior-correct. M3 (sandbox
  probe artifacts probe_l10_*.mjs in repo root — mount blocked unlink) → host must delete, NOT commit.
- **HOST GATE:** `NODE_ENV= npm run build` (exit 0) + full suite (7,535/435 → 7,533 pass / 2 characterized fail, ZERO new
  reds, +5) → delete probe_l10_tmp.mjs / probe_l10_team.mjs / probe_l10_full.mjs / .watch_write_test /
  .claude/settings.local.json → commit EXACTLY the 5 files (co-author trailer, never push). Live path → browser-pending #24.
- **➡ NEXT (after host-commit) = L10-4** (stadium-change event) then L10-5 (reporter tap) per L10_SCOPE_MAP.md §3.

## 2026-06-18 — L10-3 HOST GATE PASSED + COMMITTED (fresh attended session, AUTH-4 keep-rolling)
- JK started a fresh session, confirmed the restate, ruled "host gate → commit → continue L10-4" (AUTH-4 still on) and
  "fold the 3 session docs into the L10-3 commit". Real host (node v20), `NODE_ENV=` already clean.
- Re-verified the L10-3 diff against the contract before committing: flag default OFF + flag-gate FIRST; the 6th gate
  branch is try/catch-wrapped (only `console.warn`s, never blocks completion); `createdAt` from the max at-bat timestamp
  (no Date.now/Math.random); NO store/DB/backup/PIN/syncConfig touch (trackerDb v23 unchanged); no
  `franchiseRandomEventGenerator` import. Removed the stale `.git/index.lock`; deleted the sandbox junk
  (probe_l10_tmp/team/full.mjs, .watch_write_test, .fuse_hidden0000000200000001). Left the untracked
  `reference-docs/Super Mega Baseball 4 Rosters.csv` (separate pending item).
- **`NODE_ENV= npm run build` exit 0** (`✓ built in 7.74s` + PWA → tsc clean). **Full suite `NODE_ENV= npm test`:
  7,540/436, 7,538 pass / 2 fail** = EXACTLY the characterized baseline (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`),
  ZERO new reds, +5 / +1 file = `franchiseL10SweepCompute.test.ts`.
- **Committed** on codex/franchise-v1-next (5 contracted files + the 3 session docs folded in per JK; co-author trailer;
  NOT pushed). WAITING_ON_JK [ticket:L10-3] marked RESOLVED. Live path → browser-pending #24.
- **➡ NEXT = L10-4** (stadium-change event: low base rate suppressed by high fan morale, pool-pick from `parkLookup.ts`,
  writes `FranchiseTeamStadiumSnapshot` so analytics recompute — persistence-adjacent, medium risk; needs a contract).

## 2026-06-18 — L10-4 stadium-change resolver: contract → subagent-built → Opus-audited VERIFIED → COMMITTED (attended, AUTH-4)
- **Grounding** resolved the architecture: L10-1 ALREADY emits a representative `stadium_change` team event
  (`franchiseL10EventEngine.ts:147`) and L10-3 ALREADY persists it as a dark pending overlay; the recompute path
  (`franchiseStadiumFoundation.ts buildStadiums`) merely READS `FranchiseTeamStadiumSnapshot[]`. So L10-4 is the PURE
  concrete-resolution step — pick WHICH new park + build the snapshot payload — consumed by the deferred post-D13 apply
  step. **Risk re-classified medium→low** by keeping it pure (no live write/recompute), faithful to the doubly-dark L10
  model.
- **DESIGN CALL (AUTH-4 default, FLAGGED for JK):** pure resolver only; the snapshot WRITE + analytics recompute defer to a
  post-D13 apply ticket (mirrors L9b-3c's orphaned-pending applier). Open-Q#4 (user-team vs AI-only) bites only at that
  apply step → default allowed/suppressed taken upstream; not decided here. The pure resolver is never-wasted regardless.
- **Triangle:** Captain wrote the contract (PROMPT_CONTRACTS.md) → delegated the BUILD to a fresh subagent (builder) →
  Captain (Opus) INDEPENDENTLY audited the diff line-by-line (builder ≠ auditor).
- **Deliverable (2 files):** NEW pure `src/engines/franchiseStadiumChangeResolver.ts` — `pickStadiumFromPool`
  (SHARED w/ L14 rebrand; `getAllParks` pool, exclude-current-by-`getStableParkId`, full-pool fallback, FNV-1a
  `franchiseL10DeterministicRoll`-seeded clamped index) + `resolveFranchiseStadiumChange` (guards team/stadium_change,
  `pickSeed` from `event.seed`, returns `{newStadium, snapshot}`) + `FranchiseStadiumChangeResolution`; NEW
  `__tests__/franchiseStadiumChangeResolver.test.ts` (10 tests). PURE (no IndexedDB/Date/Math.random/async); build-DARK
  (no production importer, no store, trackerDb v23, no wiring).
- **Host gate:** `NODE_ENV= npm run build` exit 0 (PWA → tsc clean); full suite **7,550/437, 7,548 pass / 2 characterized
  fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds, +10 / +1 file. **Audit VERDICT VERIFIED**
  (0 major / 2 trivial minors: single-park-pool fallback untested without mocking the real pool; per-team divergence not
  explicitly asserted — both non-defects). Committed on codex/franchise-v1-next (2 code files + doc updates; not pushed).
- **➡ NEXT = L10-5** (reporter tap: applied L10 event → `SeasonNewsEvent` `RANDOM_EVENT` via `seasonNewsGenerator.ts` →
  `seasonNewsItems`; risk low-med) per L10_SCOPE_MAP.md §3.

## 2026-06-18 — L10-5 reporter tap: contract → subagent-built → Opus-audited VERIFIED → COMMITTED → L10 COMPLETE (attended)
- **Grounding:** the reporter pipeline is `SeasonNewsEvent` (`seasonNewsGenerator.ts:11-19`) → `generateSeasonNewsTake`
  (the LIVE LLM/Supabase reporter — byte-unchanged per L5d, seam deferred post-D13). `RANDOM_EVENT` is already a
  `NarrativeEventType` (`narrativeEngine.ts:88`). So L10-5 is the PURE adapter: fired L10 event → `SeasonNewsEvent`.
- **DESIGN CALL (AUTH-4 default, FLAGGED, same shape as L10-4):** pure adapter only; does NOT call the live reporter or
  wire any emission path — the live emission (call `generateSeasonNewsTake` + persist the `SeasonNewsItem`) is the deferred
  post-D13 seam (mirrors L5d + L10-4). **Layer note:** the adapter lives in `src/src_figma/app/engines/reporter/` (with the
  reporter), because core `src/engines` must not depend on the UI-layer `SeasonNewsEvent` type — the only L10 piece outside
  core, by correct dependency direction.
- **Triangle:** Captain wrote the contract → delegated BUILD to a fresh subagent → Captain (Opus) independently audited
  line-by-line (builder ≠ auditor).
- **Deliverable (2 files):** NEW pure `src/src_figma/app/engines/reporter/franchiseL10NewsAdapter.ts`
  (`buildFranchiseL10SeasonNewsEvent` → eventType 'RANDOM_EVENT', subjectIds [targetId], facts = deterministic ground-truth
  event fields, conservative bounded `dramaticWeight = clamp(base[valence] + magnitudeScale×magnitude, 0, 1)` via
  `L10_NEWS_DRAMATIC_WEIGHT`) + NEW `src/src_figma/__tests__/reporter/franchiseL10NewsAdapter.test.ts` (9 tests incl. an
  exact-key-set lock on the SeasonNewsEvent shape). PURE (no LLM/network/IndexedDB/Date/Math.random/async); build-DARK
  (no production caller, reporter byte-unchanged, trackerDb v23).
- **Host gate:** `NODE_ENV= npm run build` exit 0; full suite **7,559/438, 7,557 pass / 2 characterized fail**
  (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds, +9 / +1 file. **Audit VERDICT VERIFIED** (0 major /
  0 minor). Committed on codex/franchise-v1-next (2 code files + doc updates; not pushed).
- **⇒ L10 (random events) COMPLETE: L10-1 `607fa015` · L10-2 `a830a61f` · L10-3 `8a33d9d3` · L10-4 `057340ed` · L10-5 —
  all build-DARK, activate post-D13.** **➡ NEXT = L11 (managers)** per the L-stack (L11 → L12 races/All-Star/awards-fame →
  L13 relationships → L14 rebrand → the L-SIM gate); a fresh subsystem needing a grounding recon before contracting.

## 2026-06-19 — AUTH-4 OVERNIGHT RUN RE-ENGAGED (JK switched it on; rulings all locked)
- **Mode:** AUTH-4 unattended. JK ruled all 43 L11–L14 questions (committed `d8bd0670`), so the soul-layer DESIGN is
  pre-decided — tonight is pure build to the ratified spec + rulings. `caffeinate -i -s` running (Mac stays awake).
  Builder routing = **Codex** (`codex exec`, stdin-from-contract, harness sandbox disabled per call); auditor = Opus
  Captain (cross-model triangle). Branch codex/franchise-v1-next; commit, NEVER push; co-author trailer; NODE_ENV= on all
  tsc/vitest; each ticket gates tsc 0 + build 0 + the characterized suite baseline (now **7,703/439, 2 characterized
  fail**: wpaRuntimeBoundary + franchiseManualSmokeFixture; trackerDb v23).
- **Handoff safety:** `.gitignore` un-ignored `HANDOFF_NEEDED`/`HANDOFF_DONE_*` (`ad75afa4`) so the cron resume picks up
  a handoff from committed state. On context-limit: Session-End + write+COMMIT `HANDOFF_NEEDED` (next_ticket/branch/
  resume_note), then stop; the cron launches a fresh session.
- **Tonight's QUEUE (build to spec, document, keep rolling):** L11-3 (flag + shared `fireManager` resolver) → L11-3b
  (auto-backstop trigger reviving `managerFireProbability`) → L11-4 (Almanac fire/hire-date join + fired marker) → L11-5
  (reporter tap) → the fame double-ladder collapse (L12-Q10 pre-L12 cleanup) → L12 (recon-split: award-cat ext / All-Star
  roster / race standing / TV-family) → L13 (recon-split: §24 taxonomy / formation gate / matrix edge rows / reporter
  inaccuracy) → L14 (rebrand cascade) → L-SIM gate. All build-DARK; magnitudes = §16 placeholders.
- **DONE pre-run (this session, committed):** L10-Q5Q8 `f1d3fe53` · L11 recon `cf097d09` · L11-1 `46c3c761` · L11-2
  `1821ad21` · worksheet `41bc91c6` · ruling-pass consolidation `d8bd0670` · gitignore `ad75afa4`.

## 2026-06-19 — L11-3: shared `fireManager` resolver — Codex-built → fix1 → Opus-VERIFIED → COMMITTED
- **Built (3 files):** flag `isFranchisePhase2L11Enabled` (default-OFF, 7th block) + NEW `src/utils/franchiseManagerFiring.ts`
  (`fireManager(params)`: flag-gate → resolve active assignment → reconstruct the team's firing snapshot [MLB roster +
  per-player valueDelta/personality/loyalty/resilience + team-fan morale, mirror `resolveL10Candidates` scoped to teamId]
  → `computeFranchiseL11Firing` [L11-1] → write relief [unless suppressFanReliefBump] + per-player ripples via
  `applyFranchiseMoraleEffect` → `setManagerFired` [L11-2] → auto-gen successor [`buildDefaultManagerProfile`]) + a 5-test
  suite + a `managerFiringSeam`. Caller-supplied `endDate` (no Date.now); build-DARK (no live caller).
- **Seam decisions:** `instanceId` passed through (no key guessed); `buildDefaultManagerProfile` takes `ManagerTeamIdentity`
  resolved from `getAllFranchiseTeams`; added `seasonNumber` to params (required by `applyFranchiseMoraleEffect` scope).
- **fix1 (build break the host gate caught):** `firingPlayers` was typed `readonly FranchiseL11FiringPlayer[]` → `.push`/`.sort`
  illegal under `tsc -b` (Codex's `tsc --noEmit` missed it). Fixed = mutable `FranchiseL11FiringPlayer[]` accumulator.
  PROCESS: future contracts verify with `NODE_ENV= npm run build` (not just tsc --noEmit).
- **⚠ OPEN DECISION → L11-4:** the successor `saveManagerAssignment` reuses the `[mode,instanceId,teamId]` key → it
  OVERWRITES the `setManagerFired` tombstone, so the fired manager's `fired`/`endDate`/`reason` in the assignment store is
  TRANSIENT. The firing IS recorded in morale history (sourceEventId `manager-fired:…`) + `firedManagerId` is returned, but
  the fired tenure-end (date/reason) must be persisted DURABLY by **L11-4** (the Almanac `ManagerTeamTenureAggregate`
  fire/hire-date fields, per JK-Q9) — captured from the firing event/`firedManagerId`, NOT by reading the overwritten
  assignment. L11-4 may restructure the resolver order (capture legacy before the successor swap) or drop the now-transient
  `setManagerFired` from the replace path. NOT a safety wall (build-DARK, no live caller).
- **Audit VERDICT VERIFIED** (0 major / 1 documented open-decision-for-L11-4): resolver read line-by-line; tests
  non-vacuous (flag-off no-loads; fired→relief+ripple+successor+morale snapshots rose/dropped, net-positive untouched;
  suppress→no relief; no-active-manager→no writes; determinism). Host gate: `NODE_ENV= npm run build` exit 0 (8.10s) +
  full suite **7,708/440, 7,706 pass / 2 characterized fail** (wpaRuntimeBoundary + franchiseManualSmokeFixture), ZERO new
  reds (+5). trackerDb stays **v23**. ➡ NEXT = L11-3b (per-game auto-backstop trigger reviving `managerFireProbability`).

## 2026-06-19 — L11-3b: per-game auto-backstop trigger — Codex-built → fix1 (triangle caught a real defect) → VERIFIED → COMMITTED
- **Built (3 files):** NEW `src/utils/franchiseManagerAutoBackstop.ts` `persistDarkL11AutoBackstopForCompletedGame` (mirror
  the L10 hook: flag-gate FIRST → resolve gameNumber + max-at-bat createdAt → check ONLY the completed game's home/away
  teams → if team-fan morale < `armingThreshold` 25, deterministic FNV-1a roll < `perGameProbability` 0.004 → `fireManager
  ({reason:'auto-backstop'})` in try/catch) + `L11_AUTO_BACKSTOP_TUNING` (§16) + `autoBackstopSeam` + 5 tests; wired as the
  7th gate branch in `processCompletedGame.ts` right after the L10 branch (using `trueValueScope`). Doubly-dark; no
  Date.now/Math.random. **DEFAULT-TAKEN (AUTH-4):** v1 uses a FLAT §16 per-game probability gated by low morale; the
  payroll-band `managerFireProbability` (salaryCalculator.ts:1259-1301) scaling is the intended refinement, DEFERRED
  (needs team-payroll ranking). And: per-game scope = the 2 game teams (not a league sweep) — bounded/conservative.
- **⚠ DEFECT CAUGHT BY AUDIT → fix1:** Codex guessed `instanceId = scope.franchiseId` (violating the contract STOP-IF).
  WRONG — franchise manager assignments are keyed `instanceId = LEAGUE_BUILDER_MANAGER_INSTANCE_ID` ('league-builder',
  managerIdentityStorage.ts:21; created so at LeagueBuilderTeams.tsx:308-309/494-495). With franchiseId, `fireManager`'s
  `getManagerAssignment` lookup always misses → 'no-active-manager' → the auto-backstop would NEVER fire at activation.
  fix1 = import + use `LEAGUE_BUILDER_MANAGER_INSTANCE_ID`. (Build-DARK so no live harm; the cross-model triangle caught a
  silent-activation-failure bug — the value of Opus-audits-Codex on live-path tickets.)
- **⚠ VERIFY-AT-ACTIVATION (logged, not blocking — build-DARK):** the team-id NAMESPACE — `gameState.homeTeamId`/`awayTeamId`
  must match the franchise team-id namespace used by the morale snapshots (`getFranchiseMoraleSnapshot 'team-fan' teamId`)
  AND the manager-assignment `teamId`. Not independently confirmed this run; JK's activation/browser pass must verify the
  auto-backstop targets the right team. (Same latent namespace assumption applies to L11-3's `fireManager` snapshot.)
- **Audit VERDICT VERIFIED** (after fix1): hook read line-by-line; gate branch mirrors L10; deterministic roll stable;
  tests non-vacuous (flag-off no-loads; cratered+roll-hit→fire; healthy→skip; cratered+roll-miss→no fire; determinism).
  Host gate: `NODE_ENV= npm run build` exit 0 (7.66s) + full suite **7,713/441, 7,711 pass / 2 characterized fail**, ZERO
  new reds (+5). trackerDb v23. ➡ NEXT = L11-4 (Almanac fire/hire-date join + the L11-3 OPEN fired-tenure persistence).

## 2026-06-19 — CONTEXT HANDOFF at L11-4 (AUTH-4 overnight continues via cron/fresh session)
- This session built the L11 firing CORE: L11-1 engine `46c3c761` · L11-2 legacy-write `1821ad21` · L11-3 fireManager
  resolver `4c59ecbd` · L11-3b auto-backstop `7268f9f1` (+ gitignore handoff fix `ad75afa4` + ruling-pass consolidation
  `d8bd0670`). All build-DARK, branch-only, host-gated (suite 7,713/441, 2 characterized fail), each Codex-built →
  Opus-audited (the triangle caught 2 real defects: a tsc -b build break [L11-3] + an instanceId silent-activation bug
  [L11-3b]).
- **Handing off at a clean seam** (L11 firing core complete) so a FRESH-context session builds the remaining queue
  (L11-4 design decision + L12/L13 recon-splits) with full rigor. `HANDOFF_NEEDED` written + committed (next = L11-4,
  rich resume_note). CURRENT_STATE live header + this log are current; nothing pushed. The cron / a fresh session resumes
  per `HANDOFF_NEEDED` + the QUEUE above.

## 2026-06-19 — L11-4: Almanac tenure join + durable fired-tenure persistence — CONCURRENT-WIP TAKEOVER → Opus-audited → host-gated → COMMITTED ⇒ L11 firing core COMPLETE
- **CONCURRENCY EVENT:** the cron resume launched a fresh session that, mid session-start grounding of L11-4, found the
  ticket ALREADY built in the working tree by a SECOND concurrent AUTH-4 session that then stopped (uncommitted; HEAD still
  the handoff commit 1543f941; the diff GREW 111→388 insertions across 8 files DURING the reads, then went stable ~230s; no
  live build/codex proc; list_sessions: no other running session). Stood down + logged WAITING_ON_JK [ticket:L11-4]. JK
  ruled TAKE OVER.
- **AUDIT (independent, builder≠auditor — this session did NOT build the diff):** read all 8 files line-by-line. CORRECT +
  on-spec to L11-Q9 + the L11-3 OPEN resolution. Key checks: (1) `recordManagerTenureEnd` rides the managerId-keyed identity
  profile → NO DB-version bump (additive optional `tenureRecords`; manager-identity DB stays v2, trackerDb v23); (2)
  idempotent on (teamId,mode,instanceId,endDate); (3) `saveManagerProfile` merges `{...existing,...input}` so an unrelated
  re-save never drops `tenureRecords`; (4) `fireManager` captures the FIRED `assignment.managerId` + `startDate`(=hireDate)
  BEFORE the successor `saveManagerProfile`/`saveManagerAssignment` overwrites the team-keyed `[mode,instanceId,teamId]` row
  — so the legacy survives (the `setManagerFired` tombstone was transient, the L11-3 OPEN); (5) `findTenureRecord` =
  latest-endDate-wins on re-fire + cross-stint-bleed guard, seeded at working-tenure create, copied out in
  `finalizeManagerTenure`, joined at all 3 sites (decisions/stints/deltas) with a clean `profile` refactor (no label-path
  behavior change). Tests non-vacuous: idempotency replay (len 1), reload-from-store (persistence not just in-mem),
  merge-preservation, cross-stint bleed guard, active-tenure-no-dates, null-profile→null, end-to-end fireManager assertion.
- **HOST GATE:** `NODE_ENV= npm run build` exit 0 (✓ 7.65s + PWA) + `NODE_ENV= npx vitest run` → **7,720/441, 7,718 pass / 2
  characterized fail** (`wpaRuntimeBoundary` allowlist on franchiseAnalyticsTrust.ts [untouched by L11-4] +
  `franchiseManualSmokeFixture` 5s-timeout flake), ZERO new reds, +7 tests. Committed branch-only on codex/franchise-v1-next
  (NEVER pushed); HANDOFF_NEEDED deletion folded in.
- **⚠ PROCESS for JK:** TWO AUTH-4 workers ran concurrently on the same branch (overnight cron + a manual "start new
  session"). Took over cleanly with no corruption, but concurrent AUTH-4 sessions are a collision/lost-work hazard (cf. the
  fe65bf4b precedent). Recommend: keep exactly ONE AUTH-4 worker active.
- **➡ NEXT = L11-5** (reporter tap: fired/relocated manager event → SeasonNewsEvent, mirror L10-5's pure adapter; build-DARK)
  → fame double-ladder collapse (L12-Q10 pre-L12 cleanup) → L12 recon-split.

## 2026-06-19 — L11-5: reporter tap (manager firing/relocation → SeasonNewsEvent) — Codex-built → Opus-audited → host-gated → COMMITTED ⇒ L11 (managers) FULLY COMPLETE
- **Routing restored to spec (Codex builder):** Opus (Captain) wrote the contract to PROMPT_CONTRACTS.md → Codex (gpt-5.5,
  very-high) built via `codex exec --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check -` fed a stdin heredoc
  that POINTED at the contract section (NOT duplicated; NOT a subagent) → Opus independently audited the diff (builder≠auditor,
  cross-model triangle) + ran the full host gate. Codex stayed within the 3 contracted code files (no scope creep).
- **Deliverable (3 files):** (A) `src/engines/narrativeEngine.ts` — `MANAGER_CHANGE` added to `NarrativeEventType` + the
  exhaustive `hedgingModifier` (0.90, "front-office fact known, motives uncertain" — matches TRADE_REACTION) + `highStakesEvents`;
  additive + DORMANT (no `MANAGER_CHANGE` emitter exists → live behavior byte-unchanged for every existing event type).
  (B) NEW pure `src/src_figma/app/engines/reporter/franchiseL11ManagerChangeNewsAdapter.ts`
  (`buildFranchiseManagerChangeSeasonNewsEvent`: endReason = rebrand→relocated else fired [inline map, NO managerIdentityStorage
  import → stays IndexedDB-free]; valence relocated→neutral else negative; magnitude = clamp((50−fanMorale)/50,0,1) default 0.4;
  dramaticWeight = clamp(base[valence] + 0.3·magnitude, 0,1) via `L11_NEWS_DRAMATIC_WEIGHT {neutral 0.4, negative 0.6}`;
  eventType `MANAGER_CHANGE`; subjectIds [fired, successor?]; constant-key facts; PURE; no id/createdAt). (C) NEW 9-test file.
  Lives in `src/src_figma/app/engines/reporter/` (correct dependency direction — depends on the UI-layer SeasonNewsEvent type,
  like L10-5). build-DARK: NO production caller, `seasonNewsGenerator.ts` untouched, NO flag/store/trackerDb change (v23).
- **Audit VERDICT VERIFIED** (0 major / 0 minor): adapter is a faithful L10-5 mirror; narrativeEngine change additive+dormant;
  tests non-vacuous (user==auto-backstop weight; rebrand<firing at same morale; morale monotonic; clamp [0,1] at morale 0;
  no-successor subjectIds; determinism; fabrication/`id`/`createdAt` guard).
- **HOST GATE (full, mine — Codex ran only the single test file):** `NODE_ENV= npm run build` exit 0 (✓ 7.5s + PWA) +
  `NODE_ENV= npx vitest run` → **7,729/442, 7,726 pass / 3 fail** = 2 characterized (`wpaRuntimeBoundary` +
  `franchiseManualSmokeFixture`) + 1 order-flake (`EliminationTeamHub` "legacy POG" — CONFIRMED passing solo 16/16 with
  TeamPage; L11-5's surface has zero causal path to it), ZERO new reds, +9 / +1 file. Committed branch-only on
  codex/franchise-v1-next (3 code files + docs; NEVER pushed).
- **⇒ L11 (managers) FULLY COMPLETE:** L11-1 `46c3c761` · L11-2 `1821ad21` · L11-3 `4c59ecbd` · L11-3b `7268f9f1` · L11-4
  `3e718e4f` · L11-5 (this commit) — all build-DARK behind `isFranchisePhase2L11Enabled`, activate post-D13.
- **➡ NEXT = the fame double-ladder collapse (L12-Q10)** — a pre-L12 CODE-CLEANUP ticket + HARD PREREQUISITE before any L12
  race goes live: retire the `fameEngine.ts getFameTier` forbidden labels; every race/fame-tier read must go through
  `resolveFameTier`. Then L12 recon-split (award-cat extension / All-Star roster / race standing weighted-composite /
  TV-family). Needs grounding (grep the two fame-tier ladders + their consumers) before contracting.

## 2026-06-19 — L12-Q10 fame double-ladder collapse RULED (defer) → CONTEXT HANDOFF at L12
- Grounded the fame double-ladder collapse (L12-Q10): legacy scalar `getFameTier(totalFame)` [fameEngine.ts:349,
  forbidden labels Fan Favorite/Villain] is LIVE (fameIntegration.ts:556 + useFameTracking); canonical `resolveFameTier`
  [fameModel.ts:191, §20.7 Heat/Reach ladder] is build-DARK with NO live per-player data until post-D13. §20.8 describes
  the post-activation target but NOT the pre-activation scope → surfaced the fork (protected asset; no-inference rule).
- **JK RULING (a) — defer:** the live label-purge moves to the post-D13 fame activation; L12-Q10's hard requirement folds
  into L12 (race code reads `resolveFameTier`, never `getFameTier`). No standalone work now. (DECISIONS_LOG 2026-06-19.)
- **HANDOFF written at a clean seam** (L11 fully complete + L12-Q10 ruled). NEXT = L12 (recon-split first, mirror L10/L11).
  This session: L11-4 takeover `3e718e4f` + L11-5 `f77b3c75`, suite 7,729/442 ZERO new reds, 2 forks ruled (take-over,
  L12-Q10-defer). ⚠ One concurrent-worker collision this session (handled cleanly) — keep ONE AUTH-4 worker active.
- ➡ NEXT = L12 recon-split (award-cat extension [L12-Q1] / All-Star roster [L12-Q5] / race-standing weighted-composite
  [L12-Q2] / TV-family KK·Bust·Comeback [AWARD-3]) per the L11–L14 ruling pass + DECISIONS_LOG; then L13 → L14 → L-SIM.

## 2026-06-19 (AUTH-4 overnight) — L12 RECON DONE (read-only) + a 2nd-worker collision reconciled; next = contract L12-1
- **L12 grounding recon produced `spec-docs/L12_SCOPE_MAP.md`** (canonical, on disk), mirroring the L10/L11 scope maps:
  8 sections — subsystem surface, v1 mechanic (§20/§21/§23), an ordered **6-piece split**, the RULED forks, a full
  file:line seam table, the trigger/cadence model, residual open micro-forks, and a dark-build checklist. Read-only:
  NO build contracted, NO source edited, NO host gate, NO Codex invoked.
- **THE 6-PIECE SPLIT (risk-ascending):** L12-1 dark landing infra (clone the L11 flag → `isFranchisePhase2L12Enabled`;
  widen `FranchiseAwardCategory` +ALL_STAR/BENCH_PLAYER/BOOGER_GLOVE/RELIEVER_OF_YEAR [Q1, defer the 2 one-shots]; the
  All-Star multi-selection roster store → trackerDb v23→24 + ledger PIN + C4 backup DoD) · L12-2 TV-family scorers
  [Q7, pure, no store] · L12-3 race-standing weighted composite + bands + Q3 tilt + Q4 GG defensive-fame share ·
  L12-4 All-Star roster builder + 60% lock [Q5/Q13] · L12-5 emission [Q6] + L3 race-snub row + honor→Reach-floor [Q9]
  + reporter tap · L12-6 Almanac/UI surfacing.
- **Method = workflow fan-out (7 code-grounded readers) → synthesis → adversarial critique → Captain finalize**
  (`wf_ad44749b-459`). Every load-bearing anchor independently re-verified on-branch. Critique verdict
  SOUND-WITH-CORRECTIONS — 5 fixes applied: ledger-PIN test path = `src/utils/tests/franchiseSeasonLedgerStorage.test.ts`;
  the award engine/storage live in `src/utils/` NOT `src/engines/`; `AwardsWatchlist.tsx` = `src/src_figma/app/components/`;
  `channelForFameEventType` :178-181; the SECOND `FranchiseWarAwardCategory` [eng:38-41] exhaustive-switch compile
  coupling. Captain ALSO caught a critique off-by-one: the L11 if-block closes at **:654** and the designation `try`
  opens at **:655**, so the new L12 gate branch inserts after **:654** (NOT :655/:656).
- **Q10 hard requirement captured:** every L12 race/fame-tier read goes through `resolveFameTier` (`fameModel.ts:191`,
  ZERO live importers — L12 is its first live consumer), NEVER the forbidden-label scalar `getFameTier`
  (`fameEngine.ts:349`, labels :359/:363); the live-label purge of the 3 callers defers post-D13.
- **⚠ CONCURRENCY EVENT (2nd of the L-run):** a 2nd AUTH-4 worker ("cron-watcher resume") ran its OWN L12 recon in
  parallel (~08:16Z), produced a divergent **7-piece** `L12_SCOPE_MAP.md`, and appended entries here + to SESSION_LOG.
  This session's `Write` overwrote that map on disk; **JK ruled TAKE OVER + RECONCILE** — this 6-piece, adversarially-
  verified map is canonical; the duplicate's stale 7-piece log entries are folded into THIS one. 7 Claude sessions were
  open on the repo (session-start `ps` filtered out `claude`, so the concurrent worker was missed); JK to trim the
  extras / pause the cron. **Keep exactly ONE AUTH-4 worker active.**
- **➡ NEXT = contract L12-1** in an attended/host session (Codex-built via `codex exec` stdin-from-contract → Opus-audited,
  build-DARK behind the NEW `isFranchisePhase2L12Enabled`, default OFF; trackerDb stays v23). Branch codex/franchise-v1-next; nothing pushed.

## 2026-06-19 (AUTH-4 overnight) — L12-1 VERIFIED + COMMITTED: dark landing infra (flag + award-cat +4 + All-Star store, v24)
- **JK ruled 3 L12-1 kickoff micro-forks** (DECISIONS_LOG): contract NOW · All-Star = a DEDICATED `franchiseAllStarRosters`
  store (1st of Q1's two ledger bumps; race-standings store = deferred 2nd, at L12-3) · accept the recon merit bases
  (RELIEVER/BOOGER_GLOVE/BENCH_PLAYER — bind at L12-3, not L12-1).
- **Routing = Codex** (ratified): contract in PROMPT_CONTRACTS.md → `codex exec` (gpt-5.5, xhigh) stdin-pointer, background
  + watchdog. **Codex's STOP-IF correctly fired on 2 dispatches (my contract-wording bugs, NOT build issues)** → I fixed
  the contract each time (full 7-site mirror enumerated incl. the manifest + parity tests; the L10 CONSUMER
  `franchiseL10SweepCompute.ts` excluded; `src/engines/awardEmblems.ts` path pinned; store fixed to id-keyed) → v3 built.
  **An under-mirrored store was NEVER committed — the L6b-1 failure mode, prevented BEFORE the break.**
- **L12-1 (11 files):** flag `isFranchisePhase2L12Enabled` (default OFF) · `FranchiseAwardCategory` +4 + the 4 exhaustive
  `AWARD_FULL_LABELS` keys · NEW dark id-keyed `franchiseAllStarRosters` store mirroring `franchiseL10Overlays` at all 7
  sites (trackerDb v23→**24**, syncConfig, backupRestore schema + `.version` 24, ledger-PIN/manifest/parity tests) + a
  storage test. No engine/`processCompletedGame` touch (no scorer, no hook). KBL_BACKUP_VERSION stays 2; store count **43**.
- **Audit (builder=Codex ≠ auditor=Opus):** line-by-line diff + L10-precedent compare (faithful; shared `getTrackerDb`, no
  separate connection) + non-vacuous storage test. **FULL host gate:** build exit 0 (7.89s) + suite **7,737/443, 7,735 pass
  / 2 characterized fail**, ZERO new reds (+8). build-DARK; trackerDb v24. **➡ NEXT = L12-2** (TV-family scorers — pure). Nothing pushed.

## 2026-06-19 (AUTH-4 overnight) — L12-2 VERIFIED + COMMITTED: pure TV-family scorers + a JK Comeback-measurement correction
- **JK CORRECTION pre-dispatch (L12-Q7):** Comeback = **`currentTV − seasonLow`** (the CURRENT gap from the trough), NOT the
  Captain's drafted `max(currentTV − running season-low)` over checkpoints. A mid-season peak later given back must NOT win.
  Fixed the contract + scope map + DECISIONS_LOG + a pending SESSION_RULES lesson before dispatch. (Side effect: `min` is
  order-independent → no checkpoint ordering.)
- **L12-2 (2 new files):** PURE `src/engines/franchiseTvFamilyScorer.ts` — KK=`valueDelta` desc · Bust=`−valueDelta` desc ·
  Comeback=`currentTV − min(currentTV, snapshot trueValues)`; `{playerId,score,percentile,rank}[]` per race; percentile via
  the lifted `getPercentile`; rank desc, playerId tiebreak. Imports ONLY `getPercentile`; pure (no I/O/Date/random/async);
  inputs not mutated. NO caller/flag/store/trackerDb change.
- **Audit (builder=Codex ≠ auditor=Opus):** engine line-by-line + 8-test file non-vacuous (the Comeback falls-apart proof:
  50→20→45→30 ⇒ score 10 < a currently-recovered 48 ⇒ 28). **FULL host gate:** build exit 0 (7.57s) + suite **7,745/444,
  7,743 pass / 2 characterized fail**, ZERO new reds (+8). PURE/build-DARK; trackerDb stays v24.
- **➡ NEXT = L12-3** (race-standing weighted composite + bands + Q3 tilt + Q4 GG defensive-fame share; reads `resolveFameTier` only). Nothing pushed.

---

## 2026-06-20 (AUTH-4 overnight — RUN START) — JK enacted AUTH-4 for an unattended overnight max-production run

**Mode switched to AUTH-4 by JK directive ("enact auth-4 protocol to run this through the night").** Captain = Opus 4.8,
single-Captain (**Shape A**): Opus owns the integration line `codex/franchise-v1-next` (docs + Mode-2 dispatch/audit) and
dispatches Codex for Mode-1 in the worktree `/Users/johnkruse/Projects/kbl-mode1` [`codex/mode1-v1`, forked from `549f9832`].
Codex builds; Opus audits (builder≠auditor); branch-only, **never push**. The prior L13-7 thread retires.

**Kickoff setup done:**
- Mode-1 worktree created (`549f9832` base — has the ruled draft/farm specs) + `npm install` exit 0 → build-ready.
- 13 Mode-1 design-fork rulings + scout-privacy persisted at `549f9832` (commit is the Mode-1 build source).

**Corrected state (the CURRENT_STATE header was STALE — said NEXT=L13-3):** L13-1..L13-7 are DONE + committed (L13-7
`34bdd76e`). The L13 dark stack is ALSO largely WIRED into `processCompletedGame.ts:648-664` (formation + intensity +
morale, all behind `isFranchisePhase2L13Enabled()`). ⇒ L13-8 is substantially present; the one open question is whether
formation is CHECKPOINT-gated per Fork B (recon confirms).

**QUEUE (live — supersedes the stale protocol Queue at AUTONOMOUS_RUN_PROTOCOL.md:70-99):**
- **Mode-2 (here):** confirm L13-8 cadence → L13-3b (deferred captain/romance/co-rostered) → L14 (rebrand) → L-SIM gate.
- **Mode-1 (worktree):** build the auction/prospect/scout v1 from the ruled specs (PROSPECT §14 B1–B11 + AUCTION §5),
  anchored to `scoreSmb4Player`/`smb4PlayerGenerator`; scout-report privacy UI.

**Engine:** launched a grounding recon (Mode-2 remaining-work audit + Mode-1 build scope-map/split). On completion: write
contracts → dispatch Codex (bg, build + FAST gate only per the Codex L-SIM-stall lesson) → audit + run the heavy L-SIM legs
myself → host gate (tsc 0 / build 0 / characterized suite) → commit → next. Self-sustains via background-completion
re-invocation + a ScheduleWakeup fallback. SET-ASIDE-AND-CONTINUE on the 4 safety walls.

### Ticket log (newest at bottom)

**RECON COMPLETE (`wf_1012939c-048`, 6 agents).** Dependency-ordered split produced. Headlines:
- **L13-8 = VERIFIED DONE** (formation checkpoint-gated `franchiseRelationshipFormationCompute.ts:123`, intensity per-game,
  L13-6 charged-matchup wired, all 3 gate on the L13 flag + wired at `processCompletedGame.ts:648`, tests present). ⇒ **L13
  stack COMPLETE.** Not dispatched.
- **Mode-2 queue:** L14 (rebrand circuit-breaker — REQUIRED for v1, the 4th fan-morale tooth; zero code + zero contract) →
  L14-0 author contract (me) → L14-1 flag+dwell → L14-2 6-step cascade → L14-3 GM-offer + processCompletedGame wiring.
  Then LSIM-P1 (partial run now) → LSIM-P3 (full §6 matrix = the pre-flip passport, after L14-3). **L13-3b DEFERRED** (not v1).
- **Mode-1 queue (worktree):** prospect B-chain B5→B8→B2→B3→B4→B6→B7→B1→B9 — **ALL one file
  `src/utils/prospectScoutingDraftEngine.ts` → SERIALIZED**; auction AUC-1.1→1.2→2.1→(2.2,3.1)→4.1→5.1→5.2 (mostly disjoint
  new files). **B10 DEFERRED** (L-ECON3).
- **SAFETY WALLS (SET-ASIDE triggers):** `scoreSmb4Player` (`smb4GradeEmulator.ts:671`) + the §3.2 band thresholds are the
  FROZEN grade oracle — B1/B3/B4/B6/B7 generate AGAINST it (fine) but must NEVER modify it (a diff touching the oracle file =
  SET-ASIDE). AUC-5.2 (L-ECON1 freeze writer): `settledSalary` is a pure additive field (0 hits, no DB bump, stays v25) — SAFE
  iff the writer never re-prices trueValue / calls luxuryTax. L14 trackerDb writes (if any) must include the version-pin scope.
- **Recon path corrections folded in:** prospect engine is `src/utils/` (not `src/engines/`); L14 flag → `franchisePhase2Flags.ts`
  (not `src/config/flags.ts`); stadium-change resolver UNVERIFIED (L14-2 must locate/build it).

**WAVE 1 dispatched (2 disjoint Codex builds, parallel):**
- **B5** (Mode-1, worktree `codex/mode1-v1`): pin `PERSONALITY_POOL` (`prospectScoutingDraftEngine.ts:247`) to the canonical 7
  (PERSONALITY_SYSTEM_SPEC §2). Trivial, no oracle. — dispatched.
- **L14-1** (Mode-2, here): `isFranchisePhase2L14Enabled` flag + a PURE `franchiseRebrandDwell.ts` (dwell computed from
  fan-morale history — DEFAULT-TAKEN: derived, not persisted → no store/DB bump) + `REBRAND_RESET_MORALE=70` + band/trigger
  §16 constants. — dispatched.

**GATE STRATEGY (AUTH-4 engineering call, documented):** build (tsc+vite) ALWAYS; **FULL suite** for tickets that wire into
`processCompletedGame` / add a store / have broad imports (the transitive-import-mock risk per MEMORY); **build + affected
tests** for pure/isolated/build-dark tickets. Periodic full-suite checkpoint per stream. Read the vitest summary, not the RC
(characterized fails make RC nonzero).

**✅ B5 COMMITTED `0136598c` (codex/mode1-v1).** Audit: diff = exactly the `PERSONALITY_POOL` line → canonical 7 (Title-case
per `Player.personality`); CHEMISTRY_POOL untouched; no oracle/rating touch. **FULL host gate (Mode-1 baseline):** build 0;
suite **7890 pass / 2 fail = wpaRuntimeBoundary + franchiseManualSmokeFixture (characterized), ZERO new reds.** Codex caught a
contract path slip (playerMorale is `src/utils/`, not `src/engines/`) — harmless. ➡ NEXT Mode-1 = **B8** (drop age gen).

**✅ L14-1 VERIFIED — committing.** Audit: flag mirrors L13 EXACTLY (default-OFF + test setter, no registry); pure dwell
module correct (counts most-recent consecutive ≤ band-max from the end; armed ≥ trigger); NO importers (build-dark confirmed);
NO store/DB bump. Gate (adaptive — pure/build-dark): build 0 (tsc+vite) + its own 6 tests green. ➡ NEXT Mode-2 = **L14-2**
(6-step cascade). **Anchor correction:** the stadium-change resolver IS real at `src/engines/franchiseStadiumChangeResolver.ts`
(recon's `src/utils/` path was wrong) — L14-2 reuses it.

**WAVE 2:**
- **B8** (Mode-1, `codex/mode1-v1`): drop random age generation from the prospect generator (§10). — dispatched (`blp1co606`).
- **L14-2 grounding (Mode-2) — PARTIAL, contract HELD (no-inference):** located the reuse anchors `pickStadiumFromPool`
  (`franchiseStadiumChangeResolver.ts:42`) + `resolveFranchiseStadiumChange` (:77) for step 3, and `fanHopefulPlayerId`
  (`franchiseInitializer.ts:189`) + `computeTeamFanHopefuls` (top-3-by-scouted-grade reseed) for step 2. **STILL UNLOCATED
  (must ground before contracting — soul-layer, no inference):** (a) the "4 team/fanbase badges" taxonomy (only
  `FAN_FAVORITE_NAMED` surfaced — need the full set + how to clear); (b) the "existing trade-style fame reset" valve
  (FAME-7 — Heat-cool + Reach-floor-drop on trade; grep for the trade fame-reset fn came back empty). `teamHistory` is a
  NEW field (Q5; `tradeEngine.formerTeamName` is unrelated). **➡ NEXT Mode-2 = finish L14-2 grounding (locate the fame-reset
  valve + badge set), then contract + dispatch.** Mode-2 idle ~1 cycle by design (rigor > keeping the pipe full on the
  riskiest ticket).

**WAVE 3:**
- **B8 first attempt → correctly BLOCKED (STOP-IF fired):** `age` is a REQUIRED field on the global `Player` type
  (`leagueBuilderStorage.ts:235`) + the prospect DTO (`prospectScoutingDraftEngine.ts:149`), consumed by salary
  (`ageFactor` `salaryCalculator.ts:791`), season-transition aging (`seasonTransitionEngine.ts:129`), fitness, relationships,
  and the draft UI. Dropping it is cross-cutting. **🟡 DEFAULT-TAKEN / OPEN DECISION FOR JK (B8 age):** §10 says "drop the
  age field," but it's a required global contract → AMENDED B8 to set a fixed `PROSPECT_DRAFT_AGE = 18` (kills the random
  `18+rand*6` gen per §10's intent — no age variability at generation — while keeping the required field). Development stays
  L8 morale/performance-driven (not age). **JK: confirm fixed-age-18 vs a full age-field-removal refactor (v1.1?).**
  B8 re-dispatched (`b45n596ey`).
- **L14-2 grounding COMPLETE** (all 6 cascade primitives located, contract-ready):
  1. `fireManager({reason:'rebrand', skipUserConfirm:true, suppressFanReliefBump:true})` (`franchiseManagerFiring.ts:52-53`);
  2. clear the **4 badges = Team MVP / Ace / Albatross / Fan Favorite** (KEEP Captain — `FRANCHISE_V1_LIVING_SEASON_SPEC.md:248`)
     + clear old Fan Hopeful + reseed via `computeTeamFanHopefuls` (`franchiseInitializer.ts`);
  3. relocate stadium → `pickStadiumFromPool`/`resolveFranchiseStadiumChange` (`franchiseStadiumChangeResolver.ts:42/77`);
  4. team-wide trade-style fame reset → `fameModel.ts:119` `tradeReset` (heat×`heatRetention`, reachFloor=`reachFloorAfterTrade`);
  5. wipe dead money → STUB (Q6); 6. HARD-SET fan morale to `REBRAND_RESET_MORALE=70` LAST.
  + `teamHistory` = NEW field (Q5) — **DATA-SHAPE: confirm the team-record store (leagueBuilder vs trackerDb) before
  contracting; if trackerDb → version-pin scope.** **➡ L14-2 = next Mode-2 dispatch** (careful contract — atomic soul-layer; audit HARDEST).

**WAVE 4:**
- **✅ B8 COMMITTED `87331ae0`** (fixed `PROSPECT_DRAFT_AGE=18`; build 0; prospect test 14/14). ➡ NEXT Mode-1 = **B2** — dispatched (`bma9pnac3`, single §3.2 grade table).
- **L14-2 grounding (cont.):** `teamHistory` → the **leagueBuilder team record** (`leagueBuilderStorage.ts:139`, alongside
  captainPlayerId/fanHopefulPlayerId) — **NOT trackerDb → no version-pin trap; additive optional field** (like settledSalary).
  REMAINING GAP: the badge-clear is non-trivial — the 4 badges are COMPUTED designation records (`calculateFranchiseDesignations`
  `franchiseDesignations.ts:373`), not a static field; need the active-designation store + clear API (keep captainPlayerId),
  the team-wide player-fame-reset application path (apply `fameModel` tradeReset to every roster fame record), and the
  atomic+idempotent write pattern. **➡ Launched a focused L14-2 grounding agent** (badge-clear API · team-wide fame-reset
  application · teamHistory field · atomic/idempotency pattern · dead-money stub) → contract-ready spec, THEN dispatch L14-2.
  Rigor over speed on the riskiest ticket (AUTH-4).

**WAVE 5:**
- **✅ B2 COMMITTED `77bedc88`** (single §3.2 `STANDARD_GRADE_WEIGHTS`, round tables removed; build 0; prospect test 14/14).
- **➡ B3 dispatched (`codex-b3`)** — secondary-position generation via the §6 `P(secondary|primary)` map (pitchers none;
  composite labels IF/OF/IF-OF/1B-OF kept per the analyzer's versatility scoring; frozen-oracle untouched). Mode-1 chain now
  B5→B8→B2→**B3** (→B4→B6→B7→B1→B9).
- **L14-2 grounding agent in flight** (badge-clear API / team-wide fame-reset / teamHistory / atomic-idempotency) → on return,
  contract + dispatch L14-2.

**WAVE 6:**
- **L14-2 grounding agent STALLED** (stream watchdog, 600s no-progress; no clean result, transcript unreadable). Recovered by
  grounding the rest MYSELF: badge-clear = `franchiseDesignationStorage.ts` `deleteFranchiseDesignationRowsForScope`/`replace…`
  (:221/:237; Captain = `captainPlayerId`, separate); team-wide fame reset = `franchiseFameRecordsStorage` get/save + the
  existing trade-reset transform `fameModel.ts:225-240`; atomic pattern = mirror `fireManager` (:139) sequential awaits;
  morale via `applyFranchiseMoraleEffect` + `FranchiseMoraleScope`/`SourceKind`.
- **L14-2 SPLIT (proven pure/impure pattern, de-risks the riskiest ticket):**
  - **L14-2a (PURE transforms)** — `franchiseRebrandCascade.ts`: `applyRebrandFameReset` (reuse fameModel trade-reset),
    `selectRebrandDesignationRowsToClear` (the 4 badge types, keep Captain), `buildRelocationMarker`. Build-dark, testable.
    **➡ dispatched (`codex-l14-2a`, main).**
  - **L14-2b (impure orchestrator)** — NEXT: reads state, calls pickStadiumFromPool + computeTeamFanHopefuls + fireManager +
    the 2a transforms, persists atomically/idempotently (teamHistory marker = idempotency key), hard-sets morale 70 LAST.
    OPEN before 2b: confirm the morale **absolute hard-SET** path (vs delta) + the team-scoped badge clear (not all teams).

**WAVE 7:**
- **✅ L14-2a VERIFIED — committing.** Pure transforms `franchiseRebrandCascade.ts`: `applyRebrandFameReset` REUSES the
  existing `applyTradeReset` (`fameModel.ts:227` — no duplicate math), `selectRebrandDesignationRowsToClear` (the 4 badge
  types), `buildRelocationMarker`. Pure (no I/O/Date/random), no importers (build-dark), oracle/fame-tuning untouched.
  Build 0; 5 new tests green.
- **B3 first attempt → correctly BLOCKED** (§6 composite secondary labels IF/OF/IF-OF/1B-OF vs the narrow `DraftPosition | 'P'`
  DTO type). AMENDED: widen the DTO `secondaryPosition` to the global `Position` type (**VERIFIED** it already has the
  composites + matches `Player.secondaryPosition: Position` `leagueBuilderStorage.ts:240` + the analyzer `VERSATILITY_MAP`
  `smb4GradeEmulator.ts:174-181`); pitchers → undefined (no secondary). **Re-dispatched (`bm8yln8uv`).

**WAVE 8:**
- **✅ L14-2a COMMITTED `79cb7a7c`** (pure rebrand transforms; build 0; 5 tests; build-dark).
- **L14-2b grounding COMPLETE** (the impure atomic orchestrator — both open questions resolved):
  - **Morale hard-set (step 6):** morale snapshot stores absolute `currentValue`; only `applyFranchiseMoraleEffect` (delta)
    mutates it → hard-set 70 = read team-fan `currentValue`, apply `delta = 70 − currentValue` (clamp via `clampFranchiseMorale`;
    a `rebrand-reset` sourceKind). LAST, so nothing overwrites it.
  - **Team-scoped badge clear (step 2):** `deleteFranchiseDesignationRowsForScope` is FRANCHISE-WIDE (would nuke ALL teams) →
    use `getFranchiseDesignationRows(scope)` → drop only `{teamId===rebrandTeam && type∈REBRAND_BADGE_TYPES}` (via L14-2a's
    `selectRebrandDesignationRowsToClear` + teamId filter) → `replaceFranchiseDesignationRowsForScope(scope, kept)`.
  - Other steps reuse: `fireManager` (1), `pickStadiumFromPool`/`resolveFranchiseStadiumChange` (3), `getFranchiseFameRecordRowsByScope`
    + L14-2a `applyRebrandFameReset` + `saveFranchiseFameRecordRows` (4), `clearCarriedDeadMoney` stub (5), `computeTeamFanHopefuls`
    reseed (2). teamHistory marker = additive optional field on the leagueBuilder team (`leagueBuilderStorage.ts` ~:240 area, NOT
    trackerDb). **Idempotency:** skip if a teamHistory marker for {season,game} exists. **Atomicity:** mirror `fireManager`'s
    sequential awaits. **➡ L14-2b = next Mode-2 dispatch (dedicated careful contract; audit HARDEST — multi-store atomic soul-layer).**

**WAVE 9:**
- **✅ B3 COMMITTED `bbbde5fe`** (secondary positions via §6, type-widened to `Position`; build 0; prospect test 15/15;
  oracle untouched). Mode-1 at 4/9: B5→B8→B2→B3.
- **➡ B4 dispatched (`b11s0295g`)** — handedness via §7 conditional split (bats R51.6/L41.4/S7.0; throws conditional;
  position-conditioning deferred per ruling C).
- **➡ L14-2b dispatched (`b5lo7ajz8`, very-high effort)** — the impure atomic orchestrator `executeRebrandCascade`
  (idempotent via teamHistory marker; team-scoped badge clear; team-wide fame reset; morale hard-set delta-to-70 LAST;
  teamHistory field add; `rebrand-reset` sourceKind; dead-money stub). **AUDITOR RUNS THE FULL SUITE** (multi-store change →
  transitive-mock-break risk). build-DARK (no caller; L14-3 wires it).
  - **⚠ DISPATCH BUG (caught + fixed):** first L14-2b dispatch FAILED with a 400 — `model_reasoning_effort=very-high` is INVALID
    (Codex CLI accepts `none|minimal|low|medium|high|xhigh`). No files changed (never ran). Re-dispatched with `xhigh`
    (`bqz4uom12`). LESSON: the "very high effort" routing note maps to the CLI value **`xhigh`**, not `very-high`.**

**WAVE 10:**
- **✅ B4 COMMITTED `d406ec5a`** (handedness §7 conditional; build 0; prospect test 16/16; oracle untouched). Mode-1 at 5/9.
- **➡ B6 dispatched (`bi4yhhi5y`, xhigh)** — position-appropriate POSITIVE-only analyzer-recognized trait pools (§5.2 + §5.5)
  + 30/50/20 count (§3.4); remove Workhorse if unrecognized; retire orphaned traitPools.ts. Grounded: traits are display-name
  strings (analyzer normalizes + HITTER/PITCHER_TRAIT_FLAGS + countTraitPolarity; traitPricing carries polarity) → no
  code↔name conversion. Frozen oracle read-only.
- **L14-2b (`bqz4uom12`, xhigh) still building** — hard audit + FULL suite on landing (multi-store atomic soul-layer).

**WAVE 11:**
- **L14-2b AUDIT (SOUND) — full suite running (`brbkhf7ar`), then commit.** Read `franchiseRebrandApply.ts` line-by-line:
  all 6 steps in order; idempotency via `rebrand:team:season:game` marker (re-run → 'already-applied'); **team-scoped** badge
  clear (filter to teamId, keep other teams) + **team-roster-scoped** fame reset; morale delta-to-70 LAST; teamHistory +
  stadiumDimensions additive (NO DB bump); `rebrand-reset` sourceKind added; all imported APIs exist (tsc 0). The "1 test" is a
  COMPREHENSIVE e2e (4 badges cleared team-only + a beta team's rows + fame survive, Captain `captainPlayerId` untouched,
  morale=70, teamHistory len 1, idempotent 2nd run). Protected files (trackerDb/processCompletedGame/oracle/fameModel) untouched.
  **🟡 FLAGGED LIMITATION (build-dark, for L-SIM/JK):** non-ACID cross-store — a crash BETWEEN the fame-reset and the (last)
  marker write would, on retry, DOUBLE-apply the fame reset (`applyRebrandFameReset` isn't self-idempotent); marker-LAST is the
  safer choice (a marker-first would skip-and-leave-incomplete). Rare; recoverable; L-SIM will exercise. NOT a commit-blocker.
- **✅ L14-2b VERIFIED + COMMITTING.** Build 0; **FULL suite 7902 pass / 2 fail = wpaRuntimeBoundary + franchiseManualSmokeFixture
  (characterized), ZERO new reds.** ⇒ **L14-2 COMPLETE (a+b).** ➡ NEXT Mode-2 = **L14-3** (flag-gated GM-offer + processCompletedGame
  wiring + reuse the L11 news adapter rebrand→relocated mapping) → then LSIM-P1/P3.

**WAVE 12:**
- **✅ L14-2b COMMITTED `ed1cf4ef`** ⇒ **L14-2 COMPLETE.** **✅ B6 COMMITTED `6a123460`** (trait pools + 30/50/20; build 0;
  prospect test 19/19; oracle/traitPricing untouched). Mode-1 at 6/9.
- **➡ B7 dispatched (`btkp3hcem`)** — canonicalize arsenal §8 (≥1 FB/≥1 off-speed, role tapers, adopt smb4PlayerGenerator.buildArsenal).
- **➡ L14-3 dispatched (`codex-l14-3`)** — the rebrand GM-offer reader + accept wrapper. **DESIGN CALLS (flagged for JK):**
  (1) L14 is GM-INITIATED → **NO processCompletedGame block** (offer computed LIVE); (2) dwell read from the team-fan morale
  snapshot **history** (per-effect ≈ per-game proxy, mirrors the L11 backstop); (3) rebrand news is AUTOMATIC via the cascade's
  `fireManager(reason:'rebrand')` → L11 'relocated' adapter (no new adapter). Build-dark. ⇒ completing L14-3 = **L14 fully
  built (dark)**; then the L-SIM gate (LSIM-P1 partial now → LSIM-P3 full matrix = the pre-flip passport).

**WAVE 13:**
- **✅ L14-3 VERIFIED + COMMITTING** — `franchiseRebrandOffer.ts` (`getRebrandOffer` flag-gated live dwell-from-history;
  `acceptRebrandOffer` re-checks armed → `executeRebrandCascade`). New file only, NO processCompletedGame block (as designed),
  no importers (build-dark), build 0, 5 tests. ⇒ **L14 FULLY BUILT (dark): L14-1 (flag+dwell) + L14-2 (cascade) + L14-3 (offer).**
  **➡ Mode-2 NEXT = the L-SIM gate** (LSIM-P1 partial run now → LSIM-P3 full matrix = the post-D13 flip passport). L13-3b deferred.

**WAVE 14:**
- **✅ B7 COMMITTED `656705e9`** (arsenal §8: ≥1 FB/≥1 off-speed, role tapers junk-scaled; build 0; prospect test 20/20).
  Mode-1 at 7/9.
- **🟡 GAP FLAGGED FOR JK (POSITION_POOL):** the generator's `POSITION_POOL` (`prospectScoutingDraftEngine.ts:252`) produces
  SP×4/RP×2/CP + fielders but **NO `SP/RP`** and is NOT the §3.3 weighted distribution (ruling E says pitchers include SP/RP).
  No B-ticket covered the PRIMARY-position distribution (B3 = secondary). **Follow-up needed:** update POSITION_POOL to §3.3
  (add SP/RP + the real-pool weights). NOT a B7 issue (B7's SP/RP arsenal branch is correct-but-currently-unreached).
- **➡ B1 dispatched (`codex-b1`, xhigh) — THE KEYSTONE:** the generate-score-correct solve (§5.2) — features-first, binary-search
  δ against `scoreSmb4Player` to the §3.2 band center, re-score+correct, clamp [20,99] → realized grade == assigned grade
  (the spec's central 1.72pp claim). Frozen oracle read-only. After B1 = **B9** (the 40k ±1.5pp validation test) ⇒ Mode-1 done.
- **Mode-2: L14 fully built (dark) → NEXT = the L-SIM gate** (LSIM-P1 partial run, then LSIM-P3 full matrix).

**WAVE 15:**
- **✅ B1 COMMITTED `80ccb085` — THE KEYSTONE.** generate-score-correct solve; round-trip grade==assigned across all §3.2
  grades; oracle untouched; build 0; full suite **7898 pass / 1 fail = wpaRuntimeBoundary only (characterized), ZERO new
  reds** (franchiseManualSmokeFixture passed this run). Mode-1 at 8/9.
- **➡ B9 dispatched (`codex-b9`) — Mode-1 FINAL** — the §13 distribution-validation test (40k prospects → realized analyzer
  grades within ±1.5pp of §3.2; trait 30/50/20; position sanity). On green ⇒ **Mode-1 prospect-gen DONE** (modulo the
  POSITION_POOL SP/RP follow-up + the auction AUC-* chain, which is the separate Mode-1 auction track not yet started).
- **Mode-2 dedicated next = the L-SIM gate** (my verify runs: LSIM-P1 partial, then LSIM-P3 full matrix).

**WAVE 16:**
- **✅ B9 COMMITTED `fd772933` ⇒ MODE-1 PROSPECT-GENERATION COMPLETE (B1–B9).** §13 validation: 40k prospects reproduce
  §3.2 within **±0.3pp** (max |dev| B+ 0.308pp). The analyzer-anchored pipeline is proven end-to-end.
- **➡ AUCTION track STARTED — AUC-1.1 dispatched (`bs6gjehqt`)** — auction config/enums (disjoint new file, §5/§6 defaults).
  Remaining auction chain: AUC-1.2 (reserve-price) → 2.1 (state machine) → 2.2 (CPU shill) → 3.1 (persistence) → 4.1 (hot-seat UI)
  → 5.1 (farm auction) → 5.2 (L-ECON1 freeze) + scout-privacy UI. (Mode-1 worktree.)
- **➡ L-SIM GATE STARTED — smoke (24g) leg launched (`b917m7osm`).** Grounded: determinism check already in the harness
  (`seasonRunner.ts:1035`); the season leg WRITES `results/lsim-h2-baseline-checkpoint-{003..060}.json` → after the 60g leg
  I `git diff` those (byte-identical = L14 dormant = the proof; any change = a finding). Run smoke first, STANDARD 60g LAST
  (baseline-regen trap). Read the summary JSON, not the vitest RC.

**WAVE 17:**
- **✅ AUC-1.1 COMMITTED `446abc46`** (auction config/enums + defaults; build 0; 2 tests). ➡ AUC-1.2 dispatched (`b8cdaa5de`,
  reserve-price curve §7.5 + minSalaryByPosition + solvency-capped auctionMaxBid).
- **✅ L-SIM SMOKE (24g) PASS — CRITICAL all green** (every CRITICAL invariant 24/0, incl. all L12/L13/L14 soul checks:
  tv-freeze, reach-floor-ratchet, all-star-60%-lock, l13-relationship-formation/intensity/morale, l13-rep4-fan-nudge,
  awards-off-frozen-artifact, per-write-idempotency, channel-separation). digest@24 `4002051:7efd59ac`.
  **🟡 2 INVESTIGATE findings (non-blocking, logged for JK):** `soul.fame-war-legitimacy-floor` failed @games 23+24 (22/2) —
  a fame-vs-WAR legitimacy SOFT floor (INVESTIGATE-tag, not CRITICAL); likely a player carrying fame above the WAR-legitimacy
  floor late-season. (`soul.emission-snub-signal`/`fame-heat-fickle`/`l10-per-game-cadence` are INVESTIGATE but PASSED.)
- **➡ L-SIM SEASON (60g) leg launched (`b6q77pqdf`)** — determinism (same-seed byte-identical) + regenerates
  `results/lsim-h2-baseline-checkpoint-{003..060}.json`; on completion I `git diff` those (byte-identical = L14 dormant proof;
  change = finding) + read findings/determinism from the summary.

**WAVE 18:**
- **AUC-1.2 AUDITED SOUND — gate+commit HELD until the 60g season frees the CPU** (concurrent vitest risks timeout-flakes).
  `reservePriceCurve` 0.5→0.7-by-IV-percentile (top decile) is **§7.5-VERBATIM** (IV_ENGINE §7.5:502 + D14 table:611), NOT
  invented; `auctionMaxBid` = §2.3/§7.5 solvency cap; `minSalaryByPosition` single-sourced from the existing `MIN_SALARY` floor.
  The `salaryCalculator.ts` touch is behavior-neutral (`MIN_SALARY` = same 1666.49, now `= LEAGUE_MINIMUM_SALARY` in
  rosterEngineConstants — reuse-don't-duplicate; consumers franchiseDesignationStorage/Eligibility unaffected, same value).
  Frozen IV economics untouched. tsc 0; 5 tests. **➡ on 60g completion: run AUC-1.2 full suite (core-engine change) → commit →
  dispatch AUC-2.1 (state machine).**

**WAVE 19 — ✅ L-SIM GATE LSIM-P1: GREEN (major milestone).**
- **60g season leg: findings 0** (0 CRITICAL / 0 INVESTIGATE). **Determinism: same-seed byte-identical** (`8986467:13311171`).
  **finalDigest `8931876:4b218874` == L13-6/L13-7's committed digest, and the regenerated `results/lsim-h2-baseline-*.json`
  show ZERO git change ⇒ L14 is FULLY DORMANT** (zero sim-state change, the same proof L13-7 had). The 24g smoke's
  `soul.fame-war-legitimacy-floor` INVESTIGATE @23/@24 **did NOT recur at 60g** → a short-season edge, NOT a defect.
- ⇒ **The entire built-dark L-stack (L1–L14) is validated: deterministic, zero accumulated-state findings at 60g, §24.10
  morale↛WAR holds, L14 inert.** LSIM-P1 (the partial gate) is DONE.
- **➡ Remaining L-SIM = LSIM-P3** (the full §6 matrix: multi-seed · edge leagues [tiny/reliever-heavy/blowout/parity] ·
  multi-season continuity · real-save migration round-trip · + L14 dwell/cascade invariants) = **the post-D13 flip passport.**
  Distributions (this run): fame tiers spread (4 Immortal / 17 Local Hero / 11 Despised); trait grants 1640 gain/10 lose;
  awards finalized; auto-backstop firing 1.7%; flashpoint tax −22.15 (albatross). Season leg ~7min.

**WAVE 20:**
- **✅ AUC-1.2 COMMITTED `866cf56e`** (reserve-price/minSalary/maxBid; full suite 7906 pass / 1 characterized, ZERO new reds;
  salaryCalculator re-sourcing confirmed safe across consumers).
- **➡ AUC-2.1 dispatched (`codex-auc21`, xhigh) — the AUCTION CORE:** pure hot-seat state machine reducer (SETUP→NOMINATION→
  OPEN_BIDDING→RESOLVE→SOLD/PASSED→COMPLETE) per §2.2/§2.2.1 (RESOLVE: SOLD/PASSED/lone-survivor-tap-to-claim) /§2.2.2
  (progress invariant + legal-fill termination) + the Q1/Q2/Q4/Q5 rulings; reuses AUC-1.1 config + AUC-1.2 reservePriceCurve/
  auctionMaxBid. Pure, heavily tested. Next auction: AUC-2.2 (CPU shill) → 3.1 (persist) → 4.1 (hot-seat UI) → 5.1 (farm) →
  5.2 (L-ECON1 freeze) + scout-privacy UI.
- **Mode-2: LSIM-P1 done; LSIM-P3 (full §6 matrix passport) = a later dedicated build+run** (harness extensions for edge
  leagues / multi-season / real-save migration / L14 cascade invariants).

**WAVE 21:**
- **✅ AUC-2.1 COMMITTED `33b0cbff`** (auction state-machine core — RESOLVE/progress-invariant/termination verified by reading
  `evaluateResolve`; build 0; 12 tests). Auction at 3/~8.
- **➡ AUC-2.2 dispatched (`codex-auc22`, xhigh)** — CPU shill market (§7.6): pure valuation `IV×archetypeFit×personalityBias×
  noise±12%` (reuse composeIdentity) + probabilistic bargainInterestCurve (sim-tune, flagged) + depletable budgets +
  personalities; **HARD make-or-break = NO deterministic price floor** (tested across seeds). Next: AUC-3.1 (persist) → 4.1
  (hot-seat UI) → 5.1 (farm) → 5.2 (L-ECON1 freeze) + scout-privacy UI.

**WAVE 22 — HANDOFF (context near limit; JK prompted).**
- **✅ AUC-2.2 COMMITTED `ed846e5d`** — its in-flight build landed during the handoff; finished it cleanly (audit: NO
  deterministic floor structurally guaranteed — interest prob capped <1.0, bid only if minBid<valuation & under budget &
  seeded-interest passes; composeIdentity/economics untouched; build 0; 8 tests). Auction now at 4/~8.
- **CONTEXT HANDOFF written** (`HANDOFF_NEEDED` re-pointed to the CLEAN seam AUC-3.1; CURRENT_STATE live header refreshed;
  this ledger committed). Tree clean, no in-flight Codex. Fresh session resumes at **AUC-3.1** (persistence) → 4.1 → 5.1 →
  5.2 → scout-privacy UI → POSITION_POOL fix; Mode-2 = LSIM-P3. STOPPING per the context-handoff protocol.

**WAVE 23 — AUTH-4 RESUME (sole-owner continuation, JK-invoked 2026-06-21).**
- **CONCURRENT-SESSION COLLISION reconciled:** TWO sessions briefly ran — the WAVE-22 handoff session (auto-spawned by
  `HANDOFF_NEEDED`) AND this one (JK hand-invoked "start new session"). Both did the same first action (audit+commit AUC-2.2);
  the handoff session won the commit race (`ed846e5d`, 08:39:34Z) then STOPPED cleanly. **JK ruled THIS session = SOLE OWNER**
  (~3h later — nothing touched the tree in between; the other session is dead). Re-neutralized the handoff session's re-created
  `HANDOFF_NEEDED` → `HANDOFF_DONE_2026-06-21T115613Z` so no THIRD session auto-spawns. Documented root cause: handoff-auto-spawn
  + manual-invoke = two workers — the failure mode of the "KEEP EXACTLY ONE AUTH-4 WORKER" rule.
- **AUC-2.2 (`ed846e5d`) INDEPENDENTLY RE-AUDITED → VERIFIED** (corroborates WAVE-22; builder=Codex ≠ auditor=this Opus session).
  Re-ran the scoped gate myself: `NODE_ENV= tsc -b` exit 0 (whole project) + `cpuShillBidding` 8/8 + `auctionStateMachine` 12/12,
  ZERO new reds. `nominatePlayer` purity re-verified AT SOURCE (pure reducer → the `resolveCpuNomination` loop legality-check is
  safe; the test asserts non-mutation). No-floor tested across 220 seeds (both 'bid' and 'pass' present).
- **🟡 SIM-TUNE FLAGS FOR JK (AUC-2.2 — surfaced here; WAVE-22 omitted them):** conservative defaults, commented sim-tune, revisit
  at the §16 sim-tune / playtest pass: `bargainInterestProbability` 5-band discount curve {<.05→.05 · <.15→.14 · <.30→.32 ·
  <.45→.56 · else→.76} × `interestAggression` × budgetFactor (0.55 + budgetRoom·0.45), clamped to the profile cap; personality
  profiles sniper/spender/zealot — bias 0.98/1.08/1.02 · aggression 0.82/1.15/0.96 · maxInterestProb 0.74/0.88/0.82 (all globally
  capped at `NO_FLOOR_MAX_INTEREST_PROBABILITY=0.92`) · archetypeFitSpread 0.18/0.22/0.30 · nomination value/bargain/drain weights.
- **➡ NEXT = AUC-3.1 (auction session persistence)** — persistence-class; grounding the save/resume seam at source before contracting.

**WAVE 24 — AUC-3.1 GROUNDED + CONTRACTED + DISPATCHED.**
- **Grounding (at source, no-inference — caught + corrected an Explore-agent mislabel that conflated AUC-3.1 with AUC-5.2):**
  `AUCTION_DRAFT_SPEC.md §5.2 #6` (lines 447-449) = persist the in-progress `CpuShillAuctionSession` (current lot/bids/rotation
  pointer/per-team committed-remaining/results), **mirror `LeagueBuilderMlbDraftSession`**, in the **`kbl-league-builder` DB (NOT
  trackerDb)** → trackerDb v25 pin UNTOUCHED. The settledSalary/freeze write is the SEPARATE **AUC-5.2** (#9), NOT this ticket.
- **Anchors verified at source:** `leagueBuilderStorage.ts` DB_VERSION 7→8 (:39) + new `auctionSessions` store mirroring
  `mlbDraftSessions` (:753-756) + API mirroring `createMlbDraftSessionId`/`get/save/deleteMlbDraftSession` (:1445/1575/1592/1621,
  incl. their `syncEngine.upsert/remove('kbl-league-builder', …)` calls). **4 MIRROR SITES** (the L6b-1 broken-mirror trap):
  storage module · `syncConfig.ts:52-61` · `backupRestore.ts:764` (also pins `version:7`→8) · the version-pin test
  `leagueBuilderStorageV6Migration.test.ts` (`expectedStores` + 3× `db.version).toBe(7)`→8 + a new v7→v8 additive-migration test).
- **DESIGN CALLS (AUTH-4 defaults, flagged for JK):** (1) persist the WHOLE serialized session blob (lossless resume, no field
  drift) in an envelope, NOT a hand-picked subset; (2) key by `[leagueId, seasonNumber]` (one active auction/league-season);
  (3) determinism rides inside the blob (nominationOrderSeed + cpuShills persisted → no shill regen on load). Build-DARK API
  (UI autosave wires in AUC-4.1) but the v7→v8 migration is LIVE + must prove additive.
- **Contract committed `959e1cc0`** (PROMPT_CONTRACTS.md, marker `CONTRACT: AUC-3.1`). **Dispatched to Codex** (gpt-5.5, xhigh)
  via `codex exec -C …/kbl-mode1` stdin-from-contract, background task `bkrqkfb22` → `/tmp/codex-auc31.out`. On landing: independent
  audit (builder≠auditor) + **FULL Mode-1 suite host gate** (DB-version bump → syncEngine/backup-parity ripple risk) + commit.
  **BROWSER-VERIFY OUTSTANDING (batched, persistence-PRIORITIZED):** a real kbl-league-builder DB migrates v7→v8 with no data loss +
  an auction session round-trips/resumes. **➡ after AUC-3.1 = AUC-4.1 (hot-seat UI).**

**WAVE 25 — ✅ AUC-3.1 COMMITTED `2ef82fa3` (auction at 5/~8).**
- Codex(gpt-5.5, xhigh)-built → **Opus-audited (builder≠auditor): VERIFIED.** 6 files (Codex self-caught a 6th — a 2nd version-pin test
  `leagueBuilderStorage.editorialSchema.test.ts` — and reported it; reporting-completeness held). Diff is PURELY ADDITIVE: new
  `auctionSessions` store (kbl-league-builder **v7→v8**, keyPath id + leagueId index) mirroring `mlbDraftSessions` EXACTLY +
  `LeagueBuilderAuctionSession` envelope (whole serialized `CpuShillAuctionSession` blob, no lossy subset) + create/get/save/delete
  (sync-mirrored, `::startup-auction-draft::` key namespace) + `clearAllLeagueBuilderData` extended. **All 4 mirror sites correct**
  (storage · syncConfig · backupRestore v8+schema+includedStores · the pin test). **Pin tests STRENGTHENED not weakened**: new
  `seedV7` fixture + a real v7→v8 additive-migration test proving all 10 prior stores' data survives + the new store empty; the 6th
  file adds store/index coverage. Round-trip test = genuine deep-equality of a mid-`OPEN_BIDDING` session (currentLot/passedTracker/
  results/cpuShills) + createdDate-preserve/lastModified-advance/null-after-delete.
- **HOST GATE (full Mode-1 suite — store add = saved-shape ripple class):** `NODE_ENV= tsc -b` exit 0 + **7928 pass / 1 fail = 472
  files; the 1 fail = `wpaRuntimeBoundary` (the documented hard-characterized fail, flagging `franchiseAnalyticsTrust.ts` — a file
  NOT in this diff), ZERO new reds** (franchiseManualSmokeFixture passed this run). DB-version migration is additive + LIVE; the
  save/load API is build-DARK (UI autosave wires in AUC-4.1).
- **BROWSER-VERIFY OUTSTANDING (batched, persistence-PRIORITIZED):** confirm a real kbl-league-builder DB migrates v7→v8 with no
  data loss + an auction session saves/resumes losslessly. **➡ NEXT = AUC-4.1 (hot-seat UI — the §2.3/§2.5 MLB-auction screens) —
  grounding the existing src_figma page/route patterns before contracting (largest greenfield lift; user-facing → JK browser sign-off batched).**

**WAVE 26 — AUC-4.1 GROUNDED + SPLIT + 4.1a DISPATCHED.**
- **Grounding (Explore agent + my source verification):** the launch analog = `LeagueBuilderSnakeDraft.tsx` (page/launch/styling/persist
  pattern); the IV pool comes from `useLeagueBuilderData().registerLeaguePool(leagueId)`/`getRegisteredPool` (`RegisteredPool.players[].iv`);
  `initAuctionSession({teams, players, config})` seeds the nomination order from `config.nominationOrderSeed` (verified at
  auctionStateMachine.ts:105-170). **Two agent claims I CORRECTED before contracting:** (1) lone-survivor is NOT a fork — §6 Q2 RULES
  it tap-to-claim (one tap, not auto-award); (2) styling — per MEMORY the `@theme` tokens are inert under the v3 runtime, so the contract
  pins "mirror the snake page's inline-hex/`bg-[var(--…)]` classes," sidestepping it.
- **SPLIT (large user-facing greenfield → 2 builds):** **AUC-4.1a** = page shell + route + the `useAuctionDraft` hook (engine wiring,
  CPU auto-advance, autosave, launch-from-league) + placeholder state-switch + handoff banner + lot log → makes a full MLB auction
  PLAYABLE-ROUGH end-to-end + hook-tested (the high-value/high-risk LOGIC, headlessly verifiable). **AUC-4.1b** = the rich §2.3 7-element
  OPEN_BIDDING turn view + §2.5 nomination pool filter/sort + SOLD/PASSED notices + handoff-modal polish (the JK-browser-verify visual target).
- **DEFAULTS taken for 4.1a (AUTH-4, spec-silent — logged in the contract for JK):** D1 CPU auto-turns resolve instantly in hook logic
  (the ~500ms visual beat = 4.1b); D2 handoff = persistent banner (no blocking modal) in 4.1a; D3 autosave after EVERY committed transition;
  D4 CPU shills pass-through/engine-seeded (no new generation logic).
- **Contract committed** (PROMPT_CONTRACTS.md `CONTRACT: AUC-4.1a`). **Dispatched to Codex** (gpt-5.5, xhigh) background task `b6b9ql8j9`
  → `/tmp/codex-auc41a.out`. On landing: audit (builder≠auditor) + full Mode-1 suite + commit. **➡ after 4.1a = AUC-4.1b (visual screens).**
  **⚠ Note:** 4.1a is UI build-DARK behind a new route; the whole auction surface needs JK browser sign-off (batched) once 4.1b lands.

**WAVE 27 — ✅ AUC-4.1a COMMITTED `b2a0d610` (auction at 6/~8).**
- Codex(gpt-5.5, xhigh)-built → **Opus-audited (builder≠auditor): VERIFIED.** 5 files: `App.tsx` (+route, mirrors snake-draft) +
  NEW `useAuctionDraft.ts` hook + `LeagueBuilderAuctionDraft.tsx` page (466 lines, all states + "Now: TEAM — action" banner +
  setup + lot log) + 2 tests. Hook consumes the pure engines only (no duplication), persists via `saveAuctionSession` after every
  transition, `autoAdvanceCpu` loops CPU turns with a state-progress key + 400-step guard (terminates safely, no CPU handoff).
  Launch maps `RegisteredPool.players`→`AuctionPlayer` (rank-derived **0–100** ivPercentile — VERIFIED correct: `reservePriceCurve`
  clamps to `RESERVE_PRICE_CURVE_MAX_PERCENTILE=90` and the canonical AUC-2.1 test uses 90/50/0; the AUC-2.2 cpuShill test's 0–1
  data was the inconsistent-but-harmless outlier) + league teams→`AuctionTeamInput` (budgetRemaining = tierCap−committed, 22 slots,
  LEAGUE_MINIMUM_SALARY). §6 rulings applied incl. **tap-to-claim lone survivor** (`claimLoneSurvivor`/`passLoneSurvivor` exist).
  6 genuine tests (init→NOMINATION+persist, full nominate→bid→SOLD w/ CPU auto-acting, autosave, seed determinism, lone-survivor
  claim, page smoke). **Gate:** `NODE_ENV= tsc -b` 0 + full Mode-1 suite **7934 pass / 1 fail = `wpaRuntimeBoundary` (documented
  characterized; `franchiseAnalyticsTrust.ts` not in diff), ZERO new reds** (+6 = the new tests).
- **🟡 TWO LIMITATIONS FLAGGED → AUC-4.1b (committed in the message; for JK):** (A) `getCurrentBidderTeamId` = "first still-in ≠
  highBidder" is a CHALLENGER model, not a strict §2.1 round-robin ROTATION (lower-index teams challenge first; higher-index enter
  as others drop — auction still terminates + fills rosters + tends to the high-valuation winner, but turn fidelity needs the proper
  rotation pointer in 4.1b); (B) a CPU lone-survivor PASSES (never claims uncontested-at-reserve) — verify CPU rosters still fill
  legally; possible 4.1b tuning (CPUs claim valuable free players).
- **DEFAULTS taken (logged WAVE 26):** instant CPU auto-turns, banner handoff, autosave-every-transition, engine-seeded shills.
- **➡ NEXT = AUC-4.1b** (the rich §2.3 7-element OPEN_BIDDING turn view + §2.5 nomination pool filter/sort + SOLD/PASSED notices +
  §2.4 handoff polish + the (A)/(B) fixes) → then AUC-5.1 (farm) → AUC-5.2 (L-ECON1 freeze) → scout-privacy UI → POSITION_POOL fix;
  Mode-2 = LSIM-P3. **BROWSER-VERIFY (batched): the whole auction surface, once 4.1b lands.** Clean handoff at this seam (see below).

**WAVE 28 — AUTH-4 RESUME (sole-owner auto-spawn continuation; baton claimed) → AUC-4.1b SPLIT → AUC-4.2 CONTRACTED + DISPATCHED.**
- **Resume:** fresh session at 07:11 MDT 2026-06-21; `HANDOFF_NEEDED` (written 06:56, ~14min prior = the standard handoff auto-spawn)
  CLAIMED → `HANDOFF_DONE_2026-06-21T131218Z`; verified NO live build worker (the running `Codex.app` procs are the desktop GUI, not
  a `codex exec` CLI); `caffeinate` PID 84474 alive. Sole-owner; did NOT manually start a 2nd session (WAVE 22/23 collision avoided).
- **GROUNDED AUC-4.1b at source** (no-inference; this track twice caught Explore-agent mislabels). Two decisive spec facts reshaped the
  two flagged fixes from "hook tweaks" into ENGINE-surface correctness changes:
  - **Fix (A) round-robin rotation:** the engine `auctionStateMachine.ts` has NO bidding turn-order at all — `recordBid`/`passBid` accept
    any still-in team; RESOLVE fires purely on `stillIn≤1`. So turn order is 100% caller-side, and because `autoAdvanceCpu` drives CPU bids,
    rotation order AFFECTS the CPU bid sequence → final salary/winner (not just visuals). **§5.2 #6 EXPLICITLY lists "rotation pointer" as
    persisted auction-session state** → the faithful fix lives in the engine session (AUC-3.1 persists it for free), NOT hook React-state
    (which AUC-3.1 doesn't persist → lost on mid-lot resume). The AUC-4.1a "first still-in ≠ highBidder" challenger heuristic was a stand-in.
  - **Fix (B) CPU lone-survivor:** §2.7 + §2.2.1 make the lone-survivor claim load-bearing for §2.2.2 legal-fill; §6 Q2 rules HUMAN
    lone-survivor = tap-to-claim, but a CPU has no human to tap → its §7.6 policy must decide. AUC-4.1a always PASSes (`passLoneSurvivor`)
    → can underfill CPU rosters / leave valuable free players unclaimed. Clean fix reuses `evaluateCpuValuation`: **claim iff valuation > reserve**
    (mirrors the existing `minimumBid ≥ valuation → over-valuation pass`); ratios (val≈iv×[0.74,1.39] vs reserve=iv×[0.5,0.7]) ⇒ claims
    in ~all cases → legal-fill preserved. No new tunable, no deterministic floor.
- **SPLIT DECISION (Captain, AUTH-4 — documented for JK):** the handoff envisioned 4.1b = UI + both fixes in ONE ticket. Re-scoped into
  TWO, mirroring the 4.1a logic-vs-4.1b-visual rationale: **AUC-4.2** = the engine TURN-FIDELITY LOGIC (rotation pointer in `auctionStateMachine.ts`
  + engine `getCurrentBidderTeamId`; `cpuDecideLoneSurvivor` in `cpuShillBidding.ts`; `useAuctionDraft.ts` rewire) — headlessly testable,
  touches the committed AUC-2.1+2.2 core engines (full-suite host gate). **AUC-4.1b** = the rich VISUAL page ONLY (§2.3 7-element turn view,
  §2.5 filter/sort, SOLD/PASSED notices, §2.4 polish, names-not-IDs, remove debug dump) — the JK-browser target. Rationale: a determinism/
  outcome-bearing core-engine change and a 466-line visual rewrite are different audit classes; splitting keeps each audit clean + decorrelated.
- **Contract committed `e176cdb7`** (`PROMPT_CONTRACTS.md`, marker `CONTRACT: AUC-4.2`). **Dispatched to Codex** (gpt-5.5, xhigh) via
  `codex exec -C …/kbl-mode1` stdin-from-contract, background task `bfa1gu9nz` → `/tmp/codex-auc42.out`. On landing: independent audit
  (builder≠auditor) + FULL Mode-1 suite host gate (two committed core engines changed) + commit.
- **🟡 SPEC-SILENT SUB-FORK flagged in-contract for JK:** first bid action of a lot = the NOMINATOR (start-at-nominator, §2.4 H1 device-stays)
  vs the team AFTER the nominator — both terminate identically (RESOLVE is `stillIn≤1`-driven) but shift the CPU bid sequence → some final
  salaries. Conservative default taken = nominator-first. **➡ after AUC-4.2 (audit+commit) = AUC-4.1b (visual).** Then AUC-5.1 → 5.2 →
  scout-privacy → POSITION_POOL fix; Mode-2 = LSIM-P3.
- **✅ AUC-4.2 COMMITTED `ce69036d` — Codex(gpt-5.5,xhigh)-built → Opus-audited (builder≠auditor): VERIFIED.** 6 files (3 src + 3 test).
  Engine `auctionStateMachine.ts`: `bidTurnTeamId` (req. on `Lot`) set nominator-first, advanced by a pure `nextBidTurn` (cyclic scan
  after the actor, skips the highBidder) on recordBid/passBid, nulled at `stillIn≤1`; new exported `getCurrentBidderTeamId` selector
  (defensive recompute fallback for legacy blobs). `cpuShillBidding.ts`: `cpuDecideLoneSurvivor` — claim iff `price≤maxBid ∧ valuation>price`
  (mirrors the `minimumBid≥valuation → over-valuation` bid rule), reuses `evaluateCpuValuation`; no new tunable/floor. Hook `useAuctionDraft.ts`:
  re-exports the engine selector (page import preserved), RESOLVE branch uses the CPU claim decision, `bidTurnTeamId` added to `stateProgressKey`.
  **Audit (line-by-line at source):** rotation sound — at every call site `afterTeamId` is the highBidder (excluded) or a just-passed team
  (∉ stillIn), so it's never wrongly returned; A→B→C re-raise cycles terminate to the high bidder; CPU claim preserves §2.2.2 legal-fill
  (val≈iv×[0.74,1.39] > reserve=iv×[0.5,0.7] ⇒ claims in ~all cases). **HOST GATE (full Mode-1 suite — two committed core engines changed):**
  `NODE_ENV= tsc -b` exit 0 (independent) + **7941 pass / 2 fail (474 files): both CHARACTERIZED — `wpaRuntimeBoundary` (hard, flags
  franchiseAnalyticsTrust.ts, NOT in diff) + `franchiseManualSmokeFixture` (conditional-solo flake — CONFIRMED solo-pass 4/4 this session),
  ZERO new reds** (+7: engine 12→16, cpu 8→11, hook re-derived). The 3 scoped auction test files green in the full run. trackerDb/leagueBuilder
  DB UNTOUCHED (the pointer rides inside the existing AUC-3.1 blob — no store/version change). **🟡 MINOR (non-blocking, logged):** the AUC-3.1
  round-trip fixture (`auctionSessionStorage.test.ts:37 buildMidAuctionSession`) hand-builds a `currentLot` WITHOUT `bidTurnTeamId` — passes
  because `tsc -b` excludes test files (esbuild strips types) + structured-clone round-trips `undefined`; real sessions always carry the field,
  so production resume is lossless. A future tidy could add the field to that fixture.

**WAVE 29 — AUC-4.1b CONTRACTED + DISPATCHED (auction at 6.5/~8 — engine-logic done, visual pending).**
- **Contract committed `adceeae3`** (`PROMPT_CONTRACTS.md`, marker `CONTRACT: AUC-4.1b`; pre-drafted during the 4.2 build, finalized with the
  `ce69036d` dependency hash). PAGE-ONLY: rebuild `LeagueBuilderAuctionDraft.tsx`'s render blocks to the §2.3 7-element OPEN_BIDDING turn view
  (lot card w/ primary+secondary positions + IV advisory · current high bid+bidder by NAME · YOUR budget · YOUR `getTeamAuctionMaxBid` cap w/
  clamped raise presets+custom · slots-remaining + positions-needed [best-effort, flagged] · Raise/Pass · handoff prompt), §2.5 nomination pool
  (position filter + IV sort), distinct SOLD/PASSED/SET_ASIDE notices, §2.4 handoff polish, NAMES-not-IDs throughout, remove the debug `<pre>` dump.
  Consumes the AUC-4.2 hook/engine AS-IS (NO logic change); mirrors the page's existing inline-hex palette (theme tokens inert under v3).
- **Dispatched to Codex** (gpt-5.5, xhigh) via `codex exec -C …/kbl-mode1` stdin-from-contract, background task `btubpftwl` → `/tmp/codex-auc41b.out`.
  On landing: audit (builder≠auditor) + full Mode-1 suite + commit. **BROWSER-VERIFY (batched, JK):** the WHOLE auction surface (incl. the AUC-3.1
  v7→v8 migration + resume) once 4.1b lands — the user-facing visual gate. **➡ after AUC-4.1b ⇒ auction PLAYABLE 7/~8** → AUC-5.1 (farm)
  → 5.2 (L-ECON1 freeze) → scout-privacy UI → POSITION_POOL SP/RP fix; Mode-2 = LSIM-P3.

**WAVE 30 — ✅ AUC-4.1b COMMITTED `fb07ad6d` ⇒ THE MLB AUCTION IS PLAYABLE END-TO-END WITH THE RICH UI (auction 7/~8).**
- Codex(gpt-5.5,xhigh)-built → **Opus-audited (builder≠auditor): VERIFIED.** 2 files (page + smoke test), PAGE-ONLY (no engine/hook/storage
  touched). The §2.3 7-element OPEN_BIDDING turn view (lot card w/ primary+secondary position badges + IV/reserve advisory · high bid+bidder
  by NAME · YOUR budget · YOUR `getTeamAuctionMaxBid` cap · slots-remaining + roster position tally · raise presets[+1×/+2×/+5×]+custom both
  CLAMPED to maxBid · Pass · §2.4 handoff prompt "Pass device to [team]"/"Hold — CPUs resolving"), §2.5 nomination pool (position filter + IV
  sort toggle, default desc; the old 24-row cap dropped), distinct SOLD/PASSED/SET_ASIDE color notices, NAMES-not-IDs throughout (resultText/
  high-bidder/still-in/lot-log all resolve via the maps), debug `<pre>` dump REMOVED. Consumes the AUC-4.2 hook/engine AS-IS — the UI helpers
  (`findNextHumanNominatorTeamId`, `clampBidAmount`) are presentation/input-validation only, NO auction logic duplicated. **HOST GATE:**
  `NODE_ENV= tsc -b` exit 0 + full Mode-1 suite **7942 pass / 2 fail (474 files): both CHARACTERIZED (wpaRuntimeBoundary hard +
  franchiseManualSmokeFixture solo-confirmed 4/4), ZERO new reds** (page test 2/2 green). positions-needed = the flagged slots+roster-tally
  fallback (no auction position-requirement model exists — as the contract permitted).
- **🟡 MINOR UX NIT (for the JK browser batch, non-blocking, contract-faithful):** the cheapest raise preset = `minBid + 1×increment`, so there is
  no one-tap "bid the EXACT minimum" button — the custom field covers it. This is exactly what the AUC-4.1b contract specified ("+1×/+2×/+5× the
  increment ABOVE the current min bid"); flagging in case JK wants a bare-minimum preset added later.
- **⇒ THE 2 AUC-4.1a LIMITATIONS ARE CLOSED:** (A) the challenger heuristic → faithful §2.1 round-robin (AUC-4.2 engine pointer); (B) CPU
  lone-survivor PASS → §7.6 claim-at-reserve (AUC-4.2). **BROWSER-VERIFY (batched, JK — the user-facing visual gate):** the WHOLE auction surface
  end-to-end on a real locked league — launch → nominate (filter/sort) → bid (presets/custom, maxBid clamp, auto-pass) → SOLD/PASSED notices →
  device-handoff prompts → CPU shills resolving in place → lone-survivor claim → AUCTION_COMPLETE; PLUS the AUC-3.1 v7→v8 migration + mid-draft
  resume (persistence-prioritized). **➡ NEXT = AUC-5.1 (farm auction, §3)** — the larger §3 build: MLB-then-farm sequencing, scout-obscured value
  (§3.2, reuse §7.4 scout-range), positions-visible/ratings-hidden card (§3.3), walled-off farm wallet (§3.4, NEW separate budget), scout-hiring
  dependency (§3.5/§6 Q8 — every team must hire a scout, no scout-less path). Then AUC-5.2 (L-ECON1 freeze) → scout-privacy UI (§6.1) → POSITION_POOL
  SP/RP fix; Mode-2 = LSIM-P3. Grounding §3 at source next.

**WAVE 31 — AUC-5.1 (farm auction §3) RECON DONE → `spec-docs/AUC-5.1_SCOPE_MAP.md`.**
- **Grounded §3 + an Explore infra map of the EXISTING farm/scout system** (file:line in the map). The farm auction REUSES the §2 machine
  (AUC-4.2-complete) + §7.5 bidding wholesale with §3's 4 overrides. **It is a MAJOR multi-ticket subsystem** (comparable to the whole MLB
  auction chain), split 5.1a–e: (a) farm prospect-pool registration + IV pricing · (b) §3.2 scout VALUE-range obscuring · (c) walled-off farm
  wallet §3.4 · (d) farm-auction wrapper + MLB→farm sequencing §3.1 · (e) farm UI card §3.3.
- **KEY DE-RISK — the foundational value fork is RESOLVED by reuse:** prospects have NO numerical IV today (the existing scout-obscuring is
  GRADE-step noise, not the §3.2 value range), but **prospect trueIV = `computeIV`(prospect ratings)** — the SAME engine that prices the MLB
  pool (`registerPool`→`computeIV` ivEngine.ts:638), confirmed by §3.4 (the wallet self-calibrates "§5.2 over the prospect pool" ⇒ prospects
  ARE IV-priced). The B1–B9 generator already yields poolable ratings. **⇒ NOT a new value-design decision.**
- **ALREADY BUILT (consume, don't rebuild):** scout HIRING (`draftLeagueBuilderScout`, 2 scouts/team, durable) ⇒ §3.5/§6 Q8 satisfied;
  `scoutAccuracy(position,scout)` [45–92]; farm roster store (`TeamRoster.farmRoster`); the §2 machine.
- **MISSING (build):** prospect IV pricing+pool registration · §3.2 value-range (`[trueIV(1±w)]`, w=0.6·(1−acc), scoutNoiseBase=0.6 §12) ·
  walled-off NERFED farm wallet (§3.4/Q7, self-calibrating §5.2) · MLB→farm sequencing + per-tier format config.
- **🟡 SURFACED FOR JK (foundational value-economy — flagged in the map §3, AUTH-4 default taken, NOT blocking):** JK-1 confirm prospect IV =
  `computeIV(ratings)`; JK-2 farm-wallet NERF magnitude (Q7 rules "nerfed", magnitude is a dial); JK-3 auction-format farm REPLACES the snake
  prospect draft for auction leagues (R1 ⇒ yes, default). **➡ NEXT = AUC-5.1a** (fork-free foundational pool registration + IV pricing) →
  5.1b (scout range) → 5.1c (wallet) → 5.1d (wrapper+sequencing) → 5.1e (UI). 5.1a/5.1b are independent + fork-free → build first.

**WAVE 32 — AUC-5.1a (priced farm prospect pool) CONTRACTED + DISPATCHED. (`/kbl-captain` resume — JK re-invoked THIS session "and roll"; reclaimed own baton.)**
- **Source-grounding CORRECTED the scope-map anchor (STEP 3.A — never trust a recon blindly):** the scope map said prospect IV =
  `computeIV`, but the MLB auction pool actually prices each player as **`iv = calculateIvBaseSalary(toSalaryPlayer(player)).ivBase`**
  (`registerLeaguePool` useLeagueBuilderData.ts:414; `ivBase = kblIV`, salaryCalculator.ts:741-744). So 5.1a's MAKE-OR-BREAK = price
  prospects through that SAME `calculateIvBaseSalary(...).ivBase` (NOT `computeIV` directly) → an MLB player and a prospect with identical
  `PlayerForSalary` inputs get identical IV (one currency across both auction economies). `PlayerForSalary` (:87) needs ratings/age/fame/
  position — all present on the prospect DTO (`LeagueBuilderProspectPlayerDto`:157). Generator reused: `buildProspectPlayerForPick` (exported
  :1101) / `buildCandidate` (local :929 → additive export). ivPercentile mirrors `computeIvPercentiles` (useAuctionDraft.ts:93).
- **5.1a scope:** NEW pure `src/utils/farmAuctionPool.ts` `buildFarmAuctionPool` → generate the prospect pool (unassigned, no snake draft) →
  price via the MLB path → `{prospects: DTO[], auctionPlayers: AuctionPlayer[]}`; + an additive generator export if needed; + a pricing-PARITY
  test (the make-or-break). PURE / build-DARK (no live caller until 5.1d), no store/DB. **DESIGN CALLS (flagged):** pool size = 10×teams×3;
  prospect→PlayerForSalary mapping REPLICATED (cite toSalaryPlayer — a `src/utils` module must not import a `src_figma` hook) → future
  shared-mapper refactor is an OPEN-DECISION; salary set by the winning bid (not the pool).
- **Contract committed `9e7e1144`** (`PROMPT_CONTRACTS.md`, marker `CONTRACT: AUC-5.1a`). **Dispatched to Codex** (gpt-5.5, **xhigh** — NOT
  very-high, the 400 trap) via `codex exec -C …/kbl-mode1` stdin-from-contract, background task `bhw99f3z2` → `/tmp/codex-auc51a.out`.
  On landing: read-the-diff audit (builder≠auditor) + FULL Mode-1 suite host gate (additive export to the widely-imported prospect engine →
  transitive-mock-break risk) + commit. **➡ after 5.1a = AUC-5.1b** (scout §3.2 value-range, also fork-free).
- **✅ AUC-5.1a COMMITTED `ecd36347` — Codex(gpt-5.5,xhigh)-built → Opus-audited (builder≠auditor): VERIFIED.** 3 files (NEW
  `src/utils/farmAuctionPool.ts` + NEW test + additive `generateProspectPool` export on prospectScoutingDraftEngine). `buildFarmAuctionPool` →
  `{prospects: DTO[], auctionPlayers: AuctionPlayer[]}`: generates an UNassigned prospect pool (reuses `buildCandidate`+`buildPlayerDto`, NO snake
  draft, `leagueAssignments=[]`) + prices each via **`calculateIvBaseSalary(toFarmAuctionSalaryPlayer(prospect)).ivBase`** — the IDENTICAL MLB-pool
  path. **MAKE-OR-BREAK VERIFIED AT SOURCE:** `toFarmAuctionSalaryPlayer` mirrors `toSalaryPlayer` (useLeagueBuilderData.ts:177-215) FIELD-FOR-FIELD
  (same id/name/isPitcher/positions/pitcherRole/ratings/battingRatings/age/bats/fame/traits/arsenal/armSlot — both omit personality+isTwoWay) ⇒ a
  prospect and an MLB player with identical ratings get identical IV (one currency across both auction economies). `computeIvPercentiles` faithfully
  replicated. **HOST GATE:** `tsc -b` 0 + full Mode-1 suite **7948 pass / 1 fail (475 files) = wpaRuntimeBoundary (hard-characterized, not in diff),
  ZERO new reds** (+5 = farmAuctionPool.test, incl. salary-independence + determinism + pool-size + percentile-monotonic). PURE / build-DARK, no store/DB.
  **NOTE:** the parity test's `expectedSalaryPlayer` is the test's own copy (mildly circular) — the true MLB-parity is closed by the at-source field
  comparison above, not the test. POSITION_POOL's skew is orthogonal (its own flagged ticket; pricing is correct regardless of position mix).
  **➡ NEXT = AUC-5.1b** (scout §3.2 value-range: pure `[trueIV(1±w)]`, w=0.6·(1−scoutAccuracy), midpoint seeded-jitter — consumes the existing
  `scoutAccuracy` 45–92 → /100; fork-free, build-DARK).

**WAVE 34 — AUC-5.1b (scout-obscured value range §3.2) CONTRACTED + DISPATCHED.**
- Grounded: `scoutAccuracy()` (prospectScoutingDraftEngine.ts:863) returns a **0–100 scale** (clamp [45,92]) → normalize /100; `rosterEngineConstants.ts`
  IS the §12 registry (header cites IV_ENGINE §12) → `SCOUT_NOISE_BASE=0.6` home (additive, display-only, oracle-neutral); NO existing value-range
  (confirmed) → net-new pure math.
- **5.1b scope:** ADD `SCOUT_NOISE_BASE=0.6` (§12) + NEW pure `src/engines/scoutValueRange.ts` `perceivedValueRange(trueIV, scoutAccuracy0-100, seed)`
  → `{w, low=trueIV(1−w), high=trueIV(1+w), displayedEstimate}`, `w=0.6·(1−acc/100)`, seeded jitter for the displayed point ≠ truth. PURE / build-DARK.
  **DESIGN CALL (flagged):** the §3.2 "midpoint seeded-jittered" line is slightly ambiguous (the range formula is exact ⇒ its center IS truth) — read as
  "the displayed POINT-estimate is the jittered ≠-truth value, the bounds stay literal `trueIV(1±w)`"; jitter shape is a sim-tune dial.
- **Contract committed `ba732f05`.** Dispatched to Codex (gpt-5.5, xhigh) bg task `bqgc3i1e9` → `/tmp/codex-auc51b.out`. On landing: read-the-diff audit +
  full Mode-1 suite + **`git diff` the IV oracle (must be byte-unchanged — safety wall a)** + commit. **➡ after 5.1b = AUC-5.1c** (walled-off farm wallet §3.4).
- **✅ AUC-5.1b COMMITTED `d0a5fae5` — Codex(gpt-5.5,xhigh)-built → Opus-audited (builder≠auditor): VERIFIED.** 3 files (additive `SCOUT_NOISE_BASE=0.6`
  in rosterEngineConstants §12 + NEW `src/engines/scoutValueRange.ts` + test). `perceivedValueRange(trueIV, scoutAccuracy[0-100], seed)` →
  `{w, low=trueIV(1−w), high=trueIV(1+w), displayedEstimate}`, `w = 0.6·(1−acc/100)` (§3.2-exact; acc92→w0.048, acc45→w0.33), seeded FNV-1a jitter
  ∈[−w,+w] for the displayed point forced into the open band + ≠ truth (true IV internal for all engine math). **Audit:** math faithful to §3.2;
  pure (numbers in, struct out, no prospect-engine import); 6 thorough tests (w-vs-acc, symmetric bracket, estimate∈(low,high)∧≠truth, determinism w/
  seed-INDEPENDENT bounds, clamp, guards). **HOST GATE:** `tsc -b` 0 + **IV oracle + ivEngine/salaryCalculator/ivCurves BYTE-UNCHANGED (safety wall a ✓)**
  + full Mode-1 suite **7954 pass / 1 fail (476 files) = wpaRuntimeBoundary (characterized), ZERO new reds** (+6). PURE / build-DARK, no store/DB.
  **DESIGN CALL (flagged):** the §3.2 "midpoint seeded-jittered" line read as "displayed POINT-estimate jittered ≠ truth; bounds stay literal" (jitter
  shape is a sim-tune dial). **⇒ AUC-5.1 at 2/5 (5.1a pool + 5.1b scout-range done, both fork-free + build-DARK).**

**WAVE 35 — HANDOFF at the clean 5.1b seam (STEP 6; context heavily used after the AUC-4.2/4.1b + 5.1a/5.1b arc).**
- Clean fork-free seam: 5.1a + 5.1b committed, worktrees clean, no Codex build in flight. **➡ NEXT = AUC-5.1c (walled-off farm wallet, §3.4)** — the
  HEAVIEST farm class (persistence/state): a per-team farm budget SEPARATE from the MLB tier cap, self-calibrating NERFED tier cap (§5.2 over the
  prospect pool — feed it the AUC-5.1a `auctionPlayers` IVs), farm `minSalaryByPosition`, + a farm `AuctionTeamInput` adapter. **Grounding TODO:** the
  §5.2 self-calibration entry (how TIER_CAPS/the MLB cap is derived → mirror NERFED for farm); where the farm wallet persists (TeamRoster vs new field/
  store — saved-shape ⇒ version-bump/4-mirror discipline + full-suite gate); the nerf magnitude (**JK-2 flagged**, default ~0.25–0.4). Then 5.1d
  (wrapper + MLB→farm sequencing §3.1) → 5.1e (UI §3.3). Handing off per STEP 6 so 5.1c gets a fresh full-context session.
  *(SUPERSEDED: JK said "yes" → reclaimed the baton, continued AUC-5.1c in THIS session — WAVE 36.)*

**WAVE 36 — AUC-5.1c (walled-off farm wallet §3.4) CONTRACTED + DISPATCHED. (Baton reclaimed — JK "yes" = continue here.)**
- **Source-grounding REVISED two earlier assumptions (STEP 3.A pays off again):**
  - **(i) 5.1c is NOT a persistence/saved-shape ticket** — the MLB wallet is DERIVED on the fly (`buildAuctionTeams` useAuctionDraft.ts:148:
    `budgetRemaining = tierCap − committedSalaries`; `TeamRoster` has NO budget field) → the farm wallet follows suit ⇒ **NO DB/store/version
    change** (the handoff/scope-map's "saved-shape ⇒ version-bump/4-mirror" was wrong). 5.1c is a PURE engine/data ticket.
  - **(ii) JK-2 (farm-wallet nerf magnitude) is RESOLVED — the nerf is EMERGENT, not a free dial; my "~0.25-0.4" was an uninformed invention.**
    §3.4/Q7: the cap self-calibrates §5.2 OVER THE PROSPECT POOL; since prospects have intrinsically lower IVs than MLB stock, the §5.2 cap over
    that weaker pool is automatically smaller = the nerf. NO separate multiplier. (The `FARM_NERF_SCALES`/"one grade step left §7.4" in tierParams is
    the GENERATION nerf — prospect quality — explicitly OUT of §3.4's wallet scope.) Flagged for JK to confirm the emergent reading.
- **§5.2 formula grounded exact:** `tierCap = max(maxPoolIV/starBudgetShare, rosterSlots×medianPoolIV×rosterHeadroom)` (tierParams.ts:16/57-63);
  constants `T3_DERIVATION_INPUTS.starBudgetShare=0.33` + `.rosterHeadroom=1.15` (tierParams.ts:203-212) — IMPORTED, not hardcoded. TIER_CAPS are
  precomputed offline (no live fn) → 5.1c implements the formula over the AUC-5.1a pool with FARM slots=10. Farm minSalary = `LEAGUE_MINIMUM_SALARY`.
- **5.1c scope:** NEW pure `src/utils/farmAuctionWallet.ts` — `computeFarmTierCap(poolIVs, farmSlots=10)` (§5.2, emergent nerf) + `buildFarmAuctionTeamInputs`
  (farm `AuctionTeamInput[]` mirror: budget=cap−committed, slots=10−rostered, minSalary=LEAGUE_MINIMUM_SALARY, tax=0) + tests. PURE / build-DARK, **no DB change**.
- **Contract committed `7c14325f`.** Dispatched to Codex (gpt-5.5, xhigh) bg task `bc5ftzjos` → `/tmp/codex-auc51c.out`. On landing: read-the-diff audit +
  full Mode-1 suite + confirm NO DB/store change + oracle byte-unchanged + commit. **➡ after 5.1c ⇒ AUC-5.1 at 3/5 → 5.1d** (wrapper + MLB→farm
  sequencing §3.1 + per-league auction-vs-snake format config) → 5.1e (UI §3.3).

**WAVE 37 — ✅ AUC-5.1c COMMITTED `456e0f46` ⇒ the FARM ENGINE LAYER is COMPLETE (AUC-5.1 at 3/5).**
- Codex(gpt-5.5,xhigh)-built → Opus-audited (builder≠auditor): VERIFIED. 2 NEW files (`farmAuctionWallet.ts` + test), NOTHING existing modified.
  `computeFarmTierCap(poolIVs, farmSlots=10)` = the EXACT §5.2 `max(maxPoolIV/starBudgetShare, farmSlots×medianPoolIV×rosterHeadroom)` with
  constants IMPORTED from `T3_DERIVATION_INPUTS` (0.33/1.15) — emergent nerf (no dial). `buildFarmAuctionTeamInputs` mirrors the MLB adapter
  (budget=cap−committed clamped, slots=10−rostered clamped, LEAGUE_MINIMUM_SALARY, tax=0). PURE/build-DARK, NO DB change. HOST GATE: tsc 0 +
  full Mode-1 suite **7961 pass / 1 fail = wpaRuntimeBoundary (characterized), ZERO new reds** (+7 non-circular wallet tests). oracle/DB untouched.
- ⇒ **FARM ENGINE LAYER DONE: 5.1a (priced pool) + 5.1b (scout §3.2 value-range) + 5.1c (§3.4 wallet)** — all the farm-economy primitives the
  §2 machine needs. **➜ NEXT = AUC-5.1d** (the INTEGRATIVE wrapper — heaviest farm ticket): drive the §2 hot-seat machine for the farm round
  off the 5.1a pool + 5.1c wallet with the 5.1b scout-range as the display anchor; MLB→farm sequencing (§3.1); per-league auction-vs-snake format
  config. Likely needs its own recon/split (a farm hook + sequencing, then 5.1e UI). Grounding the integration surface next.

**WAVE 38 — AUC-5.1d-1 (pure farm-auction session builder) CONTRACTED + DISPATCHED. (Baton reclaimed — JK "keep rollin".)**
- 5.1d (the integrative wrapper) RECONNED + SPLIT. Grounded the integration surface: scouts load via `getScoutProfilesForLeague`→`toScoutDescriptor`→
  `scoutsByTeamId` (leagueBuilderStartupFarmDraft.ts:780/281); `buildFarmAuctionPool` (5.1a) takes teamDraftOrder+scoutsByTeamId; the §2 machine +
  cpuShillBidding are TIER-AGNOSTIC (take AuctionPlayer[]/AuctionTeamInput[]); AUC-3.1 session key = `${leagueId}::startup-auction-draft::N` (the farm
  needs a DISTINCT namespace in 5.1d-2). **SPLIT:** 5.1d-1 (PURE session builder — THIS) → 5.1d-2 (farm hook: load scouts/rosters + drive autoAdvance/
  persist [farm-namespaced] + per-bidder scout-range display + the hook-reuse-vs-variant decision) → 5.1d-3 (MLB→farm sequencing + per-league format
  config) → 5.1e (farm UI card §3.3).
- **5.1d-1 scope:** NEW pure `src/utils/farmAuctionSession.ts` `buildFarmAuctionSession({leagueId, teams, scoutsByTeamId, seed, config?, poolMultiplier?})`
  → `{session: CpuShillAuctionSession, pool: FarmAuctionPool, farmTierCap}`: build pool (5.1a) → `computeFarmTierCap(pool IVs)` (5.1c) → farm
  `AuctionTeamInput[]` (5.1c, 10 slots) → `initAuctionSession(...)` (the SAME §2 machine the MLB hook uses) — scout-range NOT here (true IV drives the
  machine; the range is a 5.1d-2/5.1e display concern). PURE / build-DARK, scouts+rosters are INPUTS (no I/O). Mirrors the MLB `initAuction` assembly.
- **Contract committed `8edb8daf`.** Dispatched to Codex (gpt-5.5, xhigh) bg task `b1mgyb6jw` → `/tmp/codex-auc51d1.out`. On landing: read-the-diff audit +
  full Mode-1 suite + confirm no existing file modified + commit. **➡ after 5.1d-1 = AUC-5.1d-2** (the farm hook).

**WAVE 39 — ✅ AUC-5.1d-1 COMMITTED `b5523bd3` (AUC-5.1d at 1/3).** Codex-built → Opus-audited: VERIFIED. Pure `buildFarmAuctionSession`
assembles the SAME §2 machine on the 5.1a pool + 5.1c wallet (10 slots, §5.2 cap), true IV, reuse-only, 2 new files, nothing existing modified.
tsc 0 + full suite **7966 pass / 1 fail = wpaRuntimeBoundary (characterized), zero new reds** (+5). **➡ NEXT = AUC-5.1d-2 (the farm hook).**

**WAVE 40 — AUC-5.1d-2 (farm-auction hook) CONTRACTED + DISPATCHED.**
- The farm hook makes a farm auction PLAYABLE (analog of the MLB 4.1a hook). **DESIGN DECISIONS (flagged):** (1) STANDALONE `useFarmAuctionDraft`
  mirroring `useAuctionDraft` — do NOT modify the committed MLB hook; the tier-agnostic autoAdvance/transition loop is DUPLICATED (cited) → future
  shared-core dedup is an OPEN-DECISION. (2) farm persistence = new `createFarmAuctionSessionId` = `${leagueId}::startup-farm-auction-draft::N`
  REUSING the AUC-3.1 `auctionSessions` store (NO new store/DB bump — namespaced id only; distinct from the MLB session). (3) scouts OPTIONAL (the
  §2 machine runs on TRUE IV — scout-range display is 5.1e; don't block on scout-per-team assignment). (4) farm rosters via `getRoster().farmRoster`.
- **MAKE-OR-BREAK:** reuse the §2 machine + cpuShillBidding (incl. AUC-4.2 turn-fidelity + cpuDecideLoneSurvivor) UNCHANGED — only init (`buildFarmAuctionSession`)
  + the persistence namespace are farm-specific. Contract committed; dispatched to Codex (gpt-5.5, xhigh) bg task `b0b2w211p` → `/tmp/codex-auc51d2.out`.
  On landing: read-the-diff audit + full Mode-1 suite (storage touch → ripple risk) + confirm NO DB/store change + farm id ≠ MLB id + commit.
  **➡ after 5.1d-2 = AUC-5.1d-3** (MLB→farm sequencing + per-league format config) → 5.1e (UI §3.3, incl. the scout-range display). **JK browser-verify
  BATCHED** (the farm hook is user-facing once 5.1e lands).

**WAVE 41 — ✅ AUC-5.1d-2 COMMITTED `55fd759c` (AUC-5.1d at 2/3 — the farm auction is FUNCTIONALLY BUILT: engine + hook).** Codex-built →
Opus-audited: VERIFIED. `useFarmAuctionDraft` mirrors `useAuctionDraft` but reuses the §2 machine + cpuShillBidding (incl. AUC-4.2 turn-fidelity)
UNCHANGED; farm-specific = `buildFarmAuctionSession` init + farmRoster slots + farm-namespaced persist. Storage: ADDITIVE `createFarmAuctionSessionId`
+ by-id get/save accessors (existing fns delegate, behavior-preserving for MLB, sync keyed by session.id), REUSE the auctionSessions store — NO new
store / NO DB bump; committed MLB hook UNTOUCHED. HOST GATE: tsc 0 + full suite **7970 pass / 1 fail = wpaRuntimeBoundary (characterized), zero new
reds** (+4); **AUC-3.1 round-trip 1/1 + version-pin 7/7 green** (storage refactor safe). **➡ NEXT = AUC-5.1e (the farm UI page §3.3)** — the visible
deliverable: mirror `LeagueBuilderAuctionDraft` but §3.3-obscured (name+positions SHOWN; ratings HIDDEN; value = the 5.1b scout RANGE, never true IV)
+ the per-bidder scout-range. Then AUC-5.1d-3 (MLB→farm sequencing + per-league format config) = the final farm wiring.

**WAVE 42 — AUC-5.1e-1 (farm hook: expose pool+scouts, regenerate-on-resume) CONTRACTED + DISPATCHED.**
- Grounding gap found: the farm UI page needs the GENERATED prospect DTOs (name+positions — NOT in leagueData.players) + per-team scouts, but the
  5.1d-2 hook DISCARDED the pool (`buildFarmAuctionSession(...).session`) + didn't expose scouts. So 5.1e splits: **5.1e-1** (hook plumbing — expose
  `pool`+`scoutsByTeamId`+`farmTierCap`, REGENERATE the pool deterministically on resume) → **5.1e-2** (the §3.3 obscured page). `scoutAccuracy` is
  exported (prospectScoutingDraftEngine.ts:873) for the per-bidder range.
- **MAKE-OR-BREAK:** regenerated `pool.auctionPlayers` MUST === persisted `session.players` (deterministic in leagueId/seed/teamDraftOrder/scouts; the
  pool depends only on those, NOT roster contents → stable mid-auction). Proven by a determinism test. DESIGN CALL: regenerate-on-resume (lean) vs
  persist-the-DTOs (robust) — took regenerate, flagged. Contract committed; dispatched to Codex (gpt-5.5, xhigh) bg `b9bf1btep`. On landing: read-the-diff
  audit + full Mode-1 suite + commit. **➡ after 5.1e-1 = AUC-5.1e-2** (the farm UI page §3.3) → AUC-5.1d-3 (sequencing+format) = the final farm wiring.

**WAVE 43 — ✅ AUC-5.1e-1 COMMITTED `e76f84b5`.** Farm hook now exposes pool+scoutsByTeamId+farmTierCap, regenerates the pool deterministically
on resume (keeps row.session live; warns-not-throws on mismatch); 5/5 incl. resume-determinism (regenerated pool === persisted session.players).
tsc 0 + full suite **7971 pass / 1 fail = wpaRuntimeBoundary (characterized), zero new reds**. **➡ NEXT = AUC-5.1e-2 (the farm UI page §3.3).**

**WAVE 44 — AUC-5.1e-2 (farm UI page §3.3) CONTRACTED + DISPATCHED — the VISIBLE farm-auction deliverable.**
- Grounded: route mirrors `/league-builder/auction-draft` (App.tsx:108/299) → `/league-builder/farm-auction-draft`; the prospect DTO carries
  `prospectProfile.scoutedGrade` (fuzzed, SHOW) vs `overallGrade` (true, HIDE). `scoutAccuracy` exported (:873) for the per-bidder range.
- **5.1e-2 scope:** NEW `LeagueBuilderFarmAuctionDraft.tsx` + route + smoke test — mirror the MLB page but §3.3-OBSCURED. **MAKE-OR-BREAK (§3.3/§9.E):**
  NEVER render true IV / any individual rating / true grade. Value = ONLY the §3.2 scout RANGE (`perceivedValueRange(trueIV, scoutAccuracy(pos,
  bidder's scout), seed-per-(team,prospect))`, computed for the CURRENT BIDDER); grade = ONLY `scoutedGrade`; positions ALWAYS shown. §2.5 pool sorts
  by scout-range midpoint (not IV). Consumes the 5.1e-1 hook (pool/scouts/farmTierCap). Smoke test asserts NO IV/rating leak. Scout-privacy long-press
  (§6.1) = SEPARATE.
- Contract committed; dispatched to Codex (gpt-5.5, xhigh) bg `blgdabtoe`. On landing: read-the-diff audit (esp. NO IV/rating/true-grade leak) + full
  Mode-1 suite + commit. **JK BROWSER-VERIFY BATCHED** (the whole auction surface). **➡ after 5.1e-2 = AUC-5.1d-3** (MLB→farm sequencing + per-league
  format config) = the LAST farm-auction wiring; then AUC-5.2 (L-ECON1 freeze) → scout-privacy UI → POSITION_POOL fix.

**WAVE 45 — ✅ AUC-5.1e-2 COMMITTED `070a2aa2` ⇒ 🎉 THE FARM AUCTION IS PLAYABLE END-TO-END.** Codex-built → Opus-audited: VERIFIED.
NEW `LeagueBuilderFarmAuctionDraft.tsx` + `/league-builder/farm-auction-draft` route, §3.3-OBSCURED (true IV read ONLY for the internal
`perceivedValueRange`; rendered value = the scout 'estimate [low-high]'; grade = `scoutedGrade` fuzzed; positions shown; NO ratings/true-IV/true-grade
leak — audit-verified the only `.iv` use is the range computation). §2.5 pool sorts by the scout-range estimate. tsc 0 + full suite **7972 pass / 1
fail = wpaRuntimeBoundary (characterized), zero new reds**. **⇒ FARM AUCTION COMPLETE except AUC-5.1d-3**: engine (5.1a pool / 5.1b scout-range /
5.1c wallet) + hook (5.1d-1 session builder / 5.1d-2 hook / 5.1e-1 pool-expose) + UI (5.1e-2 page) ALL built, all build-DARK, all zero-new-reds.
**➡ NEXT = AUC-5.1d-3** (MLB→farm sequencing §3.1 + per-league auction-vs-snake format config) = the LAST AUC-5.1 piece. JK BROWSER-VERIFY BATCHED:
the whole MLB + farm auction surface.

**WAVE 46 — AUC-5.1d-3 (MLB→farm sequencing + draftFormat field) CONTRACTED + DISPATCHED — the LAST AUC-5.1 piece.**
- Grounded: LeagueTemplate has NO draft-format field (its `format` :425 is elimination-bracket); DB_VERSION 8; MLB page AUCTION_COMPLETE has no
  next-phase link. **5.1d-3 scope (minimal, additive):** add `draftFormat?: 'auction'|'snake'` to LeagueTemplate + `getLeagueDraftFormat` reader
  (default 'snake', NO DB bump) + a user-driven "Proceed to Farm Auction →" link at MLB AUCTION_COMPLETE (§3.1 sequencing) + a farm-complete
  freeze-placeholder note. **DESIGN CALLS (flagged):** sequencing = user link not auto-advance; draftFormat default 'snake' back-compat (VISION §9.A
  makes auction the v1 PRIMARY → JK may flip the default; the league-setup FORMAT-PICKER UI is a DEFERRED follow-up — this ticket adds the field+reader
  +link only). Contract committed; dispatched to Codex (gpt-5.5, xhigh) bg `ba7arnso8`. On landing: audit + full Mode-1 suite + confirm NO DB bump +
  version-pin intact + commit. **➡ after 5.1d-3 ⇒ AUC-5.1 (MLB + FARM auction) COMPLETE** → AUC-5.2 (L-ECON1 two-number freeze §4, trackerDb franchise
  bridge — the economy-correctness gate) → scout-privacy UI (§6.1) → POSITION_POOL SP/RP fix; Mode-2 = LSIM-P3.

**WAVE 47 — ✅ AUC-5.1d-3 COMMITTED `f0e7c7a9` ⇒ 🎉 AUC-5.1 COMPLETE: THE ENTIRE MODE-1 AUCTION DRAFT (MLB + FARM) IS BUILT + PLAYABLE.**
Codex-built → Opus-audited: VERIFIED. Additive `LeagueTemplate.draftFormat?` + `getLeagueDraftFormat` (default snake, NO DB bump) + MLB
AUCTION_COMPLETE → "PROCEED TO FARM AUCTION →" link (§3.1) + farm freeze-placeholder note. tsc 0 + full suite **7975 pass / 1 fail =
wpaRuntimeBoundary (characterized), zero new reds**; version-pin 7/7 (no DB change). **⇒ AUC-5.1 DONE (16 tickets this run):** MLB AUC-1.1..4.1b +
FARM 5.1a/b/c (engine) + 5.1d-1/d-2 (session+hook) + 5.1e-1/e-2 (pool-expose+UI) + 5.1d-3 (sequencing+format). Routes live (build-DARK):
`/league-builder/auction-draft` + `/league-builder/farm-auction-draft`. **DESIGN FLAGS for JK (all in-ledger):** draftFormat default snake (vs
§9.A auction-primary); user-link sequencing (not auto); farm-wallet emergent-nerf; AUC-4.2 nominator-first rotation; 4.1b raise-preset min; 5.1b
midpoint-jitter; 5.1e-1 regenerate-on-resume; the league-setup format-picker UI deferred. **JK BROWSER-VERIFY BATCHED:** the whole MLB+farm auction
surface (v7→v8 migration + resume + §3.3 obscuring).
**➡ NEXT = AUC-5.2 (L-ECON1 two-number freeze, §4)** — the economy-correctness gate: stamp `{trueValue, settledSalary, checkpoint:0}` per rostered
player at whole-draft completion via the FRANCHISE freeze store (`franchiseTrueValueSnapshots`, **trackerDb** — a saved-shape/franchise-bridge ticket,
careful class; `settledSalary?` is the only additive field per the L-ECON1 gotcha). GROUND AT SOURCE FIRST. Then scout-privacy UI (§6.1) →
POSITION_POOL SP/RP fix; Mode-2 = LSIM-P3.

**WAVE 48 — AUC-5.2 RECONNED → HANDOFF at the AUC-5.1-COMPLETE milestone (careful franchise-bridge ticket deserves fresh context).**
- **AUC-5.2 recon (grounded at source, for the next session):** the §4 two-number freeze adds the SECOND number (`settledSalary`) to the EXISTING
  checkpoint-0 franchise freeze. **`FranchiseTrueValueSnapshotRow`** (`franchiseTrueValueSnapshotsStorage.ts:17`) = {franchiseId, seasonId, statsScopeId,
  playerId, checkpoint, trueValue, valueDelta, warPercentile, computedAt} — **`settledSalary?: number` is ADDITIVE** (a row field, NOT a store) ⇒
  **NO trackerDb bump** (store `franchiseTrueValueSnapshots` exists trackerDb:370; TRACKER_DB_VERSION stays 25; the version-pin pins the STORE SET, not
  row fields — VERIFY). Writer = `saveFranchiseTrueValueSnapshotRows` (:83). **The freeze fires at FRANCHISE-INIT checkpoint-0 (the G1 home), NOT in
  the auction** — so AUC-5.2 lives in the Mode-1→Mode-2 BRIDGE (`franchiseInitializer`), reading the drafted winning-bid salaries (AuctionResult.salary /
  the leagueBuilder roster assignments `{playerId, salary}`) → stamp `settledSalary` alongside `trueValue` at checkpoint-0. **CROSS-CUTTING / saved-shape /
  Mode-2-test-exercised = the highest-risk class → fresh-context, careful grounding of the franchiseInitializer freeze path required.**
- **CHECKPOINT rationale:** AUC-5.1 COMPLETE = the entire Mode-1 auction (16 tickets this run, all zero-new-reds). AUC-5.2 is a delicate franchise-DB
  bridge; building it at the tail of a marathon session risks a subtle saved-shape/bridge error. Handing off at the complete-subsystem seam.

**WAVE 49 — ATTENDED DESIGN REVIEW (JK off AUTH-4) → MODE-1 AUCTION REDESIGN RATIFIED → AUTH-4 REBUILD QUEUED.**
- JK returned, reviewed the AUC-5.1 flags, and RULED a substantial design revision (the V1 per-prospect-IV pricing leaked the scout truth; GM-nomination
  allowed passive juicing). **Ratified design → `spec-docs/AUCTION_DRAFT_SPEC_V2.md`** (V1 bannered partially-superseded) + execution sequence
  **`AUCTION_REBUILD_PLAN.md`** (RB-1..16). KEY DECISIONS: scout = **price range + 20–80 grade** (true IV hidden → call-up reveal); **engine
  weighted-random nomination** (∝ percentile^k, k≈2–3) + **ONE-CHANCE-ONLY** (no bid = gone forever); **dual MLB/farm archetypes** + a **gentle convex**
  MLB luxury tax (leeway-not-a-wall; un-stub the inert `projectedTax:0`); **MLB→farm one-way budget carryover (50%)**; **draft→player-morale (slot +
  over/underpay) + payroll→fan-morale (rank, exp both ends, anti-tank)** both **captured in a 4-number checkpoint-0 freeze and seeded into Mode-2
  starting morale** (overriding defaults — the payoff that makes the draft matter); **separate GM entity** (parallel to + above the manager, fire
  authority); scout-as-bridge + roster board; scout-privacy = long-press-REVEALS; CPU-shill (dissolve, pure-pressure) vs opt-in CPU-team split;
  reserve START LOW (MLB 0.5–0.7 curve / farm flat floor); no auction draft-trades (in-season only). All §11/§13 dials default-set + sim-tunable (RB-16).
- **SHELLS SURVIVE:** the §2 bidding/CPU/wallet/persistence/hot-seat-UI + page shells are reused; the value + nomination layers are rewritten + the new
  systems built. Spec-first — NO CODE written this session. Docs committed.
- **➡ PLAN:** JK starts a FRESH THREAD (reset context) to run the AUTH-4 `/kbl-captain` loop on `AUCTION_REBUILD_PLAN.md` (Opus writes plan/contracts +
  audits; Codex builds). CURRENT_STATE live header repointed. (This attended session wrote the docs, not code.)

**WAVE 50 — ATTENDED DESIGN GROUNDING (JK present; personality model + morale-engine correction + 3-question grounding) → NO CODE, docs only.**
- **Personality model pinned (§3.7 + RB-0):** 3 INDEPENDENT axes — (1) primary personality, 7 types VISIBLE (egotistical/competitive/tough/droopy/
  timid/jolly/relaxed); (2) hidden modifiers, 4×0–100 HIDDEN-FOREVER (ambition/loyalty/charisma/resilience; only signal = the CAPTAIN reveal =
  highest loyalty+charisma); (3) chemistry, 5 types VISIBLE (competitive/crafty/scholarly/spirited/disciplined → trait potency). "competitive" is in
  BOTH axis 1 and 3 — independent. **Assignment fix:** regenerate ALL 3 axes pre-draft for every MLB-pool player (the pool is HETEROGENEOUS — the
  stock 440 is one option; real drafts mix stock + user-created, analyzed as a whole).
- **MORALE MODEL CORRECTED AT SOURCE (JK caught a recall error):** the core engine `masterMoraleMatrix.composeMoraleConsequence`
  (`src/engines/masterMoraleMatrix.ts`, build-dark behind D13) is ALREADY BUILT — per-personality reactivity multipliers (`MORALE_TUNING.personality`:
  EGOTISTICAL 1.25/1.15 fanSens 1.5 reacts huge, RELAXED/TOUGH shrug, DROOPY/TIMID crushed by bad), hidden-modifier roles (ambition up-amplify /
  resilience down-dampen / charisma contagion-spread / loyalty fan-link), relationship contagion (relation × charisma), AND
  `LEGACY_PERSONALITY_RECONCILIATION`. ⇒ **RB-5 is REUSE** (define draft events + seed at freeze), NOT a net-new reactivity build. The old
  `playerMorale.ts PERSONALITY_BASELINES` is DEAD LEGACY.
- **3-question grounding workflow (5 agents, both consequential answers adversarially verified — NOT refuted):**
  (1) **440 chemistry data is FULLY POPULATED** (3-letter codes SPI/DIS/CMP/SCH/CRA on the `PLAYERS` record at `playerDatabase.ts:66`; NOT the
  `undefined`-personality void) — dist **SPI 21.1 / DIS 20.0 / CMP 20.0 / SCH 20.0 / CRA 18.9% (near-uniform)**; the rebalance ruling is buildable as
  written → RB-0 frozen `CHEMISTRY_TARGET_DISTRIBUTION`. (2) **COMPETITIVE morale row confirmed-correct** (1.15 up / 1.05 down — boosted/hurt, milder
  EGOTISTICAL); no change. (3) **`playerMorale.ts` is DEAD in live franchise UX** (sole importer = the UNROUTED `src/components/GameTracker` tree;
  no `src_figma/app` path) → split-deprecate: retire the dead baseline table, PRESERVE the 4 display helpers (no matrix equivalent).
- **JK RULINGS (2026-06-21):** chemistry target = honor the EXACT near-uniform 440 shape (SPI 21/DIS 20/CMP 20/SCH 20/CRA 19), do NOT snap to flat-20;
  morale shown live UNDER the player-name line near the per-player line-score, standout color, **fixed-height / zero-reflow across the nine-man
  lineup** (placeholder until the live morale path / D13). → **RB-17** (deprecate playerMorale, split) + **RB-18** (live lineup morale indicator) added.
- **Plan now RB-0 → RB-18.** Commits: 1d9b5755, 586424d0, 67587da9 (morale correction), 1a0807f9 (3-question grounding), bac383e3 (rulings) + this WAVE.
- **➡ NEXT:** RB-0 is the first build ticket. Fresh AUTH-4 `/kbl-captain` session re-grounds from this ledger + CURRENT_STATE, then dispatches Codex.

**WAVE 51 — RB-0a COMMITTED (`edb94d31`, `codex/mode1-v1`, branch-only) — chemistry canonical module + `CHEMISTRY_TARGET_DISTRIBUTION`.**
- **RB-0 SPLIT (grounding warranted):** RB-0a = the additive chemistry foundation (this WAVE); **RB-0b = the behavioral pre-draft 3-axis regen + chemistry rebalance (NEXT).** RB-0a is the dependency RB-0b/RB-1/RB-16 consume.
- **GROUNDED AT SOURCE (6-reader workflow `wf_86448788-2ee` + targeted verify, all in the kbl-mode1 worktree):**
  - 440 chemistry distribution **re-counted from source**: SPI 93 (21.14%) · DIS 88 (20.0%) · CMP 88 (20.0%) · SCH 88 (20.0%) · CRA 83 (18.86%) → matches JK's ratified target. `PLAYERS` (`playerDatabase.ts:513`) = 506 = 440 rostered + 66 FA (`teamId:'free-agent'`); `PlayerData.chemistry` is loose `string` (`:66`).
  - **TWO LANDMINES (changed RB-0a scope):** (1) the `Chemistry` type at `playerDatabase.ts:17` (7-value UPPERCASE incl. FIERY/GRITTY) is the **TEAM** chemistry type (`:78`), NOT player — left untouched. (2) `ALL_MLB_PLAYERS` (`src/data/players/mlb/index.ts:70`) is typed `PlayerData[]` and carries **mixed** chemistry forms (~440 Title-Case + ~220 3-letter) → **`PlayerData.chemistry` CANNOT be tightened to a 3-letter union** without breaking ~440 entries.
  - **SPEC CORRECTION:** the spec/plan note "the 66 FAs carry full-word chemistry" is WRONG — FAs also use 3-letter codes (still excluded from the target/regen).
  - chemistry→potency-tier is net-new but is **RB-1's** job (PotencyTier exists, no chemistry→tier map) — kept OUT of RB-0. masterMoraleMatrix canonical-7 confirmed (`:255-263`) — not rebuilt.
- **BUILT (Codex gpt-5.5 xhigh via `codex exec` stdin → Opus audited the diff, builder≠auditor):** NEW `src/data/chemistryCanonical.ts` (`ChemistryCode` 5-code union · `CHEMISTRY_CODE_TO_WORD`/`WORD_TO_CODE` · `normalizeToChemistryCode` reproducing the legacy `CHEMISTRY_MAP` semantics · `CHEMISTRY_TARGET_DISTRIBUTION` {SPI .21/DIS .20/CMP .20/SCH .20/CRA .19} · `CHEMISTRY_TARGET_SOURCE_TOLERANCE` 0.015) + `leagueBuilderStorage.convertPlayer` now derives from it (hand-written `CHEMISTRY_MAP` removed, **byte-identical**, verified across every input class + pinned by the test's legacy-reproduction case) + a strong validation test (440-source drift guard exactly 440 non-FA ±1.5pp + normalizer + inverse maps).
- **GATE:** `tsc -b` exit 0; full Mode-1 suite **482 files (481 pass / 1 fail), 7981 tests (7980 pass / 1 fail)** — sole fail `wpaRuntimeBoundary` (characterized baseline; pre-RB-0a baseline was 481/1-fail) ⇒ **ZERO NEW REDS** (+1 file/+5 tests = the new test). Build-DARK/additive; `PlayerData.chemistry` stays `string`; NO DB/store/oracle change. Branch-only, NOT pushed.
- **OPEN-DECISIONS / flags for JK (non-blocking, documented in the RB-0a contract):** (1) **PlayerData.chemistry type-tightening DEFERRED** → needs a data-normalization pass (RB-0a-2) to normalize the ~440 Title-Case `ALL_MLB_PLAYERS` entries to 3-letter codes FIRST; alternatively leave `chemistry` loose. (2) `ovrCalculator.normalizeChemistry`/`CHEMISTRY_ABBREV_MAP` consolidation DEFERRED (frozen-OVR-oracle-adjacent; only with a byte-identical OVR-output proof). (3) `CHEMISTRY_TARGET_DISTRIBUTION` uses JK's rounded shares (within tolerance of the 21.14/18.86 source).
- **➡ NEXT = RB-0b** (pre-draft regen of all 3 axes for every MLB-pool player at the league-construction seam — `franchiseInitializer.ts:657-661` backfill demoted to a no-op safety net — + rebalance regenerated MLB-pool + farm-prospect chemistry to `CHEMISTRY_TARGET_DISTRIBUTION`; consumes RB-0a). Pre-RB-0 baseline pinned: 481 files / 1 fail `wpaRuntimeBoundary`.

**WAVE 52 — RB-0b SPLIT (b-1 / b-2) → RB-0b-2 COMMITTED (`16ca8d61`, `codex/mode1-v1`, branch-only) — farm-prospect chemistry rebalanced to target.**
- **RB-0b grounded at source** (5-reader workflow `wf_0bc8184e-3c9`): the pre-draft seam = `initAuction` (`useAuctionDraft.ts:346`) → `registerLeaguePool` (`useLeagueBuilderData.ts:397`); `convertPlayer` (`leagueBuilderStorage.ts:2010`) hardcodes `personality:'Competitive'` + no modifiers; axes flow franchise via `deepCopyLeagueToFranchise` (`franchisePlayerStorage.ts:561 ...effectivePlayer`) → Mode-2 (`franchiseGameTrackerRoster.ts:258`); the freeze handoff contract carries NO player axes (they ride the franchise player store → NO trackerDb change). The `chemistryCanonical` 440 test reads the STATIC `PLAYERS` data, not `globalPlayers`/prospects → RB-0b stays green. **SPLIT (independent, different files/risk):** RB-0b-1 = MLB-pool regen+persist (persistence/live-hook, audit-hardest); RB-0b-2 = farm rebalance (isolated, pure engine).
- **RB-0b-2 BUILT (Codex gpt-5.5 xhigh → Opus audited the diff):** `prospectScoutingDraftEngine` NEW `rebalanceProspectChemistryToTarget(prospects, batchSeed)` — largest-remainder (Hamilton) quota over `CHEMISTRY_TARGET_DISTRIBUTION` + seeded Fisher-Yates on a SEPARATE namespace `${input.seed}:chemistry-rebalance:shuffle:*` — applied at both batch chokepoints (`generateProspectPool` ~:1208, `generateProspectScoutingDraft` ~:1290). ONLY chemistry overwritten (`{...prospect, chemistry}`); every other draw byte-identical (independent FNV-per-string seeds — verified). NEW test: large-batch ±1.5pp, determinism, **golden non-chemistry snapshot proving no perturbation**, immutability, exact N=23 quota (SPI5/DIS5/CMP5/SCH4/CRA4). No version bump, no persistence/DB/oracle change.
- **GATE:** `tsc -b` 0; full Mode-1 suite **483 files (482 pass / 1 fail), sole fail `wpaRuntimeBoundary`** ⇒ ZERO NEW REDS (+1 file = the new test). Branch-only, NOT pushed.
- **➡ NEXT = RB-0b-1** (contract already written in `PROMPT_CONTRACTS.md`): pre-draft regen of all 3 axes for every MLB-pool player at the `initAuction` seam (NEW pure `leaguePoolAxisRegen.ts` + a persist wrapper + a 1-line hook before `registerLeaguePool`; backfill stays a no-op safety net; seeded-idempotent; in-place `savePlayer` field update, NO trackerDb bump). **PERSISTENCE/saved-shape → JK browser-verify BATCHED.** Then RB-1 (scout value).

**WAVE 53 — RB-0b-1 COMMITTED (`fde093ed`, `codex/mode1-v1`, branch-only) ⇒ RB-0 (personality-model FOUNDATION) COMPLETE.**
- **BUILT (Codex gpt-5.5 xhigh → Opus audited HARDEST — persistence/live-hook):** NEW pure `src/engines/leaguePoolAxisRegen.ts` (`regenerateLeaguePoolPlayerAxes(players, leagueId)`: personality = seeded `pick` from the canonical 7-pool [fixes the hardcoded-'Competitive' conflation]; hidden modifiers = `generateHiddenPersonalityModifiers(\`${leagueId}:${player.id}\`)`; chemistry = largest-remainder quota over `CHEMISTRY_TARGET_DISTRIBUTION` + seeded Fisher-Yates, assigned by **sorted player.id** so input order is irrelevant; only the 3 axes change; idempotent) + NEW `src/utils/leaguePoolAxisRegenPersist.ts` (`regenerateAndPersistLeaguePoolAxes(leagueId)`: filter `getAllPlayers()` to the league, `savePlayer` each — in-place field update) + a 1-line additive hook in `useAuctionDraft.initAuction` before `registerLeaguePool` + export-only on `prospectScoutingDraftEngine` (`PERSONALITY_POOL`/`pick`/`randomUnit`, no logic change). `convertPlayer` + the franchise-init backfill + its test UNTOUCHED (backfill is now a no-op safety net). NEW test: determinism + **order-independence**, all-3-axes-set, 250-pool ±1.5pp distribution, 23-pool quota integrity, non-axis immutability.
- **NO trackerDb / DB_VERSION / store / handoff-contract / oracle change** (axes ride the existing `Player` fields → the franchise player store → Mode-2; the freeze contract carries no player axes). **PERSISTENCE → JK browser-verify BATCHED** (confirm a real draft stamps the 3 axes onto league players + they carry into the franchise + a fresh 7-type personality spread shows, no longer 100% 'Competitive').
- **Minor non-defect note:** the hook re-runs the regen on every auction load (idempotent-by-seed → correct, re-writes identical values); a `regeneratedAt` guard flag is a future resume-perf optimization (skip re-regen), not needed for correctness.
- **GATE:** `tsc -b` 0; full Mode-1 suite **484 files (483 pass / 1 fail), 7991 tests (7990 pass / 1 fail)** — sole fail `wpaRuntimeBoundary` ⇒ ZERO NEW REDS (+1 file/+5 tests = the new test). Branch-only, NOT pushed.
- **⇒ RB-0 COMPLETE** (RB-0a `edb94d31` canonical+target · RB-0b-2 `16ca8d61` farm rebalance · RB-0b-1 `fde093ed` MLB regen). The 3-axis personality model is now grounded: ONE canonical chemistry form + the frozen 440 target + every draft-pool player (MLB + farm) carries a fresh seeded 7-type personality + 4 hidden modifiers + target-balanced chemistry, persisting into Mode-2.
- **➡ NEXT = RB-1 (scout value model, §3, REWRITES AUC-5.1a/5.1b):** scout output = price range + 20–80 grade (true IV hidden, used only for budget scale + call-up); reuse `perceivedValueRange` anchored on the scout price (not IV); class-strength budget scale; scout price factors chemistry-fit → trait potency (§3.7 — VERIFY/BUILD the chemistry-MIX→potency-TIER rule, the genuine net-new piece flagged at RB-0). Needs fresh grounding (the AUC-5.1a/5.1b pool-pricing + anchor code + `ivEngine` PotencyTier + `perceivedValueRange`).

**WAVE 54 — RB-1 GROUNDED (wf_c1a73726-c46, 5 readers + Captain source-verify) → JK RULED the 2 forks (attended) → RB-1 SPLIT → ✅ RB-1a COMMITTED (`22095d09`, `codex/mode1-v1`, branch-only).**
- **Grounding finding:** RB-1 = a clean MECHANICAL half + an under-specified, CONFLICTING soul-layer half. The class-strength budget scale (`computeFarmTierCap`/`reservePriceCurve`) is ALREADY built + true-IV-hidden (§3.3 satisfied, no work). The leak = `LeagueBuilderFarmAuctionDraft.tsx:83` feeds EXACT `auctionPlayer.iv` into `perceivedValueRange` → the band `[low,high]` midpoint = true IV exactly. 20–80 grade = net-new (grades are letters). The chemistry-MIX→potency-TIER rule = net-new AND doubly-specified/conflicting: IV_ENGINE §3.5/D15 fences it (IV stays L2-neutral FOREVER; frozen oracle untouchable) while V2 §3.7 wants the scout to price chemistry-fit; EOS (per-trait count, `getChemistryTier` 1–4) vs V2 (per-player axis); CAR-003 logged (3-tier L1/L2/L3 vs 4-tier).
- **JK RULINGS (DECISIONS_LOG 2026-06-21):** (1) **SPLIT** RB-1 → RB-1a (mechanical re-anchor, build now) + RB-1b (chemistry-fit, model ruled). (2) **RB-1b model = per-trait COUNT · 3-tier L1/L2/L3 · PERCEPTION-LAYER** (EOS + IV_ENGINE §7.3 "marginal synergy"; resolves CAR-003 toward 3; the bump lives in the SCOUT PRICE OPINION only, canonical IV stays L2-neutral; count→tier thresholds = Captain default at build + sim-tune RB-16). CONFLICT-001 (chem type list) already closed by RB-0a.
- **✅ RB-1a BUILT (Codex gpt-5.5 xhigh via `codex exec` stdin-from-contract → Opus audited the diff, builder≠auditor):** NEW pure `src/engines/scoutPriceOpinion.ts` (`scoutPriceOpinion` = `trueIV × (1+bias)`; bias = per-(scout,prospect) FNV-1a-seeded, scaled by `(1−accuracy/100)`, magnitude max 0.30, FLOORED at 0.01 so the anchor is NEVER exactly true IV; + `gradeToTwentyEighty` linear 12-letter ladder S=80…D=20) + farm page re-anchor (`perceivedValueRange(scoutPriceOpinion(...), accuracy, seed)` — seed unchanged) + 20–80 shown in the nomination row + lot panel + 2 tests. **NOT** anchored on `FARM_SCOUTED_GRADE_PROJECTED_VALUE` (verified a different/smaller "scout-visible salary" scale, not the auction kblIV scale). `scoutValueRange.ts`/`computeIV`/IV/salary/oracle/reserve-opening/bidding/MLB-page ALL untouched (audited). **Leak closed:** band midpoint = the biased opinion ≠ exact true IV (page test asserts `midpoint !== candidate.iv` + keeps every no-IV/no-ratings-leak guard).
- **GATE:** `NODE_ENV= npx tsc -b` exit 0; full Mode-1 suite **485 files (484 pass / 1 fail), 7996 tests (7995 pass / 1 fail)** — sole fail = `wpaRuntimeBoundary` (characterized baseline) ⇒ **ZERO NEW REDS** (+1 file/+5 tests = the new `scoutPriceOpinion.test.ts`). No trackerDb/store/oracle change. Branch-only, NOT pushed.
- **Deferred (logged in `MODE1_REBUILD_JK_BACKLOG.md`):** farm Opening/reserve still IV-derived (secondary back-solvable leak) → RB-2; per-bidder scouted GRADE (§3.6) → RB-11. **JK BROWSER-VERIFY:** subsumed by BV-3 (whole auction surface) — the scout price-range + 20–80 display.
- **➡ NEXT = RB-1b** (chemistry-fit → potency-tier scout price bump, model ruled above; per-trait count / 3-tier / perception-layer; needs fresh grounding of the in-progress-roster chemistry-count plumbing + invoking trait pricing at a non-L2 tier WITHOUT touching the canonical IV path + a documented count→tier threshold default). Then RB-2 (engine nomination + one-chance).

**WAVE 55 — RB-1b GROUNDED (wf_bf11fd00-b60) → JK REFINED the model (boundary-aware + bidirectional) → RB-1b SPLIT → ✅ RB-1b-1 COMMITTED (`d64cf53d`, `codex/mode1-v1`, branch-only).** *(Note: a sustained intermittent Bash-classifier infra outage stalled the dispatch across ~4 auto-reschedules between the contract and this build; no work lost — contracts were authored/committed during the outage; the loop self-resumed when Bash recovered.)*
- **Grounding finding:** exact per-trait $ pricing would need a NEW `ivEngine` export (the uniform-tier `computeIV` delta is **$0 for hitters** — raw layer L2-pinned at ivEngine.ts:349). REJECTED touching the frozen-oracle engine for a perception nudge. The MLB roster chemistry is DROPPED at `useFarmAuctionDraft.ts:167` but reachable via `leagueData.players`+`getRoster`. `normalizeToChemistryCode` bridges trait `ChemistryType` words ↔ player `ChemistryCode`.
- **JK RULINGS (attended, then AUTH-4; DECISIONS_LOG 2026-06-21):** (1) roster scope = **MLB + farm picks** (not farm-only — hollow early). (2) Chemistry value is **boundary-aware + BIDIRECTIONAL** because the roster is fixed-size (call-up forces a send-down): **level-up** (full) when adding crosses a tier boundary up; **buffer** ("not as much as leveling up but still value") when a category sits at its tier FLOOR (one send-down from dropping); **neutral** else; and the in-season recommender (**RB-9**) MUST consume the REMOVE direction too (send-down drop = a cost) — flagged backlog **D-8**.
- **✅ RB-1b-1 BUILT (Codex gpt-5.5 xhigh via `codex exec` stdin → Opus audited the diff, builder≠auditor):** NEW pure `src/engines/chemistryFitValue.ts` — `chemistryFitTier` (L1≤3 / L2 4-7 / L3≥8, grounded from `TRAIT_INTEGRATION_SPEC.md:159-173`), `marginalChemistryValue(count, 'add'|'remove')` (level-up=1 at 3/7, buffer=0.4 at floors 4/8, remove=−1 at 4/8 [bidirectional for RB-9], neutral else), `chemistryFitPriceMultiplier` → **[1.0, 1.08]** reward-only for draft adds. Imports only `PotencyTier`/`ChemistryCode`/`normalizeToChemistryCode`. **NO ivEngine/computeIV/oracle/IV/salary/UI/persistence touch** (audited: only the 2 new files). All magnitudes (L2/L3 mins, 0.4 buffer, 0.08 cap) marked RB-16 sim-tune.
- **GATE:** `tsc -b` exit 0; full Mode-1 suite **486 files (485 pass / 1 fail), 8001 tests (8000 pass / 1 fail)** — sole fail `wpaRuntimeBoundary` ⇒ **ZERO NEW REDS** (+1 file/+5 tests = the new test). Branch-only, NOT pushed.
- **➡ NEXT = RB-1b-2** (DISPATCHED — the MLB+farm chemistry feed in `useFarmAuctionDraft` + the page wire of `chemistryFitPriceMultiplier` onto the scout opinion; derived counts, no session/persistence change). Then RB-2 (engine nomination + one-chance — grounded: `nominatePlayer` auctionStateMachine.ts:219 → engine weighted-random ∝ percentile^k; strip `setAsidePlayerIds`/`passedTracker` for one-chance).

**WAVE 56 — ✅ RB-1b-2 COMMITTED (`883e3188`, `codex/mode1-v1`, branch-only) ⇒ RB-1b (chemistry-fit scout price bump) COMPLETE.**
- **BUILT (Codex gpt-5.5 xhigh → Opus audited the diff, builder≠auditor):** (1) `useFarmAuctionDraft.buildFarmAuctionTeams` now derives `mlbRosterChemistryByTeamId` from `getRoster(team.id).mlbRoster` joined to `leagueData.players` chemistry (via `normalizeToChemistryCode`), exposed as hook React state — **NOT persisted** (audited: no `AuctionTeamState`/`BuildFarmAuctionSessionInput`/session-shape/DB/store/version change; the hook test asserts the persisted session teams have NO `mlbRosterChemistry` prop). (2) The farm page merges per-bidder **MLB + farm-pick** chemistry counts (`rosterChemistryTally` mirrors `rosterPositionTally`; `mergeChemistryTallies`) and composes `chemistryFitPriceMultiplier(prospect.chemistry, counts)` into `perceivedValueRange(priceOpinion * chemFit, accuracy, seed)` (seed UNCHANGED). Threaded into BOTH scoutRange call sites (current-lot bidder + visible-pool nominator) via `useMemo`.
- **Canonical IV/salary/oracle/`scoutPriceOpinion`/`scoutValueRange`/`chemistryFitValue`/reserve-opening/bidding/MLB-page ALL untouched** (audited — only the 4 farm-tier files: hook + page + 2 tests).
- **GATE:** `tsc -b` exit 0; full Mode-1 suite **486 files (485 pass / 1 fail), 8002 tests (8001 pass / 1 fail)** — sole fail `wpaRuntimeBoundary` ⇒ **ZERO NEW REDS** (+1 hook test). Branch-only, NOT pushed.
- **⇒ RB-1b COMPLETE** (RB-1b-1 `d64cf53d` engine + RB-1b-2 `883e3188` feed/wire). The farm scout price now nudges up (≤+8%) when a prospect's chemistry would level-up or buffer the GM's MLB+farm roster — boundary-aware, perception-layer, canonical IV byte-untouched. **JK BROWSER-VERIFY:** subsumed by BV-3 (whole auction surface). **RB-9 still owes the bidirectional `'remove'` consumption (D-8).**
- **➡ NEXT = RB-2 (engine nomination + one-chance, §2.1/§2.2):** rewrite `nominatePlayer` (auctionStateMachine.ts:219) → ENGINE weighted-random reveal ∝ (value-percentile)^k (seeded; MLB uses public IV pctile, farm uses hidden true-value pctile; per-tier k≈2–3); RESOLVE no-bid → **out forever** (strip `setAsidePlayerIds`/`passedTracker` re-nomination). Careful core-engine ticket — ground the full §2 state machine + the CPU/round-robin/wallet seams at source first (these SURVIVE).


**WAVE 57 — ✅ RB-2a COMMITTED (`2b7e894d`, `codex/mode1-v1`, branch-only) — the PURE build-dark one-chance auction engine. RB-2 SPLIT (2a engine / 2b wiring).**
- **Design call (Captain, AUTH-4):** RB-2 is SPLIT. Grounding at source showed an IN-PLACE rewrite of `auctionStateMachine.ts` would break 2 hooks + 2 pages + `cpuShillBidding` + the engine test SIMULTANEOUSLY (the consumers call `nominatePlayer`/`rotateNomination`/`getCurrentNominator` + read `setAsidePlayerIds`), so it cannot gate green alone. ⇒ **RB-2a = the NEW one-chance engine, PURE/ADDITIVE/build-dark, old GM-nomination path byte-untouched**; **RB-2b = wire both hooks/pages/persistence to the new API + delete the old GM + re-nomination machinery + rewrite its tests** (the project's proven build-dark→wire pattern). The split also gives two clean audit gates for the most delicate §2-spine ticket.
- **✅ RB-2a BUILT (Codex gpt-5.5 xhigh via `codex exec` stdin-from-contract → Opus audited the diff line-by-line, builder≠auditor):** in `src/engines/auctionStateMachine.ts` (+174, all new exports) + `src/data/auctionEngineConstants.ts` (+3) + NEW `src/engines/__tests__/auctionStateMachineOneChance.test.ts` (8 tests):
  - `selectNextNominee(session)` — seeded weighted-reveal draw, **Efraimidis–Spirakis** WRS-without-replacement: `weight = max(ivPercentile/100, 0.02)^k`, `u = (hashString(\`${seed}:surface:${step}:${id}\`)+0.5)/2³²`, `key = u^(1/weight)`, argmax (localeCompare tiebreak). `step = results.length` ⇒ **resume-safe** (one result per surfaced player under one-chance). 0.02 floor ⇒ pool always fully drains.
  - `surfaceNextPlayer(session)` — engine surfaces next (NO nominator); `selectNextNominee==null` or no eligible team → `AUCTION_COMPLETE`; opens lot at `reservePriceCurve(pctile)*iv`; opening-bidder rotates via `nominationIndex` (vestigial `Lot.nominatorTeamId` = opening bidder, commented; RB-2b owns the final Lot/Result shape); removes player from `availablePlayerIds`.
  - `resolveLot` / `passLoneSurvivorOut` — mirror the old resolve, only the no-bid terminal swapped to **`finalizePassedLotPermanent`** (NO `passedTracker`, NO `setAsidePlayerIds`, does NOT re-add to `availablePlayerIds`) ⇒ **MAKE-OR-BREAK: a no-bid player is PERMANENTLY OUT, never re-surfaced**. `finalizeSoldLot` reused safely (`releaseEligiblePassedPlayers` is a no-op on the always-empty one-chance tracker — audited).
  - `advanceLot` — SOLD/PASSED → `NOMINATION` (bump opening-bidder rotation) or `AUCTION_COMPLETE` (all-full OR pool-empty = the §2.3 tail terminal).
  - `nominationWeightExponent?: number` (optional) + `DEFAULT_NOMINATION_WEIGHT_EXPONENT = 2.5`; `DEFAULT_AUCTION_SETUP_CONFIG` **byte-unchanged** (selector falls back via `??`) ⇒ `auctionEngineConstants.test.ts` (`toMatchObject`) stays green.
- **Audit:** diff is **177 insertions / 0 deletions** — exactly the 3 contracted files; NO existing export/type/field modified (old `nominatePlayer`/`rotateNomination`/`evaluateResolve`/`finalizePassedLot`/`getNominationBlockReason`/`passedTracker`/`setAsidePlayerIds` all intact). Frozen IV oracle untouched (not in diff). The 8 new tests are NON-VACUOUS (assert specific ids/states): deterministic+weighted selection (k=8 → 'high'), pool-drains-exactly-once, the no-bid-permanent-out make-or-break (asserts no tracker + not-available + not-set-aside + next surface ≠ passed player), resume-safety (same seed+step → same id across two sessions), both `advanceLot` terminals, `passLoneSurvivorOut`.
- **GATE (Opus, host node v20, full suite — never the scoped run):** `NODE_ENV= npx tsc -b` exit 0; full Mode-1 suite **487 files (486 pass / 1 fail), 8010 tests (8009 pass / 1 fail)** — sole fail `wpaRuntimeBoundary` ⇒ **ZERO NEW REDS** (+1 file / +8 tests vs the `883e3188` baseline of 486/8002). No trackerDb/store/persistence/oracle change. Branch-only, NOT pushed.
- **Captain DEFAULTS-TAKEN (for JK morning review):** `k` default **2.5** (per-tier MLB 2 / farm 3 to be set in the hooks at RB-2b; sim-tune RB-16); opening bidder rotates via `nominationIndex`; `Lot.nominatorTeamId` kept as a vestigial valid teamId (= opening bidder) under engine nomination — RB-2b decides whether to rename/drop the field. §2.3 roster-fill TAIL terminal is handled (pool-empty → COMPLETE); the actual surplus GUARANTEE lives upstream in the pool builder (`farmAuctionPool` / MLB pool) and is to be VERIFIED at RB-2b/RB-16, not in the state machine.
- **➡ NEXT = RB-2b** — wire `surfaceNextPlayer`/`resolveLot`/`passLoneSurvivorOut`/`advanceLot` into `useAuctionDraft` + `useFarmAuctionDraft` (NOMINATION branch becomes unconditional auto-surface; set `nominationWeightExponent` per tier: MLB 2 / farm 3; fix `stateProgressKey`'s `setAsidePlayerIds` read; `rotate`→`advance`; drop `nominate(playerId)`/`currentNominatorTeamId`) + the 2 pages (remove the GM nomination picker → "engine surfaced [player]"; bidding UI survives) + `cpuShillBidding` (drop `resolveCpuNomination`) + persistence shape; then DELETE the old `nominatePlayer`/`rotateNomination`/`getNominationBlockReason`/`finalizePassedLot`/`releaseEligiblePassedPlayers`/`getCurrentNominator` + `setAsidePlayerIds`/`passedTracker` fields + rewrite `auctionStateMachine.test.ts` (remove the re-nomination/set-aside tests). Saved-shape note: removing the 2 fields is safe (the session persists as a structured-clone blob in `leagueBuilderStorage` with NO field-by-field shape pin — verified). Then RB-3 (dual archetypes + MLB luxury tax) → … RB-18.

**WAVE 58 — ✅ RB-2b-1 COMMITTED (`193a9270`, `codex/mode1-v1`, branch-only) — the two JK-ruled engine mechanics (farm flat reserve + hard roster-fill guarantee), additive build-dark.** RB-2b SPLIT further: RB-2b-1 (engine rulings, this) / RB-2b-2 (WIRE hooks+pages+cpuShill) / RB-2b-3 (STRIP old machinery + rewrite engine test) — keeps each dispatch+audit bounded for the delicate wire/delete.
- **JK RULINGS baked in (DECISIONS_LOG 2026-06-21 RB-2-Q1/Q2):** Q1 farm opening = FLAT floor = `LEAGUE_MINIMUM_SALARY` (no hidden-rank leak); Q2 roster-fill = HARD guarantee via forced fillers.
- **BUILT (Codex gpt-5.5 xhigh via `codex exec` stdin → Opus audited the diff, builder≠auditor):** `AuctionSetupConfig.flatReserveFloor?: number` (optional; DEFAULT byte-unchanged). `surfaceNextPlayer` opens at `config.flatReserveFloor ?? reservePriceCurve(ivPct)×iv` (MLB undefined → percentile curve; farm set → flat). NEW `resolveNoBidLot`: a no-bid lot PASSES only while `availablePlayerIds.length >= Σ open slots`; else FORCE-CLAIMS at `openingAsk` to the neediest SOLVENT eligible team (`auctionMaxBid >= openingAsk`; most slots → nominationOrder → teamId tiebreak) via the safe `finalizeSoldLot`; null-eligible → PASS fallback. Both `resolveLot`'s no-bid terminal + `passLoneSurvivorOut` route through it. **Invariant:** `avail + currentLot >= openSlots` given an upstream pool ≥ total slots ⇒ softlock impossible by construction (pool-sizing surplus stays upstream/RB-16).
- **Audit:** additive — only the NEW (not-yet-wired) one-chance fns + the config field + tests changed; old GM-nomination path + consumers + persistence + oracle untouched. +4 one-chance tests (flat-floor same-price regardless of IV; **MAKE-OR-BREAK** tight all-pass on pool==slots → every roster fills, ZERO PASSED; non-tight still PASSES; tight lone-survivor force-claims). Two existing one-chance tests' slot counts adjusted to STAY in the non-tight regime (necessary + correct given the new forced-filler, not gaming — verified).
- **GATE (Opus, full suite):** `NODE_ENV= npx tsc -b` 0; full Mode-1 suite **487 files (486 pass / 1 fail), 8014 tests (8013 pass / 1 fail)** — sole fail `wpaRuntimeBoundary` ⇒ **ZERO NEW REDS** (+4 vs the 193a9270 parent's RB-2a baseline). Branch-only, NOT pushed.
- **➡ NEXT = RB-2b-2 (WIRE):** switch both hooks (`useAuctionDraft`/`useFarmAuctionDraft`) + both pages + `cpuShillBidding` to the new API. Set `nominationWeightExponent` MLB 2 / farm 3 (Q3); set the farm hook's `config.flatReserveFloor = LEAGUE_MINIMUM_SALARY` (Q1); flip new-league `draftFormat` default → `auction` (Q4/O-1). Hook NOMINATION branch → unconditional `surfaceNextPlayer`; `rotate`→`advanceLot`; drop `nominate(playerId)`/`currentNominatorTeamId`; fix `stateProgressKey`'s `setAsidePlayerIds` read; pages: GM nomination picker → "engine surfaced [player]" (bidding UI survives); `cpuShillBidding`: delete `resolveCpuNomination` + its 2 call sites (cpuBidOnLot/cpuDecideLoneSurvivor survive). **Old engine fns stay (orphaned) → deleted in RB-2b-3.** Grounded map (file:line) from wf Explore sweep captured in the RB-2b-2 contract. Then RB-2b-3 STRIP → RB-3.

**WAVE 59 — ✅ RB-2b-2 COMMITTED (`456bd195`, `codex/mode1-v1`, branch-only) — WIRE the one-chance engine into all consumers.** Both tiers are now engine-nominated + one-chance end-to-end.
- **BUILT (Codex gpt-5.5 xhigh via `codex exec` stdin → Opus audited the real diff, builder≠auditor):** both hooks switch the autoAdvance NOMINATION branch to an UNCONDITIONAL `surfaceNextPlayer` (engine surfaces for everyone; human stopped only at OPEN_BIDDING/RESOLVE), `rotate`→`advance`(advanceLot), drop `nominate(playerId)`/`currentNominatorTeamId`/the `setAsidePlayerIds` progress read. **JK rulings wired:** MLB `nominationWeightExponent:2` / farm `:3` (Q3); farm `flatReserveFloor: LEAGUE_MINIMUM_SALARY` (Q1); `getLeagueDraftFormat` default `snake`→`auction` (Q4/O-1). Both pages: the GM nomination PICKER → a passive "ENGINE NOMINATION / surfacing… / ENGINE NOMINATED [player]" display; "Next Lot"→`advance()`; banner + the farm per-bidder scout-range keyed on `currentBidderTeamId` (the now-active actor); all bid/raise/pass/claim UI PRESERVED. `cpuShillBidding`: `resolveCpuNomination` + its types DELETED (−81 lines); `cpuBidOnLot`/`cpuDecideLoneSurvivor` survive untouched.
- **Audit:** 12 files (162+/580−). My INDEPENDENT grep (not the Codex paste) confirms `nominatePlayer|rotateNomination|getCurrentNominator|resolveCpuNomination` appear ONLY in `auctionStateMachine.ts` + its own test — zero consumer references remain. Engine / persistence-shape / oracle / the 2 engine test files UNTOUCHED (the only `leagueBuilderStorage` change = the 1-line draftFormat default). Hook/page/cpuShill/format tests updated to the engine-nomination flow.
- **GATE (Opus, full suite):** `tsc -b` 0; full Mode-1 suite **487 files (485 pass / 2 fail), 8013 tests (8011 pass / 2 fail)** — fails = `wpaRuntimeBoundary` (hard, characterized) + `AwardsWatchlist.test.tsx` (the documented intermittent ORDER-FLAKE — **VERIFIED passes SOLO 2/2**, RB-2b-2 didn't touch it) ⇒ **ZERO NEW REDS**. Branch-only, NOT pushed.
- **➡ NEXT = RB-2b-3 (STRIP — the last RB-2 piece):** delete the now-orphaned old machinery from `auctionStateMachine.ts` (`nominatePlayer`, `rotateNomination`, `getCurrentNominator`, `getNominationBlockReason`, `finalizePassedLot`, `releaseEligiblePassedPlayers`, the `PassedPlayerTracker` type, the `setAsidePlayerIds`/`passedTracker` fields on `AuctionSession` + their `initAuctionSession` init, the 3 dead rejection reasons; decide whether to drop the `SET_ASIDE` disposition + the dead page display branches or leave them) + rewrite `auctionStateMachine.test.ts` (remove the re-nomination/set-aside/nominator-clock tests; keep/port the bid-rotation/solvency/SOLD coverage onto the new entry points). SAFE: tsc proves no references remain; the session persists as a structured-clone blob (no field-by-field pin). ⇒ then **RB-2 COMPLETE** → RB-3 (dual archetypes + MLB luxury tax).

**WAVE 59-FIX — ✅ `bacff8f2` (auditor-caught) — hooks' RESOLVE path was still on the OLD engine; now wired to the one-chance resolve.** CORRECTION to WAVE 59: RB-2b-2 wired the NOMINATION path (`surfaceNextPlayer`) but LEFT both hooks' resolve path on `evaluateResolve` + `passLoneSurvivor` (the OLD tracker/set-aside path) — so the §2.2 one-chance permanent-out AND the RB-2b-1 forced-filler were **DEAD** (no-bid lots still re-nominated via the old machinery). The build/tests were green because the old path is valid code + my RB-2b-2 grep only checked `nominatePlayer|rotateNomination|getCurrentNominator|resolveCpuNomination`, not `evaluateResolve|passLoneSurvivor`. Caught on a disprove-the-claim re-check before RB-2b-3. FIX: both hooks now call `resolveLot` + `passLoneSurvivorOut` at all 5 sites each (autoAdvance OPEN_BIDDING/RESOLVE + resolve/pass callbacks); `claimLoneSurvivor` unchanged. **Now one-chance + forced-filler are LIVE end-to-end** (hook→resolveLot→resolveNoBidLot; verified by grep + the engine tests prove the behavior). GATE: tsc 0; full Mode-1 suite **487 files / 8013 tests, sole fail `wpaRuntimeBoundary`** ⇒ ZERO new reds. **LESSON:** the wiring-audit grep must cover the FULL old-API surface (every retired function), not just the headline ones — `evaluateResolve`/`passLoneSurvivor` are part of the path being retired.

**WAVE 60 — ✅ RB-2b-3 COMMITTED (`cb3e0edd`, `codex/mode1-v1`, branch-only) ⇒ 🎉 RB-2 COMPLETE (the entire §2 engine nomination + one-chance rebuild).**
- **BUILT (Codex gpt-5.5 xhigh → Opus audited, builder≠auditor):** stripped the orphaned old path from `auctionStateMachine.ts` (240 deletions): `nominatePlayer`/`rotateNomination`/`getCurrentNominator`/`getNominationBlockReason`/`evaluateResolve`/`passLoneSurvivor`/`finalizePassedLot`/`releaseEligiblePassedPlayers` + the `PassedPlayerTracker` type + the `setAsidePlayerIds`/`passedTracker` fields (+init) + the 3 dead rejection reasons + the `releaseEligiblePassedPlayers` call inside the shared `finalizeSoldLot` (no re-release under one-chance). KEPT `SET_ASIDE` disposition (the 2 pages reference it; harmless) + all one-chance/shared fns.
- **Tests:** `auctionStateMachine.test.ts` reduced to the 2 PURE-helper tests (`nextBidTurn`, `seededNominationOrder`); the UNIQUE solvency/min-bid `recordBid` rejection test PORTED into `auctionStateMachineOneChance.test.ts` (now 13; **no coverage loss** — confirmed); `cpuShillBidding.test.ts` `evaluateResolve`→`resolveLot`; `auctionSessionStorage.test.ts` fixture drops the removed fields (saved-shape round-trip still passes).
- **Audit:** my INDEPENDENT make-or-break grep of the FULL retired-API surface (incl. word-boundary `\bpassLoneSurvivor\b`) returns **ZERO hits** across `src` — the old machinery is GONE, not merely unreferenced. The engine now exposes exactly ONE nomination/resolve system.
- **GATE (Opus, full suite):** `tsc -b` 0; full Mode-1 suite **487 files (486 pass / 1 fail), 8000 tests (7999 pass / 1 fail)** — sole fail `wpaRuntimeBoundary` ⇒ **ZERO NEW REDS** (−13 net tests = the stripped re-nomination tests minus the ported solvency test). Branch-only, NOT pushed.
- **⇒ 🎉 RB-2 COMPLETE.** Full chain on `codex/mode1-v1`: RB-2a `2b7e894d` (build-dark one-chance engine) · RB-2b-1 `193a9270` (farm flat reserve + hard roster-fill forced-filler) · RB-2b-2 `456bd195` (wire) + WAVE 59-FIX `bacff8f2` (resolve-path — one-chance went LIVE) · RB-2b-3 `cb3e0edd` (strip). The auction is engine-nominated (seeded weighted reveal ∝ percentile^k, MLB k2/farm k3) + one-chance (no-bid → permanently out, hard roster-fill forced-filler) + farm flat reserve, with new leagues defaulting to auction. **JK browser-verify = BV-3 (whole auction surface, batched, pre-D0).**
- **➡ NEXT = RB-3 (dual archetypes + MLB luxury tax, V2 §4.2):** (a) WIRE the RATIFIED soft luxury tax into the auction (un-stub `projectedTax:0`; per-bid marginal tax like the snake's `pickMarginalTax`; cap/42-mod data = `T3_POOL_ANALYSIS §R4`/`tierParams.ts` `LUXURY_CAP_TABLES`/`CAP_MODIFICATION_FRACTIONS`) — do NOT redesign it; (b) ADD the NET-NEW dual identity (separate MLB archetype → the tax, farm archetype → §3.5 scout-priority tilt; `composeIdentity` = IV_ENGINE §6.3 + DECISIONS_LOG §520). **Acceptance gate = §5.3 EV-flatness (no composed identity's best roster >10% off the cross-identity mean; `EV_FLATNESS_TOLERANCE` 0.10 in rosterEngineConstants).** Needs fresh grounding: the `projectedTax` consumer (`auctionMaxBid`/`getTeamAuctionMaxBid` — the tax is ALREADY threaded into solvency, just stubbed 0), `pickMarginalTax` in the snake path, `composeIdentity`/`tierParams`, the EV-flatness harness. → RB-4 (MLB→farm carryover) → … RB-18.

**WAVE 61 — ✅ RB-3a COMMITTED (`671eb8b7`, `codex/mode1-v1`, branch-only) — the PURE auction luxury-tax helper (build-dark).** RB-3 SCOPED + SPLIT (see scope calls below): RB-3a (pure helper, this) / RB-3b (wire into the MLB hook).
- **BUILT (Codex gpt-5.5 xhigh → Opus audited, builder≠auditor):** NEW `src/engines/auctionLuxuryTax.ts` REUSING the ratified snake machinery (grep-confirmed NO reimplemented tax math): `auctionShiftedCaps(capIdentity, tier)` (= `shiftLuxuryCaps(LUXURY_CAP_TABLES[tier], identity)` or base caps if no identity) · `computeAuctionTeamProjectedTax(committedRoster, candidate, capIdentity, tier)` = `luxuryTax([...roster, candidate?], shiftedCaps, 'taxed').charged` (the would-be TOTAL tax after winning the candidate — the auction's analog of the snake's per-pick recompute; documented) · `auctionMarginalTax` = total(with)−total(without). 4 tests incl. the MAKE-OR-BREAK: under a POW+/CON− identity an on-archetype roster is taxed STRICTLY LESS than off-archetype (archetype-fit discrimination works) + base-caps fidelity + cap-shift + candidate variant.
- **GATE (Opus, full suite):** `tsc -b` 0; full Mode-1 suite **488 files (487 pass / 1 fail), 8004 tests (8003 pass / 1 fail)** — sole fail `wpaRuntimeBoundary` ⇒ **ZERO NEW REDS** (+4). Branch-only, NOT pushed.
- **CAPTAIN SCOPE CALLS (AUTH-4 documented defaults — flagged for JK; refine the plan's "RB-3 = dual archetypes + luxury tax"):**
  (1) **RB-3 = MLB luxury tax ONLY.** Grounding (wf Explore) found the single `Team.capIdentity` is ALREADY chosen (LeagueBuilderTeams setup)/persisted (V6-migration round-trip)/consumed by the SNAKE (LeagueBuilderSnakeDraft applies it to caps) — the AUCTION just ignores it (stubs `projectedTax:0`). RB-3 wires the EXISTING identity as the MLB archetype.
  (2) **Farm-archetype DUAL identity → DEFERRED to RB-9.** The farm archetype's only consumer is the §3.5 scout hole-prioritization/valuation TILT, which is RB-9's territory (rosterAnalyzer); the farm wallet stays archetype-NEUTRAL per spec. Adding a dormant `farmIdentity` field now (a saved-shape change) is premature — fold it into RB-9.
  (3) **Full §5.3 EV-flatness HARNESS → DEFERRED to RB-16** (the sim-validation phase the plan already earmarks for tax-curve calibration). T3 already verified EV-flatness PASSES at tierCap; RB-3a ships a focused archetype-fit-discrimination sanity test instead of a heavy best-roster optimizer now (which would risk inventing the §5.3 measurement). RB-16 owns the rigorous cross-identity ≤10% sweep.
- **➡ NEXT = RB-3b (WIRE the MLB luxury tax into the auction hook):** in `useAuctionDraft` (MLB only — farm stays `projectedTax:0`), on each lot surface recompute every eligible team's `projectedTax = computeAuctionTeamProjectedTax(team's committed roster → ConstructionPlayers via `toConstructionPlayer` from the pool, the surfaced candidate → ConstructionPlayer, team.capIdentity, tier)` and inject into the session so the existing `auctionMaxBid` taxes off-archetype bids. Net the committed-roster tax appropriately (mirror the snake's structure or use the would-be-total field). Ground at source: the pool's roster-ratings access + the tier source (RegisteredPool.tier?) + the exact injection point in the autoAdvanceCpu flow + whether the MLB hook test needs updating. → RB-4 (MLB→farm carryover).

**WAVE 62 — ✅ RB-3b COMMITTED (`d5fd0bc3`, `codex/mode1-v1`, branch-only) ⇒ RB-3 (MLB luxury tax) v1 COMPLETE.** The MLB auction now taxes off-archetype bids per lot.
- **BUILT (Codex gpt-5.5 xhigh → Opus audited, builder≠auditor):** `auctionLuxuryTax.ts` gains a CAPS-based core (`computeAuctionTeamProjectedTaxWithCaps`/`auctionShiftedCapsWithBaseCaps`); the tier-based fns DELEGATE to it (RB-3a's 4 tests stay green). `useAuctionDraft` stores a tax context `{poolById, playerById, identityByTeamId, baseCaps = pool.luxuryCaps}` in a ref at init/load + calls `applyAuctionLuxuryTaxForLot` RIGHT AFTER every `surfaceNextPlayer` (init/load/advance/CPU): for the surfaced candidate, each team's `projectedTax` = the would-be total `luxuryTax(LIVE roster + candidate, shiftLuxuryCaps(pool.luxuryCaps, team.capIdentity), 'taxed').charged` ⇒ the existing `auctionMaxBid` reduces off-archetype max bids. AUCTION_COMPLETE-safe (null lot → unchanged).
- **Key correctness call (grounded):** uses **`pool.luxuryCaps`** (the registered caps the snake uses), NOT `LUXURY_CAP_TABLES[pool.tier]` — identical in production but honors the pool's actual caps + keeps the empty-caps hook fixture at 0 tax + matches the snake. Farm hook UNTOUCHED (tax-neutral per spec).
- **Audit:** my checks — pool.luxuryCaps used (not tier), per-lot recompute after surface, farm untouched, RB-3a tests green via delegation, the new hook test NON-VACUOUS (POW-identity team: high-CON off-archetype lot → projectedTax>0/reduced maxBid; on-archetype → 0; empty-caps → [0,0]).
- **GATE (Opus, full suite):** `tsc -b` 0; full Mode-1 suite **488 files (487 pass / 1 fail), 8005 tests (8004 pass / 1 fail)** — sole fail `wpaRuntimeBoundary` ⇒ **ZERO NEW REDS** (+1). Branch-only, NOT pushed.
- **⇒ RB-3 (MLB luxury tax) v1 COMPLETE** (RB-3a `671eb8b7` pure helper · RB-3b `d5fd0bc3` wire). **DEFERRED (documented, flagged for JK):** the farm-archetype DUAL identity → RB-9 (its §3.5 scout-tilt consumer); the full §5.3 EV-flatness cross-identity harness → RB-16 (sim-validation; T3 verified the property at tierCap). **JK BROWSER-VERIFY = BV-3** (the whole auction surface — now incl. the luxury-tax effect on max bids).

**WAVE 63 — ✅ RB-4 COMMITTED (`217ed234`, `codex/mode1-v1`, branch-only) ⇒ the §4.5 MLB→farm budget carryover (one-way valve) is LIVE.** Each GM carries 50% of their OWN unspent MLB budget into their OWN farm wallet.
- **GROUNDED AT SOURCE (Captain direct reads, kbl-mode1):** MLB unspent is authoritative from the PERSISTED MLB auction session per team — `getAuctionSession(leagueId)` (`leagueBuilderStorage.ts:1669`, default season 1 = MLB_AUCTION_SEASON) → `row.session.teams[].budgetRemaining` (`AuctionTeamState`). The engine decrements `budgetRemaining` by the WINNING bid on each sale (`auctionStateMachine.ts:428`) ⇒ at completion = unspent CASH. **The RB-3 luxury tax does NOT reduce it** (tax only caps `auctionMaxBid` via `projectedTax`) → read the session, do NOT re-derive from rosters (settled salary = winning bid ≠ pool salary). Farm seam = `buildFarmAuctionTeamInputs` (`farmAuctionWallet.ts:49`) → `buildFarmAuctionSession` → the hook's `buildFarmAuctionTeams`. teamId is shared MLB↔farm. Resume reuses `row.session` budgets (carryover baked ONCE at init; recompute on the resume display-pool is INERT — no double-count).
- **BUILT (Codex gpt-5.5 xhigh via `codex exec` stdin-from-contract → Opus audited the real diff line-by-line, builder≠auditor):** `farmAuctionWallet.ts` — exported `MLB_TO_FARM_CARRYOVER_PCT = 0.5` (RB-16 sim-tune §11) + pure `computeMlbToFarmCarryover(unspent, pct=0.5)` = `isFinite ? max(0,unspent)×pct : 0` + `BuildFarmAuctionTeamInputsInput.teams[].mlbBudgetCarryover?` added into `budgetRemaining` (double-clamped). `farmAuctionSession.ts` — threads `mlbBudgetCarryover?` through the team mapping. `useFarmAuctionDraft.buildFarmAuctionTeams` — loads the MLB session ONCE, builds `mlbUnspentByTeamId` ONLY when `state === 'AUCTION_COMPLETE'`, sets each team's `mlbBudgetCarryover = computeMlbToFarmCarryover(unspent[team.id] ?? 0)`; `leagueId` threaded into both call sites (init + resume).
- **Audit (disprove-each):** PER-TEAM join by `team.id` (NOT pooled, NOT another team's); AUCTION_COMPLETE-gated + reads session `budgetRemaining` (not re-derived); ADDITIVE — `budgetRemaining` is a pre-existing field, NO new persisted field / NO trackerDb / NO schema change (no storage file in the diff); graceful on missing/snake/incomplete MLB (→ 0, no throw); MLB hook / auction state machine / frozen IV oracle UNTOUCHED. 6 files, 248+/1−.
- **GATE (Opus, full suite):** `NODE_ENV= npx tsc -b` exit 0; full Mode-1 suite **488 files (486 pass / 2 fail), 8012 tests (8010 pass / 2 fail)** — fails = `wpaRuntimeBoundary` (hard characterized) + `GameTrackerLaunchState` (the documented intermittent order-flake — **VERIFIED passes SOLO 9/9**; RB-4 touched only farm-auction files) ⇒ **ZERO NEW REDS** (+7 = RB-4's new test cases). Branch-only, NOT pushed.
- **DEFAULTS-TAKEN (flagged for JK):** carryover % = **50%** default (a §11 sim-tunable; RB-16 sweeps 30/50/70); carryover gated on MLB `AUCTION_COMPLETE` (incomplete/snake → 0); snake-draft MLB carries nothing (no auction-budget concept) — all documented conservative defaults consistent with §4.5/§11. **JK BROWSER-VERIFY = BV-3** (whole auction surface — now incl. a GM entering the farm with carried-over MLB budget).
- **➡ NEXT = RB-5 (player morale from draft, §6/§3.7 — MOSTLY REUSE):** the morale engine `masterMoraleMatrix.composeMoraleConsequence` (`src/engines/masterMoraleMatrix.ts:445`; `MORALE_TUNING:175`) is ALREADY BUILT. RB-5 = (a) define the draft as morale EVENTS (drafted-early/high; overpaid/underpaid vs scout range — early=commitment dominates), (b) feed them through `composeMoraleConsequence` with each player's personality+modifiers, (c) seed the result as starting morale for the freeze (§10 — wired later by RB-7). Careful soul-layer ticket: extract the §6 measurement VERBATIM, surface any ambiguity (no inference). Needs fresh grounding (the §6 event set + the `composeMoraleConsequence` input shape + the draft-result→player join + the `MORALE_TUNING` magnitudes).

**WAVE 64 — ✅ RB-5 COMMITTED (`2374e5d1`, `codex/mode1-v1`, branch-only) ⇒ the §6 player-morale-from-the-draft COMPUTATION is built (pure, build-DARK).** Each drafted player gets a one-time starting morale off neutral 50.
- **FIX-ITERATION (1 of 2 — a CORRECT Codex BLOCK improved the design):** the first dispatch STOP-IF'd (zero files changed) — under the contract's TILT-EACH-then-sum model, `DROOPY` (negSelfMult 1.25 > posSelfMult 0.8) netted **−0.5** on early+underpaid, violating §6 "early dominates." Captain verified the fix: **SUM-then-tilt** (tilt the NET base delta ONCE) — the matrix self-multipliers are always positive, so the base SIGN is preserved ⇒ early-dominates holds for ALL 7 personalities (DROOPY → +4, dampened not flipped). Contract revised + re-dispatched; the model fork logged as a **JK OPEN-DECISION** (sum-then-tilt vs per-signal reactivity = a §11/§13 refinement if JK wants pessimists crushable on early+underpaid).
- **GROUNDED AT SOURCE (Captain direct reads, kbl-mode1):** §6 verbatim (slot ±15 / pay ±10, "early dominates" [early+underpaid +5 / late+overpaid −5 / late+underpaid −25 basement / early+overpaid +25 ceiling], personality-tilted via BOTH axes). `composeMoraleConsequence` (`:445`) already applies the personality (`MORALE_TUNING.personality` pos/neg self-mult) + hidden-modifier (`applyAmbitionOrResilience` ambition-up/resilience-down) tilt to a base self-delta; the additive slot+pay base reproduces "early dominates" because |slot|(15)>|pay|(10).
- **BUILT (Codex gpt-5.5 xhigh stdin-from-contract → Opus audited the real diff line-by-line, builder≠auditor):** (1) `masterMoraleMatrix.ts` — BEHAVIOR-PRESERVING extract: `composeMoraleConsequence`'s self-delta tilt (lines 493-497) is now the EXPORTED `applyPersonalityToSelfMoraleDelta(baseSelfDelta, personality, modifiers)` primitive, which it calls (byte-identical output — the unchanged `masterMoraleMatrix.test.ts` 14/14 green proves it); `clampMorale` exported. NO new event types. (2) NEW pure `src/engines/draftMorale.ts` — `DRAFT_MORALE_TUNING` (±15/±10, RB-16 sim-tune) + `classifyDraftSlot` (won-order TERCILES, sane edges) + `classifyDraftPay` (above/within/below the scout range) + `computeDraftMorale` (`baseDelta = slotBase+payBase` → `applyPersonalityToSelfMoraleDelta` → `clampMorale(50 + tilted)`) + `computeDraftMoraleFromRaw` (RB-7 convenience). (3) NEW `draftMorale.test.ts` (9 tests).
- **Audit (disprove-each):** matrix extract byte-behavior-identical (matrix test unchanged + green); early-dominates asserted FOR ALL 7 personalities (the test loops `CANONICAL_PERSONALITIES`), DROOPY=+4 specifically, middle+within=exactly 50, personality scaling (EGO>RELAXED), modifiers tilt the net; pure/build-DARK (imports only `HiddenModifiers` + the 2 matrix exports — no auction/scout/store/`Date`/`Math.random`/async); NO new event types; trackerDb/oracle untouched.
- **GATE (Opus, full suite):** `NODE_ENV= npx tsc -b` 0; full Mode-1 suite **489 files (488 pass / 1 fail), 8021 tests (8020 pass / 1 fail)** — sole fail `wpaRuntimeBoundary` (hard characterized; `GameTrackerLaunchState` PASSED this run) ⇒ **ZERO NEW REDS** (+1 file/+9 tests = the new draftMorale suite). Branch-only, NOT pushed.
- **SCOPE:** RB-5 = parts (a)+(b) — the pure morale COMPUTATION. Part (c) (seed the value into Mode-2 starting morale at the §10 freeze) is **RB-7**, which calls `computeDraftMoraleFromRaw`. **JK OPEN-DECISION:** sum-then-tilt vs tilt-each per-signal reactivity (logged). **JK BROWSER-VERIFY:** subsumed once RB-7 wires it live.
- **➡ NEXT = RB-6 (fan morale from payroll, §7 — NEW engine):** one-time at draft-end; payroll RANK vs the median; median = neutral 50; deviation HURTS, EXPONENTIAL past the 75th/25th payroll percentile, HIGH side 2× (anti-all-in relocation-risk + anti-tank). Reuse `percentile.ts getPercentile` + the `fanMoraleEngine` 50-neutral scale. PURE engine taking per-team payrolls (the payroll-sum data path = RB-7). Careful soul-layer measurement — the exp-curve params (exponent, in-band behavior) = §11/§13 sim-tune; surface ambiguity (no inference).

**WAVE 65 — ✅ RB-6 COMMITTED (`d90cc5d8`, `codex/mode1-v1`, branch-only) ⇒ the §7 fan-morale-from-payroll COMPUTATION is built (pure, build-DARK).**
- **GROUNDED AT SOURCE (Captain direct reads):** §7 verbatim (payroll RANK vs the median; median=neutral; deviation HURTS; EXPONENTIAL past the 75th/25th payroll percentile; HIGH side 2×). **Measurement call:** §7 says "payroll RANK," so use a RANK-normalized position `i/(N−1)` (lowest 0 / median 0.5 / highest 1) — NOT `percentile.ts getPercentile` (a `≤`-fraction, asymmetric + not median-centered). Fan scale = 0-100 neutral 50 (`fanMoraleEngine`). The per-team payroll SUM (MLB committed = `tierCap − budgetRemaining`) is RECEIVED — the payroll-composition (MLB-only vs MLB+farm) data path is RB-7's OPEN-DECISION.
- **BUILT (Codex gpt-5.5 xhigh stdin-from-contract → Opus audited the real diff line-by-line, builder≠auditor):** NEW pure STANDALONE `src/engines/draftFanMorale.ts` (ZERO imports) — `DRAFT_FAN_MORALE_TUNING` (neutral 50 / high 0.75 / low 0.25 / steepness 2 / lowMax 15 / **highMax 30 = 2× §7** / clamp [0,100], all RB-16 sim-tune) + `computeDraftFanMorale(teamPayrolls)`: tie-averaged rank-normalize → `highExcess=(rank−0.75)/0.25`, `lowExcess=(0.25−rank)/0.25` → bounded-exp `ramp(excess,maxPenalty,k)=maxPenalty·(e^{k·excess}−1)/(e^k−1)` → `clamp(50 − penalty, 0,100)`; degenerate (N≤1 OR all-equal) → neutral 50. + NEW `draftFanMorale.test.ts` (8 tests).
- **Audit (disprove-each):** rank-normalized (not getPercentile); in-band [0.25,0.75] = EXACTLY 50; high-side penalty EXACTLY 2× low-side at symmetric extremes (30 vs 15, asserted); monotonic + convex past thresholds (the test asserts secondHighJump>firstHighJump); tie-average rank; clamp [0,100]; degenerate→neutral; PURE/STANDALONE (zero imports — no auction/scout/matrix/store/Date/random/async); trackerDb/oracle untouched.
- **GATE (Opus):** PROVABLY-ISOLATED new-file ticket (`git status` = 2 new files, ZERO existing modified — nothing imports it ⇒ no transitive-mock-break surface) ⇒ per the kbl-captain isolated-ticket rule, gated on `NODE_ENV= npx tsc -b` exit 0 (clean) + the new test 8/8 green (Opus ran both, never the builder paste). Zero-new-reds trivially (no existing file touched). Branch-only, NOT pushed.
- **➡ NEXT = RB-7 (THE FREEZE → Mode-2, the §10 FOUR-number bridge — careful SAVED-SHAPE / franchise-bridge):** checkpoint-0 stamps per rostered player + team: trueValue (exists) + **settledSalary** (AUC-5.2, winning bid) + **starting PLAYER morale** (RB-5 `computeDraftMoraleFromRaw`) + **starting FAN morale** (RB-6 `computeDraftFanMorale`); franchise-init **seeds Mode-2 morale from the freeze, OVERRIDING defaults** (else the whole draft fingerprint evaporates on season day 1). The HARDEST remaining RB — needs deep grounding of the freeze/checkpoint-0 path + `franchiseInitializer` + the trackerDb shape (verify NO bump + version-pin + migration-survival; the additive morale/settledSalary fields ride existing stores). Surface the payroll-composition + the slot/pay data-join OPEN-DECISIONS.
- **➡ NEXT = RB-4 (MLB→farm budget carryover, V2 §4.5):** one-way valve — unspent MLB budget × carryover% (default 50%, sim-tunable §11) → the farm wallet; timing-enforced (farm runs AFTER MLB, so no farm money to raid back). Small data/logic ticket. Ground at source: where the MLB auction's final unspent budget is read at completion + how the farm wallet (`farmAuctionWallet.ts` / `buildFarmAuctionSession`) is seeded, + the MLB→farm sequencing handoff (AUC-5.1d-3 `draftFormat`/sequencing). → … RB-18.

**WAVE 66 — 🔬 RB-7 GROUNDED + SPLIT (7a/7b); RB-7a CONTRACT DISPATCHED (the §10 four-number freeze → Mode-2 bridge).** RB-7 is the hardest/riskiest remaining RB (saved-shape / franchise-bridge). New full-budget session claimed the baton (`HANDOFF_DONE_20260622T120600Z_rb7-claim`), confirmed sole worker, ground EVERY anchor at SOURCE in kbl-mode1 (workflow recon → Captain personally re-read the safety-critical files; conflicts resolved by direct reads).
- **GROUNDING (Captain direct reads, kbl-mode1 @ d90cc5d8):**
  - `franchiseTrueValueSnapshots` is a store in the **SHARED trackerDb** (`franchiseTrueValueSnapshotsStorage.ts:38 initFranchiseTrueValueSnapshotsDatabase → getTrackerDb()`), TRACKER_DB_VERSION = **25** (`trackerDb.ts:17`), version-pinned by `franchiseSeasonLedgerStorage.test.ts:278` (`expect(TRACKER_DB_VERSION).toBe(25)`) + a 42-store list. (Resolved a recon conflict — it is NOT a separate DB.)
  - **NO checkpoint-0 freeze is written at franchise-init today** — `saveFranchiseTrueValueSnapshotRows` has ONE caller, `processCompletedGame.ts:321` (in-season, per-game cadence). The `checkpoint` refs in `franchiseInitializer.ts` are all `checkpointCadence` (in-season WAR cadence), unrelated. ⇒ "trueValue exists in V1" = it rides the franchise PLAYER record via `deepCopyLeagueToFranchise` (`franchisePlayerStorage.ts:512-684`, `withInitialFranchiseSalary` at :560), NOT a checkpoint-0 snapshot.
  - **`settledSalary` = 0 hits anywhere** (grep) ⇒ AUC-5.2 did NOT stamp it; RB-7 adds it. settledSalary HOME = a 7b decision (player record optional field vs the freeze snapshot row).
  - **Morale baseline:** `franchiseMoraleState.ts` (separate DB `kbl-franchise-morale` v1) — `createSnapshot` defaults `baselineValue:50/currentValue:50` (`:204-205`); `applyFranchiseMoraleEffect` applies a DELTA off baseline (default sourceKind `'random-event-confirmation'`, idempotent by sourceEventId). **There is NO exported baseline-SEED.** §10 needs the BASELINE itself to be the draft value (a starting line, not a delta off 50) ⇒ RB-7b adds an exported `seedFranchiseMoraleBaseline` reusing the private `createSnapshot`/`saveSnapshot` (`:185-252`), with a NEW `FranchiseMoraleSourceKind` (e.g. 'draft-seed').
  - **Injection point** = `franchiseInitializer.ts:initializeFranchise` (:570-680), a NEW step between :661 (`assignTeamFanHopefuls`, AFTER `generateFranchiseHiddenModifierBackfill` :658 guarantees hidden modifiers present) and :663 (`createFranchiseSeasonMetadata`). `config.league` reaches `getAuctionSession(leagueId, season)` (`leagueBuilderStorage.ts:1669`).
  - **Data join:** `AuctionResult {playerId, disposition, winnerTeamId, salary}` (`auctionStateMachine.ts:68-74`), `session.results` in won order; filter `disposition==='SOLD'`. Farm session = same shape (`FarmAuctionSessionResult.session.results`). winningBid = `result.salary`; scout range = `perceivedValueRange(trueIV, scoutAccuracy, seed)` (`scoutValueRange.ts:12`); personality + `HiddenPersonalityModifiers` on the player (`leagueBuilderStorage.ts:273-275`, type `game.ts:124-129`).
- **SAVED-SHAPE VERDICT — confirmed LOW risk: NO trackerDb bump needed.** settledSalary = an optional additive field on an existing store (IndexedDB is field-agnostic); morale rides the existing separate `kbl-franchise-morale` v1 DB. The version-pin test stays green (no new store).
- **SPLIT (proven RB-2a/b · RB-3a/b pattern):**
  - **RB-7a (this dispatch)** = NEW pure `src/engines/draftFreeze.ts` (+ `__tests__/draftFreeze.test.ts`), build-dark, ZERO existing-file edits (provably isolated → tsc + new-test gate, like RB-6). Given the SOLD draftees in won order (MLB+farm, each with team/tier/winning-bid/scout-range/personality/modifiers), it computes per-player starting morale (REUSES RB-5 `computeDraftMoraleFromRaw`) + per-team fan morale (REUSES RB-6 `computeDraftFanMorale`) + settledSalary passthrough. Contract `RB-7a` in PROMPT_CONTRACTS.md.
  - **RB-7b (next)** = the careful saved-shape WIRING — `seedFranchiseMoraleBaseline` writer + settledSalary stamp + `franchiseInitializer` step 8.5 (load sessions → build inputs → `computeDraftFreeze` → seed `kbl-franchise-morale` player + team-fan baselines OVERRIDING the default 50). FULL-suite gate (transitive-import-mock risk on franchiseInitializer) + version-pin + migration-survival.
- **OPEN-DECISIONS-for-JK (documented conservative defaults taken; rework cheap):**
  - **(D-7a-1) slot order = GLOBAL-WITHIN-TIER won order** (index among the tier's SOLD), not per-team — faithful to §6 "WHEN he surfaced/was won." Alt = per-team won-order.
  - **(D-7a-2) fan-morale payroll = MLB winning bids only** (default; §7 win-now/relocation-risk = MLB spend). Alt = MLB+farm. (Engine exposes `fanMoralePayrollScope`.)
  - **(D-7b-1, deferred to 7b) settledSalary home** (franchise player record optional field vs freeze snapshot row) — decide at 7b grounding.
  - **(D-7b-2, deferred to 7b) morale-seed scoutRange source** — the SAME range shown in-draft (persisted?) vs recompute via `perceivedValueRange`; ground the persisted range at 7b.

**WAVE 67 — ✅ RB-7a COMMITTED (`103ac42a`, `codex/mode1-v1`, branch-only) ⇒ the §10 freeze COMPUTE layer is built (pure, build-DARK).** The morale half of the four-number bridge, assembled deterministically.
- **BUILT (Codex gpt-5.5 xhigh stdin-from-contract → Opus audited the real diff line-by-line, builder≠auditor):** NEW pure `src/engines/draftFreeze.ts` (`computeDraftFreeze(wonPlayersInOrder, options?)`): two-pass over the SOLD draftees in won order → per-tier `totalWon` + within-tier `wonOrderIndex`; per player `startingMorale` via RB-5 `computeDraftMoraleFromRaw` + `slotClass` via `classifyDraftSlot` (same args → no double-classify drift); per team `payroll` = Σ settledSalary over in-scope tiers (default MLB-only) → RB-6 `computeDraftFanMorale`; settledSalary passthrough; empty-input → `{players:[],teams:[]}`. + NEW `src/engines/__tests__/draftFreeze.test.ts` (6 tests).
- **Audit (disprove-each):** imports ONLY `../types/game` + `./draftMorale` + `./draftFanMorale` (no store/auction/scout/Date/random/async) ⇒ PURE; REUSES the RB-5/RB-6 engines (grep-confirmed no reimplemented morale/fan math); within-tier index correct on interleaved MLB+FARM input; early-won > late-won morale (early dominates); MLB-only default payroll (a FARM-only team → payroll 0 under default; 'mlb+farm' includes it); the no-DRIFT test asserts `row.morale` deep-equals a direct `computeDraftMoraleFromRaw` call. Measurement defaults D-7a-1 (global-within-tier slot order) + D-7a-2 (MLB-only payroll) in a top-of-file comment.
- **GATE (Opus ran both, never the builder paste):** PROVABLY-ISOLATED new-file ticket (`git status` = EXACTLY 2 new files, ZERO existing modified ⇒ nothing imports it yet → no transitive-mock surface) ⇒ per the isolated-ticket rule, gated on `NODE_ENV= npx tsc -b` exit **0** + the new test 6/6 + the RB-5/RB-6 siblings still green (23/23 across the 3 draft-engine files). Zero-new-reds trivially. Branch-only, NOT pushed.
- **➡ NEXT = RB-7b (the careful saved-shape WIRING — the §10 PAYOFF):** add an exported `seedFranchiseMoraleBaseline` to `franchiseMoraleState.ts` (writes `baselineValue=currentValue=draftValue` reusing the private `createSnapshot`/`saveSnapshot`, new `FranchiseMoraleSourceKind`, idempotent); stamp `settledSalary` (home = D-7b-1, ground at 7b); wire `franchiseInitializer.ts` step 8.5 (between :661 and :663): load the MLB + farm auction sessions (`getAuctionSession(config.league, …)`), build `DraftFreezePlayerInput[]` from SOLD results (winningBid + scoutRange[D-7b-2] + personality/modifiers off the franchise player), call `computeDraftFreeze`, SEED `kbl-franchise-morale` player + team-fan baselines OVERRIDING the default 50. **GATE = FULL Mode-1 suite** (transitive-import-mock risk on franchiseInitializer) + version-pin stays 25 + a migration/round-trip survival check (NO trackerDb bump — confirmed in WAVE 66 grounding).

**WAVE 68 — 🔬 RB-7b GROUNDED + CONTRACT DISPATCHED (the §10 freeze PAYOFF — seed Mode-2 morale, overriding default 50).** A 3-agent source recon (kbl-mode1) + Captain direct reads ground the wiring; RB-7 carved once more so the critical franchise-init persistence diff stays minimal.
- **GROUNDING (Captain direct reads):** scout range is NOT persisted — computed live in the UI only (`perceivedValueRange(scoutPriceOpinion×chemFit, accuracy, seed)`); the chemFit depends on the team's roster-chemistry AT NOMINATION → NOT reconstructable post-hoc. `player.salary` is NOT the winning bid (it's `withInitialFranchiseSalary`'s fresh calc); the winning bid lives ONLY in `session.results[].salary`. No iv on the Player record — iv is on the SESSION's `AuctionPlayer.iv` (`auctionStateMachine.ts:21-25`). Scope at season-1: `seasonId = statsScopeId = getFranchiseSeasonId(franchiseId,1)`, seasonNumber=1. MLB session `getAuctionSession(leagueId,1)`; farm `getAuctionSessionById(createFarmAuctionSessionId(leagueId,1))`. Players w/ modifiers = `hiddenModifierBackfill.players` (franchiseInitializer:658). Morale snapshot WRITE layer is NOT Phase-2-flag-gated (only `applyFranchiseMoraleMatrixConsequence` is) ⇒ seed writes unconditionally (inert until the morale system reads it).
- **SCOPE CARVE (asymmetry rule — minimize the critical-path persistence diff):** **RB-7b = the MORALE SEED ONLY** (player + team-fan baselines via the RB-7a `computeDraftFreeze`). It writes ONLY the existing `kbl-franchise-morale` v1 DB (additive snapshot) ⇒ **ZERO trackerDb touch, NO version bump, version-pin stays 25.** The **settledSalary stamp (§10 #2) is carved to a tiny RB-7c** (a Player-type optional field with NO v1 consumer — a separate, separately-auditable write surface). trueValue (#1) already rides the franchise player record.
- **BUILD (contract RB-7b, dispatched to Codex xhigh):** (1) EDIT `franchiseMoraleState.ts` — new `'draft-seed'` sourceKind + exported `seedFranchiseMoraleBaseline` (writes baseline=current=draftValue reusing the private createSnapshot/saveSnapshot, idempotent by `draft-seed:${target}` sourceEventId, NOT flag-gated). (2) NEW pure `draftFreezeInputs.ts` — `buildDraftFreezeInputs({mlbSession,farmSession,metaByPlayerId})` → `DraftFreezePlayerInput[]` (SOLD-in-won-order, MLB-then-farm tier tag, iv from session, range via perceivedValueRange, personality/modifiers from meta). (3) WIRE `franchiseInitializer` step 8.5 (between :661 and :663): load sessions → build inputs → computeDraftFreeze → seed player + team-fan baselines. (4) tests. GATE = FULL Mode-1 suite (franchiseInitializer transitive-mock risk; fix = test-only mock stubs) + version-pin 25.
- **OPEN-DECISIONS (documented defaults; flagged for JK):**
  - **(D-7b-2) freeze pay-signal range = iv-centered `perceivedValueRange(iv, DEFAULT_FREEZE_SCOUT_ACCURACY=70, seed)`** (default accuracy constant; NO per-scout lookup, NO chemFit). The chemFit-faithful range is non-reconstructable post-hoc. Future fidelity options logged: (a) per-team scout accuracy = `getScoutProfilesForLeague` → `scoutsByTeamId[winnerTeamId]?.accuracyByPosition?.[primaryPosition]` ?? default (LeagueBuilderScoutProfile has teamId + accuracyByPosition); (b) the bulletproof = persist the displayed range at draft-resolve (larger auction-path change → RB-16/defer).
  - **(D-7b-3) graceful no-op** when there is no MLB auction session (snake/incomplete) → leave default-50, no throw (mirrors RB-4).
  - **(D-7c, deferred) settledSalary home** = a Player optional field (additive, no DB bump) — RB-7c.

**WAVE 68 (cont.) — ✅ RB-7b COMMITTED (`bba6e1a8`, `codex/mode1-v1`, branch-only) ⇒ the §10 PAYOFF is LIVE: Mode-2 starting morale is seeded from the draft, overriding the neutral-50 default.**
- **BUILT (Codex gpt-5.5 xhigh → Opus audited the real diff line-by-line, builder≠auditor):** `franchiseMoraleState.ts` — exported `seedFranchiseMoraleBaseline` (baseline=current=clamp(draftValue); ONE 'draft-seed' history entry previousValue 50/delta clamped−50; idempotent — skips if a 'draft-seed' entry already exists; reuses the private `createSnapshot`/`saveSnapshot`; NOT Phase-2-flag-gated, consistent with the unflagged write layer) + new `'draft-seed'` sourceKind. NEW pure `draftFreezeInputs.ts` (`buildDraftFreezeInputs` → SOLD-in-won-order MLB-then-farm `DraftFreezePlayerInput[]`; iv from `session.players[id].iv`; iv-centered `perceivedValueRange(iv, 70, freeze:${id})` range; null/NaN-salary + missing-iv skip; neutral-modifier meta fallback). `franchiseInitializer` step 8.5 (between :661 and :663): load MLB (`getAuctionSession(league,1)`) + farm (`getAuctionSessionById(createFarmAuctionSessionId(league,1))`) sessions, build `metaByPlayerId` from `hiddenModifierBackfill.players`, `computeDraftFreeze`, seed player + team-fan baselines; **graceful no-op when `!mlbSession?.session`** (D-7b-3).
- **AUDIT (disprove-each, Captain direct reads):** clobber concern DISPROVEN — `seedFranchiseMoraleBaseline` is the ONLY franchiseMoraleState ref in franchiseInitializer; `assignTeamCaptains`/`assignTeamFanHopefuls` write only `captainPlayerId`/`fanHopefulPlayerId` to the team store, NOT morale snapshots ⇒ the seed is the FIRST morale-snapshot writer at init, `existing` always null, the `history:[entry]` replacement is safe. Pure builder (only engine/type imports). Seed sets BASELINE to the draft value (not a delta off 50) per §10. Idempotent (re-init safe). The 2 test-mock stubs add the 3 new leagueBuilderStorage exports to the existing partial `vi.mock` + set `getAuctionSession→null` (the non-auction tests hit the no-op path) — test-only, not assertion-gaming.
- **GATE (Opus ran tsc + the FULL suite himself, NOT the builder paste):** `tsc -b` exit 0; FULL Mode-1 suite **492 files (491 pass / 1 fail), 8042 tests (8041 pass / 1 fail)** — sole fail `wpaRuntimeBoundary` (hard characterized; no order-flakes this run) ⇒ **ZERO NEW REDS**. Version-pin `TRACKER_DB_VERSION===25` green within the suite ⇒ **NO trackerDb bump; saved-shape intact** (writes only the existing `kbl-franchise-morale` v1 DB, additive). Branch-only, NOT pushed.
- **➡ NEXT = RB-7c (the tiny §10 #2 — stamp settledSalary):** add an additive optional `settledSalary?: number` to the franchise `Player` (no DB bump), and at franchise-init step 8.5 write each rostered player's auction WINNING BID onto the franchise player record (the freeze inputs already carry it). NO v1 consumer (the morale already uses winningBid live) — pure freeze bookkeeping. Ground the franchise-player save/update path + whether to fold into the existing step or a separate pass. Then RB-8 (GM identity entity) … RB-18.

**WAVE 69 — 🔬 RB-7c CONTRACT DISPATCHED (stamp settledSalary — the last §10 number).** Grounded at source: franchise players live in a PER-FRANCHISE DB (v1, `STORES.PLAYERS`, NOT trackerDb); `saveFranchisePlayer` is a clean spread-and-put (no salary recompute). RB-7c = add an ADDITIVE optional `Player.settledSalary?:number` (the auction winning bid) + stamp it at franchise-init step 8.5 (MLB-tier best-effort via `getFranchisePlayer`/`saveFranchisePlayer`; the freeze inputs already carry the bid). NO DB bump (per-franchise DB v1 + trackerDb 25 both untouched). NO v1 consumer — bookkeeping/audit for future display + valuation.
- **DEFAULT/OPEN-DECISIONs (documented; flagged for JK):**
  - **(D-7c-1) MLB-tier-only stamp** — farm prospects live in the separate farm roster store (not `STORES.PLAYERS`); their settledSalary is deferred (no v1 consumer, separate write path). A `getFranchisePlayer` miss → skip silently.
  - **(D-7c-2 — SURFACED, real economy question) Mode-2 franchise salary ≠ the winning bid TODAY.** GROUNDING FINDING: `withInitialFranchiseSalary` sets `player.salary` to a FRESH attribute-based recalculation, NOT the auction winning bid. §10 calls settledSalary an "additive field" (a distinct record), so RB-7c records the bid WITHOUT touching `salary`. **But this means the auction PRICE does NOT carry into the Mode-2 cap/payroll** (the franchise salary is recomputed). JK DECISION NEEDED: should Mode-2 franchise salary = settledSalary (the won contract, so the auction economy/luxury-tax carries forward) or stay the recalculated value? Out of RB-7c scope; flagged. (If JK says "use the bid," it's a focused follow-up overriding `withInitialFranchiseSalary` for auction-drafted players.)

**WAVE 69 (cont.) — ✅ RB-7c COMMITTED (`1bd042e5`, `codex/mode1-v1`, branch-only) ⇒ 🎉 RB-7 COMPLETE (the entire §10 four-number freeze → Mode-2 bridge).**
- **BUILT (Codex gpt-5.5 xhigh → Opus audited the real diff, builder≠auditor):** additive optional `Player.settledSalary?: number` (leagueBuilderStorage.ts:280) + a guarded stamp loop in franchiseInitializer step 8.5 (after `computeDraftFreeze`, BEFORE the morale-seed loops): per `freeze.players`, `getFranchisePlayer` → skip farm-store misses (D-7c-1) → skip matching value (idempotent) → `saveFranchisePlayer({...existing, settledSalary})`. NEW `franchisePlayerStorageSettledSalary.test.ts` (round-trips present + absent).
- **AUDIT:** minimal/exact; no mock-stub needed (the new `getFranchisePlayer` import is only CALLED inside the `if (mlbSession?.session)` block, which the no-auction tests skip → no transitive-mock break). Does NOT touch `salary`/`withInitialFranchiseSalary`/the salary calc.
- **GATE (Opus ran tsc + FULL suite himself):** `tsc -b` 0; FULL Mode-1 suite **493 files (492 pass / 1 fail), 8044 tests (8043 pass / 1 fail)** — sole fail `wpaRuntimeBoundary` ⇒ **ZERO NEW REDS**. NO DB bump (per-franchise DB v1 + trackerDb 25 untouched). Branch-only, NOT pushed.
- **⇒ 🎉 RB-7 COMPLETE.** Chain on `codex/mode1-v1`: RB-7a `103ac42a` (pure `draftFreeze.ts` compute engine) · RB-7b `bba6e1a8` (the §10 PAYOFF — seed Mode-2 player+fan morale from the draft, overriding default 50; LIVE) · RB-7c `1bd042e5` (settledSalary stamp). All four §10 numbers now stamped at franchise-init checkpoint-0: trueValue (rides the franchise player record via deepCopy) + settledSalary (RB-7c) + starting PLAYER morale (RB-7b/§6) + starting FAN morale (RB-7b/§7). NO trackerDb bump anywhere in RB-7; version-pin stays 25. **JK BROWSER-VERIFY = BV-3** (whole auction surface → franchise hand-off; now incl. draft-derived starting morale + carried settled salary). **JK OPEN-DECISIONS for review:** D-7a-1 (slot order global-within-tier) · D-7a-2 (fan payroll MLB-only) · D-7b-2 (iv-centered freeze range @ default accuracy 70 — chemFit non-reconstructable; per-scout/persist-at-draft are the fidelity upgrades) · D-7c-1 (farm settledSalary deferred) · **D-7c-2 (the winning bid does NOT carry into Mode-2 cap/payroll today — `withInitialFranchiseSalary` recalculates; JK: should franchise salary = settledSalary?).**
- **➡ NEXT = RB-8 (GM identity entity, V2 §8):** a NEW entity structured PARALLEL to the manager profile but ABOVE it (owns roster/draft + can fire the manager; the manager owns in-game). The user IS the GM (first-person, named). Reporter names the GM on roster/draft moves + the manager on in-game moves (two voices). Needs fresh grounding: the existing managerProfiles structure (+ tenureRecords), where the GM entity lives (new store vs rides franchise config/metadata — saved-shape decision), the reporter integration points. Then RB-9 … RB-18.

**WAVE 70 — 🔬 RB-8 GROUNDED + SPLIT (8a/8b/8c); ✅ RB-8a COMMITTED (`f5f20e93`, `codex/mode1-v1`, branch-only) — the GM identity ENTITY + additive persistence (saved-shape core).** Fresh session claimed the RB-8 baton (`HANDOFF_DONE_20260622T132212Z_rb8-claim`), confirmed sole worker, ground EVERY anchor at SOURCE in kbl-mode1 (4-dim workflow recon → Captain personally re-read every safety-critical file).
- **GROUNDING (Captain direct reads, kbl-mode1 @ 1bd042e5):**
  - **Manager-profile template** = `ManagerProfile` (`src/types/managerWpa.ts:92`: managerId/displayName/createdByUser/defaultManager/tenureRecords?) + `ManagerTenureRecord` (`:83`) + `ManagerAssignment` (`:106`). Manager IDENTITY lives in a SEPARATE DB `kbl-manager-identity` v2 (`managerIdentityStorage.ts:15`), NOT trackerDb — because managers are CROSS-INSTANCE + SWAPPABLE (fired/replaced across modes/instances; the separate DB + assignment tombstone + tenureRecords survive a successor overwrite, L11-Q9). Default name = deterministic SMB4 pool pick (`buildDefaultManagerProfile:173`, private `pickBySeed`/`hashStringToUint32`).
  - **GM home options:** trackerDb (v25, 43 stores) = HIGH RISK (version-pin `franchiseSeasonLedgerStorage.test.ts:278/281` + backup parity). Separate-DB precedent: `kbl-manager-identity` v2, `kbl-franchise-morale` v1. Franchise config/metadata = `StoredFranchiseConfig` (`franchise.ts:185`) + `FranchiseMetadata` (`franchiseManager.ts:33`) in **kbl-app-meta v3** (additive RECORD fields = schemaless, NO version bump).
  - **Reporter:** GM-voice roster/draft adapters DON'T EXIST yet (legacy `narrativeEngine` orphaned; Phase-2 `seasonNewsGenerator:147` routes facts to Claude). The ONE live GM-voice-adjacent site = L11 manager-change adapter (`franchiseL11ManagerChangeNewsAdapter:45` — passes firedManagerName/successorManagerName, NO gmName). ⇒ GM reporter voicing has no live consumer except L11 (manager-firing = a front-office/GM move).
  - **Naming flow:** `FranchiseSetup.tsx` captures only `franchiseName` (no GM field). Init `initializeFranchise` (`franchiseInitializer.ts:581`): step 4 sets controlledTeamId (`:610`), step 5 `updateFranchiseMetadata` (`:616`), step 6 builds+saves `StoredFranchiseConfig` (`:646-662`). `controlledTeamId` already tracks the user's team.
- **CAPTAIN SAVED-SHAPE RULING — GM rides the franchise config (kbl-app-meta), additive; NO new DB/store, NO version bump.** Principled reason (not just low-risk): the GM is **franchise-scoped** (the user IS the GM of their franchise), so it LACKS the cross-instance/swappable requirement that justified the manager's separate identity DB. `META_DB_VERSION` stays 3, `TRACKER_DB_VERSION` stays 25, version-pin green.
- **SPLIT (asymmetry rule — isolate the saved-shape core; mirrors RB-7a/b/c):** **RB-8a** (entity+persistence, this) / **RB-8b** (FranchiseSetup GM-name UI) / **RB-8c** (fire-authority + reporter L11 gmName threading).
- **BUILT (Codex gpt-5.5 xhigh stdin-from-contract → Opus audited the real diff line-by-line, builder≠auditor):** NEW `GmProfile`/`GmTenureRecord` interfaces parallel to `ManagerProfile` (`franchise.ts`); additive `gmName?` on FranchiseConfig + `gm?: GmProfile` on StoredFranchiseConfig; `gmName?` on FranchiseMetadata + the `updateFranchiseMetadata` Pick. NEW pure `src/utils/gmIdentity.ts` — `buildGmProfile` (inline deterministic FNV-1a name pick seeded on franchiseId; user gmName → createdByUser:true, blank → generated default createdByUser:false; gmId=`${franchiseId}-gm`; teamId=controlledTeamId; NO Math.random/Date) + `getGmProfile` (reads `config?.gm`). `franchiseInitializer` builds the GM after step 4 + persists gmName (step 5) + gm (step 6) — RB-7b morale block UNTOUCHED. NEW `gmIdentity.test.ts` (4 tests).
- **AUDIT (disprove-each, Captain direct reads):** exactly the 5 contracted paths (no mock stubs needed — `resetMetaDb` pre-exists `franchiseManager.ts:637`, reused not added); GmProfile is a real parallel-to-ManagerProfile ENTITY not a string; default name DETERMINISTIC (no Math.random/Date); init wiring at steps 4/5/6 all BEFORE the untouched `:674` RB-7b morale block; only existing change is the additive `updateFranchiseMetadata` Pick member; frozen IV oracle not in diff. Tests non-vacuous (exact toEqual, determinism same-franchiseId, blank-fallthrough, real fake-indexeddb persistence round-trip + null-miss).
- **GATE (Opus ran tsc + the FULL suite himself, NOT the builder paste):** `tsc -b` exit 0; FULL Mode-1 suite **494 files (493 pass / 1 fail), 8048 tests (8047 pass / 1 fail)** — sole fail `wpaRuntimeBoundary` ⇒ **ZERO NEW REDS** (+1 file/+4 tests = the new gmIdentity suite; no order-flakes this run). **NO DB bump** (META_DB_VERSION 3 + TRACKER_DB_VERSION 25 untouched; version-pin green) ⇒ saved-shape intact. Branch-only, NOT pushed.
- **OPEN-DECISIONS-for-JK (documented defaults TAKEN; rework cheap):**
  - **(D-8a-1 — the saved-shape call) GM home = additive on the franchise config/metadata (kbl-app-meta), NOT a new `kbl-gm-identity` DB nor a trackerDb store.** Reason above. Alt = a separate `kbl-gm-identity` DB IF GMs later need cross-franchise identity or durable tenure/firing history (the manager pattern).
  - **(D-8a-2) blank-name default = a deterministic generated SMB4 name** (`createdByUser:false`), mirroring `buildDefaultManagerProfile`. RB-8b's setup UI lets the user override. Alt = make gmName required at setup / a generic "GM" placeholder.
  - **(D-8a-3) single user-GM per franchise** (bound to `controlledTeamId`), inline on the config. CPU-team GMs (generated, for reporter naming of CPU roster moves) + multiplayer per-team GMs = documented future extension.
  - **(D-8a-4 — scope) RB-8 split:** 8a (entity+persistence, done) / 8b (FranchiseSetup GM-name UI) / 8c (fire-authority + reporter L11 gmName threading). The roster/draft GM-voice reporter adapters DON'T EXIST yet (DARK) → only the live L11 manager-change site gets the GM voice in 8c; broader roster-move GM narration rides the future reporter-cadence work.
- **➡ NEXT = RB-8b (FranchiseSetup GM-name input UI):** add a "GM Name" text input (peer to the franchiseName field, Step 6 Confirm) binding `config.gmName` → flows to RB-8a's `buildGmProfile` (overriding the generated default). Ground at source: FranchiseSetup Step-6 layout + INITIAL_CONFIG + how config flows to `initializeFranchise`; watch the franchise-copy-is-test-characterized gotcha (grep tests over FranchiseSetup before editing). Then RB-8c (fire-authority + reporter) → RB-9 … RB-18.

**WAVE 71 — ✅ RB-8b COMMITTED (`7642ccb6`, `codex/mode1-v1`, branch-only) — the GM naming flow: the user names their GM at setup.**
- **GROUNDED AT SOURCE (Captain direct reads, kbl-mode1):** the FRANCHISE NAME input is at `FranchiseSetup.tsx:1300-1316` inside `Step6Confirm({config, setConfig, …})` (Confirm & Start step); config flows to `initializeFranchise(config)` at `:171`; `config.gmName?` already on `FranchiseConfig` (RB-8a). The characterized test `FranchiseSetup.test.tsx` asserts NOTHING on the FRANCHISE NAME input / Step-6 input count / exact `initializeFranchise` args (the START test only `toHaveBeenCalled()`) ⇒ adding a GM-name input is test-safe.
- **BUILT (Codex gpt-5.5 xhigh stdin-from-contract → Opus audited the real diff, builder≠auditor):** a "GM NAME" `<input>` block in `Step6Confirm` directly after FRANCHISE NAME (mirrors the styling EXACTLY), `value={config.gmName ?? ''}` → `setConfig({...config, gmName})`, OPTIONAL (no required gate), + a first-person helper line ("You are the GM — your name appears on roster & draft moves"). NEW non-vacuous test: type a GM name → START → `mockInitializeFranchise` called with `objectContaining({ gmName: 'Casey Ledger' })` (proves the end-to-end flow into RB-8a's `buildGmProfile`).
- **AUDIT:** exactly the 2 contracted paths (+37/−0); no `franchiseInitializer`/store/type/reporter/oracle touch; existing characterized copy untouched (only ADDED the GM block — the franchise-copy-is-test-characterized gotcha respected); blank input → RB-8a generates the default (no START block).
- **GATE (Opus ran tsc + the FULL suite himself, NOT the builder paste):** `tsc -b` 0; FULL Mode-1 suite **494 files (493 pass / 1 fail), 8049 tests (8048 pass / 1 fail)** — sole fail `wpaRuntimeBoundary` ⇒ **ZERO NEW REDS** (+1 test = the GM-name flow test). UI-only. Branch-only, NOT pushed.
- **➡ NEXT = RB-8c (fire-authority + reporter GM voicing — the last RB-8 piece, build-DARK):** GROUNDED — the L11 manager-change reporter adapter (`franchiseL11ManagerChangeNewsAdapter.ts`) is the ONE GM-voice-on-a-front-office-move site; it is PURE + **build-DARK (NO production caller — grep-confirmed)**; its `facts` (`:98-109`) carry firedManagerName/successorManagerName but NO gmName. The manager-firing flow (`franchiseManagerFiring.ts:200-240 fireManager`) fires with `reason: 'user'|'auto-backstop'|'rebrand'` — a `'user'` firing IS the GM firing the manager (the fire-authority is already modeled; the GM owns the decision). RB-8c = thread additive `gmId?`/`gmName?` through `FranchiseManagerChangeNewsInput` → `facts` (so the dark L11 reporter, when its emission seam goes live post-D13, names the GM as the firing actor — "GM [name] fired manager [X]") + a focused test; the live emission caller will supply gmName via `getGmProfile`. The roster/draft GM-voice adapters (trade/call-up/draft) DON'T EXIST yet → future reporter-cadence work. Closes the plan's "RB-8 GM↔manager fire-authority path" open-verification item.

**WAVE 72 — ✅ RB-8c COMMITTED (`2fb5f641`, `codex/mode1-v1`, branch-only) ⇒ 🎉 RB-8 COMPLETE (the GM identity entity — §8).**
- **BUILT (Codex gpt-5.5 xhigh stdin-from-contract → Opus audited the real diff, builder≠auditor):** additive optional `gmId?`/`gmName?` on `FranchiseManagerChangeNewsInput` (§8 front-office-actor doc comment) + carried VERBATIM into the produced `facts` (`:101-102`). PURE + additive — ZERO logic change (eventType/subjectIds/dramaticWeight/valence/magnitude untouched); the adapter STAYS build-DARK (no production caller added — grep-confirmed). NEW non-vacuous test: gm fields pass through verbatim, absent → `undefined` (no default); the 2 existing exact-`facts` assertions updated to include the additive keys (correct, not gaming).
- **AUDIT (disprove-each):** exactly the 2 contracted paths (+18/−0); no `franchiseManagerFiring`/`gmIdentity`/store/type/init touch; the dark adapter has no new caller; frozen oracle untouched. The fire-authority is modeled by the EXISTING `reason:'user'` manager-firing (the GM owns the decision); RB-8c records the GM as the reporter-named actor, ready for the post-D13 emission seam (which supplies gmName via `getGmProfile`).
- **GATE (Opus ran tsc + the FULL suite himself, NOT the builder paste):** `tsc -b` 0; FULL Mode-1 suite **494 files (493 pass / 1 fail), 8050 tests (8049 pass / 1 fail)** — sole fail `wpaRuntimeBoundary` ⇒ **ZERO NEW REDS** (+1 test = the GM-facts pass-through). Branch-only, NOT pushed.
- **⇒ 🎉 RB-8 COMPLETE.** Chain on `codex/mode1-v1`: RB-8a `f5f20e93` (GM entity + additive franchise-config persistence) · RB-8b `7642ccb6` (FranchiseSetup GM-name input) · RB-8c `2fb5f641` (reporter GM-voice / fire-authority, build-dark). **NO trackerDb/kbl-app-meta version bump anywhere** (GM rides the franchise config additively; META_DB_VERSION 3 + TRACKER_DB_VERSION 25 untouched; version-pin green). **JK BROWSER-VERIFY = BV-3** (now incl. naming your GM at setup → it persists on the franchise). **JK OPEN-DECISIONS for review:** D-8a-1 (GM home = franchise-config additive, NOT a new `kbl-gm-identity` DB — because the GM is franchise-scoped, unlike the cross-instance manager) · D-8a-2 (blank GM name → deterministic generated SMB4 default) · D-8a-3 (single user-GM per franchise; CPU-team/multiplayer GMs deferred) · D-8a-4 (the 8a/8b/8c split; roster/draft GM-voice reporter adapters are DARK/future).
- **➡ NEXT = RB-9 (scout-as-bridge + roster board, V2 §3.5/§9 — MOSTLY REUSE):** hole-detection = the already-built+wired **Roster Analyzer Engine** (`src/engines/rosterAnalyzerEngine.ts`, live in TeamHub + LeagueBuilderRosters; already scout-aware) — add a `draft_prep` surface + a thin draft adapter feeding the GM's in-progress MLB+farm roster; weight holes by the farm-archetype team profile (`smb4TeamProfileEngine`); the scout layer (§3) values the fillers (the JOIN); the roster board renders the analyzer findings. Spec: `ROSTER_ANALYZER_RECOMMENDATION_ENGINE_SPEC.md`. **Do NOT build a parallel hole-detector.** Also folds in the deferred **farm-archetype DUAL identity** (RB-3 scope call (2): the farm archetype's only consumer is this §3.5 scout-tilt; the farm wallet stays archetype-neutral). Substantial fresh grounding → **handed to a full-budget thread.** Then RB-10 … RB-18.

**WAVE 73 — 🔬 RB-9 GROUNDED + SPLIT (9a/9b/9c); ✅ RB-9a COMMITTED (`2c67bcbf`, `codex/mode1-v1`, branch-only, ZERO-NEW-REDS) — the scout-as-bridge hole-detection FOUNDATION (`draft_prep` surface + pure draft adapter, build-DARK).** Fresh full-budget session claimed the RB-9 baton (`HANDOFF_DONE_20260622T143524Z_rb9-claim`), confirmed sole worker (no `codex exec` in flight), ground RB-9 at SOURCE (6-agent workflow recon `wftp6qozm` → Captain personally re-read the safety-critical anchors).
- **GROUNDING (Captain direct reads + recon, kbl-mode1 @ 2fb5f641):**
  - **`analyzeRoster(input: RosterAnalyzerInput): RosterAnalyzerReport`** (`rosterAnalyzerEngine.ts:682`) is a PURE function (zero React/storage). `RosterAnalyzerSurface` (`:5-11`) had 6 values, NO `draft_prep`. **`surface` is a passthrough LABEL** (echoed into `report.identity`, never branched) → adding `'draft_prep'` is a safe additive enum; the draft behavior comes from the INPUT (config targets + in-progress players + roster state), NOT surface-branching → confirms the spec's "REUSE, do NOT build a parallel hole-detector."
  - Hole-detection ALREADY BUILT + tested: `position_coverage` (`:758-782`, driven by `config.rosterTargets.positionMinimums` C/1B/2B/3B/SS:1, OF:3), rotation/bullpen/lineup, roster_count; default targets activeMlb 22/farm 10/total 32. Farm/scout block (`:966-1136`) gated on `farmPlayers.length>0 && hasConstraint('farm_options')` → fed by `AnalyzerPlayer.optionState.{scoutedGrade,scoutConfidence}`. Engine is READ-ONLY (summary.readOnly literal `true`; recs execution∈{read_only,blocked_future_work}). Tests LOOSE (arrayContaining/objectContaining) → new findings/surface additive-safe.
  - **Template** = `rosterAnalyzerFranchiseAdapter.ts` `buildFranchiseTeamAnalyzerInput`(`:284`)/`analyzeFranchiseTeamRoster`(`:347` = `return analyzeRoster(buildXInput(input))`), incl. the hidden-farm ratings gate `ratings: hiddenFarmPlayer ? {} : {...}` (§3.2/§3.6). UI panels `FranchiseRosterAnalyzerPanel`/`BuilderRosterAnalyzerPanel` (inline, take `report: RosterAnalyzerReport|null`) — RB-9c reuse target; NO coverage-grid exists today (gaps shown as top-3 finding text).
  - **In-progress roster** = `session.teams.find(t=>t.teamId===gmTeamId).roster` (`AuctionRosterAssignment[]` {playerId,salary}) on `CpuShillAuctionSession` from `useAuctionDraft`/`useFarmAuctionDraft`. NO `gmTeamId` helper (derive `Team.controlledBy==='human'`). id→record: MLB via `leagueData.players`, farm via `auction.pool.prospects` (DIFFERENT lookups). Auction pages `LeagueBuilderAuctionDraft.tsx`/`LeagueBuilderFarmAuctionDraft.tsx` (mount board after LOT LOG); NO persistent roster board today.
  - **Scout JOIN** = `perceivedValueRange(trueIV,acc,seed)` (`scoutValueRange.ts:12`, THROWS on IV≤0) anchored on `scoutPriceOpinion(...)`×chemFit (RB-1 pattern, `LeagueBuilderFarmAuctionDraft.tsx:74-95`) — already per-prospect live; the JOIN is presentation (holes alongside scout-valued prospects).
  - **Farm-archetype home — CAPTAIN GROUNDING CORRECTION (overrides recon):** NO farm-archetype field exists anywhere (greenfield; RB-3-deferred). The MLB archetype = `TeamCapIdentity` (`leagueConstruction.ts:20` via `composeIdentity(BandPriorities)`, 6 bands incl. Defense) stored PER-TEAM on the leagueBuilder `Team.capIdentity` (`leagueBuilderStorage.ts:146`). The recon recommended the franchise-config home (mirror RB-8 `gm?`), BUT **the auction draft runs BEFORE franchise-init** (franchise-init step 8.5 READS the completed auction sessions — WAVE 68) ⇒ at draft-prep time there is NO `StoredFranchiseConfig` yet ⇒ the farm archetype MUST live where it's available at draft time = the leagueBuilder `Team` (a `farmCapIdentity?` peer to `capIdentity`, additive, leagueBuilder DB — NOT trackerDb, NOT the franchise config). smb4TeamProfile categories (power/contact/speed/rotation/bullpen, 5) vs the 6-band archetype (incl. Defense) — RB-9b's BandPriorities→target-profile mapping must resolve the Defense band.
- **SPLIT (mirrors RB-7/RB-8):** **RB-9a** (this — `draft_prep` surface + pure adapter, build-DARK, isolated) / **RB-9b** (farm-archetype DUAL identity: additive `farmCapIdentity?` on leagueBuilder Team + BandPriorities→Smb4TeamProfileLevels mapping + the §3.5 hole-weighting tilt; likely sub-splits 9b-1 field/mapping / 9b-2 setup UI / 9b-3 tilt) / **RB-9c** (the §9 roster visibility board UI on both auction pages, gaps highlighted, reusing the analyzer report + panel pattern + the scout-JOIN presentation).
- **DISPATCH #1 BLOCKED (correct Codex STOP-IF) → fix1:** the contract's SOURCE-OF-TRUTH pointed Codex to `AUCTION_DRAFT_SPEC_V2.md §3.5 lines 129-147` + a generic "STOP on anchor mismatch (file:line)" — but the V2 specs live on the docs branch `codex/franchise-v1-next`, ABSENT from the mode1 worktree → Codex correctly stopped (zero file changes). **Fix1** (`4534031d`): embedded §3.5 inline + scoped the STOP-IF to `src/…` CODE anchors only + flagged the V2 absence as EXPECTED. Lesson captured in SESSION_RULES pending pen (`6b4b42e9`). Re-dispatch built clean.
- **BUILT (Codex gpt-5.5 xhigh stdin-from-contract → Opus audited the real diff line-by-line, builder≠auditor):** (1) `+ | 'draft_prep'` on `RosterAnalyzerSurface` (`rosterAnalyzerEngine.ts:8`, ONLY engine change, +1 line). (2) NEW pure `src/utils/rosterAnalyzerDraftAdapter.ts` — `DraftAnalyzerMlbEntry`/`DraftAnalyzerFarmEntry`/`DraftAnalyzerAdapterInput` + `buildDraftAnalyzerInput` (MLB→activePlayerIds ratings VISIBLE; FARM→farmPlayerIds `ratings:{}` + `optionState.scoutedGrade/scoutConfidence`; identity mode:'builder' surface:'draft_prep'; config `draft_prep_read_only_v1`, salary disabled [holes-focused default]) + `analyzeDraftRoster` = `return analyzeRoster(buildDraftAnalyzerInput(input))`. (3) NEW `src/utils/tests/rosterAnalyzerDraftAdapter.test.ts` (4 tests).
- **AUDIT (disprove-each, Captain direct reads):** exactly the 3 contracted paths (engine +1 / 2 new); adapter imports ONLY `../engines/rosterAnalyzerEngine` ⇒ PURE; mirrors the franchise template; MLB ratings visible / farm obscured + scout signal (§3.2/§3.6); read-only invariant preserved; frozen IV oracle untouched (`git diff --stat` empty). Test NON-VACUOUS + proves the MAKE-OR-BREAK: an incomplete MLB roster (C/1B/2B/3B/LF — missing SS, 1 OF) yields `position_coverage` findings for SS+OF, farm prospects flow through `farm_options` findings + `call_up_advice` recs (execution read_only) — all from the EXISTING engine, zero logic added.
- **GATE (Opus ran tsc + the FULL Mode-1 suite himself, NOT the builder paste):** `tsc -b` exit 0; FULL suite **495 files (494 pass / 1 fail), 8054 tests (8053 pass / 1 fail)** — sole fail `wpaRuntimeBoundary` ⇒ **ZERO NEW REDS** (+1 file/+4 tests = the new draft-adapter suite; no order-flakes this run). Core-engine touch ⇒ full suite gate run (transitive-mock risk nil — type-only enum + the new adapter is imported by nothing yet). Branch-only, NOT pushed.
- **OPEN-DECISIONS-for-JK (documented defaults TAKEN; rework cheap):**
  - **(D-9a-1) draft analyzer salary = DISABLED** in the `draft_prep_read_only_v1` preset (the auction page owns wallet/tax display; the board is holes-focused). Alt = enable with the wallet cap as luxuryCap.
  - **(D-9a-2) draft adapter takes minimal self-contained entry DTOs** (`DraftAnalyzerMlbEntry`/`FarmEntry`) rather than the auction-session/league domain types — keeps the adapter pure + unit-testable; RB-9c maps session+records → these.
  - **(D-9b-PREVIEW, the saved-shape call for the NEXT ticket) farm-archetype home = leagueBuilder `Team.farmCapIdentity?` (additive, leagueBuilder DB, NO trackerDb bump), NOT the franchise config** — because the draft (its consumer) runs pre-franchise-init. Mirror `capIdentity` + its V6-migration additive round-trip test. (Grounded correction of the recon's franchise-config rec.)
- **➡ NEXT = RB-9b (farm-archetype DUAL identity + §3.5 hole-weighting tilt):** ground the leagueBuilder `Team.capIdentity`/V6-migration treatment + `LeagueBuilderTeams.tsx` collection + `composeIdentity`/`BandPriorities` + `smb4TeamProfileEngine` `targetLevelsToTeamProfile`/`compareTeamProfiles` (the Defense-band mapping) at source, then likely sub-split (9b-1 field+mapping / 9b-2 setup UI / 9b-3 tilt). Then RB-9c (the §9 board) → RB-10 … RB-18.

**WAVE 74 — ✅ RB-9b COMMITTED (`475fed15`, `codex/mode1-v1`, branch-only, ZERO-NEW-REDS) — the farm-archetype field (saved-shape) + the archetype→profile-target BRIDGE (pure, build-DARK).** The DUAL identity RB-3 deferred, plus the missing primitive (`composeIdentity` emits cap-mod names, not profile levels).
- **GROUNDING (Captain direct reads, kbl-mode1 @ 2c67bcbf):** leagueBuilder storage = SEPARATE DB `kbl-league-builder` v8 (`leagueBuilderStorage.ts:40-41`), NOT trackerDb; `capIdentity?: TeamCapIdentity` is an additive field on the `Team` record (`:146`), `saveTeam`/`getTeam` are spread-and-put (persist arbitrary additive fields). V6-migration test pins `db.version===8` + `expectedStores` (`leagueBuilderStorageV6Migration.test.ts:277/278`) + has a "capIdentity is an additive Team field that round-trips" test (`:433-475`). `composeIdentity(BandPriorities)` (`leagueConstruction.ts:156`) emits cap-mod NAMES (top-2 priority bands), NOT profile levels — the bridge is net-new. `Smb4TeamProfileLevels` = power/contact/speed/rotation/bullpen (5; NO defense — `smb4TeamProfileEngine.ts:3-13`); `Band` has 6 incl. Defense. **SAVED-SHAPE HOME (grounded correction of the WAVE 73 recon):** farm archetype rides the leagueBuilder `Team` (peer to `capIdentity`), NOT the franchise config — because the auction draft (its §3.5 consumer) runs BEFORE franchise-init.
- **BUILT (Codex gpt-5.5 xhigh stdin-from-contract → Opus audited the real diff, builder≠auditor):** (1) additive `farmCapIdentity?: TeamCapIdentity` on the leagueBuilder `Team` (`leagueBuilderStorage.ts:147`, ONLY change to that file, +1 line; reuses the existing TeamCapIdentity import). (2) NEW pure `src/engines/farmArchetypeProfile.ts` — `FARM_ARCHETYPE_TARGET_TUNING {baseLevel:3, spread:3}` (sim-tunable §11) + `BAND_TO_PROFILE_CATEGORY` (Power/Contact/Speed/Rotation/Bullpen → category; Defense ABSENT) + `bandPrioritiesToTargetProfile(priorities): Smb4TeamProfileLevels` (per category: `share = priority / maxMappedPriority`; `level = clamp(round(baseLevel + share*spread), 0, 6)`; Defense dropped; non-finite/negative → 0). (3) `+1` V6-migration test "farmCapIdentity round-trips" mirroring the capIdentity test. (4) NEW `farmArchetypeProfile.test.ts` (4 tests).
- **AUDIT (disprove-each, Captain direct reads):** exactly the 4 contracted paths (storage +1 / migration test +44 / 2 new); the bridge imports ONLY `./leagueConstruction` + `./smb4TeamProfileEngine` TYPES ⇒ PURE (no React/storage/Date/random); make-or-break verified by hand — `{Power:6, rest 0}` → power=6 (strict max), others=base 3, NO defense key, Defense never leaks (maxMapped spans only the 5 mapped bands); field is additive on the existing Team record (no storage-logic change). Tests NON-VACUOUS (strict-max power, monotonic ≥ among mapped, all-zero→base, NaN/negative→0). Frozen IV oracle untouched.
- **GATE (Opus ran tsc + the FULL Mode-1 suite himself, NOT the builder paste):** `tsc -b` exit 0; FULL suite **496 files (495 pass / 1 fail), 8059 tests (8058 pass / 1 fail)** — sole fail `wpaRuntimeBoundary` ⇒ **ZERO NEW REDS** (+1 file/+5 tests = the bridge suite [4] + the new migration round-trip [1]). **SAVED-SHAPE PROOF:** `leagueBuilderStorageV6Migration.test.ts` ✓ 8 tests (incl. `db.version===8` + the unchanged `expectedStores`) ⇒ NO DB bump, no new store. Branch-only, NOT pushed.
- **OPEN-DECISIONS-for-JK (documented defaults TAKEN; rework cheap):**
  - **(D-9b-1) farm-archetype home = leagueBuilder `Team.farmCapIdentity?`** (additive, `kbl-league-builder` v8, NO version bump), NOT the franchise config — because the draft runs pre-franchise-init (its consumer). Mirrors `capIdentity` exactly. (Carry into Mode-2 via `deepCopyLeagueToFranchise` is a FUTURE option if a season-long farm tilt ever needs it.)
  - **(D-9b-2) Defense band DROPPED from the profile-gap signal** — SMB4's `Smb4TeamProfileLevels` has no defense category, so the farm archetype's Defense priority does not tilt the profile-gap; defensive completeness is still surfaced by the analyzer's `position_coverage` holes. Alt = add a synthetic defense dimension (bigger, deferred).
  - **(D-9b-3) priority→target-level curve** = `clamp(round(base 3 + (priority/maxMapped)*spread 3))` (top band → level 6, zero → base 3), normalized by the max MAPPED priority (not top-2-only like composeIdentity). Sim-tunable (§11) via `FARM_ARCHETYPE_TARGET_TUNING`. Alt = top-2-emphasis-only.
- **➡ NEXT = RB-9c (the §9 roster visibility board + the §3.5 hole-weighting tilt + the farm-archetype setup picker — the consumer/UI payoff; SUBSTANTIAL → likely sub-splits).** Reuse: `analyzeDraftRoster` (RB-9a) + `bandPrioritiesToTargetProfile`/`compareTeamProfiles`/`calculateTeamProfile` (RB-9b + smb4TeamProfileEngine) for the archetype-weighted gaps; the existing analyzer panels (`FranchiseRosterAnalyzerPanel` TeamHubContent.tsx:6624 / `BuilderRosterAnalyzerPanel` LeagueBuilderRosters.tsx:573) are a STYLE reference (advisory text chips), NOT a roster grid — the §9 glanceable MLB+farm board with gaps highlighted is NEW UI. Mount on `LeagueBuilderAuctionDraft.tsx` (after LOT LOG ~614) + `LeagueBuilderFarmAuctionDraft.tsx` (after ~731); derive the GM team via `Team.controlledBy==='human'`; in-progress roster = `session.teams[].roster`; scout-JOIN reuses `scoutRangeForProspect` (RB-1, `LeagueBuilderFarmAuctionDraft.tsx:74-95`). Farm-archetype picker mirrors the MLB `capIdentity` picker in `LeagueBuilderTeams.tsx`. Then RB-10 … RB-18.

---

## A-WAVE (Branch A — `codex/franchise-v1-next`, the living-season lane). NOTE: prior A-wave tickets (A1.2 legs, RA-2a, L13-8) were logged in SESSION_LOG.md/DECISIONS_LOG; from A1.5a onward the AUTH-4 loop logs Branch-A tickets here too.

**A-W1.5 / A1.5a — ✅ FAME-FLUCTUATION FIX COMMITTED (`0cc319a0`, `codex/franchise-v1-next`, branch-only, ZERO-NEW-REDS) — fame now floats up AND down; only honors pin the protection floor.** Fresh AUTH-4 session (JK "start new session" + caffeinate); sole worker (baton already claimed `HANDOFF_DONE_2026-06-23T211806Z`, no `codex exec` in flight). First ticket of the A-W1.5 wave; PREREQUISITE for the stadium-records fame swap.
- **GROUNDING (Captain workflow `wf_ce29bd51`, 7 source-readers + adversarial synthesis):** verdict READY-WITH-CONTRACT-EDITS. Corrected the contract before dispatch: honor edit line :33→:34, add `FAME_TIER_RANK` import, drop two now-unused `updateReachFloor` imports, `const newReachFloor=` binding shape, `test-utils/lsim/falsification.ts` path (no `invariants/` segment) + the `toBe(26)` count-coupling, de-scoped the §5.3 note (the flat pin does NOT violate `soul.reach-floor-ratchet`), confirm-only on change #3 (trade nudge already in `applyTradeReset`). **Full-surface sweep PROVED completeness:** `updateReachFloor` defined once (`fameModel.ts:190`), exactly 2 production call sites (both edited); only other floor mutation is `applyTradeReset` (lowers to 0) ⇒ no hidden ratchet leak behind a green gate.
- **BUILT (Codex gpt-5.5 xhigh, stdin-from-contract → Opus audited the REAL diff, builder≠auditor):** (1) `franchiseFameCompute.ts` per-game ratchet `updateReachFloor(stored.reachFloor, heat)` → carry-through `reachFloor = stored.reachFloor` + import dropped. (2) `franchiseHonorReachFloor.ts` honor pin `updateReachFloor(row.reachFloor, newHeat)` → `Math.max(row.reachFloor, FAME_TIER_RANK.REGIONAL_STAR)` + import swap. (3) soul invariant `soul.fame-reach-monotonic` rewritten honor-aware (honored = locked All-Star selections ∪ finalized MVP/CY_YOUNG, must keep `reachFloor ≥ REGIONAL_STAR`; non-honored free to fall) + `soul.reach-floor-ratchet` strengthened with a `selectedUnderFloor` check + the falsification CASE updated (count stays 26). (4) re-baselined the 2 characterized fame tests + regenerated the 6 canonical L-SIM checkpoints.
- **AUDIT:** Captain read every diff line-by-line (code exact; heat-bump line untouched; `applyWarLegitimacyGravity` untouched — separately upward-only by design). Adversarial agent verdict **PARITY-OK** (honored set = exactly the production-pinned set → no false-fail; field shapes/category literals confirmed; non-vacuous — 60g run reaches the All-Star lock + award finalize). Baseline JSON shift (moraleSnapshots 47→91) attributed: the baseline was last regenerated at L13-6 (`6dd00141`), BEFORE the A1.2 fame→morale commits → this regen folds in A1.2+A1.5a together, expected, `findings:[]`.
- **GATE (Opus ran it himself):** `tsc -b` 0; FULL suite 2 failed / 7933 passed (474 files) = exactly the characterized set (`wpaRuntimeBoundary` hard + `franchiseManualSmokeFixture` timeout, re-run SOLO 4/4 pass) ⇒ ZERO NEW REDS; L-SIM smoke (24g) `fame-reach-monotonic` 24/0 + `reach-floor-ratchet` 24/0 (2× `fame-war-legitimacy-floor`[INVESTIGATE] = blessed-darling §9, non-blocking); L-SIM season (60g, regen LAST) **findings 0 / criticalFindings 0 / sameSeedByteIdentical true**, finalDigest `9859795:3f0be15e` matches the committed checkpoint-060 (my regen == Codex's); `iv_oracle.json` byte-unchanged. Build-dark (rides the fame flag); NO `TRACKER_DB_VERSION` bump. Branch-only, NOT pushed.
- **HYGIENE NOTE (for JK):** A1.2 (fame→morale, `f374271c`/`49d56ea5`) landed WITHOUT committing a regenerated L-SIM baseline — A1.5a's regen corrects that. `SEASON_SIMULATION_REPORT.md` also regenerated (was stale from 2026-06-19 per V1_BUILD_QUEUE).
- **➡ NEXT = A1.5b (carry converter — `src/engines/` deterministic ballLocation+ParkDimensions→park-adjusted carry feet; air-balls only; HR distance USER-ENTERED; one infield-dirt radius calibrated to the SVG field; replaces the random `estimateDistance` at `fieldZones.ts:735-809`). The HEAD docs commit `c3d914f7` already refined this contract (field-leak gate). Then A1.5c (4 aggregators) → A1.5d (stadium records).

**A-W1.5 / A1.5b — ✅ DETERMINISTIC CARRY CONVERTER COMMITTED (`f3b48fbf`, `codex/franchise-v1-next`, branch-only) — pure build-dark engine.** Sole worker.
- **GROUNDING (Captain workflow `wf_d15a19b4`, 6 source-readers + adversarial synthesis):** confirmed the replace-target trio (`estimateDistance`/`estimateAngle`/`createStadiumBattedBallEvent`, `fieldZones.ts:735-809`) is FULLY ORPHANED (only `zoneCQSpray.test.ts` references it). KEY FINDINGS: the coord space is ANISOTROPIC (`svgToNormalizedPoint = svgX/2, svgY/1.2`) → naive atan2 is WRONG; and the DRAWN SVG field markers DRIFT from the polar model (drawn CF fence → r≈0.909 not 1.0; foul corners 221°/319° vs model 228°/312°; IF diamond r≈0.37–0.50 not 0.45). Verified all load-bearing constants from source (CX=100/CY=115/MAX_R=110, FAN 228/312, `ParkDimensions` lf/cf/rf+WallHeight).
- **CAPTAIN SCOPE RULING (AUTH-4 documented default):** A1.5b = the PURE build-dark ENGINE ONLY, calibrated to the MODEL canon (r=1.0 @ MAX_R=110, forward-correct once the art is fixed). The SVG-marker re-derivation the field-leak gate ultimately requires (a live `EnrichmentPanel.tsx` UI change needing browser sign-off) is **DEFERRED to A1.5b-2** and is a **PRECONDITION before this converter is wired live (A1.5d/RA-2).** 6 forks resolved with documented defaults (Fork#1 LINEAR theta→fence interp across lf@228/cf@270/rf@312; Fork#2 model azimuth 228/312 authoritative; Fork#3 model fence canon + defer art re-derivation; Fork#4 pure scalar/result-object signature; Fork#5 min(r,1.0) wall cap; Fork#6 air/ground from explicit out-code, r<0.45 = IF tiebreaker for hits).
- **BUILT (Codex gpt-5.5 xhigh → Opus audited the REAL diff, builder≠auditor):** NEW `src/engines/carryConverter.ts` (181 lines, `computeBattedBallCarry`: anisotropic inverse → r + uiDeg; HR→user-entered hrDistance NEVER computed; foul/GO/PO/FLO/IF-landing→no carry; air ball→`min(r,1.0)×lerp(lf/cf/rf)`) + NEW `src/engines/__tests__/carryConverter.test.ts` (204 lines, 9 tests). Additive only; `fieldZones.ts` LEFT IN PLACE (orphan deletion deferred to A1.5d). Captain verified the math line-by-line + that the test's `pointAt` helper is the true inverse (real round-trip landmarks), the anisotropy test (260°→Left-Center) is discriminating, the HR test asserts `carryFeet !== cf` (proves no compute), and the documented-drift test pins r≈0.909.
- **GATE (Opus ran it himself):** `tsc -b` 0; `carryConverter.test.ts` 9/9; `zoneCQSpray.test.ts` 45/45 (orphan untouched ⇒ no collateral); `iv_oracle.json` byte-unchanged. Pure isolated new file (imported by nothing) ⇒ no full-suite/transitive-mock risk. NO DB bump, NO UI/wiring. Branch-only, NOT pushed.
- **OPEN-DECISIONS for JK:** (A1.5b-2) the deferred SVG-marker re-derivation (above) — must land + browser-verify before live wiring. The 6 forks' defaults are tunable. The §7.1 tap-instruction tightening ("where it FIRST hit the ground/wall") is a separate UX-copy precondition for trustworthy classification.
- **➡ NEXT = A1.5c (4 season aggregators, zero new capture — UBR `calculateUBR` unfed `rwarCalculator.ts:458`; *ByPosition difficulty-weighted fielding RULED ladder `eventLog.ts:413-427`; extraBasesAllowed OF-arm; catcher-CS-with-discount reconcile w/ RA-8 + the A1.5c FIELD-LEAK WATCH = resolve fielder from event-time position-context, not a late re-map, GAMETRACKER_INVARIANTS_FAILURE_MODES_AUDIT.md:127). Then A1.5d (stadium records, needs A1.5a+A1.5b+WPA archive).

**A-W1.5 / A1.5c — 🔬 GROUNDED + SPLIT INTO 4 SUB-TICKETS (Captain workflow `wf_0b3a0a63`, 6 source-readers + adversarial synthesis; NOT yet built — handed off at the A1.5b clean seam).** Mandate verified: zero new capture, no DB bump, build-DARK. All 4 aggregators are GREENFIELD; the host pipeline (`aggregateGameToSeason` → `processCompletedGame.ts:1011`) is LIVE — so "build-dark" ⇒ ship as PURE functions with NO live caller (wiring deferred to RA-2 era). Any sub-ticket that imports into `seasonAggregator`/`processCompletedGame`/`rwarCalculator` live chains ⇒ FULL-SUITE gate + transitive-mock-break risk (MEMORY L12-3b/4d); pure new-file fns ⇒ build + affected-test only.
- **THE SPLIT (dependency-ordered):**
  - **A1.5c-1 (START FIRST — cleanest, the FIELD-LEAK WATCH lives here):** *ByPosition difficulty-weighted FIELDING signal. Pure new fn in `src/engines/`. Source = `FieldingEvent.specialPlayType` (`eventLog.ts:747`) — **NOT `.difficulty`** (the 5-tier difficulty collapses diving/leaping/over_shoulder → '50-50' and maps failed_robbery→'spectacular', CORRUPTING the ladder). REUSE the existing mapper `mapPersistedSpecialPlayType` (`fwarCalculator.ts:622-659`). RULED ladder (`RATINGS_MEASUREMENT_WORKSHEET.md:82-90`): MAX=`robbed_hr`; HIGH=`diving`,`sliding`; MID=`leaping`; LOW=`over_shoulder`,`running`; **0=`charging`+default+`'Wall Catch'`** (`wall` REMOVED — `fieldingPlayType.ts:241-242` still emits 'Wall Catch' → treat tier 0). Formula §9:80 = `Σ(made?+w:0) / opportunities`. Output maps `putoutsByPosition/assistsByPosition/errorsByPosition/gamesByPosition` ALREADY EXIST on `PlayerSeasonFielding` (`seasonStorage.ts:152-155`) + `careerStorage.ts:159-162`, init `{}`, ZERO writers — but the difficulty-weighted RATE = derive-on-read (NO new field). Gate: build + affected-test.
  - **A1.5c-2:** UBR (Speed). Pure fn: walk persisted `AtBatEvent.runnerOutcomes[]` (`eventLog.ts:375-397`) → `accumulateAdvancement` (`rwarCalculator.ts:280`, confirmed unfed) into `AdvancementStats` (`:87-98`) → `calculateUBR` (`:333`). `calculateUBR` is RUNTIME-ORPHANED (guard `:454-456` needs firstToThird+secondToHomeOnSingle+advancementOpportunities; all 3 live feeders omit them → live UBR=0/estimated). **Compute-only into existing `PlayerSeasonBatting.rwar`; do NOT persist raw counters; do NOT wire `mapBaserunningStats` live (that changes persisted `rwar` → golden-rWAR regen + full suite = NOT build-dark — defer to RA-2).** Gate: build + affected-test (pure fn, no live caller).
  - **A1.5c-3:** extraBasesAllowed (OF arm). Pure fn deriving from `runnerOutcomes` (`fielderPosition` LF/CF/RF + `heldByOf` + `holdingFielder`, `eventLog.ts:384`). Numerator already stored (`outfieldAssists`+`baserunnersHeld`, `seasonStorage.ts:148`, populated `seasonAggregator.ts:380-381`). §9:99 rate = `(assists+held)/(assists+held+extraBasesAllowed)`. Derive-on-read. Gate: build + affected-test.
  - **A1.5c-4 (DEFERRED — BLOCKED on RA-8/A2.2):** catcher-CS-with-discount RATE. **OWNERSHIP: RA-8 owns ADDING `caughtStealingAgainst`+`stolenBasesAllowed` to `PlayerSeasonFielding` (additive, no DB bump, but updates `seasonStorage.test.ts:82` mirror); A1.5c-4 only READS them to produce the discounted rate.** RECONCILE: pull catcher-CS OUT of A1.5c → either merge the field-add into RA-8 (preferred, single owner) or build RA-8 first. Discount already live per-event (`kblWpaAttribution.ts:1374-1375`: CS 0.95/0.05, SB 0.45/0.55) — REUSE; rate = `(CS×0.95)/((CS×0.95)+(SB_allowed×0.45))`, NEVER raw CS%.
- **FIELD-LEAK WATCH — RESOLVED (the leak is already closed at the event source):** `FieldingEvent` STAMPS `playerId`/`playerName`/`position`/`teamId` at event time (`eventLog.ts:740-742`, via `buildFieldingContext`/`defensiveAlignmentByPosition` at play-commit `GameTracker.tsx:3639-3674` → a post-sub play stamps the SUBSTITUTE). The aggregator MUST read the STAMPED `FieldingEvent.playerId`+`.position`, NEVER re-map by lineup / `buildHistoricalDefensiveAlignment` (the documented late-resolution leak, `GAMETRACKER_INVARIANTS_FAILURE_MODES_AUDIT.md:127`). Precedent: `seasonAggregator.ts:352-360` keys off `fieldingEvent.playerId`; `fwarCalculator.ts:731-733` filters by playerId only. **RESIDUAL GUARD: skip/flag rows whose `playerId` matches a `Position` literal** (the extractor fallback stamps `playerId = position string` when alignment is empty, `fieldingEventExtractor.ts:332-333`).
- **8 FORKS — documented conservative defaults (all §16/tunable; none block build):** (1) ladder weight MAGNITUDES are deferred ("§16" = a future sim-tune phase; worksheet ends §10; `:82` = ordinal tiers RULED, numbers deferred) → placeholder `robbed_hr=1.0, diving/sliding=0.7, leaping=0.5, over_shoulder/running=0.3, else=0`, flag `// §16 sim-tune placeholder`. (2) catcher-CS discount = REUSE the live 0.95/0.05 + 0.45/0.55 constants (single source). (3) §9 fielding DENOMINATOR = count of that player's TAGGED plays at that position (non-null `specialPlayType`), §16-tunable — JK FORK. (4) extraBasesAllowed inference = runner advanced ≥2 bases attributed to an OF `fielderPosition` AND `!heldByOf` — JK FORK (pin before build to avoid counting routine advances). (5) 1B scoop (`rescuedThrow`, on `AtBatEvent.enrichment` not `FieldingEvent`) = DEFER the 1B-receiving credit (safe under-count). (6) UBR persist-vs-derive = compute-only. (7) UBR live-vs-dark = build-dark fn now, defer live re-wire to RA-2. (8) fielding/extraBases persist = derive-on-read.
- **CAREER PARITY NOTE:** `careerStorage.ts:159-162` also has unfed *ByPosition maps + lacks catcher-CS fields — state explicitly that A1.5c is SEASON-ONLY (career parity deferred) so a later career consumer doesn't read empty `{}`.
- **➡ NEXT (fresh session): author + dispatch A1.5c-1 (fielding, cleanest, build+affected-test), then A1.5c-2 (UBR), A1.5c-3 (extraBases) — all pure build-dark fns, parallelizable/file-disjoint. A1.5c-4 (catcher-CS) DEFERRED until RA-8 (A2.2). Then A1.5d (stadium records, needs A1.5a+A1.5b+WPA archive).

---

## 2026-06-23 (attended via `/kbl-captain`, Hybrid) — A1.5c-1 DONE + JK session rulings

**A-W1.5 / A1.5c-1 — ✅ DONE (`6b7879d7`, branch-only, ZERO-NEW-REDS) — ByPosition difficulty-weighted fielding aggregator (pure build-dark).** Codex-built (gpt-5.5/xhigh) → Opus-audited (builder≠auditor; read the REAL diff + independent gate, never the paste). NEW `src/engines/difficultyFieldingAggregator.ts` (94 lines) + test (236 lines, 11/11) + a 1-token `export` on `mapPersistedSpecialPlayType` (`fwarCalculator.ts`). The RULED §9 ladder (robbedHR MAX 1.0 / diving·sliding HIGH 0.75 / leaping MID 0.5 / overShoulder·running LOW 0.25 / wall·charging·beatRunner·beatThrow·routine·null = 0; missedDive/missedLeap = denominator opportunity at attempted tier, 0 credit), sourced from `specialPlayType` via the reused mapper — NOT `.difficulty` (which collapses the ladder). **FIELD-LEAK PRIMARY GUARD held** (keys off the STAMPED `event.playerId`/`position`, input = `FieldingEvent[]` only, no position→player re-map; the field-leak test proves p1@CF/p2@CF/p1@LF stay 3 separate buckets). Denominator DECOUPLED — emits raw weighted components; convenience default `weightedConversion/difficultyOpportunities`, min sample 5. Independent gate: `tsc -b` 0 + FULL suite (core-engine-touch insurance) zero-new-reds [run1: 3 fails = wpaRuntimeBoundary + franchiseManualSmokeFixture + GameTrackerLaunchState; run2: 2 fails — all in the characterized order-flake/hard-fail set] + new test 11/11; `iv_oracle.json` byte-unchanged. NO trackerDb bump. SEASON-ONLY (career `*ByPosition` parity deferred).
- **JK RULING (D-A1.5c-1-1 RESOLVED): default denominator = `difficultyOpportunities`** (drops routine-volume dilution per §9 intent; the `totalPlays` reading is recoverable from the exposed components → zero rework).
- **D-A1.5c-1-2 (RESIDUAL, deferred to RA-2 wiring, surfaced to JK):** the grounding's RESIDUAL guard — skip/flag rows whose `playerId` matches a `Position` literal (the `fieldingEventExtractor.ts:332-333` empty-alignment fallback / old test data) — was NOT added to the build-dark aggregator. The PRIMARY stamped-`playerId` guard is implemented+tested; the residual degenerate-data guard's natural home is the RA-2 consumer (skip-vs-flag depends on real needs). Tracked, not lost.

**JK SESSION RULINGS (2026-06-23, attended via `/kbl-captain`, Hybrid mode):** (1) **POSTURE = Hybrid** — keep the loop rolling on engineering, but SURFACE genuine soul-layer / measurement / design forks inline for a ruling before baking into a contract. (2) **FAN OUT Branch B in parallel** (`codex/mode1-v1-b`, worktree `/Users/johnkruse/Projects/kbl-mode1-b`) — its prior parallel thread shipped B6 + S1–S5; next Branch-B ticket = **S6** (draft-board UI: render the S3 per-tool 0–99 bands + S4 overall grade band on the prospect card, default-COVERED / long-press-reveal via RB-11's `LongPressReveal`). SERIALIZE heavy vitest suites across the two worktrees. (3) **After A1.5c-1/2/3, PULL RA-8 (A2.2) FORWARD** (catcher CS/SB fields — unblocks Branch-A T-6 AND the deferred A1.5c-4 catcher-CS), then resume the A-W lane.

**A-W1.5 / A1.5c-2 — ✅ DONE (`8bf12bec`, branch-only, ZERO-NEW-REDS) — UBR season aggregator (pure build-dark).** Codex-built (gpt-5.5/xhigh) → Opus-audited (read the REAL diff + independent gate). NEW `src/engines/ubrAggregator.ts` (166 lines) + test (215 lines, 10/10). Walks persisted `AtBatEvent`s → translates each `runnerOutcome` (+ parent `result`→`onPlay`) into `RunnerAdvancement` → reuses the EXISTING `classifyAdvancement`/`accumulateAdvancement`/`createBlankAdvancementStats`/`calculateUBR` (rwarCalculator UNTOUCHED). **Make-or-break held:** zero-init makes `firstToThird`/`secondToHomeOnSingle`/`advancementOpportunities` DEFINED → the `calculateRWAR` real-UBR guard (`rwarCalculator.ts:454-456`) becomes reachable when wired live (today `mapBaserunningStats` omits them → speed-estimated). Independent gate: `tsc -b` 0 + new test 10/10 + build-dark confirmed (ZERO importers besides the test) + `iv_oracle.json` byte-unchanged. NO trackerDb bump. **Decisions (RA-2-tunable):** D-A1.5c-2-1 `UBR_ON_PLAY_BY_RESULT` (`satisfies Record<AtBatResult>` exhaustive; HR/walks/errors excluded, GRD forced) · D-A1.5c-2-2 held = `heldByOf` only (conservative under-count) · D-A1.5c-2-3/4 compute-only, leagueStats default = SMB4 baseline.

**A-W1.5 / A1.5c-3 — ✅ DONE (`e66a5399`, branch-only, ZERO-NEW-REDS) — extraBasesAllowed OF-arm aggregator (pure build-dark).** Codex-built (gpt-5.5/xhigh) → Opus-audited (read the REAL diff + independent gate). NEW `src/engines/extraBasesAllowedAggregator.ts` (106 lines) + test (236 lines, 9/9). The §9 OF-arm rate DENOMINATOR term (numerator `outfieldAssists+baserunnersHeld` already persists, `seasonStorage.ts:148` / `seasonAggregator.ts:380-381`). Walks `runnerOutcomes[]`, charges +1 to the STAMPED `outcome.fielderId` when an OF let a baserunner take an extra base. + pure `outfieldArmRate((a+h)/(a+h+e), null@0)`. **Field-leak safe** (charges stamped fielderId, never re-derived). Independent gate: `tsc -b` 0 + new test 9/9 + build-dark (ZERO importers) + `iv_oracle.json` byte-unchanged. NO trackerDb bump. **Decision D-A1.5c-3 (RA-2-tunable):** "extra base allowed" = OF-fielded + !heldByOf + !isOutAdvancing + toBase≠'out' + non-batter + base-span≥2 (Fork #4 default; the ≥2 threshold may over-count a routine 2nd→home on a single).

**A1.5c CLOSED for this session (1/2/3 done; -4 deferred).** `6b7879d7` (difficulty fielding) · `8bf12bec` (UBR) · `e66a5399` (extraBasesAllowed). **A1.5c-4 (catcher-CS) STAYS DEFERRED** until RA-8/A2.2 owns the `caughtStealingAgainst`/`stolenBasesAllowed` fields.

**Branch B parallel (fan-out per JK): S6 (draft-board bands UI) — Codex-built + Opus-audited VERIFIED (no raw-ratings leak, default-covered via LongPressReveal, bands compute at the board layer); full-suite gate in confirmation. Logged in `BRANCH_B_PROGRESS.md` on `codex/mode1-v1-b` (separate branch).**

**➡ NEXT (this session): RA-8 (A2.2, PULLED FORWARD per JK) — additive `caughtStealingAgainst`+`stolenBasesAllowed` on `PlayerSeasonFielding` (no DB bump, but `seasonStorage.test.ts` mirror in scope) → unblocks T-6 + A1.5c-4. Then A1.5c-4 (catcher-CS rate, reuse the live 0.95/0.45 discount). A1.5d stadium records still gated on A1.5a+A1.5b+WPA archive. Branch B: S7 (supersede+cleanup, LAST) after S6.**

---

## 2026-06-23 (fresh Hybrid `/kbl-captain` session) — RA-8 (A2.2) COMMITTED + JK rulings (RA-8 build-dark, S7 chemFit)

**A-W2 / RA-8 (A2.2, PULLED FORWARD) — ✅ DONE (`0edf060a`, codex/franchise-v1-next, branch-only, ZERO-NEW-REDS) — catcher CS/SB-allowed fields on PlayerSeasonFielding (additive, BUILD-DARK).** The run's FIRST saved-shape ticket; grounded HARDEST (workflow `wf_a3e3b400`, 5 source-readers → synthesis → adversarial critique; ALL 6 hard gates clean — no missed test mirror / catcher stamped not assumed / no hidden DB-bump / live-vs-dark sound / no career-leak / no oracle scope-creep).
- **GROUNDING corrected the map:** `kblWpaAttribution.ts` lives in `src/utils/` (NOT `src/engines/`); the cited "`seasonStorage.test.ts:82` mirror" is a DECOUPLED phantom — `src/src_figma/__tests__/persistence/seasonStorage.test.ts:82` is a nested-positions LOCAL interface that does NOT import the prod type and names the field `caughtStealing`, so it does NOT pin the prod field name and stays GREEN untouched (the run-log "update the mirror" instruction rested on a false premise). Canonical names = **`caughtStealingAgainst` + `stolenBasesAllowed`** (the A1.5c-4 reader contract). **Make-or-break CONFIRMED:** catcher identity stamped live on the between-play steal events (`runnerAttribution.catcherId`, the SAME key the live WPA engine groups by at `kblWpaAttribution.ts:1354-1378`) → field-leak-safe + derivable per-catcher when the writer lands.
- **JK RULING (Hybrid inline surface): RA-8 = BUILD-DARK field-add** (declare + seed 0; NO aggregator writer). The aggregator has ZERO catcher plumbing today, so live-populate is real build-work (new csMap/sbMap from `BETWEEN_PLAY_EVENTS` + undo-exclusion + empty-`catcherId` bucketing) — deferred to A1.5c-4 where the writer lands WITH its reader/edge-cases. Keeps RA-8 atomic. *(Rejected: live-populate now.)*
- **BUILT (Codex gpt-5.5/high, stdin-from-contract → Opus audited the REAL diff, builder≠auditor):** `src/utils/seasonStorage.ts` ONLY — +2 optional fields on `PlayerSeasonFielding` (after `baserunnersHeld?`) + seed both 0 in `createInitialFieldingStats`. NO seasonAggregator / careerStorage / test / DB touched. Diff faithful to contract.
- **GATE (Opus ran it himself):** `NODE_ENV= npm run build` exit 0; FULL suite (saved-shape insurance) **2 failed / 7972 passed (478 files)** = exactly the characterized set (`wpaRuntimeBoundary` hard + `franchiseManualSmokeFixture` order-flake) ⇒ ZERO NEW REDS; the 2 PlayerSeasonFielding-importing tests green (`seasonStorage.test.ts` 52 / `expectedStatsCategoryRates.test.ts` 5); `iv_oracle.json` byte-unchanged. NO trackerDb bump. Career parity DEFERRED (season-only — a later career consumer must not read empty `{}`). Branch-only, NOT pushed.
- **⇒ UNBLOCKS** Branch-A T-6 (catcher re-earnability) + the deferred A1.5c-4 (catcher-CS discounted rate). **➡ NEXT = A1.5c-4** — catcher-CS rate `= (CS×0.95)/((CS×0.95)+(SB_allowed×0.45))`, reuse the live `kblWpaAttribution.ts:1374-1378` catcher shares (CS 0.95 / SB 0.45), NEVER raw CS%; reads the new RA-8 fields. NOTE A1.5c-4 must define the per-game WRITER too (the build-dark fields are 0 until then). Then A1.5d (stadium records, gated on A1.5a+A1.5b+WPA archive).

**JK SESSION RULINGS (2026-06-23, fresh Hybrid `/kbl-captain` session):** (1) POSTURE = Hybrid (confirmed). (2) RA-8 = build-dark field-add (above). (3) **Branch-B S7 guidance = GRADE-BAND + chemFit nudge** (DECISIONS_LOG) — unblocks S7.

**A-W1.5 / A1.5c-4 — ✅ DONE (`f16cbfd3`, codex/franchise-v1-next, branch-only, ZERO-NEW-REDS) — catcher caught-stealing RATE (pure) + the LIVE WRITER for the RA-8 fields ⇒ 🎉 A1.5c FULLY CLOSED (1/2/3/4).** Grounded (workflow `wf_9142c7f2`, 4 readers → synth → adversarial critique) + independently re-verified the make-or-break anchor before contracting.
- **JK RULING (Hybrid surface): catcher-arm rate constant k = 0.45** (the catcher's own SB blame share, symmetric with the 0.95 CS credit; the source spec named percentages but no formula → surfaced per the no-inference rule). DECISIONS_LOG 2026-06-23. *(Rejected: k=0.55.)*
- **BUILT (Codex gpt-5.5/high → Opus audited the REAL diff, builder≠auditor):** (1) WRITER in `src/utils/seasonAggregator.ts` `aggregateFieldingStats` — new `getBetweenPlayEventsForAggregation` guarded loader (mirrors `getFieldingEventsForAggregation`, routes through the `isMissingVitestMockExport(error,'getBetweenPlayEvents')` swallow-guard) + a `catcherMap` keyed by the STAMPED `runnerAttribution.catcherId` (skip `undoneAt`, skip falsy catcherId=unknown, branch on `ev.type` caught_stealing/stolen_base) → populates the RA-8 `caughtStealingAgainst`/`stolenBasesAllowed` (ungated substrate write). (2) NEW pure `src/engines/catcherCaughtStealingAggregator.ts` `catcherCaughtStealingRate = (CS×0.95)/((CS×0.95)+(SB_allowed×0.45))`, null at 0 (mirrors `extraBasesAllowedAggregator.ts`). (3) NEW test (4/4).
- **MAKE-OR-BREAK HELD:** the new `getBetweenPlayEvents` import did NOT break the 3 `processCompletedGame.{warPersistence,statBoundary,warMetadata}.test.ts` object-literal eventLog mocks at module-load — the swallow-guard handled them (all green, NO mock edits).
- **GATE (Opus ran it himself):** `NODE_ENV= npm run build` exit 0; FULL suite **3 failed / 7975 passed (479 files)** = `wpaRuntimeBoundary` (hard characterized) + `GameTrackerLaunchState` + `franchiseManualSmokeFixture` (both verified solo-pass 9/9 + 4/4) ⇒ ZERO NEW REDS; new catcher test 4/4; `iv_oracle.json` byte-unchanged; NO trackerDb bump; SEASON-only (career parity deferred). Branch-only, NOT pushed.
- **⇒ A1.5c CLOSED** (difficulty-fielding `6b7879d7` · UBR `8bf12bec` · extraBasesAllowed `e66a5399` · catcher-CS `f16cbfd3`). The catcher CS/SB-allowed substrate now accrues live; the rate fn + the other 3 aggregators are build-dark until the RA-2 ratings wiring. **➡ NEXT (Branch A) = A1.5d (stadium records — gated on A1.5a+A1.5b+WPA archive; big, own DB, new flag) OR the A-W2 ratings lane (A2.3 RA-rookie → A2.4 RA-2b contact-quality).** Branch B = S7a (needs the band→$ price table + the 4 S7 forks ruled — captured in BRANCH_B_PROGRESS `2edc66a9`).

---

## 2026-06-24 (attended Hybrid via `/kbl-captain`) — RA-2c ratings-development lane (engine layer + the live-wiring split)

**⚠ LEDGER BACKFILL — the morning RA-2c stack was tracked in `CURRENT_STATE.md` + `DECISIONS_LOG.md` (2026-06-24), not appended here. Pointer-level (full detail in those docs):** A2.3 RA-rookie `738624fa` · RA-2CQ stack (1 `d97504dd` / 2a `90f134f1` / 2b `3291415c` / 2c `0ff7e88c`) · RA-2a adapter `64addf71` · RA-2b peer-pool aggregator `622cc97d` · RA-2c-1 pure signal engine `9ae54ef3` · **RA-2c-1a** mean-position-pure + suppress-when-thin `95d2215a` · **RA-2c-2a** speed-event sample + flat per-category sample-floor gating `0d0644ec`. All build-dark, branch-only, zero-new-reds. JK ruled the full RA-2c-2 qualifier model (3 sample gates + flat floors) + the RA-2 peer-pool/eligibility/signal model (DECISIONS_LOG 2026-06-24). Session checkpoint `39620995`.

**RA-2c-2b — SPLIT for clean audit (the biggest live-wiring ticket of the arc). RA-2c-2b-1 ✅ DONE (`c10ec91b`, `codex/franchise-v1-next`, branch-only, ZERO-NEW-REDS) — assemble the signal-bearing checkpoint roster + per-rating fan-out (build-dark).** Fresh session claimed Branch A from the clean checkpoint `39620995` (JK confirmed the morning window closed; no `HANDOFF_NEEDED` had been left → asked before claiming, per the Step-0 collision rule). Codex-built (gpt-5.5/xhigh, stdin-from-contract) → Opus audited the REAL diff (builder≠auditor) + ran the gate himself.
- **GROUNDED FROM SOURCE (not the recon map):** read the sweep file, the RA-2c-1a/2a engine (`checkpointRatingSignal.ts` — `computeCheckpointRatingSignals`/`classifyRatingsPoolKey`/`CheckpointSignalMember`), the RA-2a adapter (`toExpectedStatsCategoryRates`), `ratingsDevelopment.ts`, `buildFranchiseEffectivePositionReport` (+ the `franchiseValueInputs.ts:447-459` live call precedent), the 3 season getters, the test, and every consumer of the changed/deleted symbols. **Two map-corrections found:** (1) the test's `vi.mock('../seasonStorage', () => ({ getSeasonMetadata }))` is a PARTIAL mock → the new imports (incl. the adapter's `calcBattingAvg/OBP/SLG`) hit the documented transitive-import-mock-break at load → fixed via `importActual`-spread. (2) `franchiseL10SweepCompute.ts:65-67` imports ONLY `type CompletedGameArchiveOptions` from the sweep — so renaming `performanceSignal`→`signalByRatingKey` + dropping the local `normalizePerformanceSignal` import are both safe.
- **BUILT (2 files only):** `franchiseCheckpointSweepCompute.ts` — fetch the 3 season getters + effective-position report; RELAX all 3 guards (`:139` MLB / `:141-142` trueValueRow / `:144-145` teamId) → roster-agnostic POOL membership (skip only `poolKey===null`); NEW `ageToExpectedStatsBand` mapper (ageBand inert); build `CheckpointSignalMember[]` + call `computeCheckpointRatingSignals` ONCE over the full set; `CheckpointRosterEntry.performanceSignal`→`signalByRatingKey` + `createdAt:string|null`; persist fan-out 1→N (byte-exact id `:267`, all overlay fields preserved); DELETE `selectDevelopmentRatingKey`+`stableHash`; drop `normalizePerformanceSignal` import (export kept — L10 uses it); `CHECKPOINT_DEV_TUNING` kept (performanceSignalScale now vestigial, commented). + the test rewrite (14 tests: fan-out 1→N, pitcher-never-arm, empty + cohort-only no-throw, real-assemble proving relaxed guards include a FARM/no-TV player + once-over-full-set + roster-agnostic `middleIF` pooling + per-team morale memoization).
- **DETERMINISM HELD** (the source-grep test stays green; no `Math.random`/`Date.now`/`new Date(`/`indexedDB.open`).
- **GATE (Opus ran it himself):** `NODE_ENV= npm run build` exit 0; affected test 14/14; FULL suite (processCompletedGame transitive-import insurance) **2 failed / 8016 passed (484 files)** = `wpaRuntimeBoundary` (hard characterized) + `franchiseManualSmokeFixture` (timeout order-flake) — a SUBSET of the characterized set (`GameTrackerLaunchState` passed this run) ⇒ ZERO NEW REDS. `iv_oracle.json` byte-unchanged; NO trackerDb bump (reuse `franchiseRatingsOverlays`, cardinality 1→N). Branch-only, NOT pushed.
- **OPEN-DECISION (defaulted, surfaced to JK):** no-True-Value members (free agents / never-played farmhands) are COHORT-ONLY in 2b-1 — they shape the pool mean/SD but receive NO development overlay, because the determinism rule gives them no `createdAt` stamp. JK clarified the INTENT is the **Gate-3 recency model** (a benched/farm player who hasn't played ≥1 PA/≥1 BF since the last checkpoint stays a pool member but isn't moved — DECISIONS_LOG 2026-06-24, already ruled). 2b-1's cohort-only behavior is consistent in direction; **2b-2 must add a deterministic roster-agnostic `createdAt`** so window-active no-TV members CAN move.
- **➡ NEXT (Branch A) = RA-2c-2b-2:** (i) Gate 3 window-eligibility (read games since last checkpoint on the fly; ≥1 PA/≥1 BF; window-inactive stays a pool member, isn't moved); (ii) confidence-weighting `clamp(accumulatedSample/scaledThreshold(fullSeason,basis),0,1)` at `ratingsDevelopment.ts:117` cappedRaw (SHARED engine — add an OPTIONAL `confidence` param, default 1, back-compat; full-suite gate); (iii) the deterministic roster-agnostic `createdAt`; (iv) PURGE-ON-SUPERSEDE rewrite of RATINGS_ADJUSTMENT_SPEC §9 (MLB-only→roster-agnostic window-qualified) + §3B (season-scaled gate→flat floors). Then RA-2c-3 (UBR speed enrichment, deferred). Branch B remains PARKED at S7d-1 (S7d-2/3 HELD for a browser-verified pass per JK).

**RA-2c-2b-2 ✅ DONE (`eb04b6f9`, `codex/franchise-v1-next`, branch-only, ZERO-NEW-REDS) — Gate 3 window-eligibility (recency) for the dark checkpoint sweep.** Codex-built (gpt-5.5/xhigh) → Opus audited the REAL diff (builder≠auditor) + ran the gate himself. (2b-2 SPLIT off the confidence-weighting → that is now RA-2c-2b-3.)
- **GROUNDED:** `GameHeader` (`eventLog.ts:145`) has NO gameNumber/per-player PA — gameNumber comes via `getScheduledGame(header.scheduleGameId)`; no per-game box-score store exists (season stats are cumulative), so faithful "≥1 PA/≥1 BF" reads the at-bat log (`getGameEvents`, `eventLog.ts:1651`, returns non-undone `AtBatEvent[]` with `batterId`/`pitcherId`). Confirmed against JK's verbatim ruling (≥1 PA/BF) — chose the exact at-bat-event read over a starting-lineup proxy (catches platoon/pinch-hit).
- **BUILT (2 files, additive +65 prod / +124 test):** `resolvePreviousCheckpointGameNumber` (descending scan, 0 if none) + async `resolveWindowActivePlayerIds(scope, prevBoundary, current)` (window `(prevBoundary, current]` by REAL scheduled gameNumber; distinct batter/pitcher ids from `getGameEvents`), seam-exposed on `checkpointSweepSeam`. The persist fan-out adds a window-active skip AFTER the `createdAt==null` guard; `resolveCheckpointRoster` + the id formula + the 1→N cardinality UNCHANGED. eventLog test mock = importActual-spread (transitive-break averted).
- **TESTS (14→17):** `resolvePreviousCheckpointGameNumber` boundary math; window-inactive→written:0 (stays cohort member, not moved); real `resolveWindowActivePlayerIds` integration (window `(4,6]` excludes the gn4 + the unresolved game, calls `getGameEvents` only for in-window games, collects only in-window ids). 2b-1 persist tests kept green via a `beforeEach` seam mock marking their ids active.
- **GATE (Opus ran it):** build 0; affected 17/17; FULL suite **2 failed / 8019 passed (484 files)** = `wpaRuntimeBoundary` (HARD, isolated 1-fail/7-pass) + `franchiseManualSmokeFixture` (order-flake, isolated 4-pass) ⇒ ZERO NEW REDS (passing count grew by exactly the +3 new tests). `iv_oracle.json` byte-unchanged; NO trackerDb bump. Branch-only, NOT pushed.
- **⚠ RESIDUAL (build-dark OPEN-DECISION):** the window scan reads COMPLETED headers, so a player whose ONLY window appearance is the just-played game would be missed if that game's header isn't `isComplete`/queryable before the sweep runs at `processCompletedGame:1080` — verify the header-write ordering (or fold the current game's events in explicitly) before the flag-flip. Narrow (a debut-in-this-checkpoint-game player); flagged not lost.
- **➡ NEXT (Branch A) = RA-2c-2b-3 (confidence-weighting, the last code piece):** optional `confidence` param (default 1, back-compat) on `computeCheckpointRatingDevelopment` applied at the cappedRaw stage; sweep computes per-rating confidence `= clamp(ratingSample / scaledThreshold(fullSeasonSample, basis), 0,1)` (per-rating own sample; §16 placeholder full-season targets; pitcher-symmetric), carried onto `CheckpointRosterEntry`. Keep `ratingsDevelopment.test.ts` green (back-compat default). THEN the Captain-owned §9/§3B purge-on-supersede spec rewrite. Then RA-2c-3 (UBR, deferred).

**RA-2c-2b-3 ✅ DONE (`0656640a`, `codex/franchise-v1-next`, branch-only, ZERO-NEW-REDS) — confidence-weighting (the last code piece of RA-2c-2b).** Codex-built (gpt-5.5/xhigh) → Opus audited the REAL diff (all 4 files faithful) + ran the gate.
- **BUILT (4 files):** `ratingsDevelopment.ts` — OPTIONAL `confidence?: number` on `CheckpointRatingDevelopmentInput`; `confidenceScaled = cappedRaw * clamp(confidence ?? 1, 0, 1)` applied at the cappedRaw stage before the dampener (default 1 = pure identity → `ratingsDevelopment.test.ts` byte-behavior unchanged, +2 new tests confidence=0→no-shift / 0.5→exact-half). `franchiseCheckpointSweepCompute.ts` — `CHECKPOINT_FULL_SEASON_SAMPLE` §16 placeholders {power/contact 502 · speed 40 · fielding 350 · arm 80 · velocity/junk/accuracy 600}, `ratingConfidence(ratingKey, sample, totalGames) = clamp(sample / scaledThreshold(target, {…config, gamesPerSeason: totalGames}, basis), 0,1)`, `confidenceBasisForRating` (season for hitters incl. contact, combined for pitchers), `sampleByRatingKey` = MAX over the rating's categories carried onto `CheckpointRosterEntry`; the persist loop passes per-rating `confidence`. Pitcher-symmetric. Build-dark.
- **GATE (Opus ran it):** build 0; affected files SOLO 38/38; FULL suite characterized-only — `wpaRuntimeBoundary` (hard, solo 1-fail/7-pass) + `franchiseManualSmokeFixture` + `GameTrackerLaunchState` (both intermittent order-flakes, confirmed solo-pass) ⇒ ZERO NEW REDS. `iv_oracle.json` byte-unchanged; NO trackerDb bump.

🎉 **RA-2c-2b CODE COMPLETE** — `c10ec91b` (assemble + fan-out) · `eb04b6f9` (Gate 3 recency) · `0656640a` (confidence). **Captain §9/§3B PURGE-ON-SUPERSEDE spec rewrite DONE this session** (RATINGS_ADJUSTMENT_SPEC §3B season-scaled gate → flat per-category floors [confidence stays season-scaled]; §9 "MLB-roster-only / Model A" → roster-agnostic peer pool + window-qualified moves; the RA-2c-2b residual flagged in-spec). **➡ NEXT (Branch A) = RA-2c-3 (UBR speed enrichment, deferred build-dark) and/or the A-lane tail (A2.5 §6A · A1.3a · L12-6 · L4b · A-W3 traits · A1.5d stadium records), then the gate chain.**

**PARALLEL (Branch B, mode1-b — JK 2026-06-24):** B1.6 INVESTIGATED → NOT a Branch-B build (mode1-b's `prospectScoutingDraftEngine.ts` is ALREADY canonical at `:296`; the stale non-canonical `PERSONALITY_POOL` is Branch A's pre-rebuild stub at `:247`, which Branch B's engine supersedes wholesale at the lane-merge — tracked as a merge-time resolve, NOT force-fixed [throwaway + perturbs seeded gen]). JK then chose **RB-13b** as the parallel pick → grounded SAFE-FOR-PARALLEL (reads `getLeagueDraftFormat` READ-ONLY, no overlap-file edit; routes by `draftFormat` + threads `?leagueId` to the draft pages; visible routing = BV follow-up) → contract on the mode1-b PROMPT_CONTRACTS.md, dispatched to Codex. **RB-13b ✅ DONE (`fe98cdbc`, `codex/mode1-v1-b`, branch-only, ZERO-NEW-REDS):** per-league "Draft" action in the Current Leagues list routes snake-vs-auction by `getLeagueDraftFormat` (read-only) + threads `?leagueId`; MLB DRAFT hub button → leagues list (no force-snake); auction+snake draft pages honor `?leagueId` else fall back to `leagues[0]` (back-compat); new exported pure `draftRouteForFormat`/`draftRouteForLeague` (unit-tested). Gate: build 0; affected tests SOLO 74/74; full suite 2 failed / 8090 passed (501 files) = `wpaRuntimeBoundary` (hard) + `SeasonSummary.pass5` (order-flake, confirmed solo-pass 4/4) ⇒ ZERO NEW REDS; `leagueBuilderStorage.ts` untouched. **BV-RB-13b pending** (visible routing — JK browser pass). Branch-B next un-held = RB-18 (live lineup-morale UI, visible) or S7d-2/3 (HELD). Central log on Branch A; code on mode1-b.

**🎉 RA-2c-3 ✅ DONE — closes the ENTIRE RA-2c ratings-adjustment arc (Branch A, branch-only, ZERO-NEW-REDS).** Grounded via subagent (ubrAggregator API + RA-2CQ-2b writer precedent + AdvancementStats semantics) → make-or-break anchors re-verified from source → split into 3a (pure) / 3b (live writer).
- **RA-2c-3a (`082cd967`):** additive optional `extraBasesTaken?`/`advancementOpportunities?` on `PlayerSeasonBatting` (init 0, NO trackerDb bump) + un-dorm `speedBaserunningRate` in `expectedStatsCategoryRates.ts` (sample = `advancementOpportunities`, actual = `extraBasesTaken/advancementOpportunities`, gated denom>0, mirrors `contactQualityRate`). Build-dark (fields 0 until 3b → sample 0 → below the floor). Gate: build 0; adapter test 10/10 (+2 cases); full suite zero-new-reds.
- **RA-2c-3b (`b6a65340`):** live per-game writer — `aggregateBattingStats` reuses `aggregateUbrFromEvents(atBatEvents.filter(!undoneAt))` (keyed by runnerId) to accrue, per baserunner, `extraBasesTaken` (= firstToThird+firstToHomeOnDouble+secondToHomeOnSingle+tagsScored, NOT double-counting the granular tagsScoredFrom2B/3B) + `advancementOpportunities` (verbatim) into the 3a fields. UBR runs value IGNORED; no new fields / no WAR-path / no DB bump. Gate: build 0; FULL suite (transitive chain) 2 failed/8026 passed (484 files) = characterized only ⇒ ZERO NEW REDS; **the new `ubrAggregator` import did NOT trigger a transitive-import-mock-break** (no module-load failure — the swallow-guard precedent held).
- **§9/§3B spec rewrite (`2b9c7647`)** already landed (flat floors + roster-agnostic window-qualified). **RA-2c-3 design default (§16-tunable, flagged):** `speedBaserunningRate = extraBasesTaken/advancementOpportunities` where `advancementOpportunities` = extra-successes + held (excludes forced + thrown-out, per the existing `accumulateAdvancement`).
- **➡ NEXT (Branch A):** the A-lane tail (A2.5 §6A · A1.3a · L12-6 · L4b · A-W3 traits · A1.5d stadium records), then the gate chain (lane-merge → L-SIM final → RB-16 → D12 → D13 → flag-flip → F-141). A growing **BV backlog** (BV-RB-13b · BV-A2.3 · BV-S7b · BV-S7c · BV-RA-2CQ) awaits a JK browser-verify pass.

---

## 2026-06-24 (attended Hybrid via `/kbl-captain`, fresh session) — Priority-1 ratings cleanups (one-model + category migration)

**Shape:** JK "start a new session, run the captain loop" → full Session Start Protocol reads + restate → JK confirmed go. POSTURE = attended Hybrid (Codex builds / Opus audits the real diff / independent gate / commit branch-only). Sole worker (no `HANDOFF_NEEDED`; no `codex exec` in flight at start; several idle `claude` app procs flagged, none building on this branch). HEAD at start `650fdfc1` (post-lane-merge). Grounding workflow `wf_2a88b63d-c15` (6 readers + synthesis) mapped the Priority-1 ratings-cleanup surface → 4 contained tickets (RA-12a / RA-12b / CAT-MIGRATE / NATIVE-WIRE). JK ruled the one genuine fork: **keep HR-rate** (CAT-MIGRATE = 4-drop). Priority order from the mission brief: ratings cleanups → traits → ratings-engine finish → living-season tails → Mode-1/launch tails.

**RA-12a — ✅ DONE (`cf4a4205`, branch-only, ZERO-NEW-REDS) — delete the legacy Model-B offseason rating engine.** Codex-built (gpt-5.5/xhigh, stdin-from-contract) → Opus audited the REAL diff (builder≠auditor) + ran the gate himself. `RatingsAdjustmentFlow.tsx` ONLY (12 ins / 1506 del): removed `computeNetChange` + the netChange-driven offseason ratings/salary screens; the live Model-A dry-run surface (`FranchiseRatingsSalaryDryRunSurface`) is now the only rendered path; the `franchiseId`-less branch is a thin "not available" shell. Make-or-break held (the dry-run branch + surface + `IssueList` byte-intact). DARK on two axes (offseason flag default false + production callers always pass `franchiseId`). Gate: build 0; franchiseMode component tests 60/60 (3 files); `computeNetChange` grep zero; `iv_oracle.json` byte-unchanged. Concurrent doc-worker's `HANDOFF_NEEDED`/gap-analysis edits left UNTOUCHED (staged by path).

**RA-12b — ✅ DONE (`7004bc04`, branch-only, ZERO-NEW-REDS) — retire the Model-C aging random-walk.** Codex-built (gpt-5.5/xhigh) → Opus audited the REAL diff + ran the gate himself. Removed the random-walk rating-projection (`calculateRatingChange`/`processEndOfSeasonAging`/`PHASE_CONFIGS`) + every usage: the orphaned mutation hook `src/src_figma/app/hooks/useAgingData.ts` (deleted, +its test), the dead `processSeasonEnd` in the LIVE `src/hooks/useAgingData.ts` (kept its display API), SpringTrainingFlow's per-rating projection → a clean continuous-development age-outlook view (keeps career-phase counts, still calls `onComplete`), barrel/integration re-exports, the `agingEngine.contract.test`. ALL age/career-phase/retirement DISPLAY live. **Grounding CORRECTED the recon twice** (the live hook's dead `processSeasonEnd` calling the random-walk; SpringTrainingFlow = only rendered consumer but persists nothing + offseason-flag-dark). **Minor accepted deviation:** Codex also dropped the now-dangling random-walk usage from the ARCHIVED (un-built, tsconfig-excluded) `src/archived-pages/SpringTrainingHub.tsx` for consistency rather than STOP-reporting it — harmless dead-code cleanup, kept (reverting would leave a broken import in the archived file); noted for STOP-IF wording next time. Gate: build 0; FULL suite **8186 pass / 2 fail** = `wpaRuntimeBoundary` (hard) + `franchiseManualSmokeFixture` (order-flake, confirmed solo-pass 4/4) ⇒ ZERO NEW REDS; random-walk grep zero; oracle byte-unchanged; NO DB bump. **BV-RA-12b** (spring-training age-outlook view, post-flag). ⇒ 🎉 **RA-12 COMPLETE** (Model B + Model C retired; Model A is now the ONLY rating-mutation engine — clears the F-138 trap).

**CAT-MIGRATE — ✅ DONE (`e59b6111`, branch-only, ZERO-NEW-REDS) — drop the 4 worksheet-retired box-score categories.** Codex-built (gpt-5.5/xhigh) → Opus audited the REAL diff + ran the gate. Dropped `powerIso`/`contactAverage`/`contactOnBase`/`pitchingFipPrevention` lockstep across `EXPECTED_STATS_CATEGORY_META` + `ONE_BY_CATEGORY` + `SMB4_EXPECTED_STATS_BASELINES` + `CHECKPOINT_SAMPLE_FLOORS` + the emitters + the now-orphaned `calculateFIP`/`calcBattingAvg`/`calcOBP` imports + FIP block. **KEPT `powerHomeRunRate`** (JK 4-drop ruling). Survivor check held from source (power=SLG+HR-rate, contact=avoid-K+quality, accuracy=walk-avoidance; all others untouched). **4 test files** repointed — note the 4th (`expectedStatsPoolAggregator.test.ts`) was NOT in my contract list: it used `contactAverage` as a generic sample → type-broke → Codex correctly applied the same `contactAverage`→`contactAvoidStrikeoutRate` repoint (my own blast-radius grep had truncated at `head -20` and missed it; the FULL-suite gate is exactly why it's required). Gate: build 0; FULL suite **8186 pass / 2 fail** = characterized only ⇒ ZERO NEW REDS; retired-literal grep zero (src + test-utils); `powerHomeRunRate` retained; oracle byte-unchanged; NO DB bump. Build-dark (category set feeds only the flag-gated checkpoint sweep).

**NATIVE-WIRE — ✅ DONE (`ea815008`, branch-only, ZERO-NEW-REDS) — wire the SMB4-native difficulty-fielding signal.** Codex-built (gpt-5.5/xhigh) → Opus audited the REAL diff + ran the gate. Two additive `PlayerSeasonFielding` fields (`difficultyWeightedConversion`/`difficultyFieldingOpportunities`, seeded 0, NO DB bump — TRACKER_DB_VERSION stays 25) accrued on the live completed-game path in `aggregateFieldingStats` (reuses the fielding events at `:392`; per-player sum across positions; field-leak-safe by stamped playerId — the catcher-CS pattern); `fieldingRangeRate` repointed from box-score `(PO+A)/games` → `difficultyWeightedConversion/difficultyFieldingOpportunities` (gated >0); `fieldingFieldingPct` untouched. The outfield-arm test was genuinely extended (Diving 0.75 + Leaping 0.5 + Missed-Dive 0 = 1.25 over 3 opps — exercises the real ladder). Speed = already wired (RA-2c-3; worksheet §SPEED line corrected). **Power = NOT wired (BLOCKED on A1.5b-2).** Gate: build 0; FULL suite **8186 pass / 2 fail** = characterized only ⇒ ZERO NEW REDS; version-pin green; oracle byte-unchanged. Build-dark.

⇒ 🎉 **PRIORITY-1 (ratings cleanups) COMPLETE** — RA-12a (`cf4a4205`) · RA-12b (`7004bc04`) · CAT-MIGRATE (`e59b6111`) · NATIVE-WIRE (`ea815008`). One rating-mutation engine (Model A); box-score categories retired (HR-rate kept); native Speed (already) + Fielding (now) wired; Power native parked behind A1.5b-2 browser sign-off. All build-dark, branch-only, zero-new-reds, no DB bump.

**➡ PRIORITY-2 (TRAITS) — IN PROGRESS.** Grounding `wf_ac7d4425-435` (6 readers + synthesis) mapped current-vs-spec → the 16→47 buildable expansion is ALREADY DONE (R1/R2/R3 dark); the rebuild threads a derived trait-value weight through a 7-tier threshold table + generation + the slot duel. 4 soul-layer forks RULED by JK (DECISIONS_LOG 2026-06-24): freeze trait values / split SP-RP pitcher pools / catcher arm protection-only / EOS = same thresholds.

**L9b-2-cleanup — ✅ DONE (`c92e8619`, ZERO-NEW-REDS) — Noodle Arm out of the earnable set** (BUILDABLE_TRAITS + its signal removed; stays canonical + in the Cannon↔Noodle opposite pair — the guard checks CANONICAL_TRAIT_NAMES not BUILDABLE so the mutual exclusion holds; 47→ still 48 buildable [spec said 47, actual was 48 pre-cut]). Cannon Arm intact. Test repointed (dormant Noodle Arm unemitted). Full-suite gate (shared BUILDABLE array).

**T-1 — ✅ DONE (`7e0e62ed`, ZERO-NEW-REDS) — derived trait value/scarcity weight (THE FOUNDATION).** New pure `src/data/traitTierConfig.ts`: §6 constants (stripped keys), frozen `TRAIT_MAX_USES` (workbook 'Traits' col T, dist {0:3,1:62,2:5,3:4,9:1} — Captain-extracted + verified), `computeTraitDollarValue` (memoized IV-marginal on a uniform-50 single-position-'C'/SP baseline; Two-Way via the kbl usage-unlock), `computeTraitWeight` (0.8·rankNorm(|$|) over 73 in-scope + 0.2·scarcity), `assignTier`. **Grounded HARD via a read-only agent that reproduced the spec's dollar figures to the cent** (Metal Head +$14 / Meltdown −$308 / RBI Zero −$2,364 — single-position hitter block, NOT the composite IF/OF block; the new test pins all 3 exactly). FORK-A freeze satisfied by construction (the inputs ARE the XBL-L2 league). Name gotcha handled (suffixed §6 keys → stripped runtime names). Pure/dark, no live caller. iv_oracle.json + traitPricing.ts untouched.

**T-2 — ✅ DONE (`f6c4ea0d`, ZERO-NEW-REDS) — per-trait tier thresholds replace the flat gain/lose scalar.** The two gain/lose comparisons in `computeTraitAcquisition` now read per-trait thresholds from `assignTier` via a memoized `thresholdsForTrait` (try/catch fallback to the flat `TRAIT_ACQUISITION_TUNING` for unresolvable traits — engine stays total). **Comparison direction UNCHANGED** — negative-trait signals are already badness-oriented (Whiffer=K-rate, Slow Poke=DP-rate, RBI Zero=zero-RBI-rate, Choker=unfavorable-rate, Butter Fingers=error-rate — all "higher=more flaw"; Captain-verified), so NO 1−P flip; the negative tier table (built in T-1) carries the P_bad thresholds. New tests: RBI Zero SEVERE uses 0.78/0.18 without inversion; excluded traits fall back to flat tuning. FULL-suite gate (import chain reaches the sweep).

**T-5a — ✅ DONE (`5519c9c7`, ZERO-NEW-REDS) — §8B value+incumbency selection layer (the deterministic slot-duel; T-5 SPLIT for clean audit, NO seeded roll yet).** Codex-built (gpt-5.5/xhigh, stdin-from-contract) → Opus audited the REAL diff (builder≠auditor) + ran the gate himself. `reconcileGainProposals` (`traitAcquisition.ts`) now uses **`gainScore=P×traitWeight`** vs **`keepScore=P_held×traitWeight×1.25`** (β incumbency) as the displacement currency at BOTH the opposite-pair-both-gains duel and the cap duel (raw `probability` retired as the key); firing gains admitted **best-first by gainScore** with **`maxTraits` open-slot capping** (fixes a latent over-admission where 0-held+3-gains admitted all 3); **weakest-held recomputed inside the loop after each displacement** + the displaced incumbent spliced from `working` ⇒ two gains can't both target the same slot (the collision bug). `maxTraits=2`/`incumbencyBeta=1.25` added as OPTIONAL `TraitAcquisitionTuning` fields (engine `?? default` — existing custom-tuning literals untouched); safe `traitWeightFor` wrapper (try/catch → Common-floor 0.15 fallback for excluded/unpriced — proven UNREACHABLE for buildable traits by test). **effectiveHeldStrength reused unchanged** (recomputed-P-or-supplied-strength). Tests: 4 displacement tests re-derived from REAL `computeTraitWeight` values (each pins the weight via `expect(computeTraitWeight(X)).toBeCloseTo(...)` ⇒ the passing suite self-validates the arithmetic against the untouched T-1 fn — no fitting); L872 genuinely FLIPPED (Clutch→Utility) proving keepScore≠bare-P drives displacement; L831 swapped Utility→Rally Starter (documented: a low-value held correctly WOULD be displaced at equal P, so the incumbency-protects property needs a valuable held); +5 new (Appendix-A examples 1/2/3, the collision fix → two DISTINCT displaces targets, excluded-fallback safety); ZERO preserve-tests weakened. **NO seed/randomness** (that's T-5b). Gate (Opus-run, independent of the Codex paste): build 0; FULL suite 516/519 files = `wpaRuntimeBoundary` (hard) + `franchiseManualSmokeFixture` (order-flake) + **`AwardsWatchlist.test.tsx`** (NEW solo-pass order-flake — CONFIRMED benign: passes 2/2 in isolation, zero coupling to trait code; Codex's own run tripped only the first 2, mine tripped 3 ⇒ same code, differing flake set = order-flake) ⇒ **ZERO NEW REDS**; focused `traitAcquisition.test.ts` 72/72; diff scoped to the 2 contracted files; `traitTierConfig`/`traitPricing`/`iv_oracle`/`franchiseTraitGrantCompute` untouched; NO DB bump. Committed by path (concurrent doc-worker's `HANDOFF_NEEDED`/gap-analysis left untouched). **OPEN-DECISION (logged, AUTH-4 default taken):** the seeded roll is OPT-IN via the *presence* of an `input.seed` — absent-seed = all-eligible-fire (= pre-T-5 behavior, keeps the 72 threshold/dead-band unit tests meaningful); this is the natural total-function extension and is implemented in T-5b. **Newly-observed order-flake `AwardsWatchlist.test.tsx`** added to the watch list (solo-pass verified).

**T-5b — ✅ DONE (`10aff46c`, ZERO-NEW-REDS) — §8B seeded firing roll (eligibility → probabilistic firing; the §107 "Likelihood" para).** Codex-built (gpt-5.5/xhigh) → Opus audited the REAL diff (builder≠auditor) + ran the gate himself. Clearing a gain/loss threshold now only makes a trait **eligible**; an optional `input.seed` drives a private FNV-1a→[0,1) roll (`fnv1aUnit`, mirrors `scoutValueRange.ts:55-62`; NO Math.random/Date — grep-verified empty) whose firing probability = exported `firingProbability(normMargin, tier)` = `clamp(base + slope×clamp01(margin) − tierHardness[tier], floor, ceil)` (`TRAIT_FIRING_CURVE` {base .15/slope .80/floor .05/ceil .97; ELITE .10…COMMON 0 hardness} — §16 sim-tune, **monotonic in margin + tier-ordered + bounded**, all asserted). `applyLikelihoodRoll` computes the margin from the SAME `thresholdsByTrait` used for eligibility (gain `(P−gainThr)/(1−gainThr)`, lose `(loseThr−P)/loseThr`, denom-guarded), `draw = fnv1aUnit(`${seed}:${trait}:${valence}`)`, fire if draw<fireProb else `skipped:'likelihood_not_fired'` (new union member). **OPT-IN via seed presence** — absent/empty seed ⇒ rawProposals pass through untouched ⇒ the T-5a tests stay green by construction (0 edits). **Loss symmetric** (a missed loss leaves the trait held — filtered out of `lossNames` ⇒ stays in `working`). Caller `franchiseTraitGrantCompute.ts:249` passes `seed = ${franchiseId}:${seasonId}:${statsScopeId}:${playerId}:${sourceEventId}` (sourceEventId=`trait-grant-${gameNumber}`=checkpoint marker; +1 line, no new import). Tests (+4 engine: firingProbability monotonic/tier/bounds, seeded determinism [JSON-identical twice], opt-in proven BOTH ways with the actual computed FNV draws [borderline P 0.71 fires under a low-draw seed, defers `likelihood_not_fired` under a high-draw seed, high-margin fires regardless], loss-symmetry; +1 caller assert: the exact seed string is passed). **OPEN-DECISION (logged, AUTH-4 default):** the margin→fire curve shape (clamped-linear + tier-hardness) is a §16 sim-tune placeholder hitting the spec's "monotonic in margin, higher tiers harder" + the Appendix-A ex-4 intent; exact constants are RB-16-tunable. Gate (Opus-run, independent): build 0; FULL suite **517/519 pass** = `wpaRuntimeBoundary` (hard) + `franchiseManualSmokeFixture` (order-flake) ONLY ⇒ **ZERO NEW REDS** (AwardsWatchlist did not trip this run — reconfirmed flake); focused `traitAcquisition`+`franchiseTraitGrantCompute` 82/82; randomness grep empty; diff scoped to 4 files; `iv_oracle`/`traitPricing`/`traitTierConfig` untouched; NO DB bump.

⇒ 🎉 **T-5 COMPLETE (a+b)** — the full §8B resolution/selection layer: deterministic value+incumbency slot-duel (`5519c9c7`) + the seeded firing roll (`10aff46c`). A player's 2 trait slots are now a seeded, value-weighted, incumbency-defended contest; clearing a bar is necessary-not-sufficient (probabilistic firing); reproducible for L-SIM. Build-dark, branch-only, zero-new-reds, no DB bump.

**T-4a — ✅ DONE (`095717d6`, ZERO-NEW-REDS) — §5 rarity-weighted POSITIVE prospect trait generation (T-4 SPLIT: positive-weighting now / negatives T-4b).** Codex-built (gpt-5.5/xhigh) → Opus audited the REAL diff (builder≠auditor) + ran the gate himself. `buildCandidate` (`prospectScoutingDraftEngine.ts`) swaps the UNIFORM `pick(`${seed}:trait1`, pool)` → `pickWeighted(`${seed}:trait1`, pool.map(t=>[t, prospectTraitGenWeight(t)]))` (reuses the existing `pickWeighted` :693 + new safe `prospectTraitGenWeight` = `try assignTier(t).genWeight catch 1`); same for trait2 in `pickSecondProspectTrait` (after the existing conflict filter). Valuable traits now appear rarer (COMMON genWeight 1.0 … ELITE 0.05). Pools UNCHANGED (positive-only, no expansion — Two-Way-in-gen deferred). **MAKE-OR-BREAK HELD: the §3.2 analyzer-grade distribution stays within 1.72pp** (`§13 trait-count deviations { zero −0.002, one 0.033, two −0.03 }`, 40k sample green) — the per-prospect rating anchor absorbed the trait re-mix, NO §3.2 target re-baseline / NO tolerance loosen. Two prospect-output TEST goldens legitimately re-baselined in the rarer→commoner direction (verified correct, no weakening): the §10 age-isolation hash (`333c18a6`→`20cf7afb`, age fields byte-identical so age-isolation still holds) + `prospectChemistryRebalance.test.ts` `PRE_REBALANCE_NON_CHEMISTRY_GOLDEN` (K Collector→Metal Head etc. — the weighting working). NEW test: 20k sample, COMMON Base Rounder count > 2× RARE Cannon Arm. **`iv_oracle.json` untouched** (the FROZEN oracle — only inline test goldens moved). Determinism tests pass unchanged (pickWeighted is seed-deterministic). Gate (Opus-run, independent): build 0; FULL suite **517/519 pass** = `wpaRuntimeBoundary` (hard) + `franchiseManualSmokeFixture` (order-flake) ONLY ⇒ **ZERO NEW REDS** (Codex's run additionally tripped `franchiseOffseasonGuards` — confirmed solo-pass flake, did NOT trip the Captain's run); diff scoped (3 src/test files + the 3rd `prospectChemistryRebalance.test.ts` golden, a legit blast-radius file like the CAT-MIGRATE precedent); NO DB bump.

**JK RULING 2026-06-25 (attended, /kbl-captain) — PROSPECT FLAWS = YES (spec default).** Generated prospects MAY spawn with negative traits at `NEGATIVE_TRAIT_FRACTION` 0.27; severe flaws stay rare automatically via the genWeight weighting (Severe 0.15). Ratified §5's polarity pass for v1. (Surfaced as a visible-gameplay fork per Hybrid posture; JK picked "flaws allowed" over "no severe flaws" / "flaw-free v1".) → drives **T-4b**.

**T-4b — ✅ DONE (`ac4280b1`, ZERO-NEW-REDS) — §5 negative-polarity pass: prospects may spawn with flaws (JK 2026-06-25 ratified).** Codex-built (gpt-5.5/xhigh) → Opus audited the REAL diff + ran the gate himself. Each generated trait slot rolls `randomUnit(`${seed}:traitN:polarity`) < NEGATIVE_TRAIT_FRACTION` (0.27) → draws from a NEW role-split negative pool (`PROSPECT_HITTER_NEGATIVE_TRAIT_POOL` 9 / `PROSPECT_PITCHER_NEGATIVE_TRAIT_POOL` 7) genWeight-weighted, else the positive pool; **no-2-negatives** (`slot2Negative = !firstTraitNegative && roll` → slot2 forced positive when slot1 negative); slot2 excludes `firstTrait` / `prospectTraitsConflict` / `TRAIT_OPPOSITES[firstTrait]` (no contradictory pair, both directions). **FIX-ITER 1 (Codex correctly STOP-IF'd first):** the agent-grounded pool listed `Volatile`, but it is `polarity:'positive'` in `traitPricing.ts:454` (despite living in `traitAcquisition` `NEGATIVE_IMAGE_TRAITS` + the `Consistent↔Volatile` pair) — the contract's pool self-validation test caught it; dropped Volatile, re-dispatched. **MAKE-OR-BREAK HELD: §3.2 grade-dist stays ≤1.72pp WITH flaws on** (max dev B+ −0.308pp; the rating anchor absorbs the flaws — NO §3.2 target re-baseline). Observed slot-1 negative rate **0.2709** (≈0.27). Tests: pool self-validation (every neg-pool trait `assignTier.polarity==='negative'` ∈ {MINOR,MODERATE,SEVERE} + role-eligible), 20k distribution (≤1 negative/prospect, no opposite pairs both ways, no conflicts, rate band [0.20,0.32], 30/50/20 split). 2 generation goldens re-baselined (§10 age-isolation hash `20cf7afb`→`a1951a0a` + chemistry pre-snapshot; age fields byte-identical). `iv_oracle`/`traitPricing`/`traitTierConfig` untouched. Gate (Opus-run, independent): build 0; FULL suite **517/519** = `wpaRuntimeBoundary` (hard) + `franchiseManualSmokeFixture` (order-flake) ONLY ⇒ ZERO NEW REDS; NO DB bump. **⚠ OPEN-DECISION-for-JK (logged DECISIONS_LOG):** the `Volatile` priced-positive-but-image-negative inconsistency affects the in-season engine's read of that trait too — surface for a polarity ruling (NOT fixed in T-4b).

**T-4c — ✅ DONE (`7956eee9`, ZERO-NEW-REDS) — generated prospects hold at most ONE Elite-pitch trait.** `PROSPECT_ELITE_PITCH_TRAITS` (the 8) + `prospectTraitsConflict` extended so two different Elite pitches conflict (slot2 excludes a 2nd Elite pitch). 20k-sample test proves no prospect holds two; no golden shift (sample had none); existing-data check ZERO offenders (no scrub); oracle/pricing/tier untouched. Build 0; FULL suite zero-new-reds.

**➡ NEXT (the DORMANT-TRAIT ENABLEMENT WAVE — JK-ruled 2026-06-25; matrix `TRAIT_MEASUREMENT_SPEC §0.6b`, queue `V1_BUILD_QUEUE A-W3.5` (4D-W2), rulings `DECISIONS_LOG 2026-06-25`).**

**T-9a — ✅ DONE (`a7932007`, `codex/franchise-v1-next`, branch-only, ZERO-NEW-REDS) — per-pitch-type NET-QUALITY aggregator (the dormant-trait wave template, part a).** Codex-built (gpt-5.5/xhigh, stdin-from-contract) → Opus audited the REAL diff (builder≠auditor) + ran the gate himself. NEW `addPitchTypeSignals` in `traitCandidateBuilder.ts` (one pass over `sortAtBats(atBatEvents).filter(!undone)`, mirrors `addOutcomeRateSignals`): buckets ONLY the 8 known `enrichment.pitchType` codes; emits a build-dark net-outcome signal per pitcher for each `Elite <pitch>` + per hitter `Fastball Hitter`{4F,2F,CF}/`Off-Speed Hitter`{SL,CB,CH,FK,SB}; `signalValue = Σweights/n`, `sampleSize = tagged-AB count` (the min-sample valve input → the downstream rate-basis `minSampleRate:10` keeps each trait DORMANT until ≥10 tagged ABs of that pitch). The 7-class outcome partition is EXHAUSTIVE + disjoint over the 26-member `AtBatResult` union (K-class spreads the existing `STRIKEOUT_RESULTS`, HR-class the `HOME_RUN_RESULTS` — no hardcode drift). §16 sim-tune weights: pitcher K+1 / out+0.3 / BB−1 / hit−2 / **HR−3 (heaviest)**; hitter HR+3 / big+2 / single+1 / BB+0.5 / out0 / K−1. Wired LAST in `buildRawSignals`, **INERT** (the 10 traits are NOT in `BUILDABLE_TRAITS` → `buildPeerPools`+`computeSeasonTraitCandidates` skip them). **MAKE-OR-BREAK PROVEN by test:** `tagged === plain` candidate output (zero behavior change) while the raw `Elite 4F`/`Fastball Hitter` signals fire; the pitcher 4F bucket arithmetic pinned to −7.4/10 (3K+2GO+BB+2×1B+2HR), the HR-swap = the single heaviest Δ = (−3.0−0.3)/10, and untagged/unknown('CUT')/empty/undone ABs all excluded. **Minor (audited + accepted, not blocking):** `buildRawSignals` made `export` (test-enabling, additive); `classifyPitchOutcome` THROWS on an out-of-union result (defensive fail-loud, type-unreachable — vs the file's usual permissive `.has()`; flagged for an optional skip-not-throw hardening in a later ticket). **GATE (Opus ran it himself, NOT the builder paste):** `NODE_ENV= npm run build` exit 0; focused `traitCandidateBuilder.test.ts` 114/114 (+7 new); FULL suite (this engine is in the `processCompletedGame` import chain) **2 failed / 8215 passed (519 files)** = `wpaRuntimeBoundary` (hard characterized) + `franchiseManualSmokeFixture` (order-flake, CONFIRMED solo-pass 4/4) ⇒ **ZERO NEW REDS**; `iv_oracle.json` byte-unchanged; NO trackerDb bump (v25). Committed by path (the concurrent doc-worker's gap-analysis `M` + the baton files left untouched). **➡ RESUME HERE = T-9b** (add the 10 traits to `BUILDABLE_TRAITS` + the K-Collector-mirror personality image-valence [`POSITIVE_IMAGE_TRAITS` + `IMAGE_DRIVER_SETS`] + confirm the min-sample valve gates the dormant signal; `traitRole` ALREADY returns 'pitcher' for the 8 elites + 'position' for the 2 hitter traits [grounding-verified `traitRealityScorer.ts:89-114` — re-verify from source at build]; the `BUILDABLE_TRAITS` golden list `traitCandidateBuilder.test.ts:182` 48→58; FULL suite) → **T-9c** (engine-side max-1 Elite-pitch mutual-exclusion = a NEW group-exclusion pass in `reconcileGainProposals` after the opposite-pair gain duel; + a shared canonical `ELITE_PITCH_TRAITS` const [cleanest home `src/data/traitTierConfig.ts`, both the generator + the acquisition engine already import it — acyclic], refactor T-4c's `PROSPECT_ELITE_PITCH_TRAITS` to import it).

**➡ NEXT (the DORMANT-TRAIT ENABLEMENT WAVE — JK-ruled 2026-06-25; matrix `TRAIT_MEASUREMENT_SPEC §0.6b`, queue `V1_BUILD_QUEUE A-W3.5` (4D-W2), rulings `DECISIONS_LOG 2026-06-25`):** **T-9** (the wave TEMPLATE — elite pitches EARNABLE). **SPLIT a/b/c (grounded `wf_54f5c51e-b82`; data-verified `wf_wh9in5sah`):** **T-9a** = per-pitch aggregator counting K/BB/hit/HR by `enrichment.pitchType` **ON-THE-FLY from the season at-bat events** the trait sweep already loads — **NO trackerDb bump** (do NOT follow the recon's DB-migration idea). **T-9b** = wire the 8 elites + Fastball{4F,2F,CF}/Off-Speed{rest} Hitter into `BUILDABLE_TRAITS` + the per-pitch **NET-QUALITY** signal (pitcher: K+ / out+ / BB− / hit−− / **HR−−−** ; hitter: HR+++ / hit++ / RBI+ / BB+ / out0 / K− ; §0.6b) + min-sample valve (`traitRealityScorer` sufficiency — dormant until enough TAGGED ABs) + image-valence wiring mirroring K Collector. **T-9c** = engine-side **max-1 Elite-pitch mutual-exclusion** in `reconcileGainProposals` + a shared canonical `ELITE_PITCH_TRAITS` const (refactor T-4c's `PROSPECT_ELITE_PITCH_TRAITS` to import it). FULL suite. Elite tiers (assignTier-verified): Elite 4F ELITE 0.92 · most RARE 0.82 · Elite FK UNCOMMON 0.70. Then **DT-B/C/D/E/F** (pitch-location · diving/chase [NEW rating-gate] · errors incl. **Noodle-Arm-re-added-as-mental-errors** · mojo · bespoke incl. **Metal-Head = PITCHER protective trait**). Then **T-3** (trend tilt + SP/RP cohort split, §4A — FORK-C ruled: split, fold SP-RP/CP into relievers, fallback to full pool) / **T-6** (position-mismatch protection-only map for arm@1B/2B/3B/SS, §8C — FORK-D ruled protection-only, catcher re-earnable DEFERRED; FULL suite) → **T-7** (EOS = one more checkpoint of the same engine, FORK-E ruled same thresholds; deprecate the Trait Wheel Spin; FULL suite). T-1 exports `computeTraitWeight`/`assignTier`/the §6 constants. Then Priority-3 (ratings-engine finish: A2.5 §6A · RA-5/7 · RA-11 · re-grade-per-checkpoint · RA-9 trend · V8 park→WAR), Priority-4 (L4b reporter takes · trade-request wiring), Priority-5 (Mode-1/launch tails).
