# AI Operating Preferences for KBL Tracker

> **CRITICAL: Session Start Protocol**
> BEFORE doing any work on KBL Tracker, READ these files in this order:
> 1. `spec-docs/CURRENT_STATE.md` - What's implemented and what's not
> 2. `spec-docs/AI_OPERATING_PREFERENCES.md` - How to work on this project (this file)
> 3. `spec-docs/SMB4_GAME_MECHANICS.md` - ⭐ Central reference for what IS/ISN'T in SMB4
> 4. `spec-docs/SESSION_LOG.md` - What happened recently (for context, not source of truth)
>
> **WAR Calculation Specs** (read when implementing stat calculations):
> - `spec-docs/KBL_XHD_TRACKER_MASTER_SPEC_v3.md` - Master spec with all WAR/EOS/Award systems
> - `spec-docs/BWAR_CALCULATION_SPEC.md` - Batting WAR (wOBA, wRAA, replacement level, calibration)
> - `spec-docs/RWAR_CALCULATION_SPEC.md` - Baserunning WAR (wSB, UBR, wGDP)
> - `spec-docs/PWAR_CALCULATION_SPEC.md` - Pitching WAR (FIP-based)
> - `spec-docs/FWAR_CALCULATION_SPEC.md` - Fielding WAR per-play run values and formulas
> - `spec-docs/MWAR_CALCULATION_SPEC.md` - Manager WAR (decisions + team overperformance)
>
> **In-Game Tracking Specs** (read when implementing game tracking features):
> - `spec-docs/LEVERAGE_INDEX_SPEC.md` - Leverage Index calculation for all systems
> - `spec-docs/CLUTCH_ATTRIBUTION_SPEC.md` - Multi-participant clutch/choke credit distribution
> - `spec-docs/FIELDING_SYSTEM_SPEC.md` - Fielding UI, inference logic, data schema
> - `spec-docs/RUNNER_ADVANCEMENT_RULES.md` - Runner movement, force plays, WP/PB/SB
> - `spec-docs/INHERITED_RUNNERS_SPEC.md` - Inherited runner responsibility tracking
> - `spec-docs/PITCH_COUNT_TRACKING_SPEC.md` - Pitch count per-AB and game totals
> - `spec-docs/SUBSTITUTION_FLOW_SPEC.md` - PH/PR/defensive sub/pitching change flows
>
> **Special Events & Fame Specs**:
> - `spec-docs/SPECIAL_EVENTS_SPEC.md` - ⭐ Fame Bonus/Boner events (nut shot, TOOTBLAN, killed pitcher, etc.)
> - `spec-docs/fame_and_events_system.md` - Fame system overview, All-Star voting, random events
>
> **Reference Documents** (deep dives on SMB4 mechanics):
> - `spec-docs/SMB4_GAME_REFERENCE.md` - SMB4 game mechanics (Mojo, Chemistry, Traits)
> - `reference-docs/BillyYank Super Mega Baseball Guide 3rd Edition.docx` - Full 90+ page guide
> - `reference-docs/Jester's Super Mega Baseball Reference V2 clean.xlsx` - Stat tracking template
>
> **Important**: SPEC docs are the source of truth. SESSION_LOG is historical context only.
>
> Use the Read tool on these exact paths. Do NOT rely on compaction summaries.

---

## Core Operating Principles

### 1. First Principles Reasoning
Always reason from first principles unless explicitly told otherwise. Break problems down to their fundamental truths and build solutions from there, rather than relying on assumptions or analogies.

### 2. The Negative Feedback Loop (NFL)
Assume failure until proven otherwise. The NFL has **three tiers** of verification:

#### Tier 1: Code-Level NFL (After every implementation)
1. **Actively try to disprove success** - Attempt to break, falsify, or find gaps in what was just created
2. **Test edge cases** - Identify boundary conditions, unusual inputs, and failure modes
3. **Verify assumptions** - Question every assumption made during implementation
4. **Document findings** - Record what was tested and what passed/failed
5. **Iterate until unfalsifiable** - Only stop when you cannot find any way to disprove correctness

#### Tier 2: Data Flow NFL (After every feature)
Verify the complete pipeline works end-to-end:

```
┌─────────┐    ┌──────────┐    ┌────────────┐    ┌─────────┐
│   UI    │───▶│  Storage │───▶│ Calculator │───▶│ Display │
│ (Input) │    │ (Persist)│    │  (Process) │    │ (Output)│
└─────────┘    └──────────┘    └────────────┘    └─────────┘
```

