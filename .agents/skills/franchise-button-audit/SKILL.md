---
name: franchise-button-audit
description: Exhaustive audit of every interactive UI element in KBL Tracker's non-GameTracker pages — franchise mode, season management, stats views, roster management, standings, settings. Uses dual-direction audit (top-down from components + bottom-up from handlers) with reconciliation integrity check. Classifies buttons by data-mutation impact. Trigger on "audit franchise buttons", "find dead buttons", "check franchise UI wiring", "what buttons work", or as Phase 1 of the franchise testing pipeline.
---

# Franchise Button Audit

## Purpose

Find every interactive UI element outside the GameTracker. For each one, answer: does it do something real, something fake, or nothing at all? The output is a page-by-page inventory that the data-pipeline-tracer consumes.

## Pre-Flight

1. Read `spec-docs/CURRENT_STATE.md`
2. Read `spec-docs/FRANCHISE_API_MAP.md` — if it doesn't exist, run franchise-engine-discovery first
3. Run `npm run build` — must exit 0

### Preflight Proof

Before the full audit, verify you can find and parse components:

```
PREFLIGHT PROOF:
1. Find at least 1 component file in the franchise/season/stats area
2. Parse it and identify at least 1 interactive element (onClick, etc.)
3. Trace that element's handler to its destination (engine, store, etc.)

If this fails → the component structure is different than expected.
Document what you found and STOP.
```

## Phase 1: Top-Down Audit (Components → Handlers)

### Step 1: Identify All Non-GameTracker Pages/Routes

Read the router configuration (React Router, file-based routing, etc.):

```
ROUTE INVENTORY:
For each route/page in the app:
  Path: [e.g., /franchise, /season, /stats, /roster]
  Component: [file path]
  GameTracker-related: [YES/NO — skip if YES]
```

### Step 2: Audit Each Page

For EACH non-GameTracker page/route:

```
PAGE AUDIT TEMPLATE:

Page: [name]
Route: [path]
Component file: [path]
Child components: [list all imported components]

INTERACTIVE ELEMENTS:
For each onClick, onSubmit, onChange, onPress, href, Link, NavLink, button, a[href]:

  Element ID: [P01-E01 format — Page 01, Element 01]
  Type: [button / link / input / select / toggle / form]
  Label/Text: [what the user sees]
  Location in JSX: [file:line]
  Handler: [function name or inline]
  
  CLASSIFICATION:
  □ Tier A: DATA-MUTATING — calls engine, updates store/storage, creates/deletes data
  □ Tier B: NAVIGATION — calls navigate(), changes route, opens modal/drawer
  □ Tier C: UI CHROME — toggles accordion, closes modal, scrolls, no data effect
  
  STATUS:
  □ WIRED — handler exists and calls real logic
  □ DEAD — no handler, onClick={undefined}, or handler is empty function
  □ FAKE — handler exists but uses hardcoded/mock data instead of real source
  □ BROKEN — handler exists but would error (wrong args, missing import, etc.)
  □ TODO — handler contains TODO/placeholder comment
  
  HANDLER TRACE (for Tier A and B only):
  Handler function → calls → [what function] in [what file]
  That function → does → [what action]
  Final destination → [store update / storage write / navigation / API call]
```

### Step 3: Auto-Classification Rules

To determine classification automatically:

```
TIER A (Data-Mutating) — handler calls ANY of:
  - Functions from src/engines/
  - Functions from src/storage/
  - State setters in hooks that manage persistent data (not UI state)
  - Dispatch actions that modify game/season/roster/stats data
  - localStorage/IndexedDB operations

TIER B (Navigation) — handler calls ANY of:
  - navigate() / useNavigate() / history.push()
  - Link / NavLink components
  - Opens a modal/drawer that contains Tier A elements
  - Route changes

TIER C (UI Chrome) — handler does ONLY:
  - Toggle boolean state (isOpen, isExpanded, etc.)
  - Set UI-only state (selectedTab, sortOrder, filterValue)
  - Scroll operations
  - Console.log / debug output
  - No-ops
```

## Phase 2: Bottom-Up Audit (Handlers → Components)

### Step 1: Find All Handler Functions

Search the entire non-GameTracker codebase for handler definitions:

```bash
# Find all handler/action functions in hooks
grep -rn --include="*.ts" --include="*.tsx" -E '(const|function|async)\s+\w*(handle|on[A-Z]|submit|save|create|delete|update|add|remove|toggle|process|execute|dispatch)\w*' src/ | grep -v GameTracker | grep -v __tests__

# Find all store/storage mutation functions  
grep -rn --include="*.ts" -E 'export\s+(const|function|async)' src/storage/ src/stores/ src/engines/

# Find all event dispatchers
grep -rn --include="*.ts" --include="*.tsx" -E 'dispatch\(|emit\(|publish\(' src/
```

### Step 2: Reverse-Trace Each Handler

For each handler found:

```
HANDLER REVERSE-TRACE:
Handler: [function name]
Defined in: [file:line]
Purpose: [what it does — read the implementation]
Called by UI: [YES/NO — search for references in .tsx files]
  If YES: Which component(s) and element(s)?
  If NO: → ORPHANED HANDLER (code exists but nothing calls it)
```

## Phase 3: Reconciliation

**This is the integrity check that prevents false completeness.**

```
RECONCILIATION:

Top-down found: [X] interactive elements across [Y] pages
Bottom-up found: [Z] handler functions across [W] files

MATCHES: [count] — elements found top-down that match handlers found bottom-up
UNMATCHED TOP-DOWN: [count] — elements with no handler (DEAD buttons)
UNMATCHED BOTTOM-UP: [count] — handlers with no UI element (ORPHANED handlers)

INTEGRITY CHECK:
If UNMATCHED TOP-DOWN > 0: List each dead element
If UNMATCHED BOTTOM-UP > 0: List each orphaned handler
If total top-down count seems low (< 20 for a franchise app): 
  → Likely missed dynamically rendered elements
  → Search for .map() calls that generate interactive elements
  → Search for conditional renders that gate button visibility
```

