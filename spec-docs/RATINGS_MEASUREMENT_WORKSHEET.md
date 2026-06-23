# RATINGS MEASUREMENT MODEL — SMB4-native, low-noise signal per rating

**Status:** DESIGN — converged in the attended JK design session 2026-06-23 (still tuning §16 thresholds). **Supersedes** the earlier deep-dive board. **Provenance:** GameTracker signal deep-dive (`wf_f6c0aee0`) → adversarial noise-skeptic → a long JK push-back session that materially improved it (the corrections are noted inline). Feeds `RATINGS_ADJUSTMENT_SPEC §3B`, `EXPECTED_STATS_CATEGORY_META` (`src/engines/expectedStatsEngine.ts:43-72`), the RA-2a adapter (`src/engines/expectedStatsCategoryRates.ts`), and `seasonAggregator.ts`.

**Goal (JK):** the cleanest, lowest-noise signal per rating, NOT over-engineered, derived from what the GameTracker actually captures (not MLB box-score defaults). Find signal among noise.

---

## 1. Core principle — why over-expectation is the right SMB4 signal
SMB4 hitting is a **reticle (contact) + center dot (power)** the user lines up with the pitch; the reticle/dot **size scales with the player's ratings** (higher rating = bigger = easier to line up). So:
- A user who squares up a **low-rated** player's small reticle/dot is **out-playing the rating** → genuine over-expectation.
- A user who mishits with a **high-rated** player is **under-playing it**.

This is exactly why **actual − expected (peer-calibrated, per category), z-scored, weighted-blended** is the correct model: the rating literally sets how hard the outcome is to produce, so the gap between produced and expected *is* the development signal. We measure **contact quality + power output + the pitcher's contact-suppression**, NOT outcomes like AVG/HR-rate. Everything is z-scored within the **position × role pool** (and own pool for pitchers' bat/run/field). Magnitudes/weights = §16 sim-tune; the SHAPES below are the rulings.

---

## 2. The batted-ball quality engine (one engine, two consumers)
Every ball in play is characterized in 3 dimensions from data we already capture, then read by BOTH the batter (power/contact) and the pitcher (velo/junk), each z-scored vs their own pool:

| Dimension | SMB4 tracker source |
|---|---|
| **Exit velo** | `contactType` enrichment: hard / normal / weak / bloop |
| **Launch (trajectory)** | OUT code (`GO`=ground · `LO`=line · `FO`=fly · `PO`=pop · `FLO`=foul-weak); HITS inferred from **first-landing zone** (IF=ground/pop · OF=line/fly) + the bloop/weak tag override |
| **Distance (carry)** | precise **x/y landing** (`fieldLocation`/`SprayPoint`, normalized SVG coords) → **park-adjusted feet** via `ParkDimensions`; `hrDistance` (user-entered) for HRs |

