import { describe, it, expect } from "vitest";

import { resolveFranchiseNextGameOptimalLineup } from "../franchiseNextGameLineup";
import type { OptimalLineupCandidate } from "../../../../utils/optimalLineup";
import type { Player, Team } from "../../../../utils/leagueBuilderStorage";

function candidate(i: number, primaryPosition: string): OptimalLineupCandidate {
  return {
    playerId: `p${i}`,
    playerName: `Player ${i}`,
    bats: i % 2 === 0 ? "L" : "R",
    primaryPosition,
    secondaryPosition: "IF",
    power: 50 + ((i * 3) % 30),
    contact: 55 + ((i * 5) % 30),
    speed: 50 + ((i * 2) % 25),
    fielding: 55 + ((i * 4) % 25),
    arm: 55 + ((i * 6) % 25),
    mojo: "Normal",
    unavailable: false,
  };
}

const roster: OptimalLineupCandidate[] = [
  candidate(1, "C"),
  candidate(2, "1B"),
  candidate(3, "2B"),
  candidate(4, "3B"),
  candidate(5, "SS"),
  candidate(6, "LF"),
  candidate(7, "CF"),
  candidate(8, "RF"),
  candidate(9, "DH"),
  candidate(10, "1B"),
  candidate(11, "OF"),
];

// Opponent: a 4-man rotation; op2 (index 1) is the lefty.
const ROTATION = ["op1", "op2", "op3", "op4"];
const teams = [{ id: "opp", startingRotation: ROTATION } as unknown as Team];
const allPlayers: Player[] = ROTATION.map((id, i) => ({
  id,
  firstName: "Op",
  lastName: `Arm${i}`,
  throws: i === 1 ? "L" : "R",
  velocity: 80,
  junk: 70,
  accuracy: 75,
  primaryPosition: "SP",
  arsenal: ["4F", "SL", "CH"],
  armSlot: "High",
  trait1: "Specialist",
}) as unknown as Player);

describe("resolveFranchiseNextGameOptimalLineup", () => {
  it("resolves the rotation-aware next SP and optimizes the lineup against that pitcher", () => {
    // opponentGamesPlayed = 1 → rotation index 1 → op2 (the lefty).
    const result = resolveFranchiseNextGameOptimalLineup({
      activeTeamId: "us",
      roster,
      teams,
      allPlayers,
      opponentTeamId: "opp",
      opponentGamesPlayed: 1,
      dhEnabled: true,
    });
    expect(result).not.toBeNull();
    expect(result!.opponentStarter.pitcherId).toBe("op2");
    expect(result!.opponentStarter.throws).toBe("L");
    expect(result!.snapshot.mode).toBe("franchise");
    expect(result!.snapshot.opposingPitcherHand).toBe("L");
    expect(result!.snapshot.slots.length).toBeGreaterThan(0);
    // identity is minted by the lane at persist time, not the engine.
    expect(result!.snapshot.snapshotId).toBe("");
  });

  it("wraps the rotation: gamesPlayed % rotationSize picks the right slot", () => {
    // 4 games played, 4-man rotation → index 0 → op1 (a righty).
    const result = resolveFranchiseNextGameOptimalLineup({
      activeTeamId: "us",
      roster,
      teams,
      allPlayers,
      opponentTeamId: "opp",
      opponentGamesPlayed: 4,
      dhEnabled: true,
    });
    expect(result!.opponentStarter.pitcherId).toBe("op1");
    expect(result!.opponentStarter.throws).toBe("R");
  });

  it("returns null when the opponent has no rotation", () => {
    const result = resolveFranchiseNextGameOptimalLineup({
      activeTeamId: "us",
      roster,
      teams: [{ id: "opp", startingRotation: [] } as unknown as Team],
      allPlayers,
      opponentTeamId: "opp",
      opponentGamesPlayed: 0,
    });
    expect(result).toBeNull();
  });
});
