/**
 * MLB Players Index
 * Exports all 30 MLB team rosters and a combined ALL_MLB_PLAYERS array.
 */

export { ANGELS_PLAYERS } from './angelsPlayers';
export { ASTROS_PLAYERS } from './astrosPlayers';
export { ATHLETICS_PLAYERS } from './athleticsPlayers';
export { BLUE_JAYS_PLAYERS } from './blueJaysPlayers';
export { BRAVES_PLAYERS } from './bravesPlayers';
export { BREWERS_PLAYERS } from './brewersPlayers';
export { CARDINALS_PLAYERS } from './cardinalsPlayers';
export { CUBS_PLAYERS } from './cubsPlayers';
export { DIAMONDBACKS_PLAYERS } from './diamondbacksPlayers';
export { DODGERS_PLAYERS } from './dodgersPlayers';
export { EXPOS_PLAYERS } from './exposPlayers';
export { GIANTS_PLAYERS } from './giantsPlayers';
export { INDIANS_PLAYERS } from './indiansPlayers';
export { MARINERS_PLAYERS } from './marinersPlayers';
export { MARLINS_PLAYERS } from './marlinsPlayers';
export { METS_PLAYERS } from './metsPlayers';
export { ORIOLES_PLAYERS } from './oriolesPlayers';
export { PADRES_PLAYERS } from './padresPlayers';
export { PHILLIES_PLAYERS } from './philliesPlayers';
export { PIRATES_PLAYERS } from './piratesPlayers';
export { RANGERS_PLAYERS } from './rangersPlayers';
export { RAYS_PLAYERS } from './raysPlayers';
export { RED_SOX_PLAYERS } from './redSoxPlayers';
export { REDS_PLAYERS } from './redsPlayers';
export { ROCKIES_PLAYERS } from './rockiesPlayers';
export { ROYALS_PLAYERS } from './royalsPlayers';
export { TIGERS_PLAYERS } from './tigersPlayers';
export { TWINS_PLAYERS } from './twinsPlayers';
export { WHITE_SOX_PLAYERS } from './whiteSoxPlayers';
export { YANKEES_PLAYERS } from './yankeesPlayers';

import type { PlayerData } from '../../playerDatabase';
import { ANGELS_PLAYERS } from './angelsPlayers';
import { ASTROS_PLAYERS } from './astrosPlayers';
import { ATHLETICS_PLAYERS } from './athleticsPlayers';
import { BLUE_JAYS_PLAYERS } from './blueJaysPlayers';
import { BRAVES_PLAYERS } from './bravesPlayers';
import { BREWERS_PLAYERS } from './brewersPlayers';
import { CARDINALS_PLAYERS } from './cardinalsPlayers';
import { CUBS_PLAYERS } from './cubsPlayers';
import { DIAMONDBACKS_PLAYERS } from './diamondbacksPlayers';
import { DODGERS_PLAYERS } from './dodgersPlayers';
import { EXPOS_PLAYERS } from './exposPlayers';
import { GIANTS_PLAYERS } from './giantsPlayers';
import { INDIANS_PLAYERS } from './indiansPlayers';
import { MARINERS_PLAYERS } from './marinersPlayers';
import { MARLINS_PLAYERS } from './marlinsPlayers';
import { METS_PLAYERS } from './metsPlayers';
import { ORIOLES_PLAYERS } from './oriolesPlayers';
import { PADRES_PLAYERS } from './padresPlayers';
import { PHILLIES_PLAYERS } from './philliesPlayers';
import { PIRATES_PLAYERS } from './piratesPlayers';
import { RANGERS_PLAYERS } from './rangersPlayers';
import { RAYS_PLAYERS } from './raysPlayers';
import { RED_SOX_PLAYERS } from './redSoxPlayers';
import { REDS_PLAYERS } from './redsPlayers';
import { ROCKIES_PLAYERS } from './rockiesPlayers';
import { ROYALS_PLAYERS } from './royalsPlayers';
import { TIGERS_PLAYERS } from './tigersPlayers';
import { TWINS_PLAYERS } from './twinsPlayers';
import { WHITE_SOX_PLAYERS } from './whiteSoxPlayers';
import { YANKEES_PLAYERS } from './yankeesPlayers';

/** All 660 MLB players across all 30 teams */
export const ALL_MLB_PLAYERS: PlayerData[] = [
  ...ANGELS_PLAYERS,
  ...ASTROS_PLAYERS,
  ...ATHLETICS_PLAYERS,
  ...BLUE_JAYS_PLAYERS,
  ...BRAVES_PLAYERS,
  ...BREWERS_PLAYERS,
  ...CARDINALS_PLAYERS,
  ...CUBS_PLAYERS,
  ...DIAMONDBACKS_PLAYERS,
  ...DODGERS_PLAYERS,
  ...EXPOS_PLAYERS,
  ...GIANTS_PLAYERS,
  ...INDIANS_PLAYERS,
  ...MARINERS_PLAYERS,
  ...MARLINS_PLAYERS,
  ...METS_PLAYERS,
  ...ORIOLES_PLAYERS,
  ...PADRES_PLAYERS,
  ...PHILLIES_PLAYERS,
  ...PIRATES_PLAYERS,
  ...RANGERS_PLAYERS,
  ...RAYS_PLAYERS,
  ...RED_SOX_PLAYERS,
  ...REDS_PLAYERS,
  ...ROCKIES_PLAYERS,
  ...ROYALS_PLAYERS,
  ...TIGERS_PLAYERS,
  ...TWINS_PLAYERS,
  ...WHITE_SOX_PLAYERS,
  ...YANKEES_PLAYERS,
];
