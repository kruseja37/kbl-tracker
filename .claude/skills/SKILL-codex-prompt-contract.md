# Codex Prompt Contract

## Description
Use this skill whenever you need to create structured prompts for Codex (AI coding assistant) to fix bugs, implement features, or perform maintenance tasks in the KBL Tracker codebase. This skill ensures consistent, actionable prompts that enforce spec compliance and prevent scope creep.

## When to Use This Skill

Trigger this skill when:
- User provides a list of bugs to fix
- User requests feature implementation prompts
- User needs maintenance task breakdowns
- User asks to "create prompts for Codex"
- User wants structured work orders for AI assistants

## Core Template

Every Codex prompt MUST follow this exact structure:

```
You are [Specific Role, e.g. "the Salary System Fixer"].

GOAL:  
[One-sentence description of what you want done]

CONSTRAINTS:  
- The only source of truth is /specs/KBL_Guide_v2_Spec_Reconciliation.json + PROJECT_BIBLE.md  
- Quote the exact correction ID(s) and spec_correct value for every change  
- Only edit the files listed in those IDs  
- Work directly on the main branch (no new worktrees)  
- Use Mini model for speed

FORMAT:  
1. Files changed  
2. Corrections applied (list by ID)  
3. Verification (tests run + results)  
4. "[Task name] complete"

FAILURE:  
- If anything is ambiguous → quote the exact section and ask for clarification  
- If you cannot open a file → stop and report the filename  
- Never summarize or batch changes

Use High reasoning effort. Think step-by-step.
```

## Workflow

### Step 1: Analyze Input
When user provides bugs/tasks:
1. Read the bug list completely
2. Count total bugs
3. Identify duplicates or related issues
4. Note any known limitations (skip these)

### Step 2: Categorize by Subsystem
Group bugs into logical categories:
- **Player Data** (lineups, rosters, stats)
- **Game State** (scoring, outs, innings)
- **Persistence** (saving, loading, history)
- **Simulation** (auto-games, schedules)
- **UI Display** (rendering, formatting)
- **Franchise Setup** (initialization, configuration)
- **Special Plays** (advanced game logic)
- **Fame/Narrative** (story systems)

### Step 3: Determine Dependencies
Map execution order:
1. **Foundation bugs first** (data loading, initialization)
2. **Core gameplay second** (game logic, state management)
3. **Persistence third** (save/load systems)
4. **Advanced features fourth** (special plays, narrative)
5. **Polish last** (UI, formatting, validation)

### Step 4: Create Prompts
For each group of related bugs:

**Define Role:**
- Specific and action-oriented
- Examples: "Pitcher Rotation Fixer", "Stadium Wiring Specialist"

**Write Goal:**
- Single sentence
- Clear success criteria
- Achievable in one session

**Set Context:**
- Current symptoms (what's broken)
- Investigation steps (how to find it)
- Expected root causes (hypotheses)

**Define Acceptance Criteria:**
- Use ✅ checkboxes
- 3-5 concrete, testable outcomes

**Specify Verification:**
- Step-by-step manual test procedure
- Expected results at each step
- Automated test commands

### Step 5: Size Check
Each prompt should address:
- **Maximum:** 3-5 related bugs
- **Implementation:** < 500 lines of code
- **Testing time:** < 30 minutes

If larger, split into multiple prompts.

## Prompt Sizing Rules

### Single Prompt (Good)
✅ 3-5 bugs in same subsystem  
✅ Shared root cause  
✅ < 500 lines of code  
✅ Clear dependencies  
✅ Testable in one session  

### Multiple Prompts (Required)
❌ Bugs span multiple subsystems  
❌ > 500 lines of implementation  
❌ Testing > 30 minutes  
❌ Complex interdependencies  

## Output Structure

Always provide:

### 1. Bug Analysis Table
```markdown
| ID | Bug | Category | Severity | Status |
|----|-----|----------|----------|--------|
| B-001 | Description | Category | Critical/Major/Minor | Unknown |
```

### 2. Categorization
Group bugs by subsystem with priority levels:
- ⚠️ CRITICAL (breaks core gameplay)
- 🔶 MAJOR (missing features)
- 🔵 MINOR (polish, formatting)

### 3. Execution Plan
```
PHASE 1: Foundation (MUST FIX FIRST)
  FP-001: Prompt Name
  FP-002: Prompt Name

PHASE 2: Core Gameplay (FIX SECOND)
  FP-003: Prompt Name
```

### 4. Individual Prompts
Full prompt text for each, following the core template exactly.

### 5. Master Plan Document
Summary showing:
- Total bugs addressed
- Execution order diagram
- Progress checklist
- Recommended strategy (sequential vs parallel)

## Quality Checklist

Before finalizing prompts, verify:
- [ ] Each prompt has clear, testable goal
- [ ] Role is specific and descriptive
- [ ] Constraints match template exactly
- [ ] Output format is standardized
- [ ] Failure modes are explicit
- [ ] Related bugs grouped together
- [ ] Execution order is logical
- [ ] Each prompt is independently executable
- [ ] Total prompts < 15 (if more, refactor)
- [ ] All deliverable files created

## Common Pitfalls to Avoid

❌ **Don't:**
- Combine unrelated bugs
- Write vague goals ("fix all the things")
- Omit verification steps
- Skip spec reconciliation reference
- Assume Codex will "figure it out"

✅ **Do:**
- Keep prompts focused and atomic
- Write specific, measurable goals
- Require explicit test verification
- Force citation of spec corrections
- Build in error handling

## Example Output

When user says "create prompts for these bugs":

**You should deliver:**
1. `bug-analysis.md` - Full categorization table
2. `FP-001-prompt-name.md` - First prompt (ready to copy-paste)
3. `FP-002-prompt-name.md` - Second prompt
4. ... (one file per prompt)
5. `MASTER_PROMPT_PLAN.md` - Execution strategy and progress tracker

**Each prompt file contains:**
- Bugs addressed section
- Full Codex prompt (copy-paste ready)
- Follows template exactly
- Has context, criteria, verification

## Advanced: Skill Creation

If user requests many prompts (> 10), offer to:
1. Create this skill as a user skill file
2. Save to `/mnt/skills/user/codex-prompt-contract/SKILL.md`
3. Enable for future use in all sessions

This ensures consistency across large refactoring projects.

## Real-World Example

**User Input:**
"Create bug fix prompts for: pitcher pitches not recording, lineups are static, roster view missing pitchers"

**Your Output:**
```markdown
# FP-003: Player Data Loading

## Bugs Addressed
- B-001: Pitcher pitches not recording
- B-003: Lineups static in pre-game
- B-027: No pitchers in roster view

---

You are the Player Data Loading Specialist.

GOAL:  
Fix player data flow so pitcher pitch counts accumulate correctly, pre-game lineups are dynamic, and all player types display in roster views.

CONSTRAINTS:  
- The only source of truth is /specs/KBL_Guide_v2_Spec_Reconciliation.json + PROJECT_BIBLE.md  
...
```

## Success Metrics

A good set of prompts should:
- Break 20+ bugs into 5-15 manageable prompts
- Have clear execution order
- Be independently executable
- Require < 3 days each to implement
- Have explicit verification steps
- Cite spec corrections
- Never assume or batch changes

This skill ensures Codex receives precise, actionable instructions that respect the codebase spec and prevent scope creep.
