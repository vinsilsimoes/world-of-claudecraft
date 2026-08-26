// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/game/audio', () => ({ audio: { click: vi.fn() } }));
vi.mock('../src/ui/portrait_chip', () => ({
  hydratePortraits: vi.fn(),
  modularLookFor: vi.fn(() => null),
  onPortraitUpdate: vi.fn(),
  portraitChipHtml: vi.fn(() => '<span class="portrait-chip"></span>'),
}));

import { mir4ActionAbilities } from '../src/sim/mir4/action_abilities';
import { MIR4_EMPTY_MATERIALS } from '../src/sim/mir4/equipment';
import type { Mir4PlayerUiState } from '../src/sim/mir4/ui_state';
import { BagsWindow, type BagsWindowDeps } from '../src/ui/bags_window';
import { CharWindow, type CharWindowDeps } from '../src/ui/char_window';
import { DeedsWindow, type DeedsWindowDeps } from '../src/ui/deeds_window';
import { QuestLogWindow, type QuestLogWindowDeps } from '../src/ui/hud/quest/questlog_window';
import { ItemDragState } from '../src/ui/item_drag_state';
import { paintMir4ProgressionWindow } from '../src/ui/mir4_progression_window_adapter';
import { SpellbookWindow, type SpellbookWindowDeps } from '../src/ui/spellbook_window';
import type { IWorld } from '../src/world_api';

const MIR4_PROFILE = 'mir4-gameplay-port' as const;

function makeWorld(state: Mir4PlayerUiState) {
  const commands = {
    mir4EquipItem: vi.fn(() => 'equipped'),
    mir4UnequipSlot: vi.fn(() => 'unequipped'),
    mir4UpgradeSkill: vi.fn(),
    setMir4AutoQuest: vi.fn(),
    mir4AutoQuestActive: vi.fn(() => false),
    mir4EnhanceItem: vi.fn(),
    mir4RollItemLayer: vi.fn(),
    mir4ResolveItemLayer: vi.fn(),
    mir4CraftMaterial: vi.fn(),
    mir4CampaignProfession: vi.fn(),
    mir4ClaimAchievement: vi.fn(async () => true),
  };
  const world = {
    cfg: { gameProfile: MIR4_PROFILE, playerClass: 'warrior' },
    player: { id: 1, name: 'Asha', level: 10, skin: 0, skinCatalog: 'class' },
    copper: 1_234,
    inventory: [],
    known: mir4ActionAbilities(1, 10, undefined, 204),
    talentSpec: null,
    mir4PlayerState: () => state,
    ...commands,
  } as unknown as IWorld;
  return { world, commands };
}

const presentation = {
  itemIcon: () => '<img class="item-icon" alt="">',
  moneyHtml: (copper: number) => `<span>${copper}</span>`,
  itemTooltip: () => '',
  attachTooltip: vi.fn(),
};

function bagsDeps(root: HTMLElement, world: IWorld): BagsWindowDeps {
  return {
    ...presentation,
    root: () => root,
    world: () => world,
    wocBalanceHtml: () => '',
    claudiumLauncherHtml: () => '',
    openClaudium: vi.fn(),
    openWallet: vi.fn(),
    hideTooltip: vi.fn(),
    consumePeek: () => false,
    cancelPetFeed: vi.fn(),
    captureFocus: () => null,
    restoreFocus: vi.fn(),
    renderCharIfOpen: vi.fn(),
    vendorOpen: () => false,
    tradeOpen: () => false,
    isMarketSell: () => false,
    isMailAttach: () => false,
    isBankOpen: () => false,
    isPersonalBankTab: () => false,
    isGuildBankTab: () => false,
    pendingPetFeed: () => false,
    closeVendor: vi.fn(),
    closeBank: vi.fn(),
    onClosed: vi.fn(),
    addItemToTrade: vi.fn(),
    stageMarketSell: vi.fn(),
    stageMailParcel: vi.fn(),
    insertItemChatLink: vi.fn(),
    showError: vi.fn(),
    setPendingPetFeed: vi.fn(),
    resetPetBarSig: vi.fn(),
    useGatherTool: () => false,
    isHotbarItemId: () => false,
    setDragAction: vi.fn(),
    clearActionDropTargets: vi.fn(),
    dragState: new ItemDragState(),
    isTouchHud: () => false,
    markEquipDropTargets: vi.fn(),
    dropOnEquipSlot: vi.fn(),
    dropOnActionSlot: vi.fn(),
    dropOnActionRingSlot: vi.fn(),
    openItemActionMenu: vi.fn(),
  };
}

