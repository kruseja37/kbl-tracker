# PROMPT CONTRACT: Step 2.D — Enrichment Taxonomy Rewrite
# ROUTE: Claude Code CLI | Opus 4.6
# Branch: feature/gt-ux-t2d-enrichment-taxonomy
# Prerequisite: Step 2.C merged to main

---

You are a senior React/TypeScript engineer performing the deepest enrichment system rewrite in the GameTracker UX redesign. This step replaces the exit type paradigm with contact type, restructures fielding attempt into two sub-fields, separates enrichment layers, gates modifiers by result type, moves runner-level modifiers off the play-level panel, and replaces the diamond-tap spray with an inline SVG.

## GOAL

Seven changes to the enrichment system:
1. Replace EXIT_TYPE_OPTIONS with CONTACT_TYPE_OPTIONS (Normal/Weak/Hard/Bloop/Bunt)
2. Restructure fielding attempt: Attempt Type (8 options) + Attempt Outcome (Made/Missed)
3. Separate Layer A (Fielding Attempt) from Layer B (Play Mechanic) + add Deflection
4. Make enrichment gating per-result-type (not just category-level)
5. Gate KP/NUT: NOT available on HR/SF/SAC
6. Move TOOTBLAN and Out Advancing off play-level modifiers (runner-level only)
7. Replace MiniDiamond tap-to-place with inline SVG fan-shaped spray graphic

## SOURCE OF TRUTH

- `spec-docs/GAMETRACKER_UX_SPEC.md` — §8.1 (Layers A-D), §8.2 (Spray Graphic), §8.5 (Result-to-Enrichment Map)
- `spec-docs/GAMETRACKER_UX_GAP_ANALYSIS.md` — UX-025, UX-027, UX-028, UX-045, UX-046, UX-047, UX-057
- `spec-docs/GAMETRACKER_UX_IMPLEMENTATION_PLAN.md` — Group 2.D

## BEFORE YOU WRITE ANY CODE

1. Read `spec-docs/GAMETRACKER_UX_SPEC.md` §8.1, §8.2, §8.5 in full
2. Read `spec-docs/GAMETRACKER_UX_GAP_ANALYSIS.md` entries for UX-025, UX-027, UX-028, UX-045, UX-046, UX-047, UX-057
3. Read `src/src_figma/app/components/EnrichmentPanel.tsx` in full (469 lines). Note:
   - EXIT_TYPE_OPTIONS at line 27-33
   - MODIFIER_OPTIONS at line 51-59 (includes TOOTBLAN and BUNT)
   - EnrichmentUpdate interface at line 41-49
   - Gating logic at line 189-195 (isHit, isHR, isOut, isK)
   - MiniDiamond component at line 67-135
4. Read `src/src_figma/app/utils/fieldingPlayType.ts` in full (126 lines). Note:
   - FieldingPlayTypeValue includes Beat Runner/Beat Throw/Missed Dive/Missed Leap (these are modifiers in the spec, not fielding attempts)
   - Three mapping functions that will need updating
5. Run a FULL exitType grep before starting: `grep -rn "exitType\|ExitType\|EXIT_TYPE\|exit_type" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v __tests__` — save this output. You need it for the rename.
6. Run a FULL MODIFIER grep: `grep -rn "TOOTBLAN\|BUNT\|KILLED_PITCHER\|NUT_SHOT\|BEAT_THROW\|MODIFIER_OPTIONS" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules` — save this output.
7. Create branch: `git checkout -b feature/gt-ux-t2d-enrichment-taxonomy`
8. Run `npm run build` to confirm clean baseline

## CONSTRAINTS

### Files you WILL modify:
```
src/src_figma/app/components/EnrichmentPanel.tsx    — Contact type, spray graphic, modifier gating, layer separation
src/src_figma/app/utils/fieldingPlayType.ts          — Restructure into Attempt Type + Attempt Outcome, add Play Mechanic
src/types/game.ts                                     — Rename ExitType → ContactType if defined here
```

### Files you WILL likely need to modify:
```
src/src_figma/app/pages/GameTracker.tsx              — exitType references in enrichment data handling (~line 1449)
```

