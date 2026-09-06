// Warrior/kobold batch of the large-scale animation authoring initiative
// (issue #2889): a bespoke warrior movement clip (Heroic Leap) plus six more
// attackByAbility entries added to the class's existing extensive coverage,
// each verified to actually reach CharacterVisual.playAttack at runtime (see
// scripts/build_warrior_ability_anims.mjs's header for the render-dispatch
// trace: whirlwind/bladestorm/storm_bolt/the six castFx:'shout' abilities are
// deliberately left out because no attackByAbility entry for them is ever
// read), plus the kobold family's own attack clip off the ENEMY7-sharing
// goblin.glb. Authored by pose-sample-and-blend (scripts/anim/pose_blend.mjs,
// scripts/build_warrior_ability_anims.mjs, scripts/build_kobold_anims.mjs),
// the same technique documented in
// .claude/skills/blender-anim-pipeline/SKILL.md. Follows the shipped-GLB-
// plus-manifest-source contract test pattern (tests/anim_pipeline_batch1.test.ts).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { describe, expect, it, vi } from 'vitest';
import type { AbilityVfxDeps } from '../src/render/ability_vfx/painter';
import { AbilityVfx } from '../src/render/ability_vfx/painter';
import { ABILITIES } from '../src/sim/data';

const ROOT = join(__dirname, '..');

function clipNamesOf(glbPath: string): string[] {
  const glb = readFileSync(join(ROOT, glbPath));
  const jsonLen = glb.readUInt32LE(12);
  const doc = JSON.parse(glb.subarray(20, 20 + jsonLen).toString('utf8'));
  return (doc.animations ?? []).map((a: { name?: string }) => a.name);
}

function meshCountOf(glbPath: string): number {
  const glb = readFileSync(join(ROOT, glbPath));
  const jsonLen = glb.readUInt32LE(12);
  const doc = JSON.parse(glb.subarray(20, 20 + jsonLen).toString('utf8'));
  return (doc.meshes ?? []).length;
}

const MANIFEST_SRC = readFileSync(
  join(ROOT, 'src/render/characters/manifest.ts'),
  'utf8',
);

function manifestBlock(startAnchor: string, endAnchor: string): string {
  const start = MANIFEST_SRC.indexOf(startAnchor);
  expect(start, startAnchor).toBeGreaterThanOrEqual(0);
  const end = MANIFEST_SRC.indexOf(endAnchor, start);
  expect(end, `${startAnchor} .. ${endAnchor}`).toBeGreaterThan(start);
  return MANIFEST_SRC.slice(start, end);
}

