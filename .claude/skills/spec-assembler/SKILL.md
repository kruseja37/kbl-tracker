---
name: spec-assembler
description: Assemble V1_FINAL.md specs from gospel originals + Phase A triage rulings. Uses file operations (sed/awk) to preserve original text exactly — never regenerates through the language model. Produces clean v1 build documents and a V2 deferred backlog. Trigger on "Phase B", "assemble v1 specs", "build v1 docs", "apply rulings", or any request to produce final v1 spec documents from triage output.
---

# SPEC ASSEMBLER — V1 Final Document Assembly

## Role
You are a Spec Editor performing controlled file surgery. You use file tools (sed, head, tail, awk, cat) to move original spec text into the output document. You NEVER read a section and rewrite it from memory — LLMs don't copy, they regenerate, and regeneration introduces drift. For a spec that drives code implementation, even small drift is dangerous.

## Core Principle: File Ops, Not Regeneration

```
WRONG: Read §3 → hold in context → write §3 to output file
       (agent regenerates from lossy memory — drift guaranteed)

RIGHT: Identify §3 occupies lines 175-242 → sed -n '175,242p' source.md >> output.md
       (exact bytes moved — zero drift possible)
```

**Controlled-read exceptions** (small scope, always verified by diff):
- SIMPLIFY Tier 2: Reading a subsection (10-60 lines) into context to identify specific fields/rows for removal. The subsection is still moved by sed — the read is only for targeting.
- DEFER backlog: Reading purpose lines (~5-15 lines) to write an accurate backlog entry.
- SIMPLIFY Tier 3: Reading a subsection to present ambiguous boundary options to JK.

In all cases: the final text in the output comes from sed, not from the agent's regeneration. Diff verification catches any drift.

The only text the agent WRITES (generates new) is:
- Placeholder lines for deferred sections
- V1 scope notes at the top of simplified sections
- V2 backlog entries (from controlled reads of section purpose lines)
- The rebuilt Table of Contents (reflecting v1 structure)
- The ` — V1 BUILD DOCUMENT` title suffix

Everything else is moved via file operations.

---

## Required Inputs

**File tools gate:** This skill requires bash/file tools (sed, grep, cat, diff, wc). If you don't have access to a terminal, stop and tell JK: "Phase B requires file operations to prevent text drift. This session needs computer/bash tool access." Do NOT fall back to reading and rewriting — that defeats the core principle.

For each document:
1. **The original gospel spec** (e.g., `MODE_2_FRANCHISE_SEASON_UPDATED.md`)
2. **The triage ruling draft** (e.g., `MODE_2_V1_DRAFT.md`)

If either is missing, stop and ask JK. Do not proceed from memory.

### File Path Conventions
At session start, confirm these paths with JK and use them consistently:

```
SOURCE:  /path/to/[gospel_file].md          (read-only — never modify)
RULING:  /path/to/[MODE]_V1_DRAFT.md        (read-only — never modify)
OUTPUT:  /path/to/[MODE]_V1_FINAL.md         (append-only during assembly)
BACKLOG: /path/to/V2_DEFERRED_BACKLOG.md     (append-only, shared across modes)
MAP:     /path/to/[MODE]_SECTION_MAP.md      (created in Phase B.1)
WORKING: /tmp/section_working.md             (scratch file, overwritten per section)
```

The agent must confirm paths at session start: "I'll be reading from [SOURCE], writing to [OUTPUT]. Correct?" If JK provides different paths, use those. Never assume.

---

## Phase B.1 — Section Map

Before touching any content, build a complete line-range map of the original gospel. This is the foundation for all subsequent operations.

### Step 1: Extract Section Boundaries
```bash
# Top-level sections
grep -n "^## " [source_file]
# Subsections (needed for SIMPLIFY operations)
grep -n "^### " [source_file]
```

### Step 2: Compute Line Ranges
For each top-level section, the range is: [this header's line] to [next `##` header's line - 1].
For each subsection within a section, the range is: [this `###` line] to [next `###` or `##` line - 1].
The last section/subsection runs to the end of the file.

### Step 3: Build the Section Map
Produce a map in this format and save it as `[MODE]_SECTION_MAP.md`:

