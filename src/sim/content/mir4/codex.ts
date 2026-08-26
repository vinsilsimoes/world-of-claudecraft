import type { Mir4AlbumStatKey } from '../../mir4/collection_album';
import type { Mir4Materials } from '../../mir4/equipment';
import type { Mir4ClassId } from './classes';
import { mir4ItemProgressionRank } from './item_progression';
import { MIR4_MOUNTS_CATALOG } from './mounts_catalog';
import { MIR4_SPIRITS_CATALOG } from './spirits_catalog';

export const MIR4_CODEX_UNLOCK_LEVEL = 12;

export type Mir4CodexRegistration = 'manual' | 'automatic';

export interface Mir4CodexBonus {
  readonly stat: Mir4AlbumStatKey;
  readonly amount: number;
}

export type Mir4CodexRequirementTemplate =
  | {
      readonly kind: 'material';
      readonly id: string;
      readonly materialKey: keyof Mir4Materials;
      readonly requiredCount: number;
    }
  | { readonly kind: 'equipment-rank'; readonly catalogRank: number }
  | { readonly kind: 'mount'; readonly id: string }
  | { readonly kind: 'spirit'; readonly id: string };

export interface Mir4CodexCollectionDef {
  readonly id: string;
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly registration: Mir4CodexRegistration;
  readonly requiredLevel: number;
  readonly requirements: readonly Mir4CodexRequirementTemplate[];
  readonly bonuses: readonly Mir4CodexBonus[];
}

export type Mir4ResolvedCodexRequirement =
  | {
      readonly kind: 'material';
      readonly id: string;
      readonly materialKey: keyof Mir4Materials;
      readonly requiredCount: number;
    }
  | {
      readonly kind: 'equipment';
      readonly id: string;
      readonly itemId: number;
      readonly classId: Mir4ClassId;
      readonly equipSlot: number;
      readonly requiredCount: 1;
    }
  | {
      readonly kind: 'mount';
      readonly id: string;
      readonly mountId: string;
      readonly requiredCount: 1;
    }
  | {
      readonly kind: 'spirit';
      readonly id: string;
      readonly spiritId: string;
      readonly requiredCount: 1;
    };

export interface Mir4ResolvedCodexCollection extends Omit<Mir4CodexCollectionDef, 'requirements'> {
  readonly requirements: readonly Mir4ResolvedCodexRequirement[];
}

const COMMON_MOUNTS = MIR4_MOUNTS_CATALOG.filter((mount) => mount.grade === 1).slice(0, 3);
const COMMON_SPIRITS = MIR4_SPIRITS_CATALOG.filter((spirit) => spirit.grade === 1).slice(0, 3);

/** Six deliberately small launch collections. Later chapters can add authored sets without changing the domain. */
export const MIR4_CODEX_COLLECTIONS: readonly Mir4CodexCollectionDef[] = Object.freeze([
  {
    id: 'field-notes',
    titleKey: 'hudChrome.mir4.codex.collection.fieldNotes.title',
    descriptionKey: 'hudChrome.mir4.codex.collection.fieldNotes.description',
    registration: 'manual',
    requiredLevel: MIR4_CODEX_UNLOCK_LEVEL,
    requirements: [
      {
        kind: 'material',
        id: 'knowledge-fragment',
        materialKey: 'knowledgeFragment',
        requiredCount: 25,
      },
    ],
    bonuses: [{ stat: 'maxHp', amount: 100 }],
  },
  {
    id: 'artisan-records',
    titleKey: 'hudChrome.mir4.codex.collection.artisanRecords.title',
    descriptionKey: 'hudChrome.mir4.codex.collection.artisanRecords.description',
    registration: 'manual',
    requiredLevel: 15,
    requirements: [
      {
        kind: 'material',
        id: 'knowledge-tome-common',
        materialKey: 'knowledgeTomeCommon',
        requiredCount: 2,
      },
    ],
    bonuses: [{ stat: 'accuracy', amount: 2 }],
  },
  {
    id: 'rank-two-armory',
    titleKey: 'hudChrome.mir4.codex.collection.rankTwoArmory.title',
    descriptionKey: 'hudChrome.mir4.codex.collection.rankTwoArmory.description',
    registration: 'automatic',
    requiredLevel: 12,
    requirements: [{ kind: 'equipment-rank', catalogRank: 2 }],
    bonuses: [
      { stat: 'physicalAttack', amount: 2 },
      { stat: 'magicAttack', amount: 2 },
    ],
  },
  {
    id: 'rank-three-armory',
    titleKey: 'hudChrome.mir4.codex.collection.rankThreeArmory.title',
    descriptionKey: 'hudChrome.mir4.codex.collection.rankThreeArmory.description',
    registration: 'automatic',
    requiredLevel: 25,
    requirements: [{ kind: 'equipment-rank', catalogRank: 3 }],
    bonuses: [
      { stat: 'physicalDefense', amount: 4 },
      { stat: 'magicDefense', amount: 4 },
    ],
  },
  {
    id: 'common-mounts',
    titleKey: 'hudChrome.mir4.codex.collection.commonMounts.title',
    descriptionKey: 'hudChrome.mir4.codex.collection.commonMounts.description',
    registration: 'automatic',
    requiredLevel: 12,
    requirements: COMMON_MOUNTS.map((mount) => ({ kind: 'mount' as const, id: mount.id })),
    bonuses: [{ stat: 'dodge', amount: 2 }],
  },
  {
    id: 'common-spirits',
    titleKey: 'hudChrome.mir4.codex.collection.commonSpirits.title',
    descriptionKey: 'hudChrome.mir4.codex.collection.commonSpirits.description',
    registration: 'automatic',
    requiredLevel: 12,
    requirements: COMMON_SPIRITS.map((spirit) => ({ kind: 'spirit' as const, id: spirit.id })),
    bonuses: [{ stat: 'skillDamageBps', amount: 20 }],
  },
]);

const BY_ID = new Map(MIR4_CODEX_COLLECTIONS.map((collection) => [collection.id, collection]));

export function mir4CodexCollection(id: string): Mir4CodexCollectionDef | null {
  return BY_ID.get(id) ?? null;
}

export function resolveMir4CodexCollection(
  id: string,
  classId: Mir4ClassId,
): Mir4ResolvedCodexCollection | null {
  const collection = mir4CodexCollection(id);
  if (!collection) return null;
  const requirements: Mir4ResolvedCodexRequirement[] = [];
  for (const requirement of collection.requirements) {
    if (requirement.kind === 'material') {
      requirements.push(requirement);
      continue;
    }
    if (requirement.kind === 'mount') {
      requirements.push({
        kind: 'mount',
        id: requirement.id,
        mountId: requirement.id,
        requiredCount: 1,
      });
      continue;
    }
    if (requirement.kind === 'spirit') {
      requirements.push({
        kind: 'spirit',
        id: requirement.id,
        spiritId: requirement.id,
        requiredCount: 1,
      });
      continue;
    }
    const rank = mir4ItemProgressionRank(requirement.catalogRank);
    for (const item of rank?.itemsByClass[classId] ?? []) {
      requirements.push({
        kind: 'equipment',
        id: item.key,
        itemId: item.itemId,
        classId,
        equipSlot: item.equipSlot,
        requiredCount: 1,
      });
    }
  }
  return { ...collection, requirements };
}
