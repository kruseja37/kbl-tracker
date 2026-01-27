/**
 * Player and Team Database
 *
 * Contains master data for all players and teams, including ratings needed
 * for salary calculations per SALARY_SYSTEM_SPEC.md
 */

import type { Position, BatterHand } from '../types/game';

// ============================================
// TYPES
// ============================================

export type ThrowHand = 'L' | 'R';
export type Gender = 'M' | 'F';
export type Chemistry = 'SPIRITED' | 'CRAFTY' | 'DISCIPLINED' | 'FIERY' | 'GRITTY' | 'SCHOLARLY' | 'COMPETITIVE';
export type PlayerRole = 'STARTER' | 'BENCH' | 'ROTATION' | 'BULLPEN';
export type PitcherRole = 'SP' | 'RP' | 'CP' | 'SP/RP';

export interface BatterRatings {
  power: number;
  contact: number;
  speed: number;
  fielding: number;
  arm: number;
}

export interface PitcherRatings {
  velocity: number;
  junk: number;
  accuracy: number;
}

export interface PlayerTraits {
  trait1?: string;
  trait2?: string;
}

export interface PlayerData {
  id: string;
  name: string;
  teamId: string;

  // Demographics
  age: number;
  gender: Gender;
  bats: BatterHand;
  throws: ThrowHand;

  // Position info
  primaryPosition: Position;
  secondaryPosition?: Position;
  isPitcher: boolean;
  pitcherRole?: PitcherRole;  // SP, RP, CP, SP/RP
  role: PlayerRole;  // STARTER, BENCH, ROTATION, BULLPEN

  // Ratings (0-99 scale)
  overall: string;  // Letter grade: S, A+, A, A-, B+, B, B-, C+, C, C-, D+, D
  batterRatings?: BatterRatings;
  pitcherRatings?: PitcherRatings;

  // Chemistry and traits
  chemistry: string;  // SPI, DIS, CMP, SCH, CRA
  traits: PlayerTraits;

  // Arsenal (for pitchers) - pitch types they have
  arsenal?: string[];  // e.g., ['4F', '2F', 'CF', 'CB', 'SL', 'CH', 'FK']
}

export interface TeamData {
  id: string;
  name: string;
  homePark: string;
  chemistry: Chemistry;

  // Colors (for display)
  primaryColor: string;
  secondaryColor: string;

  // Roster
  rosterIds: string[];

  // League assignment (for DH rules)
  leagueId?: string;
}

// ============================================
// TEAM DATA
// ============================================

export const TEAMS: Record<string, TeamData> = {
  'sirloins': {
    id: 'sirloins',
    name: 'Sirloins',
    homePark: 'Apple Field',
    chemistry: 'SPIRITED',
    primaryColor: '#CC0000',  // Red
    secondaryColor: '#FFFFFF',  // White
    rosterIds: [
      // Starters
      'sir-plattune', 'sir-cook', 'sir-stanza', 'sir-longballo', 'sir-wiggins',
      'sir-hayata', 'sir-jones', 'sir-addonomus', 'sir-rush',
      // Bench
      'sir-tobo', 'sir-steeyle', 'sir-cortez', 'sir-balin',
      // Rotation
      'sir-kays', 'sir-snugs', 'sir-vanderwink', 'sir-niomo',
      // Bullpen
      'sir-seemerson', 'sir-dee', 'sir-duke', 'sir-digby', 'sir-zilla'
    ],
    leagueId: 'national'  // National League - pitchers bat (no DH)
  },
  'beewolves': {
    id: 'beewolves',
    name: 'Beewolves',
    homePark: 'Emerald Diamond',
    chemistry: 'CRAFTY',
    primaryColor: '#008B8B',  // Teal
    secondaryColor: '#FFD700',  // Yellow/Gold
    rosterIds: [
      // Starters
      'bee-torrens', 'bee-dexterez', 'bee-bigs', 'bee-kingman', 'bee-greene',
      'bee-moore', 'bee-banks', 'bee-leboink', 'bee-swanson',
      // Bench
      'bee-monstur', 'bee-knox', 'bee-balmer', 'bee-foster',
      // Rotation
      'bee-bender', 'bee-ortiz', 'bee-gipani', 'bee-levonn',
      // Bullpen
      'bee-pastimm', 'bee-balfour', 'bee-rushmore', 'bee-winder', 'bee-avery'
    ],
    leagueId: 'national'  // National League - pitchers bat (no DH)
  },
  'freebooters': {
    id: 'freebooters',
    name: 'Freebooters',
    homePark: 'Lafayette Corner',
    chemistry: 'SCHOLARLY',
    primaryColor: '#FF4500',  // Orange
    secondaryColor: '#000000',  // Black
    rosterIds: [
      // Starters
      'frb-brickhouse', 'frb-duchee', 'frb-stiffs', 'frb-jackman', 'frb-woodman',
      'frb-runs', 'frb-baskette', 'frb-evergreen', 'frb-raines',
      // Bench
      'frb-backstop', 'frb-fare', 'frb-brown', 'frb-quorn',
      // Rotation
      'frb-noelle', 'frb-diegez', 'frb-verde', 'frb-rhymes',
      // Bullpen
      'frb-ratherswell', 'frb-wisselle', 'frb-loopinovich', 'frb-mcpride', 'frb-frequin'
    ],
    leagueId: 'sml-super'
  },
  'herbisaurs': {
    id: 'herbisaurs',
    name: 'Herbisaurs',
    homePark: 'Parque Jardineros',
    chemistry: 'SPIRITED',
    primaryColor: '#228B22',  // Forest Green
    secondaryColor: '#FFA500',  // Orange
    rosterIds: [
      // Starters
      'hrb-stanberg', 'hrb-hampster', 'hrb-rojas', 'hrb-manly', 'hrb-blue',
      'hrb-sax', 'hrb-stewart', 'hrb-stokes', 'hrb-clark',
      // Bench
      'hrb-hanky', 'hrb-batsman', 'hrb-reeves', 'hrb-little',
      // Rotation
      'hrb-qualita', 'hrb-lukas', 'hrb-slakov', 'hrb-fuss',
      // Bullpen
      'hrb-slinger', 'hrb-filthwick', 'hrb-ramiro', 'hrb-chombo', 'hrb-rippin'
    ],
    leagueId: 'sml-super'
  },
  'moose': {
    id: 'moose',
    name: 'Moose',
    homePark: 'Stade Royale',
    chemistry: 'CRAFTY',
    primaryColor: '#4169E1',  // Royal Blue
    secondaryColor: '#FFD700',  // Gold
    rosterIds: [
      // Starters
      'moo-fast', 'moo-cannon', 'moo-silvio', 'moo-tolbert', 'moo-kattakar',
      'moo-carrol', 'moo-delfino', 'moo-saechao', 'moo-sakimura',
      // Bench
      'moo-smacks', 'moo-patton', 'moo-laboosh', 'moo-stoppard',
      // Rotation
      'moo-oakley', 'moo-gibbons', 'moo-naysmith', 'moo-pogi',
      // Bullpen
      'moo-paxton', 'moo-clangor', 'moo-chubb', 'moo-daye', 'moo-quetzalcoatl'
    ],
    leagueId: 'sml-super'
  },
  'wild-pigs': {
    id: 'wild-pigs',
    name: 'Wild Pigs',
    homePark: "Founder's Field",
    chemistry: 'CRAFTY',
    primaryColor: '#FF69B4',  // Hot Pink
    secondaryColor: '#000000',  // Black
    rosterIds: [
      // Starters
      'wpg-michaels', 'wpg-roper', 'wpg-hardman', 'wpg-wagnerd', 'wpg-evans',
      'wpg-moon', 'wpg-blings', 'wpg-battery', 'wpg-alba',
      // Bench
      'wpg-bacon', 'wpg-miles', 'wpg-goyo', 'wpg-storm',
      // Rotation
      'wpg-yogurt', 'wpg-lovell', 'wpg-holmes', 'wpg-smesson',
      // Bullpen
      'wpg-crackebarrel', 'wpg-drake', 'wpg-lantana', 'wpg-kerr', 'wpg-ospeciallo'
    ],
    leagueId: 'sml-super'
  },
  'hot-corners': {
    id: 'hot-corners',
    name: 'Hot Corners',
    homePark: 'Golden Field',
    chemistry: 'CRAFTY',
    primaryColor: '#FF0000',  // Red
    secondaryColor: '#FFD700',  // Gold
    rosterIds: [
      // Starters
      'htc-miyoshi', 'htc-rhubarb', 'htc-cooper', 'htc-backstrom', 'htc-seymour',
      'htc-peppers', 'htc-rodriguez', 'htc-rojo', 'htc-embers',
      // Bench
      'htc-burns', 'htc-blaze', 'htc-torch', 'htc-matchstick',
      // Rotation
      'htc-flame', 'htc-scorch', 'htc-inferno', 'htc-ember',
      // Bullpen
      'htc-sear', 'htc-blister', 'htc-smoke', 'htc-cinder', 'htc-ash'
    ],
    leagueId: 'sml-super'
  },
  'moonstars': {
    id: 'moonstars',
    name: 'Moonstars',
    homePark: 'Big Sky Park',
    chemistry: 'SPIRITED',
    primaryColor: '#87CEEB',  // Sky Blue
    secondaryColor: '#FFFFFF',  // White
    rosterIds: [
      // Starters
      'mns-culdesac', 'mns-luster', 'mns-woodrow', 'mns-weddums', 'mns-cosmos',
      'mns-stellar', 'mns-luna', 'mns-nova', 'mns-orbit',
      // Bench
      'mns-crater', 'mns-eclipse', 'mns-meteor', 'mns-comet',
      // Rotation
      'mns-pulsar', 'mns-nebula', 'mns-galaxy', 'mns-quasar',
      // Bullpen
      'mns-asteroid', 'mns-rocket', 'mns-saturn', 'mns-jupiter', 'mns-mars'
    ],
    leagueId: 'sml-super'
  },
  'blowfish': {
    id: 'blowfish',
    name: 'Blowfish',
    homePark: 'Swagger Center',
    chemistry: 'SPIRITED',
    primaryColor: '#00CED1',  // Dark Turquoise
    secondaryColor: '#FFFF00',  // Yellow
    rosterIds: [
      // Starters
      'blf-hill', 'blf-oowanga', 'blf-quan', 'blf-heater', 'blf-marshwater',
      'blf-puffer', 'blf-spike', 'blf-fin', 'blf-gill',
      // Bench
      'blf-bubble', 'blf-reef', 'blf-coral', 'blf-tide',
      // Rotation
      'blf-current', 'blf-wave', 'blf-splash', 'blf-spray',
      // Bullpen
      'blf-drift', 'blf-flow', 'blf-ripple', 'blf-surf', 'blf-swirl'
    ],
    leagueId: 'sml-super'
  },
  'sawteeth': {
    id: 'sawteeth',
    name: 'Sawteeth',
    homePark: 'El Viejo Stadium',
    chemistry: 'CRAFTY',
    primaryColor: '#8B0000',  // Dark Red
    secondaryColor: '#808080',  // Gray
    rosterIds: [
      // Starters
      'swt-nutmeg', 'swt-batts', 'swt-nopps', 'swt-meggles', 'swt-blade',
      'swt-timber', 'swt-splinter', 'swt-chisel', 'swt-wedge',
      // Bench
      'swt-plank', 'swt-lumber', 'swt-sawdust', 'swt-grain',
      // Rotation
      'swt-carpenter', 'swt-joiner', 'swt-mill', 'swt-lathe',
      // Bullpen
      'swt-router', 'swt-plane', 'swt-sander', 'swt-drill', 'swt-hammer'
    ],
    leagueId: 'sml-super'
  },
  'sand-cats': {
    id: 'sand-cats',
    name: 'Sand Cats',
    homePark: 'Sakura Hills',
    chemistry: 'DISCIPLINED',
    primaryColor: '#F5DEB3',  // Wheat/Tan
    secondaryColor: '#8B4513',  // Saddle Brown
    rosterIds: [
      // Starters
      'sct-brown', 'sct-kawaguchi', 'sct-sweet', 'sct-takabasei', 'sct-yago',
      'sct-dune', 'sct-oasis', 'sct-mirage', 'sct-sahara',
      // Bench
      'sct-cactus', 'sct-palm', 'sct-sphinx', 'sct-pyramid',
      // Rotation
      'sct-scorpion', 'sct-cobra', 'sct-viper', 'sct-mamba',
      // Bullpen
      'sct-sidewinder', 'sct-rattler', 'sct-asp', 'sct-adder', 'sct-copperhead'
    ],
    leagueId: 'sml-super'
  },
  'wideloads': {
    id: 'wideloads',
    name: 'Wideloads',
    homePark: 'The Corral',
    chemistry: 'SPIRITED',
    primaryColor: '#8B4513',  // Saddle Brown
    secondaryColor: '#FFD700',  // Gold
    rosterIds: [
      // Starters
      'wdl-donga', 'wdl-straus', 'wdl-roids', 'wdl-pops', 'wdl-throne',
      'wdl-haul', 'wdl-cargo', 'wdl-freight', 'wdl-trucker',
      // Bench
      'wdl-convoy', 'wdl-diesel', 'wdl-rig', 'wdl-tanker',
      // Rotation
      'wdl-highway', 'wdl-interstate', 'wdl-route', 'wdl-bypass',
      // Bullpen
      'wdl-overpass', 'wdl-junction', 'wdl-merge', 'wdl-exit', 'wdl-ramp'
    ],
    leagueId: 'sml-super'
  },
  'platypi': {
    id: 'platypi',
    name: 'Platypi',
    homePark: 'Colonial Plaza',
    chemistry: 'CRAFTY',
    primaryColor: '#800020',  // Burgundy
    secondaryColor: '#FFD700',  // Gold
    rosterIds: [
      // Starters
      'ply-kauffman', 'ply-cartman', 'ply-rodriguez', 'ply-hand', 'ply-indiere',
      'ply-sharp', 'ply-bill', 'ply-webfoot', 'ply-paddle',
      // Bench
      'ply-venomous', 'ply-snout', 'ply-beaver', 'ply-tail',
      // Rotation
      'ply-burrow', 'ply-stream', 'ply-creek', 'ply-pond',
      // Bullpen
      'ply-marsh', 'ply-wetland', 'ply-swamp', 'ply-bog', 'ply-fen'
    ],
    leagueId: 'sml-super'
  },
  'grapplers': {
    id: 'grapplers',
    name: 'Grapplers',
    homePark: 'Bingata Bowl',
    chemistry: 'CRAFTY',
    primaryColor: '#FF4500',  // Orange-Red
    secondaryColor: '#008B8B',  // Teal
    rosterIds: [
      // Starters
      'grp-finderre', 'grp-moore', 'grp-nopps', 'grp-overro', 'grp-meggles',
      'grp-tentacle', 'grp-sucker', 'grp-ink', 'grp-kraken',
      // Bench
      'grp-squid', 'grp-cuttlefish', 'grp-nautilus', 'grp-mollusk',
      // Rotation
      'grp-depth', 'grp-abyss', 'grp-trench', 'grp-fathom',
      // Bullpen
      'grp-pressure', 'grp-brine', 'grp-kelp', 'grp-seaweed', 'grp-coral'
    ],
    leagueId: 'sml-super'
  },
  'heaters': {
    id: 'heaters',
    name: 'Heaters',
    homePark: 'Red Rock Park',
    chemistry: 'CRAFTY',
    primaryColor: '#FF4500',  // Orange-Red
    secondaryColor: '#000000',  // Black
    rosterIds: [
      // Starters
      'htr-rags', 'htr-digman', 'htr-garcia', 'htr-smoke', 'htr-cashmore',
      'htr-delano', 'htr-blaze', 'htr-inferno', 'htr-furnace',
      // Bench
      'htr-ember', 'htr-spark', 'htr-flame', 'htr-coal',
      // Rotation
      'htr-volcano', 'htr-lava', 'htr-magma', 'htr-cinder',
      // Bullpen
      'htr-ash', 'htr-soot', 'htr-smoke2', 'htr-char', 'htr-scorch'
    ],
    leagueId: 'sml-super'
  },
  'overdogs': {
    id: 'overdogs',
    name: 'Overdogs',
    homePark: 'Motor Yard',
    chemistry: 'CRAFTY',
    primaryColor: '#4169E1',  // Royal Blue
    secondaryColor: '#C0C0C0',  // Silver
    rosterIds: [
      // Starters
      'ovd-song', 'ovd-horne', 'ovd-emyn', 'ovd-victorino', 'ovd-wayward',
      'ovd-kim', 'ovd-alpha', 'ovd-omega', 'ovd-prime',
      // Bench
      'ovd-elite', 'ovd-supreme', 'ovd-ultra', 'ovd-mega',
      // Rotation
      'ovd-titan', 'ovd-colossus', 'ovd-giant', 'ovd-goliath',
      // Bullpen
      'ovd-mammoth', 'ovd-behemoth', 'ovd-leviathan', 'ovd-juggernaut', 'ovd-hercules'
    ],
    leagueId: 'sml-super'
  },
  'buzzards': {
    id: 'buzzards',
    name: 'Buzzards',
    homePark: 'Shaka Sports Turf',
    chemistry: 'COMPETITIVE',
    primaryColor: '#006400',  // Dark Green
    secondaryColor: '#FFD700',  // Gold
    rosterIds: [
      // Starters
      'bzd-bunterson', 'bzd-bigsby', 'bzd-colt', 'bzd-often', 'bzd-mustaccio',
      'bzd-trunk', 'bzd-yoshida', 'bzd-borgnar', 'bzd-whoopity',
      // Bench
      'bzd-bronx', 'bzd-idoya', 'bzd-slamous', 'bzd-mckinny',
      // Rotation
      'bzd-patterson', 'bzd-bubbkins', 'bzd-elwood', 'bzd-hogswind',
      // Bullpen
      'bzd-bowler', 'bzd-morrow', 'bzd-texis', 'bzd-commonly', 'bzd-buckberger'
    ],
    leagueId: 'sml-super'
  },
  'crocodons': {
    id: 'crocodons',
    name: 'Crocodons',
    homePark: "Whacker's Wheel",
    chemistry: 'CRAFTY',
    primaryColor: '#006400',  // Dark Green
    secondaryColor: '#FFFFFF',  // White
    rosterIds: [
      // Starters
      'crc-drive', 'crc-candela', 'crc-lionerre', 'crc-fenomeno', 'crc-thurd',
      'crc-vortex', 'crc-fruitwell', 'crc-hernandez', 'crc-chukov',
      // Bench
      'crc-woodburn', 'crc-lee', 'crc-pickle', 'crc-blastman', 'crc-kane',
      // Rotation
      'crc-pulo', 'crc-brick', 'crc-kapps', 'crc-paul',
      // Bullpen
      'crc-ano', 'crc-mayfair', 'crc-dabaziz', 'crc-mcfarland'
    ],
    leagueId: 'sml-super'
  },
  'nemesis': {
    id: 'nemesis',
    name: 'Nemesis',
    homePark: 'Tiger Den',
    chemistry: 'COMPETITIVE',
    primaryColor: '#4B0082',  // Indigo/Purple
    secondaryColor: '#FFFFFF',  // White
    rosterIds: [
      // Starters
      'nem-yatter', 'nem-sports', 'nem-taters', 'nem-slam', 'nem-moonshota',
      'nem-hautier', 'nem-staples', 'nem-pickleford', 'nem-ganez',
      // Bench
      'nem-aoshima', 'nem-leathar', 'nem-zoner', 'nem-dangerfield',
      // Rotation
      'nem-carouse', 'nem-mabettes', 'nem-harbourmouth', 'nem-stacker',
      // Bullpen
      'nem-marshmallow', 'nem-stevens', 'nem-finnegans', 'nem-walkman', 'nem-wimple'
    ],
    leagueId: 'sml-super'
  },
  'jacks': {
    id: 'jacks',
    name: 'Jacks',
    homePark: 'Battery Bay',
    chemistry: 'SCHOLARLY',
    primaryColor: '#FFFFFF',  // White
    secondaryColor: '#FFD700',  // Gold
    rosterIds: [
      // Starters
      'jck-cracker', 'jck-dazzler', 'jck-buffler', 'jck-jackson', 'jck-yamamoto',
      'jck-wilson', 'jck-upton', 'jck-freely', 'jck-lift',
      // Bench
      'jck-cormen', 'jck-adamo', 'jck-glover', 'jck-sparks',
      // Rotation
      'jck-oh', 'jck-roberto', 'jck-mietballe', 'jck-ozone',
      // Bullpen
      'jck-gripowski', 'jck-spectaculo', 'jck-munstar', 'jck-musharra', 'jck-lapada'
    ],
    leagueId: 'sml-super'
  },
  // Free Agent Pool (not a real team)
  'free-agent': {
    id: 'free-agent',
    name: 'Free Agents',
    homePark: '',
    chemistry: 'COMPETITIVE',
    primaryColor: '#808080',  // Gray
    secondaryColor: '#FFFFFF',
    rosterIds: [],  // Populated dynamically
    leagueId: ''
  }
};

