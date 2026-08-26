// The per-environment mir4 mob families (Phase 5.4): every environment on
// the 20-map arc gets its own template set, generated from the source's zone
// mobIds census plus the spawn formula at the map's level band. Families map
// onto the fork's MobFamily vocabulary; behavior stays the shared classic AI
// (passive-until-attacked is m01's tutorial-zone rule only). XP rides the
// map's combatXpModel normal value, copied from the original 20-map runtime.
// Live rewards apply the documented long-term pacing divisors below while the
// source rows remain intact as import evidence.

import type { MobTemplate } from '../../types';
import { mir4MobTemplateProgression } from './mobs';

interface FamilySpec {
  family: MobTemplate['family'];
  /** PT-BR name stem from the source's mob ids. */
  names: readonly string[];
}

const FAMILIES: Record<string, FamilySpec> = {
  forest_wolf: { family: 'beast', names: ['Lobo', 'Loba'] },
  thorn_imp: { family: 'demon', names: ['Diabo Espinhoso'] },
  rabid_boar: { family: 'beast', names: ['Javali Enfurecido'] },
  bandit_cutthroat: { family: 'humanoid', names: ['Salteador'] },
  moss_skeleton: { family: 'undead', names: ['Esqueleto de Musgo'] },
  briar_guard: { family: 'humanoid', names: ['Guarda de Espinhos'] },
  dire_wolf: { family: 'beast', names: ['Lobo Sinistro'] },
  owlbear_cub: { family: 'beast', names: ['Filhote de Urso-Coruja'] },
  crypt_rat: { family: 'beast', names: ['Rato da Cripta'] },
  grave_crawler: { family: 'undead', names: ['Rastejante de Tumba'] },
  skeleton_spearman: { family: 'undead', names: ['Lanceiro Esqueleto'] },
  candle_wraith: { family: 'undead', names: ['Espectro de Vela'] },
  bone_marauder: { family: 'undead', names: ['Saqueador de Ossos'] },
  ghoul_biter: { family: 'undead', names: ['Carniçal Mordaz'] },
  bog_goblin_scout: { family: 'humanoid', names: ['Batedor Goblin'] },
  bog_goblin_slinger: { family: 'humanoid', names: ['Fundibalarío Goblin'] },
  mud_zombie: { family: 'undead', names: ['Zumbi de Lodo'] },
  fen_wisp: { family: 'elemental', names: ['Fogo-Fátuo'] },
  marsh_leechman: { family: 'humanoid', names: ['Homem-Sanguessuga'] },
  fungal_thrall: { family: 'humanoid', names: ['Servo Fúngico'] },
  reed_stalker: { family: 'humanoid', names: ['Espreitador de Juncos'] },
  sand_skitter: { family: 'reptile', names: ['Skitter de Areia'] },
  desert_bandit: { family: 'humanoid', names: ['Bandido do Deserto'] },
  scarab_servant: { family: 'reptile', names: ['Servo Escaravelho'] },
  dust_mummy: { family: 'undead', names: ['Múmia de Pó'] },
  jackal_raider: { family: 'beast', names: ['Chacal Saqueador'] },
  lava_imp: { family: 'demon', names: ['Diabo de Lava'] },
  ash_zombie: { family: 'undead', names: ['Zumbi de Cinzas'] },
  cinder_hound: { family: 'beast', names: ['Cão de Cinzas'] },
  magma_goblin: { family: 'demon', names: ['Goblin de Magma'] },
  obsidian_guard: { family: 'humanoid', names: ['Guarda de Obsidiana'] },
  frost_goblin: { family: 'demon', names: ['Goblin do Gelo'] },
  winter_wolf: { family: 'beast', names: ['Lobo do Inverno'] },
  snow_wraith: { family: 'undead', names: ['Espectro da Neve'] },
  ice_skeleton: { family: 'undead', names: ['Esqueleto de Gelo'] },
  void_bat: { family: 'beast', names: ['Morcego do Vazio'] },
  night_stalker: { family: 'demon', names: ['Perseguidor Noturno'] },
  blood_cultist: { family: 'humanoid', names: ['Cultista Sangrento'] },
  shadow_knight: { family: 'undead', names: ['Cavaleiro das Sombras'] },
};

/** Exact combatXpModel.normalXp rows from
 * F:/Dev/Survival-Game/server/data/mir4-mmo-world-runtime-v1.json.
 * The curve is intentionally irregular because each chapter owns a target
 * number of normal-equivalent kills and an independently budgeted XP band. */
export const MIR4_ARC_NORMAL_XP: readonly number[] = Object.freeze([
  34, 173, 687, 3_078, 12_958, 37_444, 132_290, 915_233, 1_948_427, 4_294_479, 5_436_523,
  14_330_260, 16_902_756, 63_755_887, 216_651_910, 478_539_849, 880_830_709, 2_469_385_815,
  8_257_622_570, 24_108_716_020,
]);

