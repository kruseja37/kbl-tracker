# SMB4 Team Profile Engine Spec

Status: Draft
Created: 2026-05-19
Owner: KBL Tracker

## Purpose

Create a team-profile engine that assigns each team five category levels from `0` through `6`:

- power
- contact
- speed
- rotation
- bullpen

The UI will later render each level as a stack or row of small filled horizontal rectangles above or near the team name. The engine must also let generated rosters target these profiles.

## Source Data

Primary source:

- `spec-docs/data/smb4_players_fixed.csv`

This file contains the 20 standard SMB4 teams in the `notes` field as `SMB4 <Team Name>`.

Generated profile artifacts:

- `spec-docs/data/smb4_standard_team_profiles.json`
- `spec-docs/data/smb4_standard_team_profiles.csv`

Regenerate them with:

```bash
npm run export:smb4-team-profiles
```

## Definitions

### Position Groups

```text
hitters = primaryPosition not in SP, SP/RP, RP, CP
rotation = primaryPosition in SP, SP/RP
bullpen = primaryPosition in RP, CP
```

### Raw Category Scores

Version 1 uses transparent roster averages.

```text
power_score = mean(hitter.power)
contact_score = mean(hitter.contact)
speed_score = mean(hitter.speed)
rotation_score = mean((velocity + junk + accuracy) / 3 for rotation pitchers)
bullpen_score = mean((velocity + junk + accuracy) / 3 for bullpen pitchers)
```

This intentionally uses direct baseball-tool ratings for the team identity bars. The grade emulator remains separate and can be used later as an alternate quality layer.

## Level Calibration

Version 1 levels are relative to the 20 standard SMB4 teams.

For each category:

```text
level = round(6 * (team_score - standard_min) / (standard_max - standard_min))
level = clamp(level, 0, 6)
```

This gives a stable `0..6` level range while preserving score spacing between standard teams.

Future calibration options:

- percentile buckets instead of min-max
- robust min-max using 5th and 95th percentiles
- calibration against official in-game team bars if screenshots or verified values are provided
- role-weighted offense using expected lineup playing time instead of full-hitter roster averages
- grade-emulator pitching quality instead of raw pitching ratings

## First-Pass Standard Team Profiles

Computed on 2026-05-19 from `spec-docs/data/smb4_players_fixed.csv` using the v1 formulas above.

| Team | Pwr | Con | Spd | Rot | Pen | Power Score | Contact Score | Speed Score | Rotation Score | Bullpen Score |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Beewolves | 2 | 3 | 4 | 4 | 0 | 54.4 | 61.0 | 63.9 | 63.2 | 50.1 |
| Blowfish | 2 | 6 | 4 | 2 | 0 | 56.6 | 73.2 | 64.8 | 56.5 | 51.8 |
| Buzzards | 2 | 4 | 4 | 1 | 2 | 55.2 | 63.7 | 65.0 | 54.2 | 56.4 |
| Crocodons | 1 | 4 | 2 | 6 | 1 | 51.3 | 64.8 | 56.1 | 69.1 | 53.2 |
| Freebooters | 2 | 4 | 1 | 4 | 6 | 58.4 | 66.1 | 51.1 | 62.3 | 73.9 |
| Grapplers | 2 | 1 | 4 | 1 | 5 | 58.5 | 49.2 | 64.1 | 53.4 | 69.0 |
| Heaters | 1 | 2 | 5 | 3 | 1 | 53.6 | 56.5 | 67.5 | 58.8 | 53.6 |
| Herbisaurs | 1 | 2 | 5 | 4 | 0 | 51.7 | 54.9 | 66.8 | 64.7 | 50.8 |
| Hot Corners | 4 | 6 | 2 | 4 | 3 | 64.6 | 72.8 | 55.1 | 62.0 | 63.9 |
| Jacks | 3 | 6 | 0 | 0 | 4 | 63.2 | 75.2 | 47.2 | 50.6 | 67.5 |
| Moonstars | 3 | 3 | 1 | 6 | 5 | 60.1 | 60.1 | 49.7 | 69.5 | 70.9 |
| Moose | 5 | 1 | 1 | 3 | 6 | 69.3 | 52.8 | 52.0 | 59.5 | 72.4 |
| Nemesis | 5 | 4 | 1 | 0 | 0 | 71.7 | 64.2 | 49.8 | 51.3 | 50.4 |
| Overdogs | 3 | 2 | 6 | 2 | 2 | 62.9 | 57.7 | 71.5 | 56.9 | 58.8 |
| Platypi | 1 | 5 | 4 | 1 | 1 | 52.6 | 68.5 | 63.5 | 55.0 | 53.8 |
| Sandcats | 0 | 2 | 6 | 0 | 5 | 47.2 | 58.1 | 73.2 | 51.3 | 68.6 |
| Sawteeth | 3 | 3 | 3 | 2 | 4 | 61.1 | 61.6 | 58.2 | 57.2 | 64.5 |
| Sirloins | 6 | 0 | 3 | 5 | 1 | 75.4 | 46.8 | 61.3 | 65.5 | 53.1 |
| Wideloads | 5 | 3 | 1 | 4 | 2 | 70.5 | 62.1 | 53.0 | 63.5 | 56.6 |
| Wild Pigs | 4 | 0 | 5 | 3 | 4 | 66.1 | 48.8 | 68.4 | 60.6 | 67.4 |

