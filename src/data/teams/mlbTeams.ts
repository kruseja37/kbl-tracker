/**
 * Major League Baseball Teams
 *
 * All 30 MLB teams as they appear in SMB4 with their basic info.
 * Players are stored separately and linked via rosterIds.
 * Parks are IN-GAME names from SMB4 screenshots (not real-world stadiums).
 */

import type { TeamData } from '../playerDatabase';

// ============================================
// AL EAST
// ============================================

export const BLUE_JAYS: TeamData = {
  id: 'blue-jays',
  name: 'Toronto Blue Jays',
  homePark: 'Stade Royale',
  chemistry: 'SPIRITED',
  primaryColor: '#134A8E',  // Blue
  secondaryColor: '#1D2D5C',  // Navy
  rosterIds: ['tor-hudson', 'tor-delgado', 'tor-welch', 'tor-bautista', 'tor-white', 'tor-yamamoto', 'tor-carter', 'tor-felix', 'tor-siamous', 'tor-hurst', 'tor-olerud', 'tor-bell', 'tor-barfield', 'tor-stieb', 'tor-dean', 'tor-hentgen', 'tor-bumgalow', 'tor-nguyen', 'tor-henke', 'tor-bonilla', 'tor-newman', 'tor-dawson'],
  leagueId: 'mlb-al'
};

export const YANKEES: TeamData = {
  id: 'yankees',
  name: 'New York Yankees',
  homePark: "Founder's Field",
  chemistry: 'DISCIPLINED',
  primaryColor: '#003087',  // Navy Blue
  secondaryColor: '#FFFFFF',  // White
  rosterIds: ['nyy-dent', 'nyy-tooley', 'nyy-charles', 'nyy-ruth', 'nyy-jeter', 'nyy-berra', 'nyy-williams', 'nyy-baseball', 'nyy-velarde', 'nyy-posada', 'nyy-randolph', 'nyy-pierce', 'nyy-garcia', 'nyy-pettitte', 'nyy-rawner', 'nyy-sweet', 'nyy-hernandez', 'nyy-guidry', 'nyy-righetti', 'nyy-duarte', 'nyy-gossage', 'nyy-rivera'],
  leagueId: 'mlb-al'
};

export const ORIOLES: TeamData = {
  id: 'orioles',
  name: 'Baltimore Orioles',
  homePark: "Whacker's Wheel",
  chemistry: 'GRITTY',
  primaryColor: '#DF4601',  // Orange
  secondaryColor: '#000000',  // Black
  rosterIds: ['bal-gustavson', 'bal-dempsey', 'bal-hanson', 'bal-powell', 'bal-mateo', 'bal-everdale', 'bal-ripken', 'bal-sherwood', 'bal-anderson', 'bal-roberts', 'bal-robinson', 'bal-ashe', 'bal-henderson', 'bal-mussina', 'bal-bradish', 'bal-rodriguez', 'bal-bullock', 'bal-hall', 'bal-camacho', 'bal-olson', 'bal-martinez', 'bal-bautista'],
  leagueId: 'mlb-al'
};

export const RAYS: TeamData = {
  id: 'rays',
  name: 'Tampa Bay Rays',
  homePark: 'Bingata Bowl',
  chemistry: 'CRAFTY',
  primaryColor: '#092C5C',  // Navy
  secondaryColor: '#8FBCE6',  // Light Blue
  rosterIds: ['tbr-crawford', 'tbr-phillips', 'tbr-mccall', 'tbr-hale', 'tbr-quinn', 'tbr-turnpike', 'tbr-cardenas', 'tbr-boggs', 'tbr-trejo', 'tbr-fox', 'tbr-moore', 'tbr-henson', 'tbr-hudson', 'tbr-aitken', 'tbr-wood', 'tbr-mckinney', 'tbr-walton', 'tbr-faulkner', 'tbr-frazier', 'tbr-newton', 'tbr-ellison', 'tbr-balfour'],
  leagueId: 'mlb-al'
};

export const RED_SOX: TeamData = {
  id: 'red-sox',
  name: 'Boston Red Sox',
  homePark: "Founder's Field",
  chemistry: 'SPIRITED',
  primaryColor: '#BD3039',  // Red
  secondaryColor: '#0C2340',  // Navy
  rosterIds: ['bos-powers', 'bos-damon', 'bos-ortiz', 'bos-valentin', 'bos-combs', 'bos-rice', 'bos-larson', 'bos-youkilis', 'bos-burleson', 'bos-hatteberg', 'bos-ocharijo', 'bos-smith', 'bos-evans', 'bos-clemens', 'bos-lamb', 'bos-muscles', 'bos-tiant', 'bos-lowe', 'bos-dempster', 'bos-harris', 'bos-timlin', 'bos-burgmeier'],
  leagueId: 'mlb-al'
};

