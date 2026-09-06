import { beforeAll, describe, expect, it } from 'vitest';
import { mir4SkillById, mir4SkillsForClass } from '../../src/sim/content/mir4';
import { mir4ActionAbilities, mir4ActionId } from '../../src/sim/mir4/action_abilities';
import { mir4RuntimeSkillExecutionAuthority } from '../../src/sim/mir4/runtime_skill_execution';
import { tEntity } from '../../src/ui/entity_i18n';
import { ensureLocaleLoaded, setLanguage } from '../../src/ui/i18n';

const WARRIOR_REGULAR_SKILL_IDS = Object.freeze([
  1102, 1104, 1304, 1401, 1501, 1302, 1301, 1201, 1601, 1101, 1103, 1502,
]);

describe('the complete MIR4 Warrior kit', () => {
  beforeAll(async () => {
    await ensureLocaleLoaded('en');
    setLanguage('en');
  });

  it('contains the twelve official regular skills in MIR4 unlock order', () => {
    expect(
      mir4SkillsForClass(1).map((skill) => [skill.slot, skill.skillId, skill.displayName]),
    ).toEqual([
      [1, 1102, 'Corte do Vazio'],
      [2, 1104, 'Corte Divisor'],
      [3, 1304, 'Choque Corporal'],
      [4, 1401, 'Esmagamento Terrestre'],
      [5, 1501, 'Corte Vendaval'],
      [6, 1302, 'Rugido de Leão'],
      [7, 1301, 'Riposta'],
      [8, 1201, 'Grilhão de Ferro'],
      [9, 1601, 'Golpe Crescente'],
      [10, 1101, 'Fúria'],
      [11, 1103, 'Investida Bárbara'],
      [12, 1502, 'Postura Inquebrável'],
    ]);
  });

  it('compiles every regular skill from its recovered native action without legacy fallback', () => {
    for (const skillId of WARRIOR_REGULAR_SKILL_IDS) {
      const authority = mir4RuntimeSkillExecutionAuthority(skillId);
      expect(authority, `native authority for ${skillId}`).not.toBeNull();
      expect(authority?.issues, `native compile issues for ${skillId}`).toEqual([]);
      expect(authority?.plan?.skillId, `native execution plan for ${skillId}`).toBe(skillId);
      expect(
        authority?.plan?.rows.map((row) => row.attackId),
        `native attack rows for ${skillId}`,
      ).toEqual(authority?.action.rows.map((row) => row.attackId));
    }
  });

  it('preserves the official Warrior damage-contact timeline from SKILL_ATTACK', () => {
    expect(mir4SkillsForClass(1).map((skill) => [skill.skillId, skill.impactOffsetsMs])).toEqual([
      [1102, [520, 699, 900]],
      [1104, [490]],
      [1304, [520]],
      [1401, [610]],
      [1501, [20, 225, 375, 540, 640, 840, 900, 1050, 1275]],
      [1302, [500, 600]],
      [1301, [1240]],
      [1201, [500, 850, 1500]],
      [1601, [750]],
      [1101, [20, 650]],
      [1103, [550, 1100]],
      [1502, [240]],
    ]);
  });

  it('surfaces only the twelve regular actions with official English names and unlock levels', () => {
    const actions = mir4ActionAbilities(1, 120, { 1301: 10 }, 204).filter((ability) =>
      ability.def.id.startsWith('mir4_skill_'),
    );

    expect(actions.map((ability) => ability.def.name)).toEqual([
      'Void Slash',
      'Splitting Slash',
      'Body Check',
      'Ground Smash',
      'Gale Slash',
      "Lion's Roar",
      'Riposte',
      'Iron Shackle',
      'Crescent Strike',
      'Berserk',
      'Barbaric Charge',
      'Unbreakable Stance',
    ]);
    expect(actions.map((ability) => ability.def.learnLevel)).toEqual([
      1, 1, 1, 1, 5, 8, 16, 24, 32, 40, 48, 56,
    ]);
    expect(actions.map((ability) => ability.def.id)).toEqual(
      WARRIOR_REGULAR_SKILL_IDS.map(mir4ActionId),
    );
  });

  it('keeps Barbaric Charge free of the retired pull and defense-buff copy', () => {
    const charge = mir4SkillById(1103);
    const action = mir4ActionAbilities(1, 48, undefined, 204).find(
      (ability) => ability.def.id === mir4ActionId(1103),
    );
    const localized = tEntity({
      kind: 'ability',
      id: mir4ActionId(1103),
      field: 'description',
      values: { damage: 1_052 },
    });

    expect(charge?.effect).toMatchObject({ effect: 'knockdown', durationMs: 3_000 });
    expect(charge?.additionalEffects).toBeUndefined();
    expect(charge?.minTargets).toBeNull();
    expect(action?.def.description).toContain('strike up to 10 enemies within 6 yards');
    expect(action?.def.description).toContain('final hit knocks them down for 3 sec');
    expect(localized).toContain('strike up to 10 enemies within 6 yards');
    expect(localized).toContain('final hit knocks them down for 3 sec');
    expect(localized).not.toContain('Pulls nearby enemies');
    expect(localized).not.toContain('Increases your Physical and Magic Defense');
  });
});
