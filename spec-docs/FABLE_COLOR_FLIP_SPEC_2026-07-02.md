# FABLE COLOR FLIP SPEC — chalk-and-ash surface flip for the ballpark kit

**Author:** Fable 5 (design authority) · **Date:** 2026-07-02
**Executes:** the flip promised in `FABLE_C4B_CHECKPOINT_2026-07-02.md` §1.1
**Builder:** Codex (zero design judgment required) · **Auditor:** Opus
**The one file touched:** `src/src_figma/styles/ballpark-kit.css` — token VALUES in `:root` only. No selector, property, class-rule, or .tsx edit anywhere.

---

## 1. Design intent

The league-builder kit stops wearing the legacy army-green and starts wearing the GameTracker's finished chalk-and-ash skin: warm tan ground, dark field-green cards and buttons, near-black wells — the same surfaces, in the same structural roles, taken verbatim from GameTracker (the SET reference; it is never modified). Five token values change; everything else in the kit is untouched.

## 2. THE CHANGE TABLE — the only edits

Edit exactly these five values in `:root` of `src/src_figma/styles/ballpark-kit.css`. Write literal hex (matches the file's existing style). Nothing else changes in the file.

| token | current value | NEW value | GameTracker role it matches (evidence) |
|---|---|---|---|
| `--ballpark-page-bg` | `#2d3d2f` | `#CBB89C` | The page/shell ground. GameTracker's entire shell is `bg-[#CBB89C]` — `GameTracker.tsx:11854` (100dvh root), also `:11741`, `:11766`, `:11978`. Same value as the kit's own `--ballpark-ground`. |
| `--ballpark-panel` | `#556B55` | `#3d4a42` | The card/panel/modal surface. GameTracker's in-flow columns are bare `bg-[#3d4a42]` (`BattingLineupColumn.tsx:128`) and its floating modals are `bg-[#3d4a42]` with 6px border + 8px hard shadow (`GameTracker.tsx:14499`, `:14579`) — the exact shape of `.ballpark-panel`/`.ballpark-modal`. Same value as `--ballpark-field-green-light`. |
| `--ballpark-panel-border` | `#4A6844` | `#3d5240` | The utility border green — GameTracker's universal edge color. It rims panels (`GameTracker.tsx:14072` `border-[#3d5240]` on a green panel) AND draws visible edges on dark wells (`NewsBoard.tsx:58` `border-[#3d5240]` on `bg-[#243028]`). Chosen over `#243028` deliberately: the Draft Room consumes this token as the edge ON well surfaces (`LeagueBuilderDraftSetup.tsx:785/828/882/948`), and a `#243028` border on a `#243028` well would erase those edges. `#3d5240` is GameTracker-true in BOTH positions. |
| `--ballpark-action-green` | `#4A6844` | `#3d5240` | The primary button REST surface. GameTracker's dominant button: `bg-[#3d5240] … hover:bg-[#4A6844]` with chalk border (`GameTracker.tsx:12546`, `:12593`, `:12662`, `:12726`). `.ballpark-back-button` (rest this token, hover the next) becomes exactly that pattern. |
| `--ballpark-action-green-hover` | `#5A8352` | `#4A6844` | The primary button HOVER surface — the brighter moss those same buttons light up to (same lines). `.ballpark-press-default` (rest on this token, darkening to the one above on hover) keeps the light-rest/darker-hover shape GameTracker also uses (`GameTracker.tsx:12629`). |

**Deliberate aliasing (auditor: not a bug):** after the flip, `--ballpark-panel-border` and `--ballpark-action-green` both equal `#3d5240` (= `--ballpark-field-green`), and `--ballpark-panel` equals `--ballpark-field-green-light`. That is the point — the surface-ROLE tokens now sit on the named chalk-and-ash palette. The role tokens stay separate tokens so future revs can split them again.

**Accepted knock-ons (by design, do not "fix"):**
- `.ballpark-title-plate` becomes a `#4A6844` moss plate with its 6px chalk border — in-palette, high contrast on the tan ground. A dedicated plate treatment (banner-frame `#1a3020` + brass) is a possible next rev, not this one.
- `.ballpark-press-default` rests at `#4A6844` and darkens to `#3d5240` on hover; `.ballpark-back-button` rests at `#3d5240` and brightens to `#4A6844`. Both directions exist in GameTracker.

## 3. UNCHANGED — do not touch

- **All named palette tokens:** `--ballpark-ground`, `--ballpark-field-green`, `--ballpark-field-green-light`, `--ballpark-well`, `--ballpark-frame`, `--ballpark-banner-frame`.
- **Chalk & metals:** `--ballpark-chalk #E8E8D8`, `--ballpark-brass #C4A853`, `--ballpark-scoreboard-yellow #F2C041`, `--ballpark-sage #88AA88`.
- **Status colors:** `--ballpark-status-green #34d399`, `--ballpark-status-green-border #10b981`, `--ballpark-status-red #DD0000`, `--ballpark-status-red-bright #FF3C3C`. **Destructive-red ruling: `#DD0000` STAYS for this flip.** GameTracker uses `#DD0000` (hover `#FF0000`, white border) for every destructive button it has; `#DC3545` appears zero times in GameTracker, so putting it in now would violate this stage's match-the-reference rule. The signal-red split is next-rev work (see §4).
- `--ballpark-title-shadow` and all three font tokens.
- **Every class rule in the file** — selectors, borders, paddings, shadows, press physics (`:active scale`, hard-offset shadows), `.ballpark-press-affirm`, `.ballpark-press-destruct`, `.ballpark-press-gold`'s hardcoded golds, `.ballpark-feed-card`'s black-alpha + sage. Zero rule-block edits. The diff is five value substitutions in `:root` and nothing else.
- **Every .tsx file.** GameTracker.tsx is design-locked and is only the reference. League-builder screens are repainted by the tokens alone.

## 4. OUT OF SCOPE for this flip (next rev)

1. The chalk PNG texture layer.
2. The recessed-well scroll body (inset shadow + dark edge).
3. The tracked ALL-CAPS micro-label style.
4. **The signal-red split:** introducing `--ballpark-signal-red #DC3545` for routine destructive UI (delete-a-seat, remove-a-row) while `#DD0000` stays the END-GAME-only alarm. That is a NEW token plus consumer-by-consumer reassignment — its own ticket.
5. A dedicated title-plate token/treatment (banner-frame + brass) if the moss plate doesn't sit right in JK's browser pass.
6. Screen-level hardcoded near-palette hexes in league-builder .tsx (e.g. `LeagueBuilderDraftSetup.tsx` `#2e3f30`, `#3a4d3c`, `#243024`) — they survive this flip visually; sweep them onto tokens next rev.
7. Plating any naked-on-ground text found during verification (see §5) — those are screen-level follow-ups, never a reason to change a token value.

## 5. Verification note

Reviewer confirms, side by side with a live GameTracker screen: every league-builder page now reads as the GameTracker surface — warm tan ground (`#CBB89C`), dark field-green cards with subtle darker rims and hard black shadows, near-black wells inside them, buttons that rest field-green and brighten to moss on hover — with NO army-green (`#2d3d2f`, `#556B55`, `#5A8352`) painted by the kit anywhere. Two targeted checks: (1) the Draft Room's well-edged controls (mode toggle, GM-name input, seat cards) still show visible borders on their dark wells; (2) sweep each league-builder screen for chalk text sitting directly on the tan ground with no plate/panel behind it — any hit is logged as a screen follow-up, not a token change. Audit floor for Opus: the git diff is exactly five changed lines in `src/src_figma/styles/ballpark-kit.css` `:root`, then `npm run build` exits 0.
