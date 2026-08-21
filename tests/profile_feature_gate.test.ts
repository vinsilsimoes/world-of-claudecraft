import { describe, expect, it, vi } from 'vitest';
import {
  applyProfileFeatureGate,
  MIR4_CLASSIC_ONLY_SELECTORS,
} from '../src/ui/profile_feature_gate';

function documentHarness() {
  const mobileLabel = {
    textContent: '',
    setAttribute: vi.fn(),
  };
  const sharedNodes = new Map(
    ['#mm-deeds', '#mobile-deeds', '#deeds-window'].map((selector) => [
      selector,
      {
        hidden: false,
        setAttribute: vi.fn(),
        querySelector: vi.fn((query: string) =>
          selector === '#mobile-deeds' && query === '.mobile-label' ? mobileLabel : null,
        ),
      },
    ]),
  );
  const nodes = new Map(
    MIR4_CLASSIC_ONLY_SELECTORS.map((selector) => [
      selector,
      {
        hidden: false,
        setAttribute: vi.fn(),
      },
    ]),
  );
  const document = {
    querySelectorAll: (selector: string) => {
      const node = nodes.get(selector as (typeof MIR4_CLASSIC_ONLY_SELECTORS)[number]);
      const shared = sharedNodes.get(selector);
      return node ? [node] : shared ? [shared] : [];
    },
  } as unknown as Document;
  return { document, mobileLabel, nodes, sharedNodes };
}

describe('profile feature visibility matrix', () => {
  it('keeps the adapted Character, Bags, Crafting, Map and Quest Log available to MIR4', () => {
    expect(MIR4_CLASSIC_ONLY_SELECTORS).not.toContain('#char-window');
    expect(MIR4_CLASSIC_ONLY_SELECTORS).not.toContain('#bags');
    expect(MIR4_CLASSIC_ONLY_SELECTORS).not.toContain('#mm-char');
    expect(MIR4_CLASSIC_ONLY_SELECTORS).not.toContain('#mm-bag');
    expect(MIR4_CLASSIC_ONLY_SELECTORS).not.toContain('#crafting-window');
    expect(MIR4_CLASSIC_ONLY_SELECTORS).not.toContain('#mm-crafting');
    expect(MIR4_CLASSIC_ONLY_SELECTORS).not.toContain('#map-window');
    expect(MIR4_CLASSIC_ONLY_SELECTORS).not.toContain('#mm-map');
    expect(MIR4_CLASSIC_ONLY_SELECTORS).not.toContain('#quest-log-window');
    expect(MIR4_CLASSIC_ONLY_SELECTORS).not.toContain('#mm-quest');
    expect(MIR4_CLASSIC_ONLY_SELECTORS).not.toContain('#mobile-quest');
    expect(MIR4_CLASSIC_ONLY_SELECTORS).not.toContain('#deeds-window');
    expect(MIR4_CLASSIC_ONLY_SELECTORS).not.toContain('#mm-deeds');
    expect(MIR4_CLASSIC_ONLY_SELECTORS).not.toContain('#mobile-deeds');
  });

  it('hides classic-only launchers and windows in the MIR4 profile', () => {
    const test = documentHarness();
    applyProfileFeatureGate(test.document, 'mir4-gameplay-port');

    expect(test.nodes.size).toBeGreaterThan(30);
    for (const node of test.nodes.values()) {
      expect(node.hidden).toBe(true);
      expect(node.setAttribute).toHaveBeenLastCalledWith('aria-hidden', 'true');
    }
    for (const [selector, node] of test.sharedNodes) {
      expect(node.hidden).toBe(false);
      if (selector !== '#deeds-window') {
        expect(node.setAttribute).toHaveBeenCalledWith(
          'data-i18n-title',
          'hudChrome.mir4.achievements.title',
        );
      }
    }
    expect(test.mobileLabel.setAttribute).toHaveBeenCalledWith(
      'data-i18n',
      'hudChrome.mir4.achievements.title',
    );
  });

  it('leaves the same shared DOM available to the classic profile', () => {
    const test = documentHarness();
    for (const node of test.nodes.values()) node.hidden = true;
    applyProfileFeatureGate(test.document, 'woc-classic');

    for (const node of test.nodes.values()) {
      expect(node.hidden).toBe(false);
      expect(node.setAttribute).toHaveBeenLastCalledWith('aria-hidden', 'false');
    }
    expect(test.sharedNodes.get('#mm-deeds')?.setAttribute).toHaveBeenCalledWith(
      'data-i18n-title',
      'hudChrome.deeds.title',
    );
    expect(test.mobileLabel.setAttribute).toHaveBeenCalledWith(
      'data-i18n',
      'hudChrome.mobile.deeds',
    );
  });
});
