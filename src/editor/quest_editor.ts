// Spatial quest editor drawer. It edits only authored objective anchors while
// narrative and generated campaign definitions stay read-only. The map editor
// supplies terrain clicks and renders the current point overlay.

import type { Mir4ArcQuest, Mir4ArcQuestStage } from '../sim/content/mir4/arc_campaign';
import { MIR4_QUESTS_ARC } from '../sim/content/mir4/arc_campaign';
import { mir4ArcObjectiveUsesInteract, mir4ArcStageAnchor } from '../sim/mir4/arc_quest_runtime';
import { mir4ArcStageGoal } from '../sim/mir4/arc_quests';
import type { Mir4ArcMapProjection } from '../sim/types';
import { t } from '../ui/i18n';
import { button, el } from './dom';
import {
  createQuestAnchorDocument,
  parseQuestAnchorDocument,
  type QuestAnchorDocument,
  type QuestAnchorPlan,
  type QuestAnchorPoint,
  questAnchorPlan,
  removeQuestAnchorPoint,
  setQuestAnchorPoint,
  upsertQuestAnchorPlan,
  validateQuestAnchorPlan,
} from './quest_authoring_core';

const STORAGE_KEY = 'aeldrune_quest_anchor_draft_v1';

export interface QuestEditorDeps {
  projections: readonly Mir4ArcMapProjection[];
  onOverlay(points: readonly QuestAnchorPoint[], selectedIndex: number | null): void;
  onPositionMode(active: boolean): void;
  onFocus(point: Readonly<QuestAnchorPoint>): void;
  onVisibilityChange(visible: boolean): void;
  toast(message: string): void;
  error(message: string): void;
}

function initialDocument(projections: readonly Mir4ArcMapProjection[]): QuestAnchorDocument {
  const plans: QuestAnchorPlan[] = [];
  for (const projection of projections) {
    for (const plan of projection.objectiveAnchors ?? []) {
      plans.push({
        mapId: projection.mapId,
        questId: plan.questId,
        stageIndex: plan.stageIndex,
        points: plan.points.map((point) => ({ ...point })),
      });
    }
  }
  return createQuestAnchorDocument(plans);
}

function storedDocument(fallback: QuestAnchorDocument): QuestAnchorDocument {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    return parseQuestAnchorDocument(JSON.parse(raw)) ?? fallback;
  } catch {
    return fallback;
  }
}

function stageLabel(stage: Readonly<Mir4ArcQuestStage>, index: number): string {
  return `${index + 1}. ${stage.kind}${stage.text ? `: ${stage.text}` : ''}`;
}

export class QuestEditor {
  readonly root: HTMLElement;
  private document: QuestAnchorDocument;
  private visible = false;
  private mapId: string;
  private questId: string;
  private stageIndex = 0;
  private selectedPoint = 0;
  private positioning = false;

  constructor(
    parent: HTMLElement,
    private readonly deps: QuestEditorDeps,
  ) {
    this.root = el('aside', 'ed-quest-editor');
    this.root.id = 'quest-spatial-editor';
    this.root.setAttribute('aria-label', t('editor.questEditor.label'));
    this.document = storedDocument(initialDocument(deps.projections));
    const firstQuest = MIR4_QUESTS_ARC[0];
    this.mapId = firstQuest?.mapId ?? '';
    this.questId = firstQuest?.questId ?? '';
    parent.appendChild(this.root);
    this.render();
    this.setVisible(false);
  }

  toggle(): void {
    this.setVisible(!this.visible);
  }

  open(): void {
    this.setVisible(true);
  }

  setVisible(visible: boolean): void {
    const changed = this.visible !== visible;
    this.visible = visible;
    this.root.classList.toggle('visible', visible);
    this.root.setAttribute('aria-hidden', visible ? 'false' : 'true');
    if (!visible) this.cancelPositioning();
    if (changed) this.deps.onVisibilityChange(visible);
    this.syncOverlay();
  }

  isVisible(): boolean {
    return this.visible;
  }

  isPositioning(): boolean {
    return this.visible && this.positioning;
  }

