import { describe, expect, it } from 'vitest';
import { emptyMir4AlbumBonuses } from '../src/sim/mir4/collection_album';
import { buildMir4AlbumStatViews } from '../src/ui/mir4_album_view';

describe('MIR4 album stat view', () => {
  it('renders flat and basis-point bonuses with player-facing units', () => {
    const current = emptyMir4AlbumBonuses();
    const maximum = emptyMir4AlbumBonuses();
    current.maxHp = 25;
    maximum.maxHp = 100;
    current.penetrationBps = 125;
    maximum.penetrationBps = 250;
    current.bossDamageBps = 150;
    maximum.bossDamageBps = 300;
    current.skillDamageBps = 175;
    maximum.skillDamageBps = 350;

    expect(buildMir4AlbumStatViews(current, maximum)).toMatchObject([
      { key: 'maxHp', current: '25', maximum: '100' },
      { key: 'penetrationBps', current: '1.25%', maximum: '2.5%' },
      { key: 'bossDamageBps', current: '1.5%', maximum: '3%' },
      { key: 'skillDamageBps', current: '1.75%', maximum: '3.5%' },
    ]);
  });
});
