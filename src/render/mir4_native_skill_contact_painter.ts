import type { SimEvent } from '../sim/types';
import type {
  Mir4NativePresentationContact,
  Mir4NativePresentationContactVisual,
} from './mir4_native_skill_presentation_core';
import { playObliterateShellContact } from './mir4_obliterate_shell_painter';

type Mir4SkillPresentationEvent = Extract<SimEvent, { type: 'mir4SkillPresentation' }>;
type PathPoint = { set(x: number, y: number, z: number): unknown };

export interface Mir4NativeSkillContactPainterDeps {
  slashStyled(
    at: { x: number; y: number; z: number },
    colorHex: number,
    style: string,
    scale: number,
  ): void;
  burstAt(
    x: number,
    y: number,
    z: number,
    colorHex: number,
    count: number,
    power: number,
    kind: 'sparks',
  ): void;
  ringAt(
    x: number,
    y: number,
    z: number,
    maxRadius: number,
    duration: number,
    colorHex: number,
    intensity: number,
    vertical: boolean,
  ): void;
  decalXZ?(
    x: number,
    z: number,
    radius: number,
    colorHex: number,
    style: string,
    duration: number,
  ): void;
  pathRibbon(
    colorHex: number,
    width: number,
    life: number,
    fill: (points: PathPoint[]) => number,
  ): void;
  beamRibbon(
    sourceId: number,
    targetId: number,
    colorHex: number,
    width: number,
    life: number,
  ): void;
  impactRing(targetId: number, colorHex: number, big: boolean): void;
  groundYAt(x: number, z: number): number;
  playImpactAudio(school: string, power: number, x: number, y: number, z: number): void;
}

function fillCircle(
  points: PathPoint[],
  x: number,
  y: number,
  z: number,
  radius: number,
  phase: number,
): number {
  const count = Math.min(points.length, 25);
  if (count < 2) return 0;
  for (let index = 0; index < count; index += 1) {
    const angle = phase + (index / (count - 1)) * Math.PI * 2;
    points[index].set(x + Math.cos(angle) * radius, y, z + Math.sin(angle) * radius);
  }
  return count;
}

function fillSectorOutline(
  points: PathPoint[],
  x: number,
  y: number,
  z: number,
  facing: number,
  radius: number,
  angleDegrees: number,
): number {
  const count = Math.min(points.length, 25);
  if (count < 3) return 0;
  const arcPoints = count - 2;
  const halfAngle = (angleDegrees * Math.PI) / 360;
  points[0].set(x, y, z);
  for (let index = 0; index < arcPoints; index += 1) {
    const progress = arcPoints === 1 ? 0.5 : index / (arcPoints - 1);
    const angle = facing - halfAngle + progress * halfAngle * 2;
    points[index + 1].set(x + Math.sin(angle) * radius, y, z + Math.cos(angle) * radius);
  }
  points[count - 1].set(x, y, z);
  return count;
}

function fillVortexSpiral(
  points: PathPoint[],
  x: number,
  y: number,
  z: number,
  radius: number,
  height: number,
  direction: 1 | -1,
): number {
  const count = Math.min(points.length, 25);
  if (count < 2) return 0;
  for (let index = 0; index < count; index += 1) {
    const progress = index / (count - 1);
    const angle = direction * progress * Math.PI * 4;
    const localRadius = radius * (0.15 + progress * 0.85);
    points[index].set(
      x + Math.cos(angle) * localRadius,
      y + progress * height,
      z + Math.sin(angle) * localRadius,
    );
  }
  return count;
}

function fillWindWallRibbon(
  points: PathPoint[],
  x: number,
  y: number,
  z: number,
  facing: number,
  length: number,
  width: number,
  phase: number,
): number {
  const count = Math.min(points.length, 25);
  if (count < 2) return 0;
  const forwardX = Math.sin(facing);
  const forwardZ = Math.cos(facing);
  const rightX = forwardZ;
  const rightZ = -forwardX;
  for (let index = 0; index < count; index += 1) {
    const progress = index / (count - 1);
    const forward = (progress - 0.5) * length;
    const lateral = Math.sin(progress * Math.PI * 4 + phase) * width * 0.42;
    const lift = 0.15 + Math.sin(progress * Math.PI) * 1.65;
    points[index].set(
      x + forwardX * forward + rightX * lateral,
      y + lift,
      z + forwardZ * forward + rightZ * lateral,
    );
  }
  return count;
}

function fillFallingBlade(
  points: PathPoint[],
  x: number,
  groundY: number,
  z: number,
  height: number,
  leanX: number,
  leanZ: number,
): number {
  const count = Math.min(points.length, 7);
  if (count < 2) return 0;
  for (let index = 0; index < count; index += 1) {
    const progress = index / (count - 1);
    const taper = Math.sin(progress * Math.PI) * 0.08;
    points[index].set(
      x + leanX * (1 - progress) + taper,
      groundY + height * (1 - progress),
      z + leanZ * (1 - progress) - taper,
    );
  }
  return count;
}

function playChainLightningContact(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Mir4SkillPresentationEvent,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'chain' }>,
  contactIndex: number,
): void {
  const finalContact = contactIndex === event.contacts.length - 1;
  const color = finalContact ? 0xe5fbff : contactIndex % 2 === 0 ? 0x86dfff : 0x53b9ff;
  deps.beamRibbon(
    visual.fromEntityId,
    visual.toEntityId,
    color,
    Math.max(0.055, 0.12 * visual.power),
    0.24,
  );
  deps.impactRing(visual.toEntityId, color, finalContact);
  deps.burstAt(
    visual.x,
    visual.y,
    visual.z,
    color,
    finalContact ? 22 : 10,
    Math.max(0.5, visual.power),
    'sparks',
  );
  deps.playImpactAudio('lightning', finalContact ? 1.05 : 0.78, visual.x, visual.y, visual.z);
}

function playFlameStrikeContact(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Mir4SkillPresentationEvent,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'circle' }>,
  contactIndex: number,
): void {
  const finalContact = contactIndex === event.contacts.length - 1;
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.12;
  const color = finalContact ? 0xffd27a : contactIndex === 0 ? 0xff7138 : 0xff9a3d;
  deps.ringAt(
    visual.x,
    groundY,
    visual.z,
    visual.radiusYards * (0.72 + contactIndex * 0.14),
    finalContact ? 0.72 : 0.5,
    color,
    finalContact ? 2.25 : 1.55,
    false,
  );
  deps.pathRibbon(color, finalContact ? 0.14 : 0.1, finalContact ? 0.7 : 0.48, (points) =>
    fillVortexSpiral(
      points,
      visual.x,
      groundY,
      visual.z,
      visual.radiusYards * (0.55 + contactIndex * 0.16),
      Math.min(visual.heightYards, 4) * (0.65 + contactIndex * 0.12),
      contactIndex % 2 === 0 ? 1 : -1,
    ),
  );
  deps.burstAt(
    visual.x,
    visual.y,
    visual.z,
    color,
    finalContact ? 30 : 18 + contactIndex * 4,
    Math.max(0.65, visual.power),
    'sparks',
  );
  deps.playImpactAudio('fire', finalContact ? 1.15 : 0.9, visual.x, visual.y, visual.z);
}

function playBlastingCharmContact(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Mir4SkillPresentationEvent,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'target-circle' }>,
): void {
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.08;
  deps.decalXZ?.(visual.x, visual.z, visual.radiusYards, 0x8d285f, 'blasting-charm', 0.72);
  deps.ringAt(visual.x, groundY, visual.z, visual.radiusYards, 0.72, 0xdd4f9f, 2.2, false);
  deps.ringAt(
    visual.x,
    groundY + Math.min(visual.heightYards, 4) * 0.42,
    visual.z,
    visual.radiusYards * 0.38,
    0.64,
    0xffa7d5,
    2.45,
    true,
  );
  deps.pathRibbon(0xf06ab5, 0.13, 0.7, (points) =>
    fillVortexSpiral(
      points,
      visual.x,
      groundY,
      visual.z,
      visual.radiusYards * 0.8,
      Math.min(visual.heightYards, 4) * 0.9,
      1,
    ),
  );
  deps.pathRibbon(0x6b174e, 0.09, 0.64, (points) =>
    fillVortexSpiral(
      points,
      visual.x,
      groundY + 0.1,
      visual.z,
      visual.radiusYards * 0.62,
      Math.min(visual.heightYards, 4) * 0.72,
      -1,
    ),
  );
  deps.impactRing(event.targetId, 0xf584c5, true);
  deps.burstAt(visual.x, visual.y + 0.55, visual.z, 0xffb8df, 30, 1.2, 'sparks');
  deps.playImpactAudio('shadow', 1.1, visual.x, visual.y, visual.z);
}