  snapshotDocument(): QuestAnchorDocument {
    return createQuestAnchorDocument(this.document.plans);
  }

  cancelPositionMode(): void {
    this.cancelPositioning();
    this.render();
    this.syncOverlay();
  }

  placeSelectedPoint(point: Readonly<QuestAnchorPoint>): boolean {
    if (!this.isPositioning()) return false;
    const plan = this.ensureCurrentPlan();
    this.document = setQuestAnchorPoint(
      this.document,
      plan.questId,
      plan.stageIndex,
      this.selectedPoint,
      point,
    );
    this.positioning = false;
    this.changed();
    return true;
  }

  private currentQuest(): Mir4ArcQuest | null {
    return MIR4_QUESTS_ARC.find((quest) => quest.questId === this.questId) ?? null;
  }

  private currentStage(): Mir4ArcQuestStage | null {
    return this.currentQuest()?.stages[this.stageIndex] ?? null;
  }

  private currentDefaultPlan(): QuestAnchorPlan | null {
    const quest = this.currentQuest();
    const stage = this.currentStage();
    if (!quest || !stage) return null;
    const count = Math.max(1, mir4ArcStageGoal(stage));
    const points = Array.from({ length: count }, (_, index) =>
      mir4ArcStageAnchor(quest.questId, stage, index, this.deps.projections),
    ).filter((point): point is QuestAnchorPoint => point !== null);
    if (points.length === 0) return null;
    return {
      mapId: quest.mapId,
      questId: quest.questId,
      stageIndex: this.stageIndex,
      points,
    };
  }

  private currentPlan(): QuestAnchorPlan | null {
    return (
      questAnchorPlan(this.document, this.questId, this.stageIndex) ?? this.currentDefaultPlan()
    );
  }

  private ensureCurrentPlan(): QuestAnchorPlan {
    const plan = this.currentPlan();
    if (!plan) throw new Error('Selected quest stage has no world anchor');
    if (!questAnchorPlan(this.document, this.questId, this.stageIndex)) {
      this.document = upsertQuestAnchorPlan(this.document, plan);
    }
    return plan;
  }

  private syncOverlay(): void {
    const plan = this.visible ? this.currentPlan() : null;
    this.deps.onOverlay(plan?.points ?? [], plan ? this.selectedPoint : null);
  }

