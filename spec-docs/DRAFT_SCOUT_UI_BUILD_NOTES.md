# Draft + Archetype + Scout — UI build notes & progress

> The UI/UX build that folds in `FRANCHISE_SETUP_TO_SEASON_ROADMAP.md` §7.
> **Build worktree: `/Users/johnkruse/Projects/kbl-draft-ui` on branch
> `codex/draft-setup-ui`** (forked off `codex/draft-pipeline-fix` 2026-06-26 to
> isolate from the concurrent engine thread, which keeps `kbl-draftfix` /
> `codex/draft-pipeline-fix`). Merge this UI branch into draft-pipeline-fix at
> wire-up time. The first 3 UI commits landed on draft-pipeline-fix before the
> split, so they're in both histories. Style/foundation reference:
> `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx` (neo-brutalist KBL look —
> Tailwind, hard borders + offset shadows, `#4A6844` green / `#C4A853` gold /
> `#E8E8D8` cream). Building NON-DESTRUCTIVE previews first (`/__preview/*`);
> wiring to the engine comes later. JK 2026-06-26.

## Built
- **Archetype picker** (`ArchetypePicker.tsx` + `teamArchetypeCatalog.ts`,
  preview `/__preview/draft-archetypes`): two-pick MLB/farm model over the 15
  historical identities; cards show family tag + era + lore + plain
  +boost→−sacrifice (no magnitudes — still tuning); reserved "strong vs / weak
  vs" matchup line (empirical, post-Season-1).

## Screen list (roadmap §7) — to build
1. Construction rail + explicit "this locks your franchise" freeze moment.
2. **Draft Setup hub** — per team: archetype (done) + GM name + human/CPU + seat
   assignment + shill count, + the existing pool shuttle. (IN PROGRESS)
3. Seat / "who's playing" — name each human (their GM identity) + assign teams;
   single-device pass-around. Folded into GM naming (D8).
4. Draft-guide overlay (auction + farm) — green/yellow/red AFFORDABILITY badge
   (MLB-archetype luxury-tax risk) + covered scout read (price range + 20–80
   grade, long-press reveal) + team-fit/hole flags. **Draft-time framing =
   value-vs-price / bargain-trap (DOLLARS).**
5. Scout-draft hire screen (polish the built one).
6. End-of-draft staffing — hire manager + reporter; optional draft recap.
7. **Season-rules screen (rebuilt)** — custom numeric games + innings; playoffs;
   extra-innings rule; dev cadence; living-season intensity dial; conferences
   on/off + naming. Cut dead settings.
8. "My teams" clubhouse — badge/sort/switch the human's teams (couch-coop).
9. Living-season surfaces (later, when dynamics flip on).

## In-season optimizer surfaces — REQUIREMENTS (JK addendum 2026-06-26)
The in-season scout/optimizer is THREE distinct surfaces — design separately:
- **In-season scout recommendations** (roster panel): speak in **WIN value, not
  dollars** — "this move adds ~X% win probability / ~N wins," NOT "$ IV." (Draft-
  time guide keeps the value-vs-price/bargain-trap dollar framing; the in-season
  scout speaks win-impact.) Recs: call-up / send-down / trade, each with a reason
  ("trade for a 2B — yours is bottom-50% in bWAR") and its win-impact.
- **Lineups tab** (pregame / between-game): **opponent-starter-specific +
  rotation-aware.** Header "Optimal lineup vs [opponent's next SP]"; show the
  team's **4-man rotation that auto-advances after each game**; allow **manual
  reorder + mojo/fitness edits** on the tab.
- **In-game move advisor**: accept/adjust a recommended sub or keep-in, shown
  with its **win-impact** — a **SEPARATE surface** from the lineups tab. Two
  distinct moments; do NOT merge.