/** Draws the source-corroborated tornado as a fixed six-second world-space field. */
export function playMir4NativePersistentSkillArea(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Mir4SkillPresentationEvent,
  area: NonNullable<Mir4SkillPresentationEvent['persistentArea']>,
): void {
  if (
    event.profile !== 'sorcerer-dark-vortex' &&
    event.profile !== 'sorcerer-thunderstorm' &&
    event.profile !== 'sorcerer-blizzard' &&
    event.profile !== 'taoist-rain-of-blades' &&
    event.profile !== 'taoist-moonlight-orb' &&
    event.profile !== 'taoist-moonlight-wave' &&
    event.profile !== 'arbalist-burst-shell' &&
    event.profile !== 'arbalist-venom-mist-shell' &&
    event.profile !== 'arbalist-ice-cage' &&
    event.profile !== 'arbalist-flash-arrow' &&
    event.profile !== 'arbalist-heavenly-bow' &&
    event.profile !== 'arbalist-cloaking'
  )
    return;
  const duration = Math.max(0.1, (area.expiresOffsetMs - area.spawnOffsetMs) / 1_000);
  const groundY = deps.groundYAt(area.x, area.z) + 0.1;
  if (event.profile === 'arbalist-cloaking') {
    deps.decalXZ?.(area.x, area.z, area.radiusYards, 0x665878, 'cloaking-decoy', duration);
    deps.ringAt(area.x, groundY, area.z, area.radiusYards, duration, 0x8e7aa7, 1.3, false);
    deps.ringAt(
      area.x,
      groundY + Math.min(area.heightYards, 5) * 0.32,
      area.z,
      area.radiusYards * 0.42,
      duration,
      0xc6b9d8,
      1.65,
      true,
    );
    deps.pathRibbon(0x847395, 0.075, duration, (points) =>
      fillVortexSpiral(
        points,
        area.x,
        groundY,
        area.z,
        area.radiusYards * 0.72,
        Math.min(area.heightYards, 5) * 0.62,
        1,
      ),
    );
    deps.pathRibbon(0xbcaed0, 0.055, duration, (points) =>
      fillVortexSpiral(
        points,
        area.x,
        groundY + 0.08,
        area.z,
        area.radiusYards * 0.48,
        Math.min(area.heightYards, 5) * 0.45,
        -1,
      ),
    );
    deps.burstAt(area.x, area.y + 0.65, area.z, 0xcfc3dd, 18, 0.76, 'sparks');
    deps.playImpactAudio('shadow', 0.7, area.x, area.y, area.z);
    return;
  }
  if (event.profile === 'arbalist-burst-shell') {
    deps.decalXZ?.(area.x, area.z, area.radiusYards, 0x26d8d4, 'burst-shell', duration);
    deps.ringAt(area.x, groundY, area.z, area.radiusYards, duration, 0x29d9e0, 1.55, false);
    deps.ringAt(
      area.x,
      groundY + Math.min(area.heightYards, 4) * 0.42,
      area.z,
      area.radiusYards * 0.24,
      duration,
      0xffca66,
      2.2,
      true,
    );
    deps.pathRibbon(0x7cf8f0, 0.11, duration, (points) =>
      fillVortexSpiral(
        points,
        area.x,
        groundY,
        area.z,
        area.radiusYards * 0.42,
        area.heightYards,
        1,
      ),
    );
    deps.burstAt(area.x, area.y + 0.85, area.z, 0xffdf8b, 22, 0.95, 'sparks');
    deps.playImpactAudio('physical', 0.9, area.x, area.y, area.z);
    return;
  }
  if (event.profile === 'arbalist-venom-mist-shell') {
    deps.decalXZ?.(area.x, area.z, area.radiusYards, 0x4f9a5c, 'venom-mist', duration);
    deps.ringAt(area.x, groundY, area.z, area.radiusYards, duration, 0x65bd65, 1.45, false);
    deps.ringAt(
      area.x,
      groundY + Math.min(area.heightYards, 3) * 0.34,
      area.z,
      area.radiusYards * 0.3,
      duration,
      0x9b6bb5,
      1.6,
      true,
    );
    deps.pathRibbon(0x7bd46f, 0.075, duration, (points) =>
      fillVortexSpiral(
        points,
        area.x,
        groundY + 0.02,
        area.z,
        area.radiusYards * 0.7,
        Math.min(area.heightYards, 3) * 0.7,
        1,
      ),
    );
    deps.pathRibbon(0xa27ab8, 0.055, duration, (points) =>
      fillCircle(points, area.x, groundY + 0.08, area.z, area.radiusYards * 0.86, Math.PI / 7),
    );
    deps.burstAt(area.x, area.y + 0.5, area.z, 0x8bd47b, 16, 0.72, 'sparks');
    deps.playImpactAudio('shadow', 0.78, area.x, area.y, area.z);
    return;
  }
  if (event.profile === 'arbalist-ice-cage') {
    deps.decalXZ?.(area.x, area.z, area.radiusYards, 0x7fdfff, 'ice-cage', duration);
    deps.ringAt(area.x, groundY, area.z, area.radiusYards, duration, 0x81ddff, 2, false);
    deps.ringAt(
      area.x,
      groundY + Math.min(area.heightYards, 3) * 0.55,
      area.z,
      area.radiusYards * 0.46,
      duration,
      0xdaf8ff,
      2.35,
      true,
    );
    deps.pathRibbon(0xbcefff, 0.095, duration, (points) =>
      fillVortexSpiral(
        points,
        area.x,
        groundY,
        area.z,
        area.radiusYards * 0.54,
        area.heightYards,
        1,
      ),
    );
    deps.burstAt(area.x, area.y + 0.75, area.z, 0xd9f8ff, 24, 0.9, 'sparks');
    deps.playImpactAudio('magic', 0.88, area.x, area.y, area.z);
    return;
  }
  if (event.profile === 'arbalist-flash-arrow') {
    deps.decalXZ?.(area.x, area.z, area.radiusYards, 0xe7f7ff, 'flash-arrow', duration);
    deps.ringAt(area.x, groundY, area.z, area.radiusYards, duration, 0x9deeff, 1.7, false);
    deps.ringAt(
      area.x,
      groundY + Math.min(area.heightYards, 3) * 0.5,
      area.z,
      area.radiusYards * 0.3,
      duration,
      0xffe6a3,
      2.35,
      true,
    );
    deps.pathRibbon(0xd8fbff, 0.1, duration, (points) =>
      fillVortexSpiral(
        points,
        area.x,
        groundY,
        area.z,
        area.radiusYards * 0.5,
        area.heightYards,
        1,
      ),
    );
    deps.burstAt(area.x, area.y + 0.9, area.z, 0xfff0bc, 20, 0.9, 'sparks');
    deps.playImpactAudio('physical', 0.82, area.x, area.y, area.z);
    return;
  }
  if (event.profile === 'arbalist-heavenly-bow') {
    deps.decalXZ?.(area.x, area.z, area.radiusYards, 0xb7e6ff, 'heavenly-bow', duration);
    deps.ringAt(area.x, groundY, area.z, area.radiusYards, duration, 0x70cfff, 1.9, false);
    deps.ringAt(
      area.x,
      groundY + Math.min(area.heightYards, 4) * 0.72,
      area.z,
      area.radiusYards * 0.4,
      duration,
      0xffe6a1,
      2.5,
      true,
    );
    deps.pathRibbon(0xd8f5ff, 0.09, duration, (points) =>
      fillVortexSpiral(
        points,
        area.x,
        groundY + 0.15,
        area.z,
        area.radiusYards * 0.58,
        area.heightYards,
        -1,
      ),
    );
    deps.burstAt(area.x, area.y + 2.4, area.z, 0xeaf9ff, 28, 1.15, 'sparks');
    deps.playImpactAudio('physical', 0.9, area.x, area.y, area.z);
    return;
  }
  if (event.profile === 'sorcerer-thunderstorm') {
    deps.ringAt(area.x, groundY, area.z, area.radiusYards, duration, 0x3aaee8, 1.2, false);
    deps.pathRibbon(0x8fe8ff, 0.08, duration, (points) =>
      fillCircle(points, area.x, groundY + 0.04, area.z, area.radiusYards * 0.96, 0),
    );
    deps.burstAt(area.x, area.y, area.z, 0xc9f5ff, 18, 0.85, 'sparks');
    deps.playImpactAudio('lightning', 0.8, area.x, area.y, area.z);
    return;
  }
  if (event.profile === 'sorcerer-blizzard') {
    deps.decalXZ?.(area.x, area.z, area.radiusYards, 0x79cfff, 'rime', duration);
    deps.ringAt(area.x, groundY, area.z, area.radiusYards, duration, 0x86cfff, 1.55, false);
    deps.pathRibbon(0xc8f2ff, 0.11, duration, (points) =>
      fillCircle(points, area.x, groundY + 0.06, area.z, area.radiusYards * 0.94, 0),
    );
    deps.pathRibbon(0x5fa9e6, 0.07, duration, (points) =>
      fillCircle(
        points,
        area.x,
        groundY + Math.min(area.heightYards, 4) * 0.45,
        area.z,
        area.radiusYards * 0.72,
        Math.PI / 8,
      ),
    );
    deps.burstAt(area.x, area.y, area.z, 0xe8fbff, 26, 1, 'sparks');
    deps.playImpactAudio('frost', 0.9, area.x, area.y, area.z);
    return;
  }
  if (event.profile === 'taoist-rain-of-blades') {
    deps.decalXZ?.(area.x, area.z, area.radiusYards, 0x538ec7, 'sword-rain', duration);
    deps.ringAt(area.x, groundY, area.z, area.radiusYards, duration, 0x6ebeff, 1.65, false);
    deps.pathRibbon(0xcceeff, 0.09, duration, (points) =>
      fillCircle(points, area.x, groundY + 0.05, area.z, area.radiusYards * 0.93, Math.PI / 9),
    );
    const bladeOffsets = [
      { x: -0.36, z: -0.18, leanX: 0.35, leanZ: 0.12 },
      { x: 0.28, z: -0.34, leanX: -0.22, leanZ: 0.28 },
      { x: 0.08, z: 0.38, leanX: 0.18, leanZ: -0.32 },
    ] as const;
    for (const blade of bladeOffsets) {
      deps.pathRibbon(0x9bd8ff, 0.12, duration, (points) =>
        fillFallingBlade(
          points,
          area.x + blade.x * area.radiusYards,
          groundY,
          area.z + blade.z * area.radiusYards,
          area.heightYards,
          blade.leanX,
          blade.leanZ,
        ),
      );
    }
    deps.burstAt(area.x, area.y + area.heightYards * 0.45, area.z, 0xeaf8ff, 22, 0.95, 'sparks');
    deps.playImpactAudio('magic', 0.9, area.x, area.y, area.z);
    return;
  }
  if (event.profile === 'taoist-moonlight-wave') {
    deps.decalXZ?.(area.x, area.z, area.radiusYards, 0x73f0c0, 'lunar', duration);
    deps.ringAt(area.x, groundY, area.z, area.radiusYards, duration, 0x55d7ad, 1.45, false);
    deps.pathRibbon(0xb8ffe8, 0.09, duration, (points) =>
      fillCircle(points, area.x, groundY + 0.05, area.z, area.radiusYards * 0.9, Math.PI / 10),
    );
    deps.burstAt(area.x, area.y, area.z, 0xd9fff3, 20, 0.9, 'sparks');
    deps.playImpactAudio('magic', 0.82, area.x, area.y, area.z);
    return;
  }
  if (event.profile === 'taoist-moonlight-orb') {
    deps.decalXZ?.(area.x, area.z, area.radiusYards, 0x7358d8, 'lunar-orb', duration);
    deps.ringAt(area.x, groundY, area.z, area.radiusYards, duration, 0x8668e8, 1.7, false);
    deps.ringAt(
      area.x,
      groundY + Math.min(area.heightYards, 3) * 0.45,
      area.z,
      area.radiusYards * 0.36,
      duration,
      0xc5b3ff,
      2.1,
      true,
    );
    deps.pathRibbon(0xa98fff, 0.12, duration, (points) =>
      fillVortexSpiral(
        points,
        area.x,
        groundY,
        area.z,
        area.radiusYards * 0.88,
        area.heightYards,
        1,
      ),
    );
    deps.pathRibbon(0x6243bd, 0.09, duration, (points) =>
      fillVortexSpiral(
        points,
        area.x,
        groundY + 0.08,
        area.z,
        area.radiusYards * 0.7,
        area.heightYards * 0.85,
        -1,
      ),
    );
    deps.burstAt(area.x, area.y + 1.2, area.z, 0xe9e1ff, 26, 1.05, 'sparks');
    deps.playImpactAudio('magic', 0.92, area.x, area.y, area.z);
    return;
  }
  deps.ringAt(area.x, groundY, area.z, area.radiusYards, duration, 0x6336b8, 1.85, false);
  deps.pathRibbon(0x9d72ff, 0.13, duration, (points) =>
    fillVortexSpiral(points, area.x, groundY, area.z, area.radiusYards, area.heightYards * 0.9, 1),
  );
  deps.pathRibbon(0x4d2a86, 0.1, duration, (points) =>
    fillVortexSpiral(
      points,
      area.x,
      groundY + 0.12,
      area.z,
      area.radiusYards * 0.82,
      area.heightYards * 0.82,
      -1,
    ),
  );
  deps.burstAt(area.x, area.y, area.z, 0xc3a4ff, 28, 1.1, 'sparks');
  deps.playImpactAudio('shadow', 1, area.x, area.y, area.z);
}

function playIronShackleContact(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Mir4SkillPresentationEvent,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'circle' }>,
  contactIndex: number,
): void {
  const finalContact = contactIndex === 2;
  const ringColor = finalContact ? 0xf1f8ff : contactIndex === 1 ? 0x4b8fe5 : 0x79c8ff;
  const chainColor = finalContact ? 0xf1f8ff : 0xb8e4ff;
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.12;
  deps.ringAt(
    visual.x,
    groundY,
    visual.z,
    visual.radiusYards,
    finalContact ? 0.62 : 0.52,
    ringColor,
    finalContact ? 2.2 : 1.45,
    false,
  );
  deps.pathRibbon(chainColor, finalContact ? 0.13 : 0.1, finalContact ? 0.58 : 0.46, (points) =>
    fillCircle(points, visual.x, groundY + 0.08, visual.z, visual.radiusYards, 0),
  );
  deps.pathRibbon(ringColor, finalContact ? 0.09 : 0.075, finalContact ? 0.5 : 0.4, (points) =>
    fillCircle(
      points,
      visual.x,
      groundY + Math.min(visual.heightYards, 4) * 0.16,
      visual.z,
      visual.radiusYards * 0.78,
      Math.PI / 25,
    ),
  );
  if (!finalContact) deps.beamRibbon(event.sourceId, event.targetId, chainColor, 0.1, 0.42);
  if (finalContact) deps.impactRing(event.targetId, ringColor, true);
  deps.burstAt(
    visual.x,
    visual.y,
    visual.z,
    finalContact ? ringColor : 0xd6f1ff,
    finalContact ? 22 : contactIndex === 1 ? 18 : 14,
    visual.power,
    'sparks',
  );
  deps.playImpactAudio('physical', visual.power, visual.x, visual.y, visual.z);
}

function playOverDriveContact(
  deps: Mir4NativeSkillContactPainterDeps,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'circle' }>,
  contactIndex: number,
): void {
  const secondPulse = contactIndex === 1;
  const color = secondPulse ? 0xffe08a : 0xffb341;
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.12;
  deps.ringAt(
    visual.x,
    groundY,
    visual.z,
    visual.radiusYards,
    secondPulse ? 0.7 : 0.48,
    color,
    secondPulse ? 2.2 : 1.5,
    false,
  );
  deps.pathRibbon(color, secondPulse ? 0.13 : 0.1, secondPulse ? 0.62 : 0.42, (points) =>
    fillCircle(points, visual.x, groundY + 0.08, visual.z, visual.radiusYards, 0),
  );
  deps.pathRibbon(0xfff1bd, secondPulse ? 0.09 : 0.07, secondPulse ? 0.54 : 0.36, (points) =>
    fillCircle(points, visual.x, groundY + 0.34, visual.z, visual.radiusYards * 0.72, Math.PI / 25),
  );
  deps.burstAt(visual.x, visual.y, visual.z, color, secondPulse ? 22 : 14, visual.power, 'sparks');
  deps.playImpactAudio('physical', visual.power, visual.x, visual.y, visual.z);
}

function playDragonFlameContact(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Mir4SkillPresentationEvent,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'circle' }>,
  contactIndex: number,
): void {
  const finalContact = contactIndex === event.contacts.length - 1;
  const color = finalContact ? 0xfff0aa : contactIndex === 0 ? 0xffa126 : 0xff5a1f;
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.12;
  deps.ringAt(
    visual.x,
    groundY,
    visual.z,
    visual.radiusYards,
    finalContact ? 0.82 : 0.46,
    color,
    finalContact ? 3 : 1.65 + contactIndex * 0.25,
    false,
  );
  deps.pathRibbon(color, finalContact ? 0.18 : 0.11, finalContact ? 0.78 : 0.42, (points) =>
    fillCircle(
      points,
      visual.x,
      groundY + Math.min(visual.heightYards, 4) * (finalContact ? 0.34 : 0.18),
      visual.z,
      visual.radiusYards * (finalContact ? 0.92 : 0.72),
      contactIndex * (Math.PI / 5),
    ),
  );
  deps.slashStyled(visual, color, 'horizontal', visual.radiusYards / 2.3);
  if (finalContact) deps.impactRing(event.targetId, color, true);
  deps.burstAt(
    visual.x,
    visual.y,
    visual.z,
    color,
    finalContact ? 38 : 16 + contactIndex * 4,
    visual.power,
    'sparks',
  );
  deps.playImpactAudio(
    'fire',
    finalContact ? visual.power * 1.35 : visual.power,
    visual.x,
    visual.y,
    visual.z,
  );
}

function playLightRayContact(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Mir4SkillPresentationEvent,
  contact: Extract<Mir4NativePresentationContact, { shape: 'direct' }>,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'direct' }>,
  contactIndex: number,
): void {
  const finalPair = contactIndex >= event.contacts.length - 2;
  const color = finalPair ? 0xf7f0a2 : contactIndex % 2 === 0 ? 0x8df3dc : 0xb7fff0;
  const forwardX = Math.sin(event.sourceFacing);
  const forwardZ = Math.cos(event.sourceFacing);
  const halfReach = contact.reachYards * 0.5;
  const startX = visual.x - forwardX * halfReach;
  const startZ = visual.z - forwardZ * halfReach;
  const endX = visual.x + forwardX * halfReach;
  const endZ = visual.z + forwardZ * halfReach;
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.18;
  const duration = finalPair ? 0.55 : 0.32;
  deps.pathRibbon(color, finalPair ? 0.24 : 0.15, duration, (points) => {
    const count = Math.min(points.length, 9);
    if (count < 2) return 0;
    for (let index = 0; index < count; index += 1) {
      const progress = index / (count - 1);
      points[index].set(
        startX + (endX - startX) * progress,
        groundY + Math.sin(progress * Math.PI) * (finalPair ? 1.35 : 0.75),
        startZ + (endZ - startZ) * progress,
      );
    }
    return count;
  });
  deps.slashStyled(visual, color, finalPair ? 'vertical' : 'horizontal', visual.slashScale);
  deps.ringAt(
    endX,
    deps.groundYAt(endX, endZ) + 0.12,
    endZ,
    finalPair ? 2.1 : 1.25,
    duration,
    color,
    finalPair ? 2.4 : 1.4,
    false,
  );
  deps.burstAt(
    endX,
    visual.y + (finalPair ? 1.1 : 0.65),
    endZ,
    color,
    finalPair ? 30 : 16,
    Math.max(0.8, visual.power),
    'sparks',
  );
  deps.playImpactAudio('holy', finalPair ? 1.1 : 0.78, endX, visual.y, endZ);
}

