import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { mir4NativeGeneratedMechanicalRow } from './native_skill_generated_contract';
import { mir4NativeDistanceToYards } from './native_skill_units';

export interface Mir4NativeRuntimeProjectilePolicy {
  readonly skillId: number;
  readonly attackId: number;
  readonly bulletType: 1 | 2;
  readonly moveType: 1 | 3;
  readonly count: 1;
  readonly nativeSpeed: number;
  readonly travelSpeedYardsPerSecond: number;
  readonly lifetimeMs: number;
  readonly socketName: string;
  /** Animation-relative notify that releases the projectile row. */
  readonly releaseOffsetMs: number;
  readonly launchGapMs: number;
  readonly effectId: number;
  readonly effectScale: number;
  readonly curveData: string;
  readonly speedData: string;
  readonly rotationOffset: Readonly<{ x: number; y: number; z: number }>;
  readonly angleSpeed: number;
  readonly curveTimeMs: number;
  readonly nativeHeight: number;
  /** Aeldrune runtime interpretation of the reviewed targeted move-type-1 row. */
  readonly movement: 'target-homing' | 'target-curve';
  /** Projectile presentation never shifts the native damage row's authored contact time. */
  readonly authoritativeContact: 'authored-attack-row';
}

const FROST_ORB_PROJECTILE = Object.freeze({
  skillId: 2111,
  attackId: 211101,
  bulletType: 1 as const,
  moveType: 1 as const,
  count: 1 as const,
  nativeSpeed: 4000,
  travelSpeedYardsPerSecond: mir4NativeDistanceToYards(4000),
  lifetimeMs: 2000,
  socketName: 'head',
  releaseOffsetMs: 574,
  launchGapMs: 0,
  effectId: 2040032,
  effectScale: 1,
  curveData: '0',
  speedData: '0',
  rotationOffset: Object.freeze({ x: 0, y: 0, z: 0 }),
  angleSpeed: 0,
  curveTimeMs: 0,
  nativeHeight: 0,
  movement: 'target-homing' as const,
  authoritativeContact: 'authored-attack-row' as const,
}) satisfies Mir4NativeRuntimeProjectilePolicy;

const FLAME_ORB_PROJECTILE = Object.freeze({
  skillId: 2101,
  attackId: 210101,
  bulletType: 1 as const,
  moveType: 1 as const,
  count: 1 as const,
  nativeSpeed: 4000,
  travelSpeedYardsPerSecond: mir4NativeDistanceToYards(4000),
  lifetimeMs: 2000,
  socketName: 'Hand_L',
  releaseOffsetMs: 530,
  launchGapMs: 0,
  effectId: 2040003,
  effectScale: 1,
  curveData: '0',
  speedData: '0',
  rotationOffset: Object.freeze({ x: 0, y: 0, z: 0 }),
  angleSpeed: 0,
  curveTimeMs: 0,
  nativeHeight: 0,
  movement: 'target-homing' as const,
  authoritativeContact: 'authored-attack-row' as const,
}) satisfies Mir4NativeRuntimeProjectilePolicy;

const SOUL_DEVOUR_PROJECTILE = Object.freeze({
  skillId: 2502,
  attackId: 250201,
  bulletType: 1 as const,
  moveType: 1 as const,
  count: 1 as const,
  nativeSpeed: 4000,
  travelSpeedYardsPerSecond: mir4NativeDistanceToYards(4000),
  lifetimeMs: 2000,
  socketName: 'Hand_L',
  releaseOffsetMs: 800,
  launchGapMs: 0,
  effectId: 2040045,
  effectScale: 1,
  curveData: "ParticleSystem'/Game/Blueprint/Projectile/MissileCurve/MissileCurve01.MissileCurve01",
  speedData: '0',
  rotationOffset: Object.freeze({ x: 0, y: 0, z: 0 }),
  angleSpeed: 0,
  curveTimeMs: 0,
  nativeHeight: 0,
  movement: 'target-homing' as const,
  authoritativeContact: 'authored-attack-row' as const,
}) satisfies Mir4NativeRuntimeProjectilePolicy;