// ============================================
// PLAYER DATA
// ============================================

export const PLAYERS: Record<string, PlayerData> = {
  // ==========================================
  // SIRLOINS - POSITION PLAYERS (Starters)
  // ==========================================
  'sir-plattune': {
    id: 'sir-plattune',
    name: 'Boomer Plattune',
    teamId: 'sirloins',
    age: 34,
    gender: 'M',
    bats: 'S',
    throws: 'R',
    primaryPosition: '3B',
    secondaryPosition: '2B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 70, contact: 54, speed: 54, fielding: 41, arm: 80 },
    chemistry: 'SPI',
    traits: {}
  },
  'sir-cook': {
    id: 'sir-cook',
    name: 'Lloyd Cook',
    teamId: 'sirloins',
    age: 32,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: '2B',
    secondaryPosition: '3B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'A-',
    batterRatings: { power: 80, contact: 52, speed: 83, fielding: 72, arm: 33 },
    chemistry: 'SPI',
    traits: { trait1: 'High Pitch' }
  },
  'sir-stanza': {
    id: 'sir-stanza',
    name: 'Kat Stanza',
    teamId: 'sirloins',
    age: 31,
    gender: 'F',
    bats: 'L',
    throws: 'R',
    primaryPosition: '1B',
    secondaryPosition: 'C',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 90, contact: 71, speed: 58, fielding: 42, arm: 65 },
    chemistry: 'DIS',
    traits: {}
  },
  'sir-longballo': {
    id: 'sir-longballo',
    name: 'Hammer Longballo',
    teamId: 'sirloins',
    age: 29,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'RF',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'A+',
    batterRatings: { power: 99, contact: 78, speed: 60, fielding: 58, arm: 75 },
    chemistry: 'CMP',
    traits: { trait1: 'POW vs RHP', trait2: 'Fastball Hitter' }
  },
  'sir-wiggins': {
    id: 'sir-wiggins',
    name: 'Willard Wiggins',
    teamId: 'sirloins',
    age: 21,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'SS',
    secondaryPosition: '2B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 66, contact: 50, speed: 64, fielding: 46, arm: 68 },
    chemistry: 'CMP',
    traits: { trait1: 'RBI Hero', trait2: 'Dive Wizard' }
  },
  'sir-hayata': {
    id: 'sir-hayata',
    name: 'Madoka Hayata',
    teamId: 'sirloins',
    age: 36,
    gender: 'F',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'DH',
    secondaryPosition: 'SS',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 48, contact: 84, speed: 97, fielding: 43, arm: 45 },
    chemistry: 'SCH',
    traits: { trait1: 'Wild Thrower', trait2: 'Noodle Arm' }
  },
  'sir-jones': {
    id: 'sir-jones',
    name: 'Filet Jones',
    teamId: 'sirloins',
    age: 20,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'LF',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'C+',
    batterRatings: { power: 97, contact: 41, speed: 44, fielding: 55, arm: 25 },
    chemistry: 'SPI',
    traits: {}
  },
  'sir-addonomus': {
    id: 'sir-addonomus',
    name: 'Preston Addonomus',
    teamId: 'sirloins',
    age: 37,
    gender: 'M',
    bats: 'S',
    throws: 'R',
    primaryPosition: 'C',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 84, contact: 19, speed: 48, fielding: 64, arm: 69 },
    chemistry: 'SPI',
    traits: {}
  },
  'sir-rush': {
    id: 'sir-rush',
    name: 'Damien Rush',
    teamId: 'sirloins',
    age: 31,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'CF',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 89, contact: 12, speed: 93, fielding: 57, arm: 70 },
    chemistry: 'SCH',
    traits: { trait1: 'Sprinter', trait2: 'Magic Hands' }
  },

  // ==========================================
  // SIRLOINS - BENCH
  // ==========================================
  'sir-tobo': {
    id: 'sir-tobo',
    name: 'Momo Tobo',
    teamId: 'sirloins',
    age: 29,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'C',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C+',
    batterRatings: { power: 50, contact: 48, speed: 37, fielding: 70, arm: 80 },
    chemistry: 'SCH',
    traits: {}
  },
  'sir-steeyle': {
    id: 'sir-steeyle',
    name: 'Mick Steeyle',
    teamId: 'sirloins',
    age: 27,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: '1B',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C',
    batterRatings: { power: 84, contact: 35, speed: 45, fielding: 28, arm: 21 },
    chemistry: 'SPI',
    traits: { trait1: 'Pinch Perfect' }
  },
  'sir-cortez': {
    id: 'sir-cortez',
    name: 'Javier Cortez',
    teamId: 'sirloins',
    age: 27,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'LF',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C+',
    batterRatings: { power: 65, contact: 32, speed: 46, fielding: 44, arm: 64 },
    chemistry: 'SCH',
    traits: { trait1: 'Stealer' }
  },
  'sir-balin': {
    id: 'sir-balin',
    name: 'Tish Balin',
    teamId: 'sirloins',
    age: 22,
    gender: 'F',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'CF',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C+',
    batterRatings: { power: 58, contact: 33, speed: 68, fielding: 70, arm: 90 },
    chemistry: 'DIS',
    traits: { trait1: 'Utility' }
  },

  // ==========================================
  // SIRLOINS - ROTATION (Starting Pitchers)
  // ==========================================
  'sir-kays': {
    id: 'sir-kays',
    name: 'Manny Kays',
    teamId: 'sirloins',
    age: 25,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'A+',
    pitcherRatings: { velocity: 75, junk: 88, accuracy: 77 },
    batterRatings: { power: 11, contact: 2, speed: 67, fielding: 88, arm: 0 },
    chemistry: 'DIS',
    traits: { trait1: 'Elite 2F' },
    arsenal: ['4F', '2F', 'CF', 'SL']
  },
  'sir-snugs': {
    id: 'sir-snugs',
    name: 'Bugsy Snugs',
    teamId: 'sirloins',
    age: 31,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B+',
    pitcherRatings: { velocity: 77, junk: 64, accuracy: 64 },
    batterRatings: { power: 18, contact: 6, speed: 15, fielding: 37, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'BB Prone' },
    arsenal: ['4F', '2F', 'CF', 'SL']
  },
  'sir-vanderwink': {
    id: 'sir-vanderwink',
    name: "Slip Van'Derwink",
    teamId: 'sirloins',
    age: 30,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B+',
    pitcherRatings: { velocity: 60, junk: 76, accuracy: 71 },
    batterRatings: { power: 44, contact: 2, speed: 14, fielding: 46, arm: 0 },
    chemistry: 'CMP',
    traits: { trait1: 'Easy Jumps' },
    arsenal: ['4F', 'CB', 'SL', 'CH', 'FK']
  },
  'sir-niomo': {
    id: 'sir-niomo',
    name: 'Kayo Niomo',
    teamId: 'sirloins',
    age: 38,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B',
    pitcherRatings: { velocity: 70, junk: 49, accuracy: 54 },
    batterRatings: { power: 6, contact: 1, speed: 73, fielding: 60, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Pick Officer' },
    arsenal: ['4F', 'CB', 'SL', 'CH']
  },

  // ==========================================
  // SIRLOINS - BULLPEN (Relief Pitchers)
  // ==========================================
  'sir-seemerson': {
    id: 'sir-seemerson',
    name: 'Split Seemerson',
    teamId: 'sirloins',
    age: 21,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP/RP',
    role: 'BULLPEN',
    overall: 'C+',
    pitcherRatings: { velocity: 35, junk: 65, accuracy: 55 },
    batterRatings: { power: 15, contact: 9, speed: 8, fielding: 51, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Elite FK', trait2: 'Injury Prone' },
    arsenal: ['4F', 'SB', 'CH', 'FK']
  },
  'sir-dee': {
    id: 'sir-dee',
    name: 'Shay Dee',
    teamId: 'sirloins',
    age: 31,
    gender: 'F',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'A',
    pitcherRatings: { velocity: 84, junk: 5, accuracy: 95 },
    batterRatings: { power: 29, contact: 17, speed: 32, fielding: 94, arm: 0 },
    chemistry: 'CRA',
    traits: { trait1: 'Falls Behind', trait2: 'Stimulated' },
    arsenal: ['4F', 'CF', 'CH']
  },
  'sir-duke': {
    id: 'sir-duke',
    name: 'Miguel Duke',
    teamId: 'sirloins',
    age: 29,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'C',
    pitcherRatings: { velocity: 30, junk: 86, accuracy: 18 },
    batterRatings: { power: 9, contact: 13, speed: 47, fielding: 89, arm: 0 },
    chemistry: 'CMP',
    traits: {},
    arsenal: ['4F', 'CB', 'SL']
  },
  'sir-digby': {
    id: 'sir-digby',
    name: 'Linus Digby',
    teamId: 'sirloins',
    age: 27,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'C',
    pitcherRatings: { velocity: 50, junk: 55, accuracy: 19 },
    batterRatings: { power: 21, contact: 6, speed: 54, fielding: 89, arm: 0 },
    chemistry: 'CMP',
    traits: {},
    arsenal: ['4F', 'CB', 'SL', 'CH']
  },
  'sir-zilla': {
    id: 'sir-zilla',
    name: 'Franz Zilla',
    teamId: 'sirloins',
    age: 32,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'CP',
    role: 'BULLPEN',
    overall: 'C+',
    pitcherRatings: { velocity: 85, junk: 37, accuracy: 25 },
    batterRatings: { power: 5, contact: 2, speed: 19, fielding: 58, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'K Collector' },
    arsenal: ['4F', 'SL']
  },

  // ==========================================
  // BEEWOLVES - POSITION PLAYERS (Starters)
  // ==========================================
  'bee-torrens': {
    id: 'bee-torrens',
    name: 'Gina Torrens',
    teamId: 'beewolves',
    age: 36,
    gender: 'F',
    bats: 'L',
    throws: 'R',
    primaryPosition: '2B',
    secondaryPosition: 'SS',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 25, contact: 87, speed: 91, fielding: 80, arm: 20 },
    chemistry: 'CRA',
    traits: { trait1: 'POW vs RHP', trait2: 'Butter Fingers' }
  },
  'bee-dexterez': {
    id: 'bee-dexterez',
    name: 'Handley Dexterez',
    teamId: 'beewolves',
    age: 29,
    gender: 'M',
    bats: 'S',
    throws: 'R',
    primaryPosition: 'SS',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'S',
    batterRatings: { power: 63, contact: 87, speed: 87, fielding: 97, arm: 74 },
    chemistry: 'SPI',
    traits: { trait1: 'Utility', trait2: 'Fastball Hitter' }
  },
  'bee-bigs': {
    id: 'bee-bigs',
    name: 'Buster Bigs',
    teamId: 'beewolves',
    age: 31,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'LF',
    secondaryPosition: 'C',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 74, contact: 87, speed: 77, fielding: 44, arm: 40 },
    chemistry: 'SCH',
    traits: { trait1: 'Base Jogger' }
  },
  'bee-kingman': {
    id: 'bee-kingman',
    name: 'Kobe Kingman',
    teamId: 'beewolves',
    age: 31,
    gender: 'M',
    bats: 'S',
    throws: 'R',
    primaryPosition: '1B',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 95, contact: 27, speed: 59, fielding: 68, arm: 62 },
    chemistry: 'CMP',
    traits: {}
  },
  'bee-greene': {
    id: 'bee-greene',
    name: 'Ruby Greene',
    teamId: 'beewolves',
    age: 26,
    gender: 'F',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'DH',
    secondaryPosition: '3B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 54, contact: 40, speed: 87, fielding: 54, arm: 18 },
    chemistry: 'SPI',
    traits: { trait1: 'Mind Gamer' }
  },
  'bee-moore': {
    id: 'bee-moore',
    name: 'Magic Moore',
    teamId: 'beewolves',
    age: 22,
    gender: 'M',
    bats: 'S',
    throws: 'L',
    primaryPosition: 'CF',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 54, contact: 40, speed: 87, fielding: 68, arm: 66 },
    chemistry: 'SPI',
    traits: {}
  },
  'bee-banks': {
    id: 'bee-banks',
    name: 'Bertha Banks',
    teamId: 'beewolves',
    age: 29,
    gender: 'F',
    bats: 'L',
    throws: 'R',
    primaryPosition: '3B',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 54, contact: 74, speed: 74, fielding: 28, arm: 73 },
    chemistry: 'SCH',
    traits: { trait1: 'Big Hack', trait2: 'Slow Poke' }
  },
  'bee-leboink': {
    id: 'bee-leboink',
    name: 'Billy LeBoink',
    teamId: 'beewolves',
    age: 32,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'RF',
    secondaryPosition: 'LF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 54, contact: 74, speed: 28, fielding: 73, arm: 97 },
    chemistry: 'CMP',
    traits: {}
  },
  'bee-swanson': {
    id: 'bee-swanson',
    name: 'Johnson Swanson',
    teamId: 'beewolves',
    age: 31,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'C',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 62, contact: 43, speed: 72, fielding: 73, arm: 64 },
    chemistry: 'SPI',
    traits: { trait1: 'Little Hack' }
  },

  // ==========================================
  // BEEWOLVES - BENCH
  // ==========================================
  'bee-monstur': {
    id: 'bee-monstur',
    name: 'Steve Monstur',
    teamId: 'beewolves',
    age: 32,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'C',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'BENCH',
    overall: 'B-',
    batterRatings: { power: 45, contact: 54, speed: 95, fielding: 43, arm: 54 },
    chemistry: 'CRA',
    traits: { trait1: 'First Pitch Slayer' }
  },
  'bee-knox': {
    id: 'bee-knox',
    name: 'Freddie Knox',
    teamId: 'beewolves',
    age: 38,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '2B',
    isPitcher: false,
    role: 'BENCH',
    overall: 'B-',
    batterRatings: { power: 23, contact: 81, speed: 95, fielding: 43, arm: 56 },
    chemistry: 'SPI',
    traits: { trait1: 'Bad Ball Hitter' }
  },
  'bee-balmer': {
    id: 'bee-balmer',
    name: 'Benny Balmer',
    teamId: 'beewolves',
    age: 29,
    gender: 'M',
    bats: 'S',
    throws: 'L',
    primaryPosition: 'LF',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C+',
    batterRatings: { power: 32, contact: 40, speed: 58, fielding: 89, arm: 84 },
    chemistry: 'CRA',
    traits: { trait1: 'Clutch' }
  },
  'bee-foster': {
    id: 'bee-foster',
    name: 'Poke Foster',
    teamId: 'beewolves',
    age: 24,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'RF',
    secondaryPosition: 'CF',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C',
    batterRatings: { power: 25, contact: 76, speed: 24, fielding: 68, arm: 66 },
    chemistry: 'SPI',
    traits: { trait1: 'Bunter' }
  },

  // ==========================================
  // BEEWOLVES - ROTATION (Starting Pitchers)
  // ==========================================
  'bee-bender': {
    id: 'bee-bender',
    name: 'Hurley Bender',
    teamId: 'beewolves',
    age: 23,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'S',
    pitcherRatings: { velocity: 73, junk: 99, accuracy: 86 },
    batterRatings: { power: 4, contact: 7, speed: 65, fielding: 70, arm: 0 },
    chemistry: 'DIS',
    traits: { trait1: 'Elite CB' },
    arsenal: ['4F', '2F', 'CF', 'CB', 'SL']
  },
  'bee-ortiz': {
    id: 'bee-ortiz',
    name: 'Bevis Ortiz',
    teamId: 'beewolves',
    age: 28,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B+',
    pitcherRatings: { velocity: 63, junk: 66, accuracy: 63 },
    batterRatings: { power: 4, contact: 7, speed: 65, fielding: 70, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Elite FK' },
    arsenal: ['4F', 'CB', 'SL', 'FK']
  },
  'bee-gipani': {
    id: 'bee-gipani',
    name: 'Fran Gipani',
    teamId: 'beewolves',
    age: 37,
    gender: 'F',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B',
    pitcherRatings: { velocity: 66, junk: 54, accuracy: 98 },
    batterRatings: { power: 2, contact: 38, speed: 35, fielding: 98, arm: 0 },
    chemistry: 'DIS',
    traits: { trait1: 'Elite 2F', trait2: 'Volatile' },
    arsenal: ['4F', '2F', 'CB', 'SL', 'CH']
  },
  'bee-levonn': {
    id: 'bee-levonn',
    name: 'Deshaun Levonn',
    teamId: 'beewolves',
    age: 28,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'C+',
    pitcherRatings: { velocity: 42, junk: 41, accuracy: 68 },
    batterRatings: { power: 54, contact: 24, speed: 5, fielding: 60, arm: 0 },
    chemistry: 'SCH',
    traits: {},
    arsenal: ['4F', '2F', 'SL', 'CH']
  },

  // ==========================================
  // BEEWOLVES - BULLPEN (Relief Pitchers)
  // ==========================================
  'bee-pastimm': {
    id: 'bee-pastimm',
    name: 'Buzz Pastimm',
    teamId: 'beewolves',
    age: 31,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP/RP',
    role: 'BULLPEN',
    overall: 'B+',
    pitcherRatings: { velocity: 87, junk: 29, accuracy: 65 },
    batterRatings: { power: 14, contact: 26, speed: 5, fielding: 54, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Specialist', trait2: 'Elite 4F' },
    arsenal: ['4F', '2F', 'SB', 'CH']
  },
  'bee-balfour': {
    id: 'bee-balfour',
    name: 'Tatts Balfour',
    teamId: 'beewolves',
    age: 37,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'C+',
    pitcherRatings: { velocity: 49, junk: 64, accuracy: 40 },
    batterRatings: { power: 2, contact: 13, speed: 41, fielding: 90, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'BB Prone' },
    arsenal: ['4F', 'CB', 'SL']
  },
  'bee-rushmore': {
    id: 'bee-rushmore',
    name: 'Benson Rushmore',
    teamId: 'beewolves',
    age: 26,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'C+',
    pitcherRatings: { velocity: 62, junk: 59, accuracy: 31 },
    batterRatings: { power: 25, contact: 8, speed: 8, fielding: 89, arm: 0 },
    chemistry: 'CRA',
    traits: {},
    arsenal: ['4F', '2F', 'CB', 'SL']
  },
  'bee-winder': {
    id: 'bee-winder',
    name: 'Dusty Winder',
    teamId: 'beewolves',
    age: 28,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'C+',
    pitcherRatings: { velocity: 62, junk: 42, accuracy: 46 },
    batterRatings: { power: 12, contact: 3, speed: 13, fielding: 76, arm: 0 },
    chemistry: 'SCH',
    traits: {},
    arsenal: ['4F', 'CB', 'CH']
  },
  'bee-avery': {
    id: 'bee-avery',
    name: 'Smack Avery',
    teamId: 'beewolves',
    age: 20,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'CP',
    role: 'BULLPEN',
    overall: 'C+',
    pitcherRatings: { velocity: 72, junk: 36, accuracy: 40 },
    batterRatings: { power: 3, contact: 4, speed: 19, fielding: 80, arm: 0 },
    chemistry: 'DIS',
    traits: { trait1: 'K Collector' },
    arsenal: ['4F', 'CB']
  },

  // ==========================================
  // FREEBOOTERS - POSITION PLAYERS (Starters)
  // ==========================================
  'frb-brickhouse': {
    id: 'frb-brickhouse',
    name: 'Stockton Brickhouse',
    teamId: 'freebooters',
    age: 24,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'CF',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 76, contact: 94, speed: 53, fielding: 27, arm: 49 },
    chemistry: 'SCH',
    traits: { trait1: 'Ace Exterminator' }
  },
  'frb-duchee': {
    id: 'frb-duchee',
    name: 'Pomp Duchee',
    teamId: 'freebooters',
    age: 21,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '1B',
    secondaryPosition: '3B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 81, contact: 42, speed: 87, fielding: 54, arm: 65 },
    chemistry: 'CRA',
    traits: { trait1: 'Base Jogger', trait2: 'Sign Stealer' }
  },
  'frb-stiffs': {
    id: 'frb-stiffs',
    name: 'Oakley Stiffs',
    teamId: 'freebooters',
    age: 37,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'RF',
    secondaryPosition: 'LF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 87, contact: 43, speed: 29, fielding: 80, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'CON vs RHP', trait2: 'Bad Ball Hitter' }
  },
  'frb-jackman': {
    id: 'frb-jackman',
    name: 'Gunns Jackman',
    teamId: 'freebooters',
    age: 32,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'SS',
    secondaryPosition: '2B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'A-',
    batterRatings: { power: 93, contact: 84, speed: 47, fielding: 46, arm: 54 },
    chemistry: 'CMP',
    traits: { trait1: 'RBI Hero', trait2: 'Consistent' }
  },
  'frb-woodman': {
    id: 'frb-woodman',
    name: 'Sturdy Woodman',
    teamId: 'freebooters',
    age: 38,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 63, contact: 84, speed: 39, fielding: 89, arm: 38 },
    chemistry: 'DIS',
    traits: { trait1: 'Durable' }
  },
  'frb-runs': {
    id: 'frb-runs',
    name: 'Walker Runs',
    teamId: 'freebooters',
    age: 20,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '2B',
    secondaryPosition: 'SS',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 46, contact: 55, speed: 88, fielding: 48, arm: 72 },
    chemistry: 'CMP',
    traits: { trait1: 'Rally Starter' }
  },
  'frb-baskette': {
    id: 'frb-baskette',
    name: 'Kache Baskette',
    teamId: 'freebooters',
    age: 22,
    gender: 'F',
    bats: 'S',
    throws: 'R',
    primaryPosition: 'LF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 38, contact: 88, speed: 82, fielding: 72, arm: 0 },
    chemistry: 'CMP',
    traits: { trait1: 'POW vs LHP', trait2: 'CON vs LHP' }
  },
  'frb-evergreen': {
    id: 'frb-evergreen',
    name: 'Patience Evergreen',
    teamId: 'freebooters',
    age: 27,
    gender: 'F',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'LF',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 53, contact: 79, speed: 52, fielding: 92, arm: 45 },
    chemistry: 'DIS',
    traits: { trait1: 'First Pitch Prayer' }
  },
  'frb-raines': {
    id: 'frb-raines',
    name: 'Jermaine Raines',
    teamId: 'freebooters',
    age: 29,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'C',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'C+',
    batterRatings: { power: 41, contact: 69, speed: 16, fielding: 79, arm: 53 },
    chemistry: 'CMP',
    traits: { trait1: 'First Pitch Slayer' }
  },

  // ==========================================
  // FREEBOOTERS - BENCH
  // ==========================================
  'frb-backstop': {
    id: 'frb-backstop',
    name: 'Rocky Backstop',
    teamId: 'freebooters',
    age: 29,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'C',
    secondaryPosition: '3B',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C',
    batterRatings: { power: 24, contact: 85, speed: 46, fielding: 11, arm: 17 },
    chemistry: 'SPI',
    traits: {}
  },
  'frb-fare': {
    id: 'frb-fare',
    name: 'Landon Fare',
    teamId: 'freebooters',
    age: 28,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '2B',
    secondaryPosition: 'SS',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C',
    batterRatings: { power: 44, contact: 42, speed: 49, fielding: 67, arm: 55 },
    chemistry: 'SPI',
    traits: { trait1: 'Pinch Perfect' }
  },
  'frb-brown': {
    id: 'frb-brown',
    name: 'Badhop Brown',
    teamId: 'freebooters',
    age: 26,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '3B',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C',
    batterRatings: { power: 57, contact: 83, speed: 20, fielding: 12, arm: 34 },
    chemistry: 'SPI',
    traits: { trait1: 'Butter Fingers' }
  },
  'frb-quorn': {
    id: 'frb-quorn',
    name: 'Kenna Quorn',
    teamId: 'freebooters',
    age: 31,
    gender: 'F',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'RF',
    secondaryPosition: 'C',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C',
    batterRatings: { power: 52, contact: 26, speed: 65, fielding: 92, arm: 68 },
    chemistry: 'CRA',
    traits: { trait1: 'Sprinter' }
  },

  // ==========================================
  // FREEBOOTERS - ROTATION (Starting Pitchers)
  // ==========================================
  'frb-noelle': {
    id: 'frb-noelle',
    name: 'Winnie Noelle',
    teamId: 'freebooters',
    age: 31,
    gender: 'F',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'A-',
    pitcherRatings: { velocity: 77, junk: 64, accuracy: 70 },
    batterRatings: { power: 4, contact: 27, speed: 17, fielding: 94, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Workhorse' },
    arsenal: ['4F', '2F', 'SL', 'CB']
  },
  'frb-diegez': {
    id: 'frb-diegez',
    name: 'Nic Diegez',
    teamId: 'freebooters',
    age: 25,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'A-',
    pitcherRatings: { velocity: 60, junk: 58, accuracy: 90 },
    batterRatings: { power: 5, contact: 16, speed: 11, fielding: 54, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Composed' },
    arsenal: ['4F', 'CF', 'CB', 'SL']
  },
  'frb-verde': {
    id: 'frb-verde',
    name: 'Angel Verde',
    teamId: 'freebooters',
    age: 21,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B+',
    pitcherRatings: { velocity: 64, junk: 59, accuracy: 84 },
    batterRatings: { power: 3, contact: 19, speed: 13, fielding: 67, arm: 0 },
    chemistry: 'DIS',
    traits: {},
    arsenal: ['4F', 'CF', 'CB', 'SL']
  },
  'frb-rhymes': {
    id: 'frb-rhymes',
    name: 'Lana Rhymes',
    teamId: 'freebooters',
    age: 31,
    gender: 'F',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'C',
    pitcherRatings: { velocity: 90, junk: 5, accuracy: 46 },
    batterRatings: { power: 0, contact: 29, speed: 5, fielding: 46, arm: 0 },
    chemistry: 'DIS',
    traits: { trait1: 'Surrounded' },
    arsenal: ['4F', '2F']
  },

  // ==========================================
  // FREEBOOTERS - BULLPEN (Relief Pitchers)
  // ==========================================
  'frb-ratherswell': {
    id: 'frb-ratherswell',
    name: 'Kent Ratherswell',
    teamId: 'freebooters',
    age: 29,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP/RP',
    role: 'BULLPEN',
    overall: 'B+',
    pitcherRatings: { velocity: 35, junk: 60, accuracy: 74 },
    batterRatings: { power: 1, contact: 13, speed: 37, fielding: 16, arm: 0 },
    chemistry: 'CRA',
    traits: { trait1: 'Metal Head' },
    arsenal: ['4F', 'CB', 'SL', 'CH', 'FK']
  },
  'frb-wisselle': {
    id: 'frb-wisselle',
    name: 'Steamboat Wisselle',
    teamId: 'freebooters',
    age: 28,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'A',
    pitcherRatings: { velocity: 86, junk: 79, accuracy: 62 },
    batterRatings: { power: 2, contact: 12, speed: 33, fielding: 32, arm: 0 },
    chemistry: 'CMP',
    traits: { trait1: 'Gets Ahead', trait2: 'Elite 4F' },
    arsenal: ['4F', 'CF', 'CB']
  },
  'frb-loopinovich': {
    id: 'frb-loopinovich',
    name: 'Grace Loopinovich',
    teamId: 'freebooters',
    age: 36,
    gender: 'F',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'A-',
    pitcherRatings: { velocity: 65, junk: 72, accuracy: 68 },
    batterRatings: { power: 2, contact: 12, speed: 32, fielding: 50, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Specialist', trait2: 'Elite CF' },
    arsenal: ['4F', 'CF', 'CB', 'SL']
  },
  'frb-mcpride': {
    id: 'frb-mcpride',
    name: 'Ryder McPride',
    teamId: 'freebooters',
    age: 29,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'B',
    pitcherRatings: { velocity: 44, junk: 33, accuracy: 78 },
    batterRatings: { power: 11, contact: 7, speed: 9, fielding: 97, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Rally Stopper', trait2: 'Clutch' },
    arsenal: ['4F', '2F', 'CH']
  },
  'frb-frequin': {
    id: 'frb-frequin',
    name: 'Kay Frequin',
    teamId: 'freebooters',
    age: 31,
    gender: 'M',
    bats: 'R',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'CP',
    role: 'BULLPEN',
    overall: 'S',
    pitcherRatings: { velocity: 99, junk: 84, accuracy: 97 },
    batterRatings: { power: 8, contact: 2, speed: 32, fielding: 34, arm: 0 },
    chemistry: 'CRA',
    traits: { trait1: 'K Collector', trait2: 'Elite 2F' },
    arsenal: ['2F', 'SB']
  },

  // ==========================================
  // HERBISAURS - POSITION PLAYERS (Starters)
  // ==========================================
  'hrb-stanberg': {
    id: 'hrb-stanberg',
    name: 'Morton Stanberg',
    teamId: 'herbisaurs',
    age: 28,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'LF',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'A-',
    batterRatings: { power: 60, contact: 64, speed: 86, fielding: 72, arm: 85 },
    chemistry: 'SPI',
    traits: { trait1: 'High Pitch', trait2: 'Cannon Arm' }
  },
  'hrb-hampster': {
    id: 'hrb-hampster',
    name: 'Henry Hampster',
    teamId: 'herbisaurs',
    age: 30,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '3B',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 62, contact: 64, speed: 88, fielding: 80, arm: 86 },
    chemistry: 'CRA',
    traits: { trait1: 'Big Hack' }
  },
  'hrb-rojas': {
    id: 'hrb-rojas',
    name: 'Juan Rojas',
    teamId: 'herbisaurs',
    age: 31,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'RF',
    secondaryPosition: 'C',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 60, contact: 57, speed: 71, fielding: 84, arm: 87 },
    chemistry: 'SPI',
    traits: { trait1: 'Magic Hands' }
  },
  'hrb-manly': {
    id: 'hrb-manly',
    name: 'Grunt Manly',
    teamId: 'herbisaurs',
    age: 32,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: '1B',
    secondaryPosition: '3B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 45, contact: 77, speed: 66, fielding: 69, arm: 86 },
    chemistry: 'CMP',
    traits: { trait1: 'RBI Hero' }
  },
  'hrb-blue': {
    id: 'hrb-blue',
    name: 'Ralph Blue',
    teamId: 'herbisaurs',
    age: 31,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'SS',
    secondaryPosition: '2B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 77, contact: 71, speed: 42, fielding: 60, arm: 68 },
    chemistry: 'DIS',
    traits: { trait1: 'RBI Zero', trait2: 'Little Hack' }
  },
  'hrb-sax': {
    id: 'hrb-sax',
    name: 'Yoink Sax',
    teamId: 'herbisaurs',
    age: 27,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'CF',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 90, contact: 39, speed: 91, fielding: 89, arm: 95 },
    chemistry: 'DIS',
    traits: { trait1: 'Stealer' }
  },
  'hrb-stewart': {
    id: 'hrb-stewart',
    name: 'Milo Stewart',
    teamId: 'herbisaurs',
    age: 29,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'SS',
    isPitcher: false,
    role: 'STARTER',
    overall: 'A-',
    batterRatings: { power: 44, contact: 65, speed: 84, fielding: 89, arm: 92 },
    chemistry: 'CMP',
    traits: { trait1: 'Rally Starter' }
  },
  'hrb-stokes': {
    id: 'hrb-stokes',
    name: 'Annabella Stokes',
    teamId: 'herbisaurs',
    age: 22,
    gender: 'F',
    bats: 'R',
    throws: 'R',
    primaryPosition: '2B',
    secondaryPosition: 'SS',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 22, contact: 70, speed: 92, fielding: 98, arm: 66 },
    chemistry: 'CMP',
    traits: { trait1: 'Dive Wizard' }
  },
  'hrb-clark': {
    id: 'hrb-clark',
    name: 'Fiona Clark',
    teamId: 'herbisaurs',
    age: 24,
    gender: 'F',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'C',
    isPitcher: false,
    role: 'STARTER',
    overall: 'C+',
    batterRatings: { power: 41, contact: 25, speed: 54, fielding: 82, arm: 89 },
    chemistry: 'SCH',
    traits: { trait1: 'POW vs LHP' }
  },

  // ==========================================
  // HERBISAURS - BENCH
  // ==========================================
  'hrb-hanky': {
    id: 'hrb-hanky',
    name: 'Nate Hanky',
    teamId: 'herbisaurs',
    age: 31,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'C',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C+',
    batterRatings: { power: 49, contact: 64, speed: 34, fielding: 88, arm: 54 },
    chemistry: 'CRA',
    traits: { trait1: 'Sign Stealer' }
  },
  'hrb-batsman': {
    id: 'hrb-batsman',
    name: 'Whopper Batsman',
    teamId: 'herbisaurs',
    age: 23,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '2B',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C',
    batterRatings: { power: 81, contact: 15, speed: 50, fielding: 49, arm: 37 },
    chemistry: 'DIS',
    traits: { trait1: 'Tough Out' }
  },
  'hrb-reeves': {
    id: 'hrb-reeves',
    name: 'Stevo Reeves',
    teamId: 'herbisaurs',
    age: 29,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'LF',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C+',
    batterRatings: { power: 12, contact: 88, speed: 74, fielding: 54, arm: 68 },
    chemistry: 'SPI',
    traits: { trait1: 'Pinch Perfect' }
  },
  'hrb-little': {
    id: 'hrb-little',
    name: 'Chilli Little',
    teamId: 'herbisaurs',
    age: 21,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'RF',
    secondaryPosition: 'LF',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C+',
    batterRatings: { power: 73, contact: 29, speed: 47, fielding: 49, arm: 66 },
    chemistry: 'CMP',
    traits: { trait1: 'Mind Gamer' }
  },

  // ==========================================
  // HERBISAURS - ROTATION (Starting Pitchers)
  // ==========================================
  'hrb-qualita': {
    id: 'hrb-qualita',
    name: 'Gem Qualita',
    teamId: 'herbisaurs',
    age: 32,
    gender: 'F',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'A-',
    pitcherRatings: { velocity: 72, junk: 57, accuracy: 78 },
    batterRatings: { power: 19, contact: 29, speed: 47, fielding: 94, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'Composed', trait2: 'Easy Jumps' },
    arsenal: ['4F', '2F', 'CB', 'SL']
  },
  'hrb-lukas': {
    id: 'hrb-lukas',
    name: 'Dick Lukas',
    teamId: 'herbisaurs',
    age: 21,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B+',
    pitcherRatings: { velocity: 46, junk: 73, accuracy: 66 },
    batterRatings: { power: 6, contact: 34, speed: 63, fielding: 73, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Gets Ahead' },
    arsenal: ['4F', 'CB', 'SL', 'CH', 'FK']
  },
  'hrb-slakov': {
    id: 'hrb-slakov',
    name: 'Olaff Slakov',
    teamId: 'herbisaurs',
    age: 36,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B',
    pitcherRatings: { velocity: 33, junk: 4, accuracy: 62 },
    batterRatings: { power: 33, contact: 4, speed: 13, fielding: 62, arm: 0 },
    chemistry: 'DIS',
    traits: { trait1: 'Elite 4F', trait2: 'Volatile' },
    arsenal: ['4F', 'SL', 'CH', 'FK']
  },
  'hrb-fuss': {
    id: 'hrb-fuss',
    name: 'Tussker Fuss',
    teamId: 'herbisaurs',
    age: 29,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B',
    pitcherRatings: { velocity: 11, junk: 4, accuracy: 38 },
    batterRatings: { power: 11, contact: 4, speed: 52, fielding: 38, arm: 0 },
    chemistry: 'DIS',
    traits: { trait1: 'Meltdown' },
    arsenal: ['4F', '2F', 'CB', 'CH']
  },

  // ==========================================
  // HERBISAURS - BULLPEN (Relief Pitchers)
  // ==========================================
  'hrb-slinger': {
    id: 'hrb-slinger',
    name: 'Sal Slinger',
    teamId: 'herbisaurs',
    age: 28,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP/RP',
    role: 'BULLPEN',
    overall: 'A-',
    pitcherRatings: { velocity: 75, junk: 46, accuracy: 95 },
    batterRatings: { power: 65, contact: 14, speed: 38, fielding: 95, arm: 0 },
    chemistry: 'DIS',
    traits: {},
    arsenal: ['4F', '2F', 'CB', 'SL']
  },
  'hrb-filthwick': {
    id: 'hrb-filthwick',
    name: 'Chuck Filthwick',
    teamId: 'herbisaurs',
    age: 31,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'A',
    pitcherRatings: { velocity: 2, junk: 5, accuracy: 73 },
    batterRatings: { power: 2, contact: 5, speed: 25, fielding: 73, arm: 0 },
    chemistry: 'CMP',
    traits: {},
    arsenal: ['4F', '2F', 'SL']
  },
  'hrb-ramiro': {
    id: 'hrb-ramiro',
    name: 'Leonar Ramiro',
    teamId: 'herbisaurs',
    age: 37,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'C+',
    pitcherRatings: { velocity: 4, junk: 24, accuracy: 95 },
    batterRatings: { power: 4, contact: 24, speed: 93, fielding: 95, arm: 0 },
    chemistry: 'CMP',
    traits: { trait1: 'Surrounded' },
    arsenal: ['4F', '2F', 'CF', 'CB']
  },
  'hrb-chombo': {
    id: 'hrb-chombo',
    name: 'Omar Chombo',
    teamId: 'herbisaurs',
    age: 19,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'D+',
    pitcherRatings: { velocity: 5, junk: 5, accuracy: 46 },
    batterRatings: { power: 5, contact: 5, speed: 25, fielding: 46, arm: 0 },
    chemistry: 'CMP',
    traits: { trait1: 'Choker' },
    arsenal: ['4F', 'CB']
  },
  'hrb-rippin': {
    id: 'hrb-rippin',
    name: 'Elrick Rippin',
    teamId: 'herbisaurs',
    age: 38,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'CP',
    role: 'BULLPEN',
    overall: 'C-',
    pitcherRatings: { velocity: 82, junk: 8, accuracy: 50 },
    batterRatings: { power: 13, contact: 3, speed: 6, fielding: 50, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'K Neglecter', trait2: 'Rally Stopper' },
    arsenal: ['4F', 'SL']
  },

  // ==========================================
  // MOOSE - POSITION PLAYERS (Starters)
  // ==========================================
  'moo-fast': {
    id: 'moo-fast',
    name: 'Irene Fast',
    teamId: 'moose',
    age: 24,
    gender: 'F',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'CF',
    secondaryPosition: 'LF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'A-',
    batterRatings: { power: 70, contact: 64, speed: 90, fielding: 80, arm: 68 },
    chemistry: 'CRA',
    traits: { trait1: 'Stealer', trait2: 'Sprinter' }
  },
  'moo-cannon': {
    id: 'moo-cannon',
    name: 'Rhiannon Cannon',
    teamId: 'moose',
    age: 27,
    gender: 'F',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'RF',
    secondaryPosition: 'LF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'A-',
    batterRatings: { power: 86, contact: 56, speed: 68, fielding: 93, arm: 94 },
    chemistry: 'CRA',
    traits: { trait1: 'Cannon Arm', trait2: 'Tough Out' }
  },
  'moo-silvio': {
    id: 'moo-silvio',
    name: 'Sancha Silvio',
    teamId: 'moose',
    age: 31,
    gender: 'F',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'DH',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'A',
    batterRatings: { power: 96, contact: 55, speed: 43, fielding: 38, arm: 51 },
    chemistry: 'SPI',
    traits: { trait1: 'RBI Hero', trait2: 'High Pitch' }
  },
  'moo-tolbert': {
    id: 'moo-tolbert',
    name: 'Carla Tolbert',
    teamId: 'moose',
    age: 34,
    gender: 'F',
    bats: 'R',
    throws: 'R',
    primaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'A-',
    batterRatings: { power: 72, contact: 82, speed: 27, fielding: 86, arm: 71 },
    chemistry: 'CMP',
    traits: { trait1: 'Consistent', trait2: 'Durable' }
  },
  'moo-kattakar': {
    id: 'moo-kattakar',
    name: 'Sameer Kattakar',
    teamId: 'moose',
    age: 26,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'SS',
    secondaryPosition: '2B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 55, contact: 76, speed: 72, fielding: 87, arm: 78 },
    chemistry: 'CRA',
    traits: { trait1: 'Dive Wizard' }
  },
  'moo-carrol': {
    id: 'moo-carrol',
    name: 'Tommy Carrol',
    teamId: 'moose',
    age: 29,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '2B',
    secondaryPosition: 'SS',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 48, contact: 78, speed: 65, fielding: 73, arm: 62 },
    chemistry: 'CMP',
    traits: { trait1: 'Rally Starter' }
  },
  'moo-delfino': {
    id: 'moo-delfino',
    name: 'Alejandro Delfino',
    teamId: 'moose',
    age: 33,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: '3B',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 78, contact: 67, speed: 38, fielding: 65, arm: 82 },
    chemistry: 'SPI',
    traits: { trait1: 'Bad Ball Hitter' }
  },
  'moo-saechao': {
    id: 'moo-saechao',
    name: 'Lee Saechao',
    teamId: 'moose',
    age: 28,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'C',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 51, contact: 58, speed: 32, fielding: 75, arm: 82 },
    chemistry: 'CMP',
    traits: { trait1: 'Sign Stealer' }
  },
  'moo-sakimura': {
    id: 'moo-sakimura',
    name: 'Daiki Sakimura',
    teamId: 'moose',
    age: 25,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'LF',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 62, contact: 53, speed: 78, fielding: 64, arm: 58 },
    chemistry: 'DIS',
    traits: { trait1: 'Sprinter' }
  },

  // ==========================================
  // MOOSE - BENCH
  // ==========================================
  'moo-smacks': {
    id: 'moo-smacks',
    name: 'Pucky Smacks',
    teamId: 'moose',
    age: 31,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'C',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C+',
    batterRatings: { power: 68, contact: 42, speed: 25, fielding: 58, arm: 72 },
    chemistry: 'SPI',
    traits: { trait1: 'Pinch Perfect' }
  },
  'moo-patton': {
    id: 'moo-patton',
    name: 'Barry Patton',
    teamId: 'moose',
    age: 27,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'LF',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C+',
    batterRatings: { power: 45, contact: 62, speed: 58, fielding: 55, arm: 48 },
    chemistry: 'CRA',
    traits: {}
  },
  'moo-laboosh': {
    id: 'moo-laboosh',
    name: 'Elise Laboosh',
    teamId: 'moose',
    age: 23,
    gender: 'F',
    bats: 'S',
    throws: 'R',
    primaryPosition: '2B',
    secondaryPosition: 'SS',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C',
    batterRatings: { power: 28, contact: 72, speed: 75, fielding: 68, arm: 52 },
    chemistry: 'CMP',
    traits: { trait1: 'Utility' }
  },
  'moo-stoppard': {
    id: 'moo-stoppard',
    name: 'Mike Stoppard',
    teamId: 'moose',
    age: 35,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '3B',
    secondaryPosition: 'IF',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C',
    batterRatings: { power: 55, contact: 48, speed: 22, fielding: 62, arm: 75 },
    chemistry: 'DIS',
    traits: { trait1: 'Tough Out' }
  },

  // ==========================================
  // MOOSE - ROTATION (Starting Pitchers)
  // ==========================================
  'moo-oakley': {
    id: 'moo-oakley',
    name: 'Brianne Oakley',
    teamId: 'moose',
    age: 29,
    gender: 'F',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'A',
    pitcherRatings: { velocity: 78, junk: 72, accuracy: 85 },
    batterRatings: { power: 12, contact: 35, speed: 28, fielding: 68, arm: 0 },
    chemistry: 'CRA',
    traits: { trait1: 'Workhorse', trait2: 'Composed' },
    arsenal: ['4F', '2F', 'CB', 'SL', 'CH']
  },
  'moo-gibbons': {
    id: 'moo-gibbons',
    name: 'Emmett Gibbons',
    teamId: 'moose',
    age: 26,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B+',
    pitcherRatings: { velocity: 62, junk: 68, accuracy: 75 },
    batterRatings: { power: 8, contact: 28, speed: 35, fielding: 72, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Gets Ahead' },
    arsenal: ['4F', 'CF', 'CB', 'CH']
  },
  'moo-naysmith': {
    id: 'moo-naysmith',
    name: 'Derek Naysmith',
    teamId: 'moose',
    age: 32,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B+',
    pitcherRatings: { velocity: 85, junk: 45, accuracy: 68 },
    batterRatings: { power: 15, contact: 22, speed: 18, fielding: 55, arm: 0 },
    chemistry: 'CMP',
    traits: { trait1: 'Elite 4F' },
    arsenal: ['4F', '2F', 'SL']
  },
  'moo-pogi': {
    id: 'moo-pogi',
    name: 'Marco Pogi',
    teamId: 'moose',
    age: 24,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B',
    pitcherRatings: { velocity: 72, junk: 58, accuracy: 62 },
    batterRatings: { power: 5, contact: 18, speed: 42, fielding: 65, arm: 0 },
    chemistry: 'DIS',
    traits: {},
    arsenal: ['4F', 'CB', 'SL', 'CH']
  },

  // ==========================================
  // MOOSE - BULLPEN (Relief Pitchers)
  // ==========================================
  'moo-paxton': {
    id: 'moo-paxton',
    name: 'Howie Paxton',
    teamId: 'moose',
    age: 30,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP/RP',
    role: 'BULLPEN',
    overall: 'B+',
    pitcherRatings: { velocity: 68, junk: 72, accuracy: 70 },
    batterRatings: { power: 8, contact: 25, speed: 32, fielding: 58, arm: 0 },
    chemistry: 'CRA',
    traits: { trait1: 'Specialist' },
    arsenal: ['4F', 'CB', 'SL', 'CH', 'FK']
  },
  'moo-clangor': {
    id: 'moo-clangor',
    name: 'Rex Clangor',
    teamId: 'moose',
    age: 28,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'B+',
    pitcherRatings: { velocity: 88, junk: 52, accuracy: 65 },
    batterRatings: { power: 5, contact: 15, speed: 25, fielding: 48, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'K Collector' },
    arsenal: ['4F', '2F', 'SL']
  },
  'moo-chubb': {
    id: 'moo-chubb',
    name: 'Donna Chubb',
    teamId: 'moose',
    age: 33,
    gender: 'F',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'B',
    pitcherRatings: { velocity: 55, junk: 78, accuracy: 72 },
    batterRatings: { power: 3, contact: 22, speed: 15, fielding: 62, arm: 0 },
    chemistry: 'CMP',
    traits: { trait1: 'Elite CH' },
    arsenal: ['4F', 'CB', 'CH', 'FK']
  },
  'moo-daye': {
    id: 'moo-daye',
    name: 'Calvin Daye',
    teamId: 'moose',
    age: 27,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'C+',
    pitcherRatings: { velocity: 75, junk: 45, accuracy: 58 },
    batterRatings: { power: 8, contact: 18, speed: 35, fielding: 55, arm: 0 },
    chemistry: 'DIS',
    traits: {},
    arsenal: ['4F', 'SL', 'CH']
  },
  'moo-quetzalcoatl': {
    id: 'moo-quetzalcoatl',
    name: 'Tiny Quetzalcoatl',
    teamId: 'moose',
    age: 31,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'CP',
    role: 'BULLPEN',
    overall: 'A-',
    pitcherRatings: { velocity: 92, junk: 68, accuracy: 78 },
    batterRatings: { power: 12, contact: 8, speed: 22, fielding: 45, arm: 0 },
    chemistry: 'CRA',
    traits: { trait1: 'Rally Stopper', trait2: 'Clutch' },
    arsenal: ['4F', '2F', 'SL']
  },

  // ==========================================
  // BUZZARDS - POSITION PLAYERS (Starters)
  // ==========================================
  'bzd-bunterson': {
    id: 'bzd-bunterson',
    name: 'Buttons Bunterson',
    teamId: 'buzzards',
    age: 25,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'SS',
    secondaryPosition: '3B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'A',
    batterRatings: { power: 46, contact: 99, speed: 92, fielding: 92, arm: 62 },
    chemistry: 'CMP',
    traits: { trait1: 'Sprinter', trait2: 'Bunter' }
  },
  'bzd-bigsby': {
    id: 'bzd-bigsby',
    name: 'Helena Bigsby',
    teamId: 'buzzards',
    age: 31,
    gender: 'F',
    bats: 'S',
    throws: 'R',
    primaryPosition: 'DH',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 59, contact: 91, speed: 25, fielding: 45, arm: 47 },
    chemistry: 'CRA',
    traits: {}
  },
  'bzd-colt': {
    id: 'bzd-colt',
    name: 'Thurman Colt',
    teamId: 'buzzards',
    age: 32,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'CF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 70, contact: 83, speed: 31, fielding: 49, arm: 75 },
    chemistry: 'DIS',
    traits: { trait1: 'Mind Gamer' }
  },
  'bzd-often': {
    id: 'bzd-often',
    name: "Jacques O'Ften",
    teamId: 'buzzards',
    age: 36,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'C',
    isPitcher: false,
    role: 'STARTER',
    overall: 'A-',
    batterRatings: { power: 87, contact: 49, speed: 69, fielding: 76, arm: 81 },
    chemistry: 'DIS',
    traits: { trait1: 'First Pitch Slayer', trait2: 'Consistent' }
  },
  'bzd-mustaccio': {
    id: 'bzd-mustaccio',
    name: 'Mario Mustaccio',
    teamId: 'buzzards',
    age: 25,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: '3B',
    secondaryPosition: 'SS',
    isPitcher: false,
    role: 'STARTER',
    overall: 'A-',
    batterRatings: { power: 72, contact: 63, speed: 68, fielding: 79, arm: 79 },
    chemistry: 'DIS',
    traits: { trait1: 'Stimulated', trait2: 'Dive Wizard' }
  },
  'bzd-trunk': {
    id: 'bzd-trunk',
    name: 'Joseph Trunk',
    teamId: 'buzzards',
    age: 23,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: '1B',
    secondaryPosition: 'LF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 68, contact: 77, speed: 67, fielding: 48, arm: 69 },
    chemistry: 'SPI',
    traits: { trait1: 'Choker' }
  },
  'bzd-yoshida': {
    id: 'bzd-yoshida',
    name: 'Danno Yoshida',
    teamId: 'buzzards',
    age: 22,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'RF',
    secondaryPosition: 'OF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 77, contact: 49, speed: 57, fielding: 71, arm: 77 },
    chemistry: 'DIS',
    traits: { trait1: 'RBI Zero' }
  },
  'bzd-borgnar': {
    id: 'bzd-borgnar',
    name: 'Rolf Borgnar',
    teamId: 'buzzards',
    age: 37,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'LF',
    secondaryPosition: 'OF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 69, contact: 65, speed: 82, fielding: 77, arm: 0 },
    chemistry: 'DIS',
    traits: { trait1: 'RBI Zero' }
  },
  'bzd-whoopity': {
    id: 'bzd-whoopity',
    name: 'Sloop Whoopity',
    teamId: 'buzzards',
    age: 20,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '2B',
    secondaryPosition: '3B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 29, contact: 73, speed: 33, fielding: 58, arm: 53 },
    chemistry: 'CRA',
    traits: { trait1: 'Rally Starter' }
  },

  // ==========================================
  // BUZZARDS - BENCH
  // ==========================================
  'bzd-bronx': {
    id: 'bzd-bronx',
    name: 'Billy Bronx',
    teamId: 'buzzards',
    age: 28,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'C',
    secondaryPosition: 'IF',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C',
    batterRatings: { power: 46, contact: 28, speed: 38, fielding: 61, arm: 74 },
    chemistry: 'SPI',
    traits: { trait1: 'Distractor' }
  },
  'bzd-idoya': {
    id: 'bzd-idoya',
    name: 'Emilio Idoya',
    teamId: 'buzzards',
    age: 31,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: '2B',
    secondaryPosition: 'IF',
    isPitcher: false,
    role: 'BENCH',
    overall: 'B-',
    batterRatings: { power: 28, contact: 35, speed: 85, fielding: 81, arm: 0 },
    chemistry: 'CRA',
    traits: { trait1: 'Outside Pitch', trait2: 'Utility' }
  },
  'bzd-slamous': {
    id: 'bzd-slamous',
    name: 'Ham Slamous',
    teamId: 'buzzards',
    age: 22,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'SS',
    secondaryPosition: '2B',
    isPitcher: false,
    role: 'BENCH',
    overall: 'B-',
    batterRatings: { power: 73, contact: 54, speed: 46, fielding: 63, arm: 75 },
    chemistry: 'CMP',
    traits: {}
  },
  'bzd-mckinny': {
    id: 'bzd-mckinny',
    name: 'Spits McKinny',
    teamId: 'buzzards',
    age: 36,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'LF',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'BENCH',
    overall: 'B-',
    batterRatings: { power: 30, contact: 84, speed: 69, fielding: 65, arm: 0 },
    chemistry: 'DIS',
    traits: { trait1: 'RBI Hero' }
  },

  // ==========================================
  // BUZZARDS - ROTATION (Starting Pitchers)
  // ==========================================
  'bzd-patterson': {
    id: 'bzd-patterson',
    name: 'Punchie Patterson',
    teamId: 'buzzards',
    age: 27,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'A-',
    pitcherRatings: { velocity: 89, junk: 89, accuracy: 34 },
    batterRatings: { power: 30, contact: 84, speed: 72, fielding: 0, arm: 0 },
    chemistry: 'CMP',
    traits: { trait1: 'K Collector', trait2: 'Easy Jumps' },
    arsenal: ['4F', 'CF', 'SL', 'CH']
  },
  'bzd-bubbkins': {
    id: 'bzd-bubbkins',
    name: 'Meow Bubbkins',
    teamId: 'buzzards',
    age: 29,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B',
    pitcherRatings: { velocity: 44, junk: 53, accuracy: 75 },
    batterRatings: { power: 4, contact: 16, speed: 77, fielding: 0, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'Elite SB', trait2: 'Volatile' },
    arsenal: ['4F', 'CB', 'SL', 'SB', 'CH']
  },
  'bzd-elwood': {
    id: 'bzd-elwood',
    name: 'Erlang Elwood',
    teamId: 'buzzards',
    age: 29,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'C+',
    pitcherRatings: { velocity: 5, junk: 10, accuracy: 14 },
    batterRatings: { power: 5, contact: 41, speed: 84, fielding: 0, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'Elite 2F' },
    arsenal: ['4F', '2F', 'CF', 'CB', 'SL']
  },
  'bzd-hogswind': {
    id: 'bzd-hogswind',
    name: 'Hannah Hogswind',
    teamId: 'buzzards',
    age: 27,
    gender: 'F',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'C-',
    pitcherRatings: { velocity: 19, junk: 56, accuracy: 98 },
    batterRatings: { power: 4, contact: 19, speed: 61, fielding: 0, arm: 0 },
    chemistry: 'CRA',
    traits: {},
    arsenal: ['4F', 'CF', 'CB', 'CH']
  },

  // ==========================================
  // BUZZARDS - BULLPEN (Relief Pitchers)
  // ==========================================
  'bzd-bowler': {
    id: 'bzd-bowler',
    name: 'Bradley Bowler',
    teamId: 'buzzards',
    age: 29,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP/RP',
    role: 'BULLPEN',
    overall: 'B',
    pitcherRatings: { velocity: 14, junk: 1, accuracy: 17 },
    batterRatings: { power: 14, contact: 68, speed: 71, fielding: 0, arm: 0 },
    chemistry: 'CMP',
    traits: {},
    arsenal: ['4F', '2F', 'SL', 'CH']
  },
  'bzd-morrow': {
    id: 'bzd-morrow',
    name: 'Sebastian Morrow',
    teamId: 'buzzards',
    age: 28,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP/RP',
    role: 'BULLPEN',
    overall: 'B-',
    pitcherRatings: { velocity: 21, junk: 13, accuracy: 22 },
    batterRatings: { power: 21, contact: 55, speed: 55, fielding: 0, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'Reverse Splits' },
    arsenal: ['4F', 'SL', 'CH']
  },
  'bzd-texis': {
    id: 'bzd-texis',
    name: 'Max Texis',
    teamId: 'buzzards',
    age: 37,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'A-',
    pitcherRatings: { velocity: 2, junk: 16, accuracy: 17 },
    batterRatings: { power: 85, contact: 93, speed: 0, fielding: 0, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Crossed Up' },
    arsenal: ['4F', 'CB', 'SL']
  },
  'bzd-commonly': {
    id: 'bzd-commonly',
    name: 'Meat Commonly',
    teamId: 'buzzards',
    age: 38,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'D+',
    pitcherRatings: { velocity: 5, junk: 10, accuracy: 20 },
    batterRatings: { power: 69, contact: 18, speed: 54, fielding: 0, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Wild Thing' },
    arsenal: ['4F', '2F', 'CB']
  },
  'bzd-buckberger': {
    id: 'bzd-buckberger',
    name: 'Leyla Buckberger',
    teamId: 'buzzards',
    age: 27,
    gender: 'F',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'CP',
    role: 'BULLPEN',
    overall: 'B',
    pitcherRatings: { velocity: 19, junk: 14, accuracy: 23 },
    batterRatings: { power: 52, contact: 68, speed: 0, fielding: 0, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Rally Stopper' },
    arsenal: ['4F', '2F', 'CB']
  },

  // ==========================================
  // CROCODONS - POSITION PLAYERS (Starters)
  // ==========================================
  'crc-drive': {
    id: 'crc-drive',
    name: 'Liane Drive',
    teamId: 'crocodons',
    age: 27,
    gender: 'F',
    bats: 'R',
    throws: 'R',
    primaryPosition: '1B',
    secondaryPosition: 'C',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 57, contact: 96, speed: 39, fielding: 39, arm: 54 },
    chemistry: 'CRA',
    traits: { trait1: 'Mind Gamer' }
  },
  'crc-candela': {
    id: 'crc-candela',
    name: 'Andre Candela',
    teamId: 'crocodons',
    age: 25,
    gender: 'M',
    bats: 'S',
    throws: 'R',
    primaryPosition: '2B',
    secondaryPosition: 'IF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'A-',
    batterRatings: { power: 67, contact: 72, speed: 71, fielding: 76, arm: 22 },
    chemistry: 'CMP',
    traits: { trait1: 'Sprinter', trait2: 'Consistent' }
  },
  'crc-lionerre': {
    id: 'crc-lionerre',
    name: 'Terra Lionerre',
    teamId: 'crocodons',
    age: 28,
    gender: 'F',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'C',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 74, contact: 60, speed: 50, fielding: 46, arm: 63 },
    chemistry: 'SPI',
    traits: { trait1: 'Wild Thrower' }
  },
  'crc-fenomeno': {
    id: 'crc-fenomeno',
    name: 'Norm Fenomeno',
    teamId: 'crocodons',
    age: 23,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'SS',
    secondaryPosition: 'P',
    isPitcher: false,
    role: 'STARTER',
    overall: 'A',
    batterRatings: { power: 77, contact: 79, speed: 23, fielding: 78, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Elite 4F', trait2: 'Two Way (IF)' },
    pitcherRatings: { velocity: 54, junk: 76, accuracy: 67 },
    arsenal: ['4F', 'CF', 'CB', 'SL']
  },
  'crc-thurd': {
    id: 'crc-thurd',
    name: 'Runda Thurd',
    teamId: 'crocodons',
    age: 31,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: '3B',
    secondaryPosition: 'SS',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 78, contact: 95, speed: 61, fielding: 0, arm: 0 },
    chemistry: 'DIS',
    traits: { trait1: 'Base Rounder' }
  },
  'crc-vortex': {
    id: 'crc-vortex',
    name: 'Vinnie Vortex',
    teamId: 'crocodons',
    age: 29,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'RF',
    secondaryPosition: 'OF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 35, contact: 80, speed: 93, fielding: 64, arm: 0 },
    chemistry: 'SCH',
    traits: {}
  },
  'crc-fruitwell': {
    id: 'crc-fruitwell',
    name: 'Gordon Fruitwell',
    teamId: 'crocodons',
    age: 31,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'CF',
    secondaryPosition: 'OF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 48, contact: 69, speed: 63, fielding: 97, arm: 76 },
    chemistry: 'DIS',
    traits: { trait1: 'Cannon Arm' }
  },
  'crc-hernandez': {
    id: 'crc-hernandez',
    name: 'Juanita Hernandez',
    teamId: 'crocodons',
    age: 31,
    gender: 'F',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'LF',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 89, contact: 75, speed: 52, fielding: 99, arm: 96 },
    chemistry: 'SCH',
    traits: {}
  },
  'crc-chukov': {
    id: 'crc-chukov',
    name: 'Evan Chukov',
    teamId: 'crocodons',
    age: 20,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'C',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 41, contact: 53, speed: 23, fielding: 88, arm: 0 },
    chemistry: 'CRA',
    traits: { trait1: 'First Pitch Slayer' }
  },

  // ==========================================
  // CROCODONS - BENCH
  // ==========================================
  'crc-woodburn': {
    id: 'crc-woodburn',
    name: 'Tarzan Woodburn',
    teamId: 'crocodons',
    age: 26,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: '1B',
    secondaryPosition: '3B',
    isPitcher: false,
    role: 'BENCH',
    overall: 'D+',
    batterRatings: { power: 21, contact: 34, speed: 11, fielding: 96, arm: 83 },
    chemistry: 'CMP',
    traits: { trait1: 'Big Hack' }
  },
  'crc-lee': {
    id: 'crc-lee',
    name: 'Trisha Lee',
    teamId: 'crocodons',
    age: 21,
    gender: 'F',
    bats: 'R',
    throws: 'R',
    primaryPosition: '3B',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'BENCH',
    overall: 'B-',
    batterRatings: { power: 38, contact: 80, speed: 58, fielding: 69, arm: 0 },
    chemistry: 'CRA',
    traits: {}
  },
  'crc-pickle': {
    id: 'crc-pickle',
    name: 'Norton Pickle',
    teamId: 'crocodons',
    age: 31,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'SS',
    isPitcher: false,
    role: 'BENCH',
    overall: 'B-',
    batterRatings: { power: 33, contact: 79, speed: 69, fielding: 78, arm: 73 },
    chemistry: 'CMP',
    traits: { trait1: 'Distractor' }
  },
  'crc-blastman': {
    id: 'crc-blastman',
    name: 'Bubba Blastman',
    teamId: 'crocodons',
    age: 30,
    gender: 'M',
    bats: 'S',
    throws: 'R',
    primaryPosition: 'LF',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C+',
    batterRatings: { power: 74, contact: 42, speed: 25, fielding: 0, arm: 0 },
    chemistry: 'DIS',
    traits: { trait1: 'Whiffer', trait2: 'Clutch' }
  },
  'crc-kane': {
    id: 'crc-kane',
    name: 'Clifford Kane',
    teamId: 'crocodons',
    age: 37,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'CF',
    secondaryPosition: 'OF',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C-',
    batterRatings: { power: 52, contact: 30, speed: 0, fielding: 0, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'Easy Target' }
  },

  // ==========================================
  // CROCODONS - ROTATION (Starting Pitchers)
  // ==========================================
  'crc-pulo': {
    id: 'crc-pulo',
    name: 'Jovita Pulo',
    teamId: 'crocodons',
    age: 29,
    gender: 'F',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'S',
    pitcherRatings: { velocity: 97, junk: 89, accuracy: 85 },
    batterRatings: { power: 8, contact: 10, speed: 49, fielding: 0, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'Workhorse', trait2: 'Volatile' },
    arsenal: ['4F', '2F', 'SL', 'CH']
  },
  'crc-brick': {
    id: 'crc-brick',
    name: 'Maurice Brick',
    teamId: 'crocodons',
    age: 22,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'A',
    pitcherRatings: { velocity: 76, junk: 96, accuracy: 52 },
    batterRatings: { power: 16, contact: 15, speed: 13, fielding: 81, arm: 0 },
    chemistry: 'CMP',
    traits: {},
    arsenal: ['4F', '2F', 'CF', 'SL', 'FK']
  },
  'crc-kapps': {
    id: 'crc-kapps',
    name: 'Jerry Kapps',
    teamId: 'crocodons',
    age: 37,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'A-',
    pitcherRatings: { velocity: 2, junk: 36, accuracy: 74 },
    batterRatings: { power: 2, contact: 88, speed: 0, fielding: 0, arm: 0 },
    chemistry: 'CRA',
    traits: {},
    arsenal: ['4F', '2F', 'CF', 'SL', 'CH']
  },
  'crc-paul': {
    id: 'crc-paul',
    name: 'Bae Paul',
    teamId: 'crocodons',
    age: 24,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'C+',
    pitcherRatings: { velocity: 7, junk: 28, accuracy: 33 },
    batterRatings: { power: 9, contact: 75, speed: 62, fielding: 0, arm: 0 },
    chemistry: 'CMP',
    traits: { trait1: 'Elite 2F' },
    arsenal: ['4F', '2F', 'CB', 'SL']
  },

  // ==========================================
  // CROCODONS - BULLPEN (Relief Pitchers)
  // ==========================================
  'crc-ano': {
    id: 'crc-ano',
    name: 'Woody Ano',
    teamId: 'crocodons',
    age: 38,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'B-',
    pitcherRatings: { velocity: 5, junk: 30, accuracy: 10 },
    batterRatings: { power: 85, contact: 89, speed: 15, fielding: 0, arm: 0 },
    chemistry: 'CRA',
    traits: { trait1: 'Crossed Up' },
    arsenal: ['4F', '2F', 'SL']
  },
  'crc-mayfair': {
    id: 'crc-mayfair',
    name: 'Tia Mayfair',
    teamId: 'crocodons',
    age: 32,
    gender: 'F',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'C',
    pitcherRatings: { velocity: 2, junk: 19, accuracy: 13 },
    batterRatings: { power: 73, contact: 48, speed: 24, fielding: 98, arm: 0 },
    chemistry: 'CRA',
    traits: { trait1: 'K Neglecter' },
    arsenal: ['4F', 'CB', 'CH']
  },
  'crc-dabaziz': {
    id: 'crc-dabaziz',
    name: 'Lou DaBaziz',
    teamId: 'crocodons',
    age: 26,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'D+',
    pitcherRatings: { velocity: 39, junk: 29, accuracy: 43 },
    batterRatings: { power: 1, contact: 15, speed: 8, fielding: 22, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Falls Behind' },
    arsenal: ['4F', 'CB', 'FK']
  },
  'crc-mcfarland': {
    id: 'crc-mcfarland',
    name: 'Ricky McFarland',
    teamId: 'crocodons',
    age: 25,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'CP',
    role: 'BULLPEN',
    overall: 'B+',
    pitcherRatings: { velocity: 66, junk: 97, accuracy: 31 },
    batterRatings: { power: 3, contact: 22, speed: 20, fielding: 36, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Specialist' },
    arsenal: ['4F', 'SL']
  },

  // ==========================================
  // NEMESIS - POSITION PLAYERS (Starters)
  // ==========================================
  'nem-yatter': {
    id: 'nem-yatter',
    name: 'Javy Yatter',
    teamId: 'nemesis',
    age: 29,
    gender: 'M',
    bats: 'S',
    throws: 'L',
    primaryPosition: 'RF',
    secondaryPosition: 'LF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'A-',
    batterRatings: { power: 81, contact: 81, speed: 35, fielding: 69, arm: 81 },
    chemistry: 'CMP',
    traits: { trait1: 'RBI Zero', trait2: 'Outside Pitch' }
  },
  'nem-sports': {
    id: 'nem-sports',
    name: 'Jock Sports',
    teamId: 'nemesis',
    age: 29,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'SS',
    secondaryPosition: '2B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'A+',
    batterRatings: { power: 89, contact: 98, speed: 57, fielding: 93, arm: 71 },
    chemistry: 'DIS',
    traits: { trait1: 'Cannon Arm' }
  },
  'nem-taters': {
    id: 'nem-taters',
    name: 'Mash Taters',
    teamId: 'nemesis',
    age: 23,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 95, contact: 74, speed: 27, fielding: 65, arm: 75 },
    chemistry: 'CRA',
    traits: {}
  },
  'nem-slam': {
    id: 'nem-slam',
    name: 'Jackie Slam',
    teamId: 'nemesis',
    age: 31,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'CF',
    secondaryPosition: 'OF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'A+',
    batterRatings: { power: 81, contact: 98, speed: 68, fielding: 84, arm: 46 },
    chemistry: 'DIS',
    traits: { trait1: 'RBI Hero', trait2: 'Ace Exterminator' }
  },
  'nem-moonshota': {
    id: 'nem-moonshota',
    name: 'Hito Moonshota',
    teamId: 'nemesis',
    age: 28,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '3B',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'A-',
    batterRatings: { power: 93, contact: 66, speed: 30, fielding: 88, arm: 93 },
    chemistry: 'CRA',
    traits: { trait1: 'High Pitch' }
  },
  'nem-hautier': {
    id: 'nem-hautier',
    name: 'Javier Hautier',
    teamId: 'nemesis',
    age: 21,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: '2B',
    secondaryPosition: 'SS',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 93, contact: 66, speed: 41, fielding: 0, arm: 0 },
    chemistry: 'CMP',
    traits: { trait1: 'Whiffer' }
  },
  'nem-staples': {
    id: 'nem-staples',
    name: 'Stacy Staples',
    teamId: 'nemesis',
    age: 31,
    gender: 'F',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'C',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 69, contact: 54, speed: 63, fielding: 34, arm: 0 },
    chemistry: 'CMP',
    traits: { trait1: 'Slow Poke' }
  },
  'nem-pickleford': {
    id: 'nem-pickleford',
    name: 'Brine Pickleford',
    teamId: 'nemesis',
    age: 31,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'LF',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 69, contact: 76, speed: 50, fielding: 63, arm: 34 },
    chemistry: 'CRA',
    traits: { trait1: 'Mind Gamer' }
  },
  'nem-ganez': {
    id: 'nem-ganez',
    name: 'Gabby Ganez',
    teamId: 'nemesis',
    age: 31,
    gender: 'F',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'RF',
    secondaryPosition: 'C',
    isPitcher: false,
    role: 'STARTER',
    overall: 'C+',
    batterRatings: { power: 90, contact: 74, speed: 49, fielding: 79, arm: 90 },
    chemistry: 'SCH',
    traits: { trait1: 'Durable' }
  },

  // ==========================================
  // NEMESIS - BENCH
  // ==========================================
  'nem-aoshima': {
    id: 'nem-aoshima',
    name: 'Mimori Aoshima',
    teamId: 'nemesis',
    age: 25,
    gender: 'F',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'C',
    secondaryPosition: '3B',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C+',
    batterRatings: { power: 73, contact: 43, speed: 37, fielding: 27, arm: 90 },
    chemistry: 'SCH',
    traits: {}
  },
  'nem-leathar': {
    id: 'nem-leathar',
    name: 'Flash Leathar',
    teamId: 'nemesis',
    age: 28,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '2B',
    secondaryPosition: 'IF',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C+',
    batterRatings: { power: 9, contact: 22, speed: 64, fielding: 95, arm: 80 },
    chemistry: 'SCH',
    traits: { trait1: 'Magic Hands' }
  },
  'nem-zoner': {
    id: 'nem-zoner',
    name: 'Amy Zoner',
    teamId: 'nemesis',
    age: 27,
    gender: 'F',
    bats: 'S',
    throws: 'R',
    primaryPosition: 'SS',
    secondaryPosition: '3B',
    isPitcher: false,
    role: 'BENCH',
    overall: 'B-',
    batterRatings: { power: 28, contact: 58, speed: 57, fielding: 65, arm: 68 },
    chemistry: 'CRA',
    traits: { trait1: 'CON vs LHP', trait2: 'Inside Pitch' }
  },
  'nem-dangerfield': {
    id: 'nem-dangerfield',
    name: 'Churl Dangerfield',
    teamId: 'nemesis',
    age: 22,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'CF',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'BENCH',
    overall: 'B-',
    batterRatings: { power: 54, contact: 40, speed: 65, fielding: 0, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'Dive Wizard' }
  },

  // ==========================================
  // NEMESIS - ROTATION (Starting Pitchers)
  // ==========================================
  'nem-carouse': {
    id: 'nem-carouse',
    name: 'Ansel Carouse',
    teamId: 'nemesis',
    age: 25,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'A-',
    pitcherRatings: { velocity: 65, junk: 64, accuracy: 70 },
    batterRatings: { power: 32, contact: 11, speed: 71, fielding: 0, arm: 0 },
    chemistry: 'DIS',
    traits: { trait1: 'Workhorse' },
    arsenal: ['4F', '2F', 'SL', 'CH']
  },
  'nem-mabettes': {
    id: 'nem-mabettes',
    name: 'Heidi Mabettes',
    teamId: 'nemesis',
    age: 38,
    gender: 'F',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B+',
    pitcherRatings: { velocity: 47, junk: 51, accuracy: 86 },
    batterRatings: { power: 20, contact: 6, speed: 30, fielding: 45, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'Elite SL' },
    arsenal: ['4F', 'CF', 'CB', 'SL', 'CH']
  },
  'nem-harbourmouth': {
    id: 'nem-harbourmouth',
    name: 'Mark Harbourmouth',
    teamId: 'nemesis',
    age: 34,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B-',
    pitcherRatings: { velocity: 77, junk: 17, accuracy: 8 },
    batterRatings: { power: 90, contact: 40, speed: 82, fielding: 57, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'Elite CF' },
    arsenal: ['4F', 'SL', 'CH']
  },
  'nem-stacker': {
    id: 'nem-stacker',
    name: 'Deuce Stacker',
    teamId: 'nemesis',
    age: 27,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'C',
    pitcherRatings: { velocity: 22, junk: 72, accuracy: 22 },
    batterRatings: { power: 22, contact: 12, speed: 42, fielding: 0, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'Elite CB' },
    arsenal: ['4F', '2F', 'CB', 'FK']
  },

  // ==========================================
  // NEMESIS - BULLPEN (Relief Pitchers)
  // ==========================================
  'nem-marshmallow': {
    id: 'nem-marshmallow',
    name: 'Jacob Marshmallow',
    teamId: 'nemesis',
    age: 24,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP/RP',
    role: 'BULLPEN',
    overall: 'B-',
    pitcherRatings: { velocity: 1, junk: 5, accuracy: 0 },
    batterRatings: { power: 37, contact: 26, speed: 64, fielding: 72, arm: 0 },
    chemistry: 'SCH',
    traits: {},
    arsenal: ['4F', 'CB', 'SL', 'CH', 'FK']
  },
  'nem-stevens': {
    id: 'nem-stevens',
    name: 'Binky Stevens',
    teamId: 'nemesis',
    age: 37,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'B-',
    pitcherRatings: { velocity: 3, junk: 2, accuracy: 18 },
    batterRatings: { power: 65, contact: 13, speed: 81, fielding: 0, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Falls Behind' },
    arsenal: ['4F', '2F', 'FK']
  },
  'nem-finnegans': {
    id: 'nem-finnegans',
    name: 'Lucy Finnegans',
    teamId: 'nemesis',
    age: 28,
    gender: 'F',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'C+',
    pitcherRatings: { velocity: 25, junk: 28, accuracy: 43 },
    batterRatings: { power: 53, contact: 69, speed: 60, fielding: 0, arm: 0 },
    chemistry: 'CMP',
    traits: { trait1: 'Elite 2F' },
    arsenal: ['4F', '2F', 'SL']
  },
  'nem-walkman': {
    id: 'nem-walkman',
    name: 'Babette Walkman',
    teamId: 'nemesis',
    age: 26,
    gender: 'F',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'C-',
    pitcherRatings: { velocity: 33, junk: 1, accuracy: 5 },
    batterRatings: { power: 33, contact: 17, speed: 34, fielding: 70, arm: 0 },
    chemistry: 'CRA',
    traits: { trait1: 'BB Prone' },
    arsenal: ['4F', 'CB', 'CH']
  },
  'nem-wimple': {
    id: 'nem-wimple',
    name: 'Lawrence Wimple',
    teamId: 'nemesis',
    age: 19,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'CP',
    role: 'BULLPEN',
    overall: 'B-',
    pitcherRatings: { velocity: 68, junk: 50, accuracy: 39 },
    batterRatings: { power: 8, contact: 14, speed: 96, fielding: 0, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Gets Ahead' },
    arsenal: ['4F', 'SL']
  },

  // ==========================================
  // JACKS - POSITION PLAYERS (Starters)
  // ==========================================
  'jck-cracker': {
    id: 'jck-cracker',
    name: 'Jack Cracker',
    teamId: 'jacks',
    age: 28,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'DH',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 81, contact: 94, speed: 33, fielding: 50, arm: 66 },
    chemistry: 'SCH',
    traits: {}
  },
  'jck-dazzler': {
    id: 'jck-dazzler',
    name: 'Razi Dazzler',
    teamId: 'jacks',
    age: 27,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'RF',
    secondaryPosition: 'OF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 83, contact: 62, speed: 63, fielding: 93, arm: 49 },
    chemistry: 'SPI',
    traits: { trait1: 'Tough Out' }
  },
  'jck-buffler': {
    id: 'jck-buffler',
    name: 'Huffly Buffler',
    teamId: 'jacks',
    age: 25,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '2B',
    secondaryPosition: 'SS',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 91, contact: 90, speed: 28, fielding: 75, arm: 58 },
    chemistry: 'CRA',
    traits: { trait1: 'Slow Poke', trait2: 'Noodle Arm' }
  },
  'jck-jackson': {
    id: 'jck-jackson',
    name: 'Juice Jackson',
    teamId: 'jacks',
    age: 22,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'SS',
    secondaryPosition: 'SS',
    isPitcher: false,
    role: 'STARTER',
    overall: 'A',
    batterRatings: { power: 95, contact: 88, speed: 43, fielding: 68, arm: 70 },
    chemistry: 'SPI',
    traits: { trait1: 'Off-speed Hitter', trait2: 'Stimulated' }
  },
  'jck-yamamoto': {
    id: 'jck-yamamoto',
    name: 'Yoyo Yamamoto',
    teamId: 'jacks',
    age: 29,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '3B',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 90, contact: 34, speed: 66, fielding: 86, arm: 86 },
    chemistry: 'DIS',
    traits: { trait1: 'Ace Exterminator' }
  },
  'jck-wilson': {
    id: 'jck-wilson',
    name: 'Batch Wilson',
    teamId: 'jacks',
    age: 38,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'CF',
    secondaryPosition: 'OF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 89, contact: 75, speed: 52, fielding: 77, arm: 71 },
    chemistry: 'SPI',
    traits: { trait1: 'Bad Ball Hitter', trait2: 'CON vs RHP' }
  },
  'jck-upton': {
    id: 'jck-upton',
    name: 'Downtown Upton',
    teamId: 'jacks',
    age: 37,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 77, contact: 49, speed: 57, fielding: 71, arm: 0 },
    chemistry: 'CRA',
    traits: { trait1: 'Inside Pitch' }
  },
  'jck-freely': {
    id: 'jck-freely',
    name: 'Log Freely',
    teamId: 'jacks',
    age: 29,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'LF',
    secondaryPosition: 'OF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 77, contact: 69, speed: 51, fielding: 57, arm: 71 },
    chemistry: 'CRA',
    traits: { trait1: 'Inside Pitch' }
  },
  'jck-lift': {
    id: 'jck-lift',
    name: 'Tuff Lift',
    teamId: 'jacks',
    age: 31,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'C',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 74, contact: 67, speed: 8, fielding: 97, arm: 70 },
    chemistry: 'CRA',
    traits: {}
  },

  // ==========================================
  // JACKS - BENCH
  // ==========================================
  'jck-cormen': {
    id: 'jck-cormen',
    name: 'Clutch Cormen',
    teamId: 'jacks',
    age: 37,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'C',
    isPitcher: false,
    role: 'BENCH',
    overall: 'B',
    batterRatings: { power: 4, contact: 89, speed: 49, fielding: 10, arm: 66 },
    chemistry: 'SCH',
    traits: { trait1: 'Clutch' }
  },
  'jck-adamo': {
    id: 'jck-adamo',
    name: 'Bruno Adamo',
    teamId: 'jacks',
    age: 31,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '2B',
    secondaryPosition: 'SS',
    isPitcher: false,
    role: 'BENCH',
    overall: 'B-',
    batterRatings: { power: 16, contact: 89, speed: 41, fielding: 54, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'Distractor' }
  },
  'jck-glover': {
    id: 'jck-glover',
    name: 'Rob Glover',
    teamId: 'jacks',
    age: 21,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'SS',
    secondaryPosition: 'IF',
    isPitcher: false,
    role: 'BENCH',
    overall: 'B-',
    batterRatings: { power: 10, contact: 78, speed: 83, fielding: 83, arm: 41 },
    chemistry: 'CRA',
    traits: { trait1: 'Magic Hands' }
  },
  'jck-sparks': {
    id: 'jck-sparks',
    name: 'Betty Sparks',
    teamId: 'jacks',
    age: 27,
    gender: 'F',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'RF',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C',
    batterRatings: { power: 97, contact: 26, speed: 37, fielding: 21, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'Metal Head' }
  },

  // ==========================================
  // JACKS - ROTATION (Starting Pitchers)
  // ==========================================
  'jck-oh': {
    id: 'jck-oh',
    name: 'Donk Oh',
    teamId: 'jacks',
    age: 20,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B+',
    pitcherRatings: { velocity: 54, junk: 57, accuracy: 95 },
    batterRatings: { power: 4, contact: 11, speed: 20, fielding: 43, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'Metal Head' },
    arsenal: ['4F', 'CB', 'SL', 'CH']
  },
  'jck-roberto': {
    id: 'jck-roberto',
    name: 'Alberto Roberto',
    teamId: 'jacks',
    age: 37,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B-',
    pitcherRatings: { velocity: 11, junk: 18, accuracy: 20 },
    batterRatings: { power: 16, contact: 72, speed: 64, fielding: 0, arm: 0 },
    chemistry: 'CRA',
    traits: { trait1: 'Elite FK' },
    arsenal: ['4F', 'CB', 'SL', 'CH', 'FK']
  },
  'jck-mietballe': {
    id: 'jck-mietballe',
    name: 'Bella Mietballe',
    teamId: 'jacks',
    age: 32,
    gender: 'F',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'C',
    pitcherRatings: { velocity: 14, junk: 25, accuracy: 34 },
    batterRatings: { power: 39, contact: 64, speed: 11, fielding: 93, arm: 0 },
    chemistry: 'CMP',
    traits: { trait1: 'Meltdown' },
    arsenal: ['4F', '2F', 'CF', 'SL', 'CH']
  },
  'jck-ozone': {
    id: 'jck-ozone',
    name: 'Barry Ozone',
    teamId: 'jacks',
    age: 24,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'C',
    pitcherRatings: { velocity: 27, junk: 66, accuracy: 0 },
    batterRatings: { power: 30, contact: 18, speed: 59, fielding: 42, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'Elite SB' },
    arsenal: ['4F', '2F', 'CB', 'SB']
  },

  // ==========================================
  // JACKS - BULLPEN (Relief Pitchers)
  // ==========================================
  'jck-gripowski': {
    id: 'jck-gripowski',
    name: 'Stitch Gripowski',
    teamId: 'jacks',
    age: 23,
    gender: 'M',
    bats: 'S',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP/RP',
    role: 'BULLPEN',
    overall: 'B+',
    pitcherRatings: { velocity: 4, junk: 67, accuracy: 83 },
    batterRatings: { power: 13, contact: 42, speed: 16, fielding: 47, arm: 0 },
    chemistry: 'CMP',
    traits: { trait1: 'Surrounded', trait2: 'Elite CF' },
    arsenal: ['4F', 'CF', 'CH', 'FK']
  },
  'jck-spectaculo': {
    id: 'jck-spectaculo',
    name: 'Immaculo Spectaculo',
    teamId: 'jacks',
    age: 25,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'A+',
    pitcherRatings: { velocity: 84, junk: 95, accuracy: 79 },
    batterRatings: { power: 2, contact: 12, speed: 11, fielding: 54, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Crossed Up' },
    arsenal: ['4F', 'SL', 'CH']
  },
  'jck-munstar': {
    id: 'jck-munstar',
    name: 'Ellain Munstar',
    teamId: 'jacks',
    age: 23,
    gender: 'F',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'B+',
    pitcherRatings: { velocity: 90, junk: 89, accuracy: 73 },
    batterRatings: { power: 15, contact: 5, speed: 11, fielding: 35, arm: 0 },
    chemistry: 'SPI',
    traits: {},
    arsenal: ['4F', '2F', 'CB']
  },
  'jck-musharra': {
    id: 'jck-musharra',
    name: 'Kisha Musharra',
    teamId: 'jacks',
    age: 26,
    gender: 'F',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'C-',
    pitcherRatings: { velocity: 68, junk: 13, accuracy: 32 },
    batterRatings: { power: 12, contact: 12, speed: 0, fielding: 0, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Elite CH' },
    arsenal: ['4F', '2F', 'CB']
  },
  'jck-lapada': {
    id: 'jck-lapada',
    name: 'Chico Lapada',
    teamId: 'jacks',
    age: 31,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'CP',
    role: 'BULLPEN',
    overall: 'A-',
    pitcherRatings: { velocity: 79, junk: 96, accuracy: 62 },
    batterRatings: { power: 8, contact: 17, speed: 24, fielding: 71, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'BB Prone', trait2: 'Easy Jumps' },
    arsenal: ['4F', 'CF', 'SL']
  },

  // ==========================================
  // WILD PIGS - POSITION PLAYERS (Starters)
  // ==========================================
  'wpg-michaels': {
    id: 'wpg-michaels',
    name: 'Bloop Michaels',
    teamId: 'wild-pigs',
    age: 25,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '2B',
    secondaryPosition: 'SS',
    isPitcher: false,
    role: 'STARTER',
    overall: 'A',
    batterRatings: { power: 78, contact: 76, speed: 92, fielding: 73, arm: 53 },
    chemistry: 'SPI',
    traits: { trait1: 'Bad Ball Hitter', trait2: 'Rally Starter' }
  },
  'wpg-roper': {
    id: 'wpg-roper',
    name: 'Snag Roper',
    teamId: 'wild-pigs',
    age: 38,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'SS',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 68, contact: 87, speed: 22, fielding: 93, arm: 91 },
    chemistry: 'CMP',
    traits: { trait1: 'Magic Hands' }
  },
  'wpg-hardman': {
    id: 'wpg-hardman',
    name: 'Rosy Hardman',
    teamId: 'wild-pigs',
    age: 22,
    gender: 'F',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'LF',
    secondaryPosition: 'OF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 93, contact: 47, speed: 36, fielding: 0, arm: 0 },
    chemistry: 'CRA',
    traits: { trait1: 'High Pitch' }
  },
  'wpg-wagnerd': {
    id: 'wpg-wagnerd',
    name: 'Spanky Wagnerd',
    teamId: 'wild-pigs',
    age: 28,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 97, contact: 58, speed: 66, fielding: 16, arm: 14 },
    chemistry: 'CRA',
    traits: { trait1: 'First Pitch Slayer', trait2: 'Butter Fingers' }
  },
  'wpg-evans': {
    id: 'wpg-evans',
    name: 'Flash Evans',
    teamId: 'wild-pigs',
    age: 30,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'RF',
    secondaryPosition: 'C',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 99, contact: 100, speed: 98, fielding: 49, arm: 29 },
    chemistry: 'SCH',
    traits: { trait1: 'Dive Wizard' }
  },
  'wpg-moon': {
    id: 'wpg-moon',
    name: 'Mannon Moon',
    teamId: 'wild-pigs',
    age: 32,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'CF',
    secondaryPosition: 'OF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 62, contact: 26, speed: 53, fielding: 0, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'POW vs RHP', trait2: 'Little Hack' }
  },
  'wpg-blings': {
    id: 'wpg-blings',
    name: 'Earnie Blings',
    teamId: 'wild-pigs',
    age: 29,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'DH',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 35, contact: 61, speed: 73, fielding: 97, arm: 87 },
    chemistry: 'SCH',
    traits: { trait1: 'Little Hack' }
  },
  'wpg-battery': {
    id: 'wpg-battery',
    name: 'Frank Battery',
    teamId: 'wild-pigs',
    age: 27,
    gender: 'M',
    bats: 'S',
    throws: 'R',
    primaryPosition: 'C',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 35, contact: 61, speed: 73, fielding: 97, arm: 87 },
    chemistry: 'DIS',
    traits: { trait1: 'Base Jogger', trait2: 'Durable' }
  },
  'wpg-alba': {
    id: 'wpg-alba',
    name: 'Roberto Alba',
    teamId: 'wild-pigs',
    age: 36,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: '3B',
    secondaryPosition: 'IF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'C+',
    batterRatings: { power: 53, contact: 58, speed: 43, fielding: 45, arm: 0 },
    chemistry: 'CRA',
    traits: { trait1: 'Clutch' }
  },

  // ==========================================
  // WILD PIGS - BENCH
  // ==========================================
  'wpg-bacon': {
    id: 'wpg-bacon',
    name: 'Wally Bacon',
    teamId: 'wild-pigs',
    age: 37,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '2B',
    secondaryPosition: '3B',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C+',
    batterRatings: { power: 59, contact: 96, speed: 56, fielding: 25, arm: 0 },
    chemistry: 'SPI',
    traits: {}
  },
  'wpg-miles': {
    id: 'wpg-miles',
    name: 'Turbo Miles',
    teamId: 'wild-pigs',
    age: 31,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '2B',
    secondaryPosition: 'SS',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C+',
    batterRatings: { power: 40, contact: 56, speed: 91, fielding: 27, arm: 25 },
    chemistry: 'DIS',
    traits: { trait1: 'Stealer' }
  },
  'wpg-goyo': {
    id: 'wpg-goyo',
    name: 'Enrique Goyo',
    teamId: 'wild-pigs',
    age: 19,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'LF',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C+',
    batterRatings: { power: 5, contact: 46, speed: 73, fielding: 49, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'Bad Jumps', trait2: 'Base Rounder' }
  },
  'wpg-storm': {
    id: 'wpg-storm',
    name: 'Godfried Storm',
    teamId: 'wild-pigs',
    age: 21,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'CF',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C+',
    batterRatings: { power: 46, contact: 37, speed: 35, fielding: 0, arm: 0 },
    chemistry: 'CMP',
    traits: { trait1: 'Utility' }
  },

  // ==========================================
  // WILD PIGS - ROTATION (Starting Pitchers)
  // ==========================================
  'wpg-yogurt': {
    id: 'wpg-yogurt',
    name: 'Wes Yogurt',
    teamId: 'wild-pigs',
    age: 29,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'A',
    pitcherRatings: { velocity: 74, junk: 75, accuracy: 85 },
    batterRatings: { power: 8, contact: 3, speed: 3, fielding: 0, arm: 0 },
    chemistry: 'DIS',
    traits: { trait1: 'Elite CH' },
    arsenal: ['4F', 'CF', 'CH']
  },
  'wpg-lovell': {
    id: 'wpg-lovell',
    name: 'Hugs Lovell',
    teamId: 'wild-pigs',
    age: 36,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B',
    pitcherRatings: { velocity: 33, junk: 4, accuracy: 74 },
    batterRatings: { power: 33, contact: 98, speed: 0, fielding: 0, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Elite SB' },
    arsenal: ['4F', 'CB', 'SL', 'SB', 'CH']
  },
  'wpg-holmes': {
    id: 'wpg-holmes',
    name: 'Durbin Holmes',
    teamId: 'wild-pigs',
    age: 21,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B',
    pitcherRatings: { velocity: 4, junk: 15, accuracy: 17 },
    batterRatings: { power: 85, contact: 55, speed: 0, fielding: 0, arm: 0 },
    chemistry: 'CMP',
    traits: {},
    arsenal: ['4F', 'CB', 'SL', 'CH']
  },
  'wpg-smesson': {
    id: 'wpg-smesson',
    name: 'Wiff Smesson',
    teamId: 'wild-pigs',
    age: 31,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B',
    pitcherRatings: { velocity: 2, junk: 39, accuracy: 13 },
    batterRatings: { power: 47, contact: 65, speed: 53, fielding: 44, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'Composed', trait2: 'Elite FK' },
    arsenal: ['4F', '2F', 'CB', 'CH', 'FK']
  },

  // ==========================================
  // WILD PIGS - BULLPEN (Relief Pitchers)
  // ==========================================
  'wpg-crackebarrel': {
    id: 'wpg-crackebarrel',
    name: 'Cutter Crackebarrel',
    teamId: 'wild-pigs',
    age: 29,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP/RP',
    role: 'BULLPEN',
    overall: 'B-',
    pitcherRatings: { velocity: 24, junk: 28, accuracy: 37 },
    batterRatings: { power: 89, contact: 39, speed: 0, fielding: 30, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'Elite CF' },
    arsenal: ['4F', 'CB', 'SL', 'CH']
  },
  'wpg-drake': {
    id: 'wpg-drake',
    name: 'Donovan Drake',
    teamId: 'wild-pigs',
    age: 31,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP/RP',
    role: 'BULLPEN',
    overall: 'C+',
    pitcherRatings: { velocity: 6, junk: 12, accuracy: 15 },
    batterRatings: { power: 92, contact: 23, speed: 0, fielding: 0, arm: 0 },
    chemistry: 'SPI',
    traits: {},
    arsenal: ['4F', 'SL', 'CH']
  },
  'wpg-lantana': {
    id: 'wpg-lantana',
    name: 'Alana Lantana',
    teamId: 'wild-pigs',
    age: 29,
    gender: 'F',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'A+',
    pitcherRatings: { velocity: 4, junk: 14, accuracy: 29 },
    batterRatings: { power: 62, contact: 94, speed: 94, fielding: 0, arm: 0 },
    chemistry: 'DIS',
    traits: { trait1: 'K Collector' },
    arsenal: ['4F', 'CF', 'SL']
  },
  'wpg-kerr': {
    id: 'wpg-kerr',
    name: 'Kendra Kerr',
    teamId: 'wild-pigs',
    age: 21,
    gender: 'F',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'B+',
    pitcherRatings: { velocity: 6, junk: 8, accuracy: 28 },
    batterRatings: { power: 61, contact: 85, speed: 67, fielding: 32, arm: 0 },
    chemistry: 'DIS',
    traits: {},
    arsenal: ['4F', '2F', 'CB', 'SL']
  },
  'wpg-ospeciallo': {
    id: 'wpg-ospeciallo',
    name: "Hander O'Speciallo",
    teamId: 'wild-pigs',
    age: 30,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'CP',
    role: 'BULLPEN',
    overall: 'C+',
    pitcherRatings: { velocity: 2, junk: 5, accuracy: 10 },
    batterRatings: { power: 23, contact: 70, speed: 51, fielding: 75, arm: 0 },
    chemistry: 'CRA',
    traits: { trait1: 'Specialist', trait2: 'Surrounded' },
    arsenal: ['4F', 'CB', 'SL']
  },

  // ==========================================
  // FREE AGENTS
  // ==========================================
  'fa-blammo-tamale': {
    id: 'fa-blammo-tamale',
    name: 'Blammo Tamale',
    teamId: 'free-agent',
    age: 26,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'CF',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'S',
    batterRatings: { power: 97, contact: 58, speed: 94, fielding: 71, arm: 72 },
    chemistry: 'CRA',
    traits: { trait1: 'Inside Pitch', trait2: 'Off-speed Hitter' }
  },
  'fa-squinch-tootwhistle': {
    id: 'fa-squinch-tootwhistle',
    name: 'Squinch Tootwhistle',
    teamId: 'free-agent',
    age: 37,
    gender: 'F',
    bats: 'S',
    throws: 'R',
    primaryPosition: '2B',
    secondaryPosition: 'SS',
    isPitcher: false,
    role: 'STARTER',
    overall: 'A+',
    batterRatings: { power: 97, contact: 85, speed: 69, fielding: 55, arm: 49 },
    chemistry: 'CMP',
    traits: { trait1: 'CON vs RHP', trait2: 'Wild Thrower' }
  },
  'fa-warren-yout': {
    id: 'fa-warren-yout',
    name: 'Warren Yout',
    teamId: 'free-agent',
    age: 28,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'A',
    pitcherRatings: { velocity: 79, junk: 68, accuracy: 78 },
    batterRatings: { power: 3, contact: 23, speed: 4, fielding: 49, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'Workhorse' },
    arsenal: ['4F', 'CB', 'SL', 'CH']
  },
  'fa-doyen-stafford': {
    id: 'fa-doyen-stafford',
    name: 'Doyen Stafford',
    teamId: 'free-agent',
    age: 29,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'A',
    pitcherRatings: { velocity: 93, junk: 57, accuracy: 88 },
    batterRatings: { power: 10, contact: 4, speed: 18, fielding: 58, arm: 0 },
    chemistry: 'CRA',
    traits: {},
    arsenal: ['4F', 'CB', 'SL', 'CH', 'FK']
  },
  'fa-traq-statsman': {
    id: 'fa-traq-statsman',
    name: 'Traq Statsman',
    teamId: 'free-agent',
    age: 23,
    gender: 'M',
    bats: 'S',
    throws: 'R',
    primaryPosition: 'RF',
    secondaryPosition: 'CF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'A-',
    batterRatings: { power: 60, contact: 72, speed: 88, fielding: 48, arm: 70 },
    chemistry: 'SCH',
    traits: { trait1: 'RBI Hero' }
  },
  'fa-boozle-doozyshine': {
    id: 'fa-boozle-doozyshine',
    name: 'Boozle Doozyshine',
    teamId: 'free-agent',
    age: 27,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '3B',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'A-',
    batterRatings: { power: 91, contact: 98, speed: 71, fielding: 50, arm: 52 },
    chemistry: 'SPI',
    traits: {}
  },
  'fa-pearl-panske': {
    id: 'fa-pearl-panske',
    name: 'Pearl Panske',
    teamId: 'free-agent',
    age: 26,
    gender: 'F',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'A-',
    pitcherRatings: { velocity: 79, junk: 86, accuracy: 44 },
    batterRatings: { power: 28, contact: 40, speed: 38, fielding: 96, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'Composed' },
    arsenal: ['4F', 'CF', 'CB', 'SL']
  },
  'fa-scoops-tomahawking': {
    id: 'fa-scoops-tomahawking',
    name: 'Scoops Tomahawking',
    teamId: 'free-agent',
    age: 29,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '2B',
    secondaryPosition: '3B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'A-',
    batterRatings: { power: 63, contact: 96, speed: 82, fielding: 50, arm: 54 },
    chemistry: 'SCH',
    traits: { trait1: 'Bad Ball Hitter' }
  },
  'fa-sluggy-boomhauer': {
    id: 'fa-sluggy-boomhauer',
    name: 'Sluggy Boomhauer',
    teamId: 'free-agent',
    age: 31,
    gender: 'M',
    bats: 'S',
    throws: 'R',
    primaryPosition: 'RF',
    secondaryPosition: 'LF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'A-',
    batterRatings: { power: 94, contact: 84, speed: 45, fielding: 32, arm: 72 },
    chemistry: 'DIS',
    traits: {}
  },
  'fa-hopper-fenster': {
    id: 'fa-hopper-fenster',
    name: 'Hopper Fenster',
    teamId: 'free-agent',
    age: 36,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'CF',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'A-',
    batterRatings: { power: 70, contact: 86, speed: 76, fielding: 94, arm: 72 },
    chemistry: 'CRA',
    traits: { trait1: 'Magic Hands' }
  },
  'fa-lynetta-betta': {
    id: 'fa-lynetta-betta',
    name: 'Lynetta Betta',
    teamId: 'free-agent',
    age: 30,
    gender: 'F',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'CP',
    role: 'BULLPEN',
    overall: 'B+',
    pitcherRatings: { velocity: 76, junk: 76, accuracy: 47 },
    batterRatings: { power: 22, contact: 4, speed: 3, fielding: 68, arm: 0 },
    chemistry: 'CMP',
    traits: { trait1: 'Surrounded', trait2: 'Elite SL' },
    arsenal: ['4F', 'SL']
  },
  'fa-almondo-gnuts': {
    id: 'fa-almondo-gnuts',
    name: 'Almondo Gnuts',
    teamId: 'free-agent',
    age: 33,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'B+',
    pitcherRatings: { velocity: 74, junk: 55, accuracy: 67 },
    batterRatings: { power: 4, contact: 14, speed: 37, fielding: 70, arm: 0 },
    chemistry: 'CMP',
    traits: { trait1: 'Reverse Splits' },
    arsenal: ['4F', 'CB']
  },
  'fa-burl-chinning': {
    id: 'fa-burl-chinning',
    name: 'Burl Chinning',
    teamId: 'free-agent',
    age: 32,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B+',
    pitcherRatings: { velocity: 60, junk: 50, accuracy: 39 },
    batterRatings: { power: 59, contact: 99, speed: 36, fielding: 39, arm: 0 },
    chemistry: 'DIS',
    traits: { trait1: 'Easy Jumps' },
    arsenal: ['4F', '2F', 'CB', 'SL']
  },
  'fa-anita-bean': {
    id: 'fa-anita-bean',
    name: 'Anita Bean',
    teamId: 'free-agent',
    age: 31,
    gender: 'F',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B+',
    pitcherRatings: { velocity: 63, junk: 65, accuracy: 75 },
    batterRatings: { power: 54, contact: 56, speed: 75, fielding: 40, arm: 0 },
    chemistry: 'CMP',
    traits: {},
    arsenal: ['4F', '2F', 'CB', 'SL']
  },
  'fa-howie-kahldit': {
    id: 'fa-howie-kahldit',
    name: 'Howie Kahldit',
    teamId: 'free-agent',
    age: 27,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'RF',
    secondaryPosition: 'LF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 83, contact: 53, speed: 67, fielding: 52, arm: 68 },
    chemistry: 'CRA',
    traits: { trait1: 'Off-speed Hitter' }
  },
  'fa-spike-pena': {
    id: 'fa-spike-pena',
    name: 'Spike Pena',
    teamId: 'free-agent',
    age: 36,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP/RP',
    role: 'ROTATION',
    overall: 'B+',
    pitcherRatings: { velocity: 45, junk: 58, accuracy: 96 },
    batterRatings: { power: 12, contact: 11, speed: 7, fielding: 19, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Reverse Splits' },
    arsenal: ['4F', 'SL', 'CH']
  },
  'fa-hayam-colliner': {
    id: 'fa-hayam-colliner',
    name: 'Hayam Colliner',
    teamId: 'free-agent',
    age: 27,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'CF',
    secondaryPosition: 'SS',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 91, contact: 34, speed: 76, fielding: 47, arm: 88 },
    chemistry: 'SCH',
    traits: { trait1: 'RBI Hero' }
  },
  'fa-rita-rekonda': {
    id: 'fa-rita-rekonda',
    name: 'Rita Rekonda',
    teamId: 'free-agent',
    age: 24,
    gender: 'F',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP/RP',
    role: 'ROTATION',
    overall: 'B+',
    pitcherRatings: { velocity: 68, junk: 51, accuracy: 86 },
    batterRatings: { power: 13, contact: 6, speed: 5, fielding: 30, arm: 0 },
    chemistry: 'CRA',
    traits: { trait1: 'Pick Officer' },
    arsenal: ['4F', 'CB', 'SL']
  },
  'fa-phil-flusterer': {
    id: 'fa-phil-flusterer',
    name: 'Phil Flusterer',
    teamId: 'free-agent',
    age: 27,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'CP',
    role: 'BULLPEN',
    overall: 'B+',
    pitcherRatings: { velocity: 54, junk: 77, accuracy: 76 },
    batterRatings: { power: 4, contact: 12, speed: 3, fielding: 44, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'Meltdown' },
    arsenal: ['4F', 'SL']
  },
  'fa-theresa-ketchum': {
    id: 'fa-theresa-ketchum',
    name: 'Theresa Ketchum',
    teamId: 'free-agent',
    age: 27,
    gender: 'F',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'C',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 61, contact: 66, speed: 40, fielding: 89, arm: 87 },
    chemistry: 'CRA',
    traits: { trait1: 'Mind Gamer' }
  },
  'fa-rob-hurlington-iv': {
    id: 'fa-rob-hurlington-iv',
    name: 'Rob Hurlington IV',
    teamId: 'free-agent',
    age: 31,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'B',
    pitcherRatings: { velocity: 60, junk: 66, accuracy: 57 },
    batterRatings: { power: 11, contact: 2, speed: 75, fielding: 7, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Consistent' },
    arsenal: ['4F', 'CB', 'SL']
  },
  'fa-hans-sliperrio': {
    id: 'fa-hans-sliperrio',
    name: 'Hans Sliperrio',
    teamId: 'free-agent',
    age: 26,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'SS',
    secondaryPosition: '2B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 41, contact: 66, speed: 54, fielding: 71, arm: 90 },
    chemistry: 'CRA',
    traits: { trait1: 'Butter Fingers', trait2: 'Bunter' }
  },
  // Page 2 Free Agents (B and B- tier)
  'fa-ava-blanc': {
    id: 'fa-ava-blanc',
    name: 'Ava Blanc',
    teamId: 'free-agent',
    age: 33,
    gender: 'F',
    bats: 'S',
    throws: 'L',
    primaryPosition: 'RF',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 73, contact: 54, speed: 56, fielding: 61, arm: 76 },
    chemistry: 'CRA',
    traits: { trait1: 'Easy Target' }
  },
  'fa-langdon-strider': {
    id: 'fa-langdon-strider',
    name: 'Langdon Strider',
    teamId: 'free-agent',
    age: 34,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'B',
    pitcherRatings: { velocity: 73, junk: 46, accuracy: 60 },
    batterRatings: { power: 5, contact: 27, speed: 1, fielding: 42, arm: 0 },
    chemistry: 'DIS',
    traits: { trait1: 'Elite SL' },
    arsenal: ['4F', '2F', 'CB', 'SL']
  },
  'fa-pique-fizeek': {
    id: 'fa-pique-fizeek',
    name: 'Pique Fizeek',
    teamId: 'free-agent',
    age: 24,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 79, contact: 59, speed: 55, fielding: 88, arm: 63 },
    chemistry: 'SCH',
    traits: { trait1: 'Stimulated' }
  },
  'fa-archie-alonso': {
    id: 'fa-archie-alonso',
    name: 'Archie Alonso',
    teamId: 'free-agent',
    age: 27,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'B',
    pitcherRatings: { velocity: 50, junk: 74, accuracy: 58 },
    batterRatings: { power: 10, contact: 8, speed: 38, fielding: 55, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Composed' },
    arsenal: ['4F', 'CB', 'SL']
  },
  'fa-axel-torque': {
    id: 'fa-axel-torque',
    name: 'Axel Torque',
    teamId: 'free-agent',
    age: 25,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'LF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 84, contact: 71, speed: 64, fielding: 64, arm: 47 },
    chemistry: 'CRA',
    traits: {}
  },
  'fa-bob-hurlington-iv': {
    id: 'fa-bob-hurlington-iv',
    name: 'Bob Hurlington IV',
    teamId: 'free-agent',
    age: 31,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'B',
    pitcherRatings: { velocity: 59, junk: 67, accuracy: 57 },
    batterRatings: { power: 15, contact: 7, speed: 18, fielding: 66, arm: 0 },
    chemistry: 'CRA',
    traits: { trait1: 'Volatile' },
    arsenal: ['4F', 'SL', 'CH']
  },
  'fa-brent-branch': {
    id: 'fa-brent-branch',
    name: 'Brent Branch',
    teamId: 'free-agent',
    age: 30,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'B',
    pitcherRatings: { velocity: 48, junk: 73, accuracy: 58 },
    batterRatings: { power: 4, contact: 0, speed: 27, fielding: 42, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Gets Ahead' },
    arsenal: ['4F', 'CB']
  },
  'fa-yanagi-hayai': {
    id: 'fa-yanagi-hayai',
    name: 'Yanagi Hayai',
    teamId: 'free-agent',
    age: 28,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B',
    pitcherRatings: { velocity: 40, junk: 75, accuracy: 83 },
    batterRatings: { power: 8, contact: 28, speed: 1, fielding: 68, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'K Neglecter' },
    arsenal: ['4F', 'CB', 'SL', 'CH']
  },
  'fa-cecil-sawyer': {
    id: 'fa-cecil-sawyer',
    name: 'Cecil Sawyer',
    teamId: 'free-agent',
    age: 27,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B',
    pitcherRatings: { velocity: 67, junk: 64, accuracy: 44 },
    batterRatings: { power: 13, contact: 23, speed: 72, fielding: 53, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Rally Stopper' },
    arsenal: ['4F', 'CF', 'SL', 'CH']
  },
  'fa-arsenio-armstrong': {
    id: 'fa-arsenio-armstrong',
    name: 'Arsenio Armstrong',
    teamId: 'free-agent',
    age: 30,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'RF',
    secondaryPosition: 'CF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 49, contact: 75, speed: 66, fielding: 46, arm: 93 },
    chemistry: 'CRA',
    traits: { trait1: 'Cannon Arm' }
  },
  'fa-dilly-daller': {
    id: 'fa-dilly-daller',
    name: 'Dilly Daller',
    teamId: 'free-agent',
    age: 32,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'SS',
    secondaryPosition: '2B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 71, contact: 68, speed: 51, fielding: 67, arm: 92 },
    chemistry: 'CMP',
    traits: { trait1: 'Bad Jumps', trait2: 'Base Jogger' }
  },
  'fa-froggo-balinstandos': {
    id: 'fa-froggo-balinstandos',
    name: 'Froggo Balinstandos',
    teamId: 'free-agent',
    age: 20,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B',
    pitcherRatings: { velocity: 55, junk: 78, accuracy: 45 },
    batterRatings: { power: 13, contact: 24, speed: 11, fielding: 66, arm: 0 },
    chemistry: 'CMP',
    traits: { trait1: 'Elite CH' },
    arsenal: ['4F', '2F', 'CB', 'SL', 'CH']
  },
  'fa-yakker-asherbomb': {
    id: 'fa-yakker-asherbomb',
    name: 'Yakker Asherbomb',
    teamId: 'free-agent',
    age: 28,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '2B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 98, contact: 61, speed: 54, fielding: 63, arm: 25 },
    chemistry: 'SCH',
    traits: {}
  },
  'fa-walter-vaulter': {
    id: 'fa-walter-vaulter',
    name: 'Walter Vaulter',
    teamId: 'free-agent',
    age: 32,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'CF',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 55, contact: 44, speed: 84, fielding: 73, arm: 39 },
    chemistry: 'DIS',
    traits: { trait1: 'Dive Wizard' }
  },
  'fa-sponge-dryden': {
    id: 'fa-sponge-dryden',
    name: 'Sponge Dryden',
    teamId: 'free-agent',
    age: 39,
    gender: 'M',
    bats: 'S',
    throws: 'R',
    primaryPosition: 'C',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 62, contact: 49, speed: 22, fielding: 68, arm: 56 },
    chemistry: 'DIS',
    traits: { trait1: 'RBI Hero' }
  },
  'fa-yips-frazzler': {
    id: 'fa-yips-frazzler',
    name: 'Yips Frazzler',
    teamId: 'free-agent',
    age: 27,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'SS',
    secondaryPosition: '3B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 63, contact: 56, speed: 42, fielding: 99, arm: 53 },
    chemistry: 'SPI',
    traits: { trait1: 'Wild Thrower' }
  },
  'fa-eddie-steadson': {
    id: 'fa-eddie-steadson',
    name: 'Eddie Steadson',
    teamId: 'free-agent',
    age: 35,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'B-',
    pitcherRatings: { velocity: 38, junk: 81, accuracy: 51 },
    batterRatings: { power: 23, contact: 3, speed: 17, fielding: 16, arm: 0 },
    chemistry: 'DIS',
    traits: { trait1: 'Consistent' },
    arsenal: ['4F', 'SL', 'CH']
  },
  'fa-vinder-hawkins': {
    id: 'fa-vinder-hawkins',
    name: 'Vinder Hawkins',
    teamId: 'free-agent',
    age: 34,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'CF',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 28, contact: 62, speed: 86, fielding: 67, arm: 82 },
    chemistry: 'CRA',
    traits: { trait1: 'Little Hack' }
  },
  'fa-vill-buchelieg': {
    id: 'fa-vill-buchelieg',
    name: 'Vill Buchelieg',
    teamId: 'free-agent',
    age: 32,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'LF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 48, contact: 51, speed: 81, fielding: 10, arm: 64 },
    chemistry: 'CRA',
    traits: { trait1: 'Stimulated', trait2: 'Sign Stealer' }
  },
  'fa-cyne-blinder': {
    id: 'fa-cyne-blinder',
    name: 'Cyne Blinder',
    teamId: 'free-agent',
    age: 29,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'B-',
    pitcherRatings: { velocity: 34, junk: 69, accuracy: 57 },
    batterRatings: { power: 18, contact: 8, speed: 27, fielding: 63, arm: 0 },
    chemistry: 'DIS',
    traits: { trait1: 'Rally Stopper' },
    arsenal: ['4F', 'CB', 'CH']
  },
  'fa-camilla-cuffingham': {
    id: 'fa-camilla-cuffingham',
    name: 'Camilla Cuffingham',
    teamId: 'free-agent',
    age: 22,
    gender: 'F',
    bats: 'S',
    throws: 'R',
    primaryPosition: 'C',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 57, contact: 58, speed: 37, fielding: 68, arm: 35 },
    chemistry: 'DIS',
    traits: { trait1: 'CON vs RHP' }
  },
  'fa-otto-von-olio': {
    id: 'fa-otto-von-olio',
    name: 'Otto Von Olio',
    teamId: 'free-agent',
    age: 25,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 43, contact: 73, speed: 69, fielding: 37, arm: 32 },
    chemistry: 'CRA',
    traits: { trait1: 'Off-speed Hitter', trait2: 'Pinch Perfect' }
  },
  // Page 3 Free Agents (B- to D+ tier)
  'fa-charlemagne-charleston': {
    id: 'fa-charlemagne-charleston',
    name: 'Charlemagne Charleston',
    teamId: 'free-agent',
    age: 28,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B-',
    pitcherRatings: { velocity: 48, junk: 90, accuracy: 25 },
    batterRatings: { power: 45, contact: 1, speed: 9, fielding: 69, arm: 0 },
    chemistry: 'DIS',
    traits: {},
    arsenal: ['4F', 'CB', 'SL', 'CH']
  },
  'fa-duder-elderino': {
    id: 'fa-duder-elderino',
    name: "Duder El'Derino",
    teamId: 'free-agent',
    age: 31,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '1B',
    secondaryPosition: '3B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'C+',
    batterRatings: { power: 75, contact: 38, speed: 49, fielding: 55, arm: 73 },
    chemistry: 'SPI',
    traits: { trait1: 'Sprinter', trait2: 'Noodle Arm' }
  },
  'fa-gertie-goatman': {
    id: 'fa-gertie-goatman',
    name: 'Gertie Goatman',
    teamId: 'free-agent',
    age: 25,
    gender: 'F',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP/RP',
    role: 'ROTATION',
    overall: 'C+',
    pitcherRatings: { velocity: 50, junk: 11, accuracy: 72 },
    batterRatings: { power: 6, contact: 15, speed: 14, fielding: 43, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'Specialist' },
    arsenal: ['4F', 'CB', 'SL']
  },
  'fa-tip-tapler': {
    id: 'fa-tip-tapler',
    name: 'Tip Tapler',
    teamId: 'free-agent',
    age: 34,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '2B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'C+',
    batterRatings: { power: 6, contact: 99, speed: 49, fielding: 58, arm: 68 },
    chemistry: 'SCH',
    traits: { trait1: 'Bunter' }
  },
  'fa-butte-puckerton': {
    id: 'fa-butte-puckerton',
    name: 'Butte Puckerton',
    teamId: 'free-agent',
    age: 27,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '3B',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'C+',
    batterRatings: { power: 43, contact: 92, speed: 43, fielding: 25, arm: 60 },
    chemistry: 'CMP',
    traits: {}
  },
  'fa-goose-caboosler': {
    id: 'fa-goose-caboosler',
    name: 'Goose Caboosler',
    teamId: 'free-agent',
    age: 24,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'SS',
    secondaryPosition: '2B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'C+',
    batterRatings: { power: 60, contact: 29, speed: 57, fielding: 58, arm: 70 },
    chemistry: 'DIS',
    traits: { trait1: 'Utility', trait2: 'Pinch Perfect' }
  },
  'fa-seb-swolson': {
    id: 'fa-seb-swolson',
    name: 'Seb Swolson',
    teamId: 'free-agent',
    age: 23,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '1B',
    secondaryPosition: 'C',
    isPitcher: false,
    role: 'STARTER',
    overall: 'C+',
    batterRatings: { power: 78, contact: 49, speed: 63, fielding: 29, arm: 19 },
    chemistry: 'CMP',
    traits: { trait1: 'RBI Zero', trait2: 'Bad Ball Hitter' }
  },
  'fa-garth-givener': {
    id: 'fa-garth-givener',
    name: 'Garth Givener',
    teamId: 'free-agent',
    age: 29,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'C+',
    pitcherRatings: { velocity: 34, junk: 63, accuracy: 20 },
    batterRatings: { power: 35, contact: 38, speed: 2, fielding: 59, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'Elite SL', trait2: 'Workhorse' },
    arsenal: ['4F', 'CB', 'SL', 'SB', 'FK']
  },
  'fa-hotto-de-la-doggo': {
    id: 'fa-hotto-de-la-doggo',
    name: 'Hotto De La Doggo',
    teamId: 'free-agent',
    age: 40,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'RF',
    secondaryPosition: 'CF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'C+',
    batterRatings: { power: 33, contact: 72, speed: 57, fielding: 76, arm: 64 },
    chemistry: 'CRA',
    traits: { trait1: 'Slow Poke', trait2: 'Distractor' }
  },
  'fa-wagyu-takobe': {
    id: 'fa-wagyu-takobe',
    name: 'Wagyu Takobe',
    teamId: 'free-agent',
    age: 23,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'C+',
    pitcherRatings: { velocity: 49, junk: 52, accuracy: 49 },
    batterRatings: { power: 19, contact: 15, speed: 31, fielding: 70, arm: 0 },
    chemistry: 'CRA',
    traits: {},
    arsenal: ['4F', 'CB', 'SL', 'CH']
  },
  'fa-nomar-stubbs': {
    id: 'fa-nomar-stubbs',
    name: 'Nomar Stubbs',
    teamId: 'free-agent',
    age: 33,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '3B',
    secondaryPosition: 'SS',
    isPitcher: false,
    role: 'STARTER',
    overall: 'C+',
    batterRatings: { power: 57, contact: 83, speed: 35, fielding: 51, arm: 55 },
    chemistry: 'SCH',
    traits: { trait1: 'Whiffer' }
  },
  'fa-horace-heimlech': {
    id: 'fa-horace-heimlech',
    name: 'Horace Heimlech',
    teamId: 'free-agent',
    age: 20,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'C+',
    pitcherRatings: { velocity: 54, junk: 41, accuracy: 44 },
    batterRatings: { power: 7, contact: 3, speed: 2, fielding: 98, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Elite 4F' },
    arsenal: ['4F', 'CB', 'CH']
  },
  'fa-pooch-ponderosa': {
    id: 'fa-pooch-ponderosa',
    name: 'Pooch Ponderosa',
    teamId: 'free-agent',
    age: 26,
    gender: 'F',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'LF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'C+',
    batterRatings: { power: 58, contact: 26, speed: 73, fielding: 55, arm: 59 },
    chemistry: 'SPI',
    traits: {}
  },
  'fa-hephner-hackett': {
    id: 'fa-hephner-hackett',
    name: 'Hephner Hackett',
    teamId: 'free-agent',
    age: 27,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'C',
    isPitcher: false,
    role: 'STARTER',
    overall: 'C',
    batterRatings: { power: 54, contact: 45, speed: 45, fielding: 41, arm: 55 },
    chemistry: 'CRA',
    traits: { trait1: 'First Pitch Prayer' }
  },
  'fa-montgomery-mapleripe': {
    id: 'fa-montgomery-mapleripe',
    name: 'Montgomery Mapleripe',
    teamId: 'free-agent',
    age: 36,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'C',
    pitcherRatings: { velocity: 29, junk: 64, accuracy: 44 },
    batterRatings: { power: 32, contact: 2, speed: 3, fielding: 45, arm: 0 },
    chemistry: 'CMP',
    traits: {},
    arsenal: ['4F', 'CF', 'CB', 'SL']
  },
  'fa-velo-hiwanase': {
    id: 'fa-velo-hiwanase',
    name: 'Velo Hiwanase',
    teamId: 'free-agent',
    age: 27,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'LF',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'C',
    batterRatings: { power: 49, contact: 43, speed: 63, fielding: 39, arm: 44 },
    chemistry: 'CRA',
    traits: { trait1: 'Fastball Hitter' }
  },
  'fa-smokey-ashe': {
    id: 'fa-smokey-ashe',
    name: 'Smokey Ashe',
    teamId: 'free-agent',
    age: 27,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '3B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'C',
    batterRatings: { power: 39, contact: 46, speed: 68, fielding: 75, arm: 65 },
    chemistry: 'SPI',
    traits: { trait1: 'Stealer' }
  },
  'fa-dwayne-butterfinger': {
    id: 'fa-dwayne-butterfinger',
    name: 'Dwayne Butterfinger',
    teamId: 'free-agent',
    age: 24,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '1B',
    secondaryPosition: 'LF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'C',
    batterRatings: { power: 72, contact: 36, speed: 46, fielding: 64, arm: 35 },
    chemistry: 'SCH',
    traits: { trait1: 'Butter Fingers', trait2: 'Clutch' }
  },
  'fa-doug-outphives': {
    id: 'fa-doug-outphives',
    name: 'Doug Outphives',
    teamId: 'free-agent',
    age: 26,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '2B',
    secondaryPosition: 'SS',
    isPitcher: false,
    role: 'STARTER',
    overall: 'C-',
    batterRatings: { power: 31, contact: 21, speed: 52, fielding: 83, arm: 42 },
    chemistry: 'CMP',
    traits: { trait1: 'Pinch Perfect' }
  },
  'fa-cozy-spooner': {
    id: 'fa-cozy-spooner',
    name: 'Cozy Spooner',
    teamId: 'free-agent',
    age: 20,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'C',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'C-',
    batterRatings: { power: 42, contact: 32, speed: 29, fielding: 66, arm: 39 },
    chemistry: 'CMP',
    traits: { trait1: 'Bad Ball Hitter' }
  },
  'fa-bobby-odor': {
    id: 'fa-bobby-odor',
    name: 'Bobby Odor',
    teamId: 'free-agent',
    age: 27,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '2B',
    secondaryPosition: 'SS',
    isPitcher: false,
    role: 'STARTER',
    overall: 'C-',
    batterRatings: { power: 12, contact: 41, speed: 66, fielding: 66, arm: 65 },
    chemistry: 'CRA',
    traits: { trait1: 'Whiffer', trait2: 'Stealer' }
  },
  'fa-scout-gahderon': {
    id: 'fa-scout-gahderon',
    name: 'Scout Gahderon',
    teamId: 'free-agent',
    age: 33,
    gender: 'F',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'C',
    isPitcher: false,
    role: 'STARTER',
    overall: 'D+',
    batterRatings: { power: 7, contact: 46, speed: 52, fielding: 58, arm: 54 },
    chemistry: 'SPI',
    traits: {}
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all players for a team
 */
export function getTeamRoster(teamId: string): PlayerData[] {
  const team = TEAMS[teamId];
  if (!team) return [];
  return team.rosterIds.map(id => PLAYERS[id]).filter(Boolean);
}

/**
 * Get player by ID
 */
export function getPlayer(playerId: string): PlayerData | undefined {
  return PLAYERS[playerId];
}

/**
 * Get team by ID
 */
export function getTeam(teamId: string): TeamData | undefined {
  return TEAMS[teamId];
}

/**
 * Get all teams
 */
export function getAllTeams(): TeamData[] {
  return Object.values(TEAMS);
}

/**
 * Get all players
 */
export function getAllPlayers(): PlayerData[] {
  return Object.values(PLAYERS);
}

/**
 * Get starters for a team (position players in starting lineup)
 */
export function getTeamStarters(teamId: string): PlayerData[] {
  return getTeamRoster(teamId).filter(p => p.role === 'STARTER');
}

/**
 * Get bench players for a team
 */
export function getTeamBench(teamId: string): PlayerData[] {
  return getTeamRoster(teamId).filter(p => p.role === 'BENCH');
}

/**
 * Get rotation (starting pitchers) for a team
 */
export function getTeamRotation(teamId: string): PlayerData[] {
  return getTeamRoster(teamId).filter(p => p.role === 'ROTATION');
}

/**
 * Get bullpen (relief pitchers) for a team
 */
export function getTeamBullpen(teamId: string): PlayerData[] {
  return getTeamRoster(teamId).filter(p => p.role === 'BULLPEN');
}

/**
 * Get all pitchers for a team
 */
export function getTeamPitchers(teamId: string): PlayerData[] {
  return getTeamRoster(teamId).filter(p => p.isPitcher);
}

/**
 * Get all position players for a team
 */
export function getTeamPositionPlayers(teamId: string): PlayerData[] {
  return getTeamRoster(teamId).filter(p => !p.isPitcher);
}

/**
 * Search players by name (case-insensitive partial match)
 */
export function searchPlayers(query: string): PlayerData[] {
  const lowerQuery = query.toLowerCase();
  return getAllPlayers().filter(p =>
    p.name.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Find player by exact name (case-insensitive)
 */
export function getPlayerByName(name: string): PlayerData | undefined {
  const lowerName = name.toLowerCase();
  return getAllPlayers().find(p => p.name.toLowerCase() === lowerName);
}

/**
 * Get all free agents (players with teamId 'free-agent')
 */
export function getAllFreeAgents(): PlayerData[] {
  return Object.values(PLAYERS).filter(p => p.teamId === 'free-agent');
}

/**
 * Get free agent position players only
 */
export function getFreeAgentPositionPlayers(): PlayerData[] {
  return getAllFreeAgents().filter(p => !p.isPitcher);
}

/**
 * Get free agent pitchers only
 */
export function getFreeAgentPitchers(): PlayerData[] {
  return getAllFreeAgents().filter(p => p.isPitcher);
}

/**
 * Convert PlayerData to format expected by salary calculator
 */
export function toSalaryPlayerFormat(player: PlayerData) {
  return {
    id: player.id,
    name: player.name,
    isPitcher: player.isPitcher,
    isTwoWay: false,  // Could be detected if player has both ratings
    primaryPosition: player.primaryPosition,
    ratings: player.isPitcher
      ? player.pitcherRatings!
      : player.batterRatings!,
    battingRatings: player.batterRatings,
    age: player.age,
    personality: undefined,  // Could map from chemistry
    fame: 0,  // Would come from season stats
    traits: [player.traits.trait1, player.traits.trait2].filter(Boolean) as string[]
  };
}

// ============================================
// GAME LINEUP GENERATION
// ============================================

/**
 * Lineup slot for game tracker (pre-game format)
 */
export interface GameLineupSlot {
  id: string;
  name: string;
  position: Position;
  grade: string;
  jerseyNumber: number;
}

/**
 * Bench player for game tracker
 */
export interface GameBenchPlayer {
  playerId: string;
  playerName: string;
  positions: Position[];
  isAvailable: boolean;
  batterHand: BatterHand;
}

/**
 * Generate a starting lineup for a team
 * Returns 9 players in batting order with starting pitcher at #9
 */
export function generateTeamLineup(teamId: string, startingPitcherId?: string): GameLineupSlot[] {
  const starters = getTeamStarters(teamId);
  const rotation = getTeamRotation(teamId);

  // Get starting pitcher (first in rotation if not specified)
  const startingPitcher = startingPitcherId
    ? rotation.find(p => p.id === startingPitcherId) || rotation[0]
    : rotation[0];

  if (!startingPitcher) {
    console.warn(`[playerDatabase] No pitchers found for team ${teamId}`);
    return [];
  }

  // Build lineup: 8 position players + pitcher at 9
  // IMPORTANT: Must fill all 8 defensive positions (C, 1B, 2B, 3B, SS, LF, CF, RF)
  const positionPlayers = starters.filter(p => !p.isPitcher);

  // First, ensure we have exactly one player at each required position
  const requiredPositions: Position[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
  const lineupByPosition = new Map<Position, PlayerData>();

  // Assign players to their primary positions first
  for (const pos of requiredPositions) {
    const playerAtPos = positionPlayers.find(p =>
      p.primaryPosition === pos && !Array.from(lineupByPosition.values()).includes(p)
    );
    if (playerAtPos) {
      lineupByPosition.set(pos, playerAtPos);
    }
  }

  // Fill any missing positions with players who can play there (secondary position)
  for (const pos of requiredPositions) {
    if (!lineupByPosition.has(pos)) {
      const playerWithSecondary = positionPlayers.find(p =>
        p.secondaryPosition === pos && !Array.from(lineupByPosition.values()).includes(p)
      );
      if (playerWithSecondary) {
        lineupByPosition.set(pos, playerWithSecondary);
      }
    }
  }

  // Convert to array maintaining position coverage
  const lineupPlayers = Array.from(lineupByPosition.values());

  // Reorder for typical lineup: speed at top, power in 3-5
  const lineup: PlayerData[] = [];
  const byPower = [...lineupPlayers].sort((a, b) =>
    (b.batterRatings?.power ?? 0) - (a.batterRatings?.power ?? 0)
  );
  const bySpeed = [...lineupPlayers].sort((a, b) =>
    (b.batterRatings?.speed ?? 0) - (a.batterRatings?.speed ?? 0)
  );

  // Simple approach: alternate speed and power
  // 1, 2 - speed guys
  // 3, 4, 5 - power guys
  // 6, 7, 8 - remaining
  const used = new Set<string>();

  // Spots 1-2: fastest players
  for (const p of bySpeed) {
    if (!used.has(p.id) && lineup.length < 2) {
      lineup.push(p);
      used.add(p.id);
    }
  }

  // Spots 3-5: power hitters
  for (const p of byPower) {
    if (!used.has(p.id) && lineup.length < 5) {
      lineup.push(p);
      used.add(p.id);
    }
  }

  // Spots 6-8: remaining
  for (const p of lineupPlayers) {
    if (!used.has(p.id) && lineup.length < 8) {
      lineup.push(p);
      used.add(p.id);
    }
  }

  // Convert to game format
  const gameLineup: GameLineupSlot[] = lineup.map((p, idx) => ({
    id: p.id,
    name: p.name,
    position: p.primaryPosition,
    grade: p.overall,
    jerseyNumber: idx + 1,  // Placeholder - would need real jersey numbers
  }));

  // Add pitcher at position 9
  gameLineup.push({
    id: startingPitcher.id,
    name: startingPitcher.name,
    position: 'P',
    grade: startingPitcher.overall,
    jerseyNumber: 9,
  });

  return gameLineup;
}

/**
 * Generate bench for a team (non-starters + bullpen)
 */
export function generateTeamBench(teamId: string, startingPitcherId?: string): GameBenchPlayer[] {
  const bench = getTeamBench(teamId);
  const rotation = getTeamRotation(teamId);
  const bullpen = getTeamBullpen(teamId);

  // Starting pitcher is NOT on bench
  const availablePitchers = [...rotation, ...bullpen].filter(p =>
    p.id !== startingPitcherId
  );

  const benchPlayers: GameBenchPlayer[] = [];

  // Add bench position players
  for (const p of bench) {
    const positions: Position[] = [p.primaryPosition];
    if (p.secondaryPosition) {
      positions.push(p.secondaryPosition);
    }

    benchPlayers.push({
      playerId: p.id,
      playerName: p.name,
      positions,
      isAvailable: true,
      batterHand: p.bats,
    });
  }

  // Add available pitchers
  for (const p of availablePitchers) {
    benchPlayers.push({
      playerId: p.id,
      playerName: p.name,
      positions: ['P'],
      isAvailable: true,
      batterHand: p.bats,
    });
  }

  return benchPlayers;
}
