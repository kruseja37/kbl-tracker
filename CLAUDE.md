## Project Root & Key Paths
- Project root: /Users/johnkruse/Projects/kbl-tracker
- Active GameTracker: src/src_figma/app/pages/GameTracker.tsx
- Active state hook: src/src_figma/hooks/useGameState.ts
- Inactive (never route here): src/components/GameTracker/index.tsx
- Spec docs: spec-docs/
- Always work on main unless JK says otherwise

## Critical Architecture Facts (Phase 0 Confirmed)
- App.tsx routes GameTracker to src/src_figma/app/pages/GameTracker.tsx ONLY
- src/components/GameTracker/index.tsx is NOT routed — do not treat as active
- useGameState.ts (4,647 lines) is the active state system — not deprecated
- useGamePersistence.ts is wired to the inactive path only
- 718 useState calls in src/src_figma + src/components/GameTracker/

---

# Project Instructions for Claude Code

## Session Start Protocol
**BEFORE doing any work on KBL Tracker, READ these files:**
1. `spec-docs/CURRENT_STATE.md` — Architecture, build status, what's implemented, known issues
2. `spec-docs/SESSION_LOG.md` — Work history (read from the end for most recent)
3. `spec-docs/DECISIONS_LOG.md` — Key design decisions with rationale

Confirm understanding before proceeding: "Based on docs, we're at X point. Correct?"

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
│   │   ├── hooks/               # 8 core UI hooks (useGameState: 2,344 lines)
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
├── .claude/skills/              # 20 custom Claude Code skills (audit, fix, test pipeline)
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
**Tier 2**: All tests pass — 5,653 tests across 134 files
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
- Confirm understanding by restating the task
- Propose approach before executing
- Flag scope concerns early
- Ask clarifying questions upfront

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

20 specialized skills installed. They form pipelines for different workflows:

**Audit → Fix Pipeline:**
spec-ui-alignment → batch-fix-protocol → gametracker-logic-tester → dummy-data-scrubber

**Testing Pipeline:**
engine-discovery → golden-case-generator → test-harness-builder → test-executor → failure-analyzer

**Franchise Testing:**
franchise-engine-discovery → franchise-button-audit → data-pipeline-tracer → season-simulator → user-journey-verifier

**Other:** codebase-reverse-engineer, safe-fix-protocol, ui-flow-crawler, phase-b-builder, exhaustive-spec-auditor, spec-consolidation-protocol

---

## Browser Testing (Playwright MCP)

Configured in `.mcp.json`. Start dev server first: `npm run dev` → open `http://localhost:5173`

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