function playMagicMissileContact(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Mir4SkillPresentationEvent,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'target-circle' }>,
): void {
  const ringColor = 0x9cecff;
  const impactColor = 0xd8f8ff;
  deps.ringAt(
    visual.x,
    deps.groundYAt(visual.x, visual.z) + 0.12,
    visual.z,
    visual.radiusYards,
    0.44,
    ringColor,
    1.8,
    false,
  );
  deps.impactRing(event.targetId, impactColor, true);
  deps.burstAt(visual.x, visual.y, visual.z, impactColor, 22, visual.power, 'sparks');
  deps.playImpactAudio('frost', visual.power, visual.x, visual.y, visual.z);
}

function playFlameOrbContact(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Mir4SkillPresentationEvent,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'target-circle' }>,
): void {
  const ringColor = 0xff7a1a;
  const impactColor = 0xffd36b;
  deps.ringAt(
    visual.x,
    deps.groundYAt(visual.x, visual.z) + 0.12,
    visual.z,
    visual.radiusYards,
    0.46,
    ringColor,
    2,
    false,
  );
  deps.impactRing(event.targetId, impactColor, true);
  deps.burstAt(visual.x, visual.y, visual.z, impactColor, 24, visual.power, 'sparks');
  deps.playImpactAudio('fire', visual.power, visual.x, visual.y, visual.z);
}

function playSeekingBoltContact(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Mir4SkillPresentationEvent,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'target-circle' }>,
): void {
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.12;
  const outerColor = 0xffc65c;
  const impactColor = 0xfff1bd;
  deps.ringAt(visual.x, groundY, visual.z, 1.8, 0.48, outerColor, 2.2, false);
  deps.ringAt(visual.x, groundY + 0.9, visual.z, 1.1, 0.34, impactColor, 2.6, true);
  deps.impactRing(event.targetId, impactColor, true);
  deps.burstAt(visual.x, visual.y + 0.65, visual.z, impactColor, 28, visual.power, 'sparks');
  deps.playImpactAudio('physical', visual.power, visual.x, visual.y, visual.z);
}

function playDarkVortexContact(
  deps: Mir4NativeSkillContactPainterDeps,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'target-circle' | 'fixed-circle' }>,
  contactIndex: number,
): void {
  const finalContact = contactIndex === 5;
  const color = finalContact ? 0xe6d6ff : contactIndex === 0 ? 0xb78cff : 0x8155cf;
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.1;
  deps.ringAt(
    visual.x,
    groundY,
    visual.z,
    visual.radiusYards,
    finalContact ? 0.7 : 0.32,
    color,
    finalContact ? 2.6 : 1.25,
    false,
  );
  deps.burstAt(visual.x, visual.y, visual.z, color, finalContact ? 34 : 12, visual.power, 'sparks');
  deps.playImpactAudio(
    'shadow',
    finalContact ? visual.power * 1.25 : visual.power,
    visual.x,
    visual.y,
    visual.z,
  );
}

function playDragonTornadoContact(
  deps: Mir4NativeSkillContactPainterDeps,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'fixed-circle' }>,
  contactIndex: number,
): void {
  const finalContact = contactIndex === 9;
  const knockdownContact = contactIndex === 5;
  const color = finalContact ? 0xf2fbff : knockdownContact ? 0x9fe8ff : 0x55bde8;
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.1;
  deps.ringAt(
    visual.x,
    groundY,
    visual.z,
    visual.radiusYards,
    finalContact ? 0.72 : knockdownContact ? 0.5 : 0.3,
    color,
    finalContact ? 2.8 : 1.45,
    false,
  );
  deps.burstAt(
    visual.x,
    visual.y,
    visual.z,
    color,
    finalContact ? 38 : knockdownContact ? 26 : 14,
    visual.power,
    'sparks',
  );
  deps.playImpactAudio(
    'magic',
    finalContact ? visual.power * 1.3 : visual.power,
    visual.x,
    visual.y,
    visual.z,
  );
}

function playThunderstormContact(
  deps: Mir4NativeSkillContactPainterDeps,
  contact: Mir4NativePresentationContact,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'fixed-circle' }>,
  contactIndex: number,
): void {
  const telegraph = contact.attackId === 230112;
  const finalContact = contact.attackId === 230116;
  const color = telegraph ? 0x85dfff : finalContact ? 0xf0fcff : 0x58c9ff;
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.1;
  deps.ringAt(
    visual.x,
    groundY,
    visual.z,
    visual.radiusYards,
    telegraph ? 0.24 : finalContact ? 0.5 : 0.28,
    color,
    telegraph ? 1.1 : finalContact ? 2.6 : 1.7,
    false,
  );
  if (telegraph) return;
  deps.pathRibbon(color, finalContact ? 0.14 : 0.1, finalContact ? 0.34 : 0.22, (points) => {
    const count = Math.min(points.length, 8);
    for (let index = 0; index < count; index += 1) {
      const progress = index / Math.max(1, count - 1);
      const jitter =
        index === 0 || index === count - 1 ? 0 : ((index + contactIndex) % 2 ? 1 : -1) * 0.22;
      points[index].set(
        visual.x + jitter,
        groundY + visual.heightYards * (1 - progress),
        visual.z - jitter * 0.6,
      );
    }
    return count;
  });
  deps.burstAt(visual.x, visual.y, visual.z, color, finalContact ? 30 : 16, visual.power, 'sparks');
  deps.playImpactAudio('lightning', finalContact ? 1.2 : 0.9, visual.x, visual.y, visual.z);
}

function playRainOfBladesContact(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Mir4SkillPresentationEvent,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'target-circle' | 'fixed-circle' }>,
  contactIndex: number,
): void {
  const directContact = visual.shape === 'target-circle';
  const color = directContact ? 0xeaf8ff : contactIndex === 0 ? 0x8fcfff : 0xb8e5ff;
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.1;
  const bladeHeight = Math.max(2.4, visual.heightYards);
  for (let bladeIndex = 0; bladeIndex < 2; bladeIndex += 1) {
    const side = bladeIndex === 0 ? -1 : 1;
    deps.pathRibbon(color, directContact ? 0.14 : 0.1, directContact ? 0.5 : 0.38, (points) =>
      fillFallingBlade(
        points,
        visual.x + side * visual.radiusYards * 0.18,
        groundY,
        visual.z + (contactIndex - 1) * visual.radiusYards * 0.12,
        bladeHeight,
        side * 0.28,
        -0.16,
      ),
    );
  }
  deps.slashStyled(
    { x: visual.x, y: visual.y + 1.6, z: visual.z },
    color,
    'thrust',
    directContact ? 2.1 : 1.55,
  );
  deps.ringAt(
    visual.x,
    groundY,
    visual.z,
    visual.radiusYards,
    directContact ? 0.62 : 0.34,
    color,
    directContact ? 2.5 : 1.55,
    false,
  );
  if (directContact) deps.impactRing(event.targetId, color, true);
  deps.burstAt(
    visual.x,
    visual.y,
    visual.z,
    color,
    directContact ? 30 : 16,
    Math.max(0.7, visual.power),
    'sparks',
  );
  deps.playImpactAudio('magic', directContact ? 1.12 : 0.86, visual.x, visual.y, visual.z);
}

function playMoonlightWaveContact(
  deps: Mir4NativeSkillContactPainterDeps,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'target-circle' | 'fixed-circle' }>,
  contactIndex: number,
): void {
  const directContact = visual.shape === 'target-circle';
  const finalContact = contactIndex === 4;
  const color = directContact ? 0xe8fff7 : finalContact ? 0xb9ffe7 : 0x65dfb5;
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.1;
  deps.ringAt(
    visual.x,
    groundY,
    visual.z,
    visual.radiusYards,
    directContact || finalContact ? 0.52 : 0.28,
    color,
    directContact || finalContact ? 2.25 : 1.45,
    false,
  );
  deps.pathRibbon(color, directContact ? 0.14 : 0.09, directContact ? 0.48 : 0.3, (points) =>
    fillCircle(
      points,
      visual.x,
      groundY + Math.min(visual.heightYards, 4) * 0.18,
      visual.z,
      visual.radiusYards * (directContact ? 0.72 : 0.9),
      contactIndex * (Math.PI / 5),
    ),
  );
  deps.burstAt(
    visual.x,
    visual.y,
    visual.z,
    color,
    directContact || finalContact ? 28 : 15,
    Math.max(0.65, visual.power),
    'sparks',
  );
  deps.playImpactAudio(
    'magic',
    directContact || finalContact ? 1.05 : 0.82,
    visual.x,
    visual.y,
    visual.z,
  );
}

function playMoonlightOrbContact(
  deps: Mir4NativeSkillContactPainterDeps,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'target-circle' | 'fixed-circle' }>,
  contactIndex: number,
): void {
  const directContact = visual.shape === 'target-circle';
  const strongPull = contactIndex === 5 || contactIndex === 6;
  const finalContact = contactIndex === 8;
  const color = directContact
    ? 0xf1e8ff
    : strongPull
      ? 0x9d79ff
      : finalContact
        ? 0xcdb8ff
        : 0x7358d8;
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.12;
  deps.ringAt(
    visual.x,
    groundY,
    visual.z,
    visual.radiusYards * (directContact ? 0.72 : finalContact ? 1 : 0.9),
    directContact || finalContact ? 0.58 : 0.34,
    color,
    directContact || strongPull || finalContact ? 2.2 : 1.5,
    false,
  );
  deps.pathRibbon(
    color,
    strongPull || finalContact ? 0.15 : 0.1,
    finalContact ? 0.62 : 0.38,
    (points) =>
      fillVortexSpiral(
        points,
        visual.x,
        groundY,
        visual.z,
        visual.radiusYards * (strongPull ? 0.95 : 0.75),
        Math.min(visual.heightYards, 3) * 0.78,
        contactIndex % 2 === 0 ? 1 : -1,
      ),
  );
  deps.burstAt(
    visual.x,
    visual.y + Math.min(visual.heightYards, 3) * 0.4,
    visual.z,
    color,
    directContact || finalContact ? 30 : 16,
    Math.max(0.72, visual.power),
    'sparks',
  );
  deps.playImpactAudio(
    'magic',
    directContact || finalContact ? 1.12 : 0.84,
    visual.x,
    visual.y,
    visual.z,
  );
}

function playBlizzardContact(
  deps: Mir4NativeSkillContactPainterDeps,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'target-circle' | 'fixed-circle' }>,
  contactIndex: number,
): void {
  const finalContact = contactIndex === 6;
  const directContact = contactIndex === 5;
  const color = directContact ? 0xf2fdff : finalContact ? 0xd6f7ff : 0x8ad9ff;
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.1;
  deps.ringAt(
    visual.x,
    groundY,
    visual.z,
    visual.radiusYards,
    finalContact ? 0.58 : 0.34,
    color,
    directContact || finalContact ? 2.35 : 1.45,
    false,
  );
  deps.pathRibbon(color, finalContact ? 0.14 : 0.09, finalContact ? 0.48 : 0.3, (points) =>
    fillCircle(
      points,
      visual.x,
      groundY + Math.min(visual.heightYards, 4) * 0.22,
      visual.z,
      visual.radiusYards * (finalContact ? 0.92 : 0.68),
      contactIndex * (Math.PI / 7),
    ),
  );
  deps.burstAt(
    visual.x,
    visual.y,
    visual.z,
    color,
    directContact || finalContact ? 30 : 16,
    visual.power,
    'sparks',
  );
  deps.playImpactAudio('frost', finalContact ? 1.15 : 0.9, visual.x, visual.y, visual.z);
}

function playMagicShieldContact(
  deps: Mir4NativeSkillContactPainterDeps,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'circle' }>,
  contactIndex: number,
): void {
  const finalContact = contactIndex === 2;
  const color = finalContact ? 0xd8fbff : contactIndex === 1 ? 0x62d8ff : 0x5a86ff;
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.1;
  deps.ringAt(
    visual.x,
    groundY,
    visual.z,
    visual.radiusYards,
    finalContact ? 0.7 : 0.46,
    color,
    finalContact ? 2.5 : 1.65,
    false,
  );
  deps.pathRibbon(color, finalContact ? 0.14 : 0.1, finalContact ? 0.62 : 0.4, (points) =>
    fillCircle(
      points,
      visual.x,
      groundY + Math.min(visual.heightYards, 4) * 0.22,
      visual.z,
      visual.radiusYards * 0.9,
      contactIndex * (Math.PI / 5),
    ),
  );
  deps.burstAt(
    visual.x,
    visual.y,
    visual.z,
    color,
    finalContact ? 28 : 14 + contactIndex * 4,
    visual.power,
    'sparks',
  );
  deps.playImpactAudio('frost', finalContact ? 1.15 : 0.9, visual.x, visual.y, visual.z);
}

