# FABLE C4-B CHECKPOINT — conformance verdicts + the Draft Room merge design

**Author:** Fable 5 (design authority) · **Date:** 2026-07-02 · **Trigger:** the Opus
checkpoint (kit + auction market-read built; setup-merge awaiting my design). Verdicts per
`UX_NORTH_STAR.md` §9; the merge design realizes R-IA2 + the two-pool-mode ruling.

---

## §1. CONFORMANCE VERDICTS (code-read; JK's browser look is the visual gate)

### 1.1 Ballpark kit (`ballpark-kit.css` + `components/ballpark`) — **CONFORMS AS STAGED**, with one required understanding + three kit gaps

The token VOCABULARY, the typewriter font split (chrome vs human), the hard-offset shadows,
press physics, panel/modal/feed-card primitives, and the amber-wood gold family are all
correct north-star §1 material. **The required understanding: this is STAGE 1 (dedupe), not
the migration.** The surface VALUES freeze the legacy army-green (`--ballpark-page-bg
#2d3d2f`, `--ballpark-panel #556B55`) rather than the chalk-and-ash surfaces (ground
`#CBB89C`, panels `#3d4a42/#3d5240` over wells `#243028`) — correct for a no-visual-change
adoption, and the ash-tan token is already present. THE FLIP (token values → the GameTracker
surfaces) is a later, deliberate, re-verified stage — one edit in one file by design. Do not
declare the league-builder screens "migrated" until it happens.
**AMENDED post-flip (JK browser ruling 2026-07-02):** the ash-tan page ground (`#CBB89C`) is
DISTRACTING at full-page scale. New ruling: **page ground = the well green `#243028`** — the
darkest existing palette value, so panels (`#3d4a42`/`#3d5240`) still lift and recessed
wells read as cut-through-to-ground. Ash tan stays in the kit as an ACCENT-ONLY token, never
the page ground. One-line change to `--ballpark-page-bg`. See DECISIONS_LOG same date.
Kit gaps for the next rev (non-blocking): the chalk PNG texture layer · the recessed-well
scroll body (inset shadow + dark edge) · the tracked ALL-CAPS micro-label style. Minor
semantic: `--ballpark-status-red #DD0000` is the GameTracker's END-GAME-only alarm red;
routine destructive UI should eventually carry signal red `#DC3545`.

### 1.2 Auction market read (`AuctionStage` + `LeagueBuilderAuctionDraft`) — **CONFORMS**, two minor notes

Verified: the old three-advisor stack is REMOVED (coach/scoutInsight gone from the VM;
replace-not-fuse honored); the `?` help panel matches the help-layer rule; the market read
feeds from `estimateMarket` (the PUBLIC surface — the walled internals stay walled, F4
holds); CONTESTED is counts + plain language only (privacy by construction); setup knobs off
the floor; slice-2 material (verdict/whisper) correctly absent; copy register clean.
Notes: (1) the card says both "Public market" and "Scout band" — pick one attribution when
the scout voice lands in slice 2 (recommend the scout owns it: "your scout's read of the
room"). (2) `likelyPass` renders as QUIET — good copy; keep it away from implying rival
intent (current text is fine).

### 1.3 Header adoption (6 league-builder screens) — **CONFORMS** (hand-rolled headers → `BallparkShell`, behavior-identical).

## §2. THE DRAFT ROOM — the setup-merge design (Codex builds from this)

**One screen** at `/league-builder/draft-setup` (the `/draft-config` route and the
"Preview"-named file die; redirects preserved). Ballpark register via the kit. Single
vertical flow, five zones, each self-contained; ONE `?` help toggle revealing per-zone
annotations. No companions yet (pre-hire); the help layer is the only tutor.

| Zone | Content | Source |
|---|---|---|
| **1 · THE ROOM** | Title plate "Draft Room — {league}" + league selector + the **POOL MODE toggle** ("Pool first" / "Design first" — the JK two-mode ruling, league-level, locked once the pool locks) | new, thin |
| **2 · WHO'S PLAYING** | Seats = GM identities (names PERSISTED — the seat-spine store; Codex verifies the write path), add/remove seat, owner-per-club dropdowns | DraftSetupHubPreview, kept + restyled |
| **3 · THE CLUBS** | Per-club cards: owner · MLB identity · farm identity · "set identity" → ArchetypePicker · **"Design your roster"** → the 22-slot per-position archetype/tag/tilt designer with the live feasibility verdict chip (the evaluator). Mode B: options gray per pool presence + draftability verdicts. Mode A: designs drive extraction. | cards from DraftSetupHubPreview; the designer is NEW and GATES ON the taxonomy audit landing — the merge may ship with the designer stubbed behind the toggle if sequencing demands |
| **4 · THE POOL** | Mode B: the shuttle (in/out panes + filters) + ONE sufficiency chip + the archetype outlook panel + LOCK/UNLOCK. Mode A: "Designs locked: N of M clubs" → EXTRACT POOL (disabled until all lock) → proposed-pool review with per-cell counts + shortfall reasons → add/subtract → LOCK. | Mode B = LeagueBuilderDraftSetup's shuttle moved in (dedupe the sufficiency line); Mode A UI = new, engine per taxonomy design §6 (the POOL-FROM-DEMAND ticket) |
| **5 · THE FLOOR** | Shill stepper (recommended default) + ONE room summary line + **START THE DRAFT** (gates: pool locked+sufficient · every club has an identity · Mode A: all designs locked · no stale session; blockers surface inline as plain hints) → scout hire. On a drafted league the plate carries **"Drafted ✓ · Run it back"**. | from both screens, deduped |

**Kills executed by this build:** the second DRAFT SETUP header, the duplicated pool-status
plumbing and sufficiency readouts, the `/draft-config` route, the Preview filename, every
inline explainer (→ the `?` layer; the archetype explainer copy from
DraftSetupArchetypePreview:40-44 is harvested verbatim into zone 3's help — reconcile its
stale "15" → 24).
**Copy:** zone names as given (chrome register); help annotations in plain broadcast prose;
§6 banned words apply.
**Sequencing:** the merge (zones 1/2/4-Mode-B/5) can build NOW against this doc; zone 3's
designer + Mode A activate behind the toggle as the taxonomy audit + POOL-FROM-DEMAND land.
I design-review the build against this section + the §9 checklist.

## §3. DESIGN-REVIEW VERDICT — the Draft Room merge build (2026-07-02, post-build)

**CONFORMS to §2 — clear to commit.** Verified against the build (not the builder's report):
all five zones present, numbered, in order, on the kit primitives · ONE `?` help toggle with
per-zone annotations (the fen-help pattern) · seat/GM persistence ADDITIVE on the existing
LeagueTemplate store (`draftSeats`/`gmSeatName` — no new IndexedDB) · `/draft-config` →
`Navigate replace` redirect + the Preview file DELETED · banned-words sweep clean (zero
"deferred"/seed/internal-noun leaks) · ONE pool-sufficiency readout (zone 4; zone 5's "rec"
hint is the shill datum, not a duplicate) · the archetype explainer HARVESTED verbatim into
zone-3 help with the stale "15"→24 reconciled (this also closes the pulled QW-10) · START
gates surface inline blocker hints · mode toggle present with Design-first as the placeholder
per sequencing.
**The flagged "duplicate title" is a FALSE POSITIVE:** :722 is the no-leagues empty-state
branch (early return), :733 the main render — one header per render path.
**One staging note (fine as-is):** the "Drafted ✓ · Run it back" chip is a static status
span — correct until the RUN-IT-BACK action ticket lands, when it becomes the entry button.