describe('warrior bespoke movement clip (issue #2889 warrior/kobold batch)', () => {
  const WARRIOR_NEW_CLIPS = [
    'Warrior_Heroic_Leap',
    'Warrior_Mir4_AirSlash',
    'Warrior_Mir4_UnbreakableStance',
  ];
  const WARRIOR_NATIVE_CUTTER_CLIP = 'Warrior_Mir4_Cutter_Native';
  const WARRIOR_NATIVE_RIPOSTE_CLIP = 'Warrior_Mir4_Riposte_Native';
  const WARRIOR_NATIVE_IRON_SHACKLE_CLIP = 'Warrior_Mir4_Iron_Shackle_Native';
  const WARRIOR_NATIVE_OVERDRIVE_CLIP = 'Warrior_Mir4_OverDrive_Native';
  const WARRIOR_NATIVE_DRAGON_FLAME_CLIP = 'Warrior_Mir4_DragonFlame_Native';

  it('ships the new clip in a mesh-free donor GLB', () => {
    const glbPath = 'public/models/chars/players/warrior_ability_anims.glb';
    expect(clipNamesOf(glbPath)).toEqual(WARRIOR_NEW_CLIPS);
    expect(meshCountOf(glbPath)).toBe(0);
  });

  it('pins the Air Slash body clip to the native 1.5s action and all three contacts', async () => {
    await MeshoptDecoder.ready;
    const io = new NodeIO()
      .registerExtensions(ALL_EXTENSIONS)
      .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
    const doc = await io.read(
      join(ROOT, 'public/models/chars/players/warrior_ability_anims.glb'),
    );
    const airSlash = doc
      .getRoot()
      .listAnimations()
      .find((animation) => animation.getName() === 'Warrior_Mir4_AirSlash');
    expect(airSlash).toBeDefined();
    const timeline = airSlash?.listSamplers()[0]?.getInput()?.getArray();
    expect(timeline?.at(-1)).toBeCloseTo(1.5, 4);
    for (const contact of [0.52, 0.699, 0.9]) {
      expect(
        Array.from(timeline ?? []).some(
          (time) => Math.abs(time - contact) < 0.0001,
        ),
        `missing native Air Slash contact ${contact}s`,
      ).toBe(true);
    }
  });

  it('ships Splitting Slash as the decoded 47-frame native Cutter action', async () => {
    const glbPath = 'public/models/chars/players/warrior_cutter_native.glb';
    expect(clipNamesOf(glbPath)).toEqual([WARRIOR_NATIVE_CUTTER_CLIP]);
    expect(meshCountOf(glbPath)).toBe(0);

    await MeshoptDecoder.ready;
    const io = new NodeIO()
      .registerExtensions(ALL_EXTENSIONS)
      .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
    const doc = await io.read(join(ROOT, glbPath));
    const cutter = doc.getRoot().listAnimations()[0];
    expect(cutter?.getName()).toBe(WARRIOR_NATIVE_CUTTER_CLIP);
    expect(cutter?.listChannels()).toHaveLength(24);
    const rotationChannel = cutter
      ?.listChannels()
      .find((channel) => channel.getTargetPath() === 'rotation');
    const timeline = rotationChannel?.getSampler()?.getInput()?.getArray();
    const rotations = rotationChannel?.getSampler()?.getOutput()?.getArray();
    expect(timeline).toHaveLength(47);
    expect(timeline?.at(-1)).toBeCloseTo(1.5386906, 6);
    expect(rotations).toHaveLength(47 * 4);
    for (let index = 0; index < (rotations?.length ?? 0); index += 4) {
      const length = Math.hypot(
        rotations?.[index] ?? 0,
        rotations?.[index + 1] ?? 0,
        rotations?.[index + 2] ?? 0,
        rotations?.[index + 3] ?? 0,
      );
      expect(length).toBeCloseTo(1, 5);
    }
  });

  it('pins Unbreakable Stance to the extracted 36-frame native action duration', async () => {
    const glbPath = 'public/models/chars/players/warrior_ability_anims.glb';
    await MeshoptDecoder.ready;
    const io = new NodeIO()
      .registerExtensions(ALL_EXTENSIONS)
      .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
    const doc = await io.read(join(ROOT, glbPath));
    const clip = doc
      .getRoot()
      .listAnimations()
      .find(
        (animation) => animation.getName() === 'Warrior_Mir4_UnbreakableStance',
      );
    expect(clip, 'missing Unbreakable Stance body clip').toBeDefined();
    const duration = Math.max(
      0,
      ...(clip?.listSamplers().flatMap((sampler) => {
        const input = sampler.getInput()?.getArray();
        return input ? Array.from(input) : [];
      }) ?? []),
    );
    expect(duration).toBeCloseTo(1.1666666, 5);
    expect(clip?.listChannels().length).toBeGreaterThan(0);
  });

  it('ships Riposte as the decoded native ready-and-counter action', async () => {
    const glbPath = 'public/models/chars/players/warrior_riposte_native.glb';
    expect(clipNamesOf(glbPath)).toEqual([WARRIOR_NATIVE_RIPOSTE_CLIP]);
    expect(meshCountOf(glbPath)).toBe(0);

    await MeshoptDecoder.ready;
    const io = new NodeIO()
      .registerExtensions(ALL_EXTENSIONS)
      .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
    const doc = await io.read(join(ROOT, glbPath));
    const riposte = doc.getRoot().listAnimations()[0];
    expect(riposte?.getName()).toBe(WARRIOR_NATIVE_RIPOSTE_CLIP);
    expect(riposte?.listChannels()).toHaveLength(24);
    const rightArm = riposte
      ?.listChannels()
      .find(
        (channel) =>
          channel.getTargetNode()?.getName() === 'upperarm.r' &&
          channel.getTargetPath() === 'rotation',
      );
    const timeline = rightArm?.getSampler()?.getInput()?.getArray();
    const rotations = rightArm?.getSampler()?.getOutput()?.getArray();
    expect(timeline).toHaveLength(66);
    expect(timeline?.[29]).toBeCloseTo(0.95923078, 6);
    expect(timeline?.[30]).toBeCloseTo(0.99230772, 6);
    expect(timeline?.at(-1)).toBeCloseTo(2.15, 6);
    expect(Array.from(rotations?.slice(43 * 4, 44 * 4) ?? [])).toEqual([
      expect.closeTo(-0.8627175, 6),
      expect.closeTo(0.12279128, 6),
      expect.closeTo(0.43864113, 6),
      expect.closeTo(-0.21962422, 6),
    ]);
    for (let index = 0; index < (rotations?.length ?? 0); index += 4) {
      const length = Math.hypot(
        rotations?.[index] ?? 0,
        rotations?.[index + 1] ?? 0,
        rotations?.[index + 2] ?? 0,
        rotations?.[index + 3] ?? 0,
      );
      expect(length).toBeCloseTo(1, 5);
    }
  });

  it('ships Iron Shackle as the decoded native 86-frame action', async () => {
    const glbPath =
      'public/models/chars/players/warrior_iron_shackle_native.glb';
    expect(clipNamesOf(glbPath)).toEqual([WARRIOR_NATIVE_IRON_SHACKLE_CLIP]);
    expect(meshCountOf(glbPath)).toBe(0);

    await MeshoptDecoder.ready;
    const io = new NodeIO()
      .registerExtensions(ALL_EXTENSIONS)
      .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
    const doc = await io.read(join(ROOT, glbPath));
    const ironShackle = doc.getRoot().listAnimations()[0];
    expect(ironShackle?.getName()).toBe(WARRIOR_NATIVE_IRON_SHACKLE_CLIP);
    expect(ironShackle?.listChannels()).toHaveLength(24);
    const rightArm = ironShackle
      ?.listChannels()
      .find(
        (channel) =>
          channel.getTargetNode()?.getName() === 'upperarm.r' &&
          channel.getTargetPath() === 'rotation',
      );
    const timeline = rightArm?.getSampler()?.getInput()?.getArray();
    const rotations = rightArm?.getSampler()?.getOutput()?.getArray();
    expect(timeline).toHaveLength(86);
    expect(timeline?.at(-1)).toBeCloseTo(2.83333325, 6);
    expect(Array.from(rotations?.slice(43 * 4, 44 * 4) ?? [])).toEqual([
      expect.closeTo(-0.84833783, 6),
      expect.closeTo(0.20637979, 6),
      expect.closeTo(0.47645274, 6),
      expect.closeTo(-0.1035525, 6),
    ]);
  });

  it('ships Berserk as the decoded native 42-frame OverDrive action', async () => {
    const glbPath = 'public/models/chars/players/warrior_overdrive_native.glb';
    expect(clipNamesOf(glbPath)).toEqual([WARRIOR_NATIVE_OVERDRIVE_CLIP]);
    expect(meshCountOf(glbPath)).toBe(0);

    await MeshoptDecoder.ready;
    const io = new NodeIO()
      .registerExtensions(ALL_EXTENSIONS)
      .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
    const clip = (await io.read(join(ROOT, glbPath)))
      .getRoot()
      .listAnimations()[0];
    expect(clip?.listChannels()).toHaveLength(24);
    const timeline = clip
      ?.listChannels()[0]
      ?.getSampler()
      ?.getInput()
      ?.getArray();
    expect(timeline).toHaveLength(42);
    expect(timeline?.at(-1)).toBeCloseTo(1.3666667, 6);
  });

  it('ships Dragon Flame as the decoded native 104-frame Special action', async () => {
    const glbPath =
      'public/models/chars/players/warrior_dragon_flame_native.glb';
    expect(clipNamesOf(glbPath)).toEqual([WARRIOR_NATIVE_DRAGON_FLAME_CLIP]);
    expect(meshCountOf(glbPath)).toBe(0);

    await MeshoptDecoder.ready;
    const io = new NodeIO()
      .registerExtensions(ALL_EXTENSIONS)
      .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
    const clip = (await io.read(join(ROOT, glbPath)))
      .getRoot()
      .listAnimations()[0];
    expect(clip?.listChannels()).toHaveLength(24);
    const timeline = clip
      ?.listChannels()[0]
      ?.getSampler()
      ?.getInput()
      ?.getArray();
    expect(timeline).toHaveLength(104);
    expect(timeline?.at(-1)).toBeCloseTo(3.4333334, 6);
  });

  it('wires the donor GLB into animUrls and keeps every pre-existing attackByAbility entry', () => {
    const block = manifestBlock(
      'player_warrior: swims({',
      'player_paladin: swims({',
    );
    expect(block).toContain('warrior_ability_anims.glb');
    expect(block).toContain('warrior_cutter_native.glb');
    expect(block).toContain('warrior_riposte_native.glb');
    expect(block).toContain('warrior_iron_shackle_native.glb');
    expect(block).toContain('warrior_overdrive_native.glb');
    expect(block).toContain('warrior_dragon_flame_native.glb');
    expect(block).toContain(
      "mir4_skill_1502: 'Warrior_Mir4_UnbreakableStance'",
    );
    expect(block).toContain('attackByAbility');
    for (const clip of WARRIOR_NEW_CLIPS) expect(block).toContain(`'${clip}'`);
    expect(block).toContain("mir4_skill_1102: 'Warrior_Mir4_AirSlash'");
    expect(block).toContain(`mir4_skill_1104: '${WARRIOR_NATIVE_CUTTER_CLIP}'`);
    expect(block).toContain(
      `mir4_skill_1301: '${WARRIOR_NATIVE_RIPOSTE_CLIP}'`,
    );
    expect(block).toContain(
      `mir4_skill_1201: '${WARRIOR_NATIVE_IRON_SHACKLE_CLIP}'`,
    );
    expect(block).toContain(
      `mir4_skill_1101: '${WARRIOR_NATIVE_OVERDRIVE_CLIP}'`,
    );
    expect(block).toContain(
      `mir4_ultimate_1: '${WARRIOR_NATIVE_DRAGON_FLAME_CLIP}'`,
    );
    // Pre-existing entries from earlier PRs must survive this change untouched.
    const preExisting = [
      'mortal_strike',
      'execute',
      'slam',
      'red_harvest',
      'breachmaker',
      'shield_slam',
      'raging_gale',
      'bloodthirst',
      'cleave',
      'revenge',
      'thunder_clap',
      'faultline',
      'heroic_strike',
      'overpower',
      'hamstring',
      'sanguine_aura',
      'raised_guard',
      'pummel',
    ];
    for (const id of preExisting) expect(block).toContain(`${id}:`);
  });

  it('every mapped ability id is a real warrior ability, and every referenced clip is a shipped or pre-existing donor', () => {
    const warriorBlock = manifestBlock(
      'player_warrior: swims({',
      'player_paladin: swims({',
    );
    const abilityStart = warriorBlock.indexOf('attackByAbility: {');
    expect(abilityStart).toBeGreaterThanOrEqual(0);
    const abilityEnd = warriorBlock.indexOf('\n      },', abilityStart);
    expect(abilityEnd).toBeGreaterThan(abilityStart);
    const block = warriorBlock.slice(abilityStart, abilityEnd);
    const rows = [...block.matchAll(/^\s*([a-z_]+): '([A-Za-z_0-9]+)',$/gm)];
    expect(rows.length).toBeGreaterThan(23); // 18 pre-existing + this batch's 7 additions
    const knightClips = new Set([
      // stock KayKit clips already shipped in knight.glb
      '1H_Melee_Attack_Chop',
      '1H_Melee_Attack_Slice_Diagonal',
      '2H_Melee_Attack_Chop',
      'Dualwield_Melee_Attack_Chop',
      '1H_Melee_Attack_Slice_Horizontal',
      'Shield_Bash',
      'Spellcast_Raise',
      'Block',
      'Punch_A',
      'Cheer',
      WARRIOR_NATIVE_CUTTER_CLIP,
      // this batch's new bake
      ...WARRIOR_NEW_CLIPS,
    ]);
    const map: Record<string, string> = {};
    for (const [, abilityId, clip] of rows) {
      map[abilityId] = clip;
      expect(
        ABILITIES[abilityId],
        `attackByAbility key '${abilityId}' is not a real ability id`,
      ).toBeTruthy();
      expect(
        knightClips,
        `attackByAbility value '${clip}' for '${abilityId}' is not a shipped or pre-existing donor clip`,
      ).toContain(clip);
    }
    // This batch's real additions, spot-checked: every one verified to
    // actually reach playAttack (see the build script's header trace).
    expect(map.heroic_leap).toBe('Warrior_Heroic_Leap');
    expect(map.victory_rush).toBe('1H_Melee_Attack_Slice_Diagonal');
    expect(map.berserker_rage).toBe('Cheer');
    expect(map.recklessness).toBe('Cheer');
    expect(map.die_by_sword).toBe('Block');
    expect(map.avatar).toBe('Spellcast_Raise');
    expect(map.piercing_howl).toBe('Spellcast_Raise');
    // The dead-code traps this batch deliberately avoided: none of these got
    // an entry, because no attackByAbility lookup for them is ever reached.
    for (const deadId of [
      'whirlwind',
      'bladestorm',
      'storm_bolt',
      'battle_shout',
      'demoralizing_shout',
      'emboldening_roar',
      'defiant_bellow',
      'rallying_cry',
      'intimidating_shout',
    ]) {
      expect(
        map[deadId],
        `${deadId} must stay unmapped (never reaches attackByAbility)`,
      ).toBe(undefined);
    }
  });
});

