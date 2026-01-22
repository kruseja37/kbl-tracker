/**
 * KBL XHD Tracker - Complete Setup Script
 *
 * This script creates all necessary tabs with proper headers.
 * Run setupAllTabs() once to initialize the spreadsheet structure.
 */

// Run this function to create all tabs
function setupAllTabs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Create each tab with headers
  createTeamsTab(ss);
  createStadiumsTab(ss);
  createPlayersTab(ss);
  createSeasonsTab(ss);
  createRostersTab(ss);
  createScheduleTab(ss);
  createMVPStatsTab(ss);
  createBattingTab(ss);
  createPitchingTab(ss);
  createBoxscoresTab(ss);
  createHomerunsTab(ss);
  createRecordsTab(ss);
  createAwardsTab(ss);
  createAllstarsTab(ss);
  createRandomEventsTab(ss);
  createTransactionsTab(ss);

  SpreadsheetApp.getUi().alert('Setup complete! All 16 tabs have been created.');
}

// Helper function to create or get a sheet
function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

// ============ TAB CREATION FUNCTIONS ============

function createTeamsTab(ss) {
  var sheet = getOrCreateSheet(ss, 'Teams');
  var headers = [
    'teamId', 'name', 'abbreviation', 'conference', 'division', 'stadiumId',
    'primaryColor', 'secondaryColor', 'textColor', 'ownerPlayerId', 'managerName', 'isActive'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');

  // Add default teams
  var teams = [
    [1, 'Angels', 'LAA', 'AL', 'West', 1, '#BA0021', '#003263', '#FFFFFF', '', 'Mike Scioscia', 'TRUE'],
    [2, 'Blue Jays', 'TOR', 'AL', 'East', 2, '#134A8E', '#E8291C', '#FFFFFF', '', 'John Gibbons', 'TRUE'],
    [3, 'Giants', 'SF', 'NL', 'West', 3, '#FD5A1E', '#27251F', '#FFFFFF', '', 'Bruce Bochy', 'TRUE'],
    [4, 'Indians', 'CLE', 'AL', 'Central', 4, '#E50022', '#00385D', '#FFFFFF', '', 'Terry Francona', 'TRUE'],
    [5, 'Mets', 'NYM', 'NL', 'East', 5, '#002D72', '#FF5910', '#FFFFFF', '', 'Buck Showalter', 'TRUE'],
    [6, 'Twins', 'MIN', 'AL', 'Central', 6, '#002B5C', '#D31145', '#FFFFFF', '', 'Rocco Baldelli', 'TRUE'],
    [7, 'White Sox', 'CWS', 'AL', 'Central', 7, '#27251F', '#C4CED4', '#FFFFFF', '', 'Tony La Russa', 'TRUE'],
    [8, 'Yankees', 'NYY', 'AL', 'East', 8, '#003087', '#C4CED3', '#FFFFFF', '', 'Aaron Boone', 'TRUE']
  ];
  sheet.getRange(2, 1, teams.length, teams[0].length).setValues(teams);
}

function createStadiumsTab(ss) {
  var sheet = getOrCreateSheet(ss, 'Stadiums');
  var headers = [
    'stadiumId', 'name', 'leftDistance', 'leftWallHeight', 'centerDistance',
    'centerWallHeight', 'rightDistance', 'rightWallHeight', 'parkFactor', 'parkFactorNotes'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');

  // Add all 21 stadiums with dimensions and park factors
  var stadiums = [
    [1, 'Sakura Hills', 358, 'Med', 408, 'Low', 358, 'Med', 0.98, 'Deep corners balanced by low CF wall'],
    [2, 'Colonial Plaza', 347, 'Med', 425, 'Med', 335, 'Med', 1.02, 'Short RF favors righties'],
    [3, 'Motor Yard', 335, 'Med', 412, 'High', 349, 'Med', 0.96, 'High CF wall suppresses HRs'],
    [4, 'Shaka Sports Turf', 364, 'Low', 430, 'Low', 376, 'Low', 0.90, 'Deepest park - pitcher friendly'],
    [5, 'Emerald Diamond', 329, 'Med', 401, 'High', 347, 'Med', 0.97, 'High CF wall offsets short LF'],
    [6, 'Red Rock Park', 320, 'Low', 421, 'Med', 356, 'Med', 1.05, 'Very short LF with low wall'],
    [7, 'El Viejo Stadium', 331, 'Med', 392, 'Med', 331, 'Med', 1.04, 'Shortest CF in league'],
    [8, 'Bingata Bowl', 350, 'Med', 420, 'Med', 335, 'Med', 1.00, 'Balanced dimensions'],
    [9, 'Apple Field', 340, 'Med', 418, 'Med', 340, 'Med', 1.00, 'Symmetrical and balanced'],
    [10, 'Battery Bay', 358, 'Med', 405, 'Med', 358, 'Med', 0.98, 'Slightly deep corners'],
    [11, 'Big Sky Park', 328, 'Low', 425, 'Med', 328, 'Low', 1.08, 'Short corners with low walls'],
    [12, 'Tiger Den', 332, 'Low', 420, 'Low', 321, 'Low', 1.12, 'All low walls - hitter friendly'],
    [13, 'Stade Royale', 345, 'Low', 410, 'Low', 321, 'Low', 1.10, 'Very short RF - extreme hitter park'],
    [14, 'Golden Field', 325, 'Low', 398, 'Low', 325, 'Low', 1.15, 'Shortest and lowest - most HR friendly'],
    [15, 'The Corral', 327, 'Med', 415, 'Med', 327, 'Med', 1.03, 'Short symmetrical corners'],
    [16, 'Founders Field', 340, 'Med', 410, 'Low', 340, 'Med', 1.02, 'Low CF helps hitters'],
    [17, 'Peril Point', 335, 'High', 405, 'High', 335, 'High', 0.88, 'All high walls - most pitcher friendly'],
    [18, 'Parque Jardineros', 362, 'Med', 414, 'Med', 362, 'Med', 0.92, 'Deep corners - pitcher friendly'],
    [19, 'Swagger Center', 330, 'Med', 415, 'Med', 345, 'Med', 1.01, 'Slightly short LF'],
    [20, 'Lafayette Corner', 333, 'Var', 422, 'Med', 348, 'Var', 0.99, 'Variable walls create unpredictability'],
    [21, 'Whackers Wheel', 337, 'Med', 409, 'Med', 337, 'Med', 1.00, 'Balanced symmetrical park']
  ];
  sheet.getRange(2, 1, stadiums.length, stadiums[0].length).setValues(stadiums);
}

function createPlayersTab(ss) {
  var sheet = getOrCreateSheet(ss, 'Players');
  var headers = [
    'playerId', 'name', 'age', 'primaryPosition', 'secondaryPosition', 'bats', 'throws',
    'chemistry', 'personality', 'overallGrade', 'gradeWeight',
    'power', 'contact', 'speed', 'fielding', 'arm',
    'velocity', 'junk', 'accuracy', 'arsenal',
    'trait1', 'trait2', 'isActive', 'createdDate', 'notes'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

function createSeasonsTab(ss) {
  var sheet = getOrCreateSheet(ss, 'Seasons');
  var headers = [
    'seasonId', 'seasonNumber', 'leagueName', 'startDate', 'endDate', 'status',
    'gamesPerTeam', 'inningsPerGame', 'dhRuleAL', 'dhRuleNL',
    'playoffTeams', 'playoffSeriesLength', 'rookieAbLimit', 'rookieIpLimit', 'notes'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');

  // Add Season 1
  var season1 = [1, 1, 'KBL XHD', '', '', 'active', 128, 9, 'TRUE', 'FALSE', 4, 5, 38, 14, 'Season 1'];
  sheet.getRange(2, 1, 1, season1.length).setValues([season1]);
}

function createRostersTab(ss) {
  var sheet = getOrCreateSheet(ss, 'Rosters');
  var headers = [
    'rosterId', 'seasonId', 'playerId', 'teamId', 'playerName', 'teamName',
    'lineupPosition', 'isStarter', 'isBench', 'joinDate', 'leaveDate', 'salary', 'notes'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

function createScheduleTab(ss) {
  var sheet = getOrCreateSheet(ss, 'Schedule');
  var headers = [
    'gameId', 'seasonId', 'gameNumber', 'awayTeamId', 'homeTeamId', 'awayTeam', 'homeTeam',
    'awayScore', 'homeScore', 'awayStartingPitcher', 'homeStartingPitcher',
    'stadiumId', 'datePlayed', 'duration', 'status', 'isPostseason', 'seriesType', 'notes'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

function createMVPStatsTab(ss) {
  var sheet = getOrCreateSheet(ss, 'MVPStats');
  var headers = [
    'mvpStatId', 'seasonId', 'playerId', 'playerName', 'teamId', 'teamName',
    'position', 'isBench', 'overallGrade', 'gradeWeight',
    'first', 'second', 'third', 'walkoffs',
    'fameBonus', 'fameBoner', 'clutchPlays', 'tempClutch', 'chokes', 'tempChoke',
    'starPlays', 'errors', 'fErrors', 'caughtCBs', 'missedCBs', 'pickoffs',
    'killedPitchers', 'nutShots', 'passedBalls',
    'juiced', 'injuries', 'onFire', 'jacked',
    'netFielding', 'clutchScore', 'mvpRaw', 'mvpWeighted', 'mvpScore'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

function createBattingTab(ss) {
  var sheet = getOrCreateSheet(ss, 'Batting');
  var headers = [
    'battingId', 'seasonId', 'playerId', 'playerName', 'teamId', 'teamName', 'type',
    'G', 'AB', 'H', 'HR', 'RBI', 'R', 'TB', '2B', '3B', 'BB', 'SO', 'SB', 'CS', 'HBP', 'SAC', 'SF', 'E', 'PB',
    'AVG', 'OBP', 'SLG', 'OPS', 'ISO', 'BABIP', 'wOBA', 'wRAA', 'wRC', 'wRCplus', 'batWAR'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

function createPitchingTab(ss) {
  var sheet = getOrCreateSheet(ss, 'Pitching');
  var headers = [
    'pitchingId', 'seasonId', 'playerId', 'playerName', 'teamId', 'teamName', 'type',
    'W', 'L', 'ERA', 'R', 'ER', 'WHIP', 'G', 'GS', 'SV', 'IP', 'H', 'AVG', 'SO', 'BB', 'WP', 'HR', 'CG', 'SHO', 'HB', 'TBF', 'NP',
    'K9', 'BB9', 'HR9', 'FIP', 'pWAR'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

function createBoxscoresTab(ss) {
  var sheet = getOrCreateSheet(ss, 'Boxscores');
  var headers = [
    'boxscoreId', 'gameId', 'seasonId', 'playerId', 'playerName', 'teamId', 'teamName',
    'side', 'battingOrder', 'position',
    'AB', 'R', 'H', 'HR', 'RBI', 'BB', 'SO', 'AVG',
    'pitchingOrder', 'IP', 'H_allowed', 'R_allowed', 'ER', 'BB_allowed', 'SO_pitched', 'HR_allowed', 'ERA',
    'decision', 'notes'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

function createHomerunsTab(ss) {
  var sheet = getOrCreateSheet(ss, 'Homeruns');
  var headers = [
    'hrId', 'seasonId', 'gameId', 'batterId', 'batterName', 'batterTeamId', 'batterTeam',
    'pitcherId', 'pitcherName', 'pitcherTeamId', 'pitcherTeam',
    'stadiumId', 'stadiumName', 'distance', 'inning', 'outs', 'runnersOn', 'notes'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

function createRecordsTab(ss) {
  var sheet = getOrCreateSheet(ss, 'Records');
  var headers = [
    'recordId', 'category', 'recordType', 'playerId', 'playerName', 'teamId', 'teamName',
    'value', 'seasonId', 'gameId', 'date', 'previousRecordHolder', 'previousValue', 'notes'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

function createAwardsTab(ss) {
  var sheet = getOrCreateSheet(ss, 'Awards');
  var headers = [
    'awardId', 'seasonId', 'playerId', 'playerName', 'teamId', 'teamName',
    'awardType', 'place', 'rewardType', 'rewardValue', 'notes'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

function createAllstarsTab(ss) {
  var sheet = getOrCreateSheet(ss, 'Allstars');
  var headers = [
    'allstarId', 'seasonId', 'playerId', 'playerName', 'teamId', 'teamName',
    'position', 'conference', 'votes', 'isStarter', 'wasSelected',
    'resultType', 'resultValue', 'notes'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

function createRandomEventsTab(ss) {
  var sheet = getOrCreateSheet(ss, 'RandomEvents');
  var headers = [
    'eventId', 'seasonId', 'gameNumber', 'date', 'd20Roll', 'eventType',
    'targetPlayerId', 'targetPlayerName', 'targetTeamId', 'targetTeam',
    'oldValue', 'newValue', 'details', 'notes'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

function createTransactionsTab(ss) {
  var sheet = getOrCreateSheet(ss, 'Transactions');
  var headers = [
    'transactionId', 'seasonId', 'gameNumber', 'date', 'type',
    'playerId', 'playerName', 'fromTeamId', 'fromTeam', 'toTeamId', 'toTeam',
    'details', 'notes'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}


// ============ EXISTING API FUNCTIONS (keep these) ============

// Handle GET requests (reading players)
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : null;

  if (action === 'getPlayers') {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Players');
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var players = [];

    for (var i = 1; i < data.length; i++) {
      var player = {};
      for (var j = 0; j < headers.length; j++) {
        player[headers[j]] = data[i][j];
      }
      if (player.name) {
        players.push(player);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      players: players
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'getRosters') {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Rosters');
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var rosters = [];

    for (var i = 1; i < data.length; i++) {
      var roster = {};
      for (var j = 0; j < headers.length; j++) {
        roster[headers[j]] = data[i][j];
      }
      if (roster.playerId) {
        rosters.push(roster);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      rosters: rosters
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'getTeams') {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Teams');
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var teams = [];

    for (var i = 1; i < data.length; i++) {
      var team = {};
      for (var j = 0; j < headers.length; j++) {
        team[headers[j]] = data[i][j];
      }
      if (team.name) {
        teams.push(team);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      teams: teams
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'getSchedule') {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Schedule');
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var games = [];

    for (var i = 1; i < data.length; i++) {
      var game = {};
      for (var j = 0; j < headers.length; j++) {
        game[headers[j]] = data[i][j];
      }
      if (game.gameId) {
        games.push(game);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      schedule: games
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'KBL XHD Tracker API is running'
  })).setMimeType(ContentService.MimeType.JSON);
}

// Handle POST requests (saving game data)
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);

    if (data.action === 'finalizeGame') {
      var sheet = ss.getSheetByName('Players');
      var values = sheet.getDataRange().getValues();
      var headers = values[0];

      var nameCol = headers.indexOf('name');
      var payload = data.payload;

      // Process game stats
      for (var playerName in payload.gameStats) {
        var stats = payload.gameStats[playerName];

        // Find player row
        for (var i = 1; i < values.length; i++) {
          if (values[i][nameCol] === playerName) {
            var isWinner = values[i][headers.indexOf('team')] === payload.winningTeam;

            // Update each stat
            for (var stat in stats) {
              var col = headers.indexOf(stat);
              if (col !== -1) {
                var currentVal = sheet.getRange(i + 1, col + 1).getValue() || 0;
                var delta = stats[stat] || 0;

                // Handle temp stats with win/loss multiplier
                if (stat === 'tempClutch') {
                  var clutchCol = headers.indexOf('clutchPlays');
                  if (clutchCol !== -1) {
                    var clutchCurrent = sheet.getRange(i + 1, clutchCol + 1).getValue() || 0;
                    sheet.getRange(i + 1, clutchCol + 1).setValue(clutchCurrent + (delta * (isWinner ? 2 : 1)));
                  }
                } else if (stat === 'tempChoke') {
                  var chokeCol = headers.indexOf('chokes');
                  if (chokeCol !== -1) {
                    var chokeCurrent = sheet.getRange(i + 1, chokeCol + 1).getValue() || 0;
                    sheet.getRange(i + 1, chokeCol + 1).setValue(chokeCurrent + (delta * (isWinner ? 1 : 2)));
                  }
                } else {
                  sheet.getRange(i + 1, col + 1).setValue(currentVal + delta);
                }
              }
            }
            break;
          }
        }
      }

      // Process awards
      var awards = payload.awards;
      var awardStats = {first: 'first', second: 'second', third: 'third', walkoff: 'walkoffs'};

      for (var award in awardStats) {
        if (awards[award]) {
          for (var i = 1; i < values.length; i++) {
            if (values[i][nameCol] === awards[award]) {
              var col = headers.indexOf(awardStats[award]);
              if (col !== -1) {
                var current = sheet.getRange(i + 1, col + 1).getValue() || 0;
                sheet.getRange(i + 1, col + 1).setValue(current + 1);
              }
              break;
            }
          }
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Game saved'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Unknown action'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
