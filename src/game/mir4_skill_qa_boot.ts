import { mir4ClassByKey, mir4SkillById, mir4SkillsForClass } from '../sim/content/mir4';
import { mir4ActionId, mir4UltimateActionId } from '../sim/mir4/action_abilities';
import { MIR4_NATIVE_ULTIMATE_SKILL_IDS } from '../sim/mir4/native_ultimate_runtime';
import type { Mir4ClassKey } from '../sim/types';
import { ACTION_BAR_LAYOUT_VERSION, type ActionBarLayout } from '../world_api/action_bar';

export interface Mir4SkillQaBootRequest {
  readonly playerClass: Mir4ClassKey;
  readonly playerName: string;
  readonly skillId?: number;
  readonly playerLevel?: number;
}

const QA_PLAYER_NAMES: Readonly<Record<Mir4ClassKey, string>> = {
  warrior: 'Warrior QA',
  elementalist: 'Elementalist QA',
  taoist: 'Taoist QA',
  arbalist: 'Arbalist QA',
  lancer: 'Lancer QA',
};

interface Mir4SkillQaWorld {
  readonly player: { readonly name: string; mir4UltGauge?: number };
  chat(text: string): void;
  setMir4AutoSkillEnabled(skillId: number, enabled: boolean): boolean;
}

const QA_SETUP_COMMANDS = [
  '/dev combatreset',
  '/dev cooldowns',
  '/dev resource infinite on',
  '/dev skillqa isolate on',
] as const;

/**
 * Resolves the lightweight, development-only MIR4 skill-homologation entry.
 * Unlike diagnosticsAuto, this route does not enable the performance doctor,
 * census, trace collection, or diagnostics HUD.
 */
export function mir4SkillQaBootRequest(
  params: URLSearchParams,
  dev: boolean,
): Mir4SkillQaBootRequest | null {
  if (!dev) return null;
  const requested = params.get('mir4SkillQa');
  if (!requested || !Object.hasOwn(QA_PLAYER_NAMES, requested)) return null;
  const playerClass = requested as Mir4ClassKey;
  const rawSkillId = params.get('mir4Skill');
  if (rawSkillId === null) return { playerClass, playerName: QA_PLAYER_NAMES[playerClass] };
  if (!/^\d{4}$/.test(rawSkillId)) return null;
  const numericSkillId = Number(rawSkillId);
  const skill = mir4SkillById(numericSkillId);
  const classId = mir4ClassByKey(playerClass)?.classId;
  if (classId === undefined) return null;
  const isUltimate = MIR4_NATIVE_ULTIMATE_SKILL_IDS[classId] === numericSkillId;
  if (!isUltimate && (!skill || skill.classId !== classId)) return null;
  return {
    playerClass,
    playerName: QA_PLAYER_NAMES[playerClass],
    skillId: numericSkillId,
    playerLevel: isUltimate ? 1 : skill?.unlock.kind === 'initial-deck' ? 1 : skill?.unlock.level,
  };
}

/**
 * Gives the visual QA route one unambiguous input: the requested MIR4 skill is
 * the only configured action. This prevents a persisted/default class bar from
 * making a browser click exercise a different skill while the URL claims the
 * requested one.
 */
export function mir4SkillQaSelectedActionBarLayout(
  request: Mir4SkillQaBootRequest | null,
): ActionBarLayout | null {
  const actionId = mir4SkillQaSelectedActionId(request);
  if (actionId === null) return null;
  return {
    v: ACTION_BAR_LAYOUT_VERSION,
    forms: {
      normal: {
        // The controller promotes the first configured action into MIR4's
        // assignable seat 1. Keep the bar non-empty during load: an empty
        // stored MIR4 bar is the deliberate migration signal for rebuilding a
        // legacy pre-homologation class kit, which would defeat QA isolation.
        bar: [{ type: 'ability', id: actionId }],
        attack: null,
      },
    },
  };
}

/** The one action the skill-QA HUD may expose or auto-place. */
export function mir4SkillQaSelectedActionId(request: Mir4SkillQaBootRequest | null): string | null {
  if (request?.skillId === undefined) return null;
  const classId = mir4ClassByKey(request.playerClass)?.classId;
  return classId !== undefined && MIR4_NATIVE_ULTIMATE_SKILL_IDS[classId] === request.skillId
    ? mir4UltimateActionId(classId)
    : mir4ActionId(request.skillId);
}

/** Adds only deterministic dev fixtures after the lightweight Sim is built. */
export function provisionMir4SkillQa(
  world: Mir4SkillQaWorld,
  params: URLSearchParams,
  dev: boolean,
): boolean {
  const request = mir4SkillQaBootRequest(params, dev);
  if (!request || world.player.name !== request.playerName) return false;
  const playerLevel = request.playerLevel ?? 250;
  world.chat(`/dev level ${playerLevel}`);
  const classId = mir4ClassByKey(request.playerClass)?.classId;
  if (
    request.skillId !== undefined &&
    classId !== undefined &&
    MIR4_NATIVE_ULTIMATE_SKILL_IDS[classId] === request.skillId
  ) {
    world.player.mir4UltGauge = 100;
  }
  if (classId !== undefined) {
    for (const skill of mir4SkillsForClass(classId)) {
      world.setMir4AutoSkillEnabled(skill.skillId, false);
    }
  }
  for (const command of QA_SETUP_COMMANDS) world.chat(command);
  const trainingTargetCount =
    request.skillId === 4102
      ? 9
      : request.skillId === 4101 ||
          request.skillId === 4103 ||
          request.skillId === 4106 ||
          request.skillId === 4107
        ? 6
        : request.skillId === 4108 || request.skillId === 4109 || request.skillId === 4112
          ? 9
          : request.skillId === 4104 || request.skillId === 4105
            ? 7
            : request.skillId === 2303
              ? 7
              : request.skillId === 2201
                ? 9
                : request.skillId === 2202
                  ? 6
                  : request.skillId === 2502
                    ? 7
                    : request.skillId === 2403
                      ? 11
                      : request.skillId === 3506
                        ? 10
                        : request.skillId === 3301
                          ? 8
                          : request.skillId === 3101
                            ? 9
                            : request.skillId === 3103
                              ? 9
                              : 1;
  world.chat(`/dev spawn training_dummy ${trainingTargetCount} ${playerLevel}`);
  return true;
}
