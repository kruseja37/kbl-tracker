## Project Root & Key Paths
- Project root: /Users/johnkruse/Projects/kbl-tracker
- Active GameTracker: src/src_figma/app/pages/GameTracker.tsx
- Active state hook: src/src_figma/hooks/useGameState.ts
- Inactive (never route here): src/components/GameTracker/index.tsx
- Spec docs: spec-docs/
- Shared AI team protocol: spec-docs/AI_TEAM_OPERATING_MODEL.md
- Codex bridge instructions: AGENTS.md
- Codex repo skills: .agents/skills/ (derived COPY mirror of .claude/skills/ + spec-docs/skills/; never edit by hand — run scripts/sync-codex-skills.sh)
- Codex MCP config: .codex/config.toml
- Always work on main unless JK says otherwise

## Critical Architecture Facts (Phase 0 Confirmed)
- App.tsx routes GameTracker to src/src_figma/app/pages/GameTracker.tsx ONLY
- src/components/GameTracker/index.tsx is NOT routed — do not treat as active
- useGameState.ts (~12,585 lines) is the active state system — not deprecated
- useGamePersistence.ts is wired to the inactive path only
- 718 useState calls in src/src_figma + src/components/GameTracker/

---

# Project Instructions for Claude Code

## Session Start Protocol
**BEFORE doing any work on KBL Tracker, READ these files in order via the Read
tool on exact paths — do NOT rely on compaction/summaries.** This is the single
canonical startup ritual for EVERY runtime (Claude Code, Codex, Claude chat).
It must stay identical to the one in `spec-docs/SESSION_RULES.md`:
1. `spec-docs/SESSION_RULES.md` — non-negotiable rules, roles, the triangle
2. `spec-docs/AUDIT_LOG.md` — where we are in the audit (index for findings 056+)
3. `spec-docs/AUDIT_PLAN.md` — what we're auditing and how
4. `spec-docs/SESSION_LOG.md` — last session's work (read from the end if large)
5. `spec-docs/CURRENT_STATE.md` — LIVE HEADER: phase / last done / next action

After reading, RESTATE: current phase, what was last completed, and the next
action. WAIT for JK to confirm or correct before any work starts.

(Roles, routing, and build/audit loops live in
`spec-docs/AI_TEAM_OPERATING_MODEL.md`. Full-history arc log lives in
`spec-docs/CURRENT_STATE_HISTORY.md`.)

---

## Architecture: Shared-Source with Figma UI Layer

**CRITICAL**: The app has a SHARED architecture. Both `src/` and `src/src_figma/` are actively used:

- `@` alias resolves to `src/src_figma/` (configured in vite.config.ts + tsconfig.app.json)
- `src/src_figma/` is the **UI layer** — pages, components, React hooks
- `src/engines/`, `src/utils/`, `src/types/` are the **core logic layer** — imported by src_figma via relative paths
- `src/src_figma/app/engines/` contains **integration wrappers** that adapt base engines for the UI

**Import chain**: UI Component → Figma Hook → Base Engine + Base Storage

```
src/src_figma/app/pages/GameTracker.tsx
  → imports useGameState from @/hooks/useGameState (src/src_figma/hooks/)
    → imports leverageCalculator from ../../engines/ (src/engines/)
    → imports gameStorage from ../utils/ (src/src_figma/utils/)
```

## Project Structure

```
kbl-tracker/
├── src/
│   ├── App.tsx                  # Root router — ALL routes import from src_figma/
│   ├── main.tsx                 # Vite entry point
│   ├── src_figma/               # 🎨 UI LAYER — all React rendering
│   │   ├── app/
│   │   │   ├── pages/           # 16 page components (routed in App.tsx)
│   │   │   ├── components/      # ~49 components (modals, flows, overlays)
│   │   │   ├── engines/         # 15 integration wrappers (adapt base engines for UI)
│   │   │   ├── hooks/           # 8 app-level hooks
│   │   │   └── types/           # App-level type definitions
│   │   ├── hooks/               # core UI hooks (useGameState: ~12,585 lines)
│   │   └── utils/               # 3 Figma-specific utils
│   ├── engines/                 # ⚙️ CORE: 36 calculation engines (WAR, mojo, salary, etc.)
│   │   └── __tests__/           # Engine unit tests
│   ├── utils/                   # 💾 CORE: 38 storage + utility modules (IndexedDB layer)
│   ├── hooks/                   # 🪝 16 shared hooks (WAR, stats, aging, morale)
│   ├── types/                   # 📋 4 shared type files (game.ts, franchise.ts, war.ts, index.ts)
│   ├── context/                 # AppContext.tsx + appStateStorage.ts
│   ├── components/              # 7 active items (GameTracker/ + 6 shared components)
│   │   └── GameTracker/         # 31 files — core game tracking UI
│   ├── tests/                   # 3 test files (logic matrix, state machine)
│   ├── archived-*/              # Dead code preserved for reference (NOT imported)
│   └── pages/                   # Only NotFound.tsx is routed
├── spec-docs/                   # Living documentation (SOURCE OF TRUTH)
│   ├── CURRENT_STATE.md         # ← START HERE
│   ├── SESSION_LOG.md           # Work history
│   ├── DECISIONS_LOG.md         # Design decisions
│   ├── REQUIREMENTS.md          # User requirements
│   ├── IMPLEMENTATION_PLAN.md   # Active sprint plan
│   ├── stories/                 # 14 user story files by feature area
│   ├── testing/                 # 6 testing pipeline docs + API maps
│   ├── canonical/               # Auto-generated architecture docs
│   ├── ralph/                   # Phased implementation roadmap
│   ├── data/                    # CSV data files + import scripts
│   ├── archive/                 # 119 archived docs (completed work, superseded versions)
│   └── [~50 active spec docs]  # Feature specs, Figma specs, system specs
├── test-utils/                  # Test infrastructure (golden cases, simulators)
├── reference-docs/              # SMB4 game guides (external reference material)
├── .claude/skills/              # Claude Code skills (audit, fix, test pipeline) — dir is source of truth
├── .mcp.json                    # Playwright MCP for browser testing
├── CLAUDE.md                    # This file
└── [standard config files]      # vite, tsconfig, tailwind, eslint, postcss, package.json
```

