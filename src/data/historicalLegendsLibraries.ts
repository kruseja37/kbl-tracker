import type { HistoricalLegendProfileType } from './historicalLegendsAppData';

export const HISTORICAL_LEGENDS_CORE_PLAYER_COUNT = 242;
export const HISTORICAL_LEGENDS_LIBRARY_TEAM_COUNT = 11;

export interface HistoricalLegendsLibraryDefinition {
  profileType: HistoricalLegendProfileType;
  leagueId: string;
  name: string;
  color: string;
}

export const HISTORICAL_LEGENDS_LIBRARY_DEFINITIONS: readonly HistoricalLegendsLibraryDefinition[] = [
  {
    profileType: 'Draft Pool',
    leagueId: 'legends-library-draft',
    name: 'Legends Library — Draft',
    color: '#C8A94E',
  },
  {
    profileType: 'Career',
    leagueId: 'legends-library-career',
    name: 'Legends Library — Career',
    color: '#357A5B',
  },
  {
    profileType: 'Peak',
    leagueId: 'legends-library-peak',
    name: 'Legends Library — Peak',
    color: '#7A3F35',
  },
] as const;

export interface HistoricalLegendsLibraryCohort {
  slug: string;
  name: string;
  abbreviation: string;
  primary: string;
  secondary: string;
  playerNames: readonly string[];
}

/**
 * JK's original 242-player Legends list. The first eight rosters preserve the
 * source game's team names and order; the final 66 are kept in their supplied
 * order and split into three stable 22-player source shelves.
 */
export const HISTORICAL_LEGENDS_LIBRARY_COHORTS: readonly HistoricalLegendsLibraryCohort[] = [
  {
    slug: 'boomers', name: 'Boomers', abbreviation: 'BOO', primary: '#6B3E26', secondary: '#F2D16B',
    playerNames: [
      'Hank Aaron', 'Dick Allen', 'Vida Blue', 'Cecil Cooper', 'Tom Herr', 'Tommy John',
      'Carney Lansford', 'Frank Linzy', 'Tony Perez', 'Boog Powell', 'Phil Regan', 'Jim Rice',
      'Bruce Sutter', 'Garry Templeton', 'Luis Tiant', 'Willie Wilson', 'Tom Burgmeier',
      'George Foster', 'Tom Seaver', 'Alan Trammell', 'Gene Tenace', 'Nolan Ryan',
    ],
  },
  {
    slug: 'empire', name: 'Empire', abbreviation: 'EMP', primary: '#3A3A48', secondary: '#D6C7A1',
    playerNames: [
      'Rich Aurilia', 'Jeff Bagwell', 'Grant Balfour', 'Orlando Cabrera', 'Matt Cain', 'Jason Giambi',
      'Andruw Jones', 'Derek Lowe', 'Roy Oswalt', 'Mike Piazza', 'Tim Salmon', 'Billy Wagner',
      'Jose Bautista', 'Troy Glaus', 'Luis Gonzalez', 'Cliff Lee', 'Grady Sizemore', 'Miguel Batista',
      'Mark Buehrle', 'Keith Foulke', 'Placido Polanco', 'Brad Ausmus',
    ],
  },
  {
    slug: 'joyriders', name: 'Joyriders', abbreviation: 'JOY', primary: '#B23A48', secondary: '#F7D774',
    playerNames: [
      'Rick Aguilera', 'Paul Assenmacher', 'George Brett', 'Brett Butler', 'Chili Davis', 'Dwight Evans',
      'John Franco', 'Ron Gant', 'Tom Glavine', 'Mark Grace', 'Chuck Knoblauch', 'Javy Lopez',
      'Tino Martinez', 'Edgar Martinez', 'Dennis Martinez', 'Bret Saberhagen', 'Greg Vaughn',
      'Robin Yount', 'Jeff Reardon', 'Mike Hampton', 'Sandy Alomar Jr.', 'Troy Percival',
    ],
  },
  {
    slug: 'mammotanks', name: 'Mammotanks', abbreviation: 'MAM', primary: '#3F5A66', secondary: '#D8B46B',
    playerNames: [
      'Rick Ankiel', 'Bronson Arroyo', 'Ryan Braun', 'Carl Crawford', 'Ray Durham',
      'Vladimir Guerrero', 'Torii Hunter', 'Barry Larkin', 'Mark Loretta', 'Joe Mauer',
      'Fred McGriff', 'Jamie Moyer', 'Kyle Seager', 'David Ortiz', 'Brian Wilson', 'Bartolo Colon',
      'Joe Nathan', 'Johnny Damon', 'Mike Napoli', 'Huston Street', 'LaTroy Hawkins', 'Ryan Dempster',
    ],
  },
  {
    slug: 'originators', name: 'Originators', abbreviation: 'ORG', primary: '#1F4B63', secondary: '#E0C568',
    playerNames: [
      'Ernie Banks', 'Orlando Cepeda', 'Bob Feller', 'Rollie Fingers', 'Steve Garvey', 'Dick Hall',
      'Tippy Martinez', 'Red Schoendienst', 'Jim Sundberg', 'Juan Marichal', 'Eddie Mathews',
      'Reggie Smith', 'Willie Mays', 'Billy Williams', 'Bob Locker', 'Bill Campbell', 'Johnny Bench',
      'Don Sutton', 'Bucky Dent', 'Babe Ruth', 'Dave Parker', 'Chris Speier',
    ],
  },
  {
    slug: 'rakers', name: 'Rakers', abbreviation: 'RAK', primary: '#8A3B2E', secondary: '#E5B95C',
    playerNames: [
      'Mike Cameron', 'Carlos Delgado', 'Jeff Fassero', 'Eric Gagne', 'Orlando Hudson', 'Jason Kendall',
      'John Olerud', 'A.J. Pierzynski', 'Dave Stieb', 'Jered Weaver', 'Brandon Webb', 'Matt Williams',
      'Mike Timlin', 'Lee Smith', 'J.J. Putz', 'Jose Valentin', 'Harold Baines', 'Mike Mussina',
      'Mark Ellis', 'Ellis Burks', 'Cliff Floyd', 'Curtis Granderson',
    ],
  },
  {
    slug: 'spirit', name: 'Spirit', abbreviation: 'SPI', primary: '#315D4B', secondary: '#D9C86B',
    playerNames: [
      'Brady Anderson', 'Chad Bradford', 'Will Clark', 'Royce Clayton', 'Jim Edmonds', 'Pat Hentgen',
      'Roberto Hernandez', 'Mike Jackson', 'Randy Johnson', 'Paul Konerko', 'Paul Molitor',
      'Jeff Montgomery', 'Brad Radke', 'Reggie Sanders', 'Terry Steinbach', 'Kerry Wood',
      'Jorge Posada', 'Steve Finley', 'Devon White', 'Bret Boone', 'Craig Counsell', 'Al Leiter',
    ],
  },
  {
    slug: 'thrillers', name: 'Thrillers', abbreviation: 'THR', primary: '#553A65', secondary: '#D7B45F',
    playerNames: [
      'Jesse Barfield', 'Steve Bedrosian', 'Gary Carter', 'Jack Clark', 'Andre Dawson', 'Kirk Gibson',
      'Goose Gossage', 'Ron Guidry', 'Tom Henke', 'Keith Hernandez', 'Al Holland', 'John Kruk',
      'Mike Krukow', 'Jack Morris', 'Willie Randolph', 'Steve Sax', 'Mike Schmidt', 'Mike Scioscia',
      'Ozzie Smith', 'Frank Tanana', 'Bert Blyleven', 'Gary Gaetti',
    ],
  },
  {
    slug: 'trailblazers', name: 'Trailblazers', abbreviation: 'TRB', primary: '#93432B', secondary: '#F0C55B',
    playerNames: [
      'A.J. Burnett', 'Adam Dunn', 'Adam LaRoche', 'Al Oliver', 'Alex Gordon', 'Amos Otis',
      'Bill Russell', 'Brad Ziegler', 'Brian Harper', 'Brian Roberts', 'Butch Wynegar', 'Chris Bosio',
      'Daniel Murphy', 'Darrell Evans', 'Dave Righetti', 'David Justice', 'Don Aase', 'Eddie Guardado',
      'Eric Davis', 'Eric Young', 'Frank Viola', 'George Bell',
    ],
  },
  {
    slug: 'firebrands', name: 'Firebrands', abbreviation: 'FIR', primary: '#A32F2F', secondary: '#F2A93B',
    playerNames: [
      'Greg Gagne', 'Greg Harris', 'Greg Minton', 'Gregg Olson', 'Jack McDowell', 'Jason Bay',
      'Jason Isringhausen', 'Jay Bell', 'Jay Buhner', 'Jeff Nelson', 'Jeff Shaw', 'Joe Carter',
      'Joe Coleman', 'John Candelaria', 'John Hiller', 'John Tudor', 'John Valentin', 'Jose Cruz',
      'Justin Morneau', 'Kevin Millwood', 'Kevin Youkilis', 'Mark Langston',
    ],
  },
  {
    slug: 'renegades', name: 'Renegades', abbreviation: 'REN', primary: '#2D4E72', secondary: '#D9B657',
    playerNames: [
      'Marlon Byrd', 'Mike Bordick', 'Mike Lieberthal', 'Orlando Hernandez', 'Rafael Betancourt',
      'Randy Velarde', 'Rick Burleson', 'Rick Dempsey', 'Rick Reuschel', 'Rick Sutcliffe', 'Robb Nen',
      'Ron Cey', 'Ron Santo', 'Ryan Howard', 'Sal Bando', 'Scott Hatteberg', 'Shane Victorino',
      'Shawn Green', 'Tim McCarver', 'Toby Harrah', 'Todd Hundley', 'Wally Joyner',
    ],
  },
] as const;