function playFrozenBlockContact(
  deps: Mir4NativeSkillContactPainterDeps,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'circle' }>,
  contactIndex: number,
): void {
  const breakContact = contactIndex === 2;
  const color = breakContact ? 0xf2fdff : contactIndex === 0 ? 0x74cfff : 0xb9efff;
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.1;
  deps.decalXZ?.(
    visual.x,
    visual.z,
    visual.radiusYards,
    0x89d8ff,
    'rime',
    breakContact ? 0.7 : 0.42,
  );
  deps.ringAt(
    visual.x,
    groundY,
    visual.z,
    visual.radiusYards * (breakContact ? 1 : 0.82),
    breakContact ? 0.72 : 0.46,
    color,
    breakContact ? 2.7 : 1.75,
    false,
  );
  deps.pathRibbon(color, breakContact ? 0.15 : 0.1, breakContact ? 0.68 : 0.42, (points) =>
    fillCircle(
      points,
      visual.x,
      groundY + Math.min(visual.heightYards, 4) * 0.3,
      visual.z,
      visual.radiusYards * (breakContact ? 0.94 : 0.7),
      contactIndex * (Math.PI / 4),
    ),
  );
  deps.burstAt(
    visual.x,
    visual.y,
    visual.z,
    color,
    breakContact ? 34 : 16 + contactIndex * 5,
    Math.max(0.7, visual.power),
    'sparks',
  );
  deps.playImpactAudio('frost', breakContact ? 1.2 : 0.92, visual.x, visual.y, visual.z);
}

/** Browser reconstruction of the extracted SunLight attack/trail package. */
function playSunbeamSwordContact(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Mir4SkillPresentationEvent,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'direct' }>,
  contactIndex: number,
): void {
  const finalContact = contactIndex === event.contacts.length - 1;
  const primary = finalContact ? 0xfff4a8 : contactIndex % 2 === 0 ? 0xffd34d : 0xffa928;
  const style =
    contactIndex === 0 || finalContact
      ? 'crescent'
      : contactIndex % 3 === 0
        ? 'thrust'
        : 'horizontal';
  deps.slashStyled(visual, primary, style, visual.slashScale * (finalContact ? 1.28 : 1));
  deps.burstAt(
    visual.x,
    visual.y + 0.3,
    visual.z,
    primary,
    finalContact ? 26 : 10 + contactIndex * 2,
    Math.max(0.65, visual.power),
    'sparks',
  );
  if (contactIndex === 0 || contactIndex === 3 || finalContact) {
    deps.ringAt(
      visual.x,
      deps.groundYAt(visual.x, visual.z) + 0.1,
      visual.z,
      2.5 + contactIndex * 0.18,
      finalContact ? 0.65 : 0.38,
      primary,
      finalContact ? 2.1 : 1.25,
      false,
    );
  }
  deps.playImpactAudio('holy', finalContact ? 1.1 : 0.78, visual.x, visual.y, visual.z);
}

function fillPiercingBladeTrail(
  points: PathPoint[],
  x: number,
  y: number,
  z: number,
  facing: number,
  length: number,
  lateralOffset: number,
): number {
  const count = Math.min(points.length, 9);
  if (count < 2) return 0;
  const forwardX = Math.sin(facing);
  const forwardZ = Math.cos(facing);
  const rightX = forwardZ;
  const rightZ = -forwardX;
  for (let index = 0; index < count; index += 1) {
    const progress = index / (count - 1) - 0.5;
    const taper = Math.sin((progress + 0.5) * Math.PI) * 0.08;
    points[index].set(
      x + forwardX * length * progress + rightX * (lateralOffset + taper),
      y + 0.08 + taper,
      z + forwardZ * length * progress + rightZ * (lateralOffset + taper),
    );
  }
  return count;
}

/** Pink-blue launcher, shoot and trail reconstruction for the extracted PiercingAtk package. */
function playPiercingBladesContact(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Mir4SkillPresentationEvent,
  contact: Extract<Mir4NativePresentationContact, { shape: 'direct' }>,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'direct' }>,
  contactIndex: number,
): void {
  const finalContact = contactIndex === event.contacts.length - 1;
  const secondSequence = contact.attackId === 310303;
  const color = finalContact ? 0xf5e8ff : secondSequence ? 0xd58cff : 0x8eeaff;
  const lateralOffset = (contactIndex - 2) * 0.18;
  deps.slashStyled(
    visual,
    color,
    'thrust',
    visual.slashScale * (finalContact ? 1.3 : secondSequence ? 1.12 : 1),
  );
  deps.pathRibbon(color, finalContact ? 0.16 : 0.1, finalContact ? 0.48 : 0.3, (points) =>
    fillPiercingBladeTrail(
      points,
      visual.x,
      visual.y,
      visual.z,
      event.sourceFacing,
      contact.reachYards,
      lateralOffset,
    ),
  );
  if (contactIndex === 0 || finalContact) {
    deps.ringAt(
      visual.x,
      deps.groundYAt(visual.x, visual.z) + 0.1,
      visual.z,
      finalContact ? 3.2 : 2.2,
      finalContact ? 0.58 : 0.32,
      color,
      finalContact ? 2.25 : 1.2,
      false,
    );
  }
  deps.burstAt(
    visual.x,
    visual.y + 0.25,
    visual.z,
    color,
    finalContact ? 28 : 10 + contactIndex * 2,
    Math.max(0.65, visual.power),
    'sparks',
  );
  deps.playImpactAudio('physical', finalContact ? 1.15 : 0.82, visual.x, visual.y, visual.z);
}

/** Three accelerating sword-blast waves reconstructed from the extracted SwordBlast package. */
function playSoaringSlashContact(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Mir4SkillPresentationEvent,
  contact: Extract<Mir4NativePresentationContact, { shape: 'direct' }>,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'direct' }>,
  contactIndex: number,
): void {
  const sequence = contact.attackId - 320301;
  const sequenceIndex = contactIndex % 3;
  const finalContact = contactIndex === event.contacts.length - 1;
  const colors = [0x72dcff, 0xc17cff, 0xffe6a3] as const;
  const color = finalContact ? 0xffffff : (colors[sequence] ?? colors[0]);
  const lateralOffset = (sequenceIndex - 1) * (0.32 + sequence * 0.08);
  deps.slashStyled(
    visual,
    color,
    sequence === 2 ? 'cleave' : 'thrust',
    visual.slashScale * (1 + sequence * 0.12 + (finalContact ? 0.2 : 0)),
  );
  deps.pathRibbon(color, 0.11 + sequence * 0.025, 0.3 + sequence * 0.08, (points) =>
    fillPiercingBladeTrail(
      points,
      visual.x,
      visual.y,
      visual.z,
      event.sourceFacing,
      contact.reachYards,
      lateralOffset,
    ),
  );
  if (sequenceIndex === 0 || finalContact) {
    deps.ringAt(
      visual.x,
      deps.groundYAt(visual.x, visual.z) + 0.1,
      visual.z,
      finalContact ? 3.8 : 2.1 + sequence * 0.45,
      finalContact ? 0.62 : 0.34,
      color,
      finalContact ? 2.4 : 1.25 + sequence * 0.2,
      false,
    );
  }
  deps.burstAt(
    visual.x,
    visual.y + 0.3,
    visual.z,
    color,
    finalContact ? 34 : 12 + sequence * 5,
    Math.max(0.7, visual.power),
    'sparks',
  );
  deps.playImpactAudio('holy', 0.78 + sequence * 0.12, visual.x, visual.y, visual.z);
}

/** Gold-green source waves reconstructed from the extracted Heal cast and buff packages. */
function playHealContact(
  deps: Mir4NativeSkillContactPainterDeps,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'circle' }>,
  contactIndex: number,
): void {
  const release = contactIndex === 1;
  const partyArrival = contactIndex === 2;
  const color = release ? 0xdfff76 : partyArrival ? 0xb9ff9a : 0xffdf7a;
  const radius = release ? 8 : partyArrival ? 10 : 4;
  const duration = release ? 0.72 : partyArrival ? 0.58 : 0.42;
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.1;
  deps.ringAt(
    visual.x,
    groundY,
    visual.z,
    radius,
    duration,
    color,
    release ? 2.5 : partyArrival ? 2.1 : 1.55,
    false,
  );
  deps.pathRibbon(color, release ? 0.15 : 0.1, duration, (points) =>
    fillCircle(
      points,
      visual.x,
      groundY + 0.08,
      visual.z,
      radius * 0.85,
      contactIndex * (Math.PI / 5),
    ),
  );
  deps.burstAt(
    visual.x,
    visual.y + (release ? 1.2 : 0.7),
    visual.z,
    color,
    release ? 30 : partyArrival ? 24 : 16,
    1,
    'sparks',
  );
  deps.playImpactAudio('holy', release ? 1.05 : 0.82, visual.x, visual.y, visual.z);
}

/** Wide gold-white ritual reconstructed from the extracted Grand Heal cast and shot packages. */
function playGreaterHealContact(
  deps: Mir4NativeSkillContactPainterDeps,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'circle' }>,
  contactIndex: number,
): void {
  const release = contactIndex === 1;
  const resurrection = contactIndex >= 2;
  const color = release ? 0xf4ffad : resurrection ? 0xc9fbff : 0xffdc83;
  const radius = release ? 12 : resurrection ? 9 : 6;
  const duration = release ? 0.92 : resurrection ? 0.66 : 0.48;
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.1;
  deps.ringAt(
    visual.x,
    groundY,
    visual.z,
    radius,
    duration,
    color,
    release ? 3 : resurrection ? 2.35 : 1.8,
    false,
  );
  const ribbonCount = release ? 2 : 1;
  for (let ribbonIndex = 0; ribbonIndex < ribbonCount; ribbonIndex += 1) {
    deps.pathRibbon(color, release ? 0.18 : 0.11, duration, (points) =>
      fillCircle(
        points,
        visual.x,
        groundY + 0.08 + ribbonIndex * 0.12,
        visual.z,
        radius * (0.68 + ribbonIndex * 0.18),
        contactIndex * (Math.PI / 5) + ribbonIndex * (Math.PI / 3),
      ),
    );
  }
  deps.burstAt(
    visual.x,
    visual.y + (release ? 1.5 : resurrection ? 1.2 : 0.8),
    visual.z,
    color,
    release ? 42 : resurrection ? 32 : 20,
    release ? 1.25 : 1,
    'sparks',
  );
  deps.playImpactAudio(
    'holy',
    release ? 1.2 : resurrection ? 1.05 : 0.86,
    visual.x,
    visual.y,
    visual.z,
  );
}

/** Earth-blue barrier reconstructed from MagicBarrier03 and its native buff bindings. */
function playGuardianCircleContact(
  deps: Mir4NativeSkillContactPainterDeps,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'circle' }>,
  contactIndex: number,
): void {
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.1;
  if (contactIndex === 0) {
    deps.decalXZ?.(visual.x, visual.z, visual.radiusYards, 0x2d78a4, 'guardian-circle-guide', 0.4);
    deps.ringAt(visual.x, groundY, visual.z, visual.radiusYards, 0.4, 0x55b8df, 1.35, false);
    deps.pathRibbon(0x8ddcff, 0.08, 0.4, (points) =>
      fillCircle(points, visual.x, groundY + 0.06, visual.z, visual.radiusYards * 0.92, 0),
    );
    deps.playImpactAudio('magic', 0.66, visual.x, visual.y, visual.z);
    return;
  }
  if (contactIndex === 1) {
    deps.ringAt(visual.x, groundY, visual.z, visual.radiusYards, 0.55, 0x6fcfff, 2.2, false);
    deps.pathRibbon(0xd1f5ff, 0.13, 0.55, (points) =>
      fillVortexSpiral(
        points,
        visual.x,
        groundY,
        visual.z,
        visual.radiusYards * 0.82,
        Math.min(visual.heightYards, 4) * 0.7,
        1,
      ),
    );
    deps.burstAt(visual.x, visual.y + 0.55, visual.z, 0xc5f3ff, 26, 1, 'sparks');
    deps.playImpactAudio('magic', 0.92, visual.x, visual.y, visual.z);
    return;
  }
  deps.decalXZ?.(visual.x, visual.z, visual.radiusYards, 0x3a9fd8, 'guardian-circle', 0.9);
  deps.ringAt(visual.x, groundY, visual.z, visual.radiusYards, 0.9, 0x78dcff, 2.4, false);
  deps.ringAt(
    visual.x,
    groundY + Math.min(visual.heightYards, 4) * 0.5,
    visual.z,
    visual.radiusYards * 0.7,
    0.9,
    0xb8efff,
    1.8,
    true,
  );
  deps.pathRibbon(0xb9edff, 0.13, 0.9, (points) =>
    fillCircle(points, visual.x, groundY + 0.08, visual.z, visual.radiusYards * 0.9, Math.PI / 10),
  );
  deps.pathRibbon(0x5fb7ea, 0.09, 0.9, (points) =>
    fillCircle(
      points,
      visual.x,
      groundY + Math.min(visual.heightYards, 4) * 0.5,
      visual.z,
      visual.radiusYards * 0.68,
      Math.PI / 5,
    ),
  );
  deps.burstAt(visual.x, visual.y + 1.25, visual.z, 0xd8f8ff, 32, 1.05, 'sparks');
  deps.playImpactAudio('magic', 1.05, visual.x, visual.y, visual.z);
}

/** Blue-violet cleansing ward reconstructed from the extracted Resist package. */
function playExpulsionCircleContact(
  deps: Mir4NativeSkillContactPainterDeps,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'circle' }>,
): void {
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.1;
  deps.decalXZ?.(visual.x, visual.z, visual.radiusYards, 0x535bd6, 'expulsion-circle', 0.85);
  deps.ringAt(visual.x, groundY, visual.z, visual.radiusYards, 0.85, 0x8798ff, 2.5, false);
  deps.ringAt(
    visual.x,
    groundY + Math.min(visual.heightYards, 4) * 0.55,
    visual.z,
    visual.radiusYards * 0.68,
    0.85,
    0xd5dcff,
    1.8,
    true,
  );
  deps.pathRibbon(0xadb8ff, 0.12, 0.85, (points) =>
    fillCircle(points, visual.x, groundY + 0.08, visual.z, visual.radiusYards * 0.9, 0),
  );
  deps.pathRibbon(0x6c78e8, 0.09, 0.85, (points) =>
    fillVortexSpiral(
      points,
      visual.x,
      groundY,
      visual.z,
      visual.radiusYards * 0.72,
      Math.min(visual.heightYards, 4) * 0.8,
      1,
    ),
  );
  deps.burstAt(visual.x, visual.y + 1.2, visual.z, 0xe8ecff, 30, 1.05, 'sparks');
  deps.playImpactAudio('magic', 1.02, visual.x, visual.y, visual.z);
}

