# V1 CODE ALIGNMENT PLAN

## Purpose
After the four v1 specs are finalized (Phase B complete), this plan governs the systematic process of aligning the codebase to match ONLY the v1 specs — verifying what exists, flagging what's missing, and quarantining v2 code.

## Prerequisites
- [ ] `MODE_1_V1_FINAL.md` exists and is approved
- [ ] `MODE_2_V1_FINAL.md` exists and is approved
- [ ] `MODE_3_V1_FINAL.md` exists and is approved
- [ ] `ALMANAC_V1_FINAL.md` exists and is approved
- [ ] `V2_DEFERRED_BACKLOG.md` exists and is complete

---

## Phase C.1: Section-to-Code Mapping

For each section of each v1 spec, produce a mapping:

```markdown
### §[N] — [Section Title]
**v1 Spec Says:** [1-2 sentence summary of what should exist]

**Code Status:**
- [ ] Component(s): [file paths or "MISSING"]
- [ ] Data model: [file paths or "MISSING"]
- [ ] Logic/engine: [file paths or "MISSING"]
- [ ] Tests: [file paths or "MISSING"]

**Assessment:** COMPLETE / PARTIAL / MISSING / HAS V2 EXTRAS

**If PARTIAL:** [what's missing]
**If HAS V2 EXTRAS:** [what code exists beyond v1 scope]
```

### Process
1. Read the v1 spec section
2. Search codebase for relevant files (components, hooks, engines, types)
3. Read the actual code (not just filenames)
4. Compare what the code does to what the spec requires
5. Record the mapping

### Output
One mapping document per mode: `MODE_[N]_CODE_MAP.md`

---

## Phase C.2: V2 Code Quarantine

For any code identified as beyond v1 scope:

### Quarantine Rules
1. **Do NOT delete v2 code** — move it to a parallel directory structure
2. Create `src/v2-deferred/` mirroring the original directory structure
3. For each moved file, leave a stub in the original location:
   ```typescript
   // V2 DEFERRED — Original moved to src/v2-deferred/[path]
   // Feature: [name]
   // Reason: [why deferred]
   // Restore when: [what v2 milestone]
   export {}; // or minimal stub if other v1 code imports from here
   ```
4. If v2 code is mixed INTO a v1 file (not a separate file):
   - Comment-block the v2 sections with `// V2-START` and `// V2-END` markers
   - Do NOT extract into separate files if it would break the v1 logic
5. Update imports everywhere to not reference removed v2 modules

### Quarantine Checklist Per File
- [ ] Identified as v2 by code mapping
- [ ] Confirmed no v1 code depends on it
- [ ] Moved to `v2-deferred/` with original path preserved
- [ ] Stub left in original location
- [ ] All imports updated
- [ ] Build passes after move
- [ ] No runtime errors in affected v1 features

### Output
`V2_QUARANTINE_LOG.md` — every file moved, why, and what stub was left.

---

## Phase C.3: V1 Gap Analysis

After mapping and quarantine, identify what's MISSING for v1:

```markdown
### GAP #[N]
**Spec Section:** [Mode] §[Section]
**What's Required:** [description]
**What Exists:** [nothing / partial — describe]
**Build Effort:** [Small / Medium / Large]
**Dependencies:** [what else must exist first]
**Suggested Ticket:** [one-line description for a build task]
```

### Prioritization
Group gaps into:
- **P0 — Blocking:** App doesn't function without this
- **P1 — Core:** Feature exists but is incomplete
- **P2 — Polish:** Feature works but doesn't match spec quality

### Output
`V1_BUILD_TICKETS.md` — ordered list of build work needed to complete v1.

---

## Phase C.4: Verification

After quarantine and gap-filling:

1. `npm run build` — must pass clean
2. Run full test suite — document any new failures
3. Manual verification of core flows:
   - Create a franchise (Mode 1 flow)
   - Track a game (Mode 2 core)
   - View stats/standings (Mode 2 displays)
   - Run offseason (Mode 3 phases that are v1)
   - Browse almanac (Almanac views)
4. Each flow verified by JK in browser before marking complete

---

## Execution Approach

### Recommended: One Mode at a Time
1. Map Mode 2 → Quarantine Mode 2 v2 → Verify Mode 2 v1
2. Map Mode 1 → Quarantine Mode 1 v2 → Verify Mode 1 v1
3. Map Mode 3 → Quarantine Mode 3 v2 → Verify Mode 3 v1
4. Map Almanac → Quarantine Almanac v2 → Verify Almanac v1
5. Full integration verification

### Agent Routing for Code Work
All code changes during alignment should follow:
- **Mapping & analysis:** Claude chat (this kind of session)
- **File moves & quarantine:** Claude Code CLI | sonnet (straightforward file operations)
- **Import rewiring:** Codex | 5.1 mini | medium (scoped, single-concern changes)
- **Gap-filling builds:** Route per complexity using standard routing rules
- **State/persistence gaps:** Codex | 5.3 | high minimum (per session rules)