const LIBRARY_IDS = new Set(HISTORICAL_LEGENDS_LIBRARY_DEFINITIONS.map((library) => library.leagueId));

export function isHistoricalLegendsLibraryId(id: string): boolean {
  return LIBRARY_IDS.has(id);
}

export function historicalLegendsLibraryForProfile(
  profileType: HistoricalLegendProfileType,
): HistoricalLegendsLibraryDefinition {
  const library = HISTORICAL_LEGENDS_LIBRARY_DEFINITIONS.find((candidate) => candidate.profileType === profileType);
  if (!library) throw new Error(`No Historical Legends source library exists for ${profileType}.`);
  return library;
}

export function historicalLegendsLibraryTeamId(leagueId: string, cohortSlug: string): string {
  return `${leagueId}:${cohortSlug}`;
}

const allCoreNames = HISTORICAL_LEGENDS_LIBRARY_COHORTS.flatMap((cohort) => cohort.playerNames);
if (
  HISTORICAL_LEGENDS_LIBRARY_COHORTS.length !== HISTORICAL_LEGENDS_LIBRARY_TEAM_COUNT
  || allCoreNames.length !== HISTORICAL_LEGENDS_CORE_PLAYER_COUNT
  || new Set(allCoreNames).size !== HISTORICAL_LEGENDS_CORE_PLAYER_COUNT
  || HISTORICAL_LEGENDS_LIBRARY_COHORTS.some((cohort) => cohort.playerNames.length !== 22)
) {
  throw new Error('Historical Legends source-library cohorts must be 11 unique 22-player teams.');
}
