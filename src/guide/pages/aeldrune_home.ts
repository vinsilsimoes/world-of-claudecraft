import { esc } from '../../ui/esc';
import { formatNumber } from '../../ui/i18n';
import { AELDRUNE_PUBLIC_FACTS } from '../aeldrune_data';
import { hrefFor } from '../routes';
import { aeldruneKey, aeldruneText, cardGrid, contentCard } from './aeldrune_shared';
import type { GuidePage } from './types';

export const home: GuidePage = {
  titleKey: aeldruneKey('home.title'),
  render() {
    const facts = [
      [aeldruneText('home.factClasses'), AELDRUNE_PUBLIC_FACTS.classCount],
      [aeldruneText('home.factMaps'), AELDRUNE_PUBLIC_FACTS.mapCount],
      [aeldruneText('home.factQuests'), AELDRUNE_PUBLIC_FACTS.questCount],
      [aeldruneText('home.factCap'), AELDRUNE_PUBLIC_FACTS.levelCap],
    ];
    return `<section class="guide-hero" aria-labelledby="guide-hero-title"><div class="guide-hero-inner">
      <p class="guide-eyebrow">${esc(aeldruneText('home.eyebrow'))}</p>
      <h1 class="guide-hero-title" id="guide-hero-title">${esc(aeldruneText('home.title'))}</h1>
      <p class="guide-hero-sub">${esc(aeldruneText('home.lead'))}</p>
      <div class="guide-hero-cta"><a class="guide-cta" href="/play">${esc(aeldruneText('home.play'))}</a><a class="guide-cta guide-cta-ghost" href="${esc(hrefFor('how-to-play'))}">${esc(aeldruneText('home.learn'))}</a></div>
    </div></section>
    <section class="guide-section"><h2 class="guide-section-h">${esc(aeldruneText('home.facts'))}</h2>${cardGrid(
      facts.map(([label, value]) => contentCard(String(label), formatNumber(Number(value)))),
    )}</section>
    <section class="guide-section"><h2 class="guide-section-h">${esc(aeldruneText('home.journey'))}</h2><p class="guide-section-sub">${esc(aeldruneText('home.journeyBody'))}</p></section>
    <section class="guide-section"><h2 class="guide-section-h">${esc(aeldruneText('home.systems'))}</h2><p class="guide-section-sub">${esc(aeldruneText('home.systemsBody'))}</p></section>`;
  },
};
