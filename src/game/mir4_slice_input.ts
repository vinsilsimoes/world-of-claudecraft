// TEMPORARY Phase 2 slice scaffolding: lets a human drive the mir4 systems
// before the real HUD surfaces (the IWorld facet + hud/mir4 domain of the
// remaining part 2). Only active when the Sim runs the mir4-gameplay-port
// profile; inert under woc-classic. Delete when the facet replaces it.
//
// Surface: a small fixed panel with the AUTO BATTLE toggle button and the
// QUEST TRACKER row (click: start/stop the auto-quest journey; the status
// line polls sim.mir4AutoQuestStatusText). Keys G/H remain for manual casts;
// no letter hotkeys are bound for the toggles (T/B etc. belong to the classic
// HUD keybinds and must not be shadowed).

import { MIR4_GAME_PROFILE } from '../sim/game_profile';
import type { Sim } from '../sim/sim';

const PANEL_CSS = [
  'position:fixed',
  'right:14px',
  'bottom:14px',
  'z-index:9999',
  'display:flex',
  'flex-direction:column',
  'gap:6px',
  'font:13px sans-serif',
  'color:#eee',
].join(';');

const BUTTON_CSS = [
  'background:rgba(20,24,32,.85)',
  'border:1px solid #5a6b8a',
  'border-radius:6px',
  'color:#eee',
  'padding:6px 12px',
  'cursor:pointer',
  'text-align:left',
  'min-width:210px',
].join(';');

export function wireMir4SlicePlaytest(sim: Sim): void {
  if (sim.cfg.gameProfile !== MIR4_GAME_PROFILE) return;
  const player = sim.entities.get(sim.playerId);
  if (!player) return;

  let autoBattleOn = false;
  let autoQuestOn = false;

  const panel = document.createElement('div');
  panel.style.cssText = PANEL_CSS;

  const battleBtn = document.createElement('button');
  battleBtn.type = 'button';
  battleBtn.style.cssText = BUTTON_CSS;

  const questBtn = document.createElement('button');
  questBtn.type = 'button';
  questBtn.style.cssText = BUTTON_CSS;

  const sync = () => {
    battleBtn.textContent = autoBattleOn ? '⚔ Auto battle: ON' : '⚔ Auto battle: OFF';
    questBtn.textContent = autoQuestOn
      ? `▸ ${sim.mir4QuestStatusText()}`
      : '▸ Quest: Primeiros Rastros (auto)';
  };
  battleBtn.addEventListener('click', () => {
    autoBattleOn = !autoBattleOn;
    sim.setMir4AutoBattleMode(autoBattleOn ? 'battle' : 'off');
    sync();
  });
  questBtn.addEventListener('click', () => {
    autoQuestOn = !autoQuestOn;
    sim.setMir4AutoQuest(autoQuestOn);
    if (!autoQuestOn) questBtn.textContent = '▸ Quest: Primeiros Rastros (auto)';
  });

  const weaponBtn = document.createElement('button');
  weaponBtn.type = 'button';
  weaponBtn.style.cssText = BUTTON_CSS;
  const syncWeapon = () => {
    const equipped = !!sim.players.get(sim.playerId)?.mir4Equipment?.weapon;
    weaponBtn.textContent = equipped
      ? '🗡 Arma inicial: equipada (clique para remover)'
      : '🗡 Equipar arma inicial (+75 ataque)';
  };
  weaponBtn.addEventListener('click', () => {
    const equipped = !!sim.players.get(sim.playerId)?.mir4Equipment?.weapon;
    if (equipped) sim.mir4UnequipWeapon();
    else sim.mir4EquipStarterWeapon();
    syncWeapon();
  });
  panel.append(battleBtn, questBtn, weaponBtn);
  document.body.appendChild(panel);
  sync();
  syncWeapon();
  window.setInterval(() => {
    if (autoQuestOn) sync();
    if (autoQuestOn && !sim.players.get(sim.playerId)?.mir4AutoQuest) {
      autoQuestOn = false; // journey finished
      sync();
    }
  }, 300);

  window.addEventListener('keydown', (ev) => {
    if (ev.repeat) return;
    const targetId = sim.entities.get(sim.playerId)?.targetId ?? undefined;
    if (ev.key === 'g' || ev.key === 'G') sim.castMir4Skill(1102, sim.playerId, targetId);
    else if (ev.key === 'h' || ev.key === 'H') sim.mir4BasicAttack(targetId);
  });
}
