# Ralph-Style Development Framework for KBL Tracker

## Purpose
This framework structures development work into small, testable units that can be implemented iteratively with minimal back-and-forth. Each unit is designed to be completable within a single AI context window.

---

## Prerequisites

Before implementing UI stories, ensure these are installed in Claude Code:

```bash
# Add official Anthropic marketplace
/plugin marketplace add anthropics/claude-code

# Install frontend design plugin (for quality UI generation)
/plugin install frontend-design@claude-code-plugins

# Optional: Install Ralph for autonomous loops
/plugin install ralph-wiggum@claude-plugins-official
```

The **frontend-design plugin** generates production-grade UI that avoids generic AI aesthetics. Use it for all UI component stories.

---

## 1. PRD (Product Requirement Document) Template

For each feature/component, create a PRD section following this structure:

```markdown
## [FEATURE_ID]: [Feature Name]

### Overview
[2-3 sentences describing what this feature does and why it exists]

### User Problem
[What problem does this solve for the user?]

### Success Metrics
- [ ] [Measurable outcome 1]
- [ ] [Measurable outcome 2]

### Scope
**In Scope:**
- [Specific item 1]
- [Specific item 2]

**Out of Scope:**
- [Explicitly excluded item 1]
- [Explicitly excluded item 2]

### Dependencies
- [Other features/components this depends on]
- [External libraries or APIs needed]

### Technical Constraints
- [Framework: e.g., React, specific UI library]
- [Data format requirements]
- [Performance requirements]
```

---

## 2. User Story Template

Each story must be **small enough to complete in one context window** (roughly 30-60 minutes of implementation work).

### Story Format
```markdown
## [STORY_ID]: [Short Descriptive Title]

**Parent Feature:** [FEATURE_ID]

**As a** [user type]
**I want to** [action/capability]
**So that** [benefit/outcome]

### Size Check ✓
- [ ] Can be implemented in < 200 lines of code
- [ ] Has no more than 3 acceptance criteria
- [ ] Does not require architectural decisions
- [ ] Has clear, testable end state

### Technical Notes
[Any specific implementation hints or constraints - keep brief]
```

### Story Sizing Rules
| Size | Lines of Code | Criteria Count | Action |
|------|---------------|----------------|--------|
| ✅ Good | < 200 | 1-3 | Proceed |
| ⚠️ Medium | 200-400 | 4-5 | Consider splitting |
| ❌ Too Big | > 400 | > 5 | Must split |

---

## 3. Acceptance Criteria Template

Criteria must be **objectively verifiable**—no subjective language like "looks good" or "works well."

### Criteria Format
```markdown
### Acceptance Criteria for [STORY_ID]

**AC-1: [Criterion Name]**
- **Given:** [Initial state/precondition]
- **When:** [Action taken]
- **Then:** [Expected observable outcome]
- **Verify:** [Exact steps to confirm - what to click, what to see]

**AC-2: [Criterion Name]**
- **Given:** [Initial state/precondition]
- **When:** [Action taken]
- **Then:** [Expected observable outcome]
- **Verify:** [Exact steps to confirm]

**AC-3: [Criterion Name]**
- **Given:** [Initial state/precondition]
- **When:** [Action taken]
- **Then:** [Expected observable outcome]
- **Verify:** [Exact steps to confirm]
```

### Criteria Quality Checklist
- [ ] Uses specific, measurable language
- [ ] No subjective terms (good, nice, clean, proper)
- [ ] Includes exact verification steps
- [ ] References specific UI elements or data values
- [ ] Can be verified by someone unfamiliar with the project

---

## 4. Implementation Prompt Template

Use this prompt format when feeding stories to Claude Code:

```markdown
## Implementation Task: [STORY_ID]

### Plugins Required
- frontend-design@claude-code-plugins (for UI components)

### Context
[Brief context about the project state - what exists, what doesn't]

### Story
[Paste the full user story]

### Acceptance Criteria
[Paste all acceptance criteria]

### Files to Create/Modify
- [ ] [filepath 1]
- [ ] [filepath 2]

### Completion Promise
When ALL acceptance criteria pass verification:
Output: <promise>[STORY_ID]_COMPLETE</promise>

If blocked after reasonable attempts:
Output: <promise>[STORY_ID]_BLOCKED: [reason]</promise>

### Iteration Guidance
- Use frontend-design plugin for UI component generation
- Run the app after each change to verify
- If a criterion fails, fix before moving to next
- Commit working increments
- Document any discoveries in comments
```

