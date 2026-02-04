import type { Player, Pitcher } from '@/app/components/TeamRoster';

export const defaultTigersPlayers: Player[] = [
  { name: 'J. MARTINEZ', position: 'SS', battingOrder: 1, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' },
  { name: 'A. SMITH', position: 'CF', battingOrder: 2, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'L' },
  { name: 'D. JONES', position: 'LF', battingOrder: 3, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' },
  { name: 'B. DAVIS', position: 'RF', battingOrder: 4, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' },
  { name: 'T. BROWN', position: '3B', battingOrder: 5, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' },
  { name: 'C. WILSON', position: '1B', battingOrder: 6, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'L' },
  { name: 'M. TAYLOR', position: '2B', battingOrder: 7, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' },
  { name: 'K. ANDERSON', position: 'C', battingOrder: 8, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' },
  { name: 'R. LOPEZ', position: 'P', battingOrder: 9, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' },
  // Bench players
  { name: 'A. TAYLOR', position: 'C', stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' },
  { name: 'B. ANDERSON', position: 'IF', stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'L' },
  { name: 'C. THOMAS', position: 'OF', stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' },
];

export const defaultTigersPitchers: Pitcher[] = [
  { name: 'R. LOPEZ', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'R', isStarter: true, isActive: true },
  { name: 'T. JOHNSON', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'R' },
  { name: 'M. WILLIAMS', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'L' },
  { name: 'K. DAVIS', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'R' },
];

export const defaultSoxPlayers: Player[] = [
  { name: 'P. HERNANDEZ', position: 'CF', battingOrder: 1, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'L' },
  { name: 'K. WASHINGTON', position: 'SS', battingOrder: 2, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' },
  { name: 'L. RODRIGUEZ', position: 'LF', battingOrder: 3, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'L' },
  { name: 'M. JACKSON', position: 'RF', battingOrder: 4, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' },
  { name: 'N. GARCIA', position: '3B', battingOrder: 5, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' },
  { name: 'O. MARTINEZ', position: '1B', battingOrder: 6, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'L' },
  { name: 'Q. LEWIS', position: '2B', battingOrder: 7, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' },
  { name: 'R. THOMAS', position: 'C', battingOrder: 8, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' },
  { name: 'S. PARKER', position: 'P', battingOrder: 9, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' },
  // Bench players
  { name: 'E. CLARK', position: 'OF', stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'L' },
  { name: 'F. MILLER', position: 'IF', stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' },
  { name: 'G. EVANS', position: 'C', stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' },
];

export const defaultSoxPitchers: Pitcher[] = [
  { name: 'S. PARKER', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'R', isStarter: true, isActive: true },
  { name: 'U. PARKER', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'L' },
  { name: 'V. TURNER', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'R' },
  { name: 'W. COLLINS', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'R' },
];
