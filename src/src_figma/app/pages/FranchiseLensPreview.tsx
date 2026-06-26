import { useMemo, useState } from "react";
import {
  FranchiseLensHub,
  type ActiveTeamVM,
  type HubVM,
  type TeamPickerVM,
} from "../components/franchise/FranchiseLensHub";

/**
 * FranchiseLensPreview — a non-destructive, routable preview of the aged-Fenway
 * team-lens hub (slice 1) fed by MOCK data, at /__preview/franchise-lens. Lets us
 * verify the real React + fenway-theme.css render (and the team re-skin + morale
 * ledger) in-app without a seeded franchise. The real page will swap the mock for
 * the live-data adapter; the FranchiseLensHub component is unchanged.
 */

const PICKER: TeamPickerVM[] = [
  { id: "PC", name: "Page Capitals", abbr: "PC", primary: "#6E2440" },
  { id: "BM", name: "Brass Monkeys", abbr: "BM", primary: "#B06A1E" },
  { id: "RR", name: "River Rats", abbr: "RR", primary: "#2E5E8C" },
];

const ACTIVE: Record<string, ActiveTeamVM> = {
  PC: { id: "PC", name: "Page Capitals", abbr: "PC", recordLabel: "48–32 · 2nd, Eastern", primary: "#6E2440", secondary: "#E3C099", rivalName: "Brass Monkeys", seasonLabel: "Season 3 · Week 9" },
  BM: { id: "BM", name: "Brass Monkeys", abbr: "BM", recordLabel: "50–30 · 1st, Eastern", primary: "#B06A1E", secondary: "#2A2A2A", rivalName: "Page Capitals", seasonLabel: "Season 3 · Week 9" },
  RR: { id: "RR", name: "River Rats", abbr: "RR", recordLabel: "44–36 · 3rd, Eastern", primary: "#2E5E8C", secondary: "#B0B7BC", rivalName: "Sand Gnats", seasonLabel: "Season 3 · Week 9" },
};

const HUB: Record<string, HubVM> = {
  PC: {
    pulse: {
      fanMorale: { value: 62, trend: "up", history: [
        { delta: 6, reason: "Walk-off win over the rival", week: "Week 8" },
        { delta: -4, reason: "Three-game skid on the road", week: "Week 6" },
        { delta: 8, reason: "Signed a fan-favorite at the deadline", week: "Week 5" },
      ] },
      clubhouseLabel: "Buzzing", clubhouseAvg: 58, standingLabel: "48–32 · 2nd East",
    },
    roster: [
      { id: "p1", number: "21", position: "SP", name: "Rafa Fenomeno", war: 5.8, salary: 1_200_000, designation: { label: "★ Ace", kind: "gold" }, morale: { value: 74, state: "Locked in · ▲ rising", trend: "up", arc: "up from 66 over 3 weeks · baseline 50", history: [
        { delta: 5, reason: "Complete-game shutout", week: "Week 8" },
        { delta: 4, reason: "Named pitcher of the week", week: "Week 7" },
      ] } },
      { id: "p2", number: "7", position: "CF", name: "Dash Okoye", war: 5.1, salary: 960_000, designation: { label: "MVP", kind: "gold" }, morale: { value: 69, state: "Happy · ▲ rising", trend: "up", history: [
        { delta: 3, reason: "20th stolen base", week: "Week 8" },
      ] } },
      { id: "p3", number: "3", position: "1B", name: "Hank Drake", war: 4.4, salary: 840_000, morale: { value: 53, state: "Steady", trend: "flat", history: [] } },
      { id: "p4", number: "28", position: "LF", name: "Lars Stad", war: 2.7, salary: 610_000, morale: { value: 38, state: "Frustrated · ▼ falling", trend: "down", arc: "down from 51 over 3 weeks · baseline 50", history: [
        { delta: -9, reason: "Benched against a lefty in the opener", week: "Week 8 · Mgr decision" },
        { delta: -6, reason: "Trade rumor in the Tootwhistle Times", week: "Week 7 · Front office" },
        { delta: 4, reason: "Walk-off homer vs River Rats", week: "Week 6 · On the field" },
        { delta: -7, reason: "Passed over for the All-Star nod", week: "Week 5 · League" },
      ] } },
      { id: "p5", number: "44", position: "C", name: "Cy Vane", war: 0.4, salary: 1_400_000, designation: { label: "Albatross", kind: "albatross" }, morale: { value: 41, state: "Sulking · ▼ falling", trend: "down", history: [
        { delta: -5, reason: "Lost the starting job", week: "Week 7" },
      ] } },
      { id: "p6", number: "11", position: "CP", name: "Milo Reyes", war: 2.9, salary: 410_000, designation: { label: "Fan Fav", kind: "gold" }, morale: { value: 66, state: "Happy · ▲ rising", trend: "up", history: [] } },
    ],
  },
  BM: {
    pulse: { fanMorale: { value: 71, trend: "up", history: [{ delta: 5, reason: "First place clinched the week", week: "Week 8" }] }, clubhouseLabel: "Confident", clubhouseAvg: 64, standingLabel: "50–30 · 1st East" },
    roster: [
      { id: "b1", number: "9", position: "SP", name: "Cole Vesper", war: 6.2, salary: 1_500_000, designation: { label: "★ Ace", kind: "gold" }, morale: { value: 78, state: "Locked in · ▲ rising", trend: "up", history: [{ delta: 6, reason: "14-strikeout gem", week: "Week 8" }] } },
      { id: "b2", number: "24", position: "RF", name: "Boomer Vance", war: 4.9, salary: 1_100_000, designation: { label: "MVP", kind: "gold" }, morale: { value: 70, state: "Happy", trend: "flat", history: [] } },
      { id: "b3", number: "5", position: "SS", name: "Tio Marsh", war: 3.3, salary: 720_000, morale: { value: 55, state: "Steady", trend: "flat", history: [] } },
    ],
  },
  RR: {
    pulse: { fanMorale: { value: 49, trend: "down", history: [{ delta: -6, reason: "Fell out of the wild-card spot", week: "Week 8" }] }, clubhouseLabel: "Restless", clubhouseAvg: 47, standingLabel: "44–36 · 3rd East" },
    roster: [
      { id: "r1", number: "2", position: "2B", name: "Sol Park", war: 3.8, salary: 680_000, morale: { value: 52, state: "Steady", trend: "flat", history: [] } },
      { id: "r2", number: "17", position: "LF", name: "Gus Hale", war: 2.1, salary: 540_000, morale: { value: 44, state: "Frustrated · ▼ falling", trend: "down", history: [{ delta: -5, reason: "0-for-18 cold streak", week: "Week 8" }] } },
    ],
  },
};

export function FranchiseLensPreview() {
  const [teamId, setTeamId] = useState("PC");
  const active = ACTIVE[teamId];
  const hub = useMemo(() => HUB[teamId], [teamId]);
  return <FranchiseLensHub teams={PICKER} active={active} hub={hub} onSelectTeam={setTeamId} />;
}

export default FranchiseLensPreview;
