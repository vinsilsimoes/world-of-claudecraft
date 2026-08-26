import { describe, expect, it } from 'vitest';
import { MIR4_CODEX_COLLECTIONS } from '../../src/sim/content/mir4/codex';
import { MIR4_EQUIPMENT_CATALOG } from '../../src/sim/content/mir4/equipment_catalog';
import { MIR4_AFFIXES } from '../../src/sim/mir4/affixes';
import { MIR4_MOUNT_PENDING_LIMIT } from '../../src/sim/mir4/mounts';
import { MIR4_SPIRIT_PENDING_LIMIT } from '../../src/sim/mir4/spirits';
import { buildMaxMir4PersistedState } from '../helpers/mir4_max_persisted_state';

function expectBoundedEntropy(values: readonly string[], length: number): void {
  expect(values.every((value) => value.length === length)).toBe(true);
  expect(new Set(values).size).toBe(values.length);
  expect(new Set(values.join('')).size).toBe(64);
}

describe('MIR4 persisted JSONB size budget', () => {
  it('keeps the maximum MIR4 profile projection on a fresh character below 128 KiB', () => {
    expect(MIR4_SPIRIT_PENDING_LIMIT).toBe(256);
    expect(MIR4_MOUNT_PENDING_LIMIT).toBe(128);
    const {
      state,
      ownerSnapshot,
      selectedClassId,
      classItemCounts,
      classItemCount,
      arcQuestCount,
      mountCount,
      spiritCount,
    } = buildMaxMir4PersistedState();
    const bytes = Buffer.byteLength(JSON.stringify(state), 'utf8');
    const ownerSnapshotBytes = Buffer.byteLength(JSON.stringify(ownerSnapshot), 'utf8');
    const codexBytes = Buffer.byteLength(JSON.stringify(state.mir4Codex), 'utf8');

    expect(Object.keys(state.mir4EquipmentInstances ?? {})).toHaveLength(classItemCount);
    expect(classItemCounts).toEqual({ 1: 48, 2: 48, 3: 48, 4: 48, 5: 48 });
    expect(classItemCount).toBe(Math.max(...Object.values(classItemCounts)));
    expect(classItemCount).toBe(classItemCounts[selectedClassId]);
    expect(Object.keys(state.mir4ArcQuests ?? {})).toHaveLength(arcQuestCount);
    expect(Object.keys(state.mir4Mounts?.owned ?? {})).toHaveLength(mountCount);
    expect(state.mir4Mounts?.pending).toHaveLength(MIR4_MOUNT_PENDING_LIMIT);
    expect(Object.keys(state.mir4Spirits?.owned ?? {})).toHaveLength(spiritCount);
    expect(state.mir4Spirits?.pending).toHaveLength(MIR4_SPIRIT_PENDING_LIMIT);
    expect(new Set(Object.values(state.mir4Materials ?? {}))).toEqual(new Set([1_000_000_000]));
    expect(state.mir4Training?.solitude?.conceptionVessel).toEqual([
      10, 10, 10, 10, 10, 10, 10, 10,
    ]);
    const maximumManualCodex = Object.fromEntries(
      MIR4_CODEX_COLLECTIONS.filter((collection) => collection.registration === 'manual').map(
        (collection) => [
          collection.id,
          Object.fromEntries(
            collection.requirements
              .filter((requirement) => requirement.kind === 'material')
              .map((requirement) => [requirement.id, requirement.requiredCount]),
          ),
        ],
      ),
    );
    expect(state.mir4Codex).toEqual({ version: 1, registered: maximumManualCodex });
    expect(codexBytes).toBeLessThanOrEqual(4 * 1024);
    const instances = Object.values(state.mir4EquipmentInstances ?? {});
    const equippedItemIds = new Set(Object.values(state.mir4Equipment ?? {}));
    expect(equippedItemIds.size).toBe(8);
    expect(instances.filter((instance) => instance.destroyed).length).toBe(classItemCount - 8);
    const rollIds = instances.flatMap((instance) =>
      instance.pendingRoll ? [instance.pendingRoll.rollId] : [],
    );
    expectBoundedEntropy(rollIds, 128);
    expectBoundedEntropy(state.mir4Mounts?.pending?.map((entry) => entry.id) ?? [], 96);
    expectBoundedEntropy(state.mir4Spirits?.pending?.map((entry) => entry.id) ?? [], 96);
    for (const instance of instances) {
      expect(instance.affixes?.enchantment).toHaveLength(2);
      expect(instance.affixes?.blessing).toHaveLength(3);
      expect(instance.pendingRoll?.layer).toBe('blessing');
      expect(instance.pendingRoll?.affixes).toHaveLength(3);
      expect(instance.destroyed === true).toBe(!equippedItemIds.has(instance.itemId));
      const item = MIR4_EQUIPMENT_CATALOG.find((entry) => entry.itemId === instance.itemId);
      expect(item).toBeDefined();
      if (!item) continue;
      const maximumByStatus = new Map<number, number>();
      for (const def of Object.values(MIR4_AFFIXES)) {
        const statusId = def.statusId ?? 0;
        const maximum =
          def.unit === 'basis-points' ? def.max : def.max * (1 + 25 + item.tier + item.grade);
        maximumByStatus.set(statusId, Math.max(maximumByStatus.get(statusId) ?? 0, maximum));
      }
      for (const layer of [
        instance.affixes?.enchantment,
        instance.affixes?.blessing,
        instance.pendingRoll?.affixes,
      ]) {
        for (const [statusId, amount] of layer ?? []) {
          expect(amount).toBe(maximumByStatus.get(statusId));
        }
      }
    }
    expect(bytes).toBeLessThanOrEqual(128 * 1024);
    expect(ownerSnapshotBytes).toBeLessThanOrEqual(128 * 1024);
  });
});
