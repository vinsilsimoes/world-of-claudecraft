// Spirit special-skill resolution layered over the existing MIR4 damage
// pipeline. It reuses the same hit/critical rolls when a proc modifies the
// triggering hit, matching the source command contract without introducing a
// second damage event or any renderer-owned state.

import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import {
  type Mir4CombatStats,
  type Mir4ResolvedDamage,
  type Mir4TargetKind,
  mir4ResolveDamage,
} from './math';
import { type Mir4SpiritSpecialSkill, mir4SpiritSpecialSkill } from './spirits';

export interface Mir4SpiritDamageResult {
  resolved: Mir4ResolvedDamage;
  attempted: boolean;
  triggered: boolean;
  skill: Mir4SpiritSpecialSkill | null;
  healthRestored: number;
  manaRestored: number;
}

export function resolveMir4PlayerDamageWithSpirit(
  ctx: SimContext,
  player: Entity,
  target: Entity,
  input: {
    rawDamage: number;
    channel: 'physical' | 'magic';
    attacker: Partial<Mir4CombatStats>;
    defender: Partial<Mir4CombatStats>;
    targetKind?: Mir4TargetKind;
    hitRoll: number;
    criticalRoll: number;
    allowSpiritProc: boolean;
  },
): Mir4SpiritDamageResult {
  const base = mir4ResolveDamage(input);
  const empty = {
    resolved: base,
    attempted: input.allowSpiritProc && base.hit,
    triggered: false,
    skill: null,
    healthRestored: 0,
    manaRestored: 0,
  };
  if (!input.allowSpiritProc || !base.hit) return empty;
  const meta = ctx.players.get(player.id);
  const spiritId = meta?.mir4Spirits?.equippedSpiritId;
  const skill = spiritId ? mir4SpiritSpecialSkill(spiritId) : null;
  if (!meta || !skill || ctx.time < (meta.mir4SpiritSkillReadyAt ?? 0)) {
    return { ...empty, skill };
  }
  if (
    skill.kind === 'execute' &&
    Math.floor((Math.max(0, target.hp) * 10_000) / Math.max(1, target.maxHp)) >
      (skill.targetHpThresholdBps ?? 0)
  ) {
    return { ...empty, skill };
  }
  if (Math.floor(ctx.rng.next() * 10_000) >= skill.chanceBps) {
    return { ...empty, skill };
  }

  const healthBefore = player.hp;
  const manaBefore = player.resource;
  meta.mir4SpiritSkillReadyAt = ctx.time + skill.cooldownMs / 1_000;
  if ((skill.healMaxHpBps ?? 0) > 0) {
    player.hp = Math.min(
      player.maxHp,
      player.hp + Math.max(1, Math.floor((player.maxHp * skill.healMaxHpBps!) / 10_000)),
    );
  }
  if ((skill.restoreMaxMpBps ?? 0) > 0) {
    player.resource = Math.min(
      player.maxResource,
      player.resource +
        Math.max(1, Math.floor((player.maxResource * skill.restoreMaxMpBps!) / 10_000)),
    );
  }
  const resolved = mir4ResolveDamage({
    ...input,
    rawDamage: Math.max(
      1,
      Math.floor((input.rawDamage * (10_000 + (skill.bonusDamageBps ?? 0))) / 10_000),
    ),
    attacker: {
      ...input.attacker,
      penetrationBps: (input.attacker.penetrationBps ?? 0) + (skill.penetrationBps ?? 0),
    },
    forceCritical: skill.forceCritical === true ? true : undefined,
  });
  ctx.emit({
    type: 'spellfx',
    sourceId: player.id,
    targetId: target.id,
    school: `mir4/spirit/${skill.kind}`,
    fx: 'flourish',
  });
  return {
    resolved,
    attempted: true,
    triggered: true,
    skill,
    healthRestored: player.hp - healthBefore,
    manaRestored: player.resource - manaBefore,
  };
}
