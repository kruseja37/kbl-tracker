# GameTracker Redesign Pipeline v3

**Created:** 2026-03-08 | **Revised:** 2026-03-08 (NFL pass applied)
**Philosophy:** Preserve what works. Change only what's broken or scoped. Approve before building.

---

## Pipeline

```
Phase 1                    Phase 2                    Phase 3
FUNCTIONAL AUDIT    →    SCOPE RESOLVER      →    DESIGN SPEC
(what code does)         (what should change)      (how to change it)

Claude Code | opus       Claude.ai + opus           Claude.ai + opus
~2-4 hours               ~2-4 sessions              ~3-4 sessions

Output:                  Output:                    Output:
FUNCTIONAL_TRUTH.md      SCOPE_LOCK.md              DESIGN_SPEC.md
  → JK reviews ✅          → JK locks 🔒              → JK approves ✅
  → CURRENT_STATE.md       → CURRENT_STATE.md         → CURRENT_STATE.md
```

**Hard gates:** Each phase needs previous phase output + JK approval. No shortcuts.

## Principles

1. **Preserve what works.** Default KEEP. Burden on CHANGE.
2. **Evidence over assertion.** Code:line and spec:§ citations required.
3. **Approve before building.** No code changes until design spec is ✅.
4. **Write as you go.** Docs during sessions, not after.
5. **NFL everything.** Try to disprove before declaring complete.

---

## Phase 1: Functional Audit

**Skill:** `spec-docs/skills/gametracker-functional-audit/SKILL.md`
**ROUTE:** Claude Code CLI | opus
**Duration:** 2-4 hours (537KB codebase with chunking protocol)

### Prompt:
```
Read spec-docs/skills/gametracker-functional-audit/SKILL.md and execute fully.

Project: /Users/johnkruse/Projects/kbl-tracker | Branch: main
Key: Use import-driven scope. Chunk files >20KB. Write incrementally.
     Cross-reference CURRENT_STATE.md UNVERIFIED list.
     Consume GAMETRACKER_BUILD_PLAN.md and GAMETRACKER_DELTA_REPORT.md if they exist.
Output: spec-docs/GAMETRACKER_FUNCTIONAL_TRUTH.md
Read-only — do not modify source files.
```

### Gate:
- [ ] FUNCTIONAL_TRUTH.md exists with Health Summary
- [ ] All phases populated (or PARTIAL with resume point)
- [ ] UNVERIFIED items from CURRENT_STATE.md are tagged ⚠️ UNKNOWN
- [ ] **JK confirms:** "Truth doc reviewed, proceed to scope resolution"
- [ ] CURRENT_STATE.md updated: "Phase: GameTracker Redesign — Functional Audit COMPLETE"

---

## Phase 2: Scope Resolver

**Skill:** `spec-docs/skills/gametracker-scope-resolver/SKILL.md`
**ROUTE:** Claude.ai for Q&A | Claude Code CLI | opus for synthesis
**Duration:** 2-4 sessions × 30-45 min

### Prompt:
```
Read spec-docs/skills/gametracker-scope-resolver/SKILL.md and execute.

Read ALL of:
1. spec-docs/GAMETRACKER_FUNCTIONAL_TRUTH.md
2. spec-docs/v1-simplification/MODE_2_V1_FINAL.md (ALL 25 sections — not just §1-§7)
3. spec-docs/MODE_2_FRANCHISE_SEASON_UPDATED.md (gospel context)

Build reconciliation matrix across UI, Engine, and Systems layers.
Present matrix summary before starting questions.
Support batch rulings for obvious groups.
Write rulings to working document after each answer.
```

### Gate:
- [ ] All matrix items have rulings
- [ ] Index.tsx monolith has explicit disposition ruling
- [ ] SCOPE_LOCK.md synthesized and presented
- [ ] **JK confirms:** "Scope locked" → 🔒 LOCKED
- [ ] CURRENT_STATE.md updated: "Phase: GameTracker Redesign — Scope Lock COMPLETE"

