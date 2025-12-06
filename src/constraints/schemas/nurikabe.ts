/**
 * Nurikabe Constraint Schema
 *
 * Extracted from pzprjs/src/variety/nurikabe.js
 */

import type { ConstraintSchema } from '../types';

export const nurikabeSchema: ConstraintSchema = {
  pid: 'nurikabe',
  name: 'Nurikabe',
  nameKey: 'puzzle.nurikabe',
  grid: 'square',
  gridStyle: 'normal', // Nurikabe uses normal grid style
  frameStyle: 'thick', // Nurikabe uses thick frame

  // Input modes from pzprjs/src/variety/nurikabe.js
  inputModes: {
    edit: ['number', 'clear', 'info-blk'],
    play: ['shade', 'unshade', 'info-blk'],
  },

  problem: [
    {
      id: 'nurikabe.island-numbers',
      scope: 'problem',
      title: 'constraint.nurikabe.islandNumbers.title',
      description: 'constraint.nurikabe.islandNumbers.description',
      targets: ['cell'],
      states: ['number', 'none'],
      toolPalette: ['number', 'clear'],
      pzpr: { pid: 'nurikabe' },
    },
  ],

  answer: [
    {
      id: 'nurikabe.shade-cells',
      scope: 'answer',
      title: 'constraint.nurikabe.shadeCells.title',
      description: 'constraint.nurikabe.shadeCells.description',
      targets: ['cell'],
      states: ['shade', 'unshade', 'none'],
      toolPalette: ['shade', 'unshade'],
      pzpr: { pid: 'nurikabe' },
    },
  ],

  validation: [
    {
      id: 'nurikabe.no-2x2-shade',
      scope: 'validation',
      title: 'constraint.nurikabe.no2x2Shade.title',
      description: 'constraint.nurikabe.no2x2Shade.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'nurikabe',
        checklist: ['check2x2ShadeCell'],
        failcodes: ['cs2x2'],
      },
    },
    {
      id: 'nurikabe.island-has-number',
      scope: 'validation',
      title: 'constraint.nurikabe.islandHasNumber.title',
      description: 'constraint.nurikabe.islandHasNumber.description',
      targets: ['region'],
      defaultOn: true,
      pzpr: {
        pid: 'nurikabe',
        checklist: ['checkNoNumberInUnshade'],
        failcodes: ['bkNoNum'],
      },
    },
    {
      id: 'nurikabe.shade-connected',
      scope: 'validation',
      title: 'constraint.nurikabe.shadeConnected.title',
      description: 'constraint.nurikabe.shadeConnected.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'nurikabe',
        checklist: ['checkConnectShade'],
        failcodes: ['csDivide'],
      },
    },
    {
      id: 'nurikabe.one-number-per-island',
      scope: 'validation',
      title: 'constraint.nurikabe.oneNumberPerIsland.title',
      description: 'constraint.nurikabe.oneNumberPerIsland.description',
      targets: ['region'],
      defaultOn: true,
      pzpr: {
        pid: 'nurikabe',
        checklist: ['checkDoubleNumberInUnshade'],
        failcodes: ['bkNumGe2'],
      },
    },
    {
      id: 'nurikabe.island-size',
      scope: 'validation',
      title: 'constraint.nurikabe.islandSize.title',
      description: 'constraint.nurikabe.islandSize.description',
      targets: ['region'],
      defaultOn: true,
      pzpr: {
        pid: 'nurikabe',
        checklist: ['checkNumberAndUnshadeSize'],
        failcodes: ['bkSizeNe'],
      },
    },
  ],

  notes: [
    'Numbers indicate island size',
    'Each island contains exactly one number',
    'All shaded cells are connected',
    'No 2x2 shaded squares',
  ],
};
