import {
  type Mir4TutorialRequirement,
  mir4ArcTutorialGuidance,
} from '../../../sim/content/mir4/arc_tutorial_guidance';
import { QUESTS } from '../../../sim/data';
import { MIR4_GAME_PROFILE } from '../../../sim/game_profile';
import { questObjectiveRequired } from '../../../sim/types';
import type { IWorld } from '../../../world_api';
import { esc } from '../../esc';
import { formatNumber, type TranslationKey, t } from '../../i18n';
import { ownEntry } from '../../known_item';
import { mir4QuestObjectiveLabel, mir4QuestTitle } from '../../mir4_quest_i18n';
import type { PainterHostWriters } from '../../painter_host';
import { buildQuestStrip, type QuestStripController } from './quest_strip_controller';
import { type QuestTrackerView, questTrackerView, type TrackedQuest } from './quest_tracker';

export interface QuestTrackerSettingsPort {
  available(): boolean;
  collapsed(): boolean;
  setCollapsed(collapsed: boolean): void;
}

export interface QuestTrackerControllerDeps {
  /** Hud's shared write-elision facet, forwarded to the touch strip so its
   *  band-driven writes elide against the same cache as every other HUD write. */
  writers: PainterHostWriters;
  element: HTMLElement;
  document: Document;
  world(): Pick<
    IWorld,
    | 'cfg'
    | 'mir4AcknowledgeTutorial'
    | 'mir4AutoQuestActive'
    | 'mir4QuestTrackerEntries'
    | 'questLog'
    | 'setMir4AutoQuest'
  >;
  settings: QuestTrackerSettingsPort;
  questTitle(questId: string): string;
  objectiveLabel(questId: string, objectiveIndex: number): string;
  openQuest(questId: string): void;
  shortcut(action: string): string;
  click(): void;
}

const TUTORIAL_DESTINATION_KEYS: Readonly<Record<string, TranslationKey>> = {
  bags: 'itemUi.bags.title',
  char: 'hud.keybinds.actions.char',
  crafting: 'hudChrome.crafting.title',
  dfinder: 'hudChrome.finder.title',
  map: 'hud.keybinds.actions.map',
  questlog: 'questUi.log.title',
};

const TUTORIAL_REQUIREMENT_KEYS: Readonly<Record<string, TranslationKey>> = {
  dawnTear: 'hudChrome.mir4.materials.dawnTear',
  lunarSeal: 'hudChrome.mir4.materials.lunarSeal',
  moonStone: 'hudChrome.mir4.materials.moonStone',
  solarScroll: 'hudChrome.mir4.materials.solarScroll',
  solarWard: 'hudChrome.mir4.materials.solarWard',
  sunStone: 'hudChrome.mir4.materials.sunStone',
  'mount-ticket-dawn': 'hudChrome.mir4.mountTicketDawn',
  'spirit-ticket-dawn': 'hudChrome.mir4.spiritTicketDawn',
};

/** Owns quest tracker projection, collapse persistence, and elided DOM updates.
 *  The projection has TWO presentations: this right-anchored tracker on desktop,
 *  and the top-band strip on touch, which is handed the same TrackedQuest[]
 *  rather than projecting the log a second time. */
export class QuestTrackerController {
  private readonly strip: QuestStripController | null;
  private tutorialLauncher: HTMLElement | null = null;
  /** The last frame time Hud handed down. The collapse toggle re-renders off a
   *  user gesture rather than a frame, so it reuses it instead of minting a
   *  clock here; the strip's grace is measured in seconds and cannot see the
   *  one-tick staleness. */
  private lastNow = 0;

  constructor(private readonly deps: QuestTrackerControllerDeps) {
    this.strip = buildQuestStrip({ writers: deps.writers, click: () => this.deps.click() });
  }

  /** Language switch: the desktop rows already re-resolve unconditionally in
   *  renderHtml, but the strip is gated on a raw pre-resolve key that a locale
   *  switch alone cannot move, so it needs its own nudge. Bumping the strip's
   *  generation first, then rebuilding the tracked quests so their titles and
   *  objective labels re-resolve too, covers both halves in one call. */
  relocalize(): void {
    this.strip?.relocalize();
    this.update(this.lastNow);
  }

