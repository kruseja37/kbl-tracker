/**
 * Major League Baseball Teams
 *
 * All 30 MLB teams as they appear in SMB4 with their basic info.
 * Players are stored separately and linked via rosterIds.
 */

import type { TeamData } from '../playerDatabase';

// ============================================
// AL EAST
// ============================================

export const BLUE_JAYS: TeamData = {
  id: 'blue-jays',
  name: 'Toronto Blue Jays',
  homePark: 'Rogers Centre',
  chemistry: 'SPIRITED',
  primaryColor: '#134A8E',  // Blue
  secondaryColor: '#1D2D5C',  // Navy
  rosterIds: [],
  leagueId: 'mlb-al'
};

export const YANKEES: TeamData = {
  id: 'yankees',
  name: 'New York Yankees',
  homePark: 'Yankee Stadium',
  chemistry: 'DISCIPLINED',
  primaryColor: '#003087',  // Navy Blue
  secondaryColor: '#FFFFFF',  // White
  rosterIds: [],
  leagueId: 'mlb-al'
};

export const ORIOLES: TeamData = {
  id: 'orioles',
  name: 'Baltimore Orioles',
  homePark: 'Camden Yards',
  chemistry: 'GRITTY',
  primaryColor: '#DF4601',  // Orange
  secondaryColor: '#000000',  // Black
  rosterIds: [],
  leagueId: 'mlb-al'
};

export const RAYS: TeamData = {
  id: 'rays',
  name: 'Tampa Bay Rays',
  homePark: 'Bingata Bowl',  // From screenshot
  chemistry: 'CRAFTY',
  primaryColor: '#092C5C',  // Navy
  secondaryColor: '#8FBCE6',  // Light Blue
  rosterIds: [],
  leagueId: 'mlb-al'
};

export const RED_SOX: TeamData = {
  id: 'red-sox',
  name: 'Boston Red Sox',
  homePark: 'Fenway Park',
  chemistry: 'SPIRITED',
  primaryColor: '#BD3039',  // Red
  secondaryColor: '#0C2340',  // Navy
  rosterIds: [],
  leagueId: 'mlb-al'
};

// ============================================
// AL CENTRAL
// ============================================

export const WHITE_SOX: TeamData = {
  id: 'white-sox',
  name: 'Chicago White Sox',
  homePark: 'Guaranteed Rate Field',
  chemistry: 'GRITTY',
  primaryColor: '#27251F',  // Black
  secondaryColor: '#C4CED4',  // Silver
  rosterIds: [],
  leagueId: 'mlb-al'
};

export const TWINS: TeamData = {
  id: 'twins',
  name: 'Minnesota Twins',
  homePark: 'Target Field',
  chemistry: 'SPIRITED',
  primaryColor: '#002B5C',  // Navy
  secondaryColor: '#D31145',  // Red
  rosterIds: [],
  leagueId: 'mlb-al'
};

export const INDIANS: TeamData = {
  id: 'indians',
  name: 'Cleveland Indians',  // Note: Now Guardians, but SMB4 uses Indians
  homePark: 'Progressive Field',
  chemistry: 'DISCIPLINED',
  primaryColor: '#00385D',  // Navy
  secondaryColor: '#E50022',  // Red
  rosterIds: [],
  leagueId: 'mlb-al'
};

export const ROYALS: TeamData = {
  id: 'royals',
  name: 'Kansas City Royals',
  homePark: 'Kauffman Stadium',
  chemistry: 'SPIRITED',
  primaryColor: '#004687',  // Royal Blue
  secondaryColor: '#BD9B60',  // Gold
  rosterIds: [],
  leagueId: 'mlb-al'
};

export const TIGERS: TeamData = {
  id: 'tigers',
  name: 'Detroit Tigers',
  homePark: 'Comerica Park',
  chemistry: 'GRITTY',
  primaryColor: '#0C2340',  // Navy
  secondaryColor: '#FA4616',  // Orange
  rosterIds: [],
  leagueId: 'mlb-al'
};

// ============================================
// AL WEST
// ============================================

