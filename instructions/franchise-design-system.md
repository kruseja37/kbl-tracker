# Franchise Hub Design System (Fork C)

**Scope:** the Franchise Hub presentation layer ONLY — `FranchiseHome.tsx`,
`SeasonSummary.tsx`, `TeamHubContent.tsx`, `ScheduleContent.tsx`,
`AwardsWatchlist.tsx`. Keep the green / Fenway identity; formalize it, de-jargon
the copy, reduce density. **Prettier, not perfect.**

**Companion file:** `src/src_figma/styles/franchise-theme.css` (the token layer).

**Authored:** Phase 1, 2026-06-19. **Status:** spec only — no UI file or
`theme.css` has been touched. Phase 2 (the sweep) is gated and not yet run.

---

## 0. Read this first — two things that differ from the original brief

The brief was written against an assumed setup. Two facts on the ground change
the execution (neither changes the goal). **Both want a one-line JK OK before
Phase 2.**

### 0.1 DISCREPANCY — Tailwind is v3, so the token mechanism changes
- Installed: **`tailwindcss@^3.4.19`** (postcss `tailwindcss` plugin). The active
  CSS entry is `src/main.tsx → src/index.css`, which uses the **v3** directives
  `@tailwind base/components/utilities`. `src/App.tsx` also loads
  `src/styles/global.css` (SNES vars + Press Start font).
- `src/src_figma/styles/theme.css` and `tailwind.css` use **v4-only syntax**
  (`@theme inline`, `@custom-variant`, `@import 'tailwindcss'`). They are **not
  in the runtime import chain** (only the unimported `styles/index.css` references
  them), and v4 at-rules are **not processed by the v3 build**. So theme.css's
  `@theme inline` tokens do **not** generate utilities today; the app's green
  renders purely via v3 JIT arbitrary values (`bg-[#...]`) + global.css.
- **Consequence:** exposing franchise tokens via `@theme inline` (as the brief
  said) would produce **non-working** `bg-franchise-*` classes under v3. The
  v3-native, scope-correct, byte-identical mechanism is **CSS vars scoped under
  `.franchise-hub` + arbitrary-value references** `bg-[var(--franchise-panel)]`.
  That is what `franchise-theme.css` and this doc use. The `@theme inline` block
  is included **commented-out** for a future v4 migration only.

### 0.2 RECONCILIATION — it's ~70 hexes / ~2,178 uses, not "~9 / ~1,250"
The palette is consistent in spirit but has more shades + tints than the headline
9. Verified counts (in-scope `bg-[#`/`text-[#`/`border-[#` + bare hex):

| File | hex occurrences |
|---|---|
| `FranchiseHome.tsx` | 982 |
| `TeamHubContent.tsx` | 888 |
| `ScheduleContent.tsx` | 154 |
| `SeasonSummary.tsx` | 112 |
| `AwardsWatchlist.tsx` | 42 |
| **total** | **~2,178** |
| `FranchiseV1VisualSmokeSeed.tsx` | 67 — **EXCLUDED** (see §6) |

---

## 1. Token map (hex → token) — `.franchise-hub` scoped, 1:1 byte-safe

Each token equals one rendered hex exactly. **Sweep = replace the hex with its
token inside an arbitrary value**, e.g. `bg-[#5A8352] → bg-[var(--franchise-panel)]`,
`text-[#E8E8D8]/70 → text-[var(--franchise-text)]/70` (opacity modifiers carry
over unchanged). Borders that reuse a fill hex use the same token.

### Greens — structure
| Hex | Token | Role | ~uses |
|---|---|---|---|
| `#567A50` | `--franchise-field` | page / field bg (hub root) | 4 |
| `#4F7D4B` | `--franchise-field-raised` | lighter field panel | 23 |
| `#6B9462` | `--franchise-header` | header + tab strip | 52 |
| `#5A8352` | `--franchise-panel` | primary card / panel | 189 |
| `#4A6844` | `--franchise-border` | borders + raised/inset fills | 429 |
| `#3F5A3A` | `--franchise-panel-dark` | nested darker panel | 43 |
| `#3F563F` | `--franchise-panel-darker` | deeper nested panel | 26 |
| `#2D3D2F` | `--franchise-shadow` | deepest green shadow | 6 |

