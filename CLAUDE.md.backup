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
**Tier 2**: All tests pass - Run all test suites (267+ tests)
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

## Project Structure

```
kbl-tracker/
├── spec-docs/           # Living documentation (SOURCE OF TRUTH)
│   ├── CURRENT_STATE.md
│   ├── SESSION_LOG.md
│   ├── DECISIONS_LOG.md
│   ├── REQUIREMENTS.md
│   └── WORST_CASE_SCENARIOS.md
├── src/                 # Application source code
├── tests/               # Test files
└── CLAUDE.md            # This file (auto-read by Claude Code)
```

---

## Browser Testing

When UI testing is needed, use the Playwright MCP server:
- Say "Use playwright mcp to open a browser to [URL]"
- Can navigate, click, fill forms, take screenshots
- Use for verification step 4 (UI/Manual tests) in the Code Verification Hierarchy

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
