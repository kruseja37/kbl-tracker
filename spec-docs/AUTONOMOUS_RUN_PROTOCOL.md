# AUTONOMOUS RUN PROTOCOL — KBL L-stack / D-stack build

**Created:** 2026-06-16 · **Authorizes:** a multi-hour unattended Captain-driven build → audit → commit run.
Supplements `AI_TEAM_OPERATING_MODEL.md` + `SESSION_RULES.md`; the stricter verification/documentation rule
always wins. JK is away; the run is autonomous within the authorizations below.

## The loop (NO human relay)

1. **Captain (Opus 4.8) drafts the ticket contract** in `PROMPT_CONTRACTS.md` (route, reasoning effort, allowed
   files, forbidden files, source-of-truth ref, verification command, stop conditions — the operating-model template).
2. **Captain invokes Codex directly:**
   `~/.local/bin/codex exec --skip-git-repo-check -s workspace-write -c model_reasoning_effort=<high|very high> -o <out> - < <promptfile>`
   as a background bash task (harness sandbox disabled for that one call). Codex edits the repo. No copy/paste.
3. **Codex reports** every changed `git status` path + its focused verification.
4. **Captain (Opus) audits the diff directly** — contract vs diff vs tests vs source-of-truth; tries to disprove;
   emits the `VERDICT: VERIFIED | NOT VERIFIED | BLOCKED` block. Builder = Codex, auditor = Opus, the Captain did
   not implement it → **triangle intact, no relay needed** (this is the proven T4→T10 / §18 pattern).
5. **NOT VERIFIED** → amend contract, re-invoke Codex (**max 2 fix iterations**, then halt-and-log).
   **VERIFIED** → commit (branch only, **NEVER push**) → next ticket.

## Authorizations (JK, 2026-06-16)

- **AUTH-1 — Auto-commit ALL verified-complete tickets** on `codex/franchise-v1-next`. Commit, **never push**.
- **AUTH-2 — Build to the ratified spec for the SMB4-asset systems** (morale / fame / traits / narrative / etc.).
  Where the spec is **silent or ambiguous** on an asset-level choice, the Captain may make a **conservative choice,
  DOCUMENT it, and continue** — OR set the ticket aside and document the open decision. Either is fine **provided
  every open end is logged** in `AUTONOMOUS_RUN_LOG.md`. (This softens the SMB4 Asset Protection halt: no halt for
  a spec-silent choice, just a documented conservative default.)
- **AUTH-3 — SEA-3 resolved:** `SeasonNewsItem` store for season news; reuse `rivalryScores` for §24 edges.
- **AUTH-4 (JK 2026-06-16) — UNATTENDED / OVERNIGHT MODE: keep rolling, NEVER stop the run for JK.** Standing
  authorization for an unattended/overnight run with no JK oversight. The Captain makes **EVERY call** — engineering
  AND spec-bounded **DESIGN**, including the **soul-layer engines** (L3 morale matrix · L5 fan teeth · L6 fame · L7
  designation effects · L8 ratings dev · L9b traits · L10–L14) and value-design forks (e.g. D6 lock-timing) — by
  building to the **ratified living-season spec + the ~50 rulings**, taking a **documented conservative default**
  wherever the spec is silent, and **CONTINUING to the next ticket**. **This directive SUPERSEDES, for the
  overnight run, the per-change SMB4-Asset-Protection gate AND the "build to spec" greenlight requirement** — the
  Captain's spec-bounded recommendations are pre-accepted, subject to JK's morning review. Every design call +
  default is logged to `AUTONOMOUS_RUN_LOG.md` (DEFAULTS-TAKEN + OPEN DECISIONS) for review; **rework is the
  accepted cost of momentum** (magnitudes are sim-tuned placeholders → design risk is bounded + reversible). The
  Captain leans HARD on the spec, documents the rationale + the points most likely to need JK adjustment (so the
  morning review is fast), and **does NOT stop the run to ask JK anything.**
- **Browser sign-off remains JK's, BATCHED.** Tickets are "verified-complete, browser-pending," never "closed."

## SET-ASIDE-AND-CONTINUE triggers (the RUN never stops — one ticket is skipped, the loop moves to the next)

Under AUTH-4 the run **never halts for JK**. Design/judgment forks are **made + documented + continued** (NOT a
stop). The only thing that pauses an INDIVIDUAL ticket is a genuine **SAFETY wall** that can't be reworked away —
and even then the **LOOP continues to the next independent ticket** (it never stops, never waits for JK):
- A golden/oracle BYTE change or any **frozen-value-oracle** touch. (This catches **L-ECON1**'s frozen-draft-IV
  re-price → SET ASIDE.)
- A **data-corruption / migration / saved-shape risk** the parity-guard or a round-trip test flags.
- A **test regression outside the characterized set** that **2 fix-iterations** can't resolve (runaway guard).
- An auditor verdict of **BLOCKED** (a real defect) the fix-loop can't clear in 2 tries.

On any of these: write the ticket + the wall to `AUTONOMOUS_RUN_LOG.md` OPEN DECISIONS, **set it aside, pick up the
next independent ticket.** **Deliberate asymmetry:** design calls are CHEAP to rework (make + document + continue);
SAFETY walls are NOT (a corrupted artifact / silent data loss costs more than a night) — so audit
persistence/oracle/data-shape tickets HARDEST, and when genuinely unsure on a safety wall, SET ASIDE (protect the
codebase) rather than push. Every ticket still gates on tsc 0 + build 0 + the characterized suite baseline before commit.

