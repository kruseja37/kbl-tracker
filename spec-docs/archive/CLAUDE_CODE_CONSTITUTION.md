# KBL Tracker Implementation Constitution

## Read This First, Every Session

This file defines the rules for implementing user stories in the KBL Tracker project.

---

## Required Plugins

Ensure these are installed before implementing UI stories:

```bash
# Verify with /plugin to see installed plugins
/plugin install frontend-design@claude-code-plugins
```

**For UI stories:** Invoke the frontend-design skill for component generation. This produces production-quality UI that avoids generic AI aesthetics.

---

## Core Principles

### 1. One Story at a Time
- Work on exactly ONE user story per session
- Do not scope creep into adjacent features
- If you discover related work needed, note it and continue with current story

### 2. Verify Before Claiming Done
- Run the app after every meaningful change
- Manually test each acceptance criterion
- Do not output completion promise until ALL criteria verified

### 3. Small Commits, Clear Messages
- Commit after each working increment
- Format: `[STORY_ID] Brief description of change`
- Example: `[S-001] Add amount input field with placeholder`

### 4. When Stuck, Document and Signal
- Try at least 3 different approaches before declaring blocked
- Document what was tried and why it failed
- Output: `<promise>[STORY_ID]_BLOCKED: [specific reason]</promise>`

---

## Implementation Workflow

```
1. READ story and acceptance criteria completely
2. IDENTIFY files to create/modify
3. IMPLEMENT smallest working increment
4. RUN app and verify change works
5. COMMIT if working
6. REPEAT steps 3-5 until all criteria pass
7. VERIFY all criteria one final time
8. OUTPUT completion promise
```

---

## File Patterns

### New Component
```
src/components/[FeatureName]/
  ├── [ComponentName].tsx    # Main component
  ├── [ComponentName].css    # Styles (if not using Tailwind)
  └── index.ts               # Export
```

### Modifying Existing
- Check existing patterns in similar components first
- Match naming conventions, prop patterns, styling approach
- Don't introduce new patterns without explicit instruction

---

## Acceptance Criteria Verification

For each criterion, you must:
1. Reproduce the "Given" state
2. Perform the "When" action
3. Observe the "Then" outcome
4. Follow the "Verify" steps exactly

Only mark criterion as PASS if observed outcome matches expected outcome exactly.

---

## Completion Promises

| Outcome | Promise | When to Use |
|---------|---------|-------------|
| Success | `<promise>[STORY_ID]_COMPLETE</promise>` | ALL criteria verified passing |
| Blocked | `<promise>[STORY_ID]_BLOCKED: reason</promise>` | Tried 3+ approaches, cannot proceed |
| Need Info | `<promise>[STORY_ID]_NEEDS_CLARIFICATION: question</promise>` | Ambiguity prevents implementation |

---

## Anti-Patterns (Do Not Do)

- ❌ Implementing features not in current story
- ❌ Refactoring unrelated code
- ❌ Adding "improvements" beyond acceptance criteria
- ❌ Claiming complete without running the app
- ❌ Skipping verification steps
- ❌ Making architectural decisions not specified in story

---

## When Acceptance Criteria Seem Wrong

If criteria seem incorrect or impossible:
1. Attempt to implement as written first
2. If truly impossible, document why
3. Output NEEDS_CLARIFICATION with specific question
4. Do NOT reinterpret criteria on your own

---

## Spec Doc Updates

After completing ANY story:
1. Update `spec-docs/CURRENT_STATE.md` with what was implemented
2. Add entry to `spec-docs/SESSION_LOG.md`
3. Note any discoveries or gotchas encountered

---

## Quick Reference: Story Size Validation

Before starting implementation, verify:
- [ ] Story has ≤ 3 acceptance criteria
- [ ] Estimated < 200 lines of code
- [ ] No architectural decisions required
- [ ] End state is clearly testable

If story fails these checks → STOP and request story be split.
