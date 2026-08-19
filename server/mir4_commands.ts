// The mir4-gameplay-port WS dispatch delegate: the single 'mir4' envelope
// (m sub-action) routed from server/game.ts dispatchMessage, keeping that
// coordinator under its monolith ceiling. Every field is validated here and
// every verb re-runs through the sim's own admission gates (mp, cooldown,
// GCD, range, target life): the client's optimistic {ok:true} is never
// authority.

import type { Sim } from '../src/sim/sim';

type Mir4WireMessage = Record<string, unknown> & { m?: unknown };

export function handleMir4Command(sim: Sim, msg: Mir4WireMessage, pid: number): void {
  const action = typeof msg.m === 'string' ? msg.m : '';
  switch (action) {
    case 'auto':
      if (typeof msg.on === 'boolean') sim.setMir4AutoBattle(msg.on, pid);
      break;
    case 'quest':
      if (typeof msg.on === 'boolean') sim.setMir4AutoQuest(msg.on, pid);
      break;
    case 'cast':
      if (typeof msg.skill === 'number') {
        const target = typeof msg.target === 'number' ? msg.target : undefined;
        sim.castMir4Skill(msg.skill | 0, pid, target);
      }
      break;
    case 'basic': {
      const target = typeof msg.target === 'number' ? msg.target : undefined;
      sim.mir4BasicAttack(target, pid);
      break;
    }
    case 'equip':
      sim.mir4EquipStarterWeapon(pid);
      break;
    case 'unequip':
      sim.mir4UnequipWeapon(pid);
      break;
    default:
      break;
  }
}
