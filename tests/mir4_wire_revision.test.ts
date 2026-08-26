import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { expectScansOnlyThroughSharedWalkers } from './helpers/scan_guard_self_audit';
import { tsFilesUnder } from './helpers/ts_files_under';

const PERSISTED_FIELDS = [
  'autoBattle',
  'mir4DisabledAutoSkills',
  'mir4Quests',
  'mir4ArcQuests',
  'mir4ArcRewards',
  'mir4AutoQuest',
  'mir4SkillLevels',
  'mir4SkillResources',
  'mir4AchievementClears',
  'mir4Currencies',
  'mir4Equipment',
  'mir4EquipmentInstances',
  'mir4Materials',
  'mir4Training',
  'mir4Mounts',
  'mir4Spirits',
];

const DIRECT_WRITER_MODULES = [
  'auto_battle/core.ts',
  'auto_quest/core.ts',
  'dev/mir4_mount_playtest.ts',
  'dev/mir4_spirit_playtest.ts',
  'mir4/achievements.ts',
  'mir4/affixes.ts',
  'mir4/arc_quest_runtime.ts',
  'mir4/arc_rewards.ts',
  'mir4/auto_skills.ts',
  'mir4/codex/runtime.ts',
  'mir4/crafting.ts',
  'mir4/energy.ts',
  'mir4/equipment.ts',
  'mir4/mount_commands.ts',
  'mir4/persistence.ts',
  'mir4/quest.ts',
  'mir4/skill_evolution.ts',
  'mir4/skill_materials.ts',
  'mir4/solitude_training_commands.ts',
  'mir4/spirit_commands.ts',
  'mir4/training_commands.ts',
  'mir4/training_resources.ts',
];

describe('MIR4 wire revision coverage', () => {
  it('inventories direct writer modules and requires each to opt into invalidation', () => {
    const root = resolve(process.cwd(), 'src/sim');
    const files = tsFilesUnder(root);
    expect(files.length).toBeGreaterThanOrEqual(500);
    expect(files.map(({ file }) => file)).toContain('mir4/persistence.ts');
    expectScansOnlyThroughSharedWalkers(import.meta.url, ['ts_files_under']);

    const writers: string[] = [];
    for (const sourceFile of files) {
      const source = readFileSync(sourceFile.full, 'utf8');
      const writesPersistedField = PERSISTED_FIELDS.some((field) =>
        new RegExp(`\\.${field}\\s*(?:=|\\?\\?=|\\+=|-=|\\+\\+|--)`).test(source),
      );
      if (!writesPersistedField) continue;
      writers.push(sourceFile.file);
      expect(source, `${sourceFile.file} must invalidate after its direct writes`).toContain(
        'markMir4WireDirty',
      );
    }
    expect(writers).toEqual(DIRECT_WRITER_MODULES);
  });
});
