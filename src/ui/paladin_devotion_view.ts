import type { Entity } from '../sim/types';

export interface PaladinDevotionState {
  visible: boolean;
  maxValue: number;
  value: number;
  fillFrac: number;
  ready: boolean;
  ascended: boolean;
  charges: number;
  lastCharge: boolean;
  label: string;
  ariaValueText: string;
  announcement: string;
  ariaLabel: string;
}

export interface PaladinDevotionView {
  tick(
    player: Pick<Entity, 'templateId' | 'paladinDevotion' | 'mir4UltGauge'>,
    mir4Profile?: boolean,
  ): PaladinDevotionState;
}

export interface UltimateGaugePresentation {
  label: string;
  formatStatus(value: string, max: string): string;
  readyAnnouncement: string;
}

export function createPaladinDevotionView(
  formatCount: (value: number) => string,
  formatStatus: (value: string, max: string, charges: string, lastCharge: boolean) => string,
  finalChargeAnnouncement: string,
  ultimate?: UltimateGaugePresentation,
): PaladinDevotionView {
  const state: PaladinDevotionState = {
    visible: false,
    maxValue: 20,
    value: 0,
    fillFrac: 0,
    ready: false,
    ascended: false,
    charges: 0,
    lastCharge: false,
    label: '',
    ariaValueText: '',
    announcement: '',
    ariaLabel: '',
  };

  return {
    tick(player, mir4Profile = false): PaladinDevotionState {
      const devotion = player.paladinDevotion;
      state.visible = mir4Profile || (player.templateId === 'paladin' && devotion !== undefined);
      state.maxValue = mir4Profile ? 100 : 20;
      state.value = mir4Profile ? (player.mir4UltGauge ?? 0) : (devotion?.value ?? 0);
      state.fillFrac = Math.max(0, Math.min(1, state.value / state.maxValue));
      state.ascended =
        (devotion?.ascensionCharges ?? 0) > 0 && (devotion?.ascensionRemaining ?? 0) > 0;
      state.ready = state.value >= state.maxValue && !state.ascended;
      state.charges = state.ascended
        ? Math.max(0, Math.min(5, devotion?.ascensionCharges ?? 0))
        : 0;
      state.lastCharge = state.ascended && state.charges === 1;
      const valueLabel = formatCount(state.value);
      const maxLabel = formatCount(state.maxValue);
      const chargesLabel = formatCount(state.charges);
      state.label = `${valueLabel} / ${maxLabel}`;
      state.ariaValueText = mir4Profile
        ? (ultimate?.formatStatus(valueLabel, maxLabel) ?? state.label)
        : formatStatus(valueLabel, maxLabel, chargesLabel, state.lastCharge);
      state.announcement = mir4Profile
        ? state.ready
          ? (ultimate?.readyAnnouncement ?? '')
          : ''
        : state.lastCharge
          ? finalChargeAnnouncement
          : '';
      state.ariaLabel = mir4Profile ? (ultimate?.label ?? 'Ultimate') : 'Devotion';
      return state;
    },
  };
}
