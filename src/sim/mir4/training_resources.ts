// The resource bridge between WoC's physical gathering/combat surfaces and
// MIR4 Training. WoC keeps ownership of nodes, casts, tools, respawns and mob
// ecology; this module adds only the MIR4 progression yield after a successful
// authoritative action.

import type { GatherNodeDef, MobFamily } from '../types';
import { MIR4_EMPTY_MATERIALS, type Mir4Materials } from './equipment';
import { mir4MetalForNode } from './equipment_mining';
import { type Mir4SolitudeMaterialFamily, mir4SolitudeMaterialKey } from './solitude_training';
import { mir4ModifiedProgressionReward } from './status_effects';
import type { Mir4StatusRecord } from './status_values';
import type { Mir4TrainingMaterialRarity } from './training';
import { markMir4WireDirty } from './wire_revision';

const MATERIAL_COUNT_CAP = 1_000_000_000;

type Mir4GatherRewardRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Mir4TrainingResourceTarget {
  mir4Materials?: Mir4Materials;
  mir4Currencies?: { darksteel: number; energy: number };
}

export interface Mir4HerbalismArea {
  readonly id: string;
  readonly zoneIds: readonly string[];
  readonly material: keyof Mir4Materials;
  readonly rarity: Mir4TrainingMaterialRarity;
}

export type Mir4GatherProgressionSource =
  | Readonly<{
      kind: 'training-material';
      material: keyof Mir4Materials;
      rarity: Mir4TrainingMaterialRarity;
    }>
  | Readonly<{
      kind: 'ore';
      material: keyof Mir4Materials;
      mapId: string;
      darksteel: boolean;
    }>;

/** Curated resource districts on the original WoC map. The node positions and
 * visuals remain native; these rows decide which Training plant grows there. */
export const MIR4_HERBALISM_AREAS: readonly Mir4HerbalismArea[] = Object.freeze([
  {
    id: 'mirror-lake-herb-beds',
    zoneIds: ['eastbrook_vale'],
    material: 'herbLeaf',
    rarity: 'common',
  },
  {
    id: 'mirefen-reishi-banks',
    zoneIds: ['mirefen_marsh', 'farshore_isle'],
    material: 'reishi',
    rarity: 'common',
  },
  {
    id: 'thornpeak-root-shelves',
    zoneIds: ['thornpeak_heights', 'frostveil'],
    material: 'herbRoot',
    rarity: 'uncommon',
  },
  {
    id: 'volatile-flower-groves',
    zoneIds: ['veiled_hollow', 'drakelands', 'amberfall', 'nightbloom', 'wraithwood'],
    material: 'flowerOil',
    rarity: 'rare',
  },
  {
    id: 'century-orchards',
    zoneIds: ['willowfen', 'galecrest', 'palmreach', 'evergarden'],
    material: 'centuryFruit',
    rarity: 'epic',
  },
]);

export const MIR4_DARKSTEEL_MINING_ZONES = Object.freeze([
  'veiled_hollow',
  'drakelands',
  'nightbloom',
  'wraithwood',
] as const);

export const MIR4_SOLITUDE_HERBALISM_AREAS: readonly Readonly<{
  family: Extract<Mir4SolitudeMaterialFamily, 'noirsoulHerb' | 'flowerOil' | 'centuryFruit'>;
  zoneIds: readonly string[];
}>[] = Object.freeze([
  { family: 'noirsoulHerb', zoneIds: ['nightbloom', 'wraithwood'] },
  {
    family: 'flowerOil',
    zoneIds: ['veiled_hollow', 'drakelands', 'amberfall'],
  },
  {
    family: 'centuryFruit',
    zoneIds: ['willowfen', 'galecrest', 'palmreach', 'evergarden'],
  },
]);

function saturatingCredit(current: number, amount: number): number {
  return Math.min(MATERIAL_COUNT_CAP, Math.max(0, Math.floor(current)) + Math.max(0, amount));
}

function solitudeRarity(rarity: Mir4GatherRewardRarity): 'rare' | 'epic' | 'legendary' {
  if (rarity === 'legendary') return 'legendary';
  if (rarity === 'epic') return 'epic';
  return 'rare';
}

function solitudeHerbFamily(zoneId: string): Mir4SolitudeMaterialFamily | null {
  return (
    MIR4_SOLITUDE_HERBALISM_AREAS.find((area) => area.zoneIds.includes(zoneId))?.family ?? null
  );
}

export function mir4SolitudeHerbalismZonesForFamily(
  family: Mir4SolitudeMaterialFamily,
): readonly string[] {
  return MIR4_SOLITUDE_HERBALISM_AREAS.find((area) => area.family === family)?.zoneIds ?? [];
}

export function mir4HerbalismAreaForZone(zoneId: string): Mir4HerbalismArea | undefined {
  return MIR4_HERBALISM_AREAS.find((area) => area.zoneIds.includes(zoneId));
}

export function mir4HerbalismZonesForMaterial(material: keyof Mir4Materials): readonly string[] {
  return MIR4_HERBALISM_AREAS.find((area) => area.material === material)?.zoneIds ?? [];
}

