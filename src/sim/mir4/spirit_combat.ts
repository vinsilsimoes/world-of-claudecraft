// Spirit special-skill resolution layered over the existing MIR4 damage
// pipeline. It reuses the same hit/critical rolls when a proc modifies the
// triggering hit, matching the source command contract without introducing a
// second damage event or any renderer-owned state.

import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import {
  type Mir4AttackKind,
  type Mir4BuildDamageContext,
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
    attackKind?: Mir4AttackKind;
    hitRoll: number;
    criticalRoll: number;
    allowSpiritProc: boolean;
    buildBalance?: Mir4BuildDamageContext;
    forceHit?: boolean;
    forceCritical?: boolean;
    hitChanceBpsOverride?: number;
    criticalChanceBpsOverride?: number;
    criticalMultiplierBpsOverride?: number;
  },
): Mir4SpiritDamageResult {
  const base = mir4ResolveDamage(input);
  const legacyHit = input.buildBalance
    ? mir4ResolveDamage({
        ...input,
        buildBalance: undefined,
        defender: {
          ...input.defender,
          // Before MobTemplate opposition, classic mobs without a MIR4 bag
          // always entered this proc contract with zero Dodge. Reconstruct
          // that exact defender so new PvE Evasion cannot remove a shared RNG
          // draw that every later deterministic system already expects.
          dodge: target.mir4?.dodge ?? 0,
        },
      }).hit
    : base.hit;
  const meta = ctx.players.get(player.id);
  const spiritId = meta?.mir4Spirits?.equippedSpiritId;
  const skill = spiritId ? mir4SpiritSpecialSkill(spiritId) : null;
  const empty = {
    resolved: base,
    // `attempted` is an action-group guard, not only a report of the new
    // resolver's hit. A legacy hit still consumes the historical shared RNG
    // draw even when the level-scaled curve now turns that contact into a
    // miss. Mark that lane as attempted so a later impact in the same action
    // cannot consume the draw again.
    attempted: input.allowSpiritProc && (legacyHit || base.hit),
    triggered: false,
    skill,
    healthRestored: 0,
    manaRestored: 0,
  };
  if (!input.allowSpiritProc) return empty;
  if (!meta || !skill || ctx.time < (meta.mir4SpiritSkillReadyAt ?? 0)) {
    return empty;
  }
  if (
    skill.kind === 'execute' &&
    Math.floor((Math.max(0, target.hp) * 10_000) / Math.max(1, target.maxHp)) >
      (skill.targetHpThresholdBps ?? 0)
  ) {
    return empty;
  }
  if (!legacyHit && !base.hit) return empty;
  // Every gameplay chance consumes the one shared deterministic stream. The
  // legacy-hit arm still preserves its historical draw when new Evasion turns
  // the resolved contact into a miss.
  const procRoll = Math.floor(ctx.rng.next() * 10_000);
  if (!base.hit || procRoll >= skill.chanceBps) {
    return empty;
  }

  const healthBefore = player.hp;
  const manaBefore = player.resource;
  meta.mir4SpiritSkillReadyAt = ctx.time + skill.cooldownMs / 1_000;
  const healMaxHpBps = skill.healMaxHpBps ?? 0;
  const restoreMaxMpBps = skill.restoreMaxMpBps ?? 0;
  if (healMaxHpBps > 0) {
    player.hp = Math.min(
      player.maxHp,
      player.hp + Math.max(1, Math.floor((player.maxHp * healMaxHpBps) / 10_000)),
    );
  }
  if (restoreMaxMpBps > 0) {
    player.resource = Math.min(
      player.maxResource,
      player.resource + Math.max(1, Math.floor((player.maxResource * restoreMaxMpBps) / 10_000)),
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
