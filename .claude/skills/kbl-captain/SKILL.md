---
name: kbl-captain
description: Run or resume the KBL Tracker AUTH-4 unattended Captain build loop — the Codex-builds / Opus-audits / commit-branch-only autonomous loop across the Mode-1 (auction+prospect) and Mode-2 (L-stack) tracks. Trigger on "run the AUTH-4 captain loop", "resume the autonomous build run", "pick up from HANDOFF_NEEDED", "keep the loop rolling", "be the captain", or when a fresh session must continue an overnight AUTH-4 run. Encodes the operational mechanics (Codex exec dispatch, audit-the-diff, the gate, the two-worktree topology, the baton-claim) that the spec docs alone don't convey.
---

# kbl-captain — AUTH-4 Captain Build Loop

You are the **Captain (Opus 4.8)** running/resuming an **AUTH-4 unattended autonomous build run**.
You drive a build→audit→commit loop: **YOU write contracts + audit + gate + commit + log; CODEX
builds.** Follow this exactly. Do NOT ask for permission — AUTH-4 is the standing go. The CURRENT
resume point + queue live in `spec-docs/AUTONOMOUS_RUN_LOG.md` + `HANDOFF_NEEDED`, NOT in this file
(this file is the evergreen procedure).

## STEP 0 — CLAIM THE BATON (first, before anything)
The handoff auto-spawns a session AND a human may invoke one → **two workers can race the same
ticket on one branch** (the #1 prior failure).
1. If `HANDOFF_NEEDED` exists at repo root: READ it, then claim it —
   `mv HANDOFF_NEEDED HANDOFF_DONE_$(date -u +%Y%m%dT%H%M%SZ)`. A second worker finding no
   `HANDOFF_NEEDED` stands down.
2. Confirm sole worker: `pgrep -lf "codex exec"` + check other `claude` procs. Another worker on
   `codex/franchise-v1-next` or `codex/mode1-v1` → STOP and coordinate (one worker per branch).

## STEP 1 — ORIENT (read; never trust summaries)
Read in order: `spec-docs/AUTONOMOUS_RUN_LOG.md` (THE live ledger — every ticket, gate, queue,
OPEN-DECISION) · `spec-docs/CURRENT_STATE.md` live header · `spec-docs/AUTONOMOUS_RUN_PROTOCOL.md`
(authorizations + the 4 safety walls) · `spec-docs/SESSION_RULES.md`. Restate phase/last/next, then PROCEED.

## STEP 2 — AUTH-4 AUTHORIZATION
Keep rolling; make EVERY call (engineering + spec-bounded design, incl. soul-layer) by building to
the ratified spec + rulings, taking a DOCUMENTED conservative default where the spec is silent, and
CONTINUING. Never stop for the user; log design calls/defaults as **OPEN-DECISIONS** in the ledger.
**Only pause = SET-ASIDE-AND-CONTINUE** on a safety wall: (a) golden/oracle byte-change or
frozen-value-oracle touch · (b) data-corruption / migration / saved-shape risk · (c) a regression
outside the characterized set that 2 fix-iters can't clear · (d) a BLOCKED verdict the fix-loop can't
clear in 2 tries → log it, set the ticket aside, pick up the next independent ticket.
**Soul-layer no-inference:** a soul/award/value metric's *measurement* comes from the spec VERBATIM;
silent/ambiguous → documented default + flag; never infer from current code behavior.

## STEP 3 — THE PER-TICKET LOOP
**A. CONTRACT** → append to `spec-docs/PROMPT_CONTRACTS.md`, wrapped in markers
`<!-- ===== CONTRACT: <ID> ===== -->` … `<!-- ===== END CONTRACT: <ID> ===== -->`. Use the template
(ROUTE/ROLE/GOAL/SOURCE OF TRUTH [spec § + file:line]/CONSTRAINTS [exact files; FROZEN oracle =
read-only; branch-only, do NOT commit/push]/EXPECTED OUTPUT/VERIFICATION/FORMAT/FAILURE PROTOCOL
[STOP-IF] + "Use <high|xhigh> reasoning effort"). **GROUND ANCHORS FROM SOURCE FIRST** (re-read every
file:line; never trust a map/recon blindly). State the make-or-break.

**B. DISPATCH to Codex** (the builder — cross-model decorrelation; NOT a subagent). Bash
`run_in_background: true` + `dangerouslyDisableSandbox: true`:
```
sed -n '/<!-- ===== CONTRACT: <ID> /,/<!-- ===== END CONTRACT: <ID> /p' \
  /Users/johnkruse/Projects/kbl-tracker/spec-docs/PROMPT_CONTRACTS.md \
| NODE_ENV= ~/.local/bin/codex exec -C <worktree-abs> --skip-git-repo-check -s workspace-write \
  -c model_reasoning_effort=<high|xhigh> -o /tmp/codex-<id>.out - ; echo "EXIT=$?"
```
- ⚠ `model_reasoning_effort` ∈ `none|minimal|low|medium|high|xhigh`. **`very-high` is INVALID (400) —
  Codex never runs, the bg task "completes" with ZERO file changes.** Always check the output for ERROR/400.
- Pipe the contract via stdin (`-`). Never duplicate the contract into a temp file. macOS has no
  `timeout`; rely on `run_in_background` + a long fallback wakeup (don't busy-poll).

**C. AUDIT (you, builder≠auditor)** on completion: **READ THE ACTUAL DIFF** (`git -C <worktree>
--no-pager diff` + cat new files) — NEVER trust the Codex paste. Verify only contracted files changed;
the make-or-break holds; frozen oracle / protected files untouched (`git diff --stat <oracle>` empty);
a correct Codex STOP-IF (BLOCK) is GOOD → fix the contract + re-dispatch (max 2 fix-iters, else SET-ASIDE).

**D. GATE** → `NODE_ENV= npm --prefix <worktree> run build` exit 0. Tests: **FULL suite**
(`NODE_ENV= npm --prefix <worktree> test`) for anything wiring into `processCompletedGame` / adding a
store / touching a core engine (transitive-import-mock-break risk — scoped runs MISS it; fix = a
test-only mock stub); **build + the affected test file** for pure/isolated/build-dark tickets. **READ
THE VITEST SUMMARY (failed-file list), NOT the exit code** (characterized fails make RC nonzero).
Confirm **ZERO NEW REDS** vs the characterized baseline (current count in CURRENT_STATE/ledger; the
hard fail is `wpaRuntimeBoundary` + intermittent solo-passing order-flakes).

**E. COMMIT** branch-only (**NEVER push**), staged **by path** (leave concurrent-session docs + junk
untouched), trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

**F. LOG** to `spec-docs/AUTONOMOUS_RUN_LOG.md` (a `**WAVE N:**` bullet): status + hash + change +
gate result + any OPEN-DECISION-for-JK.

**G. DISPATCH the next queue ticket.** End the turn with a bg task in flight so you're re-invoked.

## STEP 4 — TOPOLOGY (Shape A — single Captain, two worktrees)
- **main** `/Users/johnkruse/Projects/kbl-tracker` on `codex/franchise-v1-next` = integration line +
  Mode-2 (L-stack) + ALL Captain docs.
- **worktree** `/Users/johnkruse/Projects/kbl-mode1` on `codex/mode1-v1` = Mode-1 (auction + prospect);
  it has its OWN `node_modules` (`npm install` once). Create with `git worktree add -b codex/mode1-v1
  /Users/johnkruse/Projects/kbl-mode1 <base>` if missing.
- ONE Codex build per worktree at a time. A Codex build in one worktree may overlap an L-SIM run in
  the other (Codex is API-bound), but **SERIALIZE heavy vitest suites** (two concurrent → timeout-flakes).

## STEP 5 — L-SIM (the Mode-2 gate — YOU run it, NOT Codex; Codex STALLS on it)
Smoke 24g: `NODE_ENV= npx vitest run -c test-utils/lsim/smoke.config.ts`. Season 60g:
`… season.config.ts`. **Run the STANDARD 60g leg LAST** (it regenerates
`test-utils/lsim/results/lsim-h2-baseline-*.json` — after it, `git diff` them: **byte-identical = the
new layer is dormant (the proof); any change = a finding**). **Read the summary JSON** (findings,
`sameSeedByteIdentical`), NOT the vitest RC. CRITICAL findings block; INVESTIGATE = log + continue.

## STEP 6 — HANDOFF (when context nears the limit)
1. Finish the in-flight ticket to a **CLEAN seam** (commit it) — never hand off with a Codex build
   mid-flight. 2. Update CURRENT_STATE live header + the ledger; commit. 3. Write a fresh
   `HANDOFF_NEEDED` (next_ticket / branch / resume_note — the resume_note must carry the dispatch
   mechanics + the live-ledger pointer). 4. **STOP** — no new work; do NOT reschedule a wakeup that
   would pull this saturated session back (it collides with the fresh session claiming the baton).

## Pre-flight (a fresh session needs all of these or it will stall regardless)
AUTH-4 authorized for this session · Bash with `run_in_background` + `dangerouslyDisableSandbox` ·
`~/.local/bin/codex` present · `caffeinate` holding the Mac awake for an overnight run.
