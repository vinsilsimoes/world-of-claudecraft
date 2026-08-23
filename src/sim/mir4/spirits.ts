// Pure MIR4 Spirit collection rules. The port owns only behavioral state and
// numbers: presentation is supplied by existing World of ClaudeCraft UI/icon
// primitives, and Spirits never replace the player's native 3D actor model.

import {
  MIR4_SPIRITS_CATALOG,
  type Mir4SpiritDef,
  mir4SpiritById,
} from '../content/mir4/spirits_catalog';

export type Mir4SpiritTicketId = 'spirit-ticket-dawn' | 'spirit-ticket-sunset';

export interface Mir4SpiritPending {
  id: string;
  spiritId: string;
  grade: number;
}

export interface Mir4SpiritState {
  owned?: Record<string, number>;
  discovered?: string[];
  equippedSpiritId?: string;
  pending?: Mir4SpiritPending[];
  nextPendingId?: number;
}

export interface Mir4SpiritBonuses {
  physicalAttack: number;
  magicAttack: number;
  physicalDefense: number;
  magicDefense: number;
  accuracy: number;
  critical: number;
  penetrationBps: number;
}

export type Mir4SpiritSkillKind =
  | 'bonus-damage'
  | 'execute'
  | 'life-siphon'
  | 'mana-surge'
  | 'armor-rend'
  | 'critical-focus';

export interface Mir4SpiritSpecialSkill {
  id: string;
  name: string;
  kind: Mir4SpiritSkillKind;
  cooldownMs: number;
  chanceBps: number;
  bonusDamageBps?: number;
  targetHpThresholdBps?: number;
  healMaxHpBps?: number;
  restoreMaxMpBps?: number;
  penetrationBps?: number;
  forceCritical?: true;
}

interface WeightedGrade {
  grade: number;
  weight: number;
}

export const MIR4_SPIRIT_TICKET_WEIGHT_SCALE = 10_000_000;
export const MIR4_SPIRIT_TICKET_POOLS: Readonly<
  Record<Mir4SpiritTicketId, readonly WeightedGrade[]>
> = {
  'spirit-ticket-dawn': [
    { grade: 1, weight: 7_900_000 },
    { grade: 2, weight: 2_000_000 },
    { grade: 3, weight: 100_000 },
  ],
  'spirit-ticket-sunset': [
    { grade: 2, weight: 9_450_000 },
    { grade: 3, weight: 500_000 },
    { grade: 4, weight: 50_000 },
  ],
};

const SPIRITS_BY_GRADE = new Map<number, readonly Mir4SpiritDef[]>();
for (let grade = 1; grade <= 6; grade += 1) {
  SPIRITS_BY_GRADE.set(
    grade,
    MIR4_SPIRITS_CATALOG.filter((spirit) => spirit.grade === grade),
  );
}

const EMPTY_BONUSES: Mir4SpiritBonuses = {
  physicalAttack: 0,
  magicAttack: 0,
  physicalDefense: 0,
  magicDefense: 0,
  accuracy: 0,
  critical: 0,
  penetrationBps: 0,
};

const SPIRIT_SKILL_NAMES: Readonly<Record<number, readonly string[]>> = {
  1: ['Centelha Errante', 'Instinto do Ocaso', 'Orvalho Vital', 'Sopro de Mana'],
  2: ['Clarão Ascendente', 'Presa da Neblina', 'Seiva Restauradora', 'Pulso Arcano'],
  3: ['Ruptura de Âmbar', 'Julgamento do Poente', 'Vínculo Vital', 'Fonte de Raiz'],
  4: [
    'Raio do Eclipse',
    'Fúria Rubra',
    'Graça Astral',
    'Orbe de Jade',
    'Corte Solar',
    'Foco Etéreo',
  ],
  5: [
    'Impacto Tectônico',
    'Chama Renascente',
    'Veredito Imperial',
    'Maré de Cristal',
    'Fenda do Vazio',
    'Coroa Áurea',
  ],
  6: [
    'Gênesis',
    'Retorno Eterno',
    'Mandato Celestial',
    'Peso do Firmamento',
    'Espiral Abissal',
    'Instante Absoluto',
  ],
};