// ============================================
// AL CENTRAL
// ============================================

export const WHITE_SOX: TeamData = {
  id: 'white-sox',
  name: 'Chicago White Sox',
  homePark: 'Golden Field',
  chemistry: 'GRITTY',
  primaryColor: '#27251F',  // Black
  secondaryColor: '#C4CED4',  // Silver
  rosterIds: ['cws-konerko', 'cws-valentin', 'cws-thomas', 'cws-durham', 'cws-baxter', 'cws-gobbleson', 'cws-jackson', 'cws-ruiz', 'cws-pierzynski', 'cws-atkinson', 'cws-hardin', 'cws-mulberry', 'cws-baines', 'cws-buehrle', 'cws-schneider', 'cws-turncoat', 'cws-mcdowell', 'cws-john', 'cws-sardi', 'cws-foulke', 'cws-locker', 'cws-hernandez'],
  leagueId: 'mlb-al'
};

export const TWINS: TeamData = {
  id: 'twins',
  name: 'Minnesota Twins',
  homePark: 'Battery Bay',
  chemistry: 'SPIRITED',
  primaryColor: '#002B5C',  // Navy
  secondaryColor: '#D31145',  // Red
  rosterIds: ['min-morse', 'min-mauer', 'min-puckett', 'min-gonzales', 'min-sandoval', 'min-morneau', 'min-freeman', 'min-gaetti', 'min-gagne', 'min-wynegar', 'min-buffins', 'min-knobauch', 'min-hunter', 'min-blyleven', 'min-radke', 'min-viola', 'min-rhymes', 'min-aguilera', 'min-whitehead', 'min-campbell', 'min-guardado', 'min-nathan'],
  leagueId: 'mlb-al'
};

export const INDIANS: TeamData = {
  id: 'indians',
  name: 'Cleveland Indians',  // Note: Now Guardians, but SMB4 uses Indians
  homePark: 'Motor Yard',
  chemistry: 'DISCIPLINED',
  primaryColor: '#00385D',  // Navy
  secondaryColor: '#E50022',  // Red
  rosterIds: ['cle-shepherd', 'cle-dejesus', 'cle-alomar', 'cle-sizemore', 'cle-hopkins', 'cle-rehan', 'cle-marino', 'cle-quan', 'cle-bernard', 'cle-eliconnell', 'cle-yates', 'cle-shambles', 'cle-avery', 'cle-feller', 'cle-colon', 'cle-lee', 'cle-burr', 'cle-sandman', 'cle-betancourt', 'cle-parra', 'cle-assenmaker', 'cle-donovan'],
  leagueId: 'mlb-al'
};

export const ROYALS: TeamData = {
  id: 'royals',
  name: 'Kansas City Royals',
  homePark: 'Peril Point',
  chemistry: 'SPIRITED',
  primaryColor: '#004687',  // Royal Blue
  secondaryColor: '#BD9B60',  // Gold
  rosterIds: ['kcr-scottish', 'kcr-glover', 'kcr-jackson', 'kcr-brett', 'kcr-brennan', 'kcr-witt', 'kcr-otis', 'kcr-wilson', 'kcr-crosby', 'kcr-wade', 'kcr-young', 'kcr-gordon', 'kcr-booper', 'kcr-ramsey', 'kcr-armstrong', 'kcr-saberhagen', 'kcr-griffith', 'kcr-loins', 'kcr-montgomery', 'kcr-butler', 'kcr-garner', 'kcr-serrano'],
  leagueId: 'mlb-al'
};

export const TIGERS: TeamData = {
  id: 'tigers',
  name: 'Detroit Tigers',
  homePark: 'Motor Yard',
  chemistry: 'GRITTY',
  primaryColor: '#0C2340',  // Navy
  secondaryColor: '#FA4616',  // Orange
  rosterIds: ['det-trammell', 'det-cobb', 'det-prairie', 'det-fielder', 'det-gibson', 'det-polanco', 'det-granderson', 'det-meza', 'det-townsend', 'det-johnson', 'det-wiggins', 'det-moses', 'det-dunn', 'det-verlander', 'det-tanana', 'det-morris', 'det-chanel', 'det-hiller', 'det-coleman', 'det-growes', 'det-guzman', 'det-boyle'],
  leagueId: 'mlb-al'
};

