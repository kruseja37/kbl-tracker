/** Pure canonical Snake board-slot contract. Safe to import from browser workers. */
export const SNAKE_BOARD_SLOT_IDS = [
  'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'BACKUP_C',
  'SP1', 'SP2', 'SP3', 'SP4', 'RP1', 'RP2', 'RP3', 'CP',
  'FLEX1', 'FLEX2', 'FLEX3', 'FLEX4', 'SWING',
] as const;

export type SnakeBoardSlotId = (typeof SNAKE_BOARD_SLOT_IDS)[number];