---

## 5. Story Breakdown Patterns

### UI Component Stories (typical split)
1. **Static Structure** - HTML/JSX structure with placeholder data
2. **Styling** - CSS/Tailwind to match design
3. **State Management** - Local state, handlers
4. **Data Integration** - Connect to real data/store
5. **Validation/Error States** - Edge cases, error handling

### Form Stories (typical split)
1. **Form Layout** - Fields rendered, no logic
2. **Input Handling** - Controlled inputs, local state
3. **Validation** - Rules and error messages
4. **Submission** - API/store integration
5. **Feedback** - Success/error states, loading

### List/Table Stories (typical split)
1. **Static List** - Render with mock data
2. **Data Binding** - Connect to real data source
3. **Sorting/Filtering** - Interactive controls
4. **Row Actions** - Edit, delete, expand
5. **Empty/Loading States** - Edge case handling

---

## 6. Definition of Done

A story is DONE when:
- [ ] All acceptance criteria pass verification
- [ ] Code is committed with descriptive message
- [ ] No console errors or warnings
- [ ] Component renders without crashing
- [ ] Basic responsive behavior works (if applicable)
- [ ] CURRENT_STATE.md updated with what was implemented

---

## 7. Anti-Patterns to Avoid

### ❌ Vague Stories
> "As a user, I want a good transaction form"

### ✅ Specific Stories
> "As a user, I want to enter a transaction amount using a numeric input field so that I can record how much I spent"

### ❌ Subjective Criteria
> "The form should look nice and be easy to use"

### ✅ Objective Criteria
> "Given the form is displayed, When I view it on a 375px wide screen, Then all fields are visible without horizontal scrolling"

### ❌ Too-Big Stories
> "Implement the complete transaction entry system"

### ✅ Right-Sized Stories
> "Render the amount input field with currency formatting"

---

## 8. Completion Promises Reference

Use these exact strings for Ralph-style loops:

| Outcome | Promise Format |
|---------|----------------|
| Success | `<promise>[STORY_ID]_COMPLETE</promise>` |
| Blocked | `<promise>[STORY_ID]_BLOCKED: [reason]</promise>` |
| Needs Input | `<promise>[STORY_ID]_NEEDS_CLARIFICATION: [question]</promise>` |

---

## Appendix: Example Full Chain

### PRD
```
## F-001: Transaction Entry

### Overview
Allow users to manually enter daily transactions with amount, category, and optional notes.

### User Problem
Users need to record spending quickly without friction.

### Success Metrics
- [ ] User can enter a transaction in < 30 seconds
- [ ] All required fields are validated before save

### Scope
**In Scope:** Amount input, category selection, notes field, save action
**Out of Scope:** Receipt scanning, recurring transactions, bulk import

### Dependencies
- Category data from store
- Transaction storage mechanism

### Technical Constraints
- React functional components
- Tailwind CSS for styling
- Local state (no external state management yet)
```

### User Story
```
## S-001: Transaction Amount Input

**Parent Feature:** F-001

**As a** user entering a transaction
**I want to** type a dollar amount into a numeric field
**So that** I can record how much I spent

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state
```

### Acceptance Criteria
```
### Acceptance Criteria for S-001

**AC-1: Amount Field Renders**
- **Given:** The transaction form component is mounted
- **When:** The page loads
- **Then:** A text input with placeholder "$0.00" is visible
- **Verify:** Open app, navigate to transaction entry, confirm input exists

**AC-2: Numeric Input Only**
- **Given:** The amount field is focused
- **When:** User types "abc"
- **Then:** The field remains empty (no characters appear)
- **Verify:** Focus field, type letters, confirm no input accepted

**AC-3: Decimal Formatting**
- **Given:** The amount field has value "1234"
- **When:** User clicks out of the field (blur)
- **Then:** The displayed value is "$12.34"
- **Verify:** Type "1234", click elsewhere, confirm formatted display
```
