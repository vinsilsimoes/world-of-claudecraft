// WorldContent carries one biome paint grid. Production-authored campaign maps
// keep independent local grids and are composed only when those maps are
// admitted, preserving every earlier map while 255 remains transparent.

import type { BiomePaint } from '../../types';

function paintedIdAt(layer: Readonly<BiomePaint>, x: number, z: number): number {
  const col = Math.floor((x - layer.originX) / layer.cell);
  const row = Math.floor((z - layer.originZ) / layer.cell);
  if (col < 0 || row < 0 || col >= layer.cols || row >= layer.rows) return 255;
  return layer.ids[row * layer.cols + col] ?? 255;
}

export function composeMir4AuthoredBiomePaint(
  layers: readonly Readonly<BiomePaint>[],
): BiomePaint | undefined {
  if (layers.length === 0) return undefined;
  const cell = Math.min(...layers.map((layer) => layer.cell));
  const originX = Math.min(...layers.map((layer) => layer.originX));
  const originZ = Math.min(...layers.map((layer) => layer.originZ));
  const xMax = Math.max(...layers.map((layer) => layer.originX + layer.cols * layer.cell));
  const zMax = Math.max(...layers.map((layer) => layer.originZ + layer.rows * layer.cell));
  const cols = Math.ceil((xMax - originX) / cell);
  const rows = Math.ceil((zMax - originZ) / cell);
  const ids = Array.from({ length: cols * rows }, (_, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = originX + (col + 0.5) * cell;
    const z = originZ + (row + 0.5) * cell;
    let result = 255;
    for (const layer of layers) {
      const id = paintedIdAt(layer, x, z);
      if (id !== 255) result = id;
    }
    return result;
  });
  return {
    cell,
    cols,
    rows,
    originX,
    originZ,
    ids,
    affectsTerrain: layers.some((layer) => layer.affectsTerrain !== false),
  };
}