const HEAL_PROJECTILE = Object.freeze({
  skillId: 3503,
  attackId: 350302,
  bulletType: 2 as const,
  moveType: 1 as const,
  count: 1 as const,
  nativeSpeed: 4000,
  travelSpeedYardsPerSecond: mir4NativeDistanceToYards(4000),
  lifetimeMs: 2000,
  socketName: 'Buff_Mid',
  releaseOffsetMs: 590,
  launchGapMs: 0,
  effectId: 2040033,
  effectScale: 1,
  curveData: "ParticleSystem'/Game/Blueprint/Projectile/MissileCurve/MissileCurve01.MissileCurve01",
  speedData: '0',
  rotationOffset: Object.freeze({ x: 0, y: 0, z: 0 }),
  angleSpeed: 0,
  curveTimeMs: 0,
  nativeHeight: 0,
  movement: 'target-homing' as const,
  authoritativeContact: 'authored-attack-row' as const,
}) satisfies Mir4NativeRuntimeProjectilePolicy;

const BLASTING_CHARM_PROJECTILE = Object.freeze({
  skillId: 3505,
  attackId: 350501,
  bulletType: 1 as const,
  moveType: 1 as const,
  count: 1 as const,
  nativeSpeed: 4000,
  travelSpeedYardsPerSecond: mir4NativeDistanceToYards(4000),
  lifetimeMs: 2000,
  socketName: 'Hand_L',
  releaseOffsetMs: 830,
  launchGapMs: 0,
  effectId: 2040034,
  effectScale: 1,
  curveData: "ParticleSystem'/Game/Blueprint/Projectile/MissileCurve/MissileCurve01.MissileCurve01",
  speedData: '0',
  rotationOffset: Object.freeze({ x: 0, y: 0, z: 0 }),
  angleSpeed: 0,
  curveTimeMs: 0,
  nativeHeight: 0,
  movement: 'target-homing' as const,
  authoritativeContact: 'authored-attack-row' as const,
}) satisfies Mir4NativeRuntimeProjectilePolicy;

const FLASH_ARROW_PROJECTILE = Object.freeze({
  skillId: 4107,
  attackId: 410701,
  bulletType: 1 as const,
  moveType: 1 as const,
  count: 1 as const,
  nativeSpeed: 4000,
  travelSpeedYardsPerSecond: mir4NativeDistanceToYards(4000),
  lifetimeMs: 2000,
  socketName: 'Hand_L',
  releaseOffsetMs: 450,
  launchGapMs: 0,
  effectId: 2040071,
  effectScale: 1,
  curveData: "ParticleSystem'/Game/Blueprint/Projectile/MissileCurve/MissileCurve01.MissileCurve01",
  speedData: '0',
  rotationOffset: Object.freeze({ x: 0, y: 0, z: 0 }),
  angleSpeed: 0,
  curveTimeMs: 0,
  nativeHeight: 0,
  movement: 'target-homing' as const,
  authoritativeContact: 'authored-attack-row' as const,
}) satisfies Mir4NativeRuntimeProjectilePolicy;

const ICE_CAGE_PROJECTILE = Object.freeze({
  skillId: 4105,
  attackId: 410501,
  bulletType: 1 as const,
  moveType: 1 as const,
  count: 1 as const,
  nativeSpeed: 3000,
  travelSpeedYardsPerSecond: mir4NativeDistanceToYards(3000),
  lifetimeMs: 340,
  socketName: 'Hand_R',
  releaseOffsetMs: 560,
  launchGapMs: 0,
  effectId: 2040073,
  effectScale: 1,
  curveData: '0',
  speedData: '0',
  rotationOffset: Object.freeze({ x: 0, y: 0, z: 0 }),
  angleSpeed: 0,
  curveTimeMs: 0,
  nativeHeight: 0,
  movement: 'target-homing' as const,
  authoritativeContact: 'authored-attack-row' as const,
}) satisfies Mir4NativeRuntimeProjectilePolicy;

