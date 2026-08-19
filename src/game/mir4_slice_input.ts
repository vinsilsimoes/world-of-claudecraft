// TEMPORARY Phase 2 slice scaffolding: lets a human play the mir4 combat core
// in the offline browser world before the real action-bar surface (the IWorld
// facet + HUD wiring of Phase 2 part 2) lands. Only active when the Sim runs
// the mir4-gameplay-port profile; inert under woc-classic. Delete when the
// facet replaces it.
//
// What it does: spawns three Vila do Vau wolves next to the player (passive
// until attacked, mir4 XP) and binds two keys:
//   G -> cast skill 1102 (Golpe de Vacuo) at the current target
//   H -> the authorial basic attack at the current target
// Click a wolf to target it first (the classic targeting path sets
// player.targetId, which the bridge reads).

import { MIR4_MOBS } from '../sim/content/mir4/mobs';
import { createMob } from '../sim/entity';
import { MIR4_GAME_PROFILE } from '../sim/game_profile';
import type { Sim } from '../sim/sim';

export function wireMir4SlicePlaytest(sim: Sim): void {
  if (sim.cfg.gameProfile !== MIR4_GAME_PROFILE) return;
  const player = sim.entities.get(sim.playerId);
  if (!player) return;
  for (let i = 0; i < 3; i++) {
    const wolf = createMob(
      sim.nextId++,
      MIR4_MOBS.mir4_forest_wolf,
      1,
      sim.groundPos(player.pos.x + 2.5, player.pos.z + (i - 1) * 2.5),
    );
    sim.addEntity(wolf);
  }
  window.addEventListener('keydown', (ev) => {
    if (ev.repeat) return;
    const targetId = sim.entities.get(sim.playerId)?.targetId ?? undefined;
    if (ev.key === 'g' || ev.key === 'G') sim.castMir4Skill(1102, sim.playerId, targetId);
    else if (ev.key === 'h' || ev.key === 'H') sim.mir4BasicAttack(sim.playerId, targetId);
  });
}