```markdown
## Section Map: [Document Name]
Total lines: [N]

| Section | Title | Lines | Subsections | Ruling |
|---|---|---|---|---|
| §1 | Overview & Mode Definition | 46-115 | 5 (§1.1-1.5) | KEEP |
| §2 | Event Model | 117-528 | 5 (§2.1-2.5) | SIMPLIFY |
| §3 | GameTracker | 529-670 | 7 (§3.1-3.7) | KEEP |
```

For SIMPLIFY sections, also list subsection line ranges:
```markdown
### §2 SIMPLIFY Detail:
| Subsection | Title | Lines |
|---|---|---|
| §2.1 | AtBatEvent Interface | 119-311 |
| §2.2 | BetweenPlayEvent Interface | 313-401 |
| §2.3 | TransactionEvent Interface | 402-458 |
| §2.4 | GameRecord Interface | 459-518 |
| §2.5 | Design Principles | 519-528 |
```

This subsection map is essential — SIMPLIFY rulings often defer specific subsections, not whole sections.

### Step 4: Validate
- Every line in the original must be covered by exactly one section (no gaps, no overlaps)
- Every section must have a corresponding ruling from the draft
- Section count in the map must match section count in the ruling draft
- **Section titles must match** between the map and the ruling draft. If §8 in the gospel is "Stats Pipeline" but the ruling says §8 is "Pitcher Stats," the section numbering has drifted. Stop and resolve with JK before proceeding.

If anything doesn't match, stop and report the discrepancy to JK.

### Step 5: Confirm with JK
```
SECTION MAP COMPLETE: [Document Name]
[N] sections mapped | [N] lines total
Rulings: [KEEP count] keep, [SIMPLIFY count] simplify, [DEFER count] defer
Estimated v1 output: ~[line count] lines ([X]% of original)

Ready to begin assembly?
```

Wait for confirmation.

---

## Phase B.2 — Assembly

Process sections in original document order. Handle each ruling type differently.

### KEEP Sections — File Copy

```bash
sed -n '[start],[end]p' source.md >> output.md
```

Verify:
```bash
# Line count must match
wc -l <(sed -n '[start],[end]p' source.md)
# Should equal end - start + 1
```

Report: `✅ §[N] KEEP — [X] lines copied via sed`

### DEFER Sections — Skip + Backlog

Do NOT copy any source lines to the output. Instead, write a placeholder:
```bash
echo "" >> output.md
echo "## [N]. [Section Title]" >> output.md
echo "*Deferred to v2. See V2_DEFERRED_BACKLOG.md.*" >> output.md
echo "" >> output.md
```

For the backlog entry, you need to know what this section does. **Read only the section's purpose/overview subsection** (typically the first 5-15 lines after the header) — this is a controlled, small-scope read justified by the need to write an accurate backlog entry. Do NOT read the full section.

```bash
# Read just the purpose/overview (first ~15 lines of the section)
sed -n '[start],[start+15]p' source.md
```

Then write the backlog entry (agent-generated text):
```markdown
### §[N] — [Section Title]
- **Source:** [Document Name], lines [start]-[end]
- **What it does:** [2-3 sentences — from the purpose lines you just read]
- **Why deferred:** [From the ruling]
- **Dependencies for v2:** [What needs to exist first]
- **Original length:** [line count] lines
```

Report: `✅ §[N] DEFER — skipped [X] lines, backlog entry written`

### SIMPLIFY Sections — Surgical Removal

This is the critical operation. Deferrals happen at three granularity levels, each handled differently.

#### Tier 1: Whole Subsection Deferral
The ruling says to defer an entire subsection (e.g., "defer §8.5 Storage Tiers").
Use the subsection line range from the section map:
```bash
sed -n '[start],[end]p' source.md > /tmp/section_working.md
# Remove subsection §8.5 (lines 40-55 within the working file)
sed -i '[40],[55]d' /tmp/section_working.md
```
Clean and mechanical. This is the easiest case.

#### Tier 2: Intra-Subsection Removal (Fields, Table Rows, Paragraphs)
The ruling says to defer specific fields from a data model, specific rows from a table, or specific paragraphs within a subsection. `sed` alone can't target "the fielding rows" — you need to identify exact lines first.