const VENOM_MIST_SHELL_PROJECTILE = Object.freeze({
  skillId: 4104,
  attackId: 410401,
  bulletType: 1 as const,
  moveType: 3 as const,
  count: 1 as const,
  nativeSpeed: 1200,
  travelSpeedYardsPerSecond: mir4NativeDistanceToYards(1200),
  lifetimeMs: 700,
  socketName: 'Hand_L',
  releaseOffsetMs: 220,
  launchGapMs: 0,
  effectId: 2040069,
  effectScale: 1,
  curveData: "ParticleSystem'/Game/Blueprint/Projectile/MissileCurve/MissileCurve02.MissileCurve02",
  speedData: '0',
  rotationOffset: Object.freeze({ x: 0, y: 0, z: 0 }),
  angleSpeed: 0,
  curveTimeMs: 850,
  nativeHeight: 250,
  movement: 'target-curve' as const,
  authoritativeContact: 'authored-attack-row' as const,
}) satisfies Mir4NativeRuntimeProjectilePolicy;

const SEEKING_BOLT_PROJECTILE = Object.freeze({
  skillId: 4110,
  attackId: 411001,
  bulletType: 1 as const,
  moveType: 1 as const,
  count: 1 as const,
  nativeSpeed: 4800,
  travelSpeedYardsPerSecond: mir4NativeDistanceToYards(4800),
  lifetimeMs: 2000,
  socketName: 'Hand_R',
  releaseOffsetMs: 1000,
  launchGapMs: 0,
  effectId: 2040070,
  effectScale: 1,
  curveData: "ParticleSystem'/Game/Blueprint/Projectile/MissileCurve/MissileCurve01.MissileCurve01",
  speedData: '0',
  rotationOffset: Object.freeze({ x: 0, y: 0, z: 0 }),
  angleSpeed: 0,
  curveTimeMs: 0,
  nativeHeight: 0,
  movement: 'target-homing' as const,
  authoritativeContact: 'authored-attack-row' as const,
}) satisfies Mir4NativeRuntimeProjectilePolicy;

const REVIEWED_PROJECTILES: readonly Mir4NativeRuntimeProjectilePolicy[] = Object.freeze([
  FLAME_ORB_PROJECTILE,
  FROST_ORB_PROJECTILE,
  SOUL_DEVOUR_PROJECTILE,
  HEAL_PROJECTILE,
  BLASTING_CHARM_PROJECTILE,
  VENOM_MIST_SHELL_PROJECTILE,
  SEEKING_BOLT_PROJECTILE,
  ICE_CAGE_PROJECTILE,
  FLASH_ARROW_PROJECTILE,
]);

export function mir4NativeProjectileMatchesPolicy(
  row: Mir4NativeSkillAttackRow,
  policy: Mir4NativeRuntimeProjectilePolicy,
): boolean {
  const projectile = row.nativeBehavior.projectile;
  return (
    row.attackId === policy.attackId &&
    projectile !== null &&
    projectile.bulletType === policy.bulletType &&
    projectile.moveType === policy.moveType &&
    projectile.count === policy.count &&
    projectile.speed === policy.nativeSpeed &&
    projectile.lifetime * 1000 === policy.lifetimeMs &&
    projectile.socketName === policy.socketName &&
    row.impactOffsetsMs.length === 1 &&
    row.impactOffsetsMs[0] === policy.releaseOffsetMs &&
    projectile.launchGapDelay * 1000 === policy.launchGapMs &&
    projectile.effectId === policy.effectId &&
    projectile.effectScale === policy.effectScale &&
    projectile.curveData === policy.curveData &&
    projectile.speedData === policy.speedData &&
    projectile.rotationOffset.x === policy.rotationOffset.x &&
    projectile.rotationOffset.y === policy.rotationOffset.y &&
    projectile.rotationOffset.z === policy.rotationOffset.z &&
    projectile.angleSpeed === policy.angleSpeed &&
    projectile.curveTime * 1000 === policy.curveTimeMs &&
    projectile.nativeHeight === policy.nativeHeight &&
    policy.travelSpeedYardsPerSecond === mir4NativeDistanceToYards(projectile.speed)
  );
}

export function mir4NativeRuntimeProjectilePolicy(
  skillId: number,
  attackId: number,
): Mir4NativeRuntimeProjectilePolicy | null {
  const expected =
    REVIEWED_PROJECTILES.find(
      (candidate) => candidate.skillId === skillId && candidate.attackId === attackId,
    ) ?? null;
  if (!expected) return null;

  const row = mir4NativeGeneratedMechanicalRow(skillId, attackId);
  return row && mir4NativeProjectileMatchesPolicy(row, expected) ? expected : null;
}
