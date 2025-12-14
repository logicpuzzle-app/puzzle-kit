import { describe, expect, it } from 'vitest';

import { gridConfigToTopology } from '../converter';

describe('penrose_P3 topology', () => {
  const baseConfig = {
    rows: 16,
    cols: 5,
    cellSize: 38,
    outerPadding: 20,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    showGrid: true,
    gridStyle: 'normal' as const,
    frameStyle: 'normal' as const,
    frameColor: '#000000',
    gridColor: '#000000',
    backgroundColor: '#ffffff',
  };

  it('uses penroseSide instead of grid rows/cols for generation', () => {
    const topo = gridConfigToTopology({
      ...baseConfig,
      gridType: 'penrose_P3',
      penroseSide: 5,
      penroseOrder: 5,
      penroseRotational: 0,
      penroseVariation: 0.001,
    });

    expect(topo.cells.size).toBe(80);
  });
});