### Files you MUST NOT modify:
```
src/utils/eventLog.ts                                 — DO NOT TOUCH persistence layer. If exitType is stored in persisted events, the rename is UI-only with a mapping layer.
src/src_figma/hooks/useGameState.ts
src/src_figma/app/components/QuickBar.tsx
src/src_figma/app/components/ScoreBug.tsx
src/src_figma/app/components/BattingLineupColumn.tsx
src/src_figma/app/components/DefensiveLineupColumn.tsx
src/src_figma/app/components/LineupCard.tsx
Any file under src/components/
```

**CRITICAL CONSTRAINT on exitType rename:** If `exitType` appears as a field name in eventLog.ts or in IndexedDB-persisted event objects, you CANNOT just rename the persisted field — existing saved games would break. In that case:
- Rename the UI-facing type/options to `contactType` / `CONTACT_TYPE_OPTIONS`
- Add a mapping layer: when reading persisted events, map old `exitType` values to new `contactType` equivalents
- When writing new events, store the new `contactType` field
- Document this as a migration concern

## EXACT CHANGES — 7 items

### Item 2.11 (UX-057): Replace exitType with contactType

1. In EnrichmentPanel.tsx, replace `EXIT_TYPE_OPTIONS` with:
   ```typescript
   export const CONTACT_TYPE_OPTIONS = [
     { value: 'normal', label: 'Normal' },
     { value: 'weak', label: 'Weak' },
     { value: 'hard', label: 'Hard' },
     { value: 'bloop', label: 'Bloop' },
     { value: 'bunt', label: 'Bunt' },
   ] as const;
   ```
2. Rename the type: `ExitTypeValue` → `ContactTypeValue`
3. In `EnrichmentUpdate` interface: rename `exitType` → `contactType`
4. In the JSX: rename the section label from "Exit Type" to "Contact Type"
5. In GameTracker.tsx (~line 1449-1458): update the exitType mapping to use contactType values
6. In types/game.ts: if `ExitType` is defined there, rename to `ContactType` with new values
7. **BUNT removal from MODIFIER_OPTIONS:** Bunt is now a contact type option (already in the list above). Remove `{ value: 'BUNT', label: 'BUNT' }` from MODIFIER_OPTIONS (line 57).

### Item 2.12 (UX-027): Restructure fielding attempt into two sub-fields

In `src/src_figma/app/utils/fieldingPlayType.ts`:

1. Split the current single `FieldingPlayTypeValue` union into TWO types:
   ```typescript
   export type FieldingAttemptType = 'routine' | 'diving' | 'jumping' | 'sliding' | 'charging' | 'over_shoulder' | 'wall' | 'robbed_hr';
   
   export type FieldingAttemptOutcome = 'made' | 'missed';
   ```
   Note: spec says "Jumping" not "Leaping". Rename 'leaping' → 'jumping'.

2. Create option arrays:
   ```typescript
   export const FIELDING_ATTEMPT_TYPE_OPTIONS = [
     { value: 'routine', label: 'Routine' },
     { value: 'diving', label: 'Diving' },
     { value: 'jumping', label: 'Jumping' },
     { value: 'sliding', label: 'Sliding' },
     { value: 'charging', label: 'Charging' },
     { value: 'over_shoulder', label: 'Over-the-shoulder' },
     { value: 'wall', label: 'Wall' },
     { value: 'robbed_hr', label: 'Robbed HR' },
   ] as const;
   
   export const FIELDING_ATTEMPT_OUTCOME_OPTIONS = [
     { value: 'made', label: 'Made' },
     { value: 'missed', label: 'Missed' },
   ] as const;
   ```
3. Remove from the old flat list: Beat Runner, Beat Throw, Missed Dive, Missed Leap. These are:
   - Beat Runner → spec §8.1 Layer D modifier (remains in MODIFIER_OPTIONS)
   - Beat Throw → spec §8.1 Layer D modifier (remains in MODIFIER_OPTIONS)
   - Missed Dive/Missed Leap → replaced by Attempt Type = Diving/Jumping + Outcome = Missed
4. Update the three mapping functions to work with the new two-field structure.
5. In EnrichmentPanel.tsx: render TWO sub-sections under "Fielding Attempt":
   - "Attempt Type" — single-select from FIELDING_ATTEMPT_TYPE_OPTIONS (default: Routine)
   - "Outcome" — single-select: Made / Missed (default: Made)
6. In `EnrichmentUpdate` interface: replace `fieldingPlayType?: FieldingPlayTypeValue` with:
   ```typescript
   fieldingAttemptType?: FieldingAttemptType;
   fieldingAttemptOutcome?: FieldingAttemptOutcome;
   ```

