import parksData from './smb4-parks.json';

export type WallHeight = 'low' | 'medium' | 'high';

export interface ParkDimensions {
  name: string;
  lf: number;
  lfWall: WallHeight;
  cf: number;
  cfWall: WallHeight;
  rf: number;
  rfWall: WallHeight;
}

const parks: ParkDimensions[] = parksData.parks.map((park) => ({
  ...park,
  lfWall: park.lfWall as WallHeight,
  cfWall: park.cfWall as WallHeight,
  rfWall: park.rfWall as WallHeight,
}));

const normalizedParkMap = new Map<string, ParkDimensions>(
  parks.map((park) => [park.name.toLowerCase(), park])
);

export const getParkByName = (name: string): ParkDimensions | undefined => {
  return normalizedParkMap.get(name.toLowerCase());
};

export const getAllParks = (): ParkDimensions[] => {
  return [...parks];
};

export const getParkNames = (): string[] => {
  return [...parks]
    .map((park) => park.name)
    .sort((a, b) => a.localeCompare(b));
};

export const getMinFenceDistance = (
  park: ParkDimensions,
  direction: 'lf' | 'cf' | 'rf'
): number => {
  return park[direction];
};

const sumDistances = (key: 'lf' | 'cf' | 'rf'): number =>
  parks.reduce((total, park) => total + park[key], 0);

export const LEAGUE_AVG_DIMENSIONS = {
  lf: Math.round(sumDistances('lf') / parks.length),
  cf: Math.round(sumDistances('cf') / parks.length),
  rf: Math.round(sumDistances('rf') / parks.length),
};
