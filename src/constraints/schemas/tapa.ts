/**
 * Tapa Constraint Schema
 *
 * Extracted from pzprjs/src/variety/tapa.js
 */

import type { ConstraintSchema } from '../types';

export const tapaSchema: ConstraintSchema = {
  pid: 'tapa',
  name: 'Tapa',
  nameKey: 'puzzle.tapa',
  grid: 'square',
  gridStyle: 'normal',
  frameStyle: 'thick',

  // Auto mode types
  autoModeEdit: 'number',
  autoModePlay: 'cell',

  // Input modes
  inputModes: {
    edit: ['auto', 'number', 'clear', 'info-blk'],
    play: ['auto', 'shade', 'unshade', 'info-blk'],
  },

  problem: [
    {
      id: 'tapa.clue-numbers',
      scope: 'problem',
      title: 'constraint.tapa.clueNumbers.title',
      description: 'constraint.tapa.clueNumbers.description',
      targets: ['cell'],
      states: ['number', 'none'],
      toolPalette: ['number', 'clear'],
      pzpr: { pid: 'tapa' },
    },
  ],

  answer: [
    {
      id: 'tapa.shade-cells',
      scope: 'answer',
      title: 'constraint.tapa.shadeCells.title',
      description: 'constraint.tapa.shadeCells.description',
      targets: ['cell'],
      states: ['shade', 'unshade', 'none'],
      toolPalette: ['shade', 'unshade'],
      pzpr: { pid: 'tapa' },
    },
  ],

  validation: [
    {
      id: 'tapa.no-2x2-shade',
      scope: 'validation',
      title: 'constraint.tapa.no2x2Shade.title',
      description: 'constraint.tapa.no2x2Shade.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'tapa',
        checklist: ['check2x2ShadeCell'],
        failcodes: ['cs2x2'],
      },
    },
    {
      id: 'tapa.shade-connected',
      scope: 'validation',
      title: 'constraint.tapa.shadeConnected.title',
      description: 'constraint.tapa.shadeConnected.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'tapa',
        checklist: ['checkConnectShade'],
        failcodes: ['csDivide'],
      },
    },
    {
      id: 'tapa.clue-pattern',
      scope: 'validation',
      title: 'constraint.tapa.cluePattern.title',
      description: 'constraint.tapa.cluePattern.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'tapa',
        checklist: ['checkNumberAndShade'],
        failcodes: ['nmShadeNe'],
      },
    },
  ],

  notes: [
    'Shade cells to create a connected wall',
    'Numbers indicate lengths of consecutive shaded groups around the clue',
    'No 2x2 shaded squares',
    'All shaded cells must be connected',
  ],
};
