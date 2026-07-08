# iPad / Browser Test Backlog (JK)

Plain checklist of what to test by hand, in priority order. **You can start the whole
"DO NOW" section today** — it doesn't wait for the sim engines or the final flag-flip.
The "FINAL" section is the living-season playtest that comes last, after the engines are
validated and switched on.

> **Created 2026-06-24.** Consolidates the Mode-1 batch (`MODE1_REBUILD_JK_BACKLOG.md` A:
> BV-1/2/3), the scouting/auction BVs (BV-9/11/12/13a/14, BV-S6/S7b/S7c), and this session's
> Branch-A BVs into one list. The Mode-2 living-season checks are deliberately in FINAL —
> those screens don't react until the engines are turned on.

---

## DO NOW (the screens + saved data already exist — no sims, no flag-flip needed)

### 1. Saved-data: "does my franchise survive a reload?" — DO THIS FIRST
A data bug is far cheaper to catch now than after the sims pile seasons of data on top.

- [ ] **League upgrade + mid-draft resume** — open an existing league, confirm nothing is
      lost after the app updates the saved format. Start an auction, leave mid-draft, come
      back, confirm it resumes exactly where you left off. *(BV-1)*
- [ ] **Draft → franchise carry-through** — run a real draft; confirm players get a real
      mix of personalities (not all "Competitive") plus chemistry, that it saves, and that
      it carries into the franchise when the season starts. *(BV-2)*

### 2. The Mode-1 draft / auction experience (end to end)

- [ ] **Full auction, MLB then farm** — nomination, open bidding, the "Now: [team] —
      [action]" banner, passing the iPad around (CPU turns don't hand off), one-chance
      "no bid = gone," SOLD/PASSED notices, "Proceed to Farm Auction." *(BV-3)*
- [ ] **Scout info covered by default, tap/click to reveal** the price range + grade;
      tap/click again to re-cover it (changed 2026-07-08 from long-press — the hold gesture
      glitched on the auction floor). *(BV-11)*
- [ ] **Roster board + draft guidance** — the position-slot board, the gap/priority
      highlights, the over-budget warning, the per-phase coach line. *(BV-9, BV-12)*
- [ ] **Draft-format picker** (Auction vs Snake) at league setup saves and sticks. *(BV-13a)*
- [ ] **Pitchers actually get drafted** — SP/RP show up in the pool. *(BV-14)*
- [ ] **Scout grade shows as a band; won bids show as the farm salary.** *(BV-S6/S7b/S7c)*

### 3. General UI/UX (everyday screens + flows)

- [ ] Walk the main franchise screens, navigation, the game tracker, standings, stats,
      rosters, settings — note anything that feels off, slow, confusing, or broken on iPad.
- [ ] (Add your own as you find them.)

---

## FINAL (after the sims pass + we turn the engines on — this is the ship gate)

- [ ] **Play a real living season on the iPad and trust it** — ratings actually moving at
      checkpoints, morale / fame / news reacting, awards at season end, the whole Mode-2
      experience on real data. This is **F-141**, the last gate before ship.

---

## How this clears
- The **DO NOW** items can all be done in parallel with the build + the sims — they don't
  block anything and nothing blocks them. Saved-data items first.
- The **FINAL** playtest happens once the two sim engines have validated the season logic and
  the tuning is settled, and the engines are flipped on.