function charDeps(root: HTMLElement, world: IWorld): CharWindowDeps {
  return {
    ...presentation,
    root: () => root,
    world: () => world,
    closeOthers: vi.fn(),
    hideTooltip: vi.fn(),
    captureFocus: () => null,
    restoreFocus: vi.fn(),
    slotName: (slot) => slot,
    statCellHtml: () => '',
    statTooltipHtml: () => '',
    talentSummaryHtml: () => '',
    progressionHtml: () => '',
    unequip: vi.fn(),
    beginUnequipDrag: vi.fn(),
    endUnequipDrag: vi.fn(),
    renderPreview: vi.fn(),
    renderSkinPicker: vi.fn(),
    openPlayerCard: vi.fn(),
    openPrestige: vi.fn(),
    openDeeds: vi.fn(),
    openReliquary: vi.fn(),
    dragState: new ItemDragState(),
    renderBags: vi.fn(),
    showError: vi.fn(),
    helmHidden: () => false,
    toggleHelm: vi.fn(),
    playtimeVisible: () => true,
    togglePlaytimeVisible: vi.fn(),
  };
}

beforeEach(() => {
  document.body.replaceChildren();
  presentation.attachTooltip.mockClear();
  let canvasContext: unknown;
  canvasContext = new Proxy({}, { get: () => () => canvasContext, set: () => true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext as never);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,stub');
});

describe('MIR4 content reaches the existing Aeldrune windows', () => {
  it('routes the existing BagsWindow root and its item click to IWorldMir4', () => {
    const state: Mir4PlayerUiState = {
      classId: 1,
      ultimateGauge: 0,
      mir4Currencies: { darksteel: 450, energy: 12_500 },
      mir4EquipmentInstances: {
        991020101: { itemId: 991020101, enhancement: 2 },
      },
    };
    const { world, commands } = makeWorld(state);
    const root = document.createElement('section');
    root.id = 'bags';
    document.body.appendChild(root);

    new BagsWindow(bagsDeps(root, world)).render();

    expect(root.querySelector('.mir4-bag-scroll')).not.toBeNull();
    expect(root.querySelector('.bag-filter-bar')).toBeNull();
    expect(
      [...root.querySelectorAll('.bag-section-header')].some(
        (header) => header.textContent === 'Currencies',
      ),
    ).toBe(true);
    expect(root.textContent).toContain('12,500');
    const energy = root.querySelector<HTMLElement>('[data-mir4-currency="energy"]');
    expect(energy).not.toBeNull();
    expect(energy?.getAttribute('aria-label')).toContain('Energy');
    expect(energy?.getAttribute('aria-label')).toContain('12,500');
    const energyTooltip = presentation.attachTooltip.mock.calls.find(
      ([element]) => element === energy,
    )?.[1];
    expect(energyTooltip?.()).toContain('Energy');
    expect(energyTooltip?.()).toContain('12,500');
    root.querySelector<HTMLButtonElement>('[data-focus-key="mir4-item:991020101"]')?.click();
    expect(commands.mir4EquipItem).toHaveBeenCalledWith(991020101);
  });

  it('routes the existing CharWindow root and unequip control to IWorldMir4', () => {
    const state: Mir4PlayerUiState = {
      classId: 1,
      ultimateGauge: 35,
      mir4Equipment: { 1: 991010101 },
      mir4EquipmentInstances: {
        991010101: { itemId: 991010101, enhancement: 1 },
      },
    };
    const { world, commands } = makeWorld(state);
    const root = document.createElement('section');
    root.id = 'char-window';
    document.body.appendChild(root);

    const window = new CharWindow(charDeps(root, world));
    window.toggle();

    expect(root.style.display).toBe('block');
    expect(root.querySelectorAll('.equip-slot')).toHaveLength(8);
    expect(root.querySelector('.char-honor-balance')).toBeNull();
    root.querySelector<HTMLButtonElement>('[data-act="mir4-unequip-1"]')?.click();
    expect(commands.mir4UnequipSlot).toHaveBeenCalledWith(1);
  });

  it('routes the existing QuestLogWindow root and auto-journey button to IWorldMir4', () => {
    const state: Mir4PlayerUiState = {
      classId: 1,
      ultimateGauge: 0,
      mir4Quests: {
        mir4_m01_q01: { state: 'active', inspected: [0] },
      },
    };
    const { world, commands } = makeWorld(state);
    const root = document.createElement('section');
    root.id = 'quest-log';
    document.body.appendChild(root);
    const deps: QuestLogWindowDeps = {
      ...presentation,
      root: () => root,
      world: () => world,
      closeOthers: vi.fn(),
      captureFocus: () => null,
      restoreFocus: vi.fn(),
      hideTooltip: vi.fn(),
      focusFirstInteractive: vi.fn(),
      confirmDialog: vi.fn(),
      insertQuestChatLink: vi.fn(),
    };

    const window = new QuestLogWindow(deps);
    window.toggle();

    expect(root.style.display).toBe('block');
    expect(root.querySelector('.ql-item')?.textContent).toContain('First Traces');
    root.querySelector<HTMLButtonElement>('.ql-detail-actions .btn')?.click();
    expect(commands.setMir4AutoQuest).toHaveBeenCalledWith(true, 'mir4_m01_q01');
  });

  it('repaints an open MIR4 quest log only after the authoritative auto-journey echo', () => {
    const state: Mir4PlayerUiState = {
      classId: 1,
      ultimateGauge: 0,
      mir4Quests: {
        mir4_m01_q01: { state: 'active', inspected: [0] },
      },
    };
    const { world, commands } = makeWorld(state);
    const root = document.createElement('section');
    root.id = 'quest-log';
    document.body.appendChild(root);
    const window = new QuestLogWindow({
      ...presentation,
      root: () => root,
      world: () => world,
      closeOthers: vi.fn(),
      captureFocus: () => null,
      restoreFocus: vi.fn(),
      hideTooltip: vi.fn(),
      focusFirstInteractive: vi.fn(),
      confirmDialog: vi.fn(),
      insertQuestChatLink: vi.fn(),
    });
    window.toggle();

    const start = root.querySelector<HTMLButtonElement>('.ql-detail-actions .btn');
    expect(start?.textContent).toContain('Start auto journey');
    expect(start?.getAttribute('aria-pressed')).toBe('false');
    start?.focus();
    start?.click();

    expect(commands.setMir4AutoQuest).toHaveBeenCalledWith(true, 'mir4_m01_q01');
    expect(root.querySelector('.ql-detail-actions .btn')?.textContent).toContain(
      'Start auto journey',
    );
    expect(root.querySelector('.ql-detail-actions .btn')?.getAttribute('aria-pressed')).toBe(
      'false',
    );

    state.mir4AutoQuest = {
      questId: 'mir4_m01_q01',
      phase: 'to-site',
      siteIndex: 0,
      suspended: false,
      battleOwned: false,
    };
    window.refreshIfChanged();

    const stop = root.querySelector<HTMLButtonElement>('.ql-detail-actions .btn');
    expect(stop?.textContent).toContain('Stop auto journey');
    expect(stop?.getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(stop);

    window.refreshIfChanged();
    expect(root.querySelector('.ql-detail-actions .btn')).toBe(stop);
  });

  it('routes the existing SpellbookWindow skill controls to the MIR4 facet and shared action bar', () => {
    const state: Mir4PlayerUiState = {
      classId: 1,
      ultimateGauge: 0,
      mir4SkillResources: { effectPoints: 800, skillTomes: 6 },
      mir4Materials: { ...MIR4_EMPTY_MATERIALS, knowledgeTomeCommon: 1 },
    };
    const { world, commands } = makeWorld(state);
    (world as { copper: number }).copper = 10_000;
    const root = document.createElement('section');
    root.id = 'spellbook';
    document.body.appendChild(root);
    const addToBar = vi.fn(() => true);
    const deps: SpellbookWindowDeps = {
      root: () => root,
      world: () => world,
      closeOthers: vi.fn(),
      captureFocus: () => null,
      restoreFocus: vi.fn(),
      hideTooltip: vi.fn(),
      attachTooltip: vi.fn(),
      abilitySummary: (known) => `${known.cost} MP`,
      abilityTooltip: () => '',
      barActions: () => [],
      hasFreeSlot: () => true,
      attackOnBar: () => false,
      setAttackOnBar: vi.fn(),
      addToBar,
      removeFromBar: vi.fn(() => true),
      openBarEditor: vi.fn(),
      hasFormBars: () => false,
      resetFormBar: vi.fn(),
      setDragAction: vi.fn(),
      clearActionDropTargets: vi.fn(),
    };

    const window = new SpellbookWindow(deps);
    window.toggle();

    const abilityRows = [...root.querySelectorAll<HTMLElement>('.spell-row[data-ability-id]')];
    expect(root.style.display).toBe('block');
    expect(root.textContent).not.toContain('Auto Battle');
    expect(abilityRows.length).toBeGreaterThan(0);
    expect(abilityRows.every((row) => row.dataset.abilityId?.startsWith('mir4_'))).toBe(true);
    expect(root.textContent).not.toContain('Heroic Strike');
    expect(root.querySelectorAll('.spell-upgrade-btn')).toHaveLength(2);
    expect(root.textContent).toContain('Trainable at level 20');
    expect(root.textContent).toContain('Common Tome of Knowledge: 1/1');
    const upgrade = abilityRows[0]?.querySelector<HTMLButtonElement>('.spell-upgrade-btn');
    expect(upgrade?.disabled).toBe(false);
    expect(upgrade?.textContent).toContain('Rank 2');
    expect(upgrade?.getAttribute('aria-label')).toContain('Void Strike');
    upgrade?.click();
    expect(commands.mir4UpgradeSkill).toHaveBeenCalledWith(1102, 1);
    state.mir4Materials = { ...MIR4_EMPTY_MATERIALS };
    const clock = vi.spyOn(performance, 'now').mockReturnValue(1_000_000);
    window.tickOpen();
    clock.mockRestore();
    expect(
      root.querySelector<HTMLButtonElement>('.spell-upgrade-btn[data-ability-id="mir4_skill_1102"]')
        ?.disabled,
    ).toBe(true);
    abilityRows[0]?.querySelector<HTMLButtonElement>('.spell-hotbar-toggle')?.click();
    expect(addToBar).toHaveBeenCalledWith(abilityRows[0]?.dataset.abilityId);
  });

  it('keeps the existing Deeds claim pending through repaint, then recovers a refused send', async () => {
    const state: Mir4PlayerUiState = {
      classId: 1,
      ultimateGauge: 0,
      mir4AchievementClears: {},
      mir4Currencies: { darksteel: 0, energy: 0 },
      mir4SkillResources: { effectPoints: 0, skillTomes: 0 },
      mir4Materials: { ...MIR4_EMPTY_MATERIALS },
    };
    const { world, commands } = makeWorld(state);
    const root = document.createElement('section');
    root.id = 'deeds-window';
    document.body.appendChild(root);
    const deps: DeedsWindowDeps = {
      ...presentation,
      root: () => root,
      world: () => world,
      closeOthers: vi.fn(),
      hideTooltip: vi.fn(),
      consumePeek: () => false,
      captureFocus: () => null,
      restoreFocus: vi.fn(),
      onWatchChanged: vi.fn(),
    };

    const window = new DeedsWindow(deps);
    window.open();

    expect(root.style.display).toBe('flex');
    expect(root.textContent).toContain('Achievements');
    expect(root.textContent).toContain('1 Common Knowledge Tome');
    expect(root.querySelector('.deed-search')).toBeNull();
    const close = root.querySelector<HTMLButtonElement>('[data-close]');
    close?.focus();
    state.mir4Materials = { ...MIR4_EMPTY_MATERIALS, knowledgeTomeCommon: 1 };
    window.refreshIfChanged();
    expect(root.querySelector('.deeds-summary')?.textContent).toContain('Common Knowledge Tomes 1');
    expect(document.activeElement).toBe(root.querySelector('[data-close]'));
    commands.mir4ClaimAchievement.mockResolvedValueOnce(false);
    let firstClaim = root.querySelector<HTMLButtonElement>('[data-achievement-claim="20101"]');
    if (!firstClaim) throw new Error('missing first MIR4 achievement claim');
    firstClaim.focus();
    firstClaim.click();
    expect(commands.mir4ClaimAchievement).toHaveBeenCalledWith(20101);
    expect(document.activeElement).toBe(root.querySelector('[data-close]'));
    window.refreshIfChanged();
    firstClaim = root.querySelector<HTMLButtonElement>('[data-achievement-claim="20101"]');
    if (!firstClaim) throw new Error('missing pending MIR4 achievement claim');
    expect(firstClaim.disabled).toBe(true);

    await Promise.resolve();
    window.refreshIfChanged();
    firstClaim = root.querySelector<HTMLButtonElement>('[data-achievement-claim="20101"]');
    if (!firstClaim) throw new Error('missing recovered MIR4 achievement claim');
    expect(firstClaim.disabled).toBe(false);

    firstClaim.focus();
    firstClaim.click();
    expect(commands.mir4ClaimAchievement).toHaveBeenCalledTimes(2);
    await Promise.resolve();
    window.refreshIfChanged();
    expect(
      root.querySelector<HTMLButtonElement>('[data-achievement-claim="20101"]')?.disabled,
    ).toBe(true);

    state.mir4AchievementClears = { 201: 1 };
    state.mir4Currencies = { darksteel: 1_000, energy: 0 };
    window.refreshIfChanged();
    expect(document.activeElement).toBe(
      root.querySelector<HTMLButtonElement>('[data-achievement-claim="20102"]'),
    );
  });

  it('re-enables a Deeds claim when an accepted command receives no snapshot echo', async () => {
    vi.useFakeTimers();
    try {
      const state: Mir4PlayerUiState = {
        classId: 1,
        ultimateGauge: 0,
        mir4AchievementClears: {},
        mir4Currencies: { darksteel: 0, energy: 0 },
        mir4SkillResources: { effectPoints: 0, skillTomes: 0 },
      };
      const { world, commands } = makeWorld(state);
      commands.mir4ClaimAchievement.mockResolvedValueOnce(false);
      const root = document.createElement('section');
      root.id = 'deeds-window';
      document.body.appendChild(root);
      const window = new DeedsWindow({
        ...presentation,
        root: () => root,
        world: () => world,
        closeOthers: vi.fn(),
        hideTooltip: vi.fn(),
        consumePeek: () => false,
        captureFocus: () => null,
        restoreFocus: vi.fn(),
        onWatchChanged: vi.fn(),
      });
      window.open();

      root.querySelector<HTMLButtonElement>('[data-achievement-claim="20101"]')?.click();
      await Promise.resolve();
      window.refreshIfChanged();
      expect(
        root.querySelector<HTMLButtonElement>('[data-achievement-claim="20101"]')?.disabled,
      ).toBe(false);

      vi.advanceTimersByTime(1_000);
      root.querySelector<HTMLButtonElement>('[data-achievement-claim="20101"]')?.click();
      await Promise.resolve();
      window.refreshIfChanged();
      expect(
        root.querySelector<HTMLButtonElement>('[data-achievement-claim="20101"]')?.disabled,
      ).toBe(true);

      // The first request's stale timeout must not clear the retried request.
      vi.advanceTimersByTime(5_000);
      window.refreshIfChanged();
      expect(
        root.querySelector<HTMLButtonElement>('[data-achievement-claim="20101"]')?.disabled,
      ).toBe(true);

      vi.advanceTimersByTime(1_000);
      window.refreshIfChanged();
      expect(
        root.querySelector<HTMLButtonElement>('[data-achievement-claim="20101"]')?.disabled,
      ).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('routes the existing crafting root and material recipe button to IWorldMir4', () => {
    const { world, commands } = makeWorld({
      classId: 1,
      ultimateGauge: 0,
      mir4Materials: {
        ...MIR4_EMPTY_MATERIALS,
        sunStone: 10,
        moonStone: 10,
        solarScroll: 10,
        lunarSeal: 10,
        dawnTear: 10,
        solarWard: 10,
      },
    });
    (world as { copper: number }).copper = 100_000;
    const root = document.createElement('section');
    root.id = 'crafting-window';
    document.body.appendChild(root);
    const repaint = () =>
      paintMir4ProgressionWindow({
        ...presentation,
        root,
        world,
        close: vi.fn(),
        hideTooltip: vi.fn(),
        afterMutation: vi.fn(),
        announce: vi.fn(),
      });

    expect(repaint()).toBe(true);
    root.querySelector<HTMLButtonElement>('[data-tab="crafting"]')?.click();
    expect(root.dataset.mir4ProgressionTab).toBe('crafting');
    expect(root.querySelector('.crafting-tabs')).not.toBeNull();
    const recipe = root.querySelector<HTMLButtonElement>('[data-recipe]');
    expect(recipe?.disabled).toBe(false);
    const recipeId = recipe?.dataset.recipe;
    recipe?.click();
    expect(commands.mir4CraftMaterial).toHaveBeenCalledWith(recipeId);
  });
});
