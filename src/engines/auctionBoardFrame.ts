import {
  LEGAL_ROSTER,
  canCover,
  canRelieve,
  canStart,
  isCloser,
  type FieldPosition,
  type RosterSlotPlayer,
} from '../data/rosterConstruction';
import { teamRosterNeed, type RosterNeedBreakdown, type RosterPositionMap } from './rosterNeed';

export type AuctionBoardGroup = 'THE EIGHT' | 'ROTATION' | 'BULLPEN' | 'THE BENCH';
export type AuctionBoardSeatClass = 'field' | 'rotation' | 'bullpen' | 'catcher-depth' | 'capacity';

export interface AuctionBoardRosterEntry {
  playerId: string;
  salary: number;
  name?: string;
}

export interface AuctionBoardPlayer {
  playerId: string;
  salary: number;
  name: string;
  chip: string;
}

export interface AuctionBoardSeatDefinition {
  slotId: string;
  label: string;
  group: AuctionBoardGroup;
  seatClass: AuctionBoardSeatClass;
  position?: FieldPosition;
}

export interface AuctionBoardSeat extends AuctionBoardSeatDefinition {
  player: AuctionBoardPlayer | null;
  isGap: boolean;
  gapLabel: string | null;
  depthNote: string | null;
}

export interface AuctionBoardFrame {
  seats: AuctionBoardSeat[];
  overflow: AuctionBoardPlayer[];
  need: RosterNeedBreakdown | null;
  target: number;
}

const FIELD_SEATS: AuctionBoardSeatDefinition[] = LEGAL_ROSTER.fieldPositions.map((position) => ({
  slotId: position,
  label: position,
  group: 'THE EIGHT',
  seatClass: 'field',
  position,
}));

const ROTATION_SEATS: AuctionBoardSeatDefinition[] = Array.from(
  { length: LEGAL_ROSTER.startingPitchers },
  (_, index) => ({
    slotId: `SP${index + 1}`,
    label: `SP${index + 1}`,
    group: 'ROTATION',
    seatClass: 'rotation',
  }),
);

const BULLPEN_SEATS: AuctionBoardSeatDefinition[] = [
  ...Array.from(
    { length: LEGAL_ROSTER.minRelievers - LEGAL_ROSTER.minClosers },
    (_, index) => ({
      slotId: `RP${index + 1}`,
      label: `RP${index + 1}`,
      group: 'BULLPEN' as const,
      seatClass: 'bullpen' as const,
    }),
  ),
  {
    slotId: 'CP',
    label: 'CP',
    group: 'BULLPEN',
    seatClass: 'bullpen',
  },
];

const BENCH_SEATS: AuctionBoardSeatDefinition[] = [
  {
    slotId: 'backupC',
    label: 'BACKUP C',
    group: 'THE BENCH',
    seatClass: 'catcher-depth',
  },
  ...Array.from({ length: LEGAL_ROSTER.minBench }, (_, index) => ({
    slotId: `FLEX${index + 1}`,
    label: 'BENCH',
    group: 'THE BENCH' as const,
    seatClass: 'capacity' as const,
  })),
  {
    slotId: 'SWING',
    label: 'SWING',
    group: 'THE BENCH',
    seatClass: 'capacity',
  },
];

export const AUCTION_BOARD_SEATS: readonly AuctionBoardSeatDefinition[] = [
  ...FIELD_SEATS,
  ...ROTATION_SEATS,
  ...BULLPEN_SEATS,
  ...BENCH_SEATS,
] as const;

function playerChip(shape: RosterSlotPlayer): string {
  return shape.isPitcher ? shape.role ?? shape.position : shape.position;
}

function toBoardPlayer(entry: AuctionBoardRosterEntry, shape: RosterSlotPlayer): AuctionBoardPlayer {
  return {
    playerId: entry.playerId,
    salary: entry.salary,
    name: entry.name ?? entry.playerId,
    chip: playerChip(shape),
  };
}

function findUnseated(
  entries: readonly AuctionBoardRosterEntry[],
  positions: RosterPositionMap,
  seated: ReadonlySet<string>,
  predicate: (shape: RosterSlotPlayer) => boolean,
): AuctionBoardRosterEntry | null {
  for (const entry of entries) {
    if (seated.has(entry.playerId)) continue;
    const shape = positions[entry.playerId];
    if (shape && predicate(shape)) return entry;
  }
  return null;
}

function fillSeat(
  entries: readonly AuctionBoardRosterEntry[],
  positions: RosterPositionMap,
  seated: Set<string>,
  predicate: (shape: RosterSlotPlayer) => boolean,
): AuctionBoardPlayer | null {
  const entry = findUnseated(entries, positions, seated, predicate);
  if (!entry) return null;
  const shape = positions[entry.playerId];
  seated.add(entry.playerId);
  return toBoardPlayer(entry, shape);
}

function fieldGap(definition: AuctionBoardSeatDefinition, need: RosterNeedBreakdown | null): boolean {
  return Boolean(
    need &&
      definition.seatClass === 'field' &&
      definition.position &&
      need.missingPrimaries.includes(definition.position),
  );
}

function gapLabel(definition: AuctionBoardSeatDefinition): string {
  return `${definition.label} GAP`;
}