---

## Phase 3: Design Spec

**Skill:** `spec-docs/skills/gametracker-design-spec/SKILL.md` (integrates `frontend-design`)
**ROUTE:** Claude.ai for D1-D4/D8-D9 | CLI | opus for D5-D7
**Duration:** 3-4 sessions

### Prompts:

**D1-D4 (interactive):**
```
Read spec-docs/skills/gametracker-design-spec/SKILL.md. Execute D1-D4.
Start with D2.5 (index.tsx monolith disposition) — this is the #1 decision.
Audit existing visual patterns in src/styles and src_figma before proposing changes.
I approve every REFACTOR and REBUILD classification.
```

**D5-D7 (synthesis):**
```
Read skill. Execute D5-D7 from approved D1-D4 output.
Only document changes. Preserved = one-line reference.
Output: spec-docs/GAMETRACKER_DESIGN_SPEC.md (draft)
```

**D8-D9 (review):**
```
Walk me through ONLY the changes per D8 protocol.
Then D9: audit existing Tailwind/CSS patterns before proposing visual direction.
Speed-first: no animation >50ms.
```

### Gate:
- [ ] Component dispositions approved by JK
- [ ] Index.tsx disposition approved
- [ ] Layout changes approved
- [ ] Interaction changes approved
- [ ] Visual direction approved
- [ ] **JK confirms:** "Design approved" → ✅ APPROVED
- [ ] Migration checklist complete with effort estimates
- [ ] CURRENT_STATE.md updated: "Phase: GameTracker Redesign — Design Spec APPROVED"

---

## Document Chain

```
GAMETRACKER_FUNCTIONAL_TRUTH.md    → JK reviews ✅
GAMETRACKER_SCOPE_LOCK.md          → JK locks 🔒
GAMETRACKER_DESIGN_SPEC.md         → JK approves ✅
Targeted Code Changes              → only what's in the approved spec
```

## File Locations

Skills: `spec-docs/skills/gametracker-{functional-audit,scope-resolver,design-spec}/SKILL.md`
Outputs: `spec-docs/GAMETRACKER_{FUNCTIONAL_TRUTH,SCOPE_LOCK,DESIGN_SPEC}.md`
Working: `spec-docs/GAMETRACKER_SCOPE_LOCK_WORKING.md` (during Phase 2)

## Timeline

| Phase | Agent Time | JK Time | Gate |
|-------|-----------|---------|------|
| Functional Audit | 2-4 hrs | 15-30 min review | "Truth reviewed" |
| Scope Resolver | 2-4 sessions | 2-3 hrs Q&A | "Scope locked" |
| Design Spec | 3-4 sessions | 1.5-2 hrs review | "Design approved" |
| **Total** | **~1-2 weeks** | **~5-6 hrs JK** | 3 explicit gates |

## NFL Checklist — Applied During Skill Creation

Failure modes found and fixed in v3:
- [x] F1: Skill 2 only covered §1-§7 → now covers ALL 25 sections
- [x] F2: Only index.tsx had chunking protocol → all files >20KB chunked
- [x] F3: 1:1 code:spec assumed → multi-file mapping supported
- [x] F4: Static scope list → import-driven scope determination
- [x] F5: No intermediate outputs → write every 5 files
- [x] F6: No JK review guidance → Review Guide section added
- [x] F7: Working doc write mechanism unclear → clarified per environment
- [x] F8: Index.tsx monolith not addressed → explicit D2.5 disposition phase
- [x] F9: Existing reports ignored → pre-flight consumes BUILD_PLAN, DELTA_REPORT
- [x] F10: No existing design audit → D9 starts with pattern extraction
- [x] F11: No batch rulings → batch support added
- [x] F12: Optimistic estimates → 2-4 hours for Phase 1 (was 60-90 min)
- [x] F13: No CURRENT_STATE.md updates → added to every gate
