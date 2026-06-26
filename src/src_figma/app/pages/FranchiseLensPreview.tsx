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
  PC: { id: "PC", name: "Page Capitals", abbr: "PC", recordLabel: "48–32 · 2nd, Eastern", primary: "#6E2440", secondary: "#E3C099", rivalName: "Brass Monkeys", seasonLabel: "Season 3 · Week 9",
    archetype: "Power Club", ballparkNickname: "The Yard", gmName: "The Architect", managerName: "B. Cole", managerStyle: "Balanced", scoutName: "M. Okafor", scoutSpecialty: "infielders", reporter: { name: "J. Tate", mood: "loving this run", avatar: "fedora" } },
  BM: { id: "BM", name: "Brass Monkeys", abbr: "BM", recordLabel: "50–30 · 1st, Eastern", primary: "#B06A1E", secondary: "#2A2A2A", rivalName: "Page Capitals", seasonLabel: "Season 3 · Week 9",
    archetype: "Pitching & Defense", ballparkNickname: "The Foundry", gmName: "C. Diaz", managerName: "R. Vance", managerStyle: "Aggressive", scoutName: "P. Nunn", scoutSpecialty: "arms", reporter: { name: "D. Hale", mood: "writing a coronation", avatar: "headset" } },
  RR: { id: "RR", name: "River Rats", abbr: "RR", recordLabel: "44–36 · 3rd, Eastern", primary: "#2E5E8C", secondary: "#B0B7BC", rivalName: "Sand Gnats", seasonLabel: "Season 3 · Week 9",
    archetype: "Speed & Glove", ballparkNickname: "The Levee", gmName: "T. Webb", managerName: "S. Park", managerStyle: "Small-ball", scoutName: "L. Boyd", scoutSpecialty: "speed", reporter: { name: "G. Ruiz", mood: "frustrated for the fans", avatar: "cap" } },
};

