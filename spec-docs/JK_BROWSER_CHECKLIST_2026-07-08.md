# JK BROWSER CHECKLIST — Cockpit Wave Closure (2026-07-08)

**Why this doc exists:** the entire cockpit wave — Wave 1 (MLB tiers + popovers + farm bridge),
Wave 2 (the sortable board), and the reskin sweep — is now merged to `main`, each piece pre-merge
adversarially audited by Opus. Per the Browser-verification-backlog ruling
(`V1_CANON_2026-07-07.md` §6), every accumulated JK-eye item from those audits is collected here
into ONE consolidated walkthrough instead of being checked piecemeal. This is the gate before
cockpit work continues — nothing past it (the P9 wrong-fit penalty, the verification battery)
starts until this pass is walked.

**Update, later the same day:** three more small fixes landed after this checklist was first
written — a self-explaining readiness panel, rank numbers that now land exactly where you type
them, and tutorial text moving behind Help. **Section 6 below** covers those; everything above is
unchanged and still needs your walk.

**Update, 2026-07-09:** your walkthrough of the sections above caught the advisor panel "stuck"
mid-bid — that's now fixed, along with the tax ruling you made and a sale-log tap fix. **Section 7
below** covers those three plus one heads-up (a floor-layout redesign is built but not yet in scope
to walk). Everything above is still open and still needs your eye.

**Update, 2026-07-09 (later the same day):** the floor-layout redesign flagged as "coming next" at
the bottom of Section 7 has now landed and is ready to walk — **Section 8 below** covers it, plus
two smaller items (a pool-first staleness warning, and one open feel-question on a team identity's
exact numbers). Everything above (Sections 1-7) is still open and still needs your eye.

**How to use it:** work top to bottom on a real league in the browser. Check each box as you go.
Where a box asks a design question rather than a pass/fail, a recommendation is given — you can
just say "yes" / "no" / "change it to X."

---

## 1. THE MLB DRAFT FLOOR

- [ ] The **TRUE COST** tax line and the **WAIT / CHASE** odds chip show real, sensible-looking
      numbers on a live lot (not zero, not obviously wrong) — bid on a couple of players and watch
      these update.
- [ ] The verdict strip (the compact readout above every lot) reads clearly in about 5 seconds,
      including the auto-advance line when it appears (see next item).
- [ ] The sortable board (your ranked player list) appears on the live floor, drag-reordering
      persists across lots, and after you WIN a ranked player, the strip either says **"Next up at
      [position]: [name] — your #[rank]"** (a future pick) or **"On the block now: [name] — your
      #[rank]"** (when that promoted player happens to be the one currently up for bid).
- [ ] The gold **BID** button looks the same everywhere it appears on this floor and matches the
      gold buttons on other screens (Setup, End of Draft).

## 2. DRAFT SETUP

- [ ] Starting a brand-new league: the default draft pool is still the full player universe,
      unchanged from before — no surprise narrowing.
- [ ] Toggling which leagues feed the pool (the source-league checkboxes) correctly triggers the
      "your pool may be stale, re-check it" banner when it should.
- [ ] The new **"rank your board"** tab exists (both the global view and the per-position view),
      and reordering there persists if you leave the tab and come back.
- [ ] Pin a player who belongs to a league you've since UNCHECKED as a source — the app should
      show that player as **"LEFT THE POOL"** rather than silently keeping or dropping them.
- [ ] **THE BLUE ACCENTS QUESTION** — three spots on this screen are still blue while everything
      else has moved to the new brass/chalk/green look: the pitch-arsenal toggle buttons and the
      Save button on the player-edit panel, plus the accent trim on the Available Players column
      header. *Recommendation: tokenize these to match the rest of the screen, unless you want
      blue reserved as a deliberate "this is different" signal color somewhere on the app.* Your
      call — tokenize them, or tell us blue stays as intentional signal color.

## 3. THE FARM FLOOR

- [ ] The farm bridge headline (the note about what your MLB roster needs) names real gaps for
      your actual team, not generic filler.
- [ ] Farm board values stay fogged (no exact true price shown) even as you rank/reorder players.
- [ ] Tapping a scout report reveals it; it stays covered until you tap.
- [ ] A won farm prospect's popover shows only a scouting BAND (a range), never an exact number.
- [ ] The BALANCE icon is absent from the farm whisper (it was intentionally removed — this is
      expected, not a bug; it returns once a future handedness-balance design is built).