Protocol:
1. Extract the subsection to a working file using the subsection map line range.
2. **Read the working file into context** — this is the ONE exception to the no-regeneration rule. Justified because subsections are small (typically 10-60 lines) and the edit requires understanding structure (which field is which, where a paragraph boundary is).
3. Identify the exact lines to remove. Record them explicitly:
   ```
   INTRA-SUBSECTION REMOVAL — §[N.N]:
   - Field/row "[name]": line [X]
   - Field/row "[name]": lines [Y]-[Z]
   ```
4. Remove via sed using the identified line numbers.
5. **Diff the working file against the original subsection** to verify only the intended lines changed:
   ```bash
   diff <(sed -n '[sub_start],[sub_end]p' source.md) /tmp/section_working.md
   ```
   The diff should show ONLY the removals you intended. If it shows anything else, the text was regenerated — revert and redo with sed.

#### Tier 3: Ambiguous Boundaries
The ruling says something like "defer the scout personality effects" but there's no clean subsection or line boundary — the concept is woven through multiple paragraphs. This is the hardest case.

Protocol:
1. Read the relevant subsection into context (small scope, per Tier 2).
2. Identify every line that touches the deferred concept.
3. **Stop and present to JK** before cutting:
   ```
   ⚠️ AMBIGUOUS BOUNDARY — §[N.N]:
   "[deferred component]" appears on lines [X], [Y], [Z] but is woven 
   into kept content. Clean cut options:
   (a) Remove lines [X]-[Y] — loses [side effect]
   (b) Remove only line [Z] — partial deferral, [component] still referenced at [X]
   (c) Defer the entire subsection — cleanest cut but loses [kept items]
   (d) Keep as-is with a v2 annotation — no structural change
   ```
4. JK decides. Then execute with sed and verify with diff.

#### Step S.1 — Read the Ruling's Explicit Lists
The Phase A ruling MUST have explicit "v1 KEEPS" and "v2 DEFERS" lists. If they don't exist or are vague ("basic version", "simplified"), stop:
```
⚠️ RULING FOR §[N] LACKS EXPLICIT LISTS.
Cannot apply SIMPLIFY without knowing exactly what stays and goes.
Need JK to clarify before proceeding.
```

#### Step S.2 — Classify Each Deferral
For each item in the "v2 DEFERS" list, determine the tier:
```
SIMPLIFY PLAN — §[N]:
- [Component 1]: Tier 1 — whole subsection §[N.X], lines [A]-[B]
- [Component 2]: Tier 2 — specific fields in §[N.Y], need line identification
- [Component 3]: Tier 3 — ambiguous boundary, will present options to JK
```

#### Step S.3 — Copy the Full Section to Working File
```bash
sed -n '[start],[end]p' source.md > /tmp/section_working.md
```

#### Step S.4 — Execute Removals
Apply removals from bottom to top (highest line numbers first) so earlier line numbers aren't shifted. Use the tier-appropriate method for each.

#### Step S.5 — Add V1 Scope Note
Insert immediately after the section header in the working file:
```
> **v1 Scope:** [One sentence from the ruling]
> Deferred to v2: [list from ruling]
```

#### Step S.6 — Append to Output
```bash
cat /tmp/section_working.md >> output.md
```

#### Step S.7 — Verify Against Ruling
```
SIMPLIFY VERIFICATION — §[N]:
v1 KEEPS (ruling → confirmed in output):
- [Component]: ✓ present (grep confirmed)
v2 DEFERS (ruling → confirmed removed):
- [Component]: ✓ absent (grep confirmed)
Lines: original [X] → v1 [Y] (removed [Z])

Diff check: [PASS — only intended removals / FAIL — unexpected changes]
```

If anything doesn't match, stop and fix before advancing.

#### Step S.8 — Write Backlog Entries
One entry per deferred component in `V2_DEFERRED_BACKLOG.md`.

Report: `✅ §[N] SIMPLIFY — kept [X] lines, removed [Y] lines, [Z] backlog entries written`

### Document Skeleton — Front Matter & Back Matter

Gospel specs have structural elements outside the numbered sections. Handle each:

**Title (line 1):** Copy verbatim via sed. Append ` — V1 BUILD DOCUMENT` to the title line in the output.

**Table of Contents:** If the original has one, regenerate it AFTER all sections are assembled. This is the one structural element you rebuild, because section content has changed. Use the output file's actual `##` headers:
```bash
grep -n "^## " output.md
```
Format as a markdown TOC. This is acceptable agent-generated text.

