/**
 * LITS Constraint Schema
 *
 * Extracted from pzprjs/src/variety/lits.js
 */

import type { ConstraintSchema } from '../types';

export const litsSchema: ConstraintSchema = {
  pid: 'lits',
  name: 'LITS',
  nameKey: 'puzzle.lits',
  grid: 'square',
  gridStyle: 'normal',
  frameStyle: 'thick',

  // Auto mode types
  autoModeEdit: 'border-number',
  autoModePlay: 'cell',

  // Input modes
  inputModes: {
    edit: ['auto', 'border', 'number', 'clear', 'info-room'],
    play: ['auto', 'shade', 'unshade', 'info-blk'],
  },

  problem: [
    {
      id: 'lits.rooms',
      scope: 'problem',
      title: 'constraint.lits.rooms.title',
      description: 'constraint.lits.rooms.description',
      targets: ['border'],
      states: ['border', 'none'],
      toolPalette: ['border', 'clear'],
      pzpr: { pid: 'lits' },
    },
  ],

  answer: [
    {
      id: 'lits.shade-cells',
      scope: 'answer',
      title: 'constraint.lits.shadeCells.title',
      description: 'constraint.lits.shadeCells.description',
      targets: ['cell'],
      states: ['shade', 'unshade', 'none'],
      toolPalette: ['shade', 'unshade'],
      pzpr: { pid: 'lits' },
    },
  ],

  validation: [
    {
      id: 'lits.no-2x2-shade',
      scope: 'validation',
      title: 'constraint.lits.no2x2Shade.title',
      description: 'constraint.lits.no2x2Shade.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'lits',
        checklist: ['check2x2ShadeCell'],
        failcodes: ['cs2x2'],
      },
    },
    {
      id: 'lits.shade-connected',
      scope: 'validation',
      title: 'constraint.lits.shadeConnected.title',
      description: 'constraint.lits.shadeConnected.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'lits',
        checklist: ['checkConnectShade'],
        failcodes: ['csDivide'],
      },
    },
    {
      id: 'lits.tetromino-shape',
      scope: 'validation',
      title: 'constraint.lits.tetrominoShape.title',
      description: 'constraint.lits.tetrominoShape.description',
      targets: ['region'],
      defaultOn: true,
      pzpr: {
        pid: 'lits',
        checklist: ['checkTetrominoInRoom'],
        failcodes: ['bkNotLits'],
      },
    },
    {
      id: 'lits.no-same-adjacent',
      scope: 'validation',
      title: 'constraint.lits.noSameAdjacent.title',
      description: 'constraint.lits.noSameAdjacent.description',
      targets: ['region'],
      defaultOn: true,
      pzpr: {
        pid: 'lits',
        checklist: ['checkAdjacentSameTetromino'],
        failcodes: ['bkSameTetro'],
      },
    },
  ],

  notes: [
    'Shade exactly 4 cells (a tetromino) in each room',
    'All shaded cells must be connected',
    'No 2x2 shaded squares',
    'Same-shaped tetrominoes cannot share an edge',
  ],
};
