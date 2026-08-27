// Pure policy for the two MIR4 automatic potion thresholds. The sim, wire
// sanitizer and HUD all resolve defaults through this module so legacy saves
// and newly created characters cannot disagree about the live trigger.

export type Mir4AutoPotionKind = 'health' | 'mana';

export interface Mir4AutoPotionThresholds {
  health: number;
  mana: number;
}

export interface Mir4AutoPotionSettings {
  health?: number;
  mana?: number;
}

export const MIR4_AUTO_POTION_MIN_PERCENT = 10;
export const MIR4_AUTO_POTION_MAX_PERCENT = 90;
export const MIR4_AUTO_POTION_STEP_PERCENT = 5;
export const MIR4_AUTO_POTION_DEFAULTS: Readonly<Mir4AutoPotionThresholds> = Object.freeze({
  health: 50,
  mana: 35,
});

export function normalizeMir4AutoPotionThreshold(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const clamped = Math.max(
    MIR4_AUTO_POTION_MIN_PERCENT,
    Math.min(MIR4_AUTO_POTION_MAX_PERCENT, value),
  );
  return Math.round(clamped / MIR4_AUTO_POTION_STEP_PERCENT) * MIR4_AUTO_POTION_STEP_PERCENT;
}

export function resolveMir4AutoPotionThresholds(
  settings?: Mir4AutoPotionSettings,
): Mir4AutoPotionThresholds {
  return {
    health: normalizeMir4AutoPotionThreshold(settings?.health, MIR4_AUTO_POTION_DEFAULTS.health),
    mana: normalizeMir4AutoPotionThreshold(settings?.mana, MIR4_AUTO_POTION_DEFAULTS.mana),
  };
}