/** Violet awareness aura reconstructed from the extracted Pca Skl11 buff package. */
function playMindsEyeContact(
  deps: Mir4NativeSkillContactPainterDeps,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'circle' }>,
): void {
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.1;
  deps.decalXZ?.(visual.x, visual.z, visual.radiusYards, 0x6d4cc7, 'minds-eye', 0.8);
  deps.ringAt(visual.x, groundY, visual.z, visual.radiusYards, 0.8, 0xb795ff, 2.2, false);
  deps.ringAt(
    visual.x,
    groundY + Math.min(visual.heightYards, 4) * 0.5,
    visual.z,
    visual.radiusYards * 0.7,
    0.8,
    0xf2cf72,
    1.6,
    true,
  );
  deps.pathRibbon(0xd1b6ff, 0.12, 0.8, (points) =>
    fillCircle(points, visual.x, groundY + 0.08, visual.z, visual.radiusYards * 0.9, 0),
  );
  deps.pathRibbon(0xffdc83, 0.08, 0.8, (points) =>
    fillVortexSpiral(
      points,
      visual.x,
      groundY,
      visual.z,
      visual.radiusYards * 0.58,
      Math.min(visual.heightYards, 4) * 0.55,
      1,
    ),
  );
  deps.burstAt(visual.x, visual.y + 1.15, visual.z, 0xe4c8ff, 28, 1, 'sparks');
  deps.playImpactAudio('magic', 0.96, visual.x, visual.y, visual.z);
}

/** Alternating gold/teal circular force reconstructed from the extracted Taegeuk package. */
function playTaiChiContact(
  deps: Mir4NativeSkillContactPainterDeps,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'circle' }>,
  contactIndex: number,
): void {
  const recovery = contactIndex === 6;
  const finalStrike = contactIndex === 5;
  const gold = contactIndex % 2 === 0;
  const color = recovery ? 0xf4d477 : gold ? 0xf1c45b : 0x73e0d1;
  const counterColor = recovery ? 0x73e0d1 : gold ? 0x73e0d1 : 0xf1c45b;
  const duration = recovery ? 0.82 : finalStrike ? 0.68 : 0.42;
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.1;
  if (recovery) {
    deps.decalXZ?.(visual.x, visual.z, visual.radiusYards, 0xf1c45b, 'tai-chi', duration);
    deps.ringAt(visual.x, groundY, visual.z, visual.radiusYards, duration, 0xf4d477, 2.4, false);
    deps.ringAt(
      visual.x,
      groundY + Math.min(visual.heightYards, 4) * 0.35,
      visual.z,
      visual.radiusYards * 0.65,
      duration,
      0x73e0d1,
      1.8,
      true,
    );
  } else {
    deps.ringAt(
      visual.x,
      groundY,
      visual.z,
      visual.radiusYards * (contactIndex === 0 ? 0.72 : 0.82),
      duration,
      color,
      finalStrike ? 2.35 : 1.55,
      false,
    );
  }
  deps.pathRibbon(color, recovery ? 0.14 : 0.1, duration, (points) =>
    fillVortexSpiral(
      points,
      visual.x,
      groundY,
      visual.z,
      visual.radiusYards * (recovery ? 0.72 : 0.66),
      Math.min(visual.heightYards, 4) * (recovery ? 0.6 : 0.35),
      gold ? 1 : -1,
    ),
  );
  deps.pathRibbon(counterColor, recovery ? 0.1 : 0.07, duration, (points) =>
    fillVortexSpiral(
      points,
      visual.x,
      groundY + 0.05,
      visual.z,
      visual.radiusYards * (recovery ? 0.5 : 0.48),
      Math.min(visual.heightYards, 4) * (recovery ? 0.42 : 0.25),
      gold ? -1 : 1,
    ),
  );
  deps.burstAt(
    visual.x,
    visual.y + (recovery ? 1 : 0.45),
    visual.z,
    color,
    recovery ? 32 : finalStrike ? 26 : 12,
    Math.max(0.7, visual.power),
    'sparks',
  );
  deps.playImpactAudio(
    'holy',
    recovery ? 1.05 : finalStrike ? 1 : 0.72,
    visual.x,
    visual.y,
    visual.z,
  );
}

function playQuickShotContact(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Mir4SkillPresentationEvent,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'circle' }>,
  contactIndex: number,
): void {
  const resolvesDamage = event.contacts[contactIndex]?.damageCoefficient !== 0;
  const color = resolvesDamage ? 0xffd87a : 0xfff0bd;
  deps.beamRibbon(event.sourceId, event.targetId, color, resolvesDamage ? 0.055 : 0.035, 0.13);
  deps.impactRing(event.targetId, color, resolvesDamage);
  deps.ringAt(
    visual.x,
    deps.groundYAt(visual.x, visual.z) + 0.04,
    visual.z,
    resolvesDamage ? 0.62 : 0.38,
    resolvesDamage ? 0.22 : 0.14,
    color,
    resolvesDamage ? 1.8 : 1.1,
    false,
  );
  deps.burstAt(
    visual.x,
    visual.y + 0.65,
    visual.z,
    color,
    resolvesDamage ? 9 : 4,
    resolvesDamage ? Math.max(0.8, visual.power) : 0.55,
    'sparks',
  );
  deps.playImpactAudio('physical', resolvesDamage ? 0.82 : 0.55, visual.x, visual.y, visual.z);
}

function playPainstrikeGaleContact(
  deps: Mir4NativeSkillContactPainterDeps,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'direct' }>,
): void {
  const gold = 0xffd56a;
  const shadow = 0x7250b8;
  deps.slashStyled(visual, shadow, 'horizontal', 1.45);
  deps.slashStyled(visual, gold, 'vertical', 1.05);
  deps.ringAt(
    visual.x,
    deps.groundYAt(visual.x, visual.z) + 0.06,
    visual.z,
    1.8,
    0.36,
    shadow,
    1.8,
    false,
  );
  deps.burstAt(visual.x, visual.y + 0.75, visual.z, gold, 22, Math.max(1, visual.power), 'sparks');
  deps.playImpactAudio('physical', 1.05, visual.x, visual.y, visual.z);
}

/** TurnSpear04 drains the target area back into the Lancer in one red-violet pulse. */
function playAbsorptionContact(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Mir4SkillPresentationEvent,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'target-circle' }>,
): void {
  const crimson = 0xff3f68;
  const shadow = 0x8e4de8;
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.06;
  deps.decalXZ?.(visual.x, visual.z, visual.radiusYards, shadow, 'absorption', 0.65);
  deps.ringAt(visual.x, groundY, visual.z, visual.radiusYards, 0.58, crimson, 2.8, false);
  deps.ringAt(
    visual.x,
    groundY + 0.12,
    visual.z,
    visual.radiusYards * 0.62,
    0.44,
    shadow,
    2,
    false,
  );
  deps.beamRibbon(event.targetId, event.sourceId, crimson, 0.16, 0.55);
  deps.impactRing(event.targetId, shadow, true);
  deps.burstAt(
    visual.x,
    visual.y + 0.8,
    visual.z,
    crimson,
    32,
    Math.max(1, visual.power),
    'sparks',
  );
  deps.playImpactAudio('shadow', 1.15, visual.x, visual.y, visual.z);
}

/** Two almost simultaneous spear lanes: full reach, then the 15-20 yard bonus band. */
function playPiercingSpearContact(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Mir4SkillPresentationEvent,
  contact: Extract<Mir4NativePresentationContact, { shape: 'direct' }>,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'direct' }>,
  contactIndex: number,
): void {
  const bonusBand = contact.minReachYards !== undefined;
  const color = bonusBand ? 0xf3efff : 0x8ddcff;
  const length = contact.reachYards - (contact.minReachYards ?? 0);
  deps.slashStyled(visual, color, bonusBand ? 'crescent' : 'thrust', visual.slashScale);
  deps.pathRibbon(color, bonusBand ? 0.18 : 0.12, bonusBand ? 0.48 : 0.36, (points) =>
    fillPiercingBladeTrail(
      points,
      visual.x,
      visual.y + 0.12,
      visual.z,
      event.sourceFacing,
      length,
      bonusBand ? 0.16 : 0,
    ),
  );
  deps.ringAt(
    visual.x,
    deps.groundYAt(visual.x, visual.z) + 0.08,
    visual.z,
    bonusBand ? 2.5 : 1.8,
    bonusBand ? 0.5 : 0.34,
    color,
    bonusBand ? 2.4 : 1.55,
    false,
  );
  deps.burstAt(
    visual.x,
    visual.y + 0.35,
    visual.z,
    color,
    bonusBand ? 30 : 18,
    Math.max(0.85, visual.power),
    'sparks',
  );
  deps.playImpactAudio('physical', contactIndex === 1 ? 1.2 : 0.9, visual.x, visual.y, visual.z);
}

/** DashSpear01 advances through five blue spear cuts and one pale crescent finisher. */
function playRavagingBlowContact(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Mir4SkillPresentationEvent,
  contact: Extract<Mir4NativePresentationContact, { shape: 'direct' }>,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'direct' }>,
  contactIndex: number,
): void {
  const finalContact = contactIndex === event.contacts.length - 1;
  const color = finalContact ? 0xe7f8ff : contactIndex < 3 ? 0x5dc7ff : 0x93e4ff;
  const style = finalContact ? 'crescent' : contactIndex < 3 ? 'thrust' : 'horizontal';
  const lateralOffset = (contactIndex - 2.5) * 0.11;
  deps.slashStyled(visual, color, style, visual.slashScale * (finalContact ? 1.3 : 1));
  deps.pathRibbon(color, finalContact ? 0.18 : 0.11, finalContact ? 0.52 : 0.32, (points) =>
    fillPiercingBladeTrail(
      points,
      visual.x,
      visual.y + 0.12,
      visual.z,
      event.sourceFacing,
      contact.reachYards,
      lateralOffset,
    ),
  );
  if (contactIndex === 0 || contactIndex === 3 || finalContact) {
    deps.ringAt(
      visual.x,
      deps.groundYAt(visual.x, visual.z) + 0.08,
      visual.z,
      finalContact ? 3.2 : 2.1,
      finalContact ? 0.52 : 0.34,
      color,
      finalContact ? 2.5 : 1.55,
      false,
    );
  }
  deps.burstAt(
    visual.x,
    visual.y + (finalContact ? 0.45 : 0.28),
    visual.z,
    color,
    finalContact ? 32 : 14 + contactIndex * 2,
    Math.max(finalContact ? 0.9 : 0.75, visual.power),
    'sparks',
  );
  deps.playImpactAudio(
    'physical',
    finalContact ? 1.2 : 0.82 + contactIndex * 0.05,
    visual.x,
    visual.y,
    visual.z,
  );
}

/** DashSpear02 crosses the target, turns 180 degrees, then drives it back with one red spear lift. */
function playBlitzStrikeContact(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Mir4SkillPresentationEvent,
  contact: Extract<Mir4NativePresentationContact, { shape: 'direct' }>,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'direct' }>,
): void {
  const strike = 0xff5d62;
  const burst = 0xffc16a;
  const returnFacing = event.sourceFacing + Math.PI;
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.08;
  deps.slashStyled(visual, strike, 'vertical', 3.9);
  deps.pathRibbon(strike, 0.22, 0.52, (points) =>
    fillPiercingBladeTrail(
      points,
      visual.x,
      visual.y + 0.2,
      visual.z,
      returnFacing,
      contact.reachYards,
      0,
    ),
  );
  deps.ringAt(visual.x, groundY, visual.z, 3.6, 0.58, burst, 2.8, false);
  deps.burstAt(visual.x, visual.y + 0.55, visual.z, burst, 38, 1.15, 'sparks');
  deps.playImpactAudio('physical', 1.25, visual.x, visual.y, visual.z);
}

/** DashSpear03 condenses a red spear charge into one long hybrid frontal rupture. */
function playDragonSpearContact(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Mir4SkillPresentationEvent,
  contact: Extract<Mir4NativePresentationContact, { shape: 'direct' }>,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'direct' }>,
): void {
  const spear = 0xff4655;
  const impact = 0xffc06a;
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.08;
  deps.slashStyled(visual, spear, 'thrust', 5.2);
  deps.pathRibbon(spear, 0.3, 0.72, (points) =>
    fillPiercingBladeTrail(
      points,
      visual.x,
      visual.y + 0.35,
      visual.z,
      event.sourceFacing,
      contact.reachYards,
      0,
    ),
  );
  deps.pathRibbon(impact, 0.16, 0.54, (points) =>
    fillPiercingBladeTrail(
      points,
      visual.x,
      visual.y + 0.95,
      visual.z,
      event.sourceFacing,
      contact.reachYards * 0.82,
      0.32,
    ),
  );
  deps.ringAt(visual.x, groundY, visual.z, 5.4, 0.72, impact, 3.4, false);
  deps.burstAt(visual.x, visual.y + 0.75, visual.z, impact, 58, 1.45, 'sparks');
  deps.playImpactAudio('physical', 1.35, visual.x, visual.y, visual.z);
}

