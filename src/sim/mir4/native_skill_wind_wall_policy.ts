import type { SimContext } from '../sim_context';
import type { Entity } from '../types';

const SKILL_ID = 5403 as const;

export interface Mir4NativeWindWallPolicy {
  readonly skillId: 5403;
  readonly skillLevel: number;
  readonly sourceApplyAtMs: 20;
  readonly partyApplyAtMs: 200;
  readonly allDamageReductionBasisPoints: 2_000;
  readonly allDamageReductionDurationMs: 5_000;
  readonly bashDamageReductionBasisPoints: number;
  readonly bashDamageReductionDurationMs: 15_000;
  readonly monsterDamageReductionBasisPoints: number;
  readonly monsterDamageReductionDurationMs: number;
  readonly bossDamageReductionBasisPoints: number;
  readonly bossDamageReductionDurationMs: number;
  readonly partyAllDamageReductionBasisPoints: number;
  readonly partyAllDamageReductionDurationMs: number;
  readonly partyBossDamageReductionBasisPoints: number;
  readonly partyBossDamageReductionDurationMs: number;
  readonly persistentPartySpellAttack: number;
}

export function mir4NativeWindWallPolicy(
  requestedSkillLevel: number,
): Mir4NativeWindWallPolicy | null {
  if (!Number.isFinite(requestedSkillLevel)) return null;
  const skillLevel = Math.max(1, Math.min(15, Math.floor(requestedSkillLevel)));
  const rank10 = skillLevel >= 10;
  const rank8 = skillLevel >= 8;
  const rank5 = skillLevel >= 5;
  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    sourceApplyAtMs: 20,
    partyApplyAtMs: 200,
    allDamageReductionBasisPoints: 2_000,
    allDamageReductionDurationMs: 5_000,
    bashDamageReductionBasisPoints: (150 + 30 * (skillLevel - 1)) * 10,
    bashDamageReductionDurationMs: 15_000,
    monsterDamageReductionBasisPoints: rank10 ? 3_000 : rank8 ? 2_000 : rank5 ? 1_500 : 500,
    monsterDamageReductionDurationMs: rank10 ? 15_000 : rank8 ? 12_000 : 8_000,
    bossDamageReductionBasisPoints: rank10 ? 3_000 : rank8 ? 2_000 : 0,
    bossDamageReductionDurationMs: rank10 ? 15_000 : rank8 ? 12_000 : 0,
    partyAllDamageReductionBasisPoints: rank10 ? 7_000 : rank8 ? 5_000 : rank5 ? 3_000 : 0,
    partyAllDamageReductionDurationMs: rank10 ? 8_000 : rank8 ? 6_000 : rank5 ? 4_000 : 0,
    partyBossDamageReductionBasisPoints: rank10 ? 5_000 : rank8 ? 3_500 : rank5 ? 2_000 : 0,
    partyBossDamageReductionDurationMs: rank5 ? 6_000 : 0,
    persistentPartySpellAttack: rank10 ? 100 : rank8 ? 60 : rank5 ? 20 : 0,
  });
}

function learnedSkillLevel(ctx: Pick<SimContext, 'players'>, source: Entity): number {
  return ctx.players.get(source.id)?.mir4SkillLevels?.[SKILL_ID] ?? 1;
}

/** Persistent 50402 party aura; only the strongest living Lancer contributes. */
export function mir4NativeWindWallPartySpellAttack(
  ctx: Pick<SimContext, 'entities' | 'partyOf' | 'players'>,
  source: Entity,
): number {
  const memberIds = ctx.partyOf(source.id)?.members ?? [source.id];
  let strongest = 0;
  for (const memberId of memberIds) {
    const member = ctx.entities.get(memberId);
    if (!member || member.dead || member.kind !== 'player' || member.mir4?.classId !== 5) continue;
    strongest = Math.max(
      strongest,
      mir4NativeWindWallPolicy(learnedSkillLevel(ctx, member))?.persistentPartySpellAttack ?? 0,
    );
  }
  return strongest;
}