  private changed(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.document));
    } catch {
      // Export remains available when storage is blocked.
    }
    this.render();
    this.syncOverlay();
  }

  private cancelPositioning(): void {
    if (!this.positioning) return;
    this.positioning = false;
    this.deps.onPositionMode(false);
  }

  private beginPositioning(index: number): void {
    const plan = this.ensureCurrentPlan();
    if (!plan.points[index]) return;
    this.selectedPoint = index;
    this.positioning = true;
    this.deps.onPositionMode(true);
    this.render();
    this.syncOverlay();
  }

  private addPoint(): void {
    const plan = this.ensureCurrentPlan();
    const last = plan.points.at(-1) ?? { x: 0, z: 0 };
    const next = { x: last.x + 5, z: last.z };
    this.document = setQuestAnchorPoint(
      this.document,
      plan.questId,
      plan.stageIndex,
      plan.points.length,
      next,
    );
    this.selectedPoint = plan.points.length;
    this.changed();
  }

  private removePoint(index: number): void {
    const plan = this.ensureCurrentPlan();
    this.document = removeQuestAnchorPoint(this.document, plan.questId, plan.stageIndex, index);
    this.selectedPoint = Math.max(0, Math.min(this.selectedPoint, plan.points.length - 2));
    this.cancelPositioning();
    this.changed();
  }

  private updateCoordinate(index: number, axis: 'x' | 'z', value: string): void {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    const plan = this.ensureCurrentPlan();
    const previous = plan.points[index];
    if (!previous) return;
    this.document = setQuestAnchorPoint(this.document, plan.questId, plan.stageIndex, index, {
      ...previous,
      [axis]: numeric,
    });
    this.changed();
  }

  private exportDocument(): void {
    const blob = new Blob([JSON.stringify(this.document, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'aeldrune-quest-anchors.json';
    anchor.click();
    URL.revokeObjectURL(url);
    this.deps.toast(t('editor.questEditor.exported'));
  }

  private importDocument(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      void file
        .text()
        .then((text) => {
          const parsed = parseQuestAnchorDocument(JSON.parse(text));
          if (!parsed) throw new Error('invalid');
          this.document = parsed;
          this.selectedPoint = 0;
          this.cancelPositioning();
          this.changed();
          this.deps.toast(t('editor.questEditor.imported'));
        })
        .catch(() => this.deps.error(t('editor.questEditor.importFailed')));
    });
    input.click();
  }

  private select(): HTMLSelectElement {
    const select = document.createElement('select');
    select.className = 'ed-field';
    select.addEventListener('keydown', (event) => event.stopPropagation());
    return select;
  }

  private render(focusTarget?: string): void {
    this.root.innerHTML = '';
    const header = el('div', 'ed-quest-head');
    header.append(
      el('h2', undefined, t('editor.questEditor.title')),
      button(t('editor.questEditor.close'), () => this.setVisible(false)),
    );
    this.root.appendChild(header);

    const intro = el('p', 'ed-quest-intro', t('editor.questEditor.intro'));
    this.root.appendChild(intro);

    const mapLabel = el('label', 'ed-field-label', t('editor.questEditor.map'));
    const mapSelect = this.select();
    mapSelect.dataset.questFocus = 'map';
    const mapIds = [...new Set(MIR4_QUESTS_ARC.map((quest) => quest.mapId))];
    for (const mapId of mapIds) {
      const option = document.createElement('option');
      option.value = mapId;
      option.textContent = mapId;
      option.selected = mapId === this.mapId;
      mapSelect.appendChild(option);
    }
    mapSelect.addEventListener('change', () => {
      this.mapId = mapSelect.value;
      const quest = MIR4_QUESTS_ARC.find((candidate) => candidate.mapId === this.mapId);
      this.questId = quest?.questId ?? '';
      this.stageIndex = 0;
      this.selectedPoint = 0;
      this.cancelPositioning();
      this.render('map');
      this.syncOverlay();
    });
    mapLabel.appendChild(mapSelect);
    this.root.appendChild(mapLabel);

    const questLabel = el('label', 'ed-field-label', t('editor.questEditor.quest'));
    const questSelect = this.select();
    questSelect.dataset.questFocus = 'quest';
    for (const quest of MIR4_QUESTS_ARC.filter((candidate) => candidate.mapId === this.mapId)) {
      const option = document.createElement('option');
      option.value = quest.questId;
      option.textContent = `${quest.questId}: ${quest.title}`;
      option.selected = quest.questId === this.questId;
      questSelect.appendChild(option);
    }
    questSelect.addEventListener('change', () => {
      this.questId = questSelect.value;
      this.stageIndex = 0;
      this.selectedPoint = 0;
      this.cancelPositioning();
      this.render('quest');
      this.syncOverlay();
    });
    questLabel.appendChild(questSelect);
    this.root.appendChild(questLabel);

    const quest = this.currentQuest();
    if (!quest) return;
    const purpose = el('p', 'ed-quest-purpose', quest.purpose ?? quest.title);
    this.root.appendChild(purpose);

    const stageLabelElement = el('label', 'ed-field-label', t('editor.questEditor.stage'));
    const stageSelect = this.select();
    stageSelect.dataset.questFocus = 'stage';
    quest.stages.forEach((stage, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = stageLabel(stage, index);
      option.selected = index === this.stageIndex;
      stageSelect.appendChild(option);
    });
    stageSelect.addEventListener('change', () => {
      this.stageIndex = Number(stageSelect.value);
      this.selectedPoint = 0;
      this.cancelPositioning();
      this.render('stage');
      this.syncOverlay();
    });
    stageLabelElement.appendChild(stageSelect);
    this.root.appendChild(stageLabelElement);

    const stage = this.currentStage();
    const plan = this.currentPlan();
    if (!stage || !plan) {
      this.root.appendChild(el('p', 'ed-quest-warning', t('editor.questEditor.noAnchor')));
      return;
    }
    const goal = Math.max(1, mir4ArcStageGoal(stage));
    const kind = mir4ArcObjectiveUsesInteract(stage)
      ? t('editor.questEditor.interactionStage')
      : t('editor.questEditor.navigationStage');
    this.root.appendChild(el('p', 'ed-quest-kind', kind));

    const pointList = el('div', 'ed-quest-points');
    plan.points.forEach((point, index) => {
      const row = el('div', `ed-quest-point${index === this.selectedPoint ? ' selected' : ''}`);
      const name = button(t('editor.questEditor.point', { index: index + 1 }), () => {
        this.selectedPoint = index;
        this.deps.onFocus(point);
        this.render(`point-${index}`);
        this.syncOverlay();
      });
      name.dataset.questFocus = `point-${index}`;
      const x = document.createElement('input');
      x.type = 'number';
      x.step = '0.1';
      x.value = String(point.x);
      x.dataset.questFocus = `x-${index}`;
      x.setAttribute('aria-label', t('editor.questEditor.pointX', { index: index + 1 }));
      x.addEventListener('change', () => {
        this.updateCoordinate(index, 'x', x.value);
        this.restoreFocus(`x-${index}`);
      });
      x.addEventListener('keydown', (event) => event.stopPropagation());
      const z = document.createElement('input');
      z.type = 'number';
      z.step = '0.1';
      z.value = String(point.z);
      z.dataset.questFocus = `z-${index}`;
      z.setAttribute('aria-label', t('editor.questEditor.pointZ', { index: index + 1 }));
      z.addEventListener('change', () => {
        this.updateCoordinate(index, 'z', z.value);
        this.restoreFocus(`z-${index}`);
      });
      z.addEventListener('keydown', (event) => event.stopPropagation());
      const place = button(
        this.positioning && index === this.selectedPoint
          ? t('editor.questEditor.clickMap')
          : t('editor.questEditor.position'),
        () => this.beginPositioning(index),
        this.positioning && index === this.selectedPoint ? 'active' : undefined,
      );
      const remove = button(t('editor.questEditor.remove'), () => this.removePoint(index));
      row.append(name, x, z, place, remove);
      pointList.appendChild(row);
    });
    this.root.appendChild(pointList);

    const actions = el('div', 'ed-quest-actions');
    actions.append(
      button(t('editor.questEditor.addPoint'), () => this.addPoint()),
      button(t('editor.questEditor.import'), () => this.importDocument()),
      button(t('editor.questEditor.export'), () => this.exportDocument(), 'primary'),
    );
    this.root.appendChild(actions);

    const issues = validateQuestAnchorPlan(plan, goal);
    const validation = el(
      'div',
      issues.length > 0 ? 'ed-quest-validation bad' : 'ed-quest-validation',
    );
    validation.setAttribute('role', 'status');
    validation.setAttribute('aria-live', 'polite');
    validation.appendChild(
      el(
        'strong',
        undefined,
        issues.length > 0
          ? t('editor.questEditor.issueCount', { count: issues.length })
          : t('editor.questEditor.valid'),
      ),
    );
    for (const issue of issues) {
      validation.appendChild(
        el(
          'p',
          undefined,
          issue.code === 'point_count'
            ? t('editor.questEditor.issuePointCount', {
                expected: issue.expected ?? 0,
                actual: issue.actual ?? 0,
              })
            : issue.code === 'invalid_coordinate'
              ? t('editor.questEditor.issueInvalidCoordinate', {
                  index: (issue.pointIndex ?? 0) + 1,
                })
              : t('editor.questEditor.issueOverlap', {
                  first: (issue.otherPointIndex ?? 0) + 1,
                  second: (issue.pointIndex ?? 0) + 1,
                }),
        ),
      );
    }
    this.root.appendChild(validation);
    this.restoreFocus(focusTarget);
  }

  private restoreFocus(target?: string): void {
    if (!target) return;
    const control = Array.from(this.root.querySelectorAll<HTMLElement>('[data-quest-focus]')).find(
      (candidate) => candidate.dataset.questFocus === target,
    );
    control?.focus();
  }
}
