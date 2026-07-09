# AUCTION FLOOR REFIT — the table, not a dashboard (2026-07-09)

**Author:** Fable (captain, UI/UX authority) · **Status:** RATIFIED by captain per JK directive 2026-07-09 ("whisper panel embedded in its own window that needs to be scrolled… plenty of space underneath"; "unclear which team is up to bid… doesn't effectively use teams' colors"; "only what is usable and actionable by the GMs should be on the screen, everything else is noise").
**Grounding (captain-verified at HEAD 88c34d30):** WhisperPanel.tsx:1317-1318 hard-clamps the whisper to `max-height:min(56vh,480px); overflow-y:auto` with a second internal cage at :1781-1782 (`max-height:190px`); Team.colors {primary, secondary} exists (src/src_figma/app/types/index.ts:26-29); the stage renders a seat strip band whose atoms duplicate whisper tier content.

## §1 First principles
An auction floor answers four questions at a glance: WHO is being sold · WHERE the price sits (and who holds it) · WHOSE turn it is · WHAT my advisor says. Everything else is a tap. Derived laws for this screen:
1. **One scroll context.** The page scrolls; nothing inside it does. Both whisper clamps are deleted. (`position:sticky` is permitted; nested `overflow-y:auto` is not.)
2. **Say it once.** Every number renders exactly once. Duplicate surfaces are deleted, not hidden.
3. **Color = one meaning.** Team identity colors announce exactly one thing: who is acting. No decorative color. Everything else stays in ballpark tokens.
4. **Left = the table (public facts + my actions). Right = my advisor (private intelligence).** No public info on the right; no private info on the left.

## §2 The layout (both floors — MLB and farm share the stage)
**LEFT (the table), top to bottom:**
1. **ON THE CLOCK banner** — full column width, above the lot. Acting team's `colors.primary` as bg, `colors.secondary` as the 5px hard border, hard offset shadow, zero radius. Text auto-contrasts (relative-luminance → chalk or near-black; no unreadable band ever). Copy: "{TEAM NAME} IS ON THE CLOCK" (bid turn) / "{TEAM NAME} TO NOMINATE" (nomination) / viewer's seat: "YOU'RE UP — {TEAM NAME}" with ONE 300ms scale beat on turn arrival (no looping animation). CPU turns keep the existing calm-wait copy inside the band. **Fallback:** colors missing/unpopulated → brass-on-ink band, same geometry (the pattern survives without color data).
2. **Lot panel** (kept, tightened): name, position/trait chips, HIGH BID stays the monster figure; the holder gains a 4px left color swatch in the holding team's primary + abbreviation ("who's winning" reads at a glance). The three unlabeled public-market boxes + reserve chip consolidate into ONE quiet mono line: "MARKET $lo · $mid · $hi — RESERVE $r" with the CONTESTED chip to its right. No data lost; two panel-rows reclaimed.
3. **Bid controls** (unchanged: steppers, gold CTA, let-him-go).
4. **Roster fill board** (MOVED here from the right column's bottom): the seat's "N of 22 · gaps glow" board fills today's dead space under the controls — it is the reason you're bidding, so it lives beside the bid button.

**RIGHT (the advisor, uncaged):**
- The stage-level seat strip band(s) above the whisper are DELETED as surfaces. Atom-by-atom verification required: any strip atom not already present in a whisper tier moves into its correct tier (per the wiring audit, the known uniques — next-position odds, normal-for-grade band — already live in THE READ). THE CALL tier (bid-live since CALLFIX) is the one and only call surface.
- WhisperPanel becomes the right column itself: delete both height clamps; tiers flow naturally; THE CALL is `position:sticky` at the column top so the live verdict stays visible while scrolling THE BOARD. Tier information architecture is UNCHANGED (cockpit §2 stands) — this is layout, not content redesign.
- Tier-1 visibility rule: whenever a human seat is active, tier 1 renders (it IS the former strip); tiers 2/3 keep their ratified tap-throughs.

## §3 Net effect (the minimalism ledger)
Deleted: one duplicated strip band (~2 rows) · two nested scrollbars · three market boxes → one line. Added: one color banner (net-new INFORMATION: whose turn — previously a small top-right label) · roster board relocated into dead space (moved, not added). Strictly fewer elements than today.

## §4 Guardrails for the build lane
Hard-edge skin tokens throughout; the ONLY non-token colors are team `colors.*` used as data. Test hooks move WITH their DOM (no testid renames); whisper tier tests keep passing with layout-only diffs; fog law untouched; LIVE CALL single-source law untouched (this consumes `worth.liveCall`, never re-derives). Farm floor inherits the banner + uncaging identically (its deliberate tier divergences stand — no CALL strip added to farm beyond what exists in its whisper today). Verify which team record the floor holds actually carries populated colors for league-builder clubs — if unpopulated, the fallback band ships and a one-line note lands in the contract. Build dispatches AFTER the TAXTEETH lane merges (same floor-page file surface). JK's eye is the acceptance gate.