export const MARINERS: TeamData = {
  id: 'mariners',
  name: 'Seattle Mariners',
  homePark: 'T-Mobile Park',
  chemistry: 'CRAFTY',
  primaryColor: '#0C2C56',  // Navy
  secondaryColor: '#005C5C',  // Teal
  rosterIds: [],
  leagueId: 'mlb-al'
};

export const ASTROS: TeamData = {
  id: 'astros',
  name: 'Houston Astros',
  homePark: 'Minute Maid Park',
  chemistry: 'DISCIPLINED',
  primaryColor: '#002D62',  // Navy
  secondaryColor: '#EB6E1F',  // Orange
  rosterIds: [],
  leagueId: 'mlb-al'
};

export const ANGELS: TeamData = {
  id: 'angels',
  name: 'California Angels',  // SMB4 uses historical name
  homePark: 'Angel Stadium',
  chemistry: 'SPIRITED',
  primaryColor: '#BA0021',  // Red
  secondaryColor: '#003263',  // Navy
  rosterIds: [],
  leagueId: 'mlb-al'
};

export const RANGERS: TeamData = {
  id: 'rangers',
  name: 'Texas Rangers',
  homePark: 'Globe Life Field',
  chemistry: 'FIERY',
  primaryColor: '#003278',  // Blue
  secondaryColor: '#C0111F',  // Red
  rosterIds: [],
  leagueId: 'mlb-al'
};

export const ATHLETICS: TeamData = {
  id: 'athletics',
  name: 'Oakland Athletics',
  homePark: 'Oakland Coliseum',
  chemistry: 'CRAFTY',
  primaryColor: '#003831',  // Green
  secondaryColor: '#EFB21E',  // Gold
  rosterIds: [],
  leagueId: 'mlb-al'
};

// ============================================
// NL EAST
// ============================================

export const MARLINS: TeamData = {
  id: 'marlins',
  name: 'Florida Marlins',  // SMB4 uses historical name
  homePark: 'LoanDepot Park',
  chemistry: 'CRAFTY',
  primaryColor: '#00A3E0',  // Blue
  secondaryColor: '#EF3340',  // Red
  rosterIds: [],
  leagueId: 'mlb-nl'
};

export const EXPOS: TeamData = {
  id: 'expos',
  name: 'Montreal Expos',  // Historical team in SMB4
  homePark: 'Olympic Stadium',
  chemistry: 'SPIRITED',
  primaryColor: '#003087',  // Blue
  secondaryColor: '#E4002B',  // Red
  rosterIds: [],
  leagueId: 'mlb-nl'
};

export const PHILLIES: TeamData = {
  id: 'phillies',
  name: 'Philadelphia Phillies',
  homePark: 'Citizens Bank Park',
  chemistry: 'GRITTY',
  primaryColor: '#E81828',  // Red
  secondaryColor: '#002D72',  // Blue
  rosterIds: [],
  leagueId: 'mlb-nl'
};

export const METS: TeamData = {
  id: 'mets',
  name: 'New York Mets',
  homePark: 'Citi Field',
  chemistry: 'SPIRITED',
  primaryColor: '#002D72',  // Blue
  secondaryColor: '#FF5910',  // Orange
  rosterIds: [],
  leagueId: 'mlb-nl'
};

export const BRAVES: TeamData = {
  id: 'braves',
  name: 'Atlanta Braves',
  homePark: 'Truist Park',
  chemistry: 'SPIRITED',
  primaryColor: '#CE1141',  // Red
  secondaryColor: '#13274F',  // Navy
  rosterIds: [],
  leagueId: 'mlb-nl'
};

// ============================================
// NL CENTRAL
// ============================================

export const CARDINALS: TeamData = {
  id: 'cardinals',
  name: 'St. Louis Cardinals',
  homePark: 'Busch Stadium',
  chemistry: 'DISCIPLINED',
  primaryColor: '#C41E3A',  // Red
  secondaryColor: '#0C2340',  // Navy
  rosterIds: [],
  leagueId: 'mlb-nl'
};

export const REDS: TeamData = {
  id: 'reds',
  name: 'Cincinnati Reds',
  homePark: 'Great American Ball Park',
  chemistry: 'FIERY',
  primaryColor: '#C6011F',  // Red
  secondaryColor: '#000000',  // Black
  rosterIds: [],
  leagueId: 'mlb-nl'
};

