import type { ScoutArea } from '../utils/prospectScoutingDraftEngine';

export type ScoutConfidenceBand = 3 | 5 | 7;

export interface FarmArchetypeScoutConfidenceRow {
  archetypeKey: string;
  bands: Record<ScoutArea, ScoutConfidenceBand>;
  rationale: string;
}

function row(
  archetypeKey: string,
  bands: Record<ScoutArea, ScoutConfidenceBand>,
  rationale: string,
): FarmArchetypeScoutConfidenceRow {
  return { archetypeKey, bands, rationale };
}

export const FARM_ARCHETYPE_SCOUT_CONFIDENCE: Record<string, FarmArchetypeScoutConfidenceRow> = {
  'murderers-row': row('murderers-row', { power: 3, contact: 3, speed: 7, fielding: 5, arm: 5, velocity: 5, junk: 5, accuracy: 5 }, "Org scouts obsess over bat-to-ball pop and hit tool; a Murderers' Row team never ran, so foot-speed reads were never sharpened."),
  'bomba-squad': row('bomba-squad', { power: 3, contact: 7, speed: 7, fielding: 5, arm: 5, velocity: 5, junk: 5, accuracy: 5 }, 'Everything is trained on raw power projection; contact and speed reads get no attention on a swing-hard-or-miss profile.'),
  'bash-brothers': row('bash-brothers', { power: 3, contact: 5, speed: 5, fielding: 5, arm: 3, velocity: 5, junk: 5, accuracy: 7 }, "Sharp on raw power and arm strength; this org has no real process for handicapping a pitcher's command, starter or reliever."),
  whiteyball: row('whiteyball', { power: 7, contact: 5, speed: 3, fielding: 3, arm: 5, velocity: 5, junk: 5, accuracy: 5 }, 'Speed and glove work are read precisely; power grading is fuzzy because this org has never drafted for it.'),
  'go-go-small-ball': row('go-go-small-ball', { power: 7, contact: 3, speed: 5, fielding: 3, arm: 5, velocity: 5, junk: 5, accuracy: 5 }, 'Bat-to-ball skill and defensive actions are the scouting strength; raw power is guesswork the org rarely needs.'),
  'dead-ball-suppressors': row('dead-ball-suppressors', { power: 7, contact: 3, speed: 5, fielding: 5, arm: 5, velocity: 7, junk: 3, accuracy: 5 }, "Finesse-pitching feel and contact hitting are precise; raw power and bullpen velocity are outside the org's lens."),
  'billy-ball-burners': row('billy-ball-burners', { power: 7, contact: 5, speed: 3, fielding: 5, arm: 5, velocity: 5, junk: 5, accuracy: 7 }, "Foot speed is read sharply; both power projection and a starter's command are guesswork here."),
  'junkball-surgeons': row('junkball-surgeons', { power: 7, contact: 5, speed: 5, fielding: 5, arm: 5, velocity: 7, junk: 3, accuracy: 3 }, 'Command and off-speed feel are the specialty; raw arm strength (velocity) and power get poor reads.'),
  flamethrowers: row('flamethrowers', { power: 7, contact: 7, speed: 5, fielding: 5, arm: 5, velocity: 3, junk: 5, accuracy: 5 }, "The radar-gun read on velocity is dead-on; no real process for grading a bat's power or contact."),
  'nasty-boys': row('nasty-boys', { power: 5, contact: 5, speed: 5, fielding: 5, arm: 5, velocity: 3, junk: 5, accuracy: 7 }, "Reads a reliever's velocity sharply; has never had a handle on command grades."),
  'hdh-royals': row('hdh-royals', { power: 7, contact: 5, speed: 3, fielding: 5, arm: 5, velocity: 5, junk: 5, accuracy: 3 }, "Bullpen command and team speed are read with confidence; the org has no real feel for a hitter's raw power. (Accuracy conflict resolved to boost - see section 2.)"),
  'the-opener': row('the-opener', { power: 5, contact: 5, speed: 5, fielding: 5, arm: 5, velocity: 3, junk: 3, accuracy: 7 }, "Built to evaluate short-burst stuff - velocity and arsenal depth; a starter's command projection is where the process breaks down. (Velocity conflict resolved to boost - see section 2.)"),
  'the-oriole-way': row('the-oriole-way', { power: 5, contact: 5, speed: 7, fielding: 3, arm: 5, velocity: 7, junk: 5, accuracy: 3 }, "Glove work and a starter's command are read with precision; team speed and reliever velocity are unfamiliar territory."),
  'shift-era-suppressors': row('shift-era-suppressors', { power: 5, contact: 7, speed: 5, fielding: 3, arm: 5, velocity: 3, junk: 5, accuracy: 7 }, 'Defense and a starter\'s velocity are graded sharply; contact hitting and bullpen command are the blind spot.'),
  'big-red-machine': row('big-red-machine', { power: 5, contact: 3, speed: 5, fielding: 3, arm: 5, velocity: 7, junk: 5, accuracy: 7 }, "Bat-to-ball and defensive value are nailed; the rotation's stuff and command are the org's known weak spot."),
  'hit-em-where-they-aint': row('hit-em-where-they-aint', { power: 7, contact: 3, speed: 3, fielding: 5, arm: 5, velocity: 5, junk: 5, accuracy: 5 }, "Contact and speed are bread and butter; a power grade is guesswork since it's never what they draft for."),
  'toolsy-burners': row('toolsy-burners', { power: 3, contact: 5, speed: 3, fielding: 7, arm: 5, velocity: 5, junk: 5, accuracy: 7 }, 'The eye is trained on raw power and foot speed; pitcher command and infield/outfield actions get a shrug.'),
  'cannon-corps': row('cannon-corps', { power: 7, contact: 5, speed: 7, fielding: 3, arm: 3, velocity: 5, junk: 5, accuracy: 5 }, 'Arm and glove grades are precise; both power and speed reads are fuzzy - this org drafts for defense, not tools.'),
  'gap-to-gap': row('gap-to-gap', { power: 3, contact: 3, speed: 5, fielding: 5, arm: 5, velocity: 7, junk: 5, accuracy: 7 }, "Contact and raw pop are read precisely; no real feel for a pitcher's command or a reliever's fastball."),
  'web-gems': row('web-gems', { power: 7, contact: 7, speed: 5, fielding: 3, arm: 3, velocity: 5, junk: 5, accuracy: 5 }, "Fielding and arm evaluation is the org's whole identity; power and contact grades are little more than a guess."),
  'launch-and-leather': row('launch-and-leather', { power: 3, contact: 5, speed: 5, fielding: 3, arm: 5, velocity: 5, junk: 5, accuracy: 7 }, 'Sharp on power bats and defensive actions; pitching command (rotation or bullpen alike) is a blind spot.'),
  'no-glove-offense': row('no-glove-offense', { power: 3, contact: 3, speed: 5, fielding: 7, arm: 7, velocity: 5, junk: 5, accuracy: 5 }, "Scouts grade the bat with confidence; glove and arm evaluations are an afterthought - the org has never cared."),
  'wheels-and-cannons': row('wheels-and-cannons', { power: 7, contact: 5, speed: 3, fielding: 5, arm: 3, velocity: 5, junk: 5, accuracy: 5 }, "Speed and arm strength are read cleanly; no real feel for a hitter's raw power."),
  'rangy-defenders': row('rangy-defenders', { power: 7, contact: 7, speed: 3, fielding: 3, arm: 3, velocity: 5, junk: 5, accuracy: 5 }, 'Speed, arm, and glove all get precise reads from a defense-first org; the bat is scouted blind.'),
};

export function scoutConfidenceBandForArea(
  farmArchetypeKey: string | undefined,
  area: ScoutArea,
): ScoutConfidenceBand {
  if (!farmArchetypeKey) return 5;
  return FARM_ARCHETYPE_SCOUT_CONFIDENCE[farmArchetypeKey]?.bands[area] ?? 5;
}