### Item 2.13 (UX-045): Separate Layer A from Layer B + Deflection

1. Create a NEW Play Mechanic type and options:
   ```typescript
   export type PlayMechanicValue = 'routine' | 'relay' | 'rundown' | 'tag_play' | 'unassisted' | 'deflection';
   
   export const PLAY_MECHANIC_OPTIONS = [
     { value: 'routine', label: 'Routine' },
     { value: 'relay', label: 'Relay' },
     { value: 'rundown', label: 'Rundown' },
     { value: 'tag_play', label: 'Tag Play' },
     { value: 'unassisted', label: 'Unassisted' },
     { value: 'deflection', label: 'Deflection' },
   ] as const;
   ```
2. Add to `EnrichmentUpdate`: `playMechanic?: PlayMechanicValue;`
3. In EnrichmentPanel.tsx: render a "Play Mechanic" section (separate from Fielding Attempt). Show for contact outs and hits (not K, not HR, not BB/HBP/IBB).

### Item 2.14 (UX-025): Per-result-type enrichment gating

1. Replace the category-level gating (lines 189-195: `isHit`, `isHR`, `isOut`, `isK`) with per-result-type gating.
2. Create a configuration object that maps each AtBatResult to which enrichment sections are visible:
   ```typescript
   const ENRICHMENT_CONFIG: Record<string, { fieldLocation: boolean; contactType: boolean; fieldingAttempt: boolean; playMechanic: boolean; sprayZones: number; modifiers: string[] }> = {
     'K':    { fieldLocation: false, contactType: false, fieldingAttempt: false, playMechanic: false, sprayZones: 0, modifiers: [] },
     'Ꝁ':   { fieldLocation: false, contactType: false, fieldingAttempt: false, playMechanic: false, sprayZones: 0, modifiers: [] },
     'GO':   { fieldLocation: true,  contactType: true,  fieldingAttempt: true,  playMechanic: true,  sprayZones: 18, modifiers: ['KP', 'NUT', 'BEAT_RUNNER'] },
     'FO':   { fieldLocation: true,  contactType: true,  fieldingAttempt: true,  playMechanic: true,  sprayZones: 27, modifiers: ['KP', 'NUT', 'BEAT_THROW'] },
     'LO':   { fieldLocation: true,  contactType: true,  fieldingAttempt: true,  playMechanic: true,  sprayZones: 39, modifiers: ['KP', 'NUT'] },
     'PO':   { fieldLocation: true,  contactType: true,  fieldingAttempt: true,  playMechanic: true,  sprayZones: 27, modifiers: ['KP', 'NUT'] },
     '1B':   { fieldLocation: true,  contactType: true,  fieldingAttempt: true,  playMechanic: true,  sprayZones: 42, modifiers: ['KP', 'NUT', 'BEAT_THROW'] },
     '2B':   { fieldLocation: true,  contactType: true,  fieldingAttempt: true,  playMechanic: true,  sprayZones: 42, modifiers: ['KP', 'NUT', 'BEAT_THROW'] },
     '3B':   { fieldLocation: true,  contactType: true,  fieldingAttempt: true,  playMechanic: true,  sprayZones: 42, modifiers: ['KP', 'NUT', 'BEAT_THROW'] },
     'HR':   { fieldLocation: true,  contactType: true,  fieldingAttempt: false, playMechanic: false, sprayZones: 21, modifiers: [] },
     'ITPHR':{ fieldLocation: true,  contactType: true,  fieldingAttempt: true,  playMechanic: true,  sprayZones: 42, modifiers: [] },
     'E':    { fieldLocation: true,  contactType: true,  fieldingAttempt: true,  playMechanic: true,  sprayZones: 42, modifiers: ['KP', 'NUT'] },
     'DP':   { fieldLocation: true,  contactType: true,  fieldingAttempt: true,  playMechanic: true,  sprayZones: 18, modifiers: ['KP', 'NUT'] },
     'TP':   { fieldLocation: true,  contactType: true,  fieldingAttempt: true,  playMechanic: true,  sprayZones: 18, modifiers: ['KP', 'NUT'] },
     'FC':   { fieldLocation: true,  contactType: true,  fieldingAttempt: true,  playMechanic: true,  sprayZones: 42, modifiers: ['KP', 'NUT'] },
     'SF':   { fieldLocation: true,  contactType: true,  fieldingAttempt: true,  playMechanic: true,  sprayZones: 27, modifiers: [] },
     'SAC':  { fieldLocation: true,  contactType: true,  fieldingAttempt: true,  playMechanic: true,  sprayZones: 18, modifiers: [] },
     'FLO':  { fieldLocation: true,  contactType: true,  fieldingAttempt: true,  playMechanic: true,  sprayZones: 27, modifiers: ['KP', 'NUT'] },
     'GRD':  { fieldLocation: true,  contactType: true,  fieldingAttempt: true,  playMechanic: true,  sprayZones: 42, modifiers: ['KP', 'NUT', 'BEAT_THROW'] },
   };
   ```
   Note: BB, IBB, HBP, WP_K, PB_K, D3K have NO enrichment sections (no contact).