### Handling Dynamic Elements

Some interactive elements are generated dynamically:

```
DYNAMIC ELEMENT PATTERNS TO CHECK:

1. .map() generating buttons:
   {items.map(item => <button onClick={() => handleItem(item)}>...</button>)}
   → Count as 1 element type with N instances, not N separate elements

2. Conditional renders:
   {isAdmin && <button onClick={handleDelete}>Delete</button>}
   → Count even if currently not visible

3. Dynamic imports / lazy components:
   const LazyPage = lazy(() => import('./AdminPanel'))
   → Must audit the lazy-loaded component too

4. Render props / children as function:
   <DataTable renderAction={(row) => <button onClick={() => edit(row)}>Edit</button>} />
   → Trace into the render prop
```

## Phase 4: Summary Generation

### Per-Page Summary

```
PAGE: [name]
Route: [path]
Total interactive elements: [count]
  Tier A (data-mutating): [count]
  Tier B (navigation): [count]
  Tier C (UI chrome): [count]
Status breakdown:
  WIRED: [count]
  DEAD: [count]
  FAKE: [count]
  BROKEN: [count]
  TODO: [count]
Health: [GOOD (>80% wired) / NEEDS WORK (50-80%) / CRITICAL (<50%)]
```

### Cross-Page Summary

```
OVERALL AUDIT:
Pages audited: [count]
Total Tier A elements: [count] — [wired/dead/fake/broken/todo breakdown]
Total Tier B elements: [count] — [breakdown]
Total Tier C elements: [count] — [skipped, not detailed]
Orphaned handlers: [count]
```

## Output

Produce: `spec-docs/FRANCHISE_BUTTON_AUDIT.md`

```markdown
# Franchise Button Audit Report
Generated: [date]
Pages audited: [count]
Total elements found: [count]

## Reconciliation Integrity
- Top-down elements: [X]
- Bottom-up handlers: [Y]
- Matched: [Z]
- Unmatched elements (DEAD): [list]
- Orphaned handlers: [list]

## Page-by-Page Inventory

### [Page Name] ([route])
| ID | Type | Label | Tier | Status | Handler → Destination |
|----|------|-------|------|--------|-----------------------|
| P01-E01 | button | Start Season | A | WIRED | handleStartSeason → seasonEngine.init() |
| P01-E02 | button | Export Data | A | DEAD | no handler |
| ... | ... | ... | ... | ... | ... |

Health: [GOOD/NEEDS WORK/CRITICAL]

### [Next Page] ...

## Tier A Elements Needing Attention
[All data-mutating elements that are DEAD, FAKE, BROKEN, or TODO]

## Orphaned Handlers
[Handlers with no UI element — potential dead code or missing UI]

## Recommendations
1. [Priority fixes — dead Tier A buttons that should work]
2. [Orphaned handlers that should be connected or removed]
3. [Fake data buttons that need real wiring]
```

Also produce: `test-utils/button-audit-data.json`
(Machine-readable version for consumption by data-pipeline-tracer)

```json
{
  "generated": "[date]",
  "pages": [
    {
      "name": "[page]",
      "route": "[path]",
      "elements": [
        {
          "id": "P01-E01",
          "type": "button",
          "label": "Start Season",
          "tier": "A",
          "status": "WIRED",
          "handler": "handleStartSeason",
          "handlerFile": "src/hooks/useSeason.ts:45",
          "destination": "seasonEngine.init()",
          "destinationFile": "src/engines/seasonEngine.ts:12"
        }
      ]
    }
  ],
  "orphanedHandlers": [],
  "reconciliation": {
    "topDownCount": 0,
    "bottomUpCount": 0,
    "matchedCount": 0,
    "unmatchedElements": [],
    "orphanedHandlers": []
  }
}
```

## Scope Boundaries

**DO audit:**
- All pages/routes EXCEPT GameTracker at-bat recording
- Settings pages (they often have data-mutating buttons)
- Modal/drawer content (often missed)
- Admin or debug panels (if they exist)

**Do NOT audit:**
- GameTracker at-bat outcome buttons (covered by gametracker-logic-tester)
- Browser chrome (back button, refresh, etc.)
- Third-party library internals (date pickers, chart tooltips, etc.)

**Do NOT audit deeply (Tier C — just count):**
- Sort/filter toggles
- Accordion expand/collapse
- Tab switches
- Modal close buttons
- Scroll-to-top
- Theme toggles

## Integrity Checks

1. ✅ Every page/route in the app is listed (minus GameTracker)
2. ✅ Reconciliation has been performed (top-down vs bottom-up counts compared)
3. ✅ Dynamic elements (.map, conditional renders) have been accounted for
4. ✅ Every Tier A element has a handler trace (not just "WIRED" — show WHERE it goes)
5. ✅ Orphaned handlers are listed with their file locations
6. ✅ Both .md and .json outputs are produced

## Anti-Hallucination Rules

- Do NOT count an element as WIRED without reading the handler implementation
- Do NOT skip pages because they "look simple" — audit every route
- Do NOT assume conditional renders mean the element doesn't exist — it does
- Do NOT classify a handler as real if it calls console.log or returns hardcoded data — that's FAKE
- If reconciliation shows a large discrepancy (>20%), investigate before reporting — you likely missed dynamic elements
- Do NOT audit GameTracker at-bat buttons — that's a different skill's job
- Grep for ALL onClick/onChange patterns across src/ and compare against your inventory as a final cross-check