describe('heroic_leap and piercing_howl reach triggerAttack through the real selfCast gate', () => {
  // Regression for the CHANGES_REQUESTED review on PR #2964: both ids are
  // untargeted (targetId === sourceId), full-spec archetypes 'dash' and
  // 'shout' respectively, with no castFx of their own. Before this fix, the
  // selfCast gate in handleSpellfx only claimed ceremonial archetypes
  // (buff/summon/cc/heal/spirit) or TARGETED strike/cc/burst/shout utility,
  // so both fell through unclaimed and triggerAttack was never called, i.e.
  // no attackByAbility gesture ever played (heroic_leap's leap, piercing_howl's
  // Spellcast_Raise).
  function makePainter() {
    const triggerAttack = vi.fn();
    const deps = {
      vfx: {
        shoutwave: vi.fn(),
        nova: vi.fn(),
        tick: vi.fn(),
        projectile: vi.fn(),
        lightningProjectile: vi.fn(),
        burst: vi.fn(),
        buffSwirl: vi.fn(),
        beam: vi.fn(),
      },
      fx: {
        setDelegates: vi.fn(),
        warmSpiritsForClass: vi.fn(),
        windup: vi.fn().mockReturnValue(false),
        holdShell: vi.fn(),
        holdGroundAura: vi.fn().mockReturnValue(true),
        orbit: vi.fn().mockReturnValue(true),
        bodyGlow: vi.fn(),
        sleepEntity: vi.fn(),
        update: vi.fn(),
        sequenceInstant: vi.fn(),
      },
      anchor: () => ({ x: 0, y: 0, z: 0 }),
      spawnAoeRing: vi.fn(),
      triggerAttack,
      hasGestureClip: () => true,
    } as unknown as AbilityVfxDeps;
    const painter = new AbilityVfx(deps, () => 0);
    return { painter, triggerAttack };
  }

  it('claims heroic_leap selfCast and triggers its attack clip', () => {
    const { painter, triggerAttack } = makePainter();

    const claimed = painter.handleSpellfx({
      type: 'spellfx',
      sourceId: 1,
      targetId: 1,
      school: 'physical',
      fx: 'selfCast',
      ability: 'heroic_leap',
    } as never);

    expect(claimed).toBe(true);
    expect(triggerAttack).toHaveBeenCalledWith(1, 'heroic_leap');
  });

  it('claims piercing_howl selfCast and triggers its attack clip', () => {
    const { painter, triggerAttack } = makePainter();

    const claimed = painter.handleSpellfx({
      type: 'spellfx',
      sourceId: 3,
      targetId: 3,
      school: 'physical',
      fx: 'selfCast',
      ability: 'piercing_howl',
    } as never);

    expect(claimed).toBe(true);
    expect(triggerAttack).toHaveBeenCalledWith(3, 'piercing_howl');
  });
});

