# DRAFT JOURNEY SKIN STANDARD — premium-retro, one skin A-to-Z

**Date:** 2026-07-08 · **Author:** Fable (captain, UI/UX authority) · **Status:** RATIFIED by captain (JK ruling 2026-07-08: "look and feel across the draft setup/draft all feels similar"); two scope forks pending JK (§5).
**Grounding:** full extraction sweep 2026-07-08 (tracer, file:line-verified at HEAD 77d4feb5). Supersedes the 8-color `color_palette.md` memory note for the draft journey (only Hist. Yellow #F2C041 and Dark Cream #CBB89C survive from it). The live canon descends from GameTracker via `FABLE_COLOR_FLIP_SPEC_2026-07-02.md` (GameTracker.tsx is the SET reference).

## §1 The one token source
`src/src_figma/styles/ballpark-kit.css` is the ONLY color authority for draft-journey hard-edge surfaces. No new bare hex — every color is `var(--ballpark-*)` (Tailwind v3 arbitrary values: `bg-[var(--x)]`; the v4 theme.css files are dead).
Canon (post-2026-07-02 flip): page `--ballpark-page-bg #243028` · panel `--ballpark-panel #3d4a42` · border `--ballpark-panel-border #3d5240` · action-green `#3d5240` / hover `#4A6844` · chalk `--ballpark-chalk #E8E8D8` · brass `--ballpark-brass #C4A853` · bright gold `#FFD27A` · status red `#DD0000` · scoreboard yellow `#F2C041` · tan `--ballpark-ground #CBB89C`.
**KEY FINDING:** `EndOfDraftStaffing.tsx` (JK's exemplar screenshot) and `ArchetypePicker.tsx` hardcode PRE-flip literals (`#4A6844` borders, `#5A8352` hover, `#2d3d2f` panels, `#243024` page). The reskin repoints them to current tokens — treatments stay, colors join canon. Never copy the exemplar's hex; copy its treatments.
**NEW TOKENS to add (ratified):** warning-banner family (`--ballpark-warn-panel #6B3A3A`, `--ballpark-warn-border #FFD27A`, `--ballpark-warn-text #FFE8B0` — today copy-pasted bare in 3 files); ArchetypePicker accents (`--ballpark-boost-green #9FE0A0`, `--ballpark-sacrifice-red #E0857A`, `--ballpark-card-active #3a4d3c`).

## §2 Component recipes (binding)
- **Panel:** `.ballpark-panel` — 6px solid `--ballpark-panel-border`, bg `--ballpark-panel`, hard offset shadow `8px 8px 0 0 rgba(0,0,0,0.8)`; header strip via `.ballpark-panel-strip` (well bg, 4px brass bottom border). Lighter variant: 4px border, no strip. Zero border-radius on hard-edge surfaces.
- **Eyebrow:** 10–11px, 700, letterspacing 0.16–0.20em, uppercase, `--ballpark-brass`, optional 3.5-unit lucide icon.
- **Headline:** `.ballpark-title` — bold chalk with `2px 2px` hard text shadow. Subtitle/muted: chalk at /65–/75.
- **Primary gold CTA (ONE spec, captain-ruled — the exemplar's wins):** bg `--ballpark-brass`, hover `#D4B863`, text `#1A1A1A`, **5px chalk border**, `shadow 4px 4px 0 0 rgba(0,0,0,0.8)`, bold, `active:scale-95`. `.ballpark-press-gold` (currently `#F0C36B`/brown-border — the losing spec) is UPDATED to match; `PressButton variant="gold"` then renders canon everywhere.
- **Inputs/selects:** bg `--ballpark-action-green`, 4px chalk border, chalk bold tracking-wider text, hard 4px shadow (the Draft Room zone-1 treatment — NOT the exemplar's shadowless border-2 inputs, which get upgraded).
- **Link affordance:** 11px brass + `hover:underline` (+ small icon), per "roll names".
- **Warning/error banner:** the new `--ballpark-warn-*` tokens, 4px border, bold.

## §3 Conformance map & sweep scope (sizes from extraction)
- `EndOfDraftStaffing.tsx` — PARTIAL (stale literals, weak inputs) — S–M.
- `LeagueBuilderDraftSetup.tsx` — CONFORMING; sweep the flagged literal debt (color-flip spec §48 list + banner + zone-3 accents) — M.
- `RosterDesigner.tsx` — CONFORMING; one stray literal + border-weight consistency — S.
- `ArchetypePicker.tsx` — PARTIAL; tokenize + new accent tokens + REGENERATE its full-DOM snapshot (mandatory step) — S.
- `LeagueBuilderAuctionDraft.tsx` chrome — PARTIAL; stale-hex wrappers (`#2d3d2f` page, `#4A6844` tiles, `#5A8352` plate), undocumented `#3B7DD8` HANDOFF blue (tokenize or replace) — M.
- `LeagueBuilderFarmAuctionDraft.tsx` chrome — depends on fork §5.1 — M–L if converted, ~0 if the stage language stays.
- Draft-complete handoff panel — already conforming (references ballpark vars) — verify only.
- **Cleanup ruled in:** delete the orphaned duplicate Ballpark component kit (`BallparkShell/Panel/Button/Modal/FeedCard.tsx` — zero non-test imports); `BallparkKit.tsx` is the one live barrel.

## §4 Guardrails for the reskin lane
Colors/borders/shadows only — no copy changes, no DOM restructuring. Known test couplings: `LeagueBuilderDraftSetup.test.tsx:2583` asserts the literal token name `--ballpark-status-green` (must survive); ArchetypePicker snapshot must be regenerated deliberately; RosterDesigner test couples to `min-w-0 truncate` layout classes (don't restructure); all `data-testid` hooks stable. JK's browser feel-pass is the acceptance gate — this is the one lane where his eye IS the spec.

## §5 JK forks (pending)
1. **The live bidding stage** (`AuctionStage` + WhisperPanel + farm floor inner UI) deliberately speaks a SECOND language — soft-premium (hairline borders, 16–20px radius, soft shadows; `--auc-*` tokens) — from the JK-gated auction redesign. It shares the exact brass/chalk values so it doesn't clash. Captain recommendation: KEEP it as the deliberate "under the lights" contrast for the bidding moment; reskin only the page chrome around it; unify shared colors by making `--auc-gold/--auc-text` reference the ballpark values. Alternative: convert the stage to hard-edge (largest lift in scope).
2. **FranchiseSetup wizard** (the A-to-Z endpoint) wears a fourth, hand-tuned green family. Captain recommendation: OUT of this sweep — it's franchise domain with its own token file (`franchise-theme.css`); tokenize it separately in a franchise pass. Alternative: light repoint now (visually-equivalent greens onto canon) or full conversion (L).

## §6 Sequencing
Reskin lane dispatches AFTER Wave 2 (rankings board) lands — same files. Wave 2 builds its new UI to THIS standard from birth. Exemplar repoint (§1 key finding) happens inside the reskin lane, first commit, so the sweep never propagates stale hex.
