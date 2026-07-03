# FABLE WHISPER PANEL — layout & composition spec (C4-B slice 2)

**Author:** Fable 5 (design authority) · **Date:** 2026-07-02 · **Status:** BINDING for the
C4-B slice-2 build (Codex builds; Opus audits against §8).
**Parents:** `ASST_GM_DESIGN.md` §2/§3/§5/§6 (delivery model, two-voice partition, five
lights, payload) · `UX_NORTH_STAR.md` §1/§4/§6/§9 (register, companion rules, banned words,
checklist) · `FABLE_C4B_CHECKPOINT_2026-07-02.md` §1.2 (the stage CONFORMS verdict this panel
must not disturb).
**Surface:** the per-seat Assistant-GM whisper panel inside `AuctionStage`
(`src/src_figma/app/components/auction/AuctionStage.tsx`), MLB + farm tiers, one component.
This doc is design-only; the payload TYPE is the PAYLOAD-CONTRACT ticket's to finalize.

---

## §1. DESIGN INTENT

The auction floor already has one public voice: the scout, on the lot card, saying the same
thing to every seat. The whisper panel adds the second sanctioned voice — the Assistant GM,
speaking ONLY to the club on the clock, about ONLY that club's room. It is a covered note
slid across the table: closed by default, opened deliberately, and it snaps shut the moment
the device moves. Everything about its form serves two masters at once: **couch-coop secrecy**
(the same learned cover-then-peek gesture family as the farm scout fog — nothing private is
ever on screen, or in the DOM, unbidden) and **glanceable counsel** (when opened, the single
most valuable sentence — bid, cap, or pass, and why — is the first thing the eye lands on,
with the roster scorecard and the private board beneath it in strict descending order of
urgency). The panel is quiet furniture: a one-line strip when closed, never competing with
the lot card's hero treatment, never animating idle, never changing its closed face based on
what it knows.

---

## §2. WHERE IT LIVES + LAYOUT STRUCTURE

### 2.1 Placement

- **Right column, slot 1** — the first child of the stage's right column, ABOVE the roster
  need board (`.card.board`) and lot log. Rationale: the right column is already the "your
  room" column (your slots, your results); the left column is the public floor (lot + your
  move). Collapsed, the panel is one strip-height and cannot compete with the lot card's
  hero name/gold treatment across the gutter.
- **Narrow/stacked layout:** the stage grid stacks naturally; resulting order is
  lot → move → **whisper** → board → log. No new breakpoint work; the strip must remain
  full-width of its column at all sizes.
- **No page scroll introduced.** The revealed body is height-capped (§2.3); the board list
  inside it is the self-scrolling zone.

### 2.2 Idiom + tokens

Build inside the stage's ruled-CONFORMS `.auc-*` idiom, composing ballpark-kit tokens exactly
the way the market read did (`ballpark-feed-card` + `--ballpark-*` vars inside `.auc-root`).
New class family: `whisper-*`, scoped under `.auc-root`.

| Role | Token/primitive |
|---|---|
| Strip + body surfaces | `--auc-inset` wells over a `.card`-family container (`--auc-panel`, `--auc-hairline`, `--auc-r-card`, `--auc-shadow-card`) |
| Seat identity accent | team primary color as a **4px left border tint only** (never a background flood) |
| "Look here" accent | `--ballpark-brass` `#C4A853`; live numbers `--ballpark-scoreboard-yellow` `#F2C041` via `.gold`/`.num` |
| Status ramp (lights) | green `#34d399` · amber `#fbbf24` · signal red `#DC3545` · hollow chalk outline (§5) — NOT the end-game alarm red `#DD0000` |
| Chrome labels | `.eyebrow` (11px, tracked, uppercase, `--auc-muted`) |
| Advisor prose | `--auc-font-body` at 13.5px, `--auc-text` chalk — same voice treatment as the scout's fog note |
| Numbers | `.num` (`--auc-font-num`, tabular) |
| Pixel type | **NONE.** The jumbotron exception covers the lot name and high bid only; nothing in this panel uses `--auc-font-char`. |

### 2.3 The labeled tree