// ============================================
// AL WEST
// ============================================

export const MARINERS: TeamData = {
  id: 'mariners',
  name: 'Seattle Mariners',
  homePark: 'Emerald Diamond',
  chemistry: 'CRAFTY',
  primaryColor: '#0C2C56',  // Navy
  secondaryColor: '#005C5C',  // Teal
  rosterIds: ['sea-tmartinez', 'sea-gonzalez', 'sea-griffey', 'sea-emartinez', 'sea-boone', 'sea-cameron', 'sea-seager', 'sea-buhner', 'sea-lara', 'sea-conrad', 'sea-tabler', 'sea-hall', 'sea-hiwanase', 'sea-moyer', 'sea-manning', 'sea-bosio', 'sea-drapes', 'sea-jackson', 'sea-putz', 'sea-parks', 'sea-chan', 'sea-nelson'],
  leagueId: 'mlb-al'
};

export const ASTROS: TeamData = {
  id: 'astros',
  name: 'Houston Astros',
  homePark: 'The Corral',
  chemistry: 'DISCIPLINED',
  primaryColor: '#002D62',  // Navy
  secondaryColor: '#EB6E1F',  // Orange
  rosterIds: ['ast-biggio', 'ast-ausmus', 'ast-knoggin', 'ast-bagwell', 'ast-ocean', 'ast-todd', 'ast-salinas', 'ast-cruz', 'ast-romero', 'ast-ryan', 'ast-owen', 'ast-ventura', 'ast-watts', 'ast-oswalt', 'ast-callahan', 'ast-wright', 'ast-hampton', 'ast-black', 'ast-meadows', 'ast-sanford', 'ast-trujillo', 'ast-wagner'],
  leagueId: 'mlb-al'
};

export const ANGELS: TeamData = {
  id: 'angels',
  name: 'California Angels',  // SMB4 uses historical name
  homePark: 'Swagger Center',
  chemistry: 'SPIRITED',
  primaryColor: '#BA0021',  // Red
  secondaryColor: '#003263',  // Navy
  rosterIds: ['ang-rogers', 'ang-esposito', 'ang-nepoli', 'ang-glaus', 'ang-joyner', 'ang-salmon', 'ang-cunningham', 'ang-davis', 'ang-gordon', 'ang-langston', 'ang-weaver', 'ang-bergenberg', 'ang-charleston', 'ang-kelly', 'ang-asse', 'ang-mcclure', 'ang-andersen', 'ang-percival', 'ang-scioscia', 'ang-perkins', 'ang-washington', 'ang-yates'],
  leagueId: 'mlb-al'
};

export const RANGERS: TeamData = {
  id: 'rangers',
  name: 'Texas Rangers',
  homePark: "Whacker's Wheel",
  chemistry: 'FIERY',
  primaryColor: '#003278',  // Blue
  secondaryColor: '#C0111F',  // Red
  rosterIds: ['tex-seager', 'tex-fielder', 'tex-hamilton', 'tex-sundberg', 'tex-swanson', 'tex-burger', 'tex-smith', 'tex-dixon', 'tex-langford', 'tex-clowers', 'tex-battre', 'tex-barrett', 'tex-byrd', 'tex-rubenstein', 'tex-helstrom', 'tex-ryan', 'tex-robirto', 'tex-ruiz', 'tex-torfington', 'tex-reilly', 'tex-megles', 'tex-avery'],
  leagueId: 'mlb-al'
};

export const ATHLETICS: TeamData = {
  id: 'athletics',
  name: 'Oakland Athletics',
  homePark: 'Tiger Den',
  chemistry: 'CRAFTY',
  primaryColor: '#003831',  // Green
  secondaryColor: '#EFB21E',  // Gold
  rosterIds: ['oak-henderson', 'oak-lansford', 'oak-javier', 'oak-giambi', 'oak-bando', 'oak-ellis', 'oak-tenace', 'oak-moss', 'oak-bordick', 'oak-blue', 'oak-decker', 'oak-kim', 'oak-odell', 'oak-steinbach', 'oak-cleneros', 'oak-gallegos', 'oak-lawrence', 'oak-eckersley', 'oak-morris', 'oak-street', 'oak-bradford', 'oak-fingers'],
  leagueId: 'mlb-al'
};

