import { mir4NativeGeneratedMechanicalAction } from './native_skill_generated_contract';
import { mir4NativeRuntimeMagicShieldPolicy } from './native_skill_magic_shield';
import { mir4NativeMindsEyePolicy } from './native_skill_minds_eye';
import { mir4NativeRuntimePhoenixEmbracePolicy } from './native_skill_phoenix_embrace';
import type {
  Mir4NativeRuntimeAbilityFacet,
  Mir4NativeRuntimeSkillPresentationFacets,
} from './native_skill_source_facets';

/**
 * Project source fields whose extracted client consumer is presentation-only.
 * A nonzero Ability discriminator remains closed because it can select real
 * gameplay behavior. A zero discriminator preserves its orphaned payload but
 * cannot dispatch an effect.
 */
export function mir4NativeGeneratedPresentationFacets(
  skillId: number,
): Mir4NativeRuntimeSkillPresentationFacets | null {
  const behavior = mir4NativeGeneratedMechanicalAction(skillId)?.nativeBehavior;
  if (!behavior) return null;
  const magicShield = skillId === 2503 ? mir4NativeRuntimeMagicShieldPolicy(1) : null;
  const phoenixEmbrace = skillId === 2204 ? mir4NativeRuntimePhoenixEmbracePolicy(1) : null;
  const mindsEye = skillId === 4111 ? mir4NativeMindsEyePolicy(1) : null;
  const rowBuffMetadata = magicShield ?? phoenixEmbrace ?? mindsEye;
  if (behavior.abilities.some((ability) => ability.type !== 0) && !rowBuffMetadata) return null;

  const abilities = Object.freeze(
    behavior.abilities.map(
      (ability, slotIndex) =>
        Object.freeze({
          slotIndex,
          type: ability.type,
          value: ability.value,
          levelUpValue: ability.levelUpValue,
          time: ability.time,
          active: false as const,
          inactiveReason: rowBuffMetadata
            ? ('attack-row-buff-metadata' as const)
            : ('zero-type' as const),
          ...(rowBuffMetadata
            ? {
                sourceAttackId: rowBuffMetadata.sourceAttackId,
                sourceBuffId: rowBuffMetadata.buffId,
              }
            : {}),
        }) satisfies Mir4NativeRuntimeAbilityFacet,
    ),
  );
  return Object.freeze({
    darkChange: Object.freeze({
      nativeMode: behavior.darkChange,
      presentationOnly: true as const,
      clientOption: 'G_SkillDarkChange' as const,
    }),
    abilities,
  });
}