  update(now: number): void {
    this.lastNow = now;
    let collapsed = this.deps.settings.collapsed();
    const quests: TrackedQuest[] = [];
    const world = this.deps.world();
    if (world.cfg?.gameProfile === MIR4_GAME_PROFILE) {
      for (const entry of world.mir4QuestTrackerEntries()) {
        let label = mir4QuestObjectiveLabel({
          questId: entry.id,
          kind: entry.objective.kind,
          stageKind: entry.objective.stageKind,
          stageIndex: entry.objective.stageIndex,
          ready: entry.complete,
        });
        if (entry.autoJourneySuspended) {
          label += ` ${t('hudChrome.questTracker.mir4.pausedSuffix')}`;
        }
        quests.push({
          id: entry.id,
          number: quests.length + 1,
          title: mir4QuestTitle(entry.id),
          complete: entry.complete,
          ...(entry.autoJourneyAvailable !== false
            ? {
                pressed: entry.autoJourneyActive,
                actionHint: t(
                  entry.autoJourneyActive
                    ? 'hudChrome.questTracker.mir4.stopAutoJourney'
                    : 'hudChrome.questTracker.mir4.startAutoJourney',
                ),
              }
            : {}),
          ...(entry.objective.stageKind === 'system-tutorial' ? this.tutorialView(entry.id) : {}),
          objectives: [{ ...entry.objective, label }],
        });
      }
    } else
      for (const progress of world.questLog.values()) {
        // The log is SERVER truth: a quest id accepted on a current client can
        // reach a bundle that predates it (stale-client guard, R34), and the
        // tracker runs inside hud.update() every frame, so an unguarded deref
        // here killed the whole HUD tail. The unknown entry still PUSHES (raw
        // id as its title, no objectives): the tracker numbers must match the
        // world map's badges, and the map numbers every log entry, so a skip
        // here would silently desync every number after it.
        const quest = ownEntry(QUESTS, progress.questId);
        quests.push({
          id: progress.questId,
          number: quests.length + 1,
          // The unknown title SAYS unknown (a localizable sentence carrying the
          // raw id) instead of handing the player a bare content slug; the raw
          // id stays present so the row still matches a bug report.
          title: quest
            ? this.deps.questTitle(progress.questId)
            : t('questUi.tracker.unknownQuest', { id: progress.questId }),
          complete: progress.state === 'ready',
          objectives: quest
            ? quest.objectives.map((_objective, objectiveIndex) => ({
                label: this.deps.objectiveLabel(progress.questId, objectiveIndex),
                current: progress.counts[objectiveIndex],
                total: questObjectiveRequired(quest, progress, objectiveIndex),
              }))
            : [],
        });
      }
    if (collapsed && quests.length === 0 && this.deps.settings.available()) {
      this.deps.settings.setCollapsed(false);
      collapsed = false;
    }
    const tutorialActive = quests.some((quest) => quest.tutorial !== undefined);
    this.deps.writers.toggleClass(
      this.deps.element,
      'mir4-tutorial-active',
      tutorialActive,
    );
    // On touch the strip IS the tracker: the right-anchored markup is hidden in
    // hud.mobile.css, so rendering it would be a string build a phone never sees.
    // MIR4 system tutorials are the exception: their step-by-step guide and
    // launcher cannot be compressed into the ordinary single-quest strip.
    if (this.strip?.active() === true && !tutorialActive) {
      this.strip.update(quests, now);
      if (this.deps.element.innerHTML !== '') this.deps.element.innerHTML = '';
      this.highlightTutorialLauncher(null);
      return;
    }
    if (tutorialActive) this.strip?.update([], now);
    const html = this.renderHtml(questTrackerView(quests, collapsed));
    if (this.deps.element.innerHTML !== html) this.deps.element.innerHTML = html;
    this.highlightTutorialLauncher(
      collapsed ? null : (quests.find((quest) => quest.tutorial)?.tutorial?.launcherId ?? null),
    );
  }

  toggleCollapsed(): void {
    if (!this.deps.settings.available()) return;
    const active = this.deps.document.activeElement as HTMLElement | null;
    const refocus = active?.classList.contains('qt-header') === true;
    this.deps.settings.setCollapsed(!this.deps.settings.collapsed());
    this.deps.click();
    this.update(this.lastNow);
    if (refocus) this.deps.element.querySelector<HTMLElement>('.qt-header')?.focus();
  }

  handleClick(target: HTMLElement): void {
    const tutorial = target.closest<HTMLElement>('[data-tutorial-quest]');
    if (tutorial?.dataset.tutorialQuest) {
      this.openTutorialDestination(tutorial.dataset.tutorialQuest);
      return;
    }
    if (target.closest('.qt-header')) this.toggleCollapsed();
    const row = target.closest<HTMLElement>('.qt-title');
    if (row?.dataset.quest) this.activateQuest(row.dataset.quest);
  }

  activateQuest(questId: string): void {
    const world = this.deps.world();
    if (world.cfg?.gameProfile === MIR4_GAME_PROFILE) {
      const entry = world.mir4QuestTrackerEntries().find((candidate) => candidate.id === questId);
      if (entry?.autoJourneyAvailable !== false) {
        world.setMir4AutoQuest(!entry?.autoJourneyActive, questId);
        this.deps.click();
        this.update(this.lastNow);
      } else this.deps.openQuest(questId);
      return;
    }
    this.deps.openQuest(questId);
  }

  openTutorialDestination(questId: string): void {
    const guidance = mir4ArcTutorialGuidance(questId);
    if (!guidance?.launcherId) return;
    if (guidance.tab) {
      const crafting = this.deps.document.getElementById('crafting-window');
      if (crafting) crafting.dataset.mir4ProgressionTab = guidance.tab;
    }
    const launcher = this.deps.document.getElementById(guidance.launcherId);
    if (!launcher) return;
    launcher.click();
    this.deps.world().mir4AcknowledgeTutorial(questId);
    this.deps.click();
  }