### Category Ranges

| Category | Standard Min | Standard Max | Standard Avg |
|---|---:|---:|---:|
| power | 47.15 | 75.38 | 60.22 |
| contact | 46.85 | 75.15 | 60.91 |
| speed | 47.23 | 73.23 | 60.10 |
| rotation | 50.60 | 69.53 | 59.25 |
| bullpen | 50.08 | 73.92 | 60.34 |

## Interpretation Notes

The first-pass output matches obvious standard-team identities:

- Sirloins: maximum power
- Blowfish, Jacks, Hot Corners: maximum contact
- Sandcats and Overdogs: maximum speed
- Moonstars and Crocodons: maximum rotation
- Freebooters and Moose: maximum bullpen
- Sandcats: low power, low rotation, high speed, high bullpen
- Nemesis: high power, weak pitching profile

These are encouraging signs, but this is still a derived profile. If the goal becomes exact replication of in-game team bars, the calibration layer must be updated against verified official values.

## Generated Team Matching

The team generator should optimize against both raw scores and integer levels.

Recommended distance metric:

```text
level_distance =
  abs(power_level - target.power) +
  abs(contact_level - target.contact) +
  abs(speed_level - target.speed) +
  abs(rotation_level - target.rotation) +
  abs(bullpen_level - target.bullpen)

score_distance =
  z_abs(power_score - target_power_score) +
  z_abs(contact_score - target_contact_score) +
  z_abs(speed_score - target_speed_score) +
  z_abs(rotation_score - target_rotation_score) +
  z_abs(bullpen_score - target_bullpen_score)

team_profile_distance = level_distance + 0.35 * score_distance
```

If a target is expressed only in levels, use the midpoint raw score for each level as the implied raw target.

## Roster Template

Default standard SMB4 roster size is 22 players.

Recommended v1 roster counts:

```text
C: 2
1B: 1 or 2
2B: 1 or 2
3B: 1 or 2
SS: 1 or 2
LF: 1 or 2
CF: 1 or 2
RF: 1 or 2
SP: 4 or 5
SP/RP: 0 or 1
RP: 2 to 4
CP: 0 or 1
```

The generator should support:

- exact standard-team template cloning
- profile-only generation with valid ranges
- user-provided position counts
- archetype presets learned from standard teams

## Public Data Shape

```ts
export interface Smb4TeamProfile {
  teamName?: string;
  levels: {
    power: number;
    contact: number;
    speed: number;
    rotation: number;
    bullpen: number;
  };
  rawScores: {
    power: number;
    contact: number;
    speed: number;
    rotation: number;
    bullpen: number;
  };
  counts: {
    players: number;
    hitters: number;
    rotation: number;
    bullpen: number;
  };
}
```

## Validation Gates

- all 20 standard teams produce deterministic profiles
- levels are always integers in `0..6`
- each category has at least one standard team at `0` and one at `6`
- generated roster profile can be recalculated from generated players alone
- profile calculation has no dependency on UI state
- if a team lacks any required group, return warnings instead of fake values

## Open Questions

1. Should offense scores use all hitters or a generated starting lineup projection?
2. Should rotation use all `SP` plus `SP/RP`, or the top four projected starters?
3. Should bullpen include `SP/RP` pitchers when a roster has no clear fifth starter?
4. Should pitching profiles use raw pitcher ratings or grade-emulator numeric scores?
5. Should official SMB4 team bars, if available, override this derived calibration?
