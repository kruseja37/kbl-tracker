# L-SIM — ARCHITECTURE, SOUL-LAYER INVARIANT SUITE & AUTONOMY STANDARD

**Status:** READY TO ENACT. **Intended home:** `spec-docs/L_SIM_ARCHITECTURE_AND_INVARIANTS_SPEC.md`
(drop in when you start the L-SIM session — you'll be the sole mutator then).
**Author:** Opus 4.8 (Captain), 2026-06-19. **Builder when enacted:** Codex (builder≠auditor). **Auditor:** Opus 4.8.

> **What this is.** The `season-simulator` skill is a strong harness, but its 12 coherence checks are all the **baseball-stats**
> layer (games-played, wins=losses, stat sums, WAR-current, no-NaN). It has **zero** soul-layer checks. This spec (a) wires the
> existing skill chain together, (b) adds the **flags-force-ON** requirement the skills predate, (c) supplies the **soul-layer
> invariant suite** — the crown jewel — and (d) sets an **autonomy standard** so Opus runs the whole enactment with minimal
> questions to JK.

> **Why it matters.** Every Phase-2 soul system (fame, morale, traits, races, awards, managers, flashpoint, events,
> designations, relationships) is build-DARK and **unit-verified only**. The bugs that bite weeks into a real season —
> accumulated-state drift, cadence errors, fame ratchets, persistence corruption across version bumps — are invisible to unit
> tests. The L-SIM is the **safe rehearsal**: a throwaway sandbox, flags ON, run before you ever flip flags on the real,
> un-restartable save. **Its value equals the quality of its invariants, not the simulation.**

---

## §0 — AUTONOMY & INTERVENTION STANDARD (read first; governs the whole enactment)

**Posture.** This enactment runs under **AUTH-4** (see `AUTONOMOUS_RUN_PROTOCOL.md`): Opus keeps rolling, makes every call it
can from the spec + the pre-ratified defaults below, takes a **documented conservative default** where the spec is silent, and
continues. The L-SIM work is **unusually safe for autonomy** because the harness is test-infra running in a **sandbox** against a
**throwaway IndexedDB** — it ships nothing, touches no real save, and changes no production behavior. So **build and run the
harness, and triage its findings, autonomously.** The only firm brake is below.

**The HALT line (surface to JK; do NOT auto-proceed).** Building/running the sim is autonomous, but the moment the sim **finds a
bug**, fixing it may cross into production. HALT and surface (with a written proposal, do not fix) whenever an action would touch:
1. **Soul-layer engine behavior** — changing what a Phase-2 engine computes (fame/morale/traits/races/awards/managers/flashpoint/
   events) to fix a found bug. The fix is a design/SMB4-asset decision.
2. **Persistence / saved-data shape** — any schema, migration, store, backup, or trackerDb-version change.
3. **§16 magnitudes** — the sim **reports** tuning signal; it never **tunes**. Changing a placeholder magnitude is JK's design call.
4. **SMB4-asset-protected systems** — the `SESSION_RULES` approval-gated list (mojo, fitness, chemistry, fame, clutch, narrative…).
5. **Gospel / spec / design** edits.
6. **Genuine ambiguity not covered by a pre-ratified default below**, or anything the auditor flags as a judgment call.

Everything **below** that line — building the harness, the synthetic generator, the invariant checks, wiring the sandbox, fixing a
**mechanical harness bug** (a wrong import, a test-data shape mismatch, a tolerance typo) with **no production-code change** — runs to
verified-complete in the autonomous loop; JK sees the result, not the chain. **Over-halting is the safe direction; under-halting is a
bug to fix immediately.**

**Batched questions (the efficiency rule JK asked for).** When Opus genuinely needs JK:
- **Do not drip questions.** Accumulate every open question into **one batch** — a single `WAITING_ON_JK.md` block or one
  AskUserQuestion pass — phrased so a yes/no or one-line answer unblocks each.
- **Keep working.** Continue every step that does **not** depend on an open answer (other invariants, other run-matrix legs,
  reporting). Go fully idle only if nothing else is workable.
- **Classify, then mostly proceed.** When the sim surfaces a finding: **always log it** (per §10). If the fix is mechanical/wiring
  with **no behavior change** → fix it in the loop. If it touches anything on the HALT line → log it, mark it `HALT — JK FIX
  DECISION`, add it to the batch, and **continue the rest of the run** (a found bug does not stop the sim from surfacing more
  bugs, unless it's a CRITICAL coherence failure per §5, which stops that run-leg only).

**Labeling.** Every step labels **model + reasoning effort** (standing rule). Builder≠auditor holds: Codex builds the harness, Opus
audits; the **determinism meta-check (§5.5) + the preflight proof (§3)** give the harness its own correctness evidence so this stays
trustworthy even unattended.

### §0.1 — PRE-RATIFIED DEFAULTS (so Opus does NOT ask about these)

| Decision | Pre-ratified default | Only surface if… |
|---|---|---|
| Simulator **mode** (A/B/C/D) | Take the classification from `FRANCHISE_API_MAP.md`; prefer pure Node (A/B). Don't ask. | Pipeline is type **C** (React-cascade) → flag the slower 20–50-game ceiling, then proceed in C. |
| Doc naming (`FRANCHISE_API_MAP` vs existing `FRANCHISE_ENGINE_MAP`) | Produce/refresh `FRANCHISE_API_MAP.md` per the discovery skill; reconcile silently. | — |
| **Tolerances** | WAR/float recompute drift tolerance **±0.05**; document the exact value used. | A real bug would hide under the tolerance → tighten and note. |
| **Critical vs non-critical** | Use the skill's split, extended by §5 tags. | — |
| Synthetic-data realism | Deterministic, **seeded**, realistic-not-pathological; match the contract type **exactly**; vary optional fields across games. | The contract type can't be satisfied with realistic data → that's itself a finding. |
| **Run matrix** | Run the full §6 set (seasons × seeds × edge leagues × multi-season) without asking. | A leg can't be constructed from the real contract → log + skip that leg, continue. |
| Stop / checkpoint / resume | Stop a run-leg on a **CRITICAL** failure (don't run 162 games on corrupt state); checkpoint every 10 games; resumable. | — |
| **§16 magnitudes** | **Report distributions, never tune.** | Never tune autonomously — emit the signal (§9). |
| Sandbox vs real save | **Always sandbox** (throwaway IndexedDB / fake-indexeddb). Touch the real save **only** read-only, only for the §5.4 migration-against-real-export check, never write. | — |
| Flags | Flip **every** Phase-2 engine flag ON (enumerate from `franchisePhase2Flags.ts` at runtime — source of truth, don't hardcode). | A flag's ON-path throws at load → that's a finding, log + continue others. |

*(This standard is written to be promotable: once JK ratifies it, it can be lifted into `AUTONOMOUS_RUN_PROTOCOL.md` /
`AI_TEAM_OPERATING_MODEL.md` as a standing rule for all Codex-handoff loops, not just L-SIM.)*

---

## §1 — How this fits the existing skills (don't reinvent)

The skill chain, in order. **This spec is the soul-layer extension that rides on top of it.**

1. **`engine-discovery`** → `ENGINE_API_MAP.md` (GameTracker engine). Run if absent.
2. **`franchise-engine-discovery`** → `FRANCHISE_API_MAP.md` — the **pipeline classification (A/B/C/D)** + the **completed-game data
   contract** (the exact TS type) + fan-out topology + `test-utils/franchise-proof-of-life.ts`. **Refresh this first** — it's stale
   relative to L9–L12.
3. **`data-pipeline-tracer`** (optional but recommended) → `DATA_PIPELINE_TRACE_REPORT.md` — which pipelines actually work.
4. **`season-simulator`** → the harness + the **12 baseball-stats coherence checks** + `test-utils/season-simulator.ts` +
   `SEASON_SIMULATION_REPORT.md`.

**What THIS spec adds on top of the skill:** flags-force-ON (§3), the soul-layer synthetic inputs (§4), the **soul-layer invariant
suite** (§5), the run matrix (§6), the phased rollout (§7), and the §16 observability output (§9). The base skill's 12 stats checks
stay — they're the foundation; §5 is additive.

---

## §2 — Preconditions (a *meaningful* run needs these)

- **L12-5 committed at a clean boundary** (the L-stack race/award/All-Star layer is what most of §5.1/§5.3 validates).
- **The fame double-ladder collapse done** — races must read `resolveFameTier`, never the scalar `getFameTier`. Without it, §5.1
  fame/race checks validate the wrong ladder.
- **`FRANCHISE_API_MAP.md` refreshed** (current completed-game contract + mode).
- **`npm run build` exits 0**; characterized suite baseline known.
- **L13 (relationships):** its checks (§5.x) are included **iff** L13 has landed before the run. If not, the L13 leg is skipped and
  flagged — not blocking. (The L13 recon decides whether L13 must land before the comprehensive run; if relationships feed back into
  morale/development, prioritize L13 before Phase 4.)
- **Not required:** D12/D13, or the production flag-flip. The sim runs in a **sandbox with flags forced ON** — it is the evidence that
  *earns* the eventual real flip, so it must not wait on it.

---

## §3 — Architecture

- **Sandbox, never the real save.** Pure-Node legs use `fake-indexeddb`; any RTL leg uses a disposable in-memory store. The real
  user save is touched **only** read-only, **only** for the §5.4 migration-against-real-export check.
- **Flags FORCED ON.** Enumerate every Phase-2 engine flag from `franchisePhase2Flags.ts` and force them ON in the sandbox. **This is
  the single most important deviation from the base skill** — with flags off, the sim exercises the dark code paths that never fire,
  and proves nothing. (Current set includes L10/L11/L12/Traits/Checkpoint/Flashpoint/Fame — but read the file, don't trust this list.)
- **Drive the REAL pipeline.** Feed synthetic completed-games through the actual `processCompletedGame` entry point so every real
  Phase-2 **gate branch** fires (the L8b/L9b/L10/L11/L12 hooks). Do **not** call the soul engines in isolation — the whole point is
  the integrated per-game cascade.
- **Mode** per `FRANCHISE_API_MAP.md` (§0.1 default).
- **Preflight proof (mandatory, from the skill):** process **one** synthetic game flags-ON; confirm downstream stats **and**
  soul-layer state changed (fame moved, an event could fire, a morale delta applied). If not → document why and STOP; do not work
  around a broken pipeline.

---

## §4 — Synthetic generator: soul-layer extensions

The base skill's generator populates the box score. The soul systems read **more** — if these inputs are empty, the soul layer gets
no signal and the sim silently passes by doing nothing. Extend the generator to populate, from the **exact** contract type:

- **`playerWpaTotals`** (per-player WPA) — the memory-channel spine. Feeds fame (L6), `pitchingWpa` accumulation (L12-3R), and
  manager-WPA (MOY). Vary it: clutch performances, blowups, quiet games.
- **`pitchingWpa`** per pitcher (sum of per-game pitching WPA) — Reliever-of-Year race.
- **`valueDelta`** per player — drives manager ripples, designation eligibility (Albatross/FF), morale signals.
- **Personality + the 4 hidden modifiers** (Loyalty/Ambition/Resilience/Charisma) on every player — morale matrix tilts, trait
  acquisition, manager ripple, designations. (L1/L1.5 backfill must have run in setup.)
- **Morale-relevant context** — team-fan morale, player morale seeds — so flashpoint/dampener/designation effects have inputs.
- **Fielding events** (OF assists / baserunners held) + **injury events** — feed L9a-4 season tallies → trait signals
  (Cannon/Noodle/Durable/Injury-Prone).
- **Enrichment context** the trait candidate-builder replays (pressure/RISP/handedness where the contract carries it).

Vary optional fields across games (present in some, absent in others). Keep it **deterministic + seeded**. Match the contract type
**exactly** — if a field can't be filled realistically, that's a finding, not a license to invent.

---

## §5 — THE SOUL-LAYER INVARIANT SUITE (the crown jewel)

Run **after every game** (per-game), **at each checkpoint**, **at season-end**, plus the **persistence**, **determinism**, and
**cross-system** classes. Each invariant tags **[CRITICAL]** (stop the run-leg) or **[INVESTIGATE]** (log + continue), and names the
bug it catches. (These are the *additions* to the skill's 12 stats checks, which still run.)

### §5.1 — Per-game

**Fame (L6)**
- **[CRITICAL]** Every player's fame components are finite — no NaN/Infinity/undefined. *(catches: the F-137 ±Infinity class, in the
  fame engine.)*
- **[CRITICAL]** **Reach is monotonic non-decreasing** game-over-game (it ratchets). *(catches: a fame-reset/decay bug eroding the
  permanent floor.)*
- **[INVESTIGATE]** **Heat is fickle** — it both rises and falls across the season (a flat-line Heat means the recency spine isn't
  firing). *(catches: a dead recency-weight.)*
- **[INVESTIGATE]** WAR legitimacy floor holds: a player below the floor never holds a high fame tier. *(catches: fame outrunning
  legitimacy.)*
- **[CRITICAL]** Races read `resolveFameTier` (rank), never the scalar `getFameTier` label — assert no caller path hits the retired
  labels. *(catches: the double-ladder regression.)*

**Morale (L3) + flashpoint (L5b/L7a)**
- **[CRITICAL]** Player morale + fan morale finite and within bounds. *(catches: unbounded morale drift.)*
- **[INVESTIGATE]** Fan morale acts as a **directional dampener only** — its per-game effect magnitude stays inside the dampener band,
  never the sole driver of a swing. *(catches: fan morale promoted to a primary driver.)*
- **[CRITICAL]** **Flashpoint decay is compounding-but-CLAMPED** — the per-game fan-morale tax never exceeds the clamp; happy fans →
  zero tax; a held Albatross who stays **is** taxed. *(catches: an unclamped compounding tax cratering morale by mid-season.)*
- **[INVESTIGATE]** Morale deltas respect personality tilts (egotist < timid, loyal bigger, resilient smaller) deterministically.

**Designations (L7/DR)**
- **[CRITICAL]** Six slots per team (Captain/MVP/Ace/FF/Albatross/Fan Hopeful); each ≤1 holder or null. *(catches: duplicate/leaked
  designations.)*
- **[CRITICAL]** Albatross only on a **≥2×-min-salary, materially-overpaid, value-trusted** player (or null) — **never** a net-positive
  player. *(catches: the untrusted-value leak D7b closed regressing.)*
- **[INVESTIGATE]** Fan Favorite on the best **underpaid overperformer**.

**Random events (L10)**
- **[INVESTIGATE]** Event roll fires per-game (continuous cadence, post-Q5); base rates flat per-game. *(catches: a reverted
  20%-gate.)*
- **[INVESTIGATE]** High fan morale **suppresses** team/stadium events; personality-shift family excluded; trade_demand proposed-only.

**Managers (L11)**
- **[CRITICAL]** Auto-backstop firing fires **only** when team-fan morale < 25 **and** the deterministic roll < threshold; a
  successor is auto-generated; the fired tenure (date/reason) persists across the successor write. *(catches: spurious firings, or a
  lost fired-tenure.)*
- **[INVESTIGATE]** Manager ripple: net-positive players untouchable (0); else `|valueDelta|`-severity × personality tilt.

**Races (L12)**
- **[CRITICAL]** Per-game race recompute: no NaN; ranking matches the weighted composite (`wMerit·meritPct + wFame·famePct`), fame via
  `resolveFameTier` rank only. *(catches: race math corruption / wrong fame source.)*
- **[CRITICAL]** All 8 merit categories + the TV-family present; Bench = best totalWar among reserves; Booger = −fieldingWar;
  Reliever = pitchingWpa among **pure relievers** (`gamesStarted===0`) above the relief-IP floor. *(catches: category/eligibility
  drift.)*
- **[INVESTIGATE]** Close-race tilt: fame contributes **only** when `|marginToWinner| < tiltWindow` **and** both merit > floor.
- **[CRITICAL]** `pitchingWpa` accumulates; a no-WPA game stays **+0**, never NaN. *(catches: the live aggregator regressing.)*

**Per-write persistence (every game)**
- **[CRITICAL]** Every per-game soul-layer write is **idempotent** — replaying the same game writes **no** duplicate rows (deterministic
  ids hold). *(catches: double-writes that only surface as accumulated duplication.)*

### §5.2 — Per-checkpoint (every 20% of games)

- **[CRITICAL]** The checkpoint cadence fires **exactly 5× per season** (the 20% boundaries) — not 4, not 6. *(catches: an off-by-one
  boundary that mis-times all checkpoint development.)*
- **Ratings development (L8b):** **[CRITICAL]** overlays written are `pending`+`permanent`, correct franchise/season/team scope, a
  **valid rating key per player type**, deterministic id; **idempotent** on a replayed boundary. *(catches: invalid-key writes,
  dup overlays.)*
- **Trait grants (L9b):** **[CRITICAL]** the **2-slot cap** is never exceeded (no player holds >2 traits); displacement is **atomic**
  (one resolution per cycle); **no-offsetting-pair** (never a trait and its opposite simultaneously); the hysteresis dead-band holds
  (gain ≥0.75 / lose ≤0.35). **[INVESTIGATE]** re-evaluate-to-drop: held traits recompute P each cycle (nothing permanently sticky).
  *(catches: trait-slot corruption, contradictory pairs, stuck traits.)*
- **[INVESTIGATE]** Trait writes go through `saveFranchisePlayer` flat `trait1`/`trait2`, **not** `ratingsOverlayMerge` (which
  silently drops them). *(catches: the FINDING-149-class silent drop.)*

### §5.3 — Season-end (finalize)

- **[CRITICAL]** **True Value freezes** — the artifact's `frozen` flag sets; the anti-thaw guard holds; the frozen numbers lock and a
  post-freeze recompute is a no-op. *(catches: a thaw leak.)*
- **[CRITICAL]** **Awards finalize off the FROZEN artifact** — award trust requires `artifact.frozen===true`; MVP=totalWar, CY=pWAR,
  RoY, GG=fWAR+defensive-fame, SS=bWAR, MOY on the WPA truth-layer, + the TV-award family (Kara Kawaguchi / Bust / Comeback). An
  untrusted high-WAR row **cannot** win. *(catches: awards computed off unfrozen/untrusted value.)*
- **[CRITICAL]** **All-Star roster locks at 60%** of the season; once locked it is **never** recomputed. *(catches: a post-lock
  recompute mutating the roster.)*
- **[CRITICAL]** **Honor → reach-floor ratchet:** the whole selected team gets a permanent reach-floor bump, **starters/wildcard >
  reserves**; the `allStarSelections` career counter increments at the lock. *(catches: a missing/incorrect ratchet, or a
  starters-only bump.)*
- **[INVESTIGATE]** **Emission:** snub fires for the **close losers only** (smallest `marginToWinner` / the contested-slot near-miss),
  not everyone; the legacy positive nod is not double-counted.

### §5.4 — Persistence / migration / backup (the most dangerous class)

- **[CRITICAL]** **Migration-survival:** a pre-version sandbox franchise migrates cleanly across every trackerDb bump in the run — no
  data loss (prior stores/games/standings/value intact), all new dark stores present. *(catches: a migration that drops data.)*
- **[CRITICAL]** **Backup round-trip parity:** backup → wipe → restore reproduces every store **byte-identical**, including the new
  dark stores; the `franchiseSeasonLedgerStorage` store-list PIN is correct; `KBL_BACKUP_VERSION` is right. *(catches: silent
  store-drop on export/restore — the D2/backupRestore class.)*
- **[CRITICAL]** **Run the migration check against a REAL exported save** (read-only): export the actual franchise, run migration +
  round-trip on the copy. This converts the scariest, costliest-to-discover-live risk into an automated check. *(catches: real-save
  shape surprises the synthetic data misses.)*

### §5.5 — Determinism meta-check (powerful + cheap)

- **[CRITICAL]** **Same seed → byte-identical season.** Run an identical seed twice; assert identical end-state across **all** stores.
  Every soul system is FNV-1a-seeded deterministic, so any divergence is a hidden nondeterminism (a `Date.now`/`Math.random` leak, an
  ordering bug). *(catches: nondeterminism that makes everything else untrustworthy — also validates the harness itself.)*

### §5.6 — Cross-system double-count guards

- **[INVESTIGATE]** **Fan Favorite** value-half (D6/DR-1) and morale-half (L7b/L7c) don't double-count.
- **[INVESTIGATE]** **Albatross** flashpoint tax (L5b) vs steady sentiment (**must be 0** in L7c — flashpoint owns it) — not both.
- **[INVESTIGATE]** **Captain** charisma routing (×2) routes the **morale** channel only — never ratings/development or the §24.9
  leadership composite.
- **[CRITICAL]** **Channel separation:** the **WPA** memory-channel (→ Fame) and the **WAR** value-channel (→ True Value → economy)
  never cross-contaminate. *(catches: a fame input leaking into salary or vice-versa.)*
- **[CRITICAL]** **True Value is anchored to the fixed draft-IV baseline and never re-baselines** — across **multiple seasons** in one
  franchise, the baseline does not drift. *(catches: a re-baseline that silently re-prices the economy.)*

---

## §6 — Run matrix

Run all of these; each is a separate seeded leg (§0.1 lets Opus run them without asking).

- **Full seasons × multiple seeds** — the baseline accumulated-state stress.
- **Edge leagues:**
  - **Tiny (4-team)** — stresses the **sparse-signal `getPercentile`** finding already flagged for this gate (small pools → unstable
    percentiles → fame/trait/race instability).
  - **Reliever-heavy / pitcher-skewed** — stresses Reliever-of-Year eligibility + the pure-reliever filter.
  - **Injury-heavy** — stresses the injury accumulator → Durable/Injury-Prone traits + roster churn.
  - **Blowout/extreme-WPA** — stresses fame Heat swings, flashpoint, large-stat accumulation.
  - **Parity / everyone-close** — stresses the race close-tilt window and award margins.
- **Multi-season continuity (2–3 consecutive seasons, one franchise)** — the deepest test: fame **Reach** ratcheting across seasons,
  **True Value fixed-baseline non-drift** (§5.6), trait accumulation + re-evaluate-to-drop, manager tenure history, relationship
  persistence, and migration across season boundaries.

---

## §7 — Phased rollout (shift bug-discovery left)

- **Phase 0 — Discovery refresh.** `franchise-engine-discovery` → current `FRANCHISE_API_MAP.md`; preflight proof (flags ON).
- **Phase 1 — Partial run NOW** (before L12-5 fully lands). Build the harness + the skill's 12 stats checks + the §5 checks **for what
  is already built** (D-stack + L1–L12-3, current flags). Run it. **Early signal on the fame/morale/traits/events/managers core** —
  this is the fastest path to "how reliable has the work been," and it surfaces accumulated-state bugs while there's still cheap time
  to fix them.
- **Phase 2 — Full L12** (after L12-5 + the fame collapse). Add §5.1/§5.3 All-Star/emission/reach-floor checks; run the full matrix.
- **Phase 3 — +L13** (if relationships have landed). Add the relationship-edge checks.
- **Phase 4 — Pre-flip clearance.** Full matrix green (or all reds triaged + JK-dispositioned) → **this is the evidence that earns the
  production flag-flip.** Pairs with D12/D13 and the shrunk browser batch.

---

## §8 — Coverage boundaries (what stays on JK's iPad list)

The sim owns the **engine / state / persistence / coherence** middle. It does **not** catch, and these stay human:
- **Capture UI** — whether the real input surfaces write correctly (the sim injects results **downstream** of them): the GameTracker
  at-bat flow, the EnrichmentPanel pitch-location buttons, lineup drag-drop, League-Builder forms, the snake-draft board. *(Optionally
  push most of these off the manual list with the `user-journey-verifier` Playwright skill — except iPad-Safari device specifics.)*
- **Visual rendering / feel** — badges, strips, panels rendering on-palette and uncluttered; copy reading right.
- **Timing/async** in the live React runtime; **iPad/touch/PWA** specifics.
- **Balance / "does it feel right"** — that's the separate **§16 tuning** pass, not a bug.

So after a green sim, the iPad list collapses to the capture-UI checks + a visual/feel pass + the final flag-flip-on-real-save sanity.

---

## §9 — §16 tuning observability (report, never tune)

The sim is also the **tuning instrument** — but it only **emits signal**; JK tunes. Each run emits **distributions** alongside the
pass/fail report:
- Fame-tier distribution (how many players land in each of the 9 tiers; is it sane or degenerate?).
- Trait grant/loss counts per season (are traits emerging at a believable rate, or never/constantly?).
- Award margins (are races close or runaways?).
- Random-event frequency per family (matches the intended per-game base rates?).
- Morale ranges + firing rate (are auto-backstop firings rare-but-present, or never/constant?).
- Flashpoint tax magnitudes (within the clamp, and is it doing anything?).

These feed the separate **§16 sim-tuning playbook**. **Opus reports them; it does not change magnitudes** (HALT line §0).

---

## §10 — Output artifacts + findings mapping

- `spec-docs/SEASON_SIMULATION_REPORT.md` — the report (skill format, **extended** with a Soul-Layer Invariants section + the §9
  distributions). Pass-rate over time, failures-by-type, drift analysis, edge-case results, the §9 distributions.
- `test-utils/season-simulator.ts` (+ the soul-layer check modules) — the executable, resumable harness.
- `test-utils/season-results/` — checkpoints + raw data.
- **Findings:** route per `SESSION_RULES` — one-line index in `AUDIT_LOG.md`, full text in `FINDINGS_*.md`. **CRITICAL** → stop the
  run-leg + finding; **INVESTIGATE** → log + drift analysis. Each finding tagged for triage: **mechanical/wiring (auto-fixable in the
  loop)** vs **HALT — JK FIX DECISION** (soul-layer behavior / persistence / §16 / SMB4-asset). Update `SESSION_LOG.md` + the live
  header at session end.

---

## §11 — Build sequencing (Codex-executable)

Each step is a contract per `PROMPT_CONTRACTS.md` (builder≠auditor, reasoning effort labeled twice). Opus writes the contracts; Codex
builds; Opus audits.

1. **ROUTE: Claude Code CLI | opus** — refresh `franchise-engine-discovery` → current `FRANCHISE_API_MAP.md`; confirm mode + the
   completed-game contract; capture one real game's output shape as the synthetic template.
2. **ROUTE: Codex | 5.5 | very high** — flags-force-ON sandbox harness + the §4 soul-layer synthetic generator + the preflight proof.
3. **ROUTE: Codex | 5.5 | very high** — the §5 invariant modules (per-game / checkpoint / season-end / persistence / determinism /
   cross-system) wired into the per-game loop, + the §9 distribution emitters.
4. **ROUTE: Claude Code CLI | opus** — Phase 1 partial run against the built systems; triage findings per §0/§10; batch any JK
   questions.
5. **ROUTE: Codex | 5.5 | high** — extend for Phase 2/3 as L12-5/L13 land; rerun the full §6 matrix.

---

## §12 — Anti-hallucination & discipline

- The base-skill rules apply (don't assume Mode A; match the contract type exactly; never skip checks to save time; stop on CRITICAL;
  report the exact games-simulated count; sandbox data only).
- **Flags-ON or the results are meaningless** — never report a clean run done with flags off.
- **The sandbox never writes the real save.**
- **Don't claim coverage you didn't check** — an invariant not implemented is reported as a gap, not assumed green.
- **† signatures in `FRANCHISE_API_MAP.md` are UNVERIFIED — re-read from code before use.** Any function signature marked **†** in
  §4 of the map was inferred from cataloging, not direct-read; the harness build/audit MUST re-read that signature from the engine
  source at the moment of use and never trust the map's version — a wrong † signature sends the builder down a hallucinated path.
  State this explicitly in every build/audit dispatch contract. (Reinforces the §4 HARNESS-BUILD RULE.)
- **The autonomy standard (§0) never loosens the HALT line** — autonomy is "don't ask what's pre-decided + batch real questions," not
  "decide design/behavior/persistence/§16 without JK."
- Every step labels model + reasoning effort.