3. Use this config to conditionally render each enrichment section based on the entry's result.

### Item 2.15 (UX-046): Gate KP/NUT — NOT on HR/SF/SAC

This is handled by the per-result ENRICHMENT_CONFIG above. HR, SF, and SAC have empty modifiers arrays. Verify the config is correct:
- HR: modifiers = [] ✓
- SF: modifiers = [] ✓
- SAC: modifiers = [] ✓

### Item 2.16 (UX-047): Remove TOOTBLAN from play-level modifiers

1. Remove `{ value: 'TOOTBLAN', label: 'TBL' }` from MODIFIER_OPTIONS in EnrichmentPanel.tsx.
2. TOOTBLAN belongs on runner sub-entries (Tier 3 item 3.8), not on the play-level enrichment panel.
3. Also verify: "Out Advancing" is not in the current MODIFIER_OPTIONS (it shouldn't be — confirm it's absent).
4. After removal, MODIFIER_OPTIONS should be:
   ```typescript
   const MODIFIER_OPTIONS = [
     { value: 'SEVEN_PLUS_PITCH_AB', label: '7+' },
     { value: 'ROBBERY', label: 'ROB' },
     { value: 'KILLED_PITCHER', label: 'KP' },
     { value: 'NUT_SHOT', label: 'NUT' },
     { value: 'BEAT_THROW', label: 'BT' },
     { value: 'BEAT_RUNNER', label: 'BR' },
   ] as const;
   ```
   Note: BUNT was already removed in item 2.11 (moved to contact type). Beat Runner added back from the old fielding type list.
5. MODIFIER_OPTIONS rendering should be gated by the per-result config from item 2.14 — only show modifiers that are in the result's `modifiers` array.

### Item 2.17 (UX-028): Replace MiniDiamond with inline SVG spray graphic

1. Replace the `MiniDiamond` component (EnrichmentPanel.tsx lines 67-135) with a `SprayGraphic` component.
2. The SprayGraphic is a fan-shaped field SVG (like a TV broadcast spray chart):
   - Quarter-circle fan shape representing the fair territory
   - Divided into zones based on the result type's `sprayZones` count from ENRICHMENT_CONFIG
   - Zones are tappable — tapping a zone records the field location
   - Chalk-line aesthetic matching the Scoreboard Chalk Retro theme (sage green field, cream/white lines)
3. Zone layout per spec §8.2:
   - HR: 7 directions × 3 depths (just over/medium/blast) = 21 zones
   - GO: 6 directions × 3 depths (infield only) = 18 zones
   - FO: 9 directions × 3 depths (OF + foul territory) = 27 zones
   - LO: 13 directions × 3 depths (OF + medium/deep IF + foul) = 39 zones
   - PO: 9 directions × 3 depths (IF + shallow OF + foul) = 27 zones
   - Hits (1B/2B/3B/E/ITPHR/GRD): 14 directions × 3 depths (IF + OF) = 42 zones
4. The graphic height should adapt to the zone count — fewer zones = smaller graphic.
5. Keep the graphic simple in this step. The zones can be regular sectors of the fan. They don't need to be geographically accurate — they need to be TAPPABLE and distinguishable. Fat-finger-safe on iPad is the priority.
6. When a zone is tapped, store the zone ID (e.g., "LC-deep" for left-center deep) rather than raw x/y coordinates. Update the `fieldLocation` field in `EnrichmentUpdate` to store zone IDs if needed, or keep x/y and map from zones to coordinates.

## VERIFICATION