/**
 * Long-term live pacing for a level-200+ MMORPG. Early onboarding stays
 * responsive, then each 10-level chapter progressively relies more on field
 * combat. These divisors are an Aeldrune balance decision, not source data.
 */
export const MIR4_ARC_XP_DIVISORS: readonly number[] = Object.freeze([
  1, 1, 2, 3, 3, 5, 5, 5, 24, 24, 24, 24, 36, 36, 36, 36, 60, 60, 60, 60,
]);

export function mir4ArcNormalXp(sequence: number): number {
  const index = Math.max(0, Math.min(MIR4_ARC_NORMAL_XP.length - 1, Math.floor(sequence) - 1));
  const sourceXp = MIR4_ARC_NORMAL_XP[index] ?? MIR4_ARC_NORMAL_XP[0] ?? 1;
  const divisor = MIR4_ARC_XP_DIVISORS[index] ?? 1;
  return Math.max(1, Math.floor(sourceXp / divisor));
}

/**
 * Build one environment's mob templates at its level band: per unique mobId
 * from the source census, stats from the spawn formula at the band's levels.
 */
export function buildMir4ArcMobs(
  _environment: string,
  mobIds: readonly string[],
  levelMin: number,
  levelMax: number,
  sequence: number,
): Record<string, MobTemplate> {
  const out: Record<string, MobTemplate> = {};
  const progression = mir4MobTemplateProgression(levelMin, levelMax);
  const xp = mir4ArcNormalXp(sequence);
  for (const mobId of mobIds) {
    const spec = FAMILIES[mobId] ?? {
      family: 'beast' as const,
      names: [mobId],
    };
    const nameIdx = out ? Object.keys(out).length : 0;
    const name = spec.names[nameIdx % spec.names.length] ?? mobId;
    out[`mir4_${mobId}`] = {
      id: `mir4_${mobId}`,
      name,
      minLevel: levelMin,
      maxLevel: levelMax,
      family: spec.family,
      hpBase: progression.hpBase,
      hpPerLevel: progression.hpPerLevel,
      dmgBase: progression.dmgBase,
      dmgPerLevel: progression.dmgPerLevel,
      statAnchorLevel: progression.statAnchorLevel,
      attackSpeed: 2,
      armorPerLevel: 0,
      moveSpeed: 3.5,
      // Regional danger rises with progression. The hub and arrival pads are
      // protected by placement, not by making every creature passive.
      aggroRadius: Math.min(16, 9 + Math.floor((sequence - 1) / 3)),
      mir4XpReward: xp,
      loot: [{ copper: 2 + sequence, chance: 1 }],
      scale: 1,
      color: 0x8a7a66,
    };
  }
  return out;
}

/**
 * Resolve an arc mob template by id: the MIR4_ARC_MOB_IDS census locates its
 * map (by id prefix), whose level band and sequence feed the spawn formula.
 * Used by the Sim's camp loop as the last-chance lookup after the static
 * MIR4_MOBS table, so arc worlds work without pre-baked template records.
 */
import { MIR4_ARC_MOB_IDS } from './arc_mob_ids';
import { MIR4_WORLD_ARC } from './world_arc';

const TEMPLATE_CACHE = new Map<string, MobTemplate>();

export function mir4ArcMobTemplate(templateId: string): MobTemplate | undefined {
  const cached = TEMPLATE_CACHE.get(templateId);
  if (cached) return cached;
  const mapIndex = MIR4_WORLD_ARC.findIndex((map) => templateId.startsWith(`mir4_${map.mapId}_`));
  if (mapIndex >= 0) {
    const map = MIR4_WORLD_ARC[mapIndex];
    if (!map) return undefined;
    const mobId = templateId.slice(`mir4_${map.mapId}_`.length);
    if (!MIR4_ARC_MOB_IDS[mapIndex]?.includes(mobId)) return undefined;
    const base = buildMir4ArcMobs(
      map.environment,
      [mobId],
      map.levelMin,
      map.levelMax,
      map.sequence,
    )[`mir4_${mobId}`];
    if (!base) return undefined;
    const template = { ...base, id: templateId };
    TEMPLATE_CACHE.set(templateId, template);
    return template;
  }
  const mobId = templateId.startsWith('mir4_') ? templateId.slice(5) : templateId;
  for (let i = 0; i < MIR4_ARC_MOB_IDS.length; i++) {
    if (!MIR4_ARC_MOB_IDS[i]?.includes(mobId)) continue;
    const map = MIR4_WORLD_ARC[i];
    if (!map) continue;
    const built = buildMir4ArcMobs(
      map.environment,
      [mobId],
      map.levelMin,
      map.levelMax,
      map.sequence,
    );
    const template = built[`mir4_${mobId}`];
    if (template) {
      TEMPLATE_CACHE.set(templateId, template);
      return template;
    }
  }
  return undefined;
}