**Power = park-adjusted carry × exit-velo, CONTINUOUS, AIR-balls only** (a grounder's x/y is its first infield bounce, not carry → 0 power). **Contact = exit-velo / squared-up, launch-AGNOSTIC** (a hard grounder is squared up = good Contact, 0 Power). This cleanly disentangles the two and reproduces the high-contact/low-power vs high-power/low-contact interaction without forcing it.

> **JK refinement (key):** a hard **line-out** is the best *contact* you can have on an out (squared dead-on the barrel — a liner is rarely weak); its *power* is its measured carry, which for a flat liner is high-but-not-max (same exit velo, a ~28° fly carries farther than a ~15° liner). Launch is partly timing/luck, so we don't dock the liner — we read the actual feet. This is why we measure **distance**, not launch-tier lookups ("we were missing medium power" → the continuum has no gaps).

---

## 3. Complete outcome map (every quick-bar button)
**Principle: grade the BALL, not the situational outcome.**

**Air balls** (launch from out-code or OF-first-landing; power from carry):
| Button | Launch | Batter feeds |
|---|---|---|
| HR | barrel | POWER (top), scaled by `hrDistance` (moonshot ≫ wall-scraper) |
| 3B / ITPHR | deep fly/line | POWER *(ball carry)* + SPEED *(the legs)* — split |
| 2B / GRD | line/fly OF | POWER + CONTACT *(by carry × hardness, not the "double")* |
| 1B (OF-landing) | line/fly | CONTACT (+POWER if hard + carries) |
| **LO** | line | **CONTACT high + POWER by carry — a hard line-OUT is a robbed near-barrel; don't let the out hide elite contact** |
| FO / SF | fly | POWER by carry × hardness; weak/short = low (SF "productive" = situational) |
| PO | pop (IF) | CONTACT negative (got under it); 0 power |
| FLO (foul-out) | **graded by contactType, NOT capped** (JK) | CONTACT by hardness — a hard foul liner ≠ a sky-high foul pop; hard FLO = good contact, weak FLO = weak. No reliable launch/landing (foul) → **no power.** |

**Ground balls** (launch fixed = ground → **contactType IS the discriminator**; 0 power):
| Button | Batter feeds |
|---|---|
| GO · **FC** · **DP** · **TP** | hard grounder = squared-up CONTACT; weak = poor CONTACT. **Out-consequence (force/DP) ignored — situational noise, no extra penalty.** |
| 1B (IF-landing) | infield single = usually weak/lucky CONTACT unless tagged Hard |
| **E (reached on error)** | **grade the ball (launch + contactType); the error is the FIELDER's negative, not the batter's** |

**No ball in play:**
| Button | Batter feeds |
|---|---|
| K (swinging) | CONTACT negative (whiff = bat-to-ball failure) |
| **Kc (looking)** | **APPROACH negative (took a strike = pitch-recognition), NOT a bat-to-ball whiff** |
| D3K / WP_K / PB_K | strikeout (CONTACT neg like K); reaching = situational |
| BB | APPROACH positive (eye) + on-base |
| IBB | excluded (pitcher's choice, not the hitter's eye) |
| HBP | ~neutral / on-base |
| SAC (bunt) | excluded (intentional) |

---

## 4. Per-rating models

### POWER (hitter)
**Park-adjusted carry × exit-velo on air balls** (incl. air OUTS — a deep hard fly-out is loud power), + `hrDistance` on HRs. Grounders/pops = 0. Drops raw HR-rate (park/pull luck) + ISO (speed-leaked via 3B, hits-only). Open: barrel/carry threshold (does a hard liner need distance, or is hard-on-the-barrel enough?).

### CONTACT (hitter)
**Squared-up rate (exit-velo, launch-agnostic) − weak/pop/whiff**, + the **approach** term (capped): chase-avoidance, called-K-take, first-pitch productivity (`pitchCount==1`). Drops raw AVG (BABIP-inverted). The contactType grades quality regardless of count, so approach isn't double-graded.

### SPEED — needs the UBR aggregator (zero new capture)
**SB% = SB/(SB+CS)** (gated ≥~5 att) + **extra-base take-rate** via `calculateUBR` (built+tested but **never called** → UBR=0 today; only the RunnerSubEntry→AdvancementStats aggregator is missing) + **BEAT_THROW** (beat-out infield hit = out-of-box speed vs the IF arm). 3B/ITPHR legs route here. Drops raw SB-count / 3B-as-power. **Confound (disclose):** SB% saturates near 100% (user-as-manager rarely sends slow runners → measures send-discipline) → lean on UBR.

### FIELDING — difficulty is MEASURED, not inferred (deep play-type data; needs the *ByPosition aggregator)
**Difficulty-weighted conversion rate** = Σ over the fielder's plays of `(made ? +w : −0 [non-conversion])` ÷ opportunities, where **`w` = the EXPLICIT play-type ladder** (user-tagged per play, `eventLog.ts:415-423` `FieldingPlayType`), NOT an inferred/subjective difficulty. This obsoletes the old confirm-prompt — **the enrichment IS the difficulty signal.** The play type tells us *how hard*; the precise **x/y + spray-inferred fielder** adds *how much ground he covered* (range) — together a fuller picture than either alone.

**Play-type difficulty ladder (RULED JK — §16 magnitudes):**
| Tier | Play types | weight |
|---|---|---|
| MAX | `robbed_hr` | max (the HR-saving ceiling) |
| HIGH | `diving`, `sliding` | high |
| MID | `leaping` (jumping) | mid |
| LOW | `over_shoulder`, `running` | low |
| routine | `charging`, default, **everything else** | 0 |
> **`wall` is REMOVED** (JK) — a wall catch that isn't a robbery is usually a warning-track *leap*, so a separate `wall` weight double-counts `leaping`. `failed_robbery` / `missed_dive` / `missed_leap` = **non-conversions** at their attempted tier (no positive credit; the ball was hard — no extra penalty).

- **Made/missed is explicit** (`fieldingAttemptOutcome`), incl. the miss variants → a fielder who *converts* hard plays at a high rate is elite.
- **First-base SCOOP** (`rescuedThrow`, `gameTrackerPlayLog.ts:461`) = a **1B-only RECEIVING** signal — scooping a bad throw converts an error into an out. **v1: +1B fielding credit; the thrower is neutral** (a "throws-that-needed-rescuing" thrower-accuracy ding = v2).
- **Bases-saved** flag = fielder credit for holding runners even when it's not an out.
- **Drops:** fielding% (saturated — only flags rare butterfingers) + (PO+A)/games (position/volume artifact).
- **Coverage:** the play-type tags are optional enrichment → rich signal for diligent enrichers, null-gates to the basic put-out/assist conversion for casual users (same spine/refinement shape as contact-quality). Stranded behind the unbuilt season rollup (*ByPosition aggregator) today.

### ARM
- **OF (live):** (assists + held) / (assists + held + extra-bases-allowed); extra-bases-allowed needs an aggregator. Drops raw assist count (selection paradox — a feared arm gets fewer challenges).
- **Catcher:** CS%-**with-pitcher-discount** (CS 95% catcher / SB-allowed 55% pitcher per `kblWpaAttribution.ts`); surface the discounted rate, never raw CS%.
- **Infield — UNFROZEN (JK):** the close-play outcome isolates the throw from range. **IF-arm = BEAT_RUNNER / (BEAT_RUNNER + BEAT_THROW)** on that fielder's close plays (the ball's already fielded; the close play is purely throw strength/accuracy/transfer). Caveats: BR/BT are optional modifiers (coverage) + the fielder must be tagged on the BR play (build-confirm).

