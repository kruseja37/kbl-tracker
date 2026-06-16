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
- **Browser sign-off remains JK's, BATCHED.** Tickets are "verified-complete, browser-pending," never "closed."

## Hard halt-and-log triggers (set the ticket aside, log it, move to the next INDEPENDENT ticket)

- A golden/oracle byte change or any **frozen-value-oracle** touch.
- A **test regression outside the characterized set** (baseline 7,230/3) I can't mechanically resolve.
- **Two failed fix iterations** on one ticket.
- An auditor verdict of **BLOCKED**, or a "judgment call" the spec doesn't settle.
- A genuine **NEW product/design question** the spec + rulings don't answer (distinct from an asset-silent choice,
  which AUTH-2 lets me default + document).

## Safety rails

- Branch `codex/franchise-v1-next` ONLY. Commit, never push. Co-author trailer on every commit.
- CLI verification prefixes `NODE_ENV= `; node at `~/.nvm/versions/node/v20.20.0/bin`.
- Each ticket gates on: **tsc 0 + build 0 + suite within the characterized baseline** (7,230 / 3 known fails) before commit.
- Serialize tickets touching the same store/engine/UI surface; parallelize only disjoint ones (operating-model Parallel rule).
- **Write-First:** every contract → `PROMPT_CONTRACTS.md`; every decision/open-end → `AUTONOMOUS_RUN_LOG.md`. Durable
  state on disk so a context compaction cannot lose the thread (and a fresh session can resume from these files).

## Queue (this run)

- **Mechanical-first (build → audit → auto-commit):** D2 (backup parity + all-DB guard) · L9a (trait capture fields,
  additive) · L1 (hidden-modifier rename + persist) · L1.5 (Captain assignment at league finalization) · D1 (the
  `DEFAULT_TOTAL_GAMES=162` WAR-scaling hardcode).
- **Value-sensitive (build + audit, DO NOT auto-commit — leave for JK):** L-ECON1 (re-prices the frozen draft-IV
  anchor the value spine measures against).
- **Then under AUTH-2:** L2 (mutable layer) · L4a (reporter base-connect + publish bus, SEA-3 applied). Contract-draft
  the design-heavy tier (L3 / L5 / L6 / …) for JK review; build as spec coverage allows, documenting every open end.

## On return, JK reads

`AUTONOMOUS_RUN_LOG.md` (what built, what committed, what's set-aside + the open decisions) → reviews the commit
history (`git log`) → does the batched browser pass on the persistence-prioritized backlog.