// ============================================
// NL EAST
// ============================================

export const MARLINS: TeamData = {
  id: 'marlins',
  name: 'Florida Marlins',  // SMB4 uses historical name
  homePark: 'El Viejo Stadium',
  chemistry: 'CRAFTY',
  primaryColor: '#00A3E0',  // Blue
  secondaryColor: '#EF3340',  // Red
  rosterIds: ['fla-ruiz', 'fla-sheffield', 'fla-thompson', 'fla-whitehead', 'fla-bburnett', 'fla-jefferson', 'fla-reefkiller', 'fla-osborne', 'fla-mclaughlin', 'fla-gaines', 'fla-counsell', 'fla-floyd', 'fla-campbell', 'fla-padilla', 'fla-castro', 'fla-ajburnett', 'fla-hubbard', 'fla-downhill', 'fla-mcpride', 'fla-estrada', 'fla-marsh', 'fla-bean'],
  leagueId: 'mlb-nl'
};

export const EXPOS: TeamData = {
  id: 'expos',
  name: 'Montreal Expos',  // Historical team in SMB4
  homePark: 'Stade Royale',
  chemistry: 'SPIRITED',
  primaryColor: '#003087',  // Blue
  secondaryColor: '#E4002B',  // Red
  rosterIds: ['mtl-cabrera', 'mtl-guerrero', 'mtl-dawson', 'mtl-laroche', 'mtl-raines', 'mtl-stephens', 'mtl-carter', 'mtl-terry', 'mtl-toosky', 'mtl-payne', 'mtl-speier', 'mtl-keatley', 'mtl-mahoney', 'mtl-sanchez', 'mtl-martinez', 'mtl-jackson', 'mtl-nielsen', 'mtl-fassero', 'mtl-reardon', 'mtl-shaffer', 'mtl-ponce', 'mtl-navarro'],
  leagueId: 'mlb-nl'
};

export const PHILLIES: TeamData = {
  id: 'phillies',
  name: 'Philadelphia Phillies',
  homePark: 'Motor Yard',
  chemistry: 'GRITTY',
  primaryColor: '#E81828',  // Red
  secondaryColor: '#002D72',  // Blue
  rosterIds: ['phi-rollins', 'phi-utley', 'phi-schmidt', 'phi-allen', 'phi-fineman', 'phi-salinas', 'phi-kruk', 'phi-victorino', 'phi-lieberthal', 'phi-roberts', 'phi-howard', 'phi-otay', 'phi-hopkins', 'phi-schilling', 'phi-ford', 'phi-acevedo', 'phi-takobe', 'phi-zimmerman', 'phi-kclayton', 'phi-oconnell', 'phi-beefy', 'phi-fischer'],
  leagueId: 'mlb-nl'
};

export const METS: TeamData = {
  id: 'mets',
  name: 'New York Mets',
  homePark: 'Peril Point',
  chemistry: 'SPIRITED',
  primaryColor: '#002D72',  // Blue
  secondaryColor: '#FF5910',  // Orange
  rosterIds: ['nym-howard', 'nym-strawberry', 'nym-piazza', 'nym-sloan', 'nym-murphy', 'nym-dickerson', 'nym-johnson', 'nym-hernandez', 'nym-hundley', 'nym-lange', 'nym-stubbs', 'nym-ashley', 'nym-turnbull', 'nym-seaver', 'nym-rasmusen', 'nym-whitaker', 'nym-massey', 'nym-leiter', 'nym-franco', 'nym-real', 'nym-reese', 'nym-myers'],
  leagueId: 'mlb-nl'
};

export const BRAVES: TeamData = {
  id: 'braves',
  name: 'Atlanta Braves',
  homePark: 'Lafayette Corner',
  chemistry: 'SPIRITED',
  primaryColor: '#CE1141',  // Red
  secondaryColor: '#13274F',  // Navy
  rosterIds: ['atl-lopez', 'atl-justice', 'atl-belliard', 'atl-cjones', 'atl-mcgriff', 'atl-ajones', 'atl-gant', 'atl-lemke', 'atl-blauser', 'atl-berryhill', 'atl-pendleton', 'atl-nixon', 'atl-aaron', 'atl-maddux', 'atl-glavine', 'atl-carson', 'atl-millwood', 'atl-oldham', 'atl-bedrosian', 'atl-carpenter', 'atl-herring', 'atl-wohlers'],
  leagueId: 'mlb-nl'
};

