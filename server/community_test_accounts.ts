// Off-by-default account provisioning for community test realms. This module owns
// the immutable character templates and generated-name policy; db.ts owns the
// transaction that inserts them. The templates are built through public Sim APIs
// so level, derived stats, equipment rules, bags, and persistence stay canonical.
//
// Gear: each template wears the TRUE best-in-slot PvE kit for its class's
// primary role and carries every alternate role's kit in four best-in-game
// bags, riding trained and Nythraxis-attuned, via the shared boost kit
// (server/pbe_boost.ts applyBoostKitToPlayer). The original hand-curated
// WARFARE (honor vendor) loadouts were retired 2026-07-22: their PvP-budgeted
// stats are exactly what endgame PvE testers should not be wearing (the
// S-raid playtest ran in them), and one shared kit source cannot drift.

import { MIR4_CLASSES, MIR4_MAX_LEVEL } from '../src/sim/content/mir4';
import { MIR4_EQUIPMENT_CATALOG } from '../src/sim/content/mir4/equipment_catalog';
import { DEFAULT_GAME_PROFILE, type GameProfile, MIR4_GAME_PROFILE } from '../src/sim/game_profile';
import { grantMir4ArcLogicalItem } from '../src/sim/mir4/arc_rewards';
import { type CharacterState, Sim } from '../src/sim/sim';
import {
  ALL_CLASSES,
  ALL_EQUIP_SLOTS,
  MAX_LEVEL,
  type Mir4ClassKey,
  type PlayableClass,
  type PlayerClass,
} from '../src/sim/types';
import { validCharName } from './auth';
import { applyBoostKitToPlayer } from './pbe_boost';

const TEMPLATE_SEED = 20061;
const NAME_TOKEN_LENGTH = 8;
export const GENERATED_NAME_ATTEMPTS = 32;

export interface CommunityTestCharacter<TClass extends PlayableClass = PlayableClass> {
  readonly cls: TClass;
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

function mir4BestInSlot(classId: number) {
  const bySlot = new Map<number, (typeof MIR4_EQUIPMENT_CATALOG)[number]>();
  for (const item of MIR4_EQUIPMENT_CATALOG) {
    if (item.classId !== classId || item.requiredLevel > MIR4_MAX_LEVEL) continue;
    const current = bySlot.get(item.equipSlot);
    if (
      !current ||
      item.catalogRank > current.catalogRank ||
      (item.catalogRank === current.catalogRank && item.itemId > current.itemId)
    ) {
      bySlot.set(item.equipSlot, item);
    }
  }
  return [...bySlot.values()].sort((left, right) => left.equipSlot - right.equipSlot);
}

function templateStates(profile: GameProfile): ReadonlyMap<PlayableClass, CharacterState> {
  const cached = cachedTemplates.get(profile);
  if (cached) return cached;
  const sim = new Sim({
    seed: TEMPLATE_SEED,
    playerClass: 'warrior',
    noPlayer: true,
    gameProfile: profile,
  });
  const templates = new Map<PlayableClass, CharacterState>();
  const classes =
    profile === MIR4_GAME_PROFILE ? MIR4_CLASSES.map((entry) => entry.key) : ALL_CLASSES;
  for (const cls of classes) {
    // bot: this throwaway template Sim's mail book is discarded, but the flag
    // keeps the no-mail-for-synthetic-players rule uniform across every
    // non-player addPlayer site (the flip itself is unchanged: templates
    // already carried mailWelcomed true into cloned characters).
    const pid = sim.addPlayer(cls, `${cls}template`, { bot: true });
    sim.setPlayerLevel(profile === MIR4_GAME_PROFILE ? MIR4_MAX_LEVEL : MAX_LEVEL, pid);
    if (profile === MIR4_GAME_PROFILE) {
      const meta = sim.players.get(pid);
      const classId = sim.entities.get(pid)?.mir4?.classId;
      if (!meta || classId === undefined) {
        throw new Error(`missing MIR4 community test player state for ${cls}`);
      }
      for (const item of mir4BestInSlot(classId)) {
        grantMir4ArcLogicalItem(meta, String(item.itemId), 1);
        const result = sim.mir4EquipItem(item.itemId, pid);
        if (!result.endsWith('equipped.')) {
          throw new Error(`failed to equip MIR4 community test item ${item.itemId}: ${result}`);
        }
      }
      if (Object.keys(meta.mir4Equipment ?? {}).length !== 8) {
        throw new Error(`incomplete MIR4 community test equipment for ${cls}`);
      }
    }
    // Remove starter gear before applying the kit. With live offhands and
    // dual wielding, leaving it equipped can route the intended mainhand into
    // the offhand or retain an obsolete shield beside a two-hander.
    if (profile !== MIR4_GAME_PROFILE) {
      for (const slot of ALL_EQUIP_SLOTS) sim.unequipItem(slot, pid);
      // The shared boost kit: bags, the primary role's true-BiS kit equipped,
      // every alternate role's kit in the bags, riding, and the attunement. The
      // kit-version stamp it writes also tells the world-join top-up these
      // characters are already current.
      if (!applyBoostKitToPlayer(sim, pid)) {
        throw new Error(`boost kit did not apply to community test template for ${cls}`);
      }
    }
    // Equipment can raise maximum health and mana, so refill through the same
    // authoritative level path after the final stat recalculation.
    sim.setPlayerLevel(profile === MIR4_GAME_PROFILE ? MIR4_MAX_LEVEL : MAX_LEVEL, pid);
    const state = sim.serializeCharacter(pid);
    if (!state) throw new Error(`failed to build community test template for ${cls}`);
    templates.set(cls, state);
  }
  cachedTemplates.set(profile, templates);
  return templates;
}

/** Build and cache pristine templates before opening an account transaction. */
export function prepareCommunityTestCharacters(profile: GameProfile = DEFAULT_GAME_PROFILE): void {
  templateStates(profile);
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
  const prefix = `${cls[0].toUpperCase()}${cls.slice(1)}`.slice(0, 16 - NAME_TOKEN_LENGTH);
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
  profile: typeof DEFAULT_GAME_PROFILE,
): CommunityTestCharacter<PlayerClass>[];
export function buildCommunityTestCharacters(
  accountId: number,
  profile: typeof MIR4_GAME_PROFILE,
): CommunityTestCharacter<Mir4ClassKey>[];
export function buildCommunityTestCharacters(
  accountId: number,
  profile: GameProfile,
): CommunityTestCharacter[];
export function buildCommunityTestCharacters(
  accountId: number,
  profile: GameProfile = DEFAULT_GAME_PROFILE,
): CommunityTestCharacter[] {
  const templates = templateStates(profile);
  const classes =
    profile === MIR4_GAME_PROFILE ? MIR4_CLASSES.map((entry) => entry.key) : ALL_CLASSES;
  return classes.map((cls) => {
    const state = templates.get(cls);
    if (!state) throw new Error(`missing community test template for ${cls}`);
    return { cls, name: firstValidName(accountId, cls), state: cloneState(state) };
  });
}
