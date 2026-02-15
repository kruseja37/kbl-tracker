/**
 * Fictional Calendar Engine (GAP-B10-008)
 * Per KBL_XHD_TRACKER_MASTER_SPEC_v3.md §26
 *
 * Maps game numbers to fictional calendar dates for narrative immersion.
 */

// ============================================
// TYPES
// ============================================

export interface CalendarDate {
  month: number; // 1-12
  day: number;   // 1-31
  year?: number;
}

export interface SeasonCalendarEvent {
  name: string;
  date: CalendarDate;
  gameThreshold?: number; // % through season this event occurs
}

// ============================================
// SEASON CALENDAR CONSTANTS
// ============================================

export const SEASON_CALENDAR: Record<string, CalendarDate> = {
  OPENING_DAY: { month: 3, day: 28 },
  ALL_STAR_BREAK: { month: 7, day: 15 },
  TRADE_DEADLINE: { month: 7, day: 31 },
  REGULAR_SEASON_END: { month: 9, day: 29 },
  PLAYOFFS_START: { month: 10, day: 1 },
  WORLD_SERIES_START: { month: 10, day: 21 },
};

const MONTH_NAMES = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTH_FULL_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Convert a game number to a fictional calendar date.
 * Maps linearly from Opening Day (game 1) to Regular Season End (last game).
 */
export function getGameDate(
  gameNumber: number,
  totalGames: number,
  seasonYear?: number,
): CalendarDate {
  const start = SEASON_CALENDAR.OPENING_DAY;
  const end = SEASON_CALENDAR.REGULAR_SEASON_END;

  // Total days from Opening Day to end of regular season
  const startDay = dayOfYear(start.month, start.day);
  const endDay = dayOfYear(end.month, end.day);
  const totalDays = endDay - startDay;

  // Linear interpolation
  const fraction = totalGames > 1 ? (gameNumber - 1) / (totalGames - 1) : 0;
  const currentDayOfYear = startDay + Math.round(fraction * totalDays);

  const { month, day } = dayOfYearToDate(currentDayOfYear);

  return { month, day, year: seasonYear };
}

/**
 * Format a calendar date for display. Returns "Mar 28" format.
 */
export function formatGameDate(date: CalendarDate): string {
  return `${MONTH_NAMES[date.month]} ${date.day}`;
}

/**
 * Format a calendar date fully. Returns "March 28, 2026" format.
 */
export function formatGameDateFull(date: CalendarDate): string {
  const yearStr = date.year ? `, ${date.year}` : '';
  return `${MONTH_FULL_NAMES[date.month]} ${date.day}${yearStr}`;
}

/**
 * Get special events around the current game number.
 */
export function getSpecialEvents(
  gameNumber: number,
  totalGames: number,
): SeasonCalendarEvent[] {
  const events: SeasonCalendarEvent[] = [];

  // Opening Day
  if (gameNumber === 1) {
    events.push({ name: 'Opening Day', date: SEASON_CALENDAR.OPENING_DAY });
  }

  // All-Star Break (~60% through season)
  const allStarGame = Math.round(totalGames * 0.6);
  if (gameNumber === allStarGame) {
    events.push({ name: 'All-Star Break', date: SEASON_CALENDAR.ALL_STAR_BREAK, gameThreshold: 0.6 });
  }

  // Trade Deadline (~65% through season)
  const tradeDeadline = Math.floor(totalGames * 0.65);
  if (gameNumber === tradeDeadline) {
    events.push({ name: 'Trade Deadline', date: SEASON_CALENDAR.TRADE_DEADLINE, gameThreshold: 0.65 });
  }

  // Regular Season End
  if (gameNumber === totalGames) {
    events.push({ name: 'Regular Season Ends', date: SEASON_CALENDAR.REGULAR_SEASON_END });
  }

  return events;
}

/**
 * Get the season percentage complete.
 */
export function getSeasonProgress(gameNumber: number, totalGames: number): number {
  if (totalGames <= 0) return 0;
  return Math.min(1, gameNumber / totalGames);
}

// ============================================
// HELPERS
// ============================================

/** Convert month/day to day-of-year (1-based) */
function dayOfYear(month: number, day: number): number {
  let total = 0;
  for (let m = 1; m < month; m++) {
    total += MONTH_DAYS[m];
  }
  return total + day;
}

/** Convert day-of-year back to month/day */
function dayOfYearToDate(doy: number): { month: number; day: number } {
  let remaining = doy;
  for (let m = 1; m <= 12; m++) {
    if (remaining <= MONTH_DAYS[m]) {
      return { month: m, day: remaining };
    }
    remaining -= MONTH_DAYS[m];
  }
  return { month: 12, day: 31 }; // Fallback
}
