# SMB4 Position Spread and Grade Reverse Engineering

- Source: `/Users/johnkruse/Projects/kbl-tracker/spec-docs/data/smb4_players_fixed.csv` (440 players, 20 teams)\n- Base formula exact-match accuracy vs assigned grades: **30.0%**\n- Fitted model R^2: **0.936**, RMSE: **0.512 grade points**, exact grade accuracy: **70.2%**\n
## League Primary Position Spread

| Primary | Count | % League | Avg per team |
|---|---:|---:|---:|
| SP | 86 | 19.55% | 4.30 |
| RP | 60 | 13.64% | 3.00 |
| C | 40 | 9.09% | 2.00 |
| LF | 37 | 8.41% | 1.85 |
| 2B | 34 | 7.73% | 1.70 |
| 1B | 31 | 7.05% | 1.55 |
| RF | 31 | 7.05% | 1.55 |
| CF | 30 | 6.82% | 1.50 |
| SS | 30 | 6.82% | 1.50 |
| 3B | 28 | 6.36% | 1.40 |
| SP/RP | 19 | 4.32% | 0.95 |
| CP | 14 | 3.18% | 0.70 |

## League Secondary Position Spread

| Secondary | Count | % League | Avg per team |
|---|---:|---:|---:|
| (none) | 221 | 50.23% | 11.05 |
| OF | 50 | 11.36% | 2.50 |
| 1B | 27 | 6.14% | 1.35 |
| SS | 26 | 5.91% | 1.30 |
| 3B | 22 | 5.00% | 1.10 |
| C | 20 | 4.55% | 1.00 |
| 2B | 17 | 3.86% | 0.85 |
| LF | 14 | 3.18% | 0.70 |
| RF | 14 | 3.18% | 0.70 |
| 1B/OF | 11 | 2.50% | 0.55 |
| IF | 11 | 2.50% | 0.55 |
| IF/OF | 7 | 1.59% | 0.35 |

## Team Primary Position Counts

| Team | C | 1B | 2B | 3B | SS | LF | CF | RF | SP | SP/RP | RP | CP |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Beewolves | 2 | 2 | 2 | 1 | 1 | 2 | 1 | 2 | 4 | 1 | 3 | 1 |
| Blowfish | 2 | 1 | 2 | 2 | 1 | 2 | 1 | 2 | 5 | 1 | 2 | 1 |
| Buzzards | 2 | 2 | 2 | 1 | 2 | 2 | 1 | 1 | 5 | 1 | 2 | 1 |
| Crocodons | 2 | 2 | 1 | 2 | 1 | 1 | 2 | 2 | 4 | 1 | 3 | 1 |
| Freebooters | 2 | 2 | 2 | 1 | 1 | 2 | 1 | 2 | 4 | 1 | 3 | 1 |
| Grapplers | 2 | 2 | 1 | 2 | 1 | 2 | 1 | 2 | 4 | 1 | 4 | 0 |
| Heaters | 2 | 1 | 2 | 1 | 2 | 2 | 2 | 1 | 4 | 1 | 4 | 0 |
| Herbisaurs | 2 | 1 | 2 | 1 | 2 | 2 | 1 | 2 | 4 | 1 | 3 | 1 |
| Hot Corners | 2 | 2 | 2 | 1 | 1 | 2 | 2 | 1 | 4 | 1 | 3 | 1 |
| Jacks | 2 | 1 | 2 | 2 | 1 | 2 | 2 | 1 | 4 | 1 | 3 | 1 |
| Moonstars | 2 | 2 | 1 | 2 | 2 | 2 | 1 | 2 | 5 | 0 | 2 | 1 |
| Moose | 2 | 2 | 1 | 1 | 2 | 2 | 1 | 2 | 5 | 1 | 2 | 1 |
| Nemesis | 2 | 1 | 2 | 1 | 2 | 1 | 2 | 2 | 4 | 1 | 3 | 1 |
| Overdogs | 2 | 2 | 1 | 2 | 2 | 2 | 1 | 1 | 4 | 1 | 4 | 0 |
| Platypi | 2 | 1 | 2 | 2 | 1 | 2 | 1 | 2 | 5 | 1 | 3 | 0 |
| Sandcats | 2 | 2 | 2 | 1 | 1 | 2 | 2 | 1 | 4 | 1 | 4 | 0 |
| Sawteeth | 2 | 1 | 2 | 1 | 2 | 1 | 2 | 2 | 4 | 1 | 3 | 1 |
| Sirloins | 2 | 2 | 1 | 2 | 1 | 2 | 2 | 1 | 4 | 1 | 3 | 1 |
| Wideloads | 2 | 1 | 2 | 1 | 2 | 2 | 2 | 1 | 4 | 1 | 3 | 1 |
| Wild Pigs | 2 | 1 | 2 | 1 | 2 | 2 | 2 | 1 | 5 | 1 | 3 | 0 |
