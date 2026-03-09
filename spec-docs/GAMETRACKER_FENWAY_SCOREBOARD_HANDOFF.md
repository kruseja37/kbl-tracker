# GameTracker Fenway Scoreboard Handoff

## Purpose
This is the handoff note for the **original full Fenway-style scoreboard** that existed before the 5-zone GameTracker refactor introduced the reduced left-rail `FenwayBoard`.

## Source Of Truth
- Historical implementation commit: `8b45b4d`
- Historical file: `src/src_figma/app/pages/GameTracker.tsx`
- Historical region: the sticky top scoreboard block shown by:

```bash
git show 8b45b4d:src/src_figma/app/pages/GameTracker.tsx | sed -n '1248,1498p'
```

## Important Clarification
The original full Fenway-style board was **not** implemented inside `EnhancedInteractiveField.tsx`.

It lived in the **older `GameTracker.tsx` page wrapper above the field**. `EnhancedInteractiveField.tsx` rendered below it as the main field surface.

## What The Original UI Included
- A full-width sticky scoreboard header above the field
- Super Mega Baseball logo block at left
- Full Fenway/Green-Monster-style center board
- Stadium name header
- Inning-by-inning line score grid
- `P` column
- `R / H / E` columns
- `REC` column
- Concessions panel
- Ad panel (`KRUSE COLA`)
- Bottom indicator strip with:
  - `AT BAT`
  - `BALL`
  - `STRIKE`
  - `OUT`
  - `(H)` home indicator
  - `(E)` error indicator
- Date and elapsed game time
- Mini/expand toggle state

## Historical JSX Shape
This is the relevant structure from the historical implementation, trimmed to the key hierarchy:

```tsx
{isScoreboardMinimized ? (
  <MiniScoreboard ... onExpand={() => setIsScoreboardMinimized(false)} />
) : (
  <div className="bg-[#6B9462] border-b-[4px] border-[#3d5240] px-4 py-2 sticky top-0 z-10">
    <div className="max-w-7xl mx-auto">
      <div className="relative flex items-center justify-between bg-[rgb(133,181,229)] border-[4px] border-[#1a3020] p-2">
        <button ...>MINI</button>

        <div className="flex items-center gap-2">
          <div className="bg-white border-[4px] border-[#0066FF] ...">
            <div>SUPER MEGA</div>
            <div>BASEBALL</div>
          </div>
        </div>

        <div className="mx-2">
          <div className="bg-[#556B55] border-[3px] border-[#3d5240] p-1.5 ...">
            <div className="text-center ...">
              {stadiumName || getTeamColors(homeTeamId).stadium || 'BALLPARK'}
            </div>

            <div
              className="grid gap-[1px] mb-2"
              style={{ gridTemplateColumns: '26px 110px repeat(9, 22px) 22px 6px 26px 26px 26px 6px 48px 8px auto' }}
            >
              <div>P</div>
              <div></div>
              {[1,2,3,4,5,6,7,8,9].map(...)}
              <div>10</div>
              <div></div>
              <div>R</div>
              <div>H</div>
              <div>E</div>
              <div></div>
              <div>REC</div>

              {/* away row */}
              <div>1</div>
              <div>{awayTeamName.toUpperCase()}</div>
              {[1,2,3,4,5,6,7,8,9].map(...)}
              <div>{scoreboard.away.runs}</div>
              <div>{scoreboard.away.hits}</div>
              <div>{scoreboard.away.errors}</div>
              <div>{awayRecord}</div>

              <div className="row-span-2 ...">
                <div>CONCESSIONS / HOT DOG / PEANUTS / CRACKER JACK</div>
                <div>KRUSE COLA</div>
              </div>

              {/* home row */}
              <div>1</div>
              <div>{homeTeamName.toUpperCase()}</div>
              {[1,2,3,4,5,6,7,8,9].map(...)}
              <div>{scoreboard.home.runs}</div>
              <div>{scoreboard.home.hits}</div>
              <div>{scoreboard.home.errors}</div>
              <div>{homeRecord}</div>
            </div>

            <div className="border-t-2 border-[#E8E8D8] pt-2 flex items-center gap-3 text-[#E8E8D8]">
              <div>AT BAT ...</div>
              <div>BALL ...</div>
              <div>STRIKE ...</div>
              <div>OUT ...</div>
              <div>(H) ...</div>
              <div>(E) ...</div>
            </div>

            <div className="mt-2 flex justify-between items-center text-[7px] text-[#E8E8D8]">
              <span>{date}</span>
              <span>TIME: {elapsed}</span>
            </div>
          </div>
        </div>

        <button>
          <Menu />
        </button>
      </div>
    </div>
  </div>
)}
```

## Supporting Spec History
- Draft spec explicitly kept the **full Fenway Board**:
  - [MODE_2_V1_DRAFT.md](/Users/johnkruse/Projects/kbl-tracker/spec-docs/v1-simplification/MODE_2_V1_DRAFT.md#L70)
- Final spec documents the later replacement:
  - [MODE_2_V1_FINAL.md](/Users/johnkruse/Projects/kbl-tracker/spec-docs/v1-simplification/MODE_2_V1_FINAL.md#L622)

## Supporting Bug History
The historical bug log confirms this older full board existed and was being tuned in `GameTracker.tsx`:
- jersey number issue
- team record issue
- scoreboard sizing / mini-button issue

Reference:
- [BUG_RESOLUTION_EXHIBITION.md](/Users/johnkruse/Projects/kbl-tracker/spec-docs/archive/BUG_RESOLUTION_EXHIBITION.md#L144)

## Current Reduced Replacement
The current reduced board is a different implementation:
- [FenwayBoard.tsx](/Users/johnkruse/Projects/kbl-tracker/src/src_figma/app/components/FenwayBoard.tsx)

It is a compact left-column information rail, not the historical full-width outfield-scoreboard treatment.
