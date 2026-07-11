# CONTRACT S7 — IDENTITY, SOUND & THE SEASON PROOF (the closing gauntlet)
Captain: Fable · Builder: Codex gpt-5.6-sol xhigh · Date: 2026-07-10
Branch: codex/snake-s7-gauntlet · Base: main @ post PR #73 + the companion-mount stitch
(merged into this branch — treat SnakeDraftRoomView's COMPANIONS tool as present).

## AUTHORITY
1. spec-docs/SNAKE_DRAFT_VISION_2026-07-10.md — colors+logos (J1-J3), sounds, copy law,
   SEASON HANDOFF section ("IV salaries (farm: slot) → slot-vs-talent morale → farm
   budgets → staff hire → franchise → season — built and proven; this design must not
   touch it" — S7 PROVES it end-to-end for the snake path).
2. spec-docs/SNAKE_DRAFT_V1_PROGRAM_2026-07-10.md — S7 lane + CT4 ANSWERED (Team
   already has colors {primary, secondary, accent?} + logoUrl?; ruling: client-resize
   ≤128×128, re-encode, ~32 KB hard cap, reject over-cap before write).
3. All prior S-lane contracts in spec-docs/contracts/ (the machinery you are proving).

## LAWS
Copy law (14-year-old test) · no percentages · auction frozen · engines done except
where explicitly granted below · the snake reducer's ritual states untouchable ·
NO fixture-bending in the season proof: if the pipeline breaks, the finding is the
deliverable (STOP and report with file:line evidence — do not heal data mid-pipe).

## SCOPE
### G1. THE SEASON PROOF (the reason this lane exists)
A single integration gauntlet test (extend src/utils/tests/draftPipeline.integration.ts
family or a new sibling): drive the REAL storage paths end-to-end for a snake-format
league at production defaults (8 clubs):
setup (pool + versions + snakeSetup record) → complete MLB snake draft (all 176 picks
via the real commit path, including at least one executed pick trade and one
commissioner correction mid-draft) → commitCompletedSnakeSessionToLeagueRosters →
scout hire → farm snake session (frozen slot table) → at least one farm pick trade →
commitCompletedSnakeFarmSessionToLeagueRosters → staff hire arc reachable → franchise
initialization reads the MLB record → ASSERT: every club has a legal 22 with
settledSalary = IV per pick; farm rosters carry frozen slot salaries + hidden reveal
state; draft-day morale inputs present (slot-vs-talent seam); farm budgets derive from
headroom; season can start (the same readiness the existing franchise launch coverage
checks). Every assertion reads through REAL storage, not fixtures. One-per-human:
include a two-version legend in the pool and assert exactly one version ends up
rostered league-wide and the sibling never appears on any roster.

### G2. TEAM IDENTITY — the logo slot (CT4 ruling)
Team editor in League Builder gets the LOGO upload: file input → client-side resize to
≤128×128 → re-encode PNG/WebP → hard-cap ~32 KB (reject over-cap BEFORE write with
plain copy: "THAT PICTURE IS TOO BIG — TRY A SMALLER ONE") → store as data-URI in the
EXISTING Team.logoUrl field (no schema change). Render everywhere the room already
supports it (face-down ritual card, club lens, order strip — those render paths exist
from S2; verify they light up with a real stored logo). Respect any test-characterized
copy (D11 locks): flag, don't reword.

### G3. THE COPY + SOUND SWEEP (A-to-Z, snake surfaces only)
Walk every snake surface (setup, room MLB + farm, desk, guide, companion): every
user-visible string passes the 14-year-old test; ALL-CAPS retro chrome per the skin
standard; no engineer-speak, no percentages. Fix violations in place (snake surfaces
are yours; auction surfaces frozen). Sounds: verify exactly five, correct triggers,
toggle persists across reload (if the toggle doesn't persist, wire it to localStorage —
one small util edit allowed). List every copy change in the report.

## FILE SURFACE
- G1: the integration test file(s) + any test-utils helpers (test-side only).
- G2: the League Builder team editor page/component (locate it; smallest diff) + a
  small pure resize util (new file src/src_figma/utils/logoImage.ts) + tests.
- G3: snake-surface component copy edits + snakeSounds toggle persistence.
- FORBIDDEN: engines (except reading) · auction files · reducer states · storage
  schema (logoUrl exists) · flags. If G1 exposes a REAL pipeline defect requiring an
  engine/storage fix → STOP and report; the captain decides the fix lane.

## GATES (real output)
1. tsc clean. 2. build exit 0. 3. The G1 gauntlet green + all snake suites green.
4. Auction suites green. 5. ONE full vitest (known solo-flakes: LeagueBuilderDraftSetup
family, franchiseManualSmokeFixture, franchiseOffseasonGuards async family — verify
solo if red).

## PROTOCOL
No git write commands. Spec-first: write the G1 gauntlet FIRST and run it against the
current code — if it is red for a REAL reason, that finding is gold: report it before
fixing anything. UNKNOWN = STOP. Builder report appended here with the full G1
assertion inventory, every copy change, and the auditor attack list.