```bash
# 1. Build passes
npm run build

# 2. Tests pass
npm test

# 3. exitType completely gone from UI code
grep -rn "exitType\|ExitType\|EXIT_TYPE" src/src_figma/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v "// REMOVED\|// OLD\|// LEGACY"
# Expected: 0 matches (all renamed to contactType)

# 4. contactType exists
grep -rn "contactType\|ContactType\|CONTACT_TYPE" src/src_figma/ --include="*.ts" --include="*.tsx" | head -10
# Expected: type definition, options array, UI rendering, EnrichmentUpdate field

# 5. TOOTBLAN removed from play-level modifiers
grep -n "TOOTBLAN\|TBL" src/src_figma/app/components/EnrichmentPanel.tsx
# Expected: 0 matches

# 6. BUNT removed from modifiers (now in contact type)
grep -n "'BUNT'" src/src_figma/app/components/EnrichmentPanel.tsx
# Expected: 0 matches in MODIFIER_OPTIONS (may appear in CONTACT_TYPE_OPTIONS)

# 7. Fielding attempt has two sub-fields
grep -n "FieldingAttemptType\|FieldingAttemptOutcome\|FIELDING_ATTEMPT" src/src_figma/app/utils/fieldingPlayType.ts | head -10
# Expected: type definitions + option arrays for both

# 8. Play Mechanic exists as separate type
grep -n "PlayMechanic\|PLAY_MECHANIC" src/src_figma/app/utils/fieldingPlayType.ts | head -5
# Expected: type + options array including Deflection

# 9. Per-result enrichment config exists
grep -n "ENRICHMENT_CONFIG" src/src_figma/app/components/EnrichmentPanel.tsx | head -3
# Expected: config object with per-result mappings

# 10. SprayGraphic component exists
grep -n "SprayGraphic\|sprayGraphic\|fan.*shape\|zone.*tap" src/src_figma/app/components/EnrichmentPanel.tsx | head -5
# Expected: SprayGraphic component rendering
```

## FORMAT

When complete, output:

```
STEP 2.D COMPLETE

Files changed:
1. src/src_figma/app/components/EnrichmentPanel.tsx — [describe: contactType, spray, modifiers, gating]
2. src/src_figma/app/utils/fieldingPlayType.ts — [describe: attempt type+outcome, play mechanic]
3. src/types/game.ts — [describe: type renames if applicable]
4. src/src_figma/app/pages/GameTracker.tsx — [describe: exitType→contactType mapping updates]
5. [any other files]

exitType→contactType rename audit:
[List EVERY file that had exitType and what was done. State whether persistence layer was affected.]

Modifier changes:
[List what was removed from MODIFIER_OPTIONS and what was added]

Layer structure:
[Confirm: Layer A = Attempt Type (8) + Attempt Outcome (2), Layer B = Play Mechanic (6), Layer C = Contact Type (5), Layer D = Modifiers (gated per result)]

Verification results:
[all 10 checks with outcomes]

Ready for JK browser verification.
```

## FAILURE PROTOCOL

- If exitType is stored in persisted IndexedDB events → DO NOT rename the persisted field. Create a UI-level mapping: read `exitType` from old events, write `contactType` for new events. Display "Contact Type" in the UI regardless. Document the migration concern.
- If the spray graphic is too complex to build with full zone counts → build a simplified version with 3 zones (left, center, right) for all result types. Document this as "simplified V1 spray — full zone counts in Tier 3." The infrastructure (tappable SVG, zone ID storage) matters more than exact zone counts.
- If per-result ENRICHMENT_CONFIG is complex → start with the config as defined above but render only the boolean fields (show/hide sections). The modifier gating per result can be a second pass within this step.
- If the three mapping functions in fieldingPlayType.ts are hard to update → simplify them: make them return a basic value and add TODO comments for full mapping. The UI structure is more important than perfect mapping function coverage.
- If anything is ambiguous → STOP and report. Do NOT guess.

## ANTI-PATTERNS

- Do NOT modify eventLog.ts — persistence layer untouchable.
- Do NOT modify useGameState.ts.
- Do NOT modify QuickBar.tsx, ScoreBug.tsx, or lineup columns.
- Do NOT build runner-level TOOTBLAN/Out Advancing UI — that's Tier 3 (runner sub-entries).
- Do NOT add audio or animations.
- Do NOT touch src/components/ (dead code).
- Do NOT change baseball rules or stat calculations.
- Do NOT hardcode spray zone coordinates — use calculated geometry from the SVG viewBox.

Use high reasoning effort. Read before writing. Build after every file change.
