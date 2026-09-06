import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { applyMir4Effect } from './effects';

export const MIR4_NATIVE_DARKNESS_BUFF_ID = 30020;
export const MIR4_NATIVE_DARKNESS_STATUS_ID = 53;
export const MIR4_NATIVE_DARKNESS_MAX_STACKS = 3;
export const MIR4_NATIVE_DARKNESS_PER_STACK = -250;
export const MIR4_NATIVE_DARKNESS_EFFECT_ID = 'mir4_native_buff_30020_53';

export function mir4NativeDarknessStacks(target: Entity): number {
  const effect = target.mir4Effects?.active.find(
    (candidate) => candidate.effectId === MIR4_NATIVE_DARKNESS_EFFECT_ID,
  );
  return Math.max(0, Math.min(MIR4_NATIVE_DARKNESS_MAX_STACKS, effect?.nativeStacks ?? 0));
}

/** Add one source-authored Darkness stack and refresh the shared BUFF 30020 duration. */
export function applyMir4NativeDarknessStack(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  durationMs: number,
  name: string,
): number {
  const stacks = Math.min(MIR4_NATIVE_DARKNESS_MAX_STACKS, mir4NativeDarknessStacks(target) + 1);
  if (target.mir4Effects) {
    target.mir4Effects.active = target.mir4Effects.active.filter(
      (effect) => effect.effectId !== MIR4_NATIVE_DARKNESS_EFFECT_ID,
    );
  }
  const applied = applyMir4Effect(ctx, target, {
    effectId: MIR4_NATIVE_DARKNESS_EFFECT_ID,
    kind: 'native-status-boost',
    durationSeconds: durationMs / 1000,
    magnitude: MIR4_NATIVE_DARKNESS_PER_STACK * stacks,
    nativeStatusId: MIR4_NATIVE_DARKNESS_STATUS_ID,
    nativeStacks: stacks,
    name,
    sourceId: source.id,
  });
  return applied.ok ? stacks : 0;
}
