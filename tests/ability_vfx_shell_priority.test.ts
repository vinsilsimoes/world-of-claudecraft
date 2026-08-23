import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { BuffShells } from '../src/render/ability_vfx/shells';

interface ShellProbe {
  slots: Array<{ entityId: number; active: boolean; priority: boolean }>;
}

describe('BuffShells local-player priority', () => {
  it('drops an extra remote shell but admits the local barrier into a full pool', () => {
    const shells = new BuffShells(new THREE.Scene());
    for (let entityId = 1; entityId <= 8; entityId += 1) {
      shells.hold(entityId, 0x3366ff, 10);
    }
    shells.hold(9, 0x3366ff, 10);

    const probe = shells as unknown as ShellProbe;
    expect(probe.slots.filter((slot) => slot.active)).toHaveLength(8);
    expect(probe.slots.some((slot) => slot.entityId === 9)).toBe(false);

    shells.hold(99, 0xffcc33, 10, true);

    expect(probe.slots.filter((slot) => slot.active)).toHaveLength(8);
    expect(probe.slots.some((slot) => slot.entityId === 99 && slot.priority)).toBe(true);
    expect(probe.slots.filter((slot) => slot.entityId >= 1 && slot.entityId <= 8)).toHaveLength(7);
  });

  it('never evicts one local-priority barrier for another remote shell', () => {
    const shells = new BuffShells(new THREE.Scene());
    shells.hold(99, 0xffcc33, 1, true);
    for (let entityId = 1; entityId <= 8; entityId += 1) {
      shells.hold(entityId, 0x3366ff, 2);
    }
    shells.flash(88, 0xff0000, 0.5);

    const probe = shells as unknown as ShellProbe;
    expect(probe.slots.some((slot) => slot.entityId === 99 && slot.priority)).toBe(true);
    expect(probe.slots.some((slot) => slot.entityId === 88)).toBe(true);
  });
});