### Text
| Hex | Token | Role | ~uses |
|---|---|---|---|
| `#E8E8D8` | `--franchise-text` | primary parchment text | 836 |

### Gold / amber — accent
| Hex | Token | Role | ~uses |
|---|---|---|---|
| `#C4A853` | `--franchise-gold` | primary gold accent | 199 |
| `#FFD700` | `--franchise-gold-bright` | bright gold (badges/stars) | 35 |
| `#D4B863` | `--franchise-gold-light` | lighter gold fill | 6 |
| `#FFEFB5` | `--franchise-gold-soft` | pale gold text | 17 |
| `#FFD27A` | `--franchise-gold-amber` | warm amber text/fill | 10 |
| `#9A7B2C` | `--franchise-gold-dark` | bronze border | 7 |
| `#5A5130` | `--franchise-gold-deep` | dark gold-tinted surface | 4 |

### Win / positive
| Hex | Token | Role | ~uses |
|---|---|---|---|
| `#00DD00` | `--franchise-win` | win / positive | 16 |
| `#9DFFB0` | `--franchise-win-text` | soft positive text | 4 |

### Loss / negative
| Hex | Token | Role | ~uses |
|---|---|---|---|
| `#DD0000` | `--franchise-loss` | loss / negative | 24 |
| `#DC3545` | `--franchise-loss-alt` | alt red (warnings) | 14 |
| `#8B0000` | `--franchise-loss-deep` | dark red surface | 4 |
| `#5A3F3F` | `--franchise-loss-panel` | red-tinted panel bg | 30 |
| `#6B3F3F` | `--franchise-loss-panel-alt` | red-tinted panel bg (raised) | 6 |
| `#FFD6D6` | `--franchise-loss-text` | light red text | 33 |
| `#FFE0E0` | `--franchise-loss-text-soft` | lighter red text | 7 |

### Info / blue
| Hex | Token | Role | ~uses |
|---|---|---|---|
| `#3366FF` | `--franchise-info` | info accent (bg+border) | 23 |
| `#5599FF` | `--franchise-info-bright` | brighter info text/fill | 23 |
| `#4169E1` | `--franchise-info-deep` | royal-blue accent | 10 |
| `#0066FF` | `--franchise-link` | **== `--snes-bright-blue`** (dup) | 4 |

### Neutral / ink
| Hex | Token | Role | ~uses |
|---|---|---|---|
| `#1A1A1A` | `--franchise-ink` | dark surface / overlay | 20 |

**Coverage:** the tokens above cover ~95% of in-scope occurrences. The remaining
long tail is the FLAG bucket (§5) — do NOT auto-token it.

---

## 2. FLAG — colors that do NOT map cleanly (ask JK before touching)

Per the failure protocol, these are quoted, not invented-around. **Recommendation
for each is noted; none are swept in Phase 2 without a JK OK.**

1. **Stadium spray-chart SVG art palette** — `TeamHubContent.tsx` ~5480–5545:
   `fill="#274A34"`, `stroke="#8EA87E"`, `stroke="#7FA372"`, `fill="#8C6A3D"`,
   `stroke="#F4F1DE"`, plus `#365A3D #3A5834 #2F4C36 #20382A #1F2B21 #1A3020`.
   → **EXCLUDE.** This is a hand-tuned baseball-field illustration, not UI chrome.
   Tokenizing risks altering the artwork. (Optional later: a separate
   `--franchise-spray-*` set — only if JK wants it themed.)
2. **JS data-color maps** (feed `style`/SVG, not className) — e.g.
   `FranchiseHome.tsx:4630` `getNewsCategoryColor` (`"LEAGUE NEWS" → #7733DD`,
   `"TRADE RUMORS" → #CC44CC`), `TeamHubContent.tsx:5390` role colors
   (`#81B29A`, `#A9BCD0`), `:5398` grade color (`#B388FF`), and the
   `colorHex/backgroundHex` config (`#38BDF8` / `#123A4A`).
   → **EXCLUDE from the CSS-var sweep.** These are data, not theme; changing them
   is a behavior question. If unification is wanted, do it as a separate typed
   constants module — not part of this byte-safe pass.