const HUB: Record<string, HubVM> = {
  PC: {
    home: {
      leadStory: { kicker: "The Arc · Season 3, Week 9", headline: "FENOMENO TAKES THE LEAP — ARM CLIMBING TOWARD AN A", body: "Five starts, one earned run. The kid the Capitals stole in the draft is pitching his way up the grades in real time — and Thursday's checkpoint may make it official. \"He doesn't pitch like a B anymore,\" the skipper admitted.", byline: "By J. Tate, Tootwhistle Times" },
      impactCards: [
        { kind: "dated", icon: "🔔", title: "Ratings checkpoint in 2 games", detail: "The league's about to shift — you'll get a change-log to enter into SMB4. Twenty percent down.", cta: "opens at the break" },
        { kind: "crisis", icon: "⚠️", title: "Lars Stad — morale cratering (38 ▼)", detail: "Benched again, and the Times floated a trade. He wants out; a move may be coming.", cta: "see the ledger" },
        { kind: "good", icon: "▲", title: "Okoye climbs to #2 in the MVP race", detail: "Two big nights and your center fielder is in the conversation.", cta: "the races" },
      ],
      nextGame: { awayName: "River Rats", awayAbbr: "RR", awayRecord: "44–36", homeName: "Page Capitals", homeAbbr: "PC", homeRecord: "48–32", pulse: (<>Clubhouse <b>buzzing</b> · fans <b style={{ color: "#F2C041" }}>62 ▲</b> · 2.0 back of 1st</>) },
    },
    news: {
      editionLabel: "Season 3 · Week 9", volumeLabel: "Vol. III — No. 61", priceLabel: "Price: Two Bits",
      lead: { kicker: "Pennant Race", headline: "CAPITALS RIDE FENOMENO TO FOURTH STRAIGHT", body: "Rafa Fenomeno carried a no-hitter into the seventh as Page surged within two of the division-leading Monkeys, sending a sellout crowd home hoarse and happy.", byline: "By J. Tate" },
      stories: [
        { category: "Trade buzz", headline: "Capitals scouting bullpen help before the deadline", excerpt: "With room under the tax line, Page is \"kicking tires\" on a setup arm.", byline: "Beat report · 2 days ago" },
        { category: "Clubhouse", headline: "Stad's frustration boils over after another benching", excerpt: "The veteran left fielder wants a clearer role — or a ticket out of town.", byline: "Beat report · 3 days ago" },
        { category: "On the field", headline: "Okoye's 28 steals quietly lead the league", excerpt: "The leadoff man has been a menace; teams are throwing over more than ever.", byline: "Beat report · 4 days ago" },
        { category: "The race", headline: "MVP ballots starting to swing Okoye's way", excerpt: "Two big nights vault the center fielder into the top three.", byline: "League notebook · 5 days ago" },
      ],
    },
    pulse: {
      fanMorale: { value: 62, trend: "up", history: [
        { delta: 6, reason: "Walk-off win over the rival", week: "Week 8" },
        { delta: -4, reason: "Three-game skid on the road", week: "Week 6" },
        { delta: 8, reason: "Signed a fan-favorite at the deadline", week: "Week 5" },
      ] },
      payrollLabel: "$5.42M · 22", clubhouseLabel: "Buzzing", clubhouseAvg: 58, standingLabel: "48–32 · 2nd East",
    },
    roster: [
      { id: "p1", number: "21", position: "SP", name: "Rafa Fenomeno", war: 5.8, salary: 1_200_000, trueValue: 1_460_000, valueGap: 260_000, designation: { label: "★ Ace", kind: "gold" }, morale: { value: 74, state: "Locked in · ▲ rising", trend: "up", arc: "up from 66 over 3 weeks · baseline 50", history: [
        { delta: 5, reason: "Complete-game shutout", week: "Week 8" },
        { delta: 4, reason: "Named pitcher of the week", week: "Week 7" },
      ] } },
      { id: "p2", number: "7", position: "CF", name: "Dash Okoye", war: 5.1, salary: 960_000, trueValue: 1_310_000, valueGap: 350_000, designation: { label: "MVP", kind: "gold" }, morale: { value: 69, state: "Happy · ▲ rising", trend: "up", history: [
        { delta: 3, reason: "20th stolen base", week: "Week 8" },
      ] } },
      { id: "p3", number: "3", position: "1B", name: "Hank Drake", war: 4.4, salary: 840_000, trueValue: 770_000, valueGap: -70_000, morale: { value: 53, state: "Steady", trend: "flat", history: [] } },
      { id: "p4", number: "28", position: "LF", name: "Lars Stad", war: 2.7, salary: 610_000, trueValue: 420_000, valueGap: -190_000, morale: { value: 38, state: "Frustrated · ▼ falling", trend: "down", arc: "down from 51 over 3 weeks · baseline 50", history: [
        { delta: -9, reason: "Benched against a lefty in the opener", week: "Week 8 · Mgr decision" },
        { delta: -6, reason: "Trade rumor in the Tootwhistle Times", week: "Week 7 · Front office" },
        { delta: 4, reason: "Walk-off homer vs River Rats", week: "Week 6 · On the field" },
        { delta: -7, reason: "Passed over for the All-Star nod", week: "Week 5 · League" },
      ] } },
      { id: "p5", number: "44", position: "C", name: "Cy Vane", war: 0.4, salary: 1_400_000, trueValue: 300_000, valueGap: -1_100_000, designation: { label: "Albatross", kind: "albatross" }, morale: { value: 41, state: "Sulking · ▼ falling", trend: "down", history: [
        { delta: -5, reason: "Lost the starting job", week: "Week 7" },
      ] } },
      { id: "p6", number: "11", position: "CP", name: "Milo Reyes", war: 2.9, salary: 410_000, trueValue: 660_000, valueGap: 250_000, designation: { label: "Fan Fav", kind: "gold" }, morale: { value: 66, state: "Happy · ▲ rising", trend: "up", history: [] } },
    ],
  },
  BM: {
    home: {
      leadStory: { kicker: "Season 3, Week 9", headline: "VESPER MAKES HIS CY YOUNG CASE AS MONKEYS PULL AWAY", body: "A 2.18 ERA and a fourteen-strikeout gem have the Brass ace atop every ballot — and the East comfortably in hand.", byline: "By D. Hale, Tootwhistle Times" },
      impactCards: [
        { kind: "good", icon: "🏆", title: "Magic number down to nine", detail: "First place is nearly clinched in the East.", cta: "the races" },
        { kind: "dated", icon: "🔔", title: "Ratings checkpoint in 2 games", detail: "A league-wide development sweep is coming up.", cta: "opens at the break" },
      ],
      nextGame: { awayName: "Page Capitals", awayAbbr: "PC", awayRecord: "48–32", homeName: "Brass Monkeys", homeAbbr: "BM", homeRecord: "50–30", pulse: (<>Clubhouse <b>confident</b> · fans <b style={{ color: "#F2C041" }}>71 ▲</b> · 1st in the East</>) },
    },
    news: { editionLabel: "Season 3 · Week 9", volumeLabel: "Vol. III — No. 61", lead: { kicker: "Coronation", headline: "VESPER STAKES HIS CY YOUNG CLAIM AS MONKEYS ROLL", body: "A fourteen-strikeout gem dropped the ace's ERA to 2.18 and pushed the magic number into single digits.", byline: "By D. Hale" }, stories: [
      { category: "The race", headline: "Magic number down to nine in the East", excerpt: "First place is all but wrapped up.", byline: "League notebook · 1 day ago" },
      { category: "Clubhouse", headline: "A confident room eyes the postseason", excerpt: "The Brass are loose, healthy, and rolling.", byline: "Beat report · 3 days ago" },
    ] },
    pulse: { fanMorale: { value: 71, trend: "up", history: [{ delta: 5, reason: "First place clinched the week", week: "Week 8" }] }, payrollLabel: "$6.10M · 22", clubhouseLabel: "Confident", clubhouseAvg: 64, standingLabel: "50–30 · 1st East" },
    roster: [
      { id: "b1", number: "9", position: "SP", name: "Cole Vesper", war: 6.2, salary: 1_500_000, trueValue: 1_700_000, valueGap: 200_000, designation: { label: "★ Ace", kind: "gold" }, morale: { value: 78, state: "Locked in · ▲ rising", trend: "up", history: [{ delta: 6, reason: "14-strikeout gem", week: "Week 8" }] } },
      { id: "b2", number: "24", position: "RF", name: "Boomer Vance", war: 4.9, salary: 1_100_000, trueValue: 1_250_000, valueGap: 150_000, designation: { label: "MVP", kind: "gold" }, morale: { value: 70, state: "Happy", trend: "flat", history: [] } },
      { id: "b3", number: "5", position: "SS", name: "Tio Marsh", war: 3.3, salary: 720_000, trueValue: 640_000, valueGap: -80_000, morale: { value: 55, state: "Steady", trend: "flat", history: [] } },
    ],
  },
  RR: {
    home: {
      leadStory: { kicker: "Season 3, Week 9", headline: "RATS SLIP OUT OF THE WILD-CARD PICTURE", body: "A four-game skid has dropped River Rats below the line, and the front office is fielding calls. \"We're not sellers yet,\" the GM insisted — for now.", byline: "By G. Ruiz, Tootwhistle Times" },
      impactCards: [
        { kind: "crisis", icon: "⚠️", title: "Gus Hale — 0-for-18 and pressing", detail: "Your left fielder's morale is sliding with the slump.", cta: "see the ledger" },
        { kind: "info", icon: "🔻", title: "Two games back of the wild card", detail: "The next homestand matters.", cta: "standings" },
      ],
      nextGame: { awayName: "Sand Gnats", awayAbbr: "SG", awayRecord: "39–41", homeName: "River Rats", homeAbbr: "RR", homeRecord: "44–36", pulse: (<>Clubhouse <b>restless</b> · fans <b style={{ color: "#CC3433" }}>49 ▼</b> · 6.0 back</>) },
    },
    news: { editionLabel: "Season 3 · Week 9", volumeLabel: "Vol. III — No. 61", lead: { kicker: "Slump", headline: "RATS SLIDE OUT OF THE WILD-CARD PICTURE", body: "A four-game skid has the front office fielding calls and the clubhouse pressing.", byline: "By G. Ruiz" }, stories: [
      { category: "Clubhouse", headline: "Hale's 0-for-18 weighs on a restless room", excerpt: "The left fielder is pressing as the losses mount.", byline: "Beat report · 2 days ago" },
      { category: "Front office", headline: "\"We're not sellers yet,\" GM insists", excerpt: "For now, River Rats are holding — but the deadline looms.", byline: "Beat report · 4 days ago" },
    ] },
    pulse: { fanMorale: { value: 49, trend: "down", history: [{ delta: -6, reason: "Fell out of the wild-card spot", week: "Week 8" }] }, payrollLabel: "$4.30M · 22", clubhouseLabel: "Restless", clubhouseAvg: 47, standingLabel: "44–36 · 3rd East" },
    roster: [
      { id: "r1", number: "2", position: "2B", name: "Sol Park", war: 3.8, salary: 680_000, trueValue: 710_000, valueGap: 30_000, morale: { value: 52, state: "Steady", trend: "flat", history: [] } },
      { id: "r2", number: "17", position: "LF", name: "Gus Hale", war: 2.1, salary: 540_000, trueValue: 410_000, valueGap: -130_000, morale: { value: 44, state: "Frustrated · ▼ falling", trend: "down", history: [{ delta: -5, reason: "0-for-18 cold streak", week: "Week 8" }] } },
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
