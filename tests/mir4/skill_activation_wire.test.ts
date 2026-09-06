import { describe, expect, it } from 'vitest';
import { Mir4SelfWireCache } from '../../server/mir4_host';
import {
  type Mir4AutomationMovementInput,
  type Mir4AutomationSuspensionState,
  type Mir4AutomationWorld,
  mir4WorldAutomationOwnsMotion,
} from '../../src/game/mir4_motion_ownership';
import { decodeMir4Snapshot } from '../../src/net/mir4_snapshot_wire';
import { MIR4_GAME_PROFILE } from '../../src/sim/game_profile';
import { type Mir4PersistenceMeta, serializeMir4PlayerState } from '../../src/sim/mir4/persistence';
import { mir4SkillActivationOwnsMotion } from '../../src/sim/mir4/skill_activation';
import { projectMir4PlayerUiState } from '../../src/sim/mir4/ui_state';
import type { Entity } from '../../src/sim/types';

const IDLE_INPUT: Mir4AutomationMovementInput = {
  forward: false,
  back: false,
  strafeLeft: false,
  strafeRight: false,
  turnLeft: false,
  turnRight: false,
  jump: false,
  dive: false,
  surface: false,
};

function activationMeta(): Mir4PersistenceMeta {
  return {
    mir4SkillActivation: {
      phase: 'approach',
      abilityId: 'mir4_skill_1102',
      targetId: 42,
      selectionBound: true,
      armedTick: 17,
      instanceKey: 'world',
    },
  };
}

function actionMeta(): Mir4PersistenceMeta {
  return {
    mir4SkillAction: {
      skillId: 1102,
      targetId: 42,
      startedTick: 17,
      endCutMs: 1300,
      capturedFacing: 0,
      motionInterrupted: false,
      motions: [],
    },
  };
}

function automationWorld(state: Mir4AutomationSuspensionState | null): Mir4AutomationWorld {
  return {
    mir4AutoBattleActive: () => false,
    mir4AutoQuestActive: () => false,
    mir4PlayerState: () => state,
  };
}