describe('kobold family bespoke attack (issue #2889 warrior/kobold batch)', () => {
  it('ships Kobold_Pounce in a mesh-free donor GLB', () => {
    const glbPath = 'public/models/creatures/kobold_ability_anims.glb';
    expect(clipNamesOf(glbPath)).toEqual(['Kobold_Pounce']);
    expect(meshCountOf(glbPath)).toBe(0);
  });

  it('gives mob_kobold its own ClipMap instead of mutating the shared ENEMY7 constant', () => {
    const kobold = manifestBlock('mob_kobold: {', 'mob_grubjaw: {');
    expect(kobold).toContain('kobold_ability_anims.glb');
    expect(kobold).toContain('clips: KOBOLD_ENEMY7');
    expect(kobold).not.toContain('clips: ENEMY7,');

    // ENEMY7 itself (the constant definition, not a VisualDef using it) must
    // still read the original shared attack: its remaining consumers
    // (mob_goblin, mob_kobold_digger) share the SAME constant by reference
    // and must be untouched by this change. mob_ogre, once the motivating
    // shared-by-reference case, now rides its own authored body and OGRE
    // ClipMap (ogre.glb), so the pin on it moved from ENEMY7 to OGRE.
    const enemy7ConstBlock = manifestBlock('const ENEMY7: ClipMap = {', '};');
    expect(enemy7ConstBlock).toContain("attack: ['Attack']");

    const ogreBlock = manifestBlock('mob_ogre: {', '};');
    expect(ogreBlock).toContain('clips: OGRE,');
  });
});