/** CircleMoon01 cuts twice through one broad rear-offset crescent sector. */
function playCrescentBladeContact(
  deps: Mir4NativeSkillContactPainterDeps,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'sector' }>,
  contactIndex: number,
): void {
  const finishingSweep = contactIndex === 1;
  const color = finishingSweep ? 0xe5f8ff : 0x69cfff;
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.08;
  deps.slashStyled(visual, color, 'crescent', finishingSweep ? 3.35 : 3);
  deps.pathRibbon(color, finishingSweep ? 0.2 : 0.14, finishingSweep ? 0.54 : 0.4, (points) =>
    fillSectorOutline(
      points,
      visual.x,
      groundY + (finishingSweep ? 0.16 : 0.08),
      visual.z,
      visual.facing,
      visual.radiusYards,
      visual.angleDegrees,
    ),
  );
  deps.ringAt(
    visual.x,
    groundY,
    visual.z,
    finishingSweep ? 4.2 : 3.3,
    finishingSweep ? 0.5 : 0.34,
    color,
    finishingSweep ? 2.55 : 1.7,
    false,
  );
  deps.burstAt(
    visual.x,
    visual.y + (finishingSweep ? 0.48 : 0.3),
    visual.z,
    color,
    finishingSweep ? 34 : 22,
    Math.max(finishingSweep ? 1 : 0.85, visual.power),
    'sparks',
  );
  deps.playImpactAudio('physical', finishingSweep ? 1.2 : 0.92, visual.x, visual.y, visual.z);
}

/** CircleMoon02 advances through two spear sweeps before releasing its enlarged tail wave. */
function playDragonTailContact(
  deps: Mir4NativeSkillContactPainterDeps,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'sector' }>,
  contactIndex: number,
): void {
  const finishingWave = contactIndex === 2;
  const color = finishingWave ? 0xe9faff : contactIndex === 1 ? 0x8fe7ff : 0x5bc8ff;
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.08;
  deps.slashStyled(
    visual,
    color,
    finishingWave ? 'crescent' : contactIndex === 1 ? 'horizontal' : 'thrust',
    finishingWave ? 4.8 : contactIndex === 1 ? 3.45 : 3.1,
  );
  deps.pathRibbon(
    color,
    finishingWave ? 0.24 : contactIndex === 1 ? 0.17 : 0.14,
    finishingWave ? 0.58 : contactIndex === 1 ? 0.42 : 0.34,
    (points) =>
      fillSectorOutline(
        points,
        visual.x,
        groundY + (finishingWave ? 0.18 : 0.08 + contactIndex * 0.05),
        visual.z,
        visual.facing,
        visual.radiusYards,
        visual.angleDegrees,
      ),
  );
  deps.ringAt(
    visual.x,
    groundY,
    visual.z,
    finishingWave ? 7.2 : contactIndex === 1 ? 3.8 : 3.1,
    finishingWave ? 0.58 : contactIndex === 1 ? 0.4 : 0.32,
    color,
    finishingWave ? 2.8 : contactIndex === 1 ? 2 : 1.6,
    false,
  );
  deps.burstAt(
    visual.x,
    visual.y + (finishingWave ? 0.55 : 0.3 + contactIndex * 0.08),
    visual.z,
    color,
    finishingWave ? 40 : 20 + contactIndex * 6,
    Math.max(finishingWave ? 1.05 : 0.84 + contactIndex * 0.08, visual.power),
    'sparks',
  );
  deps.playImpactAudio(
    'physical',
    finishingWave ? 1.25 : 0.9 + contactIndex * 0.12,
    visual.x,
    visual.y,
    visual.z,
  );
}

/** CircleMoon03 raises three blue-white circular spear spirals four yards ahead. */
function playAscendingDragonContact(
  deps: Mir4NativeSkillContactPainterDeps,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'circle' }>,
  contactIndex: number,
): void {
  const finishingRise = contactIndex === 2;
  const color = finishingRise ? 0xeafcff : contactIndex === 1 ? 0x8de9ff : 0x54c7ff;
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.08;
  deps.slashStyled(
    visual,
    color,
    'vertical',
    finishingRise ? 4.1 : contactIndex === 1 ? 3.55 : 3.15,
  );
  deps.pathRibbon(
    color,
    finishingRise ? 0.21 : contactIndex === 1 ? 0.16 : 0.13,
    finishingRise ? 0.62 : contactIndex === 1 ? 0.46 : 0.36,
    (points) =>
      fillVortexSpiral(
        points,
        visual.x,
        groundY,
        visual.z,
        visual.radiusYards * (finishingRise ? 0.72 : 0.56 + contactIndex * 0.06),
        visual.heightYards * (finishingRise ? 1 : 0.72 + contactIndex * 0.1),
        contactIndex === 1 ? -1 : 1,
      ),
  );
  deps.ringAt(
    visual.x,
    groundY,
    visual.z,
    finishingRise ? visual.radiusYards : visual.radiusYards * (0.68 + contactIndex * 0.1),
    finishingRise ? 0.58 : 0.34 + contactIndex * 0.08,
    color,
    finishingRise ? 2.8 : 1.7 + contactIndex * 0.35,
    false,
  );
  deps.burstAt(
    visual.x,
    visual.y + (finishingRise ? 2.4 : 0.8 + contactIndex * 0.5),
    visual.z,
    color,
    finishingRise ? 38 : 20 + contactIndex * 7,
    Math.max(finishingRise ? 1.05 : 0.86 + contactIndex * 0.07, visual.power),
    'sparks',
  );
  deps.playImpactAudio(
    'physical',
    finishingRise ? 1.25 : 0.9 + contactIndex * 0.12,
    visual.x,
    visual.y,
    visual.z,
  );
}

/** TurnSpear01 crosses the target between two green cuts, then turns back for the finisher. */
function playDoubleStrikeContact(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Mir4SkillPresentationEvent,
  contact: Extract<Mir4NativePresentationContact, { shape: 'direct' }>,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'direct' }>,
  contactIndex: number,
): void {
  const finishingReturn = contactIndex === 2;
  const strikeFacing = event.sourceFacing + (finishingReturn ? Math.PI : 0);
  const color = finishingReturn ? 0xe5ffe9 : contactIndex === 1 ? 0x8df0bd : 0x62e2a4;
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.08;
  deps.slashStyled(
    visual,
    color,
    finishingReturn ? 'vertical' : contactIndex === 1 ? 'horizontal' : 'thrust',
    finishingReturn ? 4.05 : contactIndex === 1 ? 3.45 : 3.1,
  );
  deps.pathRibbon(
    color,
    finishingReturn ? 0.22 : contactIndex === 1 ? 0.17 : 0.14,
    finishingReturn ? 0.54 : contactIndex === 1 ? 0.42 : 0.34,
    (points) =>
      fillPiercingBladeTrail(
        points,
        visual.x,
        groundY + (finishingReturn ? 0.2 : 0.1),
        visual.z,
        strikeFacing,
        contact.reachYards,
        contactIndex === 1 ? -0.18 : finishingReturn ? 0.25 : 0.12,
      ),
  );
  deps.ringAt(
    visual.x,
    groundY,
    visual.z,
    finishingReturn ? 4.4 : contactIndex === 1 ? 3.5 : 3,
    finishingReturn ? 0.52 : contactIndex === 1 ? 0.4 : 0.32,
    color,
    finishingReturn ? 2.7 : contactIndex === 1 ? 2 : 1.6,
    false,
  );
  deps.burstAt(
    visual.x,
    visual.y + (finishingReturn ? 0.65 : 0.3 + contactIndex * 0.1),
    visual.z,
    color,
    finishingReturn ? 38 : 20 + contactIndex * 6,
    Math.max(finishingReturn ? 1.05 : 0.86 + contactIndex * 0.08, visual.power),
    'sparks',
  );
  deps.playImpactAudio(
    'physical',
    finishingReturn ? 1.25 : contactIndex === 1 ? 1.02 : 0.9,
    visual.x,
    visual.y,
    visual.z,
  );
}

/** TurnSpear03 rushes through the target three times, then rises into a bright knockdown slam. */
function playCrushingBlowContact(
  deps: Mir4NativeSkillContactPainterDeps,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'circle' }>,
  contactIndex: number,
): void {
  const finishingSlam = contactIndex === 3;
  const colors = [0x55e89a, 0x78efad, 0x9ff5c1, 0xe8ffde] as const;
  const styles = ['thrust', 'horizontal', 'crescent', 'vertical'] as const;
  const scales = [3.1, 3.35, 3.6, 4.25] as const;
  const audioPowers = [0.9, 0.98, 1.06, 1.3] as const;
  const color = colors[contactIndex] ?? colors[0];
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.08;

  deps.slashStyled(visual, color, styles[contactIndex] ?? 'thrust', scales[contactIndex] ?? 3.1);
  deps.pathRibbon(
    color,
    finishingSlam ? 0.23 : 0.13 + contactIndex * 0.025,
    finishingSlam ? 0.58 : 0.32 + contactIndex * 0.06,
    (points) =>
      fillVortexSpiral(
        points,
        visual.x,
        groundY,
        visual.z,
        visual.radiusYards * (finishingSlam ? 0.88 : 0.48 + contactIndex * 0.1),
        visual.heightYards * (finishingSlam ? 1.05 : 0.42 + contactIndex * 0.12),
        contactIndex % 2 === 0 ? 1 : -1,
      ),
  );
  deps.ringAt(
    visual.x,
    groundY,
    visual.z,
    finishingSlam ? visual.radiusYards : visual.radiusYards * (0.52 + contactIndex * 0.1),
    finishingSlam ? 0.58 : 0.3 + contactIndex * 0.06,
    color,
    finishingSlam ? 2.85 : 1.55 + contactIndex * 0.35,
    false,
  );
  deps.burstAt(
    visual.x,
    visual.y + (finishingSlam ? 1.05 : 0.35 + contactIndex * 0.28),
    visual.z,
    color,
    finishingSlam ? 44 : 18 + contactIndex * 7,
    finishingSlam ? 1.15 : 0.82 + contactIndex * 0.09,
    'sparks',
  );
  deps.playImpactAudio(
    'physical',
    audioPowers[contactIndex] ?? audioPowers[0],
    visual.x,
    visual.y,
    visual.z,
  );
}

/** Tornado_01 opens as a broad shockwave, then tightens into five accelerating spear rotations. */
function playSweepingStormContact(
  deps: Mir4NativeSkillContactPainterDeps,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'circle' }>,
  contactIndex: number,
): void {
  const openingWave = contactIndex === 0;
  const finishingSweep = contactIndex === 5;
  const color = openingWave
    ? 0xffa64d
    : finishingSweep
      ? 0xfff0b2
      : contactIndex % 2 === 0
        ? 0xffcf78
        : 0xffbd61;
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.08;
  const slashStyle = contactIndex % 2 === 0 ? 'horizontal' : 'crescent';
  const slashScale = openingWave
    ? 4.8
    : finishingSweep
      ? 4.1
      : Math.round((2.9 + contactIndex * 0.15) * 100) / 100;
  deps.slashStyled(visual, color, slashStyle, slashScale);
  deps.pathRibbon(
    color,
    openingWave ? 0.23 : finishingSweep ? 0.2 : 0.12 + contactIndex * 0.012,
    openingWave ? 0.5 : finishingSweep ? 0.48 : 0.28 + contactIndex * 0.025,
    (points) =>
      fillCircle(
        points,
        visual.x,
        groundY + (openingWave ? 0.12 : 0.08 + contactIndex * 0.025),
        visual.z,
        visual.radiusYards * (openingWave ? 0.88 : 0.72 + contactIndex * 0.035),
        contactIndex * 0.72,
      ),
  );
  deps.ringAt(
    visual.x,
    groundY,
    visual.z,
    openingWave ? 8.4 : finishingSweep ? 5.5 : 3.4 + contactIndex * 0.32,
    openingWave ? 0.5 : finishingSweep ? 0.52 : 0.28 + contactIndex * 0.035,
    color,
    openingWave ? 2.4 : finishingSweep ? 2.75 : 1.4 + contactIndex * 0.22,
    false,
  );
  deps.burstAt(
    visual.x,
    visual.y + (openingWave ? 0.45 : finishingSweep ? 0.85 : 0.3 + contactIndex * 0.08),
    visual.z,
    color,
    openingWave ? 32 : finishingSweep ? 42 : 16 + contactIndex * 4,
    Math.max(openingWave ? 1 : finishingSweep ? 1.2 : 0.8 + contactIndex * 0.07, visual.power),
    'sparks',
  );
  deps.playImpactAudio(
    'physical',
    openingWave
      ? 1.05
      : finishingSweep
        ? 1.28
        : Math.round((0.84 + contactIndex * 0.06) * 100) / 100,
    visual.x,
    visual.y,
    visual.z,
  );
}

/** Tornado_03 layers five spear rotations into the native ten-by-five-yard forward wind wall. */
function playWindWallContact(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Mir4SkillPresentationEvent,
  contact: Extract<Mir4NativePresentationContact, { shape: 'direct' }>,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'direct' }>,
  contactIndex: number,
): void {
  const colors = [0x66dbe8, 0x72e6dd, 0x8aefe0, 0xb5f7e8, 0xe0fff4] as const;
  const styles = ['horizontal', 'crescent', 'horizontal', 'crescent', 'horizontal'] as const;
  const scales = [3.5, 3.75, 4, 4.35, 4.8] as const;
  const audioPowers = [0.88, 0.96, 1.04, 1.14, 1.28] as const;
  const finishingWall = contactIndex === 4;
  const color = colors[contactIndex] ?? colors[0];
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.08;

  deps.slashStyled(
    visual,
    color,
    styles[contactIndex] ?? 'horizontal',
    scales[contactIndex] ?? 3.5,
  );
  deps.pathRibbon(
    color,
    finishingWall ? 0.24 : 0.13 + contactIndex * 0.02,
    finishingWall ? 0.58 : 0.32 + contactIndex * 0.055,
    (points) =>
      fillWindWallRibbon(
        points,
        visual.x,
        groundY,
        visual.z,
        event.sourceFacing,
        contact.reachYards,
        contact.widthYards,
        contactIndex * 0.82,
      ),
  );
  deps.ringAt(
    visual.x,
    groundY,
    visual.z,
    finishingWall ? 5 : 3.2 + contactIndex * 0.35,
    finishingWall ? 0.56 : 0.3 + contactIndex * 0.045,
    color,
    finishingWall ? 2.8 : 1.45 + contactIndex * 0.3,
    true,
  );
  deps.burstAt(
    visual.x,
    visual.y + (finishingWall ? 0.8 : 0.3 + contactIndex * 0.1),
    visual.z,
    color,
    finishingWall ? 40 : 17 + contactIndex * 5,
    finishingWall ? 1.2 : 0.82 + contactIndex * 0.08,
    'sparks',
  );
  deps.playImpactAudio(
    'physical',
    audioPowers[contactIndex] ?? audioPowers[0],
    visual.x,
    visual.y,
    visual.z,
  );
}