## Safety rails

- Branch `codex/franchise-v1-next` ONLY. Commit, never push. Co-author trailer on every commit.
- CLI verification prefixes `NODE_ENV= `; node at `~/.nvm/versions/node/v20.20.0/bin`.
- Each ticket gates on: **tsc 0 + build 0 + suite within the characterized baseline** (now **7,254 / 3 known fails**; trackerDb v17) before commit.
- Serialize tickets touching the same store/engine/UI surface; parallelize only disjoint ones (operating-model Parallel rule).
- **Write-First:** every contract → `PROMPT_CONTRACTS.md`; every decision/open-end → `AUTONOMOUS_RUN_LOG.md`. Durable
  state on disk so a context compaction cannot lose the thread (and a fresh session can resume from these files).

## Queue (overnight pickup — build to spec, document, keep rolling under AUTH-4)

**DONE this run (committed `codex/franchise-v1-next`):** L1 · D1 · D2 · L1.5+OD-1 · L4a-connect · L4a-bus · D6a ·
D5 (confirm-only). Suite 7,254 / 3 characterized fails; trackerDb v17.

**NEXT, in order — finish the D-stack value spine to Playable-V1, then build the soul layer:**
1. **D6b** — season-end FREEZE of the trusted-value artifact (D6a built the live half; lock at the last
   regular-season game → deterministic D8/D9). Freezes the artifact, NOT the base-IV oracle (so not a safety wall).
2. **D7** — designations LIVE: reconcile the dual designation path (persisted canonical, upgraded `active` +
   events; eligibility = ranking input), promote TEAM_MVP/ACE to non-'Proj.', **ADD Albatross** (D6 unblocks it),
   emit `DesignationEvent` with **NO morale mutation** (regression gate). Fan Favorite stays Phase-2 (needs L5).
3. **D8** — award-trust gate: consume D6's frozen artifact; `trustedForAwards`/`finalWarTrusted` → computed;
   adaptive thresholds; deterministic stored winners.
4. **D9** — real awards: `franchiseAwardsEngine`/`Storage` (6 categories incl. **MOY per MOY-1..7**); build with
   the **LSD-1 fame-ready SEAMS** (per-award margins · fWAR/total-WAR split on GG · pluggable vote-weight ·
   reserved KK/Bust/Comeback slots + the TV-snapshot store) so the Phase-2 fame layer is additive.
5. **D10–D13** — Mode-2 handoff (w/ awards+designations) · live-label sweep · iPad smoke · sign-off.
6. **THE SOUL LAYER (AUTH-4-greenlit — build to the ratified living-season spec; document each design call +
   placeholder magnitude in `AUTONOMOUS_RUN_LOG.md`):** L3 master morale matrix → L4b season takes → L5 fan teeth →
   L6 fame → L7 designation effects (incl. Fan Favorite) → L8 ratings dev → L9a captures → L9b trait engine →
   L10 random events → L11 managers → L12 races/All-Star/awards-fame → L13 relationships → L14 rebrand → the
   **L-SIM gate**. **L2** (mutable layer) lands as soon as its first consumer (L8/L9b) needs it (no longer
   premature). Take the **OD-3/4/5** leans (async confirmation · cascade reporter scope · manual capture) +
   continue.
7. **SET ASIDE (the one safety wall):** **L-ECON1** (re-prices the frozen draft-IV anchor → oracle touch) +
   **F-144** (golden-diff) — leave for JK; OD-2 documented.

The **D4 scope snag** is documented (the salary chips sit on the combined value-preview panel); take the
conservative call (de-gate the salary-specific chip, keep the value-preview labels until D6/D7) + continue, OR
leave it for the browser session — either is fine under AUTH-4, just log it.

## Loop continuity (overnight — keep the loop alive)

The run must **self-sustain** with no JK input: after each ticket commits (or is set aside), **immediately
map/contract/dispatch the NEXT queue item** — do not end a turn waiting for JK or pausing "for now." There is a
standing Queue + AUTH-4, so there is always a next ticket. The natural drive is: contract → dispatch Codex
(background) → on completion notification, audit → commit-or-fix → dispatch the next. The run ENDS only when (a)
the Queue is exhausted (D-stack + the soul layer + the L-SIM gate all done), or (b) every remaining ticket is
set-aside on a safety wall. At that point write a final `AUTONOMOUS_RUN_LOG.md` summary and stop. **Mechanism
(proven this run):** `~/.local/bin/codex exec -C <repo> --skip-git-repo-check -s workspace-write -c
model_reasoning_effort=high -o <out> - < <promptfile>` as a background bash task with the harness sandbox disabled
for that call; audit by reading the diff + re-running tsc/tests yourself (never trust the builder paste); commit
with the co-author trailer; never push. Write-First everything so a mid-run compaction or a fresh thread resumes
cleanly.

## On return, JK reads

`AUTONOMOUS_RUN_LOG.md` (what built, what committed, what's set-aside + the open decisions) → reviews the commit
history (`git log`) → does the batched browser pass on the persistence-prioritized backlog.
