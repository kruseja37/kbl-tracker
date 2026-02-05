# Project Instructions for Claude Code

## Session Start Protocol
**BEFORE doing any work on KBL Tracker, READ these files:**
1. `spec-docs/SESSION_LOG.md`
2. `spec-docs/CURRENT_STATE.md`
3. `spec-docs/DECISIONS_LOG.md`

Confirm understanding before proceeding: "Based on docs, we're at X point. Correct?"

---

## Core Operating Principles

### 1. First Principles Reasoning
Always reason from first principles. Break problems down to fundamental truths and build solutions from there, rather than relying on assumptions or analogies.

### 2. The Negative Feedback Loop (NFL)
**Assume failure until proven otherwise.** After any code, logic, task completion, or documentation:

**Tier 1**: Build succeeds - `npm run build` exits 0
**Tier 2**: All tests pass - Run all test suites (744+ tests)
**Tier 3**: No runtime errors - No console errors at runtime
**Tier 4**: Spec alignment verified:
  - Constants match between spec and code
  - Type/enum values match
  - Formulas match
  - Any intentional differences are documented

**Tier 4 Timing:**
- **Day Start**: Audit spec(s) for today's task against existing code BEFORE implementing
- **Day End**: Verify new code matches spec after implementing

Additionally:
1. **Actively try to disprove success** - Attempt to break, falsify, or find gaps
2. **Test edge cases** - Identify boundary conditions, unusual inputs, and failure modes
3. **Verify assumptions** - Question every assumption made during implementation
4. **Document findings** - Record what was tested and what passed/failed
5. **Iterate until unfalsifiable** - Only stop when you cannot find any way to disprove correctness

**Do NOT declare completion until:**
- All 4 NFL tiers have passed, OR
- The user explicitly permits moving on with stones "unturned"

### 3. Scope Discipline
- **Default to thoroughness** - Complete tasks to their full scope as requested
- **Never silently reduce scope** - Communicate effort required BEFORE adjusting approach
- **Ask before changing objectives** - Always confirm before modifying task parameters

### 4. Completion Protocol
Before declaring any task "complete" or "successful":
1. State what was accomplished
2. State what NFL steps were performed
3. State any remaining uncertainties or untested areas
4. Ask the user to confirm before marking as done

### 5. Documentation Protocol
When creating or updating documentation:
- Timestamp all findings with test dates
- Include specific details - exact steps, inputs, outputs, not just "it worked"
- Maintain living documents that accumulate knowledge
- Link evidence to claims - reference test IDs, line numbers, file paths

### 6. Communication Preferences
Before starting significant work:
- Confirm understanding of the task by restating it
- Propose approach before executing (especially for multi-step tasks)
- Flag scope concerns early - "This will require X steps, is that expected?"
- Ask clarifying questions upfront rather than making assumptions mid-task

### 7. Code Verification Hierarchy
When verifying code changes, use this order:
1. **Static analysis** - Read the code logic
2. **Unit tests** - Run existing test suites
3. **Integration tests** - Test component interactions
4. **UI/Manual tests** - Use browser MCP to click through the actual interface
5. **Edge case hunting** - Actively try to break it

Only advance to "complete" when appropriate levels have passed.

### 8. Context Management
- Reference prior decisions - "Per our earlier discussion about X..."
- Maintain running summaries when context is long
- Update spec docs in real-time as we discover/test things
- Don't assume I remember - re-state key context when relevant

### 9. Error Handling
When something fails or behaves unexpectedly:
- State what was expected vs what actually happened
- Propose root cause hypothesis before fixing
- Verify the fix addresses root cause, not just symptoms
- Re-run NFL after any fix

---

## Institutional Knowledge Protocol

