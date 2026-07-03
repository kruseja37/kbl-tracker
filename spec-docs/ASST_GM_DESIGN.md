# ASST_GM_DESIGN — the Assistant GM product design (v1)

**Author:** Fable 5 (design authority) · **Date:** 2026-07-02 · **Ratified direction:** JK
rulings this date (intelligence-first 2026-07-02 + the four gap rulings logged in DECISIONS_LOG
"ASST-GM product rulings"). Binding for C4-B slice 2 (auction advice panel) and C4-C (the
Asst-GM surface). Copy register + help-layer rules per `UX_NORTH_STAR.md` §4/§6.

**The one-paragraph identity:** the Assistant GM is the roster brain with a name. He never
blocks a button and never pushes a popup — he is the smartest person in your front office,
available at a click, whispering only to you. His advice is always legal, always
roster-contextual ("sum greater than the parts"), and always explains itself in plain
baseball language. Advice quality that stays right again and again IS the feature (JK ruling
3, 2026-07-02).

---

## §1. WHO HE IS — hire point + identity

- **Hired at the post-draft staffing screen** (`EndOfDraftStaffing`), one more card in the
  existing pattern: name input + "roll names" + a small style dropdown (see below). Every
  companion voice now has an origin: scout (pre-draft hire) → manager + beat reporter +
  **assistant GM** (staffing).
- **Human-controlled clubs only.** CPU clubs keep their auto-fill path; the Asst GM is a
  companion for the player, not a sim actor.
- **Advisory style dropdown (flavor, not math):** `["By-the-book", "Gut-feel", "Numbers guy",
  "Old scout", "Hustler"]` — styles the VOICE of his copy lines only. v1 explicitly does NOT
  vary advice content by style (single-math: everyone gets the same correct numbers; the
  persona changes phrasing templates). Persisted with the other staff identities.
- **Persistence:** rides `persistDraftStaffForLeague` (same record family as manager/reporter)
  and carries into the franchise via the STAFF-CARRY-THROUGH ticket (§8.2).

## §2. WHERE AND WHEN HE SPEAKS (the delivery model — JK-ruled 2026-07-02)

| Context | Trigger | Surface |
|---|---|---|
| **Auction room (MLB + farm)** | Re-evaluates after EVERY lot event (nomination, bid, hammer, pass) | The per-seat **whisper panel**: collapsed by default; a click reveals HIS read for the seat currently holding the device — insights + the private draft board/rankings. Pass the device → the panel re-keys to the new seat's Asst GM. |
| **In-season** | PULL-ONLY — reacts to the GM's clicks | The Asst-GM surface (C4-C): roster scorecard, move advice, lineup-vs-upcoming-starter. No pushes, no popups. |
| **The one exception** | A send-down that strands the roster | The already-built non-blocking warning line (ASSTGM-LEGALITY L3-2) — surfaced as HIS voice. |

**Privacy rules (hard):**
1. Per-seat secrecy in the auction room: the whisper panel renders ONLY the active seat's
   intelligence; reveal is click-gated exactly like the scout fog (same interaction family,
   so couch-coop privacy is one learned gesture). Nothing of team A's board is ever in the
   DOM while seat B holds the device.
2. He sees PRIMARY personality only — never hidden modifiers (JK ruling 5; enforced by
   construction: the payload builders read chemistry/traits/ratings only).
3. Farm prospects: he reads the SCOUT's fogged bands, never true ratings (the visibility
   gate stands — he is not a cheat code).

## §3. THE TWO-VOICE DRAFT ROOM (partition with the scout)

North-star C1 ("one voiced advisor per screen") amends to **one voice per CONCERN, two
concerns on the draft floor** (JK-ruled):

| | **The Scout** | **The Assistant GM** |
|---|---|---|
| Subject | The player on the block | YOUR room |
| Owns | Worth/IV read, price bands, farm fog reveals, player-fit blurbs | Needs & scarcity, budget plan, the chemistry tipping premium, bid-or-pass verdict, the private draft board/rankings, nomination strategy |
| Placement | The lot card (public — same for every seat) | The whisper panel (private — per seat, click-revealed) |