export function mir4SpiritSpecialSkill(spiritId: string): Mir4SpiritSpecialSkill | null {
  const spirit = mir4SpiritById(spiritId);
  if (!spirit) return null;
  const index = (SPIRITS_BY_GRADE.get(spirit.grade) ?? []).findIndex(
    (candidate) => candidate.id === spirit.id,
  );
  if (index < 0) return null;
  const kind = (
    [
      'bonus-damage',
      'execute',
      'life-siphon',
      'mana-surge',
      'armor-rend',
      'critical-focus',
    ] as const
  )[index % 6]!;
  const power = [0, 350, 500, 700, 950, 1_250, 1_650][spirit.grade]!;
  const chanceBps = [0, 1_200, 1_400, 1_600, 1_800, 2_000, 2_300][spirit.grade]!;
  const base = {
    id: `spirit-skill-${spirit.grade}-${String(index + 1).padStart(2, '0')}`,
    name: SPIRIT_SKILL_NAMES[spirit.grade]?.[index] ?? spirit.name,
    kind,
    cooldownMs: Math.max(3_500, 7_000 - spirit.grade * 450),
    chanceBps,
  };
  if (kind === 'bonus-damage') return { ...base, bonusDamageBps: power };
  if (kind === 'execute') {
    return { ...base, targetHpThresholdBps: 3_000, bonusDamageBps: power + 250 };
  }
  if (kind === 'life-siphon') {
    return { ...base, healMaxHpBps: Math.max(80, Math.floor(power / 5)) };
  }
  if (kind === 'mana-surge') {
    return { ...base, restoreMaxMpBps: Math.max(100, Math.floor(power / 4)) };
  }
  if (kind === 'armor-rend') return { ...base, penetrationBps: Math.min(1_200, power) };
  return { ...base, forceCritical: true };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.min(1_000_000_000, Math.floor(value))
    : 0;
}

export function isMir4SpiritTicketId(value: string): value is Mir4SpiritTicketId {
  return value === 'spirit-ticket-dawn' || value === 'spirit-ticket-sunset';
}

/** Exact grade draw followed by the exact uniform within-grade draw. */
export function drawMir4Spirit(
  ticketId: Mir4SpiritTicketId,
  gradeRoll: number,
  spiritRoll: number,
): Mir4SpiritDef {
  const roll = Math.min(
    MIR4_SPIRIT_TICKET_WEIGHT_SCALE - 1,
    Math.max(0, Math.floor(gradeRoll * MIR4_SPIRIT_TICKET_WEIGHT_SCALE)),
  );
  let cursor = 0;
  let grade = MIR4_SPIRIT_TICKET_POOLS[ticketId].at(-1)!.grade;
  for (const row of MIR4_SPIRIT_TICKET_POOLS[ticketId]) {
    cursor += row.weight;
    if (roll < cursor) {
      grade = row.grade;
      break;
    }
  }
  const pool = SPIRITS_BY_GRADE.get(grade) ?? [];
  if (pool.length === 0) throw new Error(`missing MIR4 Spirit pool for grade ${grade}`);
  const index = Math.min(pool.length - 1, Math.max(0, Math.floor(spiritRoll * pool.length)));
  return pool[index]!;
}

export function drawMir4SpiritFromGrade(grade: number, roll: number): Mir4SpiritDef {
  const pool = SPIRITS_BY_GRADE.get(grade) ?? [];
  if (pool.length === 0) throw new Error(`missing MIR4 Spirit pool for grade ${grade}`);
  return pool[Math.min(pool.length - 1, Math.max(0, Math.floor(roll * pool.length)))]!;
}