function depthCovererNote(
  roster: readonly AuctionBoardRosterEntry[],
  positions: RosterPositionMap,
  seated: ReadonlySet<string>,
  cSeatPlayerId: string | null,
): string | null {
  for (const entry of roster) {
    if (!seated.has(entry.playerId) || entry.playerId === cSeatPlayerId) continue;
    const shape = positions[entry.playerId];
    if (!shape || (!canCover(shape, 'C') && shape.twoWayVariant !== 'C')) continue;
    if (shape.isPitcher) return `depth via ${entry.name ?? entry.playerId} (Two Way C)`;
    return `depth via ${entry.name ?? entry.playerId} (${shape.position}, covers C)`;
  }
  return null;
}

export function buildAuctionBoardFrame(
  roster: readonly AuctionBoardRosterEntry[],
  positions: RosterPositionMap,
): AuctionBoardFrame {
  const seated = new Set<string>();
  const seatedBySlot = new Map<string, AuctionBoardPlayer>();
  const depthNoteBySlot = new Map<string, string>();
  const rosterIds = roster.map((entry) => entry.playerId);
  const need = teamRosterNeed(rosterIds, positions);

  for (const definition of FIELD_SEATS) {
    const player = fillSeat(
      roster,
      positions,
      seated,
      (shape) => !shape.isPitcher && shape.position === definition.position,
    );
    if (player) seatedBySlot.set(definition.slotId, player);
  }

  for (const definition of ROTATION_SEATS) {
    const player =
      fillSeat(roster, positions, seated, (shape) => shape.isPitcher && shape.role === 'SP') ??
      fillSeat(roster, positions, seated, (shape) => shape.isPitcher && shape.role === 'SP/RP' && canStart(shape));
    if (player) seatedBySlot.set(definition.slotId, player);
  }

  for (const definition of BULLPEN_SEATS.filter((seat) => seat.slotId === 'CP')) {
    const player = fillSeat(roster, positions, seated, isCloser);
    if (player) seatedBySlot.set(definition.slotId, player);
  }

  for (const definition of BULLPEN_SEATS.filter((seat) => seat.slotId !== 'CP')) {
    const player =
      fillSeat(roster, positions, seated, (shape) => shape.isPitcher && (shape.role === 'RP' || shape.role === 'CP')) ??
      fillSeat(roster, positions, seated, (shape) => shape.isPitcher && shape.role === 'SP/RP' && canRelieve(shape));
    if (player) seatedBySlot.set(definition.slotId, player);
  }

  const backupC = fillSeat(
    roster,
    positions,
    seated,
    (shape) => !shape.isPitcher && canCover(shape, 'C'),
  ) ?? fillSeat(
    roster,
    positions,
    seated,
    (shape) => shape.isPitcher && shape.twoWayVariant === 'C',
  );
  if (backupC) {
    seatedBySlot.set('backupC', backupC);
  } else if (need?.catcherCoverNeed === 0) {
    const fallback =
      findUnseated(roster, positions, seated, (shape) => !shape.isPitcher) ??
      findUnseated(roster, positions, seated, () => true);
    if (fallback) {
      const fallbackShape = positions[fallback.playerId];
      const cSeatPlayerId = seatedBySlot.get('C')?.playerId ?? null;
      const depthNote = depthCovererNote(roster, positions, seated, cSeatPlayerId);
      seated.add(fallback.playerId);
      seatedBySlot.set('backupC', toBoardPlayer(fallback, fallbackShape));
      if (depthNote) depthNoteBySlot.set('backupC', depthNote);
    }
  }

  for (const definition of BENCH_SEATS.filter((seat) => seat.slotId.startsWith('FLEX'))) {
    const player =
      fillSeat(roster, positions, seated, (shape) => !shape.isPitcher) ??
      fillSeat(roster, positions, seated, () => true);
    if (player) seatedBySlot.set(definition.slotId, player);
  }

  const swingPlayer =
    fillSeat(roster, positions, seated, (shape) => !shape.isPitcher || canRelieve(shape)) ??
    fillSeat(roster, positions, seated, () => true);
  if (swingPlayer) seatedBySlot.set('SWING', swingPlayer);

  const overflow = roster
    .filter((entry) => !seated.has(entry.playerId))
    .map((entry) => {
      const shape = positions[entry.playerId];
      return shape
        ? toBoardPlayer(entry, shape)
        : {
            playerId: entry.playerId,
            salary: entry.salary,
            name: entry.name ?? entry.playerId,
            chip: 'POS',
          };
    });

  const totalDrafted = roster.length;

  const seats = AUCTION_BOARD_SEATS.map((definition): AuctionBoardSeat => {
    const player = seatedBySlot.get(definition.slotId) ?? null;
    let isGap = false;
    if (fieldGap(definition, need)) isGap = true;
    else if (definition.seatClass === 'catcher-depth') isGap = Boolean(need && need.catcherCoverNeed > 0);
    else if (definition.seatClass === 'rotation') isGap = !player;
    else if (definition.seatClass === 'bullpen') isGap = !player;
    else if (definition.seatClass === 'capacity') {
      isGap = !player && totalDrafted < LEGAL_ROSTER.size;
    }

    return {
      ...definition,
      player,
      isGap,
      gapLabel: isGap ? gapLabel(definition) : null,
      depthNote: depthNoteBySlot.get(definition.slotId) ?? null,
    };
  });

  return {
    seats,
    overflow,
    need,
    target: LEGAL_ROSTER.size,
  };
}