  private renderHtml(view: QuestTrackerView): string {
    if (!view.visible) return '';
    const chevron = view.collapsed ? '▸' : '▾';
    const count = view.collapsed
      ? ` <span class="qt-count">${esc(t('hudChrome.questTracker.count', { count: this.number(view.count) }))}</span>`
      : '';
    const hint = esc(
      t(
        view.collapsed
          ? 'hudChrome.questTracker.expandHint'
          : 'hudChrome.questTracker.collapseHint',
      ),
    );
    const header =
      `<button type="button" class="qt-header" aria-expanded="${!view.collapsed}" aria-controls="qt-list" title="${hint}">` +
      `<span class="qt-chevron" aria-hidden="true">${chevron}</span>` +
      `<span class="qt-h-label">${esc(t('questUi.tracker.title'))}</span>${count}</button>`;
    let rows = '';
    for (const quest of view.quests) {
      const action = quest.openable
        ? ` role="button" tabindex="0" data-quest="${esc(quest.id)}"${quest.pressed === undefined ? '' : ` aria-pressed="${quest.pressed}"`}${quest.actionHint ? ` title="${esc(quest.actionHint)}" aria-label="${esc(`${quest.title}. ${quest.actionHint}`)}"` : ''}`
        : '';
      rows += `<div class="qt-title"${action}><span class="qt-num">${esc(this.number(quest.number))}</span>${esc(quest.title)}${quest.complete ? ` <span class="quest-complete">(${esc(t('questUi.tracker.complete'))})</span>` : ''}</div>`;
      for (const objective of quest.objectives) {
        rows += `<div class="qt-obj${objective.done ? ' done' : ''}">- ${esc(this.progressText(objective.label, objective.current, objective.total))}</div>`;
      }
      if (quest.tutorial) {
        const tutorial = quest.tutorial;
        const shortcut = tutorial.shortcut ? ` (${tutorial.shortcut})` : '';
        const requirements = tutorial.requirements.length
          ? `<div class="qt-tutorial-requirements">${tutorial.requirements.map((requirement) => `<span>${esc(requirement)}</span>`).join('')}</div>`
          : '';
        rows += `<div class="qt-tutorial" id="mir4-tutorial-guide"><div class="qt-tutorial-title">${esc(t('hudChrome.mir4.campaign.objective.tutorial'))}</div><ol>${tutorial.steps.map((step) => `<li>${esc(step)}</li>`).join('')}</ol>${requirements}<button type="button" class="btn qt-tutorial-open" data-tutorial-quest="${esc(quest.id)}"${tutorial.tab ? ` data-tutorial-tab="${esc(tutorial.tab)}"` : ''}>${esc(`${tutorial.destination}${shortcut}`)}</button></div>`;
      }
    }
    return `${header}<div id="qt-list">${rows}</div>`;
  }

  private tutorialView(questId: string): Pick<TrackedQuest, 'tutorial'> | Record<string, never> {
    const guidance = mir4ArcTutorialGuidance(questId);
    if (!guidance?.launcherId || !guidance.shortcutAction) return {};
    const destinationKey = TUTORIAL_DESTINATION_KEYS[guidance.shortcutAction];
    return {
      tutorial: {
        launcherId: guidance.launcherId,
        ...(guidance.tab ? { tab: guidance.tab } : {}),
        destination: destinationKey ? t(destinationKey) : guidance.shortcutAction,
        shortcut: this.deps.shortcut(guidance.shortcutAction),
        steps: guidance.steps,
        requirements: guidance.requirements.map((requirement) =>
          this.tutorialRequirement(requirement),
        ),
      },
    };
  }

  private tutorialRequirement(requirement: Mir4TutorialRequirement): string {
    if (requirement.kind === 'enhancement')
      return `${this.humanize(requirement.id)} +${this.number(requirement.quantity)}`;
    const key = TUTORIAL_REQUIREMENT_KEYS[requirement.id];
    const name = key ? t(key) : this.humanize(requirement.id);
    return `${name} x${this.number(requirement.quantity)}`;
  }

  private humanize(value: string): string {
    return value
      .replace(/[-_]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^./, (first) => first.toUpperCase());
  }

  private highlightTutorialLauncher(launcherId: string | null): void {
    const next = launcherId ? this.deps.document.getElementById(launcherId) : null;
    if (next === this.tutorialLauncher) return;
    this.tutorialLauncher?.classList.remove('mir4-tutorial-target');
    next?.classList.add('mir4-tutorial-target');
    this.tutorialLauncher = next;
  }

  private number(value: number): string {
    return formatNumber(value, { maximumFractionDigits: 0 });
  }

  private progressText(label: string, current: number, total: number): string {
    return t('questUi.detail.objectiveProgress', {
      label,
      current: this.number(current),
      total: this.number(total),
    });
  }
}