export function sanitizeMir4SpiritState(value: unknown): Mir4SpiritState | undefined {
  if (!isRecord(value)) return undefined;
  const owned: Record<string, number> = {};
  if (isRecord(value.owned)) {
    for (const [spiritId, rawCount] of Object.entries(value.owned)) {
      if (!mir4SpiritById(spiritId)) continue;
      const count = safeCount(rawCount);
      if (count > 0) owned[spiritId] = count;
    }
  }
  const discovered = new Set<string>();
  if (Array.isArray(value.discovered)) {
    for (const raw of value.discovered) {
      if (typeof raw === 'string' && mir4SpiritById(raw)) discovered.add(raw);
    }
  }
  for (const spiritId of Object.keys(owned)) discovered.add(spiritId);
  const pending: Mir4SpiritPending[] = [];
  const pendingIds = new Set<string>();
  if (Array.isArray(value.pending)) {
    for (const raw of value.pending) {
      if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.spiritId !== 'string')
        continue;
      const spirit = mir4SpiritById(raw.spiritId);
      if (
        raw.id.length === 0 ||
        raw.id.length > 96 ||
        pendingIds.has(raw.id) ||
        !spirit ||
        spirit.grade < 4 ||
        raw.grade !== spirit.grade
      ) {
        continue;
      }
      pendingIds.add(raw.id);
      pending.push({ id: raw.id, spiritId: spirit.id, grade: spirit.grade });
      if (pending.length === 64) break;
    }
  }
  const equippedSpiritId =
    typeof value.equippedSpiritId === 'string' && owned[value.equippedSpiritId] > 0
      ? value.equippedSpiritId
      : undefined;
  const nextPendingId =
    Number.isSafeInteger(value.nextPendingId) && Number(value.nextPendingId) > 0
      ? Math.min(Number.MAX_SAFE_INTEGER, Number(value.nextPendingId))
      : undefined;
  if (
    Object.keys(owned).length === 0 &&
    discovered.size === 0 &&
    pending.length === 0 &&
    !equippedSpiritId &&
    !nextPendingId
  ) {
    return undefined;
  }
  return {
    ...(Object.keys(owned).length > 0 ? { owned } : {}),
    ...(discovered.size > 0 ? { discovered: [...discovered] } : {}),
    ...(equippedSpiritId ? { equippedSpiritId } : {}),
    ...(pending.length > 0 ? { pending } : {}),
    ...(nextPendingId ? { nextPendingId } : {}),
  };
}

/** Equipped Spirit stats plus every active unique-discovery collection step. */
export function mir4SpiritBonuses(state: Mir4SpiritState | undefined): Mir4SpiritBonuses {
  const result = { ...EMPTY_BONUSES };
  const equipped = state?.equippedSpiritId ? mir4SpiritById(state.equippedSpiritId) : null;
  if (equipped && (state?.owned?.[equipped.id] ?? 0) > 0) {
    for (const key of Object.keys(result) as (keyof Mir4SpiritBonuses)[]) {
      result[key] += equipped.stats[key] ?? 0;
    }
  }
  const discovered = new Set(state?.discovered ?? []);
  for (let grade = 1; grade <= 6; grade += 1) {
    const unique = (SPIRITS_BY_GRADE.get(grade) ?? []).filter((spirit) =>
      discovered.has(spirit.id),
    ).length;
    const thresholds = grade >= 4 ? [2, 4, 6] : [2, 4];
    for (let index = 0; index < thresholds.length; index += 1) {
      if (unique < thresholds[index]!) continue;
      const amount = grade * (index + 1);
      result.physicalAttack += amount;
      result.magicAttack += amount;
      result.physicalDefense += amount;
      result.magicDefense += amount;
    }
  }
  return result;
}

export function mir4SpiritOwnedCount(state: Mir4SpiritState | undefined, grade: number): number {
  return (SPIRITS_BY_GRADE.get(grade) ?? []).reduce(
    (sum, spirit) => sum + (state?.owned?.[spirit.id] ?? 0),
    0,
  );
}
