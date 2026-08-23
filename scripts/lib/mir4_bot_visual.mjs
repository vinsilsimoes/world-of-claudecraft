export function mir4VisualWindowLayout(count, screenWidth = 1920, screenHeight = 1080) {
  if (!Number.isSafeInteger(count) || count < 1 || count > 12) {
    throw new Error('visual bot count must be between 1 and 12');
  }
  const columns = count <= 2 ? count : Math.min(3, count);
  const rows = Math.ceil(count / columns);
  const width = Math.max(480, Math.floor(screenWidth / columns));
  const height = Math.max(360, Math.floor(screenHeight / rows));
  return Array.from({ length: count }, (_, index) => ({
    x: (index % columns) * width,
    y: Math.floor(index / columns) * height,
    width,
    height,
  }));
}

export function mir4VisualBotSnapshot(world) {
  const player = world?.player;
  if (!player) return null;
  const mir4 = world.mir4PlayerState?.() ?? null;
  return {
    id: player.id,
    lv: player.level,
    xp: world.xp,
    copper: world.copper,
    hp: player.hp,
    mhp: player.maxHp,
    dead: player.dead === true,
    gh: player.ghost === true,
    x: player.pos?.x,
    z: player.pos?.z,
    pcd: player.potionCdRemaining,
    inv: world.inventory,
    mir4,
  };
}

export function mir4VisualBotEntities(world) {
  return [...(world?.entities?.values?.() ?? [])].map((entity) => ({
    id: entity.id,
    kind: entity.kind,
    hp: entity.hp,
    dead: entity.dead === true,
    x: entity.pos?.x,
    z: entity.pos?.z,
  }));
}

export function visualBotCaption(rosterEntry, characterName) {
  return `MIR4 BOT · ${String(rosterEntry.classKey).toUpperCase()} · ${characterName}`;
}