## 4. END OF DRAFT

- [ ] The staffing screen and the archetype picker wear the current look (a bit deeper green than
      before — this is a deliberate design change, not a bug).
- [ ] The HANDOFF banner (the one that hands you off to franchise setup) is green/brass, not blue.

## 5. EVERYWHERE — THE OVERALL FEEL

- [ ] The whole journey — setup, MLB floor, farm floor, end of draft — reads as ONE consistent
      look from start to finish (this was the whole point of the reskin).
- [ ] On real, busy screens (lots of players, lots of data), the greens and other colors still
      read clearly — nothing gets muddy or hard to tell apart.
- [ ] Text and buttons are easy to read at a glance on the live auction stage (the new sharper,
      flatter look shouldn't have made anything harder to read).
- [ ] A few blue accents remain on the stage on purpose (rival-team tags, position badges) — do
      these read as intentional signal colors to you, or do they feel like leftover debt that
      should also convert? Your call.

---

## 6. TODAY'S FIXES — READINESS PANEL, RANK TYPING, AND HELP-GATED TEXT

These landed later the same day as the wave above, fixing things you flagged on your third pass
through the draft.

- [ ] **The start screen now explains itself.** On the draft setup screen, before you can lock the
      pool or start the draft, a panel is always visible listing every reason you can't do that
      yet, in plain English (e.g., "pool isn't legal," "not enough clubs assigned"). Check that it
      names your real blockers and updates as you fix them.
- [ ] **Typing a rank number puts the player exactly there.** On every screen with a ranked player
      board (setup, per-position, and the live draft room), type a number into a player's rank box
      and confirm they land in EXACTLY that spot — not somewhere close to it.
- [ ] **Board clicks and reorders feel instant.** Drag or click to reorder your board and confirm
      it responds immediately, with no lag, even if you make several changes in a row.
- [ ] **Tutorial text is now tucked behind Help.** On each draft screen (Draft Setup, the archetype
      picker, the auction floor, and Staff Your Clubs), the instructional paragraphs are hidden by
      default and only show up when you tap the "?" Help button in the top right. Check that
      tapping Help opens/closes it cleanly and that the screen feels less cluttered with it closed.
- [ ] **The auction phase label stays visible.** The small pill that tells you what phase of the
      auction you're in (nominating, bidding, etc.) no longer disappears — confirm you can always
      see it.
- [ ] **THE SCOUT-BAND LABEL QUESTION** — the little heading above the scout price-range bar is
      now hidden until you open Help (matching the tutorial-text rule above). *Recommendation:
      leave it as-is, since the bar itself is still there — just tell us if this reads as
      confusing rather than clean.* Your call.

---

## 7. TODAY'S FIXES (2026-07-09) — THE ADVISOR MOVES WITH THE BID, THE TAX ACTUALLY COSTS MONEY, AND A CLEANER FLOOR

These landed after your last walk found the advisor panel "stuck" mid-bid. Same idea as Section 6 — walk
these on a real league, check each box.

- [ ] **The advisor's call now moves as the bid moves.** Nominate a player and watch the whole
      panel — the word at top, the sentence below it, and the fine print — as you and the CPUs bid
      him up. It should always read as ONE consistent story: "Go get him" while the price is still
      good, "Past your number — only if you mean it" once you're stretching, "Let him go" once
      you're past your ceiling, and **"You're on top — sit tight"** the moment you're the high
      bidder. It should never say one thing at the top and a contradicting thing underneath (that
      was the bug you caught last time).
- [ ] **Win a player on a team that's over the tax line, and watch your budget.** The tax now
      actually costs money — it used to just be a number on the screen. After you win the player,
      your remaining budget should drop by the win price PLUS the tax, and that combined number
      should match the "TRUE COST" figure the advisor showed you before you bid. If your budget only
      drops by the win price, something's wrong.
- [ ] **On the Teams page, an archetype team's identity section is now locked.** Open a team that
      has an MLB archetype assigned — the tax-identity section should show as read-only with a
      note saying it's set by the archetype, instead of being an editable form. (Teams WITHOUT an
      archetype still edit normally.) This closes a bug where just saving a team's name or color
      could quietly scramble its tax numbers.
- [ ] **Sale-log names are tappable.** In the running list of what's sold so far, tap a player's
      name and confirm a profile popover opens, the same way it already does for the on-the-block
      player and the roster board.