Ask these questions:
1. ✅ **UI exists to collect data?** - Can users input this data?
2. ✅ **Data persists to storage?** - Does it survive browser refresh?
3. ✅ **Calculator is called with real data?** - Not orphaned/unused?
4. ✅ **Result is displayed somewhere?** - Users can see the output?
5. ✅ **E2E test passes?** - Input → Refresh → See calculated result?

**WARNING**: A calculator that exists but is never called is an ORPHAN. A data type collected but not persisted is LOST. Both are bugs the Tier 1 NFL won't catch.

#### Tier 3: Spec-to-Implementation Audit (Periodic deep audit)
Compare EVERY spec document against actual implementation to find:
- **Missing features** - Spec'd but not implemented at all
- **Partial features** - Started but incomplete
- **Orphaned code** - Implemented but not connected
- **Spec/code mismatches** - Different values, logic, or behavior

**Audit Process (use parallel agents for speed):**

1. **For each major system**, spawn an agent to:
   ```
   Read: [SPEC_FILE].md
   Search: src/ for related implementation files
   Compare: What spec says vs what code does
   Report: Gaps in structured format
   ```

2. **Gap format**:
   ```
   FEATURE: [name]
   SPEC SAYS: [requirement]
   IMPLEMENTATION: [what exists or "MISSING"]
   PRIORITY: HIGH/MEDIUM/LOW
   ```

3. **Audit all integration points**:
   - Does UI call the engine?
   - Does engine read from storage?
   - Does result display in UI?
   - Is data persisted?

4. **Compile findings** into FEATURE_WISHLIST.md with:
   - Total count by priority
   - Detailed tables per system
   - HIGH priority items for immediate action

**When to run Tier 3 audit:**
- Before starting a new sprint/phase
- When user reports "missing" features
- After any major refactor
- At least once per week during active development

**Do not declare completion until:**
- Tier 1 NFL has been exhausted (code works correctly)
- Tier 2 NFL confirms data flows end-to-end
- Tier 3 audit has been run if starting/ending a major phase
- OR the user explicitly permits moving on with stones "unturned"

### 3. Scope Discipline
- **Default to thoroughness** - Complete tasks to their full scope as requested
- **Never silently reduce scope** - If a task seems extensive, communicate the effort required BEFORE adjusting approach
- **Ask before changing objectives** - Always confirm with the user before modifying task parameters, even if you believe a change is beneficial

### 4. Completion Protocol

**MANDATORY END-OF-DAY CHECKPOINT** (Do NOT skip this):

Before declaring ANY implementation day "complete", you MUST run all 3 NFL tiers:

```
┌────────────────────────────────────────────────────────────────┐
│  END-OF-DAY NFL CHECKPOINT                                     │
├────────────────────────────────────────────────────────────────┤
│  □ Tier 1: Try to BREAK the code (edge cases, null inputs)     │
│  □ Tier 2: Verify FULL pipeline: UI → Storage → Calc → Display │
│  □ Tier 3: Compare implementation against SPEC requirements    │
├────────────────────────────────────────────────────────────────┤
│  Only after ALL THREE pass can you mark day as complete.       │
│  If ANY tier fails, day status = PARTIAL, document gaps.       │
└────────────────────────────────────────────────────────────────┘
```

**Tier 2 is the most commonly skipped** - always ask:
1. Does UI collect this data? → WHERE?
2. Does data persist to storage? → PROVE IT (show the write call)
3. Does calculator consume stored data? → SHOW THE IMPORT
4. Does result display in UI? → WHERE IS IT RENDERED?

If you cannot answer all 4 with specific file:line references, Tier 2 FAILS.

**Before declaring any task "complete" or "successful":**
1. State what was accomplished
2. State what NFL steps were performed (all 3 tiers for end-of-day)
3. State any remaining uncertainties or untested areas
4. If any tier failed, explicitly state "Day X: PARTIAL" not "COMPLETE"
5. Ask the user to confirm before marking as done

### 5. Documentation Protocol
When creating or updating documentation:
- **Timestamp all findings** with test dates
- **Include specific details** - exact steps, inputs, outputs, not just "it worked"
- **Maintain living documents** that accumulate knowledge (like WORST_CASE_SCENARIOS.md)
- **Link evidence to claims** - reference test IDs, line numbers, file paths

### 6. Communication Preferences
Before starting significant work:
- **Confirm understanding** of the task by restating it
- **Propose approach** before executing (especially for multi-step tasks)
- **Flag scope concerns early** - "This will require X steps, is that expected?"
- **Ask clarifying questions upfront** rather than making assumptions mid-task

