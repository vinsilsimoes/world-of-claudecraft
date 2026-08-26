// Per-skill automatic-use dots for the MIR4 action bar. These controls are a
// preference layer over existing WoC ability slots: they never cast, move, or
// replace an action, and the setting follows the skill id when the player
// rearranges the bar.

import { audio } from '../../../game/audio';
import { MIR4_GAME_PROFILE } from '../../../sim/game_profile';
import { mir4SkillIdFromAction } from '../../../sim/mir4/action_abilities';
import type { IWorld } from '../../../world_api';
import { esc } from '../../esc';
import { t } from '../../i18n';
import type { PainterHostWriters } from '../../painter_host';
import type { ActionBarState } from './action_bar_view';

export interface Mir4AutoSkillToggleSlot {
  button: HTMLButtonElement;
}

export interface Mir4AutoSkillToggleDeps {
  writers: PainterHostWriters;
  world: Pick<IWorld, 'cfg' | 'mir4PlayerState' | 'setMir4AutoSkillEnabled'>;
  slots: readonly Mir4AutoSkillToggleSlot[];
  abilityName(abilityId: string): string;
  attachTooltip(el: HTMLElement, html: () => string): void;
  hideTooltip(): void;
}

export interface Mir4AutoSkillToggleController {
  paint(actionBar: Pick<ActionBarState, 'slots'>): void;
}

function skillIdForSlot(abilityId: string | null): number | null {
  return abilityId === null ? null : mir4SkillIdFromAction(abilityId);
}

export function buildMir4AutoSkillToggleController(
  deps: Mir4AutoSkillToggleDeps,
): Mir4AutoSkillToggleController | undefined {
  if (deps.world.cfg.gameProfile !== MIR4_GAME_PROFILE) return undefined;

  const abilityIds: (string | null)[] = deps.slots.map(() => null);
  const skillIds: (number | null)[] = deps.slots.map(() => null);
  const controls = deps.slots.map((slot, index) => {
    const seat = document.createElement('div');
    seat.className = 'mir4-auto-skill-seat';
    slot.button.parentElement?.insertBefore(seat, slot.button);
    seat.appendChild(slot.button);

    const control = document.createElement('button');
    control.type = 'button';
    control.className = 'mir4-auto-skill-toggle';
    seat.appendChild(control);

    const toggle = (): void => {
      const state = deps.world.mir4PlayerState();
      const skillId = skillIds[index];
      if (skillId === null) return;
      const enabled = !state?.mir4DisabledAutoSkills?.includes(skillId);
      deps.world.setMir4AutoSkillEnabled(skillId, !enabled);
      audio.click();
      deps.hideTooltip();
    };
    control.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggle();
    });
    control.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
      event.preventDefault();
      event.stopPropagation();
      toggle();
    });
    deps.attachTooltip(control, () => {
      const state = deps.world.mir4PlayerState();
      const skillId = skillIds[index];
      const name = abilityIds[index] === null ? '' : deps.abilityName(abilityIds[index]);
      const enabled = skillId !== null && !state?.mir4DisabledAutoSkills?.includes(skillId);
      return `<div class="tt-title">${esc(t('hudChrome.mir4.actionTools.skillAutomaticUse'))}</div><div class="tt-sub">${esc(t(enabled ? 'hudChrome.mir4.actionTools.skillAutomaticUseOnTooltip' : 'hudChrome.mir4.actionTools.skillAutomaticUseOffTooltip', { ability: name }))}</div>`;
    });
    return { slot, control };
  });

  return {
    paint(actionBar): void {
      const state = deps.world.mir4PlayerState();
      for (let index = 0; index < controls.length; index++) {
        const { control } = controls[index];
        const abilityId = actionBar.slots[index]?.abilityId ?? null;
        const skillId = skillIdForSlot(abilityId);
        abilityIds[index] = abilityId;
        skillIds[index] = skillId;
        const visible = skillId !== null;
        const enabled = visible && !state?.mir4DisabledAutoSkills?.includes(skillId);
        const name = abilityId === null ? '' : deps.abilityName(abilityId);
        deps.writers.setDisplay(control, visible ? 'block' : 'none');
        deps.writers.setAttr(control, 'data-ability-id', abilityId);
        deps.writers.toggleClass(control, 'active', enabled);
        deps.writers.setAttr(control, 'aria-pressed', enabled ? 'true' : 'false');
        deps.writers.setAttr(
          control,
          'aria-label',
          visible
            ? t(
                enabled
                  ? 'hudChrome.mir4.actionTools.skillAutomaticUseOnAria'
                  : 'hudChrome.mir4.actionTools.skillAutomaticUseOffAria',
                { ability: name },
              )
            : null,
        );
      }
    },
  };
}