/** CircleMoon04 turns the cross-through dash into one heavy orange-gold kick path. */
function playNirvanaKickContact(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Mir4SkillPresentationEvent,
  contact: Extract<Mir4NativePresentationContact, { shape: 'direct' }>,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'direct' }>,
): void {
  const color = 0xffba55;
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.08;
  deps.slashStyled(visual, color, 'vertical', 3.7);
  deps.pathRibbon(color, 0.2, 0.48, (points) =>
    fillPiercingBladeTrail(
      points,
      visual.x,
      groundY + 0.18,
      visual.z,
      event.sourceFacing,
      contact.reachYards,
      0,
    ),
  );
  deps.ringAt(visual.x, groundY, visual.z, 3.4, 0.52, 0xffd391, 2.65, false);
  deps.burstAt(
    visual.x,
    visual.y + 0.6,
    visual.z,
    color,
    36,
    Math.max(1.05, visual.power),
    'sparks',
  );
  deps.playImpactAudio('physical', 1.25, visual.x, visual.y, visual.z);
}

function playIllusionArrowContact(
  deps: Mir4NativeSkillContactPainterDeps,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'circle' }>,
  contactIndex: number,
): void {
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.05;
  const knockbackWave = contactIndex === 1 || contactIndex === 3;
  const finalWave = contactIndex === 4;
  const gold = finalWave ? 0xffe6a1 : 0xffcc63;
  const illusionBlue = knockbackWave ? 0x68d8ff : 0x7496ff;
  const ringScale = 0.7 + contactIndex * 0.075;
  deps.decalXZ?.(
    visual.x,
    visual.z,
    visual.radiusYards,
    illusionBlue,
    'illusion-arrow',
    finalWave ? 0.42 : 0.3,
  );
  deps.ringAt(
    visual.x,
    groundY,
    visual.z,
    visual.radiusYards * ringScale,
    finalWave ? 0.42 : 0.28,
    illusionBlue,
    knockbackWave ? 2.2 : finalWave ? 2.7 : 1.65,
    false,
  );
  deps.ringAt(
    visual.x,
    groundY + Math.min(visual.heightYards, 4) * 0.28,
    visual.z,
    visual.radiusYards * (0.38 + contactIndex * 0.035),
    finalWave ? 0.38 : 0.24,
    gold,
    finalWave ? 2.5 : 1.45,
    true,
  );
  deps.pathRibbon(illusionBlue, knockbackWave ? 0.1 : 0.075, finalWave ? 0.38 : 0.26, (points) =>
    fillCircle(
      points,
      visual.x,
      groundY + 0.12 + contactIndex * 0.04,
      visual.z,
      visual.radiusYards * (0.46 + contactIndex * 0.055),
      contactIndex * 0.47,
    ),
  );
  deps.pathRibbon(gold, finalWave ? 0.11 : 0.065, finalWave ? 0.36 : 0.24, (points) =>
    fillCircle(
      points,
      visual.x,
      groundY + 0.2,
      visual.z,
      visual.radiusYards * (0.25 + contactIndex * 0.045),
      -contactIndex * 0.61,
    ),
  );
  deps.burstAt(
    visual.x,
    visual.y + (finalWave ? 1.05 : 0.68),
    visual.z,
    finalWave ? gold : illusionBlue,
    finalWave ? 30 : knockbackWave ? 20 : 14,
    Math.max(finalWave ? 1.2 : 0.75, visual.power),
    'sparks',
  );
  deps.playImpactAudio(
    'physical',
    finalWave ? 1.1 : knockbackWave ? 0.92 : 0.72,
    visual.x,
    visual.y,
    visual.z,
  );
}

function playBurstShellContact(
  deps: Mir4NativeSkillContactPainterDeps,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'fixed-circle' }>,
  contactIndex: number,
): void {
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.06;
  const centerBlast = contactIndex === 2;
  const finalBlast = contactIndex === 4;
  const cyan = centerBlast ? 0x9ffff8 : 0x36e4df;
  const gold = finalBlast ? 0xffe19a : 0xffb84f;
  const radiusScale = 0.46 + contactIndex * 0.1;
  deps.decalXZ?.(
    visual.x,
    visual.z,
    visual.radiusYards,
    finalBlast ? gold : cyan,
    'burst-shell-impact',
    finalBlast ? 0.5 : 0.3,
  );
  deps.ringAt(
    visual.x,
    groundY,
    visual.z,
    visual.radiusYards * radiusScale,
    finalBlast ? 0.5 : 0.3,
    cyan,
    centerBlast ? 2.5 : finalBlast ? 3 : 1.8,
    false,
  );
  deps.ringAt(
    visual.x,
    groundY + Math.min(visual.heightYards, 4) * (0.28 + contactIndex * 0.035),
    visual.z,
    visual.radiusYards * (centerBlast ? 0.34 : 0.22),
    finalBlast ? 0.46 : 0.27,
    gold,
    finalBlast ? 2.8 : 1.7,
    true,
  );
  deps.pathRibbon(cyan, centerBlast ? 0.13 : 0.09, finalBlast ? 0.46 : 0.29, (points) =>
    fillVortexSpiral(
      points,
      visual.x,
      groundY,
      visual.z,
      visual.radiusYards * (0.32 + contactIndex * 0.055),
      Math.min(visual.heightYards, 4) * (centerBlast ? 0.95 : 0.68),
      contactIndex % 2 === 0 ? 1 : -1,
    ),
  );
  deps.burstAt(
    visual.x,
    visual.y + (centerBlast ? 1.25 : finalBlast ? 1.05 : 0.72),
    visual.z,
    finalBlast ? gold : cyan,
    finalBlast ? 34 : centerBlast ? 28 : 16,
    Math.max(centerBlast ? 1.2 : finalBlast ? 1.3 : 0.8, visual.power),
    'sparks',
  );
  deps.playImpactAudio(
    'physical',
    finalBlast ? 1.15 : centerBlast ? 1.05 : 0.78,
    visual.x,
    visual.y,
    visual.z,
  );
}

function playVenomMistShellContact(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Mir4SkillPresentationEvent,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'target-circle' | 'fixed-circle' }>,
  contactIndex: number,
): void {
  const direct = visual.shape === 'target-circle';
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.06;
  const alternatingPulse = contactIndex % 2 === 0;
  const color = direct ? 0xb6ed7c : alternatingPulse ? 0x9b75b5 : 0x72c66b;
  const lifetime = direct ? 0.58 : 0.34;
  deps.decalXZ?.(
    visual.x,
    visual.z,
    visual.radiusYards,
    direct ? 0x78b95f : color,
    direct ? 'venom-mist-direct' : 'venom-mist-pulse',
    lifetime,
  );
  deps.ringAt(
    visual.x,
    groundY,
    visual.z,
    visual.radiusYards * (direct ? 0.74 : 0.82),
    lifetime,
    color,
    direct ? 2.1 : 1.25,
    false,
  );
  deps.pathRibbon(color, direct ? 0.09 : 0.055, lifetime, (points) =>
    fillCircle(
      points,
      visual.x,
      groundY + (direct ? 0.16 : 0.08),
      visual.z,
      visual.radiusYards * (direct ? 0.42 : 0.58),
      contactIndex * 0.43,
    ),
  );
  if (direct) deps.impactRing(event.targetId, 0xa7e36b, true);
  deps.burstAt(
    visual.x,
    visual.y + (direct ? 0.75 : 0.45),
    visual.z,
    color,
    direct ? 26 : 14,
    direct ? 1.1 : 0.72,
    'sparks',
  );
  deps.playImpactAudio('shadow', direct ? 1 : 0.58, visual.x, visual.y, visual.z);
}

function playFlashArrowContact(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Mir4SkillPresentationEvent,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'target-circle' | 'fixed-circle' }>,
  contactIndex: number,
): void {
  const direct = visual.shape === 'target-circle';
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.07;
  const color = direct ? 0xfff4bd : contactIndex % 2 === 0 ? 0xcaf8ff : 0x83e8ff;
  deps.decalXZ?.(
    visual.x,
    visual.z,
    visual.radiusYards,
    color,
    direct ? 'flash-arrow-impact' : 'flash-arrow-pulse',
    direct ? 0.7 : 0.42,
  );
  deps.ringAt(
    visual.x,
    groundY,
    visual.z,
    visual.radiusYards,
    direct ? 0.7 : 0.42,
    color,
    direct ? 2.8 : 1.55,
    false,
  );
  deps.ringAt(
    visual.x,
    groundY + Math.min(visual.heightYards, 3) * 0.42,
    visual.z,
    visual.radiusYards * (direct ? 0.34 : 0.22),
    direct ? 0.62 : 0.36,
    direct ? 0xffffff : 0xffe8a8,
    direct ? 2.55 : 1.5,
    true,
  );
  deps.pathRibbon(color, direct ? 0.12 : 0.07, direct ? 0.62 : 0.34, (points) =>
    fillCircle(points, visual.x, groundY + 0.12, visual.z, visual.radiusYards * 0.7, contactIndex),
  );
  if (direct) deps.impactRing(event.targetId, 0xffefad, true);
  deps.burstAt(
    visual.x,
    visual.y + (direct ? 0.9 : 0.55),
    visual.z,
    color,
    direct ? 30 : 14,
    direct ? 1.2 : 0.7,
    'sparks',
  );
  deps.playImpactAudio('physical', direct ? 1.05 : 0.58, visual.x, visual.y, visual.z);
}

function playIceCageContact(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Mir4SkillPresentationEvent,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'target-circle' | 'fixed-circle' }>,
  contactIndex: number,
): void {
  const direct = visual.shape === 'target-circle';
  const finalPulse = contactIndex === 7;
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.06;
  const color = direct ? 0xe8fbff : finalPulse ? 0xffffff : 0x8de8ff;
  const lifetime = direct || finalPulse ? 0.72 : 0.42;
  deps.decalXZ?.(
    visual.x,
    visual.z,
    visual.radiusYards,
    color,
    direct ? 'ice-cage-direct' : finalPulse ? 'ice-cage-shatter' : 'ice-cage-pulse',
    lifetime,
  );
  deps.ringAt(
    visual.x,
    groundY,
    visual.z,
    visual.radiusYards,
    lifetime,
    color,
    direct || finalPulse ? 2.6 : 1.65,
    false,
  );
  for (let shard = 0; shard < (direct || finalPulse ? 8 : 5); shard += 1) {
    const angle = (Math.PI * 2 * shard) / (direct || finalPulse ? 8 : 5) + contactIndex * 0.31;
    const radius = visual.radiusYards * (direct ? 0.62 : 0.48);
    const x = visual.x + Math.cos(angle) * radius;
    const z = visual.z + Math.sin(angle) * radius;
    deps.pathRibbon(color, direct ? 0.1 : 0.065, lifetime, (points) =>
      fillFallingBlade(
        points,
        x,
        groundY + 0.05,
        z,
        Math.min(visual.heightYards, 3) + (finalPulse ? 1.5 : 0.7),
        -Math.cos(angle) * 0.08,
        -Math.sin(angle) * 0.08,
      ),
    );
  }
  if (direct) deps.impactRing(event.targetId, 0xdffaff, true);
  deps.burstAt(
    visual.x,
    visual.y + (direct || finalPulse ? 0.9 : 0.5),
    visual.z,
    color,
    direct || finalPulse ? 30 : 16,
    direct || finalPulse ? 1.1 : 0.72,
    'sparks',
  );
  deps.playImpactAudio('magic', direct || finalPulse ? 1.05 : 0.62, visual.x, visual.y, visual.z);
}

function playHeavenlyBowContact(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Mir4SkillPresentationEvent,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'target-circle' | 'fixed-circle' }>,
  contactIndex: number,
): void {
  const direct = visual.shape === 'target-circle';
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.06;
  const color = direct ? 0xffe293 : contactIndex % 2 === 0 ? 0xaeeeff : 0x72cfff;
  const lifetime = direct ? 0.7 : 0.5;
  deps.decalXZ?.(
    visual.x,
    visual.z,
    visual.radiusYards,
    color,
    direct ? 'heavenly-bow-direct' : 'heavenly-bow-rain',
    lifetime,
  );
  deps.ringAt(
    visual.x,
    groundY,
    visual.z,
    visual.radiusYards,
    lifetime,
    color,
    direct ? 2.7 : 1.8,
    false,
  );
  for (let ray = 0; ray < (direct ? 5 : 8); ray += 1) {
    const angle = (Math.PI * 2 * ray) / (direct ? 5 : 8) + contactIndex * 0.39;
    const radius = visual.radiusYards * (0.2 + (ray % 4) * 0.17);
    const x = visual.x + Math.cos(angle) * radius;
    const z = visual.z + Math.sin(angle) * radius;
    deps.pathRibbon(color, direct ? 0.1 : 0.065, lifetime, (points) =>
      fillFallingBlade(
        points,
        x,
        groundY + 0.08,
        z,
        Math.min(visual.heightYards, 4) + 1.8,
        -Math.cos(angle) * 0.15,
        -Math.sin(angle) * 0.15,
      ),
    );
  }
  if (direct) deps.impactRing(event.targetId, 0xffdf80, true);
  deps.burstAt(
    visual.x,
    visual.y + (direct ? 0.9 : 0.45),
    visual.z,
    color,
    direct ? 30 : 22,
    direct ? 1.15 : 0.85,
    'sparks',
  );
  deps.playImpactAudio('physical', direct ? 1.08 : 0.72, visual.x, visual.y, visual.z);
}

