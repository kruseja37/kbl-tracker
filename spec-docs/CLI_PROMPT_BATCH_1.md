# CLI Prompt — Exhaustive Spec Audit: Batch 1

Paste the following into Claude CLI to kick off Batch 1:

---

```
Run the exhaustive-spec-auditor skill. This is the FIRST session — Batch 1 (WAR Calculations).

IMPORTANT RULES — read these BEFORE doing anything:
1. Read SKILL.md from .claude/skills/exhaustive-spec-auditor/ FIRST. Follow it exactly.
2. This batch is HEAVY (WAR calculators have large implementing files). Process ONE spec at a time.
3. Do NOT read test files unless needed to resolve a specific ambiguity.
4. Do NOT read the entire SPEC_MANIFEST.md — read ONLY the Batch 1 section.
5. If you find a contradiction between specs, STOP and ask me before continuing.
6. After EACH spec, write findings to spec-docs/EXHAUSTIVE_AUDIT_FINDINGS.md and update spec-docs/EXHAUSTIVE_AUDIT_PROGRESS.md. Do NOT batch these writes.
7. If context runs low, STOP at the current spec boundary, save all progress, and report what's done vs remaining.

Your deliverables for this session:
- All 5 Batch 1 specs audited (or as many as context allows)
- Each spec classified as MATCH/MISMATCH/GAP per claim
- EXHAUSTIVE_AUDIT_PROGRESS.md updated with per-spec status
- EXHAUSTIVE_AUDIT_FINDINGS.md updated with any MISMATCH/GAP/UNDOCUMENTED findings
- End-of-batch summary: "Batch 1 complete. X matches, Y mismatches, Z gaps, W contradictions."

Batch 1 specs (WAR Calculations):
1. BWAR_CALCULATION_SPEC.md
2. PWAR_CALCULATION_SPEC.md
3. FWAR_CALCULATION_SPEC.md
4. RWAR_CALCULATION_SPEC.md
5. MWAR_CALCULATION_SPEC.md

Start now. Read the skill file, then read the progress tracker, then begin with spec 1.
```
