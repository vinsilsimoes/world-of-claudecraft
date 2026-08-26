import { describe, expect, it } from 'vitest';
import { MIR4_CLASS_IDS } from '../../src/sim/content/mir4/classes';
import {
  MIR4_CODEX_COLLECTIONS,
  MIR4_CODEX_UNLOCK_LEVEL,
  resolveMir4CodexCollection,
} from '../../src/sim/content/mir4/codex';

describe('MIR4 Codex content', () => {
  it('ships six authored collections at the level 12 system unlock', () => {
    expect(MIR4_CODEX_UNLOCK_LEVEL).toBe(12);
    expect(MIR4_CODEX_COLLECTIONS).toHaveLength(6);
    expect(new Set(MIR4_CODEX_COLLECTIONS.map((entry) => entry.id)).size).toBe(6);
  });

  it('keeps equipment requirements specific to the active class', () => {
    for (const classId of MIR4_CLASS_IDS) {
      const collections = MIR4_CODEX_COLLECTIONS.map((entry) =>
        resolveMir4CodexCollection(entry.id, classId),
      );
      const equipment = collections.flatMap(
        (entry) =>
          entry?.requirements.filter((requirement) => requirement.kind === 'equipment') ?? [],
      );
      expect(equipment).toHaveLength(16);
      expect(equipment.every((requirement) => requirement.classId === classId)).toBe(true);
    }
  });

  it('uses manual consumption only for material registrations', () => {
    const manual = MIR4_CODEX_COLLECTIONS.filter((entry) => entry.registration === 'manual');
    const automatic = MIR4_CODEX_COLLECTIONS.filter((entry) => entry.registration === 'automatic');
    expect(manual).toHaveLength(2);
    expect(
      manual.every((entry) =>
        resolveMir4CodexCollection(entry.id, 1)?.requirements.every(
          (requirement) => requirement.kind === 'material',
        ),
      ),
    ).toBe(true);
    expect(automatic).toHaveLength(4);
  });
});