```
WHISPER PANEL  (right column, slot 1; margin-bottom 16px)
│
├── STRIP  — always rendered; height ~44px; .auc-root well surface (--auc-inset),
│            1px --auc-hairline border, --auc-r-ctl radius, 4px team-primary left border;
│            press physics (active:scale-95); entire strip is ONE <button>
│   ├── left:  eyebrow label  "ASST GM · {CLUB NAME}"          (chrome register)
│   └── right: affordance     "🔒 TAP FOR THE READ"            (closed, human on the clock)
│                             "🔒 COVER IT"                    (open)
│                             "WAITING ON THE TABLE"           (dormant — CPU turn; strip
│                              disabled, ~55% opacity, no lock glyph, no team border tint)
│
└── BODY  — rendered ONLY while open (conditional render — absent from the DOM when
    closed; §3.4); .card container; padding 16px; max-height min(56vh, 480px);
    flex column, gap 14px; overflow hidden (the board well scrolls, nothing else)
    │
    ├── [1] THE WHISPER  (headline block — always first, always above the fold)
    │   ├── verdict line   — 17px/800 advisor prose in the verdict color (§6)
    │   ├── your-number    — "YOUR NUMBER" eyebrow + capValue in .num
    │   │                    (scoreboard yellow when verdict = cap; chalk otherwise)
    │   ├── why line       — one sentence from the payload, advisor prose, chalk
    │   └── room line      — one RELATION sentence vs the market (§4.2), --auc-muted,
    │                        12.5px. NEVER re-renders band dollar figures.
    │
    ├── [2] FIVE LIGHTS  (the roster scorecard, compact)
    │   ├── light row — 5 equal-width cells in a row: SHAPE · IDENTITY · CHEMISTRY ·
    │   │               BALANCE · BUDGET; each cell = <button>: 14px dot (3px border)
    │   │               above a 10.5px tracked micro-label; selected cell gets a
    │   │               2px brass underline
    │   └── sentence line — ONE plain sentence for the selected light (advisor prose,
    │                       13px, min-height 2 lines so selection doesn't reflow)
    │
    ├── [3] YOUR BOARD  (private ranked pool for this seat)
    │   ├── header row — eyebrow "YOUR BOARD" + chip "{N} NAMES LEFT" + expand toggle
    │   │                ("FULL BOARD" / "FOLD IT UP", chrome, brass)
    │   ├── rows 1–3  — always shown while the body is open
    │   │      row = rank .num · name (advisor font, chalk) · positions (.pos chip style)
    │   │            · right-aligned "your number" in .num
    │   │      the row whose player is the CURRENT LOT gets a brass left-border tick
    │   │            + suffix chip "ON THE BLOCK"
    │   └── expanded — rows 4+ inside a recessed well (background rgba(0,0,0,0.22),
    │                  inset top/bottom 1px dark edge, max-height 190px, overflow-y auto)
    │
    └── HELP ANNOTATION — rendered only when the screen's existing Help toggle is on
        (§7.3); one line, help-panel styling, at the foot of the body
```

Section separators: 1px `--auc-hairline` between [1]/[2]/[3]. No other chrome. Sections whose
payload piece is absent render **nothing** (no empty frames — north-star "no empty chrome"),
except the five lights, which always render all five cells (§5).

---

## §3. REVEAL · RE-KEY · SECRECY (the interaction contract — each rule testable)

**R1 — One seat in, ever.** The panel receives exactly ONE `RosterIntelligencePayload`,
built by the adapter for the seat currently on the clock, and only when that seat is
human-controlled. Non-active seats' intelligence is never passed as props, never rendered,
never present in the DOM. (Payloads for other seats must not be precomputed into any
rendered structure; the adapter builds on demand per §2 of `ASST_GM_DESIGN.md` — re-evaluate
after every lot event.)

**R2 — Closed by default.** On mount, and after EVERY re-key, `open = false`. There is no
persistence of open state across seats, lots, or sessions.

**R3 — The gesture.** A single click/tap anywhere on the strip toggles open/closed. This is
the same privacy family as the farm scout fog (covered by default; a deliberate uncover
gesture; the cover is the whole affordance) — but click-to-stay-open rather than
hold-to-peek, because the read is too dense for a held peek. The lock glyph on the strip is
the family's shared cue. No hover-reveal, no auto-open, ever.

