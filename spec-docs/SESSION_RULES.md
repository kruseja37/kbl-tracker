# KBL TRACKER — SESSION RULES
# Created: 2026-02-17
# These rules are non-negotiable. They apply to every session, every AI, every change.

---

## SESSION START PROTOCOL (Every Single Session)

Before any work begins, Claude MUST read these files in order:
1. `spec-docs/SESSION_RULES.md` (this file)
2. `spec-docs/AUDIT_LOG.md` (where we are in the audit)
3. `spec-docs/AUDIT_PLAN.md` (what we're doing and how)
4. `spec-docs/SESSION_LOG.md` (what happened last session)
5. `spec-docs/CURRENT_STATE.md` (overall app state)

After reading, Claude MUST restate:
- Current audit phase and status
- What was last completed
- What the next action is

John confirms or corrects before any work starts.

---

## THE NEGATIVE FEEDBACK LOOP (NFL) — MANDATORY

After any code change, analysis, or task completion:

1. **Actively try to disprove success** — attempt to break, falsify, or find gaps
2. **Test edge cases** — boundary conditions, unusual inputs, failure modes
3. **Verify assumptions** — question every assumption made
4. **Document findings** — record what was tested and what passed/failed
5. **Iterate until unfalsifiable** — only stop when you cannot find a way to disprove correctness

Do NOT declare completion until the NFL is exhausted OR John explicitly permits moving on.

---

## EVIDENCE OVER ASSERTION

- Reading code and thinking it looks correct ≠ confirmed working
- A grep result, build output, test pass, or browser verification = confirmed
- "It should work" is not a verification method
- If something cannot be verified right now → status is UNVERIFIED, not CONFIRMED

---

## SCOPE DISCIPLINE

- Complete tasks to their full scope as requested
- Never silently reduce scope
- If a task is extensive, communicate the effort required BEFORE adjusting approach
- Always confirm before modifying task parameters
- If it's not in a file, it doesn't exist — write decisions to spec-docs before session ends

---

## CODE CHANGE RULES

Every Codex prompt must include:
1. Exact role assignment
2. Single clear goal
3. Exact files to touch
4. Exact files NOT to touch
5. Source of truth reference (spec doc or finding ID)
6. Expected output / verification command
7. Hard stop instructions for ambiguity

After every Codex change:
- [ ] `npm run build` passes
- [ ] Relevant tests pass
- [ ] Expected output matches actual output
- [ ] John confirms behavior in browser before ticket closes

If Codex output doesn't match expected → change is NOT applied. Start over with a more precise prompt.

---

## THE PROMPT CONTRACT TEMPLATE (Standard for All Codex Prompts)

```
You are [Specific Role].

GOAL:
[One sentence. What exactly needs to be done.]

SOURCE OF TRUTH:
[Exact spec doc, finding ID, or file that defines correct behavior]

CONSTRAINTS:
- Only edit these files: [list exact paths]
- Do NOT touch: [list exact paths]
- Quote the exact finding/spec ID for every change you make
- Work directly on main branch (no new worktrees)
- [Any other hard constraints]

EXPECTED OUTPUT:
[Exactly what the code should look like / do after this change]

VERIFICATION:
[Exact command to run to confirm the change worked, e.g., npm run build, specific grep, specific test]

FORMAT:
1. Files changed (list exact paths)
2. Changes made (describe each, reference finding/spec ID)
3. Verification result (paste exact output)
4. "[Task name] complete" OR "BLOCKED: [exact reason]"

FAILURE PROTOCOL:
- If anything is ambiguous → quote the exact section and ask for clarification
- If you cannot open a file → stop and report the filename
- If a change would require touching a file not listed above → stop and report
- Never summarize or batch changes
- Never assume intent — ask

Use high reasoning effort. Think step-by-step.
```

---

## SESSION END PROTOCOL (Every Single Session)

Before ending any session, Claude MUST:
- [ ] Log all findings from this session in AUDIT_LOG.md
- [ ] Update AUDIT_LOG.md phase status tracker
- [ ] Append to SESSION_LOG.md: what was done, decisions made, what's pending
- [ ] Update CURRENT_STATE.md if any status changed
- [ ] State clearly what the next session should start with

John must confirm docs are updated before closing the session.

---

## ACCOUNTABILITY ASSIGNMENTS

| Role | Responsibility |
|------|---------------|
| John (PM) | Manual browser verification, final approval on all changes, confirms docs are updated at session end |
| Claude (Captain) | Audit execution, Codex prompt writing, output verification, architectural decisions, session documentation |
| Codex | Implementation only — executes precise prompts, never makes architectural decisions |

---

## NON-NEGOTIABLE RULES (Cannot Be Overridden by Anyone)

1. No code changes without a finding or spec reference
2. No finding marked CONFIRMED without real verification
3. No session ends without spec-docs updated
4. No Codex prompt without expected output defined in advance
5. No "it looks right" — show the evidence
6. If the NFL finds a problem, the problem is logged before moving on — never buried

---

## Mandatory Documentation Cycle (Non-Negotiable)

Every diagnostic or audit cycle follows this exact order:
1. Run command batch → paste output
2. Claude produces AUDIT_LOG.md update with all new findings
3. JK commits updated AUDIT_LOG.md to main
4. Claude writes next command batch

Rules:
- Never write a second command batch before findings from the first are logged
- If JK pastes new CLI output without prior commit, Claude responds: "Log first" and produces the AUDIT_LOG update before anything else
- No finding exists until it is in AUDIT_LOG.md — chat is ephemeral, the log is permanent

---

## Documentation Routing Rules (Non-Negotiable)

### Finding Storage
- FINDING-001 through FINDING-055: full text in `spec-docs/AUDIT_LOG.md`
- FINDING-056 onwards: full text in `spec-docs/FINDINGS/FINDINGS_056_onwards.md`
- AUDIT_LOG.md contains one-line index entries only for FINDING-056+
- NEVER append full finding blocks to AUDIT_LOG.md again

### Index Entry Format (for AUDIT_LOG.md)
| FINDING-NNN | YYYY-MM-DD | STATUS | filename.ts | One-line summary |

### Full Finding Format (for FINDINGS_056_onwards.md)
```
### FINDING-NNN
**Date:** | **Phase:** | **Status:**
**File:**
**Evidence:**
**Impact:**
```

### SUBSYSTEM_MAP.md
- Update wiring status after every batch that changes a subsystem status
- Location: spec-docs/SUBSYSTEM_MAP.md
- Statuses: ✅ WIRED | ⚠️ PARTIAL | ❌ ORPHANED | 🔲 UNKNOWN | ❌ MISSING

### File Size Limits
- AUDIT_LOG.md: index only for 056+, should stay under 200 lines net new
- FINDINGS_056_onwards.md: when it exceeds 500 lines, create FINDINGS_072_onwards.md (or next batch number) and update this rule
- PHASE_SUMMARIES/: one file per phase, written at phase close

### Mandatory Cycle (repeated from above for emphasis)
Run commands → paste output → log findings to correct file → commit → next commands
