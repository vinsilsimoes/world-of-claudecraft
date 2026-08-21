// Generated from the source project js/mir4-class-passives-v1.js
// (CATALOG). DO NOT HAND-EDIT VALUES. Five passives per class, unlocking at
// levels 20/30/40/50/60; every bonus is basis points (1/10000) on the status
// the level table + gear already provide, applied sequentially in unlock
// order (floor per entry), exactly like applyToCharacterStatus. Names are
// PT-BR source copy; the English i18n source lands with the HUD surface.

import type { Mir4ClassId } from './classes';

export const MIR4_PASSIVE_UNLOCK_LEVELS = [20, 30, 40, 50, 60] as const;

export interface Mir4PassiveBonus {
  /** Source status id: 1 maxHp, 6 maxMp, 20 PA, 22 MA, 24/26 defenses, 28 accuracy, 29 dodge. */
  statusId: number;
  basisPoints: number;
}

export interface Mir4PassiveDef {
  id: string;
  level: number;
  name: string;
  bonuses: readonly Mir4PassiveBonus[];
}

export const MIR4_CLASS_PASSIVES: Readonly<Record<Mir4ClassId, readonly Mir4PassiveDef[]>> = {
  1: [
    {
      id: 'warrior-heavy-armor',
      level: 20,
      name: 'Armadura Pesada',
      bonuses: [
        {
          statusId: 1,
          basisPoints: 800,
        },
      ],
    },
    {
      id: 'warrior-weapon-mastery',
      level: 30,
      name: 'Maestria da Arma',
      bonuses: [
        {
          statusId: 20,
          basisPoints: 600,
        },
      ],
    },
    {
      id: 'warrior-iron-skin',
      level: 40,
      name: 'Pele de Ferro',
      bonuses: [
        {
          statusId: 24,
          basisPoints: 800,
        },
        {
          statusId: 26,
          basisPoints: 600,
        },
      ],
    },
    {
      id: 'warrior-fighting-spirit',
      level: 50,
      name: 'Espírito de Luta',
      bonuses: [
        {
          statusId: 1,
          basisPoints: 400,
        },
        {
          statusId: 20,
          basisPoints: 400,
        },
      ],
    },
    {
      id: 'warrior-indomitable-will',
      level: 60,
      name: 'Vontade Indomável',
      bonuses: [
        {
          statusId: 1,
          basisPoints: 500,
        },
        {
          statusId: 24,
          basisPoints: 500,
        },
        {
          statusId: 26,
          basisPoints: 500,
        },
      ],
    },
  ],
  2: [
    {
      id: 'elementalist-mana-well',
      level: 20,
      name: 'Poço de Mana',
      bonuses: [
        {
          statusId: 6,
          basisPoints: 1000,
        },
      ],
    },
    {
      id: 'elementalist-arcane-intellect',
      level: 30,
      name: 'Intelecto Arcano',
      bonuses: [
        {
          statusId: 22,
          basisPoints: 700,
        },
      ],
    },
    {
      id: 'elementalist-elemental-protection',
      level: 40,
      name: 'Proteção Elemental',
      bonuses: [
        {
          statusId: 24,
          basisPoints: 600,
        },
        {
          statusId: 26,
          basisPoints: 600,
        },
      ],
    },
    {
      id: 'elementalist-channeling',
      level: 50,
      name: 'Canalização',
      bonuses: [
        {
          statusId: 6,
          basisPoints: 500,
        },
        {
          statusId: 22,
          basisPoints: 400,
        },
      ],
    },
    {
      id: 'elementalist-arcane-ascension',
      level: 60,
      name: 'Ascensão Arcana',
      bonuses: [
        {
          statusId: 6,
          basisPoints: 500,
        },
        {
          statusId: 22,
          basisPoints: 600,
        },
        {
          statusId: 24,
          basisPoints: 300,
        },
        {
          statusId: 26,
          basisPoints: 300,
        },
      ],
    },
  ],
  3: [
    {
      id: 'taoist-spiritual-vessel',
      level: 20,
      name: 'Vaso Espiritual',
      bonuses: [
        {
          statusId: 1,
          basisPoints: 400,
        },
        {
          statusId: 6,
          basisPoints: 700,
        },
      ],
    },
    {
      id: 'taoist-twin-paths',
      level: 30,
      name: 'Caminhos Gêmeos',
      bonuses: [
        {
          statusId: 20,
          basisPoints: 400,
        },
        {
          statusId: 22,
          basisPoints: 400,
        },
      ],
    },
    {
      id: 'taoist-sacred-guard',
      level: 40,
      name: 'Guarda Sagrada',
      bonuses: [
        {
          statusId: 24,
          basisPoints: 600,
        },
        {
          statusId: 26,
          basisPoints: 600,
        },
      ],
    },
    {
      id: 'taoist-serene-mind',
      level: 50,
      name: 'Mente Serena',
      bonuses: [
        {
          statusId: 1,
          basisPoints: 400,
        },
        {
          statusId: 6,
          basisPoints: 500,
        },
      ],
    },
    {
      id: 'taoist-celestial-harmony',
      level: 60,
      name: 'Harmonia Celestial',
      bonuses: [
        {
          statusId: 1,
          basisPoints: 400,
        },
        {
          statusId: 6,
          basisPoints: 400,
        },
        {
          statusId: 20,
          basisPoints: 400,
        },
        {
          statusId: 22,
          basisPoints: 400,
        },
        {
          statusId: 24,
          basisPoints: 400,
        },
        {
          statusId: 26,
          basisPoints: 400,
        },
      ],
    },
  ],
  4: [
    {
      id: 'arbalist-eagle-eye',
      level: 20,
      name: 'Olho de Águia',
      bonuses: [
        {
          statusId: 20,
          basisPoints: 300,
        },
        {
          statusId: 28,
          basisPoints: 500,
        },
      ],
    },
    {
      id: 'arbalist-ballistic-mastery',
      level: 30,
      name: 'Maestria Balística',
      bonuses: [
        {
          statusId: 20,
          basisPoints: 700,
        },
      ],
    },
    {
      id: 'arbalist-nature-guard',
      level: 40,
      name: 'Guarda da Natureza',
      bonuses: [
        {
          statusId: 1,
          basisPoints: 500,
        },
        {
          statusId: 24,
          basisPoints: 500,
        },
        {
          statusId: 26,
          basisPoints: 500,
        },
      ],
    },
    {
      id: 'arbalist-hunter-instinct',
      level: 50,
      name: 'Instinto do Caçador',
      bonuses: [
        {
          statusId: 20,
          basisPoints: 500,
        },
        {
          statusId: 29,
          basisPoints: 500,
        },
      ],
    },
    {
      id: 'arbalist-perfect-shot',
      level: 60,
      name: 'Tiro Perfeito',
      bonuses: [
        {
          statusId: 1,
          basisPoints: 300,
        },
        {
          statusId: 20,
          basisPoints: 600,
        },
        {
          statusId: 28,
          basisPoints: 500,
        },
      ],
    },
  ],
  5: [
    {
      id: 'lancer-war-conditioning',
      level: 20,
      name: 'Condicionamento de Guerra',
      bonuses: [
        {
          statusId: 1,
          basisPoints: 500,
        },
        {
          statusId: 20,
          basisPoints: 300,
        },
        {
          statusId: 22,
          basisPoints: 300,
        },
      ],
    },
    {
      id: 'lancer-spear-mastery',
      level: 30,
      name: 'Maestria da Lança',
      bonuses: [
        {
          statusId: 20,
          basisPoints: 500,
        },
        {
          statusId: 22,
          basisPoints: 500,
        },
      ],
    },
    {
      id: 'lancer-vanguard-armor',
      level: 40,
      name: 'Couraça da Vanguarda',
      bonuses: [
        {
          statusId: 24,
          basisPoints: 600,
        },
        {
          statusId: 26,
          basisPoints: 600,
        },
      ],
    },
    {
      id: 'lancer-battle-rhythm',
      level: 50,
      name: 'Ritmo de Batalha',
      bonuses: [
        {
          statusId: 6,
          basisPoints: 400,
        },
        {
          statusId: 20,
          basisPoints: 400,
        },
        {
          statusId: 22,
          basisPoints: 400,
        },
      ],
    },
    {
      id: 'lancer-dragon-vanguard',
      level: 60,
      name: 'Vanguarda do Dragão',
      bonuses: [
        {
          statusId: 1,
          basisPoints: 400,
        },
        {
          statusId: 20,
          basisPoints: 500,
        },
        {
          statusId: 22,
          basisPoints: 500,
        },
        {
          statusId: 24,
          basisPoints: 500,
        },
        {
          statusId: 26,
          basisPoints: 500,
        },
      ],
    },
  ],
};

/** Sum of unlocked bonus bps per status id (all passives with level <= level). */
export function aggregateMir4PassiveBonuses(
  classId: Mir4ClassId,
  level: number,
): Map<number, number> {
  const sums = new Map<number, number>();
  for (const passive of MIR4_CLASS_PASSIVES[classId] ?? []) {
    if (passive.level > level) continue;
    for (const bonus of passive.bonuses) {
      sums.set(bonus.statusId, (sums.get(bonus.statusId) ?? 0) + bonus.basisPoints);
    }
  }
  return sums;
}
