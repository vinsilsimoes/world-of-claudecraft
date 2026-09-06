import { isDebuffAura, isPlayerRemovableAura } from '../aura_classify';
import type { SimContext } from '../sim_context';
import type { Aura, Entity } from '../types';
import { mir4EffectIsHarmful } from './effects';
import { mir4NativeRuntimeFrozenBlockPolicy } from './native_skill_frozen_block';
import { MIR4_FROZEN_BLOCK_AURA_ID } from './native_skill_frozen_block_state';

/** Apply BUFF 22021 at its authored first-contact timestamp. */
export function applyMir4NativeFrozenBlock(ctx: SimContext, source: Entity): boolean {
  const policy = mir4NativeRuntimeFrozenBlockPolicy();
  if (!policy || source.dead) return false;
  for (let index = source.auras.length - 1; index >= 0; index -= 1) {
    const active = source.auras[index];
    if (!isDebuffAura(active.kind, active.value) || !isPlayerRemovableAura(active)) continue;
    source.auras.splice(index, 1);
    ctx.emit({ type: 'aura', targetId: source.id, name: active.name, gained: false });
  }
  if (source.mir4Effects) {
    source.mir4Effects.active = source.mir4Effects.active.filter(
      (effect) => !mir4EffectIsHarmful(effect.kind, effect.magnitude),
    );
  }
  const duration = policy.durationMs / 1_000;
  const aura: Aura = {
    id: MIR4_FROZEN_BLOCK_AURA_ID,
    name: 'Frozen Block',
    kind: 'stasis',
    remaining: duration,
    duration,
    value: 0,
    sourceId: source.id,
    school: 'frost',
  };
  ctx.applyAura(source, aura);
  return source.auras.includes(aura);
}
