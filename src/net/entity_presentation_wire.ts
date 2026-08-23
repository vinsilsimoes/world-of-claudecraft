import type { Entity, MobFamily } from '../sim/types';

const MOB_FAMILIES: ReadonlySet<string> = new Set([
  'beast',
  'humanoid',
  'mudfin',
  'spider',
  'burrower',
  'undead',
  'troll',
  'ogre',
  'elemental',
  'dragonkin',
  'demon',
  'reptile',
]);

export interface MobPresentationWire {
  family?: MobFamily;
  elite?: boolean;
  boss?: boolean;
}

export interface Mir4ShieldWire {
  remaining: number;
  magnitude: number;
}

export interface Mir4EquipmentPresentationWire {
  classId?: number;
  armorMask?: number;
}

export function decodeMir4EquipmentPresentationWire(
  wire: Record<string, unknown>,
): Mir4EquipmentPresentationWire {
  if (!Number.isSafeInteger(wire.mvc) || Number(wire.mvc) < 1 || Number(wire.mvc) > 5) {
    return {};
  }
  return {
    classId: Number(wire.mvc),
    armorMask:
      Number.isSafeInteger(wire.mva) && Number(wire.mva) >= 0 && Number(wire.mva) <= 15
        ? Number(wire.mva)
        : 0,
  };
}

export function decodeMobPresentationWire(wire: Record<string, unknown>): MobPresentationWire {
  const family =
    typeof wire.mfr === 'string' && MOB_FAMILIES.has(wire.mfr)
      ? (wire.mfr as MobFamily)
      : undefined;
  return {
    family,
    elite: wire.mel === 1 ? true : undefined,
    boss: wire.mbs === 1 ? true : undefined,
  };
}

export function decodeMir4ShieldWire(value: unknown): Mir4ShieldWire | undefined {
  if (!Array.isArray(value) || value.length !== 2) return undefined;
  const [remaining, magnitude] = value;
  if (
    typeof remaining !== 'number' ||
    !Number.isFinite(remaining) ||
    remaining <= 0 ||
    typeof magnitude !== 'number' ||
    !Number.isFinite(magnitude) ||
    magnitude <= 0 ||
    magnitude >= 1
  ) {
    return undefined;
  }
  return { remaining, magnitude };
}

export function applyEntityPresentationIdentity(
  entity: Entity,
  wire: Record<string, unknown>,
): void {
  const presentation = decodeMobPresentationWire(wire);
  entity.mobFamily = entity.kind === 'mob' ? presentation.family : undefined;
  entity.mobElite = entity.kind === 'mob' ? presentation.elite : undefined;
  entity.mobBoss = entity.kind === 'mob' ? presentation.boss : undefined;
  const mir4 = decodeMir4EquipmentPresentationWire(wire);
  entity.mir4VisualClassId = entity.kind === 'player' ? mir4.classId : undefined;
  entity.mir4VisualArmorMask = entity.kind === 'player' ? mir4.armorMask : undefined;
}

export function applyEntityPresentationDynamic(
  entity: Entity,
  wire: Record<string, unknown>,
): void {
  entity.mir4Shield = decodeMir4ShieldWire(wire.msh);
}