**R4 — Re-key = collapse first, then swap.** The component is keyed on
`payload.seatTeamId` (remount on change is the recommended implementation). Observable
requirements, in order, within one commit:
  1. the open body unmounts (zero whisper-body nodes in the DOM);
  2. the strip's club name and team-color border swap to the new seat;
  3. the strip plays ONE one-shot brass border pulse, ≤360ms, no loop (suppressed under
     `prefers-reduced-motion`, which the stage's existing media query already handles).
No frame may ever show seat A's body content alongside seat B's name — collapse-then-swap
is the enforced order that guarantees it.

**R5 — Dormant during CPU turns.** When the seat on the clock is CPU (the stage's
`cpuTurnName` state), the strip renders the dormant state (§2.3): disabled, no reveal
affordance, no team tint, label "ASST GM" with "WAITING ON THE TABLE". No payload is built
for CPU seats. When the clock returns to a human seat, R4 fires.

**R6 — Live updates while open.** Lot events (bid, pass, hammer, nomination) during the SAME
seat's clock update the open body in place — no collapse, no flash — with one exception: if
the verdict KIND changes (push↔cap↔pass), the verdict line plays one ≤300ms one-shot
underline flash in the new verdict color. A hammer that passes the clock to another seat is
an R4 re-key (auto-collapse), not an in-place update.

**R7 — The closed face never leaks.** The strip's appearance is IDENTICAL regardless of the
advice content behind it — same colors, same copy, same glyph whether the verdict is push or
pass, whether lights are red or green. The only variables on the strip are seat identity
(name + team tint) and the three-state affordance label (closed/open/dormant).

**R8 — Farm = fog-respecting.** On the farm tier the same panel renders; every value shown
(board "your number", verdicts) derives from the scout's fogged bands. The panel never shows
a true rating, a hidden modifier, or a grade number anywhere — the 20–80 grade belongs to
the scout's hold-to-peek fog on the lot card, not to this panel.

---

## §4. PAYLOAD PIECE ORDER + FOLD DECISIONS

### 4.1 The order (fixed)

| # | Piece | Payload source | Fold |
|---|---|---|---|
| 1 | The whisper (verdict + your number + why + room line) | `worthToYou` (+ `market` for the relation only) | Above the fold, always first |
| 2 | Five lights | `scorecard` | Above the fold |
| 3 | Your board, rows 1–3 | `board` | Above the fold |
| 3b | Your board, rows 4+ | `board` | Behind the FULL BOARD expand, self-scrolling well |

Rationale: the panel is opened mid-lot with a bid clock ticking — the bid/cap/pass sentence
is the whole reason the seat opened it, so it is first and largest. The lights are the
standing context ("what does my room need") — second. The board is reference material for
AFTER this lot — third, teased at three rows so the next target is visible without a click,
expanded only on demand.

### 4.2 The market: reference, never duplication

The scout OWNS the public band widget on the lot card (checkpoint §1.2 attribution ruling).
The whisper panel therefore renders **no band, no band dollar figures, no CONTESTED badge**.
It references the market exactly once: the room line under the verdict, a relation sentence
comparing YOUR number to the room in words (copy in §7). Relation is computed from
`worthToYou.capValue` vs `market.band`: below band-low → "under" · within band → "inside" ·
above band-high → "past". If `market` is absent, the room line renders nothing.

### 4.3 Absent-piece behavior (no lot on the block, empty board)

- `worthToYou` absent (between lots / this seat is nominating): section [1] renders the
  nomination whisper instead — one line: *"Nothing on the block. Best name still out there:
  {board[0].name}."* (Nomination strategy is Asst-GM-owned per `ASST_GM_DESIGN.md` §3.) If
  the board is also empty, use the empty-board line (§7).
- `scorecard` absent: the five-lights section renders nothing (whole section, not five
  hollow dots — hollow means "no read on THIS light", §5, not "no scorecard").
- `board` absent or empty: section [3] renders the header plus the empty-board line (§7);
  no rows, no expand toggle.

---

## §5. THE FIVE LIGHTS — rendering rules

**The row.** Five cells, always all five, always in this order: SHAPE · IDENTITY ·
CHEMISTRY · BALANCE · BUDGET. Each cell is a button: a 14px round dot (3px border) over a
10.5px tracked ALL-CAPS micro-label in `--auc-muted`. Cells are equal width; the row spans
the body width.

**Dot states (exactly four):**

| State | Fill | Border | Meaning |
|---|---|---|---|
| green | `#34d399` | same, full opacity | healthy |
| amber | `#fbbf24` | same | watch it |
| red | `#DC3545` | same | broken/trapped (signal red — never the `#DD0000` end-game alarm) |
| **hollow** | transparent | `--ballpark-chalk` at 45% opacity | no read yet (an unlit bulb) |

The hollow state is a first-class citizen of the frame: BALANCE and IDENTITY ship hollow in
v1 until their math lands, and ANY light must be able to render hollow if its payload field
is absent — the frame never breaks, a bulb is just unlit. No pulsing, no "soon" badge, no
disabled styling on the label.

**The sentence line.** Exactly one sentence renders below the row at a time — the selected
light's sentence from the payload. Default selection on open and after every payload
refresh: the worst light, priority **red > amber > green > hollow**, leftmost wins ties.
(A hollow light is never the default voice — the advisor leads with what he knows, not with
what he doesn't.) Tapping any cell selects it; selection shows as a 2px brass underline
under the cell. The line is reserved at two lines of height so switching lights never
reflows the board below.

**Hollow sentence.** Payload carries no sentence for a hollow light; the panel supplies the
standing line (§7, "no-read"). Same line for every hollow light — the advisor has one way
of saying "not yet."

**Click-through depth.** In THIS panel, the sentence IS the detail — no drill-in, no modal
(a bid clock is running). The §5 "click-through to detail" of `ASST_GM_DESIGN.md` is the
C4-C surface's job; the panel's lights are the compact form only.

---

## §6. THE VERDICT HEADLINE

One visual slot, three states, colored by the ADVICE, never by alarm, and never implying
what rivals intend (rival heat is the scout's public CONTESTED signal — the Asst GM speaks
only about your number and your room):

| Verdict | Verdict line color | Your-number treatment | Register |
|---|---|---|---|
| `push` | status green `#34d399` | chalk `.num` | Confident go |
| `cap` | brass `--ballpark-brass` | **scoreboard yellow `#F2C041`** `.num` — the cap IS the live number of this state | Disciplined ceiling |
| `pass` | sage `--ballpark-sage`, line at ~85% opacity | chalk `.num`, muted | Calm walk-away |

No red verdicts — red is reserved for the scorecard's broken-roster lights. The verdict line
is 17px/800 advisor prose (NOT chrome caps — he is a person speaking, per the C3 register
split). The why line beneath is payload copy rendered verbatim. Copy templates are
pronoun-aware via the lot's existing `objectPronoun`.

---

## §7. COPY (final strings — §6 banned-word compliant) + HELP

### 7.1 Chrome strings (Moms register: terse, tracked, ALL-CAPS)

| Slot | String |
|---|---|
| Strip label | `ASST GM · {CLUB NAME}` (dormant: `ASST GM`) |
| Strip affordance — closed | `🔒 TAP FOR THE READ` |
| Strip affordance — open | `🔒 COVER IT` |
| Strip — dormant (CPU turn) | `WAITING ON THE TABLE` |
| Your-number eyebrow | `YOUR NUMBER` |
| Light labels | `SHAPE` · `IDENTITY` · `CHEMISTRY` · `BALANCE` · `BUDGET` |
| Board header | `YOUR BOARD` |
| Board count chip | `{N} NAMES LEFT` |
| Board expand / collapse | `FULL BOARD` / `FOLD IT UP` |
| On-the-block row chip | `ON THE BLOCK` |

### 7.2 Advisor strings (Tox/body register: broadcast prose, his voice)

| Slot | String |
|---|---|
| Verdict — push | `Go get {him}.` |
| Verdict — cap | `Chase {him} to {cap} — not a dollar past.` |
| Verdict — pass | `Let {him} go.` |
| Room line — inside band | `That sits inside what the room expects.` |
| Room line — past band | `You'd be paying past the room — make sure you mean it.` |
| Room line — under band | `The room wants more than you should give.` |
| Nomination whisper (no lot) | `Nothing on the block. Best name still out there: {name}.` |
| No-read light sentence | `No read yet — still doing my homework on this club.` |
| Empty board | `The board's bare. Finish the roster with what's left on the floor.` |

The why line and each colored light's sentence arrive in the payload and render verbatim
(they are written to this register at the payload layer). The verdict/room templates above
are the panel's own strings. None of these strings may contain: deferred, v1, flag, gate,
store, validate, canonical, IV, seed, or any feature-absence disclaimer.

### 7.3 Help layer

**No second `?`.** The stage's existing Help toggle is the one help switch on the floor.
When it is on: (a) closed strip — a one-line annotation renders directly beneath the strip;
(b) open body — the same line renders at the body's foot (§2.3). The line:

> *Your assistant GM's private read — advice for this seat alone. Only the club on the clock
> can open it, and it covers itself when the turn moves on. He suggests; you decide.*

---

## §8. AUDITOR VERIFICATION CHECKLIST (Opus runs this against the diff + a live pass)

**Secrecy (the invariant that matters most):**
- [ ] With seat A's panel open, a DOM query contains ZERO strings from any other seat's
      intelligence — no other seat's board names, verdicts, cap values, or light sentences.
      (Test: render with a multi-seat session, assert absence of seat B's distinctive
      board-name fixtures in `document.body`.)
- [ ] Collapsed panel = zero whisper-body nodes in the DOM (conditional render, not CSS
      `display:none` / `visibility`).
- [ ] Dispatch a clock-pass event with the panel open → in the resulting DOM there is no
      whisper body, and the strip shows the NEW seat's name. No intermediate frame renders
      old body + new name (collapse-then-swap; keyed remount satisfies this).
- [ ] The adapter builds a payload only for the human seat on the clock; no other seat's
      payload object is constructed into rendered props.
- [ ] Farm tier: no true ratings, hidden modifiers, or 20–80 grade figures anywhere in the
      panel's DOM.

**Closed-face neutrality:**
- [ ] Strip DOM/styles are identical across a push-verdict payload and a pass-verdict
      payload (snapshot compare) — only seat identity and open/closed/dormant affordance
      vary.

**Interaction:**
- [ ] Mount → closed. Re-key → closed. Click strip → open; click again → closed.
- [ ] CPU turn → dormant strip, disabled, `WAITING ON THE TABLE`, no team tint.
- [ ] Bid event during the same seat's clock with panel open → content updates in place,
      panel stays open.
- [ ] Verdict-kind change while open → one one-shot ≤300ms flash, none on same-kind updates;
      re-key pulse ≤360ms one-shot; both dead under `prefers-reduced-motion`.

**Composition:**
- [ ] Piece order in the DOM: whisper → lights → board. Board rows 1–3 visible on open;
      rows 4+ only after FULL BOARD, inside a well that self-scrolls; no page scroll
      introduced (viewport-height check at 1280×800).
- [ ] No market band figures or CONTESTED badge inside the panel (grep the panel subtree for
      `market.band` dollar values); the room line is one of the three relation strings.
- [ ] All five light cells always present, in order; hollow state renders for an absent
      light field; default selected light follows red > amber > green > hollow, leftmost
      tie; sentence area does not reflow on selection.
- [ ] Absent payload pieces render nothing (no empty frames); absent lot renders the
      nomination whisper.

**Register + conformance (north-star §9 rides on top of this list):**
- [ ] No `--auc-font-char` / pixel type in the panel; chrome = eyebrow caps, advisor = body
      prose; numbers tabular `.num`.
- [ ] Verdict colors per §6; light red is `#DC3545`, not `#DD0000`; team color appears as
      the 4px strip tint only.
- [ ] Banned-word grep clean over §7 strings as shipped.
- [ ] Exactly one Help toggle on the floor; the panel's annotation renders only when it is
      on.
- [ ] Scout lot card untouched by this diff (git diff confirms); GameTracker untouched.
- [ ] Two voices, two concerns: the panel never speaks about the lot's public market beyond
      the relation line; the lot card never speaks about this seat's private read.