### Living Documentation Requirement
Maintain **spec-docs/** as the single source of truth. All decisions, findings, and context must be written to persistent files, not just discussed in chat.

**Required docs to maintain:**
- `CURRENT_STATE.md` - What's implemented, what's not, known bugs
- `DECISIONS_LOG.md` - Key decisions with date, context, and rationale
- `REQUIREMENTS.md` - User requirements and constraints
- `SESSION_LOG.md` - Running log of work sessions
- `WORST_CASE_SCENARIOS.md` - Test results and edge cases

### Session Handoff Protocol
**Before any session ends or compaction occurs:**
1. Update all relevant spec-docs with new findings
2. Append to `SESSION_LOG.md` with:
   - What was accomplished
   - What decisions were made and why
   - What's pending/incomplete
   - Key context that shouldn't be lost

### Write-First Principle
**If it's important, write it to a file before moving on.**
- Treat chat as ephemeral, docs as permanent
- Don't say "I'll remember" - write it down

---

## Architecture: Shared-Source with Figma UI Layer

**CRITICAL**: The app has a SHARED architecture, not duplicated code. Both `src/` and `src/src_figma/` are actively used:

- `@` alias resolves to `src/src_figma/` (configured in vite.config.ts + tsconfig.app.json)
- `src/src_figma/` is the **UI layer** (pages, components, React hooks)
- `src/engines/`, `src/utils/`, `src/types/` are the **core logic layer** — imported directly by src_figma via relative paths (`../../engines/`, `../../../engines/`)
- `src/src_figma/app/engines/` contains **integration wrappers** that adapt base engines for the UI
- Changes to base engines (`src/engines/`) affect the entire app
- Changes to UI logic happen in `src/src_figma/`

**Import chain**: UI Component → Figma Hook → Base Engine + Base Storage

```
src/src_figma/app/pages/GameTracker.tsx
  → imports useGameState from @/hooks/useGameState (src/src_figma/hooks/)
    → imports leverageCalculator from ../../engines/ (src/engines/)
    → imports eventLog from ../../utils/ (src/utils/)
    → imports gameStorage from ../utils/ (src/src_figma/utils/)
  → imports mojoEngine from ../../../engines/ (src/engines/)
```

## Project Structure

```
kbl-tracker/
├── .claude/skills/                      # Custom skills (pipeline: audit → fix → verify → scrub)
│   ├── spec-ui-alignment/              # Step 1: Find misalignments
│   ├── batch-fix-protocol/             # Step 2: Apply fixes in verified batches
│   ├── gametracker-logic-tester/       # Step 3: Verify game logic after fixes
│   └── dummy-data-scrubber/            # Step 4: Replace hardcoded data
├── .mcp.json                            # Playwright MCP for browser testing
├── spec-docs/                           # Living documentation (SOURCE OF TRUTH)
│   └── 100+ spec documents (see SPEC_INDEX.md)
├── src/
│   ├── engines/         # ⚙️ CORE: Calculation engines — SHARED by entire app
│   │   ├── bwarCalculator.ts, pwarCalculator.ts, fwarCalculator.ts  # WAR
│   │   ├── mojoEngine.ts, fitnessEngine.ts       # Player state
│   │   ├── salaryCalculator.ts                    # Salary
│   │   ├── leverageCalculator.ts, clutchCalculator.ts  # Game context
│   │   └── fameEngine.ts, narrativeEngine.ts, etc.     # Systems
│   ├── types/           # 📋 CORE: Shared type definitions (game.ts, war.ts)
│   ├── utils/           # 💾 CORE: Storage layer (IndexedDB) — all *Storage.ts files
│   │   ├── eventLog.ts, seasonAggregator.ts       # Game data pipeline
│   │   ├── leagueBuilderStorage.ts                # League/team/player DB
│   │   └── franchiseStorage.ts, seasonStorage.ts, etc.
│   ├── hooks/           # 🪝 Base hooks (older, some still imported)
│   └── src_figma/       # 🎨 UI LAYER — all React rendering lives here
│       ├── app/
│       │   ├── pages/       # 14 page components (GameTracker, FranchiseHome, etc.)
│       │   ├── components/  # 36 components + 9 modals + shadcn ui/
│       │   ├── engines/     # Integration wrappers (adapt base engines for UI)
│       │   ├── hooks/       # App hooks (useWARCalculations, useFameTracking, etc.)
│       │   ├── types/       # App-level types (substitution.ts, etc.)
│       │   └── data/        # mockData.ts (to be replaced by scrubber skill)
│       ├── hooks/           # Core UI hooks (useGameState: 2,344 lines)
│       └── utils/           # Figma-specific storage (gameStorage.ts)
└── CLAUDE.md            # This file (auto-read by Claude Code)
```

---

## Custom Skills

Four specialized skills are installed at `.claude/skills/`. They form a pipeline: Audit → Plan → Fix → Verify.

**spec-ui-alignment** — Trigger: "audit spec alignment", "check if UI matches code", "find spec violations"
- 4-layer audit: Spec→Backend, Backend→UI, UI→Backend, Cross-layer consistency
- Reference: `.claude/skills/spec-ui-alignment/references/SPEC_CODE_MAP.md`
- Produces: `spec-docs/SPEC_UI_ALIGNMENT_REPORT.md`

**batch-fix-protocol** — Trigger: "apply fixes", "fix audit findings", "execute fix plan", "implement recommendations"
- **ALWAYS use this skill when transitioning from audit/diagnosis to implementation**
- Enforces: one critical fix at a time, verify between batches, stop on regression
- Tiers: Critical (one-at-a-time) → Wiring (batch 3 max) → Constants → Cosmetic
- Produces: `spec-docs/FIX_EXECUTION_REPORT_[DATE].md`

**gametracker-logic-tester** — Trigger: "test gametracker", "test baseball logic", "find logic bugs"
- Generates 501 test cases (8 base states × 3 out counts × 22 outcomes)
- Tests every state transition against real baseball rules
- Verifies UI updates match state changes via Playwright
- Reference: `.claude/skills/gametracker-logic-tester/references/BASEBALL_LOGIC.md`
- IMPORTANT: Infield fly rule EXISTS in SMB4
- Use AFTER batch-fix-protocol to verify fixes didn't break game logic

**dummy-data-scrubber** — Trigger: "scrub dummy data", "replace placeholder data", "find hardcoded values"
- Scans all components/pages for hardcoded strings, magic numbers, mock objects
- Maps each to its correct dynamic data source
- Priority target: `src/src_figma/app/data/mockData.ts` and its consumers
- Reference: `.claude/skills/dummy-data-scrubber/references/DATA_SOURCES.md`

**Pipeline order**: spec-ui-alignment → batch-fix-protocol → gametracker-logic-tester → dummy-data-scrubber

Each skill produces a report saved to `spec-docs/`.

---

## Browser Testing (Playwright MCP)

When UI testing is needed, use the Playwright MCP server (configured in `.mcp.json`):
- Can navigate, click, fill forms, take screenshots
- Start dev server first: `npm run dev` → then open `http://localhost:5173`
- Use for verification step 4 (UI/Manual tests) in the Code Verification Hierarchy
- The gametracker-logic-tester skill uses this for Phase 3 (UI verification)

---

## File Reading Rules

- Always read spec-docs files in FULL, even if large
- SESSION_LOG.md: Read from the end (most recent first) if too large
- Never truncate spec-docs without explicit permission

---

## SMB4 Player/Team Data Extraction Protocol

When the user provides screenshots of SMB4 teams and players, extract **ALL** data comprehensively. Do not skip any fields.

### Team Data (from Team Visuals screens)
- Team name
- Home park
- Team chemistry (SPIRITED, CRAFTY, DISCIPLINED, FIERY, GRITTY)
- Primary/secondary colors

### Position Player Data (from Roster screens)
Extract from BOTH the batter ratings view AND the traits/chemistry view:

| Field | Source |
|-------|--------|
| Name | Roster list |
| Position (primary) | POS column |
| Position (secondary) | S. POS column |
| Overall grade | OVR column (S, A+, A, A-, B+, B, B-, C+, C, C-, D+, D) |
| Power | POW column (0-99) |
| Contact | CON column (0-99) |
| Speed | SPD column (0-99) |
| Fielding | FLD column (0-99) |
| Arm | ARM column (0-99) |
| Age | AGE column |
| Bats | BAT column (L/R/S) |
| Throws | THR column (L/R) |
| Chemistry | CHEM column (SPI, DIS, CMP, SCH, CRA) |
| Trait 1 | TRAIT 1 column |
| Trait 2 | TRAIT 2 column |
| Gender | Infer from name, confirm ambiguous ones with user |

### Pitcher Data (from Roster screens)
Pitchers have TWO sets of ratings - extract BOTH:

**Pitching Ratings** (from VEL/JNK/ACC view):
| Field | Source |
|-------|--------|
| Velocity | VEL column (0-99) |
| Junk | JNK column (0-99) |
| Accuracy | ACC column (0-99) |
| Arsenal | ARSENAL column (e.g., 4F, 2F, CF, CB, SL, CH, FK, SB) |

**Batting Ratings** (from POW/CON/SPD/FLD/ARM view):
| Field | Source |
|-------|--------|
| Power | POW column (0-99) |
| Contact | CON column (0-99) |
| Speed | SPD column (0-99) |
| Fielding | FLD column (0-99) |
| Arm | ARM column (usually 0 or - for pitchers) |

**Why pitcher batting matters**: Per SALARY_SYSTEM_SPEC.md, pitchers with high batting ratings get salary bonuses:
- Contact ≥70 = +50% bonus
- Contact ≥55 = +25% bonus
- Contact ≥40 = +10% bonus

### Roster Organization
Organize players by role:
- **STARTER**: Position players in starting lineup (positions 1-9)
- **BENCH**: Position players on bench (BN)
- **ROTATION**: Starting pitchers (ROT with SP role)
- **BULLPEN**: Relief pitchers (PEN, plus ROT with SP/RP role)

### Gender Inference
- Infer gender from names where clear
- Mark uncertain names with "?"
- Present list of uncertain names to user for confirmation BEFORE finalizing

### Data Storage Location
Player/team data goes in: `src/data/playerDatabase.ts`