The three overlapping legacy advisors (coach banner / Scout Insight / CPU explainer) resolve
INTO this split: lot-facing content → scout; seat-facing content → Asst GM; procedural
how-to-play lines → the `?` help layer. CPU-decision table talk stays unattributed.

## §4. SCOPE (v1 line — JK-confirmed)

**v1:** roster-move advice (call-ups/send-downs incl. the chemistry removal ripple) · the
five-lights roster scorecard (§5) · lineup-vs-upcoming-starter (voices the existing
`lineupVsStarter` engine — engine built, no voice today) · farm call-up candidates (from
scouted grades, fog-respecting) · the auction whisper panel (§2/§3).
**v1.1:** trade advice · fatigue/fitness management · slump-aware advice (needs the
season-stats feed stub filled — known C4-C dependency) · push moments (he taps YOU on the
shoulder) · style-varied advice content.

## §5. THE FIVE-LIGHTS ROSTER SCORECARD

**Form:** five named lights, each green/amber/red + ONE plain sentence + click-through to
detail. No letter grade (a grade hides *why*; lights teach team-building). Every light is a
CROSS-PLAYER property — none is a sum of individual player values. In-season the same frame
gains the live overlays (mojo/fitness notes in the sentences); draft-time it runs on the
projected roster.

| Light | Question | v1 computation (all built or trivially derivable) |
|---|---|---|
| **SHAPE** | Is this a functioning baseball team? | `isLegalRoster`/`depthReport`/`wouldStrandRoster`: red = illegal/stranded; amber = legal but thin (any hard requirement at exact minimum, or a position covered only by a secondary); green = slack everywhere. |
| **IDENTITY** | Does the roster match your committed archetype? | The C1 `archetypeIdentity` fit scoring vs the club's chosen identity: green/amber/red by fit bands (reuse the builder's own scoring — single-math; exact band cuts set at build with a fixture sweep). |
| **CHEMISTRY** | Is the clubhouse mix working FOR you? | `chemistryProfileForPlayers`: red = negative traits exposed at L1 outweigh positives at L2+; amber = all families L1 or some exposure; green = ≥1 family at L2+ carrying positive traits, no heavy exposure. The sentence always names the nearest opportunity: "Two more Scholarly bats and every Scholarly trait on this club triples." |
| **BALANCE** | Can you hit anybody? | Handedness (new v1 math, rides the `lineupVsStarter` curves): green = competitive projected lineup vs BOTH hands; amber = soft one side; red = helpless one side. The sentence carries the age window as flavor ("Win-now core, 29.4 average age in the lineup"). Provisional band cuts set at build. |
| **BUDGET** | Can you afford to finish and insure this roster? | Draft-time: `completionBidCeiling` headroom (built). In-season: cap room + tax posture from the salary system. Green = headroom above insurance; amber = tight; red = trapped. |

**v1.1 lights (same frame, slot in without redesign):** FLEX (positional insurance priced via
completion-floor deltas) · FARM (pipeline depth from scouted grades) · STAR (fan-draw/fame).

## §6. THE ROSTER-INTELLIGENCE PAYLOAD (the wire-once contract)

One TS shape both screens consume (C4-B whisper panel + C4-C surface); Codex finalizes the
type from this sketch in the contract ticket:

```
RosterIntelligencePayload {
  seatTeamId; generatedAtLotIndex?;               // auction re-key identity
  market?      — EstimatedMarket read for the lot (bands, CONTESTED, nomination odds)
  worthToYou?  — { iv, chemistry: ChemistryTipBreakdown, handedness: HandednessSignal,
                   verdict: push|cap|pass + capValue }        // the whisper headline
  board?       — ranked remaining pool for THIS seat (worthToYou-sorted, fog-respecting)
  scorecard?   — FiveLights (§5)
  moves?       — { callUps[], sendDowns[] } each with legality + removal-ripple annotations
  lineup?      — lineupVsStarter output for the upcoming opponent starter
}
```
Sources: `auctionMarketModel` (market), `chemistryIntelligence` (chemistry), `rosterNeed` +
`auctionCompletionFloor` (shape/budget), `archetypeIdentity` (identity), `lineupVsStarter`
(lineup), + the new handedness signal. Everything advisory; nothing writes.

