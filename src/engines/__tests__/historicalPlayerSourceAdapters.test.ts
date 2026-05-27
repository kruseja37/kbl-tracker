import { describe, expect, test } from "vitest";

import { convertHistoricalPlayerToSmb4 } from "../historicalPlayerConverter";
import {
  buildHistoricalSourcesFromLahmanCsv,
  createManualHistoricalSourceRecord,
} from "../historicalPlayerSourceAdapters";

const peopleCsv = `playerID,birthYear,nameFirst,nameLast,bats,throws
speed001,1958,Rickeyish,Runner,R,L
power001,1964,Hammerish,Slugger,L,R
contact001,1975,Tonyish,Contact,R,R
ace001,1971,Pedroish,Ace,R,R
`;

const battingCsv = `playerID,yearID,teamID,lgID,G,AB,R,H,2B,3B,HR,RBI,SB,CS,BB,SO,HBP,SH,SF
speed001,1990,OAK,AL,136,489,119,159,33,3,28,61,65,10,180,54,4,0,4
speed001,1991,OAK,AL,134,470,105,126,17,1,18,57,58,18,190,73,3,0,5
power001,1998,STL,NL,155,509,130,152,21,0,70,147,1,1,95,155,6,0,4
power001,1999,STL,NL,153,521,118,145,20,0,65,140,0,0,90,160,4,0,3
contact001,1997,SDP,NL,150,600,90,220,30,4,8,70,12,4,55,22,2,1,6
`;

const pitchingCsv = `playerID,yearID,teamID,lgID,W,L,G,GS,GF,CG,SHO,SV,IPouts,H,ER,HR,BB,SO,ERA
ace001,1999,BOS,AL,23,4,31,29,0,5,1,0,641,160,49,9,37,313,2.07
ace001,2000,BOS,AL,18,6,29,29,0,7,4,0,651,128,42,17,32,284,1.74
`;

const fieldingCsv = `playerID,yearID,teamID,lgID,POS,G,GS,InnOuts,PO,A,E,DP
speed001,1990,OAK,AL,LF,130,128,3420,260,8,3,2
speed001,1991,OAK,AL,CF,90,88,2370,220,5,2,1
power001,1998,STL,NL,1B,150,150,3900,1200,88,10,120
power001,1999,STL,NL,1B,145,145,3750,1110,82,12,112
contact001,1997,SDP,NL,RF,148,148,3900,280,14,4,3
ace001,1999,BOS,AL,P,31,29,641,9,18,1,1
ace001,2000,BOS,AL,P,29,29,651,7,19,0,2
`;

describe("historical player source adapters", () => {
  test("wraps manual source records with provenance", () => {
    const record = createManualHistoricalSourceRecord({
      playerName: "Manual Star",
      primaryPositions: ["CF"],
      hitter: { career: { speed: 90, contact: 85 } },
    });

    expect(record.sourceId).toBe("manual:manual-star");
    expect(record.sourceName).toBe("Manual historical source");
    expect(record.provenance?.[0].sourceName).toBe("Manual historical source");
  });

  test("builds resolved historical records from Lahman-style CSV text", () => {
    const records = buildHistoricalSourcesFromLahmanCsv(
      {
        people: peopleCsv,
        batting: battingCsv,
        pitching: pitchingCsv,
        fielding: fieldingCsv,
        sourceVersion: "fixture",
      },
      { minPlateAppearances: 1, minInningsPitched: 1 },
    );
    const speedster = records.find((record) => record.sourceIds?.lahman === "speed001");
    const ace = records.find((record) => record.sourceIds?.lahman === "ace001");

    expect(records).toHaveLength(4);
    expect(speedster?.sourceId).toBe("lahman:speed001");
    expect(speedster?.provenance?.[0].sourceUrl).toBe("https://sabr.org/lahman-database/");
    expect(speedster?.hitter?.career?.speed).toBeGreaterThanOrEqual(75);
    expect(speedster?.hitter?.career?.discipline).toBeGreaterThanOrEqual(75);
    expect(speedster?.primaryPositions.slice(0, 2)).toEqual(["LF", "CF"]);
    expect(ace?.playerKind).toBe("pitcher");
    expect(ace?.pitcherRole).toBe("starter");
    expect(ace?.pitcher?.career?.strikeouts).toBeGreaterThanOrEqual(50);
  });

  test("produces converter-ready Lahman records", () => {
    const records = buildHistoricalSourcesFromLahmanCsv({
      people: peopleCsv,
      batting: battingCsv,
      pitching: pitchingCsv,
      fielding: fieldingCsv,
    });
    const ace = records.find((record) => record.sourceIds?.lahman === "ace001");
    if (!ace) throw new Error("Missing ace fixture record");

    const profile = convertHistoricalPlayerToSmb4({ source: ace, mode: "career" });

    expect(profile.player.primaryPosition).toBe("SP");
    expect(profile.grade.playerType).toBe("pitcher");
    expect(profile.historicalSummary.eraAdjustmentNotes[0]).toContain("era-adjusted");
  });
});
