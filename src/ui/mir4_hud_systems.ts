import { MIR4_GAME_PROFILE } from '../sim/game_profile';
import type { SimEvent } from '../sim/types';
import type { IWorld } from '../world_api';
import { Mir4CodexWindow } from './mir4_codex_window';
import { Mir4GrowthWindow } from './mir4_growth_window';
import { Mir4MountCodexWindow } from './mir4_mount_codex_window';
import { prepareMir4MountPreview } from './mir4_mount_preview_loader';
import { mir4MountPresentation } from './mir4_mount_visuals';
import { Mir4ResultOverlayController } from './mir4_result_overlay_controller';
import { Mir4SpiritCodexWindow } from './mir4_spirit_codex_window';
import { mir4SpiritPresentation } from './mir4_spirit_visuals';

export type Mir4HudSystem = 'mount' | 'spirit' | 'codex' | 'training';

interface WindowFocusBridge {
  captureFocus(): HTMLElement | null;
  restoreFocus(target: HTMLElement | null): void;
}

export interface Mir4HudSystemsDeps {
  world(): IWorld;
  closeOthers(selector: string): void;
  windowFocus(selector: string): WindowFocusBridge;
  confirm(title: string, body: string, onAccept: () => void): void;
  mountSharedPreview(container: HTMLElement, visualKey: string): void;
  restoreCharacterPreview(): void;
  syncWindowState(): void;
}

const SELECTORS: Readonly<Record<Mir4HudSystem, string>> = {
  mount: '#mount-sanctuary-window',
  spirit: '#spirit-sanctuary-window',
  codex: '#codex-window',
  training: '#training-window',
};

export class Mir4HudSystems {
  private readonly mountWindow: Mir4MountCodexWindow;
  private readonly spiritWindow: Mir4SpiritCodexWindow;
  private readonly codexWindow: Mir4CodexWindow;
  private readonly growthWindow: Mir4GrowthWindow;
  private readonly resultOverlay: Mir4ResultOverlayController;

  constructor(
    private readonly doc: Document,
    private readonly deps: Mir4HudSystemsDeps,
  ) {
    const root = (system: Mir4HudSystem): HTMLElement => {
      const element = this.doc.querySelector<HTMLElement>(SELECTORS[system]);
      if (!element) throw new Error(`Missing MIR4 HUD system root: ${SELECTORS[system]}`);
      return element;
    };
    const common = (system: Mir4HudSystem) => ({
      root: () => root(system),
      world: deps.world,
      closeOthers: () => deps.closeOthers(SELECTORS[system]),
      ...deps.windowFocus(SELECTORS[system]),
    });
    this.mountWindow = new Mir4MountCodexWindow({
      ...common('mount'),
      mountPreview: (container, visualKey, mountId) =>
        this.mountMountPreview(container, visualKey, mountId),
    });
    this.spiritWindow = new Mir4SpiritCodexWindow({
      ...common('spirit'),
      mountPreview: (container, visualKey, spiritId) =>
        this.mountSpiritPreview(container, visualKey, spiritId),
    });
    this.codexWindow = new Mir4CodexWindow({
      ...common('codex'),
      confirm: (title, body, onAccept) => deps.confirm(title, body, onAccept),
    });
    this.growthWindow = new Mir4GrowthWindow(common('training'));
    this.resultOverlay = new Mir4ResultOverlayController(doc, {
      mountCollectionPreview: (container, collection, collectionId) => {
        if (collection === 'mount') this.mountMountPreview(container, collectionId, collectionId);
        else this.mountSpiritPreview(container, collectionId, collectionId);
      },
      restoreCollectionPreview: () => {
        this.mountWindow.restorePreview();
        this.spiritWindow.restorePreview();
        deps.restoreCharacterPreview();
      },
    });
  }

  get collectionPreviewOpen(): boolean {
    return this.mountWindow.isOpen || this.spiritWindow.isOpen;
  }

  closeByRootId(rootId: string): boolean {
    const system = (Object.entries(SELECTORS) as [Mir4HudSystem, string][]).find(
      ([, selector]) => selector.slice(1) === rootId,
    )?.[0];
    if (!system) return false;
    this.window(system).close();
    return true;
  }

  toggle(system: Mir4HudSystem): void {
    if (this.deps.world().cfg.gameProfile !== MIR4_GAME_PROFILE) return;
    const window = this.window(system);
    if (window.isOpen) window.close();
    else window.open();
    this.deps.syncWindowState();
  }

  relocalize(): void {
    for (const window of this.windows()) window.relocalize();
  }

  refreshIfChanged(): void {
    for (const window of this.windows()) window.refreshIfChanged();
  }

  handleEvent(event: SimEvent): void {
    if (this.deps.world().cfg.gameProfile !== MIR4_GAME_PROFILE) return;
    if (event.type === 'mir4CollectionResult' || event.type === 'mir4CombinationResult') {
      if (event.collection === 'mount') this.mountWindow.refreshIfOpen(event.collectionId);
      else this.spiritWindow.refreshIfOpen(event.collectionId);
    }
    this.resultOverlay.handle(event);
  }

  private windows() {
    return [this.mountWindow, this.spiritWindow, this.codexWindow, this.growthWindow] as const;
  }

  private window(system: Mir4HudSystem) {
    if (system === 'mount') return this.mountWindow;
    if (system === 'spirit') return this.spiritWindow;
    if (system === 'codex') return this.codexWindow;
    return this.growthWindow;
  }

  private mountSpiritPreview(container: HTMLElement, visualKey: string, spiritId: string): void {
    const presentation = mir4SpiritPresentation(spiritId);
    if (!presentation || (visualKey !== spiritId && presentation.visualKey !== visualKey)) return;
    this.deps.mountSharedPreview(container, presentation.visualKey);
  }

  private mountMountPreview(container: HTMLElement, visualKey: string, mountId: string): void {
    const presentation = mir4MountPresentation(mountId);
    if (!presentation) return;
    const resolvedVisualKey = visualKey === mountId ? presentation.visualKey : visualKey;
    void prepareMir4MountPreview(
      container,
      resolvedVisualKey,
      mountId,
      undefined,
      () => this.mountWindow.isOpen,
    ).then((ready) => {
      if (ready) this.deps.mountSharedPreview(container, resolvedVisualKey);
    });
  }
}