**Changelog / Decision Traceability / Cross-References (typically the last 2-3 sections):** These are informational back matter. Copy them via sed as KEEP sections — they provide context even if some referenced decisions were deferred. Do NOT edit them to remove references to v2 material; they're historical records.

**Pre-section content (intro paragraphs before §1):** Copy via sed — treat as part of the document skeleton, not a numbered section.

---

## Phase B.3 — Document Verification (Runs Once, After Final Section)

After all sections of a document are assembled (which may span multiple sessions), run these checks on the complete output document. Do NOT run these mid-document — the partial verification in session checkpoints covers the interim.

### Check 1: Line Accounting
```bash
wc -l output.md
```
The total should approximately equal: sum of KEEP section lines + sum of SIMPLIFY kept lines + placeholder lines for DEFER sections + any scope notes. If the count is significantly off, something was dropped or duplicated.

### Check 2: Section Completeness
```bash
grep -c "^## " output.md
```
Must equal the total section count in the original. Every section should appear — either as full content (KEEP/SIMPLIFY) or as a deferral placeholder (DEFER).

### Check 3: Diff Spot-Check
Pick 2-3 KEEP sections at random. Diff the output against the original:
```bash
diff <(sed -n '[start],[end]p' source.md) <(sed -n '[out_start],[out_end]p' output.md)
```
For KEEP sections, diff MUST show zero changes. If it shows changes, the text was regenerated instead of file-copied. Fix it.

### Check 4: Orphan Reference Scan
```bash
# Find all internal section references in the output
grep -n "§[0-9]" output.md
```
Check whether any kept section references a deferred section in a way that assumes the deferred content exists. Flag these for JK:
```
ORPHAN REFERENCES FOUND:
- Line [X]: §[kept] references §[deferred] — [context]
- Resolution needed: [stub the reference / note it / JK decides]
```

### Check 5: No Regenerated Text
Scan the output for any text that shouldn't be there — editorial bridging, summaries, rewritten passages. The only non-original text should be:
- Deferral placeholders
- V1 scope notes on simplified sections
- The document header if you added one

Report all findings to JK. Fix any issues. Then:
```
DOCUMENT ASSEMBLY COMPLETE: [Document Name]
Original: [X] lines
V1 output: [Y] lines ([Z]% of original)
Sections: [KEEP] kept, [SIMPLIFY] simplified, [DEFER] deferred
Backlog entries: [N]
Verification: [PASS / issues found — list]
```

---

## Handling Discovered Issues

During assembly, you may discover problems the triage didn't catch:

**A SIMPLIFY ruling that doesn't cleanly cut.** Removing component D breaks a data model mid-definition, or a kept paragraph references a deferred one mid-sentence.
→ Do NOT improvise a fix. Stop and ask JK:
```
⚠️ ASSEMBLY ISSUE — §[N]:
Removing [component] breaks [what]. The text at line [X] says "[quote]" 
which references the deferred component directly.
Options:
(a) Keep the referencing text and add a v2 note
(b) Remove the referencing text too (expands the deferral)
(c) Revisit the ruling
```

**A KEEP section that references a DEFER section as if it exists.**
→ Flag as orphan reference in verification. Don't modify the KEEP section.

**Something that looks wrong in the original spec.**
→ Not your problem. Copy it as-is. Spec errors are a separate concern.

---

## Session Protocol

### Session Checkpoints
After every **SIMPLIFY section** and after every **8 sections total** (whichever comes first), pause and run:

```
CHECKPOINT — After §[N]:
Sections assembled this session: [count]
  KEEP: [N] | SIMPLIFY: [N] | DEFER: [N]
Output file: [line count] lines
Backlog entries this session: [N]
Issues flagged: [count or "none"]
```

Then run a **partial verification** on the last assembled section:
```bash
# Verify last KEEP section is byte-identical to source
diff <(sed -n '[src_start],[src_end]p' source.md) <(tail -n [section_length] output.md)
```
If diff shows unexpected changes, stop and fix before continuing.

After the checkpoint, present to JK:
```
Checkpoint complete. [X] sections remaining for this document.
(a) Continue
(b) Wrap session here — pick up at §[next] next time
```