3. **True one-off chrome tints** (<3 uses, not in §1) — `#F2CC8F #FFD166 #FF6B6B
   #FF9944 #A7F3D0 #A7F3C1 #BFE6A8 #A8F08A #D8E8D0 #88DD44 #4A1F1B #A3483D #D8E7FF
   #D8DEE9 #2A2A2A #FFFFFF #000`.
   → **DEFAULT: leave as literals** (they render fine and merging changes pixels).
   Optional: assign each its own token or fold into the nearest §1 token — but
   folding changes pixels, so it needs JK's visual OK per spot.

---

## 3. Spacing & density scale

The hub's busy-ness comes from cards packing many stats at tiny sizes with little
breathing room. Use these rules in Phase 2 — **CSS/className spacing only, no
layout restructuring, no new components.**

### 3.1 Spacing scale (Tailwind units; the hub already lives in 1–8)
`1 (4px) · 2 (8px) · 3 (12px) · 4 (16px) · 6 (24px) · 8 (32px)`.
- Card inner padding: **`p-3`** default, `p-4` for hero/summary cards. Avoid `p-1/p-2`
  on primary cards.
- Gap between cards in a grid/strip: **`gap-3`** (never `gap-1`).
- Section vertical rhythm: **`space-y-4`** between stacked sections.

### 3.2 Density rules (the "busy screens" fix)
- **Max ~5–6 data points per card at default size.** If a card shows more, demote
  the secondary ones to a single muted sub-line or move them behind disclosure.
- **One emphasis per card.** At most one gold/`--franchise-gold` highlight and one
  win/loss color per card; everything else is `--franchise-text` (optionally
  `/70`–`/60` for secondary). Stacked colored badges read as clutter.
- **Progressive disclosure for depth.** Drill-down detail (full splits, evidence
  lists, manager internals) belongs behind the existing player/team profile-card
  click — keep the at-a-glance card lean; don't inline the deep table.
- **Collapse repeated micro-rows.** Where a strip repeats the same label/value
  pattern many times at `text-[8px]`, prefer one slightly larger row or a compact
  table over a dense wall.
- **Breathing room over hairlines.** Prefer spacing to separate groups; reserve
  `--franchise-border` lines for genuine structural separation, not every row.
- **Don't shrink below `text-[10px]` for primary values.** `text-[8px]` is fine
  for secondary captions only.

These are guidelines for the busiest cards (see §4 punch list), not a mandate to
re-pad every element. Same green identity; just calmer.

---

## 4. PUNCH LIST — specific spots (file:line · tag)

Tags: **[token]** repoint hex→token · **[copy]** de-jargon per §7 · **[density]**
apply §3. This is the representative work list; the §1 table + §7 rules drive the
full mechanical sweep.

### Token (the dominant, mechanical item)
- **[token]** `FranchiseHome.tsx` — 982 inlined hexes throughout (root wrapper at
  `:1241` `bg-[#567A50]`; standings/news/schedule/playoff cards). Sweep to §1.
- **[token]** `TeamHubContent.tsx` — 888 inlined hexes (summary / morale / roster /
  directory / season-stats / manager cards). Sweep to §1; **exclude** the spray
  SVG (~`:5480`) and role/grade color fns (~`:5390`, `:5398`) per §2.
- **[token]** `ScheduleContent.tsx` — 154 inlined hexes (the IndexedDB grid +
  add/edit/import rows).
- **[token]** `SeasonSummary.tsx` — 112 inlined hexes.
- **[token]** `AwardsWatchlist.tsx` — 42 inlined hexes.

### Density (the busiest cards — from UI_CLEANUP_PLAN CLEAN-2 + survey)
- **[density]** `FranchiseHome.tsx:1507` All-Star field position boxes — dense grid;
  apply §3.1/§3.2 (and note the All-Star tab itself stays gated, `:181`).
- **[density]** `FranchiseHome.tsx:2429` playoff performer cards — stat-packed;
  trim to ~5 points + one emphasis.
- **[density]** `FranchiseHome.tsx:2253` & `:2456` — near-duplicate "no playoff
  data yet" empty states; unify wording + spacing.
- **[density]** `TeamHubContent.tsx` roster / season-stats cards — the `text-[8px]`
  micro-row strips; raise primary values, demote secondaries.

