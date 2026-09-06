import type { SimEvent } from '../sim/types';
import type { Mir4NativeSkillContactPainterDeps } from './mir4_native_skill_contact_painter';
import type {
  Mir4NativePresentationContact,
  Mir4NativePresentationContactVisual,
} from './mir4_native_skill_presentation_core';

type Presentation = Extract<SimEvent, { type: 'mir4SkillPresentation' }>;

/** Admit the recovered animation and both native line contacts together. */
export function validObliterateShellPresentation(event: Presentation): boolean {
  return (
    event.skillId === 4109 &&
    event.ability === 'mir4_skill_4109' &&
    event.profile === 'arbalist-obliterate-shell' &&
    event.durationMs === 1_000 &&
    event.endCutMs === 900 &&
    event.animationAssetPath === '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl09' &&
    event.vfxAssetPaths.includes('/Game/Effect/PC/Pca/Skl09/P_PCA_Skl09') &&
    event.vfxAssetPaths.includes('/Game/Effect/PC/Pca/Skl09/P_Pca_Skl09_02') &&
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === 2 &&
    event.contacts.every(
      (contact, index) =>
        contact.shape === 'direct' &&
        contact.attackId === 410902 + index &&
        contact.offsetMs === 480 + index * 40 &&
        contact.reachYards === 20 &&
        contact.widthYards === 4 &&
        contact.damageCoefficient === 11_000,
    )
  );
}

/** Browser reconstruction of the recovered shell trail and paired blasts. */
export function playObliterateShellContact(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Presentation,
  contact: Mir4NativePresentationContact,
  visual: Mir4NativePresentationContactVisual,
): void {
  if (contact.shape !== 'direct' || visual.shape !== 'direct') return;
  const forwardX = Math.sin(event.sourceFacing);
  const forwardZ = Math.cos(event.sourceFacing);
  const first = contact.attackId === 410902;
  const color = first ? 0xc386ff : 0xffdf91;
  const lifetime = first ? 0.42 : 0.32;
  const startX = visual.x - forwardX * contact.reachYards * 0.5;
  const startZ = visual.z - forwardZ * contact.reachYards * 0.5;
  for (const side of [-1, 0, 1]) {
    deps.pathRibbon(color, side === 0 ? 0.2 : 0.08, lifetime, (points) => {
      const count = Math.min(points.length, 12);
      if (count < 2) return 0;
      for (let index = 0; index < count; index += 1) {
        const distance = (index / (count - 1)) * contact.reachYards;
        const x = startX + forwardX * distance + forwardZ * side * contact.widthYards * 0.5;
        const z = startZ + forwardZ * distance - forwardX * side * contact.widthYards * 0.5;
        points[index].set(x, deps.groundYAt(x, z) + (side === 0 ? 0.8 : 0.08), z);
      }
      return count;
    });
  }
  deps.burstAt(visual.x, visual.y + 0.8, visual.z, color, first ? 22 : 14, 0.8, 'sparks');
  deps.playImpactAudio('physical', first ? 1 : 0.8, visual.x, visual.y, visual.z);
}
