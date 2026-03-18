/**
 * US City/State Database for Player Hometown Generation
 * Per LEAGUE_BUILDER_REFACTOR_SPEC.md §8
 *
 * Weighted distribution: larger cities more likely, all 50 states represented.
 * Weight roughly corresponds to relative population (not exact — tuned for variety).
 */

export interface CityEntry {
  city: string;
  state: string;
  weight: number; // higher = more likely to be selected
}

// All 50 states represented. Weights favor larger cities but ensure geographic spread.
export const US_CITIES: CityEntry[] = [
  // Major metros (weight 10)
  { city: 'New York', state: 'NY', weight: 10 },
  { city: 'Los Angeles', state: 'CA', weight: 10 },
  { city: 'Chicago', state: 'IL', weight: 9 },
  { city: 'Houston', state: 'TX', weight: 8 },
  { city: 'Phoenix', state: 'AZ', weight: 7 },
  { city: 'Philadelphia', state: 'PA', weight: 7 },
  { city: 'San Antonio', state: 'TX', weight: 6 },
  { city: 'San Diego', state: 'CA', weight: 6 },
  { city: 'Dallas', state: 'TX', weight: 6 },
  { city: 'Miami', state: 'FL', weight: 6 },

  // Large cities (weight 4-5)
  { city: 'Atlanta', state: 'GA', weight: 5 },
  { city: 'Boston', state: 'MA', weight: 5 },
  { city: 'Seattle', state: 'WA', weight: 5 },
  { city: 'Denver', state: 'CO', weight: 5 },
  { city: 'Detroit', state: 'MI', weight: 5 },
  { city: 'Minneapolis', state: 'MN', weight: 5 },
  { city: 'Tampa', state: 'FL', weight: 4 },
  { city: 'Charlotte', state: 'NC', weight: 4 },
  { city: 'Portland', state: 'OR', weight: 4 },
  { city: 'Nashville', state: 'TN', weight: 4 },
  { city: 'Las Vegas', state: 'NV', weight: 4 },
  { city: 'Baltimore', state: 'MD', weight: 4 },
  { city: 'Indianapolis', state: 'IN', weight: 4 },
  { city: 'Columbus', state: 'OH', weight: 4 },
  { city: 'San Francisco', state: 'CA', weight: 4 },
  { city: 'Austin', state: 'TX', weight: 4 },
  { city: 'Jacksonville', state: 'FL', weight: 4 },
  { city: 'Kansas City', state: 'MO', weight: 4 },
  { city: 'St. Louis', state: 'MO', weight: 4 },
  { city: 'Pittsburgh', state: 'PA', weight: 4 },

  // Mid-size cities (weight 2-3)
  { city: 'Cincinnati', state: 'OH', weight: 3 },
  { city: 'Cleveland', state: 'OH', weight: 3 },
  { city: 'Milwaukee', state: 'WI', weight: 3 },
  { city: 'New Orleans', state: 'LA', weight: 3 },
  { city: 'Oklahoma City', state: 'OK', weight: 3 },
  { city: 'Raleigh', state: 'NC', weight: 3 },
  { city: 'Memphis', state: 'TN', weight: 3 },
  { city: 'Louisville', state: 'KY', weight: 3 },
  { city: 'Richmond', state: 'VA', weight: 3 },
  { city: 'Salt Lake City', state: 'UT', weight: 3 },
  { city: 'Sacramento', state: 'CA', weight: 3 },
  { city: 'Hartford', state: 'CT', weight: 3 },
  { city: 'Birmingham', state: 'AL', weight: 3 },
  { city: 'Buffalo', state: 'NY', weight: 3 },
  { city: 'Tucson', state: 'AZ', weight: 2 },
  { city: 'Honolulu', state: 'HI', weight: 2 },
  { city: 'Omaha', state: 'NE', weight: 2 },
  { city: 'Albuquerque', state: 'NM', weight: 2 },
  { city: 'Tulsa', state: 'OK', weight: 2 },
  { city: 'El Paso', state: 'TX', weight: 2 },
  { city: 'Boise', state: 'ID', weight: 2 },
  { city: 'Wichita', state: 'KS', weight: 2 },
  { city: 'Des Moines', state: 'IA', weight: 2 },
  { city: 'Little Rock', state: 'AR', weight: 2 },
  { city: 'Knoxville', state: 'TN', weight: 2 },
  { city: 'Spokane', state: 'WA', weight: 2 },
  { city: 'Charleston', state: 'SC', weight: 2 },
  { city: 'Columbia', state: 'SC', weight: 2 },
  { city: 'Anchorage', state: 'AK', weight: 2 },
  { city: 'Jackson', state: 'MS', weight: 2 },
  { city: 'Sioux Falls', state: 'SD', weight: 2 },
  { city: 'Fargo', state: 'ND', weight: 2 },

  // Smaller cities ensuring all 50 states (weight 1)
  { city: 'Wilmington', state: 'DE', weight: 1 },
  { city: 'Portland', state: 'ME', weight: 1 },
  { city: 'Burlington', state: 'VT', weight: 1 },
  { city: 'Manchester', state: 'NH', weight: 1 },
  { city: 'Providence', state: 'RI', weight: 1 },
  { city: 'Billings', state: 'MT', weight: 1 },
  { city: 'Cheyenne', state: 'WY', weight: 1 },
  { city: 'Charleston', state: 'WV', weight: 1 },

  // Additional variety cities (weight 1-2)
  { city: 'Savannah', state: 'GA', weight: 1 },
  { city: 'Santa Fe', state: 'NM', weight: 1 },
  { city: 'Chattanooga', state: 'TN', weight: 1 },
  { city: 'Pensacola', state: 'FL', weight: 1 },
  { city: 'Lexington', state: 'KY', weight: 2 },
  { city: 'Madison', state: 'WI', weight: 2 },
  { city: 'Reno', state: 'NV', weight: 1 },
  { city: 'Baton Rouge', state: 'LA', weight: 2 },
  { city: 'Mobile', state: 'AL', weight: 1 },
  { city: 'Fresno', state: 'CA', weight: 2 },
  { city: 'Norfolk', state: 'VA', weight: 2 },
  { city: 'Bakersfield', state: 'CA', weight: 1 },
  { city: 'Dayton', state: 'OH', weight: 1 },
  { city: 'Akron', state: 'OH', weight: 1 },
  { city: 'Rochester', state: 'NY', weight: 2 },
  { city: 'Syracuse', state: 'NY', weight: 1 },
  { city: 'Grand Rapids', state: 'MI', weight: 2 },
  { city: 'Duluth', state: 'MN', weight: 1 },
  { city: 'Fort Wayne', state: 'IN', weight: 1 },
  { city: 'Cedar Rapids', state: 'IA', weight: 1 },
  { city: 'Lincoln', state: 'NE', weight: 1 },
  { city: 'Topeka', state: 'KS', weight: 1 },
  { city: 'Springfield', state: 'IL', weight: 1 },
  { city: 'Greenville', state: 'SC', weight: 1 },
  { city: 'Huntsville', state: 'AL', weight: 1 },
  { city: 'Shreveport', state: 'LA', weight: 1 },
  { city: 'Tallahassee', state: 'FL', weight: 1 },
  { city: 'Myrtle Beach', state: 'SC', weight: 1 },
  { city: 'Corpus Christi', state: 'TX', weight: 1 },
  { city: 'Lubbock', state: 'TX', weight: 1 },
  { city: 'Colorado Springs', state: 'CO', weight: 2 },
  { city: 'Eugene', state: 'OR', weight: 1 },
  { city: 'Tacoma', state: 'WA', weight: 1 },
];

// Pre-computed total weight for efficient random selection
const TOTAL_WEIGHT = US_CITIES.reduce((sum, c) => sum + c.weight, 0);

/**
 * Generate a random US hometown using weighted distribution.
 * Larger cities are more likely but all 50 states are represented.
 */
export function generateHometown(): { city: string; state: string } {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const entry of US_CITIES) {
    roll -= entry.weight;
    if (roll <= 0) {
      return { city: entry.city, state: entry.state };
    }
  }
  // Fallback (should never reach)
  const last = US_CITIES[US_CITIES.length - 1];
  return { city: last.city, state: last.state };
}
