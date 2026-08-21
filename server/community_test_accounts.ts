// Off-by-default account provisioning for community test realms. This module owns
// the immutable character templates and generated-name policy; db.ts owns the
// transaction that inserts them. The templates are built through public Sim APIs
// so level, derived stats, equipment rules, bags, and persistence stay canonical.
//
// Classic templates use the shared PvE boost kit. MIR4 templates use only the
// native MIR4 class/equipment datasets and target 3D runtime; no source-game
// 2D presentation asset is imported or referenced by this provisioning path.

import { MIR4_MAX_LEVEL } from '../src/sim/content/mir4';
import { MIR4_EQUIPMENT_CATALOG } from '../src/sim/content/mir4/equipment_catalog';
import {
  type DEFAULT_GAME_PROFILE,
  type GameProfile,
  MIR4_GAME_PROFILE,
} from '../src/sim/game_profile';
import { classesForGameProfile } from '../src/sim/game_profile_roster';
import { activateWorldForGameProfile } from '../src/sim/game_profile_world';
import { type CharacterState, Sim } from '../src/sim/sim';
import {
  ALL_EQUIP_SLOTS,
  MAX_LEVEL,
  type Mir4ClassKey,
  type PlayableClass,
  type PlayerClass,
} from '../src/sim/types';
import { validCharName } from './auth';
import { applyBoostKitToPlayer } from './pbe_boost';
import { GAME_PROFILE } from './realm';

const TEMPLATE_SEED = 20061;
const NAME_TOKEN_LENGTH = 8;
export const GENERATED_NAME_ATTEMPTS = 32;

export interface CommunityTestCharacter<C extends PlayableClass = PlayableClass> {
  readonly cls: C;
  readonly name: string;
  readonly state: CharacterState;
}

let enabled = false;
const cachedTemplates = new Map<GameProfile, ReadonlyMap<PlayableClass, CharacterState>>();

export function configureCommunityTestAccounts(next: boolean): void {
  enabled = next;
}

export function communityTestAccountsEnabled(): boolean {
  return enabled;
}

function cloneState(state: CharacterState): CharacterState {
  return JSON.parse(JSON.stringify(state)) as CharacterState;
}

function templateStates(gameProfile: GameProfile): ReadonlyMap<PlayableClass, CharacterState> {
  const cached = cachedTemplates.get(gameProfile);
  if (cached) return cached;
  const sim = new Sim({
    seed: TEMPLATE_SEED,
    playerClass: 'warrior',
    gameProfile,
    world: activateWorldForGameProfile(gameProfile),
    noPlayer: true,
  });
  const templates = new Map<PlayableClass, CharacterState>();
  for (const cls of classesForGameProfile(gameProfile)) {
    const pid = sim.addPlayer(cls, `${cls}template`);
    if (gameProfile === MIR4_GAME_PROFILE) {
      sim.setPlayerLevel(MIR4_MAX_LEVEL, pid);
      const classId = sim.entities.get(pid)?.mir4?.classId;
      if (!classId) throw new Error(`missing MIR4 class identity for ${cls}`);
      const meta = sim.players.get(pid);
      if (!meta) throw new Error(`missing MIR4 community player metadata for ${cls}`);
      meta.mir4ArcRewards ??= {};
      meta.mir4ArcRewards.items ??= {};
      for (let slot = 1; slot <= 8; slot += 1) {
        const item = MIR4_EQUIPMENT_CATALOG.filter(
          (candidate) => candidate.classId === classId && candidate.equipSlot === slot,
        ).sort((a, b) => b.catalogRank - a.catalogRank)[0];
        if (!item) throw new Error(`missing MIR4 community item for ${cls} slot ${slot}`);
        // Community provisioning is a trusted reward source, but it still
        // crosses the same ownership check as gameplay. Crediting the logical
        // item first prevents this setup path from becoming an arbitrary-item
        // mint bypass around mir4EquipItem.
        meta.mir4ArcRewards.items[String(item.itemId)] = 1;
        const equipped = sim.mir4EquipItem(item.itemId, pid);
        if (!meta.mir4Equipment?.[slot]) {
          throw new Error(`failed to equip MIR4 community item ${item.itemId}: ${equipped}`);
        }
      }
      meta.mir4Materials = {
        sunStone: 999,
        moonStone: 999,
        solarScroll: 999,
        lunarSeal: 999,
        dawnTear: 999,
        solarWard: 999,
      };
      sim.setPlayerLevel(MIR4_MAX_LEVEL, pid);
    } else {
      sim.setPlayerLevel(MAX_LEVEL, pid);
      // Remove starter gear before applying the kit. With live offhands and
      // dual wielding, leaving it equipped can route the intended mainhand into
      // the offhand or retain an obsolete shield beside a two-hander.
      for (const slot of ALL_EQUIP_SLOTS) sim.unequipItem(slot, pid);
      // The shared boost kit: bags, the primary role's true-BiS kit equipped,
      // every alternate role's kit in the bags, riding, and the attunement.
      if (!applyBoostKitToPlayer(sim, pid)) {
        throw new Error(`boost kit did not apply to community test template for ${cls}`);
      }
      sim.setPlayerLevel(MAX_LEVEL, pid);
    }
    const state = sim.serializeCharacter(pid);
    if (!state) throw new Error(`failed to build community test template for ${cls}`);
    templates.set(cls, state);
  }
  cachedTemplates.set(gameProfile, templates);
  return templates;
}

