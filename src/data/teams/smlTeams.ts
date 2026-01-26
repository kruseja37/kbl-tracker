/**
 * Super Mega League Teams
 *
 * All 20 teams from the SMB4 Super Mega League with their basic info.
 * Players are stored separately and linked via rosterIds.
 */

import type { TeamData, Chemistry } from '../playerDatabase';

// ============================================
// BEAST DIVISION (Super Conference)
// ============================================

export const MOOSE: TeamData = {
  id: 'moose',
  name: 'Moose',
  homePark: 'Stade Royale',  // Verified from screenshot
  chemistry: 'SPIRITED',
  primaryColor: '#8B4513',  // Brown/Tan
  secondaryColor: '#FFFFFF',  // White
  rosterIds: [],
  leagueId: 'sml-super'
};

export const HERBISAURS: TeamData = {
  id: 'herbisaurs',
  name: 'Herbisaurs',
  homePark: 'Parque Jardineros',  // Verified from screenshot
  chemistry: 'SPIRITED',
  primaryColor: '#228B22',  // Forest Green
  secondaryColor: '#FFA500',  // Orange (verified)
  rosterIds: [],
  leagueId: 'sml-super'
};

export const WILD_PIGS: TeamData = {
  id: 'wild-pigs',
  name: 'Wild Pigs',
  homePark: "Founder's Field",  // Verified from screenshot
  chemistry: 'FIERY',
  primaryColor: '#800080',  // Purple
  secondaryColor: '#FFD700',  // Yellow/Gold
  rosterIds: [],
  leagueId: 'sml-super'
};

export const FREEBOOTERS: TeamData = {
  id: 'freebooters',
  name: 'Freebooters',
  homePark: 'Lafayette Corner',  // Verified from Team Visuals screenshot
  chemistry: 'SCHOLARLY',
  primaryColor: '#FF4500',  // Orange
  secondaryColor: '#000000',  // Black
  rosterIds: [],
  leagueId: 'sml-super'
};

export const HOT_CORNERS: TeamData = {
  id: 'hot-corners',
  name: 'Hot Corners',
  homePark: 'Golden Field',  // Verified from screenshot
  chemistry: 'SCHOLARLY',  // Based on player chemistry
  primaryColor: '#8B0000',  // Dark Red/Maroon
  secondaryColor: '#FFD700',  // Gold/Yellow
  rosterIds: [],
  leagueId: 'sml-super'
};

// ============================================
// BOSS DIVISION (Super Conference)
// ============================================

export const SIRLOINS: TeamData = {
  id: 'sirloins',
  name: 'Sirloins',
  homePark: 'Apple Field',  // TBD - verify from screenshot
  chemistry: 'SPIRITED',
  primaryColor: '#CC0000',  // Red
  secondaryColor: '#FFFFFF',  // White
  rosterIds: [],
  leagueId: 'sml-super'
};

export const MOONSTARS: TeamData = {
  id: 'moonstars',
  name: 'Moonstars',
  homePark: 'Big Sky Park',  // Verified from screenshot
  chemistry: 'CRAFTY',
  primaryColor: '#87CEEB',  // Sky Blue
  secondaryColor: '#FFFFFF',  // White
  rosterIds: [],
  leagueId: 'sml-super'
};

export const BLOWFISH: TeamData = {
  id: 'blowfish',
  name: 'Blowfish',
  homePark: 'Swagger Center',  // Verified from screenshot
  chemistry: 'DISCIPLINED',
  primaryColor: '#40E0D0',  // Turquoise
  secondaryColor: '#FFD700',  // Gold/Yellow
  rosterIds: [],
  leagueId: 'sml-super'
};

export const SAWTEETH: TeamData = {
  id: 'sawteeth',
  name: 'Sawteeth',
  homePark: 'El Viejo Stadium',  // Verified from screenshot
  chemistry: 'GRITTY',
  primaryColor: '#00CED1',  // Cyan/Turquoise
  secondaryColor: '#FF6347',  // Orange-Red
  rosterIds: [],
  leagueId: 'sml-super'
};

export const SAND_CATS: TeamData = {
  id: 'sand-cats',
  name: 'Sand Cats',
  homePark: 'Sakura Hills',  // Verified from screenshot
  chemistry: 'CRAFTY',
  primaryColor: '#FFD700',  // Gold/Yellow
  secondaryColor: '#FFFFFF',  // White
  rosterIds: [],
  leagueId: 'sml-super'
};

// ============================================
// EPIC DIVISION (Mega Conference)
// ============================================