**Age in the advice line (JK-agreed 2026-07-02):** `worthToYou` carries the candidate's age
band (the taxonomy tag) and a development-outlook note derived from the ratingsDevelopment
age-gravity DIRECTION (young = tailwind, 36+ = headwind, speed/glove/arm decay fastest) —
advice copy only ("same price, ten years younger — the season engine favors him"). Age
PRICING (dev-runway premium + reconciling the orphaned `calculateAgeFactor` salary curve
with the dev gravity — ONE age model, no double-count) is v1.1 economy-batch work, not this
payload.

## §7. RUN-IT-BACK (the mock-draft substitute — JK-ruled v1; mock-draft toggle CUT)

**What it is:** one action on a drafted league: re-run the draft with the identical league,
pool, and settings. Verified foundations: completed rosters DO commit to League Builder
(integration-test-proven); a launched franchise is a deep-copy snapshot and is UNTOUCHED by
later league changes; the locked pool is independent of team rosters by design;
`deleteAuctionSession` exists.

**The flow:** entry = the league row (chip "Drafted ✓ · Run it back") + the draft-complete
screen. Confirm via the chunky modal kit: *"This clears CLUBNAME LEAGUE's drafted rosters and
draft record. The player pool, clubs, identities, and settings stay. Franchises you already
launched are not affected."* → then: delete the MLB + farm auction sessions + scout-hire +
draft-staffing records for the league; clear every team roster; KEEP the locked pool,
ownership, archetypes, shill count. Land back in the Draft Room at "Start the Draft."
(The axis regen is deterministic per league — a re-draft sees identical player axes.)
**No draft save slots:** franchise slots are the permanent record; the league holds exactly
one current draft state; Run It Back overwrites it behind the confirm.

## §8. VERIFIED FACTS + GAP TICKETS (from the 2026-07-02 verification pass)

1. **CONFERENCE-SURFACE (v1 gap — JK Ruling B says conferences ARE v1):** the data model is
   complete (League.conferences, Team.conferenceId; the SMB import builds 2 conferences) but
   user-created leagues write `conferences: []` and the Leagues editor has NO conference UI.
   Ticket: a conference section in the league editor (assign teams; default single-conference).
2. **STAFF-CARRY-THROUGH (C4-C gap):** `persistScoutHiresForLeague`/`persistDraftStaffForLeague`
   write league-builder records, but NOTHING franchise-side reads them — the hired scout
   evaporates after the draft, and the hub reporter is an auto-generated "Beat Reporter."
   Ticket: franchise initialization copies staff identities (scout, manager, reporter, and now
   the Asst GM) into the franchise; the lens crew line + reporter byline read real data.
3. **Season-stats feed stub** (known): slump-aware advice waits on the C4-C stats adapter.

## §9. BUILD TICKETS THIS DOC SPAWNS (Opus sequences; builder≠auditor)

| Ticket | Scope | Route |
|---|---|---|
| PAYLOAD-CONTRACT | §6 type + assembly fns (pure, tested) | Codex, before C4-B slice 2 |
| HANDEDNESS-SIGNAL | The §5 BALANCE math on lineupVsStarter curves | Codex builds from my constants spec; I review |
| C4-B slice 2 amendment | Whisper panel (per-seat re-key + click-reveal) replaces the single-scout-voice plan; scout keeps the lot card | Codex vs this doc + north star |
| RUN-IT-BACK | §7 flow | Codex, after C4-B slice 1 |
| CONFERENCE-SURFACE | §8.1 | Codex, fire-anytime |
| STAFF-CARRY-THROUGH | §8.2 (+ Asst-GM staffing card from §1) | Codex, inside C4-C |
| Analyzer wiring follow-up | `chemistryAdviceForCandidate`/`chemistryRemovalAdvice` into the landed analyzer | Codex, one-line ticket, fire now |