function playCloakingContact(
  deps: Mir4NativeSkillContactPainterDeps,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'fixed-circle' }>,
): void {
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.08;
  deps.decalXZ?.(visual.x, visual.z, visual.radiusYards, 0xb8a2d9, 'cloaking-impact', 0.5);
  deps.ringAt(visual.x, groundY, visual.z, visual.radiusYards, 0.5, 0xd9cced, 2.25, false);
  deps.pathRibbon(0xb8a2d9, 0.11, 0.5, (points) =>
    fillVortexSpiral(
      points,
      visual.x,
      groundY,
      visual.z,
      visual.radiusYards * 0.9,
      Math.min(visual.heightYards, 5) * 0.72,
      -1,
    ),
  );
  deps.burstAt(visual.x, visual.y + 0.75, visual.z, 0xd9cced, 28, 1.05, 'sparks');
  deps.playImpactAudio('physical', 0.92, visual.x, visual.y, visual.z);
}

function playArrowRainContact(
  deps: Mir4NativeSkillContactPainterDeps,
  visual: Extract<Mir4NativePresentationContactVisual, { shape: 'sector' }>,
  contactIndex: number,
): void {
  const groundY = deps.groundYAt(visual.x, visual.z) + 0.08;
  const color = contactIndex === 4 ? 0xd8f5ff : contactIndex >= 2 ? 0x8fdcff : 0x5fb7ea;
  deps.pathRibbon(color, 0.075 + contactIndex * 0.008, 0.32 + contactIndex * 0.04, (points) =>
    fillSectorOutline(
      points,
      visual.x,
      groundY,
      visual.z,
      visual.facing,
      visual.radiusYards,
      visual.angleDegrees,
    ),
  );

  const radialFractions = [0.34, 0.47, 0.58, 0.69, 0.78, 0.87, 0.95] as const;
  const lateralFractions = [-0.72, 0.38, -0.16, 0.69, -0.46, 0.08, 0.84] as const;
  const halfAngle = (visual.angleDegrees * Math.PI) / 360;
  for (let index = 0; index < radialFractions.length; index += 1) {
    const angle = visual.facing + halfAngle * lateralFractions[index];
    const radius = visual.radiusYards * radialFractions[index];
    const x = visual.x + Math.sin(angle) * radius;
    const z = visual.z + Math.cos(angle) * radius;
    const arrowGroundY = deps.groundYAt(x, z) + 0.08;
    const lifetime = 0.24 + index * 0.018 + contactIndex * 0.012;
    deps.pathRibbon(color, 0.075 + contactIndex * 0.01, lifetime, (points) =>
      fillFallingBlade(
        points,
        x,
        arrowGroundY,
        z,
        Math.min(visual.heightYards, 4) + 2.2 + index * 0.12,
        -Math.sin(angle) * 0.22,
        -Math.cos(angle) * 0.22,
      ),
    );
    deps.burstAt(
      x,
      arrowGroundY + 0.18,
      z,
      color,
      8 + contactIndex * 2,
      0.58 + contactIndex * 0.1,
      'sparks',
    );
  }
  deps.playImpactAudio('physical', 0.95 + contactIndex * 0.05, visual.x, visual.y, visual.z);
}

/** Paint one native contact without allowing renderer orchestration to own skill-specific logic. */
export function playMir4NativeSkillContact(
  deps: Mir4NativeSkillContactPainterDeps,
  event: Mir4SkillPresentationEvent,
  _contact: Mir4NativePresentationContact,
  visual: Mir4NativePresentationContactVisual,
  contactIndex: number,
): void {
  if (event.profile === 'arbalist-arrow-rain' && visual.shape === 'sector') {
    playArrowRainContact(deps, visual, contactIndex);
    return;
  }
  if (event.profile === 'lancer-crescent-blade' && visual.shape === 'sector') {
    playCrescentBladeContact(deps, visual, contactIndex);
    return;
  }
  if (event.profile === 'lancer-dragon-tail' && visual.shape === 'sector') {
    playDragonTailContact(deps, visual, contactIndex);
    return;
  }
  if (event.profile === 'lancer-ascending-dragon' && visual.shape === 'circle') {
    playAscendingDragonContact(deps, visual, contactIndex);
    return;
  }
  if (
    event.profile === 'lancer-nirvana-kick' &&
    _contact.shape === 'direct' &&
    visual.shape === 'direct'
  ) {
    playNirvanaKickContact(deps, event, _contact, visual);
    return;
  }
  if (
    event.profile === 'lancer-double-strike' &&
    _contact.shape === 'direct' &&
    visual.shape === 'direct'
  ) {
    playDoubleStrikeContact(deps, event, _contact, visual, contactIndex);
    return;
  }
  if (event.profile === 'lancer-sweeping-storm' && visual.shape === 'circle') {
    playSweepingStormContact(deps, visual, contactIndex);
    return;
  }
  if (
    event.profile === 'lancer-wind-wall' &&
    _contact.shape === 'direct' &&
    visual.shape === 'direct'
  ) {
    playWindWallContact(deps, event, _contact, visual, contactIndex);
    return;
  }
  if (event.profile === 'lancer-crushing-blow' && visual.shape === 'circle') {
    playCrushingBlowContact(deps, visual, contactIndex);
    return;
  }
  if (event.profile === 'lancer-absorption' && visual.shape === 'target-circle') {
    playAbsorptionContact(deps, event, visual);
    return;
  }
  if (
    event.profile === 'lancer-ravaging-blow' &&
    _contact.shape === 'direct' &&
    visual.shape === 'direct'
  ) {
    playRavagingBlowContact(deps, event, _contact, visual, contactIndex);
    return;
  }
  if (
    event.profile === 'lancer-blitz-strike' &&
    _contact.shape === 'direct' &&
    visual.shape === 'direct'
  ) {
    playBlitzStrikeContact(deps, event, _contact, visual);
    return;
  }
  if (
    event.profile === 'lancer-dragon-spear' &&
    _contact.shape === 'direct' &&
    visual.shape === 'direct'
  ) {
    playDragonSpearContact(deps, event, _contact, visual);
    return;
  }
  if (
    event.profile === 'lancer-piercing-spear' &&
    _contact.shape === 'direct' &&
    visual.shape === 'direct'
  ) {
    playPiercingSpearContact(deps, event, _contact, visual, contactIndex);
    return;
  }
  if (event.profile === 'arbalist-painstrike-gale' && visual.shape === 'direct') {
    playPainstrikeGaleContact(deps, visual);
    return;
  }
  if (event.profile === 'arbalist-obliterate-shell' && visual.shape === 'direct') {
    playObliterateShellContact(deps, event, _contact, visual);
    return;
  }
  if (event.profile === 'arbalist-quick-shot' && visual.shape === 'circle') {
    playQuickShotContact(deps, event, visual, contactIndex);
    return;
  }
  if (event.profile === 'arbalist-illusion-arrow' && visual.shape === 'circle') {
    playIllusionArrowContact(deps, visual, contactIndex);
    return;
  }
  if (event.profile === 'arbalist-burst-shell' && visual.shape === 'fixed-circle') {
    playBurstShellContact(deps, visual, contactIndex);
    return;
  }
  if (
    event.profile === 'arbalist-venom-mist-shell' &&
    (visual.shape === 'target-circle' || visual.shape === 'fixed-circle')
  ) {
    playVenomMistShellContact(deps, event, visual, contactIndex);
    return;
  }
  if (
    event.profile === 'arbalist-ice-cage' &&
    (visual.shape === 'target-circle' || visual.shape === 'fixed-circle')
  ) {
    playIceCageContact(deps, event, visual, contactIndex);
    return;
  }
  if (
    event.profile === 'arbalist-flash-arrow' &&
    (visual.shape === 'target-circle' || visual.shape === 'fixed-circle')
  ) {
    playFlashArrowContact(deps, event, visual, contactIndex);
    return;
  }
  if (
    event.profile === 'arbalist-heavenly-bow' &&
    (visual.shape === 'target-circle' || visual.shape === 'fixed-circle')
  ) {
    playHeavenlyBowContact(deps, event, visual, contactIndex);
    return;
  }
  if (event.profile === 'arbalist-seeking-bolt' && visual.shape === 'target-circle') {
    playSeekingBoltContact(deps, event, visual);
    return;
  }
  if (event.profile === 'arbalist-minds-eye' && visual.shape === 'circle') {
    playMindsEyeContact(deps, visual);
    return;
  }
  if (event.profile === 'arbalist-cloaking' && visual.shape === 'fixed-circle') {
    playCloakingContact(deps, visual);
    return;
  }
  if (
    event.profile === 'taoist-light-ray' &&
    _contact.shape === 'direct' &&
    visual.shape === 'direct'
  ) {
    playLightRayContact(deps, event, _contact, visual, contactIndex);
    return;
  }
  if (event.profile === 'taoist-sunbeam-sword' && visual.shape === 'direct') {
    playSunbeamSwordContact(deps, event, visual, contactIndex);
    return;
  }
  if (
    event.profile === 'taoist-piercing-blades' &&
    _contact.shape === 'direct' &&
    visual.shape === 'direct'
  ) {
    playPiercingBladesContact(deps, event, _contact, visual, contactIndex);
    return;
  }
  if (
    event.profile === 'taoist-soaring-slash' &&
    _contact.shape === 'direct' &&
    visual.shape === 'direct'
  ) {
    playSoaringSlashContact(deps, event, _contact, visual, contactIndex);
    return;
  }
  if (event.profile === 'taoist-heal' && visual.shape === 'circle') {
    playHealContact(deps, visual, contactIndex);
    return;
  }
  if (event.profile === 'taoist-greater-heal' && visual.shape === 'circle') {
    playGreaterHealContact(deps, visual, contactIndex);
    return;
  }
  if (event.profile === 'taoist-guardian-circle' && visual.shape === 'circle') {
    playGuardianCircleContact(deps, visual, contactIndex);
    return;
  }
  if (event.profile === 'taoist-expulsion-circle' && visual.shape === 'circle') {
    playExpulsionCircleContact(deps, visual);
    return;
  }
  if (event.profile === 'taoist-tai-chi' && visual.shape === 'circle') {
    playTaiChiContact(deps, visual, contactIndex);
    return;
  }
  if (event.profile === 'sorcerer-chain-lightning' && visual.shape === 'chain') {
    playChainLightningContact(deps, event, visual, contactIndex);
    return;
  }
  if (event.profile === 'sorcerer-flame-strike' && visual.shape === 'circle') {
    playFlameStrikeContact(deps, event, visual, contactIndex);
    return;
  }
  if (event.profile === 'sorcerer-magic-shield' && visual.shape === 'circle') {
    playMagicShieldContact(deps, visual, contactIndex);
    return;
  }
  if (event.profile === 'sorcerer-frozen-block' && visual.shape === 'circle') {
    playFrozenBlockContact(deps, visual, contactIndex);
    return;
  }
  if (
    event.profile === 'sorcerer-blizzard' &&
    (visual.shape === 'target-circle' || visual.shape === 'fixed-circle')
  ) {
    playBlizzardContact(deps, visual, contactIndex);
    return;
  }
  if (event.profile === 'sorcerer-thunderstorm' && visual.shape === 'fixed-circle') {
    playThunderstormContact(deps, _contact, visual, contactIndex);
    return;
  }
  if (
    event.profile === 'taoist-rain-of-blades' &&
    (visual.shape === 'target-circle' || visual.shape === 'fixed-circle')
  ) {
    playRainOfBladesContact(deps, event, visual, contactIndex);
    return;
  }
  if (
    event.profile === 'taoist-moonlight-orb' &&
    (visual.shape === 'target-circle' || visual.shape === 'fixed-circle')
  ) {
    playMoonlightOrbContact(deps, visual, contactIndex);
    return;
  }
  if (
    event.profile === 'taoist-moonlight-wave' &&
    (visual.shape === 'target-circle' || visual.shape === 'fixed-circle')
  ) {
    playMoonlightWaveContact(deps, visual, contactIndex);
    return;
  }
  if (
    event.profile === 'sorcerer-dark-vortex' &&
    (visual.shape === 'target-circle' || visual.shape === 'fixed-circle')
  ) {
    playDarkVortexContact(deps, visual, contactIndex);
    return;
  }
  if (event.profile === 'sorcerer-dragon-tornado' && visual.shape === 'fixed-circle') {
    playDragonTornadoContact(deps, visual, contactIndex);
    return;
  }
  if (event.profile === 'sorcerer-flame-orb' && visual.shape === 'target-circle') {
    playFlameOrbContact(deps, event, visual);
    return;
  }
  if (event.profile === 'sorcerer-frost-orb' && visual.shape === 'target-circle') {
    playMagicMissileContact(deps, event, visual);
    return;
  }
  if (event.profile === 'taoist-blasting-charm' && visual.shape === 'target-circle') {
    playBlastingCharmContact(deps, event, visual);
    return;
  }
  if (event.profile === 'warrior-overdrive' && visual.shape === 'circle') {
    playOverDriveContact(deps, visual, contactIndex);
    return;
  }
  if (event.profile === 'warrior-iron-shackle' && visual.shape === 'circle') {
    playIronShackleContact(deps, event, visual, contactIndex);
    return;
  }
  if (event.profile === 'warrior-dragon-flame' && visual.shape === 'circle') {
    playDragonFlameContact(deps, event, visual, contactIndex);
    return;
  }
  if (event.profile !== 'warrior-air-slash' || visual.shape !== 'direct') return;
  const color = contactIndex === event.contacts.length - 1 ? 0xf7fbff : 0xd7e7ff;
  deps.slashStyled(visual, color, 'horizontal', visual.slashScale);
  deps.burstAt(
    visual.x,
    visual.y,
    visual.z,
    color,
    contactIndex === event.contacts.length - 1 ? 16 : 10,
    visual.power,
    'sparks',
  );
  deps.playImpactAudio('physical', visual.power, visual.x, visual.y, visual.z);
}