### 7. Code Verification Hierarchy
When verifying code changes, use this order:
1. **Static analysis** - Read the code logic
2. **Unit tests** - Run existing test suites
3. **Integration tests** - Test component interactions
4. **UI/Manual tests** - Click through the actual interface
5. **Edge case hunting** - Actively try to break it

Only advance to "complete" when appropriate levels have passed.

### 8. Context Management
- **Reference prior decisions** - "Per our earlier discussion about X..."
- **Maintain running summaries** when context is long
- **Update spec docs in real-time** as we discover/test things
- **Don't assume I remember** - re-state key context when relevant

### 9. Error Handling
When something fails or behaves unexpectedly:
- State what was expected vs what actually happened
- Propose root cause hypothesis before fixing
- Verify the fix addresses root cause, not just symptoms
- Re-run NFL after any fix

---

## 10. Institutional Knowledge Protocol

### 10.1 Living Documentation Requirement
Maintain **spec-docs/** as the single source of truth. All decisions, findings, and context must be written to persistent files, not just discussed in chat.

**Required docs to maintain:**
- `CURRENT_STATE.md` - What's implemented, what's not, known bugs
- `DECISIONS_LOG.md` - Key decisions with date, context, and rationale
- `REQUIREMENTS.md` - User requirements and constraints
- `SESSION_LOG.md` - Running log of work sessions
- `WORST_CASE_SCENARIOS.md` - Test results and edge cases

### 10.2 Session Handoff Protocol
**Before any session ends or compaction occurs:**
1. Update all relevant spec-docs with new findings
2. Append to `SESSION_LOG.md` with:
   - What was accomplished
   - What decisions were made and why
   - What's pending/incomplete
   - Key context that shouldn't be lost

### 10.3 Session Start Protocol
**At the start of any continued session:**
1. Read `CURRENT_STATE.md`, `SESSION_LOG.md`, and `DECISIONS_LOG.md`
2. Confirm understanding: "Based on docs, we're at X point. Correct?"
3. Don't rely on compaction summaries alone—they lose nuance

### 10.4 Write-First Principle
**If it's important, write it to a file before moving on.**
- Treat chat as ephemeral, docs as permanent
- Don't say "I'll remember"—write it down

### 10.5 Knowledge Promotion Protocol (CRITICAL)

**Problem**: Session logs capture what happened, but learnings stay buried. New AI reads sessions but misses context.

**Solution**: After any significant implementation or bug fix, **promote knowledge** from session notes to the appropriate SPEC doc.

**The Rule**: SESSION_LOG.md is for *what happened*. SPEC docs are for *how things work*.

**Promotion Workflow**:
1. **During work**: Write findings to SESSION_LOG.md (ephemeral notes)
2. **After completion**: Extract the *finalized logic* and add it to the relevant SPEC doc
3. **Cross-reference**: Link SPEC sections to code locations (file + line numbers)
4. **Delete session cruft**: Once promoted, session entries become historical record only

**Example**:
- Bug discovered: "Hits were incorrectly requiring fielding confirmation"
- Session log entry: Describes the discovery, debugging process, fix applied
- **Promotion**: Add permanent section to FIELDING_SYSTEM_SPEC.md explaining the final logic with code references

**Which Doc Gets the Knowledge?**

| Knowledge Type | Target Doc | Example |
|----------------|------------|---------|
| Implementation logic | Relevant *_SPEC.md | Fielding chance rules → FIELDING_SYSTEM_SPEC.md |
| Design decision | DECISIONS_LOG.md | "Why we chose X over Y" |
| Feature status | CURRENT_STATE.md | "Fielding system - IMPLEMENTED" |
| Test results | WORST_CASE_SCENARIOS.md | "Scenario X - PASSED" |
| User requirements | REQUIREMENTS.md | "Must track fielding attempts on hits" |

**Verification**: Before ending a session, ask:
- "Is there anything in SESSION_LOG.md that should be promoted to a SPEC doc?"
- "Are all SPEC docs up-to-date with the final implementation state?"

### 10.6 SPEC Doc Quality Standards

**SPEC docs must be**:
- **Self-contained**: A new AI should understand the system from SPEC alone
- **Code-linked**: Reference exact file paths and line numbers
- **Decision-explained**: Include WHY, not just WHAT
- **Example-rich**: Show concrete scenarios, not just abstract rules

**SPEC docs must NOT**:
- Refer to "the session where we fixed X" (promotes to aggregate knowledge instead)
- Assume reader has session context
- Contain outdated information (update or remove)

**Template for SPEC Sections**:
```markdown
## [Feature/Logic Name]

### What It Does
[One paragraph explanation]

### Why It Works This Way
[The reasoning/decision behind it]

### Implementation
**File**: `path/to/file.tsx`
**Lines**: ~XXX-YYY
**Key Code**:
```typescript
// Paste the critical logic
```

### Edge Cases
| Scenario | Expected Behavior | Reason |
|----------|-------------------|--------|
| ... | ... | ... |
```

---

## 11. Master Spec vs Individual Specs Relationship

### 11.1 Document Hierarchy

The relationship between the Master Spec and individual spec files is:

1. **Master Spec (`KBL_XHD_TRACKER_MASTER_SPEC_v3.md`) = Concept Library / Idea Bank**
   - Contains the original vision, UI mockups, feature ideas, and initial thinking
   - May have outdated values, contradictions, or less refined logic
   - Useful for understanding the "big picture" and finding orphaned concepts

2. **Individual Specs (`*_SPEC.md` files) = Authoritative Source of Truth**
   - Refined through iterative NFL-style validation
   - Internally consistent and cross-referenced
   - Contains the actual implementation logic to follow

### 11.2 When Master Spec Conflicts with Individual Specs

When you encounter something in the Master Spec that differs from our newer individual specs:

1. **Challenge ourselves**: "Is there a good idea in the old concept we're missing?"
   - The Master Spec may have valuable concepts that haven't been carried forward
   - Don't dismiss it just because it's older

2. **But don't blindly adopt**: Our newer work has been NFL'd and is more rigorous
   - Individual specs have been tested, edge-cased, and refined
   - Values and formulas in individual specs supersede the Master Spec

3. **Integrate thoughtfully**: If the old concept has merit, incorporate it into the authoritative spec in a better way
   - Update the individual spec, not the Master Spec
   - Document why the concept was adopted/adapted

### 11.3 Practical Example

**RESOLVED CONFLICT (January 2026):**
- Previous conflict: Master Spec said +1, SPECIAL_EVENTS_SPEC.md said +1.5 (+2.5 for grand slam)
- **Decision**: Robbery = **+1 Fame** (same for all robbery types)
- **Rationale**: The difficulty of the catch is similar regardless of runners on base. The extra runners only affect RBIs prevented, not the fielder's Fame for the spectacular play.
- **SPECIAL_EVENTS_SPEC.md is authoritative** and now reflects this value consistently.

### 11.4 Orphaned Concept Mining

Periodically scan the Master Spec for valuable concepts that may not have made it into individual specs. These "orphaned concepts" should be:

1. Evaluated for merit
2. If valuable, incorporated into the appropriate individual spec with proper refinement
3. Cross-referenced so we know the concept has been addressed

---

## 12. AI Connector Capabilities

### 12.1 Available Connectors
Future AI sessions have access to powerful connectors that enable hands-on testing and development:

**Desktop Commander (MCP)**
- Execute terminal commands on the user's Mac
- Start/stop dev servers (`npm run dev`, `npm test`, etc.)
- Run build processes and linting
- Execute git commands
- Manage processes (list, kill, monitor)

**Claude in Chrome (Browser Automation)**
- Navigate to URLs and take screenshots
- Click buttons, fill forms, interact with UI elements
- Execute JavaScript in page context
- Read page content and accessibility trees
- Perform end-to-end UI testing

### 12.2 Testing Protocol with Connectors
When performing hands-on testing:

1. **Start dev server via Desktop Commander:**
   ```bash
   source ~/.zshrc && cd /Users/johnkruse/Projects/kbl-tracker && npm run dev
   ```

2. **Use Chrome tools for UI verification:**
   - `tabs_context_mcp` - Get available browser tabs
   - `navigate` - Go to localhost URL
   - `computer` with `action: screenshot` - Capture current state
   - `javascript_tool` - Click buttons, interact with UI
   - `read_page` - Get accessibility tree for elements

3. **Verify changes in real-time:**
   - Take screenshots before/after interactions
   - Verify expected UI state changes
   - Check activity logs and data persistence

### 12.3 Example Workflow
```
1. Desktop Commander: Start dev server on user's Mac
2. Chrome: Navigate to http://localhost:5173/
3. Chrome: Screenshot to see initial state
4. Chrome: JavaScript to click buttons/interact
5. Chrome: Screenshot to verify changes
6. Repeat until NFL is satisfied
```

### 12.4 When to Use Connectors
- **Always** for UI/integration testing after implementing visual components
- **Always** when user says "test on my machine" or "hands-on testing"
- **Prefer** over relying solely on unit tests for user-facing features
- **Required** for NFL completion on any visual/interactive features

### 12.5 Important Notes
- Dev server runs on user's Mac, not the AI's VM environment
- Chrome tools interact with user's actual browser
- Always close modals/clean up after testing
- Take screenshots at key verification points for evidence

---

## 13. GameTracker Design Philosophy

### 13.1 Non-User-Intensive Design Principle

**Core Philosophy**: The GameTracker should be as non-user-intensive as possible by leveraging inferential logic based on real baseball gameplay intuition.

The user watches and plays the game - they shouldn't be constantly interrupted to record obvious events. The system should:

1. **Infer what it can** from existing play-by-play data
2. **Prompt only when uncertain** (and make prompts easy to dismiss or confirm)
3. **Never ask the obvious** - if baseball logic dictates the outcome, don't ask

### 13.2 Detection Tiers

| Tier | User Effort | When to Use | Examples |
|------|-------------|-------------|----------|
| **Auto-Detect** | None | Determinable from data | Cycle, no-hitter, blown save, milestones |
| **Prompt-Detect** | 1 click (Y/N) | System suspects, needs confirmation | Web gem, TOOTBLAN, robbery |
| **Manual Entry** | Multiple clicks | Cannot infer, user initiates | Nut shot, killed pitcher |

### 13.3 Implementation Guidelines

When implementing detection logic:

1. **Baseball Intuition First**: What would a knowledgeable fan expect?
   - 4+ pitches thrown at runner = likely nut shot? Prompt.
   - Fly out in deep zone with diving catch animation → likely web gem? Prompt.
   - Pitcher faces minimum batters through 5 → detect no-hitter progress automatically.

2. **Confidence Thresholds**:
   - High confidence (>90%) → Auto-detect, no prompt
   - Medium confidence (50-90%) → Prompt with suggestion
   - Low confidence (<50%) → Don't prompt, leave to manual entry

3. **Minimal Disruption**:
   - Prompts should be dismissible with one tap
   - Group related prompts (don't ask 3 questions in a row)
   - Remember user preferences for prompt frequency

### 13.4 Related Spec Docs

- `DETECTION_FUNCTIONS_IMPLEMENTATION.md` - Technical implementation
- `FAME_SYSTEM_TRACKING.md` - Fame events and triggers
- `SPECIAL_EVENTS_SPEC.md` - Event definitions

---

## 14. Spec File Verification Protocol

### 13.1 The Problem
Audit reports and session logs can document resolutions WITHOUT actually applying changes to source spec files. This creates a false sense of completion where documentation says "resolved" but the actual specs remain unchanged.

**Example (January 2026):** NFL audit documented 11 "resolved" minor issues, but verification revealed only 1 was actually applied to spec files. The other 10 existed only in the audit report.

### 13.2 Write-to-Source-First Rule
When a decision is made or issue is resolved:

1. **Update the actual spec file FIRST**
2. **Then update audit reports/logs SECOND**
3. Audit reports describe what WAS done, not what SHOULD be done

### 13.3 Verification Steps
After documenting any fix in an audit report or session log:

1. **Grep/search the actual spec file** for the old value
2. **Confirm the new value is present** in the spec file
3. **Don't mark resolved** until verified in source

```bash
# Example verification
grep -n "every 5-7 games" spec-docs/*.md  # Should return nothing if fixed
grep -n "every 5 games" spec-docs/KBL_XHD_TRACKER_MASTER_SPEC_v3.md  # Should find the fix
```

### 13.4 Post-Audit NFL Check
Before closing any audit or resolution pass:

1. Run verification pass on ALL "resolved" items
2. For each resolution, confirm the change exists in the actual spec file
3. Items only in audit report (not in specs) must be applied or re-opened

### 13.5 Red Flags
Be suspicious when:
- Resolution only mentions "updated audit report" without spec file changes
- No file paths listed for where the fix was applied
- Grep for old value still finds matches in spec files
- Resolution describes what "should" happen vs what "was" done

### 13.6 Accountability
When resolving issues across multiple files:

| Document Type | Purpose | Trust Level |
|---------------|---------|-------------|
| Actual spec files (*_SPEC.md) | Source of truth | HIGH - This is what matters |
| Audit reports | Track what was done | MEDIUM - Verify against specs |
| Session logs | Historical record | LOW - Just notes, not authority |

**The spec file is the only thing that matters.** If the spec file doesn't have the fix, it's not fixed.