describe('MIR4 skill activation wire', () => {
  it('keeps activation session-only and projects only the compact self marker', () => {
    const meta = activationMeta();
    const mir4 = { classId: 1 } as NonNullable<Entity['mir4']>;

    expect(serializeMir4PlayerState(meta, 1)).not.toHaveProperty('mir4SkillActivation');

    const uiState = projectMir4PlayerUiState(MIR4_GAME_PROFILE, meta, mir4);
    expect(uiState?.mir4SkillActivation).toEqual({ phase: 'approach' });
    expect(Object.keys(uiState?.mir4SkillActivation ?? {})).toEqual(['phase']);

    const encoded = new Mir4SelfWireCache().encode(MIR4_GAME_PROFILE, meta, mir4);
    expect(encoded).not.toBeNull();
    const selfWire = JSON.parse(encoded ?? '{}') as Record<string, unknown>;
    expect(selfWire.mir4SkillActivation).toEqual({ phase: 'approach' });
    expect(Object.keys(selfWire.mir4SkillActivation as object)).toEqual(['phase']);
  });

  it('decodes the approach marker and strips untrusted internal activation fields', () => {
    const decoded = decodeMir4Snapshot({
      classId: 1,
      ultimateGauge: 0,
      mir4SkillActivation: {
        phase: 'approach',
        abilityId: 'forged-client-value',
        targetId: 999,
      },
    });

    expect(decoded?.mir4SkillActivation).toEqual({ phase: 'approach' });
    expect(Object.keys(decoded?.mir4SkillActivation ?? {})).toEqual(['phase']);
  });

  it('projects, encodes, and decodes only the compact committed-action marker', () => {
    const meta = actionMeta();
    const mir4 = { classId: 1 } as NonNullable<Entity['mir4']>;

    expect(serializeMir4PlayerState(meta, 1)).not.toHaveProperty('mir4SkillAction');

    const uiState = projectMir4PlayerUiState(MIR4_GAME_PROFILE, meta, mir4);
    expect(uiState?.mir4SkillActivation).toEqual({ phase: 'action' });
    expect(Object.keys(uiState?.mir4SkillActivation ?? {})).toEqual(['phase']);

    const encoded = new Mir4SelfWireCache().encode(MIR4_GAME_PROFILE, meta, mir4);
    const selfWire = JSON.parse(encoded ?? '{}') as Record<string, unknown>;
    expect(selfWire.mir4SkillActivation).toEqual({ phase: 'action' });

    const decoded = decodeMir4Snapshot({
      classId: 1,
      ultimateGauge: 0,
      mir4SkillActivation: {
        phase: 'action',
        skillId: 999_999,
        targetId: 999_999,
        endCutMs: Number.POSITIVE_INFINITY,
      },
    });
    expect(decoded?.mir4SkillActivation).toEqual({ phase: 'action' });
    expect(Object.keys(decoded?.mir4SkillActivation ?? {})).toEqual(['phase']);
  });

  it('releases motion ownership after interruption while preserving the committed recovery state', () => {
    const meta = actionMeta();
    const action = meta.mir4SkillAction;
    if (!action) throw new Error('missing action fixture');
    action.motionInterrupted = true;
    const mir4 = { classId: 1 } as NonNullable<Entity['mir4']>;

    expect(mir4SkillActivationOwnsMotion({ ...meta, moveInput: { ...IDLE_INPUT } }, 18)).toBe(
      false,
    );
    expect(meta.mir4SkillAction).toBe(action);
    expect(projectMir4PlayerUiState(MIR4_GAME_PROFILE, meta, mir4)).not.toHaveProperty(
      'mir4SkillActivation',
    );
    const encoded = new Mir4SelfWireCache().encode(MIR4_GAME_PROFILE, meta, mir4);
    expect(JSON.parse(encoded ?? '{}')).not.toHaveProperty('mir4SkillActivation');
  });

  it.each([
    ['null', null],
    ['a scalar', 'approach'],
    ['an empty object', {}],
    ['an unknown phase', { phase: 'commit' }],
    ['a non-string phase', { phase: 1 }],
  ])('rejects %s as an activation marker', (_label, mir4SkillActivation) => {
    expect(decodeMir4Snapshot({ classId: 1, ultimateGauge: 0, mir4SkillActivation })).toBeNull();
  });

  it('gives an idle approach motion ownership and releases it for every manual motion input', () => {
    const world = automationWorld({ mir4SkillActivation: { phase: 'approach' } });
    expect(mir4WorldAutomationOwnsMotion(world, IDLE_INPUT)).toBe(true);

    for (const inputField of [
      'forward',
      'back',
      'strafeLeft',
      'strafeRight',
      'turnLeft',
      'turnRight',
      'jump',
      'dive',
      'surface',
    ] as const) {
      expect(mir4WorldAutomationOwnsMotion(world, { ...IDLE_INPUT, [inputField]: true })).toBe(
        false,
      );
    }

    expect(mir4WorldAutomationOwnsMotion(automationWorld(null), IDLE_INPUT)).toBe(false);
  });

  it('gives a committed action motion ownership until any manual motion input', () => {
    const world = automationWorld({ mir4SkillActivation: { phase: 'action' } });
    expect(mir4WorldAutomationOwnsMotion(world, IDLE_INPUT)).toBe(true);
    for (const inputField of [
      'forward',
      'back',
      'strafeLeft',
      'strafeRight',
      'turnLeft',
      'turnRight',
      'jump',
      'dive',
      'surface',
    ] as const) {
      expect(mir4WorldAutomationOwnsMotion(world, { ...IDLE_INPUT, [inputField]: true })).toBe(
        false,
      );
    }
  });
});