export const BREWERS: TeamData = {
  id: 'brewers',
  name: 'Milwaukee Brewers',
  homePark: 'American Family Field',
  chemistry: 'GRITTY',
  primaryColor: '#12284B',  // Navy
  secondaryColor: '#B6922E',  // Gold
  rosterIds: [],
  leagueId: 'mlb-nl'
};

export const PIRATES: TeamData = {
  id: 'pirates',
  name: 'Pittsburgh Pirates',
  homePark: 'PNC Park',
  chemistry: 'GRITTY',
  primaryColor: '#27251F',  // Black
  secondaryColor: '#FDB827',  // Gold
  rosterIds: [],
  leagueId: 'mlb-nl'
};

export const CUBS: TeamData = {
  id: 'cubs',
  name: 'Chicago Cubs',
  homePark: 'Wrigley Field',
  chemistry: 'SPIRITED',
  primaryColor: '#0E3386',  // Blue
  secondaryColor: '#CC3433',  // Red
  rosterIds: [],
  leagueId: 'mlb-nl'
};

// ============================================
// NL WEST
// ============================================

export const PADRES: TeamData = {
  id: 'padres',
  name: 'San Diego Padres',
  homePark: 'Petco Park',
  chemistry: 'CRAFTY',
  primaryColor: '#2F241D',  // Brown
  secondaryColor: '#FFC425',  // Gold
  rosterIds: [],
  leagueId: 'mlb-nl'
};

export const DODGERS: TeamData = {
  id: 'dodgers',
  name: 'Los Angeles Dodgers',
  homePark: 'Dodger Stadium',
  chemistry: 'DISCIPLINED',
  primaryColor: '#005A9C',  // Blue
  secondaryColor: '#FFFFFF',  // White
  rosterIds: [],
  leagueId: 'mlb-nl'
};

export const DIAMONDBACKS: TeamData = {
  id: 'diamondbacks',
  name: 'Arizona Diamondbacks',
  homePark: 'Chase Field',
  chemistry: 'FIERY',
  primaryColor: '#A71930',  // Red
  secondaryColor: '#E3D4AD',  // Sand
  rosterIds: [],
  leagueId: 'mlb-nl'
};

export const ROCKIES: TeamData = {
  id: 'rockies',
  name: 'Colorado Rockies',
  homePark: 'Coors Field',
  chemistry: 'GRITTY',
  primaryColor: '#33006F',  // Purple
  secondaryColor: '#C4CED4',  // Silver
  rosterIds: [],
  leagueId: 'mlb-nl'
};

export const GIANTS: TeamData = {
  id: 'giants',
  name: 'San Francisco Giants',
  homePark: 'Oracle Park',
  chemistry: 'SPIRITED',
  primaryColor: '#FD5A1E',  // Orange
  secondaryColor: '#27251F',  // Black
  rosterIds: [],
  leagueId: 'mlb-nl'
};

// ============================================
// ALL MLB TEAMS
// ============================================

export const MLB_TEAMS: Record<string, TeamData> = {
  // AL East
  'blue-jays': BLUE_JAYS,
  'yankees': YANKEES,
  'orioles': ORIOLES,
  'rays': RAYS,
  'red-sox': RED_SOX,
  // AL Central
  'white-sox': WHITE_SOX,
  'twins': TWINS,
  'indians': INDIANS,
  'royals': ROYALS,
  'tigers': TIGERS,
  // AL West
  'mariners': MARINERS,
  'astros': ASTROS,
  'angels': ANGELS,
  'rangers': RANGERS,
  'athletics': ATHLETICS,
  // NL East
  'marlins': MARLINS,
  'expos': EXPOS,
  'phillies': PHILLIES,
  'mets': METS,
  'braves': BRAVES,
  // NL Central
  'cardinals': CARDINALS,
  'reds': REDS,
  'brewers': BREWERS,
  'pirates': PIRATES,
  'cubs': CUBS,
  // NL West
  'padres': PADRES,
  'dodgers': DODGERS,
  'diamondbacks': DIAMONDBACKS,
  'rockies': ROCKIES,
  'giants': GIANTS
};
