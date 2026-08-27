import { esc } from '../../ui/esc';
import { aeldruneKey, aeldruneText, guideArticle, pageHeader } from './aeldrune_shared';
import type { GuidePage } from './types';

export const faq: GuidePage = {
  titleKey: aeldruneKey('faq.title'),
  render() {
    const items = Array.from({ length: 6 }, (_, index) => {
      const number = index + 1;
      return `<details class="guide-faq-item"><summary>${esc(aeldruneText(`faq.q${number}`))}</summary><p>${esc(aeldruneText(`faq.a${number}`))}</p></details>`;
    });
    return guideArticle(pageHeader('faq') + `<div class="guide-faq">${items.join('')}</div>`);
  },
};
