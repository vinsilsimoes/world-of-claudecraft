import { ABILITIES, ITEMS } from '../../sim/data';
import { weaponHand } from '../../sim/equipment_rules';

export type WeaponAttackStyle = 'twohand' | 'dualwield';
export const SPIN_ATTACK_VISUAL_DURATION = 0.55;

const ABILITY_ID_BY_NAME = new Map(
  Object.entries(ABILITIES).map(([abilityId, ability]) => [ability.name, abilityId]),
);
const LEGACY_ABILITY_ID_BY_NAME = new Map([['Drain Life', 'drain_life']]);
const SPIN_ATTACK_ABILITIES = new Set([
  'whirlwind',
  'bladestorm',
  'dawnfall',
  'mir4_skill_1501',
  'mir4_ultimate_1',
]);

/** Damage events carry player-facing ability names. Normalize those names back
 *  to their stable IDs before choosing a renderer-only animation cue. */
export function attackAbilityId(nameOrId: string | null): string | undefined {
  if (!nameOrId) return undefined;
  if (/^mir4_(?:skill_\d+|ultimate_\d+)$/.test(nameOrId)) return nameOrId;
  return ABILITIES[nameOrId]
    ? nameOrId
    : (ABILITY_ID_BY_NAME.get(nameOrId) ?? LEGACY_ABILITY_ID_BY_NAME.get(nameOrId));
}

export function isSpinAttackAbility(abilityId: string | undefined): boolean {
  return abilityId !== undefined && SPIN_ATTACK_ABILITIES.has(abilityId);
}

export function weaponAttackStyle(
  mainhandItemId: string | null,
  offhandItemId: string | null,
): WeaponAttackStyle | null {
  const mainhand = mainhandItemId ? ITEMS[mainhandItemId] : undefined;
  if (mainhand?.kind !== 'weapon') return null;

  const offhand = offhandItemId ? ITEMS[offhandItemId] : undefined;
  if (offhand?.kind === 'weapon') return 'dualwield';
  return weaponHand(mainhand) === 'twohand' ? 'twohand' : null;
}
