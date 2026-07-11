# CONTRACT UNIFYSETUP — one setup screen, two thin format adapters (JK directive)
Captain: Fable · Builder: Codex gpt-5.6-sol xhigh · Branch: codex/unifysetup
Base: github/main @ 8f6c215a (post ROOMFIX PR #90).

## JK'S DIRECTIVE (2026-07-11, verbatim intent)
The snake draft's league/player setup must feel EXACTLY like the auction's: choose team
archetypes, move players between the database and the draft pool while seeing IV in
dollars (swap similar-cost players), click any player for the full profile (ratings,
traits, positions, handedness, age, personality), AND set up draft boards/strategy
before entering. Sync the wiring and UI; logic sound from the user's perspective.

## THE RULED DESIGN (captain + 5.6 adversarial round — build exactly this)
Unify on /league-builder/draft-setup as ONE shared setup pipeline with two thin format
adapters — not auction-plus-a-bolted-on-card:
- league.draftFormat (set at league creation) decides the adapter. ONE format-matched
  start button renders (ENTER AUCTION DRAFT / ENTER SNAKE DRAFT). NO format switcher on
  the setup page (format changes stay in League settings; out of scope here).
- AUCTION ADAPTER: today's render + handler path BYTE-BEHAVIOR-IDENTICAL. The
  characterized LeagueBuilderDraftSetup suites are the regression firewall. Auction-only
  concepts (shills, reserve pricing, price-freeze copy) render ONLY under this adapter.
- SNAKE ADAPTER adds format-gated panels (extract components; keep the page lean):
  1. VERSIONS: one-per-human pickers, chosen BEFORE lock. Strict order law:
     versions → pool lock → seating proof on the LOCKED ids → GO. After lock,
     version/pool changes require unlock (the existing unlock affordance).
  2. CLUBS extras: GM name + hotseat-vs-companion declaration per club (alongside the
     existing archetype selection).
  3. ORDER: seeded shuffle w/ visible seed, tap-two-swap, snake preview + endpoint
     back-to-backs (port from SnakeDraftSetup).
  4. READINESS: the archetype-honest SIMULTANEOUS seating proof is the GO gate —
     pass each club's capIdentity derived from its CHOSEN archetype into
     proveSimultaneousSnakeSeating (today's snake setup runs it archetype-blind — a
     pool can read READY under balanced tax yet be unaffordable under the locked
     archetypes; close that gap). Render its verdict/shortfalls in the existing
     readiness-reasons surface. Auction readiness unchanged under the auction adapter.
  5. ENTER SNAKE DRAFT (GO): registration/order law from ROOMFIX — lift
     registerPickedSnakePool WHOLESALE (SnakeDraftSetup.tsx:139-153; keep registration
     AHEAD of session creation for the no-orphan guarantee); then snapshot the setup
     rankings into per-seat seatBoards (flush any debounced ranking writes first;
     convert each snake club's saved rankings into its initial seatBoards record —
     the room's desk remains the live editor); write the EXISTING snakeSetup shape
     (unchanged — the room contract must not move); route to /snake-room?leagueId=….
- FROZEN ECONOMIC TRUTH: everywhere the snake adapter prices or proves, it reads the
  LOCKED RegisteredPool IVs — never recomputes from the live player database.
- PROFILE PARITY (JK's "exactly"): the pool-shuttle rows currently open a slimmer
  panel missing personality/chemistry (LeagueBuilderDraftSetup.tsx:~4922 area) — make
  every player row open the FULL profile popover, both adapters (this is the one
  shared-surface change that touches the auction path; it is additive display parity —
  the characterized suites must stay green; if a suite pins the slim panel, STOP and
  report rather than reword fixtures).
- RETIREMENT: /snake-setup redirects to /league-builder/draft-setup preserving
  leagueId. The SnakeDraftSetup page is deleted after its tests migrate; the ROOMFIX
  repro/crawl (SnakeDraftRoom.registration.integration.test.tsx) MUST be migrated to
  drive the UNIFIED flow with the same end-to-end assertions (setup → START → room
  mounts → desk populated → guide answer → first pick through the ritual) — that test
  is the permanent guard for this pipeline.

## LAWS
Auction byte-behavior identity under the auction adapter (suites = firewall; the ONLY
sanctioned shared-surface change is profile parity above) · adapter-reuse (canonical
pool helpers only; lift ROOMFIX's adapter, don't rewrite) · the snakeSetup record and
seatBoards shapes are FROZEN contracts to the room · copy law (14-year-old readable;
setup explanations behind Help where the auction already does that) · no percentages ·
engines done (the archetype-honest proof consumes the EXISTING engine — capIdentity is
an input, not new math; gaps = STOP) · reducer/room internals untouched except test
migration · UNKNOWN = STOP.

## TESTS (spec-first)
Migrated ROOMFIX crawl through the unified flow (the make-or-break) · format adapters:
auction league renders zero snake panels + the auction start; snake league renders the
panels + ENTER SNAKE DRAFT and no shill/reserve copy · strict order law (version change
after lock requires unlock; proof runs on locked ids) · archetype-honest proof: a pool
that passes balanced but fails under a heavy-tax archetype set must gate GO (construct
the fixture) · rankings→seatBoards snapshot (a hand-touched setup ranking lands as the
room's initial board; debounce flushed) · frozen-IV (locked pool IV disagrees with a
mutated live player → the snake adapter uses the locked value) · profile parity (a
pool-shuttle row opens the full popover incl. personality) · /snake-setup redirect
preserves leagueId · auction suites untouched and green.

## GATES (real output)
1. tsc clean. 2. build exit 0. 3. Migrated crawl + owned + snake suites green.
4. THE FULL LeagueBuilderDraftSetup characterized set + all auction suites green.
5. ONE full vitest (known solo-flakes verify solo).

## PROTOCOL
No git write commands. Spec-first. STOPs: any characterized auction fixture that pins
the slim profile panel; any need to change snakeSetup/seatBoards shapes; any engine
gap. Builder report appended here: file:line map, gate outputs, copy inventory,
auditor attack list.
