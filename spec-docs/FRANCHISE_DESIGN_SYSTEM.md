# KBL Franchise Design System — "The Living Season at the Old Ballpark"

> The canonical design system for the draft experience and the living-season franchise hub.
> Authored as Chief of Design, grounded in `FRANCHISE_V1_LIVING_SEASON_SPEC.md` + a full code/spec
> discovery (living-season model · team identity · in-season systems). Branch
> `codex/auction-draft-ux-rehaul`. This is the contract we hold to: every new surface must declare
> **which voice it speaks, where it lives, and what makes it surface.** Nothing is "always on, all the time."

---

## 0. The north star (read this first)

The franchise is **one living season** — draft → champion, no offseason, *ever* (in v1). It's designed to
"feel like many seasons in one" because players genuinely **transform mid-season**. So the hub is **not a
database you browse** — it's a **clubhouse, a scoreboard, and the morning paper.** Its job is to make the
season's story *felt at the right moment*, then get out of the way.

Everything turns on one **loop** (the spec's keystone):

```
   the beat reporter writes a take  →  a player's morale moves  →  it changes his play on the field
         ▲                                                                          │
         │                                                                          ▼
   the reporter narrates the fallout  ◄─ you make a roster move ◄─ fan morale shifts ◄─ his value &
                                                                    designation flip
```

Any single beat is small; **it compounds across the season.** The design system exists to surface each
turn of this loop when it matters — the marquee story leads the paper, the cratering morale catches your
eye, the checkpoint demands its moment — and to keep the rest quiet until you ask.

**"The arc IS the content."** Wherever possible we show the *change* (a B- becoming an A), not a static
stat line.

---

## 1. The five design laws (the rules we never break)

1. **Surface by impact, not by inventory.** The most meaningful thing leads; administrative stuff recedes
   or hides. We rank what to show by a real impact signal (the reporter's `dramaticWeight`, a player's
   morale risk, a checkpoint coming due, an awards-race move, a roster illegality). The Season Home shows
   the **top few** by impact; everything else is one tap deeper. *This is the cure for the infinite-scroll
   "engineering vibe."*
2. **One voice per context.** The **chalk board** speaks numbers (scores, standings, money, the lot). **Mom's
   Typewriter on aged newsprint** speaks words (anything the reporter or scout wrote). Never mix them in one
   block.
3. **Quiet until asked (depth on demand).** A number on the surface; the *why* one tap away (the morale
   ledger, the relationship card). The **one deliberate exception** is the **checkpoint**: a one-time chore,
   so it *shouts* — fully expanded, until it's done.
4. **The right thing at the right time.** The hub **changes with the season's beats.** A checkpoint surfaces
   the change-log; the All-Star break surfaces the roster; a morale crisis surfaces the player; a marquee
   story leads the paper. It is **not the same page all year** — calm when calm, loud when it earns it.
5. **Every club has a face.** The team lens wears the club's own colors in the banner, and the banner names
   the **people who run it** (GM, manager, scout, beat reporter, with the reporter's persona + avatar). You
   are running a *club with a culture*, not a spreadsheet.

---

## 2. The visual system (locked, from the prototype iterations)

| | |
|---|---|
| **Look** | An **aged "Green Monster" manual scoreboard** — green steel, infield-dirt wood frame, road-gray rivets, weathered grain/stains/vignette. |
| **Type — two voices** | **Chalk** (`chalk.otf`) for titles, scores, standings numbers (the board). **Mom's Typewriter** (`moms-typewriter.ttf`) for reporter/newspaper copy + small labels (the words). |
| **Palette** | The official KBL **eight** only. **Dominant trio:** Wrigley Green (board) · chalk-white (text) · Scoreboard Yellow (focus/active). **Accents only:** Marquee Red (rival/alert/negative), Umpire Navy (night/recess), Dark Cream + Ash Wood (newsprint/placards), Road Gray (rivets), Infield Dirt (frame). |
| **Money** | **Option B** — a small typewriter `$`/`k`/`M` with chalk digits (the ornate chalk `$` was too busy). |
| **Team color** | **Banner only.** The board itself stays white & yellow chalk: **your club = yellow** (like the live half-inning), **rival = red**, everyone else = white. No team-color tints/washes on the board. |
| **Depth on demand** | Minimized text by default; tap a number → its ledger/card. A top-corner **Help** toggle reveals the teaching layer for new GMs, then they switch it off. |

---

## 3. The team-hub banner — the club's face

The banner is where the club's **branding & culture** live (and the only place team colors appear).

```
┌─[ team colors ]────────────────────────────────────────────────────────────────────────┐
│  ◆ PAGE CAPITALS   48–32 · 2nd East        🪶 J. Tate, beat writer · "loving this run"   │
│    Caldwell · "The Yard"                    GM: The Architect · Mgr: B. Cole (Balanced)   │
│                                             Scout: M. Okafor (infielders) · Rival: BM ⚔   │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Real data today:** team (name, colors, abbreviation, logo, nickname, ballpark nickname, city vibe),
  **GM** name, **manager** name (+ a coarse style label like "Balanced"), and the **beat reporter** —
  name, persona/voice, **avatar** (fedora / headset / cap silhouette), and **current mood** (which sets the
  paper's tone).
- **The one gap to wire:** the **scout** has a store + specialty/accuracy, but no by-team accessor and the
  franchise-setup path seeds placeholder names. So v1 banner shows the scout's **specialty** ("infielders")
  and we add a small team→scout name lookup before showing a real name.
- The reporter's mood on the banner is a deliberate touch — it tells you, at a glance, *what kind of story
  the paper is telling today.*

---

## 4. The information architecture (the living season, no offseason)

We retire the dead three-phase model (regular / playoffs / **offseason**). The hub is a **curated home + a
team lens + a few league views + moment-driven takeovers** — ordered so story and action come first.

### 4.1 THE SEASON HOME — "The Clubhouse" (default landing)
*The heart of Law 1. NOT a tab full of everything — a curated, ranked view of "what matters right now."*
- **The lead story** (newspaper) — the reporter's marquee take, chosen by `dramaticWeight`. The season's
  current headline.
- **The next game** (chalk cockpit) — the matchup + the one primary action (Play Ball / Sim).
- **What needs you now** — the **top few impact cards**, ranked: a morale crisis, a checkpoint coming due,
  an illegal/thin roster spot, an awards-race move, a trade demand. If nothing's urgent, this is calm.
- **The pulse** — a one-line glance: record, the loop's current temperature (clubhouse + fan morale).

### 4.2 TEAM-SCOPED tabs (the lens — everything reframes to the chosen club)
- **Clubhouse / Roster** — the **22 + 10**, with **fluid call-up / send-down** as a first-class, intuitive
  move (drag a kid up from the farm; the cap + salary enforce themselves; the reporter can warn *before* the
  move — "calling up this kid could clash with your Captain"). Morale column → ledger; designation badges;
  a player's card opens his ties (relationships), trait/rating history, and contract.
- **Stadium** — the spray-chart analytics (live) + the park-record catalog (the "house of horrors," farthest
  HR by hand) when it's on.
- **The Tootwhistle Times (team beat)** — the club's own reporter feed, **marquee story leading** (sorted by
  `dramaticWeight`), then the rest as an old newspaper.

### 4.3 LEAGUE-WIDE tabs
- **Standings & Races** — division standings **plus** the live awards races (MVP/Cy/ROY) and the All-Star
  picture. The "races" are what make the league feel *alive* all season.
- **Schedule.**
- **The Almanac / Museum** — records, history, the trophy case.

### 4.4 MOMENT-DRIVEN surfaces (NOT permanent tabs — they appear when their beat hits, then leave)
- **The Checkpoint change-log** (every 20% of games, 5×): the **always-expanded transcription worklist** —
  what ratings/traits changed, new values in yellow = *what to type into SMB4*, tick-boxes + progress. It
  takes over when the checkpoint fires and **folds away** once you've entered it.
- **A trait earned** (continuous): a small "X just earned **Workhorse** mid-streak" beat in the paper + a flag
  on the player card. No takeover — it's a felt ripple.
- **The All-Star break** (midseason, rosters lock at 60%): the roster reveal + your snubs/honorees.
- **Tentpole takeovers** — a **manager firing** (your pressure-release valve), the **rebrand circuit-breaker**
  (fan morale bottoms out → relocate + reset), and the **season-end ceremony** (the saga's capstone).

> Ordering principle: **Home (story + action) → the lens (your club) → the league → and whatever moment is
> currently taking over.** The user should almost never scroll to find what matters — it should already be
> at the top.

---

## 5. Where every system lives, and when it surfaces

| System | Home (where it lives) | Surfaces when… | Data status today |
|---|---|---|---|
| **Beat-reporter narrative** | Season Home lead + the Tootwhistle Times tab | always (the spine); the **biggest `dramaticWeight` story leads** | per-game recaps **LIVE**; season-arc feed + impact ranking **dark** |
| **Player morale** | a chalk number on the Roster → tap for the **ledger** (every delta + reason + week) | the card surfaces on Home when morale is **in crisis/at risk** | value + reasons-log **dark** (built) |
| **Fan morale** | the club pulse (Home + banner mood) → tap for the log | drives the reporter's tone; surfaces on a swing or near the rebrand threshold | **dark** (built) |
| **Relationships** | the **player card** ("ties"): rivalries / feuds / mentorships / friendships | on a roster move (warn before), or when an edge flares | **dark** (one read-only preview wired) |
| **Ratings checkpoint** | the **moment-driven change-log takeover** | every 20% of games (5×) — "the league just shifted" | sweep **dark** (built) |
| **Trait change** | a paper beat + a player-card flag | continuously, mid-streak, when earned | **dark** (built) |
| **22/10 roster moves** | the Roster tab (drag call-up/send-down) | always available; nudged on Home when a slot is thin/illegal | **LIVE** |
| **Stadium analytics** | the Stadium tab | always; a record breaking surfaces a paper beat | spray-charts **LIVE**; park records **dark/design** |
| **All-Star** | Standings & Races; a midseason takeover at the break | midseason; lock at 60% | roster compute **live-ish**; tab UI **dark** |
| **Awards races** | Standings & Races; a card on Home when the lead changes | all season | **LIVE** |
| **Designations** | badges on the Roster; effects in morale | always (badges); effects when the soul layer is on | badges **LIVE**; effects **dark** |
| **Manager firing / rebrand / ceremony** | tentpole takeovers | at their trigger | **dark** (built) |

**The build truth (so we're honest):** the per-game recaps, awards watchlist, designation + captain badges,
spray charts, and the 22/10 roster moves are **live today**. The whole **emotional layer** — morale + fan
morale + their reasons-logs, the relationship web, the season-arc newsfeed with its impact ranking, the
All-Star roster UI, and designation *effects* — is **built but switched off** behind flags. So the hub work
is: **(a)** build the display surfaces for that dormant column, and **(b)** the franchise team flips the gates
when the simulation gate passes. The UI can render from the persisted-dark data (or mock) until then.

---

## 6. The surfacing engine (how "what catches your eye" actually works)

Every candidate that *could* appear on the Season Home is scored, and only the top few show; the rest is one
tap deeper. This is the concrete mechanism behind Law 1.

```
impactScore(card) = base(kind) × urgency × recency
  • lead story        → reporter dramaticWeight                 (already computed; we just sort by it)
  • morale crisis     → distance below 50 × falling-trend       (a kid at 38 ▼ outranks a steady 53)
  • checkpoint due    → games-until-checkpoint (≤2 → top)       (a hard, dated obligation)
  • roster illegal    → severity (can't field a legal lineup → top)
  • awards-race move   → rank change this week
  • trade demand      → loyalty-break severity
Home shows the top N (≈3–5). Below them: a calm "everything else is a tap away."
```

**Timing overrides ranking** for tentpoles: a **checkpoint**, the **All-Star break**, a **firing/rebrand**, or
the **season-end ceremony** *take over* the home until acknowledged — because they're dated, one-time beats.
Otherwise the home is whatever the season is currently *about*.

---

## 7. The contract (what we hold to as we build)

Before any new surface ships, it must answer three questions:
1. **Which voice?** Chalk board (numbers) or typewriter newspaper (words)?
2. **Where does it live?** Banner · Season Home · a team-lens tab · a league tab · a moment-driven takeover.
3. **What makes it surface?** Always-on (rare — only the spine), an impact score, or a dated beat. *If the
   answer is "it's just always there," it's wrong* — that's the infinite-scroll trap we're killing.

And it must obey the five laws (§1) and the locked visual system (§2). That's the whole deal: **the living
season, told at the old ballpark — meaningful first, administrative last, story always.**