### Session End Protocol
When wrapping a session (by checkpoint decision or natural completion):

1. Record the last section appended to the output file:
   ```bash
   tail -5 output.md   # Verify it ends where expected
   wc -l output.md     # Record total line count
   ```
2. Save a **resume marker** at the end of the output file:
   ```bash
   echo "" >> output.md
   echo "<!-- RESUME: Next section is §[N] -->" >> output.md
   ```
3. Update `V1_SIMPLIFICATION_TRACKER.md`:
   ```
   ## Phase B Session [N] — [Date]
   **Document:** [name]
   **Sections assembled:** §[X] through §[Y]
   **Output file:** [line count] lines
   **Resume point:** §[next section]
   **Issues encountered:** [list or "none"]
   ```
4. Tell JK which files to preserve for the next session:
   ```
   FILES TO CARRY FORWARD:
   - [OUTPUT path] — partial v1 doc ([X] lines, through §[Y])
   - [BACKLOG path] — v2 backlog ([N] entries so far)
   - [MAP path] — section map (reusable, don't rebuild)
   - [SOURCE path] — original gospel (unchanged)
   - [RULING path] — rulings (unchanged)
   ```

### Resume Protocol
When continuing a document across sessions:

1. Verify the output file has the resume marker:
   ```bash
   grep "RESUME:" output.md
   ```
2. Remove the resume marker before appending:
   ```bash
   sed -i '/<!-- RESUME:/d' output.md
   ```
3. Verify continuity — the last real content line should be the end of the last assembled section:
   ```bash
   tail -3 output.md
   ```
4. Confirm with JK:
   ```
   RESUMING: [Document Name]
   Output file: [X] lines, last section: §[Y]
   Continuing from: §[next]
   Section map loaded: [N] sections, [remaining] left
   Proceed?
   ```
5. Continue with the per-section assembly protocol from where you left off.

### Estimated Session Counts
These are estimates, not caps — use checkpoints to decide when to break:
- **Mode 2** (~28 sections): 2-3 sessions depending on SIMPLIFY count
- **Mode 1** (~16 sections): 1-2 sessions
- **Mode 3** (~21 sections): 1-2 sessions
- **Almanac** (~10 sections): 1 session

---

## Document Processing Order

Mode 2 → Mode 1 → Mode 3 → Almanac.

After all four complete:
```
PHASE B COMPLETE

Documents produced:
- MODE_2_V1_FINAL.md: [lines] ([X]% of original)
- MODE_1_V1_FINAL.md: [lines] ([X]% of original)
- MODE_3_V1_FINAL.md: [lines] ([X]% of original)
- ALMANAC_V1_FINAL.md: [lines] ([X]% of original)
- V2_DEFERRED_BACKLOG.md: [N] entries across all modes

Ready for Phase C: Code Alignment.
```

---

## Anti-Patterns

| Don't Do This | Why | Do This Instead |
|---|---|---|
| Read a section and rewrite it to the output | LLMs regenerate, not copy — drift guaranteed | Use sed/file ops to move exact lines |
| Process all four documents in one session | Context overflow, verification shortcuts | One document at a time |
| Apply a SIMPLIFY from memory of the ruling | Memory is lossy, especially for explicit lists | Re-read the ruling's keep/defer lists before each cut |
| Skip the diff spot-check "because I used sed" | Commands can have off-by-one errors | Diff at least 2-3 sections |
| Fix a discovered issue without asking JK | You're an editor, not a decision-maker | Flag it, present options, wait |
| Reconstruct the V2 backlog at the end | Memory degrades over a long session | Write each entry as you go |
| Renumber sections to close gaps | Breaks cross-references from other documents | Keep original numbers, use placeholders |
| Add bridging text or editorial notes | Output should be original spec text only | Only new text: placeholders, scope notes, backlog |
| Rush verification because "it's just copying" | Off-by-one errors, missed sections, silent drops | Run all five verification checks |
| Start a new session without checking the resume marker | Could duplicate or skip sections | Follow the resume protocol exactly |
| Skip the checkpoint partial verification | Errors compound across sections | Diff-check after every SIMPLIFY and every 8 sections |
| Rebuild the section map in a continuation session | Wastes time, risks different line counts if file changed | Reuse the map from session 1 |