// ============================================
// NL CENTRAL
// ============================================

export const CARDINALS: TeamData = {
  id: 'cardinals',
  name: 'St. Louis Cardinals',
  homePark: 'Golden Field',
  chemistry: 'DISCIPLINED',
  primaryColor: '#C41E3A',  // Red
  secondaryColor: '#0C2340',  // Navy
  rosterIds: ['stl-anderson', 'stl-herr', 'stl-mcgwire', 'stl-mccarver', 'stl-molina', 'stl-smith', 'stl-ankiel', 'stl-hightower', 'stl-edmonds', 'stl-gibson', 'stl-tudor', 'stl-freeman', 'stl-polebean', 'stl-francis', 'stl-patrick', 'stl-isringhausen', 'stl-ortiz', 'stl-carter', 'stl-schoendienst', 'stl-lamente', 'stl-ivy', 'stl-fuller'],
  leagueId: 'mlb-nl'
};

export const REDS: TeamData = {
  id: 'reds',
  name: 'Cincinnati Reds',
  homePark: 'Emerald Diamond',
  chemistry: 'FIERY',
  primaryColor: '#C6011F',  // Red
  secondaryColor: '#000000',  // Black
  rosterIds: ['cin-dunn', 'cin-perez', 'cin-sanders', 'cin-foster', 'cin-vance', 'cin-larkin', 'cin-davis', 'cin-rose', 'cin-stadkleef', 'cin-bench', 'cin-delacruz', 'cin-migikko', 'cin-mara', 'cin-abbott', 'cin-sawyer', 'cin-arroyo', 'cin-givener', 'cin-parks', 'cin-cashmore', 'cin-olsen', 'cin-speciallo', 'cin-balls'],
  leagueId: 'mlb-nl'
};

export const BREWERS: TeamData = {
  id: 'brewers',
  name: 'Milwaukee Brewers',
  homePark: "Whacker's Wheel",
  chemistry: 'GRITTY',
  primaryColor: '#12284B',  // Navy
  secondaryColor: '#B6922E',  // Gold
  rosterIds: ['mil-yount', 'mil-baker', 'mil-braun', 'mil-kawaguchi', 'mil-bologne', 'mil-stevenson', 'mil-cooper', 'mil-loretta', 'mil-grant', 'mil-sampson', 'mil-moltor', 'mil-vaughn', 'mil-xiong', 'mil-ahmed', 'mil-arnold', 'mil-greenman', 'mil-holmes', 'mil-ocean', 'mil-salomon', 'mil-underwood', 'mil-trampleton', 'mil-kaboots'],
  leagueId: 'mlb-nl'
};

export const PIRATES: TeamData = {
  id: 'pirates',
  name: 'Pittsburgh Pirates',
  homePark: 'Peril Point',
  chemistry: 'GRITTY',
  primaryColor: '#27251F',  // Black
  secondaryColor: '#FDB827',  // Gold
  rosterIds: ['pit-clayton', 'pit-oliver', 'pit-parker', 'pit-aitken', 'pit-dingers', 'pit-bell', 'pit-clemente', 'pit-miles', 'pit-kendall', 'pit-harper', 'pit-hughes', 'pit-bay', 'pit-styke', 'pit-turnburner', 'pit-tobrek', 'pit-candelaria', 'pit-potts', 'pit-slider', 'pit-dempster', 'pit-cashmoor', 'pit-ospeciallo', 'pit-balls'],
  leagueId: 'mlb-nl'
};

export const CUBS: TeamData = {
  id: 'cubs',
  name: 'Chicago Cubs',
  homePark: 'Golden Field',
  chemistry: 'SPIRITED',
  primaryColor: '#0E3386',  // Blue
  secondaryColor: '#CC3433',  // Red
  rosterIds: ['chc-grace', 'chc-shaw', 'chc-sosa', 'chc-banks', 'chc-santo', 'chc-sax', 'chc-gomez', 'chc-sandberg', 'chc-hansteak', 'chc-reuschel', 'chc-wood', 'chc-sutcliffe', 'chc-misano', 'chc-dempster', 'chc-smith', 'chc-everbright', 'chc-regan', 'chc-sutter', 'chc-page', 'chc-bronx', 'chc-williams', 'chc-blaistman'],
  leagueId: 'mlb-nl'
};