---

## Core Operating Principles

### 1. First Principles Reasoning
Always reason from first principles. Break problems down to fundamental truths rather than relying on assumptions.

### 2. The Negative Feedback Loop (NFL)
**Assume failure until proven otherwise.** After any code change:

**Tier 1**: Build succeeds — `npm run build` exits 0
**Tier 2**: All tests pass — current suite baseline lives in `spec-docs/CURRENT_STATE.md` (do NOT hardcode a count here; it rots). A new RED that is not in the documented characterized set is a real regression.
**Tier 3**: No runtime errors — 0 console errors
**Tier 4**: Spec alignment verified — constants, types, formulas match spec docs

Additionally:
1. Actively try to disprove success
2. Test edge cases
3. Verify assumptions
4. Document findings
5. Iterate until unfalsifiable

**Do NOT declare completion until all NFL tiers pass** or the user explicitly permits moving on.

### 3. Scope Discipline
- Default to thoroughness — complete tasks to full scope
- Never silently reduce scope — communicate BEFORE adjusting
- Ask before changing objectives

### 4. Completion Protocol
Before declaring any task complete:
1. State what was accomplished
2. State what NFL steps were performed
3. State remaining uncertainties
4. Ask the user to confirm

### 5. Communication Preferences
- **Plain language for JK — always.** Every summary and every question to JK goes in plain, non-engineering language: lead with the bottom line, explain it the way you would to a smart non-engineer, and keep file paths, line numbers, commit hashes, flag/constant names, code symbols, and long multi-section technical breakdowns OUT of the surfaced message. A clean shape: **where we are / the catch / the fix (or recommendation).** The rigorous technical detail still happens — it belongs in the work artifacts (Codex contracts, audit evidence, DECISIONS_LOG, commits), NOT in the message to JK. Do the engineering, then TRANSLATE before surfacing. Use file:line / flag-level detail only when JK explicitly asks for it. (JK directive 2026-06-24 — he called out "complex, over-detailed engineer-speak.")
- Confirm understanding by restating the task
- Propose approach before executing
- Flag scope concerns early
- Ask clarifying questions upfront — framed as a plain decision with a clear recommendation

### 6. Code Verification Hierarchy
1. **Static analysis** — Read the code logic
2. **Unit tests** — Run test suites
3. **Integration tests** — Test component interactions
4. **UI/Manual tests** — Browser verification via Playwright MCP
5. **Edge case hunting** — Actively try to break it

---

## Institutional Knowledge Protocol

