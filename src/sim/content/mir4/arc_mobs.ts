// The per-environment mir4 mob families (Phase 5.4): every environment on
// the 20-map arc gets its own template set, generated from the source's zone
// mobIds census plus the spawn formula at the map's level band. Families map
// onto the fork's MobFamily vocabulary; behavior stays the shared classic AI
// (passive-until-attacked is m01's tutorial-zone rule only). XP rides the
// map's combatXpModel normal value (34 for m01, scaling with the band).

import type { MobTemplate } from '../../types';
import { mir4MobStats } from './mobs';

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

/** The XP formula the source's map model implies: 34 at m01, growing per band. */
export function mir4ArcNormalXp(sequence: number): number {
  return (34 * 1.32 ** (sequence - 1)) | 0;
}

/**
 * Build one environment's mob templates at its level band: per unique mobId
 * from the source census, stats from the spawn formula at the band's levels.
 */
export function buildMir4ArcMobs(
  environment: string,
  mobIds: readonly string[],
  levelMin: number,
  levelMax: number,
  sequence: number,
): Record<string, MobTemplate> {
  const out: Record<string, MobTemplate> = {};
  const lo = mir4MobStats(levelMin);
  const hi = mir4MobStats(levelMax);
  const xp = mir4ArcNormalXp(sequence);
  for (const mobId of mobIds) {
    const spec = FAMILIES[mobId] ?? { family: 'beast' as const, names: [mobId] };
    const nameIdx = out ? Object.keys(out).length : 0;
    const name = spec.names[nameIdx % spec.names.length] ?? mobId;
    out[`mir4_${mobId}`] = {
      id: `mir4_${mobId}`,
      name,
      minLevel: levelMin,
      maxLevel: levelMax,
      family: spec.family,
      hpBase: lo.maxHp,
      hpPerLevel: Math.max(1, Math.round((hi.maxHp - lo.maxHp) / Math.max(1, levelMax - levelMin))),
      dmgBase: lo.attack,
      dmgPerLevel: Math.max(
        1,
        Math.round((hi.attack - lo.attack) / Math.max(1, levelMax - levelMin)),
      ),
      attackSpeed: 2,
      armorPerLevel: 0,
      moveSpeed: 3.5,
      aggroRadius: 8,
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
  const mobId = templateId.startsWith('mir4_') ? templateId.slice(5) : templateId;
  for (let i = 0; i < MIR4_ARC_MOB_IDS.length; i++) {
    if (!MIR4_ARC_MOB_IDS[i]!.includes(mobId)) continue;
    const map = MIR4_WORLD_ARC[i]!;
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
