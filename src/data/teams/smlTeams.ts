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
  homePark: 'Red Rock Park',  // TBD - need to verify from screenshots
  chemistry: 'SPIRITED',
  primaryColor: '#8B4513',  // Brown
  secondaryColor: '#FFD700',  // Gold
  rosterIds: [],  // To be populated
  leagueId: 'sml-super'
};

export const HERBISAURS: TeamData = {
  id: 'herbisaurs',
  name: 'Herbisaurs',
  homePark: 'Sakura Hills',  // Need to verify
  chemistry: 'SPIRITED',
  primaryColor: '#228B22',  // Forest Green
  secondaryColor: '#FFD700',  // Gold
  rosterIds: [],
  leagueId: 'sml-super'
};

export const WILD_PIGS: TeamData = {
  id: 'wild-pigs',
  name: 'Wild Pigs',
  homePark: "Founder's Field",
  chemistry: 'FIERY',
  primaryColor: '#800080',  // Purple
  secondaryColor: '#FFD700',  // Yellow
  rosterIds: [],
  leagueId: 'sml-super'
};

export const FREEBOOTERS: TeamData = {
  id: 'freebooters',
  name: 'Freebooters',
  homePark: "Founder's Field",  // Verified from screenshot
  chemistry: 'SCHOLARLY',  // Based on Stockton Brickhouse
  primaryColor: '#8B0000',  // Dark Red
  secondaryColor: '#FFD700',  // Gold
  rosterIds: [],
  leagueId: 'sml-super'
};

export const HOT_CORNERS: TeamData = {
  id: 'hot-corners',
  name: 'Hot Corners',
  homePark: 'TBD',
  chemistry: 'FIERY',
  primaryColor: '#FF4500',  // Orange Red
  secondaryColor: '#000000',  // Black
  rosterIds: [],
  leagueId: 'sml-super'
};

// ============================================
// BOSS DIVISION (Super Conference)
// ============================================

export const SIRLOINS: TeamData = {
  id: 'sirloins',
  name: 'Sirloins',
  homePark: 'Apple Field',
  chemistry: 'SPIRITED',
  primaryColor: '#CC0000',  // Red
  secondaryColor: '#FFFFFF',  // White
  rosterIds: [],
  leagueId: 'sml-super'
};

export const MOONSTARS: TeamData = {
  id: 'moonstars',
  name: 'Moonstars',
  homePark: 'TBD',
  chemistry: 'CRAFTY',
  primaryColor: '#191970',  // Midnight Blue
  secondaryColor: '#C0C0C0',  // Silver
  rosterIds: [],
  leagueId: 'sml-super'
};

export const BLOWFISH: TeamData = {
  id: 'blowfish',
  name: 'Blowfish',
  homePark: 'TBD',
  chemistry: 'DISCIPLINED',
  primaryColor: '#00CED1',  // Dark Turquoise
  secondaryColor: '#FF69B4',  // Hot Pink
  rosterIds: [],
  leagueId: 'sml-super'
};

export const SAWTEETH: TeamData = {
  id: 'sawteeth',
  name: 'Sawteeth',
  homePark: 'TBD',
  chemistry: 'GRITTY',
  primaryColor: '#2F4F4F',  // Dark Slate Gray
  secondaryColor: '#FF6347',  // Tomato
  rosterIds: [],
  leagueId: 'sml-super'
};

export const SAND_CATS: TeamData = {
  id: 'sand-cats',
  name: 'Sand Cats',
  homePark: 'TBD',
  chemistry: 'CRAFTY',
  primaryColor: '#F4A460',  // Sandy Brown
  secondaryColor: '#8B4513',  // Saddle Brown
  rosterIds: [],
  leagueId: 'sml-super'
};

// ============================================
// EPIC DIVISION (Mega Conference)
// ============================================

export const WIDELOADS: TeamData = {
  id: 'wideloads',
  name: 'Wideloads',
  homePark: 'TBD',
  chemistry: 'GRITTY',
  primaryColor: '#FF8C00',  // Dark Orange
  secondaryColor: '#000000',  // Black
  rosterIds: [],
  leagueId: 'sml-mega'
};

export const PLATYPI: TeamData = {
  id: 'platypi',
  name: 'Platypi',
  homePark: 'TBD',
  chemistry: 'CRAFTY',
  primaryColor: '#008080',  // Teal
  secondaryColor: '#FFA500',  // Orange
  rosterIds: [],
  leagueId: 'sml-mega'
};

export const BEEWOLVES: TeamData = {
  id: 'beewolves',
  name: 'Beewolves',
  homePark: 'Emerald Diamond',
  chemistry: 'CRAFTY',
  primaryColor: '#008B8B',  // Dark Cyan
  secondaryColor: '#FFD700',  // Gold
  rosterIds: [],
  leagueId: 'sml-mega'
};

export const GRAPPLERS: TeamData = {
  id: 'grapplers',
  name: 'Grapplers',
  homePark: 'TBD',
  chemistry: 'GRITTY',
  primaryColor: '#800000',  // Maroon
  secondaryColor: '#FFD700',  // Gold
  rosterIds: [],
  leagueId: 'sml-mega'
};

export const HEATERS: TeamData = {
  id: 'heaters',
  name: 'Heaters',
  homePark: 'TBD',
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
  homePark: 'TBD',
  chemistry: 'SPIRITED',
  primaryColor: '#4169E1',  // Royal Blue
  secondaryColor: '#FFFFFF',  // White
  rosterIds: [],
  leagueId: 'sml-mega'
};

export const BUZZARDS: TeamData = {
  id: 'buzzards',
  name: 'Buzzards',
  homePark: 'TBD',
  chemistry: 'GRITTY',
  primaryColor: '#2F4F4F',  // Dark Slate Gray
  secondaryColor: '#B22222',  // Firebrick
  rosterIds: [],
  leagueId: 'sml-mega'
};

export const CROCODONS: TeamData = {
  id: 'crocodons',
  name: 'Crocodons',
  homePark: 'TBD',
  chemistry: 'DISCIPLINED',
  primaryColor: '#006400',  // Dark Green
  secondaryColor: '#FFD700',  // Gold
  rosterIds: [],
  leagueId: 'sml-mega'
};

export const NEMESIS: TeamData = {
  id: 'nemesis',
  name: 'Nemesis',
  homePark: 'TBD',
  chemistry: 'DISCIPLINED',
  primaryColor: '#000000',  // Black
  secondaryColor: '#FF0000',  // Red
  rosterIds: [],
  leagueId: 'sml-mega'
};

export const JACKS: TeamData = {
  id: 'jacks',
  name: 'Jacks',
  homePark: 'TBD',
  chemistry: 'CRAFTY',
  primaryColor: '#800080',  // Purple
  secondaryColor: '#00FF00',  // Lime
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