### Living Documentation
Maintain **spec-docs/** as the single source of truth.

**Required docs to maintain:**
- `CURRENT_STATE.md` — What's implemented, what's not, known bugs
- `DECISIONS_LOG.md` — Key decisions with date, context, rationale
- `REQUIREMENTS.md` — User requirements and constraints
- `SESSION_LOG.md` — Running log of work sessions

### Session Handoff Protocol
**Before any session ends or compaction occurs:**
1. Update all relevant spec-docs
2. Append to `SESSION_LOG.md` with: what was accomplished, decisions made, what's pending

### Write-First Principle
**If it's important, write it to a file before moving on.** Treat chat as ephemeral, docs as permanent.

---

## Custom Skills (.claude/skills/)

Specialized skills are installed in `.claude/skills/` (that directory is the
source of truth for the current set; Codex sees a mirror in `.agents/skills/`).
They form pipelines for different workflows:

**Audit → Fix Pipeline:**
spec-ui-alignment → batch-fix-protocol → gametracker-logic-tester → dummy-data-scrubber

**Testing Pipeline:**
engine-discovery → golden-case-generator → test-harness-builder → test-executor → failure-analyzer

**Franchise Testing:**
franchise-engine-discovery → franchise-button-audit → data-pipeline-tracer → season-simulator → user-journey-verifier

**Other:** codebase-reverse-engineer, safe-fix-protocol, ui-flow-crawler, phase-b-builder, exhaustive-spec-auditor, spec-consolidation-protocol

**Codex mirror:** Repo-scoped Codex skills live in `.agents/skills/` as a
DERIVED COPY mirror of the two canonical sources `.claude/skills/` and selected
`spec-docs/skills/` folders. Never edit the `.agents/skills/` copy by hand —
edit the source, then the mirror updates: automatically via the Claude Code
PostToolUse hook when changes happen inside a Claude Code session, or manually
by running `scripts/sync-codex-skills.sh` (required after any skill change made
by Codex or by hand, since the hook only fires inside Claude Code). The sync is
copy-based, not symlinks, so the mirror survives fresh clones and Codex Cloud
checkouts.

## Multi-Agent Team Protocol

For JK + Claude Opus 4.8 + Codex workflows, read `spec-docs/AI_TEAM_OPERATING_MODEL.md`.

Defaults:
- JK owns product rulings, manual/browser acceptance, and scope decisions.
- Claude Opus 4.8 is Captain/spec lead/primary auditor unless it wrote the change.
- Codex is the default builder and local verifier for precise repo edits.
- The builder/auditor triangle is mandatory: the agent that wrote a meaningful change does not audit its own diff.
- Contracts and audit prompts must exist in `spec-docs/PROMPT_CONTRACTS.md` before handoff.

---

## Browser Testing (Playwright MCP)

Configured for Claude in `.mcp.json` and for Codex in `.codex/config.toml`. Start dev server first: `npm run dev` -> open `http://localhost:5173`

**Browser verification gate (JK ruling 2026-06-14):** Codex MAY run Playwright
browser/user-flow pre-checks and MUST report results — but a browser pre-check
NEVER closes a ticket on its own. JK's manual browser sign-off on real data
remains the sole real-world acceptance gate. Codex's pass is a fourth screen
before JK's eyes, not a replacement for them.

---

## File Reading Rules

- Always read spec-docs files in FULL, even if large
- SESSION_LOG.md: Read from the end (most recent first) if too large
- Never truncate spec-docs without explicit permission

---

## Data Integrity — COMPLETED ✅
> All 21/21 issues resolved (2026-02-12). See `spec-docs/archive/DATA_INTEGRITY_FIX_REPORT.md`.

## Manual Testing Bug Fixes — ALL TIERS COMPLETE ✅
> 35 issue IDs, 28 commits across Tiers 0-3. See `spec-docs/CURRENT_STATE.md` for full table.

## Mandatory Documentation Cycle
Every diagnostic or audit cycle follows this exact order:
1. Run command batch
2. Paste output to claude.ai
3. Claude produces AUDIT_LOG.md update with all findings
4. JK commits AUDIT_LOG.md to main
5. Only then does Claude write the next command batch

NEVER write a second command batch before AUDIT_LOG.md findings from the first are logged and committed.
If JK pastes new CLI output without a prior commit, Claude must say "Log first" and produce the AUDIT_LOG update before proceeding.

## Documentation Routing
- FINDING-001 to 055: full text in spec-docs/AUDIT_LOG.md
- FINDING-056 onwards: full text in spec-docs/FINDINGS/FINDINGS_056_onwards.md
- AUDIT_LOG.md is INDEX ONLY for finding 056+
- New findings go to FINDINGS_056_onwards.md until it exceeds 500 lines, then create next file
- SUBSYSTEM_MAP.md must be updated when any wiring status changes
- Never put full finding blocks in AUDIT_LOG.md

---

### Self-Improvement Loop
- After ANY correction from JK: immediately WRITE the proposed rule into the
  `## Lessons Learned (pending JK ratification)` section of
  `spec-docs/SESSION_RULES.md` (Write-First — capture it the moment it happens).
- It is a PROPOSAL until JK says "ratify"; only then does it move into the
  non-negotiable rules above it. No agent promotes its own rule to canon, and
  no agent edits the ratified rules without JK. (JK ruling 2026-06-14.)
- Write the rule in the form: "When [situation], always [action] because [reason]"
- Ruthlessly iterate — if the same mistake recurs, the rule wasn't specific enough; rewrite it
- Review both ratified rules and the pending pen at session start alongside the other required files

### Subagent Strategy
- Use subagents to keep main context window clean
- Offload parallel analysis, research, and multi-file reads to subagents
- One task per subagent — focused execution, not broad exploration
- For complex problems, throw more compute via subagents rather than expanding main context

### Verification Standard
- Before declaring any finding, fix, or analysis complete, ask:
  "Would a staff engineer approve this?"
- A staff engineer would not accept: shallow section reads, assumed coverage,
  keyword scans that miss distributed references, or "it looks correct" without proof
- If the answer is no → do not mark complete, do not present to JK