export function mir4GatherProgressionSourceForNode(
  node: Pick<GatherNodeDef, 'type' | 'zoneId'> & Partial<Pick<GatherNodeDef, 'id' | 'pos'>>,
): Mir4GatherProgressionSource | null {
  if (node.type === 'herb') {
    const area = mir4HerbalismAreaForZone(node.zoneId);
    return area
      ? {
          kind: 'training-material',
          material: area.material,
          rarity: area.rarity,
        }
      : null;
  }
  if (node.type !== 'ore') return null;
  if (!node.id || !node.pos) return null;
  const metal = mir4MetalForNode({
    id: node.id,
    zoneId: node.zoneId,
    pos: node.pos,
  });
  return metal
    ? {
        kind: 'ore',
        material: metal.material,
        mapId: metal.mapId,
        darksteel: (MIR4_DARKSTEEL_MINING_ZONES as readonly string[]).includes(node.zoneId),
      }
    : null;
}

/** Credits the MIR4 reward paired with one already-completed WoC harvest. */
export function grantMir4GatherProgressionReward(
  target: Mir4TrainingResourceTarget,
  node: Pick<GatherNodeDef, 'type' | 'zoneId'> & Partial<Pick<GatherNodeDef, 'id' | 'pos'>>,
  rolledRarity: Mir4GatherRewardRarity,
  grantedQty: number,
  statuses?: Mir4StatusRecord,
): Readonly<{
  material?: keyof Mir4Materials;
  amount: number;
  darksteel: number;
}> {
  const qty = Math.max(0, Math.floor(grantedQty));
  if (qty <= 0) return { amount: 0, darksteel: 0 };

  const source = mir4GatherProgressionSourceForNode(node);
  if (source?.kind === 'training-material') {
    const rarityBonus = rolledRarity === 'legendary' ? 2 : rolledRarity === 'epic' ? 1 : 0;
    const amount = qty + rarityBonus;
    const wallet = { ...MIR4_EMPTY_MATERIALS, ...target.mir4Materials };
    wallet[source.material] = saturatingCredit(wallet[source.material], amount);
    const solitudeFamily = solitudeHerbFamily(node.zoneId);
    if (solitudeFamily) {
      const solitudeKey = mir4SolitudeMaterialKey(solitudeFamily, solitudeRarity(rolledRarity));
      wallet[solitudeKey] = saturatingCredit(wallet[solitudeKey], qty);
    }
    target.mir4Materials = wallet;
    markMir4WireDirty(target);
    return { material: source.material, amount, darksteel: 0 };
  }

  if (source?.kind === 'ore') {
    const wallet = { ...MIR4_EMPTY_MATERIALS, ...target.mir4Materials };
    wallet[source.material] = saturatingCredit(wallet[source.material], qty);
    target.mir4Materials = wallet;
    if (!source.darksteel) {
      markMir4WireDirty(target);
      return { material: source.material, amount: qty, darksteel: 0 };
    }
    const rarityMultiplier: Readonly<Record<Mir4GatherRewardRarity, number>> = {
      common: 1,
      uncommon: 2,
      rare: 4,
      epic: 8,
      legendary: 16,
    };
    // A level-70 player reaches the first vessel beside two physical ore
    // nodes in Nightbloom. At the native four-minute per-player respawn, 10
    // common harvests are a roughly twenty-minute same-zone loop for the
    // first 1,000-Darksteel attempt. The previous factor of 10 stretched that
    // exact loop past three hours and made the unlock functionally inert.
    const base = qty * 100 * rarityMultiplier[rolledRarity];
    const amount = mir4ModifiedProgressionReward(base, 'darksteel', statuses);
    const currencies = target.mir4Currencies ?? { darksteel: 0, energy: 0 };
    target.mir4Currencies = {
      ...currencies,
      darksteel: saturatingCredit(currencies.darksteel, amount),
    };
    markMir4WireDirty(target);
    return { material: source.material, amount: qty, darksteel: amount };
  }

  return { amount: 0, darksteel: 0 };
}

export function grantMir4TrainingCombatMaterial(
  target: Mir4TrainingResourceTarget,
  source: Readonly<{
    family?: MobFamily;
    elite?: boolean;
    boss?: boolean;
    level?: number;
  }>,
): keyof Mir4Materials | null {
  let key: keyof Mir4Materials | null = null;
  if (source.boss || source.elite) key = 'boundlessShard';
  else if (
    source.family === 'beast' ||
    source.family === 'reptile' ||
    source.family === 'dragonkin'
  ) {
    key = 'unihornSlice';
  } else if (
    source.family === 'humanoid' ||
    source.family === 'troll' ||
    source.family === 'ogre'
  ) {
    key = 'lunarShard';
  } else if (
    source.family === 'undead' ||
    source.family === 'demon' ||
    source.family === 'spider'
  ) {
    key = 'etherealShard';
  } else if (source.family === 'elemental') key = 'solarShard';
  else if (source.family === 'mudfin' || source.family === 'burrower') key = 'boundlessShard';
  if (!key) return null;
  const wallet = { ...MIR4_EMPTY_MATERIALS, ...target.mir4Materials };
  wallet[key] = saturatingCredit(wallet[key], 1);
  if (source.family === 'beast' || source.family === 'reptile' || source.family === 'dragonkin') {
    const rarity =
      source.boss || (source.level ?? 0) >= 120
        ? 'legendary'
        : source.elite || (source.level ?? 0) >= 90
          ? 'epic'
          : 'rare';
    const solitudeKey = mir4SolitudeMaterialKey('unihorn', rarity);
    wallet[solitudeKey] = saturatingCredit(wallet[solitudeKey], 1);
  }
  target.mir4Materials = wallet;
  markMir4WireDirty(target);
  return key;
}