### VELOCITY (pitcher) — suppression, not hardness
**Whiffs (swinging-K) + weak-AIR induced (pop-ups, weak/late flies) + foul-off rate** — how often the hitter *fails to square it up* (velo beats timing). **NOT the hardness of allowed contact** (that's physics — velo makes contact hard when it happens, but rarer). Barrel-rate-allowed survives only as a **peer-relative SECONDARY negative** (the pool baselines the inherent hard-when-hit; you're dinged only for being barreled *more* than velo-peers). Drops raw K% (lumps called Ks) + FIP.

### JUNK (pitcher)
**Weak-GROUND induced + ground-ball rate + weak-contact induced + chase→weak-contact** + `Kc` *(shared, partial)*. Junk's weakness is on the ground (fooled/on-top); velo's is in the air (late/under) — **that air/ground split assigns every weak-contact event to exactly ONE rating → no velo/junk double-count.** Drops FIP-as-junk.

### ACCURACY (pitcher)
**Walk-avoidance** (`BB` only; `IBB`/`HBP` carved out by distinct codes) + `Kc` *(corner-painting, shared partial)* + **per-batter pitch economy** (`pitchCount`/BF, MADDUX anchor). `Kc` feeds BOTH Junk and Accuracy at partial weight (a backwards K *requires* command + movement — the junkballer; they correlate realistically without collapsing). The fine strike-zone grid would later sharpen this (corner location). Drops FIP-as-command.

### PITCHER NON-PITCHING — 4-tool parity (JK correction)
Pitchers' **Power / Contact / Speed / Fielding measured the SAME way as position players**, just vs the **pitcher pool**. NOT a "light build" — the same engine; the **sample gate simply fires more often** (few PA/chances → many null-gate). **ARM is EXCLUDED for pitchers (RULED JK 2026-06-23):** SMB4 gives pitchers only **7 rating categories** (VEL/JNK/ACC + POW/CON/SPD/FLD) — pitchers have **no arm rating at all**, so there is nothing to develop. RA-1 already null-gates pitcher arm (`expectedStatsEngine.ts:183,217`) — leave as-is.

---

## 5. Quality tiers (the barrel thresholds — §16 magnitudes, shapes ruled)
Continuous is preferred (carry × exit-velo), but the discrete tiers are the fallback if x/y isn't reliably populated:

| Tier | Definition | Power | Contact |
|---|---|---|---|
| **BARREL** | hard + air + deep carry | ★ max | ★ |
| **SOLID** | hard + air + mid carry, or any hard liner | high | ★ |
| **HARD GROUNDER** | hard + ground | **0** | ★ (squared) |
| **NORMAL / flare** | normal, shallow-mid | low | neutral |
| **WEAK** | weak/bloop · pop-up · foul-out · weak grounder | 0 | ✗ |
| **WHIFF** | swinging-K | 0 | ✗✗ |

