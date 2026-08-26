import type { SimEvent } from '../sim/types';
import type { CharacterVisual } from './characters/visual';
import { attackAbilityId, isSpinAttackAbility } from './characters/weapon_attack_style_core';

type Mir4AttackStartEvent = Extract<SimEvent, { type: 'mir4AttackStart' }>;

/** Plays one authoritative MIR4 attack-start cue and reports whether a body accepted it. */
export function playMir4AttackStart(
  visual: CharacterVisual | null,
  event: Mir4AttackStartEvent,
): boolean {
  if (!visual) return false;
  const abilityId = attackAbilityId(event.ability ?? null);
  if (event.pose === 'cast') visual.playCastAction(abilityId, event.durationMs);
  else if (isSpinAttackAbility(abilityId)) visual.playWhirl(event.durationMs);
  else visual.playAttack(abilityId, event.durationMs);
  return true;
}
