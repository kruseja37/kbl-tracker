# Contract: Snake Batch 5 Audit Repairs

**Date:** 2026-07-13
**Branch:** `codex/snake-mock-draft-ready`
**Baseline HEAD:** `3dad03efa8cac951da73c8cf3e331f432ee2c76f`
**Verified origin/main at contract open:** `ea66830e0305d999f4140a101d452417f7d9152e`
**Builder:** `/root/snake_batch5_builder`
**Auditor:** `/root/snake_batch5_auditor`
**Status:** Open

## Why this repair exists

The independent Batch 5 audit returned one major and two minor findings. This
contract closes those findings without reopening the approved Snake Draft
product direction.

1. The guide engine calculates a raw seller premium, but the package, persisted
   offer, and proposal reconstruction discard it. The UI then invents the value
   again by subtracting displayed totals.
2. Persistent Snake room controls using the small ballpark button style do not
   consistently meet the ratified 44px touch target.
3. The builder's responsive proof was temporary. The repository needs a durable
   browser gate at both required iPad viewports.

The audit of record is the final report from `/root/snake_batch5_auditor` against
the uncommitted Batch 5 working tree.

## Frozen outcomes

### 1. Authoritative seller premium

- Add `sellerPremium` to `SnakeGuidePackage`.
- `toGuidePackage` must carry the raw value already calculated by the canonical
  guide search. It must not recalculate it at the presentation boundary.
- Guide request/response validation and proposal revalidation must require a
  finite canonical premium and reject missing, malformed, or tampered values.
- Add `sellerPremium` to new `SnakeOpenTradeOffer` records and preserve the exact
  value through main-room posting, approved companion posting, persistence,
  reload, proposal reconstruction, revalidation, and execution.
- `TradeOfferValueCard` must display the stored premium only. It may not derive
  the value from `offerValue` and `receiveValue`.
- Backward compatibility is read-only: a legacy persisted offer with no premium
  must render `UNAVAILABLE` (or an em dash) and must never receive a fabricated
  value. Legacy records must not be silently upgraded by subtraction.
- Buyer and seller views must retain the named counterparty and correct reversed
  `YOU GIVE` / `YOU GET` orientation.

### 2. Touch targets

- Every persistent interactive control in the Batch 5 Snake room, private desk,
  selected-player card, guide, commissioner trade surface, and active companion
  surface must have a measured minimum target of 44px in both dimensions where
  applicable.
- Small text buttons must use at least `min-h-11`; icon-only controls must also
  use at least `min-w-11`.
- Disabled controls still keep their target size.
- Do not enlarge information-only chips, table cells, or noninteractive labels.
- Keyboard operation, visible focus, labels, and the ratified `? Help` behavior
  remain intact.

### 3. Durable responsive proof

- Add a permanent deterministic `__preview` fixture that renders the real
  `SnakeDraftRoomView` and `SnakeCompanionFrame` components with contract-shaped
  data. It is a test/preview route, not a replacement product pathway.
- Add a permanent Playwright journey that exercises both surfaces at exactly
  `1024x768` and `768x1024`.
- At each viewport, assert:
  - `document.documentElement.scrollWidth <= clientWidth`;
  - no persistent critical action has a bounding box outside the viewport;
  - each persistent interactive control under audit measures at least 44px high,
    and icon-only controls measure at least 44px wide;
  - the private desk remains covered until reveal;
  - the active companion frame contains `? Help` and does not contain
    `FORGET ROOM`.
- The fixture and test remain in the repository. Temporary screenshots, reports,
  traces, and server artifacts do not.
- This automated gate is engineering evidence only. JK's browser walk remains
  the sole acceptance gate.

## Allowed production files

Premium pipeline:

- `src/engines/snakeGuideTrade.ts`
- `src/engines/snakeTradeOffers.ts`
- `src/utils/leagueBuilderStorage.ts`
- `src/src_figma/app/components/snake/trade/TradePackageCard.tsx`

Touch-target repair only:

- Any of the 13 Batch 5 product paths already listed in
  `CONTRACT_SNAKE_INTELLIGENCE_2026-07-13.md`, but only where an interactive
  control is below 44px. No layout or feature redesign is authorized here.

Durable responsive fixture:

- `src/App.tsx` (one guarded `__preview` route only)
- `src/src_figma/app/pages/SnakeResponsivePreview.tsx` (new)
- `test-utils/journeys/12-snake-draft-responsive.spec.ts` (new)

## Allowed tests

- `src/engines/__tests__/snakeEconomicsGuide.test.ts`
- `src/utils/tests/snakeRoomPersistence.test.ts`
- Existing owned Batch 5 main-room, companion, trade, privacy, selected-card,
  room-view, and performance tests
- The new Playwright journey named above

If a missing narrow engine or storage test file is necessary, the builder must
name it before creating it. No unrelated test snapshots may be rewritten.

## Required adversarial proof

1. Guide search returns a nonzero authoritative premium.
2. A premium deliberately different from displayed-total subtraction is rendered
   unchanged by the card.
3. Tampered, missing, NaN, and infinite premiums fail canonical revalidation or
   execution for new proposals.
4. Main and companion posting preserve the exact premium through persistence and
   reload.
5. Proposal reconstruction preserves the exact premium.
6. Legacy missing-premium display is unavailable, never computed.
7. Buyer and seller views show correct counterparties and inverse give/get rows.
8. The permanent four-case iPad Playwright gate passes.
9. A mutation that removes a required 44px class fails a durable test.

## Required gates

- Focused premium engine/storage/UI tests
- Full owned Batch 5 matrix
- Main/companion privacy and authorization suites
- Farm firewall suites
- Performance tests
- Permanent responsive Playwright journey: 4/4
- Exact changed-file ESLint
- Typecheck
- Production build
- Full Vitest suite
- `git diff --check`
- Exact scope/status report

## Non-goals

- No auction changes.
- No Living Season changes.
- No Legends Library or historical-player work.
- No new draft intelligence or guide math.
- No migration that fabricates historical seller premiums.
- No farm guide redesign.
- No weakening or deletion of existing behavioral assertions.
- No staging or commit by the builder or auditor.

## Acceptance

The builder returns evidence only. The same independent auditor must re-run the
hostile checks and return `VERIFIED` with zero major and zero minor findings.
Only the coordinator may then stage the exact audited scope and commit it after a
fresh fetch of `origin/main`.