### Copy (D11 #14/#15 — flip LIVE families, keep blocked ones honest)
- **[copy]** `AwardsWatchlist.tsx:170,178` — `"PROJECTED"` / "Projected —
  finalizes at season end." This is the **honest live-projected** state (awards
  ARE live). **KEEP** the projected→final framing (D11 #14); just ensure it reads
  as plain English, not dev-status. Awards persistence elsewhere should read
  **LIVE, not BLOCKED** (D11 #15).
- **[copy]** `TeamHubContent.tsx` value panel (True Value + Expected Wins, D4) —
  mid-season **"TRUE VALUE PROJECTED"** (badge PROJECTED) → after freeze **"TRUE
  VALUE FINAL"** (badge TRUSTED). Remove "deferred/preview" framing on the value
  inputs so the badge and the inputs card don't contradict (D11 #14). Salary shows
  as real (no "preview").
- **[copy · KEEP HONEST]** `TeamHubContent.tsx:4177, 5954, 5955, 5661, 5666,
  3333, 6273` — "blocked" / "read-only" lines for **salary movement, morale,
  Mode 3, expected-wins persistence, narrative mutations**. These features are
  GENUINELY inactive → keep an honest "not yet available" state (reword from
  engineering-speak to plain English, but **do NOT promote to LIVE**).
- **[copy]** sweep the banned words (§7.2) wherever the underlying feature is live
  (awards, true value, designations) — `"preview" / "READ-ONLY" / "internal v1" /
  "deferred" / "provisional"`. Leave them where the feature is honestly blocked.

---

## 5. (reserved — folded into §2)

---

## 6. EXCLUSIONS

- **`FranchiseV1VisualSmokeSeed.tsx`** — **EXCLUDE.** It is a dev visual-smoke
  fixture behind `enableFranchiseVisualSmokePreviewRoute` (falls back to
  `NotFound` when off — `App.tsx:344`), not a real user surface. Confirmed.
- **GameTracker, the entire offseason, `theme.css`'s existing SNES tokens, and
  everything in engines/utils/storage/hooks** — out of scope, do not touch.

---

## 7. Copy voice guide (Tootwhistle Times register)

Source: `spec-docs/BEAT_REPORTER_VOICE_SPEC.md`. The hub speaks like a friendly
small-town beat reporter, not an engineer. Plain, warm, concrete.

### 7.1 Voice
- Plain language a fan reads at a glance. Short labels, real words.
- Friendly and a touch folksy (Tootwhistle Times), never clinical.
- Honest. When something genuinely isn't on yet, say so simply — see §7.3.

### 7.2 BANNED words/phrases in user-facing prose (where the feature IS live)
`preview` · `READ-ONLY` / `read-only` · `internal v1` · `deferred` ·
`provisional` · `dry-run` (as a user label) · `stub` · `TODO` · `recompute` ·
`engine` · `gated` · raw flag names. Replace with plain equivalents (e.g.
"projected", "early look", "live", "final", "not yet").

### 7.3 NOT banned — honest "not yet" states (D11 #14/#15)
`blocked` / `not yet available` / `coming later` are **allowed and correct** for
features that are genuinely inactive: **salary movement, player & fan morale,
Mode 3, expected-wins persistence, the offseason ceremony/voting.** Keep these
visibly not-yet — do NOT over-promote. The de-jargon job is only to soften the
*wording* (engineering-speak → plain English), not to flip a blocked feature to
"live."

### 7.4 The LIVE families to flip (D11) — these ARE on, so drop the dev-status
- **Awards** — projected mid-season, final at season end; "Awards persistence" =
  **LIVE**.
- **True Value** — **PROJECTED** mid-season → **FINAL/TRUSTED** after freeze.
- **Designations** — live (Albatross / Fan Favorite / Captain / Fan Hopeful
  resolve to real players).
Make sure no card contradicts itself (a "trusted/final" badge above a "deferred"
input line).

---

## 8. Phase-2 wiring (when the gate opens — NOT done yet)

1. **Import the layer.** Add `@import './styles/franchise-theme.css';` to the
   active CSS entry. **Recommended:** append it to `src/index.css` (the file
   `main.tsx` loads) so it's in the live bundle. (Adding to the unimported
   `src/src_figma/styles/index.css` would NOT load it — see §0.1.)
2. **Add the wrapper class** `franchise-hub` to the two top-level franchise PAGE
   roots so the scoped vars cascade to all children:
   - `FranchiseHome.tsx:1241` — add `franchise-hub` to the
     `min-h-screen … bg-[#567A50]` root div. (`TeamHubContent`, `ScheduleContent`,
     `AwardsWatchlist` render inside it → inherit automatically.)
   - `SeasonSummary.tsx` — add `franchise-hub` to its root wrapper.
3. **Sweep** hex → token per §1, de-jargon per §7, apply density per §3.
4. **Verify:** `npm run build` passes; full suite no new reds vs the
   7,765/447-characterized baseline (`NODE_ENV=` prefix); grep shows zero
   remaining `bg-[#`/`text-[#`/`border-[#` and inline-style hex in the in-scope
   files (except the §2 EXCLUDED spray SVG + JS data maps, which stay as-is); then
   JK browser/iPad sign-off.

---

## 9. PHASE 2 OUTCOME (executed 2026-06-19)

**Gates re-verified before sweeping:** L12-5 fully committed (HEAD `fb120400`);
sole source-mutator (no active build). Both passed.

### LANDED (verified)
- **Var scoping → `:root`** (JK-approved) so portaled modals/tooltips resolve the
  vars; `franchise-theme.css` rewritten with all **59 tokens** (58 bracketed +
  `--franchise-black` for the one inline-style `#000`).
- **Import wired** in `src/main.tsx` (`import './src_figma/styles/franchise-theme.css'`)
  — NOT a `.franchise-hub` wrapper (unnecessary with `:root` vars; skipped to keep
  the diff minimal).
- **hex→token sweep:** 2,134 bracketed-arbitrary-value hexes → `var(--franchise-*)`
  across the 5 files, 1:1 byte-identical (perl, bracket-only). The one inline-style
  `#000` → `var(--franchise-black)`.
- **Verify:** `npm run build` exit 0; grep shows **0** bracketed hex + **0**
  inline-style hex in scope; the 5 touched franchise test files pass **94/94 in
  isolation**; full suite = only the documented characterized/order-dependent fails
  (`wpaRuntimeBoundary` + the rotating `franchiseManualSmokeFixture` /
  `franchiseOffseasonGuards` / `AwardsWatchlist` full-suite-only fails) — **zero new
  reds**. Net diff +1 line (the import); all else balanced 1:1 className swaps.

### FLAGGED — copy de-jargon NOT applied (reverted)
The franchise hub's user-facing copy is **test-characterized D11 honesty wording**,
and one string is **engine-generated** (`franchiseRelationshipContextPreview`
`evidencePolicy` / `franchiseSeasonEndReadiness` `limitations`). 4 trial softenings
(AwardsWatchlist "D9 awards store"; spray blurbs 3471/5120; the relationship blurb
4174) each broke characterized tests → **all reverted** to keep the suite green.
**De-jargoning these is a deliberate change requiring coordinated test (+ engine)
updates + JK sign-off, not a unilateral polish.** Candidate spots remain in §4/§7;
they await a JK ruling.

### FLAGGED — density NOT refactored (intentional retro)
Audit finding: in-scope **primary** cards already follow good density (`p-4`,
`gap-3`, ≤5 data points, one emphasis — e.g. playoff performer cards
`FranchiseHome.tsx:2430`). The "busy" feel is **150 intentional `text-[8px]`**
retro-aesthetic captions + **zero** tight-padding cards. A blind text/padding
refactor would change the visual identity (forbidden) and can't be verified without
the rendered screens. **Density is best finalized with JK against the iPad**,
pointing at any genuinely-busy spots; the §3 rules apply when that happens.

### Status-panel copy (separately flagged)
The engineering transparency/gate readouts — "MODE 2 FOUNDATION STATUS"
(`TeamHubContent` ~5615), the top-of-hub NO-MUTATION/AVAILABLE gate
(`FranchiseHome` ~193–217), and the D11-ratified "awards-aware handoff package"
manifest (`SeasonSummary:881`) — were left as-is. Whether to plain-language these
or keep them as technical readouts is a JK product decision.