/** Build and cache pristine templates before opening an account transaction. */
export function prepareCommunityTestCharacters(gameProfile: GameProfile = GAME_PROFILE): void {
  templateStates(gameProfile);
}

function encodeNameToken(value: bigint): string {
  let cursor = value;
  const chars = Array<string>(NAME_TOKEN_LENGTH).fill('a');
  for (let index = NAME_TOKEN_LENGTH - 1; index >= 0; index--) {
    chars[index] = String.fromCharCode(97 + Number(cursor % 26n));
    cursor /= 26n;
  }
  return chars.join('');
}

export function generatedTestCharacterName(
  accountId: number,
  cls: PlayableClass,
  attempt = 0,
): string {
  const safeAccountId = Math.max(0, Math.floor(accountId));
  const safeAttempt = Math.max(0, Math.floor(attempt));
  const encoded = BigInt(safeAccountId) * BigInt(GENERATED_NAME_ATTEMPTS) + BigInt(safeAttempt);
  const compactClass = cls.slice(0, 8);
  const prefix = `${compactClass[0].toUpperCase()}${compactClass.slice(1)}`;
  return `${prefix}${encodeNameToken(encoded)}`;
}

function firstValidName(accountId: number, cls: PlayableClass): string {
  for (let attempt = 0; attempt < GENERATED_NAME_ATTEMPTS; attempt++) {
    const candidate = generatedTestCharacterName(accountId, cls, attempt);
    if (validCharName(candidate)) return candidate;
  }
  throw new Error(`failed to generate a valid community test name for ${cls}`);
}

export function buildCommunityTestCharacters(
  accountId: number,
): CommunityTestCharacter<PlayerClass>[];
export function buildCommunityTestCharacters(
  accountId: number,
  gameProfile: typeof DEFAULT_GAME_PROFILE,
): CommunityTestCharacter<PlayerClass>[];
export function buildCommunityTestCharacters(
  accountId: number,
  gameProfile: typeof MIR4_GAME_PROFILE,
): CommunityTestCharacter<Mir4ClassKey>[];
export function buildCommunityTestCharacters(
  accountId: number,
  gameProfile: GameProfile = GAME_PROFILE,
): CommunityTestCharacter[] {
  const templates = templateStates(gameProfile);
  return classesForGameProfile(gameProfile).map((cls) => {
    const state = templates.get(cls);
    if (!state) throw new Error(`missing community test template for ${cls}`);
    return { cls, name: firstValidName(accountId, cls), state: cloneState(state) };
  });
}