---

## 6. Verified data facts (this session)
- **Spray = precise normalized x/y** (`EnrichmentPanel.tsx:302` `svgToNormalizedPoint`→`SprayPoint`; `fieldLocation:{x,y}`), NOT 7 bands (that was stale `gameTrackerFieldTypes` code). **Park dimensions** exist for franchise (`ParkDimensions`, `franchiseStadiumFoundation.ts`).
- **Spray + `contactType` captured on HITS as well as outs** (`ENRICHMENT_CONFIG` — `1B/2B/3B/GRD/ITPHR` all `spray:true, contactType:true`).
- **K (swinging) vs Kc/Ꝁ (called)** = distinct one-tap buttons (`useGameState.ts:317`, `eventLog.ts:2180`). **`pitchCount` is per-AB** (so `==1` = first-pitch swing).
- **BEAT_THROW** on hits/FC (batter beat the throw = speed); **BEAT_RUNNER** on outs (throw beat the runner = arm).
- **`contactType` set** = {normal, weak, hard, bloop, bunt}; `normalizeContact` collapses legacy/unknown → "normal".
- **Latent bugs (spawned as a task):** `eventLog.ts:2174` `isHit` omits `ITPHR`/`GRD` (AB charged, no hit → AVG undercount); `:2180` K-counter omits `Ꝁ`/D3K-family.

---

## 7. Open build-confirms & §16 thresholds
1. **FIRST-LANDING semantic (load-bearing):** the spec says "tap where the ball landed *or was fielded*" — must tighten the tap instruction to *"where it first hit the ground/wall,"* else a grounder fielded in the OF masquerades as a liner and corrupts trajectory + distance. Wording change, no new capture.
2. **Confirm the live spray UI populates x/y** (vs only a coarse zone) — the model assumes precise coords. The spray is a **marker-anchored POLAR model** (`EnrichmentPanel.tsx:227`: r=0 home plate · **r=0.45 IF/OF boundary** · r=1.0 fence · foul lines = angular bounds) → IF/OF split = `r<0.45`, carry ≈ `r × park fence-distance(direction)`. **FIELD-LEAK GATE (JK, historical problem): verify the DRAWN field image's markers (IF arc/fence/foul lines) ALIGN with this polar model + the viewBox transform (a tap "at the fence" → r≈1.0) before trusting any distance.**
3. **Barrel/carry threshold** — what park-adjusted feet = barrel; does a hard liner need distance or is hard-on-the-barrel enough.
4. **`Kc` split weight** between Junk and Accuracy.
5. **IF-arm BR/BT coverage** — do BEAT_RUNNER/BEAT_THROW clear a coverage bar + is the fielder tagged on the BR play.
6. **Pitcher arm** — non-zero in SMB4?
7. All weights/magnitudes = §16 sim-tune.

## 8. Disclosed v1 confounds (document, don't engineer away)
- **Opponent quality unnormalized** — single-user franchise faces a small non-random divisional pool; rates inherit schedule luck that doesn't fully wash out.
- **SB% send-discipline** (see Speed).

## 9. Build dependencies (the cheap, high-leverage unlocks)
- **UBR season aggregator** (RunnerSubEntry→AdvancementStats) — lights up Speed take-rate (zero new capture).
- ***ByPosition zone/difficulty aggregator** — lights up Fielding range (zero new capture); pitcher fielding rides it.
- **extraBasesAllowed** aggregator (OF arm); **catcher-CS-with-discount** aggregator; **BEAT_THROW/BEAT_RUNNER** close-play aggregator (Speed + IF-arm).
- **First-landing tap-instruction** tightening (UX wording).
- **Distance estimator** = x/y landing × `ParkDimensions` → park-adjusted carry (air balls).
- **Deferred to v2:** the fine clickable x/y strike-zone grid (corner-paint purity for Accuracy + fastball-tag for Velo) — the walk-avoidance + air/ground split carry v1.

## 10. Rulings reference
Session rulings logged in `DECISIONS_LOG.md` 2026-06-23 (the measurement-model rebuild). The four earlier RA-2 forks + contact-quality-in-v1 + TV-threshold-decoupled remain in force.
