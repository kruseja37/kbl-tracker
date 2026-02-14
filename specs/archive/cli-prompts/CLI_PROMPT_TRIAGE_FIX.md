# CLI Prompt — Triage-Aware Fix Execution

Paste the prompt below into Claude CLI. The user has triaged AUDIT_TRIAGE.xlsx.

---

```
Run batch-fix-protocol on the triaged audit findings.

CRITICAL — READ THESE RULES BEFORE DOING ANYTHING:

1. Read the batch-fix-protocol skill file FIRST.
2. Read spec-docs/AUDIT_TRIAGE.xlsx using openpyxl. It has 353 rows across 11 columns (A-K):
   - A: ID, B: Severity, C: Batch, D: Spec, E: Code Location
   - F: Spec Says, G: Code Says, H: Recommended Fix
   - I: My Triage (pre-categorized), J: Triage Reason, K: Your Decision

3. HOW TO DETERMINE WHAT TO DO WITH EACH ROW:

   Column K ("Your Decision") OVERRIDES column I ("My Triage") when filled in.

   Decision rules — check column K first, fall back to column I:

   | Column K (Your Decision) | Column I (My Triage) | Action |
   |--------------------------|---------------------|--------|
   | "FIX CODE"               | (any)               | FIX the code to match spec. Read column H for approach — user may have edited it. |
   | "UPDATE SPEC"            | (any)               | Do NOT change code. Log in "Spec Updates Needed" section of fix report. |
   | "SKIP"                   | (any)               | Do nothing. Skip entirely. |
   | "SKIP (SEE OTHER DECISION)" | (any)            | Skip — handled by another finding. |
   | (blank)                  | "FIX CODE"          | FIX the code. Trust the pre-category. |
   | (blank)                  | "FEATURE BUILD"     | BUILD the feature. Trust the pre-category. |
   | (blank)                  | "DOC ONLY"          | Update spec/docs only. Log in "Spec Updates Needed" section. |
   | (blank)                  | "DEFER"             | Log as deferred in fix report. Do NOT fix now. |
   | (blank)                  | "SKIP"              | Skip — these are verified-correct items. |
   | (blank)                  | "NEEDS YOUR CALL"   | STOP and ask the user. Do NOT guess. |

   IMPORTANT: Nothing is skipped unless the user explicitly wrote "SKIP" in column K,
   OR column I says "SKIP" (verified matches), OR column I says "DEFER".

4. TRIAGE SPREADSHEET IS THE AUTHORITY — NOT THE SPEC DOCS.
   The user edited columns F ("Spec Says"), G ("Code Says"), and H ("Recommended Fix")
   to add clarity and override original spec language. When fixing code or updating docs:

   a) For FIX CODE items: Column F ("Spec Says") is the AUTHORITATIVE requirement.
      Make the code match column F. If column F in the spreadsheet differs from the
      spec doc on disk, UPDATE THE SPEC DOC to match the spreadsheet too.
      The user's edits to column F are intentional refinements.
   b) For UPDATE SPEC items: Column G ("Code Says") is the AUTHORITATIVE truth.
      Keep the code as-is. Update the spec doc to reflect what column G describes.
      Column F shows the old/wrong spec language being replaced.
   c) Column H ("Recommended Fix") is the AUTHORITATIVE approach for ALL items.
      Follow it over any other suggestion. The user may have rewritten it.

   Key user edits to watch for:
   - CRIT-B6-005: Farm max=10 with release modal for draft/trade/sign
   - CRIT-B9-007: Changed threshold from 50% to 20%
   - MIS-B11-002: "use salary system algorithm" instead of hardcoded values
   - MIS-B14-001: "weight for number of innings/game in league builder setup"
   - MAJ-B5-008: "rank-based PLUS OTHER SPEC factors"
   - Multiple other rows may have been edited — ALWAYS read F/G/H from the spreadsheet,
     do NOT assume the original audit text is unchanged.

5. EXECUTION ORDER — process in this sequence:
   Phase A: Code Fixes (Column K = "FIX CODE" or blank + Column I = "FIX CODE")
     - Tier 1 (CRITICAL): ONE fix at a time, verify after each
     - Tier 2 (MAJOR): batches of 3, verify after each batch
     - Tier 3 (MINOR/MISMATCH): batches of 5, verify after each batch
   Phase B: Feature Builds (blank + Column I = "FEATURE BUILD")
     - Group by related spec area
     - Build in logical dependency order
     - ONE feature at a time for large features, batches of 3 for small ones
   Phase C: Spec Updates (Column K = "UPDATE SPEC" or blank + Column I = "DOC ONLY")
     - Batch all spec updates together
     - These are documentation-only changes, no code changes

6. VERIFICATION after each fix or batch:
   - Run `tsc -b` (must pass with 0 errors)
   - Run `npm test` (must not drop below baseline)
   - If either fails, STOP and fix the regression before continuing
   - Record test count in fix report

7. TRACKING — maintain spec-docs/FIX_EXECUTION_REPORT_[DATE].md with:
   - Finding IDs fixed (with checkmarks)
   - What code was changed (file:line)
   - Test results after each batch
   - "Spec Updates Needed" section for UPDATE SPEC items
   - "Deferred Items" section for DEFER items

8. SAFETY:
   - If a fix seems risky or could break other functionality, STOP and ask
   - If you're unsure about a user-edited Recommended Fix, STOP and ask
   - If any blank + "NEEDS YOUR CALL" row exists, STOP and ask — don't guess
   - Never change code for UPDATE SPEC or DOC ONLY items

9. SESSION REPORTING — at end of each session:
   - Total items: N (by action type)
   - Completed this session: N
   - Remaining: N
   - Test baseline: before → after
   - TypeScript errors: before → after
   - Which items to tackle next session

10. CONTEXT BUDGET: This is a LOT of work (85+ code fixes, 125 feature builds, 86 doc updates).
    You will NOT finish in one session. Prioritize:
    1st: CRITICAL code fixes (user-approved, ~10 items)
    2nd: MAJOR code fixes (~50 items)
    3rd: MINOR/MISMATCH code fixes (~25 items)
    4th: Feature builds by dependency (start with engines, then UI)
    5th: Spec/doc updates (batch at end)

    At end of session, update spec-docs/SESSION_LOG.md and spec-docs/CURRENT_STATE.md.

Start by reading AUDIT_TRIAGE.xlsx and producing a count of items per action type and tier.
Then ask the user to confirm before starting Phase A.
```

---

## Quick Reference for User

**Your triage decisions (30 items filled in):**
- FIX CODE: 22 items (explicit approval)
- UPDATE SPEC: 6 items (CRIT-B5-001 FA dice, MIS-B11-003, MIN-B2-001, MIN-B10-001, MAJ-B3-002, MAJ-B4-003)
- SKIP: 2 items (CRIT-B8-002, MIS-B13-001)

**Pre-categorized (323 blank items, auto-actioned by My Triage):**
- FIX CODE: 63 items → will be fixed
- FEATURE BUILD: 125 items → will be built
- DOC ONLY: 86 items → spec updates only
- DEFER: 40 items → logged, not fixed now
- SKIP: 4 items → verified correct, no action
- NEEDS YOUR CALL: 5 items → CLI will ask you

**Total work breakdown:**
- Phase A (Code Fixes): ~85 items
- Phase B (Feature Builds): ~125 items
- Phase C (Spec Updates): ~92 items
- Deferred: ~40 items
- Skip: ~6 items
