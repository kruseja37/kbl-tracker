import type { ActiveTeamVM, HubVM } from "./FranchiseLensHub";
import type { MojoState, Player, Position } from "../../../../utils/leagueBuilderStorage";
import {
  FRANCHISE_FIELD_POSITIONS,
  FRANCHISE_ROTATION_SIZE,
  getFranchisePlayerName,
} from "../../utils/franchiseLineupDomain";
import { useFranchiseNextGameLineupAdvisor } from "../../hooks/useFranchiseNextGameLineupAdvisor";
import { useFranchiseLineupRotationEditor } from "../../hooks/useFranchiseLineupRotationEditor";

const MOJO_STATES: MojoState[] = ["On Fire", "Hot", "Normal", "Cold", "Ice Cold"];

/**
 * FranchiseLineupsBoard — the Fenway-hub Lineups surface. A smart component (the hub is otherwise a
 * pure view): it loads the active club's raw roster + runs the engine seam against the opponent's next
 * starter via the shared hooks, then renders a board-chalk presentation. Same engine + edit logic as
 * the legacy Lineups tab; only the skin differs. Franchise rules: no DH, four-man rotation, bench +
 * bullpen visible. The optimal lineup is a SCOUT ADVISOR, never a manager-WPA input.
 */
export function FranchiseLineupsBoard({ hub, active }: { hub: HubVM; active: ActiveTeamVM }) {
  const lineups = hub.lineups;

  const advisor = useFranchiseNextGameLineupAdvisor({
    franchiseId: lineups?.franchiseId,
    leagueId: lineups?.leagueId,
    activeTeamId: lineups?.activeTeamId ?? active.id,
    opponentTeamId: lineups?.opponentTeamId ?? null,
    opponentGamesPlayed: lineups?.opponentGamesPlayed ?? 0,
  });
  const editor = useFranchiseLineupRotationEditor({
    franchiseId: lineups?.franchiseId,
    franchiseTeam: advisor.franchiseTeam,
    setFranchiseTeam: advisor.setFranchiseTeam,
    franchiseRosterPlayers: advisor.rosterPlayers,
  });

  if (!lineups?.franchiseId) {
    return <div className="fen-empty">Lineups need a live franchise — open one from the menu.</div>;
  }
  if (advisor.loading) {
    return <div className="fen-empty">Chalking up the lineup board…</div>;
  }

  const starter = advisor.seamResult?.opponentStarter ?? null;
  const handLabel = starter ? (starter.throws === "L" ? "LHP" : "RHP") : null;
  const starterTraits = starter
    ? (starter.traits ?? [starter.trait1, starter.trait2]).filter((t): t is string => Boolean(t))
    : [];
  const opponentName = lineups.opponentTeamName ?? "opponent";

  return (
    <div className="fen-lu">
      {advisor.loadError ? <div className="fen-lu-err fen-r">{advisor.loadError}</div> : null}

      {/* ===== Tonight's matchup ===== */}
      <div className="fen-sectlab">
        Tonight's Matchup
        <span className="lite fen-help">· {active.name} vs {opponentName}{lineups.nextGameNumber ? ` · Game ${lineups.nextGameNumber}` : ""}</span>
      </div>

      <div className="fen-lu-matchup">
        {/* Opponent starting pitcher */}
        <div className="fen-lu-card fen-lu-sp">
          <div className="fen-lu-cardlab fen-r">OPPONENT'S NEXT STARTER</div>
          {starter ? (
            <div className="fen-lu-spbody">
              <div className="fen-lu-spname fen-chalk">{starter.pitcherName}</div>
              <div className="fen-lu-spmeta">
                Throws {handLabel}{starter.pitcherRole ? ` · ${starter.pitcherRole}` : ""}
              </div>
              <div className="fen-lu-spmeta">
                VEL {starter.velocity ?? "—"} · JNK {starter.junk ?? "—"} · ACC {starter.accuracy ?? "—"}
              </div>
              {starter.arsenal && starter.arsenal.length > 0 ? (
                <div className="fen-lu-spmeta lite">Arsenal: {starter.arsenal.join(", ")}</div>
              ) : null}
              {starterTraits.length > 0 ? (
                <div className="fen-lu-spmeta lite">Traits: {starterTraits.join(", ")}</div>
              ) : null}
            </div>
          ) : (
            <div className="fen-lu-spmeta lite">
              {!lineups.hasNextGame
                ? "No upcoming game for your club — nothing to optimize against yet."
                : "Couldn't read the opponent's next starter (no rotation set). Set their rotation to unlock the matchup."}
            </div>
          )}
        </div>

        {/* Optimal lineup vs that starter */}
        <div className="fen-lu-card fen-lu-optimal">
          <div className="fen-lu-cardhead">
            <div>
              <div className="fen-lu-cardlab fen-y">OPTIMAL LINEUP{handLabel ? ` vs ${handLabel}` : ""}</div>
              {advisor.seamResult ? (
                <div className="fen-lu-spmeta lite">
                  Projected team win-value: {advisor.seamResult.snapshot.projectedTeamLineupKblWpa.toFixed(3)}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="fen-lu-btn accent"
              onClick={() => void advisor.handleAcceptOptimal()}
              disabled={!advisor.seamResult || !advisor.franchiseTeam || advisor.isApplying || advisor.optimalSlots.length === 0}
            >
              {advisor.isApplying ? "APPLYING…" : "ACCEPT OPTIMAL"}
            </button>
          </div>

          {advisor.applyError ? <div className="fen-lu-err fen-r">{advisor.applyError}</div> : null}
          {advisor.applyMessage ? <div className="fen-lu-ok">{advisor.applyMessage}</div> : null}

          {advisor.optimalSlots.length === 0 ? (
            <div className="fen-lu-spmeta lite">
              {advisor.rosterPlayers.length === 0
                ? "No MLB-active position players found for your club."
                : "No optimal lineup yet — set the opponent's next starter."}
            </div>
          ) : (
            <div className="fen-lu-optlist">
              {advisor.optimalSlots.map((slot) => (
                <div key={`${slot.battingOrderSlot}-${slot.playerId}`} className="fen-lu-optrow">
                  <span className="fen-lu-num">{slot.battingOrderSlot}</span>
                  <span className="fen-lu-optname fen-chalk">{slot.playerName}</span>
                  <span className="fen-lu-optpos fen-y">{slot.defensivePosition}</span>
                  <span className="fen-lu-num lite">{slot.projectedSlotKblWpa.toFixed(3)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== Set your lineup (interactive editor) ===== */}
      <div className="fen-sectlab">
        Set Your Lineup
        <span className="lite fen-help">· four-man rotation · no DH · swap from the bench &amp; bullpen</span>
      </div>

      <div className="fen-lu-edithead">
        <span className="fen-lu-status lite">Status: {editor.lineupRotationDirty ? "unsaved" : "saved"}</span>
        <div className="fen-lu-editbtns">
          <button
            type="button"
            className="fen-lu-btn"
            onClick={editor.rebuildManualLineupRotationFromMlb}
            disabled={!advisor.franchiseTeam || editor.isLineupRotationSaving}
          >
            REBUILD FROM ROSTER
          </button>
          <button
            type="button"
            className="fen-lu-btn accent"
            onClick={() => void editor.handleSaveLineupRotation()}
            disabled={!advisor.franchiseTeam || editor.isLineupRotationSaving || Boolean(editor.lineupRotationBlockingMessage)}
          >
            {editor.isLineupRotationSaving ? "SAVING…" : "SAVE LINEUP + ROTATION"}
          </button>
        </div>
      </div>

      {editor.storedLineupRotationWarnings.map((warning) => (
        <div key={warning} className="fen-lu-warn">{warning}</div>
      ))}
      {editor.lineupRotationBlockingMessage ? <div className="fen-lu-err fen-r">{editor.lineupRotationBlockingMessage}</div> : null}
      {editor.lineupRotationError ? <div className="fen-lu-err fen-r">{editor.lineupRotationError}</div> : null}
      {editor.lineupRotationMessage ? <div className="fen-lu-ok">{editor.lineupRotationMessage}</div> : null}

      <div className="fen-lu-edit">
        {/* Batting order + bench */}
        <div className="fen-lu-card">
          <div className="fen-lu-cardlab">BATTING ORDER</div>
          {editor.manualLineupSlots.length === 0 ? (
            <div className="fen-lu-spmeta lite">No MLB position players available.</div>
          ) : (
            <div className="fen-lu-rows">
              {editor.manualLineupSlots.map((slot, index) => (
                <div key={`${slot.battingOrder}-${slot.playerId}-${index}`} className="fen-lu-editrow">
                  <span className="fen-lu-num">{index + 1}</span>
                  <select
                    aria-label={`Lineup slot ${index + 1} player`}
                    className="fen-lu-sel grow"
                    value={slot.playerId}
                    onChange={(e) => editor.updateManualLineupSlot(index, { playerId: e.target.value })}
                  >
                    {editor.positionPlayerOptions.map((p) => (
                      <option key={p.id} value={p.id}>{getFranchisePlayerName(p)}</option>
                    ))}
                  </select>
                  <select
                    aria-label={`Lineup slot ${index + 1} position`}
                    className="fen-lu-sel pos"
                    value={slot.fieldingPosition}
                    onChange={(e) => editor.updateManualLineupSlot(index, { fieldingPosition: e.target.value as Position })}
                  >
                    {FRANCHISE_FIELD_POSITIONS.map((pos) => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                  <button type="button" aria-label={`Move lineup slot ${index + 1} up`} className="fen-lu-mini" disabled={index === 0} onClick={() => editor.moveManualLineupSlot(index, -1)}>▲</button>
                  <button type="button" aria-label={`Move lineup slot ${index + 1} down`} className="fen-lu-mini" disabled={index === editor.manualLineupSlots.length - 1} onClick={() => editor.moveManualLineupSlot(index, 1)}>▼</button>
                </div>
              ))}
              <div className="fen-lu-editrow lite">
                <span className="fen-lu-num">{editor.manualLineupSlots.length + 1}</span>
                <span className="grow">{editor.rotationStarterName ? `${editor.rotationStarterName} (auto)` : "Starting pitcher"}</span>
                <span className="fen-lu-optpos">P</span>
              </div>
            </div>
          )}
          <div className="fen-lu-pen">
            <div className="fen-lu-penlab">BENCH</div>
            {editor.benchPlayers.length === 0 ? (
              <span className="fen-lu-spmeta lite">Everyone's in the nine.</span>
            ) : (
              <div className="fen-lu-tags">
                {editor.benchPlayers.map((p) => (
                  <span key={p.id} className="fen-lu-tag">{getFranchisePlayerName(p)} <span className="lite">{p.primaryPosition}</span></span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rotation + bullpen */}
        <div className="fen-lu-card">
          <div className="fen-lu-cardlab">ROTATION ({editor.manualRotationIds.length}/{FRANCHISE_ROTATION_SIZE})</div>
          {editor.manualRotationIds.length === 0 ? (
            <div className="fen-lu-spmeta lite">No MLB starters available.</div>
          ) : (
            <div className="fen-lu-rows">
              {editor.manualRotationIds.map((playerId, index) => (
                <div key={`${playerId}-${index}`} className="fen-lu-editrow">
                  <span className="fen-lu-num">SP{index + 1}</span>
                  <select
                    aria-label={`Rotation slot ${index + 1} pitcher`}
                    className="fen-lu-sel grow"
                    value={playerId}
                    onChange={(e) => editor.setManualRotationSlotPitcher(index, e.target.value)}
                  >
                    {editor.pitcherOptions.map((p) => (
                      <option key={p.id} value={p.id}>{getFranchisePlayerName(p)} ({p.primaryPosition})</option>
                    ))}
                  </select>
                  <button type="button" aria-label={`Move rotation pitcher ${index + 1} up`} className="fen-lu-mini" disabled={index === 0} onClick={() => editor.moveManualRotationSlot(index, -1)}>▲</button>
                  <button type="button" aria-label={`Move rotation pitcher ${index + 1} down`} className="fen-lu-mini" disabled={index === editor.manualRotationIds.length - 1} onClick={() => editor.moveManualRotationSlot(index, 1)}>▼</button>
                  <button type="button" aria-label={`Remove rotation pitcher ${index + 1}`} className="fen-lu-mini danger" onClick={() => editor.removeRotationStarter(index)}>×</button>
                </div>
              ))}
            </div>
          )}
          {editor.canAddStarter ? (
            <div className="fen-lu-editrow">
              <span className="fen-lu-num lite">+SP</span>
              <select aria-label="Add a starting pitcher" className="fen-lu-sel grow" value="" onChange={(e) => editor.addRotationStarter(e.target.value)}>
                <option value="">Add starter…</option>
                {editor.bullpenPitchers.map((p) => (
                  <option key={p.id} value={p.id}>{getFranchisePlayerName(p)} ({p.primaryPosition})</option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="fen-lu-pen">
            <div className="fen-lu-penlab">BULLPEN</div>
            {editor.bullpenPitchers.length === 0 ? (
              <span className="fen-lu-spmeta lite">No relievers outside the rotation.</span>
            ) : (
              <div className="fen-lu-tags">
                {editor.bullpenPitchers.map((p) => (
                  <span key={p.id} className="fen-lu-tag">{getFranchisePlayerName(p)} <span className="lite">{p.primaryPosition}</span></span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== Lineup mojo ===== */}
      {advisor.lineupMojoPlayers.length > 0 ? (
        <>
          <div className="fen-sectlab">
            Lineup Mojo
            <span className="lite fen-help">· feeds the matchup optimizer · fitness assumed FIT in franchise play</span>
          </div>
          <div className="fen-lu-mojo">
            {advisor.lineupMojoPlayers.map((player: Player) => (
              <div key={player.id} className="fen-lu-mojorow">
                <span className="fen-chalk">{getFranchisePlayerName(player)}</span>
                <select
                  aria-label={`${getFranchisePlayerName(player)} mojo`}
                  className="fen-lu-sel"
                  value={player.mojo}
                  onChange={(e) => void advisor.handleMojoChange(player, e.target.value as MojoState)}
                >
                  {MOJO_STATES.map((mojo) => (
                    <option key={mojo} value={mojo}>{mojo}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