- [ ] **The advisor's "one reason" chip leads with what actually matters.** Where the panel gives
      you one short reason for its read on a player, confirm it's leading with the most important
      thing (budget/ceiling problems first, then scarcity, then fit) rather than whatever happened
      to sort first alphabetically.
- [ ] **THE FLOOR LAYOUT QUESTION** — a redesigned, less-cramped auction floor (advisor panel no
      longer boxed into its own tiny scrolling window; a color banner announcing whose turn it is)
      is built and gated behind its own audit — not yet in this checklist's scope to walk, but
      flagging it's coming next so you know what to expect on your next pass.

## 8. TODAY'S FIXES (2026-07-09, later) — THE UNCAGED ADVISOR, THE ON-THE-CLOCK BANNER, AND A STALENESS WARNING

The floor-layout redesign flagged as "coming next" at the bottom of Section 7 has landed, after a
round of fixes your captain ordered before it shipped. Walk it on a real league, same as before.

- [ ] **The advisor panel is no longer boxed into its own tiny scrolling window.** On the auction
      floor, the whole right-hand advisor panel should scroll as part of the normal page — you
      should never see a second, separate scrollbar nested inside it.
- [ ] **A colored banner now announces whose turn it is.** Above the player up for bid, a full-width
      banner in the acting team's own color should say something like "YOU'RE UP — [TEAM]" (with
      "— NOMINATE" added when it's that team's turn to pick the next player, not just bid). When
      it's a CPU team's turn, the banner should read as a calm "waiting" state, not a demand aimed
      at you.
- [ ] **THE DEFAULT-ORANGE READABILITY CHECK** — if a team is still using the app's default orange
      color (hasn't picked a custom one), confirm the text on that banner is easy to read, not
      washed out. This was a real bug we found and fixed — the banner was picking a low-contrast
      text color for that exact shade of orange — so please specifically look for a default-orange
      team if your league has one.
- [ ] **Nothing repeats itself.** Every number the advisor shows you (its verdict, your number, the
      max bid, the odds, etc.) should appear exactly once on the screen — if you spot the same
      number or message shown twice in two different spots, flag it.
- [ ] **Your own team's color still shows as a thin stripe on your advisor panel** — that's on
      purpose (it marks the panel as yours, it does NOT mean it's your turn to act). Confirm it
      reads as "this is my panel," not as clutter or confusion with the turn banner above.
- [ ] **STALENESS WARNING ON POOL-FIRST SETUP** — if you build a league using the "pick a pool
      first" setup path (rather than designing rosters first), lock the pool, then go back and
      change something — a team's identity, a quality/balance dial, or the salary cap — you should
      now see a warning telling you the pool may be out of date and needs re-checking before you
      can start the draft. This is a new safety net; confirm it shows up when it should and doesn't
      nag you when nothing's actually changed.
- [ ] **HDH ROYALS FEEL QUESTION** — we found and fixed a case where the written description of two
      team identities (HDH Royals and Bash Brothers) didn't match what the app was actually doing —
      the app's numbers were correct and deliberate, the write-up was just out of date, and we've
      now corrected the write-up to match. The open question is purely a feel one: draft a team
      using the HDH Royals identity and tell us if it feels right to you at its current strength —
      this isn't a bug, just a "does this feel balanced" gut-check.

## What a PASS means

A pass on this checklist means: the cockpit wave (Wave 1 + Wave 2 + the reskin) AND today's
follow-on fixes (section 6 — the readiness panel, rank typing, and Help-gated text) are accepted
as done. Any items you flag as "fix this" get ticketed and scheduled; anything you flag as
"actually I want this different" gets treated as a new design fork, not a bug. Once you've walked
it, work moves on to the wrong-fit penalty (P9) and a broader verification pass — those don't
start before this checklist is walked.

## Two open JK rulings elsewhere (not part of this checklist)

These are unrelated open questions from other parts of the project, surfaced here so nothing gets
lost — they don't need to be answered during this walkthrough, but they're still waiting on you:

1. **The "legends" historical-player project** — a bar-room-style refinement pass is running in
   the background (separate backlog repo); a second round of sample "eye-test" cards for you to
   react to is still being prepared, not ready yet.
2. **The shelf-ceiling / rating-scale question** for that same legends project — parked alongside
   it, no action needed from you right now.
