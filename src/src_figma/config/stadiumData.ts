// Stadium data mapping teams to their home stadiums
export const TEAM_STADIUMS: Record<string, string> = {
  "Tigers": "Tiger Stadium",
  "Sox": "Sox Field",
  "Bears": "Bear Den",
  "Crocs": "Croc Pit",
  "Moonstars": "Moon Base",
  "Nemesis": "Nemesis Arena",
  "Herbisaurs": "Herbi Park",
  "Wild Pigs": "Pig Pen",
  "Beewolves": "Hive Stadium",
  "Moose": "Moose Lodge"
};

export function getStadiumForTeam(teamName: string): string {
  return TEAM_STADIUMS[teamName] || "Unknown Stadium";
}
