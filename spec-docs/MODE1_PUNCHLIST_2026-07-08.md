# MODE-1 PUNCH LIST → "JK CAN FULLY TEST THE DRAFT A-Z"
**Status doc, 2026-07-08 (JK Friday-walk findings + audit synthesis). Parent: V1_CANON §2-§3, ORPHAN_WIRING_MATRIX. Update in place as items land.**

## §1 JK FRIDAY FINDINGS (browser walk, 2026-07-03/04 — ruled defects, no further ruling needed)
| ID | Defect | Class | Fix direction |
|---|---|---|---|
| F1 | **Deterministic nomination order across drafts** — same players surface in the same order every draft (e.g. Buttons Bunterson always first) if the pool is unchanged. | Illogic (wired-but-wrong) | Nomination seed must be per-draft-instance: derive from the auction SESSION id/launch nonce, persisted in the session (resume keeps order within a draft; every new draft differs). Applies to MLB and farm. Surface: selectNextNominee seed inputs. |
| F2 | **Farm draft shows no grade-number band per scouting specialty** — beyond the intentional rating-fog differences, the farm lots lack the banded grade read the spec requires. | Missing UI + wrong source | Bands must render on farm lots AND derive from the FARM ARCHETYPE (3/5/7-band confidence per SCOUTING_INTELLIGENCE_SPEC §7) — the shipped source (hired-scout descriptor specialties) is the known S4 spec violation. |
| F3 | **Scout hiring shows a generic scout group** — the hire pool is not dependent on the chosen archetypes or prospect pool. | Wrong source | Scout-hire options must derive from the team's farm archetype (the archetype→per-area-confidence table, unbuilt); the legacy scout-pool/hire-draft mechanism is the deprecated path (Q11 refactor, never executed). |
| F4 | **Prospect quality inflated** — generated farm prospects do not match the spec's grade distribution curve. | Distribution defect | Measure: histogram generated prospects against PROSPECT_GENERATION_SPEC's curve (generator must be the inverse of the scoreSmb4Player grade oracle); fix the generator/pool-shaping to the curve; add the histogram to the gauntlet as a permanent invariant. |
| F5 | **UI style mismash across the arc** (known; design pass ordered after correctness — Staff-Your-Clubs/ballpark kit target). | Cosmetic | Reskin wave rides the kit (built 2026-07-07); after the punch list. |

## §2 THE REST OF THE PUNCH LIST (from today's audits; all ticketed)
| ID | Item | Why it gates the A-Z test |
|---|---|---|
| P1 | CPU identity auto-assign ("auto-fill remaining", deterministic, never overwrites user picks) | 30-club rooms require 60 hand-picks before LOCK — untestable at scale without it |
| P2 | Design-first mode re-validation post-port (pool-first is browser-proven; design-first is not) | Half the pool-system (Mode A) unverified |
| P3 | Farm auction → AuctionStage fold (stage already implements farm tier + fog) | Kills the mid-journey register break + gives farm the same floor UX |
| P4 | Farm-side Assistant-GM whisper (DJ-28: zero Asst-GM presence on farm) | The farm draft is advice-dead today |
| P5 | Staff carry-through (hired reporter/manager identity → hub; generic fallback today) | Staffing choices must visibly matter |
| P6 | Post-freeze summary screen (freeze results are silent today) | JK must SEE what froze (salaries, morale baselines) to validate it |
| P7 | RULES-V1-PRUNE (ruled 2026-07-07): every rules/season knob wired or removed | Decorative knobs poison a validation pass |
| P8 | Conference editor (ruled IN v1 2026-07-01; conferences:[] hardcoded) | League-build completeness |
| P9 | Wrong-fit penalty Option A (visible pre-bid debit; design §3.3 + recovered §13.3 copy) | The economy's archetype tooth — last unbuilt S7 law |
| P10 | FS-3 shill-dissolve validation (believed fixed by C3's nonCompletingTeamIds; prove in gauntlet with shills>0) | Shills-on configs must not block launch |
| P11 | Scout-hire placement in the journey: it currently gates the MLB auction though the scout is farm-only (canonical split) | Journey logic coherence; restructure = move scout-hire adjacent to the farm phase |
| P12 | JK feel-pass on reserve prices (Lever A, merged; dial default 0.65, k=0 = old economy) | The standing human gate |

## §3 THE MODE-1 GAUNTLET (the validation harness — runs after F1-F4 + P1/P2 land; re-runs after every subsequent P-item)
Scripted end-to-end browser journeys (league build → import → draft setup → lock → scout hire → MLB auction → farm auction → staffing → freeze → rules → launch → lens lands), across the grid:
- {pool-first, design-first} × {6-team SML-scale, 30-team MLB-scale} × {shills 0, shills default} × {reserve k=0, k=0.65}
- Invariants per run: zero 404s · zero console errors · pool locks with zero hand-adds · **nomination order differs between two consecutive drafts of the same pool (F1 regression)** · farm bands render + derive from archetype (F2/F3) · prospect histogram within curve tolerance (F4) · every roster completes legally (no auto-fill stranding; budgets alive per reset-doc targets) · session mid-draft crash/resume preserves state · staffing identities reach the hub (P5) · freeze summary shown (P6) · launch lands on the lens with a playable schedule flow.
- Plus one RUN-IT-BACK iterate-loop leg (edit-wall, re-draft same league).
- Output: MODE1_GAUNTLET_REPORT (pass/fail per invariant per config), committed per run.

## §4 THE ILLOGIC PASS (new audit lens, ruled by JK 2026-07-08)
Distinct from wiring audits: a behavioral-coherence review of the ENTIRE A-Z (draft arc and, separately, living season) asking per screen/step: "would a knowledgeable baseball fan/GM find this behavior nonsensical?" — e.g. identical nomination orders, generic scout pools, inflated prospect curves, prices that ignore context, advice that ignores the roster. Executor: fresh-eyes agents role-playing a GM, walking the real app + inspecting the math behind each surface, reporting illogic findings F-numbered into this doc. Run once on Mode 1 (pre-gauntlet) and once on Mode 2 (post-wiring wave).

## §5 DEFINITION OF DONE for "JK can fully test the draft A-Z"
F1-F4 fixed + P1-P8 landed + gauntlet green across the grid + illogic pass clean (or all findings ticketed) → THEN JK's feel-pass (P12) + design reskin wave (F5). P9/P11 may land in parallel with JK testing if he prefers earlier hands-on.

## §6 CONCURRENCY WITH MODE 2 (per the ruled plan)
Mode-1 lanes above touch draft-side files; Mode-2 wiring wave (flag-activation mechanism → morale trigger wiring → L10 completion → in-season Asst-GM surface → TV-award rewire → rivalry-edge HISTORY change → truth-map re-walk) touches season-side files — disjoint surfaces, concurrent lanes, same per-lane gates (Codex builds / adversarial audit / captain browser gate / SOT line per landing).