// ============================================
// NL WEST
// ============================================

export const PADRES: TeamData = {
  id: 'padres',
  name: 'San Diego Padres',
  homePark: 'Ciudad de Colores',
  chemistry: 'CRAFTY',
  primaryColor: '#2F241D',  // Brown
  secondaryColor: '#FFC425',  // Gold
  rosterIds: ['sdp-portillo', 'sdp-gwynn', 'sdp-thomas', 'sdp-bryant', 'sdp-bennett', 'sdp-templeton', 'sdp-droop', 'sdp-buckley', 'sdp-duncan', 'sdp-plaintiff', 'sdp-bugby', 'sdp-rasputin', 'sdp-joner', 'sdp-shannon', 'sdp-rasmussen', 'sdp-green', 'sdp-conner', 'sdp-sanders', 'sdp-masters', 'sdp-nelson', 'sdp-riggings', 'sdp-oldman'],
  leagueId: 'mlb-nl'
};

export const DODGERS: TeamData = {
  id: 'dodgers',
  name: 'Los Angeles Dodgers',
  homePark: 'Swagger Center',
  chemistry: 'DISCIPLINED',
  primaryColor: '#005A9C',  // Blue
  secondaryColor: '#FFFFFF',  // White
  rosterIds: ['lad-bowen', 'lad-butler', 'lad-sax', 'lad-cey', 'lad-dielderino', 'lad-garvey', 'lad-green', 'lad-cervantes', 'lad-odor', 'lad-bruiser', 'lad-mckee', 'lad-russell', 'lad-houston', 'lad-sutton', 'lad-henderson', 'lad-anight', 'lad-intense', 'lad-cordova', 'lad-gale', 'lad-chapman', 'lad-shaw', 'lad-gagne'],
  leagueId: 'mlb-nl'
};

export const DIAMONDBACKS: TeamData = {
  id: 'diamondbacks',
  name: 'Arizona Diamondbacks',
  homePark: 'Red Rock Park',
  chemistry: 'FIERY',
  primaryColor: '#A71930',  // Red
  secondaryColor: '#E3D4AD',  // Sand
  rosterIds: ['ari-wilkinson', 'ari-alexander', 'ari-moon', 'ari-eal', 'ari-finley', 'ari-goldschmidt', 'ari-gonzalez', 'ari-rose', 'ari-chapman', 'ari-green', 'ari-barrera', 'ari-sawyer', 'ari-cisneros', 'ari-johnson', 'ari-daniel', 'ari-presidente', 'ari-webb', 'ari-chang', 'ari-newton', 'ari-molina', 'ari-ziegler', 'ari-heimlach'],
  leagueId: 'mlb-nl'
};

export const ROCKIES: TeamData = {
  id: 'rockies',
  name: 'Colorado Rockies',
  homePark: 'Big Sky Park',
  chemistry: 'GRITTY',
  primaryColor: '#33006F',  // Purple
  secondaryColor: '#C4CED4',  // Silver
  rosterIds: ['col-young', 'col-rodgers', 'col-louis', 'col-helton', 'col-dueker', 'col-idoya', 'col-dejesus', 'col-burks', 'col-walker', 'col-clark', 'col-tovar', 'col-blackmon', 'col-little', 'col-acession', 'col-burgess', 'col-odierio', 'col-iii', 'col-rhubarb', 'col-rasputin', 'col-hawkins', 'col-everett', 'col-rodrigl'],
  leagueId: 'mlb-nl'
};

export const GIANTS: TeamData = {
  id: 'giants',
  name: 'San Francisco Giants',
  homePark: 'El Viejo Stadium',
  chemistry: 'SPIRITED',
  primaryColor: '#FD5A1E',  // Orange
  secondaryColor: '#27251F',  // Black
  rosterIds: ['sfg-posey', 'sfg-toho', 'sfg-wclark', 'sfg-williams', 'sfg-jclark', 'sfg-bonds', 'sfg-cepeda', 'sfg-chase', 'sfg-mays', 'sfg-evans', 'sfg-aurilia', 'sfg-clayton', 'sfg-foster', 'sfg-marichal', 'sfg-gant', 'sfg-krukov', 'sfg-mogliarpe', 'sfg-mintan', 'sfg-lunzy', 'sfg-wilson', 'sfg-holland', 'sfg-hen'],
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