export const WIDELOADS: TeamData = {
  id: 'wideloads',
  name: 'Wideloads',
  homePark: 'The Corral',  // Verified from screenshot
  chemistry: 'GRITTY',
  primaryColor: '#4B0082',  // Indigo/Purple
  secondaryColor: '#FFFFFF',  // White
  rosterIds: [],
  leagueId: 'sml-mega'
};

export const PLATYPI: TeamData = {
  id: 'platypi',
  name: 'Platypi',
  homePark: 'Colonial Plaza',  // Verified from screenshot
  chemistry: 'CRAFTY',
  primaryColor: '#800020',  // Burgundy/Maroon
  secondaryColor: '#FFD700',  // Gold/Yellow
  rosterIds: [],
  leagueId: 'sml-mega'
};

export const BEEWOLVES: TeamData = {
  id: 'beewolves',
  name: 'Beewolves',
  homePark: 'Emerald Diamond',  // TBD - verify from screenshot
  chemistry: 'COMPETITIVE',
  primaryColor: '#4169E1',  // Royal Blue
  secondaryColor: '#FFFFFF',  // White
  rosterIds: [],
  leagueId: 'sml-mega'
};

export const GRAPPLERS: TeamData = {
  id: 'grapplers',
  name: 'Grapplers',
  homePark: 'Bingata Bowl',  // Verified from screenshot
  chemistry: 'GRITTY',
  primaryColor: '#FF4500',  // Orange-Red
  secondaryColor: '#008B8B',  // Teal
  rosterIds: [],
  leagueId: 'sml-mega'
};

export const HEATERS: TeamData = {
  id: 'heaters',
  name: 'Heaters',
  homePark: 'Red Rock Park',  // Verified from screenshot
  chemistry: 'FIERY',
  primaryColor: '#FF0000',  // Red
  secondaryColor: '#FFFFFF',  // White
  rosterIds: [],
  leagueId: 'sml-mega'
};

// ============================================
// MONSTER DIVISION (Mega Conference)
// ============================================

export const OVERDOGS: TeamData = {
  id: 'overdogs',
  name: 'Overdogs',
  homePark: 'Motor Yard',  // Verified from screenshot
  chemistry: 'SPIRITED',
  primaryColor: '#FFD700',  // Gold/Yellow
  secondaryColor: '#000000',  // Black
  rosterIds: [],
  leagueId: 'sml-mega'
};

export const BUZZARDS: TeamData = {
  id: 'buzzards',
  name: 'Buzzards',
  homePark: 'Shaka Sports Turf',  // Verified from screenshot
  chemistry: 'GRITTY',
  primaryColor: '#006400',  // Forest Green
  secondaryColor: '#FFD700',  // Gold
  rosterIds: [],
  leagueId: 'sml-mega'
};

export const CROCODONS: TeamData = {
  id: 'crocodons',
  name: 'Crocodons',
  homePark: "Whacker's Wheel",  // Verified from screenshot
  chemistry: 'DISCIPLINED',
  primaryColor: '#006400',  // Dark Green
  secondaryColor: '#FFFFFF',  // White
  rosterIds: [],
  leagueId: 'sml-mega'
};

export const NEMESIS: TeamData = {
  id: 'nemesis',
  name: 'Nemesis',
  homePark: 'Tiger Den',  // Verified from screenshot
  chemistry: 'DISCIPLINED',
  primaryColor: '#800080',  // Purple
  secondaryColor: '#FFFFFF',  // White
  rosterIds: [],
  leagueId: 'sml-mega'
};

export const JACKS: TeamData = {
  id: 'jacks',
  name: 'Jacks',
  homePark: 'Battery Bay',  // Verified from screenshot
  chemistry: 'CRAFTY',
  primaryColor: '#FFFFFF',  // White
  secondaryColor: '#FFD700',  // Gold
  rosterIds: [],
  leagueId: 'sml-mega'
};

// ============================================
// ALL SML TEAMS
// ============================================

export const SML_TEAMS: Record<string, TeamData> = {
  // Beast Division
  'moose': MOOSE,
  'herbisaurs': HERBISAURS,
  'wild-pigs': WILD_PIGS,
  'freebooters': FREEBOOTERS,
  'hot-corners': HOT_CORNERS,
  // Boss Division
  'sirloins': SIRLOINS,
  'moonstars': MOONSTARS,
  'blowfish': BLOWFISH,
  'sawteeth': SAWTEETH,
  'sand-cats': SAND_CATS,
  // Epic Division
  'wideloads': WIDELOADS,
  'platypi': PLATYPI,
  'beewolves': BEEWOLVES,
  'grapplers': GRAPPLERS,
  'heaters': HEATERS,
  // Monster Division
  'overdogs': OVERDOGS,
  'buzzards': BUZZARDS,
  'crocodons': CROCODONS,
  'nemesis': NEMESIS,
  'jacks': JACKS
};
